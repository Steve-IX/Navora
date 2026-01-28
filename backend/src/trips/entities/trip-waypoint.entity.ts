import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Point } from 'geojson';
import { GroupTrip } from './group-trip.entity';
import { User } from '../../users/entities/user.entity';

@Entity('trip_waypoints')
@Index(['tripId', 'orderIndex'])
export class TripWaypoint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'trip_id' })
  tripId: string;

  @ManyToOne(() => GroupTrip, (trip) => trip.waypoints, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_id' })
  trip: GroupTrip;

  @Column({ name: 'added_by_id' })
  addedById: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'added_by_id' })
  addedBy: User;

  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  @Index({ spatial: true })
  coordinates: Point;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'order_index' })
  orderIndex: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
