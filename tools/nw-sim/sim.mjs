import { BAL, TIERS, MONSTERS, regionLv, monMaxHp, monDmg, atkInterval, castTime } from '../../nw-data.js';

export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const gauss = r => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

export const DEFAULT_ASSUME = {
  dual: 0.85,
  avgOfBest: 0.75,
  wordFast: 2.2,
  switchCost: 1.0,
  attempt: [0.25, 0.8],
  rightType: [0.55, 0.95],
  aimed: [0.1, 0.8],
  react: [2.2, 1.0],
  windowMul: 1,
  castMul: 1,
  hpMul: 1,
  actionWord: 1
};

function poolChars(lv, angry) {
  const idx = Math.min(3, (lv < 10 ? 0 : lv < 20 ? 1 : 2) + (angry ? 1 : 0));
  return [2, 2, 3.5, 8][idx];
}

export function simulate(p, mk, rk, star, exp, seed, A = DEFAULT_ASSUME, overrides = {}) {
  const r = rng(seed);
  const lv = regionLv(rk, star), m = MONSTERS[mk];
  const tier = p.tier && TIERS[p.tier] ? p.tier : 'B';
  const weapon = overrides.weapon || p.weapon || 'staff';
  const cpm = Math.max(4, p.wpm * A.avgOfBest * A.dual);
  const errRate = clamp(1 - (clamp(p.acc, 80, 100) / 100 - 0.02), 0.01, 0.15);
  const tWord = A.actionWord * 60 / (cpm * A.wordFast) + A.switchCost;
  const pAttempt = A.attempt[0] + (A.attempt[1] - A.attempt[0]) * exp;
  const pRight = A.rightType[0] + (A.rightType[1] - A.rightType[0]) * exp;
  const pAimed = A.aimed[0] + (A.aimed[1] - A.aimed[0]) * exp;

  const mon = { max: Math.round(monMaxHp(mk, lv, tier) * A.hpMul), angry: false };
  mon.hp = mon.max;
  const me = { hp: BAL.playerHp, down: false, downUntil: 0, downs: 0 };
  const st = { burn: 0, poison: 0, ice: 0, lastTick: 0 };
  const S = { T: 0, combo: 0, qCount: 0, gauge: 0, sharp: 0, mag: 0, dodgeAll: 0, dodgeOk: 0, defAll: 0, defOk: 0, hits: 0, hpLost: 0, chars: 0, wrongQ: 0, attempts: 0, casts: 0, late: 0, wasted: 0 };
  let cast = null, plan = null, busyUntil = 0, action = null;
  let nextCast = 6;
  let qEnd = 0, qLen = 2, special = null;

  const newQ = () => {
    S.qCount++;
    const every = S.qCount % BAL.chantEvery === 0;
    special = (weapon === 'staff' && every) ? 'chant' : (weapon === 'dagger' && every) ? 'flurry' : null;
    qLen = special === 'chant' ? (lv < 10 ? 12 : 16) : special === 'flurry' ? 9 : poolChars(lv, mon.angry);
    qLen = Math.max(1, Math.round(qLen * (0.8 + r() * .4)));
    qEnd = S.T + qLen * 60 / cpm * Math.exp(gauss(r) * 0.3) + 0.5;
  };
  newQ();

  const hurt = (d, status) => {
    if (me.down) return;
    me.hp -= d; S.hpLost += d;
    if (status) { if (status === 'burn') st.burn = S.T + 5; if (status === 'poison') st.poison = S.T + 15; if (status === 'ice') st.ice = S.T + 8; }
    if (me.hp <= 0) {
      me.down = true; me.downs++; S.combo = 0; action = null; plan = null;
      if (me.downs >= BAL.downMax) return 'fail';
      me.downUntil = S.T + BAL.downRest;
    }
  };

  const dmgOnMon = d => { mon.hp -= d; if (!mon.angry && mon.hp > 0 && mon.hp <= mon.max * BAL.angryAt) mon.angry = true; };
  const angryMul = () => mon.angry ? BAL.angryTaken : 1;

  const submit = () => {
    let wrong = 0;
    for (let i = 0; i < qLen; i++) if (r() < errRate) wrong++;
    S.chars += qLen;
    if (wrong >= qLen * BAL.wrongRatio) { S.combo = 0; S.wrongQ++; hurt(BAL.wrongHit); return; }
    const perfect = wrong === 0, correct = qLen - wrong;
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
    if (me.down && S.T >= me.downUntil) { me.down = false; me.hp = BAL.playerHp; qEnd = Math.max(qEnd, S.T + .5); }
    if (S.T - st.lastTick >= 1) {
      st.lastTick = S.T;
      let d = 0; if (st.burn > S.T) d += 3; if (st.poison > S.T) d += 1;
      if (d && !me.down) { me.hp -= d; S.hpLost += d; if (me.hp <= 0) { me.down = true; me.downs++; S.combo = 0; action = null; plan = null; if (me.downs >= BAL.downMax) return out('fail'); me.downUntil = S.T + BAL.downRest; } }
    }
    if (!cast && S.T >= nextCast && !me.down) {
      const atk = m.attacks[Math.floor(r() * m.attacks.length)];
      const quick = m.spKey === 'quick';
      const dur = castTime(lv, tier) * A.castMul * (quick ? .75 : 1);
      cast = { atk, start: S.T, dur, hitAt: S.T + dur };
      S.casts++;
      const rage = m.spKey === 'rage' && mon.angry;
      nextCast = S.T + atkInterval(lv, tier, rage) * (quick ? BAL.quickMul : 1);
      if (r() < pAttempt && busyUntil <= S.T) {
        const right = r() < pRight;
        const type = right ? atk.type : (atk.type === 'dodge' ? 'defend' : 'dodge');
        const W0 = (type === 'dodge' ? TIERS[tier].dodge : TIERS[tier].defend) * A.windowMul;
        const react = Math.max(.8, A.react[0] + gauss(r) * A.react[1]);
        let startAt;
        if (r() < pAimed) {
          const target = cast.hitAt - W0 * (.3 + r() * .5) - tWord;
          startAt = Math.max(S.T + react, target + gauss(r) * .5);
        } else startAt = S.T + react;
        if (startAt < cast.hitAt) plan = { startAt, type, W0 };
      }
    }
    if (plan && S.T >= plan.startAt && !me.down) {
      const comp = S.T + tWord, W = plan.W0 * (st.ice > S.T ? .7 : 1);
      action = { type: plan.type, comp, end: comp + W };
      if (plan.type === 'dodge') S.dodgeAll++; else S.defAll++;
      S.attempts++;
      const d = (comp + W) - S.T;
      busyUntil = comp + W; if (qEnd > S.T) qEnd += d;
      plan = null;
    }
    if (cast && S.T >= cast.hitAt) {
      const c = cast; cast = null;
      if (!me.down) {
        let d = monDmg(lv, c.atk.mul), avoid = 'none';
        if (action && action.comp <= c.hitAt && c.hitAt <= action.end) avoid = action.type === c.atk.type ? 'full' : 'half';
        else if (action && action.comp > c.hitAt) S.late++;
        if (avoid === 'full') { d = 0; if (action.type === 'dodge') S.dodgeOk++; else S.defOk++; }
        else if (avoid === 'half') d = Math.ceil(d / 2);
        if (d > 0) { S.hits++; if (hurt(d, avoid === 'full' ? null : c.atk.status) === 'fail') return out('fail'); }
      }
      if (action && c.hitAt > action.end) action = null;
    }
    if (action && S.T > action.end) action = null;
    if (!me.down && S.T >= qEnd && S.T >= busyUntil) { submit(); if (me.downs >= BAL.downMax) return out('fail'); newQ(); }
  }
  return out(mon.hp <= 0 ? 'win' : 'retreat');

  function out(result) {
    return { result, secs: Math.min(S.T, BAL.timeLimit), downs: me.downs, hpLost: S.hpLost, monLeft: Math.max(0, mon.hp) / mon.max, ...S, cpm, tWord };
  }
}
