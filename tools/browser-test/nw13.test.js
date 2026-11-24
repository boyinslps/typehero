/* 2b-2 舊存檔搬移與裝備資料（docs/SPEC-STAGE2.md §3.10、§6 的「nw12」；編號 nw13，原因見 nw12.test.js 開頭）。
   純函式，用 node 直接測，不開瀏覽器。
   涵蓋：5 種舊存檔搬成裝備格式（只有初心武器、有老師送的武器且穿著、換過武器、還沒選武器、equip 指到沒有的武器）、
   跑兩次不重搬（gearV 旗標）、gearV=1 卻沒有 gear 時只放一把初心武器、舊欄位（equip／gw）照寫、
   信箱 gear／bp 的規則（顏色上限、強化範圍、滿 60 件、已經會的圖紙換字元）、舊格式直接丟進 gearStats 不會壞。 */
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

(async () => {
  const D = await import('../../nw-data.js');
  const roundtrip = o => D.normalizeNw(JSON.parse(JSON.stringify(o)));

  /* 1. 只有初心武器 */
  let n = D.normalizeNw({ starter: 'staff' });
  ok(n.gearV === 1 && n.gear.length === 1 && n.gear[0].k === 'w_staff' && n.gear[0].c === 'gray' && n.gear[0].p === 0 && n.gear[0].s === 1 && n.eq.weapon === n.gear[0].id, '只有初心武器：搬成一件灰色 +0 的學徒木杖並穿著');
  ok(D.curWeapon(n) === 'staff' && D.gearStats(n).atk === 100 && D.gearStats(n).pw === 10 && n.equip === '' && same(n.gw, []), '武器種類 staff、攻擊力 100、戰力 10、舊欄位 equip 空字串、gw 空');

  /* 2. 老師送的測試者之刃，穿著 */
  n = D.normalizeNw({ starter: 'dagger', gw: ['testblade'], equip: 'testblade', swaps: 1 });
  const tb = n.gear.find(g => g.k === 'testblade');
  ok(n.gear.length === 2 && tb && tb.c === 'green' && tb.p === 0 && n.eq.weapon === tb.id, '測試者之刃：多一件綠色的，而且是穿著的那件');
  ok(D.curWeapon(n) === 'testblade' && D.gearStats(n).atk === 112 && D.weaponBase('testblade') === 'dagger' && n.equip === 'testblade' && same(n.gw, ['testblade']), '攻擊力 112（原本傷害 ×1.12 換成攻擊力）、舊欄位 equip／gw 照寫');
  ok(n.swaps === 1, '換過武器的次數（swaps）沒被動到');
  /* 有測試者之刃，但穿的是初心武器（equip 空字串） */
  n = D.normalizeNw({ starter: 'bow', gw: ['testblade'], equip: '' });
  ok(D.curWeapon(n) === 'bow' && n.eq.weapon === 'g0' && n.gear.length === 2, '有測試者之刃但穿初心武器：穿的是弓');

  /* 3. 換過武器：starter 已經是換過之後的 */
  n = D.normalizeNw({ starter: 'crossbow', swaps: 2, hunts: 2 });
  ok(n.gear[0].k === 'w_crossbow' && n.swaps === 2, '換過 2 次武器：初心武器是現在的木弩');
  D.setStarter(n, 'staff');
  ok(n.starter === 'staff' && n.gear.length === 1 && n.gear[0].k === 'w_staff' && n.gear[0].id === 'g0' && n.eq.weapon === 'g0' && D.curWeapon(n) === 'staff', '前 3 場免費換：同一件換成學徒木杖，id 不變、仍然穿著');

  /* 4. 還沒選武器 */
  n = D.normalizeNw({});
  ok(n.gear.length === 0 && n.eq.weapon === null && !D.curWeapon(n) && D.gearStats(n).atk === 100 && D.gearStats(n).pw === 0, '還沒選初心武器：沒有裝備、戰力 0、攻擊力 100');
  D.setStarter(n, 'dagger');
  ok(n.gear.length === 1 && n.eq.weapon === 'g0' && D.curWeapon(n) === 'dagger', '第一次選武器：放進一件並穿上');

  /* 5. equip 指到沒有的武器 → 退回初心武器 */
  n = D.normalizeNw({ starter: 'staff', gw: [], equip: 'testblade' });
  ok(D.curWeapon(n) === 'staff' && n.eq.weapon === 'g0', 'equip 指到沒擁有的武器：穿初心武器');

  /* 6. 跑兩次不重搬（gearV 旗標）：做好的裝備不會被洗掉 */
  n = D.normalizeNw({ starter: 'staff', coins: 500, mats: { coo_feather: 8 }, bp: [...D.CLOTH_BPS] });
  const hat = D.doCraft(n, 'cloth_hat', 'gray'); D.doEquip(n, hat.id);
  const vest = D.doCraft(n, 'cloth_vest', 'gray'); D.doUpgrade(n, hat.id);
  const again = roundtrip(n), thrice = roundtrip(again);
  ok(again.gear.length === 3 && same(again.gear, n.gear) && same(again.eq, n.eq) && same(thrice.gear, n.gear) && again.gearV === 1, '存檔再讀回來、再讀一次：裝備、穿著都一樣，沒有重搬');
  ok(again.forge.made === 2 && again.forge.ups === 1 && again.forge.top === 1 && again.gear.find(g => g.id === hat.id).p === 1, '做過 2 件、強化過 1 次、最高 +1 都留著');
  /* 本機舊存檔比雲端新而被選中、但沒有 gear：這種情況 gearV 不是 1（舊格式），照搬一次；已經是 gearV 1 的不會被覆蓋 */
  const stale = roundtrip({ ...JSON.parse(JSON.stringify(n)), gearV: 1, gear: undefined });
  ok(stale.gear.length === 1 && stale.gear[0].s === 1, 'gearV 是 1 但 gear 不見：不重搬，只放一把初心武器');

  /* 7. gearV=1 卻沒有 gear：console.warn 一次 */
  let warned = 0; const w0 = console.warn; console.warn = () => { warned++; };
  D.normalizeNw({ gearV: 1, starter: 'bow' });
  console.warn = w0;
  ok(warned === 1, 'gearV=1 卻沒有 gear：console.warn 一次，老師可以用信件補');

  /* 8. 壞資料：不認得的裝備、顏色錯、強化超過、穿著指到別格 */
  n = D.normalizeNw({ gearV: 1, starter: 'staff', gear: [
    { id: 'g0', k: 'w_staff', c: 'gray', p: 0, t: 0, s: 1 }, { id: 'bad1', k: 'no_such', c: 'gray', p: 0 }, { id: 'bad2', k: 'cloth_hat', c: 'rainbow', p: 0 }, { id: 'bad3', k: 'cloth_hat', c: 'gray', p: 9 }, { id: 'ok1', k: 'cloth_hat', c: 'gray', p: 2 }, null, 5
  ], eq: { weapon: 'bad1', helm: 'g0', armor: 'ok1', gloves: null, boots: 'nope' } });
  ok(n.gear.map(g => g.id).join() === 'g0,ok1' && n.eq.weapon === 'g0' && n.eq.helm === null && n.eq.armor === null && n.eq.boots === null, '壞資料：不認得的裝備、錯的顏色、強化超過 5 的都丟掉；穿著指到壞的、放錯格的都清掉；武器格退回初心武器');

  /* 9. 舊格式直接丟進純函式（教師頁舊程式、沒 normalize 的資料）不會壞 */
  const raw = { starter: 'dagger', gw: ['testblade'], equip: 'testblade' };
  ok(D.curWeapon(raw) === 'testblade' && D.gearStats(raw).atk === 100 && D.gearLook(raw) && typeof D.heroLook === 'function', '沒轉換過的舊資料：curWeapon 照舊規則，gearStats 不會丟錯');

  /* 10. 圖紙：怪物掉的、保底、已經會的換字元 */
  ok(D.MONSTERS.coo.rare.length === 2 && D.MONSTERS.frog.rare.length === 2 && D.MONSTERS.wolf.rare.length === 2 && D.MONSTERS.shroom.rare.length === 1, '圖紙來源：咕咕鳥、泡泡蛙、炎牙狼各 2 張（新的是羽毛護手、蛙皮背心、炎狼皮甲），跳跳菇 1 張');
  ok(D.CLOTH_BPS.every(id => D.isBpId(id)) && D.isBpId('bp_wolf_mail') && !D.isBpId('bp_nope'), '新圖紙都在資料表（信箱、教師頁清單從這裡來）');
  n = D.normalizeNw({ starter: 'staff' });
  ok(same(D.giveClothBps(n), D.CLOTH_BPS) && same(D.giveClothBps(n), []) && n.forge.gift === 1, '布裝圖紙只送一次');

  /* 11. 信箱 gear：顏色上限、強化範圍、滿 60 件 */
  ok(D.giftGearOk({ key: 'coo_hat', c: 'green', p: 3 }) && !D.giftGearOk({ key: 'coo_hat', c: 'blue', p: 0 }) && !D.giftGearOk({ key: 'cloth_hat', c: 'green', p: 0 }) && !D.giftGearOk({ key: 'coo_hat', c: 'green', p: 6 }) && !D.giftGearOk({ key: 'coo_hat', c: 'green', p: 1.5 }) && !D.giftGearOk({ key: 'nope', c: 'gray', p: 0 }), '信箱 gear：顏色不能高於那件做得出來的、強化 0～5 整數、key 要存在');
  n = D.normalizeNw({ starter: 'staff' });
  const g1 = D.giveGear(n, 'coo_hat', 'green', 2, 5);
  ok(g1 && g1.c === 'green' && g1.p === 2 && n.gear.length === 2, '收到裝備：放進背包');
  while (n.gear.length < D.GEAR_MAX) n.gear.push({ id: 'z' + n.gear.length, k: 'cloth_hat', c: 'gray', p: 0, t: 1 });
  ok(D.giveGear(n, 'coo_hat', 'green', 0, 6) === 'full', `背包 ${D.GEAR_MAX} 件：回 full，整封不領`);
  ok(D.giveGear(n, 'nope', 'gray', 0) === null, '不認得的裝備：回 null');
  /* 打造的材料用掉後 mats 沒有 0 的殘留 */
  n = D.normalizeNw({ starter: 'staff', coins: 100, mats: { coo_feather: 3 }, bp: [...D.CLOTH_BPS] });
  D.doCraft(n, 'cloth_hat', 'gray');
  ok(!('coo_feather' in n.mats) && n.coins === 70, '材料用完就從存檔拿掉（不留 0）');
  /* 強化「同色以上」：灰裝可以用綠材料，但先用最低色 */
  n = D.normalizeNw({ starter: 'staff', coins: 100, mats: { coo_down: 5, coo_feather: 1 }, gear: [], gearV: 0 });
  const up = D.upCheck(n, 'g0');
  ok(up.ok && same(up.use, { coo_feather: 1 }) && up.any.cand.some(c => c.id === 'coo_down'), '灰色強化 +1（要 1 個）：先用灰材料，綠材料沒被動');
  n.mats = { coo_down: 5 };
  ok(same(D.upCheck(n, 'g0').use, { coo_down: 1 }), '沒有灰材料時，改用綠材料（同色以上都算）');
  n.mats = {};
  ok(!D.upCheck(n, 'g0').ok && D.upCheck(n, 'g0').lack.some(l => l.what.includes('灰色以上')), '什麼材料都沒有：還差灰色以上的材料');

  console.log(fails ? `\n${fails} 個失敗` : '\n全部通過');
  process.exit(fails ? 1 : 0);
})();
