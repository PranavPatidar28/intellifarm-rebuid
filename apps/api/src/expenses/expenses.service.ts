import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  type ExpenseCategory,
  type ExpenseEntry as PrismaExpenseEntry,
  type ExpenseStatus,
  Prisma,
} from '../generated/prisma';

import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

type ExpenseListQuery = {
  scope?: 'month' | 'season' | 'year';
  cropSeasonId?: string;
  status?: ExpenseStatus;
  category?: ExpenseCategory;
  recurring?: boolean;
  search?: string;
};

type ExpenseSummaryQuery = {
  scope: 'month' | 'season' | 'year';
  cropSeasonId?: string;
};

type CreateExpenseInput = {
  cropSeasonId: string;
  title: string;
  amount: number;
  expenseDate: Date;
  category: ExpenseCategory;
  status: ExpenseStatus;
  isRecurring: boolean;
  vendor?: string;
  note?: string;
};

type UpdateExpenseInput = Partial<CreateExpenseInput> & {
  deleteReceipt?: boolean;
};

type BudgetInput = {
  cropSeasonId: string;
  amount?: number | null;
};

type CropSeasonRecord = {
  id: string;
  cropName: string;
  currentStage: string;
  sowingDate: Date;
  farmPlotId: string;
  status: 'PLANNED' | 'ACTIVE' | 'HARVESTED' | 'ARCHIVED';
};

type ExpenseRecord = Prisma.ExpenseEntryGetPayload<{
  include: {
    cropSeason: true;
  };
}>;

