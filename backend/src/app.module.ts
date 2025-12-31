import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GeocodingModule } from './geocoding/geocoding.module';
import { RoutingModule } from './routing/routing.module';
import { LocationsModule } from './locations/locations.module';
import { RoutesModule } from './routes/routes.module';
import { WebsocketModule } from './websocket/websocket.module';
import { PlacesModule } from './places/places.module';
import { ProfilesModule } from './profiles/profiles.module';
import { FriendsModule } from './friends/friends.module';
import { LocationSharesModule } from './location-shares/location-shares.module';
import { TripsModule } from './trips/trips.module';
import { CheckInsModule } from './checkins/checkins.module';
import { ReviewsModule } from './reviews/reviews.module';
import { LocationListsModule } from './location-lists/location-lists.module';
import { FeedsModule } from './feeds/feeds.module';
import { DatabaseConfig } from './config/database.config';
import { AppController } from './app.controller';

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useClass: DatabaseConfig,
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100, // General API limit
      },
      {
        name: 'location-share',
        ttl: 60000,
        limit: 30, // Location sharing updates per minute
      },
      {
        name: 'websocket',
        ttl: 60000,
        limit: 60, // WebSocket messages per minute
      },
    ]),
    AuthModule,
    UsersModule,
    GeocodingModule,
    RoutingModule,
    LocationsModule,
    RoutesModule,
    WebsocketModule,
    PlacesModule,
    ProfilesModule,
    FriendsModule,
    LocationSharesModule,
    TripsModule,
    CheckInsModule,
    ReviewsModule,
    LocationListsModule,
    FeedsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

