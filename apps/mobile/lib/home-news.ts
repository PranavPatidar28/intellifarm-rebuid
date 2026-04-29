import type {
  AlertsResponse,
  DashboardWeeklyResponse,
  SchemesResponse,
} from '@/lib/api-types';

export type HomeRoute =
  | string
  | {
      pathname: string;
      params?: Record<string, string>;
    };

export type HomeNewsItem = {
  id: string;
  label: string;
  title: string;
  summary: string;
  badgeLabel: string;
  badgeTone: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  iconKind: 'weather' | 'task' | 'market' | 'disease' | 'scheme' | 'general';
  route: HomeRoute;
};

export type HomeSchemeHighlight = {
  id: string;
  eyebrow: string;
  title: string;
  summary: string;
  badgeLabel: string;
  badgeTone: 'neutral' | 'warning' | 'info';
  route: HomeRoute;
  ctaLabel: string;
};

type HomeNewsInput = {
  alerts: AlertsResponse['alerts'];
  marketPulse: DashboardWeeklyResponse['marketPulse'];
  weatherHero: DashboardWeeklyResponse['weatherHero'];
  farmPlotId?: string | null;
};

type SchemePriority = SchemesResponse['schemes'][number]['priority'];

export function getHomeNewsItems({
  alerts,
  marketPulse,
  weatherHero,
  farmPlotId,
}: HomeNewsInput): HomeNewsItem[] {
  const items = [...alerts]
    .sort((left, right) => compareAlerts(left, right))
    .map((alert) => mapAlertToNewsItem(alert))
    .slice(0, 3);

  if (items.length < 3 && marketPulse) {
    items.push({
      id: 'market-pulse',
      label: 'Market pulse',
      title: `${marketPulse.cropName} at ${marketPulse.mandiName}`,
      summary: `${formatCurrency(marketPulse.modalPrice)}/quintal. ${marketPulse.summary}`,
      badgeLabel: marketPulse.freshnessLabel,
      badgeTone:
        marketPulse.trendDirection === 'UP'
          ? 'success'
          : marketPulse.trendDirection === 'DOWN'
            ? 'warning'
            : 'info',
      iconKind: 'market',
      route: '/market',
    });
  }

  if (items.length < 3) {
    const weatherFallback = getWeatherFallbackItem(weatherHero, farmPlotId);
    if (weatherFallback) {
      items.push(weatherFallback);
    }
  }

  return items.slice(0, 3);
}

export function getHomeSchemeHighlight({
  schemeSpotlight,
  fallbackScheme,
}: {
  schemeSpotlight: DashboardWeeklyResponse['schemeSpotlight'];
  fallbackScheme: SchemesResponse['schemes'][number] | null;
}): HomeSchemeHighlight | null {
  if (schemeSpotlight) {
    return {
      id: schemeSpotlight.schemeId,
      eyebrow: 'Recommended support',
      title: schemeSpotlight.title,
      summary: schemeSpotlight.whyRelevant || schemeSpotlight.benefitSummary,
      badgeLabel: getSchemePriorityLabel(schemeSpotlight.priority),
      badgeTone: getSchemePriorityTone(schemeSpotlight.priority),
      route: {
        pathname: '/scheme/[id]',
        params: { id: schemeSpotlight.schemeId },
      },
      ctaLabel: 'Check details',
    };
  }

  if (!fallbackScheme) {
    return null;
  }

  return {
    id: fallbackScheme.id,
    eyebrow: fallbackScheme.category,
    title: fallbackScheme.title,
    summary: fallbackScheme.whyRelevant || fallbackScheme.benefitSummary,
    badgeLabel: getSchemePriorityLabel(fallbackScheme.priority),
    badgeTone: getSchemePriorityTone(fallbackScheme.priority),
    route: {
      pathname: '/scheme/[id]',
      params: { id: fallbackScheme.id },
    },
    ctaLabel: 'Check details',
  };
}

function compareAlerts(
  left: AlertsResponse['alerts'][number],
  right: AlertsResponse['alerts'][number],
) {
  const unreadDelta = Number(left.isRead) - Number(right.isRead);
  if (unreadDelta !== 0) {
    return unreadDelta;
  }

  const priorityDelta = getAlertPriority(left) - getAlertPriority(right);
  if (priorityDelta !== 0) {
    return priorityDelta;
  }

  return Date.parse(right.createdAt) - Date.parse(left.createdAt);
}

