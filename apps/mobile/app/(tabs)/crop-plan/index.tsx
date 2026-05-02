import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { Stack, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { CloudSun, Droplets, ListChecks, Sparkles } from 'lucide-react-native';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { MilestoneRail } from '@/components/milestone-rail';
import { OfflineBanner } from '@/components/offline-banner';
import { PageShell } from '@/components/page-shell';
import { SeasonSwitcherStrip } from '@/components/season-switcher-strip';
import { SectionTitle } from '@/components/section-title';
import { StageClusterCard } from '@/components/stage-cluster-card';
import { SunriseCard } from '@/components/sunrise-card';
import { TaskChecklistCard } from '@/components/task-checklist-card';
import { TimelineHeroHeader } from '@/components/timeline-hero-header';
import { TimelineSkeleton } from '@/components/timeline-skeleton';
import { useSession } from '@/features/session/session-provider';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { useDeviceLocation } from '@/hooks/use-device-location';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { apiGet } from '@/lib/api';
import type { CropTimelineResponse, DashboardWeeklyResponse } from '@/lib/api-types';
import {
  getSeasonProgress,
  getStageFocus,
  getStageVisualState,
  getTimelineSummary,
  getWeatherGradient,
  groupSeasonTasks,
} from '@/lib/crop-plan';
import { storageKeys } from '@/lib/constants';
import { findSeasonContext, getAllSeasons } from '@/lib/domain';
import { useStoredValue } from '@/lib/storage';
import { palette, spacing, typography } from '@/theme/tokens';

export default function CropPlanRoute() {
  const router = useRouter();
  const network = useNetworkStatus();
  const { profile, token } = useSession();
  const [selectedSeasonId, setSelectedSeasonId] = useStoredValue(
    storageKeys.selectedSeasonId,
    '',
  );
  const [focusedStageId, setFocusedStageId] = useState('');
  const { location, refreshLocation } = useDeviceLocation();

  const seasons = useMemo(() => getAllSeasons(profile), [profile]);
  const selectedSeasonContext = findSeasonContext(profile, selectedSeasonId);

  useEffect(() => {
    if (selectedSeasonContext && selectedSeasonContext.id !== selectedSeasonId) {
      setSelectedSeasonId(selectedSeasonContext.id);
    }
  }, [selectedSeasonContext, selectedSeasonId, setSelectedSeasonId]);

  useEffect(() => {
    void refreshLocation();
  }, [refreshLocation]);

  const seasonId = selectedSeasonContext?.id ?? '';
  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    if (seasonId) {
      params.set('cropSeasonId', seasonId);
    }

    if (location) {
      params.set('latitude', String(location.latitude));
      params.set('longitude', String(location.longitude));
    }

    const resolved = params.toString();
    return resolved ? `?${resolved}` : '';
  }, [location, seasonId]);

  const timelineQuery = useCachedQuery({
    cacheKey: `timeline:${seasonId || 'none'}`,
    queryKey: ['timeline', token, seasonId],
    enabled: Boolean(token && seasonId),
    queryFn: () => apiGet<CropTimelineResponse>(`/crop-seasons/${seasonId}/timeline`, token),
  });

  const dashboardQuery = useCachedQuery({
    cacheKey: `dashboard-weekly:${seasonId || 'default'}:${location?.latitude ?? 'na'}:${location?.longitude ?? 'na'}`,
    queryKey: ['dashboard-weekly', token, seasonId, location?.latitude, location?.longitude],
    enabled: Boolean(token && seasonId),
    queryFn: () => apiGet<DashboardWeeklyResponse>(`/dashboard/weekly${queryString}`, token),
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
  }, [progress?.currentStage?.id, seasonId]);

  if (!selectedSeasonContext) {
    return (
      <PageShell
        eyebrow="Crop plan"
        title="Season command center"
        subtitle="Set up a crop season first so IntelliFarm can turn it into a guided field journey."
      >
        <EmptyState
          title="No timeline yet"
          description="As soon as a season is active, this screen becomes your stage-by-stage command center."
        />
        <Button label="Create my crop season" onPress={() => router.push('/season')} />
      </PageShell>
    );
  }

  if (!timeline || !progress) {
    return (
      <>
        <Stack.Screen options={{ title: 'Crop plan' }} />
        <PageShell
          eyebrow="Crop plan"
          title="Season command center"
          subtitle={`${selectedSeasonContext.cropName} • ${selectedSeasonContext.farmPlot.name}`}
          heroTone="weather"
        >
          <TimelineSkeleton />
        </PageShell>
      </>
    );
  }

  const focusedStage =
    timeline.stages.find((stage) => stage.id === focusedStageId) ?? progress.currentStage;
  const focusedStageIndex = timeline.stages.findIndex((stage) => stage.id === focusedStage?.id);
  const resolvedFocusedIndex = focusedStageIndex >= 0 ? focusedStageIndex : progress.currentIndex;
  const focusedStatus = getStageVisualState(resolvedFocusedIndex, progress.currentIndex);
  const focusedStageFocus = focusedStage ? getStageFocus(focusedStage) : null;
  const weather = dashboard?.weatherHero ?? null;
  const resourcePulse = dashboard?.resourcePulse ?? null;
  const cacheBannerNeeded =
    network.isOffline ||
    Boolean(
      (timelineQuery.error || dashboardQuery.error) &&
        (timelineQuery.hasCachedData || dashboardQuery.hasCachedData),
    );

  const stageMetrics = [
    {
      label: 'live tasks',
      value: `${groupedTasks.pending.length}`,
      icon: 'spark' as const,
    },
    {
      label: 'rain watch',
      value: weather ? `${weather.current.rainProbabilityPercent}%` : 'Dry view',
      icon: 'weather' as const,
    },
    {
      label: 'water',
      value: resourcePulse ? `${resourcePulse.weeklyWaterMm} mm` : 'Stage-led',
      icon: 'water' as const,
    },
  ];

  return (
    <>
      <Stack.Screen options={{ title: 'Crop plan' }} />
      <PageShell
        eyebrow="Crop plan"
        title="Season command center"
        subtitle={`${timeline.cropSeason.cropName} • ${selectedSeasonContext.farmPlot.name}`}
        heroTone="weather"
        hero={
          <TimelineHeroHeader
            cropName={timeline.cropSeason.cropName}
            stageLabel={timeline.cropSeason.currentStage}
            farmLabel={selectedSeasonContext.farmPlot.name}
            progress={progress.progressRatio}
            daysSinceSowing={progress.daysSinceSowing}
            totalDays={progress.totalDays}
            stageDay={progress.stageDay}
            stageLength={progress.stageLength}
            metrics={stageMetrics}
            supportTitle={weather?.advisories[0]?.title ?? 'Stay tight to the active field window'}
            supportBody={
              weather?.advisories[0]?.recommendedAction ?? getTimelineSummary(timeline, progress)
            }
            colors={getWeatherGradient(weather)}
          />
        }
      >
        {cacheBannerNeeded ? <OfflineBanner cachedAt={timelineQuery.cachedAt} /> : null}

        {seasons.length > 1 ? (
          <SeasonSwitcherStrip
            seasons={seasons.map((season) => ({
              id: season.id,
              cropName: season.cropName,
              currentStage: season.currentStage,
              farmPlotName: season.farmPlot.name,
              status: season.status,
            }))}
            selectedSeasonId={selectedSeasonContext.id}
            onSelect={(seasonId) => {
              void Haptics.selectionAsync();
              setSelectedSeasonId(seasonId);
            }}
          />
        ) : null}

        <SectionTitle
          eyebrow="Journey rail"
          title="Milestones"
          action={
            <Button
              label="Weather"
              variant="ghost"
              fullWidth={false}
              icon={<CloudSun color={palette.leaf} size={16} />}
              onPress={() =>
                router.push({
                  pathname: '/weather/[farmPlotId]',
                  params: {
                    farmPlotId: selectedSeasonContext.farmPlot.id,
                    latitude: location?.latitude != null ? String(location.latitude) : undefined,
                    longitude:
                      location?.longitude != null ? String(location.longitude) : undefined,
                  },
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

        {focusedStage && focusedStageFocus ? (
          <>
            <SectionTitle eyebrow="Today’s window" title="Stage spotlight" />
            <StageClusterCard
              stage={focusedStage}
              status={focusedStatus}
              summary={
                focusedStatus === 'current'
                  ? `Day ${progress.stageDay} of ${progress.stageLength}. ${getTimelineSummary(timeline, progress)}`
                  : focusedStatus === 'completed'
                    ? 'This stage window has already passed. Keep its lessons in mind before the next transition.'
                    : 'This stage is coming up next. Keep the field steady so the crop enters this window cleanly.'
              }
              highlights={focusedStageFocus.cues}
              tasks={
                focusedStage.id === progress.currentStage?.id
                  ? groupedTasks.pending.slice(0, 2)
                  : []
              }
              footerLabel={focusedStageFocus.risk}
              expanded
              onTaskPress={(task) =>
                router.push({
                  pathname: '/task/[id]',
                  params: { id: task.id, cropSeasonId: timeline.cropSeason.id },
                })
              }
            />
          </>
        ) : null}

        <SectionTitle eyebrow="Field path" title="Stage clusters" />
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
                    ? 'This is the live crop window. Weekly tasks and weather decisions should anchor here first.'
                    : state === 'completed'
                      ? 'This stage is behind you now, so the next decisions should build on what has already been done.'
                      : 'Guidance for this stage becomes more important as the crop moves closer to this day range.'
                }
                highlights={focus.cues}
                tasks={stage.id === progress.currentStage?.id ? groupedTasks.pending.slice(0, 2) : []}
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

        <SectionTitle eyebrow="Work list" title="This week’s checklist" />
        <TaskChecklistCard
          title="Act in this window"
          eyebrow={`${groupedTasks.pending.length} live task${groupedTasks.pending.length === 1 ? '' : 's'}`}
          accent="warning"
          tasks={groupedTasks.pending}
          emptyLabel="No live tasks are due in this stage right now."
          onTaskPress={(task) =>
            router.push({
              pathname: '/task/[id]',
              params: { id: task.id, cropSeasonId: timeline.cropSeason.id },
            })
          }
        />

        {groupedTasks.completed.length ? (
          <TaskChecklistCard
            title="Already completed"
            eyebrow="Recent wins"
            accent="soft"
            tasks={groupedTasks.completed.slice(0, 3)}
            onTaskPress={(task) =>
              router.push({
                pathname: '/task/[id]',
                params: { id: task.id, cropSeasonId: timeline.cropSeason.id },
              })
            }
          />
        ) : null}

        {resourcePulse ? (
          <SunriseCard accent="info" title="Resource pulse" eyebrow="Stage support">
            <View style={{ gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                <View
                  style={{
                    minWidth: 120,
                    flex: 1,
                    padding: spacing.md,
                    borderRadius: 22,
                    backgroundColor: 'rgba(255,255,255,0.84)',
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
                    backgroundColor: 'rgba(255,255,255,0.84)',
                    gap: 4,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <ListChecks color={palette.leaf} size={15} />
                    <Text
                      style={{
                        color: palette.inkMuted,
                        fontFamily: typography.bodyStrong,
                        fontSize: 11,
                        textTransform: 'uppercase',
                      }}
                    >
                      Fertilizer
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: palette.ink,
                      fontFamily: typography.bodyStrong,
                      fontSize: 15,
                    }}
                  >
                    {resourcePulse.fertilizerNeed}
                  </Text>
                </View>
              </View>
              {resourcePulse.recommendations.slice(0, 2).map((recommendation) => (
                <View
                  key={recommendation}
                  style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs }}
                >
                  <Sparkles color={palette.leaf} size={14} style={{ marginTop: 2 }} />
                  <Text
                    style={{
                      flex: 1,
                      color: palette.inkSoft,
                      fontFamily: typography.bodyRegular,
                      fontSize: 13,
                      lineHeight: 20,
                    }}
                  >
                    {recommendation}
                  </Text>
                </View>
              ))}
            </View>
          </SunriseCard>
        ) : null}
      </PageShell>
    </>
  );
}
