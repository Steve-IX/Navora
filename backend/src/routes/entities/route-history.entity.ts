import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { LineString } from 'geojson';
import { User } from '../../users/entities/user.entity';

@Entity('route_history')
export class RouteHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.routeHistory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'geography',
    spatialFeatureType: 'LineString',
    srid: 4326,
  })
  waypoints: LineString;

  @Column('decimal', { precision: 10, scale: 2 })
  distance: number; // in meters

  @Column('integer')
  duration: number; // in seconds

  @Column()
  mode: string; // driving, walking, cycling, transit

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

