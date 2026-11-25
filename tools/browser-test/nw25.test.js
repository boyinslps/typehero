/* 委託板「一次 4 張」第 2～4 步：畫面、蓋章、整批刷新、主線／活動、組隊房間、手機（docs/SPEC-BOARD-ROTATION.md §3、§4、§8；蓋章與刷新改版見 docs/SPEC-SHOP-BOARD2.md B）。旗標用 window.__BOARD_ROT__ 強制；
   假結果用 finishHunt（跟 nw22 同一種做法）。純函式與存檔格式見 nw24。截圖放 /tmp/board-*.png。 */
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
    window.__NW_STAGES__ = ['1', '2b']; if (typeof a.v2 === 'boolean') window.__NW_V2__ = a.v2; window.__BOARD_ROT__ = a.rot;
    if (a.pattern) window.__NW_PATTERN__ = a.pattern;
    window.__NW_ATTACKS__ = []; window.__tOff = 0; const _n = performance.now.bind(performance); performance.now = () => _n() + window.__tOff;
  }, { s: Object.assign(seed, o.docs || {}), hash, v2: o.v2, pattern: o.pattern || null, rot: !!o.rot });
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
const evDoc = (o = {}) => Object.assign({ type: 'ranking', metric: 'kills', title: '測試活動', desc: '', startAt: NOW - HOUR, endAt: NOW + 3 * 86400e3, cls: [] }, o);

