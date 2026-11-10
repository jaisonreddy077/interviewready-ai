export function notFound(req, res) {
  res.status(404).json({ error: 'Route not found.' });
}

export function handleError(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error.status === 400 && error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON request body.' });
  }
  if (error.status === 413) return res.status(413).json({ error: 'Request body is too large.' });
  if (error.status >= 400 && error.status < 500) return res.status(error.status).json({ error: error.message });
  if (error.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'PDF must be smaller than 5 MB.' });
  if (error.code === 11000) return res.status(409).json({ error: 'An account with that email already exists.' });
  console.error(error);
  return res.status(500).json({ error: 'Something went wrong. Please try again.' });
}
