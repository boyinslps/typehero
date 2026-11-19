/* 打字勇者・平衡曲線與解析戰鬥模型（docs/BALANCE-CURVES.md 的計算來源）。
   只算期望值與機率（不跑逐幀模擬），所以幾秒內跑完；用來先定曲線，再交給 sim 驗證。

   用法：
     node tools/nw-sim/curves.mjs                    全部章節
     node tools/nw-sim/curves.mjs hp combat          只印某幾節（params hp weapon gear combat flip exp econ drops unlock timeline sens checks stats）
     node tools/nw-sim/curves.mjs --set acc=0.95 --set sigmaB=0.25   改假設（任何 P 的欄位；巢狀用點：persona.slow=5）
     node tools/nw-sim/curves.mjs --real data-private/profiles.json  換真實分布（load-real.mjs 的輸出）：
                                                     母體改用名單本身，慢／中／快改成名單的 p25／p50／p90，σ 由四分位重擬
     node tools/nw-sim/curves.mjs --json             輸出 JSON（給試算表或其他腳本）

   數字的來源：魔物、傷害、等級、價格公式直接 import nw-data.js（現行程式），所以程式改了這裡跟著變；
   P 裡的是模型假設（速度分布、反應時間、題長…），每一項在 BALANCE-CURVES.md §1 寫了出處或「設計決定」。
   已知近似：每個字獨立打錯、燃燒／中毒／寒冰不算、連擊不算開場爬升、材料只分顏色不分魔物。 */
import { BAL, TIERS, MONSTERS, REGIONS, regionLv, monMaxHp, monDmg, atkInterval, castTime, HP_TIER,
  ATTACKS_OPEN, MAX_CHARS, hrNeed, huntExp, huntCoins, HR_MAX } from '../../nw-data.js';
import { readFileSync } from 'node:fs';

/* ───────── 假設（全部可用 --set 改） ───────── */
export const P = {
  // 速度分布：每分鐘正確字數（舊世界 bestWpm），對數常態。BALANCE.md §0 實測 p25=6、中位 10、p75=14
  median: 10, sigma: 0.65,
  persona: { slow: 6, mid: 10, fast: 19 },          // p25／p50／p90
  acc: { slow: 0.95, mid: 0.97, fast: 0.98 },       // 逐字正確率（假設；實測場次正確率中位 100%，逐字會低一點）
  veryFast: 45,                                      // 實測最高，用在 G1
  tutRatio: 0.75,                                    // 教學量到的速度 ≈ bestWpm × 0.75（BALANCE.md §7.3）
  tierCut: [6, 14, 28],                              // 層級門檻（教學 wpm）：<6 A、<14 B、<28 C、其他 D
  alpha: 0.6375,                                     // 戰鬥中打字速度 = bestWpm × 0.75（平均/最好）× 0.85（雙工）＝sim.mjs 的 avgOfBest×dual
  tau0: 0.5,                                         // 每題固定耗時（送出、看下一題），秒
  sigmaB: 0.20,                                      // 同一個人「今天手感」的場與場差異（ln 標準差）
  timeLimit: BAL.timeLimit,
  // 武器
  weapon: 'mean',                                    // staff / bow / dagger / crossbow / mean（四把平均）
  chantLen: 5, punctSlow: 0.7,                       // 詠唱字數、打標點的速度折扣
  volleyAt: 12, volleyTime: 1.0,                     // 連弩攢幾支箭射一次、射一次花幾秒
  // 三線戰鬥
  exp: 0.5,                                          // 熟練度 0（新手）～1（練熟）
  react: [1.0, 0.7], reactSd: 0.35, keyLag: 0.15,    // 紅線出現後的反應（SPEC-STAGE2 §3.4 的假設）
  pick: [0.8, 0.95],                                 // 夾擊選對安全線
  hold: [0.5, 0.9],                                  // 太早舉盾時會再按一次
  actCost: 0.3,                                      // 換線／舉盾打斷打字
  laneW: { A: 3.0, B: 2.5, C: 2.2, D: 2.0 },        // nw-battle.js 的 LANE_W（沒 export，照抄）
  wolfAttacks: false,                                // true＝「狼也攻擊」（G8）
  dmgMul: 1,                                         // 魔物招式傷害整體倍率（ttd 一節反推用）
  winShrink: 0,                                      // 每升一星，紅線預警時間縮短的比例（提案用；現行 0）
  hpTier: null,                                      // 換層級血量倍率試算，例 --set hpTier.A=0.25（null＝用 nw-data.js 的 HP_TIER）
  // 一學期
  lessons: 14, games: 2, growth: 0.15,               // 節數、每節場數、學期內速度成長（+15%，假設）
  startCoins: 600, startGray: 0,                     // 教學大樓三堂課 600 字元；新學期材料歸零（保守）
  winPick: 0.55,                                     // 學生挑「勝率 ≥ 這個」的最高星級
  unlockNeed: 1,                                     // 某星要贏過幾種不同魔物才開下一星（現行 1）
  grayCap: 1,                                        // 灰色裝備最多強化到幾（之後存錢做綠的；學生策略假設）
  N: 200, seed: 2026
};

/* ───────── 數學小工具 ───────── */
const erf = x => { const s = Math.sign(x); x = Math.abs(x); const t = 1 / (1 + 0.3275911 * x);
  return s * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x)); };
export const Phi = z => 0.5 * (1 + erf(z / Math.SQRT2));
export function Pinv(p) {   // Acklam
  const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
  const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
  const c = [-0.00778489400243029, -0.322396458041136, -2.40076064592227, -2.54973253934373, 4.37466414146497, 2.93816398269878];
  const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
  const q0 = Math.min(p, 1 - p);
  if (q0 < 0.02425) { const q = Math.sqrt(-2 * Math.log(q0)); const x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); return p < 0.5 ? x : -x; }
  const q = p - 0.5, r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}
const binom = (n, k, p) => { let c = 1; for (let i = 0; i < k; i++) c = c * (n - i) / (i + 1); return c * p ** k * (1 - p) ** (n - k); };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
export function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const r1 = x => Math.round(x * 10) / 10, r2 = x => Math.round(x * 100) / 100, pc = x => Math.round(x * 100);

/* ───────── 1. 玩家模型 ───────── */
export const tierOf = (v, p = P) => { const t = v * p.tutRatio, [a, b, c] = p.tierCut; return t < a ? 'A' : t < b ? 'B' : t < c ? 'C' : 'D'; };
export const quantile = (q, p = P) => p.median * Math.exp(p.sigma * Pinv(q));
/* 母體：對數常態的 400 個等機率點，或真實名單 */
export const population = (p = P) => p.real ? p.real.map(r => ({ v: r.wpm, acc: clamp((r.acc > 1 ? r.acc / 100 : r.acc) - 0.02, 0.85, 0.995) }))
  : Array.from({ length: 400 }, (_, i) => { const v = quantile((i + 0.5) / 400, p); return { v, acc: v < p.persona.mid ? p.acc.slow : v < p.persona.fast ? p.acc.mid : p.acc.fast }; });

/* 題長：現行詞庫（assets/banks）的平均字數。normal、fine 平均 2.0 字，epic 3.75，legend ≤6 字 5.32、≤8 字 6.19 */
const POOL_LEN = [{ 4: 2, 6: 2, 8: 2 }, { 4: 2, 6: 2, 8: 2 }, { 4: 3.75, 6: 3.75, 8: 3.75 }, { 4: null, 6: 5.32, 8: 6.19 }];
export function wordLen(lv, star, angry) {
  const mc = MAX_CHARS(star);
  for (let i = Math.min(3, (lv < 10 ? 0 : lv < 20 ? 1 : 2) + (angry ? 1 : 0)); i >= 0; i--) if (POOL_LEN[i][mc]) return POOL_LEN[i][mc];
  return 2;
}

