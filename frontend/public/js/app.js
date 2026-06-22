const AppState = {
  detectionTypes: [],
  sceneTypes: [],
  selectedDetectionTypes: new Set(),
  currentConfig: null,
  canvas: null,
  hasSynced: false
};

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast toast-${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

async function initApp() {
  await initConfig();

  AppState.canvas = new RegionCanvas('regionCanvas');
  AppState.canvas.onPointAdded = updateGenerateButton;
  AppState.canvas.onRegionCompleted = updateGenerateButton;
  AppState.canvas.onRegionModified = () => {
    updateGenerateButton();
    handleRegionModification();
  };

  bindGlobalEvents();
  await loadInitialData();
  checkBackendConnection();
}

function bindGlobalEvents() {
  document.getElementById('clearRegionBtn').onclick = () => {
    AppState.canvas.clearRegion();
    showToast('已清空检测区域', 'info');
  };

  document.getElementById('undoPointBtn').onclick = () => {
    AppState.canvas.undoLastPoint();
  };

  document.getElementById('generateBtn').onclick = generateParameters;
  document.getElementById('syncBtn').onclick = syncParameters;
  document.getElementById('validateBtn').onclick = validateConfig;
  document.getElementById('resetBtn').onclick = resetAll;
  document.getElementById('saveBtn').onclick = openSaveModal;

  document.getElementById('sceneType').onchange = updateGenerateButton;
  document.getElementById('cameraAngle').onchange = handleEnvChange;
  document.getElementById('lighting').onchange = handleEnvChange;
  document.getElementById('presetTemplate').onchange = applyPreset;
}

async function loadInitialData() {
  const [typesRes, scenesRes, presetsRes] = await Promise.all([
    API.getDetectionTypes(),
    API.getSceneTypes(),
    API.getPresets()
  ]);

  if (typesRes?.success) {
    AppState.detectionTypes = typesRes.data;
    renderDetectionTypes();
  }

  if (scenesRes?.success) {
    AppState.sceneTypes = scenesRes.data;
    renderSceneTypes();
  }

  if (presetsRes?.success) {
    renderPresets(presetsRes.data);
  }
}

function renderSceneTypes() {
  const select = document.getElementById('sceneType');
  AppState.sceneTypes.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = `${s.name} - ${s.description}`;
    select.appendChild(opt);
  });
}

function renderPresets(presets) {
  const select = document.getElementById('presetTemplate');
  presets.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    opt.dataset.types = JSON.stringify(p.detectionTypes);
    opt.dataset.scene = p.sceneType || 'custom';
    opt.dataset.hint = p.regionHint || '';
    select.appendChild(opt);
  });
}

function renderDetectionTypes() {
  const container = document.getElementById('detectionTypesList');
  container.innerHTML = '';

  const iconMap = {
    trespass: '🚧',
    loitering: '⏱️',
    left_object: '📦'
  };

  AppState.detectionTypes.forEach(type => {
    const card = document.createElement('div');
    card.className = 'detection-type-card';
    card.dataset.type = type.id;

    card.innerHTML = `
      <div class="card-header">
        <div class="card-icon card-${type.id}">${iconMap[type.id] || '🔍'}</div>
        <h3>${type.name}</h3>
        <div class="checkbox-custom">${AppState.selectedDetectionTypes.has(type.id) ? '✓' : ''}</div>
      </div>
      <p>${type.description}</p>
      <div class="scenario-tags">
        ${type.typicalScenarios.map(s => `<span class="scenario-tag">${s}</span>`).join('')}
      </div>
    `;

    card.onclick = () => toggleDetectionType(type.id, card);
    container.appendChild(card);
  });
}

function toggleDetectionType(typeId, cardEl) {
  if (AppState.selectedDetectionTypes.has(typeId)) {
    AppState.selectedDetectionTypes.delete(typeId);
    cardEl.classList.remove('selected');
    cardEl.querySelector('.checkbox-custom').textContent = '';
  } else {
    AppState.selectedDetectionTypes.add(typeId);
    cardEl.classList.add('selected');
    cardEl.querySelector('.checkbox-custom').textContent = '✓';
  }
  updateGenerateButton();
  handleDetectionTypeChange();
}

