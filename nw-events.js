/* 活動（學生端，docs/SPEC-TEACHER-ADMIN.md §4）。
   上半是純函式（不碰畫面、不碰 Firebase，可以在 node 直接 import 測）；
   下半 createEvents() 接 Firestore，給 newworld.js 與之後的佈告欄用。

   mg_events/{ID} 文件欄位（ID 只能用英數、底線、連字號，因為會變成欄位路徑 nw.ev.{ID}.s）：
     type      'boost' | 'hunt' | 'classwar' | 'ranking'
     title、desc、startAt、endAt（毫秒）、cls（班級陣列，空＝全校）
     boost：mul（倍數）、what（'exp' 獵人經驗｜'coins' 字元）
     hunt：mk、minStar、goal、items（獎勵，格式同信箱的 items）
     classwar：per、goalPct、mk、minStar、items、clsSize（{班級: 人數}，教師手動覆寫分母）
     ranking：metric（improve｜kills｜fastest｜acc）、mk、minStar、minRuns
   學生個人進度：NW.ev[ID] = { e, t, n, done, cw, s, base, best, runs, accSum, gone }
     e＝活動結束時間（活動文件被刪了也能判斷何時清掉）、t＝標題（取消提示用）。 */
import { MONSTERS, EVENT_DEFAULTS, NICK_EMPTY, clsShort, twDay } from './nw-data.js';

export const GRACE_MS = 5 * 60 * 1000;        // 結束後 5 分鐘內打完的場次照算（SPEC §1.6）
export const WINDOW_MS = 7 * 86400000;        // 讀活動時多撈「剛結束」7 天
export const KEEP_MS = 30 * 86400000;         // NW.ev 結束超過 30 天就刪
export const CACHE_MS = 60 * 1000;
export const EV_TYPES = ['boost', 'hunt', 'classwar', 'ranking'];
export const RANK_METRICS = ['improve', 'kills', 'fastest', 'acc'];
export const BOARD_SIZE = 10;

export const toMs = v => !v ? 0 : typeof v === 'number' ? v : v.toMillis ? v.toMillis() : (v.seconds ? v.seconds * 1000 : 0);
const num = (v, d) => Number.isFinite(+v) && v !== '' && v !== null ? +v : d;

/* 壞資料（ID 不合法、不認得的 type、沒有結束時間）整份丟掉，不讓一份壞活動弄壞佈告欄 */
export function normalizeEvent(id, d) {
  if (!/^[A-Za-z0-9_-]{1,60}$/.test(id || '') || !d || typeof d !== 'object') return null;
  if (!EV_TYPES.includes(d.type)) return null;
  const endAt = toMs(d.endAt), startAt = toMs(d.startAt);
  if (!endAt) return null;
  const D = EVENT_DEFAULTS;
  const ev = {
    id, type: d.type, title: String(d.title || '活動'), desc: String(d.desc || ''), startAt, endAt,
    cls: Array.isArray(d.cls) ? d.cls.filter(x => typeof x === 'string') : [],
    items: Array.isArray(d.items) ? d.items.filter(x => x && typeof x === 'object') : [],
    mk: typeof d.mk === 'string' && d.mk ? d.mk : '', minStar: Math.max(1, num(d.minStar, 1)),
    result: d.result || null, awarded: !!d.awarded
  };
  if (ev.type === 'boost') { ev.mul = Math.min(5, Math.max(1, num(d.mul, D.boost.mul))); ev.what = d.what === 'coins' ? 'coins' : 'exp'; }
  if (ev.type === 'hunt') { if (!ev.mk) return null; ev.goal = Math.max(1, Math.round(num(d.goal, D.hunt.goal))); }
  if (ev.type === 'classwar') {
    ev.per = Math.max(1, Math.round(num(d.per, D.classwar.per)));
    ev.goalPct = Math.min(100, Math.max(1, num(d.goalPct, D.classwar.goalPct)));
    ev.clsSize = (d.clsSize && typeof d.clsSize === 'object') ? d.clsSize : {};
  }
  if (ev.type === 'ranking') {
    if (!RANK_METRICS.includes(d.metric)) return null;
    ev.metric = d.metric; ev.minRuns = Math.max(1, Math.round(num(d.minRuns, D.ranking.minRuns)));
    if (ev.metric === 'improve' && !ev.mk) return null;   // 進步獎一定要指定魔物，否則「自己的紀錄」沒有意思
  }
  return ev;
}

