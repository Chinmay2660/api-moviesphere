/** Embed mirrors tried in order for download resolution (HTML scrape). Often empty for SPA players. */
const VIDSRC_PROVIDERS = [
  {
    id: 'vidsrc_buzz',
    label: 'vidsrc.buzz',
    headers: { Referer: 'https://www.2embed.cc/' },
    buildUrl: ({ type, tmdbId, season, episode }) =>
      type === 'movie'
        ? `https://vidsrc.buzz/embed/movie/${tmdbId}`
        : `https://vidsrc.buzz/embed/tv/${tmdbId}/${season}/${episode}`,
  },
  {
    id: 'vidsrc_io',
    label: 'vidsrc.io',
    buildUrl: ({ type, tmdbId, season, episode }) =>
      type === 'movie'
        ? `https://vidsrc.io/embed/movie/${tmdbId}`
        : `https://vidsrc.io/embed/tv/${tmdbId}/${season}/${episode}`,
  },
  {
    id: 'vidsrc_party',
    label: 'vidsrc.party',
    buildUrl: ({ type, tmdbId, season, episode }) =>
      type === 'movie'
        ? `https://www.vidsrc.party/embed/movie/${tmdbId}`
        : `https://www.vidsrc.party/embed/tv/${tmdbId}/${season}/${episode}`,
  },
  {
    id: 'vidsrc_to',
    label: 'vidsrc.to',
    buildUrl: ({ type, tmdbId, season, episode }) =>
      type === 'movie'
        ? `https://vidsrc.to/embed/movie/${tmdbId}`
        : `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`,
  },
  {
    id: 'vidsrc_su',
    label: 'vidsrc.su',
    buildUrl: ({ type, tmdbId, season, episode }) =>
      type === 'movie'
        ? `https://vidsrc.su/embed/movie/${tmdbId}`
        : `https://vidsrc.su/embed/tv/${tmdbId}/${season}/${episode}`,
  },
];

module.exports = { VIDSRC_PROVIDERS };