function updateGenerateButton() {
  const btn = document.getElementById('generateBtn');
  const hasValidRegion = AppState.canvas.isValid();
  const hasSelectedTypes = AppState.selectedDetectionTypes.size > 0;
  const hasScene = document.getElementById('sceneType').value !== '';

  btn.disabled = !(hasValidRegion && hasSelectedTypes && hasScene);

  if (!hasValidRegion) {
    btn.innerHTML = '🤖 请先划定检测区域';
  } else if (!hasSelectedTypes) {
    btn.innerHTML = '🤖 请选择异常类型';
  } else if (!hasScene) {
    btn.innerHTML = '🤖 请选择场景类型';
  } else {
    btn.innerHTML = AppState.currentConfig ? '🤖 重新推演识别参数' : '🤖 AI 推演识别参数';
  }
}

async function checkBackendConnection() {
  const statusEl = document.getElementById('connectionStatus');
  const health = await API.checkHealth();

  if (health) {
    statusEl.className = 'status-indicator status-connected';
    statusEl.textContent = `✓ 后端已连接 (端口 ${health.port || 8926})`;
  } else {
    statusEl.className = 'status-indicator status-disconnected';
    statusEl.textContent = '⚠ 后端连接失败';
  }
}

async function generateParameters() {
  if (!canProceed()) return;

  const progress = document.getElementById('progressBar');
  progress.style.display = 'block';

  try {
    const data = getRequestData();
    const result = await API.inferParameters(data);

    if (result.success) {
      AppState.currentConfig = result;
      AppState.hasSynced = true;
      renderParameters(result);
      showToast('AI 参数推演完成！共生成 ' + result.summary.totalParameters + ' 个参数', 'success');
    } else {
      showToast(result.error || '推演失败', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('请求失败：' + err.message, 'error');
  } finally {
    progress.style.display = 'none';
  }
}

async function syncParameters() {
  if (!AppState.currentConfig) {
    showToast('暂无配置可同步', 'error');
    return;
  }
  if (!canProceed()) return;

  try {
    const data = {
      currentConfig: AppState.currentConfig,
      newRegion: AppState.canvas.getRegion(),
      newDetectionTypes: [...AppState.selectedDetectionTypes],
      sceneType: document.getElementById('sceneType').value,
      cameraAngle: document.getElementById('cameraAngle').value,
      lighting: document.getElementById('lighting').value
    };

    const result = await API.syncParameters(data);
    if (result.success) {
      AppState.currentConfig = result;
      renderParameters(result);

      const info = result.syncInfo;
      let msg = '参数同步完成！';
      if (info.addedTypes.length) msg += ` 新增: ${info.addedTypes.join(',')}`;
      if (info.removedTypes.length) msg += ` 移除: ${info.removedTypes.join(',')}`;
      if (info.manuallyPreservedCount) msg += ` 保留 ${info.manuallyPreservedCount} 个手动调整参数`;
      showToast(msg, 'success');
    } else {
      showToast(result.error || '同步失败', 'error');
    }
  } catch (err) {
    showToast('同步失败：' + err.message, 'error');
  }
}

async function validateConfig() {
  if (!AppState.currentConfig) {
    showToast('请先生成配置', 'error');
    return;
  }

  try {
    const result = await API.validateConfig(AppState.currentConfig);
    renderValidation(result);
    if (result.success) {
      showToast(result.valid ? `校验通过！通过率: ${result.summary.passRate}` : `发现 ${result.summary.issueCount} 个问题`, result.valid ? 'success' : 'info');
    }
  } catch (err) {
    showToast('校验失败：' + err.message, 'error');
  }
}

function handleRegionModification() {
  if (AppState.currentConfig && AppState.hasSynced) {
    showToast('检测区域已修改，点击「同步更新」重新适配参数', 'info');
  }
}

function handleDetectionTypeChange() {
  if (AppState.currentConfig && AppState.hasSynced) {
    showToast('检测类型已变更，点击「同步更新」调整参数配置', 'info');
  }
}

function handleEnvChange() {
  if (AppState.currentConfig) {
    showToast('环境参数已变更，建议点击「同步更新」重新适配', 'info');
  }
}

function applyPreset(e) {
  const select = e.target;
  const option = select.options[select.selectedIndex];
  if (!option.value) return;

  try {
    const types = JSON.parse(option.dataset.types || '[]');
    const scene = option.dataset.scene || 'custom';
    const hint = option.dataset.hint;

    AppState.selectedDetectionTypes.clear();
    types.forEach(t => AppState.selectedDetectionTypes.add(t));

    document.getElementById('sceneType').value = scene;

    document.querySelectorAll('.detection-type-card').forEach(card => {
      const typeId = card.dataset.type;
      if (types.includes(typeId)) {
        card.classList.add('selected');
        card.querySelector('.checkbox-custom').textContent = '✓';
      } else {
        card.classList.remove('selected');
        card.querySelector('.checkbox-custom').textContent = '';
      }
    });

    updateGenerateButton();
    if (hint) showToast('模板提示：' + hint, 'info');
    select.value = '';
  } catch (err) {
    console.error(err);
  }
}

function canProceed() {
  if (!AppState.canvas.isValid()) {
    showToast('请先完成检测区域绘制（至少3个点）', 'error');
    return false;
  }
  if (AppState.selectedDetectionTypes.size === 0) {
    showToast('请至少选择一种异常检测类型', 'error');
    return false;
  }
  return true;
}

function getRequestData() {
  return {
    detectionTypes: [...AppState.selectedDetectionTypes],
    region: AppState.canvas.getRegion(),
    sceneType: document.getElementById('sceneType').value,
    cameraAngle: document.getElementById('cameraAngle').value,
    lighting: document.getElementById('lighting').value
  };
}

function renderParameters(result) {
  const section = document.getElementById('parametersSection');
  const content = document.getElementById('parametersContent');
  const summary = document.getElementById('summaryInfo');

  section.style.display = 'block';

  const s = result.summary;
  summary.innerHTML = `
    <div class="summary-stats">
      <div class="summary-stat"><span class="label">检测类型:</span> <span class="value">${s.detectionTypes} 种</span></div>
      <div class="summary-stat"><span class="label">参数总数:</span> <span class="value">${s.totalParameters} 个</span></div>
      <div class="summary-stat"><span class="label">AI自动调整:</span> <span class="value">${s.autoAdjustedCount} 个</span></div>
      <div class="summary-stat"><span class="label">过滤敏感阈值:</span> <span class="value">${s.filteredSensitiveCount} 项</span></div>
    </div>
  `;

  content.innerHTML = '';
  const typeNames = {
    trespass: '🚧 越界检测',
    loitering: '⏱️ 逗留检测',
    left_object: '📦 物品遗留'
  };

  for (const [typeKey, typeData] of Object.entries(result.detectionRules)) {
    const risk = typeData.scenarioAnalysis.falsePositiveEstimate;
    const confidence = typeData.scenarioAnalysis.confidence;

    const sectionEl = document.createElement('div');
    sectionEl.className = 'detection-type-section';

    sectionEl.innerHTML = `
      <div class="detection-type-header">
        <div>
          <h3>${typeNames[typeKey] || typeData.name}</h3>
        </div>
        <div>
          <span class="confidence-badge">置信度 ${Math.round(confidence * 100)}%</span>
          <span class="risk-badge risk-${risk.level}">误报风险: ${risk.level === 'low' ? '低' : risk.level === 'medium' ? '中' : '高'}</span>
        </div>
      </div>
      <div class="parameters-list" id="params-${typeKey}"></div>
    `;

    content.appendChild(sectionEl);

    const listEl = sectionEl.querySelector(`#params-${typeKey}`);
    for (const [paramKey, param] of Object.entries(typeData.parameters)) {
      listEl.appendChild(renderParamCard(typeKey, paramKey, param));
    }
  }
}

function renderParamCard(typeKey, paramKey, param) {
  const card = document.createElement('div');
  const riskTagMap = {
    low: 'risk-tag-low',
    medium: 'risk-tag-medium',
    high: 'risk-tag-high'
  };
  const riskTextMap = { low: '低误报', medium: '中误报', high: '高误报风险' };

  const classes = ['param-card'];
  if (param._autoAdjusted) classes.push('param-auto');
  if (param.recommendedRange && !param._inRecommendedRange) classes.push('param-outofrange');
  card.className = classes.join(' ');

  const displayValue = param.options ? '' : `
    <div class="slider-container">
      <input type="range" id="slider-${typeKey}-${paramKey}"
        min="${param.min}" max="${param.max}" step="${param.step || 1}" value="${param.value}">
      <div style="min-width:80px;text-align:right;font-weight:600;color:#1f2937;">
        ${param.value}${param.unit || ''}
      </div>
    </div>
    <div class="range-labels">
      <span>${param.min}${param.unit || ''}</span>
      <span>${param.max}${param.unit || ''}</span>
    </div>
  `;

  const selectControl = param.options ? `
    <select class="select select-param" id="select-${typeKey}-${paramKey}">
      ${param.options.map(opt => `<option value="${opt}" ${opt === param.value ? 'selected' : ''}>${opt === 'any' ? '任意方向' : opt === 'in' ? '进入' : opt === 'out' ? '离开' : opt === 'bidirectional' ? '双向' : opt}</option>`).join('')}
    </select>
  ` : '';

  card.innerHTML = `
    <div class="param-header">
      <div class="param-info">
        <div class="param-name">
          ${param.label}
          <span class="risk-tag ${riskTagMap[param.falsePositiveRisk] || 'risk-tag-low'}">${riskTextMap[param.falsePositiveRisk] || '低误报'}</span>
          ${param._manualOverridden ? '<span class="manual-badge">手动</span>' : ''}
          ${param._autoAdjusted ? '<span class="manual-badge" style="background:#e0f2fe;color:#0369a1;">AI推演</span>' : ''}
        </div>
        <div class="param-desc">${param.description}</div>
        ${param._adjustmentReason ? `<div class="param-adjustment">💡 ${param._adjustmentReason}</div>` : ''}
        ${param._syncNote ? `<div class="param-adjustment" style="background:#fef3c7;color:#92400e;">🔒 ${param._syncNote}</div>` : ''}
        ${param.recommendedRange ? `<div class="recommended-range">✓ 推荐范围: [${param.recommendedRange.join(' - ')}]${param.unit || ''}</div>` : ''}
        ${param.filteredRanges ? `<div class="sensitive-range">⚠ 已过滤误报区间: ${param.filteredRanges.map(r => `[${r[0]}-${r[1]}]`).join(' ')}</div>` : ''}
      </div>
    </div>
    ${displayValue}
    ${selectControl}
  `;

  setTimeout(() => {
    const slider = document.getElementById(`slider-${typeKey}-${paramKey}`);
    const select = document.getElementById(`select-${typeKey}-${paramKey}`);

    if (slider) {
      slider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        const configType = AppState.currentConfig.detectionRules[typeKey];
        if (configType && configType.parameters[paramKey]) {
          configType.parameters[paramKey].value = value;
          configType.parameters[paramKey]._manualOverridden = true;
          configType.parameters[paramKey]._autoAdjusted = false;
          const nextSibling = e.target.parentElement.nextElementSibling;
          if (nextSibling) {
            const displayEl = e.target.parentElement.children[1];
            if (displayEl) displayEl.textContent = `${value}${configType.parameters[paramKey].unit || ''}`;
          }
          card.classList.remove('param-auto');
        }
      });
    }

    if (select) {
      select.addEventListener('change', (e) => {
        const configType = AppState.currentConfig.detectionRules[typeKey];
        if (configType && configType.parameters[paramKey]) {
          configType.parameters[paramKey].value = e.target.value;
          configType.parameters[paramKey]._manualOverridden = true;
        }
      });
    }
  }, 0);

  return card;
}

