const express = require('express');
const { db } = require('../database');

const router = express.Router();

function withObjectives(quest) {
  const objectives = db.prepare('SELECT * FROM quest_objectives WHERE quest_id = ? ORDER BY id').all(quest.id);
  return { ...quest, objectives };
}

router.get('/', (req, res) => {
  const { status } = req.query;
  const rows = status
    ? db.prepare('SELECT * FROM quests WHERE status = ? ORDER BY id DESC').all(status)
    : db.prepare('SELECT * FROM quests ORDER BY id DESC').all();
  res.json(rows.map(withObjectives));
});

router.post('/', (req, res) => {
  const { title, description, category, tier, target_date, progress, status } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const result = db.prepare(`
    INSERT INTO quests (title, description, category, tier, target_date, progress, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(title, description || '', category || '', tier || 'side', target_date || null, progress || 0, status || 'active');
  const row = db.prepare('SELECT * FROM quests WHERE id = ?').get(result.lastInsertRowid);
  res.json(withObjectives(row));
});

router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const { title, description, category, tier, target_date, progress, status } = req.body;
  db.prepare(`
    UPDATE quests
    SET title = COALESCE(?, title),
        description = COALESCE(?, description),
        category = COALESCE(?, category),
        tier = COALESCE(?, tier),
        target_date = COALESCE(?, target_date),
        progress = COALESCE(?, progress),
        status = COALESCE(?, status)
    WHERE id = ?
  `).run(title, description, category, tier, target_date, progress, status, id);
  const row = db.prepare('SELECT * FROM quests WHERE id = ?').get(id);
  res.json(withObjectives(row));
});

router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM quest_objectives WHERE quest_id = ?').run(id);
  db.prepare('DELETE FROM quests WHERE id = ?').run(id);
  res.json({ ok: true });
});

router.post('/:id/objectives', (req, res) => {
  const questId = Number(req.params.id);
  const { label } = req.body;
  if (!label) return res.status(400).json({ error: 'label required' });
  const result = db.prepare('INSERT INTO quest_objectives (quest_id, label) VALUES (?, ?)').run(questId, label);
  const row = db.prepare('SELECT * FROM quest_objectives WHERE id = ?').get(result.lastInsertRowid);
  res.json(row);
});

router.put('/objectives/:objId', (req, res) => {
  const objId = Number(req.params.objId);
  const { completed, label } = req.body;
  db.prepare(`
    UPDATE quest_objectives
    SET label = COALESCE(?, label),
        completed = COALESCE(?, completed)
    WHERE id = ?
  `).run(label, completed == null ? null : (completed ? 1 : 0), objId);
  const row = db.prepare('SELECT * FROM quest_objectives WHERE id = ?').get(objId);
  res.json(row);
});

router.delete('/objectives/:objId', (req, res) => {
  db.prepare('DELETE FROM quest_objectives WHERE id = ?').run(Number(req.params.objId));
  res.json({ ok: true });
});

module.exports = router;
