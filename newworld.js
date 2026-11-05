import { PX } from './pixel.js';
import {
  LOOK, DEFAULT_LOOK, heroLook, STARTERS, LOCKED_WEAPONS, REGIONS, MAP_POS, ELEM, STATUS, MONSTERS,
  regionLv, MAIN_QUESTS, normalizeNw, currentQuest, zoneOpen, starOpen, addHrExp, hrNeed, huntExp, huntCoins,
  COLOR_NAME, COLOR_HEX, HR_MAX, VILLAGE, doorTile
} from './nw-data.js';
import { injectUi } from './nw-ui.js';
import { mountVillage } from './nw-village.js';
import { mountBoard } from './nw-board.js';
import { startBattle } from './nw-battle.js';
import { DEFAULT_CODE_HASH, sha256Hex, cleanCode } from './nw-access.js';

const CSS = `
#nw-root{position:fixed;inset:0;z-index:60;overflow-y:auto}
#nw-root h2,#nw-root h3{color:#ffd98a;text-shadow:3px 3px 0 #000,-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000}
#nw-root{font-weight:600;font-size:17px}
#nw-root .text-sm{font-size:15px}
#nw-root .text-xs{font-size:13px}
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
.px-btn[aria-pressed="true"]{background:#e8b64c;color:#2a1a00;text-shadow:none}
.nwh-card{border-radius:0!important;border:3px solid #0a0714!important;box-shadow:inset 0 0 0 2px #3a3070;background:#141030!important}
.nwh-card:hover{box-shadow:inset 0 0 0 2px #ffd98a}
.nw-chip{border-radius:0;border:3px solid #0a0714;background:#2a2358;box-shadow:inset 0 -3px 0 #231d55;text-shadow:1px 1px 0 #000;color:#fff}
.nw-chip[aria-pressed="true"]{background:#e8b64c;color:#2a1a00;text-shadow:none;border-color:#0a0714}
.nw-sw{border-radius:0;border-width:3px;border-color:#0a0714}
.nw-sw[aria-pressed="true"]{border-color:#fff;outline:3px solid #e8b64c}
.nw-bar{height:14px;border-radius:0;border:2px solid #0a0714;background:#0a0714;padding:1px}
.nw-bar>i{background:repeating-linear-gradient(90deg,#e8b64c 0 6px,transparent 6px 8px)}
.nwm-pin .dot{border-radius:0;border:3px solid #0a0714;outline:2px solid #ffd98a}
.nwm-pin.wip .dot{outline-color:#5a5f6a}
.nwm-pin.lock .dot{outline-color:#5a5f6a}
`;

