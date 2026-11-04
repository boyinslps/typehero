import { PX } from './pixel.js';
import {
  LOOK, DEFAULT_LOOK, heroLook, STARTERS, LOCKED_WEAPONS, REGIONS, MAP_POS, ELEM, STATUS, MONSTERS,
  regionLv, MAIN_QUESTS, normalizeNw, currentQuest, zoneOpen, starOpen, addHrExp, hrNeed, huntExp, huntCoins,
  COLOR_NAME, COLOR_HEX, HR_MAX
} from './nw-data.js';
import { startBattle } from './nw-battle.js';

const CSS = `
#nw-root{position:fixed;inset:0;z-index:60;overflow-y:auto;background:var(--bg);
  background-image:radial-gradient(ellipse 90% 60% at 50% 0%,rgba(70,58,40,.45),transparent 65%)}
.nwh-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}
.nwh-card{position:relative;overflow:hidden;text-align:left;background:var(--panel2);border:2px solid var(--line2);
  border-radius:12px;padding:14px;min-height:118px;cursor:pointer;transition:transform .15s,border-color .15s;color:var(--ink)}
.nwh-card:hover{border-color:var(--gold);transform:translateY(-2px)}
.nwh-card .ico{font-size:30px;line-height:1}
.nwh-card.wip{border-color:#5a4a1a}
.nwh-card.wip .nwh-in{filter:brightness(.4) grayscale(.5)}
.nwh-stripe{position:absolute;inset:0;display:grid;place-items:center;
  background:repeating-linear-gradient(45deg,rgba(232,182,76,.5) 0 12px,rgba(20,17,13,.72) 12px 24px)}
.nwh-stripe span{position:relative;z-index:2;background:#14110d;color:var(--gold);font-weight:900;padding:.25em .7em;
  border:2px solid var(--gold);border-radius:6px;font-size:14px;white-space:nowrap}
.nwh-stripe small{display:block;font-size:11px;font-weight:700;color:var(--dim)}
.nwh-stripe span{text-align:center;line-height:1.3}
.nwh-stripe::before,.nwh-stripe::after{content:"";position:absolute;left:-10%;right:-10%;top:50%;height:7px;
  background:repeating-linear-gradient(90deg,#c8ccd4 0 11px,#3a3f4a 11px 15px);border-radius:3px;box-shadow:0 2px 0 #14110d}
.nwh-stripe::before{transform:rotate(24deg)}
.nwh-stripe::after{transform:rotate(-24deg)}
.nwh-badge{position:absolute;top:8px;right:8px;background:#d83a3a;color:#fff;font-weight:900;font-size:13px;
  padding:2px 8px;border-radius:99px;animation:nwPulse 1.2s ease-in-out infinite}
@keyframes nwPulse{50%{transform:scale(1.12)}}
.nw-sw{width:34px;height:34px;border-radius:8px;border:3px solid transparent;cursor:pointer}
.nw-sw[aria-pressed="true"]{border-color:var(--gold)}
.nw-chip{padding:8px 14px;border-radius:10px;border:2px solid var(--line2);background:var(--panel2);font-weight:800;cursor:pointer}
.nw-chip[aria-pressed="true"]{border-color:var(--gold);background:rgba(232,182,76,.18);color:var(--gold)}
.nw-chip:disabled{opacity:.4;cursor:not-allowed}
.nw-px canvas,.nwv canvas{image-rendering:pixelated;image-rendering:crisp-edges}
.nw-bar{height:10px;background:#2a2318;border-radius:99px;overflow:hidden}
.nw-bar>i{display:block;height:100%;background:linear-gradient(90deg,#e8b64c,#ffd98a)}
.nwm-pin{position:absolute;transform:translate(-50%,-50%);text-align:center;cursor:pointer;border:0;background:none;color:var(--ink)}
.nwm-pin .dot{display:grid;place-items:center;width:54px;height:54px;border-radius:50%;font-size:26px;
  background:var(--panel2);border:3px solid var(--gold);margin:0 auto 2px}
.nwm-pin.wip .dot{border-color:#5a4a1a;filter:grayscale(.7) brightness(.6)}
.nwm-pin.lock .dot{border-color:var(--line2);filter:grayscale(.6)}
.nwm-pin span{font-weight:800;font-size:13px;background:rgba(10,8,18,.78);padding:1px 6px;border-radius:5px;white-space:nowrap}
`;

