/* 記憶體版 Firestore。window.__FS：路徑 → 文件。
   支援：where（== != < <= > >= in not-in array-contains array-contains-any，欄位可用 a.b.c）、
   orderBy、limit、getCountFromServer、writeBatch、updateDoc、serverTimestamp、具名 app。
   規則：window.__RULES = true 時照正式規則（firestore-rules.txt）的重點擋寫入與讀取，
   用來確認程式有走對身分（老師的寫入必須走 admin app）。預設不擋。 */
const FS = window.__FS || (window.__FS = {});
const clone = v => v === undefined ? undefined : JSON.parse(JSON.stringify(v));
const WRITES = window.__WRITES || (window.__WRITES = []);
const LISTEN = {};

/* 伺服器時間：可以用 window.__SERVER_SKEW_MS 模擬學生電腦時間不準 */
const serverNow = () => Date.now() + (window.__SERVER_SKEW_MS || 0);
const tsObj = ms => ({ __ts: ms });
const revive = v => {
  if (Array.isArray(v)) return v.map(revive);
  if (v && typeof v === 'object') {
    if (typeof v.__ts === 'number') return { __ts: v.__ts, seconds: Math.floor(v.__ts / 1000), nanoseconds: 0, toMillis: () => v.__ts, toDate: () => new Date(v.__ts) };
    const o = {}; for (const k of Object.keys(v)) o[k] = revive(v[k]); return o;
  }
  return v;
};
const snapOf = path => ({ id: path.split('/').pop(), exists: () => path in FS, data: () => path in FS ? revive(clone(FS[path])) : undefined, ref: { path }, get: f => getField(path in FS ? FS[path] : {}, f) });
const getField = (o, f) => f.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const num = v => (v && typeof v === 'object' && typeof v.__ts === 'number') ? v.__ts : v;

/* ── 規則（摘要版，正式內容以 firestore-rules.txt 與 tools/rules-test 為準）── */
const deny = (op, path) => { const e = new Error(`Missing or insufficient permissions. (${op} ${path})`); e.code = 'permission-denied'; throw e; };
const userOf = db => (db && db.app && db.app.name === 'admin') ? (window.__AUTHS_ADMIN && window.__AUTHS_ADMIN()) : { uid: 'u1' };
function teacherOf(db) {
  if (!db || !db.app || db.app.name !== 'admin') return false;
  const u = window.__AUTHS_ADMIN && window.__AUTHS_ADMIN();
  return !!(u && FS['mg_admins/' + u.uid]);
}
function authedOf(db) {
  if (!db || !db.app) return true;
  if (db.app.name === 'admin') return !!(window.__AUTHS_ADMIN && window.__AUTHS_ADMIN());
  return true;
}
function ruleCheck(db, op, path, data, exists) {
  if (op === 'get' || op === 'list') (window.__READS || (window.__READS = [])).push({ op, path, by: (db && db.app && db.app.name) || '[DEFAULT]' });
  if (!window.__RULES) return;
  if (!authedOf(db)) deny(op, path);
  const [col, id] = path.split('/');
  /* mg_admins：誰都只能 get 自己那份，連老師也不能從程式寫 */
  if (col === 'mg_admins') { const u = userOf(db); if (op === 'get' && u && u.uid === id) return; deny(op, path); }
  if (teacherOf(db)) { if (col === 'mg_admin_log' && op !== 'get' && op !== 'list' && op !== 'create') deny(op, path); return; }
  const read = op === 'get' || op === 'list';
  if (['competition', 'scores', 'mg_rooms'].includes(col)) return;
  if (col === 'mg_nw_flags') {
    if (op === 'create') {
      const d = data || {}, keys = ['type', 'status', 'docId', 'cat', 'text', 'did', 'what', 'view', 'mk', 'mon', 'star', 'rate', 'cls', 'seat', 'name', 'oldName', 't'];
      if (!['bug', 'feedback', 'namechg'].includes(d.type) || (d.status || 'pending') !== 'pending' || Object.keys(d).some(k => !keys.includes(k))) deny(op, path);
      if ((d.text || '').length > 400 || (d.did || '').length > 200 || (d.what || '').length > 200) deny(op, path);
      return;
    }
    if (op === 'update' && same(data, FS[path])) return;
    deny(op, path);
  }
  if (col === 'mg_scores') { if (op === 'delete') deny(op, path); return; }
  if (col === 'mg_nw_runs') { if (read || op === 'create') return; deny(op, path); }
  if (col === 'mg_gift_used') {
    if (read) return;
    if (op === 'create' && data && Object.keys(data).every(k => ['h', 'id', 't'].includes(k)) && typeof data.h === 'string') return;
    deny(op, path);
  }
  if (col === 'mg_clock') { if (read) return; if ((op === 'create' || op === 'update') && Object.keys(data || {}).every(k => k === 't')) return; deny(op, path); }
  if (col === 'mg_config' && id === 'nw_vote' && !read) {
    if (op === 'delete') deny(op, path);
    const ks = Object.keys(data || {}).filter(k => !exists || !same(data[k], (FS[path] || {})[k]));
    if (ks.every(k => k === 'v' || k === 'noms')) return;
    deny(op, path);
  }
  if (['mg_config', 'mg_round', 'mg_bank', 'mg_mail', 'mg_events', 'mg_news', 'mg_bugboard'].includes(col)) { if (read) return; deny(op, path); }
  if (col === 'mg_admin_log') deny(op, path);
  deny(op, path);
}