/* 一題的期望：完美機率、送出後算傷害的正確字（打錯 ≥ 一半＝0 傷害＋被反擊）、亂打機率 */
export function qStats(L, a) {
  const lo = Math.floor(L), hi = Math.ceil(L), f = L - lo;
  const one = n => { let dmg = 0, wrongQ = 0; for (let w = 0; w <= n; w++) { const pw = binom(n, w, 1 - a); if (w >= n * BAL.wrongRatio && n > 0) wrongQ += pw; else dmg += pw * (n - w); } return { perfect: a ** n, dmg, wrongQ }; };
  const A = one(lo), B = hi === lo ? A : one(hi);
  return { perfect: lerp(A.perfect, B.perfect, f), dmg: lerp(A.dmg, B.dmg, f), wrongQ: lerp(A.wrongQ, B.wrongQ, f), L };
}
/* 連擊：完美題的倍率 1+0.02·min(20,連續數)；穩態下連續數是幾何分布 */
export function comboMul(L, a) {
  const q = qStats(L, a), p = q.perfect;
  const kPerf = 1 + 0.02 * (p >= 1 ? 20 : (1 - p ** 20) / (1 - p));
  const perfDmg = p * Math.round(L);   // 完美題的字都對
  return (perfDmg * kPerf + (q.dmg - perfDmg)) / Math.max(1e-9, q.dmg);
}
/* 武器種類係數 ω（相對「每題就是打字」），依 nw-battle.js submit() 的規則取期望 */
export function weaponOmega(w, L, a, c, star, p = P) {
  const tq = n => 60 * n / c + p.tau0;
  const base = qStats(L, a), dn = base.dmg, tn = tq(L);
  if (w === 'mean') return ['staff', 'bow', 'dagger', 'crossbow'].reduce((s, k) => s + weaponOmega(k, L, a, c, star, p), 0) / 4;
  if (w === 'staff') { const ch = qStats(p.chantLen, a), dc = ch.perfect * p.chantLen * BAL.chantMul + (ch.dmg - ch.perfect * p.chantLen); const tc = 60 * p.chantLen / (c * p.punctSlow) + p.tau0;
    return ((4 * dn + dc) / (4 * tn + tc)) / (dn / tn); }
  if (w === 'bow') { const nf = Math.ceil(100 / (BAL.gaugePer * a)); return (0.85 + 0.3 * a) * (nf + BAL.sharpShots * BAL.sharpMul) / (nf + BAL.sharpShots); }
  if (w === 'dagger') { const Lf = Math.min(3 * L, Math.max(6, MAX_CHARS(star) + 2)), qf = qStats(Lf, a), tf = tq(Lf);
    const f = clamp(BAL.flurryMin + (Lf / tf) * BAL.flurrySlope, BAL.flurryMin, BAL.flurryMax);
    return ((4 * 0.95 * dn + 0.95 * f * qf.dmg) / (4 * tn + tf)) / (dn / tn); }
  if (w === 'crossbow') { const per = BAL.arrowMul + BAL.arrowDmg * (1 + BAL.arrowBonusPer * p.volleyAt) / BAL.perChar;
    return per * tn / (tn + p.volleyTime * dn / p.volleyAt); }
  return 1;
}

/* ───────── 2. 戰鬥模型（解析） ───────── */
/* 一場的設定 → 期望時間、倒下、失敗機率。gear：{ atk, elem, hp, cut, shield, warn } */
export const NOGEAR = { atk: 100, elem: null, hp: 0, cut: 0, shield: 0, warn: 0 };
const elemMul = (g, mk) => !g.elem ? 1 : MONSTERS[mk].fear === g.elem ? 1.1 : MONSTERS[mk].resist === g.elem ? 0.9 : 1;
export const gMul = (g, mk) => g.atk / 100 * elemMul(g, mk);

function openPatterns(mk, star, p) {
  const en = (p.wolfAttacks && mk === 'wolf') ? ['single', 'pair', 'sweep', 'fake', 'slam'] : (ATTACKS_OPEN[mk] || []);
  const dodge = ['single', 'pair', ...(star >= 3 ? ['sweep'] : []), ...(star >= 5 ? ['fake'] : [])].filter(k => en.includes(k));
  return { en, dodge };
}
/* 一次攻擊被打中的機率與傷害倍率（三線規則見 nw-battle.js buildStrikes／resolveStrike） */
export function strikeModel(kind, tier, gear, p = P, star = 1) {
  const mu = lerp(p.react[0], p.react[1], p.exp), sd = p.reactSd, pick = lerp(p.pick[0], p.pick[1], p.exp), hold = lerp(p.hold[0], p.hold[1], p.exp);
  const shrink = 1 - p.winShrink * (star - 1), W = p.laneW[tier] * shrink + gear.warn;
  const inTime = win => Phi((win - p.keyLag - mu) / sd);
  if (kind === 'slam') { const Ws = p.laneW[tier] * shrink * 1.1 + gear.warn, dur = 1.5 + gear.shield;
    const ok = inTime(Ws); const late = Phi((Ws - dur - mu) / sd);  // 太早按、盾在出手前就沒了
    const okP = ok - late + late * hold; return { threat: 1, ok: okP, hitP: 1 - okP, mul: 1, act: 1 }; }
  if (kind === 'single') { const ok = inTime(W); return { threat: 1 / 3, ok, hitP: (1 - ok) / 3, mul: 1, act: 1 / 3 }; }
  if (kind === 'pair') { const ok = inTime(W) * pick; return { threat: 2 / 3, ok, hitP: 2 / 3 * (1 - ok), mul: 1, act: 2 / 3 }; }
  if (kind === 'sweep') { const ok = inTime(W * 0.8) * pick; return { threat: 1, ok, hitP: 1 - ok, mul: 0.5 * 1.5, act: 1 }; }
  const ok = inTime(W * 0.5) * pick; return { threat: 2 / 3, ok, hitP: 2 / 3 * (1 - ok), mul: 1, act: 1 };   // fake
}

