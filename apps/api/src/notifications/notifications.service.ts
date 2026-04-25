import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  publishInternalEvent(topic: string, payload: Record<string, unknown>) {
    this.logger.log(
      `Notification-ready event emitted: ${topic} ${JSON.stringify(payload)}`,
    );
  }
}
