/* 2b 一學期進度預測（docs/research/BALANCE-2B-ANALYSIS.md §7）：逐人、逐場的「代理人」模擬。
   用法：node tools/nw-sim/bal2b-term.mjs [--sessions 14] [--per 2] [--reps 3] [--policy pref|goal] [--spend greedy|craft] [--tier real|infer] [--scen att|spec] [--floor 4] [--file 匯出檔]
   --spend greedy＝戰力優先（新做的比現在穿的戰力高才做；有錢就強化）；craft＝有圖紙有材料就先做更高顏色的（即使戰力暫時比較低），為了做而存錢（不強化）
   做法：每個真實學生（匯出檔的速度、層級、慣用武器）從零開始，每節課 2 場、共 14 節；每場開打前照一套「合理的貪心策略」
        打造／強化（用 nw-data.js 真正的 craftCheck／doCraft／upCheck／doUpgrade，所以配方、費用、材料先用誰都跟遊戲一樣），
        打的結果用 sim.mjs 真的模擬一場（帶著當時穿的裝備），再依 newworld.js 的結算規則給字元、材料、圖紙（輸一半、至少 1 個；圖紙有保底）。
   只算 2b 開放後的進度：把 2b 當成開放（戰鬥中的 stageOpen 只影響任務 1-5、1-6 的 hold）。
   不知道的（所以是假設，不是資料）：每節真正玩幾場、學生挑哪隻魔物、打字速度會不會成長（這裡不成長＝保守）、有沒有人刻意存錢。 */
import { readFileSync } from 'node:fs';
import {
  MONSTERS, REGIONS, MAIN_QUESTS, GEAR_DEFS, defaultNw, setStarter, giveClothBps, craftCheck, doCraft, upCheck, doUpgrade, doEquip, gearStats, equippedItem, gearDef,
  weaponBase, rollBlueprints, huntCoins, regionLv, zoneOpen, starOpen, itemPower, gearPowerOf, MAT_INFO, bpKnown, GEAR_SLOTS
} from '../../nw-data.js';
import { simulate, DEFAULT_ASSUME } from './sim.mjs';

/* 讓 nw-data.js 的 stageOpen('2b') 為真（只在 node、只影響任務 1-5、1-6 的 hold） */
globalThis.window = { __NW_STAGES__: ['1', '2b'] };
globalThis.location = { hostname: 'localhost' };

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : args[i + 1]; };
const SESSIONS = +opt('--sessions', 14), PER = +opt('--per', 2), REPS = +opt('--reps', 3);
const SPEND = opt('--spend', 'greedy'), FLOOR = opt('--floor', null);
const POLICY = opt('--policy', 'pref'), TIERRULE = opt('--tier', 'real'), SCEN = opt('--scen', 'att');
const FILE = opt('--file', null) || new URL('../../data-public/typehero-speed-20261120.json', import.meta.url);
const raw = JSON.parse(readFileSync(FILE, 'utf8'));
const ok = v => typeof v === 'number' && Number.isFinite(v);
const WEAPONS = ['staff', 'bow', 'dagger', 'crossbow'];
const tierFromWpm = w => (w >= 28 ? 'D' : w >= 14 ? 'C' : w >= 6 ? 'B' : 'A');
const STUDENTS = raw.rows.filter(r => (ok(r.bestWpm) ? r.bestWpm : ok(r.lastWpm) ? r.lastWpm : 0) > 0).map(r => {
  const wpm = ok(r.bestWpm) ? r.bestWpm : r.lastWpm;
  const t = ['A', 'B', 'C', 'D'].includes(r.tier) ? r.tier : null;
  return { wpm, acc: ok(r.bestAcc) ? r.bestAcc : ok(r.lastAcc) ? r.lastAcc : 97, tier: TIERRULE === 'infer' ? (t || tierFromWpm(wpm)) : (t || 'B'), weapon: WEAPONS.includes(r.lastWeapon) ? r.lastWeapon : 'staff' };
});
/* 閃避／防禦成功率的兩種假設：att＝bal2b.mjs fit 的結果（attendDodge 0.11、attendDef 0.73）；spec＝人人都躲 */
const ASSUME = { ...DEFAULT_ASSUME, ...(SCEN === 'att' ? { attendDodge: 0.11, attendDef: 0.73 } : {}), ...(FLOOR != null ? { cpmFloor: +FLOOR } : {}) };

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* 學生挑哪隻魔物：真實 dex 的偏好（跳跳菇 46%、咕咕鳥 21%、泡泡蛙 17%、炎牙狼 14%）；goal＝想做的下一件缺什麼材料就去打掉那個的魔物 */
const PREF = { shroom: 0.46, coo: 0.21, frog: 0.17, wolf: 0.14 };
const MAT_OWNER = {}; Object.entries(MONSTERS).forEach(([mk, m]) => m.drops.forEach(([id]) => { MAT_OWNER[id] = mk; }));
/* 打造優先序（key、顏色）：布裝先（便宜）→ 綠武器 → 綠防具 → 藍。炎牙刀只給雙刀玩家（換武器種類會慢 30%，見 BALANCE-GEAR-2B 附） */
const CRAFTS = starter => [['cloth_hat', 'gray'], ['cloth_vest', 'gray'], ['cloth_gloves', 'gray'], ['cloth_shoes', 'gray'],
  ['w_' + starter, 'green'], ['coo_hat', 'green'], ['frog_vest', 'green'], ['frog_boots', 'green'], ['coo_gloves', 'green'], ['shroom_cap', 'green'],
  ['wolf_mail', 'blue'], ...(starter === 'dagger' ? [['flame_dagger', 'blue']] : [])];
