import * as FileSystem from 'expo-file-system/legacy';

import { storageKeys } from '@/lib/constants';
import { storage } from '@/lib/storage';

const QUEUE_DIRECTORY = `${FileSystem.documentDirectory ?? ''}pending-disease-reports`;

export type PendingDiseaseUpload = {
  id: string;
  createdAt: string;
  cropSeasonId?: string;
  placeLabel?: string;
  userNote?: string;
  cropImageUri: string;
  diseasedImageUri: string;
};

function readQueue() {
  return storage.get<PendingDiseaseUpload[]>(storageKeys.pendingDiseaseReports, []);
}

function writeQueue(items: PendingDiseaseUpload[]) {
  storage.set(storageKeys.pendingDiseaseReports, items);
}

async function ensureQueueDirectory() {
  await FileSystem.makeDirectoryAsync(QUEUE_DIRECTORY, { intermediates: true });
}

async function persistImage(id: string, kind: 'crop' | 'diseased', sourceUri: string) {
  await ensureQueueDirectory();
  const extension = sourceUri.split('.').pop()?.split('?')[0] ?? 'jpg';
  const targetUri = `${QUEUE_DIRECTORY}/${id}-${kind}.${extension}`;
  await FileSystem.copyAsync({ from: sourceUri, to: targetUri });
  return targetUri;
}

export async function queueDiseaseUpload(input: {
  cropSeasonId?: string;
  placeLabel?: string;
  userNote?: string;
  cropImageUri: string;
  diseasedImageUri: string;
}) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const [cropImageUri, diseasedImageUri] = await Promise.all([
    persistImage(id, 'crop', input.cropImageUri),
    persistImage(id, 'diseased', input.diseasedImageUri),
  ]);

  const item: PendingDiseaseUpload = {
    id,
    createdAt: new Date().toISOString(),
    cropSeasonId: input.cropSeasonId,
    placeLabel: input.placeLabel,
    userNote: input.userNote,
    cropImageUri,
    diseasedImageUri,
  };

  writeQueue([item, ...readQueue()]);
  return item;
}

export function getPendingDiseaseUploads() {
  return readQueue();
}

export async function clearPendingDiseaseUpload(id: string) {
  const current = readQueue();
  const next = current.filter((item) => item.id !== id);
  const removed = current.find((item) => item.id === id);

  writeQueue(next);

  if (removed) {
    await Promise.allSettled([
      FileSystem.deleteAsync(removed.cropImageUri, { idempotent: true }),
      FileSystem.deleteAsync(removed.diseasedImageUri, { idempotent: true }),
    ]);
  }
}
