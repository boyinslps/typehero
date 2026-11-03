/* 新世界預告＋提名投票（index.html 的 #nw-modal）。用法見 README.md */
const { chromium } = require('playwright'); const fs = require('fs');
const path = require('path'); const M = path.join(__dirname, 'mock') + '/'; const OUT = process.argv[2] || require('os').tmpdir();
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 820 } });
  const errs = []; p.on('dialog', d => d.accept());
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await p.addInitScript(() => { window.__FS = {}; localStorage.clear(); window.confetti = () => {}; window.html2canvas = async () => document.createElement('canvas'); });
  await p.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('http://localhost')) return r.continue();
    const m = u.includes('firebase-app') ? 'app.js' : u.includes('firebase-auth') ? 'auth.js' : u.includes('firebase-firestore') ? 'fs.js' : null;
    if (m) return r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(M + m, 'utf8') });
    return r.abort();
  });
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);

  // 1. 預告頁
  await p.click('#btn-nw'); await p.waitForTimeout(300);
  ok(await p.isVisible('#nw-modal'), '按鈕打得開預告頁');
  ok((await p.$$('#nw-preview .nw-grid')).length === 6, '魔物／武器／區域／系統／裝備／造型六組卡片');
  ok((await p.$$('#nw-preview .nw-card canvas')).length === 38, '12 魔物＋9 武器＋7 區域＋10 造型各一張像素圖');
  ok((await p.$$('#nw-preview .nw-px canvas')).length === 41, '加上傳送門、獵人、戰鬥畫面共 41 張');
  ok((await p.$$('#nw-preview .nwb-tag')).length === 4 && (await p.textContent('#nw-preview .nwb-tag.me')).includes('你'), '戰鬥畫面有 4 位玩家，自己有標示');
  const sc0 = await p.evaluate(() => document.querySelector('#nw-preview [data-k="monster:coo"] canvas').toDataURL());
  await p.click('#nw-preview [data-k="monster:coo"]');
  const sc1 = await p.evaluate(() => document.querySelector('#nw-preview [data-k="monster:coo"] canvas').toDataURL());
  ok(sc0 !== sc1, '點魔物會換成生氣的樣子');
  await p.screenshot({ path: OUT + '/nw-preview.png', fullPage: false });

  // 2. 沒填身分：看得到、不能提名
  await p.click('#nw-tab-vote'); await p.waitForTimeout(200);
  ok(await p.isDisabled('.nw-in[data-cat="monster"]'), '沒填姓名時輸入框停用');
  ok((await p.textContent('#nw-who')).includes('要先填好'), '提示要先填身分');
  await p.click('#nw-close');

  // 3. 填身分後提名
  await p.selectOption('#in-grade', '五年級'); await p.selectOption('#in-class', '3班');
  await p.fill('#in-seat', '7'); await p.fill('#in-name', '小明');
  await p.click('#btn-nw'); await p.click('#nw-tab-vote'); await p.waitForTimeout(300);
  ok(!(await p.isDisabled('.nw-in[data-cat="monster"]')), '填好身分後可以輸入');
  await p.fill('.nw-in[data-cat="monster"]', '火焰雞'); await p.press('.nw-in[data-cat="monster"]', 'Enter'); await p.waitForTimeout(300);
  ok((await p.textContent('#nw-list-monster')).includes('火焰雞') && (await p.textContent('#nw-list-monster')).includes('五年級3班 7號 小明'), '提名即時出現，附班級座號姓名');
  ok((await p.inputValue('.nw-in[data-cat="monster"]')) === '', '提名後輸入框清空');
  await p.fill('.nw-in[data-cat="region"]', '一二三四五六七八九十一二三四五');
  ok((await p.inputValue('.nw-in[data-cat="region"]')).length <= 12, '輸入框最多 12 字');
  await p.fill('.nw-in[data-cat="region"]', '糖果王國'); await p.click('.nw-add[data-cat="region"]'); await p.waitForTimeout(300);

  // 4. 投票不限票數
  const id = await p.getAttribute('#nw-list-monster .nw-vote', 'data-id');
  for (let i = 0; i < 3; i++) await p.click('#nw-list-monster .nw-vote');
  await p.waitForTimeout(300);
  let doc = await p.evaluate(() => window.__FS['mg_config/nw_vote']);
  ok(doc.votes[id] === 3, '連按 3 次＝3 票（' + doc.votes[id] + '）');
  ok((await p.textContent('#nw-list-monster')).includes('3'), '畫面票數即時更新');

  // 5. 重複提名＝幫忙投一票，不新增
  await p.fill('.nw-in[data-cat="monster"]', '火焰雞'); await p.click('.nw-add[data-cat="monster"]'); await p.waitForTimeout(300);
  doc = await p.evaluate(() => window.__FS['mg_config/nw_vote']);
  ok(doc.noms.filter(n => n.text === '火焰雞').length === 1 && doc.votes[id] === 4, '重複提名不新增，改投 1 票');

  // 6. 老師隱藏
  ok((await p.$$('.nw-hide')).length === 0, '一般學生看不到隱藏按鈕');
  await p.click('#nw-admin'); await p.fill('#nw-admin-pw', 'wrong'); await p.click('#nw-admin-ok');
  ok((await p.$$('.nw-hide')).length === 0, '密碼錯誤不能管理');
  await p.fill('#nw-admin-pw', 'teacher'); await p.click('#nw-admin-ok'); await p.waitForTimeout(200);
  await p.click('#nw-list-region .nw-hide'); await p.waitForTimeout(300);
  ok((await p.evaluate(() => window.__FS['mg_config/nw_vote'].hidden.length)) === 1, '老師隱藏寫進 hidden');
  await p.screenshot({ path: OUT + '/nw-vote-admin.png', fullPage: true });
  await p.click('#nw-admin'); await p.waitForTimeout(200);   // 結束管理
  ok(!(await p.textContent('#nw-list-region')).includes('糖果王國'), '隱藏後學生看不到');
  await p.click('#nw-admin'); await p.fill('#nw-admin-pw', 'teacher'); await p.click('#nw-admin-ok');
  await p.click('#nw-list-region .nw-hide'); await p.waitForTimeout(300);
  ok((await p.evaluate(() => window.__FS['mg_config/nw_vote'].hidden.length)) === 0, '恢復後 hidden 清空');

  // 7. 排序切換
  await p.click('#nw-sort'); ok((await p.textContent('#nw-sort')).includes('最新'), '排序可切換');

  // 8. 手機寬度
  await p.setViewportSize({ width: 390, height: 800 }); await p.waitForTimeout(200);
  const overflow = await p.evaluate(() => document.getElementById('nw-modal').scrollWidth > innerWidth + 1);
  ok(!overflow, '手機寬度沒有橫向捲動');
  await p.screenshot({ path: OUT + '/nw-vote-mobile.png', fullPage: false });

  ok(errs.length === 0, '沒有 JS 錯誤 ' + errs.join(' | '));
  await b.close(); process.exit(fails ? 1 : 0);
})();
