import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Request,
  NotFoundException,
  Param,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProfilesService } from './profiles.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('profiles')
@UseGuards(JwtAuthGuard)
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get('me')
  async getMyProfile(@Request() req) {
    return this.profilesService.getProfile(req.user.id);
  }

  @Patch('me')
  async updateMyProfile(@Request() req, @Body() updateDto: UpdateProfileDto) {
    return this.profilesService.updateProfile(req.user.id, updateDto);
  }

  @Get(':userId')
  async getProfile(@Request() req, @Param('userId') userId: string) {
    // Allow users to view their own profile or profiles of friends
    const profile = await this.profilesService.getProfileByUserId(userId);
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }
    return profile;
  }
}
