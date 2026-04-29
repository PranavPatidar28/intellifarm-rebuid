import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Camera, ImagePlus, Trash2 } from 'lucide-react-native';

import { Button } from '@/components/button';
import { FilterChipRow } from '@/components/filter-chip-row';
import { ProfileStatusCard } from '@/components/profile-status-card';
import { SelectField } from '@/components/select-field';
import { SheetFormCard } from '@/components/sheet-form-card';
import { TextField } from '@/components/text-field';
import { useSession } from '@/features/session/session-provider';
import { listExpenses, type ExpenseDraftPayload, type ExpensePatchPayload } from '@/lib/expense-api';
import type { ExpenseEntry, ExpenseStatusType } from '@/lib/api-types';
import { storageKeys } from '@/lib/constants';
import { applyPendingExpenseMutations, expenseCategoryMeta, getInitialSeasonId } from '@/lib/expenses';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { useNetworkStatus } from '@/hooks/use-network-status';
import {
  getPendingExpenseMutations,
  queueExpenseCreate,
  queueExpenseDelete,
  queueExpenseUpdate,
} from '@/lib/pending-expense-mutations';
import { updateExpenseRecord, createExpenseRecord, deleteExpenseRecord } from '@/lib/expense-api';
import { useStoredValue } from '@/lib/storage';
import { palette, radii, spacing, typography } from '@/theme/tokens';
import { ApiError } from '@/lib/api';

type ComposerStatus = {
  tone: 'success' | 'warning';
  text: string;
} | null;

