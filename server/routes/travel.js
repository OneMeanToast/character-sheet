const express = require('express');
const { db } = require('../database');

const router = express.Router();

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM travel_pins ORDER BY id DESC').all();
  const countries = new Set(
    rows.filter(r => r.status === 'conquered' && r.country).map(r => r.country)
  );
  res.json({ pins: rows, countries_visited: countries.size });
});

router.post('/', (req, res) => {
  const { name, lat, lng, country, status, notes, image_path, target_date } = req.body;
  if (!name || lat == null || lng == null) {
    return res.status(400).json({ error: 'name, lat, lng required' });
  }
  const result = db.prepare(`
    INSERT INTO travel_pins (name, lat, lng, country, status, notes, image_path, target_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, lat, lng, country || '', status || 'radar', notes || '', image_path || '', target_date || null);
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

module.exports = router;
