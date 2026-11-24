/* 榮譽碑（2a）老師端彙總的純計算：不碰畫面、不碰 Firebase，node 可以直接 import 測（tools/browser-test/nw16.test.js）。
   規格：docs/SPEC-STAGE2.md §2（以 §10 為準）。寫給接著做 teacher/tab-rank.js 與學生端 nw-rank.js 的人，先讀這份檔頭。

   ── 一句話 ──
   「舊的私有狀態（3 份）＋新讀到的 mg_nw_runs ＋名字與判決」→「新的私有狀態（3 份）＋ 3 份學生讀的榜單」。
   榜單只算在老師端，學生端只讀 mg_nw_board/{年級} 一份。

   ── 資料流（tab-rank.js／舊控制台登入後背景更新照這個做）──
     const priv = { '4': 讀 mg_nw_board_private/4 的 data() 或 null, '5': …, '6': … };
     const snap = await getDocs(query(collection(db,'mg_nw_runs'), where('ts','>', Timestamp.fromMillis(cursorOf(priv))), orderBy('ts')));
     const runs = snap.docs.map(d => ({ ...d.data(), _rid: d.id }));        // _rid 是文件 ID，多一道檢查，可省略
     const r = updateBoards(priv, runs, { now: <伺服器時間 ms>, people, verdicts });
     // r.boards['5'] → setDoc(mg_nw_board/5)；r.states['5'] → setDoc(mg_nw_board_private/5)；兩份都要寫（同一個 batch）
     // r.review、r.view 只給教師頁看（有 id），絕對不要寫進 mg_nw_board
   第一次、或按「從頭重算」：priv 傳 {}（或 null），runs 傳整個學期的紀錄，結果跟一路增量算下來一樣（nw16 用隨機資料比對過）。

   ── 公開函式 ──
   updateBoards(priv, runs, opts) → { states, boards, view, review, stats }   一步到位＝ingest ＋ publish
   ingest(priv, runs, opts)       → { states, stats }                         只吸收新紀錄（不出榜單）
   publish(states, now)           → { states, boards, view, review }          只依狀態與時間出榜單（時間過了、沒有新紀錄也要重算：「最近兩週」會滑動）
   cursorOf(priv)                 → ms    下次查詢 where('ts','>', …) 的游標；任一份缺就回 0（＝從頭讀）
   setBlocked(priv, id, info|null, now?) → 新的 priv   「這個人先不上榜」：info＝{ until:ms（0＝沒有期限）, why:'理由（只有老師看得到）' }；null＝解除
   isBlocked(state, id, now)      → boolean
   normalizeRun(raw)              → { ok:true, run } | { ok:false, why }      一筆 mg_nw_runs 的檢查與正規化（見下面「為什麼被略過」）
   splitQ(flat)                   → [[字數,按鍵,毫秒,打對], …] | null          平的數字陣列每 4 個一題切回來；長度不是 4 的倍數、有負數／非數字回 null
   twWeek(ms)                     → 台灣時間（週一開始）的第幾週，跟 SPEC §2.7 同一條公式
   gradeOf(cls)                   → '4' | '5' | '6' | null
   checkDoc(obj) → string[]；safeDoc(obj) → 乾淨複本（有問題就 throw）      寫進 Firestore 之前的檢查：陣列裡的陣列、undefined、NaN
   常數：RANK（門檻與上限）、GRADES

   opts（都可省略）：
     now      伺服器時間（ms）。不要用電腦時間；用學生端 C.now() 同一套的校正，或 Date.now() ＋ 已知時差
     people   { [文件ID]: { name: 登入名字, hide: true|false } }   名字從 mg_scores.name，hide 從 mg_bugboard.hideNick；
              只更新狀態裡已經有的學生。沒給名字的人榜上顯示「神秘獵人」
     verdicts { [runId]: 1 | -1 }   老師的判決（runId＝文件 ID＝`${id}_${t}`）。1＝沒問題（放行待審）、-1＝不採計（移除）。
              從 mg_nw_flags（type 'run'，status approved／rejected）與 run 文件的 ok 欄位整理；
              只要老師按了就帶進來，已經吸收過的紀錄也會被更新（所以不用重讀舊的 run）。run 文件本身的 ok（1／-1）也算，verdicts 優先

   ── 規則（每一條都有測試）──
   合格場次：通過 normalizeRun；打贏或答 ≥ 3 題；正確率 ≥ RANK_MIN_ACC（0.9）；不在待審；沒被判不採計；這個人沒被先不上榜。
   待審（hold）：run 自己寫的 sus 非空，或老師這邊用 nw-data.js 的 susCheck 重算後非空，而且老師還沒放行（ok／verdicts 的 1）。
     重算用的 cpm 是從每題的 q 算出來的（打對字數 ÷ 各題毫秒加總 × 60），不信 run 寫的 cpm；jump 的歷史＝這個人同題目等級、時間更早、沒待審的最近 5 場。
   🌱 進步：同一個題目等級（qBand，用 nw-data.js 的 qBand(star, lv) 重算，不信 run 的 qb）內，
     「最近兩週」＝這週與上週（台灣時間週一～週日，用 ts）；「兩週以前」＝更早。兩邊各取 cpm 最好 3 場的平均，兩邊都至少 3 場才有分數。
     分數＝(近／舊 − 1) × 100，取到小數 1 位；要 ≥ 1 才上榜（下降、持平不顯示）。多個等級都有分數取最高的那個，榜上寫 qb。
     > 100%：先不上榜（review.improveHold）；> IMPROVE_SANE_MAX（60）：照樣上榜，標在 review.improveWarn。
   ⚡ 最快討伐：每個「魔物:星級」每人取最快的一場打贏（secs > 0），秒數小的在前。比 FASTEST_FLOOR 還快的標在 review.fastWarn（不擋）。
   🎯 神準名單：Lv ≥ 10 的合格場次，最近 10 場平均正確率 ≥ 97% 就在名單上，不排名次。at＝這一段連續達標是從哪一場開始（新的在前）。
   ▲／🆕：名次跟「上週最後一次更新」比。up > 0＝上升幾名、0＝不顯示（沒變、下降、第一次沒有上週資料）、-1＝新上榜（上週不在前 10）。下降永遠不顯示。
   同分：名次 r 一樣（1224 式）；排列時先拿到的在前（進步＝近兩週第 3 好那場比較早；最快＝那場比較早），再比文件 ID。名單只留前 10 列。

   ── mg_nw_board/{年級}（學生全都讀得到：不放 docId、uid、真名；只有「班級短碼・座號・登入名字」與分數）──
   {
     v: 1, g: '5', t: 更新時間 ms, week: 第幾週,
     improve: [ { c: '504', s: 5, n: '登入名字', v: 18.4, qb: '6:0', r: 1, up: 2 }, …最多 10 ],
     fast:    { 'coo:1': [ { c, s, n, v: 41.3, w: 'dagger', pw: 45, r, up }, …最多 10 ], … },   // 沒有人打贏的組合沒有這個 key
     acc:     { list: [ { c, s, n, at: ms }, …最多 20，新的在前 ], more: 名單上還有幾人 },
     cut:     { improve: 第 10 名的分數, 'fast:coo:1': 第 10 名的秒數 }    // 不到 10 人就沒有那個 key。同分的人名次一樣，但只有前 10 列，學生端「再快 N 就上榜」要比 cut 大一點
   }
   學生端找「自己」：用 c ＋ s（班級短碼＋座號）比對；n 是 hideNick 的人會是「神秘獵人」。qb 的字數＝題目長度：'4:x'＝★1～2、'6:x'＝★3～4、'8:x'＝★5。

   ── mg_nw_board_private/{年級}（只有老師）──
   {
     v: 1, g, cursor: 下次 where('ts','>') 用的 ms（已經往前退 RANK.overlapMs，靠「同一場重複吸收＝沒變」補上同毫秒的漏網），t, week,
     students: { [文件ID]: { c, s, n: 登入名字, hide: 0|1,
                 runs: [ { t, u, b, c, a, l, w, s, m, r, k, p, h?, y? }, …最多 RANK.keepRuns 場，舊的在前 ] } },
                 // t＝run.t（本機毫秒，跟文件 ID 後半一樣，同一人不會重複）、u＝ts 毫秒、b＝qBand、c＝cpm、a＝正確率、l＝魔物等級、w＝1 打贏、
                 // s＝秒數、m＝魔物、r＝星級、k＝武器、p＝戰力、h＝1 待審（y＝原因代碼）。這是「合格與否」的原料，不是結論
     blocked:  { [文件ID]: { until: ms|0, why } },
     prev: { imp: {文件ID: 名次}, fast: { 'coo:1': {文件ID: 名次} } } | null,   // 上週最後一次更新時的前 10 名，用來算 ▲
     cur:  同上格式                                                           // 最近一次更新的前 10 名；跨週後第一次更新才搬到 prev
   }
   整份是 Firestore 文件（上限 1 MB）：一人最多留 keepRuns 場、約 100 位學生一個年級大約 0.5 MB；stats.bytes 看大小，超過 900 KB 會寫進 stats.warn。

   ── review（教師頁用，有 id；不要寫進 mg_nw_board）以年級分：review['5'] ──
   { students, runs, held: [{id,c,s,rid,ts,mk,star,why:[代碼]}], improveWarn: [{id,qb,v}], improveHold: [{id,qb,v}],
     fastWarn: [{id,rid,mk,star,v,floor}], blocked: [{id,until,why}] }
   view['5'] ＝榜單檢視用（每列多 id、rid；improve 另有 rids＝最近兩週最好 3 場的 runId；最多 30 列）：
   { improve: […], fast: { 'coo:1': […] }, acc: [ {id,c,s,n,at} ] }

   ── stats ──
   { read: 讀進來幾筆, used: 吸收幾筆, skipped: [{rid,why}]（最多 50）, held: 新增待審幾筆, dropped: 被判不採計移除幾筆, released: 放行幾筆,
     cursor, bytes: {'4':…}, warn: [字串] }
   為什麼被略過（why）：shape 不是物件、ts 缺或不是時間、cls／seat／id 對不上、t、rid、mk 不是已知魔物、star、lv、secs、acc、數字欄位、
     q（不是平的數字陣列、長度不是 4 的倍數、有負數或打對 > 字數、超過 120 題）、grade（不是四～六年級）、invalid（沒打贏又答不到 3 題）。
     被略過的不會弄壞狀態，也不會讓游標停住。

   ── 跟規格不一樣的地方（也寫在 SPEC-STAGE2 §10）──
   1. 榜單文件的列沒有 id（規格範例有 id）：學生端用 c＋s 認自己，避免把 docId 放進全校讀得到的文件。
   2. 「最近兩週」＝這週＋上週（週一切換），不是從 now 往回數 14×24 小時：上課固定在一週的某一天，滾動視窗會在上課當天被時間點切掉一場。
   3. 進步分數取到 0.1％；要 ≥ 1％才上榜（不顯示「變快 0%」）。
   4. 同分名次相同，但名單只留前 10 列。
   5. 正確率取 min(run.acc, cor ÷ typ)，兩者都要 ≥ 90%（q 裡沒有「打了幾字」，只能這樣多擋一層）。 */
