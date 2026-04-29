import { type ReactNode, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Stack, useRouter } from 'expo-router';
import { Camera, ChartColumnBig, Plus, WalletCards } from 'lucide-react-native';

import { Button } from '@/components/button';
import { ExpenseActivityRow } from '@/components/expense-activity-row';
import { ExpenseScopeSwitch } from '@/components/expense-scope-switch';
import { ExpenseSummaryCard } from '@/components/expense-summary-card';
import { FilterChipRow } from '@/components/filter-chip-row';
import { PageShell } from '@/components/page-shell';
import { SectionTitle } from '@/components/section-title';
import { SunriseCard } from '@/components/sunrise-card';
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
import { palette, radii, spacing, typography } from '@/theme/tokens';

export default function ExpensesRoute() {
  const router = useRouter();
  const { profile } = useSession();
  const [scope, setScope] = useState<'month' | 'season' | 'year'>('month');
  const [activityFilter, setActivityFilter] = useState<ExpenseActivityFilter>('all');
  const { expenses, summary, selectedSeason, expensesQuery } = useExpenseTracker(scope);

  const visibleRecentExpenses = useMemo(
    () =>
      filterExpensesByActivity(
        filterExpensesByScope(expenses, scope, selectedSeason?.id),
        activityFilter,
      ).slice(0, 4),
    [activityFilter, expenses, scope, selectedSeason?.id],
  );

  const headerAction = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      <HeaderActionButton
        icon={<ChartColumnBig color={palette.leafDark} size={18} />}
        onPress={() => router.push('/expenses/report' as never)}
      />
      <HeaderActionButton
        icon={<WalletCards color={palette.leafDark} size={18} />}
        onPress={() => router.push('/expenses/budget' as never)}
      />
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Expenses' }} />
      <PageShell
        title="Expenses"
        action={headerAction}
        hero={
          <ExpenseScopeSwitch
            value={scope}
            options={expenseScopeOptions}
            onChange={setScope}
          />
        }
      >
        <Pressable
          onPress={() => router.push('/expenses/report' as never)}
          style={{ alignSelf: 'flex-end' }}
        >
          <Text
            style={{
              color: palette.leaf,
              fontFamily: typography.bodyStrong,
              fontSize: 16,
            }}
          >
            Full report
          </Text>
        </Pressable>

        <ExpenseSummaryCard
          summary={summary}
          onManageBudget={() => router.push('/expenses/budget' as never)}
        />

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Button
              label="Add Expense"
              icon={<Plus color={palette.white} size={18} />}
              onPress={() => router.push('/expenses/add' as never)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label="Scan Receipt"
              variant="soft"
              icon={<Camera color={palette.leafDark} size={18} />}
              onPress={() =>
                router.push({
                  pathname: '/expenses/add',
                  params: { scanReceipt: '1' },
                } as never)
              }
            />
          </View>
        </View>

        <SectionTitle
          title="Recent Activity"
          action={
            <Pressable onPress={() => router.push('/expenses/report' as never)}>
              <Text
                style={{
                  color: palette.leaf,
                  fontFamily: typography.bodyStrong,
                  fontSize: 15,
                }}
              >
                View All
              </Text>
            </Pressable>
          }
        />

        <FilterChipRow
          value={activityFilter}
          options={expenseActivityFilters}
          onChange={setActivityFilter}
        />

        <View style={{ gap: spacing.sm }}>
          {visibleRecentExpenses.length ? (
            visibleRecentExpenses.map((expense) => (
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
            <SunriseCard accent="soft" title="No expenses in this view">
              <Text
                style={{
                  color: palette.inkSoft,
                  fontFamily: typography.bodyRegular,
                  fontSize: 13,
                  lineHeight: 20,
                }}
              >
                {expensesQuery.isLoading
                  ? 'Loading your spending history.'
                  : 'Add the next expense or switch the time view to see more activity.'}
              </Text>
            </SunriseCard>
          )}
        </View>
      </PageShell>
    </>
  );
}

function HeaderActionButton({
  icon,
  onPress,
}: {
  icon: ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radii.xl,
        backgroundColor: palette.white,
        borderWidth: 1,
        borderColor: palette.outline,
      }}
    >
      {icon}
    </Pressable>
  );
}
