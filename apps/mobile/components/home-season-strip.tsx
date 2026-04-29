import { Text, View } from 'react-native';

import { CloudSun, Sprout } from 'lucide-react-native';

import { InsetCard } from '@/components/inset-card';
import { MetricBadge } from '@/components/metric-badge';
import { palette, spacing, typography } from '@/theme/tokens';

export function HomeSeasonStrip({
  cropName,
  currentStage,
  daysSinceSowing,
  farmPlotName,
}: {
  cropName: string;
  currentStage: string;
  daysSinceSowing: number;
  farmPlotName: string;
}) {
  return (
    <InsetCard tone="neutral" padding={16}>
      <View style={{ gap: spacing.sm }}>
        <Text
          style={{
            color: palette.inkMuted,
            fontFamily: typography.bodyStrong,
            fontSize: 11,
            textTransform: 'uppercase',
          }}
        >
          {farmPlotName}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View
            style={{
              width: 38,
              height: 38,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 14,
              backgroundColor: palette.parchmentSoft,
            }}
          >
            <Sprout color={palette.leafDark} size={18} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text
              style={{
                color: palette.ink,
                fontFamily: typography.bodyStrong,
                fontSize: 20,
              }}
            >
              {cropName}
            </Text>
            <Text
              style={{
                color: palette.inkSoft,
                fontFamily: typography.bodyRegular,
                fontSize: 13,
              }}
            >
              Weekly farm actions
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <MetricBadge label={currentStage} tone="info" />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <CloudSun color={palette.leafDark} size={14} />
            <Text
              style={{
                color: palette.ink,
                fontFamily: typography.bodyStrong,
                fontSize: 13,
              }}
            >
              {daysSinceSowing} days from sowing
            </Text>
          </View>
        </View>
      </View>
    </InsetCard>
  );
}