import { qBand, susCheck, clsShort, displayName, twDay, normName, RANK_MIN_ACC, SUS, SUS_WHY, FASTEST_FLOOR, IMPROVE_SANE_MAX, NICK_EMPTY, MONSTERS } from '../nw-data.js';

export const GRADES = ['4', '5', '6'];
export const RANK = {
  improveNeed: 3,        // 進步：兩邊各至少幾場，也是「最好幾場」的幾
  recentWeeks: 2,        // 「最近兩週」＝這週與上週
  improveMin: 1,         // 進步至少要 1％才上榜
  improveHold: 100,      // 超過這個％先不上榜（SPEC §2.2）
  listMax: 10,           // 榜單前幾名
  viewMax: 30,           // 教師頁榜單檢視最多列幾列
  accNeed: 10,           // 神準：最近幾場
  accMin: 0.97,          // 神準：平均正確率
  accLvMin: 10,          // 神準：魔物等級至少
  accListMax: 20,
  keepRuns: 40,          // 一人在私有狀態最多留幾場（舊的先丟），文件才不會超過 1 MB
  overlapMs: 5000,       // 游標往回退的毫秒：伺服器時間同一毫秒的兩筆，後到的可能被 where('ts','>') 漏掉
  nameMax: 20,
  bytesWarn: 900000
};
const STATE_V = 1, BOARD_V = 1;
const SCAN_MAX = 50;

