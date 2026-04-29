import { Stack, useLocalSearchParams } from 'expo-router';

import { ExpenseComposerSheet } from '@/components/expense-composer-sheet';

export default function AddExpenseRoute() {
  const params = useLocalSearchParams<{ scanReceipt?: string }>();

  return (
    <>
      <Stack.Screen options={{ title: 'Add expense' }} />
      <ExpenseComposerSheet autoLaunchReceipt={params.scanReceipt === '1'} />
    </>
  );
}
