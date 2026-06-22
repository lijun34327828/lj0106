const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('../config.json');
const ruleEngineRoutes = require('./routes/ruleEngine');
const detectionRoutes = require('./routes/detection');

const app = express();
const PORT = config.BACKEND_PORT || 8926;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'behavior-detection-rule-engine',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

app.use('/api/rule-engine', ruleEngineRoutes);
app.use('/api/detection', detectionRoutes);

app.use((err, req, res, next) => {
  console.error('[Error]', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  行为检测规则推演服务已启动`);
  console.log(`  端口: ${PORT}`);
  console.log(`  健康检查: http://localhost:${PORT}/api/health`);
  console.log(`========================================\n`);
});

module.exports = app;
