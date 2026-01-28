/**
 * Weather types for WeatherAPI.com integration
 */

// Raw API response types from WeatherAPI.com
export interface WeatherAPILocation {
  name: string;
  country: string;
  region: string;
  lat: number;
  lon: number;
  tz_id: string;
  localtime: string;
  localtime_epoch: number;
}

export interface WeatherAPICondition {
  code: number;
  text: string;
  icon: string;
}

export interface WeatherAPICurrent {
  last_updated: string;
  last_updated_epoch: number;
  temp_c: number;
  temp_f: number;
  feelslike_c: number;
  feelslike_f: number;
  condition: WeatherAPICondition;
  wind_kph: number;
  wind_mph: number;
  wind_degree: number;
  wind_dir: string;
  pressure_mb: number;
  pressure_in: number;
  precip_mm: number;
  precip_in: number;
  humidity: number;
  cloud: number;
  uv: number;
  vis_km: number;
  vis_miles: number;
  is_day: number;
  gust_kph: number;
  gust_mph: number;
}

export interface WeatherAPIResponse {
  location: WeatherAPILocation;
  current: WeatherAPICurrent;
}

export interface WeatherAPIError {
  error: {
    code: number;
    message: string;
  };
}

// Application-level types (transformed for frontend use)
export type WeatherCondition =
  | 'sunny'
  | 'clear'
  | 'partly-cloudy'
  | 'cloudy'
  | 'overcast'
  | 'mist'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'heavy-rain'
  | 'thunderstorm'
  | 'snow'
  | 'heavy-snow'
  | 'sleet'
  | 'hail'
  | 'blizzard';

export interface WeatherLocation {
  name: string;
  country: string;
  region: string;
  latitude: number;
  longitude: number;
  timezone: string;
  localTime: string;
}

export interface WeatherDisplayData {
  temperature: number;
  feelsLike: number;
  condition: WeatherCondition;
  description: string;
  icon: string;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDegree: number;
  windDirection: string;
  precipitation: number;
  cloudCover: number;
  visibility: number;
  uvIndex: number;
  isDay: boolean;
  observationTime: string;
  location: WeatherLocation;
}

// Request types
export interface WeatherRequest {
  query: string;
  units?: 'm' | 's' | 'f'; // metric, scientific, fahrenheit
}

export interface WeatherByCoordinatesRequest {
  latitude: number;
  longitude: number;
  units?: 'm' | 's' | 'f';
}

// Weather code to condition mapping helper type
export interface WeatherCodeMapping {
  code: number;
  condition: WeatherCondition;
  description: string;
}
