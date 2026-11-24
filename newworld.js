import { PX } from './pixel.js';
import {
  LOOK, DEFAULT_LOOK, heroLook, STARTERS, LOCKED_WEAPONS, REGIONS, MAP_POS, ELEM, STATUS, MONSTERS,
  regionLv, MAIN_QUESTS, normalizeNw, currentQuest, zoneOpen, starOpen, addHrExp, hrNeed, huntExp, huntCoins,
  COLOR_NAME, COLOR_HEX, HR_MAX, VILLAGE, doorTile, buildingOpen, goalOf, TEST_TAGS, FB_COINS, FB_MINLEN, BUG_COINS, bugCoins, BUG_REWARD_MAX, LESSON_COINS, TESTER_MISSIONS, checkMissions, GIFT_WEAPONS, weaponInfo, weaponBase, curWeapon, WORDS, WORD_GROUPS, checkWords, setTitleParts, wordById, normName, ITEM_DEFS, displayName, NOTICES, MAT_INFO, isBpId, isMatId, TUT_LESSONS, ZONE_STAR_MAX
} from './nw-data.js';
import { injectUi } from './nw-ui.js';
import { setStarter, gearDef, gearItem, doEquip, equippedItem, rollBlueprints, giveGear, giftGearOk, itemName, itemText, forgeHint, stageOpen, GEAR_MAX, wordOpen, newGearId, syncLegacy, giveClothBps, craftList, BP_DUP_COINS, susCheck, SUS } from './nw-data.js';
import { openForge, gearTab, matsTab, bpTab } from './nw-forge.js';
import { tierOf, EQUIP_LEFT, EQUIP_RIGHT, chibiOf, heroOf, titleBadgeHtml, darkDots, equipSlotHtml, mountSprites as mountSpritesPx, CARD_CSS } from './nw-card.js';
import { mountVillage } from './nw-village.js';
import { mountBoard } from './nw-board.js';
import { startBattle } from './nw-battle.js';
import { openNwRank } from './nw-rank.js';
import { tour, openAcademy } from './nw-academy.js';
import { createEvents, ruleLines, finalRows, awardList, dateText, METRIC_NAME, METRIC_UNIT, runsNeed, BOARD_SIZE } from './nw-events.js';
import { createNotice, newsLatest, BUG_MILESTONES } from './nw-notice.js';
import { rankBoardHtml, mountRankBoard } from './nw-rankboard.js';
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
  let mailCount = 0, mailList = [], mailAt = 0, mailBusy = false;
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
    mailList = []; mailAt = 0; mailCount = 0;
    /* 時差、抓蟲榜、換名判斷各讀一份文件，一起等；網路慢時最多等 5 秒，不卡進村 */
    await Promise.all([syncClock(), syncBoard(true)]);
    await checkName();
    checkWords(NW);
    flushRuns();   // 上次沒寫進去的場次紀錄（離線、逾時）進村時補寫
    if (C.setTitle) C.setTitle(NW.title || '', (NW.titleParts || []).length);
  }

  /* ── 伺服器時間（mg_clock）：學生改電腦時間也領不到還沒到期的東西 ──
     寫一次 serverTimestamp 再讀回來，用來回時間的中點算時差；讀不到就當 0（用本機時間）。
     不放在 mg_rooms：loadRooms() 每次打開委託板都會讀整個集合。 */
  let clockSkew = 0;
  const now = () => Date.now() + clockSkew;
  C.now = now;
  /* 活動（nw-events.js）。grant：領獎，信裡有這版不認得的東西就整份不領（回 null），跟信箱同一套規矩 */
  const EV = createEvents(C, {
    now, me: () => ME, nw: () => NW, save: () => saveNw(), saveNow: () => saveNwNow(), myName: () => ME.name,
    grant: items => (Array.isArray(items) && items.every(itemKnown)) ? items.map(applyReward).filter(Boolean) : null
  });
  /* 進村、開佈告欄時：清舊紀錄、提示被取消的活動、檢查全班獎 */
  let evChecking = false;
  async function eventsCheck() {
    if (evChecking || !NW) return;
    evChecking = true;
    try {
      const gone = EV.sweep();
      if (gone.length) toast(gone.map(t => `「${t}」這個活動取消了`).join('；'), 4200);
      const gifts = await EV.claimClassWar();
      for (const g of gifts) await showGift(g);
      if (gifts.length && view === 'hub') viewHub();
    } finally { evChecking = false; }
  }
  async function syncClock() {
    if (!C.online()) return;
    const ref = C.doc(C.db, 'mg_clock', ME.docId);
    try {
      const t0 = Date.now();
      await C.withTimeout(C.setDoc(ref, { t: C.serverTimestamp() }), 5000, 'nw-clock-w');
      const s = await C.withTimeout(C.getDoc(ref), 5000, 'nw-clock-r');
      const t1 = Date.now(), ts = s.exists() ? s.data().t : null;
      clockSkew = (ts && ts.toMillis) ? ts.toMillis() - Math.round((t0 + t1) / 2) : 0;
    } catch (e) { clockSkew = 0; console.warn('讀伺服器時間失敗，改用本機時間', e); }
  }

  /* ── 抓蟲榜（mg_bugboard/{我}）：老師確認回報時寫的，學生只讀 ──
     學生端不再讀 mg_nw_flags（裡面有學生真名，正式規則只有老師能讀）。
     件數取 max(本機, 雲端)：舊玩家以前領過的件數不會變少，BUG_REWARD_MAX 不會算錯。 */
  let board = null, boardAt = 0;
  const wordNotes = [];
  async function syncBoard(force) {
    if (!C.online() || (!force && Date.now() - boardAt < 20000)) return false;
    try {
      const s = await C.withTimeout(C.getDoc(C.doc(C.db, 'mg_bugboard', ME.docId)), 5000, 'nw-board');
      board = s.exists() ? s.data() : {}; boardAt = Date.now();
    } catch (e) { console.warn('讀抓蟲榜失敗', e); return false; }
    return applyBoard();
  }
  function applyBoard() {
    const n = Math.max(0, +board.n || 0), sc = Math.max(0, +board.score || 0);
    let ch = false;
    if (n > NW.bugs) { NW.bugs = n; ch = true; }
    if (sc !== NW.bugScore) { NW.bugScore = sc; ch = true; }
    if (ch) {
      /* 抓蟲徽章（bug1～bug10）這時候解鎖；通知等 refreshBoard() 一起跳，不在同步中途蓋畫面 */
      const ws = checkWords(NW); saveNw();
      if (ws.length) wordNotes.push(...ws);
    }
    noticeRefresh();
    return ch;
  }

  /* ── 冒名鎖（SPEC §1.5）：只擋隨手亂打名字，打對同學的名字就過了 ──
     v3.14.1 起名字固定（ME.name＝基準名字），登入時打的字放在 ME.typed，拿它跟基準比。
     基準 = 存檔裡只寫一次的 nw.name0（用改名卡改名時會換成新名字）；
     老師按「名字沒問題」時寫的 mg_bugboard.nameOkH（名字的雜湊，學生讀得到這份文件，所以不存真名）也算數，
     而且那個名字會變成新基準。 */
  let nameLock = false, nameBase = '';
  async function checkName() {
    const typed = ME.typed || ME.name || '', okH = board && typeof board.nameOkH === 'string' ? board.nameOkH : '';
    if (!NW.name0) { NW.name0 = ME.name || typed; saveNw(); }
    nameBase = NW.name0;
    const same0 = normName(typed) === normName(NW.name0), renamed = (NW.nameLog || []).length > 0;
    let ok;
    if (okH) {
      const hit = !!typed && (await sha256Hex(normName(typed))) === okH;
      ok = hit || (renamed && same0);
      /* 老師核可的新名字：換成新基準。用過改名卡的人不跟著換，不然改名會被舊的核可蓋回去 */
      if (hit && !same0 && !renamed) adoptName(typed);
    } else ok = same0;
    nameLock = !!typed && !ok;
    if (nameLock) writeNameFlag(typed, nameBase);
  }
  function adoptName(n) {
    NW.name0 = n; ME.name = n; nameBase = n;
    if (C.onRename) C.onRename(n);
    saveNw();
  }
  /* ID 帶新名字的雜湊：同一個新名字只有一筆，換成別的名字才會多一筆 */
  async function writeNameFlag(cur, base) {
    if (!C.online()) return;
    const h8 = (await sha256Hex(normName(cur))).slice(0, 8);
    if (NW.nameFlagged[h8]) return;
    try {
      await C.withTimeout(C.setDoc(C.doc(C.db, 'mg_nw_flags', `namechg_${ME.docId}_${h8}`), { type: 'namechg', status: 'pending', docId: ME.docId, cls: ME.className, seat: ME.seat, name: cur, oldName: base, t: Date.now() }), 6000, 'nw-namechg');
      NW.nameFlagged[h8] = 1; saveNw();
    } catch (e) {
      /* 已經有同一筆（內容不同的第二次寫會被規則擋）也算送過了，不要每次進村都再試 */
      if (e && e.code === 'permission-denied') { NW.nameFlagged[h8] = 1; saveNw(); } else console.warn('寫換名紀錄失敗', e);
    }
  }
  function saveNw() {
    NW.savedAt = Date.now();
    try { localStorage.setItem(lkey(), JSON.stringify(NW)); } catch (e) { /* 空間滿了就只存雲端 */ }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(pushCloud, 800);
  }
  /* nwNick＝登入名字，給榜單用（榜單查詢不讀整份 nw）；被老師隱藏的人照樣存，隱藏由顯示端負責 */
  function pushCloud() {
    if (!C.online() || !NW) return Promise.resolve();
    return C.withTimeout(C.setDoc(docRef(), { className: ME.className, seat: ME.seat, name: ME.name, nwTitle: NW.title || '', nwTitleN: (NW.titleParts || []).length, nwCls: ME.className, nwEvDone: NW.evDone || [], nwNick: ME.name || '', nw: NW }, { merge: true }), 6000, 'nw-save')
      .catch(e => console.warn('新世界存檔失敗', e));
  }
  /* 領信、領獎這種「領了就不能反悔」的事不等 800ms 的延遲：關掉分頁前先寫進雲端，另一個分頁才領不到第二次 */
  function saveNwNow() {
    NW.savedAt = Date.now();
    try { localStorage.setItem(lkey(), JSON.stringify(NW)); } catch (e) { /* 空間滿了就只存雲端 */ }
    clearTimeout(saveTimer);
    return pushCloud();
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

  function showTicket() {
    const sheet = document.createElement('div');
    sheet.id = 'nw-ticket'; sheet.className = 'nw-sheet fixed inset-0 z-[95] grid place-items-center p-4'; sheet.style.background = 'rgba(9,8,18,.9)';
    sheet.innerHTML = `<div class="px-panel text-center" style="max-width:420px;width:100%;padding:20px">
      <div class="px-title" style="font-size:1.5em">${PX.badge(3, 4)} 🎫 新世界門票</div>
      <p class="px-text mt-2">標點符號挑戰全部通關！你拿到「新世界門票」了！</p>
      <p class="px-text mt-3" style="font-size:.95em">新世界已經幫你開通！回到大廳，點「新世界之門」就能進去。</p>
      <div class="mt-4"><button class="px-btn gold" style="padding:8px 28px" data-x>知道了</button></div></div>`;
    sheet.addEventListener('click', e => { if (e.target === sheet || e.target.closest('[data-x]')) sheet.remove(); });
    document.body.appendChild(sheet);
  }

  function gate() {
    /* 打完標點符號挑戰＝新世界門票；跟輸入通關密語一樣算「搶先體驗」 */
    if (access || (C.punctDone && C.punctDone())) return { ok: true, early: true };
    const mode = C.nwMode();
    if (mode === 'off') return { ok: false, closed: true, why: '打完「標點符號挑戰」就能進新世界！' };
    if (mode === 'all' || unlocked()) return { ok: true };
    return { ok: false, why: `把打字練到 LV ${C.unlockLevel}（解鎖史詩）才能穿過傳送門！你目前最高 LV ${C.bestLevel()}。` };
  }

  function openCodeSheet(after) {
    const sheet = document.createElement('div');
    sheet.className = 'nw-sheet fixed inset-0 z-[80] grid place-items-center p-4';
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
  const myHero = (weapon, gear) => heroOf(NW, weapon, gear);

  function checkQuests() {
    const got = [];
    for (const q of MAIN_QUESTS) {
      if (NW.quest.done.includes(q.id)) continue;
      if (q.hold && q.hold()) continue;
      if (!q.test(NW)) { if (q.soft) continue; break; }
      NW.quest.done.push(q.id);
      const r = q.reward || {};
      if (r.items) for (const k in r.items) NW.items[k] = (NW.items[k] || 0) + r.items[k];
      if (r.hrExp) addHrExp(NW, r.hrExp);
      if (r.coins) NW.coins += r.coins;
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
  const mountSprites = scope => mountSpritesPx(PX, scope);

  async function enter() {
    const g = gate();
    if (!g.ok) { toast(g.why, 3600); return; }
    toast('穿過傳送門…', 1200);
    await loadNw();
    await EV.load(true);
    show('screen-lobby', false); show('btn-verlog', false); show('app-header', false);
    show('nw-root', true);
    if (!NW.look) viewCreator(true);
    else if (!NW.starter) viewStarter();
    else viewHub();
    eventsCheck();
  }
  function leave() {
    stopAnims();
    show('nw-root', false);
    C.gotoLobby();
  }

  const FAST = location.hostname === 'localhost' && (() => { try { return localStorage.getItem('mg_nw_fast') === '1'; } catch (e) { return false; } })();
  let village = null;
  /* 村莊地圖版本：2＝32×22 的新地圖。存檔裡 posV 不是 2 的舊座標（舊 22×15 地圖）一律回出生點 */
  const POS_V = 2;
  const myChibi = () => chibiOf(NW);

  function enterBuilding(b) {
    if (b.id === 'gate') { leave(); return; }
    if (b.id === 'mail') {
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      /* 領完信會重畫村莊（更新字元數），先記下站的位置，才不會被送回出生點 */
      if (village && village.pos) { NW.pos = village.pos(); NW.posV = POS_V; }
      openMail(); return;
    }
    /* 點過的按鈕會一直拿著焦點，之後在建築裡按 Enter 會被瀏覽器當成又點了一次 */
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    const d = doorTile(b);
    NW.pos = [d[0], d[1] + 1]; NW.posV = POS_V;
    if (buildingOpen(b)) { const go = { map: viewBoard, rank: openRank, academy: openAcademyUI, notice: () => openNotice(false), forge: openForgeUI, storage: openStorageUI }[b.act] || (() => {}); introOnce(b.id === 'board' ? 'board' : b.id).then(go); return; }
    openWip(b);
  }

  function viewHub() {
    stopAnims();
    /* 任務改版前就上完教學課的人、或在別台電腦補到進度的人：存檔裡有進度，但任務沒人替他算，會一直卡在「到教學大樓」。進村時補算一次 */
    const caught = checkQuests();
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
          <button class="px-btn gold" data-act="bagopen" style="position:relative">🎒 背包<i data-bagdot style="display:${mailCount > 0 ? 'block' : 'none'};position:absolute;top:-5px;right:-5px;width:14px;height:14px;background:#d83a3a;border:2px solid #0a0714"></i></button>
          <button class="px-btn" data-act="gift">🎁 序號</button>
          <button class="px-btn" data-act="notice" style="position:relative">📢 佈告欄<i data-noticedot style="display:${nflags.any ? 'block' : 'none'};position:absolute;top:-5px;right:-5px;width:14px;height:14px;background:#d83a3a;border:2px solid #0a0714"></i></button>
          <button class="px-btn" data-act="book">📓 測試員手冊</button>
          <button class="px-btn" data-act="bug">🐛 回報問題</button>
          <button class="px-btn" data-act="leave">← 回舊世界</button>
        </div>
      </div>
      <div id="vmap"></div>
      <p class="px-text text-sm mt-3 text-center" style="padding-right:min(190px,30vw)">電腦：用 WASD 或方向鍵走路，走到建築旁邊按 Enter 進去，也可以直接點建築。按 B 打開背包。手機：點建築或點地面。右下角的小地圖，點建築就傳送到它的門口。灰色的建築還在施工中。</p>`, el => {
      el.querySelector('[data-hero]').replaceChildren(PX.chibi(myChibi(), 'down', 0, 3));
      village = mountVillage(el.querySelector('#vmap'), {
        PX, look: myChibi(), open: VILLAGE.buildings.filter(buildingOpen).map(b => b.id),
        start: NW.posV === POS_V && NW.pos ? NW.pos : VILLAGE.start, scroller: root, fast: FAST, onEnter: enterBuilding, guide: guideBuilding(), mailN: () => mailCount, noticeBang: () => nflags.any, forgeFx: () => craftList(NW).some(x => x.can)
      });
      if (location.hostname === 'localhost') window.__NWV = village;   // 瀏覽器測試用（讀位置、傳送、走路）
      caught.forEach((q, i) => setTimeout(() => toast(`任務完成：${q.t}　獎勵：${q.rewardText}`, 3600), 600 + i * 3800));
      hubStart();
    });
  }

  function openWip(b) {
    const matN = Object.values(NW.mats).reduce((a, c) => a + c, 0);
    const extra = (b.id === 'forge' || b.id === 'storage')
      ? `<p class="text-sm mt-2" style="color:#ffd98a">你已經存了 ${matN} 個材料、${NW.bp.length} 張圖紙，開張那天就能用！</p>` : '';
    const sheet = document.createElement('div');
    sheet.className = 'nw-sheet fixed inset-0 z-[80] grid place-items-center p-4';
    sheet.style.background = 'rgba(9,8,18,.88)';
    sheet.innerHTML = `<div class="px-panel w-full max-w-md text-center">
      <div class="px-img mx-auto mb-3" data-bld style="display:inline-block;background:#0e0b16;padding:8px;border:3px solid #0a0714"></div>
      <div class="text-2xl px-title">${b.name}</div>
      <div class="text-sm mb-3 px-text" style="color:#aab0b8">🔗 施工中</div>
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
      const redraw = () => prev.replaceChildren(PX.hero(heroLook(look, curWeapon(NW) || 'staff'), 9));
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
        if (!canSwap) { toast('前 3 場以後就不能免費換了，要打造新武器才能換（鐵匠鋪施工中）', 3200); return; }
        pick.w = c.dataset.card; refresh();
      }));
      el.querySelectorAll('[data-anim]').forEach(cvs => animStops.push(runStarterAnim(cvs, cvs.dataset.anim)));
      refresh();
      ok.addEventListener('click', () => {
        const first = !NW.starter;
        if (!first && pick.w !== NW.starter) NW.swaps++;
        setStarter(NW, pick.w); saveNw();
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

  const MAT = MAT_INFO;
  const matName = id => MAT[id] || [id, 'gray'];
  /* ── 鐵匠鋪、倉庫（2b，SPEC-STAGE2 §3.6、§3.7、§3.11）── */
  const forgeCtx = () => ({ PX, NW: () => NW, save: saveNw, saveNow: saveNwNow, toast, esc: escHtml, now, fast: FAST, sync: syncGear, after: afterGear });
  /* 兩個分頁同時開：動作前先看雲端存檔有沒有比自己新，有就先換成雲端的，不然兩邊各扣一次材料、各做一件 */
  async function syncGear() {
    if (!C.online()) return false;
    try {
      const s = await C.withTimeout(C.getDoc(docRef()), 4000, 'nw-gear-sync');
      const cloud = s.exists() ? s.data().nw : null;
      if (cloud && (cloud.savedAt || 0) > (NW.savedAt || 0)) {
        NW = normalizeNw(cloud);
        try { localStorage.setItem(lkey(), JSON.stringify(NW)); } catch (e) { /* 空間滿了就只存雲端 */ }
        return true;
      }
    } catch (e) { console.warn('同步裝備存檔失敗', e); }
    return false;
  }
  /* 做完、穿上、強化後：算任務（1-5、1-6）和稱號詞條，回要跳的一句話 */
  function afterGear() {
    const qs = checkQuests(), ws = checkWords(NW);
    if (qs.length || ws.length) saveNw();
    const parts = [];
    if (qs.length) parts.push(`任務完成：${qs[0].t}　獎勵：${qs[0].rewardText}`);
    if (ws.length) parts.push(`新的稱號詞條：${ws.join('、')}`);
    return { note: parts.join('　') };
  }
  async function openForgeUI() {
    await introOnce('forge');
    if (!NW.forge.gift) {
      const got = giveClothBps(NW); saveNwNow();
      if (got.length) await showGift({ icon: '📜', title: `布裝圖紙 ×${got.length}`, note: '鐵匠送你一套布裝圖紙：布帽、布衣、布手套、布鞋。先做一件試試看！' });
    }
    const h = openForge(forgeCtx(), { onClose: () => { if (view === 'hub') viewHub(); } });
    if (!NW.intro.forgeTour && !window.__NW_NOINTRO__ && craftList(NW).some(x => x.can)) {
      NW.intro.forgeTour = 1; saveNw();
      const st = h.state, made0 = NW.forge.made;
      /* 導覽中關掉鐵匠鋪：導覽的提示指著不存在的按鈕，自動收起來，不卡住畫面 */
      const watch = setInterval(() => {
        if (!document.getElementById('nw-tour')) { clearInterval(watch); return; }
        if (!document.getElementById('nw-forge')) { const sk = document.querySelector('#nw-tour [data-skip]'); if (sk) sk.click(); clearInterval(watch); }
      }, 400);
      tour([
        { text: '左邊發亮的圖紙（有 ✨）就是材料夠了。點一下你想做的那張！', target: () => document.querySelector('#nw-forge .fg-row.can'), done: () => st.clicked || st.result || NW.forge.made > made0 },
        { text: '右邊寫著要用哪些材料。都打勾了，就按「打造」！', target: () => document.querySelector('#nw-forge [data-do-craft]'), done: () => !!st.result || NW.forge.made > made0, back: () => !document.getElementById('nw-forge') },
        { text: '做好了！按「穿上」，角色就會變。', target: () => document.querySelector('#nw-forge [data-wear]'), done: () => !st.result || !document.getElementById('nw-forge') }
      ], { title: '鐵匠鋪教學' });
    }
  }
  async function openStorageUI() {
    await introOnce('storage');
    openBackpack('mats');
  }

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
      <p class="text-xs mt-3" style="color:#aab0d8">${stageOpen('2b') ? '' : '還有幾個任務要等鐵匠鋪開張才會出現。'}每日任務施工中。</p>`;
  }

  let bagSort = 'color', bagSel = null, bagMat = null;
  function bagBody(tab) {
    if (tab === 'equip') {
      const cur = curWeapon(NW), w = weaponInfo(cur), swapLeft = Math.max(0, 3 - NW.hunts);
      const gt = gearTab(forgeCtx(), bagSort, bagSel); bagSel = gt.current;
      return `${gt.html}
        <div class="mt-3"><div class="label">現在的武器</div>
          <div class="text-xl px-title">${w ? w.name : '還沒選'} <span class="text-sm" style="color:#aab0d8">${w ? w.kind : ''}</span></div>
          <p class="text-sm mt-1 px-text">${w ? w.desc : ''}</p>
          <button class="px-btn gold mt-2" data-bag-act="starter">${swapLeft > 0 ? '換武器' : '武器（不能再免費換）'}</button>
          <p class="text-xs mt-2" style="color:#aab0d8">${swapLeft > 0 ? `前 3 場狩獵可以免費換，還剩 ${swapLeft} 場。` : (stageOpen('2b') ? '前 3 場已經過了，之後到鐵匠鋪打造新武器就能換。' : '前 3 場已經過了，之後要打造新武器才能換。')}格子裡的裝備，點一下就能穿上。打造出來的裝備會放在這個背包裡。</p></div>`;
    }
    if (tab === 'items') {
      const rows = Object.entries(NW.items).filter(([, n]) => n > 0).map(([id, n]) => { const d = ITEM_DEFS[id] || { name: id, icon: '📦' }; return `<div class="px-panel in flex justify-between items-center"><span class="flex items-center gap-2">${d.pixel ? `<span data-sprite="item:${d.pixel}:2"></span>` : d.icon} ${escHtml(d.name)}${d.desc && d.pixel ? `<small style="color:#aab0d8">　${escHtml(d.desc)}</small>` : ''}</span><b>×${n}</b></div>`; });
      return `<h3 class="text-lg mb-2">道具</h3>${rows.length ? `<div class="grid gap-2">${rows.join('')}</div>` : '<p class="px-text">還沒有道具。</p>'}
        <p class="text-xs mt-3" style="color:#aab0d8">回復藥要等商店開張才能在戰鬥中使用，先幫你存著。</p>`;
    }
    if (tab === 'mats') return matsTab(forgeCtx(), bagMat);
    if (tab === 'bp') return bpTab(forgeCtx());
    if (tab === 'quest') return questBody();
    const mons = Object.entries(MONSTERS).map(([k, m]) => `<div class="px-panel in text-center" style="padding:6px"><div class="px-img" data-sprite="monster:${k}:3" style="${(NW.dex[k] || 0) ? '' : 'filter:grayscale(1) brightness(.35)'}"></div>
      <div class="text-sm font-bold">${(NW.dex[k] || 0) ? m.name : '？？？'}</div><div class="text-xs" style="color:#aab0d8">打過 ${NW.dex[k] || 0} 次</div></div>`).join('');
    const own = Object.entries(STARTERS).map(([k, st]) => `<div class="px-panel in text-center" style="padding:6px;${k === NW.starter ? 'outline:3px solid #e8b64c' : ''}"><div class="px-img" data-sprite="weapon:${k}:3"></div><div class="text-sm font-bold">${st.kind}</div></div>`).join('');
    const locked = LOCKED_WEAPONS.map(([k, n, seg]) => `<div class="px-panel in text-center" style="padding:6px"><div class="px-img" data-sprite="weapon:${k}:3" style="filter:grayscale(1) brightness(.4)"></div><div class="text-sm font-bold" style="color:#aab0b8">🔒 ${n}</div><div class="text-xs" style="color:#aab0d8">施工中</div></div>`).join('');
    return `<h3 class="text-lg mb-2">魔物圖鑑</h3><div class="grid gap-2" style="grid-template-columns:repeat(auto-fill,minmax(110px,1fr))">${mons}</div>
      <h3 class="text-lg mt-4 mb-2">武器圖鑑</h3><div class="grid gap-2" style="grid-template-columns:repeat(auto-fill,minmax(110px,1fr))">${own}${locked}</div>`;
  }

  function syncTitle() { if (C.setTitle) C.setTitle(NW.title || '', (NW.titleParts || []).length); }


  function showGift(g) {
    return new Promise(done => {
      const sheet = document.createElement('div');
      sheet.id = 'nw-gift'; sheet.className = 'nw-sheet fixed inset-0 z-[97] grid place-items-center p-3'; sheet.style.zIndex = 97; sheet.style.background = 'rgba(9,8,18,.92)';
      sheet.innerHTML = `<style>@keyframes giftPop{0%{transform:scale(.4) rotate(-8deg)}60%{transform:scale(1.12) rotate(3deg)}100%{transform:scale(1) rotate(0)}}@keyframes giftBob{50%{transform:translateY(-6px)}}</style>
        <div class="px-panel text-center" style="max-width:420px;width:100%;padding:20px;animation:giftPop .5s ease-out">
          <div class="px-title" style="font-size:1.5em">🎁 收到禮物！</div>
          <div data-ico style="position:relative;display:inline-block;margin:14px auto 6px;min-width:90px;min-height:90px;animation:giftBob 1.4s ease-in-out infinite">${g.dark ? darkDots() : ''}</div>
          <div class="px-title" style="font-size:1.3em;color:#ffd98a">${escHtml(g.title)}</div>
          <p class="px-text mt-2" style="font-size:.95em">${escHtml(g.note || '')}</p>
          <div class="mt-4"><button class="px-btn gold" style="padding:8px 30px" data-ok>收下</button></div></div>`;
      const ico = sheet.querySelector('[data-ico]');
      if (g.weapon) ico.prepend(PX.canvas('weapon', g.weapon, 4, false)); else if (g.gear) ico.prepend(PX.canvas('gear', g.gear, 5, false)); else if (g.itemPx) ico.prepend(PX.canvas('item', g.itemPx, 4, false)); else ico.insertAdjacentHTML('afterbegin', `<span style="font-size:60px;line-height:90px">${g.icon || '🎁'}</span>`);
      sheet.addEventListener('click', e => { if (e.target.closest('[data-ok]')) { sheet.remove(); done(); } });
      document.body.appendChild(sheet);
    });
  }

  const posN = r => Number.isFinite(+r.n) && +r.n > 0;
  const intIn = (v, lo, hi) => typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;
  /* 資料表用 key 查：'constructor' 這種字不能被當成存在 */
  const own = (tbl, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(tbl, k);
  /* 老師補發的「狀態類」禮物（獵人等級、區域、圖鑑、教學課）領完要重新檢查任務與測試員任務，
     不然學生要等下一場狩獵才看到任務跟著往前 */
  let stateGifted = false;
  /* 每一種禮物一列：known＝這版程式認得、欄位合理（不認得就整封不領，才不會領一半、之後又領一次）；
     apply＝真的加進存檔，回通知內容；label＝信裡的小標籤。
     要加新種類（例如第 2 段的 gear）只要在這裡加一列、再到 teacher/gifts.js 加一列，其他地方都從這張表走。 */
  const REWARD = {
    weapon: {
      known: r => own(GIFT_WEAPONS, r.key),
      apply: r => {
        const w = GIFT_WEAPONS[r.key];
        if (!NW.gear.some(g => g.k === r.key)) giveGear(NW, r.key, 'green', 0, now());
        syncLegacy(NW);
        return { weapon: r.key, dark: !!w.dark, title: w.name, note: `${w.desc}　到背包的裝備格點一下就能換上。` };
      },
      label: r => `🗡 ${(GIFT_WEAPONS[r.key] || { name: '新武器' }).name}`
    },
    coins: {
      known: posN,
      apply: r => { NW.coins += +r.n; return { icon: '🪙', title: `字元 ×${r.n}`, note: '字元是新世界的貨幣，之後可以買東西、打造裝備。' }; },
      label: r => `🪙 字元 ×${r.n}`
    },
    potion: {
      known: posN,
      apply: r => { NW.items.potion = (NW.items.potion || 0) + +r.n; return { icon: '🧪', title: `回復藥 ×${r.n}`, note: '回復藥要等商店開張才能在戰鬥中使用，先幫你存著。' }; },
      label: r => `🧪 回復藥 ×${r.n}`
    },
    exp: {
      known: posN,
      apply: r => {
        const ups = addHrExp(NW, +r.n);
        return { icon: '⭐', title: `獵人經驗 +${r.n}`, note: ups ? `獵人等級升到 ${NW.hr}！` : '經驗滿了，獵人等級就會升級。' };
      },
      label: r => `⭐ 獵人經驗 +${r.n}`
    },
    item: {
      known: r => own(ITEM_DEFS, r.key) && posN(r),
      apply: r => {
        const d = ITEM_DEFS[r.key]; NW.items[r.key] = (NW.items[r.key] || 0) + +r.n;
        return d.pixel ? { itemPx: d.pixel, title: `${d.name} ×${r.n}`, note: d.desc } : { icon: d.icon || '📦', title: `${d.name} ×${r.n}`, note: d.desc };
      },
      label: r => `🎴 ${(ITEM_DEFS[r.key] || { name: '道具' }).name} ×${r.n}`
    },
    /* 材料一定要是資料表裡有的：打錯的 key 會變成叫不出名字的東西（SPEC-STAGE2 F6） */
    mat: {
      known: r => isMatId(r.key) && posN(r),
      apply: r => { const [nm] = matName(r.key); NW.mats[r.key] = (NW.mats[r.key] || 0) + +r.n; return { icon: '📦', title: `${nm} ×${r.n}`, note: '材料先幫你存著，鐵匠鋪開張就能用。' }; },
      label: r => `📦 ${matName(r.key)[0]} ×${r.n}`
    },
    /* 任何 WORDS 的詞條都能頒。跟自己達成條件一樣：寫進 words；awards 也記一筆（職業除錯師這類「老師頒發」的詞條看它）。
       再跑一次 checkWords，這封信順便讓別的條件跟著達成的詞條也一起解鎖、一起說 */
    word: {
      known: r => typeof r.key === 'string' && !!wordById(r.key),
      apply: r => {
        const wd = wordById(r.key), had = NW.words.includes(r.key);
        NW.awards[r.key] = 1;
        if (!had) NW.words.push(r.key);
        const more = checkWords(NW);
        return { icon: '🏅', title: `新的稱號詞條：${wd.w}`,
          note: (had ? '這個稱號詞條你本來就有了。' : `原本要「${wd.how}」才拿得到，老師直接送給你了。`) + (more.length ? `另外也解鎖了：${more.join('、')}。` : '') + '到背包點名字下面的稱號，就能把它戴上。' };
      },
      label: r => `🏅 稱號詞條「${(wordById(r.key) || { w: '' }).w}」`
    },
    bp: {
      known: r => isBpId(r.key),
      apply: r => {
        const nm = matName(r.key)[0], had = NW.bp.includes(r.key);
        if (!had) NW.bp.push(r.key); else NW.coins += BP_DUP_COINS;
        return { icon: '📜', title: `圖紙「${nm}」`, note: had ? `這張圖紙你已經會了，換成 ${BP_DUP_COINS} 字元。` : (stageOpen('2b') ? '圖紙學會了就不會用掉。到鐵匠鋪就能用它打造。' : '圖紙學會了就不會用掉。鐵匠鋪開張就能用它打造。') };
      },
      label: r => `📜 圖紙「${matName(r.key)[0]}」`
    },
    gear: {
      known: r => giftGearOk(r),
      apply: r => {
        const it = giveGear(NW, r.key, r.c, r.p, now()), d = gearDef(r.key);
        if (!it || it === 'full') return { icon: '🛡', title: '裝備放不下了', note: `裝備已經 ${GEAR_MAX} 件了。` };
        const base = d.slot === 'weapon' ? { weapon: d.wk, dark: !!GIFT_WEAPONS[d.wk] } : { gear: r.key };
        return Object.assign(base, { title: itemName(it), note: `${itemText(it)}。到背包的裝備格點一下就能穿上。` });
      },
      label: r => `🛡 ${(gearDef(r.key) || { name: '新裝備' }).name}${r.p ? ' +' + r.p : ''}`,
      full: n => NW.gear.length + n > GEAR_MAX
    },
    /* 直接升到某個獵人等級（只往上）。星星跟著等級走（addHrExp 每升一級給一顆）。
       主要給存檔被同學亂蓋、要補回進度的人用 */
    hr: {
      known: r => intIn(r.n, 2, HR_MAX),
      apply: r => {
        const to = +r.n, from = NW.hr;
        while (NW.hr < to) addHrExp(NW, hrNeed(NW.hr) - NW.hrExp);
        stateGifted = true;
        return { icon: '⭐', title: `獵人等級升到 ${to}`, note: NW.hr > from ? `獵人等級從 ${from} 升到 ${NW.hr}！` : '你的獵人等級已經比這個高了。' };
      },
      label: r => `⭐ 獵人等級升到 ${r.n}`
    },
    /* 區域進度只往上不往下：n 是「這個區域打贏到 ★幾」，★n 以下都算過關 */
    zone: {
      known: r => own(REGIONS, r.key) && !REGIONS[r.key].wip && intIn(r.n, 1, ZONE_STAR_MAX),
      apply: r => {
        const rg = REGIONS[r.key], n = +r.n, up = (NW.zone[r.key] || 0) < n;
        if (up) NW.zone[r.key] = n;
        stateGifted = true;
        const next = Object.values(REGIONS).find(x => x.needs === r.key && !x.wip);
        return { icon: rg.icon, title: `${rg.name} ★${n} 以下都算過關`,
          note: up ? `${rg.name}的委託板可以挑戰更高的星了。${n >= 5 && next ? `${next.name}也開放了！` : ''}` : '你已經走得比這裡更遠了。' };
      },
      label: r => `🗺 ${(REGIONS[r.key] || { name: '新地方' }).name} ★${r.n} 以下都算過關`
    },
    /* 圖鑑只標「打過」（至少 1 次），不改次數 */
    dex: {
      known: r => own(MONSTERS, r.key) && !MONSTERS[r.key].wip,
      apply: r => {
        const m = MONSTERS[r.key], had = (NW.dex[r.key] || 0) > 0;
        if (!had) NW.dex[r.key] = 1;
        stateGifted = true;
        return { icon: '📖', title: `魔物圖鑑：${m.name}`, note: had ? '你本來就打倒過牠了。' : '圖鑑亮起來了，算你打倒過牠。' };
      },
      label: r => `📖 圖鑑：${(MONSTERS[r.key] || { name: '新魔物' }).name}`
    },
    /* 只標「學會了」。不給那堂課的 200 字元（要給字元另外放）；任務與測試員任務會自己往前 */
    tut: {
      known: r => TUT_LESSONS.some(([k]) => k === r.key),
      apply: r => {
        const nm = TUT_LESSONS.find(([k]) => k === r.key)[1], had = !!NW.tut[r.key];
        NW.tut[r.key] = 1; stateGifted = true;
        return { icon: '🏫', title: `教學大樓：${nm}課`, note: had ? '這堂課你已經學會了。' : '老師說這堂課你學會了，不用再上。' };
      },
      label: r => `🏫 教學大樓：${(TUT_LESSONS.find(([k]) => k === r.key) || ['', '一堂'])[1]}課學會了`
    }
  };
  const rewardOf = r => (r && typeof r.type === 'string' && Object.prototype.hasOwnProperty.call(REWARD, r.type)) ? REWARD[r.type] : null;
  /* 信裡有這版程式不認得的東西（老師用了新功能、學生還沒重新整理）就整封不領 */
  const itemKnown = r => { const d = rewardOf(r); return !!d && !!d.known(r); };
  const rewardOk = r => !!r && (r.type === 'weapon' ? !!GIFT_WEAPONS[r.key] : (r.type === 'coins' || r.type === 'potion') && Number.isFinite(+r.n));
  function applyReward(r) {
    if (!itemKnown(r)) return null;
    return rewardOf(r).apply(r);
  }

  const guideBuilding = () => (goalOf(NW) ? goalOf(NW).building : null);

  const INTROS = {
    hub: [
      { icon: '🏘', title: '歡迎來到獵人村', text: '這裡是新世界的大廳。用 W A S D 或方向鍵走路，也可以用滑鼠點想去的地方。想進房子：點一下房子，或站在門口按 Enter。灰色的房子還在施工中。' },
      { icon: '📌', title: '任務系統', text: '上面金色的「📌」就是你現在的任務，做完會有獎勵。地上黃色的箭頭會帶你走到目的地，房子上面彈跳的箭頭就是要去的地方。點「📌」可以看任務怎麼做。現在的第一個任務：到教學大樓學會三堂課！' },
      { icon: '🧰', title: '上面的按鈕', text: '🎒 背包：看裝備、道具、稱號。📢 佈告欄：活動、老師的公告、新世界改了什麼，都貼在這裡（廣場上也有一座佈告欄）。🎁 序號：輸入老師給的序號領禮物。📓 測試員手冊：新世界還在試玩，完成測試任務有獎勵。🐛 回報問題：發現哪裡怪怪的，告訴我們。✉ 老師寄的信放在廣場旁邊的郵筒。' }
    ],
    academy: [{ icon: '🏫', title: '教學大樓', text: '這裡有閃避、防禦、打字三堂課。每一堂都是先看示範，再自己一步一步做；沒做對會一直等你，做對才換下一步；最後還要把稻草魔物打倒（打 5 下）。學會一堂送 200 字元！' }],
    board: [{ icon: '📜', title: '委託板', text: '選一張委託單，右邊的大地圖會亮起魔物住的地方。有紅色「任務目標」標籤的，就是現在任務要打的魔物。按「狩獵」開房間，再按「出發」就開打。★ 越多越難，打贏低星才會開高星。' }],
    bag: [{ icon: '🎒', title: '背包', text: '左邊是你的角色和 5 個裝備格，點名字下面的稱號可以自己拚稱號。右邊的分頁看裝備、道具、材料、圖紙、任務、圖鑑。拿到新武器，點格子裡的武器就能換上。' }],
    title: [{ icon: '🏅', title: '自己拚稱號', text: '稱號是用「詞條」拚的：一次選 1～3 個，順序自己決定。灰色的詞條還沒解鎖，會寫怎麼拿。打贏魔物、完成任務、抓蟲都能解鎖新詞條。' }],
    book: [{ icon: '📓', title: '測試員手冊', text: '新世界還在試玩，你是第一批冒險者！每完成一個任務就蓋一個章，拿字元和稱號詞條。字元是新世界的貨幣，之後可以買東西、打造裝備。' }],
    mail: [{ icon: '✉', title: '郵筒與信箱', text: '老師寄給你的信和禮物，都會放在信箱裡。村莊廣場旁的藍色郵筒冒出 ✉ 和數字，就是有信還沒領！走到郵筒旁邊按 Enter，或點背包裡的「✉ 信箱」，都能打開。按「領取」就能收下禮物，領過的信會留著，可以再看。' }],
    notice: [{ icon: '📢', title: '佈告欄', text: '活動、老師的公告、抓蟲榜，都貼在這裡！有新東西，木板上方會跳出「！」。🎪 活動：看現在有什麼活動、自己做到哪裡。🐛 抓蟲榜：發現遊戲怪怪的地方告訴老師，確認以後就會上榜。' }],
    forge: [
      { icon: '⚒', title: '鐵匠鋪', text: '這裡可以用打魔物拿到的材料，打造武器和裝備！做出來的東西穿上去，角色也會跟著變。' },
      { icon: '✨', title: '會發亮的圖紙', text: '材料夠了，圖紙就會發亮 ✨。帽子、衣服、手套、鞋子，對「會攻擊你的魔物」才有用喔。打造一定會成功，強化也一定會成功，不會壞掉。' },
      { icon: '📜', title: '先做一件試試看', text: '鐵匠送你一套布裝圖紙：布帽、布衣、布手套、布鞋。用灰色的材料就能做，先做一件試試看！' }
    ],
    rank: [{ icon: '🏆', title: '榮譽碑', text: '這裡是榮譽碑。🌱 進步：跟以前的自己比；⚡ 最快討伐：配裝也算；🎯 神準：夠準就上名單。正確率要 90% 以上才會算喔！' }],
    storage: [{ icon: '📦', title: '倉庫', text: '你的材料和圖紙都放在這裡，一目了然。點一下材料，會告訴你哪裡掉、可以做什麼。做好的裝備放在「裝備背包」。' }],
    gift: [{ icon: '🎁', title: '序號禮物', text: '老師會發序號給你。在這裡輸入（輸入的字會藏起來），就能領禮物，領到會跳出通知。每組序號每個人只能領一次。' }]
  };
  function introOnce(key) {
    return new Promise(res => {
      const pages = INTROS[key];
      if (!pages || NW.intro[key] || window.__NW_NOINTRO__) return res();
      let i = 0;
      const sheet = document.createElement('div');
      sheet.id = 'nw-intro'; sheet.className = 'nw-sheet fixed inset-0 grid place-items-center p-3'; sheet.style.zIndex = 99; sheet.style.background = 'rgba(9,8,18,.88)';
      const draw = () => {
        const p = pages[i];
        sheet.innerHTML = `<div class="px-panel text-center" style="max-width:460px;width:100%;padding:20px">
          <div style="font-size:48px;line-height:1.1">${p.icon}</div>
          <div class="px-title mt-2" style="font-size:1.5em">${p.title}</div>
          <p class="px-text mt-3" style="font-size:1.05em;line-height:1.6;text-align:left">${p.text}</p>
          <div class="flex items-center justify-between mt-4"><span class="px-text text-sm" style="color:#aab0d8">${pages.length > 1 ? `${i + 1} / ${pages.length}` : ''}</span>
            <button class="px-btn gold" data-next style="padding:8px 26px">${i + 1 < pages.length ? '下一頁 ▶' : '知道了 ✓'}</button></div></div>`;
      };
      sheet.addEventListener('click', e => {
        if (!e.target.closest('[data-next]')) return;
        if (++i < pages.length) { draw(); return; }
        NW.intro[key] = 1; saveNw(); sheet.remove(); res();
      });
      draw(); document.body.appendChild(sheet);
    });
  }
  /* 改版公告：新的公告才跳一次；第一次來的人剛看完介紹，不用再看「改了什麼」，直接記成已讀 */

  /* ── 佈告欄（SPEC §9.1）：建築與上方按鈕打開同一個視窗，三個分頁 📢 公告｜🎪 活動｜🐛 抓蟲榜 ──
     「看過了」分頁各自記：公告 NW.seenNews／seenNotice、活動 NW.seenEv、抓蟲榜 NW.seenBug。
     沒看過的東西讓木板上方彈跳「！」、上方按鈕與分頁加小紅點。 */
  const NT = createNotice(C, { me: () => ME, nw: () => NW, ownBoard: () => board, myName: () => ME.name });
  const NOTICE_TAB_KEY = 'mg_nw_ntab';
  const NTABS = [['news', '📢', '公告'], ['ev', '🎪', '活動'], ['bug', '🐛', '抓蟲榜']];
  const readTab = () => { try { const t = localStorage.getItem(NOTICE_TAB_KEY); return NTABS.some(x => x[0] === t) ? t : 'news'; } catch (e) { return 'news'; } };
  const saveTab = t => { try { localStorage.setItem(NOTICE_TAB_KEY, t); } catch (e) { /* 私密視窗等寫不進去就算了，只是下次不記得 */ } };
  let nflags = { news: false, ev: false, bug: false, any: false };
  function noticeFlags() {
    const seenEv = NW.seenEv || {};
    const f = {
      news: newsLatest(NT.news()) > (NW.seenNews || 0) || NW.seenNotice !== NOTICES[0].id,
      ev: EV.groups().active.some(e => !seenEv[e.id]),
      bug: (NW.bugScore || 0) > (NW.seenBug || 0)
    };
    f.any = f.news || f.ev || f.bug;
    return f;
  }
  function noticeRefresh() {
    if (!NW) return;
    nflags = noticeFlags();
    document.querySelectorAll('[data-noticedot]').forEach(el => { el.style.display = nflags.any ? 'block' : 'none'; });
    document.querySelectorAll('[data-ntabdot]').forEach(el => { el.style.display = nflags[el.dataset.ntabdot] ? 'block' : 'none'; });
  }
  function markSeen(tab) {
    let ch = false;
    if (tab === 'news') {
      const m = newsLatest(NT.news());
      if (m > (NW.seenNews || 0)) { NW.seenNews = m; ch = true; }
      if (NW.seenNotice !== NOTICES[0].id) { NW.seenNotice = NOTICES[0].id; ch = true; }
    } else if (tab === 'ev') {
      const E = NW.seenEv || (NW.seenEv = {}), ids = new Set(EV.list().map(e => e.id));
      EV.groups().active.forEach(e => { if (!E[e.id]) { E[e.id] = 1; ch = true; } });
      /* 活動檔早就過期被清掉的 ID 不用再記（讀得到活動時才清，斷線時不動） */
      if (EV.ok()) Object.keys(E).forEach(id => { if (!ids.has(id)) { delete E[id]; ch = true; } });
    } else if (tab === 'bug') {
      if ((NW.bugScore || 0) !== (NW.seenBug || 0)) { NW.seenBug = NW.bugScore || 0; ch = true; }
    }
    if (ch) saveNw();
    noticeRefresh();
  }

  const nlines = t => escHtml(t).replace(/\n/g, '<br>');
  const bar = (pct, cls) => `<div class="px-bar ${cls || 'xp'}"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></div>`;

  function newsCard(n, isNew) {
    return `<div class="px-panel in mt-3" data-news="${escHtml(n.id)}" style="padding:10px 12px;${n.pin ? 'border-color:#e8b64c' : ''}">
      <div class="px-text" style="color:#ffd98a;font-weight:900;font-size:1.1em">${n.pin ? '<span class="px-chip" style="color:#e8b64c">📌 置頂</span> ' : ''}${escHtml(n.title)}${isNew ? ' <span class="px-chip" style="color:#ff8a6a">新</span>' : ''}　<span class="text-xs" style="color:#aab0d8;font-weight:400">${n.t ? new Date(n.t).toLocaleDateString('zh-TW') : ''}</span></div>
      ${n.body ? `<div class="px-text mt-1" style="font-size:.98em;line-height:1.65">${nlines(n.body)}</div>` : ''}</div>`;
  }
  const noticeCard = n => `<div class="px-panel in mt-3" style="padding:10px 12px"><div class="px-text" style="color:#ffd98a;font-weight:900;font-size:1.1em">${n.title}　<span class="text-xs" style="color:#aab0d8;font-weight:400">${n.date}</span></div>
    <ul class="px-text mt-1" style="font-size:.98em;line-height:1.65;list-style:none;padding:0">${n.items.map(t => `<li style="margin-top:4px">${t}</li>`).join('')}</ul></div>`;

  /* ── 活動卡片與詳情頁 ──
     卡片只放「我的成績」和一行「看榜單 ▶」，榜單全部在詳情頁（用 nw-rankboard.js 的模板畫），卡片才不會太長。
     詳情頁是佈告欄視窗裡的子畫面，不另開一層視窗（多一層視窗會擋住按鍵）：◀ 返回回到分頁，Esc 先返回再關視窗。
     抓蟲大作戰是常駐活動，沒有 mg_events 文件，所以用保留的代號 '@bug'（活動 ID 不允許 @，不會撞到老師開的活動）。 */
  const EV_ICON = { boost: '⚡', hunt: '🗡', classwar: '🏫', ranking: '🏆' };
  const EV_NAME = { boost: '限時加倍', hunt: '限時討伐', classwar: '班級挑戰', ranking: '活動排行榜' };
  const RANK_LABEL = { improve: '進步幅度', kills: '打倒隻數', fastest: '最快秒數', acc: '平均正確率' };
  const BUG_ID = '@bug';
  const openAttr = id => `data-evopen="${escHtml(id)}" role="button" tabindex="0"`;
  const moreLine = t => `<div class="px-text text-sm mt-2" data-evmore style="color:#ffd98a;font-weight:900">${t} ▶</div>`;
  const cwLine = v => `<div class="px-text text-sm">我們班：${v.count} / ${v.size} 人達標（${v.pct}%）　目標 ${v.goalPct}%</div><div class="mt-1">${bar(v.pct, v.reached ? 'ok' : 'mp')}</div>${v.reached ? '<div class="px-text text-sm mt-1" style="color:#8ec96b">🎉 全班達標了！</div>' : ''}`;

  function activeCard(e) {
    const p = EV.eventProgress(e), t = EV.timeText(e);
    let mine = '', more = '看說明';
    if (e.type === 'boost') mine = `<div class="px-text text-sm mt-2" style="color:#8ec96b">${e.what === 'coins' ? '字元' : '獵人經驗'} ×${e.mul}：打贏魔物就會自動加倍。</div>`;
    else if (e.type === 'hunt') { mine = `<div class="mt-2">${bar(p.done ? 100 : p.n / e.goal * 100, p.done ? 'ok' : 'xp')}<div class="px-text text-sm mt-1">${p.text}</div></div>`; more = '看規則和獎勵'; }
    else if (e.type === 'classwar') { mine = `<div class="mt-2">${bar(p.n / e.per * 100, p.mineReached ? 'ok' : 'xp')}<div class="px-text text-sm mt-1">${p.text}${p.mineReached ? '　✓ 你達標了！' : ''}</div></div><div data-cwx="${escHtml(e.id)}" class="mt-2" style="color:#aab0d8"><span class="px-text text-sm">讀全班進度中…</span></div>`; more = '看榜單'; }
    else if (e.type === 'ranking') { mine = `<div class="px-text text-sm mt-2">我的成績：<b style="color:#ffd98a">${escHtml(p.text)}</b></div>`; more = '看榜單'; }
    return `<div class="px-panel in mt-3" data-evcard="${escHtml(e.id)}" data-evphase="active" ${openAttr(e.id)} style="padding:12px 14px;border-color:#e8b64c;cursor:pointer">
      <div class="flex items-center gap-2 flex-wrap"><span style="font-size:24px">${EV_ICON[e.type]}</span><b class="px-text" style="color:#ffd98a;font-size:1.15em;flex:1;min-width:0;overflow-wrap:anywhere">${escHtml(e.title)}</b><span class="px-chip" style="color:#8ec96b">${t}</span></div>
      <div class="px-text text-xs mt-1" style="color:#aab0d8">${EV_NAME[e.type]}</div>
      ${e.desc ? `<div class="px-text mt-1" style="line-height:1.6;overflow-wrap:anywhere">${nlines(e.desc)}</div>` : ''}${mine}${moreLine(more)}</div>`;
  }
  const soonCard = e => `<div class="px-panel in mt-2" data-evcard="${escHtml(e.id)}" data-evphase="soon" ${openAttr(e.id)} style="padding:10px 14px;opacity:.6;filter:grayscale(.7);cursor:pointer">
    <div class="flex items-center gap-2 flex-wrap"><span style="font-size:20px">${EV_ICON[e.type]}</span><b class="px-text" style="flex:1;min-width:0;overflow-wrap:anywhere">${escHtml(e.title)}</b><span class="px-chip" style="color:#aab0d8">${EV.timeText(e)}</span></div>
    ${e.desc ? `<div class="px-text text-sm mt-1" style="color:#aab0d8;overflow-wrap:anywhere">${nlines(e.desc)}</div>` : ''}${moreLine('看說明')}</div>`;
  const endedCard = e => `<div class="px-panel in mt-2" data-evcard="${escHtml(e.id)}" data-evphase="ended" ${openAttr(e.id)} style="padding:10px 14px;opacity:.85;cursor:pointer">
    <div class="flex items-center gap-2 flex-wrap"><span style="font-size:20px">${EV_ICON[e.type]}</span><b class="px-text" style="flex:1;min-width:0;overflow-wrap:anywhere">${escHtml(e.title)}</b><span class="px-chip" style="color:#aab0d8">已結束</span></div>
    <div class="px-text text-sm mt-1" style="color:#ffd98a">老師可能會寄獎品到信箱喔</div>${moreLine(e.type === 'ranking' ? '看最後的榜單' : '看說明')}</div>`;
  /* 常駐的抓蟲大作戰：永遠排在最上面，不會結束，也不是老師開的 */
  const bugCard = () => {
    const sc = Math.max(0, NW.bugScore || 0);
    return `<div class="px-panel in mt-3" data-bugcard ${openAttr(BUG_ID)} style="padding:12px 14px;border-color:#8ec96b;cursor:pointer">
      <div class="flex items-center gap-2 flex-wrap"><span style="font-size:24px">🐛</span><b class="px-text" style="color:#ffd98a;font-size:1.15em;flex:1;min-width:0">抓蟲大作戰</b>${nflags.bug ? '<span class="px-chip" style="color:#ffd98a">分數有變</span> ' : ''}<span class="px-chip" style="color:#8ec96b">常駐</span></div>
      <div class="px-text text-xs mt-1" style="color:#aab0d8">抓蟲榜</div>
      <div class="px-text mt-1" style="line-height:1.6">發現哪裡怪怪的，回報給老師。老師確認了就有分數，還能拿徽章！</div>
      <div class="px-text text-sm mt-2">我的抓蟲分：<b style="color:#8ec96b">${sc} 分</b></div>${moreLine('看榜單')}</div>`;
  };

  const secHead = t => `<div class="px-text mt-4" style="color:#ffd98a;font-weight:900;font-size:1.05em">${t}</div>`;
  const backBtn = '<button class="px-btn mt-3" data-nback>◀ 返回</button>';
  const bullets = lines => `<ul class="px-text mt-1" style="list-style:none;padding:0;font-size:.98em;line-height:1.65">${lines.map(l => `<li style="margin-top:4px;overflow-wrap:anywhere">・${escHtml(l)}</li>`).join('')}</ul>`;
  const noRead = '<div class="px-panel in px-text text-center mt-3" style="padding:18px">現在連不上網路，讀不到資料。</div>';

  /* 抓蟲大作戰：「🐛 抓蟲榜」分頁與活動詳情頁是同一份內容（withBack 只決定要不要放返回鍵），兩個入口才會一致 */
  function bugView(body, alive, withBack) {
    const MS = BUG_MILESTONES, tier = [1, 2, 3, 3];
    const mineHtml = score => {
      const next = MS.find(m => score < m), nm = next ? (wordById('bug' + next) || { w: '抓蟲徽章' }).w : '';
      return `<div class="mt-2">${bar(next ? score / next * 100 : 100, next ? 'xp' : 'ok')}<div class="px-text text-sm mt-1" data-bugmine>${next ? `你的抓蟲分：<b style="color:#8ec96b">${score} 分</b>。再拿 ${next - score} 分，就有「${escHtml(nm)}」！` : `你的抓蟲分：<b style="color:#8ec96b">${score} 分</b>。四個徽章都拿到了！`}</div></div>
        <div class="mt-3" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px">${MS.map((m, i) => {
          const got = score >= m;
          return `<div data-bugbadge="${m}" data-got="${got ? 1 : 0}" style="text-align:center;min-width:0;opacity:${got ? 1 : .4};${got ? '' : 'filter:grayscale(1)'}">${PX.badge(tier[i], 3)}<div class="px-text" style="font-size:.82em;margin-top:2px;overflow-wrap:anywhere">${escHtml((wordById('bug' + m) || { w: '徽章' }).w)}</div><div style="color:#aab0d8;font-size:.82em">${m} 分</div></div>`;
        }).join('')}</div>`;
    };
    body.innerHTML = `${withBack ? backBtn : ''}<div class="px-title mt-3" data-bugview style="font-size:1.25em">🐛 抓蟲大作戰　<span class="px-chip" style="color:#8ec96b;font-size:.5em;vertical-align:middle">常駐</span></div>
      <p class="px-text text-sm mt-1" style="line-height:1.6">發現遊戲怪怪的地方，到「回報問題」寫下來；老師確認後就會上榜！</p>
      ${secHead('📖 規則與怎麼算分')}${bullets(['發現遊戲怪怪的地方，按上面的「🐛 回報問題」寫下來。', '寫清楚做了什麼事、看到什麼狀況，老師比較好確認。', '老師確認以後，依問題的嚴重程度，給你 1～3 分。', '分數會加起來，排進抓蟲榜。到 1、3、5、10 分，各有一個抓蟲徽章。'])}
      ${secHead('🏅 我的進度與徽章')}<div data-bugmine-box>${mineHtml(Math.max(0, NW.bugScore || 0))}</div>
      ${secHead('🏆 抓蟲榜')}<div data-rbmount="bug"></div>`;
    const box = body.querySelector('[data-bugmine-box]');
    mountRankBoard(body.querySelector('[data-rbmount]'), {
      alive,
      /* 重新整理要連自己的分數也重讀（force），不然老師剛確認的回報看不到 */
      load: async force => { if (!C.online()) throw new Error('offline'); await syncBoard(!!force); return NT.loadBugBoard(!!force); },
      shell: () => ({ id: 'bug', title: '前 10 名', unit: '分', scoreLabel: '抓蟲分', errorText: C.online() ? '榜單現在讀不到，等一下再試試看。' : '現在連不上網路，榜單讀不到。' }),
      toSpec: v => ({
        id: 'bug', title: '前 10 名', unit: '分', scoreLabel: '抓蟲分',
        rows: v.rows.map(r => ({ id: r.id, rank: r.rank, label: r.label, nick: r.nick, score: r.score, extra: `確認 ${r.n} 件`, mine: r.mine })),
        mine: v.mine.score > 0 ? { label: '我的抓蟲分', score: v.mine.score, status: `老師確認 ${v.mine.n} 件` } : null,
        outText: v.text, emptyText: '還沒有人上榜，快去找找看吧！'
      }),
      onData: v => { if (!v) return; markSeen('bug'); box.innerHTML = mineHtml(Math.max(0, v.mine.score)); }
    }).run(false);
  }
  const bugTab = (body, alive) => bugView(body, alive, false);

  const rankSpec = (e, v, ph) => ({
    id: e.id, title: `前 ${v.rows.length || BOARD_SIZE} 名`, unit: METRIC_UNIT[e.metric], scoreLabel: RANK_LABEL[e.metric],
    rows: v.rows.map((r, i) => ({ id: r.id, rank: i + 1, label: `${r.cls}・${r.seat}號`, nick: r.nick, score: r.text, mine: r.mine })),
    mine: { score: v.mine.s !== null ? EV.eventProgress(e).text : null, status: v.mine.s !== null ? (v.inTop ? '你在榜上喔！' : '') : EV.eventProgress(e).text },
    /* 自己的分數超出合理範圍：只對自己說明。結束以後「再快幾秒就上榜」沒有意義，不說 */
    outText: v.outOfRange ? '你的成績很特別，老師看過以後才會放上榜單喔。' : ph === 'ended' ? '' : v.text,
    emptyText: ph === 'ended' ? '這次沒有人上榜。' : '還沒有人上榜，你可以當第一個！'
  });

  async function evDetail(body, alive, id) {
    if (id === BUG_ID) { bugView(body, alive, true); return; }
    body.innerHTML = `${backBtn}<div class="px-panel in px-text text-center mt-3" data-msg style="padding:18px">讀活動中…</div>`;
    await EV.load();
    if (!alive()) return;
    const e = EV.visible().find(x => x.id === id);
    if (!e) { body.innerHTML = `${backBtn}<div class="px-panel in px-text text-center mt-3" data-noev style="padding:18px">找不到這個活動了，可能已經收起來囉。</div>`; return; }
    const ph = EV.phase(e), p = EV.eventProgress(e), myId = ME.docId;
    const items = e.items.map(itemLabel).filter(Boolean);
    const kind = e.type === 'ranking' ? `${EV_NAME[e.type]}・${METRIC_NAME[e.metric]}` : EV_NAME[e.type];
    let h = `${backBtn}<div class="px-panel in mt-3" data-evdetail="${escHtml(e.id)}" data-evphase="${ph}" style="padding:12px 14px;border-color:#e8b64c">
      <div class="flex items-center gap-2 flex-wrap"><span style="font-size:26px">${EV_ICON[e.type]}</span><b class="px-title" style="font-size:1.25em;flex:1;min-width:0;overflow-wrap:anywhere">${escHtml(e.title)}</b><span class="px-chip" style="color:${ph === 'ended' ? '#aab0d8' : '#8ec96b'}">${EV.timeText(e)}</span></div>
      <div class="px-text text-xs mt-1" style="color:#aab0d8">${escHtml(kind)}</div>
      ${e.desc ? `<div class="px-text mt-2" style="line-height:1.6;overflow-wrap:anywhere">${nlines(e.desc)}</div>` : ''}
      <div class="px-text text-xs mt-2" style="color:#aab0d8">${dateText(e.startAt)} ～ ${dateText(e.endAt - 1)}</div></div>
      ${secHead('📖 規則與怎麼算分')}${bullets(ruleLines(e))}`;
    if (items.length) h += `${secHead('🎁 獎勵')}<div class="flex gap-2 flex-wrap mt-1">${items.map(t => `<span class="px-chip" style="color:#ffd98a;font-size:.9em">${escHtml(t)}</span>`).join('')}</div>`;
    if (ph === 'soon') {
      body.innerHTML = h + `<div class="px-panel in px-text text-center mt-4" data-soonmsg style="padding:12px;color:#ffd98a">${escHtml(EV.timeText(e))}（${dateText(e.startAt)}）。先去委託板練功，等它開始吧！</div>`;
      return;
    }
    const ended = ph === 'ended';
    if (e.type === 'boost') {
      h += `${secHead('⚡ 說明')}<div class="px-text text-sm mt-1" style="line-height:1.65">${ended ? '這次的加倍已經結束了。' : `現在打贏魔物，${e.what === 'coins' ? '字元' : '獵人經驗'}就是 ×${e.mul}。結算畫面會寫「🎪 活動加倍」。`}</div>`;
      body.innerHTML = h; return;
    }
    if (e.type === 'hunt') {
      h += `${secHead('📈 我的進度')}<div class="mt-1">${bar(p.done ? 100 : p.n / e.goal * 100, p.done ? 'ok' : 'xp')}<div class="px-text text-sm mt-1">${p.text}</div></div>
        <div class="px-text text-sm mt-3" data-nornk style="color:#aab0d8;line-height:1.6">這個活動不比名次，自己打到就算達標。${ended ? (p.done ? '你達標了，獎勵已經領到囉。' : '這次沒有達標，下次再加油！') : ''}</div>`;
      body.innerHTML = h; return;
    }
    if (e.type === 'classwar') {
      h += `${secHead('📈 我的進度')}<div class="mt-1">${bar(p.n / e.per * 100, p.mineReached ? 'ok' : 'xp')}<div class="px-text text-sm mt-1">${p.text}${p.mineReached ? '　✓ 你達標了！' : ''}</div></div>
        ${secHead('🏫 我們班')}<div class="px-panel in mt-1" data-cwbox style="padding:8px 10px"><span class="px-text text-sm" style="color:#aab0d8">讀全班進度中…</span></div>
        ${secHead('🏆 同年級排行')}<div data-rbmount="cw"></div>`;
      body.innerHTML = h;
      const box = body.querySelector('[data-cwbox]');
      mountRankBoard(body.querySelector('[data-rbmount]'), {
        alive,
        load: async force => { if (!C.online()) throw new Error('offline'); return EV.classProgress(e, !!force); },
        shell: () => ({ id: 'cw-' + e.id, title: '同年級前 3 名', unit: '%', scoreLabel: '達標率', errorText: C.online() ? '全班進度現在讀不到，等一下再試試看。' : '現在連不上網路，讀不到全班進度。' }),
        toSpec: v => ({
          id: 'cw-' + e.id, title: `同年級前 ${v.top.length || 3} 名`, subtitle: '只列前 3 名的班級，不列最後一名。', unit: '%', scoreLabel: '達標率', mineMark: '← 我們班',
          rows: v.top.map((x, i) => ({ rank: i + 1, label: `${x.cls} 班`, score: x.pct, mine: x.mine })), emptyText: '還沒有班級的資料。'
        }),
        onData: v => {
          if (!v) { box.innerHTML = '<span class="px-text text-sm" style="color:#aab0d8">全班進度現在讀不到，等一下再試試看。</span>'; return; }
          box.innerHTML = cwLine(v) + (v.reached ? '' : `<div class="px-text text-sm mt-1" style="color:#aab0d8">${ended ? '這次全班沒有達標，下次再一起加油！' : `全班有 ${v.goalPct}% 的人達標，大家就有獎勵。一起加油！`}</div>`)
            + (ended && v.reached ? `<div class="px-text text-sm mt-1" style="color:#ffd98a">${p.cw ? '全班獎你已經領過了。' : p.n >= 1 ? '獎勵會在你進村或打開佈告欄時，自動送到你手上。' : '你這次沒有打倒魔物，沒有領到獎勵。'}</div>` : '');
        }
      }).run(false);
      return;
    }
    /* ranking */
    const need = runsNeed(e), nn = Math.min(p.n, need);
    h += `${secHead('📈 我的進度')}<div class="mt-1">${bar(nn / need * 100, p.s !== null ? 'ok' : 'xp')}<div class="px-text text-sm mt-1" data-rkprog>${need > 1 ? `有效場次 ${nn} / ${need}${p.s !== null ? '，已經有分數了' : '，打滿才有分數'}` : p.n ? `有效場次 ${p.n}` : '還沒參加，打倒一隻就有分數'}</div></div>
      ${secHead(ended ? '🏁 最後的榜單' : '🏆 目前排名')}`;
    const snapRows = ended ? finalRows(e, myId) : null;
    const award = ended ? awardList(e, myId) : null;
    if (snapRows) {
      /* 老師已經存了名次（發獎用的快照）：最後的榜單以那份為準，之後分數怎麼變都不影響 */
      h += rankBoardHtml({ id: e.id, title: `前 ${snapRows.length || BOARD_SIZE} 名`, unit: METRIC_UNIT[e.metric], scoreLabel: RANK_LABEL[e.metric], rows: snapRows, refresh: false, emptyText: '這次沒有人上榜。',
        mine: p.s !== null ? { score: p.text, status: snapRows.some(r => r.mine) ? '你在榜上喔！' : '' } : { score: null, status: p.text } });
    } else h += '<div data-rbmount="rk"></div>';
    if (ended && !award) h += `<div class="px-panel in px-text text-center mt-3" data-notawarded style="padding:10px;color:#ffd98a">老師可能會寄獎品到信箱喔</div>`;
    if (award) {
      const mineWin = award.winners.find(w => w.mine);
      const partLabels = award.part.map(itemLabel).filter(Boolean).join('、');
      h += `${secHead('🎁 得獎名單')}${rankBoardHtml({ id: 'award-' + e.id, title: '拿到獎品的人', subtitle: partLabels ? `有參加的人都有參加獎：${partLabels}${award.partCount ? `（${award.partCount} 人）` : ''}` : '', rows: award.winners.map(w => ({ id: w.id, rank: w.rank, label: w.label, nick: w.nick, score: w.score, extra: w.items.map(itemLabel).filter(Boolean).join('、'), mine: w.mine })), refresh: false, emptyText: '這次沒有名次獎。',
        mine: { label: '我的獎品', score: mineWin ? mineWin.items.map(itemLabel).filter(Boolean).join('、') : null, status: mineWin ? '已經寄到信箱囉。' : award.myPart ? '你拿到參加獎了，已經寄到信箱囉。' : '這次沒有拿到獎品，下次再加油！' } })}`;
    }
    body.innerHTML = h;
    const mount = body.querySelector('[data-rbmount]');
    if (mount) mountRankBoard(mount, {
      alive,
      load: async force => { if (!C.online()) throw new Error('offline'); return EV.eventBoard(e, !!force); },
      shell: () => ({ id: e.id, title: '前 10 名', unit: METRIC_UNIT[e.metric], scoreLabel: RANK_LABEL[e.metric], mine: { score: p.s !== null ? p.text : null, status: p.s !== null ? '' : p.text }, errorText: C.online() ? '榜單現在讀不到，等一下再試試看。' : '現在連不上網路，榜單讀不到。' }),
      toSpec: v => rankSpec(e, v, ph)
    }).run(false);
  }

  async function eventsTab(body, alive) {
    if (!C.online()) { body.innerHTML = bugCard() + '<div class="px-panel in px-text text-center mt-3" style="padding:18px">現在連不上網路，活動讀不到。</div>'; return; }
    body.innerHTML = bugCard() + '<div class="px-panel in px-text text-center mt-3" data-msg style="padding:18px">讀活動中…</div>';
    await EV.load();
    if (!alive()) return;
    const g = EV.groups();
    let html = bugCard();
    if (!g.active.length) html += `<div class="px-panel in px-text text-center mt-3" data-noev style="padding:18px">現在沒有活動，先去委託板打怪吧！</div>`;
    if (g.active.length) html += g.active.map(activeCard).join('');
    if (g.soon.length) html += `<div class="px-text text-sm mt-4" style="color:#aab0d8;font-weight:900">快開始</div>${g.soon.map(soonCard).join('')}`;
    if (g.ended.length) html += `<div class="px-text text-sm mt-4" style="color:#aab0d8;font-weight:900">剛結束</div>${g.ended.map(endedCard).join('')}`;
    body.innerHTML = html;
    markSeen('ev');
    /* 班級挑戰卡片只補一行全班進度（榜單在詳情頁）；讀的是同一份 60 秒快取，點進去就不用再等 */
    g.active.filter(e => e.type === 'classwar').forEach(async e => {
      const el = [...body.querySelectorAll('[data-cwx]')].find(x => x.getAttribute('data-cwx') === e.id);
      if (!el) return;
      try { const v = await EV.classProgress(e); if (alive()) el.innerHTML = cwLine(v); } catch (er) { console.warn('讀全班進度失敗', er); if (alive()) el.textContent = '全班進度現在讀不到，等一下再試試看。'; }
    });
    eventsCheck();
  }

  function openNotice(auto, a) {
    if (!auto) { EV.load().then(eventsCheck); NT.loadNews().then(() => { noticeRefresh(); const s = document.getElementById('nw-notice'); if (s && s._reshow && s._tab === 'news') s._reshow(); }); }
    return new Promise(res => {
      const sheet = document.createElement('div');
      sheet.id = 'nw-notice'; sheet.className = 'nw-sheet fixed inset-0 overflow-y-auto p-3'; sheet.style.zIndex = 98; sheet.style.background = 'rgba(9,8,18,.9)';
      const shut = () => { markSeen('news'); sheet.remove(); res(); };
      if (auto) {
        /* 自動跳出來：只放「新的」老師公告和最新一則改版公告，只跳一次 */
        const ns = (a && a.news) || [];
        sheet.innerHTML = `<div class="px-panel" style="max-width:520px;width:100%;padding:18px;margin:0 auto">
          <div class="px-title" style="font-size:1.5em">📢 佈告欄</div>
          ${ns.map(n => newsCard(n, true)).join('')}${!a || a.notice ? noticeCard(NOTICES[0]) : ''}
          <p class="text-xs mt-3" style="color:#aab0d8">這個只會跳一次。想再看，按上面的「📢 佈告欄」。</p>
          <div class="text-right mt-3"><button class="px-btn gold" data-close style="padding:8px 26px">知道了 ✓</button></div></div>`;
        sheet.addEventListener('click', e => { if (e.target === sheet || e.target.closest('[data-close]')) shut(); });
        sheet._esc = shut;
        document.body.appendChild(sheet);
        return;
      }
      /* 這次打開之前的「已讀」位置：標「新」要用它比，不能用已經更新過的 */
      const seen0 = { news: NW.seenNews || 0, notice: NW.seenNotice };
      let tok = 0, scroll0 = 0;
      sheet.innerHTML = `<div class="px-panel" style="max-width:560px;width:100%;padding:18px;margin:0 auto">
        <div class="px-title" style="font-size:1.5em">📢 佈告欄</div>
        <div class="flex gap-2 flex-wrap mt-3">${NTABS.map(([k, i, n]) => `<button class="px-btn" data-ntab="${k}" style="position:relative">${i} ${n}<i data-ntabdot="${k}" style="display:${nflags[k] ? 'block' : 'none'};position:absolute;top:-5px;right:-5px;width:14px;height:14px;background:#d83a3a;border:2px solid #0a0714"></i></button>`).join('')}</div>
        <div data-nbody></div>
        <div class="text-right mt-3"><button class="px-btn gold" data-close style="padding:8px 26px">知道了 ✓</button></div></div>`;
      const body = sheet.querySelector('[data-nbody]');
      const showTab = (t, restore) => {
        const my = ++tok, alive = () => my === tok && sheet.isConnected;
        sheet._tab = t; sheet._detail = null; saveTab(t);
        sheet.querySelectorAll('[data-ntab]').forEach(b => b.classList.toggle('gold', b.dataset.ntab === t));
        if (t === 'news') {
          const ns = NT.news();
          body.innerHTML = `${ns.map(n => newsCard(n, n.t > seen0.news)).join('')}
            ${ns.length ? '<div class="px-text text-sm mt-4" style="color:#aab0d8;font-weight:900">改版公告</div>' : ''}${NOTICES.map(noticeCard).join('')}
            <p class="text-xs mt-3" style="color:#aab0d8">舊的公告也都留在這裡。</p>`;
          markSeen('news');
        } else if (t === 'ev') eventsTab(body, alive).then(() => { if (restore && alive()) sheet.scrollTop = scroll0; });
        else bugTab(body, alive);
      };
      /* 活動詳情是視窗裡的子畫面：進去記住捲到哪，返回時回到同一個位置 */
      const showDetail = id => {
        const my = ++tok, alive = () => my === tok && sheet.isConnected;
        scroll0 = sheet.scrollTop; sheet._detail = id; sheet.scrollTop = 0;
        evDetail(body, alive, id);
      };
      const back = () => showTab(sheet._tab, true);
      const close = () => { tok++; sheet.remove(); res(); };
      sheet._esc = () => { if (sheet._detail) back(); else close(); };
      sheet._reshow = () => showTab('news');
      sheet.addEventListener('click', e => {
        const tb = e.target.closest('[data-ntab]');
        if (tb) { showTab(tb.dataset.ntab); return; }
        if (e.target.closest('[data-nback]')) { back(); return; }
        const op = e.target.closest('[data-evopen]');
        if (op) { showDetail(op.dataset.evopen); return; }
        if (e.target === sheet || e.target.closest('[data-close]')) close();
      });
      sheet.addEventListener('keydown', e => {
        const op = e.target.closest && e.target.closest('[data-evopen]');
        if (op && e.target === op && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); showDetail(op.dataset.evopen); }
      });
      document.body.appendChild(sheet);
      showTab(readTab());
    });
  }
  /* 進村：先讀老師公告與活動（為了「！」），再決定要不要自動跳出來。
     自動跳出：新的老師公告（t 比 NW.seenNews 新）、最新的改版公告；第一次來的人什麼都不跳，直接記成已讀。 */
  async function noticeOnce(fresh) {
    await Promise.all([NT.loadNews(), EV.load()]);
    if (window.__NW_NOINTRO__) { noticeRefresh(); return; }
    const latest = newsLatest(NT.news());
    if (fresh) { NW.seenNotice = NOTICES[0].id; NW.seenNews = latest; saveNw(); noticeRefresh(); return; }
    const news = NT.news().filter(n => n.t > (NW.seenNews || 0)), notice = NW.seenNotice !== NOTICES[0].id;
    noticeRefresh();
    if (!news.length && !notice) return;
    await openNotice(true, { news, notice });
  }
  async function hubStart() { const fresh = !NW.intro.hub; refreshMail(); await introOnce('hub'); await nameFirst(); await noticeOnce(fresh); await earlyGift(); refreshBoard(); }

  async function awardMissions() {
    const ms = checkMissions(NW);
    if (!ms.length) return;
    /* 抓蟲分剛解鎖的詞條（wordNotes）併進同一則通知，不要連跳兩個視窗 */
    const ws = [...new Set([...checkWords(NW), ...wordNotes.splice(0)])]; saveNw();
    for (const m of ms) await showGift({ icon: m.icon, title: `🏅 任務完成：${m.t}`, note: `${m.how}。得到 🪙 ${m.coins} 字元（新世界的貨幣）。${ws.length ? '新的稱號詞條：' + ws.join('、') + '。' : ''}` });
  }

  function openAcademyUI() {
    openAcademy({ PX, NW: () => NW, look: () => myHero(), close: () => viewHub(), weaponTour, lessonDone });
  }
  async function lessonDone(id) {
    if (NW.tut[id]) return;
    NW.tut[id] = 1; NW.coins += LESSON_COINS; saveNw();
    await showGift({ icon: '🏫', title: `字元 ×${LESSON_COINS}`, note: '學會了新本領！字元是新世界的貨幣，之後可以買東西、打造裝備。' });
    await awardMissions();
    /* 第三堂課一做完就算主線：以前要等下一場狩獵打完才會算，同學做完了任務卻不跳下一個 */
    for (const q of checkQuests()) await showGift({ icon: '📌', title: `任務完成：${q.t}`, note: `獎勵：${q.rewardText}。` });
  }
  async function weaponTour() {
    const key = NW.gw[NW.gw.length - 1] || NW.starter;
    const name = (weaponInfo(key) || {}).name || '新武器';
    const wi = [...NW.gear].reverse().find(g => (gearDef(g.k) || {}).wk === key), wid = wi ? wi.id : '';
    const bagOpen = () => !!document.getElementById('nw-bag'), equipped = () => curWeapon(NW) === key;
    const equipBtn = () => document.querySelector(`#nw-bag [data-equip="${wid}"]`);
    const ok = await tour([
      { text: '先打開背包：按這個「🎒 背包」按鈕（也可以按鍵盤的 B）。', target: () => document.querySelector('[data-act="bagopen"]'), done: () => bagOpen() || equipped() },
      /* 背包可能被開在「任務」那一頁，或太快又被關掉，所以要能指到別的地方、也能退回第 1 步 */
      { text: () => equipBtn() || !bagOpen() ? `點一下「${name}」，把它換到手上！` : '先點上面的「⚔ 裝備背包」那一頁。',
        target: () => equipBtn() || document.querySelector('#nw-bag [data-bag-tab="equip"]'), done: () => equipped(), back: () => !bagOpen() && !equipped() },
      { text: '換好了！看看左邊的角色，手上換成新武器了。按「關閉」回到村莊。', target: () => document.querySelector('#nw-bag [data-bag-close]'), done: () => !document.getElementById('nw-bag') }
    ], { title: '換裝備教學' });
    if (ok && !NW.tut.equip) { NW.tut.equip = 1; saveNw(); }
  }

  /* 以前 claimBugs()／claimAwards() 要讀 mg_nw_flags 領「回報被確認」的字元和「職業除錯師」，正式規則學生讀不到，已拿掉。
     現在由老師（教師頁，第 7 步做）確認回報／頒發時寄信：固定 ID bug_{flagID}／award_{flagID}，信的 src 是 'bug'／'award'，
     學生從信箱領（字元用 coins、職業除錯師用 word bugking）。教師頁做好之前這兩種獎勵沒人寄，件數、抓蟲分、
     稱號詞條（除蟲員、蟲蟲剋星）照常從 mg_bugboard 同步。 */
  async function refreshBoard(force) {
    await syncBoard(!!force);
    await awardMissions();   // 進村時已同步過件數，這裡補發「除蟲員」等任務完成通知；沒有新任務就什麼都不做
    if (wordNotes.length) {
      const ws = wordNotes.splice(0);
      await showGift({ icon: '🏅', title: `新的稱號詞條：${ws.join('、')}`, note: '到背包點名字下面的稱號，自己拚拚看。' });
    }
  }

  function openBugReport() {
    const sheet = document.createElement('div');
    sheet.className = 'nw-sheet fixed inset-0 overflow-y-auto p-3'; sheet.style.zIndex = 96; sheet.style.background = 'rgba(9,8,18,.92)';
    sheet.innerHTML = `<div class="px-panel" style="max-width:520px;width:100%;padding:16px;margin:0 auto">
      <div class="px-title" style="font-size:1.4em">🐛 回報問題</div>
      <p class="px-text mt-1 text-sm">遊戲哪裡怪怪的？幫忙抓蟲的人會得到「除蟲員」稱號和字元，<b>抓得最多的人，老師會頒發特別稱號「👑 職業除錯師」</b>！</p>
      <div class="px-panel in mt-2" style="padding:8px 10px"><div class="px-text text-sm" style="color:#ffd98a;font-weight:900">怎麼寫，老師才找得到蟲？寫清楚兩件事：</div>
        <div class="px-text text-sm mt-1">① 你<b>做了什麼事</b>　② <b>出現什麼錯誤狀況</b></div>
        <div class="text-xs mt-1" style="color:#aab0d8;line-height:1.6">✅ 好的例子<br>做了什麼：我在背包裡很快連點 3 次「裝備背包」<br>錯誤狀況：背包整個黑掉，按什麼都沒有反應<br>❌ 不好的例子：「壞掉了」「很爛」（看不出哪裡壞）</div></div>
      <div class="flex gap-2 mt-3 flex-wrap" data-cat><span class="px-text text-sm" style="align-self:center">哪一類？</span>${['畫面', '按鍵／操作', '題目', '魔物', '其他'].map(t => `<button class="px-btn" data-c="${t}">${t}</button>`).join('')}</div>
      <div class="px-text text-sm mt-3" style="font-weight:900">① 我做了什麼事？</div>
      <textarea data-did maxlength="150" rows="2" placeholder="例：我在背包裡很快連點 3 次「裝備背包」" class="w-full mt-1 p-3 px-panel in" style="color:#fff"></textarea>
      <div class="px-text text-sm mt-2" style="font-weight:900">② 出現什麼錯誤狀況？</div>
      <textarea data-what maxlength="150" rows="2" placeholder="例：背包整個黑掉，按什麼都沒有反應" class="w-full mt-1 p-3 px-panel in" style="color:#fff"></textarea>
      <p class="text-xs mt-1" style="color:#ffd98a">送出後，要等<b>老師看過、確認</b>，才會有獎勵：前 ${BUG_REWARD_MAX} 個被確認的回報有字元：小問題 🪙 ${bugCoins(1)}、中 ${bugCoins(2)}、大 ${bugCoins(3)}，並解鎖「除蟲員」。亂寫的不會被確認喔。</p>
      <div data-err class="text-sm mt-1" style="color:#e5705f;min-height:1.2em"></div>
      <div class="flex gap-2 justify-end mt-2"><button class="px-btn" data-close>取消</button><button class="px-btn gold" data-send style="padding:8px 22px">送出</button></div></div>`;
    let cat = '';
    sheet.addEventListener('click', async e => {
      const c = e.target.closest('[data-c]');
      if (c) { cat = c.dataset.c; sheet.querySelectorAll('[data-c]').forEach(b => b.classList.toggle('gold', b === c)); return; }
      if (e.target === sheet || e.target.closest('[data-close]')) { sheet.remove(); return; }
      if (!e.target.closest('[data-send]')) return;
      const err = sheet.querySelector('[data-err]'), did = sheet.querySelector('[data-did]').value.trim(), what = sheet.querySelector('[data-what]').value.trim();
      if (did.length < 4) { err.textContent = '① 多寫幾個字：你做了什麼事？（至少 4 個字）'; return; }
      if (what.length < 4) { err.textContent = '② 多寫幾個字：出現了什麼錯誤狀況？（至少 4 個字）'; return; }
      const text = `【我做了什麼】${did}\n【錯誤狀況】${what}`;
      if (!C.online()) { err.textContent = '現在連不上網路'; return; }
      if (Date.now() - (openBugReport.last || 0) < 20000) { err.textContent = '剛剛才送過，等一下再送下一個'; return; }
      const fid = `bug_${ME.docId}_${Date.now()}`;
      try {
        await C.withTimeout(C.setDoc(C.doc(C.db, 'mg_nw_flags', fid), { type: 'bug', status: 'pending', docId: ME.docId, cat, text, did, what, view, cls: ME.className, seat: ME.seat, name: ME.name, t: Date.now() }), 6000, 'nw-bug');
      } catch (er) { err.textContent = '送出失敗，再試一次'; return; }
      openBugReport.last = Date.now();
      /* 老師頁的回報代號就是這個 ID。mg_bugboard 大家都讀得到，不能放內文，所以「我的回報」要看得到自己寫了什麼，只能留在自己的存檔 */
      NW.bugLog = NW.bugLog || {}; NW.bugLog[fid] = `${did.slice(0, 24)}／${what.slice(0, 24)}`;
      Object.keys(NW.bugLog).sort().slice(0, -20).forEach(k => delete NW.bugLog[k]);
      NW.bugsSent = (NW.bugsSent || 0) + 1; saveNw(); sheet.remove();
      await showGift({ icon: '🐛', title: '回報收到了！', note: '老師看過、確認以後，獎勵（字元和「除蟲員」）會在你下次進新世界時寄給你。' });
      if (view === 'hub') viewHub();
    });
    document.body.appendChild(sheet);
  }

  /* 「我的回報」：讀 mg_bugboard.reports（老師確認時寫入：id、st 狀態、sev 嚴重度、reply 回覆、t 送出時間）。
     mg_bugboard 所有同學都讀得到，所以老師的回覆另外寄成信給本人（bug_／bugr_ 加回報代號），有信就用信裡那句，沒有才用 reports 裡的 */
  const mailReply = id => {
    const m = mailList.find(x => x.id === 'bug_' + id) || mailList.find(x => x.id === 'bugr_' + id);
    const r = m && /老師說：([\s\S]*)$/.exec(String(m.body || ''));
    return r ? r[1].trim() : null;
  };
  /* 老師的信會引用他回報的內容（「你回報的：…」）：沒存在自己存檔裡的舊回報，就用信裡那句 */
  const mailQuote = id => {
    const m = mailList.find(x => x.id === 'bug_' + id) || mailList.find(x => x.id === 'bugr_' + id);
    const r = m && /你回報的：([^\r\n]*)/.exec(String(m.body || ''));
    return r ? r[1].trim() : '';
  };
  function myReportsHtml() {
    const rs = (board && Array.isArray(board.reports)) ? board.reports.slice().sort((a, b) => (b.t || 0) - (a.t || 0)).slice(0, 8) : [];
    const score = NW.bugScore > 0 ? `<span class="px-chip" style="color:#8ec96b">抓蟲分 ${NW.bugScore}</span>` : '';
    const replyOf = r => { const m = mailReply(r.id); return m !== null ? m : r.reply; };
    if (!rs.length) return `<div class="px-text text-sm mt-3" style="color:#aab0d8">我的回報：老師還沒有看過你的回報。${score}</div>`;
    /* 重複與不採用都用溫和的話：不讓同學覺得自己做錯了。老師有寫回覆就顯示老師的話 */
    const st = r => r.st === 'approved' ? '<b style="color:#8ec96b">✓ 老師確認了</b>'
      : r.st === 'dup' ? '<span style="color:#9ec9ff">老師已經收到其他同學的回報，謝謝你！</span>'
      : r.st === 'rejected' ? '<span style="color:#e5705f">這次沒有採用，謝謝你</span>' : '<span style="color:#ffd98a">老師還沒看</span>';
    return `<div class="px-text mt-3" style="font-weight:900;color:#ffd98a">我的回報 ${score}</div>
      <div class="flex flex-col gap-1 mt-1" data-reports>${rs.map(r => `<div class="px-panel in text-sm" style="padding:6px 10px">${r.t ? new Date(r.t).toLocaleDateString('zh-TW') + '　' : ''}${st(r)}${(NW.bugLog || {})[r.id] || mailQuote(r.id) ? `<div style="color:#dfe3ff;overflow-wrap:anywhere">你寫的：${escHtml((NW.bugLog || {})[r.id] || mailQuote(r.id))}</div>` : ''}${r.sev ? `　嚴重度 ${'★'.repeat(Math.min(3, +r.sev || 0))}` : ''}${replyOf(r) ? `<div style="color:#aab0d8">老師說：${escHtml(String(replyOf(r)).slice(0, 80))}</div>` : ''}</div>`).join('')}</div>`;
  }

  async function openTesterBook() {
    await refreshBoard(true);
    await refreshMail(true);   // 老師的回覆優先用寄給本人的信（見 mailReply）
    introOnce('book');
    const sheet = document.createElement('div');
    sheet.className = 'nw-sheet fixed inset-0 overflow-y-auto'; sheet.style.zIndex = 94; sheet.style.background = 'rgba(9,8,18,.94)';
    const done = TESTER_MISSIONS.filter(m => NW.tm[m.id]).length;
    sheet.innerHTML = `<div class="max-w-2xl mx-auto p-3"><div class="px-panel" style="padding:14px">
      <div class="flex items-center justify-between gap-2"><div class="px-title" style="font-size:1.5em">📓 測試員手冊</div><button class="px-btn" data-close>關閉</button></div>
      <p class="px-text mt-1 text-sm">新世界還在試玩中，你是第一批冒險者！完成任務、抓到蟲蟲，都會蓋章、得字元和稱號。已完成 <b>${done} / ${TESTER_MISSIONS.length}</b>。</p>
      <div class="flex flex-col gap-2 mt-3">${TESTER_MISSIONS.map(m => `<div class="px-panel in flex items-center gap-3" style="padding:8px 12px;${NW.tm[m.id] ? '' : 'opacity:.75'}"><span style="font-size:28px">${m.icon}</span><span style="flex:1"><b class="px-text">${m.t}</b><br><span class="text-xs" style="color:#aab0d8">${m.how}</span></span><span class="px-chip" style="color:${NW.tm[m.id] ? '#8ec96b' : '#ffd98a'}">${NW.tm[m.id] ? '✓ 已蓋章' : '🪙 ' + m.coins}</span></div>`).join('')}</div>
      ${myReportsHtml()}
      <div class="flex gap-2 justify-end mt-3 flex-wrap"><span class="px-text text-sm" style="align-self:center">已送出 ${NW.bugsSent || 0} 個問題・老師確認 ${NW.bugs} 個・寫了 ${Object.values(NW.fb).filter(v => v === 1).length} 份回饋</span><button class="px-btn gold" data-bug>🐛 回報問題</button></div></div></div>`;
    sheet.addEventListener('click', e => {
      if (e.target.closest('[data-close]')) sheet.remove();
      else if (e.target.closest('[data-bug]')) { sheet.remove(); openBugReport(); }
    });
    document.body.appendChild(sheet);
  }

  async function earlyGift() {
    if (!NW.starter || NW.giftedEarly || NW.gw.includes('testblade') || window.__NW_NOGIFT__) return;
    if (!gate().early) return;
    NW.giftedEarly = true;
    const g = applyReward({ type: 'weapon', key: 'testblade' });
    saveNw();
    await showGift(Object.assign({}, g, { note: '謝謝你提前來測試新世界！' + g.note }));
    viewHub();
    weaponTour();
  }

  const giftHash = async raw => sha256Hex('gift:' + cleanCode(raw));
  function openGiftInput() {
    introOnce('gift');
    const sheet = document.createElement('div');
    sheet.className = 'nw-sheet fixed inset-0 z-[90] grid place-items-center p-3'; sheet.style.zIndex = 90; sheet.style.background = 'rgba(9,8,18,.9)';
    sheet.innerHTML = `<div class="px-panel" style="max-width:420px;width:100%;padding:18px">
      <div class="px-title" style="font-size:1.4em">🎁 兌換序號</div>
      <p class="px-text mt-1 text-sm">輸入老師給你的序號，就能領禮物。輸入的字會藏起來。</p>
      <input data-code type="password" autocomplete="new-password" autocapitalize="off" spellcheck="false" placeholder="輸入序號" class="w-full mt-3 p-3 px-panel in mono" style="color:#fff">
      <div data-err class="text-sm mt-2" style="color:#e5705f;min-height:1.3em"></div>
      <div class="flex gap-2 justify-end mt-2"><button class="px-btn" data-close>取消</button><button class="px-btn gold" data-ok style="padding:8px 22px">兌換</button></div></div>`;
    const inp = sheet.querySelector('[data-code]'), err = sheet.querySelector('[data-err]');
    let bad = 0, lockUntil = 0;
    const submit = async () => {
      if (Date.now() < lockUntil) { err.textContent = '錯太多次了，等一下再試試看'; return; }
      const raw = inp.value; if (!cleanCode(raw)) { err.textContent = '請先輸入序號'; return; }
      if (!C.online()) { err.textContent = '現在連不上網路'; return; }
      const h = await giftHash(raw), key = h.slice(0, 16);
      let entry = null;
      try { const s = await C.withTimeout(C.getDoc(C.doc(C.db, 'mg_config', 'gift_codes')), 5000, 'gift'); entry = s.exists() ? ((s.data().codes || {})[h] || null) : null; } catch (e) { err.textContent = '讀取失敗，再試一次'; return; }
      if (!entry) { bad++; err.textContent = '序號不對喔'; if (bad >= 5) { lockUntil = Date.now() + 30000; bad = 0; } return; }
      if (NW.gifts.includes(key)) { err.textContent = '這組序號你已經領過了'; return; }
      if (!rewardOk(entry.reward)) { err.textContent = '這組序號有問題，請告訴老師'; return; }
      /* 領取紀錄一人一份（mg_gift_used/{雜湊}_{我}）：先查自己領過沒、再用 count 數全班領了幾份，
         不再對 gift_codes 做 increment（學生不能寫 mg_config）。舊版 increment 出來的 used 要一起算。 */
      const usedRef = C.doc(C.db, 'mg_gift_used', `${h}_${ME.docId}`);
      try {
        if ((await C.withTimeout(C.getDoc(usedRef), 5000, 'gift-mine')).exists()) { NW.gifts.push(key); saveNw(); err.textContent = '這組序號你已經領過了'; return; }
        if (entry.max) {
          const n = (await C.withTimeout(C.getCountFromServer(C.query(C.collection(C.db, 'mg_gift_used'), C.where('h', '==', h))), 5000, 'gift-count')).data().count;
          if ((entry.used || 0) + n >= entry.max) { err.textContent = '這組序號已經被領完了'; return; }
        }
      } catch (e) { err.textContent = '讀取失敗，再試一次'; return; }
      /* 先寫紀錄、成功才給獎勵：同一人兩台電腦同時領，第二份會被規則擋下（已存在就不能再 create） */
      try { await C.withTimeout(C.setDoc(usedRef, { h, id: ME.docId, t: Date.now() }), 5000, 'gift-used'); }
      catch (e) { err.textContent = (e && e.code === 'permission-denied') ? '這組序號你已經領過了' : '送出失敗，再試一次'; return; }
      const g = applyReward(entry.reward);
      NW.gifts.push(key); saveNw();
      sheet.remove(); await showGift(g); viewHub();
      if (entry.reward.type === 'weapon') weaponTour();
    };
    sheet.addEventListener('click', e => { if (e.target === sheet || e.target.closest('[data-close]')) sheet.remove(); else if (e.target.closest('[data-ok]')) submit(); });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) submit(); });
    document.body.appendChild(sheet); inp.focus();
  }

  function closeBag() { const b = document.getElementById('nw-bag'); if (b) b.remove(); }

  const titleLine = () => NW.title ? titleBadgeHtml(PX, NW, escHtml, 2) : `${PX.badge(1, 2)} <span style="color:#aab0d8">還沒有稱號・點我拚一個</span>`;

  function openTitleEditor(after) {
    introOnce('title');
    const ed = document.createElement('div');
    ed.id = 'nw-title'; ed.className = 'fixed inset-0 z-[88] grid place-items-center p-4'; ed.style.background = 'rgba(9,8,18,.88)';
    let parts = NW.titleParts.filter(id => NW.words.includes(id));
    const draw = () => {
      const names = parts.map(id => wordById(id).w);
      const slots = [0, 1, 2].map(i => parts[i] ? `<button class="px-btn gold" data-rm="${i}" title="點一下拿掉">${escHtml(names[i])} ✕</button>` : `<span class="px-panel in" style="padding:8px 14px;color:#6d6a90">空格</span>`).join('');
      const groups = WORD_GROUPS.map(g => {
        const cells = WORDS.filter(x => x.g === g && (wordOpen(x) || NW.words.includes(x.id))).map(x => NW.words.includes(x.id)
          ? `<button class="px-btn" data-add="${x.id}" ${parts.includes(x.id) || parts.length >= 3 ? 'disabled' : ''}>${escHtml(x.w)}</button>`
          : `<div class="px-panel in" style="padding:5px 9px;opacity:.55;filter:grayscale(1)"><b class="px-text">🔒 ${escHtml(x.w)}</b><div class="text-xs" style="color:#aab0d8">${escHtml(x.how)}</div></div>`).join('');
        return `<div class="px-text mt-3 mb-1" style="color:#ffd98a">${g}詞條</div><div class="flex flex-wrap gap-2">${cells}</div>`;
      }).join('');
      ed.querySelector('[data-box]').innerHTML = `
        <div class="px-title" style="font-size:1.4em">自己拚稱號</div>
        <p class="text-xs mb-2" style="color:#aab0d8">選 1～3 個詞條，順序就是你點的順序。解鎖的才能用，灰色的看條件。</p>
        <div class="px-panel in text-center" style="padding:12px;font-size:1.5em">${PX.badge(tierOf(parts.length), 3)} <b class="px-title" style="display:inline">${names.length ? escHtml(names.join('')) : '（還沒選）'}</b></div>
        <div class="flex gap-2 flex-wrap items-center mt-2">${slots}<button class="px-btn" data-clear style="margin-left:auto">清空</button></div>
        ${groups}
        <div class="text-right mt-4"><button class="px-btn gold" data-ok>完成</button></div>`;
    };
    ed.innerHTML = '<div class="px-panel" style="max-width:560px;width:100%;max-height:90vh;overflow-y:auto;padding:16px" data-box></div>';
    ed.addEventListener('click', e => {
      const add = e.target.closest('[data-add]'), rm = e.target.closest('[data-rm]');
      if (add && parts.length < 3 && !parts.includes(add.dataset.add)) parts.push(add.dataset.add);
      else if (rm) parts.splice(+rm.dataset.rm, 1);
      else if (e.target.closest('[data-clear]')) parts = [];
      else if (e.target.closest('[data-ok]') || e.target === ed) {
        setTitleParts(NW, parts); syncTitle(); saveNw(); ed.remove(); if (after) after(); return;
      } else return;
      draw();
    });
    document.body.appendChild(ed);
    draw();
  }


  /* ── 信箱（SPEC §3）：老師寄的信放 mg_mail，學生只讀；已領紀錄在自己存檔的 NW.mail ── */
  const MAIL_KEEP_MS = 30 * 24 * 3600 * 1000;
  const toMs = v => !v ? 0 : typeof v === 'number' ? v : v.toMillis ? v.toMillis() : (v.seconds ? v.seconds * 1000 : 0);
  const mailItems = m => Array.isArray(m.items) ? m.items : [];
  const mailBlock = () => nameLock ? 'lock' : !C.online() ? 'offline' : '';
  /* 已領超過 30 天的收起來；沒領的不管多久都留著（過期由 expireAt 決定） */
  const mailVisible = () => mailList.filter(m => !NW.mail[m.id] || now() - toMs(NW.mail[m.id]) <= MAIL_KEEP_MS)
    .sort((a, b) => (NW.mail[a.id] ? 1 : 0) - (NW.mail[b.id] ? 1 : 0) || (b.t || b._sendAt) - (a.t || a._sendAt));
  const countUnread = () => mailVisible().filter(m => !NW.mail[m.id]).length;

  function paintMailBadge() {
    document.querySelectorAll('[data-bagdot]').forEach(el => { el.style.display = mailCount > 0 ? 'block' : 'none'; });
  }
  /* 查詢只用 array-contains-any 一個條件（全部／我的班／我），時間在這裡用「伺服器時間」過濾，不用建索引 */
  async function fetchMail(force) {
    if (mailBlock()) { mailList = []; mailCount = 0; paintMailBadge(); return mailBlock(); }
    if (!force && mailAt && Date.now() - mailAt < 60000) return '';
    let snap;
    try {
      snap = await C.withTimeout(C.getDocs(C.query(C.collection(C.db, 'mg_mail'), C.where('aud', 'array-contains-any', ['all', 'cls:' + ME.className, 'id:' + ME.docId]))), 6000, 'nw-mail');
    } catch (e) { console.warn('讀信箱失敗', e); return 'fail'; }
    const t = now(), list = [];
    snap.forEach(d => {
      const m = d.data() || {}, sendAt = toMs(m.sendAt), exp = toMs(m.expireAt);
      if (sendAt > t || (exp && exp <= t)) return;
      list.push(Object.assign({}, m, { id: d.id, _sendAt: sendAt }));
    });
    mailList = list; mailAt = Date.now(); mailCount = countUnread(); paintMailBadge();
    return '';
  }
  const refreshMail = force => fetchMail(force).catch(() => {});

  const itemLabel = it => { const d = rewardOf(it); return !it ? '' : d ? d.label(it) : '❓ 新東西'; };

  async function claimMail(ids) {
    if (mailBusy) return;
    mailBusy = true;
    try {
      /* 另一個分頁可能已經領過：先讀雲端存檔，把它的已領紀錄併進來 */
      try {
        const s = await C.withTimeout(C.getDoc(docRef()), 5000, 'nw-mail-read');
        const cm = s.exists() && s.data().nw && s.data().nw.mail;
        if (cm && typeof cm === 'object' && !Array.isArray(cm)) for (const k in cm) if (!NW.mail[k]) NW.mail[k] = cm[k];
      } catch (e) { toast('現在連不上網路，等一下再來領', 3000); return; }
      const gifts = []; let did = 0, unknown = 0, full = 0;
      stateGifted = false;
      for (const id of ids) {
        const m = mailList.find(x => x.id === id);
        if (!m || NW.mail[id]) continue;
        const items = mailItems(m);
        if (!items.every(itemKnown)) { unknown++; continue; }
        if (NW.gear.length + items.filter(x => x.type === 'gear').length > GEAR_MAX) { full++; continue; }
        items.forEach(it => { const g = applyReward(it); if (g) gifts.push(g); });
        if (!items.length) gifts.push({ icon: '✉', title: m.title || '一封信', note: m.body || '' });
        NW.mail[id] = now(); did++;
      }
      /* 補發的獵人等級、區域、圖鑑、教學課會讓任務往前：先算任務（任務完成可能解鎖詞條），再算詞條 */
      const qs = stateGifted ? checkQuests() : [];
      const ws = checkWords(NW);
      qs.forEach(q => gifts.push({ icon: '📌', title: `任務完成：${q.t}`, note: `獎勵：${q.rewardText}。` }));
      if (ws.length) gifts.push({ icon: '🏅', title: '新的稱號詞條', note: ws.join('、') + '。到背包點名字下面的稱號，自己拚拚看。' });
      if (did) await saveNwNow();
      mailCount = countUnread(); paintMailBadge();
      paintMail();
      for (const g of gifts) await showGift(g);
      if (stateGifted) { stateGifted = false; await awardMissions(); }
      if (unknown) toast('有信裡的東西這個版本還不認得，請按 F5 重新整理再來領', 4200);
      if (full) toast(`裝備滿了（最多 ${GEAR_MAX} 件），這封信先留著，之後開放「分解」整理好再來領`, 4200);
      if (did && view === 'hub') viewHub();
    } finally { mailBusy = false; }
  }

  function paintMail() {
    const sheet = document.getElementById('nw-mail'); if (!sheet) return;
    const box = sheet.querySelector('[data-mailbox]'), blk = mailBlock();
    const msg = t => { box.innerHTML = `<div class="px-panel in px-text text-center" data-msg style="padding:18px">${t}</div>`; sheet.querySelector('[data-all]').disabled = true; };
    if (blk === 'lock') { msg('名字跟上次不一樣，信箱先鎖起來了；請找老師。'); return; }
    if (blk === 'offline') { msg('現在連不上網路，信箱打不開。'); return; }
    const list = mailVisible(), un = list.filter(m => !NW.mail[m.id] && mailItems(m).every(itemKnown));
    const allBtn = sheet.querySelector('[data-all]'); allBtn.disabled = !un.length; allBtn.textContent = un.length ? `全部領取（${un.length}）` : '全部領取';
    if (!list.length) { box.innerHTML = '<div class="px-panel in px-text text-center" data-msg style="padding:18px">信箱是空的。老師寄信來，郵筒就會冒出 ✉。</div>'; return; }
    box.innerHTML = list.map(m => {
      const got = NW.mail[m.id], known = mailItems(m).every(itemKnown), items = mailItems(m);
      return `<div class="px-panel in" data-mail="${escHtml(m.id)}" style="padding:10px 12px;${got ? 'opacity:.7' : ''}">
        <div class="flex items-start gap-2"><span style="font-size:26px">${got ? '📭' : '✉'}</span>
          <div class="flex-1"><b class="px-text" style="color:#ffd98a;font-size:1.05em">${escHtml(m.title || '（沒有標題）')}</b>
            <div class="text-xs" style="color:#aab0d8">${escHtml(m.from || '老師')}${m._sendAt ? '・' + new Date(m._sendAt).toLocaleDateString('zh-TW') : ''}</div></div>
          ${got ? '<span class="px-chip" style="color:#8ec96b">✓ 已領</span>'
            : known ? `<button class="px-btn gold" data-claim="${escHtml(m.id)}">領取</button>` : '<span class="px-chip" style="color:#e5705f">還不能領</span>'}</div>
        ${m.body ? `<p class="px-text mt-1" style="font-size:.98em;line-height:1.6;white-space:pre-wrap">${escHtml(m.body)}</p>` : ''}
        ${items.length ? `<div class="flex gap-2 flex-wrap mt-1">${items.map(it => `<span class="px-chip">${escHtml(itemLabel(it))}</span>`).join('')}</div>` : ''}
        ${!known && !got ? '<p class="text-sm mt-1" style="color:#e5705f">這封信裡有這個版本還不認得的東西，請按 F5 重新整理再來領。</p>' : ''}</div>`;
    }).join('');
  }

  async function openMail() {
    await introOnce('mail');
    const old = document.getElementById('nw-mail'); if (old) old.remove();
    const sheet = document.createElement('div');
    sheet.id = 'nw-mail'; sheet.className = 'nw-sheet fixed inset-0 overflow-y-auto p-3'; sheet.style.zIndex = 92; sheet.style.background = 'rgba(9,8,18,.92)';
    sheet.innerHTML = `<div class="px-panel" style="max-width:560px;width:100%;padding:16px;margin:0 auto">
      <div class="flex items-center justify-between gap-2"><div class="px-title" style="font-size:1.5em">✉ 信箱</div>
        <div class="flex gap-2"><button class="px-btn gold" data-all disabled>全部領取</button><button class="px-btn" data-close>關閉</button></div></div>
      <div class="flex flex-col gap-2 mt-3" data-mailbox><div class="px-panel in px-text text-center" data-msg style="padding:18px">讀信中…</div></div>
      <p class="text-xs mt-3" style="color:#aab0d8">領過的信會留著可以再看，30 天後收起來。</p></div>`;
    sheet.addEventListener('click', e => {
      if (e.target === sheet || e.target.closest('[data-close]')) { sheet.remove(); return; }
      const one = e.target.closest('[data-claim]');
      if (one) { claimMail([one.dataset.claim]); return; }
      if (e.target.closest('[data-all]')) claimMail(mailVisible().filter(m => !NW.mail[m.id]).map(m => m.id));
    });
    document.body.appendChild(sheet);
    if (mailBlock()) { paintMail(); return; }
    const r = await fetchMail(true);
    if (r === 'fail') { const b = sheet.querySelector('[data-mailbox]'); if (b) b.innerHTML = '<div class="px-panel in px-text text-center" data-msg style="padding:18px">信箱讀不到，等一下再試試看。</div>'; return; }
    paintMail();
  }

  /* ── 改名字（SPEC §8）：名字是登入名字、固定。
     兩個入口：背包「改名字」用 1 張改名卡；第一次進新世界問一次「沿用還是改」，這次改不扣卡。 ── */
  const cards = () => (NW.items.renameCard || 0);
  /* 名字規則：去空白、最多 10 字（跟登入一樣），不能全是數字、不能只有符號 */
  function nameProblem(raw) {
    const n = raw.trim();
    if (!n) return '請輸入新的名字';
    if (n.length > 10) return '名字太長了（最多 10 個字）';
    if (/^[0-9０-９]+$/.test(n)) return '名字不能全是數字';
    if (!/[\p{L}\p{N}]/u.test(n)) return '名字不能只有符號';
    return '';
  }
  /* 雲端 name、nw.name0、nwNick 都跟著換（pushCloud 一起寫），舊世界下次用新名字登入就不會被鎖 */
  function applyName(n, useCard) {
    if (useCard) NW.items.renameCard = cards() - 1;
    /* 記一筆在存檔裡給老師看；不寫 mg_nw_flags，免得被教師頁當成「冒名」的待處理 */
    NW.nameLog = (NW.nameLog || []).concat([{ t: Date.now(), from: ME.name, to: n, card: useCard ? 1 : 0 }]).slice(-5);
    NW.name0 = n; ME.name = n; ME.typed = n; nameBase = n;
    if (C.onRename) C.onRename(n);
  }
  function openRename(after, first) {
    return new Promise(res => {
      if (!first) {
        if (nameLock) { toast('名字跟登入時不一樣，先鎖起來了；請找老師', 3800); res(); return; }
        if (cards() < 1) { toast('要有改名卡才能改名字（老師會寄給你）', 3600); res(); return; }
      }
      const ed = document.createElement('div');
      ed.id = 'nw-rename'; ed.className = 'nw-sheet fixed inset-0 grid place-items-center p-4'; ed.style.zIndex = 93; ed.style.background = 'rgba(9,8,18,.9)';
      if (first) ed.dataset.first = '1';
      const inputHtml = `<input class="w-full p-3 text-center font-bold text-xl" data-rn maxlength="10" placeholder="新的名字" value="" style="background:#0e0b16;border:3px solid #6a5ab0;color:#fff">
        <p class="text-xs mt-1" style="min-height:1.2em;color:#ff9a8a" data-rn-err></p>`;
      const cur = escHtml(ME.name);
      ed.innerHTML = first
        ? `<div class="px-panel" style="max-width:460px;width:100%;padding:16px">
            <div class="px-title" style="font-size:1.4em">你的名字</div>
            <p class="text-sm mb-3" style="color:#aab0d8">你現在的名字是「<b>${cur}</b>」。進新世界要用這個名字嗎？選好之後就固定了，之後想改要用「改名卡」。名字會出現在抓蟲榜和活動榜。</p>
            <div data-rn-box style="display:none">${inputHtml}</div>
            <div class="flex gap-2 justify-end mt-3 flex-wrap"><button class="px-btn gold" data-keep>沿用「${cur}」</button><button class="px-btn" data-change>改新名字</button><button class="px-btn gold" data-ok style="display:none">確定</button></div></div>`
        : `<div class="px-panel" style="max-width:460px;width:100%;padding:16px">
            <div class="px-title" style="font-size:1.4em">✏ 改名字</div>
            <p class="text-xs mb-2" style="color:#aab0d8">請填你想讓大家看到的名字，會出現在抓蟲榜和活動榜。<b>會用掉 1 張改名卡</b>，想好再按「確定」。</p>
            <div data-rn-box>${inputHtml}</div>
            <div class="flex gap-2 justify-end mt-3"><button class="px-btn" data-cancel>取消</button><button class="px-btn gold" data-ok>確定</button></div></div>`;
      const inp = () => ed.querySelector('[data-rn]'), err = () => ed.querySelector('[data-rn-err]');
      const done = () => { ed.remove(); if (after) after(); res(); };
      const commit = () => {
        const n = inp().value.trim(), pb = nameProblem(n);
        if (pb) { err().textContent = pb; return; }
        if (first) {
          if (normName(n) === normName(ME.name)) { NW.nameSet = 1; saveNwNow(); done(); return; }
          applyName(n, false); NW.nameSet = 1; saveNwNow(); toast(`你的名字是「${n}」，之後就固定了`, 3000); done(); return;
        }
        if (normName(n) === normName(ME.name)) { err().textContent = '跟現在的名字一樣喔'; return; }
        /* 開著視窗時卡可能已經在別的分頁用掉了 */
        if (cards() < 1) { ed.remove(); toast('改名卡不夠了', 2600); res(); return; }
        applyName(n, true); saveNwNow(); toast(`你的名字改成「${n}」`, 2600); done();
      };
      ed.addEventListener('click', e => {
        if (!first && (e.target === ed || e.target.closest('[data-cancel]'))) { ed.remove(); res(); return; }
        if (e.target.closest('[data-keep]')) { NW.nameSet = 1; saveNwNow(); toast(`你的名字是「${ME.name}」，之後就固定了`, 3000); done(); return; }
        if (e.target.closest('[data-change]')) {
          ed.querySelector('[data-rn-box]').style.display = ''; ed.querySelector('[data-ok]').style.display = '';
          ed.querySelector('[data-keep]').style.display = 'none'; e.target.closest('[data-change]').style.display = 'none'; inp().focus(); return;
        }
        if (e.target.closest('[data-ok]')) commit();
      });
      /* 注音輸入選字時的 Enter 不算送出 */
      ed.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing && e.target.matches && e.target.matches('[data-rn]')) commit(); });
      document.body.appendChild(ed);
      const i0 = inp(); if (i0 && !first) i0.focus();
    });
  }
  /* 第一次進新世界問一次（NW.nameSet 舊存檔沒有，所以已經在玩的人也會問一次）。
     被冒名鎖時不問（名字有疑問先不固定）。測試機用 __NW_NOINTRO__ 關掉，要測這個再開 __NW_NICKPROMPT__。 */
  async function nameFirst() {
    if (NW.nameSet || nameLock || (window.__NW_NOINTRO__ && !window.__NW_NICKPROMPT__)) return;
    await openRename(null, true);
  }

  function openBackpack(tab) {
    closeBag();
    const TABS = [['equip', '⚔', '裝備背包'], ['items', '🧪', '道具'], ['mats', '📦', '材料'], ['bp', '📜', '圖紙'], ['quest', '🧭', '任務'], ['dex', '📖', '圖鑑'], ['mail', '✉', '信箱']];
    const sheet = document.createElement('div');
    sheet.id = 'nw-bag'; sheet.className = 'nw-sheet fixed inset-0 z-[75] overflow-y-auto'; sheet.style.background = 'rgba(9,8,18,.9)';
    sheet.innerHTML = `<style>
      ${CARD_CSS}
      .bp-title{display:block;width:100%;text-align:center;padding:6px 8px;background:#0a0714;border:3px solid #6a5ab0;color:#fff;font-weight:900;cursor:pointer}
      .bp-title:hover{border-color:#ffd24a}
      .bp-cell{aspect-ratio:1;display:grid;place-items:center;background:#0e0b16;border:3px solid #2a2450;position:relative}
      .bp-cell.on{border-color:#e8b64c}
      .bp-cell.dark{overflow:visible}
    </style><div class="max-w-5xl mx-auto p-3"><div class="px-panel" style="padding:12px">
      <div class="flex items-center justify-between mb-3"><div class="px-title text-2xl">🎒 背包</div><button class="px-btn" data-bag-close>關閉（B）</button></div>
      <div class="flex gap-3 flex-wrap items-start">
        <div class="px-panel in" style="width:340px;max-width:100%;padding:12px" data-card></div>
        <div class="flex-1" style="min-width:280px"><div class="flex gap-2 flex-wrap mb-2">${TABS.map(([k, i, n]) => `<button class="px-btn" data-bag-tab="${k}" style="position:relative">${i} ${n}${k === 'mail' ? `<i data-bagdot style="display:${mailCount > 0 ? 'block' : 'none'};position:absolute;top:-5px;right:-5px;width:14px;height:14px;background:#d83a3a;border:2px solid #0a0714"></i>` : ''}</button>`).join('')}</div>
          <div class="px-panel in" style="min-height:360px" data-body></div></div></div></div></div>`;
    const slot = (k, n) => equipSlotHtml(NW, k, n);
    const renderCard = () => {
      const c = sheet.querySelector('[data-card]');
      c.innerHTML = `<div class="text-center px-text" style="font-size:1.25em;font-weight:900">${escHtml(ME.name)}</div>
        ${nameLock ? '<p class="text-xs mt-1" style="color:#8a86b0">名字跟登入時不一樣，先不能改名字；請找老師</p>'
          : `<button class="px-btn mt-1" data-name-edit style="display:block;width:100%;${cards() < 1 ? 'opacity:.5' : ''}" title="名字會顯示在抓蟲榜上">${cards() > 0 ? `✏ 改名字　用 1 張改名卡（有 ${cards()} 張）` : '✏ 改名字'}</button>
        ${cards() < 1 ? '<p class="text-xs mt-1" style="color:#8a86b0">要有改名卡才能改名字（老師會寄給你）</p>' : ''}`}
        <button class="bp-title mt-1" data-title-edit title="點一下編輯稱號">${titleLine()}</button>
        <div class="flex items-center justify-between gap-1 mt-3" style="padding-bottom:20px">
          <div class="flex flex-col gap-6">${EQUIP_LEFT.map(([k, n]) => slot(k, n)).join('')}</div>
          <div class="px-img" data-hero style="background:#0e0b16;padding:6px;border:3px solid #0a0714"></div>
          <div class="flex flex-col gap-6" style="align-self:flex-start">${EQUIP_RIGHT.map(([k, n]) => slot(k, n)).join('')}</div>
        </div>
        <div class="flex gap-2 mt-2 flex-wrap justify-center"><button class="px-btn" data-bag-act="creator">💇 改造型</button></div>
        <p class="text-xs mt-2" style="color:#aab0d8">${stageOpen('2b') ? '到鐵匠鋪打造裝備，穿上去角色會跟著變。' : '頭盔、盔甲、護手、護腳要等鐵匠鋪開張才能穿，穿上去角色會跟著變。'}</p>`;
      mountSprites(c);
      c.querySelector('[data-hero]').replaceChildren(PX.hero(myHero(), 5));
    };
    const render = t => {
      sheet.querySelectorAll('[data-bag-tab]').forEach(b => b.setAttribute('aria-pressed', b.dataset.bagTab === t));
      const body = sheet.querySelector('[data-body]');
      body.innerHTML = bagBody(t);
      mountSprites(body);
    };
    sheet.addEventListener('click', e => {
      if (e.target === sheet || e.target.closest('[data-bag-close]')) { closeBag(); return; }
      const t = e.target.closest('[data-bag-tab]');
      if (t && t.dataset.bagTab === 'mail') { openMail(); return; }   // 信箱是獨立視窗，跟郵筒打開的是同一個
      if (t) { render(t.dataset.bagTab); return; }
      if (e.target.closest('[data-name-edit]')) { openRename(renderCard, false); return; }
      if (e.target.closest('[data-title-edit]')) { openTitleEditor(renderCard); return; }
      const so = e.target.closest('[data-sort]');
      if (so) { bagSort = so.dataset.sort; render('equip'); return; }
      const mt = e.target.closest('[data-mat]');
      if (mt) { bagMat = mt.dataset.mat; render('mats'); return; }
      const eq = e.target.closest('[data-equip]');
      if (eq) { doEquip(NW, eq.dataset.equip); bagSel = eq.dataset.equip; saveNw(); const fx = afterGear(); renderCard(); render('equip'); if (fx.note) toast(fx.note, 3600); return; }
      const a = e.target.closest('[data-bag-act]');
      if (a) { closeBag(); if (a.dataset.bagAct === 'starter') viewStarter(); else viewCreator(false); }
    });
    document.body.appendChild(sheet);
    renderCard();
    render(tab || 'equip');
    introOnce('bag');
  }
  addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (/INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '') || root.classList.contains('hidden') || !NW) return;
    if (k === 'b' && ['hub', 'board', 'room'].includes(view)) { document.getElementById('nw-bag') ? closeBag() : openBackpack('equip'); }
    if (k === 'escape') { const ne = document.getElementById('nw-rename') || document.getElementById('nw-mail'); if (ne) { if (!ne.dataset.first) ne.remove(); return; } const nt = document.getElementById('nw-notice'); if (nt && nt._esc) { nt._esc(); return; } const te = document.getElementById('nw-title'); if (te) te.querySelector('[data-ok]').click(); else closeBag(); }
  });

  let boardSel = null;
  /* 房間搬出 mg_config：正式規則 mg_config 只有老師能寫，學生開不了房 */
  const roomId = () => ME.docId;
  const roomRef = () => C.doc(C.db, 'mg_rooms', roomId());

  async function loadRooms() {
    if (!C.online()) return [];
    /* 只讀 20 分鐘內的：當機沒關的舊房間不用每次都載進來 */
    const snap = await C.withTimeout(C.getDocs(C.query(C.collection(C.db, 'mg_rooms'), C.where('t', '>', Date.now() - 20 * 60 * 1000))), 5000, 'nw-rooms');
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
      village = mountBoard(el.querySelector('#board'), { PX, NW, goal: goalOf(NW), selected: boardSel, loadRooms, onSelect: id => { boardSel = id; }, onHunt: q => openRoom(q) });
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
            <p class="text-sm mt-3 px-text">你的房間已經貼在公會的「房間」分頁，同學看得到。<span style="color:#ffd98a">組隊一起打還在施工中，現在先單人出發！</span></p>
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
    const t0 = now();
    startBattle(env(), { rk: q.rk, mk: q.mk, star: q.star }, res => {
      show('nw-root', true);
      closeRoom();
      res.t0 = t0;
      afterHunt(res);
    });
  }

  function afterHunt(res) {
    const sum = finishHunt(res);
    showResult(res, sum, async () => {
      for (const g of sum.evGifts || []) await showGift(g);
      if (sum.quests.length) toast(`任務完成：${sum.quests[0].t}　獎勵：${sum.quests[0].rewardText}`, 3600);
      if (sum.win && TEST_TAGS[res.mk] && !NW.fb[res.mk]) await askFeedback(res);
      await awardMissions();
      viewBoard();
    });
  }

  function askFeedback(res) {
    return new Promise(done => {
      const m = MONSTERS[res.mk];
      const sheet = document.createElement('div');
      sheet.id = 'nw-fb'; sheet.className = 'nw-sheet fixed inset-0 z-[96] grid place-items-center p-3'; sheet.style.zIndex = 96; sheet.style.background = 'rgba(9,8,18,.92)';
      sheet.innerHTML = `<div class="px-panel" style="max-width:520px;width:100%;padding:16px;max-height:94vh;overflow-y:auto">
        <div class="px-title" style="font-size:1.4em">🧪 測試回饋</div>
        <p class="px-text mt-2">你剛打完「<b>${escHtml(m.name)}</b>」，謝謝你幫忙測試！覺得好打嗎？紅線看得清楚嗎？有什麼想法？<b>可以寫，也可以不寫。</b></p>
        <div class="flex gap-2 mt-3" data-rate>${[['😀', '好玩'], ['😐', '普通'], ['😣', '太難']].map(([e, t]) => `<button class="px-btn" data-r="${t}" style="flex:1;font-size:1.1em">${e} ${t}</button>`).join('')}</div>
        <textarea data-text maxlength="200" rows="4" placeholder="想說什麼都可以寫在這裡（最多 200 字）" class="w-full mt-3 p-3 px-panel in" style="color:#fff;font-size:1.05em"></textarea>
        <p class="text-sm mt-2" style="color:#ffd98a">寫了（至少 ${FB_MINLEN} 個字）就送你 🪙 <b>${FB_COINS} 字元</b>！字元是新世界的<b>貨幣</b>，之後可以在商店買東西、到鐵匠鋪打造裝備。</p>
        <div class="flex gap-2 justify-end mt-3"><button class="px-btn" data-skip>先不要</button><button class="px-btn gold" data-send style="padding:8px 22px">送出</button></div></div>`;
      let rate = '', sending = false;
      sheet.addEventListener('click', async e => {
        const r = e.target.closest('[data-r]');
        if (r) { rate = r.dataset.r; sheet.querySelectorAll('[data-r]').forEach(b => b.classList.toggle('gold', b === r)); return; }
        if (e.target.closest('[data-skip]')) { NW.fb[res.mk] = 'skip'; saveNw(); sheet.remove(); done(); return; }
        if (!e.target.closest('[data-send]')) return;
        const text = sheet.querySelector('[data-text]').value.trim();
        if (!text && !rate) { NW.fb[res.mk] = 'skip'; saveNw(); sheet.remove(); done(); return; }
        if (!C.online()) { toast('現在連不上網路，回饋還沒送出，等一下再試試看', 3000); return; }
        if (sending) return;
        sending = true;
        const sendBtn = sheet.querySelector('[data-send]'); sendBtn.disabled = true; sendBtn.textContent = '送出中…';
        const id = `fb_${ME.docId}_${res.mk}_${Date.now()}`;
        /* Firestore 遇到 undefined 欄位會直接拒絕整份文件，所以先過一次 JSON 把它們濾掉；
           學校網路慢，6 秒常不夠，給 12 秒並自動再試一次 */
        const body = JSON.parse(JSON.stringify({ type: 'feedback', mk: res.mk, mon: m.name, star: res.star, rate, text, cls: ME.className, seat: ME.seat, name: ME.name, t: Date.now() }));
        let sentOk = false, lastErr = null;
        for (let k = 0; k < 2 && !sentOk; k++) {
          try { await C.withTimeout(C.setDoc(C.doc(C.db, 'mg_nw_flags', id), body), 12000, 'nw-fb'); sentOk = true; } catch (err) { lastErr = err; console.warn('回饋送出失敗', err); }
        }
        sending = false; sendBtn.disabled = false; sendBtn.textContent = '送出';
        if (!sentOk) { toast(`送出失敗（${(lastErr && (lastErr.code || lastErr.message)) || '不明原因'}），再試一次，或按「先不要」`, 4500); return; }
        const gift = text.length >= FB_MINLEN;
        NW.fb[res.mk] = 1;
        if (gift) NW.coins += FB_COINS;
        saveNw(); sheet.remove();
        if (gift) await showGift({ icon: '🪙', title: `字元 ×${FB_COINS}`, note: '謝謝你的回饋！字元是新世界的貨幣，之後可以買東西、打造裝備。' }); else toast('收到你的回饋了，謝謝！', 2600);
        done();
      });
      document.body.appendChild(sheet);
    });
  }

  function finishHunt(res) {
    const lv = regionLv(res.rk, res.star), m = MONSTERS[res.mk];
    const s = NW.stat;
    NW.hunts++;
    if (NW.starter) NW.used[weaponBase(curWeapon(NW))] = 1;
    s.dodgeOk += res.dodgeOk; s.dodgeAll += res.dodgeAll; s.defOk += res.defOk; s.defAll += res.defAll;
    const sum = { lv, win: res.result === 'win', exp: 0, coins: 0, drops: [], rare: [], ups: 0, quests: [], star: res.star };
    if (res.valid) {
      /* 活動要在更新「自己最快」之前算：進步獎拿活動前的紀錄當 base */
      const fk = res.mk + ':' + res.star, prevBest = NW.fastMk[fk];
      const evr = EV.onRun(res, prevBest, res.t0, now());
      sum.boost = evr.boost; sum.evGifts = evr.gifts;
      if (sum.win && !(res.secs >= prevBest)) NW.fastMk[fk] = Math.round(res.secs * 10) / 10;
      if (sum.win) {
        s.wins++;
        NW.wwin[weaponBase(curWeapon(NW))] = (NW.wwin[weaponBase(curWeapon(NW))] || 0) + 1;
        /* accuracy 是 0～1 的小數（畫面才乘 100）；以前寫 >= 100 永遠不成立，「一字不差」從來沒人拿到 */
        if (res.accuracy >= 1 && lv >= 10) NW.perfect = (NW.perfect || 0) + 1;
        NW.dex[res.mk] = (NW.dex[res.mk] || 0) + 1;
        if (res.star > (NW.zone[res.rk] || 0)) NW.zone[res.rk] = res.star;
        const key = res.rk + ':' + res.star;
        if (!NW.fastest[key] || res.secs < NW.fastest[key]) NW.fastest[key] = res.secs;
      } else s.fails++;
      if (res.lvAcc && lv >= 20) { s.accN++; s.accSum += res.accuracy; }
      sum.exp = Math.round(huntExp(lv, sum.win) * evr.boost.exp);
      sum.coins = Math.round(huntCoins(lv, sum.win) * evr.boost.coins);
      sum.hr0 = NW.hr; sum.exp0 = NW.hrExp;
      sum.ups = addHrExp(NW, sum.exp);
      NW.coins += sum.coins;
      const rolls = sum.win ? 1 : 0.5;
      m.drops.forEach(([id, name, color, lo, hi]) => {
        const n = Math.max(1, Math.round((lo + Math.floor(Math.random() * (hi - lo + 1))) * rolls));
        NW.mats[id] = (NW.mats[id] || 0) + n; sum.drops.push({ id, name, color, n });
      });
      if (sum.win) sum.rare = rollBlueprints(NW, res.mk);
      /* 每場紀錄（2b-9）：算「可疑」、記進步用的速度、排進寫入佇列。2b 開放才開始寫（規則要先貼好，OPEN_STAGES 加 '2b' 就是那個時刻）；
         測試用的假結果沒有每題摘要（q），就略過 */
      if (Array.isArray(res.q) && stageOpen('2b')) {
        const hist = NW.cpmHist[res.qb] || (NW.cpmHist[res.qb] = []);
        sum.sus = susCheck(res, hist);
        if (!sum.sus.length && res.cpm > 0) { hist.push(res.cpm); while (hist.length > SUS.jumpNeed) hist.shift(); }
        queueRun(res, sum);
      }
    }
    sum.quests = checkQuests();
    sum.words = checkWords(NW);
    saveNw();
    flushRuns();
    return sum;
  }

  /* ── 每場紀錄 mg_nw_runs（2b-9，docs/SPEC-STAGE2.md §2.6）──
     2b 上線就開始寫，學生看不到差別；2a 榮譽碑開放前沒人讀。文件 ID＝文件ID_毫秒，同一場重送不會變兩筆。
     寫不進去（離線、逾時）就留在 NW.runQ（最多 5 筆，多的丟最舊的），下次進村或下一場結束時補寫；
     補寫的 ts 是補寫當下的伺服器時間，所以那場算進「補寫的那一週」，這是故意的（改電腦時間塞不了舊紀錄）。
     學生不能 update：同一個 ID 再寫會被規則擋（permission-denied），當成已經寫進去了。 */
  const round = (x, k) => Math.round((+x || 0) * 10 ** k) / 10 ** k;
  function queueRun(res, sum) {
    const t = Date.now(), rid = `${ME.docId}_${t}`;
    const run = JSON.parse(JSON.stringify({
      id: ME.docId, cls: ME.className, seat: Number(ME.seat) || 0, uid: (C.uid && C.uid()) || '', t, v: 1, app: C.appVersion || '',
      mk: res.mk, rk: res.rk, star: res.star, lv: res.lv, qb: res.qb, res: res.result === 'win' ? 'win' : res.result === 'fail' ? 'fail' : 'retreat',
      secs: round(res.secs, 1), acc: round(res.accuracy, 3), ans: res.ans, cor: res.cor, typ: res.typ, keys: res.keys, nokey: res.nokey, act: res.act, cpm: res.cpm,
      fl: { fast: (res.flags || {}).fast || 0, paste: (res.flags || {}).paste || 0, wrong: (res.flags || {}).wrong || 0 },
      sus: sum.sus || [], w: res.wk || res.weapon, atk: res.atk, pw: res.pw, tier: res.tier, q: [].concat(...res.q)   // 平的數字陣列、每 4 個一題；Firestore 不能存「陣列裡的陣列」（NW.runQ 也會存進 mg_scores）
    }));
    const flag = (sum.sus || []).length ? { type: 'run', status: 'pending', docId: ME.docId, cls: ME.className, seat: ME.seat, name: ME.name, runId: rid, why: sum.sus, mk: res.mk, star: res.star, t } : null;
    NW.runQ.push({ rid, run, flag });
    while (NW.runQ.length > 5) NW.runQ.shift();
  }
  let runBusy = false;
  async function flushRuns() {
    if (runBusy || !NW || !NW.runQ || !NW.runQ.length || !C.online()) return;
    runBusy = true;
    try {
      for (const it of NW.runQ.slice()) {
        if (!it.ran) {
          try { await C.withTimeout(C.setDoc(C.doc(C.db, 'mg_nw_runs', it.rid), Object.assign({}, it.run, { ts: C.serverTimestamp() })), 6000, 'nw-run'); it.ran = 1; }
          catch (e) { if (e && e.code === 'permission-denied') it.ran = 1; else { console.warn('寫場次紀錄失敗，之後再補', e); break; } }
        }
        let flagOk = !it.flag;
        if (it.ran && it.flag) {
          try { await C.withTimeout(C.setDoc(C.doc(C.db, 'mg_nw_flags', 'run_' + it.rid), it.flag), 6000, 'nw-runflag'); flagOk = true; }
          catch (e) { if (e && e.code === 'permission-denied') flagOk = true; else { console.warn('寫可疑標記失敗，之後再補', e); break; } }
        }
        if (it.ran && flagOk) NW.runQ = NW.runQ.filter(x => x.rid !== it.rid);
        saveNw();
      }
    } finally { runBusy = false; }
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
    sheet.className = 'nw-sheet fixed inset-0 z-[90] overflow-y-auto';
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
        ${res.valid && sum.boost && sum.boost.text ? `<div class="px-title mt-3 px-cursor" style="font-size:1.1em">${escHtml(sum.boost.text)}</div>` : ''}
        ${res.valid ? `<div class="label mt-4 mb-2">獲得</div>
          <div class="flex gap-2 flex-wrap">${drops}${rare}</div>
          <div class="flex gap-5 mt-3 px-text" style="font-size:1.1em"><span>🪙 字元 +<b data-n="${sum.coins}">0</b></span><span>⭐ 獵人經驗 +<b data-n="${sum.exp}">0</b></span></div>
          <div class="flex items-center gap-2 mt-2"><b class="px-text" style="color:#ffd98a">獵人 Lv ${NW.hr}</b><div class="px-bar xp flex-1"><i data-hr style="width:${p0}%"></i></div></div>
          ${sum.ups ? `<div class="px-title mt-2 px-cursor" style="font-size:1.2em">獵人等級升到 ${NW.hr}！拿到 ${sum.ups} 顆星星（星圖台施工中，先存著）</div>` : ''}
          ${(sum.words || []).length ? `<div class="px-title mt-2 px-cursor" style="font-size:1.1em">${PX.badge(3, 2)} 新的稱號詞條：${sum.words.map(escHtml).join('、')}！到背包點名字下面的稱號，自己拚拚看</div>` : ''}
          ${stageOpen('2b') ? (fh => `<p class="px-text mt-2" data-forge-hint style="color:#ffd98a;font-weight:900">⚒ 鐵匠鋪：${escHtml(fh ? fh.text : '材料和圖紙先存著，打造和強化都在鐵匠鋪')}</p>`)(forgeHint(NW)) : '<p class="text-xs mt-2" style="color:#aab0d8">材料和圖紙先幫你存著，鐵匠鋪開張就能用。</p>'}` : ''}
        <div class="mt-5 text-right"><button class="px-btn gold" style="padding:10px 30px;font-size:1.1em" data-close>回公會</button></div>
      </div></div>`;
    sheet.addEventListener('click', e => { if (e.target.closest('[data-close]')) { sheet.remove(); done(); } });
    document.body.appendChild(sheet);
    sheet.querySelector('[data-ink]').replaceChildren(PX.ink('monster', res.mk, 4));
    requestAnimationFrame(() => requestAnimationFrame(() => { const h = sheet.querySelector('[data-hr]'); if (h) { h.style.transition = 'width 1.1s steps(14)'; h.style.width = p1 + '%'; } }));
    sheet.querySelectorAll('[data-n]').forEach(el => { const to = +el.dataset.n, t0 = performance.now(); const tick = now => { const k = Math.min(1, (now - t0) / 800); el.textContent = Math.round(to * k); if (k < 1 && el.isConnected) requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
  }

  function openRank() { openNwRank(C, ME, { fastMk: () => NW.fastMk }); }

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
      ({ leave, gift: openGiftInput, book: openTesterBook, bug: openBugReport, notice: () => openNotice(false), hub: viewHub, map: viewBoard, bagopen: () => openBackpack('equip'), bagq: () => openBackpack('quest'),
         bag: () => { viewHub(); openBackpack('equip'); }, creator: () => viewCreator(false),
         leaveroom: () => { closeRoom(); viewBoard(); }, startroom: () => launch(cur.q),
         starter: viewStarter, rank: () => openRank() }[act] || (() => {}))();
      return;
    }
  });

  const giftPending = () => { if (!gate().early) return false; try { const l = JSON.parse(localStorage.getItem(lkey()) || 'null'); return !(l && (l.giftedEarly || (l.gw || []).includes('testblade'))); } catch (e) { return true; } };
  return { enter, gate, leave, now, events: EV, notice: NT, noticeFlags: () => nflags, noticeRefresh, eventsCheck, finishHunt, afterHunt, nameLocked: () => nameLock, nameBase: () => nameBase, ticket: showTicket, giftPending, refresh: refreshAccess, openCode: openCodeSheet, get nw() { return NW; }, isOpen: () => !root.classList.contains('hidden') };
}
