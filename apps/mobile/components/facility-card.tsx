import { MapPinned, Warehouse } from 'lucide-react-native';

import { CompactListCard } from '@/components/compact-list-card';
import { MetricBadge } from '@/components/metric-badge';
import type { FacilitiesResponse } from '@/lib/api-types';
import { formatCurrency, formatDistance } from '@/lib/format';
import { palette, typography } from '@/theme/tokens';
import { Text } from 'react-native';

export function FacilityCard({
  facility,
}: {
  facility: FacilitiesResponse['facilities'][number];
}) {
  return (
    <CompactListCard
      title={facility.name}
      subtitle={`${facility.primaryServiceLabel} • ${formatDistance(facility.distanceKm)}`}
      meta={facility.travelHint}
      prefix={
        facility.type === 'WAREHOUSE' ? (
          <Warehouse color={palette.lilac} size={18} />
        ) : (
          <MapPinned color={palette.sky} size={18} />
        )
      }
      trailing={<MetricBadge label={facility.distanceBucket} tone="info" />}
    >
      {facility.marketContext ? (
        <Text
          style={{
            color: palette.ink,
            fontFamily: typography.bodyStrong,
            fontSize: 13,
          }}
        >
          {facility.marketContext.cropName}: {formatCurrency(facility.marketContext.priceModal)}
        </Text>
      ) : null}
      <Text
        style={{
          color: palette.inkSoft,
          fontFamily: typography.bodyRegular,
          fontSize: 12,
          lineHeight: 18,
        }}
      >
        {facility.recommendedUse}
      </Text>
    </CompactListCard>
  );
}
