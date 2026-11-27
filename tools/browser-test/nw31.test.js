/* 背包格子（老師 2026-11-27：要像傳統 RPG 的固定方格）。60 格、空格也畫、格子等大、圖示置中、稀有度邊框、穿著標記、
   點格子選取並在下方顯示詳情、排序；手機 390 一列至少 5 格、不橫向捲動。 */
const { chromium } = require('playwright'); const fs = require('fs');
const path = require('path'); const M = path.join(__dirname, 'mock') + '/'; const OUT = process.argv[2] || require('os').tmpdir();
const css = require('./tw.js')(OUT);
const NOTICE_ID = /export const NOTICES = \[\s*\{ id: '([^']+)'/.exec(fs.readFileSync(path.join(__dirname, '../../nw-data.js'), 'utf8'))[1];
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const ID = '五年級3班_5號', CLS = '五年級3班';
const SHOT = n => path.join(OUT, `nw12-${n}.png`);
const BASE_NW = () => ({ v: 1, savedAt: 5, look: { style: 1, hair: 2, skin: 1 }, starter: 'dagger', hunts: 5, coins: 200,
  mats: { coo_feather: 6, shroom_cap: 3, frog_slime: 2, coo_down: 4, frog_skin: 3, wolf_fang: 3, wolf_fur: 4 },
  bp: ['bp_coo_hat', 'bp_flame_dagger', 'bp_dagger'], zone: { grass: 3 }, dex: { coo: 1, frog: 1, shroom: 1 },
  tm: { m_dodge: 1, m_defend: 1, m_attack: 1 }, quest: { done: ['1-0', '1-0a', '1-1', '1-2', '1-3', '1-4'] }, intro: { hub: 1, notice: 1 }, seenNotice: NOTICE_ID, nameSet: 1 });

async function open(browser, o = {}) {
  const p = await browser.newPage({ viewport: { width: o.vw || 1200, height: o.vh || 900 } });
  const errs = []; p.on('dialog', d => d.accept());
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  const { sha256Hex } = await import('../../nw-access.js');
  const hash = await sha256Hex('Test-Pass_9!x');
  const seed = { ['mg_scores/' + ID]: { className: CLS, seat: 5, name: '小明', bestLevel: 10, bestScore: 20, scoreVer: 2, plays: 9, tutorialDone: true, talentIntroDone: true, tier: 'B', balanceVer: 3, punctDone: true,
    nw: Object.assign(BASE_NW(), o.nw || {}) }, ...(o.seed || {}) };
  await p.addInitScript(a => {
    window.__FS = a.s; window.__RULES = true; localStorage.clear(); localStorage.setItem('mg_nw_fast', '1');
    window.__NW_CODE_HASH__ = a.hash; localStorage.setItem('mg_nw_code', a.hash); window.__NW_NOGIFT__ = true; window.__NW_NOINTRO__ = !a.intro;
    if (a.stages) window.__NW_STAGES__ = a.stages;
    window.confetti = () => {}; window.html2canvas = async () => document.createElement('canvas');
  }, { s: seed, hash, stages: o.stages === undefined ? ['1', '2b'] : o.stages, intro: !!o.intro });
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
  await dismissGifts(p);
  return p;
}
const nwOf = p => p.evaluate(() => JSON.parse(JSON.stringify(window.__NWG.nw)));
const dismissGifts = async p => { for (let i = 0; i < 12; i++) { if (!(await p.$('#nw-gift'))) break; await p.evaluate(() => { const g = [...document.querySelectorAll('#nw-gift [data-ok]')].pop(); if (g) g.click(); }); await p.waitForTimeout(250); } };
const enterForge = async p => { await p.evaluate(() => window.__NWV.teleport('forge')); await p.waitForTimeout(250); await p.click('[data-bld="forge"]'); await p.waitForTimeout(500); await dismissGifts(p); await p.waitForTimeout(300); };
const noErr = (p, m = '沒有 JS 錯誤') => ok(p.errs.length === 0, m + ' ' + p.errs.join(' | '));
const heroSig = (p, sel) => p.evaluate(s => { const c = document.querySelector(s + ' canvas'); return c ? c.toDataURL().length + ':' + c.toDataURL().slice(-60) : ''; }, sel);

