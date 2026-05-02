import { ConfigService } from '@nestjs/config';

import { StorageService } from './storage.service';

type DiseaseReportFindFirstArg = {
  where: {
    userId: string;
    [key: string]: unknown;
  };
};

describe('StorageService', () => {
  it('authorizes disease report media through direct report user ownership', async () => {
    const findFirst = jest
      .fn<Promise<{ id: string }>, [DiseaseReportFindFirstArg]>()
      .mockResolvedValue({ id: 'report-id' });
    const service = new StorageService(
      {
        get: jest.fn((key: string, fallback?: string) => fallback),
      } as unknown as ConfigService,
      {
        diseaseReport: {
          findFirst,
        },
      } as never,
    );

    const owned = await (
      service as unknown as {
        isOwnedByUser(
          userId: string,
          folder: string,
          filename: string,
        ): Promise<boolean>;
      }
    ).isOwnedByUser('user-id', 'disease-reports', 'symptom.jpg');

    expect(owned).toBe(true);
    const findFirstArg = findFirst.mock.calls[0]?.[0];
    expect(findFirstArg.where.userId).toBe('user-id');
  });

  it('authorizes expense receipt media through direct expense user ownership', async () => {
    const findFirst = jest
      .fn<Promise<{ id: string }>, [DiseaseReportFindFirstArg]>()
      .mockResolvedValue({ id: 'expense-id' });
    const service = new StorageService(
      {
        get: jest.fn((key: string, fallback?: string) => fallback),
      } as unknown as ConfigService,
      {
        expenseEntry: {
          findFirst,
        },
      } as never,
    );

    const owned = await (
      service as unknown as {
        isOwnedByUser(
          userId: string,
          folder: string,
          filename: string,
        ): Promise<boolean>;
      }
    ).isOwnedByUser('user-id', 'expense-receipts', 'receipt.jpg');

    expect(owned).toBe(true);
    const findFirstArg = findFirst.mock.calls[0]?.[0];
    expect(findFirstArg.where.userId).toBe('user-id');
  });
});
