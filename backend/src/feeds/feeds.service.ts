import { Injectable } from '@nestjs/common';
import { CheckInsService } from '../checkins/checkins.service';
import { ReviewsService } from '../reviews/reviews.service';
import { FriendsService } from '../friends/friends.service';

export interface FeedItem {
  type: 'checkin' | 'review';
  id: string;
  userId: string;
  userName: string;
  timestamp: Date;
  data: any;
}

@Injectable()
export class FeedsService {
  constructor(
    private checkInsService: CheckInsService,
    private reviewsService: ReviewsService,
    private friendsService: FriendsService,
  ) {}

  async getSocialFeed(userId: string, limit: number = 50): Promise<FeedItem[]> {
    try {
      // Get user's friends
      const friends = await this.friendsService.getFriends(userId);
      const friendIds = friends.map((f) => f.friend.id).filter((id) => id);

      if (friendIds.length === 0) {
        return [];
      }

      // Get friend check-ins and reviews
      const [checkIns, reviews] = await Promise.all([
        this.checkInsService.getFriendCheckIns(friendIds, limit).catch(() => []),
        // For reviews, we'd need a similar method or query
        Promise.resolve([]),
      ]);

      // Combine and sort by timestamp
      const feedItems: FeedItem[] = [
        ...checkIns.map((checkIn) => ({
          type: 'checkin' as const,
          id: checkIn.id,
          userId: checkIn.userId,
          userName: checkIn.user?.email || 'Unknown',
          timestamp: checkIn.createdAt,
          data: {
            placeName: checkIn.placeName,
            coordinates: {
              longitude: checkIn.coordinates.coordinates[0],
              latitude: checkIn.coordinates.coordinates[1],
            },
            note: checkIn.note,
          },
        })),
      ];

      // Sort by timestamp descending
      feedItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      return feedItems.slice(0, limit);
    } catch (error) {
      console.error('Error getting social feed:', error);
      return [];
    }
  }
}
