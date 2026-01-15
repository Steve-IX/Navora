import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { WeatherService } from './weather.service';
import {
  GetWeatherDto,
  GetWeatherByCoordinatesDto,
} from './dto/weather.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';

@Controller('weather')
@UseGuards(JwtAuthGuard)
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get('current')
  @Public()
  async getCurrentWeather(@Query() dto: GetWeatherDto) {
    return this.weatherService.getCurrentWeather(dto.query, dto.units);
  }

  @Get('coordinates')
  @Public()
  async getWeatherByCoordinates(@Query() dto: GetWeatherByCoordinatesDto) {
    return this.weatherService.getWeatherByCoordinates(
      dto.lat,
      dto.lon,
      dto.units,
    );
  }
}
