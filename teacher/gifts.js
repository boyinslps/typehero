/* 信箱禮物的種類。要跟學生端 newworld.js 的 REWARD 表（itemKnown／applyReward／itemLabel）一模一樣。
   學生端加了新種類，這裡的 GIFT_TYPES 也要加一列，不然老師寄不出去。

   清單內容一律從資料表自動產生（WORDS、GIFT_WEAPONS、ITEM_DEFS、MONSTERS 的 drops／rare、REGIONS…）：
   以後新增稱號、武器、道具、材料、圖紙，教師頁不用改就會出現。
   第 2 段的裝備（gear）也照這個做：在這裡加一列 { type:'gear', pick: () => 從 GEAR_DEFS 產生 … }，
   學生端 REWARD 加一列 gear，兩邊的 label 要一樣。

   teacher/nw.js 是各分頁共用的入口、目前有別人在改；新加的幾個名稱先直接從 nw-data.js 拿（見下面第二個 import）。 */
import { GIFT_WEAPONS, ITEM_DEFS, WORDS, WORD_GROUPS, MONSTERS, REGIONS, HR_MAX, weaponInfo, ownedWeapons } from './nw.js';
import { MAT_INFO, isBpId, TUT_LESSONS, ZONE_STAR_MAX, COLOR_NAME, GEAR_DEFS, GEAR_SLOTS, GEAR_MAX_P, gearDef, defColors, giftGearOk, itemName } from '../nw-data.js';

/* 材料與圖紙的名稱（顯示用，含圖紙）；每次現查 MAT_INFO，資料表之後加東西不用重開 */
const matName = id => (MAT_INFO[id] || [id])[0];
const wordName = id => (WORDS.find(w => w.id === id) || { w: id }).w;
const monName = id => (MONSTERS[id] || { name: id }).name;
const zoneName = id => (REGIONS[id] || { name: id }).name;
const lessonName = id => (TUT_LESSONS.find(([k]) => k === id) || ['', id])[1];

/* 材料屬於哪隻魔物（下拉分組用）；沒有魔物會掉的（之後的礦石之類）歸「其他」 */
const dropOwner = () => {
  const m = {};
  Object.values(MONSTERS).forEach(mo => {
    (mo.drops || []).forEach(([id]) => { m[id] = mo.name; });
    (mo.rare || []).forEach(([id]) => { m[id] = mo.name; });
  });
  return m;
};
const pickMats = () => { const o = dropOwner(); return Object.keys(MAT_INFO).filter(id => !isBpId(id)).map(id => ({ value: id, label: `${matName(id)}（${COLOR_NAME[MAT_INFO[id][1]] || ''}）`, group: o[id] || '其他' })); };
const pickBps = () => { const o = dropOwner(); return Object.keys(MAT_INFO).filter(isBpId).map(id => ({ value: id, label: matName(id), group: o[id] ? `${o[id]}掉的` : id.startsWith('bp_cloth') ? '鐵匠送的布裝' : '初心武器' })); };
const regionsOpen = () => Object.entries(REGIONS).filter(([, r]) => !r.wip);

/* 一種禮物一列：
   pick()    下拉選項 { value, label, group?, hint? }；group 有的話依組別顯示，hint 是選了以後顯示在旁邊的小字（稱號的解鎖條件）
   qty/def/min/max/unit  要不要數量、預設、範圍、數量前面的小字
   search    選項很多，附搜尋框
   note      這種禮物的提醒（老師看的）
   mailOnly  補發／救援用的種類，只在信箱出現，活動獎勵不放
   big(it)   超過平常用量就再確認一次（util.js 的 confirmBig） */
