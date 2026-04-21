const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'config.json');

const defaults = {
  obsidian_vault_path: '',
  rss_feeds: []
};

function readConfig() {
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify(defaults, null, 2));
    return { ...defaults };
  }
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    return { ...defaults, ...JSON.parse(raw) };
  } catch (err) {
    return { ...defaults };
  }
}

function writeConfig(patch) {
  const current = readConfig();
  const next = { ...current, ...patch };
  fs.writeFileSync(configPath, JSON.stringify(next, null, 2));
  return next;
}

module.exports = { readConfig, writeConfig, configPath };
