/* 榮譽碑（2a）老師端彙總的 Firestore 讀寫：教師頁 tab-rank.js 與舊控制台 index.html 的背景更新共用同一份，
   兩邊的「讀哪些、怎麼寫」才不會分岔。純計算在 rank-calc.js，這裡只負責把資料讀進來、把結果寫出去。

   不 import fb.js：舊控制台（index.html）有自己載入的 Firebase，不能在那邊再多載一份教師頁的。
   所以呼叫的人把 db 與要用的 Firestore 函式傳進來：
     env = { db, fs: { collection, doc, getDoc, getDocs, query, where, orderBy, limit, writeBatch } }
   教師頁：db 與函式都從 fb.js 拿；舊控制台：adminDb（老師身分）與 index.html 已經 import 的那幾個。

   updateRank(env, { now, rebuild, onProgress, log }) 一步到位：
     讀 mg_nw_board_private 3 份 → where('ts','>', 游標) 分批讀 mg_nw_runs 新紀錄 → 讀名字（mg_scores、mg_bugboard.hideNick）
     → 讀 mg_nw_flags 裡 type 'run' 的審核結果（verdicts）→ updateBoards → 同一個 batch 寫 3 份榜單＋3 份私有狀態＋操作紀錄。
   now 用老師電腦的時間：只拿來切「這週／上週」與「先不上榜」的期限；紀錄本身的 ts 是伺服器時間。 */
import { updateBoards, cursorOf, tsMs, checkDoc, gradeOf, normalizeRun, GRADES } from './rank-calc.js';

export const READ_PAGE = 300;             // 一頁讀幾筆
export const READ_MAX_PAGES = 60;         // 最多 1.8 萬筆；超過下次再讀（游標會停在讀到的地方）
export const BG_GAP_MS = 30 * 60 * 1000;  // 舊控制台背景更新：距離上次超過 30 分鐘才跑
export const STALE_DAYS = 7;              // 總覽提醒：幾天沒更新

const isObj = o => !!o && typeof o === 'object' && !Array.isArray(o);

async function readGrades(env, col) {
  const { db, fs } = env, out = {};
  await Promise.all(GRADES.map(async g => {
    const s = await fs.getDoc(fs.doc(db, col, g));
    out[g] = s.exists() ? (s.data() || null) : null;
  }));
  return out;
}
export const readPrivate = env => readGrades(env, 'mg_nw_board_private');
export const readBoards = env => readGrades(env, 'mg_nw_board');

/* 學生讀的榜單上次更新（ms）；三份是同一個 batch 寫的，取最小的那份 */
export const lastUpdate = boards => {
  const ts = GRADES.map(g => (boards && isObj(boards[g]) && Number.isFinite(boards[g].t) ? boards[g].t : 0));
  return Math.min(...ts);
};

/* 讀 ts 比 since 新的場次紀錄。一頁讀滿就從「最後一筆 ts 往前 1 毫秒」再讀下一頁，用文件 ID 去重：
   伺服器時間同一毫秒的兩筆剛好卡在頁界，也不會漏。 */
export async function readRuns(env, since, { page = READ_PAGE, maxPages = READ_MAX_PAGES, onProgress } = {}) {
  const { db, fs } = env, runs = [], seen = new Set();
  let cur = Math.max(0, +since || 0), pages = 0, capped = false;
  for (;;) {
    const snap = await fs.getDocs(fs.query(fs.collection(db, 'mg_nw_runs'), fs.where('ts', '>', new Date(cur)), fs.orderBy('ts'), fs.limit(page)));
    let fresh = 0, last = cur;
    snap.docs.forEach(d => {
      const x = d.data() || {}, t = tsMs(x.ts);
      if (Number.isFinite(t) && t > last) last = t;
      if (seen.has(d.id)) return;
      seen.add(d.id); fresh++;
      runs.push(Object.assign({}, x, { _rid: d.id }));
    });
    pages++;
    if (onProgress) onProgress(runs.length);
    if (snap.docs.length < page) break;
    if (fresh === 0 || last <= cur) break;   // 同一毫秒寫了超過一頁：往前走不了，不要無限讀
    cur = last - 1;
    if (pages >= maxPages) { capped = true; break; }
  }
  return { runs, pages, capped };
}

