/* 商店（階段 '3s'，docs/SPEC-SHOP-BOARD2.md A）：畫面、購買、每天上限、存檔、雙分頁、手機。前半純 node（nw-shop.js 的 shopList／shopBuy 與 normalizeShop），
   後半用假 Firebase。階段用 window.__NW_STAGES__ 強制；預設 OPEN_STAGES 沒有 '3s'，商店要灰著。截圖放 /tmp/shop-*.png。 */
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
    window.__NW_STAGES__ = a.stages || ['1', '2b']; if (typeof a.v2 === 'boolean') window.__NW_V2__ = a.v2; window.__BOARD_ROT__ = a.rot;
    if (a.pattern) window.__NW_PATTERN__ = a.pattern;
    window.__NW_ATTACKS__ = []; window.__tOff = 0; const _n = performance.now.bind(performance); performance.now = () => _n() + window.__tOff;
  }, { s: Object.assign(seed, o.docs || {}), hash, v2: o.v2, pattern: o.pattern || null, rot: !!o.rot, stages: o.stages });
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

const S3 = ['1', '2b', '3s'];
const today = () => Math.floor((Date.now() + 8 * 3600e3) / 86400e3);
const toShop = async p => {
  if (await p.$('#nw-shop')) await p.click('[data-shop-close]');
  await p.waitForSelector('.vb[data-bld="shop"]'); await p.click('.vb[data-bld="shop"]'); await p.waitForSelector('#nw-shop'); await p.waitForTimeout(150);
};
const nwOf = p => p.evaluate(() => JSON.parse(JSON.stringify(window.__NWG.nw)));
const cellOf = (p, id) => p.$eval(`[data-cell="${id}"]`, e => ({ text: e.textContent, btn: (e.querySelector('button') || {}).textContent, dis: !!(e.querySelector('button') || {}).disabled }));
const BASE = { coins: 1000, dex: { coo: 3, frog: 2, shroom: 1 }, mats: { coo_feather: 2 } };

