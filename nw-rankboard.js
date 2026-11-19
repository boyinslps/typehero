/* 通用排行榜模板：以後有「排名」的畫面（抓蟲榜、活動排行榜、班級挑戰的同年級前 3、之後的榮譽碑…）
   一律用 rankBoardHtml(spec) 畫，不要自己再拼一份榜單的 HTML。

   為什麼要有模板：三個榜各自拼 HTML 的時候，字級、對比、「自己那一列」的樣子、榜外怎麼說話都不一致，
   手機上還有一個榜會橫向捲出去。排行榜對排名低的孩子有傷害（docs/research/GAME-DESIGN-REFS.md §2），
   所以「榜外不顯示名次、只說還差多少」這條規矩要放在同一個地方，不能各處各寫各的。

   ── 怎麼用 ──
   1. 純畫面（不碰網路）：el.innerHTML = rankBoardHtml({ id, title, unit, rows, mine, outText, updatedAt })
   2. 要讀雲端的榜（有「載入中、讀取失敗、重新整理」）：
        const rb = mountRankBoard(el, { load: force => 讀資料(force), toSpec: data => ({ ...spec }), shell: () => ({ ...標題等 }) });
        rb.run(false);
      mountRankBoard 會先畫「載入中」，load 成功畫榜單，失敗畫「再試一次」，按「重新整理」會用 force=true 再讀。

   ── spec 欄位（全部選填，除了 rows）──
   id          這個榜的代號，會變成 data-rankboard="…"（測試與除錯用）
   state       'ok'（預設）｜'loading'｜'error'
   title       榜單標題，例如「前 10 名」「最後的榜單」
   subtitle    標題下面一行小字
   unit        分數的單位：「分」「秒」「隻」「%」。分數是數字時才會接上去
   scoreLabel  分數那一欄的名字，顯示在標題右邊，例如「抓蟲分」
   rows        [{ rank, label, nick, score, extra, mine, id }]
                 rank   名次（1～3 畫金銀銅像素徽章，之後畫數字）
                 label  班級座號，例如「504・5號」。不放真名
                 nick   榜上的名字（沒有就不顯示）
                 score  數字（會接上 unit）或已經排好的字串（例如「進步 55%」，不會再接 unit）
                 extra  分數下面的小字，例如「確認 3 件」
                 mine   true＝這一列是我，會加粗框與「← 你」
                 id     選填，變成 data-rbid（測試用）
   mine        { score, status, label }：我的成績與狀態。score 可以是 null（只顯示 status）。沒有就不畫
   mineMark    「我這一列」的標記字，預設「← 你」（班級榜用「← 我們班」）
   outText     我不在榜上時，只說還差多少，例如「再快 3 秒就上榜」。**不要寫第幾名**
   emptyText   rows 是空的時候說的話
   badges      false＝前 3 名也用數字（預設 true）
   updatedAt   毫秒；畫「更新時間 12:34」
   refresh     false＝不畫「重新整理」按鈕（預設 true；沒有 updatedAt 的靜態榜請關掉）
   loadingText、errorText   覆寫載入中與讀取失敗的字

   ── 新增一種榜單要做的 4 件事 ──
   ① 資料層：寫一個 load(force)，回傳「排好、已濾掉不合理分數、不含真名」的列，force 要能略過快取（重新整理要用）。
   ② 寫一個 toSpec(data)，把資料對到上面的欄位。label 用「班級短碼・座號」，nick 用榜上的名字；
      自己不在榜上就給 outText，**不要給名次**。
   ③ 在畫面上放一個容器，呼叫 mountRankBoard(容器, { load, toSpec, shell })，再 run(false)。
   ④ 測試：有資料、空、載入中、讀取失敗四種畫面，榜外沒有名次文字，手機 390 寬不橫向捲動
      （照 tools/browser-test/nw11.test.js 的「模板」那幾段抄）。

   ── 版面與對比 ──
   字級：內文 ≥ 14px，次要小字 ≥ 12.8px；顏色對深紫底都 ≥ 4.5:1（灰字 #aab0d8、金 #ffd98a、綠 #8ec96b）。
   「自己那一列」不只靠顏色：有金框、「← 你」文字。
   手機：每一列用 flex＋min-width:0，名字可以換行，分數欄固定不縮；整個榜 max-width:100%、不橫向捲動。 */
