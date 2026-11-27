/* 預設開放階段（2026-11-25：OPEN_STAGES＝['1','2b','3s']、BOARD_ROT 開）：不用任何測試覆寫，看一般學生實際看到什麼。截圖 nw28-village.png、nw28-board.png。 */
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
    window.__tOff = 0; const _n = performance.now.bind(performance); performance.now = () => _n() + window.__tOff;
  }, { s: Object.assign(seed, o.docs || {}), hash });
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



(async () => {
  const b = await chromium.launch();
  const p = await open(b);
  const D = await p.evaluate(async () => { const m = await import('./nw-data.js'); return { stages: m.OPEN_STAGES, v2: m.v2On(), rot: m.boardRotOn(), o2b: m.stageOpen('2b'), o3s: m.stageOpen('3s'), o2a: m.stageOpen('2a') }; });
  ok(D.stages.join() === '1,2b,3s' && D.o2b && D.o3s && !D.o2a && D.v2 && D.rot, '沒有覆寫：開 1、2b、3s，V2 與新委託板開著，2a 沒開');
  await p.waitForSelector('.vb[data-bld="forge"]');
  const lock = k => p.evaluate(k => ((document.querySelector(`[data-bld="${k}"]`) || {}).textContent || '').includes('🔒'), k);
  ok(!(await lock('forge')) && !(await lock('shop')) && (await lock('rank')), '村莊：鐵匠鋪、商店沒有施工中樣式；榮譽碑還是施工中');
  await p.evaluate(() => window.__NWV.teleport('forge')); await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(OUT, 'nw28-village.png') }); await p.click('.vb[data-bld="forge"]'); await p.waitForTimeout(500);
  for (let i = 0; i < 12 && await p.$('#nw-gift'); i++) { await p.evaluate(() => { const g = [...document.querySelectorAll('#nw-gift [data-ok]')].pop(); if (g) g.click(); }); await p.waitForTimeout(300); }
  await p.waitForSelector('#nw-forge', { timeout: 8000 }); ok(true, '鐵匠鋪進得去');
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  await p.evaluate(() => window.__NWV.teleport('shop')); await p.waitForTimeout(250); await p.click('.vb[data-bld="shop"]');
  await p.waitForSelector('#nw-shop', { timeout: 8000 }); ok(true, '商店進得去');
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  ok(!(await p.$('#nw-shop')), '商店用 Esc 關得掉');
  await p.evaluate(() => window.__NWV.teleport('board')); await p.waitForTimeout(250); await p.click('.vb[data-bld="board"]');
  await p.waitForSelector('#nwbd-board'); await p.waitForTimeout(400);
  const prog = await p.textContent('[data-prog]');
  ok(/還剩 \d 張，打完就送來新的一批！/.test(prog) && !prog.includes('完成 '), '看板：進度寫「' + prog + '」');
  ok(!!(await p.$('[data-swap]')), '看板：有「🔄 刷新」按鈕');
  await p.screenshot({ path: path.join(OUT, 'nw28-board.png') });
  ok(p.errs.length === 0, '沒有 JS 錯誤 ' + p.errs.join('|'));
  await b.close();
  console.log(fails ? `\n${fails} 項失敗` : '\n全部通過'); process.exit(fails ? 1 : 0);
})();
