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
  { id: '1-0a', ch: 1, soft: true, building: 'academy', t: '到教學大樓學會三堂課', hint: '村莊西邊的教學大樓：閃避、防禦、打字各一堂，跟著黃色箭頭走', rewardText: '字元 ×100', reward: { coins: 100 }, test: nw => !!(nw.tut && nw.tut.dodge && nw.tut.defend && nw.tut.attack) },
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
  flags: 0, fb: {}, gw: [], equip: '', gifts: [], giftedEarly: false, tm: {}, bugs: 0, bugsSent: 0, tut: {}, intro: {}, awards: {}, seenNotice: '', seenNews: 0, seenEv: {}, seenBug: 0,
  name0: '', bugScore: 0, evDone: [], nameFlagged: {},
  mail: {}, nameLog: [], nameSet: 0, ev: {}, fastMk: {}
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
  o.tm = d.tm || {}; o.tut = d.tut || {}; o.bugs = d.bugs || 0; o.bugsSent = d.bugsSent || 0; o.intro = d.intro || {}; o.awards = d.awards || {}; o.seenNotice = d.seenNotice || '';
  o.seenNews = +d.seenNews || 0; o.seenBug = +d.seenBug || 0;
  o.seenEv = (d.seenEv && typeof d.seenEv === 'object' && !Array.isArray(d.seenEv)) ? d.seenEv : {};
  o.name0 = typeof d.name0 === 'string' ? d.name0 : ''; o.bugScore = +d.bugScore || 0;
  o.evDone = Array.isArray(d.evDone) ? d.evDone : []; o.nameFlagged = d.nameFlagged || {};
  /* 已領的信是物件不是陣列：兩個分頁各自合併存檔時，不會整份蓋掉對方領過的紀錄 */
  o.mail = (d.mail && typeof d.mail === 'object' && !Array.isArray(d.mail)) ? d.mail : {};
  /* 舊的詞庫暱稱不再使用，丟掉；nameLog＝用改名卡改過的名字（老師在學生卡看得到） */
  delete o.nick; delete o.nickAt;
  o.nameSet = d.nameSet ? 1 : 0;
  o.nameLog = Array.isArray(d.nameLog) ? d.nameLog.filter(x => x && typeof x.to === 'string').slice(-5) : [];
  /* ev＝每個活動的個人進度（SPEC §4.3）；fastMk＝每隻魔物（含星級）自己最快的秒數，給「進步獎」當活動前的紀錄。
     NW.fastest 的鍵是「區域:星級」，沒有魔物，進步獎用不了 */
  o.ev = (d.ev && typeof d.ev === 'object' && !Array.isArray(d.ev)) ? d.ev : {};
  o.fastMk = (d.fastMk && typeof d.fastMk === 'object' && !Array.isArray(d.fastMk)) ? d.fastMk : {};
  /* 村莊座標：posV 不是 2 的是舊地圖（22×15）的座標，在新地圖上可能站在牆裡，一律丟掉回出生點 */
  if (d.posV !== 2 || !Array.isArray(d.pos) || d.pos.length !== 2 || !d.pos.every(Number.isInteger)) { delete o.pos; delete o.posV; }
  return o;
}

/* 比對姓名前先統一：去掉空白（含全形空白）、全形英數標點轉半形、英文不分大小寫。
   這道鎖只擋「隨手亂打名字」，打對同學的名字就過了（docs/SPEC-TEACHER-ADMIN.md §1.5）。 */
