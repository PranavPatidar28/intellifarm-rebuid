import { Text, View } from 'react-native';

import { ChartColumnBig, FileHeart, ShieldAlert } from 'lucide-react-native';

import { Button } from '@/components/button';
import { InsetCard } from '@/components/inset-card';
import { MetricBadge } from '@/components/metric-badge';
import type { HomeInsight } from '@/lib/home-insight';
import { palette, spacing, typography } from '@/theme/tokens';

export function HomeInsightCard({
  insight,
  onPress,
}: {
  insight: HomeInsight;
  onPress: () => void;
}) {
  const accentTone =
    insight.kind === 'crop-health'
      ? insight.badgeTone === 'danger'
        ? 'alert'
        : 'soft'
      : insight.kind === 'scheme'
        ? 'feature'
        : 'soft';

  return (
    <InsetCard tone={accentTone} padding={16}>
      <View style={{ gap: spacing.md }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: spacing.md,
          }}
        >
          <View style={{ flexDirection: 'row', gap: spacing.sm, flex: 1 }}>
            <View
              style={{
                width: 38,
                height: 38,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 14,
                backgroundColor: palette.white,
              }}
            >
              {renderInsightIcon(insight.kind)}
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text
                style={{
                  color: palette.inkMuted,
                  fontFamily: typography.bodyStrong,
                  fontSize: 11,
                  textTransform: 'uppercase',
                }}
              >
                {insight.label}
              </Text>
              <Text
                style={{
                  color: palette.ink,
                  fontFamily: typography.bodyStrong,
                  fontSize: 16,
                }}
              >
                {insight.title}
              </Text>
            </View>
          </View>
          <MetricBadge label={insight.badgeLabel} tone={insight.badgeTone} />
        </View>

        <Text
          style={{
            color: palette.inkSoft,
            fontFamily: typography.bodyRegular,
            fontSize: 13,
            lineHeight: 19,
          }}
        >
          {insight.detail}
        </Text>

        <View style={{ flexDirection: 'row' }}>
          <Button
            label={insight.ctaLabel}
            onPress={onPress}
            variant="soft"
            fullWidth={false}
          />
        </View>
      </View>
    </InsetCard>
  );
}

function renderInsightIcon(kind: HomeInsight['kind']) {
  if (kind === 'crop-health') {
    return <ShieldAlert color={palette.terracotta} size={18} />;
  }

  if (kind === 'market') {
    return <ChartColumnBig color={palette.mustard} size={18} />;
  }

  return <FileHeart color={palette.lilac} size={18} />;
}
