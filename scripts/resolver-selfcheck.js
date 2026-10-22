#!/usr/bin/env node
const assert = require('assert');
const { extractMediaUrls, pickBestUrl } = require('../lib/http');
const { filterMediaUrls, isLikelyAdMediaUrl } = require('../lib/mediaUrlFilter');
const { VIDSRC_PROVIDERS } = require('../lib/vidsrcProviders');

const sampleHtml = `
  <script>file: "https://cdn.example.com/movie.mp4?token=abc"</script>
  <source src="https://cdn.example.com/alt.m3u8">
  <script>file: "https://adserver.example.com/preroll.mp4"</script>
`;

const urls = extractMediaUrls(sampleHtml);
assert(urls.some((u) => u.includes('.mp4')), 'extractMediaUrls should find mp4');
assert(!urls.some((u) => u.includes('adserver')), 'extractMediaUrls should drop ad mp4');
const picked = pickBestUrl(urls);
assert(picked && !picked.isHls, 'pickBestUrl should prefer mp4');
assert(isLikelyAdMediaUrl('https://x.doubleclick.net/v.mp4'), 'ad host detected');
assert(filterMediaUrls(['https://ok.com/a.mp4', 'https://x.doubleclick.net/b.mp4']).length === 1);

const provider = VIDSRC_PROVIDERS[0];
assert(provider.id === 'vidsrc_buzz', 'vidsrc_buzz provider first');
assert(
  provider.buildUrl({ type: 'movie', tmdbId: '123' }) === 'https://vidsrc.buzz/embed/movie/123',
  'movie embed url'
);
assert(
  provider.buildUrl({ type: 'tv', tmdbId: '456', season: 1, episode: 2 }) ===
    'https://vidsrc.buzz/embed/tv/456/1/2',
  'tv embed url'
);

console.log('resolver-selfcheck: ok');
