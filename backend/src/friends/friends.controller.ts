import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FriendsService } from './friends.service';
import { CreateFriendRequestDto } from './dto/create-friend-request.dto';

@Controller('friends')
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Get()
  async getFriends(@Request() req) {
    return this.friendsService.getFriends(req.user.id);
  }

  @Get('requests')
  async getFriendRequests(@Request() req, @Query('type') type?: 'sent' | 'received') {
    return this.friendsService.getFriendRequests(req.user.id, type || 'received');
  }

  @Post('request')
  async sendFriendRequest(@Request() req, @Body() dto: CreateFriendRequestDto) {
    return this.friendsService.sendFriendRequest(req.user.id, dto);
  }

  @Post('accept/:id')
  async acceptFriendRequest(@Request() req, @Param('id') id: string) {
    return this.friendsService.acceptFriendRequest(req.user.id, id);
  }

  @Post('decline/:id')
  async declineFriendRequest(@Request() req, @Param('id') id: string) {
    await this.friendsService.declineFriendRequest(req.user.id, id);
    return { message: 'Friend request declined' };
  }

  @Delete(':id')
  async removeFriend(@Request() req, @Param('id') id: string) {
    await this.friendsService.removeFriend(req.user.id, id);
    return { message: 'Friend removed' };
  }
}

