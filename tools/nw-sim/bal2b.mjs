/* 2b 數值分析：用真實資料重跑（docs/research/BALANCE-2B-ANALYSIS.md）。只分析，不改遊戲數值。
   用法：node tools/nw-sim/bal2b.mjs <fit|gear|def|slam|real|tier|all> [--n 1000] [--file 匯出檔]
     fit   把閃避／防禦成功率當參數，用真實 53%／63% 反推兩種「為什麼沒躲到」的模型：
           att＝沒注意到紅線（attendDodge／attendDef，站著不動）、slow＝反應很慢（react 平均幾秒）
     gear  G3a／G4／G6／G8 在三種假設（spec＝人人都躲、att、slow）下重跑；四件防具各自的價值
     def   防具（頭盔、盔甲、護手、護腳）在真實閃避率下的實際價值：勝率、倒下、損血
     slam  重壓沒擋住＝三線各打一次（現況）vs 假如只打一次：慢手與快手各多倒下幾次
     real  用 284 個真實學生（逐人）算「裝備能改變勝負」的人數比例（G4 的人口版）
     tier  沒層級的人被當 B 的影響（慢手勝率、快手過關時間）
   做法跟 gear.mjs 一樣：同一個「學生×魔物」用同一組亂數種子跑不同裝備（配對差）。
   模擬器是 tools/nw-sim/sim.mjs＋lanes.mjs；lanes.mjs 多了 attendDodge／attendDef／slamOnce 三個選項（沒設＝舊行為，gear.mjs 輸出不變）。 */
import { readFileSync } from 'node:fs';
import { slotValue, GEAR_TB, ATTACKS_OPEN, monMaxHp, regionLv, FASTEST_FLOOR, BAL, monDmg, MONSTERS, LANE_W } from '../../nw-data.js';
import { simulate, DEFAULT_ASSUME } from './sim.mjs';
import { realPersonas, SPEC6 } from './personas.mjs';
import { WOLF_ALL } from './lanes.mjs';

const args = process.argv.slice(2);
const cmd = args[0] && !args[0].startsWith('--') ? args[0] : 'all';
const opt = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : args[i + 1]; };
const N = +opt('--n', 1000), FLOOR = opt('--floor', null);
const FILE = opt('--file', null) || new URL('../../data-public/typehero-speed-20261120.json', import.meta.url);

/* --weapon-per x：假設「武器每 +1 加幾點攻擊力」（遊戲現況 2）。只在這個程序裡改 GEAR_TB，用來量化「如果改了會怎樣」，不會動檔案 */
if (opt('--weapon-per', null) !== null) GEAR_TB.weapon.per = +opt('--weapon-per');

/* ── 真實學生（逐人）。noTier＝匯出檔沒有層級，遊戲現況（newworld.js tier()）會當 B ── */
const ok = v => typeof v === 'number' && Number.isFinite(v);
const WEAPONS = ['staff', 'bow', 'dagger', 'crossbow'];
const raw = JSON.parse(readFileSync(FILE, 'utf8'));
export const REAL = raw.rows.filter(r => (ok(r.bestWpm) ? r.bestWpm : ok(r.lastWpm) ? r.lastWpm : 0) > 0).map(r => ({
  wpm: ok(r.bestWpm) ? r.bestWpm : r.lastWpm, acc: ok(r.bestAcc) ? r.bestAcc : ok(r.lastAcc) ? r.lastAcc : 97,
  tier: ['A', 'B', 'C', 'D'].includes(r.tier) ? r.tier : null, weapon: WEAPONS.includes(r.lastWeapon) ? r.lastWeapon : 'staff',
  nw: r.nw || null
}));
const tierFromWpm = w => (w >= 28 ? 'D' : w >= 14 ? 'C' : w >= 6 ? 'B' : 'A');
const HUNTERS = REAL.filter(p => p.nw && p.nw.hunts > 0);
const ACC = realPersonas().list[0][1].acc;

/* ── 裝備（同 gear.mjs statsOf：直接用 nw-data.js 的 slotValue） ── */
const CN = ['gray', 'green', 'blue'];
const statsOf = parts => {
  const v = slot => { const x = parts[slot]; return x ? slotValue(slot, CN[x.c], x.p) : 0; };
  const w = parts.weapon;
  return { atk: w ? slotValue('weapon', CN[w.c], w.p) : 100, elem: (w && w.elem) || null, hp: v('helm'), cut: v('armor'), shield: v('gloves'), warn: v('boots') };
};
const all5 = (c, p) => ({ weapon: { c, p }, helm: { c, p }, armor: { c, p }, gloves: { c, p }, boots: { c, p } });
const defOnly = (c, p) => ({ helm: { c, p }, armor: { c, p }, gloves: { c, p }, boots: { c, p } });
const GEARS = {
  none: {}, grayAll: all5(0, 0), grayW5: { weapon: { c: 0, p: 5 } }, grayAll5: all5(0, 5), greenAll3: all5(1, 3), greenAll5: all5(1, 5),
  greenW5: { weapon: { c: 1, p: 5 } }, blueW5: { weapon: { c: 2, p: 5, elem: 'fire' } },
  helm3: { helm: { c: 1, p: 3 } }, armor3: { armor: { c: 1, p: 3 } }, gloves3: { gloves: { c: 1, p: 3 } }, boots3: { boots: { c: 1, p: 3 } },
  helm5: { helm: { c: 1, p: 5 } }, armor5: { armor: { c: 1, p: 5 } }, gloves5: { gloves: { c: 1, p: 5 } }, boots5: { boots: { c: 1, p: 5 } },
  boots5b: { boots: { c: 2, p: 5 } },
  defGray: defOnly(0, 0), def3: defOnly(1, 3), def5: defOnly(1, 5)
};
const GEAR = Object.fromEntries(Object.entries(GEARS).map(([k, v]) => [k, statsOf(v)]));
const MON = {};
for (const [mk, rk] of [['coo', 'grass'], ['frog', 'grass'], ['shroom', 'grass'], ['wolf', 'forest']]) for (let s = 1; s <= 5; s++) MON[mk + s] = [rk, mk, s];

