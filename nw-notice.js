/* 佈告欄的資料（docs/SPEC-TEACHER-ADMIN.md §5、§7.3）。
   上半是純函式（可以在 node 直接測）；下半 createNotice() 接 Firestore。畫面在 newworld.js 的 openNotice()。

   mg_news/{ID}：{ title, body, pin, t }（老師公告；只有老師能寫）
   mg_bugboard/{班級_座號}：{ className, seat, score, n, firstAt, hideNick, bonus, nameOkH, reports[] }（只有老師能寫；所有登入的人都讀得到，所以不存真名與老師打的理由：
     那些放 mg_bugboard_private，只有老師讀得到；nameOkH 是老師核可名字的雜湊）
     沒有 className／seat 時從文件 ID 拆（「五年級4班_5號」）。 */
import { NICK_EMPTY, clsShort, displayName } from './nw-data.js';
import { toMs } from './nw-events.js';

export const BUG_TOP = 10;
/* 抓蟲徽章的分數門檻（WORDS 的 bug1、bug3、bug5、bug10）；常駐活動的詳情頁畫進度條與徽章用 */
export const BUG_MILESTONES = [1, 3, 5, 10];
export const CACHE_MS = 60 * 1000;

/* 壞資料（沒標題）整份丟掉，不讓一份壞公告弄壞佈告欄 */
export function normalizeNews(id, d) {
  if (!d || typeof d !== 'object' || !String(d.title || '').trim()) return null;
  return { id, title: String(d.title).slice(0, 60), body: String(d.body || '').slice(0, 1000), pin: !!d.pin, t: toMs(d.t) };
}
/* 置頂在前，同一組裡新的在前 */
export const sortNews = list => list.slice().sort((a, b) => (b.pin ? 1 : 0) - (a.pin ? 1 : 0) || b.t - a.t || (a.id < b.id ? -1 : 1));
export const newsLatest = list => list.reduce((m, x) => Math.max(m, x.t || 0), 0);

const idParts = id => { const m = /^(.+)_(\d+)號$/.exec(id || ''); return m ? { className: m[1], seat: +m[2] } : { className: '', seat: '' }; };

/* 抓蟲榜排序：分數高的在前；同分比 firstAt（回報送出的時間）早的在前；再同就比文件 ID，順序才固定 */
export const bugCmp = (a, b) => b.score - a.score || (a.firstAt || Infinity) - (b.firstAt || Infinity) || (a.id < b.id ? -1 : 1);

/* 自己不在前 10：只說「再拿 N 分就上榜」，不說第幾名。last＝第 10 名的分數，要比它高才算（同分看 firstAt，不能保證）。 */
export function bugGapText(myScore, last) {
  if (!(myScore > 0)) return '還沒有回報被確認，去找找看吧！';
  if (last === null || last === undefined) return '';
  return `再拿 ${Math.max(1, last - myScore + 1)} 分就上榜！`;
}

/* docs＝[{id, className, seat, score, n, firstAt, hideNick}]（已經是前 10 加上同分的），回前 10 列。
   分數 0 分的不上榜。mine＝{id, score, n}（自己那份，可能不在 docs 裡） */
export function composeBugBoard(docs, mine) {
  const rows = docs.filter(d => d.score > 0).sort(bugCmp).slice(0, BUG_TOP).map((d, i) => ({
    id: d.id, rank: i + 1, score: d.score, n: d.n, firstAt: d.firstAt, hideNick: !!d.hideNick,
    cls: clsShort(d.className), seat: d.seat, mine: !!(mine && d.id === mine.id)
  }));
  const inTop = rows.some(r => r.mine);
  const last = rows.length >= BUG_TOP ? rows[rows.length - 1].score : null;
  const myScore = mine ? mine.score : 0;
  return { rows, inTop, last, text: inTop ? '' : bugGapText(myScore, last), zero: !(myScore > 0) };
}