export function battle(v, a, rk, mk, star, gear = NOGEAR, p = P, tierOverride) {
  const lv = regionLv(rk, star), m = MONSTERS[mk], tier = tierOverride || tierOf(v, p);
  const c = Math.max(1, v * p.alpha), H = monMaxHp(mk, lv, tier) * (p.hpTier && p.hpTier[tier] ? p.hpTier[tier] / HP_TIER[tier] : 1), g = gMul(gear, mk);
  const phase = angry => { const L = wordLen(lv, star, angry), q = qStats(L, a), om = weaponOmega(p.weapon, L, a, c, star, p), k = comboMul(L, a);
    const tq = 60 * L / c + p.tau0; return { rate: BAL.perChar * q.dmg * om * k * g * (angry ? BAL.angryTaken : 1) / tq, wrongQ: q.wrongQ / tq, L, om }; };
  const calm = phase(false), angry = phase(true);
  const t1 = H * BAL.angryAt / calm.rate, t2 = H * (1 - BAL.angryAt) / angry.rate, Ttype = t1 + t2;
  // 攻擊
  const { en, dodge } = openPatterns(mk, star, p);
  const usable = m.attacks.filter(x => x.type === 'defend' ? en.includes('slam') : dodge.length > 0);
  let casts = 0, hitsE = 0, dmgHit = 0, act = 0, okSum = 0, okN = 0, kinds = {};
  const wrongN = calm.wrongQ * t1 + angry.wrongQ * t2;
  const hpMax = BAL.playerHp + gear.hp;
  let T = Ttype, downs = 0, pFail = 0, X = 0;
  if (usable.length) {
    const quick = m.spKey === 'quick', dur = castTime(lv, tier) * (quick ? 0.75 : 1);
    for (let it = 0; it < 4; it++) {
      const act0 = T - downs * BAL.downRest;           // 倒下的時候魔物不出招
      const ta1 = act0 * t1 / Ttype, ta2 = act0 - ta1;
      const I1 = atkInterval(lv, tier, false) * (quick ? BAL.quickMul : 1), I2 = atkInterval(lv, tier, m.spKey === 'rage') * (quick ? BAL.quickMul : 1);
      casts = Math.max(0, (Math.min(ta1, act0) - 6 - dur) / I1 + (ta1 > 6 + dur ? 1 : 0)) + Math.max(0, ta2 / I2);
      // 每次攻擊：隨機選招，dodge 招再隨機選樣式
      hitsE = 0; dmgHit = 0; act = 0; okSum = 0; okN = 0; kinds = {};
      for (const atk of usable) {
        const ks = atk.type === 'defend' ? ['slam'] : dodge;
        for (const k of ks) { const w = 1 / usable.length / ks.length, s = strikeModel(k, tier, gear, p, star);
          hitsE += w * s.hitP; dmgHit += w * s.hitP * Math.max(1, Math.round(monDmg(lv, atk.mul) * (k === 'sweep' ? 0.5 : 1))) * p.dmgMul * (1 - gear.cut) * (k === 'sweep' ? 1.5 : 1);
          act += w * s.act; okSum += w * s.ok; okN += w; kinds[k] = s.ok; }
      }
      const D = hitsE ? dmgHit / hitsE : 1, h = hitsE;
      // 被打中次數 ~ 二項（n 非整數就內插），加上亂打反擊（期望值）
      const lo = Math.floor(casts), f = casts - lo;
      const dist = n => { let e = 0, pf = 0, ex = 0, px = (1 - h) ** n; for (let x = 0; x <= n; x++) { if (x) px *= (n - x + 1) / x * h / (1 - h); const loss = x * D + wrongN * BAL.wrongHit, dn = Math.floor(loss / hpMax);
        e += px * Math.min(BAL.downMax, dn); if (dn >= BAL.downMax) pf += px; ex += px * x; } return [e, pf, ex]; };
      const A = dist(lo), B = dist(lo + 1);
      downs = lerp(A[0], B[0], f); pFail = lerp(A[1], B[1], f); X = lerp(A[2], B[2], f);
      T = Ttype + casts * act * p.actCost + downs * BAL.downRest;
    }
  } else { downs = Math.min(BAL.downMax, Math.floor(wrongN * BAL.wrongHit / hpMax)); T = Ttype + downs * BAL.downRest; }
  return { v, a, tier, lv, H, hpMax, lossFrac: usable.length ? (X * (hitsE ? dmgHit / hitsE : 0) + wrongN * BAL.wrongHit) / hpMax : wrongN * BAL.wrongHit / hpMax, g: r2(g), L: calm.L, omega: r2(calm.om), rate: calm.rate, Ttype, T, casts, hits: X, downs, pFail, dodgeOk: okN ? okSum / okN : null, kinds };
}
/* 門檻速度：T(v)=時限 的 v；勝率 = Φ((ln v − ln v_need)/σ_b) × (1 − P(倒下 3 次)) */
export function vNeed(a, rk, mk, star, gear = NOGEAR, p = P, tier) {
  let lo = 0.3, hi = 300;
  for (let i = 0; i < 30; i++) { const mid = Math.sqrt(lo * hi); if (battle(mid, a, rk, mk, star, gear, p, tier).T > p.timeLimit) lo = mid; else hi = mid; }
  return hi;
}
export function winP(v, a, rk, mk, star, gear = NOGEAR, p = P) {
  const tier = tierOf(v, p), vn = vNeed(a, rk, mk, star, gear, p, tier), b = battle(v, a, rk, mk, star, gear, p, tier);
  return { ...b, vNeed: vn, win: Phi(Math.log(v / vn) / p.sigmaB) * (1 - b.pFail) };
}
export const popWin = (rk, mk, star, gear = NOGEAR, p = P) => { const pop = population(p); return pop.reduce((s, x) => s + winP(x.v, x.acc, rk, mk, star, gear, p).win, 0) / pop.length; };

/* ───────── 3. 曲線 ───────── */
export const SLOT = {   // SPEC-STAGE2 §3.2
  weapon: { gray: 100, green: 105, blue: 110, per: 2 }, helm: { gray: 10, green: 20, blue: 30, per: 2 },
  armor: { gray: 0.04, green: 0.07, blue: 0.10, per: 0.01 }, gloves: { gray: 0.2, green: 0.3, blue: 0.4, per: 0.04 },
  boots: { gray: 0.10, green: 0.20, blue: 0.30, per: 0.03 }
};
export const CAP = { g: 1.32, cut: 0.30, hp: 60, shield: 1.0, warn: 0.6 };
export const COLOR_MUL = { gray: 1, green: 2, blue: 3 };
export const enhanceCost = (n, color = 'gray') => (2.5 * n * n + 7.5 * n + 10) * COLOR_MUL[color];
export const enhanceMats = n => [0, 1, 1, 2, 2, 3][n];
export const slotVal = (slot, c, n) => SLOT[slot][c] + SLOT[slot].per * n;
/* 疊加規則：攻擊＝武器（加法池）×屬性，總和封頂 CAP.g；受傷少 N% 加總，超過 30% 改 d/(1+d) */
export function gearStats(eq) {   // eq: { weapon:{c,n,elem}, helm:{c,n}, … }
  const s = { ...NOGEAR };
  if (eq.weapon) { s.atk = slotVal('weapon', eq.weapon.c, eq.weapon.n); s.elem = eq.weapon.elem || null; }
  if (eq.helm) s.hp = Math.min(CAP.hp, slotVal('helm', eq.helm.c, eq.helm.n));
  if (eq.armor) { const d = slotVal('armor', eq.armor.c, eq.armor.n); s.cut = d <= CAP.cut ? d : CAP.cut + (1 - CAP.cut) * ((d - CAP.cut) / (1 + d - CAP.cut)); }
  if (eq.gloves) s.shield = Math.min(CAP.shield, slotVal('gloves', eq.gloves.c, eq.gloves.n));
  if (eq.boots) s.warn = Math.min(CAP.warn, slotVal('boots', eq.boots.c, eq.boots.n));
  return s;
}
const set = (c, n, wc = c, wn = n, elem) => gearStats({ weapon: { c: wc, n: wn, elem }, helm: { c, n }, armor: { c, n }, gloves: { c, n }, boots: { c, n } });
export const PRESETS = {
  '無': NOGEAR, '灰全身+0': set('gray', 0), '灰全身+3': set('gray', 3), '綠全身+3': set('green', 3), '綠全身+5': set('green', 5),
  '綠武器+5': gearStats({ weapon: { c: 'green', n: 5 } }), '藍火刀+5＋綠+5': set('green', 5, 'blue', 5, 'fire')
};
export const power = eq => Object.values(eq).filter(Boolean).reduce((s, x) => s + ({ gray: 10, green: 20, blue: 30 }[x.c]) + 2 * x.n, 0);

