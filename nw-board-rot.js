/* 委託板「一次 4 張、打完才補」的規則（docs/SPEC-BOARD-ROTATION.md §1～§2）。
   純函式：同樣的 nw、now、seed 一定排出同樣的板子。參考實作與驗算在 tools/nw-sim/board.mjs（nw24.test.js 逐字比對）。
   常數 BOARD、旗標 BOARD_ROT、normalizeBoard 放在 nw-data.js（normalizeNw 要用，放這裡會循環引用）。 */
import { REGIONS, MONSTERS, MAIN_QUESTS, boardQuests, stdSecs, twDay, BOARD } from './nw-data.js';
export { BOARD };

const ORDER = Object.keys(REGIONS).filter(k => !REGIONS[k].wip);
export const Eof = (rk, star) => ORDER.indexOf(rk) * 5 + star;
export const parseId = id => { const [rk, mk, s] = String(id || '').split(':'); return { id, rk, mk, star: +s }; };


export function hash32(s) { let h = 0x811c9dc5; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }
export function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const Phi = x => { const t = 1 / (1 + 0.2316419 * Math.abs(x)), d = 0.3989423 * Math.exp(-x * x / 2); const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return x > 0 ? 1 - p : p; };
const median = a => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : NaN; };

export const cands = nw => boardQuests(nw).filter(q => !q.locked);

/* 進度：Ef＝打過最高的「總星級」（草原 1～5、森林 6～10），En＝下一顆星（還沒打過、已經開放） */
export function frontier(nw, tlim = 480) {
  const cs = cands(nw);
  let Ef = 0;
  for (const rk of ORDER) { const z = (nw.zone && nw.zone[rk]) || 0; if (z >= 1 && cs.some(q => q.rk === rk)) Ef = Math.max(Ef, Eof(rk, z)); }
  const En = Ef >= 1 && cs.some(q => Eof(q.rk, q.star) === Ef + 1) ? Ef + 1 : null;
  const F = { Ef, En, cleared: Ef >= 1 && En === null, front: ORDER.find(rk => cs.some(q => q.rk === rk && Eof(rk, q.star) === (En || Ef))) || ORDER[0], hardId: '' };
  /* 全部打完：最後一區 ★4、★5 裡最硬的 3 張中，「還沒打贏過、而且打得贏」的第一張當挑戰單（只有 1 張） */
  if (F.cleared) {
    const phi = phiHat(nw), last = Eof(ORDER[ORDER.length - 1], 4);
    const top3 = cs.filter(q => Eof(q.rk, q.star) >= last).sort((x, y) => stdSecs(y.rk, y.mk, y.star) - stdSecs(x.rk, x.mk, x.star) || (x.id < y.id ? -1 : 1)).slice(0, 3);
    const boss = top3.find(q => !(nw.fastMk || {})[q.mk + ':' + q.star] && pHat(q, phi, tlim) >= BOARD.hardP);
    F.hardId = boss ? boss.id : '';
  }
  return F;
}

/* 速度係數 φ＝自己的打贏秒數 ÷ 標準時間（中位）。fastMk 的鍵沒有區域，同一隻魔物取比較小的標準時間（估得偏慢＝保守） */
export function phiHat(nw) {
  const rs = [];
  for (const [k, secs] of Object.entries(nw.fastMk || {})) {
    const [mk, s] = k.split(':'), star = +s;
    const stds = ORDER.filter(rk => REGIONS[rk].mons.includes(mk)).map(rk => stdSecs(rk, mk, star)).filter(x => x > 0);
    if (stds.length && secs > 0) rs.push(secs / Math.min(...stds));
  }
  if (!rs.length) for (const [k, secs] of Object.entries(nw.fastest || {})) {
    const [rk, s] = k.split(':'), r = REGIONS[rk];
    if (!r || r.wip || !(secs > 0)) continue;
    const stds = r.mons.map(mk => stdSecs(rk, mk, +s)).filter(x => x > 0);
    if (stds.length) rs.push(secs / Math.min(...stds));
  }
  return rs.length ? Math.max(0.2, Math.min(6, median(rs))) : BOARD.phi0;
}
export const pHat = (q, phi, tlim) => Phi(Math.log(tlim / (stdSecs(q.rk, q.mk, q.star) * phi * BOARD.best2typ)) / BOARD.sig);

