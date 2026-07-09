import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

import type { AssistantSessionContext } from './assistant.types';
import type { VoiceSessionRecord } from './voice.types';

type RateBucket = {
  count: number;
  resetAt: number;
};

@Injectable()
export class VoiceSessionStoreService {
  private readonly logger = new Logger(VoiceSessionStoreService.name);
  private readonly sessions = new Map<string, VoiceSessionRecord>();
  private readonly userBuckets = new Map<string, RateBucket>();
  private readonly ipBuckets = new Map<string, RateBucket>();

  constructor(private readonly configService: ConfigService) {}

  create(params: {
    userId: string;
    clientIp: string;
    preferredLanguage?: 'en' | 'hi';
    focusFarmPlotId?: string | null;
    focusCropSeasonId?: string | null;
    resumeSessionId?: string | null;
  }) {
    this.enforceRateLimit(params.userId, params.clientIp);
    this.enforceConcurrentCap(params.userId, params.resumeSessionId ?? null);

    if (params.resumeSessionId) {
      const existing = this.sessions.get(params.resumeSessionId);
      if (
        existing &&
        existing.userId === params.userId &&
        existing.state !== 'closed'
      ) {
        existing.updatedAt = Date.now();
        existing.preferredLanguage =
          params.preferredLanguage ?? existing.preferredLanguage;
        existing.focusFarmPlotId =
          params.focusFarmPlotId ?? existing.focusFarmPlotId;
        existing.focusCropSeasonId =
          params.focusCropSeasonId ?? existing.focusCropSeasonId;
        return existing;
      }
    }

    const now = Date.now();
    const record: VoiceSessionRecord = {
      id: randomUUID(),
      userId: params.userId,
      clientIp: params.clientIp,
      preferredLanguage: params.preferredLanguage ?? 'en',
      focusFarmPlotId: params.focusFarmPlotId ?? null,
      focusCropSeasonId: params.focusCropSeasonId ?? null,
      state: 'connecting',
      client: null,
      gemini: null,
      resumptionHandle: null,
      lastConsumedClientMessageIndex: null,
      disconnectTimer: null,
      pendingConfirmation: null,
      confirmedActionId: null,
      currentInputTranscript: '',
      currentOutputTranscript: '',
      currentToolsUsed: new Set<string>(),
      lastTurnSummary: null,
      createdAt: now,
      updatedAt: now,
    };

    this.sessions.set(record.id, record);
    return record;
  }

  get(id: string) {
    return this.sessions.get(id) ?? null;
  }

  getReconnectGraceSeconds() {
    return this.configService.get<number>('VOICE_RECONNECT_GRACE_SECONDS', 20);
  }

  toAssistantSession(record: VoiceSessionRecord): AssistantSessionContext {
    return {
      userId: record.userId,
      channel: 'VOICE',
      voiceSessionId: record.id,
      preferredLanguage: record.preferredLanguage,
      focusFarmPlotId: record.focusFarmPlotId,
      focusCropSeasonId: record.focusCropSeasonId,
      pendingConfirmation: record.pendingConfirmation,
    };
  }

  markUpdated(record: VoiceSessionRecord) {
    record.updatedAt = Date.now();
  }

  scheduleReconnectCleanup(record: VoiceSessionRecord, cleanup: () => void) {
    this.clearReconnectCleanup(record);
    const graceMs = this.getReconnectGraceSeconds() * 1000;
    record.disconnectTimer = setTimeout(() => {
      this.logger.log(`Closing expired voice session ${record.id}`);
      cleanup();
      this.close(record, 'reconnect_timeout');
    }, graceMs);
  }

  clearReconnectCleanup(record: VoiceSessionRecord) {
    if (record.disconnectTimer) {
      clearTimeout(record.disconnectTimer);
      record.disconnectTimer = null;
    }
  }

  close(record: VoiceSessionRecord, reason = 'closed') {
    this.clearReconnectCleanup(record);
    record.state = 'closed';
    record.client = null;
    record.gemini?.close();
    record.gemini = null;
    record.updatedAt = Date.now();
    this.sessions.delete(record.id);
    return reason;
  }

  private enforceConcurrentCap(userId: string, resumeSessionId: string | null) {
    const max = this.configService.get<number>(
      'VOICE_MAX_CONCURRENT_SESSIONS_PER_USER',
      1,
    );
    const activeSessions = [...this.sessions.values()].filter(
      (session) =>
        session.userId === userId &&
        session.state !== 'closed' &&
        session.id !== resumeSessionId,
    );

    if (activeSessions.length >= max) {
      throw new BadRequestException(
        'Too many active voice sessions. End one before starting another.',
      );
    }
  }

  private enforceRateLimit(userId: string, clientIp: string) {
    const limit = this.configService.get<number>(
      'VOICE_RATE_LIMIT_PER_MINUTE',
      6,
    );
    this.consumeBucket(
      this.userBuckets,
      userId,
      limit,
      'Voice session rate limit exceeded.',
    );
    this.consumeBucket(
      this.ipBuckets,
      clientIp || 'unknown',
      limit * 2,
      'Voice session rate limit exceeded for this network.',
    );
  }

  private consumeBucket(
    buckets: Map<string, RateBucket>,
    key: string,
    limit: number,
    message: string,
  ) {
    const now = Date.now();
    const existing = buckets.get(key);
    if (!existing || existing.resetAt <= now) {
      buckets.set(key, {
        count: 1,
        resetAt: now + 60_000,
      });
      return;
    }

    if (existing.count >= limit) {
      throw new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);
    }

    existing.count += 1;
  }
}
