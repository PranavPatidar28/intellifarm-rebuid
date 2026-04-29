import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { CloudSun, Droplets, ShieldAlert } from 'lucide-react-native';

import { AdvisoryStack } from '@/components/advisory-stack';
import { Button } from '@/components/button';
import { MilestoneRail } from '@/components/milestone-rail';
import { OfflineBanner } from '@/components/offline-banner';
import { PageShell } from '@/components/page-shell';
import { SectionTitle } from '@/components/section-title';
import { StageClusterCard } from '@/components/stage-cluster-card';
import { SunriseCard } from '@/components/sunrise-card';
import { TaskChecklistCard } from '@/components/task-checklist-card';
import { TimelineHeroHeader } from '@/components/timeline-hero-header';
import { TimelineSkeleton } from '@/components/timeline-skeleton';
import { useSession } from '@/features/session/session-provider';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { apiGet } from '@/lib/api';
import type { CropTimelineResponse, DashboardWeeklyResponse } from '@/lib/api-types';
import {
  getSeasonProgress,
  getStageFocus,
  getStageVisualState,
  getWeatherGradient,
  groupSeasonTasks,
} from '@/lib/crop-plan';
import { palette, spacing, typography } from '@/theme/tokens';

export default function SeasonDetailRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const network = useNetworkStatus();
  const { token } = useSession();
  const [focusedStageId, setFocusedStageId] = useState('');

  const timelineQuery = useCachedQuery({
    cacheKey: `timeline:${params.id}`,
    queryKey: ['timeline', token, params.id],
    enabled: Boolean(token && params.id),
    queryFn: () => apiGet<CropTimelineResponse>(`/crop-seasons/${params.id}/timeline`, token),
  });

  const dashboardQuery = useCachedQuery({
    cacheKey: `dashboard-weekly:${params.id}`,
    queryKey: ['dashboard-weekly', token, params.id],
    enabled: Boolean(token && params.id),
    queryFn: () =>
      apiGet<DashboardWeeklyResponse>(`/dashboard/weekly?cropSeasonId=${params.id}`, token),
  });

  const timeline = timelineQuery.data;
  const dashboard = dashboardQuery.data;
  const progress = useMemo(
    () =>
      timeline
        ? getSeasonProgress(
            timeline.stages,
            timeline.cropSeason.currentStage,
            timeline.cropSeason.sowingDate,
          )
        : null,
    [timeline],
  );
  const groupedTasks = useMemo(
    () => groupSeasonTasks(timeline?.tasks ?? []),
    [timeline?.tasks],
  );

  useEffect(() => {
    if (progress?.currentStage?.id) {
      setFocusedStageId(progress.currentStage.id);
    }
  }, [progress?.currentStage?.id, params.id]);

  if (!timeline || !progress) {
    return (
      <>
        <Stack.Screen options={{ title: 'Season details' }} />
        <PageShell
          eyebrow="Season detail"
          title="Loading season"
          subtitle="Pulling the saved timeline, weather windows, and task guidance."
          heroTone="weather"
        >
          <TimelineSkeleton />
        </PageShell>
      </>
    );
  }

  const weather = dashboard?.weatherHero ?? null;
  const resourcePulse = dashboard?.resourcePulse ?? null;
  const activeStage = progress.currentStage;
  const activeStageFocus = activeStage ? getStageFocus(activeStage) : null;
  const focusedStage =
    timeline.stages.find((stage) => stage.id === focusedStageId) ?? activeStage;
  const cacheBannerNeeded =
    network.isOffline ||
    Boolean(
      (timelineQuery.error || dashboardQuery.error) &&
        (timelineQuery.hasCachedData || dashboardQuery.hasCachedData),
    );

  const heroMetrics = [
    {
      label: 'task load',
      value: `${groupedTasks.pending.length} live`,
      icon: 'spark' as const,
    },
    {
      label: 'rain watch',
      value: weather ? `${weather.current.rainProbabilityPercent}%` : 'Dry view',
      icon: 'weather' as const,
    },
    {
      label: 'water',
      value: resourcePulse ? `${resourcePulse.weeklyWaterMm} mm` : 'Follow stage',
      icon: 'water' as const,
    },
  ];

  return (
    <>
      <Stack.Screen options={{ title: timeline.cropSeason.cropName }} />
      <PageShell
        eyebrow="Season detail"
        title={timeline.cropSeason.cropName}
        subtitle={`${timeline.cropSeason.farmPlot.name} • ${timeline.cropSeason.currentStage}`}
        heroTone="weather"
        hero={
          <TimelineHeroHeader
            cropName={timeline.cropSeason.cropName}
            stageLabel={timeline.cropSeason.currentStage}
            farmLabel={timeline.cropSeason.farmPlot.name}
            progress={progress.progressRatio}
            daysSinceSowing={progress.daysSinceSowing}
            totalDays={progress.totalDays}
            stageDay={progress.stageDay}
            stageLength={progress.stageLength}
            metrics={heroMetrics}
            supportTitle={weather?.advisories[0]?.title ?? 'Stage detail stays weather-aware'}
            supportBody={
              weather?.advisories[0]?.message ??
              'Use this screen to connect stage timing, weekly tasks, and field windows before acting.'
            }
            colors={getWeatherGradient(weather)}
          />
        }
      >
        {cacheBannerNeeded ? <OfflineBanner cachedAt={timelineQuery.cachedAt} /> : null}

        <SectionTitle
          eyebrow="Stage overview"
          title="Milestone rail"
          action={
            <Button
              label="Weather"
              variant="ghost"
              fullWidth={false}
              icon={<CloudSun color={palette.leaf} size={16} />}
              onPress={() =>
                router.push({
                  pathname: '/weather/[farmPlotId]',
                  params: { farmPlotId: timeline.cropSeason.farmPlot.id },
                })
              }
            />
          }
        />
        <MilestoneRail
          stages={timeline.stages}
          currentIndex={progress.currentIndex}
          progress={progress.progressRatio}
          selectedStageId={focusedStage?.id}
          onSelect={(stageId) => {
            void Haptics.selectionAsync();
            setFocusedStageId(stageId);
          }}
        />

        {activeStage && activeStageFocus ? (
          <>
            <SectionTitle eyebrow="Live now" title="Current stage spotlight" />
            <StageClusterCard
              stage={activeStage}
              status="current"
              expanded
              summary={`Day ${progress.stageDay} of ${progress.stageLength}. This is the main field window to align tasks, weather, and crop-health checks.`}
              highlights={activeStageFocus.cues}
              tasks={groupedTasks.pending.slice(0, 3)}
              footerLabel={activeStageFocus.risk}
              onTaskPress={(task) =>
                router.push({
                  pathname: '/task/[id]',
                  params: { id: task.id, cropSeasonId: timeline.cropSeason.id },
                })
              }
            />
          </>
        ) : null}

        {weather ? (
          <>
            <SectionTitle eyebrow="Field windows" title="Weather-led care windows" />
            <SunriseCard accent="info" title="Do this in the best window">
              <View style={{ gap: spacing.sm }}>
                {[
                  { label: 'Spray window', summary: weather.fieldWindows.sprayWindow.summary },
                  {
                    label: 'Irrigation window',
                    summary: weather.fieldWindows.irrigationWindow.summary,
                  },
                  {
                    label: 'Harvest window',
                    summary: weather.fieldWindows.harvestWindow.summary,
                  },
                ].map((item) => (
                  <View
                    key={item.label}
                    style={{
                      padding: spacing.md,
                      borderRadius: 22,
                      backgroundColor: 'rgba(255,255,255,0.84)',
                      gap: 4,
                    }}
                  >
                    <Text
                      style={{
                        color: palette.ink,
                        fontFamily: typography.bodyStrong,
                        fontSize: 14,
                      }}
                    >
                      {item.label}
                    </Text>
                    <Text
                      style={{
                        color: palette.inkSoft,
                        fontFamily: typography.bodyRegular,
                        fontSize: 13,
                        lineHeight: 19,
                      }}
                    >
                      {item.summary}
                    </Text>
                  </View>
                ))}
              </View>
            </SunriseCard>

            <AdvisoryStack advisories={weather.advisories} />
          </>
        ) : null}

        {resourcePulse ? (
          <SunriseCard accent="soft" title="Stage support pulse" eyebrow="Water • feed • protect">
            <View style={{ gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                <View
                  style={{
                    minWidth: 120,
                    flex: 1,
                    padding: spacing.md,
                    borderRadius: 22,
                    backgroundColor: 'rgba(255,255,255,0.86)',
                    gap: 4,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Droplets color={palette.sky} size={15} />
                    <Text
                      style={{
                        color: palette.inkMuted,
                        fontFamily: typography.bodyStrong,
                        fontSize: 11,
                        textTransform: 'uppercase',
                      }}
                    >
                      Weekly water
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: palette.ink,
                      fontFamily: typography.display,
                      fontSize: 20,
                    }}
                  >
                    {resourcePulse.weeklyWaterMm} mm
                  </Text>
                </View>
                <View
                  style={{
                    minWidth: 120,
                    flex: 1,
                    padding: spacing.md,
                    borderRadius: 22,
                    backgroundColor: 'rgba(255,255,255,0.86)',
                    gap: 4,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <ShieldAlert color={palette.terracotta} size={15} />
                    <Text
                      style={{
                        color: palette.inkMuted,
                        fontFamily: typography.bodyStrong,
                        fontSize: 11,
                        textTransform: 'uppercase',
                      }}
                    >
                      Pesticide watch
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: palette.ink,
                      fontFamily: typography.bodyStrong,
                      fontSize: 15,
                    }}
                  >
                    {resourcePulse.pesticideNeedLevel}
                  </Text>
                </View>
              </View>
              <Text
                style={{
                  color: palette.ink,
                  fontFamily: typography.bodyStrong,
                  fontSize: 14,
                }}
              >
                {resourcePulse.fertilizerNeed}
              </Text>
              {resourcePulse.recommendations.slice(0, 3).map((recommendation) => (
                <Text
                  key={recommendation}
                  style={{
                    color: palette.inkSoft,
                    fontFamily: typography.bodyRegular,
                    fontSize: 13,
                    lineHeight: 20,
                  }}
                >
                  • {recommendation}
                </Text>
              ))}
            </View>
          </SunriseCard>
        ) : null}

        <SectionTitle eyebrow="Task groups" title="Season checklist" />
        <TaskChecklistCard
          title="Act now"
          eyebrow={`${groupedTasks.pending.length} live task${groupedTasks.pending.length === 1 ? '' : 's'}`}
          accent="warning"
          tasks={groupedTasks.pending}
          emptyLabel="No live tasks are due for this season right now."
          onTaskPress={(task) =>
            router.push({
              pathname: '/task/[id]',
              params: { id: task.id, cropSeasonId: timeline.cropSeason.id },
            })
          }
        />
        <TaskChecklistCard
          title="Completed already"
          eyebrow="Progress log"
          accent="soft"
          tasks={groupedTasks.completed.slice(0, 4)}
          emptyLabel="Completed tasks will show up here as your season log grows."
          onTaskPress={(task) =>
            router.push({
              pathname: '/task/[id]',
              params: { id: task.id, cropSeasonId: timeline.cropSeason.id },
            })
          }
        />

        <SectionTitle eyebrow="All stages" title="Stage clusters" />
        <View style={{ gap: spacing.md }}>
          {timeline.stages.map((stage, index) => {
            const state = getStageVisualState(index, progress.currentIndex);
            const focus = getStageFocus(stage);

            return (
              <StageClusterCard
                key={stage.id}
                stage={stage}
                status={state}
                expanded={focusedStage?.id === stage.id}
                onToggle={() => {
                  void Haptics.selectionAsync();
                  setFocusedStageId(stage.id);
                }}
                summary={
                  state === 'current'
                    ? 'This stage is active now and should guide the next field move.'
                    : state === 'completed'
                      ? 'This stage is behind you now, so only use it as context for what has already happened.'
                      : 'This stage becomes more important as the crop moves closer to this day range.'
                }
                highlights={focus.cues}
                tasks={stage.id === activeStage?.id ? groupedTasks.pending.slice(0, 2) : []}
                footerLabel={focus.risk}
                onTaskPress={(task) =>
                  router.push({
                    pathname: '/task/[id]',
                    params: { id: task.id, cropSeasonId: timeline.cropSeason.id },
                  })
                }
              />
            );
          })}
        </View>
      </PageShell>
    </>
  );
}
