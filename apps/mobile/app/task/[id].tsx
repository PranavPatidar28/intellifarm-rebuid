import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { CloudSun, Ear, Sparkles } from 'lucide-react-native';

import { GradientFeatureCard } from '@/components/gradient-feature-card';
import { PageShell } from '@/components/page-shell';
import { ProgressCelebrationSheet } from '@/components/progress-celebration-sheet';
import { RiskBadge } from '@/components/risk-badge';
import { SunriseCard } from '@/components/sunrise-card';
import { TaskActionBar } from '@/components/task-action-bar';
import { useSession } from '@/features/session/session-provider';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { apiGet, apiPatch } from '@/lib/api';
import type { CropTimelineResponse, DashboardWeeklyResponse, TaskItem } from '@/lib/api-types';
import {
  getTaskAvoidList,
  getTaskBestTime,
  getTaskTypeHeadline,
  getTaskWhyItMatters,
} from '@/lib/crop-plan';
import { formatLongDate, titleCase } from '@/lib/format';
import { gradients, palette, radii, spacing, typography } from '@/theme/tokens';

export default function TaskDetailRoute() {
  const params = useLocalSearchParams<{ id: string; cropSeasonId?: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token } = useSession();
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [celebrationVisible, setCelebrationVisible] = useState(false);

  const tasksQuery = useCachedQuery({
    cacheKey: `tasks:${params.cropSeasonId ?? 'all'}`,
    queryKey: ['tasks', token, params.cropSeasonId],
    enabled: Boolean(token),
    queryFn: () =>
      apiGet<{ tasks: TaskItem[] }>(
        `/tasks${params.cropSeasonId ? `?cropSeasonId=${params.cropSeasonId}` : ''}`,
        token,
      ),
  });

  const dashboardQuery = useCachedQuery({
    cacheKey: `dashboard-weekly:${params.cropSeasonId ?? 'default'}`,
    queryKey: ['dashboard-weekly', token, params.cropSeasonId],
    enabled: Boolean(token && params.cropSeasonId),
    queryFn: () =>
      apiGet<DashboardWeeklyResponse>(
        `/dashboard/weekly${params.cropSeasonId ? `?cropSeasonId=${params.cropSeasonId}` : ''}`,
        token,
      ),
  });

  const task = useMemo(
    () => tasksQuery.data?.tasks.find((item) => item.id === params.id) ?? null,
    [params.id, tasksQuery.data?.tasks],
  );
  const dashboard = dashboardQuery.data;
  const weather = dashboard?.weatherHero ?? null;
  const featuredSeason = dashboard?.featuredSeason ?? null;

  if (!task) {
    return (
      <PageShell
        eyebrow="Task detail"
        title="Task not found"
        subtitle="The task may already be completed or no longer part of the current season query."
      >
        <TaskActionBar
          primaryAction={{ label: 'Back to crop plan', onPress: () => router.back() }}
        />
      </PageShell>
    );
  }

  const cardGradient =
    task.priority === 'HIGH'
      ? gradients.cropHealth
      : task.priority === 'MEDIUM'
        ? gradients.marketGold
        : gradients.sunriseField;

  const applyTaskStatus = (status: TaskItem['status']) => {
    queryClient.setQueryData<{ tasks: TaskItem[] }>(
      ['tasks', token, params.cropSeasonId],
      (current) =>
        current
          ? {
              ...current,
              tasks: current.tasks.map((item) =>
                item.id === task.id ? { ...item, status } : item,
              ),
            }
          : current,
    );

    if (params.cropSeasonId) {
      queryClient.setQueryData<CropTimelineResponse>(
        ['timeline', token, params.cropSeasonId],
        (current) =>
          current
            ? {
                ...current,
                tasks: current.tasks.map((item) =>
                  item.id === task.id ? { ...item, status } : item,
                ),
                cropSeason: {
                  ...current.cropSeason,
                  tasks: current.cropSeason.tasks.map((item) =>
                    item.id === task.id ? { ...item, status } : item,
                  ),
                },
              }
            : current,
      );
    }
  };

  const handleMarkDone = async () => {
    if (!token || task.status === 'COMPLETED' || isSaving) {
      return;
    }

    setErrorMessage(null);
    setIsSaving(true);

    const previousTasks = queryClient.getQueryData<{ tasks: TaskItem[] }>([
      'tasks',
      token,
      params.cropSeasonId,
    ]);
    const previousTimeline = params.cropSeasonId
      ? queryClient.getQueryData<CropTimelineResponse>([
          'timeline',
          token,
          params.cropSeasonId,
        ])
      : undefined;

    applyTaskStatus('COMPLETED');

    try {
      await apiPatch(`/tasks/${task.id}`, { status: 'COMPLETED' }, token);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCelebrationVisible(true);
    } catch (error) {
      if (previousTasks) {
        queryClient.setQueryData(['tasks', token, params.cropSeasonId], previousTasks);
      }

      if (params.cropSeasonId && previousTimeline) {
        queryClient.setQueryData(['timeline', token, params.cropSeasonId], previousTimeline);
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMessage('The task could not be marked done. Please try again.');
    } finally {
      setIsSaving(false);
      void queryClient.invalidateQueries({ queryKey: ['tasks', token] });
      void queryClient.invalidateQueries({ queryKey: ['timeline', token] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-weekly', token] });
    }
  };

  const listenCopy = `${task.title}. ${task.description}. ${getTaskBestTime(task, weather)}`;

  return (
    <>
      <Stack.Screen options={{ title: task.title }} />
      <PageShell
        eyebrow="Weekly task detail"
        title="Task focus"
        subtitle={
          featuredSeason
            ? `${featuredSeason.cropName} • ${featuredSeason.currentStage}`
            : titleCase(task.taskType)
        }
        heroTone="assistant"
        hero={
          <GradientFeatureCard colors={cardGradient} padding={24}>
            <View style={{ gap: spacing.md }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: spacing.md,
                }}
              >
                <RiskBadge value={task.priority} />
                <Text
                  style={{
                    color: 'rgba(255,255,255,0.76)',
                    fontFamily: typography.bodyStrong,
                    fontSize: 12,
                  }}
                >
                  Due {formatLongDate(task.dueDate)}
                </Text>
              </View>
              <View style={{ gap: spacing.xs }}>
                <Text
                  style={{
                    color: palette.white,
                    fontFamily: typography.displayBold,
                    fontSize: 28,
                    lineHeight: 34,
                  }}
                >
                  {task.title}
                </Text>
                <Text
                  style={{
                    color: 'rgba(255,255,255,0.86)',
                    fontFamily: typography.bodyRegular,
                    fontSize: 15,
                    lineHeight: 22,
                  }}
                >
                  {task.description}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {[titleCase(task.taskType), featuredSeason?.currentStage, task.status]
                  .filter(Boolean)
                  .map((value) => (
                    <View
                      key={value}
                      style={{
                        paddingHorizontal: spacing.md,
                        paddingVertical: spacing.xs,
                        borderRadius: radii.pill,
                        backgroundColor: 'rgba(255,255,255,0.16)',
                      }}
                    >
                      <Text
                        style={{
                          color: palette.white,
                          fontFamily: typography.bodyStrong,
                          fontSize: 12,
                        }}
                      >
                        {value}
                      </Text>
                    </View>
                  ))}
              </View>
            </View>
          </GradientFeatureCard>
        }
      >
        <SunriseCard accent="warning" title="What to do">
          <View style={{ gap: spacing.sm }}>
            <Text
              style={{
                color: palette.ink,
                fontFamily: typography.bodyStrong,
                fontSize: 15,
              }}
            >
              {getTaskTypeHeadline(task)}
            </Text>
            <Text
              style={{
                color: palette.inkSoft,
                fontFamily: typography.bodyRegular,
                fontSize: 14,
                lineHeight: 22,
              }}
            >
              {task.description}
            </Text>
          </View>
        </SunriseCard>

        <SunriseCard accent="soft" title="Why it matters">
          <Text
            style={{
              color: palette.inkSoft,
              fontFamily: typography.bodyRegular,
              fontSize: 14,
              lineHeight: 22,
            }}
          >
            {getTaskWhyItMatters(task)}
          </Text>
        </SunriseCard>

        <SunriseCard title="Best time to do it">
          <Text
            style={{
              color: palette.inkSoft,
              fontFamily: typography.bodyRegular,
              fontSize: 14,
              lineHeight: 22,
            }}
          >
            {getTaskBestTime(task, weather)}
          </Text>
        </SunriseCard>

        <SunriseCard accent="danger" title="Avoid this">
          <View style={{ gap: spacing.sm }}>
            {getTaskAvoidList(task, weather).map((item) => (
              <View key={item} style={{ flexDirection: 'row', gap: spacing.xs }}>
                <Sparkles color={palette.terracotta} size={14} style={{ marginTop: 3 }} />
                <Text
                  style={{
                    flex: 1,
                    color: palette.inkSoft,
                    fontFamily: typography.bodyRegular,
                    fontSize: 14,
                    lineHeight: 22,
                  }}
                >
                  {item}
                </Text>
              </View>
            ))}
          </View>
        </SunriseCard>

        {weather ? (
          <SunriseCard accent="info" title="Weather check before you act">
            <View style={{ gap: spacing.sm }}>
              <Text
                style={{
                  color: palette.ink,
                  fontFamily: typography.bodyStrong,
                  fontSize: 15,
                }}
              >
                {weather.advisories[0]?.title ?? weather.current.conditionLabel}
              </Text>
              <Text
                style={{
                  color: palette.inkSoft,
                  fontFamily: typography.bodyRegular,
                  fontSize: 14,
                  lineHeight: 22,
                }}
              >
                {weather.advisories[0]?.message ?? weather.fieldWindows.sprayWindow.summary}
              </Text>
            </View>
          </SunriseCard>
        ) : null}

        {errorMessage ? (
          <SunriseCard accent="danger" title="Sync issue">
            <Text
              style={{
                color: palette.inkSoft,
                fontFamily: typography.bodyRegular,
                fontSize: 14,
                lineHeight: 22,
              }}
            >
              {errorMessage}
            </Text>
          </SunriseCard>
        ) : null}

        <TaskActionBar
          primaryAction={{
            label: task.status === 'COMPLETED' ? 'Marked done' : 'Mark as done',
            onPress: handleMarkDone,
            disabled: task.status === 'COMPLETED',
            loading: isSaving,
          }}
          secondaryActions={[
            {
              label: 'Listen',
              variant: 'soft',
              icon: <Ear color={palette.ink} size={16} />,
              onPress: () => Speech.speak(listenCopy),
            },
            ...(featuredSeason
              ? [
                  {
                    label: 'Open weather',
                    variant: 'ghost' as const,
                    icon: <CloudSun color={palette.leaf} size={16} />,
                    onPress: () =>
                      router.push({
                        pathname: '/weather/[farmPlotId]',
                        params: { farmPlotId: featuredSeason.farmPlotId },
                      }),
                  },
                ]
              : []),
          ]}
        />

        <ProgressCelebrationSheet
          visible={celebrationVisible}
          title="Task completed"
          message="The crop plan has been updated. Keep moving through the live stage window while the field context is fresh."
          primaryLabel="Back to crop plan"
          onPrimaryPress={() => {
            setCelebrationVisible(false);
            router.back();
          }}
          secondaryLabel="Stay on this task"
          onSecondaryPress={() => setCelebrationVisible(false)}
          onClose={() => setCelebrationVisible(false)}
        />
      </PageShell>
    </>
  );
}