/* ── 一格：N 場的統計 ── */
const cache = new Map();
export function cell(p, mon, gk, scen, n = N, seed0 = 0, exp = 0.5, extra = {}, wolfAtk = false) {
  const key = [p.wpm, p.acc, p.tier, p.weapon, mon, gk, JSON.stringify(scen), n, seed0, exp, JSON.stringify(extra), FLOOR, wolfAtk].join('|');
  if (cache.has(key)) return cache.get(key);
  const [rk, m, star] = MON[mon];
  const o = { n, win: 0, down: 0, time: 0, downs: 0, anyDown: 0, hits: 0, hpLost: 0, secs: 0, dodgeAll: 0, dodgeOk: 0, defAll: 0, defOk: 0, casts: 0, ttk: 0, needDodgeAll: 0, needDodgeOk: 0, needDefAll: 0, needDefOk: 0 };
  for (let k = 0; k < n; k++) {
    const r = simulate({ ...p, acc: p.acc || ACC }, m, rk, star, exp, seed0 * 100003 + k * 7 + 11, { ...DEFAULT_ASSUME, ...scen, ...extra, ...(FLOOR != null ? { cpmFloor: +FLOOR } : {}) }, { gear: GEAR[gk], attacks: wolfAtk ? { ...ATTACKS_OPEN, wolf: WOLF_ALL } : undefined });
    if (r.result === 'win') { o.win++; o.secs += r.secs; } else if (r.why === 'down') o.down++; else o.time++;
    o.downs += r.downs; if (r.downs > 0) o.anyDown++; o.hits += r.hits; o.hpLost += r.hpLost; o.casts += r.casts;
    o.dodgeAll += r.dodgeAll; o.dodgeOk += r.dodgeOk; o.defAll += r.defAll; o.defOk += r.defOk;
    o.needDodgeAll += r.needDodgeAll; o.needDodgeOk += r.needDodgeOk; o.needDefAll += r.needDefAll; o.needDefOk += r.needDefOk;
    o.ttk += r.secs / Math.max(0.02, 1 - r.monLeft);
  }
  const c = { n, win: o.win / n, failDown: o.down / n, timeUp: o.time / n, downs: o.downs / n, anyDown: o.anyDown / n, hits: o.hits / n, hpLost: o.hpLost / n, secs: o.win ? o.secs / o.win : NaN,
    dodge: o.dodgeAll ? o.dodgeOk / o.dodgeAll : NaN, def: o.defAll ? o.defOk / o.defAll : NaN, casts: o.casts / n, slams: o.defAll / n, ttk: o.ttk / n,
    needDodge: o.needDodgeAll ? o.needDodgeOk / o.needDodgeAll : NaN, needDef: o.needDefAll ? o.needDefOk / o.needDefAll : NaN };
  cache.set(key, c); return c;
}
const pct = x => Number.isFinite(x) ? Math.round(x * 100) + '%' : '--';
const f1 = x => Number.isFinite(x) ? x.toFixed(1) : '--';
const f2 = x => Number.isFinite(x) ? x.toFixed(2) : '--';
const sg = x => (x >= 0 ? '+' : '') + x.toFixed(1);
const P = s => console.log(s);

/* ── fit：用真實的閃避／防禦成功率反推 ──
   群：有速度又打過狩獵的 16 人（與 calib.mjs 同一批），各自的速度與層級（沒層級＝B），打草原咕咕鳥（閃避）、泡泡蛙（防禦）★1～3。 */
