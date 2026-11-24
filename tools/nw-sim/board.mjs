/* 委託板「一次 4 張、打完才補」的規則（docs/SPEC-BOARD-ROTATION.md）：參考實作＋自我檢查＋一學期模擬。
   這支只讀 nw-data.js，不改遊戲程式；遊戲端照規格 §1～§5 把 pickBoard 等函式搬進 nw-data.js 時，以這份為對照。

   用法：
     node tools/nw-sim/board.mjs                 自我檢查＋一學期模擬（4 種速度×3 種打法×2 種看板，每組 300 人，約 45 秒）
     node tools/nw-sim/board.mjs --n 1000        每組人數
     node tools/nw-sim/board.mjs --tlim 300      用現在上線的「5 分鐘時間到就輸」估勝率（預設 480＝V2 的 8 分鐘逃走）
     node tools/nw-sim/board.mjs --n 1 --real    另外用 data-public 的真實速度（284 人，每人 1 次）跑一次
     node tools/nw-sim/board.mjs --show          印一位中速、愛衝的學生前 3 節每次打開看板的樣子

   戰鬥模型（只用來排「會贏嗎」，不是平衡用）：打完秒數 t＝標準時間 STD_SECS ×(11/v)^1.1 ×e^(0.2·N(0,1))，
   t＞上限就沒贏；炎牙狼 ★3 以上打越久越容易倒下 3 次（250 秒以上，最多 35%）。用 SPEC-BALANCE-V2 §4.2 的表對過，誤差約 ±10pp（輸出最前面有對照）。 */
import { readFileSync } from 'node:fs';
import { REGIONS, MAIN_QUESTS, boardQuests, stdSecs, defaultNw, normalizeNw } from '../../nw-data.js';

/* ───────── 規格 §1 的常數 ───────── */
export const BOARD = {
  keys: ['a', 'b', 'c', 'd', 'e'],      // a 目標／剛好、b 挑戰、c 剛好、d 輕鬆、e 第二個目標（平常空著）
  hardP: 0.55,                          // 挑戰單：預估勝率至少這麼多（沒有一隻達到就放那一星最好打的）
  midP: 0.80,                           // 剛好單：預估勝率至少這麼多
  phi0: 1.3,                            // 沒有任何打贏紀錄時，假設比中位慢 30%（保守）
  best2typ: 1.15,                       // 「最快」比平常快約 15%（校準報告 §2.4）
  sig: 0.25,                            // 預估的不確定（場與場 0.2 加上估計誤差）
  loseSoft: 2,                          // 挑戰單連續 2 次沒贏 → 換成那一星最好打的
  recentN: 3,                           // 記最近幾張打贏的單子（避免馬上又出現）
  easyAge: 4                            // 輕鬆單最多比你打過的最高星低 4 星（草原 ★1 不會在森林 ★3 時還掛著）
};

const ORDER = Object.keys(REGIONS).filter(k => !REGIONS[k].wip);
export const Eof = (rk, star) => ORDER.indexOf(rk) * 5 + star;
export const parseId = id => { const [rk, mk, s] = String(id || '').split(':'); return { id, rk, mk, star: +s }; };
const ID_RE = /^[a-z]+:[a-z]+:[1-5]$/;

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
export const dayOf = now => Math.floor((now + 8 * 3600e3) / 86400e3);   // 跟 nw-data.js 的 twDay 同一個算法（台灣時間）

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
  if (!bad.length) return { board: nw.board, changed: [], why: 'same' };
  const r = repair(nw, nw.board, now, events, tlim, 0, bad);
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

