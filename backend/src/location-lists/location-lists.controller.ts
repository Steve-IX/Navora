import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LocationListsService } from './location-lists.service';
import { CreateListDto } from './dto/create-list.dto';
import { AddWaypointDto } from '../trips/dto/add-waypoint.dto';

@Controller('lists')
@UseGuards(JwtAuthGuard)
export class LocationListsController {
  constructor(private readonly locationListsService: LocationListsService) {}

  @Post()
  async createList(@Request() req, @Body() dto: CreateListDto) {
    return this.locationListsService.createList(req.user.id, dto);
  }

  @Get()
  async getMyLists(@Request() req) {
    return this.locationListsService.getMyLists(req.user.id);
  }

  @Get('public')
  async getPublicLists() {
    return this.locationListsService.getPublicLists();
  }

  @Get(':id')
  async getList(@Request() req, @Param('id') id: string) {
    return this.locationListsService.getList(id, req.user.id);
  }

  @Post(':id/items')
  async addItem(@Request() req, @Param('id') id: string, @Body() dto: AddWaypointDto) {
    return this.locationListsService.addItem(id, req.user.id, dto);
  }

  @Delete(':id/items/:itemId')
  async removeItem(@Request() req, @Param('id') id: string, @Param('itemId') itemId: string) {
    await this.locationListsService.removeItem(id, req.user.id, itemId);
    return { message: 'Item removed' };
  }

  @Delete(':id')
  async deleteList(@Request() req, @Param('id') id: string) {
    await this.locationListsService.deleteList(id, req.user.id);
    return { message: 'List deleted' };
  }
}

