const { resolveVidsrc } = require('./vidsrc');

const RESOLVE_TIMEOUT_MS = 20000;
const RESOLVE_CACHE_TTL_MS = 30 * 60 * 1000;
// ponytail: in-memory only; lost on cold start — upgrade to Redis/KV if multi-instance
const resolveCache = new Map();

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
  resolveCache.set(resolveCacheKey(context), { data, at: Date.now() });
};

const resolveDownloadStream = async ({ type, tmdbId, season, episode }) => {
  const context = {
    type,
    tmdbId: String(tmdbId),
    season: season != null ? Number(season) : undefined,
    episode: episode != null ? Number(episode) : undefined,
  };

  const cached = getCachedResolve(context);
  if (cached) return cached;

  const result = await withTimeout(
    resolveVidsrc(context),
    RESOLVE_TIMEOUT_MS,
    'Stream resolver timed out — embed page may load the video via JavaScript'
  );

  if (!result?.url) {
    throw new Error(
      'No stream URL found from embed providers. Playback uses an iframe; the direct file URL is not exposed in page HTML.'
    );
  }

  setCachedResolve(context, result);
  return result;
};

module.exports = { resolveDownloadStream };
