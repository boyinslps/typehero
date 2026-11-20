/* 🤖 匯出待審回報給 Claude 檢查（去識別化），再把 Claude 的建議匯入，在審核畫面預填。

   邏輯（遮蔽、分組、驗證）都是純函式，node 可以直接測；唯一 import 的是不碰網路的小檔
   （export-speed.js、bug-calc.js、ids.js），不能 import fb.js（它有 https import，node 載不進來）。
   UI 需要的 esc／ask／log／toast 由呼叫端用 deps 傳進來。

   去識別化跟 export-speed.js 同一個原則：用「白名單」挑欄位，姓名、座號、班級名稱、docId、
   flag 的文件 ID（它含 docId）、暱稱一律不讀、不輸出。
   學生自己寫的內容可能夾著名字或班級座號，所以內容文字另外做遮蔽（不完美，預覽會讓老師再看一眼）。

   對照表（rid → flag 文件 ID）只放在這個分頁的 sessionStorage 與記憶體：
   不寫 Firestore、不寫進匯出檔、不 console。關掉分頁就沒有了，要重新匯出。 */
import { gradeOf, dateStamp } from './export-speed.js';
import { bugText, clampSev } from './bug-calc.js';
import { idParts } from './ids.js';

export const MASK = '（已遮蔽）';
/* 字元 bigram 的 Jaccard ≥ 0.3 就放同一組。同一個問題不同人用不同說法大約 0.3～0.6，完全不相干的接近 0。
   寧可多分在一起（症狀一樣、原因不同的也會被分進來），最後是不是重複由 Claude 與老師判斷；漏分的話，重複的回報就被當成新問題了。 */
export const DUP_THRESHOLD = 0.3;
export const REPLY_MAX = 60;         // 跟審核視窗的回覆欄 maxlength 一樣
export const NOTE_MAX = 200;
const TEXT_MAX = 300;
const STATUSES = ['pending', 'approved', 'rejected', 'dup'];
const CATS = ['畫面', '按鍵／操作', '題目', '魔物', '其他'];
const VIEW_RE = /^[A-Za-z0-9_-]{1,24}$/;   // view 是程式寫的畫面代號；學生塞不進一個可辨識的字串
const ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // 去掉 I O 0 1，抄的時候不會看錯

/* ── 遮蔽 ── */
const N = '[0-9０-９一二三四五六七八九十兩]';
/* 順序有意義：長的樣式先吃（「五年4班5號」整串一次遮掉，不會剩下「五年」） */
const STOP = '[^\\s，。,.！!？?、；;：:（）()「」『』\\n]';
const PATTERNS = [
  new RegExp(`${N}{1,2}\\s*年\\s*級?\\s*${N}{1,2}\\s*班(?:\\s*${N}{1,3}\\s*[號号])?`, 'g'),
  new RegExp(`${N}{1,3}\\s*班\\s*${N}{1,3}\\s*[號号]`, 'g'),
  new RegExp(`座\\s*[號号]\\s*[:：是]?\\s*${N}{1,3}`, 'g'),
  new RegExp(`${N}{1,3}\\s*[號号]`, 'g'),
  new RegExp(`${N}{1,3}\\s*班`, 'g'),
  /* 「我是○○」共 4～10 字。後面接「在／要／用…」多半是「我是在背包裡點…」這種描述，不是名字，放過 */
  new RegExp(`我是(?![在要想用按打玩從先把去來跟對看點開關進回])${STOP}{2,8}`, 'g'),
  new RegExp(`我叫(?!出)${STOP}{2,4}`, 'g')
];
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* names：老師頁已經讀進來的學生姓名，只用來「找出來遮掉」，不會被輸出。
   樣式遮蔽之後才做（「我是王小明」已經整串遮掉，不會算兩次） */
export function maskText(s, names = []) {
  let n = 0, t = String(s === undefined || s === null ? '' : s);
  const sub = re => { t = t.replace(re, () => { n++; return MASK; }); };
  PATTERNS.forEach(sub);
  const nm = [...new Set((names || []).map(x => String(x || '').trim()).filter(x => [...x].length >= 2))].sort((a, b) => b.length - a.length);
  if (nm.length) sub(new RegExp(nm.map(escRe).join('|'), 'gi'));
  return { text: t, n };
}

