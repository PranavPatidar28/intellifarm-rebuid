import { apiPost } from '@/lib/api';
import type { DiseaseReportResponse } from '@/lib/api-types';
import {
  clearPendingDiseaseUpload,
  getPendingDiseaseUploads,
} from '@/lib/pending-disease-uploads';

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

export async function submitDiseaseReport({
  token,
  cropSeasonId,
  placeLabel,
  userNote,
  diseasedImageUri,
  cropImageUri,
}: {
  token: string;
  cropSeasonId?: string;
  placeLabel?: string;
  userNote?: string;
  diseasedImageUri: string;
  cropImageUri: string;
}) {
  const form = new FormData();
  form.append('captureMode', 'CAMERA_DUAL_ANGLE');

  if (cropSeasonId) {
    form.append('cropSeasonId', cropSeasonId);
  }

  if (placeLabel) {
    form.append('placeLabel', placeLabel);
  }

  if (userNote) {
    form.append('userNote', userNote);
  }

  form.append('diseasedImage', buildImagePart(diseasedImageUri, 'diseased-image'));
  form.append('cropImage', buildImagePart(cropImageUri, 'crop-image'));

  return apiPost<DiseaseReportResponse>('/disease-reports', form, token);
}

export async function flushPendingDiseaseUploads(token: string) {
  const items = getPendingDiseaseUploads();
  let syncedCount = 0;

  for (const item of items) {
    try {
      await submitDiseaseReport({
        token,
        cropSeasonId: item.cropSeasonId,
        placeLabel: item.placeLabel,
        userNote: item.userNote,
        diseasedImageUri: item.diseasedImageUri,
        cropImageUri: item.cropImageUri,
      });
      await clearPendingDiseaseUpload(item.id);
      syncedCount += 1;
    } catch {
      // Keep failed uploads queued for a future retry.
    }
  }

  return syncedCount;
}
