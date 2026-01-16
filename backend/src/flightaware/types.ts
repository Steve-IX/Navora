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

export interface NormalizedOperator {
  name?: string;
  iata?: string;
  icao?: string;
  callsign?: string;
}

export interface NormalizedAirport {
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

export interface NormalizedPosition {
  latitude: number;
  longitude: number;
  altitude?: number;
  groundSpeed?: number;
  heading?: number;
  isOnGround?: boolean;
  timestamp?: string;
}

export interface NormalizedFlightSummary {
  id: string;
  callsign?: string;
  flightNumber?: string;
  operator?: NormalizedOperator;
  origin?: NormalizedAirport;
  destination?: NormalizedAirport;
  position?: NormalizedPosition;
  status?: string;
  lastUpdatedUtc?: string;
}

export interface NormalizedFlightDetails extends NormalizedFlightSummary {
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
  flights: NormalizedFlightSummary[];
  stale: boolean;
  source: 'aeroapi' | 'cache';
}

export interface FlightDetailsResponse {
  flight: NormalizedFlightDetails | null;
  updatedAt: string;
  stale: boolean;
  source: 'aeroapi' | 'cache';
}
