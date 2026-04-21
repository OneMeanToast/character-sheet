const express = require('express');
const multer = require('multer');
const path = require('path');
const { db } = require('../database');

const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

router.get('/', (req, res) => {
  const row = db.prepare('SELECT * FROM character WHERE id = 1').get();
  if (row && row.custom_stats) {
    try { row.custom_stats = JSON.parse(row.custom_stats); } catch { row.custom_stats = []; }
  } else if (row) {
    row.custom_stats = [];
  }
  res.json(row || {});
});

router.put('/', (req, res) => {
  const { name, title, nickname, archetype, level, xp, bio, avatar_path, custom_stats } = req.body;
  const statsJson = JSON.stringify(custom_stats || []);
  db.prepare(`
    UPDATE character
    SET name = COALESCE(?, name),
        title = COALESCE(?, title),
        nickname = COALESCE(?, nickname),
        archetype = COALESCE(?, archetype),
        level = COALESCE(?, level),
        xp = COALESCE(?, xp),
        bio = COALESCE(?, bio),
        avatar_path = COALESCE(?, avatar_path),
        custom_stats = ?
    WHERE id = 1
  `).run(name, title, nickname, archetype, level, xp, bio, avatar_path, statsJson);
  const row = db.prepare('SELECT * FROM character WHERE id = 1').get();
  try { row.custom_stats = JSON.parse(row.custom_stats); } catch { row.custom_stats = []; }
  res.json(row);
});

router.post('/avatar', upload.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const relative = `/uploads/${req.file.filename}`;
  db.prepare('UPDATE character SET avatar_path = ? WHERE id = 1').run(relative);
  res.json({ avatar_path: relative });
});

module.exports = router;
