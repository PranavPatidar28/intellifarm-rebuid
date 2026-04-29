import { Text, View } from 'react-native';

import { MapPin } from 'lucide-react-native';

import { InsetCard } from '@/components/inset-card';
import { MetricBadge } from '@/components/metric-badge';
import { formatCurrency } from '@/lib/format';
import { palette, spacing, typography } from '@/theme/tokens';

export function MarketQuoteCard({
  title,
  subtitle,
  price,
  helper,
  badgeLabel,
  badgeTone = 'neutral',
  distanceLabel,
}: {
  title: string;
  subtitle: string;
  price: number;
  helper: string;
  badgeLabel: string;
  badgeTone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  distanceLabel?: string | null;
}) {
  return (
    <InsetCard padding={16} tone="neutral">
      <View style={{ gap: spacing.sm }}>
        <View
          style={{
            alignItems: 'flex-start',
            flexDirection: 'row',
            gap: spacing.sm,
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <Text
              style={{
                color: palette.ink,
                fontFamily: typography.bodyStrong,
                fontSize: 16,
                lineHeight: 21,
              }}
            >
              {title}
            </Text>
            <Text
              style={{
                color: palette.inkSoft,
                fontFamily: typography.bodyRegular,
                fontSize: 12,
              }}
            >
              {subtitle}
            </Text>
          </View>
          <MetricBadge label={badgeLabel} tone={badgeTone} />
        </View>

        <View style={{ gap: 2 }}>
          <View style={{ alignItems: 'baseline', flexDirection: 'row', gap: 4 }}>
            <Text
              style={{
                color: palette.leafDark,
                fontFamily: typography.display,
                fontSize: 24,
                fontVariant: ['tabular-nums'],
              }}
            >
              {formatCurrency(price)}
            </Text>
            <Text
              style={{
                color: palette.inkSoft,
                fontFamily: typography.bodyRegular,
                fontSize: 11,
              }}
            >
              / qtl
            </Text>
          </View>
          <Text
            style={{
              color: palette.inkMuted,
              fontFamily: typography.bodyRegular,
              fontSize: 11,
              lineHeight: 16,
            }}
          >
            {helper}
          </Text>
        </View>

        {distanceLabel ? (
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: 6 }}>
            <MapPin color={palette.inkMuted} size={13} strokeWidth={2.1} />
            <Text
              style={{
                color: palette.inkSoft,
                fontFamily: typography.bodyRegular,
                fontSize: 12,
              }}
            >
              {distanceLabel}
            </Text>
          </View>
        ) : null}
      </View>
    </InsetCard>
  );
}
