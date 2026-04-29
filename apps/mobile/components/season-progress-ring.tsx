import { useEffect, useMemo, useRef } from 'react';
import { Animated, Text, View } from 'react-native';

import { CheckCircle2, Sparkles } from 'lucide-react-native';

import { palette, radii, shadow, spacing, typography } from '@/theme/tokens';

export function SeasonProgressRing({
  progress,
  label,
  valueLabel,
  subtitle,
  size = 126,
}: {
  progress: number;
  label: string;
  valueLabel?: string;
  subtitle?: string;
  size?: number;
}) {
  const clamped = Math.max(0, Math.min(1, progress));
  const scale = useRef(new Animated.Value(0.92)).current;
  const dotCount = 28;
  const activeDots = Math.max(1, Math.round(clamped * dotCount));
  const radius = size / 2 - 12;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 7,
      tension: 70,
      useNativeDriver: true,
    }).start();
  }, [scale, clamped]);

  const dots = useMemo(
    () =>
      Array.from({ length: dotCount }, (_, index) => {
        const angle = (index / dotCount) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        return { x, y };
      }),
    [dotCount, radius],
  );

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <View
        style={{
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {dots.map((dot, index) => {
          const filled = index < activeDots;

          return (
            <View
              key={`progress-dot-${index}`}
              style={{
                position: 'absolute',
                width: filled ? 10 : 8,
                height: filled ? 10 : 8,
                borderRadius: radii.pill,
                left: size / 2 + dot.x - (filled ? 5 : 4),
                top: size / 2 + dot.y - (filled ? 5 : 4),
                backgroundColor: filled ? palette.mustardSoft : 'rgba(255,255,255,0.28)',
                borderWidth: filled ? 0 : 1,
                borderColor: 'rgba(255,255,255,0.22)',
              }}
            />
          );
        })}

        <View
          style={{
            width: size - 38,
            height: size - 38,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: radii.pill,
            backgroundColor: 'rgba(255,255,255,0.16)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.18)',
            boxShadow: shadow.soft,
            gap: 2,
          }}
        >
          {clamped >= 1 ? (
            <CheckCircle2 color={palette.white} size={18} />
          ) : (
            <Sparkles color={palette.white} size={18} />
          )}
          <Text
            style={{
              color: palette.white,
              fontFamily: typography.displayBold,
              fontSize: 22,
            }}
          >
            {valueLabel ?? `${Math.round(clamped * 100)}%`}
          </Text>
          <Text
            style={{
              color: 'rgba(255,255,255,0.84)',
              fontFamily: typography.bodyStrong,
              fontSize: 11,
              textTransform: 'uppercase',
            }}
          >
            {label}
          </Text>
          {subtitle ? (
            <Text
              style={{
                color: 'rgba(255,255,255,0.76)',
                fontFamily: typography.bodyRegular,
                fontSize: 11,
              }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}
