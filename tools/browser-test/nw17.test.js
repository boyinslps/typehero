/* 2a 榮譽碑第三塊：學生端 nw-rank.js 重寫（docs/SPEC-STAGE2.md §2.2～2.3、§2.8～2.9、§10）。
   前半純函式（node 直接測，不開瀏覽器；也用 teacher/rank-calc.js 真的算出一份榜單餵進去，確認兩邊對得起來）；
   後半 browser：假 Firebase、全程開 window.__RULES，榜單用 window.__FS 直接塞 mg_nw_board/{年級}。姓名全是假的。
   涵蓋：開榜只讀 1 份 board（完全不碰 mg_scores／mg_nw_runs）、10 分鐘快取、重新整理再讀；三個分頁；前 10＋自己；榜外只有差距沒有名次；
   下降不顯示、▲／新上榜；神準不排名次；神秘獵人；名字用榜單裡的登入名字；畫面沒有真名／docId／uid；不同年級讀不同份；
   一～三年級沒有榜；空榜（沒有文件／更新過但沒人）；讀取失敗＋重試；離線；壞資料；沒開放時的入口（灰、鎖、施工中、不讀資料）；規則；手機 390 寬。
   截圖：/tmp/rank2a-*.png。用法：python3 -m http.server 8765 &；NODE_PATH=$(npm root -g) node tools/browser-test/nw17.test.js /tmp */
const fs = require('fs'), path = require('path');
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const HOUR = 3600e3, DAY = 24 * HOUR, NOW = Date.now();
let COO = '', FROG = '';   // 魔物名字用資料表裡的（有些魔物名字後面還帶測試用的括號）

/* ── 假榜單：五年級。我＝五年級3班 5 號（503・5），榜單上的名字是「勇者小明」，跟本機名字「本名小明」不同，才看得出畫面用的是榜單的名字 ── */
const ME_NAME = '本名小明', BOARD_NAME = '勇者小明';
const r = (c, s, n, v, rank, up, o = {}) => Object.assign({ c, s, n, v, r: rank, up }, o);
const names = ['測試甲', '測試乙', '測試丙', '測試丁', '測試戊', '測試己', '測試庚', '測試辛', '測試壬', '測試癸'];
const T0 = NOW - 2 * DAY;
function improve10(withMe) {
  const rows = names.map((n, i) => r('504', i + 1, n, +(31.2 - i * 2.1).toFixed(1), i + 1, 0, { qb: ['6:0', '4:0', '8:0'][i % 3] }));
  rows[0].up = 2; rows[1].n = '神秘獵人'; rows[1].up = -1; rows[4].up = 3;
  rows[8].r = 8; rows[8].c = '507'; rows[9].r = 10;                 // 1224 式：第 8 名同分兩人，下一個是第 10 名
  if (withMe) { rows[3] = r('503', 5, BOARD_NAME, 22.5, 4, -1, { qb: '6:0' }); }
  return rows;
}
const fastRows = (n, base) => Array.from({ length: n }, (_, i) => r('505', i + 1, names[i], +(base + i * 1.7).toFixed(1), i + 1, i === 0 ? 1 : 0, { w: ['dagger', 'bow', 'staff'][i % 3], pw: 40 + i }));
function board5(o = {}) {
  const coo = [r('504', 1, '測試甲', 41.3, 1, 1, { w: 'dagger', pw: 45 }), r('507', 12, '神秘獵人', 48.5, 3, 0, { w: 'testblade', pw: 100 }), r('504', 3, '測試丙', 60.1, 4, 0, { w: 'bow', pw: 40 })];
  coo.splice(1, 0, r('503', 5, BOARD_NAME, 44, 2, -1, { w: 'flame_dagger', pw: 90 }));
  if (o.noMeFast) coo.splice(1, 1);
  return { v: 1, g: '5', t: T0, week: 7, improve: improve10(!!o.me),
    fast: { 'coo:1': coo, 'frog:2': fastRows(10, 50) },
    acc: { list: [r('504', 1, '測試甲', 0, 1, 0, { at: T0 - 3 * DAY }), r('507', 12, '神秘獵人', 0, 2, 0, { at: T0 - 5 * DAY })].map(x => { delete x.v; delete x.r; delete x.up; return x; }).concat(o.me ? [{ c: '503', s: 5, n: BOARD_NAME, at: T0 - 9 * DAY }] : []), more: 37 },
    cut: { improve: 10.2, 'fast:coo:1': 52, 'fast:frog:2': 63 } };
}
const board4 = () => ({ v: 1, g: '4', t: T0, week: 7, improve: [r('402', 1, '四年級測試甲', 12.5, 1, 0, { qb: '4:0' })], fast: {}, acc: { list: [], more: 0 }, cut: {} });
const board6 = () => ({ v: 1, g: '6', t: T0, week: 7, improve: [r('601', 1, '六年級測試甲', 8.8, 1, 0, { qb: '8:1' })], fast: {}, acc: { list: [{ c: '601', s: 1, n: '六年級測試甲', at: T0 }], more: 0 }, cut: {} });
const emptyBoard = g => ({ v: 1, g, t: T0, week: 7, improve: [], fast: {}, acc: { list: [], more: 0 }, cut: {} });