(async () => {
  const D = await import('../../nw-data.js');
  const gear = [
    { id: 'g0', k: 'w_dagger', c: 'gray', p: 0, t: 0 }, { id: 'g1', k: 'flame_dagger', c: 'blue', p: 2, t: 1 },
    { id: 'g2', k: 'cloth_hat', c: 'green', p: 0, t: 2 }, { id: 'g3', k: 'cloth_vest', c: 'gray', p: 0, t: 3 }];
  const nw = { gearV: 1, gear, eq: { weapon: 'g0', helm: 'g2', armor: null, gloves: null, boots: null }, bp: ['bp_flame_dagger'] };
  const b = await chromium.launch();
  for (const [name, vw, vh, minCols] of [['desktop', 1200, 900, 8], ['m390', 390, 844, 5]]) {
    const p = await open(b, { vw, vh, nw });
    await p.click('[data-act="bagopen"]'); await p.waitForSelector('#nw-bag [data-gear-cells]'); await p.waitForTimeout(400);
    const g = await p.evaluate(() => {
      const wrap = document.querySelector('#nw-bag [data-gear-cells]');
      const all = [...wrap.children], rs = all.map(e => e.getBoundingClientRect());
      const full = [...wrap.querySelectorAll('.fg-cell')];
      const row0 = rs.filter(r => Math.abs(r.top - rs[0].top) < 2).length;
      const off = full.map(e => { const c = e.querySelector('canvas').getBoundingClientRect(), r = e.getBoundingClientRect(); return Math.max(Math.abs(c.left + c.width / 2 - r.left - r.width / 2), Math.abs(c.top + c.height / 2 - r.top - r.height / 2)); });
      return { n: all.length, cells: full.length, empties: wrap.querySelectorAll('.fg-empty').length, sq: rs.every(r => Math.abs(r.width - r.height) < 1 && Math.abs(r.width - rs[0].width) < 1), w: rs[0].width, row0, rows: Math.round(all.length / row0), off: Math.max(...off),
        bc: full.map(e => e.style.borderColor), sel: full.filter(e => e.classList.contains('sel')).length, wornTags: wrap.querySelectorAll('.fg-wear').length,
        scrollW: document.documentElement.scrollWidth <= innerWidth && document.querySelector('#nw-bag').scrollWidth <= document.querySelector('#nw-bag').clientWidth };
    });
    ok(g.n === D.GEAR_MAX && g.cells === 4 && g.empties === D.GEAR_MAX - 4, `[${name}] 共 ${g.n} 格：4 件裝備＋${g.empties} 個空格`);
    ok(g.sq, `[${name}] 每格都是正方形、大小一樣（${g.w.toFixed(1)} px）`);
    ok(g.row0 >= minCols && g.n % g.row0 === 0, `[${name}] 一列 ${g.row0} 格（至少 ${minCols}），${g.rows} 列剛好填滿`);
    ok(g.off <= 1.5, `[${name}] 圖示在格子內置中（最大偏差 ${g.off.toFixed(1)} px）`);
    ok(g.bc.length === 4 && new Set(g.bc).size >= 3, `[${name}] 邊框有稀有度顏色：${g.bc.join(' ')}`);
    ok(g.wornTags === 2, `[${name}] 穿著的 2 件有「穿」標記`);
    ok(g.sel === 1, `[${name}] 有一格是選取中`);
    ok(g.scrollW, `[${name}] 沒有橫向捲動`);
    ok(await p.$('#nw-bag [data-sorts] [data-sort="slot"]') !== null, `[${name}] 排序按鈕還在`);
    ok((await p.textContent('#nw-bag')).includes('4/60'), `[${name}] 顯示已用 4/60`);
    /* 點格子：選取、詳情換成那一件、穿上（沿用原本點一下就穿） */
    await p.click('#nw-bag [data-equip="g1"]'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => document.querySelector('#nw-bag [data-equip="g1"]').classList.contains('sel') && document.querySelectorAll('#nw-bag .fg-cell.sel').length === 1), `[${name}] 點格子後只有那一格選取`);
    ok((await p.textContent('#nw-bag')).includes(D.itemName(gear[1])) && (await p.evaluate(() => window.__NWG.nw.eq.weapon)) === 'g1', `[${name}] 下方詳情顯示該件，武器換成它`);
    ok(await p.evaluate(() => document.querySelector('#nw-bag [data-equip="g1"]').classList.contains('on')), `[${name}] 換上後那格變成穿著狀態`);
    /* 鍵盤：Tab 到格子、Enter 選取，焦點留在同一格 */
    await p.focus('#nw-bag [data-equip="g3"]'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => document.activeElement && document.activeElement.dataset.equip === 'g3'), `[${name}] 鍵盤 Enter 選格子後焦點還在那一格`);
    await p.click('#nw-bag [data-sort="slot"]'); await p.waitForTimeout(250);
    ok(await p.evaluate(() => document.querySelectorAll('#nw-bag .fg-grid > *').length === 60), `[${name}] 換排序後仍是 60 格`);
    await p.evaluate(() => document.querySelector('#nw-bag [data-gear-cells]').scrollIntoView({ block: 'start' })); await p.waitForTimeout(150);
    await p.screenshot({ path: `${OUT}/bag-grid-${name}.png` });
    ok(p.errs.length === 0, `[${name}] 沒有 JS 錯誤 ` + p.errs.join('|'));
    await p.close();
  }
  await b.close();
  console.log(fails ? 'FAIL ' + fails : 'FAIL 0'); process.exit(fails ? 1 : 0);
})();
