let BACKEND_URL = 'http://localhost:8926';

async function initConfig() {
  try {
    const res = await fetch('/api/config');
    const config = await res.json();
    BACKEND_URL = config.backendUrl;
    return config;
  } catch (err) {
    console.warn('使用默认后端地址:', BACKEND_URL);
    return { backendUrl: BACKEND_URL };
  }
}
