/* 三線戰鬥的「魔物出招 → 學生反應 → 誰被打中」（SPEC-STAGE2 §3.4 F4）。
   規則照 nw-battle.js 的 buildStrikes／resolveStrike／laneKey：
   - 出手前 W 秒（LANE_W[層級] ＋ 護腳）紅線出現；站在紅線上的人被打中；重壓是整排都危險，要在出手時舉著盾。
   - 重壓沒擋住：三條線各打一次（遊戲現況：resolveStrike 對每條線都 hurt 一次，所以是 ×3）。
   學生的反應假設（新手 → 練熟用 exp 0～1 內插）跟 curves.mjs 同一套，來源是 SPEC §3.4：
   反應時間 1.0 → 0.7 秒（標準差 0.35）、按鍵 0.15 秒、夾擊選對安全線 80% → 95%、
   太早舉盾後會再按一次 50% → 90%、換線／舉盾打斷打字 0.3 秒。 */
import { ATTACKS_OPEN, LANE_W, MONSTERS, castTime, monDmg, atkInterval, BAL } from '../../nw-data.js';

export const REACT = {
  react: [1.0, 0.7], reactSd: 0.35, keyLag: 0.15, pick: [0.8, 0.95], hold: [0.5, 0.9], actCost: 0.3, floor: 0.3
};
const lerp = (a, b, f) => a + (b - a) * f;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const gauss = r => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

/* 這隻魔物現在開了哪些招式。opts.attacks 可以整份換掉（例：{ wolf: ['single','pair','sweep','fake','slam'] }＝「狼也攻擊」） */
export const WOLF_ALL = ['single', 'pair', 'sweep', 'fake', 'slam'];
export const openFor = (mk, attacks) => (attacks || ATTACKS_OPEN)[mk] || [];

/* 開不開某隻的攻擊：回傳這一場可以出的招（defend 型要有 slam，dodge 型要有 single 系） */
export function usableAttacks(mk, enabled) {
  return MONSTERS[mk].attacks.filter(a => a.type === 'defend' ? enabled.includes('slam') : enabled.some(k => k !== 'slam'));
}

function pickPattern(r, star, enabled) {
  const allowed = ['single', 'pair', ...(star >= 3 ? ['sweep'] : []), ...(star >= 5 ? ['fake'] : [])];
  const pool = enabled.filter(k => allowed.includes(k));
  const p = pool.length ? pool : enabled.filter(k => k !== 'slam');
  return p[Math.floor(r() * p.length)];
}

/* 同 buildStrikes。T＝開始讀條的時間；warnBonus＝護腳；laneW＝預警秒數整個換掉（V2 拿掉層級＝一律 3.0；沒給就看層級） */
export function buildCast(r, { mk, lv, star, tier, enabled, T, warnBonus = 0, mood, laneW }) {
  const m = MONSTERS[mk];
  const usable = usableAttacks(mk, enabled);
  if (!usable.length) return null;
  const atk = usable[Math.floor(r() * usable.length)];
  const quick = m.spKey === 'quick';
  const dur = castTime(lv, tier) * (quick ? .75 : 1);
  const H = T + dur, W = laneW != null ? laneW : (LANE_W[tier] || 2.5), B = warnBonus, rl = () => Math.floor(r() * 3);
  const kind = atk.type === 'defend' ? 'slam' : pickPattern(r, star, enabled);
  let strikes = [];
  if (kind === 'slam') strikes = [0, 1, 2].map(l => ({ lane: l, warn: H - W * 1.1 - B, hit: H, slam: true, mul: 1 }));
  else if (kind === 'single') strikes = [{ lane: rl(), warn: H - W - B, hit: H, mul: 1 }];
  else if (kind === 'pair') { const safe = rl(); strikes = [0, 1, 2].filter(l => l !== safe).map(l => ({ lane: l, warn: H - W - B, hit: H, mul: 1 })); }
  else if (kind === 'sweep') { const o = r() < .5 ? [0, 1, 2] : [2, 1, 0]; strikes = o.map((l, i) => ({ lane: l, warn: H + i * .7 - W * .8 - B, hit: H + i * .7, mul: .5 })); }
  else { const a = rl(), b = (a + 1 + Math.floor(r() * 2)) % 3; strikes = [{ lane: a, warn: H - W - B, hit: H, cancel: H - W * .5, mul: 1 }, { lane: b, warn: H - W * .5 - B, hit: H + .4, mul: 1 }]; }
  const rage = m.spKey === 'rage' && mood && mood.angry;
  return {
    atk, kind, strikes, base: monDmg(lv, atk.mul), dur, start: T, H, quick,
    next: T + atkInterval(lv, tier, rage) * (quick ? BAL.quickMul : 1)
  };
}

