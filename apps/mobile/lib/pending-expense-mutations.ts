import * as FileSystem from 'expo-file-system/legacy';

import { storageKeys } from '@/lib/constants';
import { storage } from '@/lib/storage';
import {
  createExpenseRecord,
  deleteExpenseRecord,
  type ExpenseDraftPayload,
  type ExpensePatchPayload,
  updateExpenseRecord,
  upsertExpenseBudget,
} from '@/lib/expense-api';

const QUEUE_DIRECTORY = `${FileSystem.documentDirectory ?? ''}pending-expense-mutations`;

export type PendingExpenseMutation =
  | {
      id: string;
      kind: 'create';
      createdAt: string;
      localId: string;
      draft: ExpenseDraftPayload;
      receiptUri?: string;
    }
  | {
      id: string;
      kind: 'update';
      createdAt: string;
      expenseId: string;
      patch: ExpensePatchPayload;
      receiptUri?: string;
    }
  | {
      id: string;
      kind: 'delete';
      createdAt: string;
      expenseId: string;
    }
  | {
      id: string;
      kind: 'upsert-budget';
      createdAt: string;
      cropSeasonId: string;
      amount: number | null;
    };

function readQueue() {
  return storage.get<PendingExpenseMutation[]>(storageKeys.pendingExpenseMutations, []);
}

function writeQueue(items: PendingExpenseMutation[]) {
  storage.set(storageKeys.pendingExpenseMutations, items);
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function ensureQueueDirectory() {
  await FileSystem.makeDirectoryAsync(QUEUE_DIRECTORY, { intermediates: true });
}

async function persistReceipt(id: string, sourceUri?: string) {
  if (!sourceUri) {
    return undefined;
  }

  await ensureQueueDirectory();
  const extension = sourceUri.split('.').pop()?.split('?')[0] ?? 'jpg';
  const targetUri = `${QUEUE_DIRECTORY}/${id}-receipt.${extension}`;
  await FileSystem.copyAsync({ from: sourceUri, to: targetUri });
  return targetUri;
}

async function cleanupReceipt(uri?: string) {
  if (!uri) {
    return;
  }

  await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined);
}

export function getPendingExpenseMutations() {
  return readQueue();
}

export async function queueExpenseCreate(
  draft: ExpenseDraftPayload,
  receiptUri?: string,
) {
  const mutationId = makeId('exp-mutation');
  const localId = makeId('local-expense');
  const persistedReceipt = await persistReceipt(mutationId, receiptUri);
  const next: PendingExpenseMutation = {
    id: mutationId,
    kind: 'create',
    createdAt: new Date().toISOString(),
    localId,
    draft,
    receiptUri: persistedReceipt,
  };

  writeQueue([next, ...readQueue()]);
  return localId;
}

