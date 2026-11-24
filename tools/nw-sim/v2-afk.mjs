/* 掛機策略的獎勵比例（SPEC-BALANCE-V2 §3.4、§7 第 1 步驗收：掛機獎勵 ≤ 40%）。逐場模擬，不是解析。
   用法：node tools/nw-sim/v2-afk.mjs [--n 1000] [--gear 綠武器+5] [--wpm 11] [--md]
   策略（都在 sim.mjs 的 A.afkPlay 實作）：
     藤蔓：打 4 題後不動            答 4 題就停手，之後站著不動（不換線、不舉盾）；變體「＋按住 Alt」＝之後只舉盾（重壓擋得到）
     守護：只按 Alt 不打字           從頭到尾一題都不答，只按住 Alt（重壓舉盾、線上攻擊也舉盾→每次都「擋下」→想要自動反擊）
     守護：打 3 題後只按 Alt         答 3 題（剛好滿足「答到 3 題才算有效」），之後只按住 Alt
     守護：打 4 題後不動（站著）     對照：守護流但之後不舉盾也不換線
   每種都跑新規則（§3.4 四條）與舊規則（沒有防掛機：流派一直有效、不封頂、保底 0.3 全給）對照。
   獎勵比例＝sim.mjs 的 reward（贏 1；輸／逃走 0.3a＋0.7f；答不到 3 題又沒贏 0）；每分鐘比＝（獎勵÷花的秒數）÷（同一隻魔物正常打的 獎勵÷秒數）。
   正常打＝同一個人、同裝備、一般打法（不用流派）；逐場用四種武器各 n/4，手感差 sigmaB 0.2，速度下限 0.3，閃避／防禦＝真實 att 假設。 */
import { PRESETS, NOGEAR, applyGearV2 } from './curves.mjs';
import { simulate, DEFAULT_ASSUME } from './sim.mjs';
import { v2Rules, NW_V2 } from './rules-v2.mjs';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : args[i + 1]; };
const N = +opt('--n', 1000), WPM = +opt('--wpm', 11), GEARS = opt('--gear', '綠武器+5,藍火刀+5＋綠+5').split(',');
applyGearV2();
const WEAPONS = ['staff', 'bow', 'dagger', 'crossbow'];
const MON = [['grass', 'shroom', 1], ['grass', 'coo', 5], ['grass', 'frog', 3], ['forest', 'wolf', 1], ['forest', 'wolf', 5]];
const MN = { coo: '咕咕鳥', frog: '泡泡蛙', shroom: '跳跳菇', wolf: '炎牙狼' };
const STRAT = [
  ['藤蔓：打 4 題後不動', 'vine', { nQ: 4, alt: false }],
  ['藤蔓：打 4 題後不動＋按住 Alt', 'vine', { nQ: 4, alt: true }],
  ['守護：只按 Alt 不打字', 'guard', { nQ: 0, alt: true }],
  ['守護：打 3 題後只按 Alt', 'guard', { nQ: 3, alt: true }],
  ['守護：打 4 題後站著不動', 'guard', { nQ: 4, alt: false }]
];
const A0 = { ...DEFAULT_ASSUME, attendDodge: 0.11, attendDef: 0.73, cpmFloor: 0.3, sigmaB: 0.2 };
function cell(gear, [rk, mk, st], flow, afkPlay, afkRule, ci) {
  const per = Math.ceil(N / 4); let rew = 0, secs = 0, win = 0, esc = 0, fail = 0, inval = 0, n = 0, dFlow = 0, dType = 0;
  for (const [wi, weapon] of WEAPONS.entries()) for (let k = 0; k < per; k++) {
    const rules = v2Rules({ flow, afk: afkRule ? undefined : false });
    const r = simulate({ wpm: WPM, acc: 99, weapon }, mk, rk, st, 0.5, ci * 100003 + wi * 9973 + k * 7 + 11, { ...A0, rules, ...(afkPlay ? { afkPlay } : {}) }, { gear });
    n++; rew += r.reward; secs += r.secs; dFlow += r.dFlow; dType += r.dType;
    if (r.result === 'win') win++; else if (r.result === 'escape') esc++; else fail++;
    if (!r.valid) inval++;
  }
  return { rew: rew / n, secs: secs / n, win: win / n, esc: esc / n, fail: fail / n, inval: inval / n, share: dFlow / Math.max(1, dFlow + dType) };
}
const pc = x => Math.round(x * 100) + '%';
const out = []; let worst = 0, worstPm = 0, ci = 0;
out.push(`## 掛機策略獎勵（逐場，每格 ${N} 場；p50＝${WPM} 字/分；新規則＝§3.4 四條；獎勵比例 100%＝贏一場）`);
out.push(`防掛機參數：afkWin ${NW_V2.afkWin} 秒、flowCap ${NW_V2.flowCap}、逃走時流派傷害算 ${NW_V2.escFlow}、保底 ${NW_V2.failBase}（只按有在打字的時間）\n`);
for (const gk of GEARS) {
  const gear = gk === '無' ? NOGEAR : PRESETS[gk];
  if (!gear) { console.error('沒有這組裝備：' + gk + '（可用：' + Object.keys(PRESETS).join('、') + '）'); process.exit(2); }
  out.push(`### 裝備：${gk}（攻擊力 ${gear.atk}）`);
  out.push('| 策略 | 魔物★ | 舊規則：結果／獎勵 | 新規則：贏／逃／輸／不算 | 新規則：獎勵 | 流派傷害占比 | 每分鐘獎勵 ÷ 正常打 |');
  out.push('|---|---|---|---|---|---|---|');
  for (const mo of MON) {
    const base = cell(gear, mo, 'none', null, true, ci++), basePm = base.rew / base.secs;
    for (const [name, flow, play] of STRAT) {
      const o = cell(gear, mo, flow, play, false, ci), nw = cell(gear, mo, flow, play, true, ci++), pm = (nw.rew / nw.secs) / basePm;
      worst = Math.max(worst, nw.rew); worstPm = Math.max(worstPm, pm);
      out.push(`| ${name} | ${MN[mo[1]]}★${mo[2]} | ${pc(o.win)}贏／${pc(o.esc)}逃／${pc(o.fail)}輸 → ${pc(o.rew)} | ${pc(nw.win)}／${pc(nw.esc)}／${pc(nw.fail)}／${pc(nw.inval)} | **${pc(nw.rew)}** | ${pc(nw.share)} | ${pc(pm)} |`);
    }
  }
  out.push('');
}
out.push(`**彙總**：所有格子新規則下獎勵比例最高 ${pc(worst)}（目標 ≤40%）；每分鐘獎勵相對正常打最高 ${pc(worstPm)}。`);
console.log(out.join('\n'));
