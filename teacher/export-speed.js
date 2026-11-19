/* 📊 匯出打字速度（匿名）：把 mg_scores 去識別化後給老師下載，拿來校準 tools/nw-sim 的平衡模擬器。

   這支刻意不 import 任何東西（包含 util.js／fb.js）：
   - 匯出邏輯要能在 node 直接測，fb.js 有 https import，node 載不進來（跟 migrate.js 同樣的理由）。
   - UI 需要的 esc／ask／log／toast 由呼叫端用 deps 傳進來。

   去識別化的原則是「白名單」：只從學生資料裡挑名單上的欄位、而且型別對了才輸出。
   不用「刪掉姓名、座號…」的黑名單，因為之後遊戲新增的欄位（例如自由輸入的字串）不會因此意外漏出去。
   姓名、座號、班級名稱、docId、暱稱一律不讀。 */

/* 字串欄位（武器、層級）與物件的鍵只收這種長相：學生在存檔裡塞不出一個可辨識的字串 */
const KEY_RE = /^[A-Za-z0-9_]{1,24}$/;
const ZK_RE = /^[A-Za-z0-9_]{1,24}:\d{1,2}$/;   // fastest 的「區域:星級」、fastMk 的「魔物:星級」
const TIERS = ['A', 'B', 'C', 'D'];
const GRADE_NUM = { 四: '四', 五: '五', 六: '六', 4: '四', 5: '五', 6: '六' };
export const MIN_GRADE = 5;     // 整個年級少於這個人數，個別列的年級改成 '?'
export const MIN_SUMMARY = 3;   // 摘要裡一組至少要有這麼多人才單獨列
const SUM_FIELDS = ['bestWpm', 'lastWpm', 'bestAcc', 'lastAcc'];
const TYPING_NUM = ['bestWpm', 'lastWpm', 'bestAcc', 'lastAcc', 'plays', 'bestLevel', 'bestScore'];
const NW_NUM = ['hr', 'hunts'];
const STAT_NUM = ['wins', 'fails', 'accN', 'accSum', 'dodgeOk', 'dodgeAll', 'defOk', 'defAll'];
const NW_MAPS = ['fastest', 'fastMk', 'dex', 'used', 'wwin'];

const num = v => (typeof v === 'number' && Number.isFinite(v)) ? v : undefined;
const r2 = v => Math.round(v * 100) / 100;

/* 年級從班級名稱取（「五年級3班」→「五」），班級名稱本身不會輸出 */
export function gradeOf(className) {
  const m = /([四五六456])\s*年級/.exec(String(className || ''));
  return m ? GRADE_NUM[m[1]] : '?';
}

/* 隨機編號：用密碼學亂數，不從 docId 算（雜湊可以被拿名單反推），而且不留對照表 */
function randBytes(n) {
  const a = new Uint8Array(n);
  globalThis.crypto.getRandomValues(a);   // 瀏覽器與 node 20+ 都有；沒有就讓它直接報錯，不退回 Math.random（會被預測）
  return a;
}
const ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // 去掉 I O 0 1，抄的時候不會看錯
function newId(used) {
  for (;;) {
    const b = randBytes(8);
    let s = ''; for (const x of b) s += ID_CHARS[x % ID_CHARS.length];
    if (!used.has(s)) { used.add(s); return s; }
  }
}
/* 洗牌：scores 是照「班級＋座號」排好的，若直接照順序輸出，拿座號表對一下列的順序就能反推誰是誰 */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const b = randBytes(4), j = ((b[0] << 24 | b[1] << 16 | b[2] << 8 | b[3]) >>> 0) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickMap(src, keyRe) {
  if (!src || typeof src !== 'object' || Array.isArray(src)) return undefined;
  const o = {};
  Object.keys(src).sort().forEach(k => { const v = num(src[k]); if (keyRe.test(k) && v !== undefined) o[k] = v; });
  return Object.keys(o).length ? o : undefined;
}

