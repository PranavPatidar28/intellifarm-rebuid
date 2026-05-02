import { useEffect, type ComponentType } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { MotionPressable } from '@/components/motion-pressable';
import { motion, motionEasing, useReducedMotionPreference } from '@/theme/motion';
import { palette, typography } from '@/theme/tokens';

type NavItem = {
  key: string;
  label: string;
  icon: ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  active: boolean;
  hero?: boolean;
  onPress: () => void;
};

export function BottomPillNav({ items }: { items: NavItem[] }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        backgroundColor: palette.white,
        borderTopColor: 'rgba(30, 42, 34, 0.08)',
        borderTopWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingBottom: Math.max(insets.bottom, 8),
        paddingHorizontal: 12,
        paddingTop: 8,
      }}
    >
      {items.map((item) => (
        <BottomPillNavItem key={item.key} item={item} />
      ))}
    </View>
  );
}

function BottomPillNavItem({ item }: { item: NavItem }) {
  const Icon = item.icon;
  const prefersReducedMotion = useReducedMotionPreference();
  const activeProgress = useSharedValue(item.active ? 1 : 0);
  const isHero = item.hero;
  const textColor = item.active ? palette.leafDark : '#4B4E54';

  useEffect(() => {
    if (prefersReducedMotion) {
      activeProgress.value = item.active ? 1 : 0;
      return;
    }

    activeProgress.value = withTiming(item.active ? 1 : 0, {
      duration: motion.duration.tab,
      easing: motionEasing.standard,
    });
  }, [activeProgress, item.active, prefersReducedMotion]);

  const indicatorStyle = useAnimatedStyle(() => {
    return {
      opacity: activeProgress.value,
      transform: [{ scaleX: interpolate(activeProgress.value, [0, 1], [0.7, 1]) }],
    };
  });

  const heroIconStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(
        activeProgress.value,
        [0, 1],
        ['rgba(78, 78, 78, 0.07)', palette.leafDark],
      ),
      transform: [{ scale: interpolate(activeProgress.value, [0, 1], [0.96, 1]) }],
    };
  });

  return (
    <MotionPressable
      hitSlop={8}
      onPress={item.onPress}
      style={{
        width: isHero ? 80 : 68,
      }}
      contentStyle={{
        alignItems: 'center',
        gap: 4,
        height: 58,
        justifyContent: 'flex-end',
      }}
      duration={motion.duration.tab}
      pressedOpacity={0.97}
      pressedScale={0.99}
    >
      {!isHero ? (
        <Animated.View
          style={[
            {
              backgroundColor: palette.leafDark,
              borderRadius: 5,
              height: 3,
              marginBottom: 2,
              width: 28,
            },
            indicatorStyle,
          ]}
        />
      ) : (
        <View style={{ height: 5 }} />
      )}

      {isHero ? (
        <View
          style={{
            alignItems: 'center',
            marginTop: -18,
          }}
        >
          <View
            style={{
              backgroundColor: palette.white,
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
              height: 18,
              marginBottom: -10,
              width: 58,
            }}
          />
          <Animated.View
            style={[
              {
                alignItems: 'center',
                borderColor: palette.white,
                borderRadius: 999,
                borderCurve: 'continuous',
                borderWidth: 4,
                boxShadow: item.active
                  ? '0 10px 22px rgba(6, 95, 70, 0.24)'
                  : '0 8px 18px rgba(31, 46, 36, 0.14)',
                justifyContent: 'center',
                padding: 12,
              },
              heroIconStyle,
            ]}
          >
            <Icon
              color={item.active ? palette.white : palette.leafDark}
              size={24}
              strokeWidth={2.2}
            />
          </Animated.View>
        </View>
      ) : (
        <Icon color={textColor} size={22} strokeWidth={item.active ? 2.4 : 2.1} />
      )}

      {isHero ? null : (
        <Text
          style={{
            color: textColor,
            fontFamily: item.active ? typography.bodyStrong : typography.bodyRegular,
            fontSize: 11,
            lineHeight: 16,
            textAlign: 'center',
          }}
        >
          {item.label}
        </Text>
      )}
    </MotionPressable>
  );
}