(async () => {
  const D = await import('../../nw-data.js');
  COO = D.MONSTERS.coo.name; FROG = D.MONSTERS.frog.name;
  const R = await import('../../teacher/rank-calc.js');
  const K = await import('../../nw-rank.js');
  const RB = await import('../../nw-rankboard.js');

  /* ═══ A. 純函式 ═══ */
  ok(['四年級1班', '五年級12班', '六年級3班', '三年級1班', '一年級1班', '', undefined, null, '五年級班', '五年級1班 ', '５年級３班', '亂寫'].every(c => K.gradeOfClass(c) === R.gradeOf(c)), 'gradeOfClass：跟老師端 rank-calc 的 gradeOf 對所有輸入一致（含全形、空白、一～三年級、亂寫）');
  ok(K.gradeOfClass('五年級3班') === '5' && K.gradeOfClass('三年級2班') === null, 'gradeOfClass：四五六年級才有榜，三年級沒有');
  ok(same(K.meKey({ className: '五年級3班', seat: '5' }), { c: '503', s: 5, grade: '5' }) && K.meKey({ className: '四年級12班', seat: 7 }).c === '412', 'meKey：班級短碼＋座號（座號是字串也行）');
  ok(K.qbText('4:0') === '★1～2 題目' && K.qbText('6:2') === '★3～4 題目' && K.qbText('8:1') === '★5 題目' && K.qbText('x') === '' && K.qbText(undefined) === '', 'qbText：題目字數 → 星級');

  /* cleanBoard：全校讀得到、別人寫的，壞的列丟掉、型別硬轉不信 */
  const cb = K.cleanBoard(board5({ me: true }));
  ok(cb.t === T0 && cb.improve.length === 10 && Object.keys(cb.fast).join() === 'coo:1,frog:2' && cb.acc.list.length === 3 && cb.acc.more === 37 && cb.cut.improve === 10.2, 'cleanBoard：正常榜單原樣留下');
  const e0 = K.cleanBoard(null), e1 = K.cleanBoard('x'), e2 = K.cleanBoard([]);
  ok([e0, e1, e2].every(e => e.t === 0 && e.improve.length === 0 && Object.keys(e.fast).length === 0 && e.acc.list.length === 0), 'cleanBoard：沒有文件、字串、陣列 → 空榜（t＝0 代表老師還沒更新過）');
  let threw = false; try { K.cleanBoard({ v: 99, improve: [] }); } catch (e) { threw = true; }
  ok(threw && K.cleanBoard({ improve: [] }).t === 0 && K.cleanBoard({ v: 1, t: 5 }).t === 5, 'cleanBoard：版本不認得會丟錯（畫面說讀不到，不亂畫）；沒寫版本當 v1');
  const dirty = K.cleanBoard({ v: 1, t: 'x', improve: [null, 5, 'a', { c: '504', s: 1, n: 'ok', v: 10 }, { c: '', s: 1, v: 5 }, { c: '504', s: 0, v: 5 }, { c: '504', s: 2, v: 'big' }, { c: '504', s: 3, v: -4 }, { c: '504', s: 4, v: 7, n: 12345, r: 'x', up: 'y' }],
    fast: { '__proto__': [{ c: '504', s: 1, v: 5 }], 'dragon:1': [{ c: '504', s: 1, v: 5 }], 'coo:9': [{ c: '504', s: 1, v: 5 }], 'coo:3': [{ c: '504', s: 1, n: 'a', v: 30, w: '<script>', pw: 'x' }, { c: '504', s: 2, v: 31, w: 'toString' }, { c: '504', s: 3, v: 32, w: 'dagger', pw: 45.6 }], 'wolf:1': 'zzz', 'toString:1': [] },
    acc: { list: [{ c: '504', s: 1, n: 'a', at: 'x' }, 5], more: -4 }, cut: { improve: 'x', 'fast:coo:3': 9 } });
  ok(dirty.t === 0 && dirty.improve.length === 2 && dirty.improve[0].v === 10 && dirty.improve[1].n === D.NICK_EMPTY && dirty.improve[1].r === 9 && dirty.improve[1].up === 0, 'cleanBoard：壞列（非物件、缺班級、座號 0、分數不是數字或負數）丟掉；沒有名字顯示「神秘獵人」；名次或升降壞掉用預設');
  ok(Object.keys(dirty.fast).join() === 'coo:3' && dirty.fast['coo:3'].length === 3 && dirty.fast['coo:3'][0].w === '' && dirty.fast['coo:3'][1].w === '' && dirty.fast['coo:3'][2].w === 'dagger' && dirty.fast['coo:3'][2].pw === 46 && dirty.fast['coo:3'][0].pw === 0, 'cleanBoard：最快討伐只收「已知魔物:1～5 星」的 key（__proto__、dragon、星級 9、toString 都丟）；武器不認得（<script>、toString）留空；戰力四捨五入');
  ok(dirty.acc.list.length === 1 && dirty.acc.list[0].at === 0 && dirty.acc.more === 0 && Object.keys(dirty.cut).join() === 'fast:coo:3', 'cleanBoard：神準名單壞列丟掉、more 負數當 0、cut 不是數字丟掉');
  ok(K.cleanBoard({ v: 1, improve: Array.from({ length: 30 }, (_, i) => ({ c: '504', s: i + 1, v: 5 + i })) }).improve.length === 10 && K.cleanBoard({ v: 1, acc: { list: Array.from({ length: 50 }, (_, i) => ({ c: '504', s: (i % 99) + 1 })) } }).acc.list.length === 20, 'cleanBoard：就算榜單被灌長，也只畫前 10 名／前 20 人');

  /* 三個 spec：榜外不顯示名次、下降不顯示 */
  const me5 = { className: '五年級3班', seat: 5, name: ME_NAME };
  const bOut = K.cleanBoard(board5()), bIn = K.cleanBoard(board5({ me: true }));
  const textOf = spec => RB.rankBoardHtml(spec).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  const sI = K.improveSpec(bOut, me5), sI2 = K.improveSpec(bIn, me5);
  ok(sI.rows.length === 10 && !sI.rows.some(x => x.mine) && /超過 10\.2% 就能上榜/.test(sI.outText) && !/第|名次/.test(sI.outText), 'improveSpec：我不在前 10 → 沒有「我」那一列、只說要超過第 10 名的分數（10.2%），不說名次');
  ok(sI2.rows.filter(x => x.mine).length === 1 && sI2.rows[3].mine && sI2.outText === '' && sI2.rows[3].score === '打字變快 22.5%' && sI2.rows[3].extra === '★3～4 題目', 'improveSpec：我在前 10 → 那一列標「我」、沒有榜外文字');
  ok(sI.rows[0].nick.includes('▲2') && sI.rows[1].nick.includes('🆕 新上榜') && sI.rows[4].nick.includes('▲3') && !sI.rows.some(x => /▼|-1|下降|退步/.test(x.nick)) && !sI.rows[2].nick.includes('▲'), 'improveSpec：上升顯示 ▲N、新上榜顯示 🆕、沒變的什麼都不加');
  ok(sI.rows[8].rank === 8 && sI.rows[7].rank === 8 && sI.rows[9].rank === 10, 'improveSpec：同分名次相同（1224 式）照榜單的 r');
  ok(sI.updatedAt === T0 && sI.updatedWithDate === true && K.improveSpec(K.cleanBoard(null), me5).updatedAt === null && /剛蓋好/.test(K.improveSpec(K.cleanBoard(null), me5).emptyText) && K.improveSpec(K.cleanBoard(null), me5).outText === '', 'improveSpec：更新時間用榜單的 t；沒更新過 → 時間是 null、空榜說「剛蓋好」、沒有榜外文字');
  const noCut = K.cleanBoard(Object.assign(board5(), { cut: {} }));
  ok(/多打幾場，正確率 90% 以上/.test(K.improveSpec(noCut, me5).outText), 'improveSpec：不到 10 人（沒有 cut）→ 說怎麼拿，不說數字');
  ok(/還沒有人上榜/.test(K.improveSpec(K.cleanBoard(emptyBoard('5')), me5).emptyText), 'improveSpec：更新過但沒人 → 「還沒有人上榜…」');

  const opts = K.fastOptions(bOut, { 'wolf:5': 80, 'frog:2': 70, 'dragon:1': 5, 'coo:9': 5, 'coo:2': -1, 'shroom:1': 'x' });
  ok(same(opts, [{ mk: 'coo', stars: [1] }, { mk: 'frog', stars: [2] }, { mk: 'wolf', stars: [5] }]), 'fastOptions：榜單上有人的＋自己打贏過的組合；不認得的魔物、星級、壞數字不列；魔物照 MONSTERS 順序');
  ok(K.fastDefault(opts, { 'coo:1': 50, 'frog:2': 70 }) === 'frog:2' && K.fastDefault(opts, {}) === 'coo:1' && K.fastDefault([], {}) === '' && K.fastDefault(opts, { 'wolf:1': 9 }) === 'coo:1', 'fastDefault：預設選自己最近才第一次打贏的那組（fastMk 最後一個鍵）；沒有就第一組；沒選項回空字串');
  const sF = (key, best, b = bOut) => K.fastSpec(b, me5, key, best);
  ok(sF('frog:2', 70).outText === '再快 7.1 秒就上榜！' && !/第|名次/.test(sF('frog:2', 70).outText), 'fastSpec：榜外 70.0 秒、第 10 名 63.0 → 「再快 7.1 秒就上榜！」（要比 cut 快一點，同分的人不一定在榜上），不說名次');
  ok(sF('frog:2', 63).outText === '再快 0.1 秒就上榜！' && /更快的紀錄.*下次更新/.test(sF('frog:2', 60).outText) && /比 63\.0 秒更快/.test(sF('frog:2', 0).outText), 'fastSpec：剛好同分再快 0.1；比 cut 還快卻沒上榜 → 「老師下次更新就會算進去」；沒紀錄 → 「比 63.0 秒更快就能上榜」');
  ok(sF('wolf:5', 80).outText.includes('老師下次更新就會算進去') && sF('wolf:5', 0).outText.includes('還有位置'), 'fastSpec：這組不到 10 人（沒有 cut）：有紀錄 → 下次更新會算；沒紀錄 → 還有位置');
  const sF1 = sF('coo:1', 40.2, bIn), sF1b = sF('coo:1', 44, bIn);
  ok(sF1.rows.length === 4 && sF1.rows[1].mine && sF1.rows[1].rank === 2 && sF1.rows[1].score === '44.0 秒' && sF1.rows[1].extra === '戰力 90' && /你最近有更快的紀錄（40\.2 秒）.*下次更新/.test(sF1.outText) && sF1b.outText === '', 'fastSpec：我在榜上，本機有更快的紀錄 → 「老師下次更新就會算進去」；一樣快就不說；列有武器名與戰力');
  ok(sF1.title === `${COO} ★1` && sF('', 0).title === '最快討伐' && sF('', 0).rows.length === 0 && sF('', 0).outText === '' && /打贏魔物/.test(sF('', 0).emptyText), 'fastSpec：標題是魔物名＋星級；沒有組合時是空榜與怎麼拿');
  ok(sF1.rows[0].nick.includes('▲1') && sF1.rows[1].nick.includes('🆕') && !sF1.rows.some(x => /▼/.test(x.nick)), 'fastSpec：▲／🆕 一樣，沒有 ▼');

  const sA = K.accSpec(bOut, me5), sA2 = K.accSpec(bIn, me5);
  ok(sA.rows.length === 2 && sA.rows.every(x => x.rank === '★') && sA.badges === false && sA.footText === '還有 37 人也很準！' && /不排名次/.test(sA.subtitle) && !sA.rows.some(x => x.mine), 'accSpec：每列用小星星不用名次、不畫金銀銅、「還有 37 人也很準！」');
  ok(/裡面/.test(sA.outText) && /97%/.test(sA.outText) && !/第|名次/.test(sA.outText) && sA2.rows.some(x => x.mine) && sA2.outText === '' && K.accSpec(K.cleanBoard(Object.assign(board5(), { acc: { list: [], more: 0 } })), me5).footText === '', 'accSpec：不在名單上（名單外還有人）→ 「說不定也在裡面」＋怎麼達標；在名單上沒有榜外文字；沒有更多人不寫「還有」');
  ok(/^\d+ 月 \d+ 日起$/.test(sA.rows[0].score), 'accSpec：每人顯示從哪一天起達標（「11 月 18 日起」）');
  ok(/還沒有人達標/.test(K.accSpec(K.cleanBoard(emptyBoard('5')), me5).emptyText) && K.accSpec(K.cleanBoard(Object.assign(board5(), { acc: { list: [], more: 0 } })), me5).outText.includes('97%'), 'accSpec：空名單 → 「還沒有人達標，你可以當第一個」');

  /* 所有 spec 畫出來：沒有真名／docId／uid、榜外沒有名次 */
  const allTxt = [sI, sI2, sF('frog:2', 70), sF1, sA, sA2].map(textOf).join(' ');
  ok(!/_\d+號|uid|docId|真名|本名/.test(allTxt) && allTxt.includes(BOARD_NAME), '畫出來的字：沒有 docId／uid／真名，名字是榜單裡的登入名字');
  ok(!/第\s*\d+\s*名/.test([sI, sF('frog:2', 70), sA].map(textOf).join(' ')), '畫出來的字：榜外沒有「第 N 名」');

  /* 跟老師端真的算出來的榜單對起來：用 rank-calc.updateBoards 出一份，學生端要認得自己、神秘獵人、武器、神準 */
  {
    const WEEK = 7 * DAY, TW = 8 * HOUR, BASE = Date.UTC(2026, 9, 19) - TW, at = (w, d = 0, h = 12) => BASE + w * WEEK + d * DAY + h * HOUR, NOWX = at(5, 2);
    let seq = 0;
    const mk = (cls, seat, o = {}) => {
      const cpm = o.cpm || 60, n = o.n || 12, ms = Math.round(120000 / cpm), qq = Array.from({ length: n }, () => [2, 5, ms, 2]), act = qq.reduce((a, x) => a + x[2], 0) / 1000;
      return { id: `${cls}_${seat}號`, cls, seat, uid: 'uid-secret-' + seat, t: 1700000000000 + (++seq), ts: o.ts, v: 1, app: '3.15.0', mk: o.mk || 'coo', rk: 'grass', star: o.star || 3, lv: o.lv === undefined ? 6 : o.lv, qb: 'x', res: 'win',
        secs: o.secs || Math.round((act + 10) * 10) / 10, acc: 1, ans: qq.length, cor: n * 2, typ: n * 2, keys: n * 5, nokey: 0, act: Math.round(act * 10) / 10, cpm: 999, fl: { fast: 0, paste: 0, wrong: 0 }, sus: [], w: o.w || 'dagger', atk: 105, pw: 45, tier: 'B', q: [].concat(...qq) };
    };
    const series = (cls, seat, oldC, newC) => [...oldC.map((c, i) => mk(cls, seat, { cpm: c, ts: at(1 + i, 1) })), ...newC.map((c, i) => mk(cls, seat, { cpm: c, ts: at(4 + (i > 0 ? 1 : 0), 1 + i) }))];
    const runs = [...series('五年級3班', 5, [50, 50, 50], [60, 60, 60]), ...series('五年級4班', 7, [40, 40, 40], [80, 80, 80]), ...Array.from({ length: 10 }, (_, i) => mk('五年級3班', 5, { lv: 12, star: 5, mk: 'wolf', w: 'flame_dagger', cpm: 60, ts: at(5, 0, 1 + i), secs: 40 + i }))];
    const res = R.updateBoards(null, runs, { now: NOWX, people: { '五年級3班_5號': { name: '假名甲', hide: false }, '五年級4班_7號': { name: '假名乙', hide: true } } });
    const b = K.cleanBoard(JSON.parse(JSON.stringify(res.boards['5'])));
    const mine = K.improveSpec(b, { className: '五年級3班', seat: 5 }), other = K.improveSpec(b, { className: '五年級4班', seat: 7 });
    ok(b.t === NOWX && b.improve.length === 2 && mine.rows.filter(x => x.mine).length === 1 && mine.rows.find(x => x.mine).nick === '假名甲' && other.rows.find(x => x.mine).nick.startsWith('神秘獵人'), '老師端 rank-calc 真的算出來的進步榜：學生端用 c＋s 認得自己；隱藏暱稱的人是「神秘獵人」');
    ok(mine.rows[0].score === '打字變快 100%' && mine.rows[0].label === '504・7號', '老師端的進步榜：分數與「504・7號」（班級短碼）直接可畫');
    const fk = Object.keys(b.fast).find(k => k.startsWith('wolf:5')), fs0 = K.fastSpec(b, { className: '五年級3班', seat: 5 }, fk, 40);
    ok(fk && fs0.rows.length === 1 && fs0.rows[0].mine && fs0.rows[0].extra === '戰力 45', '老師端的最快討伐：戰力直接可畫、認得自己');
    const as = K.accSpec(b, { className: '五年級3班', seat: 5 });
    ok(as.rows.length === 1 && as.rows[0].mine && /^\d+ 月 \d+ 日起$/.test(as.rows[0].score), '老師端的神準名單：認得自己、有日期');
  }

  /* 模板新欄位向下相容：沒用到的人完全不變 */
  const plain = RB.rankBoardHtml({ id: 't', rows: [{ rank: 1, label: 'a', score: 3 }], updatedAt: Date.UTC(2026, 0, 1, 4, 5) });
  ok(!plain.includes('data-rb-foot') && /更新時間 \d\d:\d\d</.test(plain) && RB.rankBoardHtml({ rows: [], updatedAt: null }).includes('data-rb-time style="color:#aab0d8;font-size:.82em"></span>') && /更新時間 \d+ 月 \d+ 日 \d\d:\d\d/.test(RB.rankBoardHtml({ rows: [], updatedAt: Date.UTC(2026, 0, 1, 4, 5), updatedWithDate: true })) && RB.rankBoardHtml({ rows: [], footText: '尾巴' }).includes('data-rb-foot'), '模板：footText、updatedWithDate、updatedAt: null 是新的選填欄位；沒用到的榜單（抓蟲榜、活動榜）輸出不變');

  await browserPart();
  console.log(fails ? `\n${fails} 項失敗` : '\n全部通過');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

/* ═══ B. 瀏覽器：學生端畫面 ═══ */
async function browserPart() {
  let chromium;
  try { ({ chromium } = require('playwright')); } catch (e) { console.log('SKIP 瀏覽器那一半（沒有 playwright）'); return; }
  const M = path.join(__dirname, 'mock') + '/', OUT = process.argv[2] || require('os').tmpdir();
  const css = require('./tw.js')(OUT);
  const SHOT = n => `/tmp/rank2a-${n}.png`;
  /* 跟 nw16 一樣，只在測試裡替換：加 window.__DENY_READ（符合的路徑讀取一律 permission-denied），不改 mock 檔 */
  const fsSrc = fs.readFileSync(M + 'fs.js', 'utf8')
    .replace('function ruleCheck(db, op, path, data, exists) {', 'function ruleCheck(db, op, path, data, exists) { if (window.__DENY_READ && (op === "get" || op === "list") && new RegExp(window.__DENY_READ).test(path)) { const e = new Error("denied (mock)"); e.code = "permission-denied"; throw e; }');
  ok(fsSrc.includes('__DENY_READ'), '（測試用假資料庫：讀取拒絕替換成功）');
  const NOTICE_ID = /export const NOTICES = \[\s*\{ id: '([^']+)'/.exec(fs.readFileSync(path.join(__dirname, '../../nw-data.js'), 'utf8'))[1];
  const browser = await chromium.launch();
  const { sha256Hex } = await import('../../nw-access.js');
  const hash = await sha256Hex('Test-Pass_9!x');

  /* o: grade/cls/seat、stages、boards（{ '5': 文件 }）、fastMk、vw、deny、intro */
  async function open(o = {}) {
    const grade = o.grade || '五年級', cls = o.cls || '3班', seat = o.seat || 5, className = grade + cls, id = `${className}_${seat}號`;
    const p = await browser.newPage({ viewport: { width: o.vw || 1200, height: o.vh || 900 } });
    const errs = [], cons = []; p.errs = errs; p.cons = cons; p.on('dialog', d => d.accept());
    p.on('pageerror', e => errs.push('pageerror: ' + e.message));
    p.on('console', m => { cons.push(m.type() + ': ' + m.text()); if (m.type() === 'error' && !/Failed to load resource|Missing or insufficient|permission|denied/.test(m.text())) errs.push('console: ' + m.text()); });
    const seed = { ['mg_scores/' + id]: { className, seat, name: ME_NAME, bestLevel: 10, bestScore: 20, scoreVer: 2, plays: 9, tutorialDone: true, talentIntroDone: true, tier: 'B', balanceVer: 3, punctDone: true,
        nw: { v: 1, savedAt: 5, look: { style: 1, hair: 2, skin: 1 }, starter: 'dagger', quest: { done: ['1-0', '1-0a'] }, items: { potion: 3 }, intro: { hub: 1, notice: 1 }, seenNotice: NOTICE_ID, nameSet: 1, fastMk: o.fastMk || {} } },
      ['mg_scores/五年級4班_1號']: { className: '五年級4班', seat: 1, name: '真名甲', nw: { hr: 9, hrExp: 1, hunts: 3, fastest: { 'grass:1': 12 } } },
      ['mg_scores/五年級4班_2號']: { className: '五年級4班', seat: 2, name: '真名乙', nw: { hr: 3, hrExp: 1, hunts: 3 } },
      ['mg_nw_board_private/5']: { v: 1, secret: '老師才看得到', students: { 五年級4班_1號: { n: '真名甲' } } },
      ['mg_nw_runs/五年級4班_1號_1']: { id: '五年級4班_1號', uid: 'uid-secret-1', q: [2, 5, 2400, 2] } };
    Object.keys(o.boards || {}).forEach(g => { if (o.boards[g] !== null) seed['mg_nw_board/' + g] = o.boards[g]; });
    await p.addInitScript(a => {
      window.__FS = a.s; window.__RULES = true; localStorage.clear(); localStorage.setItem('mg_nw_fast', '1');
      window.__NW_CODE_HASH__ = a.hash; localStorage.setItem('mg_nw_code', a.hash); window.__NW_NOGIFT__ = true; if (!a.intro) window.__NW_NOINTRO__ = true;
      if (a.stages) window.__NW_STAGES__ = a.stages; if (a.deny) window.__DENY_READ = a.deny;
      window.confetti = () => {}; window.html2canvas = async () => document.createElement('canvas');
    }, { s: seed, hash, stages: o.stages === undefined ? ['1', '2a'] : o.stages, deny: o.deny, intro: !!o.intro });
    await p.route('**/*', rt => {
      const u = rt.request().url();
      if (u.startsWith('http://localhost')) return rt.continue();
      if (u.includes('cdn.tailwindcss.com')) return rt.fulfill({ contentType: 'application/javascript', body: `const s=document.createElement('style');s.textContent=${JSON.stringify(css)};document.head.appendChild(s);` });
      const m = u.includes('firebase-app') ? 'app.js' : u.includes('firebase-auth') ? 'auth.js' : u.includes('firebase-firestore') ? 'fs.js' : null;
      if (m) return rt.fulfill({ contentType: 'application/javascript', body: m === 'fs.js' ? fsSrc : fs.readFileSync(M + m, 'utf8') });
      return rt.abort();
    });
    await p.goto('http://localhost:8765/index.html'); await p.waitForFunction(() => window.__NWG, null, { timeout: 15000 }); await p.waitForTimeout(500);
    await p.selectOption('#in-grade', grade); await p.selectOption('#in-class', cls); await p.fill('#in-seat', String(seat)); await p.waitForTimeout(900);
    await p.click('#btn-enter'); await p.waitForTimeout(1000);
    await p.click('#nw-door'); await p.waitForTimeout(1800);
    return p;
  }
  const rankBtn = p => p.click('.vb[data-bld="rank"]');
  const openRank = async (p, o = {}) => { await p.evaluate(() => { window.__READS = []; }); await rankBtn(p); if (!o.nowait) { await p.waitForSelector('#nw-rank', { timeout: 4000 }); await p.waitForFunction(() => { const b = document.querySelector('#nw-rank [data-rankboard]'); return document.querySelector('#nw-rank [data-rk-nograde]') || (b && b.dataset.rbState !== 'loading'); }, null, { timeout: 5000 }); await p.waitForTimeout(150); } };
  const T = (p, sel) => p.textContent(sel).then(t => t.replace(/\s+/g, ' ').trim());
  const sheetT = p => T(p, '#nw-rank');
  const reads = p => p.evaluate(() => (window.__READS || []).map(x => `${x.op} ${x.path}`));
  const boardReads = p => reads(p).then(l => l.filter(x => /mg_nw_board\//.test(x)));
  const tab = async (p, id) => { await p.click(`#nw-rank [data-rk-tab="${id}"]`); await p.waitForTimeout(200); };
  const noErr = (p, m = '沒有 JS 錯誤') => ok(p.errs.length === 0, m + (p.errs.length ? '：' + p.errs.join(' | ') : ''));
  const hscroll = p => p.evaluate(() => { const s = document.querySelector('#nw-rank'), pn = s && s.firstElementChild; return { page: document.documentElement.scrollWidth - innerWidth, sheet: s ? s.scrollWidth - s.clientWidth : 0, panel: pn ? pn.scrollWidth - pn.clientWidth : 0, cut: s ? [...s.querySelectorAll('button,select')].filter(x => x.getBoundingClientRect().right > innerWidth + 1).length : 0 }; });
  const rowsOf = p => p.$$('#nw-rank [data-rbrow]');
  const REAL = /真名|本名|_\d+號|uid-secret|老師才看得到/;

  /* ── 1. 主要流程：五年級，我（503・5）不在進步榜、在最快榜 coo:1 ── */
  {
    const p = await open({ boards: { '5': board5(), '4': board4(), '6': board6() }, fastMk: { 'coo:1': 44, 'frog:2': 70 } });
    await openRank(p);
    ok(await p.isVisible('#nw-rank') && (await p.getAttribute('#nw-rank', 'class')).includes('nw-sheet'), '榮譽碑打開，視窗有 nw-sheet（Esc、村莊的鍵盤判斷認得它）');
    const rd = await reads(p);
    ok(same(rd, ['get mg_nw_board/5']), `開榜只讀 1 份：mg_nw_board/5（讀取紀錄：${rd.join('、')}）`);
    ok(!rd.some(x => /mg_scores|mg_nw_runs|mg_nw_board_private/.test(x)), '完全不碰 mg_scores、mg_nw_runs、mg_nw_board_private（舊版每次開榜讀整個 mg_scores）');
    ok((await T(p, '[data-rk-head]')).includes('榮譽碑・五年級'), '標題：榮譽碑・五年級（取自己的年級）');
    const tabs = await p.$$eval('#nw-rank [data-rk-tab]', els => els.map(e => [e.dataset.rkTab, e.textContent.trim(), e.getAttribute('aria-selected'), e.className.includes('gold')]));
    ok(same(tabs.map(x => x[0]), ['improve', 'fast', 'acc']) && tabs[0][1] === '🌱 進步' && tabs[1][1] === '⚡ 最快討伐' && tabs[2][1] === '🎯 神準名單', '三個分頁：🌱 進步、⚡ 最快討伐、🎯 神準名單');
    ok(tabs[0][2] === 'true' && tabs[0][3] && tabs[1][2] === 'false' && !tabs[1][3], '預設打開「進步」');
    ok((await sheetT(p)).includes('榜單由老師更新'), '說明：榜單由老師更新，剛打完的紀錄要等下次更新（不是即時的）');

    /* 進步 */
    let rows = await rowsOf(p), txt = await sheetT(p);
    ok(rows.length === 10, '進步：前 10 名（10 列）');
    ok(txt.includes('打字變快 31.2%') && txt.includes('504・1號') && txt.includes('測試甲') && txt.includes('★3～4 題目'), '進步：班級短碼・座號、名字、「打字變快 31.2%」、題目等級');
    ok((await p.$$('#nw-rank [data-rbrow]:nth-child(-n+3) svg')).length === 3 && (await p.$$('#nw-rank [data-rbrow]:nth-child(n+4) svg')).length === 0, '進步：前 3 名金銀銅像素徽章，之後是數字');
    ok(txt.includes('▲2') && txt.includes('▲3') && txt.includes('🆕 新上榜') && !/▼|下降|退步/.test(txt), '進步：只顯示 ▲ 上升與「新上榜」，沒有 ▼／下降');
    ok(txt.includes('神秘獵人'), '進步：隱藏暱稱的人顯示「神秘獵人」');
    ok((await p.$$eval('#nw-rank [data-rbrow]', els => els.map(e => e.querySelector('b').textContent.trim())).then(a => a.slice(6, 10).join())) === '7,8,8,10', '進步：同分名次相同（8、8、10）');
    ok(!(await p.$('#nw-rank [data-rbmine]')) && (await T(p, '#nw-rank [data-rb-out]')).includes('打字變快超過 10.2% 就能上榜'), '進步：我不在前 10 → 沒有我的名次，只寫「打字變快超過 10.2% 就能上榜，加油！」');
    ok(!/第\s*\d+\s*名|名次/.test(await T(p, '#nw-rank [data-rb-out]')) && (await T(p, '#nw-rank [data-rb-out]')).includes('加油'), '進步：榜外的字有鼓勵、沒有名次');
    ok(/更新時間 \d+ 月 \d+ 日 \d\d:\d\d/.test(txt) && await p.isVisible('#nw-rank [data-rb-refresh]'), '進步：顯示榜單更新時間（月日＋時分）與重新整理');
    ok(!REAL.test(txt), '進步：畫面沒有真名／docId／uid／私有榜單的字（' + (txt.match(REAL) || [''])[0] + '）');
    await p.screenshot({ path: SHOT('desktop-improve') });
    await p.locator('#nw-rank [data-rb-out]').scrollIntoViewIfNeeded(); await p.screenshot({ path: SHOT('out-of-board') });

    /* 最快討伐 */
    await tab(p, 'fast');
    ok((await p.getAttribute('#nw-rank [data-rk-tab="fast"]', 'aria-selected')) === 'true' && (await rowsOf(p)).length === 10, '最快討伐：切過去，預設是自己最近才第一次打贏的那組（泡泡蛙 ★2，10 列）');
    ok((await p.$eval('#nw-rank [data-rk-mk]', e => e.selectedOptions[0].textContent)) === FROG && (await p.$eval('#nw-rank [data-rk-star]', e => e.selectedOptions[0].textContent)) === '★2', '最快討伐：兩個下拉（魔物、星級）預設泡泡蛙、★2');
    ok(same(await p.$$eval('#nw-rank [data-rk-mk] option', e => e.map(x => x.textContent)), [COO, FROG]), '最快討伐：魔物下拉只列有紀錄的（咕咕鳥、泡泡蛙）');
    ok((await T(p, '#nw-rank [data-rb-out]')) === '再快 7.1 秒就上榜！' && !(await p.$('#nw-rank [data-rbmine]')), '最快討伐：榜外，本機最快 70.0 秒、第 10 名 63.0 秒 → 「再快 7.1 秒就上榜！」，沒有名次');
    ok((await sheetT(p)).includes('50.0 秒') && (await sheetT(p)).includes('戰力 40') && (await p.$eval('#nw-rank [data-rbrow] canvas', e => e.getAttribute('aria-label') + '|' + e.title)) === '鐵製小刀|鐵製小刀', '最快討伐：秒數、戰力；武器圖有名字（給讀屏與滑鼠停留用）');
    ok((await p.$$('#nw-rank [data-rbrow] canvas')).length === 10, '最快討伐：每列有小武器圖');
    await p.screenshot({ path: SHOT('desktop-fast-out') });
    await p.selectOption('#nw-rank [data-rk-mk]', 'coo'); await p.waitForTimeout(200);
    rows = await rowsOf(p);
    ok(rows.length === 4 && (await T(p, '#nw-rank [data-rk-star]')).includes('★1') && (await sheetT(p)).includes(`${COO} ★1`), '最快討伐：換成咕咕鳥 → ★1 只有一個選項、4 列');
    ok((await p.$$('#nw-rank [data-rbmine]')).length === 1 && (await T(p, '#nw-rank [data-rbmine]')).includes('← 你') && (await T(p, '#nw-rank [data-rbmine]')).includes(BOARD_NAME) && (await T(p, '#nw-rank [data-rbmine]')).includes('44.0 秒') && (await T(p, '#nw-rank [data-rbmine]')).includes('戰力 90'), '最快討伐：我在榜上 → 那一列有金框與「← 你」，名字是榜單裡的登入名字（勇者小明，不是本機名字）');
    ok(!(await sheetT(p)).includes(ME_NAME) && !(await p.$('#nw-rank [data-rb-out]')), '最快討伐：本機名字沒出現在畫面、我在榜上沒有榜外文字');
    ok((await sheetT(p)).includes('神秘獵人') && (await sheetT(p)).includes('▲1') && (await sheetT(p)).includes('🆕 新上榜') && !/▼/.test(await sheetT(p)), '最快討伐：▲、🆕、神秘獵人');
    await p.screenshot({ path: SHOT('desktop-fast') });
    ok(!REAL.test(await sheetT(p)), '最快討伐：畫面沒有真名／docId／uid');

    /* 神準名單 */
    await tab(p, 'acc');
    txt = await sheetT(p);
    ok((await rowsOf(p)).length === 2 && txt.includes('這些人都打得又穩又準！') && txt.includes('不排名次'), '神準名單：標題「這些人都打得又穩又準！」、說明不排名次、2 人');
    ok((await p.$$('#nw-rank [data-rbrow] svg')).length === 0 && !/🥇|🥈|🥉/.test(txt) && (await p.$$eval('#nw-rank [data-rbrow]', els => els.every(e => e.querySelector('b').textContent.trim() === '★'))), '神準名單：沒有金銀銅、沒有名次數字，每人一顆小星星');
    ok(/\d+ 月 \d+ 日起/.test(txt) && txt.includes('還有 37 人也很準！'), '神準名單：每人達標的起始日期、「還有 37 人也很準！」');
    ok((await T(p, '#nw-rank [data-rb-out]')).includes('說不定也在「還有 37 人」裡面') && (await T(p, '#nw-rank [data-rb-out]')).includes('97%') && !/第\s*\d+\s*名/.test(await T(p, '#nw-rank [data-rb-out]')), '神準名單：我不在名單上 → 說怎麼達標（Lv10 以上最近 10 場平均 97%）、沒有名次');
    await p.screenshot({ path: SHOT('desktop-acc') });
    ok(!REAL.test(txt), '神準名單：畫面沒有真名／docId／uid');

    /* 快取與重新整理 */
    await tab(p, 'improve');
    ok(same(await boardReads(p), ['get mg_nw_board/5']), '切換分頁不再讀資料（還是只讀了 1 次）');
    await p.click('#nw-rank [data-x]'); await p.waitForTimeout(150);
    ok(!(await p.$('#nw-rank')), '關閉鈕關得掉');
    await rankBtn(p); await p.waitForSelector('#nw-rank'); await p.waitForTimeout(400);
    ok((await boardReads(p)).length === 1 && (await rowsOf(p)).length === 10, '10 分鐘內再打開：用快取（讀取次數不增加）');
    await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    ok(!(await p.$('#nw-rank')), 'Esc 關得掉');
    await rankBtn(p); await p.waitForSelector('#nw-rank'); await p.waitForTimeout(300);
    await p.click('#nw-rank [data-rb-refresh]'); await p.waitForTimeout(500);
    ok((await boardReads(p)).length === 2 && (await rowsOf(p)).length === 10, '按「重新整理」才再讀 1 次（共 2 次）');
    await p.evaluate(() => { const b = window.__FS['mg_nw_board/5']; b.improve = b.improve.slice(0, 3); b.t = Date.now(); });
    await p.click('#nw-rank [data-rb-refresh]'); await p.waitForTimeout(500);
    ok((await rowsOf(p)).length === 3 && (await boardReads(p)).length === 3, '老師更新後，重新整理看得到新榜單');
    await p.click('#nw-rank [data-x]');
    noErr(p, '主要流程沒有 JS 錯誤');
    await p.close();
  }

  /* ── 2. 我在榜上：進步（第 4 名）、神準名單；最快榜裡本機有更快的紀錄 ── */
  {
    const p = await open({ boards: { '5': board5({ me: true }) }, fastMk: { 'coo:1': 40.2 } });
    await openRank(p);
    let txt = await sheetT(p);
    ok((await p.$$('#nw-rank [data-rbmine]')).length === 1 && (await T(p, '#nw-rank [data-rbmine]')).includes('← 你') && (await T(p, '#nw-rank [data-rbmine]')).includes('打字變快 22.5%') && (await T(p, '#nw-rank [data-rbmine]')).includes(BOARD_NAME), '進步：我在前 10（第 4 名）→ 那一列金框＋「← 你」，名字用榜單的登入名字');
    ok(!(await p.$('#nw-rank [data-rb-out]')) && !txt.includes(ME_NAME), '進步：我在榜上不再顯示榜外文字');
    ok((await T(p, '#nw-rank [data-rbmine]')).includes('🆕 新上榜'), '進步：我自己的「新上榜」也只顯示往上的標記');
    await tab(p, 'acc');
    ok((await p.$$('#nw-rank [data-rbmine]')).length === 1 && !(await p.$('#nw-rank [data-rb-out]')) && (await rowsOf(p)).length === 3, '神準名單：我在名單上 → 那一列有「← 你」、沒有榜外文字');
    await tab(p, 'fast');
    ok((await p.$eval('#nw-rank [data-rk-mk]', e => e.value)) === 'coo' && (await p.$$('#nw-rank [data-rbmine]')).length === 1 && (await T(p, '#nw-rank [data-rb-out]')).includes('你最近有更快的紀錄（40.2 秒），老師下次更新就會算進去'), '最快討伐：預設選到我打過的咕咕鳥；榜上 44.0 秒、我本機 40.2 秒 → 「老師下次更新就會算進去」');
    await p.close();
  }

  /* ── 3. 不同年級讀不同份：四年級、六年級 ── */
  {
    const p = await open({ grade: '四年級', cls: '2班', seat: 7, boards: { '5': board5(), '4': board4(), '6': board6() } });
    await openRank(p);
    ok(same(await boardReads(p), ['get mg_nw_board/4']) && (await T(p, '[data-rk-head]')).includes('四年級'), '四年級：讀 mg_nw_board/4、標題四年級');
    const t4 = await sheetT(p);
    ok(t4.includes('四年級測試甲') && t4.includes('打字變快 12.5%') && !t4.includes('測試丙') && !t4.includes('六年級測試甲'), '四年級：只看到四年級的榜（沒有五、六年級的人）');
    ok((await T(p, '#nw-rank [data-rb-out]')).includes('多打幾場') && !(await p.$('#nw-rank [data-rbmine]')), '四年級：只有 1 人上榜（沒有 cut）→ 榜外文字說怎麼拿');
    await tab(p, 'fast');
    ok((await p.$$('#nw-rank [data-rk-mk]')).length === 0 && (await sheetT(p)).includes('還沒有人打出最快紀錄'), '四年級最快討伐：沒有任何組合 → 不放下拉、說怎麼上榜');
    noErr(p, '四年級沒有 JS 錯誤'); await p.close();
    const q = await open({ grade: '六年級', cls: '1班', seat: 1, boards: { '5': board5(), '4': board4(), '6': board6() } });
    await openRank(q);
    ok(same(await boardReads(q), ['get mg_nw_board/6']) && (await sheetT(q)).includes('六年級測試甲') && (await T(q, '#nw-rank [data-rbmine]')).includes('← 你'), '六年級：讀 mg_nw_board/6；503 以外的班級短碼（601・1號）也認得自己');
    await q.close();
  }

  /* ── 4. 取不到年級（三年級）：友善提示、不讀資料 ── */
  {
    const p = await open({ grade: '三年級', cls: '2班', seat: 3, boards: { '5': board5(), '4': board4() } });
    await openRank(p);
    ok((await T(p, '[data-rk-nograde]')).includes('四、五、六年級') && !(await p.$('#nw-rank [data-rk-tab]')) && (await boardReads(p)).length === 0, '三年級：榮譽碑寫「現在只有四、五、六年級的榜單喔」，沒有分頁、沒讀任何榜單');
    await p.click('#nw-rank [data-x]'); await p.waitForTimeout(100);
    ok(!(await p.$('#nw-rank')), '三年級：關得掉');
    noErr(p, '三年級沒有 JS 錯誤'); await p.close();
  }

  /* ── 5. 空榜：沒有文件（老師還沒更新過）、更新過但沒人 ── */
  {
    const p = await open({ boards: {} });
    await openRank(p);
    let txt = await sheetT(p);
    ok(txt.includes('榮譽碑剛蓋好，老師更新後就會有名字喔！') && (await rowsOf(p)).length === 0 && !/更新時間 \d/.test(txt) && await p.isVisible('#nw-rank [data-rb-refresh]'), '還沒更新過（沒有 mg_nw_board 文件）：「榮譽碑剛蓋好，老師更新後就會有名字喔！」、沒有更新時間、有重新整理');
    ok(!(await p.$('#nw-rank [data-rb-out]')) && !(await p.$('#nw-rank [data-rb-error]')), '還沒更新過：不是錯誤、沒有榜外文字');
    await p.screenshot({ path: SHOT('empty') });
    await tab(p, 'fast'); ok((await sheetT(p)).includes('榮譽碑剛蓋好'), '還沒更新過：最快討伐也一樣');
    await tab(p, 'acc'); ok((await sheetT(p)).includes('榮譽碑剛蓋好'), '還沒更新過：神準名單也一樣');
    await p.evaluate(g => { window.__FS['mg_nw_board/5'] = g; }, emptyBoard('5'));
    await p.click('#nw-rank [data-rb-refresh]'); await p.waitForTimeout(500);
    txt = await sheetT(p);
    ok(txt.includes('還沒有人達標') && /更新時間 \d+ 月 \d+ 日/.test(txt), '老師更新了但還沒人達標：神準名單「還沒有人達標，你可以當第一個」＋更新時間');
    await tab(p, 'improve'); ok((await sheetT(p)).includes('還沒有人上榜。同一種星級多打幾場'), '更新過但沒人：進步榜「還沒有人上榜。同一種星級多打幾場，正確率 90% 以上，就會有進步紀錄喔！」');
    await tab(p, 'fast'); ok((await sheetT(p)).includes('還沒有人打出最快紀錄'), '更新過但沒人：最快討伐說怎麼上榜');
    noErr(p, '空榜沒有 JS 錯誤'); await p.close();
  }

  /* ── 6. 讀取失敗與重試 ── */
  {
    const p = await open({ boards: { '5': board5() }, deny: '^mg_nw_board/' });
    await openRank(p);
    ok(await p.isVisible('#nw-rank [data-rb-error]') && (await T(p, '#nw-rank [data-rb-error]')).includes('榮譽碑現在讀不到，等一下再試試看') && await p.isVisible('#nw-rank [data-rb-retry]'), '讀取失敗：「榮譽碑現在讀不到，等一下再試試看」＋「再試一次」');
    ok((await rowsOf(p)).length === 0 && !(await p.$('#nw-rank [data-rb-out]')), '讀取失敗：不畫榜單');
    await tab(p, 'acc');
    ok(await p.isVisible('#nw-rank [data-rb-error]') && (await p.getAttribute('#nw-rank [data-rk-tab="acc"]', 'aria-selected')) === 'true', '讀取失敗：切分頁不會蓋掉失敗畫面，分頁標示照切');
    await tab(p, 'improve');
    await p.screenshot({ path: SHOT('error') });
    await p.evaluate(() => { window.__DENY_READ = null; });
    await p.click('#nw-rank [data-rb-retry]'); await p.waitForTimeout(600);
    ok(!(await p.$('#nw-rank [data-rb-error]')) && (await rowsOf(p)).length === 10, '按「再試一次」：讀得到之後恢復正常，畫出榜單');
    ok(p.cons.some(c => c.startsWith('warning') && c.includes('讀榜單失敗')), '失敗只記在 console（warn）');
    noErr(p, '讀取失敗與重試沒有未攔住的 JS 錯誤'); await p.close();
  }

  /* ── 7. 離線 ── */
  {
    const p = await open({ boards: { '5': board5() } });
    await p.evaluate(() => window.__SNAP_ERROR()); await p.waitForTimeout(300);
    await openRank(p);
    ok((await T(p, '#nw-rank [data-rb-error]')).includes('現在連不上網路，榮譽碑讀不到') && await p.isVisible('#nw-rank [data-rb-retry]') && (await boardReads(p)).length === 0, '離線：「現在連不上網路，榮譽碑讀不到」＋重試鈕，也沒有送出讀取');
    await p.close();
    /* 已經讀過的（快取）離線也看得到，不會突然變成錯誤 */
    const q = await open({ boards: { '5': board5() } });
    await openRank(q); await q.click('#nw-rank [data-x]');
    await q.evaluate(() => window.__SNAP_ERROR()); await q.waitForTimeout(300);
    await rankBtn(q); await q.waitForSelector('#nw-rank'); await q.waitForTimeout(300);
    ok((await rowsOf(q)).length === 10, '先讀過、之後離線：用快取照樣看得到榜單');
    await q.close();
  }

  /* ── 8. 壞資料：不壞、不執行 HTML ── */
  {
    const evil = { v: 1, g: '5', t: T0, improve: [{ c: '<img src=x onerror=alert(1)>', s: 1, n: '<b>粗</b>', v: 20, qb: '<i>', r: 1, up: 1 }, { c: '504', s: 2, n: '<script>window.__XSS=1</script>', v: 18, r: 2, up: 0 }, { c: '504', s: 3, n: '好人', v: 'abc' }, null],
      fast: { 'coo:1': [{ c: '504', s: 4, n: '甲', v: 30, w: '<script>', pw: 45 }, { c: '504', s: 5, n: '乙', v: 31, w: 'testblade', pw: 1e9 }], 'dragon:1': [{ c: '504', s: 1, n: 'x', v: 1 }], '__proto__': [{ c: '504', s: 1, n: 'x', v: 1 }] }, acc: { list: [{ c: '504', s: 1, n: '<u>底線</u>', at: 5 }], more: 'many' }, cut: {} };
    const p = await open({ boards: { '5': evil } });
    await openRank(p);
    const html = await p.evaluate(() => document.querySelector('#nw-rank').innerHTML);
    ok(!/<img src=x|<script>window|<b>粗|<i>|<u>底線/.test(html) && (await p.evaluate(() => window.__XSS)) === undefined && (await sheetT(p)).includes('<b>粗</b>'), '壞資料：名字、班級裡的 HTML 一律當文字顯示，不會變成標籤、不執行');
    ok((await rowsOf(p)).length === 2, '壞資料：分數不是數字、null 的列丟掉，其他照畫');
    await tab(p, 'fast');
    ok((await p.$$eval('#nw-rank [data-rk-mk] option', e => e.map(x => x.value))).join() === 'coo' && (await rowsOf(p)).length === 2 && (await p.$$('#nw-rank [data-rbrow] canvas')).length === 1, '壞資料：只收已知魔物的 key（dragon、__proto__ 不出現）；不認得的武器不畫圖，認得的畫');
    await tab(p, 'acc');
    ok((await rowsOf(p)).length === 1 && !(await sheetT(p)).includes('還有') , '壞資料：神準名單 more 不是數字 → 當 0');
    noErr(p, '壞資料沒有 JS 錯誤');
    await p.close();
    const q = await open({ boards: { '5': { v: 99, improve: [] } } });
    await openRank(q);
    ok(await q.isVisible('#nw-rank [data-rb-error]') && (await rowsOf(q)).length === 0, '版本不認得（新版老師端、舊版學生頁）：說讀不到，不亂畫');
    await q.close();
  }

  /* ── 9. 沒開放（預設 OPEN_STAGES＝['1']）：入口跟以前一樣，灰、鎖、施工中，不讀榜單 ── */
  {
    const p = await open({ stages: null, boards: { '5': board5() } });
    const bt = await T(p, '.vb[data-bld="rank"]');
    ok(bt.includes('🔒') && bt.includes('施工中'), '沒開放 2a：榮譽碑建築是灰的、🔒、「施工中」（' + bt + '）');
    await p.evaluate(() => { window.__READS = []; });
    await rankBtn(p); await p.waitForSelector('.nw-sheet', { timeout: 3000 }); await p.waitForTimeout(300);
    ok(!(await p.$('#nw-rank')) && (await p.textContent('.nw-sheet')).includes('施工中') && (await p.textContent('.nw-sheet')).includes('榮譽碑'), '沒開放 2a：點了只看到「施工中」，不會打開榮譽碑');
    ok((await boardReads(p)).length === 0 && !(await p.textContent('.nw-sheet')).includes('進步'), '沒開放 2a：沒有讀 mg_nw_board，畫面沒透露三個分頁的內容');
    const direct = await p.evaluate(async () => {
      const m = await import('/nw-rank.js');
      const r = m.openNwRank(window.__NWG && { online: () => true, doc: () => { throw new Error('不該讀'); }, getDoc: () => { throw new Error('不該讀'); } }, { className: '五年級3班', seat: 5 }, {});
      return { ret: r === null, sheet: !!document.getElementById('nw-rank') };
    });
    ok(direct.ret && !direct.sheet, '沒開放 2a：就算從別的入口直接呼叫 openNwRank，也什麼都不做（不開視窗、不讀資料）');
    noErr(p, '沒開放時沒有 JS 錯誤'); await p.close();
  }

  /* ── 10. 開放後從建築進去：第一次先跳介紹，再打開 ── */
  {
    const p = await open({ boards: { '5': board5() }, intro: true });
    const bt = await T(p, '.vb[data-bld="rank"]');
    ok(!bt.includes('🔒') && !bt.includes('施工中') && bt.includes('榮譽碑'), '開放 2a（__NW_STAGES__）：榮譽碑不再灰、不再鎖');
    await rankBtn(p); await p.waitForSelector('#nw-intro', { timeout: 3000 });
    const it = await T(p, '#nw-intro');
    ok(it.includes('榮譽碑') && it.includes('🌱 進步：跟以前的自己比') && it.includes('⚡ 最快討伐：配裝也算') && it.includes('🎯 神準：夠準就上名單') && it.includes('正確率要 90% 以上才會算喔'), '第一次進榮譽碑：先看介紹（INTROS.rank）');
    await p.click('#nw-intro [data-next]'); await p.waitForSelector('#nw-rank', { timeout: 3000 }); await p.waitForTimeout(500);
    ok((await rowsOf(p)).length === 10, '看完介紹才打開榮譽碑');
    noErr(p, '介紹與開啟沒有 JS 錯誤'); await p.close();
  }

  /* ── 11. 規則模式：學生讀得到 board，讀不到 private、runs；榜單寫不進去 ── */
  {
    const p = await open({ boards: { '5': board5() } });
    const st = await p.evaluate(async () => {
      const m = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js'), sdb = m.getFirestore(), r = {};
      const t = async (k, f) => { try { await f(); r[k] = 'ok'; } catch (e) { r[k] = e.code || String(e); } };
      await t('boardGet', () => m.getDoc(m.doc(sdb, 'mg_nw_board', '5')));
      await t('privGet', () => m.getDoc(m.doc(sdb, 'mg_nw_board_private', '5')));
      await t('runsGet', () => m.getDoc(m.doc(sdb, 'mg_nw_runs', '五年級4班_1號_1')));
      await t('runsList', () => m.getDocs(m.collection(sdb, 'mg_nw_runs')));
      await t('boardSet', () => m.setDoc(m.doc(sdb, 'mg_nw_board', '5'), { x: 1 }));
      return r;
    });
    ok(st.boardGet === 'ok' && st.privGet === 'permission-denied' && st.runsGet === 'permission-denied' && st.runsList === 'permission-denied' && st.boardSet === 'permission-denied', '規則模式：學生讀得到 mg_nw_board，讀不到 mg_nw_board_private 與 mg_nw_runs，寫不進榜單（' + JSON.stringify(st) + '）');
    await openRank(p);
    ok((await rowsOf(p)).length === 10, '規則模式：榮譽碑照常打開（只用學生有權限的那一份）');
    noErr(p, '規則模式沒有 JS 錯誤'); await p.close();
  }

  /* ── 12. 手機 390 寬：不橫向捲動、按鈕沒被切到 ── */
  {
    const p = await open({ vw: 390, vh: 800, boards: { '5': board5() }, fastMk: { 'coo:1': 44, 'frog:2': 70 } });
    await openRank(p);
    let h = await hscroll(p);
    ok(h.page <= 1 && h.sheet <= 1 && h.panel <= 1 && h.cut === 0, `手機 390 寬：進步分頁不橫向捲動、按鈕沒被切到（頁 ${h.page}、視窗 ${h.sheet}、面板 ${h.panel}、被切 ${h.cut}）`);
    await p.screenshot({ path: SHOT('mobile-improve') });
    await tab(p, 'fast'); h = await hscroll(p);
    ok(h.page <= 1 && h.sheet <= 1 && h.panel <= 1 && h.cut === 0, `手機 390 寬：最快討伐（兩個下拉＋武器圖）不橫向捲動（頁 ${h.page}、視窗 ${h.sheet}、面板 ${h.panel}、被切 ${h.cut}）`);
    await p.screenshot({ path: SHOT('mobile-fast') });
    await tab(p, 'acc'); h = await hscroll(p);
    ok(h.page <= 1 && h.sheet <= 1 && h.panel <= 1 && h.cut === 0, `手機 390 寬：神準名單不橫向捲動（頁 ${h.page}、視窗 ${h.sheet}、面板 ${h.panel}、被切 ${h.cut}）`);
    await p.screenshot({ path: SHOT('mobile-acc') });
    const fonts = await p.evaluate(() => [...document.querySelectorAll('#nw-rank [data-rbrow] *, #nw-rank [data-rb-out]')].filter(e => e.childElementCount === 0 && e.textContent.trim()).map(e => parseFloat(getComputedStyle(e).fontSize)).reduce((a, b) => Math.min(a, b), 99));
    ok(fonts >= 12.5, `手機：榜單最小的字 ${fonts.toFixed(1)}px（≥ 12.8px 的規定，容許一點四捨五入）`);
    await p.close();
    const q = await open({ vw: 390, vh: 800, boards: {} });
    await openRank(q); h = await hscroll(q);
    ok(h.page <= 1 && h.sheet <= 1 && h.cut === 0, '手機 390 寬：空榜也不橫向捲動');
    await q.screenshot({ path: SHOT('mobile-empty') });
    await q.close();
  }
  await browser.close();
}
