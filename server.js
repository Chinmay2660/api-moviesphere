require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { getCached, setCached, getCacheControl } = require('./cache');
const { rateLimit, downloadRateLimit } = require('./rateLimiter');
const { requireBrowserClient } = require('./lib/clientAccess');
const { sanitizeTmdbQuery } = require('./lib/sanitizeTmdbQuery');
const downloadRouter = require('./routes/download');
const streamRouter = require('./routes/stream');

const app = express();
const PORT = 8000;

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

const requiredEnv = ['BASE_URL', 'API_KEY'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
    process.stderr.write(
        `Missing required env: ${missingEnv.join(', ')}. Copy .env.example to .env and set your TMDB credentials.\n`
    );
}

const ALLOWED_PATH_PREFIXES = ['/movie', '/tv', '/search', '/trending', '/discover', '/genre', '/configuration'];

const corsOrigins = require('./lib/clientAccess').parseAllowedOrigins();

app.use(cors({
    origin: corsOrigins,
}));

app.get('/', (req, res) => {
    res.status(200).json({
        service: 'api-moviesphere',
        status: 'ok',
        configured: Boolean(process.env.BASE_URL && process.env.API_KEY),
        endpoints: '/api/{movie|tv|search|trending|discover|genre|configuration}/…',
    });
});

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        configured: Boolean(process.env.BASE_URL && process.env.API_KEY),
    });
});

app.use('/api', requireBrowserClient);
app.use('/api', rateLimit);
app.use('/api/download', downloadRateLimit);
app.use('/api/download', downloadRouter);
app.use('/api/stream', downloadRateLimit);
app.use('/api/stream', streamRouter);

// Simple retry helper for transient network errors like ECONNRESET
async function fetchWithRetry(url, options, retries = 3, delayMs = 300) {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await axios.get(url, options);
        } catch (error) {
            lastError = error;
            const code = error.code;
            const isTransient =
                code === 'ECONNRESET' ||
                code === 'ETIMEDOUT' ||
                code === 'EAI_AGAIN';

            if (!isTransient || attempt === retries) {
                throw error;
            }

            const backoff = delayMs * (attempt + 1);
            await new Promise((resolve) => setTimeout(resolve, backoff));
        }
    }
    throw lastError;
}

function isPathAllowed(apiPath) {
    const normalized = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
    return ALLOWED_PATH_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(prefix + '/'));
}

// Express 5 wildcard returns an array, need to join with /
app.get('/api/{*path}', async (req, res) => {
    const pathSegments = req.params.path;
    const apiPath = '/' + (Array.isArray(pathSegments) ? pathSegments.join('/') : pathSegments || '');

    if (!isPathAllowed(apiPath)) {
        return res.status(400).json({ error: 'Path not allowed' });
    }

    const cached = getCached(apiPath, req.query);
    if (cached !== null) {
        res.set('Cache-Control', getCacheControl(apiPath));
        res.set('X-Cache', 'HIT');
        return res.json(cached);
    }

    if (!process.env.BASE_URL || !process.env.API_KEY) {
        return res.status(503).json({
            error: 'Server not configured',
            message: 'Missing BASE_URL or API_KEY. Add them to api-moviesphere/.env (see .env.example).',
        });
    }

    const url = `${process.env.BASE_URL}${apiPath}`;

    try {
        const response = await fetchWithRetry(
            url,
            {
                headers: {
                    Authorization: `Bearer ${process.env.ACCESS_TOKEN}`
                },
                params: {
                    api_key: process.env.API_KEY,
                    region: 'IN',
                    language: 'en-IN',
                    ...sanitizeTmdbQuery(req.query),
                },
                timeout: 10000
            },
            3,
            300
        );

        setCached(apiPath, req.query, response.data);
        res.set('Cache-Control', getCacheControl(apiPath));
        res.set('X-Cache', 'MISS');
        res.json(response.data);
    } catch (error) {
        const status = error.response?.status || 500;
        if (status >= 500) {
            console.error('TMDB proxy error:', error.message);
        }

        res.status(status).json({
            error: 'Failed to fetch data',
        });
    }
});

app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: 'This host only serves /api/…. Use the MovieSphere frontend or call /api with an allowed Origin.',
    });
});

if (require.main === module) {
    app.listen(PORT);
}

module.exports = app;
