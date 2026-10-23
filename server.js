// High Noon Hollow - authoritative game server (Express + Socket.IO)
const express = require('express'), http = require('http'), { Server } = require('socket.io');
const PORT = process.env.PORT || 3000, ORIGIN = process.env.CLIENT_ORIGIN || '*';
const app = express();
app.use(express.static(__dirname + '/public'));
app.get('/health', (_q, s) => s.send('ok'));
const srv = http.createServer(app);
const io = new Server(srv, { cors: { origin: ORIGIN === '*' ? '*' : ORIGIN.split(',').map(s => s.trim()) } });

const R = new Map(), NPCS = 20, TICK = 100, ROUND = 480000, GONE = 45000, A = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.random() * a.length | 0];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const COLORS = ['#c0392b', '#2980b9', '#27ae60', '#f39c12', '#8e44ad', '#16a085', '#a0522d', '#7f8c8d', '#e84393', '#2c3e50'];
const NAMES = ['red', 'blue', 'green', 'orange', 'purple', 'teal', 'brown', 'grey', 'pink', 'navy'];
const HATS = ['#3b2a1a', '#6b4a2a', '#1e1e1e', '#8a6d3b'];
const WP = []; for (let x = -36; x <= 36; x += 6) for (const z of [-3, 0, 3]) WP.push([x, z]);          // street waypoints
const DOORS = [-30, -12, 6, 24].flatMap(x => [[x, -6], [x, 6]]);                                        // building fronts
const where = (x, z) => `${x < -18 ? 'west' : x > 12 ? 'east' : 'central'} ${z < 0 ? 'north' : 'south'} side`;
const lim = n => n <= 4 ? [1, 1] : n <= 6 ? [1, 2] : [2, 3];
const humans = r => [...r.players.values()];

