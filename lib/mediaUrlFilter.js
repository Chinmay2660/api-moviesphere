/** Host/path patterns common in ad or tracking creatives — not main feature streams. */
const AD_MEDIA_PATTERNS = [
  /doubleclick\.net/i,
  /googlesyndication\.com/i,
  /googleadservices\.com/i,
  /adservice\.google/i,
  /adnxs\.com/i,
  /taboola\.com/i,
  /outbrain\.com/i,
  /popads\.net/i,
  /adserver/i,
  /\/vast\//i,
  /\/vast\./i,
  /\/ad[_-]?tag/i,
  /\/preroll/i,
  /\/midroll/i,
  /creative\.[a-z0-9-]+\/ad/i,
];

const isLikelyAdMediaUrl = (url) => {
  if (!url || typeof url !== 'string') return true;
  return AD_MEDIA_PATTERNS.some((re) => re.test(url));
};

const filterMediaUrls = (urls) => urls.filter((u) => !isLikelyAdMediaUrl(u));

module.exports = { isLikelyAdMediaUrl, filterMediaUrls, AD_MEDIA_PATTERNS };
