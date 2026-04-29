import { Text, View } from 'react-native';

import { Stack, useRouter } from 'expo-router';
import {
  Bell,
  CloudSun,
  FileHeart,
  MessageSquareMore,
  ShieldAlert,
  Wallet,
} from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/button';
import { CompactListCard } from '@/components/compact-list-card';
import { MetricBadge } from '@/components/metric-badge';
import { PageShell } from '@/components/page-shell';
import { RichEmptyState } from '@/components/rich-empty-state';
import { RiskBadge } from '@/components/risk-badge';
import { SectionTitle } from '@/components/section-title';
import { SunriseCard } from '@/components/sunrise-card';
import { useSession } from '@/features/session/session-provider';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { apiGet, apiPatch } from '@/lib/api';
import type { AlertsResponse } from '@/lib/api-types';
import { formatLongDate } from '@/lib/format';
import { palette, spacing, typography } from '@/theme/tokens';

export default function AlertsRoute() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token } = useSession();

  const alertsQuery = useCachedQuery({
    cacheKey: 'alerts',
    queryKey: ['alerts', token],
    enabled: Boolean(token),
    queryFn: () => apiGet<AlertsResponse>('/alerts', token),
  });

  const alerts = alertsQuery.data?.alerts ?? [];
  const unreadCount = alerts.filter((alert) => !alert.isRead).length;

  return (
    <>
      <Stack.Screen options={{ title: 'Alerts & reminders' }} />
      <PageShell
        eyebrow="Notifications"
        title="Alerts and reminders"
        subtitle="Weather, task, and crop-health alerts in one clean farmer-facing stream."
      >
        <SunriseCard accent="soft" title="Alert overview">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <MetricBadge
              label={`${unreadCount} unread`}
              tone={unreadCount ? 'warning' : 'success'}
            />
            <MetricBadge label={`${alerts.length} total`} tone="neutral" />
          </View>
        </SunriseCard>

        <SectionTitle eyebrow="Latest" title="Alert list" />
        {alerts.length ? (
          <View style={{ gap: spacing.sm }}>
            {alerts.map((alert) => (
              <CompactListCard
                key={alert.id}
                title={alert.title}
                subtitle={alert.message}
                meta={`${formatLongDate(alert.createdAt)} - ${alert.freshnessLabel}`}
                prefix={getAlertIcon(alert.iconKey, alert.categoryLabel)}
                trailing={
                  <MetricBadge
                    label={alert.isRead ? 'Read' : 'New'}
                    tone={alert.isRead ? 'neutral' : 'warning'}
                  />
                }
                tone={alert.isRead ? 'neutral' : 'soft'}
              >
                <View style={{ gap: spacing.sm }}>
                  <RiskBadge value={alert.severity} />
                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    {!alert.isRead ? (
                      <Button
                        label="Mark read"
                        fullWidth={false}
                        variant="soft"
                        onPress={() => {
                          if (!token) {
                            return;
                          }

                          void apiPatch(`/alerts/${alert.id}/read`, {}, token).then(() => {
                            void queryClient.invalidateQueries({ queryKey: ['alerts', token] });
                            void queryClient.invalidateQueries({
                              queryKey: ['dashboard-weekly', token],
                            });
                          });
                        }}
                      />
                    ) : null}
                    <Button
                      label={alert.ctaLabel}
                      fullWidth={false}
                      variant="ghost"
                      onPress={() => router.push(alert.ctaRoute as never)}
                    />
                  </View>
                </View>
              </CompactListCard>
            ))}
          </View>
        ) : (
          <RichEmptyState
            title="No alerts right now"
            description="The farm is quiet for now. New reminders will show up here as your crop plan changes."
            icon={<Bell color={palette.leafDark} size={20} />}
          />
        )}
      </PageShell>
    </>
  );
}

function getAlertIcon(iconKey: string, categoryLabel: string) {
  const key = `${iconKey} ${categoryLabel}`.toLowerCase();

  if (key.includes('weather')) {
    return <CloudSun color={palette.sky} size={18} />;
  }
  if (key.includes('scheme')) {
    return <FileHeart color={palette.lilac} size={18} />;
  }
  if (key.includes('market')) {
    return <Wallet color={palette.mustard} size={18} />;
  }
  if (key.includes('disease') || key.includes('crop')) {
    return <ShieldAlert color={palette.terracotta} size={18} />;
  }
  if (key.includes('community')) {
    return <MessageSquareMore color={palette.leafDark} size={18} />;
  }

  return <Bell color={palette.leafDark} size={18} />;
}
