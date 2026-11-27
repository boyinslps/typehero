/* 委託板改版（打贏撤下、只剩目標單與挑戰單就補滿 4 張、刷新付費；docs/SPEC-SHOP-BOARD2.md B1、B5）的新行為。
   前半純 node（nw-board-rot.js 的 afterRun／refillAll／postGoal／normalizeBoard），後半用假 Firebase 開瀏覽器（連點、雙分頁）。 */
const { chromium } = require('playwright'); const fs = require('fs');
const path = require('path'); const M = path.join(__dirname, 'mock') + '/'; const OUT = process.argv[2] || require('os').tmpdir();
const css = require('./tw.js')(OUT);
const NOTICE_ID = /export const NOTICES = \[\s*\{ id: '([^']+)'/.exec(fs.readFileSync(path.join(__dirname, '../../nw-data.js'), 'utf8'))[1];
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const ID = '五年級3班_5號', CLS = '五年級3班';

async function open(browser, o = {}) {
  const p = await browser.newPage({ viewport: o.vp || { width: 1200, height: 900 } });
  const errs = []; p.on('dialog', d => d.accept());
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  const { sha256Hex } = await import('../../nw-access.js');
  const hash = await sha256Hex('Test-Pass_9!x');
  const seed = { ['mg_scores/' + ID]: { className: CLS, seat: 5, name: '小明', bestLevel: 10, bestScore: 20, scoreVer: 2, plays: 9, tutorialDone: true, talentIntroDone: true, tier: o.tier || 'B', balanceVer: 3, punctDone: true,
    nw: Object.assign({ v: 1, savedAt: 5, look: { style: 1, hair: 2, skin: 1 }, starter: 'dagger', hunts: 5, quest: { done: ['1-0', '1-0a'] }, zone: { grass: 5 }, dex: { coo: 1, frog: 1, shroom: 1 }, tm: { m_dodge: 1, m_defend: 1, m_attack: 1 }, intro: { hub: 1, notice: 1 }, seenNotice: NOTICE_ID, nameSet: 1 }, o.nw || {}) } };
  await p.addInitScript(a => {
    window.__FS = a.s; window.__RULES = true; localStorage.clear(); localStorage.setItem('mg_nw_fast', '1');
    window.__NW_CODE_HASH__ = a.hash; localStorage.setItem('mg_nw_code', a.hash); window.__NW_NOGIFT__ = true; window.__NW_NOINTRO__ = true;
    window.confetti = () => {}; window.html2canvas = async () => document.createElement('canvas');
    window.__NW_STAGES__ = ['1', '2b']; if (typeof a.v2 === 'boolean') window.__NW_V2__ = a.v2; window.__BOARD_ROT__ = a.rot;
    if (a.pattern) window.__NW_PATTERN__ = a.pattern;
    window.__NW_ATTACKS__ = []; window.__tOff = 0; const _n = performance.now.bind(performance); performance.now = () => _n() + window.__tOff;
  }, { s: Object.assign(seed, o.docs || {}), hash, v2: o.v2, pattern: o.pattern || null, rot: !!o.rot });
  await p.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('http://localhost')) return r.continue();
    if (u.includes('cdn.tailwindcss.com')) return r.fulfill({ contentType: 'application/javascript', body: `const s=document.createElement('style');s.textContent=${JSON.stringify(css)};document.head.appendChild(s);` });
    const m = u.includes('firebase-app') ? 'app.js' : u.includes('firebase-auth') ? 'auth.js' : u.includes('firebase-firestore') ? 'fs.js' : null;
    if (m) return r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(M + m, 'utf8') });
    return r.abort();
  });
  await p.goto('http://localhost:8765/index.html'); await p.waitForFunction(() => window.__NWG, null, { timeout: 15000 }); await p.waitForTimeout(500);
  await p.selectOption('#in-grade', '五年級'); await p.selectOption('#in-class', '3班'); await p.fill('#in-seat', '5'); await p.waitForTimeout(900);
  await p.click('#btn-enter'); await p.waitForTimeout(1000);
  p.errs = errs;
  await p.click('#nw-door'); await p.waitForFunction(() => window.__NWV, null, { timeout: 12000 }); await p.waitForTimeout(500);
  return p;
}


