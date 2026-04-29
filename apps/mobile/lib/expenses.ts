import type {
  ExpenseBudget,
  ExpenseCategoryType,
  ExpenseEntry,
  ExpenseScopeType,
  ExpenseStatusType,
  ExpenseSummary,
  ProfileResponse,
} from '@/lib/api-types';
import { formatCurrency } from '@/lib/format';
import type { PendingExpenseMutation } from '@/lib/pending-expense-mutations';
import { palette } from '@/theme/tokens';

type LocalBudgetSnapshot = NonNullable<ExpenseBudget>;

export type ExpenseActivityFilter = 'all' | 'paid' | 'pending' | 'recurring';

export const expenseScopeOptions: Array<{ value: ExpenseScopeType; label: string }> = [
  { value: 'month', label: 'Month' },
  { value: 'season', label: 'Season' },
  { value: 'year', label: 'Year' },
];

export const expenseActivityFilters: Array<{
  value: ExpenseActivityFilter;
  label: string;
}> = [
  { value: 'all', label: 'All' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'recurring', label: 'Recurring' },
];

export const expenseCategoryMeta: Record<
  ExpenseCategoryType,
  { label: string; color: string; iconKey: string }
> = {
  FERTILIZER: { label: 'Fertilizer', color: '#157A5C', iconKey: 'leaf' },
  LABOUR: { label: 'Labour', color: '#F59E0B', iconKey: 'users' },
  EQUIPMENT: { label: 'Equipment', color: '#3B82F6', iconKey: 'tractor' },
  TRANSPORT: { label: 'Transport', color: '#A855F7', iconKey: 'truck' },
  SEEDS: { label: 'Seeds', color: '#6FA556', iconKey: 'sprout' },
  PESTICIDE: { label: 'Pesticide', color: '#D97706', iconKey: 'flask' },
  IRRIGATION: { label: 'Irrigation', color: '#0EA5E9', iconKey: 'droplets' },
  OTHER: { label: 'Other', color: palette.inkMuted, iconKey: 'wallet' },
};

export const expenseStatusMeta: Record<
  ExpenseStatusType,
  { label: string; tone: 'success' | 'warning' }
> = {
  PAID: { label: 'Paid', tone: 'success' },
  PENDING: { label: 'Pending', tone: 'warning' },
};

const expenseCategoryOrder = Object.keys(expenseCategoryMeta) as ExpenseCategoryType[];

function asDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function startOfMonth(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function startOfNextMonth(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

function startOfYear(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
}

function startOfNextYear(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear() + 1, 0, 1));
}

function sumAmount(entries: Array<{ amount: number }>) {
  return entries.reduce((sum, entry) => sum + entry.amount, 0);
}

function getAllSeasons(profile: ProfileResponse | null) {
  return (
    profile?.farms.flatMap((farm) =>
      farm.cropSeasons.map((season) => ({
        ...season,
        farmPlotName: farm.name,
      })),
    ) ?? []
  );
}

function findSelectedSeason(profile: ProfileResponse | null, selectedSeasonId?: string) {
  const seasons = getAllSeasons(profile);
  if (!seasons.length) {
    return null;
  }

  return seasons.find((season) => season.id === selectedSeasonId) ?? seasons[0];
}

export function findSelectedExpenseSeason(
  profile: ProfileResponse | null,
  selectedSeasonId?: string,
) {
  return findSelectedSeason(profile, selectedSeasonId);
}

function makeFallbackSeason(cropSeasonId: string): ExpenseEntry['cropSeason'] {
  return {
    id: cropSeasonId,
    cropName: 'Current season',
    currentStage: 'Active',
    sowingDate: new Date().toISOString(),
    farmPlotId: 'unknown-plot',
    status: 'ACTIVE',
  };
}

function buildSeasonMap(profile: ProfileResponse | null) {
  const seasons = getAllSeasons(profile);
  return new Map(
    seasons.map((season) => [
      season.id,
      {
        id: season.id,
        cropName: season.cropName,
        currentStage: season.currentStage,
        sowingDate: season.sowingDate,
        farmPlotId: season.farmPlotId,
        status: season.status,
      } satisfies ExpenseEntry['cropSeason'],
    ]),
  );
}

