/* 信箱禮物的種類。要跟學生端 newworld.js 的 applyReward()／itemKnown() 一模一樣：
   weapon、coins、potion、exp、item（ITEM_DEFS 裡的道具，例如改名卡）、mat（材料）、word（稱號詞條，例如 bugking）。
   學生端加了新種類，這裡的 GIFT_TYPES 也要加，不然老師寄不出去。 */
import { GIFT_WEAPONS, ITEM_DEFS, WORDS, WORD_GROUPS, MONSTERS, STARTERS } from './nw.js';

/* 材料名稱：跟 newworld.js 的 MAT 同一個算法（魔物掉落＋稀有掉落＋初心武器圖紙） */
export const MATS = (() => {
  const m = {};
  Object.values(MONSTERS).forEach(mo => {
    (mo.drops || []).forEach(([id, name]) => { m[id] = name; });
    (mo.rare || []).forEach(([id, name]) => { m[id] = name.replace('📜 ', ''); });
  });
  Object.entries(STARTERS).forEach(([k, st]) => { m['bp_' + k] = st.name + '圖紙'; });
  return m;
})();
const matName = id => MATS[id] || id;
const wordName = id => (WORDS.find(w => w.id === id) || { w: id }).w;

/* 下拉選項：{ value, label }；word 另外分組 */
export const GIFT_TYPES = [
  { type: 'weapon', label: '🗡 武器', pick: () => Object.entries(GIFT_WEAPONS).map(([k, w]) => ({ value: k, label: w.name })), qty: false },
  { type: 'coins', label: '🪙 字元', qty: true, def: 100 },
  { type: 'potion', label: '🧪 回復藥', qty: true, def: 3 },
  { type: 'exp', label: '⭐ 獵人經驗', qty: true, def: 50 },
  { type: 'item', label: '🎴 道具（改名卡等）', pick: () => Object.entries(ITEM_DEFS).filter(([k]) => k !== 'potion').map(([k, d]) => ({ value: k, label: d.name })), qty: true, def: 1 },
  { type: 'mat', label: '📦 材料', pick: () => Object.keys(MATS).map(k => ({ value: k, label: MATS[k] })), qty: true, def: 1 },
  { type: 'word', label: '🏅 稱號詞條', pick: () => WORDS.map(w => ({ value: w.id, label: w.w, group: w.g })), qty: false, groups: WORD_GROUPS }
];
export const giftType = t => GIFT_TYPES.find(x => x.type === t);

/* 新的一列（預設值） */
export function newItem(type) {
  const g = giftType(type), it = { type };
  if (g.pick) it.key = g.pick()[0].value;
  if (g.qty) it.n = g.def;
  return it;
}

/* 跟學生信箱的 itemLabel() 同樣的字 */
export const itemLabel = it => !it ? '' : ({
  weapon: () => `🗡 ${(GIFT_WEAPONS[it.key] || { name: '新武器' }).name}`,
  coins: () => `🪙 字元 ×${it.n}`, potion: () => `🧪 回復藥 ×${it.n}`, exp: () => `⭐ 獵人經驗 +${it.n}`,
  item: () => `🎴 ${(ITEM_DEFS[it.key] || { name: '道具' }).name} ×${it.n}`,
  mat: () => `📦 ${matName(it.key)} ×${it.n}`, word: () => `🏅 稱號詞條「${wordName(it.key)}」`
}[it.type] || (() => '❓ 新東西'))();

/* 寄出前檢查一列禮物；回錯誤文字或 '' */
export function itemError(it) {
  const g = giftType(it.type);
  if (!g) return '不認得的禮物種類';
  if (g.pick && !g.pick().some(o => o.value === it.key)) return `${g.label}：請選一個`;
  if (g.qty && !(Number.isInteger(it.n) && it.n >= 1 && it.n <= 100000)) return `${g.label}：數量要是 1～100000 的整數`;
  return '';
}