const isNum = v => typeof v === 'number' && Number.isFinite(v);
const isInt = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
const clone = o => JSON.parse(JSON.stringify(o));
const round = (x, k) => Math.round(x * 10 ** k) / 10 ** k;
const cmpStr = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const isObj = o => !!o && typeof o === 'object' && !Array.isArray(o);

/* 週一開始的第幾週（台灣時間）。SPEC §2.7：floor((twDay + 3) / 7)；1970-01-01 是星期四，所以 +3 */
export const twWeek = ms => Math.floor((twDay(ms) + 3) / 7);

export function gradeOf(cls) {
  const m = /^([四五六4-6])年級[0-9]{1,2}班$/.exec(typeof cls === 'string' ? normName(cls) : '');
  return m ? ({ 四: '4', 五: '5', 六: '6' }[m[1]] || m[1]) : null;
}

/* Firestore Timestamp（toMillis）、{seconds}、Date、毫秒數都收；其他一律 NaN */
export function tsMs(v) {
  if (isNum(v)) return v;
  if (v && typeof v.toMillis === 'function') { const x = v.toMillis(); return isNum(x) ? x : NaN; }
  if (v instanceof Date) return v.getTime();
  if (isObj(v) && isNum(v.seconds)) return v.seconds * 1000 + (isNum(v.nanoseconds) ? Math.floor(v.nanoseconds / 1e6) : 0);
  return NaN;
}