export function getFirestore(app) { return { app: app || { name: '[DEFAULT]' } }; }
export function collection(base, name) { return { path: name, col: true, db: base && base.db ? base.db : base }; }
export function doc(base, ...seg) { const col = base && base.col; return { path: (col ? [base.path, ...seg] : seg).join('/'), db: base && base.db ? base.db : base }; }
export async function getDoc(ref) { ruleCheck(ref.db, 'get', ref.path); return snapOf(ref.path); }
export function increment(n) { return { __op: 'inc', n }; }
export function arrayUnion(...v) { return { __op: 'union', v }; }
export function arrayRemove(...v) { return { __op: 'remove', v }; }
export function deleteField() { return { __op: 'del' }; }
export function serverTimestamp() { return { __op: 'ts' }; }
function applyOps(cur, inc) {
  const out = Array.isArray(inc) ? [] : {};
  for (const k of Object.keys(inc)) {
    const v = inc[k], c = cur ? cur[k] : undefined;
    if (v && v.__op === 'inc') out[k] = (typeof c === 'number' ? c : 0) + v.n;
    else if (v && v.__op === 'union') { const a = Array.isArray(c) ? c.slice() : []; v.v.forEach(x => { if (!a.some(y => same(x, y))) a.push(x); }); out[k] = a; }
    else if (v && v.__op === 'remove') out[k] = (Array.isArray(c) ? c : []).filter(y => !v.v.some(x => same(x, y)));
    else if (v && v.__op === 'del') out[k] = { __del: true };
    else if (v && v.__op === 'ts') out[k] = tsObj(serverNow());
    else if (v && typeof v === 'object' && !Array.isArray(v)) out[k] = applyOps(c && typeof c === 'object' ? c : {}, v);
    else out[k] = v;
  }
  return out;
}
function notify(path) {
  const parts = path.split('/'), colPath = parts.slice(0, -1).join('/');
  (LISTEN[path] || []).forEach(fn => fn(snapOf(path)));
  (LISTEN[colPath] || []).forEach(fn => fn(runQuery({ path: colPath, col: true, cons: [] })));
}
const deepMerge = (a, b) => { for (const k of Object.keys(b)) { if (b[k] && b[k].__del) { delete a[k]; continue; } a[k] = (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && !('__ts' in b[k]) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) ? deepMerge(a[k], b[k]) : b[k]; } return a; };
function doSet(ref, data, opt, by) {
  const merge = opt && opt.merge, exists = ref.path in FS;
  ruleCheck(ref.db, exists ? 'update' : 'create', ref.path, data, exists);
  const base = merge ? clone(FS[ref.path] || {}) : {};
  FS[ref.path] = merge ? deepMerge(base, applyOps(base, data)) : applyOps({}, data);
  WRITES.push({ op: 'set', path: ref.path, by: (ref.db && ref.db.app && ref.db.app.name) || '[DEFAULT]' });
  notify(ref.path);
}
function doUpdate(ref, data) {
  if (!(ref.path in FS)) { const e = new Error('No document to update'); e.code = 'not-found'; throw e; }
  ruleCheck(ref.db, 'update', ref.path, data, true);
  /* updateDoc：鍵裡的點是路徑 */
  const cur = clone(FS[ref.path]);
  for (const k of Object.keys(data)) {
    const segs = k.split('.'); let o = cur;
    for (let i = 0; i < segs.length - 1; i++) { if (!o[segs[i]] || typeof o[segs[i]] !== 'object') o[segs[i]] = {}; o = o[segs[i]]; }
    const last = segs[segs.length - 1], r = applyOps({ [last]: o[last] }, { [last]: data[k] });
    if (r[last] && r[last].__del) delete o[last]; else o[last] = r[last];
  }
  FS[ref.path] = cur;
  WRITES.push({ op: 'update', path: ref.path, by: (ref.db && ref.db.app && ref.db.app.name) || '[DEFAULT]' });
  notify(ref.path);
}
function doDelete(ref) {
  ruleCheck(ref.db, 'delete', ref.path, null, ref.path in FS);
  delete FS[ref.path];
  WRITES.push({ op: 'delete', path: ref.path, by: (ref.db && ref.db.app && ref.db.app.name) || '[DEFAULT]' });
  notify(ref.path);
}
export async function setDoc(ref, data, opt) { doSet(ref, data, opt); }
export async function updateDoc(ref, data) { doUpdate(ref, data); }
export async function deleteDoc(ref) { doDelete(ref); }
export function writeBatch(db) {
  const ops = [];
  return {
    set(ref, data, opt) { ops.push(() => doSet(ref, data, opt)); return this; },
    update(ref, data) { ops.push(() => doUpdate(ref, data)); return this; },
    delete(ref) { ops.push(() => doDelete(ref)); return this; },
    async commit() { ops.forEach(f => f()); }
  };
}

