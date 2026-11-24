/* 用真實速度名單（data-public/ 的匯出檔，經 load-real.mjs 轉成學生列表）逐人跑 V2 規則的逐場模擬：各組、各魔物、各星級的勝率。
   用法：node tools/nw-sim/v2-real.mjs [--file <匯出檔>] [--n 20] [--floor 4] [--group 0|1|2|3] [--sigma-b 0.2]
     --n      每個人×每格×每種打法 n 場（四種武器輪流；n 最好是 4 的倍數）
     --floor  打字速度下限（sim.mjs 的 cpmFloor；預設 4＝wpm 6.3 以下的人都當 6.3，會高估最慢的人；--floor 1 看影響）
     --group  只跑某一組（0 極慢≤4、1 慢 5～8、2 中 9～17、3 快≥18），方便分開平行跑
   格子輸出：「★1／★2／★3／★4／★5 勝率」。打法：一般、守護、藤蔓、「最好」＝這個人把三種都試過、各格挑勝率最高的（上限）。
   資料限制（見 docs/research/BALANCE-V2-SIM.md）：最高速度不是戰鬥速度；名單裡沒有慢組的新世界戰績；每個人只有一個速度，沒有場間差以外的變化。 */
import { readFileSync } from 'node:fs';
import { toProfiles } from './load-real.mjs';
import { PRESETS, NOGEAR, applyGearV2 } from './curves.mjs';
import { simulate, DEFAULT_ASSUME } from './sim.mjs';
import { v2Rules } from './rules-v2.mjs';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : args[i + 1]; };
const N = +opt('--n', 20), FLOOR = +opt('--floor', 4), SIGMA_B = +opt('--sigma-b', 0.2), ONLY = opt('--group', null);
const FILE = opt('--file', null) || new URL('../../data-public/typehero-speed-20261120.json', import.meta.url);
const profiles = toProfiles(JSON.parse(readFileSync(FILE, 'utf8')));
applyGearV2();
const GROUPS = [['極慢（≤4）', 0, 4], ['慢（5～8）', 5, 8], ['中（9～17）', 9, 17], ['快（≥18）', 18, 999]];
const groupOf = w => GROUPS.findIndex(([, lo, hi]) => w >= lo && w <= hi);
const MONS = [['coo', 'grass', '咕咕鳥'], ['frog', 'grass', '泡泡蛙'], ['shroom', 'grass', '跳跳菇'], ['wolf', 'forest', '炎牙狼']];
const FL = ['none', 'guard', 'vine'], FN = { none: '一般', guard: '守護', vine: '藤蔓', best: '最好' };
const GEARS = [['無', NOGEAR], ['綠全身+5', PRESETS['綠全身+5']]];
const W = ['staff', 'bow', 'dagger', 'crossbow'];
const A = { ...DEFAULT_ASSUME, attendDodge: 0.11, attendDef: 0.73, cpmFloor: FLOOR, sigmaB: SIGMA_B };

const out = [`## 真實名單逐人（V2 規則；每人每格每種打法 ${N} 場；速度下限 ${FLOOR}；sigmaB ${SIGMA_B}；閃避／防禦＝真實 att 假設；熟練度 0.5）`];
for (const [gi, [gname]] of GROUPS.entries()) {
  if (ONLY !== null && +ONLY !== gi) continue;
  const ps = profiles.filter(p => groupOf(p.wpm) === gi);
  out.push(`\n### ${gname}：${ps.length} 人（最高速度中位 ${ps.map(p => p.wpm).sort((a, b) => a - b)[Math.floor(ps.length / 2)]}）`);
  out.push('| 魔物 | ' + GEARS.flatMap(([g]) => ['一般', '守護', '藤蔓', '最好'].map(f => `${g}・${f}`)).join(' | ') + ' |');
  out.push('|---|' + GEARS.flatMap(() => ['---', '---', '---', '---']).join('|') + '|');
  for (const [mk, rk, mn] of MONS) {
    const row = [mn];
    for (const [, gear] of GEARS) {
      const cell = { none: [], guard: [], vine: [], best: [] };
      for (let star = 1; star <= 5; star++) {
        const wins = { none: 0, guard: 0, vine: 0, best: 0 };
        ps.forEach((p, pi) => {
          const w = {};
          for (const fl of FL) { let k = 0; for (let i = 0; i < N; i++) { const r = simulate({ ...p, weapon: W[i % 4] }, mk, rk, star, 0.5, (gi * 1000 + pi) * 100003 + star * 9973 + i * 7 + 11, { ...A, rules: v2Rules({ flow: fl }) }, { gear }); if (r.result === 'win') k++; } w[fl] = k / N; wins[fl] += w[fl]; }
          wins.best += Math.max(w.none, w.guard, w.vine);
        });
        for (const f of Object.keys(cell)) cell[f].push(Math.round(wins[f] / ps.length * 100));
      }
      for (const f of ['none', 'guard', 'vine', 'best']) row.push(cell[f].join('／'));
    }
    out.push('| ' + row.join(' | ') + ' |');
  }
}
console.log(out.join('\n'));
