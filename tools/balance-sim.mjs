#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════
   打字勇者・平衡驗算器

   直接讀 ../index.html，把裡面那個 `const BALANCE = {...};` 物件抓出來
   （不是另外複製一份數字——改了 BALANCE 馬上就能跑這支看有沒有跑偏），
   印出跟 docs/BALANCE.md 對得上的三張表：
     1. 血量表（§3）——每個等級、每種品質的血量
     2. DDA 收斂模擬（§7）——幾種典型學生連打 5 場，難度會不會收斂到合理值
     3. wpm 對照表（§11）——2 分鐘場次，不同打字速度大概打幾下、到哪個等級

   用法：node tools/balance-sim.mjs
   ══════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.join(here, '..', 'index.html');

const src = fs.readFileSync(indexPath, 'utf8');
const m = src.match(/const BALANCE = (\{[\s\S]*?\n\};)/);
if (!m) {
  console.error('找不到 index.html 裡的 `const BALANCE = {...};`，平衡書的格式可能被改動了。');
  process.exit(1);
}
// eslint-disable-next-line no-new-func
const BALANCE = new Function('return ' + m[1].slice(0, -1))();

const QUALITIES = {
  normal: { mult: 1.5, chars: 2.0, expW: 1.000 },
  fine:   { mult: 2.0, chars: 2.0, expW: 1.333 },
  epic:   { mult: 2.9, chars: 3.5, expW: 1.933 },
  legend: { mult: 4.2, chars: 8.0, expW: 2.800 }
};
const WEAPON_ATK = { staff: 2.2, dagger: 2.0, bow: 1.8 };   // bow 以 100% 正確率估

function ctkAt(lv) {
  const h = BALANCE.hp;
  return h.ctk0 + (h.ctkMax - h.ctk0) * (1 - Math.exp(-(lv - 1) / h.tau)) + h.late * Math.max(0, lv - 10);
}
function monsterHp(lv, qualityKey, dda = 1) {
  const h = BALANCE.hp, q = QUALITIES[qualityKey];
  const lenAdj = Math.pow(q.chars / 2, h.lenPow);
  return Math.max(1, Math.round(q.mult * BALANCE.weaponRef * BALANCE.dmgScale * ctkAt(lv) * lenAdj * dda));
}
function atkAt(lv) { return 1 + BALANCE.atkPerLv * (lv - 1); }
function seedDda(wpm) {
  const d = BALANCE.dda;
  if (!(wpm > 0)) return d.seedNew;
  return Math.max(d.min, Math.min(1.6, d.seedFloor + d.seedSlope * wpm));
}
function updateDda(dda, kills) {
  const d = BALANCE.dda;
  let next = dda;
  if (kills < d.targetLo - 1) next *= d.downBig;
  else if (kills < d.targetLo) next *= d.downSmall;
  else if (kills > d.targetHi + 2) next *= d.upBig;
  else if (kills > d.targetHi) next *= d.upSmall;
  else next += (1 - next) * d.revert;
  return Math.max(d.min, Math.min(d.max, next));
}

/* 簡化版戰鬥模擬：跟實際引擎的差異是沒有連擊/特殊攻擊/菁英王級，
   只用來估「大概幾下、幾級、幾隻」，數字會跟真正遊戲有 ±10~20% 誤差，
   抓趨勢用，不是精算。要精算請直接玩或看 docs/BALANCE.md §11 的實測模擬。 */