/* 單子的角色（畫面上的「🍃 輕鬆／🎯 剛好／🔥 挑戰」）只看進度，不存：存的是欄位該放哪一種 */
export function band(nw, q, F = frontier(nw)) {
  const E = Eof(q.rk, q.star);
  if (F.En && E === F.En) return 'hard';
  if (F.cleared && q.id === F.hardId) return 'hard';
  if (F.Ef <= 1 || E >= F.Ef - 1) return 'mid';
  return 'easy';
}

/* 目標：主線（第一個還沒做完、有 target 的任務）＋活動（有指定魔物的）。回 [{ id, kind, why }]，最多 2 個 */
export function goalCards(nw, events, ctx) {
  const out = [], cs = cands(nw), F = ctx.F, open = id => cs.some(q => q.id === id);
  /* 主線只說「草原 ★3」時挑哪一隻：打得贏的（預估勝率 ≥ 挑戰門檻；都不到就最好打的）裡，先留板上已經有的（不跳來跳去），
     再避開剛打贏的那隻、圖鑑次數少的優先。不用亂數：同一份進度一定挑同一隻 */
  const B = ctx.board || {}, onB = id => Object.values(B.slots || {}).some(x => x && x.id === id), lastMk = B.last ? parseId(B.last).mk : '';
  const best = list => {
    const byP = [...list].sort((x, y) => pHat(y, ctx.phi, ctx.tlim) - pHat(x, ctx.phi, ctx.tlim) || (x.id < y.id ? -1 : 1));
    const ok = byP.filter(q => pHat(q, ctx.phi, ctx.tlim) >= BOARD.hardP);
    return (ok.length ? ok : byP.slice(0, 1)).sort((x, y) => (onB(y.id) - onB(x.id)) || ((x.mk === lastMk) - (y.mk === lastMk)) || (((nw.dex || {})[x.mk] || 0) - ((nw.dex || {})[y.mk] || 0)) || (x.id < y.id ? -1 : 1))[0];
  };
  const done = (nw.quest && nw.quest.done) || [];
  /* 跟 newworld.js 的 checkQuests 同一個順序：做完的、暫停的（hold）跳過；soft 而且沒有目標的跳過；
     遇到第一個有目標的就是它；遇到「不是 soft、也沒有目標」的（例如 1-3 閃避防禦各 5 次）就停：那時候主線不需要特定單子 */
  let mq = null;
  for (const q of MAIN_QUESTS) {
    if (done.includes(q.id) || (q.hold && q.hold())) continue;
    if (q.target) { mq = q; break; }
    if (!q.soft) break;
  }
  if (mq) {
    const t = mq.target;
    for (const rk of t.rk ? [t.rk] : ORDER.filter(r => REGIONS[r].mons.includes(t.mk))) {
      const top = Math.min(5, ((nw.zone || {})[rk] || 0) + 1), star = Math.min(t.star || 1, top);
      const list = (t.mk ? [t.mk] : REGIONS[rk].mons).map(mk => parseId(`${rk}:${mk}:${star}`)).filter(q => open(q.id));
      if (list.length) { out.push({ id: best(list).id, kind: 'quest', why: star === t.star ? 'target' : 'path', q: mq.id, match: x => x.rk === rk && x.star === star && (!t.mk || x.mk === t.mk) }); break; }
    }
  }
  for (const ev of events || []) {
    if (!ev.mk || out.length >= 2) continue;
    for (const rk of ORDER.filter(r => REGIONS[r].mons.includes(ev.mk)).reverse()) {   // 先找最新的區域：活動單跟著現在的進度走
      const top = Math.min(5, ((nw.zone || {})[rk] || 0) + 1), min = Math.max(1, ev.minStar || 1);
      if (!cs.some(q => q.rk === rk) || min > top) continue;
      let star = Math.min(top, Math.max(min, (nw.zone || {})[rk] || 1));
      const hard = F.En && Eof(rk, star) === F.En;
      /* 主線的路也在同一顆星：合成一張（改成活動指定的魔物），不讓板上出現 2 張挑戰 */
      const qg = out.find(g => g.kind === 'quest' && parseId(g.id).rk === rk && parseId(g.id).star === star);
      if (qg) {
        if (!MAIN_QUESTS.find(m => m.id === qg.q).target.mk) { const m0 = qg.match; qg.id = `${rk}:${ev.mk}:${star}`; qg.ev = ev.id; qg.match = x => m0(x) && x.mk === ev.mk; break; }   // 主線只要「這一區 ★N」：合成一張，用活動的魔物
        if (star - 1 >= min) star--;                                                                                  // 主線指定了別隻：活動退一星
      } else if (hard && out.some(g => band(nw, parseId(g.id), F) === 'hard') && star - 1 >= min) star--;
      const id = `${rk}:${ev.mk}:${star}`;
      const s0 = star;
      if (open(id) && !out.some(g => g.id === id)) out.push({ id, kind: 'event', why: 'event', ev: ev.id, match: x => x.mk === ev.mk && x.rk === rk && x.star === s0 });
      break;
    }
  }
  return out;
}