export async function queueExpenseUpdate(
  expenseId: string,
  patch: ExpensePatchPayload,
  receiptUri?: string,
) {
  const current = readQueue();

  if (expenseId.startsWith('local-expense-')) {
    const updated = await Promise.all(
      current.map(async (item) => {
        if (item.kind !== 'create' || item.localId !== expenseId) {
          return item;
        }

        const mergedReceipt =
          receiptUri != null
            ? await persistReceipt(item.id, receiptUri)
            : patch.deleteReceipt
              ? undefined
              : item.receiptUri;

        if (receiptUri != null || patch.deleteReceipt) {
          await cleanupReceipt(item.receiptUri);
        }

        return {
          ...item,
          draft: {
            ...item.draft,
            ...patch,
            title: patch.title ?? item.draft.title,
            amount: patch.amount ?? item.draft.amount,
            expenseDate: patch.expenseDate ?? item.draft.expenseDate,
            category: patch.category ?? item.draft.category,
            status: patch.status ?? item.draft.status,
            isRecurring: patch.isRecurring ?? item.draft.isRecurring,
            vendor:
              Object.prototype.hasOwnProperty.call(patch, 'vendor')
                ? patch.vendor
                : item.draft.vendor,
            note:
              Object.prototype.hasOwnProperty.call(patch, 'note')
                ? patch.note
                : item.draft.note,
          },
          receiptUri: mergedReceipt,
        } satisfies PendingExpenseMutation;
      }),
    );

    writeQueue(updated);
    return;
  }

  const existingIndex = current.findIndex(
    (item) => item.kind === 'update' && item.expenseId === expenseId,
  );
  const mutationId = existingIndex >= 0 ? current[existingIndex]!.id : makeId('exp-mutation');
  const nextReceipt =
    receiptUri != null ? await persistReceipt(mutationId, receiptUri) : undefined;
  const existing = existingIndex >= 0 ? current[existingIndex] : null;

  if (existing?.kind === 'update' && (receiptUri != null || patch.deleteReceipt)) {
    await cleanupReceipt(existing.receiptUri);
  }

  const nextMutation: PendingExpenseMutation = {
    id: mutationId,
    kind: 'update',
    createdAt: new Date().toISOString(),
    expenseId,
    patch: {
      ...(existing?.kind === 'update' ? existing.patch : {}),
      ...patch,
    },
    receiptUri:
      nextReceipt ??
      (patch.deleteReceipt ? undefined : existing?.kind === 'update' ? existing.receiptUri : undefined),
  };

  const filtered = current.filter(
    (item) => !(item.kind === 'update' && item.expenseId === expenseId),
  );
  writeQueue([nextMutation, ...filtered]);
}

export async function queueExpenseDelete(expenseId: string) {
  const current = readQueue();

  if (expenseId.startsWith('local-expense-')) {
    const next = current.filter((item) => !(item.kind === 'create' && item.localId === expenseId));
    const removed = current.find((item) => item.kind === 'create' && item.localId === expenseId);
    if (removed?.kind === 'create') {
      await cleanupReceipt(removed.receiptUri);
    }
    writeQueue(next);
    return;
  }

  const removedUpdate = current.find(
    (item) => item.kind === 'update' && item.expenseId === expenseId,
  );
  if (removedUpdate?.kind === 'update') {
    await cleanupReceipt(removedUpdate.receiptUri);
  }

  const filtered = current.filter((item) => {
    if (item.kind === 'update' || item.kind === 'delete') {
      return item.expenseId !== expenseId;
    }

    return true;
  });

  writeQueue([
    {
      id: makeId('exp-mutation'),
      kind: 'delete',
      createdAt: new Date().toISOString(),
      expenseId,
    },
    ...filtered,
  ]);
}

export function queueExpenseBudgetUpsert(cropSeasonId: string, amount: number | null) {
  const filtered = readQueue().filter(
    (item) => !(item.kind === 'upsert-budget' && item.cropSeasonId === cropSeasonId),
  );

  writeQueue([
    {
      id: makeId('exp-mutation'),
      kind: 'upsert-budget',
      createdAt: new Date().toISOString(),
      cropSeasonId,
      amount,
    },
    ...filtered,
  ]);
}

async function clearMutationById(id: string) {
  const current = readQueue();
  const next = current.filter((item) => item.id !== id);
  const removed = current.find((item) => item.id === id);
  if (removed?.kind === 'create' || removed?.kind === 'update') {
    await cleanupReceipt(removed.receiptUri);
  }
  writeQueue(next);
}

export async function flushPendingExpenseMutations(token: string) {
  const current = [...readQueue()].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt),
  );
  let syncedCount = 0;

  for (const item of current) {
    try {
      if (item.kind === 'create') {
        await createExpenseRecord(token, item.draft, item.receiptUri);
      } else if (item.kind === 'update') {
        await updateExpenseRecord(token, item.expenseId, item.patch, item.receiptUri);
      } else if (item.kind === 'delete') {
        await deleteExpenseRecord(token, item.expenseId);
      } else {
        await upsertExpenseBudget(token, {
          cropSeasonId: item.cropSeasonId,
          amount: item.amount,
        });
      }

      await clearMutationById(item.id);
      syncedCount += 1;
    } catch {
      // Keep failed mutations queued for a future retry.
    }
  }

  return syncedCount;
}
