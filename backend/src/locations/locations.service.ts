import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Point } from 'geojson';
import { SavedLocation } from './entities/saved-location.entity';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(SavedLocation)
    private locationsRepository: Repository<SavedLocation>,
  ) {}

  async create(userId: string, createLocationDto: CreateLocationDto): Promise<SavedLocation> {
    const location = this.locationsRepository.create({
      userId,
      name: createLocationDto.name,
      category: createLocationDto.category,
      coordinates: {
        type: 'Point',
        coordinates: [
          createLocationDto.coordinates.longitude,
          createLocationDto.coordinates.latitude,
        ],
      } as Point,
    });
    return this.locationsRepository.save(location);
  }

  async findAll(userId: string): Promise<SavedLocation[]> {
    return this.locationsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<SavedLocation> {
    const location = await this.locationsRepository.findOne({
      where: { id, userId },
    });
    if (!location) {
      throw new NotFoundException(`Location with ID ${id} not found`);
    }
    return location;
  }

  async update(
    id: string,
    userId: string,
    updateLocationDto: UpdateLocationDto,
  ): Promise<SavedLocation> {
    const location = await this.findOne(id, userId);
    if (updateLocationDto.name) {
      location.name = updateLocationDto.name;
    }
    if (updateLocationDto.category !== undefined) {
      location.category = updateLocationDto.category;
    }
    if (updateLocationDto.coordinates) {
      location.coordinates = {
        type: 'Point',
        coordinates: [
          updateLocationDto.coordinates.longitude,
          updateLocationDto.coordinates.latitude,
        ],
      } as Point;
    }
    return this.locationsRepository.save(location);
  }

  async remove(id: string, userId: string): Promise<void> {
    const location = await this.findOne(id, userId);
    await this.locationsRepository.remove(location);
  }
}

