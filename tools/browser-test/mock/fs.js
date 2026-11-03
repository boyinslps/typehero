const FS = window.__FS || (window.__FS = {});
const snapOf = (path) => ({ id: path.split('/').pop(), exists: () => path in FS, data: () => FS[path] ? JSON.parse(JSON.stringify(FS[path])) : undefined, ref: { path } });
export function getFirestore(){ return {}; }
export function collection(db, name){ return { path: name, col: true }; }
export function doc(base, ...seg){ const pre = base && base.col ? base.path : null; return { path: (pre ? [pre, ...seg] : seg).join('/') }; }
export async function getDoc(ref){ return snapOf(ref.path); }
export async function setDoc(ref, data, opt){ const clean = JSON.parse(JSON.stringify(data, (k,v)=> v && v.__ts ? new Date().toISOString() : v)); FS[ref.path] = (opt && opt.merge) ? Object.assign({}, FS[ref.path]||{}, clean) : clean; }
export async function deleteDoc(ref){ delete FS[ref.path]; }
export function serverTimestamp(){ return { __ts: true }; }
export function query(col, ...f){ return { path: col.path, col: true, filters: f.filter(Boolean) }; }
export function where(field, op, v){ return { field, op, v }; }
export function orderBy(){ return null; }
export async function getDocs(q){ const docs = Object.keys(FS).filter(p => p.startsWith(q.path + '/')).map(snapOf)
  .filter(d => (q.filters||[]).every(f => !f.field || d.data()[f.field] === f.v));
  return { docs, forEach: fn => docs.forEach(fn), size: docs.length, empty: !docs.length }; }
export function onSnapshot(ref, next){ setTimeout(()=> next(snapOf(ref.path)), 20); return ()=>{}; }