/* 名字：mg_scores.name（登入名字）；hide：mg_bugboard.hideNick（榜上顯示「神秘獵人」） */
export async function readPeople(env) {
  const { db, fs } = env;
  const [sc, bb] = await Promise.all([fs.getDocs(fs.collection(db, 'mg_scores')), fs.getDocs(fs.collection(db, 'mg_bugboard'))]);
  const hide = {}, people = {};
  bb.forEach(d => { const x = d.data() || {}; if (x.hideNick) hide[d.id] = true; });
  sc.forEach(d => { const x = d.data() || {}; people[d.id] = { name: typeof x.name === 'string' ? x.name : '', hide: !!hide[d.id] }; });
  return people;
}

/* 老師對場次的審核（mg_nw_flags，type 'run'）。flag 文件 ID 是 run_{runId} */
export async function readRunFlags(env) {
  const { db, fs } = env, list = [];
  const snap = await fs.getDocs(fs.query(fs.collection(db, 'mg_nw_flags'), fs.where('type', '==', 'run')));
  snap.forEach(d => list.push(Object.assign({ id: d.id }, d.data() || {})));
  return list;
}
export const runIdOf = f => (typeof f.runId === 'string' && f.runId) || (typeof f.id === 'string' && f.id.startsWith('run_') ? f.id.slice(4) : '');
export function verdictsOf(flags) {
  const v = {};
  (flags || []).forEach(f => {
    const id = runIdOf(f);
    if (id && f.status === 'approved') v[id] = 1;
    else if (id && f.status === 'rejected') v[id] = -1;
  });
  return v;
}

/* 「從頭重算」：吸收過的紀錄全部丟掉重讀，但老師設定的「先不上榜」與 ▲ 用的上週名次要留著 */
export function rebuildBase(priv) {
  const out = {};
  GRADES.forEach(g => {
    const s = priv && isObj(priv[g]) && priv[g].v === 1 ? priv[g] : null;
    out[g] = { v: 1, g, cursor: 0, t: 0, week: s && Number.isFinite(s.week) ? s.week : null, students: {}, blocked: s && isObj(s.blocked) ? s.blocked : {}, prev: s ? s.prev || null : null, cur: s ? s.cur || null : null };
  });
  return out;
}

/* 這批紀錄裡有幾筆「以前沒吸收過」的（格式不對、會被略過的不算，不然壞資料落在游標往回退的 5 秒裡，每次都被算成新的）。游標往回退 5 秒，所以每次都會重讀最後幾筆，「讀了幾筆」不等於「新增幾筆」 */
export function countNew(priv, runs) {
  const have = new Set();
  GRADES.forEach(g => { const st = priv && isObj(priv[g]) ? priv[g].students : null; if (isObj(st)) Object.keys(st).forEach(id => (st[id].runs || []).forEach(e => have.add(`${id}_${e.t}`))); });
  return (runs || []).filter(r => !have.has(r && r._rid ? r._rid : `${r && r.id}_${r && r.t}`) && normalizeRun(r).ok).length;
}

/* 榜單上出現過的人（班級短碼|座號）：算「新上榜幾人」 */
export function boardPeople(boards) {
  const s = new Set(), add = x => { if (x && x.c !== undefined) s.add(`${x.c}|${x.s}`); };
  GRADES.forEach(g => {
    const b = boards && boards[g];
    if (!isObj(b)) return;
    (b.improve || []).forEach(add);
    Object.values(isObj(b.fast) ? b.fast : {}).forEach(l => (l || []).forEach(add));
    ((b.acc && b.acc.list) || []).forEach(add);
  });
  return s;
}