/* ── 相似度與分組 ── */
const gramsOf = s => {
  const t = Array.from(String(s || '').split(MASK).join('').replace(/[\s　，。,.！!？?、；;：:「」『』（）()[\]【】"'～~—…-]/g, '').toLowerCase()), g = new Set();
  for (let i = 0; i < t.length - 1; i++) g.add(t[i] + t[i + 1]);
  return g;
};
export const jaccard = (a, b) => {
  if (!a.size || !b.size) return 0;   // 太短（不到兩個字）湊不出 bigram，就不跟任何人分到同一組
  let i = 0; a.forEach(x => { if (b.has(x)) i++; });
  return i / (a.size + b.size - i);
};

/* ── 隨機 ── */
function randBytes(n) { const a = new Uint8Array(n); globalThis.crypto.getRandomValues(a); return a; }   // 沒有就讓它報錯，不退回 Math.random（會被預測）
function newCode(len, used) {
  for (;;) {
    let s = ''; for (const x of randBytes(len)) s += ID_CHARS[x % ID_CHARS.length];
    if (!used.has(s)) { used.add(s); return s; }
  }
}

const p2 = n => String(n).padStart(2, '0');
const fmtT = ms => { const d = new Date(ms); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`; };
const clip = (s, n) => [...String(s || '')].slice(0, n).join('');

export const FIELD_DOC = {
  rid: '隨機編號（每次匯出重新產生，只對這一次匯出有效）',
  grade: '回報者的年級：四／五／六，看不出來是 ?',
  n: '回報者目前被確認的抓蟲件數（看他過去回報的品質；不是身分）',
  score: '回報者目前的抓蟲分數',
  status: 'pending＝待審（要給建議）；approved／rejected／dup＝老師已審過（只拿來比對有沒有重複，不用給建議）',
  sev: '已確認的回報，老師給的嚴重度 1～3',
  cat: '學生選的問題分類', did: '學生寫的「我做了什麼事」（姓名、班級座號已盡量遮蔽）', what: '學生寫的「出現什麼錯誤狀況」（同上）',
  view: '送出時在遊戲的哪個畫面（程式代號）', t: '送出時間（本機時區，只到分鐘）',
  dupGroup: '文字相近的回報分在同一組（組號隨機）；沒有相近的回報就是 null',
  earliest: '同一組裡送出最早的那一則（true）；第一個回報的人才算分'
};
export const NOTE = '已去識別化；rid 只對這一次匯出有效';
export const TASK = '你是國小打字遊戲「打字勇者」的抓蟲回報審核助手。請逐則判斷 status 是 pending 的回報：'
  + '① 是不是真的遊戲問題（approve）；② 是不是重複（dup，dupOf 填同組最早那則或已審過那則的 rid）；③ 不採用（reject：亂寫、看不出哪裡壞、不是遊戲問題、本來就是這樣設計）。'
  + 'approve 要給 sev：1＝小（錯字、小瑕疵）、2＝中（功能不正常但還能玩）、3＝大（卡住、無法繼續、資料不見）。'
  + 'n、score 只用來參考這位回報者過去的品質，不要寫進理由。status 不是 pending 的只拿來比對重複，不用回。'
  + `note 給老師看（${NOTE_MAX} 字內）；reply 是建議回給學生的一句話（可省略，${REPLY_MAX} 字內，國小生看得懂，所有同學都可能看到，不要寫任何名字）。`
  + '只回傳 JSON：{"suggestions":[{"rid":"…","verdict":"approve|reject|dup","sev":1,"dupOf":"（verdict 是 dup 才要）","note":"…","reply":"…"}]}';

/* 組出整份匯出。flags：data.js loadFlags() 的列；board：loadBoard() 的 { 班級_座號 → 資料 }。
   回 { data, map（rid → flag 文件 ID，絕對不能放進 data）, masked, skippedNoId }。每次呼叫都重新發編號 */
export function buildBugExport(flags, board, o = {}) {
  const names = o.names || [], thr = typeof o.threshold === 'number' ? o.threshold : DUP_THRESHOLD, bd = board || {};
  let masked = 0, skippedNoId = 0;
  const items = [];
  (flags || []).forEach(f => {
    if (!f || f.type !== 'bug') return;
    const st = STATUSES.includes(f.status) ? f.status : 'pending';   // 跟審核頁一樣：不認得的狀態算待審
    if (st !== 'pending' && !o.includeReviewed) return;
    if (!f.docId) { if (st === 'pending') skippedNoId++; return; }   // 沒有學生代號的回報老師也不能處理，給 Claude 看沒有意義
    const tx = bugText(f), d = maskText(clip(tx.did, TEXT_MAX), names), w = maskText(clip(tx.what, TEXT_MAX), names);
    masked += d.n + w.n;
    const b = bd[f.docId] || {};
    items.push({
      f, st, did: d.text, what: w.text, grams: gramsOf(d.text + ' ' + w.text), t: +f.t || 0,
      n: Math.max(0, Math.round(+b.n) || 0), score: Math.round(+b.score) || 0
    });
  });
  /* 相似的連成一組（union-find：A 像 B、B 像 C，三則同一組） */
  const par = items.map((_, i) => i), find = i => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) if (jaccard(items[i].grams, items[j].grams) >= thr) par[find(j)] = find(i);
  const comps = new Map();
  items.forEach((it, i) => { const r = find(i); if (!comps.has(r)) comps.set(r, []); comps.get(r).push(it); });
  const used = new Set(), groups = [...comps.values()];
  groups.forEach(g => g.sort((a, b) => a.t - b.t || (a.f.id < b.f.id ? -1 : 1)));
  /* 依各組最早送出的時間排；不照座號或文件 ID 排，順序不洩漏身分 */
  groups.sort((a, b) => a[0].t - b[0].t);
  const map = {}, rows = [];
  groups.forEach(g => {
    const gid = g.length > 1 ? 'G' + newCode(3, used) : null;
    g.forEach((it, k) => {
      const rid = newCode(8, used); map[rid] = it.f.id;
      const f = it.f, row = { rid, grade: gradeOf(f.cls || idParts(f.docId).className), n: it.n, score: it.score, status: it.st };
      if (it.st === 'approved') row.sev = clampSev(f.sev);
      if (CATS.includes(f.cat)) row.cat = f.cat;
      row.did = it.did; row.what = it.what;
      if (typeof f.view === 'string' && VIEW_RE.test(f.view)) row.view = f.view;
      if (it.t) row.t = fmtT(it.t);
      row.dupGroup = gid;
      if (gid && k === 0) row.earliest = true;
      rows.push(row);
    });
  });
  const d = o.date || new Date();
  return {
    data: {
      meta: {
        exportedAt: `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`, appVersion: o.appVersion || '?', count: rows.length,
        pending: rows.filter(r => r.status === 'pending').length, maskedCount: masked, dupThreshold: thr, note: NOTE, fields: FIELD_DOC, task: TASK
      },
      rows
    },
    map, masked, skippedNoId
  };
}
/* 一列一行：貼給 Claude 比較省字，也比較好讀；仍然是合法 JSON */
export const toText = d => `{\n"meta": ${JSON.stringify(d.meta, null, 1)},\n"rows": [\n${d.rows.map(r => JSON.stringify(r)).join(',\n')}\n]\n}`;
export const fileName = (d = new Date()) => `typehero-bugs-${dateStamp(d)}.json`;

/* ── 對照表與建議的暫存：只在這個分頁 ──
   sessionStorage 在無痕視窗、被封鎖時會丟錯，所以全部包 try/catch，並且在記憶體也放一份：
   存不進去也還能用到分頁關掉為止。 */
const K_MAP = 'typehero.bugExportMap', K_SUG = 'typehero.bugSuggest';
const mem = {};
const ss = () => { try { return globalThis.sessionStorage || null; } catch (e) { return null; } };
const rd = k => { try { const s = ss(), v = s && s.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } };
const wr = (k, v) => { try { const s = ss(); if (s) s.setItem(k, JSON.stringify(v)); } catch (e) { /* 存不進去就只留記憶體 */ } };
export function saveMap(map) { mem.map = { at: Date.now(), map }; wr(K_MAP, mem.map); }
export function loadMap() { const m = mem.map || rd(K_MAP); return m && m.map && typeof m.map === 'object' ? m : null; }
export function loadSugg() { const s = mem.sugg || rd(K_SUG); return s && typeof s === 'object' && !Array.isArray(s) ? s : {}; }
export function saveSugg(o) { mem.sugg = o; wr(K_SUG, o); }
export function dropSugg(flagId) { const s = Object.assign({}, loadSugg()); delete s[flagId]; saveSugg(s); }
export const clearSugg = () => saveSugg({});
/* 測試用：模擬「關掉分頁再開」只要 sessionStorage.clear() 加重新整理；這個清記憶體那一份 */
export function _resetMem() { delete mem.map; delete mem.sugg; }

/* ── 匯入 Claude 的建議：驗證 ── */
const VERDICTS = ['approve', 'reject', 'dup'];
export const VERDICT_NAME = { approve: '確認', reject: '不採用', dup: '重複' };
const MAX_ROWS = 500;
/* Claude 常常用 ```json 包起來、前後多一句話；盡量吃得進去 */
export function extractJson(text) {
  const t = String(text || '').trim();
  try { return JSON.parse(t); } catch (e) { /* 往下試 */ }
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(t);
  if (fence) { try { return JSON.parse(fence[1].trim()); } catch (e) { /* 往下試 */ } }
  const a = t.search(/[{[]/), z = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'));
  if (a >= 0 && z > a) { try { return JSON.parse(t.slice(a, z + 1)); } catch (e) { /* 往下試 */ } }
  throw new Error('不是正確的 JSON');
}
export const NO_MAP_MSG = '找不到編號對照表。對照表只存在「匯出的那個分頁」，關掉分頁就沒有了。請重新按「匯出待審回報」，把新匯出的內容再貼給 Claude，拿到新的建議後再匯入。';

/* ctx: { map（loadMap().map）, statusOf(flagId)→'pending'|'approved'|…|null（找不到）, mask(text)→{text,n} }
   回 { fatal?, accepted:[{ rid, flagId, verdict, sev, dupOf（flagId）, dupOfRid, note, reply, warn }], skipped:[{ row, rid, reason }] }
   不合法的列略過、寫出原因；整份壞掉（不是 JSON、沒有對照表）才是 fatal。 */
export function parseSuggestions(text, ctx) {
  const map = ctx && ctx.map;
  if (!map || !Object.keys(map).length) return { fatal: NO_MAP_MSG, accepted: [], skipped: [] };
  if (!String(text || '').trim()) return { fatal: '還沒貼上內容。請把 Claude 回傳的 JSON 貼進來，或選擇檔案。', accepted: [], skipped: [] };
  let j;
  try { j = extractJson(text); } catch (e) { return { fatal: '不是正確的 JSON，讀不進來。請 Claude 只回傳 JSON，貼的時候不要漏掉最前面的「{」和最後面的「}」。', accepted: [], skipped: [] }; }
  const arr = Array.isArray(j) ? j : (j && Array.isArray(j.suggestions) ? j.suggestions : null);
  if (!arr) return { fatal: '格式不對：最外層要是 {"suggestions": [ … ]}。', accepted: [], skipped: [] };
  if (!arr.length) return { fatal: 'suggestions 是空的，沒有可以匯入的建議。', accepted: [], skipped: [] };
  const accepted = [], skipped = [], seen = new Set(), mask = (ctx && ctx.mask) || (s => ({ text: s, n: 0 }));
  arr.slice(0, MAX_ROWS).forEach((x, i) => {
    const row = i + 1, bad = (rid, reason) => skipped.push({ row, rid: rid || '', reason });
    if (!x || typeof x !== 'object' || Array.isArray(x)) return bad('', '這一列不是物件');
    if (typeof x.rid !== 'string' || !x.rid.trim()) return bad('', '缺少 rid（編號）');
    const rid = x.rid.trim().toUpperCase();
    if (!Object.prototype.hasOwnProperty.call(map, rid)) return bad(rid, '這個編號不在目前的對照表裡（可能重新匯出過，編號換了，請用最新匯出的內容再問一次 Claude）');
    if (seen.has(rid)) return bad(rid, '同一個編號出現第二次，只用第一列');
    if (!VERDICTS.includes(x.verdict)) return bad(rid, 'verdict 要是 approve、reject、dup 其中一個');
    const flagId = map[rid], st = ctx.statusOf ? ctx.statusOf(flagId) : 'pending';
    if (st === null || st === undefined) return bad(rid, '找不到這則回報（可能被刪掉了）');
    if (st !== 'pending') return bad(rid, '這則已經審核過了，不接受建議');
    let sev = 0, dupOf = '', dupOfRid = '';
    if (x.verdict === 'approve') {
      if (typeof x.sev !== 'number' || !Number.isInteger(x.sev) || x.sev < 1 || x.sev > 3) return bad(rid, 'approve 的 sev 要是 1、2、3 其中一個整數');
      sev = x.sev;
    }
    if (x.verdict === 'dup') {
      if (typeof x.dupOf !== 'string' || !x.dupOf.trim()) return bad(rid, 'dup 要用 dupOf 寫出跟哪一則一樣');
      dupOfRid = x.dupOf.trim().toUpperCase();
      if (dupOfRid === rid) return bad(rid, '不能跟自己重複');
      if (!Object.prototype.hasOwnProperty.call(map, dupOfRid)) return bad(rid, `dupOf（${dupOfRid}）不在這批匯出裡`);
      dupOf = map[dupOfRid];
      if (ctx.statusOf && (ctx.statusOf(dupOf) === null || ctx.statusOf(dupOf) === undefined)) return bad(rid, '「跟哪一則一樣」的那則找不到了');
    }
    if (x.note !== undefined && typeof x.note !== 'string') return bad(rid, 'note 要是文字');
    if (x.reply !== undefined && typeof x.reply !== 'string') return bad(rid, 'reply 要是文字');
    /* note、reply 也走遮蔽：Claude 有時會把名字抄進理由；reply 會被所有同學看到 */
    /* 先遮蔽再截斷：「（已遮蔽）」比原本的名字長，先截斷再遮蔽會超過字數上限 */
    const cl = (v, n) => { const m = mask(String(v || '').trim()); return { text: clip(m.text, n), n: m.n }; }, nm = cl(x.note, NOTE_MAX), rp = cl(x.reply, REPLY_MAX);
    const warn = [];
    if (nm.n || rp.n) warn.push(`理由或回覆裡有 ${nm.n + rp.n} 處像姓名或班級座號，已遮蔽`);
    if ([...String(x.reply || '')].length > REPLY_MAX) warn.push(`回覆太長，已截成 ${REPLY_MAX} 字`);
    seen.add(rid);
    accepted.push({ rid, flagId, verdict: x.verdict, sev, dupOf, dupOfRid, note: nm.text, reply: x.verdict === 'dup' ? '' : rp.text, warn });
  });
  if (arr.length > MAX_ROWS) skipped.push({ row: MAX_ROWS + 1, rid: '', reason: `一次最多匯入 ${MAX_ROWS} 列，後面的沒有讀` });
  return { accepted, skipped };
}

/* ── 畫面 ──
   deps: { esc, ask, log, toast, getFlags(), getBoard(), getNames?(), statusOf(flagId), pendingSuggCount(),
           onImport(accepted), onClear(), applyAll(), appVersion?, download?, copy? }
   回 { repaint }：審核動作之後呼叫，讓「現在有幾則待審」與「全部採用」的狀態跟著變 */
function saveFile(name, text, mime) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (e) { /* 沒權限就用舊方法 */ }
  try { const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;left:-9999px;opacity:0'; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok; } catch (e) { return false; }
}
export function mountBugExport(box, deps) {
  const { esc, ask, log, toast } = deps;
  let cur = null, lastRes = null;
  box.innerHTML = `<p style="margin:0 0 6px">審核之前，可以把待審的回報（<b>去識別化</b>）貼給 Claude 看一遍：是不是真的問題、是不是重複、建議給幾分。
      Claude 的建議<b>只會顯示在每則回報旁邊</b>，不會自己寫進去；要按原本的「確認」才算數。</p>
    <div class="row"><label class="chk"><input type="checkbox" data-bx-rev> 連已經審過的也匯出（用來比對重複）</label></div>
    <div data-bx-status></div>
    <div class="row" style="margin-top:6px"><button class="px-btn gold" data-bx="build">匯出待審回報</button></div>
    <div data-bx-out></div>
    <div style="margin-top:12px"><b>匯入 Claude 的建議</b></div>
    <textarea class="inp" data-bx-in rows="4" placeholder='把 Claude 回傳的 JSON 貼在這裡，例如 {"suggestions":[{"rid":"AB12CD34","verdict":"approve","sev":2,"note":"…"}]}' style="margin-top:4px"></textarea>
    <div class="row" style="margin-top:6px"><button class="px-btn gold" data-bx="import">匯入建議</button>
      <label class="px-btn" style="cursor:pointer">選擇檔案<input type="file" accept=".json,.txt,application/json,text/plain" data-bx-file hidden></label>
      <button class="px-btn" data-bx="clear">清除全部建議</button></div>
    <div data-bx-res></div><div data-bx-all style="margin-top:8px"></div>`;
  const $q = s => box.querySelector(s);

  const counts = () => {
    const bugs = (deps.getFlags() || []).filter(f => f && f.type === 'bug' && f.docId), st = f => (STATUSES.includes(f.status) ? f.status : 'pending');
    return { pending: bugs.filter(f => st(f) === 'pending').length, reviewed: bugs.filter(f => st(f) !== 'pending').length };
  };
  function repaint() {
    const c = counts(), rev = $q('[data-bx-rev]').checked, none = rev ? c.pending + c.reviewed === 0 : c.pending === 0;
    $q('[data-bx-status]').innerHTML = none
      ? `<div class="note" data-bx-empty>${rev ? '還沒有任何回報，所以沒有東西可以匯出。' : '目前沒有待審核的回報，所以沒有東西可以匯出。（想拿已經審過的來比對重複，可以勾上面的選項。）'}</div>`
      : `<div class="dim" data-bx-count>現在有 <b>${c.pending}</b> 則待審核${c.reviewed ? `、${c.reviewed} 則已經審過` : ''}。</div>`;
    $q('[data-bx="build"]').disabled = none;
    $q('[data-bx="build"]').textContent = cur ? '重新匯出（換一組編號）' : '匯出待審回報';
    const k = deps.pendingSuggCount();
    $q('[data-bx-all]').innerHTML = k > 0
      ? `<div class="note" data-bx-allbox>有 <b>${k}</b> 則待審回報帶著 Claude 的建議。一則一則看、按「採用這個建議」最穩；也可以 <button class="px-btn sm gold" data-bx="all">全部採用建議（${k} 則）</button>（會先讓你看總分變化再確認）。</div>` : '';
  }
  function paintOut() {
    if (!cur) { $q('[data-bx-out]').innerHTML = ''; return; }
    const m = cur.ex.data.meta, g = new Set(cur.ex.data.rows.map(r => r.dupGroup).filter(Boolean)).size;
    $q('[data-bx-out]').innerHTML = `<div class="note" data-bx-sum>
        <div data-bx-total><b>${m.count} 則</b>會被匯出（待審 ${m.pending} 則${m.count - m.pending ? `、已審過 ${m.count - m.pending} 則` : ''}）${g ? `，其中有 ${g} 組文字相近的回報（可能是同一個問題）` : ''}。${cur.ex.skippedNoId ? `另有 ${cur.ex.skippedNoId} 則沒有學生代號，不能處理，沒有匯出。` : ''}</div>
        <div data-bx-masked><b>共遮蔽 ${m.maskedCount} 處</b>像姓名或班級座號的字（顯示成「${MASK}」）。</div>
        <div class="warn" style="margin-top:4px">遮蔽不是百分之百，請把下面的內容大致看一下，有看到名字或班級就先自己改掉再貼出去。</div>
        <div class="warn" data-bx-keep>匯入建議之前，請不要關掉這個分頁、不要重新整理：編號和回報的對照只存在這個分頁，沒有存到網路上。</div></div>
      <details data-bx-view><summary>看匯出的內容</summary><pre class="dim" data-bx-pre style="margin:6px 0;white-space:pre-wrap;overflow-wrap:anywhere;font-size:.8em;max-height:260px;overflow:auto">${esc(cur.text)}</pre></details>
      <div class="row"><button class="px-btn gold" data-bx="dl">下載 JSON</button><button class="px-btn gold" data-bx="copy">複製成文字（貼給 Claude）</button></div>`;
  }
  function paintRes() {
    const r = lastRes, el = $q('[data-bx-res]');
    if (!r) { el.innerHTML = ''; return; }
    if (r.fatal) { el.innerHTML = `<div class="note bad" data-bx-err>${esc(r.fatal)}</div>`; return; }
    const by = v => r.accepted.filter(a => a.verdict === v).length;
    el.innerHTML = (r.accepted.length ? `<div class="note" data-bx-ok>已匯入 <b>${r.accepted.length}</b> 則建議（確認 ${by('approve')}・重複 ${by('dup')}・不採用 ${by('reject')}）。還<b>沒有寫進資料庫</b>：到下面每則回報旁邊看，按「採用這個建議」預填，再按「確認」才算數。${r.accepted.some(a => a.warn.length) ? `<div class="warn" data-bx-warn>${r.accepted.filter(a => a.warn.length).map(a => esc(a.warn.join('；'))).join('<br>')}</div>` : ''}</div>` : '')
      + (r.skipped.length ? `<div class="note bad" data-bx-skip>略過 ${r.skipped.length} 列：<ul style="margin:4px 0 0;padding-left:1.2em">${r.skipped.map(s => `<li>第 ${s.row} 列${s.rid ? `（${esc(s.rid)}）` : ''}：${esc(s.reason)}</li>`).join('')}</ul></div>` : '');
  }

  async function build() {
    if (loadMap() && !await ask('重新匯出？', '<p>重新匯出會換一組新的編號，<b>之前那份內容的編號就不能用了</b>。</p><p>如果你已經把之前那份貼給 Claude、還沒匯入建議，請先按「先不要」，把建議匯入再說。</p>', '重新匯出', '先不要')) return;
    const ex = buildBugExport(deps.getFlags(), deps.getBoard(), { includeReviewed: $q('[data-bx-rev]').checked, names: deps.getNames ? deps.getNames() : [], appVersion: typeof deps.appVersion === 'function' ? deps.appVersion() : deps.appVersion });
    if (!ex.data.rows.length) { toast('沒有可以匯出的回報', true); repaint(); return; }
    saveMap(ex.map);
    cur = { ex, text: toText(ex.data) };
    paintOut(); repaint(); toast('匯出內容準備好了，先看一下遮蔽的地方');
  }
  async function leave(kind) {
    if (!cur) return;
    const n = cur.ex.data.meta.count;
    if (kind === 'dl') (deps.download || saveFile)(fileName(), cur.text, 'application/json');
    else if (!await (deps.copy || copyText)(cur.text)) { toast('複製失敗。請展開「看匯出的內容」，自己選取全部複製，或改用下載。', true); return; }
    /* 紀錄只寫則數，不寫內容 */
    await log('export', 'bugs', `匯出待審回報 ${n} 則`);
    toast(kind === 'dl' ? '已下載' : '已複製，貼給 Claude 吧');
  }
  function doImport(text) {
    const names = deps.getNames ? deps.getNames() : [];
    const m = loadMap();
    lastRes = parseSuggestions(text, { map: m && m.map, statusOf: deps.statusOf, mask: s => maskText(s, names) });
    paintRes();
    if (lastRes.accepted.length) { deps.onImport(lastRes.accepted); toast(`已匯入 ${lastRes.accepted.length} 則建議`); }
    repaint();
  }

  box.addEventListener('click', async e => {
    const b = e.target.closest('[data-bx]'); if (!b || b.disabled) return;
    const k = b.dataset.bx;
    if (k === 'build') await build();
    else if (k === 'dl' || k === 'copy') await leave(k);
    else if (k === 'import') doImport($q('[data-bx-in]').value);
    else if (k === 'clear') {
      if (!Object.keys(loadSugg()).length && !lastRes) { toast('目前沒有建議'); return; }
      if (!await ask('清除全部建議？', '<p>只是把畫面上的建議清掉，不會動到任何回報。</p>', '清除', '先不要')) return;
      deps.onClear(); lastRes = null; paintRes(); repaint(); toast('已清除建議');
    } else if (k === 'all') await deps.applyAll();
  });
  box.addEventListener('change', async e => {
    if (e.target.matches('[data-bx-rev]')) {
      repaint();
      if (cur) toast('選項改了：按「重新匯出」才會套用', false);
    } else if (e.target.matches('[data-bx-file]')) {
      const f = e.target.files && e.target.files[0]; if (!f) return;
      try { const t = await f.text(); $q('[data-bx-in]').value = t; doImport(t); } catch (er) { toast('讀不到這個檔案', true); }
      e.target.value = '';
    }
  });
  repaint();
  return { repaint };
}
