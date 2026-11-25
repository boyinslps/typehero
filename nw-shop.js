/* 商店（階段 '3s'，docs/SPEC-SHOP-BOARD2.md A）：用字元買灰、綠材料與改名卡。
   前半是純函式（node 測得到）：shopList 列出能買什麼、shopBuy 試著買 1 個；後半是畫面（照 nw-forge.js 的寫法）。
   存檔欄位 NW.shop 的格式與整理在 nw-data.js 的 normalizeShop。價格與每天上限是 nw-data.js 的 SHOP（模擬定的，不要在這裡改）。 */
import { MONSTERS, MAT_INFO, COLOR_HEX, COLOR_NAME, ITEM_DEFS, SHOP, twDay, normalizeShop } from './nw-data.js';
import { matSources } from './nw-forge.js';
import { mountSprites } from './nw-card.js';

const MAT_COLORS = ['gray', 'green'];   // 藍色不賣（SHOP.blue＝false）；紫色以上永遠不賣

/* 打倒過的魔物掉的灰、綠材料（自己選哪一種）。沒打倒過的魔物不列：避免孩子以為要花錢解鎖 */
function matIds(nw) {
  const out = [];
  Object.entries(MONSTERS).forEach(([mk, m]) => {
    if (!((nw.dex || {})[mk] > 0)) return;
    (m.drops || []).forEach(d => { if (MAT_COLORS.includes(d[2]) && Object.prototype.hasOwnProperty.call(MAT_INFO, d[0]) && !out.includes(d[0])) out.push(d[0]); });
  });
  return out;
}
const colorOf = id => (MAT_INFO[id] || [id, 'gray'])[1];

/* 今天這個物品已經買了幾個：不同天就是 0；灰、綠是「同顏色合計」 */
function boughtToday(nw, id, today) {
  const sh = normalizeShop(nw.shop);
  if (sh.day !== today) return 0;
  if (id === 'renameCard') return sh.buy.renameCard || 0;
  const c = colorOf(id);
  return Object.entries(sh.buy).reduce((a, [k, v]) => a + (k !== 'renameCard' && colorOf(k) === c ? v : 0), 0);
}
/* 今天各類還能買幾個（畫面下方那行字用）：灰、綠各算合計 */
export function shopLeft(nw, now) {
  const today = twDay(now), sh = normalizeShop(nw.shop), used = c => sh.day !== today ? 0 : Object.entries(sh.buy).reduce((a, [k, v]) => a + (k !== 'renameCard' && colorOf(k) === c ? v : 0), 0);
  return { gray: Math.max(0, SHOP.gray.day - used('gray')), green: Math.max(0, SHOP.green.day - used('green')), renameCard: Math.max(0, SHOP.renameCard.day - (sh.day === today ? sh.buy.renameCard || 0 : 0)) };
}
const ruleOf = id => (id === 'renameCard' ? SHOP.renameCard : SHOP[colorOf(id)]);

/* 商店現在列的東西：[{ id, kind: 'mat'|'item', color, price, have, left, ok, why, need }]，why ∈ ''|'coins'|'limit'（需要的字元差額在 need） */
export function shopList(nw, now) {
  const today = twDay(now), out = [];
  const row = (id, kind, color, have) => {
    const rule = ruleOf(id), left = Math.max(0, rule.day - boughtToday(nw, id, today)), need = Math.max(0, rule.price - (nw.coins || 0));
    out.push({ id, kind, color, price: rule.price, have, left, need, ok: left > 0 && need === 0, why: left <= 0 ? 'limit' : need > 0 ? 'coins' : '' });
  };
  matIds(nw).forEach(id => row(id, 'mat', colorOf(id), (nw.mats || {})[id] || 0));
  row('renameCard', 'item', '', (nw.items || {}).renameCard || 0);
  return out;
}

/* 買 1 個。不改傳入的 nw，只換 coins、mats／items、shop 四個欄位。
   失敗：'blue'（藍色不賣）、'locked'（沒打倒過那隻魔物或根本不是賣的東西）、'limit'（今天買完了）、'coins'（字元不夠） */
export function shopBuy(nw, id, now) {
  const isItem = id === 'renameCard';
  if (!isItem && Object.prototype.hasOwnProperty.call(MAT_INFO, id) && colorOf(id) === 'blue' && !SHOP.blue) return { ok: false, why: 'blue' };
  if (!isItem && !matIds(nw).includes(id)) return { ok: false, why: 'locked' };
  const rule = ruleOf(id), today = twDay(now);
  if (!rule) return { ok: false, why: 'blue' };
  if (boughtToday(nw, id, today) >= rule.day) return { ok: false, why: 'limit' };
  if ((nw.coins || 0) < rule.price) return { ok: false, why: 'coins' };
  const sh = normalizeShop(nw.shop), buy = {};
  /* 換日把每個鍵歸 0、不刪鍵：存檔是 merge 寫入，本機刪掉的鍵雲端刪不掉 */
  Object.keys(sh.buy).forEach(k => { buy[k] = sh.day === today ? sh.buy[k] : 0; });
  buy[id] = (buy[id] || 0) + 1;
  const o = Object.assign({}, nw, { coins: nw.coins - rule.price, shop: { day: today, buy, spent: sh.spent + rule.price, n: sh.n + 1 } });
  if (isItem) o.items = Object.assign({}, nw.items, { renameCard: ((nw.items || {}).renameCard || 0) + 1 });
  else o.mats = Object.assign({}, nw.mats, { [id]: ((nw.mats || {})[id] || 0) + 1 });
  return { ok: true, nw: o };
}

