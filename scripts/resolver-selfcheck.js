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

assert(VIDSRC_PROVIDERS.length === 1, 'only vidsrc.sbs provider');
assert(VIDSRC_PROVIDERS[0].id === 'vidsrc_sbs', 'vidsrc_sbs is the provider');

console.log('resolver-selfcheck: ok');
