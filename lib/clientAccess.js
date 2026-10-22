const DEFAULT_ALLOWED_ORIGINS = [
  'https://moviesphere2660.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

function parseAllowedOrigins() {
  const fromEnv = process.env.ALLOWED_ORIGINS;
  if (!fromEnv) return DEFAULT_ALLOWED_ORIGINS;
  return fromEnv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function originMatchesAllowed(url, allowedOrigins) {
  if (!url) return false;
  try {
    const origin = new URL(url).origin;
    return allowedOrigins.some((allowed) => {
      try {
        return new URL(allowed).origin === origin;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

function isAllowedBrowserClient(req) {
  const allowed = parseAllowedOrigins();
  const origin = req.get('origin');
  const referer = req.get('referer');
  return originMatchesAllowed(origin, allowed) || originMatchesAllowed(referer, allowed);
}

function requireBrowserClient(req, res, next) {
  if (process.env.SKIP_CLIENT_ACCESS_CHECK === '1') {
    return next();
  }
  if (isAllowedBrowserClient(req)) {
    return next();
  }
  return res.status(403).json({ error: 'Forbidden' });
}

if (require.main === module) {
  const assert = require('assert');
  const req = {
    get(name) {
      if (name === 'origin') return 'https://moviesphere2660.vercel.app';
      return undefined;
    },
  };
  assert.strictEqual(isAllowedBrowserClient(req), true);
  assert.strictEqual(
    isAllowedBrowserClient({ get: () => undefined }),
    false
  );
  console.log('clientAccess self-check ok');
}

module.exports = { requireBrowserClient, isAllowedBrowserClient, parseAllowedOrigins };