/* 存檔整理（normalizeNw 用）：格式不對就丟掉，下次打開看板重排；五個鍵一定都在（merge 存檔刪不掉鍵） */
export function normalizeBoard(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d) || d.v !== 1) return null;
  const int = x => (Number.isFinite(+x) ? Math.max(0, Math.floor(+x)) : 0);
  const o = { v: 1, seed: int(d.seed) >>> 0, day: int(d.day), n: int(d.n), done: int(d.done), swap: int(d.swap), lose: Math.min(9, int(d.lose)),
    last: ID_RE.test(d.last) ? d.last : '', recent: Array.isArray(d.recent) ? d.recent.filter(x => ID_RE.test(x)).slice(0, BOARD.recentN) : [],
    out: ID_RE.test(d.out) ? d.out : '', slots: {} };
  const seen = [];
  BOARD.keys.forEach(k => {
    const s = d.slots && d.slots[k], id = s && ID_RE.test(s.id) && !seen.includes(s.id) ? s.id : '';
    if (id) seen.push(id);
    o.slots[k] = id ? { id, k: typeof s.k === 'string' ? s.k.slice(0, 8) : '', at: int(s.at), m: Math.min(99, int(s.m)) } : emptySlot();
  });
  return o;
}

/* Firestore 不收：undefined、陣列裡的陣列 */
export function firestoreOk(x, inArr = false) {
  if (x === undefined) return false;
  if (Array.isArray(x)) return !inArr && x.every(v => firestoreOk(v, true));
  if (x && typeof x === 'object') return Object.values(x).every(v => firestoreOk(v, false));
  return typeof x !== 'number' || Number.isFinite(x);
}

/* ═════════ 以下是模擬 ═════════ */
const args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const N = +(opt('--n') || 300), TLIM = +(opt('--tlim') || 480);
const gauss = r => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const trueSecs = (q, v) => stdSecs(q.rk, q.mk, q.star) * Math.pow(11 / v, 1.1);
function fight(q, v, r, tlim) {
  const t = trueSecs(q, v) * Math.exp(0.2 * gauss(r));
  const ko = q.mk === 'wolf' && q.star >= 3 && r() < 0.35 * Math.max(0, Math.min(1, (t - 250) / 250));
  if (t <= tlim && !ko) return { win: true, secs: t };
  return { win: false, secs: ko ? Math.min(t, tlim) * 0.7 : tlim };
}

/* 事件（照教師頁常用的範本）：第 3～4 節 討伐咕咕鳥 ★1、第 6～7 節 班級挑戰 跳跳菇 ★2、第 9～10 節 炎牙狼 最快討伐 */
/* goal＝達標的隻數（達標以後遊戲端就不再把這個活動交給看板；排行榜沒有達標，一直都在） */
const EVENTS = [{ id: 'h1', mk: 'coo', minStar: 1, from: 3, to: 4, goal: 5 }, { id: 'c1', mk: 'shroom', minStar: 2, from: 6, to: 7, goal: 3 }, { id: 'r1', mk: 'wolf', minStar: 1, from: 9, to: 10 }];
const evAt = (L, got) => EVENTS.filter(e => L >= e.from && L <= e.to && !(e.goal && (got[e.id] || 0) >= e.goal));
const roleOf = (nw, id) => band(nw, parseId(id), frontier(nw, TLIM));

