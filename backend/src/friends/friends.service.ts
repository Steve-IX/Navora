import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Friendship, FriendshipStatus } from './entities/friendship.entity';
import { CreateFriendRequestDto } from './dto/create-friend-request.dto';
import { ProfilesService } from '../profiles/profiles.service';
import { isGuestUserId } from '../common/utils/user.utils';

@Injectable()
export class FriendsService {
  constructor(
    @InjectRepository(Friendship)
    private friendshipsRepository: Repository<Friendship>,
    private profilesService: ProfilesService,
  ) {}

  async sendFriendRequest(userId: string, dto: CreateFriendRequestDto): Promise<Friendship> {
    // Guest users cannot send friend requests
    if (isGuestUserId(userId) || isGuestUserId(dto.addresseeId)) {
      throw new BadRequestException('Guest users cannot send friend requests');
    }
    if (userId === dto.addresseeId) {
      throw new BadRequestException('Cannot send friend request to yourself');
    }

    // Check if friendship already exists
    const existing = await this.friendshipsRepository.findOne({
      where: [
        { requesterId: userId, addresseeId: dto.addresseeId },
        { requesterId: dto.addresseeId, addresseeId: userId },
      ],
    });

    if (existing) {
      if (existing.status === FriendshipStatus.ACCEPTED) {
        throw new ConflictException('Already friends');
      }
      if (existing.status === FriendshipStatus.PENDING) {
        if (existing.requesterId === userId) {
          throw new ConflictException('Friend request already sent');
        } else {
          // Auto-accept if the other person requested
          existing.status = FriendshipStatus.ACCEPTED;
          return this.friendshipsRepository.save(existing);
        }
      }
      if (existing.status === FriendshipStatus.BLOCKED) {
        throw new BadRequestException('Cannot send friend request');
      }
    }

    const friendship = this.friendshipsRepository.create({
      requesterId: userId,
      addresseeId: dto.addresseeId,
      status: FriendshipStatus.PENDING,
    });

    return this.friendshipsRepository.save(friendship);
  }

  async acceptFriendRequest(userId: string, requestId: string): Promise<Friendship> {
    const friendship = await this.friendshipsRepository.findOne({
      where: { id: requestId, addresseeId: userId, status: FriendshipStatus.PENDING },
      relations: ['requester', 'addressee'],
    });

    if (!friendship) {
      throw new NotFoundException('Friend request not found');
    }

    friendship.status = FriendshipStatus.ACCEPTED;
    return this.friendshipsRepository.save(friendship);
  }

  async declineFriendRequest(userId: string, requestId: string): Promise<void> {
    const friendship = await this.friendshipsRepository.findOne({
      where: { id: requestId, addresseeId: userId, status: FriendshipStatus.PENDING },
    });

    if (!friendship) {
      throw new NotFoundException('Friend request not found');
    }

    await this.friendshipsRepository.remove(friendship);
  }

  async getFriends(userId: string) {
    // Guest users have no friends
    if (isGuestUserId(userId)) {
      return [];
    }

    try {
      const friendships = await this.friendshipsRepository.find({
        where: [
          { requesterId: userId, status: FriendshipStatus.ACCEPTED },
          { addresseeId: userId, status: FriendshipStatus.ACCEPTED },
        ],
        relations: ['requester', 'addressee'],
      });

      return friendships.map((friendship) => {
        const friend = friendship.requesterId === userId ? friendship.addressee : friendship.requester;
        return {
          id: friendship.id,
          friendshipId: friendship.id,
          friend: {
            id: friend?.id || '',
            email: friend?.email || 'Unknown',
          },
          createdAt: friendship.createdAt,
        };
      });
    } catch (error) {
      console.error('Error getting friends:', error);
      // Return empty array if table doesn't exist yet
      return [];
    }
  }

  async getFriendRequests(userId: string, type: 'sent' | 'received' = 'received') {
    // Guest users have no friend requests
    if (isGuestUserId(userId)) {
      return [];
    }

    const where =
      type === 'received'
        ? { addresseeId: userId, status: FriendshipStatus.PENDING }
        : { requesterId: userId, status: FriendshipStatus.PENDING };

    const friendships = await this.friendshipsRepository.find({
      where,
      relations: ['requester', 'addressee'],
      order: { createdAt: 'DESC' },
    });

    return friendships.map((friendship) => {
      const otherUser = type === 'received' ? friendship.requester : friendship.addressee;
      return {
        id: friendship.id,
        user: {
          id: otherUser.id,
          email: otherUser.email,
        },
        createdAt: friendship.createdAt,
      };
    });
  }

  async removeFriend(userId: string, friendshipId: string): Promise<void> {
    const friendship = await this.friendshipsRepository.findOne({
      where: [
        { id: friendshipId, requesterId: userId },
        { id: friendshipId, addresseeId: userId },
      ],
    });

    if (!friendship) {
      throw new NotFoundException('Friendship not found');
    }

    await this.friendshipsRepository.remove(friendship);
  }

  async areFriends(userId1: string, userId2: string): Promise<boolean> {
    // Guest users cannot be friends
    if (isGuestUserId(userId1) || isGuestUserId(userId2)) {
      return false;
    }

    const friendship = await this.friendshipsRepository.findOne({
      where: [
        { requesterId: userId1, addresseeId: userId2, status: FriendshipStatus.ACCEPTED },
        { requesterId: userId2, addresseeId: userId1, status: FriendshipStatus.ACCEPTED },
      ],
    });

    return !!friendship;
  }
}