const fakeRes = (o = {}) => {
  const q = o.q || Array.from({ length: 12 }, () => [2, 5, 2400, 2]);
  const cor = q.reduce((a, x) => a + x[3], 0), act = Math.round(q.reduce((a, x) => a + x[2], 0)) / 1000;
  return Object.assign({ rk: 'grass', mk: 'coo', star: 1, lv: 1, qb: '6:0', result: 'win', secs: 80, accuracy: 0.96, answered: q.length, ans: q.length, cor, typ: cor + 1, keys: q.reduce((a, x) => a + x[1], 0), nokey: 0, act, cpm: Math.round(cor / act * 600) / 10,
    dodgeOk: 0, dodgeAll: 0, defOk: 0, defAll: 0, maxCombo: 5, flags: { fast: 0, paste: 0, wrong: 1 }, tier: 'B', weapon: 'dagger', wk: 'dagger', atk: 105, pw: 40, valid: true, lvAcc: true, q,
    live: 70, idle: 10, frac: 1, fEff: 1, flow: 'normal', guards: 0, vines: 0, dodgeReal: 0, react: [] }, o.over || {});
};
const hunt = (p, id, over) => { const [rk, mk, star] = id.split(':'); return p.evaluate(r => { r.t0 = Date.now(); return JSON.parse(JSON.stringify(window.__NWG.finishHunt(r))); }, fakeRes({ over: Object.assign({ rk, mk, star: +star }, over || {}) })); };
const toBoard = async p => {
  if (await p.$('#nwbd-board')) await p.click('[data-act="hub"]');
  await p.waitForSelector('.vb[data-bld="board"]'); await p.click('.vb[data-bld="board"]'); await p.waitForSelector('#nwbd-board'); await p.waitForTimeout(150);
};
const cardsOf = p => p.$$eval('.qs[data-q]:not(.lock)', els => els.map(e => ({ id: e.dataset.q, role: (e.querySelector('.qs-role') || {}).textContent || '', tag: ((e.parentElement.querySelector('.qs-goal') || {}).textContent || ''), isNew: e.parentElement.classList.contains('new'), tagNew: ((e.parentElement.querySelector('.qs-newtag') || {}).textContent || '') })));
const board = p => p.evaluate(() => JSON.parse(JSON.stringify(window.__NWG.nw.board)));
const ids = b => ['a', 'b', 'c', 'd', 'e'].map(k => b.slots[k].id).filter(Boolean);
const fsOk = x => x !== undefined && (Array.isArray(x) ? x.every(v => !Array.isArray(v) && fsOk(v)) : x && typeof x === 'object' ? Object.values(x).every(fsOk) : true);
const noOverflow = p => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const overlap = p => p.$$eval('.nwbd-sheets .qs-wrap', els => { const r = els.map(e => e.getBoundingClientRect()); for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) { const a = r[i], b = r[j]; if (a.left < b.right - 4 && b.left < a.right - 4 && a.top < b.bottom - 4 && b.top < a.bottom - 4) return true; } return false; });
const DONE3 = ['1-0', '1-0a', '1-1', '1-2', '1-3'];
const G3 = { zone: { grass: 3, forest: 0 }, dex: { coo: 3, frog: 3, shroom: 2 }, quest: { done: [...DONE3, '1-4'] }, fastMk: { 'frog:3': 140, 'coo:3': 110, 'shroom:3': 190 } };
const NOW = Date.now(), HOUR = 3600e3;