export const normName = s => String(s || '')
  .replace(/[\uFF01-\uFF5E]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
  .replace(/[\s\u3000\u200b-\u200d\ufeff]/g, '')
  .toLowerCase();

/* ── 暱稱（v3.14.1）：就是登入時填的名字，第一次登入後固定，只能用「改名卡」換 ──
   舊存檔的 nw.nick（詞庫組合）不再使用，留著不影響。 */
export const NICK_EMPTY = '神秘獵人';
/* 名字固定，要換用「改名卡」（SPEC §8）。道具定義放這裡，背包、信箱共用 */
export const ITEM_DEFS = {
  potion: { name: '回復藥', desc: '要等商店開張才能在戰鬥中使用，先幫你存著。', icon: '🧪' },
  renameCard: { name: '改名卡', desc: '可以改一次名字。', pixel: 'renameCard' }
};
/* 商店開張時用（現在 OPEN_STAGE=1，商店還沒開，沒有購買流程；改名卡先由信箱寄） */
export const SHOP_ITEMS = [{ key: 'renameCard', price: 300 }];
/* 材料與圖紙的名稱表：{ id: [名稱, 顏色] }。背包、信箱領取、教師頁「給東西」的清單都從這裡來，
   魔物的 drops／rare、初心武器圖紙一加，各處就自動多一項，不用另外登記。 */
export const MAT_INFO = (() => {
  const m = {};
  Object.values(MONSTERS).forEach(mo => {
    (mo.drops || []).forEach(([id, name, color]) => { m[id] = [name, color]; });
    (mo.rare || []).forEach(([id, name, color]) => { m[id] = [name.replace('📜 ', ''), color]; });
  });
  Object.entries(STARTERS).forEach(([k, st]) => { m['bp_' + k] = [st.name + '圖紙', 'gray']; });
  return m;
})();
/* 圖紙的 id 一律 bp_ 開頭；其他是材料。信箱用這兩個擋掉老師打錯的 key（SPEC-STAGE2 F6） */
export const isBpId = id => typeof id === 'string' && id.startsWith('bp_') && Object.prototype.hasOwnProperty.call(MAT_INFO, id);
export const isMatId = id => typeof id === 'string' && !id.startsWith('bp_') && Object.prototype.hasOwnProperty.call(MAT_INFO, id);
/* 教學大樓三堂課（NW.tut 的 key） */
export const TUT_LESSONS = [['dodge', '閃避'], ['defend', '防禦'], ['attack', '打字']];
/* 區域進度（NW.zone[區域]＝打贏的最高星級）老師能補到幾星 */
export const ZONE_STAR_MAX = 5;

/* 台灣時間的「第幾天」：活動剩幾天照日曆日算。固定 +8 小時而不用瀏覽器時區，電腦時區設錯也一樣；時間要用 C.now()（伺服器時間）。 */
export const TW_OFFSET_MS = 8 * 3600 * 1000;
export const twDay = ms => Math.floor((ms + TW_OFFSET_MS) / 86400000);
/* 榜單與人物卡顯示的名字＝登入名字（基準）；沒有名字才顯示「神秘獵人」 */
export const displayName = name => (typeof name === 'string' && name.trim()) ? name.trim() : NICK_EMPTY;

/* 班級短碼：五年級4班 → 504（年級數字＋兩位數班號）；解析不了就回原字串，榜單才不會空白 */
const GRADE_NUM = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
export function clsShort(cls) {
  const m = /^([一二三四五六七八九1-9])年級([0-9]{1,2})班$/.exec(normName(cls));
  if (!m) return cls;
  return (GRADE_NUM[m[1]] || m[1]) + String(+m[2]).padStart(2, '0');
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
  /* 抓蟲分（mg_bugboard，老師確認才有）到 1／3／5／10 分各一個；沒上前 10 名的人也有目標（SPEC §7.2）。
     名字用「抓蟲」開頭，跟「除蟲員、蟲蟲剋星、職業除錯師」（算件數或老師頒發）分得出來 */
  { id: 'bug1', w: '抓蟲新手', g: '成就', how: '抓蟲分到 1 分（老師確認回報才有分數）', test: n => (n.bugScore || 0) >= 1 },
  { id: 'bug3', w: '抓蟲隊長', g: '成就', how: '抓蟲分到 3 分', test: n => (n.bugScore || 0) >= 3 },
  { id: 'bug5', w: '抓蟲達人', g: '成就', how: '抓蟲分到 5 分', test: n => (n.bugScore || 0) >= 5 },
  { id: 'bug10', w: '抓蟲大師', g: '成就', how: '抓蟲分到 10 分', test: n => (n.bugScore || 0) >= 10 },
  { id: 'bugking', w: '職業除錯師', g: '成就', how: '抓蟲抓得最多（老師頒發）', test: n => !!(n.awards && n.awards.bugking) },
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

/* 村莊 32×22 格（docs/SPEC-TEACHER-ADMIN.md §9.2）。座標單位都是「格」，一格 16 像素。
   分區：高台（北）、學習區（西）、中央廣場（中央偏南，出生點）、市集（東，隔著小溪、小橋連過去）、傳送門（正南）。
   新增建築時要自己檢查：footprint 3×3 不壓到溪、牆、別的建築，門口（x+1, y+3）走得到，名牌不跟別的名牌疊在一起——
   tools/browser-test/nw10.test.js 會幫忙檢查。 */
export const VILLAGE = {
  cols: 32, rows: 22, plaza: { x: 16, y: 13, r: 56 }, start: [15, 16],
  gate: { x: 15, y: 22, approach: [15, 18] }, gateBlock: { x0: 15, y0: 19, x1: 16, y1: 21 },
  pond: { x0: 0, y0: 17, x1: 4, y1: 20 },
  /* 高台下緣是一排石牆，只有樓梯（stairs）能上去；小溪把市集隔開，只有小橋（bridge）能過 */
  cliff: { y: 7, stairs: { x0: 15, x1: 17 } },
  creek: { x0: 22, x1: 23, y0: 8, y1: 21, bridge: { y0: 13, y1: 14 } },
  /* floor 是地面兩色；col 是小地圖的色塊。小地圖與地面都照這份畫，加新區只要加一列 */
  zones: [
    { id: 'plateau', name: '高台', x0: 0, y0: 0, x1: 31, y1: 6, floor: ['#9aa3ad', '#8f98a3'], col: '#9aa3ad' },
    { id: 'learn', name: '學習區', x0: 0, y0: 8, x1: 9, y1: 21, floor: ['#7ccb5d', '#72c456'], col: '#7ccb5d' },
    { id: 'market', name: '市集', x0: 24, y0: 8, x1: 31, y1: 21, floor: ['#e0cb94', '#d8c086'], col: '#d8c086' }
  ],
  /* 樹林：p 是每格長樹的機率。邊緣另外還有隨機的樹，高台、市集、廣場不長樹 */
  forests: [{ x0: 0, y0: 8, x1: 1, y1: 15, p: .55 }, { x0: 5, y0: 19, x1: 12, y1: 21, p: .5 }, { x0: 24, y0: 20, x1: 31, y1: 21, p: .6 }],
  /* 小路：每條是一串經過的格（可以有小數），畫成圓滑的彎路。每個門口都要在某條小路上 */
  roads: [
    [[4, 15], [6, 17], [9, 16], [12, 16], [15, 16], [18, 16], [20, 17], [21, 15], [22.5, 13.5], [24, 14]],
    [[6, 5], [10, 6], [16, 6], [21, 6], [26, 5]],
    [[16, 6], [16, 8], [14.5, 10], [14, 12.5], [14, 16]],
    [[15, 16], [16, 17], [15, 18]],
    [[24, 14], [25, 13], [25, 12]], [[24, 14], [27, 14], [28.5, 13.2], [29, 13]],
    [[27, 14], [27, 19], [29, 19]], [[27, 18], [25, 18]]
  ],
  buildings: [
    { id: 'rooms', kind: 'rooms', x: 5, y: 2, name: '組隊酒館', wip: '3a', text: '開房間或加入同學的房間，最多 4 個人一起打大魔物。' },
    { id: 'star', kind: 'star', x: 15, y: 2, name: '星圖台', wip: 5, text: '升級拿到的星星，可以在這裡點亮，讓閃避和防禦變得更強。' },
    { id: 'rank', kind: 'rank', x: 25, y: 2, name: '榮譽碑', act: 'rank', wip: 2, text: '看看誰是最強獵人。' },
    { id: 'academy', kind: 'academy', x: 3, y: 12, name: '教學大樓', act: 'academy', text: '閃避、防禦、攻擊的教學都在這裡，跟著做一遍就會了！' },
    { id: 'board', kind: 'board', x: 11, y: 13, name: '委託板', act: 'map', text: '選地方、選魔物，出發狩獵！' },
    { id: 'notice', kind: 'notice', x: 17, y: 13, name: '佈告欄', act: 'notice', text: '活動、老師的公告、抓蟲榜，都貼在這裡。' },
    { id: 'shop', kind: 'shop', x: 24, y: 9, name: '商店', wip: 3, text: '用字元買回復藥，也可以賣掉用不到的材料。' },
    { id: 'armor', kind: 'armor', x: 28, y: 10, name: '防具店', wip: 3, text: '頭盔、鎧甲、手套、靴子，穿上就會出現在你身上！' },
    { id: 'forge', kind: 'forge', x: 24, y: 15, name: '鐵匠鋪', wip: 2, text: '用打到的材料，打造、強化自己的武器和裝備！' },
    { id: 'storage', kind: 'storage', x: 28, y: 16, name: '倉庫', wip: 2, text: '所有材料和圖紙都放在這裡，一目了然。' }
  ],
  /* 郵筒（k:'mailbox'）也寫在 decor：村莊程式用 k 找它。站的位置是它正下方一格 */
  decor: [
    { k: 'mailbox', x: 12, y: 11, b: 1 },
    { k: 'lamp', x: 13, y: 10, b: 1 }, { k: 'lamp', x: 19, y: 10, b: 1 }, { k: 'lamp', x: 11, y: 18, b: 1 }, { k: 'lamp', x: 19, y: 18, b: 1 },
    { k: 'lamp', x: 11, y: 5, b: 1 }, { k: 'lamp', x: 21, y: 5, b: 1 },
    { k: 'scarecrow', x: 7, y: 11, b: 1 }, { k: 'scarecrow', x: 8, y: 13, b: 1 }, { k: 'scarecrow', x: 7, y: 15, b: 1 },
    { k: 'hay', x: 9, y: 19, b: 1 }, { k: 'barrel', x: 1, y: 16, b: 1 },
    { k: 'crate', x: 9, y: 3, b: 1 }, { k: 'crate', x: 10, y: 3, b: 1 }, { k: 'barrel', x: 22, y: 3, b: 1 },
    { k: 'crate', x: 27, y: 10, b: 1 }, { k: 'barrel', x: 31, y: 14, b: 1 }, { k: 'hay', x: 26, y: 20, b: 1 }, { k: 'crate', x: 31, y: 17, b: 1 },
    { k: 'bench', x: 13, y: 17 }, { k: 'sign', x: 13, y: 19, b: 1 },
    { k: 'flowers', x: 11, y: 9 }, { k: 'flowers', x: 20, y: 9 }, { k: 'flowers', x: 13, y: 8 }, { k: 'flowers', x: 12, y: 5 }
  ],
  npcs: [
    { id: 'elder', name: '村長', x: 16, y: 10, look: { style: 'short', hair: '#e8e8e8', armor: '#8a4ad8', trim: '#e0c8ff' }, say: ['歡迎來到新世界！西邊的「教學大樓」可以學閃避、防禦和打字，先去學一學吧。', '廣場上的佈告欄會貼活動和公告，記得常常去看！', '按 B 或點右上角的背包，可以看你的東西和任務。', '右下角的小地圖可以點，點到哪棟房子就傳送過去！'] },
    { id: 'kid', name: '小朋友', x: 19, y: 12, look: { style: 'pony', hair: '#ff7aa8', armor: '#e0802a', trim: '#ffe2a8' }, say: ['灰色的店還沒開張，再等一等！', '打倒草原的魔物，就能去迷霧森林囉。'] },
    { id: 'smith', name: '鐵匠', x: 21, y: 11, look: { style: 'spiky', hair: '#5a3a22', armor: '#6a4a3a', trim: '#b8b8b8' }, say: ['鐵匠鋪還在蓋，快好了！打到的材料先幫你存著。', '東邊過了小橋就是市集。'] }
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

/* ── 活動（docs/SPEC-TEACHER-ADMIN.md §4） ──
   預設值來自 tools/nw-sim/events.mjs（node tools/nw-sim/events.mjs）：
   咕咕鳥★1 單場勝率平均約 87%；「一週一節課、一節平均打 2 場」兩週的話，打倒 3 隻的人約 58%，
   平均打 3 場約 76%；打倒 5 隻約 18%／47%；打倒 10 隻幾乎沒人（3%）。
   所以：班級挑戰 每人 3 隻、全班 50% 達標（原本規格的 60% 在平均 2 場的班會卡住）、兩週；
   限時討伐的數量範本用 5 隻不用 10 隻。 */
export const EVENT_DEFAULTS = {
  days: 14,
  boost: { mul: 2, what: 'exp' },
  hunt: { goal: 5, minStar: 1 },
  classwar: { per: 3, goalPct: 50 },
  ranking: { minRuns: 3 }
};

/* 最快討伐的「合理下限」（秒）：最快手速（70 字/分、全對、練熟）在 ★1 的最快秒數 ×0.8，
   星級越高魔物越硬，所以每個星級都能用。比這還快的分數，教師頁標 ⚠（SPEC §4.2b）。
   進步獎超過 IMPROVE_SANE_MAX（%）也標 ⚠。 */
export const FASTEST_FLOOR = { coo: 14, frog: 13, shroom: 12, wolf: 17 };
export const IMPROVE_SANE_MAX = 60;

/* 教師頁「新增活動」的範本（SPEC §4.4）。days＝從開始算幾天；fields 是 mg_events 文件的其他欄位。
   不做「週末加倍」：學生在學校上課才玩，週末加倍只對家裡能玩的人有利。 */
export const EVENT_TEMPLATES = [
  { id: 'boost_exp', name: '本週電腦課經驗加倍', days: 7,
    fields: { type: 'boost', title: '本週經驗加倍', desc: '這個星期打贏魔物，獵人經驗變 2 倍！', mul: 2, what: 'exp' } },
  { id: 'hunt_coo', name: '咕咕鳥大量出沒（打 5 隻）', days: 14,
    fields: { type: 'hunt', title: '咕咕鳥大量出沒', desc: '草原跑出好多咕咕鳥！打倒 5 隻就有獎勵。', mk: 'coo', minStar: 1, goal: 5, items: [{ type: 'coins', n: 100 }] } },
  { id: 'classwar', name: '班級挑戰（兩週）', days: 14,
    fields: { type: 'classwar', title: '全班一起打咕咕鳥', desc: '每個人打倒 3 隻咕咕鳥。全班有一半的人做到，大家都有獎勵！', mk: 'coo', minStar: 1, per: 3, goalPct: 50, items: [{ type: 'coins', n: 100 }] } },
  { id: 'rank_improve_frog', name: '進步獎：泡泡蛙', days: 14,
    fields: { type: 'ranking', metric: 'improve', title: '進步獎：泡泡蛙', desc: '比你以前的紀錄快越多越厲害！打泡泡蛙，至少打 2 場。每個人都有機會。', mk: 'frog', minStar: 1 } },
  { id: 'rank_kills_coo', name: '討伐王：咕咕鳥', days: 14,
    fields: { type: 'ranking', metric: 'kills', title: '討伐王：咕咕鳥', desc: '看誰打倒最多隻咕咕鳥！', mk: 'coo', minStar: 1 } },
  { id: 'rank_acc', name: '神準手', days: 14,
    fields: { type: 'ranking', metric: 'acc', title: '神準手', desc: '打得又穩又準！至少打 3 場，看平均正確率。', minRuns: 3 } }
];

/* 改版公告（新的放最前面；寫法照 docs/ANNOUNCEMENT-GUIDE.md）。
   放在這裡而不放 newworld.js：教師頁「公告」分頁要唯讀列出最近 3 則，newworld.js 是學生端程式、不能被教師頁 import。 */
export const NOTICES = [
  { id: '2026-11-23', date: '11 月 23 日', title: '修好了幾個問題', items: [
    '🏅 「一字不差」稱號修好了，Lv10 以上打出 100% 就拿得到。感謝 5 年級 9 班 11 號回報！',
    '🔁 打怪的題目不會一直重複了。重置天賦，退回的點數也對了。感謝 5 年級 9 班 11 號回報。',
    '🏫 教學大樓做完三堂課，會跳出下一個任務了。練習也不能貼上了，要自己打字。感謝 5 年級 11 班 1 號和回報的同學。',
    '📱 手機和平板還不能用躲避和防禦。等電腦版穩定了，老師再考慮。感謝 5 年級 3 班 23 號、11 班 1 號提醒。'
  ] },
  { id: '2026-11-20', date: '11 月 20 日', title: '活動可以點進去了', items: [
    '🎪 點一下「活動」裡的卡片，就能看規則、怎麼算分和獎勵。',
    '📊 卡片裡有你做到哪裡了，還有前 10 名。你不在榜上，會告訴你還差多少。',
    '🐛 「活動」最上面多了「抓蟲大作戰」，一直都在。抓蟲榜也放在裡面。',
    '🏅 所有排行榜長得一樣了。前 3 名有金銀銅徽章。',
    '🏷 老師會直接頒稱號給你。收到以後，到背包的「稱號」裡戴上。'
  ] },
  { id: '2026-11-19', date: '11 月 19 日', title: '名字固定了', items: [
    '🏷 不用再取暱稱了。榜上會用你登入時的名字。',
    '❓ 第一次進新世界，會問你一次：要沿用現在的名字，還是改新名字？選好就固定了。',
    '✏ 之後想改名字，要用「改名卡」。在背包的人物卡上按「改名字」。'
  ] },
  { id: '2026-11-17', date: '11 月 17 日', title: '新世界變大了！', items: [
    '✉ 村莊多了藍色郵筒。老師寄的信和禮物，都在「信箱」裡領。',
    '🏷 第一次進新世界，要先取暱稱。想換的話，要有「改名卡」。',
    '📢 「佈告欄」變成村莊裡的房子，有「公告」「活動」「抓蟲榜」。老師辦的活動也貼在這裡。',
    '🗺 村莊變大了。右下角的小地圖，點一下房子就能過去。',
    '🐛 回報的問題被老師確認，就有抓蟲分，會上「抓蟲榜」，還能拿徽章。'
  ] },
  { id: '2026-11-12', date: '11 月 12 日', title: '新世界改版啦！', items: [
    '🎫 打完「標點符號挑戰」就能進新世界！新練法：符號先看一次，再練 3 個，最後打怪 5 句。',
    '📌 第一次進村有介紹，任務箭頭會先帶你去「教學大樓」。每棟房子第一次進去也會說明。',
    '🏫 教學大樓每堂課最後要把稻草魔物打倒（打 5 下）。',
    '🐛 「回報問題」要寫清楚：做了什麼事、出現什麼錯誤狀況。抓得最多的人，老師會頒發特別稱號「職業除錯師」。',
    '🎒 修好了：太快點背包，換裝備教學會卡住。'
  ] }
];
