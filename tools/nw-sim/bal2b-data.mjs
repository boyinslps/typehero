/* 2b 數值分析的「真實資料」部分（docs/research/BALANCE-2B-ANALYSIS.md §2、§5）。
   用法：node tools/nw-sim/bal2b-data.mjs [匯出檔]（預設 data-public/typehero-speed-20261120.json）
   只印統計數字，不印任何一列資料（匯出檔雖然已去識別化，報告仍只引用統計）。
   內容：速度分位數與 σ、閃避／防禦成功率（含信賴區間，且逐人看集中度）、層級缺口、
        上限指標 ln(g)/ln(p90/p10) 與「翻盤人數」ln(g)/(σ√2π) 用真實 σ 重算。 */
import { readFileSync } from 'node:fs';

const file = process.argv[2] || new URL('../../data-public/typehero-speed-20261120.json', import.meta.url);
const d = JSON.parse(readFileSync(file, 'utf8'));
const rows = d.rows;
const ok = v => typeof v === 'number' && Number.isFinite(v);
export const q = (a, p) => { const s = a.slice().sort((x, y) => x - y), i = (s.length - 1) * p, l = Math.floor(i), h = Math.ceil(i); return s[l] + (s[h] - s[l]) * (i - l); };
const pct = x => (x * 100).toFixed(0) + '%';

/* 小亂數：bootstrap 要可重現 */
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const wilson = (k, n, z = 1.96) => { const p = k / n, c = (p + z * z / (2 * n)) / (1 + z * z / n), h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / (1 + z * z / n); return [c - h, c + h]; };

console.log(`匯出檔：${d.meta ? d.meta.exportedAt : ''}，共 ${rows.length} 列`);

/* ── 1. 速度分布 ── */
const wpm = rows.map(r => ok(r.bestWpm) ? r.bestWpm : ok(r.lastWpm) ? r.lastWpm : null).filter(v => v > 0);
console.log(`\n== 速度（bestWpm，沒有就 lastWpm；n=${wpm.length}）==`);
const P = [.05, .1, .25, .5, .75, .9, .95, .99];
console.log(P.map(p => `p${p * 100}=${q(wpm, p).toFixed(1)}`).join('  '));
const ln = wpm.map(Math.log);
const mu = ln.reduce((a, b) => a + b, 0) / ln.length, sdAll = Math.sqrt(ln.reduce((a, b) => a + (b - mu) ** 2, 0) / ln.length);
const sigQ = (Math.log(q(wpm, .75)) - Math.log(q(wpm, .25))) / 1.349, sig1090 = (Math.log(q(wpm, .9)) - Math.log(q(wpm, .1))) / 2.563;
console.log(`ln 平均 ${mu.toFixed(3)}（幾何平均 ${Math.exp(mu).toFixed(1)}）；σ 全部 ${sdAll.toFixed(3)}、四分位法 ${sigQ.toFixed(3)}、p10～p90 法 ${sig1090.toFixed(3)}`);
const le = x => wpm.filter(v => v <= x).length;
console.log('累積：' + [3, 4, 5, 6, 8, 9, 10, 12, 15, 20, 28, 40].map(x => `≤${x}：${le(x)}（${pct(le(x) / wpm.length)}）`).join('　'));

/* ── 2. 上限指標 ── */
console.log('\n== 裝備佔比 ln(g)/ln(v_hi/v_lo) 與翻盤人數上限 ln(g)/(σ√2π) ==');
const p10 = q(wpm, .1), p90 = q(wpm, .9), p3 = 3;
for (const g of [1.05, 1.10, 1.15, 1.20, 1.32]) {
  const s = Math.log(g);
  console.log(`g=${g.toFixed(2)}：佔比（真實 p10 ${p10.toFixed(1)}～p90 ${p90.toFixed(1)}）${(s / Math.log(p90 / p10) * 100).toFixed(1)}%；`
    + `（舊假設 4.3～19）${(s / Math.log(19 / 4.3) * 100).toFixed(1)}%；（p5 3～p90）${(s / Math.log(p90 / p3) * 100).toFixed(1)}%；`
    + `翻盤上限 σ=0.70：${(s / (0.70 * Math.sqrt(2 * Math.PI)) * 100).toFixed(1)}%、σ=0.58：${(s / (0.58 * Math.sqrt(2 * Math.PI)) * 100).toFixed(1)}%、σ=0.76：${(s / (0.76 * Math.sqrt(2 * Math.PI)) * 100).toFixed(1)}%`);
}
/* 實際落在「某個門檻以下 g 倍以內」的比例（經驗版翻盤人數）：門檻 v_th 以 6、8、11、15、20 字/分示意 */
console.log('經驗版：速度落在 [v/g, v) 的人占全部的比例（v＝門檻，g＝1.15／1.32）');
for (const v of [5, 7, 9, 11, 14, 18, 25]) console.log(`  v=${v}：g1.15 ${pct(wpm.filter(w => w >= v / 1.15 && w < v).length / wpm.length)}　g1.32 ${pct(wpm.filter(w => w >= v / 1.32 && w < v).length / wpm.length)}`);

