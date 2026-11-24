/* 2a 榮譽碑（docs/SPEC-STAGE2.md §2、§5 的 2a-1、§6；編號 nw16，原因見 nw12.test.js 開頭）。
   前半「不開瀏覽器」：teacher/rank-calc.js 的純函式，用 node 直接測（跟 nw13.test.js 同一種做法）；後半 browserHalf()：教師頁 🏆、總覽、舊控制台背景更新（要靜態伺服器與 playwright）。
   用法：node tools/browser-test/nw16.test.js

   涵蓋：q 切回每題；進步（兩邊各 3 場、最好 3 場平均、同題目等級才比、跨題目等級不混、下降／持平／太小不顯示、> 60% 標 ⚠、> 100% 先不上榜、
   用伺服器 ts 不用 t）；週切換邊界（台灣時間週一 00:00，UTC 週日 16:00）；排除（待審、判決、先不上榜、正確率不足）；
   最快討伐；神準名單（不排名次）；▲／新上榜／下降不顯示；彙總輸出不含身分欄位、沒有巢狀陣列與 undefined；
   增量處理與一次算完結果相同（隨機資料、重複讀、打亂順序）；空資料、只有 1 人、同分、ts 缺漏、q 長度不對等邊界。 */
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* ═══ 瀏覽器那一半（教師頁 teacher/tab-rank.js、總覽、舊控制台背景更新）寫在檔案最後的 browserHalf()，純函式測完才開瀏覽器 ═══
   需要靜態伺服器（python3 -m http.server 8765）與 playwright；沒有 playwright 時只印 SKIP。
   學生端 nw-rank.js（只讀 1 份 mg_nw_board/{年級}、前 10＋自己、榜外不顯示名次、▲／🆕、神秘獵人、讀不到、手機）的測試在 nw17.test.js。
   假資料庫 mock/fs.js 不會擋巢狀陣列、undefined、單文件 1 MB：頁面寫出去的 mg_nw_board*／mg_nw_board_private* 用 R.checkDoc 再掃一遍。 */

