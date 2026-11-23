/* 裝備驗收模擬（SPEC-STAGE2 §3.4 G1～G8）。
   用法：node tools/nw-sim/gear.mjs [--n 300] [--md]
     --n   每格幾場（預設 300；BALANCE-CURVES §6.3 建議正式驗收用 1000）
     --md  輸出 Markdown（貼進 docs/BALANCE-GEAR-2B.md）
   做法：每個「學生 × 魔物 × 攻擊設定」用同一組亂數種子跑不同裝備（common random numbers），
   所以裝備前後的差是配對差，雜訊比兩組獨立樣本小很多。
   學生樣本有兩組：SPEC6（規格原本的 6 個）、real（真實匯出的分位數，見 personas.mjs）。
   裝備數值：直接用 nw-data.js 的 slotValue()（SPEC §3.2），改了裝備數字這裡自動跟著變。 */
import { MONSTERS, ATTACKS_OPEN, FASTEST_FLOOR, HP_TIER, monMaxHp, regionLv, BAL, slotValue } from '../../nw-data.js';
import { simulate, DEFAULT_ASSUME } from './sim.mjs';
import { WOLF_ALL } from './lanes.mjs';
import { SPEC6, realPersonas } from './personas.mjs';

const args = process.argv.slice(2);
const argv = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const N = +argv('--n', 300), MD = args.includes('--md');
const ATTEND = argv('--attend', null) === null ? undefined : +argv('--attend');

/* ── 裝備數值：直接用 nw-data.js 的 slotValue()（SPEC §3.2），不另外抄一份；顏色 0 灰／1 綠／2 藍，p＝強化 ── */
const CN = ['gray', 'green', 'blue'];
export function statsOf(parts) {
  const v = (slot) => { const x = parts[slot]; return x ? slotValue(slot, CN[x.c], x.p) : 0; };
  const w = parts.weapon;
  return { atk: w ? slotValue('weapon', CN[w.c], w.p) : 100, elem: (w && w.elem) || null, hp: v('helm'), cut: v('armor'), shield: v('gloves'), warn: v('boots') };
}
const all = (c, p, weapon) => ({ weapon: weapon || { c, p }, helm: { c, p }, armor: { c, p }, gloves: { c, p }, boots: { c, p } });
const GEARS = {
  none: {},
  grayAll: all(0, 0),
  greenAll3: all(1, 3),
  greenAll5: all(1, 5),
  blueW5: { weapon: { c: 2, p: 5, elem: 'fire' } },
  greenW0: { weapon: { c: 1, p: 0 } }, greenW1: { weapon: { c: 1, p: 1 } }, greenW2: { weapon: { c: 1, p: 2 } },
  greenW3: { weapon: { c: 1, p: 3 } }, greenW4: { weapon: { c: 1, p: 4 } }, greenW5: { weapon: { c: 1, p: 5 } },
  greenBoots3: { boots: { c: 1, p: 3 } }, greenGloves3: { gloves: { c: 1, p: 3 } },
  maxAll: all(1, 5, { c: 2, p: 5, elem: 'fire' })
};
const GEAR = Object.fromEntries(Object.entries(GEARS).map(([k, v]) => [k, statsOf(v)]));

const MON = {
  coo1: ['grass', 'coo', 1], frog3: ['grass', 'frog', 3], coo5: ['grass', 'coo', 5],
  wolf1: ['forest', 'wolf', 1], wolf5: ['forest', 'wolf', 5], shroom1: ['grass', 'shroom', 1], frog1: ['grass', 'frog', 1]
};
const ATT = { now: undefined, wolf: { ...ATTACKS_OPEN, wolf: WOLF_ALL } };

const real = realPersonas();
const PERSONAS = Object.fromEntries([...SPEC6, ...real.list].map(([n, p]) => [n, p]));
const slow = ['四年級・慢', '五年級・慢', '慢（P25）'], mid = ['四年級・中', '五年級・中', '中（P50）'];

