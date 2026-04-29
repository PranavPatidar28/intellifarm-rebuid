import { ExpensesService } from './expenses.service';

type ExpenseEntryCreateArg = {
  data: {
    userId: string;
    cropSeasonId: string;
    title: string;
    amount: number;
    category: string;
    status: string;
    isRecurring: boolean;
    vendor?: string;
    note?: string;
    receiptUrl?: string;
  };
  include?: {
    cropSeason: boolean;
  };
};

describe('ExpensesService', () => {
  it('creates a paid expense for an owned crop season', async () => {
    const create = jest.fn<Promise<unknown>, [ExpenseEntryCreateArg]>().mockResolvedValue(
      makeExpenseRecord({
        id: 'expense-id',
        cropSeasonId: 'season-id',
        title: 'DAP fertilizer',
        amount: 4800,
        category: 'FERTILIZER',
        status: 'PAID',
      }),
    );
    const service = new ExpensesService(
      {
        cropSeason: {
          findFirst: jest.fn().mockResolvedValue(makeSeason()),
        },
        expenseEntry: {
          create,
        },
      } as never,
      {
        saveFile: jest.fn(),
      } as never,
    );

    await expect(
      service.createExpense('user-id', {
        cropSeasonId: 'season-id',
        title: 'DAP fertilizer',
        amount: 4800,
        expenseDate: new Date('2026-04-29'),
        category: 'FERTILIZER',
        status: 'PAID',
        isRecurring: false,
        vendor: 'Nashik Agro',
        note: 'Bulk order',
      }),
    ).resolves.toMatchObject({
      expense: {
        id: 'expense-id',
        title: 'DAP fertilizer',
        status: 'PAID',
      },
    });

    const createArg = create.mock.calls[0]?.[0];
    expect(createArg.data).toMatchObject({
      userId: 'user-id',
      cropSeasonId: 'season-id',
      title: 'DAP fertilizer',
      amount: 4800,
      category: 'FERTILIZER',
      status: 'PAID',
      isRecurring: false,
      vendor: 'Nashik Agro',
      note: 'Bulk order',
    });
  });

  it('creates a pending expense with a saved receipt attachment', async () => {
    const saveFile = jest.fn().mockResolvedValue('/uploads/receipts/receipt.jpg');
    const create = jest.fn<Promise<unknown>, [ExpenseEntryCreateArg]>().mockResolvedValue(
      makeExpenseRecord({
        id: 'expense-id',
        cropSeasonId: 'season-id',
        title: 'Tractor rental',
        amount: 1800,
        category: 'EQUIPMENT',
        status: 'PENDING',
        receiptUrl: '/uploads/receipts/receipt.jpg',
      }),
    );
    const service = new ExpensesService(
      {
        cropSeason: {
          findFirst: jest.fn().mockResolvedValue(makeSeason()),
        },
        expenseEntry: {
          create,
        },
      } as never,
      {
        saveFile,
      } as never,
    );

    await service.createExpense(
      'user-id',
      {
        cropSeasonId: 'season-id',
        title: 'Tractor rental',
        amount: 1800,
        expenseDate: new Date('2026-04-29'),
        category: 'EQUIPMENT',
        status: 'PENDING',
        isRecurring: false,
      },
      makeFile('receipt.jpg'),
    );

    expect(saveFile).toHaveBeenCalledWith(expect.objectContaining({ originalname: 'receipt.jpg' }), 'expense-receipts');
    const createArg = create.mock.calls[0]?.[0];
    expect(createArg.data.receiptUrl).toBe('/uploads/receipts/receipt.jpg');
  });

  it('rejects writes for unowned crop seasons', async () => {
    const service = new ExpensesService(
      {
        cropSeason: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      } as never,
      {
        saveFile: jest.fn(),
      } as never,
    );

    await expect(
      service.createExpense('user-id', {
        cropSeasonId: 'missing-season',
        title: 'Transport',
        amount: 750,
        expenseDate: new Date('2026-04-29'),
        category: 'TRANSPORT',
        status: 'PAID',
        isRecurring: false,
      }),
    ).rejects.toThrow('Crop season not found');
  });

  it('filters expense lists by month scope, status, and search text', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = new ExpensesService(
      {
        expenseEntry: {
          findMany,
        },
      } as never,
      {
        saveFile: jest.fn(),
      } as never,
    );

    await service.listExpenses('user-id', {
      scope: 'month',
      status: 'PENDING',
      search: 'tractor',
    });

    const findManyArg = findMany.mock.calls[0]?.[0];
    expect(findManyArg.where.userId).toBe('user-id');
    expect(findManyArg.where.status).toBe('PENDING');
    expect(findManyArg.where.OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: expect.objectContaining({
            contains: 'tractor',
          }),
        }),
      ]),
    );
    expect(findManyArg.where.expenseDate).toEqual(
      expect.objectContaining({
        gte: expect.any(Date),
        lt: expect.any(Date),
      }),
    );
  });

  it('builds month summaries with paid, pending, and category breakdown math', async () => {
    const findMany = jest
      .fn()
      .mockResolvedValueOnce([
        makeSummaryEntry({ amount: 3500, category: 'FERTILIZER', status: 'PAID' }),
        makeSummaryEntry({ amount: 1800, category: 'EQUIPMENT', status: 'PENDING' }),
      ])
      .mockResolvedValueOnce([
        makeSummaryEntry({ amount: 2200, category: 'FERTILIZER', status: 'PAID' }),
      ]);
    const service = new ExpensesService(
      {
        expenseEntry: {
          findMany,
        },
      } as never,
      {
        saveFile: jest.fn(),
      } as never,
    );

    const result = await service.getSummary('user-id', { scope: 'month' });

    expect(result.summary.totalAmount).toBe(5300);
    expect(result.summary.paidAmount).toBe(3500);
    expect(result.summary.pendingAmount).toBe(1800);
    expect(result.summary.trend.direction).toBe('UP');
    expect(result.summary.categories.find((item) => item.category === 'FERTILIZER')).toMatchObject({
      amount: 3500,
      previousAmount: 2200,
    });
  });

  it('builds season summaries against the previous season and returns season budget progress', async () => {
    const cropSeasonFindFirst = jest
      .fn()
      .mockResolvedValueOnce(makeSeason({ id: 'season-id', cropName: 'Soybean' }))
      .mockResolvedValueOnce(makeSeason({ id: 'previous-season-id', cropName: 'Wheat' }))
      .mockResolvedValueOnce(makeSeason({ id: 'season-id', cropName: 'Soybean' }));
    const findMany = jest
      .fn()
      .mockResolvedValueOnce([
        makeSummaryEntry({ amount: 4000, category: 'FERTILIZER', status: 'PAID', cropSeasonId: 'season-id' }),
        makeSummaryEntry({ amount: 1200, category: 'LABOUR', status: 'PENDING', cropSeasonId: 'season-id' }),
      ])
      .mockResolvedValueOnce([
        makeSummaryEntry({ amount: 2600, category: 'FERTILIZER', status: 'PAID', cropSeasonId: 'previous-season-id' }),
      ])
      .mockResolvedValueOnce([
        makeSummaryEntry({ amount: 4000, category: 'FERTILIZER', status: 'PAID', cropSeasonId: 'season-id' }),
        makeSummaryEntry({ amount: 1200, category: 'LABOUR', status: 'PENDING', cropSeasonId: 'season-id' }),
      ]);
    const service = new ExpensesService(
      {
        cropSeason: {
          findFirst: cropSeasonFindFirst,
        },
        expenseEntry: {
          findMany,
        },
        expenseBudget: {
          findUnique: jest.fn().mockResolvedValue({
            cropSeasonId: 'season-id',
            amount: 10000,
            updatedAt: new Date('2026-04-29T00:00:00.000Z'),
          }),
        },
      } as never,
      {
        saveFile: jest.fn(),
      } as never,
    );

    const result = await service.getSummary('user-id', {
      scope: 'season',
      cropSeasonId: 'season-id',
    });

    expect(result.summary.periodLabel).toBe('Soybean season');
    expect(result.summary.trend.comparisonLabel).toBe('vs previous Wheat season');
    expect(result.summary.totalAmount).toBe(5200);
    expect(result.summary.budget).toMatchObject({
      amount: 10000,
      spentAmount: 5200,
      pendingAmount: 1200,
      usedPercent: 52,
    });
  });

  it('upserts budgets for owned seasons and returns the refreshed snapshot', async () => {
    const cropSeasonFindFirst = jest
      .fn()
      .mockResolvedValueOnce(makeSeason())
      .mockResolvedValueOnce(makeSeason());
    const upsert = jest.fn().mockResolvedValue({});
    const service = new ExpensesService(
      {
        cropSeason: {
          findFirst: cropSeasonFindFirst,
        },
        expenseBudget: {
          upsert,
          findUnique: jest.fn().mockResolvedValue({
            cropSeasonId: 'season-id',
            amount: 36000,
            updatedAt: new Date('2026-04-29T00:00:00.000Z'),
          }),
        },
        expenseEntry: {
          findMany: jest.fn().mockResolvedValue([
            makeSummaryEntry({ amount: 12000, status: 'PAID', cropSeasonId: 'season-id' }),
            makeSummaryEntry({ amount: 1800, status: 'PENDING', cropSeasonId: 'season-id' }),
          ]),
        },
      } as never,
      {
        saveFile: jest.fn(),
      } as never,
    );

    const result = await service.upsertBudget('user-id', {
      cropSeasonId: 'season-id',
      amount: 36000,
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { cropSeasonId: 'season-id' },
      }),
    );
    expect(result.budget).toMatchObject({
      amount: 36000,
      spentAmount: 13800,
      pendingAmount: 1800,
    });
  });
});

