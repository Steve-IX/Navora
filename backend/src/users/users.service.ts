import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { ProfilesService } from '../profiles/profiles.service';
import { FriendsService } from '../friends/friends.service';
import { isGuestUserId } from '../common/utils/user.utils';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private profilesService: ProfilesService,
    private friendsService: FriendsService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = this.usersRepository.create({
      email: createUserDto.email,
      passwordHash: hashedPassword,
    });
    return this.usersRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.findByEmail(email);
    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async searchUsers(query: string, currentUserId: string) {
    // Don't search if query is too short
    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchTerm = `%${query.trim().toLowerCase()}%`;

    try {
      // Search users by email or display name
      // Using raw query to join with profiles table
      const users = await this.usersRepository
        .createQueryBuilder('user')
        .leftJoin('user_profiles', 'profile', 'profile.user_id = user.id')
        .where(
          '(LOWER(user.email) LIKE :searchTerm OR LOWER(profile.display_name) LIKE :searchTerm)',
          { searchTerm },
        )
        .andWhere('user.id != :currentUserId', { currentUserId })
        .andWhere("CAST(user.id AS TEXT) NOT LIKE 'guest_%'")
        .limit(20)
        .getMany();

      // Get existing friendships to filter out already-friended users
      const friends = await this.friendsService.getFriends(currentUserId);
      const friendIds = new Set(friends.map((f) => f.friend.id));

      // Get profiles for display names and avatars
      const results = await Promise.all(
        users
          .filter((user) => !friendIds.has(user.id))
          .map(async (user) => {
            const profile = await this.profilesService.getProfileByUserId(user.id);
            return {
              id: user.id,
              email: user.email,
              displayName: profile?.displayName || null,
              avatarUrl: profile?.avatarUrl || null,
            };
          }),
      );

      return results;
    } catch (error) {
      console.error('Error searching users:', error);
      // Fallback to email-only search if join fails
      const users = await this.usersRepository
        .createQueryBuilder('user')
        .where('LOWER(user.email) LIKE :searchTerm', { searchTerm })
        .andWhere('user.id != :currentUserId', { currentUserId })
        .andWhere("CAST(user.id AS TEXT) NOT LIKE 'guest_%'")
        .limit(20)
        .getMany();

      const friends = await this.friendsService.getFriends(currentUserId);
      const friendIds = new Set(friends.map((f) => f.friend.id));

      return Promise.all(
        users
          .filter((user) => !friendIds.has(user.id))
          .map(async (user) => {
            const profile = await this.profilesService.getProfileByUserId(user.id);
            return {
              id: user.id,
              email: user.email,
              displayName: profile?.displayName || null,
              avatarUrl: profile?.avatarUrl || null,
            };
          }),
      );
    }
  }
}
