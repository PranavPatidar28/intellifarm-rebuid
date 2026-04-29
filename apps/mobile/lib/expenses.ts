import { storageKeys } from '@/lib/constants';
import { storage } from '@/lib/storage';
import { palette } from '@/theme/tokens';

export type ExpenseCategory =
  | 'SEEDS'
  | 'FERTILIZER'
  | 'PESTICIDE'
  | 'LABOUR'
  | 'IRRIGATION'
  | 'TRANSPORT'
  | 'OTHER';

export type ExpenseEntry = {
  id: string;
  category: ExpenseCategory;
  title: string;
  amount: number;
  date: string;
  note?: string;
};

export const expenseCategoryMeta: Record<
  ExpenseCategory,
  { label: string; color: string }
> = {
  SEEDS: { label: 'Seeds', color: '#9DC76D' },
  FERTILIZER: { label: 'Fertilizer', color: '#78A6D6' },
  PESTICIDE: { label: 'Pesticide', color: '#D57B63' },
  LABOUR: { label: 'Labour', color: '#D9B15D' },
  IRRIGATION: { label: 'Irrigation', color: '#76C0C8' },
  TRANSPORT: { label: 'Transport', color: '#A99BCF' },
  OTHER: { label: 'Other', color: palette.mintStrong },
};

const sampleEntries: ExpenseEntry[] = [
  {
    id: 'exp-seeds',
    category: 'SEEDS',
    title: 'Soybean seeds',
    amount: 6200,
    date: '2026-04-20',
    note: 'Kharif preparation',
  },
  {
    id: 'exp-fertilizer',
    category: 'FERTILIZER',
    title: 'DAP fertilizer',
    amount: 4800,
    date: '2026-04-23',
  },
  {
    id: 'exp-labour',
    category: 'LABOUR',
    title: 'Field cleaning labour',
    amount: 2500,
    date: '2026-04-24',
  },
  {
    id: 'exp-irrigation',
    category: 'IRRIGATION',
    title: 'Pump diesel',
    amount: 1850,
    date: '2026-04-26',
  },
];

export function readExpenseEntries() {
  return storage.get<ExpenseEntry[]>(storageKeys.expenseEntries, sampleEntries);
}

export function saveExpenseEntries(entries: ExpenseEntry[]) {
  storage.set(storageKeys.expenseEntries, entries);
}

export function addExpenseEntry(entry: Omit<ExpenseEntry, 'id'>) {
  const current = readExpenseEntries();
  const next: ExpenseEntry = {
    ...entry,
    id: `exp-${Date.now()}`,
  };

  saveExpenseEntries([next, ...current]);
  return next;
}

export function getExpenseSummary(entries: ExpenseEntry[]) {
  const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const byCategory = Object.entries(expenseCategoryMeta).map(([category, meta]) => {
    const amount = entries
      .filter((entry) => entry.category === category)
      .reduce((sum, entry) => sum + entry.amount, 0);

    return {
      category: category as ExpenseCategory,
      ...meta,
      amount,
      percent: total ? amount / total : 0,
    };
  });

  return {
    total,
    byCategory: byCategory.sort((left, right) => right.amount - left.amount),
  };
}
