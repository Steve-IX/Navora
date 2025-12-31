import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CheckInsService } from './checkins.service';
import { CreateCheckInDto } from './dto/create-check-in.dto';

@Controller('checkins')
@UseGuards(JwtAuthGuard)
export class CheckInsController {
  constructor(private readonly checkInsService: CheckInsService) {}

  @Post()
  async createCheckIn(@Request() req, @Body() dto: CreateCheckInDto) {
    return this.checkInsService.createCheckIn(req.user.id, dto);
  }

  @Get('me')
  async getMyCheckIns(@Request() req, @Query('limit') limit?: string) {
    return this.checkInsService.getMyCheckIns(req.user.id, limit ? parseInt(limit) : 50);
  }

  @Get('friends')
  async getFriendCheckIns(@Request() req, @Query('limit') limit?: string) {
    // In a real implementation, you'd get friend IDs from the friends service
    // For now, return empty array - this would be enhanced with actual friend relationships
    return [];
  }

  @Get('nearby')
  async getCheckInsNearby(
    @Query('lng') lng: string,
    @Query('lat') lat: string,
    @Query('radius') radius?: string,
    @Query('limit') limit?: string,
  ) {
    return this.checkInsService.getCheckInsAtLocation(
      { longitude: parseFloat(lng), latitude: parseFloat(lat) },
      radius ? parseFloat(radius) : 1000,
      limit ? parseInt(limit) : 20,
    );
  }
}