/* 擬合要數「次數」，cell 只回比率，所以這裡直接呼叫 simulate */
function rates(scen, exp = 0.5, reps = 12) {
  let a = 0, b = 0, c = 0, e = 0;
  HUNTERS.filter(p => ok(p.wpm)).forEach((p, i) => {
    for (const st of [1, 2, 3]) for (let k = 0; k < reps; k++) {
      const pp = { ...p, tier: p.tier || 'B', weapon: 'staff', acc: p.acc };
      const seed = (i * 997 + st * 31 + k) * 13 + 5;
      const x = simulate(pp, 'coo', 'grass', st, exp, seed, { ...DEFAULT_ASSUME, ...scen });
      const y = simulate(pp, 'frog', 'grass', st, exp, seed + 1, { ...DEFAULT_ASSUME, ...scen });
      a += x.dodgeOk; b += x.dodgeAll; c += y.defOk; e += y.defAll;
    }
  });
  return { dodge: a / b, def: c / e, nd: b, nf: e };
}
const bis = (f, target, lo, hi, inc = true) => { for (let i = 0; i < 18; i++) { const mid = (lo + hi) / 2; if ((f(mid) < target) === inc) lo = mid; else hi = mid; } return (lo + hi) / 2; };
const wilson = (k, n, z = 1.96) => { const p = k / n, c = (p + z * z / (2 * n)) / (1 + z * z / n), h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / (1 + z * z / n); return [c - h, c + h]; };

export const REAL_RATE = { dodge: 56 / 105, def: 49 / 78 };
export function doFit(verbose) {
  const dLo = wilson(56, 105)[0], dHi = wilson(56, 105)[1], fLo = wilson(49, 78)[0], fHi = wilson(49, 78)[1];
  /* att：attendDodge／attendDef（0＝站著不動、1＝每次都躲） */
  const ad = t => bis(a => rates({ attendDodge: a, attendDef: 1 }).dodge, t, 0, 1), af = t => bis(a => rates({ attendDodge: 1, attendDef: a }).def, t, 0, 1);
  const att = { pt: { attendDodge: ad(REAL_RATE.dodge), attendDef: af(REAL_RATE.def) }, lo: { attendDodge: ad(dLo), attendDef: af(fLo) }, hi: { attendDodge: ad(dHi), attendDef: af(fHi) } };
  /* slow：紅線出現後的反應時間（秒）。單一 react 要同時對上閃避與防禦；dodge、def 各自擬合一次，看是否一致 */
  const rd = t => bis(m => rates({ react: [m, m] }).dodge, t, 0.5, 8, false), rf = t => bis(m => rates({ react: [m, m] }).def, t, 0.5, 8, false);
  const slow = { dodgeMu: rd(REAL_RATE.dodge), defMu: rf(REAL_RATE.def) };
  if (verbose) {
    const s0 = rates({}), a0 = rates(att.pt), sl = rates({ react: [slow.dodgeMu, slow.dodgeMu] }), sl2 = rates({ react: [slow.defMu, slow.defMu] });
    P(`真實：閃避 56/105＝${pct(REAL_RATE.dodge)}（Wilson ${pct(dLo)}～${pct(dHi)}）、防禦 49/78＝${pct(REAL_RATE.def)}（Wilson ${pct(fLo)}～${pct(fHi)}）；擬合群＝有速度又打過狩獵的 ${HUNTERS.filter(p => ok(p.wpm)).length} 人，咕咕鳥／泡泡蛙 ★1～3、exp 0.5`);
    P(`spec（人人都躲）：閃避 ${pct(s0.dodge)}、防禦 ${pct(s0.def)}`);
    P(`att 不注意型：attendDodge ${f2(att.pt.attendDodge)}（Wilson 區間 ${f2(att.lo.attendDodge)}～${f2(att.hi.attendDodge)}）、attendDef ${f2(att.pt.attendDef)}（${f2(att.lo.attendDef)}～${f2(att.hi.attendDef)}）→ 閃避 ${pct(a0.dodge)}、防禦 ${pct(a0.def)}`);
    P(`slow 反應慢型（單一 react）：要對上閃避 53% 需 ${f2(slow.dodgeMu)} 秒（此時防禦 ${pct(sl.def)}）；要對上防禦 63% 需 ${f2(slow.defMu)} 秒（此時閃避 ${pct(sl2.dodge)}）`);
    const sm = rates({ react: [2.5, 2.5] });
    P(`slow 折衷（後面各表用的 slow 假設）：react 2.5 秒 → 閃避 ${pct(sm.dodge)}、防禦 ${pct(sm.def)}`);
    P(`（站著不動的閃避成功率：咕咕鳥單線 2/3、夾擊 1/3，★1～3 平均 ${pct(rates({ attendDodge: 0, attendDef: 1 }).dodge)}；站著不動防禦＝0）`);
  }
  return { att, slow };
}

let FIT = null;
const fit = () => FIT || (FIT = doFit(false));
export const scenarios = () => {
  const f = fit();
  return {
    spec: {}, att: f.att.pt, attLo: f.att.lo, attHi: f.att.hi,
    /* 單一 react 對不上兩個成功率（閃避要 2.7 秒、防禦要 2.3 秒），取折衷 2.5 秒，結果的兩個成功率見 fit 輸出 */
    slow: { react: [2.5, 2.5] }
  };
};

