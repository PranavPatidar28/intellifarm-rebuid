import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { validateEnv } from './common/config/env.validation';
import { AppController } from './app.controller';
import { AlertsModule } from './alerts/alerts.module';
import { AssistantModule } from './assistant/assistant.module';
import { AuthModule } from './auth/auth.module';
import { CropSeasonsModule } from './crop-seasons/crop-seasons.module';
import { CropCatalogModule } from './crop-catalog/crop-catalog.module';
import { CommunityModule } from './community/community.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DiseaseReportsModule } from './disease-reports/disease-reports.module';
import { DevicesModule } from './devices/devices.module';
import { ExpensesModule } from './expenses/expenses.module';
import { FacilitiesModule } from './facilities/facilities.module';
import { FarmsModule } from './farms/farms.module';
import { MarketsModule } from './markets/markets.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PredictionsModule } from './predictions/predictions.module';
import { PrismaModule } from './prisma/prisma.module';
import { RulesEngineModule } from './rules-engine/rules-engine.module';
import { SchemesModule } from './schemes/schemes.module';
import { StorageModule } from './storage/storage.module';
import { TasksModule } from './tasks/tasks.module';
import { UsersModule } from './users/users.module';
import { WeatherModule } from './weather/weather.module';
import { AdminModule } from './admin/admin.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 120,
      },
    ]),
    ScheduleModule.forRoot(),
    PrismaModule,
    StorageModule,
    NotificationsModule,
    AssistantModule,
    AuthModule,
    UsersModule,
    FarmsModule,
    CropCatalogModule,
    CropSeasonsModule,
    CommunityModule,
    RulesEngineModule,
    PredictionsModule,
    TasksModule,
    AlertsModule,
    WeatherModule,
    DashboardModule,
    DevicesModule,
    ExpensesModule,
    FacilitiesModule,
    DiseaseReportsModule,
    MarketsModule,
    SchemesModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
