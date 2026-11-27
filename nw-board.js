import { MONSTERS, REGIONS, ELEM, STATUS, COLOR_HEX, COLOR_NAME, BIGMAP, boardQuests } from './nw-data.js';

const CSS = `
.nwbd-wrap{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:14px;align-items:start}
@media (max-width:860px){.nwbd-wrap{grid-template-columns:1fr}}
.nwbd-board{position:relative;padding:58px 16px 18px;border:6px solid #1c1008;box-shadow:inset 0 0 0 3px #8a6a3a,inset 0 0 0 6px #2a1a0c;min-height:480px;clip-path:polygon(0 6px,6px 6px,6px 0,calc(100% - 6px) 0,calc(100% - 6px) 6px,100% 6px,100% calc(100% - 6px),calc(100% - 6px) calc(100% - 6px),calc(100% - 6px) 100%,6px 100%,6px calc(100% - 6px),0 calc(100% - 6px))}
.nwbd-sign{position:absolute;left:16px;top:10px;transform:rotate(-1deg);padding:5px 22px;font-weight:900;font-size:1.15em;color:#ffe9b0;text-shadow:2px 2px 0 #000;background:#4a2f16;border:4px solid #1c1008;box-shadow:inset 0 0 0 2px #8a6a3a;white-space:nowrap}
.nwbd-sign::before,.nwbd-sign::after{content:"";position:absolute;top:-14px;width:4px;height:12px;background:#a89060;border:1px solid #1c1008}
.nwbd-sign::before{left:16%}.nwbd-sign::after{right:16%}
.nwbd-tabs{position:absolute;right:16px;top:12px;display:flex;gap:6px}
.nwbd-tab{padding:4px 12px;font-weight:900;color:#ffe9b0;background:#4a2f16;border:3px solid #1c1008;box-shadow:inset 0 0 0 2px #6a4a2a;text-shadow:1px 1px 0 #000;cursor:pointer;transform:rotate(1deg);font-family:inherit}
.nwbd-tab[aria-pressed="true"]{background:#e8b64c;color:#2a1a00;text-shadow:none}
.nwbd-sheets{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:flex-start;justify-content:center}
.qs-wrap{filter:drop-shadow(3px 4px 0 rgba(0,0,0,.55));transition:transform .12s;margin:var(--m);transform:rotate(var(--r)) translateY(var(--dy))}
.qs-wrap:hover{transform:rotate(0) translateY(-4px)}
.qs-wrap.on{transform:rotate(0) translateY(-6px) scale(1.05);filter:drop-shadow(2px 0 0 #ffd24a) drop-shadow(-2px 0 0 #ffd24a) drop-shadow(0 2px 0 #ffd24a) drop-shadow(0 -2px 0 #ffd24a) drop-shadow(4px 6px 0 rgba(0,0,0,.6));z-index:3}
.nwbd-goal{position:relative;z-index:2;margin:0 0 8px;padding:5px 10px;background:#fff2c4;color:#4a2a08;border:3px solid #d83a3a;font-size:.9em;line-height:1.4}
.qs-wrap.goal .qs{outline:3px dashed #d83a3a;outline-offset:2px}
.qs-goal{position:absolute;top:-10px;left:-8px;z-index:4;background:#d83a3a;color:#fff;font-weight:900;font-size:12px;padding:2px 8px;border:2px solid #1c1008;transform:rotate(-6deg);animation:qsGoal 1s steps(2) infinite}
@keyframes qsGoal{50%{background:#ff6a4a}}
.qs{position:relative;display:block;width:var(--w);padding:14px 12px 12px;border:0;text-align:left;cursor:pointer;color:#3a2814;font-family:inherit;font-weight:800}
.qs-pin{position:absolute;left:50%;top:-6px;transform:translateX(-50%);z-index:2}
.qs-stars{font-size:1.05em;letter-spacing:.06em;color:#9a2a1a;text-shadow:1px 1px 0 rgba(0,0,0,.2)}
.qs-stars i{color:#b8a888;font-style:normal}
.qs-pic{display:block;margin:4px auto 2px;filter:contrast(1.05)}
.qs-name{font-size:1.15em;font-weight:900;line-height:1.2;border-top:2px dashed #8a6a44;padding-top:4px;margin-top:2px}
.qs-meta{font-size:.82em;color:#5a4128}
.qs-stamp{position:absolute;right:8px;top:30px;transform:rotate(-16deg);border:3px solid #a82a1a;color:#a82a1a;padding:0 6px;font-weight:900;font-size:.85em;opacity:.8}
.qs.lock{color:#6a6458;filter:grayscale(1)}
.nwbd-side{position:sticky;top:76px;padding:12px}
.nwbd-mapbox{position:relative;border:4px solid #0a0714;background:#2c6fb8;line-height:0}
.nwbd-mapbox canvas{width:100%;display:block;image-rendering:pixelated;image-rendering:crisp-edges}
.nwbd-info{margin:10px 0;line-height:1.55;font-size:.95em}
.nwbd-room{display:flex;align-items:center;gap:10px;width:100%;padding:8px 12px;margin-bottom:8px;background:#e8d8b0;color:#3a2814;border:3px solid #1c1008;box-shadow:inset 0 0 0 2px #b89868;font-weight:800;text-align:left}
.nwbd-room.me{background:#f0e0a8;outline:3px solid #ffd24a}
/* 一次 4 張（BOARD_ROT）：2 欄排好、位置不跳；寬度跟著欄走，手機 390 不橫向捲 */
.nwbd-sheets.rot{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 8px;justify-items:center}
.nwbd-sheets.rot .qs-wrap{width:100%;max-width:196px;margin:0}
.nwbd-sheets.rot .qs{width:100%}
.nwbd-sheets.rot .qs-pic{max-width:100%}
.qs-role{display:inline-block;margin:0 0 4px -4px;padding:1px 12px 1px 8px;font-size:12px;font-weight:900;border:2px solid #1c1008;color:#2a1a08;white-space:nowrap}
.qs-role.easy{background:#a8c498}
.qs-role.mid{background:#f0dc98}
.qs-role.hard{background:#c8765a;color:#fff;padding-right:18px;clip-path:polygon(0 0,100% 0,calc(100% - 8px) 50%,100% 100%,0 100%)}
.qs-seal{position:absolute;right:8px;top:12px;width:18px;height:18px;image-rendering:pixelated}
.nwbd-bar{position:relative;z-index:2;display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;margin:0 0 10px}
.nwbd-prog{flex:1 1 180px;min-width:0;padding:5px 10px;background:#f4e6b8;color:#4a2a08;border:3px solid #b8903a;font-size:.88em;font-weight:800;line-height:1.4}
.nwbd-swap{flex:none;max-width:100%;padding:8px 12px;font-size:.95em;white-space:normal}
.nwbd-ask{position:fixed;inset:0;z-index:90;display:grid;place-items:center;padding:16px;background:rgba(9,8,18,.78)}
.qs-newtag{position:absolute;top:-14px;right:-4px;z-index:5;max-width:150px;background:#ffe27a;color:#4a2a08;font-weight:900;font-size:12px;padding:2px 8px;border:2px solid #1c1008;transform:rotate(4deg)}
.qs-wrap.new{animation:qsDrop .35s steps(4)}
.qs-wrap.new .qs-pin{animation:qsPinSnap .35s steps(3) .35s backwards}
@keyframes qsDrop{from{transform:translateY(-24px) rotate(-8deg) scale(1.1)}}
@keyframes qsPinSnap{from{margin-top:-10px;opacity:.4}}
@media (prefers-reduced-motion:reduce){.qs-wrap.new,.qs-wrap.new .qs-pin{animation:none}}
.nwbd-locks{margin-top:12px;display:flex;flex-direction:column;gap:6px}
.nwbd-lock{padding:5px 10px;background:#cdbd98;color:#5a4a30;border:2px dashed #6a5434;font-size:.85em;font-weight:800;transform:rotate(-.4deg)}
.nwbd-note{position:relative;z-index:2;margin:0 0 8px;padding:5px 10px;background:#f4e6b8;color:#4a2a08;border:3px solid #b8903a;font-size:.88em;line-height:1.4}
.nwbd-role{margin:2px 0 6px;font-weight:800;line-height:1.5}
`;


