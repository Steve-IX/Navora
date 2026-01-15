import axios from 'axios';
import {
  WeatherDisplayData,
  WeatherStackResponse,
  WeatherStackError,
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
  private readonly baseUrl = 'https://api.weatherstack.com';
  private readonly apiKey = import.meta.env.VITE_WEATHERSTACK_API_KEY as
    | string
    | undefined;

  async getCurrentWeather(params: WeatherQueryParams): Promise<WeatherDisplayData> {
    if (!this.apiKey) {
      throw new Error('Weatherstack API key not configured');
    }

    const response = await axios.get<WeatherStackResponse | WeatherStackError>(
      `${this.baseUrl}/current`,
      {
        params: {
          access_key: this.apiKey,
          query: params.query,
          units: params.units || 'm',
        },
      },
    );

    if ('error' in response.data && response.data.error) {
      throw new Error(response.data.error.info || 'Weather data unavailable');
    }

    return this.transformWeatherData(response.data as WeatherStackResponse);
  }

  async getWeatherByCoordinates(params: WeatherCoordinatesParams): Promise<WeatherDisplayData> {
    return this.getCurrentWeather({
      query: `${params.lat},${params.lon}`,
      units: params.units,
    });
  }

  private transformWeatherData(data: WeatherStackResponse): WeatherDisplayData {
    const { location, current } = data;

    const weatherLocation: WeatherLocation = {
      name: location.name,
      country: location.country,
      region: location.region,
      latitude: parseFloat(location.lat),
      longitude: parseFloat(location.lon),
      timezone: location.timezone_id,
      localTime: location.localtime,
    };

    return {
      temperature: current.temperature,
      feelsLike: current.feelslike,
      condition: this.mapWeatherCode(current.weather_code),
      description: current.weather_descriptions[0] || 'Unknown',
      icon: current.weather_icons[0] || '',
      humidity: current.humidity,
      pressure: current.pressure,
      windSpeed: current.wind_speed,
      windDegree: current.wind_degree,
      windDirection: current.wind_dir,
      precipitation: current.precip,
      cloudCover: current.cloudcover,
      visibility: current.visibility,
      uvIndex: current.uv_index,
      isDay: current.is_day === 'yes',
      observationTime: current.observation_time,
      location: weatherLocation,
    };
  }

  private mapWeatherCode(code: number): WeatherCondition {
    if (code === 113) return 'sunny';
    if (code === 116) return 'partly-cloudy';
    if (code === 119) return 'cloudy';
    if (code === 122) return 'overcast';
    if (code === 143) return 'mist';
    if ([176, 293, 296].includes(code)) return 'rain';
    if ([179, 323, 326].includes(code)) return 'snow';
    if ([182, 317, 320].includes(code)) return 'sleet';
    if ([185, 281, 284].includes(code)) return 'drizzle';
    if ([200, 386, 389, 392, 395].includes(code)) return 'thunderstorm';
    if ([227, 230].includes(code)) return 'blizzard';
    if ([248, 260].includes(code)) return 'fog';
    if ([263, 266].includes(code)) return 'drizzle';
    if ([299, 302].includes(code)) return 'rain';
    if ([305, 308, 356, 359].includes(code)) return 'heavy-rain';
    if ([353, 356].includes(code)) return 'rain';
    if ([329, 332, 335, 338, 371].includes(code)) return 'heavy-snow';
    if ([350, 374, 377].includes(code)) return 'hail';
    if ([362, 365].includes(code)) return 'sleet';
    if ([368, 371].includes(code)) return 'snow';
    return 'cloudy';
  }
}

export const weatherService = new WeatherService();
