const { httpGet, extractMediaUrls, pickBestUrl } = require('../http');

const VIDSRC_PROVIDERS = [
  {
    id: 'vidsrc_sbs',
    buildUrl: ({ type, tmdbId, season, episode }) =>
      type === 'movie'
        ? `https://vidsrc.sbs/embed/movie/${tmdbId}`
        : `https://vidsrc.sbs/embed/tv/${tmdbId}/${season}/${episode}`,
  },
];

const scrapeNestedIframes = async (html, depth = 0) => {
  if (depth > 2 || !html) return [];
  const iframeMatches = [...html.matchAll(/<iframe[^>]+src=["']([^"']+)["']/gi)];
  const urls = [];
  for (const match of iframeMatches) {
    let src = match[1];
    if (src.startsWith('//')) src = `https:${src}`;
    if (!src.startsWith('http')) continue;
    try {
      const nested = await httpGet(src, { responseType: 'text' });
      urls.push(...extractMediaUrls(nested.data));
      urls.push(...(await scrapeNestedIframes(nested.data, depth + 1)));
    } catch {
      // ponytail: skip unreachable nested iframes
    }
  }
  return urls;
};

const resolveFromProvider = async (provider, context) => {
  const embedUrl = provider.buildUrl(context);
  const response = await httpGet(embedUrl, { responseType: 'text' });
  if (response.status >= 400) return null;

  const urls = [
    ...extractMediaUrls(response.data),
    ...(await scrapeNestedIframes(response.data)),
  ];
  const picked = pickBestUrl(urls);
  if (!picked) return null;

  return {
    ...picked,
    source: provider.id,
    label: provider.id.replace(/_/g, '.'),
    contentType: picked.isHls ? 'application/vnd.apple.mpegurl' : 'video/mp4',
  };
};

const resolveVidsrc = async (context) => {
  for (const provider of VIDSRC_PROVIDERS) {
    try {
      const result = await resolveFromProvider(provider, context);
      if (result) return result;
    } catch {
      // try next provider
    }
  }
  return null;
};

module.exports = { resolveVidsrc, VIDSRC_PROVIDERS };
