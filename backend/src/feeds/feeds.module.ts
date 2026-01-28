import { Module } from '@nestjs/common';
import { FeedsController } from './feeds.controller';
import { FeedsService } from './feeds.service';
import { CheckInsModule } from '../checkins/checkins.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { FriendsModule } from '../friends/friends.module';

@Module({
  imports: [CheckInsModule, ReviewsModule, FriendsModule],
  controllers: [FeedsController],
  providers: [FeedsService],
  exports: [FeedsService],
})
export class FeedsModule {}