/* ── 一格（學生×裝備×魔物×攻擊設定）：N 場的統計，結果快取 ── */
const cache = new Map();
function cell(pn, gk, mk, ak = 'now', exp = 0.5, weapon, extra) {
  const key = [pn, gk, mk, ak, exp, weapon || '', ATTEND, JSON.stringify(extra || {})].join('|');
  if (cache.has(key)) return cache.get(key);
  const p = PERSONAS[pn], [rk, m, star] = MON[mk];
  const pi = Object.keys(PERSONAS).indexOf(pn);
  const ttk = []; let win = 0, secs = 0, fail = 0, time = 0, downs = 0, casts = 0, dAll = 0, dOk = 0, fAll = 0, fOk = 0, ndAll = 0, ndOk = 0, nfAll = 0, nfOk = 0, hurts = 0;
  for (let k = 0; k < N; k++) {
    const r = simulate(p, m, rk, star, exp, pi * 100003 + k * 7 + 11, { ...DEFAULT_ASSUME, attend: ATTEND, ...(extra || {}) }, { gear: GEAR[gk], attacks: ATT[ak], weapon });
    ttk.push(r.secs / Math.max(0.02, 1 - r.monLeft));
    if (r.result === 'win') { win++; secs += r.secs; } else if (r.why === 'down') fail++; else time++;
    downs += r.downs; casts += r.casts; dAll += r.dodgeAll; dOk += r.dodgeOk; fAll += r.defAll; fOk += r.defOk;
    ndAll += r.needDodgeAll; ndOk += r.needDodgeOk; nfAll += r.needDefAll; nfOk += r.needDefOk; hurts += r.hits;
  }
  const c = { n: N, ttk, win: win / N, secs: win ? secs / win : NaN, failDown: fail / N, timeUp: time / N, downs: downs / N, casts: casts / N, hits: hurts / N,
    dodge: dAll ? dOk / dAll : NaN, def: fAll ? fOk / fAll : NaN, needDodge: ndAll ? ndOk / ndAll : NaN, needDef: nfAll ? nfOk / nfAll : NaN, needDodgeN: ndAll / N, needDefN: nfAll / N };
  cache.set(key, c); return c;
}
const avg = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const pct = x => Number.isFinite(x) ? Math.round(x * 100) + '%' : '--';
const f1 = x => Number.isFinite(x) ? x.toFixed(1) : '--';
const sg = x => (x >= 0 ? '+' : '') + x.toFixed(1);

const rows = [];   // 驗收結果：[代號, 通過?, 說明]
const out = [];
const P = s => out.push(s);
const verdict = (id, ok, note) => { rows.push([id, ok, note]); };

P(MD ? `# 裝備驗收模擬結果（2b-1）\n` : '');
P(`每格 ${N} 場；學生樣本：SPEC6（規格原本 6 個）＋ real（${real.src}：${real.list.map(([n, p]) => `${n}＝${p.wpm} 字/分`).join('、')}）。`);
P(`反應時間假設：新手 1.0 秒 → 練熟 0.7 秒（SPEC §3.4），本表 exp＝0.5（中間）。裝備前後用同一組亂數種子。\n`);

/* ── G1 戰鬥不會被裝備跳過 ── */
{
  P(MD ? '## G1　戰鬥不會被裝備跳過（草原咕咕鳥 ★1，含炎牙刀 ×1.32）' : '── G1 ──');
  const names = Object.keys(PERSONAS), gks = ['none', 'grayAll', 'greenAll5', 'blueW5', 'maxAll'];
  P(MD ? '| 學生 \\ 裝備 | ' + gks.join(' | ') + ' |\n|---|' + gks.map(() => '---').join('|') + '|' : '贏的平均秒數（括號＝每場出招次數）');
  let min = 1e9, minCasts = 1e9, who = '';
  for (const pn of names) {
    const cells = gks.map(gk => { const c = cell(pn, gk, 'coo1'); if (c.secs < min) { min = c.secs; who = `${pn}／${gk}`; } minCasts = Math.min(minCasts, c.casts); return `${f1(c.secs)}s(${f1(c.casts)})`; });
    P(MD ? `| ${pn} | ${cells.join(' | ')} |` : `  ${pn.padEnd(10)} ${cells.join('  ')}`);
  }
  verdict('G1', min >= 55 && minCasts >= 2, `最快 ${f1(min)} 秒（${who}，門檻 ≥55）；每場最少 ${f1(minCasts)} 次出招（門檻 ≥2）`);
}

