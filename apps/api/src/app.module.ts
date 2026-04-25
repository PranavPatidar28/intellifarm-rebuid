import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { AppController } from './app.controller';
import { AlertsModule } from './alerts/alerts.module';
import { AssistantModule } from './assistant/assistant.module';
import { AuthModule } from './auth/auth.module';
import { CropSeasonsModule } from './crop-seasons/crop-seasons.module';
import { CropCatalogModule } from './crop-catalog/crop-catalog.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DiseaseReportsModule } from './disease-reports/disease-reports.module';
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
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    StorageModule,
    NotificationsModule,
    AuthModule,
    UsersModule,
    FarmsModule,
    CropCatalogModule,
    CropSeasonsModule,
    RulesEngineModule,
    PredictionsModule,
    TasksModule,
    AlertsModule,
    WeatherModule,
    DashboardModule,
    FacilitiesModule,
    DiseaseReportsModule,
    MarketsModule,
    SchemesModule,
    AssistantModule,
    AdminModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
