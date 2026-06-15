const express = require('express');
const app = express();
const homeRoute = require('./app/home/route');

app.get('/', (req, res) => {
    res.json({ message: "API Scraper MGKOMIK is Running!" });
});

app.use('/api/home', homeRoute);

// Error handler global
app.use((err, req, res, next) => {
    console.error('Global error:', err);
    res.status(500).json({ success: false, message: err.message });
});

const PORT = process.env.PORT || 7860;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server jalan di port ${PORT}`);
    console.log(`✅ Node version: ${process.version}`);
});