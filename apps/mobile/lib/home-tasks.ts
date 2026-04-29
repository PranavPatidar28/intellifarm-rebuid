import { storageKeys } from '@/lib/constants';
import { storage } from '@/lib/storage';

export type HomeTaskEntry = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
};

export function readHomeTasks() {
  return storage.get<HomeTaskEntry[]>(storageKeys.homeTasks, []);
}

export function saveHomeTasks(tasks: HomeTaskEntry[]) {
  storage.set(storageKeys.homeTasks, tasks);
}

export function addHomeTask(title: string) {
  const current = readHomeTasks();
  const now = new Date().toISOString();
  const next: HomeTaskEntry = {
    id: `todo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    completed: false,
    createdAt: now,
    updatedAt: now,
  };

  saveHomeTasks([next, ...current]);
  return next;
}

export function updateHomeTask(
  id: string,
  updates: Partial<Pick<HomeTaskEntry, 'title' | 'completed'>>,
) {
  let updatedTask: HomeTaskEntry | null = null;
  const next = readHomeTasks().map((task) => {
    if (task.id !== id) {
      return task;
    }

    updatedTask = {
      ...task,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    return updatedTask;
  });

  saveHomeTasks(next);
  return updatedTask;
}

export function toggleHomeTask(id: string) {
  const current = readHomeTasks().find((task) => task.id === id);
  if (!current) {
    return null;
  }

  return updateHomeTask(id, { completed: !current.completed });
}

export function deleteHomeTask(id: string) {
  saveHomeTasks(readHomeTasks().filter((task) => task.id !== id));
}

export function clearCompletedHomeTasks() {
  const next = readHomeTasks().filter((task) => !task.completed);
  saveHomeTasks(next);
  return next;
}

export function getOrderedHomeTasks(tasks: HomeTaskEntry[]) {
  return [...tasks].sort((left, right) => {
    if (left.completed !== right.completed) {
      return Number(left.completed) - Number(right.completed);
    }

    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
}
