import { apiDelete, apiGet, apiPatch, apiPost, apiRequest } from '@/lib/api';
import type {
  ExpenseBudgetResponse,
  ExpenseDeleteResponse,
  ExpenseEntry,
  ExpenseListResponse,
  ExpenseScopeType,
  ExpenseStatusType,
  ExpenseSummaryResponse,
} from '@/lib/api-types';
import type { ExpenseCategoryType } from '@/lib/api-types';

export type ExpenseDraftPayload = {
  cropSeasonId: string;
  title: string;
  amount: number;
  expenseDate: string;
  category: ExpenseCategoryType;
  status: ExpenseStatusType;
  isRecurring: boolean;
  vendor?: string;
  note?: string;
};

export type ExpensePatchPayload = Partial<ExpenseDraftPayload> & {
  deleteReceipt?: boolean;
};

type ListExpenseQuery = {
  scope?: ExpenseScopeType;
  cropSeasonId?: string;
  status?: ExpenseStatusType;
  category?: ExpenseCategoryType;
  recurring?: boolean;
  search?: string;
};

function buildImagePart(uri: string, fallbackName: string) {
  const extension = uri.split('.').pop()?.split('?')[0]?.toLowerCase() ?? 'jpg';
  const mimeType =
    extension === 'png'
      ? 'image/png'
      : extension === 'webp'
        ? 'image/webp'
        : 'image/jpeg';

  return {
    uri,
    name: `${fallbackName}.${extension}`,
    type: mimeType,
  } as unknown as Blob;
}

function appendExpenseFields(form: FormData, payload: ExpenseDraftPayload | ExpensePatchPayload) {
  const appendValue = (key: string, value: string | number | boolean | undefined) => {
    if (value === undefined) {
      return;
    }

    form.append(key, String(value));
  };

  appendValue('cropSeasonId', payload.cropSeasonId);
  appendValue('title', payload.title);
  appendValue('amount', payload.amount);
  appendValue('expenseDate', payload.expenseDate);
  appendValue('category', payload.category);
  appendValue('status', payload.status);
  appendValue('isRecurring', payload.isRecurring);
  appendValue('vendor', payload.vendor);
  appendValue('note', payload.note);

  if ('deleteReceipt' in payload && payload.deleteReceipt !== undefined) {
    appendValue('deleteReceipt', payload.deleteReceipt);
  }
}

function toQueryString(query?: ListExpenseQuery) {
  if (!query) {
    return '';
  }

  const params = new URLSearchParams();
  if (query.scope) {
    params.set('scope', query.scope);
  }
  if (query.cropSeasonId) {
    params.set('cropSeasonId', query.cropSeasonId);
  }
  if (query.status) {
    params.set('status', query.status);
  }
  if (query.category) {
    params.set('category', query.category);
  }
  if (query.recurring != null) {
    params.set('recurring', String(query.recurring));
  }
  if (query.search?.trim()) {
    params.set('search', query.search.trim());
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

export function listExpenses(token: string, query?: ListExpenseQuery) {
  return apiGet<ExpenseListResponse>(`/expenses${toQueryString(query)}`, token);
}

export function getExpenseSummary(
  token: string,
  query: { scope: ExpenseScopeType; cropSeasonId?: string },
) {
  return apiGet<ExpenseSummaryResponse>(`/expenses/summary${toQueryString(query)}`, token);
}

export async function createExpenseRecord(
  token: string,
  payload: ExpenseDraftPayload,
  receiptUri?: string,
) {
  if (!receiptUri) {
    return apiPost<{ expense: ExpenseEntry }>('/expenses', payload, token);
  }

  const form = new FormData();
  appendExpenseFields(form, payload);
  form.append('receipt', buildImagePart(receiptUri, 'expense-receipt'));
  return apiPost<{ expense: ExpenseEntry }>('/expenses', form, token);
}

export async function updateExpenseRecord(
  token: string,
  expenseId: string,
  payload: ExpensePatchPayload,
  receiptUri?: string,
) {
  if (!receiptUri) {
    return apiPatch<{ expense: ExpenseEntry }>(`/expenses/${expenseId}`, payload, token);
  }

  const form = new FormData();
  appendExpenseFields(form, payload);
  form.append('receipt', buildImagePart(receiptUri, 'expense-receipt'));
  return apiPatch<{ expense: ExpenseEntry }>(`/expenses/${expenseId}`, form, token);
}

export function deleteExpenseRecord(token: string, expenseId: string) {
  return apiDelete<ExpenseDeleteResponse>(`/expenses/${expenseId}`, token);
}

export function upsertExpenseBudget(
  token: string,
  payload: { cropSeasonId: string; amount: number | null },
) {
  return apiRequest<ExpenseBudgetResponse>('/expenses/budget', {
    method: 'PUT',
    token,
    body: JSON.stringify(payload),
  });
}