export function splitQ(flat) {
  if (!Array.isArray(flat) || flat.length % 4 !== 0) return null;
  const out = [];
  for (let i = 0; i < flat.length; i += 4) {
    const x = [flat[i], flat[i + 1], flat[i + 2], flat[i + 3]];
    /* 打對的字不可能比題目字數多；負數、小數毫秒以外的怪值都不收 */
    if (!x.every(isNum) || x.some(n => n < 0) || x[3] > x[0]) return null;
    out.push(x);
  }
  return out;
}

export function normalizeRun(raw) {
  const bad = why => ({ ok: false, why });
  if (!isObj(raw)) return bad('shape');
  const ts = tsMs(raw.ts);
  if (!(ts > 0)) return bad('ts');
  const grade = gradeOf(raw.cls);
  if (!grade) return bad('grade');
  if (!isInt(raw.seat, 1, 99)) return bad('seat');
  const id = `${raw.cls}_${raw.seat}號`;
  if (raw.id !== id) return bad('id');
  if (!isInt(raw.t, 1, 1e14)) return bad('t');
  if (raw._rid !== undefined && raw._rid !== `${id}_${raw.t}`) return bad('rid');
  /* 公開榜單會出現 mk：只收真的魔物，不然學生可以用自己的字串開新榜 */
  if (typeof raw.mk !== 'string' || !Object.prototype.hasOwnProperty.call(MONSTERS, raw.mk)) return bad('mk');
  if (!isInt(raw.star, 1, 5)) return bad('star');
  if (!isNum(raw.lv) || raw.lv < 1 || raw.lv > 99) return bad('lv');
  if (!isNum(raw.secs) || raw.secs < 0 || raw.secs > 610) return bad('secs');   // 10 分鐘（600 秒）逃走的場次也要收，跟 firestore-rules.txt 的 secs 上限一致
  if (!isNum(raw.acc) || raw.acc < 0 || raw.acc > 1) return bad('acc');
  const nums = {};
  for (const k of ['ans', 'cor', 'typ', 'keys']) {
    const v = raw[k] === undefined && k === 'typ' ? 0 : raw[k];
    if (!isInt(v, 0, 99999)) return bad('num');
    nums[k] = v;
  }
  const qs = splitQ(raw.q);
  if (!qs || qs.length > SUS.qMax) return bad('q');
  const lv = Math.round(raw.lv), win = raw.res === 'win';
  if (!win && !(nums.ans >= 3)) return bad('invalid');
  const actMs = qs.reduce((a, x) => a + x[2], 0), corQ = qs.reduce((a, x) => a + x[3], 0);
  const cpm = actMs > 0 ? round(corQ / (actMs / 1000) * 60, 1) : 0;
  const acc = round(Math.min(raw.acc, nums.typ > 0 ? Math.min(1, nums.cor / nums.typ) : 1), 3);
  return {
    ok: true,
    run: {
      id, rid: `${id}_${raw.t}`, cls: raw.cls, seat: raw.seat, grade, c: clsShort(raw.cls), t: raw.t, ts,
      mk: raw.mk, star: raw.star, lv, qb: qBand(raw.star, lv), win, secs: round(raw.secs, 1), acc, cpm, qs,
      ans: nums.ans, cor: nums.cor, keys: nums.keys,
      sus: Array.isArray(raw.sus) ? raw.sus.filter(x => typeof x === 'string' && Object.prototype.hasOwnProperty.call(SUS_WHY, x)) : [],
      ok1: raw.ok === 1 ? 1 : raw.ok === -1 ? -1 : 0,
      w: typeof raw.w === 'string' && /^[a-z_]{1,24}$/.test(raw.w) ? raw.w : '',
      pw: isInt(raw.pw, 0, 99999) ? raw.pw : 0
    }
  };
}

