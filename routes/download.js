const express = require('express');
const { resolveDownloadStream } = require('../lib/resolvers');
const { proxyStream } = require('../lib/streamProxy');
const { toUserMessage } = require('../lib/userFriendlyError');

const router = express.Router();

const isNumericId = (value) => /^\d{1,10}$/.test(String(value));

const sanitizeFilename = (name) =>
  (name || 'video').replace(/[^\w\s.-]/g, '').trim().slice(0, 80) || 'video';

const MAX_TITLE_QUERY_LEN = 120;

const handleDownloadMeta = async (res, { type, tmdbId, season, episode, title }) => {
  try {
    const resolved = await resolveDownloadStream({ type, tmdbId, season, episode, title });
    res.json({
      available: true,
      source: resolved.source,
      isHls: Boolean(resolved.isHls),
    });
  } catch {
    res.json({ available: false });
  }
};

const handleDownload = async (req, res, { type, tmdbId, season, episode, filename }) => {
  const safeName = sanitizeFilename(filename);

  try {
    const resolved = await resolveDownloadStream({ type, tmdbId, season, episode, title: filename });
    res.setHeader('X-Download-Source', resolved.source);
    if (resolved.isHls) {
      res.setHeader('X-Download-Format', 'hls');
    }

    await proxyStream(resolved, res, {
      filename: `${safeName}.mp4`,
    });
  } catch (error) {
    if (!res.headersSent) {
      res.status(404).json({
        error: toUserMessage(error, 'download'),
      });
    }
  }
};

router.get('/movie/:id', (req, res) => {
  if (!isNumericId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid movie id' });
  }
  const title = String(req.query.title || `movie-${req.params.id}`).slice(0, MAX_TITLE_QUERY_LEN);
  if (req.query.meta === '1') {
    return handleDownloadMeta(res, {
      type: 'movie',
      tmdbId: req.params.id,
      title,
    });
  }
  handleDownload(req, res, {
    type: 'movie',
    tmdbId: req.params.id,
    filename: title,
  });
});

router.get('/tv/:tvId/:season/:episode', (req, res) => {
  const { tvId, season, episode } = req.params;
  if (!isNumericId(tvId) || !isNumericId(season) || !isNumericId(episode)) {
    return res.status(400).json({ error: 'Invalid tv id, season, or episode' });
  }
  const title = String(
    req.query.title ||
      `tv-${req.params.tvId}-s${req.params.season}-e${req.params.episode}`
  ).slice(0, MAX_TITLE_QUERY_LEN);
  if (req.query.meta === '1') {
    return handleDownloadMeta(res, {
      type: 'tv',
      tmdbId: req.params.tvId,
      season: req.params.season,
      episode: req.params.episode,
      title,
    });
  }
  handleDownload(req, res, {
    type: 'tv',
    tmdbId: req.params.tvId,
    season: req.params.season,
    episode: req.params.episode,
    filename: title,
  });
});

module.exports = router;
