require('dotenv').config(); 

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

app.use('/api', createProxyMiddleware({
    target: 'https://api.themoviedb.org/3',
    changeOrigin: true,
    pathRewrite: {
        '^/api': '', // Remove /api from the request URL
    },
    onProxyReq: (proxyReq, req, res) => {
        proxyReq.setHeader('Authorization', `Bearer ${process.env.ACCESS_TOKEN}`);
    },
}));

app.listen(3000, () => {
    console.log(`Proxy server is running on port ${3000}`);
});
