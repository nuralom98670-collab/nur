export function parseLimit(req, def = 20, max = 100) {
  const n = Number(req.query.limit || def);
  return Math.min(Math.max(n, 1), max);
}
