class RuleInferenceEngine {
  constructor() {
    this.scenarioProfiles = {
      perimeter: {
        name: '周界防护',
        typicalAreas: ['围墙周边', '出入口', '禁区边界'],
        areaSizeFactor: 1.2,
        crowdDensity: 'low'
      },
      entrance: {
        name: '出入口监控',
        typicalAreas: ['大门', '通道', '安检口'],
        areaSizeFactor: 0.8,
        crowdDensity: 'medium'
      },
      warehouse: {
        name: '仓储区域',
        typicalAreas: ['货架通道', '堆放区', '装卸区'],
        areaSizeFactor: 1.5,
        crowdDensity: 'low'
      },
      public: {
        name: '公共场所',
        typicalAreas: ['广场', '大厅', '候车区'],
        areaSizeFactor: 1.0,
        crowdDensity: 'high'
      },
      corridor: {
        name: '走廊通道',
        typicalAreas: ['楼道', '走廊', '过道'],
        areaSizeFactor: 0.6,
        crowdDensity: 'medium'
      },
      custom: {
        name: '自定义场景',
        typicalAreas: [],
        areaSizeFactor: 1.0,
        crowdDensity: 'medium'
      }
    };

    this.detectionTypes = {
      trespass: {
        name: '越界检测',
        description: '检测目标进入禁止区域的行为',
        parameters: this.generateTrespassParams()
      },
      loitering: {
        name: '逗留检测',
        description: '检测目标在区域内长时间停留的行为',
        parameters: this.generateLoiteringParams()
      },
      left_object: {
        name: '物品遗留',
        description: '检测被遗弃或遗留的物品',
        parameters: this.generateLeftObjectParams()
      }
    };
  }

  generateTrespassParams() {
    return {
      sensitivity: {
        value: 0.7,
        min: 0.3,
        max: 0.95,
        step: 0.05,
        label: '检测灵敏度',
        description: '越界行为的检测敏感度，越高越容易触发报警',
        falsePositiveRisk: 'medium',
        recommendedRange: [0.6, 0.8]
      },
      minObjectSize: {
        value: 400,
        min: 100,
        max: 5000,
        step: 50,
        unit: 'px²',
        label: '最小目标尺寸',
        description: '过滤过小的目标，减少噪点误报',
        falsePositiveRisk: 'low',
        recommendedRange: [300, 800]
      },
      maxObjectSize: {
        value: 80000,
        min: 5000,
        max: 500000,
        step: 1000,
        unit: 'px²',
        label: '最大目标尺寸',
        description: '过滤过大的目标，排除背景干扰',
        falsePositiveRisk: 'low',
        recommendedRange: [50000, 120000]
      },
      crossDirection: {
        value: 'any',
        options: ['any', 'in', 'out', 'bidirectional'],
        label: '越界方向',
        description: '指定越界的方向约束',
        falsePositiveRisk: 'low',
        recommendedRange: ['any', 'bidirectional']
      },
      boundaryThickness: {
        value: 8,
        min: 2,
        max: 30,
        step: 1,
        unit: 'px',
        label: '边界厚度',
        description: '越界判定的容差带宽度，减少边界抖动误报',
        falsePositiveRisk: 'high',
        recommendedRange: [6, 12],
        filteredRanges: [[1, 3], [25, 30]]
      },
      frameConfirmCount: {
        value: 3,
        min: 1,
        max: 10,
        step: 1,
        unit: '帧',
        label: '连续确认帧数',
        description: '连续多少帧检测到越界才触发，过滤瞬态干扰',
        falsePositiveRisk: 'high',
        recommendedRange: [2, 5],
        filteredRanges: [[1, 1], [8, 10]]
      },
      intrusionDepth: {
        value: 20,
        min: 5,
        max: 100,
        step: 5,
        unit: 'px',
        label: '侵入深度阈值',
        description: '目标进入区域多少深度才判定为越界',
        falsePositiveRisk: 'high',
        recommendedRange: [15, 35],
        filteredRanges: [[5, 8], [80, 100]]
      }
    };
  }

