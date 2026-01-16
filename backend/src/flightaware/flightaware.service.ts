import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs';
import {
  FlightDetailsResponse,
  LiveFlightsQuery,
  LiveFlightsResponse,
  NormalizedAirport,
  NormalizedFlightDetails,
  NormalizedFlightSummary,
  NormalizedOperator,
  NormalizedPosition,
} from './types';

const LIVE_CACHE_TTL_SECONDS = 15;
const DETAILS_CACHE_TTL_SECONDS = 120;

type AeroApiResponse = Record<string, any>;

@Injectable()
export class FlightawareService {
  private readonly logger = new Logger(FlightawareService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async getLiveFlights(query: LiveFlightsQuery): Promise<LiveFlightsResponse> {
    const cacheKey = this.buildLiveCacheKey(query);
    const cached = await this.cacheManager.get<LiveFlightsResponse>(cacheKey);

    if (cached) {
      return { ...cached, source: 'cache', stale: false };
    }

    try {
      const response = await this.fetchLiveFlightsFromAeroApi(query);
      await this.cacheManager.set(cacheKey, response, LIVE_CACHE_TTL_SECONDS);
      return response;
    } catch (error) {
      this.logger.warn(`Live flights fetch failed: ${this.errorMessage(error)}`);
      if (cached) {
        return { ...cached, source: 'cache', stale: true };
      }
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Live flight data unavailable', HttpStatus.BAD_GATEWAY);
    }
  }

  async getFlightDetails(flightId: string): Promise<FlightDetailsResponse> {
    const cacheKey = `flights:details:${flightId}`;
    const cached = await this.cacheManager.get<FlightDetailsResponse>(cacheKey);

    if (cached) {
      return { ...cached, source: 'cache', stale: false };
    }

    try {
      const response = await this.fetchFlightDetailsFromAeroApi(flightId);
      await this.cacheManager.set(cacheKey, response, DETAILS_CACHE_TTL_SECONDS);
      return response;
    } catch (error) {
      this.logger.warn(`Flight details fetch failed: ${this.errorMessage(error)}`);
      if (cached) {
        return { ...cached, source: 'cache', stale: true };
      }
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Flight details unavailable', HttpStatus.BAD_GATEWAY);
    }
  }

  private async fetchLiveFlightsFromAeroApi(
    query: LiveFlightsQuery,
  ): Promise<LiveFlightsResponse> {
    const { bbox, region, max } = query;
    const bounds = this.resolveBounds(region, bbox);
    const queryString = this.buildAeroApiQuery(query, bounds);
    const maxPages = Math.max(1, Math.min(3, Math.ceil((max ?? 200) / 15)));

    const response = await this.aeroApiGet<AeroApiResponse>('/flights/search/positions', {
      query: queryString,
      max_pages: maxPages,
    });

    const entries = this.extractPositions(response);
    const flights = entries
      .map((entry) => this.normalizeLiveFlight(entry))
      .filter((flight) => this.applyPostFilters(flight, query))
      .slice(0, max ?? 200);

    return {
      region: region ?? 'global',
      updatedAt: new Date().toISOString(),
      flights,
      stale: false,
      source: 'aeroapi',
    };
  }

  private async fetchFlightDetailsFromAeroApi(
    flightId: string,
  ): Promise<FlightDetailsResponse> {
    const response = await this.aeroApiGet<AeroApiResponse>(`/flights/${encodeURIComponent(flightId)}`, {});
    const flightEntry = this.extractDetails(response);
    const normalized = flightEntry ? this.normalizeFlightDetails(flightEntry) : null;

    const enriched = normalized
      ? await this.enrichDetailsWithFallback(normalized)
      : normalized;

    return {
      flight: enriched,
      updatedAt: new Date().toISOString(),
      stale: false,
      source: 'aeroapi',
    };
  }

  private async enrichDetailsWithFallback(
    details: NormalizedFlightDetails,
  ): Promise<NormalizedFlightDetails> {
    const hasAirlineName = Boolean(details.operator?.name);
    const hasAirportNames = Boolean(details.origin?.name && details.destination?.name);
    const hasSchedule = Boolean(details.scheduled?.off || details.scheduled?.on);

    if (hasAirlineName && hasAirportNames && hasSchedule) {
      return details;
    }

    const aviationStackKey = this.configService.get<string>('AVIATIONSTACK_KEY');
    if (!aviationStackKey) {
      return details;
    }

    const flightNumber = details.flightNumber || details.callsign;
    if (!flightNumber) {
      return details;
    }

    try {
      const response = await this.httpServiceGet<AeroApiResponse>(
        this.aviationStackBaseUrl(),
        '/flights',
        {
          access_key: aviationStackKey,
          flight_iata: flightNumber,
          limit: 1,
        },
      );
      const entry = response?.data?.[0];
      if (!entry) {
        return details;
      }

      return {
        ...details,
        status: details.status ?? entry.flight_status ?? entry.status,
        operator: {
          ...details.operator,
          name: details.operator?.name ?? entry.airline?.name,
          iata: details.operator?.iata ?? entry.airline?.iata,
          icao: details.operator?.icao ?? entry.airline?.icao,
        },
        origin: {
          ...details.origin,
          name: details.origin?.name ?? entry.departure?.airport,
          iata: details.origin?.iata ?? entry.departure?.iata,
          icao: details.origin?.icao ?? entry.departure?.icao,
          timezone: details.origin?.timezone ?? entry.departure?.timezone,
        },
        destination: {
          ...details.destination,
          name: details.destination?.name ?? entry.arrival?.airport,
          iata: details.destination?.iata ?? entry.arrival?.iata,
          icao: details.destination?.icao ?? entry.arrival?.icao,
          timezone: details.destination?.timezone ?? entry.arrival?.timezone,
        },
        scheduled: {
          off: details.scheduled?.off ?? entry.departure?.scheduled,
          on: details.scheduled?.on ?? entry.arrival?.scheduled,
        },
        estimated: {
          off: details.estimated?.off ?? entry.departure?.estimated,
          on: details.estimated?.on ?? entry.arrival?.estimated,
        },
        actual: {
          off: details.actual?.off ?? entry.departure?.actual,
          on: details.actual?.on ?? entry.arrival?.actual,
        },
      };
    } catch (error) {
      this.logger.warn(`AviationStack fallback failed: ${this.errorMessage(error)}`);
      return details;
    }
  }

  private async aeroApiGet<T>(path: string, params: Record<string, any>) {
    const apiKey = this.configService.get<string>('AEROAPI_KEY');
    if (!apiKey) {
      throw new Error('AEROAPI_KEY is not configured');
    }
    return this.httpServiceGet<T>(this.aeroApiBaseUrl(), path, params, {
      'x-apikey': apiKey,
    });
  }

  private async httpServiceGet<T>(
    baseUrl: string,
    path: string,
    params: Record<string, any>,
    headers: Record<string, string> = {},
  ): Promise<T> {
    const url = `${baseUrl}${path}`;
    const response = await firstValueFrom(
      this.httpService.get<T>(url, {
        params,
        headers,
      }),
    );
    return response.data;
  }

  private aeroApiBaseUrl(): string {
    return this.configService.get<string>('AEROAPI_BASE_URL') ?? 'https://aeroapi.flightaware.com/aeroapi';
  }

  private aviationStackBaseUrl(): string {
    return this.configService.get<string>('AVIATIONSTACK_BASE_URL') ?? 'http://api.aviationstack.com/v1';
  }

  private extractPositions(response: AeroApiResponse): AeroApiResponse[] {
    return response?.positions ?? response?.flights ?? response?.data ?? [];
  }

  private extractDetails(response: AeroApiResponse): AeroApiResponse | null {
    if (response?.flight) {
      return response.flight;
    }
    if (Array.isArray(response?.flights) && response.flights.length > 0) {
      return response.flights[0];
    }
    return response ?? null;
  }

  private normalizeLiveFlight(entry: AeroApiResponse): NormalizedFlightSummary {
    const position = this.normalizePosition(entry);
    const origin = this.normalizeAirport(entry.origin, entry.origin_iata, entry.origin_icao);
    const destination = this.normalizeAirport(entry.destination, entry.destination_iata, entry.destination_icao);
    const operator = this.normalizeOperator(entry);

    return {
      id: entry.fa_flight_id ?? entry.flight_id ?? entry.ident ?? entry.ident_icao ?? entry.ident_iata,
      callsign: entry.ident ?? entry.callsign ?? entry.ident_icao ?? entry.ident_iata,
      flightNumber: entry.ident_iata ?? entry.ident,
      operator,
      origin,
      destination,
      position,
      status: entry.status ?? entry.flight_status,
      lastUpdatedUtc: entry.last_position_time ?? entry.timestamp ?? entry.clock ?? entry.updated_at,
    };
  }

  private normalizeFlightDetails(entry: AeroApiResponse): NormalizedFlightDetails {
    const summary = this.normalizeLiveFlight(entry);
    return {
      ...summary,
      gate: {
        origin: entry.gate_origin ?? entry.gate_departure ?? entry.gate,
        destination: entry.gate_destination ?? entry.gate_arrival,
      },
      terminal: {
        origin: entry.terminal_origin ?? entry.terminal_departure ?? entry.terminal,
        destination: entry.terminal_destination ?? entry.terminal_arrival,
      },
      scheduled: {
        off: entry.scheduled_out ?? entry.scheduled_off ?? entry.departure_time?.scheduled,
        on: entry.scheduled_in ?? entry.scheduled_on ?? entry.arrival_time?.scheduled,
      },
      estimated: {
        off: entry.estimated_out ?? entry.estimated_off ?? entry.departure_time?.estimated,
        on: entry.estimated_in ?? entry.estimated_on ?? entry.arrival_time?.estimated,
      },
      actual: {
        off: entry.actual_out ?? entry.actual_off ?? entry.departure_time?.actual,
        on: entry.actual_in ?? entry.actual_on ?? entry.arrival_time?.actual,
      },
      route: entry.route
        ? {
            description: entry.route,
            coordinates: entry.route_coordinates?.map((coord: any) => ({
              latitude: coord.lat ?? coord.latitude,
              longitude: coord.lon ?? coord.longitude,
            })),
          }
        : undefined,
      aircraft: entry.aircraft_type || entry.aircraft_registration
        ? {
            registration: entry.aircraft_registration ?? entry.registration,
            type: entry.aircraft_type ?? entry.aircraft?.type,
          }
        : undefined,
    };
  }

  private normalizeOperator(entry: AeroApiResponse): NormalizedOperator | undefined {
    const operator = entry.operator ?? entry.operator_name ?? entry.airline?.name;
    const icao = entry.operator_icao ?? entry.operator_icao_code ?? entry.airline?.icao;
    const iata = entry.operator_iata ?? entry.operator_iata_code ?? entry.airline?.iata;
    const callsign = entry.operator_callsign ?? entry.airline?.callsign;

    if (!operator && !icao && !iata && !callsign) {
      return undefined;
    }

    return {
      name: operator,
      icao,
      iata,
      callsign,
    };
  }

  private normalizeAirport(
    entry?: AeroApiResponse,
    iataCode?: string,
    icaoCode?: string,
  ): NormalizedAirport | undefined {
    if (!entry && !iataCode && !icaoCode) {
      return undefined;
    }

    return {
      code: entry?.code ?? iataCode ?? icaoCode,
      name: entry?.name ?? entry?.airport,
      iata: entry?.iata ?? iataCode,
      icao: entry?.icao ?? icaoCode,
      city: entry?.city,
      country: entry?.country,
      countryCode: entry?.country_code,
      timezone: entry?.timezone,
      latitude: entry?.latitude,
      longitude: entry?.longitude,
    };
  }

  private normalizePosition(entry: AeroApiResponse): NormalizedPosition | undefined {
    const latitude = entry.latitude ?? entry.lat ?? entry.position?.latitude;
    const longitude = entry.longitude ?? entry.lon ?? entry.position?.longitude;
    if (latitude === undefined || longitude === undefined) {
      return undefined;
    }

    return {
      latitude,
      longitude,
      altitude: entry.altitude ?? entry.alt,
      groundSpeed: entry.groundspeed ?? entry.gs,
      heading: entry.heading ?? entry.track ?? entry.true_heading,
      isOnGround: entry.on_ground ?? entry.ground ?? false,
      timestamp: entry.last_position_time ?? entry.timestamp ?? entry.clock,
    };
  }

  private resolveBounds(region?: string, bbox?: string) {
    if (bbox) {
      const [minLat, minLon, maxLat, maxLon] = bbox.split(',').map(Number);
      if ([minLat, minLon, maxLat, maxLon].every((value) => !Number.isNaN(value))) {
        return { minLat, minLon, maxLat, maxLon };
      }
    }

    const regionBounds: Record<string, { minLat: number; minLon: number; maxLat: number; maxLon: number }> = {
      UK_EU: { minLat: 34, minLon: -11, maxLat: 72, maxLon: 35 },
      AU: { minLat: -45, minLon: 110, maxLat: -10, maxLon: 155 },
      GLOBAL: { minLat: -90, minLon: -180, maxLat: 90, maxLon: 180 },
    };

    const key = (region ?? 'GLOBAL').toUpperCase();
    return regionBounds[key] ?? regionBounds.GLOBAL;
  }

  private buildAeroApiQuery(
    query: LiveFlightsQuery,
    bounds: { minLat: number; minLon: number; maxLat: number; maxLon: number },
  ): string {
    const parts: string[] = [
      `{range lat ${bounds.minLat} ${bounds.maxLat}}`,
      `{range lon ${bounds.minLon} ${bounds.maxLon}}`,
      '{true inAir}',
    ];

    if (query.minAltitude !== undefined) {
      parts.push(`{>= alt ${query.minAltitude}}`);
    }
    if (query.maxAltitude !== undefined) {
      parts.push(`{<= alt ${query.maxAltitude}}`);
    }
    if (query.minSpeed !== undefined) {
      parts.push(`{>= gs ${query.minSpeed}}`);
    }
    if (query.maxSpeed !== undefined) {
      parts.push(`{<= gs ${query.maxSpeed}}`);
    }

    return parts.join(' ');
  }

  private applyPostFilters(flight: NormalizedFlightSummary, query: LiveFlightsQuery): boolean {
    if (!flight.position) {
      return false;
    }

    if (query.airline) {
      const airlineFilter = query.airline.toLowerCase();
      const operatorMatch = flight.operator?.name?.toLowerCase().includes(airlineFilter);
      const iataMatch = flight.operator?.iata?.toLowerCase() === airlineFilter;
      const icaoMatch = flight.operator?.icao?.toLowerCase() === airlineFilter;
      if (!operatorMatch && !iataMatch && !icaoMatch) {
        return false;
      }
    }

    if (query.destinationCountry) {
      const country = flight.destination?.country?.toLowerCase();
      const countryCode = flight.destination?.countryCode?.toLowerCase();
      const target = query.destinationCountry.toLowerCase();
      if (country !== target && countryCode !== target) {
        return false;
      }
    }

    return true;
  }

  private buildLiveCacheKey(query: LiveFlightsQuery): string {
    return `flights:live:${JSON.stringify({
      region: query.region ?? 'global',
      bbox: query.bbox ?? null,
      airline: query.airline ?? null,
      minAltitude: query.minAltitude ?? null,
      maxAltitude: query.maxAltitude ?? null,
      minSpeed: query.minSpeed ?? null,
      maxSpeed: query.maxSpeed ?? null,
      destinationCountry: query.destinationCountry ?? null,
      max: query.max ?? null,
    })}`;
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