function renderValidation(result) {
  const section = document.getElementById('validateSection');
  const content = document.getElementById('validateContent');
  section.style.display = 'block';

  const headerClass = result.valid ? 'validate-pass' : 'validate-fail';
  const issues = [...(result.issues || []).map(i => ({ ...i, kind: 'error' })), ...(result.warnings || []).map(w => ({ ...w, kind: 'warning' }))];

  content.innerHTML = `
    <div class="${headerClass}">
      <h3>${result.valid ? '✅ 配置校验通过' : '⚠️ 配置存在问题需要关注'}</h3>
      <div class="validate-summary">
        <div class="validate-stat">
          <span class="num" style="color:#3b82f6;">${result.summary.totalParams}</span>
          <span class="lbl">参数总数</span>
        </div>
        <div class="validate-stat">
          <span class="num" style="color:#dc2626;">${result.summary.issueCount}</span>
          <span class="lbl">错误</span>
        </div>
        <div class="validate-stat">
          <span class="num" style="color:#f59e0b;">${result.summary.warningCount}</span>
          <span class="lbl">警告</span>
        </div>
      </div>
      <p style="margin-top:10px;font-size:13px;opacity:0.9;">综合通过率: <strong>${result.summary.passRate}</strong></p>
    </div>
    <div class="issue-list">
      ${issues.length === 0 ? '<p style="color:#6b7280;font-size:13px;text-align:center;padding:20px;">🎉 未发现配置问题，可直接部署使用</p>' : ''}
      ${issues.map(issue => `
        <div class="issue-item issue-${issue.kind}">
          <strong>[${issue.kind === 'error' ? '错误' : '警告'}]</strong>
          ${issue.type ? `<strong>${getTypeName(issue.type)}</strong> ` : ''}
          ${issue.message}
        </div>
      `).join('')}
    </div>
  `;
}

