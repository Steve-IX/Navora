import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { SavedLocation } from '../../locations/entities/saved-location.entity';
import { RouteHistory } from '../../routes/entities/route-history.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => SavedLocation, (location) => location.user)
  savedLocations: SavedLocation[];

  @OneToMany(() => RouteHistory, (route) => route.user)
  routeHistory: RouteHistory[];
}
