/* 教師頁共用的資料讀取（有快取）。分頁之間會用到同一份資料（學生、抓蟲榜、回報…），
   所以集中在這裡讀一次；寫入之後呼叫 invalidate('board') 之類，下次再讀才是新的。
   快取只活在這個分頁的記憶體，重新整理就沒了。 */
import { db, collection, doc, getDoc, getDocs, query, orderBy, limit } from './fb.js';
import { toMs, normName, normalizeNw, curWeapon, weaponInfo, clsShort, normalizeEvent, phaseOf, gearPower } from './nw.js';

const cache = {};
const TTL = 45 * 1000;
async function cached(key, force, fn) {
  const c = cache[key];
  if (!force && c && Date.now() - c.at < TTL) return c.v;
  const v = await fn();
  cache[key] = { at: Date.now(), v };
  return v;
}
export const invalidate = (...keys) => (keys.length ? keys : Object.keys(cache)).forEach(k => delete cache[k]);

import { idParts } from './ids.js';
export { idParts };
export const byClsSeat = (a, b) => (clsShort(a.className) < clsShort(b.className) ? -1 : clsShort(a.className) > clsShort(b.className) ? 1 : 0) || (a.seat - b.seat);

/* mg_scores 整份讀進來（只有教師頁會這樣讀，學生端不讀，SPEC §4.3）。
   每個學生整理成一列：raw＝原始文件，nw＝整理過的新世界存檔（沒玩過新世界就是 null） */
export function loadScores(force) {
  return cached('scores', force, async () => {
    const snap = await getDocs(collection(db, 'mg_scores'));
    const list = [];
    snap.forEach(d => {
      const x = d.data() || {}, p = idParts(d.id);
      const played = !!(x.nw && typeof x.nw === 'object');
      const nw = played ? normalizeNw(x.nw) : null;
      const last = Math.max(toMs(x.lastPlayedAt), played ? (+x.nw.savedAt || 0) : 0);
      const w = nw ? weaponInfo(curWeapon(nw)) : null;
      list.push({
        id: d.id, className: x.className || p.className, seat: +(x.seat !== undefined && x.seat !== '' ? x.seat : p.seat) || 0, name: x.name || '',
        played, nw, raw: x,
        nick: played ? (x.name || '') : '', hr: nw ? nw.hr : 0, coins: nw ? nw.coins : 0, weapon: w ? w.name : '',
        power: nw ? gearPower(nw) : 0, hunts: nw ? (nw.hunts || 0) : 0, wins: nw ? nw.stat.wins : 0, fails: nw ? nw.stat.fails : 0,
        sent: nw ? (nw.bugsSent || 0) : 0, last, nwCls: x.nwCls || ''
      });
    });
    list.sort(byClsSeat);
    return list;
  });
}
/* 抓蟲榜／隱藏暱稱／名字沒問題：回 { 班級_座號 → 資料 }。
   公開的 mg_bugboard（學生讀得到：分數、隱藏暱稱、回報狀態）跟老師專用的 mg_bugboard_private
   （加分理由 notes、老師核可的真名 nameOk）在記憶體裡合成一份給教師頁看；
   寫入時一定要分開寫，真名與理由不能進 mg_bugboard。 */
export function loadBoard(force) {
  return cached('board', force, async () => {
    const [pub, priv] = await Promise.all([getDocs(collection(db, 'mg_bugboard')), getDocs(collection(db, 'mg_bugboard_private'))]), m = {};
    pub.forEach(d => { m[d.id] = d.data() || {}; });
    priv.forEach(d => { const x = d.data() || {}; m[d.id] = Object.assign(m[d.id] || {}, { notes: Array.isArray(x.notes) ? x.notes : [], nameOk: typeof x.nameOk === 'string' ? x.nameOk : '' }); });
    return m;
  });
}
/* 回報、回饋、換名紀錄：只有老師讀得到。回 [{ id, ...欄位 }] */
export function loadFlags(force) {
  return cached('flags', force, async () => {
    const snap = await getDocs(collection(db, 'mg_nw_flags')), list = [];
    snap.forEach(d => list.push(Object.assign({ id: d.id }, d.data() || {})));
    return list;
  });
}
export function loadEvents(force) {
  return cached('events', force, async () => {
    const snap = await getDocs(collection(db, 'mg_events')), list = [];
    snap.forEach(d => list.push(Object.assign({ id: d.id }, d.data() || {})));
    return list;
  });
}
/* 已結束、還沒發獎的排行榜活動（學生端寫了「老師可能會寄獎品到信箱」，這是對孩子的承諾）。
   回整理過的活動（normalizeEvent），最早結束的在前。總覽、活動分頁用同一個算法，數字才會一樣 */
