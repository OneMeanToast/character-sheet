const express = require('express');
const Parser = require('rss-parser');
const { db } = require('../database');

const router = express.Router();
const parser = new Parser({ timeout: 8000 });

router.get('/feeds', (req, res) => {
  res.json(db.prepare('SELECT * FROM rss_feeds WHERE active = 1 ORDER BY id DESC').all());
});

router.post('/feeds', (req, res) => {
  const { name, url, tag } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });
  const result = db.prepare('INSERT INTO rss_feeds (name, url, tag, active) VALUES (?, ?, ?, 1)').run(name || url, url, tag || '');
  res.json(db.prepare('SELECT * FROM rss_feeds WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/feeds/:id', (req, res) => {
  const id = Number(req.params.id);
  const { name, url, tag, active } = req.body;
  db.prepare(`
    UPDATE rss_feeds
    SET name = COALESCE(?, name),
        url = COALESCE(?, url),
        tag = COALESCE(?, tag),
        active = COALESCE(?, active)
    WHERE id = ?
  `).run(name, url, tag, active == null ? null : (active ? 1 : 0), id);
  res.json(db.prepare('SELECT * FROM rss_feeds WHERE id = ?').get(id));
});

router.delete('/feeds/:id', (req, res) => {
  db.prepare('DELETE FROM rss_feeds WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

router.get('/articles', async (req, res) => {
  const { tag } = req.query;
  const rows = tag
    ? db.prepare('SELECT * FROM rss_feeds WHERE active = 1 AND tag = ?').all(tag)
    : db.prepare('SELECT * FROM rss_feeds WHERE active = 1').all();

  const all = [];
  await Promise.all(rows.map(async feed => {
    try {
      const parsed = await parser.parseURL(feed.url);
      for (const item of (parsed.items || []).slice(0, 10)) {
        all.push({
          feed_id: feed.id,
          source: feed.name || parsed.title || '',
          tag: feed.tag || '',
          title: item.title || '(untitled)',
          link: item.link || '',
          published: item.isoDate || item.pubDate || ''
        });
      }
    } catch (err) {
      all.push({
        feed_id: feed.id,
        source: feed.name || feed.url,
        tag: feed.tag || '',
        title: `[feed error] ${err.message}`,
        link: feed.url,
        published: '',
        error: true
      });
    }
  }));

  all.sort((a, b) => new Date(b.published || 0) - new Date(a.published || 0));
  res.json({ articles: all.slice(0, 50) });
});

module.exports = router;
