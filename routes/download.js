const express = require('express');
const { resolveDownloadStream } = require('../lib/resolvers');
const { proxyStream } = require('../lib/streamProxy');
const { toUserMessage } = require('../lib/userFriendlyError');

const router = express.Router();

const isNumericId = (value) => /^\d{1,10}$/.test(String(value));

const sanitizeFilename = (name) =>
  (name || 'video').replace(/[^\w\s.-]/g, '').trim().slice(0, 80) || 'video';

const handleDownload = async (req, res, { type, tmdbId, season, episode, filename }) => {
  const safeName = sanitizeFilename(filename);

  try {
    const resolved = await resolveDownloadStream({ type, tmdbId, season, episode });
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
  const title = req.query.title || `movie-${req.params.id}`;
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
  const title =
    req.query.title ||
    `tv-${req.params.tvId}-s${req.params.season}-e${req.params.episode}`;
  handleDownload(req, res, {
    type: 'tv',
    tmdbId: req.params.tvId,
    season: req.params.season,
    episode: req.params.episode,
    filename: title,
  });
});

module.exports = router;