export function query(col, ...cons) { return { path: col.path, col: true, db: col.db, cons: [...(col.cons || []), ...cons.filter(Boolean)] }; }
export function where(field, op, v) { return { kind: 'where', field, op, v }; }
export function orderBy(field, dir) { return { kind: 'order', field, dir: dir || 'asc' }; }
export function limit(n) { return { kind: 'limit', n }; }
export function documentId() { return '__name__'; }
const test = (d, id, f) => {
  const a = f.field === '__name__' ? id : num(getField(d, f.field)), v = f.v;
  switch (f.op) {
    case '==': return same(a, num(v)) || a === v;
    case '!=': return a !== undefined && !same(a, v);
    case '<': return a !== undefined && a < v;
    case '<=': return a !== undefined && a <= v;
    case '>': return a !== undefined && a > v;
    case '>=': return a !== undefined && a >= v;
    case 'in': return v.some(x => same(a, x));
    case 'not-in': return a !== undefined && !v.some(x => same(a, x));
    case 'array-contains': return Array.isArray(a) && a.some(x => same(x, v));
    case 'array-contains-any': return Array.isArray(a) && a.some(x => v.some(y => same(x, y)));
    default: throw new Error('mock 不支援的運算子 ' + f.op);
  }
};
function runQuery(q) {
  const pre = q.path + '/';
  let docs = Object.keys(FS).filter(p => p.startsWith(pre) && !p.slice(pre.length).includes('/')).map(p => ({ path: p, d: FS[p], id: p.slice(pre.length) }));
  const cons = q.cons || [];
  docs = docs.filter(x => cons.filter(c => c.kind === 'where').every(f => test(x.d, x.id, f)));
  /* Firestore 排序會跳過沒有那個欄位的文件 */
  const orders = cons.filter(c => c.kind === 'order');
  orders.forEach(o => { docs = docs.filter(x => getField(x.d, o.field) !== undefined); });
  if (orders.length) docs.sort((a, b) => { for (const o of orders) { const x = num(getField(a.d, o.field)), y = num(getField(b.d, o.field)); if (x !== y) return (x < y ? -1 : 1) * (o.dir === 'desc' ? -1 : 1); } return 0; });
  const lim = cons.find(c => c.kind === 'limit'); if (lim) docs = docs.slice(0, lim.n);
  const snaps = docs.map(x => snapOf(x.path));
  return { docs: snaps, forEach: fn => snaps.forEach(fn), size: snaps.length, empty: !snaps.length };
}
export async function getDocs(q) { ruleCheck(q.db, 'list', q.path + '/x'); return runQuery(q); }
export async function getCountFromServer(q) { ruleCheck(q.db, 'list', q.path + '/x'); const n = runQuery(q).size; return { data: () => ({ count: n }) }; }
/* 測離線：呼叫 window.__SNAP_ERROR()，所有已註冊的監聽都收到 unavailable（遊戲會把 ONLINE 設成 false） */
const SNAP_ERRS = [];
window.__SNAP_ERROR = () => SNAP_ERRS.forEach(f => f({ code: 'unavailable' }));
export function onSnapshot(ref, next, err) {
  if (err) SNAP_ERRS.push(err);
  (LISTEN[ref.path] = LISTEN[ref.path] || []).push(next);
  setTimeout(() => { try { ruleCheck(ref.db, ref.col ? 'list' : 'get', ref.col ? ref.path + '/x' : ref.path); } catch (e) { if (err) err(e); return; } next(ref.col ? runQuery(ref) : snapOf(ref.path)); }, 20);
  return () => { LISTEN[ref.path] = LISTEN[ref.path].filter(f => f !== next); };
}