/* ── G2 變強看得到 ── */
{
  P(MD ? '\n## G2　變強看得到（炎牙狼 ★5，綠武器 +5 對無裝備；現行攻擊）' : '\n── G2 ──');
  /* 討伐時間：沒打贏的場用「照這個速度打下去要多久」（秒 ÷ 已打掉的血量比例）代替，不然慢的人贏的場太少、只剩運氣好的場；配對同一組種子的比例 */
  const gain = (pn, ga, gb, mk = 'wolf5') => { const a = cell(pn, ga, mk).ttk, b = cell(pn, gb, mk).ttk; return avg(a.map((x, i) => (x - b[i]) / x * 100)); };
  const res = [];
  for (const pn of mid) {
    const a = cell(pn, 'none', 'wolf5'), b = cell(pn, 'greenW5', 'wolf5');
    res.push([pn, gain(pn, 'none', 'greenW5')]);
    P(`  ${pn}：無裝備 贏 ${pct(a.win)}、贏的平均 ${f1(a.secs)} 秒 → 綠武器 +5 贏 ${pct(b.win)}、${f1(b.secs)} 秒；討伐時間（配對）少 ${f1(res[res.length - 1][1])}%`);
  }
  verdict('G2a', Math.min(...res.map(x => x[1])) >= 7, `綠武器 +5 討伐時間少 ${res.map(x => `${x[0]} ${f1(x[1])}%`).join('、')}（門檻 ≥7%）`);
  // 每 +1：綠武器 +0→+5 各一步
  const steps = [];
  for (const pn of mid) for (let i = 1; i <= 5; i++) steps.push(gain(pn, 'greenW' + (i - 1), 'greenW' + i));
  const m = avg(steps);
  P(`  每 +1 少 ${f1(m)}%（各格 ${steps.map(f1).join('、')}）`);
  verdict('G2b', m >= 1 && m <= 2.5, `武器每 +1 平均少 ${f1(m)}%（門檻 1～2.5%）`);
}

/* ── G3 慢的孩子有幫助 ── */
{
  P(MD ? '\n## G3　慢的孩子有幫助（綠全身 +3 對無裝備；現行攻擊）' : '\n── G3 ──');
  const d1 = [], d2 = [];
  for (const pn of slow) {
    const a = cell(pn, 'none', 'wolf1'), b = cell(pn, 'greenAll3', 'wolf1');
    const c = cell(pn, 'none', 'coo5'), d = cell(pn, 'greenAll3', 'coo5');
    d1.push((b.win - a.win) * 100);
    P(`  ${pn}：炎牙狼★1 勝率 ${pct(a.win)} → ${pct(b.win)}（${sg((b.win - a.win) * 100)}pp）；咕咕鳥★5 倒下 ${a.downs.toFixed(3)} → ${d.downs.toFixed(3)} 次/場，被打中 ${f1(c.hits)} → ${f1(d.hits)} 次/場`);
    d2.push([c.downs, d.downs, c.hits, d.hits]);
  }
  verdict('G3a', Math.min(...d1) >= 5, `炎牙狼★1 勝率多 ${d1.map(x => sg(x)).join('、')}pp（門檻 ≥5pp）。現行炎牙狼不攻擊，綠全身 +3 只剩武器的 +11%（105＋6）有用，防具用不到；手速快的樣本本來就快贏 97% 以上，沒有空間，真實 P25 有 +7pp`);
  const base = avg(d2.map(x => x[0]));
  verdict('G3b', base < 0.02 ? null : avg(d2.map(x => x[1])) <= base * 0.7, `咕咕鳥★5 倒下 ${base.toFixed(3)} → ${avg(d2.map(x => x[1])).toFixed(3)} 次/場；無裝備本來就幾乎不倒下，這條現行攻擊下驗不了（BALANCE-CURVES §6.4 建議改看「狼也攻擊」的狼★3）`);
  // 狼也攻擊的狼★3：補充
  P('  （補充）狼也攻擊：');
  for (const pn of slow) { const a = cell(pn, 'none', 'wolf1', 'wolf'), b = cell(pn, 'greenAll3', 'wolf1', 'wolf'); P(`    ${pn}：狼★1 勝率 ${pct(a.win)} → ${pct(b.win)}，倒下 ${a.downs.toFixed(2)} → ${b.downs.toFixed(2)} 次/場，被打中 ${f1(a.hits)} → ${f1(b.hits)} 次`); }
}

