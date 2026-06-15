const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const page = req.query.page || 1;
        const targetUrl = `https://web1.mgkomik.cc/?page=${page}`;

        // Langsung hit target (nggak perlu corsproxy di backend)
        const { data } = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://web1.mgkomik.cc/',
            },
            timeout: 15000,
            maxRedirects: 5
        });

        const $ = cheerio.load(data);

        // Cek Cloudflare block
        const pageTitle = $('title').text().toLowerCase();
        if (pageTitle.includes('just a moment') || pageTitle.includes('cloudflare') || pageTitle.includes('ddos')) {
            return res.status(503).json({
                success: false,
                message: "Blocked by Cloudflare bot protection",
                html_title: pageTitle
            });
        }

        const latestUpdate = [];
        const trendingList = [];

        // 1. Scrape Latest Update & Project
        $('.project-card, .manga-card').each((index, element) => {
            const card = $(element);
            const isProject = card.hasClass('project-card');

            const slug = card.attr('data-slug') || '';
            const title = card.find(isProject ? '.project-title' : '.manga-title').text().trim();
            const link = card.find(isProject ? '.project-title-link' : '.manga-title-link').attr('href');
            const coverImage = card.find(isProject ? '.project-cover' : '.manga-cover').attr('src');
            const status = card.find('.manga-status-badge').text().trim();
            const type = card.find('.flag-badge').attr('title');

            const chapters = [];
            card.find(isProject ? '.project-chapter-row' : '.chapter-row').each((i, chapEl) => {
                const chapCapsule = $(chapEl).find(isProject ? '.project-chapter-capsule' : '.chapter-capsule');
                chapters.push({
                    chapter: chapCapsule.text().trim(),
                    link: chapCapsule.attr('href') ? `https://web1.mgkomik.cc${chapCapsule.attr('href')}` : null,
                    date: $(chapEl).find(isProject ? '.project-chapter-date' : '.chapter-date').text().trim()
                });
            });

            if (title) {
                latestUpdate.push({
                    title,
                    slug,
                    link: link ? (link.startsWith('http') ? link : `https://web1.mgkomik.cc${link}`) : null,
                    cover_image: coverImage || null,
                    status: status || null,
                    type: type || 'Unknown',
                    is_project: isProject,
                    latest_chapters: chapters
                });
            }
        });

        // 2. Scrape Trending Sidebar
        $('.trending-item').each((index, element) => {
            const item = $(element);
            const title = item.find('.trending-title').text().trim();
            const link = item.find('.trending-cover-link').attr('href');
            const coverImage = item.find('.trending-cover').attr('src');

            const chapters = [];
            item.find('.trending-chapter-item').each((i, chapEl) => {
                const chapLink = $(chapEl).find('.trending-chapter-link');
                chapters.push({
                    chapter: chapLink.text().trim(),
                    link: chapLink.attr('href') ? `https://web1.mgkomik.cc${chapLink.attr('href')}` : null,
                    date: $(chapEl).find('.trending-chapter-date').text().trim()
                });
            });

            if (title) {
                const slug = link ? link.replace(/\/$/, '').split('/').pop() : '';
                trendingList.push({
                    title,
                    slug,
                    link: link ? (link.startsWith('http') ? link : `https://web1.mgkomik.cc${link}`) : null,
                    cover_image: coverImage || null,
                    latest_chapters: chapters
                });
            }
        });

        res.status(200).json({
            success: true,
            message: "Berhasil scrape homepage MGKomik",
            page: parseInt(page),
            data: {
                total_update: latestUpdate.length,
                latest_update: latestUpdate,
                total_trending: trendingList.length,
                trending: trendingList
            }
        });

    } catch (error) {
        console.error('Scrape error:', error.message);
        res.status(500).json({
            success: false,
            message: "Gagal scrape data",
            error: error.message
        });
    }
});

module.exports = router;