/* ───────────────────────── 畫面 ───────────────────────── */
const CSS = `
#nw-shop{background:rgba(9,8,18,.92)}
.sh-wrap{max-width:860px;margin:0 auto;padding:12px}
.sh-top{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px}
.sh-tab[aria-pressed="true"]{outline:3px solid #ffd24a}
.sh-coins{margin-left:auto;font-weight:900}
.sh-coins b.bump{display:inline-block;animation:shBump .35s steps(4)}
@keyframes shBump{40%{transform:translateY(-6px) scale(1.25);color:#ffd24a}}
.sh-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px}
@media (max-width:520px){.sh-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.sh-wrap{padding:8px}}
.sh-cell{display:flex;flex-direction:column;gap:4px;min-width:0;text-align:center}
.sh-pic{display:grid;place-items:center;min-height:56px;background:#0e0b16;border:3px solid #0a0714}
.sh-pic canvas{image-rendering:pixelated}
.sh-name{font-weight:900;line-height:1.25;overflow-wrap:anywhere}
.sh-use{font-size:.78em;line-height:1.35;color:#aab0d8;overflow-wrap:anywhere}
.sh-cell .px-btn{width:100%;padding:8px 6px;white-space:normal;line-height:1.3}
.sh-cell .px-btn:disabled{opacity:.55}
.sh-left{margin-top:10px;font-size:.92em}
@media (prefers-reduced-motion:reduce){.sh-coins b.bump{animation:none}}
`;
function css() {
  if (document.getElementById('nw-shop-css')) return;
  const st = document.createElement('style'); st.id = 'nw-shop-css'; st.textContent = CSS; document.head.appendChild(st);
}

/* 材料沒有現成的像素圖：畫一顆 8×8 的小寶石，顏色就是材料的顏色（深色邊、淺色亮點，跟其他像素圖一樣看得出是格子畫的） */
const GEM = ['..oooo..', '.oLLCCo.', 'oLCCCCCo', 'oCCCCCCo', 'oCCCCCDo', 'oCCCCDDo', '.oDDDDo.', '..oooo..'];
function gemCanvas(hex, scale = 4) {
  const c = document.createElement('canvas'); c.width = 8; c.height = 8; c.style.cssText = `width:${8 * scale}px;height:${8 * scale}px;image-rendering:pixelated`;
  const x = c.getContext('2d'), n = parseInt(hex.slice(1), 16), sh = (k) => '#' + [16, 8, 0].map(s => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * k))).toString(16).padStart(2, '0')).join('');
  const col = { o: '#0a0714', C: hex, L: sh(1.35), D: sh(0.7) };
  GEM.forEach((row, y) => [...row].forEach((ch, i) => { if (ch !== '.') { x.fillStyle = col[ch]; x.fillRect(i, y, 1, 1); } }));
  return c;
}