const expenseCategoryOrder: ExpenseCategory[] = [
  'FERTILIZER',
  'LABOUR',
  'EQUIPMENT',
  'TRANSPORT',
  'SEEDS',
  'PESTICIDE',
  'IRRIGATION',
  'OTHER',
];

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async listExpenses(userId: string, query: ExpenseListQuery) {
    const where = await this.buildExpenseWhere(userId, query);
    const expenses = await this.prisma.expenseEntry.findMany({
      where,
      include: {
        cropSeason: true,
      },
      orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
    });

    return {
      expenses: expenses.map((expense) => presentExpense(expense)),
    };
  }

  async getSummary(userId: string, query: ExpenseSummaryQuery) {
    const comparison = await this.loadSummaryComparison(userId, query);
    const budget =
      query.cropSeasonId != null
        ? await this.loadBudgetSnapshot(userId, query.cropSeasonId)
        : null;

    return {
      summary: buildExpenseSummary({
        scope: query.scope,
        periodLabel: comparison.periodLabel,
        comparisonLabel: comparison.comparisonLabel,
        currentEntries: comparison.currentEntries,
        previousEntries: comparison.previousEntries,
        budget,
      }),
    };
  }

  async createExpense(
    userId: string,
    payload: CreateExpenseInput,
    file?: Express.Multer.File,
  ) {
    const season = await this.getOwnedSeason(userId, payload.cropSeasonId);
    const receiptUrl = file
      ? await this.storageService.saveFile(file, 'expense-receipts')
      : undefined;

    const expense = await this.prisma.expenseEntry.create({
      data: {
        userId,
        cropSeasonId: season.id,
        title: payload.title.trim(),
        amount: payload.amount,
        expenseDate: payload.expenseDate,
        category: payload.category,
        status: payload.status,
        isRecurring: payload.isRecurring,
        vendor: normalizeOptionalText(payload.vendor),
        note: normalizeOptionalText(payload.note),
        receiptUrl,
      },
      include: {
        cropSeason: true,
      },
    });

    return {
      expense: presentExpense(expense),
    };
  }

  async updateExpense(
    userId: string,
    expenseId: string,
    payload: UpdateExpenseInput,
    file?: Express.Multer.File,
  ) {
    const existing = await this.getOwnedExpense(userId, expenseId);
    const has = (key: keyof UpdateExpenseInput) =>
      Object.prototype.hasOwnProperty.call(payload, key);

    let nextCropSeasonId = existing.cropSeasonId;
    if (has('cropSeasonId') && payload.cropSeasonId) {
      const season = await this.getOwnedSeason(userId, payload.cropSeasonId);
      nextCropSeasonId = season.id;
    }

    let receiptUrl = existing.receiptUrl;
    if (file) {
      receiptUrl = await this.storageService.saveFile(file, 'expense-receipts');
    } else if (payload.deleteReceipt) {
      receiptUrl = null;
    }

    const data: Prisma.ExpenseEntryUpdateInput = {
      cropSeason: { connect: { id: nextCropSeasonId } },
      receiptUrl,
    };

    if (has('title') && payload.title) {
      data.title = payload.title.trim();
    }
    if (has('amount') && payload.amount != null) {
      data.amount = payload.amount;
    }
    if (has('expenseDate') && payload.expenseDate) {
      data.expenseDate = payload.expenseDate;
    }
    if (has('category') && payload.category) {
      data.category = payload.category;
    }
    if (has('status') && payload.status) {
      data.status = payload.status;
    }
    if (has('isRecurring') && payload.isRecurring != null) {
      data.isRecurring = payload.isRecurring;
    }
    if (has('vendor')) {
      data.vendor = normalizeOptionalText(payload.vendor) ?? null;
    }
    if (has('note')) {
      data.note = normalizeOptionalText(payload.note) ?? null;
    }

    const expense = await this.prisma.expenseEntry.update({
      where: { id: expenseId },
      data,
      include: {
        cropSeason: true,
      },
    });

    return {
      expense: presentExpense(expense),
    };
  }

  async deleteExpense(userId: string, expenseId: string) {
    await this.getOwnedExpense(userId, expenseId);
    await this.prisma.expenseEntry.delete({
      where: { id: expenseId },
    });

    return { success: true };
  }

  async upsertBudget(userId: string, payload: BudgetInput) {
    await this.getOwnedSeason(userId, payload.cropSeasonId);

    if (payload.amount == null) {
      await this.prisma.expenseBudget.deleteMany({
        where: { cropSeasonId: payload.cropSeasonId },
      });

      return { budget: null };
    }

    await this.prisma.expenseBudget.upsert({
      where: { cropSeasonId: payload.cropSeasonId },
      create: {
        cropSeasonId: payload.cropSeasonId,
        amount: payload.amount,
      },
      update: {
        amount: payload.amount,
      },
    });

    return {
      budget: await this.loadBudgetSnapshot(userId, payload.cropSeasonId),
    };
  }

  private async buildExpenseWhere(userId: string, query: ExpenseListQuery) {
    const where: Prisma.ExpenseEntryWhereInput = {
      userId,
    };

    if (query.status) {
      where.status = query.status;
    }
    if (query.category) {
      where.category = query.category;
    }
    if (query.recurring != null) {
      where.isRecurring = query.recurring;
    }

    const dateRange = this.resolveScopeDateRange(query.scope);
    if (dateRange) {
      where.expenseDate = {
        gte: dateRange.start,
        lt: dateRange.end,
      };
    }

    const shouldFilterSeason =
      query.scope === 'season' || (!query.scope && Boolean(query.cropSeasonId));
    if (shouldFilterSeason && query.cropSeasonId) {
      await this.getOwnedSeason(userId, query.cropSeasonId);
      where.cropSeasonId = query.cropSeasonId;
    }

    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { vendor: { contains: search, mode: 'insensitive' } },
        { note: { contains: search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private resolveScopeDateRange(scope?: 'month' | 'season' | 'year') {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();

    if (scope === 'month') {
      return {
        start: new Date(Date.UTC(year, month, 1)),
        end: new Date(Date.UTC(year, month + 1, 1)),
      };
    }

    if (scope === 'year') {
      return {
        start: new Date(Date.UTC(year, 0, 1)),
        end: new Date(Date.UTC(year + 1, 0, 1)),
      };
    }

    return null;
  }

  private async loadSummaryComparison(userId: string, query: ExpenseSummaryQuery) {
    if (query.scope === 'season') {
      const season = await this.getOwnedSeason(userId, query.cropSeasonId as string);
      const previousSeason = await this.prisma.cropSeason.findFirst({
        where: {
          farmPlot: {
            userId,
          },
          farmPlotId: season.farmPlotId,
          sowingDate: {
            lt: season.sowingDate,
          },
          id: {
            not: season.id,
          },
        },
        orderBy: {
          sowingDate: 'desc',
        },
      });

      const [currentEntries, previousEntries] = await Promise.all([
        this.prisma.expenseEntry.findMany({
          where: {
            userId,
            cropSeasonId: season.id,
          },
        }),
        previousSeason
          ? this.prisma.expenseEntry.findMany({
              where: {
                userId,
                cropSeasonId: previousSeason.id,
              },
            })
          : Promise.resolve([] as PrismaExpenseEntry[]),
      ]);

      return {
        currentEntries,
        previousEntries,
        periodLabel: `${season.cropName} season`,
        comparisonLabel: previousSeason
          ? `vs previous ${previousSeason.cropName} season`
          : 'vs no prior season',
      };
    }

    const currentRange = this.resolveScopeDateRange(query.scope);
    const previousRange = resolvePreviousRange(query.scope, currentRange as DateRange);

    const [currentEntries, previousEntries] = await Promise.all([
      this.prisma.expenseEntry.findMany({
        where: {
          userId,
          expenseDate: {
            gte: currentRange?.start,
            lt: currentRange?.end,
          },
        },
      }),
      this.prisma.expenseEntry.findMany({
        where: {
          userId,
          expenseDate: {
            gte: previousRange.start,
            lt: previousRange.end,
          },
        },
      }),
    ]);

    return {
      currentEntries,
      previousEntries,
      periodLabel:
        query.scope === 'month'
          ? formatMonthLabel(currentRange!.start)
          : formatYearLabel(currentRange!.start),
      comparisonLabel: query.scope === 'month' ? 'vs last month' : 'vs last year',
    };
  }

  private async loadBudgetSnapshot(userId: string, cropSeasonId: string) {
    await this.getOwnedSeason(userId, cropSeasonId);
    const [budget, entries] = await Promise.all([
      this.prisma.expenseBudget.findUnique({
        where: { cropSeasonId },
      }),
      this.prisma.expenseEntry.findMany({
        where: {
          userId,
          cropSeasonId,
        },
      }),
    ]);

    if (!budget) {
      return null;
    }

    const spentAmount = sumAmount(entries);
    const pendingAmount = sumAmount(entries.filter((entry) => entry.status === 'PENDING'));
    const remainingAmount = budget.amount - spentAmount;

    return {
      cropSeasonId,
      amount: budget.amount,
      spentAmount,
      pendingAmount,
      remainingAmount,
      usedPercent: budget.amount > 0 ? (spentAmount / budget.amount) * 100 : 0,
      updatedAt: budget.updatedAt.toISOString(),
    };
  }

  private async getOwnedSeason(userId: string, cropSeasonId: string) {
    const season = await this.prisma.cropSeason.findFirst({
      where: {
        id: cropSeasonId,
        farmPlot: {
          userId,
        },
      },
      select: {
        id: true,
        cropName: true,
        currentStage: true,
        sowingDate: true,
        farmPlotId: true,
        status: true,
      },
    });

    if (!season) {
      throw new NotFoundException('Crop season not found');
    }

    return season;
  }

  private async getOwnedExpense(userId: string, expenseId: string) {
    const expense = await this.prisma.expenseEntry.findFirst({
      where: {
        id: expenseId,
        userId,
      },
      include: {
        cropSeason: true,
      },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return expense;
  }
}

type DateRange = {
  start: Date;
  end: Date;
};

function resolvePreviousRange(scope: 'month' | 'year', currentRange: DateRange): DateRange {
  if (scope === 'month') {
    const start = new Date(
      Date.UTC(
        currentRange.start.getUTCFullYear(),
        currentRange.start.getUTCMonth() - 1,
        1,
      ),
    );
    const end = new Date(
      Date.UTC(
        currentRange.start.getUTCFullYear(),
        currentRange.start.getUTCMonth(),
        1,
      ),
    );
    return { start, end };
  }

  const start = new Date(Date.UTC(currentRange.start.getUTCFullYear() - 1, 0, 1));
  const end = new Date(Date.UTC(currentRange.start.getUTCFullYear(), 0, 1));
  return { start, end };
}

function presentExpense(expense: ExpenseRecord) {
  return {
    id: expense.id,
    cropSeasonId: expense.cropSeasonId,
    title: expense.title,
    amount: expense.amount,
    expenseDate: expense.expenseDate.toISOString().slice(0, 10),
    category: expense.category,
    status: expense.status,
    isRecurring: expense.isRecurring,
    vendor: expense.vendor,
    note: expense.note,
    receiptUrl: expense.receiptUrl,
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
    cropSeason: {
      id: expense.cropSeason.id,
      cropName: expense.cropSeason.cropName,
      currentStage: expense.cropSeason.currentStage,
      sowingDate: expense.cropSeason.sowingDate.toISOString(),
      farmPlotId: expense.cropSeason.farmPlotId,
      status: expense.cropSeason.status,
    },
  };
}

function buildExpenseSummary({
  scope,
  periodLabel,
  comparisonLabel,
  currentEntries,
  previousEntries,
  budget,
}: {
  scope: 'month' | 'season' | 'year';
  periodLabel: string;
  comparisonLabel: string;
  currentEntries: PrismaExpenseEntry[];
  previousEntries: PrismaExpenseEntry[];
  budget: {
    cropSeasonId: string;
    amount: number;
    spentAmount: number;
    pendingAmount: number;
    remainingAmount: number;
    usedPercent: number;
    updatedAt: string;
  } | null;
}) {
  const totalAmount = sumAmount(currentEntries);
  const paidAmount = sumAmount(currentEntries.filter((entry) => entry.status === 'PAID'));
  const pendingAmount = sumAmount(currentEntries.filter((entry) => entry.status === 'PENDING'));
  const previousTotal = sumAmount(previousEntries);
  const deltaAmount = totalAmount - previousTotal;
  const percentChange =
    previousTotal > 0 ? (deltaAmount / previousTotal) * 100 : totalAmount > 0 ? 100 : 0;
  const direction =
    Math.abs(deltaAmount) < 0.01 ? 'STABLE' : deltaAmount > 0 ? 'UP' : 'DOWN';

  return {
    scope,
    periodLabel,
    totalAmount,
    paidAmount,
    pendingAmount,
    entryCount: currentEntries.length,
    averageAmount: currentEntries.length ? totalAmount / currentEntries.length : 0,
    categories: expenseCategoryOrder.map((category) => {
      const currentCategoryEntries = currentEntries.filter(
        (entry) => entry.category === category,
      );
      const previousCategoryEntries = previousEntries.filter(
        (entry) => entry.category === category,
      );
      const currentAmount = sumAmount(currentCategoryEntries);
      const previousAmount = sumAmount(previousCategoryEntries);
      const currentPending = sumAmount(
        currentCategoryEntries.filter((entry) => entry.status === 'PENDING'),
      );
      const currentPaid = sumAmount(
        currentCategoryEntries.filter((entry) => entry.status === 'PAID'),
      );

      return {
        category,
        amount: currentAmount,
        paidAmount: currentPaid,
        pendingAmount: currentPending,
        count: currentCategoryEntries.length,
        percent: totalAmount > 0 ? currentAmount / totalAmount : 0,
        previousAmount,
        deltaAmount: currentAmount - previousAmount,
        deltaPercent:
          previousAmount > 0
            ? ((currentAmount - previousAmount) / previousAmount) * 100
            : currentAmount > 0
              ? 100
              : null,
      };
    }),
    trend: {
      direction,
      percentChange,
      deltaAmount,
      currentAmount: totalAmount,
      previousAmount: previousTotal,
      comparisonLabel,
    },
    budget,
  };
}

function normalizeOptionalText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function sumAmount(entries: Array<{ amount: number }>) {
  return entries.reduce((sum, entry) => sum + entry.amount, 0);
}

function formatMonthLabel(date: Date) {
  return date.toLocaleString('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatYearLabel(date: Date) {
  return date.toLocaleString('en-IN', {
    year: 'numeric',
    timeZone: 'UTC',
  });
}