/* 這塊板子要有哪些角色（依優先順序）。一般是 4 張：目標（沒有就剛好）、挑戰（目標本身是挑戰就改剛好）、剛好、輕鬆；
   主線與活動各有一張而且不是同一張時才有第 5 張 */
export function roleList(nw, goals, F) {
  const hardGoal = goals.some(g => band(nw, parseId(g.id), F) === 'hard');
  const hasHard = cands(nw).some(q => band(nw, q, F) === 'hard');
  const out = [goals[0] ? 'goal0' : 'mid'];
  if (goals[1]) out.push('goal1');
  out.push(hasHard && !hardGoal ? 'hard' : 'mid', 'mid', 'easy');
  return out;
}

function weight(nw, q, ctx, taken) {
  const B = ctx.board, F = ctx.F, E = Eof(q.rk, q.star);
  let w = 1;
  if (taken.some(id => parseId(id).mk === q.mk)) w *= 0.5;                  // 板上已經有這隻
  if ((B.recent || []).includes(q.id)) w *= 0.2;                              // 剛打贏過
  if (B.last && parseId(B.last).mk === q.mk) w *= 0.15;                       // 跟剛打贏的同一隻
  if (!((nw.dex || {})[q.mk] > 0)) w *= 2;                                    // 還沒打倒過的魔物先出現
  if (band(nw, q, F) === 'easy') w *= 1 / (1 + Math.max(0, F.Ef - 2 - E));   // 輕鬆單別太舊
  if (band(nw, q, F) === 'mid' && q.rk === F.front) w *= 1.5;                 // 剛好單多半在現在這一區
  return w;
}
function pick(list, ws, r) { const tot = ws.reduce((a, b) => a + b, 0); let x = r() * tot; for (let i = 0; i < list.length; i++) { x -= ws[i]; if (x < 0) return list[i]; } return list[list.length - 1]; }

/* 一格要放的單子。taken＝其他格已經有的 id（不重複）；回 id 或 '' */
export function fillOne(nw, kind, ctx, taken, r) {
  const F = ctx.F, cs = cands(nw).filter(q => !taken.includes(q.id) && q.id !== ctx.board.out);
  if (kind === 'goal0' || kind === 'goal1') {
    const g = ctx.goals[kind === 'goal0' ? 0 : 1];
    return g && !taken.includes(g.id) ? g.id : fillOne(nw, 'mid', ctx, taken, r);
  }
  const byP = (a, b) => pHat(b, ctx.phi, ctx.tlim) - pHat(a, ctx.phi, ctx.tlim) || (a.id < b.id ? -1 : 1);
  const hardOnBoard = taken.some(id => band(nw, parseId(id), F) === 'hard');
  if (kind === 'hard') {
    if (hardOnBoard) return fillOne(nw, 'mid', ctx, taken, r);
    const pool = cs.filter(q => band(nw, q, F) === 'hard');
    if (!pool.length) return fillOne(nw, 'mid', ctx, taken, r);
    const soft = [...pool].sort(byP)[0];
    let ok = pool.filter(q => pHat(q, ctx.phi, ctx.tlim) >= BOARD.hardP);
    if ((ctx.board.lose || 0) >= BOARD.loseSoft || !ok.length) ok = [soft];
    return pick(ok, ok.map(q => weight(nw, q, ctx, taken)), r).id;
  }
  if (kind === 'easy') {
    const all = cs.filter(q => band(nw, q, F) === 'easy'), young = all.filter(q => Eof(q.rk, q.star) >= F.Ef - BOARD.easyAge), pool = young.length ? young : all;
    if (pool.length) return pick(pool, pool.map(q => weight(nw, q, ctx, taken)), r).id;
    return fillOne(nw, 'mid', ctx, taken, r);
  }
  /* mid（也是所有退路的終點）：挑戰單永遠不會被當成剛好單放上去 */
  const pool = cs.filter(q => band(nw, q, F) === 'mid');
  if (!pool.length) { const e = cs.filter(q => band(nw, q, F) === 'easy'); return e.length ? pick(e, e.map(q => weight(nw, q, ctx, taken)), r).id : ''; }
  let ok = pool.filter(q => pHat(q, ctx.phi, ctx.tlim) >= BOARD.midP);
  if (!ok.length) ok = [[...pool].sort(byP)[0]];
  return pick(ok, ok.map(q => weight(nw, q, ctx, taken)), r).id;
}

