import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2, Trash2 } from 'lucide-react-native';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { SheetFormCard } from '@/components/sheet-form-card';
import { TextField } from '@/components/text-field';
import {
  addHomeTask,
  deleteHomeTask,
  readHomeTasks,
  toggleHomeTask,
  updateHomeTask,
} from '@/lib/home-tasks';
import { storageKeys } from '@/lib/constants';
import { useStoredValue } from '@/lib/storage';
import { palette, spacing, typography } from '@/theme/tokens';

export default function PersonalTaskRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const [tasks] = useStoredValue(storageKeys.homeTasks, readHomeTasks());
  const taskId = params.id ?? '';
  const isNew = taskId === 'new';
  const task = useMemo(
    () => (isNew ? null : tasks.find((item) => item.id === taskId) ?? null),
    [isNew, taskId, tasks],
  );
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setTitle(task?.title ?? '');
    setMessage(null);
  }, [task?.title]);

  const saveTask = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setMessage('Enter a short task title.');
      return;
    }

    if (isNew) {
      addHomeTask(trimmed);
    } else if (task) {
      updateHomeTask(task.id, { title: trimmed });
    }

    router.back();
  };

  if (!isNew && !task) {
    return (
      <>
        <Stack.Screen options={{ title: 'Task' }} />
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
          <EmptyState
            title="Task not found"
            description="This task may have been removed from the home to-do list."
          />
          <Button label="Back to Home" onPress={() => router.back()} />
        </ScrollView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: isNew ? 'Add task' : 'Edit task' }} />
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
          title={isNew ? 'Add a task' : 'Edit task'}
          subtitle="Keep it short so it stays easy to scan from Home."
        >
          <View style={{ gap: spacing.md }}>
            <TextField
              label="Task title"
              value={title}
              onChangeText={(value) => {
                setTitle(value);
                if (message) {
                  setMessage(null);
                }
              }}
              placeholder="Pay labour advance"
            />

            {!isNew && task ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                }}
              >
                <CheckCircle2 color={task.completed ? palette.leaf : palette.inkMuted} size={18} />
                <Text
                  style={{
                    color: palette.inkSoft,
                    fontFamily: typography.bodyRegular,
                    fontSize: 12,
                  }}
                >
                  {task.completed ? 'This task is marked done.' : 'This task is still open.'}
                </Text>
              </View>
            ) : null}

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
          <Button label={isNew ? 'Add task' : 'Save changes'} onPress={saveTask} />
          {!isNew && task ? (
            <Button
              label={task.completed ? 'Mark as open' : 'Mark as done'}
              variant="soft"
              onPress={() => {
                toggleHomeTask(task.id);
                router.back();
              }}
            />
          ) : null}
          {!isNew && task ? (
            <Button
              label="Delete task"
              variant="ghost"
              icon={<Trash2 color={palette.leaf} size={16} />}
              onPress={() => {
                deleteHomeTask(task.id);
                router.back();
              }}
            />
          ) : (
            <Button label="Cancel" variant="soft" onPress={() => router.back()} />
          )}
        </View>
      </ScrollView>
    </>
  );
}
