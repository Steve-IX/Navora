/**
 * Weather types for WeatherStack API integration
 */

// Raw API response types from WeatherStack
export interface WeatherStackLocation {
  name: string;
  country: string;
  region: string;
  lat: string;
  lon: string;
  timezone_id: string;
  localtime: string;
  localtime_epoch: number;
  utc_offset: string;
}

export interface WeatherStackCurrent {
  observation_time: string;
  temperature: number;
  weather_code: number;
  weather_icons: string[];
  weather_descriptions: string[];
  wind_speed: number;
  wind_degree: number;
  wind_dir: string;
  pressure: number;
  precip: number;
  humidity: number;
  cloudcover: number;
  feelslike: number;
  uv_index: number;
  visibility: number;
  is_day: 'yes' | 'no';
}

export interface WeatherStackResponse {
  request: {
    type: string;
    query: string;
    language: string;
    unit: string;
  };
  location: WeatherStackLocation;
  current: WeatherStackCurrent;
}

export interface WeatherStackError {
  success: false;
  error: {
    code: number;
    type: string;
    info: string;
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