/* ── 人物 ──
   真實分位數。層級：gear.mjs 把 P25(7) 標成 A（7×0.75<6 → A），但真實 7～8 字/分的人 81% 是 B（沒層級的也當 B），
   所以 p10、p25 都給 A 與 B 兩個版本（A＝gear.mjs 的假設，B＝遊戲裡多數人的實際），其餘用最可能的層級。 */
const mk = (name, wpm, tier) => [name, { wpm, acc: ACC, tier, weapon: 'staff' }];
const quant = (a, p) => { const s = a.slice().sort((x, y) => x - y), i = (s.length - 1) * p, l = Math.floor(i), h = Math.ceil(i); return s[l] + (s[h] - s[l]) * (i - l); };
const W = REAL.map(p => p.wpm);
export const PERSONAS = Object.fromEntries([
  mk('極慢 p5（3）', quant(W, .05), 'B'), mk('慢 p10（4.3）A層', quant(W, .10), 'A'), mk('慢 p10（4.3）B層', quant(W, .10), 'B'),
  mk('慢 p25（7）A層', quant(W, .25), 'A'), mk('慢 p25（7）B層', quant(W, .25), 'B'),
  mk('中 p50（11）B層', quant(W, .5), 'B'), mk('中上 p75（18）C層', quant(W, .75), 'C'),
  mk('快 p90（25.7）C層', quant(W, .9), 'C'), mk('極快（45）D層', 45, 'D')
]);

/* ── gear：G3a／G4／G6／G8 在不同假設下 ── */
function runGear() {
  const S = scenarios();
  P('\n## gear：驗收項目在三種假設下重跑（每格 ' + N + ' 場）');
  const slowP = ['慢 p25（7）A層', '慢 p25（7）B層', '慢 p10（4.3）A層', '慢 p10（4.3）B層'];
  const rows = [];
  P('\n### G3a 炎牙狼★1：綠全身 +3 的勝率變化（炎牙狼不攻擊，所以跟閃避率無關）');
  for (const pn of [...slowP, '中 p50（11）B層']) {
    const p = PERSONAS[pn]; const a = cell(p, 'wolf1', 'none', {}, N, 1), b = cell(p, 'wolf1', 'greenAll3', {}, N, 1);
    P(`  ${pn}：${pct(a.win)} → ${pct(b.win)}（${sg((b.win - a.win) * 100)}pp）`);
  }
  P('\n### G4 慢手穿綠全身 +5 的勝率（炎牙狼★5）');
  for (const pn of [...slowP, '中 p50（11）B層']) {
    const p = PERSONAS[pn]; const a = cell(p, 'wolf5', 'none', {}, N, 2), b = cell(p, 'wolf5', 'greenAll5', {}, N, 2), c = cell(p, 'wolf5', 'greenW5', {}, N, 2);
    P(`  ${pn}：無裝備 ${pct(a.win)} → 綠全身+5 ${pct(b.win)}（${sg((b.win - a.win) * 100)}pp）；只換綠武器+5 ${pct(c.win)}（${sg((c.win - a.win) * 100)}pp）`);
  }
  P('\n### G6a／G6b 護腳與護手（慢手；咕咕鳥★5 閃避、泡泡蛙★3 防禦）');
  for (const [sn, sc] of Object.entries({ spec: S.spec, att: S.att, slow: S.slow })) {
    P(`  [${sn}]`);
    for (const pn of slowP) {
      const p = PERSONAS[pn];
      const a = cell(p, 'coo5', 'none', sc, N, 3), b = cell(p, 'coo5', 'boots3', sc, N, 3), c = cell(p, 'frog3', 'none', sc, N, 3), d = cell(p, 'frog3', 'gloves3', sc, N, 3);
      P(`    ${pn}：護腳+3 閃避成功 ${pct(a.dodge)}→${pct(b.dodge)}（${sg((b.dodge - a.dodge) * 100)}pp）；護手+3 重壓防禦 ${pct(c.def)}→${pct(d.def)}（${sg((d.def - c.def) * 100)}pp）`);
    }
  }
  P('\n### G8 狼也攻擊（資訊用；老師已決定 2b 不開）— 本腳本不重跑，見 gear.mjs --attend');
}

/* ── def：防具的實際價值 ── */
function runDef() {
  const S = scenarios();
  P('\n## def：防具在不同閃避／防禦假設下的價值（每格 ' + N + ' 場）');
  P('欄位：贏％／被打倒（3 次）失敗％／每場倒下次數／每場被打中次數／閃避成功／防禦成功');
  const targets = [['coo3', '咕咕鳥★3'], ['coo5', '咕咕鳥★5'], ['frog3', '泡泡蛙★3'], ['frog5', '泡泡蛙★5']];
  const gks = ['none', 'helm3', 'armor3', 'gloves3', 'boots3', 'def3', 'def5', 'boots5b'];
  for (const [sn, sc] of Object.entries({ spec: S.spec, att: S.att, slow: S.slow })) {
    P(`\n[${sn}] ${JSON.stringify(sc).slice(0, 100)}`);
    for (const pn of ['慢 p25（7）B層', '中 p50（11）B層', '快 p90（25.7）C層']) {
      const p = PERSONAS[pn];
      for (const [mon, mn] of targets) {
        const line = gks.map(gk => { const c = cell(p, mon, gk, sc, N, 5); return `${gk}:${pct(c.win)}/${pct(c.failDown)}/${f2(c.downs)}/${f1(c.hits)}/${pct(c.dodge)}/${pct(c.def)}`; });
        P(`  ${pn.padEnd(16)} ${mn}  ${line.join('  ')}`);
      }
    }
  }
}