const COL = ['gray', 'green', 'blue'];
const UP_ORDER = ['weapon', 'armor', 'helm', 'boots', 'gloves'];

const slotOf = key => gearDef(key).slot;
const powerOfNew = c => gearPowerOf(c, 0);

function checkQuests(nw, log) {
  for (const q of MAIN_QUESTS) {
    if (nw.quest.done.includes(q.id)) continue;
    if (q.hold && q.hold()) continue;
    if (!q.test(nw)) { if (q.soft) continue; break; }
    nw.quest.done.push(q.id);
    const r = q.reward || {};
    if (r.coins) { nw.coins += r.coins; log.coinsIn += r.coins; log.questCoins += r.coins; }
    if (r.bp) r.bp.forEach(b => { if (!nw.bp.includes(b)) nw.bp.push(b); });
  }
}

/* 開打前：能做的先做、能強化的就強化，直到沒東西可買 */
function spend(nw, st, log) {
  if (!nw.forge.gift) giveClothBps(nw);
  for (let guard = 0; guard < 40; guard++) {
    let acted = false;
    for (const [key, c] of CRAFTS(st.weapon)) {
      const d = gearDef(key); if (!d) continue;
      const cur = equippedItem(nw, d.slot), curPw = cur ? itemPower(cur) : -1;
      /* craft 策略：顏色更高就做（灰 +5 的戰力＝綠 +0，greedy 看不出綠色的上限比較高） */
      if (SPEND === 'craft' ? (!cur ? false : COL.indexOf(c) <= COL.indexOf(cur.c)) : powerOfNew(c) <= curPw) continue;
      if (!bpKnown(nw, GEAR_DEFS[key])) continue;
      const ck = craftCheck(nw, key, c);
      if (!ck.ok) continue;
      /* 先記花了什麼 */
      const spent = { coins: ck.coins, mats: { ...ck.use } };
      const it = doCraft(nw, key, c); if (!it) continue;
      doEquip(nw, it.id);
      log.coinsOut += spent.coins; log.craftCoins += spent.coins;
      for (const [id, n] of Object.entries(spent.mats)) log.matsOut[colorOf(id)] += n;
      log.crafted++; if (log.firstGreen === null && c === 'green') log.firstGreen = log.session;
      acted = true; break;
    }
    if (acted) continue;
    if (SPEND === 'craft' && savingForCraft(nw, st)) break;
    for (const slot of UP_ORDER) {
      const it = equippedItem(nw, slot); if (!it || it.p >= 5) continue;
      const ck = upCheck(nw, it.id);
      if (!ck.ok) continue;
      const spent = { coins: ck.coins, mats: { ...ck.use } };
      doUpgrade(nw, it.id);
      log.coinsOut += spent.coins; log.upCoins += spent.coins;
      for (const [id, n] of Object.entries(spent.mats)) log.matsOut[colorOf(id)] += n;
      log.ups++; acted = true;
      if (slot === 'weapon') { const wp = equippedItem(nw, 'weapon').p; if (wp >= 3 && log.wp3 === null) log.wp3 = log.session; if (wp >= 5 && log.wp5 === null) log.wp5 = log.session; }
      break;
    }
    if (!acted) break;
  }
  checkQuests(nw, log);
}
/* craft 策略：還有一件「圖紙學了、材料夠、只差字元」的更高顏色裝備，就先存錢不強化 */
function savingForCraft(nw, st) {
  for (const [key, c] of CRAFTS(st.weapon)) {
    const d = gearDef(key); if (!d || !bpKnown(nw, GEAR_DEFS[key])) continue;
    const cur = equippedItem(nw, d.slot); if (cur && COL.indexOf(c) <= COL.indexOf(cur.c)) continue;
    const ck = craftCheck(nw, key, c);
    if (!ck.ok && ck.lack.length && ck.lack.every(l => l.what === '字元')) return true;
  }
  return false;
}
const colorOf = id => (MAT_INFO[id] || [id, 'gray'])[1];