export function applyPendingExpenseMutations(
  expenses: ExpenseEntry[],
  pendingMutations: PendingExpenseMutation[],
  profile: ProfileResponse | null,
) {
  const seasonMap = buildSeasonMap(profile);
  let next = [...expenses];

  const ordered = [...pendingMutations].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt),
  );

  for (const mutation of ordered) {
    if (mutation.kind === 'create') {
      const season =
        seasonMap.get(mutation.draft.cropSeasonId) ??
        makeFallbackSeason(mutation.draft.cropSeasonId);
      const createdEntry: ExpenseEntry = {
        id: mutation.localId,
        cropSeasonId: mutation.draft.cropSeasonId,
        title: mutation.draft.title,
        amount: mutation.draft.amount,
        expenseDate: mutation.draft.expenseDate,
        category: mutation.draft.category,
        status: mutation.draft.status,
        isRecurring: mutation.draft.isRecurring,
        vendor: mutation.draft.vendor ?? null,
        note: mutation.draft.note ?? null,
        receiptUrl: mutation.receiptUri ?? null,
        createdAt: mutation.createdAt,
        updatedAt: mutation.createdAt,
        cropSeason: season,
      };

      next = [createdEntry, ...next];
      continue;
    }

    if (mutation.kind === 'update') {
      next = next.map((entry) => {
        if (entry.id !== mutation.expenseId) {
          return entry;
        }

        const nextSeasonId = mutation.patch.cropSeasonId ?? entry.cropSeasonId;
        const nextSeason =
          seasonMap.get(nextSeasonId) ??
          entry.cropSeason ??
          makeFallbackSeason(nextSeasonId);

        return {
          ...entry,
          cropSeasonId: nextSeasonId,
          title: mutation.patch.title ?? entry.title,
          amount: mutation.patch.amount ?? entry.amount,
          expenseDate: mutation.patch.expenseDate ?? entry.expenseDate,
          category: mutation.patch.category ?? entry.category,
          status: mutation.patch.status ?? entry.status,
          isRecurring: mutation.patch.isRecurring ?? entry.isRecurring,
          vendor: Object.prototype.hasOwnProperty.call(mutation.patch, 'vendor')
            ? mutation.patch.vendor ?? null
            : entry.vendor,
          note: Object.prototype.hasOwnProperty.call(mutation.patch, 'note')
            ? mutation.patch.note ?? null
            : entry.note,
          receiptUrl:
            mutation.receiptUri != null
              ? mutation.receiptUri
              : mutation.patch.deleteReceipt
                ? null
                : entry.receiptUrl,
          updatedAt: mutation.createdAt,
          cropSeason: nextSeason,
        };
      });
      continue;
    }

    if (mutation.kind === 'delete') {
      next = next.filter((entry) => entry.id !== mutation.expenseId);
    }
  }

  return sortExpenses(next);
}

export function resolveBudgetWithPending(
  budget: ExpenseBudget,
  pendingMutations: PendingExpenseMutation[],
  seasonEntries: ExpenseEntry[],
  cropSeasonId?: string,
) {
  if (!cropSeasonId) {
    return budget;
  }

  const latestBudgetMutation = pendingMutations
    .filter(
      (item): item is Extract<PendingExpenseMutation, { kind: 'upsert-budget' }> =>
        item.kind === 'upsert-budget' && item.cropSeasonId === cropSeasonId,
    )
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .at(-1);

  if (!latestBudgetMutation) {
    return budget;
  }

  if (latestBudgetMutation.amount == null) {
    return null;
  }

  const spentAmount = sumAmount(seasonEntries);
  const pendingAmount = sumAmount(seasonEntries.filter((entry) => entry.status === 'PENDING'));
  const remainingAmount = latestBudgetMutation.amount - spentAmount;

  return {
    cropSeasonId,
    amount: latestBudgetMutation.amount,
    spentAmount,
    pendingAmount,
    remainingAmount,
    usedPercent:
      latestBudgetMutation.amount > 0
        ? (spentAmount / latestBudgetMutation.amount) * 100
        : 0,
    updatedAt: latestBudgetMutation.createdAt,
  } satisfies LocalBudgetSnapshot;
}

export function sortExpenses(entries: ExpenseEntry[]) {
  return [...entries].sort((left, right) => {
    const dateDelta = asDate(right.expenseDate).getTime() - asDate(left.expenseDate).getTime();
    if (dateDelta !== 0) {
      return dateDelta;
    }

    return right.createdAt.localeCompare(left.createdAt);
  });
}

