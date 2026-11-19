/* 活動的純計算（不碰畫面、不碰 Firebase，node 可以直接 import 測）：排行榜名次、⚠ 標記、發獎的信。
   名次與信件 ID 的規則（SPEC §4.2b、§4.4）：
   - 同分的人名次一樣（rank），決定拿哪一級獎品；
   - 但信件固定 ID 用「位置 pos」（1、2、3…不重複），不然同分兩個人會寫到同一封信、後寄的蓋掉先寄的。 */
import { saneScore, sortDir, scoreText, awardTierOf } from './nw.js';

export const clip = (s, n) => { const a = [...String(s || '')]; return a.length > n ? a.slice(0, n).join('') : a.join(''); };
/* 名次分三級：第 1 名／第 2～3 名／第 4～10 名；第 10 名以後沒有名次獎 */
/* 規則本身放在學生端 nw-events.js（學生的「得獎名單」也要用），這裡沿用原名 */
export const tierOf = awardTierOf;
export const TIER_NAME = { t1: '第 1 名', t23: '第 2～3 名', t410: '第 4～10 名' };

/* 一位學生在這個活動的進度（沒參加＝null）。scores＝loadScores() 的列；進度存在存檔 nw.ev.{ID} */
const stOf = (s, id) => { const e = s.raw && s.raw.nw && s.raw.nw.ev; return e && typeof e === 'object' ? (e[id] || null) : null; };

/* 參加的人：回 [{ id, className, seat, nick, s, n, warn }]，沒有分數的 s 是 null。排序：有分數的在前、依活動排序方向 */
export function rankingRows(ev, scores) {
  const rows = [];
  scores.forEach(s => {
    const st = stOf(s, ev.id); if (!st) return;
    const sc = Number.isFinite(st.s) ? st.s : null;
    rows.push({ id: s.id, className: s.className, seat: s.seat, nick: s.nick || '', s: sc, n: Math.max(0, Math.round(+st.n || 0)), warn: sc !== null && !saneScore(ev, sc) });
  });
  const dir = sortDir(ev) === 'asc' ? 1 : -1;
  return rows.sort((a, b) => (a.s === null) - (b.s === null) || (a.s !== null ? (a.s - b.s) * dir : 0) || b.n - a.n || (a.id < b.id ? -1 : 1));
}

/* 依「發獎給他」的勾選，算 rank（同分同名次）與 pos（不重複的位置）。沒勾的人 rank、pos 都是 null。
   名次在勾掉 ⚠ 的人之後才算：被擋下的人不會佔掉別人的名次。 */
export function rankRows(ev, rows, pick) {
  const dir = sortDir(ev) === 'asc' ? 1 : -1;
  const chosen = rows.filter(r => r.s !== null && pick(r));
  let pos = 0;
  return rows.map(r => {
    if (r.s === null || !pick(r)) return Object.assign({}, r, { rank: null, pos: null, pick: false });
    pos++;
    const rank = 1 + chosen.filter(o => (o.s - r.s) * dir < 0).length;
    return Object.assign({}, r, { rank, pos, pick: true });
  });
}

/* 名次快照：寫進 mg_events/{ID}.result。mg_events 全部登入的人都讀得到，所以不放真名：
   只放文件 ID（班級_座號）、暱稱字串、分數、場次、⚠。
   prizes＝{ t1, t23, t410 } 各是 items 陣列；part＝參加獎 items（沒勾就是空陣列）。 */
export function buildSnapshot(ev, rows, pick, prizes, part, now) {
  const ranked = rankRows(ev, rows, pick);
  const slim = ranked.filter(r => r.s !== null).slice(0, 200).map(r => ({ id: r.id, nick: r.nick, s: r.s, n: r.n, warn: r.warn, pick: r.pick, rank: r.rank, pos: r.pos }));
  /* 參加獎：有參加（n>=1）的人都有。被 ⚠ 擋下的人只是不拿名次獎，參加獎還是給（老師 2026-11-17 決定：
     分數可疑不代表他沒有認真打）。只有老師「自己手動取消勾選」的正常分數的人，才連參加獎一起不給。 */
  const blocked = new Set(ranked.filter(r => r.s !== null && !r.pick && !r.warn).map(r => r.id));
  const parts = rows.filter(r => r.n >= 1 && !blocked.has(r.id)).map(r => r.id);
  return { at: now, metric: ev.metric, rows: slim, parts: part.length ? parts : [], prizes: { t1: prizes.t1 || [], t23: prizes.t23 || [], t410: prizes.t410 || [] }, part };
}

/* 依快照產生信。同一份快照永遠產生一模一樣的信（含 t、sendAt＝快照時間），重寄只是覆蓋。 */
export function snapshotMails(ev, snap) {
  const base = { from: '老師', sendAt: snap.at, expireAt: 0, t: snap.at, src: 'event:' + ev.id };
  const mails = [];
  (snap.rows || []).forEach(r => {
    if (!r.pick || !r.pos) return;
    const tier = tierOf(r.rank), items = tier ? ((snap.prizes || {})[tier] || []) : [];
    if (!items.length) return;
    mails.push({ id: `ev_${ev.id}_${r.pos}`, data: Object.assign({ aud: ['id:' + r.id], title: clip(`第 ${r.rank} 名：${ev.title}`, 20),
      body: clip(`「${ev.title}」你拿到第 ${r.rank} 名（${scoreText({ metric: snap.metric }, r.s)}）！你好棒，謝謝你這麼用心！`, 200), items }, base) });
  });
  if ((snap.part || []).length) (snap.parts || []).forEach(id => {
    mails.push({ id: `ev_${ev.id}_p_${id}`, data: Object.assign({ aud: ['id:' + id], title: clip(`參加獎：${ev.title}`, 20),
      body: clip(`謝謝你參加「${ev.title}」！送你一點小禮物。`, 200), items: snap.part }, base) });
  });
  return mails;
}
/* 摘要：給送出前的確認視窗 */
export function snapshotSummary(snap, mails) {
  const n = k => (snap.rows || []).filter(r => r.pick && tierOf(r.rank) === k && ((snap.prizes || {})[k] || []).length).length;
  const parts = [['t1', n('t1')], ['t23', n('t23')], ['t410', n('t410')]].filter(x => x[1]).map(([k, c]) => `${TIER_NAME[k]} ${c} 人`);
  if ((snap.part || []).length) parts.push(`參加獎 ${(snap.parts || []).length} 人`);
  return `共 ${mails.length} 封信：${parts.join('、') || '沒有人要發'}`;
}
