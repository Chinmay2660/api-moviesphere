require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();
const cors = require('cors');
const PORT = 8000;

app.use(cors({
    origin: ['https://moviesphere2660.vercel.app', 'http://localhost:5173'],
}));

// Express 5 wildcard returns an array, need to join with /
app.get('/api/{*path}', async (req, res) => {
    try {
        // req.params.path is an array in Express 5, join with /
        const pathSegments = req.params.path;
        const apiPath = '/' + (Array.isArray(pathSegments) ? pathSegments.join('/') : pathSegments || '');
        const url = `${process.env.BASE_URL}${apiPath}`;
        
        console.log('Proxying request to:', url);
        
        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${process.env.ACCESS_TOKEN}`
            },
            params: {
                api_key: process.env.API_KEY,
                ...req.query
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error('API Error:', error.response?.status, error.message);
        res.status(error.response?.status || 500).json({ 
            error: 'Failed to fetch data',
            message: error.message
        });
    }
});

app.listen(PORT, () => console.log(`Proxy server running on http://localhost:${PORT}`));

module.exports = app;
