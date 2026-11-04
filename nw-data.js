export const TIERS = {
  A: { cast: 10, dodge: 2.0, defend: 5.0, castMin: 7, slow: 1.5 },
  B: { cast: 8, dodge: 1.5, defend: 4.0, castMin: 4, slow: 1 },
  C: { cast: 6, dodge: 1.2, defend: 3.5, castMin: 4, slow: 1 },
  D: { cast: 5, dodge: 1.0, defend: 3.0, castMin: 4, slow: 1 }
};

export const LOOK = {
  styles: [['short', '短髮'], ['long', '長髮'], ['pony', '馬尾'], ['bun', '包包頭'], ['spiky', '刺刺頭']],
  hairColors: ['#5a3a22', '#1a1a22', '#e8b64c', '#c0392b', '#ff7aa8', '#4a8fd8', '#8a4ad8', '#e8e8e8'],
  skins: ['#f6d7b8', '#f2c7a0', '#e0a878', '#c98e62', '#8a5a3a']
};
export const DEFAULT_LOOK = { style: 0, hair: 0, skin: 1 };

export function heroLook(look, weapon, gear) {
  const l = Object.assign({}, DEFAULT_LOOK, look || {});
  return Object.assign({
    style: LOOK.styles[l.style] ? LOOK.styles[l.style][0] : 'short',
    hair: LOOK.hairColors[l.hair] || LOOK.hairColors[0],
    skin: LOOK.skins[l.skin] || LOOK.skins[1],
    armor: '#8d8d8d', trim: '#b8b8b8', helm: 'none', weapon: weapon || 'staff'
  }, gear || {});
}

export const STARTERS = {
  staff: { name: '學徒木杖', kind: '法杖', fam: '熟悉的', desc: '每答 5 題會「詠唱」一次：把一長串標點很多的咒語全部打對，傷害變 3 倍！' },
  bow: { name: '獵人短弓', kind: '長弓', fam: '熟悉的', desc: '答對會集滿力量條，滿了就變神射手：連打 3 題，傷害變 2 倍。' },
  dagger: { name: '鐵製小刀', kind: '雙刀', fam: '熟悉的', desc: '每答 5 題砍一次「連環斬」，一串詞語打得越快越痛。' },
  crossbow: { name: '木弩', kind: '連弩', fam: '新的', desc: '答對一個字就裝一支箭。輸入框空著時按 Enter，把箭一口氣射出去！' }
};

export const LOCKED_WEAPONS = [
  ['book', '元素書', 6], ['shield', '劍盾', 2], ['fist', '拳套', 2], ['great', '大劍', 5], ['bell', '召喚鈴', 5]
];

export const REGIONS = {
  grass: { name: '新芽草原', icon: '🌱', lv: [1, 12], mons: ['coo', 'frog', 'shroom'], note: '沒有特別的麻煩，最適合新手。' },
  forest: { name: '迷霧森林', icon: '🌲', lv: [10, 22], mons: ['shroom', 'coo', 'wolf'], needs: 'grass', note: '木屬性的招式變強，大霧一直飄。' },
  coast: { name: '珊瑚海岸', icon: '🌊', wip: 3 },
  volcano: { name: '熔岩火山', icon: '🌋', wip: 3 },
  snow: { name: '冰封雪原', icon: '❄', wip: 6 },
  sky: { name: '天空遺跡', icon: '☁', wip: 6 },
  abyss: { name: '深淵裂谷', icon: '🌑', wip: 6 }
};

export const MAP_POS = {
  grass: [14, 74], forest: [38, 52], coast: [14, 36], volcano: [64, 70], snow: [38, 20], sky: [66, 12], abyss: [88, 44]
};

export const ELEM = { wood: '🌿', water: '💧', fire: '🔥', light: '☀', dark: '🌙', none: '—' };
export const STATUS = { burn: '🔥 燃燒', poison: '☠ 中毒', ice: '❄ 寒冰' };

