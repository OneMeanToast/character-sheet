require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { init } = require('./database');
const { readConfig, writeConfig } = require('./config');

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

init();
readConfig();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(uploadsDir));

app.get('/api/health', (req, res) => res.json({ status: 'online' }));

app.get('/api/config', (req, res) => {
  res.json(readConfig());
});

app.put('/api/config', (req, res) => {
  const next = writeConfig(req.body || {});
  res.json(next);
});

app.use('/api/character', require('./routes/character'));
app.use('/api/quests', require('./routes/quests'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/fitness', require('./routes/fitness'));
app.use('/api/journal', require('./routes/journal'));
app.use('/api/travel', require('./routes/travel'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/intel', require('./routes/intel'));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[command-center] server listening on http://localhost:${PORT}`);
});
