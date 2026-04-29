import { Pressable, Text, View } from 'react-native';

import { CheckCircle2, Circle, Pencil, Trash2 } from 'lucide-react-native';

import type { HomeTaskEntry } from '@/lib/home-tasks';
import { palette, radii, shadow, spacing, typography } from '@/theme/tokens';

export function TaskCard({
  task,
  meta,
  onPress,
  onDelete,
  onToggleComplete,
}: {
  task: HomeTaskEntry;
  meta?: string;
  onPress?: () => void;
  onDelete?: () => void;
  onToggleComplete?: () => void;
}) {
  const content = (
    <View
      style={{
        minHeight: meta ? 72 : 58,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.sm,
        paddingVertical: 10,
        borderRadius: radii.xl,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: task.completed ? 'rgba(47, 125, 78, 0.18)' : palette.outline,
        backgroundColor: task.completed ? 'rgba(227, 240, 227, 0.72)' : palette.white,
        boxShadow: shadow.soft,
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 13,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: task.completed ? palette.white : palette.parchmentSoft,
        }}
      >
        <Pencil color={task.completed ? palette.leaf : palette.inkMuted} size={16} />
      </View>

      <View style={{ flex: 1, gap: meta ? 3 : 0 }}>
        <Text
          numberOfLines={1}
          style={{
            color: task.completed ? palette.inkMuted : palette.ink,
            fontFamily: typography.bodyStrong,
            fontSize: 14,
            textDecorationLine: task.completed ? 'line-through' : 'none',
          }}
        >
          {task.title}
        </Text>
        {meta ? (
          <Text
            numberOfLines={1}
            style={{
              color: palette.inkMuted,
              fontFamily: typography.bodyRegular,
              fontSize: 11,
            }}
          >
            {meta}
          </Text>
        ) : null}
      </View>

      {onDelete ? (
        <Pressable
          onPress={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          hitSlop={6}
          style={{
            width: 34,
            height: 34,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Trash2 color={palette.inkMuted} size={18} />
        </Pressable>
      ) : null}

      <Pressable
        onPress={(event) => {
          event.stopPropagation();
          onToggleComplete?.();
        }}
        hitSlop={6}
        style={{
          width: 34,
          height: 34,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {task.completed ? (
          <CheckCircle2 color={palette.leaf} size={22} />
        ) : (
          <Circle color={palette.inkMuted} size={22} />
        )}
      </Pressable>
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.97 : 1,
        transform: [{ scale: pressed ? 0.996 : 1 }],
      })}
    >
      {content}
    </Pressable>
  );
}
