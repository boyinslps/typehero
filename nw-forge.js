/* 鐵匠鋪（打造、強化）與背包裡的裝備／材料／圖紙分頁（docs/SPEC-STAGE2.md §3.6、§3.7、§3.11）。
   這支只管畫面與按鈕；怎麼扣材料、強化成本、戰力都在 nw-data.js（純函式，node 測得到）。
   跟 newworld.js 的關係：newworld.js 傳進來 ctx（存檔、提示、同步雲端存檔、任務檢查），這裡不碰全域狀態。
   ctx：{ PX, NW(), save(), saveNow(), toast, esc, sync(), after(), fast } */
import {
  stageOpen, MONSTERS, REGIONS, COLOR_NAME, COLOR_HEX, MAT_INFO, GEAR_DEFS, GEAR_SLOTS, GEAR_MAX, GEAR_MAX_P, GIFT_WEAPONS,
  gearDef, gearItem, equippedItem, itemName, itemText, itemValue, itemPower, valueText, slotValue, slotNote,
  craftCheck, craftList, doCraft, upCheck, doUpgrade, doEquip, powerGain, gearPower, colorRank, defColors, usedText
} from './nw-data.js';
import { mountSprites, darkDots } from './nw-card.js';

const CSS = `
#nw-forge{background:rgba(9,8,18,.92)}
.fg-wrap{max-width:980px;margin:0 auto;padding:12px}
.fg-top{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px}
.fg-body{display:grid;grid-template-columns:minmax(220px,300px) 1fr;gap:12px;align-items:start}
@media (max-width:720px){.fg-body{grid-template-columns:1fr}.fg-list{display:flex!important;overflow-x:auto;gap:8px!important}.fg-list>*{flex:none;min-width:170px}}
.fg-list{display:grid;gap:6px;max-height:60vh;overflow-y:auto;padding-right:4px}
.fg-row{display:flex;align-items:center;gap:8px;padding:6px 8px;background:#141030;border:3px solid #3a3070;cursor:pointer;font-weight:800;color:#fff;text-align:left;font-family:inherit;font-size:1em}
.fg-row:hover{border-color:#ffd24a}
.fg-row.on{border-color:#e8b64c;background:#231d55}
.fg-row.can{box-shadow:0 0 0 2px #ffd24a66}
.fg-row.dim{opacity:.62}
.fg-row .fg-spark{margin-left:auto;color:#ffd24a;animation:fgBlink 1s steps(2) infinite}
@keyframes fgBlink{50%{opacity:.25}}
.fg-sq{display:inline-block;width:12px;height:12px;border:2px solid #0a0714;flex:none}
.fg-big{display:grid;place-items:center;min-height:110px;background:#0e0b16;border:3px solid #0a0714;margin-bottom:8px;position:relative}
.fg-big.hit{animation:fgHit .3s steps(3) 3}
@keyframes fgHit{0%{transform:translateY(0)}50%{transform:translateY(8px) scale(.96)}100%{transform:translateY(0)}}
.fg-big.flash{animation:fgFlash .9s steps(6)}
.fg-big.gold{animation:fgGold 1.2s steps(8)}
@keyframes fgFlash{0%,100%{background:#0e0b16}30%{background:#fff7c8}60%{background:#6aa84f}}
@keyframes fgGold{0%,100%{background:#0e0b16}25%,75%{background:#ffe27a}50%{background:#fff}}
.fg-mats{display:grid;gap:4px;margin:8px 0}
.fg-mrow{display:flex;justify-content:space-between;gap:8px;padding:3px 8px;background:#141030;border:2px solid #2a2450;font-weight:800}
.fg-mrow.bad{border-color:#d85a4a;color:#ffb0a0}
.fg-chip{display:inline-block;margin:2px 4px 2px 0;padding:1px 8px;background:#0a0714;border:2px solid #6a5ab0;color:#fff;font-weight:800;cursor:pointer;font-family:inherit}
.fg-chip.on{border-color:#ffd24a}
.fg-tab[aria-pressed="true"]{outline:3px solid #ffd24a}
.fg-cells{display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:6px}
.fg-cell{position:relative;aspect-ratio:1;display:grid;place-items:center;background:#0e0b16;border:3px solid #2a2450;cursor:pointer;padding:0}
.fg-cell canvas{max-width:80%;max-height:80%;width:auto!important;height:auto!important}
.fg-cell.on{box-shadow:0 0 0 3px #ffd24a}
.fg-cell.dim{opacity:.4;filter:grayscale(1)}
.fg-cell .fg-dot{position:absolute;right:3px;top:3px;width:10px;height:10px;border:2px solid #0a0714}
.fg-cell .fg-up{position:absolute;right:3px;bottom:1px;font-weight:900;font-size:12px;color:#ffd24a;text-shadow:1px 1px 0 #000,-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000;font-style:normal}
.fg-cell .fg-wear{position:absolute;left:3px;top:1px;font-size:11px;font-weight:900;color:#8ec96b;text-shadow:1px 1px 0 #000}
.fg-cell.dark{overflow:visible}
@media (prefers-reduced-motion:reduce){.fg-big.hit,.fg-big.flash,.fg-big.gold,.fg-row .fg-spark{animation:none}}
`;
function css() {
  if (document.getElementById('nw-forge-css')) return;
  const st = document.createElement('style'); st.id = 'nw-forge-css'; st.textContent = CSS; document.head.appendChild(st);
}

