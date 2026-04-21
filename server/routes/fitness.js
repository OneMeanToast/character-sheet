const express = require('express');
const { db } = require('../database');

const router = express.Router();

// Templates
router.get('/templates', (req, res) => {
  const rows = db.prepare('SELECT * FROM workout_templates ORDER BY id DESC').all();
  rows.forEach(r => {
    try { r.exercises = JSON.parse(r.exercises || '[]'); } catch { r.exercises = []; }
  });
  res.json(rows);
});

router.post('/templates', (req, res) => {
  const { name, exercises } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const result = db.prepare('INSERT INTO workout_templates (name, exercises) VALUES (?, ?)').run(name, JSON.stringify(exercises || []));
  const row = db.prepare('SELECT * FROM workout_templates WHERE id = ?').get(result.lastInsertRowid);
  try { row.exercises = JSON.parse(row.exercises || '[]'); } catch { row.exercises = []; }
  res.json(row);
});

router.put('/templates/:id', (req, res) => {
  const id = Number(req.params.id);
  const { name, exercises } = req.body;
  db.prepare(`
    UPDATE workout_templates
    SET name = COALESCE(?, name),
        exercises = COALESCE(?, exercises)
    WHERE id = ?
  `).run(name, exercises ? JSON.stringify(exercises) : null, id);
  const row = db.prepare('SELECT * FROM workout_templates WHERE id = ?').get(id);
  try { row.exercises = JSON.parse(row.exercises || '[]'); } catch { row.exercises = []; }
  res.json(row);
});

router.delete('/templates/:id', (req, res) => {
  db.prepare('DELETE FROM workout_templates WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// Logs
router.get('/logs', (req, res) => {
  res.json(db.prepare('SELECT * FROM workout_logs ORDER BY date DESC, id DESC LIMIT 60').all());
});

router.post('/logs', (req, res) => {
  const { template_id, date, status, notes } = req.body;
  if (!date) return res.status(400).json({ error: 'date required' });
  const result = db.prepare(`
    INSERT INTO workout_logs (template_id, date, status, notes)
    VALUES (?, ?, ?, ?)
  `).run(template_id || null, date, status || 'hit', notes || '');
  res.json(db.prepare('SELECT * FROM workout_logs WHERE id = ?').get(result.lastInsertRowid));
});

router.delete('/logs/:id', (req, res) => {
  db.prepare('DELETE FROM workout_logs WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// Goals
router.get('/goals', (req, res) => {
  res.json(db.prepare('SELECT * FROM fitness_goals ORDER BY id DESC').all());
});

router.post('/goals', (req, res) => {
  const { title, progress, target_date } = req.body;
  const result = db.prepare('INSERT INTO fitness_goals (title, progress, target_date) VALUES (?, ?, ?)').run(title || '', progress || 0, target_date || null);
  res.json(db.prepare('SELECT * FROM fitness_goals WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/goals/:id', (req, res) => {
  const id = Number(req.params.id);
  const { title, progress, target_date } = req.body;
  db.prepare(`
    UPDATE fitness_goals
    SET title = COALESCE(?, title),
        progress = COALESCE(?, progress),
        target_date = COALESCE(?, target_date)
    WHERE id = ?
  `).run(title, progress, target_date, id);
  res.json(db.prepare('SELECT * FROM fitness_goals WHERE id = ?').get(id));
});

router.delete('/goals/:id', (req, res) => {
  db.prepare('DELETE FROM fitness_goals WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// Supplements
router.get('/supplements', (req, res) => {
  res.json(db.prepare('SELECT * FROM supplements ORDER BY id DESC').all());
});

router.post('/supplements', (req, res) => {
  const { name, dose, timing, active } = req.body;
  const result = db.prepare(`
    INSERT INTO supplements (name, dose, timing, active)
    VALUES (?, ?, ?, ?)
  `).run(name || '', dose || '', timing || '', active == null ? 1 : (active ? 1 : 0));
  res.json(db.prepare('SELECT * FROM supplements WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/supplements/:id', (req, res) => {
  const id = Number(req.params.id);
  const { name, dose, timing, active } = req.body;
  db.prepare(`
    UPDATE supplements
    SET name = COALESCE(?, name),
        dose = COALESCE(?, dose),
        timing = COALESCE(?, timing),
        active = COALESCE(?, active)
    WHERE id = ?
  `).run(name, dose, timing, active == null ? null : (active ? 1 : 0), id);
  res.json(db.prepare('SELECT * FROM supplements WHERE id = ?').get(id));
});

router.delete('/supplements/:id', (req, res) => {
  db.prepare('DELETE FROM supplements WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// Body Stats
router.get('/body', (req, res) => {
  res.json(db.prepare('SELECT * FROM body_stats ORDER BY date DESC, id DESC LIMIT 30').all());
});

router.post('/body', (req, res) => {
  const { date, weight, notes } = req.body;
  if (!date) return res.status(400).json({ error: 'date required' });
  const result = db.prepare('INSERT INTO body_stats (date, weight, notes) VALUES (?, ?, ?)').run(date, weight || 0, notes || '');
  res.json(db.prepare('SELECT * FROM body_stats WHERE id = ?').get(result.lastInsertRowid));
});

router.delete('/body/:id', (req, res) => {
  db.prepare('DELETE FROM body_stats WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

module.exports = router;
