/* 第 4 步：活動（SPEC §4）學生端。全程開 window.__RULES：學生只能讀 mg_events，不能寫。
   純函式（nw-events.js）直接在 node 測，畫面與雲端互動用 finishHunt() 假裝打完一場。 */
const { chromium } = require('playwright'); const fs = require('fs');
const path = require('path'); const M = path.join(__dirname, 'mock') + '/'; const OUT = process.argv[2] || require('os').tmpdir();
const css = require('./tw.js')(OUT);
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const ID = '五年級3班_5號', CLS = '五年級3班';
const MIN = 60000, HOUR = 3600000, DAY = 86400000;
const now = Date.now();

async function open(browser, o = {}) {
  const p = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const errs = []; p.on('dialog', d => d.accept());
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  const { sha256Hex } = await import('../../nw-access.js');
  const hash = await sha256Hex('Test-Pass_9!x');
  const seed = Object.assign({
    ['mg_scores/' + ID]: { className: CLS, seat: 5, name: '小明', bestLevel: 10, bestScore: 20, scoreVer: 2, plays: 9, tutorialDone: true, talentIntroDone: true, tier: 'B', balanceVer: 3, punctDone: true,
      nw: Object.assign({ v: 1, savedAt: 5, look: { style: 1, hair: 2, skin: 1 }, starter: 'dagger', quest: { done: ['1-0', '1-0a'] }, items: { potion: 3 }, intro: { hub: 1 }, seenNotice: '2026-11-12' }, o.nw || {}) }
  }, o.seed || {});
  await p.addInitScript(a => {
    window.__FS = a.s; window.__RULES = true; localStorage.clear(); localStorage.setItem('mg_nw_fast', '1');
    window.__NW_CODE_HASH__ = a.hash; localStorage.setItem('mg_nw_code', a.hash); window.__NW_NOGIFT__ = true; window.__NW_NOINTRO__ = true;
    window.confetti = () => {}; window.html2canvas = async () => document.createElement('canvas');
  }, { s: seed, hash });
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
  await p.click('#nw-door'); await p.waitForTimeout(1800);
  return p;
}
const FS = (p, k) => p.evaluate(k => window.__FS[k], k);
const nwLocal = p => p.evaluate(() => JSON.parse(JSON.stringify(window.__NWG.nw)));
const noErr = (p, m = '沒有 JS 錯誤') => ok(p.errs.length === 0, m + ' ' + p.errs.join(' | '));
const dismissGifts = async p => { for (let i = 0; i < 12; i++) { if (!(await p.$('#nw-gift'))) break; await p.click('#nw-gift [data-ok]'); await p.waitForTimeout(150); } };
/* 假裝打完一場：t0Off＝這場是幾毫秒前開打的（沒給就當剛開打）。回傳 finishHunt 的結算 */
const run = (p, o = {}) => p.evaluate(o => {
  const res = Object.assign({ rk: 'grass', mk: 'coo', star: 1, result: 'win', secs: 20, accuracy: 0.9, answered: 10, dodgeOk: 0, dodgeAll: 0, defOk: 0, defAll: 0, maxCombo: 3, flags: 0, valid: true, lvAcc: true }, o);
  if (o.t0Off !== undefined) res.t0 = window.__NWG.now() + o.t0Off;
  return window.__NWG.finishHunt(res);
}, o);
const evDoc = (o = {}) => Object.assign({ type: 'ranking', metric: 'kills', title: '測試活動', desc: '', startAt: now - HOUR, endAt: now + 3 * DAY, cls: [] }, o);
const mkScore = (cls, seat, o = {}) => [`mg_scores/${cls}_${seat}號`, Object.assign({ className: cls, seat, name: `真名${cls}${seat}`, nwCls: cls, nwEvDone: [], nwNick: '', nw: { ev: {} } }, o)];
const seedOf = arr => Object.fromEntries(arr);
/* 一堆「別人」：每人帶一個 ev 分數 */
const others = (evId, scores, o = {}) => scores.map((s, i) => mkScore(o.cls || '五年級2班', 10 + i + (o.off || 0), { nwNick: o.nick === undefined ? '勇敢的獵人' : o.nick, name: `真名${i}`, nw: { ev: { [evId]: { s, n: 5 } } } }));

