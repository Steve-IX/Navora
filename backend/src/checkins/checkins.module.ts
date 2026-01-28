import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheckInsController } from './checkins.controller';
import { CheckInsService } from './checkins.service';
import { CheckIn } from './entities/check-in.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CheckIn])],
  controllers: [CheckInsController],
  providers: [CheckInsService],
  exports: [CheckInsService],
})
export class CheckInsModule {}
