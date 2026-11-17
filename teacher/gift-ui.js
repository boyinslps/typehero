/* 禮物列編輯器（活動的獎勵、排行榜的名次獎品都用）：一個容器、一個 items 陣列，改了就呼叫 onChange。
   跟信箱分頁的禮物列同一套種類（gifts.js），信箱那邊有自己的重畫邏輯所以沒有共用。
   事件掛在 el 上：呼叫端每次重畫整個畫面時換新的 el，舊的監聽跟著丟掉。 */
import { GIFT_TYPES, giftType, newItem } from './gifts.js';
import { esc } from './util.js';

function rowHtml(it, i) {
  const g = giftType(it.type), opts = g.pick ? g.pick() : null;
  const opt = o => `<option value="${esc(o.value)}" ${it.key === o.value ? 'selected' : ''}>${esc(o.label)}</option>`;
  const sel = opts ? `<select class="inp" data-gkey="${i}">${g.groups ? g.groups.map(gr => `<optgroup label="${gr}">${opts.filter(o => o.group === gr).map(opt).join('')}</optgroup>`).join('') : opts.map(opt).join('')}</select>` : '';
  return `<div class="gift-row"><select class="inp" data-gtype="${i}" aria-label="禮物種類">${GIFT_TYPES.map(x => `<option value="${x.type}" ${x.type === it.type ? 'selected' : ''}>${x.label}</option>`).join('')}</select>${sel}
    ${g.qty ? `<input class="inp" type="number" min="1" step="1" data-gn="${i}" value="${it.n === undefined || Number.isNaN(it.n) ? '' : it.n}" style="width:90px" aria-label="數量">` : ''}
    <button class="px-btn sm danger" data-gdel="${i}" aria-label="拿掉這個禮物" type="button">✕</button></div>`;
}
export function mountItems(el, items, onChange = () => {}, { disabled = false } = {}) {
  const paint = () => {
    el.innerHTML = `${items.map(rowHtml).join('')}${disabled ? '' : `<select class="inp" data-gadd><option value="">＋ 加一個禮物…</option>${GIFT_TYPES.map(g => `<option value="${g.type}">${g.label}</option>`).join('')}</select>`}`;
    if (disabled) el.querySelectorAll('input,select,button').forEach(x => { x.disabled = true; });
  };
  el.addEventListener('change', e => {
    const t = e.target;
    if (t.matches('[data-gadd]')) { if (t.value) { items.push(newItem(t.value)); paint(); onChange(); } }
    else if (t.matches('[data-gtype]')) { items[+t.dataset.gtype] = newItem(t.value); paint(); onChange(); }
    else if (t.matches('[data-gkey]')) { items[+t.dataset.gkey].key = t.value; onChange(); }
  });
  el.addEventListener('input', e => {
    const t = e.target;
    if (t.matches('[data-gn]')) { const v = t.value.trim(); items[+t.dataset.gn].n = v === '' ? NaN : Number(v); onChange(); }
  });
  el.addEventListener('click', e => {
    const d = e.target.closest('[data-gdel]');
    if (d) { items.splice(+d.dataset.gdel, 1); paint(); onChange(); }
  });
  paint();
}
