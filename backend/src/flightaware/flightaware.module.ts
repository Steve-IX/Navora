import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { FlightawareController } from './flightaware.controller';
import { FlightawareService } from './flightaware.service';

@Module({
  imports: [HttpModule, ConfigModule, CacheModule],
  controllers: [FlightawareController],
  providers: [FlightawareService],
  exports: [FlightawareService],
})
export class FlightawareModule {}
