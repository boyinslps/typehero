import { VILLAGE, doorTile } from './nw-data.js';

const T = 16;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function mountVillage(host, o) {
  const { PX, look, open, start, onEnter, scroller, fast } = o;
  const V = VILLAGE, W = V.cols * T, H = V.rows * T;
  const availW = host.clientWidth || innerWidth, availH = (scroller ? scroller.clientHeight : innerHeight) - 130;
  const sc = clamp(Math.floor(Math.min(availW / W, (availH + 110) / H)), 2, 5);
  host.innerHTML = '';
  host.style.overflowX = 'auto';
  const stage = document.createElement('div');
  stage.style.cssText = `position:relative;width:${W * sc}px;height:${H * sc}px;margin:0 auto;cursor:pointer;border:4px solid #0a0714;box-sizing:content-box;touch-action:manipulation`;
  const cvs = document.createElement('canvas');
  cvs.width = W; cvs.height = H;
  cvs.style.cssText = `width:${W * sc}px;height:${H * sc}px;image-rendering:pixelated;display:block`;
  stage.appendChild(cvs);
  host.appendChild(stage);
  const g = cvs.getContext('2d');
  g.imageSmoothingEnabled = false;

  const base = PX.village(V, open);
  const blocked = V.blocked;
  const gb = V.gateBlock;
  const inGate = (x, y) => x >= gb.x0 && x <= gb.x1 && y >= gb.y0 && y <= gb.y1;
  const walkable = (x, y) => x >= 0 && y >= 0 && x < V.cols && y < V.rows && !blocked.has(x + ',' + y);
  const footFree = (fx, fy) => [[-4, 0], [4, 0], [-4, 4], [4, 4]].every(([dx, dy]) => walkable(Math.floor((fx + dx) / T), Math.floor((fy + dy) / T)));

  function bfs(from, to) {
    const key = (x, y) => y * V.cols + x, prev = new Map([[key(...from), null]]), q = [from];
    for (let i = 0; i < q.length; i++) {
      const [x, y] = q[i];
      if (x === to[0] && y === to[1]) break;
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const nx = x + dx, ny = y + dy, k = key(nx, ny);
        if (walkable(nx, ny) && !prev.has(k)) { prev.set(k, [x, y]); q.push([nx, ny]); }
      }
    }
    if (!prev.has(key(...to))) return null;
    const path = [];
    for (let c = to; c; c = prev.get(key(...c))) path.unshift(c);
    return path.slice(1);
  }

  const P = { fx: start[0] * T + 8, fy: start[1] * T + 12, dir: 'down', frame: 0, path: [], t: 0, moving: false, lock: false };
  const tileOf = () => [Math.floor(P.fx / T), Math.floor(P.fy / T)];
  const sprites = {};
  const spr = (lk, d, f) => { const k = JSON.stringify(lk) + d + f; return sprites[k] || (sprites[k] = PX.chibi(lk, d, f, 1)); };
  const gateEl = { x: V.gate.x * T - 4, y: V.gate.y * T - 56 };

  const addHot = (id, name, x, y, w, h, wip, tag) => {
    const b = document.createElement('button');
    b.className = 'vb'; b.dataset.bld = id; b.setAttribute('aria-label', name);
    b.style.cssText = `position:absolute;left:${x * sc}px;top:${y * sc}px;width:${w * sc}px;height:${h * sc}px;background:transparent;border:0;cursor:pointer;padding:0`;
    const label = document.createElement('span');
    label.className = 'px-text';
    label.style.cssText = `position:absolute;left:50%;top:${-Math.max(8, 4 * sc)}px;transform:translateX(-50%);white-space:nowrap;pointer-events:none;font-weight:900;font-size:${Math.max(11, 3 * sc)}px;
      padding:1px 8px;background:rgba(10,7,20,.82);border:2px solid ${wip ? '#5a5f6a' : '#e8b64c'};color:${wip ? '#aab0b8' : '#fff'}`;
    label.textContent = (wip ? '🔒 ' : '') + name + (tag ? `・${tag}` : '');
    b.appendChild(label);
    b.addEventListener('mouseenter', () => { b.style.outline = '3px dashed #ffd98a'; });
    b.addEventListener('mouseleave', () => { b.style.outline = '0'; });
    stage.appendChild(b);
    return b;
  };
  V.buildings.forEach(b => {
    const isOpen = open.includes(b.id);
    addHot(b.id, b.name, b.x * T, b.y * T, 48, 48, !isOpen, isOpen ? '' : `第 ${b.wip} 段`);
  });
  addHot('gate', '傳送門・回舊世界', gateEl.x, gateEl.y, 40, 56, false, '');

  const npcs = (V.npcs || []).map(n => ({ ...n, fx: n.x * T + 8, fy: n.y * T + 12, dir: 'down', frame: 0, goal: null, wait: Math.random() * 2, line: 0, talkUntil: 0 }));
  const bubble = document.createElement('div');
  bubble.className = 'px-panel';
  bubble.style.cssText = 'position:absolute;display:none;max-width:260px;padding:6px 10px;font-size:14px;z-index:6;pointer-events:none';
  stage.appendChild(bubble);

  function walkTo(tile, then) {
    const [tx, ty] = tileOf();
    const path = bfs([tx, ty], tile);
    if (!path) return false;
    P.path = path; P.then = then || null;
    if (!path.length && then) { const f = then; P.then = null; f(); }
    return true;
  }

  const keys = new Set();
  const onKey = (e, down) => {
    if (/INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '')) return;
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) {
      if (down) keys.add(k); else keys.delete(k);
      if (k.startsWith('arrow')) e.preventDefault();
    }
  };
  const kd = e => onKey(e, true), ku = e => onKey(e, false);
  addEventListener('keydown', kd); addEventListener('keyup', ku);

  stage.addEventListener('click', e => {
    const r = stage.getBoundingClientRect();
    const lx = (e.clientX - r.left - 4) / sc, ly = (e.clientY - r.top - 4) / sc;
    const hot = e.target.closest('.vb');
    const npc = npcs.find(n => Math.abs(n.fx - lx) < 9 && Math.abs(n.fy - 8 - ly) < 12);
    if (npc && !hot) { talk(npc); return; }
    if (hot) {
      const id = hot.dataset.bld;
      if (id === 'gate') { walkTo(V.gate.approach, () => onEnter({ id: 'gate' })); return; }
      const b = V.buildings.find(x => x.id === id), d = doorTile(b);
      walkTo([d[0], d[1]], () => onEnter(b));
      return;
    }
    const tx = Math.floor(lx / T), ty = Math.floor(ly / T);
    if (walkable(tx, ty)) walkTo([tx, ty], null);
  });

  function talk(n) {
    n.dir = Math.abs(P.fx - n.fx) > Math.abs(P.fy - n.fy) ? (P.fx > n.fx ? 'right' : 'left') : (P.fy > n.fy ? 'down' : 'up');
    n.goal = null; n.talkUntil = performance.now() + 3600;
    const text = n.say[n.line++ % n.say.length];
    bubble.innerHTML = `<b style="color:#ffd98a">${n.name}</b><br>${text}`;
    bubble.style.display = 'block'; bubble.dataset.who = n.id;
    bubble.style.left = clamp(n.fx * sc - 130, 4, W * sc - 270) + 'px';
    bubble.style.top = Math.max(4, (n.fy - 40) * sc) + 'px';
    setTimeout(() => { if (bubble.dataset.who === n.id && performance.now() >= n.talkUntil - 50) bubble.style.display = 'none'; }, 3700);
  }

  const prompt = document.createElement('div');
  prompt.className = 'px-panel';
  prompt.style.cssText = 'position:absolute;display:none;padding:3px 10px;font-size:14px;font-weight:900;z-index:7;pointer-events:none;white-space:nowrap;transform:translateX(-50%)';
  stage.appendChild(prompt);
  const REACH = 26;
  function nearest() {
    let best = null;
    const test = (x, y, d, kind, ref, label) => { const dist = Math.hypot(P.fx - x, P.fy - y); if (dist <= REACH && (!best || dist < best.dist)) best = { dist, x, y, kind, ref, label }; };
    V.buildings.forEach(b => { const t = doorTile(b); test(t[0] * T + 8, t[1] * T + 8, 0, 'bld', b, `進入「${b.name}」`); });
    test(V.gate.approach[0] * T + 8, V.gate.approach[1] * T + 14, 0, 'gate', { id: 'gate' }, '回舊世界');
    npcs.forEach(n => test(n.fx, n.fy, 0, 'npc', n, `跟${n.name}說話`));
    return best;
  }
  function showPrompt(near) {
    if (!near) { prompt.style.display = 'none'; P.near = null; return; }
    P.near = near;
    prompt.textContent = `Enter：${near.label}`;
    prompt.style.display = 'block';
    prompt.style.left = (near.x * sc) + 'px'; prompt.style.top = Math.max(0, (near.y - 30) * sc) + 'px';
  }
  const act = () => {
    if (document.getElementById('nw-bag') || !P.near) return;
    const n = P.near;
    if (n.kind === 'npc') talk(n.ref); else onEnter(n.ref);
  };
  const onEnterKey = e => { if (e.key === 'Enter' && !/INPUT|TEXTAREA|SELECT|BUTTON/.test((e.target && e.target.tagName) || '')) { e.preventDefault(); act(); } };
  addEventListener('keydown', onEnterKey);

  function moveBy(ent, dx, dy) {
    let moved = false;
    if (dx && footFree(ent.fx + dx, ent.fy)) { ent.fx += dx; moved = true; }
    if (dy && footFree(ent.fx, ent.fy + dy)) { ent.fy += dy; moved = true; }
    return moved;
  }

  let raf = 0, last = performance.now(), alive = true;
  const speed = fast ? 500 : 5 * T;
  function frame(now) {
    if (!alive || !stage.isConnected) return;
    const dt = Math.min(.1, (now - last) / 1000); last = now; P.t += dt;
    let ix = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
    let iy = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0);
    P.moving = false;
    if (ix || iy) {
      P.path = []; P.then = null;
      const len = Math.hypot(ix, iy), sx = ix / len * speed * dt, sy = iy / len * speed * dt;
      if (Math.abs(ix) >= Math.abs(iy) && ix) P.dir = ix > 0 ? 'right' : 'left'; else if (iy) P.dir = iy > 0 ? 'down' : 'up';
      P.moving = moveBy(P, sx, sy);
    } else if (P.path.length) {
      const [tx, ty] = P.path[0], gx = tx * T + 8, gy = ty * T + 12;
      const dx = gx - P.fx, dy = gy - P.fy, d = Math.hypot(dx, dy), step = speed * dt;
      if (Math.abs(dx) > Math.abs(dy)) P.dir = dx > 0 ? 'right' : 'left'; else P.dir = dy > 0 ? 'down' : 'up';
      P.moving = true;
      if (d <= step) { P.fx = gx; P.fy = gy; P.path.shift(); if (!P.path.length && P.then) { const f = P.then; P.then = null; f(); } }
      else { P.fx += dx / d * step; P.fy += dy / d * step; }
    }
    P.frame = P.moving ? Math.floor(P.t * 7) % 2 : 0;
    const near = nearest();
    showPrompt(near);

    npcs.forEach(n => {
      if (now < n.talkUntil) { n.frame = 0; return; }
      n.wait -= dt;
      if (!n.goal && n.wait <= 0) {
        const gx = n.x * T + 8 + (Math.random() - .5) * 4 * T, gy = n.y * T + 12 + (Math.random() - .5) * 3 * T;
        n.goal = footFree(gx, gy) ? [gx, gy] : null; n.wait = 1 + Math.random() * 3;
      }
      if (n.goal) {
        const dx = n.goal[0] - n.fx, dy = n.goal[1] - n.fy, d = Math.hypot(dx, dy), step = 1.4 * T * dt;
        if (Math.abs(dx) > Math.abs(dy)) n.dir = dx > 0 ? 'right' : 'left'; else n.dir = dy > 0 ? 'down' : 'up';
        if (d <= step || !moveBy(n, dx / d * step, dy / d * step)) n.goal = null;
        n.frame = Math.floor(P.t * 6) % 2;
      } else n.frame = 0;
    });

    g.drawImage(base, 0, 0);
    const tt = Math.floor(P.t * 8) / 8;
    g.drawImage(PX.door('open', tt, 1), gateEl.x, gateEl.y);
    const px = V.plaza.x * T, py = V.plaza.y * T;
    for (let i = 0; i < 6; i++) { const a = P.t * 2 + i, r = 4 + (i % 3) * 3; g.fillStyle = i % 2 ? '#e8f7ff' : '#8fd0ea'; g.fillRect(Math.round(px + Math.cos(a) * r), Math.round(py + Math.sin(a * 1.3) * r * .6), 1, 1); }
    for (let i = 0; i < 3; i++) { const k = (P.t * .9 + i / 3) % 1; g.fillStyle = `rgba(232,247,255,${.8 * (1 - k)})`; g.fillRect(px + (i - 1) * 2 + Math.round(Math.sin(k * 6 + i) * 1), Math.round(py - 7 - k * 6), 1, 1); }
    V.buildings.forEach(b => {
      if (b.id === 'forge') for (let i = 0; i < 3; i++) {
        const k = ((P.t * .6 + i / 3) % 1);
        g.fillStyle = `rgba(230,230,235,${.55 * (1 - k)})`; const r = 2 + k * 4;
        g.fillRect(Math.round(b.x * T + 37 + Math.sin(k * 6 + i) * 3 - r / 2), Math.round(b.y * T - 4 - k * 22), Math.round(r), Math.round(r));
      }
      if (b.id === 'star' && Math.floor(P.t * 3) % 2) { g.fillStyle = '#fff'; g.fillRect(b.x * T + 12, b.y * T + 8, 1, 1); g.fillRect(b.x * T + 36, b.y * T + 14, 1, 1); g.fillRect(b.x * T + 30, b.y * T + 2, 1, 1); }
    });
    (V.decor || []).filter(d => d.k === 'lamp').forEach(d => { g.fillStyle = `rgba(255,226,122,${.12 + .05 * Math.sin(P.t * 3 + d.x)})`; g.beginPath(); g.arc(d.x * T + 8, d.y * T - 2, 14, 0, 7); g.fill(); });
    const draws = npcs.map(n => ({ y: n.fy, f: () => { g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(n.fx, n.fy + 3, 6, 2, 0, 0, 7); g.fill(); g.drawImage(spr(n.look, n.dir, n.frame), Math.round(n.fx - 8), Math.round(n.fy - 17)); } }));
    draws.push({ y: P.fy, f: () => { g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(P.fx, P.fy + 3, 6, 2, 0, 0, 7); g.fill(); g.drawImage(spr(look, P.dir, P.frame), Math.round(P.fx - 8), Math.round(P.fy - 17)); } });
    draws.sort((a, b) => a.y - b.y).forEach(d => d.f());
    if (scroller && stage.offsetTop + stage.offsetHeight > scroller.clientHeight) {
      const target = stage.offsetTop + (P.fy * sc) - scroller.clientHeight / 2;
      scroller.scrollTop += fast ? (target - scroller.scrollTop) : (target - scroller.scrollTop) * .12;
    }
    if (W * sc > host.clientWidth) {
      const tx = P.fx * sc - host.clientWidth / 2;
      host.scrollLeft += fast ? (tx - host.scrollLeft) : (tx - host.scrollLeft) * .12;
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  if (scroller && stage.offsetTop + stage.offsetHeight > scroller.clientHeight) scroller.scrollTop = stage.offsetTop + (P.fy * sc) - scroller.clientHeight / 2;
  if (W * sc > host.clientWidth) host.scrollLeft = P.fx * sc - host.clientWidth / 2;

  return {
    destroy() { alive = false; cancelAnimationFrame(raf); removeEventListener('keydown', kd); removeEventListener('keyup', ku); removeEventListener('keydown', onEnterKey); },
    pos: () => tileOf(),
    walkTo
  };
}
