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
import { SharedLocationList } from './shared-location-list.entity';

@Entity('location_list_items')
@Index(['listId', 'orderIndex'])
export class LocationListItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'list_id' })
  listId: string;

  @ManyToOne(() => SharedLocationList, (list) => list.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'list_id' })
  list: SharedLocationList;

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
  description: string;

  @Column({ name: 'order_index' })
  orderIndex: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