/* ── 狀態 ── */
const emptyStudents = () => ({});
const validRanks = r => (isObj(r) && isObj(r.imp) && isObj(r.fast) ? r : null);
function normalizeState(doc, g, warn) {
  if (doc && (!isObj(doc) || doc.v !== STATE_V) && warn) warn.push(`mg_nw_board_private/${g} 的版本不認得，當作空的重算（請「從頭重算」）`);
  const d = isObj(doc) && doc.v === STATE_V ? clone(doc) : {};
  const students = isObj(d.students) ? d.students : emptyStudents();
  for (const id of Object.keys(students)) {
    const s = students[id];
    if (!isObj(s)) { delete students[id]; continue; }
    if (!Array.isArray(s.runs)) s.runs = [];
  }
  return {
    v: STATE_V, g, cursor: isNum(d.cursor) ? d.cursor : 0, t: isNum(d.t) ? d.t : 0, week: isNum(d.week) ? d.week : null,
    students, blocked: isObj(d.blocked) ? d.blocked : {}, prev: validRanks(d.prev), cur: validRanks(d.cur)
  };
}
export const cursorOf = priv => Math.min(...GRADES.map(g => (priv && isObj(priv[g]) && priv[g].v === STATE_V && isNum(priv[g].cursor) ? priv[g].cursor : 0)));

const gradeOfId = id => gradeOf(String(id).slice(0, String(id).lastIndexOf('_')));
export function isBlocked(state, id, now) {
  const b = state && state.blocked && state.blocked[id];
  return !!b && (!b.until || b.until > now);
}
export function setBlocked(priv, id, info, now) {
  const g = gradeOfId(id);
  if (!g) throw new Error('rank-calc: 不認得的文件 ID：' + id);
  const out = Object.assign({}, priv || {});
  const st = normalizeState(out[g], g);
  if (info) st.blocked[id] = { until: isNum(info.until) && info.until > 0 ? info.until : 0, why: String(info.why || '').slice(0, 100) };
  else delete st.blocked[id];
  out[g] = st;
  return out;
}

const entryCmp = (a, b) => a.u - b.u || a.t - b.t;
function parseRid(rid) {
  const i = typeof rid === 'string' ? rid.lastIndexOf('_') : -1;
  const t = i > 0 ? Number(rid.slice(i + 1)) : NaN;
  return isInt(t, 1, 1e14) ? { id: rid.slice(0, i), t } : null;
}