/* 一個學生 → 一列（沒有 id、grade）。欄位缺漏就省略；全部都沒有就回 null（沒有東西可校準，不佔人數） */
export function pickRow(s) {
  const raw = (s && s.raw) || {}, row = {};
  TYPING_NUM.forEach(k => { const v = num(raw[k]); if (v !== undefined) row[k] = v; });
  if (TIERS.includes(raw.tier)) row.tier = raw.tier;
  if (typeof raw.lastWeapon === 'string' && KEY_RE.test(raw.lastWeapon)) row.lastWeapon = raw.lastWeapon;
  const bw = pickMap(raw.byWeapon, KEY_RE); if (bw) row.byWeapon = bw;
  if (s && s.played && s.nw) {
    const n = s.nw, nw = {};
    NW_NUM.forEach(k => { const v = num(n[k]); if (v !== undefined) nw[k] = v; });
    const st = n.stat || {};
    STAT_NUM.forEach(k => { const v = num(st[k]); if (v !== undefined) nw[k] = v; });
    NW_MAPS.forEach(k => { const m = pickMap(n[k], k === 'fastest' || k === 'fastMk' ? ZK_RE : KEY_RE); if (m) nw[k] = m; });
    /* dex 只留打倒過的魔物（次數 > 0）；沒打過的不是資料，是空格 */
    if (nw.dex) { Object.keys(nw.dex).forEach(k => { if (!(nw.dex[k] > 0)) delete nw.dex[k]; }); if (!Object.keys(nw.dex).length) delete nw.dex; }
    if (Object.keys(nw).length) row.nw = nw;
  }
  return Object.keys(row).length ? row : null;
}

