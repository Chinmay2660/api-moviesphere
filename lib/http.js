const axios = require('axios');
const { filterMediaUrls } = require('./mediaUrlFilter');

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

const httpGet = async (url, options = {}) => {
  const { headers: extraHeaders, ...rest } = options;
  return axios.get(url, {
    headers: { ...BROWSER_HEADERS, ...extraHeaders },
    timeout: 10000,
    maxRedirects: 8,
    validateStatus: (status) => status < 500,
    ...rest,
  });
};

const extractMediaUrls = (text) => {
  if (!text) return [];
  const found = new Set();
  const patterns = [
    /https?:\/\/[^\s"'<>\\]+\.mp4[^\s"'<>\\]*/gi,
    /https?:\/\/[^\s"'<>\\]+\.m3u8[^\s"'<>\\]*/gi,
    /"(https?:\/\/[^"]+\.(?:mp4|m3u8)[^"]*)"/gi,
    /'(https?:\/\/[^']+\.(?:mp4|m3u8)[^']*)'/gi,
    /file:\s*["']([^"']+)["']/gi,
    /src:\s*["']([^"']+\.(?:mp4|m3u8)[^"']*)["']/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const url = (match[1] ?? match[0]).replace(/\\u002F/g, '/').replace(/\\\//g, '/');
      if (url.startsWith('http')) found.add(url);
    }
  }
  return filterMediaUrls([...found]);
};

const pickBestUrl = (urls) => {
  const clean = filterMediaUrls(urls);
  const mp4 = clean.find((u) => /\.mp4/i.test(u));
  if (mp4) return { url: mp4, isHls: false };
  const m3u8 = clean.find((u) => /\.m3u8/i.test(u));
  if (m3u8) return { url: m3u8, isHls: true };
  return null;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = { BROWSER_HEADERS, httpGet, extractMediaUrls, pickBestUrl, sleep };