export function filterExpensesByScope(
  entries: ExpenseEntry[],
  scope: ExpenseScopeType,
  selectedSeasonId?: string,
) {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const nextMonth = startOfNextMonth(now);
  const yearStart = startOfYear(now);
  const nextYear = startOfNextYear(now);

  return entries.filter((entry) => {
    const date = asDate(entry.expenseDate);

    if (scope === 'month') {
      return date >= monthStart && date < nextMonth;
    }

    if (scope === 'year') {
      return date >= yearStart && date < nextYear;
    }

    return Boolean(selectedSeasonId) && entry.cropSeasonId === selectedSeasonId;
  });
}

export function filterExpensesByActivity(
  entries: ExpenseEntry[],
  filter: ExpenseActivityFilter,
) {
  return entries.filter((entry) => {
    if (filter === 'paid') {
      return entry.status === 'PAID';
    }
    if (filter === 'pending') {
      return entry.status === 'PENDING';
    }
    if (filter === 'recurring') {
      return entry.isRecurring;
    }

    return true;
  });
}

function resolvePreviousScopeEntries(
  allEntries: ExpenseEntry[],
  scope: ExpenseScopeType,
  profile: ProfileResponse | null,
  selectedSeasonId?: string,
) {
  const now = new Date();

  if (scope === 'month') {
    const monthStart = startOfMonth(now);
    const previousStart = new Date(
      Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() - 1, 1),
    );
    return allEntries.filter((entry) => {
      const date = asDate(entry.expenseDate);
      return date >= previousStart && date < monthStart;
    });
  }

  if (scope === 'year') {
    const yearStart = startOfYear(now);
    const previousStart = new Date(Date.UTC(yearStart.getUTCFullYear() - 1, 0, 1));
    return allEntries.filter((entry) => {
      const date = asDate(entry.expenseDate);
      return date >= previousStart && date < yearStart;
    });
  }

  const selectedSeason = findSelectedSeason(profile, selectedSeasonId);
  if (!selectedSeason) {
    return [];
  }

  const seasons = getAllSeasons(profile)
    .filter((season) => season.farmPlotId === selectedSeason.farmPlotId)
    .sort((left, right) => right.sowingDate.localeCompare(left.sowingDate));
  const previousSeason = seasons.find((season) => season.sowingDate < selectedSeason.sowingDate);

  if (!previousSeason) {
    return [];
  }

  return allEntries.filter((entry) => entry.cropSeasonId === previousSeason.id);
}

