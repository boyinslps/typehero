const { chromium } = require('playwright'); const fs = require('fs');
const path = require('path'); const M = path.join(__dirname, 'mock') + '/'; const OUT = process.argv[2] || require('os').tmpdir();
const css = fs.existsSync(OUT + '/tw.css') ? fs.readFileSync(OUT + '/tw.css', 'utf8') : '';
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
  await p.addInitScript(a => { const s = a.s; window.__NW_CODE_HASH__ = a.hash; window.__FS = s; localStorage.clear(); localStorage.setItem('mg_nw_fast', '1'); window.confetti = () => {}; window.html2canvas = async () => document.createElement('canvas'); }, { s: seed, hash: HASH });
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

  ok((await p.$$('.vb')).length === 9, '村莊有 8 棟建築與 1 個傳送門');
  ok((await p.$$eval('.vb', els => els.filter(e => e.textContent.includes('🔒')).length)) === 6, '六棟還沒開放的建築有鎖');
  await p.click('.vb[data-bld="forge"]'); await p.waitForTimeout(900);
  ok((await p.textContent('body')).includes('施工中・第 2 段開放'), '走到施工中的建築門口：跳出預告卡');
  await p.screenshot({ path: OUT + '/nw1-wip.png' });
  await p.click('[data-close]');

  await p.click('[data-act="bagopen"]'); await p.waitForTimeout(300);
  ok(await p.isVisible('#nw-bag'), '背包打得開');
  ok((await p.textContent('#nw-bag')).includes('現在的武器'), '背包的裝備頁看得到武器');
  await p.screenshot({ path: OUT + '/nw1-bag.png' });
  await p.click('[data-bag-tab="dex"]'); await p.waitForTimeout(200);
  ok(((await p.textContent('#nw-bag')).match(/🔒/g) || []).length === 5, '圖鑑裡 5 把武器鎖著');
  await p.click('[data-bag-tab="quest"]'); await p.waitForTimeout(200);
  ok((await p.textContent('#nw-bag')).includes('討伐泡泡蛙'), '背包的任務頁顯示 1-1');
  await p.click('[data-bag-tab="mats"]'); await p.click('[data-bag-tab="items"]');
  ok((await p.textContent('#nw-bag')).includes('回復藥'), '道具裡有任務給的回復藥');
  await p.click('[data-bag-close]'); await p.waitForTimeout(100);
  ok(await p.isHidden('#nw-bag'), '關得掉背包');
  await p.keyboard.press('b'); await p.waitForTimeout(150);
  ok(await p.isVisible('#nw-bag'), '按 B 也能開背包');
  await p.keyboard.press('Escape'); await p.waitForTimeout(100);

  await p.click('.vb[data-bld="board"]'); await p.waitForTimeout(900);
  ok((await p.$$('.wmr')).length === 7, '地圖七個地方');
  ok((await p.$$('.wmr.wip')).length === 5, '五個施工中');
  await p.screenshot({ path: OUT + '/nw1-map.png' });
  await p.click('[data-region="forest"]'); await p.waitForTimeout(200);
  ok((await p.$('[data-view="region"]')) === null, '森林還沒開');
  await p.click('[data-region="grass"]'); await p.waitForTimeout(300);
  ok((await p.$$('[data-mon]')).length === 3, '草原三隻魔物');
  await p.click('[data-mon="frog"]'); await p.waitForTimeout(300);
  ok((await p.$$('[data-star]:disabled')).length === 4, '只有 ★1 開放');
  ok((await p.textContent('#nw-root')).includes('泡泡蛙') && (await p.textContent('#nw-root')).includes('打：注音'), '委託卡寫打什麼');
  await p.screenshot({ path: OUT + '/nw1-monster.png' });

  ok(errs.length === 0, '沒有 JS 錯誤 ' + errs.join(' | '));
  await b.close(); process.exit(fails ? 1 : 0);
})();
