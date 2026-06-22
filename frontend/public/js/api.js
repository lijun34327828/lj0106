const API = {
  async checkHealth() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/health`, { method: 'GET' });
      return await res.json();
    } catch (err) {
      return null;
    }
  },

  async getDetectionTypes() {
    const res = await fetch(`${BACKEND_URL}/api/rule-engine/detection-types`);
    return await res.json();
  },

  async getSceneTypes() {
    const res = await fetch(`${BACKEND_URL}/api/rule-engine/scene-types`);
    return await res.json();
  },

  async getPresets() {
    const res = await fetch(`${BACKEND_URL}/api/rule-engine/presets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return await res.json();
  },

  async inferParameters(data) {
    const res = await fetch(`${BACKEND_URL}/api/rule-engine/infer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  async syncParameters(data) {
    const res = await fetch(`${BACKEND_URL}/api/rule-engine/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  async validateConfig(config) {
    const res = await fetch(`${BACKEND_URL}/api/rule-engine/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config })
    });
    return await res.json();
  },

  async saveConfig(data) {
    const res = await fetch(`${BACKEND_URL}/api/rule-engine/configs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  }
};