function makeSeason(overrides?: Partial<{
  id: string;
  cropName: string;
  currentStage: string;
  sowingDate: Date;
  farmPlotId: string;
  status: 'PLANNED' | 'ACTIVE' | 'HARVESTED' | 'ARCHIVED';
}>) {
  return {
    id: 'season-id',
    cropName: 'Soybean',
    currentStage: 'Vegetative',
    sowingDate: new Date('2026-04-01T00:00:00.000Z'),
    farmPlotId: 'plot-id',
    status: 'ACTIVE' as const,
    ...overrides,
  };
}

function makeExpenseRecord(overrides?: Partial<{
  id: string;
  cropSeasonId: string;
  title: string;
  amount: number;
  category: string;
  status: string;
  isRecurring: boolean;
  vendor: string | null;
  note: string | null;
  receiptUrl: string | null;
}>) {
  const season = makeSeason({ id: overrides?.cropSeasonId ?? 'season-id' });

  return {
    id: 'expense-id',
    userId: 'user-id',
    cropSeasonId: season.id,
    title: 'Expense title',
    amount: 1000,
    expenseDate: new Date('2026-04-29T00:00:00.000Z'),
    category: 'OTHER',
    status: 'PAID',
    isRecurring: false,
    vendor: null,
    note: null,
    receiptUrl: null,
    createdAt: new Date('2026-04-29T00:00:00.000Z'),
    updatedAt: new Date('2026-04-29T00:00:00.000Z'),
    cropSeason: season,
    ...overrides,
  };
}

function makeSummaryEntry(overrides?: Partial<{
  amount: number;
  category: string;
  status: string;
  cropSeasonId: string;
}>) {
  return {
    id: `expense-${Math.random().toString(36).slice(2, 8)}`,
    userId: 'user-id',
    cropSeasonId: 'season-id',
    title: 'Summary expense',
    amount: 1000,
    expenseDate: new Date('2026-04-29T00:00:00.000Z'),
    category: 'OTHER',
    status: 'PAID',
    isRecurring: false,
    vendor: null,
    note: null,
    receiptUrl: null,
    createdAt: new Date('2026-04-29T00:00:00.000Z'),
    updatedAt: new Date('2026-04-29T00:00:00.000Z'),
    ...overrides,
  };
}

function makeFile(originalname: string): Express.Multer.File {
  return {
    originalname,
    mimetype: 'image/jpeg',
    buffer: Buffer.from('fake-image'),
  } as Express.Multer.File;
}
