/* 每個 app 一個 auth。管理者登入（admin app）可用：
     window.__ADMIN_PRESIGNED = { uid, email }   一開始就已登入（測試捷徑）
     window.__MOCK_ADMIN = { email, password, uid }   signInWithEmailAndPassword 認哪一組（預設見下）
   「記住這台電腦」：persistence 是 LOCAL 時把使用者存進 localStorage，重新整理還在；SESSION 存 sessionStorage。 */
const AUTHS = {};
export const browserLocalPersistence = { type: 'LOCAL' };
export const browserSessionPersistence = { type: 'SESSION' };
export const inMemoryPersistence = { type: 'NONE' };
const KEY = 'mock_admin_user';
function restore() {
  try { const s = sessionStorage.getItem(KEY) || localStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; }
}
export function getAuth(app) {
  const name = (app && app.name) || '[DEFAULT]';
  if (!AUTHS[name]) AUTHS[name] = { app, name, currentUser: name === 'admin' ? (restore() || window.__ADMIN_PRESIGNED || null) : null, subs: [], persistence: browserLocalPersistence };
  return AUTHS[name];
}
const emit = a => a.subs.forEach(f => f(a.currentUser));
export async function signInAnonymously(a) { a.currentUser = { uid: 'u1', isAnonymous: true }; emit(a); return { user: a.currentUser }; }
export function onAuthStateChanged(a, cb) {
  a.subs.push(cb);
  setTimeout(() => cb(a.currentUser || (a.name === 'admin' ? null : { uid: 'u1', isAnonymous: true })), 10);
  return () => { a.subs = a.subs.filter(f => f !== cb); };
}
export async function setPersistence(a, p) { a.persistence = p; window.__LAST_PERSISTENCE = p.type; }
export async function signInWithEmailAndPassword(a, email, password) {
  const ok = Object.assign({ email: 'teacher@example.test', password: 'pw-ok', uid: 'T1' }, window.__MOCK_ADMIN || {});
  if (email !== ok.email || password !== ok.password) { const e = new Error('invalid'); e.code = 'auth/invalid-credential'; throw e; }
  a.currentUser = { uid: ok.uid, email, isAnonymous: false };
  const s = JSON.stringify(a.currentUser);
  try { sessionStorage.removeItem(KEY); localStorage.removeItem(KEY); (a.persistence.type === 'LOCAL' ? localStorage : sessionStorage).setItem(KEY, s); } catch (e) { /* 無痕視窗 */ }
  window.__ADMIN_SIGNINS = (window.__ADMIN_SIGNINS || 0) + 1;
  emit(a); return { user: a.currentUser };
}
export async function signOut(a) {
  a.currentUser = null;
  try { sessionStorage.removeItem(KEY); localStorage.removeItem(KEY); } catch (e) { /* 無痕視窗 */ }
  emit(a);
}
/* fs.js 判斷老師身分要看 admin app 現在登入的是誰 */
window.__AUTHS_ADMIN = () => (AUTHS.admin && AUTHS.admin.currentUser) || null;