  generateLoiteringParams() {
    return {
      loiterTime: {
        value: 30,
        min: 5,
        max: 600,
        step: 5,
        unit: '秒',
        label: '逗留判定时间',
        description: '目标停留超过该时间判定为逗留',
        falsePositiveRisk: 'high',
        recommendedRange: [20, 60],
        filteredRanges: [[5, 10], [300, 600]]
      },
      minStayArea: {
        value: 500,
        min: 200,
        max: 10000,
        step: 100,
        unit: 'px²',
        label: '最小活动范围',
        description: '目标活动范围小于该值才判定为逗留',
        falsePositiveRisk: 'medium',
        recommendedRange: [400, 1500]
      },
      sensitivity: {
        value: 0.65,
        min: 0.3,
        max: 0.95,
        step: 0.05,
        label: '检测灵敏度',
        description: '逗留行为的检测敏感度',
        falsePositiveRisk: 'medium',
        recommendedRange: [0.55, 0.75]
      },
      minObjectSize: {
        value: 500,
        min: 100,
        max: 10000,
        step: 50,
        unit: 'px²',
        label: '最小目标尺寸',
        description: '过滤过小的目标',
        falsePositiveRisk: 'low',
        recommendedRange: [400, 1000]
      },
      maxObjectSize: {
        value: 100000,
        min: 10000,
        max: 500000,
        step: 1000,
        unit: 'px²',
        label: '最大目标尺寸',
        description: '过滤过大的目标',
        falsePositiveRisk: 'low',
        recommendedRange: [60000, 150000]
      },
      movementThreshold: {
        value: 15,
        min: 5,
        max: 100,
        step: 5,
        unit: 'px/秒',
        label: '移动速度阈值',
        description: '目标速度低于该值视为可能逗留',
        falsePositiveRisk: 'high',
        recommendedRange: [10, 25],
        filteredRanges: [[5, 7], [70, 100]]
      },
      frameSampleWindow: {
        value: 30,
        min: 10,
        max: 120,
        step: 5,
        unit: '帧',
        label: '采样窗口大小',
        description: '用于计算活动范围的时间窗口',
        falsePositiveRisk: 'medium',
        recommendedRange: [20, 50]
      }
    };
  }

  generateLeftObjectParams() {
    return {
      detectTime: {
        value: 15,
        min: 3,
        max: 300,
        step: 3,
        unit: '秒',
        label: '物品判定时间',
        description: '物品静止超过该时间判定为遗留',
        falsePositiveRisk: 'high',
        recommendedRange: [10, 30],
        filteredRanges: [[3, 5], [180, 300]]
      },
      minObjectArea: {
        value: 300,
        min: 100,
        max: 5000,
        step: 50,
        unit: 'px²',
        label: '最小物品面积',
        description: '过滤过小的物品，减少噪点',
        falsePositiveRisk: 'low',
        recommendedRange: [200, 600]
      },
      maxObjectArea: {
        value: 30000,
        min: 2000,
        max: 200000,
        step: 500,
        unit: 'px²',
        label: '最大物品面积',
        description: '过滤过大的物品，排除背景变化',
        falsePositiveRisk: 'low',
        recommendedRange: [15000, 50000]
      },
      stabilityThreshold: {
        value: 0.85,
        min: 0.5,
        max: 0.99,
        step: 0.01,
        label: '稳定性阈值',
        description: '物品外观稳定度超过该值判定为静止',
        falsePositiveRisk: 'high',
        recommendedRange: [0.8, 0.92],
        filteredRanges: [[0.5, 0.6], [0.97, 0.99]]
      },
      aspectRatioMin: {
        value: 0.2,
        min: 0.1,
        max: 1.0,
        step: 0.05,
        label: '最小长宽比',
        description: '过滤极端形状的目标',
        falsePositiveRisk: 'medium',
        recommendedRange: [0.15, 0.4]
      },
      aspectRatioMax: {
        value: 5.0,
        min: 1.0,
        max: 15.0,
        step: 0.5,
        label: '最大长宽比',
        description: '过滤极端形状的目标',
        falsePositiveRisk: 'medium',
        recommendedRange: [3.0, 8.0]
      },
      historicalMatch: {
        value: 0.7,
        min: 0.4,
        max: 0.95,
        step: 0.05,
        label: '历史匹配度',
        description: '与历史背景的差异度，排除场景固有物品',
        falsePositiveRisk: 'high',
        recommendedRange: [0.6, 0.8],
        filteredRanges: [[0.4, 0.45], [0.9, 0.95]]
      }
    };
  }

