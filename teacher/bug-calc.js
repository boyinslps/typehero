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