/* ── G4 還是要練打字 ── */
{
  P(MD ? '\n## G4　還是要練打字（慢的孩子，綠全身 +5，炎牙狼 ★5 勝率）' : '\n── G4 ──');
  let worst = 0, gainMax = -1e9;
  for (const pn of slow) {
    const a = cell(pn, 'greenAll5', 'wolf5', 'now'), b = cell(pn, 'greenAll5', 'wolf5', 'wolf'), n0 = cell(pn, 'none', 'wolf5', 'now'), n1 = cell(pn, 'none', 'wolf5', 'wolf');
    worst = Math.max(worst, a.win, b.win); gainMax = Math.max(gainMax, (a.win - n0.win) * 100, (b.win - n1.win) * 100);
    P(`  ${pn}：現行 無裝備 ${pct(n0.win)} → 綠全身 +5 ${pct(a.win)}；狼也攻擊 無裝備 ${pct(n1.win)} → ${pct(b.win)}`);
  }
  verdict('G4', worst <= 0.6, `慢的孩子綠全身 +5 打炎牙狼★5 最高 ${pct(worst)}（門檻 ≤60%）；裝備最多多贏 ${f1(gainMax)}pp（BALANCE-CURVES D3：+20～30pp 以內）。超過 60% 的樣本（五年級・慢，A 層血量 0.35）沒裝備就已經 ${pct(cell('五年級・慢', 'none', 'wolf5').win)}，不是裝備造成的`);
}

/* ── G5 不做裝備也能玩 ── */
{
  P(MD ? '\n## G5　不做裝備也能玩（魔物血量不動）' : '\n── G5 ──');
  const fp = Object.entries({ coo: ['grass', 1], frog: ['grass', 3], shroom: ['grass', 5], wolf: ['forest', 5] }).flatMap(([mk, [rk, st]]) => ['A', 'B', 'C', 'D'].map(t => monMaxHp(mk, regionLv(rk, st), t))).join(',');
  const hpOk = JSON.stringify(HP_TIER) === JSON.stringify({ A: 0.35, B: 0.5, C: 0.7, D: 1.7 }) && BAL.hpBase === 440 && BAL.hpPerLv === 20;
  P(`  HP_TIER ${JSON.stringify(HP_TIER)}、hpBase ${BAL.hpBase}、hpPerLv ${BAL.hpPerLv}；代表血量 ${fp}`);
  verdict('G5', hpOk, hpOk ? '魔物血量表沒動（2b 只加裝備，沒改 HP_TIER／hpBase／hpPerLv），無裝備的人勝率不變' : 'HP_TIER／hpBase／hpPerLv 被改了');
}

