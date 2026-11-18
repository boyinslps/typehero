/* 標點符號挑戰：過關自動記錄，下次從那一關繼續（本機＋雲端，取大的；通關後重玩不記進度） */
const { chromium } = require('playwright'); const fs = require('fs');
const path = require('path'); const M = path.join(__dirname, 'mock') + '/'; const OUT = process.argv[2] || require('os').tmpdir();
const css = require('./tw.js')(OUT);
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const ID = '五年級3班_6號', HK = 'mg_hist_' + ID, PK = 'mg_pl_' + ID;

/* cloud：雲端那份多的欄位；local：開頁前先放進本機的 mg_hist（只在第一次載入放，重新整理不會被洗掉） */
async function run(b, cloud = {}, local = null) {
  const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
  const errs = []; p.on('dialog', d => d.accept());
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  const seed = {
    ['mg_scores/' + ID]: { className: '五年級3班', seat: 6, name: '新手', bestLevel: 3, plays: 2, tutorialDone: true, talentIntroDone: true, tier: 'B', balanceVer: 3, ...cloud },
    'mg_config/settings': {}
  };
  await p.addInitScript(a => {
    window.__NW_NOGIFT__ = true; window.__NW_NOINTRO__ = true; window.__FS = a.s;
    if (!sessionStorage.__init) { sessionStorage.__init = '1'; localStorage.clear(); if (a.local) localStorage.setItem(a.hk, JSON.stringify(a.local)); }
    window.confetti = () => {}; window.html2canvas = async () => document.createElement('canvas');
  }, { s: seed, local, hk: HK });
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
const cloudStage = p => p.evaluate(id => window.__FS['mg_scores/' + id].punctStage, ID);
const localHist = (p, k) => p.evaluate(a => (JSON.parse(localStorage.getItem(a.hk) || 'null') || {})[a.k], { hk: HK, k });
const enter = async p => { await p.click('[data-battle="punct"]'); await p.waitForTimeout(500); };
const lessonReadyDone = async p => { await p.waitForSelector('#ptl-done[data-ready="1"]', { timeout: 40000 }); await p.click('#ptl-done'); await p.waitForTimeout(150); };
/* 練習關卡：看完教學（如果有跳出來）後用「跳過」把 3 題過完 */
async function passPractice(p) {
  if (await p.isVisible('#pt-lesson')) await lessonReadyDone(p);
  for (let i = 0; i < 3; i++) { await p.click('#pt-skip'); await p.waitForTimeout(60); }
}
const quit = async p => { await p.evaluate(() => document.getElementById('pt-quit').click()); await p.waitForTimeout(500); };
const sub = p => p.textContent('#pt-sub');

(async () => {
  const b = await chromium.launch();

  {
    const p = await run(b);
    await enter(p);
    ok((await p.textContent('#ptl-badge')).includes('第 1 關') && !(await sub(p)).includes('繼續'), '沒有進度的人：從第 1 關開始，沒有「繼續」的提示');
    await passPractice(p);
    await p.waitForTimeout(300);
    ok(await cloudStage(p) === 1 && await localHist(p, 'punctStage') === 1, '過第 1 關：雲端與本機都記下「下一關 = 1」（第 2 關）');
    await p.waitForSelector('#pt-lesson:not(.hidden)', { timeout: 4000 });
    ok((await p.textContent('#ptl-badge')).includes('第 2 關'), '過關後接著進第 2 關');
    await quit(p);
    ok(await cloudStage(p) === 1, '打到一半離開：已經過的關卡保留');
    await p.evaluate(k => localStorage.removeItem(k), PK);   // 連「看過教學」的本機紀錄也清掉，證明跳過靠的是進度
    await enter(p);
    const t = await sub(p);
    ok(t.includes('從第 2 關繼續（第 1 關已經過了）'), '再進來：上方寫「從第 2 關繼續（第 1 關已經過了）」');
    ok(await p.isVisible('#pt-lesson') && (await p.textContent('#ptl-badge')).includes('第 2 關') && (await p.textContent('#ptl-name')) === 'Ctrl 加一顆鍵', '直接從第 2 關開始，不再跳第 1 關的教學');
    ok((await p.$$('#pt-ticket .st.on')).length === 1, '過了的第 1 關，章已經蓋好');
    await lessonReadyDone(p);
    for (let i = 0; i < 3; i++) { await p.click('#pt-skip'); await p.waitForTimeout(60); }
    await p.waitForSelector('#pt-mon:not(.hidden)', { timeout: 4000 });
    ok(await cloudStage(p) === 2 && await localHist(p, 'punctStage') === 2, '過第 2 關：進打怪挑戰也算一關，記下「下一關 = 2」');
    await quit(p);
    await enter(p);
    ok(await p.isVisible('#pt-mon') && await p.isHidden('#pt-lesson') && (await sub(p)).includes('從打怪挑戰繼續（第 1、2 關已經過了）'), '打怪打到一半離開：下次直接進打怪挑戰，上方寫「從打怪挑戰繼續（第 1、2 關已經過了）」');
    ok(await cloudStage(p) === 2 && await p.evaluate(id => !window.__FS['mg_scores/' + id].punctDone, ID), '離開不會算通關');
    ok(p.errs.length === 0, '沒有 JS 錯誤 ' + p.errs.join(' | '));
    await p.close();
  }

  {
    const p = await run(b, { punctStage: 1 });
    await enter(p);
    ok((await sub(p)).includes('從第 2 關繼續（第 1 關已經過了）') && (await p.textContent('#ptl-badge')).includes('第 2 關'), '清掉本機、只靠雲端（進度 1）：從第 2 關繼續');
    await p.close();
    const q = await run(b, { punctStage: 2 });
    await enter(q);
    ok(await q.isVisible('#pt-mon') && await q.isHidden('#pt-lesson'), '只靠雲端（進度 2）：直接進打怪挑戰');
    await q.close();
  }

  {
    const loc = { name: '新手', bestLevel: 3, plays: 2, tutorialDone: true, lastPlayedMs: 1 };
    const p = await run(b, { punctStage: 1 }, { ...loc, punctStage: 2 });
    await enter(p);
    ok(await p.isVisible('#pt-mon'), '本機 2、雲端 1：取大的，進打怪挑戰');
    await p.close();
    const q = await run(b, { punctStage: 2 }, { ...loc, punctStage: 1 });
    await enter(q);
    ok(await q.isVisible('#pt-mon'), '本機 1、雲端 2：取大的，進打怪挑戰');
    await q.close();
  }

  {
    const p = await run(b, { punctDone: true, punctStage: 3 });
    await enter(p);
    ok((await p.textContent('#ptl-badge')).includes('第 1 關') && !(await sub(p)).includes('繼續'), '已通關的人再進來：從第 1 關重玩，沒有「繼續」');
    await passPractice(p);
    await p.waitForSelector('#pt-lesson:not(.hidden)', { timeout: 4000 });
    await quit(p);
    ok(await cloudStage(p) === 3 && (await localHist(p, 'punctStage') || 3) === 3, '重玩途中離開：進度欄位仍是「已全部通過」，沒被改小');
    await enter(p);
    ok((await sub(p)).includes('第 1 / 2 關') && !(await sub(p)).includes('繼續'), '重玩中途離開後再進來：還是從第 1 關');
    await p.close();
    const q = await run(b, { punctDone: true });   // 舊資料：只有 punctDone、沒有進度欄位
    await enter(q);
    ok((await q.textContent('#ptl-badge')).includes('第 1 關'), '舊的通關紀錄（沒有進度欄位）也從第 1 關重玩');
    await q.close();
  }

  {
    const p = await run(b, { punctStage: 2 });
    await enter(p);
    ok(await p.isVisible('#pt-mon'), '從打怪挑戰繼續');
    for (let i = 0; i < 40; i++) {
      const t = await p.textContent('#ptm-text'); if (t.includes('打倒牠了')) break;
      await p.fill('#pt-input', t); await p.press('#pt-input', 'Enter'); await p.waitForTimeout(40);
    }
    await p.waitForSelector('#nw-ticket', { timeout: 6000 });
    ok((await p.textContent('#nw-ticket')).includes('新世界門票'), '第一次通關（接著上次進度打完）：新世界門票照樣跳出來');
    ok(await p.evaluate(id => { const d = window.__FS['mg_scores/' + id]; return d.punctDone === true && d.punctStage === 3 && d.growthPts > 0; }, ID), '通關後雲端：punctDone 為真、進度是「已全部通過」、有拿到成長點數');
    ok(p.errs.length === 0, '沒有 JS 錯誤 ' + p.errs.join(' | '));
    await p.close();
  }

  await b.close(); process.exit(fails ? 1 : 0);
})();
