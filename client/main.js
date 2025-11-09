let canvas;
let ws;

window.addEventListener('load', () => {
  document.getElementById('join-btn').addEventListener('click', joinRoom);
});

function joinRoom() {
  const name = document.getElementById('user-name-input').value.trim();
  const room = document.getElementById('room-id-input').value.trim();
  
  if (!name || !room) {
    alert('Please enter both name and room ID');
    return;
  }
  
  window.currentUserName = name;
  window.currentRoomId = room;
  
  document.getElementById('join-screen').style.display = 'none';
  document.getElementById('app-screen').style.display = 'block';
  
  initApp();
}

function initApp() {
  canvas = new CanvasManager('main-canvas', 'cursor-canvas');
  ws = new WebSocketManager();
  
  setupTools();
  connectCanvasToWebSocket();
  setupWebSocketEvents();
  
  ws.connect();
}

function setupTools() {
  document.getElementById('brush-tool').onclick = () => selectTool('brush');
  document.getElementById('eraser-tool').onclick = () => selectTool('eraser');
  
  document.getElementById('color-picker').oninput = (e) => canvas.setColor(e.target.value);
  
  document.querySelectorAll('.color-preset').forEach(btn => {
    btn.onclick = () => {
      const color = btn.dataset.color;
      document.getElementById('color-picker').value = color;
      canvas.setColor(color);
    };
  });
  
  const sizeSlider = document.getElementById('line-width');
  sizeSlider.oninput = (e) => {
    document.getElementById('line-width-value').textContent = e.target.value;
    canvas.setLineWidth(parseInt(e.target.value));
  };
  
  document.getElementById('undo-btn').onclick = () => ws.emitUndo();
  document.getElementById('redo-btn').onclick = () => ws.emitRedo();
  document.getElementById('clear-btn').onclick = () => ws.emitClearCanvas();
  
  document.onkeydown = (e) => {
    if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();
      ws.emitUndo();
    }
    if (e.ctrlKey && e.key === 'y') {
      e.preventDefault();
      ws.emitRedo();
    }
  };
}

function selectTool(tool) {
  canvas.setTool(tool);
  document.getElementById('brush-tool').classList.toggle('active', tool === 'brush');
  document.getElementById('eraser-tool').classList.toggle('active', tool === 'eraser');
}

function connectCanvasToWebSocket() {
  canvas.onDrawStart = (stroke) => ws.emitDrawStart(stroke);
  canvas.onDrawMove = (data) => ws.emitDrawMove(data);
  canvas.onDrawEnd = (stroke) => ws.emitDrawEnd(stroke);
  canvas.onCursorMove = (pos) => ws.emitCursorMove(pos);
}

function setupWebSocketEvents() {
  ws.on('init', (data) => {
    document.getElementById('current-user').textContent = window.currentUserName;
    document.getElementById('room-name').textContent = `Room: ${window.currentRoomId}`;
    
    if (data.operations && data.operations.length > 0) {
      canvas.setOperations(data.operations);
    }
    
    showUsers(data.users);
  });
  
  ws.on('usersUpdate', (users) => showUsers(users));
  
  ws.on('drawMove', (data) => {
    if (data.stroke) canvas.drawStroke(data.stroke, false);
  });
  
  ws.on('drawEnd', (data) => canvas.addRemoteOperation(data));
  
  ws.on('undo', () => canvas.removeLastOperation());
  
  ws.on('redo', (data) => {
    if (data.operation) canvas.addRemoteOperation(data.operation);
  });
  
  ws.on('clearCanvas', () => canvas.clearCanvas());
  
  ws.on('cursorMove', (data) => {
    canvas.updateRemoteCursor(data.userId, data.userName, data.userColor, data.x, data.y);
  });
}

function showUsers(users) {
  document.getElementById('user-count').textContent = users.length;
  const list = document.getElementById('user-list');
  list.innerHTML = '';
  
  users.forEach(user => {
    const li = document.createElement('li');
    li.className = 'user-item';
    li.innerHTML = `
      <span class="user-color" style="background: ${user.color}"></span>
      <span class="user-name">${user.name}</span>
    `;
    list.appendChild(li);
  });
}
