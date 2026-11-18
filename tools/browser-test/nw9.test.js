/* 第 5 步：佈告欄建築、視窗三個分頁（公告｜活動｜抓蟲榜）、抓蟲榜、抓蟲徽章、活動榜的合理範圍。
   全程開 window.__RULES（學生只能讀 mg_news、mg_bugboard、mg_events，不能寫）。
   純函式（nw-notice.js、nw-events.js、nw-data.js）直接在 node 測，畫面用假 Firebase。 */
const { chromium } = require('playwright'); const fs = require('fs');
const path = require('path'); const M = path.join(__dirname, 'mock') + '/'; const OUT = process.argv[2] || require('os').tmpdir();
const css = require('./tw.js')(OUT);
/* 最新一則改版公告的 id：發新公告時不用回來改測試（「已讀」的種子資料要等於它，不然會跳公告、冒「！」） */
const NOTICE_ID = /export const NOTICES = \[\s*\{ id: '([^']+)'/.exec(fs.readFileSync(path.join(__dirname, '../../nw-data.js'), 'utf8'))[1];
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const ID = '五年級3班_5號', CLS = '五年級3班';
const HOUR = 3600000, DAY = 86400000;
const now = Date.now();

/* o.intro＝true：不關掉「第一次」的畫面（測自動跳出來、第一次介紹） */
async function open(browser, o = {}) {
  const p = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const errs = []; p.on('dialog', d => d.accept());
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  const { sha256Hex } = await import('../../nw-access.js');
  const hash = await sha256Hex('Test-Pass_9!x');
  const seed = Object.assign({
    ['mg_scores/' + ID]: { className: CLS, seat: 5, name: '小明', bestLevel: 10, bestScore: 20, scoreVer: 2, plays: 9, tutorialDone: true, talentIntroDone: true, tier: 'B', balanceVer: 3, punctDone: true,
      nw: Object.assign({ v: 1, savedAt: 5, look: { style: 1, hair: 2, skin: 1 }, starter: 'dagger', quest: { done: ['1-0', '1-0a'] }, items: { potion: 3 }, intro: { hub: 1 }, seenNotice: NOTICE_ID, nick: ['a_flash', 'b_coo'] }, o.nw || {}) }
  }, o.seed || {});
  await p.addInitScript(a => {
    window.__FS = a.s; window.__RULES = true; localStorage.clear(); localStorage.setItem('mg_nw_fast', '1');
    window.__NW_CODE_HASH__ = a.hash; localStorage.setItem('mg_nw_code', a.hash); window.__NW_NOGIFT__ = true; if (!a.intro) window.__NW_NOINTRO__ = true;
    window.confetti = () => {}; window.html2canvas = async () => document.createElement('canvas');
  }, { s: seed, hash, intro: !!o.intro });
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
  await p.click('#nw-door'); await p.waitForTimeout(o.wait || 1800);
  return p;
}
const FS = (p, k) => p.evaluate(k => window.__FS[k], k);
const nwLocal = p => p.evaluate(() => JSON.parse(JSON.stringify(window.__NWG.nw)));
const noErr = (p, m = '沒有 JS 錯誤') => ok(p.errs.length === 0, m + ' ' + p.errs.join(' | '));
const dismissGifts = async p => { for (let i = 0; i < 12; i++) { if (!(await p.$('#nw-gift'))) break; await p.click('#nw-gift [data-ok]'); await p.waitForTimeout(150); } };
const seedOf = arr => Object.fromEntries(arr);
const evDoc = (o = {}) => Object.assign({ type: 'ranking', metric: 'kills', title: '測試活動', desc: '', startAt: now - HOUR, endAt: now + 3 * DAY, cls: [] }, o);
const mkScore = (cls, seat, o = {}) => [`mg_scores/${cls}_${seat}號`, Object.assign({ className: cls, seat, name: `真名${cls}${seat}`, nwCls: cls, nwEvDone: [], nwNick: '', nw: { ev: {} } }, o)];
const bugDoc = (cls, seat, score, firstAt, o = {}) => [`mg_bugboard/${cls}_${seat}號`, Object.assign({ className: cls, seat, score, n: score, firstAt }, o)];
const tabOf = (p, k) => p.click(`#nw-notice [data-ntab="${k}"]`).then(() => p.waitForTimeout(500));
const bodyText = p => p.textContent('#nw-notice');
const openBtn = async p => { await p.click('[data-act="notice"]'); await p.waitForSelector('#nw-notice'); await p.waitForTimeout(400); };
const closeNotice = async p => { await p.click('#nw-notice [data-close]'); await p.waitForTimeout(300); };
const bangOn = p => p.evaluate(() => { const e = document.querySelector('[data-notice-bang]'); return !!e && getComputedStyle(e).display !== 'none'; });
const dotOn = p => p.evaluate(() => { const e = document.querySelector('[data-noticedot]'); return !!e && getComputedStyle(e).display !== 'none'; });

