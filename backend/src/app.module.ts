import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { AppController } from './app.controller';
import { DatabaseModule } from '@common/database/database.module';
import { LoggerModule } from '@common/logger/logger.module';
import { RedisModule } from '@common/redis/redis.module';
import { StoreModule } from './modules/store/store.module';
import { AuthModule } from './modules/auth/auth.module';
import { SmsModule } from './modules/sms/sms.module';
import { ReservationModule } from './modules/reservation/reservation.module';
import { JSONScalar } from '@common/graphql/scalars/json.scalar';
import { DateTimeScalar } from '@common/graphql/scalars/date-time.scalar';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `.env.${process.env.NODE_ENV || 'development'}`
      ],
    }),
    ScheduleModule.forRoot(),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'schema.gql'),
      sortSchema: true,
      playground: true,
      debug: true,
      introspection: true,
    }),
    DatabaseModule,
    LoggerModule,
    RedisModule.registerAsync(), // 统一的 Redis 模块
    StoreModule,
    AuthModule,
    SmsModule,
    ReservationModule,
  ],
  controllers: [AppController],
  providers: [JSONScalar, DateTimeScalar],
})
export class AppModule {
}
