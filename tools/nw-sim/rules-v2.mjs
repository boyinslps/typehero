/* 平衡 V2.2 的規則常數（docs/SPEC-BALANCE-V2.md 最前面的參數表、§1.3、§2、§3、§6.2）。
   等遊戲端在 nw-data.js 加了 NW_V2／FLOWS／ATTACK_FROM／ATTACK_DMG 以後，這裡改讀它們（有就讀、沒有用下面的後備值）：
   後備值與規格 §6.2 寫的同名同值，所以 nw-data.js 還沒改的時候模擬器照樣能跑，而且結果一樣。
   `import * as` 讀不到的名字只是 undefined，不會丟錯。nw-data.js 的欄位名跟這裡不同時，只有名字對得上的欄位會蓋掉後備值，
   其餘照後備值（`RULE_SOURCE` 會寫出每一組是從哪裡來的，跑報告時看一眼）。 */
import * as ND from '../../nw-data.js';

const FALLBACK = {
  /* 規格 §6.2：`NW_V2 = { k: 0.5, cap: 480, laneW: 3.0, dayFull: 4, failBase: 0.3, workEvery: 600, workMax: 2, bonusMat: 1, afkWin: 40, flowCap: 1 }` */
  /* v2.2（規格最前面的參數表）：k 0.5→0.4、cap 480→600；其餘同 v2.1。ver＝規格版本：nw-data.js 的 NW_V2.ver 還沒到 2.2 時，整組用這裡的值（不混用） */
  NW_V2: { ver: 2.2, k: 0.4, cap: 600, laneW: 3.0, dayFull: 4, failBase: 0.3, workEvery: 600, workMax: 2, bonusMat: 1, afkWin: 40, flowCap: 1, escFlow: 0.5, dayHalf: 0.5 },
  /* 守護、藤蔓（§3.1、§3.2）。rho＝魔物最大血量的百分比（再乘攻擊力倍率 g）；typeMul＝打字傷害折扣；shield＝舉盾多幾秒；
     藤蔓 n＝最多幾根、every＝每根每幾秒扣一次 rho */
  FLOWS: { guard: { rho: 0.05, typeMul: 0.85, shield: 0.5 }, vine: { rho: 0.005, n: 4, every: 10, typeMul: 0.85 } },
  ATTACK_FROM: { shroom: 2 },
  ATTACK_DMG: { wolf: 0.5 },   // v2.2：0.7→0.5（逐場 p50 狼★5 倒下 1.36→1.00）
  /* V2 攻擊表（§1.3）：泡泡蛙加單線（舌頭彈）、跳跳菇 ★2 起單線＋重壓、炎牙狼全開 */
  ATTACKS_OPEN: { coo: ['single', 'pair'], frog: ['slam', 'single'], shroom: ['single', 'slam'], wolf: ['single', 'pair', 'sweep', 'fake', 'slam'] }
};
/* 只收數字欄位：遊戲端的 NW_V2 有 getter（on＝v2On()），在 node 裡展開會去碰 window／stageOpen */
const numbersOf = o => Object.fromEntries(Object.keys(o).filter(k => typeof Object.getOwnPropertyDescriptor(o, k).value === 'number').map(k => [k, o[k]]));
/* nw-data.js 還是 v2.1（沒有 NW_V2.ver 或 < 2.2）時，NW_V2 與 ATTACK_DMG 用這裡的 v2.2 值 */
const GAME22 = !!(ND.NW_V2 && typeof ND.NW_V2.ver === 'number' && ND.NW_V2.ver >= 2.2);
const pick = (name, merge) => {
  const got = (name === 'NW_V2' || name === 'ATTACK_DMG') && !GAME22 ? null : ND[name];
  if (got == null || typeof got !== 'object') return { v: structuredClone(FALLBACK[name]), src: '後備值' };
  return { v: merge ? { ...structuredClone(FALLBACK[name]), ...numbersOf(got) } : structuredClone(got), src: 'nw-data.js' };
};
const flowsGot = ND.FLOWS && typeof ND.FLOWS === 'object' ? ND.FLOWS : null;
export const NW_V2 = pick('NW_V2', true).v;
export const FLOWS = flowsGot
  ? { guard: { ...FALLBACK.FLOWS.guard, ...(flowsGot.guard || {}) }, vine: { ...FALLBACK.FLOWS.vine, ...(flowsGot.vine || {}) } }
  : structuredClone(FALLBACK.FLOWS);
