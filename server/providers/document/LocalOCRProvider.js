import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createWorker } from 'tesseract.js';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { DocumentProvider } from './DocumentProvider.js';
import { analyzeText } from '../../services/documentAnalysis.js';
import { AppError } from '../../utils/errors.js';
const require = createRequire(import.meta.url);
export class LocalOCRProvider extends DocumentProvider {
  constructor(config) { super(); this.config = config; this.busy = false; }
  async analyzeIdentityDocument({ document, user }) {
    let text = ''; let confidence = 0; const warnings = [];
    if (this.busy) throw new AppError(429, 'Document extraction is busy; retry shortly', 'OCR_BUSY');
    this.busy = true;
    try {
      const filePath = path.join(this.config.uploadDir, document.safeFileName);
      if (document.mimeType === 'application/pdf') {
        const task = getDocument({ data: new Uint8Array(await fs.readFile(filePath)), useSystemFonts: true, isEvalSupported: false, verbosity: 0 });
        try {
          const pdf = await task.promise;
          for (let i = 1; i <= Math.min(pdf.numPages, 30) && text.length < 200000; i += 1) {
            const page = await pdf.getPage(i); const content = await page.getTextContent();
            text += content.items.map(item => (item.str || '') + (item.hasEOL ? '\n' : ' ')).join('') + '\n'; page.cleanup();
          }
          text = text.slice(0, 200000); confidence = text.trim() ? 90 : 0;
          if (pdf.numPages > 30) warnings.push('Only the first 30 pages were analyzed');
        } finally { await task.destroy(); }
        if (!text.trim()) warnings.push('Scanned PDF needs manual review; upload a PNG/JPEG for local OCR');
      } else if (this.config.localOcrEnabled) {
        // Bundled language data prevents runtime CDN/language downloads.
        const langPath = path.join(path.dirname(require.resolve('@tesseract.js-data/eng/package.json')), '4.0.0_best_int');
        const worker = await createWorker('eng', 1, { langPath, cacheMethod: 'none', gzip: true, logger: () => {}, errorHandler: () => {} });
        let timer;
        try {
          const result = await Promise.race([worker.recognize(filePath), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('OCR timeout')), 30000); })]);
          text = result.data.text.slice(0, 200000); confidence = result.data.confidence;
        } finally { clearTimeout(timer); await worker.terminate(); }
      } else warnings.push('Local OCR is disabled; manual review is required');
    } catch { warnings.push('Text extraction could not be completed; provide a readable document for manual review'); }
    finally { this.busy = false; }
    return analyzeText({ text, confidence, documentType: document.documentType, user, warnings, extractionMethod: document.mimeType === 'application/pdf' ? 'PDF_TEXT' : 'LOCAL_OCR' });
  }
}
