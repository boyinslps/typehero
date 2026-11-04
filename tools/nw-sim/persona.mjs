import { simulate, DEFAULT_ASSUME } from './sim.mjs';
const P = [
  ['四年級・慢', { wpm: 12, acc: 99.8, tier: 'B', weapon: 'staff' }], ['四年級・中', { wpm: 20, acc: 100, tier: 'B', weapon: 'dagger' }], ['四年級・快', { wpm: 53, acc: 100, tier: 'D', weapon: 'bow' }],
  ['五年級・慢', { wpm: 11, acc: 98, tier: 'A', weapon: 'staff' }], ['五年級・中', { wpm: 18, acc: 100, tier: 'B', weapon: 'staff' }], ['五年級・快', { wpm: 41, acc: 100, tier: 'C', weapon: 'dagger' }]
];
const S = [['泡泡蛙★1', 'grass', 'frog', 1], ['咕咕鳥★1', 'grass', 'coo', 1], ['跳跳菇★3', 'grass', 'shroom', 3], ['咕咕鳥★5', 'grass', 'coo', 5], ['炎牙狼★1', 'forest', 'wolf', 1]];
const A = Object.assign({}, DEFAULT_ASSUME, JSON.parse(process.argv[2] || '{}'));
for (const [name, p] of P) {
  const cpm = (p.wpm * A.avgOfBest * A.dual).toFixed(1);
  console.log(`\n${name}（最高 ${p.wpm} 字/分，平均約 ${cpm}）`);
  for (const [sn, rk, mk, st] of S) {
    let w = 0, secs = 0, dn = 0, ok = 0, all = 0, left = 0; const N = 200;
    for (let i = 0; i < N; i++) { const r = simulate(p, mk, rk, st, 0.2, 900 + i, A); if (r.result === 'win') { w++; secs += r.secs; } dn += r.downs; ok += r.dodgeOk + r.defOk; all += r.dodgeAll + r.defAll; left += r.monLeft; }
    console.log(`  ${sn.padEnd(8)} 贏 ${String(Math.round(w / N * 100)).padStart(3)}%  平均 ${w ? Math.round(secs / w) : '--'}秒  倒下 ${(dn / N).toFixed(1)}  動作成功 ${all ? Math.round(ok / all * 100) : 0}%(${(all / N).toFixed(1)}次/場)  沒贏時魔物剩 ${Math.round(left / Math.max(1, N - w) * 100 / 1)}%`);
  }
}
