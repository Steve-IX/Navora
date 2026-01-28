export interface LiveFlightOperator {
  name?: string;
  iata?: string;
  icao?: string;
  callsign?: string;
}

export interface LiveFlightAirport {
  code?: string;
  name?: string;
  iata?: string;
  icao?: string;
  city?: string;
  country?: string;
  countryCode?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
}

export interface LiveFlightPosition {
  latitude: number;
  longitude: number;
  altitude?: number;
  groundSpeed?: number;
  heading?: number;
  isOnGround?: boolean;
  timestamp?: string;
}

export interface LiveFlightSummary {
  id: string;
  callsign?: string;
  flightNumber?: string;
  operator?: LiveFlightOperator;
  origin?: LiveFlightAirport;
  destination?: LiveFlightAirport;
  position?: LiveFlightPosition;
  status?: string;
  lastUpdatedUtc?: string;
}

export interface LiveFlightDetails extends LiveFlightSummary {
  gate?: {
    origin?: string;
    destination?: string;
  };
  terminal?: {
    origin?: string;
    destination?: string;
  };
  scheduled?: {
    off?: string;
    on?: string;
  };
  estimated?: {
    off?: string;
    on?: string;
  };
  actual?: {
    off?: string;
    on?: string;
  };
  route?: {
    description?: string;
    coordinates?: Array<{ latitude: number; longitude: number }>;
  };
  aircraft?: {
    registration?: string;
    type?: string;
  };
}

export interface LiveFlightsResponse {
  region: string;
  updatedAt: string;
  flights: LiveFlightSummary[];
  stale: boolean;
  source: 'opensky' | 'cache';
}

export interface FlightDetailsResponse {
  flight: LiveFlightDetails | null;
  updatedAt: string;
  stale: boolean;
  source: 'opensky' | 'cache';
}
