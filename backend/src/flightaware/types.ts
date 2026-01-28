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
  source: 'opensky' | 'cache';
}

export interface FlightDetailsResponse {
  flight: NormalizedFlightDetails | null;
  updatedAt: string;
  stale: boolean;
  source: 'opensky' | 'cache';
}

// OpenSky flights API types (used to enrich origin/destination)
// Response format from /flights/all and /flights/aircraft
export interface OpenSkyFlight {
  icao24: string;
  firstSeen: number;
  estDepartureAirport: string | null;
  lastSeen: number;
  estArrivalAirport: string | null;
  callsign: string | null;
  // Additional fields that may be present
  [key: string]: any;
}

// OpenSky API types
// State vector is returned as an array with indexed fields:
// [0]: icao24 - ICAO 24-bit address (hex string)
// [1]: callsign - Callsign (string, may have trailing spaces)
// [2]: origin_country - Country of origin
// [3]: time_position - Unix timestamp of last position update
// [4]: last_contact - Unix timestamp of last contact
// [5]: longitude - WGS-84 longitude
// [6]: latitude - WGS-84 latitude
// [7]: baro_altitude - Barometric altitude in meters
// [8]: on_ground - Boolean
// [9]: velocity - Ground speed in m/s
// [10]: true_track - Track angle in degrees clockwise from north
// [11]: vertical_rate - Vertical rate in m/s
// [12]: sensors - Array of sensor IDs
// [13]: geo_altitude - Geometric altitude in meters
// [14]: squawk - Transponder code
// [15]: spi - Special position indicator
// [16]: position_source - 0=ADS-B, 1=ASTERIX, 2=MLAT, 3=FLARM
// [17]: category - Aircraft category
export type OpenSkyStateVector = [
  string, // 0: icao24
  string | null, // 1: callsign
  string, // 2: origin_country
  number | null, // 3: time_position
  number, // 4: last_contact
  number | null, // 5: longitude
  number | null, // 6: latitude
  number | null, // 7: baro_altitude
  boolean, // 8: on_ground
  number | null, // 9: velocity
  number | null, // 10: true_track
  number | null, // 11: vertical_rate
  number[] | null, // 12: sensors
  number | null, // 13: geo_altitude
  string | null, // 14: squawk
  boolean, // 15: spi
  number, // 16: position_source
  number, // 17: category
];

export interface OpenSkyResponse {
  time: number;
  states: OpenSkyStateVector[] | null;
}

export interface OpenSkyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}