/* ── slam：重壓三線各打一次 ── */
function runSlam() {
  const S = scenarios();
  P('\n## slam：重壓沒擋住＝三條線各打一次（現況 ×3）vs 假如只打一次（對照用，遊戲沒有）（每格 ' + N + ' 場）');
  P('欄位：贏％／倒下失敗％／至少倒下 1 次％／每場倒下次數／每場重壓次數／防禦成功／每場損血');
  const ps = ['慢 p25（7）B層', '中 p50（11）B層', '快 p90（25.7）C層', '極快（45）D層'];
  for (const [sn, sc] of Object.entries({ spec: S.spec, att: S.att, attHi: S.attHi, slow: S.slow })) {
    P(`\n[${sn}] ${JSON.stringify(sc).slice(0, 90)}`);
    for (const pn of ps) {
      for (const mon of ['frog1', 'frog3', 'frog5']) {
        const p = PERSONAS[pn];
        const t = cell(p, mon, 'none', sc, N, 7), o = cell(p, mon, 'none', { ...sc, slamOnce: true }, N, 7);
        const g = cell(p, mon, 'armor3', sc, N, 7), h = cell(p, mon, 'def3', sc, N, 7);
        const fmt = c => `贏${pct(c.win)}／倒敗${pct(c.failDown)}／≥1倒${pct(c.anyDown)}／倒${f2(c.downs)}／重壓${f1(c.slams)}／防${pct(c.def)}／損血${Math.round(c.hpLost)}`;
        P(`  ${pn.padEnd(16)} ${mon}  三線 ${fmt(t)}\n  ${' '.repeat(22)}只一次 ${fmt(o)}\n  ${' '.repeat(22)}三線＋綠盔甲+3 ${fmt(g)}\n  ${' '.repeat(22)}三線＋四件綠防具+3 ${fmt(h)}`);
      }
    }
  }
}

/* ── real：逐人 ── */
const BANDS = [[0, 4], [5, 6], [7, 8], [9, 12], [13, 17], [18, 28], [29, 9999]];
const bandOf = w => BANDS.findIndex(([lo, hi]) => w >= lo && w <= hi);
export function runReal(nPer = 120) {
  const S = scenarios();
  const tierRule = p => p.tier || 'B';
  P(`\n## real：${REAL.length} 個真實學生逐人模擬（每人每格 ${nPer} 場；層級＝匯出檔的，沒有就 B＝遊戲現況；acc 用各自的；其餘假設同 gear.mjs）`);
  const mons = ['wolf1', 'wolf3', 'wolf5', 'coo5', 'frog3', 'shroom5'];
  const gks = ['none', 'grayW5', 'greenW5', 'greenAll3', 'greenAll5'];
  for (const [sn, sc] of Object.entries({ spec: S.spec, att: S.att })) {
    P(`\n[${sn}]${FLOOR != null ? '（速度下限 ' + FLOOR + '）' : ''}`);
    const res = {};   // res[mon][gk] = 每人勝率陣列
    REAL.forEach((p0, i) => {
      const p = { ...p0, tier: tierRule(p0), weapon: 'staff' };
      for (const mon of mons) for (const gk of gks) { (res[mon] ||= {})[gk] ||= []; res[mon][gk].push(cell(p, mon, gk, sc, nPer, 9000 + i, 0.5).win); }
    });
    P('每個魔物：全班平均勝率（無裝備／灰武器+5／綠武器+5／綠全身+3／綠全身+5）；「改變勝負」＝綠全身+5 的勝率比無裝備高 ≥20pp 的人占全班％；「速度決定」＝無裝備 ≥90% 或 綠全身+5 ≤10%；「中間帶」＝其餘');
    for (const mon of mons) {
      const r = res[mon], nn = REAL.length;
      const m = gk => r[gk].reduce((a, b) => a + b, 0) / nn;
      const flip = r.none.filter((x, i) => r.greenAll5[i] - x >= 0.2).length / nn;
      const dec = r.none.filter((x, i) => x >= 0.9 || r.greenAll5[i] <= 0.1).length / nn;
      const flipW = r.none.filter((x, i) => r.greenW5[i] - x >= 0.2).length / nn;
      const flipG = r.none.filter((x, i) => r.grayW5[i] - x >= 0.2).length / nn;
      const cross = r.none.filter((x, i) => x < 0.5 && r.greenAll5[i] >= 0.5).length / nn;
      P(`  ${mon}：${pct(m('none'))}／${pct(m('grayW5'))}／${pct(m('greenW5'))}／${pct(m('greenAll3'))}／${pct(m('greenAll5'))}　多贏（平均）${sg((m('greenAll5') - m('none')) * 100)}pp　改變勝負（≥+20pp）${pct(flip)}（只換綠武器 ${pct(flipW)}、只換灰武器+5 ${pct(flipG)}）　從<50%變≥50% ${pct(cross)}　速度決定 ${pct(dec)}　中間帶 ${pct(1 - dec)}`);
    }
    P('依速度段（無裝備 → 綠全身+5 的平均勝率；括號＝人數）');
    for (const mon of ['wolf1', 'wolf5', 'coo5', 'frog3']) {
      const cells = BANDS.map(([lo, hi], bi) => {
        const idx = REAL.map((p, i) => i).filter(i => bandOf(REAL[i].wpm) === bi);
        const m = gk => idx.reduce((a, i) => a + res[mon][gk][i], 0) / idx.length;
        return `${lo}～${hi > 999 ? '' : hi}(${idx.length}) ${pct(m('none'))}→${pct(m('greenAll5'))}`;
      });
      P(`  ${mon}：${cells.join('　')}`);
    }
  }
}

