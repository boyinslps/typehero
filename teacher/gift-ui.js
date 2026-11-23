/* 禮物列編輯器（活動的獎勵、排行榜的名次獎品都用）：一個容器、一個 items 陣列，改了就呼叫 onChange。
   跟信箱分頁的禮物列同一套種類（gifts.js），信箱那邊有自己的重畫邏輯所以沒有共用。
   事件掛在 el 上：呼叫端每次重畫整個畫面時換新的 el，舊的監聽跟著丟掉。
   活動獎勵不放 mailOnly 的種類（補發用的等級、區域、圖鑑、教學課）：活動是發給一群人的，補發只該寄給特定學生。 */
import { GIFT_TYPES, giftType, newItem, optionsHtml, filterOpts, hintText, fixGear, gearFieldsHtml } from './gifts.js';
import { esc } from './util.js';

const eventTypes = () => GIFT_TYPES.filter(x => !x.mailOnly);
function rowHtml(it, i, q) {
  const g = giftType(it.type), all = g.pick ? g.pick() : null, opts = all ? filterOpts(all, q) : null;
  /* 搜尋後沒有目前選的那個，還是要留著它，不然下拉會偷偷換成別的 */
  const shown = opts && all.find(o => o.value === it.key) && !opts.some(o => o.value === it.key) ? [all.find(o => o.value === it.key)].concat(opts) : opts;
  const sel = shown ? `${g.search && all.length > 6 ? `<input class="inp" type="search" data-gq="${i}" value="${esc(q || '')}" placeholder="搜尋…" style="width:120px" aria-label="搜尋${esc(g.label)}">` : ''}<select class="inp" data-gkey="${i}">${optionsHtml(g, shown, it.key, esc)}</select>${g.gear ? gearFieldsHtml(it, i, 'data-ggc', 'data-ggp', esc) : ''}` : '';
  const hint = hintText(it);
  return `<div class="gift-row" data-grow="${i}"><select class="inp" data-gtype="${i}" aria-label="禮物種類">${eventTypes().map(x => `<option value="${x.type}" ${x.type === it.type ? 'selected' : ''}>${x.label}</option>`).join('')}</select>${sel}
    ${g.qty ? `${g.unit ? `<span class="dim">${esc(g.unit)}</span>` : ''}<input class="inp" type="number" min="${g.min || 1}" ${g.max ? `max="${g.max}"` : ''} step="1" data-gn="${i}" value="${it.n === undefined || Number.isNaN(it.n) ? '' : it.n}" style="width:90px" aria-label="數量">` : ''}
    <button class="px-btn sm danger" data-gdel="${i}" aria-label="拿掉這個禮物" type="button">✕</button>
    ${hint ? `<div class="dim" data-ghint="${i}" style="flex-basis:100%;font-size:.85em">${esc(hint)}</div>` : ''}</div>`;
}
export function mountItems(el, items, onChange = () => {}, { disabled = false } = {}) {
  const qs = {};   // 每一列的搜尋字；重畫整個列表時要留著
  const paint = () => {
    el.innerHTML = `${items.map((it, i) => rowHtml(it, i, qs[i])).join('')}${disabled ? '' : `<select class="inp" data-gadd><option value="">＋ 加一個禮物…</option>${eventTypes().map(g => `<option value="${g.type}">${g.label}</option>`).join('')}</select>`}`;
    if (disabled) el.querySelectorAll('input,select,button').forEach(x => { x.disabled = true; });
  };
  el.addEventListener('change', e => {
    const t = e.target;
    if (t.matches('[data-gadd]')) { if (t.value) { items.push(newItem(t.value)); paint(); onChange(); } }
    else if (t.matches('[data-gtype]')) { const i = +t.dataset.gtype; items[i] = newItem(t.value); qs[i] = ''; paint(); onChange(); }
    else if (t.matches('[data-gkey]')) { fixGear(Object.assign(items[+t.dataset.gkey], { key: t.value })); paint(); onChange(); }
    else if (t.matches('[data-ggc]')) { items[+t.dataset.ggc].c = t.value; onChange(); }
    else if (t.matches('[data-ggp]')) { items[+t.dataset.ggp].p = +t.value; onChange(); }
  });
  el.addEventListener('input', e => {
    const t = e.target;
    if (t.matches('[data-gn]')) { const v = t.value.trim(); items[+t.dataset.gn].n = v === '' ? NaN : Number(v); onChange(); }
    /* 搜尋只換這一列的下拉，不重畫搜尋框（重畫會打斷注音輸入法）；結果第一個變成目前選的 */
    else if (t.matches('[data-gq]') && !e.isComposing) searchRow(+t.dataset.gq, t.value);
  });
  el.addEventListener('compositionend', e => { if (e.target.matches && e.target.matches('[data-gq]')) searchRow(+e.target.dataset.gq, e.target.value); });
  function searchRow(i, q) {
    qs[i] = q;
    const it = items[i], g = giftType(it.type), all = g.pick(), opts = filterOpts(all, q), sel = el.querySelector(`[data-gkey="${i}"]`);
    if (!sel || !opts.length) return;
    if (!opts.some(o => o.value === it.key)) it.key = opts[0].value;
    sel.innerHTML = optionsHtml(g, opts, it.key, esc);
    const h = el.querySelector(`[data-ghint="${i}"]`), tx = hintText(it);
    if (h) h.textContent = tx;
    onChange();
  }
  el.addEventListener('click', e => {
    const d = e.target.closest('[data-gdel]');
    if (d) { items.splice(+d.dataset.gdel, 1); Object.keys(qs).forEach(k => delete qs[k]); paint(); onChange(); }
  });
  paint();
}