/* 操作紀錄文件，格式跟 teacher/util.js 的 log() 一樣；舊控制台沒有 util.js，所以這裡自己寫 */
export function putLog(env, batch, act, target, summary) {
  const id = `l_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  batch.set(env.fs.doc(env.db, 'mg_admin_log', id), { act, target: String(target || ''), summary: String(summary || '').slice(0, 300), t: Date.now() });
}

/* 寫 3 份榜單＋3 份私有狀態（同一個 batch）。寫之前再檢查一次：假資料庫不會擋巢狀陣列、undefined，真的 Firestore 會整批失敗。
   logFn(batch)：要一起寫的操作紀錄（可省略） */
export async function commitBoards(env, r, logFn) {
  const bad = [];
  GRADES.forEach(g => { bad.push(...checkDoc(r.boards[g]).map(x => `board/${g} ${x}`), ...checkDoc(r.states[g]).map(x => `private/${g} ${x}`)); });
  if (bad.length) throw new Error('榜單資料不能寫進 Firestore：' + bad.slice(0, 3).join('；'));
  const { db, fs } = env, b = fs.writeBatch(db);
  GRADES.forEach(g => {
    b.set(fs.doc(db, 'mg_nw_board', g), r.boards[g]);
    b.set(fs.doc(db, 'mg_nw_board_private', g), r.states[g]);
  });
  if (logFn) logFn(b);
  await b.commit();
}

/* 一步到位的更新。回 { r, priv, stats, flags, people }：r 是 updateBoards 的結果；priv 是這次寫出去的私有狀態；
   stats 比 r.stats 多 read（實際讀幾筆）、fresh（其中以前沒吸收過的）、pages、capped、newOnBoard（新上榜幾人）、t */
export async function updateRank(env, { now, rebuild, onProgress, log } = {}) {
  const t = Number.isFinite(now) ? now : Date.now();
  const [old, oldBoards] = await Promise.all([readPrivate(env), readBoards(env)]);
  const base = rebuild ? rebuildBase(old) : old;
  const rr = await readRuns(env, cursorOf(base), { onProgress });
  const [people, flags] = await Promise.all([readPeople(env), readRunFlags(env)]);
  const r = updateBoards(base, rr.runs, { now: t, people, verdicts: verdictsOf(flags) });
  const fresh = countNew(base, rr.runs);
  const before = boardPeople(oldBoards), after = boardPeople(r.boards);
  const newOnBoard = [...after].filter(k => !before.has(k)).length;
  const stats = Object.assign({}, r.stats, { read: rr.runs.length, fresh, pages: rr.pages, capped: rr.capped, newOnBoard, t, rebuild: !!rebuild });
  await commitBoards(env, r, log ? b => log(b, stats) : null);
  return { r, priv: r.states, stats, flags, people };
}

/* 舊控制台背景更新用：只讀 1 份看上次更新時間，離上次不到 gap 就不跑 */
export async function updateIfStale(env, { gap = BG_GAP_MS, now } = {}) {
  const t = Number.isFinite(now) ? now : Date.now();
  const s = await env.fs.getDoc(env.fs.doc(env.db, 'mg_nw_board', GRADES[0]));
  const last = s.exists() && s.data() && Number.isFinite(s.data().t) ? s.data().t : 0;
  if (last && t - last < gap) return null;
  return updateRank(env, {
    now: t,
    log: (b, st) => putLog(env, b, 'rank', 'auto', `舊控制台背景更新榜單：讀 ${st.read} 筆（新 ${st.fresh} 筆）、新上榜 ${st.newOnBoard} 人`)
  });
}

/* ── 教師頁用的小函式（純的，node 可以測）── */
/* 場次文件 ID「班級_座號_毫秒」→ { id: 班級_座號, t, g: 年級 } */
export function parseRid(rid) {
  const m = /^(.+_\d+號)_(\d+)$/.exec(typeof rid === 'string' ? rid : '');
  if (!m) return null;
  const cls = m[1].slice(0, m[1].lastIndexOf('_'));
  return { id: m[1], t: +m[2], g: gradeOf(cls) };
}
/* 私有狀態裡這一場的紀錄（沒有就 null）。待審核卡片要顯示速度、正確率，資料在這裡 */
export function entryOf(states, rid) {
  const p = parseRid(rid), st = p && p.g && states && states[p.g] && states[p.g].students && states[p.g].students[p.id];
  const e = st && Array.isArray(st.runs) ? st.runs.find(x => x.t === p.t) : null;
  return e ? { g: p.g, id: p.id, stu: st, e } : null;
}
/* 把一場從私有狀態拿掉（不改原物件）。撤銷「放行」「不採用」時要先拿掉、再從原始紀錄重新吸收，
   不然已經放行的場次不會被打回待審（rank-calc 的 ingest 故意不讓重複讀到的紀錄打回待審） */
export function dropEntry(priv, rid) {
  const p = parseRid(rid);
  if (!p || !p.g || !priv || !isObj(priv[p.g])) return priv;
  const st = JSON.parse(JSON.stringify(priv[p.g])), stu = st.students && st.students[p.id];
  if (stu && Array.isArray(stu.runs)) stu.runs = stu.runs.filter(x => x.t !== p.t);
  return Object.assign({}, priv, { [p.g]: st });
}

/* 總覽「榜單 N 天沒更新了」的 N：老師在 🏆 分頁可以改，存在這台電腦 */
export const staleDays = () => {
  try { const v = Math.floor(+localStorage.getItem('rank_stale_days')); return v >= 1 && v <= 60 ? v : STALE_DAYS; } catch (e) { return STALE_DAYS; }
};
export const setStaleDays = n => { try { localStorage.setItem('rank_stale_days', String(n)); } catch (e) { /* 無痕視窗：這次有效就好 */ } };
