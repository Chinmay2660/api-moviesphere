const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map();

function cacheKey(apiPath, query) {
  const q = query && Object.keys(query).length
    ? "?" + new URLSearchParams(query).toString()
    : "";
  return apiPath + q;
}

function get(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function set(key, data) {
  cache.set(key, { data, at: Date.now() });
}

function getCached(apiPath, query) {
  return get(cacheKey(apiPath, query));
}

function setCached(apiPath, query, data) {
  set(cacheKey(apiPath, query), data);
}

module.exports = { getCached, setCached };
