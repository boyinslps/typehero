const { chromium } = require('playwright'); const fs = require('fs');
const path = require('path'); const M = path.join(__dirname, 'mock') + '/'; const OUT = process.argv[2] || require('os').tmpdir();
const css = fs.existsSync(OUT + '/tw.css') ? fs.readFileSync(OUT + '/tw.css', 'utf8') : '';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const seed = {
  'mg_scores/五年級3班_5號': { className: '五年級3班', seat: 5, name: '小明', bestLevel: 10, bestScore: 20, scoreVer: 2, plays: 9, tutorialDone: true, talentIntroDone: true, tier: 'B', balanceVer: 3 },
  'mg_scores/五年級3班_6號': { className: '五年級3班', seat: 6, name: '新手', bestLevel: 3, plays: 2, tutorialDone: true, talentIntroDone: true, tier: 'B', balanceVer: 3 }
};
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
  const errs = []; p.on('dialog', d => d.accept());
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.addInitScript(s => { window.__FS = s; localStorage.clear(); window.confetti = () => {}; window.html2canvas = async () => document.createElement('canvas'); }, seed);
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
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);
  await login(6);
  ok(await p.isHidden('#btn-nw-enter'), '沒有 ?nw=1 時看不到「新世界」按鈕（新世界尚未開放）');
  await p.goto('http://localhost:8765/index.html?nw=1'); await p.waitForTimeout(1500);

  await login(6);
  ok(await p.isVisible('#btn-nw-enter'), '營地有「新世界」按鈕');
  ok((await p.textContent('#nw-lock-txt')).includes('LV 8'), 'LV3 的學生看到鎖與門檻');
  await p.click('#btn-nw-enter'); await p.waitForTimeout(300);
  ok(await p.isHidden('#nw-root'), 'LV3 進不去');
  await p.click('#btn-relogin'); await p.waitForTimeout(500);

  await login(5);
  ok(!(await p.textContent('#nw-lock-txt')).includes('LV'), '最高 LV10 的學生沒有鎖');
  await p.click('#btn-nw-enter'); await p.waitForTimeout(800);
  ok(await p.isVisible('#nw-root') && (await p.textContent('#nw-root')).includes('歡迎來到新世界'), '第一次進來先選造型');
  await p.click('[data-k="style"][data-i="2"]'); await p.click('[data-k="hair"][data-i="4"]'); await p.click('[data-k="skin"][data-i="3"]');
  await p.screenshot({ path: OUT + '/nw1-creator.png' });
  await p.click('[data-save]'); await p.waitForTimeout(500);
  ok((await p.textContent('#nw-root')).includes('選擇你的第一把武器'), '造型後選初心武器');
  ok((await p.$$('[data-card]')).length === 4, '四把初心武器');
  await p.waitForTimeout(1200);
  await p.screenshot({ path: OUT + '/nw1-starter.png' });
  await p.click('[data-card="crossbow"]'); await p.click('[data-ok]'); await p.waitForTimeout(600);
  ok((await p.textContent('#nw-root')).includes('獵人等級 1'), '選好武器進獵人村');
  let nw = await p.evaluate(() => JSON.parse(localStorage.getItem('mg_nw_五年級3班_5號')));
  ok(nw.starter === 'crossbow' && nw.look.style === 2 && nw.look.hair === 4 && nw.look.skin === 3, '造型與武器存在本機');
  ok(nw.items.potion === 3 && nw.quest.done.includes('1-0'), '主線 1-0 完成、拿到回復藥');
  await p.waitForTimeout(1200);
  const cloud = await p.evaluate(() => window.__FS['mg_scores/五年級3班_5號'].nw);
  ok(cloud && cloud.starter === 'crossbow', '也存進雲端 mg_scores.nw');
  ok(await p.evaluate(() => window.__FS['mg_scores/五年級3班_5號'].bestLevel) === 10, '原世界紀錄沒被動到');
  await p.screenshot({ path: OUT + '/nw1-hub.png' });

  ok((await p.$$('.nwh-card.wip')).length === 6, '六個施工中設施');
  await p.click('[data-wip="forge"]'); await p.waitForTimeout(300);
  ok((await p.textContent('body')).includes('施工中・第 2 段開放'), '點施工中跳預告卡');
  await p.screenshot({ path: OUT + '/nw1-wip.png' });
  await p.click('[data-close]');

  await p.click('[data-act="equip"]'); await p.waitForTimeout(300);
  ok((await p.$$('#nw-root .nwh-card.wip')).length === 5, '武器圖鑑 5 把鎖著');
  await p.screenshot({ path: OUT + '/nw1-equip.png' });
  await p.click('[data-act="hub"]');
  await p.click('[data-act="quest"]'); await p.waitForTimeout(200);
  ok((await p.textContent('#nw-root')).includes('討伐泡泡蛙'), '任務面板顯示 1-1');
  await p.click('[data-act="hub"]');

  await p.click('[data-act="map"]'); await p.waitForTimeout(300);
  ok((await p.$$('.nwm-pin')).length === 7, '地圖七個地方');
  ok((await p.$$('.nwm-pin.wip')).length === 5, '五個施工中');
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
