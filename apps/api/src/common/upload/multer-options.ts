import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import type { Request } from 'express';

const MB = 1024 * 1024;

const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg', // non-standard but emitted by some Android cameras / older browsers
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

const AUDIO_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/mp4',
  'audio/aac',
  'audio/wav',
  'audio/x-wav',
  'audio/webm',
  'audio/ogg',
  'audio/3gpp',
  'audio/amr',
]);

type FileFilterCallback = (error: Error | null, acceptFile: boolean) => void;

function makeFilter(allowed: Set<string>) {
  return (
    _req: Request,
    file: Express.Multer.File,
    callback: FileFilterCallback,
  ) => {
    if (allowed.has(file.mimetype)) {
      callback(null, true);
      return;
    }
    callback(
      new BadRequestException(
        `Unsupported file type "${file.mimetype}". Allowed: ${[...allowed].join(', ')}.`,
      ),
      false,
    );
  };
}

/** Images only (profile photos, community posts, expense receipts). 5MB cap. */
export const imageUploadOptions: MulterOptions = {
  limits: { fileSize: 5 * MB, files: 1 },
  fileFilter: makeFilter(IMAGE_MIME_TYPES),
};

/** Images + audio (disease reports: crop photos plus an optional voice note). */
export const mediaUploadOptions: MulterOptions = {
  limits: { fileSize: 15 * MB, files: 6 },
  fileFilter: makeFilter(new Set([...IMAGE_MIME_TYPES, ...AUDIO_MIME_TYPES])),
};

/** Images for assistant chat attachments. */
export const chatUploadOptions: MulterOptions = {
  limits: { fileSize: 10 * MB, files: 4 },
  fileFilter: makeFilter(IMAGE_MIME_TYPES),
};
