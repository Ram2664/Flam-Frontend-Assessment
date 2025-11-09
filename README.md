# Collaborative Drawing Board

A real-time drawing application where multiple users can draw together on the same canvas.

## Features

- Real-time drawing synchronization
- Room-based collaboration (users enter room ID)
- Custom usernames
- Brush and eraser tools
- Color picker with preset colors
- Adjustable brush size
- Global undo/redo
- Clear canvas
- Live user list

## Setup

```bash
npm install
npm start
```

Open http://localhost:3000 in your browser.

## Testing with Multiple Users

1. Open http://localhost:3000 in multiple browser tabs
2. Enter the same room ID in each tab (e.g., "room1")
3. Enter different names for each user
4. Start drawing - you'll see drawings appear in all tabs instantly

**On different devices:**
- Find your local IP (use `ipconfig` on Windows or `ifconfig` on Mac/Linux)
- Other devices connect to `http://YOUR_IP:3000`
- Use the same room ID

## How It Works

- Frontend: Vanilla JavaScript with HTML5 Canvas
- Backend: Node.js with Express and Socket.io
- Real-time: WebSocket communication
- State: In-memory storage (lost on server restart)

## Project Structure

```
client/
  index.html      - Main page with join screen
  style.css       - Minimal styling
  canvas.js       - Canvas drawing logic
  websocket.js    - WebSocket client
  main.js         - App initialization
server/
  server.js       - Main server
  rooms.js        - Room/user management
  drawing-state.js - Drawing history for undo/redo
```

## Known Limitations

- No data persistence (drawings lost on server restart)
- No authentication
- In-memory storage only
- Single server instance (no load balancing)

## Time Spent

Approximately 5-6 hours:
- Initial setup and structure: 1 hour
- Canvas implementation: 1.5 hours
- WebSocket integration: 1.5 hours
- Room functionality: 1 hour
- Testing and refinement: 1 hour