export function initNewWorld(C) {
  const { $, show, toast, escHtml, ME } = C;
  let NW = null, saveTimer = 0, root = null, view = '', cur = { rk: '', mk: '' };

  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  root = document.createElement('div');
  root.id = 'nw-root';
  root.className = 'hidden';
  document.body.appendChild(root);

  const lkey = () => 'mg_nw_' + ME.docId;
  const docRef = () => C.doc(C.REF.scores, ME.docId);

  async function loadNw() {
    let local = null;
    try { local = JSON.parse(localStorage.getItem(lkey()) || 'null'); } catch (e) { local = null; }
    let cloud = null;
    if (C.online()) {
      try {
        const s = await C.withTimeout(C.getDoc(docRef()), 5000, 'nw-load');
        cloud = s.exists() ? (s.data().nw || null) : null;
      } catch (e) { console.warn('新世界讀取失敗', e); }
    }
    const pick = (cloud && (!local || (cloud.savedAt || 0) >= (local.savedAt || 0))) ? cloud : local;
    NW = normalizeNw(pick);
  }
  function saveNw() {
    NW.savedAt = Date.now();
    try { localStorage.setItem(lkey(), JSON.stringify(NW)); } catch (e) { /* 空間滿了就只存雲端 */ }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(pushCloud, 800);
  }
  function pushCloud() {
    if (!C.online() || !NW) return;
    C.withTimeout(C.setDoc(docRef(), { className: ME.className, seat: ME.seat, name: ME.name, nw: NW }, { merge: true }), 6000, 'nw-save')
      .catch(e => console.warn('新世界存檔失敗', e));
  }

  const unlocked = () => C.bestLevel() >= C.unlockLevel;
  function gate() {
    if (C.nwMode() === 'off') return { ok: false, why: '老師暫時把新世界關起來了。' };
    if (C.nwMode() === 'all' || unlocked()) return { ok: true };
    return { ok: false, why: `把打字練到 LV ${C.unlockLevel}（解鎖史詩）才能穿過傳送門！你目前最高 LV ${C.bestLevel()}。` };
  }

  const tier = () => (C.getHist() && C.getHist().tier) || 'B';
  const myHero = (weapon, gear) => heroLook(NW.look, weapon || NW.starter || 'staff', gear);

  function checkQuests() {
    const got = [];
    for (const q of MAIN_QUESTS) {
      if (NW.quest.done.includes(q.id)) continue;
      if (!q.test(NW)) break;
      NW.quest.done.push(q.id);
      const r = q.reward || {};
      if (r.items) for (const k in r.items) NW.items[k] = (NW.items[k] || 0) + r.items[k];
      if (r.hrExp) addHrExp(NW, r.hrExp);
      if (r.title) NW.title = r.title;
      if (r.bp) r.bp.forEach(b => { if (!NW.bp.includes(b)) NW.bp.push(b); });
      got.push(q);
    }
    if (got.length) saveNw();
    return got;
  }

  function setView(name, html, mount) {
    view = name;
    root.innerHTML = `<div class="max-w-5xl mx-auto p-4 pb-16 nwv" data-view="${name}">${html}</div>`;
    root.scrollTo({ top: 0 });
    if (mount) mount(root.firstElementChild);
  }
  const topbar = (title, back, backTxt) => `
    <div class="flex items-center justify-between gap-2 mb-4">
      <h2 class="text-2xl font-black">${title}</h2>
      <button class="btn btn-ghost text-sm px-4 py-2" data-act="${back}">${backTxt || '← 回獵人村'}</button>
    </div>`;
  const cv = (host, canvas) => { host.replaceChildren(canvas); return host; };
  const mountSprites = scope => scope.querySelectorAll('[data-sprite]').forEach(el => {
    const [kind, key, sc, ang] = el.dataset.sprite.split(':');
    cv(el, PX.canvas(kind, key, +sc || 3, ang === '1'));
  });

  async function enter() {
    const g = gate();
    if (!g.ok) { toast(g.why, 3600); return; }
    toast('穿過傳送門…', 1200);
    await loadNw();
    show('screen-lobby', false); show('btn-verlog', false); show('app-header', false);
    show('nw-root', true);
    if (!NW.look) viewCreator(true);
    else if (!NW.starter) viewStarter();
    else viewHub();
  }
  function leave() {
    stopAnims();
    show('nw-root', false);
    C.gotoLobby();
  }

  function hubCards() {
    const q = currentQuest(NW);
    const wip = (id, icon, name, seg) => `
      <button class="nwh-card wip" data-wip="${id}"><div class="nwh-in"><div class="ico">${icon}</div>
      <div class="font-black text-lg mt-2">${name}</div></div>
      <div class="nwh-stripe"><span>${icon} ${name}<small>施工中・第 ${seg} 段開放</small></span></div></button>`;
    const open = (act, icon, name, sub, badge) => `
      <button class="nwh-card" data-act="${act}">${badge ? `<span class="nwh-badge">${badge}</span>` : ''}
      <div class="ico">${icon}</div><div class="font-black text-lg mt-2">${name}</div>
      <div class="text-sm mt-1" style="color:var(--dim)">${sub}</div></button>`;
    return `
      ${open('map', '📜', '委託板', '選地方、選魔物，出發狩獵！')}
      ${open('quest', '🧭', '任務', q ? `現在：${escHtml(q.t)}` : '第 1 章全部完成！', q ? '新' : '')}
      ${open('equip', '🎽', '裝備與造型', '換武器、換髮型，看武器圖鑑')}
      ${open('rank', '🏆', '獵人排行', '看看誰是最強獵人')}
      ${wip('forge', '⚒', '鐵匠鋪', 2)}${wip('storage', '📦', '倉庫', 2)}${wip('shop', '🛒', '商店', 3)}
      ${wip('armor', '🛡', '防具', 3)}${wip('rooms', '👥', '組隊房間', 4)}${wip('star', '⭐', '星圖', 5)}`;
  }

  function viewHub() {
    stopAnims();
    const need = hrNeed(NW.hr), pct = NW.hr >= HR_MAX ? 100 : Math.min(100, NW.hrExp / need * 100);
    const matN = Object.values(NW.mats).reduce((a, b) => a + b, 0);
    setView('hub', `
      <div class="panel p-4 flex gap-4 items-center flex-wrap">
        <div class="nw-px" data-hero="1" style="background:#0e0b16;border-radius:8px;padding:6px"></div>
        <div class="flex-1 min-w-[220px]">
          <div class="text-sm" style="color:var(--dim)">獵人村</div>
          <div class="text-2xl font-black">${escHtml(ME.name)} ${NW.title ? `<span class="text-sm" style="color:var(--gold)">「${escHtml(NW.title)}」</span>` : ''}</div>
          <div class="flex items-center gap-3 mt-2"><b style="color:var(--gold)">獵人等級 ${NW.hr}</b>
            <div class="nw-bar flex-1"><i style="width:${pct}%"></i></div>
            <span class="text-xs mono" style="color:var(--dim)">${NW.hr >= HR_MAX ? '已滿級' : `${NW.hrExp}/${need}`}</span></div>
          <div class="flex gap-4 mt-2 text-sm flex-wrap" style="color:var(--dim)">
            <span>⭐ 星星 <b style="color:var(--ink)">${NW.stars}</b>（第 5 段才能用）</span>
            <span>🪙 字元 <b style="color:var(--ink)">${NW.coins}</b></span>
            <span>📦 材料 <b style="color:var(--ink)">${matN}</b>（先幫你存著）</span></div>
        </div>
        <button class="btn btn-ghost px-4 py-2" data-act="leave">← 回營地</button>
      </div>
      <h3 class="font-black text-xl mt-5 mb-3" style="color:var(--gold)">獵人村</h3>
      <div class="nwh-grid">${hubCards()}</div>`, el => {
      el.querySelector('[data-hero]').replaceChildren(PX.hero(myHero(), 4));
    });
  }

  const WIP_TEXT = {
    forge: ['⚒ 鐵匠鋪', 2, '用打到的材料，打造、強化自己的武器和裝備！', 'dagger'],
    storage: ['📦 倉庫', 2, '所有材料和圖紙都放在這裡，一目了然。', 'book'],
    shop: ['🛒 商店', 3, '用字元買回復藥，也可以賣掉用不到的材料。', 'bell'],
    armor: ['🛡 防具', 3, '頭盔、鎧甲、手套、靴子，穿上就會出現在你身上！', 'shield'],
    rooms: ['👥 組隊房間', 4, '開房間或加入同學的房間，最多 4 個人一起打大魔物。', 'fist'],
    star: ['⭐ 星圖', 5, '升級拿到的星星，可以在這裡點亮，讓閃避和防禦變得更強。', 'staff']
  };
  function openWip(id) {
    const [name, seg, text, spr] = WIP_TEXT[id];
    const matN = Object.values(NW.mats).reduce((a, b) => a + b, 0);
    const extra = (id === 'forge' || id === 'storage')
      ? `<p class="text-sm mt-2" style="color:var(--gold)">你已經存了 ${matN} 個材料、${NW.bp.length} 張圖紙，開張那天就能用！</p>` : '';
    const sheet = document.createElement('div');
    sheet.className = 'fixed inset-0 z-[80] grid place-items-center p-4';
    sheet.style.background = 'rgba(9,8,18,.88)';
    sheet.innerHTML = `<div class="panel p-6 w-full max-w-md text-center">
      <div class="nw-px mx-auto mb-3" data-sprite="weapon:${spr}:6" style="display:inline-block;background:#0e0b16;border-radius:8px;padding:8px"></div>
      <div class="text-2xl font-black mb-1">${name}</div>
      <div class="text-sm mb-3" style="color:var(--gold)">🔗 施工中・第 ${seg} 段開放</div>
      <p class="text-base">${text}</p>${extra}
      <button class="btn btn-gold px-6 py-2.5 mt-4" data-close>知道了</button></div>`;
    sheet.addEventListener('click', e => { if (e.target === sheet || e.target.closest('[data-close]')) sheet.remove(); });
    document.body.appendChild(sheet);
    mountSprites(sheet);
  }

  let animStops = [];
  function stopAnims() { animStops.forEach(f => f()); animStops = []; }

  function lookPicker(look, onChange) {
    const sw = (arr, cur, key) => arr.map((c, i) =>
      `<button class="nw-sw" data-k="${key}" data-i="${i}" aria-pressed="${cur === i}" style="background:${c}"></button>`).join('');
    return `
      <div class="mb-3"><div class="label mb-1">髮型</div><div class="flex gap-2 flex-wrap">${LOOK.styles.map(([k, n], i) =>
        `<button class="nw-chip" data-k="style" data-i="${i}" aria-pressed="${look.style === i}">${n}</button>`).join('')}</div></div>
      <div class="mb-3"><div class="label mb-1">髮色</div><div class="flex gap-2 flex-wrap">${sw(LOOK.hairColors, look.hair, 'hair')}</div></div>
      <div class="mb-1"><div class="label mb-1">膚色</div><div class="flex gap-2 flex-wrap">${sw(LOOK.skins, look.skin, 'skin')}</div></div>`;
  }
  function wireLook(scope, look, redraw) {
    scope.querySelectorAll('[data-k][data-i]').forEach(b => b.addEventListener('click', () => {
      look[b.dataset.k] = +b.dataset.i;
      scope.querySelectorAll(`[data-k="${b.dataset.k}"]`).forEach(x => x.setAttribute('aria-pressed', x === b));
      redraw();
    }));
  }

  function viewCreator(first) {
    const look = Object.assign({}, DEFAULT_LOOK, NW.look || {});
    setView('creator', `
      ${first ? '' : topbar('自己選造型', 'equip', '← 回上一頁')}
      <div class="panel p-5">
        ${first ? `<div class="mb-4"><div class="text-2xl font-black">歡迎來到新世界！</div>
          <p class="mt-1" style="color:var(--dim)">村長說：「先決定你長什麼樣子吧。」之後隨時都可以再改。</p></div>` : ''}
        <div class="flex gap-6 flex-wrap items-center">
          <div class="nw-px" data-prev="1" style="background:#0e0b16;border-radius:8px;padding:10px"></div>
          <div class="flex-1 min-w-[240px]" data-picker>${lookPicker(look)}</div>
        </div>
        <div class="mt-5 text-right"><button class="btn btn-gold px-8 py-3 text-lg" data-save>${first ? '決定了！下一步' : '儲存'}</button></div>
      </div>`, el => {
      const prev = el.querySelector('[data-prev]');
      const redraw = () => prev.replaceChildren(PX.hero(heroLook(look, NW.starter || 'staff'), 9));
      redraw();
      wireLook(el, look, redraw);
      el.querySelector('[data-save]').addEventListener('click', () => {
        NW.look = look; saveNw();
        if (!NW.starter) viewStarter(); else viewEquip();
      });
    });
  }

  function viewStarter() {
    const canSwap = !NW.starter || NW.hunts < 3;
    const pick = Object.assign({}, { w: NW.starter || '' });
    const cards = Object.entries(STARTERS).map(([k, s]) => `
      <div class="panel-flat p-3" data-card="${k}" style="cursor:pointer;border:2px solid ${pick.w === k ? 'var(--gold)' : 'var(--line)'}">
        <div class="flex items-center justify-between mb-2"><b class="text-lg">${s.name}</b>
          <span class="text-xs px-2 py-0.5 rounded-full" style="border:1px solid ${s.fam === '新的' ? 'var(--gr)' : 'var(--dim)'};color:${s.fam === '新的' ? 'var(--gr)' : 'var(--dim)'}">${s.fam}</span></div>
        <canvas data-anim="${k}" width="120" height="70" style="width:100%;max-width:360px;background:#0e0b16;border-radius:8px;image-rendering:pixelated"></canvas>
        <div class="text-sm mt-2" style="color:var(--dim)">${s.kind}：${s.desc}</div>
      </div>`).join('');
    setView('starter', `
      ${NW.starter ? topbar('換一把武器', 'equip', '← 回上一頁') : ''}
      <div class="panel p-5">
        <div class="text-2xl font-black">選擇你的第一把武器</div>
        <p class="mt-1 mb-4" style="color:var(--dim)">${NW.starter ? `前 3 場狩獵可以免費換，你已經打了 ${NW.hunts} 場。` : '前 3 場狩獵都可以免費換，不用擔心選錯！'}</p>
        <div class="grid gap-3" style="grid-template-columns:repeat(auto-fill,minmax(260px,1fr))">${cards}</div>
        <div class="mt-5 text-right"><button class="btn btn-gold px-8 py-3 text-lg" data-ok disabled style="opacity:.5">選好了</button></div>
      </div>`, el => {
      const ok = el.querySelector('[data-ok]');
      const refresh = () => {
        el.querySelectorAll('[data-card]').forEach(c => c.style.borderColor = c.dataset.card === pick.w ? 'var(--gold)' : 'var(--line)');
        ok.disabled = !pick.w || (!canSwap && pick.w !== NW.starter); ok.style.opacity = ok.disabled ? .5 : 1;
      };
      el.querySelectorAll('[data-card]').forEach(c => c.addEventListener('click', () => {
        if (!canSwap) { toast('前 3 場以後就不能免費換了，要打造新武器才能換（第 2 段開放）', 3200); return; }
        pick.w = c.dataset.card; refresh();
      }));
      el.querySelectorAll('[data-anim]').forEach(cvs => animStops.push(runStarterAnim(cvs, cvs.dataset.anim)));
      refresh();
      ok.addEventListener('click', () => {
        const first = !NW.starter;
        if (!first && pick.w !== NW.starter) NW.swaps++;
        NW.starter = pick.w; saveNw();
        const got = checkQuests();
        toast(first ? `拿到「${STARTERS[pick.w].name}」！去委託板看看吧` : '換好了！', 2600);
        if (got.length) setTimeout(() => toast(`任務完成：${got[0].t}　獎勵：${got[0].rewardText}`, 3600), 1500);
        viewHub();
      });
    });
  }

  function runStarterAnim(cvs, wk) {
    const g = cvs.getContext('2d'); g.imageSmoothingEnabled = false;
    const hero = PX.hero(myHero(wk), 1), mon = PX.canvas('monster', 'coo', 1, false);
    let raf = 0, alive = true;
    const t0 = performance.now();
    function frame(now) {
      if (!alive || !cvs.isConnected) return;
      const t = ((now - t0) / 1000) % 3;
      g.fillStyle = '#2a3a2a'; g.fillRect(0, 0, 120, 70);
      g.fillStyle = '#3a5a3a'; g.fillRect(0, 44, 120, 26);
      g.fillStyle = '#4a7a4a'; for (let x = 0; x < 120; x += 12) g.fillRect(x, 44, 1, 26);
      const hx = 14, hy = 34 + (Math.sin(now / 260) > 0 ? 0 : 1);
      const hit = t > 1.4 && t < 1.7;
      g.drawImage(mon, 74 + (hit ? 2 * Math.sin(now / 30) : 0), 26);
      g.drawImage(hero, hx, hy);
      const stroke = (c, x1, y1, x2, y2, w = 1) => { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
      if (wk === 'staff') {
        if (t < 1.4) for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#e6d9ff' : '#9d80ff'; g.fillRect(hx + 20 + Math.cos(now / 180 + i) * (4 + t * 3), hy + 4 + Math.sin(now / 150 + i * 2) * (4 + t * 3), 1, 1); }
        else if (t < 1.8) { stroke('#c9a6ff', hx + 20, hy + 4, 78, 44, 3); stroke('#fff', hx + 20, hy + 4, 78, 44, 1); }
      } else if (wk === 'bow') {
        const fill = Math.min(1, t / 1.2);
        g.fillStyle = '#2a2318'; g.fillRect(8, 64, 50, 3); g.fillStyle = fill >= 1 ? '#ffd24a' : '#e8b64c'; g.fillRect(8, 64, 50 * fill, 3);
        if (t > 1.3 && t < 2.1) { const ax = 30 + (t - 1.3) / .8 * 44; stroke('#dfe6ec', ax, hy + 16, ax + 8, hy + 16, 1); g.fillStyle = '#fff'; g.fillRect(ax + 8, hy + 15, 2, 2); }
      } else if (wk === 'dagger') {
        const cuts = [[1.2, 76, 28, 96, 48], [1.4, 96, 28, 76, 48], [1.6, 76, 38, 98, 38]];
        cuts.forEach(([ts, a, b, c, d]) => { if (t > ts && t < ts + .18) stroke('#fff', a, b, c, d, 2); });
      } else if (wk === 'crossbow') {
        const n = Math.min(10, Math.floor(t / 1.2 * 10));
        for (let i = 0; i < 10; i++) { g.fillStyle = i < n ? '#dfe6ec' : '#2a2318'; g.fillRect(8 + i * 5, 64, 3, 4); }
        if (t > 1.4 && t < 2.0) for (let i = 0; i < 5; i++) { const ax = 30 + (t - 1.4) / .6 * 46; stroke('#dfe6ec', ax - 6, hy + 10 + i * 3, ax, hy + 10 + i * 3, 1); }
      }
      if (hit) { g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(74, 26, 40, 32); }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }

  function viewEquip() {
    stopAnims();
    const w = STARTERS[NW.starter];
    const swapLeft = Math.max(0, 3 - NW.hunts);
    const locked = LOCKED_WEAPONS.map(([k, n, seg]) => `
      <div class="nwh-card wip" style="min-height:140px;padding:10px"><div class="nwh-in text-center">
        <div class="nw-px" data-sprite="weapon:${k}:3" style="display:inline-block"></div><div class="font-black mt-1">${n}</div></div>
        <div class="nwh-stripe"><span>${n}<small>施工中・第 ${seg} 段</small></span></div></div>`).join('');
    const own = Object.entries(STARTERS).map(([k, s]) => `
      <div class="nwh-card" style="min-height:140px;padding:10px;cursor:default;${k === NW.starter ? 'border-color:var(--gold)' : ''}">
        <div class="text-center"><div class="nw-px" data-sprite="weapon:${{ staff: 'staff', bow: 'bow', dagger: 'dagger', crossbow: 'crossbow' }[k]}:3" style="display:inline-block"></div>
        <div class="font-black mt-1">${s.kind}</div><div class="text-xs" style="color:var(--dim)">${s.name}${k === NW.starter ? '（使用中）' : ''}</div></div></div>`).join('');
    setView('equip', `
      ${topbar('裝備與造型', 'hub')}
      <div class="panel p-4 flex gap-5 flex-wrap items-center">
        <div class="nw-px" data-hero="1" style="background:#0e0b16;border-radius:8px;padding:8px"></div>
        <div class="flex-1 min-w-[220px]">
          <div class="text-sm" style="color:var(--dim)">現在的武器</div>
          <div class="text-xl font-black">${w ? w.name : '還沒選'} <span class="text-sm" style="color:var(--dim)">${w ? w.kind : ''}</span></div>
          <p class="text-sm mt-1" style="color:var(--dim)">${w ? w.desc : ''}</p>
          <div class="flex gap-2 mt-3 flex-wrap">
            <button class="btn btn-gold px-4 py-2" data-act="starter">${swapLeft > 0 ? '換武器' : '武器（不能再免費換）'}</button>
            <button class="btn btn-ghost px-4 py-2" data-act="creator">💇 改造型</button></div>
          <p class="text-xs mt-2" style="color:var(--dim2)">${swapLeft > 0 ? `前 3 場狩獵可以免費換，還剩 ${swapLeft} 場。` : '前 3 場已經過了，之後要打造新武器才能換。'}穿上新的裝備，角色也會跟著變（第 2～3 段）。</p>
        </div>
      </div>
      <h3 class="font-black text-xl mt-5 mb-3" style="color:var(--gold)">武器圖鑑</h3>
      <div class="grid gap-3" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">${own}${locked}</div>`, el => {
      el.querySelector('[data-hero]').replaceChildren(PX.hero(myHero(), 6));
      mountSprites(el);
    });
  }

  function viewQuest() {
    const q = currentQuest(NW);
    const done = MAIN_QUESTS.filter(x => NW.quest.done.includes(x.id));
    setView('quest', `
      ${topbar('🧭 任務', 'hub')}
      <div class="panel p-5">
        <div class="label mb-1">主線 第 1 章　新芽草原</div>
        ${q ? `<div class="text-2xl font-black">${escHtml(q.t)}</div>
          <p class="mt-2" style="color:var(--dim)">${escHtml(q.hint)}</p>
          ${q.prog ? `<p class="mt-2 font-bold" style="color:var(--gold)">${q.prog(NW)}</p>` : ''}
          <p class="mt-2 text-sm">獎勵：<b style="color:var(--gold)">${escHtml(q.rewardText)}</b></p>`
        : '<div class="text-xl font-black">第 1 章完成了！之後的任務會陸續開放。</div>'}
      </div>
      ${done.length ? `<h3 class="font-black text-lg mt-5 mb-2" style="color:var(--gold)">完成了</h3>
        <div class="grid gap-2">${done.map(d => `<div class="panel-flat p-3 flex justify-between"><span>✅ ${escHtml(d.t)}</span>
        <span class="text-sm" style="color:var(--dim)">${escHtml(d.rewardText)}</span></div>`).join('')}</div>` : ''}
      <p class="text-xs mt-4" style="color:var(--dim2)">還有幾個任務要等鐵匠鋪開張才會出現。每日任務在第 3 段開放。</p>`);
  }

  function viewMap() {
    const pins = Object.entries(REGIONS).map(([k, r]) => {
      const [x, y] = MAP_POS[k];
      const open = zoneOpen(NW, k);
      const cls = r.wip ? 'wip' : (open ? '' : 'lock');
      const sub = r.wip ? `🔗 第 ${r.wip} 段` : (open ? `★${NW.zone[k] || 0}/5` : `🔒 ${REGIONS[r.needs].name} ★5`);
      return `<button class="nwm-pin ${cls}" style="left:${x}%;top:${y}%" data-region="${k}"><div class="dot">${r.icon}</div><span>${r.name}</span><br><span style="color:var(--dim);font-weight:600">${sub}</span></button>`;
    }).join('');
    setView('map', `
      ${topbar('📜 委託板：世界地圖', 'hub')}
      <div class="panel p-3"><div style="position:relative;height:420px;border-radius:10px;overflow:hidden;background:linear-gradient(180deg,#1a1830,#2a2a3a 50%,#2a3a2a)">
        <svg style="position:absolute;inset:0;width:100%;height:100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M14 74 L38 52 L14 36 M38 52 L64 70 M38 52 L38 20 L66 12 M64 70 L88 44" stroke="#6a5a3a" stroke-width=".7" fill="none" stroke-dasharray="2 1.5" vector-effect="non-scaling-stroke"/></svg>
        ${pins}</div></div>
      <p class="text-sm mt-3" style="color:var(--dim)">點一個地方，看看那裡有哪些魔物。打倒草原的 ★5 魔物，就會開放迷霧森林。</p>`);
  }

  const askName = a => a === 'zhuyin' ? '注音' : '詞語';
  function viewRegion(rk) {
    const r = REGIONS[rk];
    cur.rk = rk;
    if (r.wip) { toast(`${r.name}：施工中・第 ${r.wip} 段開放`, 2400); return; }
    if (!zoneOpen(NW, rk)) { toast(`打倒${REGIONS[r.needs].name}的 ★5 魔物才會開放！`, 2600); return; }
    const cards = r.mons.map(mk => {
      const m = MONSTERS[mk];
      return `<button class="nwh-card" data-mon="${mk}" style="min-height:0">
        <div class="flex gap-3 items-center"><div class="nw-px" data-sprite="monster:${mk}:3"></div>
        <div><div class="text-xl font-black">${m.name} ${ELEM[m.elem]}</div>
        <div class="text-sm" style="color:var(--dim)">打：${askName(m.ask)}　攻擊：${m.lean}</div>
        <div class="text-xs mt-1" style="color:var(--dim2)">打過 ${NW.dex[mk] || 0} 次</div></div></div></button>`;
    }).join('');
    setView('region', `
      ${topbar(`${r.icon} ${r.name}`, 'map', '← 回地圖')}
      <p class="mb-3" style="color:var(--dim)">${r.note}　Lv ${r.lv[0]}～${r.lv[1]}　已打到 ★${NW.zone[rk] || 0}</p>
      <div class="nw-px" data-sprite="region:${rk}:5" style="display:inline-block;background:#0e0b16;border-radius:8px;padding:6px;margin-bottom:12px"></div>
      <div class="nwh-grid">${cards}</div>`, el => mountSprites(el));
  }

  const immuneOf = m => ({ fire: '🔥 燃燒', water: '❄ 寒冰', wood: '☠ 中毒' })[m.elem] || '';
  function viewMonster(rk, mk, star) {
    const r = REGIONS[rk], m = MONSTERS[mk];
    cur = { rk, mk };
    star = star || Math.min(5, Math.max(1, (NW.zone[rk] || 0) + 1));
    const lv = regionLv(rk, star);
    const stars = [1, 2, 3, 4, 5].map(s => `<button class="nw-chip" data-star="${s}" aria-pressed="${s === star}" ${starOpen(NW, rk, s) ? '' : 'disabled'}>
      ${starOpen(NW, rk, s) ? '' : '🔒'}★${s}<div class="text-xs font-normal">Lv ${regionLv(rk, s)}</div></button>`).join('');
    const hits = [...new Set(m.attacks.filter(a => a.status).map(a => STATUS[a.status]))];
    const drops = m.drops.map(d => `<span style="color:${COLOR_HEX[d[2]]}">■${COLOR_NAME[d[2]]}</span> ${d[1]}`).join('　');
    const rare = m.rare.map(d => `<span style="color:${COLOR_HEX[d[2]]}">${d[1]}</span>`).join('　');
    setView('monster', `
      ${topbar(`${m.name}`, 'region', '← 回' + r.name)}
      <div class="panel p-5 flex gap-5 flex-wrap">
        <div class="nw-px" data-sprite="monster:${mk}:6" style="background:#0e0b16;border-radius:8px;padding:8px;align-self:flex-start"></div>
        <div class="flex-1 min-w-[260px] leading-relaxed">
          <div class="text-2xl font-black">${m.name} ${ELEM[m.elem]} <span class="text-base" style="color:var(--dim)">Lv ${lv}</span></div>
          <div class="mt-1">${r.icon} ${r.name}　打：<b>${askName(m.ask)}</b></div>
          <div>怕 ${ELEM[m.fear]}　不怕 ${ELEM[m.resist]}　免疫 ${immuneOf(m)}
            <span class="text-xs" style="color:var(--dim2)">（屬性武器第 2 段才有，現在先看看）</span></div>
          <div>打中你會：${hits.length ? hits.join('、') : '沒有特別的'}</div>
          <div>攻擊：${m.lean}　特別的：${m.sp}</div>
          <div class="mt-2 text-sm"><b>會掉：</b>${drops}</div>
          <div class="text-sm"><b>有機會掉：</b>${rare}</div>
        </div>
      </div>
      <div class="panel p-4 mt-3">
        <div class="label mb-2">選難度（打倒 ★N 才會開放 ★N+1）</div>
        <div class="flex gap-2 flex-wrap">${stars}</div>
        <div class="mt-4 flex items-center gap-3 flex-wrap">
          <button class="btn btn-gold px-8 py-3 text-xl" data-go>⚔ 出發！</button>
          <span class="text-sm" style="color:var(--dim)">一場最多 5 分鐘。看到紅色區域，打「閃避」或「防禦」！</span></div>
      </div>`, el => {
      mountSprites(el);
      el.querySelectorAll('[data-star]').forEach(b => b.addEventListener('click', () => viewMonster(rk, mk, +b.dataset.star)));
      el.querySelector('[data-go]').addEventListener('click', () => launch(rk, mk, star));
    });
  }

  function launch(rk, mk, star) {
    stopAnims();
    show('nw-root', false);
    startBattle(env(), { rk, mk, star }, res => {
      show('nw-root', true);
      afterHunt(res);
    });
  }

  function afterHunt(res) {
    const sum = finishHunt(res);
    showResult(res, sum, () => { if (sum.quests.length) toast(`任務完成：${sum.quests[0].t}　獎勵：${sum.quests[0].rewardText}`, 3600); viewRegion(res.rk); });
  }

  function finishHunt(res) {
    const lv = regionLv(res.rk, res.star), m = MONSTERS[res.mk];
    const s = NW.stat;
    NW.hunts++;
    s.dodgeOk += res.dodgeOk; s.dodgeAll += res.dodgeAll; s.defOk += res.defOk; s.defAll += res.defAll;
    const sum = { lv, win: res.result === 'win', exp: 0, coins: 0, drops: [], rare: [], ups: 0, quests: [], star };
    if (res.valid) {
      if (sum.win) {
        s.wins++;
        NW.dex[res.mk] = (NW.dex[res.mk] || 0) + 1;
        if (res.star > (NW.zone[res.rk] || 0)) NW.zone[res.rk] = res.star;
        const key = res.rk + ':' + res.star;
        if (!NW.fastest[key] || res.secs < NW.fastest[key]) NW.fastest[key] = res.secs;
      } else s.fails++;
      if (res.lvAcc && lv >= 20) { s.accN++; s.accSum += res.accuracy; }
      sum.exp = huntExp(lv, sum.win);
      sum.coins = huntCoins(lv, sum.win);
      sum.ups = addHrExp(NW, sum.exp);
      NW.coins += sum.coins;
      const rolls = sum.win ? 1 : 0.5;
      m.drops.forEach(([id, name, color, lo, hi]) => {
        const n = Math.max(1, Math.round((lo + Math.floor(Math.random() * (hi - lo + 1))) * rolls));
        NW.mats[id] = (NW.mats[id] || 0) + n; sum.drops.push({ id, name, color, n });
      });
      if (sum.win) m.rare.forEach(([id, name, color]) => {
        if (Math.random() < 0.3 && !NW.bp.includes(id)) { NW.bp.push(id); sum.rare.push({ id, name, color }); }
      });
    }
    sum.quests = checkQuests();
    saveNw();
    return sum;
  }

  function showResult(res, sum, done) {
    const m = MONSTERS[res.mk];
    const title = sum.win ? '討伐成功！' : (res.result === 'retreat' ? '撤退了' : '狩獵失敗');
    const drops = sum.drops.map(d => `<span style="color:${COLOR_HEX[d.color]}">■</span> ${d.name} ×${d.n}`).join('　');
    const rare = sum.rare.map(d => `<b style="color:${COLOR_HEX[d.color]}">${d.name}（新！）</b>`).join('　');
    const sheet = document.createElement('div');
    sheet.className = 'fixed inset-0 z-[90] overflow-y-auto';
    sheet.style.background = 'rgba(9,8,18,.94)';
    sheet.innerHTML = `<div class="max-w-xl mx-auto p-4 py-8"><div class="panel p-6">
      <div class="text-3xl font-black" style="color:${sum.win ? 'var(--gold)' : '#e5705f'}">${title}</div>
      <div class="mt-1" style="color:var(--dim)">${m.name} Lv ${sum.lv}（★${sum.star}）</div>
      <div class="nw-px my-4" data-sprite="monster:${res.mk}:5:${sum.win ? 0 : 1}" style="background:#0e0b16;border-radius:8px;padding:8px;display:inline-block"></div>
      ${res.valid ? '' : `<p class="mb-3 p-3 rounded-lg" style="background:rgba(229,112,95,.15);color:#e5705f">${escHtml(res.invalidWhy || '這場不算數')}</p>`}
      <div class="grid grid-cols-2 gap-2 text-sm">
        <div class="panel-flat p-2">用時 <b>${Math.floor(res.secs / 60)}:${String(Math.round(res.secs % 60)).padStart(2, '0')}</b></div>
        <div class="panel-flat p-2">正確率 <b>${Math.round(res.accuracy * 100)}%</b></div>
        <div class="panel-flat p-2">閃避 <b>${res.dodgeOk}/${res.dodgeAll}</b></div>
        <div class="panel-flat p-2">防禦 <b>${res.defOk}/${res.defAll}</b></div></div>
      ${res.valid ? `<div class="mt-4"><div class="label mb-1">獲得</div>
        <div>${drops || '—'}</div>${rare ? `<div class="mt-1">${rare}</div>` : ''}
        <div class="mt-2">🪙 字元 +${sum.coins}　⭐ 獵人經驗 +${sum.exp}</div>
        ${sum.ups ? `<div class="mt-1 font-black" style="color:var(--gold)">獵人等級升到 ${NW.hr}！拿到 ${sum.ups} 顆星星（第 5 段才能用，先存著）</div>` : ''}
        <p class="text-xs mt-2" style="color:var(--dim2)">材料和圖紙先幫你存著，鐵匠鋪開張就能用。</p></div>` : ''}
      <div class="mt-5 text-right"><button class="btn btn-gold px-8 py-3 text-lg" data-close>回去</button></div></div></div>`;
    sheet.addEventListener('click', e => { if (e.target.closest('[data-close]')) { sheet.remove(); done(); } });
    document.body.appendChild(sheet);
    mountSprites(sheet);
  }

  function openRank() { toast('排行榜做中，馬上來！', 2000); }

  function env() {
    return {
      C, PX, NW: () => NW, tier, myHero, hist: C.getHist, ME,
      saveRun: run => C.saveRun && C.saveRun(run)
    };
  }

  root.addEventListener('click', e => {
    const a = e.target.closest('[data-act]');
    if (a) {
      const act = a.dataset.act;
      ({ leave, hub: viewHub, map: viewMap, quest: viewQuest, equip: viewEquip, creator: () => viewCreator(false),
         starter: viewStarter, region: () => viewRegion(cur.rk), rank: () => openRank() }[act] || (() => {}))();
      return;
    }
    const w = e.target.closest('[data-wip]'); if (w) { openWip(w.dataset.wip); return; }
    const rg = e.target.closest('[data-region]'); if (rg) { viewRegion(rg.dataset.region); return; }
    const mo = e.target.closest('[data-mon]'); if (mo) viewMonster(cur.rk, mo.dataset.mon);
  });

  return { enter, gate, leave, get nw() { return NW; }, isOpen: () => !root.classList.contains('hidden') };
}