function quickSim(wpm, acc, qualityKey, weaponKey, seconds, dda) {
  const q = QUALITIES[qualityKey];
  /* 這裡以前寫 Math.max(0.3, ...)，等於給打字速度設了下限：
     wpm 3/4/6 的學生全部被當成 wpm 18 來模擬，跑出來的「最慢的學生
     也能推倒 6 隻」是假的（真實資料裡他們是 0～2 隻）。下限拿掉了。 */
  const cps = (wpm / 60) / Math.max(acc, 0.3);
  let t = 0, lv = 1, exp = 0, kills = 0, dmg = 0, hits = 0;
  let monHp = monsterHp(1, qualityKey, dda);
  const need = l => BALANCE.exp.needBase + BALANCE.exp.needStep * (l - 1) + BALANCE.exp.needQuad * (l - 1) * (l - 1);
  while (true) {
    const dt = q.chars / cps;
    if (t + dt > seconds) break;
    t += dt; hits++;
    const perfect = Math.random() < Math.pow(acc, q.chars);
    const correct = perfect ? q.chars : Math.max(1, Math.round(q.chars * acc));
    const d = correct * q.mult * BALANCE.dmgScale * WEAPON_ATK[weaponKey] * atkAt(lv);
    dmg += d;
    exp += correct * BALANCE.exp.perChar * q.expW + (perfect ? BALANCE.exp.perfectBonus : 0);
    let left = d;
    while (left > 0) {
      const take = Math.min(monHp, left); monHp -= take; left -= take;
      if (monHp <= 0) {
        kills++; exp += BALANCE.exp.killBase + BALANCE.exp.killPerLv * lv;
        while (exp >= need(lv)) { exp -= need(lv); lv++; }
        monHp = monsterHp(lv, qualityKey, dda);
      }
    }
    while (exp >= need(lv)) { exp -= need(lv); lv++; }
  }
  return { kills, lv, dmg: Math.round(dmg), hits };
}
function avgSim(n, ...args) {
  let kills = 0, lv = 0, dmg = 0;
  for (let i = 0; i < n; i++) { const r = quickSim(...args); kills += r.kills; lv += r.lv; dmg += r.dmg; }
  return { kills: kills / n, lv: lv / n, dmg: dmg / n };
}

console.log(`BALANCE.ver = ${BALANCE.ver}\n`);

console.log('=== 1. 血量表（LV / 品質，docs/BALANCE.md §3）===');
console.log('LV'.padEnd(4) + 'CTK'.padEnd(7) + ['普通', '精良', '史詩', '傳奇'].map(s => s.padEnd(8)).join(''));
for (const lv of [1, 2, 3, 5, 8, 10, 15, 20, 30]) {
  const row = ['normal', 'fine', 'epic', 'legend'].map(q => String(monsterHp(lv, q)).padEnd(8)).join('');
  console.log(String(lv).padEnd(4) + ctkAt(lv).toFixed(1).padEnd(7) + row);
}

console.log('\n=== 2. DDA 收斂模擬（5 場，2 分鐘/普通/法杖，docs/BALANCE.md §7）===');
const profiles = [
  ['很慢', 4, .85], ['慢', 6, .80], ['中位', 10, .90],
  ['中上', 14, .92], ['快', 19, .93], ['很快', 31, .95]
];
for (const [label, wpm, acc] of profiles) {
  let dda = seedDda(wpm);
  const trail = [];
  for (let i = 0; i < 5; i++) {
    const r = avgSim(30, wpm, acc, 'normal', 'staff', 120, dda);
    trail.push(`${r.kills.toFixed(1)}@${dda.toFixed(2)}`);
    dda = updateDda(dda, r.kills);
  }
  console.log(`  ${label.padEnd(4)} wpm=${String(wpm).padStart(2)} acc=${acc}: ` + trail.join(' → '));
}

console.log('\n=== 3. wpm 對照表（2 分鐘/普通/法杖，dda=1.0，docs/BALANCE.md §11）===');
console.log('wpm  擊倒  到達LV  傷害');
for (const [, wpm, acc] of profiles.concat([['', 25, .95], ['', 45, .96]])) {
  const r = avgSim(40, wpm, acc, 'normal', 'staff', 120, 1.0);
  console.log(`${String(wpm).padStart(3)}  ${r.kills.toFixed(1).padStart(4)}  ${r.lv.toFixed(1).padStart(6)}  ${r.dmg.toFixed(0).padStart(6)}`);
}

console.log('\n跑完了。數字跟 docs/BALANCE.md 有落差很正常（這支是簡化模擬，');
console.log('沒有連擊、特殊攻擊、菁英王級），抓的是趨勢——DDA 有沒有收斂、');
console.log('血量曲線有沒有斷崖、wpm 越高擊倒數是不是確實越多。');