/* 50% 勝率的門檻速度（二分法，用代表性學生）：沒裝備與有裝備差幾倍 */
function thresholds() {
  P('\n## thr：各魔物、各層級的「50% 勝率門檻速度」（bestWpm，字/分；acc 同全班中位）— 速度低於它的人，無裝備多半贏不了');
  const gks = ['none', 'greenW5', 'greenAll5', 'blueW5'];
  for (const mon of ['wolf1', 'wolf3', 'wolf5', 'coo5', 'frog3']) for (const t of ['A', 'B', 'C']) {
    const th = gk => bis(w => cell({ wpm: w, acc: ACC, tier: t, weapon: 'staff' }, mon, gk, {}, 300, 31, 0.5).win, 0.5, 1, 80);
    const v = gks.map(th);
    const fr = x => REAL.filter(p => (p.tier || 'B') === t ? false : false).length;
    const share = (lo, hi) => REAL.filter(p => p.wpm >= lo && p.wpm < hi).length / REAL.length;
    P(`  ${mon} 層${t}：${gks.map((g, i) => `${g} ${v[i].toFixed(1)}`).join('　')}　→ 綠全身+5 讓門檻低 ${((1 - v[2] / v[0]) * 100).toFixed(0)}%；全班有 ${pct(share(v[2], v[0]))} 落在 [${v[2].toFixed(1)}, ${v[0].toFixed(1)}) 這段（不分層級）`);
  }
}

/* ── tier ── */
function runTier() {
  const S = scenarios();
  P('\n## tier：沒層級的人被當 B（遊戲現況）的影響');
  P('### 代表人物：同一個速度、不同層級（無裝備／綠全身+3／綠全身+5；贏％（贏的平均秒數））');
  for (const [name, wpm] of [['慢 p10（4.3）', 4.3], ['慢 p25（7）', 7], ['中 p50（11）', 11], ['中上 p75（18）', 18], ['快 p90（25.7）', 25.7], ['極快（45）', 45]]) for (const mon of ['coo1', 'wolf1', 'wolf3', 'wolf5', 'frog3']) {
    const line = ['A', 'B', 'C', 'D'].map(t => {
      const p = { wpm, acc: ACC, tier: t, weapon: 'staff' };
      const f = gk => { const c = cell(p, mon, gk, S.att, Math.min(N, 600), 41); return `${pct(c.win)}(${Number.isFinite(c.secs) ? Math.round(c.secs) + 's' : '--'})`; };
      return `${t}:${f('none')}/${f('greenAll3')}/${f('greenAll5')}`;
    });
    P(`  ${name.padEnd(14)} ${mon.padEnd(7)} ${line.join('  ')}`);
  }
  P('\n### 人口版：沒層級的人（117 人）現況＝B vs 用 tierFromWpm（6／14／28）回推；有層級的人另列對照');
  const no = REAL.filter(p => !p.tier), has = REAL.filter(p => p.tier);
  P(`沒層級 ${no.length}、有層級 ${has.length}；沒層級者回推：` + ['A', 'B', 'C', 'D'].map(t => `${t} ${no.filter(p => tierFromWpm(p.wpm) === t).length}`).join('、'));
  for (const mon of ['coo1', 'shroom3', 'wolf1', 'wolf3', 'wolf5']) for (const gk of ['none', 'greenAll5']) {
    const m = (arr, ruleFn) => arr.reduce((a, p, i) => a + cell({ ...p, tier: ruleFn(p), weapon: 'staff' }, mon, gk, S.att, 100, 9500 + i, 0.5).win, 0) / arr.length;
    const t = (arr, ruleFn) => { let s = 0, n = 0; arr.forEach((p, i) => { const c = cell({ ...p, tier: ruleFn(p), weapon: 'staff' }, mon, gk, S.att, 100, 9500 + i, 0.5); if (Number.isFinite(c.secs)) { s += c.secs * c.win; n += c.win; } }); return n ? s / n : NaN; };
    const cur = p => 'B', inf = p => tierFromWpm(p.wpm);
    const big = no.filter((p, i) => Math.abs(cell({ ...p, tier: 'B', weapon: 'staff' }, mon, gk, S.att, 100, 9500 + i, 0.5).win - cell({ ...p, tier: tierFromWpm(p.wpm), weapon: 'staff' }, mon, gk, S.att, 100, 9500 + i, 0.5).win) >= 0.2).length;
    P(`  ${mon} ${gk.padEnd(9)} 沒層級者：現況 B ${pct(m(no, cur))}（贏的平均 ${f1(t(no, cur))}s）｜回推 ${pct(m(no, inf))}（${f1(t(no, inf))}s）｜差 ≥20pp 的有 ${big} 人（${pct(big / no.length)}）　有層級者（用自己的）${pct(m(has, p => p.tier))}`);
  }
  P('\n### 快手被當 B：最快過關時間與可疑旗標（FASTEST_FLOOR）');
  for (const [name, wpm, trueT] of [['p90（25.7）', 25.7, 'C'], ['p95（41）', 41.4, 'D'], ['極快（45）', 45, 'D'], ['極快（72）', 72, 'D']]) for (const mon of ['coo1', 'frog1', 'shroom1', 'wolf1']) {
    const f = t => { let mn = 1e9; for (let k = 0; k < 150; k++) { const r = simulate({ wpm, acc: 100, tier: t, weapon: 'bow' }, MON[mon][1], MON[mon][0], 1, 1, 6000 + k, { ...DEFAULT_ASSUME }, { gear: GEAR.maxAll || statsOf(all5(1, 5)) }); if (r.result === 'win') mn = Math.min(mn, r.secs); } return mn; };
    const mb = f('B'), mt = f(trueT), fl = FASTEST_FLOOR[MON[mon][1]];
    P(`  ${name} ${mon}（穿全綠+5）：當 B 最快 ${f1(mb)}s、真實層級${trueT}最快 ${f1(mt)}s、FASTEST_FLOOR ${fl}s → 當 B ${mb < fl ? '低於下限（會被標 ⚠）' : '沒低於下限'}`);
  }
}

