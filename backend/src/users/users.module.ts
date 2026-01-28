import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { ProfilesModule } from '../profiles/profiles.module';
import { FriendsModule } from '../friends/friends.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), ProfilesModule, FriendsModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
