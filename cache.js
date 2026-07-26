const DEFAULT_TTL_MS = 5 * 60 * 1000;
const cache = new Map();

function normalizePath(apiPath) {
  const raw = String(apiPath || '').split('?')[0];
  return raw.startsWith('/') ? raw : `/${raw}`;
}

function getCacheTtlMs(apiPath) {
  const path = normalizePath(apiPath);

  if (path === '/configuration') return 24 * 60 * 60 * 1000;
  if (/^\/genre\/[^/]+\/list$/.test(path)) return 24 * 60 * 60 * 1000;
  if (/^\/(movie|tv)\/\d+$/.test(path)) return 60 * 60 * 1000;
  if (/\/(credits|videos|images)$/.test(path)) return 60 * 60 * 1000;
  if (/\/season\/\d+$/.test(path)) return 60 * 60 * 1000;
  if (/\/(similar|recommendations)$/.test(path)) return 30 * 60 * 1000;
  if (path.startsWith('/search')) return 2 * 60 * 1000;
  if (path.startsWith('/trending')) return 15 * 60 * 1000;
  if (path.startsWith('/discover')) return 10 * 60 * 1000;
  if (/^\/(movie|tv)\/(popular|upcoming|now_playing|top_rated|airing_today|on_the_air)$/.test(path)) {
    return 15 * 60 * 1000;
  }

  return DEFAULT_TTL_MS;
}

function getCacheControl(apiPath) {
  const maxAge = Math.floor(getCacheTtlMs(apiPath) / 1000);
  const staleWhileRevalidate = Math.max(60, Math.floor(maxAge / 2));
  return `public, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`;
}

function cacheKey(apiPath, query) {
  const q = query && Object.keys(query).length
    ? '?' + new URLSearchParams(query).toString()
    : '';
  return apiPath + q;
}

function get(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > entry.ttlMs) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function set(key, data, ttlMs = DEFAULT_TTL_MS) {
  cache.set(key, { data, at: Date.now(), ttlMs });
}

function getCached(apiPath, query) {
  return get(cacheKey(apiPath, query));
}

function setCached(apiPath, query, data) {
  set(cacheKey(apiPath, query), data, getCacheTtlMs(apiPath));
}

function clearCache() {
  cache.clear();
}

if (require.main === module) {
  const assert = require('assert');
  assert.strictEqual(getCacheTtlMs('/configuration'), 24 * 60 * 60 * 1000);
  assert.strictEqual(getCacheTtlMs('/genre/movie/list'), 24 * 60 * 60 * 1000);
  assert.strictEqual(getCacheTtlMs('/movie/550'), 60 * 60 * 1000);
  assert.strictEqual(getCacheTtlMs('/search/multi'), 2 * 60 * 1000);
  assert.ok(getCacheControl('/trending/all/week').includes('max-age=900'));
  console.log('cache self-check ok');
}

module.exports = {
  getCached,
  setCached,
  getCacheTtlMs,
  getCacheControl,
  clearCache,
};
