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

export const GIFT_WEAPONS = {
  testblade: { name: '測試者之刃', kind: '黑刃', fam: '測試者限定', base: 'dagger', dmgMul: 1.12, chantEvery: 4, dark: true,
    desc: '黑色粒子環繞的雙刀，只送給幫忙測試的人。打中的傷害多 12%，連環斬每 4 題就能砍一次（一般雙刀是 5 題）。' }
};
export const weaponInfo = k => STARTERS[k] || GIFT_WEAPONS[k] || null;
export const weaponBase = k => (GIFT_WEAPONS[k] && GIFT_WEAPONS[k].base) || k;
export const curWeapon = nw => (nw.equip && (nw.gw || []).includes(nw.equip)) ? nw.equip : nw.starter;

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
    name: '泡泡蛙', elem: 'water', ask: 'word', fear: 'wood', resist: 'fire', lean: '偏防禦',
    sp: '會吐泡泡，泡泡會遮住字旁邊的注音小字。', spKey: 'bubble', hpMul: 1,
    attacks: [
      { name: '泡泡雨', type: 'defend', mul: 0.9, status: 'ice' },
      { name: '舌頭彈', type: 'dodge', mul: 0.9 }
    ],
    drops: [['frog_slime', '泡泡黏液', 'gray', 2, 4], ['frog_skin', '濕潤蛙皮', 'green', 1, 2]],
    rare: [['bp_frog_boots', '📜 泡泡靴圖紙', 'green']]
  },
  shroom: {
    name: '跳跳菇', elem: 'wood', ask: 'word', fear: 'fire', resist: 'water', lean: '一半一半',
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

export const ATTACKS_OPEN = { coo: ['single', 'pair'], frog: ['slam'], shroom: [], wolf: [] };
export const TEST_TAGS = { coo: '閃避測試', frog: '防禦測試', shroom: '攻擊測試' };
export const attacksOn = () => Object.values(ATTACKS_OPEN).some(a => a.length > 0);
export const MAX_CHARS = star => (star <= 2 ? 4 : star <= 4 ? 6 : 8);
export const CHANT_MAX = 6;
export const FB_COINS = 30;
export const BUG_COINS = 15;
export const LESSON_COINS = 200;
export const BUG_REWARD_MAX = 5;
export const TESTER_MISSIONS = [
  { id: 'm_dodge', icon: '💨', t: '閃避測試員', how: '打贏咕咕鳥（閃避測試）', test: n => (n.dex.coo || 0) > 0, coins: 20 },
  { id: 'm_defend', icon: '🛡', t: '防禦測試員', how: '打贏泡泡蛙（防禦測試）', test: n => (n.dex.frog || 0) > 0, coins: 20 },
  { id: 'm_attack', icon: '⌨', t: '攻擊測試員', how: '打贏跳跳菇（攻擊測試）', test: n => (n.dex.shroom || 0) > 0, coins: 20 },
  { id: 'm_school', icon: '🏫', t: '教學大樓畢業', how: '完成教學大樓的三堂課', test: n => !!(n.tut && n.tut.dodge && n.tut.defend && n.tut.attack), coins: 30 },
  { id: 'm_fb', icon: '📝', t: '評論家', how: '寫 3 份測試回饋', test: n => Object.values(n.fb || {}).filter(v => v === 1).length >= 3, coins: 40 },
  { id: 'm_bug1', icon: '🐛', t: '除蟲員', how: '回報 1 個問題（老師確認才算）', test: n => (n.bugs || 0) >= 1, coins: 20 },
  { id: 'm_bug5', icon: '🐞', t: '蟲蟲剋星', how: '回報 5 個問題（老師確認才算）', test: n => (n.bugs || 0) >= 5, coins: 60 }
];
export function checkMissions(nw) {
  const got = [];
  for (const m of TESTER_MISSIONS) if (!nw.tm[m.id] && m.test(nw)) { nw.tm[m.id] = 1; nw.coins += m.coins; got.push(m); }
  return got;
}
export const FB_MINLEN = 5;
export const SHORT_CHANTS = [
  { t: '風起，雲湧', z: 'ㄈㄥ ㄑㄧˇ - ㄩㄣˊ ㄩㄥˇ' },
  { t: '星光，閃耀', z: 'ㄒㄧㄥ ㄍㄨㄤ - ㄕㄢˇ ㄧㄠˋ' },
  { t: '火焰，燃燒', z: 'ㄏㄨㄛˇ ㄧㄢˋ - ㄖㄢˊ ㄕㄠ' },
  { t: '水流，不停', z: 'ㄕㄨㄟˇ ㄌㄧㄡˊ - ㄅㄨˋ ㄊㄧㄥˊ' },
  { t: '大地，守護', z: 'ㄉㄚˋ ㄉㄧˋ - ㄕㄡˇ ㄏㄨˋ' },
  { t: '雷聲，隆隆', z: 'ㄌㄟˊ ㄕㄥ - ㄌㄨㄥˊ ㄌㄨㄥˊ' },
  { t: '光明，降臨', z: 'ㄍㄨㄤ ㄇㄧㄥˊ - ㄐㄧㄤˋ ㄌㄧㄣˊ' },
  { t: '冰雪，凍結', z: 'ㄅㄧㄥ ㄒㄩㄝˇ - ㄉㄨㄥˋ ㄐㄧㄝˊ' },
  { t: '樹木，生長', z: 'ㄕㄨˋ ㄇㄨˋ - ㄕㄥ ㄓㄤˇ' },
  { t: '勇氣，出現', z: 'ㄩㄥˇ ㄑㄧˋ - ㄔㄨ ㄒㄧㄢˋ' },
  { t: '烏雲，散開', z: 'ㄨ ㄩㄣˊ - ㄙㄢˋ ㄎㄞ' },
  { t: '山高，水長流', z: 'ㄕㄢ ㄍㄠ - ㄕㄨㄟˇ ㄔㄤˊ ㄌㄧㄡˊ' },
  { t: '日出，天大亮', z: 'ㄖˋ ㄔㄨ - ㄊㄧㄢ ㄉㄚˋ ㄌㄧㄤˋ' },
  { t: '花開，蝴蝶來', z: 'ㄏㄨㄚ ㄎㄞ - ㄏㄨˊ ㄉㄧㄝˊ ㄌㄞˊ' }
];

Object.entries(TEST_TAGS).forEach(([k, t]) => { if (MONSTERS[k]) MONSTERS[k].name += `（${t}）`; });

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
export const HP_PLAYERS = { 1: 1, 2: 1.75, 3: 2.4, 4: 3 };
export const hpPlayersMul = n => HP_PLAYERS[Math.max(1, Math.min(4, Math.round(n) || 1))];
export const monMaxHp = (mk, lv, tier, players = 1) => Math.round((BAL.hpBase + BAL.hpPerLv * lv) * MONSTERS[mk].hpMul * (HP_TIER[tier] || HP_TIER.B) * hpPlayersMul(players));
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
  { id: '1-0a', ch: 1, soft: true, building: 'academy', t: '到教學大樓學會三堂課', hint: '村莊左下角的教學大樓：閃避、防禦、打字各一堂，跟著黃色箭頭走', rewardText: '字元 ×100', reward: { coins: 100 }, test: nw => !!(nw.tut && nw.tut.dodge && nw.tut.defend && nw.tut.attack) },
  { id: '1-1', ch: 1, target: { mk: 'frog', star: 1 }, t: '討伐泡泡蛙（草原 ★1）', hint: '到委託板，選草原的泡泡蛙', rewardText: '獵人經驗 +30', reward: { hrExp: 30 }, test: nw => (nw.dex.frog || 0) > 0 },
  { id: '1-2', ch: 1, target: { mk: 'coo', star: 1 }, t: '討伐咕咕鳥（草原 ★1）', hint: '到委託板，選草原的咕咕鳥', rewardText: '獵人經驗 +30', reward: { hrExp: 30 }, test: nw => (nw.dex.coo || 0) > 0 },
  { id: '1-3', ch: 1, hold: () => !attacksOn(), t: '閃避成功 5 次、防禦成功 5 次', hint: '狩獵時多試試閃避和防禦', rewardText: '稱號詞條「見習」', reward: {}, test: nw => nw.stat.dodgeOk >= 5 && nw.stat.defOk >= 5, prog: nw => `閃避 ${Math.min(5, nw.stat.dodgeOk)}/5　防禦 ${Math.min(5, nw.stat.defOk)}/5` },
  { id: '1-4', ch: 1, target: { rk: 'grass', star: 3 }, t: '討伐草原任何 ★3 的魔物', hint: '先打過 ★1、★2 才會開放 ★3', rewardText: '另外三把初心武器的圖紙', reward: { bp: ['bp_staff', 'bp_bow', 'bp_dagger', 'bp_crossbow'] }, test: nw => (nw.zone.grass || 0) >= 3 },
  { id: '1-7', ch: 1, target: { rk: 'grass', star: 5 }, t: '討伐草原任何 ★5 的魔物', hint: '打倒 ★5 就會開放迷霧森林', rewardText: '開放迷霧森林', reward: {}, test: nw => (nw.zone.grass || 0) >= 5 }
];

