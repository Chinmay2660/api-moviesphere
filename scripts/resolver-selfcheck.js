#!/usr/bin/env node
const assert = require('assert');
const { extractMediaUrls, pickBestUrl } = require('../lib/http');
const { VIDSRC_PROVIDERS } = require('../lib/resolvers/vidsrc');

const sampleHtml = `
  <script>file: "https://cdn.example.com/movie.mp4?token=abc"</script>
  <source src="https://cdn.example.com/alt.m3u8">
`;

const urls = extractMediaUrls(sampleHtml);
assert(urls.some((u) => u.includes('.mp4')), 'extractMediaUrls should find mp4');
const picked = pickBestUrl(urls);
assert(picked && !picked.isHls, 'pickBestUrl should prefer mp4');

const provider = VIDSRC_PROVIDERS[0];
assert(provider.id === 'vidsrc_sbs', 'vidsrc_sbs provider configured');
assert(
  provider.buildUrl({ type: 'movie', tmdbId: '123' }) === 'https://vidsrc.sbs/embed/movie/123',
  'movie embed url'
);
assert(
  provider.buildUrl({ type: 'tv', tmdbId: '456', season: 1, episode: 2 }) ===
    'https://vidsrc.sbs/embed/tv/456/1/2',
  'tv embed url'
);

console.log('resolver-selfcheck: ok');
