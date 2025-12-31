import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GroupTrip, TripStatus } from './entities/group-trip.entity';
import { TripParticipant, ParticipantStatus, ParticipantRole } from './entities/trip-participant.entity';
import { TripWaypoint } from './entities/trip-waypoint.entity';
import { CreateTripDto } from './dto/create-trip.dto';
import { AddWaypointDto } from './dto/add-waypoint.dto';
import { Point } from 'geojson';

@Injectable()
export class TripsService {
  constructor(
    @InjectRepository(GroupTrip)
    private tripsRepository: Repository<GroupTrip>,
    @InjectRepository(TripParticipant)
    private participantsRepository: Repository<TripParticipant>,
    @InjectRepository(TripWaypoint)
    private waypointsRepository: Repository<TripWaypoint>,
  ) {}

  async createTrip(userId: string, dto: CreateTripDto): Promise<GroupTrip> {
    const trip = this.tripsRepository.create({
      name: dto.name,
      organizerId: userId,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      status: TripStatus.PLANNING,
    });

    const savedTrip = await this.tripsRepository.save(trip);

    // Add organizer as participant
    await this.participantsRepository.save({
      tripId: savedTrip.id,
      userId,
      role: ParticipantRole.ORGANIZER,
      status: ParticipantStatus.ACCEPTED,
    });

    return this.tripsRepository.findOne({
      where: { id: savedTrip.id },
      relations: ['organizer', 'participants', 'participants.user', 'waypoints'],
    }) as Promise<GroupTrip>;
  }

  async getMyTrips(userId: string): Promise<GroupTrip[]> {
    try {
      const participants = await this.participantsRepository.find({
        where: { userId },
        relations: ['trip', 'trip.organizer'],
      });

      const tripIds = participants.map((p) => p.tripId);
      if (tripIds.length === 0) {
        return [];
      }

      return this.tripsRepository.find({
        where: tripIds.map((id) => ({ id })),
        relations: ['organizer', 'participants', 'participants.user', 'waypoints'],
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      console.error('Error getting trips:', error);
      // Return empty array if tables don't exist yet
      return [];
    }
  }

  async getTrip(userId: string, tripId: string): Promise<GroupTrip> {
    // Check if user is participant
    const participant = await this.participantsRepository.findOne({
      where: { tripId, userId },
    });

    if (!participant) {
      throw new NotFoundException('Trip not found or access denied');
    }

    const trip = await this.tripsRepository.findOne({
      where: { id: tripId },
      relations: ['organizer', 'participants', 'participants.user', 'waypoints', 'waypoints.addedBy'],
      order: { waypoints: { orderIndex: 'ASC' } },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    return trip;
  }

  async inviteParticipant(tripId: string, organizerId: string, userId: string): Promise<TripParticipant> {
    const trip = await this.tripsRepository.findOne({
      where: { id: tripId, organizerId },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found or you are not the organizer');
    }

    // Check if already participant
    const existing = await this.participantsRepository.findOne({
      where: { tripId, userId },
    });

    if (existing) {
      throw new BadRequestException('User is already a participant');
    }

    const participant = this.participantsRepository.create({
      tripId,
      userId,
      role: ParticipantRole.MEMBER,
      status: ParticipantStatus.INVITED,
    });

    return this.participantsRepository.save(participant);
  }

  async addWaypoint(tripId: string, userId: string, dto: AddWaypointDto): Promise<TripWaypoint> {
    // Check if user is participant
    const participant = await this.participantsRepository.findOne({
      where: { tripId, userId, status: ParticipantStatus.ACCEPTED },
    });

    if (!participant) {
      throw new NotFoundException('Trip not found or access denied');
    }

    const point: Point = {
      type: 'Point',
      coordinates: [dto.coordinates.longitude, dto.coordinates.latitude],
    };

    // Get max order index
    const maxOrder = await this.waypointsRepository
      .createQueryBuilder('waypoint')
      .where('waypoint.tripId = :tripId', { tripId })
      .select('MAX(waypoint.orderIndex)', 'max')
      .getRawOne();

    const orderIndex = dto.orderIndex ?? (maxOrder?.max ?? -1) + 1;

    const waypoint = this.waypointsRepository.create({
      tripId,
      addedById: userId,
      coordinates: point,
      name: dto.name,
      notes: dto.notes,
      orderIndex,
    });

    return this.waypointsRepository.save(waypoint);
  }

  async removeWaypoint(tripId: string, userId: string, waypointId: string): Promise<void> {
    // Check if user is participant
    const participant = await this.participantsRepository.findOne({
      where: { tripId, userId },
    });

    if (!participant) {
      throw new NotFoundException('Trip not found or access denied');
    }

    const waypoint = await this.waypointsRepository.findOne({
      where: { id: waypointId, tripId },
    });

    if (!waypoint) {
      throw new NotFoundException('Waypoint not found');
    }

    await this.waypointsRepository.remove(waypoint);
  }

  async updateTripStatus(tripId: string, organizerId: string, status: TripStatus): Promise<GroupTrip> {
    const trip = await this.tripsRepository.findOne({
      where: { id: tripId, organizerId },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found or you are not the organizer');
    }

    trip.status = status;
    return this.tripsRepository.save(trip);
  }
}