const BLD_NAME = { academy: '教學大樓', forge: '鐵匠鋪' };
const ROLE = {
  easy: ['🍃', '輕鬆', '比較簡單，放心打、拿材料'],
  mid: ['🎯', '剛好', '跟你打過的差不多'],
  hard: ['🔥', '挑戰', '你還沒打過的星級，打贏就開放下一顆星']
};
const SEAL = ['..rr..', '.rRRr.', 'rRrrRr', 'rRrrRr', '.rRRr.', '..rr..'];
const hash = s => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const rnd = (h, i) => ((Math.sin(h * 0.001 + i * 12.9898) * 43758.5453) % 1 + 1) % 1;

function jagged(h) {
  const pts = [], r = i => rnd(h, i);
  for (let i = 0; i <= 8; i++) pts.push(`${(i * 12.5).toFixed(1)}% ${(r(i) * 2.6).toFixed(1)}%`);
  const cut = 5 + r(20) * 5;
  for (let i = 1; i <= 5; i++) pts.push(`${(100 - r(30 + i) * 2.4).toFixed(1)}% ${(i * 18).toFixed(1)}%`);
  for (let i = 8; i >= 0; i--) pts.push(`${(i * 12.5).toFixed(1)}% ${(100 - r(40 + i) * 3.2 - (i === 8 && r(50) > .5 ? cut : 0)).toFixed(1)}%`);
  for (let i = 5; i >= 1; i--) pts.push(`${(r(60 + i) * 2.2).toFixed(1)}% ${(i * 18).toFixed(1)}%`);
  return `polygon(${pts.join(',')})`;
}

