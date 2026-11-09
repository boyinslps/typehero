/* 標點符號挑戰通關 → 老師開了的話，拿到搶先體驗號碼並自動開通 */
const { chromium } = require('playwright'); const fs = require('fs');
const path = require('path'); const M = path.join(__dirname, 'mock') + '/'; const OUT = process.argv[2] || require('os').tmpdir();
const css = fs.existsSync(OUT + '/tw.css') ? fs.readFileSync(OUT + '/tw.css', 'utf8') : '';
const PASS = 'Test-Pass_9!x';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

async function run(b, reward) {
  const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
  const errs = []; p.on('dialog', d => d.accept());
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  const { sha256Hex } = await import('../../nw-access.js');
  const hash = await sha256Hex(PASS);
  const seed = {
    'mg_scores/五年級3班_6號': { className: '五年級3班', seat: 6, name: '新手', bestLevel: 3, plays: 2, tutorialDone: true, talentIntroDone: true, tier: 'B', balanceVer: 3 },
    'mg_config/settings': reward ? { nwRewardCode: PASS } : {}
  };
  await p.addInitScript(a => { window.__NW_CODE_HASH__ = a.hash; window.__FS = a.s; localStorage.clear(); window.confetti = () => {}; window.html2canvas = async () => document.createElement('canvas'); }, { s: seed, hash });
  await p.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('http://localhost')) return r.continue();
    if (u.includes('cdn.tailwindcss.com')) return r.fulfill({ contentType: 'application/javascript', body: `const s=document.createElement('style');s.textContent=${JSON.stringify(css)};document.head.appendChild(s);` });
    const m = u.includes('firebase-app') ? 'app.js' : u.includes('firebase-auth') ? 'auth.js' : u.includes('firebase-firestore') ? 'fs.js' : null;
    if (m) return r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(M + m, 'utf8') });
    return r.abort();
  });
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);
  await p.selectOption('#in-grade', '五年級'); await p.selectOption('#in-class', '3班');
  await p.fill('#in-seat', '6'); await p.waitForTimeout(900); await p.click('#btn-enter'); await p.waitForTimeout(1200);
  p.errs = errs; return p;
}

(async () => {
  const b = await chromium.launch();

  {
    const p = await run(b, true);
    ok(await p.$eval('#nw-door', e => e.dataset.state) === 'locked', '練習前：新世界之門是鎖著的');
    await p.click('[data-battle="punct"]'); await p.waitForSelector('#screen-punct:not(.hidden)');
    for (let i = 0; i < 60 && await p.isVisible('#pt-skip'); i++) { if ((await p.textContent('#pt-name')).includes('通關')) break; await p.click('#pt-skip'); await p.waitForTimeout(30); }
    await p.waitForSelector('#nw-ticket', { timeout: 5000 });
    ok((await p.textContent('#nw-ticket')).includes(PASS), '打完標點符號挑戰：跳出搶先體驗券，寫著號碼');
    await p.screenshot({ path: OUT + '/nw3-ticket.png' });
    await p.click('#nw-ticket [data-x]'); await p.waitForTimeout(2800);
    ok(await p.$('#nw-ticket') === null, '關得掉搶先體驗券');
    ok(await p.$eval('#nw-door', e => e.dataset.state) === 'open', '回到大廳：新世界之門已經是開的');
    await p.click('#nw-door'); await p.waitForTimeout(900);
    ok(await p.isVisible('#nw-root'), '不用再輸入密語，點門就進得去');
    ok(p.errs.length === 0, '沒有 JS 錯誤 ' + p.errs.join(' | '));
    await p.close();
  }

  {
    const p = await run(b, false);
    await p.click('[data-battle="punct"]'); await p.waitForSelector('#screen-punct:not(.hidden)');
    for (let i = 0; i < 60 && await p.isVisible('#pt-skip'); i++) { if ((await p.textContent('#pt-name')).includes('通關')) break; await p.click('#pt-skip'); await p.waitForTimeout(30); }
    await p.waitForTimeout(3200);
    ok(await p.$('#nw-ticket') === null && await p.$eval('#nw-door', e => e.dataset.state) === 'locked', '老師沒開發放：打完也不會拿到號碼，門還是鎖著');
    ok(p.errs.length === 0, '沒有 JS 錯誤 ' + p.errs.join(' | '));
    await p.close();
  }

  await b.close(); process.exit(fails ? 1 : 0);
})();
