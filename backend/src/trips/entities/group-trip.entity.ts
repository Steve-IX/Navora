import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { TripParticipant } from './trip-participant.entity';
import { TripWaypoint } from './trip-waypoint.entity';

export enum TripStatus {
  PLANNING = 'planning',
  ACTIVE = 'active',
  COMPLETED = 'completed',
}

@Entity('group_trips')
export class GroupTrip {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ name: 'organizer_id' })
  organizerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizer_id' })
  organizer: User;

  @Column({ name: 'route_data', type: 'jsonb', nullable: true })
  routeData: any;

  @Column({
    type: 'enum',
    enum: TripStatus,
    default: TripStatus.PLANNING,
  })
  status: TripStatus;

  @Column({ name: 'start_date', nullable: true })
  startDate: Date | null;

  @Column({ name: 'end_date', nullable: true })
  endDate: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => TripParticipant, (participant) => participant.trip)
  participants: TripParticipant[];

  @OneToMany(() => TripWaypoint, (waypoint) => waypoint.trip)
  waypoints: TripWaypoint[];
}

