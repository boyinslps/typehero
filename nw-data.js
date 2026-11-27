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
  /* 炎牙刀畫成雙刀、刀身多一道橘紅（wfx）；其他武器種類照原樣 */
  const w = weapon === 'flame_dagger' ? 'dagger' : (weapon || 'staff');
  return Object.assign({
    style: LOOK.styles[l.style] ? LOOK.styles[l.style][0] : 'short',
    hair: LOOK.hairColors[l.hair] || LOOK.hairColors[0],
    skin: LOOK.skins[l.skin] || LOOK.skins[1],
    armor: '#8d8d8d', trim: '#b8b8b8', helm: 'none', weapon: w
  }, weapon === 'flame_dagger' ? { wfx: 'fire' } : {}, gear || {});
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
const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
export const weaponInfo = k => STARTERS[k] || (hasOwn(GIFT_WEAPONS, k) && GIFT_WEAPONS[k]) || (hasOwn(EXTRA_WEAPONS, k) && EXTRA_WEAPONS[k]) || null;
export const weaponBase = k => (hasOwn(GIFT_WEAPONS, k) && GIFT_WEAPONS[k].base) || (hasOwn(EXTRA_WEAPONS, k) && EXTRA_WEAPONS[k].base) || k;
/* 現在拿的武器種類（'staff'、'testblade'、'flame_dagger'…）。2b 起看 eq.weapon 那件裝備；
   還沒轉成裝備格式的存檔（教師頁讀到的舊資料）退回舊的 equip／starter 規則 */
export const curWeapon = nw => {
  const it = nw && nw.gearV === 1 ? equippedItem(nw, 'weapon') : null, d = it && gearDef(it.k);
  if (d && d.wk) return d.wk;
  return (nw.equip && (nw.gw || []).includes(nw.equip)) ? nw.equip : nw.starter;
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
    rare: [['bp_coo_hat', '📜 咕咕帽圖紙', 'green'], ['bp_coo_gloves', '📜 羽毛護手圖紙', 'green']]
  },
  frog: {
    name: '泡泡蛙', elem: 'water', ask: 'word', fear: 'wood', resist: 'fire', lean: '偏防禦',
    sp: '會吐泡泡，泡泡會遮住字旁邊的注音小字。', spKey: 'bubble', hpMul: 1,
    attacks: [
      { name: '泡泡雨', type: 'defend', mul: 0.9, status: 'ice' },
      { name: '舌頭彈', type: 'dodge', mul: 0.9 }
    ],
    drops: [['frog_slime', '泡泡黏液', 'gray', 2, 4], ['frog_skin', '濕潤蛙皮', 'green', 1, 2]],
    rare: [['bp_frog_boots', '📜 泡泡靴圖紙', 'green'], ['bp_frog_vest', '📜 蛙皮背心圖紙', 'green']]
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
    rare: [['bp_flame_dagger', '📜 炎牙刀圖紙', 'blue'], ['bp_wolf_mail', '📜 炎狼皮甲圖紙', 'blue']]
  }
};

export const regionLv = (rk, star) => {
  const r = REGIONS[rk];
  return Math.round(r.lv[0] + (r.lv[1] - r.lv[0]) * (star - 1) / 4);
};

/* 紅線預警秒數（出手前多久出現）。放在這裡：戰鬥與 tools/nw-sim 共用，護腳的預警也是加在這個數字上 */
export const LANE_W = { A: 3.0, B: 2.5, C: 2.2, D: 2.0 };
export const ATTACKS_OPEN = { coo: ['single', 'pair'], frog: ['slam'], shroom: [], wolf: [] };
export const TEST_TAGS = { coo: '閃避測試', frog: '防禦測試', shroom: '攻擊測試' };
export const attacksOn = () => Object.values(ATTACKS_OPEN).some(a => a.length > 0);
export const MAX_CHARS = star => (star <= 2 ? 4 : star <= 4 ? 6 : 8);
export const CHANT_MAX = 6;
export const FB_COINS = 30;
export const BUG_COINS = 15;
/* 字元照嚴重度給：小 1×、中 2×、大 3×（老師 2026-11-23 決定）。前 BUG_REWARD_MAX 個被確認的回報才有 */
export const bugCoins = sev => BUG_COINS * Math.min(3, Math.max(1, Math.floor(+sev) || 1));
export const LESSON_COINS = 200;
/* 第 4 堂（流派）只給 30：字元已經有堆積的問題，這堂不是必修（老師 2026-11-24 決定） */
export const LESSON_COINS_FLOW = 30;
export const lessonCoins = id => (id === 'flow' ? LESSON_COINS_FLOW : LESSON_COINS);
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

/* ══ 平衡 V2（docs/SPEC-BALANCE-V2.md v2.1）══
   所有 V2 行為都用 v2On() 包起來：沒開的時候（OPEN_STAGES 沒有 '2b' 的時候）戰鬥與結算跟 V2 之前逐項相同——血量依層級、時間到就輸、
   只有咕咕鳥與泡泡蛙會攻擊。這樣第 2～9 步沒做完的分支不會動到已經上線的學生；整個 V2 要同一版一起開（規格 §7「上線順序」：
   拿掉層級讓原 A 層血量 +43%，不能沒有流派就上）。
   開關：2b 開放（stageOpen('2b')）就是 V2 開放；測試在 localhost 用 window.__NW_V2__ = true／false 強制。
   舊世界打字遊戲的 A～D 層級完全沒動，這裡只拿掉「新世界戰鬥」對層級的依賴（newworld.js 的 tier() 現在只負責記錄）。
   數字照規格 §6.2；tools/nw-sim 之後改讀這份。 */
export const NW_V2 = {
  ver: 2.3,          // 規格版本（tools/nw-sim 用來判斷要不要讀這一組）
  k: 0.4,            // 單一血量倍率（v2.2：逐場模擬的時間比解析長 30～40%，0.4 在逐場裡≈解析 0.5 想要的長度），不看層級
  cap: 600,          // 滿 10 分鐘魔物逃走（不算輸；v2.1 是 8 分鐘）
  warnAt: 540,       // 9:00 跳「魔物累了，再 1 分鐘就會逃走」
  laneW: 3.0,        // 紅線預警一律 3.0 秒（原 A 層的值；倒下是唯一的輸法，預警要給得起）
  dayFull: 4,        // 一天（twDay）前 4 場拿完整材料
  dayHalf: 0.5,      // 第 5 場起材料 ×0.5（經驗、字元不減）
  failBase: 0.3,     // 輸／逃走／撤退的獎勵 ×(0.3u ＋ 0.7·f·min(1, 2u))，u＝有在打字的秒數 ÷ max(這場秒數, uFloor)（rewardRatio）
  uFloor: 300,       // v2.3：u 的分母至少 300 秒（5 分鐘就倒下、下課撤退的人不被罰；打 4 題就站著不動的人 u 還是很小）
  submitWin: 120,    // v2.3：最後一次送出題目超過 120 秒就不算「有在打字」（擋「每 40 秒打 1 個字、從不送出」）
  workEvery: 600,    // 勤勞獎勵：有在打字的戰鬥時間每累積 10 分鐘 +1 綠材料
  workMax: 2,        // 一天最多 2 個
  bonusMat: 1,       // ⚡ 比標準時間快：多 1 個那隻魔物的綠材料
  afkWin: 40,        // 防掛機：最近 40 秒內打對過 1 個字才算「有在打字」（最慢 p5 每字約 31 秒）
  flowCap: 1,        // 一場的流派傷害 ≤ 打字傷害（反擊與藤蔓的能量來自打字，§3.4）
  escFlow: 0.5,      // 輸／逃走算 f 時，流派打掉的血只算一半
  starsPerDay: 2,    // v2.3（v2.2 是 1）：一天最多開 2 個新星級（打贏過的星級可以一直重打；SPEC-BALANCE-V2 §2.6）
  get on() { return v2On(); }
};
export const v2On = () => (typeof location !== 'undefined' && location.hostname === 'localhost' && typeof window !== 'undefined' && typeof window.__NW_V2__ === 'boolean') ? window.__NW_V2__ : stageOpen('2b');
/* 流派（SPEC-BALANCE-V2 §3，tools/nw-sim/rules-v2.mjs 同名同值）：rho＝魔物最大血量的百分比（再乘攻擊力倍率 g）、typeMul＝打字傷害折扣、
   shield＝舉盾多幾秒、vine 的 n＝最多幾根、every＝每根每幾秒扣一次 rho。穩打流是第二波，這裡不放 */
export const FLOWS = {
  guard: { rho: 0.05, typeMul: 0.85, shield: 0.5 },
  vine: { rho: 0.005, n: 4, every: 10, typeMul: 0.85 }
};
/* 給學生看的名字與一句話（出發前選擇、人物卡、結算提示共用）。不寫「適合打字慢的人」，免得有人覺得被分類（規格 §3.7） */
export const FLOW_INFO = {
  guard: { icon: '🛡', name: '守護流', line: '舉盾擋下、或真的躲開魔物，就會自動反擊！', who: '適合想練防禦的人' },
  vine: { icon: '🌿', name: '藤蔓流', line: '每題全部打對就種一根藤蔓，藤蔓會自己一直打魔物。', who: '適合不想被打斷的人' }
};
/* 這個存檔現在用哪個流派：V2 沒開、或沒選＝空字串（一般打法） */
export const flowOf = (nw, on = v2On()) => (on && nw && FLOWS[nw.flow] ? nw.flow : '');
/* 魔物招式倍率另乘多少（乘在 atk.mul 上，在 monDmg 的最低 4 點「之前」：SPEC-BALANCE-V2 §1.3。
   v2.2 的 ×0.5：森林狼 Lv10～22 每下 7～14 點，一樣碰不到下限，先乘後乘結果只差四捨五入；放在 monDmg 之前，被打到至少 4 點的保證才不會被打折） */
export const ATTACK_DMG = { wolf: 0.5 };
/* V2 的攻擊表（§1.3）：咕咕鳥不變；泡泡蛙重壓＋舌頭彈（單線，新開）；跳跳菇、炎牙狼全開。
   ATTACKS_OPEN 還是現在上線的那張，V2 沒開時照舊 */
