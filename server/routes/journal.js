const express = require('express');
const fs = require('fs');
const path = require('path');
const { readConfig, writeConfig } = require('../config');

const router = express.Router();

function listMarkdownFiles(vaultPath) {
  if (!vaultPath || !fs.existsSync(vaultPath)) return [];
  const results = [];
  const rootEntries = fs.readdirSync(vaultPath, { withFileTypes: true });
  for (const entry of rootEntries) {
    const full = path.join(vaultPath, entry.name);
    if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(full);
    } else if (entry.isDirectory() && !entry.name.startsWith('.')) {
      try {
        const subEntries = fs.readdirSync(full, { withFileTypes: true });
        for (const sub of subEntries) {
          if (sub.isFile() && sub.name.endsWith('.md')) {
            results.push(path.join(full, sub.name));
          }
        }
      } catch {}
    }
  }
  return results;
}

router.get('/', (req, res) => {
  const { obsidian_vault_path } = readConfig();
  if (!obsidian_vault_path) {
    return res.json({ configured: false, entries: [] });
  }
  if (!fs.existsSync(obsidian_vault_path)) {
    return res.json({ configured: true, vault_path: obsidian_vault_path, entries: [], error: 'Vault path does not exist' });
  }
  const files = listMarkdownFiles(obsidian_vault_path);
  const entries = files.map(filePath => {
    const stat = fs.statSync(filePath);
    let preview = '';
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      preview = content.replace(/^---[\s\S]*?---\n?/, '').trim().slice(0, 100);
    } catch {}
    const relative = path.relative(obsidian_vault_path, filePath);
    return {
      filename: path.basename(filePath, '.md'),
      path: filePath,
      relative_path: relative,
      preview,
      modified_at: stat.mtime.toISOString()
    };
  });
  entries.sort((a, b) => new Date(b.modified_at) - new Date(a.modified_at));
  res.json({ configured: true, vault_path: obsidian_vault_path, entries: entries.slice(0, 5) });
});

router.post('/new', (req, res) => {
  const { obsidian_vault_path } = readConfig();
  if (!obsidian_vault_path || !fs.existsSync(obsidian_vault_path)) {
    return res.status(400).json({ error: 'Vault path not configured' });
  }
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  let filename = `${dateStr}.md`;
  let target = path.join(obsidian_vault_path, filename);
  let i = 1;
  while (fs.existsSync(target)) {
    filename = `${dateStr}-${i}.md`;
    target = path.join(obsidian_vault_path, filename);
    i++;
  }
  fs.writeFileSync(target, `# ${dateStr}\n\n`);
  const vaultName = path.basename(obsidian_vault_path);
  const relative = path.relative(obsidian_vault_path, target).replace(/\\/g, '/');
  const obsidianUri = `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(relative.replace(/\.md$/, ''))}`;
  res.json({ path: target, filename, obsidian_uri: obsidianUri });
});

router.get('/obsidian-uri', (req, res) => {
  const { obsidian_vault_path } = readConfig();
  const { path: filePath } = req.query;
  if (!obsidian_vault_path || !filePath) return res.status(400).json({ error: 'missing' });
  const vaultName = path.basename(obsidian_vault_path);
  const relative = path.relative(obsidian_vault_path, filePath).replace(/\\/g, '/').replace(/\.md$/, '');
  res.json({ uri: `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(relative)}` });
});

router.put('/vault-path', (req, res) => {
  const { path: vaultPath } = req.body;
  const next = writeConfig({ obsidian_vault_path: vaultPath || '' });
  res.json(next);
});

module.exports = router;
