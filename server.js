require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();
const cors = require('cors');
const PORT = 8000;

app.use(cors({
    origin: ['https://moviesphere2660.vercel.app/', 'http://localhost:5173'],
}));

app.get('/api/*', async (req, res) => {
    try {

        const url = `${process.env.BASE_URL}${req.path.replace('/api', '')}`;
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
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

app.listen(PORT, () => console.log(`Proxy server running on http://localhost:${PORT}`));

