const axios = require('axios');
const { BROWSER_HEADERS, httpGet } = require('./http');
const { toUserMessage } = require('./userFriendlyError');

const resolvePlaylistUrl = (baseUrl, line) => {
  if (line.startsWith('http')) return line.trim();
  const base = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
  return new URL(line.trim(), base).toString();
};

const fetchMediaPlaylist = async (playlistUrl, depth = 0) => {
  if (depth > 3) throw new Error('HLS playlist nesting too deep');

  const response = await httpGet(playlistUrl, { responseType: 'text' });
  const text = response.data;
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  const variantLines = lines.filter((l) => l.startsWith('#EXT-X-STREAM-INF'));
  if (variantLines.length > 0) {
    const variantIndex = lines.findIndex((l) => l === variantLines[0]);
    const nextLine = lines[variantIndex + 1];
    if (nextLine && !nextLine.startsWith('#')) {
      const childUrl = resolvePlaylistUrl(playlistUrl, nextLine);
      return fetchMediaPlaylist(childUrl, depth + 1);
    }
  }

  const segments = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.startsWith('#')) continue;
    segments.push(resolvePlaylistUrl(playlistUrl, line));
  }

  if (segments.length === 0) throw new Error('HLS playlist has no segments');
  return segments;
};

const pipeRemoteStream = async (sourceUrl, res, { filename, contentType, onProgress }) => {
  const response = await axios.get(sourceUrl, {
    headers: BROWSER_HEADERS,
    responseType: 'stream',
    timeout: 0,
    maxRedirects: 8,
  });

  const totalBytes = Number(response.headers['content-length']) || 0;
  res.setHeader('Content-Type', contentType || response.headers['content-type'] || 'video/mp4');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  if (totalBytes > 0) res.setHeader('Content-Length', String(totalBytes));

  let bytesSent = 0;
  response.data.on('data', (chunk) => {
    bytesSent += chunk.length;
    if (onProgress) onProgress(bytesSent, totalBytes);
  });

  response.data.on('error', (err) => {
    if (!res.headersSent) {
      res.status(500).json({ error: toUserMessage(err, 'stream') });
      return;
    }
    res.destroy(err);
  });

  response.data.pipe(res);
};

const pipeHlsAsSingleFile = async (playlistUrl, res, { filename, onProgress }) => {
  const segments = await fetchMediaPlaylist(playlistUrl);
  res.setHeader('Content-Type', 'video/mp2t');
  res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/\.mp4$/i, '.ts')}"`);

  let bytesSent = 0;
  for (const segmentUrl of segments) {
    const segment = await axios.get(segmentUrl, {
      headers: BROWSER_HEADERS,
      responseType: 'stream',
      timeout: 120000,
    });

    await new Promise((resolve, reject) => {
      segment.data.on('data', (chunk) => {
        bytesSent += chunk.length;
        if (onProgress) onProgress(bytesSent, 0);
      });
      segment.data.on('error', reject);
      segment.data.on('end', resolve);
      segment.data.pipe(res, { end: false });
    });
  }
  res.end();
};

const proxyStream = async (resolved, res, { filename, onProgress }) => {
  if (resolved.isHls) {
    await pipeHlsAsSingleFile(resolved.url, res, { filename, onProgress });
    return;
  }
  await pipeRemoteStream(resolved.url, res, {
    filename,
    contentType: resolved.contentType || 'video/mp4',
    onProgress,
  });
};

const proxyStreamInline = async (resolved, req, res) => {
  if (resolved.isHls) {
    res.status(501).json({ error: 'HLS inline playback is not supported yet' });
    return;
  }

  const headers = { ...BROWSER_HEADERS };
  if (req.headers.range) headers.Range = req.headers.range;

  const response = await axios.get(resolved.url, {
    headers,
    responseType: 'stream',
    timeout: 0,
    maxRedirects: 8,
    validateStatus: (status) => status === 200 || status === 206,
  });

  const contentType = resolved.contentType || response.headers['content-type'] || 'video/mp4';
  res.setHeader('Content-Type', contentType);
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Disposition', 'inline');

  if (response.headers['content-range']) {
    res.setHeader('Content-Range', response.headers['content-range']);
    res.status(206);
  }
  if (response.headers['content-length']) {
    res.setHeader('Content-Length', response.headers['content-length']);
  }

  response.data.on('error', (err) => {
    if (!res.headersSent) {
      res.status(500).json({ error: toUserMessage(err, 'stream') });
      return;
    }
    res.destroy(err);
  });

  response.data.pipe(res);
};

module.exports = { proxyStream, proxyStreamInline, fetchMediaPlaylist };