/* ── armor：盔甲「受傷少 N%」在整數傷害下實際少幾點（resolveStrike：Math.max(1, Math.round(dmg × (1 − cut))) ） ── */
function runArmor() {
  P('\n## armor：盔甲在整數傷害下的實際效果（每一擊少幾點；括號＝名義上該少幾點）');
  const cuts = [['灰+0', 0.04], ['灰+5', 0.09], ['綠+0', 0.07], ['綠+5', 0.12], ['藍+0', 0.10], ['藍+5', 0.15]];
  P('招式（區域 ★）傷害 → ' + cuts.map(c => c[0] + '(' + Math.round(c[1] * 100) + '%)').join('　'));
  for (const [mk, rk, atkIdx, nm] of [['coo', 'grass', 0, '咕咕鳥 衝刺啄'], ['frog', 'grass', 0, '泡泡蛙 泡泡雨（重壓，三線各打一次，下面是單擊）']]) {
    for (const star of [1, 2, 3, 4, 5]) {
      const lv = regionLv(rk, star), mul = MONSTERS[mk].attacks[atkIdx].mul, d = monDmg(lv, mul);
      const row = cuts.map(([n, c]) => { const e = Math.max(1, Math.round(d * (1 - c))); return `${d - e}(${(d * c).toFixed(1)})`; });
      P(`  ${nm} ${rk === 'grass' ? '草原' : '森林'}★${star}（Lv${lv}）每擊 ${d}：${row.join('　')}`);
    }
  }
  const d1 = monDmg(regionLv('grass', 3), 0.9);
  P(`  例：泡泡蛙★3 重壓沒擋住＝三擊，每擊 ${d1}，合計 ${d1 * 3}；穿綠盔甲+3(10%) 每擊 ${Math.max(1, Math.round(d1 * .9))}、合計 ${3 * Math.max(1, Math.round(d1 * .9))}（少 ${d1 * 3 - 3 * Math.max(1, Math.round(d1 * .9))} 點／${BAL.playerHp} 血）`);
  P('  頭盔：灰+0 生命+10、綠+0 +20、藍+0 +30、每 +1 再 +2（對照：盔甲全部加起來最多少 ~15%）');
  P(`  預警秒數 W＝LANE_W ${JSON.stringify(LANE_W)}；重壓預警＝W×1.1；護腳＝灰0.10／綠0.20／藍0.30，+5 再加 0.15 → 占 B 層預警 2.5 秒的 ${(0.10 / 2.5 * 100).toFixed(0)}%～${(0.45 / 2.5 * 100).toFixed(0)}%`);
}

/* ── quant：真實分位數的人，在不同裝備下的勝率（G4 的分位版） ──
   層級：遊戲現況（沒層級＝B）。≤p50 幾乎都是 B（7～12 字/分的人 81～94% 是 B）；p75、p90 用 C 與 B 各算一次 */
