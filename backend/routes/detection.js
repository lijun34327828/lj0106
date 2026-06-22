const express = require('express');
const router = express.Router();

router.post('/simulate', (req, res) => {
  try {
    const { config, testFrames = 100 } = req.body;
    if (!config) {
      return res.status(400).json({ success: false, error: '缺少检测配置' });
    }

    const events = [];
    const detectionTypes = Object.keys(config.detectionRules || {});

    for (let frame = 0; frame < testFrames; frame++) {
      const timestamp = Date.now() + frame * 40;

      if (Math.random() < 0.05 && detectionTypes.includes('trespass')) {
        events.push({
          frame,
          timestamp,
          type: 'trespass',
          typeName: '越界检测',
          confidence: 0.75 + Math.random() * 0.2,
          location: { x: Math.random() * 800 + 100, y: Math.random() * 500 + 50 },
          objectSize: Math.floor(500 + Math.random() * 2000),
          direction: ['in', 'out', 'bidirectional'][Math.floor(Math.random() * 3)],
          level: Math.random() > 0.8 ? 'high' : 'normal'
        });
      }

      if (Math.random() < 0.03 && detectionTypes.includes('loitering')) {
        events.push({
          frame,
          timestamp,
          type: 'loitering',
          typeName: '逗留检测',
          confidence: 0.7 + Math.random() * 0.25,
          location: { x: Math.random() * 800 + 100, y: Math.random() * 500 + 50 },
          duration: Math.floor(20 + Math.random() * 120),
          objectId: `person_${Math.floor(Math.random() * 100)}`,
          level: Math.random() > 0.85 ? 'high' : 'normal'
        });
      }

      if (Math.random() < 0.02 && detectionTypes.includes('left_object')) {
        events.push({
          frame,
          timestamp,
          type: 'left_object',
          typeName: '物品遗留',
          confidence: 0.72 + Math.random() * 0.2,
          location: { x: Math.random() * 800 + 100, y: Math.random() * 500 + 50 },
          objectArea: Math.floor(300 + Math.random() * 3000),
          detectedFor: Math.floor(10 + Math.random() * 60),
          level: Math.random() > 0.9 ? 'high' : 'normal'
        });
      }
    }

    const stats = {
      totalFrames: testFrames,
      totalEvents: events.length,
      eventsPerType: detectionTypes.reduce((acc, type) => {
        acc[type] = events.filter(e => e.type === type).length;
        return acc;
      }, {}),
      highRiskCount: events.filter(e => e.level === 'high').length,
      avgConfidence: events.length > 0 ? (events.reduce((s, e) => s + e.confidence, 0) / events.length).toFixed(3) : 0
    };

    res.json({
      success: true,
      stats,
      events: events.slice(0, 50),
      estimate: {
        falsePositiveRate: events.length > 0 ? (stats.highRiskCount / events.length * 0.3).toFixed(3) : 0,
        estimatedDailyAlerts: Math.floor(events.length / testFrames * 24 * 3600 * 25 * 0.15),
        processingTimePerFrame: `${(0.5 + Math.random() * 2).toFixed(1)}ms`
      }
    });
  } catch (err) {
    console.error('[DetectSimulate] Error:', err);
    res.status(500).json({ success: false, error: err.message || '模拟检测失败' });
  }
});

router.post('/optimize', (req, res) => {
  try {
    const { config, feedbackData } = req.body;
    if (!config) {
      return res.status(400).json({ success: false, error: '缺少配置数据' });
    }

    const suggestions = [];
    const optimizedRules = JSON.parse(JSON.stringify(config.detectionRules));

    for (const [typeKey, typeConfig] of Object.entries(optimizedRules)) {
      for (const [paramKey, param] of Object.entries(typeConfig.parameters)) {
        if (param._inRecommendedRange === false && param.falsePositiveRisk === 'high') {
          const recommendedRange = param.recommendedRange;
          const newValue = recommendedRange[0] + (recommendedRange[1] - recommendedRange[0]) / 2;
          suggestions.push({
            type: typeKey,
            param: paramKey,
            from: param.value,
            to: param.step ? Math.round(newValue / param.step) * param.step : newValue,
            reason: `${param.label} 超出推荐范围，调整至推荐区间中点以降低误报风险`
          });
          param.value = param.step ? Math.round(newValue / param.step) * param.step : newValue;
          param._inRecommendedRange = true;
          param._optimized = true;
        }

        if (feedbackData && feedbackData.falsePositives && feedbackData.falsePositives[typeKey]) {
          const fpCount = feedbackData.falsePositives[typeKey];
          if (fpCount > 10 && paramKey === 'sensitivity') {
            const newSensitivity = Math.max(param.min, param.value - 0.05 * Math.ceil(fpCount / 20));
            suggestions.push({
              type: typeKey,
              param: paramKey,
              from: param.value,
              to: Math.round(newSensitivity * 100) / 100,
              reason: `检测到 ${fpCount} 条误报记录，降低灵敏度以减少误报`
            });
            param.value = Math.round(newSensitivity * 100) / 100;
            param._optimized = true;
          }
          if (fpCount > 5 && paramKey.includes('frameConfirmCount')) {
            const newValue = Math.min(param.max, param.value + 1);
            suggestions.push({
              type: typeKey,
              param: paramKey,
              from: param.value,
              to: newValue,
              reason: `检测到 ${fpCount} 条误报记录，增加确认帧数提高可靠性`
            });
            param.value = newValue;
            param._optimized = true;
          }
        }
      }
    }

    res.json({
      success: true,
      suggestions,
      optimizedConfig: { ...config, detectionRules: optimizedRules },
      summary: {
        appliedOptimizations: suggestions.length,
        affectedTypes: [...new Set(suggestions.map(s => s.type))],
        expectedImprovement: suggestions.length > 0 ? `预计减少 ${Math.min(60, suggestions.length * 15)}% 误报` : '无需优化，当前配置已较优'
      }
    });
  } catch (err) {
    console.error('[Optimize] Error:', err);
    res.status(500).json({ success: false, error: err.message || '优化失败' });
  }
});

module.exports = router;
