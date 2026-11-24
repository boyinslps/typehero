/* 抓蟲榜的純計算（node 可以直接 import 測）。
   mg_bugboard/{班級_座號} 的 score／n／firstAt 一律「從 reports＋bonus 重算」，不是累加：
   所以重按、撤銷、補寫都不會算歪（重按不會重複加分）。 */
export const SEV_NAME = { 1: '小', 2: '中', 3: '大' };
export const clampSev = v => Math.max(1, Math.min(3, Math.round(+v) || 1));

/* mg_bugboard（所有學生讀得到）只准放這幾個欄位；老師打的理由與真名放 mg_bugboard_private（只有老師讀得到）。
   每個寫 mg_bugboard 的地方都過 publicBoard()，萬一誰又把 notes／nameOk 混進來，會在寫之前被濾掉。
   reports 每一筆只留 id、st、sev、t、reply（老師回覆：學生會在「我的回報」看到，所以教師頁輸入處有提醒不要寫姓名）。 */
export const BOARD_PUBLIC = ['className', 'seat', 'score', 'n', 'firstAt', 'hideNick', 'bonus', 'reports', 'nameOkH'];
export const PRIVATE_FIELDS = ['notes', 'nameOk'];
export function publicBoard(d) {
  const o = {};
  BOARD_PUBLIC.forEach(k => { if (d && d[k] !== undefined) o[k] = d[k]; });
  if (Array.isArray(o.reports)) o.reports = o.reports.filter(Boolean).map(r => { const x = {}; ['id', 'st', 'sev', 't'].forEach(k => { if (r[k] !== undefined) x[k] = r[k]; }); if (r.reply) x.reply = r.reply; return x; });   // Firestore 不收 undefined
  return o;
}

/* reports＝[{ id, st, sev, reply, t }]；bonus＝老師手動加分的總和；notes＝[{ pts, why, t }]（取自 mg_bugboard_private）
   firstAt：達到這個分數時那則回報的「送出」時間（不是老師確認的時間，老師常一次批完）。
   分數只靠「已確認」往上加（嚴重度至少 1 分），所以達到現在這個分數的，就是送出時間最晚的那則已確認回報。
   完全沒有已確認回報時，用最近一次加分的時間，同分的順序才固定。 */
export function boardCalc(reports, bonus, notes) {
  const ap = (reports || []).filter(r => r && r.st === 'approved').sort((a, b) => (a.t || 0) - (b.t || 0) || (a.id < b.id ? -1 : 1));
  const score = ap.reduce((s, r) => s + clampSev(r.sev), 0) + (+bonus || 0);
  let firstAt = ap.length ? (ap[ap.length - 1].t || 0) : 0;
  if (!ap.length) firstAt = (notes || []).filter(x => x && x.pts > 0).reduce((m, x) => Math.max(m, x.t || 0), 0);
  return { score, n: ap.length, firstAt };
}
/* 這位學生已經被確認幾個（算字元獎勵用：前 BUG_REWARD_MAX 個才有字元） */
export const approvedCount = reports => (reports || []).filter(r => r && r.st === 'approved').length;

/* 回報內容：新資料有 did／what，舊資料只有 text（「【我做了什麼】…\n【錯誤狀況】…」） */
export function bugText(f) {
  if (f.did || f.what) return { did: f.did || '', what: f.what || '' };
  const t = String(f.text || '');
  const m = /【我做了什麼】([\s\S]*?)(?:\n?【錯誤狀況】([\s\S]*))?$/.exec(t);
  return m ? { did: (m[1] || '').trim(), what: (m[2] || '').trim() } : { did: '', what: t };
}
/* 改 reports 裡的一筆（用 id 找；沒有就加）；回新陣列，不改傳進來的 */
export function putReport(reports, entry) {
  const rs = (reports || []).filter(r => r && r.id !== entry.id);
  rs.push(entry);
  return rs;
}
export const dropReport = (reports, id) => (reports || []).filter(r => r && r.id !== id);

