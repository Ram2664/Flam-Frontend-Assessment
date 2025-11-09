class RoomManager {
  constructor() {
    this.rooms = new Map();
  }
  
  _initRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Map());
    }
  }
  
  addUser(roomId, userId, userName, userColor) {
    this._initRoom(roomId);
    const room = this.rooms.get(roomId);
    room.set(userId, {
      id: userId,
      name: userName,
      color: userColor,
      joinedAt: Date.now()
    });
    return this.getUsers(roomId);
  }
  
  removeUser(roomId, userId) {
    if (!this.rooms.has(roomId)) return [];
    
    const room = this.rooms.get(roomId);
    room.delete(userId);
    
    if (room.size === 0) {
      this.rooms.delete(roomId);
    }
    
    return this.getUsers(roomId);
  }
  
  getUsers(roomId) {
    if (!this.rooms.has(roomId)) return [];
    return Array.from(this.rooms.get(roomId).values());
  }
}

module.exports = RoomManager;
