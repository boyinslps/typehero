/* 新世界戰鬥模擬（三線版，SPEC-STAGE2 §3.4）。
   打字、武器特技照 nw-battle.js submit()；魔物出招與學生反應在 lanes.mjs（紅線、換線、舉盾）；
   裝備（gear）＝ { atk, elem, hp, cut, shield, warn }，跟 nw-data.js gearStats() 同一份欄位。
   題目長度讀 assets/banks 真實詞庫（含 MAX_CHARS 過濾），不再用固定字數。
   舊版（打字閃避、每隻魔物都攻擊）已經拿掉；舊數字不能跟新數字比。 */
import { readFileSync } from 'node:fs';
import { BAL, TIERS, MONSTERS, MAX_CHARS, CHANT_MAX, regionLv, monMaxHp, ATTACKS_OPEN } from '../../nw-data.js';
import { buildCast, respond, openFor, usableAttacks, REACT } from './lanes.mjs';

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
export const elemMul = (g, mk) => !g.elem ? 1 : MONSTERS[mk].fear === g.elem ? 1.1 : MONSTERS[mk].resist === g.elem ? 0.9 : 1;

export const DEFAULT_ASSUME = Object.assign({
  dual: 0.85,          // 一邊打字一邊注意紅線，速度打折
  avgOfBest: 0.75,     // 戰鬥中平均速度 ÷ 歷史最高
  hpMul: 1, castMul: 1
}, REACT);

export function simulate(p, mk, rk, star, exp, seed, A = DEFAULT_ASSUME, overrides = {}) {
  const r = rng(seed);
  const lv = regionLv(rk, star), m = MONSTERS[mk];
  const tier = p.tier && TIERS[p.tier] ? p.tier : 'B';
  const weapon = overrides.weapon || p.weapon || 'staff';
  const gear = Object.assign({}, NOGEAR, overrides.gear || {});
  const enabled = openFor(mk, overrides.attacks);
  const g = gear.atk / 100 * elemMul(gear, mk);
  const cpm = Math.max(4, p.wpm * A.avgOfBest * A.dual);
  const errRate = clamp(1 - (clamp(p.acc, 80, 100) / 100 - 0.02), 0.01, 0.15);
  const maxChars = MAX_CHARS(star);

  const mon = { max: Math.round(monMaxHp(mk, lv, tier) * A.hpMul), angry: false };
  mon.hp = mon.max;
  const hpMax = BAL.playerHp + gear.hp;
  const me = { hp: hpMax, down: false, downUntil: 0, downs: 0 };
  const st = { burn: 0, poison: [], lastTick: 0 };
  const S = { T: 0, combo: 0, qCount: 0, gauge: 0, sharp: 0, mag: 0, dodgeAll: 0, dodgeOk: 0, defAll: 0, defOk: 0, needAll: 0, needOk: 0, needDodgeAll: 0, needDodgeOk: 0, needDefAll: 0, needDefOk: 0, hits: 0, hpLost: 0, chars: 0, wrongQ: 0, casts: 0, moves: 0, answered: 0, correctChars: 0 };
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
    qEnd = S.T + qLen * 60 / cpm * Math.exp(gauss(r) * 0.3) + 0.5;
  };
  newQ();

  /* 魔物招式打中：盔甲減傷（只算招式，不算亂打反擊、燃燒、中毒） */
  const hurt = (d, status, cut) => {
    if (me.down) return;
    const dd = cut ? Math.max(1, Math.round(d * (1 - gear.cut))) : d;
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
    d = Math.max(1, Math.round(d * g));
    mon.hp -= d;
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
    const comboMul = 1 + Math.min(20, S.combo) * .02;
    dmgOnMon(Math.round(BAL.perChar * correct * mul * comboMul * angryMul()));
  };

  const dt = 0.05;
  for (S.T = 0; S.T < BAL.timeLimit; S.T += dt) {
    if (mon.hp <= 0) return out('win');
    if (me.down && me.downs < BAL.downMax && S.T >= me.downUntil) { me.down = false; me.hp = hpMax; qEnd = Math.max(qEnd, S.T + .5); }
    if (S.T - st.lastTick >= 1) {
      st.lastTick = S.T;
      let d = 0; if (st.burn > S.T) d += 3; d += st.poison.filter(u => u > S.T).length;
      if (d && !me.down) { me.hp -= d; S.hpLost += d; if (me.hp <= 0) { goDown(); if (me.downs >= BAL.downMax) return out('fail'); } }
    }
    if (enabled.length && !cast && S.T >= nextCast && !me.down) {
      const c = buildCast(r, { mk, lv, star, tier, enabled, T: S.T, warnBonus: gear.warn, mood: mon });
      if (!c) nextCast = S.T + 8;
      else {
        c.dur *= A.castMul;
        cast = c; S.casts++; nextCast = c.next;
        const resp = respond(r, c, pl, exp, gear, A);
        S.moves += resp.moves; qEnd += resp.moves * A.actCost;
        c.resp = resp; c.hitAt = Math.max(...c.strikes.map(x => x.hit));
        resp.hits.forEach(h => pending.push({ at: h.at, mul: h.mul, status: c.atk.status }));
        pending.sort((a, b) => a.at - b.at);
      }
    }
    while (pending.length && pending[0].at <= S.T) {
      const h = pending.shift();
      if (!me.down && cast) { S.hits++; hurt(Math.max(1, Math.round(cast.base * h.mul)), h.status, true); if (me.downs >= BAL.downMax) return out('fail'); }
    }
    if (cast && S.T >= cast.hitAt) {
      const c = cast, resp = c.resp; cast = null;
      if (!me.down) {
        const slam = c.kind === 'slam';
        if (slam) { S.defAll++; if (resp.ok) S.defOk++; } else { S.dodgeAll++; if (resp.ok) S.dodgeOk++; }
        if (resp.need) { S.needAll++; if (resp.ok) S.needOk++; if (slam) { S.needDefAll++; if (resp.ok) S.needDefOk++; } else { S.needDodgeAll++; if (resp.ok) S.needDodgeOk++; } }
      }
    }
    if (!me.down && S.T >= qEnd) { submit(); if (me.downs >= BAL.downMax) return out('fail'); newQ(); }
  }
  return out(mon.hp <= 0 ? 'win' : 'retreat');

  function out(result) {
    return { result, secs: Math.min(S.T, BAL.timeLimit), downs: me.downs, hpLost: S.hpLost, monLeft: Math.max(0, mon.hp) / mon.max, ...S, cpm, why: result === 'win' ? '' : me.downs >= BAL.downMax ? 'down' : 'time' };
  }
}
