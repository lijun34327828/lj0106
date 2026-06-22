class RegionCanvas {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.points = [];
    this.isDrawing = true;
    this.isCompleted = false;
    this.draggedPointIndex = -1;
    this.hoverPointIndex = -1;
    this.init();
  }

  init() {
    this.setupBackground();
    this.bindEvents();
    this.render();
  }

  setupBackground() {
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.lineWidth = 1;
    for (let x = 0; x <= this.canvas.width; x += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }
    for (let y = 0; y <= this.canvas.height; y += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.font = '14px monospace';
    this.ctx.fillText('模拟画面预览区域', 20, 30);
    this.ctx.font = '11px monospace';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.fillText(`${this.canvas.width} x ${this.canvas.height}`, this.canvas.width - 100, 30);

    this.drawMockScene();
  }

  drawMockScene() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(74, 124, 89, 0.3)';
    ctx.fillRect(0, this.canvas.height - 80, this.canvas.width, 80);

    ctx.fillStyle = 'rgba(139, 119, 101, 0.25)';
    ctx.beginPath();
    ctx.moveTo(100, this.canvas.height - 80);
    ctx.lineTo(200, 280);
    ctx.lineTo(400, 280);
    ctx.lineTo(500, this.canvas.height - 80);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(200, 200, 220, 0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(50, 200);
    ctx.lineTo(this.canvas.width - 50, 200);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  bindEvents() {
    const rect = () => this.canvas.getBoundingClientRect();
    const scaleX = () => this.canvas.width / rect().width;
    const scaleY = () => this.canvas.height / rect().height;

    const getCoords = (e) => {
      const r = rect();
      return {
        x: (e.clientX - r.left) * scaleX(),
        y: (e.clientY - r.top) * scaleY()
      };
    };

    this.canvas.addEventListener('click', (e) => {
      if (!this.isDrawing) return;
      const coords = getCoords(e);
      const hitIndex = this.hitTest(coords.x, coords.y);

      if (this.points.length >= 3 && hitIndex === 0) {
        this.completeDrawing();
        return;
      }

      if (hitIndex === -1 || this.points.length < 3) {
        this.addPoint(coords.x, coords.y);
      }
    });

    this.canvas.addEventListener('dblclick', (e) => {
      if (this.isDrawing && this.points.length >= 3) {
        this.completeDrawing();
      }
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const coords = getCoords(e);
      this.hoverPointIndex = this.hitTest(coords.x, coords.y);

      if (this.draggedPointIndex >= 0) {
        this.points[this.draggedPointIndex] = coords;
        this.updateRegionInfo();
      }

      this.canvas.style.cursor = this.hoverPointIndex >= 0 ? 'grab' :
        (this.isCompleted ? 'default' : 'crosshair');
      this.render();
    });

    this.canvas.addEventListener('mousedown', (e) => {
      const coords = getCoords(e);
      const hitIndex = this.hitTest(coords.x, coords.y);
      if (this.isCompleted && hitIndex >= 0) {
        this.draggedPointIndex = hitIndex;
        this.canvas.style.cursor = 'grabbing';
      }
    });

    this.canvas.addEventListener('mouseup', () => {
      if (this.draggedPointIndex >= 0) {
        this.draggedPointIndex = -1;
        this.onRegionModified && this.onRegionModified();
      }
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.hoverPointIndex = -1;
      this.draggedPointIndex = -1;
      this.render();
    });
  }

  hitTest(x, y) {
    for (let i = 0; i < this.points.length; i++) {
      const dx = x - this.points[i].x;
      const dy = y - this.points[i].y;
      if (dx * dx + dy * dy <= 100) {
        return i;
      }
    }
    return -1;
  }

  addPoint(x, y) {
    this.points.push({ x, y });
    this.updateRegionInfo();
    this.render();
    this.onPointAdded && this.onPointAdded();
  }

  undoLastPoint() {
    if (this.points.length > 0) {
      this.points.pop();
      this.isCompleted = false;
      this.isDrawing = true;
      this.updateRegionInfo();
      this.render();
      this.onRegionModified && this.onRegionModified();
    }
  }

  clearRegion() {
    this.points = [];
    this.isDrawing = true;
    this.isCompleted = false;
    this.updateRegionInfo();
    this.render();
    this.onRegionModified && this.onRegionModified();
  }

  completeDrawing() {
    if (this.points.length >= 3) {
      this.isDrawing = false;
      this.isCompleted = true;
      this.updateRegionInfo();
      this.render();
      this.onRegionCompleted && this.onRegionCompleted();
    }
  }

  resumeEditing() {
    this.isDrawing = true;
    this.isCompleted = false;
    this.render();
  }

  updateRegionInfo() {
    const el = document.getElementById('regionInfo');
    if (!el) return;

    if (this.points.length === 0) {
      el.textContent = '';
      return;
    }

    const minX = Math.min(...this.points.map(p => p.x));
    const maxX = Math.max(...this.points.map(p => p.x));
    const minY = Math.min(...this.points.map(p => p.y));
    const maxY = Math.max(...this.points.map(p => p.y));
    const w = Math.round(maxX - minX);
    const h = Math.round(maxY - minY);
    const area = this.calculateArea();

    el.innerHTML = `点数: ${this.points.length} | 尺寸: ${w}×${h}px | 面积: ${area.toLocaleString()}px² | ${this.isCompleted ? '✓ 已闭合' : '绘制中...'}`;
  }

  calculateArea() {
    if (this.points.length < 3) return 0;
    let area = 0;
    for (let i = 0; i < this.points.length; i++) {
      const j = (i + 1) % this.points.length;
      area += this.points[i].x * this.points[j].y;
      area -= this.points[j].x * this.points[i].y;
    }
    return Math.abs(Math.round(area / 2));
  }

  getRegion() {
    return {
      points: [...this.points],
      isCompleted: this.isCompleted,
      area: this.calculateArea()
    };
  }

  isValid() {
    return this.isCompleted && this.points.length >= 3;
  }

  render() {
    this.setupBackground();

    if (this.points.length > 0) {
      this.ctx.save();

      if (this.points.length >= 3) {
        this.ctx.beginPath();
        this.ctx.moveTo(this.points[0].x, this.points[0].y);
        for (let i = 1; i < this.points.length; i++) {
          this.ctx.lineTo(this.points[i].x, this.points[i].y);
        }
        if (this.isCompleted) this.ctx.closePath();

        this.ctx.fillStyle = this.isCompleted
          ? 'rgba(59, 130, 246, 0.18)'
          : 'rgba(59, 130, 246, 0.1)';
        this.ctx.fill();
      }

      this.ctx.beginPath();
      this.ctx.moveTo(this.points[0].x, this.points[0].y);
      for (let i = 1; i < this.points.length; i++) {
        this.ctx.lineTo(this.points[i].x, this.points[i].y);
      }
      if (this.isCompleted) this.ctx.closePath();

      this.ctx.strokeStyle = this.isCompleted ? '#3b82f6' : '#93c5fd';
      this.ctx.lineWidth = 2.5;
      this.ctx.setLineDash(this.isCompleted ? [] : [8, 4]);
      this.ctx.stroke();
      this.ctx.setLineDash([]);

      this.points.forEach((p, i) => {
        const isFirst = i === 0;
        const isHover = i === this.hoverPointIndex;
        const isDragging = i === this.draggedPointIndex;

        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, isHover || isDragging ? 9 : 7, 0, Math.PI * 2);
        this.ctx.fillStyle = isFirst && this.points.length >= 3 && !this.isCompleted
          ? '#10b981'
          : isDragging ? '#ef4444' : isHover ? '#f59e0b' : '#ffffff';
        this.ctx.fill();
        this.ctx.strokeStyle = isFirst && this.points.length >= 3 ? '#10b981' : '#3b82f6';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        this.ctx.fillStyle = '#1f2937';
        this.ctx.font = 'bold 10px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(String(i + 1), p.x, p.y);
      });

      this.ctx.restore();
    }
  }
}