export function ingest(priv, rawRuns, opts = {}) {
  const warn = [];
  const states = {};
  GRADES.forEach(g => { states[g] = normalizeState(priv && priv[g], g, warn); });
  const stats = { read: 0, used: 0, skipped: [], held: 0, dropped: 0, released: 0, cursor: 0, bytes: {}, warn };
  const verdicts = isObj(opts.verdicts) ? opts.verdicts : {};
  const skip = (raw, why) => { if (stats.skipped.length < SCAN_MAX) stats.skipped.push({ rid: isObj(raw) ? `${raw.id}_${raw.t}` : String(raw), why }); };

  /* 1. 老師的判決先套用到已經吸收過的紀錄（它們不會再被 where('ts','>') 讀到） */
  for (const rid of Object.keys(verdicts)) {
    const p = parseRid(rid), g = p && gradeOfId(p.id), stu = g && states[g].students[p.id];
    if (!stu) continue;
    const i = stu.runs.findIndex(e => e.t === p.t);
    if (i < 0) continue;
    if (verdicts[rid] === -1) { stu.runs.splice(i, 1); stats.dropped++; }
    else if (verdicts[rid] === 1 && stu.runs[i].h) { delete stu.runs[i].h; delete stu.runs[i].y; stats.released++; }
  }

  /* 2. 新紀錄：照 ts 的順序吸收（jump 要看「更早的場次」，順序固定結果才會跟一次全算一樣） */
  const runs = Array.isArray(rawRuns) ? rawRuns : [];
  stats.read = runs.length;
  let maxTs = 0;
  const list = [];
  for (const raw of runs) {
    const t = isObj(raw) ? tsMs(raw.ts) : NaN;
    if (t > maxTs) maxTs = t;
    const n = normalizeRun(raw);
    if (!n.ok) skip(raw, n.why); else list.push(n.run);
  }
  list.sort((a, b) => a.ts - b.ts || a.t - b.t || cmpStr(a.id, b.id));
  for (const n of list) {
    const st = states[n.grade];
    const vd = verdicts[n.rid] === 1 || verdicts[n.rid] === -1 ? verdicts[n.rid] : n.ok1;
    const stu = st.students[n.id] || (st.students[n.id] = { c: n.c, s: n.seat, n: '', hide: 0, runs: [] });
    const at = stu.runs.findIndex(e => e.t === n.t);
    if (vd === -1) { if (at >= 0) { stu.runs.splice(at, 1); stats.dropped++; } continue; }
    const hist = stu.runs.filter(e => e.b === n.qb && e.t !== n.t && !e.h && e.c > 0 && entryCmp(e, { u: n.ts, t: n.t }) < 0).slice(-SUS.jumpNeed).map(e => e.c);
    const sus = [...new Set([...n.sus, ...susCheck({ cor: n.cor, keys: n.keys, ans: n.ans, secs: n.secs, cpm: n.cpm, q: n.qs }, hist)])];
    const held = sus.length > 0 && vd !== 1;
    const e = { t: n.t, u: n.ts, b: n.qb, c: n.cpm, a: n.acc, l: n.lv, w: n.win ? 1 : 0, s: n.secs, m: n.mk, r: n.star, k: n.w, p: n.pw };
    if (held) { e.h = 1; e.y = sus; }
    if (at >= 0) {
      /* 同一場重複讀到（游標往回退、重按更新）：沒變就不算，已經放行的不會被打回待審 */
      const old = stu.runs[at];
      if (!old.h && e.h) { delete e.h; delete e.y; }
      else if (old.h && !e.h) stats.released++;
      stu.runs[at] = e;
    } else { stu.runs.push(e); if (held) stats.held++; }
    stu.runs.sort(entryCmp);
    while (stu.runs.length > RANK.keepRuns) stu.runs.shift();
    stats.used++;
  }

  /* 3. 名字（只更新已經有的人） */
  if (isObj(opts.people)) {
    for (const g of GRADES) for (const id of Object.keys(states[g].students)) {
      const p = opts.people[id];
      if (isObj(p)) { states[g].students[id].n = typeof p.name === 'string' ? p.name : ''; states[g].students[id].hide = p.hide ? 1 : 0; }
    }
  }
  const cursor = Math.max(cursorOf(states), maxTs > 0 ? maxTs - RANK.overlapMs : 0);
  GRADES.forEach(g => { states[g].cursor = Math.max(states[g].cursor, cursor); });
  stats.cursor = cursorOf(states);
  return { states, stats };
}

/* ── 榜單 ── */
const pubName = stu => (stu.hide ? NICK_EMPTY : [...displayName(stu.n)].slice(0, RANK.nameMax).join(''));
/* 同分同名次（1224 式）；list 已經排好 */
function rankList(list, key) {
  let r = 0;
  return list.map((x, i) => { if (i === 0 || x[key] !== list[i - 1][key]) r = i + 1; return Object.assign(x, { r }); });
}
const best = (arr, n, dir) => arr.slice().sort((a, b) => dir * (a.c - b.c) || a.u - b.u || a.t - b.t).slice(0, n);

