const express = require('express'), http = require('http'), { Server } = require('socket.io');
const app = express(); app.get('/', (q, r) => r.sendFile(__dirname + '/index.html'));
const srv = http.createServer(app), io = new Server(srv);
const rooms = {};
const mk = () => { let c; do { c = Math.random().toString(36).slice(2, 8).toUpperCase(); } while (rooms[c]); return c; };

function enter(s, c, name) {
  s.code = c; s.name = (name || 'Dost').slice(0, 20); s.join(c);
  const ids = [...(io.sockets.adapter.rooms.get(c) || [])].filter(i => i !== s.id);
  s.emit('peers', ids);
  io.to(c).emit('chat', { name: '•', text: s.name + ' aa gaya' });
}

io.on('connection', s => {
  s.on('create', (name, cb) => { const c = mk(); rooms[c] = { host: s.id, state: null }; enter(s, c, name); cb({ code: c, host: true }); });
  s.on('join', (c, name, cb) => {
    c = String(c || '').toUpperCase().trim(); const r = rooms[c];
    if (!r) return cb({ error: 'Code galat hai ya room band ho chuka hai' });
    enter(s, c, name); cb({ code: c, host: false, state: r.state });
  });
  // sirf host sync bhej sakta hai
  s.on('sync', st => { const r = rooms[s.code]; if (r && r.host === s.id) { r.state = st; s.to(s.code).emit('sync', st); } });
  s.on('chat', m => { if (s.code) io.to(s.code).emit('chat', { name: s.name, text: String(m).slice(0, 500) }); });
  s.on('signal', ({ to, data }) => io.to(to).emit('signal', { from: s.id, data }));
  s.on('disconnect', () => {
    const c = s.code, r = rooms[c]; if (!r) return;
    if (r.host === s.id) { io.to(c).emit('ended'); delete rooms[c]; }
    else io.to(c).emit('left', { id: s.id, name: s.name });
  });
});
srv.listen(process.env.PORT || 3000, () => console.log('Chal raha hai: http://localhost:' + (process.env.PORT || 3000)));
