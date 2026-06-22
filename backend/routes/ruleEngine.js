const express = require('express');
const router = express.Router();
const RuleInferenceEngine = require('../engine/RuleInferenceEngine');
const configStore = require('../store/configStore');

const engine = new RuleInferenceEngine();

router.get('/detection-types', (req, res) => {
  const types = [
    { id: 'trespass', name: '越界检测', icon: 'border', description: '检测目标进入禁止区域的行为', typicalScenarios: ['周界防护', '禁区监控', '边界警戒'] },
    { id: 'loitering', name: '逗留检测', icon: 'timer', description: '检测目标在区域内长时间停留的行为', typicalScenarios: ['敏感区域', 'ATM机旁', '消防通道'] },
    { id: 'left_object', name: '物品遗留', icon: 'package', description: '检测被遗弃或遗留的物品', typicalScenarios: ['公共区域', '交通枢纽', '安检区域'] }
  ];
  res.json({ success: true, data: types });
});

router.get('/scene-types', (req, res) => {
  const types = [
    { id: 'perimeter', name: '周界防护', description: '围墙周边、出入口、禁区边界等', crowdDensity: 'low' },
    { id: 'entrance', name: '出入口监控', description: '大门、通道、安检口等', crowdDensity: 'medium' },
    { id: 'warehouse', name: '仓储区域', description: '货架通道、堆放区、装卸区等', crowdDensity: 'low' },
    { id: 'public', name: '公共场所', description: '广场、大厅、候车区等', crowdDensity: 'high' },
    { id: 'corridor', name: '走廊通道', description: '楼道、走廊、过道等', crowdDensity: 'medium' },
    { id: 'custom', name: '自定义场景', description: '根据实际情况自定义配置', crowdDensity: 'medium' }
  ];
  res.json({ success: true, data: types });
});

router.post('/infer', (req, res) => {
  try {
    const { detectionTypes, region, sceneType = 'custom', cameraAngle = 'normal', lighting = 'normal' } = req.body;

    if (!detectionTypes || !Array.isArray(detectionTypes) || detectionTypes.length === 0) {
      return res.status(400).json({ success: false, error: '请至少选择一种检测类型' });
    }

    if (!region || !region.points || !Array.isArray(region.points) || region.points.length < 3) {
      return res.status(400).json({ success: false, error: '请在画面上划定检测区域（至少3个点）' });
    }

    const validTypes = ['trespass', 'loitering', 'left_object'];
    const invalidTypes = detectionTypes.filter(t => !validTypes.includes(t));
    if (invalidTypes.length > 0) {
      return res.status(400).json({ success: false, error: `不支持的检测类型: ${invalidTypes.join(', ')}` });
    }

    const regionData = {
      points: region.points,
      sceneType,
      cameraAngle,
      lighting
    };

    const result = engine.inferParameters(detectionTypes, regionData);

    res.json(result);
  } catch (err) {
    console.error('[RuleInference] Error:', err);
    res.status(500).json({ success: false, error: err.message || '参数推演失败' });
  }
});

router.post('/sync', (req, res) => {
  try {
    const { currentConfig, newRegion, newDetectionTypes, sceneType = 'custom', cameraAngle = 'normal', lighting = 'normal' } = req.body;

    if (!currentConfig || !newRegion || !newDetectionTypes) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    if (!newRegion.points || newRegion.points.length < 3) {
      return res.status(400).json({ success: false, error: '新检测区域不完整（至少3个点）' });
    }

    const regionData = {
      points: newRegion.points,
      sceneType,
      cameraAngle,
      lighting
    };

    const result = engine.syncParameters(currentConfig, regionData, newDetectionTypes);
    res.json(result);
  } catch (err) {
    console.error('[SyncParameters] Error:', err);
    res.status(500).json({ success: false, error: err.message || '参数同步失败' });
  }
});

