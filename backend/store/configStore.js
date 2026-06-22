const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'configs.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(CONFIG_FILE)) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify([], null, 2));
}

function readAll() {
  try {
    const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    return [];
  }
}

function writeAll(data) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2));
}

function saveConfig({ name, config, description }) {
  const configs = readAll();
  const newConfig = {
    id: 'cfg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    name,
    description: description || '',
    config,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  configs.push(newConfig);
  writeAll(configs);
  return newConfig;
}

function getAllConfigs() {
  return readAll().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

function getConfig(id) {
  return readAll().find(c => c.id === id) || null;
}

function deleteConfig(id) {
  const configs = readAll();
  const index = configs.findIndex(c => c.id === id);
  if (index === -1) return false;
  configs.splice(index, 1);
  writeAll(configs);
  return true;
}

module.exports = {
  saveConfig,
  getAllConfigs,
  getConfig,
  deleteConfig
};