/* ── G6 防具看得到差別 ── */
{
  P(MD ? '\n## G6　防具看得到差別（慢的孩子；綠護腳 +3、綠護手 +3）' : '\n── G6 ──');
  const dB = [], dG = [], dBu = [], dGu = [];
  for (const pn of slow) {
    const a = cell(pn, 'none', 'coo5'), b = cell(pn, 'greenBoots3', 'coo5');
    const c = cell(pn, 'none', 'frog3'), d = cell(pn, 'greenGloves3', 'frog3');
    dB.push((b.needDodge - a.needDodge) * 100); dG.push((d.needDef - c.needDef) * 100);
    dBu.push((b.dodge - a.dodge) * 100); dGu.push((d.def - c.def) * 100);
    P(`  ${pn}：咕咕鳥★5 閃避成功（要動才算）${pct(a.needDodge)} → ${pct(b.needDodge)}；（含不用動的）${pct(a.dodge)} → ${pct(b.dodge)}　｜　泡泡蛙★3 重壓防禦（要舉盾才算）${pct(c.needDef)} → ${pct(d.needDef)}；（全部）${pct(c.def)} → ${pct(d.def)}`);
  }
  /* 敏感度：反應慢一點（邊打字邊看紅線，雙工分心）。預警 2.0～3.0 秒比反應 1.0 秒長太多，護腳 +0.1～0.3 秒看不出差別；
     反應要接近預警時間，護腳才有感。真實的反應時間要等 mg_nw_runs／dodgeOk 的資料才知道 */
  for (const mu of [1.5, 1.8, 2.1]) {
    const x = { react: [mu, mu - .3] }, a = slow.map(pn => [cell(pn, 'none', 'coo5', 'now', .5, undefined, x).needDodge, cell(pn, 'greenBoots3', 'coo5', 'now', .5, undefined, x).needDodge, cell(pn, 'none', 'frog3', 'now', .5, undefined, x).needDef, cell(pn, 'greenGloves3', 'frog3', 'now', .5, undefined, x).needDef]);
    P(`  （敏感度）反應 ${mu} 秒：護腳 ${a.map(v => `${pct(v[0])}→${pct(v[1])}`).join('、')}；護手 ${a.map(v => `${pct(v[2])}→${pct(v[3])}`).join('、')}（順序：${slow.join('、')}）`);
  }
  verdict('G6a', Math.min(...dB) >= 10, `綠護腳 +3：閃避成功率（要動才算）${dB.map(x => sg(x)).join('、')}pp；含不用動的 ${dBu.map(x => sg(x)).join('、')}pp（門檻 ≥+10pp）`);
  verdict('G6b', Math.min(...dG) >= 10, `綠護手 +3：重壓防禦成功率（要舉盾才算）${dG.map(x => sg(x)).join('、')}pp；全部 ${dGu.map(x => sg(x)).join('、')}pp（門檻 ≥+10pp）`);
}

/* ── G7 合理下限 ── */
let floor;
{
  P(MD ? '\n## G7　最快討伐合理下限（FASTEST_FLOOR）' : '\n── G7 ──');
  const fast = { wpm: 70, acc: 100, tier: 'D', weapon: 'bow' };
  floor = {};
  for (const mk of ['coo', 'frog', 'shroom', 'wolf']) {
    const rk = mk === 'wolf' ? 'forest' : 'grass';
    // 這隻魔物最好的武器（藍火刀對怕火的 ×1.32、對不怕火的反而比綠 +5 弱）＋其他四格綠 +5
    const m = MONSTERS[mk];
    const best = ['maxAll', 'greenAll5'].map(k => ({ k, g: GEAR[k], mul: GEAR[k].atk / 100 * (!GEAR[k].elem ? 1 : m.fear === GEAR[k].elem ? 1.1 : m.resist === GEAR[k].elem ? .9 : 1) })).sort((a, b) => b.mul - a.mul)[0];
    let min = 1e9, minNo = 1e9;
    for (const tier of ['A', 'B', 'C', 'D']) for (let k = 0; k < 75; k++) {
      const r = simulate({ ...fast, tier }, mk, rk, 1, 1, 5000 + k, { ...DEFAULT_ASSUME }, { gear: best.g });
      if (r.result === 'win') min = Math.min(min, r.secs);
      const r0 = simulate({ ...fast, tier }, mk, rk, 1, 1, 5000 + k, { ...DEFAULT_ASSUME });
      if (r0.result === 'win') minNo = Math.min(minNo, r0.secs);
    }
    floor[mk] = Math.floor(min * 0.8);
    P(`  ${mk}：最快 ${f1(min)} 秒（${best.k}，g×${best.mul.toFixed(2)}；無裝備 ${f1(minNo)} 秒）→ 下限（×0.8）${floor[mk]} 秒；現在的 FASTEST_FLOOR ${FASTEST_FLOOR[mk]}`);
  }
  P(`  FASTEST_FLOOR = ${JSON.stringify(floor)}`);
  verdict('G7', true, `新的下限 ${JSON.stringify(floor)}（現在 ${JSON.stringify(FASTEST_FLOOR)}）；只在比現在低時才需要往下改，往上改只會多出 ⚠ 假警報`);
}

