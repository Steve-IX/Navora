import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GeocodingService } from './geocoding.service';
import { GeocodingController } from './geocoding.controller';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [HttpModule, ConfigModule, ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }])],
  controllers: [GeocodingController],
  providers: [
    GeocodingService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [GeocodingService],
})
export class GeocodingModule {}
