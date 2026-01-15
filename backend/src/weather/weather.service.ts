import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  WeatherDisplayData,
  WeatherCondition,
  WeatherStackResponse,
  WeatherStackError,
  WeatherLocation,
} from '@shared/types/weather';

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'http://api.weatherstack.com';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('WEATHERSTACK_API_KEY') || '';
    if (!this.apiKey) {
      this.logger.warn(
        'WEATHERSTACK_API_KEY not configured - weather service disabled',
      );
    }
  }

  async getCurrentWeather(
    query: string,
    units: string = 'm',
  ): Promise<WeatherDisplayData> {
    if (!this.apiKey) {
      throw new HttpException(
        'Weather service not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    try {
      const url = `${this.baseUrl}/current`;
      const params = {
        access_key: this.apiKey,
        query,
        units,
      };

      this.logger.debug(`Fetching weather for: ${query}`);

      const response = await firstValueFrom(
        this.httpService.get<WeatherStackResponse | WeatherStackError>(url, {
          params,
        }),
      );

      // WeatherStack returns errors in response body, not HTTP status
      const data = response.data;
      if ('error' in data && data.error) {
        this.logger.error(`WeatherStack API error: ${data.error.info}`);
        throw new HttpException(
          data.error.info || 'Weather data unavailable',
          HttpStatus.BAD_REQUEST,
        );
      }

      return this.transformWeatherData(data as WeatherStackResponse);
    } catch (error) {
      if (error instanceof HttpException) throw error;

      this.logger.error(`Weather fetch failed: ${error.message}`);
      throw new HttpException(
        'Failed to fetch weather data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getWeatherByCoordinates(
    lat: number,
    lon: number,
    units: string = 'm',
  ): Promise<WeatherDisplayData> {
    // WeatherStack accepts coordinates as "lat,lon" query
    return this.getCurrentWeather(`${lat},${lon}`, units);
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
    // WeatherStack weather codes mapping
    // Reference: https://weatherstack.com/site_resources/weatherstack-weather-condition-codes.zip

    // Clear / Sunny
    if (code === 113) return 'sunny';

    // Partly cloudy
    if (code === 116) return 'partly-cloudy';

    // Cloudy
    if (code === 119) return 'cloudy';

    // Overcast
    if (code === 122) return 'overcast';

    // Mist
    if (code === 143) return 'mist';

    // Patchy rain possible, Light rain, Moderate rain
    if ([176, 293, 296].includes(code)) return 'rain';

    // Patchy snow possible, Light snow
    if ([179, 323, 326].includes(code)) return 'snow';

    // Patchy sleet possible, Light sleet
    if ([182, 317, 320].includes(code)) return 'sleet';

    // Patchy freezing drizzle, Freezing drizzle
    if ([185, 281, 284].includes(code)) return 'drizzle';

    // Thundery outbreaks possible, Thunder
    if ([200, 386, 389, 392, 395].includes(code)) return 'thunderstorm';

    // Blowing snow, Blizzard
    if ([227, 230].includes(code)) return 'blizzard';

    // Fog, Freezing fog
    if ([248, 260].includes(code)) return 'fog';

    // Patchy light drizzle, Light drizzle
    if ([263, 266].includes(code)) return 'drizzle';

    // Heavy freezing drizzle, Moderate or heavy rain
    if ([299, 302].includes(code)) return 'rain';

    // Heavy rain, Torrential rain
    if ([305, 308, 356, 359].includes(code)) return 'heavy-rain';

    // Light rain shower, Moderate or heavy rain shower
    if ([353, 356].includes(code)) return 'rain';

    // Moderate or heavy snow, Heavy snow, Patchy heavy snow
    if ([329, 332, 335, 338, 371].includes(code)) return 'heavy-snow';

    // Ice pellets, Light showers of ice pellets
    if ([350, 374, 377].includes(code)) return 'hail';

    // Light sleet showers, Moderate or heavy sleet showers
    if ([362, 365].includes(code)) return 'sleet';

    // Light snow showers, Moderate or heavy snow showers
    if ([368, 371].includes(code)) return 'snow';

    // Default fallback
    return 'cloudy';
  }
}
