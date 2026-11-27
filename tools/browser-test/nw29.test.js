/* 平衡 V2 第 9 步：流派（SPEC-BALANCE-V2 §3、§7 第 9 步；編號 nw23）。守護流（擋下重壓／舉盾擋下單線 → 反擊魔物最大血量 5%；真閃避不反擊）、藤蔓流（全對種藤蔓、每根每 10 秒 0.5%）、
   §3.4 防掛機（最近 40 秒內逐字打對才有效、流派傷害 ≤ 打字傷害、逃走時流派只算一半）、出發前選打法、教學大樓第 4 堂、結算提示、人物卡。旗標關（__NW_V2__=false）一律不生效。
   假時鐘：把 performance.now 加上 window.__tOff（毫秒）。戰鬥狀態用 localhost 專用的 window.__NWB。 */
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

const goHunt = async (p, region, mon, star) => {
  await p.click('.vb[data-bld="board"]'); await p.waitForSelector('#nwbd-board');
  await p.click(`.qs[data-q="${region}:${mon}:${star || 1}"]`);
  await p.click('[data-go]'); await p.waitForSelector('[data-view="room"]');
  await p.click('[data-act="startroom"]'); await p.waitForTimeout(80);
};
const qText = p => p.$$eval('#nwb-q .zy-han', els => els.map(e => e.textContent).join(''));
async function answer(p, n = 1) { for (let i = 0; i < n; i++) { await p.fill('#nwb-in', await qText(p)); await p.waitForTimeout(480); await p.press('#nwb-in', 'Enter'); await p.waitForTimeout(80); } }
const jump = (p, sec) => p.evaluate(s => { window.__tOff = s * 1000; }, sec);
const runsOf = p => p.evaluate(() => Object.entries(window.__FS).filter(([k]) => k.startsWith('mg_nw_runs/')).map(([k, v]) => v));
const coins = p => p.evaluate(() => window.__NWG.nw.coins);
const exp = p => p.evaluate(() => window.__NWG.nw.hrExp + (window.__NWG.nw.hr - 1) * 1000);
const fails0 = p => p.evaluate(() => window.__NWG.nw.stat.fails);
/* 出發：這個版本的 goHunt 在按「出發」之前先設好出招（__NW_ATTACKS__／__NW_PATTERN__），而且不自己出招（nextCast 推到很遠），由測試手動排 */
const room = async (p, region, mon, star) => {
  await p.click('.vb[data-bld="board"]'); await p.waitForSelector('#nwbd-board');
  await p.click(`.qs[data-q="${region}:${mon}:${star || 1}"]`);
  await p.click('[data-go]'); await p.waitForSelector('[data-view="room"]');
};
const start = async (p, attacks) => {
  await p.evaluate(a => { window.__NW_ATTACKS__ = a; window.__NW_PATTERN__ = a.length ? a[0] : null; }, attacks || []);
  await p.click('[data-act="startroom"]'); await p.waitForFunction(() => window.__NWB, null, { timeout: 8000 }); await p.waitForTimeout(150);
  await p.evaluate(() => { window.__NWB.S.nextCast = 1e9; });   // 魔物不自己出招
};
const S = (p, f) => p.evaluate(`(() => { const S = window.__NWB.S; return (${f})(S); })()`);
/* 排一招：kind＝'slam'／'single'；lane＝單線打在哪一條（預設不是我站的那條）。回傳之前先讓它進入預警 */
const cast = async (p, kind, laneMode) => {
  await p.evaluate(k => { window.__NW_PATTERN__ = k; const S = window.__NWB.S; S.nextCast = 0; }, kind);
  await p.waitForFunction(() => window.__NWB.S.cast, null, { timeout: 5000 });
  await p.evaluate(m => { const S = window.__NWB.S; S.nextCast = 1e9; if (S.cast.strikes.length === 1 && !S.cast.strikes[0].slam) S.cast.strikes[0].lane = m === 'same' ? S.lane : (S.lane + 1) % 3; }, laneMode || 'other');
};
const nowOff = (p, to) => p.evaluate(t => { window.__tOff += (t - performance.now() / 1000) * 1000; }, to);
const toWarn = p => p.evaluate(() => { const c = window.__NWB.S.cast, w = Math.min(...c.strikes.map(x => x.warn)); window.__tOff += (w - performance.now() / 1000 + 0.15) * 1000; });
const toHit = p => p.evaluate(() => { const c = window.__NWB.S.cast; window.__tOff += (c.hitAt - performance.now() / 1000 + 0.2) * 1000; });
const settle = async p => { await p.waitForFunction(() => !window.__NWB.S.cast, null, { timeout: 5000 }); await p.waitForTimeout(100); };
const near = p => p.evaluate(() => { const c = window.__NWB.S.cast; window.__tOff += (c.hitAt - 0.5 - performance.now() / 1000) * 1000; });
/* 預警 → 出手前 0.5 秒（舉盾要在這時按，盾才罩得到出手）→ 出手。how＝'alt' 就按一下 Alt（盾 1.5 秒，守護流 2.0 秒） */
const block = async (p, how) => { await toWarn(p); await p.waitForTimeout(150); await near(p); await p.waitForTimeout(100); if (how === 'alt') { await p.keyboard.down('Alt'); await p.keyboard.up('Alt'); } await toHit(p); await settle(p); };
/* 打 n 題，每題打完把魔物補滿血（長題的詠唱會一下打死，結束了就不能繼續測）；傷害統計照記 */
const ans = async (p, n = 1) => { for (let i = 0; i < n; i++) { await answer(p, 1); await p.evaluate(() => { const S = window.__NWB.S; if (!S.over) S.mon.hp = S.mon.max; }); } };
const snap = p => S(p, 'S => ({ g: S.guards, f: S.dmgFlow, t: S.dmgType, v: S.vineN, hp: S.mon.hp, max: S.mon.max, over: S.over })');