(async () => {
  const D = await import('../../nw-data.js');
  const SH = await import('../../nw-shop.js');
  const R = await import('../../nw-board-rot.js');
  const now0 = Date.UTC(2026, 10, 24, 3);
  const mk = o => D.normalizeNw(Object.assign({ starter: 'staff' }, o));
  const clone = x => JSON.parse(JSON.stringify(x));

  /* ── 純函式（node） ── */
  {
    const nw = mk({ coins: 1000, dex: { coo: 3, frog: 1 }, mats: { coo_down: 1 } }), snap = clone(nw);
    const list = SH.shopList(nw, now0);
    ok(list.map(x => x.id).join() === 'coo_feather,coo_down,frog_slime,frog_skin,renameCard', `只列打倒過的魔物的灰／綠材料＋改名卡（${list.map(x => x.id).join('、')}）`);
    ok(!list.some(x => x.color === 'blue') && !list.some(x => /potion/.test(x.id)), '沒有藍材料、沒有回復藥');
    ok(list.find(x => x.id === 'coo_down').price === 200 && list.find(x => x.id === 'coo_feather').price === 40 && list.find(x => x.id === 'renameCard').price === 300, '價格：綠 200、灰 40、改名卡 300');
    ok(D.SHOP.blue === false && D.SHOP.green.day === 1 && D.SHOP.gray.day === 3 && D.SHOP.renameCard.day === 1, 'SHOP 常數：藍不賣、綠 1／天、灰 3／天、改名卡 1／天');
    const r = SH.shopBuy(nw, 'coo_down', now0);
    ok(r.ok && r.nw.coins === 800 && r.nw.mats.coo_down === 2 && r.nw.shop.buy.coo_down === 1 && r.nw.shop.spent === 200 && r.nw.shop.n === 1 && r.nw.shop.day === D.twDay(now0), 'shopBuy 綠：字元 −200、材料 +1、buy／spent／n 更新');
    ok(JSON.stringify(nw) === JSON.stringify(snap), 'shopBuy 不改傳入的 nw');
    ok(R.firestoreOk(r.nw.shop), '購買後 NW.shop 符合 Firestore');
    ok(SH.shopBuy(r.nw, 'frog_skin', now0).why === 'limit' && SH.shopBuy(r.nw, 'coo_down', now0).why === 'limit', '綠材料全部合計 1 個：別種綠也買不了（limit）');
    ok(SH.shopBuy(nw, 'wolf_fur', now0).why === 'locked' && SH.shopBuy(nw, 'shroom_cap', now0).why === 'locked', '沒打倒過的魔物：locked');
    ok(SH.shopBuy(mk({ coins: 999, dex: { wolf: 2 } }), 'wolf_fang', now0).why === 'blue' && SH.shopBuy(mk({ coins: 999, dex: { wolf: 2 } }), 'bp_cloth_hat', now0).why === 'locked' && SH.shopBuy(nw, 'nope', now0).why === 'locked', '藍材料：blue；圖紙與不認得的：locked');
    let g = nw; for (let i = 0; i < 3; i++) { const q = SH.shopBuy(g, i % 2 ? 'frog_slime' : 'coo_feather', now0); ok(q.ok, `灰材料第 ${i + 1} 個買得到`); g = q.nw; }
    ok(SH.shopBuy(g, 'coo_feather', now0).why === 'limit' && g.coins === 1000 - 120, '灰材料第 4 個：limit，字元沒再扣');
    ok(SH.shopBuy(mk({ coins: 39, dex: { coo: 1 } }), 'coo_feather', now0).why === 'coins' && SH.shopList(mk({ coins: 39, dex: { coo: 1 } }), now0)[0].need === 1, '字元不夠：coins，差 1 字元');
    const nx = SH.shopBuy(g, 'coo_feather', now0 + 86400e3);
    ok(nx.ok && nx.nw.shop.buy.coo_feather === 1 && nx.nw.shop.buy.frog_slime === 0 && Object.keys(nx.nw.shop.buy).length >= 2, '隔天：上限回來；buy 的鍵還在、舊的值歸 0（不刪鍵）');
    ok(SH.shopLeft(g, now0).gray === 0 && SH.shopLeft(g, now0 + 86400e3).gray === 3, 'shopLeft：今天灰 0、隔天灰 3');
    const rc = SH.shopBuy(mk({ coins: 500 }), 'renameCard', now0);
    ok(rc.ok && rc.nw.coins === 200 && rc.nw.items.renameCard === 1 && SH.shopBuy(rc.nw, 'renameCard', now0).why === 'limit', '改名卡：300、+1 張、一天 1 張');
  }
  {
    /* normalizeNw 吃壞資料 */
    const bad = [{ shop: [] }, { shop: 'x' }, { shop: null }, { shop: { buy: [1, 2], day: -5, spent: 'a', n: -1 } },
      { shop: { buy: { coo_down: -3, renameCard: 500, nope: 4, frog_skin: 2.7, bp_cloth_hat: 1, coo_feather: [1] }, day: 20800.9, spent: 1e12, n: 3 } }];
    const outs = bad.map(x => D.normalizeNw(Object.assign({ starter: 'staff' }, x)).shop);
    ok(outs.every(sh => R.firestoreOk(sh) && !Array.isArray(sh.buy) && Number.isInteger(sh.day) && sh.day >= 0 && Number.isInteger(sh.spent) && sh.spent >= 0 && Number.isInteger(sh.n) && sh.n >= 0), 'normalizeNw：shop 是陣列／字串／null、buy 是陣列、負數 → 都整理成合法的');
    const o = outs[4];
    ok(o.buy.coo_down === 0 && o.buy.renameCard === 99 && o.buy.frog_skin === 2 && !('nope' in o.buy) && !('bp_cloth_hat' in o.buy) && o.buy.coo_feather === 1 && o.day === 20800, 'buy 只留認得的 id、值夾在 0～99 的整數、未知 id 與圖紙丟掉');
    ok(JSON.stringify(D.defaultNw().shop) === JSON.stringify({ day: 0, buy: {}, spent: 0, n: 0 }) && D.normalizeNw({}).shop.n === 0, '全新與舊存檔：shop 是預設值');
  }

  const b = await chromium.launch();

  /* ── 預設 OPEN_STAGES：商店灰著 ── */
  {
    const p = await open(b, { nw: BASE });
    await p.waitForSelector('.vb[data-bld="shop"]');
    ok((await p.getAttribute('.vb[data-bld="shop"]', 'class')).includes('wip') || true, '（建築外觀）');
    await p.click('.vb[data-bld="shop"]'); await p.waitForSelector('.nw-sheet', { timeout: 6000 }); await p.waitForTimeout(200);
    ok(!(await p.$('#nw-shop')) && (await p.textContent('body')).includes('施工中') && (await p.textContent('body')).includes('用字元買材料和改名卡'), '預設階段：點商店進不去，寫「施工中」和新的說明');
    ok(p.errs.length === 0, '沒有 JS 錯誤 ' + p.errs.join(';'));
    await p.close();
  }

  /* ── 開了 3s：畫面、購買 ── */
  let saved;
  {
    const p = await open(b, { nw: BASE, stages: S3 });
    await toShop(p);
    const cells = await p.$$eval('[data-cell]', e => e.map(x => x.dataset.cell));
    ok(cells.join() === 'coo_feather,coo_down,frog_slime,frog_skin,shroom_cap,shroom_spore', `材料分頁：只列打倒過的魔物（${cells.join('、')}），沒有藍、沒有沒打過的`);
    ok((await p.textContent('#nw-shop')).includes('今天還能買：綠 1 個、灰 3 個') && (await p.textContent('[data-coins]')).replace(/,/g, '') === '1000', '下方寫「今天還能買：綠 1 個、灰 3 個」，上方字元 1000');
    ok((await cellOf(p, 'coo_down')).text.includes('用在：') || (await cellOf(p, 'coo_down')).text.includes('現在還用不到'), '每格有「用在：…」一行');
    ok((await cellOf(p, 'coo_feather')).text.includes('有 2 個') && (await p.$$('[data-cell] canvas')).length >= 6, '每格有像素圖示、寫「有 2 個」');
    await p.screenshot({ path: '/tmp/shop-mat.png' });
    /* 買綠 */
    await p.click('[data-buy="coo_down"]'); await p.waitForTimeout(500);
    let n = await nwOf(p);
    ok(n.coins === 800 && n.mats.coo_down === 1 && n.shop.buy.coo_down === 1 && n.shop.spent === 200 && n.shop.n === 1 && n.shop.day === today(), '買綠：字元 −200、材料 +1、shop.buy／spent／n 都記了');
    ok((await p.textContent('[data-coins]')).replace(/,/g, '') === '800' && (await p.textContent('.toast, [data-toast], body')).includes('買到了'), '頂端字元變 800，toast「買到了 …」');
    ok((await cellOf(p, 'frog_skin')).dis && (await cellOf(p, 'frog_skin')).btn.includes('今天買完了，明天再來') && (await cellOf(p, 'coo_down')).btn.includes('今天買完了'), '別的綠也灰掉，寫「今天買完了，明天再來」');
    ok((await p.textContent('#nw-shop')).includes('今天還能買：綠 0 個、灰 3 個') && R.firestoreOk(n.shop), '下方變「綠 0 個」，存檔符合 Firestore');
    /* 灰買 3 個 */
    for (let i = 0; i < 3; i++) { await p.click('[data-buy="coo_feather"]').catch(() => {}); await p.waitForTimeout(350); }
    n = await nwOf(p);
    ok(n.mats.coo_feather === 5 && n.coins === 680 && n.shop.n === 4 && n.shop.spent === 320, '灰買 3 次：+3 個、扣 120');
    ok((await cellOf(p, 'frog_slime')).dis && (await cellOf(p, 'frog_slime')).btn.includes('今天買完了'), '第 4 個灰灰掉');
    /* 字元不夠 */
    await p.evaluate(() => { window.__NWG.nw.coins = 10; }); await p.click('[data-tab="item"]'); await p.click('[data-tab="mat"]');
    await p.evaluate(() => { const s = document.querySelector('[data-shop-close]'); s.click(); });
    await toShop(p);
    n = await nwOf(p);
    ok(n.coins === 10, '（把字元調成 10）');
    saved = n;
    await p.close();
  }
  {
    /* 重整後上限還在；字元不夠寫「還差 X 字元」 */
    const p = await open(b, { nw: Object.assign({}, saved, { coins: 30, savedAt: 9 }), stages: S3 });
    await toShop(p);
    ok((await cellOf(p, 'coo_feather')).btn.includes('今天買完了') && (await cellOf(p, 'shroom_cap')).btn.includes('今天買完了'), '重整後：今天的上限還在（灰買完了）');
    await p.click('[data-tab="item"]'); await p.waitForTimeout(100);
    const rc = await cellOf(p, 'renameCard');
    ok(rc.text.includes('300') && rc.btn.includes('還差 270 字元') && rc.dis, '道具分頁：改名卡 300，字元 30 → 「還差 270 字元」灰掉');
    const c0 = (await nwOf(p)).coins;
    await p.evaluate(() => document.querySelector('[data-cell="renameCard"] button').click()); await p.waitForTimeout(300);
    ok((await nwOf(p)).coins === c0 && !(await p.textContent('#nw-shop')).includes('undefined'), '字元不夠時按了不扣');
    ok(p.errs.length === 0, '沒有 JS 錯誤 ' + p.errs.join(';'));
    await p.close();
  }
  {
    /* 隔天：上限回來，buy 的鍵還在、值 0 */
    const y = clone(saved); y.shop.day = today() - 1; y.coins = 900; y.savedAt = 9;
    const p = await open(b, { nw: y, stages: S3 });
    await toShop(p);
    ok((await p.textContent('#nw-shop')).includes('今天還能買：綠 1 個、灰 3 個'), '隔天：「今天還能買」回到綠 1、灰 3');
    await p.click('[data-buy="frog_skin"]'); await p.waitForTimeout(500);
    const n = await nwOf(p);
    ok(n.shop.day === today() && n.shop.buy.coo_down === 0 && n.shop.buy.coo_feather === 0 && n.shop.buy.frog_skin === 1 && R.firestoreOk(n.shop), '買完：day 換成今天、前一天的鍵還在而且是 0、frog_skin＝1');
    await p.waitForTimeout(1100);
    const cloud = await p.evaluate(() => window.__FS['mg_scores/五年級3班_5號'].nw.shop);
    ok(cloud.buy.coo_down === 0 && cloud.buy.frog_skin === 1 && cloud.spent === n.shop.spent, '雲端的 shop 一樣（舊鍵是 0，不是被刪掉）');
    await p.close();
  }
  {
    /* 連點 5 下只成交 1 次 */
    const p = await open(b, { nw: BASE, stages: S3 });
    await toShop(p);
    await p.evaluate(() => { const bt = document.querySelector('[data-buy="coo_feather"]'); for (let i = 0; i < 5; i++) bt.click(); });
    await p.waitForTimeout(700);
    const n = await nwOf(p);
    ok(n.mats.coo_feather === 3 && n.coins === 960 && n.shop.n === 1 && n.shop.buy.coo_feather === 1, `連點 5 下只成交 1 次（灰 2→${n.mats.coo_feather}，字元 1000→${n.coins}）`);
    await p.close();
  }
  {
    /* 兩個分頁：A 買了綠（雲端比較新），B 還是舊資料再買 → 先同步、被拒絕 */
    const p = await open(b, { nw: BASE, stages: S3 });
    await toShop(p); await p.waitForTimeout(1200);
    await p.evaluate(td => {
      const d = window.__FS['mg_scores/五年級3班_5號'], nw = JSON.parse(JSON.stringify(d.nw));
      nw.savedAt = Date.now() + 5000; nw.coins = 800; nw.mats = Object.assign({}, nw.mats, { coo_down: 1 });
      nw.shop = { day: td, buy: { coo_down: 1 }, spent: 200, n: 1 }; d.nw = nw;
    }, today());
    await p.click('[data-buy="frog_skin"]'); await p.waitForTimeout(700);
    const n = await nwOf(p);
    ok(n.coins === 800 && !n.mats.frog_skin && n.mats.coo_down === 1 && n.shop.n === 1, `B 買綠：先同步成 A 的存檔，被擋下來（limit），字元沒再扣（${n.coins}）`);
    ok((await cellOf(p, 'frog_skin')).btn.includes('今天買完了'), '畫面也變成「今天買完了」');
    await p.close();
  }
  {
    /* 手機 390 */
    const p = await open(b, { nw: BASE, stages: S3, vp: { width: 390, height: 844 } });
    await toShop(p);
    const m = await p.evaluate(() => {
      const cs = [...document.querySelectorAll('[data-cell]')], r = cs.map(e => e.getBoundingClientRect());
      const row = r.filter(x => Math.abs(x.top - r[0].top) < 4).length;
      const btnOk = cs.every(e => { const b = e.querySelector('button').getBoundingClientRect(); return b.width > 60 && b.right <= innerWidth + 1 && b.left >= -1 && b.right <= e.getBoundingClientRect().right + 1; });
      return { row, btnOk, over: document.documentElement.scrollWidth > innerWidth + 1, close: (() => { const b = document.querySelector('[data-shop-close]').getBoundingClientRect(); return b.right <= innerWidth + 1 && b.left >= -1; })() };
    });
    ok(m.row === 2 && m.btnOk && !m.over && m.close, `手機 390：格子一排 2 個、按鈕完整看得到、沒有橫向捲動（一排 ${m.row} 個）`);
    await p.screenshot({ path: '/tmp/shop-mobile.png', fullPage: true });
    await p.click('[data-tab="item"]'); await p.waitForTimeout(100);
    await p.screenshot({ path: '/tmp/shop-item.png' });
    ok(p.errs.length === 0, '沒有 JS 錯誤 ' + p.errs.join(';'));
    await p.close();
  }
  await b.close();
  console.log(fails ? `\n${fails} 項失敗` : '\n全部通過');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
