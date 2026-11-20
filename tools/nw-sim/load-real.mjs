/* 把教師頁「📊 匯出打字速度（匿名）」下載的 JSON，轉成模擬器吃的學生列表。
   模擬器（run.mjs／tiers.mjs）要的格式：[{ grade:'四年級', wpm, acc, tier, weapon }, …]；
   curves.mjs --real 另外會用 tierKnown、accLast、nw（見下）。

   用法：
     1. 匯出檔放在 data-private/（.gitignore 已排除，真實資料不要進 repo）
     2. node tools/nw-sim/load-real.mjs data-private/typehero-speed-20261119.json --out data-private/profiles.json
     3. node tools/nw-sim/run.mjs data-private/profiles.json
        node tools/nw-sim/tiers.mjs data-private/profiles.json
        node tools/nw-sim/curves.mjs --real data-private/profiles.json
   不加 --out 就印到 stdout；分布摘要（人數、速度分位數）印到 stderr，不會混進 JSON。

   選項：
     --out <檔>            輸出檔
     --unknown-as <年級>   年級不明（'?'）的人當成哪個年級，例：--unknown-as 五年級。
     --drop-unknown        丟掉年級不明的人（舊行為）。預設保留、年級寫 '?'：curves.mjs 不看年級，
                           丟掉會白白少 10 人左右，而且那群人的速度分布跟其他年級不同（多是只玩 1 場的新手）；
                           run.mjs 只認「四年級」「五年級」，'?' 與六年級會被它略過（它本來就略過六年級）。
     --acc-from best|last  acc 取歷史最高正確率（best，預設，舊行為）還是最近一場（last）。
                           best 是「最高」會偏高；last 才是典型表現，但每個人只有一場。兩個都沒有 → 97。
     --wpm-from best|last  wpm 取歷史最高（best，預設）還是最近一場（last，沒有就退回 best）。

   欄位對應（為什麼這樣取）：
     wpm    ＝ bestWpm（模擬器的 wpm 是「最高速度」，會自己乘 avgOfBest 變成平均）；沒有就用 lastWpm。兩個都沒有的人沒辦法模擬，略過。
     acc    ＝ 見 --acc-from；accLast＝lastAcc（沒有就 null），給 curves.mjs 看「最近一場正確率」的分布。
     tier   ＝ tier，不是 A～D 就 'B'（遊戲本身也這樣：newworld.js 的 tier()＝hist.tier || 'B'，不會用手速回推）。
     tierKnown ＝ 匯出檔裡真的有 A～D。匯出檔的 tier 欄一樣是空的人（約 37%，多半還沒在舊世界打過有層級的場次），
                 新世界會把他們當 B，不管手速多快；curves.mjs 的 tierSrc=real 就是要重現這件事，所以要分得出「真的 B」跟「補的 B」。
     weapon ＝ lastWeapon（staff／bow／dagger／crossbow），其他或沒有就 staff。
     lastWpm／plays ＝ 原樣（沒有就 null），看最高 vs 最近、場次對速度的偏差用。
     nw     ＝ 新世界戰績的非身分摘要（hr、hunts、wins、fails、fastest、fastMk、dex、wwin、閃避／防禦次數），沒存檔就沒有這欄。
   不處理的：隨機編號只是為了去重，轉出來的列沒有編號，也沒有任何身分。 */
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const WEAPONS = ['staff', 'bow', 'dagger', 'crossbow'];
const GRADE = { 四: '四年級', 五: '五年級', 六: '六年級' };
const ok = v => typeof v === 'number' && Number.isFinite(v);
const pos = v => ok(v) && v > 0 ? v : null;

export function toProfiles(exp, o = {}) {
  if (!exp || !Array.isArray(exp.rows)) throw new Error('不是匯出檔：找不到 rows');
  const out = [], accFrom = o.accFrom || 'best', wpmFrom = o.wpmFrom || 'best';
  for (const r of exp.rows) {
    const best = pos(r.bestWpm), last = pos(r.lastWpm);
    const wpm = wpmFrom === 'last' ? (last ?? best) : (best ?? last);
    if (wpm === null) continue;
    let grade = GRADE[r.grade];
    if (!grade) { if (o.dropUnknown) continue; grade = o.unknownAs || '?'; }
    const accB = ok(r.bestAcc) ? r.bestAcc : null, accL = ok(r.lastAcc) ? r.lastAcc : null;
    const tierKnown = ['A', 'B', 'C', 'D'].includes(r.tier);
    const p = {
      grade, wpm,
      acc: (accFrom === 'last' ? (accL ?? accB) : (accB ?? accL)) ?? 97,
      accLast: accL,
      tier: tierKnown ? r.tier : 'B', tierKnown,
      weapon: WEAPONS.includes(r.lastWeapon) ? r.lastWeapon : 'staff',
      lastWpm: last, plays: ok(r.plays) ? r.plays : null
    };
    const n = r.nw;
    if (n && typeof n === 'object') p.nw = { hr: n.hr, hunts: n.hunts, wins: n.wins, fails: n.fails, fastest: n.fastest || {}, fastMk: n.fastMk || {}, dex: n.dex || {}, wwin: n.wwin || {},
      dodgeOk: n.dodgeOk, dodgeAll: n.dodgeAll, defOk: n.defOk, defAll: n.defAll };
    out.push(p);
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
  const noTier = profiles.filter(p => !p.tierKnown).length;
  lines.push(`層級：${profiles.length - noTier} 人有 A～D、${noTier} 人沒有（新世界會當 B）`);
  return lines.join('\n');
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const args = process.argv.slice(2), opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
  const VALUE_OPTS = ['--out', '--unknown-as', '--acc-from', '--wpm-from'];
  const file = args.find((a, i) => !a.startsWith('--') && !VALUE_OPTS.includes(args[i - 1]));
  if (!file) { console.error('用法：node tools/nw-sim/load-real.mjs <匯出檔.json> [--out profiles.json] [--unknown-as 五年級 | --drop-unknown] [--acc-from best|last] [--wpm-from best|last]'); process.exit(2); }
  for (const k of ['--acc-from', '--wpm-from']) if (opt(k) && !['best', 'last'].includes(opt(k))) { console.error(`${k} 只能是 best 或 last`); process.exit(2); }
  const exp = JSON.parse(readFileSync(file, 'utf8'));
  const profiles = toProfiles(exp, { unknownAs: opt('--unknown-as'), dropUnknown: args.includes('--drop-unknown'), accFrom: opt('--acc-from'), wpmFrom: opt('--wpm-from') });
  if (!profiles.length) { console.error('沒有可用的列（都沒有打字速度）'); process.exit(1); }
  const text = JSON.stringify(profiles, null, 1);
  if (opt('--out')) writeFileSync(opt('--out'), text + '\n'); else console.log(text);
  console.error(`轉出 ${profiles.length} 人（匯出檔共 ${exp.rows.length} 列）\n${describe(profiles)}`);
}