(async () => {
  const D = await import('../../nw-data.js');
  const R = await import('../../nw-board-rot.js');
  const { BOARD, pickBoard, afterRun, refillAll, swapState, allDone, ensureBoard, band, frontier, parseId, firestoreOk, mulberry, ctxOf } = R;
  const now0 = Date.UTC(2026, 10, 24, 3);
  const keys = BOARD.keys, idsOf = bd => keys.map(k => bd.slots[k].id).filter(Boolean);
  const mkNw = o => D.normalizeNw(Object.assign({ starter: 'staff', hr: 12, tut: { dodge: 1, dodgeDone: 1 } }, o));
  const roleOf = (nw, id, T = 480) => band(nw, parseId(id), frontier(nw, T));
  const flat = bd => Array.isArray(bd.out) && bd.out.every(x => typeof x === 'string');

  /* ── 1. 一般單打完（不含目標單、挑戰單）→ 自動補滿 4 張，目標單留著 ── */
  {
    const nw = mkNw({ zone: { grass: 2, forest: 0 }, dex: { frog: 2, coo: 2, shroom: 2 }, quest: { done: ['1-0', '1-0a', '1-1', '1-2', '1-3'] }, fastMk: { 'frog:2': 120, 'coo:2': 100, 'shroom:2': 150 } });
    let bd = pickBoard(nw, now0, 11, [], 300), r = null, wins = 0;
    const first = idsOf(bd), goals = ctxOf(nw, bd, now0, [], 300).goals, isG = id => goals.some(g => g.match(parseId(id)));
    ok(first.length >= 4, `一開始 ${first.length} 張`);
    const plain = first.filter(x => roleOf(nw, x, 300) !== 'hard' && !isG(x)), total = plain.length;
    ok(total >= 2 && total < first.length, `一般單 ${total} 張（目標單與挑戰單不用打）`);
    for (const id of plain) {
      r = afterRun(nw, bd, { id, win: true, valid: true, wasHard: false }, now0, [], 300);
      wins++;
      ok(firestoreOk(r.board) && flat(r.board), `打贏第 ${wins} 張：符合 Firestore、out 是平的字串陣列`);
      if (wins < total) { ok(!r.all && !idsOf(r.board).includes(id) && idsOf(r.board).length === idsOf(bd).length - 1, `第 ${wins} 張：直接撤下、板上少 1 張、沒有補單張`); }
      bd = r.board;
    }
    ok(r.all === true && idsOf(bd).length >= 4 && first.filter(isG).every(x => idsOf(bd).includes(x)) && keys.every(k => !('ok' in bd.slots[k])), `最後一張打完：補滿到 ${idsOf(bd).length} 張，目標單留著（changed：${r.changed.join('')}）`);
    ok(bd.done === total && !allDone(nw, bd, [], 300), `done＝${total}、新的一批都還沒打`);
    ok(true, '（新的一批可以跟剛打的同一種魔物、不同星級也可以，只是剛打贏的那張機率低）');
  }

  /* ── 2. 舊存檔：swap＝今天、out 是字串、slot 沒有 ok ── */
  {
    const nw = mkNw({ zone: { grass: 3, forest: 0 }, dex: { frog: 2, coo: 2, shroom: 1 }, quest: { done: ['1-0', '1-0a', '1-1', '1-2', '1-3', '1-4'] } });
    const fresh = pickBoard(nw, now0, 5, [], 300);
    const old = JSON.parse(JSON.stringify(fresh));
    old.swap = D.twDay(now0); old.out = 'grass:frog:1'; delete old.swapN; delete old.swapCoin;
    const nb = D.normalizeBoard(old);
    ok(nb.swapN === 1 && nb.swapCoin === 0 && Array.isArray(nb.out) && nb.out.length === 1 && nb.out[0] === 'grass:frog:1', '舊存檔：swapN＝1（今天換過）、out 變成陣列');
    ok(keys.every(k => !('ok' in nb.slots[k])) && idsOf(nb).length === idsOf(fresh).length && firestoreOk(nb), '舊存檔 slot 沒有 ok：單子都留著，格子也不再有 ok 欄位');
    const stamped = JSON.parse(JSON.stringify(fresh)); const sk0 = keys.find(k => stamped.slots[k].id); stamped.slots[sk0].ok = 1;
    ok(D.normalizeBoard(stamped).slots[sk0].id === '', '舊存檔「蓋完成章」（ok＝1）的單子：當作已撤下，不留在板上');
    const nw2 = Object.assign({}, nw, { board: nb });
    ok(swapState(nw2, nb, now0, [], 300).cost === 40, '下一次刷新要 40 字元');
    const r = refillAll(nw2, nb, now0, [], 300, 'swap');
    ok(r.cost === 40 && r.board.swapN === 2 && r.board.swapCoin === 40, '舊存檔：刷新收 40、swapN＝2、swapCoin＝40');
    const nb0 = D.normalizeBoard(Object.assign({}, old, { swap: D.twDay(now0) - 1, day: D.twDay(now0) }));
    ok(nb0.swapN === 0, '舊存檔：上次換是昨天 → swapN＝0');
    const bad = D.normalizeBoard(Object.assign({}, old, { out: ['grass:frog:1', 'grass:frog:1', 'bad', 'grass:coo:2', 7, null, 'grass:coo:3', 'grass:coo:4', 'grass:coo:5', 'grass:shroom:1', 'grass:shroom:2', 'grass:shroom:3'], swapN: 99, swapCoin: -5 }));
    ok(bad.out.length <= 8 && new Set(bad.out).size === bad.out.length && bad.out.every(x => /^[a-z]+:[a-z]+:[1-5]$/.test(x)) && bad.swapN === 3 && bad.swapCoin === 0, 'out 只留合法、不重複的前 8 個；swapN 夾到 3、swapCoin 不為負');
    ok(D.normalizeBoard(Object.assign({}, old, { out: 5 })).out.length === 0 && D.normalizeBoard(Object.assign({}, old, { out: '' })).out.length === 0, 'out 不是字串或陣列 → []');
  }

  /* ── 3. 主線目標打贏後，新目標貼進空格；刷新不會動到它 ── */
  {
    const nw = mkNw({ zone: { grass: 3, forest: 0 }, dex: { frog: 2, coo: 2, shroom: 1 }, quest: { done: ['1-0', '1-0a', '1-1', '1-2', '1-3', '1-4'] }, fastMk: { 'frog:3': 140, 'coo:3': 110, 'shroom:3': 190 } });
    let bd = pickBoard(nw, now0, 3, [], 300);
    const gk = keys.find(k => /^goal/.test(bd.slots[k].k)), gid = bd.slots[gk].id;
    ok(!!gk && !bd.slots.e.id, `主線單在板上（${gid}），第 5 格是空的`);
    nw.zone.grass = Math.max(nw.zone.grass, parseId(gid).star); nw.dex[parseId(gid).mk]++;
    const r = afterRun(nw, bd, { id: gid, win: true, valid: true, wasHard: roleOf(nw, gid, 300) === 'hard' }, now0, [], 300);
    const ng = keys.find(k => /^goal/.test(r.board.slots[k].k) && r.board.slots[k].id !== gid);
    ok(!idsOf(r.board).includes(gid) && ng && r.changed.includes(ng), `打贏後：新目標（${ng && r.board.slots[ng].id}）貼進空格（${ng}），算不算刷新？不算（swapN＝${r.board.swapN}）`);
    ok(r.board.swapN === 0 && r.board.swapCoin === 0, '貼新目標不算刷新，不用錢也不用次數');
    const nid = r.board.slots[ng].id;
    const s = refillAll(nw, r.board, now0, [], 300, 'swap');
    ok(s.board.slots[ng].id === nid && !idsOf(s.board).includes(gid), '刷新不會動新目標單（打贏的舊單子已經撤下）');
    ok(firestoreOk(s.board) && flat(s.board), '刷新後符合 Firestore');
  }

  /* ── 4. 100 個隨機進度刷新：挑戰 ≤1、最多高 1 星、勝率 ≥ 55%、🔥 刷新後還是 🔥 ── */
  {
    const rnd = mulberry(77);
    const MQ = D.MAIN_QUESTS.map(q => q.id);
    let n = 0, bad = 0, hardKept = 0, hardN = 0, nSwap = 0, badFs = 0, dup = 0, extraHard = 0;
    for (let i = 0; i < 100; i++) {
      const g = Math.floor(rnd() * 6), f = g >= 5 ? Math.floor(rnd() * 6) : 0, dex = {};
      ['frog', 'coo', 'shroom', 'wolf'].forEach(m => { if (rnd() < 0.7) dex[m] = 1 + Math.floor(rnd() * 5); });
      const fastMk = {}; for (const m of ['frog', 'coo', 'shroom']) for (let s = 1; s <= Math.max(1, g); s++) if (rnd() < 0.7) fastMk[m + ':' + s] = 60 + Math.round(rnd() * 300);
      const nw = mkNw({ zone: { grass: g, forest: f }, dex, fastMk, quest: { done: MQ.slice(0, Math.floor(rnd() * (MQ.length + 1))) } }), T = rnd() < 0.5 ? 300 : 480;
      let bd = pickBoard(nw, now0, Math.floor(rnd() * 4e9), [], T);
      /* 先隨機打贏 0～2 張，再連刷 3 次 */
      for (let w = 0; w < Math.floor(rnd() * 3); w++) { const live = keys.filter(k => bd.slots[k].id); if (live.length < 2) break; const id = bd.slots[live[Math.floor(rnd() * live.length)]].id; bd = afterRun(nw, bd, { id, win: true, valid: true, wasHard: roleOf(nw, id, T) === 'hard' }, now0, [], T).board; }
      for (let t = 0; t < 3; t++) {
        const hardBefore = keys.filter(k => bd.slots[k].id && roleOf(nw, bd.slots[k].id, T) === 'hard').length;
        const r = refillAll(nw, bd, now0, [], T, 'swap'); n++;
        if (r.refused) continue;
        nSwap++; bd = r.board;
        const live = keys.filter(k => bd.slots[k].id), ls = live.map(k => bd.slots[k].id);
        const F = frontier(nw, T), ctxPhi = R.phiHat(nw);
        const hards = ls.filter(x => roleOf(nw, x, T) === 'hard');
        if (hards.length > 1) bad++;
        if (hardBefore) { hardN++; if (hards.length >= 1) hardKept++; }
        if (ls.some(x => R.Eof(parseId(x).rk, parseId(x).star) > F.Ef + 1)) extraHard++;
        const hp = hards.find(x => !keys.some(k => /^goal/.test(bd.slots[k].k) && bd.slots[k].id === x));
        if (hp && F.En && R.pHat(parseId(hp), ctxPhi, T) < BOARD.hardP) {
          const pool = R.cands(nw).filter(q => band(nw, q, F) === 'hard' && !bd.out.includes(q.id) && (q.id === hp || !idsOf(bd).includes(q.id)));   // 今天換掉的與板上已有的不算候選
          if (pool.some(q => R.pHat(q, ctxPhi, T) >= BOARD.hardP)) bad++;
        }
        if (!firestoreOk(bd) || !flat(bd)) badFs++;
        if (new Set(idsOf(bd)).size !== idsOf(bd).length) dup++;
      }
    }
    ok(nSwap > 100, `隨機進度連刷 ${n} 次（成交 ${nSwap} 次）`);
    ok(bad === 0, `板上 🔥 永遠 ≤1、有達標的挑戰時不放勝率不到 55% 的（違規 ${bad}）`);
    ok(extraHard === 0, `最多比現在高 1 星（違規 ${extraHard}）`);
    ok(hardN > 0 && hardKept === hardN, `刷新前有 🔥，刷新後還是 🔥（${hardKept}／${hardN}）`);
    ok(badFs === 0 && dup === 0, `刷新後符合 Firestore、沒有重複單子（${badFs}／${dup}）`);
  }

  /* ── 6（純函式部分）. 只剩目標單與挑戰單的舊資料打開 → 只補一次；補好的批次不再補 ── */
  {
    const nw = mkNw({ zone: { grass: 3, forest: 0 }, dex: { frog: 2, coo: 2, shroom: 1 }, quest: { done: ['1-0', '1-0a', '1-1', '1-2', '1-3', '1-4'] } });
    const bd = pickBoard(nw, now0, 9, [], 300), goals = ctxOf(nw, bd, now0, [], 300).goals, isG = id => goals.some(g => g.match(parseId(id)));
    const left = JSON.parse(JSON.stringify(bd)); keys.forEach(k => { const id = left.slots[k].id; if (id && !isG(id) && roleOf(nw, id, 300) !== 'hard') left.slots[k] = { id: '', k: '', at: 0, m: 0 }; });
    const e1 = ensureBoard(Object.assign({}, nw, { board: left }), now0, [], 300, 1);
    ok(e1.why === 'refill' && !allDone(nw, e1.board, [], 300) && e1.changed.length >= 2 && idsOf(e1.board).length === 4, '只剩目標單與挑戰單的板子（兩個分頁互撤）：打開時補滿 4 張（why: refill）');
    const e2 = ensureBoard(Object.assign({}, nw, { board: e1.board }), now0, [], 300, 1);
    ok(e2.why === 'same' && e2.board === e1.board, '補好的新批次再打開：不再重補（same）');
    const e3 = ensureBoard(Object.assign({}, nw, { board: Object.assign({}, left, { day: D.twDay(now0) - 1 }) }), now0, [], 300, 1);
    ok(e3.board.swapN === 0 && flat(e3.board) && !allDone(nw, e3.board, [], 300), '隔天打開只剩目標單與挑戰單的板子：也補滿、swapN 歸 0');
    const few = JSON.parse(JSON.stringify(bd)), fk = keys.find(k => few.slots[k].id && !isG(few.slots[k].id) && roleOf(nw, few.slots[k].id, 300) !== 'hard'); few.slots[fk] = { id: '', k: '', at: 0, m: 0 };
    const e4 = ensureBoard(Object.assign({}, nw, { board: few }), now0, [], 300, 1);
    ok(e4.why === 'same' && e4.board === few && idsOf(few).length === idsOf(bd).length - 1, '同一天、還有一般單：板子少一張就是少一張，不補單張');
    /* 挑戰單與目標單不算「還要打的」；板上沒有一般單就算打完 */
    const hk = keys.find(k => bd.slots[k].id && roleOf(nw, bd.slots[k].id, 300) === 'hard');
    ok(!allDone(nw, bd, [], 300), '還有一般單：不算打完');
    const ho = JSON.parse(JSON.stringify(bd)); keys.forEach(k => { if (k !== hk) ho.slots[k] = { id: '', k: '', at: 0, m: 0 }; });
    ok(hk && allDone(nw, ho, [], 300) && allDone(nw, left, [], 300), '板上只剩挑戰單（或目標單加挑戰單）：算打完，會補滿');
  }

  /* ── 瀏覽器：連點、雙分頁 ── */
  const b = await chromium.launch();
  {
    const p = await open(b, { rot: true, nw: G3 });
    await toBoard(p);
    await p.evaluate(() => { window.__NWG.nw.coins = 300; });
    await p.click('[data-swap]'); await p.waitForTimeout(400);
    await toBoard(p);
    const c0 = await p.evaluate(() => window.__NWG.nw.coins);
    /* 第 2 次（要錢）：確認框「換新」連點 5 下 */
    await p.click('[data-swap]'); await p.waitForSelector('#nwbd-ask');
    await p.evaluate(() => { const y = document.querySelector('[data-ask-yes]'); for (let i = 0; i < 5; i++) y.click(); });
    await p.waitForTimeout(600);
    const b1 = await board(p), c1 = await p.evaluate(() => window.__NWG.nw.coins);
    ok(b1.swapN === 2 && c1 === c0 - 40 && b1.swapCoin === 40, `連點 5 下只成交 1 次：字元 ${c0}→${c1}、swapN＝${b1.swapN}`);
    ok(fsOk(b1) && Array.isArray(b1.out) && b1.out.every(x => typeof x === 'string'), '存檔 NW.board 符合 Firestore、out 是平的字串陣列');
    await p.waitForTimeout(1200);
    const cloud = await p.evaluate(() => window.__FS['mg_scores/五年級3班_5號'].nw);
    ok(cloud.coins === c1 && cloud.board.swapN === 2 && fsOk(cloud.board), '雲端存檔也一樣（字元與次數都寫進去了）');
    /* 免費那次：直接點 5 下（沒有確認框） */
    const q = await open(b, { rot: true, nw: G3 });
    await toBoard(q);
    await q.evaluate(() => { const bt = document.querySelector('[data-swap]'); for (let i = 0; i < 5; i++) bt.click(); });
    await q.waitForTimeout(600);
    const bq = await board(q);
    ok(bq.swapN === 1 && bq.swapCoin === 0, '免費那次連點 5 下：只成交 1 次（swapN＝1）');
    ok(p.errs.length === 0 && q.errs.length === 0, '沒有 JS 錯誤 ' + p.errs.concat(q.errs).join(';'));
    await q.close(); await p.close();
  }
  {
    /* 兩個分頁：A 打完最後一張已補新批（存在雲端），B 還是舊資料（板上已經空了）→ 同步後 ensureBoard 不再重補 */
    const p = await open(b, { rot: true, nw: G3 });
    await toBoard(p); await p.waitForTimeout(1300);
    const cloudBoard = await p.evaluate(() => {
      const nw = window.__NWG.nw, d = window.__FS['mg_scores/五年級3班_5號'];
      const cb = JSON.parse(JSON.stringify(nw.board)); cb.n += 7; cb.done = 4;     // A 那邊補好的新批（n 變了）
      d.nw = Object.assign(JSON.parse(JSON.stringify(d.nw)), { savedAt: Date.now() + 5000, board: cb, coins: 77 });
      ['a', 'b', 'c', 'd', 'e'].forEach(k => { nw.board.slots[k] = { id: '', k: '', at: 0, m: 0 }; });   // B：本機板子已經空了
      return cb;
    });
    await toBoard(p); await p.waitForTimeout(1500);
    const b2 = await board(p);
    ok(b2.n === cloudBoard.n && JSON.stringify(idsOf2(b2)) === JSON.stringify(idsOf2(cloudBoard)) && idsOf2(b2).length > 0, `同步後換成 A 的新批，ensureBoard 沒有再重補（n＝${b2.n}，A 的 n＝${cloudBoard.n}）`);
    ok((await p.evaluate(() => window.__NWG.nw.coins)) === 77 && fsOk(b2), '字元也同步成 A 的，板子符合 Firestore');
    ok(p.errs.length === 0, '沒有 JS 錯誤 ' + p.errs.join(';'));
    await p.close();
  }
  await b.close();
  console.log(fails ? `\n${fails} 項失敗` : '\n全部通過');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
const idsOf2 = bd => ['a', 'b', 'c', 'd', 'e'].map(k => bd.slots[k].id).filter(Boolean);
