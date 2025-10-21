export function ensureArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (val.data && Array.isArray(val.data)) return val.data;
  if (val.results && Array.isArray(val.results)) return val.results;
  return [];
}