function chooseBoard(nw, board, style, lostLast, r, ctx) {
  const cards = BOARD.keys.map(k => board.slots[k]).filter(s => s.id).map(s => ({ id: s.id, role: roleOf(nw, s.id), goal: ctx.goals.some(g => g.id === s.id) }));
  const of = role => cards.filter(c => c.role === role);
  const any = l => l.length ? l[Math.floor(r() * l.length)] : null;
  if (style === 'push') return (cards.find(c => c.goal) || any(of('hard')) || any(of('mid')) || any(cards)).id;
  if (style === 'mix') { if (cards.some(c => c.goal) && r() < 0.5) return cards.find(c => c.goal).id; const x = r(); return (x < 0.6 && any(of('hard')) || x < 0.9 && any(of('mid')) || any(of('easy')) || any(cards)).id; }
  const x = r();
  if (lostLast) return (any(of('mid')) || any(of('easy')) || any(cards)).id;
  return (x < 0.5 && any(of('hard')) || x < 0.9 && any(of('mid')) || any(of('easy')) || any(cards)).id;
}
/* 現行看板（全部列出）：同一個「愛衝／混著打／怕輸」的孩子會怎麼挑 */
function chooseAll(nw, style, lostLast, r, goals) {
  const cs = cands(nw), F = frontier(nw);
  const at = E => cs.filter(q => Eof(q.rk, q.star) === E);
  const any = l => l.length ? l[Math.floor(r() * l.length)] : null;
  const top = F.En ? at(F.En) : at(F.Ef), cur = at(Math.max(1, F.Ef));
  const goalQ = goals.find(g => g.why !== 'path');   // 現行看板只在星級剛好對上時才貼「任務目標」
  if (style === 'push') return (goalQ && cs.find(q => q.id === goalQ.id) || any(top)).id;
  if (style === 'mix') { if (goalQ && r() < 0.5) return goalQ.id; const x = r(); return (x < 0.6 && any(top) || x < 0.9 && any(cur) || any(cs)).id; }
  const x = r();
  if (lostLast) return (any(cur) || any(cs)).id;
  return (x < 0.5 && any(top) || x < 0.9 && any(cur) || any(cs)).id;
}

function questTick(nw) {   // 照 newworld.js 的 checkQuests：不是 soft 的沒做完就停
  for (const q of MAIN_QUESTS) {
    if (nw.quest.done.includes(q.id) || (q.hold && q.hold())) continue;
    if (!q.test(nw)) { if (q.soft) continue; break; }
    nw.quest.done.push(q.id);
  }
}