function lists(st, now) {
  const W = twWeek(now), recentFrom = W - (RANK.recentWeeks - 1);
  const improve = [], improveHold = [], accList = [], fast = {};
  for (const id of Object.keys(st.students).sort()) {
    const stu = st.students[id];
    if (isBlocked(st, id, now)) continue;
    const ok = stu.runs.filter(e => !e.h && e.a >= RANK_MIN_ACC);
    /* 進步 */
    const bands = {};
    ok.filter(e => e.c > 0).forEach(e => (bands[e.b] || (bands[e.b] = [])).push(e));
    let pick = null;
    for (const qb of Object.keys(bands).sort()) {
      const old = bands[qb].filter(e => twWeek(e.u) < recentFrom), rec = bands[qb].filter(e => twWeek(e.u) >= recentFrom);
      if (old.length < RANK.improveNeed || rec.length < RANK.improveNeed) continue;
      const o = best(old, RANK.improveNeed, -1), r = best(rec, RANK.improveNeed, -1);
      const avg = a => a.reduce((s, e) => s + e.c, 0) / a.length;
      const pct = (avg(r) / avg(o) - 1) * 100, v = round(pct, 1);
      if (!(v >= RANK.improveMin)) continue;
      const row = { id, qb, v, at: Math.max(...r.map(e => e.u)), rids: r.map(e => `${id}_${e.t}`) };
      if (v > RANK.improveHold) { improveHold.push(row); continue; }
      if (!pick || v > pick.v) pick = row;
    }
    if (pick) improve.push(pick);
    /* 最快討伐 */
    const bestBy = {};
    ok.filter(e => e.w && e.s > 0).forEach(e => { const k = `${e.m}:${e.r}`; if (!bestBy[k] || e.s < bestBy[k].s || (e.s === bestBy[k].s && entryCmp(e, bestBy[k]) < 0)) bestBy[k] = e; });
    for (const k of Object.keys(bestBy)) (fast[k] || (fast[k] = [])).push({ id, v: bestBy[k].s, at: bestBy[k].u, rid: `${id}_${bestBy[k].t}`, w: bestBy[k].k, pw: bestBy[k].p, mk: bestBy[k].m, star: bestBy[k].r });
    /* 神準名單：Lv10 以上最近 10 場；at＝目前這一段連續達標從哪一場開始 */
    const lvOk = ok.filter(e => e.l >= RANK.accLvMin);
    if (lvOk.length >= RANK.accNeed) {
      const good = lvOk.map((_, i) => i >= RANK.accNeed - 1 && lvOk.slice(i - RANK.accNeed + 1, i + 1).reduce((s, e) => s + e.a, 0) / RANK.accNeed >= RANK.accMin - 1e-9);
      if (good[good.length - 1]) {
        let j = good.length - 1;
        while (j > 0 && good[j - 1]) j--;
        accList.push({ id, at: lvOk[j].u });
      }
    }
  }
  const tie = (a, b) => a.at - b.at || cmpStr(a.id, b.id);
  improve.sort((a, b) => b.v - a.v || tie(a, b));
  improveHold.sort((a, b) => b.v - a.v || cmpStr(a.id, b.id));
  Object.values(fast).forEach(a => a.sort((a1, b1) => a1.v - b1.v || tie(a1, b1)));
  accList.sort((a, b) => b.at - a.at || cmpStr(a.id, b.id));
  rankList(improve, 'v');
  Object.values(fast).forEach(a => rankList(a, 'v'));
  return { improve, improveHold, fast, acc: accList };
}

/* 名次變化：prev＝上週最後一次更新的前 10 名。沒有上週資料（第一次）一律 0，不然第一版榜單每個人都是「新上榜」 */
const upOf = (prevMap, id, r) => (!prevMap ? 0 : prevMap[id] === undefined ? -1 : Math.max(0, prevMap[id] - r));

