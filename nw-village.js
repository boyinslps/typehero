import { VILLAGE, doorTile, stageOpen } from './nw-data.js';

const T = 16;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function mountVillage(host, o) {
  const { PX, look, open, start, onEnter, scroller, fast, guide, mailN, noticeBang, forgeFx } = o;
  const V = VILLAGE, W = V.cols * T, H = V.rows * T;
  /* 老師看實機覺得角色與建築太大：比原本（桌機 4／3、手機 2）縮約 25～33%，同一畫面看得到更多地圖。
     手機用 1.5：整數 1 太小點不到、2 就是原本太大；1.5 在 2 倍螢幕上剛好是整數個裝置像素 */
  const mobile = innerWidth < 640;
  const sc = mobile ? 1.5 : ((host.clientWidth || innerWidth) >= 940 ? 3 : 2);
  host.innerHTML = '';
  if (!document.getElementById('nw-vp-css')) {
    const st = document.createElement('style'); st.id = 'nw-vp-css';
    st.textContent = '.nw-vp{scrollbar-width:none;overscroll-behavior:contain}.nw-vp::-webkit-scrollbar{display:none}@keyframes nwForgeRise{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-22px);opacity:0}}';
    document.head.appendChild(st);
  }
  host.classList.add('nw-vp');
  /* 容器要是 position:relative，stage.offsetLeft／offsetTop 才是相對於它，鏡頭才算得準 */
  host.style.cssText += ';position:relative;overflow:auto';
  const hostTop = host.getBoundingClientRect().top - (scroller ? scroller.getBoundingClientRect().top : 0);
  const availH = (scroller ? scroller.clientHeight : innerHeight) - hostTop - 64;
  host.style.height = Math.max(240, Math.min(availH, H * sc + 8)) + 'px';
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

  /* 熱區的位置（邏輯像素）：Enter 提示要避開它們，不然會蓋到郵筒、建築名牌 */
  const hots = [];
  const addHot = (id, name, x, y, w, h, wip, tag) => {
    hots.push({ x, y, w, h });
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
  let bang = null, bangShown = false, forgeBang = null, forgeEl = null, forgeOn = null, forgeAt = -9, forgeLast = false;
  V.buildings.forEach(b => {
    const isOpen = open.includes(b.id);
    const hot = addHot(b.id, b.name, b.x * T, b.y * T, 48, 48, !isOpen, isOpen ? '' : '施工中');
    /* 佈告欄有新東西：木板上方彈跳「！」（data-notice-bang）。位置在屋簷上面，不蓋住建築名字的標籤 */
    if (b.id === 'notice' && noticeBang) {
      bang = document.createElement('span');
      bang.dataset.noticeBang = '1';
      bang.className = 'px-text';
      bang.style.cssText = `display:none;position:absolute;left:50%;top:${-Math.max(26, 8 * sc)}px;margin-left:${-Math.max(10, 3 * sc)}px;width:${Math.max(20, 6 * sc)}px;text-align:center;pointer-events:none;font-weight:900;font-size:${Math.max(18, 6 * sc)}px;line-height:1.1;background:#d83a3a;color:#fff;border:2px solid #0a0714`;
      bang.textContent = '！';
      hot.appendChild(bang);
    }
    /* 鐵匠鋪開張以後：煙囪冒煙；真的有東西做得出來才冒火花＋「！」（只標要處理的，SPEC-STAGE2 §3.11） */
    if (b.id === 'forge' && forgeFx && isOpen) {
      forgeEl = document.createElement('span');
      forgeEl.dataset.forgeFx = 'idle';
      forgeEl.style.cssText = `position:absolute;left:${Math.round(37 / 48 * 100)}%;top:0;width:0;height:0;pointer-events:none`;
      for (let k = 0; k < 3; k++) { const i = document.createElement('i'); i.style.cssText = `position:absolute;left:${(k - 1) * sc * 2}px;bottom:0;width:${sc * 2}px;height:${sc * 2}px;background:#9aa0aa;animation:nwForgeRise 1.6s steps(8) infinite;animation-delay:${k * .5}s`; forgeEl.appendChild(i); }
      hot.appendChild(forgeEl);
      forgeBang = document.createElement('span');
      forgeBang.dataset.forgeBang = '1'; forgeBang.className = 'px-text';
      forgeBang.style.cssText = `display:none;position:absolute;left:50%;top:${-Math.max(26, 8 * sc)}px;margin-left:${-Math.max(10, 3 * sc)}px;width:${Math.max(20, 6 * sc)}px;text-align:center;pointer-events:none;font-weight:900;font-size:${Math.max(18, 6 * sc)}px;line-height:1.1;background:#d83a3a;color:#fff;border:2px solid #0a0714`;
      forgeBang.textContent = '！';
      hot.appendChild(forgeBang);
    }
  });
  addHot('gate', '傳送門・回舊世界', gateEl.x, gateEl.y, 40, 56, false, '');
  /* 郵筒不是建築，只是 decor：座標從 VILLAGE.decor 找，之後重排地圖不用改這裡 */
  const mb = (V.decor || []).find(d => d.k === 'mailbox');
  const mailTile = mb ? [mb.x, mb.y + 1] : null;
  let mailBadge = null, mailShown = -1;
  if (mb) {
    const hot = addHot('mail', '郵筒', mb.x * T - 1, mb.y * T - 8, 18, 24, false, '');
    mailBadge = document.createElement('span');
    mailBadge.className = 'px-text';
    mailBadge.style.cssText = `display:none;position:absolute;left:50%;top:${-Math.max(8, 4 * sc) - Math.max(20, 6 * sc)}px;transform:translateX(-50%);white-space:nowrap;pointer-events:none;font-weight:900;font-size:${Math.max(12, 3.5 * sc)}px;padding:0 8px;background:#d83a3a;color:#fff;border:2px solid #0a0714;animation:nwPulse 1.2s ease-in-out infinite`;
    hot.appendChild(mailBadge);
  }

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
  const overlayOpen = () => !!document.querySelector('#nw-acad, #nw-bag, #nw-gift, #nw-fb, #nw-title, #nw-intro, .nw-sheet');
  const onKey = (e, down) => {
    if (/INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '')) return;
    if (down && overlayOpen()) return;
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
      if (id === 'mail') { walkTo(mailTile, () => onEnter({ id: 'mail' })); return; }
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
    const lines = (n.sayOpen && stageOpen('2b')) ? n.sayOpen : n.say;
    const text = lines[n.line++ % lines.length];
    bubble.innerHTML = `<b style="color:#ffd98a">${n.name}</b><br>${text}`;
    bubble.style.display = 'block'; bubble.dataset.who = n.id;
    bubble.style.left = clamp(n.fx * sc - 130, 4, W * sc - 270) + 'px';
    bubble.style.top = Math.max(4, (n.fy - 40) * sc) + 'px';
    setTimeout(() => { if (bubble.dataset.who === n.id && performance.now() >= n.talkUntil - 50) bubble.style.display = 'none'; }, 3700);
  }

  const prompt = document.createElement('div');
  prompt.className = 'px-panel';
  prompt.style.cssText = `position:absolute;display:none;padding:2px 8px;font-size:${Math.max(12, Math.round(3.5 * sc))}px;font-weight:900;z-index:7;pointer-events:none;white-space:nowrap;transform:translateX(-50%)`;   // 地圖縮小後提示字跟著縮，不然換算成地圖格會變太寬、擠不進郵筒旁邊
  stage.appendChild(prompt);
  const REACH = 26;
  function nearest() {
    let best = null;
    const test = (x, y, d, kind, ref, label) => { const dist = Math.hypot(P.fx - x, P.fy - y); if (dist <= REACH && (!best || dist < best.dist)) best = { dist, x, y, kind, ref, label }; };
    V.buildings.forEach(b => { const t = doorTile(b); test(t[0] * T + 8, t[1] * T + 8, 0, 'bld', b, `進入「${b.name}」`); });
    test(V.gate.approach[0] * T + 8, V.gate.approach[1] * T + 14, 0, 'gate', { id: 'gate' }, '回舊世界');
    if (mailTile) test(mailTile[0] * T + 8, mailTile[1] * T + 8, 0, 'bld', { id: 'mail' }, '打開信箱');
    npcs.forEach(n => test(n.fx, n.fy, 0, 'npc', n, `跟${n.name}說話`));
    return best;
  }
  /* 提示跟著角色，哪個位置不壓到熱區（郵筒、建築、名牌）就放哪裡。郵筒站位上面是郵筒、下面是委託板，只剩旁邊放得下 */
  let promptText = '';
  function showPrompt(near) {
    if (!near) { prompt.style.display = 'none'; P.near = null; return; }
    P.near = near;
    if (promptText !== near.label) { promptText = near.label; prompt.textContent = `Enter：${near.label}`; }
    prompt.style.display = 'block';
    const pw = prompt.offsetWidth / sc, ph = prompt.offsetHeight / sc;
    /* 候選位置：腳下、頭上、右邊、左邊。名牌從熱區上緣往上凸出約 5 格像素，所以熱區上緣多算 5 */
    const spot = (x, y) => ({ cx: clamp(x, pw / 2 + 1, W - pw / 2 - 1), y: clamp(y, 0, H - ph) });
    const hit = c => hots.some(h => c.cx - pw / 2 < h.x + h.w && c.cx + pw / 2 > h.x && c.y < h.y + h.h && c.y + ph > h.y - 5);
    const cand = [spot(P.fx, P.fy + 6), spot(P.fx, P.fy - 19 - ph), spot(P.fx + pw / 2 + 10, P.fy - 12), spot(P.fx - pw / 2 - 10, P.fy - 12)];
    const { cx, y } = cand.find(c => !hit(c)) || cand[0];
    prompt.style.left = (cx * sc) + 'px'; prompt.style.top = (y * sc) + 'px';
  }
  const act = () => {
    if (document.getElementById('nw-bag') || !P.near) return;
    const n = P.near;
    if (n.kind === 'npc') talk(n.ref); else onEnter(n.ref);
  };
  const onEnterKey = e => { if (e.key === 'Enter' && !overlayOpen() && !/INPUT|TEXTAREA|SELECT|BUTTON/.test((e.target && e.target.tagName) || '')) { e.preventDefault(); act(); } };
  addEventListener('keydown', onEnterKey);

  function drawGuide() {
    if (P.t - gT > .3) { gT = P.t; const d = doorTile(gB); gPath = bfs(tileOf(), [d[0], d[1]]) || []; }
    let prev = tileOf();
    gPath.forEach((c, i) => {
      const ang = Math.atan2(c[1] - prev[1], c[0] - prev[0]); prev = c;
      if (i >= gPath.length - 1) return;
      const a = .3 + .7 * Math.max(0, Math.sin(P.t * 5 - i * .7));
      g.save(); g.translate(c[0] * T + 8, c[1] * T + 8); g.rotate(ang);
      g.fillStyle = `rgba(255,214,74,${a})`; g.strokeStyle = `rgba(60,36,8,${a})`; g.lineWidth = 1;
      g.beginPath(); g.moveTo(-4, -5); g.lineTo(3, 0); g.lineTo(-4, 5); g.lineTo(-2, 0); g.closePath(); g.fill(); g.stroke();
      g.restore();
    });
    const bob = Math.round(Math.sin(P.t * 5) * 2), cx = gB.x * T + 24, cy = gB.y * T - 8 + bob;
    g.fillStyle = '#ffd24a'; g.strokeStyle = '#3c2408'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(cx - 6, cy - 7); g.lineTo(cx + 6, cy - 7); g.lineTo(cx, cy + 1); g.closePath(); g.fill(); g.stroke();
  }

  function moveBy(ent, dx, dy) {
    let moved = false;
    if (dx && footFree(ent.fx + dx, ent.fy)) { ent.fx += dx; moved = true; }
    if (dy && footFree(ent.fx, ent.fy + dy)) { ent.fy += dy; moved = true; }
    return moved;
  }

  const gB = guide ? V.buildings.find(b => b.id === guide) : null;
  let gPath = [], gT = -9;
  let raf = 0, last = performance.now(), alive = true;
  const speed = fast ? 500 : 6 * T;
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
    if (mailBadge && mailN) { const n = mailN(); if (n !== mailShown) { mailShown = n; mailBadge.style.display = n > 0 ? 'block' : 'none'; mailBadge.textContent = `✉ ${n}`; } }

    if (forgeEl) {
      if (P.t - forgeAt > .4) { forgeAt = P.t; forgeLast = !!forgeFx(); }   // 每 0.4 秒算一次就夠，不要每個畫面都掃一遍配方
      const can = forgeLast;
      if (can !== forgeOn) { forgeOn = can; forgeEl.dataset.forgeFx = can ? 'can' : 'idle'; forgeEl.querySelectorAll('i').forEach(i => { i.style.background = can ? '#ff9a3c' : '#9aa0aa'; }); forgeBang.style.display = can ? 'block' : 'none'; }
      if (can) forgeBang.style.transform = `translateY(${Math.round(Math.sin(P.t * 5) * -2 * sc)}px)`;
    }
    if (bang) {
      const on = !!noticeBang();
      if (on !== bangShown) { bangShown = on; bang.style.display = on ? 'block' : 'none'; }
      if (on) bang.style.transform = `translateY(${Math.round(Math.sin(P.t * 5) * -2 * sc)}px)`;
    }

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
    if (gB) drawGuide();
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
    /* 鏡頭只在角色走動（和停下後的 0.9 秒）時跟著；站著不動時讓玩家自己滑動地圖也不會被拉回來。
       目標超出範圍時瀏覽器會自己夾在邊緣，所以碰到地圖邊緣就停。 */
    if (P.moving) camHold = .9; else camHold = Math.max(0, camHold - dt);
    if (camHold > 0) {
      const [tx, ty] = camTarget(), k = fast ? 1 : .12;
      host.scrollLeft += (tx - host.scrollLeft) * k;
      host.scrollTop += (ty - host.scrollTop) * k;
    }
    mini.draw();
    raf = requestAnimationFrame(frame);
  }
  const camTarget = () => [stage.offsetLeft + 4 + P.fx * sc - host.clientWidth / 2, stage.offsetTop + 4 + P.fy * sc - host.clientHeight / 2];
  let camHold = 0;
  const camJump = () => { const [tx, ty] = camTarget(); host.scrollLeft = tx; host.scrollTop = ty; };
  /* 傳送：直接站到那棟的門口，停在那裡（不自動打開）。手機沒有 Enter，但名牌就在眼前，點一下就進去 */
  function teleport(id) {
    const b = V.buildings.find(x => x.id === id);
    if (!b) return false;
    const d = doorTile(b);
    P.fx = d[0] * T + 8; P.fy = d[1] * T + 12; P.path = []; P.then = null; P.moving = false;
    bubble.style.display = 'none';
    camJump();
    return true;
  }

  /* ── 小地圖：右下角固定，點建築＝傳送到門口，點空地不做事 ── */
  function buildMini() {
    const ms = mobile ? 3 : 5, mw = V.cols * ms, mh = V.rows * ms;
    const wrap = document.createElement('div');
    wrap.id = 'nw-minimap-wrap';
    wrap.style.cssText = 'position:fixed;right:8px;bottom:8px;z-index:30;padding:3px;background:#0a0714;border:2px solid #f0eee8;box-shadow:0 3px 0 #000';
    const c = document.createElement('canvas');
    c.id = 'nw-minimap'; c.width = mw; c.height = mh; c.dataset.s = ms;
    c.setAttribute('aria-label', '小地圖：點建築，會傳送到它的門口');
    c.style.cssText = `width:${mw}px;height:${mh}px;image-rendering:pixelated;display:block;cursor:pointer;touch-action:manipulation`;
    wrap.appendChild(c);
    host.appendChild(wrap);
    const g2 = c.getContext('2d');
    const base = document.createElement('canvas'); base.width = mw; base.height = mh;
    const b2 = base.getContext('2d'), R = (x, y, w, h, col) => { b2.fillStyle = col; b2.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    R(0, 0, mw, mh, '#4a9a3a');
    (V.zones || []).forEach(z => R(z.x0 * ms, z.y0 * ms, (z.x1 - z.x0 + 1) * ms, (z.y1 - z.y0 + 1) * ms, z.col));
    b2.fillStyle = '#bdb5a4'; b2.beginPath(); b2.arc(V.plaza.x * ms, V.plaza.y * ms, (V.plaza.r || 52) / T * ms, 0, 7); b2.fill();
    (V.roads || []).forEach(pts => { for (let i = 0; i < pts.length - 1; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * ms); for (let k = 0; k <= n; k++) R((x0 + (x1 - x0) * k / n + .5) * ms - 1, (y0 + (y1 - y0) * k / n + .5) * ms - 1, 2, 2, '#c9a66b'); } });
    const pd = V.pond, ck = V.creek, cl = V.cliff;
    if (pd) { b2.fillStyle = '#3ca4d4'; b2.beginPath(); b2.ellipse((pd.x0 + pd.x1 + 1) / 2 * ms, (pd.y0 + pd.y1 + 1) / 2 * ms, (pd.x1 - pd.x0 + 1) / 2 * ms, (pd.y1 - pd.y0 + 1) / 2 * ms, 0, 0, 7); b2.fill(); }
    if (ck) { R(ck.x0 * ms, ck.y0 * ms, (ck.x1 - ck.x0 + 1) * ms, (ck.y1 - ck.y0 + 1) * ms, '#3ca4d4'); R(ck.x0 * ms - 1, ck.bridge.y0 * ms, (ck.x1 - ck.x0 + 1) * ms + 2, (ck.bridge.y1 - ck.bridge.y0 + 1) * ms, '#a8763c'); }
    if (cl) { R(0, cl.y * ms, mw, ms, '#6a645a'); R(cl.stairs.x0 * ms, cl.y * ms, (cl.stairs.x1 - cl.stairs.x0 + 1) * ms, ms, '#c4bcab'); }
    const gt = V.gateBlock; R(gt.x0 * ms, gt.y0 * ms, (gt.x1 - gt.x0 + 1) * ms, (gt.y1 - gt.y0 + 1) * ms, '#7b4dff'); R(gt.x0 * ms + 1, gt.y0 * ms + 1, (gt.x1 - gt.x0 + 1) * ms - 2, 2, '#d9ccff');
    V.buildings.forEach(b => { R(b.x * ms, b.y * ms, 3 * ms, 3 * ms, '#0a0714'); R(b.x * ms + 1, b.y * ms + 1, 3 * ms - 2, 3 * ms - 2, open.includes(b.id) ? '#e8b64c' : '#6a6f7a'); });
    const tileAt = e => { const r = c.getBoundingClientRect(); return [(e.clientX - r.left) / ms, (e.clientY - r.top) / ms]; };
    /* 點的位置落在建築外框加 1 格的範圍內才算點到；兩棟都沾到就選中心比較近的 */
    const bldAt = e => {
      const [tx, ty] = tileAt(e);
      return V.buildings.filter(b => tx >= b.x - 1 && tx <= b.x + 4 && ty >= b.y - 1 && ty <= b.y + 4)
        .sort((a, b) => Math.hypot(tx - a.x - 1.5, ty - a.y - 1.5) - Math.hypot(tx - b.x - 1.5, ty - b.y - 1.5))[0];
    };
    c.addEventListener('click', e => {
      if (overlayOpen()) return;
      const b = bldAt(e);
      if (b) teleport(b.id);
    });
    c.addEventListener('mousemove', e => { c.style.cursor = bldAt(e) ? 'pointer' : 'default'; });
    return {
      wrap,
      draw() {
        g2.drawImage(base, 0, 0);
        /* 目前畫面照到的範圍 */
        const vx = (host.scrollLeft - stage.offsetLeft - 4) / sc / T * ms, vy = (host.scrollTop - stage.offsetTop - 4) / sc / T * ms;
        g2.strokeStyle = 'rgba(240,238,232,.85)'; g2.lineWidth = 1;
        g2.strokeRect(Math.round(vx) + .5, Math.round(vy) + .5, Math.round(host.clientWidth / sc / T * ms), Math.round(host.clientHeight / sc / T * ms));
        const mx = Math.floor(P.fx / T * ms), my = Math.floor(P.fy / T * ms);
        g2.fillStyle = '#0a0714'; g2.fillRect(mx - 2, my - 2, 5, 5);
        g2.fillStyle = Math.floor(P.t * 3) % 2 ? '#ffd98a' : '#e8b64c'; g2.fillRect(mx - 1, my - 1, 3, 3);
      },
      remove() { wrap.remove(); }
    };
  }
  const mini = buildMini();
  raf = requestAnimationFrame(frame);
  camJump();

  return {
    destroy() { alive = false; mini.remove(); cancelAnimationFrame(raf); removeEventListener('keydown', kd); removeEventListener('keyup', ku); removeEventListener('keydown', onEnterKey); },
    pos: () => tileOf(),
    walkTo,
    teleport,
    /* 給測試與除錯用：地板箭頭現在算出來的路 */
    guidePath: () => gPath
  };
}
