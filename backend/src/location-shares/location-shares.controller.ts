import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LocationSharesService } from './location-shares.service';
import { CreateLocationShareDto } from './dto/create-location-share.dto';

@Controller('location-shares')
@UseGuards(JwtAuthGuard)
export class LocationSharesController {
  constructor(private readonly locationSharesService: LocationSharesService) {}

  @Post()
  async createShare(@Request() req, @Body() dto: CreateLocationShareDto) {
    return this.locationSharesService.createShare(req.user.id, dto);
  }

  @Get('shared-with-me')
  async getSharesSharedWithMe(@Request() req) {
    return this.locationSharesService.getSharesSharedWithMe(req.user.id);
  }

  @Get('my-shares')
  async getMyActiveShares(@Request() req) {
    return this.locationSharesService.getMyActiveShares(req.user.id);
  }

  @Delete(':id')
  async stopShare(@Request() req, @Param('id') id: string) {
    await this.locationSharesService.stopShare(req.user.id, id);
    return { message: 'Location share stopped' };
  }
}
