/* 2a 榮譽碑（docs/SPEC-STAGE2.md §2、§5 的 2a-1、§6；編號 nw16，原因見 nw12.test.js 開頭）。
   現在只有「不開瀏覽器」的一半：teacher/rank-calc.js 的純函式，用 node 直接測（跟 nw13.test.js 同一種做法，不需要靜態伺服器、不需要 Playwright）。
   用法：node tools/browser-test/nw16.test.js

   涵蓋：q 切回每題；進步（兩邊各 3 場、最好 3 場平均、同題目等級才比、跨題目等級不混、下降／持平／太小不顯示、> 60% 標 ⚠、> 100% 先不上榜、
   用伺服器 ts 不用 t）；週切換邊界（台灣時間週一 00:00，UTC 週日 16:00）；排除（待審、判決、先不上榜、正確率不足）；
   最快討伐；神準名單（不排名次）；▲／新上榜／下降不顯示；彙總輸出不含身分欄位、沒有巢狀陣列與 undefined；
   增量處理與一次算完結果相同（隨機資料、重複讀、打亂順序）；空資料、只有 1 人、同分、ts 缺漏、q 長度不對等邊界。 */
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* ═══ TODO：瀏覽器那一半（教師頁 teacher/tab-rank.js 與學生端 nw-rank.js 重寫完成後才加；規格 §6 的 nw14 列與 t5 列）═══
   做的人在這裡加一段 Playwright（開頭照 nw15.test.js 的 open()／假資料庫；教師頁照 t5.test.js），並把這個檔改成「純函式測完再開瀏覽器」。
   要測的（從 SPEC-STAGE2 §2.9、§2.10、§6 整理）：
   · 教師頁 🏆 分頁：待審核列出 mg_nw_flags type 'run'、status 'pending'；「沒問題」「不採計」同一個 batch 寫 flag 狀態＋run.ok＋log()；
     「移除這筆」「這個人先不上榜」（setBlocked 寫進 mg_nw_board_private）之後重新彙總，榜上不再出現；「現在更新」「從頭重算」（按兩次確認）。
   · 更新流程：讀 where('ts','>', cursorOf(priv))，寫 3 份 mg_nw_board＋3 份 mg_nw_board_private（用 window.__WRITES 確認都走 admin app）；
     總覽打開／舊控制台老師登入後，超過 6 小時才自動更新。
   · 學生端 nw-rank.js：只讀 1 份 mg_nw_board/{年級}（window.__READS 沒有 mg_scores、mg_nw_runs）；前 10＋自己、自己用 c＋s 認；
     榜外不顯示名次、只寫「再快 N 就上榜」；▲ 與 🆕、下降不顯示；hideNick＝「神秘獵人」；讀不到／還沒更新過的文字；手機 390 寬。
   · 假資料庫 mock/fs.js 不會擋巢狀陣列、undefined、單文件 1 MB：頁面寫出去的 mg_nw_board*／mg_nw_board_private* 用 R.checkDoc 再掃一遍。 */

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
  ok(bad({ ...mk(), secs: 311 }, 'secs') && bad({ ...mk(), secs: -1 }, 'secs') && bad({ ...mk(), acc: 1.2 }, 'acc') && bad({ ...mk(), acc: 'x' }, 'acc') && bad({ ...mk(), lv: 0 }, 'lv') && bad({ ...mk(), ans: -1 }, 'num') && bad({ ...mk(), t: 'x' }, 't'), '秒數、正確率、等級、數字欄位超出範圍 → 略過');
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

  console.log(fails ? `\n${fails} 個失敗` : '\n全部通過');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL 測試本身丟例外：' + (e && e.stack || e)); process.exit(1); });
