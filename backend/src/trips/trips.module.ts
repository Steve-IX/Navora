import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { GroupTrip } from './entities/group-trip.entity';
import { TripParticipant } from './entities/trip-participant.entity';
import { TripWaypoint } from './entities/trip-waypoint.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([GroupTrip, TripParticipant, TripWaypoint]),
  ],
  controllers: [TripsController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}

