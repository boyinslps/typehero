/* 平衡 V2 第 7 步：獎勵（SPEC-BALANCE-V2 §2.2～§2.4、§7 第 7 步；編號 nw22）。一天（台灣時間日曆日）前 4 場拿完整材料、第 5 場起材料減半（經驗與字元不減）；
   ⚡ 快手：打贏又比標準時間快 → 多 1 個那隻魔物的綠材料（額外的，不影響基本材料）；🔨 勤勞：有在打字的戰鬥時間每累積 10 分鐘 +1 綠材料、一天最多 2 個，
   第 5 場起不再累積；掛著不打字拿不到。旗標關（__NW_V2__=false）不記一天帳、材料不減。 */
const { chromium } = require('playwright'); const fs = require('fs');
const path = require('path'); const M = path.join(__dirname, 'mock') + '/'; const OUT = process.argv[2] || require('os').tmpdir();
const css = require('./tw.js')(OUT);
const NOTICE_ID = /export const NOTICES = \[\s*\{ id: '([^']+)'/.exec(fs.readFileSync(path.join(__dirname, '../../nw-data.js'), 'utf8'))[1];
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const ID = '五年級3班_5號', CLS = '五年級3班';

async function open(browser, o = {}) {
  const p = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const errs = []; p.on('dialog', d => d.accept());
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  const { sha256Hex } = await import('../../nw-access.js');
  const hash = await sha256Hex('Test-Pass_9!x');
  const seed = { ['mg_scores/' + ID]: { className: CLS, seat: 5, name: '小明', bestLevel: 10, bestScore: 20, scoreVer: 2, plays: 9, tutorialDone: true, talentIntroDone: true, tier: o.tier || 'B', balanceVer: 3, punctDone: true,
    nw: Object.assign({ v: 1, savedAt: 5, look: { style: 1, hair: 2, skin: 1 }, starter: 'dagger', hunts: 5, quest: { done: ['1-0', '1-0a'] }, zone: { grass: 5 }, dex: { coo: 1, frog: 1, shroom: 1 }, tm: { m_dodge: 1, m_defend: 1, m_attack: 1 }, intro: { hub: 1, notice: 1 }, seenNotice: NOTICE_ID, nameSet: 1 }, o.nw || {}) } };
  await p.addInitScript(a => {window.__NW_STAGES__ = ['1']; window.__BOARD_ROT__ = false; 
    window.__FS = a.s; window.__RULES = true; window.__NW_LVGATE__ = false; localStorage.clear(); localStorage.setItem('mg_nw_fast', '1');
    window.__NW_CODE_HASH__ = a.hash; localStorage.setItem('mg_nw_code', a.hash); window.__NW_NOGIFT__ = true; window.__NW_NOINTRO__ = true;
    window.confetti = () => {}; window.html2canvas = async () => document.createElement('canvas');
    window.__NW_STAGES__ = ['1', '2b']; if (typeof a.v2 === 'boolean') window.__NW_V2__ = a.v2;
    if (a.pattern) window.__NW_PATTERN__ = a.pattern;
    window.__NW_ATTACKS__ = []; window.__tOff = 0; const _n = performance.now.bind(performance); performance.now = () => _n() + window.__tOff;
  }, { s: seed, hash, v2: o.v2, pattern: o.pattern || null });
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
  return Object.assign({ rk: 'grass', mk: 'coo', star: 3, lv: 6, qb: '6:0', result: 'win', secs: 80, accuracy: 0.96, answered: q.length, ans: q.length, cor, typ: cor + 1, keys: q.reduce((a, x) => a + x[1], 0), nokey: 0, act, cpm: Math.round(cor / act * 600) / 10,
    dodgeOk: 0, dodgeAll: 0, defOk: 0, defAll: 0, maxCombo: 5, flags: { fast: 0, paste: 0, wrong: 1 }, tier: 'B', weapon: 'dagger', wk: 'dagger', atk: 105, pw: 40, valid: true, lvAcc: true, q,
    live: 70, idle: 10, frac: 1, fEff: 1, flow: 'normal', guards: 0, vines: 0, dodgeReal: 0, react: [] }, o.over || {});
};