/* ── 3. 閃避／防禦 ── */
const hunters = rows.filter(r => r.nw && r.nw.hunts > 0);
const sum = (a, f) => a.reduce((x, r) => x + f(r), 0);
const dO = sum(hunters, r => r.nw.dodgeOk), dA = sum(hunters, r => r.nw.dodgeAll), fO = sum(hunters, r => r.nw.defOk), fA = sum(hunters, r => r.nw.defAll);
const withSpeed = hunters.filter(r => ok(r.bestWpm));
const dO2 = sum(withSpeed, r => r.nw.dodgeOk), dA2 = sum(withSpeed, r => r.nw.dodgeAll), fO2 = sum(withSpeed, r => r.nw.defOk), fA2 = sum(withSpeed, r => r.nw.defAll);
console.log(`\n== 閃避／防禦（打過狩獵的 ${hunters.length} 人；有速度的 ${withSpeed.length} 人）==`);
const line = (name, k, n) => { const [lo, hi] = wilson(k, n); return `${name} ${k}/${n}＝${pct(k / n)}（Wilson 95% ${pct(lo)}～${pct(hi)}）`; };
console.log(line('全部 閃避', dO, dA)); console.log(line('全部 防禦', fO, fA));
console.log(line('有速度 閃避', dO2, dA2)); console.log(line('有速度 防禦', fO2, fA2));
const hd = hunters.filter(r => r.nw.dodgeAll > 0), hf = hunters.filter(r => r.nw.defAll > 0);
console.log(`有閃避紀錄 ${hd.length} 人、有防禦紀錄 ${hf.length} 人；兩者都有 ${hunters.filter(r => r.nw.dodgeAll > 0 && r.nw.defAll > 0).length} 人`);
const share = (a, f) => { const t = sum(a, f), m = Math.max(...a.map(f)); return `最大一人占 ${pct(m / t)}`; };
console.log(`集中度：閃避 ${share(hd, r => r.nw.dodgeAll)}；防禦 ${share(hf, r => r.nw.defAll)}`);
/* 逐人（只印 次數與成功率，不印身分）：按速度排序，看快手跟慢手有沒有差 */
console.log('逐人（依速度由慢到快；無速度排最前）：閃避 成功/次　防禦 成功/次');
hunters.slice().sort((a, b) => (a.bestWpm || 0) - (b.bestWpm || 0)).filter(r => r.nw.dodgeAll + r.nw.defAll > 0)
  .forEach(r => console.log(`  速度 ${String(r.bestWpm == null ? '--' : r.bestWpm).padStart(3)}　閃避 ${r.nw.dodgeOk}/${r.nw.dodgeAll}　防禦 ${r.nw.defOk}/${r.nw.defAll}`));
