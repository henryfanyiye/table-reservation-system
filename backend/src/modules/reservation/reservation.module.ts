import { Module } from '@nestjs/common';
import { ReservationRepository } from './repositories/reservation.repository';
import { ReservationService } from './reservation.service';
import { ReservationResolver } from './resolvers/reservation.resolver';
import { StoreModule } from '../store/store.module';
import { SmsModule } from '../sms/sms.module';
import { DatabaseModule } from '@common/database/database.module';

@Module({
  imports: [
    DatabaseModule,
    StoreModule,
    SmsModule,
  ],
  providers: [ReservationRepository, ReservationService, ReservationResolver],
  exports: [ReservationRepository, ReservationService],
})
export class ReservationModule {}