(async () => {
  const b = await chromium.launch();

  /* ── 旗標關：跟現在一樣（全部列出），不讀寫 NW.board ── */
  {
    const p = await open(b, { rot: false, nw: G3 });
    await toBoard(p);
    const n = (await p.$$('.qs[data-q]')).length;
    ok(n === 3 * 3 + 1 + 0 || n >= 10, `旗標關：全部列出（${n} 張，含鎖住的森林）`);
    ok((await p.$$('.qs-role')).length === 0 && !(await p.$('[data-swap]')) && !(await p.$('.nwbd-sheets.rot')), '旗標關：沒有角色布條、沒有「刷新」、沒有 4 張的排版');
    ok((await p.$$('.qs.lock')).length === 1, '旗標關：鎖住的森林還是一張單子');
    await hunt(p, 'grass:coo:3');
    ok((await board(p)) === null, '旗標關：打完一場 NW.board 還是 null（完全不讀寫）');
    await toBoard(p);
    ok((await board(p)) === null && (await p.$$('.qs[data-q]')).length >= n - 1, '旗標關：回到看板也不會建板子');
    ok(p.errs.length === 0, '旗標關：沒有 JS 錯誤 ' + p.errs.join(';'));
    await p.close();
  }

  /* ── 旗標開：舊存檔第一次打開 → 4 張 ── */
  let saved;
  {
    const p = await open(b, { rot: true, nw: G3 });
    await toBoard(p);
    const cs = await cardsOf(p);
    ok(cs.length === 4, `旗標開：4 張（${cs.map(c => c.id).join('、')}）`);
    ok(cs.every(c => /輕鬆|剛好|挑戰/.test(c.role)), '每張都有角色布條：' + cs.map(c => c.role).join('、'));
    ok(cs.filter(c => /挑戰/.test(c.role)).length === 1, '挑戰單最多 1 張');
    ok(cs.some(c => /輕鬆/.test(c.role)) && cs.some(c => /剛好/.test(c.role)), '有剛好、有輕鬆');
    ok((await p.$$('.qs-seal')).length === 1, '挑戰單蓋火漆印（不只靠顏色）');
    ok((await p.$$('.nwbd-lock')).length === 1 && (await p.textContent('.nwbd-lock')).includes('迷霧森林'), '鎖住的森林：下緣小紙條，不占 4 格');
    ok(cs.every(c => !c.isNew), '舊存檔第一次排板：不跳「新的」動畫');
    saved = await board(p);
    ok(saved && saved.v === 1 && ids(saved).length === 4 && fsOk(saved) && ['a', 'b', 'c', 'd', 'e'].every(k => saved.slots[k]), '存檔 NW.board：4 張、五個鍵都在、符合 Firestore（無巢狀陣列、無 undefined）');
    ok(JSON.stringify(ids(saved)) === JSON.stringify(['a', 'b', 'c', 'd', 'e'].map(k => saved.slots[k].id).filter(Boolean)) && cs.map(c => c.id).sort().join() === ids(saved).sort().join(), '畫面上的單子＝存檔裡的單子');
    ok((await p.textContent('.nwbd-goal')).length > 0, '主線橫幅還在');
    const info = await p.textContent('#nwbd-info');
    ok(/輕鬆：|剛好：|挑戰：/.test(info), '右邊資訊欄多一行角色說明：' + info.slice(0, 40));
    await p.screenshot({ path: '/tmp/board-4.png' });
    ok(await noOverflow(p) && !(await overlap(p)), '桌機：4 張不重疊、沒有橫向捲動');
    /* 重整同一批：離開再進來 */
    await toBoard(p);
    ok(JSON.stringify(ids(await board(p))) === JSON.stringify(ids(saved)), '離開再進來：同一批');
    await p.waitForTimeout(1200);
    const cloud = await p.evaluate(() => window.__FS['mg_scores/五年級3班_5號'].nw.board);
    ok(cloud && JSON.stringify(ids(cloud)) === JSON.stringify(ids(saved)) && fsOk(cloud), '雲端存檔也有同一塊板子');
    ok(p.errs.length === 0, '沒有 JS 錯誤 ' + p.errs.join(';'));
    await p.close();
  }
  {
    const p = await open(b, { rot: true, nw: Object.assign({}, G3, { board: saved, savedAt: 6 }) });
    await toBoard(p);
    ok(JSON.stringify((await cardsOf(p)).map(c => c.id).sort()) === JSON.stringify(ids(saved).sort()), '關掉重開（讀存檔）：還是同一批，不重抽');
    await p.close();
  }

  /* ── 打贏蓋章（不補單）、輸不動、不算數 ── */
  {
    const p = await open(b, { rot: true, nw: G3 });
    await toBoard(p);
    let cs = await cardsOf(p), b0 = await board(p);
    const hard = cs.find(c => /挑戰/.test(c.role)), easy = cs.find(c => /輕鬆/.test(c.role));
    /* 輸、撤退、逃走：單子留著 */
    await hunt(p, easy.id, { result: 'fail', secs: 300, live: 100, frac: 0.3, fEff: 0.3 });
    await hunt(p, easy.id, { result: 'retreat', secs: 20, live: 1, frac: 0.02, fEff: 0.02 });
    await hunt(p, easy.id, { result: 'escape', secs: 480, live: 100, frac: 0.6, fEff: 0.6 });
    let b1 = await board(p);
    ok(ids(b1).sort().join() === ids(b0).sort().join() && b1.done === 0, '輸、撤退、逃走都不算完成：單子全留著，done＝0');
    const key = ['a', 'b', 'c', 'd', 'e'].find(k => b1.slots[k].id === easy.id);
    ok(b1.slots[key].m === 3, '沒打贏的次數記在那一格（m＝3）');
    await p.evaluate(r => { window.__NWG.finishHunt(r); }, fakeRes({ over: { rk: easy.id.split(':')[0], mk: easy.id.split(':')[1], star: +easy.id.split(':')[2], valid: false } }));
    ok(ids(await board(p)).sort().join() === ids(b0).sort().join(), '答不到 3 題（valid＝false）：什麼都不變');
    /* 打贏挑戰單 */
    const coins0 = await p.evaluate(() => window.__NWG.nw.coins);
    await hunt(p, hard.id);
    b1 = await board(p);
    const hk = ['a', 'b', 'c', 'd', 'e'].find(k => b1.slots[k].id === hard.id);
    ok(b1.done === 1 && b1.last === hard.id && hk && b1.slots[hk].ok === 1 && ids(b1).length >= 4 && ids(b1).length <= 5, `打贏挑戰單：留在板上蓋章、不補單、done＝1（${ids(b1).join('、')}）`);
    ok(ids(b1).some(x => /^grass:\w+:5$/.test(x)), '主線往前走了：新的任務單（草原 ★5）直接貼進空格，不用等整批換新');
    await toBoard(p);
    cs = await cardsOf(p);
    ok(cs.length >= 4 && (await p.$$('.qs-wrap.stamped')).length === 1 && !!(await p.$(`.qs-wrap.stamped .qs[data-q="${hard.id}"]`)), '挑戰單有「✅ 完成」章、卡片變暗');
    const plainN = cs.filter(c => !c.role.includes('挑戰')).length, plainOk = await p.$$eval('.qs-wrap.stamped .qs[data-q]', els => els.filter(e => !((e.querySelector('.qs-role') || {}).textContent || '').includes('挑戰')).length);
    ok((await p.textContent('.qs-wrap.stamped .qs-done')).includes('完成') && (await p.textContent('[data-prog]')).includes(`完成 ${plainOk}／${plainN}`) && (await p.textContent('[data-prog]')).includes('挑戰單不用打也行'), `看板上方寫「完成 ${plainOk}／${plainN}」，分母不含挑戰單`);
    await p.click(`.qs[data-q="${hard.id}"]`);
    ok(await p.$eval('[data-go]', e => e.disabled) && (await p.textContent('#nwbd-info')).includes('把其他單子打完，就會送來新的一批'), '點蓋章的單子：「狩獵」灰掉，寫「完成了！把其他單子打完…」');
    const nNew = cs.filter(c => c.isNew).length;
    ok(nNew >= 1 && cs.filter(c => c.isNew).every(c => c.tagNew === '✨ 新的！'), `貼上來的新任務單有「✨ 新的！」小牌子（${nNew} 張）`);
    await p.waitForTimeout(600);
    await p.screenshot({ path: '/tmp/board-refill.png' });
    await toBoard(p);
    ok((await cardsOf(p)).every(c => !c.isNew), '再打開一次：小牌子就沒有了（只在記憶體）');
    ok((await p.evaluate(() => window.__NWG.nw.coins)) >= coins0, '看板沒有扣東西');
    ok(p.errs.length === 0, '沒有 JS 錯誤 ' + p.errs.join(';'));
    await p.close();
  }

  /* ── 連輸 2 次挑戰單：換成好打的 ── */
  {
    const p = await open(b, { rot: true, nw: G3 });
    await toBoard(p);
    const hard = (await cardsOf(p)).find(c => /挑戰/.test(c.role));
    await hunt(p, hard.id, { result: 'fail', secs: 300, live: 100, frac: 0.3, fEff: 0.3 });
    ok((await board(p)).lose === 1, '輸 1 次挑戰單：lose＝1，單子留著');
    await hunt(p, hard.id, { result: 'fail', secs: 300, live: 100, frac: 0.3, fEff: 0.3 });
    const b2 = await board(p);
    ok(b2.lose === 2 && fsOk(b2) && ids(b2).length === 4, '輸 2 次：lose＝2、還是 4 張');
    await toBoard(p);
    const cs = await cardsOf(p);
    ok(cs.filter(c => /挑戰/.test(c.role)).length <= 1, '連輸後挑戰單還是最多 1 張');
    await p.close();
  }

  /* ── 刷新：沒蓋章、不是目標的整批換新；免費／40／80，一天最多 3 次 ── */
  {
    const p = await open(b, { rot: true, nw: G3 });
    await toBoard(p);
    let cs = await cardsOf(p);
    const goal = cs.find(c => c.tag), plain = cs.filter(c => !c.tag);
    ok((await p.textContent('[data-swap]')).includes('今天免費 1 次') && !(await p.$eval('[data-swap]', e => e.disabled)), '看板上方的按鈕：「🔄 刷新（今天免費 1 次）」亮著');
    ok(!(await p.textContent('.nwbd-wrap')).includes('換一張') && !(await p.textContent('.nwbd-wrap')).includes('明天才能再換'), '舊字「換一張」「明天才能再換」都沒有了');
    ok((await p.textContent('[data-prog]')).includes('完成 0／3，🔥 挑戰單不用打也行，其他都完成就送來新的一批'), '看板上方：「完成 0／3」（4 張裡 1 張挑戰單不算）');
    await p.evaluate(() => { window.__NWG.nw.coins = 300; });
    const coins0 = await p.evaluate(() => window.__NWG.nw.coins);
    await p.click('[data-swap]'); await p.waitForTimeout(400);
    let after = await cardsOf(p), b1 = await board(p);
    ok(after.length === 4 && plain.every(c => !after.some(x => x.id === c.id)) && (!goal || after.some(x => x.id === goal.id)), '未完成、不是目標的單子全換掉，目標單還在');
    ok(b1.swapN === 1 && b1.swap > 0 && Array.isArray(b1.out) && plain.every(c => b1.out.includes(c.id)) && b1.out.every(x => typeof x === 'string') && fsOk(b1), '存檔：swapN＝1、out 是平的字串陣列、符合 Firestore');
    ok((await p.evaluate(() => window.__NWG.nw.coins)) === coins0, '第 1 次免費：字元沒扣');
    ok(after.filter(c => c.isNew).length === plain.length && after.filter(c => /挑戰/.test(c.role)).length === cs.filter(c => /挑戰/.test(c.role)).length, '被換的格子有「新的」小牌子，🔥 挑戰還是挑戰');
    /* 第 2 次：要 40，先問 */
    ok((await p.textContent('[data-swap]')).includes('🪙 40'), '第 2 次按鈕：「🔄 刷新（🪙 40）」');
    await p.click('[data-swap]'); await p.waitForSelector('#nwbd-ask');
    ok((await p.textContent('#nwbd-ask')).includes('花 40 字元，把還沒完成的單子全部換新？') && (await p.textContent('#nwbd-ask')).includes('任務單會留著'), '跳確認小視窗：「花 40 字元，把還沒完成的單子全部換新？📌 任務單會留著。」');
    await p.screenshot({ path: '/tmp/board-swap-ask.png' });
    await p.click('[data-ask-no]'); await p.waitForTimeout(200);
    ok((await board(p)).swapN === 1 && (await p.evaluate(() => window.__NWG.nw.coins)) === coins0, '按「不要」：沒換、沒扣');
    /* 連點 5 下：只成交 1 次 */
    await p.click('[data-swap]'); await p.waitForSelector('#nwbd-ask');
    await p.evaluate(() => { const y = document.querySelector('[data-ask-yes]'); for (let i = 0; i < 5; i++) y.click(); });
    await p.waitForTimeout(500);
    b1 = await board(p);
    ok(b1.swapN === 2 && b1.swapCoin === 40 && (await p.evaluate(() => window.__NWG.nw.coins)) === coins0 - 40, '按「換新」連點 5 下：只換 1 次、只扣 40');
    /* 字元不夠 */
    await p.evaluate(() => { window.__NWG.nw.coins = 10; });
    await toBoard(p);
    ok(await p.$eval('[data-swap]', e => e.disabled) && (await p.textContent('[data-swap]')).includes('刷新要 80 字元'), '字元不夠：灰掉，寫「🔄 刷新要 80 字元」');
    await p.screenshot({ path: '/tmp/board-swap.png' });
    await p.evaluate(() => { window.__NWG.nw.coins = 500; });
    await toBoard(p);
    await p.click('[data-swap]'); await p.waitForSelector('#nwbd-ask'); await p.click('[data-ask-yes]'); await p.waitForTimeout(500);
    b1 = await board(p);
    ok(b1.swapN === 3 && b1.swapCoin === 120 && (await p.evaluate(() => window.__NWG.nw.coins)) === 420, '第 3 次扣 80：swapN＝3、swapCoin＝120、字元 500→420');
    ok(await p.$eval('[data-swap]', e => e.disabled) && (await p.textContent('[data-swap]')).includes('今天刷新完了'), '第 3 次後：灰掉，寫「今天刷新完了，明天再來」');
    await toBoard(p);
    ok(await p.$eval('[data-swap]', e => e.disabled) && (await p.textContent('[data-swap]')).includes('今天刷新完了'), '離開再進來還是灰的（重整不會回復）');
    await p.close();
  }

  /* ── 減少動態效果 ── */
  {
    const p = await open(b, { rot: true, nw: G3 });
    await p.emulateMedia({ reducedMotion: 'reduce' });
    await toBoard(p);
    const hard = (await cardsOf(p)).find(c => /挑戰/.test(c.role));
    await hunt(p, hard.id); await toBoard(p);
    const an = await p.$$eval('.qs-wrap.new', els => els.map(e => getComputedStyle(e).animationName));
    ok(an.length >= 1 && an.every(x => x === 'none'), `減少動態效果：補單沒有落下動畫（${an.join()}）`);
    ok((await p.$$('.qs-newtag')).length >= 1, '減少動態效果：「✨ 新的！」小牌子還在');
    await p.close();
    const q = await open(b, { rot: true, nw: G3 });
    await toBoard(q);
    const h2 = (await cardsOf(q)).find(c => /挑戰/.test(c.role));
    await hunt(q, h2.id); await toBoard(q);
    const an2 = await q.$$eval('.qs-wrap.new', els => els.map(e => getComputedStyle(e).animationName));
    ok(an2.length >= 1 && an2.every(x => x === 'qsDrop'), '一般情況：有貼上落下動畫（qsDrop）');
    await q.close();
  }

  /* ── 主線不卡關：往任務前進、目標標籤、建築任務橫幅 ── */
  {
    const p = await open(b, { rot: true, nw: { zone: { grass: 1, forest: 0 }, dex: { coo: 1, frog: 1, shroom: 1 }, quest: { done: DONE3 } } });
    await toBoard(p);
    const cs = await cardsOf(p);
    ok(cs.some(c => /往任務前進/.test(c.tag) && /:2$/.test(c.id)), `主線 1-4（草原 ★3）、才打到 ★1：「📌 往任務前進」是 ★2（${cs.map(c => c.id + c.tag).join('、')}）`);
    ok(cs.filter(c => /挑戰/.test(c.role)).length === 1, '往任務前進的就是那張挑戰，不會多一張');
    await p.close();
    const q = await open(b, { rot: true, nw: { zone: { grass: 0, forest: 0 }, dex: {}, hunts: 0, quest: { done: ['1-0'] } } });
    await toBoard(q);
    const c0 = await cardsOf(q);
    ok(c0.length === 3 && c0.every(c => /:1$/.test(c.id)) && c0.some(c => c.id === 'grass:frog:1' && /任務目標/.test(c.tag)), `全新存檔：3 張草原 ★1，泡泡蛙有「📌 任務目標」（${c0.map(c => c.id).join('、')}）`);
    ok((await p_text(q, '.qs-blank')).includes('全部完成，這裡就會貼新的單子'), '第 4 格是空白舊紙：「全部完成，這裡就會貼新的單子」');
    ok(/輕鬆|剛好|挑戰/.test(c0[0].role) && !c0.some(c => /輕鬆/.test(c.role) && false), '全新存檔每張也有角色');
    await q.close();
    const r = await open(b, { rot: true, nw: { zone: { grass: 1, forest: 0 }, dex: { coo: 1, frog: 1, shroom: 1 }, quest: { done: ['1-0'] }, tut: {} } });
    await toBoard(r);
    ok((await r.textContent('.nwbd-goal')).includes('教學大樓') && !(await r.textContent('.nwbd-goal')).includes('紅色'), '任務是去教學大樓：橫幅寫「去村莊的教學大樓」，不叫你選單子');
    await r.close();
  }

  /* ── 活動：指定的魔物一定在板上；達標後不再標；ranking 打贏貼回同一張 ── */
  {
    const FOREST = { zone: { grass: 5, forest: 2 }, dex: { coo: 4, frog: 4, shroom: 4, wolf: 2 }, quest: { done: [...DONE3, '1-4', '1-5', '1-6', '1-7'] }, fastMk: { 'frog:5': 150, 'coo:5': 120, 'shroom:5': 200, 'wolf:2': 240, 'wolf:1': 200, 'coo:2': 90 } };
    const p = await open(b, { rot: true, nw: FOREST, docs: { 'mg_events/hw': evDoc({ type: 'hunt', mk: 'wolf', minStar: 1, goal: 3, items: [], title: '獵狼週' }) } });
    await p.evaluate(() => window.__NWG.events.load(true)); await p.waitForTimeout(300);
    await toBoard(p);
    let cs = await cardsOf(p);
    ok(cs.some(c => /^forest:wolf:/.test(c.id) && /活動/.test(c.tag)), `活動指定炎牙狼：板上有炎牙狼並標「🎪 活動」（${cs.map(c => c.id + c.tag).join('、')}）`);
    ok(cs.filter(c => /挑戰/.test(c.role)).length <= 1, '有活動時挑戰單還是最多 1 張');
    const w = cs.find(c => /活動/.test(c.tag));
    await hunt(p, w.id); await hunt(p, w.id); await hunt(p, w.id);
    await toBoard(p);
    cs = await cardsOf(p);
    ok(!cs.some(c => /活動/.test(c.tag)), '打滿目標隻數（達標）：下次打開不再標活動');
    await p.close();
    const q = await open(b, { rot: true, nw: FOREST, docs: { 'mg_events/rk': evDoc({ type: 'ranking', metric: 'fastest', mk: 'wolf', minStar: 1, title: '最快討伐' }) } });
    await q.evaluate(() => window.__NWG.events.load(true)); await q.waitForTimeout(300);
    await toBoard(q);
    cs = await cardsOf(q);
    const rw = cs.find(c => /活動/.test(c.tag));
    ok(!!rw && /wolf/.test(rw.id), '活動排行榜（最快討伐）：炎牙狼貼在板上');
    await hunt(q, rw.id); await toBoard(q);
    ok((await cardsOf(q)).some(c => c.id === rw.id && /活動/.test(c.tag)), '排行榜活動打贏後：單子蓋章留在板上（整批換新以後又會貼回來，可以繼續刷自己的紀錄）');
    await q.close();
    const r = await open(b, { rot: true, nw: Object.assign({}, G3), docs: { 'mg_events/hw': evDoc({ type: 'hunt', mk: 'wolf', minStar: 3, goal: 3, items: [], title: '獵狼週' }), 'mg_events/bs': evDoc({ type: 'boost', what: 'exp', mul: 2, title: '加倍', items: [] }) } });
    await r.evaluate(() => window.__NWG.events.load(true)); await r.waitForTimeout(300);
    await toBoard(r);
    const notes = await r.$$eval('.nwbd-note', e => e.map(x => x.textContent));
    ok(notes.some(t => /獵狼週/.test(t) && /先打倒/.test(t)) && notes.some(t => /打贏哪一張都算/.test(t)), '森林還沒開：說「先打倒新芽草原 ★5」；加倍活動：「打贏哪一張都算」（' + notes.join('｜') + '）');
    await r.close();
  }

  /* ── 5 張的例外 ── */
  {
    const p = await open(b, { rot: true, nw: { zone: { grass: 4, forest: 0 }, dex: { coo: 4, frog: 4, shroom: 4 }, quest: { done: [...DONE3, '1-4'] }, fastMk: { 'frog:4': 150, 'coo:4': 110, 'shroom:4': 190 } }, docs: { 'mg_events/sh': evDoc({ type: 'hunt', mk: 'shroom', minStar: 1, goal: 5, items: [], title: '跳跳菇週' }) } });
    await p.evaluate(() => window.__NWG.events.load(true)); await p.waitForTimeout(300);
    await toBoard(p);
    const cs = await cardsOf(p);
    ok(cs.length === 5 && cs.some(c => /任務/.test(c.tag)) && cs.some(c => /活動/.test(c.tag)) && cs.filter(c => /挑戰/.test(c.role)).length === 1, `主線與活動不同張：5 張，挑戰仍只有 1 張（${cs.map(c => c.id).join('、')}）`);
    ok(await noOverflow(p) && !(await overlap(p)), '5 張：不重疊、沒有橫向捲動');
    await p.screenshot({ path: '/tmp/board-5.png' });
    await p.close();
  }

  /* ── 全破 ── */
  {
    const p = await open(b, { rot: true, nw: { zone: { grass: 5, forest: 5 }, dex: { coo: 9, frog: 9, shroom: 9, wolf: 3 }, quest: { done: [...DONE3, '1-4', '1-5', '1-6', '1-7'] }, fastMk: { 'wolf:5': 200, 'coo:5': 120, 'shroom:5': 150, 'frog:5': 150 } } });
    await toBoard(p);
    const cs = await cardsOf(p);
    ok(cs.length === 4 && (await p.textContent('.nwbd-note')).includes('都打完了') && cs.filter(c => /挑戰/.test(c.role)).length <= 1, '全破：照樣 4 張＋「🏆 迷霧森林的委託你都打完了」');
    await p.close();
  }

  /* ── 雙分頁：雲端存檔比較新 → 先換成雲端的 ── */
  {
    const p = await open(b, { rot: true, nw: G3 });
    await toBoard(p);
    await p.waitForTimeout(1300);
    await p.evaluate(() => { const d = window.__FS['mg_scores/五年級3班_5號']; const nw = JSON.parse(JSON.stringify(d.nw)); nw.savedAt = Date.now() + 5000; nw.board.slots.c = Object.assign({}, nw.board.slots.d); d.nw = nw; });
    await toBoard(p); await p.waitForTimeout(1500);
    const cs = await cardsOf(p), b1 = await board(p);
    ok(new Set(ids(b1)).size === ids(b1).length && cs.length === 4 && new Set(cs.map(c => c.id)).size === 4, '兩格同一張（雙分頁互蓋）：整理後沒有重複、還是 4 張');
    ok(fsOk(b1), '整理後仍符合 Firestore');
    await p.close();
  }

  /* ── 組隊房間不壞 ── */
  {
    const p = await open(b, { rot: true, nw: G3 });
    await toBoard(p);
    const cs = await cardsOf(p), t = cs.find(c => /剛好|輕鬆/.test(c.role));
    await p.click(`.qs[data-q="${t.id}"]`); await p.click('[data-go]'); await p.waitForSelector('[data-view="room"]');
    const room = await p.evaluate(() => Object.entries(window.__FS).filter(([k]) => k.startsWith('mg_rooms/')).map(([k, v]) => v));
    const [rk, mk, star] = t.id.split(':');
    ok(room.length === 1 && room[0].rk === rk && room[0].mk === mk && room[0].star === +star, `開房間：照 rk／mk／star（${rk}:${mk}:${star}）`);
    await p.click('[data-act="leaveroom"]'); await p.waitForSelector('#nwbd-board'); await p.waitForTimeout(200);
    ok(JSON.stringify((await cardsOf(p)).map(c => c.id).sort()) === JSON.stringify(cs.map(c => c.id).sort()), '離開房間回到看板：還是同一批，單子沒被撕');
    await p.click('[data-tab="rooms"]'); await p.waitForTimeout(300);
    ok(await p.$('#nwbd-list') !== null, '「房間」分頁照舊');
    await p.close();
  }

  /* ── 手機寬度 390 ── */
  {
    const p = await open(b, { rot: true, nw: G3, vp: { width: 390, height: 844 } });
    await toBoard(p);
    ok(await noOverflow(p), '手機 390：沒有橫向捲動');
    ok(!(await overlap(p)) && (await cardsOf(p)).length === 4, '手機 390：4 張不重疊');
    const cs = await cardsOf(p); await p.click(`.qs[data-q="${cs.find(c => !c.tag).id}"]`); await p.waitForTimeout(200);
    const vis = await p.evaluate(() => ['[data-go]', '[data-swap]', '[data-prog]'].map(s => { const e = document.querySelector(s), r = e.getBoundingClientRect(); return r.width > 80 && r.right <= window.innerWidth + 1 && r.left >= -1; }));
    ok(vis[0] && vis[1] && vis[2], '手機 390：「狩獵」、看板上方的「刷新」與進度完整看得到');
    await p.screenshot({ path: '/tmp/board-mobile.png', fullPage: true });
    await p.close();
  }

  await b.close();
  console.log(fails ? `\n${fails} 項失敗` : '\n全部通過');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
const p_text = (p, sel) => p.textContent(sel);