/* 以「人」為單位的 bootstrap（每人的次數不獨立：同一個人的習慣會一起動） */
function clusterBoot(a, ok_, all_, B = 4000) {
  const r = rng(20261124), est = [];
  for (let b = 0; b < B; b++) { let k = 0, n = 0; for (let i = 0; i < a.length; i++) { const x = a[Math.floor(r() * a.length)]; k += ok_(x); n += all_(x); } est.push(k / n); }
  return [q(est, .025), q(est, .975)];
}
{
  const [a, b] = clusterBoot(hd, r => r.nw.dodgeOk, r => r.nw.dodgeAll), [c, e] = clusterBoot(hf, r => r.nw.defOk, r => r.nw.defAll);
  console.log(`以人為單位 bootstrap 95%：閃避 ${pct(a)}～${pct(b)}（${hd.length} 人）；防禦 ${pct(c)}～${pct(e)}（${hf.length} 人）`);
  /* 拿掉次數最多的那個人 */
  const top = a_ => a_.slice().sort((x, y) => (y.nw.dodgeAll + y.nw.defAll) - (x.nw.dodgeAll + x.nw.defAll))[0];
  const t = top(hunters), rest = hunters.filter(r => r !== t);
  const dd = sum(rest, r => r.nw.dodgeAll), ff = sum(rest, r => r.nw.defAll);
  console.log(`拿掉次數最多的那一人：閃避 ${sum(rest, r => r.nw.dodgeOk)}/${dd}＝${pct(sum(rest, r => r.nw.dodgeOk) / dd)}；防禦 ${sum(rest, r => r.nw.defOk)}/${ff}＝${pct(sum(rest, r => r.nw.defOk) / ff)}`);
}
const fast = hunters.filter(r => ok(r.bestWpm) && r.bestWpm >= 25 && r.nw.dodgeAll > 0), slowish = hunters.filter(r => ok(r.bestWpm) && r.bestWpm < 25 && r.nw.dodgeAll > 0);
console.log(`速度 ≥25：閃避 ${sum(fast, r => r.nw.dodgeOk)}/${sum(fast, r => r.nw.dodgeAll)}（${fast.length} 人）；<25：閃避 ${sum(slowish, r => r.nw.dodgeOk)}/${sum(slowish, r => r.nw.dodgeAll)}（${slowish.length} 人）`);
const sw = hunters.filter(r => ok(r.bestWpm));
console.log(`打過狩獵的 ${hunters.length} 人：最高速度中位 ${q(hunters.filter(r => ok(r.bestWpm)).map(r => r.bestWpm), .5)}，p25 ${q(sw.map(r => r.bestWpm), .25)}，最慢 ${Math.min(...sw.map(r => r.bestWpm))}（全班 p25 ${q(wpm, .25).toFixed(1)}、中位 ${q(wpm, .5)}）`);
const hw = sum(hunters, r => r.nw.wins), hf2 = sum(hunters, r => r.nw.fails), hh = sum(hunters, r => r.nw.hunts);
console.log(`新世界狩獵 ${hh} 場：勝 ${hw}、敗 ${hf2}（勝率 ${pct(hw / (hw + hf2))}，Wilson ${wilson(hw, hw + hf2).map(pct).join('～')}），其餘 ${hh - hw - hf2} 場無勝敗（撤退／無效）`);

/* ── 4. 層級 ── */
const C = { B: 6, C: 14, D: 28 };
const tierFromWpm = w => !(w > 0) ? 'B' : w >= C.D ? 'D' : w >= C.C ? 'C' : w >= C.B ? 'B' : 'A';
const hasT = r => ['A', 'B', 'C', 'D'].includes(r.tier);
const sp = rows.filter(r => ok(r.bestWpm));
console.log(`\n== 層級（有 bestWpm ${sp.length} 人）==`);
const noT = sp.filter(r => !hasT(r));
console.log(`有層級 ${sp.length - noT.length} 人、沒層級 ${noT.length} 人（${pct(noT.length / sp.length)}）；全部 ${rows.length} 列中沒層級 ${rows.filter(r => !hasT(r)).length}、沒速度也沒層級 ${rows.filter(r => !hasT(r) && !ok(r.bestWpm)).length}`);
for (const t of ['A', 'B', 'C', 'D']) console.log(`  真實層級 ${t}：${sp.filter(r => r.tier === t).length} 人`);
console.log(`沒層級者用 tierFromWpm 回推：` + ['A', 'B', 'C', 'D'].map(t => `${t} ${noT.filter(r => tierFromWpm(r.bestWpm) === t).length}`).join('、') + '（現況＝全部 B）');
console.log(`  其中 回推與現況不同（≠B）：${noT.filter(r => tierFromWpm(r.bestWpm) !== 'B').length} 人（${pct(noT.filter(r => tierFromWpm(r.bestWpm) !== 'B').length / sp.length)} of 有速度者）`);
const bandsOf = [[0, 4], [5, 6], [7, 8], [9, 12], [13, 17], [18, 28], [29, 999]];
console.log('最高速度段 × （有層級的）真實層級；沒層級者人數');
for (const [lo, hi] of bandsOf) {
  const a = sp.filter(r => r.bestWpm >= lo && r.bestWpm <= hi);
  console.log(`  ${lo}～${hi}：${a.length} 人；` + ['A', 'B', 'C', 'D'].map(t => `${t} ${a.filter(r => r.tier === t).length}`).join('　') + `；沒層級 ${a.filter(r => !hasT(r)).length}`);
}
const nwp = rows.filter(r => r.nw);
console.log(`有新世界存檔 ${nwp.length} 人；其中沒層級 ${nwp.filter(r => !hasT(r)).length}；打過狩獵 ${hunters.length} 人，其中沒層級 ${hunters.filter(r => !hasT(r)).length}`);
