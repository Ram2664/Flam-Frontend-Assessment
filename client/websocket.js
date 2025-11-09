class WebSocketManager {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.userId = null;
    this.userName = null;
    this.userColor = null;
    this.latency = 0;
    this.lastPingTime = 0;
    
    this.eventHandlers = {
      onInit: null,
      onUserJoined: null,
      onUserLeft: null,
      onUsersUpdate: null,
      onDrawStart: null,
      onDrawMove: null,
      onDrawEnd: null,
      onCursorMove: null,
      onUndo: null,
      onRedo: null,
      onClearCanvas: null,
      onConnectionChange: null
    };
    
    this.remoteStrokes = new Map();
  }
  
  connect(url = '') {
    try {
      this.socket = io(url, {
        query: {
          roomId: window.currentRoomId || 'default',
          userName: window.currentUserName || 'Anonymous'
        }
      });
      this.setupEventListeners();
      console.log('Connecting to server...');
    } catch (error) {
      console.error('Failed to connect:', error);
      this.updateConnectionStatus(false);
    }
  }
  
  setupEventListeners() {
    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.connected = true;
      this.updateConnectionStatus(true);
      this.startLatencyTracking();
    });
    
    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.connected = false;
      this.updateConnectionStatus(false);
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.connected = false;
      this.updateConnectionStatus(false);
    });
    
    this.socket.on('init', (data) => {
      console.log('Initialized:', data);
      this.userId = data.userId;
      this.userName = data.userName;
      this.userColor = data.userColor;
      
      if (this.eventHandlers.onInit) {
        this.eventHandlers.onInit(data);
      }
    });
    
    this.socket.on('user-joined', (data) => {
      console.log('User joined:', data);
      if (this.eventHandlers.onUserJoined) {
        this.eventHandlers.onUserJoined(data);
      }
    });
    
    this.socket.on('user-left', (data) => {
      console.log('User left:', data);
      if (this.eventHandlers.onUserLeft) {
        this.eventHandlers.onUserLeft(data);
      }
    });
    
    this.socket.on('users-update', (users) => {
      if (this.eventHandlers.onUsersUpdate) {
        this.eventHandlers.onUsersUpdate(users);
      }
    });
    
    this.socket.on('draw-start', (data) => {
      this.remoteStrokes.set(data.userId, {
        id: data.id,
        points: [{ x: data.x, y: data.y }],
        type: data.type,
        color: data.color,
        lineWidth: data.lineWidth
      });
      
      if (this.eventHandlers.onDrawStart) {
        this.eventHandlers.onDrawStart(data);
      }
    });
    
    this.socket.on('draw-move', (data) => {
      const stroke = this.remoteStrokes.get(data.userId);
      if (stroke && data.points) {
        stroke.points.push(...data.points);
        
        if (this.eventHandlers.onDrawMove) {
          this.eventHandlers.onDrawMove({
            userId: data.userId,
            stroke: stroke
          });
        }
      }
    });
    
    this.socket.on('draw-end', (data) => {
      this.remoteStrokes.delete(data.userId);
      
      if (this.eventHandlers.onDrawEnd) {
        this.eventHandlers.onDrawEnd(data);
      }
    });
    
    this.socket.on('cursor-move', (data) => {
      if (this.eventHandlers.onCursorMove) {
        this.eventHandlers.onCursorMove(data);
      }
    });
    
    this.socket.on('undo', (data) => {
      console.log('Undo performed by:', data.performedByName);
      if (this.eventHandlers.onUndo) {
        this.eventHandlers.onUndo(data);
      }
    });
    
    this.socket.on('redo', (data) => {
      console.log('Redo performed by:', data.performedByName);
      if (this.eventHandlers.onRedo) {
        this.eventHandlers.onRedo(data);
      }
    });
    
    this.socket.on('clear-canvas', (data) => {
      console.log('Canvas cleared by:', data.performedByName);
      if (this.eventHandlers.onClearCanvas) {
        this.eventHandlers.onClearCanvas(data);
      }
    });
    
    this.socket.on('pong', () => {
      this.latency = Date.now() - this.lastPingTime;
    });
  }
  
  emitDrawStart(stroke) {
    if (!this.connected) return;
    
    this.socket.emit('draw-start', {
      id: stroke.id,
      type: stroke.type,
      color: stroke.color,
      lineWidth: stroke.lineWidth,
      x: stroke.points[0].x,
      y: stroke.points[0].y
    });
  }
  
  emitDrawMove(data) {
    if (!this.connected) return;
    
    this.socket.emit('draw-move', {
      id: data.id,
      points: data.points
    });
  }
  
  emitDrawEnd(stroke) {
    if (!this.connected) return;
    
    this.socket.emit('draw-end', {
      id: stroke.id,
      type: stroke.type,
      points: stroke.points,
      color: stroke.color,
      lineWidth: stroke.lineWidth
    });
  }
  
  emitCursorMove(position) {
    if (!this.connected) return;
    
    this.socket.emit('cursor-move', {
      x: position.x,
      y: position.y
    });
  }
  
  emitUndo() {
    if (!this.connected) return;
    this.socket.emit('undo');
  }
  
  emitRedo() {
    if (!this.connected) return;
    this.socket.emit('redo');
  }
  
  emitClearCanvas() {
    if (!this.connected) return;
    
    if (confirm('Clear the entire canvas for all users?')) {
      this.socket.emit('clear-canvas');
    }
  }
  
  on(event, handler) {
    if (this.eventHandlers.hasOwnProperty(`on${event.charAt(0).toUpperCase() + event.slice(1)}`)) {
      this.eventHandlers[`on${event.charAt(0).toUpperCase() + event.slice(1)}`] = handler;
    }
  }
  
  updateConnectionStatus(connected) {
    this.connected = connected;
    
    if (this.eventHandlers.onConnectionChange) {
      this.eventHandlers.onConnectionChange(connected);
    }
  }
  
  startLatencyTracking() {
    setInterval(() => {
      if (this.connected) {
        this.lastPingTime = Date.now();
        this.socket.emit('ping');
      }
    }, 2000);
  }
  
  getLatency() {
    return this.latency;
  }
  
  isConnected() {
    return this.connected;
  }
  
  getUserInfo() {
    return {
      userId: this.userId,
      userName: this.userName,
      userColor: this.userColor
    };
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