export function mountBoard(host, env) {
  const { PX, NW } = env;
  if (!document.getElementById('nwbd-css')) { const st = document.createElement('style'); st.id = 'nwbd-css'; st.textContent = CSS; document.head.appendChild(st); }
  const rot = Array.isArray(env.cards);   // BOARD_ROT 開著：newworld.js 傳 4 張現成的單子；關著就跟以前一樣全部列出
  const quests = rot ? env.cards : boardQuests(NW, env.today);
  const goal = env.goal || null, isGoal = q => rot ? !!q.tag : !!goal && !q.locked && goal.match(q);
  const live = quests;
  const pickSel = () => rot ? ((live.find(q => q.tag === 'quest' || q.tag === 'path') || live.find(q => q.tag) || live.find(q => q.role === 'hard') || live[0] || quests[0]) || {}).id
    : ((quests.find(isGoal) || quests.find(q => !q.locked)) || {}).id;
  let tab = 'quests', sel = env.selected && quests.find(q => q.id === env.selected && !q.locked) ? env.selected : pickSel();
  let rooms = [], raf = 0, alive = true, poll = 0;
  const wood = PX.wood().toDataURL(), pinURL = PX.pin('#d83a3a').toDataURL();
  const papers = ['#e8d8b0', '#e0cfa0', '#ead9b8', '#dccb9a'].map(c => PX.paper(c).toDataURL());
  const map = PX.bigMap(BIGMAP);
  const inks = {};
  const ink = (mk, sc) => inks[mk + sc] || (inks[mk + sc] = PX.ink('monster', mk, sc));

  host.innerHTML = `
    <div class="nwbd-wrap">
      <div class="nwbd-board" id="nwbd-board" style="background-image:url(${wood});background-size:144px 144px;image-rendering:pixelated">
        <div class="nwbd-sign">冒險者公會・委託板</div>
        ${goal ? `<div class="nwbd-goal">📌 現在的任務：<b>${goal.text}</b>　${rot && goal.building && goal.building !== 'board' ? `→ 去村莊的「${BLD_NAME[goal.building] || '建築'}」` : '→ 選有紅色「任務目標」標籤的委託單'}</div>` : ''}
        ${rot ? [env.cleared ? '<div class="nwbd-note">🏆 迷霧森林的委託你都打完了！新的地方還在蓋。</div>' : '', ...(env.notes || []).map(t => `<div class="nwbd-note">${t}</div>`), env.evAny ? '<div class="nwbd-note">🎪 活動中：打贏哪一張都算</div>' : ''].join('') : ''}
        ${rot ? `<div class="nwbd-bar">${env.left > 0 ? `<div class="nwbd-prog" data-prog>還剩 ${env.left} 張，打完就送來新的一批！</div>` : ''}<button class="px-btn nwbd-swap" data-swap disabled>🔄 刷新</button></div>` : ''}
        <div class="nwbd-tabs"><button class="nwbd-tab" data-tab="quests">📜 委託單</button><button class="nwbd-tab" data-tab="rooms">🚪 房間 <span id="nwbd-rc">0</span></button></div>
        <div class="nwbd-sheets${rot ? ' rot' : ''}" id="nwbd-list"></div>
      </div>
      <div class="px-panel nwbd-side">
        <div class="px-title" style="font-size:1.1em;margin-bottom:6px">🗺 狩獵地點</div>
        <div class="nwbd-mapbox"><canvas id="nwbd-cv"></canvas></div>
        <div class="nwbd-info px-text" id="nwbd-info"></div>
        <div class="px-text" id="nwbd-bell" style="display:none;margin-bottom:6px;color:#ffd98a">⏰ 快下課了，這場可能打不完喔！打不完也會照打掉的血給獎勵。</div>
        <button class="px-btn gold" style="width:100%;padding:12px;font-size:1.15em" data-go disabled>⚔ 狩獵</button>
      </div>
    </div>`;
  const list = host.querySelector('#nwbd-list'), info = host.querySelector('#nwbd-info'), go = host.querySelector('[data-go]');
  const cv = host.querySelector('#nwbd-cv'), g = cv.getContext('2d');
  const cw = Math.max(1, Math.floor((cv.parentElement.clientWidth || 420) / BIGMAP.w)) * BIGMAP.w;
  cv.width = cw; cv.height = Math.round(cw * BIGMAP.h / BIGMAP.w);
  g.imageSmoothingEnabled = false;

  const changed = env.changed || {};
  const TAG = { quest: '📌 任務目標', path: '📌 往任務前進', event: '🎪 活動' };
  const sealOf = () => {
    const c = document.createElement('canvas'); c.width = 6; c.height = 6; c.className = 'qs-seal'; c.setAttribute('aria-hidden', 'true');
    const x = c.getContext('2d'); SEAL.forEach((row, y) => [...row].forEach((ch, i) => { if (ch !== '.') { x.fillStyle = ch === 'R' ? '#d8503a' : '#8a1e12'; x.fillRect(i, y, 1, 1); } }));
    return c;
  };
  const qOf = id => quests.find(q => q.id === id);
  const spotOf = q => BIGMAP.spots[q.rk + ':' + q.mk];

  function renderSheets() {
    host.querySelectorAll('.nwbd-tab').forEach(b => b.setAttribute('aria-pressed', b.dataset.tab === tab));
    if (tab === 'rooms') { renderRooms(); return; }
    list.innerHTML = '';
    quests.forEach((q, i) => {
      const h = hash(q.id), wrap = document.createElement('div');
      wrap.className = 'qs-wrap' + (q.id === sel ? ' on' : '');
      wrap.style.cssText = `--r:${((rnd(h, 1) - .5) * 7).toFixed(1)}deg;--dy:${Math.round(rnd(h, 2) * 14)}px;--m:${Math.round(rnd(h, 3) * 8)}px ${Math.round(rnd(h, 4) * 12)}px`;
      const b = document.createElement('button');
      b.className = 'qs' + (q.locked ? ' lock' : ''); b.dataset.q = q.id;
      b.style.cssText = `--w:${150 + Math.round(rnd(h, 5) * 46)}px;background-image:url(${papers[h % 4]});background-size:96px 96px;image-rendering:pixelated;clip-path:${jagged(h)}`;
      if (q.locked) {
        const r = REGIONS[q.rk];
        b.innerHTML = `<div class="qs-stars"><i>☆☆☆☆☆</i></div><div class="qs-name">${r.icon} ${r.name}的委託</div><div class="qs-meta">🔒 打倒${REGIONS[r.needs].name} ★5 就會出現</div>`;
      } else {
        const m = MONSTERS[q.mk];
        const rb = rot ? `<div class="qs-role ${q.role}">${ROLE[q.role][0]} ${ROLE[q.role][1]}</div>` : '';
        b.innerHTML = `${rb}<div class="qs-stars">${'★'.repeat(q.star)}<i>${'☆'.repeat(5 - q.star)}</i></div>
          <canvas class="qs-pic" width="120" height="96"></canvas>
          <div class="qs-name">討伐 ${m.name}</div><div class="qs-meta">Lv ${q.lv}・${REGIONS[q.rk].name}</div>${q.done ? '<div class="qs-stamp">已討伐</div>' : ''}${q.wait ? '<div class="qs-stamp" style="top:56px;color:#5a4128;border-color:#5a4128">明天再來</div>' : ''}`;
        const c = b.querySelector('canvas'), x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(ink(q.mk, 3), 0, 0);
        c.style.cssText = 'display:block;margin:4px auto 2px;width:120px;height:96px;image-rendering:pixelated';
      }
      const pin = document.createElement('img'); pin.className = 'qs-pin'; pin.src = pinURL; pin.style.cssText = 'width:27px;image-rendering:pixelated'; pin.alt = '';
      wrap.appendChild(b); wrap.appendChild(pin);
      if (isGoal(q)) { wrap.classList.add('goal'); const tg = document.createElement('div'); tg.className = 'qs-goal'; tg.textContent = rot ? TAG[q.tag] + (q.both ? '＋🎪 活動' : '') : '📌 任務目標'; wrap.appendChild(tg); }
      if (rot && q.role === 'hard' && !q.locked) { b.appendChild(sealOf()); }
      if (rot && changed[q.key]) {
        wrap.classList.add('new');
        const nt = document.createElement('div'); nt.className = 'qs-newtag'; nt.textContent = changed[q.key] === 'ladder' ? '🪜 換一隻比較好打的' : '✨ 新的！'; wrap.appendChild(nt);
      }
      list.appendChild(wrap);
    });
    if (rot && (env.locks || []).length) {
      const box = document.createElement('div'); box.className = 'nwbd-locks'; box.style.gridColumn = '1 / -1'; box.style.width = '100%';
      box.innerHTML = env.locks.map(l => `<div class="nwbd-lock">🔒 ${REGIONS[l.rk].name}：打倒${REGIONS[l.needs].name} ★5 就會出現</div>`).join('');
      list.appendChild(box);
    }
  }

  function renderRooms() {
    list.innerHTML = rooms.length ? '' : '<div class="px-text" style="padding:30px 10px;text-align:center;line-height:1.8">現在沒有人開房間。<br>選一張委託單按「狩獵」，就會開一間自己的房間，同學就看得到。</div>';
    rooms.forEach(r => {
      const m = MONSTERS[r.mk], row = document.createElement('div');
      row.className = 'nwbd-room' + (r.me ? ' me' : ''); row.style.cssText = `transform:rotate(${((rnd(hash(r.id), 1) - .5) * 2).toFixed(1)}deg)`;
      row.innerHTML = `<canvas width="60" height="48" style="width:60px;height:48px;image-rendering:pixelated;flex:none"></canvas>
        <div style="flex:1;min-width:0"><div>討伐 ${m.name} ${'★'.repeat(r.star)}</div><div style="font-size:.82em;color:#5a4128">房主：${r.host}（${r.cls}）・${r.n}/4 人・${r.state === 'fighting' ? '狩獵中' : '等待中'}${r.me ? '・你的房間' : ''}</div></div>
        <span class="px-chip" style="color:#5a4128;border-color:#5a4128;background:transparent">${r.me ? '你' : '組隊施工中'}</span>`;
      const c = row.querySelector('canvas'), x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(ink(r.mk, 1), 10, 8, 40, 32);
      list.appendChild(row);
    });
  }

  /* 刷新：不是任務目標的單子整批換新、補滿 4 張。每天第 1 次免費，之後收字元（一天最多 3 次）。
     能不能按、要多少字元由 newworld.js 算（swapState 是純函式）；按鈕在處理完之前一直灰著，連點不會成交兩次 */
  const swapBtn = host.querySelector('[data-swap]');
  let busy = false;
  function updateSwap() {
    if (!swapBtn) return;
    const st = env.swapInfo ? env.swapInfo() : { ok: false, why: 'none', cost: 0, coins: 0 };
    let txt, on = false;
    if (st.why === 'used') txt = '🔄 今天刷新完了，明天再來';
    else if (st.why === 'none') txt = '🔄 沒有可以換的單子';
    else if (st.cost > 0 && st.coins < st.cost) txt = `🔄 刷新要 ${st.cost} 字元`;
    else { on = true; txt = st.cost > 0 ? `🔄 刷新（🪙 ${st.cost}）` : '🔄 刷新（今天免費 1 次）'; }
    swapBtn.disabled = !on || busy; swapBtn.textContent = txt; swapBtn.dataset.cost = st.cost || 0; swapBtn.dataset.why = on ? '' : (st.why || 'coins');
  }
  function askSwap(cost) {
    return new Promise(res => {
      const ov = document.createElement('div'); ov.className = 'nwbd-ask'; ov.id = 'nwbd-ask';
      ov.innerHTML = `<div class="px-panel text-center" style="max-width:380px;width:100%;padding:18px"><div class="px-title" style="font-size:1.3em">🔄 刷新</div>
        <p class="px-text mt-3" style="line-height:1.7;text-align:left">花 ${cost} 字元，把板上的單子全部換新？<br>📌 任務單會留著。</p>
        <div class="mt-4 flex gap-3 justify-center flex-wrap"><button class="px-btn gold" data-ask-yes>換新</button><button class="px-btn" data-ask-no>不要</button></div></div>`;
      const done = v => { ov.remove(); res(v); };
      ov.addEventListener('click', e => { if (e.target.closest('[data-ask-yes]')) done(true); else if (e.target.closest('[data-ask-no]') || e.target === ov) done(false); });
      document.body.appendChild(ov);
    });
  }
  function renderInfo() {
    const q = qOf(sel);
    updateSwap();
    if (!q || q.locked) { info.innerHTML = '<span style="color:#aab0d8">選一張委託單，這裡會顯示魔物住在哪裡。</span>'; go.disabled = true; return; }
    const m = MONSTERS[q.mk], sp = spotOf(q), hits = [...new Set(m.attacks.filter(a => a.status).map(a => STATUS[a.status]))];
    const drops = m.drops.map(d => `<span style="color:${COLOR_HEX[d[2]]}">■</span>${d[1]}`).join('　');
    info.innerHTML = `<div class="px-title" style="font-size:1.2em">${m.name} ${ELEM[m.elem]} <span style="font-size:.8em;color:#aab0d8">Lv ${q.lv}・${'★'.repeat(q.star)}</span></div>
      ${rot ? `<div class="nwbd-role" data-role>${ROLE[q.role][0]} ${ROLE[q.role][1]}：${env.cleared && q.role === 'hard' ? '還沒打贏過的強敵，打贏看看！' : ROLE[q.role][2]}${q.tag ? `<br>${q.tag === 'event' ? '🎪 活動要打這張' : q.tag === 'path' ? '📌 往任務前進' : '📌 任務要打這張'}` : ''}</div>` : ''}
      <div>📍 ${REGIONS[q.rk].name}・${sp ? sp[2] : ''}　打：<b>${m.ask === 'zhuyin' ? '注音' : '詞語'}</b></div>
      <div>${m.lean}　打中你會：${hits.length ? hits.join('、') : '沒有特別的'}</div>
      <div style="color:#ffd98a">${m.sp}</div>
      <div style="font-size:.88em">會掉：${drops}</div>`;
    go.disabled = !!q.wait;
    /* 這節剩不到 3 分鐘：只提醒，不擋（SPEC-BALANCE-V2 §6.3）。沒有下課時間的資料就不顯示 */
    const left = env.classLeft ? env.classLeft() : null;
    host.querySelector('#nwbd-bell').style.display = left != null && left < 180 && left > -600 ? 'block' : 'none';
    if (q.wait) info.innerHTML += '<div style="color:#ffd98a;margin-top:4px">今天已經開了新的一星，明天再來挑戰這一星！打贏過的星級隨時可以重打。</div>';
  }

  const view = { cx: BIGMAP.w / 2, cy: BIGMAP.h / 2, z: 1 };
  function frame(now) {
    if (!alive || !host.isConnected) return;
    const q = qOf(sel), sp = q && !q.locked ? spotOf(q) : null, t = now / 1000;
    const tz = sp ? 2 : 1, tcx = sp ? sp[0] : BIGMAP.w / 2, tcy = sp ? sp[1] : BIGMAP.h / 2;
    view.z += (tz - view.z) * .1; view.cx += (tcx - view.cx) * .1; view.cy += (tcy - view.cy) * .1;
    const vw = BIGMAP.w / view.z, vh = BIGMAP.h / view.z;
    const vx = Math.max(0, Math.min(BIGMAP.w - vw, view.cx - vw / 2)), vy = Math.max(0, Math.min(BIGMAP.h - vh, view.cy - vh / 2));
    const k = cv.width / vw, X = x => (x - vx) * k, Y = y => (y - vy) * k;
    g.imageSmoothingEnabled = false;
    g.drawImage(map, vx, vy, vw, vh, 0, 0, cv.width, cv.height);
    g.font = `800 ${Math.max(10, 5 * k)}px sans-serif`; g.textAlign = 'center'; g.lineWidth = Math.max(2, k); g.strokeStyle = '#000'; g.fillStyle = 'rgba(255,255,255,.85)';
    Object.entries(BIGMAP.sites).forEach(([r, [x, y]]) => { const tx = BIGMAP.areas[r]; g.strokeText(tx, X(x), Y(y + 22)); g.fillText(tx, X(x), Y(y + 22)); });
    g.fillStyle = '#ffe9a0'; g.strokeText('獵人村', X(BIGMAP.village[0]), Y(BIGMAP.village[1] + 8)); g.fillText('獵人村', X(BIGMAP.village[0]), Y(BIGMAP.village[1] + 8));
    Object.entries(BIGMAP.spots).forEach(([key, [x, y]]) => {
      const mk = key.split(':')[1], on = sp && x === sp[0] && y === sp[1], ic = ink(mk, 1), w = 22 * k / 2 * (on ? 1.25 : 1), h = w * 32 / 40;
      g.globalAlpha = on ? 1 : .55; g.drawImage(ic, X(x) - w / 2, Y(y) - h - 2 * k, w, h); g.globalAlpha = 1;
    });
    if (sp) {
      const sx = X(sp[0]), sy = Y(sp[1]);
      const grd = g.createRadialGradient(sx, sy, 16 * k, sx, sy, 60 * k); grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(0,0,0,.5)');
      g.fillStyle = grd; g.fillRect(0, 0, cv.width, cv.height);
      for (let i = 0; i < 3; i++) { const p = ((t * .8 + i / 3) % 1); g.strokeStyle = `rgba(255,210,74,${1 - p})`; g.lineWidth = Math.max(2, 1.5 * k); g.beginPath(); g.arc(sx, sy, (4 + p * 20) * k, 0, 7); g.stroke(); }
      g.strokeStyle = '#ff6a4a'; g.lineWidth = Math.max(2, k); g.setLineDash([3 * k, 3 * k]); g.lineDashOffset = -t * 6 * k; g.beginPath(); g.arc(sx, sy, 14 * k, 0, 7); g.stroke(); g.setLineDash([]);
      const bob = Math.abs(Math.sin(t * 4)) * 3 * k, pw = 9 * k * .9, ph = 11 * k * .9;
      g.drawImage(pinIcon, sx - pw / 2, sy - ph - bob - 3 * k, pw, ph);
    }
    raf = requestAnimationFrame(frame);
  }
  const pinIcon = PX.pin('#e8453a');

  function select(id) { sel = id; renderSheets(); renderInfo(); env.onSelect && env.onSelect(id); }
  async function refreshRooms() {
    try { rooms = await env.loadRooms(); } catch (e) { rooms = []; }
    host.querySelector('#nwbd-rc').textContent = rooms.length;
    if (tab === 'rooms') renderRooms();
  }

  host.addEventListener('click', e => {
    const t = e.target.closest('[data-tab]');
    if (t) { tab = t.dataset.tab; renderSheets(); if (tab === 'rooms') refreshRooms(); return; }
    const q = e.target.closest('[data-q]');
    if (q && !q.classList.contains('lock')) { select(q.dataset.q); return; }
    if (e.target.closest('[data-swap]')) {
      if (busy || swapBtn.disabled || !env.onSwap) return;
      busy = true; swapBtn.disabled = true;
      const cost = +swapBtn.dataset.cost || 0;
      Promise.resolve(cost > 0 ? askSwap(cost) : true).then(yes => yes ? env.onSwap(cost) : null)
        .catch(err => console.warn('刷新失敗', err)).finally(() => { busy = false; if (alive && host.isConnected) updateSwap(); });
      return;
    }
    if (e.target.closest('[data-go]') && qOf(sel) && !qOf(sel).locked && !qOf(sel).wait) env.onHunt(qOf(sel));
  });

  renderSheets(); renderInfo();
  raf = requestAnimationFrame(frame);
  refreshRooms();
  poll = setInterval(() => { if (!document.hidden) refreshRooms(); }, 7000);
  return { destroy() { alive = false; cancelAnimationFrame(raf); clearInterval(poll); }, selected: () => sel };
}
