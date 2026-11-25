/* 委託板「一次 4 張」第 1 步：純函式（nw-board-rot.js）與存檔格式（docs/SPEC-BOARD-ROTATION.md §1、§2、§5、§8）。純 node，不開瀏覽器。
   涵蓋：旗標預設關、跟參考實作 tools/nw-sim/board.mjs 逐字比對（500 個隨機進度的 pickBoard／afterRun／refillAll／ensureBoard）、
   規格 §6.2 的自我檢查、強的上限、全新／舊存檔／全破、活動與主線一定在板上、normalizeBoard 與 Firestore 限制。 */
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

(async () => {
  const D = await import('../../nw-data.js');
  const R = await import('../../nw-board-rot.js');
  const S = await import('../nw-sim/board.mjs');
  const { BOARD, pickBoard, afterRun, refillAll, swapState, allDone, ensureBoard, repair, band, frontier, ctxOf, parseId, firestoreOk, hash32 } = R;
  const now = Date.UTC(2026, 10, 24, 3);
  const ids = b => BOARD.keys.map(k => b.slots[k].id).filter(Boolean);
  const roleOf = (nw, id, T = 480) => band(nw, parseId(id), frontier(nw, T));
  const mk = o => D.normalizeNw(Object.assign({ starter: 'staff', tut: { dodge: 1, defend: 1, attack: 1 } }, o));

  ok(D.BOARD_ROT === true && D.boardRotOn() === true, '旗標 BOARD_ROT 預設是 true（2026-11-25 老師同意開；node 裡沒有 window，也是 true）');
  ok(D.defaultNw().board === null && D.normalizeNw({}).board === null, '全新存檔與舊存檔：board 是 null');
  ok(D.normalizeNw({ board: [] }).board === null && D.normalizeNw({ board: { v: 2 } }).board === null && D.normalizeNw({ board: 'x' }).board === null, '看不懂的 board（陣列、v:2、字串）→ null');

  /* ── 決定性與 Firestore ── */
  const fresh = mk({});
  const b1 = pickBoard(fresh, now, 12345, [], 300), b2 = pickBoard(fresh, now, 12345, [], 300);
  ok(JSON.stringify(b1) === JSON.stringify(b2), '同一個種子、同一份進度 → 同一塊板子');
  ok(firestoreOk(b1) && BOARD.keys.every(k => b1.slots[k] && typeof b1.slots[k].id === 'string'), '板子可以存進 Firestore，五個鍵都在');
  ok(firestoreOk(JSON.parse(JSON.stringify(b1))) && JSON.stringify(JSON.parse(JSON.stringify(b1))) === JSON.stringify(b1), '來回 JSON 不變（沒有 undefined）');
  const f0 = ids(b1);
  ok(f0.length === 3 && f0.every(x => /^grass:\w+:1$/.test(x)), `全新存檔：草原 3 隻 ★1（${f0.join('、')}）`);
  ok(f0.includes('grass:frog:1'), '全新存檔：主線 1-1 泡泡蛙 ★1 一定在');

  /* ── 舊存檔：草原打到 ★3、沒有 board ── */
  const old = mk({ zone: { grass: 3, forest: 0 }, dex: { frog: 2, coo: 2, shroom: 1 }, quest: { done: ['1-0', '1-0a', '1-1', '1-2', '1-3', '1-4'] }, fastMk: { 'frog:3': 150, 'coo:3': 120, 'shroom:3': 200 } });
  const e1 = ensureBoard(old, now, [], 300, 99);
  const oi = ids(e1.board), orl = oi.map(x => roleOf(old, x, 300));
  ok(e1.why === 'new' && oi.length === 4 && orl.filter(x => x === 'hard').length === 1 && orl.includes('mid') && orl.includes('easy'), `舊存檔第一塊板子照進度排：4 張、1 張挑戰、有剛好與輕鬆（${oi.join('、')}）`);
  ok(oi.some(x => /^grass:\w+:4$/.test(x)), '主線 1-7（草原 ★5）的下一步：草原 ★4 在板上');
  ok(ensureBoard(Object.assign({}, old, { board: e1.board }), now, [], 300).why === 'same', '同一天再打開：什麼都不動');

  /* ── 打贏蓋章（不補單）、輸不動、不算數不動 ── */
  const nw1 = JSON.parse(JSON.stringify(old)); nw1.board = e1.board;
  const hk = BOARD.keys.find(k => nw1.board.slots[k].id && roleOf(nw1, nw1.board.slots[k].id, 300) === 'hard'), hid = nw1.board.slots[hk].id;
  nw1.zone.grass = 4; nw1.dex[parseId(hid).mk]++;
  const a = afterRun(nw1, nw1.board, { id: hid, win: true, valid: true, wasHard: true }, now, [], 300);
  ok(a.changed.every(k => a.board.slots[k].k === 'goal0' && a.board.slots[k].id !== hid) && a.board.slots[hk].ok === 1 && a.board.slots[hk].id === hid && a.board.done === 1 && a.board.last === hid && a.board.recent[0] === hid, '打贏挑戰單 → 蓋章、單子留在原位、done＋1；只可能多貼一張新的任務目標（主線往前走了）');
  ok(ids(a.board).length >= 4 && ids(a.board).length <= 5 && new Set(ids(a.board)).size === ids(a.board).length && firestoreOk(a.board), '4～5 張、沒有重複、符合 Firestore');
  ok(afterRun(nw1, a.board, { id: hid, win: true, valid: true, wasHard: true }, now, [], 300).board === a.board, '已經蓋章的單子再打贏（兩個分頁）→ 什麼都不變');
  const ck = BOARD.keys.find(k => a.board.slots[k].id && !a.board.slots[k].ok && roleOf(nw1, a.board.slots[k].id, 300) !== 'hard');
  const lost = afterRun(nw1, a.board, { id: a.board.slots[ck].id, win: false, valid: true, wasHard: false }, now, [], 300);
  ok(lost.changed.length === 0 && lost.board.slots[ck].id === a.board.slots[ck].id && lost.board.slots[ck].m === 1, '輸／逃走／撤退 → 單子留著（m＋1）');
  ok(afterRun(nw1, a.board, { id: a.board.slots[ck].id, win: true, valid: false }, now, [], 300).board === a.board, '不算數的場次 → 什麼都不變');
  ok(afterRun(nw1, a.board, { id: 'grass:coo:1x', win: true, valid: true }, now, [], 300).changed.length === 0, '打的單子不在板上 → 什麼都不變');

  /* ── 挑戰單連輸 2 次換成好打的 ── */
  let nwl = JSON.parse(JSON.stringify(old)); nwl.board = e1.board; let lb = nwl.board;
  for (let i = 0; i < 2; i++) lb = afterRun(nwl, lb, { id: lb.slots[hk].id, win: false, valid: true, wasHard: true }, now, [], 300).board;
  ok(lb.lose === 2, '連輸 2 次挑戰單：lose＝2');

  /* ── 強的上限：任何進度、任何種子，挑戰單 ≤ 1，而且一定有剛好或輕鬆 ── */
  let bad = 0, noMid = 0, many = 0, n = 0;
  const rnd = S.mulberry(7);
  const MQ = D.MAIN_QUESTS.map(q => q.id);
  const randNw = () => {
    const g = Math.floor(rnd() * 6), f = g >= 5 ? Math.floor(rnd() * 6) : 0;
    const dex = {}; ['frog', 'coo', 'shroom', 'wolf'].forEach(m => { if (rnd() < 0.7) dex[m] = 1 + Math.floor(rnd() * 5); });
    const fastMk = {}; if (rnd() < 0.7) ['frog', 'coo', 'shroom'].forEach(m => { for (let s = 1; s <= Math.max(1, g); s++) if (rnd() < 0.6) fastMk[m + ':' + s] = 60 + Math.round(rnd() * 300); });
    const done = MQ.slice(0, Math.floor(rnd() * (MQ.length + 1)));
    return mk({ zone: { grass: g, forest: f }, dex, fastMk, quest: { done } });
  };
  const evs = [[], [{ id: 'h', mk: 'coo', minStar: 1 }], [{ id: 'w', mk: 'wolf', minStar: 1 }], [{ id: 'c', mk: 'shroom', minStar: 2 }]];
  let same = 0, total = 0;
  for (let i = 0; i < 500; i++) {
    const nw = randNw(), T = rnd() < 0.5 ? 300 : 480, ev = evs[Math.floor(rnd() * evs.length)], seed = Math.floor(rnd() * 4e9);
    const A = pickBoard(nw, now, seed, ev, T), B = S.pickBoard(nw, now, seed, ev, T);
    total++; if (JSON.stringify(A) === JSON.stringify(B)) same++;
    const list = ids(A), rl = list.map(x => roleOf(nw, x, T));
    n++; if (rl.filter(x => x === 'hard').length > 1) many++;
    if (!firestoreOk(A)) bad++;
    if (list.length && !rl.includes('mid') && !rl.includes('easy')) noMid++;
    /* 打贏其中一張（隨機一張）：兩邊也要一樣 */
    if (list.length) {
      const id = list[Math.floor(rnd() * list.length)], run = { id, win: rnd() < 0.7, valid: true, wasHard: roleOf(nw, id, T) === 'hard' };
      const A2 = afterRun(nw, A, run, now, ev, T), B2 = S.afterRun(nw, B, run, now, ev, T);
      total++; if (JSON.stringify(A2) === JSON.stringify(B2)) same++;
      if (!firestoreOk(A2.board)) bad++;
      const S1 = refillAll(nw, A, now, ev, T, 'swap'), S2 = S.refillAll(nw, B, now, ev, T, 'swap');
      total++; if (JSON.stringify(S1) === JSON.stringify(S2)) same++;
      /* 板上全部打贏 → 整批換新（兩邊也要一樣） */
      let X1, X2;
      BOARD.keys.forEach(k => { if (A.slots[k].id) { X1 = afterRun(nw, X1 ? X1.board : A, { id: A.slots[k].id, win: true, valid: true, wasHard: false }, now, ev, T); X2 = S.afterRun(nw, X2 ? X2.board : B, { id: B.slots[k].id, win: true, valid: true, wasHard: false }, now, ev, T); } });
      total++; if (JSON.stringify(X1) === JSON.stringify(X2)) same++;
      if (X1 && !firestoreOk(X1.board)) bad++;
      const E1 = ensureBoard(Object.assign({}, nw, { board: A }), now + 7 * 86400e3, ev, T), E2 = S.ensureBoard(Object.assign({}, nw, { board: B }), now + 7 * 86400e3, ev, T);
      total++; if (JSON.stringify(E1) === JSON.stringify(E2)) same++;
    }
  }
  ok(same === total, `跟 tools/nw-sim/board.mjs 逐字相同：${same}／${total}（500 個隨機進度的 pickBoard、afterRun、refillAll 刷新與整批換新、ensureBoard）`);
  ok(bad === 0, '每一步都符合 Firestore 限制（無 undefined、無陣列裡的陣列）');
  ok(many === 0, `挑戰單一次最多 1 張（${n} 塊板子，2 張以上 ${many} 次）`);
  ok(noMid === 0, `板上永遠有「剛好」或「輕鬆」可打（沒有的 ${noMid} 次）`);

  /* ── 張數：4 張，主線＋活動不同張時 5 張 ── */
  const mid = mk({ zone: { grass: 3, forest: 0 }, dex: { frog: 2, coo: 2, shroom: 1 }, quest: { done: ['1-0', '1-0a', '1-1', '1-2', '1-3'] } });
  ok(ids(pickBoard(mid, now, 5, [], 480)).length === 4, '一般 4 張');
  let five = 0, over = 0;
  for (let i = 0; i < 60; i++) { const L = ids(pickBoard(mid, now, 1000 + i, [{ id: 'h', mk: 'coo', minStar: 1 }], 480)).length; if (L === 5) five++; if (L > 5) over++; }
  ok(over === 0, '最多 5 張');
  const fiveNw = mk({ zone: { grass: 4, forest: 0 }, dex: { frog: 3, coo: 3, shroom: 3 }, quest: { done: ['1-0', '1-0a', '1-1', '1-2', '1-3', '1-4'] } });
  const fiveB = pickBoard(fiveNw, now, 3, [{ id: 'sh', mk: 'shroom', minStar: 1 }], 480);
  ok(ids(fiveB).length === 5 && ids(fiveB).some(x => x === 'grass:shroom:' + (fiveB.slots.b.id.split(':')[2])) , `主線（草原 ★5）與活動（跳跳菇）不同張：5 張（${ids(fiveB).join('、')}）`);
  ok(ids(fiveB).filter(x => roleOf(fiveNw, x) === 'hard').length <= 1, '5 張時挑戰還是最多 1 張');

  /* ── 主線與活動不卡關 ── */
  ok(ids(pickBoard(mk({ quest: { done: ['1-0', '1-0a'] } }), now, 1, [], 300)).includes('grass:frog:1'), '主線 1-1：泡泡蛙 ★1 在板上');
  const wolfNw = mk({ zone: { grass: 5, forest: 2 }, dex: { frog: 3, coo: 4, shroom: 3 }, quest: { done: MQ } });
  ok(ids(pickBoard(wolfNw, now, 7, [{ id: 'x', mk: 'wolf', minStar: 1 }], 480)).some(x => x.startsWith('forest:wolf:')), '活動指定炎牙狼：板上有炎牙狼');
  const qd = mk({ zone: { grass: 1, forest: 0 }, dex: { frog: 1, coo: 1, shroom: 1 }, quest: { done: ['1-0', '1-0a', '1-1', '1-2', '1-3'] } });
  ok(ids(pickBoard(qd, now, 2, [], 300)).includes('grass:frog:2') || ids(pickBoard(qd, now, 2, [], 300)).some(x => /:2$/.test(x)), '主線 1-4（草原 ★3）、才打到 ★1：「往任務前進」的 ★2 在板上');

  /* ── 全破 ── */
  const all = mk({ zone: { grass: 5, forest: 5 }, dex: { frog: 9, coo: 9, shroom: 9, wolf: 3 }, fastMk: { 'wolf:5': 200, 'coo:5': 120, 'shroom:5': 150 }, quest: { done: MQ } });
  const ab = pickBoard(all, now, 3, [], 480);
  ok(ids(ab).length === 4 && ids(ab).filter(x => roleOf(all, x) === 'hard').length <= 1, `全破：照樣 4 張（${ids(ab).join('、')}）`);
  ok(frontier(all, 480).cleared === true, '全破：frontier.cleared＝true');

  /* ── 刷新：沒蓋章、不是目標的全換；免費／40／80，一天最多 3 次 ── */
  ok(JSON.stringify(BOARD.swapCost) === '[0,40,80]' && BOARD.outN === 8, '刷新價格常數：[0, 40, 80]、out 最多 8 個');
  const st0 = swapState(nw1, a.board, now, [], 300);
  ok(st0.ok && st0.cost === 0 && st0.left === 3, '刷新狀態：今天免費、還有 3 次');
  const sw1 = refillAll(nw1, a.board, now, [], 300, 'swap'), gslots = k => /^goal/.test(a.board.slots[k].k) || a.board.slots[k].ok;
  const kept = BOARD.keys.filter(k => a.board.slots[k].id && gslots(k)), moved = BOARD.keys.filter(k => a.board.slots[k].id && !gslots(k));
  ok(!sw1.refused && sw1.cost === 0 && sw1.board.swapN === 1 && sw1.board.swap === D.twDay(now) && sw1.board.swapCoin === 0, '第 1 次：免費、swapN＝1');
  ok(kept.every(k => sw1.board.slots[k].id === a.board.slots[k].id), '蓋章的與目標單不動');
  ok(moved.length > 0 && moved.every(k => sw1.board.slots[k].id !== a.board.slots[k].id && sw1.board.out.includes(a.board.slots[k].id)), '沒蓋章、不是目標的全部換掉，被換的 id 記在 out（平的陣列）');
  ok(firestoreOk(sw1.board) && sw1.board.out.every(x => typeof x === 'string'), '刷新後的板子符合 Firestore');
  const sw2 = refillAll(nw1, sw1.board, now, [], 300, 'swap'), sw3 = refillAll(nw1, sw2.board, now, [], 300, 'swap'), sw4 = refillAll(nw1, sw3.board, now, [], 300, 'swap');
  ok(sw2.cost === 40 && sw2.board.swapN === 2 && sw2.board.swapCoin === 40 && sw3.cost === 80 && sw3.board.swapN === 3 && sw3.board.swapCoin === 120, '第 2 次 40、第 3 次 80，swapCoin 累計 120');
  ok(sw4.refused === 'used' && sw4.board === sw3.board && swapState(nw1, sw3.board, now, [], 300).why === 'used', '第 4 次：拒絕（used），狀態是用完了');
  ok(refillAll(nw1, sw3.board, now + 86400e3, [], 300, 'swap').board.swapN === 1, '隔天重新算（swapN 從 0 起算到 1）');
  const ndy = ensureBoard(Object.assign({}, nw1, { board: sw3.board }), now + 86400e3, [], 300);
  ok(ndy.board.swapN === 0 && Array.isArray(ndy.board.out) && ndy.board.out.length === 0, '換日：swapN 歸 0、out 清成 []');
  const allOk = JSON.parse(JSON.stringify(a.board)); BOARD.keys.forEach(k => { if (allOk.slots[k].id) allOk.slots[k].ok = 1; });
  ok(allDone(nw1, allOk, 300) && !allDone(nw1, a.board, 300) && refillAll(nw1, allOk, now, [], 300, 'swap').refused === 'none' && swapState(nw1, allOk, now, [], 300).why === 'none', '全部蓋章：allDone；沒有可以換的 → 刷新拒絕（none）、不扣次數');

  /* ── normalizeBoard ── */
  const nb = D.normalizeBoard(Object.assign(JSON.parse(JSON.stringify(e1.board)), { lose: 99, recent: ['grass:coo:1', 'bad', 'grass:frog:2', 'grass:coo:3', 'grass:coo:4'] }));
  ok(nb.lose === 9 && nb.recent.length === 3 && !nb.recent.includes('bad'), 'normalizeBoard：lose 夾到 9、recent 只留合法的前 3 個');
  const dup = JSON.parse(JSON.stringify(e1.board)); dup.slots.d = Object.assign({}, dup.slots.c);
  const nd = D.normalizeBoard(dup), nds = BOARD.keys.map(k => nd.slots[k].id).filter(Boolean);
  ok(new Set(nds).size === nds.length && BOARD.keys.every(k => nd.slots[k]), '重複的單子清掉第二張，五個鍵都在');
  const dupFix = ensureBoard(Object.assign({}, old, { board: nd }), now, [], 300);
  ok(dupFix.why === 'fix' && ids(dupFix.board).length === 4, '同一天再打開：只把被清掉的那格補回來（why: fix）');
  const miss = D.normalizeBoard({ v: 1, slots: { a: { id: 'grass:coo:1' } } });
  ok(BOARD.keys.every(k => miss.slots[k] && miss.slots[k].m === 0 && miss.slots[k].at === 0 && miss.slots[k].ok === 0) && miss.slots.a.id === 'grass:coo:1', '缺欄位補預設值');
  ok(D.normalizeNw(JSON.parse(JSON.stringify(Object.assign({}, old, { board: e1.board })))).board.day === e1.board.day, 'normalizeNw 保留合法的 board');
  ok(D.normalizeBoard({ v: 1, slots: { a: { id: 'rm -rf' } } }).slots.a.id === '', '不合法的 id 清掉');

  /* ── 換日整理：適合的留著 ── */
  const d1 = ensureBoard(Object.assign({}, nw1, { board: a.board }), now + 7 * 86400e3, [], 300);
  ok(d1.why === 'day' && d1.changed.length <= 1 && d1.board.slots[hk].ok === 1 && d1.board.day === D.twDay(now + 7 * 86400e3), `隔週打開：進度沒變最多換 1 張、蓋章的留著（換了 ${d1.changed.length} 張）`);

  console.log(fails ? `\n${fails} 項失敗` : '\n全部通過');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
