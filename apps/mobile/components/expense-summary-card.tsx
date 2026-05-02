import { Pressable, Text, View } from 'react-native';

import { ArrowRight } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';

import { InsetCard } from '@/components/inset-card';
import { MetricBadge } from '@/components/metric-badge';
import type { ExpenseSummary } from '@/lib/api-types';
import { expenseCategoryMeta } from '@/lib/expenses';
import { formatCurrency } from '@/lib/format';
import { palette, radii, spacing, typography } from '@/theme/tokens';

function formatCurrencyCompact(value: number) {
  if (Math.abs(value) >= 1000) {
    return `₹ ${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  }

  return formatCurrency(value);
}

export function ExpenseSummaryCard({
  summary,
  onManageBudget,
}: {
  summary: ExpenseSummary;
  onManageBudget: () => void;
}) {
  const visibleCategories = [...summary.categories]
    .filter((item) => item.amount > 0)
    .sort((left, right) => right.amount - left.amount)
    .slice(0, 4);
  const trendLabel =
    summary.trend.direction === 'STABLE'
      ? 'Stable'
      : `${summary.trend.direction === 'DOWN' ? 'Down' : 'Up'} ${Math.abs(summary.trend.percentChange).toFixed(1)}%`;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let progressOffset = 0;

  return (
    <InsetCard padding={18}>
      <View style={{ gap: spacing.md }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: spacing.md,
          }}
        >
          <View style={{ gap: 4 }}>
            <Text
              style={{
                color: palette.inkMuted,
                fontFamily: typography.bodyStrong,
                fontSize: 11,
                textTransform: 'uppercase',
              }}
            >
              Spent this {summary.scope}
            </Text>
            <Text
              style={{
                color: palette.inkSoft,
                fontFamily: typography.bodyRegular,
                fontSize: 12,
              }}
            >
              {summary.periodLabel}
            </Text>
          </View>

          <MetricBadge
            label={trendLabel}
            tone={
              summary.trend.direction === 'DOWN'
                ? 'success'
                : summary.trend.direction === 'UP'
                  ? 'danger'
                  : 'neutral'
            }
          />
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.lg }}>
          <View
            style={{
              width: 132,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Svg width={132} height={132}>
              <Circle
                cx="66"
                cy="66"
                r={radius}
                stroke={palette.dune}
                strokeWidth="16"
                fill="transparent"
              />
              {visibleCategories.map((segment) => {
                const segmentLength = circumference * segment.percent;
                const circle = (
                  <Circle
                    key={segment.category}
                    cx="66"
                    cy="66"
                    r={radius}
                    stroke={expenseCategoryMeta[segment.category].color}
                    strokeWidth="16"
                    fill="transparent"
                    strokeLinecap="round"
                    strokeDasharray={`${segmentLength} ${circumference}`}
                    strokeDashoffset={-progressOffset}
                    rotation="-90"
                    origin="66,66"
                  />
                );
                progressOffset += segmentLength;
                return circle;
              })}
            </Svg>

            <View
              style={{
                position: 'absolute',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
              }}
            >
              <Text
                style={{
                  color: palette.inkSoft,
                  fontFamily: typography.bodyRegular,
                  fontSize: 12,
                }}
              >
                Spent
              </Text>
              <Text
                style={{
                  color: palette.ink,
                  fontFamily: typography.display,
                  fontSize: 22,
                }}
              >
                {formatCurrencyCompact(summary.totalAmount)}
              </Text>
            </View>
          </View>

          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text
              style={{
                color: palette.ink,
                fontFamily: typography.display,
                fontSize: 28,
                lineHeight: 32,
              }}
            >
              {formatCurrency(summary.totalAmount)}
            </Text>
            <Text
              style={{
                color: summary.pendingAmount > 0 ? palette.mustard : palette.leaf,
                fontFamily: typography.bodyStrong,
                fontSize: 15,
              }}
            >
              {summary.pendingAmount > 0
                ? `${formatCurrency(summary.pendingAmount)} pending`
                : 'All logged expenses are paid'}
            </Text>

            <View style={{ marginTop: spacing.xs, gap: spacing.sm }}>
              {visibleCategories.map((segment) => (
                <View
                  key={segment.category}
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
                        backgroundColor: expenseCategoryMeta[segment.category].color,
                      }}
                    />
                    <Text
                      style={{
                        color: palette.inkSoft,
                        fontFamily: typography.bodyRegular,
                        fontSize: 13,
                      }}
                    >
                      {expenseCategoryMeta[segment.category].label}
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: palette.ink,
                      fontFamily: typography.bodyStrong,
                      fontSize: 13,
                    }}
                  >
                    {Math.round(segment.percent * 100)}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View
          style={{
            height: 1,
            backgroundColor: palette.outline,
          }}
        />

        {summary.budget ? (
          <View style={{ gap: spacing.sm }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: spacing.md,
              }}
            >
              <Text
                style={{
                  color: palette.inkSoft,
                  fontFamily: typography.bodyRegular,
                  fontSize: 12,
                }}
              >
                Budget used - {Math.round(summary.budget.usedPercent)}% of{' '}
                {formatCurrency(summary.budget.amount)}
              </Text>
              <Pressable
                onPress={onManageBudget}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <Text
                  style={{
                    color: palette.leaf,
                    fontFamily: typography.bodyStrong,
                    fontSize: 13,
                  }}
                >
                  Manage
                </Text>
                <ArrowRight color={palette.leaf} size={14} />
              </Pressable>
            </View>
            <View
              style={{
                height: 8,
                borderRadius: radii.pill,
                backgroundColor: palette.dune,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${Math.min(summary.budget.usedPercent, 100)}%`,
                  height: '100%',
                  borderRadius: radii.pill,
                  backgroundColor:
                    summary.budget.usedPercent >= 100 ? palette.terracotta : palette.leaf,
                }}
              />
            </View>
          </View>
        ) : (
          <Pressable
            onPress={onManageBudget}
            style={{
              minHeight: 42,
              paddingHorizontal: spacing.md,
              borderRadius: radii.pill,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: palette.leafMist,
            }}
          >
            <Text
              style={{
                color: palette.leafDark,
                fontFamily: typography.bodyStrong,
                fontSize: 13,
              }}
            >
              Set a season budget
            </Text>
          </Pressable>
        )}
      </View>
    </InsetCard>
  );
}
