/* 測試魔物回饋、任務目標標籤、序號禮物、測試者之刃 */
const { chromium } = require('playwright'); const fs = require('fs');
const path = require('path'); const M = path.join(__dirname, 'mock') + '/'; const OUT = process.argv[2] || require('os').tmpdir();
const css = fs.existsSync(OUT + '/tw.css') ? fs.readFileSync(OUT + '/tw.css', 'utf8') : '';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const ID = '五年級3班_5號';

async function open(browser, o = {}) {
  const p = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const errs = []; p.on('dialog', d => d.accept());
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  const { sha256Hex, cleanCode } = await import('../../nw-access.js');
  const hash = await sha256Hex('Test-Pass_9!x');
  const seed = {
    ['mg_scores/' + ID]: { className: '五年級3班', seat: 5, name: '小明', bestLevel: 10, bestScore: 20, scoreVer: 2, plays: 9, tutorialDone: true, talentIntroDone: true, tier: 'B', balanceVer: 3,
      nw: Object.assign({ v: 1, savedAt: 5, look: { style: 1, hair: 2, skin: 1 }, starter: 'dagger', quest: { done: ['1-0'] }, items: { potion: 3 } }, o.nw || {}) }
  };
  if (o.gift) { const h = await sha256Hex('gift:' + cleanCode(o.gift.code)); seed['mg_config/gift_codes'] = { codes: { [h]: Object.assign({ used: 0, label: '測試' }, o.gift.entry) } }; }
  await p.addInitScript(a => { window.__FS = a.s; localStorage.clear(); localStorage.setItem('mg_nw_fast', '1'); window.__NW_CODE_HASH__ = a.hash; localStorage.setItem('mg_nw_code', a.hash); if (a.nogift) window.__NW_NOGIFT__ = true; if (a.atk) window.__NW_ATTACKS__ = []; window.confetti = () => {}; window.html2canvas = async () => document.createElement('canvas'); }, { s: seed, hash, nogift: !o.early, atk: o.noattack });
  await p.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('http://localhost')) return r.continue();
    if (u.includes('cdn.tailwindcss.com')) return r.fulfill({ contentType: 'application/javascript', body: `const s=document.createElement('style');s.textContent=${JSON.stringify(css)};document.head.appendChild(s);` });
    const m = u.includes('firebase-app') ? 'app.js' : u.includes('firebase-auth') ? 'auth.js' : u.includes('firebase-firestore') ? 'fs.js' : null;
    if (m) return r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(M + m, 'utf8') });
    return r.abort();
  });
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1300);
  await p.selectOption('#in-grade', '五年級'); await p.selectOption('#in-class', '3班'); await p.fill('#in-seat', '5'); await p.waitForTimeout(900);
  await p.click('#btn-enter'); await p.waitForTimeout(1000);
  p.errs = errs;
  if (o.lobby) return p;
  await p.click('#nw-door'); await p.waitForTimeout(1200);
  return p;
}
const qText = p => p.$$eval('#nwb-q .zy-han', els => els.map(e => e.textContent).join(''));
async function winHunt(p, rk, mk, star) {
  await p.click('.vb[data-bld="board"]'); await p.waitForSelector('#nwbd-board');
  await p.click(`.qs[data-q="${rk}:${mk}:${star}"]`); await p.click('[data-go]'); await p.waitForSelector('[data-view="room"]');
  await p.click('[data-act="startroom"]'); await p.waitForTimeout(80);
  for (let i = 0; i < 80; i++) {
    if (await p.isVisible('#nw-result')) return true;
    if (await p.$('#nwb-root') === null) return true;
    if (await p.isDisabled('#nwb-in')) { await p.waitForTimeout(300); continue; }
    await p.fill('#nwb-in', await qText(p)); await p.waitForTimeout(480); await p.press('#nwb-in', 'Enter'); await p.waitForTimeout(60);
  }
  return false;
}

