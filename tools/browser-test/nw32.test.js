/* 解鎖路線（docs/SPEC-UNLOCK-ROUTE.md F）：建築要獵人等級才打得開（倉庫 2、鐵匠鋪 3、商店 4）、🔒 門口提示、補經驗任務、解鎖慶祝、
   舊存檔相容、老師信箱 unl、開關。購買改名卡與委託板刷新不綁等級（老師 2026-11-27 決定）。
   每個案例都設 __NW_STAGES__ = ['1','2b','3s']、__BOARD_ROT__ = true、__NW_LVGATE__ = true（別的測試為了進建築、升級不被慶祝窗擋住，會設成 false）。
   截圖放 /tmp/unlock-*.png。 */
const { chromium } = require('playwright'); const fs = require('fs');
const path = require('path'); const M = path.join(__dirname, 'mock') + '/'; const OUT = process.argv[2] || require('os').tmpdir();
const css = require('./tw.js')(OUT);
const NOTICE_ID = /export const NOTICES = \[\s*\{ id: '([^']+)'/.exec(fs.readFileSync(path.join(__dirname, '../../nw-data.js'), 'utf8'))[1];
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const ID = '五年級3班_5號', CLS = '五年級3班';
const TODAY = Math.floor((Date.now() + 8 * 3600e3) / 86400e3);

async function open(browser, o = {}) {
  const p = await browser.newPage({ viewport: o.vp || { width: 1200, height: 900 } });
  const errs = []; p.on('dialog', d => d.accept());
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  const { sha256Hex } = await import('../../nw-access.js');
  const hash = await sha256Hex('Test-Pass_9!x');
  const seed = { ['mg_scores/' + ID]: { className: CLS, seat: 5, name: '小明', bestLevel: 10, bestScore: 20, scoreVer: 2, plays: 9, tutorialDone: true, talentIntroDone: true, tier: 'B', balanceVer: 3, punctDone: true,
    nw: Object.assign({ v: 1, savedAt: 5, look: { style: 1, hair: 2, skin: 1 }, starter: 'dagger', hunts: 5, quest: { done: ['1-0', '1-0a'] }, zone: { grass: 0 }, dex: {}, tut: { dodge: 1, defend: 1, attack: 1 }, tm: { m_dodge: 1, m_defend: 1, m_attack: 1, m_school: 1 }, intro: { hub: 1, notice: 1 }, fb: { coo: 1, frog: 1, shroom: 1 }, seenNotice: NOTICE_ID, nameSet: 1 }, o.nw || {}) } };
  await p.addInitScript(a => {
    window.__FS = a.s; window.__RULES = true; localStorage.clear(); localStorage.setItem('mg_nw_fast', '1');
    window.__NW_CODE_HASH__ = a.hash; localStorage.setItem('mg_nw_code', a.hash); window.__NW_NOGIFT__ = true; window.__NW_NOINTRO__ = true;
    window.confetti = () => {}; window.html2canvas = async () => document.createElement('canvas');
    window.__NW_STAGES__ = ['1', '2b', '3s']; window.__BOARD_ROT__ = true; window.__NW_LVGATE__ = a.gate;
    window.__NW_ATTACKS__ = [];
  }, { s: Object.assign(seed, o.docs || {}), hash, gate: o.gate !== false });
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
  await p.click('#nw-door'); await p.waitForFunction(() => window.__NWV, null, { timeout: 12000 }); await p.waitForTimeout(700);
  await dismissGifts(p);   // 測試員任務（教學三堂課）的獎勵窗：先關掉，不擋點擊
  return p;
}
const noOverflow = p => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const inView = (p, sel) => p.$eval(sel, e => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth + 1 && r.top >= 0 && r.bottom <= window.innerHeight + 1; });
const tagOf = (p, id) => p.$eval(`.vb[data-bld="${id}"]`, e => ({ text: e.textContent, locked: e.dataset.locked || '' }));
const dismissGifts = async p => { for (let i = 0; i < 12; i++) { if (!(await p.$('#nw-gift'))) break; await p.evaluate(() => { const g = [...document.querySelectorAll('#nw-gift [data-ok]')].pop(); if (g) g.click(); }); await p.waitForTimeout(250); } };
const fakeRes = (o = {}) => {
  const q = Array.from({ length: 12 }, () => [2, 5, 2400, 2]);
  const cor = q.reduce((a, x) => a + x[3], 0), act = Math.round(q.reduce((a, x) => a + x[2], 0)) / 1000;
  return Object.assign({ rk: 'grass', mk: 'coo', star: 1, lv: 1, qb: '6:0', result: 'win', secs: 80, accuracy: 0.96, answered: q.length, ans: q.length, cor, typ: cor + 1, keys: q.reduce((a, x) => a + x[1], 0), nokey: 0, act, cpm: Math.round(cor / act * 600) / 10,
    dodgeOk: 0, dodgeAll: 0, defOk: 0, defAll: 0, maxCombo: 5, flags: { fast: 0, paste: 0, wrong: 1 }, tier: 'B', weapon: 'dagger', wk: 'dagger', atk: 105, pw: 40, valid: true, lvAcc: true, q,
    live: 70, idle: 10, frac: 1, fEff: 1, flow: 'normal', guards: 0, vines: 0, dodgeReal: 0, react: [] }, o);
};
const toHub = async p => { if (await p.$('[data-act="hub"]')) await p.click('[data-act="hub"]'); await p.waitForSelector('.vb[data-bld="board"]'); await p.waitForTimeout(400); };
const toBoard = async p => { await p.waitForSelector('.vb[data-bld="board"]'); await p.click('.vb[data-bld="board"]'); await p.waitForSelector('#nwbd-board'); await p.waitForTimeout(200); };
const cardsOf = p => p.$$eval('.qs[data-q]:not(.lock)', els => els.map(e => ({ id: e.dataset.q, tag: ((e.parentElement.querySelector('.qs-goal') || {}).textContent || '') })));
const nwOf = (p, k) => p.evaluate(k2 => JSON.parse(JSON.stringify(window.__NWG.nw[k2])), k);
const chip = p => p.textContent('[data-act="bagq"]');