export const clsMatch = (ev, cls) => !ev.cls.length || ev.cls.includes(cls);
/* soon 快開始｜active 進行中｜ended 剛結束 */
export const phaseOf = (ev, t) => t < ev.startAt ? 'soon' : t <= ev.endAt ? 'active' : 'ended';

/* 一場（t0 開打、t1 打完）算不算在活動裡：開打時還沒結束、打完在結束後 5 分鐘內、打完時已經開始 */
export const runCounts = (ev, t0, t1) => t1 >= ev.startAt && t0 <= ev.endAt && t1 <= ev.endAt + GRACE_MS;
/* 是哪一種魔物／星級：只算打贏的（呼叫端已確認 valid） */
export const runMatches = (ev, run) => run.result === 'win' && (!ev.mk || run.mk === ev.mk) && run.star >= ev.minStar;

/* 時間文字（SPEC §4.5）：只講「還有幾天」，不倒數秒、不催促。最後一天寫「今天結束」。
   endAt 剛好是 0 點的話算前一天，所以減 1 毫秒。 */
export function timeText(ev, t) {
  const ph = phaseOf(ev, t);
  if (ph === 'ended') return '已結束';
  if (ph === 'soon') { const d = twDay(ev.startAt) - twDay(t); return d <= 0 ? '今天開始' : d === 1 ? '明天開始' : `${d} 天後開始`; }
  const d = twDay(ev.endAt - 1) - twDay(t);
  return d <= 0 ? '今天結束' : `還有 ${d} 天`;
}

/* 加倍活動：同一種獎勵只取最大的倍數，不疊加。回傳 { exp, coins, text } */
export function boostFor(events, cls, t0, t1) {
  const out = { exp: 1, coins: 1, text: '' };
  events.forEach(ev => {
    if (ev.type !== 'boost' || !clsMatch(ev, cls) || !runCounts(ev, t0, t1)) return;
    if (ev.mul > out[ev.what]) out[ev.what] = ev.mul;
  });
  const parts = [];
  if (out.exp > 1) parts.push(`×${out.exp}（獵人經驗）`);
  if (out.coins > 1) parts.push(`×${out.coins}（字元）`);
  out.text = parts.length ? `🎪 活動加倍 ${parts.join('、')}` : '';
  return out;
}

/* 一場打贏之後，更新自己在這個活動的進度（不改傳進來的物件）。
   回傳 { st, hit, reached }：reached＝這一場剛好達標（hunt 的 goal、classwar 的 per），只會為真一次。
   prevBest＝這隻魔物這個星級活動前自己的最快秒數（進步獎的 base），沒有就傳 undefined。 */
