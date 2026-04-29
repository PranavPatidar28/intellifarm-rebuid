import type { DashboardWeeklyResponse } from '@/lib/api-types';

type InsightRoute =
  | string
  | {
      pathname: string;
      params?: Record<string, string>;
    };

export type HomeInsight = {
  kind: 'crop-health' | 'market' | 'scheme';
  label: string;
  badgeLabel: string;
  badgeTone: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  title: string;
  detail: string;
  ctaLabel: string;
  route: InsightRoute;
};

type InsightInput = Pick<
  DashboardWeeklyResponse,
  'cropHealth' | 'marketPulse' | 'schemeSpotlight'
>;

export function getHomeInsight({
  cropHealth,
  marketPulse,
  schemeSpotlight,
}: InsightInput): HomeInsight | null {
  const urgentCropHealth =
    cropHealth &&
    (cropHealth.riskLevel === 'MEDIUM' ||
      cropHealth.riskLevel === 'HIGH' ||
      cropHealth.riskLevel === 'CRITICAL');

  if (urgentCropHealth) {
    return {
      kind: 'crop-health',
      label: 'Crop health',
      badgeLabel: getRiskLabel(cropHealth.riskLevel),
      badgeTone: getSeverityTone(cropHealth.riskLevel),
      title: cropHealth.headline,
      detail: cropHealth.detail,
      ctaLabel: cropHealth.ctaLabel,
      route: cropHealth.latestReportId
        ? `/disease-report/${cropHealth.latestReportId}`
        : '/diagnose',
    };
  }

  if (marketPulse) {
    return {
      kind: 'market',
      label: 'Market update',
      badgeLabel: marketPulse.trendLabel,
      badgeTone:
        marketPulse.trendDirection === 'UP'
          ? 'success'
          : marketPulse.trendDirection === 'DOWN'
            ? 'danger'
            : 'info',
      title: marketPulse.mandiName,
      detail: marketPulse.summary,
      ctaLabel: marketPulse.ctaLabel,
      route: '/market',
    };
  }

  if (schemeSpotlight) {
    return {
      kind: 'scheme',
      label: 'Scheme for you',
      badgeLabel: getSchemePriorityLabel(schemeSpotlight.priority),
      badgeTone: getSchemeTone(schemeSpotlight.priority),
      title: schemeSpotlight.title,
      detail: schemeSpotlight.whyRelevant,
      ctaLabel: schemeSpotlight.ctaLabel,
      route: {
        pathname: '/scheme/[id]',
        params: { id: schemeSpotlight.schemeId },
      },
    };
  }

  if (cropHealth) {
    return {
      kind: 'crop-health',
      label: 'Crop health',
      badgeLabel: getRiskLabel(cropHealth.riskLevel),
      badgeTone: getSeverityTone(cropHealth.riskLevel),
      title: cropHealth.headline,
      detail: cropHealth.detail,
      ctaLabel: cropHealth.ctaLabel,
      route: cropHealth.latestReportId
        ? `/disease-report/${cropHealth.latestReportId}`
        : '/diagnose',
    };
  }

  return null;
}

function getSeverityTone(
  level: NonNullable<DashboardWeeklyResponse['cropHealth']>['riskLevel'],
): HomeInsight['badgeTone'] {
  if (level === 'HIGH' || level === 'CRITICAL') {
    return 'danger';
  }

  if (level === 'MEDIUM') {
    return 'warning';
  }

  return 'success';
}

function getRiskLabel(
  level: NonNullable<DashboardWeeklyResponse['cropHealth']>['riskLevel'],
) {
  if (level === 'CRITICAL') {
    return 'Urgent risk';
  }

  if (level === 'HIGH') {
    return 'High risk';
  }

  if (level === 'MEDIUM') {
    return 'Watch now';
  }

  return 'Stable';
}

function getSchemeTone(
  priority: NonNullable<DashboardWeeklyResponse['schemeSpotlight']>['priority'],
): HomeInsight['badgeTone'] {
  if (priority === 'HIGH') {
    return 'warning';
  }

  if (priority === 'MEDIUM') {
    return 'info';
  }

  return 'neutral';
}

function getSchemePriorityLabel(
  priority: NonNullable<DashboardWeeklyResponse['schemeSpotlight']>['priority'],
) {
  if (priority === 'HIGH') {
    return 'Priority support';
  }

  if (priority === 'MEDIUM') {
    return 'Useful soon';
  }

  return 'Worth checking';
}