/* 這張單子適合當這個角色嗎（適合的留著：孩子上次想打的那張，下次還在） */
function fits(nw, id, role, ctx, others) {
  const q = parseId(id), F = ctx.F, cs = cands(nw);
  if (!cs.some(c => c.id === id) || others.includes(id)) return false;
  const b = band(nw, q, F);
  if (role === 'goal0' || role === 'goal1') { const g = ctx.goals[role === 'goal0' ? 0 : 1]; return !!g && g.match(q); }
  if (role === 'hard') return b === 'hard';
  if (b === 'hard') return false;   // 挑戰單只能占「挑戰」或「目標」：板上永遠最多 1 張
  if (role === 'easy' && b === 'easy' && Eof(q.rk, q.star) < F.Ef - BOARD.easyAge && cs.some(c => band(nw, c, F) === 'easy' && Eof(c.rk, c.star) >= F.Ef - BOARD.easyAge && !others.includes(c.id))) return false;   // 太舊的輕鬆單換掉
  if (role === 'easy') return b === 'easy' || (b === 'mid' && !cs.some(c => band(nw, c, F) === 'easy' && !others.includes(c.id)));
  return b === 'mid' || (b === 'easy' && !cs.some(c => band(nw, c, F) === 'mid' && !others.includes(c.id)));
}

const emptySlot = () => ({ id: '', k: '', at: 0, m: 0 });
export const ctxOf = (nw, board, now, events, tlim) => { const F = frontier(nw, tlim), phi = phiHat(nw); const c = { F, phi, tlim, board }; c.goals = goalCards(nw, events, c); return c; };
export const dayOf = twDay;   // 台灣時間的日曆日，電腦時區設錯也一樣

/* 從頭排一塊板子（新存檔、舊存檔第一次打開、格式壞掉）。純函式：同樣的 nw、now、seed 一定排出同樣的板子 */
export function pickBoard(nw, now, seed, events = [], tlim = 480) {
  const board = { v: 1, seed: seed >>> 0, day: dayOf(now), n: 0, done: 0, swap: 0, lose: 0, last: '', recent: [], out: '', slots: {} };
  BOARD.keys.forEach(k => { board.slots[k] = emptySlot(); });
  return repair(nw, board, now, events, tlim, Infinity).board;
}

/* 整理板子。force＝一定要清掉重補的格子（剛打贏的、按了換一張的）；max＝另外最多再換幾張不適合的。
   ①現有的單子照角色優先順序認領角色（在哪一格都可以，格子不動）②空出來的角色補進空格（先補 force 的格子，新單子貼回原位）
   ③空格不夠才拿不適合的單子來換（算進 max）④單子比角色多（例如活動結束）就撕掉不適合的（也算進 max） */
