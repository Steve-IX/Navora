import { apiClient } from './client';
import { FlightData, AirportData } from '../../stores/flightStore';

export interface FlightSearchParams {
  flightNumber?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  airlineIata?: string;
  flightStatus?: string;
  limit?: number;
  offset?: number;
}

export interface AirportSearchParams {
  search?: string;
  countryCode?: string;
  limit?: number;
  offset?: number;
}

export interface FlightSearchResponse {
  flights: FlightData[];
  pagination: {
    limit: number;
    offset: number;
    count: number;
    total: number;
  };
}

export interface AirportSearchResponse {
  airports: AirportData[];
  pagination: {
    limit: number;
    offset: number;
    count: number;
    total: number;
  };
}

class FlightsService {
  private readonly basePath = '/routing';

  async searchFlights(params: FlightSearchParams): Promise<FlightSearchResponse> {
    const response = await apiClient.instance.get<FlightSearchResponse>(
      `${this.basePath}/flights/search`,
      { params },
    );
    return response.data;
  }

  async searchAirports(params: AirportSearchParams): Promise<AirportSearchResponse> {
    const response = await apiClient.instance.get<AirportSearchResponse>(
      `${this.basePath}/airports/search`,
      { params },
    );
    return response.data;
  }

  async getFlightByNumber(flightNumber: string): Promise<FlightSearchResponse> {
    return this.searchFlights({ flightNumber });
  }

  async getFlightsByDeparture(departureAirport: string): Promise<FlightSearchResponse> {
    return this.searchFlights({ departureAirport });
  }

  async getFlightsByArrival(arrivalAirport: string): Promise<FlightSearchResponse> {
    return this.searchFlights({ arrivalAirport });
  }
}

export const flightsService = new FlightsService();