export function pendingAwards(events, now = Date.now()) {
  return events.map(e => normalizeEvent(e.id, e)).filter(ev => ev && ev.type === 'ranking' && phaseOf(ev, now) === 'ended' && !ev.awarded).sort((a, b) => a.endAt - b.endAt);
}
/* 信：新的在前。沒有 t 的舊信（理論上沒有）不會出現，因為 orderBy 會跳過沒欄位的文件 */
export function loadMails(force) {
  return cached('mails', force, async () => {
    const snap = await getDocs(query(collection(db, 'mg_mail'), orderBy('t', 'desc'), limit(300))), list = [];
    snap.forEach(d => list.push(Object.assign({ id: d.id }, d.data() || {})));
    return list;
  });
}
export async function loadClassSizes() {
  const s = await getDoc(doc(db, 'mg_config', 'class_sizes'));
  const z = s.exists() ? (s.data() || {}).sizes : null;
  return (z && typeof z === 'object') ? z : {};
}

/* ── 冒名鎖：現在的名字跟基準不一樣 ──
   基準 = 老師核可的名字（mg_bugboard_private.nameOk），沒有就用存檔裡只寫一次的 name0。
   學生端比的是 mg_bugboard.nameOkH（名字的雜湊），看不到真名；老師這邊直接比名字。 */
export const nameBase = (s, board) => (board && board.nameOk) || (s.nw && s.nw.name0) || '';
/* v3.14.1 起名字固定：雲端 name 就是基準，學生這次打的別的名字只留在 mg_nw_flags 的 namechg。
   所以「換過名字」＝有還沒處理的 namechg（markNameWarn 掛在 s.chg 上）；舊的比對方式留著，
   但老師核可的名字（nameOk）與存檔的 name0 兩個都算「對」，用改名卡改過名的人不會被誤標。 */
export function markNameWarn(scores, flags) {
  const m = {};
  (flags || []).filter(f => f.type === 'namechg' && (f.status || 'pending') === 'pending')
    .sort((a, b) => (a.t || 0) - (b.t || 0)).forEach(f => { m[f.docId] = f; });
  scores.forEach(s => { s.chg = m[s.id] || null; });
}
export function nameChanged(s, board) {
  if (s.chg) return true;
  const n = normName(s.name || '');
  if (!n) return false;
  const oks = [board && board.nameOk, s.nw && s.nw.name0].filter(Boolean).map(normName);
  return oks.length > 0 && !oks.includes(n);
}

/* 收件人：aud 陣列 → 學生列。'all' 是全部；'cls:' 是整班；'id:' 是個人（不在 mg_scores 的 id 回報在 unknown） */
export function audRecipients(aud, scores) {
  const a = Array.isArray(aud) ? aud : [];
  if (a.includes('all')) return { list: scores.slice(), unknown: [] };
  const set = new Map(), unknown = [];
  a.forEach(x => {
    if (x.startsWith('cls:')) scores.filter(s => s.className === x.slice(4)).forEach(s => set.set(s.id, s));
    else if (x.startsWith('id:')) { const s = scores.find(q => q.id === x.slice(3)); if (s) set.set(s.id, s); else unknown.push(x.slice(3)); }
  });
  return { list: [...set.values()], unknown };
}
/* 收件人寫成給老師看的字，例「504 全班」「全校」「小明 等 3 人」 */
export function audText(aud, scores) {
  const a = Array.isArray(aud) ? aud : [];
  if (a.includes('all')) return '全校';
  const cls = a.filter(x => x.startsWith('cls:')).map(x => clsShort(x.slice(4)) + ' 全班');
  const ids = a.filter(x => x.startsWith('id:')).map(x => x.slice(3));
  const names = ids.map(i => { const s = scores.find(q => q.id === i); return s ? `${clsShort(s.className)}・${s.seat}號${s.name ? ' ' + s.name : ''}` : i; });
  const idPart = names.length > 2 ? `${names.slice(0, 2).join('、')} 等 ${names.length} 人` : names.join('、');
  return [...cls, idPart].filter(Boolean).join('、') || '（沒有收件人）';
}
