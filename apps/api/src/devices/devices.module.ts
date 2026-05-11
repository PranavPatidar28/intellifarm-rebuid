import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import {
  DeviceIngestController,
  DevicesController,
} from './devices.controller';
import { DevicesService } from './devices.service';

@Module({
  imports: [NotificationsModule],
  controllers: [DeviceIngestController, DevicesController],
  providers: [DevicesService],
  exports: [DevicesService],
})
export class DevicesModule {}
