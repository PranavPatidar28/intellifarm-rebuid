import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Stack, useRouter } from 'expo-router';
import { Plus, Sparkles, Trash2 } from 'lucide-react-native';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { InsetCard } from '@/components/inset-card';
import { MetricBadge } from '@/components/metric-badge';
import { PageShell } from '@/components/page-shell';
import { SectionTitle } from '@/components/section-title';
import { TaskCard } from '@/components/task-card';
import { formatRelativeTime } from '@/lib/format';
import { storageKeys } from '@/lib/constants';
import {
  clearCompletedHomeTasks,
  deleteHomeTask,
  getOrderedHomeTasks,
  readHomeTasks,
  toggleHomeTask,
} from '@/lib/home-tasks';
import { useStoredValue } from '@/lib/storage';
import { palette, radii, spacing, typography } from '@/theme/tokens';

type TaskFilter = 'all' | 'open' | 'completed';

const filterOptions: Array<{
  value: TaskFilter;
  label: string;
}> = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'completed', label: 'Done' },
];

export default function PersonalTasksRoute() {
  const router = useRouter();
  const [tasks] = useStoredValue(storageKeys.homeTasks, readHomeTasks());
  const [filter, setFilter] = useState<TaskFilter>('all');

  const orderedTasks = useMemo(() => getOrderedHomeTasks(tasks), [tasks]);
  const openTasks = useMemo(
    () => orderedTasks.filter((task) => !task.completed),
    [orderedTasks],
  );
  const completedTasks = useMemo(
    () => orderedTasks.filter((task) => task.completed),
    [orderedTasks],
  );
  const latestTask = orderedTasks[0] ?? null;

  const visibleSections = useMemo(() => {
    if (filter === 'open') {
      return openTasks.length
        ? [{ key: 'open', title: 'Open tasks', tasks: openTasks }]
        : [];
    }

    if (filter === 'completed') {
      return completedTasks.length
        ? [{ key: 'completed', title: 'Completed tasks', tasks: completedTasks }]
        : [];
    }

    return [
      ...(openTasks.length
        ? [{ key: 'open', title: 'Open tasks', tasks: openTasks }]
        : []),
      ...(completedTasks.length
        ? [{ key: 'completed', title: 'Completed tasks', tasks: completedTasks }]
        : []),
    ];
  }, [completedTasks, filter, openTasks]);
  const hasVisibleTasks = visibleSections.length > 0;

  return (
    <>
      <Stack.Screen options={{ title: 'Your tasks' }} />
      <PageShell
        eyebrow="Personal planner"
        title="Your tasks"
        subtitle="Capture quick reminders, keep the important ones visible, and close them out from one place."
        heroTone="sunrise"
        hero={
          <InsetCard tone="feature" padding={16}>
            <View style={{ gap: spacing.md }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: spacing.md,
                }}
              >
                <View style={{ flex: 1, gap: spacing.sm }}>
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: palette.white,
                    }}
                  >
                    <Sparkles color={palette.leafDark} size={18} />
                  </View>
                  <View style={{ gap: 4 }}>
                    <Text
                      style={{
                        color: palette.ink,
                        fontFamily: typography.bodyStrong,
                        fontSize: 17,
                        lineHeight: 22,
                      }}
                    >
                      {openTasks.length
                        ? `${openTasks.length} task${openTasks.length === 1 ? '' : 's'} still need attention`
                        : 'Everything on your list is wrapped up'}
                    </Text>
                    <Text
                      style={{
                        color: palette.inkSoft,
                        fontFamily: typography.bodyRegular,
                        fontSize: 12,
                        lineHeight: 18,
                      }}
                    >
                      {latestTask
                        ? `Last updated ${formatRelativeTime(latestTask.updatedAt)}. Tap a task to rename it or use the circle to mark it done.`
                        : 'Add short reminders for scouting, payments, market follow-ups, or anything you do not want to miss.'}
                    </Text>
                  </View>
                </View>

                <View style={{ alignItems: 'flex-end', gap: spacing.xs }}>
                  <MetricBadge
                    label={`${openTasks.length} open`}
                    tone={openTasks.length ? 'warning' : 'success'}
                  />
                  <MetricBadge
                    label={`${completedTasks.length} done`}
                    tone={completedTasks.length ? 'success' : 'neutral'}
                  />
                </View>
              </View>
            </View>
          </InsetCard>
        }
      >
        <Button
          label="Add a new task"
          icon={<Plus color={palette.white} size={16} />}
          onPress={() =>
            router.push({
              pathname: '/personal-task/[id]',
              params: { id: 'new' },
            } as never)
          }
        />

        <InsetCard tone="soft" padding={14}>
          <View style={{ gap: spacing.sm }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: spacing.md,
              }}
            >
              <Text
                style={{
                  color: palette.ink,
                  fontFamily: typography.bodyStrong,
                  fontSize: 14,
                }}
              >
                Show
              </Text>

              {completedTasks.length ? (
                <Pressable
                  onPress={() => {
                    clearCompletedHomeTasks();
                    if (filter === 'completed') {
                      setFilter('all');
                    }
                  }}
                  style={{
                    minHeight: 32,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: spacing.sm,
                    borderRadius: radii.pill,
                    borderWidth: 1,
                    borderColor: palette.outline,
                    backgroundColor: palette.white,
                  }}
                >
                  <Trash2 color={palette.inkMuted} size={14} />
                  <Text
                    style={{
                      color: palette.inkSoft,
                      fontFamily: typography.bodyStrong,
                      fontSize: 12,
                    }}
                  >
                    Clear done
                  </Text>
                </Pressable>
              ) : null}
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {filterOptions.map((option) => {
                const active = option.value === filter;
                const count =
                  option.value === 'all'
                    ? orderedTasks.length
                    : option.value === 'open'
                      ? openTasks.length
                      : completedTasks.length;

                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setFilter(option.value)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: spacing.md,
                      paddingVertical: 10,
                      borderRadius: radii.pill,
                      borderWidth: 1,
                      borderColor: active ? palette.leaf : palette.outline,
                      backgroundColor: active ? palette.leaf : palette.white,
                    }}
                  >
                    <Text
                      style={{
                        color: active ? palette.white : palette.inkSoft,
                        fontFamily: active ? typography.bodyStrong : typography.bodyRegular,
                        fontSize: 13,
                      }}
                    >
                      {option.label}
                    </Text>
                    <View
                      style={{
                        minWidth: 22,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: radii.pill,
                        backgroundColor: active
                          ? 'rgba(255,255,255,0.16)'
                          : palette.parchmentSoft,
                      }}
                    >
                      <Text
                        style={{
                          color: active ? palette.white : palette.inkMuted,
                          fontFamily: typography.bodyStrong,
                          fontSize: 11,
                          textAlign: 'center',
                        }}
                      >
                        {count}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </InsetCard>

        {orderedTasks.length ? (
          hasVisibleTasks ? (
            visibleSections.map((section) => (
              <View key={section.key} style={{ gap: spacing.sm }}>
                <SectionTitle
                  title={section.title}
                  action={
                    <MetricBadge
                      label={`${section.tasks.length} item${section.tasks.length === 1 ? '' : 's'}`}
                      tone={section.key === 'completed' ? 'success' : 'warning'}
                    />
                  }
                />
                <View style={{ gap: spacing.sm }}>
                  {section.tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      meta={
                        task.completed
                          ? `Finished ${formatRelativeTime(task.updatedAt)}`
                          : `Updated ${formatRelativeTime(task.updatedAt)}`
                      }
                      onPress={() =>
                        router.push({
                          pathname: '/personal-task/[id]',
                          params: { id: task.id },
                        } as never)
                      }
                      onDelete={() => {
                        deleteHomeTask(task.id);
                      }}
                      onToggleComplete={() => {
                        toggleHomeTask(task.id);
                      }}
                    />
                  ))}
                </View>
              </View>
            ))
          ) : (
            <EmptyState
              title={filter === 'completed' ? 'No completed tasks' : 'No open tasks'}
              description={
                filter === 'completed'
                  ? 'Finish a few reminders and they will collect here for quick review.'
                  : 'Everything is wrapped up right now. Switch back to all tasks or add a new reminder.'
              }
            />
          )
        ) : (
          <View style={{ gap: spacing.md }}>
            <EmptyState
              title="No tasks yet"
              description="Start with small reminders like calling the mandi, paying labour, or checking one plot tomorrow morning."
            />
            <Button
              label="Add your first task"
              icon={<Plus color={palette.white} size={16} />}
              onPress={() =>
                router.push({
                  pathname: '/personal-task/[id]',
                  params: { id: 'new' },
                } as never)
              }
            />
          </View>
        )}

        {orderedTasks.length ? (
          <InsetCard tone="neutral" padding={14}>
            <Text
              style={{
                color: palette.inkSoft,
                fontFamily: typography.bodyRegular,
                fontSize: 12,
                lineHeight: 18,
              }}
            >
              Tap a task row to rename it, use the circle to mark it done, and use the bin icon to remove reminders you no longer need.
            </Text>
          </InsetCard>
        ) : null}
      </PageShell>
    </>
  );
}
