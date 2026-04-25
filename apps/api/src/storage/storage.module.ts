import { Global, Module } from '@nestjs/common';

import { LegacyUploadsController } from './legacy-uploads.controller';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';

@Global()
@Module({
  controllers: [StorageController, LegacyUploadsController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
