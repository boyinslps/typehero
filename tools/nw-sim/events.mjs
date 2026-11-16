/* 活動預設值模擬（docs/SPEC-TEACHER-ADMIN.md §4.2、§4.2b）。
   用法：node tools/nw-sim/events.mjs
   1) 「一週一節課、兩週活動」下，學生打倒 3 隻咕咕鳥（★1）的比例 → 決定 classwar 的 per／goalPct
   2) 各魔物 ★1 最快討伐秒數的下限 → nw-data.js 的 FASTEST_FLOOR（教師頁標 ⚠）
   學生人數與手速是合成的（沒有真實學生資料可用）：手速對數常態、中位 16 字/分，與 persona.mjs 的六個樣本同一個範圍。 */
import { simulate, DEFAULT_ASSUME, rng } from './sim.mjs';
import { MONSTERS } from '../../nw-data.js';

const tierOf = w => (w >= 28 ? 'D' : w >= 14 ? 'C' : w >= 6 ? 'B' : 'A');
const R = rng(2026);
const gauss = () => { let u = 0, v = 0; while (!u) u = R(); while (!v) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const pop = Array.from({ length: 400 }, () => {
  const wpm = Math.max(6, Math.min(70, Math.round(16 * Math.exp(0.5 * gauss()))));
  return { wpm, acc: 94 + R() * 6, tier: tierOf(wpm), weapon: ['staff', 'dagger', 'bow'][Math.floor(R() * 3)] };
});

/* 每人對咕咕鳥 ★1 的單場勝率（新手 exp 0.3） */
const winP = pop.map((p, i) => { let w = 0; for (let k = 0; k < 20; k++) if (simulate(p, 'coo', 'grass', 1, 0.3, i * 100 + k, DEFAULT_ASSUME).result === 'win') w++; return w / 20; });
const avgWin = winP.reduce((a, b) => a + b, 0) / pop.length;
console.log(`咕咕鳥★1 單場勝率：平均 ${(avgWin * 100).toFixed(0)}%，勝率<50% 的人 ${(winP.filter(x => x < .5).length / pop.length * 100).toFixed(0)}%`);

/* 每節課打的場數：1 + 泊松(mean-1)；兩週 = 兩節課。算 n>=k 的比例（蒙地卡羅） */
const poisson = l => { let L = Math.exp(-l), k = 0, p = 1; do { k++; p *= R(); } while (p > L); return k - 1; };
console.log('\n每節課平均場數 × 活動節數 → 打倒 ≥1／≥2／≥3／≥5／≥10 隻的比例（只算有進新世界、有打的人；0 場的人另列）');
for (const lessons of [1, 2, 3]) for (const mean of [2, 3, 4]) {
  const cnt = { 1: 0, 2: 0, 3: 0, 5: 0, 10: 0 }; let N = 0;
  for (let t = 0; t < 4000; t++) {
    const i = Math.floor(R() * pop.length); let games = 0;
    for (let l = 0; l < lessons; l++) games += R() < 0.85 ? 1 + poisson(mean - 1) : 0;   // 15% 的人那節沒去玩新世界
    let wins = 0; for (let g = 0; g < games; g++) if (R() < winP[i]) wins++;
    N++; for (const k of [1, 2, 3, 5, 10]) if (wins >= k) cnt[k]++;
  }
  console.log(`  ${lessons} 節 × 平均 ${mean} 場：≥1 ${(cnt[1] / N * 100).toFixed(0)}%  ≥2 ${(cnt[2] / N * 100).toFixed(0)}%  ≥3 ${(cnt[3] / N * 100).toFixed(0)}%  ≥5 ${(cnt[5] / N * 100).toFixed(0)}%  ≥10 ${(cnt[10] / N * 100).toFixed(0)}%`);
}

/* 最快討伐下限：最快手速（70 字/分、層級 D 以外也試）在各魔物 ★1 的最快秒數 */
console.log('\n各魔物 ★1 最快討伐秒數（極快的人：70 字/分、100%、練熟 exp 1，每魔物 300 場取最小）');
const fast = { wpm: 70, acc: 100, tier: 'D', weapon: 'bow' };
const out = {};
for (const mk of ['coo', 'frog', 'shroom', 'wolf']) {
  const rk = mk === 'wolf' ? 'forest' : 'grass';
  let min = 1e9;
  for (const tier of ['A', 'B', 'C', 'D']) for (let k = 0; k < 75; k++) {
    const r = simulate({ ...fast, tier }, mk, rk, 1, 1, 5000 + k, { ...DEFAULT_ASSUME, wordFast: 1.6 });
    if (r.result === 'win') min = Math.min(min, r.secs);
  }
  out[mk] = Math.floor(min * 0.8);
  console.log(`  ${mk}: 最快 ${min.toFixed(1)} 秒 → 下限（×0.8）${out[mk]} 秒`);
}
console.log('\nFASTEST_FLOOR =', JSON.stringify(out));