function getToday() {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

const statusOptions: Array<{ value: ExpenseStatusType; label: string }> = [
  { value: 'PAID', label: 'Paid' },
  { value: 'PENDING', label: 'Pending' },
];

export function ExpenseComposerSheet({
  expenseId,
  autoLaunchReceipt = false,
}: {
  expenseId?: string;
  autoLaunchReceipt?: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const network = useNetworkStatus();
  const { profile, token } = useSession();
  const [selectedSeasonId] = useStoredValue(storageKeys.selectedSeasonId, '');
  const [pendingMutations] = useStoredValue(
    storageKeys.pendingExpenseMutations,
    getPendingExpenseMutations(),
  );
  const expensesQuery = useCachedQuery({
    cacheKey: 'expenses:all',
    queryKey: ['expenses', token],
    enabled: Boolean(token),
    queryFn: () => listExpenses(token as string),
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
  const existingExpense = useMemo(
    () => mergedExpenses.find((entry) => entry.id === expenseId) ?? null,
    [expenseId, mergedExpenses],
  );
  const seasonOptions = useMemo(
    () =>
      (profile?.farms ?? []).flatMap((farm) =>
        farm.cropSeasons.map((season) => ({
          value: season.id,
          label: `${season.cropName} - ${farm.name}`,
        })),
      ),
    [profile?.farms],
  );
  const categoryOptions = useMemo(
    () =>
      Object.entries(expenseCategoryMeta).map(([value, meta]) => ({
        value: value as ExpenseDraftPayload['category'],
        label: meta.label,
      })),
    [],
  );

  const [cropSeasonId, setCropSeasonId] = useState('');
  const [category, setCategory] = useState<ExpenseDraftPayload['category']>('FERTILIZER');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(getToday());
  const [status, setStatus] = useState<ExpenseStatusType>('PAID');
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [deleteReceipt, setDeleteReceipt] = useState(false);
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<ComposerStatus>(null);
  const [autoLaunchHandled, setAutoLaunchHandled] = useState(false);
  const [openSelect, setOpenSelect] = useState<'season' | 'category' | null>(null);

  useEffect(() => {
    if (!existingExpense) {
      setCropSeasonId(getInitialSeasonId(profile, selectedSeasonId));
      setCategory('FERTILIZER');
      setTitle('');
      setAmount('');
      setExpenseDate(getToday());
      setStatus('PAID');
      setReceiptUri(null);
      setDeleteReceipt(false);
      return;
    }

    setCropSeasonId(existingExpense.cropSeasonId);
    setCategory(existingExpense.category);
    setTitle(existingExpense.title);
    setAmount(String(existingExpense.amount));
    setExpenseDate(existingExpense.expenseDate);
    setStatus(existingExpense.status);
    setReceiptUri(existingExpense.receiptUrl ?? null);
    setDeleteReceipt(false);
  }, [existingExpense, profile, selectedSeasonId]);

  const closeSelects = () => {
    setOpenSelect(null);
  };

  const pickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      setStatusMessage({
        tone: 'warning',
        text: 'Photo library permission is needed to attach a receipt.',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    if (!asset?.uri) {
      setStatusMessage({
        tone: 'warning',
        text: 'Could not read the selected receipt image.',
      });
      return;
    }

    setReceiptUri(asset.uri);
    setDeleteReceipt(false);
    setStatusMessage(null);
  };

  const launchCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== 'granted') {
      setStatusMessage({
        tone: 'warning',
        text: 'Camera permission is needed to scan a receipt.',
      });
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    if (!asset?.uri) {
      setStatusMessage({
        tone: 'warning',
        text: 'Could not capture the receipt image.',
      });
      return;
    }

    setReceiptUri(asset.uri);
    setDeleteReceipt(false);
    setStatusMessage(null);
  };

  useEffect(() => {
    if (!autoLaunchReceipt || autoLaunchHandled) {
      return;
    }

    setAutoLaunchHandled(true);
    void launchCamera();
  }, [autoLaunchHandled, autoLaunchReceipt]);

  const invalidateExpenseQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['expenses', token] }),
      queryClient.invalidateQueries({ queryKey: ['expense-summary', token] }),
    ]);
  };

  const saveExpense = async () => {
    const amountValue = Number(amount);
    if (!cropSeasonId) {
      setStatusMessage({
        tone: 'warning',
        text: 'Choose the crop season this expense belongs to.',
      });
      return;
    }

    if (!title.trim()) {
      setStatusMessage({
        tone: 'warning',
        text: 'Enter a short expense title.',
      });
      return;
    }

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setStatusMessage({
        tone: 'warning',
        text: 'Enter a valid amount greater than zero.',
      });
      return;
    }

    const payload: ExpenseDraftPayload = {
      cropSeasonId,
      title: title.trim(),
      amount: amountValue,
      expenseDate,
      category,
      status,
      isRecurring: false,
    };

    setBusy(true);
    setStatusMessage(null);
    closeSelects();

    try {
      const canWriteOnline = Boolean(token && !network.isOffline && !expenseId?.startsWith('local-expense-'));

      if (!expenseId) {
        if (canWriteOnline) {
          await createExpenseRecord(token as string, payload, receiptUri ?? undefined);
          await invalidateExpenseQueries();
        } else {
          await queueExpenseCreate(payload, receiptUri ?? undefined);
        }
      } else if (canWriteOnline) {
        const patch: ExpensePatchPayload = {
          cropSeasonId,
          title: title.trim(),
          amount: amountValue,
          expenseDate,
          category,
          status,
          deleteReceipt,
        };
        const receiptToUpload =
          receiptUri && !receiptUri.startsWith('http') ? receiptUri : undefined;
        await updateExpenseRecord(token as string, expenseId, patch, receiptToUpload);
        await invalidateExpenseQueries();
      } else {
        await queueExpenseUpdate(
          expenseId,
          {
            ...payload,
            deleteReceipt,
          },
          receiptUri && !receiptUri.startsWith('http') ? receiptUri : undefined,
        );
      }

      router.back();
    } catch (error) {
      setStatusMessage({
        tone: 'warning',
        text:
          error instanceof ApiError ? error.message : 'Could not save the expense right now.',
      });
    } finally {
      setBusy(false);
    }
  };

  const removeExpense = async () => {
    if (!expenseId) {
      return;
    }

    setBusy(true);
    setStatusMessage(null);
    closeSelects();

    try {
      const canWriteOnline = Boolean(token && !network.isOffline && !expenseId.startsWith('local-expense-'));

      if (canWriteOnline) {
        await deleteExpenseRecord(token as string, expenseId);
        await invalidateExpenseQueries();
      } else {
        await queueExpenseDelete(expenseId);
      }

      router.back();
    } catch (error) {
      setStatusMessage({
        tone: 'warning',
        text:
          error instanceof ApiError ? error.message : 'Could not remove the expense right now.',
      });
    } finally {
      setBusy(false);
    }
  };

  const receiptSource =
    receiptUri && receiptUri.startsWith('http')
      ? {
          uri: receiptUri,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      : receiptUri;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      onScrollBeginDrag={closeSelects}
      contentContainerStyle={{
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: 104,
        gap: spacing.md,
        backgroundColor: palette.canvas,
      }}
    >
      <SheetFormCard
        title={expenseId ? 'Update expense' : 'Add a new expense'}
        subtitle="Log the spend quickly, keep the essentials accurate, and attach a receipt when you have one."
      >
        <View style={{ gap: spacing.md }}>
          <SelectField
            label="Crop season"
            value={cropSeasonId}
            options={seasonOptions}
            onChange={setCropSeasonId}
            placeholder="Choose the season"
            open={openSelect === 'season'}
            onOpenChange={(open) => {
              setOpenSelect(open ? 'season' : null);
            }}
          />

          <SelectField
            label="Category"
            value={category}
            options={categoryOptions}
            onChange={setCategory}
            placeholder="Choose the category"
            open={openSelect === 'category'}
            onOpenChange={(open) => {
              setOpenSelect(open ? 'category' : null);
            }}
          />

          <TextField
            label="Expense title"
            value={title}
            onChangeText={setTitle}
            placeholder="Urea, labour payment, tractor rental"
            onFocus={closeSelects}
          />

          <TextField
            label="Amount"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="2500"
            onFocus={closeSelects}
          />

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <TextField
                label="Date"
                value={expenseDate}
                onChangeText={setExpenseDate}
                helper="Use YYYY-MM-DD"
                onFocus={closeSelects}
              />
            </View>
            <View style={{ flex: 1, gap: spacing.sm }}>
              <Text
                style={{
                  color: palette.ink,
                  fontFamily: typography.bodyStrong,
                  fontSize: 13,
                }}
              >
                Status
              </Text>
              <FilterChipRow value={status} options={statusOptions} onChange={setStatus} />
            </View>
          </View>

          <View style={{ gap: spacing.sm }}>
            <Text
              style={{
                color: palette.ink,
                fontFamily: typography.bodyStrong,
                fontSize: 13,
              }}
            >
              Receipt
            </Text>

            {receiptSource ? (
              <View
                style={{
                  borderRadius: radii.xl,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: palette.outline,
                  backgroundColor: palette.white,
                }}
              >
                <Image
                  source={receiptSource}
                  contentFit="cover"
                  style={{ width: '100%', height: 180 }}
                />
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Button
                  label="Scan receipt"
                  variant="primary"
                  icon={<Camera color={palette.white} size={16} />}
                  onPress={() => {
                    closeSelects();
                    void launchCamera();
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label="Choose photo"
                  variant="soft"
                  icon={<ImagePlus color={palette.leafDark} size={16} />}
                  onPress={() => {
                    closeSelects();
                    void pickFromLibrary();
                  }}
                />
              </View>
            </View>

            {receiptUri ? (
              <Pressable
                onPress={() => {
                  setReceiptUri(null);
                  setDeleteReceipt(true);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
              >
                <Trash2 color={palette.terracotta} size={16} />
                <Text
                  style={{
                    color: palette.terracotta,
                    fontFamily: typography.bodyStrong,
                    fontSize: 12,
                  }}
                >
                  Remove receipt
                </Text>
              </Pressable>
            ) : null}
          </View>

          {statusMessage ? (
            <ProfileStatusCard message={statusMessage.text} tone={statusMessage.tone} />
          ) : null}
        </View>
      </SheetFormCard>

      <View style={{ gap: spacing.sm }}>
        <Button
          label={busy ? 'Saving expense...' : expenseId ? 'Save changes' : 'Save expense'}
          loading={busy}
          onPress={() => {
            void saveExpense();
          }}
        />
        {expenseId ? (
          <Button
            label="Delete expense"
            variant="ghost"
            onPress={() => {
              void removeExpense();
            }}
          />
        ) : null}
        <Button label="Cancel" variant="soft" onPress={() => router.back()} />
      </View>
    </ScrollView>
  );
}
