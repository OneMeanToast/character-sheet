const express = require('express');
const { db } = require('../database');

const router = express.Router();

// Assets
router.get('/assets', (req, res) => {
  res.json(db.prepare('SELECT * FROM assets ORDER BY id DESC').all());
});

router.post('/assets', (req, res) => {
  const { name, category, value_estimate, notes, image_path } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const result = db.prepare(`
    INSERT INTO assets (name, category, value_estimate, notes, image_path)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, category || 'other', value_estimate || 0, notes || '', image_path || '');
  res.json(db.prepare('SELECT * FROM assets WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/assets/:id', (req, res) => {
  const id = Number(req.params.id);
  const { name, category, value_estimate, notes, image_path } = req.body;
  db.prepare(`
    UPDATE assets
    SET name = COALESCE(?, name),
        category = COALESCE(?, category),
        value_estimate = COALESCE(?, value_estimate),
        notes = COALESCE(?, notes),
        image_path = COALESCE(?, image_path)
    WHERE id = ?
  `).run(name, category, value_estimate, notes, image_path, id);
  res.json(db.prepare('SELECT * FROM assets WHERE id = ?').get(id));
});

router.delete('/assets/:id', (req, res) => {
  db.prepare('DELETE FROM assets WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// Accounts
router.get('/accounts', (req, res) => {
  res.json(db.prepare('SELECT * FROM accounts ORDER BY id DESC').all());
});

router.post('/accounts', (req, res) => {
  const { name, institution, type, balance, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const result = db.prepare(`
    INSERT INTO accounts (name, institution, type, balance, notes)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, institution || '', type || 'brokerage', balance || 0, notes || '');
  res.json(db.prepare('SELECT * FROM accounts WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/accounts/:id', (req, res) => {
  const id = Number(req.params.id);
  const { name, institution, type, balance, notes } = req.body;
  db.prepare(`
    UPDATE accounts
    SET name = COALESCE(?, name),
        institution = COALESCE(?, institution),
        type = COALESCE(?, type),
        balance = COALESCE(?, balance),
        notes = COALESCE(?, notes)
    WHERE id = ?
  `).run(name, institution, type, balance, notes, id);
  res.json(db.prepare('SELECT * FROM accounts WHERE id = ?').get(id));
});

router.delete('/accounts/:id', (req, res) => {
  db.prepare('DELETE FROM accounts WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// Watchlist
router.get('/watchlist', (req, res) => {
  res.json(db.prepare('SELECT * FROM watchlist ORDER BY id DESC').all());
});

router.post('/watchlist', (req, res) => {
  const { ticker, name, current_price, target_price, status, notes } = req.body;
  const result = db.prepare(`
    INSERT INTO watchlist (ticker, name, current_price, target_price, status, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(ticker || '', name || '', current_price || 0, target_price || 0, status || 'watching', notes || '');
  res.json(db.prepare('SELECT * FROM watchlist WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/watchlist/:id', (req, res) => {
  const id = Number(req.params.id);
  const { ticker, name, current_price, target_price, status, notes } = req.body;
  db.prepare(`
    UPDATE watchlist
    SET ticker = COALESCE(?, ticker),
        name = COALESCE(?, name),
        current_price = COALESCE(?, current_price),
        target_price = COALESCE(?, target_price),
        status = COALESCE(?, status),
        notes = COALESCE(?, notes),
        updated_at = datetime('now')
    WHERE id = ?
  `).run(ticker, name, current_price, target_price, status, notes, id);
  res.json(db.prepare('SELECT * FROM watchlist WHERE id = ?').get(id));
});

router.delete('/watchlist/:id', (req, res) => {
  db.prepare('DELETE FROM watchlist WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

module.exports = router;