const sq = c => `<span class="fg-sq" style="background:${COLOR_HEX[c] || '#888'}"></span>`;
const SLOT_NAME = Object.fromEntries(GEAR_SLOTS);
/* 一件裝備（或一種裝備）的圖示：武器用 28×28 的武器圖、其他用 16×16 的裝備圖。mountSprites 負責換成 canvas */
export const spriteOf = (key, scale = 3) => {
  const d = gearDef(key);
  return d && d.slot === 'weapon' ? `weapon:${d.wk}:${Math.max(2, scale - 1)}` : `gear:${key}:${scale}`;
};
const sprite = (key, scale) => `<span class="px-img" data-sprite="${spriteOf(key, scale)}"></span>`;
/* 某一格的數字說明；這件的 +0 版本 */
const specText = (d, c, p) => valueText(d.slot, slotValue(d.slot, c, p, d.fixed ? d.fixed.atk : null));

/* ───────────────────────── 鐵匠鋪 ───────────────────────── */
export function openForge(ctx, opts = {}) {
  css();
  const old = document.getElementById('nw-forge'); if (old) old.remove();
  const { PX, esc } = ctx;
  const st = { tab: opts.tab || 'make', pick: null, prefer: [], upId: null, busy: false, msg: '' };
  const NW = () => ctx.NW();
  const sheet = document.createElement('div');
  sheet.id = 'nw-forge'; sheet.className = 'nw-sheet fixed inset-0 overflow-y-auto'; sheet.style.zIndex = 88;
  sheet.innerHTML = '<div class="fg-wrap"><div class="px-panel" data-fg style="padding:12px"></div></div>';
  const host = sheet.querySelector('[data-fg]');

  const entries = () => craftList(NW()).flatMap(x => x.vers.map(v => ({ key: x.key, def: x.def, c: v.c, ck: v.ck, can: v.ck.ok })))
    .sort((a, b) => (b.can ? 1 : 0) - (a.can ? 1 : 0));
  const pickKey = e => e.key + ':' + e.c;
  const curEntry = list => list.find(e => pickKey(e) === st.pick) || list[0] || null;

  function head() {
    const nw = NW();
    return `<div class="fg-top">
      <div class="px-title" style="font-size:1.6em">⚒ 鐵匠鋪</div>
      <button class="px-btn fg-tab" data-tab="make" aria-pressed="${st.tab === 'make'}">⚒ 打造</button>
      <button class="px-btn fg-tab" data-tab="up" aria-pressed="${st.tab === 'up'}">✨ 強化</button>
      <span class="px-text" style="margin-left:auto;font-weight:900">🪙 <b data-coins>${nw.coins.toLocaleString()}</b> 字元</span>
      <button class="px-btn" data-forge-close>關閉</button></div>`;
  }

  /* ── 打造 ── */
  function matRows(ck) {
    const rows = [];
    const rec = ck.rec;
    if (rec.mats) rec.mats.forEach(([id, n]) => {
      const have = (NW().mats[id]) || 0, ok = have >= n, nm = (MAT_INFO[id] || [id, 'gray']);
      rows.push(`<div class="fg-mrow ${ok ? '' : 'bad'}"><span>${sq(nm[1])} ${esc(nm[0])}</span><b>${have}/${n} ${ok ? '✅' : '❌'}</b></div>`);
    });
    if (rec.any) {
      const [col, n] = rec.any, pk = ck.any, ok = pk.ok;
      rows.push(`<div class="fg-mrow ${ok ? '' : 'bad'}"><span>${sq(col)} 任意${COLOR_NAME[col]}色材料</span><b>${pk.have}/${n} ${ok ? '✅' : '❌'}</b></div>`);
    }
    const ok = NW().coins >= rec.coins;
    rows.push(`<div class="fg-mrow ${ok ? '' : 'bad'}"><span>🪙 字元</span><b>${NW().coins}/${rec.coins} ${ok ? '✅' : '❌'}</b></div>`);
    return rows.join('');
  }
  function swapChips(pk) {
    if (!pk || !pk.cand || pk.cand.length < 2) return '';
    const first = Object.keys(pk.use)[0];
    return `<div class="text-sm px-text" style="margin-top:4px">會用掉：<b data-uses>${esc(usedText(pk.use))}</b>　<span style="color:#aab0d8">想換成別種，點一下：</span><br>${pk.cand.map(c => `<button class="fg-chip ${c.id === first ? 'on' : ''}" data-prefer="${c.id}">${esc(MAT_INFO[c.id][0])} ${c.have}</button>`).join('')}</div>`;
  }
  function progress(ck) {
    const rec = ck.rec; let need = 0, got = 0;
    (rec.mats || []).forEach(([id, n]) => { need += n; got += Math.min(n, NW().mats[id] || 0); });
    if (rec.any) { need += rec.any[1]; got += Math.min(rec.any[1], ck.any.have); }
    need += 1; got += Math.min(1, NW().coins / rec.coins);
    return Math.round(got / need * 100);
  }
  function renderMake() {
    const list = entries(), e0 = curEntry(list);
    st.pick = e0 ? pickKey(e0) : null;
    const nw = NW();
    /* 列表用預設的材料順序判斷「做不做得出來」；右邊這件要照孩子點的順序（st.prefer）重算 */
    const e = e0 && Object.assign({}, e0, { ck: craftCheck(nw, e0.key, e0.c, st.prefer) });
    const listHtml = list.map(x => `<button class="fg-row ${x.can ? 'can' : 'dim'} ${pickKey(x) === st.pick ? 'on' : ''}" data-craft="${pickKey(x)}">${sq(x.c)}<span>${esc(x.def.name)}</span>${x.can ? '<span class="fg-spark">✨</span>' : ''}</button>`).join('')
      || '<p class="px-text">還沒有圖紙。打倒魔物有機會掉圖紙。</p>';
    let right = '<p class="px-text">左邊選一張圖紙。</p>';
    if (st.result) right = resultHtml();
    else if (e) {
      const { def, c, ck } = e, slot = def.slot;
      const pw = ck.ok ? '' : '';
      const cur = equippedItem(nw, slot);
      right = `<div class="px-panel in">
        <div class="fg-big" data-big>${sprite(e.key, slot === 'weapon' ? 5 : 6)}</div>
        <div class="px-title" style="font-size:1.35em">${esc(def.name)} <span style="font-size:.7em">${sq(c)} ${COLOR_NAME[c]}色</span> <small style="color:#aab0d8;font-size:.55em">${SLOT_NAME[slot]}</small></div>
        <div class="px-text" style="font-weight:800">${specText(def, c, 0)}　戰力 +${itemPower({ c, p: 0 })}</div>
        <div class="text-sm" style="color:#ffd98a;margin-top:2px">${esc(slotNote(slot))}</div>
        <div class="fg-mats">${matRows(ck)}</div>
        ${ck.rec.any ? swapChips(ck.any) : ''}
        ${ck.ok ? '' : `<div class="px-bar ok" style="margin:6px 0"><i style="width:${progress(ck)}%"></i></div>`}
        <div style="margin-top:8px"><button class="px-btn gold" data-do-craft style="padding:12px 28px;font-size:1.1em" ${ck.ok ? '' : 'disabled'}>${ck.ok ? '⚒ 打造！' : esc(lackText(ck))}</button></div>
        ${st.msg ? `<p class="text-sm mt-2" style="color:#ffb0a0">${esc(st.msg)}</p>` : ''}
        <p class="text-xs mt-2" style="color:#aab0d8">打造一定會成功。做出來是 +0，之後可以強化。</p></div>`;
    }
    host.innerHTML = head() + `<div class="fg-body"><div class="fg-list" data-list>${listHtml}</div><div data-right>${right}</div></div>`;
    mountSprites(PX, host);
  }
  const lackText = ck => ck.blocked ? ck.why : ck.lack && ck.lack.length
    ? '還差 ' + ck.lack.map(l => l.what === '字元' ? `${l.short} 字元` : `${l.short} 個${l.what}`).join('、')
    : (ck.why || '現在不能做');

  function resultHtml() {
    const r = st.result, it = r.it, d = gearDef(it.k);
    const gain = powerGain(NW(), it.id);
    return `<div class="px-panel in text-center" data-result>
      <div class="px-title" style="font-size:1.6em">🎉 打造完成！</div>
      <div class="fg-big flash" style="margin:8px auto;max-width:240px">${sprite(it.k, d.slot === 'weapon' ? 5 : 6)}</div>
      <div class="px-title" style="font-size:1.3em">${esc(itemName(it))} ${sq(it.c)}</div>
      <div class="px-text" style="font-weight:800">${esc(itemText(it))}　戰力 +${gearPowerOfItem(it)}</div>
      <p class="px-text mt-2" style="font-size:1.05em">要穿上嗎？${gain > 0 ? `<br><span style="color:#ffd98a">穿上戰力 +${gain}！</span>` : ''}</p>
      <div class="flex gap-2 justify-center mt-3 flex-wrap"><button class="px-btn ${gain > 0 ? 'gold' : ''}" data-wear="${it.id}" style="padding:10px 26px">穿上</button><button class="px-btn" data-keep>先放背包</button></div></div>`;
  }
  const gearPowerOfItem = it => itemPower(it);

  async function onCraft() {
    if (st.busy) return;
    st.busy = true;
    try {
      await ctx.sync();
      const list = entries(), e = curEntry(list);
      if (!e) return;
      const ck = craftCheck(NW(), e.key, e.c, st.prefer);
      if (!ck.ok) { st.msg = '材料或字元變少了（可能在別的視窗用掉了），再看一下夠不夠。'; renderMake(); return; }
      st.msg = '';
      const big = host.querySelector('[data-big]');
      if (big && !ctx.fast) { big.classList.add('hit'); await new Promise(r => setTimeout(r, 900)); }
      const it = doCraft(NW(), e.key, e.c, st.prefer, ctx.now ? ctx.now() : Date.now());
      if (!it) { renderMake(); return; }
      ctx.save(); ctx.saveNow();
      st.prefer = [];
      st.result = { it };
      const fx = ctx.after ? ctx.after() : null;
      renderMake();
      if (fx && fx.note) ctx.toast(fx.note, 3600);
    } finally { st.busy = false; }
  }
  function onWear(id) {
    doEquip(NW(), id); ctx.save(); ctx.saveNow();
    const fx = ctx.after ? ctx.after() : null;
    st.result = null; renderMake();
    ctx.toast('穿上了！', 1800);
    if (fx && fx.note) setTimeout(() => ctx.toast(fx.note, 3600), 1900);
  }

  /* ── 強化 ── */
  const sortedItems = () => {
    const nw = NW(), worn = new Set(Object.values(nw.eq || {}).filter(Boolean));
    return nw.gear.filter(g => gearDef(g.k)).slice().sort((a, b) => (worn.has(b.id) ? 1 : 0) - (worn.has(a.id) ? 1 : 0) || itemPower(b) - itemPower(a));
  };
  function renderUp() {
    const nw = NW(), items = sortedItems();
    if (!items.find(g => g.id === st.upId)) st.upId = (nw.eq && nw.eq.weapon) || (items[0] && items[0].id) || null;
    const worn = new Set(Object.values(nw.eq || {}).filter(Boolean));
    const cells = items.map(g => `<button class="fg-cell ${g.id === st.upId ? 'on' : ''}" data-up-item="${g.id}" style="border-color:${COLOR_HEX[g.c]}" title="${esc(itemName(g))}">${sprite(g.k, 3)}${g.p ? `<i class="fg-up">+${g.p}</i>` : ''}${worn.has(g.id) ? '<span class="fg-wear">穿</span>' : ''}</button>`).join('');
    const it = gearItem(nw, st.upId), d = it && gearDef(it.k), ck = it && upCheck(nw, it.id, st.prefer);
    let right = '<p class="px-text">還沒有裝備。</p>';
    if (it && d) {
      const maxed = it.p >= GEAR_MAX_P;
      const nxt = maxed ? null : slotValue(d.slot, it.c, it.p + 1, d.fixed ? d.fixed.atk : null);
      const cost = ck.cost;
      right = `<div class="px-panel in text-center">
        <div class="fg-big" data-big>${sprite(it.k, d.slot === 'weapon' ? 5 : 6)}</div>
        <div class="px-title" style="font-size:1.35em">${esc(d.name)} ${sq(it.c)}</div>
        <div class="px-title" style="font-size:1.6em" data-pl>${maxed ? `+${it.p}（最高）` : `+${it.p} → +${it.p + 1}`}</div>
        <div class="px-text" style="font-weight:800">${maxed ? esc(itemText(it)) : `${esc(itemText(it))} → ${esc(valueText(d.slot, nxt).replace(/^[^\d+]*/, ''))}`}</div>
        ${maxed ? '<p class="px-text mt-2">已經強化到最高了！+6 以上要等之後開放。</p>' : `
        <div class="fg-mats" style="text-align:left">
          <div class="fg-mrow ${nw.coins >= cost.coins ? '' : 'bad'}"><span>🪙 字元</span><b>${nw.coins}/${cost.coins} ${nw.coins >= cost.coins ? '✅' : '❌'}</b></div>
          <div class="fg-mrow ${ck.any.ok ? '' : 'bad'}"><span>${sq(it.c)} ${COLOR_NAME[it.c]}色以上的任意材料</span><b>${ck.any.have}/${cost.mats} ${ck.any.ok ? '✅' : '❌'}</b></div></div>
        ${swapChips(ck.any)}
        <div style="margin-top:8px"><button class="px-btn gold" data-do-up style="padding:12px 28px;font-size:1.1em" ${ck.ok ? '' : 'disabled'}>${ck.ok ? '✨ 強化！' : esc(lackText(ck))}</button></div>
        <p class="text-xs mt-2" style="color:#aab0d8">強化一定會成功，不會壞掉、不會掉等級。</p>`}
        ${st.msg ? `<p class="text-sm mt-2" style="color:#ffb0a0">${esc(st.msg)}</p>` : ''}</div>`;
    }
    host.innerHTML = head() + `<div class="fg-body"><div><div class="label mb-1 px-text">選一件裝備（有「穿」的是現在穿著的）</div><div class="fg-cells" data-list>${cells}</div></div><div data-right>${right}</div></div>`;
    mountSprites(PX, host);
  }
  async function onUp() {
    if (st.busy) return;
    st.busy = true;
    try {
      await ctx.sync();
      const nw = NW(), it0 = gearItem(nw, st.upId);
      if (!it0) { renderUp(); return; }
      const ck = upCheck(nw, it0.id, st.prefer);
      if (!ck.ok) { st.msg = '材料或字元變少了（可能在別的視窗用掉了），再看一下夠不夠。'; renderUp(); return; }
      st.msg = '';
      const it = doUpgrade(nw, it0.id, st.prefer);
      ctx.save(); ctx.saveNow(); st.prefer = [];
      const fx = ctx.after ? ctx.after() : null;
      renderUp();
      const big = host.querySelector('[data-big]');
      if (big && !ctx.fast) big.classList.add(it.p >= GEAR_MAX_P ? 'gold' : 'flash');
      ctx.toast(it.p >= GEAR_MAX_P ? `${itemName(it)}！花邊變成金色，閃閃發亮！` : `強化成功！${itemName(it)}：${itemText(it)}`, 2800);
      if (fx && fx.note) setTimeout(() => ctx.toast(fx.note, 3600), 2900);
    } finally { st.busy = false; }
  }

  const render = () => (st.tab === 'up' ? renderUp() : renderMake());
  sheet.addEventListener('click', e => {
    if (e.target === sheet || e.target.closest('[data-forge-close]')) { close(); return; }
    const t = e.target.closest('[data-tab]'); if (t) { st.tab = t.dataset.tab; st.result = null; st.prefer = []; st.msg = ''; render(); return; }
    const c = e.target.closest('[data-craft]'); if (c) { st.clicked = true; st.pick = c.dataset.craft; st.prefer = []; st.result = null; st.msg = ''; renderMake(); return; }
    const pf = e.target.closest('[data-prefer]'); if (pf) { st.prefer = [pf.dataset.prefer]; render(); return; }
    if (e.target.closest('[data-do-craft]')) { onCraft(); return; }
    const w = e.target.closest('[data-wear]'); if (w) { onWear(w.dataset.wear); return; }
    if (e.target.closest('[data-keep]')) { st.result = null; renderMake(); return; }
    const ui = e.target.closest('[data-up-item]'); if (ui) { st.upId = ui.dataset.upItem; st.prefer = []; st.msg = ''; renderUp(); return; }
    if (e.target.closest('[data-do-up]')) { onUp(); }
  });
  const onKey = e => { if (e.key === 'Escape' && document.getElementById('nw-forge') === sheet) { if (document.getElementById('nw-tour') || document.getElementById('nw-intro') || document.getElementById('nw-gift')) return; close(); } };
  addEventListener('keydown', onKey);
  function close() { removeEventListener('keydown', onKey); sheet.remove(); if (opts.onClose) opts.onClose(); }
  document.body.appendChild(sheet);
  render();
  return { close, state: st, el: sheet };
}

