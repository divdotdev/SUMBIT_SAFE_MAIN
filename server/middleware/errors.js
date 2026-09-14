export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  if (err.name === 'ZodError') return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request', fields: err.issues.map(i => ({ path: i.path.join('.'), message: i.message })) } });
  if (err.code === 11000) return res.status(409).json({ error: { code: 'CONFLICT', message: 'Record already exists' } });
  if (err.name === 'MulterError') return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: { code: err.code, message: err.code === 'LIMIT_FILE_SIZE' ? 'File exceeds the upload size limit' : 'Invalid multipart upload' } });
  if (['ValidationError', 'CastError', 'StrictModeError'].includes(err.name)) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid record data' } });
  const status = err.status || (err.type === 'entity.too.large' ? 413 : 500);
  // Never log request bodies, tokens, document text, credentials or vendor errors.
  return res.status(status).json({ error: { code: err.code || (status === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR'), message: status === 500 ? 'An internal error occurred' : err.type === 'entity.parse.failed' ? 'Invalid JSON body' : err.message } });
}
