import { Pressable, Text, View } from 'react-native';

import {
  Droplets,
  FlaskConical,
  Leaf,
  Package,
  Sprout,
  Truck,
  Users,
  WalletCards,
} from 'lucide-react-native';

import { MetricBadge } from '@/components/metric-badge';
import type { ExpenseEntry } from '@/lib/api-types';
import { expenseCategoryMeta, expenseStatusMeta } from '@/lib/expenses';
import { formatCurrency, formatShortDate } from '@/lib/format';
import { palette, radii, spacing, typography } from '@/theme/tokens';

function CategoryIcon({
  category,
}: {
  category: ExpenseEntry['category'];
}) {
  const size = 22;
  const color = palette.leafDark;

  if (category === 'FERTILIZER') {
    return <Leaf color={color} size={size} />;
  }
  if (category === 'LABOUR') {
    return <Users color={color} size={size} />;
  }
  if (category === 'EQUIPMENT') {
    return <Package color={color} size={size} />;
  }
  if (category === 'TRANSPORT') {
    return <Truck color={color} size={size} />;
  }
  if (category === 'SEEDS') {
    return <Sprout color={color} size={size} />;
  }
  if (category === 'PESTICIDE') {
    return <FlaskConical color={color} size={size} />;
  }
  if (category === 'IRRIGATION') {
    return <Droplets color={color} size={size} />;
  }

  return <WalletCards color={color} size={size} />;
}

export function ExpenseActivityRow({
  expense,
  subtitle,
  onPress,
}: {
  expense: ExpenseEntry;
  subtitle?: string;
  onPress?: () => void;
}) {
  const statusMeta = expenseStatusMeta[expense.status];

  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: radii.xl,
        backgroundColor: palette.leafMist,
        borderWidth: 1,
        borderColor: palette.outline,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md,
        }}
      >
        <View
          style={{
            width: 52,
            height: 52,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: radii.pill,
            backgroundColor: palette.mintStrong,
          }}
        >
          <CategoryIcon category={expense.category} />
        </View>

        <View style={{ flex: 1, gap: 6 }}>
          <Text
            style={{
              color: palette.ink,
              fontFamily: typography.bodyStrong,
              fontSize: 18,
            }}
          >
            {expense.title}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <MetricBadge label={statusMeta.label.toUpperCase()} tone={statusMeta.tone} />
            <Text
              style={{
                color: palette.inkMuted,
                fontFamily: typography.bodyRegular,
                fontSize: 11,
              }}
            >
              {subtitle ?? expenseCategoryMeta[expense.category].label} |{' '}
              {formatShortDate(expense.expenseDate)}
            </Text>
          </View>
        </View>

        <Text
          style={{
            color: palette.ink,
            fontFamily: typography.display,
            fontSize: 18,
          }}
        >
          {formatCurrency(expense.amount)}
        </Text>
      </View>
    </Pressable>
  );
}
