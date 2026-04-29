import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { Stack, useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';

import { Button } from '@/components/button';
import { CompactListCard } from '@/components/compact-list-card';
import { ExpenseCategoryRow } from '@/components/expense-category-row';
import { ExpenseDonutCard } from '@/components/expense-donut-card';
import { MetricBadge } from '@/components/metric-badge';
import { PageShell } from '@/components/page-shell';
import { SectionTitle } from '@/components/section-title';
import { SunriseCard } from '@/components/sunrise-card';
import { expenseCategoryMeta, getExpenseSummary, readExpenseEntries } from '@/lib/expenses';
import { formatCurrency, formatLongDate } from '@/lib/format';
import { storageKeys } from '@/lib/constants';
import { useStoredValue } from '@/lib/storage';
import { palette, spacing, typography } from '@/theme/tokens';

export default function ExpensesRoute() {
  const router = useRouter();
  const [entries] = useStoredValue(storageKeys.expenseEntries, readExpenseEntries());

  const summary = useMemo(() => getExpenseSummary(entries), [entries]);
  const topCategories = summary.byCategory.filter((item) => item.amount > 0);
  const recentEntries = entries.slice(0, 6);

  return (
    <>
      <Stack.Screen options={{ title: 'Expenses' }} />
      <PageShell
        eyebrow="Farm expenses"
        title="Input cost tracker"
        subtitle="Keep a simple running view of what the current crop is costing."
        heroTone="sunrise"
        hero={
          <ExpenseDonutCard
            totalLabel={formatCurrency(summary.total)}
            headline="This month's biggest cost buckets"
            segments={topCategories.slice(0, 4).map((item) => ({
              color: item.color,
              label: item.label,
              amountLabel: formatCurrency(item.amount),
              percentLabel: `${Math.round(item.percent * 100)}%`,
            }))}
          />
        }
      >
        <Button
          label="Add expense"
          icon={<Plus color={palette.white} size={16} />}
          onPress={() => router.push('/expenses/add' as never)}
        />

        <SectionTitle eyebrow="Category totals" title="Where money is going" />
        <View style={{ gap: spacing.sm }}>
          {topCategories.length ? (
            topCategories.map((item) => (
              <ExpenseCategoryRow
                key={item.category}
                label={item.label}
                amountLabel={formatCurrency(item.amount)}
                percentLabel={`${Math.round(item.percent * 100)}%`}
                color={item.color}
                note={
                  item.category === 'LABOUR'
                    ? 'People and field support'
                    : item.category === 'IRRIGATION'
                      ? 'Water and pump costs'
                      : 'Tracked from recent entries'
                }
              />
            ))
          ) : (
            <SunriseCard accent="soft" title="No expenses yet">
              <Text
                style={{
                  color: palette.inkSoft,
                  fontFamily: typography.bodyRegular,
                  fontSize: 13,
                  lineHeight: 19,
                }}
              >
                Add the first seed, labour, or transport cost to start the tracker.
              </Text>
            </SunriseCard>
          )}
        </View>

        <SectionTitle eyebrow="Recent entries" title="Latest spending" />
        <View style={{ gap: spacing.sm }}>
          {recentEntries.map((entry) => (
            <CompactListCard
              key={entry.id}
              title={entry.title}
              subtitle={expenseCategoryMeta[entry.category].label}
              meta={formatLongDate(entry.date)}
              prefix={
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 14,
                    backgroundColor: expenseCategoryMeta[entry.category].color,
                  }}
                />
              }
              trailing={<MetricBadge label={formatCurrency(entry.amount)} tone="success" />}
            >
              {entry.note ? (
                <Text
                  style={{
                    color: palette.inkSoft,
                    fontFamily: typography.bodyRegular,
                    fontSize: 12,
                    lineHeight: 18,
                  }}
                >
                  {entry.note}
                </Text>
              ) : null}
            </CompactListCard>
          ))}
        </View>

        <SunriseCard accent="info" title="Why this helps">
          <View style={{ gap: spacing.xs }}>
            {[
              'Keep seed, fertilizer, labour, and transport in one place.',
              'Spot the heaviest category before the next purchase round.',
              'Stay ready for a future backend sync without changing the flow.',
            ].map((item) => (
              <Text
                key={item}
                style={{
                  color: palette.inkSoft,
                  fontFamily: typography.bodyRegular,
                  fontSize: 12,
                  lineHeight: 18,
                }}
              >
                - {item}
              </Text>
            ))}
          </View>
        </SunriseCard>
      </PageShell>
    </>
  );
}
