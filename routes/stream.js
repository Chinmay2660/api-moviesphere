const express = require('express');
const { resolveDownloadStream } = require('../lib/resolvers');
const { proxyStreamInline } = require('../lib/streamProxy');
const { toUserMessage } = require('../lib/userFriendlyError');

const router = express.Router();

const isNumericId = (value) => /^\d{1,10}$/.test(String(value));

const handleStream = async (req, res, { type, tmdbId, season, episode }) => {
  try {
    const resolved = await resolveDownloadStream({ type, tmdbId, season, episode });
    res.setHeader('X-Stream-Source', resolved.source);
    if (resolved.isHls) {
      res.setHeader('X-Stream-Format', 'hls');
    }
    await proxyStreamInline(resolved, req, res);
  } catch (error) {
    if (!res.headersSent) {
      res.status(404).json({
        error: toUserMessage(error, 'stream'),
      });
    }
  }
};

router.get('/movie/:id', (req, res) => {
  if (!isNumericId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid movie id' });
  }
  handleStream(req, res, { type: 'movie', tmdbId: req.params.id });
});

router.get('/tv/:tvId/:season/:episode', (req, res) => {
  const { tvId, season, episode } = req.params;
  if (!isNumericId(tvId) || !isNumericId(season) || !isNumericId(episode)) {
    return res.status(400).json({ error: 'Invalid tv id, season, or episode' });
  }
  handleStream(req, res, {
    type: 'tv',
    tmdbId: tvId,
    season,
    episode,
  });
});

module.exports = router;