/* 「全部採用 Claude 的建議」之前先算好：哪些會處理、哪些略過、每個學生的分數從多少變多少。
   items＝[{ flagId, verdict, sev, dupOf（flag 文件 ID）, reply }]；board＝loadBoard() 的 { 學生 → { reports, bonus, notes } }。
   這裡只算不寫；真正寫入還是一則一則走審核的同一套（確認／重複／不採用），所以分數與信的規則不會分岔。
   coinOf(sev)＝這個嚴重度送幾個字元（nw-data 的 bugCoins，照嚴重度給；不傳就不算 coinTotal，這個檔才不必依賴遊戲資料）。
   「重複」的對象如果是不採用或重複，等於把功勞給一個不算分的回報，不自動處理，請老師個別看。 */
export function planBulk(items, flags, board, rewardMax, coinOf) {
  const ST = ['pending', 'approved', 'rejected', 'dup'], byId = new Map((flags || []).map(f => [f.id, f])), st = f => (ST.includes(f.status) ? f.status : 'pending');
  const sug = new Map((items || []).map(i => [i.flagId, i]));
  const skips = [], ok = [];
  (items || []).forEach(it => {
    const f = byId.get(it.flagId), bad = reason => skips.push({ flagId: it.flagId, reason });
    if (!f) return bad('找不到這則回報');
    if (!f.docId) return bad('沒有學生代號，不能處理');
    if (st(f) !== 'pending') return bad('已經審核過了');
    if (it.verdict === 'dup') {
      const t = byId.get(it.dupOf), ts = sug.get(it.dupOf);
      if (!t || it.dupOf === it.flagId) return bad('找不到「跟哪一則一樣」的那則');
      if (st(t) === 'rejected' || st(t) === 'dup' || (st(t) === 'pending' && ts && ts.verdict !== 'approve')) return bad('「跟哪一則一樣」的那則是不採用或重複，請個別處理');
    }
    ok.push(it);
  });
  /* 同一位學生有好幾則時，前 rewardMax 個確認才有字元，所以要照送出時間先後算 */
  ok.sort((a, b) => (byId.get(a.flagId).t || 0) - (byId.get(b.flagId).t || 0) || (a.flagId < b.flagId ? -1 : 1));
  const proj = {}, counts = { approve: 0, dup: 0, reject: 0 };
  let coinMails = 0, coinTotal = 0, thanksMails = 0, replyMails = 0;
  const stu = id => proj[id] || (proj[id] = (() => { const d = (board && board[id]) || {}, rs = Array.isArray(d.reports) ? d.reports.slice() : []; return { rs, bonus: d.bonus, notes: d.notes, from: boardCalc(rs, d.bonus, d.notes).score }; })());
  ok.forEach(it => {
    const f = byId.get(it.flagId), s = stu(f.docId), e = { id: f.id, t: f.t || 0 };
    if (it.verdict === 'approve') {
      const sev = clampSev(it.sev), coins = approvedCount(s.rs.filter(r => r.id !== f.id)) < rewardMax;
      s.rs = putReport(s.rs, Object.assign(e, { st: 'approved', sev, reply: it.reply || '' }));
      counts.approve++; if (coins) { coinMails++; if (coinOf) coinTotal += coinOf(sev); } else thanksMails++;
      it.coins = coins;
    } else if (it.verdict === 'dup') { s.rs = putReport(s.rs, Object.assign(e, { st: 'dup', sev: 0, reply: '' })); counts.dup++; thanksMails++; }
    else { s.rs = putReport(s.rs, Object.assign(e, { st: 'rejected', sev: 0, reply: it.reply || '' })); counts.reject++; if (it.reply) replyMails++; }
  });
  const students = Object.keys(proj).map(docId => { const s = proj[docId]; return { docId, from: s.from, to: boardCalc(s.rs, s.bonus, s.notes).score }; });
  return { items: ok, skips, students, delta: students.reduce((a, s) => a + (s.to - s.from), 0), counts, coinMails, coinTotal, thanksMails, replyMails };
}
