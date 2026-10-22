const { resolveVidsrc } = require('./vidsrc');

const RESOLVE_TIMEOUT_MS = 12000;
const RESOLVE_CACHE_TTL_MS = 30 * 60 * 1000;
const NEGATIVE_CACHE_TTL_MS = 10 * 60 * 1000;
// ponytail: in-memory only; lost on cold start — upgrade to Redis/KV if multi-instance
const resolveCache = new Map();
const negativeCache = new Map();

const withTimeout = (promise, ms, message) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);

const resolveCacheKey = ({ type, tmdbId, season, episode }) =>
  season != null ? `${type}:${tmdbId}:${season}:${episode}` : `${type}:${tmdbId}`;

const getCachedResolve = (context) => {
  const key = resolveCacheKey(context);
  const entry = resolveCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > RESOLVE_CACHE_TTL_MS) {
    resolveCache.delete(key);
    return null;
  }
  return entry.data;
};

const setCachedResolve = (context, data) => {
  negativeCache.delete(resolveCacheKey(context));
  resolveCache.set(resolveCacheKey(context), { data, at: Date.now() });
};

const getNegativeResolve = (context) => {
  const key = resolveCacheKey(context);
  const entry = negativeCache.get(key);
  if (!entry) return false;
  if (Date.now() - entry.at > NEGATIVE_CACHE_TTL_MS) {
    negativeCache.delete(key);
    return false;
  }
  return true;
};

const setNegativeResolve = (context) => {
  negativeCache.set(resolveCacheKey(context), { at: Date.now() });
};

const resolveDownloadStream = async ({ type, tmdbId, season, episode, title }) => {
  const context = {
    type,
    tmdbId: String(tmdbId),
    season: season != null ? Number(season) : undefined,
    episode: episode != null ? Number(episode) : undefined,
    title: title ? String(title) : undefined,
  };

  const cached = getCachedResolve(context);
  if (cached) return cached;

  if (getNegativeResolve(context)) {
    throw new Error('No stream URL found from VidSrc mirrors');
  }

  let result;
  try {
    result = await withTimeout(
      resolveVidsrc(context),
      RESOLVE_TIMEOUT_MS,
      'Stream resolver timed out'
    );
  } catch (error) {
    setNegativeResolve(context);
    throw error;
  }

  if (!result?.url) {
    setNegativeResolve(context);
    throw new Error('No stream URL found from VidSrc mirrors');
  }

  setCachedResolve(context, result);
  return result;
};

module.exports = { resolveDownloadStream };
