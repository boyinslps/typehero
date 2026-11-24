/* 逐場模擬（sim.mjs＋rules-v2.mjs 的 V2 規則）對解析模型（curves.mjs 的 v2 一節）的驗證：SPEC-BALANCE-V2 §7 第 1 步的驗收「勝率差 ≤5pp、秒數差 ≤10%」。
   用法：node tools/nw-sim/v2-validate.mjs [--n 1000] [--persona p10,p50,p90] [--flow none,guard,vine] [--gear 無|綠全身+5…] [--real <profiles.json>] [--md]
   做法：
     同一個人（速度、逐字正確率）、同一隻魔物、同一組流派，解析模型出一個勝率與秒數；逐場模擬用四種武器各 n/4 場（解析模型的 weapon＝'mean' 是四把平均）。
     逐場模擬的假設對齊解析模型：每場的手感差 sigmaB＝0.20（解析的 σ_b）、速度下限 0.3（解析的 max(0.3, …)）、attendDodge 0.11／attendDef 0.73、熟練度 0.5。
     勝率：逐場 cap＝480（到了＝逃走）。秒數：另跑一組不設逃走（cap＝3000），取「打贏的場」的中位數，對解析的 T（打完需要的秒數，含倒下休息與換線的時間）。
     秒數只在「兩邊勝率都 ≥ 30%」的格子比，不然逐場那邊只剩下沒被倒下淘汰的那些場，偏快。
   不做的：不調任何模型參數讓兩邊對上；差多少就寫多少。 */
import { readFileSync } from 'node:fs';
import { P, V2PRESET, applyGearV2, winV2, NOGEAR, PRESETS, quantile, realQ, comboMul } from './curves.mjs';
import { simulate, DEFAULT_ASSUME } from './sim.mjs';
import { v2Rules, RULE_SOURCE } from './rules-v2.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : args[i + 1]; };
const N = +opt('--n', 1000), MD = args.includes('--md');
const PERSONA = opt('--persona', 'p10,p50,p90').split(','), FLOWS = opt('--flow', 'none,guard,vine').split(',');
const GEARK = opt('--gear', '無'), SIGMA_B = +opt('--sigma', 'NaN');

