export function requireApiKey(req, res, next) {
  const expected = process.env.API_KEY;
  if (!expected) return next();
  const got = req.get('X-API-Key') || req.query.api_key;
  if (got && got === expected) return next();
  res.status(401).json({ error: 'Unauthorized' });
}
