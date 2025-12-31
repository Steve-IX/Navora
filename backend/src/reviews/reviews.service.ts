import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlaceReview } from './entities/place-review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { Point } from 'geojson';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(PlaceReview)
    private reviewsRepository: Repository<PlaceReview>,
  ) {}

  async createReview(userId: string, dto: CreateReviewDto): Promise<PlaceReview> {
    // Check if user already reviewed this place
    const existing = await this.reviewsRepository.findOne({
      where: { userId, placeId: dto.placeId || null },
    });

    const point: Point = {
      type: 'Point',
      coordinates: [dto.coordinates.longitude, dto.coordinates.latitude],
    };

    if (existing) {
      // Update existing review
      existing.rating = dto.rating;
      existing.comment = dto.comment || null;
      existing.coordinates = point;
      return this.reviewsRepository.save(existing);
    }

    const review = this.reviewsRepository.create({
      userId,
      coordinates: point,
      placeId: dto.placeId,
      placeName: dto.placeName,
      rating: dto.rating,
      comment: dto.comment,
    });

    return this.reviewsRepository.save(review);
  }

  async getReviewsForPlace(placeId: string, limit: number = 50): Promise<PlaceReview[]> {
    return this.reviewsRepository.find({
      where: { placeId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getReviewsNearLocation(
    coordinates: { longitude: number; latitude: number },
    radiusMeters: number = 1000,
    limit: number = 20,
  ): Promise<PlaceReview[]> {
    return this.reviewsRepository
      .createQueryBuilder('review')
      .where(
        `ST_DWithin(
          review.coordinates::geometry,
          ST_MakePoint(:lng, :lat)::geometry,
          :radius
        )`,
        {
          lng: coordinates.longitude,
          lat: coordinates.latitude,
          radius: radiusMeters,
        },
      )
      .orderBy('review.created_at', 'DESC')
      .limit(limit)
      .getMany();
  }

  async getAverageRating(placeId: string): Promise<number> {
    const result = await this.reviewsRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'avg')
      .where('review.placeId = :placeId', { placeId })
      .getRawOne();

    return result?.avg ? parseFloat(result.avg) : 0;
  }

  async deleteReview(userId: string, reviewId: string): Promise<void> {
    const review = await this.reviewsRepository.findOne({
      where: { id: reviewId, userId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    await this.reviewsRepository.remove(review);
  }
}

