/* 新世界戰鬥模擬（三線版，SPEC-STAGE2 §3.4）。
   打字、武器特技照 nw-battle.js submit()；魔物出招與學生反應在 lanes.mjs（紅線、換線、舉盾）；
   裝備（gear）＝ { atk, elem, hp, cut, shield, warn }，跟 nw-data.js gearStats() 同一份欄位。
   題目長度讀 assets/banks 真實詞庫（含 MAX_CHARS 過濾），不再用固定字數。
   舊版（打字閃避、每隻魔物都攻擊）已經拿掉；舊數字不能跟新數字比。 */
import { readFileSync } from 'node:fs';
import { BAL, TIERS, MONSTERS, MAX_CHARS, CHANT_MAX, regionLv, monMaxHp, monDmg, ATTACKS_OPEN } from '../../nw-data.js';
import { buildCast, respond, respondGuard, openFor, usableAttacks, REACT } from './lanes.mjs';

export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const gauss = r => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

const BANKS = (() => {
  const d = new URL('../../assets/banks/', import.meta.url);
  const rd = n => JSON.parse(readFileSync(new URL(n + '.json', d), 'utf8'))['題目'].map(q => [...q.t].length);
  return { normal: rd('common_normal'), fine: rd('common_fine'), epic: rd('common_epic'), legend: rd('common_legend'), chant: rd('special_staff') };
})();
const TIER_KEYS = ['normal', 'fine', 'epic', 'legend'];

export const NOGEAR = { atk: 100, elem: null, hp: 0, cut: 0, shield: 0, warn: 0 };
/* el：屬性倍率（現況 1.1／0.9；V2 規則包 rules.elem＝1.05／0.95，SPEC-BALANCE-V2 §9.1 第 2 項） */
export const elemMul = (g, mk, el) => !g.elem ? 1 : MONSTERS[mk].fear === g.elem ? (el ? el.up : 1.1) : MONSTERS[mk].resist === g.elem ? (el ? el.down : 0.9) : 1;

export const DEFAULT_ASSUME = Object.assign({
  dual: 0.85,          // 一邊打字一邊注意紅線，速度打折
  avgOfBest: 0.75,     // 戰鬥中平均速度 ÷ 歷史最高
  hpMul: 1, castMul: 1
}, REACT);

/* A.rules（rules-v2.mjs 的 v2Rules()）＝SPEC-BALANCE-V2 的規則包：拿掉層級、8 分鐘逃走、V2 攻擊表、屬性 1.05／封頂 1.37、守護／藤蔓流派、防掛機（§3.4）、V2 獎勵比例。
   沒給＝舊行為（亂數順序也一樣，所以舊指令的輸出逐字不變）。
   其他新選項（都是 A 的欄位，沒給＝舊行為）：
     sigmaB    每場「今天手感」的速度差（ln 標準差；解析模型的 σ_b＝0.20），用來跟 curves.mjs 的解析勝率對照
     afkPlay   掛機策略 { nQ, alt }：答完 nQ 題就不再打字；alt＝只按住 Alt（重壓舉盾、守護流線上也舉盾），不然站著不動（既不換線也不舉盾）
     guardShield 守護流舉盾多幾秒（預設 0.5）
     qSd／fixCombo 只用來拆解「逐場比解析慢」的原因（v2-validate.mjs --ablate）：每題打字時間的 ln 標準差（預設 0.3）、連擊倍率固定成一個數（預設照遊戲：連續完美才爬升） */