(async () => {
  /* ── 純函式：數量只會變少、一定解得開 ── */
  {
    globalThis.window = { __NW_STAGES__: ['1', '2b', '3s'] };
    const D = await import('../../nw-data.js');
    const nw = () => D.normalizeNw({ hr: 2, hrExp: 0, zone: { grass: 0 }, quest: { done: ['1-0', '1-0a', '1-1'] }, starter: 'dagger' });
    let a = nw(), q = D.currentQuest(a);
    ok(q.id === '1-1u' && D.unlockTarget(a, q).n === 2 && D.unlockTarget(a, q).mk === 'coo', '差 35 經驗、借 1-2 的咕咕鳥 ★1：要打 2 隻（35／23）');
    a.hrExp = 13; ok(D.unlockTarget(a, q).n === 1, '差 22 → 1 隻');
    /* 輸了一場（經驗 ×0.5）：數字不會變大 */
    const a2 = nw(), n0 = D.unlockTarget(a2, q).n; D.addHrExp(a2, D.huntExp(D.regionLv('grass', 1), false) * 0.4);
    ok(D.unlockTarget(a2, q).n <= n0, `輸一場拿一點經驗：${n0} → ${D.unlockTarget(a2, q).n}（不會變多）`);
    /* 換到更高星：每場經驗更多，數字變少 */
    const b1 = D.normalizeNw({ hr: 1, hrExp: 0, zone: { grass: 0 }, quest: { done: ['1-0', '1-0a', '1-1', '1-2'] }, starter: 'dagger' }), b2 = D.normalizeNw({ hr: 1, hrExp: 0, zone: { grass: 2 }, quest: { done: ['1-0', '1-0a', '1-1', '1-2'] }, starter: 'dagger' });
    const t1 = D.unlockTarget(b1, D.currentQuest(b1)), t2 = D.unlockTarget(b2, D.currentQuest(b2));
    ok(t1.n >= t2.n && t2.star === 3 && t1.star === 1, `沒打過 ★2 時借不到 1-4（★1 要 ${t1.n} 隻）；打到 ★2 以後借 ★3 要 ${t2.n} 隻（更高星變少）`);
    ok(D.unlockTarget(D.normalizeNw({ hr: 1, zone: { grass: 0 }, quest: { done: ['1-0', '1-0a', '1-1', '1-2'] }, starter: 'dagger' }), D.MAIN_QUESTS.find(x => x.id === '1-2u')).n === 3, '商店（差 105）：一次最多叫他打 3 隻');
    delete globalThis.window;
  }

  const b = await chromium.launch();

  /* ── 1. 新存檔 Lv1：鐵匠鋪 🔒（不是施工中）、點了出面板、小地圖傳送、Enter 一樣 ── */
  {
    const p = await open(b, {});
    const f = await tagOf(p, 'forge'), r = await tagOf(p, 'rank'), s = await tagOf(p, 'storage');
    ok(f.locked === '3' && f.text.includes('🔒 Lv 3') && !f.text.includes('施工中'), `鐵匠鋪：「${f.text}」有 🔒 Lv 3、不是施工中`);
    ok(s.locked === '2' && s.text.includes('Lv 2') && r.locked === '' && r.text.includes('施工中'), `倉庫 🔒 Lv 2；榮譽碑（段沒開）仍是「${r.text}」`);
    ok(!(await tagOf(p, 'board')).locked && !(await tagOf(p, 'academy')).locked, '委託板、教學大樓不鎖');
    await p.evaluate(() => window.__NWV.teleport('forge')); await p.waitForTimeout(250);
    await p.screenshot({ path: '/tmp/unlock-village-locked.png' });
    await p.click('.vb[data-bld="forge"]'); await p.waitForSelector('#nw-locked');
    const t = await p.textContent('#nw-locked');
    ok(t.includes('Lv 3') && t.includes('你現在 Lv 1') && t.includes('再拿 55 點經驗') && !!(await p.$('#nw-locked .px-bar')) && !(await p.$('#nw-forge')), '點 🔒 鐵匠鋪：面板寫 Lv 3、你現在 Lv 1、再拿 55 點、有經驗條，沒有進鐵匠鋪');
    await p.screenshot({ path: '/tmp/unlock-locked-desktop.png' });
    await p.click('#nw-locked [data-close]'); await p.waitForTimeout(200);
    ok(!(await p.$('#nw-locked')), '［好］關掉面板');
    await p.click('.vb[data-bld="shop"]'); await p.waitForSelector('#nw-locked');
    ok((await p.textContent('#nw-locked')).includes('Lv 4'), '商店 🔒 Lv 4');
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    await p.click('.vb[data-bld="forge"]'); await p.waitForSelector('#nw-locked');
    await p.click('#nw-locked [data-tobd]'); await p.waitForSelector('#nwbd-board');
    ok(true, '［去委託板］走到委託板');
    await toHub(p);
    /* 小地圖點鐵匠鋪：傳到門口，Enter 還是 🔒 面板 */
    await p.evaluate(() => window.__NWV.teleport('board')); await p.waitForTimeout(200);
    const ms = +(await p.$eval('#nw-minimap', c => c.dataset.s));
    await p.click('#nw-minimap', { position: { x: (24 + 1.5) * ms, y: (15 + 1.5) * ms } }); await p.waitForTimeout(300);
    const pos = await p.evaluate(() => window.__NWV.pos());
    ok(pos[0] === 25 && pos[1] === 18, `小地圖點鐵匠鋪 → 傳到門口（${pos}）`);
    await p.keyboard.press('Enter'); await p.waitForSelector('#nw-locked', { timeout: 3000 }).catch(() => {});
    ok(!!(await p.$('#nw-locked')) && !(await p.$('#nw-forge')), '到了按 Enter：還是 🔒 面板');
    await p.keyboard.press('Escape');
    /* 鐵匠 NPC 鎖著時的話 */
    ok(p.errs.length === 0, '沒有 JS 錯誤 ' + p.errs.join(';'));
    await p.close();
  }

  /* ── 2. 補經驗任務：借 1-2 的咕咕鳥；借 1-4 的 ★3；今天 ★3 不能開 → 退回最高打贏過的星 ── */
  {
    const p = await open(b, { nw: { hr: 2, hrExp: 13, quest: { done: ['1-0', '1-0a', '1-1'] }, dex: { frog: 1 } } });
    const t = await chip(p);
    ok(t.includes('再打倒 1 隻咕咕鳥') && t.includes('鐵匠鋪就開張'), `任務列：「${t.trim()}」`);
    await toBoard(p);
    const cs = await cardsOf(p), g = cs.find(c => c.id === 'grass:coo:1');
    ok(!!g && g.tag.includes('任務目標'), `委託板：咕咕鳥 ★1 有「📌 任務目標」（${cs.map(c => c.id + g.tag).length} 張）`);
    ok((await p.textContent('.nwbd-goal')).includes('再打倒 1 隻咕咕鳥'), '委託板橫幅也是白話的任務');
    await p.screenshot({ path: '/tmp/unlock-board-quest.png' });
    await p.close();
    const q = await open(b, { nw: { hr: 1, hrExp: 0, zone: { grass: 2 }, dex: { frog: 1, coo: 1 }, quest: { done: ['1-0', '1-0a', '1-1', '1-2'] } } });
    const t3 = await chip(q);
    ok(t3.includes('再打倒 2 隻新芽草原 ★3 的魔物'), `借 1-4 的草原 ★3：「${t3.trim()}」（差 55，每場 41）`);
    await toBoard(q);
    const c3 = await cardsOf(q);
    ok(c3.some(c => /:3$/.test(c.id) && c.tag.includes('任務目標')), '委託板有 ★3 的「📌 任務目標」');
    await q.close();
    const q2 = await open(b, { nw: { hr: 1, hrExp: 0, zone: { grass: 2 }, dex: { frog: 1, coo: 1 }, quest: { done: ['1-0', '1-0a', '1-1', '1-2'] }, day: { d: TODAY, n: 2, work: 0, ws: 0, st: 2 } } });
    const t2 = await chip(q2);
    ok(t2.includes('再打倒 2 隻新芽草原 ★2 的魔物'), `今天 ★3 不能開 → 退回打贏過的最高星：「${t2.trim()}」`);
    await toBoard(q2);
    ok((await cardsOf(q2)).some(c => /:2$/.test(c.id) && c.tag.includes('往任務前進')), '委託板上的 ★2 標「📌 往任務前進」');
    await q2.close();
    const r = await open(b, { nw: { hr: 1, hrExp: 0, zone: { grass: 2 }, dex: { frog: 1, coo: 1 }, unl: { forge: 2 }, unlV: 1, quest: { done: ['1-0', '1-0a', '1-1', '1-2', '1-1u', '1-5'] }, day: { d: TODAY, n: 2, work: 0, ws: 0, st: 2 } } });
    ok((await chip(r)).includes('再打倒 3 隻新芽草原 ★2 的魔物'), `商店（差 105、每場 32）：一次最多 3 隻：「${(await chip(r)).trim()}」`);
    await r.close();
  }

  /* ── 4. 解鎖慶祝：結算有「🔓」、回村跳窗、［等一下］後不再跳 ── */
  {
    /* 跳跳菇（沒有主線獎勵）：只跨過鐵匠鋪的等級 */
    const p = await open(b, { nw: { hr: 2, hrExp: 34, quest: { done: ['1-0', '1-0a', '1-1'] }, dex: { frog: 1 } } });
    ok((await tagOf(p, 'forge')).locked === '3', '還差 1 點經驗：鐵匠鋪還是 🔒');
    await p.evaluate(r => { window.__NWG.afterHunt(r); }, fakeRes({ mk: 'shroom' }));
    await p.waitForSelector('[data-unlock-line]', { timeout: 6000 });
    ok((await p.textContent('[data-unlock-line]')).includes('🔓 鐵匠鋪開張了！'), '結算畫面：「獵人等級升到 3！」下面有「🔓 鐵匠鋪開張了！」');
    await p.screenshot({ path: '/tmp/unlock-result.png' });
    await p.click('[data-close]'); await p.waitForTimeout(500);
    await toHub(p);
    await p.waitForSelector('#nw-unlock', { timeout: 6000 });
    const ut = await p.textContent('#nw-unlock');
    ok(ut.includes('鐵匠鋪開張了！') && ut.includes('用打到的材料做裝備，穿上就變強！') && !!(await p.$('#nw-unlock canvas')) && !!(await p.$('#nw-unlock .px-title.px-cursor')), '回村跳慶祝窗：標題、一句話、像素畫、閃爍標題');
    await p.screenshot({ path: '/tmp/unlock-celebrate.png' });
    ok((await nwOf(p, 'unl')).forge === 1, '看完之前 unl.forge＝1（還沒慶祝）');
    await p.click('#nw-unlock [data-later]'); await p.waitForTimeout(500);
    ok(!(await p.$('#nw-unlock')) && (await nwOf(p, 'unl')).forge === 2, '［等一下］：窗關了，unl.forge＝2');
    await p.waitForTimeout(1300);
    ok(await p.evaluate(() => window.__FS['mg_scores/五年級3班_5號'].nw.unl.forge === 2), '雲端存檔也是 unl.forge＝2（重整不會再跳）');
    await toBoard(p); await toHub(p); await p.waitForTimeout(500);
    ok(!(await p.$('#nw-unlock')), '回村再來一次：不再跳');
    ok((await tagOf(p, 'forge')).locked === '' && !!(await p.$('.vb[data-bld="forge"] [data-new-tag]')), '鐵匠鋪不鎖了，名牌旁有小小的 NEW');
    await p.evaluate(() => window.__NWV.teleport('forge')); await p.waitForTimeout(250); await p.click('.vb[data-bld="forge"]'); await p.waitForTimeout(700); await dismissGifts(p); await p.waitForSelector('#nw-forge', { timeout: 4000 }).catch(() => {});
    ok(!!(await p.$('#nw-forge')), '能進鐵匠鋪');
    ok(p.errs.length === 0, '沒有 JS 錯誤 ' + p.errs.join(';'));
    await p.close();
    /* 真實的第 2 場（咕咕鳥 ★1：+23＋主線 +30）：鐵匠鋪（Lv3）與商店（Lv4）同一場開，一個窗列兩個；Enter＝現在就去 */
    const q = await open(b, { nw: { hr: 2, hrExp: 34, quest: { done: ['1-0', '1-0a', '1-1'] }, dex: { frog: 1 } } });
    await q.evaluate(r => { window.__NWG.afterHunt(r); }, fakeRes()); await q.waitForSelector('[data-unlock-line]');
    ok((await q.textContent('[data-unlock-line]')).includes('鐵匠鋪、商店開張了！'), `第 2 場：結算寫「${(await q.textContent('[data-unlock-line]')).trim()}」`);
    await q.click('[data-close]'); await q.waitForTimeout(400);
    await toHub(q); await q.waitForSelector('#nw-unlock');
    const t2 = await q.textContent('#nw-unlock');
    ok(t2.includes('新的地方開張了') && t2.includes('鐵匠鋪') && t2.includes('商店') && (await q.$$('#nw-unlock canvas')).length === 2, '同時解開兩棟：一個窗列兩個、兩張像素畫');
    await q.screenshot({ path: '/tmp/unlock-celebrate-two.png' });
    await q.keyboard.press('Enter'); await q.waitForTimeout(500);
    const u2 = await nwOf(q, 'unl');
    ok(!(await q.$('#nw-unlock')) && u2.forge === 2 && u2.shop === 2, 'Enter＝［現在就去］：窗關了，兩個都記成 2');
    await q.close();
  }

  /* ── 5. 商店 Lv4；改名卡與刷新不綁等級 ── */
  {
    const base = { quest: { done: ['1-0', '1-0a', '1-1', '1-2', '1-1u'] }, dex: { frog: 1, coo: 1 }, zone: { grass: 1 }, coins: 1000, unl: { forge: 2, storage: 2 }, unlV: 1 };
    const p = await open(b, { nw: Object.assign({}, base, { hr: 3, hrExp: 5 }) });
    ok((await tagOf(p, 'shop')).locked === '4', 'Lv3：商店 🔒 Lv 4');
    await p.click('.vb[data-bld="shop"]'); await p.waitForSelector('#nw-locked');
    ok((await p.textContent('#nw-locked')).includes('再拿 '), 'Lv3 點商店：出 🔒 面板，沒進商店');
    await p.close();
    const q = await open(b, { nw: Object.assign({}, base, { hr: 4, hrExp: 0 }) });
    await q.waitForSelector('#nw-unlock', { timeout: 6000 });
    ok((await q.textContent('#nw-unlock')).includes('商店開張了') && (await q.textContent('#nw-unlock')).includes('用字元買材料'), 'Lv4（升級那一刻 unl 還沒記）：回村跳「商店開張了」');
    await q.click('#nw-unlock [data-later]'); await q.waitForTimeout(400);
    ok((await tagOf(q, 'shop')).locked === '', 'Lv4：商店不鎖');
    await q.click('.vb[data-bld="shop"]'); await q.waitForSelector('#nw-shop', { timeout: 4000 }).catch(() => {});
    ok(!!(await q.$('#nw-shop')), 'Lv4：進得了商店');
    await q.click('[data-tab="item"]'); await q.waitForTimeout(200);
    ok(!!(await q.$('[data-buy="renameCard"]')) && !(await q.$eval('[data-buy="renameCard"]', e => e.disabled)) && !(await q.textContent('#nw-shop')).includes('🔒'), '改名卡那列沒有等級鎖：Lv4 就買得到');
    await q.click('[data-buy="renameCard"]'); await q.waitForTimeout(700);
    ok((await nwOf(q, 'items')).renameCard === 1, '真的買到改名卡（不綁等級）');
    await q.click('[data-shop-close]'); await q.waitForTimeout(400);
    await toBoard(q);
    ok((await q.textContent('[data-swap]')).includes('今天免費 1 次') && !(await q.$eval('[data-swap]', e => e.disabled)), 'Lv4：委託板刷新可以按（不綁等級）');
    ok(q.errs.length === 0, '沒有 JS 錯誤 ' + q.errs.join(';'));
    await q.close();
    /* Lv1 也能刷新（只看有沒有開，不看等級） */
    const r = await open(b, { nw: { quest: { done: ['1-0', '1-0a'] } } });
    await toBoard(r);
    ok(!(await r.$eval('[data-swap]', e => e.disabled)) || /沒有可以換/.test(await r.textContent('[data-swap]')), 'Lv1：刷新按鈕沒有等級鎖（最多是「沒有可以換的單子」）');
    await r.close();
  }

  /* ── 6. 舊存檔相容 ── */
  {
    const cases = [
      ['打造過裝備', { hr: 1, forge: { made: 1, ups: 0, top: 0, gift: 0 } }, 'forge', true],
      ['商店買過', { hr: 1, shop: { day: 0, buy: {}, spent: 0, n: 2 } }, 'shop', true],
      ['什麼都沒用過', { hr: 1 }, 'forge', false],
      ['等級本來就夠', { hr: 5 }, 'shop', true],
      ['unl 已解開、等級被改回 1', { hr: 1, unl: { forge: 2 }, unlV: 1 }, 'forge', true]
    ];
    for (const [name, nw, id, open_] of cases) {
      const p = await open(b, { nw: Object.assign({ quest: { done: ['1-0', '1-0a'] } }, nw) });
      const t = await tagOf(p, id), unl = await nwOf(p, 'unl');
      ok((t.locked === '') === open_ && !(await p.$('#nw-unlock')) && (!open_ || unl[id] === 2), `${name}：${id} ${open_ ? '直接開、不慶祝、unl＝2' : '鎖著'}（unl＝${JSON.stringify(unl)}）`);
      await p.close();
    }
  }

  /* ── 7. 老師強制解鎖（信箱 unl） ── */
  {
    const T = Date.now(), mail = (id, items) => ['mg_mail/' + id, { aud: ['id:' + ID], title: '信 ' + id, body: '', items, from: '老師', sendAt: T - 1000, expireAt: 0, t: T - 1000, src: 'manual' }];
    const p = await open(b, { nw: { quest: { done: ['1-0', '1-0a', '1-1'] }, dex: { frog: 1 } }, docs: Object.fromEntries([mail('u1', [{ type: 'unl', key: 'forge' }])]) });
    ok((await tagOf(p, 'forge')).locked === '3', 'Lv1：先鎖著');
    await p.evaluate(() => window.__NWV.teleport('mail')); await p.waitForTimeout(250); await p.click('.vb[data-bld="mail"]'); await p.waitForSelector('#nw-mail'); await p.waitForTimeout(400);
    ok((await p.textContent('#nw-mail')).includes('直接解鎖：鐵匠鋪'), '信上的標籤：🔓 直接解鎖：鐵匠鋪');
    await p.click('#nw-mail [data-claim]'); await p.waitForSelector('#nw-gift'); await dismissGifts(p);
    const un = await nwOf(p, 'unl');
    ok(un.forge === 1 || un.forge === 2, `領信：unl.forge＝${un.forge}`);
    if (await p.$('#nw-mail')) await p.evaluate(() => { const c = document.querySelector('#nw-mail [data-close]'); if (c) c.click(); });
    await p.waitForTimeout(500);
    if (!(await p.$('#nw-unlock'))) { await toBoard(p); await toHub(p); }
    await p.waitForSelector('#nw-unlock', { timeout: 6000 });
    ok((await p.textContent('#nw-unlock')).includes('鐵匠鋪開張了'), '慶祝窗跳出來');
    await p.click('#nw-unlock [data-go]'); await p.waitForTimeout(500);
    ok((await tagOf(p, 'forge')).locked === '' && (await nwOf(p, 'quest')).done.includes('1-1u'), '能進、1-1u 完成');
    await p.close();
    const q = await open(b, { nw: { quest: { done: ['1-0', '1-0a'] } }, docs: Object.fromEntries([mail('u2', [{ type: 'unl', key: '*' }])]) });
    await q.evaluate(() => window.__NWV.teleport('mail')); await q.waitForTimeout(250); await q.click('.vb[data-bld="mail"]'); await q.waitForSelector('#nw-mail'); await q.waitForTimeout(400);
    await q.click('#nw-mail [data-claim]'); await q.waitForSelector('#nw-gift'); await dismissGifts(q);
    const ua = await nwOf(q, 'unl');
    ok(!!ua.storage && !!ua.forge && !!ua.shop && !ua.rank, `'*'：倉庫、鐵匠鋪、商店都解開，榮譽碑（段沒開）不會（${JSON.stringify(ua)}）`);
    await q.keyboard.press('Escape'); await q.waitForTimeout(300);
    if (await q.$('#nw-mail')) { await q.evaluate(() => { const c = document.querySelector('#nw-mail [data-mail-close], #nw-mail [data-close]'); if (c) c.click(); }); await q.waitForTimeout(400); }
    if (await q.$('#nw-unlock')) { await q.keyboard.press('Escape'); await q.waitForTimeout(500); }
    await toBoard(q); await toHub(q); await q.waitForTimeout(400);
    if (await q.$('#nw-unlock')) { await q.click('#nw-unlock [data-later]'); await q.waitForTimeout(400); }
    const tags = [await tagOf(q, 'storage'), await tagOf(q, 'forge'), await tagOf(q, 'shop'), await tagOf(q, 'rank')];
    ok(tags.slice(0, 3).every(t => t.locked === '' && !t.text.includes('施工中')) && tags[3].text.includes('施工中'), `'*'：三棟開了、榮譽碑仍施工中（${tags.map(t => t.text).join('｜')}）`);
    await q.close();
  }

  /* ── 8. 開關：__NW_LVGATE__ = false ＝ 沒有等級限制；1-1u、1-2u 立刻完成 ── */
  {
    const p = await open(b, { gate: false, nw: { hr: 1, quest: { done: ['1-0', '1-0a', '1-1'] }, dex: { frog: 1, coo: 1 } } });
    const f = await tagOf(p, 'forge'), s = await tagOf(p, 'shop');
    ok(f.locked === '' && s.locked === '' && !f.text.includes('🔒') && !s.text.includes('🔒'), '關掉：Lv1 鐵匠鋪、商店都沒有鎖');
    await toBoard(p); await toHub(p);
    const done = (await nwOf(p, 'quest')).done;
    ok(done.includes('1-1u') && done.includes('1-2u') && !(await p.$('#nw-unlock')) && !(await p.$('[data-nextlock]')), '1-1u、1-2u 立刻完成，沒有慶祝窗、沒有「下一個」');
    await p.evaluate(() => window.__NWV.teleport('forge')); await p.waitForTimeout(250); await p.click('.vb[data-bld="forge"]'); await p.waitForTimeout(700); await dismissGifts(p); await p.waitForSelector('#nw-forge', { timeout: 4000 }).catch(() => {});
    ok(!!(await p.$('#nw-forge')), '進得了鐵匠鋪');
    await p.close();
  }

  /* ── 9. 390 寬：🔒 面板、慶祝窗不橫向捲出、按鈕看得到 ── */
  {
    const vp = { width: 390, height: 780 };
    const p = await open(b, { vp });
    ok(await noOverflow(p), '手機寬：村莊不橫向捲出');
    await p.click('.vb[data-bld="forge"]'); await p.waitForSelector('#nw-locked');
    ok(await noOverflow(p) && await inView(p, '#nw-locked [data-tobd]') && await inView(p, '#nw-locked [data-close]'), '手機寬：🔒 面板不橫向捲出，兩顆按鈕看得到');
    await p.screenshot({ path: '/tmp/unlock-locked-390.png' });
    await p.close();
    const q = await open(b, { vp, nw: { hr: 2, hrExp: 34, quest: { done: ['1-0', '1-0a', '1-1'] }, dex: { frog: 1 } } });
    await q.evaluate(r => { window.__NWG.afterHunt(r); }, fakeRes()); await q.waitForSelector('[data-unlock-line]');
    ok(await noOverflow(q), '手機寬：結算不橫向捲出');
    await q.click('[data-close]'); await q.waitForTimeout(400); await toHub(q); await q.waitForSelector('#nw-unlock');
    ok(await noOverflow(q) && await inView(q, '#nw-unlock [data-go]') && await inView(q, '#nw-unlock [data-later]'), '手機寬：慶祝窗不橫向捲出，按鈕看得到');
    await q.screenshot({ path: '/tmp/unlock-celebrate-390.png' });
    await q.close();
  }

  await b.close();
  console.log(fails ? `\n${fails} 項失敗` : '\n全部通過');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
