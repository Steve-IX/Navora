import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocationSharesController } from './location-shares.controller';
import { LocationSharesService } from './location-shares.service';
import { LocationShare } from './entities/location-share.entity';
import { FriendsModule } from '../friends/friends.module';
import { ProfilesModule } from '../profiles/profiles.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LocationShare]),
    FriendsModule,
    ProfilesModule,
  ],
  controllers: [LocationSharesController],
  providers: [LocationSharesService],
  exports: [LocationSharesService],
})
export class LocationSharesModule {}

