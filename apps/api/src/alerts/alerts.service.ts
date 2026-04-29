import { Injectable, NotFoundException } from '@nestjs/common';

import { diffInDays } from '../common/utils/date.util';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  async listAlerts(userId: string) {
    const alerts = await this.prisma.alert.findMany({
      where: { userId },
      include: {
        cropSeason: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return {
      alerts: alerts.map((alert) => ({
        id: alert.id,
        title: alert.title,
        message: alert.message,
        alertType: alert.alertType,
        severity: alert.severity,
        isRead: alert.isRead,
        createdAt: alert.createdAt.toISOString(),
        categoryLabel: describeCategoryLabel(alert.alertType),
        iconKey: resolveIconKey(alert.alertType, alert.severity),
        ctaLabel: resolveCtaLabel(alert.alertType),
        ctaRoute: resolveCtaRoute(alert.alertType, alert.cropSeasonId, alert.ctaRoute),
        freshnessLabel: formatFreshnessLabel(alert.createdAt),
      })),
    };
  }

  async markRead(userId: string, alertId: string) {
    const alert = await this.prisma.alert.findFirst({
      where: { id: alertId, userId },
      include: {
        cropSeason: true,
      },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    const updatedAlert = await this.prisma.alert.update({
      where: { id: alertId },
      data: { isRead: true },
      include: {
        cropSeason: true,
      },
    });

    return {
      alert: {
        id: updatedAlert.id,
        title: updatedAlert.title,
        message: updatedAlert.message,
        alertType: updatedAlert.alertType,
        severity: updatedAlert.severity,
        isRead: updatedAlert.isRead,
        createdAt: updatedAlert.createdAt.toISOString(),
        categoryLabel: describeCategoryLabel(updatedAlert.alertType),
        iconKey: resolveIconKey(updatedAlert.alertType, updatedAlert.severity),
        ctaLabel: resolveCtaLabel(updatedAlert.alertType),
        ctaRoute: resolveCtaRoute(
          updatedAlert.alertType,
          updatedAlert.cropSeasonId,
          updatedAlert.ctaRoute,
        ),
        freshnessLabel: formatFreshnessLabel(updatedAlert.createdAt),
      },
    };
  }
}

function describeCategoryLabel(
  alertType: 'WEATHER' | 'TASK' | 'DISEASE' | 'SYSTEM' | 'COMMUNITY',
) {
  switch (alertType) {
    case 'WEATHER':
      return 'Weather action';
    case 'TASK':
      return 'Field task';
    case 'DISEASE':
      return 'Crop health';
    case 'COMMUNITY':
      return 'Community reply';
    default:
      return 'System update';
  }
}

function resolveIconKey(
  alertType: 'WEATHER' | 'TASK' | 'DISEASE' | 'SYSTEM' | 'COMMUNITY',
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
) {
  if (alertType === 'WEATHER') {
    return severity === 'HIGH' || severity === 'CRITICAL' ? 'cloud-rain-wind' : 'cloud-sun';
  }

  if (alertType === 'DISEASE') {
    return severity === 'HIGH' || severity === 'CRITICAL' ? 'bug' : 'leaf';
  }

  if (alertType === 'TASK') {
    return 'check-circle-2';
  }

  if (alertType === 'COMMUNITY') {
    return 'messages-square';
  }

  return 'bell';
}

function resolveCtaLabel(
  alertType: 'WEATHER' | 'TASK' | 'DISEASE' | 'SYSTEM' | 'COMMUNITY',
) {
  switch (alertType) {
    case 'WEATHER':
      return 'Open weather actions';
    case 'TASK':
      return 'Open crop plan';
    case 'DISEASE':
      return 'Open diagnose flow';
    case 'COMMUNITY':
      return 'Open discussion';
    default:
      return 'Open app';
  }
}

function resolveCtaRoute(
  alertType: 'WEATHER' | 'TASK' | 'DISEASE' | 'SYSTEM' | 'COMMUNITY',
  cropSeasonId: string | null,
  explicitRoute: string | null,
) {
  if (explicitRoute) {
    return explicitRoute;
  }

  switch (alertType) {
    case 'WEATHER':
      return cropSeasonId ? `/season/${cropSeasonId}` : '/(tabs)/home';
    case 'TASK':
      return '/(tabs)/crop-plan';
    case 'DISEASE':
      return '/(tabs)/diagnose';
    case 'COMMUNITY':
      return '/community';
    default:
      return '/(tabs)/home';
  }
}

function formatFreshnessLabel(date: Date) {
  const days = Math.max(0, diffInDays(date, new Date()));

  if (days === 0) {
    return 'Today';
  }

  if (days === 1) {
    return 'Yesterday';
  }

  return `${days} days ago`;
}
