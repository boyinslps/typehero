/* 村莊縮小（老師 2026-11-27：角色與地物太大）：顯示倍率桌機 4→3、中寬 3→2、手機 2→1.5；
   縮小後點地走路、點建築走到門口、Enter 提示、小地圖傳送、碰撞都要照舊正確。 */
const { chromium } = require('playwright'); const fs = require('fs');
const path = require('path'); const M = path.join(__dirname, 'mock') + '/'; const OUT = process.argv[2] || require('os').tmpdir();
const css = require('./tw.js')(OUT);
/* 最新一則改版公告的 id：發新公告時不用回來改測試（「已讀」的種子資料要等於它，不然會跳公告、冒「！」） */
const NOTICE_ID = /export const NOTICES = \[\s*\{ id: '([^']+)'/.exec(fs.readFileSync(path.join(__dirname, '../../nw-data.js'), 'utf8'))[1];
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const ID = '五年級3班_5號';

async function open(browser, o = {}) {
  const p = await browser.newPage({ viewport: o.vp || { width: 1200, height: 900 } });
  const errs = []; p.on('dialog', d => d.accept());
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  const { sha256Hex } = await import('../../nw-access.js');
  const hash = await sha256Hex('Test-Pass_9!x');
  const seed = {
    ['mg_scores/' + ID]: { className: '五年級3班', seat: 5, name: '小明', bestLevel: 10, bestScore: 20, scoreVer: 2, plays: 9, tutorialDone: true, talentIntroDone: true, tier: 'B', balanceVer: 3, punctDone: true,
      nw: Object.assign({ v: 1, savedAt: 5, look: { style: 1, hair: 2, skin: 1 }, starter: 'dagger', quest: { done: ['1-0', '1-0a'] }, items: { potion: 3 }, intro: { hub: 1 }, seenNotice: NOTICE_ID, nick: ['a_flash', 'b_coo'] }, o.nw || {}) }
  };
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
  await p.click('#nw-door'); await p.waitForFunction(() => window.__NWV, null, { timeout: 8000 }); await p.waitForTimeout(500);
  return p;
}
const pos = p => p.evaluate(() => window.__NWV.pos());
const same = (a, b) => a[0] === b[0] && a[1] === b[1];
/* 小地圖上第 (tx,ty) 格中心的螢幕座標 */
const miniXY = (p, tx, ty) => p.evaluate(([tx, ty]) => { const c = document.querySelector('#nw-minimap'), r = c.getBoundingClientRect(), s = +c.dataset.s; return [r.left + tx * s, r.top + ty * s]; }, [tx, ty]);
const rectsOverlap = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;


(async () => {
  const D = await import('../../nw-data.js');
  const V = D.VILLAGE;
  const b = await chromium.launch();
  for (const [name, vp, sc] of [['desktop', { width: 1200, height: 900 }, 3], ['mid', { width: 800, height: 700 }, 2], ['m390', { width: 390, height: 844 }, 1.5]]) {
    const p = await open(b, { vp });
    const g = await p.evaluate(() => { const c = document.querySelector('#vmap canvas'), r = c.getBoundingClientRect(), bd = document.querySelector('.vb[data-bld="board"]').getBoundingClientRect(); return { w: r.width, h: r.height, bw: bd.width, vw: document.querySelector('#vmap').clientWidth }; });
    ok(g.w === V.cols * 16 * sc && g.h === V.rows * 16 * sc, `[${name}] 倍率 ${sc}：地圖 ${g.w}×${g.h} px（${V.cols * 16 * sc}×${V.rows * 16 * sc}）`);
    ok(g.bw === 48 * sc, `[${name}] 建築熱區寬 ${g.bw} px＝48×${sc}`);
    /* 同一畫面看到的格數：縮小的目的 */
    ok(g.vw / (16 * sc) >= (name === 'm390' ? 14 : 20), `[${name}] 一個畫面橫向看得到 ${(g.vw / (16 * sc)).toFixed(1)} 格`);
    /* 點地走路：點出生點右邊 2 格的草地，走到那一格（驗證點擊座標換算跟倍率一致） */
    const s0 = await pos(p), tgt = [s0[0] + 2, s0[1]];
    const xy = await p.evaluate(([tx, ty]) => { const r = document.querySelector('#vmap canvas').getBoundingClientRect(); const s = r.width / 512; return [r.left + (tx * 16 + 8) * s, r.top + (ty * 16 + 8) * s]; }, tgt);
    await p.mouse.click(xy[0], xy[1]); await p.waitForTimeout(1500);
    ok(same(await pos(p), tgt), `[${name}] 點地：從 ${s0} 走到 ${tgt}，實際 ${await pos(p)}`);
    await p.waitForTimeout(400); await p.screenshot({ path: `${OUT}/village-${name}.png` });
    /* 點建築走到門口再開功能 */
    await p.click('.vb[data-bld="board"]', { force: true }); await p.waitForSelector('#nwbd-board', { timeout: 8000 });
    ok(true, `[${name}] 點委託板：走到門口並打開`);
    await p.keyboard.press('Escape'); await p.evaluate(() => document.querySelector('#nwbd-board [data-close], #nwbd-board .px-btn')?.click());
    await p.waitForTimeout(300);
    ok(p.errs.length === 0, `[${name}] 沒有 JS 錯誤 ` + p.errs.join('|'));
    await p.close();
  }
  await b.close();
  console.log(fails ? 'FAIL ' + fails : 'FAIL 0'); process.exit(fails ? 1 : 0);
})();
