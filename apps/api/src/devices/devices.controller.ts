import {
  Body,
  Controller,
  Get,
  Headers,
  Patch,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import {
  ingestTelemetrySchema,
  issuePumpCommandSchema,
  updateDeviceSettingsSchema,
} from '@intellifarm/contracts';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import type { AuthUser } from '../common/types/authenticated-request';
import { parseWithSchema } from '../common/utils/zod.util';
import { DevicesService } from './devices.service';

@ApiTags('devices')
@Controller()
export class DeviceIngestController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('devices/ingest')
  ingest(
    @Headers('x-device-key') deviceKey: string | undefined,
    @Body() body: unknown,
  ) {
    return this.devicesService.ingestTelemetry(
      deviceKey,
      parseWithSchema(ingestTelemetrySchema, body),
    );
  }
}

@ApiTags('devices')
@UseGuards(AuthGuard)
@Controller('farm-plots')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get(':id/device')
  getPlotDevice(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.devicesService.getPlotDevice(user.sub, id);
  }

  @Patch(':id/device/settings')
  updateDeviceSettings(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.devicesService.updateDeviceSettings(
      user.sub,
      id,
      parseWithSchema(updateDeviceSettingsSchema, body),
    );
  }

  @Post(':id/pump/commands')
  issuePumpCommand(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.devicesService.issuePumpCommand(
      user.sub,
      id,
      parseWithSchema(issuePumpCommandSchema, body),
    );
  }
}