export function semester(v0, style, mode, seed, tlim = TLIM, trace = null) {
  const r = mulberry(seed), nw = normalizeNw(defaultNw());
  nw.starter = 'staff'; nw.tut = { dodge: 1, defend: 1, attack: 1 }; questTick(nw);
  const st = { games: 0, wins: 0, hardSeen: 0, cardsSeen: 0, views: 0, viewsNoMid: 0, viewsHard2: 0, questMiss: 0, questOpen: 0, evMiss: 0, evOpen: 0,
    hardPlays: 0, hardWins: 0, sameMkRefill: 0, refills: 0, playedIds: new Set(), maxRun: 0, reach5: null, reach10: null, clearedViews: 0, viewsEmpty: 0, swaps: 0, lessonsCleared: 0, forestViews: 0, wolfViews: 0 };
  let lostLast = false, run = 0, prevId = '';
  const evGot = {};
  for (let L = 1; L <= 14; L++) {
    const v = v0 * (1 + 0.15 * (L - 1) / 13), now = Date.UTC(2026, 8, 1) + (L - 1) * 7 * 86400e3;
    let evs = evAt(L, evGot);
    let t = 900;
    if (mode === 'board') { const e = ensureBoard(nw, now, evs, tlim, hash32('seed' + seed)); nw.board = e.board; }
    while (true) {
      const ctx = ctxOf(nw, nw.board || {}, now, evs, tlim);
      /* 檢查：主線與活動的單子在不在（只有在那顆星已經開放時才要求） */
      const mq = ctx.goals.find(g => g.kind === 'quest'), onBoard = id => mode === 'all' ? cands(nw).some(q => q.id === id) : BOARD.keys.some(k => nw.board.slots[k].id === id);
      const has = g => mode === 'all' ? cands(nw).some(q => g.match(q)) : BOARD.keys.some(k => nw.board.slots[k].id && g.match(parseId(nw.board.slots[k].id)));
      if (mq) { st.questOpen++; if (!has(mq)) st.questMiss++; }
      for (const g of ctx.goals.filter(g => g.kind === 'event')) { st.evOpen++; if (!has(g)) st.evMiss++; }
      let id;
      if (mode === 'board') {
        const ids = BOARD.keys.map(k => nw.board.slots[k].id).filter(Boolean), roles = ids.map(x => roleOf(nw, x));
        st.views++; st.cardsSeen += ids.length; st.hardSeen += roles.filter(x => x === 'hard').length;
        if (!roles.includes('mid') && !roles.includes('easy')) st.viewsNoMid++;
        if (roles.filter(x => x === 'hard').length > 1) st.viewsHard2++;
        if (ctx.F.cleared) st.clearedViews++;
        if (ids.some(x => x.startsWith('forest:'))) { st.forestViews++; if (ids.some(x => parseId(x).mk === 'wolf')) st.wolfViews++; }
        if (!ids.length) { st.viewsEmpty++; break; }
        if (trace) trace.push(`第${L}節 ${ids.map(x => `${x}(${({ hard: '🔥', mid: '🎯', easy: '🍃' })[roleOf(nw, x)]}${ctx.goals.some(g => g.id === x) ? '📌' : ''})`).join(' ')}`);
        /* 怕輸的孩子連輸 2 次會用掉「換一張」，換掉挑戰單 */
        if (style === 'safe' && lostLast && nw.board.swap !== dayOf(now)) { const k = BOARD.keys.find(k => roleOf(nw, nw.board.slots[k].id || 'x:x:1') === 'hard' && nw.board.slots[k].id); if (k) { const s = swapCard(nw, nw.board, k, now, evs, tlim); if (!s.refused) { nw.board = s.board; st.swaps++; } } }
        id = chooseBoard(nw, nw.board, style, lostLast, r, ctx);
      } else id = chooseAll(nw, style, lostLast, r, ctx.goals);
      const q = parseId(id), expect = Math.min(tlim, trueSecs(q, v));
      if (t < expect + 60) break;
      const wasHard = roleOf(nw, id) === 'hard';
      const res = fight(q, v, r, tlim);
      t -= res.secs + 180; st.games++; st.playedIds.add(id);
      nw.stat.dodgeOk += 2; nw.stat.defOk += 2;   // 1-3（閃避、防禦各 5 次）大約第 3 場做完
      run = id === prevId ? run + 1 : 1; prevId = id; st.maxRun = Math.max(st.maxRun, run);
      if (wasHard) { st.hardPlays++; if (res.win) st.hardWins++; }
      if (res.win) {
        st.wins++;
        nw.dex[q.mk] = (nw.dex[q.mk] || 0) + 1;
        if (q.star > (nw.zone[q.rk] || 0)) nw.zone[q.rk] = q.star;
        const fk = q.mk + ':' + q.star; if (!(nw.fastMk[fk] <= res.secs)) nw.fastMk[fk] = Math.round(res.secs * 10) / 10;
        const fz = q.rk + ':' + q.star; if (!(nw.fastest[fz] <= res.secs)) nw.fastest[fz] = res.secs;
        questTick(nw);
        EVENTS.forEach(e => { if (q.mk === e.mk && q.star >= e.minStar && L >= e.from && L <= e.to) evGot[e.id] = (evGot[e.id] || 0) + 1; });
      }
      lostLast = !res.win;
      evs = evAt(L, evGot);
      if (mode === 'board') {
        const a = afterRun(nw, nw.board, { id, win: res.win, valid: true, wasHard }, now, evs, tlim);
        if (res.win) { st.refills++; const k = BOARD.keys.find(k => nw.board.slots[k].id === id); const nid = k && a.board.slots[k].id; if (nid && parseId(nid).mk === q.mk) st.sameMkRefill++; }
        nw.board = a.board;
        if (!firestoreOk(nw.board)) throw new Error('board 不符合 Firestore 限制');
      }
      const F = frontier(nw);
      if (st.reach5 === null && F.Ef >= 5) st.reach5 = L;
      if (st.reach10 === null && F.Ef >= 10) st.reach10 = L;
    }
    if (frontier(nw).cleared) st.lessonsCleared++;
  }
  st.Ef = frontier(nw).Ef; st.played = st.playedIds.size; delete st.playedIds;
  return st;
}