const p = structuredClone(P); Object.assign(p, structuredClone(V2PRESET(true)));
if (opt('--real', null)) {
  p.real = JSON.parse(readFileSync(opt('--real'), 'utf8'));
  const w = p.real.map(r => r.wpm).sort((a, b) => a - b), q = f => w[Math.min(w.length - 1, Math.floor(f * w.length))];
  p.median = q(0.5); p.sigma = (Math.log(q(0.75)) - Math.log(q(0.25))) / 1.349; p.persona = { slow: q(0.25), mid: q(0.5), fast: q(0.9) }; p.veryFast = q(0.97);
}
applyGearV2();
const gear = GEARK === '無' ? NOGEAR : PRESETS[GEARK];
if (!gear) { console.error('沒有這組裝備：' + GEARK + '（可用：' + Object.keys(PRESETS).join('、') + '）'); process.exit(2); }
const r1 = x => Math.round(x * 10) / 10;
const PV = { p10: [p.real ? realQ(p, 0.1) : r1(quantile(0.1, p)), p.acc.slow], p25: [p.persona.slow, p.acc.slow], p50: [p.persona.mid, p.acc.mid], p90: [p.persona.fast, p.acc.fast], p97: [p.veryFast, 0.99] };
const SC = [['grass', 'coo', 1], ['grass', 'frog', 3], ['grass', 'shroom', 3], ['grass', 'coo', 5], ['grass', 'shroom', 5], ['forest', 'wolf', 1], ['forest', 'wolf', 3], ['forest', 'wolf', 5]];
const MN = { coo: '咕咕鳥', frog: '泡泡蛙', shroom: '跳跳菇', wolf: '炎牙狼' }, FN = { none: '一般', guard: '守護', vine: '藤蔓' };
const WEAPONS = ['staff', 'bow', 'dagger', 'crossbow'];
const pc = x => Math.round(x * 100), s0 = x => Number.isFinite(x) ? Math.round(x) : '--', sg = x => Number.isFinite(x) ? (x >= 0 ? '+' : '') + Math.round(x * 10) / 10 : '--';
const med = a => { if (!a.length) return NaN; const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

/* 逐場一格：wins＝cap 480 的勝率；secs＝不設逃走時打贏的場的中位秒數 */
function mcCell(v, a, sc, flow, ci, extraA = {}) {
  const per = Math.ceil(N / WEAPONS.length), A = { ...DEFAULT_ASSUME, attendDodge: p.v2.attendDodge, attendDef: p.v2.attendDef, cpmFloor: 0.3, sigmaB: Number.isFinite(SIGMA_B) ? SIGMA_B : p.sigmaB, ...extraA };
  const rules = cap => v2Rules({ flow, over: { cap } });
  let win = 0, esc = 0, fail = 0, downs = 0, n = 0, share = 0; const secs = [];
  for (const [wi, weapon] of WEAPONS.entries()) for (let k = 0; k < per; k++) {
    const pp = { wpm: v, acc: (a + 0.02) * 100, weapon }, seed = ci * 100003 + wi * 9973 + k * 7 + 11;
    const r = simulate(pp, sc[1], sc[0], sc[2], p.exp, seed, { ...A, rules: rules(p.v2.cap) }, { gear });
    n++; downs += r.downs; share += r.flowShare;
    if (r.result === 'win') win++; else if (r.result === 'escape') esc++; else fail++;
    const r2 = simulate(pp, sc[1], sc[0], sc[2], p.exp, seed, { ...A, rules: rules(3000) }, { gear });
    if (r2.result === 'win') secs.push(r2.secs);
  }
  return { win: win / n, esc: esc / n, fail: fail / n, downs: downs / n, secs: med(secs), share: share / n, n };
}

/* --ablate：拆解「逐場比解析慢」：逐場的三個結構差異各關掉一個看秒數（一般打法、不設逃走）。
   ①每題打字時間的隨機（qSd 0.3，期望值多 4.6%）②連擊開場爬升（解析用穩態倍率）③其餘＝整數題數的「最後一題多打的」（半題）＋換線／倒下的時間差 */
if (args.includes('--ablate')) {
  console.log('## 拆解：逐場秒數（中位，打贏的場，不設逃走）相對解析 T 的差（一般打法、無裝備）');
  console.log('| 人 | 魔物★ | 解析 T | 逐場 | 關掉題時隨機 | 再固定連擊（穩態） | 剩下的差 |');
  console.log('|---|---|---|---|---|---|---|');
  let ci2 = 900;
  for (const pn of PERSONA) for (const sc of [SC[0], SC[3], SC[7]]) {
    const [v, a] = PV[pn], T = winV2(v, a, ...sc, gear, p, 'none').T, k = comboMul(2, a);
    const run = ex => { const per = Math.ceil(N / 4), secs = [];
      for (const [wi, weapon] of WEAPONS.entries()) for (let i = 0; i < per; i++) { const r = simulate({ wpm: v, acc: (a + 0.02) * 100, weapon }, sc[1], sc[0], sc[2], p.exp, ci2 * 100003 + wi * 9973 + i * 7 + 11, { ...DEFAULT_ASSUME, attendDodge: p.v2.attendDodge, attendDef: p.v2.attendDef, cpmFloor: 0.3, sigmaB: 0, ...ex, rules: v2Rules({ flow: 'none', over: { cap: 3000 } }) }, { gear }); if (r.result === 'win') secs.push(r.secs); }
      return med(secs); };
    const m0 = run({}), m1 = run({ qSd: 0 }), m2 = run({ qSd: 0, fixCombo: k });
    const f = x => `${s0(x)}（${sg((x / T - 1) * 100)}%）`;
    console.log(`| ${pn}(${v}) | ${MN[sc[1]]}★${sc[2]} | ${s0(T)} | ${f(m0)} | ${f(m1)} | ${f(m2)} | ${sg((m2 / T - 1) * 100)}% |`); ci2++;
  }
  process.exit(0);
}
const rows = []; let ci = 0;
for (const pn of PERSONA) for (const fl of FLOWS) for (const sc of SC) {
  const [v, a] = PV[pn], an = winV2(v, a, ...sc, gear, p, fl), mc = mcCell(v, a, sc, fl, ci++);
  rows.push({ pn, v, fl, sc, an, mc, dWin: (mc.win - an.win) * 100, dSecs: Number.isFinite(mc.secs) ? (mc.secs / Math.min(an.T, 3000) - 1) * 100 : NaN, secsOk: an.win >= 0.3 && mc.win >= 0.3 });
}
const out = [];
out.push(`## 逐場模擬 vs 解析模型（每格 ${N} 場＝四種武器各 ${Math.ceil(N / 4)}、裝備：${GEARK}、sigmaB ${Number.isFinite(SIGMA_B) ? SIGMA_B : p.sigmaB}）`);
out.push(`規則來源：${Object.entries(RULE_SOURCE).map(([k, v]) => k + '＝' + v).join('、')}`);
out.push('');
out.push('| 人 | 打法 | 魔物★ | 解析 勝率／秒 | 逐場 勝率／秒 | 勝率差(pp) | 秒數差(%) | 逐場 逃／倒／倒下次數 | 逐場 流派占比 |');
out.push('|---|---|---|---|---|---|---|---|---|');
for (const r of rows) out.push(`| ${r.pn}(${r.v}) | ${FN[r.fl]} | ${MN[r.sc[1]]}★${r.sc[2]} | ${pc(r.an.win)}%／${s0(Math.min(r.an.T, 999))} | ${pc(r.mc.win)}%／${s0(r.mc.secs)} | ${sg(r.dWin)} | ${r.secsOk ? sg(r.dSecs) : '（不比）'} | ${pc(r.mc.esc)}%／${pc(r.mc.fail)}%／${r.mc.downs.toFixed(2)} | ${pc(r.mc.share)}%（解析 ${pc(r.an.flowShare)}%） |`);
out.push('');
const mx = (f, k) => rows.filter(f).reduce((m, r) => Math.max(m, Math.abs(r[k])), 0);
const bad = k => rows.filter(r => k === 'dWin' ? Math.abs(r.dWin) > 5 : r.secsOk && Math.abs(r.dSecs) > 10).length;
out.push(`**彙總**：${rows.length} 格；勝率差最大 ${r1(mx(() => true, 'dWin'))}pp、超過 5pp 的 ${bad('dWin')} 格；秒數差最大 ${r1(mx(r => r.secsOk, 'dSecs'))}%（比了 ${rows.filter(r => r.secsOk).length} 格）、超過 10% 的 ${bad('dSecs')} 格。`);
for (const fl of FLOWS) {
  const rs = rows.filter(r => r.fl === fl), ss = rs.filter(r => r.secsOk);
  out.push(`- ${FN[fl]}：勝率差平均 ${sg(rs.reduce((s, r) => s + r.dWin, 0) / rs.length)}pp、最大 ${r1(Math.max(...rs.map(r => Math.abs(r.dWin))))}pp；秒數差平均 ${ss.length ? sg(ss.reduce((s, r) => s + r.dSecs, 0) / ss.length) : '--'}%、最大 ${ss.length ? r1(Math.max(...ss.map(r => Math.abs(r.dSecs)))) : '--'}%`);
}
console.log(out.join('\n'));
