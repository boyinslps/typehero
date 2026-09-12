#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════
   打字勇者・難度層級驗算器（v3，取消動態難度之後）

   讀 ../index.html 裡的 `const BALANCE = {...}`（傷害、經驗、區域那些照舊），
   只把血量曲線換成 docs/BALANCE.md §7 的三層級線性版：

       CTK(LV) = tier.ctk0 + tier.slope × (LV - 1)

   印出跟 docs/BALANCE.md 對得上的表：
     1. CTK 曲線與「要幾下」（§3）
     2. 三個層級的典型學生一場打幾隻、到幾級（§11）
     3. 升層那一步會不會變虧（§7.5）
     4. 天賦（傷害加成）到底看不看得出效果（§11）

   用法：node tools/tier-sim.mjs [場次秒數，預設跑 180（標準場）／120／600]

   ⚠ 跟舊的 balance-sim.mjs 最大的差別：這支**沒有給打字速度設下限**。
      舊版寫 `Math.max(0.3, cps)`，等於把 wpm 3/4/6 的學生全部當成 wpm 18
      來模擬，所以舊版印出來的「最慢的學生也能推倒 6 隻」是假的。
   ══════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8');
const m = src.match(/const BALANCE = (\{[\s\S]*?\n\};)/);
if (!m) {
  console.error('找不到 index.html 裡的 `const BALANCE = {...};`');
  process.exit(1);
}
// eslint-disable-next-line no-new-func
const B = new Function('return ' + m[1].slice(0, -1))();

/* 層級表：BALANCE.tier 做好之後（施工項目 M1）就改成直接讀 B.tier，
   在那之前先用 docs/BALANCE.md §7.2 的規格值。 */
const TIERS = B.tier || {
  A: { name: '初階', ctk0: 2.0, slope: 0.30, expMult: 1.00, ptK: 0.8 },
  B: { name: '中階', ctk0: 4.0, slope: 0.52, expMult: 1.25, ptK: 1.4 },
  C: { name: '高階', ctk0: 6.0, slope: 0.85, expMult: 1.50, ptK: 2.0 }
};
if (!B.tier) console.log('（BALANCE.tier 還沒做，先用 docs/BALANCE.md §7.2 的規格值）\n');

const Q = {
  normal: { mult: 1.5, chars: 2.0, expW: 1.000 },
  fine:   { mult: 2.0, chars: 2.0, expW: 1.333 },
  epic:   { mult: 2.9, chars: 3.5, expW: 1.933 },
  legend: { mult: 4.2, chars: 8.0, expW: 2.800 }
};
const WEAPON = { staff: 2.2, dagger: 2.0, bow: 1.8 };   // bow 以 100% 正確率估

const need = l => B.exp.needBase + B.exp.needStep * (l - 1) + B.exp.needQuad * (l - 1) ** 2;
const atk  = l => 1 + B.atkPerLv * (l - 1);
const ctkOf = (t, lv) => t.ctk0 + t.slope * (lv - 1);

/* 一場戰鬥。跟真正的引擎差在沒有連擊／特殊攻擊，抓的是趨勢不是精算。
   power = 天賦帶來的傷害倍率（1.0 代表沒點天賦）。 */
function one({ wpm, acc, tier, quality = 'normal', weapon = 'staff', seconds = 120, power = 1 }) {
  const q = Q[quality];
  const lenAdj = Math.pow(q.chars / 2, B.hp.lenPow);
  const hpOf = (lv, kind) => {
    const mult = kind === 'lord' ? B.lord.hpMult : kind === 'elite' ? B.elite.hpMult : 1;
    return Math.max(1, Math.round(q.mult * B.weaponRef * B.dmgScale * ctkOf(tier, lv) * lenAdj * mult));
  };
  const kindAt = (lv, kills) => (lv % B.zoneWidth === 0) ? 'lord'
                : ((kills + 1) % B.elite.every === 0) ? 'elite' : 'normal';

  const cps = (wpm / 60) / Math.max(acc, 0.3);      // 沒有下限，慢就是慢
  let t = 0, lv = 1, exp = 0, kills = 0, maxLv = 1, guard = 0;
  let hp = hpOf(1, kindAt(1, 0));
  while (guard++ < 200000) {
    const dt = q.chars / cps;
    if (t + dt > seconds) break;
    t += dt;
    const perfect = Math.random() < Math.pow(acc, q.chars);
    const correct = perfect ? q.chars : Math.max(1, Math.round(q.chars * acc));
    let dmg = correct * q.mult * B.dmgScale * WEAPON[weapon] * atk(lv) * power;
    exp += (correct * B.exp.perChar * q.expW + (perfect ? B.exp.perfectBonus : 0)) * tier.expMult;
    while (dmg > 0) {
      const take = Math.min(hp, dmg); hp -= take; dmg -= take;
      if (hp <= 0) {
        kills++;
        exp += (B.exp.killBase + B.exp.killPerLv * lv) * tier.expMult;
        while (exp >= need(lv)) { exp -= need(lv); lv++; }
        maxLv = Math.max(maxLv, lv);
        hp = hpOf(lv, kindAt(lv, kills));
      }
    }
    while (exp >= need(lv)) { exp -= need(lv); lv++; maxLv = Math.max(maxLv, lv); }
  }
  return { kills, lv: maxLv, zone: Math.ceil(maxLv / B.zoneWidth) };
}
function avg(n, o) {
  let k = 0, l = 0, z = 0;
  for (let i = 0; i < n; i++) { const r = one(o); k += r.kills; l += r.lv; z += r.zone; }
  return { kills: k / n, lv: l / n, zone: z / n };
}
/* docs/META-GROWTH.md §2 的成長點數 */
const growthPts = (r, wpm, tier, seconds) =>
  Math.min(Math.round(6 + (r.kills * 2 + r.lv) * tier.ptK + Math.floor(wpm / 5)),
           Math.round(30 * seconds / 60));