/* ───────────────────────── 背包裡的分頁 ───────────────────────── */
const SORTS = [['color', '顏色'], ['slot', '種類'], ['new', '最新']];
export function sortGear(nw, how) {
  const slotIdx = it => GEAR_SLOTS.findIndex(s => s[0] === (gearDef(it.k) || {}).slot);
  return nw.gear.filter(g => gearDef(g.k)).slice().sort((a, b) => {
    if (how === 'slot') return slotIdx(a) - slotIdx(b) || colorRank(b.c) - colorRank(a.c) || b.p - a.p;
    if (how === 'new') return (b.t || 0) - (a.t || 0) || (a.id > b.id ? 1 : -1);
    return colorRank(b.c) - colorRank(a.c) || b.p - a.p || slotIdx(a) - slotIdx(b);
  });
}
/* 材料在哪裡掉、能做什麼（點材料格子顯示） */
export function matSources(id) {
  const from = [];
  Object.entries(MONSTERS).forEach(([mk, m]) => {
    if (!(m.drops || []).some(x => x[0] === id)) return;
    const rg = Object.values(REGIONS).filter(r => !r.wip && (r.mons || []).includes(mk)).map(r => r.name);
    from.push(`${rg.join('、') || '？'}的${m.name.replace(/（.*?）/g, '')}`);
  });
  const uses = [];
  const info = MAT_INFO[id] || [id, 'gray'];
  Object.values(GEAR_DEFS).forEach(d => {
    Object.entries(d.ver).forEach(([c, rec]) => {
      if ((rec.mats || []).some(([m]) => m === id) || (rec.any && rec.any[0] === info[1] && !uses.includes(d.name + '(' + c + ')'))) uses.push(d.name);
    });
  });
  return { from, uses: [...new Set(uses)] };
}
export function bpSources(id) {
  const from = [];
  Object.entries(MONSTERS).forEach(([mk, m]) => { if ((m.rare || []).some(x => x[0] === id)) from.push(`${m.name.replace(/（.*?）/g, '')}有機會掉`); });
  if (!from.length) {
    if (['bp_cloth_hat', 'bp_cloth_vest', 'bp_cloth_gloves', 'bp_cloth_shoes'].includes(id)) from.push('第一次進鐵匠鋪，鐵匠會送你');
    else if (Object.keys(MAT_INFO).includes(id)) from.push('主線任務「討伐草原任何 ★3 的魔物」的獎勵');
  }
  return from.join('、');
}

