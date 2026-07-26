#!/usr/bin/env node
const assert = require('assert');
const { extractMediaUrls, pickBestUrl } = require('../lib/http');
const { EMBED_PROVIDERS } = require('../lib/resolvers/vidsrc');

const sampleHtml = `
  <script>file: "https://cdn.example.com/movie.mp4?token=abc"</script>
  <source src="https://cdn.example.com/alt.m3u8">
`;

const urls = extractMediaUrls(sampleHtml);
assert(urls.some((u) => u.includes('.mp4')), 'extractMediaUrls should find mp4');
const picked = pickBestUrl(urls);
assert(picked && !picked.isHls, 'pickBestUrl should prefer mp4');

assert(EMBED_PROVIDERS.length >= 1, 'at least one embed provider');
assert(EMBED_PROVIDERS[0].id === 'vidsrc_cc', 'vidsrc_cc is primary provider');

console.log('resolver-selfcheck: ok');
