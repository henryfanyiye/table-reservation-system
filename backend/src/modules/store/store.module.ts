import { Module } from '@nestjs/common';
import { StoreRepository } from './repositories/store.repository';
import { StoreService } from './store.service';
import { StoreResolver } from './resolvers/store.resolver';
import { DatabaseModule } from '@common/database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [StoreRepository, StoreService, StoreResolver],
  exports: [StoreRepository, StoreService],
})
export class StoreModule {}