const hunt = (p, res) => p.evaluate(r => { r.t0 = r.t0 || Date.now(); const s = window.__NWG.finishHunt(r); return JSON.parse(JSON.stringify(s)); }, res);
const mats = p => p.evaluate(() => JSON.parse(JSON.stringify(window.__NWG.nw.mats)));
const rollMax = p => p.evaluate(() => { window.__r0 = Math.random; Math.random = () => 0.999; });   // 掉落都骰到上限，才能精確比較
const qText = p => p.$$eval('#nwb-q .zy-han', els => els.map(e => e.textContent).join(''));
const goHunt = async (p, region, mon, star) => {
  if (!(await p.$('#nwbd-board'))) await p.click('.vb[data-bld="board"]');
  await p.waitForSelector('#nwbd-board');
  await p.click(`.qs[data-q="${region}:${mon}:${star || 1}"]`);
  await p.click('[data-go]'); await p.waitForSelector('[data-view="room"]');
  await p.click('[data-act="startroom"]'); await p.waitForTimeout(80);
};
async function answer(p, n = 1) { for (let i = 0; i < n; i++) { await p.fill('#nwb-in', await qText(p)); await p.waitForTimeout(480); await p.press('#nwb-in', 'Enter'); await p.waitForTimeout(80); } }

(async () => {
  const D = await import('../../nw-data.js');
  const V = D.NW_V2;

  /* ── 純函式 dayStep ── */
  const seq = (d, runs) => { let day = null; return runs.map(o => { const r = D.dayStep(day, d, o); day = r.day; return r; }); };
  const R5 = seq(100, [{ live: 100, fastWin: true }, { live: 100, fastWin: true }, { live: 100, fastWin: true }, { live: 100, fastWin: true }, { live: 100, fastWin: true }, { live: 100, fastWin: true }]);
  ok(R5.map(r => r.full).join() === 'true,true,true,true,false,false', '前 4 場拿完整材料，第 5 場起 full＝false');
  ok(R5.map(r => r.fast).join() === 'true,true,true,true,false,false', '⚡ 只有前 4 場有；第 5 場起沒有（就算贏得很快）');
  const W = seq(100, Array.from({ length: 10 }, () => ({ live: 600, fastWin: false })));
  ok(W.reduce((a, r) => a + r.work, 0) <= 2 && W.reduce((a, r) => a + r.work, 0) === 2, `一天打 10 場、每場 10 分鐘都有在打字：勤勞最多 2 個（拿了 ${W.reduce((a, r) => a + r.work, 0)}）`);
  ok(W.slice(4).every(r => r.work === 0), '第 5 場起不再累積勤勞（「勤勞已滿」）');
  const H = seq(100, [{ live: 40 }, { live: 40 }, { live: 40 }, { live: 40 }]);
  ok(H.every(r => r.work === 0) && H[3].day.ws === 160, '每場只打了一下就掛著（有在打字 40 秒）：4 場加起來 160 秒，勤勞 0');
  const A = seq(100, [{ live: 400 }, { live: 400 }, { live: 400 }]);
  ok(A.map(r => r.work).join() === '0,1,1' && A[1].day.ws === 200 && A[2].day.ws === 0, '勤勞：400＋400＝800 秒 → 拿 1 個、剩 200 秒的零頭；再 400 → 600 → 再拿 1 個，滿 2 個，零頭清掉');
  const N = D.dayStep(A[2].day, 101, { live: 100 });
  ok(N.day.n === 1 && N.day.work === 0 && N.full, '隔天：場數與勤勞歸零（零頭秒數不是整天的帳，會帶著）');
  ok(JSON.stringify(D.dayStep(null, 5, { live: 10 }).day) === JSON.stringify(D.dayStep(undefined, 5, { live: 10 }).day) && D.dayStep('壞', 5, {}).day.n === 1, '沒有存檔的帳、型別壞掉：當作今天第一場');
  const prev = { d: 5, n: 2, work: 0, ws: 10 }, snap = JSON.stringify(prev); D.dayStep(prev, 5, { live: 99 });
  ok(JSON.stringify(prev) === snap, '純函式：不改傳進來的物件');
  ok(D.normalizeNw({ day: { d: 7, n: 3, work: 1, ws: 50 } }).day.n === 3 && D.normalizeNw({ day: 'x' }).day === undefined && D.normalizeNw({ day: { d: 'a' } }).day === undefined && D.normalizeNw({}).day === undefined, 'normalizeNw：好的一天帳保留，壞的丟掉，沒有的不亂加（舊存檔不受影響）');

  const b = await chromium.launch();

  /* ── V2：⚡ 與基本材料；第 5 場減半 ── */
  {
    const p = await open(b, { v2: true });
    await rollMax(p);
    const m0 = await mats(p), c0 = await p.evaluate(() => window.__NWG.nw.coins);
    const s1 = await hunt(p, fakeRes({ over: { secs: 80, live: 70 } }));          // 咕咕鳥★3 標準 171 秒（v2.2 逐場），80 秒打贏 → ⚡
    const m1 = await mats(p), dc1 = (await p.evaluate(() => window.__NWG.nw.coins)) - c0;
    ok(s1.full && s1.bonus.length === 1 && s1.bonus[0].kind === 'fast' && s1.bonus[0].id === 'coo_down' && s1.fastBy === 91, `第 1 場比標準快 91 秒 → ⚡ 多 1 個柔軟絨毛（${JSON.stringify(s1.bonus)}）`);
    ok((m1.coo_feather || 0) - (m0.coo_feather || 0) === 4 && (m1.coo_down || 0) - (m0.coo_down || 0) === 3, `⚡ 是額外的：基本材料照拿（灰 +4、綠 +2）再加 1 ＝ 綠共 +3（灰 +${(m1.coo_feather || 0) - (m0.coo_feather || 0)}、綠 +${(m1.coo_down || 0) - (m0.coo_down || 0)}）`);
    const s2 = await hunt(p, fakeRes({ over: { secs: 200, live: 150 } }));
    ok(s2.bonus.length === 0 && s2.dayN === 2, '第 2 場比標準慢（200 秒＞171）：沒有 ⚡');
    const s3 = await hunt(p, fakeRes({ over: { result: 'escape', secs: 480, live: 100, frac: 0.8, fEff: 0.8 } }));
    ok(s3.bonus.length === 0, '輸／逃走沒有 ⚡（要打贏）');
    const m3 = await mats(p), s4 = await hunt(p, fakeRes({ over: { secs: 80, live: 20 } }));
    const m4 = await mats(p);
    ok(s4.full && s4.dayN === 4 && s4.bonus.length === 1, '第 4 場還是完整、還有 ⚡');
    const cBefore = await p.evaluate(() => window.__NWG.nw.coins), eBefore = await p.evaluate(() => window.__NWG.nw.hrExp + window.__NWG.nw.hr * 1000);
    const s5 = await hunt(p, fakeRes({ over: { secs: 80, live: 480 } }));
    const m5 = await mats(p), dc5 = (await p.evaluate(() => window.__NWG.nw.coins)) - cBefore, de5 = (await p.evaluate(() => window.__NWG.nw.hrExp + window.__NWG.nw.hr * 1000)) - eBefore;
    ok(!s5.full && s5.dayN === 5 && s5.bonus.length === 0, '第 5 場：不是完整、沒有 ⚡（雖然比標準快）、勤勞也不給（雖然整場都有在打字）');
    ok((m5.coo_feather - m4.coo_feather) === 2 && (m5.coo_down - m4.coo_down) === 1, `第 5 場材料減半（灰 4→2、綠 2→1；實際 +${m5.coo_feather - m4.coo_feather}、+${m5.coo_down - m4.coo_down}）`);
    ok(dc5 === dc1 && de5 > 0, `第 5 場字元不減（和第 1 場一樣 +${dc5}；字元出口等老師決定）、經驗照拿（+${de5}）`);
    const s6 = await hunt(p, fakeRes({ over: { secs: 80, live: 480 } }));
    ok(s6.dayN === 6 && !s6.full, '第 6 場：還是減半');
    /* 材料至少 1：減半＋比例很低的場次，每種還是 ≥1 */
    const s7 = await hunt(p, fakeRes({ over: { result: 'retreat', secs: 20, live: 1, frac: 0.02, fEff: 0.02 } }));
    ok(s7.drops.every(d => d.n >= 1), '比例很低的場次，每種材料至少 1 個');
    /* 結算畫面 */
    await p.evaluate(() => window.__NWG.nw.day = undefined);
    await p.evaluate(r => { r.t0 = Date.now(); window.__NWG.afterHunt(r); }, fakeRes({ over: { secs: 80, live: 70 } }));
    await p.waitForSelector('#nw-result');
    const t1 = await p.textContent('#nw-result');
    ok(t1.includes('⚡ 比標準時間快 91 秒！多拿') && t1.includes('柔軟絨毛'), '結算畫面：寫「⚡ 比標準時間快 91 秒！多拿 ■ 柔軟絨毛 ×1」');
    await p.click('[data-close]');
    await p.evaluate(() => { window.__NWG.nw.day = { d: 99999, n: 4, work: 0, ws: 0 }; });
    await p.evaluate(() => { window.__NWG.nw.day.d = Math.floor((Date.now() + 8 * 3600e3) / 86400e3); });
    await p.evaluate(r => { r.t0 = Date.now(); window.__NWG.afterHunt(r); }, fakeRes({ over: { secs: 200, live: 70 } }));
    await p.waitForSelector('#nw-result');
    const t2 = await p.textContent('#nw-result');
    ok(t2.includes('今天已經打了 4 場，材料先變一半') && !t2.includes('可疑'), '第 5 場的結算：寫「今天已經打了 4 場，材料先變一半（經驗照拿）」');
    ok(p.errs.length === 0, '沒有 JS 錯誤 ' + p.errs.join('|'));
    await p.close();
  }

  /* ── V2：換天重算 ── */
  {
    const p = await open(b, { v2: true });
    for (let i = 0; i < 4; i++) await hunt(p, fakeRes({ over: { secs: 200, live: 100 } }));
    const s5 = await hunt(p, fakeRes({ over: { secs: 200, live: 100 } }));
    await p.evaluate(() => { window.__NWG.nw.day.d -= 1; });   // 把帳改成「昨天」
    const s6 = await hunt(p, fakeRes({ over: { secs: 200, live: 100 } }));
    ok(!s5.full && s6.full && s6.dayN === 1, '隔天（台灣時間日曆日）：場數歸零、又是完整材料');
    await p.close();
  }

  /* ── V2：真的掛著不打字 10 分鐘（兩場 8 分鐘逃走）→ 勤勞 0 ── */
  {
    const p = await open(b, { v2: true });
    const m0 = await mats(p);
    for (let k = 0; k < 2; k++) {
      await goHunt(p, 'grass', 'coo', 1);
      await answer(p, 3);
      await p.evaluate(() => { window.__tOff = (window.__tOff || 0) + 601000; });
      await p.waitForSelector('#nw-result', { timeout: 8000 }); await p.waitForTimeout(500);
      await p.click('[data-close]'); await p.waitForTimeout(700);
    }
    const day = await p.evaluate(() => window.__NWG.nw.day);
    ok(day && day.n === 2 && day.work === 0 && day.ws > 60 && day.ws < 140, `掛著不動 2 場（共 20 分鐘）：有在打字只有 ${day && Math.round(day.ws)} 秒，勤勞 0`);
    const m1 = await mats(p);
    ok(Object.keys(m1).every(k => !k.endsWith('_down') || (m1[k] - (m0[k] || 0)) <= 2 * 2), '材料沒有勤勞的額外 1 個');
    await p.close();
  }

  /* ── V2：整場一直有在打字 → 一天最多 2 個勤勞（用真打一場確認有拿到、之後累積） ── */
  {
    const p = await open(b, { v2: true });
    await rollMax(p);
    const r1 = await hunt(p, fakeRes({ over: { result: 'escape', secs: 600, live: 600, frac: 0.7, fEff: 0.7 } }));
    const r2 = await hunt(p, fakeRes({ over: { result: 'escape', secs: 600, live: 600, frac: 0.7, fEff: 0.7 } }));
    const r3 = await hunt(p, fakeRes({ over: { result: 'escape', secs: 600, live: 600, frac: 0.7, fEff: 0.7 } }));
    const r4 = await hunt(p, fakeRes({ over: { result: 'escape', secs: 600, live: 600, frac: 0.7, fEff: 0.7 } }));
    const got = [r1, r2, r3, r4].map(r => r.bonus.filter(x => x.kind === 'work').length);
    ok(got.join() === '1,1,0,0' && (await p.evaluate(() => window.__NWG.nw.day.work)) === 2, `4 場都打滿 10 分鐘：第 1、2 場各拿 1 個勤勞，之後已滿（${got}）`);
    const t = await (async () => { await p.evaluate(r => { r.t0 = Date.now(); window.__NWG.afterHunt(r); }, fakeRes({ over: { result: 'escape', secs: 600, live: 600, frac: 0.7, fEff: 0.7 } })); await p.waitForSelector('#nw-result'); return p.textContent('#nw-result'); })();
    ok(!t.includes('🔨'), '第 5 場的結算沒有勤勞');
    await p.close();
  }

  /* ── v2.3 §2.6：一天最多開 2 個新星級（v2.2 是 1 個） ── */
  {
    const nw0 = { zone: { grass: 1, forest: 0 }, dex: {} }, dd = (d, st) => ({ ...nw0, day: { d, n: 1, work: 0, st, ws: 0 } });
    ok(D.NW_V2.starsPerDay === 2 && D.newStarLocked(dd(7, 2), 'grass', 2, 7, true) === true && D.newStarLocked(dd(7, 1), 'grass', 2, 7, true) === false && D.newStarLocked(dd(7, 2), 'grass', 1, 7, true) === false && D.newStarLocked(dd(6, 2), 'grass', 2, 7, true) === false
      && D.newStarLocked(dd(7, 2), 'grass', 2, 7, false) === false, '純函式：今天開過 2 個新星級 → 新的那一星鎖住；只開過 1 個、已經打贏過的星級、換天、旗標關都不鎖');
    ok(D.dayStep(null, 7, { live: 1, newStar: true }).day.st === 1 && D.dayStep({ d: 7, n: 1, work: 0, st: 1, ws: 0 }, 8, { live: 1 }).day.st === 0, 'dayStep：開新星級記 st，隔天歸零');
    const bq = D.boardQuests(dd(7, 2), 7, true).filter(q => !q.locked);
    ok(bq.filter(q => q.star === 2).every(q => q.wait) && bq.filter(q => q.star === 1).every(q => !q.wait) && D.boardQuests(dd(7, 2), undefined, true).every(q => !q.wait), '委託單：新的一星 wait、已過的 ★1 不 wait；沒給今天就不鎖');
    const p = await open(b, { v2: true, nw: { zone: { grass: 1, forest: 0 } } });
    const s1 = await hunt(p, fakeRes({ over: { star: 1, mk: 'coo', secs: 200, live: 100 } }));
    ok(s1.newStar === false && (await p.evaluate(() => window.__NWG.nw.day.st)) === 0, '重打已經贏過的 ★1：不算開新星級');
    const s2 = await hunt(p, fakeRes({ over: { star: 2, mk: 'coo', secs: 200, live: 100 } }));
    ok(s2.newStar === true && (await p.evaluate(() => window.__NWG.nw.day.st)) === 1 && (await p.evaluate(() => window.__NWG.nw.zone.grass)) === 2, '贏了新的 ★2：開了新星級（今天 1 個）');
    const s3 = await hunt(p, fakeRes({ over: { star: 3, mk: 'coo', secs: 200, live: 100 } }));
    ok(s3.newStar === true && (await p.evaluate(() => window.__NWG.nw.day.st)) === 2, '今天第 2 個新星級（★3）');
    const s4 = await hunt(p, fakeRes({ over: { star: 4, mk: 'coo', result: 'fail', secs: 100, live: 80, frac: 0.3, fEff: 0.3 } }));
    ok(s4.newStar === false && (await p.evaluate(() => window.__NWG.nw.day.st)) === 2, '輸了不算開新星級');
    await p.click('.vb[data-bld="board"]'); await p.waitForSelector('#nwbd-board');
    const t4 = await p.textContent('.qs[data-q="grass:coo:4"]'), t3 = await p.textContent('.qs[data-q="grass:coo:3"]');
    await p.click('.qs[data-q="grass:coo:4"]');
    const dis4 = await p.$eval('[data-go]', e => e.disabled), info4 = await p.textContent('#nwbd-info');
    await p.click('.qs[data-q="grass:coo:3"]');
    const dis3 = await p.$eval('[data-go]', e => e.disabled);
    ok(t4.includes('明天再來') && !t3.includes('明天再來') && dis4 === true && dis3 === false && info4.includes('今天已經開了新的一星'), `委託板：★4 寫「明天再來」、狩獵鈕灰掉（${dis4}）；重打 ★3 照常（${dis3}）`);
    await p.evaluate(() => { window.__NWG.nw.day.d -= 1; });
    const s5 = await hunt(p, fakeRes({ over: { star: 4, mk: 'coo', secs: 200, live: 100 } }));
    ok(s5.newStar === true && (await p.evaluate(() => window.__NWG.nw.day.st)) === 1, '隔天：又可以開新的一星');
    await p.close();
    const q = await open(b, { v2: false, nw: { zone: { grass: 1, forest: 0 } } });
    await hunt(q, fakeRes({ over: { star: 2, mk: 'coo', secs: 200, live: 100 } })); await hunt(q, fakeRes({ over: { star: 3, mk: 'coo', secs: 200, live: 100 } }));
    await q.click('.vb[data-bld="board"]'); await q.waitForSelector('#nwbd-board');
    ok(!(await q.textContent('.qs[data-q="grass:coo:4"]')).includes('明天再來'), '旗標關：不鎖星級');
    await q.close();
  }

  /* ── v2.3 6g：快下課的提示（只提醒、不擋） ── */
  {
    const p = await open(b, { v2: true });
    const bell = async end => { await p.evaluate(e => { window.__NW_CLASS_END__ = e; }, end); await p.click('.vb[data-bld="board"]'); await p.waitForSelector('#nwbd-board'); await p.click('.qs[data-q="grass:coo:1"]'); return p.$eval('#nwbd-bell', e => getComputedStyle(e).display); };
    const near = await bell(Date.now() + 120000);
    ok(near === 'block' && (await p.textContent('#nwbd-bell')).includes('快下課了，這場可能打不完喔！打不完也會照打掉的血給獎勵。') && !(await p.$eval('[data-go]', e => e.disabled)), '剩 2 分鐘：出發按鈕上方出現提示，按鈕沒被擋');
    const far = await (async () => { await p.evaluate(() => { window.__NW_CLASS_END__ = Date.now() + 600000; }); await p.click('.qs[data-q="grass:frog:1"]'); return p.$eval('#nwbd-bell', e => getComputedStyle(e).display); })();
    ok(far === 'none', '剩 10 分鐘：不顯示');
    await p.evaluate(() => { window.__NW_CLASS_END__ = 0; }); await p.click('.qs[data-q="grass:coo:1"]');
    ok((await p.$eval('#nwbd-bell', e => getComputedStyle(e).display)) === 'none', '沒有下課時間的資料：不顯示');
    await p.close();
  }

  /* ── 旗標關：不記一天帳、材料不減、沒有 ⚡／勤勞 ── */
  {
    const p = await open(b, { v2: false });
    await rollMax(p);
    let last, m5;
    for (let i = 0; i < 6; i++) { const m = await mats(p); last = await hunt(p, fakeRes({ over: { secs: 80, live: 480 } })); m5 = ((await mats(p)).coo_feather || 0) - (m.coo_feather || 0); }
    ok(last.bonus === undefined && last.full === undefined && (await p.evaluate(() => window.__NWG.nw.day)) === undefined && m5 === 4, `旗標關：打到第 6 場材料還是完整（灰 +${m5}）、沒有一天帳、沒有 ⚡／勤勞`);
    await p.close();
  }

  await b.close();
  console.log(fails ? `\n${fails} 個失敗` : '\n全部通過'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
