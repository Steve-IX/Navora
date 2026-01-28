import axios from 'axios';
import {
  WeatherDisplayData,
  WeatherAPIResponse,
  WeatherAPIError,
  WeatherCondition,
  WeatherLocation,
} from '@shared/types/weather';

export interface WeatherQueryParams {
  query: string;
  units?: 'm' | 's' | 'f';
}

export interface WeatherCoordinatesParams {
  lat: number;
  lon: number;
  units?: 'm' | 's' | 'f';
}

class WeatherService {
  private readonly baseUrl = 'https://api.weatherapi.com/v1';
  private readonly apiKey = import.meta.env.VITE_WEATHERAPI_KEY as
    | string
    | undefined;

  async getCurrentWeather(params: WeatherQueryParams): Promise<WeatherDisplayData> {
    if (!this.apiKey) {
      throw new Error('WeatherAPI API key not configured');
    }

    const response = await axios.get<WeatherAPIResponse | WeatherAPIError>(
      `${this.baseUrl}/current.json`,
      {
        params: {
          key: this.apiKey,
          q: params.query,
        },
      },
    );

    if ('error' in response.data && response.data.error) {
      throw new Error(response.data.error.message || 'Weather data unavailable');
    }

    return this.transformWeatherData(response.data as WeatherAPIResponse);
  }

  async getWeatherByCoordinates(params: WeatherCoordinatesParams): Promise<WeatherDisplayData> {
    return this.getCurrentWeather({
      query: `${params.lat},${params.lon}`,
      units: params.units,
    });
  }

  private transformWeatherData(data: WeatherAPIResponse): WeatherDisplayData {
    const { location, current } = data;

    const weatherLocation: WeatherLocation = {
      name: location.name,
      country: location.country,
      region: location.region,
      latitude: location.lat,
      longitude: location.lon,
      timezone: location.tz_id,
      localTime: location.localtime,
    };

    return {
      temperature: current.temp_c,
      feelsLike: current.feelslike_c,
      condition: this.mapWeatherCode(current.condition.code),
      description: current.condition.text,
      icon: current.condition.icon,
      humidity: current.humidity,
      pressure: current.pressure_mb,
      windSpeed: current.wind_kph,
      windDegree: current.wind_degree,
      windDirection: current.wind_dir,
      precipitation: current.precip_mm,
      cloudCover: current.cloud,
      visibility: current.vis_km,
      uvIndex: current.uv,
      isDay: current.is_day === 1,
      observationTime: current.last_updated,
      location: weatherLocation,
    };
  }

  private mapWeatherCode(code: number): WeatherCondition {
    // WeatherAPI.com weather codes mapping
    // Reference: https://www.weatherapi.com/docs/weather_conditions.json

    // Clear / Sunny (1000)
    if (code === 1000) return 'sunny';

    // Partly cloudy (1003)
    if (code === 1003) return 'partly-cloudy';

    // Cloudy (1006)
    if (code === 1006) return 'cloudy';

    // Overcast (1009)
    if (code === 1009) return 'overcast';

    // Mist (1030)
    if (code === 1030) return 'mist';

    // Fog, Freezing fog (1135, 1147)
    if ([1135, 1147].includes(code)) return 'fog';

    // Patchy rain possible, Patchy light rain, Light rain, Moderate rain at times (1063, 1180, 1183, 1186)
    if ([1063, 1180, 1183, 1186].includes(code)) return 'rain';

    // Moderate rain, Heavy rain at times, Heavy rain (1189, 1192, 1195)
    if ([1189, 1192, 1195].includes(code)) return 'heavy-rain';

    // Light rain shower, Moderate or heavy rain shower (1240, 1243)
    if ([1240, 1243].includes(code)) return 'rain';

    // Torrential rain shower (1246)
    if (code === 1246) return 'heavy-rain';

    // Patchy light drizzle, Light drizzle (1150, 1153)
    if ([1150, 1153].includes(code)) return 'drizzle';

    // Freezing drizzle, Heavy freezing drizzle (1168, 1171)
    if ([1168, 1171].includes(code)) return 'drizzle';

    // Patchy freezing drizzle possible (1072)
    if (code === 1072) return 'drizzle';

    // Light freezing rain, Moderate or heavy freezing rain (1198, 1201)
    if ([1198, 1201].includes(code)) return 'rain';

    // Patchy snow possible, Patchy light snow, Light snow (1066, 1210, 1213)
    if ([1066, 1210, 1213].includes(code)) return 'snow';

    // Patchy moderate snow, Moderate snow, Patchy heavy snow, Heavy snow (1216, 1219, 1222, 1225)
    if ([1216, 1219, 1222, 1225].includes(code)) return 'heavy-snow';

    // Light snow showers, Moderate or heavy snow showers (1255, 1258)
    if ([1255, 1258].includes(code)) return 'snow';

    // Patchy sleet possible, Light sleet, Moderate or heavy sleet (1069, 1204, 1207)
    if ([1069, 1204, 1207].includes(code)) return 'sleet';

    // Light sleet showers, Moderate or heavy sleet showers (1249, 1252)
    if ([1249, 1252].includes(code)) return 'sleet';

    // Blowing snow (1114)
    if (code === 1114) return 'snow';

    // Blizzard (1117)
    if (code === 1117) return 'blizzard';

    // Ice pellets, Light showers of ice pellets, Moderate or heavy showers of ice pellets (1237, 1261, 1264)
    if ([1237, 1261, 1264].includes(code)) return 'hail';

    // Thundery outbreaks possible (1087)
    if (code === 1087) return 'thunderstorm';

    // Patchy light rain with thunder, Moderate or heavy rain with thunder (1273, 1276)
    if ([1273, 1276].includes(code)) return 'thunderstorm';

    // Patchy light snow with thunder, Moderate or heavy snow with thunder (1279, 1282)
    if ([1279, 1282].includes(code)) return 'thunderstorm';

    // Default fallback
    return 'cloudy';
  }
}

export const weatherService = new WeatherService();
