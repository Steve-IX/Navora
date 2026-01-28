import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CheckIn } from './entities/check-in.entity';
import { CreateCheckInDto } from './dto/create-check-in.dto';
import { Point } from 'geojson';

@Injectable()
export class CheckInsService {
  constructor(
    @InjectRepository(CheckIn)
    private checkInsRepository: Repository<CheckIn>,
  ) {}

  async createCheckIn(userId: string, dto: CreateCheckInDto): Promise<CheckIn> {
    const point: Point = {
      type: 'Point',
      coordinates: [dto.coordinates.longitude, dto.coordinates.latitude],
    };

    const checkIn = this.checkInsRepository.create({
      userId,
      coordinates: point,
      placeName: dto.placeName,
      placeId: dto.placeId,
      note: dto.note,
    });

    return this.checkInsRepository.save(checkIn);
  }

  async getMyCheckIns(userId: string, limit: number = 50): Promise<CheckIn[]> {
    return this.checkInsRepository.find({
      where: { userId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getFriendCheckIns(userIds: string[], limit: number = 50): Promise<CheckIn[]> {
    if (userIds.length === 0) {
      return [];
    }

    return this.checkInsRepository.find({
      where: userIds.map((id) => ({ userId: id })),
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getCheckInsAtLocation(
    coordinates: { longitude: number; latitude: number },
    radiusMeters: number = 1000,
    limit: number = 20,
  ): Promise<CheckIn[]> {
    // Using PostGIS ST_DWithin for spatial query
    return this.checkInsRepository
      .createQueryBuilder('check_in')
      .where(
        `ST_DWithin(
          check_in.coordinates::geometry,
          ST_MakePoint(:lng, :lat)::geometry,
          :radius
        )`,
        {
          lng: coordinates.longitude,
          lat: coordinates.latitude,
          radius: radiusMeters,
        },
      )
      .orderBy('check_in.created_at', 'DESC')
      .limit(limit)
      .getMany();
  }
}