/* 學生怎麼應付這一次：回傳 { hits:[{at, dmg, mul, status}], moves, need, shieldOk } 和更新後的位置。
   pl＝{ lane }；gear＝{ shield, warn… }；exp 0～1。 */
export function respond(r, cast, pl, exp, gear, A = REACT) {
  const mu = lerp(A.react[0], A.react[1], exp), sd = A.reactSd, kl = A.keyLag;
  const pick = lerp(A.pick[0], A.pick[1], exp), hold = lerp(A.hold[0], A.hold[1], exp);
  const react = () => Math.max(A.floor, mu + gauss(r) * sd);
  const out = { hits: [], moves: 0, need: false, ok: true };
  const sorted = cast.strikes.slice().sort((a, b) => a.hit - b.hit);

  /* attend：這一次有沒有注意到紅線／藍線。真實匯出（2026-11-20，18 位打過的同學，閃避 60/111、防禦 52/86）
     的成功率比「每次都會躲」低很多，所以保留一個旋鈕；SPEC 假設＝每次都注意（預設 undefined） */
  /* attendDodge／attendDef：閃避與防禦分開設（真實資料裡兩個成功率要的 attend 差很多，單一旋鈕對不起來，見 docs/research/BALANCE-2B-ANALYSIS.md）；
     沒設就退回 attend，所以舊腳本的結果不變。slamOnce：只用在「假如重壓只打一次」的對照，遊戲現況是三線各打一次 */
  const att = cast.kind === 'slam' ? (A.attendDef != null ? A.attendDef : A.attend) : (A.attendDodge != null ? A.attendDodge : A.attend);
  const slamCut = list => (cast.kind === 'slam' && A.slamOnce) ? list.slice(0, 1) : list;
  if (att != null && r() >= att) {
    const mine = sorted.filter(s => cast.kind === 'slam' || (s.cancel == null && s.lane === pl.lane));
    out.need = mine.length > 0;
    if (out.need) { out.ok = false; slamCut(mine).forEach(s => out.hits.push({ at: s.hit, mul: s.mul })); }
    return out;
  }

  if (cast.kind === 'slam') {
    const warn = sorted[0].warn, hit = sorted[0].hit, dur = 1.5 + (gear.shield || 0);
    const t1 = warn + react() + kl;
    let covered = false;
    out.need = true;
    if (t1 <= hit) {
      out.moves = 1;
      if (t1 + dur >= hit) covered = true;
      else if (r() < hold) { out.moves = 2; covered = true; }   // 盾提早沒了：hold 的人會再按（按住 Alt 會一直重新舉盾），所以盾越長，需要再按的人越少
    }
    if (!covered) { out.ok = false; slamCut(sorted).forEach(s => out.hits.push({ at: s.hit, mul: s.mul })); }
    return out;
  }

  let lane = pl.lane, ready = -1e9, alert = false;
  for (const s of sorted) {
    const isCancel = s.cancel != null;
    if (lane !== s.lane) continue;        // 站在別線，不用動
    const rt = alert ? Math.max(A.floor, react() * .6) : react();
    const tn = Math.max(s.warn + rt, ready);
    if (isCancel && tn >= s.cancel) continue;   // 太晚才看到、假動作已經收了
    out.need = true; alert = true;
    // 這一刻看得到的危險線
    const danger = new Set(sorted.filter(x => x.warn <= tn && x.hit >= tn && !(x.cancel != null && x.cancel <= tn)).map(x => x.lane));
    danger.add(s.lane);
    const safe = [0, 1, 2].filter(l => !danger.has(l));
    let target;
    if (!safe.length) target = lane;
    else {
      const best = Math.min(...safe.map(l => Math.abs(l - lane)));
      const near = safe.filter(l => Math.abs(l - lane) === best);
      target = near[Math.floor(r() * near.length)];
      if (safe.length === 1 && cast.kind === 'pair' && r() > pick) target = [0, 1, 2].filter(l => l !== safe[0])[Math.floor(r() * 2)];
    }
    const steps = Math.abs(target - lane);
    const arrive = tn + kl * Math.max(1, steps);
    if (steps && arrive <= s.hit) { lane = target; ready = arrive; out.moves += steps; }
    else if (!steps) { /* 選錯又停在原地 */ }
    // 沒趕上或沒動：這條線的出手仍然會打到站在上面的人
    if (!isCancel && lane === s.lane) { out.ok = false; out.hits.push({ at: s.hit, mul: s.mul }); }
  }
  // 沒被 continue 過濾掉、站在危險線但假動作的情況不會有傷害；其餘已在迴圈內處理
  pl.lane = lane;
  return out;
}

