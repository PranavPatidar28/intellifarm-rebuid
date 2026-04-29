import { useEffect, useRef } from 'react';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';

import { Check, Sprout } from 'lucide-react-native';

import type { TimelineStage } from '@/lib/api-types';
import { getStageVisualState } from '@/lib/crop-plan';
import { palette, radii, shadow, spacing, typography } from '@/theme/tokens';

const ITEM_WIDTH = 100;
const DOT_SIZE = 30;

export function MilestoneRail({
  stages,
  currentIndex,
  progress,
  selectedStageId,
  onSelect,
}: {
  stages: TimelineStage[];
  currentIndex: number;
  progress: number;
  selectedStageId?: string;
  onSelect?: (stageId: string) => void;
}) {
  const clamped = Math.max(0, Math.min(1, progress));
  const lineWidth = Math.max(0, (stages.length - 1) * ITEM_WIDTH);
  const fill = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fill, {
      toValue: clamped,
      duration: 650,
      useNativeDriver: false,
    }).start();
  }, [clamped, fill]);

  const width = fill.interpolate({
    inputRange: [0, 1],
    outputRange: [0, lineWidth],
  });

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: spacing.xs,
      }}
    >
      <View
        style={{
          minHeight: 110,
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            position: 'absolute',
            top: DOT_SIZE / 2 - 2,
            left: DOT_SIZE / 2,
            width: lineWidth,
            height: 4,
            borderRadius: radii.pill,
            backgroundColor: 'rgba(255,255,255,0.54)',
          }}
        />
        <Animated.View
          style={{
            position: 'absolute',
            top: DOT_SIZE / 2 - 2,
            left: DOT_SIZE / 2,
            width,
            height: 4,
            borderRadius: radii.pill,
            backgroundColor: palette.mustard,
          }}
        />

        <View style={{ flexDirection: 'row' }}>
          {stages.map((stage, index) => {
            const state = getStageVisualState(index, currentIndex);
            const selected = selectedStageId === stage.id;

            return (
              <Pressable
                key={stage.id}
                onPress={() => onSelect?.(stage.id)}
                style={{
                  width: ITEM_WIDTH,
                  gap: spacing.xs,
                }}
              >
                <View
                  style={{
                    width: DOT_SIZE,
                    height: DOT_SIZE,
                    borderRadius: radii.pill,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor:
                      state === 'completed'
                        ? palette.leaf
                        : state === 'current'
                          ? palette.mustard
                          : 'rgba(255,255,255,0.88)',
                    borderWidth: selected ? 2 : 1,
                    borderColor: selected
                      ? palette.midnight
                      : state === 'upcoming'
                        ? palette.outline
                        : 'transparent',
                    boxShadow: selected ? shadow.soft : undefined,
                  }}
                >
                  {state === 'completed' ? (
                    <Check color={palette.white} size={16} />
                  ) : (
                    <Sprout
                      color={state === 'upcoming' ? palette.leaf : palette.white}
                      size={15}
                    />
                  )}
                </View>
                <View style={{ gap: 2, paddingRight: spacing.sm }}>
                  <Text
                    numberOfLines={2}
                    style={{
                      color: selected ? palette.ink : palette.inkSoft,
                      fontFamily: selected ? typography.bodyStrong : typography.body,
                      fontSize: 13,
                      lineHeight: 18,
                    }}
                  >
                    {stage.labelEn}
                  </Text>
                  <Text
                    style={{
                      color: palette.inkMuted,
                      fontFamily: typography.bodyRegular,
                      fontSize: 11,
                    }}
                  >
                    Day {stage.startDay}-{stage.endDay}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}
