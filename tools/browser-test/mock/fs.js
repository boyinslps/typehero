const FS = window.__FS || (window.__FS = {});
const snapOf = (path) => ({ id: path.split('/').pop(), exists: () => path in FS, data: () => FS[path] ? JSON.parse(JSON.stringify(FS[path])) : undefined, ref: { path } });
export function getFirestore(){ return {}; }
export function collection(db, name){ return { path: name, col: true }; }
export function doc(base, ...seg){ const pre = base && base.col ? base.path : null; return { path: (pre ? [pre, ...seg] : seg).join('/') }; }
export async function getDoc(ref){ return snapOf(ref.path); }
/* increment / arrayUnion / arrayRemove 用標記物件表示，寫入時才套用 */
export function increment(n){ return { __op: 'inc', n }; }
export function arrayUnion(...v){ return { __op: 'union', v }; }
export function arrayRemove(...v){ return { __op: 'remove', v }; }
export function deleteField(){ return { __op: 'del' }; }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function applyOps(cur, inc){
  const out = Array.isArray(inc) ? [] : {};
  for (const k of Object.keys(inc)) {
    const v = inc[k], c = cur ? cur[k] : undefined;
    if (v && v.__op === 'inc') out[k] = (typeof c === 'number' ? c : 0) + v.n;
    else if (v && v.__op === 'union') { const a = Array.isArray(c) ? c.slice() : []; v.v.forEach(x => { if (!a.some(y => same(x, y))) a.push(x); }); out[k] = a; }
    else if (v && v.__op === 'remove') out[k] = (Array.isArray(c) ? c : []).filter(y => !v.v.some(x => same(x, y)));
    else if (v && v.__op === 'del') out[k] = { __del: true };
    else if (v && v.__ts) out[k] = new Date().toISOString();
    else if (v && typeof v === 'object' && !Array.isArray(v)) out[k] = applyOps(c && typeof c === 'object' ? c : {}, v);
    else out[k] = v;
  }
  return out;
}
const LISTEN = {};
function notify(path){ (LISTEN[path] || []).forEach(fn => fn(snapOf(path))); }
export async function setDoc(ref, data, opt){
  const merge = opt && opt.merge;
  const base = merge ? JSON.parse(JSON.stringify(FS[ref.path] || {})) : {};
  const deep = (a, b) => { for (const k of Object.keys(b)) { if (b[k] && b[k].__del) { delete a[k]; continue; } a[k] = (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) ? deep(a[k], b[k]) : b[k]; } return a; };
  FS[ref.path] = merge ? deep(base, applyOps(base, data)) : applyOps({}, data);
  notify(ref.path);
}
export async function deleteDoc(ref){ delete FS[ref.path]; }
export function serverTimestamp(){ return { __ts: true }; }
export function query(col, ...f){ return { path: col.path, col: true, filters: f.filter(Boolean) }; }
export function where(field, op, v){ return { field, op, v }; }
export function orderBy(){ return null; }
export function documentId(){ return '__name__'; }
export async function getDocs(q){ const docs = Object.keys(FS).filter(p => p.startsWith(q.path + '/')).map(snapOf)
  .filter(d => (q.filters||[]).every(f => !f.field || (f.field === '__name__' ? (f.op === '>=' ? d.id >= f.v : f.op === '<' ? d.id < f.v : d.id === f.v) : d.data()[f.field] === f.v)));
  return { docs, forEach: fn => docs.forEach(fn), size: docs.length, empty: !docs.length }; }
export function onSnapshot(ref, next){ (LISTEN[ref.path] = LISTEN[ref.path] || []).push(next); setTimeout(()=> next(snapOf(ref.path)), 20);
  return ()=>{ LISTEN[ref.path] = LISTEN[ref.path].filter(f => f !== next); }; }
