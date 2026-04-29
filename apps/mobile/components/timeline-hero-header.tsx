import { Text, View } from 'react-native';

import { CloudSun, Droplets, Sparkles } from 'lucide-react-native';

import { GlassPanel } from '@/components/glass-panel';
import { GradientFeatureCard } from '@/components/gradient-feature-card';
import { SeasonProgressRing } from '@/components/season-progress-ring';
import { palette, radii, spacing, typography } from '@/theme/tokens';

type HeroMetric = {
  label: string;
  value: string;
  icon?: 'weather' | 'water' | 'spark';
};

export function TimelineHeroHeader({
  cropName,
  stageLabel,
  farmLabel,
  progress,
  daysSinceSowing,
  totalDays,
  stageDay,
  stageLength,
  metrics,
  supportTitle,
  supportBody,
  colors,
}: {
  cropName: string;
  stageLabel: string;
  farmLabel: string;
  progress: number;
  daysSinceSowing: number;
  totalDays: number;
  stageDay: number;
  stageLength: number;
  metrics: HeroMetric[];
  supportTitle?: string;
  supportBody?: string;
  colors: readonly [string, string, string] | readonly [string, string];
}) {
  return (
    <GradientFeatureCard colors={colors} padding={24}>
      <View style={{ gap: spacing.md }}>
        <View
          style={{
            position: 'absolute',
            right: -36,
            top: -28,
            width: 160,
            height: 160,
            borderRadius: radii.pill,
            backgroundColor: 'rgba(255,255,255,0.10)',
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: -28,
            bottom: -56,
            width: 180,
            height: 120,
            borderRadius: radii.pill,
            backgroundColor: 'rgba(255,232,176,0.10)',
          }}
        />

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: spacing.md,
          }}
        >
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text
              style={{
                color: 'rgba(255,255,255,0.76)',
                fontFamily: typography.bodyStrong,
                fontSize: 12,
                textTransform: 'uppercase',
              }}
            >
              {cropName} • {farmLabel}
            </Text>
            <Text
              style={{
                color: palette.white,
                fontFamily: typography.displayBold,
                fontSize: 28,
                lineHeight: 33,
              }}
            >
              {stageLabel}
            </Text>
            <Text
              style={{
                color: 'rgba(255,255,255,0.84)',
                fontFamily: typography.bodyRegular,
                fontSize: 14,
                lineHeight: 21,
              }}
            >
              Day {stageDay} of {stageLength} in this stage • Day {daysSinceSowing} of {totalDays}{' '}
              from sowing
            </Text>
          </View>

          <SeasonProgressRing
            progress={progress}
            label="journey"
            valueLabel={`${Math.round(progress * 100)}%`}
            subtitle="season done"
            size={122}
          />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {metrics.map((metric) => (
            <View
              key={`${metric.label}-${metric.value}`}
              style={{
                minWidth: 110,
                flex: 1,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: radii.lg,
                borderCurve: 'continuous',
                backgroundColor: 'rgba(255,255,255,0.14)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.12)',
                gap: 3,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {metric.icon === 'weather' ? (
                  <CloudSun color={palette.white} size={14} />
                ) : metric.icon === 'water' ? (
                  <Droplets color={palette.white} size={14} />
                ) : (
                  <Sparkles color={palette.white} size={14} />
                )}
                <Text
                  style={{
                    color: 'rgba(255,255,255,0.74)',
                    fontFamily: typography.bodyStrong,
                    fontSize: 11,
                    textTransform: 'uppercase',
                  }}
                >
                  {metric.label}
                </Text>
              </View>
              <Text
                style={{
                  color: palette.white,
                  fontFamily: typography.bodyStrong,
                  fontSize: 15,
                }}
              >
                {metric.value}
              </Text>
            </View>
          ))}
        </View>

        {supportTitle || supportBody ? (
          <GlassPanel padding={16}>
            <View style={{ gap: 4 }}>
              {supportTitle ? (
                <Text
                  style={{
                    color: palette.white,
                    fontFamily: typography.bodyStrong,
                    fontSize: 14,
                  }}
                >
                  {supportTitle}
                </Text>
              ) : null}
              {supportBody ? (
                <Text
                  style={{
                    color: 'rgba(255,255,255,0.86)',
                    fontFamily: typography.bodyRegular,
                    fontSize: 13,
                    lineHeight: 19,
                  }}
                >
                  {supportBody}
                </Text>
              ) : null}
            </View>
          </GlassPanel>
        ) : null}
      </View>
    </GradientFeatureCard>
  );
}
