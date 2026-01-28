import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FeedsService } from './feeds.service';

@Controller('feeds')
@UseGuards(JwtAuthGuard)
export class FeedsController {
  constructor(private readonly feedsService: FeedsService) {}

  @Get()
  async getSocialFeed(@Request() req, @Query('limit') limit?: string) {
    return this.feedsService.getSocialFeed(req.user.id, limit ? parseInt(limit) : 50);
  }
}
