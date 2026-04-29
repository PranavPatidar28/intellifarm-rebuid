import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { Check, CheckCircle2, Sprout } from 'lucide-react-native';

import { CompactListCard } from '@/components/compact-list-card';
import { MetricBadge } from '@/components/metric-badge';
import type { TaskItem } from '@/lib/api-types';
import { formatShortDate } from '@/lib/format';
import { palette, radii, spacing, typography } from '@/theme/tokens';

export function TaskCard({
  task,
  onPress,
  onQuickComplete,
  quickCompleting = false,
}: {
  task: TaskItem;
  onPress?: () => void;
  onQuickComplete?: () => void;
  quickCompleting?: boolean;
}) {
  const badgeTone =
    task.priority === 'HIGH'
      ? 'danger'
      : task.priority === 'MEDIUM'
        ? 'warning'
        : 'success';

  const priorityLabel =
    task.priority === 'HIGH'
      ? 'Priority'
      : task.priority === 'MEDIUM'
        ? 'Plan soon'
        : 'Routine';

  const trailing = onQuickComplete && task.status !== 'COMPLETED'
    ? (
        <Pressable
          onPress={(event) => {
            event.stopPropagation();
            onQuickComplete();
          }}
          style={{
            width: 34,
            height: 34,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: radii.pill,
            borderWidth: 1,
            borderColor: palette.leaf,
            backgroundColor: palette.leafMist,
          }}
        >
          {quickCompleting ? (
            <ActivityIndicator color={palette.leafDark} size="small" />
          ) : (
            <Check color={palette.leafDark} size={16} />
          )}
        </Pressable>
      )
    : (
        <MetricBadge
          label={task.status === 'COMPLETED' ? 'Done' : priorityLabel}
          tone={task.status === 'COMPLETED' ? 'success' : badgeTone}
        />
      );

  return (
    <CompactListCard
      title={task.title}
      subtitle={task.description}
      meta={`Due ${formatShortDate(task.dueDate)}`}
      onPress={onPress}
      tone={task.priority === 'HIGH' ? 'alert' : task.priority === 'MEDIUM' ? 'soft' : 'neutral'}
      prefix={
        task.status === 'COMPLETED' ? (
          <CheckCircle2 color={palette.leaf} size={20} />
        ) : (
          <Sprout color={palette.leafDark} size={18} />
        )
      }
      trailing={trailing}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
        {task.status === 'COMPLETED' ? (
          <MetricBadge label="Done" tone="success" />
        ) : task.priority !== 'LOW' ? (
          <MetricBadge label={priorityLabel} tone={badgeTone} />
        ) : null}
        {onQuickComplete && task.status !== 'COMPLETED' ? (
          <Text
            style={{
              color: palette.inkMuted,
              fontFamily: typography.bodyRegular,
              fontSize: 11,
            }}
          >
            Tap the check to complete quickly
          </Text>
        ) : null}
      </View>
    </CompactListCard>
  );
}