function getTypeName(key) {
  return {
    trespass: '越界检测',
    loitering: '逗留检测',
    left_object: '物品遗留'
  }[key] || key;
}

function resetAll() {
  if (!confirm('确定要重置所有配置吗？当前绘制和参数将被清空。')) return;
  AppState.canvas.clearRegion();
  AppState.selectedDetectionTypes.clear();
  AppState.currentConfig = null;
  AppState.hasSynced = false;

  document.getElementById('sceneType').value = 'custom';
  document.getElementById('cameraAngle').value = 'normal';
  document.getElementById('lighting').value = 'normal';
  document.getElementById('presetTemplate').value = '';

  document.querySelectorAll('.detection-type-card').forEach(card => {
    card.classList.remove('selected');
    card.querySelector('.checkbox-custom').textContent = '';
  });

  document.getElementById('parametersSection').style.display = 'none';
  document.getElementById('validateSection').style.display = 'none';
  updateGenerateButton();
  showToast('已重置所有配置', 'info');
}

function openSaveModal() {
  if (!AppState.currentConfig) {
    showToast('请先生成配置', 'error');
    return;
  }
  document.getElementById('saveModal').style.display = 'flex';
  document.getElementById('configName').value = `配置_${new Date().toLocaleDateString('zh-CN')}`;
  document.getElementById('configDesc').value = '';
}

function closeSaveModal() {
  document.getElementById('saveModal').style.display = 'none';
}

async function confirmSave() {
  const name = document.getElementById('configName').value.trim();
  const description = document.getElementById('configDesc').value.trim();

  if (!name) {
    showToast('请输入配置名称', 'error');
    return;
  }

  try {
    const data = {
      name,
      description,
      config: {
        ...AppState.currentConfig,
        _meta: {
          sceneType: document.getElementById('sceneType').value,
          cameraAngle: document.getElementById('cameraAngle').value,
          lighting: document.getElementById('lighting').value,
          region: AppState.canvas.getRegion()
        }
      }
    };

    const result = await API.saveConfig(data);
    if (result.success) {
      closeSaveModal();
      showToast(`配置已保存！ID: ${result.data.id.slice(-8)}`, 'success');
    } else {
      showToast(result.error || '保存失败', 'error');
    }
  } catch (err) {
    showToast('保存失败：' + err.message, 'error');
  }
}

window.closeSaveModal = closeSaveModal;
window.confirmSave = confirmSave;

document.addEventListener('DOMContentLoaded', initApp);
