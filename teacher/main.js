/* 教師管理頁入口：登入（SPEC §1.4）、檢查老師身分、分頁切換。 */
import { auth, db, doc, getDoc, onAuthStateChanged, setPersistence, signInWithEmailAndPassword, signOut,
         browserLocalPersistence, browserSessionPersistence } from './fb.js';
import { injectUi } from '../nw-ui.js';
import { TABS } from './tabs.js';
import { $, $$, esc, toast } from './util.js';

injectUi();
const show = (id, on) => $('#' + id).classList.toggle('hidden', !on);
let loginErr = '', started = false, leave = null, navToken = 0, pendingParams = null, user = null;

/* ── 登入 ── */
function showLogin() {
  started = false; user = null;
  show('app', false); show('login', true);
  $('#l-err').textContent = loginErr; loginErr = '';
}
async function doLogin() {
  const email = $('#l-email').value.trim(), pw = $('#l-pw').value, err = $('#l-err'), btn = $('#l-ok');
  if (!email || !pw) { err.textContent = '請輸入 email 和密碼'; return; }
  btn.disabled = true; err.textContent = '登入中…';
  try {
    /* 沒勾「記住這台電腦」就關分頁登出，避免教室電腦被下一位同學接手 */
    await setPersistence(auth, $('#l-remember').checked ? browserLocalPersistence : browserSessionPersistence);
    await signInWithEmailAndPassword(auth, email, pw);
    $('#l-pw').value = '';
    /* 接下來交給 onAuthStateChanged：檢查 mg_admins、進管理頁 */
  } catch (e) {
    const c = (e && e.code) || '';
    err.textContent = /invalid-credential|wrong-password|user-not-found|invalid-email/.test(c) ? 'email 或密碼不對'
      : /too-many/.test(c) ? '試太多次了，等一下再試'
      : /network/.test(c) ? '連不上網路'
      : '登入失敗（' + (c || (e && e.message) || '不明原因') + '）';
  } finally { btn.disabled = false; }
}
$('#l-ok').addEventListener('click', doLogin);
$('#l-pw').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) doLogin(); });
$('#logout').addEventListener('click', () => signOut(auth));

/* ── 檢查老師身分：mg_admins/{uid} 要存在 ── */
async function checkTeacher(u) {
  try { return (await getDoc(doc(db, 'mg_admins', u.uid))).exists(); }
  catch (e) { console.warn('讀 mg_admins 失敗', e); return false; }
}
onAuthStateChanged(auth, async u => {
  if (!u || u.isAnonymous) { showLogin(); return; }
  if (started && user && user.uid === u.uid) return;
  if (!(await checkTeacher(u))) {
    loginErr = '這個帳號不是老師帳號';
    await signOut(auth);   // 之後會再收到一次 u = null，showLogin() 會把上面這行顯示出來
    return;
  }
  user = u; started = true;
  $('#who').textContent = u.email || '老師';
  show('login', false); show('app', true);
  buildNav(); route();
});

/* ── 分頁 ── */
function buildNav() {
  $('#nav').innerHTML = TABS.map(t => `<button data-tab="${t.id}">${t.icon} ${esc(t.title)}</button>`).join('');
}
$('#nav').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) go(b.dataset.tab); });

/* 別的分頁要帶東西過去（例如學生頁勾了 5 個人 → 信箱）：params 放記憶體，hash 只放分頁名稱 */
export function go(id, params) {
  pendingParams = params || null;
  if (location.hash === '#/' + id) route(); else location.hash = '#/' + id;
}
window.addEventListener('hashchange', () => { if (started) route(); });

async function route() {
  const id = (location.hash.match(/^#\/(\w+)/) || [])[1];
  const tab = TABS.find(t => t.id === id) || TABS[0];
  const params = pendingParams; pendingParams = null;
  const token = ++navToken, main = $('#main');
  if (leave) { try { leave(); } catch (e) { console.warn(e); } leave = null; }
  $$('#nav [data-tab]').forEach(b => { if (b.dataset.tab === tab.id) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  main.innerHTML = '<p class="dim">讀取中…</p>';
  try {
    const mod = await tab.load();
    if (token !== navToken) return;
    /* 每個分頁拿到全新的容器：分頁掛在容器上的事件監聽，換分頁時就跟著丟掉，不會越疊越多 */
    main.innerHTML = '';
    const box = document.createElement('div'); main.appendChild(box);
    const un = await mod.default(box, { user, go, tab: tab.id }, params || {});
    if (token === navToken && typeof un === 'function') leave = un;
  } catch (e) {
    console.error(e);
    if (token !== navToken) return;
    main.innerHTML = `<div class="note bad" data-tab-error>這一頁讀不出來：${esc((e && (e.code || e.message)) || e)}${e && e.code === 'permission-denied' ? '<br>請確認已經發布正式規則，而且 mg_admins 裡有自己的帳號。' : ''}</div>`;
    toast('讀取失敗', true);
  }
}
