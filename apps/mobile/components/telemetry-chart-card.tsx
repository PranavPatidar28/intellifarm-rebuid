import { useMemo } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

import type { FarmDeviceResponse } from '@/lib/api-types';
import { palette, radii, spacing, typography } from '@/theme/tokens';
import { InsetCard } from './inset-card';

interface TelemetryChartCardProps {
  telemetry: FarmDeviceResponse['telemetry'];
  thresholds?: NonNullable<FarmDeviceResponse['device']>['thresholds'] | null;
}

export function TelemetryChartCard({
  telemetry,
  thresholds = null,
}: TelemetryChartCardProps) {
  const { width } = useWindowDimensions();
  const chartData = useMemo(() => {
    if (!telemetry || telemetry.length === 0) {
      return null;
    }

    const recent = telemetry.slice(-18);

    const labels = recent.map((_, i) => {
      if (i === 0) return 'Earlier';
      if (i === recent.length - 1) return 'Now';
      return '';
    });

    const datasets: any[] = [
      {
        data: recent.map((point) => point.soilMoisturePercent),
        color: (opacity = 1) => `rgba(30, 94, 59, ${opacity})`,
        strokeWidth: 2.5,
      },
    ];

    if (thresholds) {
      datasets.push({
        data: recent.map(() => thresholds.lowThreshold),
        color: (opacity = 1) => `rgba(200, 50, 50, ${opacity * 0.4})`, // subtle red line
        strokeWidth: 1.5,
        withDots: false,
      });
    }

    return {
      labels,
      datasets,
    };
  }, [telemetry, thresholds]);

  const hiddenIndices = useMemo(() => {
    if (!chartData || chartData.datasets[0].data.length <= 1) return [];
    return Array.from({ length: chartData.datasets[0].data.length - 1 }, (_, i) => i);
  }, [chartData]);

  if (!chartData) {
    return (
      <InsetCard tone="soft">
        <View style={{ gap: spacing.xs }}>
          <Text
            style={{
              color: palette.ink,
              fontFamily: typography.bodyStrong,
              fontSize: 16,
            }}
          >
            Trend
          </Text>
          <Text
            style={{
              color: palette.inkSoft,
              fontFamily: typography.bodyRegular,
              fontSize: 12,
              lineHeight: 18,
            }}
          >
            No moisture trend yet.
          </Text>
        </View>
      </InsetCard>
    );
  }

  const chartWidth = Math.max(width - spacing.lg * 2 - 40, 220);
  const thresholdLabel = thresholds
    ? `Start ${Math.round(thresholds.lowThreshold)}% | Recover ${Math.round(
        thresholds.recoveryThreshold,
      )}%`
    : null;

  return (
    <InsetCard tone="soft">
      <View style={{ gap: spacing.sm }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: spacing.sm,
          }}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text
              style={{
                color: palette.ink,
                fontFamily: typography.bodyStrong,
                fontSize: 16,
              }}
            >
              Trend
            </Text>
            <Text
              style={{
                color: palette.inkSoft,
                fontFamily: typography.bodyRegular,
                fontSize: 12,
              }}
            >
              Moisture history
            </Text>
          </View>
          {thresholdLabel ? (
            <Text
              style={{
                color: palette.inkMuted,
                fontFamily: typography.bodyRegular,
                fontSize: 11,
                textAlign: 'right',
              }}
            >
              {thresholdLabel}
            </Text>
          ) : null}
        </View>

        <View style={{ alignItems: 'center', marginLeft: -24, marginBottom: -10 }}>
          <LineChart
            data={chartData}
            width={chartWidth}
            height={164}
            chartConfig={{
              backgroundGradientFrom: palette.parchmentSoft,
              backgroundGradientTo: palette.parchmentSoft,
              fillShadowGradientFrom: palette.leafDark,
              fillShadowGradientFromOpacity: 0.14,
              fillShadowGradientTo: palette.parchmentSoft,
              fillShadowGradientToOpacity: 0,
              color: (opacity = 1) => `rgba(30, 94, 59, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(137, 147, 138, ${opacity})`,
              strokeWidth: 2.5,
              propsForDots: {
                r: '4',
                strokeWidth: '2',
                stroke: palette.white,
              },
              propsForBackgroundLines: {
                strokeWidth: 0,
              },
            }}
            bezier
            style={{ borderRadius: radii.md }}
            withVerticalLines={false}
            withHorizontalLines={false}
            withInnerLines={false}
            withOuterLines={false}
            withVerticalLabels={true}
            withHorizontalLabels={true}
            yAxisSuffix="%"
            fromZero
            hidePointsAtIndex={hiddenIndices}
          />
        </View>
      </View>
    </InsetCard>
  );
}