/* ───────── 自我檢查 ───────── */
function selfTest() {
  const out = [], ok = (c, m) => { out.push((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
  const now = Date.UTC(2026, 10, 24, 2);
  const nw0 = normalizeNw(defaultNw());
  const b1 = pickBoard(nw0, now, 12345), b2 = pickBoard(nw0, now, 12345);
  ok(JSON.stringify(b1) === JSON.stringify(b2), '同一個種子、同一份進度 → 同一塊板子（決定性）');
  ok(firestoreOk(b1) && JSON.stringify(JSON.parse(JSON.stringify(b1))) === JSON.stringify(b1), '板子可以存進 Firestore（沒有 undefined、沒有陣列裡的陣列）');
  ok(BOARD.keys.every(k => b1.slots[k]), '五個欄位都在（e 平常是空的）');
  const ids0 = BOARD.keys.map(k => b1.slots[k].id).filter(Boolean);
  ok(ids0.length === 3 && ids0.every(id => /:1$/.test(id)), `全新存檔：草原 3 隻 ★1（${ids0.join('、')}）`);
  ok(ids0.includes('grass:frog:1'), '全新存檔：主線 1-1 泡泡蛙 ★1 一定在');
  /* 舊存檔：打到草原 ★3、沒有 board 欄位 */
  const old = normalizeNw({ zone: { grass: 3, forest: 0 }, dex: { frog: 2, coo: 2, shroom: 1 }, quest: { done: ['1-0', '1-0a', '1-1', '1-2', '1-3', '1-4'] }, starter: 'bow' });
  ok(old.board === undefined || old.board === null || typeof old.board === 'object', '舊存檔 normalizeNw 不會壞');
  const e = ensureBoard(old, now, [], 300, 99);
  const ids = BOARD.keys.map(k => e.board.slots[k].id).filter(Boolean), roles = ids.map(x => roleOf(old, x));
  ok(ids.length === 4 && roles.filter(x => x === 'hard').length === 1 && roles.includes('mid') && roles.includes('easy'), `舊存檔草原 ★3：4 張＝${ids.map((x, i) => x + '/' + roles[i]).join('、')}`);
  ok(ids.some(x => x.startsWith('grass:') && x.endsWith(':4')), '舊存檔草原 ★3：主線 1-7 的下一步（草原 ★4）在板上');
  /* 打贏撕單：只補那一格（＋最多 1 格不適合的） */
  const nw1 = JSON.parse(JSON.stringify(old)); nw1.board = e.board;
  const hk = BOARD.keys.find(k => roleOf(nw1, nw1.board.slots[k].id || 'x:x:1') === 'hard' && nw1.board.slots[k].id), hid = nw1.board.slots[hk].id;
  nw1.zone.grass = 4; nw1.dex[parseId(hid).mk]++;
  const a = afterRun(nw1, nw1.board, { id: hid, win: true, valid: true, wasHard: true }, now, [], 300);
  ok(a.changed.includes(hk) && a.changed.length <= 2 && a.board.done === 1, `打贏挑戰單 → 那一格補新的（換了 ${a.changed.join('、')}）`);
  ok(/:5$/.test(a.board.slots[hk].id) || BOARD.keys.some(k => /grass:\w+:5$/.test(a.board.slots[k].id)), '補上來的挑戰單是草原 ★5');
  const a2 = afterRun(nw1, a.board, { id: a.board.slots.c.id, win: false, valid: true, wasHard: false }, now, [], 300);
  ok(a2.changed.length === 0 && a2.board.slots.c.id === a.board.slots.c.id, '沒打贏（輸、逃走、撤退）→ 單子留著');
  const a3 = afterRun(nw1, a.board, { id: a.board.slots.c.id, win: true, valid: false }, now, [], 300);
  ok(a3.board === a.board, '不算數的場次（valid＝false）→ 什麼都不變');
  /* 換一張：一天一次、目標單不能換 */
  const s1 = swapCard(nw1, a.board, 'c', now, [], 300), s2 = swapCard(nw1, s1.board, 'd', now, [], 300);
  ok(!s1.refused && s2.refused, '「換一張」一天只能用 1 次');
  const gk = BOARD.keys.find(k => /^goal/.test(a.board.slots[k].k));
  ok(!gk || swapCard(nw1, a.board, gk, now + 86400e3, [], 300).refused, '目標單不能換');
  /* 換日整理：適合的留著 */
  const d1 = ensureBoard(Object.assign({}, nw1, { board: s1.board }), now + 7 * 86400e3, [], 300);
  ok(d1.changed.length <= 1, `隔週打開：進度沒變的話最多換 1 張（換了 ${d1.changed.length} 張）`);
  /* 活動指定的魔物要出現 */
  const ev = [{ id: 'x', mk: 'wolf', minStar: 1 }];
  const fz = normalizeNw({ zone: { grass: 5, forest: 2 }, dex: { frog: 3, coo: 4, shroom: 3 }, quest: { done: MAIN_QUESTS.map(q => q.id) } });
  const fb = pickBoard(fz, now, 7, ev, 480);
  ok(BOARD.keys.some(k => fb.slots[k].id.startsWith('forest:wolf:')), `活動指定炎牙狼 → 板上有炎牙狼（${BOARD.keys.map(k => fb.slots[k].id).filter(Boolean).join('、')}）`);
  ok(BOARD.keys.map(k => fb.slots[k].id).filter(x => x && roleOf(fz, x) === 'hard').length <= 1, '有活動時挑戰單還是最多 1 張');
  /* 雙分頁互蓋：兩邊各自打贏一張，merge 之後可能重複 → normalizeBoard 去掉重複 */
  const dup = JSON.parse(JSON.stringify(e.board)); dup.slots.d = Object.assign({}, dup.slots.c);
  const nb = normalizeBoard(dup), nIds = BOARD.keys.map(k => nb.slots[k].id).filter(Boolean);
  ok(new Set(nIds).size === nIds.length, '存檔裡重複的單子會被清掉（下次打開補回來）');
  ok(normalizeBoard({ v: 2 }) === null && normalizeBoard([1]) === null && normalizeBoard(null) === null, '看不懂的格式 → null（重排）');
  /* 全部打完 */
  const all = normalizeNw({ zone: { grass: 5, forest: 5 }, dex: { frog: 9, coo: 9, shroom: 9, wolf: 3 }, fastMk: { 'wolf:5': 200, 'coo:5': 120, 'shroom:5': 150 }, quest: { done: MAIN_QUESTS.map(q => q.id) } });
  const ab = pickBoard(all, now, 3, [], 480), aIds = BOARD.keys.map(k => ab.slots[k].id).filter(Boolean);
  ok(aIds.length === 4 && aIds.filter(x => roleOf(all, x) === 'hard').length <= 1, `全部打完：照樣有 4 張（${aIds.map(x => x + '/' + roleOf(all, x)).join('、')}）`);
  return out;
}

/* 模型對照 SPEC-BALANCE-V2 §4.2（無裝備、一般） */
function modelCheck() {
  const rows = [['grass:coo:1', [100, 100, 100, 100]], ['grass:shroom:3', [76, 100, 100, 100]], ['grass:coo:5', [70, 100, 100, 100]], ['grass:shroom:5', [39, 97, 100, 100]],
    ['forest:wolf:1', [24, 93, 100, 100]], ['forest:wolf:3', [5, 71, 100, 100]], ['forest:wolf:5', [0, 21, 98, 100]]];
  const vs = [4.5, 7, 11, 26], r = mulberry(5), lines = ['| 單子 | p10 模型／§4.2 | p25 | p50 | p90 |', '|---|---|---|---|---|'];
  for (const [id, ref] of rows) {
    const q = parseId(id);
    lines.push(`| ${id} | ` + vs.map((v, i) => { let w = 0; for (let k = 0; k < 4000; k++) if (fight(q, v, r, 480).win) w++; return `${Math.round(w / 40)}／${ref[i]}`; }).join(' | ') + ' |');
  }
  return lines;
}

function realSpeeds() {
  const d = JSON.parse(readFileSync(new URL('../../data-public/typehero-speed-20261120.json', import.meta.url)));
  return d.rows.map(x => x.bestWpm || x.lastWpm).filter(x => x > 0);
}

function table(personas, styles, tlim) {
  const lines = ['| 速度 | 打法 | 看板 | 到草原★5（中位節） | 到森林★5（中位節／比例） | 每節場數 | 挑戰單勝率 | 板上挑戰占比 | 沒有剛好／輕鬆的次數 | 2 張挑戰 | 主線不在板上 | 活動不在板上 | 補到同一隻 | 一學期打過幾種單子 | 同一張連打最多 | 森林開了以後板上有炎牙狼 |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|'];
  for (const [pname, vs] of personas) for (const style of styles) for (const mode of ['all', 'board']) {
    const runs = vs.map((v, i) => semester(v, style, mode, hash32(`${pname}|${style}|${i}`), tlim));
    const sum = k => runs.reduce((a, s) => a + s[k], 0), med = k => { const xs = runs.map(s => s[k] === null ? 99 : s[k]); const m = median(xs); return m >= 99 ? '—' : m; };
    const pct = (a, b) => b ? `${Math.round(100 * a / b)}%` : '—';
    lines.push(`| ${pname} | ${({ push: '愛衝', mix: '混著打', safe: '怕輸' })[style]} | ${mode === 'all' ? '現行（全部）' : '**4 張**'} | ${med('reach5')} | ${med('reach10')}／${pct(runs.filter(s => s.reach10).length, runs.length)} | ${(sum('games') / runs.length / 14).toFixed(1)} | ${mode === 'board' ? pct(sum('hardWins'), sum('hardPlays')) : '—'} | ${mode === 'board' ? pct(sum('hardSeen'), sum('cardsSeen')) : '—'} | ${mode === 'board' ? sum('viewsNoMid') : '—'} | ${mode === 'board' ? sum('viewsHard2') : '—'} | ${sum('questMiss')}/${sum('questOpen')} | ${sum('evMiss')}/${sum('evOpen')} | ${mode === 'board' ? pct(sum('sameMkRefill'), sum('refills')) : '—'} | ${(sum('played') / runs.length).toFixed(1)} | ${median(runs.map(s => s.maxRun))} | ${mode === 'board' ? pct(sum('wolfViews'), sum('forestViews')) : '100%'} |`.replace(/\| (\d+)\/(\d+) \|/g, '| $1/$2 |'));
  }
  return lines;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const t0 = Date.now();
  console.log('## 自我檢查'); selfTest().forEach(l => console.log(l));
  console.log('\n## 戰鬥模型對照（勝率 %，模型／SPEC-BALANCE-V2 §4.2）'); modelCheck().forEach(l => console.log(l));
  if (args.includes('--show')) { const tr = []; semester(11, 'push', 'board', 1, TLIM, tr); console.log('\n## 範例：中速（11 字/分）、愛衝'); tr.slice(0, 14).forEach(l => console.log(l)); }
  const P = [['p10（4.5）', 4.5], ['p25（7）', 7], ['p50（11）', 11], ['p90（26）', 26]].map(([n, v]) => [n, Array.from({ length: N }, () => v)]);
  console.log(`\n## 一學期（14 節×15 分鐘、每場外加 3 分鐘、速度學期內 +15%；上限 ${TLIM} 秒；每組 ${N} 人）`);
  table(P, ['push', 'mix', 'safe'], TLIM).forEach(l => console.log(l));
  if (args.includes('--real')) {
    const rs = realSpeeds();
    console.log(`\n## 真實速度（data-public，${rs.length} 人，各打法）`);
    table([['真實名單', rs]], ['push', 'mix', 'safe'], TLIM).forEach(l => console.log(l));
  }
  console.log(`\n（${((Date.now() - t0) / 1000).toFixed(1)} 秒）`);
}
