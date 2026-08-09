import { WebSocketServer } from 'ws';

const MAX_MESSAGE = 2000;
const MAX_HISTORY = 50;
const MAX_PER_ROOM = 50;

const rooms = new Map();

function room(code) {
  if (!rooms.has(code)) rooms.set(code, { clients: new Set(), history: [] });
  return rooms.get(code);
}

function send(socket, payload) {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(payload));
}

function broadcast(code, payload) {
  const current = rooms.get(code);
  if (!current) return;
  if (payload.type === 'message') {
    current.history.push(payload);
    if (current.history.length > MAX_HISTORY) current.history.shift();
  }
  current.clients.forEach(client => send(client, payload));
}

function names(code) {
  return [...(rooms.get(code)?.clients ?? [])].map(client => client.nick);
}

export const chat = new WebSocketServer({ noServer: true });

chat.on('connection', socket => {
  socket.code = null;
  socket.nick = null;

  socket.on('message', raw => {
    let data;
    try {
      data = JSON.parse(raw.toString().slice(0, MAX_MESSAGE + 200));
    } catch {
      return;
    }

    if (data.type === 'join') {
      const code = String(data.room ?? '').trim().toLowerCase().slice(0, 32);
      const nick = String(data.name ?? '').trim().slice(0, 24) || 'anon';
      if (!code) return send(socket, { type: 'error', text: 'Room name required.' });

      const target = room(code);
      if (target.clients.size >= MAX_PER_ROOM) {
        return send(socket, { type: 'error', text: 'That room is full.' });
      }

      socket.code = code;
      socket.nick = nick;
      target.clients.add(socket);

      send(socket, { type: 'joined', room: code, name: nick, history: target.history });
      broadcast(code, { type: 'presence', text: `${nick} joined`, users: names(code) });
      return;
    }

    if (data.type === 'message' && socket.code) {
      const text = String(data.text ?? '').trim().slice(0, MAX_MESSAGE);
      if (!text) return;
      broadcast(socket.code, { type: 'message', name: socket.nick, text, at: Date.now() });
    }
  });

  socket.on('close', () => {
    const current = rooms.get(socket.code);
    if (!current) return;
    current.clients.delete(socket);
    if (!current.clients.size) return rooms.delete(socket.code);
    broadcast(socket.code, { type: 'presence', text: `${socket.nick} left`, users: names(socket.code) });
  });
});