export function createNotice(C, h) {
  let news = { at: 0, list: [], ok: false }, bug = { at: 0, v: null };

  /* 老師公告：不多，一次撈最新 20 則。讀失敗就沿用上一份（斷線時不讓佈告欄變空）。 */
  async function loadNews(force) {
    if (!C.online()) return news.list;
    if (!force && news.at && Date.now() - news.at < CACHE_MS) return news.list;
    try {
      const snap = await C.withTimeout(C.getDocs(C.query(C.collection(C.db, 'mg_news'), C.orderBy('t', 'desc'), C.limit(20))), 6000, 'nw-news');
      const list = [];
      snap.forEach(d => { const n = normalizeNews(d.id, d.data()); if (n) list.push(n); });
      news = { at: Date.now(), list: sortNews(list), ok: true };
    } catch (err) { console.warn('讀老師公告失敗', err); news.ok = false; }
    return news.list;
  }

  /* 抓蟲榜：前 10 名＋自己。
     orderBy('score') 只有單一欄位，同分時 Firestore 照文件 ID 排，第 10 名那一分的人可能被擠掉；
     所以再查一次「分數等於第 10 名」的全部人，在前端用 firstAt 排好再取前 10（單欄位相等，不用建索引）。
     暱稱：老師隱藏的（bugboard.hideNick）不讀；其他人讀他們 mg_scores 最外層的 nwNick（一次用 in 讀完）。 */
  async function loadBugBoard(force) {
    if (!force && bug.v && Date.now() - bug.at < CACHE_MS) return bug.v;
    const col = C.collection(C.db, 'mg_bugboard');
    const snap = await C.withTimeout(C.getDocs(C.query(col, C.orderBy('score', 'desc'), C.limit(BUG_TOP))), 6000, 'nw-bugboard');
    const byId = new Map();
    const take = d => { const x = d.data() || {}, p = idParts(d.id); byId.set(d.id, { id: d.id, className: x.className || p.className, seat: x.seat !== undefined && x.seat !== '' ? x.seat : p.seat, score: +x.score || 0, n: +x.n || 0, firstAt: toMs(x.firstAt), hideNick: !!x.hideNick }); };
    let lastScore = null, cnt = 0;
    snap.forEach(d => { take(d); cnt++; lastScore = +((d.data() || {}).score) || 0; });
    if (cnt >= BUG_TOP && lastScore > 0) {
      try {
        const ties = await C.withTimeout(C.getDocs(C.query(col, C.where('score', '==', lastScore))), 6000, 'nw-bugboard-ties');
        ties.forEach(take);
      } catch (err) { console.warn('讀同分的人失敗', err); }
    }
    const me = h.me(), own = h.ownBoard() || {}, ownScore = Math.max(0, +own.score || 0);
    const comp = composeBugBoard([...byId.values()], { id: me.docId, score: ownScore, n: Math.max(0, +own.n || 0) });
    const nicks = {};
    const ids = comp.rows.filter(r => !r.hideNick && !r.mine).map(r => r.id);
    if (ids.length) {
      try {
        const ns = await C.withTimeout(C.getDocs(C.query(C.collection(C.db, 'mg_scores'), C.where(C.documentId(), 'in', ids))), 6000, 'nw-bugboard-nick');
        ns.forEach(d => { const x = d.data() || {}; if (x.nwNick) nicks[d.id] = x.nwNick; });
      } catch (err) { console.warn('讀暱稱失敗，先一律顯示神秘獵人', err); }
    }
    comp.rows.forEach(r => {
      /* 自己的暱稱用本機的（剛取的還沒存到雲端也對）；被老師隱藏就跟別人一樣顯示神秘獵人 */
      r.nick = r.hideNick ? NICK_EMPTY : r.mine ? displayName(h.myName()) : (nicks[r.id] || NICK_EMPTY);
      r.label = `${r.cls}・${r.seat}號`;
    });
    comp.mine = { score: ownScore, n: Math.max(0, +own.n || 0) };
    comp.at = Date.now();
    bug = { at: comp.at, v: comp };
    return comp;
  }

  return { loadNews, loadBugBoard, news: () => news.list, newsOk: () => news.ok };
}
