/* 把教師頁「📊 匯出打字速度（匿名）」下載的 JSON，轉成模擬器吃的學生列表。
   模擬器（run.mjs／tiers.mjs）要的格式：[{ grade:'四年級', wpm, acc, tier, weapon }, …]。

   用法：
     1. 匯出檔放在 data-private/（.gitignore 已排除，真實資料不要進 repo）
     2. node tools/nw-sim/load-real.mjs data-private/typehero-speed-20261119.json --out data-private/profiles.json
     3. node tools/nw-sim/run.mjs data-private/profiles.json
        node tools/nw-sim/tiers.mjs data-private/profiles.json
   不加 --out 就印到 stdout；分布摘要（人數、速度分位數）印到 stderr，不會混進 JSON。

   選項：
     --out <檔>            輸出檔
     --unknown-as <年級>   年級不明（'?'）的人當成哪個年級，例：--unknown-as 五年級。預設丟掉，
                           因為 run.mjs 只認「四年級」「五年級」，'?' 會被默默略過。

   欄位對應（為什麼這樣取）：
     wpm    ＝ bestWpm（模擬器的 wpm 是「最高速度」，會自己乘 avgOfBest 變成平均）；沒有就用 lastWpm。兩個都沒有的人沒辦法模擬，略過。
     acc    ＝ bestAcc，沒有用 lastAcc，再沒有用 97（班上的中間值，不拉歪分布）。
     tier   ＝ tier，不是 A～D 就 B（模擬器本來就這樣預設）。
     weapon ＝ lastWeapon（staff／bow／dagger／crossbow），其他或沒有就 staff。
   不處理的：隨機編號只是為了去重，轉出來的列沒有編號，也沒有任何身分。 */
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const WEAPONS = ['staff', 'bow', 'dagger', 'crossbow'];
const GRADE = { 四: '四年級', 五: '五年級', 六: '六年級' };
const ok = v => typeof v === 'number' && Number.isFinite(v);

export function toProfiles(exp, o = {}) {
  if (!exp || !Array.isArray(exp.rows)) throw new Error('不是匯出檔：找不到 rows');
  const out = [];
  for (const r of exp.rows) {
    const wpm = ok(r.bestWpm) ? r.bestWpm : ok(r.lastWpm) ? r.lastWpm : null;
    if (wpm === null || wpm <= 0) continue;
    let grade = GRADE[r.grade];
    if (!grade) { if (!o.unknownAs) continue; grade = o.unknownAs; }
    out.push({
      grade, wpm,
      acc: ok(r.bestAcc) ? r.bestAcc : ok(r.lastAcc) ? r.lastAcc : 97,
      tier: ['A', 'B', 'C', 'D'].includes(r.tier) ? r.tier : 'B',
      weapon: WEAPONS.includes(r.lastWeapon) ? r.lastWeapon : 'staff'
    });
  }
  return out;
}

const q = (a, p) => { const s = a.map(x => x.wpm).sort((x, y) => x - y); if (!s.length) return '--'; const i = (s.length - 1) * p, l = Math.floor(i), h = Math.ceil(i); return +(s[l] + (s[h] - s[l]) * (i - l)).toFixed(1); };
export function describe(profiles) {
  const lines = [];
  for (const g of [...new Set(profiles.map(p => p.grade))].sort()) {
    const ps = profiles.filter(p => p.grade === g);
    lines.push(`${g}：${ps.length} 人，最高速度 P10 ${q(ps, .1)}／中位 ${q(ps, .5)}／P90 ${q(ps, .9)} 字/分`);
  }
  return lines.join('\n');
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const args = process.argv.slice(2), opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
  const file = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--out' && args[i - 1] !== '--unknown-as');
  if (!file) { console.error('用法：node tools/nw-sim/load-real.mjs <匯出檔.json> [--out profiles.json] [--unknown-as 五年級]'); process.exit(2); }
  const exp = JSON.parse(readFileSync(file, 'utf8'));
  const profiles = toProfiles(exp, { unknownAs: opt('--unknown-as') });
  if (!profiles.length) { console.error('沒有可用的列（都沒有打字速度、或年級不明且沒有指定 --unknown-as）'); process.exit(1); }
  const text = JSON.stringify(profiles, null, 1);
  if (opt('--out')) writeFileSync(opt('--out'), text + '\n'); else console.log(text);
  console.error(`轉出 ${profiles.length} 人（匯出檔共 ${exp.rows.length} 列）\n${describe(profiles)}`);
}