(async () => {
  const b = await chromium.launch();
  for (const rm of [false, true]) {
    const p = await open(b, { v2: true, nw: { flow: 'guard' } });
    await p.emulateMedia({ reducedMotion: rm ? 'reduce' : 'no-preference' });
    await room(p, 'grass', 'frog', 1); await start(p, ['slam', 'single']);
    await ans(p, 1);
    const s0 = await snap(p);
    await cast(p, 'slam'); await toWarn(p); await p.waitForTimeout(150); await near(p); await p.waitForTimeout(100);
    await p.keyboard.down('Alt'); await p.keyboard.up('Alt'); await toHit(p);
    await p.waitForFunction(() => window.__NWB.S.counters > 0, null, { timeout: 5000 });
    const t = rm ? 'reduced' : 'normal';
    /* 效果剛出現的瞬間：抓一張圖（正常模式才有白閃與抖動） */
    const st = await S(p, 'S => ({ n: S.counters, g: S.guards, f: S.dmgFlow, hs: S.hsUntil || 0, sh: S.mon.shakeUntil || 0, fx: S.fx.map(x => x.kind) })');
    /* 截圖比特效慢：把特效時間倒回 0.09 秒前，截到的是斬擊最清楚的那一刻 */
    await p.evaluate(() => { const S = window.__NWB.S, n = performance.now() / 1000; S.fx.forEach(f => { f.t0 = n - .09; }); S.mon.flashUntil = n + .05; S.hsUntil = 0; });
    await p.waitForTimeout(15);
    await p.screenshot({ path: `${OUT}/counter-${t}.png` });
    ok(st.n === 1 && st.g === 1 && st.f > 0, `[${t}] 守護成功：反擊 1 次、傷害 ${st.f}（數值照舊）`);
    ok(await p.evaluate(() => [...document.querySelectorAll('.nwb2-float')].some(e => e.textContent === '反擊！')), `[${t}] 畫面跳出大字「反擊！」`);
    ok(st.fx.includes('cslash'), `[${t}] 有斬擊特效（${st.fx.join(',')}）`);
    if (rm) ok(st.hs === 0 && st.sh === 0 && !st.fx.includes('cflash'), '減少動態效果：沒有停格、沒有抖動、沒有白閃');
    else ok(st.hs > 0 && st.sh > 0, '一般模式：有停格、魔物抖動（白閃只有 0.12 秒，截圖時多半已淡掉，不斷言）');
    /* 停格不能拖慢輸入：停格期間打字照樣收 */
    await p.fill('#nwb-in', 'ㄅ'); ok(await p.inputValue('#nwb-in') === 'ㄅ', `[${t}] 停格期間輸入框照常收字`);
    const ms = await p.evaluate(() => { const S = window.__NWB.S; return S.hsUntil ? Math.round((S.hsUntil - performance.now() / 1000 - 0) * 1000) : 0; });
    ok(ms <= 120, `[${t}] 停格不超過約 0.1 秒（剩 ${ms}ms）`);
    ok(p.errs.length === 0, `[${t}] 沒有 JS 錯誤 ` + p.errs.join('|'));
    await p.close();
  }
  await b.close();
  console.log(fails ? 'FAIL ' + fails : 'FAIL 0'); process.exit(fails ? 1 : 0);
})();