import { PX } from './pixel.js';

const esc = s => String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* 前 3 名金銀銅像素徽章（PX.badge 的 tier 1 銅、2 銀、3 金），之後是數字 */
export const rankCell = (r, badges) => (badges !== false && r >= 1 && r <= 3) ? PX.badge(4 - r, 3)
  : `<b class="px-text" style="display:inline-block;min-width:33px;text-align:center;color:#aab0d8">${r === null || r === undefined ? '·' : esc(r)}</b>`;

/* 數字：接上單位（「%」不留空格，其他留一格：「9 分」「2 隻」「5.2 秒」）；字串照原樣；空的顯示「—」 */
export const fmtScore = (score, unit) => {
  if (score === null || score === undefined || score === '') return '—';
  if (typeof score === 'string') return score;
  const u = unit || '';
  return `${score}${u === '%' || !u ? '' : ' '}${u}`;
};

const hhmm = ms => { const d = new Date(ms); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

const GOLD = '#ffd98a', MUTE = '#aab0d8', GREEN = '#8ec96b';

function rowHtml(r, spec) {
  const mark = spec.mineMark || '← 你';
  const nick = r.nick ? `<span style="color:${GOLD}">・${esc(r.nick)}</span>` : '';
  return `<div class="px-panel in" data-rbrow${r.id !== undefined ? ` data-rbid="${esc(r.id)}"` : ''}${r.mine ? ' data-rbmine="1"' : ''} style="display:flex;align-items:center;gap:8px;padding:6px 8px;max-width:100%;box-sizing:border-box;${r.mine ? 'border-color:#e8b64c;border-width:3px;background:#2a2358' : ''}">
      ${rankCell(r.rank, spec.badges)}
      <span class="px-text" style="flex:1;min-width:0;overflow-wrap:anywhere;font-size:.95em;line-height:1.4"><b>${esc(r.label)}</b>${nick}${r.mine ? `<b style="color:${GOLD}">　${esc(mark)}</b>` : ''}</span>
      <span class="px-text" style="flex:none;text-align:right;max-width:45%"><b style="color:${GREEN};font-size:1em">${esc(fmtScore(r.score, spec.unit))}</b>${r.extra ? `<br><span style="color:${MUTE};font-size:.8em">${esc(r.extra)}</span>` : ''}</span></div>`;
}

export function rankBoardHtml(spec) {
  spec = spec || {};
  const state = spec.state === 'loading' || spec.state === 'error' ? spec.state : 'ok';
  const rows = Array.isArray(spec.rows) ? spec.rows : [];
  const head = (spec.title || spec.scoreLabel || spec.subtitle)
    ? `<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap"><b class="px-text" style="color:${GOLD};flex:1;min-width:0">${esc(spec.title || '')}</b>${spec.scoreLabel ? `<span class="px-text" style="color:${MUTE};font-size:.8em">${esc(spec.scoreLabel)}</span>` : ''}</div>${spec.subtitle ? `<div class="px-text" style="color:${MUTE};font-size:.85em;margin-top:2px;overflow-wrap:anywhere">${esc(spec.subtitle)}</div>` : ''}` : '';
  const m = spec.mine;
  const mine = m ? `<div class="px-panel in" data-rb-mine style="margin-top:8px;padding:8px 10px;border-color:#e8b64c;background:#2a2358;max-width:100%;box-sizing:border-box">
      <div class="px-text" style="overflow-wrap:anywhere">${esc(m.label || '我的成績')}${m.score !== null && m.score !== undefined && m.score !== '' ? `：<b style="color:${GOLD};font-size:1.1em">${esc(fmtScore(m.score, spec.unit))}</b>` : ''}</div>
      ${m.status ? `<div class="px-text" style="color:${MUTE};font-size:.88em;margin-top:2px;overflow-wrap:anywhere">${esc(m.status)}</div>` : ''}</div>` : '';
  let body;
  if (state === 'loading') body = `<div class="px-panel in px-text" data-rb-loading role="status" style="margin-top:8px;padding:14px;text-align:center">${esc(spec.loadingText || '讀榜單中…')}</div>`;
  else if (state === 'error') body = `<div class="px-panel in px-text" data-rb-error role="alert" style="margin-top:8px;padding:14px;text-align:center"><div style="overflow-wrap:anywhere">${esc(spec.errorText || '榜單現在讀不到，等一下再試試看。')}</div><button class="px-btn gold" data-rb-retry style="margin-top:8px;padding:6px 18px">再試一次</button></div>`;
  else {
    body = rows.length
      ? `<div data-rb-rows style="display:flex;flex-direction:column;gap:6px;margin-top:8px">${rows.map(r => rowHtml(r, spec)).join('')}</div>`
      : `<div class="px-panel in px-text" data-rb-empty style="margin-top:8px;padding:14px;text-align:center;color:${MUTE}">${esc(spec.emptyText || '還沒有人上榜，你可以當第一個！')}</div>`;
    if (spec.outText) body += `<div class="px-panel in px-text" data-rb-out style="margin-top:8px;padding:10px;text-align:center;color:${GOLD};overflow-wrap:anywhere">${esc(spec.outText)}</div>`;
    if (spec.updatedAt || spec.refresh !== false) {
      body += `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-top:8px"><span class="px-text" data-rb-time style="color:${MUTE};font-size:.82em">${spec.updatedAt ? `更新時間 ${hhmm(spec.updatedAt)}` : ''}</span>${spec.refresh !== false ? '<button class="px-btn" data-rb-refresh style="padding:5px 12px;font-size:.9em">🔄 重新整理</button>' : ''}</div>`;
    }
  }
  return `<div data-rankboard="${esc(spec.id || '')}" data-rb-state="${state}" style="max-width:100%;min-width:0;box-sizing:border-box">${head}${mine}${body}</div>`;
}

/* 接雲端的榜：載入中 → 榜單／讀取失敗。回傳 { run(force) }。
   load(force)：回資料（失敗請 throw）；toSpec(data)：資料 → spec；shell()：載入中與失敗時畫的標題（選填）。
   onData(data|null)：每次讀到或失敗後呼叫，榜單旁邊還有別的東西（例如班級進度條）要一起更新時用。
   alive()：視窗已經換頁就別再畫。 */
export function mountRankBoard(el, opt) {
  let busy = false, shown = false;
  const alive = opt.alive || (() => true);
  const shell = () => Object.assign({}, opt.shell ? opt.shell() : {});
  el.addEventListener('click', e => { if (e.target.closest('[data-rb-refresh],[data-rb-retry]')) run(true); });
  async function run(force) {
    if (busy) return; busy = true;
    if (shown) { const b = el.querySelector('[data-rb-refresh]'); if (b) { b.disabled = true; b.textContent = '更新中…'; } }
    else el.innerHTML = rankBoardHtml(Object.assign(shell(), { state: 'loading' }));
    try {
      const data = await opt.load(!!force);
      if (!alive()) return;
      const spec = opt.toSpec(data);
      if (!spec.updatedAt) spec.updatedAt = (data && data.at) || Date.now();
      el.innerHTML = rankBoardHtml(spec); shown = true;
      if (opt.onData) opt.onData(data);
    } catch (err) {
      console.warn('讀榜單失敗', err);
      if (!alive()) return;
      el.innerHTML = rankBoardHtml(Object.assign(shell(), { state: 'error' })); shown = false;
      if (opt.onData) opt.onData(null);
    } finally { busy = false; }
  }
  return { run };
}
