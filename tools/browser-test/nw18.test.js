/* 平衡 V2 第 3 步：2b 裝備數值（docs/SPEC-BALANCE-V2.md §9）。純函式，用 node 直接測，不開瀏覽器。
   涵蓋：slotValue 對照 §9.1 逐格、戰力、盔甲無條件進位與重壓（strikeDamage，§9.2 的表）、屬性 ×1.05／×0.95 與封頂 1.37、
   「沒有存檔需要補償」（§9.4：舊存檔搬完的裝備數字新表不比舊表低、測試者之刃不變、2b 沒開放就不會有人有 2b 裝備）、
   跟模擬器 tools/nw-sim/curves.mjs 的 GEAR_V2（NW_PATCH=v2,gear,slam 用的那份）是同一組數字。
   另外可以拿真的成績匯出檔做開放前檢查（§9.4 ①②③）：node tools/browser-test/nw18.test.js --scores <mg_scores 匯出的 json>
   （放在 repo 外面；只印人數與件數，不印姓名座號） */
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const near = (a, b) => Math.abs(a - b) < 1e-9;
const fs = require('fs');

/* 改之前的表（2026-11-24 以前的 nw-data.js），用來證明「每一格新表都不比舊表低」 */
const OLD = {
  tb: { weapon: { base: [100, 105, 110], per: 2 }, helm: { base: [10, 20, 30], per: 2 }, armor: { base: [.04, .07, .10], per: .01 }, gloves: { base: [.2, .3, .4], per: .04 }, boots: { base: [.10, .20, .30], per: .03 } },
  power: { gray: 10, green: 20, blue: 30 }
};
const COLORS = ['gray', 'green', 'blue'];

