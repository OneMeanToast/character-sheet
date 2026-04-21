const express = require('express');
const { db } = require('../database');

const router = express.Router();

// ── Pins ───────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const pins = db.prepare('SELECT * FROM travel_pins ORDER BY id DESC').all();
  const countries = db.prepare('SELECT * FROM country_statuses').all();
  const visited = countries.filter(c => c.status === 'visited').length;
  res.json({
    pins,
    countries,
    counts: {
      visited,
      planned: countries.filter(c => c.status === 'planned').length,
      wishlist: countries.filter(c => c.status === 'wishlist').length,
      pins: pins.length
    },
    countries_visited: visited
  });
});

router.post('/', (req, res) => {
  const { name, lat, lng, country, status, notes, image_path, target_date } = req.body;
  if (!name || lat == null || lng == null) {
    return res.status(400).json({ error: 'name, lat, lng required' });
  }
  const result = db.prepare(`
    INSERT INTO travel_pins (name, lat, lng, country, status, notes, image_path, target_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, lat, lng, country || '', status || 'planned', notes || '', image_path || '', target_date || null);
  res.json(db.prepare('SELECT * FROM travel_pins WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const { name, lat, lng, country, status, notes, image_path, target_date } = req.body;
  db.prepare(`
    UPDATE travel_pins
    SET name = COALESCE(?, name),
        lat = COALESCE(?, lat),
        lng = COALESCE(?, lng),
        country = COALESCE(?, country),
        status = COALESCE(?, status),
        notes = COALESCE(?, notes),
        image_path = COALESCE(?, image_path),
        target_date = COALESCE(?, target_date)
    WHERE id = ?
  `).run(name, lat, lng, country, status, notes, image_path, target_date, id);
  res.json(db.prepare('SELECT * FROM travel_pins WHERE id = ?').get(id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM travel_pins WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// ── Country statuses ───────────────────────────────────────────────
router.get('/countries', (req, res) => {
  res.json(db.prepare('SELECT * FROM country_statuses').all());
});

router.put('/countries/:code', (req, res) => {
  const code = String(req.params.code).toUpperCase();
  const { country_name, status, notes, target_date } = req.body;
  if (!status) return res.status(400).json({ error: 'status required' });
  if (!['visited', 'planned', 'wishlist'].includes(status)) {
    return res.status(400).json({ error: 'invalid status' });
  }
  db.prepare(`
    INSERT INTO country_statuses (country_code, country_name, status, notes, target_date, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(country_code) DO UPDATE SET
      country_name = excluded.country_name,
      status = excluded.status,
      notes = COALESCE(excluded.notes, country_statuses.notes),
      target_date = COALESCE(excluded.target_date, country_statuses.target_date),
      updated_at = datetime('now')
  `).run(code, country_name || '', status, notes || '', target_date || null);
  res.json(db.prepare('SELECT * FROM country_statuses WHERE country_code = ?').get(code));
});

router.delete('/countries/:code', (req, res) => {
  const code = String(req.params.code).toUpperCase();
  db.prepare('DELETE FROM country_statuses WHERE country_code = ?').run(code);
  res.json({ ok: true });
});

module.exports = router;