function newRoom() {
  let c; do c = Array.from({ length: 4 }, () => pick(A)).join(''); while (R.has(c));
  const r = { code: c, host: null, players: new Map(), state: 'lobby', murderers: 1, ents: [], stats: {}, seen: Date.now() };
  R.set(c, r); return r;
}
function sendLobby(r) {
  const ps = humans(r), [lo, hi] = lim(ps.filter(p => p.on).length);
  r.murderers = clamp(r.murderers, lo, hi);
  io.to(r.code).emit('lobby', { code: r.code, state: r.state, murderers: r.murderers, range: [lo, hi],
    players: ps.map(p => ({ id: p.id, name: p.name, ready: p.ready, on: p.on, host: p.id === r.host })) });
}
function initFor(r, p) {            // private per-player payload: roles of others are never included
  const sh = humans(r).find(x => x.role === 'sheriff'), ms = humans(r).filter(x => x.role === 'murderer' && x !== p && x.e);
  return { ents: r.ents.map(e => ({ id: e.id, c: COLORS[e.ci], h: e.hat })), sheriff: sh && sh.e.id, me: p.e.id, role: p.role,
    mates: p.role === 'murderer' ? ms.map(x => x.e.id) : [], ammo: p.ammo, x: p.e.x, z: p.e.z, alive: !!p.e.alive };
}
function start(r) {
  const ps = humans(r).filter(p => p.on).sort(() => Math.random() - .5);
  const [lo, hi] = lim(ps.length), m = clamp(r.murderers, lo, hi), total = ps.length + NPCS;
  const ids = [...Array(total).keys()].sort(() => Math.random() - .5);    // shuffled ids: an entity id never reveals human vs NPC
  r.ents = []; r.state = 'play'; r.t0 = Date.now(); r.stats = { kills: 0, wrong: 0, caught: 0 };
  const mk = (id, p) => ({ id, p, x: p ? rnd(-8, 8) : 0, z: p ? rnd(-2, 2) : 0, ry: 0, yaw: 0, alive: 1, mv: 0,
    ci: Math.random() * COLORS.length | 0, hat: pick(HATS), wait: 0, flee: 0, saw: null });
  ps.forEach((p, i) => {
    Object.assign(p, { role: i < m ? 'murderer' : i === m ? 'sheriff' : 'deputy', ammo: 6, cd: Date.now() + 5000, reloadAt: 0, stun: 0, ready: false, lm: 0 });
    p.e = mk(ids[i], p); r.ents[ids[i]] = p.e;
  });
  for (let i = ps.length; i < total; i++) { const e = mk(ids[i], null), w = pick(WP); e.x = e.tx = w[0]; e.z = e.tz = w[1]; r.ents[ids[i]] = e; }
  ps.forEach(p => io.to(p.sock).emit('init', initFor(r, p)));
  sendLobby(r);
}
function kill(r, t, by, murder) {
  t.alive = 0; t.mv = 0; t.dead = { at: Date.now() }; r.stats.kills++;
  if (t.p) io.to(t.p.sock).emit('dead');
  let seen = false;
  for (const w of r.ents) {                                   // nearby NPCs may witness, panic and remember
    if (w.p || !w.alive || w === t || dist(w, t) > 14 || Math.random() > .75) continue;
    seen = true; w.flee = Date.now() + 7000; w.wait = 0;
    const f = WP.reduce((a, b) => dist({ x: b[0], z: b[1] }, t) > dist({ x: a[0], z: a[1] }, t) ? b : a);
    w.tx = f[0]; w.tz = f[1];
    if (murder) w.saw = { ci: Math.random() < .8 ? by.ci : Math.random() * COLORS.length | 0, x: t.x, z: t.z };  // 20% unreliable
  }
  if (murder && seen) humans(r).filter(p => p.role !== 'murderer' && p.on).forEach(p => io.to(p.sock).emit('clue', `Screams in the ${where(t.x, t.z)}!`));
}
function check(r) {
  if (r.state !== 'play') return;
  const now = Date.now(), here = p => p.on || now - p.offAt < GONE, ps = humans(r).filter(p => p.e);
  const ms = ps.filter(p => p.role === 'murderer' && p.e.alive && here(p)), sh = ps.find(p => p.role === 'sheriff');
  const npcs = r.ents.filter(e => !e.p && e.alive).length;
  let w = null;
  if (!ms.length) w = 'lawmen';
  else if (!npcs || !sh.e.alive || !here(sh)) w = 'murderers';
  else if (now - r.t0 > ROUND) w = npcs * 2 >= NPCS ? 'lawmen' : 'murderers';   // no stalemates
  if (w) endRound(r, w);
}
function endRound(r, w) {
  r.state = 'end'; humans(r).forEach(p => p.ready = false);
  io.to(r.code).emit('end', { winner: w, npcs: r.ents.filter(e => !e.p && e.alive).length, total: NPCS, secs: Math.round((Date.now() - r.t0) / 1000),
    stats: r.stats, roles: humans(r).filter(p => p.e).map(p => ({ name: p.name, role: p.role, alive: !!p.e.alive })) });
  sendLobby(r);
}
function tick(r) {
  const now = Date.now();
  for (const e of r.ents) {
    if (e.p || !e.alive) continue;
    if (e.wait > now) { e.mv = 0; continue; }
    const dx = e.tx - e.x, dz = e.tz - e.z, d = Math.hypot(dx, dz);
    if (d < .4) { const t = pick(Math.random() < .4 ? DOORS : WP); e.wait = now + (e.flee > now ? 2000 : rnd(2000, 9000)); e.tx = t[0] + rnd(-.6, .6); e.tz = t[1]; e.mv = 0; continue; }
    const sp = (e.flee > now ? 5 : 2.4) * TICK / 1000;
    e.x += dx / d * sp; e.z += dz / d * sp; e.ry = Math.atan2(dx, dz); e.mv = 1;
    for (const o of r.ents) if (o !== e && o.alive) { const ox = e.x - o.x, oz = e.z - o.z, od = Math.hypot(ox, oz); if (od > 0 && od < .7) { e.x += ox / od * .04; e.z += oz / od * .04; } }
  }
  for (const p of humans(r)) if (p.reloadAt && now >= p.reloadAt) { p.reloadAt = 0; p.ammo = 6; io.to(p.sock).emit('ammo', 6); }
  check(r); if (r.state !== 'play') return;
  io.to(r.code).emit('s', { e: r.ents.map(e => [+e.x.toFixed(2), +e.z.toFixed(2), +e.ry.toFixed(2), e.alive, e.mv]),
    n: r.ents.filter(e => !e.p && e.alive).length, tl: Math.max(0, ROUND - (now - r.t0)) });
}
setInterval(() => R.forEach(r => r.state === 'play' && tick(r)), TICK);
setInterval(() => { const now = Date.now(); R.forEach((r, c) => { if (humans(r).some(p => p.on)) r.seen = now; else if (now - r.seen > 300000) R.delete(c); }); }, 60000);