export function repair(nw, board0, now, events, tlim, max, force = []) {
  const board = JSON.parse(JSON.stringify(board0)), ctx = ctxOf(nw, board, now, events, tlim), roles = roleList(nw, ctx.goals, ctx.F);
  board.n = (board.n || 0) + 1;
  const K = BOARD.keys, ids = () => K.map(k => board.slots[k].id).filter(Boolean), changed = [];
  force.forEach(k => { if (board.slots[k].id) changed.push(k); board.slots[k] = emptySlot(); });
  const own = {}, free = [];
  for (const role of roles) {
    const k = K.find(k => board.slots[k].id && !own[k] && fits(nw, board.slots[k].id, role, ctx, ids().filter(x => x !== board.slots[k].id)));
    if (k) { own[k] = role; board.slots[k].k = role; } else free.push(role);
  }
  const misfit = K.filter(k => board.slots[k].id && !own[k]);
  let budget = max;
  for (const role of free) {
    let k;
    if (ids().length < roles.length) k = [...force, ...K].find(x => !board.slots[x].id);
    else if (budget > 0 && misfit.length) { k = misfit.shift(); budget--; }
    if (!k) continue;
    const r = mulberry(hash32(`${board.seed}|${board.n}|${k}`));
    const old = board.slots[k].id;
    board.slots[k] = emptySlot();
    const id = fillOne(nw, role, ctx, ids(), r);
    if (id) { board.slots[k] = { id, k: role, at: dayOf(now), m: 0 }; own[k] = role; }
    if (id !== old && !changed.includes(k)) changed.push(k);
  }
  for (const k of misfit) if (budget > 0 && ids().length > roles.length) { board.slots[k] = emptySlot(); budget--; changed.push(k); }
  return { board, changed, ctx };
}

/* 進看板時呼叫：沒有板子就排一塊；換日（twDay）就整理（只換不適合的） */
export function ensureBoard(nw, now, events, tlim, seedIfNew) {
  if (!nw.board || nw.board.v !== 1) return { board: pickBoard(nw, now, seedIfNew, events, tlim), changed: BOARD.keys, why: 'new' };
  if (nw.board.day !== dayOf(now)) { const b = Object.assign({}, nw.board, { day: dayOf(now), out: '' }); const r = repair(nw, b, now, events, tlim, Infinity); return { board: r.board, changed: r.changed, why: 'day' }; }
  /* 同一天：只修壞掉的格子（重複、已經不開放；例如兩個分頁互蓋），其他一張都不動 */
  const cs = cands(nw).map(q => q.id), seen = [], bad = BOARD.keys.filter(k => { const id = nw.board.slots[k].id; if (!id) return false; const b = !cs.includes(id) || seen.includes(id); seen.push(id); return b; });
  /* 空格也試一次補（兩個分頁互蓋後 normalizeBoard 清掉重複會留下空格；參考實作沒做，這裡補上）：補不出東西就原樣不動，不白白加 n */
  const hasEmpty = BOARD.keys.some(k => !nw.board.slots[k].id);
  if (!bad.length && !hasEmpty) return { board: nw.board, changed: [], why: 'same' };
  const r = repair(nw, nw.board, now, events, tlim, 0, bad);
  if (!r.changed.length) return { board: nw.board, changed: [], why: 'same' };
  return { board: r.board, changed: r.changed, why: 'fix' };
}

/* 一場打完（finishHunt 更新 zone、dex、fastMk、任務之後才呼叫）。只有「有效而且打贏」才撕單子 */
export function afterRun(nw, board, run, now, events, tlim) {
  if (!run.valid) return { board, changed: [] };
  const key = BOARD.keys.find(k => board.slots[k].id === run.id);
  if (!key) return { board, changed: [] };
  const b = JSON.parse(JSON.stringify(board));
  if (run.win) {
    b.done++; b.last = run.id; b.recent = [run.id, ...(b.recent || []).filter(x => x !== run.id)].slice(0, BOARD.recentN);
    if (run.wasHard) b.lose = 0;
    b.slots[key] = emptySlot();
    return repair(nw, b, now, events, tlim, 1, [key]);
  }
  b.slots[key].m = (b.slots[key].m || 0) + 1;
  if (run.wasHard) {
    b.lose = (b.lose || 0) + 1;
    if (b.lose >= BOARD.loseSoft) {
      const ctx = ctxOf(nw, b, now, events, tlim), hardIds = cands(nw).filter(q => band(nw, q, ctx.F) === 'hard');
      const soft = hardIds.sort((x, y) => pHat(y, ctx.phi, tlim) - pHat(x, ctx.phi, tlim) || (x.id < y.id ? -1 : 1))[0];
      if (soft && soft.id !== run.id && !(ctx.goals.some(g => g.id === run.id))) { b.slots[key] = emptySlot(); return repair(nw, b, now, events, tlim, 0, [key]); }
    }
  }
  return { board: b, changed: [] };
}