(async () => {
  const D = await import('../../nw-data.js');
  const r2 = x => Math.round(x * 100) / 100;

  /* ═══ 1. slotValue 對照 §9.1 ═══ */
  /* 每一格寫死（不從 GEAR_TB 算），灰／綠／藍各 +0～+5 */
  const TB = {
    weapon: { gray: [100, 102, 104, 106, 108, 110], green: [110, 112, 114, 116, 118, 120], blue: [120, 122, 124, 126, 128, 130] },
    helm: { gray: [10, 13, 16, 19, 22, 25], green: [25, 28, 31, 34, 37, 40], blue: [40, 43, 46, 49, 52, 55] },
    armor: { gray: [.05, .06, .07, .08, .09, .10], green: [.10, .11, .12, .13, .14, .15], blue: [.15, .16, .17, .18, .19, .20] },
    gloves: { gray: [.2, .24, .28, .32, .36, .4], green: [.4, .44, .48, .52, .56, .6], blue: [.6, .64, .68, .72, .76, .8] },
    boots: { gray: [.10, .13, .16, .19, .22, .25], green: [.20, .23, .26, .29, .32, .35], blue: [.30, .33, .36, .39, .42, .45] }
  };
  for (const [slot, byColor] of Object.entries(TB)) {
    const got = {}; let good = true;
    for (const c of COLORS) { got[c] = [0, 1, 2, 3, 4, 5].map(p => D.slotValue(slot, c, p)); good = good && byColor[c].every((v, i) => near(got[c][i], v)); }
    ok(good, `slotValue ${slot}：灰／綠／藍 +0～+5 跟 §9.1 逐格一樣（${JSON.stringify(got)}）`);
  }
  ok(D.slotValue('weapon', 'gray', 5) === D.slotValue('weapon', 'green', 0) && D.slotValue('weapon', 'green', 5) === D.slotValue('weapon', 'blue', 0)
    && D.slotValue('helm', 'gray', 5) === D.slotValue('helm', 'green', 0) && D.slotValue('helm', 'green', 5) === D.slotValue('helm', 'blue', 0)
    && near(D.slotValue('armor', 'gray', 5), D.slotValue('armor', 'green', 0)) && near(D.slotValue('gloves', 'green', 5), D.slotValue('gloves', 'blue', 0)),
  '色階規則：下一色 +0 ＝ 上一色 +5（武器、頭盔、盔甲、護手）');
  ok(near(D.slotValue('boots', 'gray', 5), 0.25) && near(D.slotValue('boots', 'blue', 0), 0.30) && same(D.GEAR_TB.boots, { base: [.10, .20, .30], per: .03 }), '護腳照舊（0.10／0.20／0.30，每 +1 加 0.03），這次不動');
  ok(D.slotValue('weapon', 'green', 0, 112) === 112 && D.slotValue('weapon', 'green', 5, 112) === 122, '固定值的武器（測試者之刃 112）不受表影響：+0 112、+5 122');
  ok(same(D.GEAR_TB.weapon, { base: [100, 110, 120], per: 2 }) && same(D.GEAR_TB.helm, { base: [10, 25, 40], per: 3 }) && same(D.GEAR_TB.armor, { base: [.05, .10, .15], per: .01 }) && same(D.GEAR_TB.gloves, { base: [.2, .4, .6], per: .04 }), 'GEAR_TB 常數就是 §9.1「可以直接貼的常數」');

  /* ═══ 2. 戰力 ═══ */
  ok(same(D.POWER_BASE, { gray: 10, green: 22, blue: 34 }), 'POWER_BASE ＝ 灰 10／綠 22／藍 34');
  ok(D.gearPowerOf('gray', 0) === 10 && D.gearPowerOf('gray', 5) === 20 && D.gearPowerOf('green', 0) === 22 && D.gearPowerOf('green', 5) === 32 && D.gearPowerOf('blue', 0) === 34 && D.gearPowerOf('blue', 5) === 44, '戰力每件：灰 10→20、綠 22→32、藍 34→44（§9.1 每格的結果）');
  ok(D.gearPowerOf('green', 0) > D.gearPowerOf('gray', 5) && D.gearPowerOf('blue', 0) > D.gearPowerOf('green', 5), '綠 +0 的戰力高於灰 +5、藍 +0 高於綠 +5（「穿上」才會變金色）');
  {
    const n = D.normalizeNw({ starter: 'dagger' });
    n.gear.push({ id: 'g1', k: 'cloth_vest', c: 'gray', p: 5, t: 1 }, { id: 'g2', k: 'coo_hat', c: 'green', p: 0, t: 1 });
    ok(D.powerGain(n, 'g2') === 22 && D.powerGain(n, 'g1') === 20, '穿上的戰力差：沒穿東西的格子，綠 +0 多 22、灰 +5 多 20（綠的比較高）');
    n.eq.armor = 'g1';
    n.gear.push({ id: 'g3', k: 'frog_vest', c: 'green', p: 0, t: 1 });
    ok(D.powerGain(n, 'g3') === 2, '換盔甲：綠 +0（22）取代灰 +5（20）＝ +2，金色按鈕會亮');
  }

  /* ═══ 3. 盔甲無條件進位、重壓只打一下 ×1.5（strikeDamage，resolveStrike 用的那個函式） ═══ */
  ok(D.strikeDamage(5, 1, false, .05) === 4, '5 點攻擊穿灰盔甲 +0（5%）→ 4（以前四捨五入還是 5）');
  ok([.05, .10, .15, .20].every(c => D.strikeDamage(5, 1, false, c) === 4) && D.strikeDamage(6, 1, false, .10) === 5, '≤5 點的招式穿任何盔甲都剛好少 1 點；6 點穿 10% 也少 1 點');
  ok(Math.ceil(50 * 0.14) === 8 && Math.ceil(50 * 0.14 - 1e-9) === 7, '浮點誤差：50×0.14＝7.000000000000001，直接 ceil 會進位成 8；扣掉 1e-9 才是 7');
  ok(D.strikeDamage(50, 1, false, 0.14) === 43, 'strikeDamage(50, …, 0.14) ＝ 50 − 7 ＝ 43');
  ok(D.strikeDamage(1, 1, false, .2) === 1 && D.strikeDamage(1, 1, false, 0) === 1 && D.strikeDamage(10, 1, false, 0) === 10, '1 點的招式不會被減成 0；沒盔甲（cut 0）原樣');
  let allLess = true, mono = true;
  for (const c of [.05, .10, .15, .20, .50]) for (let d = 2, prev = 0; d <= 300; d++) {
    const v = D.strikeDamage(d, 1, false, c);
    if (!(v < d && v >= 1)) allLess = false;
    if (v < prev) mono = false;
    prev = v;
  }
  ok(allLess && mono, '每次至少少 1 點（2～300 點、5 種減傷）、傷害越大穿完越大');
  ok(D.strikeDamage(10, 1, true, 0) === 15 && D.strikeDamage(11, 1, true, 0) === 17 && D.strikeDamage(10, .5, false, 0) === 5, '重壓沒擋住：10 點 ×1.5＝15、11 點＝17（四捨五入），沒有 slam 不乘；掃線 mul 0.5 照乘');
  ok(D.strikeDamage(11, 1, true, 0) === 17 && D.strikeDamage(11, 1, true, .10) === 15, '重壓先乘 ×1.5 再穿盔甲：17 → 灰+5／綠+0 的 10% → 15');
  /* §9.2 的表：每個格子是（招式）× 盔甲（灰+0 5%／灰+5 10%／綠+5 15%／藍+5 20%） */
  const atk = (mk, name) => D.MONSTERS[mk].attacks.find(a => a.name === name);
  const cell = (mk, star, name, slam, k = 1) => [.05, .10, .15, .20].map(c => D.strikeDamage(D.monDmg(D.regionLv(mk === 'wolf' ? 'forest' : 'grass', star), atk(mk, name).mul * k), 1, slam, c));
  ok(same(cell('coo', 1, '衝刺啄', false), [4, 4, 4, 4]) && same(cell('coo', 5, '衝刺啄', false), [11, 10, 10, 9]), '§9.2：咕咕鳥衝刺啄 ★1（5 點）4／4／4／4、★5（12 點）11／10／10／9');
  ok(same(cell('frog', 3, '泡泡雨', true), [16, 15, 14, 13]), '§9.2：泡泡蛙泡泡雨 ★3（重壓 ×1.5，17 點）16／15／14／13');
  ok(same(cell('wolf', 5, '飛撲', false, 0.7), [19, 18, 17, 16]), '§9.2：炎牙狼飛撲 ★5（×0.7，20 點）19／18／17／16（×0.7 是之後第 8 步才加，這裡手動乘只為了對表）');
  {
    /* 戰鬥程式真的用 strikeDamage、重壓只扣一次：看原始碼，真的打一場在 nw14.test.js */
    const src = fs.readFileSync(__dirname + '/../../nw-battle.js', 'utf8'), i = src.indexOf('function resolveStrike'), body = src.slice(i, src.indexOf('function laneResolve', i));
    ok(/strikeDamage\(c\.base, st\.mul, st\.slam, GS\.cut\)/.test(body) && /c\.slamHit/.test(body) && !/Math\.round\(dmg \* \(1 - GS\.cut\)\)/.test(body), 'nw-battle.js 的 resolveStrike：用 strikeDamage、重壓用 slamHit 只扣一次、舊的四捨五入已拿掉');
  }

  /* ═══ 4. 屬性與封頂 ═══ */
  ok(D.ELEM_UP === 1.05 && D.ELEM_DOWN === 0.95 && D.GEAR_CAP === 1.37, '屬性 ×1.05／×0.95、武器×屬性封頂 1.37');
  ok(near(D.elemMulOf('fire', 'coo'), 1.05) && near(D.elemMulOf('fire', 'frog'), 0.95) && D.elemMulOf('fire', 'wolf') === 1 && D.elemMulOf(null, 'coo') === 1 && D.elemMulOf('fire', 'dragon') === 1, 'elemMulOf：打怕火的咕咕鳥 1.05、不怕火的泡泡蛙 0.95、炎牙狼沒有、沒屬性或不認得的魔物 1');
  const flame = p => D.gearStats({ ...D.normalizeNw({ starter: 'dagger' }), gear: [{ id: 'f', k: 'flame_dagger', c: 'blue', p, t: 1 }], eq: { weapon: 'f', helm: null, armor: null, gloves: null, boots: null }, gearV: 1 });
  ok(near(D.gearMul(flame(5), 'coo'), 1.365), '炎牙刀藍 +5 打咕咕鳥 gearMul＝1.365（130 × 1.05）');
  ok(near(D.gearMul(flame(0), 'coo'), 1.26) && [0, 1, 2, 3, 4, 5].every(p => D.gearMul(flame(p + 1 > 5 ? 5 : p + 1), 'coo') >= D.gearMul(flame(p), 'coo')) && [0, 1, 2, 3, 4].every(p => D.gearMul(flame(p + 1), 'coo') > D.gearMul(flame(p), 'coo')), '強化每一級都有用：藍 +0 是 1.26，+1～+5 一路上升，沒有被封頂吃掉（舊的 ×1.1 封頂 1.32，+0 就頂到了）');
  ok(near(D.gearMul(flame(5), 'frog'), 1.235) && near(D.gearMul(flame(5), 'wolf'), 1.3), '打不怕火的泡泡蛙 ×0.95＝1.235；炎牙狼沒屬性 1.3');
  /* 封頂邊界：atk × 1.05 ＝ 1.37 剛好在 atk ≈ 130.476 */
  ok(D.gearMul({ atk: 130.4, elem: 'fire' }, 'coo') < 1.37 && near(D.gearMul({ atk: 130.4, elem: 'fire' }, 'coo'), 1.3692), '封頂邊界：攻擊力 130.4 × 1.05＝1.3692，還沒到');
  ok(D.gearMul({ atk: 130.48, elem: 'fire' }, 'coo') === 1.37 && D.gearMul({ atk: 131, elem: 'fire' }, 'coo') === 1.37 && D.gearMul({ atk: 200, elem: 'fire' }, 'coo') === 1.37, '封頂邊界：130.48 × 1.05 ＝ 1.37004 起，一律 1.37');
  ok(D.gearMul({ atk: 137, elem: null }, 'coo') === 1.37 && D.gearMul({ atk: 138, elem: null }, 'wolf') === 1.37 && near(D.gearMul({ atk: 136.9, elem: null }, 'wolf'), 1.369), '沒屬性的武器也封頂：136.9 → 1.369、137 以上 → 1.37');
  ok(D.gearMul({ atk: 100, elem: null }, 'coo') === 1 && near(D.gearMul({ atk: 112, elem: null }, 'coo'), 1.12), '沒裝備 ×1、測試者之刃 ×1.12 不變');

  /* ═══ 5. 沒有存檔需要補償（§9.4） ═══ */
  ok(same(D.OPEN_STAGES, ['1', '2b', '3s']) && D.stageOpen('2b') === true && D.stageOpen('2a') === false, 'OPEN_STAGES＝[\'1\',\'2b\',\'3s\']：2b 開、2a 沒開（開放當天沒有人做過或強化過裝備，舊存檔用 gearV 搬移，不需補償）');
  const oldVal = (slot, c, p, fixed) => r2((fixed != null ? fixed : OLD.tb[slot].base[Math.max(0, COLORS.indexOf(c))]) + OLD.tb[slot].per * p);
  let neverWeaker = true, strictlyStronger = 0;
  for (const slot of Object.keys(OLD.tb)) for (const c of COLORS) for (let p = 0; p <= 5; p++) {
    const a = D.slotValue(slot, c, p), b = oldVal(slot, c, p);
    if (!(a >= b - 1e-9) || (slot === 'boots' && !near(a, b))) neverWeaker = false;
    if (a > b + 1e-9) strictlyStronger++;
  }
  ok(neverWeaker && strictlyStronger > 0, `18 格×6 級（五格各三色 +0～+5）新表都不比舊表低（有 ${strictlyStronger} 格變強、護腳全部一樣）：就算有人有 2b 裝備也只會變強，不用補償`);
  ok(COLORS.every(c => [0, 1, 2, 3, 4, 5].every(p => D.gearPowerOf(c, p) >= OLD.power[c] + 2 * p)), '戰力：每一色每一級都不比舊的低');
  {
    /* 各種舊存檔搬完會有的裝備：4 把初心武器 × 有沒有老師送的測試者之刃 × 有沒有穿 */
    const shapes = [];
    for (const starter of Object.keys(D.STARTERS)) for (const gw of [[], ['testblade']]) for (const equip of (gw.length ? ['', 'testblade'] : [''])) shapes.push({ starter, gw, equip, coins: 120, mats: { coo_feather: 3 } });
    shapes.push({ gw: ['testblade'], equip: 'testblade' }, { starter: 'nope' }, {});   // 還沒選初心武器、亂寫的、空的
    const saved = shapes.map(s => D.normalizeNw(JSON.parse(JSON.stringify(s))));
    ok(saved.every(n => n.gearV === 1 && n.forge.made === 0 && n.forge.ups === 0 && n.forge.top === 0 && n.forge.gift === 0), `${saved.length} 種舊存檔搬完：gearV 1、做過 0 件、強化 0 次（forge 全 0）`);
    ok(saved.every(n => n.gear.every(g => g.p === 0 && ((g.s === 1 && g.c === 'gray' && /^w_/.test(g.k)) || (g.k === 'testblade' && g.c === 'green')))), '搬完的裝備只有「灰色 +0 的初心武器」與「綠色 +0 的測試者之刃」，沒有別的、沒有強化過');
    const sameAtk = saved.every(n => {
      const v = D.gearStats(n), w = D.equippedItem(n, 'weapon');
      if (!w) return v.atk === 100 && v.pw === 0;
      const fixed = D.gearDef(w.k).fixed ? D.gearDef(w.k).fixed.atk : null, old = oldVal('weapon', w.c, w.p, fixed);
      return v.atk === old && v.pw >= OLD.power[w.c];
    });
    ok(sameAtk, '每個舊存檔穿著的武器攻擊力跟舊表完全一樣（初心武器 100、測試者之刃 112）；戰力只有測試者之刃從 20 變 22');
    const tb = saved.find(n => n.gw.includes('testblade') && n.equip === 'testblade');
    ok(tb && D.gearStats(tb).atk === 112 && D.gearStats(tb).pw === 22 && D.curWeapon(tb) === 'testblade' && D.itemValue(tb.gear.find(g => g.k === 'testblade')) === 112, '測試者之刃（509 班已送出）：攻擊力 112 不變，戰力用新綠 22，curWeapon 還是 testblade');
    const tb5 = { ...tb.gear.find(g => g.k === 'testblade'), p: 5 };
    ok(D.itemValue(tb5) === 122 && near(D.gearMul({ atk: 122, elem: null }, 'coo'), 1.22) && D.itemPower(tb5) === 32, '測試者之刃強化到 +5：122（比新綠 +5 的 120 高 2，維持「老師送的比較特別」）、戰力 32');
    ok(saved.every(n => (n.eq.weapon === null) === (n.gear.length === 0)) && saved.filter(n => D.STARTERS[n.starter]).every(n => n.eq.weapon && D.gearItem(n, n.eq.weapon)), '舊欄位搬法沒被動到：有初心武器就穿著它');
    /* 舊欄位：equip／gw／starter 照寫，再存再讀不變（gearV 旗標只搬一次） */
    const rt = saved.every(n => same(D.normalizeNw(JSON.parse(JSON.stringify(n))), n));
    ok(rt, '存檔再存再讀完全一樣（gearV 為 1 不重搬；equip、gw、starter 舊欄位照寫）');
    ok(saved.filter(n => n.equip === 'testblade').every(n => same(n.gw, ['testblade']) && n.gear.some(g => g.k === 'testblade')) && saved.filter(n => n.starter === 'staff').every(n => n.starter === 'staff'), 'syncLegacy：穿著測試者之刃 equip 寫 testblade、gw 有它；starter 欄位保留');
    /* 已經是 gearV 1 的存檔，裝備資料照原樣讀回（數字不存、由表即時算）：存的只有 { id, k, c, p, t } */
    const forged = D.normalizeNw({ gearV: 1, starter: 'dagger', gear: [{ id: 'g0', k: 'w_dagger', c: 'gray', p: 0, t: 0, s: 1 }, { id: 'x1', k: 'coo_hat', c: 'green', p: 3, t: 5 }, { id: 'x2', k: 'wolf_mail', c: 'blue', p: 5, t: 6 }], eq: { weapon: 'g0', helm: 'x1', armor: 'x2', gloves: null, boots: null } });
    const gs = D.gearStats(forged);
    ok(forged.gearV === 1 && forged.gear.length === 3 && gs.hp === 34 && near(gs.cut, 0.20) && gs.pw === 10 + (22 + 6) + (34 + 10) && Object.keys(forged.gear[1]).sort().join() === 'c,id,k,p,t', '真的有 2b 裝備的存檔（假設）：只存 { id, k, c, p, t }，數字隨新表變（綠頭盔 +3 ＝ 34、藍盔甲 +5 ＝ 20%），沒有舊數字要搬');
  }

  /* ═══ 6. 跟模擬器是同一組數字 ═══ */
  {
    const C = await import('../nw-sim/curves.mjs');
    const V = C.GEAR_V2;
    const tbOk = Object.entries(V).filter(([k]) => D.GEAR_TB[k]).every(([k, [b, per]]) => same(D.GEAR_TB[k].base, b) && D.GEAR_TB[k].per === per);
    ok(tbOk && same(D.POWER_BASE, V.power) && D.ELEM_UP === V.elem.up && D.ELEM_DOWN === V.elem.down, 'tools/nw-sim/curves.mjs 的 GEAR_V2（NW_PATCH=v2,gear,slam 套的那份）＝ nw-data.js 的 GEAR_TB／POWER_BASE／屬性：套 patch 與不套結果相同');
  }

  /* ═══ 7. 開放前檢查：真的成績匯出檔（選用，§9.4 ①②③） ═══ */
  const i = process.argv.indexOf('--scores');
  if (i > 0) {
    const raw = JSON.parse(fs.readFileSync(process.argv[i + 1], 'utf8'));
    const docs = Array.isArray(raw) ? raw : Object.values(raw), nws = docs.map(d => d && (d.nw || (d.data && d.data.nw))).filter(Boolean);
    const made = nws.filter(n => n.forge && n.forge.made > 0).length, ups = nws.filter(n => n.forge && n.forge.ups > 0).length;
    const ownsGear = nws.filter(n => Array.isArray(n.gear) && n.gear.some(g => g.p > 0 || !((g.s === 1 && /^w_/.test(g.k) && g.c === 'gray') || (g.k === 'testblade')))).length;
    const gifted = nws.filter(n => n.forge && n.forge.gift > 0).length;
    console.log(`INFO 讀到 ${docs.length} 份成績、${nws.length} 份有新世界存檔`);
    ok(made === 0 && ups === 0 && ownsGear === 0, `開放前檢查：forge.made > 0 的 ${made} 人、forge.ups > 0 的 ${ups} 人、有強化過或初心武器／測試者之刃以外裝備的 ${ownsGear} 人（都應該是 0）`);
    console.log(`INFO forge.gift > 0（老師信箱送過裝備或鐵匠送過布裝圖紙）的有 ${gifted} 人：新色階只會讓他們變強，不會變弱`);
  }

  console.log(fails ? `\n${fails} 個失敗` : '\n全部通過');
  process.exit(fails ? 1 : 0);
})();