const okTok = d => d && typeof d.token === 'string' && d.token.length >= 8 && d.token.length <= 64;
function attach(r, s, d) {
  const name = String(d.name || '').replace(/[<>&"'`]/g, '').trim().slice(0, 14) || 'Drifter';
  let p = humans(r).find(x => x.token === d.token);
  if (p) { p.sock = s.id; p.on = true; }                        // reconnect with the same secret token
  else {
    if (r.state === 'play') return { err: 'A round is in progress. Join when it ends.' };
    if (humans(r).filter(x => x.on).length >= 8) return { err: 'This room is full (8 players).' };
    p = { id: Math.random().toString(36).slice(2, 8), token: d.token, name, sock: s.id, on: true, ready: false };
    r.players.set(p.id, p); if (!r.host) r.host = p.id;
  }
  s.data = { room: r.code, pid: p.id }; s.join(r.code); r.seen = Date.now(); return { p };
}

io.on('connection', s => {
  const cur = () => { const r = R.get(s.data.room); return [r, r && r.players.get(s.data.pid)]; };
  const fail = (cb, m) => typeof cb === 'function' && cb({ err: m });
  const reply = (r, p, cb) => {
    typeof cb === 'function' && cb({ code: r.code, id: p.id }); sendLobby(r);
    if (r.state === 'play' && p.e) { s.emit('init', initFor(r, p)); if (!p.e.alive) s.emit('dead'); }
  };
  s.on('create', (d, cb) => { if (!okTok(d)) return fail(cb, 'Bad request.'); const r = newRoom(), a = attach(r, s, d); a.err ? fail(cb, a.err) : reply(r, a.p, cb); });
  s.on('join', (d, cb) => {
    if (!okTok(d)) return fail(cb, 'Bad request.');
    const r = R.get(String(d.code || '').toUpperCase().slice(0, 4)); if (!r) return fail(cb, 'Room not found. Check the code.');
    const a = attach(r, s, d); a.err ? fail(cb, a.err) : reply(r, a.p, cb);
  });
  s.on('ready', () => { const [r, p] = cur(); if (r && p && r.state !== 'play') { p.ready = !p.ready; sendLobby(r); } });
  s.on('murderers', n => { const [r, p] = cur(); if (r && p && r.host === p.id && r.state !== 'play') { r.murderers = +n | 0; sendLobby(r); } });
  s.on('start', (_d, cb) => {
    const [r, p] = cur(); if (!r || !p || r.host !== p.id || r.state === 'play') return;
    const on = humans(r).filter(x => x.on);
    if (on.length < 2) return fail(cb, 'Need at least 2 players.');
    if (r.state === 'lobby' && on.some(x => x.id !== r.host && !x.ready)) return fail(cb, 'Everyone must be ready.');
    start(r);
  });
  s.on('move', m => {
    const [r, p] = cur(); if (!r || r.state !== 'play' || !p || !p.e || !p.e.alive || !m) return;
    const e = p.e, now = Date.now(), dt = clamp((now - (p.lm || now - 50)) / 1000, .01, 1); p.lm = now;
    const nx = +m.x, nz = +m.z; if (!isFinite(nx) || !isFinite(nz)) return;
    const d = Math.hypot(nx - e.x, nz - e.z);
    if (d > 7 * dt + .6) return s.emit('fix', { x: e.x, z: e.z });   // speed-hack guard
    e.mv = d > .02 ? 1 : 0; e.x = clamp(nx, -60, 60); e.z = clamp(nz, -45, 45); e.yaw = +m.yaw || 0; e.ry = e.yaw + Math.PI;
  });
  s.on('act', id => {                                              // murderer kill, fully validated here
    const [r, p] = cur(), now = Date.now();
    if (!r || r.state !== 'play' || !p || p.role !== 'murderer' || !p.e.alive || now < p.cd) return;
    const t = r.ents[id]; if (!t || !t.alive || t === p.e || (t.p && t.p.role === 'murderer') || dist(p.e, t) > 2.6) return;
    p.cd = now + 15000; kill(r, t, p.e, true); s.emit('cd', 15000); check(r);
  });
  s.on('shoot', id => {
    const [r, p] = cur(), now = Date.now();
    if (!r || r.state !== 'play' || !p || p.role !== 'sheriff' || !p.e.alive || now < p.stun || p.reloadAt || p.ammo < 1) return;
    p.ammo--; s.emit('ammo', p.ammo); io.to(r.code).emit('shot');
    const t = r.ents[id]; if (!t || !t.alive || t === p.e || dist(p.e, t) > 45) return;
    const dx = t.x - p.e.x, dz = t.z - p.e.z, d = Math.hypot(dx, dz) || 1;
    if ((-Math.sin(p.e.yaw) * dx - Math.cos(p.e.yaw) * dz) / d < .96) return;     // must be roughly where the sheriff faces
    const guilty = t.p && t.p.role === 'murderer'; kill(r, t, p.e, false);
    if (guilty) r.stats.caught++; else { r.stats.wrong++; p.stun = now + 8000; s.emit('stun', 8000); }   // wrongful shot jams the gun
    check(r);
  });
  s.on('reload', () => {
    const [r, p] = cur(); if (!r || r.state !== 'play' || !p || p.role !== 'sheriff' || !p.e.alive || p.ammo >= 6 || p.reloadAt) return;
    p.reloadAt = Date.now() + 2000; s.emit('reloading', 2000);
  });
  s.on('use', id => {                                              // inspect body / question townsfolk (not murderers)
    const [r, p] = cur(); if (!r || r.state !== 'play' || !p || !p.e || !p.e.alive || p.role === 'murderer') return;
    const t = r.ents[id]; if (!t || t === p.e || dist(p.e, t) > 3.6) return; let m;
    if (!t.alive) m = `Body in the ${where(t.x, t.z)}. Dead about ${Math.round((Date.now() - t.dead.at) / 1000)}s.`;
    else if (!t.p && t.saw) m = `"I saw someone in a ${NAMES[t.saw.ci]} shirt near the ${where(t.saw.x, t.saw.z)}!"`;
    else m = pick(['"Nothing to report, partner."', '"Hot day, ain\'t it?"', '"Haven\'t seen a thing."']);
    s.emit('clue', m);
  });
  s.on('disconnect', () => {
    const [r, p] = cur(); if (!r || !p || p.sock !== s.id) return;
    p.on = false; p.offAt = Date.now(); if (r.state !== 'play') r.players.delete(p.id);
    if (r.host === p.id) { const n = humans(r).find(x => x.on); r.host = n ? n.id : null; }
    sendLobby(r);
  });
});
srv.listen(PORT, () => console.log('High Noon Hollow on :' + PORT));