export const ATTACKS_V2 = {
  coo: ['single', 'pair'], frog: ['slam', 'single'], shroom: ['single', 'slam'],
  wolf: ['single', 'pair', 'sweep', 'fake', 'slam']
};
/* 跳跳菇 ★1 不攻擊：留給「完全不想被打」的人 */
export const ATTACK_FROM = { shroom: 2 };
export const attacksFor = (mk, star, on = v2On()) => {
  if (!on) return ATTACKS_OPEN[mk] || [];
  return star < (ATTACK_FROM[mk] || 1) ? [] : (ATTACKS_V2[mk] || []);
};
export const attackMul = (mk, on = v2On()) => (on && ATTACK_DMG[mk]) || 1;
/* 血量、預警、出招節奏：V2 不看層級（一律 B／3.0 秒） */
export const nwTier = (tier, on = v2On()) => (on ? 'B' : tier);
export const nwLaneW = (tier, on = v2On()) => (on ? NW_V2.laneW : (LANE_W[tier] || LANE_W.B));
/* V2：照 sim 的 v2H＝monMaxHp(B) × k ÷ HP_TIER.B（先取整再縮放，模擬器與遊戲才逐點相同）；咕咕鳥★1＝157 */
export const nwMaxHp = (mk, lv, tier, players = 1, on = v2On()) => on ? Math.round(monMaxHp(mk, lv, 'B', players) * NW_V2.k / HP_TIER.B) : monMaxHp(mk, lv, tier, players);
/* 標準時間（秒）：中位學生（11 字/分）、沒裝備、一般打法的「打贏時間中位數」（逐場模擬，SPEC-BALANCE-V2 v2.2 §2.2；解析模型低估慢手，所以比 v2.1 的表長 25～35%）。
   「比標準快」才有 ⚡。改了血量、攻擊表、裝備數值要用 tools/nw-sim 的 curves.mjs v2mc 重算。★1～★5 */
export const STD_SECS = {
  'grass:coo': [129, 148, 171, 170, 203], 'grass:frog': [147, 171, 196, 203, 245], 'grass:shroom': [139, 168, 197, 205, 244],
  'forest:shroom': [218, 234, 242, 260, 299], 'forest:coo': [178, 205, 214, 238, 267], 'forest:wolf': [231, 250, 271, 275, 320]
};
export const stdSecs = (rk, mk, star) => { const r = STD_SECS[rk + ':' + mk]; return (r && r[Math.min(5, Math.max(1, star)) - 1]) || 0; };
/* 輸／逃走／撤退的獎勵比例＝0.3u ＋ 0.7·f·min(1, 2u)（v2.3 §1.2）。u＝有在打字的秒數 ÷ max(這場秒數, uFloor 300)：
   分母不能太小，5 分鐘就倒下或下課撤退的人只要一直在打，u 就接近 1；也不能用固定 600，否則這些人會被罰。
   f＝打掉的血比例（流派打掉的只算一半，所以呼叫端傳的是已經折過的 f）；贏＝1。打 4 題就站著不動的人 live 只有幾十秒，u 很小，保底和進度都打折 */
export function rewardRatio(win, live, secs, f) {
  if (win) return 1;
  const u = Math.max(0, Math.min(1, (+live || 0) / Math.max(+secs || 0, NW_V2.uFloor))), ff = Math.max(0, Math.min(1, +f || 0));
  return NW_V2.failBase * u + (1 - NW_V2.failBase) * ff * Math.min(1, 2 * u);
}
/* 一天的帳（nw.day＝{ d: twDay, n: 今天第幾場有效的, work: 今天已拿幾個勤勞, st: 今天開了幾個新星級, ws: 勤勞累積的秒數（不滿 10 分鐘的零頭） }）。
   第 5 場起材料減半、沒有 ⚡、也不再累積勤勞（§2.4：回家一直刷擋這條）；勤勞只算「有在打字的秒數」，所以掛機 10 分鐘＝0。
   純函式：回新的 day 與這場的結果，不改傳進來的物件 */
export function dayStep(prev, d, o) {
  const p = prev && typeof prev === 'object' ? prev : {}, same = p.d === d;
  const day = { d, n: same ? (+p.n || 0) : 0, work: same ? (+p.work || 0) : 0, st: same ? (+p.st || 0) : 0, ws: Math.max(0, Math.min(NW_V2.workEvery - 1, +p.ws || 0)) };
  day.n++;
  if (o.newStar) day.st++;   // 今天開了一個新星級（贏了比自己最高紀錄更高的一星）
  const full = day.n <= NW_V2.dayFull;
  let fast = false, work = 0;
  if (full) {
    fast = !!o.fastWin;
    day.ws += Math.max(0, +o.live || 0);
    const k = Math.floor(day.ws / NW_V2.workEvery);
    day.ws -= k * NW_V2.workEvery;
    work = Math.max(0, Math.min(k, NW_V2.workMax - day.work)); day.work += work;
    if (day.work >= NW_V2.workMax) day.ws = 0;
  }
  return { day, full, fast, work };
}

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

/* ── 解鎖任務（docs/SPEC-UNLOCK-ROUTE.md B）：等級不夠時任務自己變成「打倒 N 隻」。
   完成條件永遠是「等級到了（或老師解開）」；畫面上的「打倒 N 隻」只是告訴孩子要做什麼，打什麼都算經驗，所以一定解得開 ── */
const bldOf = id => VILLAGE.buildings.find(b => b.id === id);
export const qText = (nw, q) => (q.tOf ? q.tOf(nw) : q.t);
/* 補經驗目標：①借下一個主線任務的目標（現在打得到才借），往主線前進＝補經驗；②否則最新開放區域裡自己打贏過的最高星（不指定魔物）。
   數量只會變少：缺口只減不增、換到更高星每場經驗變多；一次最多叫他打 3 隻 */
export function unlockTarget(nw, q) {
  const L = q.lv, D = expTotal(L) - expTotal(nw.hr || 1, nw.hrExp || 0), d = twDay(Date.now());
  const done = (nw.quest && nw.quest.done) || [];
  let t = null;
  const nx = MAIN_QUESTS.slice(MAIN_QUESTS.indexOf(q) + 1).find(m => !done.includes(m.id) && m.target && !(m.hold && m.hold(nw)));
  if (nx) {
    const star = nx.target.star || 1, rks = nx.target.rk ? [nx.target.rk] : Object.keys(REGIONS).filter(r => !REGIONS[r].wip && REGIONS[r].mons.includes(nx.target.mk));
    const rk = rks.find(r => zoneOpen(nw, r) && starOpen(nw, r, star) && !newStarLocked(nw, r, star, d));
    if (rk) t = { rk, mk: nx.target.mk, star, path: false };
  }
  if (!t) {
    const rk = Object.keys(REGIONS).filter(r => zoneOpen(nw, r)).pop() || 'grass';
    t = { rk, mk: undefined, star: Math.max(1, (nw.zone && nw.zone[rk]) || 0), path: true };
  }
  const e = huntExp(regionLv(t.rk, t.star), true);
  t.n = Math.max(1, Math.min(3, Math.ceil(Math.max(0, D) / e)));
  t.X = t.mk ? MONSTERS[t.mk].name.replace(/（.*?）/g, '') :   // 名字後面的「（閃避測試）」是教學標籤，念起來很長
    `${REGIONS[t.rk].name} ★${t.star} 的魔物`;
  return t;
}
function unlockQuest(id, bid, lv, stage, ch) {
  const q = {
    id, ch, unlock: bid, lv, hold: nw => !stageOpen(stage),
    /* 建築名稱用 getter 現查：VILLAGE 在這個檔案比 MAIN_QUESTS 晚宣告，建立任務時還讀不到 */
    get t() { return `讓${bldOf(bid).name}開張`; },
    get hint() { return `${bldOf(bid).name}要獵人等級 ${lv}。到委託板找有 📌 的單子；打更高星的經驗更多，打幾隻就會少幾隻。`; },
    get rewardText() { return `${bldOf(bid).name}開張`; }, reward: {},
    tOf: nw => { const g = unlockTarget(nw, q); return `再打倒 ${g.n} 隻${g.X}，${bldOf(bid).name}就開張！`; },
    targetOf: nw => unlockTarget(nw, q),
    prog: nw => { const need = hrNeed(lv - 1); return `經驗 ${Math.max(0, Math.min(need, expTotal(nw.hr || 1, nw.hrExp || 0) - expTotal(lv - 1)))}／${need}`; },
    test: nw => buildingOpen(nw, bldOf(bid))
  };
  return q;
}
export const MAIN_QUESTS = [
  { id: '1-0', ch: 1, t: '選擇你的初心武器', hint: '在「裝備與造型」選一把武器', reward: { items: { potion: 3 } }, rewardText: '回復藥 ×3', test: nw => !!nw.starter },
  { id: '1-0a', ch: 1, soft: true, building: 'academy', t: '到教學大樓學會三堂課', hint: '村莊西邊的教學大樓：閃避、防禦、打字各一堂，跟著黃色箭頭走', rewardText: '字元 ×100', reward: { coins: 100 }, test: nw => !!(nw.tut && nw.tut.dodge && nw.tut.defend && nw.tut.attack) },
  { id: '1-1', ch: 1, target: { mk: 'frog', star: 1 }, t: '討伐泡泡蛙（草原 ★1）', hint: '到委託板，選草原的泡泡蛙', rewardText: '獵人經驗 +30', reward: { hrExp: 30 }, test: nw => (nw.dex.frog || 0) > 0 },
  unlockQuest('1-1u', 'forge', 3, '2b', 1),
  /* 2b 鐵匠鋪開張才會出現（hold）。soft：不擋 1-7，想先打 ★5 也行。獎勵字元不給強化石（2b 沒有強化石，SPEC §3.11） */
  { id: '1-5', ch: 1, soft: true, building: 'forge', hold: nw => !buildingOpen(nw, bldOf('forge')), t: '打造任何一件裝備', hint: '市集的鐵匠鋪：選一張圖紙、材料夠就能做。跟著黃色箭頭走', rewardText: '字元 ×60', reward: { coins: 60 }, test: nw => ((nw.forge && nw.forge.made) || 0) >= 1 },
  { id: '1-2', ch: 1, target: { mk: 'coo', star: 1 }, t: '討伐咕咕鳥（草原 ★1）', hint: '到委託板，選草原的咕咕鳥', rewardText: '獵人經驗 +30', reward: { hrExp: 30 }, test: nw => (nw.dex.coo || 0) > 0 },
  unlockQuest('1-2u', 'shop', 4, '3s', 1),
  { id: '1-3', ch: 1, hold: () => !attacksOn(), t: '閃避成功 5 次、防禦成功 5 次', hint: '狩獵時多試試閃避和防禦', rewardText: '稱號詞條「見習」', reward: {}, test: nw => nw.stat.dodgeOk >= 5 && nw.stat.defOk >= 5, prog: nw => `閃避 ${Math.min(5, nw.stat.dodgeOk)}/5　防禦 ${Math.min(5, nw.stat.defOk)}/5` },
  { id: '1-4', ch: 1, target: { rk: 'grass', star: 3 }, t: '討伐草原任何 ★3 的魔物', hint: '先打過 ★1、★2 才會開放 ★3', rewardText: '另外三把初心武器的圖紙', reward: { bp: ['bp_staff', 'bp_bow', 'bp_dagger', 'bp_crossbow'] }, test: nw => (nw.zone.grass || 0) >= 3 },
  { id: '1-6', ch: 1, soft: true, building: 'forge', hold: nw => !buildingOpen(nw, bldOf('forge')), t: '把一件裝備強化到 +1', hint: '鐵匠鋪的「強化」分頁：選一件裝備，按強化。一定會成功', rewardText: '字元 ×100', reward: { coins: 100 }, test: nw => ((nw.forge && nw.forge.ups) || 0) >= 1 },
  { id: '1-7', ch: 1, target: { rk: 'grass', star: 5 }, t: '討伐草原任何 ★5 的魔物', hint: '打倒 ★5 就會開放迷霧森林', rewardText: '開放迷霧森林', reward: {}, test: nw => (nw.zone.grass || 0) >= 5 },
  /* 第 2、3 章的解鎖任務：對應的段現在都沒開（hold），段開了才會出現。第 2 章程式還沒有，先放在 1-7 後面 */
  unlockQuest('2-0u', 'rank', 7, '2a', 2),
  unlockQuest('2-1u', 'rooms', 8, '3a', 2),
  unlockQuest('2-3u', 'armor', 10, '3b', 2),
  unlockQuest('3-0u', 'star', 12, '5', 3)
];

