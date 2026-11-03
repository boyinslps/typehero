const { chromium } = require('playwright'); const fs = require('fs');
const path = require('path'); const M = path.join(__dirname, 'mock') + '/'; const OUT = process.argv[2] || require('os').tmpdir();
const seed = { 'mg_scores/五年級3班_5號': { className:'五年級3班', seat:5, name:'測試生', bestScore:101.8, bestWpm:85, bestAcc:100,
  bestLevel:20, bestKills:30, plays:44, tutorialDone:true, talentIntroDone:true, tier:'C', balanceVer:3, growthPts:200, talentCount:0 } ,
  'mg_scores/五年級3班_6號': { className:'五年級3班', seat:6, name:'新版生', bestScore:12.3, scoreVer:2, bestScoreWpm:13, bestScoreAcc:97, plays:3, tutorialDone:true, balanceVer:3 } };
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 820 } });
  const errs = []; p.on('dialog', d => d.accept());
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await p.addInitScript(s => { window.__FS = s; localStorage.clear(); window.confetti = () => {}; window.html2canvas = async () => document.createElement('canvas'); }, seed);
  await p.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('http://localhost')) return r.continue();
    const m = u.includes('firebase-app') ? 'app.js' : u.includes('firebase-auth') ? 'auth.js' : u.includes('firebase-firestore') ? 'fs.js' : null;
    if (m) return r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(M + m, 'utf8') });
    return r.abort();
  });
  await p.goto('http://localhost:8765/index.html');
  await p.waitForTimeout(1500);
  console.log('hdr:', await p.textContent('#hdr-sub'));
  await p.selectOption('#in-grade', '五年級'); await p.selectOption('#in-class', '3班');
  await p.fill('#in-seat', '5'); await p.waitForTimeout(1200);
  console.log('[old] lh-wpm:', await p.textContent('#lh-wpm'), '|', await p.textContent('#lh-bestgame'), '| title:', await p.textContent('#lh-title'));
  await p.fill('#in-seat', '6'); await p.waitForTimeout(1200);
  console.log('[new] lh-wpm:', await p.textContent('#lh-wpm'), '|', await p.textContent('#lh-bestgame'));
  await p.fill('#in-seat', '5'); await p.waitForTimeout(1200);
  await p.click('#btn-enter'); await p.waitForTimeout(1500);
  console.log('lobby visible:', await p.isVisible('#screen-lobby'), '| talent btn class:', await p.getAttribute('#btn-talent','class'));
  await p.screenshot({ path: OUT + '/lobby.png' });
  // rank board default (new only) then include old
  await p.click('#btn-rank'); await p.waitForTimeout(800);
  console.log('rank(new only):', (await p.textContent('#rank-list')).replace(/\s+/g,' ').trim());
  await p.check('#rank-old'); await p.waitForTimeout(300);
  console.log('rank(+old):', (await p.textContent('#rank-list')).replace(/\s+/g,' ').trim());
  await p.click('#rank-close');
  // play: round 1 low accuracy
  async function play(goodRatio, n) {
    await p.click('[data-battle="practice"]');
    await p.waitForSelector('#type-input:not([disabled])', { timeout: 15000 });
    await p.waitForTimeout(500);
    for (let i = 0; i < n; i++) {
      const t = await p.$$eval('#q-text .zy-han', els => els.map(e => e.textContent).join(''));
      const chars = [...t]; const k = Math.ceil(chars.length * goodRatio);
      const typed = chars.map((c, j) => j < k ? c : '錯').join('');
      await p.fill('#type-input', typed); await p.press('#type-input', 'Enter');
      await p.waitForTimeout(450);
    }
    await p.click('#btn-escape');
    await p.waitForTimeout(4000);
    const vis = await p.evaluate(() => [...document.querySelectorAll('section')].filter(s => !s.classList.contains('hidden')).map(s => s.id));
    console.log(' visible sections after escape:', vis, errs.join(' | '));
    const d0 = await p.evaluate(() => window.__FS['mg_scores/五年級3班_5號']);
    console.log(' saved(early):', JSON.stringify({ bestScore:d0.bestScore, scoreVer:d0.scoreVer, bestScoreWpm:d0.bestScoreWpm, lastAcc:d0.lastAcc, lastWpm:d0.lastWpm }));
    await p.screenshot({ path: OUT + '/after-escape.png' });
    await p.waitForSelector('#screen-result:not(.hidden)', { timeout: 45000 });
    await p.waitForTimeout(800);
    const lowacc = await p.isVisible('#r-lowacc') ? await p.textContent('#r-lowacc') : '(none)';
    console.log(` result acc=${await p.textContent('#r-acc')} wpm=${await p.textContent('#r-wpm')} lowacc=${lowacc}`);
    const d = await p.evaluate(() => window.__FS['mg_scores/五年級3班_5號']);
    console.log(' saved:', JSON.stringify({ bestScore:d.bestScore, scoreVer:d.scoreVer, bestScoreWpm:d.bestScoreWpm, bestScoreAcc:d.bestScoreAcc, lastAcc:d.lastAcc }));
  }
  await play(0.5, 6);
  await p.screenshot({ path: OUT + '/result-low.png' });
  await p.click('#btn-back-lobby');
  await p.waitForTimeout(1000);
  await play(1, 6);
  console.log(errs.slice(0, 10).join('\n') || 'no page errors');
  await b.close();
})().catch(e => { console.error('TEST FAIL', e.message); process.exit(1); });
