/* 平衡 V2 第 5 步：拿掉層級（同一隻魔物血量、預警、出招節奏不看層級 A～D；血條一開始 100%）。docs/SPEC-BALANCE-V2.md §1.1、§7 第 5 步；編號 nw20。
   旗標關（沒開 2b／__NW_V2__=false）要跟 V2 之前一樣：A 層血量 ×0.35、D 層 ×1.7、預警秒數依層級。測試用 window.__NW_V2__（只在 localhost 有效）強制開關。 */
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
  await p.addInitScript(a => {
    window.__FS = a.s; window.__RULES = true; localStorage.clear(); localStorage.setItem('mg_nw_fast', '1');
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

const goHunt = async (p, region, mon, star) => {
  await p.click('.vb[data-bld="board"]'); await p.waitForSelector('#nwbd-board');
  await p.click(`.qs[data-q="${region}:${mon}:${star || 1}"]`);
  await p.click('[data-go]'); await p.waitForSelector('[data-view="room"]');
  await p.click('[data-act="startroom"]'); await p.waitForTimeout(80);
};
const qText = p => p.$$eval('#nwb-q .zy-han', els => els.map(e => e.textContent).join(''));
const barW = p => p.$eval('#nwb-mhp', e => parseFloat(e.style.width));
/* 打一題對的；回傳這一下打掉了血條的幾 %（推回魔物最大血量＝傷害 ÷ 這個比例） */
async function hit(p) {
  await p.fill('#nwb-in', await qText(p)); await p.waitForTimeout(480); await p.press('#nwb-in', 'Enter'); await p.waitForTimeout(120);
}
/* 從「招式出現」到「紅線預警出現」過了幾秒（＝招式的蓄力時間 − 預警秒數）；也順便記下出招的間隔 */
const castTiming = p => p.evaluate(() => new Promise(res => {
  const root = document.getElementById('nwb-root'), cast = document.getElementById('nwb-cast');
  let tCast = 0, tWarn = 0;
  const poll = () => {
    const t = performance.now() / 1000;
    if (!tCast && cast.style.display === 'block') tCast = t;
    if (tCast && !tWarn && root.dataset.danger) { tWarn = t; return res({ warn: tWarn - tCast }); }
    if (t > 40) return res({ warn: -1 });
    requestAnimationFrame(poll);
  };
  poll();
}));

(async () => {
  const D = await import('../../nw-data.js');
  const TIERS = ['A', 'B', 'C', 'D'];

  /* ── 純函式：血量 ── */
  const hpOf = (mk, lv, on) => TIERS.map(t => D.nwMaxHp(mk, lv, t, 1, on));
  ok([['coo', 1], ['coo', 12], ['frog', 7], ['shroom', 7], ['shroom', 12], ['wolf', 10], ['wolf', 16], ['wolf', 22]].every(([mk, lv]) => new Set(hpOf(mk, lv, true)).size === 1), 'V2：同一隻魔物 A、B、C、D 層血量相同');
  const want = { 'coo,1': 196, 'frog,7': 290, 'coo,12': 289, 'shroom,12': 340, 'wolf,10': 368, 'wolf,16': 437, 'wolf,22': 506 };
  ok(Object.entries(want).every(([k, v]) => { const [mk, lv] = k.split(','); return hpOf(mk, +lv, true).every(h => h === v); }), '血量照規格 §1.1 的表：咕咕鳥★1 196、泡泡蛙★3 290、咕咕鳥★5 289、跳跳菇★5 340、炎牙狼★1／★3／★5 368／437／506');
  ok(hpOf('coo', 1, false).join() === '137,196,274,665', `旗標關：舊的層級倍率照舊（A／B／C／D＝${hpOf('coo', 1, false)}，規格 §1.1 的舊欄 137／196／274／665）`);
  ok(D.nwMaxHp('coo', 1, undefined, 1, true) === 196 && D.nwMaxHp('coo', 1, 'X', 1, true) === 196, 'V2：沒有層級或亂寫的層級也一樣');
  ok(D.nwMaxHp('coo', 1, 'B', 2, true) === Math.round(196 * D.hpPlayersMul(2)) || D.nwMaxHp('coo', 1, 'B', 2, true) === D.monMaxHp('coo', 1, 'B', 2), '人數倍率（組隊）照舊還是乘上去');
  /* ── 預警秒數、節奏 ── */
  ok(TIERS.every(t => D.nwLaneW(t, true) === 3.0) && TIERS.map(t => D.nwLaneW(t, false)).join() === '3,2.5,2.2,2', 'V2：預警一律 3.0 秒；旗標關仍是 A 3.0／B 2.5／C 2.2／D 2.0');
  ok(TIERS.every(t => D.nwTier(t, true) === 'B') && TIERS.every(t => D.nwTier(t, false) === t), 'V2：節奏（castTime、atkInterval 用的層級）一律 B；旗標關照舊');
  ok(TIERS.every(t => D.castTime(10, D.nwTier(t, true)) === D.castTime(10, 'B') && D.atkInterval(10, D.nwTier(t, true), false) === D.atkInterval(10, 'B', false)) && D.castTime(10, 'A') !== D.castTime(10, 'D'), 'V2：蓄力時間與出招間隔四個層級一樣（舊的 A 與 D 本來不一樣）');
  ok(D.HP_TIER.A === 0.35 && D.HP_TIER.D === 1.7 && D.LANE_W.D === 2.0 && D.TIERS.A.slow === 1.5, '舊的 HP_TIER／LANE_W／TIERS 常數原封不動（模擬器還在用）');

  const b = await chromium.launch();

  /* ── 真的打：血條一開始 100%；A 層與 D 層一樣的血量（用第一下的傷害反推） ── */
  const open4 = (v2, tier) => open(b, { v2, tier });
  const [a1, d1, a0, d0] = await Promise.all([open4(true, 'A'), open4(true, 'D'), open4(false, 'A'), open4(false, 'D')]);
  await Promise.all([a1, d1, a0, d0].map(p => goHunt(p, 'grass', 'coo', 1)));
  const [wa1, wd1, wa0, wd0] = await Promise.all([a1, d1, a0, d0].map(barW));
  ok(wa1 === 100 && wd1 === 100, `V2：A 層、D 層血條一開始都是 100%（${wa1}、${wd1}）`);
  ok(Math.abs(wa0 - 137 / 196 * 100) < .5 && Math.abs(wd0 - 665 / 196 * 100) < .5, `旗標關：A 層血條 ${wa0.toFixed(1)}%（137／196）、D 層 ${wd0.toFixed(1)}%（665／196），跟 V2 之前一樣`);
  /* 打一題（雙刀 17 點）：V2 兩層的血條掉一樣多（同一個最大血量 196） */
  await Promise.all([a1, d1].map(hit));
  const [xa, xd] = await Promise.all([a1, d1].map(barW));
  ok(Math.abs(xa - xd) < 1e-9 && Math.abs((100 - xa) * 196 / 100 - 17) < .6, `V2：同一下，A 層、D 層血條掉的一樣多（${(100 - xa).toFixed(2)}%＝${((100 - xa) * 196 / 100).toFixed(1)} 點，最大血量 196）`);

  /* ── 預警秒數：從招式出現到紅線出現（蓄力時間 − 預警）。V2 兩層都是 9 − 3.0 = 6.0 秒；旗標關 A 層 11.25 − 3.0＝8.25、D 層 5.625 − 2.0＝3.6 ── */
  const [ta1, td1, ta0, td0] = await Promise.all([a1, d1, a0, d0].map(castTiming));
  ok(Math.abs(ta1.warn - 6.0) < .5 && Math.abs(td1.warn - 6.0) < .5, `V2：A 層 ${ta1.warn.toFixed(2)} 秒、D 層 ${td1.warn.toFixed(2)} 秒（都是 9.0 − 3.0 ＝ 6.0）`);
  ok(Math.abs(ta0.warn - 8.25) < .5 && Math.abs(td0.warn - 3.6) < .5, `旗標關：A 層 ${ta0.warn.toFixed(2)} 秒（11.25 − 3.0）、D 層 ${td0.warn.toFixed(2)} 秒（5.625 − 2.0），跟 V2 之前一樣`);
  const errs = [a1, d1, a0, d0].flatMap(p => p.errs);
  ok(errs.length === 0, '沒有 JS 錯誤 ' + errs.join('|'));
  await Promise.all([a1, d1, a0, d0].map(p => p.close()));

  await b.close();
  console.log(fails ? `\n${fails} 個失敗` : '\n全部通過'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