/* ── 統計 ── */
/* 百分位數用線性內插（跟 Excel 的 PERCENTILE.INC 一樣），人少的班不會跳格 */
export function percentile(sorted, p) {
  if (!sorted.length) return null;
  const x = (sorted.length - 1) * p, lo = Math.floor(x), hi = Math.ceil(x);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (x - lo);
}
export function stats(values) {
  const v = values.filter(x => typeof x === 'number' && Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return { n: 0 };
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  return { n: v.length, mean: r2(mean), median: r2(percentile(v, .5)), p10: r2(percentile(v, .1)), p25: r2(percentile(v, .25)), p75: r2(percentile(v, .75)), p90: r2(percentile(v, .9)) };
}
function groupSummary(rows) {
  const o = { n: rows.length };
  SUM_FIELDS.forEach(f => { o[f] = stats(rows.map(r => r[f])); });
  return o;
}
export function summarize(rows) {
  const byGrade = {};
  rows.forEach(r => { (byGrade[r.grade] = byGrade[r.grade] || []).push(r); });
  const grades = {};
  Object.keys(byGrade).sort().forEach(g => { if (byGrade[g].length >= MIN_SUMMARY) grades[g] = groupSummary(byGrade[g]); });
  return { all: groupSummary(rows), grades };
}

export const FIELD_DOC = {
  id: '隨機編號（每次匯出重新產生，沒有對照表）',
  grade: '年級：四／五／六；年級不足 5 人或看不出年級的合併成 ?',
  bestWpm: '歷史最高打字速度（字/分）', lastWpm: '最近一場打字速度（字/分）',
  bestAcc: '歷史最高正確率（%）', lastAcc: '最近一場正確率（%）',
  tier: '難度層級 A～D（新手教學量出來就固定）', plays: '總場次', bestLevel: '最高到第幾關', bestScore: '最佳戰績分',
  lastWeapon: '最近一場用的武器',
  byWeapon: '最近一場正式比賽各武器造成的傷害（不是場次；練習不寫，所以常常沒有）',
  'nw.hr': '新世界獵人等級', 'nw.hunts': '新世界狩獵場數',
  'nw.wins/fails': '新世界勝／敗場數',
  'nw.accN/accSum': '高等級戰鬥的正確率場數與總和（平均＝accSum÷accN）',
  'nw.dodgeOk/dodgeAll': '閃避成功／總次數', 'nw.defOk/defAll': '防禦成功／總次數',
  'nw.fastest': '每個「區域:星級」最快打贏的秒數', 'nw.fastMk': '每隻「魔物:星級」自己最快的秒數',
  'nw.dex': '打倒過的魔物與次數', 'nw.used': '用過的武器（1＝用過）', 'nw.wwin': '各武器打贏的場數'
};
export const NOTE = '已去識別化，請勿與名單對照';

const p2 = n => String(n).padStart(2, '0');
export const dateStamp = (d = new Date()) => `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}`;

/* 組出整份匯出。scores：teacher/data.js loadScores() 的列。每次呼叫都重新洗牌、重新發編號 */
export function buildSpeedExport(scores, o = {}) {
  const picked = [];
  (scores || []).forEach(s => { const row = pickRow(s); if (row) picked.push({ grade: gradeOf(s && s.className), row }); });
  const count = {};
  picked.forEach(p => { count[p.grade] = (count[p.grade] || 0) + 1; });
  const used = new Set();
  /* 人太少的年級，光憑「五年級、第 X 名」就猜得到是誰，所以合併成 ? */
  const rows = shuffle(picked).map(p => Object.assign({ id: newId(used), grade: p.grade !== '?' && count[p.grade] < MIN_GRADE ? '?' : p.grade }, p.row));
  const order = { 四: 1, 五: 2, 六: 3, '?': 4 };
  rows.sort((a, b) => order[a.grade] - order[b.grade]);   // 洗牌過了，排年級不會洩漏座號順序（Array.sort 穩定）
  const d = o.date || new Date();
  return {
    meta: { exportedAt: `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`, appVersion: o.appVersion || '?', rows: rows.length, note: NOTE, fields: FIELD_DOC },
    summary: summarize(rows),
    rows
  };
}

/* ── CSV ──
   欄位固定的先排，map 類（武器、魔物、區域）的鍵取聯集，缺的留空。
   開頭加 BOM：Excel 讀 UTF-8 沒有 BOM 會把「四」「五」顯示成亂碼。 */
const CSV_FIXED = ['id', 'grade', ...TYPING_NUM, 'tier', 'lastWeapon', ...NW_NUM.map(k => 'nw.' + k), ...STAT_NUM.map(k => 'nw.' + k)];
export function csvCell(v) {
  if (v === undefined || v === null) return '';
  const s = String(v);
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
export function toCsv(exp) {
  const mapCols = new Set();
  exp.rows.forEach(r => {
    if (r.byWeapon) Object.keys(r.byWeapon).forEach(k => mapCols.add('byWeapon.' + k));
    if (r.nw) NW_MAPS.forEach(m => { if (r.nw[m]) Object.keys(r.nw[m]).forEach(k => mapCols.add(`nw.${m}.${k}`)); });
  });
  const cols = CSV_FIXED.concat([...mapCols].sort());
  const get = (r, c) => {
    const p = c.split('.');
    if (p[0] === 'nw') { if (!r.nw) return ''; return p.length === 2 ? r.nw[p[1]] : (r.nw[p[1]] || {})[p.slice(2).join('.')]; }
    if (p[0] === 'byWeapon') return (r.byWeapon || {})[p.slice(1).join('.')];
    return r[c];
  };
  const lines = [cols.map(csvCell).join(',')];
  exp.rows.forEach(r => lines.push(cols.map(c => csvCell(get(r, c))).join(',')));
  return '﻿' + lines.join('\r\n') + '\r\n';
}

/* ── 預覽（不含身分）：人數、各年級人數、欄位、前 3 列 ── */
export function previewOf(scores, o = {}) {
  const exp = buildSpeedExport(scores, o), byGrade = {};
  exp.rows.forEach(r => { byGrade[r.grade] = (byGrade[r.grade] || 0) + 1; });
  const cols = new Set(['id', 'grade']);
  exp.rows.forEach(r => { Object.keys(r).forEach(k => cols.add(k)); });
  return { total: exp.rows.length, skipped: (scores || []).length - exp.rows.length, byGrade, cols: [...cols], sample: exp.rows.slice(0, 3) };
}

/* ── 畫面 ──
   deps: { esc, ask, log, toast, appVersion?（字串或函式）, download? }。download 讓測試能換掉；預設用 <a download>。 */
function saveFile(name, text, mime) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
export function speedExportHtml(scores, esc) {
  const pv = previewOf(scores);
  const head = `<p style="margin:0 0 6px">給遊戲平衡用。檔案裡沒有姓名、座號和班級，只有年級和隨機編號。</p>`;
  if (!pv.total) {
    return `${head}<div class="note" data-sx-empty>還沒有學生的打字成績，暫時沒有東西可以匯出。等學生玩過幾場再來。</div>
      <div class="row" style="margin-top:8px"><button class="px-btn" disabled>下載 JSON</button><button class="px-btn" disabled>下載 CSV（Excel 看得懂，含 BOM）</button></div>`;
  }
  const gr = Object.keys(pv.byGrade).map(g => `${g === '?' ? '年級不明／人數少' : g + '年級'} ${pv.byGrade[g]} 人`).join('、');
  return `${head}<div class="note" data-sx-preview>
      <div data-sx-total><b>${pv.total} 人</b>會被匯出${pv.skipped ? `（另有 ${pv.skipped} 人完全沒有成績，略過）` : ''}。</div>
      <div data-sx-grades>${esc(gr)}。年級不足 ${MIN_GRADE} 人的會合併成「年級不明」，避免從年級猜出是誰。</div>
      <div class="dim" data-sx-cols style="margin-top:4px;overflow-wrap:anywhere">欄位：${pv.cols.map(esc).join('、')}</div></div>
    <p class="dim" style="margin:6px 0 2px">前 3 列範例（每次匯出編號都不一樣；列的順序也是隨機的）：</p>
    <pre class="dim" data-sx-sample style="margin:0 0 8px;white-space:pre-wrap;overflow-wrap:anywhere;font-size:.8em;max-height:180px;overflow:auto">${esc(pv.sample.map(r => JSON.stringify(r)).join('\n'))}</pre>
    <div class="row"><button class="px-btn gold" data-sx="json">下載 JSON</button><button class="px-btn gold" data-sx="csv">下載 CSV（Excel 看得懂，含 BOM）</button></div>`;
}
export function mountSpeedExport(box, getScores, deps) {
  const { esc, ask, log, toast } = deps;
  box.innerHTML = speedExportHtml(getScores(), esc);
  box.querySelectorAll('[data-sx]').forEach(btn => btn.addEventListener('click', async () => {
    if (btn.disabled) return;
    const scores = getScores(), kind = btn.dataset.sx;
    const ok = await ask('下載匿名打字速度？', `<p>這份檔案請<b>只傳給你信任的人</b>，不要放進公開的地方。</p><p class="dim">裡面沒有姓名、座號和班級，但每個人的速度與戰績都在，不要貼到網路上。</p>`, '下載', '取消');
    if (!ok) return;
    btn.disabled = true;
    try {
      const exp = buildSpeedExport(scores, { appVersion: typeof deps.appVersion === 'function' ? deps.appVersion() : deps.appVersion });
      if (!exp.rows.length) { toast('沒有資料可以匯出', true); return; }
      const stamp = dateStamp();
      if (kind === 'csv') (deps.download || saveFile)(`typehero-speed-${stamp}.csv`, toCsv(exp), 'text/csv;charset=utf-8');
      else (deps.download || saveFile)(`typehero-speed-${stamp}.json`, JSON.stringify(exp, null, 1), 'application/json');
      /* 紀錄只寫人數，不寫內容 */
      await log('export', 'speed', `匯出打字速度（匿名）${exp.rows.length} 人`);
      toast('已下載');
    } finally { btn.disabled = false; }
  }));
}