(async () => {
  const N = await import('../../nw-notice.js');
  const E = await import('../../nw-events.js');
  const D = await import('../../nw-data.js');

  /* ── 純函式：老師公告 ── */
  ok(N.normalizeNews('a', { title: '  ' }) === null && N.normalizeNews('a', null) === null && N.normalizeNews('a', { title: '好', body: 'x', t: { toMillis: () => 9 } }).t === 9, 'normalizeNews：沒標題丟掉、時間可以是 Timestamp');
  const sn = N.sortNews([{ id: 'n1', pin: false, t: 300 }, { id: 'p1', pin: true, t: 100 }, { id: 'n2', pin: false, t: 200 }, { id: 'p2', pin: true, t: 150 }]);
  ok(sn.map(x => x.id).join() === 'p2,p1,n1,n2', '老師公告：置頂在前、同組新的在前：' + sn.map(x => x.id).join());
  ok(N.newsLatest(sn) === 300 && N.newsLatest([]) === 0, 'newsLatest：最新一則的 t');

  /* ── 純函式：抓蟲榜 ── */
  ok(D.clsShort('五年級4班') === '504' && D.clsShort('六年級12班') === '612' && D.clsShort('一年級1班') === '101', 'clsShort：五年級4班→504、六年級12班→612');
  const bd = (id, score, firstAt, o = {}) => Object.assign({ id, className: '五年級4班', seat: 1, score, n: score, firstAt }, o);
  const bb = N.composeBugBoard([bd('a', 3, 500), bd('b', 5, 900), bd('c', 3, 100), bd('z', 0, 1), bd('d', 3, 100)], { id: 'x', score: 0, n: 0 });
  ok(bb.rows.map(r => r.id).join() === 'b,c,d,a', '抓蟲榜排序：分數高的在前；同分 firstAt 早的在前；再同分比文件 ID；0 分不上榜：' + bb.rows.map(r => r.id).join());
  ok(bb.rows.map(r => r.rank).join() === '1,2,3,4' && bb.rows[0].cls === '504', '名次 1、2、3…；班級短碼 504');
  const full = Array.from({ length: 12 }, (_, i) => bd('p' + i, 20 - i, i));
  const bf = N.composeBugBoard(full, { id: 'me', score: 7, n: 2 });
  ok(bf.rows.length === 10 && bf.last === 11 && !bf.inTop && bf.text === '再拿 5 分就上榜！', '自己不在前 10：只寫「再拿 N 分就上榜！」（第 10 名 11 分、我 7 分 → 5 分）：' + bf.text);
  ok(!/第\s*\d+\s*名/.test(bf.text), '榜外文字不寫第幾名');
  ok(N.composeBugBoard(full, { id: 'p3', score: 17, n: 1 }).inTop, '自己在前 10：標 mine、不寫榜外文字');
  ok(N.composeBugBoard([], { id: 'me', score: 0, n: 0 }).text === '還沒有回報被確認，去找找看吧！', '0 分：還沒有回報被確認，去找找看吧！');
  ok(N.bugGapText(1, 2) === '再拿 2 分就上榜！' && N.bugGapText(2, 2) === '再拿 1 分就上榜！', 'bugGapText：同分也要再 1 分（同分看 firstAt，不能保證）');

  /* ── 純函式：活動榜的合理範圍 ── */
  const evImp = { type: 'ranking', metric: 'improve', mk: 'frog' }, evFas = { type: 'ranking', metric: 'fastest', mk: 'frog' }, evKil = { type: 'ranking', metric: 'kills' };
  ok(E.saneScore(evImp, D.IMPROVE_SANE_MAX) && !E.saneScore(evImp, D.IMPROVE_SANE_MAX + 1), `saneScore：進步獎超過 ${D.IMPROVE_SANE_MAX}% 不合理`);
  ok(E.saneScore(evFas, D.FASTEST_FLOOR.frog) && !E.saneScore(evFas, D.FASTEST_FLOOR.frog - 0.1), `saneScore：最快討伐比泡泡蛙下限 ${D.FASTEST_FLOOR.frog} 秒還快不合理`);
  ok(E.saneScore(evKil, 999) && E.saneScore({ metric: 'fastest' }, Math.min(...Object.values(D.FASTEST_FLOOR))) && !E.saneScore({ metric: 'fastest' }, 1), '討伐王沒有上限；沒指定魔物的最快討伐用最小的下限');
  const cr = [{ id: 'o1', s: 95 }, { id: 'o2', s: 70 }, { id: 'o3', s: 55 }, { id: 'o4', s: 40 }];
  const c1 = E.composeBoard(evImp, cr, { s: 30, base: 30, best: 21, n: 3 }, 'me');
  ok(c1.rows.map(r => r.s).join() === '55,40,30', 'composeBoard：超過 60% 的分數不在公開榜：' + c1.rows.map(r => r.s).join());
  const c2 = E.composeBoard(evImp, cr, { s: 80, base: 30, best: 6, n: 3 }, 'me');
  ok(!c2.rows.some(r => r.mine) && c2.outOfRange && c2.text === '' && c2.rows.map(r => r.s).join() === '55,40', '自己的分數超出範圍：不上公開榜、不寫「差多少就上榜」，標 outOfRange');
  const c3 = E.composeBoard(evImp, [{ id: 'me', s: 80 }, ...cr], { s: 50, base: 30, best: 15, n: 3 }, 'me');
  ok(c3.rows.some(r => r.mine && r.s === 50), '自己本機分數合理、雲端舊分數不合理：以本機的為準上榜');

  /* ── 徽章、村長台詞 ── */
  const wd = id => D.WORDS.find(w => w.id === id);
  const nwB = s => ({ bugScore: s, bugs: 0, awards: {} });
  ok(['bug1', 'bug3', 'bug5', 'bug10'].every(id => wd(id)), 'WORDS 有 bug1、bug3、bug5、bug10');
  ok(wd('bug1').test(nwB(1)) && !wd('bug1').test(nwB(0)) && wd('bug3').test(nwB(3)) && !wd('bug3').test(nwB(2)) && wd('bug5').test(nwB(5)) && !wd('bug5').test(nwB(4)) && wd('bug10').test(nwB(10)) && !wd('bug10').test(nwB(9)), '徽章條件看抓蟲分 1／3／5／10');
  const names = ['bug1', 'bug3', 'bug5', 'bug10'].map(id => wd(id).w);
  ok(new Set([...names, '除蟲員', '蟲蟲剋星', '職業除錯師']).size === 7 && names.every(n => n.startsWith('抓蟲')), '徽章名稱：' + names.join('、') + '（跟除蟲員、蟲蟲剋星、職業除錯師不重複）');
  ok(D.VILLAGE.npcs.find(n => n.id === 'elder').say.includes('廣場上的佈告欄會貼活動和公告，記得常常去看！'), '村長台詞加了佈告欄那句');
  const nb = D.VILLAGE.buildings.find(x => x.id === 'notice');
  ok(nb && nb.kind === 'notice' && nb.act === 'notice' && !nb.wip && D.buildingOpen(nb), 'VILLAGE.buildings 有佈告欄（act: notice、不是施工中）');

  const b = await chromium.launch();

  /* ── 建築與視窗 ── */
  {
    const news = {
      'mg_news/n1': { title: '電腦課要換位子', body: '下週一起，\n請照新座位表坐。', pin: false, t: now - 3 * HOUR },
      'mg_news/p1': { title: '打字比賽報名', body: '到老師那裡報名', pin: true, t: now - 5 * DAY },
      'mg_news/n0': { title: '舊消息', body: '', pin: false, t: now - 9 * DAY }
    };
    const p = await open(b, { seed: news });
    ok(await p.$('.vb[data-bld="notice"]') !== null, '村莊有「佈告欄」建築熱區');
    ok(await bangOn(p) && await dotOn(p), '有沒看過的老師公告：木板上方有「！」、上方按鈕有小紅點');
    const px = await p.evaluate(() => { const c = document.querySelector('#vmap canvas'); return !!c; });
    ok(px, '村莊畫面有畫出來');
    await p.screenshot({ path: OUT + '/nw9-village.png' });
    await p.click('.vb[data-bld="notice"]'); await p.waitForSelector('#nw-notice', { timeout: 6000 }); await p.waitForTimeout(500);
    let t = await bodyText(p);
    ok(t.includes('佈告欄') && ['公告', '活動', '抓蟲榜'].every(x => t.includes(x)), '點建築：打開視窗，有「公告」「活動」「抓蟲榜」三個分頁');
    ok(await p.evaluate(() => document.querySelectorAll('#nw-notice [data-ntab]').length) === 3, '三個分頁按鈕');
    const order = await p.evaluate(() => [...document.querySelectorAll('#nw-notice [data-news]')].map(e => e.dataset.news));
    ok(order.join() === 'p1,n1,n0', '老師公告：置頂的在最前面：' + order.join());
    ok(t.includes('打字比賽報名') && t.includes('置頂') && t.includes('新世界改版啦') && t.includes('改版公告'), '公告分頁：老師公告＋原本的改版公告');
    ok((await p.evaluate(() => document.querySelector('#nw-notice [data-news="n1"]').innerHTML)).includes('<br>'), '公告內文的換行保留，且不會被當成 HTML');
    const chips = () => p.evaluate(() => [...document.querySelectorAll('#nw-notice [data-news]')].filter(e => [...e.querySelectorAll('.px-chip')].some(c => c.textContent === '新')).length);
    ok(await chips() === 3, '第一次看：三則都標「新」');
    let n = await nwLocal(p);
    ok(n.seenNews === now - 3 * HOUR && n.seenNotice === NOTICE_ID, `看過公告分頁：seenNews 記最新一則的 t（${n.seenNews}）`);
    await closeNotice(p);
    ok(!(await bangOn(p)) && !(await dotOn(p)), '看過公告後：「！」與小紅點消失');
    await p.click('[data-act="notice"]'); await p.waitForSelector('#nw-notice'); await p.waitForTimeout(400);
    ok(await p.$('#nw-notice [data-ntab]') !== null && (await bodyText(p)).includes('打字比賽報名'), '上方「📢 佈告欄」按鈕打開同一個視窗');
    ok(await chips() === 0, '看過之後再開：沒有「新」標記');
    await closeNotice(p);
    noErr(p); await p.close();
  }

  /* ── 老師公告：新的跳一次、新人不跳 ── */
  {
    const seed = { 'mg_news/n1': { title: '新的消息', body: '內容在這裡', pin: false, t: now - HOUR }, 'mg_news/p1': { title: '老的置頂', body: '', pin: true, t: now - 3 * DAY } };
    const p = await open(b, { seed, intro: true, nw: { seenNews: now - 2 * DAY } });
    await p.waitForSelector('#nw-notice', { timeout: 6000 });
    const t = await bodyText(p);
    ok(t.includes('新的消息') && !t.includes('老的置頂') && !t.includes('新世界改版啦') && t.includes('只會跳一次'), '老玩家進村：自動跳出「新的」老師公告（舊的、已看過的改版公告不重複）');
    ok(await p.$('#nw-notice [data-ntab]') === null, '自動跳出來的是簡單版，沒有分頁');
    await p.click('#nw-notice [data-close]'); await p.waitForTimeout(400);
    ok((await nwLocal(p)).seenNews === now - HOUR && !(await bangOn(p)), '關掉後：seenNews 記到最新、「！」消失');
    await p.evaluate(() => { window.__NWG.leave(); }); await p.waitForTimeout(500);
    await p.click('#nw-door'); await p.waitForTimeout(1800);
    ok(await p.$('#nw-notice') === null, '再進一次：不會再跳');
    noErr(p); await p.close();
  }
  {
    const seed = { 'mg_news/n1': { title: '新的消息', body: '', pin: false, t: now - HOUR } };
    const p = await open(b, { seed, intro: true, nw: { intro: {}, seenNotice: '' }, wait: 1500 });
    for (let i = 0; i < 4 && await p.$('#nw-intro'); i++) { await p.click('#nw-intro [data-next]'); await p.waitForTimeout(300); }
    await p.waitForTimeout(1200);
    ok(await p.$('#nw-notice') === null, '第一次來的新人：看完介紹就好，老師公告與改版公告都不跳');
    const n = await nwLocal(p);
    ok(n.seenNews === now - HOUR && n.seenNotice === NOTICE_ID, '新人直接記成已讀（seenNews、seenNotice）');
    ok(!(await bangOn(p)), '新人沒有「！」');
    noErr(p); await p.close();
  }

  /* ── 第一次進佈告欄的介紹 ── */
  {
    const p = await open(b, { intro: true });
    await p.click('.vb[data-bld="notice"]'); await p.waitForSelector('#nw-intro', { timeout: 6000 });
    ok((await p.textContent('#nw-intro')).includes('佈告欄') && (await p.textContent('#nw-intro')).includes('！'), '第一次點佈告欄：先跳介紹');
    await p.click('#nw-intro [data-next]'); await p.waitForSelector('#nw-notice', { timeout: 6000 });
    ok((await nwLocal(p)).intro.notice === 1, '看完介紹接著打開視窗，intro.notice 記為看過');
    noErr(p); await p.close();
  }

  /* ── 活動分頁 ── */
  {
    const D5 = 5 * DAY;
    const seed = seedOf([
      ...[6, 7, 8, 9].map(s => mkScore(CLS, s, { nwEvDone: ['CW|' + CLS] })), mkScore(CLS, 10),
      ...[['五年級1班', 1], ['五年級1班', 2], ['五年級2班', 1], ['五年級2班', 2], ['五年級4班', 1]].map(([c, s], i) => mkScore(c, s, { nwEvDone: i < 4 ? ['CW|' + c] : [] })),
      /* 榜單的人 nwCls 留空，才不會算進班級挑戰的分母 */
      ...[95, 90, 70, 55, 40].map((s, i) => mkScore('五年級2班', 20 + i, { nwCls: '', nwNick: '勇敢的獵人', nw: { ev: { IMP: { s, n: 5 } } } })),
      ...[8, 7, 6].map((s, i) => mkScore('六年級1班', 30 + i, { nwCls: '', nwNick: '', nw: { ev: { KIL: { s, n: s } } } }))
    ]);
    Object.assign(seed, {
      'mg_events/HUNT': evDoc({ type: 'hunt', mk: 'coo', goal: 5, title: '咕咕鳥大量出沒', desc: '打倒 5 隻就有獎勵。', endAt: now + 3 * DAY }),
      'mg_events/CW': evDoc({ type: 'classwar', per: 2, goalPct: 60, mk: 'coo', title: '全班打咕咕鳥', desc: '每人 2 隻', endAt: now + 10 * DAY }),
      'mg_events/IMP': evDoc({ metric: 'improve', mk: 'frog', title: '進步獎：泡泡蛙', desc: '比以前快', endAt: now + 10 * DAY }),
      'mg_events/KIL': evDoc({ metric: 'kills', title: '討伐王', endAt: now + 2 * DAY }),
      'mg_events/SOON': evDoc({ type: 'boost', mul: 2, title: '經驗加倍週', startAt: now + 2 * DAY, endAt: now + 9 * DAY }),
      'mg_events/OLD': evDoc({ type: 'boost', mul: 2, title: '上週的加倍', startAt: now - 9 * DAY, endAt: now - 2 * DAY }),
      'mg_events/OTHER': evDoc({ type: 'boost', mul: 2, title: '別班的活動', cls: ['六年級1班'] })
    });
    const p = await open(b, { seed, nw: { ev: { HUNT: { n: 3, e: now + 3 * DAY, t: '咕咕鳥大量出沒' }, CW: { n: 1, e: now + 10 * DAY, t: '全班打咕咕鳥' }, IMP: { s: 80, base: 30, best: 6, n: 4, e: now + 10 * DAY, t: '進步獎：泡泡蛙' }, KIL: { s: 2, n: 2, e: now + 2 * DAY, t: '討伐王' } } } });
    ok(await bangOn(p), '有進行中的活動還沒看過：「！」亮著');
    await openBtn(p); await tabOf(p, 'ev');
    const t = await bodyText(p);
    const phases = await p.evaluate(() => [...document.querySelectorAll('#nw-notice [data-evcard]')].map(e => e.dataset.evphase + ':' + e.dataset.evcard));
    ok(phases.filter(x => x.startsWith('active')).length === 4 && phases.includes('soon:SOON') && phases.includes('ended:OLD') && !phases.some(x => x.endsWith('OTHER')), '進行中 4 張、快開始 1 張、剛結束 1 張、別班的不顯示：' + phases.join(' '));
    ok(t.includes('還有 3 天') && t.includes('還有 2 天') && t.includes('2 天後開始'), '時間文字：還有 3 天／2 天後開始（不倒數秒）：' + t.replace(/\s+/g, ' ').slice(0, 80));
    ok(t.includes('老師可能會寄獎品到信箱喔') && t.includes('已結束'), '剛結束：老師可能會寄獎品到信箱喔');
    ok(t.includes('3 / 5 隻'), '限時討伐：我的進度 3 / 5 隻');
    ok(await p.evaluate(() => { const c = document.querySelector('#nw-notice [data-evphase="soon"]'); return c && parseFloat(getComputedStyle(c).opacity) < 1; }), '快開始是灰卡片（變淡）');
    ok(await p.evaluate(() => document.querySelectorAll('#nw-notice [data-evcard="HUNT"] .px-bar').length === 1), '我的進度條');
    await p.waitForTimeout(500);
    const cw = await p.textContent('#nw-notice [data-cwx="CW"]');
    ok(/4 \/ [56] 人達標/.test(cw) && cw.includes('全班達標了') && cw.includes('目標 60%'), '班級挑戰：自己班達標進度（分子 4 ／ 分母）、目標與達標訊息：' + cw.replace(/\s+/g, ' '));
    ok(cw.includes('同年級前 3 名') && cw.includes('501') && cw.includes('502') && cw.includes('503') && cw.includes('我們班') && !cw.includes('504'), '同年級前 3（501、502、503），不列最後一名 504：' + cw.replace(/\s+/g, ' '));
    const imp = await p.textContent('#nw-notice [data-rkx="IMP"]');
    ok(!imp.includes('95%') && !imp.includes('90%') && !imp.includes('70%') && imp.includes('進步 55%') && imp.includes('進步 40%'), '進步獎榜：超過 60% 的分數不放上公開的前 10：' + imp.replace(/\s+/g, ' '));
    ok(!imp.includes('← 你') && imp.includes('你的成績很特別'), '自己 80% 超出範圍：不在榜上，只對自己說明');
    ok(t.includes('進步 80%'), '自己的進度照常看得到（我的成績：進步 80%）');
    ok(imp.includes('502・23號・勇敢的獵人') && !imp.includes('502・20號') && !/真名/.test(imp), '榜單列：502・23號・暱稱，沒有真名；超範圍的 20 號不在榜上');
    const kil = await p.textContent('#nw-notice [data-rkx="KIL"]');
    ok(kil.includes('601・30號・神秘獵人') && kil.includes('← 你') && kil.includes('2 隻'), '討伐王：沒暱稱顯示神秘獵人、自己上榜標「← 你」');
    ok(await p.evaluate(() => document.querySelectorAll('#nw-notice [data-evcard="KIL"] svg').length) >= 3, '前 3 名有金銀銅像素徽章');
    await p.screenshot({ path: OUT + '/nw9-events.png' });
    const n = await nwLocal(p);
    ok(['HUNT', 'CW', 'IMP', 'KIL'].every(id => n.seenEv[id]) && !n.seenEv.SOON, '看過活動分頁：進行中的活動記進 seenEv（快開始的不算）');
    await closeNotice(p);
    ok(!(await bangOn(p)), '看過後「！」消失');
    noErr(p); await p.close();
  }
  {
    const p = await open(b, { seed: { 'mg_events/SOON': evDoc({ type: 'boost', mul: 2, title: '還沒開始', startAt: now + DAY, endAt: now + 5 * DAY }) } });
    ok(!(await bangOn(p)), '只有快開始的活動：不亮「！」');
    await openBtn(p); await tabOf(p, 'ev');
    const t = await bodyText(p);
    ok(t.includes('現在沒有活動，先去委託板打怪吧！') && t.includes('明天開始'), '沒有進行中的活動：現在沒有活動，先去委託板打怪吧！（快開始的灰卡片還在）' + t.replace(/\s+/g, ' ').slice(0, 200));
    noErr(p); await p.close();
  }
  {
    const p = await open(b, {});
    await openBtn(p); await tabOf(p, 'ev');
    ok((await bodyText(p)).includes('現在沒有活動，先去委託板打怪吧！') && await p.$('#nw-notice [data-evcard]') === null, '完全沒活動：只有那句話');
    noErr(p); await p.close();
  }

  /* ── 抓蟲榜 ── */
  {
    /* 10 個人：9 個分數不同，第 10 名那一分（2 分）有兩個人：J（ID 排前面、firstAt 晚）、K（ID 排後面、firstAt 早）。
       另外 5 分有兩個人，ID 順序跟 firstAt 順序相反。 */
    const T0 = now - 20 * DAY;
    const arr = [
      bugDoc('五年級4班', 1, 9, T0 + 1), bugDoc('五年級4班', 2, 8, T0 + 2), bugDoc('六年級1班', 3, 7, T0 + 3), bugDoc('六年級2班', 3, 6, T0 + 4),
      bugDoc('五年級4班', 5, 5, T0 + 9), bugDoc('五年級4班', 12, 5, T0 + 5), bugDoc('五年級4班', 7, 4, T0 + 6), bugDoc('五年級4班', 8, 3, T0 + 7),
      bugDoc('五年級4班', 10, 2, T0 + 99), bugDoc('五年級4班', 11, 2, T0 + 10), bugDoc('五年級4班', 13, 2, T0 + 50),
      bugDoc(CLS, 5, 1, T0 + 11), bugDoc('五年級4班', 9, 0, T0 + 12)
    ];
    const seed = seedOf([
      ...arr,
      mkScore('五年級4班', 1, { name: '王大明', nwNick: '閃電咕咕鳥' }), mkScore('五年級4班', 2, { name: '李小華', nwNick: '勇敢的獵人' }),
      mkScore('六年級1班', 3, { name: '張三', nwNick: '安靜的小龍' }), mkScore('六年級2班', 3, { name: '趙四', nwNick: '被隱藏的暱稱' }),
      mkScore('五年級4班', 5, { name: '孫五', nwNick: '' }), mkScore('五年級4班', 12, { name: '周十二', nwNick: '星光精靈' }),
      mkScore('五年級4班', 7, { name: '吳七', nwNick: '彗星守護者' }), mkScore('五年級4班', 8, { name: '鄭八', nwNick: '微風史萊姆' }),
      mkScore('五年級4班', 10, { name: '馮十', nwNick: '晚到的人' }), mkScore('五年級4班', 11, { name: '陳十一', nwNick: '早到的人' }), mkScore('五年級4班', 13, { name: '衛十三', nwNick: '中間的人' })
    ]);
    seed['mg_bugboard/六年級2班_3號'].hideNick = true;
    const p = await open(b, { seed });
    await dismissGifts(p);
    await p.evaluate(() => { window.__READS.length = 0; });
    await openBtn(p); await tabOf(p, 'bug');
    const t = await bodyText(p);
    ok(t.includes('🐛 抓蟲大作戰') && t.includes('發現遊戲怪怪的地方，到「回報問題」寫下來；老師確認後就會上榜！'), '標題與副標照規格');
    const rows = await p.evaluate(() => [...document.querySelectorAll('#nw-notice [data-bugrow]')].map(e => ({ id: e.dataset.bugrow, text: e.textContent.replace(/\s+/g, ' '), svg: e.querySelectorAll('svg').length })));
    const ids = rows.map(r => r.id);
    const want = ['五年級4班_1號', '五年級4班_2號', '六年級1班_3號', '六年級2班_3號', '五年級4班_12號', '五年級4班_5號', '五年級4班_7號', '五年級4班_8號', '五年級4班_11號', '五年級4班_13號'];
    ok(ids.join('|') === want.join('|'), '前 10 名順序：同分 5 分的 12 號（firstAt 早）在 5 號前面；第 10 名同分（2 分）的三人，firstAt 最早的 11、13 號進榜、晚的 10 號被擠出：' + ids.join(','));
    ok(rows[0].svg === 1 && rows[1].svg === 1 && rows[2].svg === 1 && rows[3].svg === 0, '前 3 名有像素徽章（金銀銅），第 4 名起是數字');
    const golds = await p.evaluate(() => [...document.querySelectorAll('#nw-notice [data-bugrow] svg')].slice(0, 3).map(s => [...s.querySelectorAll('rect')].map(r => r.getAttribute('fill')).join(',')));
    ok(new Set(golds).size === 3, '三個徽章顏色不同：金、銀、銅');
    ok(rows[0].text.includes('504・1號') && rows[0].text.includes('閃電咕咕鳥') && rows[0].text.includes('9 分') && rows[0].text.includes('確認 9 件'), '每列：504・1號、暱稱、分數、確認件數：' + rows[0].text);
    ok(rows[2].text.includes('601・3號') && rows[2].text.includes('安靜的小龍'), '六年級1班 → 601：' + rows[2].text);
    ok(rows[3].text.includes('神秘獵人') && !rows[3].text.includes('被隱藏的暱稱'), 'hideNick：顯示神秘獵人、不洩漏暱稱');
    ok(rows.find(r => r.id === '五年級4班_5號').text.includes('神秘獵人'), '沒取暱稱：神秘獵人');
    ok(!/王大明|李小華|張三|趙四|孫五|周十二|吳七|鄭八|真名|小明/.test(t), '整個視窗沒有任何真名（含自己的）');
    const reads = await p.evaluate(() => window.__READS.map(r => r.path));
    ok(!reads.some(x => x.startsWith('mg_nw_flags')), '沒有讀 mg_nw_flags');
    ok(t.includes('再拿 2 分就上榜！') && !t.includes('← 你'), '自己（1 分）不在前 10：只寫「再拿 2 分就上榜！」（第 10 名 2 分）：' + (t.match(/再拿[^！]*！/) || [''])[0]);
    ok(!/第\s*\d+\s*名/.test(t), '不顯示第幾名');
    await p.screenshot({ path: OUT + '/nw9-bug.png' });
    ok((await nwLocal(p)).seenBug === 1, '看過抓蟲榜：seenBug 記下我的抓蟲分');
    /* 分頁記住 */
    await closeNotice(p); await p.click('[data-act="notice"]'); await p.waitForSelector('#nw-notice'); await p.waitForTimeout(600);
    ok((await p.textContent('#nw-notice')).includes('🐛 抓蟲大作戰') && await p.evaluate(() => document.querySelector('#nw-notice [data-ntab="bug"]').classList.contains('gold')), '分頁記住上次看的（抓蟲榜）');
    ok(await p.evaluate(() => localStorage.getItem('mg_nw_ntab')) === 'bug', '記在 localStorage');
    noErr(p); await p.close();
  }
  {
    /* 自己在前 10：標「← 你」；暱稱是自己的（本機） */
    const seed = seedOf([bugDoc(CLS, 5, 4, now - DAY), bugDoc('五年級4班', 1, 6, now - 2 * DAY), bugDoc('五年級4班', 2, 2, now - 3 * DAY), mkScore('五年級4班', 1, { nwNick: '閃電咕咕鳥' })]);
    const p = await open(b, { seed });
    await dismissGifts(p);
    await openBtn(p); await tabOf(p, 'bug');
    const rows = await p.evaluate(() => [...document.querySelectorAll('#nw-notice [data-bugrow]')].map(e => e.textContent.replace(/\s+/g, ' ')));
    ok(rows.length === 3 && rows[1].includes('503・5號') && rows[1].includes('← 你') && rows[1].includes('閃電咕咕鳥'), '自己在榜上：標「← 你」，用自己的暱稱（閃電咕咕鳥）：' + rows[1]);
    ok(await p.$('#nw-notice [data-bugtext]') === null, '在榜上就不寫榜外文字');
    noErr(p); await p.close();
  }
  {
    const seed = seedOf([bugDoc('五年級4班', 1, 3, now - DAY), bugDoc(CLS, 5, 0, now)]);
    const p = await open(b, { seed });
    await openBtn(p); await tabOf(p, 'bug');
    ok((await p.textContent('#nw-notice [data-bugtext]')).includes('還沒有回報被確認，去找找看吧！'), '0 分：還沒有回報被確認，去找找看吧！');
    ok(await p.evaluate(() => document.querySelectorAll('#nw-notice [data-bugrow]').length) === 1, '榜上只有 1 人（0 分的不列）');
    noErr(p); await p.close();
  }
  {
    const p = await open(b, {});
    await openBtn(p); await tabOf(p, 'bug');
    const t = await bodyText(p);
    ok(t.includes('還沒有回報被確認，去找找看吧！') && t.includes('還沒有人上榜'), '沒有 mg_bugboard 資料：榜是空的、我 0 分');
    noErr(p); await p.close();
  }

  /* ── 抓蟲徽章解鎖與通知 ── */
  {
    const p = await open(b, { seed: seedOf([bugDoc(CLS, 5, 3, now - DAY)]) });
    await p.waitForSelector('#nw-gift', { timeout: 6000 });
    const g = await p.textContent('#nw-gift');
    ok(g.includes('抓蟲新手') && g.includes('抓蟲隊長') && !g.includes('抓蟲達人'), '抓蟲分 3：解鎖抓蟲新手、抓蟲隊長，跳通知：' + g.replace(/\s+/g, ' ').slice(0, 60));
    await dismissGifts(p);
    const n = await nwLocal(p);
    ok(n.words.includes('bug1') && n.words.includes('bug3') && !n.words.includes('bug5') && !n.words.includes('bug10') && n.bugScore === 3, '詞條存進存檔、抓蟲分 3');
    noErr(p); await p.close();
  }
  {
    const p = await open(b, { seed: seedOf([bugDoc(CLS, 5, 12, now - DAY)]) });
    await dismissGifts(p);
    const n = await nwLocal(p);
    ok(['bug1', 'bug3', 'bug5', 'bug10'].every(id => n.words.includes(id)), '抓蟲分 12：四個徽章都有');
    noErr(p); await p.close();
  }
  {
    const p = await open(b, { seed: seedOf([bugDoc(CLS, 5, 1, now - DAY)]) });
    await p.waitForTimeout(500);
    ok(await bangOn(p) && await dotOn(p), '我的抓蟲分變動（還沒看過榜）：木板「！」與按鈕小紅點亮著');
    await dismissGifts(p);
    await openBtn(p);
    ok(await p.evaluate(() => document.querySelector('#nw-notice [data-ntabdot="bug"]').style.display !== 'none'), '抓蟲榜分頁上有小紅點');
    await tabOf(p, 'bug');
    await closeNotice(p);
    ok(!(await bangOn(p)) && !(await dotOn(p)), '看過抓蟲榜、公告後：「！」與小紅點消失');
    noErr(p); await p.close();
  }

  await b.close();
  console.log(fails ? `\n${fails} 項失敗` : '\n全部通過');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