(async () => {
  const D = await import('../../nw-data.js');
  const R = await import('../../teacher/rank-calc.js');
  const HOUR = 3600e3, DAY = 24 * HOUR, WEEK = 7 * DAY, TW = 8 * HOUR;

  /* ── 時間：BASE＝台灣時間某個星期一 00:00（週 0）；週 k 的第 d 天中午 ── */
  const BASE = Date.UTC(2026, 9, 19) - TW;                 // 2026-10-19（星期一）台灣時間 00:00
  ok(new Date(BASE + TW).getUTCDay() === 1, '測試用的 BASE 是台灣時間的星期一');
  const at = (week, day = 0, hour = 12) => BASE + week * WEEK + day * DAY + hour * HOUR;
  const W0 = R.twWeek(BASE);
  const NOW = at(5, 2);                                    // 週 5 的星期三：最近兩週＝週 4、週 5；兩週以前＝週 3 以前

  /* ── 假資料 ── */
  let seq = 0;
  /* cpm 用 120000 的因數（30、40、48、50、60、64、75、80、96、100、120），每題 2 字、全部同樣毫秒，算出來剛好整數 */
  function mk(o = {}) {
    const cls = o.cls || '五年級4班', seat = o.seat || 5, cpm = o.cpm || 60, n = o.n || 12, acc = o.acc === undefined ? 1 : o.acc;
    const ms = Math.round(120000 / cpm);
    const qq = o.q || Array.from({ length: n }, () => [2, 5, ms, 2]);
    const cor = qq.reduce((a, x) => a + x[3], 0), act = qq.reduce((a, x) => a + x[2], 0) / 1000;
    const r = {
      id: `${cls}_${seat}號`, cls, seat, uid: 'uid-' + cls + seat, t: 1700000000000 + (++seq), ts: o.ts === undefined ? at(5, 0) : o.ts, v: 1, app: '3.15.0',
      mk: o.mk || 'coo', rk: 'grass', star: o.star || 3, lv: o.lv === undefined ? 6 : o.lv, qb: 'x', res: o.res || 'win', secs: o.secs === undefined ? Math.round((act + 10) * 10) / 10 : o.secs,
      acc, ans: qq.length, cor, typ: o.typ === undefined ? (acc < 1 ? Math.floor(cor / acc) : cor) : o.typ, keys: o.keys === undefined ? qq.length * 5 : o.keys, nokey: 0, act: Math.round(act * 10) / 10,
      cpm: o.storedCpm === undefined ? 999 : o.storedCpm,       // 故意寫錯：老師端要自己從 q 重算
      fl: { fast: 0, paste: 0, wrong: 0 }, sus: o.sus || [], w: o.w === undefined ? 'dagger' : o.w, atk: 105, pw: o.pw === undefined ? 45 : o.pw, tier: 'B', q: [].concat(...qq)
    };
    if (o.ok !== undefined) r.ok = o.ok;
    if (o.t) r.t = o.t;
    return r;
  };
  const rid = r => `${r.id}_${r.t}`;
  const idOf = (cls, seat) => `${cls}_${seat}號`;
  const ID5 = idOf('五年級4班', 5);
  /* 一個人的「兩邊各 3 場」：舊的 3 場在週 1、2、3，新的 3 場在週 4、5 */
  const series = (o, oldC, newC) => [
    ...oldC.map((c, i) => mk({ ...o, cpm: c, ts: at(1 + i, 1) })),
    ...newC.map((c, i) => mk({ ...o, cpm: c, ts: at(4 + (i > 0 ? 1 : 0), 1 + i) }))
  ];
  const go = (runs, o = {}) => R.updateBoards(o.priv || null, runs, { now: NOW, ...o });
  const avg = a => a.reduce((s, x) => s + x, 0) / a.length;
  const r1 = x => Math.round(x * 10) / 10;

  /* ═══ 1. q 切回每題 ═══ */
  ok(same(R.splitQ([2, 5, 2400, 2, 3, 8, 3000, 3]), [[2, 5, 2400, 2], [3, 8, 3000, 3]]), 'q：平的數字陣列每 4 個切回一題 [字數, 按鍵, 毫秒, 打對]');
  ok(same(R.splitQ([]), []), 'q：空陣列＝0 題（不是壞資料）');
  ok(R.splitQ([2, 5, 2400]) === null && R.splitQ([2, 5, 2400, 2, 1]) === null && R.splitQ([1, 2, 3, 4, 5, 6, 7]) === null, 'q：長度不是 4 的倍數 → null');
  ok(R.splitQ([2, -1, 2400, 2]) === null && R.splitQ([2, 5, 'x', 2]) === null && R.splitQ([2, 5, NaN, 2]) === null && R.splitQ([2, 5, null, 2]) === null, 'q：負數、非數字、NaN、null → null');
  ok(R.splitQ([2, 5, 2400, 3]) === null, 'q：打對的字比題目字數多 → null');
  ok(R.splitQ(undefined) === null && R.splitQ('abc') === null && R.splitQ({ length: 4 }) === null && R.splitQ([[2, 5, 2400, 2]]) === null, 'q：不是陣列或是巢狀陣列 → null');

  /* ═══ 2. 時間 ═══ */
  ok(R.tsMs(123) === 123 && R.tsMs({ toMillis: () => 456 }) === 456 && R.tsMs({ seconds: 2, nanoseconds: 5e6 }) === 2005 && R.tsMs(new Date(789)) === 789, 'tsMs：毫秒、Timestamp（toMillis）、{seconds}、Date 都收');
  ok(['abc', null, undefined, NaN, {}, [], true].every(v => Number.isNaN(R.tsMs(v))), 'tsMs：缺漏或怪值 → NaN');
  ok(R.twWeek(BASE) === W0 && R.twWeek(BASE - 1) === W0 - 1, '週切換：台灣時間星期一 00:00:00 是新的一週，前 1 毫秒還是上一週');
  ok(R.twWeek(BASE + WEEK - 1) === W0 && R.twWeek(BASE + WEEK) === W0 + 1, '週切換：星期日 23:59:59.999 還是同一週');
  ok(R.twWeek(Date.UTC(2026, 9, 25, 15, 59, 59)) === W0 && R.twWeek(Date.UTC(2026, 9, 25, 16, 0, 0)) === W0 + 1, '週切換看台灣時間：UTC 星期日 16:00 ＝ 台灣星期一 00:00');
  ok(R.twWeek(at(5, 3)) - R.twWeek(at(0, 3)) === 5, '同一個星期幾，差 5 週就是差 5');

  /* ═══ 3. normalizeRun ═══ */
  let n = R.normalizeRun(mk({ cpm: 60, storedCpm: 5, star: 3, lv: 6 }));
  ok(n.ok && n.run.cpm === 60 && n.run.qs.length === 12, '每場速度：用 q 重算（打對字數 ÷ 各題毫秒加總 × 60），不信 run 寫的 cpm');
  ok(n.run.qb === D.qBand(3, 6) && R.normalizeRun({ ...mk({ star: 5, lv: 22 }), qb: '4:0' }).run.qb === D.qBand(5, 22), '題目等級：用 nw-data.js 的 qBand(star, lv) 重算，不信 run 的 qb');
  ok(n.run.acc === 1 && R.normalizeRun(mk({ acc: 0.95 })).run.acc <= 0.95, '正確率：取 acc 與 cor÷typ 較低的那個');
  ok(R.normalizeRun(mk({ acc: 1, typ: 48 })).run.acc === 0.5, '正確率：run 寫 acc 1 但 cor÷typ 只有 0.5 → 用 0.5');
  const bad = (o, why) => { const x = R.normalizeRun(o); return !x.ok && x.why === why; };
  ok(bad(mk({ ts: undefined === 0 ? 0 : null }), 'ts') && bad({ ...mk(), ts: undefined }, 'ts') && bad(mk({ ts: 0 }), 'ts') && bad(mk({ ts: -5 }), 'ts') && bad({ ...mk(), ts: 'now' }, 'ts'), 'ts 缺漏、null、0、負數、字串 → 略過（why: ts）');
  ok(bad({ ...mk(), q: [2, 5, 2400, 2, 1, 1, 1] }, 'q') && bad({ ...mk(), q: undefined }, 'q') && bad({ ...mk(), q: [[2, 5, 2400, 2]] }, 'q'), 'q 長度不是 4 的倍數、沒有 q、巢狀 q → 略過（why: q）');
  ok(bad(mk({ q: Array.from({ length: 121 }, () => [2, 5, 2400, 2]) }), 'q') && R.normalizeRun(mk({ q: Array.from({ length: 120 }, () => [2, 5, 2400, 2]), n: 120 })).ok, 'q 超過 120 題略過、剛好 120 題收');
  ok(bad({ ...mk(), id: '五年級4班_6號' }, 'id') && bad({ ...mk(), seat: '5' }, 'seat') && bad({ ...mk(), cls: '三年級2班', id: '三年級2班_5號' }, 'grade') && bad({ ...mk(), cls: '亂寫' }, 'grade'), 'id 與班級座號對不上、座號不是整數、不是四～六年級、班級亂寫 → 略過');
  ok(bad({ ...mk(), mk: 'dragon' }, 'mk') && bad({ ...mk(), mk: '__proto__' }, 'mk') && bad({ ...mk(), mk: 'toString' }, 'mk') && bad({ ...mk(), star: 6 }, 'star') && bad({ ...mk(), star: 2.5 }, 'star'), '不是已知魔物（含 __proto__、toString）、星級不對 → 略過（公開榜單的 key 不能讓學生決定）');
  ok(bad({ ...mk(), secs: 611 }, 'secs') && R.normalizeRun({ ...mk(), secs: 610 }).ok && bad({ ...mk(), secs: -1 }, 'secs') && bad({ ...mk(), acc: 1.2 }, 'acc') && bad({ ...mk(), acc: 'x' }, 'acc') && bad({ ...mk(), lv: 0 }, 'lv') && bad({ ...mk(), ans: -1 }, 'num') && bad({ ...mk(), t: 'x' }, 't'), '秒數、正確率、等級、數字欄位超出範圍 → 略過');
  ok(bad({ ...mk(), _rid: '別的ID_1' }, 'rid') && R.normalizeRun({ ...mk(), _rid: 'x' }).ok === false && (r => R.normalizeRun({ ...r, _rid: rid(r) }).ok)(mk()), '文件 ID 跟 id＋t 對不上 → 略過；對得上才收');
  ok(['x', 5, null, undefined, [], true].every(v => bad(v, 'shape')), '不是物件的東西（字串、數字、null、undefined、陣列）→ 略過，不會丟例外');
  ok(bad(mk({ res: 'fail', q: Array.from({ length: 2 }, () => [2, 5, 2400, 2]) }), 'invalid') && R.normalizeRun(mk({ res: 'fail', n: 3 })).ok && R.normalizeRun(mk({ res: 'win', n: 1 })).ok, '沒打贏又答不到 3 題 → 略過；輸了但答 ≥ 3 題、或打贏 → 收');
  ok(R.normalizeRun(mk({ ts: { toMillis: () => at(5, 0) } })).ok && R.normalizeRun(mk({ ts: { seconds: Math.floor(at(5, 0) / 1000), nanoseconds: 0 } })).run.ts === Math.floor(at(5, 0) / 1000) * 1000, 'ts 是 Firestore Timestamp 也能收');
  ok(R.gradeOf('四年級1班') === '4' && R.gradeOf('五年級12班') === '5' && R.gradeOf('六年級3班') === '6' && R.gradeOf('三年級1班') === null && R.gradeOf(undefined) === null && R.gradeOf('五年級班') === null, 'gradeOf：四五六年級才有榜');

  /* ═══ 4. 進步 ═══ */
  const names = { [ID5]: { name: '小明' } };
  let res = go(series({}, [50, 50, 50], [60, 60, 60]), { people: names });
  let row = res.boards['5'].improve[0];
  ok(res.boards['5'].improve.length === 1 && row.v === 20 && row.qb === D.qBand(3, 6) && row.r === 1 && row.up === 0 && row.c === '504' && row.s === 5 && row.n === '小明', '進步：舊 3 場平均 50、新 3 場平均 60 → 打字變快 20%（含班級短碼 504、座號、名字、題目等級）');
  ok(res.boards['4'].improve.length === 0 && res.boards['6'].improve.length === 0, '年級分開：五年級的人只出現在五年級榜');

  const o1 = [40, 50, 60], n1 = [50, 60, 80];
  res = go(series({}, o1, n1));
  ok(res.boards['5'].improve[0].v === r1((avg(n1) / avg(o1) - 1) * 100), '進步：比的是平均，數字取到 0.1％');
  const oldBest = [50, 50, 50, 100, 30].map((c, i) => mk({ cpm: c, ts: at(1 + (i >> 1), i % 2) })), newBest = [60, 60, 60, 120, 20].map((c, i) => mk({ cpm: c, ts: at(4 + (i >> 2), i % 4) }));
  res = go([...oldBest, ...newBest]);
  ok(res.boards['5'].improve[0] && res.boards['5'].improve[0].v === r1((avg([120, 60, 60]) / avg([100, 50, 50]) - 1) * 100), '進步：兩邊都只取「最好 3 場」的平均（慢的幾場不拉低）');

  /* 兩邊各 3 場才有分數 */
  ok(go(series({}, [50, 50], [60, 60, 60])).boards['5'].improve.length === 0, '只有 2 場舊的 → 沒有進步分數');
  ok(go(series({}, [50, 50, 50], [60, 60])).boards['5'].improve.length === 0, '只有 2 場新的 → 沒有進步分數');
  ok(go(series({}, [50, 50, 50], [])).boards['5'].improve.length === 0 && go(series({}, [], [60, 60, 60])).boards['5'].improve.length === 0, '只有一邊 → 沒有進步分數');
  /* 題目等級不混 */
  const A = { star: 3, lv: 6 }, B = { star: 1, lv: 6 }, C = { star: 5, lv: 22 };
  ok(go([...series(A, [50, 50, 50], []), ...series(B, [], [60, 60, 60])]).boards['5'].improve.length === 0, '舊的在 ★3～4 題目、新的在 ★1～2 題目 → 不能比（跨題目等級不混）');
  ok(go([...series(A, [50, 50], [60, 60, 60]), ...series(B, [50], [])]).boards['5'].improve.length === 0, '舊的 2 場＋另一個等級 1 場 → 不能湊成 3 場');
  ok(D.qBand(1, 6) === D.qBand(2, 6) && D.qBand(3, 6) === D.qBand(4, 6) && D.qBand(1, 6) !== D.qBand(3, 6) && D.qBand(1, 9) !== D.qBand(1, 10) && D.qBand(5, 19) !== D.qBand(5, 20), '題目等級：星級 1～2、3～4、5 與魔物等級 <10、<20、其他（用 nw-data.js 的 qBand）');
  res = go([...series(A, [50, 50, 50], [55, 55, 55]), ...series(C, [50, 50, 50], [70, 70, 70])]);
  ok(res.boards['5'].improve.length === 1 && res.boards['5'].improve[0].v === 40 && res.boards['5'].improve[0].qb === D.qBand(5, 22), '兩個題目等級都有分數 → 只留進步最多的那個（榜上寫是哪一級）');
  /* 下降不顯示 */
  ok(go(series({}, [60, 60, 60], [50, 50, 50])).boards['5'].improve.length === 0, '變慢（下降）→ 不上進步榜');
  ok(go(series({}, [60, 60, 60], [60, 60, 60])).boards['5'].improve.length === 0, '一樣快（0%）→ 不上榜');
  ok(go(series({}, [1000, 1000, 1000].map(() => 60), [60, 60, 60])).boards['5'].improve.length === 0, '進步不到 1% → 不顯示「變快 0%」');
  ok(R.RANK.improveMin === 1 && R.RANK.improveNeed === 3 && R.RANK.listMax === 10, '門檻常數：1%、3 場、前 10 名');
  /* 太誇張 */
  res = go(series({}, [50, 50, 50], [80, 80, 80]));
  ok(res.boards['5'].improve[0].v === 60 && res.review['5'].improveWarn.length === 0, '進步剛好 60% → 上榜，不標 ⚠');
  res = go(series({}, [50, 50, 50], [96, 96, 96]));
  ok(res.boards['5'].improve[0].v === 92 && res.review['5'].improveWarn.length === 1 && res.review['5'].improveWarn[0].id === ID5 && res.review['5'].improveWarn[0].v === 92, '進步超過 60%（92%）→ 照樣上榜，教師頁 improveWarn 標 ⚠');
  res = go(series({}, [40, 40, 40], [96, 96, 96]));
  ok(res.boards['5'].improve.length === 0 && res.review['5'].improveHold.length === 1 && res.review['5'].improveHold[0].v === 140, '進步超過 100%（140%）→ 先不上榜，列在 improveHold 給老師看');
  res = go([...series(A, [40, 40, 40], [96, 96, 96]), ...series(C, [50, 50, 50], [60, 60, 60])]);
  ok(res.boards['5'].improve.length === 1 && res.boards['5'].improve[0].v === 20 && res.review['5'].improveHold.length === 1, '一個等級超過 100%、另一個等級正常 → 榜上放正常的，過頭的給老師看');
  /* 正確率不足的場次不算 */
  const lowAcc = [...series({}, [50, 50, 50], [60, 60, 60]), mk({ cpm: 120, acc: 0.85, ts: at(5, 1) }), mk({ cpm: 120, acc: 0.89, ts: at(5, 1) })];
  ok(go(lowAcc).boards['5'].improve[0].v === 20, '正確率不到 90% 的場次不列入「最好 3 場」（再快也不算）');
  res = go([...series({}, [50, 50, 50], [60, 60]), mk({ cpm: 60, acc: 0.9, ts: at(5, 1) })]);
  ok(res.boards['5'].improve.length === 1 && res.boards['5'].improve[0].v === 20, '正確率剛好 90% 的場次算數');
  ok(go([...series({}, [50, 50, 50], [60, 60]), mk({ cpm: 60, acc: 0.899, ts: at(5, 1) })]).boards['5'].improve.length === 0, '正確率 89.9% 不算數');
  /* 輸掉的場次也算速度 */
  ok(go(series({ res: 'fail' }, [50, 50, 50], [60, 60, 60])).boards['5'].improve[0].v === 20, '輸掉的場次（答 ≥ 3 題）也算打字速度');
  /* V2：滿 10 分鐘魔物逃走（res: 'escape'、secs 600）。只看 res === 'win'，所以不算贏、不算最快，但算打字速度；secs 600 不能被當成壞資料丟掉 */
  const esc = o => mk({ res: 'escape', secs: 600, ...o });
  ok(R.normalizeRun(esc()).ok && R.normalizeRun(esc()).run.win === false && R.normalizeRun(esc()).run.secs === 600, 'V2：逃走（secs 600）收進來，win 是 false');
  ok(go(series({ res: 'escape', secs: 600 }, [50, 50, 50], [60, 60, 60])).boards['5'].improve[0].v === 20, 'V2：逃走的場次（答 ≥ 3 題）算打字速度');
  ok(bad(esc({ n: 2 }), 'invalid'), 'V2：逃走但答不到 3 題 → 略過（跟輸掉一樣）');
  /* 用 ts 不用 t */
  const tsTest = [...series({}, [50, 50, 50], []), ...[60, 60, 60].map((c, i) => mk({ cpm: c, ts: at(5, i), t: at(0, i) }))];   // t 是很久以前、ts 是這週
  ok(go(tsTest).boards['5'].improve[0].v === 20, '分週用伺服器 ts：本機時間 t 寫成很久以前也沒有用（算在最近兩週）');
  const tsTest2 = [...series({}, [], [60, 60, 60]), ...[50, 50, 50].map((c, i) => mk({ cpm: c, ts: at(5, i), t: at(0, i) }))];
  ok(go(tsTest2).boards['5'].improve.length === 0, '本機時間 t 寫成很久以前、ts 是這週：不會被算進「兩週以前」');

  /* ═══ 5. 週切換邊界（最近兩週＝這週＋上週，週一 00:00 台灣時間切換）═══ */
  const edge = (zTs) => [
    ...[0, 1].map(i => mk({ cpm: 50, ts: at(1, i) })), mk({ cpm: 50, ts: zTs }),
    ...[0, 1, 2].map(i => mk({ cpm: 60, ts: at(5, i) }))
  ];
  /* 週 3 的最後一刻（週日 23:59:59.999）是兩週以前；週 4 的第一刻（週一 00:00）是最近兩週 */
  res = go(edge(at(4, 0, 0) - 1));
  ok(res.boards['5'].improve.length === 1 && res.boards['5'].improve[0].v === 20, '邊界：週日 23:59:59.999 算兩週以前 → 舊的剛好 3 場，有分數');
  res = go(edge(at(4, 0, 0)));
  ok(res.boards['5'].improve.length === 0, '邊界：隔週一 00:00:00 算最近兩週（差 1 毫秒）→ 舊的只剩 2 場，沒有分數');
  const oldTwo = [0, 1].map(i => mk({ cpm: 50, ts: at(1, i) })), oldZ = mk({ cpm: 50, ts: at(3, 6) }), newTwo = [0, 1].map(i => mk({ cpm: 60, ts: at(5, i) }));
  res = go([...oldTwo, oldZ, ...newTwo, mk({ cpm: 60, ts: at(4, 0, 0) })]);
  ok(res.boards['5'].improve.length === 1, '邊界：週一 00:00:00 的場次算最近兩週 → 新的剛好 3 場，有分數');
  res = go([...oldTwo, oldZ, ...newTwo, mk({ cpm: 60, ts: at(4, 0, 0) - 1 })]);
  ok(res.boards['5'].improve.length === 0, '邊界：週日 23:59:59.999 的場次不算最近兩週 → 新的只有 2 場，沒有分數');
  /* 時間往後走：同一批紀錄，再過一週，「最近兩週」滑動，週 4 的場次變成兩週以前 */
  const slide = [...series({}, [50, 50, 50], []), ...[60, 60, 60].map((c, i) => mk({ cpm: c, ts: at(5, i) }))];
  ok(R.publish(go(slide).states, at(5, 4)).boards['5'].improve.length === 1 && R.publish(go(slide).states, at(6, 4)).boards['5'].improve.length === 1 && R.publish(go(slide).states, at(7, 0)).boards['5'].improve.length === 0, '沒有新紀錄、時間過了也會重算：週 5 的場次在週 6 還是「最近」，到週 7 就變成「兩週以前」（新的那邊沒場次了）');
  ok(R.publish(go(slide).states, at(5, 4)).boards['5'].week === R.twWeek(at(5, 4)) && go(slide).boards['5'].t === NOW, '榜單記錄更新時間 t 與第幾週 week');

  /* ═══ 6. 排除：待審、判決、先不上榜、正確率 ═══ */
  const clean = () => series({}, [50, 50, 50], [60, 60, 60]);
  const bk = (o = {}) => mk({ cpm: 120, keys: 10, ts: at(5, 1), ...o });        // 打對 24 字、只按 10 個鍵 → keys
  /* 6a. 被標記的場次進待審，不計入 */
  let base = clean(), flagged = bk(), plus = [...base, flagged];
  res = go(plus);
  ok(res.boards['5'].improve[0].v === 20, '可疑（keys：按鍵太少）的場次不計入進步（就算它很快）');
  ok(res.review['5'].held.length === 1 && res.review['5'].held[0].rid === rid(flagged) && same(res.review['5'].held[0].why, ['keys']) && res.review['5'].held[0].id === ID5 && res.stats.held === 1, '待審清單有這一場：runId、原因代碼 keys、學生文件 ID（教師頁用，不會寫進榜單）');
  ok(!JSON.stringify(res.boards).includes(rid(flagged)), '待審的 runId 不在學生讀得到的榜單裡');
  /* 6b. 老師放行（verdicts）→ 計入；不採計 → 移除 */
  let r2 = R.updateBoards(res.states, [], { now: NOW, verdicts: { [rid(flagged)]: 1 } });
  ok(r2.boards['5'].improve[0].v > 20 && r2.review['5'].held.length === 0 && r2.stats.released === 1, '老師按「沒問題」（verdicts: 1）→ 這場計入，不用重讀舊紀錄');
  r2 = R.updateBoards(res.states, [], { now: NOW, verdicts: { [rid(flagged)]: -1 } });
  ok(r2.boards['5'].improve[0].v === 20 && r2.review['5'].held.length === 0 && r2.stats.dropped === 1 && !JSON.stringify(r2.states).includes(String(flagged.t)), '老師按「不採計」（verdicts: -1）→ 從狀態移除、不再出現');
  r2 = go([...base, { ...flagged, ok: 1 }]);
  ok(r2.boards['5'].improve[0].v > 20 && r2.review['5'].held.length === 0, 'run 文件自己的 ok: 1（老師放行）也算');
  r2 = go([...base, { ...flagged, ok: -1 }]);
  ok(r2.boards['5'].improve[0].v === 20 && r2.review['5'].held.length === 0 && r2.stats.dropped === 0, 'run 文件的 ok: -1（不採計）→ 不計入、不進待審');
  r2 = go([...base, { ...flagged, ok: -1 }], {});
  r2 = R.updateBoards(go(plus).states, [{ ...flagged, ok: -1 }], { now: NOW });
  ok(r2.boards['5'].improve[0].v === 20 && r2.review['5'].held.length === 0 && r2.stats.dropped === 1, '已經在待審的場次，之後讀到 ok: -1 → 移除');
  r2 = R.updateBoards(go(plus).states, [{ ...flagged, ok: 1 }], { now: NOW });
  ok(r2.boards['5'].improve[0].v > 20 && r2.review['5'].held.length === 0 && r2.stats.released === 1, '已經在待審的場次，之後讀到 ok: 1 → 放行');
  const r3 = R.updateBoards(r2.states, [flagged], { now: NOW });                    // 同一場再讀一次（沒帶 ok）：不會被打回待審
  ok(r3.review['5'].held.length === 0 && r3.boards['5'].improve[0].v === r2.boards['5'].improve[0].v, '已放行的場次又被讀到一次（游標重疊）：不會被打回待審');
  ok(R.updateBoards(go(plus).states, [], { now: NOW, verdicts: { 'x_y': 1, '': -1, [idOf('五年級4班', 9) + '_5']: -1, [ID5 + '_abc']: 1 } }).boards['5'].improve[0].v === 20, 'verdicts 的 runId 亂寫或找不到：忽略，不丟例外');
  /* 6c. run 自己寫的 sus、老師重算 */
  res = go([...base, mk({ cpm: 120, ts: at(5, 1), sus: ['fast'] })]);
  ok(res.review['5'].held.length === 1 && same(res.review['5'].held[0].why, ['fast']) && res.boards['5'].improve[0].v === 20, 'run 自己寫 sus: [fast] → 待審（就算 q 看起來沒事）');
  res = go([...base, mk({ cpm: 120, ts: at(5, 1), sus: ['亂寫', 'keys', 5, null] })]);
  ok(same(res.review['5'].held[0].why, ['keys']), 'sus 裡不認得的代碼（亂寫、數字、null）被濾掉');
  res = go([...base, mk({ q: Array.from({ length: 12 }, () => [2, 5, 300, 2]), storedCpm: 50, ts: at(5, 1) })]);
  ok(res.review['5'].held.length === 1 && res.review['5'].held[0].why.includes('fast'), '老師端重算：run 寫 cpm 50 騙人，但 q 顯示每題 0.3 秒 → fast 待審');
  res = go([...base, { ...mk({ ts: at(5, 1) }), cor: 99 }]);
  ok(res.review['5'].held.length === 1 && res.review['5'].held[0].why.includes('sum'), '老師端重算：整場打對字數跟每題加總對不起來 → sum 待審');
  /* 6d. jump：自己同題目等級前 5 場的 3 倍 */
  const hist5 = [30, 30, 30, 30, 30].map((c, i) => mk({ cpm: c, ts: at(1, i) }));
  res = go([...hist5, mk({ cpm: 100, ts: at(2, 0) })]);
  ok(res.review['5'].held.length === 1 && same(res.review['5'].held[0].why, ['jump']), '進步太跳：前 5 場中位數 30、這場 100（> 3 倍）→ jump 待審');
  res = go([...hist5.slice(0, 4), mk({ cpm: 100, ts: at(2, 0) })]);
  ok(res.review['5'].held.length === 0, '前面只有 4 場 → 不判斷 jump');
  res = go([...hist5, mk({ cpm: 80, ts: at(2, 0) })]);
  ok(res.review['5'].held.length === 0, '前 5 場中位數 30、這場 80（< 3 倍）→ 沒事');
  res = go([...hist5.map(r => ({ ...r, mk: 'frog', star: 5, lv: 22 })), mk({ cpm: 100, ts: at(2, 0) })]);
  ok(res.review['5'].held.length === 0, 'jump 只跟同一個題目等級的歷史比');
  /* 6e. 先不上榜 */
  let pr = go(clean(), { people: names });
  ok(pr.boards['5'].improve.length === 1, '（前置）未被擋的人在榜上');
  const blocked = R.setBlocked(pr.states, ID5, { until: 0, why: '老師自己看得到的理由' });
  let rb = R.updateBoards(blocked, [], { now: NOW });
  ok(rb.boards['5'].improve.length === 0 && same(rb.review['5'].blocked.map(b => b.id), [ID5]) && rb.states['5'].blocked[ID5].why === '老師自己看得到的理由', '「這個人先不上榜」：從榜上消失，理由只在私有狀態與教師頁');
  ok(!JSON.stringify(rb.boards).includes('老師自己看得到的理由'), '先不上榜的理由不會出現在學生讀得到的榜單');
  rb = R.updateBoards(R.setBlocked(pr.states, ID5, { until: NOW + 1000, why: '一週' }), [], { now: NOW });
  ok(rb.boards['5'].improve.length === 0, '有期限的先不上榜：期限內不在榜上');
  rb = R.updateBoards(R.setBlocked(pr.states, ID5, { until: NOW + 1000, why: '一週' }), [], { now: NOW + 2000 });
  ok(rb.boards['5'].improve.length === 1 && rb.review['5'].blocked.length === 0, '期限過了自動恢復（不用老師再按）');
  rb = R.updateBoards(R.setBlocked(R.setBlocked(pr.states, ID5, { until: 0, why: 'x' }), ID5, null), [], { now: NOW });
  ok(rb.boards['5'].improve.length === 1, '解除先不上榜（info 傳 null）→ 回到榜上');
  ok(R.isBlocked({ blocked: { a: { until: 0 } } }, 'a', NOW) && !R.isBlocked({ blocked: {} }, 'a', NOW) && !R.isBlocked(null, 'a', NOW), 'isBlocked：until 0＝沒有期限；沒有這個人、沒有狀態都是 false');
  rb = R.updateBoards(R.setBlocked(null, ID5, { until: 0, why: 'x' }), clean(), { now: NOW });
  ok(rb.boards['5'].improve.length === 0 && rb.states['5'].students[ID5].runs.length === 6, '先不上榜的人紀錄照收（解除後馬上有榜）');
  let threw = false; try { R.setBlocked(null, '亂寫', { until: 0 }); } catch (e) { threw = true; }
  ok(threw, 'setBlocked：不認得的文件 ID → 丟例外（不會把垃圾寫進私有狀態）');
  rb = R.updateBoards(R.setBlocked(null, ID5, { until: 0, why: 'x' }), [...clean(), ...series({ cls: '五年級4班', seat: 6 }, [50, 50, 50], [60, 60, 60]), mk({ cpm: 60, res: 'win', ts: at(5, 0) })], { now: NOW });
  ok(rb.boards['5'].improve.length === 1 && rb.boards['5'].improve[0].s === 6, '先不上榜只影響那個人，別人照常');
  /* 6f. 先不上榜也擋最快討伐與神準名單 */
  const fastRuns = [mk({ cpm: 60, secs: 40, ts: at(5, 0) })];
  const accRuns = Array.from({ length: 10 }, (_, i) => mk({ lv: 12, ts: at(2 + (i >> 2), i % 4), cpm: 60 }));
  ok(go([...fastRuns, ...accRuns]).boards['5'].fast['coo:3'].length === 1 && go([...fastRuns, ...accRuns]).boards['5'].acc.list.length === 1, '（前置）最快與神準各有 1 人');
  rb = R.updateBoards(R.setBlocked(null, ID5, { until: 0, why: 'x' }), [...fastRuns, ...accRuns], { now: NOW });
  ok(Object.keys(rb.boards['5'].fast).length === 0 && rb.boards['5'].acc.list.length === 0, '先不上榜：最快討伐、神準名單也一併消失');

  /* ═══ 7. 最快討伐 ═══ */
  const F = (seat, secs, o = {}) => mk({ seat, cpm: 60, secs, n: 2, ts: at(5, 0), ...o });
  res = go([F(1, 50), F(2, 40), F(3, 60), F(2, 45), F(4, 70, { mk: 'frog', star: 2, w: 'bow', pw: 12 })], {});
  let fb = res.boards['5'].fast;
  ok(same(Object.keys(fb).sort(), ['coo:3', 'frog:2']), '最快討伐：依「魔物:星級」分開');
  ok(same(fb['coo:3'].map(x => [x.s, x.v, x.r]), [[2, 40, 1], [1, 50, 2], [3, 60, 3]]), '每個人取最快的一場（座號 2 有 40 與 45 兩場，只算 40），秒數小的在前，名次 1、2、3');
  ok(fb['coo:3'][0].w === 'dagger' && fb['coo:3'][0].pw === 45 && fb['frog:2'][0].w === 'bow' && fb['frog:2'][0].pw === 12, '每列帶武器與戰力（配裝也算，榜上標出來）');
  ok(go([F(1, 50, { res: 'fail' }), F(2, 60, { res: 'retreat', n: 5 })]).boards['5'].fast['coo:3'] === undefined, '只算打贏的場次（輸掉、撤退不算最快）');
  ok(go([F(1, 50, { res: 'fail' }), F(2, 60, { res: 'retreat', n: 5 }), F(3, 600, { res: 'escape' })]).boards['5'].fast['coo:3'] === undefined, 'V2：逃走（600 秒）不算最快');
  ok(same(go([F(1, 400, { res: 'escape' }), F(2, 60)]).boards['5'].fast['coo:3'].map(x => x.s), [2]), 'V2：逃走的人不在最快榜上，旁邊打贏的人照常上榜');
  ok(go([F(1, 50, { acc: 0.88 }), F(2, 60)]).boards['5'].fast['coo:3'].length === 1 && go([F(1, 50, { acc: 0.88 }), F(2, 60)]).boards['5'].fast['coo:3'][0].s === 2, '正確率不到 90% 的最快紀錄不算');
  ok(go([F(1, 0)]).boards['5'].fast['coo:3'] === undefined, '0 秒的打贏不算（不然會永遠第一）');
  ok(go([F(1, 50), F(2, 40, { sus: ['keys'] })]).boards['5'].fast['coo:3'].length === 1 && go([F(1, 50), F(2, 40, { sus: ['keys'] })]).boards['5'].fast['coo:3'][0].s === 1, '待審的最快紀錄不上榜');
  res = go([F(1, 50), F(2, 50)]);
  ok(same(res.boards['5'].fast['coo:3'].map(x => x.r), [1, 1]), '同分：名次一樣（1、1）');
  res = go([F(1, 50, { ts: at(5, 1) }), F(2, 50, { ts: at(5, 0) }), F(3, 50, { ts: at(5, 2) }), F(4, 30)]);
  ok(same(res.boards['5'].fast['coo:3'].map(x => [x.s, x.r]), [[4, 1], [2, 2], [1, 2], [3, 2]]), '同分：名次相同（1224 式）、先拿到的排前面');
  const ten = Array.from({ length: 12 }, (_, i) => F(i + 1, 40 + i));
  res = go(ten);
  ok(res.boards['5'].fast['coo:3'].length === 10 && res.boards['5'].cut['fast:coo:3'] === 49 && res.boards['5'].fast['coo:3'][9].v === 49, '最快榜只留前 10 名；cut＝第 10 名的秒數（學生端「再快 N 秒就上榜」用）');
  ok(go(ten.slice(0, 9)).boards['5'].cut['fast:coo:3'] === undefined && go(ten.slice(0, 9)).boards['5'].fast['coo:3'].length === 9, '不到 10 人：沒有 cut（隨便一個人打贏都能上）');
  ok(res.view['5'].fast['coo:3'].length === 12 && res.view['5'].fast['coo:3'][0].id === idOf('五年級4班', 1) && res.view['5'].fast['coo:3'][0].rid, '教師頁 view 多給 id、rid（移除這筆用），而且不只前 10');
  res = go([F(1, 5, { mk: 'coo', n: 2 }), F(2, 11, { mk: 'frog', n: 2 }), F(3, 20, { mk: 'wolf', n: 2 }), F(4, 12, { mk: 'wolf', n: 2 })]);
  ok(same(res.review['5'].fastWarn.map(x => [x.mk, x.v, x.floor]).sort(), [['coo', 5, D.FASTEST_FLOOR.coo], ['frog', 11, D.FASTEST_FLOOR.frog], ['wolf', 12, D.FASTEST_FLOOR.wolf]].sort()), '比合理下限（FASTEST_FLOOR）還快的 → 教師頁 fastWarn ⚠，榜上照放');
  ok(res.boards['5'].fast['coo:3'].length === 1 && res.review['5'].fastWarn.every(x => x.id && x.rid), '⚠ 不擋榜；fastWarn 有 id 與 rid');

  /* ═══ 8. 神準名單 ═══ */
  const acc10 = (seat, accs, o = {}) => accs.map((a, i) => mk({ seat, acc: a, lv: 12, cpm: 60, ts: at(2 + Math.floor(i / 4), i % 4), ...o }));
  res = go(acc10(1, Array(10).fill(0.97)));
  ok(res.boards['5'].acc.list.length === 1 && res.boards['5'].acc.more === 0, '神準名單：10 場 Lv10 以上平均 97% → 上名單');
  ok(!('r' in res.boards['5'].acc.list[0]) && !('v' in res.boards['5'].acc.list[0]) && same(Object.keys(res.boards['5'].acc.list[0]).sort(), ['at', 'c', 'n', 's']), '神準名單不排名次、不放分數（只有班級、座號、名字、at）');
  ok(go(acc10(1, Array(9).fill(1))).boards['5'].acc.list.length === 0, '只有 9 場 → 不上名單');
  ok(go(acc10(1, [...Array(5).fill(1), ...Array(5).fill(0.94)])).boards['5'].acc.list.length === 1 && go(acc10(1, [...Array(5).fill(1), ...Array(5).fill(0.93)])).boards['5'].acc.list.length === 0, '平均 97% 才上（97.0% 上、96.5% 不上）');
  ok(go(acc10(1, Array(10).fill(0.96))).boards['5'].acc.list.length === 0, '平均 96% → 不上');
  ok(go([...acc10(1, Array(10).fill(1), { lv: 8 })]).boards['5'].acc.list.length === 0, 'Lv < 10 的場次不算');
  ok(go([...acc10(1, Array(9).fill(1)), ...acc10(1, [1], { lv: 8, ts: at(5, 0) })]).boards['5'].acc.list.length === 0, '9 場 Lv10 以上＋1 場 Lv8 → 只有 9 場，不上');
  ok(go(acc10(1, Array(10).fill(0.92))).boards['5'].acc.list.length === 0, '單場正確率 < 90% 的合格門檻另外擋（這裡是平均不到）');
  res = go([...acc10(1, [0.5, ...Array(10).fill(1)])]);
  ok(res.boards['5'].acc.list.length === 1 && res.review['5'].runs === 11, '第 1 場只有 50%（不合格、不列入），其餘 10 場平均 100% → 上名單');
  res = go(acc10(1, [0.97, ...Array(10).fill(1)]));
  ok(res.boards['5'].acc.list.length === 1, '最近 10 場才算：11 場裡前面慢慢變準也行');
  ok(go([...acc10(1, Array(10).fill(1)), mk({ seat: 1, acc: 0.85, lv: 12, cpm: 60, ts: at(5, 0) })]).boards['5'].acc.list.length === 1, '不合格（< 90%）的場次不進「最近 10 場」，不會把人踢出名單');
  ok(go([...acc10(1, Array(10).fill(1)), mk({ seat: 1, acc: 0.9, lv: 12, cpm: 60, ts: at(5, 0) })]).boards['5'].acc.list.length === 1 && go([...acc10(1, Array(10).fill(0.97)), mk({ seat: 1, acc: 0.9, lv: 12, cpm: 60, ts: at(5, 0) })]).boards['5'].acc.list.length === 0, '最近 10 場往前滑：新打一場 90%，平均從 97% 掉到 96%，就掉出名單');
  ok(go([...acc10(1, Array(10).fill(1)), mk({ seat: 1, acc: 1, lv: 12, cpm: 120, keys: 10, ts: at(5, 0) })]).boards['5'].acc.list.length === 1, '待審的場次不計入神準（也不拉低）');
  /* at＝這一段連續達標從哪一場開始 */
  const sA = acc10(1, Array(11).fill(1)), sorted = sA.slice().sort((a, b) => a.ts - b.ts);
  res = go(sA);
  ok(res.boards['5'].acc.list[0].at === sorted[9].ts, 'at：第 10 場開始達標；之後多打第 11 場還是同一段，at 不變');
  res = go([...acc10(1, Array(10).fill(1)), ...[0, 1, 2, 3].map(i => mk({ seat: 1, acc: 0.9, lv: 12, cpm: 60, ts: at(5, 0) + i })), ...Array.from({ length: 10 }, (_, i) => mk({ seat: 1, acc: 1, lv: 12, cpm: 60, ts: at(5, 1) + i }))]);
  ok(res.boards['5'].acc.list.length === 1 && res.boards['5'].acc.list[0].at === at(5, 1) + 6, 'at：中間連續 4 場 90% 掉出去、之後又回來 → 從「又達標」的那一場（第 7 場）算起');
  /* 排序：新的在前 */
  res = go([...acc10(1, Array(10).fill(1)), ...acc10(2, Array(10).fill(1), { ts: undefined }).map((r, i) => ({ ...r, ts: at(3 + (i >> 2), i % 4) })), ...acc10(3, Array(10).fill(1)).map((r, i) => ({ ...r, ts: at(4 + (i >> 3), (i % 4) + 1) }))]);
  ok(res.boards['5'].acc.list.length === 3 && res.boards['5'].acc.list[0].s === 3 && res.boards['5'].acc.list[2].s === 1, '名單：最近達標的在前（新的在前）');
  const many = []; for (let s = 1; s <= 25; s++) many.push(...acc10(s, Array(10).fill(1), { cls: '五年級' + (1 + (s % 3)) + '班' }).map((r, i) => ({ ...r, ts: at(2, 0) + s * 1000 + i })));
  res = go(many);
  ok(res.boards['5'].acc.list.length === 20 && res.boards['5'].acc.more === 5 && res.view['5'].acc.length === 25, '名單最多 20 人，「還有 N 人也很準」N＝more；教師頁 view 有全部');

  /* ═══ 9. ▲、新上榜、下降不顯示（跟上週最後一次更新比）═══ */
  const fast5 = (arr, week) => arr.map(([seat, secs], i) => F(seat, secs, { ts: at(week, i) }));
  const w5 = at(5, 3), w6 = at(6, 2);
  let u = R.updateBoards(null, fast5([[1, 40], [2, 50], [3, 60]], 5), { now: w5 });
  ok(u.boards['5'].fast['coo:3'].every(x => x.up === 0), '第一次更新（沒有上週資料）：所有人 up＝0，不會整排都是「新上榜」');
  ok(u.states['5'].prev === null && same(u.states['5'].cur.fast['coo:3'], { [idOf('五年級4班', 1)]: 1, [idOf('五年級4班', 2)]: 2, [idOf('五年級4班', 3)]: 3 }) && u.states['5'].week === R.twWeek(w5), '狀態記下這次的名次 cur 與第幾週');
  u = R.updateBoards(u.states, [F(3, 70, { ts: at(5, 4) })], { now: at(5, 5) });
  ok(u.states['5'].prev === null && u.boards['5'].fast['coo:3'].every(x => x.up === 0), '同一週再更新：prev 不動（還是沒有上週）');
  const w5states = u.states, prevRanks = w5states['5'].cur.fast['coo:3'];
  /* 週 6：座號 2 變第 1（從第 2 上升 1）；座號 1 掉到第 2（下降不顯示）；座號 4 新上榜；座號 3 掉到 4 */
  u = R.updateBoards(w5states, [F(2, 35, { ts: at(6, 0) }), F(4, 45, { ts: at(6, 1) })], { now: w6 });
  const byS = () => Object.fromEntries(u.boards['5'].fast['coo:3'].map(r => [r.s, r]));
  let rows6 = byS();
  ok(same(u.states['5'].prev.fast['coo:3'], prevRanks) && u.states['5'].week === R.twWeek(w6), '跨週後第一次更新：把上週最後的名次搬到 prev');
  ok(rows6[2].r === 1 && rows6[2].up === 1, '座號 2：從第 2 名到第 1 名 → ▲1（up＝1）');
  ok(rows6[1].r === 2 && rows6[1].up === 0, '座號 1：從第 1 名掉到第 2 名 → up＝0（下降不顯示）');
  ok(rows6[4].r === 3 && rows6[4].up === -1, '座號 4：上週不在榜上、這週進榜 → up＝-1（新上榜）');
  ok(rows6[3].r === 4 && rows6[3].up === 0, '座號 3：掉到第 4 名 → up＝0');
  ok(!u.boards['5'].fast['coo:3'].some(r => r.up < -1), 'up 只有 -1（新上榜）、0（不顯示）、正數（上升幾名）三種');
  u = R.updateBoards(u.states, [F(1, 20, { ts: at(6, 3) })], { now: at(6, 4) });
  rows6 = byS();
  ok(rows6[1].r === 1 && rows6[1].up === 0 && rows6[2].r === 2 && rows6[2].up === 0 && rows6[4].up === -1 && rows6[3].up === 0, '同一週再更新（週 6 第二次）：還是跟「上週最後一次」比：座號 1 第 1 名、上週也是第 1 → 0；座號 2 上週第 2、現在第 2 → 0；座號 4 仍是新上榜');
  ok(same(u.states['5'].prev.fast['coo:3'], prevRanks), '同一週內多次更新，prev 一直是上週的');
  /* 進步榜的 ▲ 與新上榜：用手動改的上週名次（這樣不用煩惱視窗滑動） */
  const imp3 = [...series({ seat: 1 }, [50, 50, 50], [60, 60, 60]).map(r => ({ ...r, ts: r.ts < at(4) ? r.ts : at(5, 0) + r.t % 1000 })),
    ...series({ seat: 2 }, [50, 50, 50], [57, 57, 57]).map(r => ({ ...r, ts: r.ts < at(4) ? r.ts : at(5, 0) + r.t % 1000 })),
    ...series({ seat: 3 }, [50, 50, 50], [55, 55, 55]).map(r => ({ ...r, ts: r.ts < at(4) ? r.ts : at(5, 0) + r.t % 1000 }))];
  let pi = R.updateBoards(null, imp3, { now: at(5, 4) });
  ok(same(pi.boards['5'].improve.map(r => [r.s, r.r]), [[1, 1], [2, 2], [3, 3]]) && pi.boards['5'].improve.every(r => r.up === 0), '進步榜：3 人名次 1、2、3；第一次更新沒有 ▲');
  const tamper = JSON.parse(JSON.stringify(pi.states));
  tamper['5'].cur = { imp: { [idOf('五年級4班', 1)]: 3, [idOf('五年級4班', 2)]: 1 }, fast: {} };   // 上週：座號 2 第 1、座號 1 第 3、座號 3 不在榜上
  pi = R.updateBoards(tamper, [], { now: at(6, 1) });
  const ib = Object.fromEntries(pi.boards['5'].improve.map(r => [r.s, r]));
  ok(ib[1].r === 1 && ib[1].up === 2 && ib[2].r === 2 && ib[2].up === 0 && ib[3].r === 3 && ib[3].up === -1, '進步榜：座號 1 從第 3 名到第 1 名 ▲2；座號 2 第 1 掉到第 2 → 不顯示；座號 3 上週不在榜上 → 新上榜');
  /* 好幾週沒更新：還是拿「最後一次」當上週 */
  pi = R.updateBoards(tamper, [], { now: at(9, 1) });
  ok(pi.states['5'].prev && pi.states['5'].prev.imp[idOf('五年級4班', 2)] === 1, '老師很久沒登入：prev＝最後一次更新的名次，不壞');

  /* ═══ 10. 輸出：不含身分資料、沒有巢狀陣列、沒有 undefined ═══ */
  const roster = [];
  for (const [cls, seat, nm] of [['四年級1班', 3, '阿四'], ['五年級4班', 5, '小明'], ['五年級12班', 7, '王大明'], ['六年級2班', 30, '六年甲']]) {
    roster.push(...series({ cls, seat, mk: 'frog', star: 2, lv: 3 }, [50, 50, 50], [60, 60, 60]), mk({ cls, seat, mk: 'coo', secs: 55, ts: at(5, 0) }), ...acc10(seat, Array(10).fill(1), { cls }));
  }
  const pe = { '四年級1班_3號': { name: '阿四' }, [ID5]: { name: '小明' }, '五年級12班_7號': { name: '王大明', hide: true }, '六年級2班_30號': { name: '甲'.repeat(40) } };
  res = go(roster, { people: pe });
  const pub = JSON.stringify(res.boards);
  ok(['4', '5', '6'].every(g => res.boards[g].v === 1 && res.boards[g].g === g), '三個年級各一份榜單文件');
  ok(!/年級|班_|號|uid-|1700000000/.test(pub), '榜單文件不含 docId、uid、班級全名、本機時間（只有短碼、座號、名字、分數）');
  const allowedKeys = { improve: ['c', 'n', 'qb', 'r', 's', 'up', 'v'], fast: ['c', 'n', 'pw', 'r', 's', 'up', 'v', 'w'], acc: ['at', 'c', 'n', 's'] };
  const rowsOf = b => [...b.improve.map(r => ['improve', r]), ...Object.values(b.fast).flat().map(r => ['fast', r]), ...b.acc.list.map(r => ['acc', r])];
  ok(['4', '5', '6'].every(g => rowsOf(res.boards[g]).every(([k, r]) => same(Object.keys(r).sort(), allowedKeys[k]))) && rowsOf(res.boards['5']).length > 3, '每一列的欄位只有白名單（沒有 id、rid、rids、uid、cls）');
  ok(res.boards['5'].improve.some(r => r.n === '小明') && res.boards['5'].improve.some(r => r.n === '神秘獵人') && !pub.includes('王大明'), 'hideNick 的人名字換成「神秘獵人」，真名完全不出現');
  ok(res.boards['6'].improve[0].n === '甲'.repeat(20), '名字最多 20 字');
  ok(go(roster).boards['5'].improve.every(r => r.n === '神秘獵人'), '沒有名字的人顯示「神秘獵人」');
  ok(res.boards['4'].improve[0].c === '401' && res.boards['5'].improve.map(r => r.c).sort().join() === '504,512' && res.boards['6'].improve[0].c === '602' && res.boards['6'].improve[0].s === 30, '班級短碼用 nw-data.js 的 clsShort（401、504、512、602）');
  ok(R.checkDoc(res.boards).length === 0 && R.checkDoc(res.states).length === 0, '榜單與私有狀態都過 checkDoc：沒有巢狀陣列、undefined、NaN');
  ok(same(JSON.parse(JSON.stringify(res.boards)), res.boards) && same(JSON.parse(JSON.stringify(res.states)), res.states), '輸出過 JSON 往返前後完全一樣（沒有 undefined 被吃掉）');
  const nested = a => Array.isArray(a) ? a.some(x => Array.isArray(x)) || a.some(nested) : (a && typeof a === 'object') ? Object.values(a).some(nested) : false;
  ok(!nested(res.boards) && !nested(res.states), '自己再掃一次：任何地方都沒有陣列裡的陣列');
  ok(Object.keys(res.states['5']).sort().join() === 'blocked,cur,cursor,g,prev,students,t,v,week' && Object.values(res.states['5'].students)[0].runs.length > 0 && Object.values(res.states['5'].students).every(s => s.runs.every(e => !('q' in e) && !('uid' in e))), '私有狀態的欄位、每場只留必要的欄位（不存 q、uid）');
  const sz = JSON.stringify(res.states['5']).length;
  ok(sz < 20000 && res.stats.bytes['5'] === sz, 'stats.bytes 回報私有文件大小');
  ok(R.checkDoc({ a: [[1]] }).length === 1 && R.checkDoc({ a: undefined }).length === 1 && R.checkDoc({ a: NaN }).length === 1 && R.checkDoc({ a: Infinity }).length === 1 && R.checkDoc({ a: new Date() }).length === 1 && R.checkDoc({ a: [{ b: [1] }] }).length === 0 && R.checkDoc({ a: [1, 'x', null, true, { b: 1 }] }).length === 0 && R.checkDoc({ '': 1 }).length === 1 && R.checkDoc({ __x__: 1 }).length === 1, 'checkDoc 抓得到：陣列裡的陣列、undefined、NaN、Infinity、Date、空欄位名；物件在陣列裡的陣列是可以的');
  threw = false; try { R.safeDoc({ a: [[1, 2]] }); } catch (e) { threw = /陣列裡的陣列/.test(e.message); }
  ok(threw && same(R.safeDoc({ a: 1, b: [{ c: 'x' }] }), { a: 1, b: [{ c: 'x' }] }), 'safeDoc：有問題就丟例外，沒問題回乾淨複本');

  /* 輸入不被改動 */
  const inRuns = JSON.stringify(roster), inPriv = JSON.stringify(res.states);
  R.updateBoards(res.states, roster, { now: NOW, people: pe, verdicts: { [ID5 + '_1']: -1 } });
  ok(JSON.stringify(roster) === inRuns && JSON.stringify(res.states) === inPriv, '傳進去的 priv 與 runs 不會被改（純函式）');

  /* ═══ 11. 邊界案例 ═══ */
  res = R.updateBoards(null, [], { now: NOW });
  ok(['4', '5', '6'].every(g => res.boards[g].improve.length === 0 && same(res.boards[g].fast, {}) && res.boards[g].acc.list.length === 0 && res.boards[g].acc.more === 0 && same(res.boards[g].cut, {})), '空資料：三份空榜單，不丟例外');
  ok(res.stats.read === 0 && res.stats.used === 0 && res.stats.cursor === 0 && R.cursorOf(res.states) === 0, '空資料：游標還是 0（會繼續從頭讀）');
  ok(R.updateBoards(undefined, undefined, { now: NOW }).boards['5'].improve.length === 0 && R.updateBoards({}, 'abc', { now: NOW }).stats.read === 0 && R.updateBoards(null, null, { now: NOW }).boards['4'], 'priv、runs 是 undefined／null／字串也不壞');
  res = go(series({ seat: 5 }, [50, 50, 50], [60, 60, 60]), { people: names });
  ok(res.boards['5'].improve.length === 1 && res.boards['5'].improve[0].r === 1 && res.boards['5'].cut.improve === undefined, '只有 1 人：名次 1、沒有 cut');
  /* 同分 */
  const tied = []; for (let s = 1; s <= 4; s++) tied.push(...series({ seat: s }, [50, 50, 50], [60, 60, 60]).map((r, i) => ({ ...r, ts: r.ts + (5 - s) * 1000 })));
  res = go(tied);
  ok(res.boards['5'].improve.length === 4 && res.boards['5'].improve.every(r => r.v === 20 && r.r === 1), '同分：4 人都是第 1 名');
  ok(same(res.boards['5'].improve.map(r => r.s), [4, 3, 2, 1]), '同分排列：先達到的在前（最近兩週第 3 好那場比較早的）');
  const tied2 = []; for (let s = 1; s <= 4; s++) tied2.push(...series({ seat: s }, [50, 50, 50], [60, 60, 60]));
  const o1r = go(tied2).boards['5'].improve.map(r => r.s), o2r = go(tied2.slice().reverse()).boards['5'].improve.map(r => r.s);
  ok(same(o1r, o2r), '同分又同時間：排列只看資料，不看輸入順序（每次更新結果一樣）');
  res = go(Array.from({ length: 13 }, (_, i) => series({ seat: i + 1 }, [50, 50, 50], [60 + i, 60 + i, 60 + i])).flat());
  ok(res.boards['5'].improve.length === 10 && res.boards['5'].improve[0].v > res.boards['5'].improve[9].v && res.boards['5'].cut.improve === res.boards['5'].improve[9].v && res.view['5'].improve.length === 13, '進步榜只留前 10 名、cut＝第 10 名分數、教師頁 view 有全部');
  /* ts 缺漏、壞資料 */
  const messy = [...series({}, [50, 50, 50], [60, 60, 60]), { ...mk(), ts: undefined }, { ...mk(), ts: null }, { ...mk(), ts: 'x' }, { ...mk(), q: [1, 2, 3] }, null, 5, 'x', undefined, [], { ...mk(), cls: '三年級1班', id: '三年級1班_5號' }, mk({ res: 'fail', n: 2 }), { ...mk(), mk: 'dragon' }];
  res = go(messy);
  ok(res.boards['5'].improve.length === 1 && res.boards['5'].improve[0].v === 20 && res.stats.used === 6, '夾雜壞資料：好的照收（6 場），壞的略過');
  ok(res.stats.skipped.length === 12 && ['ts', 'q', 'shape', 'grade', 'invalid', 'mk'].every(w => res.stats.skipped.some(x => x.why === w)) && res.stats.skipped.length <= 50, 'stats.skipped 列出被略過的原因（ts、q、shape、grade、invalid、mk 都有）');
  ok(R.checkDoc(res.states).length === 0, '壞資料不會讓私有狀態變髒');
  ok(go([{ ...mk(), ts: undefined }]).stats.cursor === 0 && go([{ ...mk(), ts: undefined }, mk({ ts: at(5, 0) })]).stats.cursor === at(5, 0) - R.RANK.overlapMs, 'ts 缺漏的紀錄不會讓游標亂跳；游標＝最大 ts 往前退 5 秒');
  const manyQ = go([mk({ ts: at(5, 0), q: Array.from({ length: 150 }, () => [2, 5, 1000, 2]) })]);
  ok(manyQ.stats.used === 0 && manyQ.stats.skipped[0].why === 'q', 'q 超過 120 題（規則本來就擋）→ 略過');
  /* 晚到的紀錄：伺服器時間較早的一筆比較晚才讀得到（兩個人同時打完），游標往回退 5 秒才補得到 */
  const lateA = mk({ seat: 1, ts: at(5, 1), cpm: 60 }), lateB = mk({ seat: 2, ts: at(5, 1) + 1000, cpm: 60 });
  const l1 = R.updateBoards(null, [lateB], { now: NOW }), l2 = R.updateBoards(l1.states, [lateA, lateB], { now: NOW });
  ok(l1.stats.cursor === lateB.ts - R.RANK.overlapMs && lateA.ts > l1.stats.cursor && Object.keys(l2.states['5'].students).length === 2, '晚到的紀錄：游標往回退 5 秒，比較早、晚一點才讀到的那筆還是補得到');
  /* 重複吸收＝沒變 */
  const dupRuns = series({}, [50, 50, 50], [60, 60, 60, 120]).concat([bk({ ts: at(5, 1) })]);
  const once = go(dupRuns), twice = R.updateBoards(once.states, dupRuns, { now: NOW });
  ok(same(twice.states['5'].students, once.states['5'].students) && same(twice.boards['5'], once.boards['5']) && twice.stats.held === 0, '同樣的紀錄讀兩次：狀態與榜單完全不變（游標重疊、重按更新都安全）');
  /* 壞的 priv */
  res = R.updateBoards({ '5': 'garbage', '4': { v: 99, students: 5 }, '6': { v: 1, students: { x: 5, y: { runs: 'no' } }, blocked: 'x', prev: 3, cur: [] } }, series({}, [50, 50, 50], [60, 60, 60]), { now: NOW });
  ok(res.boards['5'].improve.length === 1 && res.stats.warn.length === 2 && R.checkDoc(res.states).length === 0, '私有狀態壞掉或版本不認得：當作空的重算（stats.warn 提醒「從頭重算」），不丟例外');
  /* 游標 */
  ok(R.cursorOf(null) === 0 && R.cursorOf({ '4': { v: 1, cursor: 100 }, '5': { v: 1, cursor: 50 }, '6': { v: 1, cursor: 70 } }) === 50 && R.cursorOf({ '4': { v: 1, cursor: 100 } }) === 0, 'cursorOf：三份的最小值；缺一份＝0（從頭讀，自己補齊）');
  res = go(dupRuns);
  ok(['4', '5', '6'].every(g => res.states[g].cursor === res.states['5'].cursor) && R.cursorOf(res.states) === Math.max(...dupRuns.map(r => r.ts)) - R.RANK.overlapMs, '游標：三份一致＝最大 ts − 5 秒');
  /* 一場一場名字更新 */
  res = go(clean(), { people: { [ID5]: { name: ' 小明 ' } } });
  ok(res.boards['5'].improve[0].n === '小明', '名字去掉頭尾空白（displayName）');
  res = R.updateBoards(res.states, [], { now: NOW, people: { [ID5]: { name: '改名了' }, 'x_1號': { name: '陌生人' } } });
  ok(res.boards['5'].improve[0].n === '改名了' && !JSON.stringify(res.states).includes('陌生人'), '改名後下次更新換掉；不在狀態裡的人不會被加進去');
  /* 超過上限的場次 */
  const marathon = Array.from({ length: 60 }, (_, i) => mk({ cpm: 60, ts: at(Math.floor(i / 10), i % 7) + i * 60000 }));
  res = go(marathon);
  ok(res.states['5'].students[ID5].runs.length === R.RANK.keepRuns && res.states['5'].students[ID5].runs[0].u >= at(1, 0) && R.checkDoc(res.states).length === 0, `一個人最多留 ${R.RANK.keepRuns} 場（舊的先丟），文件才不會長到超過 1 MB`);

  /* ═══ 12. 增量處理 ＝ 一次算完（隨機資料）═══ */
  function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const strip = o => JSON.parse(JSON.stringify(o, (k, v) => (k === 'up' ? undefined : v)));
  function randomRuns(seed) {
    const rnd = rng(seed), pick = a => a[Math.floor(rnd() * a.length)], out = [];
    const roster = [];
    for (const g of ['四', '五', '六']) for (const c of [1, 2]) for (const s of [1, 2, 3, 4]) roster.push([`${g}年級${c}班`, s]);
    const CP = [30, 40, 48, 50, 60, 64, 75, 80, 96, 100, 120], ACC = [1, 1, 1, 0.97, 0.95, 0.92, 0.9, 0.88];
    let lastTs = at(0, 0);
    for (let i = 0; i < 520; i++) {
      const [cls, seat] = pick(roster);
      /* 30% 跟上一筆擠在 3 秒內（全班同時打完；游標重疊要補得到） */
      let ts = rnd() < 0.3 ? lastTs + Math.floor(rnd() * 3000) : Math.floor(at(0, 0) + rnd() * (NOW - at(0, 0)));
      ts = Math.min(ts, NOW); lastTs = ts;
      /* 七成落在同一個題目等級（不然每個等級都湊不到 3 場，進步榜永遠是空的）；座號 1 有一半打高等級而且很準（神準名單才有人） */
      const main = rnd() < 0.7, hi = seat === 1 && rnd() < 0.5;
      const r = mk({ cls, seat, cpm: pick(CP), acc: hi ? pick([1, 1, 0.97, 0.95]) : pick(ACC), ts, mk: pick(['coo', 'frog', 'shroom', 'wolf']),
        star: main ? 2 : 1 + Math.floor(rnd() * 5), lv: hi ? pick([12, 14, 22]) : main ? pick([3, 6, 9]) : pick([3, 6, 9, 10, 14, 22]),
        res: rnd() < 0.8 ? 'win' : 'fail', secs: undefined, w: pick(['dagger', 'bow', 'staff']), pw: Math.floor(rnd() * 60), n: 4 + Math.floor(rnd() * 12) });
      const x = rnd();
      if (x < 0.06) { r.keys = 10; }                              // keys
      else if (x < 0.1) { r.sus = ['fast']; }                      // 自己標的
      else if (x < 0.13) { r.ok = -1; }
      else if (x < 0.16) { r.ok = 1; r.keys = 10; }                // 放行
      else if (x < 0.19) { r.q = [1, 2, 3]; }                      // 壞的
      else if (x < 0.21) { r.ts = undefined; }
      else if (x < 0.23) { r.cor = r.cor + 3; }                    // sum
      out.push(r);
      if (rnd() < 0.05) out.push(JSON.parse(JSON.stringify(r)));  // 完全重複的一筆
    }
    return out;
  }
  function shuffle(a, rnd) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
  const peopleAll = {}; for (const g of ['四', '五', '六']) for (const c of [1, 2]) for (const s of [1, 2, 3, 4]) peopleAll[`${g}年級${c}班_${s}號`] = { name: `名${g}${c}${s}`, hide: s === 4 };
  let eqAll = 0, eqN = 0, eqRows = 0, eqHeld = 0, eqMaxDiff = '';
  for (let seed = 1; seed <= 30; seed++) {
    const all = randomRuns(seed), rnd = rng(seed * 7919), pick0 = a => a[Math.floor(rnd() * a.length)];
    const full = R.updateBoards(null, all, { now: NOW, people: peopleAll });
    /* 增量：分 7 次，每次只讀 ts 比游標新、而且「那一刻已經寫進去」的；每批打亂順序；壞 ts 的放第一批 */
    /* 更新的時間點挑在某一場剛結束之後 0～2 秒（最容易漏掉「晚到」的紀錄的時候） */
    const tsAll = all.map(r => r.ts).filter(Number.isFinite);
    const cuts = Array.from({ length: 6 }, () => Math.min(NOW - 1, pick0(tsAll) + Math.floor(rnd() * 2000))).sort((a, b) => a - b).concat([NOW]);
    const lag = new Map(all.map(r => [r, rnd() < 0.3 ? Math.floor(rnd() * 4000) : 0]));
    let priv = null, calls = 0;
    cuts.forEach((nowK, k) => {
      const cursor = R.cursorOf(priv);
      /* 三成的紀錄「晚幾秒才讀得到」（伺服器時間同一毫秒、或寫入慢）：游標往回退 5 秒就是為了補它們 */
      const vis = all.filter(r => (Number.isFinite(r.ts) ? r.ts > cursor && r.ts + lag.get(r) <= nowK : k === 0));
      priv = (() => { const x = R.updateBoards(priv, shuffle(vis, rnd), { now: nowK, people: peopleAll }); calls++; priv = x.states; return x; })().states;
    });
    const inc = R.updateBoards(priv, [], { now: NOW, people: peopleAll });
    const eqS = ['4', '5', '6'].every(g => same(inc.states[g].students, full.states[g].students) && same(inc.states[g].blocked, full.states[g].blocked) && inc.states[g].cursor === full.states[g].cursor);
    const eqB = same(strip(inc.boards), strip(full.boards)) && same(strip(inc.view), strip(full.view)) && same(inc.review, full.review);
    if (eqS && eqB) eqAll++; else if (!eqMaxDiff) eqMaxDiff = `seed ${seed}：students ${eqS}、boards ${eqB}`;
    eqN++;
    eqRows += ['4', '5', '6'].reduce((a, g) => a + full.boards[g].improve.length + Object.values(full.boards[g].fast).reduce((x, l) => x + l.length, 0) + full.boards[g].acc.list.length, 0);
    eqHeld += ['4', '5', '6'].reduce((a, g) => a + full.review[g].held.length, 0);
  }
  ok(eqAll === eqN, `增量處理 ＝ 一次算完：${eqN} 組隨機資料（520 場、24 人、7 次分批、打亂順序、游標重疊重複讀、完全重複的紀錄、壞資料、待審與放行）結果都一樣${eqMaxDiff ? '（' + eqMaxDiff + '）' : ''}`);
  ok(eqRows > 600 && eqHeld > 100, `（隨機資料有料：榜上共 ${eqRows} 列、待審 ${eqHeld} 筆，不是比兩份空榜單）`);
  const hasImp = (() => { let c = 0; for (let seed = 1; seed <= 30; seed++) { const f = R.updateBoards(null, randomRuns(seed), { now: NOW, people: peopleAll }); c += ['4', '5', '6'].reduce((a, g) => a + f.boards[g].improve.length, 0); } return c; })();
  ok(hasImp > 20, `（隨機資料裡進步榜共 ${hasImp} 列，進步算法有被比到）`);
  /* 每一份隨機結果都是 Firestore 能存的 */
  ok((() => { for (let seed = 1; seed <= 10; seed++) { const f = R.updateBoards(null, randomRuns(seed), { now: NOW, people: peopleAll }); if (R.checkDoc(f.boards).length || R.checkDoc(f.states).length || /年級|號/.test(JSON.stringify(f.boards).replace(/名[四五六]\d+/g, ''))) return false; } return true; })(), '隨機資料的榜單與私有狀態：每一份都沒有巢狀陣列、undefined，榜單沒有身分資料');
  /* 超過上限的人，增量也一樣（舊的先丟是「整組資料」的函式，不看分批） */
  const long = Array.from({ length: 90 }, (_, i) => mk({ cpm: [40, 50, 60, 75][i % 4], ts: at(0, 0) + i * 17 * HOUR + (i % 5) * 1000, acc: i % 7 ? 1 : 0.95 }));
  const fullL = R.updateBoards(null, long, { now: NOW });
  let pl = null; for (let k = 0; k < 9; k++) { pl = R.updateBoards(pl, long.filter(r => r.ts > R.cursorOf(pl) && r.ts <= long[k * 10 + 9].ts), { now: NOW }).states; }
  ok(same(R.updateBoards(pl, [], { now: NOW }).states['5'].students, fullL.states['5'].students), '一個人超過保留上限：分批吸收與一次吸收仍然相同');
  /* 老師放行／不採計的增量版：先吸收（待審）→ 之後用 verdicts → 跟一開始就帶 ok 的一樣（沒有後面的場次受 jump 影響時） */
  const held1 = bk({ ts: at(5, 1) }), baseR = clean();
  const late = R.updateBoards(R.updateBoards(null, [...baseR, held1], { now: NOW }).states, [], { now: NOW, verdicts: { [rid(held1)]: 1 } });
  const early = R.updateBoards(null, [...baseR, { ...held1, ok: 1 }], { now: NOW });
  ok(same(late.states['5'].students, early.states['5'].students) && same(late.boards['5'], early.boards['5']), '先待審、之後老師放行（verdicts）＝一開始就帶 ok: 1');

  await browserHalf(R, D);

  console.log(fails ? `\n${fails} 個失敗` : '\n全部通過');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL 測試本身丟例外：' + (e && e.stack || e)); process.exit(1); });

/* ═══════════════ 瀏覽器那一半 ═══════════════
   教師頁 🏆 榮譽碑（teacher/tab-rank.js）、總覽的榮譽碑列、舊控制台老師登入後的背景更新。
   全程開 window.__RULES；姓名全是假的，才能逐一搜尋有沒有漏進榜單與操作紀錄。
   假資料庫的 batch 沒有交易（前面成功的寫入不會因為後面失敗而退回），所以「同一個 batch」用「只 commit 一次、一次帶幾個寫入」來驗：
   這裡把 mock/fs.js 的 commit 換成會記錄 window.__COMMITS 的版本，並加上 window.__DENY_READ（符合的路徑讀取一律 permission-denied）；
   只在這個測試裡換，不改 mock 檔。 */
async function browserHalf(R, D) {
  let chromium;
  try { ({ chromium } = require('playwright')); } catch (e) { console.log('SKIP 瀏覽器那一半（沒有 playwright）'); return; }
  const fs = require('fs'), path = require('path');
  const M = path.join(__dirname, 'mock') + '/', OUT = process.argv[2] || require('os').tmpdir();
  const css = require('./tw.js')(OUT);
  const NOW = Date.now(), H = 3600e3, DY = 24 * H;
  const fsSrc = fs.readFileSync(M + 'fs.js', 'utf8')
    .replace('async commit() { ops.forEach(f => f()); }', 'async commit() { (window.__COMMITS = window.__COMMITS || []).push(ops.length); ops.forEach(f => f()); }')
    .replace('function ruleCheck(db, op, path, data, exists) {', 'function ruleCheck(db, op, path, data, exists) { if (window.__DENY_READ && (op === "get" || op === "list") && new RegExp(window.__DENY_READ).test(path)) { const e = new Error("denied (mock)"); e.code = "permission-denied"; throw e; }');
  ok(fsSrc.includes('__COMMITS') && fsSrc.includes('__DENY_READ'), '（測試用的假資料庫：commit 計數與讀取拒絕替換成功，mock/fs.js 的寫法沒變）');
  const route = p => p.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('http://localhost')) return r.continue();
    if (u.includes('cdn.tailwindcss.com')) return r.fulfill({ contentType: 'application/javascript', body: `const s=document.createElement('style');s.textContent=${JSON.stringify(css)};document.head.appendChild(s);` });
    const m = u.includes('firebase-app') ? 'app.js' : u.includes('firebase-auth') ? 'auth.js' : u.includes('firebase-firestore') ? 'fs.js' : null;
    if (m) return r.fulfill({ contentType: 'application/javascript', body: m === 'fs.js' ? fsSrc : fs.readFileSync(M + m, 'utf8') });
    return r.abort();
  });
  const watch = p => {
    const errs = [], cons = []; p.errs = errs; p.cons = cons;
    p.on('pageerror', e => errs.push('pageerror: ' + e.message));
    p.on('console', m => { cons.push(m.type() + ': ' + m.text()); if (m.type() === 'error' && !/Failed to load resource|Missing or insufficient|permission/.test(m.text())) errs.push('console: ' + m.text()); });
    p.on('dialog', d => d.accept());
  };

  /* ── 假資料（時間都相對現在：兩週以前＝20 天前起；最近＝這 3 小時內） ── */
  const C5 = '五年級3班', C4 = '四年級2班', C6 = '六年級1班';
  const P = { a: [C5, 1, '測試甲'], b: [C5, 2, '測試乙'], c: [C5, 3, '測試丙'], d: [C4, 4, '測試丁'], e: [C5, 5, '測試戊'], f: [C5, 6, '測試己'], g: [C6, 7, '測試庚'], h: [C5, 8, '測試辛'], i: [C5, 9, '測試壬'] };
  const idOf = k => `${P[k][0]}_${P[k][1]}號`;
  const FLAGNAME = { e: '旗標真名戊', h: '旗標真名辛' };
  let sq = 0;
  const runDoc = (k, o = {}) => {
    const [cls, seat] = P[k], id = idOf(k), cpm = o.cpm || 60, n = o.n || 12, ms = Math.round(120000 / cpm);
    const q = o.q || Array.from({ length: n }, () => [2, 5, ms, 2]);
    const cor = q.reduce((a, x) => a + x[3], 0), act = q.reduce((a, x) => a + x[2], 0) / 1000, t = 1760000000000 + (++sq);
    return { rid: `${id}_${t}`, d: { id, cls, seat, uid: 'uid-secret-' + k, t, ts: { __ts: o.ts }, v: 1, app: '3.15.0', mk: o.mk || 'coo', rk: 'grass', star: o.star || 3, lv: o.lv === undefined ? 6 : o.lv, qb: 'x', res: o.res || 'win',
      secs: o.secs === undefined ? Math.round((act + 10) * 10) / 10 : o.secs, acc: 1, ans: q.length, cor, typ: cor, keys: o.keys === undefined ? q.length * 5 : o.keys, nokey: 0, act: Math.round(act * 10) / 10, cpm: 999,
      fl: { fast: 0, paste: 0, wrong: 0 }, sus: o.sus || [], w: 'dagger', atk: 105, pw: 45, tier: 'B', q: [].concat(...q) } };
  };
  const series = (k, oldC, newC) => [...[0, 1, 2].map(i => runDoc(k, { cpm: oldC, ts: NOW - (20 + i) * DY })), ...[0, 1, 2].map(i => runDoc(k, { cpm: newC, ts: NOW - (1 + i) * H }))];
  const mkSeed = (o = {}) => {
    const seed = { 'mg_admins/T1': { ok: true } };
    Object.keys(P).forEach(k => { seed[`mg_scores/${idOf(k)}`] = { className: P[k][0], seat: P[k][1], name: P[k][2] }; });
    seed[`mg_bugboard/${idOf('c')}`] = { className: C5, seat: 3, hideNick: true, score: 0, n: 0 };
    if (o.empty) return seed;
    const runs = [...series('a', 40, 60), ...series('b', 40, 100), ...series('c', 50, 70), ...series('i', 50, 90),
      runDoc('d', { n: 3, q: [[2, 5, 1500, 2], [2, 5, 1500, 2], [2, 5, 1500, 2]], secs: 6, star: 1, ts: NOW - 3 * H }),
      ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => runDoc('g', { lv: 12, star: 5, ts: NOW - (1 + i) * 2 * H })),
      runDoc('e', { keys: 10, ts: NOW - 2 * H }), runDoc('f', { keys: 10, ts: NOW - 2 * H }), runDoc('h', { sus: ['fast'], ts: NOW - 2 * H })];
    runs.forEach(r => { seed[`mg_nw_runs/${r.rid}`] = r.d; });
    seed['mg_nw_runs/壞資料_1'] = { id: 'x', ts: { __ts: NOW - H }, q: [1, 2, 3] };
    const byK = k => runs.filter(r => r.d.id === idOf(k));
    seed.__rid = { e: byK('e')[0].rid, f: byK('f')[0].rid, h: byK('h')[0].rid };
    seed.__total = runs.length + 1;
    const fl = (k, why) => { const r = byK(k)[0]; seed[`mg_nw_flags/run_${r.rid}`] = { type: 'run', status: 'pending', docId: idOf(k), cls: P[k][0], seat: P[k][1], name: FLAGNAME[k], runId: r.rid, why, mk: 'coo', star: 3, t: r.d.t }; };
    fl('e', ['keys']); fl('h', ['fast']);
    return seed;
  };
  const stripMeta = seed => { const s = Object.assign({}, seed), meta = { rid: s.__rid, total: s.__total }; delete s.__rid; delete s.__total; return { seed: s, meta }; };

  /* ── 頁面小工具 ── */
  const ready = p => p.waitForFunction(() => { const m = document.querySelector('#main'); return m && m.textContent && !m.textContent.includes('讀取中…') && m.children.length > 0; }, null, { timeout: 8000 }).then(() => p.waitForTimeout(150));
  async function teacher(browser, seed, o = {}) {
    const p = await browser.newPage({ viewport: o.mobile ? { width: 390, height: 800 } : { width: 1280, height: 1000 } });
    watch(p);
    await p.addInitScript(a => {
      window.__FS = a.s; window.__RULES = true; localStorage.clear(); window.__ADMIN_PRESIGNED = { uid: 'T1', email: 'teacher@example.test' };
      if (a.stages) window.__NW_STAGES__ = a.stages;
      if (a.stale) localStorage.setItem('rank_stale_days', String(a.stale));
      if (a.deny) window.__DENY_READ = a.deny;
    }, { s: seed, stages: o.stages, stale: o.stale, deny: o.deny });
    await route(p);
    await p.goto('http://localhost:8765/teacher.html');
    await p.waitForSelector('#app:not(.hidden)', { timeout: 8000 }); await ready(p);
    return p;
  }
  const tab = async (p, id) => { await p.click(`#nav [data-tab="${id}"]`); await p.waitForTimeout(150); await ready(p); await p.waitForTimeout(200); };
  const modalOpen = p => p.evaluate(() => document.querySelectorAll('[data-modal]').length);
  const clickModal = async (p, id) => { await p.waitForSelector('[data-modal]', { timeout: 4000 }); await p.evaluate(id => { const ms = document.querySelectorAll('[data-modal]'); ms[ms.length - 1].querySelector(`[data-btn="${id}"]`).click(); }, id); await p.waitForTimeout(200); };
  const modalText = p => p.evaluate(() => { const ms = document.querySelectorAll('[data-modal]'); return ms.length ? ms[ms.length - 1].textContent.replace(/\s+/g, ' ') : ''; });
  const T = (p, sel) => p.textContent(sel).then(t => t.replace(/\s+/g, ' ').trim());
  const FSV = (p, k) => p.evaluate(k => window.__FS[k], k);
  const keysOf = (p, pre) => p.evaluate(pre => Object.keys(window.__FS).filter(k => k.startsWith(pre)).sort(), pre);
  const commits = p => p.evaluate(() => (window.__COMMITS || []).slice());
  const noErr = (p, m = '沒有 JS 錯誤') => ok(p.errs.length === 0, m + (p.errs.length ? '：' + p.errs.join(' | ') : ''));
  const adminOnly = (p, re) => p.evaluate(re => { const w = window.__WRITES.filter(x => new RegExp(re).test(x.path)); return w.length > 0 && w.every(x => x.by === 'admin'); }, re);
  const upd = async p => {
    const n0 = (await commits(p)).length;
    await p.click('[data-rk-update]');
    await p.waitForFunction(n0 => (window.__COMMITS || []).length > n0 && !document.querySelector('[data-rk-update]').disabled, n0, { timeout: 10000 });
    await p.waitForTimeout(200);
  };
  /* 做一個動作：點、確認視窗按 confirm、等 commit；回這個動作 commit 了幾次。confirm 是 'no' 就不等 */
  const act = async (p, sel, confirm = 'ok') => {
    const n0 = (await commits(p)).length;
    await p.click(sel);
    if (confirm === 'no') { await clickModal(p, 'no'); return 0; }
    await clickModal(p, confirm);
    await p.waitForFunction(n0 => (window.__COMMITS || []).length > n0, n0, { timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(250);
    return (await commits(p)).length - n0;
  };
  const board = async (p, g) => JSON.parse(JSON.stringify(await FSV(p, 'mg_nw_board/' + g) || null));
  const noT = b => { const c = JSON.parse(JSON.stringify(b)); delete c.t; return c; };
  const privOf = (p, g) => FSV(p, 'mg_nw_board_private/' + g);
  const checkWritten = async (p, m) => {
    const bad = [];
    for (const g of ['4', '5', '6']) for (const k of ['mg_nw_board/', 'mg_nw_board_private/']) { const d = await FSV(p, k + g); if (!d) bad.push(k + g + ' 沒有'); else bad.push(...R.checkDoc(d)); }
    ok(bad.length === 0, m + (bad.length ? '：' + bad.slice(0, 3).join('；') : ''));
  };
  const logsOf = p => p.evaluate(() => Object.entries(window.__FS).filter(e => e[0].startsWith('mg_admin_log/')).map(e => e[1]));
  const NAMES = Object.keys(P).map(k => P[k][2]);

  const b = await chromium.launch();

  /* ═══ A. 沒有任何資料：不壞，更新沒有新紀錄也不出錯，重複按冪等 ═══ */
  {
    const p = await teacher(b, mkSeed({ empty: true }), { stages: ['1', '2a', '2b'] });
    await tab(p, 'rank');
    const t0 = await T(p, '#main');
    ok(t0.includes('榮譽碑') && t0.includes('還沒更新過'), 'A 空狀態：「還沒更新過」');
    ok(await p.isVisible('[data-rk-nodata]') && (await T(p, '[data-rk-nodata]')).includes('更新榜單'), 'A 空狀態：榜單區說明怎麼開始（按更新榜單）');
    ok((await T(p, '[data-rk-items] [data-rk-empty]')).includes('沒有待審核'), 'A 空狀態：待審核寫「沒有待審核的場次…」');
    ok((await p.$$('[data-rk-grade]')).length === 3 && (await p.$$('[data-rk-sub]')).length === 3, 'A 三個年級頁籤、三個榜單分頁');
    ok(await p.isVisible('[data-help]') && (await T(p, '[data-help] summary')).includes('怎麼用'), 'A 有「？這頁怎麼用」');
    await upd(p);
    const s1 = await T(p, '[data-rk-summary]');
    ok(s1.includes('讀了 0 筆') && s1.includes('新的 0 筆') && s1.includes('新上榜 0 人'), 'A 沒有紀錄時更新：讀 0 筆、新上榜 0 人，沒有錯誤（' + s1.slice(0, 60) + '）');
    ok((await keysOf(p, 'mg_nw_board/')).length === 3 && (await keysOf(p, 'mg_nw_board_private/')).length === 3, 'A 更新後寫出 3 份 mg_nw_board 與 3 份 mg_nw_board_private');
    await checkWritten(p, 'A 寫出去的榜單與私有狀態：沒有巢狀陣列、undefined、NaN（checkDoc）');
    ok((await commits(p)).join() === '7', 'A 一次 commit、7 個寫入（3 榜單＋3 私有狀態＋1 操作紀錄）');
    ok(await adminOnly(p, '^mg_nw_board'), 'A 榜單與私有狀態都走 admin（老師身分）寫入');
    const lg = (await logsOf(p)).filter(l => l.act === 'rank');
    ok(lg.length === 1 && lg[0].target === 'update' && /讀 0 筆/.test(lg[0].summary), 'A 操作紀錄 rank／update，不含個資：' + (lg[0] && lg[0].summary));
    const b1 = await board(p, '5'), v1 = JSON.stringify(await privOf(p, '5'));
    await upd(p); await upd(p);
    ok(JSON.stringify(noT(b1)) === JSON.stringify(noT(await board(p, '5'))), 'A 重複按更新：榜單內容不變（冪等）');
    ok(JSON.stringify(await privOf(p, '5')).replace(/"t":\d+/g, '') === v1.replace(/"t":\d+/g, ''), 'A 重複按更新：私有狀態不變');
    ok((await commits(p)).length === 3, 'A 每按一次更新就是一次 commit（共 3 次）');
    noErr(p, 'A 沒有 JS 錯誤');
    await p.close();
  }

  /* ═══ B. 有資料：更新、榜單、⚠、預覽、不外洩 ═══ */
  const { seed: seedB, meta } = stripMeta(mkSeed());
  const p = await teacher(b, seedB, { stages: ['1', '2a', '2b'] });
  await tab(p, 'rank');
  ok(Number(await T(p, '[data-rk-pendn]')) === 2, 'B 還沒更新前：待審核 2 場（來自 mg_nw_flags 的 run 標記）');
  const e0 = await T(p, `[data-rk-item="${meta.rid.e}"]`);
  ok(e0.includes('五年級') && e0.includes('咕咕鳥') && e0.includes('★3') && e0.includes('60 字／分') && e0.includes('100%') && e0.includes('按鍵太少'), 'B 待審卡片：年級、魔物星級、打字速度、正確率、原因（白話）');
  ok(e0.includes('503・5號') && e0.includes('旗標真名戊'), 'B 待審卡片：顯示班級座號與名字（榜單還沒有這個人時，用標記裡的名字，給老師認人用）');
  const eb = await p.$$eval(`[data-rk-item="${meta.rid.e}"] button`, bs => bs.map(x => x.textContent.trim()));
  ok(eb.includes('放行') && eb.some(x => x.startsWith('不採用')) && eb.some(x => x.startsWith('先不上榜')), 'B 待審卡片三個按鈕：放行、不採用（不上榜）、先不上榜');
  await upd(p);
  const s2 = await T(p, '[data-rk-summary]');
  ok(new RegExp(`讀了 ${meta.total} 筆`).test(s2) && new RegExp(`新的 ${meta.total - 1} 筆`).test(s2), `B 第一次更新：讀了 ${meta.total} 筆（含 1 筆壞資料）、新的 ${meta.total - 1} 筆（壞資料不算）（${s2.slice(0, 50)}）`);
  ok(/新上榜 [1-9]\d* 人/.test(s2), 'B 新上榜人數大於 0');
  ok((await p.isVisible('[data-rk-skipped]')) && (await T(p, '[data-rk-skipped]')).includes('1 筆'), 'B 壞資料：略過 1 筆並說明，不影響其他人');
  ok((await T(p, '[data-rk-last]')).includes('/'), 'B 顯示最後更新時間');
  await checkWritten(p, 'B 寫出去的資料都沒有巢狀陣列、undefined、NaN');
  ok(Number(await T(p, '[data-rk-pendn]')) === 3, 'B 更新後待審 3 場（多了老師端重算才發現、沒有標記的那一場）');
  const b5 = await board(p, '5'), b4 = await board(p, '4'), b6 = await board(p, '6');
  const all = JSON.stringify([b4, b5, b6]);
  ok(!/_\d+號/.test(all) && !all.includes(C5) && !all.includes(C4) && !all.includes(C6) && !all.includes('uid-secret') && !all.includes('旗標真名') && !all.includes('176000'), 'B 榜單裡沒有 docId、班級全名、uid、場次文件 ID、flag 裡的名字');
  ok(all.includes('測試甲') && all.includes('神秘獵人') && !all.includes('測試丙'), 'B 榜單有登入名字（本來就公開）；隱藏暱稱的人顯示「神秘獵人」，真名沒有進榜單');
  ok(JSON.stringify(b5.improve.map(r => r.n)) === JSON.stringify(['測試壬', '測試甲', '神秘獵人']) && b5.improve.map(r => r.v).join() === '80,50,40', 'B 五年級進步榜：+80、+50、+40（乙 +150% 先不上榜）');
  ok(b6.acc.list.length === 1 && b6.acc.list[0].n === '測試庚' && b6.acc.more === 0, 'B 六年級神準名單 1 人');
  ok(b4.fast['coo:1'] && b4.fast['coo:1'][0].v === 6 && b4.fast['coo:1'][0].n === '測試丁', 'B 四年級最快討伐：咕咕鳥★1 6 秒');
  ok(!JSON.stringify(b5).includes('測試戊') && !JSON.stringify(b5).includes('測試辛') && !JSON.stringify(b5).includes('測試己'), 'B 待審的場次不在榜單上');
  ok((await p.$$('[data-rk-row]')).length === 3, 'B 榜單檢視（五年級進步）3 列');
  ok((await T(p, '[data-rk-row]')).includes('9號'), 'B 每列有班級座號');
  ok((await p.$$('[data-rk-row] [data-rk-warn]')).length === 1 && (await T(p, '[data-rk-row] [data-rk-warn]')).includes('進步超過 60%'), 'B ⚠：進步 80% 的標「進步超過 60%」（50%、40% 沒有）');
  ok((await T(p, '[data-rk-hold]')).includes('超過 100%') && (await T(p, '[data-rk-hold]')).includes('+150%'), 'B 進步超過 100% 的先不上榜，列在榜單下面請老師看');
  ok((await T(p, '[data-rk-rows]')).includes('學生看到：神秘獵人'), 'B 隱藏暱稱的人：老師這邊看得到真名，並標「學生看到：神秘獵人」');
  ok((await p.$$('[data-rk-row] [data-rk-act="block"]')).length === 3, 'B 每列都有「先不上榜」');
  await p.click('[data-rk-grade="4"]'); await p.click('[data-rk-sub="fast"]'); await p.waitForTimeout(150);
  ok((await T(p, '[data-rk-rows]')).includes('6 秒') && (await T(p, '[data-rk-rows] [data-rk-warn]')).includes(`比最低合理的 ${D.FASTEST_FLOOR.coo} 秒還快`), `B ⚠：最快秒數比 FASTEST_FLOOR（咕咕鳥 ${D.FASTEST_FLOOR.coo} 秒）還快`);
  await p.click('[data-rk-grade="5"]'); await p.waitForTimeout(150);
  ok((await p.$$('[data-rk-fkey] option')).length >= 1 && (await T(p, '[data-rk-rows]')).includes('戰力 45'), 'B 最快討伐：魔物星級下拉、武器戰力');
  await p.click('[data-rk-sub="acc"]'); await p.click('[data-rk-grade="6"]'); await p.waitForTimeout(150);
  ok((await T(p, '[data-rk-rows]')).includes('測試庚') && (await T(p, '[data-rk-rows]')).includes('不排名次') && !(await T(p, '[data-rk-rows]')).includes('🥇'), 'B 神準名單（六年級）：有名單、不排名次');
  await p.click('[data-rk-grade="5"]'); await p.click('[data-rk-sub="improve"]'); await p.waitForTimeout(150);
  await p.click('[data-rk-prevtoggle]'); await p.waitForTimeout(150);
  const pv = await T(p, '[data-rk-preview]');
  ok(pv.includes('榮譽碑・五年級') && pv.includes('測試壬') && pv.includes('神秘獵人') && pv.includes('打字變快 80%') && !pv.includes('測試丙') && !/_\d+號/.test(pv) && !pv.includes('先不上榜'), 'B 「學生看到的樣子」：跟 mg_nw_board 一致，隱藏暱稱顯示「神秘獵人」，沒有 id 與老師用的按鈕');
  await p.click('[data-rk-prevtoggle]');
  ok(!(await T(p, '#main')).includes('作弊'), 'B 教師頁沒有「作弊」兩個字');

  const st = await p.evaluate(async () => {
    const m = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js'), sdb = m.getFirestore(), r = {};
    const t = async (k, f) => { try { await f(); r[k] = 'ok'; } catch (e) { r[k] = e.code || String(e); } };
    await t('boardGet', () => m.getDoc(m.doc(sdb, 'mg_nw_board', '5')));
    await t('privGet', () => m.getDoc(m.doc(sdb, 'mg_nw_board_private', '5')));
    await t('runsList', () => m.getDocs(m.collection(sdb, 'mg_nw_runs')));
    await t('boardSet', () => m.setDoc(m.doc(sdb, 'mg_nw_board', '5'), { x: 1 }));
    await t('privSet', () => m.setDoc(m.doc(sdb, 'mg_nw_board_private', '5'), { x: 1 }));
    return r;
  });
  ok(st.boardGet === 'ok' && st.privGet === 'permission-denied' && st.runsList === 'permission-denied' && st.boardSet === 'permission-denied' && st.privSet === 'permission-denied', '規則模式：學生帳號讀得到 mg_nw_board，讀不到 mg_nw_board_private 與 mg_nw_runs，寫不進榜單（' + JSON.stringify(st) + '）');

  /* ═══ C. 審核：放行／不採用／撤銷／先不上榜 ═══ */
  const rE = meta.rid.e, rF = meta.rid.f, rH = meta.rid.h, idA = idOf('a');
  const hasE = async () => JSON.stringify(await board(p, '5')).includes('測試戊');
  ok(!(await hasE()), 'C 放行前：戊那一場（待審）不在榜單上');
  let n = await act(p, `[data-rk-act="approve"][data-rid="${rE}"]`, 'no');
  ok(n === 0 && (await FSV(p, `mg_nw_runs/${rE}`)).ok === undefined && (await FSV(p, `mg_nw_flags/run_${rE}`)).status === 'pending', 'C 放行：確認視窗按取消，什麼都沒寫');
  await p.click(`[data-rk-act="approve"][data-rid="${rE}"]`);
  const mt = await modalText(p); await clickModal(p, 'no');
  ok(mt.includes('放行') && mt.includes('學生不會收到任何通知'), 'C 放行的確認視窗：說明學生不會收到通知');
  n = await act(p, `[data-rk-act="approve"][data-rid="${rE}"]`);
  ok(n === 1 && (await commits(p)).pop() === 9, 'C 放行：同一個 batch，只 commit 一次、9 個寫入（flag＋run.ok＋3 榜單＋3 私有狀態＋操作紀錄）');
  ok((await FSV(p, `mg_nw_flags/run_${rE}`)).status === 'approved' && (await FSV(p, `mg_nw_runs/${rE}`)).ok === 1, 'C 放行：flag 變 approved，run.ok＝1');
  ok(await hasE(), 'C 放行後重新彙總：戊那一場進了榜單（最快討伐）');
  ok(Number(await T(p, '[data-rk-pendn]')) === 2, 'C 待審核少 1 場');
  await p.click('[data-rk-zone="approved"]'); await p.waitForTimeout(120);
  ok((await p.$$('[data-rk-item]')).length === 1 && (await T(p, '[data-rk-item]')).includes('已放行') && !!(await p.$('[data-rk-act="undo"]')), 'C 「已放行」區有這一場，按鈕是「撤銷」');
  n = await act(p, '[data-rk-act="undo"]');
  ok(n === 1 && (await FSV(p, `mg_nw_flags/run_${rE}`)).status === 'pending' && (await FSV(p, `mg_nw_runs/${rE}`)).ok === undefined, 'C 撤銷放行：flag 退回 pending、run.ok 刪掉');
  ok(!(await hasE()) && Number(await T(p, '[data-rk-pendn]')) === 3, 'C 撤銷後重新彙總：又回到待審，不在榜單上');
  await p.click('[data-rk-zone="pending"]'); await p.waitForTimeout(120);
  n = await act(p, `[data-rk-act="reject"][data-rid="${rE}"]`);
  ok(n === 1 && (await FSV(p, `mg_nw_flags/run_${rE}`)).status === 'rejected' && (await FSV(p, `mg_nw_runs/${rE}`)).ok === -1, 'C 不採用：flag rejected、run.ok＝-1，同一個 batch');
  ok(!(await hasE()) && !JSON.stringify(await privOf(p, '5')).includes(String((await FSV(p, `mg_nw_runs/${rE}`)).t)), 'C 不採用：榜單沒有、私有狀態也把這一場拿掉了');
  await p.click('[data-rk-zone="rejected"]'); await p.waitForTimeout(120);
  ok((await T(p, '[data-rk-item]')).includes('不採用'), 'C 「不採用」區有這一場');
  n = await act(p, '[data-rk-act="undo"]');
  ok(n === 1 && (await FSV(p, `mg_nw_flags/run_${rE}`)).status === 'pending' && (await FSV(p, `mg_nw_runs/${rE}`)).ok === undefined, 'C 撤銷不採用：flag 回 pending、run.ok 刪掉');
  await p.click('[data-rk-zone="pending"]'); await p.waitForTimeout(120);
  ok(Number(await T(p, '[data-rk-pendn]')) === 3 && (await p.$$('[data-rk-item]')).length === 3, 'C 撤銷不採用後：重新吸收原始紀錄，又回到待審核（3 場）');
  ok(!(await FSV(p, `mg_nw_flags/run_${rF}`)), 'C 己那一場一開始沒有 flag');
  n = await act(p, `[data-rk-act="approve"][data-rid="${rF}"]`);
  const ff = await FSV(p, `mg_nw_flags/run_${rF}`);
  ok(n === 1 && ff && ff.type === 'run' && ff.status === 'approved' && ff.docId === idOf('f') && !('name' in ff) && (await FSV(p, `mg_nw_runs/${rF}`)).ok === 1, 'C 沒有標記的待審場次：放行時建立 flag（type run、approved、不帶姓名）');
  await p.click('[data-rk-zone="approved"]'); await p.waitForTimeout(100);
  n = await act(p, `[data-rk-item="${rF}"] [data-rk-act="undo"]`);
  ok(n === 1 && (await FSV(p, `mg_nw_flags/run_${rF}`)).status === 'pending', 'C 撤銷後 flag 變 pending（紀錄留著）');
  await p.click('[data-rk-zone="pending"]'); await p.waitForTimeout(100);

  ok((await T(p, '[data-rk-rows]')).includes('測試甲'), 'C 先不上榜前：甲在進步榜上');
  await p.click(`[data-rk-row="${idA}"] [data-rk-act="block"]`);
  await p.waitForSelector('[data-modal] [data-rk-until]');
  const bt = await modalText(p);
  ok(bt.includes('不會收到通知') && bt.includes('一週') && bt.includes('四週') && bt.includes('不設期限'), 'C 先不上榜視窗：說明學生不會收到通知、可選期限');
  await p.fill('[data-modal] [data-rk-why]', '進步太多，先問問');
  const nb0 = (await commits(p)).length;
  await clickModal(p, 'ok'); await p.waitForFunction(n0 => (window.__COMMITS || []).length > n0, nb0, { timeout: 8000 }); await p.waitForTimeout(250);
  const blk = (await privOf(p, '5')).blocked[idA];
  ok(blk && blk.why === '進步太多，先問問' && Math.abs(blk.until - (Date.now() + 7 * DY)) < 60000, 'C 先不上榜（一週）：存在 mg_nw_board_private，期限約 7 天後，理由只在私有那份');
  ok(!JSON.stringify(await board(p, '5')).includes('測試甲') && !JSON.stringify(await board(p, '5')).includes('進步太多'), 'C 先不上榜後重新彙總：榜單沒有甲（進步、最快都沒有），理由沒有進榜單');
  ok((await T(p, `[data-rk-blocked="${idA}"]`)).includes('測試甲') && !!(await p.$(`[data-rk-blocked="${idA}"] [data-rk-act="unblock"]`)) && Number(await T(p, '[data-rk-blockn]')) === 1, 'C 「先不上榜的同學」清單有甲、有「解除」');
  n = await act(p, `[data-rk-blocked="${idA}"] [data-rk-act="unblock"]`);
  ok(n === 1 && !(await privOf(p, '5')).blocked[idA] && JSON.stringify(await board(p, '5')).includes('測試甲'), 'C 解除先不上榜：甲回到榜單，同一個 batch');
  await p.click(`[data-rk-row="${idA}"] [data-rk-act="block"]`); await p.waitForSelector('[data-modal] [data-rk-until]');
  await clickModal(p, 'ok'); await p.waitForTimeout(400);
  ok(!JSON.stringify(await board(p, '5')).includes('測試甲'), 'C 再次先不上榜（預設一週）');
  await p.evaluate(id => { window.__FS['mg_nw_board_private/5'].blocked[id].until = Date.now() - 1000; }, idA);
  await upd(p);
  ok(JSON.stringify(await board(p, '5')).includes('測試甲'), 'C 期限過了，下次更新甲自動回到榜上');
  await p.click(`[data-rk-item="${rH}"] [data-rk-act="block"]`); await p.waitForSelector('[data-modal] [data-rk-until]');
  await p.selectOption('[data-modal] [data-rk-until]', '0');
  await clickModal(p, 'ok'); await p.waitForTimeout(400);
  ok((await privOf(p, '5')).blocked[idOf('h')].until === 0, 'C 從待審卡片「先不上榜…」：不設期限（until＝0）');
  ok((await T(p, `[data-rk-item="${rH}"]`)).includes('先不上榜中'), 'C 該卡片標示「先不上榜中」');
  n = await act(p, `[data-rk-blocked="${idOf('h')}"] [data-rk-act="unblock"]`);
  ok(n === 1 && !(await privOf(p, '5')).blocked[idOf('h')], 'C 解除不設期限的');

  const lg2 = (await logsOf(p)).filter(l => l.act === 'rank');
  ok(lg2.length >= 12 && lg2.every(l => !NAMES.some(nm => (l.summary + l.target).includes(nm)) && !/作弊/.test(l.summary)), 'C 每個審核動作都有操作紀錄（' + lg2.length + ' 筆），內容沒有學生姓名、沒有「作弊」');
  ok(['放行', '不採用', '撤銷', '先不上榜', '解除'].every(w => lg2.some(l => l.summary.startsWith(w))), 'C 操作紀錄涵蓋放行、不採用、撤銷、先不上榜、解除');

  /* ═══ D. 增量更新、從頭重算（按兩次確認、先不上榜名單保留） ═══ */
  const newRun = runDoc('c', { cpm: 70, ts: NOW - 60 * 1000 });
  await p.evaluate(r => { window.__FS['mg_nw_runs/' + r.rid] = r.d; }, newRun);
  await upd(p);
  ok(/其中新的 1 筆/.test(await T(p, '[data-rk-summary]')), 'D 之後只多了 1 筆新紀錄：更新顯示「新的 1 筆」（游標往回退 5 秒，所以「讀了」可能多一兩筆舊的）');
  ok(JSON.stringify(await privOf(p, '5')).includes(String(newRun.d.t)), 'D 新紀錄被吸收進私有狀態');
  await upd(p);
  ok(/其中新的 0 筆/.test(await T(p, '[data-rk-summary]')), 'D 再按一次：新的 0 筆');
  await p.click(`[data-rk-row="${idA}"] [data-rk-act="block"]`); await p.waitForSelector('[data-modal] [data-rk-until]'); await clickModal(p, 'ok'); await p.waitForTimeout(400);
  const before = JSON.stringify(noT(await board(p, '5')));
  const nc = (await commits(p)).length;
  await p.click('[data-rk-rebuild]'); await p.waitForTimeout(150);
  ok((await modalText(p)).includes('從頭重算') && (await modalOpen(p)) === 1, 'D 從頭重算：第一個確認視窗');
  await clickModal(p, 'no'); await p.waitForTimeout(150);
  ok((await commits(p)).length === nc && (await modalOpen(p)) === 0, 'D 第一個視窗按取消：什麼都沒做');
  await p.click('[data-rk-rebuild]'); await p.waitForTimeout(100); await clickModal(p, 'ok'); await p.waitForTimeout(250);
  ok((await modalOpen(p)) === 1 && (await modalText(p)).includes('再確認一次'), 'D 第二個確認視窗（按兩次才執行）');
  await clickModal(p, 'no'); await p.waitForTimeout(150);
  ok((await commits(p)).length === nc, 'D 第二個視窗按取消：還是什麼都沒做');
  await p.click('[data-rk-rebuild]'); await p.waitForTimeout(100); await clickModal(p, 'ok'); await p.waitForTimeout(250); await clickModal(p, 'ok');
  await p.waitForFunction(n0 => (window.__COMMITS || []).length > n0 && !document.querySelector('[data-rk-update]').disabled, nc, { timeout: 10000 }); await p.waitForTimeout(250);
  const s4 = await T(p, '[data-rk-summary]');
  ok(s4.includes('從頭重算完成') && new RegExp(`讀了 ${meta.total + 1} 筆`).test(s4), `D 從頭重算：重讀全部紀錄（${meta.total + 1} 筆，含剛加的 1 筆）：` + s4.slice(0, 50));
  ok(JSON.stringify(noT(await board(p, '5'))) === before, 'D 從頭重算的榜單 ＝ 增量算出來的榜單（先不上榜的人仍不在榜上）');
  ok(!!(await privOf(p, '5')).blocked[idA] && Number(await T(p, '[data-rk-blockn]')) === 1, 'D 從頭重算後，「先不上榜」名單還在');
  noErr(p, 'B～D 整段操作沒有 JS 錯誤');

  await p.setViewportSize({ width: 390, height: 800 }); await p.waitForTimeout(200);
  const sw = await p.evaluate(() => ({ w: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
  ok(sw.w <= sw.c + 1, `手機 390 寬：🏆 分頁不橫向捲動（scrollWidth ${sw.w} ≤ ${sw.c}）`);
  await p.click('[data-rk-prevtoggle]'); await p.click('[data-rk-sub="fast"]'); await p.waitForTimeout(200);
  const sw2 = await p.evaluate(() => ({ w: document.documentElement.scrollWidth, c: document.documentElement.clientWidth, b: [...document.querySelectorAll('#main button')].filter(x => x.getBoundingClientRect().right > document.documentElement.clientWidth + 1).length }));
  ok(sw2.w <= sw2.c + 1 && sw2.b === 0, `手機 390 寬：預覽與最快討伐也不橫向捲動、按鈕沒被切到（${sw2.w}／${sw2.c}、被切 ${sw2.b}）`);
  await p.screenshot({ path: path.join(OUT, 'nw16-rank-mobile.png'), fullPage: true });
  await p.close();

  /* ═══ E. 資料壞掉、讀不到：不能壞 ═══ */
  {
    const sd = mkSeed({ empty: true });
    sd['mg_nw_board_private/5'] = { v: 99, junk: true };
    sd['mg_nw_board_private/4'] = { v: 1, g: '4', cursor: 'x', students: 5, blocked: [], prev: 3, cur: { imp: 1 } };
    sd['mg_nw_board/6'] = 'not an object';
    sd['mg_nw_flags/run_壞'] = { type: 'run', status: 'pending' };
    sd['mg_nw_flags/run_五年級3班_9號_1'] = { type: 'run', status: 'pending', why: ['不存在的代碼', 5, '<img src=x onerror=alert(1)>'], mk: '<b>x</b>', star: 'q', cls: '<i>', seat: 9, name: '<script>x</script>' };
    const q = await teacher(b, sd, { stages: ['1', '2a'] });
    await tab(q, 'rank');
    ok(await q.isVisible('[data-rk-status]') && (await T(q, '[data-rk-dataerr]')).includes('版本不認得'), 'E 私有資料版本不認得：提醒「按從頭重算」，頁面照常');
    const html = await q.evaluate(() => document.querySelector('#main').innerHTML);
    ok(!/<img src=x|<script>x|<b>x<\/b>/.test(html), 'E flag 裡學生寫的怪字串（HTML）一律跳脫，沒有被當成標籤');
    ok((await q.$$('[data-rk-item]')).length === 2 && (await T(q, '#main')).includes('不認得的代碼'), 'E 沒有 runId 的 flag 用文件 ID 找；不認得的原因代碼顯示「不認得的代碼」');
    await upd(q);
    ok((await T(q, '[data-rk-summary]')).includes('讀了 0 筆') && (await keysOf(q, 'mg_nw_board/')).length === 3, 'E 壞資料之後更新照樣成功（壞的那份被當成空的重建）');
    ok(!(await q.$('[data-rk-dataerr]')), 'E 更新後「版本不認得」的提醒消失');
    noErr(q, 'E 沒有 JS 錯誤');
    await q.close();
    const q2 = await teacher(b, mkSeed({ empty: true }), { stages: ['1', '2a'], deny: '^mg_nw_board_private' });
    await tab(q2, 'rank');
    ok(await q2.isVisible('[data-rk-loaderr]') && await q2.isVisible('[data-rk-retry]') && !(await q2.$('[data-rk-update]')), 'E 讀不到（規則還沒貼）：友善提示＋「重試」，不給會失敗的更新按鈕');
    await q2.evaluate(() => { window.__DENY_READ = null; });
    await q2.click('[data-rk-retry]'); await q2.waitForTimeout(400);
    ok(!(await q2.$('[data-rk-loaderr]')) && await q2.isVisible('[data-rk-update]'), 'E 按重試：讀得到之後恢復正常');
    noErr(q2, 'E 讀不到的情況沒有未攔住的 JS 錯誤');
    await q2.close();
  }

  /* ═══ F. 總覽的榮譽碑列 ═══ */
  {
    const q0 = await teacher(b, mkSeed({ empty: true }), {});
    const t0 = await T(q0, '[data-card="rank"]');
    ok(t0.includes('榮譽碑') && t0.includes('還沒開放'), 'F 2a／2b 都還沒開放：總覽榮譽碑卡片寫「還沒開放」，不是空白（' + t0 + '）');
    ok(!(await T(q0, '[data-todolist]')).includes('榜單') && !(await T(q0, '[data-todolist]')).includes('榮譽碑'), 'F 還沒開放時，今天要做的事不會叫老師更新榜單');
    ok((await q0.evaluate(() => (window.__READS || []).filter(r => /mg_nw_board/.test(r.path)).length)) === 0, 'F 還沒開放時，總覽連榜單都不讀');
    noErr(q0, 'F 沒有 JS 錯誤');
    await q0.close();
    const sd = stripMeta(mkSeed()).seed;
    const q1 = await teacher(b, sd, { stages: ['1', '2b'] });
    const t1 = await T(q1, '[data-card="rank"]');
    ok(t1.includes('2 場待審') && t1.includes('榜單還沒更新過') && t1.includes('還沒開放給學生'), 'F 2b 開放、2a 沒有：待審 2 場、「榜單還沒更新過」「還沒開放給學生」（' + t1 + '）');
    ok((await T(q1, '[data-todolist]')).includes('有 2 場狩獵紀錄等你審核') && !(await T(q1, '[data-todolist]')).includes('沒更新'), 'F 待審的場次出現在「今天要做的事」；2a 沒開放不催更新');
    await q1.click('[data-todo-k="rank"]'); await ready(q1); await q1.waitForTimeout(200);
    ok(await q1.isVisible('[data-rk-status]'), 'F 點那一行直接跳到 🏆 分頁');
    await q1.close();
    const q2 = await teacher(b, sd, { stages: ['1', '2a', '2b'] });
    ok((await T(q2, '[data-todolist]')).includes('榮譽碑的榜單還沒更新過'), 'F 2a 開放但從沒更新過：提醒');
    await q2.close();
    const boardsAt = t => ['4', '5', '6'].reduce((o, g) => Object.assign(o, { ['mg_nw_board/' + g]: { v: 1, g, t, week: 1, improve: [], fast: {}, acc: { list: [], more: 0 }, cut: {} } }), {});
    const old = Object.assign({}, sd, boardsAt(NOW - 8 * DY));
    const q3 = await teacher(b, old, { stages: ['1', '2a', '2b'] });
    ok((await T(q3, '[data-todolist]')).includes('榜單 8 天沒更新了') && (await T(q3, '[data-card="rank"]')).includes('上次更新'), 'F 超過 7 天沒更新：總覽「榜單 8 天沒更新了」');
    await tab(q3, 'rank');
    ok(await q3.isVisible('[data-rk-stale-note]') && (await T(q3, '[data-rk-stale-note]')).includes('8 天沒更新'), 'F 🏆 分頁也提醒');
    await q3.fill('[data-rk-stale]', '10'); await q3.dispatchEvent('[data-rk-stale]', 'change'); await q3.waitForTimeout(200);
    ok(!(await q3.$('[data-rk-stale-note]')) && (await q3.evaluate(() => localStorage.getItem('rank_stale_days'))) === '10', 'F 提醒天數改成 10：8 天不再提醒（存在這台電腦）');
    await tab(q3, 'overview');
    ok(!(await T(q3, '[data-todolist]')).includes('沒更新'), 'F 回到總覽：不再提醒');
    await q3.close();
    const q4 = await teacher(b, Object.assign({}, sd, boardsAt(NOW - 3 * H)), { stages: ['1', '2a', '2b'] });
    ok(!(await T(q4, '[data-todolist]')).includes('沒更新'), 'F 3 小時前才更新過：不提醒');
    await q4.close();
    const q5 = await teacher(b, old, { stages: ['1', '2a'], stale: 30 });
    ok(!(await T(q5, '[data-todolist]')).includes('沒更新'), 'F 提醒天數設 30：8 天前更新的不提醒');
    await q5.close();
    const q6 = await teacher(b, sd, { stages: ['1', '2a'], deny: '^mg_nw_board/' });
    ok((await T(q6, '[data-card="rank"]')).includes('榜單讀不到') && !(await T(q6, '[data-todolist]')).includes('沒更新'), 'F 榜單讀不到（規則還沒貼）：總覽照常顯示，卡片說讀不到，不亂催更新');
    noErr(q6, 'F 讀不到時總覽沒有未攔住的 JS 錯誤');
    await q6.close();
  }

  /* ═══ G. 舊控制台（index.html）老師登入後的背景更新 ═══ */
  async function oldConsole(o) {
    const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
    watch(p);
    await p.addInitScript(a => {
      window.__FS = a.s; window.__RULES = true; localStorage.clear(); window.confetti = () => {}; window.html2canvas = async () => document.createElement('canvas');
      window.__ADMIN_PRESIGNED = { uid: 'T1', email: 'teacher@example.test' };
      if (a.stages) window.__NW_STAGES__ = a.stages;
      if (a.fail) window.__FAIL_WRITES = a.fail;
    }, { s: o.seed, stages: o.stages, fail: o.fail });
    await route(p);
    await p.goto('http://localhost:8765/index.html'); await p.waitForFunction(() => window.__NWG, null, { timeout: 15000 }); await p.waitForTimeout(400);
    return p;
  }
  const gate = async p => { await p.click('#btn-teacher'); await p.fill('#auth-pw', 'teacher'); await p.click('#auth-ok'); await p.waitForTimeout(1800); };
  const loaded = p => p.evaluate(() => performance.getEntriesByType('resource').map(r => r.name).filter(n => /rank-io|rank-calc/.test(n)).length);
  const boardWrites = p => p.evaluate(() => window.__WRITES.filter(w => w.path.startsWith('mg_nw_board')).length);
  const sdG = stripMeta(mkSeed()).seed;
  {
    const g = await oldConsole({ seed: sdG });
    await gate(g);
    ok(await g.isVisible('#teacher-modal'), 'G 舊控制台照常開啟');
    ok((await loaded(g)) === 0 && (await g.evaluate(() => (window.__READS || []).filter(r => /^mg_nw_(runs|board)/.test(r.path)).length)) === 0 && (await keysOf(g, 'mg_nw_board/')).length === 0, 'G 2a 沒開放：一行都不執行（沒載入 rank-io／rank-calc、沒讀紀錄與榜單、沒寫榜單）');
    noErr(g, 'G 沒有 JS 錯誤');
    await g.close();
  }
  {
    const g = await oldConsole({ seed: sdG, stages: ['1', '2a', '2b'] });
    ok((await loaded(g)) === 0, 'G 開放了但還沒登入老師：還沒載入榜單程式');
    await gate(g);
    ok(await g.isVisible('#teacher-modal'), 'G 開放時：舊控制台照常開啟');
    ok((await keysOf(g, 'mg_nw_board/')).join() === 'mg_nw_board/4,mg_nw_board/5,mg_nw_board/6' && (await keysOf(g, 'mg_nw_board_private/')).length === 3, 'G 老師登入後背景更新：寫出 3 份榜單與 3 份私有狀態');
    const bb = await FSV(g, 'mg_nw_board/5');
    ok(bb && bb.improve.length === 3 && R.checkDoc(bb).length === 0, 'G 背景更新算出來的榜單：進步榜 3 人');
    ok(await adminOnly(g, '^mg_nw_board'), 'G 背景更新走 admin（老師身分）');
    const lg = (await logsOf(g)).filter(l => l.act === 'rank');
    ok(lg.length === 1 && lg[0].target === 'auto' && !NAMES.some(nm => lg[0].summary.includes(nm)), 'G 背景更新留一筆操作紀錄（rank／auto），不含個資');
    const w0 = await boardWrites(g);
    await g.evaluate(() => { document.getElementById('teacher-modal').classList.add('hidden'); });
    await gate(g);
    ok((await boardWrites(g)) === w0, 'G 30 分鐘內再進控制台：不重複更新');
    ok(await g.isHidden('#toast'), 'G 背景更新沒有彈窗、沒有提示');
    noErr(g, 'G 沒有 JS 錯誤');
    await g.close();
  }
  {
    const fresh = Object.assign({}, sdG, { 'mg_nw_board/4': { v: 1, g: '4', t: Date.now() - 5 * 60 * 1000, improve: [], fast: {}, acc: { list: [], more: 0 }, cut: {} } });
    const g = await oldConsole({ seed: fresh, stages: ['1', '2a'] });
    await gate(g);
    ok((await g.evaluate(() => (window.__READS || []).filter(r => r.path.startsWith('mg_nw_runs')).length)) === 0 && (await boardWrites(g)) === 0, 'G 5 分鐘前才更新過：不跑（沒讀紀錄、沒寫榜單）');
    await g.close();
  }
  {
    const g = await oldConsole({ seed: sdG, stages: ['1', '2a'], fail: '^mg_nw_board' });
    await gate(g);
    ok(await g.isVisible('#teacher-modal'), 'G 背景更新失敗：舊控制台照常開啟');
    ok(await g.isHidden('#toast'), 'G 失敗不彈窗、不提示');
    ok(g.cons.some(c => c.startsWith('warning') && c.includes('榮譽碑背景更新失敗')), 'G 失敗只記在 console（warn）');
    ok(g.errs.length === 0, 'G 失敗也沒有未攔住的 JS 錯誤：' + g.errs.join('|'));
    await g.close();
  }
  await b.close();
}
