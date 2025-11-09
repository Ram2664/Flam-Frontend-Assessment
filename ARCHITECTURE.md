# Architecture Documentation

## System Overview

This is a client-server application using WebSockets for real-time communication.

**Client:** Vanilla JavaScript with HTML5 Canvas  
**Server:** Node.js with Express and Socket.io  
**Communication:** WebSocket (Socket.io)

### Components

**Client Side:**
- `canvas.js` - Handles drawing on HTML5 canvas
- `websocket.js` - Manages WebSocket connection
- `main.js` - Connects UI to canvas and websocket

**Server Side:**
- `server.js` - Main server handling WebSocket events
- `rooms.js` - Manages users in rooms
- `drawing-state.js` - Stores drawing history for undo/redo

---

## Data Flow

### When a user draws:

1. User moves mouse on canvas
2. Canvas captures points and draws locally (instant feedback)
3. Points are batched every 16ms to reduce network traffic
4. Batched points sent to server via WebSocket
5. Server broadcasts points to other users in the same room
6. Other users receive points and draw them on their canvas

### When a user clicks undo:

1. User clicks undo button
2. Request sent to server
3. Server pops last operation from history stack
4. Server broadcasts undo to all users (including sender)
5. All users remove last drawing and redraw canvas

---

## WebSocket Protocol

### Events from Client to Server:

**Join:**
- `connection` - Client connects with roomId and userName in query params

**Drawing:**
- `draw-start` - User starts drawing (mouse down)
- `draw-move` - User is drawing (mouse move) - includes batched points
- `draw-end` - User finishes drawing (mouse up) - includes complete stroke

**Actions:**
- `undo` - Request to undo last operation
- `redo` - Request to redo last undone operation
- `clear-canvas` - Request to clear all drawings

**Cursor:**
- `cursor-move` - User's cursor position (throttled to 50ms)

### Events from Server to Client:

**Initialization:**
- `init` - Sends userId, userName, userColor, existing operations, user list

**User Management:**
- `user-joined` - Someone joined the room
- `user-left` - Someone left the room
- `users-update` - Updated list of users in room

**Drawing:**
- `draw-start` - Another user started drawing
- `draw-move` - Another user is drawing
- `draw-end` - Another user finished drawing

**Actions:**
- `undo` - Remove last operation
- `redo` - Add operation back
- `clear-canvas` - Clear all drawings

**Cursor:**
- `cursor-move` - Another user's cursor position

---

## Undo/Redo Strategy

The server maintains the operation history, making it the single source of truth.

**Data Structure:**
```javascript
room = {
  operations: [],   // Active drawings
  undoStack: []     // Undone drawings (for redo)
}
```

**Undo Process:**
1. Pop last operation from `operations` array
2. Push it to `undoStack`
3. Broadcast undo event to all users
4. Users redraw canvas with remaining operations

**Redo Process:**
1. Pop last operation from `undoStack`
2. Push it back to `operations` array
3. Broadcast redo event with the operation
4. Users add the operation back to canvas

**Why Server-Side?**
- Ensures all users see the same state
- Prevents conflicts when multiple users undo
- Simple to implement and understand
- No complex synchronization needed

**Limitation:**
- Can only undo in order (last operation first)
- Any user can undo any operation
- New drawing clears redo stack

---

## Performance Decisions

### 1. Point Batching

**Problem:** Mouse move events fire 60-100 times per second

**Solution:** Batch points every 16ms before sending

**Impact:** Reduces network messages by ~80% while maintaining smooth drawing

### 2. Event Throttling

**Cursor updates:** Throttled to 50ms (20 updates/sec max)

**Why:** Balance between showing cursor position and network efficiency

### 3. Local Drawing First

**Strategy:** Draw on local canvas immediately, then send to network

**Benefit:** User sees instant feedback, network delay doesn't affect experience

### 4. Canvas Rendering

**During drawing:** Only draw new segments incrementally

**After undo/redo:** Full canvas redraw from operation history

**Why:** Incremental drawing is faster, full redraw ensures consistency

---

## Conflict Resolution

### Multiple Users Drawing Simultaneously

**Approach:** Natural layering

- Each user's drawing is independent
- Operations are drawn in the order received by server
- Later drawings appear on top
- No merging or conflict detection needed

### Simultaneous Undo

**Scenario:** Two users click undo at the same time

**Handling:**
- Server processes sequentially (Node.js single-threaded)
- First request removes operation N
- Second request removes operation N-1
- Both users see consistent result

### Network Delays

**Problem:** User A draws but User B sees it delayed

**Mitigation:**
- Local prediction (draw immediately on own canvas)
- Server timestamp on operations
- Operations displayed in server-received order
- Small delays acceptable for collaborative tool

---

## Design Trade-offs

**Choices Made:**

✅ Simple over complex  
✅ Server authority over peer-to-peer  
✅ Global undo over per-user undo  
✅ In-memory over database  
✅ Single room flow over complex routing  

**Benefits:**
- Easy to understand and explain
- Consistent state across all users
- No complex synchronization algorithms
- Fast development and testing

**Limitations:**
- No persistence
- No per-user undo
- Limited scalability
- Single server instance

**For Production:**
- Add database (MongoDB/PostgreSQL)
- Implement room persistence
- Add user authentication
- Use Redis for Socket.io scaling
- Add operation compression
- Implement canvas snapshots for faster loading