const STUDENTS = [
  ['wpm 2',   2, .85, 'A'], ['wpm 4',   4, .88, 'A'], ['wpm 6',  6, .90, 'A'],
  ['wpm 7',   7, .90, 'B'], ['wpm 10', 10, .92, 'B'], ['wpm 13', 13, .92, 'B'],
  ['wpm 14', 14, .93, 'C'], ['wpm 20', 20, .94, 'C'], ['wpm 30', 30, .95, 'C']
];

console.log(`BALANCE.ver = ${B.ver}\n`);

console.log('=== 1. CTK 曲線（打倒一隻要幾個正確字，docs/BALANCE.md §3）===');
console.log('LV'.padEnd(5) + ['初階', '中階', '高階'].map(s => s.padStart(7)).join(''));
for (const lv of [1, 3, 5, 10, 15, 20, 30]) {
  console.log(String(lv).padEnd(5) +
    ['A', 'B', 'C'].map(k => ctkOf(TIERS[k], lv).toFixed(1).padStart(7)).join(''));
}
console.log('\n    普通品質「要幾下」（含等級攻擊力成長）');
console.log('LV'.padEnd(5) + ['初階', '中階', '高階'].map(s => s.padStart(7)).join(''));
for (const lv of [1, 3, 5, 10, 20, 30]) {
  console.log(String(lv).padEnd(5) + ['A', 'B', 'C'].map(k =>
    (ctkOf(TIERS[k], lv) / (WEAPON.staff * atk(lv))).toFixed(1).padStart(7)).join(''));
}

/* 標準場＝老師設定的 180 秒（3 分鐘），§3/§4 的驗算都用這個長度 */
const STD = 180;
const durations = process.argv[2] ? [+process.argv[2]] : [STD, 120, 600];
for (const secs of durations) {
  console.log(`\n=== 2. ${secs} 秒場（普通・法杖，docs/BALANCE.md §11）===`);
  console.log('學生      層級   擊倒   到達LV   區域   成長點數');
  for (const [name, wpm, acc, tk] of STUDENTS) {
    const t = TIERS[tk], r = avg(400, { wpm, acc, tier: t, seconds: secs });
    console.log(`${name.padEnd(9)} ${t.name} ${r.kills.toFixed(1).padStart(6)} ` +
      `${r.lv.toFixed(1).padStart(7)} ${r.zone.toFixed(1).padStart(6)} ` +
      `${String(growthPts(r, wpm, t, secs)).padStart(9)}`);
  }
}

console.log(`\n=== 3. 升層那一步會不會變虧（${STD} 秒，docs/BALANCE.md §7.5）===`);
for (const [wpm, acc, lo, hi] of [[6, .90, 'A', 'B'], [13, .92, 'B', 'C']]) {
  const l = avg(400, { wpm, acc, tier: TIERS[lo], seconds: STD });
  const h = avg(400, { wpm, acc, tier: TIERS[hi], seconds: STD });
  const pl = growthPts(l, wpm, TIERS[lo], STD), ph = growthPts(h, wpm, TIERS[hi], STD);
  const d = Math.round((ph / pl - 1) * 100);
  console.log(`  wpm ${String(wpm).padStart(2)}：${TIERS[lo].name} ${l.kills.toFixed(1)} 隻 ${pl} 點` +
    ` → ${TIERS[hi].name} ${h.kills.toFixed(1)} 隻 ${ph} 點　(${d >= 0 ? '+' : ''}${d}%)` +
    (d < 0 ? '　⚠ 升層變虧了，點數係數要調高' : ''));
}

console.log(`\n=== 4. 天賦看不看得出效果（${STD} 秒場，傷害 +0% / +15% / +30%）===`);
for (const [name, wpm, acc, tk] of [['初階 wpm 4', 4, .88, 'A'], ['中階 wpm 10', 10, .92, 'B'], ['高階 wpm 20', 20, .94, 'C']]) {
  const o = [0, .15, .30].map(p => avg(500, { wpm, acc, tier: TIERS[tk], seconds: STD, power: 1 + p }));
  console.log(`  ${name.padEnd(12)} 擊倒 ${o.map(r => r.kills.toFixed(1)).join(' → ')}` +
    `　到達LV ${o.map(r => r.lv.toFixed(1)).join(' → ')}` +
    `　區域 ${o.map(r => r.zone.toFixed(1)).join(' → ')}`);
}

console.log('\n跑完了。這支沒有連擊、特殊攻擊，數字會跟真正遊戲差 ±10~20%，');
console.log('抓的是趨勢——三個層級的擊倒數有沒有落在同一個帶、升層會不會變虧、');
console.log('天賦加了傷害之後擊倒／等級／區域有沒有真的往前走。');
