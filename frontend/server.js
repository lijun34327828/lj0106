const express = require('express');
const path = require('path');
const config = require('../config.json');

const app = express();
const PORT = config.FRONTEND_PORT || 3924;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/config', (req, res) => {
  res.json({
    backendUrl: `http://localhost:${config.BACKEND_PORT || 8926}`,
    frontendPort: PORT
  });
});

app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  行为检测配置页面已启动`);
  console.log(`  端口: ${PORT}`);
  console.log(`  访问地址: http://localhost:${PORT}`);
  console.log(`========================================\n`);
});

module.exports = app;
