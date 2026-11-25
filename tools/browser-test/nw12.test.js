/* 2b 鐵匠鋪＋倉庫（docs/SPEC-STAGE2.md §3、§6 的「nw11」；nw11 已經被榜單測試用掉，所以這份編號是 nw12）。
   開 window.__RULES；用 window.__NW_STAGES__ 開 2b（預設 OPEN_STAGES 只有 '1'）。
   截圖：OUT/nw12-forge.png、nw12-up.png、nw12-bag.png、nw12-mats.png、nw12-mobile.png、nw12-village.png */
const { chromium } = require('playwright'); const fs = require('fs');
const path = require('path'); const M = path.join(__dirname, 'mock') + '/'; const OUT = process.argv[2] || require('os').tmpdir();
const css = require('./tw.js')(OUT);
const NOTICE_ID = /export const NOTICES = \[\s*\{ id: '([^']+)'/.exec(fs.readFileSync(path.join(__dirname, '../../nw-data.js'), 'utf8'))[1];
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const ID = '五年級3班_5號', CLS = '五年級3班';
const SHOT = n => path.join(OUT, `nw12-${n}.png`);
const BASE_NW = () => ({ v: 1, savedAt: 5, look: { style: 1, hair: 2, skin: 1 }, starter: 'dagger', hunts: 5, coins: 200,
  mats: { coo_feather: 6, shroom_cap: 3, frog_slime: 2, coo_down: 4, frog_skin: 3, wolf_fang: 3, wolf_fur: 4 },
  bp: ['bp_coo_hat', 'bp_flame_dagger', 'bp_dagger'], zone: { grass: 3 }, dex: { coo: 1, frog: 1, shroom: 1 },
  tm: { m_dodge: 1, m_defend: 1, m_attack: 1 }, quest: { done: ['1-0', '1-0a', '1-1', '1-2', '1-3', '1-4'] }, intro: { hub: 1, notice: 1 }, seenNotice: NOTICE_ID, nameSet: 1 });

async function open(browser, o = {}) {
  const p = await browser.newPage({ viewport: { width: o.vw || 1200, height: o.vh || 900 } });
  const errs = []; p.on('dialog', d => d.accept());
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  const { sha256Hex } = await import('../../nw-access.js');
  const hash = await sha256Hex('Test-Pass_9!x');
  const seed = { ['mg_scores/' + ID]: { className: CLS, seat: 5, name: '小明', bestLevel: 10, bestScore: 20, scoreVer: 2, plays: 9, tutorialDone: true, talentIntroDone: true, tier: 'B', balanceVer: 3, punctDone: true,
    nw: Object.assign(BASE_NW(), o.nw || {}) }, ...(o.seed || {}) };
  await p.addInitScript(a => {
    window.__FS = a.s; window.__RULES = true; localStorage.clear(); localStorage.setItem('mg_nw_fast', '1');
    window.__NW_CODE_HASH__ = a.hash; localStorage.setItem('mg_nw_code', a.hash); window.__NW_NOGIFT__ = true; window.__NW_NOINTRO__ = !a.intro;
    if (a.stages) window.__NW_STAGES__ = a.stages;
    window.confetti = () => {}; window.html2canvas = async () => document.createElement('canvas');
  }, { s: seed, hash, stages: o.stages === undefined ? ['1', '2b'] : o.stages, intro: !!o.intro });
  await p.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('http://localhost')) return r.continue();
    if (u.includes('cdn.tailwindcss.com')) return r.fulfill({ contentType: 'application/javascript', body: `const s=document.createElement('style');s.textContent=${JSON.stringify(css)};document.head.appendChild(s);` });
    const m = u.includes('firebase-app') ? 'app.js' : u.includes('firebase-auth') ? 'auth.js' : u.includes('firebase-firestore') ? 'fs.js' : null;
    if (m) return r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(M + m, 'utf8') });
    return r.abort();
  });
  await p.goto('http://localhost:8765/index.html'); await p.waitForFunction(() => window.__NWG, null, { timeout: 15000 }); await p.waitForTimeout(500);
  await p.selectOption('#in-grade', '五年級'); await p.selectOption('#in-class', '3班'); await p.fill('#in-seat', '5'); await p.waitForTimeout(900);
  await p.click('#btn-enter'); await p.waitForTimeout(1000);
  p.errs = errs;
  await p.click('#nw-door'); await p.waitForFunction(() => window.__NWV, null, { timeout: 12000 }); await p.waitForTimeout(500);
  await dismissGifts(p);
  return p;
}
const nwOf = p => p.evaluate(() => JSON.parse(JSON.stringify(window.__NWG.nw)));
const dismissGifts = async p => { for (let i = 0; i < 12; i++) { if (!(await p.$('#nw-gift'))) break; await p.evaluate(() => { const g = [...document.querySelectorAll('#nw-gift [data-ok]')].pop(); if (g) g.click(); }); await p.waitForTimeout(250); } };
const enterForge = async p => { await p.evaluate(() => window.__NWV.teleport('forge')); await p.waitForTimeout(250); await p.click('[data-bld="forge"]'); await p.waitForTimeout(500); await dismissGifts(p); await p.waitForTimeout(300); };
const noErr = (p, m = '沒有 JS 錯誤') => ok(p.errs.length === 0, m + ' ' + p.errs.join(' | '));
const heroSig = (p, sel) => p.evaluate(s => { const c = document.querySelector(s + ' canvas'); return c ? c.toDataURL().length + ':' + c.toDataURL().slice(-60) : ''; }, sel);