export const ATTACK_FROM = pick('ATTACK_FROM').v;
export const ATTACK_DMG = pick('ATTACK_DMG').v;
/* ATTACKS_OPEN 是「現在上線的那張」，不是 V2 表；V2 表遊戲端叫 ATTACKS_V2，有就讀它 */
export const ATTACKS_V2 = ND.ATTACKS_V2 && typeof ND.ATTACKS_V2 === 'object' ? structuredClone(ND.ATTACKS_V2) : structuredClone(FALLBACK.ATTACKS_OPEN);
/* 試算用：NW_V2_SET="k=0.4,cap=600,guard.rho=0.06,vine.n=6,wolf=0.5,downMax=4" 在這個行程裡改上面的值（不改檔案；沒設＝不動）。
   guard.／vine. 開頭改 FLOWS；wolf／coo／frog／shroom 改 ATTACK_DMG；downMax 改 nw-data.js 的 BAL.downMax（倒下幾次算輸） */
const SET = ((typeof process !== 'undefined' && process.env && process.env.NW_V2_SET) || '').split(',').filter(Boolean);
/* 標準時間（⚡）v2.2 改用逐場的秒數（curves.mjs v2mc 算的，k 0.4、狼 0.5）。nw-data.js 還是 v2.1 時，在這個行程裡蓋掉它的 STD_SECS，
   讓 bal2b-term 的 ⚡ 照 v2.2 算 */
export const STD_SECS_V22 = { 'grass:coo': [129, 148, 171, 170, 203], 'grass:frog': [147, 171, 196, 203, 245], 'grass:shroom': [139, 168, 197, 205, 244],
  'forest:shroom': [218, 234, 242, 260, 299], 'forest:coo': [178, 205, 214, 238, 267], 'forest:wolf': [231, 250, 271, 275, 320] };
if (!GAME22 && ND.STD_SECS && typeof ND.STD_SECS === 'object') Object.assign(ND.STD_SECS, structuredClone(STD_SECS_V22));
for (const t of SET) {
  const [k, v] = t.split('='), n = +v;
  if (k.startsWith('guard.') || k.startsWith('vine.')) { const [f, x] = k.split('.'); FLOWS[f][x] = n; }
  else if (['wolf', 'coo', 'frog', 'shroom'].includes(k)) ATTACK_DMG[k] = n;
  else if (k === 'downMax') ND.BAL.downMax = n;
  else NW_V2[k] = n;
}
export const RULE_SOURCE = {
  NW_V2: GAME22 ? pick('NW_V2').src : '規格 v2.2 後備值（nw-data.js 還是 v2.1）', FLOWS: flowsGot ? 'nw-data.js' : '後備值', ATTACK_FROM: pick('ATTACK_FROM').src, ATTACK_DMG: pick('ATTACK_DMG').src,
  ATTACKS_V2: ND.ATTACKS_V2 ? 'nw-data.js' : '後備值'
};

/* 逐場模擬（sim.mjs）的規則包：A.rules。每一項都可以單獨開關，沒給＝舊行為。
     tierless  拿掉層級：血量 (440+20Lv)·hpMul·k、預警一律 laneW、出招節奏用 B
     cap       逃走秒數（到了＝'escape'，不是輸）；沒給＝照 BAL.timeLimit、結果 'retreat'
     attacks／attackFrom／atkMul  V2 攻擊表、跳跳菇 ★2 起、狼 ×0.7（乘在 atk.mul 上，在 monDmg 的最低 4 點之前）
     elem／gCap  屬性 ×1.05／×0.95、武器×屬性封頂 1.37
     armorCeil／slam15  盔甲無條件進位、重壓沒擋住只扣一次 ×1.5（跟 nw-data.js 的 strikeDamage 一樣）
     flow      'none' | 'guard' | 'vine'
     afk       防掛機 §3.4：{ win, cap, escFlow }（逃走／輸時流派傷害算幾成）；沒給＝流派一直有效、不封頂
     failBase  輸／逃走的獎勵 ×(failBase×a ＋ (1−failBase)×f)
   用法：{ ...DEFAULT_ASSUME, rules: v2Rules({ flow: 'guard' }) } */
export function v2Rules(o = {}) {
  const V = { ...NW_V2, ...(o.v2 || {}) };
  const flow = o.flow || 'none';
  return {
    tierless: true, k: V.k, laneW: V.laneW, cap: V.cap,
    attacks: ATTACKS_V2, attackFrom: { ...ATTACK_FROM }, atkMul: { ...ATTACK_DMG },
    elem: { up: 1.05, down: 0.95 }, gCap: 1.37,
    armorCeil: true, slam15: true,
    flow, flowDef: flow === 'none' ? null : { ...FLOWS[flow] },
    afk: o.afk === false ? null : { win: V.afkWin, cap: V.flowCap, escFlow: V.escFlow != null ? V.escFlow : 0.5 },
    failBase: V.failBase,
    ...(o.over || {})
  };
}
