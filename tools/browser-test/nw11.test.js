/* 第 5 步補強：通用排行榜模板（nw-rankboard.js）、活動詳情頁、抓蟲大作戰常駐活動。
   全程開 window.__RULES。純函式在 node 直接測，畫面用假 Firebase。
   截圖：/tmp/rank-events.png（活動分頁）、rank-detail.png（排行榜活動詳情）、rank-bug.png（抓蟲大作戰詳情）、rank-mobile.png（手機版）。 */
const { chromium } = require('playwright'); const fs = require('fs');
const path = require('path'); const M = path.join(__dirname, 'mock') + '/'; const OUT = process.argv[2] || require('os').tmpdir();
const css = require('./tw.js')(OUT);
const NOTICE_ID = /export const NOTICES = \[\s*\{ id: '([^']+)'/.exec(fs.readFileSync(path.join(__dirname, '../../nw-data.js'), 'utf8'))[1];
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const ID = '五年級3班_5號', CLS = '五年級3班';
const HOUR = 3600000, DAY = 86400000, now = Date.now();
const SHOT = n => `/tmp/rank-${n}.png`;

async function open(browser, o = {}) {
  const p = await browser.newPage({ viewport: { width: o.vw || 1200, height: o.vh || 900 } });
  const errs = []; p.on('dialog', d => d.accept());
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  const { sha256Hex } = await import('../../nw-access.js');
  const hash = await sha256Hex('Test-Pass_9!x');
  const seed = Object.assign({
    ['mg_scores/' + ID]: { className: CLS, seat: 5, name: '小明', bestLevel: 10, bestScore: 20, scoreVer: 2, plays: 9, tutorialDone: true, talentIntroDone: true, tier: 'B', balanceVer: 3, punctDone: true,
      nw: Object.assign({ v: 1, savedAt: 5, look: { style: 1, hair: 2, skin: 1 }, starter: 'dagger', quest: { done: ['1-0', '1-0a'] }, items: { potion: 3 }, intro: { hub: 1, notice: 1 }, seenNotice: NOTICE_ID, nick: ['a_flash', 'b_coo'], nameSet: 1 }, o.nw || {}) }
  }, o.seed || {});
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
  await p.click('#nw-door'); await p.waitForTimeout(1800);
  return p;
}
const noErr = (p, m = '沒有 JS 錯誤') => ok(p.errs.length === 0, m + ' ' + p.errs.join(' | '));
const dismissGifts = async p => { for (let i = 0; i < 12; i++) { if (!(await p.$('#nw-gift'))) break; await p.evaluate(() => { const g = [...document.querySelectorAll('#nw-gift [data-ok]')].pop(); if (g) g.click(); }); await p.waitForTimeout(250); } };
const seedOf = arr => Object.fromEntries(arr);
const evDoc = (o = {}) => Object.assign({ type: 'ranking', metric: 'kills', title: '測試活動', desc: '', startAt: now - HOUR, endAt: now + 3 * DAY, cls: [] }, o);
const mkScore = (cls, seat, o = {}) => [`mg_scores/${cls}_${seat}號`, Object.assign({ className: cls, seat, name: `真名${cls}${seat}`, nwCls: cls, nwEvDone: [], nwNick: '', nw: { ev: {} } }, o)];
const bugDoc = (cls, seat, score, firstAt, o = {}) => [`mg_bugboard/${cls}_${seat}號`, Object.assign({ className: cls, seat, score, n: score, firstAt }, o)];
const tabOf = (p, k) => p.click(`#nw-notice [data-ntab="${k}"]`).then(() => p.waitForTimeout(500));
const body = p => p.textContent('#nw-notice [data-nbody]');
const openBtn = async p => { await p.click('[data-act="notice"]'); await p.waitForSelector('#nw-notice'); await p.waitForTimeout(400); };
const detail = async (p, id) => { await p.click(`#nw-notice [data-evopen="${id}"]`); await p.waitForSelector('#nw-notice [data-evdetail], #nw-notice [data-bugview]'); await p.waitForTimeout(700); };
const hscroll = p => p.evaluate(() => ({ page: document.documentElement.scrollWidth - innerWidth, sheet: (() => { const s = document.getElementById('nw-notice'); return s ? s.scrollWidth - s.clientWidth : 0; })() }));
const REAL = /真名|小明/;