export function computeExpenseSummaryView({
  expenses,
  scope,
  selectedSeasonId,
  budget,
  profile,
}: {
  expenses: ExpenseEntry[];
  scope: ExpenseScopeType;
  selectedSeasonId?: string;
  budget: ExpenseBudget;
  profile: ProfileResponse | null;
}) {
  const currentEntries = filterExpensesByScope(expenses, scope, selectedSeasonId);
  const previousEntries = resolvePreviousScopeEntries(expenses, scope, profile, selectedSeasonId);
  const seasonEntries = selectedSeasonId
    ? expenses.filter((entry) => entry.cropSeasonId === selectedSeasonId)
    : [];
  const totalAmount = sumAmount(currentEntries);
  const paidAmount = sumAmount(currentEntries.filter((entry) => entry.status === 'PAID'));
  const pendingAmount = sumAmount(currentEntries.filter((entry) => entry.status === 'PENDING'));
  const previousAmount = sumAmount(previousEntries);
  const deltaAmount = totalAmount - previousAmount;
  const percentChange =
    previousAmount > 0 ? (deltaAmount / previousAmount) * 100 : totalAmount > 0 ? 100 : 0;
  const direction: ExpenseSummary['trend']['direction'] =
    Math.abs(deltaAmount) < 0.01 ? 'STABLE' : deltaAmount > 0 ? 'UP' : 'DOWN';

  const categories = expenseCategoryOrder.map((category) => {
    const currentCategoryEntries = currentEntries.filter((entry) => entry.category === category);
    const previousCategoryEntries = previousEntries.filter(
      (entry) => entry.category === category,
    );
    const currentAmount = sumAmount(currentCategoryEntries);
    const previousCategoryAmount = sumAmount(previousCategoryEntries);

    return {
      category,
      amount: currentAmount,
      paidAmount: sumAmount(currentCategoryEntries.filter((entry) => entry.status === 'PAID')),
      pendingAmount: sumAmount(
        currentCategoryEntries.filter((entry) => entry.status === 'PENDING'),
      ),
      count: currentCategoryEntries.length,
      percent: totalAmount > 0 ? currentAmount / totalAmount : 0,
      previousAmount: previousCategoryAmount,
      deltaAmount: currentAmount - previousCategoryAmount,
      deltaPercent:
        previousCategoryAmount > 0
          ? ((currentAmount - previousCategoryAmount) / previousCategoryAmount) * 100
          : currentAmount > 0
            ? 100
            : null,
    };
  });

  const derivedBudget =
    budget && selectedSeasonId
      ? {
          ...budget,
          spentAmount: sumAmount(seasonEntries),
          pendingAmount: sumAmount(seasonEntries.filter((entry) => entry.status === 'PENDING')),
          remainingAmount: budget.amount - sumAmount(seasonEntries),
          usedPercent:
            budget.amount > 0 ? (sumAmount(seasonEntries) / budget.amount) * 100 : 0,
        }
      : budget;

  return {
    scope,
    periodLabel:
      scope === 'month'
        ? startOfMonth().toLocaleString('en-IN', {
            month: 'long',
            year: 'numeric',
            timeZone: 'UTC',
          })
        : scope === 'year'
          ? startOfYear().toLocaleString('en-IN', {
              year: 'numeric',
              timeZone: 'UTC',
            })
          : `${findSelectedSeason(profile, selectedSeasonId)?.cropName ?? 'Current'} season`,
    totalAmount,
    paidAmount,
    pendingAmount,
    entryCount: currentEntries.length,
    averageAmount: currentEntries.length ? totalAmount / currentEntries.length : 0,
    categories,
    trend: {
      direction,
      percentChange,
      deltaAmount,
      currentAmount: totalAmount,
      previousAmount,
      comparisonLabel:
        scope === 'month'
          ? 'vs last month'
          : scope === 'year'
            ? 'vs last year'
            : previousEntries.length
              ? `vs previous ${previousEntries[0]?.cropSeason?.cropName ?? 'season'} season`
              : 'vs no prior season',
    },
    budget: derivedBudget,
  };
}

export function buildExpenseInsight(summary: ReturnType<typeof computeExpenseSummaryView>) {
  const topDelta = [...summary.categories]
    .filter((item) => item.deltaAmount > 0)
    .sort((left, right) => right.deltaAmount - left.deltaAmount)[0];

  if (topDelta) {
    const label = expenseCategoryMeta[topDelta.category].label;
    const percentLabel =
      topDelta.deltaPercent != null
        ? `${Math.round(Math.abs(topDelta.deltaPercent))}%`
        : 'this cycle';
    const pendingHint =
      summary.pendingAmount > 0
        ? ` Pending payments total about ${formatCurrency(Math.round(summary.pendingAmount))}.`
        : '';

    return {
      headline: `${label} costs are up ${percentLabel}.`,
      body: `This ${summary.scope} view is heavier than ${summary.trend.comparisonLabel.replace('vs ', '')}. Review the next ${label.toLowerCase()} purchase before the next cycle.${pendingHint}`,
    };
  }

  if (summary.pendingAmount > 0) {
    return {
      headline: `${formatCurrency(Math.round(summary.pendingAmount))} is still pending.`,
      body: 'Clear the oldest pending expense first so your budget view stays accurate and cash planning is easier.',
    };
  }

  if (summary.trend.direction === 'DOWN') {
    return {
      headline: 'Spending is lower than the previous period.',
      body: 'Your current run rate looks healthier. Keep tracking each major input so you can hold the savings through the next buying cycle.',
    };
  }

  return {
    headline: 'Keep logging each major spend.',
    body: 'The more complete this tracker is, the better it will spot where the next savings opportunity is hiding.',
  };
}

export function getExpenseSeasonLabel(
  expense: ExpenseEntry,
  profile: ProfileResponse | null,
) {
  const season = getAllSeasons(profile).find((item) => item.id === expense.cropSeasonId);
  return season
    ? `${season.cropName} - ${season.currentStage}`
    : expenseCategoryMeta[expense.category].label;
}

export function getInitialSeasonId(profile: ProfileResponse | null, selectedSeasonId?: string) {
  return findSelectedSeason(profile, selectedSeasonId)?.id ?? '';
}
