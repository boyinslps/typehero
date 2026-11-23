/* 用真實匯出的「閃避／防禦成功率」校正 lanes.mjs 的 attend（有沒有注意到紅線）。
   用法：node tools/nw-sim/calib.mjs [匯出檔]（預設 data-private/typehero-speed-20261120.json）
   真實：把所有有打過新世界的人的 dodgeOk/dodgeAll、defOk/defAll 加起來。
   模擬：用同一批人的手速，打咕咕鳥、泡泡蛙 ★1～3，看不同 attend 的閃避與防禦成功率。
   注意：真實資料只有 18 位打過的同學、約 200 次出招，是粗的參考，不是定論；上線後 mg_nw_runs 與 dodgeOk/dodgeAll 會更多。 */
import { readFileSync } from 'node:fs';
import { simulate, DEFAULT_ASSUME } from './sim.mjs';

const file = process.argv[2] || new URL('../../data-private/typehero-speed-20261120.json', import.meta.url);
const d = JSON.parse(readFileSync(file, 'utf8'));
const hunters = d.rows.filter(r => r.nw && r.nw.hunts > 0 && r.bestWpm);
let dO = 0, dA = 0, fO = 0, fA = 0;
hunters.forEach(r => { dO += r.nw.dodgeOk; dA += r.nw.dodgeAll; fO += r.nw.defOk; fA += r.nw.defAll; });
console.log(`真實：${hunters.length} 人，閃避 ${dO}/${dA} = ${(dO / dA * 100).toFixed(0)}%，防禦 ${fO}/${fA} = ${(fO / fA * 100).toFixed(0)}%`);
const tierOf = w => (w * 0.75 >= 28 ? 'D' : w * 0.75 >= 14 ? 'C' : w * 0.75 >= 6 ? 'B' : 'A');
const S = [['grass', 'coo', 1], ['grass', 'coo', 2], ['grass', 'coo', 3], ['grass', 'frog', 1], ['grass', 'frog', 2], ['grass', 'frog', 3]];
for (const exp of [0, 0.5]) for (const attend of [1, 0.8, 0.6, 0.4, 0.3, 0.2]) {
  let a = 0, b = 0, c = 0, e = 0, na = 0, nb = 0;
  hunters.forEach((r, i) => S.forEach(([rk, mk, st], j) => {
    const p = { wpm: r.bestWpm, acc: r.bestAcc || 97, tier: tierOf(r.bestWpm), weapon: 'staff' };
    for (let k = 0; k < 10; k++) {
      const o = simulate(p, mk, rk, st, exp, i * 997 + j * 31 + k, { ...DEFAULT_ASSUME, attend });
      a += o.dodgeOk; b += o.dodgeAll; c += o.defOk; e += o.defAll; na += o.needDodgeAll; nb += o.needDodgeOk;
    }
  }));
  console.log(`exp ${exp}　attend ${attend}：閃避 ${(a / b * 100).toFixed(0)}%　防禦 ${(c / e * 100).toFixed(0)}%　（要動才算：閃避 ${(nb / na * 100).toFixed(0)}%）`);
}