function getAlertPriority(alert: AlertsResponse['alerts'][number]) {
  const key = `${alert.alertType} ${alert.categoryLabel} ${alert.iconKey}`.toLowerCase();

  if (key.includes('weather')) {
    return 0;
  }

  if (alert.alertType === 'TASK') {
    return 1;
  }

  if (key.includes('market')) {
    return 2;
  }

  if (alert.alertType === 'SYSTEM') {
    return 3;
  }

  if (key.includes('scheme')) {
    return 4;
  }

  if (alert.alertType === 'DISEASE') {
    return 5;
  }

  return 6;
}

function mapAlertToNewsItem(alert: AlertsResponse['alerts'][number]): HomeNewsItem {
  const key = `${alert.alertType} ${alert.categoryLabel} ${alert.iconKey}`.toLowerCase();

  return {
    id: alert.id,
    label: getAlertLabel(alert, key),
    title: alert.title,
    summary: alert.message,
    badgeLabel: alert.isRead ? alert.freshnessLabel : 'New',
    badgeTone: getSeverityTone(alert.severity),
    iconKind: getAlertIconKind(alert, key),
    route: alert.ctaRoute,
  };
}

function getAlertLabel(alert: AlertsResponse['alerts'][number], key: string) {
  if (key.includes('weather')) {
    return 'Weather update';
  }

  if (alert.alertType === 'TASK') {
    return 'Task reminder';
  }

  if (key.includes('market')) {
    return 'Market update';
  }

  if (key.includes('scheme')) {
    return 'Support update';
  }

  if (alert.alertType === 'DISEASE') {
    return 'Crop alert';
  }

  return 'Farm update';
}

function getAlertIconKind(alert: AlertsResponse['alerts'][number], key: string) {
  if (key.includes('weather')) {
    return 'weather';
  }

  if (alert.alertType === 'TASK') {
    return 'task';
  }

  if (key.includes('market')) {
    return 'market';
  }

  if (key.includes('scheme')) {
    return 'scheme';
  }

  if (alert.alertType === 'DISEASE') {
    return 'disease';
  }

  return 'general';
}

function getSeverityTone(
  level: AlertsResponse['alerts'][number]['severity'],
): HomeNewsItem['badgeTone'] {
  if (level === 'HIGH' || level === 'CRITICAL') {
    return 'danger';
  }

  if (level === 'MEDIUM') {
    return 'warning';
  }

  return 'info';
}

function getWeatherFallbackItem(
  weatherHero: DashboardWeeklyResponse['weatherHero'],
  farmPlotId?: string | null,
): HomeNewsItem | null {
  if (!weatherHero || !farmPlotId) {
    return null;
  }

  const advisory = weatherHero.advisories[0];
  const fieldWindow =
    weatherHero.fieldWindows.sprayWindow.summary ||
    weatherHero.fieldWindows.irrigationWindow.summary ||
    weatherHero.fieldWindows.harvestWindow.summary;

  const highestRisk = getHighestWeatherRiskLevel(weatherHero);

  return {
    id: 'weather-fallback',
    label: 'Weather watch',
    title: advisory?.title || 'Field conditions for today',
    summary: advisory?.message || fieldWindow || weatherHero.sourceMeta.accuracyLabel,
    badgeLabel: weatherHero.freshness.stale ? 'Cached' : 'Fresh',
    badgeTone:
      highestRisk === 'HIGH' ? 'danger' : highestRisk === 'MEDIUM' ? 'warning' : 'info',
    iconKind: 'weather',
    route: {
      pathname: '/weather/[farmPlotId]',
      params: { farmPlotId },
    },
  };
}

function getHighestWeatherRiskLevel(
  weatherHero: NonNullable<DashboardWeeklyResponse['weatherHero']>,
) {
  const levels = [
    weatherHero.riskSignals.sprayRisk.level,
    weatherHero.riskSignals.irrigationNeed.level,
    weatherHero.riskSignals.heatStressRisk.level,
    weatherHero.riskSignals.floodRisk.level,
  ];

  if (levels.includes('HIGH')) {
    return 'HIGH';
  }

  if (levels.includes('MEDIUM')) {
    return 'MEDIUM';
  }

  return 'LOW';
}

function getSchemePriorityTone(priority: SchemePriority): HomeSchemeHighlight['badgeTone'] {
  if (priority === 'HIGH') {
    return 'warning';
  }

  if (priority === 'MEDIUM') {
    return 'info';
  }

  return 'neutral';
}

function getSchemePriorityLabel(priority: SchemePriority) {
  if (priority === 'HIGH') {
    return 'Priority';
  }

  if (priority === 'MEDIUM') {
    return 'Relevant';
  }

  return 'Worth checking';
}

function formatCurrency(value: number) {
  return Math.round(value).toString();
}
