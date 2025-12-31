import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SharedLocationList } from './entities/shared-location-list.entity';
import { LocationListItem } from './entities/location-list-item.entity';
import { CreateListDto } from './dto/create-list.dto';
import { AddWaypointDto } from '../trips/dto/add-waypoint.dto';
import { Point } from 'geojson';

@Injectable()
export class LocationListsService {
  constructor(
    @InjectRepository(SharedLocationList)
    private listsRepository: Repository<SharedLocationList>,
    @InjectRepository(LocationListItem)
    private itemsRepository: Repository<LocationListItem>,
  ) {}

  async createList(userId: string, dto: CreateListDto): Promise<SharedLocationList> {
    const list = this.listsRepository.create({
      userId,
      name: dto.name,
      description: dto.description,
      isPublic: dto.isPublic || false,
    });

    return this.listsRepository.save(list);
  }

  async getMyLists(userId: string): Promise<SharedLocationList[]> {
    return this.listsRepository.find({
      where: { userId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }

  async getPublicLists(limit: number = 50): Promise<SharedLocationList[]> {
    return this.listsRepository.find({
      where: { isPublic: true },
      relations: ['user', 'items'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getList(listId: string, userId?: string): Promise<SharedLocationList> {
    const list = await this.listsRepository.findOne({
      where: { id: listId },
      relations: ['user', 'items'],
      order: { items: { orderIndex: 'ASC' } },
    });

    if (!list) {
      throw new NotFoundException('List not found');
    }

    if (!list.isPublic && list.userId !== userId) {
      throw new NotFoundException('List not found');
    }

    return list;
  }

  async addItem(listId: string, userId: string, dto: AddWaypointDto): Promise<LocationListItem> {
    const list = await this.listsRepository.findOne({
      where: { id: listId, userId },
    });

    if (!list) {
      throw new NotFoundException('List not found');
    }

    const point: Point = {
      type: 'Point',
      coordinates: [dto.coordinates.longitude, dto.coordinates.latitude],
    };

    const maxOrder = await this.itemsRepository
      .createQueryBuilder('item')
      .where('item.listId = :listId', { listId })
      .select('MAX(item.orderIndex)', 'max')
      .getRawOne();

    const orderIndex = dto.orderIndex ?? (maxOrder?.max ?? -1) + 1;

    const item = this.itemsRepository.create({
      listId,
      coordinates: point,
      name: dto.name,
      description: dto.notes,
      orderIndex,
    });

    return this.itemsRepository.save(item);
  }

  async removeItem(listId: string, userId: string, itemId: string): Promise<void> {
    const list = await this.listsRepository.findOne({
      where: { id: listId, userId },
    });

    if (!list) {
      throw new NotFoundException('List not found');
    }

    const item = await this.itemsRepository.findOne({
      where: { id: itemId, listId },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    await this.itemsRepository.remove(item);
  }

  async deleteList(listId: string, userId: string): Promise<void> {
    const list = await this.listsRepository.findOne({
      where: { id: listId, userId },
    });

    if (!list) {
      throw new NotFoundException('List not found');
    }

    await this.listsRepository.remove(list);
  }
}

