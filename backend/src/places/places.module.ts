import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PlacesService } from './places.service';
import { PlacesController } from './places.controller';

@Module({
  imports: [HttpModule],
  controllers: [PlacesController],
  providers: [PlacesService],
  exports: [PlacesService],
})
export class PlacesModule {}