export function initNewWorld(C) {
  const { $, show, toast, escHtml, ME } = C;
  let NW = null, saveTimer = 0, root = null, view = '', cur = { rk: '', mk: '' };

  injectUi();
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  root = document.createElement('div');
  root.id = 'nw-root';
  root.className = 'hidden px-bg';
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
  let access = false;
  const HKEY = 'mg_nw_code';
  const effHash = () => (location.hostname === 'localhost' && window.__NW_CODE_HASH__) || C.nwCodeHash() || DEFAULT_CODE_HASH;

  async function refreshAccess() {
    let h = '';
    try { h = localStorage.getItem(HKEY) || ''; } catch (e) { h = ''; }
    access = !!h && h === effHash();
    return access;
  }

  async function redeem(raw) {
    const h = await sha256Hex(cleanCode(raw));
    if (h !== effHash()) return false;
    try { localStorage.setItem(HKEY, h); } catch (e) { /* 存不了就只有這次有效 */ }
    access = true;
    return true;
  }

  function gate() {
    if (access) return { ok: true, early: true };
    const mode = C.nwMode();
    if (mode === 'off') return { ok: false, closed: true, why: '新世界還沒開放，敬請期待！' };
    if (mode === 'all' || unlocked()) return { ok: true };
    return { ok: false, why: `把打字練到 LV ${C.unlockLevel}（解鎖史詩）才能穿過傳送門！你目前最高 LV ${C.bestLevel()}。` };
  }

  function openCodeSheet(after) {
    const sheet = document.createElement('div');
    sheet.className = 'fixed inset-0 z-[80] grid place-items-center p-4';
    sheet.style.background = 'rgba(9,8,18,.88)';
    sheet.innerHTML = `<div class="px-panel p-6 w-full max-w-md">
      <div class="text-xl font-black mb-1">🔑 搶先體驗</div>
      <p class="text-sm mb-3" style="color:var(--dim)">老師有給你通關密語嗎？輸入在下面。</p>
      <input id="nw-code-in" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="輸入通關密語"
        class="w-full p-3 rounded-lg px-panel in mono text-sm">
      <div id="nw-code-err" class="text-sm mt-2" style="color:#e5705f;min-height:1.2em"></div>
      <div class="flex gap-2 justify-end mt-3">
        <button class="px-btn px-4 py-2" data-close>取消</button>
        <button class="px-btn gold px-5 py-2" data-ok>確定</button></div></div>`;
    const inp = sheet.querySelector('#nw-code-in'), err = sheet.querySelector('#nw-code-err');
    const submit = async () => {
      if (!cleanCode(inp.value)) { err.textContent = '先輸入密語。'; return; }
      err.textContent = '檢查中…';
      if (await redeem(inp.value)) { sheet.remove(); toast('歡迎搶先體驗新世界！', 2600); after && after(); }
      else err.textContent = '密語不對，再確認一次（要分大小寫）。';
    };
    sheet.addEventListener('click', e => { if (e.target === sheet || e.target.closest('[data-close]')) sheet.remove(); if (e.target.closest('[data-ok]')) submit(); });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    document.body.appendChild(sheet);
    inp.focus();
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
    if (village) { village.destroy(); village = null; }
    root.innerHTML = `<div class="max-w-5xl mx-auto p-4 pb-16 nwv" data-view="${name}">${html}</div>`;
    root.scrollTo({ top: 0 });
    if (mount) mount(root.firstElementChild);
  }
  const topbar = (title, back, backTxt) => `
    <div class="flex items-center justify-between gap-2 mb-4">
      <h2 class="text-2xl font-black">${title}</h2>
      <button class="px-btn text-sm px-4 py-2" data-act="${back}">${backTxt || '← 回獵人村'}</button>
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

  const FAST = location.hostname === 'localhost' && (() => { try { return localStorage.getItem('mg_nw_fast') === '1'; } catch (e) { return false; } })();
  let village = null;
  const myChibi = () => heroLook(NW.look, NW.starter || 'staff');

  function enterBuilding(b) {
    if (b.id === 'gate') { leave(); return; }
    const d = doorTile(b);
    NW.pos = [d[0], d[1] + 1];
    if (b.act) { ({ map: viewBoard, rank: openRank }[b.act] || (() => {}))(); return; }
    openWip(b);
  }

  function viewHub() {
    stopAnims();
    const need = hrNeed(NW.hr), pct = NW.hr >= HR_MAX ? 100 : Math.min(100, NW.hrExp / need * 100);
    const matN = Object.values(NW.mats).reduce((a, b) => a + b, 0);
    const q = currentQuest(NW);
    setView('hub', `
      <div class="px-panel" style="position:sticky;top:6px;z-index:5;margin-bottom:12px;padding:10px 14px">
        <div class="flex gap-3 items-center flex-wrap">
          <div class="px-img" data-hero="1" style="background:#0e0b16;padding:4px;border:3px solid #0a0714"></div>
          <div class="flex-1 min-w-[200px]">
            <div class="text-xl px-text font-black">${escHtml(ME.name)} ${NW.title ? `<span class="px-chip" style="color:var(--gold)">${escHtml(NW.title)}</span>` : ''}</div>
            <div class="flex items-center gap-2 mt-1"><b class="px-text" style="color:#ffd98a">獵人 Lv ${NW.hr}</b>
              <div class="px-bar xp flex-1"><i style="width:${pct}%"></i></div>
              <span class="text-xs mono">${NW.hr >= HR_MAX ? '滿級' : `${NW.hrExp}/${need}`}</span></div>
            <div class="flex gap-4 mt-1 text-sm flex-wrap px-text"><span>🪙 ${NW.coins}</span><span>📦 ${matN}</span><span>⭐ ${NW.stars}</span>
              ${q ? `<button class="px-chip" data-act="bagq" style="color:#ffd98a;cursor:pointer">📌 ${escHtml(q.t)}</button>` : ''}</div>
          </div>
          <button class="px-btn gold" data-act="bagopen">🎒 背包</button>
          <button class="px-btn" data-act="leave">← 回舊世界</button>
        </div>
      </div>
      <div id="vmap"></div>
      <p class="px-text text-sm mt-3 text-center">電腦：用 WASD 或方向鍵走路，走到建築旁邊按 Enter 進去，也可以直接點建築。按 B 打開背包。手機：點建築或點地面。灰色的建築還在施工中。</p>`, el => {
      el.querySelector('[data-hero]').replaceChildren(PX.chibi(myChibi(), 'down', 0, 3));
      village = mountVillage(el.querySelector('#vmap'), {
        PX, look: myChibi(), open: VILLAGE.buildings.filter(b => b.act).map(b => b.id),
        start: NW.pos || VILLAGE.start, scroller: root, fast: FAST, onEnter: enterBuilding
      });
    });
  }

  function openWip(b) {
    const matN = Object.values(NW.mats).reduce((a, c) => a + c, 0);
    const extra = (b.id === 'forge' || b.id === 'storage')
      ? `<p class="text-sm mt-2" style="color:#ffd98a">你已經存了 ${matN} 個材料、${NW.bp.length} 張圖紙，開張那天就能用！</p>` : '';
    const sheet = document.createElement('div');
    sheet.className = 'fixed inset-0 z-[80] grid place-items-center p-4';
    sheet.style.background = 'rgba(9,8,18,.88)';
    sheet.innerHTML = `<div class="px-panel w-full max-w-md text-center">
      <div class="px-img mx-auto mb-3" data-bld style="display:inline-block;background:#0e0b16;padding:8px;border:3px solid #0a0714"></div>
      <div class="text-2xl px-title">${b.name}</div>
      <div class="text-sm mb-3 px-text" style="color:#aab0b8">🔗 施工中・第 ${b.wip} 段開放</div>
      <p class="text-base px-text">${b.text}</p>${extra}
      <button class="px-btn gold mt-4" data-close>知道了</button></div>`;
    sheet.addEventListener('click', e => { if (e.target === sheet || e.target.closest('[data-close]')) sheet.remove(); });
    document.body.appendChild(sheet);
    sheet.querySelector('[data-bld]').replaceChildren(PX.building(b.kind, 4, true));
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
      ${first ? '' : topbar('自己選造型', 'bag', '← 回背包')}
      <div class="px-panel p-5">
        ${first ? `<div class="mb-4"><div class="text-2xl font-black">歡迎來到新世界！</div>
          <p class="mt-1" style="color:var(--dim)">村長說：「先決定你長什麼樣子吧。」之後隨時都可以再改。</p></div>` : ''}
        <div class="flex gap-6 flex-wrap items-center">
          <div class="nw-px" data-prev="1" style="background:#0e0b16;border-radius:8px;padding:10px"></div>
          <div class="flex-1 min-w-[240px]" data-picker>${lookPicker(look)}</div>
        </div>
        <div class="mt-5 text-right"><button class="px-btn gold px-8 py-3 text-lg" data-save>${first ? '決定了！下一步' : '儲存'}</button></div>
      </div>`, el => {
      const prev = el.querySelector('[data-prev]');
      const redraw = () => prev.replaceChildren(PX.hero(heroLook(look, NW.starter || 'staff'), 9));
      redraw();
      wireLook(el, look, redraw);
      el.querySelector('[data-save]').addEventListener('click', () => {
        NW.look = look; saveNw();
        if (!NW.starter) viewStarter(); else { viewHub(); openBackpack('equip'); }
      });
    });
  }

  function viewStarter() {
    const canSwap = !NW.starter || NW.hunts < 3;
    const pick = Object.assign({}, { w: NW.starter || '' });
    const cards = Object.entries(STARTERS).map(([k, s]) => `
      <div class="px-panel in p-3" data-card="${k}" style="cursor:pointer;border:2px solid ${pick.w === k ? 'var(--gold)' : 'var(--line)'}">
        <div class="flex items-center justify-between mb-2"><b class="text-lg">${s.name}</b>
          <span class="text-xs px-2 py-0.5 rounded-full" style="border:1px solid ${s.fam === '新的' ? 'var(--gr)' : 'var(--dim)'};color:${s.fam === '新的' ? 'var(--gr)' : 'var(--dim)'}">${s.fam}</span></div>
        <canvas data-anim="${k}" width="120" height="70" style="width:100%;max-width:360px;background:#0e0b16;border-radius:8px;image-rendering:pixelated"></canvas>
        <div class="text-sm mt-2" style="color:var(--dim)">${s.kind}：${s.desc}</div>
      </div>`).join('');
    setView('starter', `
      ${NW.starter ? topbar('換一把武器', 'bag', '← 回背包') : ''}
      <div class="px-panel p-5">
        <div class="text-2xl font-black">選擇你的第一把武器</div>
        <p class="mt-1 mb-4" style="color:var(--dim)">${NW.starter ? `前 3 場狩獵可以免費換，你已經打了 ${NW.hunts} 場。` : '前 3 場狩獵都可以免費換，不用擔心選錯！'}</p>
        <div class="grid gap-3" style="grid-template-columns:repeat(auto-fill,minmax(260px,1fr))">${cards}</div>
        <div class="mt-5 text-right"><button class="px-btn gold px-8 py-3 text-lg" data-ok disabled style="opacity:.5">選好了</button></div>
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

  const MAT = (() => {
    const m = {};
    Object.values(MONSTERS).forEach(mo => {
      mo.drops.forEach(([id, name, color]) => { m[id] = [name, color]; });
      mo.rare.forEach(([id, name, color]) => { m[id] = [name.replace('📜 ', ''), color]; });
    });
    Object.entries(STARTERS).forEach(([k, st]) => { m['bp_' + k] = [st.name + '圖紙', 'gray']; });
    return m;
  })();
  const matName = id => MAT[id] || [id, 'gray'];

  function questBody() {
    const q = currentQuest(NW), done = MAIN_QUESTS.filter(x => NW.quest.done.includes(x.id));
    return `
      <div class="label mb-1">主線 第 1 章　新芽草原</div>
      ${q ? `<div class="text-2xl px-title">${escHtml(q.t)}</div>
        <p class="mt-2 px-text">${escHtml(q.hint)}</p>
        ${q.prog ? `<p class="mt-2 font-bold" style="color:#ffd98a">${q.prog(NW)}</p>` : ''}
        <p class="mt-2 text-sm px-text">獎勵：<b style="color:#ffd98a">${escHtml(q.rewardText)}</b></p>`
      : '<div class="text-xl px-title">第 1 章完成了！之後的任務會陸續開放。</div>'}
      ${done.length ? `<h3 class="text-lg mt-4 mb-2">完成了</h3><div class="grid gap-2">${done.map(d => `<div class="px-panel in flex justify-between"><span>✅ ${escHtml(d.t)}</span>
        <span class="text-sm" style="color:#aab0d8">${escHtml(d.rewardText)}</span></div>`).join('')}</div>` : ''}
      <p class="text-xs mt-3" style="color:#aab0d8">還有幾個任務要等鐵匠鋪開張才會出現。每日任務在第 3 段開放。</p>`;
  }

  function bagBody(tab) {
    if (tab === 'equip') {
      const w = STARTERS[NW.starter], swapLeft = Math.max(0, 3 - NW.hunts);
      return `
        <div class="flex gap-4 flex-wrap items-center">
          <div class="px-img" data-hero style="background:#0e0b16;padding:8px;border:3px solid #0a0714"></div>
          <div class="flex-1" style="min-width:200px">
            <div class="label">現在的武器</div>
            <div class="text-xl px-title">${w ? w.name : '還沒選'} <span class="text-sm" style="color:#aab0d8">${w ? w.kind : ''}</span></div>
            <p class="text-sm mt-1 px-text">${w ? w.desc : ''}</p>
            <div class="flex gap-2 mt-3 flex-wrap">
              <button class="px-btn gold" data-bag-act="starter">${swapLeft > 0 ? '換武器' : '武器（不能再免費換）'}</button>
              <button class="px-btn" data-bag-act="creator">💇 改造型</button></div>
            <p class="text-xs mt-2" style="color:#aab0d8">${swapLeft > 0 ? `前 3 場狩獵可以免費換，還剩 ${swapLeft} 場。` : '前 3 場已經過了，之後要打造新武器才能換。'}穿上新的裝備，角色也會跟著變（第 2～3 段）。</p>
          </div>
        </div>`;
    }
    if (tab === 'items') {
      const rows = Object.entries(NW.items).filter(([, n]) => n > 0).map(([id, n]) => `<div class="px-panel in flex justify-between"><span>🧪 ${id === 'potion' ? '回復藥' : id}</span><b>×${n}</b></div>`);
      return `<h3 class="text-lg mb-2">道具</h3>${rows.length ? `<div class="grid gap-2">${rows.join('')}</div>` : '<p class="px-text">還沒有道具。</p>'}
        <p class="text-xs mt-3" style="color:#aab0d8">回復藥要等商店開張（第 3 段）才能在戰鬥中使用，先幫你存著。</p>`;
    }
    if (tab === 'mats') {
      const rows = Object.entries(NW.mats).filter(([, n]) => n > 0).map(([id, n]) => { const [nm, c] = matName(id); return `<div class="px-panel in flex justify-between"><span><span style="color:${COLOR_HEX[c]}">■</span> ${nm}</span><b>×${n}</b></div>`; });
      return `<h3 class="text-lg mb-2">材料</h3>${rows.length ? `<div class="grid gap-2" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">${rows.join('')}</div>` : '<p class="px-text">還沒有材料。打倒魔物就會掉。</p>'}
        <p class="text-xs mt-3" style="color:#aab0d8">鐵匠鋪開張（第 2 段）就能用來打造武器和裝備。</p>`;
    }
    if (tab === 'bp') {
      const rows = NW.bp.map(id => { const [nm, c] = matName(id); return `<div class="px-panel in"><span style="color:${COLOR_HEX[c]}">📜</span> ${nm}</div>`; });
      return `<h3 class="text-lg mb-2">圖紙</h3>${rows.length ? `<div class="grid gap-2" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">${rows.join('')}</div>` : '<p class="px-text">還沒有圖紙。打倒魔物有機會掉。</p>'}`;
    }
    if (tab === 'quest') return questBody();
    const mons = Object.entries(MONSTERS).map(([k, m]) => `<div class="px-panel in text-center" style="padding:6px"><div class="px-img" data-sprite="monster:${k}:3" style="${(NW.dex[k] || 0) ? '' : 'filter:grayscale(1) brightness(.35)'}"></div>
      <div class="text-sm font-bold">${(NW.dex[k] || 0) ? m.name : '？？？'}</div><div class="text-xs" style="color:#aab0d8">打過 ${NW.dex[k] || 0} 次</div></div>`).join('');
    const own = Object.entries(STARTERS).map(([k, st]) => `<div class="px-panel in text-center" style="padding:6px;${k === NW.starter ? 'outline:3px solid #e8b64c' : ''}"><div class="px-img" data-sprite="weapon:${k}:3"></div><div class="text-sm font-bold">${st.kind}</div></div>`).join('');
    const locked = LOCKED_WEAPONS.map(([k, n, seg]) => `<div class="px-panel in text-center" style="padding:6px"><div class="px-img" data-sprite="weapon:${k}:3" style="filter:grayscale(1) brightness(.4)"></div><div class="text-sm font-bold" style="color:#aab0b8">🔒 ${n}</div><div class="text-xs" style="color:#aab0d8">第 ${seg} 段</div></div>`).join('');
    return `<h3 class="text-lg mb-2">魔物圖鑑</h3><div class="grid gap-2" style="grid-template-columns:repeat(auto-fill,minmax(110px,1fr))">${mons}</div>
      <h3 class="text-lg mt-4 mb-2">武器圖鑑</h3><div class="grid gap-2" style="grid-template-columns:repeat(auto-fill,minmax(110px,1fr))">${own}${locked}</div>`;
  }

  function closeBag() { const b = document.getElementById('nw-bag'); if (b) b.remove(); }
  function openBackpack(tab) {
    closeBag();
    const TABS = [['equip', '⚔', '裝備'], ['items', '🧪', '道具'], ['mats', '📦', '材料'], ['bp', '📜', '圖紙'], ['quest', '🧭', '任務'], ['dex', '📖', '圖鑑']];
    const sheet = document.createElement('div');
    sheet.id = 'nw-bag'; sheet.className = 'fixed inset-0 z-[75] overflow-y-auto'; sheet.style.background = 'rgba(9,8,18,.9)';
    sheet.innerHTML = `<div class="max-w-4xl mx-auto p-3"><div class="px-panel" style="padding:12px">
      <div class="flex items-center justify-between mb-3"><div class="px-title text-2xl">🎒 背包</div><button class="px-btn" data-bag-close>關閉（B）</button></div>
      <div class="flex gap-3 flex-wrap"><div class="flex flex-col gap-2" style="min-width:120px">${TABS.map(([k, i, n]) => `<button class="px-btn" data-bag-tab="${k}">${i} ${n}</button>`).join('')}</div>
        <div class="flex-1 px-panel in" style="min-width:260px;min-height:320px" data-body></div></div></div></div>`;
    const render = t => {
      sheet.querySelectorAll('[data-bag-tab]').forEach(b => b.setAttribute('aria-pressed', b.dataset.bagTab === t));
      const body = sheet.querySelector('[data-body]');
      body.innerHTML = bagBody(t);
      mountSprites(body);
      const h = body.querySelector('[data-hero]'); if (h) h.replaceChildren(PX.hero(myHero(), 6));
    };
    sheet.addEventListener('click', e => {
      if (e.target === sheet || e.target.closest('[data-bag-close]')) { closeBag(); return; }
      const t = e.target.closest('[data-bag-tab]'); if (t) { render(t.dataset.bagTab); return; }
      const a = e.target.closest('[data-bag-act]');
      if (a) { closeBag(); if (a.dataset.bagAct === 'starter') viewStarter(); else viewCreator(false); }
    });
    document.body.appendChild(sheet);
    render(tab || 'equip');
  }
  addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (/INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '') || root.classList.contains('hidden') || !NW) return;
    if (k === 'b' && ['hub', 'board', 'room'].includes(view)) { document.getElementById('nw-bag') ? closeBag() : openBackpack('equip'); }
    if (k === 'escape') closeBag();
  });

  let boardSel = null;
  const roomId = () => 'nwroom_' + ME.docId;
  const roomRef = () => C.doc(C.db, 'mg_config', roomId());

  async function loadRooms() {
    if (!C.online()) return [];
    const snap = await C.withTimeout(C.getDocs(C.query(C.collection(C.db, 'mg_config'),
      C.where(C.documentId(), '>=', 'nwroom_'), C.where(C.documentId(), '<', 'nwroom`'))), 5000, 'nw-rooms');
    const now = Date.now(), out = [];
    snap.forEach(d => {
      const r = d.data();
      if (!r || !r.mk || r.state === 'closed' || now - (r.t || 0) > 20 * 60 * 1000) return;
      out.push({ id: d.id, host: r.host, cls: r.cls, mk: r.mk, rk: r.rk, star: r.star, n: (r.members || []).length || 1, state: r.state, me: d.id === roomId(), t: r.t || 0 });
    });
    return out.sort((a, b) => (b.me ? 1 : 0) - (a.me ? 1 : 0) || b.t - a.t);
  }
  const writeRoom = (data, merge) => C.online()
    ? C.withTimeout(C.setDoc(roomRef(), data, merge ? { merge: true } : undefined), 4000, 'nw-room').catch(e => console.warn('房間寫入失敗', e)) : Promise.resolve();
  const closeRoom = () => (C.online() && C.deleteDoc ? C.withTimeout(C.deleteDoc(roomRef()), 4000, 'nw-room-del').catch(() => {}) : Promise.resolve());

  function viewBoard() {
    setView('board', `${topbar('📜 冒險者公會', 'hub')}<div id="board"></div>`, el => {
      village = mountBoard(el.querySelector('#board'), { PX, NW, selected: boardSel, loadRooms, onSelect: id => { boardSel = id; }, onHunt: q => openRoom(q) });
    });
  }

  async function openRoom(q) {
    cur.q = q;
    await writeRoom({ host: ME.name, cls: ME.className, mk: q.mk, rk: q.rk, star: q.star, state: 'open', members: [ME.docId], t: Date.now() });
    viewRoom(q);
  }

  function viewRoom(q) {
    const m = MONSTERS[q.mk], r = REGIONS[q.rk];
    setView('room', `
      ${topbar('🚪 你的房間', 'leaveroom', '← 離開房間')}
      <div class="px-panel">
        <div class="flex gap-5 flex-wrap">
          <div class="px-panel in text-center" style="background:#e8d8b0!important;color:#3a2814;min-width:170px">
            <div style="color:#9a2a1a;font-weight:900">${'★'.repeat(q.star)}<span style="color:#b8a888">${'☆'.repeat(5 - q.star)}</span></div>
            <div class="px-img" data-ink style="display:inline-block;margin:4px 0"></div>
            <div style="font-weight:900;font-size:1.15em">討伐 ${m.name}</div>
            <div style="font-size:.85em">Lv ${q.lv}・${r.name}</div>
          </div>
          <div class="flex-1" style="min-width:260px">
            <div class="label mb-2">隊伍（最多 4 人）</div>
            <div class="grid gap-2" style="grid-template-columns:repeat(auto-fill,minmax(120px,1fr))">
              <div class="px-panel in text-center"><div class="px-img" data-me style="display:inline-block"></div><div class="font-bold">${escHtml(ME.name)}</div><div class="px-chip" style="color:#ffd98a">房主</div></div>
              ${[2, 3, 4].map(() => '<div class="px-panel in text-center" style="opacity:.5;display:grid;place-items:center;min-height:110px"><div>等待隊友</div></div>').join('')}
            </div>
            <p class="text-sm mt-3 px-text">你的房間已經貼在公會的「房間」分頁，同學看得到。<span style="color:#ffd98a">組隊一起打第 4 段才開放，現在先單人出發！</span></p>
            <div class="mt-4 flex gap-3 flex-wrap"><button class="px-btn gold" style="padding:12px 28px;font-size:1.15em" data-act="startroom">⚔ 出發</button>
              <button class="px-btn" data-act="leaveroom">離開房間</button></div>
          </div>
        </div>
      </div>`, el => {
      el.querySelector('[data-ink]').replaceChildren(PX.ink('monster', q.mk, 4));
      el.querySelector('[data-me]').replaceChildren(PX.chibi(myChibi(), 'down', 0, 5));
    });
  }

  function launch(q) {
    stopAnims();
    writeRoom({ state: 'fighting', t: Date.now() }, true);
    show('nw-root', false);
    startBattle(env(), { rk: q.rk, mk: q.mk, star: q.star }, res => {
      show('nw-root', true);
      closeRoom();
      afterHunt(res);
    });
  }

  function afterHunt(res) {
    const sum = finishHunt(res);
    showResult(res, sum, () => { if (sum.quests.length) toast(`任務完成：${sum.quests[0].t}　獎勵：${sum.quests[0].rewardText}`, 3600); viewBoard(); });
  }

  function finishHunt(res) {
    const lv = regionLv(res.rk, res.star), m = MONSTERS[res.mk];
    const s = NW.stat;
    NW.hunts++;
    s.dodgeOk += res.dodgeOk; s.dodgeAll += res.dodgeAll; s.defOk += res.defOk; s.defAll += res.defAll;
    const sum = { lv, win: res.result === 'win', exp: 0, coins: 0, drops: [], rare: [], ups: 0, quests: [], star: res.star };
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
      sum.hr0 = NW.hr; sum.exp0 = NW.hrExp;
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
    const m = MONSTERS[res.mk], win = sum.win;
    const title = win ? '討伐成功！' : (res.result === 'retreat' ? '撤退了' : '狩獵失敗');
    const slot = (inner, extra = '') => `<div class="px-panel in" style="min-width:140px;display:flex;gap:6px;align-items:center;${extra}">${inner}</div>`;
    const drops = sum.drops.map(d => slot(`<span style="font-size:1.4em;color:${COLOR_HEX[d.color]}">■</span><span>${d.name}</span><b style="margin-left:auto">×${d.n}</b>`)).join('');
    const rare = sum.rare.map(d => slot(`<span style="font-size:1.3em">📜</span><span style="color:${COLOR_HEX[d.color]}">${d.name}</span><b class="px-cursor" style="margin-left:auto;color:#ffd98a">新！</b>`, 'outline:3px solid #ffd24a')).join('');
    const need = hrNeed(sum.hr0 || NW.hr), p0 = (sum.exp0 || 0) / need * 100, p1 = NW.hr >= HR_MAX ? 100 : Math.min(100, NW.hrExp / hrNeed(NW.hr) * 100);
    const sheet = document.createElement('div');
    sheet.id = 'nw-result';
    sheet.className = 'fixed inset-0 z-[90] overflow-y-auto';
    sheet.style.background = 'rgba(9,8,18,.94)';
    sheet.innerHTML = `<div class="max-w-2xl mx-auto p-4 py-6">
      <div style="text-align:center;margin-bottom:-14px;position:relative;z-index:2"><span class="px-title" style="display:inline-block;padding:6px 36px;font-size:2em;background:#4a2f16 url(${PX.wood().toDataURL()});background-size:144px;border:5px solid #1c1008;box-shadow:inset 0 0 0 3px #8a6a3a;color:${win ? '#ffd98a' : '#e5705f'}">${title}</span></div>
      <div class="px-panel" style="padding-top:26px">
        <div class="flex gap-4 flex-wrap items-start">
          <div class="px-panel in text-center" style="background:#e8d8b0!important;color:#3a2814;min-width:150px;position:relative">
            <div class="px-img" data-ink style="display:inline-block"></div>
            <div style="font-weight:900">${m.name}</div><div style="font-size:.85em">Lv ${sum.lv}・${'★'.repeat(sum.star)}</div>
            ${win ? '<div style="position:absolute;right:6px;top:36px;transform:rotate(-16deg);border:3px solid #a82a1a;color:#a82a1a;padding:0 6px;font-weight:900;opacity:.85">討伐完成</div>' : ''}
          </div>
          <div class="flex-1 grid gap-2" style="min-width:220px;grid-template-columns:1fr 1fr">
            <div class="px-panel in">用時 <b>${Math.floor(res.secs / 60)}:${String(Math.round(res.secs % 60)).padStart(2, '0')}</b></div>
            <div class="px-panel in">正確率 <b>${Math.round(res.accuracy * 100)}%</b></div>
            <div class="px-panel in">閃避 <b>${res.dodgeOk}/${res.dodgeAll}</b></div>
            <div class="px-panel in">防禦 <b>${res.defOk}/${res.defAll}</b></div>
            <div class="px-panel in" style="grid-column:1/3">最高連擊 <b>${res.maxCombo || 0}</b></div>
          </div>
        </div>
        ${res.valid ? '' : `<p class="mt-3 px-panel in" style="color:#e5705f">${escHtml(res.invalidWhy || '這場不算數')}</p>`}
        ${res.valid ? `<div class="label mt-4 mb-2">獲得</div>
          <div class="flex gap-2 flex-wrap">${drops}${rare}</div>
          <div class="flex gap-5 mt-3 px-text" style="font-size:1.1em"><span>🪙 字元 +<b data-n="${sum.coins}">0</b></span><span>⭐ 獵人經驗 +<b data-n="${sum.exp}">0</b></span></div>
          <div class="flex items-center gap-2 mt-2"><b class="px-text" style="color:#ffd98a">獵人 Lv ${NW.hr}</b><div class="px-bar xp flex-1"><i data-hr style="width:${p0}%"></i></div></div>
          ${sum.ups ? `<div class="px-title mt-2 px-cursor" style="font-size:1.2em">獵人等級升到 ${NW.hr}！拿到 ${sum.ups} 顆星星（第 5 段才能用，先存著）</div>` : ''}
          <p class="text-xs mt-2" style="color:#aab0d8">材料和圖紙先幫你存著，鐵匠鋪開張就能用。</p>` : ''}
        <div class="mt-5 text-right"><button class="px-btn gold" style="padding:10px 30px;font-size:1.1em" data-close>回公會</button></div>
      </div></div>`;
    sheet.addEventListener('click', e => { if (e.target.closest('[data-close]')) { sheet.remove(); done(); } });
    document.body.appendChild(sheet);
    sheet.querySelector('[data-ink]').replaceChildren(PX.ink('monster', res.mk, 4));
    requestAnimationFrame(() => requestAnimationFrame(() => { const h = sheet.querySelector('[data-hr]'); if (h) { h.style.transition = 'width 1.1s steps(14)'; h.style.width = p1 + '%'; } }));
    sheet.querySelectorAll('[data-n]').forEach(el => { const to = +el.dataset.n, t0 = performance.now(); const tick = now => { const k = Math.min(1, (now - t0) / 800); el.textContent = Math.round(to * k); if (k < 1 && el.isConnected) requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
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
      ({ leave, hub: viewHub, map: viewBoard, bagopen: () => openBackpack('equip'), bagq: () => openBackpack('quest'),
         bag: () => { viewHub(); openBackpack('equip'); }, creator: () => viewCreator(false),
         leaveroom: () => { closeRoom(); viewBoard(); }, startroom: () => launch(cur.q),
         starter: viewStarter, rank: () => openRank() }[act] || (() => {}))();
      return;
    }
  });

  return { enter, gate, leave, refresh: refreshAccess, openCode: openCodeSheet, get nw() { return NW; }, isOpen: () => !root.classList.contains('hidden') };
}
