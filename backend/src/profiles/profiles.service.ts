import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfile } from './entities/user-profile.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(UserProfile)
    private profilesRepository: Repository<UserProfile>,
  ) {}

  async createProfile(userId: string): Promise<UserProfile> {
    const profile = this.profilesRepository.create({
      userId,
      displayName: null,
      locationSharingEnabled: false,
      shareWithFriendsOnly: true,
    });
    return this.profilesRepository.save(profile);
  }

  async getProfile(userId: string): Promise<UserProfile> {
    const profile = await this.profilesRepository.findOne({
      where: { userId },
      relations: ['user'],
    });

    if (!profile) {
      // Create profile if it doesn't exist
      return this.createProfile(userId);
    }

    return profile;
  }

  async updateProfile(userId: string, updateDto: UpdateProfileDto): Promise<UserProfile> {
    let profile = await this.profilesRepository.findOne({
      where: { userId },
    });

    if (!profile) {
      profile = await this.createProfile(userId);
    }

    Object.assign(profile, updateDto);
    return this.profilesRepository.save(profile);
  }

  async getProfileByUserId(userId: string): Promise<UserProfile | null> {
    return this.profilesRepository.findOne({
      where: { userId },
      relations: ['user'],
    });
  }
}

