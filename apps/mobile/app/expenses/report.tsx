import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { Stack, useRouter } from 'expo-router';

import { ExpenseActivityRow } from '@/components/expense-activity-row';
import { ExpenseScopeSwitch } from '@/components/expense-scope-switch';
import { FilterChipRow } from '@/components/filter-chip-row';
import { PageShell } from '@/components/page-shell';
import { SunriseCard } from '@/components/sunrise-card';
import { TextField } from '@/components/text-field';
import { useSession } from '@/features/session/session-provider';
import { useExpenseTracker } from '@/hooks/use-expense-tracker';
import {
  expenseActivityFilters,
  expenseScopeOptions,
  filterExpensesByActivity,
  filterExpensesByScope,
  getExpenseSeasonLabel,
  type ExpenseActivityFilter,
} from '@/lib/expenses';
import { formatCurrency } from '@/lib/format';
import { palette, spacing, typography } from '@/theme/tokens';

export default function ExpenseReportRoute() {
  const router = useRouter();
  const { profile } = useSession();
  const [scope, setScope] = useState<'month' | 'season' | 'year'>('month');
  const [activityFilter, setActivityFilter] = useState<ExpenseActivityFilter>('all');
  const [searchText, setSearchText] = useState('');
  const { expenses, summary, selectedSeason } = useExpenseTracker(scope);

  const filteredExpenses = useMemo(() => {
    const scopeEntries = filterExpensesByScope(expenses, scope, selectedSeason?.id);
    const activityEntries = filterExpensesByActivity(scopeEntries, activityFilter);
    const search = searchText.trim().toLowerCase();

    if (!search) {
      return activityEntries;
    }

    return activityEntries.filter((expense) =>
      [expense.title, expense.vendor, expense.note]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(search)),
    );
  }, [activityFilter, expenses, scope, searchText, selectedSeason?.id]);

  return (
    <>
      <Stack.Screen options={{ title: 'Expense report' }} />
      <PageShell
        title="Expense report"
        subtitle="Review, search, and edit your logged expenses."
        hero={
          <ExpenseScopeSwitch
            value={scope}
            options={expenseScopeOptions}
            onChange={setScope}
          />
        }
      >
        <TextField
          label="Search"
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search expenses"
        />

        <FilterChipRow
          value={activityFilter}
          options={expenseActivityFilters}
          onChange={setActivityFilter}
        />

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
              color: palette.ink,
              fontFamily: typography.bodyStrong,
              fontSize: 18,
            }}
          >
            {filteredExpenses.length} expense{filteredExpenses.length === 1 ? '' : 's'}
          </Text>
          <Text
            style={{
              color: palette.inkSoft,
              fontFamily: typography.bodyRegular,
              fontSize: 12,
            }}
          >
            {formatCurrency(summary.totalAmount)} in this view
          </Text>
        </View>

        <View style={{ gap: spacing.sm }}>
          {filteredExpenses.length ? (
            filteredExpenses.map((expense) => (
              <ExpenseActivityRow
                key={expense.id}
                expense={expense}
                subtitle={getExpenseSeasonLabel(expense, profile)}
                onPress={() =>
                  router.push({
                    pathname: '/expenses/edit/[id]',
                    params: { id: expense.id },
                  } as never)
                }
              />
            ))
          ) : (
            <SunriseCard accent="soft" title="No matching expenses">
              <Text
                style={{
                  color: palette.inkSoft,
                  fontFamily: typography.bodyRegular,
                  fontSize: 13,
                  lineHeight: 19,
                }}
              >
                Adjust the filters or search term to find a different expense.
              </Text>
            </SunriseCard>
          )}
        </View>
      </PageShell>
    </>
  );
}