/* 手動「換一張」：一天一次；目標單不能換；換來的跟原本同一種 */
export function swapCard(nw, board, key, now, events, tlim) {
  const s = board.slots[key];
  if (!s || !s.id || s.k === 'goal0' || s.k === 'goal1' || board.swap === dayOf(now)) return { board, changed: [], refused: true };
  const b = JSON.parse(JSON.stringify(board));
  b.out = s.id; b.swap = dayOf(now); b.slots[key] = emptySlot();
  const r = repair(nw, b, now, events, tlim, 0, [key]);
  if (!r.board.slots[key].id) return { board, changed: [], refused: true };   // 沒有別張可以換：不扣次數
  return r;
}

/* Firestore 不收：undefined、陣列裡的陣列（測試與開發時檢查用） */
export function firestoreOk(x, inArr = false) {
  if (x === undefined) return false;
  if (Array.isArray(x)) return !inArr && x.every(v => firestoreOk(v, true));
  if (x && typeof x === 'object') return Object.values(x).every(v => firestoreOk(v, false));
  return typeof x !== 'number' || Number.isFinite(x);
}

/* 畫面要的東西（nw-board.js 用）：每格的單子（沿用 boardQuests 的物件格式，另外加 key／role／tag）、鎖住的區域（只放下緣小紙條）、
   活動說明。角色（role）每次現算、不存：進度變了，同一張單子的角色跟著變。
   tag：quest＝📌 任務目標、path＝📌 往任務前進、event＝🎪 活動（任務與活動合成一張時 both＝true） */
export function boardView(nw, board, events, tlim, today) {
  const ctx = ctxOf(nw, board, 0, events, tlim), F = ctx.F;
  const all = boardQuests(nw, today), byId = {};
  all.forEach(q => { if (!q.locked) byId[q.id] = q; });
  const cards = [];
  BOARD.keys.forEach(key => {
    const s = board.slots[key], q = s && s.id && byId[s.id];
    if (!q) return;
    const gi = s.k === 'goal0' ? 0 : s.k === 'goal1' ? 1 : -1, g = gi >= 0 ? ctx.goals[gi] : null, hit = g && g.match(q);
    cards.push(Object.assign({}, q, { key, role: band(nw, q, F), tag: hit ? (g.kind === 'event' ? 'event' : g.why === 'path' ? 'path' : 'quest') : '', both: !!(hit && g.kind === 'quest' && g.ev) }));
  });
  const locks = all.filter(q => q.locked).map(q => ({ rk: q.rk, needs: REGIONS[q.rk].needs }));
  const notes = [], cs = all.filter(q => !q.locked);
  (events || []).forEach(ev => {
    if (!ev.mk || ctx.goals.some(g => g.ev === ev.id || (g.kind === 'event' && parseId(g.id).mk === ev.mk))) return;
    const rks = ORDER.filter(r => REGIONS[r].mons.includes(ev.mk)), open = rks.filter(r => cs.some(q => q.rk === r)), name = (MONSTERS[ev.mk] || {}).name || '魔物';
    if (!open.length) { const r = REGIONS[rks[0]]; if (r && r.needs) notes.push(`🎪 活動「${ev.title || '活動'}」要打${name}，先打倒${REGIONS[r.needs].name} ★5 喔`); return; }
    const rk = open[open.length - 1], min = Math.max(1, ev.minStar || 1), top = Math.min(5, ((nw.zone || {})[rk] || 0) + 1);
    if (min > top) notes.push(`🎪 活動「${ev.title || '活動'}」要打 ★${min} 的${name}，先把${REGIONS[rk].name}打到 ★${min - 1} 喔`);
  });
  return { cards, locks, notes, cleared: F.cleared, goals: ctx.goals };
}
