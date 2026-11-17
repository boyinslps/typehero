/* 一次搬移（SPEC §1.8 第 4 步，v3.2 版）：舊程式把「已確認的回報」與「職業除錯師」記在 mg_nw_flags、
   由學生進村時自己領（claimed）。新規則下學生不能讀 flags，所以老師按一次：
   ① 用「全部已確認」的 bug flags（包括學生早就領過的）建 mg_bugboard 的 score／n／firstAt／reports；
   ② 只有「已確認但還沒領」的，才轉成獎勵信（固定 ID bug_{flagID}／award_{flagID}）。
   這支是純函式，不碰 Firestore，可以在 node 直接測；寫入在 tab-settings.js。
   重按不會重複：信的 ID 固定、已存在的信不再寫；分數每次都是「從 flags 重新算」，不是累加。 */
import { BUG_COINS, BUG_REWARD_MAX } from './nw.js';
import { idParts } from './ids.js';

const clampSev = v => Math.max(1, Math.min(3, Math.round(+v) || 1));   // 舊資料沒有 sev 算 1 分
export const MAIL_BUG_TITLE = '謝謝你幫忙抓蟲';
export const MAIL_AWARD_TITLE = '職業除錯師';

/* flags：mg_nw_flags 全部；board：{ id → mg_bugboard 現有資料 }；mailIds：mg_mail 已有的 ID（Set）；now：毫秒 */
export function planMigration(flags, board, mailIds, now) {
  const approved = flags.filter(f => f.type === 'bug' && f.status === 'approved' && f.docId)
    .sort((a, b) => (a.t || 0) - (b.t || 0) || (a.id < b.id ? -1 : 1));
  const byStu = new Map();
  approved.forEach(f => { if (!byStu.has(f.docId)) byStu.set(f.docId, []); byStu.get(f.docId).push(f); });

  const boards = [], mails = [], stats = { students: 0, bugs: approved.length, score: 0, mailCoins: 0, mailThanks: 0, mailAward: 0, skipped: 0, awardsAll: 0 };
  for (const [id, list] of byStu) {
    const old = board[id] || {}, p = idParts(id), first = list[0];
    const sevSum = list.reduce((s, f) => s + clampSev(f.sev), 0);
    const bonus = +old.bonus || 0;
    const ids = new Set(list.map(f => f.id));
    const keep = (Array.isArray(old.reports) ? old.reports : []).filter(r => r && !ids.has(r.id));
    const reports = keep.concat(list.map(f => ({ id: f.id, st: 'approved', sev: clampSev(f.sev), reply: String(f.reply || ''), t: f.t || 0 })));
    boards.push({ id, data: {
      className: first.cls || old.className || p.className, seat: first.seat !== undefined && first.seat !== '' ? +first.seat : (old.seat !== undefined ? old.seat : p.seat),
      score: sevSum + bonus, n: list.length, firstAt: list[list.length - 1].t || 0, reports } });
    stats.students++; stats.score += sevSum;
    list.forEach((f, i) => {
      if (f.claimed) return;                       // 學生已經領過了，不再寄
      const mid = 'bug_' + f.id;
      if (mailIds.has(mid)) { stats.skipped++; return; }
      /* 規則跟舊的 claimBugs() 一樣：這位學生被確認的第 1～BUG_REWARD_MAX 個才有字元，之後只寄感謝 */
      const coins = i < BUG_REWARD_MAX;
      mails.push({ id: mid, data: {
        aud: ['id:' + id], title: MAIL_BUG_TITLE,
        body: coins ? `老師確認了你回報的問題，幫了大忙！送你 ${BUG_COINS} 字元。` : '老師確認了你回報的問題，幫了大忙，謝謝你！',
        items: coins ? [{ type: 'coins', n: BUG_COINS }] : [], from: '老師', sendAt: now, expireAt: 0, t: now, src: 'bug' } });
      coins ? stats.mailCoins++ : stats.mailThanks++;
    });
  }
  /* 已頒發的職業除錯師：沒領的才補寄 word bugking */
  flags.filter(f => f.type === 'award' && f.status === 'approved' && f.award === 'bugking' && f.docId).forEach(f => {
    stats.awardsAll++;
    if (f.claimed) return;
    const mid = 'award_' + f.id;
    if (mailIds.has(mid)) { stats.skipped++; return; }
    mails.push({ id: mid, data: { aud: ['id:' + f.docId], title: MAIL_AWARD_TITLE, body: '你是抓蟲抓得最多的人，老師頒給你特別稱號「職業除錯師」！到背包的稱號裡就能戴上。',
      items: [{ type: 'word', key: 'bugking' }], from: '老師', sendAt: now, expireAt: 0, t: now, src: 'award' } });
    stats.mailAward++;
  });
  return { boards, mails, stats };
}