export function applyRun(ev, st0, run, prevBest) {
  const st = Object.assign({ n: 0 }, st0, { e: ev.endAt, t: ev.title });
  if (!runMatches(ev, run)) return { st, hit: false, reached: false };
  const n0 = st.n; st.n = n0 + 1;
  let reached = false;
  if (ev.type === 'hunt') { if (!st.done && st.n >= ev.goal) { reached = true; } }
  else if (ev.type === 'classwar') { reached = n0 < ev.per && st.n >= ev.per; }
  else if (ev.type === 'ranking') {
    const secs = Math.round(run.secs * 10) / 10;
    st.runs = st.n;
    if (ev.metric === 'kills') st.s = st.n;
    else if (ev.metric === 'fastest') { st.best = Math.min(num(st.best, Infinity), secs); st.s = st.best; }
    else if (ev.metric === 'improve') {
      if (!(st.base > 0)) st.base = prevBest > 0 ? prevBest : secs;
      st.best = Math.min(num(st.best, Infinity), secs);
      /* 要打 2 場以上才有分數：只打 1 場，進步無從比起 */
      if (st.n >= 2) st.s = Math.max(0, Math.round((st.base - st.best) / st.base * 100));
    } else if (ev.metric === 'acc') {
      st.accSum = num(st.accSum, 0) + run.accuracy * 100;
      if (st.n >= ev.minRuns) st.s = Math.round(st.accSum / st.n);
    }
  }
  return { st, hit: true, reached };
}

export const scoreText = (ev, s) => !Number.isFinite(s) ? '' : ev.metric === 'improve' ? `進步 ${s}%` : ev.metric === 'kills' ? `${s} 隻` : ev.metric === 'fastest' ? `${s} 秒` : `${s}%`;
export const sortDir = ev => ev.metric === 'fastest' ? 'asc' : 'desc';
const better = (ev, a, b) => sortDir(ev) === 'asc' ? a < b : a > b;

/* 自己不在榜上時，只說「差多少」，不說第幾名。last＝第 10 名的分數。
   要嚴格比第 10 名好才算上榜（同分的順序不確定，不能保證）。 */
export function gapText(ev, st, last) {
  const s = st && Number.isFinite(st.s) ? st.s : null;
  if (s === null) {
    const need = ev.metric === 'improve' ? 2 - ((st && st.n) || 0) : ev.metric === 'acc' ? ev.minRuns - ((st && st.n) || 0) : 1;
    if (ev.metric === 'kills' || ev.metric === 'fastest') return '打倒一隻就有分數';
    return `再打 ${Math.max(1, need)} 場就有分數`;
  }
  if (last === null || last === undefined) return '';
  if (ev.metric === 'kills') return `再打 ${Math.max(1, last - s + 1)} 隻就上榜`;
  if (ev.metric === 'acc') return `再準 ${Math.max(1, last - s + 1)}% 就上榜`;
  if (ev.metric === 'fastest') return `再快 ${Math.max(1, Math.ceil(s - last + 0.1 - 1e-9))} 秒就上榜`;
  /* improve：要多進步到「第 10 名 + 0.5%」（進位後才會比第 10 名高），換算成還要再快幾秒 */
  const needBest = st.base * (1 - (last + 0.5) / 100);
  if (!(needBest > 0) || !(st.best > 0)) return '再多練幾場就上榜';
  return `再快 ${Math.max(1, Math.ceil(st.best - needBest - 1e-9))} 秒就上榜`;
}

/* 把雲端前 10 名與自己的本機分數合起來。自己的本機分數可能比雲端新（800ms 後才存），
   所以自己有分數而且夠好，就算在榜上。 */
export function composeBoard(ev, cloudRows, mine, myId) {
  const rows = cloudRows.map(r => Object.assign({}, r, { mine: r.id === myId }));
  const mineHas = mine && Number.isFinite(mine.s);
  const idx = rows.findIndex(r => r.mine);
  if (idx >= 0 && mineHas) rows[idx].s = mine.s;
  const lastRow = rows.length >= BOARD_SIZE ? rows[rows.length - 1] : null;
  if (idx < 0 && mineHas && (!lastRow || better(ev, mine.s, lastRow.s))) rows.push({ id: myId, s: mine.s, mine: true, _me: true });
  if (idx >= 0 || mineHas) rows.sort((a, b) => a.s === b.s ? 0 : (better(ev, a.s, b.s) ? -1 : 1));
  const top = rows.slice(0, BOARD_SIZE);
  const inTop = top.some(r => r.mine);
  const last = top.length >= BOARD_SIZE ? top[top.length - 1].s : null;
  return { rows: top, inTop, last, text: inTop ? '' : gapText(ev, mine, last) };
}

