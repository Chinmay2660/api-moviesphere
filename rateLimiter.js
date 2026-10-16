const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100;
const MAX_DOWNLOAD_REQUESTS_PER_WINDOW = 8;

function getClientIp(req) {
  // ponytail: use req.ip only (requires trust proxy); raw X-Forwarded-For is client-spoofable
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function createRateLimiter({ windowMs, maxRequests }) {
  const store = new Map();

  const pruneStale = (now) => {
    if (store.size < 5000) return;
    for (const [key, entry] of store) {
      if (now - entry.windowStart >= windowMs * 2) store.delete(key);
    }
  };

  return function rateLimit(req, res, next) {
    const ip = getClientIp(req);
    const now = Date.now();
    pruneStale(now);

    let entry = store.get(ip);

    if (!entry || now - entry.windowStart >= windowMs) {
      entry = { count: 0, windowStart: now };
      store.set(ip, entry);
    }

    entry.count += 1;

    if (entry.count > maxRequests) {
      res.set('Retry-After', String(Math.ceil(windowMs / 1000)));
      return res.status(429).json({
        error: "We're getting a lot of requests. Please wait a moment and try again.",
      });
    }

    next();
  };
}

const rateLimit = createRateLimiter({
  windowMs: WINDOW_MS,
  maxRequests: MAX_REQUESTS_PER_WINDOW,
});

const downloadRateLimit = createRateLimiter({
  windowMs: WINDOW_MS,
  maxRequests: MAX_DOWNLOAD_REQUESTS_PER_WINDOW,
});

if (require.main === module) {
  const hits = [];
  const res = {
    set() {},
    status(code) {
      hits.push(code);
      return { json() {} };
    },
  };
  const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 2 });
  const req = { ip: '127.0.0.1', socket: {} };
  limiter(req, res, () => hits.push('ok'));
  limiter(req, res, () => hits.push('ok'));
  limiter(req, res, () => hits.push('ok'));
  if (hits.filter((h) => h === 'ok').length !== 2 || hits.includes(429) !== true) {
    throw new Error('rateLimiter self-check failed');
  }
}

module.exports = {
  rateLimit,
  downloadRateLimit,
  createRateLimiter,
  WINDOW_MS,
  MAX_REQUESTS_PER_WINDOW,
  MAX_DOWNLOAD_REQUESTS_PER_WINDOW,
};