export const MONSTERS = {
  coo: {
    name: '咕咕鳥', elem: 'wood', ask: 'word', fear: 'fire', resist: 'water', lean: '偏閃避',
    sp: '啄得很快，但每下都不太痛。', spKey: 'quick', hpMul: 0.85,
    attacks: [
      { name: '衝刺啄', type: 'dodge', mul: 0.7 },
      { name: '拍翅狂風', type: 'defend', mul: 0.7 }
    ],
    drops: [['coo_feather', '咕咕羽毛', 'gray', 2, 4], ['coo_down', '柔軟絨毛', 'green', 1, 2]],
    rare: [['bp_coo_hat', '📜 咕咕帽圖紙', 'green']]
  },
  frog: {
    name: '泡泡蛙', elem: 'water', ask: 'zhuyin', fear: 'wood', resist: 'fire', lean: '偏防禦',
    sp: '會吐泡泡，泡泡會擋住注音提示。', spKey: 'bubble', hpMul: 1,
    attacks: [
      { name: '泡泡雨', type: 'defend', mul: 0.9, status: 'ice' },
      { name: '舌頭彈', type: 'dodge', mul: 0.9 }
    ],
    drops: [['frog_slime', '泡泡黏液', 'gray', 2, 4], ['frog_skin', '濕潤蛙皮', 'green', 1, 2]],
    rare: [['bp_frog_boots', '📜 泡泡靴圖紙', 'green']]
  },
  shroom: {
    name: '跳跳菇', elem: 'wood', ask: 'zhuyin', fear: 'fire', resist: 'water', lean: '一半一半',
    sp: '會灑孢子，題目的字會變得很小。', spKey: 'spore', hpMul: 1,
    attacks: [
      { name: '跳起來壓', type: 'dodge', mul: 1 },
      { name: '孢子雲', type: 'defend', mul: 0.8, status: 'poison' }
    ],
    drops: [['shroom_cap', '蘑菇傘', 'gray', 2, 4], ['shroom_spore', '閃亮孢子', 'green', 1, 2]],
    rare: [['bp_shroom_cap', '📜 蘑菇帽圖紙', 'green']]
  },
  wolf: {
    name: '炎牙狼', elem: 'fire', ask: 'word', fear: 'water', resist: 'wood', lean: '很偏閃避',
    sp: '生氣以後，攻擊會變成兩倍快！', spKey: 'rage', hpMul: 1.15,
    attacks: [
      { name: '飛撲', type: 'dodge', mul: 1.1, status: 'burn' },
      { name: '連咬', type: 'dodge', mul: 0.9 },
      { name: '火焰衝擊', type: 'defend', mul: 0.9 }
    ],
    drops: [['wolf_fur', '狼毛', 'green', 2, 3], ['wolf_fang', '炎牙', 'blue', 1, 2]],
    rare: [['bp_flame_dagger', '📜 炎牙刀圖紙', 'blue']]
  }
};

export const regionLv = (rk, star) => {
  const r = REGIONS[rk];
  return Math.round(r.lv[0] + (r.lv[1] - r.lv[0]) * (star - 1) / 4);
};

export const BAL = {
  playerHp: 100,
  perChar: 9,
  hpBase: 440,
  hpPerLv: 20,
  atkBase: 6,
  atkPerLv: 0.9,
  timeLimit: 300,
  castMul: 1.5,
  downRest: 10,
  downMax: 3,
  angryAt: 0.5,
  angryTaken: 1.2,
  minShow: 0.4,
  wrongRatio: 0.5,
  wrongHit: 10,
  quickMul: 0.6,
  chantEvery: 5,
  chantMul: 3,
  sharpShots: 3,
  sharpMul: 2,
  gaugePer: 22,
  flurryMin: 1.2, flurryMax: 3.2, flurrySlope: 0.5,
  magMax: 20,
  arrowMul: 0.5,
  arrowDmg: 7,
  arrowBonusPer: 0.04
};

export const HP_TIER = { A: 0.35, B: 0.5, C: 0.7, D: 1.7 };
export const monMaxHp = (mk, lv, tier) => Math.round((BAL.hpBase + BAL.hpPerLv * lv) * MONSTERS[mk].hpMul * (HP_TIER[tier] || HP_TIER.B));
export const monDmg = (lv, mul) => Math.max(4, Math.round((BAL.atkBase + BAL.atkPerLv * lv) * mul));
export const atkInterval = (lv, tier, angryRage) => {
  let t = 30 - 15 * (lv - 1) / 54;
  t *= (TIERS[tier] || TIERS.B).slow;
  return angryRage ? t / 2 : t;
};
export const castTime = (lv, tier) => {
  const T = TIERS[tier] || TIERS.B;
  return Math.max(T.castMin, T.cast - Math.floor(lv / 15)) * BAL.castMul;
};

