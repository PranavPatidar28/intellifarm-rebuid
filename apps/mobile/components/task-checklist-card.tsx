import { Pressable, Text, View } from 'react-native';

import { ArrowUpRight, CheckCircle2, Circle, Clock3 } from 'lucide-react-native';

import { SunriseCard } from '@/components/sunrise-card';
import type { TaskItem } from '@/lib/api-types';
import { formatShortDate } from '@/lib/format';
import { palette, radii, spacing, typography } from '@/theme/tokens';

export function TaskChecklistCard({
  title,
  eyebrow,
  accent = 'soft',
  tasks,
  emptyLabel,
  onTaskPress,
}: {
  title: string;
  eyebrow?: string;
  accent?: 'brand' | 'info' | 'danger' | 'warning' | 'scheme' | 'soft';
  tasks: TaskItem[];
  emptyLabel?: string;
  onTaskPress?: (task: TaskItem) => void;
}) {
  return (
    <SunriseCard accent={accent} title={title} eyebrow={eyebrow}>
      {tasks.length ? (
        <View style={{ gap: spacing.sm }}>
          {tasks.map((task) => (
            <Pressable
              key={task.id}
              onPress={() => onTaskPress?.(task)}
              style={{
                padding: spacing.md,
                borderRadius: radii.lg,
                borderCurve: 'continuous',
                backgroundColor: 'rgba(255,255,255,0.86)',
                borderWidth: 1,
                borderColor: palette.outline,
                gap: spacing.xs,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: spacing.md,
                }}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <Text
                    style={{
                      color: palette.ink,
                      fontFamily: typography.bodyStrong,
                      fontSize: 15,
                    }}
                  >
                    {task.title}
                  </Text>
                  <Text
                    style={{
                      color: palette.inkSoft,
                      fontFamily: typography.bodyRegular,
                      fontSize: 13,
                      lineHeight: 19,
                    }}
                  >
                    {task.description}
                  </Text>
                </View>
                {task.status === 'COMPLETED' ? (
                  <CheckCircle2 color={palette.leaf} size={20} />
                ) : task.status === 'OVERDUE' ? (
                  <Clock3 color={palette.terracotta} size={20} />
                ) : (
                  <Circle color={palette.inkMuted} size={18} />
                )}
              </View>

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
                    color: palette.inkMuted,
                    fontFamily: typography.bodyStrong,
                    fontSize: 11,
                  }}
                >
                  Due {formatShortDate(task.dueDate)}
                </Text>
                <ArrowUpRight color={palette.inkMuted} size={16} />
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <Text
          style={{
            color: palette.inkSoft,
            fontFamily: typography.bodyRegular,
            fontSize: 14,
            lineHeight: 21,
          }}
        >
          {emptyLabel ?? 'No tasks are in this checklist right now.'}
        </Text>
      )}
    </SunriseCard>
  );
}