export function simulate(p, mk, rk, star, exp, seed, A = DEFAULT_ASSUME, overrides = {}) {
  const r = rng(seed);
  if (A.rules && A.rules.slam15 && !A.slamOnce) A = { ...A, slamOnce: true };   // 重壓沒擋住只扣一次（lanes.mjs 的 slamCut）
  const R = A.rules || null, FL = R && R.flowDef ? R.flowDef : null, AFK = R && R.afk ? R.afk : null;
  const lv = regionLv(rk, star), m = MONSTERS[mk];
  const tier = R && R.tierless ? 'B' : p.tier && TIERS[p.tier] ? p.tier : 'B';
  const weapon = overrides.weapon || p.weapon || 'staff';
  const gear = Object.assign({}, NOGEAR, overrides.gear || {});
  let enabled = openFor(mk, R && R.attacks ? R.attacks : overrides.attacks);
  if (R && R.attackFrom && R.attackFrom[mk] > star) enabled = [];   // 跳跳菇 ★1 不攻擊
  const LIMIT = R && R.cap != null ? R.cap : BAL.timeLimit;
  const g = Math.min(R && R.gCap != null ? R.gCap : Infinity, gear.atk / 100 * elemMul(gear, mk, R && R.elem));
  const typeMul = FL && FL.typeMul ? FL.typeMul : 1;
  const afkPlay = A.afkPlay || null;
  const QSD = A.qSd != null ? A.qSd : 0.3;
  /* cpmFloor：打字速度的下限（字/分）。預設 4＝wpm 約 6.3 以下的人在模擬裡一樣快，所以最慢的 21% 會被高估；bal2b 用 --floor 看影響 */
  const cpm = Math.max(A.cpmFloor != null ? A.cpmFloor : 4, p.wpm * A.avgOfBest * A.dual) * (A.sigmaB ? Math.exp(gauss(r) * A.sigmaB) : 1);
  const errRate = clamp(1 - (clamp(p.acc, 80, 100) / 100 - 0.02), 0.01, 0.15);
  const maxChars = MAX_CHARS(star);

  const mon = { max: R && R.tierless ? Math.round((BAL.hpBase + BAL.hpPerLv * lv) * m.hpMul * R.k * A.hpMul) : Math.round(monMaxHp(mk, lv, tier) * A.hpMul), angry: false };
  mon.hp = mon.max;
  const hpMax = BAL.playerHp + gear.hp;
  const me = { hp: hpMax, down: false, downUntil: 0, downs: 0 };
  const st = { burn: 0, poison: [], lastTick: 0 };
  const S = { T: 0, combo: 0, qCount: 0, gauge: 0, sharp: 0, mag: 0, dodgeAll: 0, dodgeOk: 0, defAll: 0, defOk: 0, needAll: 0, needOk: 0, needDodgeAll: 0, needDodgeOk: 0, needDefAll: 0, needDefOk: 0, hits: 0, hpLost: 0, chars: 0, wrongQ: 0, casts: 0, moves: 0, answered: 0, correctChars: 0,
    dType: 0, dFlow: 0, guards: 0, vines: 0, lastCorrect: 0, act: 0 };
  let lastVine = 0;
  let cast = null, plan = null, nextCast = 6;
  const pl = { lane: 1 };
  let qEnd = 0, qLen = 2, special = null;
  const pending = [];

  const tierIdx = () => Math.min(3, (lv < 10 ? 0 : lv < 20 ? 1 : 2) + (mon.angry ? 1 : 0));
  const wordLen = () => {
    for (let i = tierIdx(); i >= 0; i--) { const f = BANKS[TIER_KEYS[i]].filter(n => n <= maxChars); if (f.length) return f[Math.floor(r() * f.length)]; }
    return 2;
  };
  const newQ = () => {
    S.qCount++;
    const every = S.qCount % BAL.chantEvery === 0;
    special = (weapon === 'staff' && every) ? 'chant' : (weapon === 'dagger' && every) ? 'flurry' : null;
    if (special === 'chant') { const f = BANKS.chant.filter(n => n <= CHANT_MAX); qLen = (f.length ? f : [6])[Math.floor(r() * (f.length || 1))]; }
    else if (special === 'flurry') { let n = 0; const cap = Math.max(6, maxChars + 2); for (let i = 0; i < 3; i++) { const w = wordLen(); if (n && n + w > cap) break; n += w; } qLen = n; }
    else qLen = wordLen();
    qEnd = S.T + qLen * 60 / cpm * Math.exp(gauss(r) * QSD) + 0.5;
  };
  newQ();
  if (afkPlay && afkPlay.nQ <= 0) qEnd = Infinity;

  /* 魔物招式打中：盔甲減傷（只算招式，不算亂打反擊、燃燒、中毒） */
  /* armorCeil：盔甲無條件進位（nw-data.js strikeDamage）；half：舉盾擋一半（nw-battle.js resolveStrike：盔甲之後 ceil(dmg/2)） */
  const hurt = (d, status, cut, half) => {
    if (me.down) return;
    let dd = cut ? (R && R.armorCeil ? Math.max(1, d - Math.ceil(d * gear.cut - 1e-9)) : Math.max(1, Math.round(d * (1 - gear.cut)))) : d;
    if (half) dd = Math.ceil(dd / 2);
    me.hp -= dd; S.hpLost += dd;
    if (status) { if (status === 'burn') st.burn = S.T + 5; if (status === 'poison') { st.poison = st.poison.filter(u => u > S.T); if (st.poison.length < 3) st.poison.push(S.T + 15); } }
    if (me.hp <= 0) goDown();
  };
  const goDown = () => {
    me.down = true; me.downs++; S.combo = 0; cast = null; pending.length = 0;
    st.burn = 0; st.poison = [];
    if (me.downs < BAL.downMax) me.downUntil = S.T + BAL.downRest;
  };
  const dmgOnMon = d => {
    d = Math.max(1, Math.round(d * g * typeMul));
    mon.hp -= d; S.dType += d;
    if (!mon.angry && mon.hp > 0 && mon.hp <= mon.max * BAL.angryAt) mon.angry = true;
  };
  /* 流派傷害（反擊、藤蔓）：防掛機 §3.4 ①最近 AFK.win 秒內打對過字才有效 ②一場的流派傷害 ≤ 打字傷害 × AFK.cap。
     沒開防掛機（rules.afk 沒給）就一直有效、不封頂，用來對照舊規則 */
  const flowDmg = x => {
    if (AFK) { if (S.T - S.lastCorrect > AFK.win) return; x = Math.min(x, Math.max(0, S.dType * AFK.cap - S.dFlow)); }
    if (!(x > 0)) return;
    S.dFlow += x; mon.hp -= x;
    if (!mon.angry && mon.hp > 0 && mon.hp <= mon.max * BAL.angryAt) mon.angry = true;
  };
  const angryMul = () => mon.angry ? BAL.angryTaken : 1;

  const submit = () => {
    let wrong = 0;
    for (let i = 0; i < qLen; i++) if (r() < errRate) wrong++;
    S.chars += qLen; S.answered++;
    if (wrong >= qLen * BAL.wrongRatio) { S.combo = 0; S.wrongQ++; hurt(BAL.wrongHit, null, false); return; }
    const perfect = wrong === 0, correct = qLen - wrong;
    S.correctChars += correct;
    if (correct > 0) S.lastCorrect = S.T;
    if (FL && FL.n && perfect && S.vines < FL.n) S.vines++;
    S.combo = perfect ? S.combo + 1 : 0;
    let mul = 1;
    if (weapon === 'staff') { if (special === 'chant' && perfect) mul = BAL.chantMul; }
    else if (weapon === 'bow') {
      mul = .85 + .3 * (correct / qLen);
      if (S.sharp > 0) { mul *= BAL.sharpMul; S.sharp--; }
      else { S.gauge += BAL.gaugePer * (correct / qLen); if (S.gauge >= 100) { S.gauge = 0; S.sharp = BAL.sharpShots; } }
    } else if (weapon === 'dagger') {
      mul = .95;
      if (special === 'flurry' && correct > 0) { const secs = Math.max(.6, qLen * 60 / cpm); mul *= clamp(BAL.flurryMin + (qLen / secs) * BAL.flurrySlope, BAL.flurryMin, BAL.flurryMax); }
    } else if (weapon === 'crossbow') {
      mul = BAL.arrowMul; S.mag = Math.min(BAL.magMax, S.mag + correct);
      if (S.mag >= 12) { const n = S.mag; S.mag = 0; dmgOnMon(Math.round(n * BAL.arrowDmg * (1 + BAL.arrowBonusPer * n) * angryMul())); }
    }
    const comboMul = A.fixCombo != null ? A.fixCombo : 1 + Math.min(20, S.combo) * .02;
    dmgOnMon(Math.round(BAL.perChar * correct * mul * comboMul * angryMul()));
  };

  const dt = 0.05;
  for (S.T = 0; S.T < LIMIT; S.T += dt) {
    if (mon.hp <= 0) return out('win');
    if (AFK && S.T - S.lastCorrect <= AFK.win) S.act += dt;
    /* 藤蔓：每秒結算一次（每根每 every 秒扣 rho×最大血量×g；不取整，不然 196×0.5% 每根只剩 1 點） */
    if (FL && FL.n && S.T - lastVine >= 1) { lastVine = S.T; if (S.vines) flowDmg(S.vines * FL.rho * mon.max * g / FL.every); }
    if (me.down && me.downs < BAL.downMax && S.T >= me.downUntil) { me.down = false; me.hp = hpMax; qEnd = Math.max(qEnd, S.T + .5); }
    if (S.T - st.lastTick >= 1) {
      st.lastTick = S.T;
      let d = 0; if (st.burn > S.T) d += 3; d += st.poison.filter(u => u > S.T).length;
      if (d && !me.down) { me.hp -= d; S.hpLost += d; if (me.hp <= 0) { goDown(); if (me.downs >= BAL.downMax) return out('fail'); } }
    }
    if (enabled.length && !cast && S.T >= nextCast && !me.down) {
      const c = buildCast(r, { mk, lv, star, tier, enabled, T: S.T, warnBonus: gear.warn, mood: mon, laneW: R && R.tierless ? R.laneW : undefined });
      if (!c) nextCast = S.T + 8;
      else {
        c.dur *= A.castMul;
        cast = c; S.casts++; nextCast = c.next;
        if (R && R.atkMul && R.atkMul[mk] != null && R.atkMul[mk] !== 1) c.base = monDmg(lv, c.atk.mul * R.atkMul[mk]);
        /* 掛機：不動＝兩種都沒注意到（站著不動）；alt＝一直舉盾 */
        const AA = afkPlay && S.answered >= afkPlay.nQ ? (afkPlay.alt ? { ...A, attendDef: 1, attendDodge: 0 } : { ...A, attendDef: 0, attendDodge: 0 }) : A;
        const resp = FL && FL.shield != null ? respondGuard(r, c, pl, exp, gear, { ...AA, guardShield: A.guardShield != null ? A.guardShield : FL.shield }) : respond(r, c, pl, exp, gear, AA);
        S.moves += resp.moves; qEnd += resp.moves * A.actCost;
        c.resp = resp; c.hitAt = Math.max(...c.strikes.map(x => x.hit));
        resp.hits.forEach(h => pending.push({ at: h.at, mul: h.mul, status: c.atk.status, half: h.half, slam: c.kind === 'slam' }));
        pending.sort((a, b) => a.at - b.at);
      }
    }
    while (pending.length && pending[0].at <= S.T) {
      const h = pending.shift();
      if (!me.down && cast) { S.hits++; hurt(Math.max(1, Math.round(cast.base * h.mul * (R && R.slam15 && h.slam ? 1.5 : 1))), h.status, true, h.half); if (me.downs >= BAL.downMax) return out('fail'); }
    }
    if (cast && S.T >= cast.hitAt) {
      const c = cast, resp = c.resp; cast = null;
      if (!me.down) {
        const slam = c.kind === 'slam';
        if (resp.guard) { S.guards++; flowDmg(Math.round(mon.max * FL.rho * g)); }   // 守護成功：反擊
        if (slam) { S.defAll++; if (resp.ok) S.defOk++; } else { S.dodgeAll++; if (resp.ok) S.dodgeOk++; }
        if (resp.need) { S.needAll++; if (resp.ok) S.needOk++; if (slam) { S.needDefAll++; if (resp.ok) S.needDefOk++; } else { S.needDodgeAll++; if (resp.ok) S.needDodgeOk++; } }
      }
    }
    if (!me.down && S.T >= qEnd) { submit(); if (me.downs >= BAL.downMax) return out('fail'); newQ(); if (afkPlay && S.answered >= afkPlay.nQ) qEnd = Infinity; }
  }
  return out(mon.hp <= 0 ? 'win' : R && R.cap != null ? 'escape' : 'retreat');

  function out(result) {
    const o = { result, secs: Math.min(S.T, LIMIT), downs: me.downs, hpLost: S.hpLost, monLeft: Math.max(0, mon.hp) / mon.max, ...S, cpm, why: result === 'win' ? '' : me.downs >= BAL.downMax ? 'down' : 'time' };
    if (R) {
      /* V2 獎勵（SPEC-BALANCE-V2 §1.2）：贏＝1；輸／逃走＝failBase×a ＋ (1−failBase)×f，答不到 3 題又沒贏＝0。
         a＝有在打字的秒數比例（防掛機）；f＝打掉的血（流派的只算 escFlow 成） */
      const win = result === 'win', secs = Math.max(1, o.secs);
      o.a = AFK ? Math.min(1, S.act / secs) : 1;
      o.f = win ? 1 : Math.min(1, (S.dType + (AFK ? AFK.escFlow : 1) * S.dFlow) / mon.max);
      o.valid = win || S.answered >= 3;
      o.reward = win ? 1 : o.valid ? R.failBase * o.a + (1 - R.failBase) * o.f : 0;
      o.flowShare = (S.dType + S.dFlow) > 0 ? S.dFlow / (S.dType + S.dFlow) : 0;
    }
    return o;
  }
}
