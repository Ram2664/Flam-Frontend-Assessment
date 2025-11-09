class DrawingState {
  constructor() {
    this.rooms = new Map();
  }
  
  _initRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, { operations: [], undoStack: [] });
    }
  }
  
  addOperation(roomId, op) {
    this._initRoom(roomId);
    const room = this.rooms.get(roomId);
    room.operations.push(op);
    room.undoStack = [];
    return op;
  }
  
  getOperations(roomId) {
    this._initRoom(roomId);
    return this.rooms.get(roomId).operations;
  }
  
  undo(roomId) {
    this._initRoom(roomId);
    const room = this.rooms.get(roomId);
    if (room.operations.length === 0) return null;
    
    const undone = room.operations.pop();
    room.undoStack.push(undone);
    return undone;
  }
  
  redo(roomId) {
    this._initRoom(roomId);
    const room = this.rooms.get(roomId);
    if (room.undoStack.length === 0) return null;
    
    const redone = room.undoStack.pop();
    room.operations.push(redone);
    return redone;
  }
  
  clearOperations(roomId) {
    this._initRoom(roomId);
    const room = this.rooms.get(roomId);
    room.operations = [];
    room.undoStack = [];
  }
}

module.exports = DrawingState;