/* ── G8 狼要不要攻擊（資訊用；老師已決定不一起開） ── */
{
  P(MD ? '\n## G8　狼要不要攻擊（資訊用；老師已決定 2b 不一起開）' : '\n── G8 ──');
  const lines = [];
  for (const pn of [...mid, ...slow]) {
    const a = cell(pn, 'none', 'wolf5', 'now'), b = cell(pn, 'none', 'wolf5', 'wolf'), c = cell(pn, 'grayAll', 'wolf5', 'wolf'), d = cell(pn, 'greenAll3', 'wolf5', 'wolf');
    lines.push([pn, a.win, b.win, c.win, d.win]);
    P(`  ${pn}：狼★5 勝率 不攻擊 ${pct(a.win)}｜攻擊・無裝備 ${pct(b.win)}｜攻擊・灰全身 ${pct(c.win)}｜攻擊・綠全身 +3 ${pct(d.win)}　（攻擊時倒下 ${b.downs.toFixed(2)} 次/場）`);
  }
  const m = lines.filter(x => mid.includes(x[0]));
  const spec = m.find(x => x[0] === '四年級・中');
  verdict('G8', spec ? spec[2] >= 0.5 && spec[3] >= 0.65 : null, `「四年級・中」狼也攻擊：無裝備 ${pct(spec[2])}（門檻 ≥50%）、灰全身 ${pct(spec[3])}（門檻 ≥65%）。BALANCE-CURVES §6.4 建議改驗「開攻擊造成的勝率下降 ≤5pp」：${m.map(x => `${x[0]} ${sg((x[2] - x[1]) * 100)}pp`).join('、')}`);
}

/* ── 附：四把武器的差距（BALANCE-CURVES §3.2 ω） ── */
{
  P(MD ? '\n## 附　四把初心武器的差距（中速學生，無裝備，咕咕鳥★1 贏的平均秒數）' : '\n── 附：武器差距 ──');
  for (const pn of mid) {
    const rs = ['staff', 'bow', 'dagger', 'crossbow'].map(w => [w, cell(pn, 'none', 'coo1', 'now', .5, w).secs]);
    const v = rs.map(x => 1 / x[1]), mx = Math.max(...v), mn = Math.min(...v);
    P(`  ${pn}：${rs.map(([w, s]) => `${w} ${f1(s)}s`).join('　')}　→ 最快/最慢 ×${(mx / mn).toFixed(2)}`);
  }
}

P(MD ? '\n## 總表' : '\n══ 總表 ══');
P(MD ? '| 驗收 | 結果 | 說明 |\n|---|---|---|' : '');
for (const [id, ok, note] of rows) P(MD ? `| ${id} | ${ok === null ? '—（驗不了）' : ok ? '✅ 過' : '❌ 不過'} | ${note} |` : `${id.padEnd(4)} ${ok === null ? '—驗不了' : ok ? '過  ' : '不過'}  ${note}`);
console.log(out.join('\n'));
