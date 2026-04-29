import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Bell, CloudOff, FileHeart, MapPinned, Sparkles, Wallet } from 'lucide-react-native';

import { Button } from '@/components/button';
import { HomeInsightCard } from '@/components/home-insight-card';
import { HomeSeasonStrip } from '@/components/home-season-strip';
import { HomeUtilityShortcut } from '@/components/home-utility-shortcut';
import { MetricBadge } from '@/components/metric-badge';
import { OfflineBanner } from '@/components/offline-banner';
import { PageShell } from '@/components/page-shell';
import { RichEmptyState } from '@/components/rich-empty-state';
import { SectionTitle } from '@/components/section-title';
import { SegmentedChipRow } from '@/components/segmented-chip-row';
import { SunriseCard } from '@/components/sunrise-card';
import { TaskCard } from '@/components/task-card';
import { WeatherHeroCard } from '@/components/weather-hero-card';
import { useSession } from '@/features/session/session-provider';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { apiGet, apiPatch } from '@/lib/api';
import type { DashboardWeeklyResponse } from '@/lib/api-types';
import { storageKeys } from '@/lib/constants';
import { getHomeInsight } from '@/lib/home-insight';
import { useStoredValue } from '@/lib/storage';
import { palette, radii, spacing, typography } from '@/theme/tokens';

