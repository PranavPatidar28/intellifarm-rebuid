import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Stack, useRouter } from 'expo-router';

import { Button } from '@/components/button';
import { FilterChipRow } from '@/components/filter-chip-row';
import { SheetFormCard } from '@/components/sheet-form-card';
import { TextField } from '@/components/text-field';
import {
  addExpenseEntry,
  expenseCategoryMeta,
  type ExpenseCategory,
} from '@/lib/expenses';
import { palette, spacing, typography } from '@/theme/tokens';

const categories = Object.entries(expenseCategoryMeta).map(([value, meta]) => ({
  value: value as ExpenseCategory,
  label: meta.label,
}));

function getToday() {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export default function AddExpenseRoute() {
  const router = useRouter();
  const [category, setCategory] = useState<ExpenseCategory>('SEEDS');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getToday());
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const amountNumber = useMemo(() => Number(amount), [amount]);

  const saveExpense = () => {
    if (!title.trim()) {
      setMessage('Enter a short expense title.');
      return;
    }

    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setMessage('Enter a valid amount greater than zero.');
      return;
    }

    addExpenseEntry({
      category,
      title: title.trim(),
      amount: amountNumber,
      date,
      note: note.trim() || undefined,
    });

    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Add expense' }} />
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
          title="Add a new expense"
          subtitle="Keep it short and simple so it stays fast to use in the field."
        >
          <View style={{ gap: spacing.md }}>
            <View style={{ gap: spacing.sm }}>
              <Text
                style={{
                  color: palette.ink,
                  fontFamily: typography.bodyStrong,
                  fontSize: 14,
                }}
              >
                Category
              </Text>
              <FilterChipRow
                value={category}
                options={categories}
                onChange={setCategory}
              />
            </View>

            <TextField
              label="Expense title"
              value={title}
              onChangeText={setTitle}
              placeholder="DAP fertilizer or labour payment"
            />
            <TextField
              label="Amount"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="2500"
            />
            <TextField
              label="Date"
              value={date}
              onChangeText={setDate}
              helper="Use YYYY-MM-DD for now."
            />
            <TextField
              label="Note"
              value={note}
              onChangeText={setNote}
              placeholder="Optional field note"
              multiline
            />

            {message ? (
              <Text
                style={{
                  color: palette.terracotta,
                  fontFamily: typography.bodyRegular,
                  fontSize: 12,
                  lineHeight: 18,
                }}
              >
                {message}
              </Text>
            ) : null}
          </View>
        </SheetFormCard>

        <View style={{ gap: spacing.sm }}>
          <Button label="Save expense" onPress={saveExpense} />
          <Button label="Cancel" variant="soft" onPress={() => router.back()} />
        </View>
      </ScrollView>
    </>
  );
}
