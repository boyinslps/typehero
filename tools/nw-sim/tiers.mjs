import { readFileSync } from 'node:fs';
import { simulate, DEFAULT_ASSUME } from './sim.mjs';
import { HP_TIER } from '../../nw-data.js';
const profiles = JSON.parse(readFileSync(process.argv[2], 'utf8')).map(p => ({ ...p, tier: ['A', 'B', 'C', 'D'].includes(p.tier) ? p.tier : 'B' }));
const grid = JSON.parse(process.argv[3] || '[0.4,0.5,0.6,0.8,1,1.3,1.7]');
const S = [['frog★1', 'grass', 'frog', 1], ['coo★3', 'grass', 'coo', 3], ['coo★5', 'grass', 'coo', 5], ['wolf★1', 'forest', 'wolf', 1], ['wolf★3', 'forest', 'wolf', 3]];
for (const t of ['A', 'B', 'C', 'D']) {
  const ps = profiles.filter(p => p.tier === t);
  const w = ps.map(p => p.wpm).sort((a, b) => a - b);
  console.log(`\n層級 ${t}：${ps.length} 人，最高速度中位 ${w[Math.floor(w.length / 2)]} 字/分，現在倍率 ${HP_TIER[t]}`);
  for (const m of grid) {
    const cells = S.map(([n, rk, mk, st]) => {
      let win = 0, secs = 0, N = 0;
      ps.forEach((p, i) => { for (let k = 0; k < 25; k++) { const r = simulate(p, mk, rk, st, 0.5, i * 77 + k, { ...DEFAULT_ASSUME, hpMul: m / HP_TIER[t] }); N++; if (r.result === 'win') { win++; secs += r.secs; } } });
      return `${n} ${String(Math.round(win / N * 100)).padStart(3)}%/${win ? Math.round(secs / win) : '--'}s`;
    });
    console.log(`  倍率 ${String(m).padEnd(4)} ${cells.join('  ')}`);
  }
}