/* 想做的下一件（goal 策略用）：第一件還沒做的 CRAFTS 且圖紙已學、顏色比現在高 */
function wantedMats(nw, st) {
  for (const [key, c] of CRAFTS(st.weapon)) {
    const d = gearDef(key), cur = equippedItem(nw, d.slot);
    if (powerOfNew(c) <= (cur ? itemPower(cur) : -1)) continue;
    if (!bpKnown(nw, GEAR_DEFS[key])) { const owner = Object.keys(MONSTERS).find(mk => MONSTERS[mk].rare.some(([id]) => id === GEAR_DEFS[key].bp)); return owner ? [owner] : []; }
    const ck = craftCheck(nw, key, c);
    if (ck.ok) return [];
    return [...new Set(ck.lack.filter(l => l.what !== '字元').map(l => {
      const hit = Object.entries(MAT_INFO).find(([id, [n]]) => n === l.what); return hit ? MAT_OWNER[hit[0]] : null;
    }).filter(Boolean))];
  }
  return [];
}

function pickTarget(nw, st, r, lossStreak) {
  const rk = zoneOpen(nw, 'forest') ? 'forest' : 'grass', mons = REGIONS[rk].mons;
  let star = 1; for (let s = 5; s >= 1; s--) if (starOpen(nw, rk, s)) { star = s; break; }
  if (lossStreak >= 2) star = Math.max(1, star - 1);
  let pool = mons.map(mk => [mk, PREF[mk]]);
  if (POLICY === 'goal') {
    const want = wantedMats(nw, st);
    /* 想要的材料在另一區：森林開了就可以去（炎牙狼只在森林） */
    const inRegion = want.filter(mk => mons.includes(mk));
    if (inRegion.length && r() < 0.7) pool = inRegion.map(mk => [mk, 1]);
  }
  const tot = pool.reduce((a, [, w]) => a + w, 0); let x = r() * tot, mk = pool[0][0];
  for (const [m, w] of pool) { x -= w; if (x <= 0) { mk = m; break; } }
  return { rk, mk, star };
}

function runStudent(st, seed) {
  const r = rng(seed), nw = defaultNw();
  nw.tut = { dodge: 1, defend: 1, attack: 1 };
  setStarter(nw, st.weapon);
  const log = { session: 0, coinsIn: 0, coinsOut: 0, questCoins: 0, huntCoins: 0, craftCoins: 0, upCoins: 0, matsIn: { gray: 0, green: 0, blue: 0 }, matsOut: { gray: 0, green: 0, blue: 0 }, crafted: 0, ups: 0, firstGreen: null, wins: 0, hunts: 0, forestWins: 0, downs: 0, bpGot: 0, firstForest: null, wp3: null, wp5: null, snap: {} };
  checkQuests(nw, log);
  let lossStreak = 0;
  for (let s = 1; s <= SESSIONS; s++) {
    log.session = s;
    for (let h = 0; h < PER; h++) {
      spend(nw, st, log);
      const t = pickTarget(nw, st, r, lossStreak), lv = regionLv(t.rk, t.star), gs = gearStats(nw), w = equippedItem(nw, 'weapon');
      const wb = w ? weaponBase(gearDef(w.k).wk) : st.weapon;
      const exp = Math.min(1, 0.2 + 0.05 * s);
      const res = simulate(st, t.mk, t.rk, t.star, exp, seed * 1009 + s * 31 + h, ASSUME, { gear: gs, weapon: wb });
      const win = res.result === 'win';
      log.hunts++; log.downs += res.downs;
      nw.stat.dodgeOk += res.dodgeOk; nw.stat.dodgeAll += res.dodgeAll; nw.stat.defOk += res.defOk; nw.stat.defAll += res.defAll;
      if (win) { log.wins++; lossStreak = 0; nw.dex[t.mk] = (nw.dex[t.mk] || 0) + 1; if (t.star > (nw.zone[t.rk] || 0)) nw.zone[t.rk] = t.star; if (t.rk === 'forest') { log.forestWins++; if (log.firstForest === null) log.firstForest = s; } }
      else lossStreak++;
      const c = huntCoins(lv, win); nw.coins += c; log.coinsIn += c; log.huntCoins += c;
      const rolls = win ? 1 : 0.5;
      MONSTERS[t.mk].drops.forEach(([id, , color, lo, hi]) => {
        const n = Math.max(1, Math.round((lo + Math.floor(r() * (hi - lo + 1))) * rolls));
        nw.mats[id] = (nw.mats[id] || 0) + n; log.matsIn[color] += n;
      });
      if (win) log.bpGot += rollBlueprints(nw, t.mk, r).length;
      checkQuests(nw, log);
    }
    if (s === Math.ceil(SESSIONS / 2) || s === SESSIONS) log.snap[s] = { coins: nw.coins, mats: matsBy(nw), pw: gearStats(nw).pw };
  }
  spend(nw, st, log);   // 最後一節下課前也能買
  const stt = gearStats(nw);
  const eq = Object.fromEntries(GEAR_SLOTS.map(([sl]) => [sl, equippedItem(nw, sl)]));
  return { st, log, nw, stt, eq, mats: matsBy(nw), zone: { ...nw.zone } };
}
function matsBy(nw) { const o = { gray: 0, green: 0, blue: 0 }; for (const [id, n] of Object.entries(nw.mats)) if (!id.startsWith('bp_')) o[colorOf(id)] += n; return o; }