export function publish(states, now) {
  if (!isNum(now)) throw new Error('rank-calc: publish 需要 now（毫秒）');
  const W = twWeek(now), out = { states: {}, boards: {}, view: {}, review: {} };
  for (const g of GRADES) {
    const st = normalizeState(states && states[g], g);
    const L = lists(st, now), N = RANK.listMax;
    const prev = st.week !== null && W > st.week ? st.cur : st.prev;   // 跨週後第一次更新，才把上週最後的名次搬到 prev
    const person = id => { const s = st.students[id]; return { c: s.c, s: s.s, n: pubName(s) }; };
    const cur = { imp: {}, fast: {} };
    const imp = L.improve.map(x => Object.assign({ id: x.id }, person(x.id), { v: x.v, qb: x.qb, r: x.r, up: upOf(prev && prev.imp, x.id, x.r), rids: x.rids }));
    L.improve.slice(0, N).forEach(x => { cur.imp[x.id] = x.r; });
    const fastV = {}, fastB = {}, cut = {};
    if (L.improve.length >= N) cut.improve = L.improve[N - 1].v;
    for (const k of Object.keys(L.fast).sort()) {
      const pm = prev && prev.fast[k];
      fastV[k] = L.fast[k].map(x => Object.assign({ id: x.id }, person(x.id), { v: x.v, w: x.w, pw: x.pw, r: x.r, up: prev ? (pm ? upOf(pm, x.id, x.r) : 0) : 0, rid: x.rid }));
      cur.fast[k] = {}; L.fast[k].slice(0, N).forEach(x => { cur.fast[k][x.id] = x.r; });
      if (L.fast[k].length >= N) cut['fast:' + k] = L.fast[k][N - 1].v;
    }
    const strip = (rows, drop) => rows.slice(0, N).map(r => { const o = Object.assign({}, r); drop.forEach(d => delete o[d]); return o; });
    for (const k of Object.keys(fastV)) fastB[k] = strip(fastV[k], ['id', 'rid']);
    const accRows = L.acc.map(x => Object.assign({ id: x.id }, person(x.id), { at: x.at }));
    const board = {
      v: BOARD_V, g, t: now, week: W,
      improve: strip(imp, ['id', 'rids']), fast: fastB,
      acc: { list: accRows.slice(0, RANK.accListMax).map(({ id, ...o }) => o), more: Math.max(0, accRows.length - RANK.accListMax) },
      cut
    };
    const nst = Object.assign({}, st, { week: W, t: now, prev: prev || null, cur });
    out.states[g] = safeDoc(nst);
    out.boards[g] = safeDoc(board);
    out.view[g] = { improve: imp.slice(0, RANK.viewMax), fast: Object.fromEntries(Object.keys(fastV).map(k => [k, fastV[k].slice(0, RANK.viewMax)])), acc: accRows };
    const held = [], fastWarn = [];
    for (const id of Object.keys(st.students).sort()) for (const e of st.students[id].runs) if (e.h) held.push({ id, c: st.students[id].c, s: st.students[id].s, rid: `${id}_${e.t}`, ts: e.u, mk: e.m, star: e.r, why: e.y || [] });
    for (const k of Object.keys(fastV)) fastV[k].slice(0, N).forEach(x => { const [mk, star] = k.split(':'), floor = FASTEST_FLOOR[mk]; if (floor && x.v < floor) fastWarn.push({ id: x.id, rid: x.rid, mk, star: +star, v: x.v, floor }); });
    out.review[g] = {
      students: Object.keys(st.students).length, runs: Object.values(st.students).reduce((a, s) => a + s.runs.length, 0),
      held, improveWarn: L.improve.filter(x => x.v > IMPROVE_SANE_MAX).map(x => ({ id: x.id, qb: x.qb, v: x.v })),
      improveHold: L.improveHold.map(x => ({ id: x.id, qb: x.qb, v: x.v })), fastWarn,
      blocked: Object.keys(st.blocked).filter(id => isBlocked(st, id, now)).sort().map(id => ({ id, until: st.blocked[id].until, why: st.blocked[id].why }))
    };
  }
  return out;
}

export function updateBoards(priv, rawRuns, opts = {}) {
  const now = isNum(opts.now) ? opts.now : Date.now();
  const a = ingest(priv, rawRuns, opts);
  const p = publish(a.states, now);
  for (const g of GRADES) {
    a.stats.bytes[g] = JSON.stringify(p.states[g]).length;
    if (a.stats.bytes[g] > RANK.bytesWarn) a.stats.warn.push(`mg_nw_board_private/${g} 已經 ${Math.round(a.stats.bytes[g] / 1000)} KB，快到 Firestore 單文件 1 MB 的上限`);
  }
  return { states: p.states, boards: p.boards, view: p.view, review: p.review, stats: a.stats };
}

/* ── 寫進 Firestore 之前的檢查（假資料庫不會幫你擋）──
   不能有：陣列裡的陣列、undefined、NaN／Infinity、非純物件（Date、函式）、空字串或 __x__ 的欄位名 */
export function checkDoc(v) {
  const out = [];
  const walk = (x, path, parentArr) => {
    if (x === undefined) out.push(`${path}：undefined`);
    else if (x === null || typeof x === 'string' || typeof x === 'boolean') return;
    else if (typeof x === 'number') { if (!Number.isFinite(x)) out.push(`${path}：${x}`); }
    else if (Array.isArray(x)) { if (parentArr) out.push(`${path}：陣列裡的陣列`); x.forEach((y, i) => walk(y, `${path}[${i}]`, true)); }
    else if (isObj(x) && Object.getPrototypeOf(x) === Object.prototype) {
      Object.keys(x).forEach(k => { if (k === '' || /^__.*__$/.test(k)) out.push(`${path}.${k}：不能用的欄位名`); walk(x[k], `${path}.${k}`, false); });
    } else out.push(`${path}：不是純資料（${typeof x}）`);
  };
  walk(v, '$', false);
  return out;
}
export function safeDoc(v) {
  const p = checkDoc(v);
  if (p.length) throw new Error('rank-calc：文件不能寫進 Firestore：' + p.slice(0, 5).join('；'));
  return JSON.parse(JSON.stringify(v));
}