export const defaultNw = () => ({
  v: 1, savedAt: 0, look: null, starter: null, swaps: 0, hunts: 0,
  hr: 1, hrExp: 0, stars: 0, coins: 0, mats: {}, items: {}, bp: [],
  zone: { grass: 0, forest: 0 }, dex: {}, fastest: {},
  quest: { done: [] }, title: '', titleParts: [], words: [], used: {}, wwin: {},
  stat: { dodgeOk: 0, dodgeAll: 0, defOk: 0, defAll: 0, accN: 0, accSum: 0, wins: 0, fails: 0 },
  flags: 0, fb: {}, gw: [], equip: '', gifts: [], giftedEarly: false, tm: {}, bugLog: {}, bugs: 0, bugsSent: 0, tut: {}, intro: {}, awards: {}, seenNotice: '', seenNews: 0, seenEv: {}, seenBug: 0,
  name0: '', bugScore: 0, evDone: [], nameFlagged: {},
  mail: {}, nameLog: [], nameSet: 0, ev: {}, fastMk: {}, cpmHist: {}, runQ: [],
  gearV: 0, gear: [], eq: { weapon: null, helm: null, armor: null, gloves: null, boots: null }, bpDry: {}, forge: { made: 0, ups: 0, top: 0, gift: 0 },
  board: null,   // 委託板（BOARD_ROT 開著才用，格式見 normalizeBoard）
  shop: { day: 0, buy: {}, spent: 0, n: 0 },   // 商店（格式見 normalizeShop）
  unl: {}, unlV: 0,   // 解鎖路線（見 grantUnlock）；unlV＝舊存檔相容跑過了沒
  flow: '', esc: {}   // 上次選的流派（''＝一般打法）；esc＝「怪物:星級」逃走了幾次（打贏就清掉），結算提示藤蔓流用
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
  o.tm = d.tm || {}; o.bugLog = (d.bugLog && typeof d.bugLog === 'object' && !Array.isArray(d.bugLog)) ? d.bugLog : {}; o.tut = d.tut || {}; o.bugs = d.bugs || 0; o.bugsSent = d.bugsSent || 0; o.intro = d.intro || {}; o.awards = d.awards || {}; o.seenNotice = d.seenNotice || '';
  o.seenNews = +d.seenNews || 0; o.seenBug = +d.seenBug || 0;
  o.seenEv = (d.seenEv && typeof d.seenEv === 'object' && !Array.isArray(d.seenEv)) ? d.seenEv : {};
  o.name0 = typeof d.name0 === 'string' ? d.name0 : ''; o.bugScore = +d.bugScore || 0;
  o.evDone = Array.isArray(d.evDone) ? d.evDone : []; o.nameFlagged = d.nameFlagged || {};
  /* 已領的信是物件不是陣列：兩個分頁各自合併存檔時，不會整份蓋掉對方領過的紀錄 */
  o.mail = (d.mail && typeof d.mail === 'object' && !Array.isArray(d.mail)) ? d.mail : {};
  o.board = normalizeBoard(d.board);
  o.shop = normalizeShop(d.shop);
  /* 舊的詞庫暱稱不再使用，丟掉；nameLog＝用改名卡改過的名字（老師在學生卡看得到） */
  delete o.nick; delete o.nickAt;
  o.flow = FLOWS[d.flow] ? d.flow : '';
  o.esc = (d.esc && typeof d.esc === 'object' && !Array.isArray(d.esc)) ? d.esc : {};
  o.nameSet = d.nameSet ? 1 : 0;
  o.nameLog = Array.isArray(d.nameLog) ? d.nameLog.filter(x => x && typeof x.to === 'string').slice(-5) : [];
  /* ev＝每個活動的個人進度（SPEC §4.3）；fastMk＝每隻魔物（含星級）自己最快的秒數，給「進步獎」當活動前的紀錄。
     NW.fastest 的鍵是「區域:星級」，沒有魔物，進步獎用不了 */
  o.ev = (d.ev && typeof d.ev === 'object' && !Array.isArray(d.ev)) ? d.ev : {};
  o.fastMk = (d.fastMk && typeof d.fastMk === 'object' && !Array.isArray(d.fastMk)) ? d.fastMk : {};
  /* 村莊座標：posV 不是 2 的是舊地圖（22×15）的座標，在新地圖上可能站在牆裡，一律丟掉回出生點 */
  if (d.posV !== 2 || !Array.isArray(d.pos) || d.pos.length !== 2 || !d.pos.every(Number.isInteger)) { delete o.pos; delete o.posV; }
  cleanGear(o, d);
  /* 每場紀錄（2b-9）：cpmHist＝每個題目等級最近 5 場的打字速度（「進步太跳」用）；runQ＝還沒寫進雲端的紀錄（最多 5 筆） */
  o.cpmHist = (d.cpmHist && typeof d.cpmHist === 'object' && !Array.isArray(d.cpmHist)) ? d.cpmHist : {};
  /* V2 的一天帳（dayStep）：型別不對就丟掉，當作今天第一場 */
  if (d.day && typeof d.day === 'object' && !Array.isArray(d.day) && [d.day.d, d.day.n, d.day.work, d.day.ws].every(x => Number.isFinite(+x))) o.day = { d: +d.day.d, n: Math.max(0, Math.floor(+d.day.n)), work: Math.max(0, Math.floor(+d.day.work)), st: Math.max(0, Math.floor(+d.day.st || 0)), ws: Math.max(0, +d.day.ws) };
  else delete o.day;
  o.runQ = Array.isArray(d.runQ) ? d.runQ.filter(x => x && typeof x.rid === 'string' && x.run && typeof x.run === 'object').slice(-5) : [];
  /* unl 只留認得的建築、值 1 或 2（存檔是 merge 寫入，本機不會刪鍵，所以解開了就不會被收回） */
  o.unl = {};
  if (d.unl && typeof d.unl === 'object' && !Array.isArray(d.unl)) for (const b of lvBuildings()) { const v = +d.unl[b.id]; if (v === 1 || v === 2) o.unl[b.id] = v; }
  o.unlV = d.unlV ? 1 : 0;
  if (!o.unlV) { legacyUnlock(o); o.unlV = 1; }
  return o;
}
/* 舊存檔相容（只跑一次）：用過那個建築、或等級本來就夠的人，直接解開、不慶祝（他們升級時本來就看得到）。
   裝備要排除初始武器（s＝1）：每個人都有它，不代表用過鐵匠鋪 */
function legacyUnlock(o) {
  const it = o.intro || {}, f = o.forge || {}, sh = o.shop || {};
  const forgeUsed = !!(it.forge || f.made > 0 || f.ups > 0 || f.gift > 0 || (o.gear || []).some(g => g && !g.s));
  const used = { storage: !!it.storage || forgeUsed, forge: forgeUsed, shop: !!(it.shop || sh.n > 0 || sh.spent > 0) };
  for (const b of lvBuildings()) if (!o.unl[b.id] && (used[b.id] || !!it[b.id] || (o.hr || 1) >= b.lv)) o.unl[b.id] = 2;
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
/* 商店（docs/SPEC-SHOP-BOARD2.md A1）：價格與上限是模擬定的，要調先重跑 bal2b-term.mjs --exchange。
   day＝每天（twDay）最多買幾個（灰、綠是「同顏色合計」）；blue: false＝不賣（藍是最緊的資源）。階段 '3s' 沒開放前商店關著 */
export const SHOP = { gray: { price: 40, day: 3 }, green: { price: 200, day: 1 }, blue: false, renameCard: { price: 300, day: 1 } };
/* NW.shop：day＝上次買東西的 twDay；buy＝這天每種買了幾個（換日把每個鍵歸 0，不刪鍵：存檔是 merge 寫入，本機刪的鍵雲端刪不掉）。
   只留認得的 id、整數 0～99，沒有 undefined、沒有陣列 */
export function normalizeShop(d) {
  const int = (x, max = 1e9) => (Number.isFinite(+x) ? Math.min(max, Math.max(0, Math.floor(+x))) : 0);
  const o = { day: 0, buy: {}, spent: 0, n: 0 };
  if (!d || typeof d !== 'object' || Array.isArray(d)) return o;
  o.day = int(d.day); o.spent = int(d.spent); o.n = int(d.n);
  if (d.buy && typeof d.buy === 'object' && !Array.isArray(d.buy))
    for (const [id, v] of Object.entries(d.buy)) if (id === 'renameCard' || (Object.prototype.hasOwnProperty.call(MAT_INFO, id) && !id.startsWith('bp_'))) o.buy[id] = int(v, 99);
  return o;
}
/* ══ 裝備（第 2 段 2b，docs/SPEC-STAGE2.md §3）══
   一格一個數字（GDD §2.1）。全部是純函式，戰鬥（nw-battle.js）、人物卡（nw-card.js）、鐵匠鋪（nw-forge.js）、
   教師頁、tools/nw-sim 共用；存檔欄位：gearV、gear（每件 { id, k, c, p, t }）、eq（五格各指向一件的 id）、forge、bpDry。
   數值怎麼來的、為什麼比 GDD §14.12 小：docs/SPEC-STAGE2.md §3.2 與 docs/BALANCE-GEAR-2B.md（tools/nw-sim/gear.mjs 的結果）。
   武器＋屬性合起來最高 ×1.37（GEAR_CAP；藍 +5 的 130 × 屬性 1.05＝1.365）；防具只對「會攻擊的魔物」有用（attackingMons）。
   2026-11-24 起的數值是 docs/SPEC-BALANCE-V2.md §9（下一色 +0 ＝ 上一色 +5）。 */
export const GEAR_SLOTS = [['weapon', '武器'], ['helm', '頭盔'], ['armor', '盔甲'], ['gloves', '護手'], ['boots', '護腳']];
export const GEAR_MAX = 60;          // 裝備最多幾件（存檔大小的保險；分解要第 3 段才開）
export const GEAR_MAX_P = 5;
export const BP_DUP_COINS = 30;     // 老師寄的圖紙已經會了：換成這麼多字元（GDD §12.5）         // 2b 強化最高 +5
export const GEAR_COLORS = ['gray', 'green', 'blue'];   // 2b 的魔物只掉灰、綠、藍；紫以上第 3 段才有
export const colorRank = c => GEAR_COLORS.indexOf(c);
/* 每一格的數字：[灰, 綠, 藍]、每 +1 加多少（SPEC-BALANCE-V2 §9.1）。
   色階規則「下一色 +0 ＝ 上一色 +5」：強化到頂再換顏色不吃虧、換了還能繼續長。護腳不動（模擬看不出效果，等遙測） */
export const GEAR_TB = {
  weapon: { base: [100, 110, 120], per: 2 },
  helm: { base: [10, 25, 40], per: 3 },
  armor: { base: [.05, .10, .15], per: .01 },
  gloves: { base: [.2, .4, .6], per: .04 },
  boots: { base: [.10, .20, .30], per: .03 }
};
const r2 = x => Math.round(x * 100) / 100;
/* 一件的數字：武器＝攻擊力、頭盔＝生命、盔甲＝受傷少（比例）、護手＝舉盾多幾秒、護腳＝紅線早幾秒 */
export function slotValue(slot, c, p, fixed) {
  const t = GEAR_TB[slot], i = Math.max(0, colorRank(c));
  const base = (fixed != null) ? fixed : t.base[i];
  return r2(base + t.per * p);
}
/* 綠 +0（22）要嚴格高於灰 +5（20），鐵匠鋪的「穿上」金色按鈕才有誘因去做綠的 */
export const POWER_BASE = { gray: 10, green: 22, blue: 34 };
export const gearPowerOf = (c, p) => (POWER_BASE[c] || 10) + 2 * p;

const ANY = (c, n, coins) => ({ any: [c, n], coins });
const MATS = (list, coins) => ({ mats: list, coins });
/* 每一種裝備一列。ver＝各顏色版本的配方：any＝任意某顏色的材料 n 個；mats＝指定材料；coins＝字元。
   bp＝圖紙 id（null＝不用圖紙）。look＝穿上去角色外觀。要加新裝備：加一列、圖紙放進某隻魔物的 rare（UI-ART-SPEC §7） */
export const GEAR_DEFS = {
  w_staff: { name: '學徒木杖', slot: 'weapon', wk: 'staff', bp: 'bp_staff', ver: { gray: ANY('gray', 4, 40), green: ANY('green', 3, 120) } },
  w_bow: { name: '獵人短弓', slot: 'weapon', wk: 'bow', bp: 'bp_bow', ver: { gray: ANY('gray', 4, 40), green: ANY('green', 3, 120) } },
  w_dagger: { name: '鐵製小刀', slot: 'weapon', wk: 'dagger', bp: 'bp_dagger', ver: { gray: ANY('gray', 4, 40), green: ANY('green', 3, 120) } },
  w_crossbow: { name: '木弩', slot: 'weapon', wk: 'crossbow', bp: 'bp_crossbow', ver: { gray: ANY('gray', 4, 40), green: ANY('green', 3, 120) } },
  flame_dagger: { name: '炎牙刀', slot: 'weapon', wk: 'flame_dagger', bp: 'bp_flame_dagger', elem: 'fire', ver: { blue: MATS([['wolf_fang', 3], ['wolf_fur', 3]], 250) } },
  cloth_hat: { name: '布帽', slot: 'helm', bp: 'bp_cloth_hat', ver: { gray: ANY('gray', 3, 30) }, look: { helm: 'cloth', color: '#a08a6a' } },
  cloth_vest: { name: '布衣', slot: 'armor', bp: 'bp_cloth_vest', ver: { gray: ANY('gray', 4, 30) }, look: { color: '#a08a6a' } },
  cloth_gloves: { name: '布手套', slot: 'gloves', bp: 'bp_cloth_gloves', ver: { gray: ANY('gray', 3, 30) }, look: { color: '#a08a6a' } },
  cloth_shoes: { name: '布鞋', slot: 'boots', bp: 'bp_cloth_shoes', ver: { gray: ANY('gray', 3, 30) }, look: { color: '#a08a6a' } },
  coo_hat: { name: '咕咕帽', slot: 'helm', bp: 'bp_coo_hat', ver: { green: MATS([['coo_down', 3], ['coo_feather', 3]], 120) }, look: { helm: 'coo', color: '#6aa84f' } },
  coo_gloves: { name: '羽毛護手', slot: 'gloves', bp: 'bp_coo_gloves', ver: { green: MATS([['coo_down', 2], ['coo_feather', 4]], 120) }, look: { color: '#6aa84f' } },
  frog_boots: { name: '泡泡靴', slot: 'boots', bp: 'bp_frog_boots', ver: { green: MATS([['frog_skin', 3], ['frog_slime', 3]], 120) }, look: { color: '#3e9a96' } },
  frog_vest: { name: '蛙皮背心', slot: 'armor', bp: 'bp_frog_vest', ver: { green: MATS([['frog_skin', 3], ['frog_slime', 4]], 120) }, look: { color: '#3e9a96' } },
  shroom_cap: { name: '蘑菇帽', slot: 'helm', bp: 'bp_shroom_cap', ver: { green: MATS([['shroom_spore', 3], ['shroom_cap', 3]], 120) }, look: { helm: 'shroom', color: '#c0392b' } },
  wolf_mail: { name: '炎狼皮甲', slot: 'armor', bp: 'bp_wolf_mail', ver: { blue: MATS([['wolf_fang', 3], ['wolf_fur', 4]], 250) }, look: { color: '#b8502a' } }
};
/* 打造才有的特殊武器（跟 GIFT_WEAPONS 一樣有 name／kind／base／desc；weaponInfo、weaponBase 兩邊都查） */
export const EXTRA_WEAPONS = {
  flame_dagger: { name: '炎牙刀', kind: '火焰雙刀', fam: '打造的', base: 'dagger', elem: 'fire',
    desc: '刀身燒著橘紅色的火。用法跟一般雙刀一樣，打「怕火」的魔物傷害變多、打「不怕火」的變少。' }
};
/* 老師送的武器（GIFT_WEAPONS，例：測試者之刃）也是一件裝備：綠色，攻擊力＝100 × dmgMul（測試者之刃 112），可以強化 */
export function gearDef(k) {
  if (typeof k !== 'string') return null;
  if (Object.prototype.hasOwnProperty.call(GEAR_DEFS, k)) return GEAR_DEFS[k];
  const w = Object.prototype.hasOwnProperty.call(GIFT_WEAPONS, k) ? GIFT_WEAPONS[k] : null;
  return w ? { name: w.name, slot: 'weapon', wk: k, bp: null, fixed: { c: 'green', atk: Math.round(100 * (w.dmgMul || 1)) }, ver: {}, gift: true } : null;
}
export const gearKeys = () => Object.keys(GEAR_DEFS);
/* 這件能做成哪幾種顏色 */
export const defColors = d => (d && d.fixed) ? [d.fixed.c] : GEAR_COLORS.filter(c => d && d.ver && d.ver[c]);
export const defTopColor = d => { const l = defColors(d); return l[l.length - 1] || 'gray'; };

/* ── 一件裝備、一個存檔 ── */
export const gearItem = (nw, id) => (nw && Array.isArray(nw.gear) && id) ? (nw.gear.find(g => g.id === id) || null) : null;
export const equippedItem = (nw, slot) => (nw && nw.eq) ? gearItem(nw, nw.eq[slot]) : null;
export const itemName = it => { const d = gearDef(it.k); return (d ? d.name : '？？？') + (it.p ? ` +${it.p}` : ''); };
export const itemPower = it => gearPowerOf(it.c, it.p);
export function itemValue(it) {
  const d = gearDef(it.k); if (!d) return 0;
  return slotValue(d.slot, it.c, it.p, d.fixed ? d.fixed.atk : null);
}
/* 學生看到的那句數字說明 */
export function valueText(slot, v) {
  if (slot === 'weapon') return `攻擊力 ${v}`;
  if (slot === 'helm') return `生命 +${v}`;
  if (slot === 'armor') return `受傷少 ${Math.round(v * 100)}%`;
  if (slot === 'gloves') return `舉盾多 ${v} 秒`;
  return `紅線早 ${v} 秒出現`;
}
export const itemText = it => { const d = gearDef(it.k); return d ? valueText(d.slot, itemValue(it)) : ''; };
/* 現在會攻擊玩家的魔物（從 ATTACKS_OPEN 算：之後開放更多攻擊，說明文字自動更新）。名字去掉「（閃避測試）」 */
export const monShortName = k => (MONSTERS[k] ? MONSTERS[k].name.replace(/（.*?）/g, '') : k);
export const attackingMons = () => { const T = v2On() ? ATTACKS_V2 : ATTACKS_OPEN; return Object.keys(T).filter(k => MONSTERS[k] && T[k].length); };
/* 防具／武器的一句話說明；防具一律多一行「對會攻擊的魔物才有用」 */
export function slotNote(slot) {
  if (slot === 'weapon') return '打對的字，傷害會變多。';
  const who = attackingMons().map(monShortName).join('、') || '還沒有';
  return `對會攻擊你的魔物才有用。現在會攻擊的：${who}。`;
}

/* 五格加總。戰鬥用：atk（傷害 × atk/100）、elem、hp（生命上限加多少）、cut（招式傷害少幾成）、shield（舉盾多幾秒）、warn（紅線早幾秒）；pw＝戰力 */
export function gearStats(nw) {
  const s = { atk: 100, elem: null, hp: 0, cut: 0, shield: 0, warn: 0, pw: 0 };
  for (const [slot] of GEAR_SLOTS) {
    const it = equippedItem(nw, slot), d = it && gearDef(it.k);
    if (!d || d.slot !== slot) continue;
    const v = itemValue(it);
    s.pw += itemPower(it);
    if (slot === 'weapon') { s.atk = v; s.elem = d.elem || null; }
    else if (slot === 'helm') s.hp = v;
    else if (slot === 'armor') s.cut = v;
    else if (slot === 'gloves') s.shield = v;
    else s.warn = v;
  }
  return s;
}
/* 打到某隻魔物時武器的總倍率（攻擊力 × 屬性） */
/* 屬性只有 ×1.05／×0.95：×1.1 的話藍 +0（120）就頂到舊上限 1.32，+1～+5 打怕火的魔物完全沒效果（SPEC-BALANCE-V2 §9.1 第 2 項）。
   GEAR_CAP 只是保險：現在最高 130 × 1.05＝1.365，碰不到；以後新武器加屬性不會不小心超過 */
export const ELEM_UP = 1.05, ELEM_DOWN = 0.95, GEAR_CAP = 1.37;
export function elemMulOf(elem, mk) {
  const m = MONSTERS[mk];
  if (!elem || !m) return 1;
  return m.fear === elem ? ELEM_UP : m.resist === elem ? ELEM_DOWN : 1;
}
export const gearMul = (gs, mk) => Math.min(GEAR_CAP, gs.atk / 100 * elemMulOf(gs.elem, mk));

/* 魔物一個招式打到玩家的傷害：重壓沒擋住只扣一次但 ×1.5（以前三條線各扣一次＝×3，沒有時限後倒下變成唯一的輸法，太痛）；
   盔甲「無條件進位」地減（低星的招式每下至少少 1 點）；-1e-9 擋浮點誤差：0.14 × 50 會算成 7.000000000000001 而進位成 8。
   純函式，nw-battle.js 的 resolveStrike 用它，測試也直接測它 */
export function strikeDamage(base, mul, slam, cut) {
  let dmg = Math.max(1, Math.round(base * mul * (slam ? 1.5 : 1)));
  if (cut) dmg = Math.max(1, dmg - Math.ceil(dmg * cut - 1e-9));
  return dmg;
}

/* 外觀：給 heroLook(look, weapon, gear) 的 gear 參數。沒穿的格子不寫，用 heroLook 的預設（灰盔甲、沒頭盔）。
   花邊：+0～+2 比主色深一點、+3～+4 稀有度色、+5 金色（SPEC §3.9） */
const hx = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
export function shadeHex(c, f) {
  const v = hx(c).map(n => f < 0 ? n * (1 + f) : n + (255 - n) * f);
  return '#' + v.map(n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')).join('');
}
const trimOf = (it, main) => it.p >= 5 ? '#e8b64c' : it.p >= 3 ? (COLOR_HEX[it.c] || '#e8b64c') : shadeHex(main, -.35);
export function gearLook(nw) {
  const L = {};
  const w = equippedItem(nw, 'weapon'), wd = w && gearDef(w.k);
  if (wd && wd.elem) L.wfx = wd.elem;
  const helm = equippedItem(nw, 'helm'), hd = helm && gearDef(helm.k);
  if (hd && hd.look) { L.helm = hd.look.helm || 'none'; L.helmC = hd.look.color; L.helmTrim = trimOf(helm, hd.look.color); }
  const armor = equippedItem(nw, 'armor'), ad = armor && gearDef(armor.k);
  if (ad && ad.look) { L.armor = ad.look.color; L.trim = trimOf(armor, ad.look.color); }
  const gl = equippedItem(nw, 'gloves'), gd = gl && gearDef(gl.k);
  if (gd && gd.look) L.hands = gd.look.color;
  const bt = equippedItem(nw, 'boots'), bd = bt && gearDef(bt.k);
  if (bd && bd.look) L.boots = bd.look.color;
  return L;
}

/* ── 材料：一次扣哪些 ── */
const matColor = id => (MAT_INFO[id] || [id, 'gray'])[1];
/* 從背包挑「任意 n 個」：color 是下限（upgrade 時「同色以上」）；exact＝只要那個顏色（打造）。
   預設先用顏色低的、再用數量多的（灰材料一直堆，強化是它主要的去處）；prefer＝孩子點換的順序，排在最前面 */
export function pickAny(nw, color, n, { exact = false, prefer = [] } = {}) {
  const lo = colorRank(color);
  const cand = Object.entries(nw.mats || {}).filter(([id, c]) => c > 0 && MAT_INFO[id] && !id.startsWith('bp_')
    && (exact ? matColor(id) === color : colorRank(matColor(id)) >= lo))
    .map(([id, c]) => ({ id, have: c, color: matColor(id) }));
  cand.sort((a, b) => {
    const pa = prefer.indexOf(a.id), pb = prefer.indexOf(b.id);
    if (pa !== pb) return (pa < 0 ? 99 : pa) - (pb < 0 ? 99 : pb);
    return colorRank(a.color) - colorRank(b.color) || b.have - a.have || (a.id > b.id ? 1 : -1);
  });
  const use = {}; let left = n;
  for (const c of cand) { if (left <= 0) break; const t = Math.min(c.have, left); use[c.id] = t; left -= t; }
  const have = cand.reduce((a, c) => a + c.have, 0);
  return { ok: left <= 0, use, need: n, have, short: Math.max(0, left), cand };
}
const usedText = use => Object.entries(use).map(([id, n]) => `${(MAT_INFO[id] || [id])[0]} ×${n}`).join('、');
export { usedText };

/* 這張圖紙學會了嗎（自己的初心武器免圖紙） */
export const bpKnown = (nw, d) => !d || !d.bp || (nw.bp || []).includes(d.bp) || (d.slot === 'weapon' && d.wk === nw.starter);

/* 打造前檢查：回 { ok, why, lack:[{what, need, have}], use, coins, rec }。lack 的 what 寫給孩子看：「柔軟絨毛」「字元」 */
export function craftCheck(nw, key, c, prefer) {
  const d = Object.prototype.hasOwnProperty.call(GEAR_DEFS, key) ? GEAR_DEFS[key] : null;
  const rec = d && d.ver[c];
  const out = { ok: false, why: '', lack: [], use: {}, coins: 0, rec: rec || null, def: d };
  if (!d || !rec) { out.why = '這個做不出來'; return out; }
  /* 圖紙沒學、裝備滿了：材料還是照算（畫面要列），但不能做（blocked） */
  const blocked = !bpKnown(nw, d) ? '還沒學會這張圖紙' : (nw.gear || []).length >= GEAR_MAX ? `裝備已經 ${GEAR_MAX} 件了，之後開放「分解」就能整理` : '';
  out.coins = rec.coins; out.blocked = !!blocked;
  if (nw.coins < rec.coins) out.lack.push({ what: '字元', need: rec.coins, have: nw.coins, short: rec.coins - nw.coins });
  if (rec.mats) {
    for (const [id, n] of rec.mats) {
      const have = (nw.mats && nw.mats[id]) || 0; out.use[id] = n;
      if (have < n) out.lack.push({ what: (MAT_INFO[id] || [id])[0], need: n, have, short: n - have });
    }
  }
  if (rec.any) {
    const [col, n] = rec.any, pk = pickAny(nw, col, n, { exact: true, prefer });
    Object.assign(out.use, pk.use); out.any = pk;
    if (!pk.ok) out.lack.push({ what: `${COLOR_NAME[col]}色材料`, need: n, have: pk.have, short: pk.short });
  }
  out.ok = !out.lack.length && !blocked;
  out.why = blocked || (out.ok ? '' : '材料或字元還不夠');
  return out;
}
export function newGearId(nw) {
  const used = new Set((nw.gear || []).map(g => g.id));
  for (let i = 0; i < 50; i++) {
    const id = 'g' + Math.floor(Math.random() * 36 ** 4).toString(36).padStart(4, '0');
    if (!used.has(id)) return id;
  }
  return 'g' + Date.now().toString(36);
}
/* 照 craftCheck 扣材料與字元、放進一件 +0 的新裝備；不夠就回 null、什麼都不動 */
export function doCraft(nw, key, c, prefer, t) {
  const ck = craftCheck(nw, key, c, prefer);
  if (!ck.ok) return null;
  nw.coins -= ck.coins;
  for (const [id, n] of Object.entries(ck.use)) { nw.mats[id] -= n; if (nw.mats[id] <= 0) delete nw.mats[id]; }
  const it = { id: newGearId(nw), k: key, c, p: 0, t: t || Date.now() };
  nw.gear.push(it);
  nw.forge.made = (nw.forge.made || 0) + 1;
  return it;
}
/* ── 強化 +1～+5：一定成功、不會壞、不會掉級（SPEC §3.6）── */
export const UP_COINS = [20, 35, 55, 80, 110];
export const UP_MATS = [1, 1, 2, 2, 3];
export const COLOR_MUL = { gray: 1, green: 2, blue: 3 };
export const upCost = it => it.p >= GEAR_MAX_P ? null : { coins: UP_COINS[it.p] * (COLOR_MUL[it.c] || 1), mats: UP_MATS[it.p] };
export function upCheck(nw, id, prefer) {
  const it = gearItem(nw, id), out = { ok: false, why: '', lack: [], use: {}, coins: 0, it, cost: null };
  if (!it) { out.why = '找不到這件裝備'; return out; }
  out.cost = upCost(it);
  if (!out.cost) { out.why = '2b 先強化到 +5，+6 以上要等之後開放'; return out; }
  out.coins = out.cost.coins;
  if (nw.coins < out.coins) out.lack.push({ what: '字元', need: out.coins, have: nw.coins, short: out.coins - nw.coins });
  const pk = pickAny(nw, it.c, out.cost.mats, { prefer });
  Object.assign(out.use, pk.use); out.any = pk;
  if (!pk.ok) out.lack.push({ what: `${COLOR_NAME[it.c]}色以上的材料`, need: out.cost.mats, have: pk.have, short: pk.short });
  out.ok = !out.lack.length;
  if (!out.ok) out.why = '材料或字元還不夠';
  return out;
}
export function doUpgrade(nw, id, prefer) {
  const ck = upCheck(nw, id, prefer);
  if (!ck.ok) return null;
  nw.coins -= ck.coins;
  for (const [m, n] of Object.entries(ck.use)) { nw.mats[m] -= n; if (nw.mats[m] <= 0) delete nw.mats[m]; }
  ck.it.p++;
  nw.forge.ups = (nw.forge.ups || 0) + 1;
  nw.forge.top = Math.max(nw.forge.top || 0, ck.it.p);
  return ck.it;
}
/* 穿上：放進它的那一格。回 false＝找不到或格子不對 */
export function doEquip(nw, id) {
  const it = gearItem(nw, id), d = it && gearDef(it.k);
  if (!d) return false;
  nw.eq[d.slot] = it.id;
  syncLegacy(nw);
  return true;
}
/* 穿上之後戰力變多少（「穿上」按鈕在比較高時變金色） */
export const powerGain = (nw, id) => { const it = gearItem(nw, id), d = it && gearDef(it.k); if (!d) return 0; const cur = equippedItem(nw, d.slot); return itemPower(it) - (cur ? itemPower(cur) : 0); };
/* 這個人的戰力（五格加總）；教師頁表格排序用 */
export const gearPower = nw => gearStats(nw).pw;

/* 現在材料夠不夠做：回每一件的狀態，「做得出來的排前面」用。cloth 之類只有灰色版的只看灰色版 */
export function craftList(nw) {
  const out = [];
  for (const [key, d] of Object.entries(GEAR_DEFS)) {
    if (!bpKnown(nw, d)) continue;
    const vers = defColors(d).map(c => ({ c, ck: craftCheck(nw, key, c) }));
    out.push({ key, def: d, vers, can: vers.some(v => v.ck.ok) });
  }
  return out.sort((a, b) => (b.can ? 1 : 0) - (a.can ? 1 : 0));
}
/* 「再 1 個柔軟絨毛就能做咕咕帽」：挑最接近完成的一件，結算畫面用。回 null＝沒什麼可說 */
export function forgeHint(nw) {
  const list = craftList(nw), can = list.filter(x => x.can).length;
  if (can) return { can, text: `現在可以做 ${can} 件！` };
  let best = null;
  for (const x of list) for (const v of x.vers) {
    const ls = v.ck.lack; if (!ls.length) continue;
    const items = ls.filter(l => l.what !== '字元'), coin = ls.find(l => l.what === '字元');
    const score = items.reduce((a, l) => a + l.short, 0) + (coin ? 1 : 0);
    if (!best || score < best.score) best = { score, x, items, coin };
  }
  if (!best) return null;
  const parts = best.items.map(l => `${l.short} 個${l.what}`);
  if (best.coin) parts.push(`${best.coin.short} 字元`);
  return { can: 0, text: `再 ${parts.join('、')}就能做${best.x.def.name}` };
}
/* 圖紙掉落：每張沒學會的 30%；贏了卻沒掉，保底計數 +1；計數到 5，下一場贏的一定掉一張（GDD §12.6，每隻魔物自己算） */
export const BP_RATE = 0.3, BP_PITY = 5;
export function rollBlueprints(nw, mk, rnd = Math.random) {
  const m = MONSTERS[mk], left = ((m && m.rare) || []).filter(([id]) => !nw.bp.includes(id));
  if (!left.length) return [];
  const got = left.filter(() => rnd() < BP_RATE);
  if (!got.length && (nw.bpDry[mk] || 0) >= BP_PITY) got.push(left[Math.floor(rnd() * left.length)]);
  nw.bpDry[mk] = got.length ? 0 : (nw.bpDry[mk] || 0) + 1;
  got.forEach(([id]) => nw.bp.push(id));
  return got.map(([id, name, color]) => ({ id, name, color }));
}
/* 第一次進鐵匠鋪，鐵匠送的布裝圖紙 */
export const CLOTH_BPS = ['bp_cloth_hat', 'bp_cloth_vest', 'bp_cloth_gloves', 'bp_cloth_shoes'];
export function giveClothBps(nw) {
  if (nw.forge.gift) return [];
  nw.forge.gift = 1;
  const got = CLOTH_BPS.filter(b => !nw.bp.includes(b));
  nw.bp.push(...got);
  return got;
}

/* ── 舊存檔搬移與整理（normalizeNw 呼叫）──
   舊格式：starter（初心武器）、gw（老師送的武器）、equip（現在拿哪把，''＝初心武器）。
   用 gearV 旗標只搬一次：本機舊存檔比雲端新而被選中時，沒有 gear 就搬會把做好的裝備洗掉（SPEC §3.10）。
   gearV 是 1 卻沒有 gear：不重搬，只放一把初心武器、console.warn，老師可以用信件補。 */
export function cleanGear(o, d) {
  const emptyEq = () => ({ weapon: null, helm: null, armor: null, gloves: null, boots: null });
  o.forge = Object.assign({ made: 0, ups: 0, top: 0, gift: 0 }, (d.forge && typeof d.forge === 'object' && !Array.isArray(d.forge)) ? d.forge : {});
  o.bpDry = (d.bpDry && typeof d.bpDry === 'object' && !Array.isArray(d.bpDry)) ? d.bpDry : {};
  const starterItem = () => (STARTERS[o.starter] ? { id: 'g0', k: 'w_' + o.starter, c: 'gray', p: 0, t: 0, s: 1 } : null);
  if (d.gearV !== 1) {
    o.gear = []; o.eq = emptyEq();
    const s = starterItem(); if (s) { o.gear.push(s); o.eq.weapon = s.id; }
    for (const k of o.gw) {
      if (!gearDef(k)) continue;
      const it = { id: 'gw_' + k, k, c: 'green', p: 0, t: 0 }; o.gear.push(it);
      if (o.equip === k) o.eq.weapon = it.id;
    }
    o.gearV = 1;
  } else {
    o.gear = Array.isArray(d.gear) ? d.gear.filter(g => g && typeof g.id === 'string' && gearDef(g.k) && GEAR_COLORS.includes(g.c) && Number.isInteger(g.p) && g.p >= 0 && g.p <= GEAR_MAX_P).slice(0, GEAR_MAX) : null;
    if (!o.gear) {
      console.warn('裝備資料不見了：只放一把初心武器，老師可以用信件補發');
      const s = starterItem(); o.gear = s ? [s] : [];
    }
    o.eq = Object.assign(emptyEq(), (d.eq && typeof d.eq === 'object') ? d.eq : {});
    for (const [slot] of GEAR_SLOTS) { const it = gearItem(o, o.eq[slot]), df = it && gearDef(it.k); if (!df || df.slot !== slot) o.eq[slot] = null; }
    if (!o.eq.weapon) { const s = o.gear.find(g => gearDef(g.k).slot === 'weapon' && g.s) || o.gear.find(g => gearDef(g.k).slot === 'weapon'); if (s) o.eq.weapon = s.id; }
  }
  syncLegacy(o);
}
/* 舊欄位照寫：還開著舊分頁的學生、教師頁舊程式不會壞。equip＝穿著的老師送的武器（沒有就 ''）；gw＝擁有的老師送的武器 */
export function syncLegacy(nw) {
  const w = equippedItem(nw, 'weapon');
  nw.equip = (w && Object.prototype.hasOwnProperty.call(GIFT_WEAPONS, w.k)) ? w.k : '';
  const gw = []; (nw.gear || []).forEach(g => { if (Object.prototype.hasOwnProperty.call(GIFT_WEAPONS, g.k) && !gw.includes(g.k)) gw.push(g.k); });
  nw.gw = gw;
}
/* 換初心武器（前 3 場免費）：把那件初心武器的種類換掉；第一次選就放進去並穿上 */
export function setStarter(nw, wk) {
  nw.starter = wk;
  let s = (nw.gear || []).find(g => g.s);
  if (!s) { s = { id: 'g0', k: 'w_' + wk, c: 'gray', p: 0, t: 0, s: 1 }; if ((nw.gear || []).some(g => g.id === 'g0')) s.id = newGearId(nw); nw.gear.push(s); if (!nw.eq.weapon) nw.eq.weapon = s.id; }
  else s.k = 'w_' + wk;
  syncLegacy(nw);
}
/* 老師送的裝備（信箱 gear）：顏色不能高於那件做得出的最高色、強化 0～5。滿了回 'full'，不認得回 null */
export function giveGear(nw, key, c, p, t) {
  const d = Object.prototype.hasOwnProperty.call(GEAR_DEFS, key) ? GEAR_DEFS[key] : gearDef(key);
  if (!d) return null;
  if ((nw.gear || []).length >= GEAR_MAX) return 'full';
  const cols = defColors(d), col = cols.includes(c) ? c : cols[0];
  const it = { id: newGearId(nw), k: key, c: col, p: Math.max(0, Math.min(GEAR_MAX_P, p | 0)), t: t || Date.now() };
  nw.gear.push(it);
  return it;
}
export const giftGearOk = r => !!r && typeof r.key === 'string' && !!gearDef(r.key) && defColors(gearDef(r.key)).includes(r.c) && Number.isInteger(r.p) && r.p >= 0 && r.p <= GEAR_MAX_P;

/* 材料與圖紙的名稱表：{ id: [名稱, 顏色] }。背包、信箱領取、教師頁「給東西」的清單都從這裡來，
   魔物的 drops／rare、初心武器圖紙一加，各處就自動多一項，不用另外登記。 */
export const MAT_INFO = (() => {
  const m = {};
  Object.values(MONSTERS).forEach(mo => {
    (mo.drops || []).forEach(([id, name, color]) => { m[id] = [name, color]; });
    (mo.rare || []).forEach(([id, name, color]) => { m[id] = [name.replace('📜 ', ''), color]; });
  });
  Object.entries(STARTERS).forEach(([k, st]) => { m['bp_' + k] = [st.name + '圖紙', 'gray']; });
  /* 怪物不掉、鐵匠送的圖紙（布裝）：名稱跟顏色照那件最低的版本 */
  Object.values(GEAR_DEFS).forEach(d => { if (d.bp && !m[d.bp]) m[d.bp] = [d.name + '圖紙', defColors(d)[0] || 'gray']; });
  return m;
})();
/* 圖紙的 id 一律 bp_ 開頭；其他是材料。信箱用這兩個擋掉老師打錯的 key（SPEC-STAGE2 F6） */
export const isBpId = id => typeof id === 'string' && id.startsWith('bp_') && Object.prototype.hasOwnProperty.call(MAT_INFO, id);
export const isMatId = id => typeof id === 'string' && !id.startsWith('bp_') && Object.prototype.hasOwnProperty.call(MAT_INFO, id);
/* 教學大樓三堂課（NW.tut 的 key） */
export const TUT_LESSONS = [['dodge', '閃避'], ['defend', '防禦'], ['attack', '打字']];
/* 區域進度（NW.zone[區域]＝打贏的最高星級）老師能補到幾星 */
export const ZONE_STAR_MAX = 5;

/* ── 每場紀錄與可疑偵測（2b-9，docs/SPEC-STAGE2.md §2.5、§2.6）──
   戰鬥結束時 nw-battle.js 算好每題摘要 q:[[字數, 按鍵, 毫秒, 打對幾字], …]；這裡用同一套函式判斷「可疑」，
   老師端彙總（2a 的 teacher/rank-calc.js）重算也用它，學生改了自己的程式照樣在老師那邊被抓到。
   標記只是請老師看一眼：不扣獎勵、不罰，學生看不到「可疑」這個詞。 */
export const RANK_MIN_ACC = 0.9;            // 合格場次的正確率下限（SPEC §2.4）；結算的 lvAcc 也用它
export const SUS = { keysRatio: 1.5, keysMinCor: 20, qFastCps: 5, qFastMinChars: 3, cpmSane: 130, jumpMul: 3, jumpNeed: 5, qMax: 120 };
export const SUS_WHY = { keys: '按鍵太少', fast: '太快', sum: '數字對不起來', jump: '進步太跳' };
/* 題目等級＝題目字數上限 × 詞庫難度（戰鬥的 tierIdx 不含「生氣」那一階）。同一個等級才比速度（進步榜） */
export const qBand = (star, lv) => `${MAX_CHARS(star)}:${lv < 10 ? 0 : lv < 20 ? 1 : 2}`;
const median = a => { const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : 0; };
/* r：{ cor, keys, ans, secs, cpm, q }；hist：這個題目等級最近的 cpm（最多 5 個）。回代碼清單（可能是空的） */
export function susCheck(r, hist) {
  const out = [], q = Array.isArray(r.q) ? r.q : [];
  /* 注音一個字至少 2 鍵；整場 0 個按鍵不判斷（觸控裝置有些不送 keydown） */
  if (r.keys > 0 && r.cor >= SUS.keysMinCor && r.cor > r.keys / SUS.keysRatio) out.push('keys');
  if (q.some(x => x[0] >= SUS.qFastMinChars && x[2] > 0 && x[0] / (x[2] / 1000) > SUS.qFastCps) || r.cpm > SUS.cpmSane) out.push('fast');
  const sumMs = q.reduce((a, x) => a + (+x[2] || 0), 0), all = r.ans <= SUS.qMax;
  if ((all && (q.length !== r.ans || q.reduce((a, x) => a + (+x[3] || 0), 0) !== r.cor)) || sumMs / 1000 > r.secs + 1) out.push('sum');
  if (Array.isArray(hist) && hist.length >= SUS.jumpNeed && r.cpm > SUS.jumpMul * median(hist)) out.push('jump');
  return out;
}

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
  { id: 'exact', w: '一字不差', g: '成就', how: '正確率 100% 打贏 Lv10 以上的魔物', test: n => (n.perfect || 0) > 0 },
  /* wip＝哪一段開放才算數：鐵匠鋪沒開時不能拿、背包的稱號選單也不列（不然孩子看到「打造 1 件」卻沒地方打造） */
  { id: 'smith1', w: '見習鐵匠', g: '成就', wip: '2b', how: '打造 1 件裝備', test: n => ((n.forge && n.forge.made) || 0) >= 1 },
  { id: 'smith5', w: '鐵匠', g: '成就', wip: '2b', how: '打造 5 件裝備', test: n => ((n.forge && n.forge.made) || 0) >= 5 },
  { id: 'shiny', w: '閃亮亮', g: '成就', wip: '2b', how: '把一件裝備強化到 +5', test: n => (n.gear || []).some(g => g.p >= GEAR_MAX_P) },
  { id: 'fullset', w: '全副武裝', g: '成就', wip: '2b', how: '五格裝備都穿上', test: n => GEAR_SLOTS.every(([s]) => n.eq && n.eq[s]) }
];
export const wordOpen = x => !x.wip || stageOpen(x.wip);
export const wordById = id => WORDS.find(x => x.id === id);

export function checkWords(nw) {
  const got = [];
  for (const x of WORDS) if (!nw.words.includes(x.id) && wordOpen(x) && x.test(nw)) { nw.words.push(x.id); got.push(x.w); }
  return got;
}

export function setTitleParts(nw, ids) {
  const seen = [];
  for (const id of ids) if (nw.words.includes(id) && !seen.includes(id) && seen.length < 3) seen.push(id);
  nw.titleParts = seen;
  nw.title = seen.map(id => wordById(id).w).join('');
}

export const currentQuest = nw => MAIN_QUESTS.find(q => !nw.quest.done.includes(q.id) && !(q.hold && q.hold(nw))) || null;

export function goalOf(nw) {
  const q = currentQuest(nw);
  if (!q || (!q.target && !q.targetOf && !q.building)) return null;
  const has = !!(q.target || q.targetOf), t = (q.targetOf ? q.targetOf(nw) : q.target) || {};
  return { text: qText(nw, q), building: q.building || 'board', match: x => has && (!t.rk || t.rk === x.rk) && (!t.mk || t.mk === x.mk) && (!t.star || t.star === x.star) };
}

export function zoneOpen(nw, rk) {
  const r = REGIONS[rk];
  if (!r || r.wip) return false;
  if (!r.needs) return true;
  return (nw.zone[r.needs] || 0) >= 5;
}
export const starOpen = (nw, rk, star) => star <= 1 || (nw.zone[rk] || 0) >= star - 1;

/* 段號是字串，開了哪幾段用清單表示，可以跳著開（2b 鐵匠鋪先開，2a 榮譽碑 4 週後再開；SPEC-STAGE2 §1）。
   收回：從清單拿掉、重新發版，學生資料不刪。測試在 localhost 用 window.__NW_STAGES__ 覆寫 */
export const OPEN_STAGES = ['1', '2b', '3s'];
export const openStages = () => (typeof location !== 'undefined' && location.hostname === 'localhost' && window.__NW_STAGES__) || OPEN_STAGES;
export const stageOpen = s => openStages().includes(String(s));

/* ── 解鎖路線（docs/SPEC-UNLOCK-ROUTE.md）：段開了（老師允許）還要獵人等級夠才打得開 ──
   開關：測試與開發時 localhost 可用 window.__NW_LVGATE__ = true／false 強制；關掉＝跟沒有等級限制時一模一樣。
   購買改名卡、委託板刷新不綁等級（老師 2026-11-27 決定），只看商店有沒有開與老師的階段。 */
export const LV_GATE = true;
export const lvGateOn = () => (typeof location !== 'undefined' && location.hostname === 'localhost' && typeof window !== 'undefined' && typeof window.__NW_LVGATE__ === 'boolean') ? window.__NW_LVGATE__ : LV_GATE;
/* nw.unl[id]：1＝解開了還沒慶祝、2＝慶祝過。一旦解開永不收回，所以等級被改回去、存檔被蓋都不會鎖回去 */
export const lvOk = (nw, id, lv) => !lvGateOn() || !lv || (nw.hr || 1) >= lv || !!(nw.unl && nw.unl[id]);
export const buildingOpen = (nw, b) => !!b.act && (!b.wip || stageOpen(b.wip)) && lvOk(nw, b.id, b.lv);
/* 🔒（等級不夠）跟「施工中」（段沒開）是兩回事：前者正常顏色加鎖頭，後者灰色斜紋 */
export const buildingLocked = (nw, b) => !!b.act && (!b.wip || stageOpen(b.wip)) && !lvOk(nw, b.id, b.lv);
export const lvBuildings = () => VILLAGE.buildings.filter(b => b.lv);
export const expTotal = (hr, exp = 0) => { let t = exp; for (let l = 1; l < hr; l++) t += hrNeed(l); return t; };
/* 等級夠了、段有開、還沒記下來的建築記成「解開了還沒慶祝」，回傳這次新解開的清單。純函式只動 nw.unl */
export function syncUnlocks(nw) {
  const got = [];
  if (!lvGateOn()) return got;
  if (!nw.unl || typeof nw.unl !== 'object') nw.unl = {};
  for (const b of lvBuildings()) {
    if (!b.act || (b.wip && !stageOpen(b.wip)) || nw.unl[b.id] || (nw.hr || 1) < b.lv) continue;
    nw.unl[b.id] = 1; got.push(b.id);
  }
  return got;
}
/* 老師的信 `unl`：不用等級，直接解開。id＝建築 id 或 '*'（段有開的全部）；只動「段有開、有 act」的，施工中的不會因此打開 */
export function grantUnlock(nw, id) {
  const got = [];
  if (!nw.unl || typeof nw.unl !== 'object') nw.unl = {};
  for (const b of lvBuildings()) {
    if (!b.act || (b.wip && !stageOpen(b.wip)) || (id !== '*' && id !== b.id) || nw.unl[b.id]) continue;
    nw.unl[b.id] = 1; got.push(b.id);
  }
  return got;
}
/* 還沒解開、最近的一棟（村莊等級條下面的「下一個」） */
export function nextLock(nw) {
  const l = lvBuildings().filter(b => buildingLocked(nw, b)).sort((a, b) => a.lv - b.lv)[0];
  return l ? { b: l, need: Math.max(0, expTotal(l.lv) - expTotal(nw.hr || 1, nw.hrExp || 0)) } : null;
}
/* 教師頁學生卡：這個學生現在打得開的建築名稱（跟學生端同一個判斷） */
export const unlockedNames = nw => lvBuildings().filter(b => b.act && (!b.wip || stageOpen(b.wip)) && lvOk(nw, b.id, b.lv)).map(b => b.name);

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
    { id: 'rooms', kind: 'rooms', x: 5, y: 2, name: '組隊酒館', wip: '3a', lv: 8, uq: '2-1u', text: '開房間或加入同學的房間，最多 4 個人一起打大魔物。' },
    { id: 'star', kind: 'star', x: 15, y: 2, name: '星圖台', wip: '5', lv: 12, uq: '3-0u', text: '升級拿到的星星，可以在這裡點亮，讓閃避和防禦變得更強。' },
    { id: 'rank', kind: 'rank', x: 25, y: 2, name: '榮譽碑', act: 'rank', wip: '2a', lv: 7, uq: '2-0u', text: '看看誰是最強獵人。' },
    { id: 'academy', kind: 'academy', x: 3, y: 12, name: '教學大樓', act: 'academy', text: '閃避、防禦、攻擊的教學都在這裡，跟著做一遍就會了！' },
    { id: 'board', kind: 'board', x: 11, y: 13, name: '委託板', act: 'map', text: '選地方、選魔物，出發狩獵！' },
    { id: 'notice', kind: 'notice', x: 17, y: 13, name: '佈告欄', act: 'notice', text: '活動、老師的公告、抓蟲榜，都貼在這裡。' },
    { id: 'shop', kind: 'shop', x: 24, y: 9, name: '商店', wip: '3s', act: 'shop', lv: 4, uq: '1-2u', text: '用字元買材料和改名卡。' },
    { id: 'armor', kind: 'armor', x: 28, y: 10, name: '防具店', wip: '3b', lv: 10, uq: '2-3u', text: '頭盔、鎧甲、手套、靴子，穿上就會出現在你身上！' },
    { id: 'forge', kind: 'forge', x: 24, y: 15, name: '鐵匠鋪', act: 'forge', wip: '2b', lv: 3, uq: '1-1u', text: '用打到的材料，打造、強化自己的武器和裝備！' },
    { id: 'storage', kind: 'storage', x: 28, y: 16, name: '倉庫', act: 'storage', wip: '2b', lv: 2, text: '所有材料和圖紙都放在這裡，一目了然。' }
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
    { id: 'smith', name: '鐵匠', x: 21, y: 11, openFor: 'forge', look: { style: 'spiky', hair: '#5a3a22', armor: '#6a4a3a', trim: '#b8b8b8' }, say: ['鐵匠鋪還在蓋，快好了！打到的材料先幫你存著。', '東邊過了小橋就是市集。'],
      /* 鐵匠鋪開張（2b）以後換這組 */ sayOpen: ['材料夠了，鐵匠鋪的圖紙會發亮！', '強化一定會成功，放心！', '帽子、衣服這些，對會攻擊你的魔物才有用喔。'] }
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

/* V2：一天最多開 1 個新星級（§2.6）。「新星級」＝比這個區域最高紀錄更高的那一星；已經打贏過的星級隨時可以重打。
   d＝今天（twDay）。今天已經開過了，新的那一星就寫「明天再來」 */
export const newStarLocked = (nw, rk, star, d, on = v2On()) => !!on && d != null && star > (nw.zone[rk] || 0) && !!nw.day && nw.day.d === d && (nw.day.st || 0) >= NW_V2.starsPerDay;
export function boardQuests(nw, today, on = v2On()) {
  const out = [];
  Object.entries(REGIONS).forEach(([rk, r]) => {
    if (r.wip) return;
    if (!zoneOpen(nw, rk)) { out.push({ id: 'lock:' + rk, locked: true, rk }); return; }
    r.mons.forEach(mk => {
      const top = Math.min(5, (nw.zone[rk] || 0) + 1);
      for (let star = 1; star <= top; star++) out.push({ id: `${rk}:${mk}:${star}`, rk, mk, star, lv: regionLv(rk, star), done: (nw.zone[rk] || 0) >= star && (nw.dex[mk] || 0) > 0, wait: newStarLocked(nw, rk, star, today, on) });
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

/* 最快討伐的「合理下限」（秒）：最快手速（70 字/分、全對、練熟）穿最強裝備（藍色炎牙刀 +5 ×1.32 加綠全身 +5）在 ★1 的最快秒數 ×0.8（2b-1，tools/nw-sim/gear.mjs G7；沒穿裝備算出來是 13／12／13／17，取較小的，才不會把穿裝備的人誤標 ⚠），
   星級越高魔物越硬，所以每個星級都能用。比這還快的分數，教師頁標 ⚠（SPEC §4.2b）。
   進步獎超過 IMPROVE_SANE_MAX（%）也標 ⚠。 */
export const FASTEST_FLOOR = { coo: 9, frog: 12, shroom: 12, wolf: 14 };
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
  { id: '2026-11-25', date: '11 月 25 日', title: '鐵匠鋪和商店開張', items: [
    '⚒ 市集的「鐵匠鋪」開了。用打到的材料，做武器和裝備。',
    '🛒 「商店」也開了。用字元買材料和改名卡，每天買的數量有限。',
    '📜 打贏的委託單會蓋「完成」章。除了挑戰單，其他都蓋滿，就送來新的一批。',
    '🔄 不想打的單子，可以按「🔄 刷新」換新的。每天第 1 次免費。',
    '🌟 每天最多開 2 個新的 ★，前 4 場拿的材料最多。'
  ] },
  { id: '2026-11-23-2', date: '11 月 23 日', title: '回報字元照大小給', items: [
    '🪙 回報被老師確認，字元照問題大小給：小問題 15、中問題 30、大問題 45。前 5 個有字元。',
    '✉ 老師回信時，會寫出你回報的內容，你就知道老師在說哪一個。',
    '📓 「測試員手冊」的「我的回報」，看得到你自己寫了什麼。'
  ] },
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

/* ── 委託板「一次 4 張、打完才補」（docs/SPEC-BOARD-ROTATION.md）──
   純函式在 nw-board-rot.js。這裡放常數、旗標與存檔整理（normalizeNw 要用，放在那邊會循環引用）。
   旗標關掉＝完全是現在的畫面（全部列出），存檔裡的 board 欄位留著也無害。老師點頭後才改 true；
   測試在 localhost 用 window.__BOARD_ROT__ = true／false 強制。不跟 OPEN_STAGES 綁（第 1 段已經開了）。 */
export const BOARD_ROT = true;
export const boardRotOn = () => (typeof location !== 'undefined' && location.hostname === 'localhost' && typeof window !== 'undefined' && typeof window.__BOARD_ROT__ === 'boolean') ? window.__BOARD_ROT__ : BOARD_ROT;
export const BOARD = {
  keys: ['a', 'b', 'c', 'd', 'e'],      // a 目標／剛好、b 挑戰、c 剛好、d 輕鬆、e 第二個目標（平常空著）
  hardP: 0.55,                          // 挑戰單：預估勝率至少這麼多（沒有一隻達到就放那一星最好打的）
  midP: 0.80,                           // 剛好單：預估勝率至少這麼多
  phi0: 1.3,                            // 沒有任何打贏紀錄時，假設比中位慢 30%（保守）
  best2typ: 1.15,                       // 「最快」比平常快約 15%（校準報告 §2.4）
  sig: 0.25,                            // 預估的不確定（場與場 0.2 加上估計誤差）
  loseSoft: 2,                          // 挑戰單連續 2 次沒贏 → 換成那一星最好打的
  recentN: 3,                           // 記最近幾張打贏的單子（避免馬上又出現）
  easyAge: 4,                           // 輕鬆單最多比你打過的最高星低 4 星（草原 ★1 不會在森林 ★3 時還掛著）
  /* 刷新（docs/SPEC-SHOP-BOARD2.md B1）：第 1 次免費，之後每次收字元；一天最多 swapCost.length 次，擋「一直換到出現想要的」。要調價改這兩個數字 */
  swapCost: [0, 40, 80],
  outN: 8                               // 今天刷新換掉的單子最多記幾張（當天不會又出現）
};
const BOARD_ID_RE = /^[a-z]+:[a-z]+:[1-5]$/;
/* 格式不對就丟掉（下次打開看板重排）；五個鍵一定都在：存檔是 merge 寫入，本機刪掉的鍵雲端刪不掉；重複的第二張清空 */
export function normalizeBoard(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d) || d.v !== 1) return null;
  const int = x => (Number.isFinite(+x) ? Math.max(0, Math.floor(+x)) : 0);
  const empty = () => ({ id: '', k: '', at: 0, m: 0 });
  /* 舊存檔的 out 是字串（只換一張的年代）、沒有 swapN：今天換過＝已經用掉 1 次 */
  const out = BOARD_ID_RE.test(d.out) ? [d.out] : Array.isArray(d.out) ? d.out.filter((x, i, a) => BOARD_ID_RE.test(x) && a.indexOf(x) === i).slice(0, BOARD.outN) : [];
  const o = { v: 1, seed: int(d.seed) >>> 0, day: int(d.day), n: int(d.n), done: int(d.done), swap: int(d.swap),
    swapN: 'swapN' in d ? Math.min(BOARD.swapCost.length, int(d.swapN)) : (int(d.swap) > 0 && int(d.swap) === int(d.day) ? 1 : 0), swapCoin: int(d.swapCoin),
    lose: Math.min(9, int(d.lose)),
    last: BOARD_ID_RE.test(d.last) ? d.last : '', recent: Array.isArray(d.recent) ? d.recent.filter(x => BOARD_ID_RE.test(x)).slice(0, BOARD.recentN) : [],
    out, slots: {} };
  const seen = [];
  BOARD.keys.forEach(k => {
    /* 舊版「蓋完成章」的單子（ok＝1）現在視為已經打贏撤下，不留在板上 */
    const s = d.slots && d.slots[k], id = s && !int(s.ok) && BOARD_ID_RE.test(s.id) && !seen.includes(s.id) ? s.id : '';
    if (id) seen.push(id);
    o.slots[k] = id ? { id, k: typeof s.k === 'string' ? s.k.slice(0, 8) : '', at: int(s.at), m: Math.min(99, int(s.m)) } : empty();
  });
  return o;
}