router.post('/validate', (req, res) => {
  try {
    const { config } = req.body;
    if (!config || !config.detectionRules) {
      return res.status(400).json({ success: false, error: '配置数据不完整' });
    }

    const issues = [];
    const warnings = [];

    for (const [typeKey, typeConfig] of Object.entries(config.detectionRules)) {
      for (const [paramKey, param] of Object.entries(typeConfig.parameters)) {
        const isEnum = Array.isArray(param.options);

        if (!isEnum) {
          if (param.min !== undefined && param.value < param.min) {
            issues.push({ type: typeKey, param: paramKey, message: `${param.label} 值 ${param.value} 低于最小值 ${param.min}` });
          }
          if (param.max !== undefined && param.value > param.max) {
            issues.push({ type: typeKey, param: paramKey, message: `${param.label} 值 ${param.value} 高于最大值 ${param.max}` });
          }
        }

        if (isEnum) {
          if (!param.options.includes(param.value)) {
            issues.push({ type: typeKey, param: paramKey, message: `${param.label} 值 ${param.value} 不在可选项 [${param.options.join(', ')}] 中` });
          }
        } else {
          if (param.recommendedRange && !engine.isInRange(param.value, param.recommendedRange, param)) {
            const riskNote = param.falsePositiveRisk === 'high' ? '（误报高风险参数）' : '';
            warnings.push({ type: typeKey, param: paramKey, message: `${param.label} ${param.value} 超出推荐范围 [${param.recommendedRange.join('-')}]${riskNote}` });
          }
        }

        if (!isEnum && param.filteredRanges) {
          for (const [min, max] of param.filteredRanges) {
            if (param.value >= min && param.value <= max) {
              issues.push({ type: typeKey, param: paramKey, message: `${param.label} 值 ${param.value} 落在误报敏感区间 [${min}-${max}]，已自动过滤` });
            }
          }
        }
      }

      const risk = typeConfig.scenarioAnalysis?.falsePositiveEstimate;
      if (risk?.level === 'high') {
        warnings.push({ type: typeKey, message: `${typeConfig.name} 误报风险等级: ${risk.level}，${risk.suggestion}` });
      }
    }

    res.json({
      success: true,
      valid: issues.length === 0,
      issues,
      warnings,
      summary: {
        totalParams: Object.values(config.detectionRules).reduce((s, r) => s + Object.keys(r.parameters).length, 0),
        issueCount: issues.length,
        warningCount: warnings.length,
        passRate: issues.length === 0 ? '100%' : `${Math.max(0, 100 - issues.length * 5)}%`
      }
    });
  } catch (err) {
    console.error('[ValidateConfig] Error:', err);
    res.status(500).json({ success: false, error: err.message || '配置校验失败' });
  }
});

router.post('/presets', (req, res) => {
  try {
    const { scenePreset } = req.body;
    const presets = {
      'fence_perimeter': {
        name: '围墙周界防越界',
        detectionTypes: ['trespass'],
        sceneType: 'perimeter',
        regionHint: '沿围墙内侧绘制狭长多边形区域',
        expectedParams: { sensitivity: 0.75, boundaryThickness: 10, frameConfirmCount: 4 }
      },
      'suspicious_loitering': {
        name: '可疑人员逗留',
        detectionTypes: ['loitering'],
        sceneType: 'entrance',
        regionHint: '绘制监控重点关注区域',
        expectedParams: { loiterTime: 30, movementThreshold: 12 }
      },
      'baggage_suspect': {
        name: '可疑物品遗留',
        detectionTypes: ['left_object'],
        sceneType: 'public',
        regionHint: '绘制公共区域重点监控范围',
        expectedParams: { detectTime: 20, stabilityThreshold: 0.88 }
      },
      'comprehensive_zone': {
        name: '综合防护区域',
        detectionTypes: ['trespass', 'loitering', 'left_object'],
        sceneType: 'warehouse',
        regionHint: '绘制完整的防护区域',
        expectedParams: {}
      }
    };

    if (scenePreset) {
      const preset = presets[scenePreset];
      if (preset) {
        return res.json({ success: true, data: preset });
      }
      return res.status(404).json({ success: false, error: '预设模板不存在' });
    }

    res.json({ success: true, data: Object.entries(presets).map(([id, p]) => ({ id, ...p })) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/configs', (req, res) => {
  try {
    const { name, config, description } = req.body;
    if (!name || !config) {
      return res.status(400).json({ success: false, error: '缺少必要字段' });
    }
    const saved = configStore.saveConfig({ name, config, description });
    res.json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/configs', (req, res) => {
  try {
    const configs = configStore.getAllConfigs();
    res.json({ success: true, data: configs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/configs/:id', (req, res) => {
  try {
    const config = configStore.getConfig(req.params.id);
    if (!config) {
      return res.status(404).json({ success: false, error: '配置不存在' });
    }
    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/configs/:id', (req, res) => {
  try {
    const deleted = configStore.deleteConfig(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: '配置不存在' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
