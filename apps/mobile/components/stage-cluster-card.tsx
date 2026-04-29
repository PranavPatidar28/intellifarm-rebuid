import { useEffect, useRef, useState } from 'react';
import {
  LayoutAnimation,
  Pressable,
  Text,
  UIManager,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { ChevronDown, CheckCircle2, Clock3, Sparkles } from 'lucide-react-native';

import { StageStatusPill } from '@/components/stage-status-pill';
import type { TaskItem, TimelineStage } from '@/lib/api-types';
import type { StageVisualState } from '@/lib/crop-plan';
import { formatShortDate } from '@/lib/format';
import { palette, radii, shadow, spacing, typography } from '@/theme/tokens';

if (UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function StageClusterCard({
  stage,
  status,
  summary,
  highlights,
  tasks = [],
  footerLabel,
  expanded,
  onToggle,
  onTaskPress,
}: {
  stage: TimelineStage;
  status: StageVisualState;
  summary: string;
  highlights: string[];
  tasks?: TaskItem[];
  footerLabel?: string;
  expanded?: boolean;
  onToggle?: () => void;
  onTaskPress?: (task: TaskItem) => void;
}) {
  const [internalExpanded, setInternalExpanded] = useState(status === 'current');
  const controlled = expanded ?? internalExpanded;
  const detailHeight = useRef(0);
  const [measuredHeight, setMeasuredHeight] = useState(220);

  useEffect(() => {
    if (expanded == null) {
      setInternalExpanded(status === 'current');
    }
  }, [expanded, status]);

  const handleToggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (onToggle) {
      onToggle();
      return;
    }

    setInternalExpanded((current) => !current);
  };

  const tone =
    status === 'completed'
      ? {
          backgroundColor: 'rgba(235,247,239,0.96)',
          borderColor: 'rgba(31,107,72,0.14)',
        }
      : status === 'current'
        ? {
            backgroundColor: 'rgba(255,250,238,0.98)',
            borderColor: 'rgba(214,162,76,0.24)',
          }
        : {
            backgroundColor: 'rgba(255,255,255,0.94)',
            borderColor: palette.outline,
          };

  const measureContent = (event: LayoutChangeEvent) => {
    const nextHeight = Math.ceil(event.nativeEvent.layout.height);
    if (nextHeight && nextHeight !== detailHeight.current) {
      detailHeight.current = nextHeight;
      setMeasuredHeight(nextHeight);
    }
  };

  return (
    <View
      style={{
        borderRadius: radii.xl,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: tone.borderColor,
        backgroundColor: tone.backgroundColor,
        boxShadow: shadow.soft,
        overflow: 'hidden',
      }}
    >
      <Pressable
        onPress={handleToggle}
        style={{
          padding: spacing.lg,
          gap: spacing.sm,
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
          <View style={{ flex: 1, gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <StageStatusPill status={status} />
              <Text
                style={{
                  color: palette.inkMuted,
                  fontFamily: typography.bodyRegular,
                  fontSize: 12,
                }}
              >
                Day {stage.startDay}–{stage.endDay}
              </Text>
            </View>
            <Text
              style={{
                color: palette.ink,
                fontFamily: typography.display,
                fontSize: 21,
              }}
            >
              {stage.labelEn}
            </Text>
            <Text
              style={{
                color: palette.inkSoft,
                fontFamily: typography.bodyRegular,
                fontSize: 14,
                lineHeight: 21,
              }}
            >
              {summary}
            </Text>
          </View>

          <View
            style={{
              width: 42,
              height: 42,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radii.pill,
              backgroundColor: 'rgba(255,255,255,0.66)',
            }}
          >
            <ChevronDown
              color={palette.ink}
              size={18}
              style={{ transform: [{ rotate: controlled ? '180deg' : '0deg' }] }}
            />
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {highlights.slice(0, controlled ? highlights.length : 2).map((highlight) => (
            <View
              key={`${stage.id}-${highlight}`}
              style={{
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
                borderRadius: radii.pill,
                backgroundColor: 'rgba(255,255,255,0.74)',
              }}
            >
              <Text
                style={{
                  color: palette.inkSoft,
                  fontFamily: typography.bodyStrong,
                  fontSize: 12,
                }}
              >
                {highlight}
              </Text>
            </View>
          ))}
        </View>
      </Pressable>

      <View
        style={{
          position: 'absolute',
          left: spacing.lg,
          right: spacing.lg,
          opacity: 0,
          pointerEvents: 'none',
        }}
        onLayout={measureContent}
      >
        <StageClusterDetails
          tasks={tasks}
          footerLabel={footerLabel}
          onTaskPress={onTaskPress}
        />
      </View>

      <View
        style={{
          maxHeight: controlled ? measuredHeight + spacing.md : 0,
          opacity: controlled ? 1 : 0,
          overflow: 'hidden',
          paddingHorizontal: spacing.lg,
          paddingBottom: controlled ? spacing.lg : 0,
        }}
      >
        <StageClusterDetails
          tasks={tasks}
          footerLabel={footerLabel}
          onTaskPress={onTaskPress}
        />
      </View>
    </View>
  );
}

function StageClusterDetails({
  tasks,
  footerLabel,
  onTaskPress,
}: {
  tasks: TaskItem[];
  footerLabel?: string;
  onTaskPress?: (task: TaskItem) => void;
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      {tasks.length ? (
        <View style={{ gap: spacing.sm }}>
          <Text
            style={{
              color: palette.inkMuted,
              fontFamily: typography.bodyStrong,
              fontSize: 12,
              textTransform: 'uppercase',
            }}
          >
            Live tasks in this window
          </Text>
          {tasks.map((task) => (
            <Pressable
              key={task.id}
              onPress={() => onTaskPress?.(task)}
              style={{
                padding: spacing.md,
                borderRadius: radii.lg,
                borderCurve: 'continuous',
                backgroundColor: 'rgba(255,255,255,0.84)',
                borderWidth: 1,
                borderColor: palette.outline,
                gap: spacing.xs,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  gap: spacing.md,
                }}
              >
                <Text
                  style={{
                    flex: 1,
                    color: palette.ink,
                    fontFamily: typography.bodyStrong,
                    fontSize: 14,
                  }}
                >
                  {task.title}
                </Text>
                {task.status === 'COMPLETED' ? (
                  <CheckCircle2 color={palette.leaf} size={18} />
                ) : (
                  <Clock3 color={palette.mustard} size={18} />
                )}
              </View>
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
              <Text
                style={{
                  color: palette.inkMuted,
                  fontFamily: typography.bodyStrong,
                  fontSize: 11,
                }}
              >
                Due {formatShortDate(task.dueDate)}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {footerLabel ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            paddingTop: tasks.length ? 0 : spacing.xs,
          }}
        >
          <Sparkles color={palette.inkSoft} size={14} />
          <Text
            style={{
              color: palette.inkSoft,
              fontFamily: typography.bodyRegular,
              fontSize: 13,
              lineHeight: 19,
            }}
          >
            {footerLabel}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
