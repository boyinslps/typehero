const { chromium } = require('playwright'); const fs = require('fs');
const path = require('path'); const M = path.join(__dirname, 'mock') + '/'; const OUT = process.argv[2] || require('os').tmpdir();
const css = require('./tw.js')(OUT);
const PASS = 'Test-Pass_9!x';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const seed = {
  'mg_scores/五年級3班_5號': { className: '五年級3班', seat: 5, name: '小明', bestLevel: 10, bestScore: 20, scoreVer: 2, plays: 9, tutorialDone: true, talentIntroDone: true, tier: 'B', balanceVer: 3 },
  'mg_scores/五年級3班_6號': { className: '五年級3班', seat: 6, name: '新手', bestLevel: 3, plays: 2, tutorialDone: true, talentIntroDone: true, tier: 'B', balanceVer: 3 }
};
(async () => {
  const { sha256Hex } = await import('../../nw-access.js');
  const HASH = await sha256Hex(PASS);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
  const errs = []; p.on('dialog', d => d.accept());
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.addInitScript(a => { window.__NW_STAGES__ = ['1']; window.__BOARD_ROT__ = false; const s = a.s; window.__NW_CODE_HASH__ = a.hash; window.__NW_NOGIFT__ = true; window.__NW_NOINTRO__ = true; window.__RULES = true; window.__FS = s; localStorage.clear(); localStorage.setItem('mg_nw_fast', '1'); window.confetti = () => {}; window.html2canvas = async () => document.createElement('canvas'); }, { s: seed, hash: HASH });
  await p.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('http://localhost')) return r.continue();
    if (u.includes('cdn.tailwindcss.com')) return r.fulfill({ contentType: 'application/javascript', body: `const s=document.createElement('style');s.textContent=${JSON.stringify(css)};document.head.appendChild(s);` });
    const m = u.includes('firebase-app') ? 'app.js' : u.includes('firebase-auth') ? 'auth.js' : u.includes('firebase-firestore') ? 'fs.js' : null;
    if (m) return r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(M + m, 'utf8') });
    return r.abort();
  });
  const login = async seat => {
    await p.selectOption('#in-grade', '五年級'); await p.selectOption('#in-class', '3班');
    await p.fill('#in-seat', String(seat)); await p.waitForTimeout(900); await p.click('#btn-enter'); await p.waitForTimeout(1200);
  };
  const redeem = async c => { await p.click('#nw-door'); await p.fill('#nw-code-in', c); await p.press('#nw-code-in', 'Enter'); await p.waitForTimeout(600); };
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);
  await login(6);
  ok(await p.$eval('#nw-door', e => e.dataset.state) === 'locked', '新世界還沒開放：營地的門是灰色鎖著的');
  ok((await p.textContent('#nw-door-sub')).includes('通關密語'), '門上寫著「有通關密語的同學，點一下門輸入」');
  await redeem('亂打的密語');
  ok(await p.isVisible('#nw-code-in') && (await p.textContent('#nw-code-err')).includes('密語不對'), '亂打的密語被擋下');
  await p.fill('#nw-code-in', PASS.toLowerCase()); await p.press('#nw-code-in', 'Enter'); await p.waitForTimeout(500);
  ok(await p.isVisible('#nw-code-in'), '大小寫不對：不通過');
  await p.fill('#nw-code-in', ' ' + PASS + ' \n'); await p.press('#nw-code-in', 'Enter'); await p.waitForTimeout(700);
  ok(await p.isHidden('#nw-code-in') && await p.$eval('#nw-door', e => e.dataset.state) === 'open', '密語正確（前後有空白也行）：門變成開著的');
    await p.click('#nw-door'); await p.waitForTimeout(500);
  ok(await p.isVisible('#nw-root'), 'LV3 的同學拿到密語，不用到 LV8 也能進');
  await p.click('[data-save]'); await p.click('[data-card="staff"]'); await p.click('[data-ok]'); await p.waitForTimeout(400);
  await p.click('[data-act="leave"]'); await p.waitForTimeout(300);
  await p.evaluate(() => { window.__NW_CODE_HASH__ = 'changed'; });
  await p.click('#btn-relogin'); await p.waitForTimeout(500);
  await login(6);
  ok(await p.$eval('#nw-door', e => e.dataset.state) === 'locked' && await p.isVisible('#nw-door'), '老師換了新密語：舊的立刻失效');
  await p.evaluate(h => { window.__NW_CODE_HASH__ = h; }, HASH);
  await p.click('#btn-relogin'); await p.waitForTimeout(500);

  await login(5);
  ok(await p.$eval('#nw-door', e => e.dataset.state) === 'open', '同一台電腦記得密語：換座號 5 也是開放的（一個字串，不分人）');
  await p.click('#nw-door'); await p.waitForTimeout(800);
  ok(await p.isVisible('#nw-root') && (await p.textContent('#nw-root')).includes('歡迎來到新世界'), '第一次進來先選造型');
  await p.click('[data-k="style"][data-i="2"]'); await p.click('[data-k="hair"][data-i="4"]'); await p.click('[data-k="skin"][data-i="3"]');
  await p.screenshot({ path: OUT + '/nw1-creator.png' });
  await p.click('[data-save]'); await p.waitForTimeout(500);
  ok((await p.textContent('#nw-root')).includes('選擇你的第一把武器'), '造型後選初心武器');
  ok((await p.$$('[data-card]')).length === 4, '四把初心武器');
  await p.waitForTimeout(1200);
  await p.screenshot({ path: OUT + '/nw1-starter.png' });
  await p.click('[data-card="crossbow"]'); await p.click('[data-ok]'); await p.waitForTimeout(600);
  ok((await p.textContent('#nw-root')).includes('獵人 Lv 1'), '選好武器進獵人村');
  let nw = await p.evaluate(() => JSON.parse(localStorage.getItem('mg_nw_五年級3班_5號')));
  ok(nw.starter === 'crossbow' && nw.look.style === 2 && nw.look.hair === 4 && nw.look.skin === 3, '造型與武器存在本機');
  ok(nw.items.potion === 3 && nw.quest.done.includes('1-0'), '主線 1-0 完成、拿到回復藥');
  await p.waitForTimeout(1200);
  const cloud = await p.evaluate(() => window.__FS['mg_scores/五年級3班_5號'].nw);
  ok(cloud && cloud.starter === 'crossbow', '也存進雲端 mg_scores.nw');
  ok(await p.evaluate(() => window.__FS['mg_scores/五年級3班_5號'].bestLevel) === 10, '原世界紀錄沒被動到');
  await p.screenshot({ path: OUT + '/nw1-hub.png' });

  ok((await p.$$('.vb')).length === 12, '村莊有 10 棟建築（含教學大樓、佈告欄）、1 個傳送門與 1 個郵筒');
  ok((await p.$$eval('.vb', els => els.filter(e => e.textContent.includes('🔒')).length)) === 7, '第 1 階段只開委託板：七棟建築有鎖（含榮譽碑）');
  await p.click('.vb[data-bld="forge"]'); await p.waitForTimeout(900);
  ok((await p.textContent('body')).includes('施工中') && !/施工中・第/.test(await p.textContent('body')), '走到施工中的建築門口：跳出預告卡，不寫第幾段');
  await p.screenshot({ path: OUT + '/nw1-wip.png' });
  await p.click('[data-close]');

  await p.click('[data-act="bagopen"]'); await p.waitForTimeout(300);
  ok(await p.isVisible('#nw-bag'), '背包打得開');
  ok((await p.textContent('#nw-bag')).includes('現在的武器'), '背包的裝備頁看得到武器');
  await p.screenshot({ path: OUT + '/nw1-bag.png' });
  await p.click('[data-bag-tab="dex"]'); await p.waitForTimeout(200);
  ok(((await p.textContent('#nw-bag')).match(/🔒/g) || []).length === 5, '圖鑑裡 5 把武器鎖著');
  await p.click('[data-bag-tab="quest"]'); await p.waitForTimeout(200);
  ok((await p.textContent('#nw-bag')).includes('教學大樓'), '背包的任務頁顯示第一個任務：到教學大樓');
  await p.click('[data-bag-tab="mats"]'); await p.click('[data-bag-tab="items"]');
  ok((await p.textContent('#nw-bag')).includes('回復藥'), '道具裡有任務給的回復藥');
  await p.click('[data-bag-close]'); await p.waitForTimeout(100);
  ok(await p.isHidden('#nw-bag'), '關得掉背包');
  await p.keyboard.press('b'); await p.waitForTimeout(150);
  ok(await p.isVisible('#nw-bag'), '按 B 也能開背包');
  await p.keyboard.press('Escape'); await p.waitForTimeout(100);

  await p.evaluate(() => {
    window.__FS['mg_rooms/五年級4班_9號'] = { host: '阿華', cls: '五年級4班', mk: 'coo', rk: 'grass', star: 1, state: 'open', members: ['x'], t: Date.now() };
    window.__FS['mg_rooms/五年級4班_8號'] = { host: '舊房間', cls: '五年級4班', mk: 'wolf', rk: 'forest', star: 2, state: 'open', members: ['y'], t: Date.now() - 3600000 };
  });
  await p.click('.vb[data-bld="board"]'); await p.waitForSelector('#nwbd-board');
  ok((await p.$$('.qs-wrap')).length === 4, '看板上有 3 張草原委託單＋1 張還沒開的森林委託');
  ok((await p.$$('.qs.lock')).length === 1 && (await p.textContent('.qs.lock')).includes('打倒新芽草原 ★5'), '森林的委託是灰的，寫著怎麼開');
  ok((await p.$$eval('.qs:not(.lock)', els => els.every(e => e.textContent.includes('☆') || e.textContent.includes('★')))), '每張委託單有星級');
  ok((await p.$$('.qs-wrap.on')).length === 1 && !(await p.isDisabled('[data-go]')), '一打開就選好第一張，狩獵鈕可以按');
  await p.click('.qs[data-q="grass:frog:1"]'); await p.waitForTimeout(500);
  ok((await p.textContent('#nwbd-info')).includes('泡泡蛙') && (await p.textContent('#nwbd-info')).includes('小池塘'), '右邊寫出魔物住在哪裡');
  ok((await p.textContent('.qs[data-q="grass:frog:1"]')).includes('Lv 1') && (await p.textContent('.qs[data-q="grass:frog:1"]')).includes('新芽草原'), '委託單有等級與區域');
  await p.screenshot({ path: OUT + '/nw1-board.png' });
  await p.click('[data-tab="rooms"]'); await p.waitForTimeout(700);
  ok((await p.textContent('#nwbd-list')).includes('阿華') && !(await p.textContent('#nwbd-list')).includes('舊房間'), '房間分頁看得到同學開的房間，過期的不顯示');
  ok((await p.textContent('#nwbd-list')).includes('組隊施工中') && !/第\s*\d/.test(await p.textContent('#nwbd-list')), '加入組隊只寫施工中、不提第幾段');
  await p.click('[data-tab="quests"]');
  await p.click('.qs[data-q="grass:frog:1"]');
  await p.click('[data-go]'); await p.waitForSelector('[data-view="room"]');
  const room = await p.evaluate(() => window.__FS['mg_rooms/五年級3班_5號']);
  ok(room && room.mk === 'frog' && room.state === 'open', '按「狩獵」才開房間');
  await p.screenshot({ path: OUT + '/nw1-room.png' });
  await p.click('[data-act="leaveroom"]'); await p.waitForSelector('#nwbd-board'); await p.waitForTimeout(300);
  ok(!(await p.evaluate(() => window.__FS['mg_rooms/五年級3班_5號'])), '離開房間就把房間收掉');
  await p.click('[data-act="hub"]'); await p.waitForTimeout(900);
  ok((await p.textContent('#vmap')).includes('Enter：進入「委託板」'), '走到建築旁邊會出現「Enter：進入」的提示');
  await p.waitForTimeout(800);
  ok(await p.$('[data-view="hub"]') !== null, '站在門口不會自動進去');
  await p.keyboard.press('Enter'); await p.waitForSelector('#nwbd-board', { timeout: 3000 });
  ok(true, '按 Enter 才進去');

  /* 榮譽碑（2a）已重寫成只讀 mg_nw_board/{年級} 一份；完整測試在 nw17.test.js，這裡只確認從村莊走得進去 */
  await p.evaluate(() => {
    window.__FS['mg_nw_board/5'] = { v: 1, g: '5', t: Date.now() - 3600000, week: 1,
      improve: [{ c: '504', s: 1, n: '小華', v: 31.2, qb: '6:0', r: 1, up: 0 }, { c: '504', s: 2, n: '小美', v: 12, qb: '4:0', r: 2, up: -1 }],
      fast: { 'coo:1': [{ c: '504', s: 2, n: '小美', v: 30.2, w: 'dagger', pw: 45, r: 1, up: 0 }] }, acc: { list: [{ c: '504', s: 1, n: '小華', at: Date.now() - 86400000 }], more: 0 }, cut: {} };
    window.__READS = [];
  });
  await p.evaluate(() => { window.__NW_STAGES__ = ['1', '2a']; });
  await p.click('[data-act="hub"]'); await p.waitForTimeout(900);
  ok(!(await p.$eval('.vb[data-bld="rank"]', e => e.textContent.includes('第 2 段'))) , '階段 2 開了以後榮譽碑不再灰');
  await p.click('.vb[data-bld="rank"]'); await p.waitForSelector('#nw-rank', { timeout: 4000 }); await p.waitForTimeout(500);
  const rk1 = await p.textContent('#nw-rank');
  ok(rk1.indexOf('小華') > -1 && rk1.indexOf('小華') < rk1.indexOf('小美') && rk1.includes('打字變快 31.2%'), '榮譽碑：預設是「進步」榜，依分數排序');
  await p.click('[data-rk-tab="fast"]'); await p.waitForTimeout(200);
  const rk2 = await p.textContent('#nw-rank');
  ok(rk2.includes('小美') && rk2.includes('30.2 秒'), '最快討伐榜：看得到秒數');
  await p.click('[data-rk-tab="acc"]'); await p.waitForTimeout(200);
  const rk3 = await p.textContent('#nw-rank');
  ok(rk3.includes('小華') && !rk3.includes('小美'), '神準名單：只有達標的人');
  ok((await p.evaluate(() => window.__READS.filter(r => r.path.startsWith('mg_scores') && r.op === 'list').length)) === 0 && (await p.evaluate(() => window.__READS.filter(r => r.path === 'mg_nw_board/5').length)) === 1, '榮譽碑只讀 1 份榜單、不讀整個 mg_scores');
  await p.click('[data-x]'); await p.waitForTimeout(150);
  ok(await p.$('#nw-rank') === null, '榮譽碑關得掉');

  ok(errs.length === 0, '沒有 JS 錯誤 ' + errs.join(' | '));
  await b.close(); process.exit(fails ? 1 : 0);
})();
