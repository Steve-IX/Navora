import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TripsService } from './trips.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { AddWaypointDto } from './dto/add-waypoint.dto';
import { TripStatus } from './entities/group-trip.entity';

@Controller('trips')
@UseGuards(JwtAuthGuard)
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post()
  async createTrip(@Request() req, @Body() dto: CreateTripDto) {
    return this.tripsService.createTrip(req.user.id, dto);
  }

  @Get()
  async getMyTrips(@Request() req) {
    return this.tripsService.getMyTrips(req.user.id);
  }

  @Get(':id')
  async getTrip(@Request() req, @Param('id') id: string) {
    return this.tripsService.getTrip(req.user.id, id);
  }

  @Post(':id/participants')
  async inviteParticipant(@Request() req, @Param('id') id: string, @Body() body: { userId: string }) {
    return this.tripsService.inviteParticipant(id, req.user.id, body.userId);
  }

  @Post(':id/waypoints')
  async addWaypoint(@Request() req, @Param('id') id: string, @Body() dto: AddWaypointDto) {
    return this.tripsService.addWaypoint(id, req.user.id, dto);
  }

  @Delete(':id/waypoints/:waypointId')
  async removeWaypoint(@Request() req, @Param('id') id: string, @Param('waypointId') waypointId: string) {
    await this.tripsService.removeWaypoint(id, req.user.id, waypointId);
    return { message: 'Waypoint removed' };
  }

  @Patch(':id/status')
  async updateStatus(@Request() req, @Param('id') id: string, @Body() body: { status: TripStatus }) {
    return this.tripsService.updateTripStatus(id, req.user.id, body.status);
  }
}