(async () => {
  const D = await import('../../nw-data.js');

  /* ───── 純函式：配方、扣料、強化成本、戰力、上限 ───── */
  ok(JSON.stringify(D.OPEN_STAGES) === JSON.stringify(['1', '2b', '3s']) && !D.stageOpen('2a'), 'OPEN_STAGES 預設是 [\'1\',\'2b\',\'3s\']（2b、商店開放；2a 榮譽碑沒開）');
  const t = D.normalizeNw({ starter: 'staff', coins: 1000, mats: { coo_feather: 5, shroom_cap: 2, frog_slime: 9, coo_down: 3 }, bp: [...D.CLOTH_BPS] });
  const ck = D.craftCheck(t, 'cloth_vest', 'gray');   // 任意灰 ×4 ＋ 30 字元
  ok(ck.ok && JSON.stringify(ck.use) === JSON.stringify({ frog_slime: 4 }), `任意材料先扣數量最多的（泡泡黏液 9 > 咕咕羽毛 5）：${JSON.stringify(ck.use)}`);
  const ck2 = D.craftCheck(t, 'cloth_vest', 'gray', ['coo_feather']);
  ok(JSON.stringify(ck2.use) === JSON.stringify({ coo_feather: 4 }), '孩子點換：指定先用咕咕羽毛');
  const it0 = D.doCraft(t, 'cloth_vest', 'gray');
  ok(it0 && it0.p === 0 && it0.c === 'gray' && t.coins === 970 && t.mats.frog_slime === 5 && t.forge.made === 1 && t.gear.length === 2, '打造：扣字元與材料、多一件 +0、做過的件數 +1');
  ok(!D.craftCheck(t, 'coo_hat', 'green').ok && D.craftCheck(t, 'coo_hat', 'green').why === '還沒學會這張圖紙', '沒有圖紙：寫「還沒學會這張圖紙」');
  t.bp.push('bp_coo_hat'); t.mats.coo_down = 1;
  const lk = D.craftCheck(t, 'coo_hat', 'green');
  ok(!lk.ok && lk.lack.some(l => l.what === '柔軟絨毛' && l.short === 2), `材料不夠：還差 2 個柔軟絨毛（${JSON.stringify(lk.lack)}）`);
  ok(D.doCraft(t, 'coo_hat', 'green') === null && t.coins === 970, '不夠就不扣任何東西');
  ok([0, 1, 2, 3, 4].map(p => D.upCost({ c: 'gray', p }).coins).join() === '20,35,55,80,110' && [0, 1, 2, 3, 4].map(p => D.upCost({ c: 'green', p }).mats).join() === '1,1,2,2,3'
    && D.upCost({ c: 'blue', p: 4 }).coins === 330 && D.upCost({ c: 'gray', p: 5 }) === null, '強化成本：字元 20/35/55/80/110 × 顏色倍率（灰 1 綠 2 藍 3），材料 1/1/2/2/3，+5 不能再強化');
  const gs0 = D.gearStats(D.normalizeNw({ starter: 'staff' }));
  ok(gs0.atk === 100 && gs0.hp === 0 && gs0.cut === 0 && gs0.pw === 10, `只有初心武器：攻擊力 100、戰力 10（${JSON.stringify(gs0)}）`);
  const full = D.normalizeNw({ starter: 'dagger' });
  full.coins = 1e6; Object.keys(D.MAT_INFO).filter(k => !k.startsWith('bp_')).forEach(k => { full.mats[k] = 99; }); full.bp = Object.keys(D.MAT_INFO).filter(k => k.startsWith('bp_'));
  const mkIt = (k, c, p) => { const it = { id: 'x' + k + c, k, c, p, t: 1 }; full.gear.push(it); D.doEquip(full, it.id); return it; };
  mkIt('flame_dagger', 'blue', 5); mkIt('coo_hat', 'green', 5); mkIt('wolf_mail', 'blue', 5); mkIt('coo_gloves', 'green', 5); mkIt('frog_boots', 'green', 5);
  const gm = D.gearStats(full);
  ok(gm.atk === 130 && gm.hp === 40 && Math.abs(gm.cut - 0.20) < 1e-9 && Math.abs(gm.shield - 0.6) < 1e-9 && Math.abs(gm.warn - 0.35) < 1e-9 && gm.elem === 'fire', `滿裝備（SPEC-BALANCE-V2 §9：藍武器 +5 130、綠頭盔 +5 +40、藍盔甲 +5 減 20%、綠護手 +5 舉盾 +0.6、綠護腳 +5 預警 +0.35）（${JSON.stringify(gm)}）`);
  ok(D.gearMul(gm, 'coo') <= 1.37 && Math.abs(D.gearMul(gm, 'coo') - 1.365) < 1e-9 && Math.abs(D.gearMul(gm, 'frog') - 1.235) < 1e-9 && D.gearMul(gm, 'wolf') === 1.3, `武器＋屬性：打怕火的咕咕鳥 ${D.gearMul(gm, 'coo').toFixed(3)}（130 × 1.05，沒碰到上限 1.37）、泡泡蛙 ${D.gearMul(gm, 'frog').toFixed(3)}（× 0.95）、炎牙狼 ${D.gearMul(gm, 'wolf').toFixed(3)}（沒屬性）`);
  ok(gm.pw === (34 + 10) + (22 + 10) + (34 + 10) + (22 + 10) + (22 + 10), `戰力是五格加總（每件 灰 10／綠 22／藍 34，每 +1 再 +2）：${gm.pw}`);
  const hint = D.forgeHint(D.normalizeNw({ starter: 'staff', coins: 500, mats: { coo_down: 1, coo_feather: 3 }, bp: ['bp_coo_hat'] }));
  ok(hint && hint.can === 0 && /再 \d+ 個.*就能做/.test(hint.text), `結算提示：「${hint && hint.text}」`);
  const dry = D.normalizeNw({ starter: 'dagger' }); let guard = 0;
  while (D.rollBlueprints(dry, 'coo', () => 0.99).length === 0 && guard < 20) guard++;
  ok(guard === 5 && dry.bp.length === 1 && dry.bpDry.coo === 0, `圖紙保底：連續 5 場沒掉，第 6 場一定掉一張（第 ${guard + 1} 場）`);
  const withV2Off = fn => { const l = globalThis.location, w = globalThis.window; globalThis.location = { hostname: 'localhost' }; globalThis.window = { __NW_V2__: false }; try { return fn(); } finally { if (l === undefined) delete globalThis.location; else globalThis.location = l; if (w === undefined) delete globalThis.window; else globalThis.window = w; } };   // node 沒有 location，要測「V2 關著」的舊行為只能暫時假裝是 localhost
  ok(withV2Off(() => D.attackingMons().join() === 'coo,frog' && D.slotNote('armor').includes('咕咕鳥、泡泡蛙')) && !D.slotNote('weapon').includes('魔物才有用'), '防具說明從 ATTACKS_OPEN 自動列出會攻擊的魔物（V2 關著）');
  ok(D.attackingMons().join() === 'coo,frog,shroom,wolf' && D.slotNote('armor').includes('炎牙狼'), '預設（V2 開）：防具說明列出 4 種會攻擊的魔物');

  const b = await chromium.launch();

  /* ───── 2b 還沒開放（預設）：鐵匠鋪是施工中 ───── */
  {
    const p = await open(b, { stages: ['1'] });
    await p.evaluate(() => window.__NWV.teleport('forge')); await p.waitForTimeout(250); await p.click('[data-bld="forge"]'); await p.waitForTimeout(500);
    ok(!(await p.$('#nw-forge')) && (await p.textContent('.nw-sheet')).includes('施工中'), '沒開放 2b：進鐵匠鋪看到「施工中」，不會打開鐵匠鋪');
    ok(!(await p.$('[data-forge-fx]')) && !(await p.$('[data-forge-bang]')), '沒開放：鐵匠鋪不冒煙、沒有「！」');
    const q = await p.evaluate(() => window.__NWG.nw.quest.done.slice());
    ok(!q.includes('1-5'), '沒開放：主線 1-5 不會出現');
    await p.close();
  }

  /* ───── 開放 2b ───── */
  const p = await open(b);
  ok(!!(await p.$('[data-forge-fx]')), '開放後：鐵匠鋪屋頂有煙囪效果');
  await p.waitForTimeout(700);
  ok(await p.isVisible('[data-forge-bang]'), '有東西做得出來：鐵匠鋪冒火花＋「！」（初心武器灰色版材料夠）');
  await p.screenshot({ path: SHOT('village') });
  const before = await nwOf(p);
  ok(!before.bp.includes('bp_cloth_hat') && before.gearV === 1 && before.gear.length === 1 && before.gear[0].k === 'w_dagger', '舊存檔進來：只有一件初心武器（鐵製小刀），還沒拿布裝圖紙');

  await enterForge(p);
  ok(!!(await p.$('#nw-forge')), '點鐵匠鋪打開鐵匠鋪視窗');
  const n1 = await nwOf(p);
  ok(D.CLOTH_BPS.every(x => n1.bp.includes(x)) && n1.forge.gift === 1, '第一次進去：送 4 張布裝圖紙');
  await p.click('[data-forge-close]'); await p.waitForTimeout(300);
  await enterForge(p);
  const n2 = await nwOf(p);
  ok(n2.bp.length === n1.bp.length && !(await p.$('#nw-gift')), '第二次進去：不會再送（只送一次）');
  const rows = await p.$$eval('#nw-forge [data-craft]', els => els.map(e => ({ k: e.dataset.craft, can: e.classList.contains('can'), spark: !!e.querySelector('.fg-spark'), on: e.classList.contains('on') })));
  ok(rows.length >= 8 && rows[0].can && rows[0].spark && rows.findIndex(r => !r.can) > 0 && rows.slice(0, rows.findIndex(r => !r.can)).every(r => r.can) && rows.slice(rows.findIndex(r => !r.can)).every(r => !r.can), `做得出來的排前面並發亮 ✨（${rows.filter(r => r.can).length}／${rows.length}）`);
  ok(rows.some(r => r.k === 'cloth_hat:gray') && rows.some(r => r.k === 'w_dagger:gray') && rows.some(r => r.k === 'w_dagger:green') && !rows.some(r => r.k === 'w_staff:gray') && rows.some(r => r.k === 'coo_hat:green') && rows.some(r => r.k === 'flame_dagger:blue'), '列表：布裝、自己的初心武器（灰＋綠兩版）、學會的圖紙；沒學的初心武器不在');

  /* 不夠：灰按鈕＋「還差」 */
  await p.click('#nw-forge [data-craft="coo_hat:green"]'); await p.waitForTimeout(200);
  let btn = await p.$eval('#nw-forge [data-do-craft]', e => ({ dis: e.disabled, t: e.textContent }));
  ok(!btn.dis && btn.t.includes('打造'), '咕咕帽（絨毛 4、羽毛 6、字元 200 夠）可以打造');
  await p.click('#nw-forge [data-craft="flame_dagger:blue"]'); await p.waitForTimeout(200);
  btn = await p.$eval('#nw-forge [data-do-craft]', e => ({ dis: e.disabled, t: e.textContent }));
  const txt = await p.textContent('#nw-forge [data-right]');
  ok(btn.dis && btn.t.includes('還差 50 字元') && txt.includes('狼毛') && /0\.?\d*\/|\/250/.test(txt) && !!(await p.$('#nw-forge [data-right] .px-bar')), `炎牙刀字元不夠：按鈕灰、寫「${btn.t}」、有進度條`);
  const ftxt = await p.textContent('#nw-forge [data-right]');
  ok(ftxt.includes('對會攻擊') === false && ftxt.includes('打對的字') && ftxt.includes('攻擊力 120') && ftxt.includes('藍'), '武器說明寫「打對的字傷害變多」、炎牙刀藍色攻擊力 120（SPEC-BALANCE-V2 §9：藍 +0 ＝ 綠 +5）');
  await p.click('#nw-forge [data-craft="cloth_hat:gray"]'); await p.waitForTimeout(200);
  const hatTxt = await p.textContent('#nw-forge [data-right]');
  ok(hatTxt.includes('生命 +10') && hatTxt.includes('對會攻擊你的魔物才有用') && hatTxt.includes('咕咕鳥、泡泡蛙') && hatTxt.includes('會用掉'), `布帽：生命 +10、說明「對會攻擊的魔物才有用，現在是咕咕鳥、泡泡蛙」、列出會用掉的材料`);
  const used0 = await p.textContent('#nw-forge [data-uses]');
  ok(used0.includes('咕咕羽毛 ×3'), `預設先扣數量最多的灰材料：${used0}`);
  await p.click('#nw-forge [data-prefer="shroom_cap"]'); await p.waitForTimeout(150);
  ok((await p.textContent('#nw-forge [data-uses]')).includes('蘑菇傘 ×3'), '點別種材料：換成蘑菇傘');
  await p.screenshot({ path: SHOT('forge') });

  /* 打造 */
  const heroBefore = await heroSig(p, '#vmap');
  await p.click('#nw-forge [data-do-craft]'); await p.waitForSelector('#nw-forge [data-result]', { timeout: 4000 });
  let n3 = await nwOf(p);
  ok(n3.coins === 170 + 60 && n3.mats.shroom_cap === undefined && n3.forge.made === 1 && n3.gear.length === 2 && n3.gear[1].k === 'cloth_hat' && n3.gear[1].p === 0, '打造完成：字元 −30（加上 1-5 的獎勵 60）、蘑菇傘 −3、多一件布帽 +0');
  ok((await p.textContent('#nw-forge [data-result]')).includes('要穿上嗎'), '跳「打造完成！要穿上嗎？」');
  ok(n3.quest.done.includes('1-5'), '主線 1-5「打造任何一件裝備」完成');
  await p.click('#nw-forge [data-wear]'); await p.waitForTimeout(400);
  n3 = await nwOf(p);
  ok(n3.eq.helm === n3.gear[1].id && D.gearStats(n3).hp === 10, '穿上：頭盔格是這件布帽，生命 +10');
  ok(n3.coins === 170 + 60, `1-5 的獎勵字元 60 已經給了（${n3.coins}）`);
  /* 雙分頁：別的視窗已經用掉材料、雲端存檔比這邊新 → 這邊按打造要先同步，不能再扣一次 */
  await p.click('#nw-forge [data-craft="cloth_vest:gray"]'); await p.waitForTimeout(150);
  await p.evaluate(id => { const d = window.__FS['mg_scores/' + id]; d.nw.mats = { coo_feather: 1 }; d.nw.savedAt = Date.now() + 60000; }, ID);
  await p.click('#nw-forge [data-do-craft]'); await p.waitForTimeout(500);
  const n3b = await nwOf(p);
  ok(n3b.gear.length === 2 && n3b.mats.coo_feather === 1 && (await p.textContent('#nw-forge [data-right]')).includes('變少了'), '雙分頁：先同步到雲端較新的存檔，材料不夠就不扣、不多做一件，並說明原因');
  await p.click('#nw-forge [data-forge-close]'); await p.waitForTimeout(300);

  /* 背包：裝備格、角色變了 */
  await p.click('[data-act="bagopen"]'); await p.waitForSelector('#nw-bag'); await p.waitForTimeout(300);
  const slots = await p.$$eval('#nw-bag [data-slot]', els => els.map(e => ({ s: e.dataset.slot, on: e.classList.contains('on'), canvas: !!e.querySelector('canvas'), up: !!e.querySelector('.bp-up') })));
  ok(slots.find(s => s.s === 'helm').on && slots.find(s => s.s === 'helm').canvas && slots.find(s => s.s === 'weapon').canvas && !slots.find(s => s.s === 'armor').on, '裝備格：頭盔格有布帽的圖示、武器格有圖、盔甲格還是空的');
  ok((await p.textContent('#nw-bag')).includes('裝備背包') && (await p.$$('#nw-bag [data-equip]')).length === 2, `裝備背包分頁：兩件（小刀、布帽）：實際 ${(await p.$$('#nw-bag [data-equip]')).length}`);
  await p.screenshot({ path: SHOT('bag') });
  await p.click('#nw-bag [data-bag-tab="mats"]'); await p.waitForTimeout(250);
  await p.click('#nw-bag [data-mat="coo_feather"]'); await p.waitForTimeout(200);
  const md = await p.textContent('#nw-bag [data-body]');
  ok(md.includes('哪裡掉：新芽草原') && md.includes('咕咕鳥') && md.includes('可以做') && md.includes('咕咕帽'), `材料分頁：點咕咕羽毛 → 哪裡掉、可以做什麼`);
  await p.screenshot({ path: SHOT('mats') });
  await p.click('#nw-bag [data-bag-tab="bp"]'); await p.waitForTimeout(250);
  const bpt = await p.textContent('#nw-bag [data-body]');
  ok(bpt.includes('布帽圖紙') && bpt.includes('還沒學會的') && bpt.includes('咕咕鳥有機會掉'), '圖紙分頁：學會的亮、沒學會的灰並寫「咕咕鳥有機會掉」');
  await p.click('[data-bag-close]'); await p.waitForTimeout(200);

  /* 強化 */
  await p.evaluate(() => { const nw = window.__NWG.nw; nw.coins = 3000; nw.mats = { coo_feather: 20, frog_slime: 20, coo_down: 6 }; });
  await enterForge(p);
  await p.click('#nw-forge [data-tab="up"]'); await p.waitForTimeout(250);
  let upTxt = await p.textContent('#nw-forge [data-right]');
  ok(upTxt.includes('+0 → +1') && upTxt.includes('攻擊力 100 → 102'), `強化：預設選武器，寫「+0 → +1」「攻擊力 100 → 102」`);
  await p.screenshot({ path: SHOT('up') });
  for (let i = 1; i <= 5; i++) { await p.click('#nw-forge [data-do-up]'); await p.waitForTimeout(250); const cur = (await nwOf(p)).gear.find(g => g.k === 'w_dagger'); if (cur.p !== i) { ok(false, `強化 +${i} 一定成功（現在 +${cur.p}）`); break; } if (i === 5) ok(true, '強化 +1～+5 每一次都成功'); }
  upTxt = await p.textContent('#nw-forge [data-right]');
  ok(upTxt.includes('+5（最高）') && upTxt.includes('+6 以上要等之後開放') && !(await p.$('#nw-forge [data-do-up]')), '+5 後：寫「+6 以上要等之後開放」，沒有強化按鈕');
  const n4 = await nwOf(p);
  ok(n4.quest.done.includes('1-6') && n4.forge.ups === 5 && n4.forge.top === 5 && n4.words.includes('shiny') && n4.words.includes('smith1'), '主線 1-6 完成、詞條「閃亮亮」「見習鐵匠」拿到');
  ok(n4.coins === 3000 + 100 - (20 + 35 + 55 + 80 + 110), `強化花的字元 300（${n4.coins}）`);
  await p.click('#nw-forge [data-forge-close]'); await p.waitForTimeout(300);

  /* 60 件上限 */
  await p.evaluate(() => { const nw = window.__NWG.nw; while (nw.gear.length < 60) nw.gear.push({ id: 'z' + nw.gear.length, k: 'cloth_hat', c: 'gray', p: 0, t: 1 }); nw.coins = 3000; nw.mats = { coo_feather: 20 }; });
  await enterForge(p);
  await p.click('#nw-forge [data-craft="cloth_vest:gray"]'); await p.waitForTimeout(200);
  btn = await p.$eval('#nw-forge [data-do-craft]', e => ({ dis: e.disabled, t: e.textContent }));
  ok(btn.dis && btn.t.includes('60 件') && btn.t.includes('分解'), `裝備 60 件：按鈕灰、寫「${btn.t}」`);
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  ok(!(await p.$('#nw-forge')), 'Esc 關閉鐵匠鋪');
  noErr(p, '2b 流程沒有 JS 錯誤');
  await p.close();

  /* ───── 主線不擋 1-7；1-5、1-6 沒做也能過 1-7 ───── */
  {
    const q = await open(b, { nw: { coins: 0 } });
    const r = await q.evaluate(() => {
      const res = { rk: 'grass', mk: 'coo', star: 5, result: 'win', secs: 90, accuracy: .95, answered: 20, dodgeOk: 0, dodgeAll: 0, defOk: 0, defAll: 0, maxCombo: 5, flags: {}, tier: 'B', weapon: 'dagger', valid: true, lvAcc: true, t0: Date.now() };
      window.__NWG.finishHunt(res);
      return window.__NWG.nw.quest.done.slice();
    });
    ok(r.includes('1-7') && !r.includes('1-5') && !r.includes('1-6'), `1-5、1-6 沒做也能完成 1-7（soft）：${r.join(',')}`);
    const cur = await q.evaluate(async () => { const D = await import('./nw-data.js'); const c = D.currentQuest(window.__NWG.nw); return c && c.id; });
    ok(cur === '1-5', `開放 2b 時，現在的任務是 1-5（${cur}）`);
    await q.close();
  }

  /* ───── 手機寬度 ───── */
  {
    const m = await open(b, { vw: 390, vh: 800 });
    await enterForge(m);
    const o = await m.evaluate(() => ({ page: document.documentElement.scrollWidth - innerWidth, sheet: (() => { const s = document.getElementById('nw-forge'); return s ? s.scrollWidth - s.clientWidth : -1; })() }));
    ok(o.page <= 1 && o.sheet <= 1, `手機 390 寬：鐵匠鋪不橫向捲出頁面（${JSON.stringify(o)}）`);
    await m.screenshot({ path: SHOT('mobile') });
    await m.close();
  }

  /* ───── 第一次進鐵匠鋪：三頁介紹 → 送圖紙 → 導覽三步（點圖紙、打造、穿上） ───── */
  {
    const q = await open(b, { intro: true });
    await q.evaluate(() => window.__NWV.teleport('forge')); await q.waitForTimeout(250); await q.click('[data-bld="forge"]'); await q.waitForSelector('#nw-intro', { timeout: 4000 });
    const pages = [];
    for (let i = 0; i < 3 && await q.$('#nw-intro'); i++) { pages.push((await q.textContent('#nw-intro')).replace(/\s+/g, ' ')); await q.click('#nw-intro [data-next]'); await q.waitForTimeout(150); }
    ok(pages.length === 3 && pages[0].includes('鐵匠鋪') && pages[1].includes('發亮') && pages[1].includes('會攻擊你的魔物') && pages[2].includes('布裝圖紙') && !(await q.$('#nw-intro')), `鐵匠鋪介紹三頁：${pages.map(x => x.slice(0, 14)).join('／')}`);
    await q.waitForSelector('#nw-gift', { timeout: 4000 });
    ok((await q.textContent('#nw-gift')).includes('布裝圖紙 ×4'), '介紹完：鐵匠送 4 張布裝圖紙（收禮通知）');
    await dismissGifts(q); await q.waitForSelector('#nw-forge'); await q.waitForSelector('#nw-tour', { timeout: 4000 });
    const t1 = await q.textContent('#nw-tour');
    ok(t1.includes('鐵匠鋪教學') && t1.includes('1 / 3') && t1.includes('發亮'), '導覽第 1 步：點發亮的圖紙');
    await q.click('#nw-forge .fg-row.can'); await q.waitForTimeout(300);
    ok((await q.textContent('#nw-tour')).includes('2 / 3'), '點了圖紙：第 2 步（按「打造」）');
    await q.click('#nw-forge [data-do-craft]'); await q.waitForSelector('#nw-forge [data-result]', { timeout: 4000 }); await q.waitForTimeout(300);
    ok((await q.textContent('#nw-tour')).includes('3 / 3'), '做好了：第 3 步（按「穿上」）');
    await q.click('#nw-forge [data-wear]'); await q.waitForTimeout(500);
    ok(!(await q.$('#nw-tour')), '穿上：導覽結束');
    await q.click('#nw-forge [data-forge-close]'); await q.waitForTimeout(300);
    await q.click('[data-bld="forge"]'); await q.waitForTimeout(600);
    ok(!(await q.$('#nw-intro')) && !(await q.$('#nw-tour')) && !(await q.$('#nw-gift')), '第二次進去：不再跳介紹、導覽、禮物');
    /* 導覽太快：直接做完再關，導覽也過得去 */
    await q.close();
    const r = await open(b, { intro: true });
    await r.evaluate(() => window.__NWV.teleport('forge')); await r.waitForTimeout(250); await r.click('[data-bld="forge"]'); await r.waitForSelector('#nw-intro');
    for (let i = 0; i < 3 && await r.$('#nw-intro'); i++) { await r.click('#nw-intro [data-next]'); await r.waitForTimeout(150); }
    await r.waitForSelector('#nw-gift'); await dismissGifts(r); await r.waitForSelector('#nw-tour');
    await r.click('#nw-forge [data-forge-close]'); await r.waitForTimeout(600);
    await r.waitForTimeout(700);
    ok(!(await r.$('#nw-tour')), '導覽中直接關掉鐵匠鋪：導覽自動收起來，不卡住畫面');
    await r.close();
  }

  /* ───── 信箱：圖紙（已經會的換 30 字元）、裝備（顏色上限、滿 60 件整封不領） ───── */
  {
    const T = Date.now(), mail = (id, items) => ['mg_mail/' + id, { aud: ['id:' + ID], title: '信 ' + id, body: '', items, from: '老師', sendAt: T - 1000, expireAt: 0, t: T - 1000, src: 'manual' }];
    const seed = Object.fromEntries([mail('g1', [{ type: 'gear', key: 'coo_hat', c: 'green', p: 2 }]), mail('b1', [{ type: 'bp', key: 'bp_coo_hat' }]), mail('b2', [{ type: 'bp', key: 'bp_wolf_mail' }]), mail('bad', [{ type: 'gear', key: 'coo_hat', c: 'blue', p: 0 }]), mail('w1', [{ type: 'gear', key: 'flame_dagger', c: 'blue', p: 1 }]), mail('w2', [{ type: 'gear', key: 'cloth_hat', c: 'gray', p: 0 }])]);
    const q = await open(b, { seed });
    await q.evaluate(() => window.__NWV.teleport('mail')); await q.waitForTimeout(250); await q.click('.vb[data-bld="mail"]'); await q.waitForSelector('#nw-mail'); await q.waitForTimeout(500);
    ok((await q.$$('#nw-mail [data-claim]')).length === 5 && !(await q.$('#nw-mail [data-mail="bad"] [data-claim]')) && (await q.textContent('#nw-mail [data-mail="bad"]')).includes('不認得'), '信箱：顏色超過上限的裝備（咕咕帽藍色）整封不能領，其他 5 封可以');
    const labels = await q.$$eval('#nw-mail [data-mail] .px-chip', els => els.map(e => e.textContent));
    ok(labels.some(l => l.includes('咕咕帽 +2')) && labels.some(l => l.includes('炎牙刀 +1')) && labels.some(l => l.includes('圖紙「炎狼皮甲圖紙」')), `信上的標籤：${labels.join('、')}`);
    const c0 = (await nwOf(q)).coins;
    await q.click('#nw-mail [data-claim="g1"]'); await q.waitForSelector('#nw-gift'); await dismissGifts(q);
    let nn = await nwOf(q);
    const got = nn.gear.find(g => g.k === 'coo_hat');
    ok(got && got.c === 'green' && got.p === 2 && nn.gear.length === 2, '領裝備信：背包多一件綠色咕咕帽 +2');
    await q.click('#nw-mail [data-claim="w1"]'); await q.waitForSelector('#nw-gift'); await dismissGifts(q);
    nn = await nwOf(q);
    ok(nn.gear.some(g => g.k === 'flame_dagger' && g.c === 'blue' && g.p === 1) && D.gearStats({ ...nn, eq: { ...nn.eq, weapon: nn.gear.find(g => g.k === 'flame_dagger').id } }).atk === 122, '炎牙刀（藍 +1）：攻擊力 122（藍 +0 是 120，SPEC-BALANCE-V2 §9）');
    await q.click('#nw-mail [data-claim="b1"]'); await q.waitForSelector('#nw-gift'); await dismissGifts(q);
    nn = await nwOf(q);
    ok(nn.coins === c0 + D.BP_DUP_COINS && nn.bp.filter(x => x === 'bp_coo_hat').length === 1, `已經會的圖紙：換成 ${D.BP_DUP_COINS} 字元，不重複放`);
    await q.click('#nw-mail [data-claim="b2"]'); await q.waitForSelector('#nw-gift'); await dismissGifts(q);
    ok((await nwOf(q)).bp.includes('bp_wolf_mail'), '新的圖紙：學會了');
    /* 滿 60 件：整封不領 */
    await q.evaluate(() => { const nw = window.__NWG.nw; while (nw.gear.length < 60) nw.gear.push({ id: 'z' + nw.gear.length, k: 'cloth_hat', c: 'gray', p: 0, t: 1 }); });
    const before = (await nwOf(q)).gear.length;
    await q.click('#nw-mail [data-claim="w2"]'); await q.waitForTimeout(700);
    nn = await nwOf(q);
    ok(nn.gear.length === before && !nn.mail.w2 && !(await q.$('#nw-gift')), '裝備滿 60 件：這封信整封不領、信還在（沒有被標成已領）');
    await q.close();
  }

  /* ───── 倉庫建築：打開背包停在材料分頁 ───── */
  {
    const w = await open(b);
    await w.evaluate(() => window.__NWV.teleport('storage')); await w.waitForTimeout(250); await w.click('[data-bld="storage"]'); await w.waitForTimeout(600);
    ok(!!(await w.$('#nw-bag')) && (await w.textContent('#nw-bag [data-body]')).includes('材料'), '倉庫：打開背包、停在「材料」分頁');
    /* 資料表新增了裝備、還沒畫圖示：用「？」方塊，畫面不會壞（UI-ART-SPEC §7） */
    await w.click('#nw-bag [data-bag-close]'); await w.waitForTimeout(200);
    await w.evaluate(async () => { const D = await import('./nw-data.js'); D.GEAR_DEFS.zz_boots = { name: '假靴', slot: 'boots', bp: null, ver: { gray: { any: ['gray', 1], coins: 1 } }, look: { color: '#123456' } }; const nw = window.__NWG.nw; nw.gear.push({ id: 'zz1', k: 'zz_boots', c: 'gray', p: 0, t: 1 }); nw.eq.boots = 'zz1'; });
    await w.click('[data-act="bagopen"]'); await w.waitForSelector('#nw-bag'); await w.waitForTimeout(300);
    ok(await w.$eval('#nw-bag [data-slot="boots"]', e => e.classList.contains('on') && !!e.querySelector('canvas')) && w.errs.length === 0, `沒畫圖示的新裝備：護腳格顯示「？」方塊、沒有 JS 錯誤 ${w.errs.join(' | ')}`);
    await w.close();
  }
  await b.close();
  console.log(fails ? `\n${fails} 個失敗` : '\n全部通過');
  process.exit(fails ? 1 : 0);
})();
