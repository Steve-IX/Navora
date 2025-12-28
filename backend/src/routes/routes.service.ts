import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LineString } from 'geojson';
import { RouteHistory } from './entities/route-history.entity';
import { CreateRouteDto } from './dto/create-route.dto';

@Injectable()
export class RoutesService {
  constructor(
    @InjectRepository(RouteHistory)
    private routesRepository: Repository<RouteHistory>,
  ) {}

  async create(userId: string, createRouteDto: CreateRouteDto): Promise<RouteHistory> {
    const route = this.routesRepository.create({
      userId,
      distance: createRouteDto.distance,
      duration: createRouteDto.duration,
      mode: createRouteDto.mode,
      waypoints: {
        type: 'LineString',
        coordinates: createRouteDto.waypoints.map((wp) => [wp.longitude, wp.latitude]),
      } as LineString,
    });
    return this.routesRepository.save(route);
  }

  async findAll(userId: string): Promise<RouteHistory[]> {
    return this.routesRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<RouteHistory> {
    const route = await this.routesRepository.findOne({
      where: { id, userId },
    });
    if (!route) {
      throw new NotFoundException(`Route with ID ${id} not found`);
    }
    return route;
  }

  async remove(id: string, userId: string): Promise<void> {
    const route = await this.findOne(id, userId);
    await this.routesRepository.remove(route);
  }
}