/* ── 彙總 ── */
const q = (a, p) => { if (!a.length) return NaN; const s = a.slice().sort((x, y) => x - y), i = (s.length - 1) * p, l = Math.floor(i), h = Math.ceil(i); return s[l] + (s[h] - s[l]) * (i - l); };
const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const pct = x => Math.round(x * 100) + '%';
const f0 = x => Number.isFinite(x) ? Math.round(x) : '--';
const f1 = x => Number.isFinite(x) ? x.toFixed(1) : '--';
const GROUPS = [['極慢（≤4）', 0, 4], ['慢（5～8）', 5, 8], ['中（9～17）', 9, 17], ['快（≥18）', 18, 999]];
const groupOf = w => GROUPS.findIndex(([, lo, hi]) => w >= lo && w <= hi);

const runs = [];
STUDENTS.forEach((st, i) => { for (let k = 0; k < REPS; k++) runs.push(runStudent(st, 100000 + i * 17 + k * 7919)); });

console.log(`## term：${STUDENTS.length} 個真實學生 × ${REPS} 次、${SESSIONS} 節 × 每節 ${PER} 場；挑魔物＝${POLICY}、花錢＝${SPEND}、速度下限＝${FLOOR == null ? 4 : FLOOR}、層級＝${TIERRULE}、閃避假設＝${SCEN}`);
console.log(`（模擬打字速度不成長；每節只打這麼多場；以上都是假設）\n`);
const row = (name, f) => console.log(`${name.padEnd(14)}` + GROUPS.map((g, gi) => { const rs = runs.filter(r => groupOf(r.st.wpm) === gi); return String(f(rs)).padEnd(26); }).join(''));
console.log(''.padEnd(14) + GROUPS.map((g, gi) => `${g[0]}（${new Set(STUDENTS.filter(s => groupOf(s.wpm) === gi)).size}人）`.padEnd(26)).join(''));
const med = (rs, f) => f0(q(rs.map(f), .5)), iqr = (rs, f) => `${f0(q(rs.map(f), .25))}～${f0(q(rs.map(f), .75))}`;
row('勝率', rs => pct(mean(rs.map(r => r.log.wins / r.log.hunts))));
row('倒下／場', rs => (mean(rs.map(r => r.log.downs / r.log.hunts))).toFixed(2));
row('草原最高★中位', rs => `${med(rs, r => r.zone.grass || 0)}（${iqr(rs, r => r.zone.grass || 0)}）`);
row('進過森林', rs => pct(mean(rs.map(r => (r.zone.grass || 0) >= 5 ? 1 : 0))));
row('森林最高★中位', rs => `${med(rs, r => r.zone.forest || 0)}`);
row('打過炎牙狼%', rs => pct(mean(rs.map(r => (r.nw.dex.wolf || 0) > 0 ? 1 : 0))));
row('做出裝備件數', rs => `${med(rs, r => r.log.crafted)}（${iqr(rs, r => r.log.crafted)}）`);
row('強化次數', rs => `${med(rs, r => r.log.ups)}（${iqr(rs, r => r.log.ups)}）`);
row('第一件綠(節)', rs => { const a = rs.map(r => r.log.firstGreen).filter(v => v !== null); return `${pct(a.length / rs.length)} 做到，中位第${f0(q(a, .5))}節`; });
row('穿滿五格%', rs => pct(mean(rs.map(r => GEAR_SLOTS.every(([sl]) => r.eq[sl] && (sl !== 'weapon' || true)) && ['helm', 'armor', 'gloves', 'boots'].every(sl => r.eq[sl]) ? 1 : 0))));
row('有藍裝備%', rs => pct(mean(rs.map(r => GEAR_SLOTS.some(([sl]) => r.eq[sl] && r.eq[sl].c === 'blue') ? 1 : 0))));
row('武器+3 節次', rs => { const a = rs.map(r => r.log.wp3).filter(v => v !== null); return `${pct(a.length / rs.length)} 做到，中位第${f0(q(a, .5))}節`; });
row('武器+5 節次', rs => { const a = rs.map(r => r.log.wp5).filter(v => v !== null); return `${pct(a.length / rs.length)} 做到，中位第${f0(q(a, .5))}節`; });
row('武器 +5 %', rs => pct(mean(rs.map(r => r.eq.weapon && r.eq.weapon.p >= 5 ? 1 : 0))));
row('全身綠+5 %', rs => pct(mean(rs.map(r => GEAR_SLOTS.every(([sl]) => r.eq[sl] && r.eq[sl].c !== 'gray' && r.eq[sl].p >= 5) ? 1 : 0))));
row('戰力中位', rs => `${med(rs, r => r.stt.pw)}（${iqr(rs, r => r.stt.pw)}）〔滿＝灰全身50 綠全身+5 150〕`);
row('攻擊力中位', rs => `${med(rs, r => r.stt.atk)}（${iqr(rs, r => r.stt.atk)}）`);
console.log('\n### 字元（來源／去處／剩）');
row('字元收入', rs => `${med(rs, r => r.log.coinsIn)}（${iqr(rs, r => r.log.coinsIn)}）`);
row(' 其中狩獵', rs => `${med(rs, r => r.log.huntCoins)}`);
row(' 其中主線任務', rs => `${med(rs, r => r.log.questCoins)}`);
row('字元花掉', rs => `${med(rs, r => r.log.coinsOut)}（打造 ${med(rs, r => r.log.craftCoins)}／強化 ${med(rs, r => r.log.upCoins)}）`);
row('期中剩(第7節)', rs => `${med(rs, r => r.log.snap[Math.ceil(SESSIONS / 2)].coins)}（${iqr(rs, r => r.log.snap[Math.ceil(SESSIONS / 2)].coins)}）`);
row('期末剩', rs => `${med(rs, r => r.nw.coins)}（${iqr(rs, r => r.nw.coins)}）`);
row('期末剩 >300 %', rs => pct(mean(rs.map(r => r.nw.coins > 300 ? 1 : 0))));
console.log('\n### 材料（中位；來源／花掉／期末剩；灰／綠／藍）');
for (const c of ['gray', 'green', 'blue']) {
  row({ gray: '灰', green: '綠', blue: '藍' }[c] + ' 來源', rs => med(rs, r => r.log.matsIn[c]));
  row({ gray: '灰', green: '綠', blue: '藍' }[c] + ' 花掉', rs => med(rs, r => r.log.matsOut[c]));
  row({ gray: '灰', green: '綠', blue: '藍' }[c] + ' 期末剩', rs => `${med(rs, r => r.mats[c])}（${iqr(rs, r => r.mats[c])}）`);
}
console.log('\n### 卡在哪：期末下一個想買的東西，缺的是字元還是材料（只看還沒滿的人）');
row('圖紙收齊%', rs => pct(mean(rs.map(r => Object.values(MONSTERS).every(m => m.rare.every(([id]) => r.nw.bp.includes(id))) ? 1 : 0))));
row('字元≥300且材料缺', rs => {
  const open = rs.filter(r => ['weapon', 'armor', 'helm', 'boots', 'gloves'].some(sl => r.eq[sl] && r.eq[sl].p < 5));
  const x = open.filter(r => r.nw.coins >= 300).length; return `${pct(x / (open.length || 1))}（未滿 ${open.length} 人中）`;
});
