import multer from 'multer';
import { AppError } from '../utils/errors.js';
export function createUpload(config) {
  return multer({ storage: multer.memoryStorage(), limits: { fileSize: config.maxUploadBytes, files: 1, fields: 2, parts: 3 },
    fileFilter(req, file, cb) { cb(['application/pdf', 'image/png', 'image/jpeg'].includes(file.mimetype) ? null : new AppError(415, 'Only PDF, PNG and JPEG files are accepted'), true); },
  }).single('file');
}
export function sniffMime(buffer) {
  if (buffer.subarray(0, 5).toString() === '%PDF-') return { mime: 'application/pdf', extension: '.pdf' };
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return { mime: 'image/png', extension: '.png' };
  if (buffer.length > 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return { mime: 'image/jpeg', extension: '.jpg' };
  throw new AppError(415, 'File contents are not a supported PDF, PNG or JPEG');
}