export const hrNeed = hr => 20 + 15 * (hr - 1);
export const HR_MAX = 50;
export function addHrExp(nw, exp) {
  let ups = 0;
  nw.hrExp += exp;
  while (nw.hr < HR_MAX && nw.hrExp >= hrNeed(nw.hr)) {
    nw.hrExp -= hrNeed(nw.hr); nw.hr++; nw.stars++; ups++;
  }
  if (nw.hr >= HR_MAX) nw.hrExp = 0;
  return ups;
}
export const huntExp = (lv, win) => Math.round((20 + 3 * lv) * (win ? 1 : 0.5));
export const huntCoins = (lv, win) => Math.round((20 + 6 * lv) * (win ? 1 : 0.5));

export const COLOR_NAME = { gray: '灰', green: '綠', blue: '藍', purple: '紫' };
export const COLOR_HEX = { gray: '#9aa3ad', green: '#6aa84f', blue: '#3f9be0', purple: '#a06ad8' };

export const MAIN_QUESTS = [
  { id: '1-0', ch: 1, t: '選擇你的初心武器', hint: '在「裝備與造型」選一把武器', reward: { items: { potion: 3 } }, rewardText: '回復藥 ×3', test: nw => !!nw.starter },
  { id: '1-1', ch: 1, t: '討伐泡泡蛙（草原 ★1）', hint: '到委託板，選草原的泡泡蛙。藍色的攻擊要打「防」', rewardText: '獵人經驗 +30', reward: { hrExp: 30 }, test: nw => (nw.dex.frog || 0) > 0 },
  { id: '1-2', ch: 1, t: '討伐咕咕鳥（草原 ★1）', hint: '紅色的攻擊要在快滿的時候打「閃」', rewardText: '獵人經驗 +30', reward: { hrExp: 30 }, test: nw => (nw.dex.coo || 0) > 0 },
  { id: '1-3', ch: 1, t: '閃避成功 5 次、防禦成功 5 次', hint: '狩獵時多試試閃避和防禦', rewardText: '稱號「見習獵人」', reward: { title: '見習獵人' }, test: nw => nw.stat.dodgeOk >= 5 && nw.stat.defOk >= 5, prog: nw => `閃避 ${Math.min(5, nw.stat.dodgeOk)}/5　防禦 ${Math.min(5, nw.stat.defOk)}/5` },
  { id: '1-4', ch: 1, t: '討伐草原任何 ★3 的魔物', hint: '先打過 ★1、★2 才會開放 ★3', rewardText: '另外三把初心武器的圖紙', reward: { bp: ['bp_staff', 'bp_bow', 'bp_dagger', 'bp_crossbow'] }, test: nw => (nw.zone.grass || 0) >= 3 },
  { id: '1-7', ch: 1, t: '討伐草原任何 ★5 的魔物', hint: '打倒 ★5 就會開放迷霧森林', rewardText: '開放迷霧森林', reward: {}, test: nw => (nw.zone.grass || 0) >= 5 }
];

export const defaultNw = () => ({
  v: 1, savedAt: 0, look: null, starter: null, swaps: 0, hunts: 0,
  hr: 1, hrExp: 0, stars: 0, coins: 0, mats: {}, items: {}, bp: [],
  zone: { grass: 0, forest: 0 }, dex: {}, fastest: {},
  quest: { done: [] }, title: '',
  stat: { dodgeOk: 0, dodgeAll: 0, defOk: 0, defAll: 0, accN: 0, accSum: 0, wins: 0, fails: 0 },
  flags: 0
});

export function normalizeNw(d) {
  const b = defaultNw();
  if (!d || typeof d !== 'object') return b;
  const o = Object.assign(b, d);
  o.zone = Object.assign(b.zone, d.zone || {});
  o.stat = Object.assign(b.stat, d.stat || {});
  o.quest = Object.assign(b.quest, d.quest || {});
  if (!Array.isArray(o.quest.done)) o.quest.done = [];
  o.mats = d.mats || {}; o.items = d.items || {}; o.dex = d.dex || {}; o.fastest = d.fastest || {};
  o.bp = Array.isArray(d.bp) ? d.bp : [];
  return o;
}

export const currentQuest = nw => MAIN_QUESTS.find(q => !nw.quest.done.includes(q.id)) || null;

export function zoneOpen(nw, rk) {
  const r = REGIONS[rk];
  if (!r || r.wip) return false;
  if (!r.needs) return true;
  return (nw.zone[r.needs] || 0) >= 5;
}
export const starOpen = (nw, rk, star) => star <= 1 || (nw.zone[rk] || 0) >= star - 1;
