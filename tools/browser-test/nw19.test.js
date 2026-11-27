/* 平衡 V2 第 4 步：遙測（docs/SPEC-BALANCE-V2.md §5、§7 第 4 步；編號 nw19）。
   V2 旗標（nw-data.js 的 v2On）開著，mg_nw_runs 才會多寫 frac／flow／guards／vines／dodgeReal／idle／react／t0；關著跟 V2 之前一模一樣。
   win／fail／escape／retreat 四種結果都要寫對、型別符合規則（開 __RULES，假資料庫會照規則擋）；
   真的打一場：frac、idle、react、dodgeReal 由戰鬥算出來。測試用 window.__NW_V2__（只在 localhost 有效）強制開關。 */
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
  const seed = { ['mg_scores/' + ID]: { className: CLS, seat: 5, name: '小明', bestLevel: 10, bestScore: 20, scoreVer: 2, plays: 9, tutorialDone: true, talentIntroDone: true, tier: 'B', balanceVer: 3, punctDone: true,
    nw: Object.assign({ v: 1, savedAt: 5, look: { style: 1, hair: 2, skin: 1 }, starter: 'dagger', hunts: 5, quest: { done: ['1-0', '1-0a'] }, zone: { grass: 5 }, dex: { coo: 1, frog: 1, shroom: 1 }, tm: { m_dodge: 1, m_defend: 1, m_attack: 1 }, intro: { hub: 1, notice: 1 }, seenNotice: NOTICE_ID, nameSet: 1 }, o.nw || {}) } };
  await p.addInitScript(a => {window.__NW_STAGES__ = ['1']; window.__BOARD_ROT__ = false; 
    window.__FS = a.s; window.__RULES = true; window.__NW_LVGATE__ = false; localStorage.clear(); localStorage.setItem('mg_nw_fast', '1');
    window.__NW_CODE_HASH__ = a.hash; localStorage.setItem('mg_nw_code', a.hash); window.__NW_NOGIFT__ = true; window.__NW_NOINTRO__ = true;
    window.confetti = () => {}; window.html2canvas = async () => document.createElement('canvas');
    window.__NW_STAGES__ = ['1', '2b']; if (typeof a.v2 === 'boolean') window.__NW_V2__ = a.v2;
    if (a.pattern) window.__NW_PATTERN__ = a.pattern;
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
const runsOf = p => p.evaluate(() => Object.entries(window.__FS).filter(([k]) => k.startsWith('mg_nw_runs/')).map(([k, v]) => ({ k, v })));
const hunt = (p, res) => p.evaluate(r => { r.t0 = r.t0 || Date.now(); return window.__NWG.finishHunt(r) && true; }, res);
const noNested = v => !Object.values(v).some(x => Array.isArray(x) && x.some(Array.isArray));
const FIELDS = ['frac', 'flow', 'guards', 'vines', 'dodgeReal', 'idle', 'react', 't0'];

const qText = p => p.$$eval('#nwb-q .zy-han', els => els.map(e => e.textContent).join(''));
async function answer(p) { await p.fill('#nwb-in', await qText(p)); await p.waitForTimeout(480); await p.press('#nwb-in', 'Enter'); await p.waitForTimeout(60); }
const goHunt = async (p, region, mon, star) => {
  await p.click('.vb[data-bld="board"]'); await p.waitForSelector('#nwbd-board');
  await p.click(`.qs[data-q="${region}:${mon}:${star || 1}"]`);
  await p.click('[data-go]'); await p.waitForSelector('[data-view="room"]');
  await p.click('[data-act="startroom"]'); await p.waitForTimeout(80);
};

(async () => {
  const D = await import('../../nw-data.js');

  /* ── 純函式：旗標與常數（node 裡沒有 location，v2On 回 false＝預設沒開） ── */
  ok(D.v2On() === true && D.NW_V2.on === true, '沒有瀏覽器環境、OPEN_STAGES 有 2b：V2 預設開著');
  ok((() => { const l = globalThis.location, w = globalThis.window; globalThis.location = { hostname: 'localhost' }; globalThis.window = { __NW_STAGES__: ['1'] }; try { return D.v2On() === false; } finally { if (l === undefined) delete globalThis.location; else globalThis.location = l; if (w === undefined) delete globalThis.window; else globalThis.window = w; } })(), 'localhost 用 __NW_STAGES__ = [\'1\'] 覆寫：V2 關著');
  ok(D.NW_V2.ver === 2.3 && D.NW_V2.uFloor === 300 && D.NW_V2.submitWin === 120 && D.NW_V2.k === 0.4 && D.NW_V2.cap === 600 && D.NW_V2.warnAt === 540 && D.NW_V2.starsPerDay === 2 && D.NW_V2.laneW === 3 && D.NW_V2.dayFull === 4 && D.NW_V2.failBase === 0.3 && D.NW_V2.workEvery === 600 && D.NW_V2.workMax === 2 && D.NW_V2.bonusMat === 1 && D.NW_V2.afkWin === 40 && D.NW_V2.flowCap === 1, 'NW_V2 常數照規格 v2.3 參數表');
  ok(D.OPEN_STAGES.join() === '1,2b,3s', 'OPEN_STAGES＝第 1 段、2b、3s（2a 沒開）');

  const b = await chromium.launch();

  /* ── 旗標關：跟 V2 之前一樣，不多寫任何新欄位 ── */
  {
    const c = await open(b, { v2: false });
    await hunt(c, fakeRes()); await c.waitForTimeout(500);
    const r = await runsOf(c);
    ok(r.length === 1 && FIELDS.every(k => !(k in r[0].v)), '旗標關（2b 開著）：寫了一筆、沒有任何 V2 欄位');
    await c.close();
  }

  /* ── 旗標開：四種結果都寫對 ── */
  const p = await open(b, { v2: true });
  await hunt(p, fakeRes());
  await hunt(p, fakeRes({ over: { result: 'fail', secs: 150, frac: 0.62, fEff: 0.62, live: 140, idle: 10, guards: 0, dodgeReal: 2, react: [900, 1300, -1] } }));
  await hunt(p, fakeRes({ over: { result: 'escape', secs: 600, frac: 0.8, fEff: 0.8, live: 400, idle: 200, dodgeReal: 4, react: [700, 1100, 850, -1, 1900], t0: 1763499900000 } }));
  await hunt(p, fakeRes({ over: { result: 'retreat', secs: 33.3, frac: 0.12, fEff: 0.12, live: 33.3, idle: 0 } }));
  await p.waitForTimeout(800);
  const runs = await runsOf(p), by = x => (runs.find(r => r.v.res === x) || {}).v;
  ok(runs.length === 4 && ['win', 'fail', 'escape', 'retreat'].every(x => by(x)), '四種結果各寫一筆（假資料庫照規則的欄位白名單與範圍擋寫入，寫得進去＝欄位對）：' + runs.map(r => r.v.res).join());
  const w = by('win'), f = by('fail'), e = by('escape'), t = by('retreat');
  ok(w && w.frac === 1 && w.flow === 'normal' && w.guards === 0 && w.vines === 0 && w.dodgeReal === 0 && w.idle === 10 && Array.isArray(w.react) && w.react.length === 0 && w.t0 > 1e12, `win：frac＝1、flow＝normal、次數 0、idle 10、react 空陣列、t0 是毫秒（${w && JSON.stringify({ frac: w.frac, idle: w.idle, t0: w.t0 })}）`);
  ok(f && f.frac === 0.62 && f.idle === 10 && f.dodgeReal === 2 && f.react.join() === '900,1300,-1', 'fail：frac 0.62、dodgeReal 2、react 照抄（-1＝沒按）');
  ok(e && e.res === 'escape' && e.secs === 600 && e.frac === 0.8 && e.idle === 200 && e.dodgeReal === 4 && e.react.length === 5 && e.t0 === 1763499900000, 'escape：res＝escape、secs 600、有 frac（打掉 80%）、idle 200、react 5 筆、t0 照傳入');
  ok(t && t.res === 'retreat' && t.frac === 0.12 && t.secs === 33.3, 'retreat：frac 0.12');
  ok(runs.every(r => typeof r.v.frac === 'number' && r.v.frac >= 0 && r.v.frac <= 1 && typeof r.v.flow === 'string' && r.v.flow.length <= 12 && Number.isInteger(r.v.guards) && Number.isInteger(r.v.vines) && Number.isInteger(r.v.dodgeReal)
    && typeof r.v.idle === 'number' && r.v.idle >= 0 && r.v.idle <= 610 && r.v.react.length <= 40 && r.v.react.every(x => typeof x === 'number') && typeof r.v.t0 === 'number' && r.v.secs <= 610), '每筆型別與範圍都符合規則（frac 0～1、整數次數、idle ≤ 610、react 是數字陣列 ≤ 40）');
  ok(runs.every(r => noNested(r.v) && JSON.stringify(r.v) === JSON.stringify(JSON.parse(JSON.stringify(r.v)))), 'Firestore 限制：沒有陣列裡的陣列、沒有 undefined');
  /* 壞資料：超界的值要被夾回範圍，不會把整筆寫壞 */
  await hunt(p, fakeRes({ over: { frac: 7, idle: 9999, guards: -5, dodgeReal: 1e6, flow: 'x'.repeat(30), react: Array.from({ length: 80 }, () => 999999) } }));
  await p.waitForTimeout(600);
  const bad = (await runsOf(p)).find(r => r.v.flow && r.v.flow.length === 12);
  ok(bad && bad.v.frac === 1 && bad.v.idle <= 610 && bad.v.guards === 0 && bad.v.dodgeReal === 999 && bad.v.react.length === 40 && bad.v.react.every(x => x === 60000), '超界的值夾回範圍、flow 截到 12 字、react 最多 40 筆');
  ok((await p.evaluate(() => window.__NWG.nw.runQ.length)) === 0, '都寫成功：佇列清空');
  await p.close();

  /* ── 真的打一場：撤退（有一次真的躲開）。亂數固定成 0.4：招式落在第 1 條線＝我一開始站的線，預警一出現就站在危險線上 ── */
  {
    const q = await open(b, { v2: true, pattern: 'single' });
    await goHunt(q, 'grass', 'coo', 1);
    await q.evaluate(() => { Math.random = () => 0.4; });
    for (let i = 0; i < 3; i++) await answer(q);
    await q.waitForFunction(() => document.getElementById('nwb-root').dataset.danger === '1', null, { timeout: 30000, polling: 40 });
    await q.waitForTimeout(700);
    await q.keyboard.press('ControlLeft');                       // 出手前換到安全的線
    await q.waitForFunction(() => document.getElementById('nwb-cast').style.display === 'none', null, { timeout: 20000, polling: 50 });
    await q.waitForTimeout(300);
    await q.click('#nwb-quit'); await q.waitForSelector('#nw-result', { timeout: 8000 }); await q.waitForTimeout(800);
    const r = await runsOf(q), v = r[0] && r[0].v;
    ok(r.length === 1 && v.res === 'retreat' && v.dodgeReal === 1 && v.guards === 0 && v.vines === 0, `真打：撤退寫一筆、真的躲開 1 次（${v && v.dodgeReal}）`);
    ok(v && v.react.length === 1 && v.react[0] >= 500 && v.react[0] <= 4000, `真打：react 記到預警後第一次按鍵（${v && v.react} 毫秒）`);
    ok(v && v.frac > 0.1 && v.frac < 0.5 && v.flow === 'normal', `真打：撤退的 frac 是打掉的血比例（3 題 ≈ ${v && v.frac}）`);
    ok(v && v.idle >= 0 && v.idle <= v.secs && v.t0 > 1e12 && v.t0 <= Date.now() + 1000, `真打：idle 在 0 到 secs 之間、t0 是開始的時間（idle ${v && v.idle}／secs ${v && v.secs}）`);
    ok(q.errs.length === 0, '沒有 JS 錯誤 ' + q.errs.join('|'));
    await q.close();
  }

  /* ── 真的打一場：打贏（frac＝1）；咕咕鳥 ★1 約 11 題 ── */
  {
    const q = await open(b, { v2: true });
    await goHunt(q, 'grass', 'coo', 1);
    for (let i = 0; i < 40 && !(await q.$eval('#nwb-in', e => e.disabled).catch(() => true)); i++) await answer(q);
    await q.waitForSelector('#nw-result', { timeout: 8000 }); await q.waitForTimeout(800);
    const r = await runsOf(q), v = r[0] && r[0].v;
    ok(r.length === 1 && v.res === 'win' && v.frac === 1 && v.dodgeReal === 0, `真打：打贏寫 res＝win、frac＝1`);
    ok(v && v.idle >= 0 && v.idle <= 5, `真打：一直在打字，idle 很小（${v && v.idle}）`);
    await q.close();
  }

  await b.close();
  console.log(fails ? `\n${fails} 個失敗` : '\n全部通過'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