export const GIFT_TYPES = [
  { type: 'weapon', label: '🗡 武器', pick: () => Object.entries(GIFT_WEAPONS).map(([k, w]) => ({ value: k, label: w.name, hint: w.fam })), qty: false },
  { type: 'coins', label: '🪙 字元', qty: true, def: 100, big: it => it.n > 1000, bigNorm: 1000 },
  { type: 'potion', label: '🧪 回復藥', qty: true, def: 3, big: it => it.n > 20, bigNorm: 20 },
  { type: 'exp', label: '⭐ 獵人經驗（加上去）', qty: true, def: 50, big: it => it.n > 500, bigNorm: 500 },
  { type: 'item', label: '🎴 道具（改名卡等）', pick: () => Object.entries(ITEM_DEFS).filter(([k]) => k !== 'potion').map(([k, d]) => ({ value: k, label: d.name, hint: d.desc })), qty: true, def: 1,
    big: it => it.key === 'renameCard' && it.n > 5, bigNorm: 5 },
  { type: 'mat', label: '📦 材料', pick: pickMats, qty: true, def: 1, search: true, big: it => it.n > 50, bigNorm: 50 },
  { type: 'bp', label: '📜 圖紙', pick: pickBps, qty: false, search: true,
    note: '學生學會這張圖紙；已經會了就什麼都不加。' },
  /* 裝備（2b）：一件做好的裝備，顏色只能選那件做得出來的、強化 +0～+5。學生背包滿 60 件就先留著不領 */
  { type: 'gear', label: '🛡 裝備', gear: true, pick: () => Object.entries(GEAR_DEFS).map(([k, d]) => ({ value: k, label: d.name, group: (GEAR_SLOTS.find(s => s[0] === d.slot) || ['', '其他'])[1] })), qty: false, search: true,
    note: '寄一件做好的裝備（選顏色、強化幾）。裝備遺失或被弄壞時，補寄同樣的就好。學生的裝備滿 60 件時這封信會先留著。' },
  { type: 'word', label: '🏅 稱號詞條', pick: () => WORDS.map(w => ({ value: w.id, label: w.w, group: w.g, hint: w.how })), qty: false, search: true,
    note: '任何稱號詞條都能頒，領到就解鎖，不用達成條件。學生要到背包點名字下面的稱號才能戴上。' },
  { type: 'hr', label: '⭐ 獵人等級（直接升到）', qty: true, def: 5, min: 2, max: HR_MAX, unit: '升到 HR', mailOnly: true, big: it => it.n > 15, bigNorm: 15,
    note: '補發用：直接升到這個等級，已經比這高就不變（不會往下）。星星跟著等級走。想加一點經驗請用「獵人經驗」。' },
  { type: 'zone', label: '🗺 區域進度（打贏到 ★幾）', pick: () => regionsOpen().map(([k, r]) => ({ value: k, label: `${r.icon} ${r.name}` })), qty: true, def: 1, min: 1, max: ZONE_STAR_MAX, unit: '★', mailOnly: true,
    big: it => it.n >= 5, bigNorm: 4,
    note: '補發用：★n 以下都算打贏，只往上不往下。★5 會開放下一個區域；「草原王」等詞條與主線任務也會跟著算達成。' },
  { type: 'dex', label: '📖 魔物圖鑑（標成打過）', pick: () => Object.keys(MONSTERS).filter(k => !MONSTERS[k].wip).map(k => ({ value: k, label: monName(k) })), qty: false, mailOnly: true,
    note: '補發用：圖鑑標成「打過」（至少 1 次）。不會改打倒次數，也不給字元。「博學」「測試員」等詞條會跟著算達成。' },
  { type: 'tut', label: '🏫 教學課（標成學會）', pick: () => TUT_LESSONS.map(([k, n]) => ({ value: k, label: `${n}課` })), qty: false, mailOnly: true,
    note: '補發用：標成學會，不給那堂課的 200 字元（要給請另外放字元）。三堂都學會，主線任務與測試員任務會自己往前。' }
];
export const giftType = t => GIFT_TYPES.find(x => x.type === t);

/* 下拉要分幾組：選項有 group 就依出現順序分組；稱號固定照 WORD_GROUPS 的順序（等級、武器、成就） */
export function optGroups(g, opts) {
  if (!opts.some(o => o.group)) return null;
  const seen = [...new Set(opts.map(o => o.group))];
  return g.type === 'word' ? WORD_GROUPS.filter(x => seen.includes(x)).concat(seen.filter(x => !WORD_GROUPS.includes(x))) : seen;
}
/* 搜尋：名稱、解鎖條件文字、id 都比對；空字串回全部 */
export function filterOpts(opts, q) {
  const t = String(q || '').trim().toLowerCase();
  return t ? opts.filter(o => `${o.label} ${o.hint || ''} ${o.value}`.toLowerCase().includes(t)) : opts;
}
/* <select> 的選項 HTML（有分組就用 optgroup）。value 在 opts 裡才會 selected */
export function optionsHtml(g, opts, value, esc) {
  const one = o => `<option value="${esc(o.value)}" ${o.value === value ? 'selected' : ''}>${esc(o.label)}</option>`;
  const gs = optGroups(g, opts);
  return gs ? gs.map(gr => `<optgroup label="${esc(gr)}">${opts.filter(o => o.group === gr).map(one).join('')}</optgroup>`).join('') : opts.map(one).join('');
}
/* 選項旁邊的小字：這個選項的 hint（稱號的解鎖條件），沒有就顯示這種禮物的提醒 */
export function hintText(it) {
  const g = giftType(it.type); if (!g) return '';
  const o = g.pick ? g.pick().find(x => x.value === it.key) : null;
  if (g.type === 'word' && o) return `解鎖條件：${o.hint}`;
  return (o && o.hint && g.type !== 'item' && g.type !== 'weapon') ? o.hint : (g.note || '');
}

