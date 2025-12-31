import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocationListsController } from './location-lists.controller';
import { LocationListsService } from './location-lists.service';
import { SharedLocationList } from './entities/shared-location-list.entity';
import { LocationListItem } from './entities/location-list-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SharedLocationList, LocationListItem])],
  controllers: [LocationListsController],
  providers: [LocationListsService],
  exports: [LocationListsService],
})
export class LocationListsModule {}