/* 全班獎：分子、分母都來自 count 查詢（或老師填的 clsSize）。全班達標率到 goalPct 才算 */
export const pctOf = (count, size) => size > 0 ? Math.min(100, Math.round(count / size * 100)) : 0;
export const classReached = (ev, count, size) => size > 0 && count / size * 100 >= ev.goalPct;

/* 同年級排名只列前 3、不列最後一名；自己不在前 3 就只回自己的進度（不回名次）。
   list＝[{cls, pct}]（人數為 0 的班不放進來） */
export function gradeTop(list, myCls) {
  const sorted = list.slice().sort((a, b) => b.pct - a.pct || (a.cls < b.cls ? -1 : 1));
  const shown = Math.min(3, Math.max(0, sorted.length - 1));
  const top = sorted.slice(0, shown).map(x => ({ cls: clsShort(x.cls), pct: x.pct, mine: x.cls === myCls }));
  return top;
}

const gradeOf = cls => { const m = /^(.+?年級)/.exec(cls || ''); return m ? m[1] : ''; };

/* ── 接 Firestore ──
   h = { now(), me(), nw(), save(), saveNow(), nickText(nw), grant(items) → gift 陣列或 null（有不認得的東西）}；
   C 要有 classNames() → ['1班',…]（同年級各班的名單，活動沒指定班級時用） */
