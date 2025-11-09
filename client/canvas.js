class CanvasManager {
  constructor(canvasId, cursorCanvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d', { 
      willReadFrequently: false,
      alpha: false 
    });
    
    this.cursorCanvas = document.getElementById(cursorCanvasId);
    this.cursorCtx = this.cursorCanvas.getContext('2d', { 
      willReadFrequently: false 
    });
    
    this.isDrawing = false;
    this.currentTool = 'brush';
    this.currentColor = '#000000';
    this.currentLineWidth = 3;
    
    this.currentStroke = {
      id: null,
      points: [],
      type: 'brush',
      color: '#000000',
      lineWidth: 3
    };
    
    this.operations = [];
    this.remoteCursors = new Map();
    this.lastFrameTime = performance.now();
    this.fps = 0;
    
    this.eventBatch = [];
    this.lastBatchTime = Date.now();
    this.BATCH_INTERVAL = 16;
    
    this.initCanvas();
    this.setupEventListeners();
  }
  
  initCanvas() {
    const container = this.canvas.parentElement;
    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
      this.cursorCanvas.width = rect.width;
      this.cursorCanvas.height = rect.height;
      
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.fillStyle = 'white';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      
      if (this.operations.length > 0) {
        this.redrawCanvas();
      }
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }
  
  setupEventListeners() {
    this.canvas.addEventListener('mousedown', this.handleDrawStart.bind(this));
    this.canvas.addEventListener('mousemove', this.handleDrawMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleDrawEnd.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleDrawEnd.bind(this));
    
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.addEventListener('touchend', this.handleDrawEnd.bind(this));
    this.canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  }
  
  getPosition(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    let clientX, clientY;
    
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }
  
  handleDrawStart(e) {
    this.isDrawing = true;
    const pos = this.getPosition(e);
    
    this.currentStroke = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      points: [pos],
      type: this.currentTool,
      color: this.currentColor,
      lineWidth: this.currentLineWidth
    };
    
    if (this.onDrawStart) {
      this.onDrawStart(this.currentStroke);
    }
  }
  
  handleDrawMove(e) {
    const pos = this.getPosition(e);
    
    if (this.onCursorMove) {
      const now = Date.now();
      if (!this.lastCursorUpdate || now - this.lastCursorUpdate > 50) {
        this.onCursorMove(pos);
        this.lastCursorUpdate = now;
      }
    }
    
    if (!this.isDrawing) return;
    
    this.currentStroke.points.push(pos);
    this.drawStroke(this.currentStroke, false);
    this.eventBatch.push(pos);
    
    const now = Date.now();
    if (now - this.lastBatchTime >= this.BATCH_INTERVAL) {
      this.flushEventBatch();
    }
  }
  
  flushEventBatch() {
    if (this.eventBatch.length === 0) return;
    
    if (this.onDrawMove) {
      this.onDrawMove({
        id: this.currentStroke.id,
        points: this.eventBatch
      });
    }
    
    this.eventBatch = [];
    this.lastBatchTime = Date.now();
  }
  
  handleDrawEnd(e) {
    if (!this.isDrawing) return;
    
    this.isDrawing = false;
    this.flushEventBatch();
    
    if (this.onDrawEnd) {
      this.onDrawEnd(this.currentStroke);
    }
    
    this.operations.push({ ...this.currentStroke });
    this.currentStroke = {
      id: null,
      points: [],
      type: this.currentTool,
      color: this.currentColor,
      lineWidth: this.currentLineWidth
    };
  }
  
  handleTouchStart(e) {
    e.preventDefault();
    this.handleDrawStart(e);
  }
  
  handleTouchMove(e) {
    e.preventDefault();
    this.handleDrawMove(e);
  }
  
  drawStroke(stroke, complete = true) {
    if (!stroke.points || stroke.points.length === 0) return;
    
    const ctx = this.ctx;
    ctx.globalCompositeOperation = 'source-over';
    if (stroke.type === 'eraser') {
      ctx.strokeStyle = '#ffffff';
      ctx.fillStyle = '#ffffff';
    } else {
      ctx.strokeStyle = stroke.color;
      ctx.fillStyle = stroke.color;
    }
    
    ctx.lineWidth = stroke.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    
    if (stroke.points.length === 1) {
      const p = stroke.points[0];
      ctx.arc(p.x, p.y, stroke.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        const xc = (stroke.points[i].x + stroke.points[i - 1].x) / 2;
        const yc = (stroke.points[i].y + stroke.points[i - 1].y) / 2;
        ctx.quadraticCurveTo(stroke.points[i - 1].x, stroke.points[i - 1].y, xc, yc);
      }
      
      const lastPoint = stroke.points[stroke.points.length - 1];
      ctx.lineTo(lastPoint.x, lastPoint.y);
      ctx.stroke();
    }
    
    ctx.restore();
  }
  
  redrawCanvas() {
    this.ctx.fillStyle = 'white';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    for (const operation of this.operations) {
      this.drawStroke(operation, true);
    }
    
    this.updateFPS();
  }
  
  addRemoteOperation(operation) {
    this.operations.push(operation);
    this.drawStroke(operation, true);
  }
  
  removeLastOperation() {
    if (this.operations.length > 0) {
      this.operations.pop();
      this.redrawCanvas();
    }
  }
  
  setOperations(operations) {
    this.operations = operations;
    this.redrawCanvas();
  }
  
  clearCanvas() {
    this.operations = [];
    this.redrawCanvas();
  }
  
  updateRemoteCursor(userId, userName, userColor, x, y) {
    this.remoteCursors.set(userId, {
      userName,
      userColor,
      x,
      y,
      lastUpdate: Date.now()
    });
    
    this.drawRemoteCursors();
  }
  
  removeRemoteCursor(userId) {
    this.remoteCursors.delete(userId);
    this.drawRemoteCursors();
  }
  
  drawRemoteCursors() {
    const ctx = this.cursorCtx;
    ctx.clearRect(0, 0, this.cursorCanvas.width, this.cursorCanvas.height);
    for (const [userId, cursor] of this.remoteCursors) {
      if (Date.now() - cursor.lastUpdate > 5000) {
        this.remoteCursors.delete(userId);
        continue;
      }
      
      ctx.save();
      ctx.fillStyle = cursor.userColor;
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      
      ctx.beginPath();
      ctx.arc(cursor.x, cursor.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(cursor.x + 10, cursor.y + 10, ctx.measureText(cursor.userName).width + 10, 20);
      
      ctx.fillStyle = 'white';
      ctx.font = '12px sans-serif';
      ctx.fillText(cursor.userName, cursor.x + 15, cursor.y + 24);
      
      ctx.restore();
    }
  }
  
  updateFPS() {
    const now = performance.now();
    const delta = now - this.lastFrameTime;
    this.fps = Math.round(1000 / delta);
    this.lastFrameTime = now;
  }
  
  getFPS() {
    return this.fps;
  }
  
  setTool(tool) {
    this.currentTool = tool;
  }
  
  setColor(color) {
    this.currentColor = color;
  }
  
  setLineWidth(width) {
    this.currentLineWidth = width;
  }
}