export default function HomeDashboardRoute() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const network = useNetworkStatus();
  const { authUser, token } = useSession();
  const [selectedSeasonId, setSelectedSeasonId] = useStoredValue(
    storageKeys.selectedSeasonId,
    '',
  );
  const [pendingUploads] = useStoredValue(storageKeys.pendingDiseaseReports, []);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  const queryString = selectedSeasonId ? `?cropSeasonId=${selectedSeasonId}` : '';
  const dashboardQuery = useCachedQuery({
    cacheKey: `dashboard-weekly:${selectedSeasonId || 'default'}`,
    queryKey: ['dashboard-weekly', token, selectedSeasonId],
    enabled: Boolean(token),
    queryFn: () => apiGet<DashboardWeeklyResponse>(`/dashboard/weekly${queryString}`, token),
  });

  const dashboard = dashboardQuery.data;
  const featuredSeason = dashboard?.featuredSeason ?? null;

  useEffect(() => {
    if (!selectedSeasonId && dashboard?.featuredSeason?.cropSeasonId) {
      setSelectedSeasonId(dashboard.featuredSeason.cropSeasonId);
    }
  }, [dashboard?.featuredSeason?.cropSeasonId, selectedSeasonId, setSelectedSeasonId]);

  const pendingTasks = useMemo(
    () =>
      (dashboard?.taskFocus?.tasks ?? [])
        .filter((task) => task.status !== 'COMPLETED')
        .slice(0, 2),
    [dashboard?.taskFocus?.tasks],
  );

  const homeInsight = useMemo(
    () =>
      getHomeInsight({
        cropHealth: dashboard?.cropHealth ?? null,
        marketPulse: dashboard?.marketPulse ?? null,
        schemeSpotlight: dashboard?.schemeSpotlight ?? null,
      }),
    [dashboard?.cropHealth, dashboard?.marketPulse, dashboard?.schemeSpotlight],
  );

  if (!featuredSeason) {
    return (
      <PageShell
        eyebrow="My farm"
        title={`Namaste, ${authUser?.name || 'farmer'}`}
        subtitle="Set up a crop season to unlock weekly farm actions."
      >
        <RichEmptyState
          title="No active crop yet"
          description="Finish the crop setup to unlock weather guidance, mandi signals, expense tracking, and scheme suggestions."
          icon={<Sparkles color={palette.leafDark} size={20} />}
        />
        <Button label="Set up my current crop" onPress={() => router.push('/season')} />
      </PageShell>
    );
  }

  const activeSeasonId = selectedSeasonId || featuredSeason.cropSeasonId;
  const cacheBannerNeeded =
    network.isOffline || Boolean(dashboardQuery.error && dashboardQuery.hasCachedData);
  const pendingTaskCount = dashboard?.taskFocus?.pendingCount ?? pendingTasks.length;
  const hasMultipleSeasons = (dashboard?.seasonSwitcher?.length ?? 0) > 1;

  const handleQuickComplete = async (taskId: string) => {
    if (!token || completingTaskId) {
      return;
    }

    setCompletingTaskId(taskId);

    const queryKey = ['dashboard-weekly', token, selectedSeasonId] as const;
    const previousDashboard = queryClient.getQueryData<DashboardWeeklyResponse>(queryKey);

    queryClient.setQueryData<DashboardWeeklyResponse>(queryKey, (current) => {
      if (!current?.taskFocus) {
        return current;
      }

      return {
        ...current,
        taskFocus: {
          ...current.taskFocus,
          pendingCount: Math.max(current.taskFocus.pendingCount - 1, 0),
          completedCount: current.taskFocus.completedCount + 1,
          tasks: current.taskFocus.tasks.map((task) =>
            task.id === taskId ? { ...task, status: 'COMPLETED' } : task,
          ),
        },
      };
    });

    try {
      await apiPatch(`/tasks/${taskId}`, { status: 'COMPLETED' }, token);
    } catch {
      if (previousDashboard) {
        queryClient.setQueryData(queryKey, previousDashboard);
      }
    } finally {
      setCompletingTaskId(null);
      void queryClient.invalidateQueries({ queryKey: ['dashboard-weekly', token] });
      void queryClient.invalidateQueries({ queryKey: ['timeline', token, activeSeasonId] });
    }
  };

  return (
    <PageShell
      eyebrow="My farm"
      title={`Namaste, ${authUser?.name || 'farmer'}`}
      subtitle="Weekly farm actions"
      action={
        <Pressable
          onPress={() => router.push('/alerts')}
          style={{
            width: 40,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: radii.pill,
            backgroundColor: palette.white,
            borderWidth: 1,
            borderColor: palette.outline,
          }}
        >
          <Bell color={palette.leafDark} size={20} />
        </Pressable>
      }
      heroTone="sunrise"
      hero={
        <View style={{ gap: spacing.sm }}>
          <HomeSeasonStrip
            cropName={featuredSeason.cropName}
            currentStage={featuredSeason.currentStage}
            daysSinceSowing={featuredSeason.daysSinceSowing}
            farmPlotName={featuredSeason.farmPlotName}
          />
          {hasMultipleSeasons ? (
            <SegmentedChipRow
              value={featuredSeason.cropSeasonId}
              options={dashboard?.seasonSwitcher.map((season) => ({
                value: season.cropSeasonId,
                label: season.cropName,
              })) ?? []}
              onChange={(value) => setSelectedSeasonId(value)}
            />
          ) : null}
        </View>
      }
    >
      {cacheBannerNeeded ? (
        <OfflineBanner
          cachedAt={dashboardQuery.cachedAt}
          pendingLabel={
            pendingUploads.length
              ? `${pendingUploads.length} diagnosis upload(s) are waiting to sync.`
              : undefined
          }
        />
      ) : null}

      <WeatherHeroCard
        weather={dashboard?.weatherHero ?? null}
        loading={dashboardQuery.isLoading && !dashboard?.weatherHero}
        refreshing={dashboardQuery.isFetching}
        errorMessage={
          dashboardQuery.error ? 'Unable to refresh weather data right now.' : null
        }
        onRefresh={() => {
          void dashboardQuery.refetch();
        }}
        onForecast={() =>
          router.push({
            pathname: '/weather/[farmPlotId]',
            params: { farmPlotId: featuredSeason.farmPlotId },
          })
        }
        onAdvisory={() => router.push('/crop-plan')}
      />

      <View style={{ gap: spacing.sm }}>
        <SectionTitle
          eyebrow="This week"
          title="Top actions"
          action={
            <MetricBadge
              label={pendingTaskCount ? `${pendingTaskCount} open` : 'All clear'}
              tone={pendingTaskCount ? 'warning' : 'success'}
            />
          }
        />
        <Text
          style={{
            color: palette.inkSoft,
            fontFamily: typography.bodyRegular,
            fontSize: 13,
            lineHeight: 19,
          }}
        >
          {dashboard?.taskFocus?.subtitle ?? 'Focus on the next safe field action.'}
        </Text>
        {pendingTasks.length ? (
          <View style={{ gap: spacing.sm }}>
            {pendingTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onPress={() =>
                  router.push({
                    pathname: '/task/[id]',
                    params: { id: task.id, cropSeasonId: featuredSeason.cropSeasonId },
                  })
                }
                onQuickComplete={() => {
                  void handleQuickComplete(task.id);
                }}
                quickCompleting={completingTaskId === task.id}
              />
            ))}
          </View>
        ) : (
          <SunriseCard accent="soft" title="No urgent tasks this week">
            <Text
              style={{
                color: palette.inkSoft,
                fontFamily: typography.bodyRegular,
                fontSize: 13,
                lineHeight: 19,
              }}
            >
              Your current crop window looks stable. Use Crop Plan if you want to review the full journey.
            </Text>
          </SunriseCard>
        )}
        <View style={{ flexDirection: 'row' }}>
          <Button
            label="View full crop plan"
            variant="ghost"
            fullWidth={false}
            onPress={() => router.push('/crop-plan')}
          />
        </View>
      </View>

      {homeInsight ? (
        <HomeInsightCard
          insight={homeInsight}
          onPress={() => router.push(homeInsight.route as never)}
        />
      ) : null}

      <View style={{ gap: spacing.sm }}>
        <Text
          style={{
            color: palette.inkMuted,
            fontFamily: typography.bodyStrong,
            fontSize: 11,
            textTransform: 'uppercase',
          }}
        >
          More tools
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <HomeUtilityShortcut
            label="Schemes"
            icon={<FileHeart color={palette.lilac} size={16} />}
            onPress={() => router.push('/schemes')}
          />
          <HomeUtilityShortcut
            label="Expenses"
            icon={<Wallet color={palette.leafDark} size={16} />}
            onPress={() => router.push('/expenses' as never)}
          />
          <HomeUtilityShortcut
            label="Nearby support"
            icon={<MapPinned color={palette.sky} size={16} />}
            onPress={() => router.push('/facilities')}
          />
          <HomeUtilityShortcut
            label="Offline"
            icon={<CloudOff color={palette.mustard} size={16} />}
            onPress={() => router.push('/offline')}
          />
        </View>
      </View>
    </PageShell>
  );
}