function runQuant() {
  P('\n## quant：真實分位數 × 裝備（勝率；每格 ' + N + ' 場；不攻擊的炎牙狼，所以跟閃避率無關）');
  P('欄位：無裝備 → 灰武器+5（做 4 次強化就有，約 9 個灰材料＋300 字元）→ 綠武器+5 → 綠全身+5');
  for (const [name, pr, tiers] of [['極慢 p5', .05, ['B']], ['慢 p10', .10, ['B']], ['p25', .25, ['B']], ['中 p50', .5, ['B']], ['p75', .75, ['C', 'B']], ['快 p90', .9, ['C', 'B']]]) for (const t of tiers) {
    const p = { wpm: quant(W, pr), acc: ACC, tier: t, weapon: 'staff' };
    const out = ['wolf1', 'wolf3', 'wolf5', 'coo5', 'frog3'].map(mon => {
      const g = gk => pct(cell(p, mon, gk, scenarios().att, N, 11).win);
      return `${mon} ${g('none')}→${g('grayW5')}→${g('greenW5')}→${g('greenAll5')}`;
    });
    P(`  ${name}（${p.wpm.toFixed(1)}，${t}層）：${out.join('　')}`);
  }
}
/* ── sens：模型最不確定的兩個係數（戰鬥中速度÷最高速度 avgOfBest、速度下限 cpmFloor）對「裝備能改變勝負」比例的影響 ── */
function runSens() {
  const S = scenarios();
  P('\n## sens：avgOfBest（戰鬥中平均速度÷歷史最高；預設 0.75）與 cpmFloor（預設 4）的敏感度（逐人 60 場，att 假設）');
  P('欄位：全班平均勝率 無裝備→綠全身+5；改變勝負（≥+20pp）占全班％');
  for (const [lab, extra] of [['avgOfBest 0.60', { avgOfBest: 0.6 }], ['avgOfBest 0.75（預設）', {}], ['avgOfBest 0.90', { avgOfBest: 0.9 }], ['cpmFloor 1（avgOfBest 0.75）', { cpmFloor: 1 }]]) {
    const out = ['wolf1', 'wolf3', 'wolf5', 'coo5', 'frog3'].map(mon => {
      let a = 0, b = 0, f = 0;
      REAL.forEach((p0, i) => {
        const p = { ...p0, tier: p0.tier || 'B', weapon: 'staff' };
        const x = cell(p, mon, 'none', S.att, 60, 7000 + i, 0.5, extra).win, y = cell(p, mon, 'greenAll5', S.att, 60, 7000 + i, 0.5, extra).win;
        a += x; b += y; if (y - x >= 0.2) f++;
      });
      return `${mon} ${pct(a / REAL.length)}→${pct(b / REAL.length)}（改變勝負 ${pct(f / REAL.length)}）`;
    });
    P(`  ${lab.padEnd(26)}${out.join('　')}`);
  }
}
/* ── g8：炎牙狼也攻擊（老師已決定 2b 不開；這裡只量「真實閃避／防禦率下開了會怎樣」） ── */
function runG8() {
  const S = scenarios();
  P('\n## g8：炎牙狼★5 開攻擊（飛撲、連咬、火焰衝擊）：勝率 不攻擊｜攻擊（無裝備／灰全身／綠全身+3／綠全身+5）；倒下次數（無裝備、攻擊）');
  const people = [...SPEC6.filter(([n]) => n === '四年級・中' || n === '五年級・中'), ['中 p50（11）B層', PERSONAS['中 p50（11）B層']], ['p25（7）B層', PERSONAS['慢 p25（7）B層']], ['p75（18）C層', PERSONAS['中上 p75（18）C層']]];
  for (const [sn, sc] of Object.entries({ spec: S.spec, att: S.att, slow: S.slow })) {
    P(`  [${sn}]`);
    for (const [pn, p0] of people) {
      const p = { ...p0, acc: p0.acc || ACC };
      const a = cell(p, 'wolf5', 'none', sc, N, 13), b = ['none', 'grayAll', 'greenAll3', 'greenAll5'].map(g => cell(p, 'wolf5', g, sc, N, 13, 0.5, {}, true));
      P(`    ${pn}：${pct(a.win)}｜${b.map(c => pct(c.win)).join('／')}　倒下 ${f2(b[0].downs)} 次/場、被打中 ${f1(b[0].hits)}、閃避 ${pct(b[0].dodge)}、防禦 ${pct(b[0].def)}`);
    }
  }
}
const run = { g8: runG8, sens: runSens, quant: runQuant, armor: runArmor, fit: () => doFit(true), gear: runGear, def: runDef, slam: runSlam, real: () => runReal(), thr: thresholds, tier: runTier };
if (cmd === 'all') for (const k of Object.keys(run)) { P(`\n######## ${k}`); run[k](); }
else if (run[cmd]) run[cmd]();
else { console.error('用法：node tools/nw-sim/bal2b.mjs <fit|gear|def|slam|real|thr|tier|armor|quant|sens|g8|all> [--n 1000] [--floor 4] [--weapon-per 2] [--file 匯出檔]'); process.exit(2); }
