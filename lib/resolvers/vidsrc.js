const { httpGet, extractMediaUrls, pickBestUrl } = require('../http');
const { VIDSRC_PROVIDERS } = require('../vidsrcProviders');
const { isLikelyAdMediaUrl } = require('../mediaUrlFilter');

const IFRAME_SRC_RE = /<iframe[^>]+src=["']([^"']+)["']/gi;

const scrapeNestedIframes = async (html, depth = 0) => {
  if (!html || depth > 3) return [];

  const direct = extractMediaUrls(html);
  if (direct.length > 0) return direct;

  const iframeSrcs = [];
  let match;
  while ((match = IFRAME_SRC_RE.exec(html)) !== null) {
    const src = match[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/');
    if (src.startsWith('http') && !isLikelyAdMediaUrl(src)) iframeSrcs.push(src);
  }

  for (const src of iframeSrcs) {
    try {
      const response = await httpGet(src, { responseType: 'text' });
      if (response.status >= 400) continue;
      const nested = await scrapeNestedIframes(response.data, depth + 1);
      if (nested.length > 0) return nested;
    } catch {
      // try next iframe
    }
  }

  return [];
};

const resolveFromProvider = async (provider, context) => {
  const embedUrl = provider.buildUrl(context);
  const response = await httpGet(embedUrl, {
    responseType: 'text',
    ...(provider.headers ? { headers: provider.headers } : {}),
  });
  if (response.status >= 400) return null;

  const mediaUrls = await scrapeNestedIframes(response.data);
  const picked = pickBestUrl(mediaUrls);
  if (!picked) return null;

  return {
    ...picked,
    source: provider.id,
    label: provider.label,
    contentType: picked.isHls ? 'application/vnd.apple.mpegurl' : 'video/mp4',
  };
};

const resolveVidsrc = async (context) => {
  const attempts = await Promise.all(
    VIDSRC_PROVIDERS.map(async (provider) => {
      try {
        return await resolveFromProvider(provider, context);
      } catch {
        return null;
      }
    })
  );
  return attempts.find(Boolean) ?? null;
};

module.exports = { resolveVidsrc, VIDSRC_PROVIDERS };
