import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  async createReview(@Request() req, @Body() dto: CreateReviewDto) {
    return this.reviewsService.createReview(req.user.id, dto);
  }

  @Get('place/:placeId')
  async getReviewsForPlace(@Param('placeId') placeId: string, @Query('limit') limit?: string) {
    const reviews = await this.reviewsService.getReviewsForPlace(
      placeId,
      limit ? parseInt(limit) : 50,
    );
    const avgRating = await this.reviewsService.getAverageRating(placeId);
    return { reviews, averageRating: avgRating };
  }

  @Get('nearby')
  async getReviewsNearby(
    @Query('lng') lng: string,
    @Query('lat') lat: string,
    @Query('radius') radius?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviewsService.getReviewsNearLocation(
      { longitude: parseFloat(lng), latitude: parseFloat(lat) },
      radius ? parseFloat(radius) : 1000,
      limit ? parseInt(limit) : 20,
    );
  }

  @Delete(':id')
  async deleteReview(@Request() req, @Param('id') id: string) {
    await this.reviewsService.deleteReview(req.user.id, id);
    return { message: 'Review deleted' };
  }
}
