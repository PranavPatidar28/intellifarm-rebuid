import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Stack, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/button';
import { ProfileStatusCard } from '@/components/profile-status-card';
import { SheetFormCard } from '@/components/sheet-form-card';
import { TextField } from '@/components/text-field';
import { useExpenseTracker } from '@/hooks/use-expense-tracker';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useSession } from '@/features/session/session-provider';
import { queueExpenseBudgetUpsert } from '@/lib/pending-expense-mutations';
import { upsertExpenseBudget } from '@/lib/expense-api';
import { formatCurrency } from '@/lib/format';
import { ApiError } from '@/lib/api';
import { palette, spacing, typography } from '@/theme/tokens';

type BudgetStatus = {
  tone: 'success' | 'warning';
  text: string;
} | null;

function parseBudgetAmount(value: string) {
  const normalized = value.replace(/,/g, '').trim();
  if (!normalized) {
    return null;
  }

  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : Number.NaN;
}

export default function ExpenseBudgetRoute() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const network = useNetworkStatus();
  const { token } = useSession();
  const { summary, selectedSeason } = useExpenseTracker('season');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<BudgetStatus>(null);

  useEffect(() => {
    setAmount(summary.budget?.amount ? String(Math.round(summary.budget.amount)) : '');
  }, [summary.budget?.amount]);

  const invalidateExpenseQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['expenses', token] }),
      queryClient.invalidateQueries({ queryKey: ['expense-summary', token] }),
    ]);
  };

  const saveBudget = async (nextAmount: number | null) => {
    if (!selectedSeason?.id) {
      setStatusMessage({
        tone: 'warning',
        text: 'No crop season is currently selected for budget tracking.',
      });
      return;
    }

    if (nextAmount != null && (!Number.isFinite(nextAmount) || nextAmount <= 0)) {
      setStatusMessage({
        tone: 'warning',
        text: 'Enter a valid budget amount greater than zero.',
      });
      return;
    }

    setBusy(true);
    setStatusMessage(null);

    try {
      if (token && !network.isOffline) {
        await upsertExpenseBudget(token, {
          cropSeasonId: selectedSeason.id,
          amount: nextAmount,
        });
        await invalidateExpenseQueries();
      } else {
        queueExpenseBudgetUpsert(selectedSeason.id, nextAmount);
      }

      router.back();
    } catch (error) {
      setStatusMessage({
        tone: 'warning',
        text:
          error instanceof ApiError ? error.message : 'Could not save the season budget right now.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Season budget' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: 120,
          gap: spacing.md,
          backgroundColor: palette.canvas,
        }}
      >
        <SheetFormCard
          title="Manage season budget"
          subtitle="Track one working budget for the selected crop season so the expense dashboard can show progress clearly."
        >
          <View style={{ gap: spacing.md }}>
            <View style={{ gap: 4 }}>
              <Text
                style={{
                  color: palette.ink,
                  fontFamily: typography.bodyStrong,
                  fontSize: 15,
                }}
              >
                {selectedSeason?.cropName ?? 'Current season'}
              </Text>
              <Text
                style={{
                  color: palette.inkSoft,
                  fontFamily: typography.bodyRegular,
                  fontSize: 12,
                }}
              >
                Logged season spend: {formatCurrency(summary.budget?.spentAmount ?? summary.totalAmount)}
              </Text>
              <Text
                style={{
                  color: palette.inkSoft,
                  fontFamily: typography.bodyRegular,
                  fontSize: 12,
                }}
              >
                Pending season payments: {formatCurrency(summary.budget?.pendingAmount ?? summary.pendingAmount)}
              </Text>
            </View>

            <TextField
              label="Season budget"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="36000"
              helper="Leave empty and use Clear budget if you want to remove the target."
            />

            {statusMessage ? (
              <ProfileStatusCard message={statusMessage.text} tone={statusMessage.tone} />
            ) : null}
          </View>
        </SheetFormCard>

        <View style={{ gap: spacing.sm }}>
          <Button
            label={busy ? 'Saving budget...' : 'Save budget'}
            loading={busy}
            onPress={() => {
              void saveBudget(parseBudgetAmount(amount));
            }}
          />
          <Button
            label="Clear budget"
            variant="ghost"
            onPress={() => {
              void saveBudget(null);
            }}
          />
          <Button label="Cancel" variant="soft" onPress={() => router.back()} />
        </View>
      </ScrollView>
    </>
  );
}
