import { ArrowUpRight, MapPinned } from 'lucide-react-native';

import { CompactListCard } from '@/components/compact-list-card';
import { MetricBadge } from '@/components/metric-badge';
import type { MarketRecord } from '@/lib/api-types';
import { formatCurrency, formatDistance, formatShortDate } from '@/lib/format';
import { palette, typography } from '@/theme/tokens';
import { Text, View } from 'react-native';

export function MandiCard({ record }: { record: MarketRecord }) {
  const trendTone =
    record.trendDirection === 'UP'
      ? 'success'
      : record.trendDirection === 'DOWN'
        ? 'danger'
        : 'neutral';

  return (
    <CompactListCard
      title={record.mandiName}
      subtitle={`${record.cropName} • ${record.district}`}
      meta={`${formatShortDate(record.recordDate)} • ${record.freshnessLabel}`}
      prefix={<MapPinned color={palette.leafDark} size={18} />}
      trailing={<MetricBadge label={record.trendLabel} tone={trendTone} />}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <Text
          style={{
            color: palette.leafDark,
            fontFamily: typography.display,
            fontSize: 22,
          }}
        >
          {formatCurrency(record.priceModal)}
        </Text>
        <Text
          style={{
            color: palette.inkSoft,
            fontFamily: typography.bodyRegular,
            fontSize: 12,
          }}
        >
          {formatDistance(record.distanceKm)}
        </Text>
      </View>
      <Text
        style={{
          color: palette.inkMuted,
          fontFamily: typography.bodyRegular,
          fontSize: 11,
        }}
      >
        Range {formatCurrency(record.priceMin)}-{formatCurrency(record.priceMax)}
      </Text>
    </CompactListCard>
  );
}
