import { VILLAGE, doorTile } from './nw-data.js';

const T = 16;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function mountVillage(host, o) {
  const { PX, look, open, start, onEnter, scroller, fast } = o;
  const V = VILLAGE, W = V.cols * T, H = V.rows * T;
  const sc = clamp(Math.floor(Math.min(host.clientWidth || innerWidth, 800) / W), 1, 4);
  host.innerHTML = '';
  const stage = document.createElement('div');
  stage.style.cssText = `position:relative;width:${W * sc}px;height:${H * sc}px;margin:0 auto;cursor:pointer;border:4px solid #0a0714;box-sizing:content-box`;
  const cvs = document.createElement('canvas');
  cvs.width = W; cvs.height = H;
  cvs.style.cssText = `width:${W * sc}px;height:${H * sc}px;image-rendering:pixelated;display:block`;
  stage.appendChild(cvs);
  host.appendChild(stage);
  const g = cvs.getContext('2d');
  g.imageSmoothingEnabled = false;

  const base = PX.village(V, open);
  const blocked = new Set();
  V.buildings.forEach(b => { for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) blocked.add((b.x + i) + ',' + (b.y + j)); });
  (V.trees || []).forEach(([x, y]) => blocked.add(x + ',' + y));
  for (let y = 33; y < V.rows; y++) for (let x = 4; x <= 7; x++) blocked.add(x + ',' + y);
  const walkable = (x, y) => x >= 0 && y >= 0 && x < V.cols && y < V.rows && !blocked.has(x + ',' + y);

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

  const P = { x: start[0], y: start[1], px: start[0] * T + 8, py: start[1] * T + 8, dir: 'up', frame: 0, path: [], pending: null, t: 0 };
  const sprites = {};
  const spr = (d, f) => sprites[d + f] || (sprites[d + f] = PX.chibi(look, d, f, 1));
  const gateEl = { x: V.gate.x * T - 4, y: (V.gate.y - 2) * T - 8 };

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
  addHot('gate', '傳送門・回營地', gateEl.x, gateEl.y, 40, 56, false, '');

  function walkTo(tile, then) {
    const path = bfs([P.x, P.y], tile);
    if (!path) return false;
    P.path = path; P.pending = then || null;
    if (!path.length && then) { const f = then; P.pending = null; f(); }
    return true;
  }

  stage.addEventListener('click', e => {
    const hot = e.target.closest('.vb');
    if (hot) {
      const id = hot.dataset.bld;
      if (id === 'gate') { walkTo([V.gate.x, 32], () => onEnter({ id: 'gate' })); return; }
      const b = V.buildings.find(x => x.id === id), d = doorTile(b);
      walkTo([d[0], d[1]], () => onEnter(b));
      return;
    }
    const r = stage.getBoundingClientRect();
    const tx = Math.floor((e.clientX - r.left - 4) / (T * sc)), ty = Math.floor((e.clientY - r.top - 4) / (T * sc));
    if (walkable(tx, ty)) walkTo([tx, ty], null);
  });

  let raf = 0, last = performance.now(), alive = true;
  const speed = fast ? 400 : 5.5;
  function frame(now) {
    if (!alive || !stage.isConnected) return;
    const dt = Math.min(.1, (now - last) / 1000); last = now; P.t += dt;
    if (P.path.length) {
      const [tx, ty] = P.path[0], gx = tx * T + 8, gy = ty * T + 8;
      const dx = gx - P.px, dy = gy - P.py, d = Math.hypot(dx, dy), step = speed * T * dt;
      if (Math.abs(dx) > Math.abs(dy)) P.dir = dx > 0 ? 'right' : 'left'; else P.dir = dy > 0 ? 'down' : 'up';
      P.frame = Math.floor(P.t * 7) % 2;
      if (d <= step) {
        P.px = gx; P.py = gy; P.x = tx; P.y = ty; P.path.shift();
        if (!P.path.length && P.pending) { const f = P.pending; P.pending = null; f(); }
      } else { P.px += dx / d * step; P.py += dy / d * step; }
    } else P.frame = 0;

    g.drawImage(base, 0, 0);
    const gp = Math.floor(P.t * 8) / 8;
    g.drawImage(PX.door('open', gp, 1), gateEl.x, gateEl.y);
    V.buildings.forEach(b => {
      if (b.id === 'forge') for (let i = 0; i < 3; i++) {
        const k = ((P.t * .6 + i / 3) % 1);
        g.fillStyle = `rgba(230,230,235,${.55 * (1 - k)})`; const r = 2 + k * 4;
        g.fillRect(Math.round(b.x * T + 37 + Math.sin(k * 6 + i) * 3 - r / 2), Math.round(b.y * T - 4 - k * 22), Math.round(r), Math.round(r));
      }
      if (b.id === 'star' && Math.floor(P.t * 3) % 2) { g.fillStyle = '#fff'; g.fillRect(b.x * T + 12, b.y * T + 8, 1, 1); g.fillRect(b.x * T + 36, b.y * T + 14, 1, 1); g.fillRect(b.x * T + 30, b.y * T + 2, 1, 1); }
    });
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(P.px, P.py + 4, 6, 2, 0, 0, 7); g.fill();
    g.drawImage(spr(P.dir, P.frame), Math.round(P.px - 8), Math.round(P.py - 15));
    if (scroller) {
      const target = stage.offsetTop + (P.py * sc) - scroller.clientHeight / 2;
      scroller.scrollTop += fast ? (target - scroller.scrollTop) : (target - scroller.scrollTop) * .12;
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  if (scroller) scroller.scrollTop = stage.offsetTop + (P.py * sc) - scroller.clientHeight / 2;

  return {
    destroy() { alive = false; cancelAnimationFrame(raf); },
    pos: () => [P.x, P.y],
    walkTo
  };
}
