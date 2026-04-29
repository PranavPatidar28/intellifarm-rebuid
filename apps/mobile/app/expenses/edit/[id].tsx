import { Stack, useLocalSearchParams } from 'expo-router';

import { ExpenseComposerSheet } from '@/components/expense-composer-sheet';

export default function EditExpenseRoute() {
  const params = useLocalSearchParams<{ id?: string }>();

  return (
    <>
      <Stack.Screen options={{ title: 'Edit expense' }} />
      <ExpenseComposerSheet expenseId={params.id} />
    </>
  );
}