/* 新的一列（預設值） */
export function newItem(type) {
  const g = giftType(type), it = { type };
  if (g.pick) it.key = g.pick()[0].value;
  if (g.qty) it.n = g.def;
  if (g.gear) { it.c = defColors(gearDef(it.key))[0]; it.p = 0; }
  return it;
}
/* 裝備列多出來的兩個下拉（顏色、強化）；換了裝備，顏色要重新對到那件做得出來的顏色 */
export function fixGear(it) {
  if (!it || it.type !== 'gear') return;
  const cols = defColors(gearDef(it.key));
  if (!cols.includes(it.c)) it.c = cols[0];
  if (!Number.isInteger(it.p) || it.p < 0 || it.p > GEAR_MAX_P) it.p = 0;
}
export const gearFieldsHtml = (it, i, ac, ap, esc) => `<select class="inp" ${ac}="${i}" aria-label="顏色">${defColors(gearDef(it.key)).map(c => `<option value="${c}" ${c === it.c ? 'selected' : ''}>${esc(COLOR_NAME[c])}色</option>`).join('')}</select><select class="inp" ${ap}="${i}" aria-label="強化">${Array.from({ length: GEAR_MAX_P + 1 }, (_, p) => `<option value="${p}" ${p === it.p ? 'selected' : ''}>+${p}</option>`).join('')}</select>`;

/* 跟學生信箱的 itemLabel() 同樣的字 */
export const itemLabel = it => !it ? '' : ({
  weapon: () => `🗡 ${(GIFT_WEAPONS[it.key] || { name: '新武器' }).name}`,
  coins: () => `🪙 字元 ×${it.n}`, potion: () => `🧪 回復藥 ×${it.n}`, exp: () => `⭐ 獵人經驗 +${it.n}`,
  item: () => `🎴 ${(ITEM_DEFS[it.key] || { name: '道具' }).name} ×${it.n}`,
  mat: () => `📦 ${matName(it.key)} ×${it.n}`, word: () => `🏅 稱號詞條「${wordName(it.key)}」`,
  bp: () => `📜 圖紙「${matName(it.key)}」`, hr: () => `⭐ 獵人等級升到 ${it.n}`,
  zone: () => `🗺 ${zoneName(it.key)} ★${it.n} 以下都算過關`, dex: () => `📖 圖鑑：${monName(it.key)}`,
  tut: () => `🏫 教學大樓：${lessonName(it.key)}課學會了`,
  gear: () => `🛡 ${(gearDef(it.key) || { name: '新裝備' }).name}${it.p ? ' +' + it.p : ''}`
}[it.type] || (() => '❓ 新東西'))();

/* 寄出前檢查一列禮物；回錯誤文字或 '' */
export function itemError(it) {
  const g = giftType(it.type);
  if (!g) return '不認得的禮物種類';
  if (g.pick && !g.pick().some(o => o.value === it.key)) return `${g.label}：請選一個`;
  if (g.gear && !giftGearOk(it)) return `${g.label}：顏色或強化不對`;
  const lo = g.min || 1, hi = g.max || 100000;
  if (g.qty && !(Number.isInteger(it.n) && it.n >= lo && it.n <= hi)) return `${g.label}：數量要是 ${lo}～${hi} 的整數`;
  return '';
}

/* 數量比平常多很多：util.js 的 confirmBig 用。每種禮物自己訂門檻（見 GIFT_TYPES 的 big／bigNorm） */
export const isBigItem = it => { const g = it && giftType(it.type); return !!(g && g.big && g.big(it)); };
export const bigNorm = it => (giftType(it.type) || {}).bigNorm;

/* 學生已經有哪些東西（學生卡、人物卡用），老師才知道要給什麼、不重複給。
   名稱照資料表翻成中文；資料表沒有的 id（舊版留下的）直接顯示 id */
export function ownedSummary(nw) {
  if (!nw) return null;
  const have = new Set(nw.words || []), cnt = (obj, name) => Object.keys(obj || {}).filter(k => obj[k] > 0).map(k => `${name(k)}×${obj[k]}`);
  return {
    words: WORD_GROUPS.map(gr => ({ g: gr, names: WORDS.filter(w => w.g === gr && have.has(w.id)).map(w => w.w) })),
    wordN: WORDS.filter(w => have.has(w.id)).length,
    mats: cnt(nw.mats, matName),
    bps: (nw.bp || []).map(matName),
    items: cnt(nw.items, k => (ITEM_DEFS[k] || { name: k }).name),
    weapons: ownedWeapons(nw).map(k => (weaponInfo(k) || { name: k }).name),
    gears: (nw.gear || []).filter(g => gearDef(g.k)).map(g => itemName(g))
  };
}