(async () => {
  const E = await import('../../nw-events.js');
  const D = await import('../../nw-data.js');

  /* ── 純函式 ── */
  const base = { startAt: 1000, endAt: 100000, id: 'x', cls: [], minStar: 1, mk: '' };
  ok(E.normalizeEvent('a.b', { type: 'boost', endAt: 5 }) === null && E.normalizeEvent('ok_1', { type: 'zzz', endAt: 5 }) === null && E.normalizeEvent('ok', { type: 'boost' }) === null, 'normalizeEvent：ID 含點、不認得的 type、沒有結束時間都丟掉（ID 會變成欄位路徑 nw.ev.{ID}.s）');
  ok(E.normalizeEvent('h', { type: 'hunt', endAt: 5 }) === null && E.normalizeEvent('r', { type: 'ranking', metric: 'improve', endAt: 5 }) === null && E.normalizeEvent('r', { type: 'ranking', metric: 'bad', endAt: 5 }) === null, '缺 mk 的討伐／進步獎、不認得的指標：丟掉');
  const nb = E.normalizeEvent('b', { type: 'boost', endAt: 5, mul: 99 });
  ok(nb.mul === 5 && nb.what === 'exp', 'boost：倍數最多 5、預設加倍經驗');
  ok(E.normalizeEvent('c', { type: 'classwar', endAt: 5 }).per === D.EVENT_DEFAULTS.classwar.per && E.normalizeEvent('c', { type: 'classwar', endAt: 5 }).goalPct === D.EVENT_DEFAULTS.classwar.goalPct, 'classwar：沒寫 per／goalPct 用預設值');
  ok(E.normalizeEvent('t', { type: 'boost', endAt: { toMillis: () => 777 } }).endAt === 777, '時間可以是 Firestore Timestamp');

  /* 時間 */
  const ev0 = { startAt: 10 * 1000, endAt: 20 * 1000 };
  ok(E.runCounts(ev0, 11000, 15000) && !E.runCounts(ev0, 1000, 5000) && !E.runCounts(ev0, 21000, 22000), 'runCounts：期間內算、開始前打完不算、結束後才開打不算');
  ok(E.runCounts(ev0, 19000, 20000 + 5 * MIN) && !E.runCounts(ev0, 19000, 20000 + 5 * MIN + 1), 'runCounts：結束前開打、結束後 5 分鐘內打完算；超過 5 分鐘不算');
  ok(E.phaseOf(ev0, 5000) === 'soon' && E.phaseOf(ev0, 15000) === 'active' && E.phaseOf(ev0, 25000) === 'ended', 'phaseOf：快開始／進行中／剛結束');
  const tw = (y, m, d, h = 12) => Date.UTC(y, m - 1, d, h - 8);    // 台灣時間
  const tev = { startAt: tw(2026, 11, 20, 8), endAt: tw(2026, 11, 20, 23) };
  ok(E.timeText({ startAt: tw(2026, 11, 16, 0), endAt: tw(2026, 11, 19, 15) }, tw(2026, 11, 16)) === '還有 3 天', 'timeText：還有 3 天');
  ok(E.timeText({ startAt: tw(2026, 11, 16, 0), endAt: tw(2026, 11, 19, 15) }, tw(2026, 11, 19, 8)) === '今天結束', 'timeText：最後一天寫「今天結束」，不倒數時數');
  ok(E.timeText({ startAt: 0, endAt: tw(2026, 11, 20, 0) }, tw(2026, 11, 19, 20)) === '今天結束', 'timeText：結束時間剛好 0 點，前一天就寫「今天結束」');
  ok(E.timeText(tev, tw(2026, 11, 17)) === '3 天後開始' && E.timeText(tev, tw(2026, 11, 19)) === '明天開始' && E.timeText(tev, tw(2026, 11, 20, 7)) === '今天開始' && E.timeText(tev, tw(2026, 11, 21)) === '已結束', 'timeText：快開始（幾天後／明天／今天）與已結束');
  ok(!/[秒:：]|倒數/.test(['還有 3 天', E.timeText(tev, tw(2026, 11, 20, 12))].join('')), 'timeText：文字裡沒有秒數或倒數');

  /* boost */
  const bs = [{ type: 'boost', mul: 2, what: 'exp', cls: [], startAt: 0, endAt: 1e12 }, { type: 'boost', mul: 3, what: 'exp', cls: [], startAt: 0, endAt: 1e12 }, { type: 'boost', mul: 1.5, what: 'coins', cls: [], startAt: 0, endAt: 1e12 }, { type: 'boost', mul: 5, what: 'exp', cls: ['五年級9班'], startAt: 0, endAt: 1e12 }];
  const bo = E.boostFor(bs, CLS, 5, 6);
  ok(bo.exp === 3 && bo.coins === 1.5 && /×3（獵人經驗）/.test(bo.text) && /×1.5（字元）/.test(bo.text), 'boostFor：同一種取最大倍數不疊加、別班的不算、經驗與字元分開：' + bo.text);
  ok(E.boostFor([bs[0]], CLS, 5, 6).text === '🎪 活動加倍 ×2（獵人經驗）', 'boostFor：結果文字「🎪 活動加倍 ×2（獵人經驗）」');

  /* applyRun */
  const R = (o = {}) => Object.assign({ result: 'win', mk: 'frog', star: 1, secs: 20, accuracy: 0.9 }, o);
  const evK = Object.assign({}, base, { type: 'ranking', metric: 'kills', mk: 'frog' });
  let r = E.applyRun(evK, undefined, R());
  ok(r.hit && r.st.n === 1 && r.st.s === 1 && r.st.e === 100000, 'kills：打 1 隻 s＝1，記下結束時間 e');
  ok(!E.applyRun(evK, undefined, R({ mk: 'coo' })).hit && !E.applyRun(evK, undefined, R({ result: 'fail' })).hit && !E.applyRun(Object.assign({}, evK, { minStar: 3 }), undefined, R({ star: 2 })).hit, '不符合的魔物、沒打贏、星級不夠：不算');
  const evI = Object.assign({}, base, { type: 'ranking', metric: 'improve', mk: 'frog' });
  r = E.applyRun(evI, undefined, R({ secs: 24 }), undefined);
  ok(r.st.base === 24 && r.st.s === undefined && r.st.n === 1, 'improve 沒舊紀錄：第一場當 base，只打 1 場沒有分數');
  r = E.applyRun(evI, r.st, R({ secs: 18 }));
  ok(r.st.s === 25 && r.st.best === 18, 'improve 沒舊紀錄：第二場 18 秒 → (24-18)/24 ＝ 25%');
  r = E.applyRun(evI, undefined, R({ secs: 24 }), 30);
  ok(r.st.base === 30 && r.st.s === undefined, 'improve 有活動前紀錄 30 秒：base＝30，但還是要打 2 場才有分數');
  r = E.applyRun(evI, r.st, R({ secs: 21 }), 25);
  ok(r.st.base === 30 && r.st.s === 30, 'improve：base 只在第一場取，之後不變；(30-21)/30 ＝ 30%（後來才變的 prevBest 不影響）');
  r = E.applyRun(evI, r.st, R({ secs: 40 }));
  ok(r.st.best === 21 && r.st.s === 30, 'improve：後面打比較慢不會扣分（取最快）');
  ok(E.applyRun(evI, E.applyRun(evI, undefined, R({ secs: 10 })).st, R({ secs: 50 })).st.s === 0, 'improve：比 base 慢也不會變負的（0）');
  const evF = Object.assign({}, base, { type: 'ranking', metric: 'fastest', mk: 'frog' });
  r = E.applyRun(evF, undefined, R({ secs: 21.34 })); r = E.applyRun(evF, r.st, R({ secs: 19.96 })); r = E.applyRun(evF, r.st, R({ secs: 30 }));
  ok(r.st.s === 20 && r.st.best === 20 && r.st.n === 3 && E.sortDir(evF) === 'asc', 'fastest：取最快、四捨五入到 0.1 秒（19.96 → 20）；asc 排序（小的在前），s 就是秒數');
  const evA = Object.assign({}, base, { type: 'ranking', metric: 'acc', minRuns: 3 });
  r = E.applyRun(evA, undefined, R({ accuracy: 0.9 })); r = E.applyRun(evA, r.st, R({ accuracy: 0.95 }));
  ok(r.st.s === undefined, 'acc：只打 2 場（minRuns 3）沒有分數');
  r = E.applyRun(evA, r.st, R({ accuracy: 1 }));
  ok(r.st.s === 95 && r.st.n === 3, 'acc：3 場平均 (90+95+100)/3 ＝ 95%');
  const evH = Object.assign({}, base, { type: 'hunt', mk: 'coo', goal: 2 });
  r = E.applyRun(evH, undefined, R({ mk: 'coo' }));
  ok(!r.reached, 'hunt：第 1 隻未達標');
  r = E.applyRun(evH, r.st, R({ mk: 'coo' }));
  ok(r.reached, 'hunt：第 2 隻達標');
  ok(!E.applyRun(evH, Object.assign({}, r.st, { done: 1 }), R({ mk: 'coo' })).reached, 'hunt：done 之後不會再達標（一人一次）');
  const evC = Object.assign({}, base, { type: 'classwar', per: 3, mk: 'coo' });
  let st = undefined, hits = 0;
  for (let i = 0; i < 6; i++) { const q = E.applyRun(evC, st, R({ mk: 'coo' })); st = q.st; if (q.reached) hits++; }
  ok(hits === 1 && st.n === 6, 'classwar：打 6 隻，達到 per＝3 的那一場只回報一次達標');

  /* 榜單文字、排名 */
  const top10 = n => Array.from({ length: n }, (_, i) => ({ id: 'o' + i, cls: '502', seat: i, nick: '甲', s: 60 - i * 2 }));
  const cb = E.composeBoard(evI, top10(10), { s: 30, base: 30, best: 21, n: 3 }, 'me');
  ok(!cb.inTop && cb.rows.length === 10 && cb.last === 42 && cb.text === '再快 4 秒就上榜', 'improve 榜外：「再快 4 秒就上榜」（要進步到 43%：30×(1-0.425)＝17.25 秒，還差 3.75 → 4 秒；分數都在合理範圍 ≤60% 內）：' + cb.text);
  ok(!/第|名/.test(cb.text), '榜外文字不寫第幾名');
  const cb2 = E.composeBoard(evK, top10(10).map((x, i) => Object.assign(x, { s: 10 + i })).reverse(), { s: 2, n: 2 }, 'me');
  ok(cb2.text === '再打 9 隻就上榜', 'kills 榜外：10 名最少 10 隻、我 2 隻 → 「再打 9 隻就上榜」（要比第 10 名多才算）：' + cb2.text);
  const cb3 = E.composeBoard(evF, top10(10).map((x, i) => Object.assign(x, { s: 13 + i * 0.5 })), { s: 21, best: 21, n: 3 }, 'me');
  ok(cb3.text === '再快 4 秒就上榜', 'fastest 榜外：第 10 名 17.5 秒、我 21 秒，要快到 17.4 以下，差 3.6 → 「再快 4 秒就上榜」（都不低於泡泡蛙的合理下限 13 秒）：' + cb3.text);
  const accS = [100, 100, 99, 99, 99, 98, 98, 98, 97, 97];
  const cb4 = E.composeBoard(evA, top10(10).map((x, i) => Object.assign(x, { s: accS[i] })), { s: 95, n: 3 }, 'me');
  ok(cb4.text === '再準 3% 就上榜', 'acc 榜外：第 10 名 97%、我 95% → 「再準 3% 就上榜」（要嚴格比第 10 名高）：' + cb4.text);
  ok(E.gapText(evI, { n: 1 }, 50) === '再打 1 場就有分數' && E.gapText(evA, { n: 1 }, 50) === '再打 2 場就有分數' && /打倒一隻/.test(E.gapText(evK, undefined, null)), '還沒有分數：寫還要打幾場');
  const cb5 = E.composeBoard(evK, [{ id: 'a', s: 5 }, { id: 'b', s: 2 }], { s: 3, n: 3 }, 'me');
  ok(cb5.inTop && cb5.rows.map(x => x.id).join() === 'a,me,b' && cb5.text === '', '榜單不滿 10 人：自己有分數就在榜上，照分數排進去');
  const cb6 = E.composeBoard(evF, [{ id: 'a', s: 20 }, { id: 'b', s: 25 }], { s: 22, n: 1 }, 'me');
  ok(cb6.rows.map(x => x.id).join() === 'a,me,b', 'fastest 排序：小的在前，22 秒排在 20 與 25 之間');
  const cb7 = E.composeBoard(evK, [{ id: 'me', s: 3 }, { id: 'a', s: 5 }], { s: 4, n: 4 }, 'me');
  ok(cb7.rows.find(x => x.mine).s === 4, '本機分數比雲端新（還沒存上去）：用本機的');

  /* 同年級排名 */
  const gl = [{ cls: '五年級1班', pct: 100 }, { cls: '五年級2班', pct: 80 }, { cls: '五年級3班', pct: 50 }, { cls: '五年級4班', pct: 60 }, { cls: '五年級5班', pct: 20 }];
  const gt = E.gradeTop(gl, '五年級3班');
  ok(gt.map(x => x.cls).join() === '501,502,504' && !gt.some(x => x.mine), 'gradeTop：只列前 3、用短碼、自己不在前 3 就沒有自己（也沒有名次）、不列最後一名');
  ok(E.gradeTop(gl.slice(0, 2), '五年級1班').length === 1 && E.gradeTop(gl.slice(0, 1), '五年級1班').length === 0, 'gradeTop：只有 2 班只列第 1 名（不列最後一名）；只有 1 班不排名');
  ok(E.gradeTop(gl, '五年級2班').find(x => x.cls === '502').mine, 'gradeTop：自己在前 3 會標 mine');
  ok(E.classReached({ goalPct: 60 }, 3, 5) && !E.classReached({ goalPct: 60 }, 2, 5) && !E.classReached({ goalPct: 60 }, 0, 0), 'classReached：3/5＝60% 達標、2/5 不達標、人數 0 不達標');

  /* 改名卡 */
  ok(D.ITEM_DEFS.renameCard.name === '改名卡' && D.SHOP_ITEMS.some(x => x.key === 'renameCard' && x.price === 300), 'ITEM_DEFS／SHOP_ITEMS：改名卡 300（商店開張時用）');

  /* 預設值與範本 */
  ok(D.EVENT_DEFAULTS.classwar.per === 3 && D.EVENT_DEFAULTS.classwar.goalPct > 0 && D.EVENT_DEFAULTS.days === 14, 'EVENT_DEFAULTS：每人 3 隻、兩週');
  const tpl = D.EVENT_TEMPLATES.map(t => E.normalizeEvent('t_' + t.id, Object.assign({ startAt: 1, endAt: 2 }, t.fields)));
  ok(D.EVENT_TEMPLATES.length === 6 && tpl.every(Boolean), 'EVENT_TEMPLATES：6 個範本全部是合法活動：' + D.EVENT_TEMPLATES.map(t => t.name).join('、'));
  ok(Object.keys(D.FASTEST_FLOOR).every(k => D.MONSTERS[k] && D.FASTEST_FLOOR[k] > 5) && ['coo', 'frog', 'shroom', 'wolf'].every(k => k in D.FASTEST_FLOOR), 'FASTEST_FLOOR：每隻開放的魔物都有下限');

  const b = await chromium.launch();

  /* ── 時間窗、班級、有效場 ── */
  {
    const ev = (o) => evDoc(o);
    const seed = {
      'mg_events/k_act': ev({}),
      'mg_events/k_future': ev({ startAt: now + HOUR, endAt: now + 2 * HOUR }),
      'mg_events/k_grace': ev({ startAt: now - 2 * HOUR, endAt: now - 3 * MIN }),
      'mg_events/k_late': ev({ startAt: now - 2 * HOUR, endAt: now - 6 * MIN }),
      'mg_events/k_cls4': ev({ cls: ['五年級4班'] }),
      'mg_events/k_cls3': ev({ cls: ['五年級4班', CLS] }),
      'mg_events/k_ancient': ev({ startAt: now - 30 * DAY, endAt: now - 8 * DAY }),
      'mg_events/bad.id': ev({}), 'mg_events/k_badtype': { type: 'zzz', endAt: now + DAY }
    };
    const p = await open(b, { seed });
    const ids = await p.evaluate(() => window.__NWG.events.list().map(e => e.id).sort());
    ok(!ids.includes('k_ancient'), '只讀結束不到 7 天的活動（where endAt >= 伺服器時間 - 7 天）');
    ok(!ids.includes('bad.id') && !ids.includes('k_badtype'), '壞活動（ID 有點、不認得的 type）被丟掉');
    const gp = await p.evaluate(() => { const g = window.__NWG.events.groups(); return { a: g.active.map(e => e.id).sort(), s: g.soon.map(e => e.id), e: g.ended.map(e => e.id).sort() }; });
    ok(gp.a.join() === 'k_act,k_cls3' && gp.s.join() === 'k_future' && gp.e.join() === 'k_grace,k_late', '分「進行中」「快開始」「剛結束」，班級不含自己班的（k_cls4）不顯示：' + JSON.stringify(gp));
    /* 不指定 t0：當成剛開打 → 結束後才開打的活動不算 */
    await run(p, { mk: 'frog' });
    let n = await nwLocal(p);
    ok(n.ev.k_act && n.ev.k_act.n === 1 && n.ev.k_cls3.n === 1, '進行中的活動、班級有我的活動：算 1');
    ok(!n.ev.k_future && !n.ev.k_late && !n.ev.k_cls4 && !n.ev.k_grace, '開始前、結束超過 5 分鐘、別班、結束後才開打：都不算');
    await run(p, { mk: 'frog', t0Off: -4 * MIN });
    n = await nwLocal(p);
    ok(n.ev.k_grace && n.ev.k_grace.n === 1, '5 分鐘緩衝：在結束前 1 分鐘開打、結束後 3 分鐘打完，照算');
    ok(!n.ev.k_late, '結束後 6 分鐘才打完的（超過緩衝）還是不算');
    ok(!n.ev.k_future, '還沒開始的活動，t0 設在開始前也不算（打完時還沒開始）');
    await run(p, { mk: 'frog', valid: false });
    await run(p, { mk: 'frog', result: 'fail' });
    await run(p, { mk: 'frog', result: 'retreat', valid: true });
    n = await nwLocal(p);
    ok(n.ev.k_act.n === 2, '無效場（valid=false）、沒打贏（fail、retreat）都不算，k_act 還是 2：' + n.ev.k_act.n);
    await p.waitForTimeout(1200);
    const cloud = (await FS(p, 'mg_scores/' + ID));
    ok(cloud.nw.ev.k_act.n === 2 && cloud.nw.ev.k_act.e === now + 3 * DAY, '個人進度存在雲端 nw.ev.{ID}：n、e（結束時間）');
    ok(!(await p.evaluate(() => window.__WRITES.some(w => w.path.startsWith('mg_events')))), '學生端沒有寫過 mg_events');
    /* 60 秒快取 */
    const reads = () => p.evaluate(() => window.__READS.filter(r => r.path.startsWith('mg_events')).length);
    const r0 = await reads();
    await p.evaluate(() => window.__NWG.events.load()); await p.evaluate(() => window.__NWG.events.load());
    ok((await reads()) === r0, '60 秒內不重讀 mg_events（進村讀一次，之後走快取）');
    await p.evaluate(() => window.__NWG.events.load(true));
    ok((await reads()) === r0 + 1, '強制重讀才會再讀');
    noErr(p); await p.close();
  }

  /* ── boost：加倍乘到這場、結果畫面寫出來 ── */
  {
    const p = await open(b, { seed: { 'mg_events/b1': evDoc({ type: 'boost', mul: 2, what: 'exp' }), 'mg_events/b2': evDoc({ type: 'boost', mul: 1.5, what: 'coins' }), 'mg_events/b3': evDoc({ type: 'boost', mul: 2, what: 'exp', endAt: now - 20 * MIN }) } });
    const lv = D.regionLv('grass', 1);
    const sum = await run(p, { mk: 'coo' });
    ok(sum.exp === D.huntExp(lv, true) * 2, `經驗 ×2：${sum.exp} ＝ ${D.huntExp(lv, true)} × 2（過期的 b3 不算、b1 b2 不互相疊）`);
    ok(sum.coins === Math.round(D.huntCoins(lv, true) * 1.5), `字元 ×1.5：${sum.coins}`);
    const sumFail = await run(p, { mk: 'coo', result: 'fail', secs: 60 });
    ok(sumFail.exp === D.huntExp(lv, false) && sumFail.coins === D.huntCoins(lv, false), '沒打贏不加倍');
    await p.evaluate(() => { window.__NWG.afterHunt({ rk: 'grass', mk: 'coo', star: 1, result: 'win', secs: 20, accuracy: 0.9, answered: 10, dodgeOk: 0, dodgeAll: 0, defOk: 0, defAll: 0, maxCombo: 3, flags: 0, valid: true, lvAcc: true }); });
    await p.waitForSelector('#nw-result');
    const txt = await p.textContent('#nw-result');
    ok(/🎪 活動加倍 ×2（獵人經驗）、×1.5（字元）/.test(txt), '結果畫面寫「🎪 活動加倍 ×2」：' + (txt.match(/🎪[^\n]*?字元）/) || [''])[0]);
    await p.click('#nw-result [data-close]'); await p.waitForTimeout(300);
    noErr(p); await p.close();
  }
  {
    const p = await open(b, {});
    const sum = await run(p, { mk: 'coo' });
    ok(!sum.boost.text && sum.exp === D.huntExp(D.regionLv('grass', 1), true), '沒有活動：不加倍、結果畫面沒有「活動加倍」');
    await p.close();
  }

  /* ── hunt：達標發一次 ── */
  {
    const p = await open(b, { seed: { 'mg_events/h1': evDoc({ type: 'hunt', mk: 'coo', goal: 3, items: [{ type: 'coins', n: 50 }] }), 'mg_events/h2': evDoc({ type: 'hunt', mk: 'coo', minStar: 2, goal: 1, items: [{ type: 'potion', n: 2 }] }), 'mg_events/h3': evDoc({ type: 'hunt', mk: 'coo', goal: 1, items: [{ type: 'zzz', n: 1 }] }) } });
    const c0 = (await nwLocal(p)).coins;
    await run(p, { mk: 'frog' });
    ok(!(await nwLocal(p)).ev.h1, 'hunt：打別種魔物不算');
    let s = await run(p, { mk: 'coo' }); s = await run(p, { mk: 'coo' });
    ok(s.evGifts.length === 0 && (await nwLocal(p)).ev.h1.n === 2, '打到第 2 隻：還沒達標、沒有禮物');
    const s3 = await run(p, { mk: 'coo' });
    const n3 = await nwLocal(p);
    ok(s3.evGifts.length === 1 && s3.evGifts[0].title === '字元 ×50' && /達標/.test(s3.evGifts[0].note), 'hunt：打到第 3 隻達標，禮物是字元 ×50（showGift 的資料）');
    ok(n3.ev.h1.done === 1 && n3.coins === c0 + 4 * D.huntCoins(D.regionLv('grass', 1), true) + 50, 'hunt：done＝1，字元只多 50（4 場的獵人字元另計）：' + (n3.coins - c0));
    const s4 = await run(p, { mk: 'coo' }); const n4 = await nwLocal(p);
    ok(s4.evGifts.length === 0 && n4.ev.h1.n === 4 && n4.coins === n3.coins + D.huntCoins(D.regionLv('grass', 1), true), 'hunt：之後再打只加 n，不會再發一次（一人一次）');
    ok(!n4.ev.h2 && (n4.items.potion || 0) === 3, 'hunt minStar 2：打 ★1 不算、沒發藥水');
    await run(p, { mk: 'coo', star: 2 });
    const n5 = await nwLocal(p);
    ok(n5.ev.h2 && n5.ev.h2.done === 1 && n5.items.potion === 5, 'hunt minStar 2：打 ★2 算，回復藥 +2');
    ok(n5.ev.h3 && !n5.ev.h3.done, '獎勵含這版不認得的東西：不發也不標達標（更新後還領得到）');
    noErr(p); await p.close();
  }

  /* ── classwar：全班獎門檻、只領一次、至少打 1 隻 ── */
  {
    const k = (id, seats) => seats.map(s => mkScore(CLS, s, { nwEvDone: [`${id}|${CLS}`], nw: { ev: {} } }));
    const others6 = [6, 7, 8, 9, 10].map(s => mkScore(CLS, s));
    const doneCW = [6, 7, 8, 9].map(s => mkScore(CLS, s, { nwEvDone: ['CW|' + CLS, ...(s <= 8 ? ['CW2|' + CLS] : [])] }));
    const seed = Object.assign(seedOf([...doneCW, mkScore(CLS, 10)]), {
      'mg_events/CW': evDoc({ type: 'classwar', per: 2, goalPct: 60, mk: 'coo', items: [{ type: 'coins', n: 100 }], title: '全班打咕咕鳥' }),
      'mg_events/CW2': evDoc({ type: 'classwar', per: 2, goalPct: 80, mk: 'coo', items: [{ type: 'coins', n: 70 }] })
    });
    const p = await open(b, { seed, nw: { tm: { m_dodge: 1, m_defend: 1, m_attack: 1 } } });
    const check = async () => { await p.evaluate(() => { window.__chk = window.__NWG.eventsCheck(); }); await p.waitForTimeout(300); await dismissGifts(p); await p.evaluate(() => window.__chk); };
    const forceP = () => p.evaluate(async () => { for (const id of ['CW', 'CW2']) await window.__NWG.events.classProgress(window.__NWG.events.byId(id), true); });
    await forceP(); await check();
    const c0 = (await nwLocal(p)).coins;
    ok(c0 === (await nwLocal(p)).coins && !(await p.$('#nw-gift')), '全班已達標但我一隻都沒打：沒有獎勵');
    await run(p, { mk: 'coo' });
    let n = await nwLocal(p);
    ok(n.ev.CW.n === 1 && !n.evDone.includes('CW|' + CLS), '打 1 隻（per＝2）：還沒達標，nwEvDone 沒有我');
    await run(p, { mk: 'coo' }); n = await nwLocal(p);
    ok(n.evDone.includes('CW|' + CLS) && n.evDone.includes('CW2|' + CLS) && n.evDone.filter(x => x === 'CW|' + CLS).length === 1, 'per 打到：nwEvDone 加 「ID|班級」（只加一次）：' + JSON.stringify(n.evDone));
    await p.waitForTimeout(1300);
    const cl = await FS(p, 'mg_scores/' + ID);
    ok(cl.nwEvDone.includes('CW|' + CLS) && cl.nwCls === CLS, '存檔最外層 nwEvDone、nwCls 寫進雲端');
    const c1 = n.coins;
    await forceP();
    const pr = await p.evaluate(() => window.__NWG.events.classProgress(window.__NWG.events.byId('CW')));
    ok(pr.count === 5 && pr.size === 6 && pr.pct === 83 && pr.reached, `全班進度 CW：分子 ${pr.count}（array-contains 計數）／分母 ${pr.size}（nwCls 計數）＝ ${pr.pct}%，目標 60% 達標`);
    const pr2 = await p.evaluate(() => window.__NWG.events.classProgress(window.__NWG.events.byId('CW2')));
    ok(pr2.count === 4 && pr2.pct === 67 && !pr2.reached, `全班進度 CW2：${pr2.pct}% 未到 80%`);
    await check(); n = await nwLocal(p); 
    ok(n.ev.CW.cw === 1 && n.coins === c1 + 100 && !n.ev.CW2.cw, `CW 達標：領到 100 字元、cw＝1；CW2 還沒到：沒領（${c1} → ${n.coins}）`);
    ok((await FS(p, 'mg_scores/' + ID)).nw.ev.CW.cw === 1, '領的紀錄立刻存到雲端（不等延遲）');
    await check(); await check(); n = await nwLocal(p);
    ok(n.coins === c1 + 100, '再檢查幾次：只領一次');
    await p.evaluate(() => { for (const s of [9, 10]) { const d = window.__FS[`mg_scores/五年級3班_${s}號`]; d.nwEvDone = [...(d.nwEvDone || []), 'CW2|五年級3班']; } });
    await forceP(); await check(); n = await nwLocal(p);
    ok(n.ev.CW2.cw === 1 && n.coins === c1 + 170, `CW2 全班過 80%：領 70 字元（${n.coins - c1}）`);
    await p.evaluate(() => { window.__NWG.events.classProgress(window.__NWG.events.byId('CW'), true); });
    noErr(p); await p.close();
  }
  {
    /* 同年級前 3：自己不在前 3 不給名次、不列最後一名 */
    const mk5 = (cls, n, done, id) => Array.from({ length: n }, (_, i) => mkScore(cls, 20 + i, { nwEvDone: i < done ? [`G|${cls}`] : [] }));
    const arr = [...mk5('五年級1班', 4, 4), ...mk5('五年級2班', 5, 4), ...mk5('五年級4班', 5, 3), ...mk5('五年級5班', 5, 1), ...[6, 7, 8, 9, 10].map(s => mkScore(CLS, s, { nwEvDone: s <= 8 ? ['G|' + CLS] : [] }))];
    const p = await open(b, { seed: Object.assign(seedOf(arr), { 'mg_events/G': evDoc({ type: 'classwar', per: 1, goalPct: 90, mk: 'coo', items: [] }) }) });
    const pr = await p.evaluate(() => window.__NWG.events.classProgress(window.__NWG.events.byId('G'), true));
    ok(pr.top.map(x => x.cls + ':' + x.pct).join() === '501:100,502:80,504:60', '同年級排名：前 3 名用班級短碼：' + JSON.stringify(pr.top));
    ok(!pr.top.some(x => x.mine) && pr.pct === 50 && !('rank' in pr), '自己班（50%）不在前 3：只回自己的進度，沒有名次欄位');
    ok(!JSON.stringify(pr).includes('505') && !JSON.stringify(pr).includes('20%'), '不列最後一名（505）');
    ok(!JSON.stringify(pr).includes('真名'), '班級進度不含任何學生資料');
    noErr(p); await p.close();
  }

  /* ── ranking：四種指標、榜單、榜外、隱藏暱稱 ── */
  {
    const seed = seedOf([
      ...others('imp', [60, 58, 56, 54, 52, 50, 48, 46, 44, 42], { off: 0 }),
      ...others('kil', [19, 18, 17, 16, 15, 14, 13, 12, 11, 10], { off: 20 }),
      ...others('fas', [13, 13.5, 14, 14.5, 15, 15.5, 16, 16.5, 17, 18], { off: 40 }),
      ...others('acc', [100, 100, 99, 99, 99, 98, 98, 98, 97, 97], { off: 60 }),
      ...[[1, 5, '勇敢的史萊姆'], [2, 2, ''], [3, 1, '閃電咕咕鳥'], [4, 3, '安靜的小龍']].map(([i, s, nick]) => mkScore('六年級1班', i, { name: '陳大華' + i, nwNick: nick, nw: { ev: { kil2: { s, n: s } } } }))
    ]);
    seed['mg_bugboard/六年級1班_4號'] = { hideNick: true, n: 0, score: 0 };
    const E_ = (id, o) => { seed['mg_events/' + id] = evDoc(Object.assign({ metric: 'kills' }, o)); };
    E_('imp', { metric: 'improve', mk: 'frog' }); E_('imp2', { metric: 'improve', mk: 'coo' }); E_('kil', { metric: 'kills', mk: 'frog' }); E_('kil2', { metric: 'kills', mk: 'frog' });
    E_('fas', { metric: 'fastest', mk: 'frog' }); E_('acc', { metric: 'acc', minRuns: 3, mk: 'frog' });
    const p = await open(b, { seed, nw: { fastMk: { 'frog:1': 30 } } });
    let s1 = await run(p, { mk: 'frog', secs: 24, accuracy: 0.9 });
    let n = await nwLocal(p);
    ok(n.ev.imp.base === 30 && n.ev.imp.s === undefined, '進步獎（有舊紀錄 30 秒）：打 1 場沒有分數、base＝活動前紀錄 30');
    ok(n.ev.kil.s === 1 && n.ev.fas.s === 24 && n.ev.acc.s === undefined, '第 1 場後：討伐王 s＝1、最快 24 秒、神準手還沒有分數（要 3 場）');
    await run(p, { mk: 'frog', secs: 21, accuracy: 0.95 }); await run(p, { mk: 'frog', secs: 22, accuracy: 1 });
    n = await nwLocal(p);
    ok(n.ev.imp.s === 30 && n.ev.imp.best === 21 && n.ev.imp.base === 30 && n.ev.imp.n === 3, `進步獎：(30-21)/30＝30%：${JSON.stringify(n.ev.imp)}`);
    ok(n.ev.kil.s === 3 && n.ev.fas.s === 21 && n.ev.acc.s === 95, '討伐王 3 隻、最快 21 秒、神準手 95%');
    ok(n.fastMk['frog:1'] === 21, '自己最快紀錄 fastMk 在活動算完之後才更新（base 不會被這次打破的紀錄污染）');
    await run(p, { mk: 'coo', secs: 20 }); await run(p, { mk: 'coo', secs: 16 });
    n = await nwLocal(p);
    ok(n.ev.imp2.base === 20 && n.ev.imp2.s === 20, '進步獎沒有舊紀錄：第一場 20 秒當 base，第二場 16 秒 → 20%');
    await p.waitForTimeout(1300);
    ok((await FS(p, 'mg_scores/' + ID)).nw.ev.imp.s === 30, '分數存在 nw.ev.{ID}.s（榜單 orderBy 的欄位）');
    const bd = id => p.evaluate(async id => { const e = window.__NWG.events; const v = await e.eventBoard(e.byId(id), true); return JSON.parse(JSON.stringify(v)); }, id);
    let v = await bd('imp');
    ok(v.rows.length === 10 && v.rows[0].s === 60 && v.rows[9].s === 42 && !v.inTop && v.text === '再快 4 秒就上榜', '進步獎榜：前 10 名由高到低；我 30% 在榜外 → 「' + v.text + '」');
    ok(!v.rows.some(r => r.mine) && !/第\s*\d+\s*名/.test(v.text), '榜外不放自己、不寫第幾名');
    ok(v.rows[0].label === '502・10號・勇敢的獵人', '顯示「班級短碼・座號號・暱稱」：' + v.rows[0].label);
    v = await bd('kil');
    ok(v.rows[0].s === 19 && !v.inTop && v.text === '再打 8 隻就上榜', `討伐王榜外：${v.text}（第 10 名 10 隻、我 3 隻）`);
    v = await bd('fas');
    ok(v.rows[0].s === 13 && v.rows[9].s === 18 && v.text === '再快 4 秒就上榜', `最快討伐 asc 排序：前 10 由小到大；${v.text}（第 10 名 18 秒、我 21 秒）`);
    v = await bd('acc');
    ok(v.rows[0].s === 100 && v.text === '再準 3% 就上榜', `神準手榜外：${v.text}（第 10 名 97%、我 95%）`);
    v = await bd('kil2');
    ok(v.rows.length === 5 && v.inTop && v.rows.map(r => r.s).join() === '5,3,3,2,1' && v.rows.filter(r => r.mine).length === 1, '榜單不滿 10 人：自己（3 隻）排進去：' + v.rows.map(r => r.label).join(' / '));
    const labs = v.rows.map(r => r.label).join('|');
    ok(labs.includes('601・1號・勇敢的史萊姆') && labs.includes('601・2號・神秘獵人') && labs.includes('601・4號・神秘獵人') && labs.includes('601・3號・閃電咕咕鳥'), '沒取暱稱、被老師隱藏（hideNick）的顯示「神秘獵人」，其他顯示暱稱');
    ok(!/陳大華|真名|小明/.test(JSON.stringify(v)), '榜單資料裡沒有任何真名（含自己的）');
    ok(v.rows.find(r => r.mine).label.startsWith('503・5號・'), '自己這一列也是短碼・座號・暱稱：' + v.rows.find(r => r.mine).label);
    const reads = await p.evaluate(() => window.__READS.filter(r => r.path.startsWith('mg_bugboard')).length);
    ok(reads >= 1, '隱藏暱稱讀 mg_bugboard（用 in 一次讀這幾個人）');
    const rBefore = await p.evaluate(() => window.__READS.length);
    await p.evaluate(async () => { const e = window.__NWG.events; await e.eventBoard(e.byId('kil')); });
    ok((await p.evaluate(() => window.__READS.length)) === rBefore, '榜單 60 秒內走快取，不重讀');
    const pg = await p.evaluate(() => window.__NWG.events.eventProgress(window.__NWG.events.byId('kil')));
    ok(pg.n === 3 && pg.s === 3 && pg.text === '3 隻', 'eventProgress 回自己的 n、s 與文字：' + JSON.stringify(pg));
    noErr(p); await p.close();
  }

  /* ── 30 天清除、活動取消 ── */
  {
    const nw = { ev: { OLD: { n: 1, e: now - 31 * DAY, t: '很舊的' }, FAR: { n: 1, e: now - 20 * DAY, t: '二十天前' }, GONE: { n: 2, e: now - 2 * DAY, t: '被刪的活動' }, LIVE: { n: 1, e: now + DAY, t: '還在的' } }, evDone: ['OLD|' + CLS, 'LIVE|' + CLS] };
    const p = await open(b, { nw, seed: { 'mg_events/LIVE': evDoc({ type: 'classwar', per: 3, mk: 'coo' }) } });
    const n = await nwLocal(p);
    ok(!n.ev.OLD && !n.evDone.includes('OLD|' + CLS) && n.evDone.includes('LIVE|' + CLS), '結束超過 30 天的紀錄刪掉（連 nwEvDone 的那筆）');
    ok(n.ev.FAR && !n.ev.FAR.gone, '結束 20 天（超出 7 天窗口）：保留，也不會被當成取消');
    ok(n.ev.GONE && n.ev.GONE.gone === 1 && !n.ev.LIVE.gone, '讀得到的活動沒事；自己有紀錄卻讀不到的 → 標 gone');
    ok((await p.textContent('#toast-body')) === '「被刪的活動」這個活動取消了', '進村提示一次：「被刪的活動」這個活動取消了');
    ok((await p.evaluate(() => window.__NWG.events.sweep())).length === 0, '第二次不會再提示');
    await run(p, { mk: 'coo' });
    ok((await nwLocal(p)).ev.GONE.n === 2, '被取消的活動不會再累計');
    noErr(p); await p.close();
  }

  await b.close(); process.exit(fails ? 1 : 0);
})();
