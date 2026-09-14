import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { AppError } from '../utils/errors.js';
import { sniffMime } from '../middleware/upload.js';
import { documentTypes } from '../models/index.js';
import { z } from '../middleware/validation.js';
import { audit, owned, requireConsent } from '../services/access.js';
import { overallReadiness, redactIdentifiers } from '../services/documentAnalysis.js';
const publicDocument = doc => { const { safeFileName, __v, ...result } = doc; return result; };
export function documentsController(store, config, providers) {
  return {
    upload: async (req, res) => {
      const body = z.object({ documentType: z.enum(documentTypes) }).strict().parse(req.body);
      if (!req.file) throw new AppError(400, 'Upload a file using the file field');
      const detected = sniffMime(req.file.buffer);
      if (detected.mime !== req.file.mimetype) throw new AppError(415, 'Declared MIME type does not match file contents');
      const extension = path.extname(req.file.originalname).toLowerCase();
      if (!(detected.mime === 'image/jpeg' ? ['.jpg', '.jpeg'] : [detected.extension]).includes(extension)) throw new AppError(415, 'Filename extension does not match file contents');
      const safeFileName = `${randomUUID()}${detected.extension}`;
      await fs.mkdir(config.uploadDir, { recursive: true, mode: 0o700 });
      const target = path.join(config.uploadDir, safeFileName);
      await fs.writeFile(target, req.file.buffer, { flag: 'wx', mode: 0o600 });
      let document;
      try {
        document = await store.create('Document', { userId: req.user._id, documentType: body.documentType,
          safeFileName, originalFileName: redactIdentifiers(path.basename(req.file.originalname)).replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 150),
          mimeType: detected.mime, size: req.file.size, status: 'uploaded' });
      } catch (error) { await fs.unlink(target).catch(() => {}); throw error; }
      await audit(store, req.user._id, 'DOCUMENT_UPLOAD', document._id);
      res.status(201).json({ document: publicDocument(document) });
    },
    list: async (req, res) => res.json({ data: (await store.find('Document', { userId: req.user._id })).map(publicDocument) }),
    analyze: async (req, res) => {
      const document = await owned(store, 'Document', req.params.id, req.user._id);
      await requireConsent(store, { userId: req.user._id, consentId: req.body.consentId, purpose: 'DOCUMENT_ANALYSIS', documentId: document._id });
      const result = await providers.document.analyzeIdentityDocument({ document, user: req.user });
      // Recheck after potentially long OCR so a revoked consent cannot authorize persistence.
      await requireConsent(store, { userId: req.user._id, consentId: req.body.consentId, purpose: 'DOCUMENT_ANALYSIS', documentId: document._id });
      const old = await store.one('DocumentAnalysis', { documentId: document._id });
      const analysis = old ? await store.update('DocumentAnalysis', old._id, result) : await store.create('DocumentAnalysis', { documentId: document._id, ...result });
      await store.update('Document', document._id, { status: result.status, maskedIdentifier: result.maskedIdentifier });
      await audit(store, req.user._id, 'DOCUMENT_ANALYSIS', document._id);
      res.json({ analysis });
    },
    readiness: async (req, res) => res.json(await overallReadiness(store, req.user._id)),
  };
}
