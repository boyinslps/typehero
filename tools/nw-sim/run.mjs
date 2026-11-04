import { readFileSync } from 'node:fs';
import { simulate, DEFAULT_ASSUME } from './sim.mjs';

const file = process.argv[2];
const profiles = JSON.parse(readFileSync(file, 'utf8'));
const over = process.argv[3] ? JSON.parse(process.argv[3]) : {};
const A = Object.assign({}, DEFAULT_ASSUME, over);
const REPS = 30;
const SCEN = [
  ['frog ★1', 'grass', 'frog', 1], ['coo ★1', 'grass', 'coo', 1], ['shroom ★3', 'grass', 'shroom', 3],
  ['coo ★5(Lv12)', 'grass', 'coo', 5], ['shroom ★5(Lv12)', 'grass', 'shroom', 5], ['wolf ★1(Lv10)', 'forest', 'wolf', 1], ['wolf ★5(Lv22)', 'forest', 'wolf', 5]
];
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
const rows = [];
for (const [exp, expName] of [[0, '新手(前3場)'], [1, '練熟了']]) {
  for (const grade of ['四年級', '五年級']) {
    const ps = profiles.filter(p => p.grade === grade);
    for (const [name, rk, mk, star] of SCEN) {
      let n = 0, win = 0, fail = 0, secs = 0, downs = 0, dOk = 0, dAll = 0, fOk = 0, fAll = 0, late = 0, casts = 0, att = 0;
      ps.forEach((p, i) => {
        for (let k = 0; k < REPS; k++) {
          const r = simulate(p, mk, rk, star, exp, i * 1000 + k + 7, A);
          n++; if (r.result === 'win') { win++; secs += r.secs; } if (r.result === 'fail') fail++;
          downs += r.downs; dOk += r.dodgeOk; dAll += r.dodgeAll; fOk += r.defOk; fAll += r.defAll; late += r.late; casts += r.casts; att += r.attempts;
        }
      });
      rows.push({ exp: expName, grade, scen: name, n: ps.length, win: pct(win, n), fail: pct(fail, n), secs: win ? Math.round(secs / win) : 0, downs: +(downs / n).toFixed(2), dodge: `${pct(dOk, dAll)}%(${dAll})`, defend: `${pct(fOk, fAll)}%(${fAll})`, tried: pct(att, casts) });
    }
  }
}
if (process.argv[4] === 'json') console.log(JSON.stringify(rows));
else {
  let last = '';
  for (const r of rows) {
    const head = `${r.exp}｜${r.grade}（${r.n} 人）`;
    if (head !== last) { console.log('\n' + head); last = head; }
    console.log(`  ${r.scen.padEnd(16)} 贏 ${String(r.win).padStart(3)}%  失敗 ${String(r.fail).padStart(3)}%  贏的平均 ${String(r.secs).padStart(3)}秒  倒下 ${r.downs}  出手比例 ${r.tried}%  閃避成功 ${r.dodge}  防禦成功 ${r.defend}`);
  }
}
