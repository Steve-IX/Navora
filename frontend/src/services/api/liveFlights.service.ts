import { apiClient } from './client';
import {
  FlightDetailsResponse,
  LiveFlightsResponse,
  LiveFlightSummary,
} from '@/types/liveFlights';

export interface LiveFlightsQuery {
  region?: string;
  bbox?: string;
  airline?: string;
  minAltitude?: number;
  maxAltitude?: number;
  minSpeed?: number;
  maxSpeed?: number;
  destinationCountry?: string;
  max?: number;
}

class LiveFlightsService {
  private readonly basePath = '/api/flights';

  async getLiveFlights(params: LiveFlightsQuery): Promise<LiveFlightsResponse> {
    const response = await apiClient.instance.get<LiveFlightsResponse>(
      `${this.basePath}/live`,
      { params },
    );
    return response.data;
  }

  async getFlightDetails(flightId: string): Promise<FlightDetailsResponse> {
    const response = await apiClient.instance.get<FlightDetailsResponse>(
      `${this.basePath}/${encodeURIComponent(flightId)}`,
    );
    return response.data;
  }

  summarizeFlight(flight: LiveFlightSummary): string {
    const operator = flight.operator?.name ?? flight.operator?.iata ?? 'Unknown operator';
    const flightNumber = flight.flightNumber ?? flight.callsign ?? 'Unknown';
    return `${operator} ${flightNumber}`;
  }
}

export const liveFlightsService = new LiveFlightsService();