/* 經驗：現行 hrNeed、huntExp；累計 cum(HR) */
export const cumExp = hr => { let s = 0; for (let h = 1; h < hr; h++) s += hrNeed(h); return s; };
/* 掉落：機率 p、保底 K（連 K 次沒掉，第 K+1 次必掉）→ 期望次數 */
export const pityE = (p, K) => { let e = 0; for (let k = 1; k <= K; k++) e += k * (1 - p) ** (k - 1) * p; return e + (K + 1) * (1 - p) ** K; };
/* 一隻魔物有 m 張圖紙、各 p、整隻共用保底 K：學完全部要贏幾場（DP 的期望值與 p95） */
export function bpWins(m, p, K, maxW = 200) {
  let st = new Map([[`0,0`, 1]]); const doneAt = [];
  for (let w = 1; w <= maxW; w++) {
    const nx = new Map(); let done = 0;
    for (const [key, pr] of st) { const [got, dry] = key.split(',').map(Number); if (got === m) { done += pr; nx.set(key, (nx.get(key) || 0) + pr); continue; }
      const left = m - got;
      if (dry >= K) { const k = `${got + 1},0`; nx.set(k, (nx.get(k) || 0) + pr); continue; }
      for (let j = 0; j <= left; j++) { const pj = binom(left, j, p) * pr, k = j ? `${got + j},0` : `${got},${dry + 1}`; nx.set(k, (nx.get(k) || 0) + pj); } }
    doneAt.push(done); st = nx;
  }
  // doneAt[w-1]＝贏完前 w-1 場就已學完的機率；P(N > w) = 1 − doneAt[w]
  let E = 0; for (let w = 0; w < maxW - 1; w++) E += 1 - (w === 0 ? 0 : doneAt[w]);
  const p95 = doneAt.findIndex(x => x >= 0.95); return { E, p95 };
}
export const n95 = p => Math.ceil(Math.log(0.05) / Math.log(1 - p));