(async () => {
  const b = await chromium.launch();

  {
    const p = await open(b, { early: true, lobby: true });
    ok(await p.$eval('#nw-door', e => e.dataset.gift) === '1' && (await p.textContent('#nw-door-sub')).includes('禮物'), '登入後，新世界之門上有 🎁，寫著有禮物等你領');
    ok((await p.textContent('body')).includes('新世界有一份禮物等你領取'), '登入時跳出「新世界有一份禮物」的通知');
    await p.click('#nw-door'); await p.waitForTimeout(1200);
    await p.waitForSelector('#nw-gift', { timeout: 5000 });
    ok((await p.textContent('#nw-gift')).includes('收到禮物') && (await p.textContent('#nw-gift')).includes('測試者之刃'), '提前用密語進來的人：自動收到「測試者之刃」禮物通知');
    ok(await p.$('#nw-gift .dkp') !== null && await p.$('#nw-gift canvas') !== null, '禮物通知有黑色粒子與武器圖');
    await p.screenshot({ path: OUT + '/nw4-gift.png' });
    await p.click('#nw-gift [data-ok]'); await p.waitForTimeout(600);
    let nw = await p.evaluate(() => JSON.parse(localStorage.getItem('mg_nw_五年級3班_5號')));
    ok(nw.gw.includes('testblade') && nw.giftedEarly, '禮物存進存檔，只送一次');
    await p.waitForSelector('#nw-tour', { timeout: 3000 });
    ok((await p.textContent('#nw-tour')).includes('背包') && (await p.textContent('#nw-tour')).includes('第 1 / 3 步'), '收到武器後：跳出「換裝備教學」，第 1 步要你按背包');
    await p.waitForTimeout(500);
    ok((await p.textContent('#nw-tour')).includes('第 1 / 3 步'), '沒按背包就一直等在第 1 步');
    await p.click('[data-act="bagopen"]'); await p.waitForTimeout(500);
    ok((await p.textContent('#nw-tour')).includes('第 2 / 3 步') && (await p.textContent('#nw-tour')).includes('測試者之刃'), '打開背包後，換成第 2 步：點測試者之刃');
    await p.click('#nw-bag [data-equip="testblade"]'); await p.waitForTimeout(500);
    ok((await p.textContent('#nw-tour')).includes('第 3 / 3 步'), '換上武器後，第 3 步：關閉背包');
    await p.screenshot({ path: OUT + '/nw4-tour.png' });
    await p.click('#nw-bag [data-bag-close]'); await p.waitForTimeout(500);
    ok(await p.$('#nw-tour') === null && await p.evaluate(() => JSON.parse(localStorage.getItem('mg_nw_五年級3班_5號')).tut.equip) === 1, '三步都做完：教學結束並記下來');
    await p.keyboard.press('b'); await p.waitForTimeout(300);
    ok(await p.$('#nw-bag [data-equip="testblade"]') !== null, '背包的裝備格有測試者之刃');
    await p.click('#nw-bag [data-equip="testblade"]'); await p.waitForTimeout(300);
    ok(await p.$('#nw-bag .bp-slot[data-slot="weapon"].dark') !== null && (await p.textContent('#nw-bag')).includes('測試者之刃'), '點一下換上：武器格有黑色粒子、說明寫出能力');
    await p.screenshot({ path: OUT + '/nw4-bag.png' });
    ok(p.errs.length === 0, '沒有 JS 錯誤 ' + p.errs.join(' | '));
    await p.close();
  }

  {
    const p = await open(b, { nw: { gw: ['testblade'], equip: 'testblade', giftedEarly: true }, noattack: true });
    await p.click('.vb[data-bld="board"]'); await p.waitForSelector('#nwbd-board');
    ok(await p.$('.qs-wrap.goal .qs-goal') !== null && (await p.textContent('.qs-goal')).includes('任務目標') && (await p.textContent('.nwbd-goal')).includes('討伐泡泡蛙'), '委託板：現在的任務目標那張單子有紅色「任務目標」標籤，並寫出任務');
    ok(await p.$('.qs-wrap.on.goal') !== null, '一打開就選好任務目標那張');
    ok((await p.textContent('#nwbd-list')).includes('（防禦測試）') && (await p.textContent('#nwbd-list')).includes('（閃避測試）') && (await p.textContent('#nwbd-list')).includes('（攻擊測試）'), '三隻測試魔物名字後面有（閃避／防禦／綜合測試）');
    await p.screenshot({ path: OUT + '/nw4-board.png' });
    await p.click('[data-act="hub"]'); await p.waitForTimeout(800);
    const done = await winHunt(p, 'grass', 'coo', 1);
    ok(done, '用測試者之刃打贏咕咕鳥');
    await p.waitForSelector('#nw-result', { timeout: 8000 });
    await p.click('#nw-result [data-close]'); await p.waitForSelector('#nw-fb', { timeout: 5000 });
    ok((await p.textContent('#nw-fb')).includes('可以寫，也可以不寫') && (await p.textContent('#nw-fb')).includes('貨幣'), '打贏測試魔物：跳出回饋視窗，說可以不寫、字元是貨幣');
    await p.click('#nw-fb [data-r="太難"]');
    await p.fill('#nw-fb [data-text]', '紅線很清楚，但是有點快'); await p.click('#nw-fb [data-send]');
    await p.waitForSelector('#nw-gift', { timeout: 5000 });
    ok((await p.textContent('#nw-gift')).includes('字元 ×30'), '寫了回饋：收到 30 字元的禮物通知');
    const fb = await p.evaluate(() => Object.entries(window.__FS).filter(([k]) => k.startsWith('mg_nw_flags/fb_')).map(([, v]) => v));
    ok(fb.length === 1 && fb[0].type === 'feedback' && fb[0].mk === 'coo' && fb[0].rate === '太難' && fb[0].text.includes('紅線'), '回饋存進 mg_nw_flags，老師後台看得到');
    await p.click('#nw-gift [data-ok]'); await p.waitForTimeout(400);
    const nw = await p.evaluate(() => JSON.parse(localStorage.getItem('mg_nw_五年級3班_5號')));
    ok(nw.fb.coo === 1 && nw.coins >= 30, '字元加進存檔，同一隻不會再問');
    ok(p.errs.length === 0, '沒有 JS 錯誤 ' + p.errs.join(' | '));
    await p.close();
  }

  {
    const p = await open(b, { gift: { code: 'ABC-xyz_123', entry: { reward: { type: 'coins', n: 50 }, max: 1 } } });
    await p.click('[data-act="gift"]'); await p.waitForSelector('[data-code]');
    ok(await p.getAttribute('[data-code]', 'type') === 'password', '序號輸入框是密碼欄：輸入時看不到字');
    await p.fill('[data-code]', 'wrong'); await p.press('[data-code]', 'Enter'); await p.waitForTimeout(300);
    ok((await p.textContent('body')).includes('序號不對'), '亂打的序號：說序號不對');
    await p.fill('[data-code]', ' ABC-xyz_123 '); await p.press('[data-code]', 'Enter');
    await p.waitForSelector('#nw-gift', { timeout: 5000 });
    ok((await p.textContent('#nw-gift')).includes('字元 ×50'), '對的序號：跳出「收到禮物」，獎勵是字元 ×50');
    await p.click('#nw-gift [data-ok]'); await p.waitForTimeout(500);
    ok(await p.evaluate(() => window.__FS['mg_config/gift_codes'] && Object.values(window.__FS['mg_config/gift_codes'].codes)[0].used) === 1, '序號領取次數記一次');
    await p.click('[data-act="gift"]'); await p.waitForSelector('[data-code]');
    await p.fill('[data-code]', 'ABC-xyz_123'); await p.press('[data-code]', 'Enter'); await p.waitForTimeout(400);
    ok((await p.textContent('body')).includes('已經領過'), '同一個人再領：說已經領過了');
    ok(p.errs.length === 0, '沒有 JS 錯誤 ' + p.errs.join(' | '));
    await p.close();
  }

  {
    const p = await open(b, { nw: { hunts: 1 } });
    await p.click('.vb[data-bld="academy"]'); await p.waitForSelector('#nw-acad');
    ok((await p.$$('#nw-acad [data-l]')).length === 4 && (await p.textContent('#nw-acad')).includes('閃避') && (await p.textContent('#nw-acad')).includes('防禦') && (await p.textContent('#nw-acad')).includes('攻擊'), '教學大樓：有攻擊、閃避、防禦、換裝備四堂課');
    ok(await p.isDisabled('#nw-acad [data-l="equip"]'), '還沒拿到新武器：換裝備那堂先鎖著');
    await p.screenshot({ path: OUT + '/nw4-academy.png' });
    await p.click('#nw-acad [data-l="dodge"]'); await p.waitForSelector('#nw-acad [data-go]', { timeout: 15000 });
    ok((await p.textContent('#nw-acad [data-say]')).includes('看示範') && await p.$('#nw-acad [data-again]') !== null, '閃避課：先演示一遍，可以再看一次');
    await p.click('#nw-acad [data-go]');
    const danger = () => p.evaluate(() => window.__acScene.danger);
    const waitDanger = () => p.waitForFunction(() => window.__acScene && window.__acScene.danger.length, null, { timeout: 12000, polling: 50 });
    await waitDanger();
    let d0 = (await danger())[0].lane, ln = await p.evaluate(() => window.__acScene.lane);
    ok((await p.textContent('#nw-acad [data-say]')).includes('換你了'), '輪到學生做');
    // 故意不躲：被打到後要重來
    await p.waitForFunction(() => !window.__acScene.danger.length, null, { timeout: 8000, polling: 50 });
    await p.waitForTimeout(300);
    ok((await p.textContent('#nw-acad [data-say]')).includes('再來一次'), '沒躲開：說再來一次，不會往下一步');
    await waitDanger();
    d0 = (await danger())[0].lane;
    await p.keyboard.press(d0 === 0 ? 'ControlRight' : 'ControlLeft');
    await p.waitForFunction(() => document.querySelector('#nw-acad [data-say]').textContent.includes('躲開了'), null, { timeout: 8000 });
    ok(true, '躲開了：過關，換下一步');
    await waitDanger();
    const dd = await danger(); const safe = [0, 1, 2].find(l => !dd.some(x => x.lane === l));
    ln = await p.evaluate(() => window.__acScene.lane);
    for (let i = 0; i < 2 && await p.evaluate(() => window.__acScene.lane) !== safe; i++) { await p.keyboard.press(await p.evaluate(() => window.__acScene.lane) > safe ? 'ControlLeft' : 'ControlRight'); await p.waitForTimeout(80); }
    await p.waitForSelector('#nw-gift', { timeout: 15000 });
    ok((await p.textContent('#nw-gift')).includes('字元 ×200'), '三步都過：「閃避」學會了，收到 200 字元禮物');
    await p.click('#nw-gift [data-ok]'); await p.waitForTimeout(500);
    ok(await p.evaluate(() => JSON.parse(localStorage.getItem('mg_nw_五年級3班_5號')).tut.dodge) === 1 && (await p.textContent('#nw-acad')).includes('✓ 學會了'), '教學大樓的選單顯示「✓ 學會了」');
    ok(p.errs.length === 0, '沒有 JS 錯誤 ' + p.errs.join(' | '));
    await p.close();
  }

  {
    const p = await open(b, { nw: { hunts: 1 } });
    await p.click('[data-act="bug"]'); await p.waitForSelector('[data-text]');
    await p.fill('[data-text]', '很'); await p.click('[data-send]'); await p.waitForTimeout(200);
    ok((await p.textContent('body')).includes('至少 5 個字'), '回報太短：請多寫幾個字');
    await p.click('[data-c="按鍵／操作"]'); await p.fill('[data-text]', '按左 Ctrl 的時候角色沒有動');
    await p.click('[data-send]'); await p.waitForSelector('#nw-gift', { timeout: 5000 });
    ok((await p.textContent('#nw-gift')).includes('回報收到了') && (await p.textContent('#nw-gift')).includes('老師看過'), '回報問題：送出後只說收到了，要老師確認才有獎勵');
    await p.click('#nw-gift [data-ok]'); await p.waitForTimeout(400);
    let nw0 = await p.evaluate(() => JSON.parse(localStorage.getItem('mg_nw_五年級3班_5號')));
    ok(nw0.bugs === 0 && nw0.bugsSent === 1 && nw0.coins === 0 && !nw0.words.includes('bughunter'), '老師還沒確認：沒有字元、沒有除蟲員');
    const bug = await p.evaluate(() => Object.entries(window.__FS).filter(([, v]) => v && v.type === 'bug'));
    ok(bug.length === 1 && bug[0][1].status === 'pending' && bug[0][1].cat === '按鍵／操作' && bug[0][1].text.includes('左 Ctrl'), '回報存進 mg_nw_flags（type: bug、待確認），老師看得到');
    await p.click('[data-act="book"]'); await p.waitForTimeout(500);
    ok(await p.$('#nw-gift') === null && (await p.textContent('body')).includes('老師確認 0 個'), '老師還沒確認：手冊上寫老師確認 0 個');
    await p.click('body [data-close]').catch(() => {});
    await p.evaluate(k => { window.__FS[k].status = 'approved'; }, bug[0][0]);
    await p.waitForTimeout(100);
    await p.evaluate(() => { document.querySelectorAll('.fixed.overflow-y-auto').forEach(e => e.remove()); });
    await p.waitForTimeout(21000);
    await p.click('[data-act="book"]'); await p.waitForSelector('#nw-gift', { timeout: 6000 });
    ok((await p.textContent('#nw-gift')).includes('字元 ×15') && (await p.textContent('#nw-gift')).includes('老師確認了'), '老師確認後：學生進手冊就收到 15 字元的禮物');
    await p.click('#nw-gift [data-ok]');
    await p.waitForFunction(() => document.querySelector('#nw-gift') && document.querySelector('#nw-gift').textContent.includes('除蟲員'), null, { timeout: 5000 });
    ok(true, '解鎖「除蟲員」任務，跳出任務完成的通知');
    await p.click('#nw-gift [data-ok]'); await p.waitForTimeout(600);
    ok((await p.textContent('body')).includes('測試員手冊') && (await p.textContent('body')).includes('✓ 已蓋章') && (await p.textContent('body')).includes('老師確認 1 個'), '測試員手冊：顯示蓋章與老師確認的數量');
    await p.screenshot({ path: OUT + '/nw4-book.png' });
    const nw = await p.evaluate(() => JSON.parse(localStorage.getItem('mg_nw_五年級3班_5號')));
    ok(nw.bugs === 1 && nw.words.includes('bughunter') && nw.tm.m_bug1 === 1 && nw.coins >= 35, '除蟲員詞條、任務蓋章與字元存進存檔');
    ok(await p.evaluate(k => window.__FS[k].claimed, bug[0][0]) === true, '回報標成「已領」，不會重複領');
    ok(p.errs.length === 0, '沒有 JS 錯誤 ' + p.errs.join(' | '));
    await p.close();
  }

  await b.close(); process.exit(fails ? 1 : 0);
})();
