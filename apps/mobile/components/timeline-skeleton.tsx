import { View, type DimensionValue } from 'react-native';

import { SunriseCard } from '@/components/sunrise-card';
import { palette, radii, spacing } from '@/theme/tokens';

function SkeletonBlock({
  width,
  height = 12,
}: {
  width: DimensionValue;
  height?: number;
}) {
  return (
    <View
      style={{
        width,
        height,
        borderRadius: radii.pill,
        backgroundColor: 'rgba(24,34,23,0.08)',
      }}
    />
  );
}

export function TimelineSkeleton() {
  return (
    <View style={{ gap: spacing.md }}>
      <SunriseCard accent="soft" title="Loading season command center">
        <View style={{ gap: spacing.sm }}>
          <SkeletonBlock width="72%" height={14} />
          <SkeletonBlock width="100%" />
          <SkeletonBlock width="86%" />
        </View>
      </SunriseCard>
      <View
        style={{
          padding: spacing.lg,
          borderRadius: radii.xl,
          borderCurve: 'continuous',
          backgroundColor: palette.white,
          borderWidth: 1,
          borderColor: palette.outline,
          gap: spacing.md,
        }}
      >
        <SkeletonBlock width="38%" height={14} />
        <SkeletonBlock width="100%" />
        <SkeletonBlock width="78%" />
        <SkeletonBlock width="92%" />
      </View>
      <View
        style={{
          padding: spacing.lg,
          borderRadius: radii.xl,
          borderCurve: 'continuous',
          backgroundColor: palette.white,
          borderWidth: 1,
          borderColor: palette.outline,
          gap: spacing.md,
        }}
      >
        <SkeletonBlock width="46%" height={14} />
        <SkeletonBlock width="100%" />
        <SkeletonBlock width="84%" />
      </View>
    </View>
  );
}
