import { useEffect, useMemo } from 'react';

import { useSession } from '@/features/session/session-provider';
import { getExpenseSummary, listExpenses } from '@/lib/expense-api';
import {
  applyPendingExpenseMutations,
  computeExpenseSummaryView,
  findSelectedExpenseSeason,
  resolveBudgetWithPending,
} from '@/lib/expenses';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { storageKeys } from '@/lib/constants';
import { getPendingExpenseMutations } from '@/lib/pending-expense-mutations';
import { useStoredValue } from '@/lib/storage';
import type { ExpenseScopeType } from '@/lib/api-types';

export function useExpenseTracker(scope: ExpenseScopeType) {
  const { profile, token } = useSession();
  const [selectedSeasonId, setSelectedSeasonId] = useStoredValue(
    storageKeys.selectedSeasonId,
    '',
  );
  const [pendingMutations] = useStoredValue(
    storageKeys.pendingExpenseMutations,
    getPendingExpenseMutations(),
  );
  const selectedSeason = useMemo(
    () => findSelectedExpenseSeason(profile, selectedSeasonId),
    [profile, selectedSeasonId],
  );
  const effectiveSelectedSeasonId = selectedSeasonId || selectedSeason?.id || '';

  useEffect(() => {
    if (!selectedSeasonId && selectedSeason?.id) {
      setSelectedSeasonId(selectedSeason.id);
    }
  }, [selectedSeason?.id, selectedSeasonId, setSelectedSeasonId]);

  const expensesQuery = useCachedQuery({
    cacheKey: 'expenses:all',
    queryKey: ['expenses', token],
    enabled: Boolean(token),
    queryFn: () => listExpenses(token as string),
    placeholderData: (previous) => previous,
  });
  const summaryQuery = useCachedQuery({
    cacheKey: `expense-summary:${scope}:${effectiveSelectedSeasonId || 'default'}`,
    queryKey: ['expense-summary', token, scope, effectiveSelectedSeasonId],
    enabled: Boolean(token && effectiveSelectedSeasonId),
    queryFn: () =>
      getExpenseSummary(token as string, {
        scope,
        cropSeasonId: effectiveSelectedSeasonId || undefined,
      }),
    placeholderData: (previous) => previous,
  });
  const mergedExpenses = useMemo(
    () =>
      applyPendingExpenseMutations(
        expensesQuery.data?.expenses ?? [],
        pendingMutations,
        profile,
      ),
    [expensesQuery.data?.expenses, pendingMutations, profile],
  );
  const seasonEntries = useMemo(
    () =>
      selectedSeason?.id
        ? mergedExpenses.filter((entry) => entry.cropSeasonId === selectedSeason.id)
        : [],
    [mergedExpenses, selectedSeason?.id],
  );
  const activeBudget = useMemo(
    () =>
      resolveBudgetWithPending(
        summaryQuery.data?.summary.budget ?? null,
        pendingMutations,
        seasonEntries,
        selectedSeason?.id,
      ),
    [pendingMutations, seasonEntries, selectedSeason?.id, summaryQuery.data?.summary.budget],
  );
  const summary = useMemo(
    () =>
      computeExpenseSummaryView({
        expenses: mergedExpenses,
        scope,
        selectedSeasonId: effectiveSelectedSeasonId || selectedSeason?.id,
        budget: activeBudget,
        profile,
      }),
    [activeBudget, effectiveSelectedSeasonId, mergedExpenses, profile, scope, selectedSeason?.id],
  );

  return {
    selectedSeason,
    selectedSeasonId: effectiveSelectedSeasonId,
    pendingMutations,
    expenses: mergedExpenses,
    summary,
    expensesQuery,
    summaryQuery,
  };
}