/* 材料分頁：格子＋點一下看說明（倉庫建築打開背包就停在這一頁） */
export function matsTab(ctx, sel) {
  const nw = ctx.NW(), esc = ctx.esc;
  /* 2b 還沒開放：維持原本的樣子，不透露鐵匠鋪的配方 */
  if (!stageOpen('2b')) {
    const rows0 = Object.entries(nw.mats).filter(([, n]) => n > 0).map(([id, n]) => { const [nm, c] = MAT_INFO[id] || [id, 'gray']; return `<div class="px-panel in flex justify-between"><span><span style="color:${COLOR_HEX[c]}">■</span> ${esc(nm)}</span><b>×${n}</b></div>`; });
    return `<h3 class="text-lg mb-2">材料</h3>${rows0.length ? `<div class="grid gap-2" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">${rows0.join('')}</div>` : '<p class="px-text">還沒有材料。打倒魔物就會掉。</p>'}
        <p class="text-xs mt-3" style="color:#aab0d8">鐵匠鋪開張就能用來打造武器和裝備。</p>`;
  }
  const rows = Object.entries(nw.mats).filter(([, n]) => n > 0).sort((a, b) => colorRank(MAT_INFO[b[0]] ? MAT_INFO[b[0]][1] : 'gray') - colorRank(MAT_INFO[a[0]] ? MAT_INFO[a[0]][1] : 'gray'));
  const cells = rows.map(([id, n]) => { const [nm, c] = MAT_INFO[id] || [id, 'gray']; return `<button class="px-panel in fg-mat" data-mat="${id}" style="display:flex;justify-content:space-between;gap:8px;text-align:left;color:#fff;font-weight:800;cursor:pointer;${sel === id ? 'outline:3px solid #ffd24a' : ''}"><span>${sq(c)} ${esc(nm)}</span><b>×${n}</b></button>`; }).join('');
  let detail = '<p class="text-sm mt-3 px-text" style="color:#aab0d8">點一下材料，看哪裡掉、可以做什麼。</p>';
  if (sel && MAT_INFO[sel]) {
    const [nm, c] = MAT_INFO[sel], s = matSources(sel);
    detail = `<div class="px-panel in mt-3"><b class="px-title">${sq(c)} ${esc(nm)}</b>（${COLOR_NAME[c]}色材料）<br>
      <span class="text-sm px-text">哪裡掉：${s.from.length ? esc(s.from.join('、')) : '老師的禮物'}</span><br>
      <span class="text-sm px-text">可以做：${s.uses.length ? esc(s.uses.join('、')) : '強化裝備'}（強化用同色以上的任何材料）</span></div>`;
  }
  return `<h3 class="text-lg mb-2">材料</h3>${rows.length ? `<div class="grid gap-2" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">${cells}</div>` : '<p class="px-text">還沒有材料。打倒魔物就會掉。</p>'}${detail}
    <p class="text-xs mt-3" style="color:#aab0d8">材料沒有上限。到鐵匠鋪用它們打造、強化裝備。</p>`;
}
/* 圖紙分頁：學會的亮、沒學會的灰＋哪裡拿 */
export function bpTab(ctx) {
  const nw = ctx.NW(), esc = ctx.esc;
  if (!stageOpen('2b')) {
    const rows0 = nw.bp.map(id => { const [nm, c] = MAT_INFO[id] || [id, 'gray']; return `<div class="px-panel in"><span style="color:${COLOR_HEX[c]}">📜</span> ${esc(nm)}</div>`; });
    return `<h3 class="text-lg mb-2">圖紙</h3>${rows0.length ? `<div class="grid gap-2" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">${rows0.join('')}</div>` : '<p class="px-text">還沒有圖紙。打倒魔物有機會掉。</p>'}`;
  }
  const ids = Object.keys(MAT_INFO).filter(id => id.startsWith('bp_'));
  const learned = ids.filter(id => nw.bp.includes(id)), unknown = ids.filter(id => !nw.bp.includes(id));
  const row = (id, ok) => { const [nm, c] = MAT_INFO[id]; return `<div class="px-panel in" style="${ok ? '' : 'opacity:.5;filter:grayscale(1)'}"><span style="color:${COLOR_HEX[c]}">📜</span> <b>${esc(nm)}</b>${ok ? '' : `<div class="text-xs" style="color:#aab0d8">${esc(bpSources(id))}</div>`}</div>`; };
  return `<h3 class="text-lg mb-2">圖紙</h3>${learned.length ? `<div class="grid gap-2" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">${learned.map(id => row(id, true)).join('')}</div>` : '<p class="px-text">還沒有圖紙。打倒魔物有機會掉。</p>'}
    ${unknown.length ? `<h3 class="text-sm mt-4 mb-2" style="color:#aab0d8">還沒學會的（灰色）</h3><div class="grid gap-2" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">${unknown.map(id => row(id, false)).join('')}</div>` : ''}
    <p class="text-xs mt-3" style="color:#aab0d8">圖紙學會了就不會用掉，同一張可以做很多件。</p>`;
}
/* 裝備分頁：4 欄格子（顏色邊框、右上小點、右下 +N），點一下就穿上。排序：顏色（預設）／種類／最新 */
export function gearTab(ctx, sort, sel) {
  const nw = ctx.NW(), esc = ctx.esc, items = sortGear(nw, sort || 'color');
  const worn = new Set(Object.values(nw.eq || {}).filter(Boolean));
  const cells = items.map(g => { const d = gearDef(g.k), dark = !!(d.wk && GIFT_WEAPONS[d.wk]);
    return `<button class="fg-cell ${worn.has(g.id) ? 'on' : ''} ${dark ? 'dark' : ''}" data-equip="${g.id}" data-gear-k="${g.k}" title="${esc(itemName(g))}：${esc(itemText(g))}（點一下穿上）" style="border-color:${COLOR_HEX[g.c]}">${sprite(g.k, 3)}${dark ? darkDots() : ''}<i class="fg-dot" style="background:${COLOR_HEX[g.c]}"></i>${g.p ? `<i class="fg-up">+${g.p}</i>` : ''}${worn.has(g.id) ? '<span class="fg-wear">穿</span>' : ''}</button>`; }).join('');
  const s = items.find(g => g.id === sel) || items.find(g => worn.has(g.id) && (gearDef(g.k) || {}).slot === 'weapon') || items[0];
  const d = s && gearDef(s.k);
  const detail = s && d ? `<div class="px-panel in mt-3"><b class="px-title">${esc(itemName(s))}</b> <span class="px-chip" style="color:${COLOR_HEX[s.c]}">${COLOR_NAME[s.c]}</span> <small style="color:#aab0d8">${esc(SLOT_NAME[d.slot])}</small><br>
    <span class="px-text" style="font-weight:800">${esc(itemText(s))}　戰力 ${itemPower(s)}</span><br><span class="text-sm" style="color:#ffd98a">${esc(slotNote(d.slot))}</span></div>` : '';
  /* 2b 還沒開放：只有武器，不顯示排序、戰力、說明（維持原本的樣子） */
  if (!stageOpen('2b')) return { html: `<h3 class="text-lg mb-2">裝備背包</h3><div class="fg-cells" style="max-width:420px" data-gear-cells>${cells}</div>`, current: s ? s.id : null };
  return { html: `<h3 class="text-lg mb-2">裝備背包 <small style="color:#aab0d8;font-size:.6em">${items.length}/${GEAR_MAX} 件　戰力 ${gearPower(nw)}</small></h3>
    <div class="flex gap-2 items-center mb-2 text-sm px-text" data-sorts>排序：${SORTS.map(([k, n]) => `<button class="fg-chip ${(sort || 'color') === k ? 'on' : ''}" data-sort="${k}">${n}</button>`).join('')}</div>
    <div class="fg-cells" style="max-width:420px" data-gear-cells>${cells || '<p class="px-text">還沒有裝備。</p>'}</div>${detail}`, current: s ? s.id : null };
}