/* ───────── 4. 一學期（蒙地卡羅，策略見 BALANCE-CURVES.md §4） ───────── */
const BP = { coo: [['helm', 'green'], ['gloves', 'green']], frog: [['boots', 'green'], ['armor', 'green']], shroom: [['helm', 'green']], wolf: [['weapon', 'blue'], ['armor', 'blue']] };
const DROPS = { coo: [3, 1.5, 0], frog: [3, 1.5, 0], shroom: [3, 1.5, 0], wolf: [0, 2.5, 1.5] };   // 灰、綠、藍每場平均（贏）
const RECIPE = { // [字元, 灰, 綠, 藍]
  weapon: { gray: [40, 4, 0, 0], green: [120, 0, 3, 0], blue: [250, 0, 3, 3] },
  helm: { gray: [30, 3, 0, 0], green: [120, 3, 3, 0] }, armor: { gray: [30, 4, 0, 0], green: [120, 4, 3, 0], blue: [250, 0, 4, 3] },
  gloves: { gray: [30, 3, 0, 0], green: [120, 4, 2, 0] }, boots: { gray: [30, 3, 0, 0], green: [120, 3, 3, 0] }
};
const CI = { gray: 0, green: 1, blue: 2 }, CK = ['gray', 'green', 'blue'];
export function semester(v0, a, p = P) {
  const R = rng(p.seed + Math.round(v0 * 100)), rows = Array.from({ length: p.lessons }, () => []);
  const targets = []; for (const rk of ['grass', 'forest']) for (const mk of REGIONS[rk].mons) for (let s = 1; s <= 5; s++) targets.push({ rk, mk, s, idx: (rk === 'grass' ? 0 : 5) + s });
  const cache = new Map();
  const vnC = new Map();   // 門檻速度只跟（目標、裝備、層級）有關，先快取；倒下機率再依速度算
  const wp = (v, t, eq) => { const st = gearStats(eq), vg = Math.exp(Math.round(Math.log(v) / 0.02) * 0.02), tier = tierOf(vg, p), gk = [t.rk, t.mk, t.s, tier, st.atk, st.elem, st.hp, st.cut, st.shield, st.warn].join('|');
    if (!vnC.has(gk)) vnC.set(gk, vNeed(a, t.rk, t.mk, t.s, st, p, tier));
    const key = gk + '|' + vg; if (!cache.has(key)) cache.set(key, Phi(Math.log(vg / vnC.get(gk)) / p.sigmaB) * (1 - battle(vg, a, t.rk, t.mk, t.s, st, p, tier).pFail)); return cache.get(key); };
  for (let i = 0; i < p.N; i++) {
    const S = { coins: p.startCoins, earned: 0, mat: [p.startGray, 0, 0], eq: { weapon: { c: 'gray', n: 0 } }, bp: new Set(['gray']), learned: new Set(), dry: {}, zone: { grass: 0, forest: 0 }, clr: {}, hr: 1, hrExp: 0, wins: 0, games: 0 };
    const vPers = v0 * Math.exp(0.1 * Pinv(Math.min(0.999, Math.max(0.001, R()))));   // 同組內小差異
    const canPay = r => S.coins >= r[0] && S.mat[0] >= r[1] && S.mat[1] >= r[2] && S.mat[2] >= r[3];
    const pay = r => { S.coins -= r[0]; S.mat[0] -= r[1]; S.mat[1] -= r[2]; S.mat[2] -= r[3]; };
    const shop = () => { for (let guard = 0; guard < 30; guard++) { let did = false;
      for (const slot of ['weapon', 'armor', 'helm', 'boots', 'gloves']) {      // 做／換更好的顏色（目前那件 ≤ +2 才換）
        const cur = S.eq[slot], best = CK.filter(c => RECIPE[slot][c] && (c === 'gray' || S.learned.has(slot + ':' + c) || (slot === 'weapon' && c === 'green'))).pop();
        const nv = SLOT[slot][best] * (slot === 'weapon' && best === 'blue' ? 1.1 : 1);   // 火刀：學生看的是打怕火魔物的傷害
        if (!best || (cur && (CI[cur.c] >= CI[best] || (cur.n > 2 && nv < slotVal(slot, cur.c, cur.n))))) continue;
        const r = RECIPE[slot][best]; if (canPay(r)) { pay(r); S.eq[slot] = { c: best, n: 0, elem: slot === 'weapon' && best === 'blue' ? 'fire' : null }; did = true; } }
      for (const [slot, top] of [['weapon', 5], ['armor', 3], ['helm', 3], ['boots', 3], ['gloves', 3], ['armor', 5], ['helm', 5], ['boots', 5], ['gloves', 5]]) {
        const it = S.eq[slot]; if (!it || it.n >= (it.c === 'gray' ? Math.min(top, p.grayCap) : top)) continue; const n = it.n + 1, cost = enhanceCost(n, it.c), mn = enhanceMats(n);
        const ci = CI[it.c], have = S.mat.slice(ci).reduce((x, y) => x + y, 0);
        if (S.coins >= cost && have >= mn) { S.coins -= cost; let need = mn; for (let k = ci; k < 3 && need; k++) { const u = Math.min(need, S.mat[k]); S.mat[k] -= u; need -= u; } it.n = n; did = true; break; } }
      if (!did) return; } };
    for (let l = 0; l < p.lessons; l++) {
      const v = vPers * (1 + p.growth * l / Math.max(1, p.lessons - 1));
      for (let gi = 0; gi < p.games; gi++) {
        shop();
        const open = targets.filter(t => (t.rk === 'grass' || S.zone.grass >= 5) && t.s <= S.zone[t.rk] + 1);
        let best = null, bw = -1, fb = null, fw = -1;
        const want = t => BP[t.mk].some(([s, c]) => !S.learned.has(s + ':' + c)) ? 1 : 0;   // 同一星優先打還有圖紙沒學的
        const fresh = t => (S.clr[t.rk + t.s] || new Set()).has(t.mk) ? 0 : 1;               // 再優先打還沒贏過這一星的魔物（解鎖要用）
        const key = (t, w) => (t.idx + 2.5 * want(t)) * 100 + fresh(t) * 10 + w;   // 為了圖紙，願意往回打 2 星
        for (const t of open) { const w = wp(v, t, S.eq); if (w >= p.winPick && (!best || key(t, w) > key(best, bw))) { best = t; bw = w; } if (w > fw) { fb = t; fw = w; } }
        const t = best || fb, w = best ? bw : fw, win = R() < w, lv = regionLv(t.rk, t.s);
        S.games++; if (win) S.wins++;
        const ex = huntExp(lv, win), co = huntCoins(lv, win); S.coins += co; S.earned += co;
        S.hrExp += ex; while (S.hr < HR_MAX && S.hrExp >= hrNeed(S.hr)) { S.hrExp -= hrNeed(S.hr); S.hr++; }
        DROPS[t.mk].forEach((m, k) => { if (m) S.mat[k] += win ? m : Math.max(1, Math.floor(m / 2)); });
        if (win) { const ck = t.rk + t.s; (S.clr[ck] = S.clr[ck] || new Set()).add(t.mk);
          if (t.s > S.zone[t.rk] && S.clr[ck].size >= Math.min(p.unlockNeed, REGIONS[t.rk].mons.length)) S.zone[t.rk] = t.s;
          const left = BP[t.mk].filter(([s, c]) => !S.learned.has(s + ':' + c));
          if (left.length) { let got = left.filter(() => R() < 0.3); if (!got.length && (S.dry[t.mk] || 0) >= 5) got = [left[0]];
            if (got.length) { got.forEach(([s, c]) => S.learned.add(s + ':' + c)); S.dry[t.mk] = 0; } else S.dry[t.mk] = (S.dry[t.mk] || 0) + 1; } }
      }
      shop();
      const st = gearStats(S.eq);
      const w5 = wp(v, { rk: 'forest', mk: 'wolf', s: 5 }, S.eq);
      rows[l].push({ w5, hr: S.hr, top: S.zone.forest ? 5 + S.zone.forest : S.zone.grass, coins: S.coins, earned: S.earned, atk: st.atk, elem: st.elem, pw: power(S.eq), wins: S.wins, games: S.games,
        gear: Object.entries(S.eq).map(([k, x]) => `${k}:${x.c}+${x.n}`).sort().join(' ') });
    }
  }
  const med = (arr, f) => { const s = arr.map(f).sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  const mode = arr => { const m = new Map(); arr.forEach(x => m.set(x, (m.get(x) || 0) + 1)); return [...m.entries()].sort((x, y) => y[1] - x[1])[0][0]; };
  return rows.map((r, l) => ({ lesson: l + 1, hr: med(r, x => x.hr), top: med(r, x => x.top), coins: med(r, x => x.coins), earned: med(r, x => x.earned), atk: med(r, x => x.atk), pw: med(r, x => x.pw),
    winRate: r.reduce((s, x) => s + x.wins, 0) / r.reduce((s, x) => s + x.games, 0), w5: r.reduce((s, x) => s + x.w5, 0) / r.length, fire: r.filter(x => x.elem).length / r.length, gear: mode(r.map(x => x.gear)) }));
}
const topName = t => t === 0 ? '—' : t <= 5 ? `草原★${t}` : `森林★${t - 5}`;
const gearShort = g => { const c = { gray: '灰', green: '綠', blue: '藍' }; const m = Object.fromEntries(g.split(' ').map(x => { const [k, v] = x.split(':'); return [k, v]; }));
  const w = m.weapon ? `武${c[m.weapon.split('+')[0]]}+${m.weapon.split('+')[1]}` : ''; const rest = ['helm', 'armor', 'gloves', 'boots'].filter(k => m[k]).map(k => c[m[k].split('+')[0]] + '+' + m[k].split('+')[1]);
  return w + (rest.length ? ' 防' + rest.join('/') : ''); };

/* ───────── 輸出 ───────── */
const out = { lines: [], json: {} };
const say = s => out.lines.push(s);
const table = (head, rows) => { say('| ' + head.join(' | ') + ' |'); say('|' + head.map(() => '---').join('|') + '|'); rows.forEach(r => say('| ' + r.join(' | ') + ' |')); say(''); };
const PERS = p => [['慢', p.persona.slow, p.acc.slow], ['中', p.persona.mid, p.acc.mid], ['快', p.persona.fast, p.acc.fast]];
const SCEN = [['grass', 'coo', 1], ['grass', 'frog', 3], ['grass', 'shroom', 3], ['grass', 'coo', 5], ['grass', 'shroom', 5], ['forest', 'wolf', 1], ['forest', 'wolf', 3], ['forest', 'wolf', 5]];
const MN = { coo: '咕咕鳥', frog: '泡泡蛙', shroom: '跳跳菇', wolf: '炎牙狼' };
const sn = ([rk, mk, s]) => `${MN[mk]}★${s}(Lv${regionLv(rk, s)})`;

export const SECTIONS = {
  params(p) { say('## params：假設'); say('```'); say(JSON.stringify({ ...p, real: p.real ? `${p.real.length} 人` : undefined })); say('```');
    table(['', 'bestWpm', '教學量到', '層級', '戰鬥中字/分'], PERS(p).map(([n, v]) => [n, v, r1(v * p.tutRatio), tierOf(v, p), r1(v * p.alpha)])); },
  hp(p) { say(`## hp：魔物血量（(440+20·Lv)·hpMul·層級倍率 ${JSON.stringify(p.hpTier || HP_TIER)}）與各層級門檻速度`);
    table(['魔物★', 'Lv', '題長(平靜/生氣)', 'A', 'B', 'C', 'D'], SCEN.map(sc => { const [rk, mk, s] = sc, lv = regionLv(rk, s);
      return [sn(sc), lv, `${wordLen(lv, s, false)}/${wordLen(lv, s, true)}`, ...['A', 'B', 'C', 'D'].map(t => `${Math.round(monMaxHp(mk, lv, t) * (p.hpTier && p.hpTier[t] ? p.hpTier[t] / HP_TIER[t] : 1))}／v≥${r1(vNeed(0.97, rk, mk, s, NOGEAR, p, t))}`)]; }));
    say('「v≥」＝這個層級的人無裝備、正確率 97% 時，平均剛好在時限內打完所需的 bestWpm。層級對應的 bestWpm 範圍：A <8、B 8～18.7、C 18.7～37.3、D ≥37.3。');
    const ref = { A: 5.3, B: 11.8, C: 25.9, D: 46.7 };
    say(''); say('層級的「公平倍率」：讓各層代表速度（教學量到的幾何中點 ÷0.75）的門檻壓力一樣，倍率應正比於該速度的傷害率 r(v)。');
    const rB = battle(ref.B, 0.97, 'grass', 'shroom', 3, NOGEAR, p, 'B').rate;
    table(['層級', '代表 bestWpm', '現行 HP_TIER', '公平倍率（B=0.5 為基準）', '代表者★3跳跳菇勝率'], Object.entries(ref).map(([t, v]) => { const r = battle(v, 0.97, 'grass', 'shroom', 3, NOGEAR, p, t).rate;
      const vn = vNeed(0.97, 'grass', 'shroom', 3, NOGEAR, p, t); return [t, v, (p.hpTier || HP_TIER)[t], r2(0.5 * r / rB), pc(Phi(Math.log(v / vn) / p.sigmaB)) + '%']; })); },
  weapon(p) { say('## weapon：武器種類係數 ω（相對純打字，含特技；中速 10、正確率 97%、題長 2 字）');
    const c = p.persona.mid * p.alpha; table(['武器', '★1', '★5', '★5（快 19）'], ['staff', 'bow', 'dagger', 'crossbow', 'mean'].map(w => [w, r2(weaponOmega(w, 2, 0.97, c, 1, p)), r2(weaponOmega(w, 2, 0.97, c, 5, p)), r2(weaponOmega(w, 2, 0.98, p.persona.fast * p.alpha, 5, p))]));
    say(`連擊倍率 κ（題長 2）：正確率 0.95 → ${r2(comboMul(2, 0.95))}、0.97 → ${r2(comboMul(2, 0.97))}、0.99 → ${r2(comboMul(2, 0.99))}`); say(''); },
  gear(p) { say('## gear：裝備五格（SPEC-STAGE2 §3.2）、疊加與上限');
    table(['格', '灰', '綠', '藍', '每 +1', '藍+5', '上限'], Object.entries(SLOT).map(([k, s]) => [k, s.gray, s.green, s.blue, s.per, r2(s.blue + 5 * s.per), CAP[{ weapon: 'g', helm: 'hp', armor: 'cut', gloves: 'shield', boots: 'warn' }[k]]]));
    table(['預設組', '攻擊倍率 g（打怕火的）', '生命', '受傷少', '舉盾+', '紅線早', '戰力'], Object.entries(PRESETS).map(([n, s]) => [n, r2(s.atk / 100 * (s.elem ? 1.1 : 1)), 100 + s.hp, pc(s.cut) + '%', s.shield, s.warn, '']));
    table(['強化到', '+1', '+2', '+3', '+4', '+5', '灰合計', '綠合計', '藍合計'], [['字元', ...[1, 2, 3, 4, 5].map(n => enhanceCost(n)), ...['gray', 'green', 'blue'].map(c => [1, 2, 3, 4, 5].reduce((s, n) => s + enhanceCost(n, c), 0))],
      ['每 +1% 攻擊花的字元（灰）', ...[1, 2, 3, 4, 5].map(n => r1(enhanceCost(n) / (2 / (100 + 2 * (n - 1)) * 100))), '', '', '']]);
    const lr = Math.log(p.real ? Math.max(...p.real.map(r => r.wpm)) / Math.min(...p.real.map(r => r.wpm)) : quantile(0.9, p) / quantile(0.1, p));
    say(`裝備佔比 ln(g_max)/ln(v_p90/v_p10)：g=1.32 → ${pc(Math.log(1.32) / lr)}%（p10～p90 = ${r1(Math.exp(lr))} 倍）；g=1.20 → ${pc(Math.log(1.2) / lr)}%；g=1.50 → ${pc(Math.log(1.5) / lr)}%`);
    say(`翻盤人數上限 ln g/(σ√2π)（σ 加上 σ_b）：g=1.10 → ${r1(100 * Math.log(1.1) / (Math.hypot(p.sigma, p.sigmaB) * Math.sqrt(2 * Math.PI)))}%、1.32 → ${r1(100 * Math.log(1.32) / (Math.hypot(p.sigma, p.sigmaB) * Math.sqrt(2 * Math.PI)))}%`); say(''); },
  combat(p) { for (const wa of [false, true]) { const q = { ...p, wolfAttacks: wa };
    say(`## combat：慢／中／快 無裝備的解析勝率、贏的秒數、倒下（${wa ? '狼也攻擊' : '現行 ATTACKS_OPEN'}）`);
    table(['魔物★', ...PERS(q).map(([n, v]) => `${n}(${v},${tierOf(v, q)})`)], SCEN.map(sc => [sn(sc), ...PERS(q).map(([, v, a]) => { const b = winP(v, a, ...sc, NOGEAR, q);
      return `${pc(b.win)}%／${Math.round(b.T)}s／倒${r1(b.downs)}${b.casts ? `／招${r1(b.casts)}` : ''}`; })])); } },
  flip(p) { say('## flip：裝備對勝率的影響（現行攻擊）');
    for (const sc of [['grass', 'coo', 5], ['forest', 'wolf', 1], ['forest', 'wolf', 5]]) {
      table([sn(sc), ...Object.keys(PRESETS)], PERS(p).map(([n, v, a]) => [n, ...Object.values(PRESETS).map(g => { const b = winP(v, a, ...sc, g, p); return `${pc(b.win)}%/${Math.round(b.T)}s`; })]));
      say(`全班（母體）勝率：${Object.entries(PRESETS).map(([k, g]) => `${k} ${pc(popWin(...sc, g, p))}%`).join('、')}`); say(''); }
    say('門檻速度乘數（v_need(g)/v_need(1)，跳跳菇★3 B 層，1/g 為無固定耗時時的理論值）：');
    table(['g', '1/g', '解析'], [1.05, 1.1, 1.2, 1.32].map(g => [g, r2(1 / g), r2(vNeed(0.97, 'grass', 'shroom', 3, { ...NOGEAR, atk: 100 * g }, p, 'B') / vNeed(0.97, 'grass', 'shroom', 3, NOGEAR, p, 'B'))])); },
  exp(p) { say('## exp：HR 經驗（現行 hrNeed=20+15(HR−1)、huntExp=20+3Lv）');
    table(['HR', '這級要', '累計', '約幾場（每場 40）', '約幾節（2 場）'], [2, 3, 5, 8, 10, 12, 15, 20, 30].map(h => [h, hrNeed(h - 1), cumExp(h), r1(cumExp(h) / 40), r1(cumExp(h) / 80)])); },
  econ(p) { say('## econ：字元價格 → 要打幾節才買得起（收入用 timeline 的中位「每節賺多少」）');
    const inc = PERS(p).map(([n, v, a]) => { const t = semester(v, a, { ...p, N: 120 }); return [n, t[t.length - 1].earned / p.lessons]; });
    const items = [['布裝一件', 30], ['灰武器', 40], ['綠防具一件', 120], ['強化灰 +1', 20], ['強化灰 +0→+3', 110], ['強化綠 +0→+3', 220], ['炎牙刀', 250], ['改名卡', 300], ['強化綠 +0→+5', 600], ['布裝四件＋全強化 +3', 120 + 4 * 110], ['全身綠 +5（5 件）', 600 + 5 * 600]];
    say(`每節收入（中位）：${inc.map(([n, x]) => `${n} ${Math.round(x)}`).join('、')}`);
    table(['東西', '字元', ...inc.map(([n]) => n + '（節）')], items.map(([k, c]) => [k, c, ...inc.map(([, x]) => r1(c / x))])); },
  drops(p) { say('## drops：圖紙與材料');
    table(['p', 'K', '單張期望場數', '最壞', '兩張學完期望', '兩張 p95'], [[0.3, 5], [0.3, 3], [0.25, 4], [0.2, 5]].map(([q, K]) => { const b = bpWins(2, q, K); return [q, K, r2(pityE(q, K)), K + 1, r1(b.E), b.p95]; }));
    say(`無保底連 10 場沒掉：0.7^10 = ${r1(100 * 0.7 ** 10)}%；機率材料 p95 場數 n95(p)：0.3 → ${n95(0.3)}、0.5 → ${n95(0.5)}`); say(''); },
  unlock(p) { say('## unlock：每一星要打幾場才過（期望 1/勝率，挑最好打的魔物；無裝備）');
    table(['星級', ...PERS(p).map(([n]) => n)], ['grass', 'forest'].flatMap(rk => [1, 2, 3, 4, 5].map(s => [`${REGIONS[rk].name}★${s}`, ...PERS(p).map(([, v, a]) => {
      const w = Math.max(...REGIONS[rk].mons.map(mk => winP(v, a, rk, mk, s, NOGEAR, p).win)); return w < 0.02 ? '卡住' : r1(1 / w); })]))); },
  timeline(p) { for (const [n, v, a] of PERS(p)) { say(`## timeline：${n}（bestWpm ${v}→${r1(v * (1 + p.growth))}，${p.lessons} 節 × ${p.games} 場，鐵匠鋪從第 1 節開）`);
    const t = semester(v, a, p);
    table(['節', 'HR', '最高過關', '這段勝率', '狼★5 勝率', '持有字元', '累計賺', '攻擊力', '戰力', '火刀比例', '最常見裝備'], t.filter(r => [1, 2, 3, 4, 6, 8, 10, 12, 14].includes(r.lesson) || r.lesson === p.lessons).map(r => [r.lesson, r.hr, topName(r.top), pc(r.winRate) + '%', pc(r.w5) + '%', r.coins, r.earned, r.atk, r.pw, pc(r.fire) + '%', gearShort(r.gear)])); } },
  sens(p) { say('## sens：敏感度（一次動一個 ±20%；看「中」咕咕鳥★5、「慢」炎牙狼★1、「中」第 14 節 HR）');
    const metric = q => [winP(q.persona.mid, q.acc.mid, 'grass', 'coo', 5, NOGEAR, q).win, winP(q.persona.slow, q.acc.slow, 'forest', 'wolf', 1, NOGEAR, q).win];
    const base = metric(p); const rows = [];
    const knobs = [['median→persona', 'persona'], ['sigmaB', 'sigmaB'], ['alpha', 'alpha'], ['tau0', 'tau0'], ['react 平均', 'react'], ['laneW', 'laneW'], ['tutRatio', 'tutRatio']];
    for (const [label, k] of knobs) { const f = m => { const q = structuredClone({ ...p, real: undefined }); q.real = p.real;
        if (k === 'persona') q.persona = Object.fromEntries(Object.entries(p.persona).map(([a, b]) => [a, b * m]));
        else if (k === 'react') q.react = p.react.map(x => x * m); else if (k === 'laneW') q.laneW = Object.fromEntries(Object.entries(p.laneW).map(([a, b]) => [a, b * m])); else q[k] = p[k] * m; return metric(q); };
      const lo = f(0.8), hi = f(1.2); rows.push([label, `${pc(lo[0])}% / ${pc(hi[0])}%`, `${pc(lo[1])}% / ${pc(hi[1])}%`, Math.round(Math.abs(hi[0] - lo[0]) * 100 + Math.abs(hi[1] - lo[1]) * 100)]); }
    for (const [label, acc] of [['正確率 −2pp/+1pp', null]]) { const lo = metric({ ...p, acc: Object.fromEntries(Object.entries(p.acc).map(([a, b]) => [a, b - 0.02])) }), hi = metric({ ...p, acc: Object.fromEntries(Object.entries(p.acc).map(([a, b]) => [a, Math.min(0.995, b + 0.01)])) });
      rows.push([label, `${pc(lo[0])}% / ${pc(hi[0])}%`, `${pc(lo[1])}% / ${pc(hi[1])}%`, Math.round(Math.abs(hi[0] - lo[0]) * 100 + Math.abs(hi[1] - lo[1]) * 100)]); }
    rows.sort((x, y) => y[3] - x[3]);
    say(`基準：中・咕咕鳥★5 ${pc(base[0])}%；慢・炎牙狼★1 ${pc(base[1])}%`);
    table(['參數', '中咕咕鳥★5（−20% / +20%）', '慢炎牙狼★1（−20% / +20%）', '擺幅合計 pp'], rows);
    const tl = m => semester(p.persona.mid, p.acc.mid, { ...p, N: 120, ...m }).at(-1);
    table(['一學期假設', '中：第 14 節 HR', '最高過關', '累計賺'], [['基準', {}], ['每節 1 場', { games: 1 }], ['每節 3 場', { games: 3 }], ['20 節', { lessons: 20 }], ['速度不成長', { growth: 0 }]].map(([n, m]) => { const r = tl(m); return [n, r.hr, topName(r.top), r.earned]; })); },
  ttd(p) { say('## ttd：受傷（每場失去的生命 ÷ 生命上限；> 1 就會倒下）與「要倒下 1 次」需要的傷害倍率');
    const sc = [['grass', 'coo', 1], ['grass', 'frog', 3], ['grass', 'coo', 5], ['forest', 'wolf', 1], ['forest', 'wolf', 5]], q = { ...p, wolfAttacks: true };
    table(['魔物★', ...PERS(q).map(([n]) => n + '：被打中／失去比例'), '目標比例 λ', '中要的 dmgMul'], sc.map(x => { const lam = 0.3 + 0.225 * (x[2] - 1);
      const mid = winP(q.persona.mid, q.acc.mid, ...x, NOGEAR, q); let lo = 0.5, hi = 20; for (let i = 0; i < 30; i++) { const m = Math.sqrt(lo * hi); if (battle(q.persona.mid, q.acc.mid, ...x, NOGEAR, { ...q, dmgMul: m }).lossFrac < lam) lo = m; else hi = m; }
      return [sn(x), ...PERS(q).map(([, v, a]) => { const b = battle(v, a, ...x, NOGEAR, q); return `${r1(b.hits)}／${pc(b.lossFrac)}%`; }), lam, r1(hi)]; }));
    say('（狼的欄用「狼也攻擊」。λ＝設計目標：★1 0.30 → ★5 1.20，中位學生 ★5 平均倒下約 1 次。）');
    for (const dm of [1, 3]) { const qq = { ...q, dmgMul: dm };
      table([`dmgMul=${dm}：咕咕鳥★5、慢`, ...Object.keys(PRESETS)], [['倒下', ...Object.values(PRESETS).map(g => r2(battle(qq.persona.slow, qq.acc.slow, 'grass', 'coo', 5, g, qq).downs))],
        ['勝率', ...Object.values(PRESETS).map(g => pc(winP(qq.persona.slow, qq.acc.slow, 'grass', 'coo', 5, g, qq).win) + '%')]]); } },
  future(p) { say('## future：之後區域的曲線（設計提案；顏色每階 ×1.10、+5＝×1.10、屬性 ×1.1）');
    const col = ['灰/綠', '藍', '紫', '橙', '金'], A = k => 100 * 1.1 ** k;
    table(['區域 k', '主要顏色', '基礎攻擊力', '+5', '區域內最強（+5×屬性）', '進區時預期（上一階 +3）', '區域內差距', '血量倍率 R_k（相對草原）'], [0, 1, 2, 3, 4].map(k => {
      const top = A(k) * 1.1 * 1.1, entry = k ? A(k - 1) * 1.06 : 100; return [k, col[k], Math.round(A(k)), Math.round(A(k) * 1.1), Math.round(top), Math.round(entry), r2(top / (k ? A(k - 1) : 100)), r2(entry / 100)]; }));
    say('區域內差距＝區域內最強 ÷ 上一階 +0，固定 ≈1.33（＝裝備預算）；R_k 讓「帶著該區預期裝備的人」面對的壓力跟草原無裝備時一樣。'); say(''); },
  checks(p) { say('## checks：SPEC-STAGE2 G1～G8 的解析預測（模擬器升級後要用 1,000 場覆核）');
    const S = PRESETS, rows = [];
    const vf = winP(p.veryFast, 0.99, 'grass', 'coo', 1, S['藍火刀+5＋綠+5'], p);
    rows.push(['G1', `最快 ${p.veryFast} 字/分（${vf.tier}）藍火刀+5 打咕咕鳥★1：${Math.round(vf.T)} 秒、出招 ${r1(vf.casts)} 次`, vf.T >= 55 && vf.casts >= 2 ? '過' : '不過']);
    const m0 = winP(p.persona.mid, p.acc.mid, 'forest', 'wolf', 5, NOGEAR, p), m5 = winP(p.persona.mid, p.acc.mid, 'forest', 'wolf', 5, S['綠武器+5'], p);
    const m1 = winP(p.persona.mid, p.acc.mid, 'forest', 'wolf', 5, gearStats({ weapon: { c: 'green', n: 1 } }), p), m0g = winP(p.persona.mid, p.acc.mid, 'forest', 'wolf', 5, gearStats({ weapon: { c: 'green', n: 0 } }), p);
    rows.push(['G2', `中・炎牙狼★5：綠武器+5 少 ${pc(1 - m5.T / m0.T)}%（要 ≥7%）；+0→+1 少 ${r1(100 * (1 - m1.T / m0g.T))}%（要 1～2.5%）`, (1 - m5.T / m0.T) >= 0.07 ? '過' : '不過']);
    const s0 = winP(p.persona.slow, p.acc.slow, 'forest', 'wolf', 1, NOGEAR, p), s3 = winP(p.persona.slow, p.acc.slow, 'forest', 'wolf', 1, S['綠全身+3'], p);
    const c0 = winP(p.persona.slow, p.acc.slow, 'grass', 'coo', 5, NOGEAR, p), c3 = winP(p.persona.slow, p.acc.slow, 'grass', 'coo', 5, S['綠全身+3'], p);
    rows.push(['G3', `慢・炎牙狼★1 綠全身+3：${pc(s0.win)}%→${pc(s3.win)}%（要 +5pp）；咕咕鳥★5 倒下 ${r2(c0.downs)}→${r2(c3.downs)}（要 −30%）`, (s3.win - s0.win >= 0.05) ? (c0.downs < 0.05 ? '勝率過；倒下無法驗（本來就沒人倒下）' : c3.downs <= 0.7 * c0.downs ? '過' : '倒下不過') : '不過']);
    const g4 = [false, true].map(wa => winP(p.persona.slow, p.acc.slow, 'forest', 'wolf', 5, S['綠全身+5'], { ...p, wolfAttacks: wa }).win);
    rows.push(['G4', `慢・炎牙狼★5 綠全身+5：現行 ${pc(g4[0])}%、狼攻擊 ${pc(g4[1])}%（要 ≤60%）`, g4.every(x => x <= 0.6) ? '過' : '不過']);
    rows.push(['G5', '不動魔物血量：本模型不改 HP，自動成立', '過']);
    const tierS = tierOf(p.persona.slow, p), b0 = strikeModel('pair', tierS, NOGEAR, p, 5).ok, b3 = strikeModel('pair', tierS, gearStats({ boots: { c: 'green', n: 3 } }), p, 5).ok;
    const sl0 = strikeModel('slam', tierS, NOGEAR, p, 3).ok, sl3 = strikeModel('slam', tierS, gearStats({ gloves: { c: 'green', n: 3 } }), p, 3).ok;
    rows.push(['G6', `慢（${tierS}）咕咕鳥★5 夾擊閃避 ${pc(b0)}%→綠護腳+3 ${pc(b3)}%；泡泡蛙★3 重壓防禦 ${pc(sl0)}%→綠護手+3 ${pc(sl3)}%（各要 +10pp）`, (b3 - b0 >= 0.1 && sl3 - sl0 >= 0.1) ? '過' : '不過']);
    const g7 = ['coo', 'frog', 'shroom', 'wolf'].map(mk => { const b = battle(p.veryFast * 1.3, 1, mk === 'wolf' ? 'forest' : 'grass', mk, 1, { ...NOGEAR, atk: 132 }, p); return `${mk} ${Math.floor(b.T * 0.8)}`; });
    rows.push(['G7', `FASTEST_FLOOR 參考（${r1(p.veryFast * 1.3)} 字/分、100%、×1.32，×0.8）：${g7.join('、')}`, '參考']);
    const q = { ...p, wolfAttacks: true }, w0 = winP(p.persona.mid, p.acc.mid, 'forest', 'wolf', 5, NOGEAR, q).win, wg = winP(p.persona.mid, p.acc.mid, 'forest', 'wolf', 5, S['灰全身+0'], q).win;
    rows.push(['G8', `狼也攻擊：中・炎牙狼★5 無裝備 ${pc(w0)}%（要 ≥50%）、灰全身 ${pc(wg)}%（要 ≥65%）`, w0 >= 0.5 && wg >= 0.65 ? '建議開' : '先不開']);
    table(['#', '解析結果', '判定'], rows); },
  stats(p) { say('## stats：驗收要幾場');
    const ci = (q, n) => r1(196 * Math.sqrt(q * (1 - q) / n)), nd = (q, d) => Math.ceil(2 * q * (1 - q) / (d / 1.96) ** 2);
    table(['', 'n=300', 'n=770', 'n=1000'], [['勝率 50% 的 95% 信賴區間 ±pp', ci(0.5, 300), ci(0.5, 770), ci(0.5, 1000)], ['勝率 80%', ci(0.8, 300), ci(0.8, 770), ci(0.8, 1000)]]);
    say(`兩組獨立樣本測出 5pp 差（p=0.5）每組要 ${nd(0.5, 0.05)} 場；10pp 要 ${nd(0.5, 0.1)} 場；p=0.8 測 5pp 要 ${nd(0.8, 0.05)} 場。`); say(''); }
};

/* 建議案（BALANCE-CURVES.md §7）：--preset proposal */
export const PROPOSAL = { unlockNeed: 2, hpTier: { A: 0.30, B: 0.5, C: 0.8, D: 1.7 } };

/* ───────── 命令列 ───────── */
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2), want = [], p = structuredClone(P);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--set') { const [k, v] = args[++i].split('='); const path = k.split('.'); let o = p; while (path.length > 1) { const k0 = path.shift(); if (o[k0] == null) o[k0] = {}; o = o[k0]; } o[path[0]] = isNaN(+v) ? (v === 'true' ? true : v === 'false' ? false : v) : +v; }
    else if (args[i] === '--real') { p.real = JSON.parse(readFileSync(args[++i], 'utf8')); const w = p.real.map(r => r.wpm).sort((a, b) => a - b), q = f => w[Math.min(w.length - 1, Math.floor(f * w.length))];
      p.median = q(0.5); p.sigma = (Math.log(q(0.75)) - Math.log(q(0.25))) / 1.349; p.persona = { slow: q(0.25), mid: q(0.5), fast: q(0.9) }; p.veryFast = w[w.length - 1]; }
    else if (args[i] === '--preset') { const k = args[++i]; if (k !== 'proposal') { console.error('只有 --preset proposal'); process.exit(1); } Object.assign(p, structuredClone(PROPOSAL)); }
    else if (args[i] === '--json') p.json = true;
    else want.push(args[i]);
  }
  for (const k of (want.length ? want : Object.keys(SECTIONS))) { if (!SECTIONS[k]) { console.error('沒有這一節：' + k); process.exit(1); } SECTIONS[k](p); }
  if (p.json) console.log(JSON.stringify({ P: { ...p, real: undefined }, lines: out.lines })); else console.log(out.lines.join('\n'));
}