/* 守護流（SPEC-BALANCE-V2 §3.1）：只有舉盾擋下（重壓、線上攻擊）→ out.guard＝true（sim.mjs 會自動反擊）。
   - 重壓：照一般的舉盾，盾多 A.guardShield 秒（預設 0.5）；擋住＝成功。
   - 線上的攻擊：先決定有沒有舉盾（attendDef，真實防禦 63% ≈ 3/4 的人有舉）。舉了：盾蓋得到出手那一刻就只受一半傷害，算成功（站著不動剛好沒被打到不算）；
     沒舉：退回一般的換線（attendDodge），躲開了只算閃避成功、不反擊（2026-11-27）。
   「按住 Alt」會一直刷新盾（laneKey 的 Alt 在 e.repeat 檢查之前就 return），所以盾提早沒了還有 hold 的機率再按（跟重壓同一個假設）。 */
export function respondGuard(r, cast, pl, exp, gear, A = REACT) {
  const g2 = { ...gear, shield: (gear.shield || 0) + (A.guardShield != null ? A.guardShield : 0.5) };
  if (cast.kind === 'slam') { const o = respond(r, cast, pl, exp, g2, A); o.guard = o.need && o.ok; return o; }
  const aS = A.attendDef != null ? A.attendDef : A.attend;
  if (!(aS == null || r() < aS)) { const o = respond(r, cast, pl, exp, gear, A); o.guard = false; return o; }   // 沒舉盾：換線躲開成功不反擊（2026-11-27）
  const mu = lerp(A.react[0], A.react[1], exp), hold = lerp(A.hold[0], A.hold[1], exp), kl = A.keyLag;
  const t1 = Math.min(...cast.strikes.map(s => s.warn)) + Math.max(A.floor, mu + gauss(r) * A.reactSd) + kl;
  const dur = 1.5 + g2.shield, holdOk = r() < hold;
  const out = { hits: [], moves: 1, need: false, ok: true, guard: false };
  for (const s of cast.strikes) {
    if (s.cancel != null || s.lane !== pl.lane) continue;   // 假動作那一條從來不會打中；別條線打不到站在這裡的人
    out.need = true;
    if (t1 <= s.hit && (t1 + dur >= s.hit || holdOk)) out.hits.push({ at: s.hit, mul: s.mul, half: true });
    else { out.ok = false; out.hits.push({ at: s.hit, mul: s.mul }); }
  }
  out.guard = out.need && out.ok;
  return out;
}
