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
import { User } from '../../users/entities/user.entity';

@Entity('location_shares')
@Index(['sharerId', 'sharedWithId'])
@Index(['expiresAt'])
export class LocationShare {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sharer_id' })
  sharerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sharer_id' })
  sharer: User;

  @Column({ name: 'shared_with_id', nullable: true })
  sharedWithId: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'shared_with_id' })
  sharedWith: User | null;

  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  @Index({ spatial: true })
  coordinates: Point;

  @Column({ name: 'expires_at', nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