(async () => {
  const E = await import('../../nw-events.js');
  const R = await import('../../nw-rankboard.js');

  /* ── 純函式 ── */
  const rk = E.normalizeEvent('A', { type: 'ranking', metric: 'improve', mk: 'frog', startAt: 1, endAt: now + DAY });
  ok(E.ruleLines(rk).some(l => l.includes('進步') && l.includes('%')) && E.ruleLines(rk).some(l => l.includes('至少要打 2 場')) && E.ruleLines(rk).some(l => l.includes('前 10 名')), 'ruleLines：進步獎說明怎麼算、至少 2 場、前 10 名');
  ok(E.ruleLines(E.normalizeEvent('B', { type: 'classwar', mk: 'coo', per: 3, goalPct: 50, startAt: 1, endAt: now + DAY })).join('').includes('全班有 50% 的人達標'), 'ruleLines：班級挑戰');
  ok(E.idLabel('五年級4班_5號') === '504・5號' && E.idLabel('壞掉') === '', 'idLabel：文件 ID → 504・5號');
  const snap = { at: 1, metric: 'kills', rows: [
    { id: '五年級4班_1號', nick: '小華', s: 9, n: 9, pick: true, rank: 1, pos: 1 }, { id: '五年級4班_2號', nick: '', s: 7, n: 7, pick: true, rank: 2, pos: 2 },
    { id: '五年級4班_3號', nick: 'X', s: 99, n: 1, warn: true, pick: false, rank: null, pos: null }], prizes: { t1: [{ type: 'coins', n: 50 }], t23: [{ type: 'coins', n: 30 }], t410: [] }, part: [{ type: 'coins', n: 5 }], parts: ['五年級4班_1號', '五年級4班_2號'] };
  const ev0 = E.normalizeEvent('C', { type: 'ranking', metric: 'kills', startAt: 1, endAt: 2, awarded: true, result: snap });
  const fr = E.finalRows(ev0, '五年級4班_2號'), al = E.awardList(ev0, '五年級4班_2號');
  ok(fr.length === 2 && fr[0].label === '504・1號' && fr[1].nick === '神秘獵人' && fr[1].mine && !fr.some(r => r.id.endsWith('_3號')), 'finalRows：只列有名次的、沒暱稱顯示神秘獵人、標出自己');
  ok(al.winners.length === 2 && al.winners[0].items[0].n === 50 && al.myPart && al.partCount === 2 && E.awardList({ ...ev0, awarded: false }, 'x') === null, 'awardList：每人帶獎品、參加獎人數；沒發獎回 null');

  /* ── 模板純函式：四種狀態 ── */
  const mk = (o = {}) => R.rankBoardHtml(Object.assign({ id: 't', title: '前 10 名', unit: '分', rows: [{ rank: 1, label: '504・1號', nick: '小華', score: 9, extra: '確認 9 件' }, { rank: 4, label: '504・2號', score: 2, mine: true }], updatedAt: Date.UTC(2026, 0, 1, 4, 5) }, o));
  const h1 = mk(), h2 = mk({ rows: [], emptyText: '空空的' }), h3 = mk({ state: 'loading' }), h4 = mk({ state: 'error' });
  ok(h1.includes('data-rbrow') && h1.includes('9 分') && h1.includes('確認 9 件') && h1.includes('← 你') && h1.includes('data-rb-refresh') && h1.includes('更新時間') && h1.includes('<svg'), '模板有資料：列、分數接單位、確認件數、「← 你」、更新時間、重新整理、前 3 名徽章');
  ok(h2.includes('data-rb-empty') && h2.includes('空空的') && !h2.includes('data-rbrow'), '模板空狀態：只有空狀態文字');
  ok(h3.includes('data-rb-loading') && h3.includes('讀榜單中') && !h3.includes('data-rbrow') && !h3.includes('data-rb-refresh'), '模板載入中');
  ok(h4.includes('data-rb-error') && h4.includes('data-rb-retry') && h4.includes('再試一次') && !h4.includes('data-rbrow'), '模板讀取失敗：有重試按鈕');
  ok(mk({ rows: [{ rank: 1, label: '<b>x</b>', nick: '<i>', score: '進步 5%' }] }).includes('&lt;b&gt;x&lt;/b&gt;') && mk({ rows: [{ rank: 1, label: 'a', score: '進步 5%' }], unit: '分' }).includes('進步 5%') && !mk({ rows: [{ rank: 1, label: 'a', score: '進步 5%' }], unit: '分' }).includes('進步 5%分'), '模板：文字會跳脫、字串分數不重複接單位');
  ok(mk({ outText: '再快 3 秒就上榜' }).includes('data-rb-out') && R.fmtScore(5, '%') === '5%' && R.fmtScore(2, '隻') === '2 隻' && R.fmtScore(null) === '—', '模板：榜外文字、fmtScore');

  const b = await chromium.launch();

  /* ── 活動分頁、詳情、返回、Esc ── */
  {
    const T0 = now - 20 * DAY;
    const seed = seedOf([
      ...Array.from({ length: 12 }, (_, i) => mkScore('五年級2班', 20 + i, { nwCls: '', nwNick: '獵人' + i, nw: { ev: { RK: { s: 30 - i, n: 30 - i } } } })),
      ...[6, 7, 8, 9].map(s => mkScore(CLS, s, { nwEvDone: ['CW|' + CLS] })), mkScore(CLS, 10),
      ...[['五年級1班', 1], ['五年級1班', 2], ['五年級2班', 1], ['五年級2班', 2], ['五年級4班', 1]].map(([c, s], i) => mkScore(c, s, { nwEvDone: i < 4 ? ['CW|' + c] : [] })),
      bugDoc('五年級4班', 1, 9, T0 + 1), bugDoc('五年級4班', 2, 4, T0 + 2), bugDoc(CLS, 5, 1, T0 + 3),
      mkScore('五年級4班', 1, { nwNick: '閃電咕咕鳥' }), mkScore('五年級4班', 2, { nwNick: '勇敢的獵人' })
    ]);
    Object.assign(seed, {
      'mg_events/RK': evDoc({ title: '討伐王：咕咕鳥', desc: '看誰打倒最多隻！', mk: 'coo', endAt: now + 2 * DAY }),
      'mg_events/CW': evDoc({ type: 'classwar', per: 2, goalPct: 60, mk: 'coo', title: '全班打咕咕鳥', desc: '每人 2 隻', endAt: now + 10 * DAY, items: [{ type: 'coins', n: 100 }] }),
      'mg_events/HUNT': evDoc({ type: 'hunt', mk: 'coo', goal: 5, title: '咕咕鳥大量出沒', desc: '打倒 5 隻就有獎勵。', items: [{ type: 'coins', n: 100 }] }),
      'mg_events/BOOST': evDoc({ type: 'boost', mul: 2, title: '經驗加倍週' }),
      'mg_events/SOON': evDoc({ title: '下週的比賽', metric: 'acc', minRuns: 3, startAt: now + 2 * DAY, endAt: now + 9 * DAY }),
      'mg_events/DONE': evDoc({ title: '上週的討伐王', metric: 'kills', startAt: now - 9 * DAY, endAt: now - 2 * DAY, awarded: true, result: { at: now - DAY, metric: 'kills', rows: [
        { id: '五年級4班_1號', nick: '小華', s: 9, n: 9, pick: true, rank: 1, pos: 1 }, { id: ID, nick: '星光精靈', s: 7, n: 7, pick: true, rank: 2, pos: 2 }, { id: '五年級4班_3號', nick: '微風', s: 5, n: 5, pick: true, rank: 3, pos: 3 }],
        prizes: { t1: [{ type: 'coins', n: 50 }], t23: [{ type: 'coins', n: 30 }], t410: [] }, part: [{ type: 'coins', n: 5 }], parts: [ID, '五年級4班_1號', '五年級4班_3號'] } }),
      'mg_events/WAIT': evDoc({ title: '還沒發獎的比賽', metric: 'kills', startAt: now - 9 * DAY, endAt: now - 2 * DAY }),
      'mg_events/OLDHUNT': evDoc({ type: 'hunt', mk: 'coo', goal: 5, title: '結束的討伐', startAt: now - 9 * DAY, endAt: now - 2 * DAY })
    });
    const nw = { ev: { RK: { s: 2, n: 2, e: now + 2 * DAY, t: '討伐王：咕咕鳥' }, CW: { n: 1, e: now + 10 * DAY, t: '全班打咕咕鳥' }, HUNT: { n: 3, e: now + 3 * DAY, t: '咕咕鳥大量出沒' } } };
    const p = await open(b, { seed, nw });
    await dismissGifts(p);
    await openBtn(p); await tabOf(p, 'ev');
    /* 抓蟲大作戰卡片永遠在最上面 */
    const first = await p.evaluate(() => { const c = document.querySelector('#nw-notice [data-nbody]').firstElementChild; return { bug: c.hasAttribute('data-bugcard'), t: c.textContent.replace(/\s+/g, ' ') }; });
    ok(first.bug && first.t.includes('抓蟲大作戰') && first.t.includes('常駐') && first.t.includes('我的抓蟲分') && first.t.includes('1 分') && first.t.includes('看榜單 ▶'), '抓蟲大作戰卡片在活動分頁最上面：常駐、副標、我的抓蟲分、看榜單：' + first.t);
    const cards = await p.evaluate(() => [...document.querySelectorAll('#nw-notice [data-evcard]')].map(e => e.dataset.evphase + ':' + e.dataset.evcard));
    ok(['active:RK', 'active:CW', 'active:HUNT', 'active:BOOST', 'soon:SOON', 'ended:DONE', 'ended:WAIT'].every(x => cards.includes(x)), '進行中、快開始、剛結束的卡片都在：' + cards.join(' '));
    const rkCard = await p.textContent('#nw-notice [data-evcard="RK"]');
    ok(rkCard.includes('我的成績') && rkCard.includes('2 隻') && rkCard.includes('看榜單 ▶') && await p.$('#nw-notice [data-evcard="RK"] [data-rankboard]') === null && !rkCard.includes('獵人0'), '排行榜卡片：只有我的成績和「看榜單 ▶」，沒有內嵌榜單');
    await p.screenshot({ path: SHOT('events') });
    const hRank = await p.evaluate(() => document.querySelector('#nw-notice [data-evcard="RK"]').offsetHeight);
    ok(hRank < 260, '排行榜卡片變短了：' + hRank + 'px');

    /* 點進去、返回 */
    await p.evaluate(() => { document.getElementById('nw-notice').scrollTop = 120; });
    await detail(p, 'RK');
    let t = await body(p);
    ok(await p.$('#nw-notice [data-nback]') !== null && t.includes('討伐王：咕咕鳥') && t.includes('活動排行榜') && t.includes('還有 2 天') && !/\d+\s*秒/.test(t.replace(/\d+ 秒就/g, '')), '詳情頁：返回鍵、標題、類型、還有 2 天（平靜寫法）');
    ok(t.includes('規則與怎麼算分') && t.includes('打倒') && t.includes('前 10 名'), '詳情頁：規則與怎麼算分（白話）');
    ok(!t.includes('🎁 獎勵'), '沒有獎品：不顯示獎勵這一段');
    ok(await p.$('#nw-notice [data-rankboard="RK"] [data-rbrow]') !== null && await p.evaluate(() => document.querySelectorAll('#nw-notice [data-rankboard="RK"] [data-rbrow]').length) === 10, '排行榜詳情有榜單（前 10 名）');
    ok(await p.evaluate(() => document.querySelectorAll('#nw-notice [data-rankboard="RK"] [data-rbrow] svg').length) === 3 && t.includes('更新時間') && t.includes('重新整理'), '前 3 名徽章、更新時間、重新整理');
    ok(t.includes('我的成績') && t.includes('2 隻') && await p.$('#nw-notice [data-rankboard="RK"] [data-rbmine]') === null && !t.includes('← 你'), '榜外：我的成績照顯示，我不在榜上');
    const out = await p.textContent('#nw-notice [data-rb-out]');
    ok(/再打 \d+ 隻就上榜/.test(out) && !/第\s*\d+\s*名|名次/.test(out) && !/第\s*\d+\s*名/.test(t), '榜外只有差距文字，沒有名次：' + out);
    ok(!REAL.test(t) && t.includes('502・20號') && t.includes('獵人0'), '不含真名，只有班級座號與榜上名字');
    await p.screenshot({ path: SHOT('detail') });
    await p.click('#nw-notice [data-rb-refresh]'); await p.waitForTimeout(600);
    ok(await p.$('#nw-notice [data-rankboard="RK"] [data-rbrow]') !== null, '按「重新整理」後榜單還在');
    await p.click('#nw-notice [data-nback]'); await p.waitForTimeout(700);
    ok(await p.$('#nw-notice [data-evdetail]') === null && await p.$('#nw-notice [data-evcard="RK"]') !== null && await p.$('#nw-notice') !== null, '◀ 返回：回到活動列表、視窗還開著');
    ok(await p.evaluate(() => document.getElementById('nw-notice').scrollTop) > 40, '返回後捲動位置還在');
    /* Esc：先返回、再關視窗 */
    await detail(p, 'HUNT');
    await p.keyboard.press('Escape'); await p.waitForTimeout(500);
    ok(await p.$('#nw-notice') !== null && await p.$('#nw-notice [data-evdetail]') === null && await p.$('#nw-notice [data-evcard="HUNT"]') !== null, 'Esc 第一下：先從詳情返回列表，視窗還在');
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    ok(await p.$('#nw-notice') === null, 'Esc 第二下：關掉視窗');
    ok(await p.$('.nw-sheet') === null, '沒有留下另一層視窗');

    /* 限時討伐 */
    await openBtn(p); await tabOf(p, 'ev'); await detail(p, 'HUNT');
    t = await body(p);
    ok(await p.$('#nw-notice [data-rankboard]') === null && await p.$('#nw-notice [data-nbody] .px-bar') !== null && t.includes('3 / 5 隻') && t.includes('不比名次'), '限時討伐詳情：進度條、沒有榜單');
    ok(t.includes('🎁 獎勵') && t.includes('字元 ×100'), '限時討伐有獎品：顯示獎勵');
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    /* 限時加倍 */
    await detail(p, 'BOOST'); t = await body(p);
    ok(await p.$('#nw-notice [data-rankboard]') === null && t.includes('×2') && t.includes('說明'), '限時加倍詳情：只有說明');
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    /* 班級挑戰 */
    await detail(p, 'CW'); t = await body(p);
    const cwBox = await p.textContent('#nw-notice [data-cwbox]');
    ok(/我們班：4 \/ [56] 人達標/.test(cwBox) && cwBox.includes('目標 60%'), '班級挑戰詳情：我們班的達標進度：' + cwBox.replace(/\s+/g, ' '));
    ok(t.includes('同年級前 3 名') && t.includes('501') && t.includes('502') && t.includes('503') && t.includes('← 我們班') && !t.includes('504'), '同年級前 3 用模板畫，不列最後一名');
    ok(await p.$('#nw-notice [data-rankboard^="cw-"] [data-rbrow]') !== null && t.includes('獎勵') && t.includes('字元 ×100'), '班級挑戰：模板榜單與獎勵');
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    /* 快開始 */
    await detail(p, 'SOON'); t = await body(p);
    ok(await p.$('#nw-notice [data-rankboard]') === null && t.includes('2 天後開始') && t.includes('先去委託板練功') && t.includes('規則與怎麼算分') && !t.includes('我的進度'), '快開始：開始時間與說明，不顯示排名與進度');
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    /* 剛結束、已發獎 */
    await detail(p, 'DONE'); t = await body(p);
    ok(t.includes('最後的榜單') && t.includes('得獎名單') && t.includes('504・1號') && t.includes('小華') && t.includes('微風') && t.includes('字元 ×50') && t.includes('字元 ×30'), '剛結束且已發獎：最後的榜單與得獎名單（班級座號、暱稱、獎品）');
    ok(t.includes('我的獎品') && t.includes('已經寄到信箱囉') && t.includes('參加獎') && !t.includes('老師可能會寄獎品到信箱喔'), '得獎名單：我的獎品、參加獎，不再寫「老師可能會寄」');
    ok(!REAL.test(t) && !/再[快打準]\s*\d+/.test(t), '快照詳情不含真名；結束後不再寫「再快幾秒就上榜」');
    ok(await p.$('#nw-notice [data-rb-refresh]') === null, '靜態榜單沒有重新整理按鈕');
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    /* 剛結束、沒發獎 */
    await detail(p, 'WAIT'); t = await body(p);
    ok(t.includes('最後的榜單') && t.includes('老師可能會寄獎品到信箱喔') && await p.$('#nw-notice [data-rankboard="WAIT"]') !== null && !/再打 \d+ 隻就上榜/.test(t), '剛結束沒發獎：最後的榜單＋「老師可能會寄獎品到信箱喔」');
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    await detail(p, 'OLDHUNT'); t = await body(p);
    ok(t.includes('這次沒有達標') && await p.$('#nw-notice [data-rankboard]') === null, '結束的討伐：說結果、沒有榜單');
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    /* 鍵盤開卡片 */
    await p.focus('#nw-notice [data-evopen="RK"]'); await p.keyboard.press('Enter'); await p.waitForTimeout(500);
    ok(await p.$('#nw-notice [data-evdetail="RK"]') !== null, '卡片可以用鍵盤（Enter）打開');
    noErr(p); await p.close();
  }

  /* ── 抓蟲大作戰：詳情與分頁一致 ── */
  {
    const T0 = now - 20 * DAY;
    const seed = seedOf([bugDoc('五年級4班', 1, 9, T0 + 1), bugDoc('五年級4班', 2, 6, T0 + 2), bugDoc('六年級1班', 3, 3, T0 + 3), bugDoc(CLS, 5, 4, T0 + 4),
      mkScore('五年級4班', 1, { name: '王大明', nwNick: '閃電咕咕鳥' }), mkScore('五年級4班', 2, { name: '李小華', nwNick: '勇敢的獵人' }), mkScore('六年級1班', 3, { name: '張三', nwNick: '安靜的小龍' })]);
    const p = await open(b, { seed });
    await dismissGifts(p);
    await openBtn(p); await tabOf(p, 'ev');
    ok(await p.evaluate(() => document.querySelector('#nw-notice [data-nbody]').firstElementChild.hasAttribute('data-bugcard')), '完全沒有老師開的活動：抓蟲大作戰還是在最上面');
    ok((await body(p)).includes('現在沒有活動，先去委託板打怪吧！'), '沒有活動的提示照舊');
    await detail(p, '@bug');
    let t = await body(p);
    ok(t.includes('🐛 抓蟲大作戰') && t.includes('規則與怎麼算分') && t.includes('1～3 分') && t.includes('回報問題') && t.includes('老師確認'), '抓蟲詳情：規則（回報問題 → 老師確認 → 1～3 分）');
    const badges = await p.evaluate(() => [...document.querySelectorAll('#nw-notice [data-bugbadge]')].map(e => e.dataset.bugbadge + ':' + e.dataset.got));
    ok(badges.join() === '1:1,3:1,5:0,10:0' && t.includes('抓蟲新手') && t.includes('抓蟲達人'), '徽章 1、3、5、10 分；我 4 分拿到前兩個：' + badges.join());
    ok(await p.$('#nw-notice [data-bugmine-box] .px-bar') !== null && t.includes('再拿 1 分，就有「抓蟲達人」'), '我的進度：進度條與下一個徽章');
    const rowsA = await p.$$eval('#nw-notice [data-rankboard="bug"] [data-rbrow]', r => r.map(x => x.dataset.rbid + '|' + x.textContent.replace(/\s+/g, ' ')));
    ok(rowsA.length === 4 && rowsA[0].includes('504・1號') && rowsA[0].includes('閃電咕咕鳥') && rowsA[0].includes('9 分') && rowsA[0].includes('確認 9 件'), '詳情裡的榜單（模板）：' + rowsA[0]);
    ok(!/王大明|李小華|張三|真名/.test(t), '抓蟲詳情不含真名');
    await p.screenshot({ path: SHOT('bug') });
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    ok(await p.$('#nw-notice [data-bugcard]') !== null, 'Esc 從抓蟲詳情返回活動列表');
    await tabOf(p, 'bug');
    const rowsB = await p.$$eval('#nw-notice [data-rankboard="bug"] [data-rbrow]', r => r.map(x => x.dataset.rbid + '|' + x.textContent.replace(/\s+/g, ' ')));
    ok(rowsA.join('\n') === rowsB.join('\n'), '「抓蟲榜」分頁與活動詳情的榜單資料一致');
    ok(await p.$('#nw-notice [data-nback]') === null && (await body(p)).includes('規則與怎麼算分') && (await body(p)).includes('抓蟲徽章'), '「抓蟲榜」分頁是同一份內容（沒有返回鍵）');
    noErr(p); await p.close();
  }

  /* ── 模板：載入中、讀取失敗→重試（在真的頁面裡跑 mountRankBoard） ── */
  {
    const p = await open(b, {});
    const r = await p.evaluate(async () => {
      const m = await import('/nw-rankboard.js');
      const el = document.createElement('div'); document.body.appendChild(el);
      let n = 0, release;
      const gate = new Promise(res => { release = res; });
      const rb = m.mountRankBoard(el, {
        load: async () => { n++; if (n === 1) { await gate; throw new Error('boom'); } return { at: Date.now(), rows: [{ rank: 1, label: '501・1號', score: 3 }] }; },
        shell: () => ({ id: 'x', title: '測試榜' }), toSpec: d => ({ id: 'x', title: '測試榜', unit: '分', rows: d.rows })
      });
      const pr = rb.run(false);
      const s1 = el.querySelector('[data-rb-state]').dataset.rbState;
      release(); await pr;
      const s2 = el.querySelector('[data-rb-state]').dataset.rbState;
      el.querySelector('[data-rb-retry]').click(); await new Promise(r => setTimeout(r, 100));
      const s3 = el.querySelector('[data-rb-state]').dataset.rbState, rows = el.querySelectorAll('[data-rbrow]').length;
      el.querySelector('[data-rb-refresh]').click(); await new Promise(r => setTimeout(r, 100));
      return { s1, s2, s3, rows, n, time: !!el.querySelector('[data-rb-time]').textContent.match(/\d\d:\d\d/) };
    });
    ok(r.s1 === 'loading' && r.s2 === 'error' && r.s3 === 'ok' && r.rows === 1 && r.n === 3 && r.time, '頁面裡：載入中 → 讀取失敗 → 按「再試一次」→ 有榜單；「重新整理」會重讀、有更新時間：' + JSON.stringify(r));
    await p.close();
  }

  /* ── 手機 390 寬：不橫向捲動 ── */
  {
    const seed = seedOf([
      ...Array.from({ length: 12 }, (_, i) => mkScore('五年級2班', 20 + i, { nwCls: '', nwNick: '很長很長的暱稱名字測試用' + i, nw: { ev: { RK: { s: 30 - i, n: 30 - i } } } })),
      ...[6, 7, 8, 9].map(s => mkScore(CLS, s, { nwEvDone: ['CW|' + CLS] })), mkScore('五年級1班', 1, { nwEvDone: ['CW|五年級1班'] }), mkScore('五年級2班', 1, { nwEvDone: ['CW|五年級2班'] }), mkScore('五年級4班', 1),
      bugDoc('五年級4班', 1, 9, now - DAY), bugDoc(CLS, 5, 2, now - 2 * DAY), mkScore('五年級4班', 1, { nwNick: '閃電咕咕鳥' })
    ]);
    Object.assign(seed, {
      'mg_events/RK': evDoc({ title: '討伐王：咕咕鳥，標題故意取得很長很長很長很長', desc: '看誰打倒最多隻！', mk: 'coo' }),
      'mg_events/CW': evDoc({ type: 'classwar', per: 2, goalPct: 60, mk: 'coo', title: '全班打咕咕鳥', items: [{ type: 'coins', n: 100 }] })
    });
    const p = await open(b, { seed, vw: 390, vh: 800, nw: { ev: { RK: { s: 2, n: 2, e: now + 3 * DAY, t: 'x' }, CW: { n: 1, e: now + 3 * DAY, t: 'y' } } } });
    await dismissGifts(p);
    await openBtn(p); await tabOf(p, 'ev');
    let w = await hscroll(p);
    ok(w.page <= 0 && w.sheet <= 0, '手機 390：活動分頁不橫向捲動 ' + JSON.stringify(w));
    await detail(p, 'RK'); w = await hscroll(p);
    ok(w.page <= 0 && w.sheet <= 0 && await p.$('#nw-notice [data-rbrow]') !== null, '手機 390：排行榜詳情不橫向捲動 ' + JSON.stringify(w));
    await p.screenshot({ path: SHOT('mobile') });
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    await detail(p, 'CW'); w = await hscroll(p);
    ok(w.page <= 0 && w.sheet <= 0, '手機 390：班級挑戰詳情不橫向捲動 ' + JSON.stringify(w));
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    await detail(p, '@bug'); w = await hscroll(p);
    ok(w.page <= 0 && w.sheet <= 0 && await p.$('#nw-notice [data-bugbadge]') !== null, '手機 390：抓蟲大作戰詳情不橫向捲動 ' + JSON.stringify(w));
    await p.screenshot({ path: SHOT('mobile-bug') });
    noErr(p); await p.close();
  }

  await b.close();
  console.log(fails ? `\n${fails} 項失敗` : '\n全部通過');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