  analyzeScenario(regionData) {
    const { points, sceneType = 'custom', cameraAngle = 'normal', lighting = 'normal' } = regionData;
    const width = Math.max(...points.map(p => p.x)) - Math.min(...points.map(p => p.x));
    const height = Math.max(...points.map(p => p.y)) - Math.min(...points.map(p => p.y));
    const area = width * height;
    const aspectRatio = height > 0 ? width / height : 1;
    const polygonPoints = points.length;

    const features = {
      area,
      aspectRatio,
      width,
      height,
      polygonPoints,
      sceneType,
      cameraAngle,
      lighting,
      complexity: this.calculateRegionComplexity(points),
      isLinear: this.isLinearRegion(points),
      isEnclosed: this.isEnclosedRegion(points)
    };

    return features;
  }

  calculateRegionComplexity(points) {
    if (points.length < 3) return 0;
    let totalAngle = 0;
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      const p3 = points[(i + 2) % points.length];
      const angle = this.calculateAngle(p1, p2, p3);
      totalAngle += Math.abs(angle);
    }
    return Math.min(1, totalAngle / (Math.PI * 2));
  }

  calculateAngle(p1, p2, p3) {
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
    if (mag1 === 0 || mag2 === 0) return 0;
    return Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2))));
  }

  isLinearRegion(points) {
    if (points.length < 3) return false;
    const width = Math.max(...points.map(p => p.x)) - Math.min(...points.map(p => p.x));
    const height = Math.max(...points.map(p => p.y)) - Math.min(...points.map(p => p.y));
    const ratio = Math.min(width, height) / Math.max(width, height);
    return ratio < 0.25;
  }

  isEnclosedRegion(points) {
    return points.length >= 4;
  }

  inferParameters(detectionTypes, regionData) {
    const scenarioFeatures = this.analyzeScenario(regionData);
    const sceneProfile = this.scenarioProfiles[scenarioFeatures.sceneType] || this.scenarioProfiles.custom;

    const results = {};

    for (const detectionType of detectionTypes) {
      const typeConfig = this.detectionTypes[detectionType];
      if (!typeConfig) continue;

      const parameters = JSON.parse(JSON.stringify(typeConfig.parameters));
      const adjustments = this.computeAdjustments(detectionType, scenarioFeatures, sceneProfile);

      for (const [paramKey, paramValue] of Object.entries(parameters)) {
        const adjustment = adjustments[paramKey];
        if (adjustment !== undefined) {
          paramValue.value = this.applyAdjustment(paramValue, adjustment);
          paramValue._autoAdjusted = true;
          paramValue._adjustmentReason = adjustment.reason;
        }

        if (paramValue.filteredRanges) {
          paramValue.value = this.filterSensitiveRange(paramValue);
        }

        if (paramValue.recommendedRange) {
          paramValue._inRecommendedRange = this.isInRange(paramValue.value, paramValue.recommendedRange);
        }
      }

      results[detectionType] = {
        name: typeConfig.name,
        description: typeConfig.description,
        parameters,
        scenarioAnalysis: {
          features: scenarioFeatures,
          profile: sceneProfile.name,
          falsePositiveEstimate: this.estimateFalsePositiveRisk(detectionType, scenarioFeatures, parameters),
          confidence: adjustments.confidence || 0.75
        },
        _generatedAt: new Date().toISOString()
      };
    }

    return {
      success: true,
      detectionRules: results,
      summary: {
        detectionTypes: detectionTypes.length,
        totalParameters: Object.values(results).reduce((sum, r) => sum + Object.keys(r.parameters).length, 0),
        autoAdjustedCount: Object.values(results).reduce((sum, r) =>
          sum + Object.values(r.parameters).filter(p => p._autoAdjusted).length, 0),
        filteredSensitiveCount: Object.values(results).reduce((sum, r) =>
          sum + Object.values(r.parameters).filter(p => p.filteredRanges).length, 0)
      }
    };
  }

  computeAdjustments(detectionType, features, profile) {
    const adjustments = { confidence: 0.75 };
    const areaFactor = features.area / 1000000;

    switch (detectionType) {
      case 'trespass':
        adjustments.sensitivity = {
          factor: features.lighting === 'low' ? 1.15 : features.lighting === 'high' ? 0.9 : 1.0,
          reason: features.lighting === 'low' ? '低光照环境，提升灵敏度补偿' : '正常光照，使用标准灵敏度'
        };

        if (features.isLinear) {
          adjustments.boundaryThickness = { value: Math.max(4, features.width > features.height ? features.height * 0.08 : features.width * 0.08), reason: '线性区域（围栏/边界），根据区域短边动态设置边界厚度' };
          adjustments.intrusionDepth = { value: Math.max(10, Math.min(features.width, features.height) * 0.12), reason: '线性区域，侵入深度设为区域短边的12%' };
          adjustments.confidence = 0.88;
        }

        if (features.cameraAngle === 'topdown') {
          adjustments.crossDirection = { value: 'any', reason: '俯视角度，无明确方向性，启用任意方向检测' };
        }

        adjustments.minObjectSize = { factor: Math.max(0.8, Math.min(1.4, profile.areaSizeFactor / Math.sqrt(areaFactor || 1))), reason: `根据场景面积系数(${profile.areaSizeFactor})调整目标尺寸阈值` };

        if (features.complexity > 0.6) {
          adjustments.frameConfirmCount = { value: 5, reason: '区域形状复杂，增加确认帧数减少误报' };
          adjustments.confidence = 0.7;
        } else {
          adjustments.frameConfirmCount = { value: 3, reason: '区域形状规则，使用标准确认帧数' };
        }
        break;

      case 'loitering':
        if (profile.crowdDensity === 'high') {
          adjustments.loiterTime = { value: 45, reason: '高密度人群场景，延长逗留判定时间避免误报' };
          adjustments.movementThreshold = { factor: 1.3, reason: '高密度场景，提升移动阈值过滤人体轻微晃动' };
          adjustments.confidence = 0.72;
        } else if (profile.crowdDensity === 'low') {
          adjustments.loiterTime = { value: 20, reason: '低密度场景，缩短逗留判定时间提高响应速度' };
          adjustments.confidence = 0.85;
        } else {
          adjustments.loiterTime = { value: 30, reason: '中等密度场景，使用标准逗留时间' };
          adjustments.confidence = 0.8;
        }

        if (features.aspectRatio > 3 || features.aspectRatio < 0.33) {
          adjustments.minStayArea = { factor: 0.8, reason: '狭长区域，缩小活动范围判定阈值' };
        }

        adjustments.frameSampleWindow = { value: Math.max(20, Math.min(60, Math.floor(adjustments.loiterTime?.value * 1.5) || 45)), reason: '采样窗口设为逗留时间的1.5倍' };
        break;

      case 'left_object':
        if (profile.crowdDensity === 'high') {
          adjustments.detectTime = { value: 25, reason: '人流密集场景，延长判定时间过滤遮挡导致的误报' };
          adjustments.stabilityThreshold = { value: 0.9, reason: '密集场景，提高稳定性阈值要求' };
          adjustments.confidence = 0.68;
        } else {
          adjustments.detectTime = { value: 15, reason: '非密集场景，使用标准判定时间' };
          adjustments.confidence = 0.82;
        }

        if (features.lighting === 'low') {
          adjustments.stabilityThreshold = { factor: 0.92, reason: '低光照环境，降低稳定性阈值适应图像噪点' };
        }

        adjustments.historicalMatch = { value: features.isEnclosed ? 0.75 : 0.65, reason: features.isEnclosed ? '封闭区域，提高历史匹配要求排除常置物品' : '开放区域，降低历史匹配要求' };
        break;
    }

    return adjustments;
  }

  applyAdjustment(param, adjustment) {
    if (adjustment.value !== undefined) {
      let value = adjustment.value;
      if (param.options) {
        return param.options.includes(value) ? value : (param.value);
      }
      if (param.min !== undefined) value = Math.max(param.min, value);
      if (param.max !== undefined) value = Math.min(param.max, value);
      if (param.step) {
        value = Math.round(value / param.step) * param.step;
      }
      return value;
    }
    if (adjustment.factor !== undefined) {
      let value = param.value * adjustment.factor;
      if (param.min !== undefined) value = Math.max(param.min, value);
      if (param.max !== undefined) value = Math.min(param.max, value);
      if (param.step) {
        value = Math.round(value / param.step) * param.step;
      }
      return value;
    }
    return param.value;
  }

  filterSensitiveRange(param) {
    let value = param.value;
    if (!param.filteredRanges) return value;

    for (const [min, max] of param.filteredRanges) {
      if (value >= min && value <= max) {
        const distanceToLower = value - min;
        const distanceToUpper = max - value;
        if (distanceToLower < distanceToUpper) {
          value = param.step ? Math.ceil(min / param.step) * param.step - param.step : min;
          if (value < param.min) value = param.step ? Math.floor(max / param.step) * param.step + param.step : max;
        } else {
          value = param.step ? Math.floor(max / param.step) * param.step + param.step : max;
          if (value > param.max) value = param.step ? Math.ceil(min / param.step) * param.step - param.step : min;
        }
      }
    }
    return Math.max(param.min, Math.min(param.max, value));
  }

  isInRange(value, range) {
    if (!range || range.length !== 2) return true;
    return value >= range[0] && value <= range[1];
  }

  estimateFalsePositiveRisk(detectionType, features, parameters) {
    let risk = 'medium';
    let score = 0.5;

    const highRiskParams = Object.values(parameters).filter(p => p.falsePositiveRisk === 'high');
    const outOfRange = highRiskParams.filter(p => p.recommendedRange && !p._inRecommendedRange).length;

    score += outOfRange * 0.1;

    if (features.lighting === 'low') score += 0.1;
    if (features.complexity > 0.7) score += 0.1;

    score = Math.min(1, Math.max(0, score));

    if (score < 0.4) risk = 'low';
    else if (score > 0.65) risk = 'high';

    return {
      level: risk,
      score: score,
      outOfRangeParams: outOfRange,
      suggestion: risk === 'high'
        ? '当前配置误报风险较高，建议调整灵敏度或确认帧数'
        : risk === 'medium'
          ? '配置合理，可根据现场实际情况微调参数'
          : '配置优，误报风险低'
    };
  }

  syncParameters(currentConfig, newRegionData, newDetectionTypes) {
    const previousTypes = Object.keys(currentConfig.detectionRules || {});
    const addedTypes = newDetectionTypes.filter(t => !previousTypes.includes(t));
    const removedTypes = previousTypes.filter(t => !newDetectionTypes.includes(t));
    const retainedTypes = newDetectionTypes.filter(t => previousTypes.includes(t));

    const freshResult = this.inferParameters(newDetectionTypes, newRegionData);

    for (const type of retainedTypes) {
      if (currentConfig.detectionRules[type]) {
        const currentParams = currentConfig.detectionRules[type].parameters;
        const freshParams = freshResult.detectionRules[type].parameters;

        for (const [key, param] of Object.entries(freshParams)) {
          if (currentParams[key] && !currentParams[key]._manualOverridden) {
            param._autoAdjusted = true;
          } else if (currentParams[key] && currentParams[key]._manualOverridden) {
            freshResult.detectionRules[type].parameters[key] = { ...currentParams[key] };
            freshResult.detectionRules[type].parameters[key]._synced = true;
            freshResult.detectionRules[type].parameters[key]._syncNote = '参数已手动调整，保留用户设置';
          }
        }
      }
    }

    return {
      ...freshResult,
      syncInfo: {
        addedTypes,
        removedTypes,
        retainedTypes,
        manuallyPreservedCount: retainedTypes.reduce((sum, type) => {
          if (!currentConfig.detectionRules[type]) return sum;
          return sum + Object.values(currentConfig.detectionRules[type].parameters).filter(p => p._manualOverridden).length;
        }, 0)
      }
    };
  }
}

module.exports = RuleInferenceEngine;