export const defaultNw = () => ({
  v: 1, savedAt: 0, look: null, starter: null, swaps: 0, hunts: 0,
  hr: 1, hrExp: 0, stars: 0, coins: 0, mats: {}, items: {}, bp: [],
  zone: { grass: 0, forest: 0 }, dex: {}, fastest: {},
  quest: { done: [] }, title: '', titleParts: [], words: [], used: {}, wwin: {},
  stat: { dodgeOk: 0, dodgeAll: 0, defOk: 0, defAll: 0, accN: 0, accSum: 0, wins: 0, fails: 0 },
  flags: 0, fb: {}, gw: [], equip: '', gifts: [], giftedEarly: false, tm: {}, bugs: 0, bugsSent: 0, tut: {}, intro: {}
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
  o.words = Array.isArray(d.words) ? d.words : [];
  o.titleParts = Array.isArray(d.titleParts) ? d.titleParts : [];
  o.used = d.used || {}; o.wwin = d.wwin || {}; o.fb = d.fb || {};
  o.gw = Array.isArray(d.gw) ? d.gw : []; o.gifts = Array.isArray(d.gifts) ? d.gifts : [];
  o.tm = d.tm || {}; o.tut = d.tut || {}; o.bugs = d.bugs || 0; o.bugsSent = d.bugsSent || 0; o.intro = d.intro || {};
  return o;
}

export const WORD_GROUPS = ['等級', '武器', '成就'];
const wword = (id, w, wk, n, how) => ({ id, w, g: '武器', how, test: x => n === 0 ? (x.starter === wk || !!(x.used && x.used[wk])) : ((x.wwin && x.wwin[wk]) || 0) >= n });
export const WORDS = [
  { id: 'novice', w: '新手', g: '等級', how: '一開始就有', test: () => true },
  { id: 'rookie', w: '見習', g: '等級', how: '完成主線「閃避成功 5 次、防禦成功 5 次」', test: n => n.quest.done.includes('1-3') },
  { id: 'skilled', w: '熟練', g: '等級', how: '獵人等級 5', test: n => n.hr >= 5 },
  { id: 'senior', w: '資深', g: '等級', how: '獵人等級 10', test: n => n.hr >= 10 },
  { id: 'ace', w: '王牌', g: '等級', how: '獵人等級 20', test: n => n.hr >= 20 },
  { id: 'legend', w: '傳說', g: '等級', how: '獵人等級 30', test: n => n.hr >= 30 },
  wword('staff0', '法師', 'staff', 0, '用法杖打一場'), wword('staff1', '奧術', 'staff', 5, '用法杖打贏 5 場'), wword('staff2', '賢者', 'staff', 20, '用法杖打贏 20 場'),
  wword('bow0', '弓手', 'bow', 0, '用長弓打一場'), wword('bow1', '疾風', 'bow', 5, '用長弓打贏 5 場'), wword('bow2', '神射手', 'bow', 20, '用長弓打贏 20 場'),
  wword('dag0', '刀客', 'dagger', 0, '用雙刀打一場'), wword('dag1', '疾影', 'dagger', 5, '用雙刀打贏 5 場'), wword('dag2', '暗影', 'dagger', 20, '用雙刀打贏 20 場'),
  wword('xbw0', '弩手', 'crossbow', 0, '用連弩打一場'), wword('xbw1', '連珠', 'crossbow', 5, '用連弩打贏 5 場'), wword('xbw2', '機關', 'crossbow', 20, '用連弩打贏 20 場'),
  { id: 'brave', w: '勇者', g: '成就', how: '討伐成功 10 次', test: n => n.stat.wins >= 10 },
  { id: 'hundred', w: '百戰', g: '成就', how: '討伐成功 50 次', test: n => n.stat.wins >= 50 },
  { id: 'grass', w: '草原王', g: '成就', how: '打贏草原 ★5', test: n => (n.zone.grass || 0) >= 5 },
  { id: 'wise', w: '博學', g: '成就', how: '開放的魔物都討伐過', test: n => Object.keys(MONSTERS).filter(k => !MONSTERS[k].wip).every(k => (n.dex[k] || 0) > 0) },
  { id: 'afterimage', w: '殘影', g: '成就', how: '閃避成功 30 次', test: n => n.stat.dodgeOk >= 30 },
  { id: 'mountain', w: '不動如山', g: '成就', how: '防禦成功 30 次', test: n => n.stat.defOk >= 30 },
  { id: 'tester', w: '測試員', g: '成就', how: '打贏三隻測試魔物', test: n => ['coo', 'frog', 'shroom'].every(k => (n.dex[k] || 0) > 0) },
  { id: 'critic', w: '評論家', g: '成就', how: '寫 3 份測試回饋', test: n => Object.values(n.fb || {}).filter(v => v === 1).length >= 3 },
  { id: 'bughunter', w: '除蟲員', g: '成就', how: '回報 1 個問題（老師確認才算）', test: n => (n.bugs || 0) >= 1 },
  { id: 'bugmaster', w: '蟲蟲剋星', g: '成就', how: '回報 5 個問題（老師確認才算）', test: n => (n.bugs || 0) >= 5 },
  { id: 'grad', w: '畢業生', g: '成就', how: '完成教學大樓的三堂課', test: n => !!(n.tut && n.tut.dodge && n.tut.defend && n.tut.attack) },
  { id: 'exact', w: '一字不差', g: '成就', how: '正確率 100% 打贏 Lv10 以上的魔物', test: n => (n.perfect || 0) > 0 }
];
export const wordById = id => WORDS.find(x => x.id === id);

export function checkWords(nw) {
  const got = [];
  for (const x of WORDS) if (!nw.words.includes(x.id) && x.test(nw)) { nw.words.push(x.id); got.push(x.w); }
  return got;
}

export function setTitleParts(nw, ids) {
  const seen = [];
  for (const id of ids) if (nw.words.includes(id) && !seen.includes(id) && seen.length < 3) seen.push(id);
  nw.titleParts = seen;
  nw.title = seen.map(id => wordById(id).w).join('');
}

export const currentQuest = nw => MAIN_QUESTS.find(q => !nw.quest.done.includes(q.id) && !(q.hold && q.hold())) || null;

export function goalOf(nw) {
  const q = currentQuest(nw);
  if (!q || (!q.target && !q.building)) return null;
  const t = q.target || {};
  return { text: q.t, building: q.building || 'board', match: x => !!q.target && (!t.rk || t.rk === x.rk) && (!t.mk || t.mk === x.mk) && (!t.star || t.star === x.star) };
}

export function zoneOpen(nw, rk) {
  const r = REGIONS[rk];
  if (!r || r.wip) return false;
  if (!r.needs) return true;
  return (nw.zone[r.needs] || 0) >= 5;
}
export const starOpen = (nw, rk, star) => star <= 1 || (nw.zone[rk] || 0) >= star - 1;

export const OPEN_STAGE = 1;
export const openStage = () => (typeof location !== 'undefined' && location.hostname === 'localhost' && window.__NW_STAGE__) || OPEN_STAGE;
export const buildingOpen = b => !!b.act && (!b.wip || parseFloat(b.wip) <= openStage());

export const VILLAGE = {
  cols: 22, rows: 15, plaza: { x: 11, y: 7 }, start: [11, 11],
  gate: { x: 10, y: 15, approach: [11, 11] }, gateBlock: { x0: 10, y0: 12, x1: 12, y1: 14 },
  pond: { x0: 18, y0: 11, x1: 20, y1: 13 },
  buildings: [
    { id: 'forge', kind: 'forge', x: 2, y: 1, name: '鐵匠鋪', wip: 2, text: '用打到的材料，打造、強化自己的武器和裝備！' },
    { id: 'storage', kind: 'storage', x: 7, y: 0, name: '倉庫', wip: 2, text: '所有材料和圖紙都放在這裡，一目了然。' },
    { id: 'shop', kind: 'shop', x: 13, y: 1, name: '商店', wip: 3, text: '用字元買回復藥，也可以賣掉用不到的材料。' },
    { id: 'armor', kind: 'armor', x: 18, y: 0, name: '防具店', wip: 3, text: '頭盔、鎧甲、手套、靴子，穿上就會出現在你身上！' },
    { id: 'rooms', kind: 'rooms', x: 1, y: 6, name: '組隊酒館', wip: '3a', text: '開房間或加入同學的房間，最多 4 個人一起打大魔物。' },
    { id: 'star', kind: 'star', x: 18, y: 6, name: '星圖台', wip: 5, text: '升級拿到的星星，可以在這裡點亮，讓閃避和防禦變得更強。' },
    { id: 'academy', kind: 'academy', x: 2, y: 10, name: '教學大樓', act: 'academy', text: '閃避、防禦、攻擊的教學都在這裡，跟著做一遍就會了！' },
    { id: 'board', kind: 'board', x: 6, y: 10, name: '委託板', act: 'map', text: '選地方、選魔物，出發狩獵！' },
    { id: 'rank', kind: 'rank', x: 14, y: 10, name: '榮譽碑', act: 'rank', wip: 2, text: '看看誰是最強獵人。' }
  ],
  decor: [
    { k: 'lamp', x: 7, y: 5, b: 1 }, { k: 'lamp', x: 15, y: 5, b: 1 }, { k: 'lamp', x: 7, y: 9, b: 1 }, { k: 'lamp', x: 15, y: 9, b: 1 },
    { k: 'barrel', x: 5, y: 3, b: 1 }, { k: 'barrel', x: 1, y: 4, b: 1 }, { k: 'crate', x: 10, y: 2, b: 1 }, { k: 'crate', x: 11, y: 3, b: 1 },
    { k: 'bench', x: 9, y: 10 }, { k: 'flowers', x: 12, y: 3 }, { k: 'flowers', x: 4, y: 8 }, { k: 'sign', x: 10, y: 11, b: 1 }, { k: 'hay', x: 20, y: 4, b: 1 }
  ],
  npcs: [
    { id: 'elder', name: '村長', x: 9, y: 8, look: { style: 'short', hair: '#e8e8e8', armor: '#8a4ad8', trim: '#e0c8ff' }, say: ['歡迎來到新世界！左下角的「教學大樓」可以學閃避、防禦和打字，先去學一學吧。', '按 B 或點右上角的背包，可以看你的東西和任務。'] },
    { id: 'kid', name: '小朋友', x: 13, y: 8, look: { style: 'pony', hair: '#ff7aa8', armor: '#e0802a', trim: '#ffe2a8' }, say: ['灰色的店還沒開張，再等一等！', '打倒草原的魔物，就能去迷霧森林囉。'] },
    { id: 'smith', name: '鐵匠', x: 5, y: 5, look: { style: 'spiky', hair: '#5a3a22', armor: '#6a4a3a', trim: '#b8b8b8' }, say: ['鐵匠鋪還在蓋，快好了！打到的材料先幫你存著。'] }
  ]
};

export const doorTile = b => [b.x + 1, b.y + 3];

export const BIGMAP = {
  w: 240, h: 180, village: [34, 150], pond: [72, 142],
  sites: { grass: [60, 128], forest: [108, 96], coast: [28, 84], snow: [108, 36], volcano: [172, 130], abyss: [214, 88], sky: [190, 30] },
  areas: { grass: '新芽草原', forest: '迷霧森林', coast: '珊瑚海岸', snow: '冰封雪原', volcano: '熔岩火山', abyss: '深淵裂谷', sky: '天空遺跡' },
  spots: {
    'grass:coo': [46, 116, '草丘'], 'grass:frog': [72, 142, '小池塘'], 'grass:shroom': [84, 118, '林邊'],
    'forest:shroom': [112, 84, '蘑菇林'], 'forest:coo': [90, 96, '林間空地'], 'forest:wolf': [124, 106, '森林深處']
  }
};

export function boardQuests(nw) {
  const out = [];
  Object.entries(REGIONS).forEach(([rk, r]) => {
    if (r.wip) return;
    if (!zoneOpen(nw, rk)) { out.push({ id: 'lock:' + rk, locked: true, rk }); return; }
    r.mons.forEach(mk => {
      const top = Math.min(5, (nw.zone[rk] || 0) + 1);
      for (let star = 1; star <= top; star++) out.push({ id: `${rk}:${mk}:${star}`, rk, mk, star, lv: regionLv(rk, star), done: (nw.zone[rk] || 0) >= star && (nw.dex[mk] || 0) > 0 });
    });
  });
  return out.sort((a, b) => (a.locked ? 1 : 0) - (b.locked ? 1 : 0) || (a.star || 9) - (b.star || 9) || (a.rk > b.rk ? 1 : -1));
}
