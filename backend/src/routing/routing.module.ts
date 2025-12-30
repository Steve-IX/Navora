import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RoutingService } from './routing.service';
import { RoutingController } from './routing.controller';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { GeocodingModule } from '../geocoding/geocoding.module';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    GeocodingModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
  ],
  controllers: [RoutingController],
  providers: [
    RoutingService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [RoutingService],
})
export class RoutingModule {}

