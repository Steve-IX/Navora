import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { LocationShare } from './entities/location-share.entity';
import { CreateLocationShareDto } from './dto/create-location-share.dto';
import { FriendsService } from '../friends/friends.service';
import { ProfilesService } from '../profiles/profiles.service';
import { Point } from 'geojson';

@Injectable()
export class LocationSharesService {
  constructor(
    @InjectRepository(LocationShare)
    private locationSharesRepository: Repository<LocationShare>,
    private friendsService: FriendsService,
    private profilesService: ProfilesService,
  ) {}

  async createShare(userId: string, dto: CreateLocationShareDto): Promise<LocationShare> {
    // Validate coordinates
    if (
      !dto.coordinates ||
      typeof dto.coordinates.latitude !== 'number' ||
      typeof dto.coordinates.longitude !== 'number' ||
      isNaN(dto.coordinates.latitude) ||
      isNaN(dto.coordinates.longitude) ||
      dto.coordinates.latitude < -90 ||
      dto.coordinates.latitude > 90 ||
      dto.coordinates.longitude < -180 ||
      dto.coordinates.longitude > 180
    ) {
      throw new BadRequestException('Invalid coordinates');
    }

    // Check if user has location sharing enabled
    const profile = await this.profilesService.getProfile(userId);
    if (!profile.locationSharingEnabled) {
      throw new BadRequestException('Location sharing is not enabled in your profile');
    }

    // If sharing with specific user, verify friendship
    if (dto.sharedWithId && !dto.isPublic) {
      if (profile.shareWithFriendsOnly) {
        const areFriends = await this.friendsService.areFriends(userId, dto.sharedWithId);
        if (!areFriends) {
          throw new BadRequestException('Can only share location with friends');
        }
      }
    }

    // Cleanup expired shares before creating new one
    await this.cleanupExpiredShares();

    const expiresAt = dto.expiresInMinutes
      ? new Date(Date.now() + dto.expiresInMinutes * 60 * 1000)
      : null;

    const point: Point = {
      type: 'Point',
      coordinates: [dto.coordinates.longitude, dto.coordinates.latitude],
    };

    const share = this.locationSharesRepository.create({
      sharerId: userId,
      sharedWithId: dto.isPublic ? null : dto.sharedWithId || null,
      coordinates: point,
      expiresAt,
    });

    return this.locationSharesRepository.save(share);
  }

  async getSharesSharedWithMe(userId: string): Promise<LocationShare[]> {
    // Get public shares and shares specifically with this user
    const shares = await this.locationSharesRepository.find({
      where: [
        { sharedWithId: userId },
        { sharedWithId: null }, // Public shares
      ],
      relations: ['sharer'],
      order: { createdAt: 'DESC' },
    });

    // Filter out expired shares
    const now = new Date();
    return shares.filter((share) => !share.expiresAt || share.expiresAt > now);
  }

  async getMyActiveShares(userId: string): Promise<LocationShare[]> {
    return this.locationSharesRepository.find({
      where: { sharerId: userId },
      relations: ['sharedWith'],
      order: { createdAt: 'DESC' },
    });
  }

  async stopShare(userId: string, shareId: string): Promise<void> {
    const share = await this.locationSharesRepository.findOne({
      where: { id: shareId, sharerId: userId },
    });

    if (!share) {
      throw new NotFoundException('Location share not found');
    }

    await this.locationSharesRepository.remove(share);
  }

  async cleanupExpiredShares(): Promise<void> {
    const now = new Date();
    await this.locationSharesRepository.delete({
      expiresAt: LessThan(now),
    });
  }
}
