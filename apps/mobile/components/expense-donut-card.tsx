import { Text, View } from 'react-native';

import { InsetCard } from '@/components/inset-card';
import { palette, radii, spacing, typography } from '@/theme/tokens';

type Segment = {
  color: string;
  label: string;
  amountLabel: string;
  percentLabel: string;
};

export function ExpenseDonutCard({
  totalLabel,
  headline,
  segments,
}: {
  totalLabel: string;
  headline: string;
  segments: Segment[];
}) {
  return (
    <InsetCard tone="feature" padding={16}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.lg,
        }}
      >
        <View
          style={{
            width: 126,
            height: 126,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: radii.pill,
            backgroundColor: palette.white,
            borderWidth: 12,
            borderColor: palette.mintStrong,
          }}
        >
          {segments.slice(0, 3).map((segment, index) => (
            <View
              key={segment.label}
              style={{
                position: 'absolute',
                width: 18,
                height: 18,
                borderRadius: radii.pill,
                backgroundColor: segment.color,
                top: index === 0 ? 10 : index === 1 ? 82 : 54,
                left: index === 0 ? 84 : index === 1 ? 20 : 94,
              }}
            />
          ))}
          <Text
            style={{
              color: palette.inkMuted,
              fontFamily: typography.bodyStrong,
              fontSize: 11,
              textTransform: 'uppercase',
            }}
          >
            Total spent
          </Text>
          <Text
            style={{
              color: palette.ink,
              fontFamily: typography.display,
              fontSize: 22,
            }}
          >
            {totalLabel}
          </Text>
        </View>

        <View style={{ flex: 1, gap: spacing.sm }}>
          <Text
            style={{
              color: palette.ink,
              fontFamily: typography.bodyStrong,
              fontSize: 16,
            }}
          >
            {headline}
          </Text>
          {segments.slice(0, 4).map((segment) => (
            <View
              key={segment.label}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: spacing.sm,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: radii.pill,
                    backgroundColor: segment.color,
                  }}
                />
                <Text
                  style={{
                    color: palette.inkSoft,
                    fontFamily: typography.bodyRegular,
                    fontSize: 12,
                  }}
                >
                  {segment.label}
                </Text>
              </View>
              <Text
                style={{
                  color: palette.ink,
                  fontFamily: typography.bodyStrong,
                  fontSize: 12,
                }}
              >
                {segment.percentLabel}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </InsetCard>
  );
}