/* ctx：{ PX, NW(), saveNow(), toast, esc, now(), sync() }。同步比照 syncGear：兩個分頁各買一次的話，先換成雲端比較新的存檔再判斷上限 */
export function openShop(ctx, opts = {}) {
  css();
  const old = document.getElementById('nw-shop'); if (old) old.remove();
  const { PX, esc } = ctx;
  const st = { tab: opts.tab || 'mat', busy: false };
  const NW = () => ctx.NW();
  const sheet = document.createElement('div');
  sheet.id = 'nw-shop'; sheet.className = 'nw-sheet fixed inset-0 overflow-y-auto'; sheet.style.zIndex = 88;
  sheet.innerHTML = '<div class="sh-wrap"><div class="px-panel" data-sh style="padding:12px"></div></div>';
  const host = sheet.querySelector('[data-sh]');
  const nameOf = it => it.kind === 'item' ? ITEM_DEFS.renameCard.name : (MAT_INFO[it.id] || [it.id])[0];

  function useLine(it) {
    if (it.kind === 'item') return '改名字用的，只能改一次。';
    const u = matSources(it.id).uses;
    return u.length ? `用在：${esc(u.slice(0, 3).join('、'))}${u.length > 3 ? ' 等' : ''}` : '現在還用不到';
  }
  function btnOf(it) {
    if (it.why === 'limit') return '<button class="px-btn" disabled data-why="limit">今天買完了，明天再來</button>';
    if (it.why === 'coins') return `<button class="px-btn" disabled data-why="coins">還差 ${it.need} 字元</button>`;
    return `<button class="px-btn gold" data-buy="${it.id}" ${st.busy ? 'disabled' : ''}>買 1 個</button>`;
  }
  function cell(it) {
    const pic = it.kind === 'item' ? '<span data-sprite="item:renameCard:3"></span>' : '<span data-gem></span>';
    return `<div class="px-panel in sh-cell" data-cell="${it.id}"><div class="sh-pic" ${it.kind === 'mat' ? `data-gemc="${COLOR_HEX[it.color] || '#888'}"` : ''}>${pic}</div>
      <div class="sh-name">${esc(nameOf(it))}${it.kind === 'mat' ? ` <small style="color:${COLOR_HEX[it.color]}">■</small>` : ''}</div>
      <div class="px-text" style="font-size:.9em">有 ${it.have} ${it.kind === 'item' ? '張' : '個'}</div>
      <div class="px-text" style="font-weight:900">🪙 ${it.price}</div>
      <div class="sh-use">${useLine(it)}</div>${btnOf(it)}</div>`;
  }
  function render(bump) {
    const nw = NW(), list = shopList(nw, ctx.now()), mats = list.filter(x => x.kind === 'mat'), items = list.filter(x => x.kind === 'item');
    const shown = st.tab === 'mat' ? mats : items;
    const L = shopLeft(nw, ctx.now());
    const leftLine = st.tab === 'mat' ? `今天還能買：綠 ${L.green} 個、灰 ${L.gray} 個` : `今天還能買：改名卡 ${L.renameCard} 張`;
    host.innerHTML = `<div class="sh-top">
        <div class="px-title" style="font-size:1.6em">🏪 商店</div>
        <button class="px-btn sh-tab" data-tab="mat" aria-pressed="${st.tab === 'mat'}">材料</button>
        <button class="px-btn sh-tab" data-tab="item" aria-pressed="${st.tab === 'item'}">道具</button>
        <span class="px-text sh-coins">🪙 <b data-coins class="${bump ? 'bump' : ''}">${(nw.coins || 0).toLocaleString()}</b> 字元</span>
        <button class="px-btn" data-shop-close>關閉</button></div>
      ${shown.length ? `<div class="sh-grid">${shown.map(cell).join('')}</div>` : '<p class="px-text" style="padding:18px 6px;text-align:center;line-height:1.7">還沒有可以買的材料。<br>打倒魔物以後，牠的材料就會出現在這裡。</p>'}
      <p class="px-text sh-left" data-left>${leftLine}</p>`;
    mountSprites(PX, host);
    host.querySelectorAll('[data-gemc]').forEach(el => { const s = el.querySelector('[data-gem]'); if (s) s.replaceWith(gemCanvas(el.dataset.gemc)); });
  }

  /* 按下去就把所有「買」鍵灰掉，存好以後才重畫：連點不會買兩次 */
  async function buy(id) {
    if (st.busy) return;
    st.busy = true;
    host.querySelectorAll('[data-buy]').forEach(b => { b.disabled = true; });
    let bought = false;
    try {
      if (ctx.sync) await ctx.sync();
      const r = shopBuy(NW(), id, ctx.now());
      if (!r.ok) ctx.toast(r.why === 'limit' ? '今天買完了，明天再來！' : r.why === 'coins' ? '字元還不夠喔。' : '這個現在買不到。', 2400);
      else {
        Object.assign(NW(), r.nw);
        const it = shopList(NW(), ctx.now()).find(x => x.id === id);
        await ctx.saveNow();
        bought = true;
        ctx.toast(`買到了 ${it ? nameOf(it) : ''} ×1！`, 2200);
      }
    } catch (e) {
      console.warn('商店購買失敗', e); ctx.toast('買東西失敗了，再試一次。', 2400);
    }
    st.busy = false;
    if (document.getElementById('nw-shop') === sheet) render(bought);
  }

  sheet.addEventListener('click', e => {
    if (e.target === sheet || e.target.closest('[data-shop-close]')) { close(); return; }
    const t = e.target.closest('[data-tab]'); if (t) { st.tab = t.dataset.tab; render(); return; }
    const b = e.target.closest('[data-buy]'); if (b && !b.disabled) buy(b.dataset.buy);
  });
  const onKey = e => { if (e.key === 'Escape' && document.getElementById('nw-shop') === sheet) close(); };
  addEventListener('keydown', onKey);
  function close() { removeEventListener('keydown', onKey); sheet.remove(); if (opts.onClose) opts.onClose(); }
  document.body.appendChild(sheet);
  render();
  return { close, state: st, el: sheet };
}
