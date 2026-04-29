import { Text, View } from 'react-native';

import { CompactListCard } from '@/components/compact-list-card';
import { MetricBadge } from '@/components/metric-badge';
import { palette, radii, spacing, typography } from '@/theme/tokens';

export function ExpenseCategoryRow({
  label,
  amountLabel,
  percentLabel,
  color,
  note,
}: {
  label: string;
  amountLabel: string;
  percentLabel: string;
  color: string;
  note?: string;
}) {
  return (
    <CompactListCard
      title={label}
      subtitle={note}
      trailing={<MetricBadge label={percentLabel} tone="success" />}
      prefix={
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: radii.lg,
            backgroundColor: color,
          }}
        />
      }
    >
      <Text
        style={{
          color: palette.ink,
          fontFamily: typography.bodyStrong,
          fontSize: 14,
        }}
      >
        {amountLabel}
      </Text>
    </CompactListCard>
  );
}
