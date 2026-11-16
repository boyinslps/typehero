/* 標點符號挑戰：三關教學（Shift → Ctrl → 上下引號要選字）→ 打怪挑戰 → 老師開了的話拿搶先體驗號碼 */
const { chromium } = require('playwright'); const fs = require('fs');
const path = require('path'); const M = path.join(__dirname, 'mock') + '/'; const OUT = process.argv[2] || require('os').tmpdir();
const css = fs.existsSync(OUT + '/tw.css') ? fs.readFileSync(OUT + '/tw.css', 'utf8') : '';
const PASS = 'Test-Pass_9!x';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

async function run(b, passed) {
  const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
  const errs = []; p.on('dialog', d => d.accept());
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  const { sha256Hex } = await import('../../nw-access.js');
  const hash = await sha256Hex(PASS);
  const seed = {
    'mg_scores/五年級3班_6號': { className: '五年級3班', seat: 6, name: '新手', bestLevel: 3, plays: 2, tutorialDone: true, talentIntroDone: true, tier: 'B', balanceVer: 3, ...(passed ? { punctDone: true } : {}) },
    'mg_config/settings': {}
  };
  await p.addInitScript(a => { window.__NW_CODE_HASH__ = a.hash; window.__NW_NOGIFT__ = true; window.__NW_NOINTRO__ = true; window.__FS = a.s; localStorage.clear(); window.confetti = () => {}; window.html2canvas = async () => document.createElement('canvas'); }, { s: seed, hash });
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

/* 跑完整個挑戰：教學視窗一律等「學會了」可以按再按；練習題用「跳過」；打怪挑戰照題目打。onLesson 可以在教學視窗出現時做檢查 */
async function finishDrill(p, onLesson) {
  const seen = []; const sentences = [];
  for (let i = 0; i < 400; i++) {
    if (await p.isVisible('#pt-lesson')) {
      const name = await p.textContent('#ptl-name'); seen.push(name);
      if (onLesson) await onLesson(name);
      await p.waitForSelector('#ptl-done[data-ready="1"]', { timeout: 40000 }); await p.click('#ptl-done'); await p.waitForTimeout(60); continue;
    }
    if (await p.isVisible('#pt-mon')) {
      const t = await p.textContent('#ptm-text');
      if (t.includes('打倒牠了')) break;
      sentences.push(t);
      await p.fill('#pt-input', t); await p.press('#pt-input', 'Enter'); await p.waitForTimeout(40); continue;
    }
    await p.click('#pt-skip').catch(() => {}); await p.waitForTimeout(40);
  }
  return { seen, sentences };
}

(async () => {
  const b = await chromium.launch();

  {
    const p = await run(b, false);
    await p.click('[data-battle="punct"]'); await p.waitForSelector('#pt-lesson:not(.hidden)');
    ok((await p.textContent('#ptl-badge')).includes('第 1 關') && (await p.textContent('#ptl-name')) === 'Shift 加一顆鍵' && (await p.$$('#ptl-marks .ptl-mark')).length === 4, '第 1 關：Shift 的 4 個符號（！ @ ~ ？）一次看完');
    ok(await p.getAttribute('#ptl-done', 'data-ready') === '0' && await p.isDisabled('#pt-input'), '動畫還沒演完：「學會了」是灰的、輸入框先鎖住');
    await p.click('#ptl-done'); await p.waitForTimeout(300);
    ok((await p.textContent('#toast-body')).includes('先看完動畫') && await p.isVisible('#pt-lesson') && await p.getAttribute('#ptl-done', 'data-ready') === '0', '太早按「學會了」：跳出「先看完動畫」的提醒，教學不會關掉');
    const steps = new Set();
    for (let i = 0; i < 40 && steps.size < 3; i++) { steps.add(await p.getAttribute('#ptl-demo .ptl-kb', 'data-step')); await p.waitForTimeout(150); }
    ok(steps.has('1') && steps.has('2'), '動畫會一步一步演：按住 Shift → 再按那顆鍵（' + [...steps].join(',') + '）');
    await p.waitForSelector('#ptl-done[data-ready="1"]', { timeout: 40000 });
    ok(await p.$('#ptl-demo .dk-mod') !== null && await p.$('#ptl-demo .dk-target') !== null && (await p.$$('#ptl-demo .dk')).length > 40, '畫面上有鍵盤，修飾鍵與目標鍵都有標出來');
    await p.screenshot({ path: OUT + '/nw3-lesson.png' });
    await p.click('#ptl-done'); await p.waitForTimeout(200);
    ok(await p.evaluate(() => JSON.parse(localStorage.getItem('mg_pl_五年級3班_6號')).includes('#0')), '學會的這一組記在本機');
    ok(await p.isHidden('#pt-lesson') && !(await p.isDisabled('#pt-input')), '看完整組教學：教學關掉、輸入框可以打字（不用跟著打）');
    ok(await p.$('#pt-mark svg') !== null && await p.$('#pt-mini .dk') !== null, '練習時：標點用向量圖、旁邊有小動畫視窗');
    const nm = await p.textContent('#pt-name'), cap = await p.textContent('#pt-mini .ptl-cap');
    ok(cap.includes({ 驚嘆號: '！', 小老鼠: '@', 波浪號: '~', 問號: '？' }[nm]) && await p.$('#pt-help') === null, '小動畫視窗同步演現在這題（' + nm + '），沒有擠人的「看教學」按鈕');
    await p.screenshot({ path: OUT + '/nw3-practice.png' });
    ok(p.errs.length === 0, '沒有 JS 錯誤 ' + p.errs.join(' | '));
    await p.close();
  }

  {
    const p = await run(b, false);
    ok(await p.$eval('#nw-door', e => e.dataset.state) === 'locked', '練習前：新世界之門是鎖著的');
    await p.click('[data-battle="punct"]'); await p.waitForSelector('#pt-lesson:not(.hidden)');
    let quote = null;
    const { seen, sentences } = await finishDrill(p, async name => {
      if (name !== 'Ctrl 加一顆鍵') return;
      const caps = new Set(), typed = new Set(), cands = new Set();
      for (let k = 0; k < 260; k++) {
        caps.add(await p.textContent('#ptl-demo .ptl-cap'));
        typed.add(await p.textContent('#ptl-demo .ptl-typed'));
        if (await p.isVisible('#ptl-demo .ptl-cand')) cands.add(await p.textContent('#ptl-demo .ptl-cand'));
        if (['【', '「', '】', '」'].every(c => typed.has(c))) break;
        await p.waitForTimeout(150);
      }
      quote = { caps: [...caps].join('|'), typed: [...typed], cands: [...cands].join('|'), marks: (await p.$$('#ptl-marks .ptl-mark')).length };
      await p.screenshot({ path: OUT + '/nw3-quote.png' });
    });
    ok(JSON.stringify(seen) === JSON.stringify(['Shift 加一顆鍵', 'Ctrl 加一顆鍵']), '流程：Shift 一次看完 → 練 3 個 → Ctrl 一次看完 → 練 3 個（' + seen.join('、') + '）');
    ok(quote && quote.marks === 5 && quote.typed.includes('【') && quote.typed.includes('「') && quote.typed.includes('】') && quote.typed.includes('」'), 'Ctrl 組的動畫：上下引號先出現【再變成「，接著】再變成」');
    ok(quote && quote.caps.includes('選字框') && quote.caps.includes('Enter') && quote.cands.includes('『'), 'Ctrl 組的動畫：說明要從選字框選，畫出選字框');
    ok(sentences.length === 5 && sentences.every(t => [...t].length <= 8 && /[，。、？！~「」]/.test(t)), '打怪挑戰：打 5 句短句，字和標點混用，每句不超過 8 個字（' + sentences.join(' ') + '）');
    ok((await p.$$('#pt-ticket .st.on')).length === 3 && await p.$('.pt-banner') !== null && (await p.textContent('#pt-ticket')).includes('新世界門票'), '三關各蓋一個章、跳出過關橫幅與星星特效，提示寫著新世界門票');
    await p.waitForSelector('#nw-ticket', { timeout: 6000 });
    ok((await p.textContent('#nw-ticket')).includes('新世界門票') && !(await p.textContent('#nw-ticket')).includes('號碼'), '全部練完（含打怪挑戰）：自動跳出新世界門票，不用老師設定');
    await p.screenshot({ path: OUT + '/nw3-ticket.png' });
    await p.click('#nw-ticket [data-x]'); await p.waitForTimeout(2800);
    ok(await p.$('#nw-ticket') === null && await p.$eval('#nw-door', e => e.dataset.state) === 'open', '回到大廳：新世界之門已經是開的');
    ok(await p.evaluate(() => window.__FS['mg_scores/五年級3班_6號'].punctDone) === true, '通關記在雲端的成績資料，換電腦也還在');
    await p.click('#nw-door'); await p.waitForTimeout(900);
    ok(await p.isVisible('#nw-root'), '不用再輸入密語，點門就進得去');
    ok(p.errs.length === 0, '沒有 JS 錯誤 ' + p.errs.join(' | '));
    await p.close();
  }

  {
    const p = await run(b, true);
    ok(await p.$eval('#nw-door', e => e.dataset.state) === 'open', '以前就打完過的同學：不用重打，門本來就是開的');
    await p.click('[data-battle="punct"]'); await p.waitForSelector('#pt-lesson:not(.hidden)');
    await finishDrill(p);
    await p.waitForTimeout(3200);
    ok(await p.$('#nw-ticket') === null, '重複練習：不會再跳一次新世界門票');
    ok(p.errs.length === 0, '沒有 JS 錯誤 ' + p.errs.join(' | '));
    await p.close();
  }

  await b.close(); process.exit(fails ? 1 : 0);
})();
