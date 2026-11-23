/* 模擬用的學生樣本。
   SPEC6：SPEC-STAGE2 §3.4 原本的 6 個樣本（手速偏高，BALANCE-REFS §5.1 已指出比實測高）。
   real：用 data-private/profiles.json（教師頁匯出 → load-real.mjs 轉的）的分位數：慢 P25、中 P50、快 P90、極快 45（實測最高）。
   沒有真實檔案時退回 BALANCE-CURVES.md §1.1 的對數常態（中位 10、P25＝6、P90＝19）。 */
import { existsSync, readFileSync } from 'node:fs';

export const SPEC6 = [
  ['四年級・慢', { wpm: 12, acc: 99.8, tier: 'B', weapon: 'staff' }], ['四年級・中', { wpm: 20, acc: 100, tier: 'B', weapon: 'dagger' }], ['四年級・快', { wpm: 53, acc: 100, tier: 'D', weapon: 'bow' }],
  ['五年級・慢', { wpm: 11, acc: 98, tier: 'A', weapon: 'staff' }], ['五年級・中', { wpm: 18, acc: 100, tier: 'B', weapon: 'staff' }], ['五年級・快', { wpm: 41, acc: 100, tier: 'C', weapon: 'dagger' }]
];

const tierOf = w => (w * 0.75 >= 28 ? 'D' : w * 0.75 >= 14 ? 'C' : w * 0.75 >= 6 ? 'B' : 'A');
const q = (a, p) => { const s = a.slice().sort((x, y) => x - y), i = (s.length - 1) * p, l = Math.floor(i), h = Math.ceil(i); return s[l] + (s[h] - s[l]) * (i - l); };

export function realPersonas(file = new URL('../../data-private/profiles.json', import.meta.url)) {
  let src = 'BALANCE-CURVES 對數常態（沒有 data-private/profiles.json）', w = { slow: 6, mid: 10, fast: 19 }, acc = 97;
  if (existsSync(file)) {
    const rows = JSON.parse(readFileSync(file, 'utf8'));
    const ws = rows.map(r => r.wpm);
    w = { slow: q(ws, .25), mid: q(ws, .5), fast: q(ws, .9) };
    acc = Math.round(q(rows.map(r => r.acc), .5) * 10) / 10;
    src = `真實匯出 ${rows.length} 人（bestWpm P25／P50／P90）`;
  }
  const mk = (name, wpm) => [name, { wpm: +wpm.toFixed(1), acc, tier: tierOf(wpm), weapon: 'staff' }];
  return { src, list: [mk('慢（P25）', w.slow), mk('中（P50）', w.mid), mk('快（P90）', w.fast), mk('極快（45）', 45)] };
}