export function createEvents(C, h) {
  let cache = { at: 0, list: [], ok: false };
  let boards = {}, classes = {};
  const mine = () => h.me();
  const ev$ = () => { const nw = h.nw(); return nw.ev || (nw.ev = {}); };
  const sameClass = e => clsMatch(e, mine().className);

  async function load(force) {
    if (!C.online()) return cache.list;
    if (!force && cache.at && Date.now() - cache.at < CACHE_MS) return cache.list;
    try {
      const snap = await C.withTimeout(C.getDocs(C.query(C.collection(C.db, 'mg_events'), C.where('endAt', '>=', h.now() - WINDOW_MS))), 6000, 'nw-events');
      const list = [];
      snap.forEach(d => { const e = normalizeEvent(d.id, d.data()); if (e) list.push(e); });
      cache = { at: Date.now(), list, ok: true };
    } catch (err) { console.warn('讀活動失敗', err); cache.ok = false; }
    return cache.list;
  }
  /* 自己班看得到的活動 */
  const visible = () => cache.list.filter(sameClass);
  const groups = () => {
    const t = h.now(), v = visible();
    return { active: v.filter(e => phaseOf(e, t) === 'active'), soon: v.filter(e => phaseOf(e, t) === 'soon'), ended: v.filter(e => phaseOf(e, t) === 'ended') };
  };
  const activeEvents = () => groups().active;
  const byId = id => cache.list.find(e => e.id === id) || null;

  /* 清 30 天前的紀錄；活動文件被刪了（讀成功、但自己有紀錄、而且紀錄的結束時間還在 7 天窗口內）→ 取消。
     讀失敗（斷線）時不能判斷取消。回傳這次剛發現取消的活動標題。 */
  function sweep() {
    const t = h.now(), E = ev$(), cancelled = [];
    let ch = false;
    Object.keys(E).forEach(id => {
      const st = E[id] || {};
      if (st.e && t - st.e > KEEP_MS) {
        delete E[id]; ch = true;
        h.nw().evDone = (h.nw().evDone || []).filter(x => !x.startsWith(id + '|'));
        return;
      }
      if (cache.ok && !byId(id) && st.e && st.e >= t - WINDOW_MS && !st.gone) { st.gone = 1; cancelled.push(st.t || '活動'); ch = true; }
    });
    if (ch) h.save();
    return cancelled;
  }

  /* 每場打完（只在 res.valid 時呼叫）。回傳 { boost, gifts }：boost 乘到這場經驗／字元，gifts 是剛達標領到的獎勵 */
  function onRun(res, prevBest, t0, t1) {
    const t = t1 || h.now(), s = t0 || t, cls = mine().className, E = ev$(), gifts = [];
    const evs = cache.list.filter(e => clsMatch(e, cls) && runCounts(e, s, t));
    const win = res.result === 'win';
    const boost = win ? boostFor(evs, cls, s, t) : { exp: 1, coins: 1, text: '' };
    if (win) evs.forEach(e => {
      if (e.type === 'boost' || E[e.id] && E[e.id].gone) return;
      const r = applyRun(e, E[e.id], res, prevBest);
      if (!r.hit) return;
      E[e.id] = r.st;
      if (!r.reached) return;
      if (e.type === 'classwar') {
        const key = e.id + '|' + cls, nw = h.nw();
        if (!nw.evDone.includes(key)) nw.evDone.push(key);
      } else if (e.type === 'hunt') {
        const g = h.grant(e.items);
        if (g) { E[e.id].done = 1; g.forEach(x => gifts.push(Object.assign({}, x, { note: `「${e.title}」達標！${x.note || ''}` }))); }
      }
    });
    return { boost, gifts };
  }

  /* 學生自己的進度，給佈告欄顯示 */
  function eventProgress(e) {
    const st = ev$()[e.id] || {};
    const n = st.n || 0;
    const out = { n, done: !!st.done, cw: !!st.cw, s: Number.isFinite(st.s) ? st.s : null, joined: n > 0 };
    if (e.type === 'hunt') { out.goal = e.goal; out.text = st.done ? '已達標' : `${Math.min(n, e.goal)} / ${e.goal} 隻`; }
    else if (e.type === 'classwar') { out.goal = e.per; out.mineReached = n >= e.per; out.text = `你打倒了 ${Math.min(n, e.per)} / ${e.per} 隻`; }
    else if (e.type === 'ranking') out.text = out.s !== null ? scoreText(e, out.s) : (n ? '還沒有分數' : '還沒參加');
    else out.text = '';
    return out;
  }

  /* 班級進度：自己班的達標率＋同年級前 3（不列最後一名、自己不在前 3 就不給名次）。60 秒快取 */
  async function classProgress(e, force) {
    const c = classes[e.id];
    if (!force && c && Date.now() - c.at < CACHE_MS) return c.v;
    const cls = mine().className, grade = gradeOf(cls);
    const count = async cn => (await C.withTimeout(C.getCountFromServer(C.query(C.collection(C.db, 'mg_scores'), C.where('nwEvDone', 'array-contains', e.id + '|' + cn))), 6000, 'nw-ev-n')).data().count;
    const size = async cn => e.clsSize[cn] > 0 ? +e.clsSize[cn] : (await C.withTimeout(C.getCountFromServer(C.query(C.collection(C.db, 'mg_scores'), C.where('nwCls', '==', cn))), 6000, 'nw-ev-d')).data().count;
    const names = new Set([cls]);
    const pool = e.cls.length ? e.cls.filter(x => gradeOf(x) === grade) : (C.classNames ? C.classNames() : []).map(x => grade + x);
    pool.forEach(x => names.add(x));
    const per = {};
    await Promise.all([...names].map(async cn => { const [a, b] = await Promise.all([count(cn), size(cn)]); per[cn] = { count: a, size: b }; }));
    const me = per[cls];
    const list = [...names].filter(cn => per[cn].size > 0).map(cn => ({ cls: cn, pct: pctOf(per[cn].count, per[cn].size) }));
    const v = { count: me.count, size: me.size, pct: pctOf(me.count, me.size), goalPct: e.goalPct, reached: classReached(e, me.count, me.size), top: gradeTop(list, cls) };
    classes[e.id] = { at: Date.now(), v };
    return v;
  }

  /* 全班獎：進村、開佈告欄時檢查。達標率到了、自己至少打倒過 1 隻、還沒領 → 領（固定鍵 cw，只領一次）。
     不在乎活動結束了沒：結束後 7 天內進來也領得到。回傳要顯示的 gift。 */
  async function claimClassWar() {
    const gifts = [], E = ev$();
    for (const e of visible().filter(x => x.type === 'classwar' && phaseOf(x, h.now()) !== 'soon')) {
      const st = E[e.id];
      if (!st || st.cw || !(st.n >= 1) || st.gone) continue;
      let p; try { p = await classProgress(e); } catch (err) { console.warn('讀班級進度失敗', err); continue; }
      if (!p.reached) continue;
      const g = h.grant(e.items);
      if (!g) continue;
      st.cw = 1;
      g.forEach(x => gifts.push(Object.assign({}, x, { note: `「${e.title}」全班達標！${x.note || ''}` })));
      await h.saveNow();
    }
    return gifts;
  }

  /* 活動排行榜：前 10 名＋自己。顯示「班級短碼・座號・暱稱」，不帶真名；被老師隱藏暱稱的顯示「神秘獵人」。
     暱稱隱藏要讀 mg_bugboard：一次用 in 查這 10 個人，不用一個一個讀。 */
  async function eventBoard(e, force) {
    const c = boards[e.id];
    if (!force && c && Date.now() - c.at < CACHE_MS) return c.v;
    const field = `nw.ev.${e.id}.s`;
    const snap = await C.withTimeout(C.getDocs(C.query(C.collection(C.db, 'mg_scores'), C.orderBy(field, sortDir(e)), C.limit(BOARD_SIZE))), 6000, 'nw-ev-board');
    const raw = [];
    snap.forEach(d => { const x = d.data() || {}; const st = x.nw && x.nw.ev && x.nw.ev[e.id]; if (st && Number.isFinite(st.s)) raw.push({ id: d.id, className: x.className || '', seat: x.seat, nick: x.nwNick || '', s: st.s }); });
    const hidden = new Set();
    if (raw.length) {
      try {
        const bs = await C.withTimeout(C.getDocs(C.query(C.collection(C.db, 'mg_bugboard'), C.where(C.documentId(), 'in', raw.map(r => r.id)))), 6000, 'nw-ev-hide');
        bs.forEach(d => { if ((d.data() || {}).hideNick) hidden.add(d.id); });
      } catch (err) { console.warn('讀暱稱隱藏失敗，先一律顯示神秘獵人', err); raw.forEach(r => hidden.add(r.id)); }
    }
    const myId = mine().docId, nw = h.nw();
    const rows = raw.map(r => ({ id: r.id, cls: clsShort(r.className), seat: r.seat, nick: (hidden.has(r.id) || !r.nick) ? NICK_EMPTY : r.nick, s: r.s }));
    const st = ev$()[e.id] || null;
    const comp = composeBoard(e, rows, st, myId);
    comp.rows.forEach(r => {
      if (r._me) { r.cls = clsShort(mine().className); r.seat = mine().seat; r.nick = hidden.has(myId) ? NICK_EMPTY : (h.nickText(nw)); delete r._me; }
      r.text = scoreText(e, r.s);
      r.label = `${r.cls}・${r.seat}號・${r.nick}`;
    });
    const v = { ev: e, rows: comp.rows, inTop: comp.inTop, text: comp.text, mine: st ? { s: Number.isFinite(st.s) ? st.s : null, n: st.n || 0 } : { s: null, n: 0 } };
    boards[e.id] = { at: Date.now(), v };
    return v;
  }

  return { load, visible, groups, activeEvents, byId, sweep, onRun, eventProgress, classProgress, claimClassWar, eventBoard, timeText: e => timeText(e, h.now()), list: () => cache.list, ok: () => cache.ok };
}
