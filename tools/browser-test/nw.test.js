/* 新世界預告＋提名投票（index.html 的 #nw-modal、nw-preview.js）。用法見 README.md */
const { chromium } = require('playwright'); const fs = require('fs');
const path = require('path'); const M = path.join(__dirname, 'mock') + '/'; const OUT = process.argv[2] || require('os').tmpdir();
const css = fs.existsSync(OUT + '/tw.css') ? fs.readFileSync(OUT + '/tw.css', 'utf8') : '';
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
    if (u.includes('cdn.tailwindcss.com')) return r.fulfill({ contentType: 'application/javascript', body: `const s=document.createElement('style');s.textContent=${JSON.stringify(css)};document.head.appendChild(s);` });
    const m = u.includes('firebase-app') ? 'app.js' : u.includes('firebase-auth') ? 'auth.js' : u.includes('firebase-firestore') ? 'fs.js' : null;
    if (m) return r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(M + m, 'utf8') });
    return r.abort();
  });
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);

  const goPage = async g => { await p.click(`#nwp-nav [data-g="${g}"]`); await p.waitForTimeout(150); };
  const noScroll = () => p.evaluate(() => { const e = document.getElementById('nwp-page'); return e.scrollHeight <= e.clientHeight + 2 && document.getElementById('nw-modal').scrollWidth <= innerWidth + 1; });

  // 1. 預告：分頁、不捲動
  await p.click('#btn-nw'); await p.waitForTimeout(300);
  ok(await p.isVisible('#nw-modal'), '按鈕打得開預告頁');
  ok((await p.$$('#nwp-nav .nwp-chip')).length === 11, '上面有 11 個關鍵字：故事、獵人村、委託板、背包、稱號、戰鬥、魔物、武器、地方、新玩法、投票');
  const total = +(await p.textContent('#nwp-count')).match(/\/ (\d+)/)[1];
  ok(total === 16, '共 16 頁（魔物 3、武器 3、地方 2 各自分頁）');
  ok(await p.$eval('#nw-modal', e => getComputedStyle(e).overflow) === 'hidden', '預告視窗不是捲動式');
  let allFit = true;
  for (let i = 0; i < total; i++) { if (!(await noScroll())) { allFit = false; console.log('  第', i + 1, '頁超出'); } if (i < total - 1) await p.click('#nwp-next'); }
  ok(allFit, '桌面寬度：每一頁都在一個畫面內');
  await p.click('#nwp-prev'); await p.click('#nwp-prev');

  await goPage('story');
  const story = await p.textContent('#nwp-page');
  ok(story.includes('委託板') && story.includes('背包') && story.includes('稱號') && story.includes('施工中'), '故事頁寫出第一批開放的三樣與施工中的東西');
  await goPage('village');
  const vil = await p.textContent('#nwp-page');
  ok(vil.includes('Enter') && vil.includes('不會直接進去') && await p.$('#nwp-page canvas') !== null, '獵人村頁：說明點選或按 Enter 進房子，有村莊圖');
  await goPage('board');
  ok((await p.textContent('#nwp-page')).includes('狩獵') && (await p.$$('#nwp-page canvas')).length === 3, '委託板頁：三張單子的魔物圖與說明');
  await goPage('bag');
  ok((await p.$$('#nwp-page .nwp-slot')).length === 5 && (await p.$$('#nwp-page .nwp-four canvas')).length === 4, '背包頁：5 個裝備格、四把初心武器');
  await goPage('title');
  ok((await p.$$('#nwp-page svg')).length === 3 && (await p.textContent('#nwp-page')).includes('詞條'), '稱號頁：SVG 徽章與詞條說明');
  await goPage('battle');
  ok((await p.$$('#nwp-page .nwb-tag')).length === 4 && (await p.textContent('#nwp-page .nwb-tag.me')).includes('你'), '戰鬥頁：4 位玩家，自己有標示');
  ok((await p.textContent('#nwp-page')).includes('Ctrl') && (await p.textContent('#nwp-page')).includes('Alt') && (await p.textContent('#nwp-page')).includes('國字'), '戰鬥頁：說明左右 Ctrl 換線、Alt 舉盾與國字題');
  await goPage('monster');
  ok((await p.$$('#nwp-page .nwp-card canvas')).length === 4, '魔物第 1 頁 4 隻');
  const sc0 = await p.evaluate(() => document.querySelector('#nwp-page [data-k="monster:coo"] canvas').toDataURL());
  await p.click('#nwp-page [data-k="monster:coo"]');
  const sc1 = await p.evaluate(() => document.querySelector('#nwp-page [data-k="monster:coo"] canvas').toDataURL());
  ok(sc0 !== sc1, '點魔物會換成生氣的樣子');
  await p.click('#nwp-next'); await p.click('#nwp-next');
  ok((await p.$$('#nwp-page .nwp-card canvas')).length === 4 && (await p.textContent('#nwp-page')).includes('混沌巨龍'), '魔物第 3 頁有混沌巨龍');
  await goPage('weapon'); ok((await p.$$('#nwp-page .nwp-card canvas')).length === 3, '武器第 1 頁 3 把');
  await goPage('region'); ok((await p.$$('#nwp-page .nwp-card canvas')).length === 4, '地方第 1 頁 4 個');
  await goPage('play'); ok((await p.textContent('#nwp-page')).includes('榮譽碑') && (await p.textContent('#nwp-page')).includes('施工中'), '新玩法頁標出施工中');
  await p.screenshot({ path: OUT + '/nw-preview.png' });

  // 2. 投票頁：沒填身分
  await goPage('vote');
  const vt = await p.textContent('#nwp-page');
  ok(vt.includes('一起決定') && vt.includes('按下面的分類') && vt.includes('Enter') && vt.includes('投一票'), '投票頁最上面寫出怎麼選、怎麼輸入、怎麼投');
  ok(await p.isDisabled('.nw-in[data-cat="monster"]'), '沒填姓名時輸入框停用');
  ok((await p.textContent('#nw-who')).includes('要先在首頁填好'), '提示要先填身分');
  await p.click('#nw-close');

  // 3. 填身分後提名
  await p.selectOption('#in-grade', '五年級'); await p.selectOption('#in-class', '3班');
  await p.fill('#in-seat', '7'); await p.fill('#in-name', '小明');
  await p.evaluate(() => { window.__FS['mg_config/nw_vote'] = { noms: [{ id: 'old1', cat: 'monster', text: '舊提名', cls: '五年級1班', seat: '1', name: '甲', t: 1 }], votes: { old1: 99 } }; });
  await p.click('#btn-nw'); await goPage('vote'); await p.waitForTimeout(300);
  ok(!(await p.isDisabled('.nw-in[data-cat="monster"]')), '填好身分後可以輸入');
  await p.fill('.nw-in[data-cat="monster"]', '火焰雞'); await p.press('.nw-in[data-cat="monster"]', 'Enter'); await p.waitForTimeout(300);
  ok((await p.textContent('#nw-list-monster')).includes('火焰雞') && (await p.textContent('#nw-list-monster')).includes('五年級3班 7號 小明'), '提名即時出現，附班級座號姓名');
  ok((await p.inputValue('.nw-in[data-cat="monster"]')) === '', '提名後輸入框清空');
  await p.click('.nwp-cat[data-cat="region"]'); await p.waitForTimeout(100);
  ok(await p.isVisible('#nw-list-region') && (await p.$('#nw-list-monster')) === null, '按分類切換到「想去的地方」');
  await p.fill('.nw-in[data-cat="region"]', '一二三四五六七八九十一二三四五');
  ok((await p.inputValue('.nw-in[data-cat="region"]')).length <= 12, '輸入框最多 12 字');
  await p.fill('.nw-in[data-cat="region"]', '糖果王國'); await p.click('.nw-add[data-cat="region"]'); await p.waitForTimeout(300);
  ok((await p.textContent('#nw-list-region')).includes('糖果王國'), '另一個分類也能提名');
  await p.click('.nwp-cat[data-cat="monster"]'); await p.waitForTimeout(100);

  // 4. 一人一個提案只能投一次
  const id = await p.getAttribute('#nw-list-monster .nw-vote', 'data-id');
  await p.click('#nw-list-monster .nw-vote'); await p.waitForTimeout(300);
  let doc = await p.evaluate(() => window.__FS['mg_config/nw_vote']);
  ok(Object.keys(doc.v[id]).length === 1 && doc.v[id]['五年級3班_7號'] === 1, '按一次＝1 票，記下是誰投的');
  ok(await p.isVisible('#nw-list-monster .nw-vote.done') && (await p.textContent('#nw-list-monster')).includes('已投票'), '投過的按鈕變成「✓ 已投票」');
  await p.click('#nw-list-monster .nw-vote.done'); await p.waitForTimeout(250);
  doc = await p.evaluate(() => window.__FS['mg_config/nw_vote']);
  ok(Object.keys(doc.v[id] || {}).length === 0, '點「✓ 已投票」會收回這一票');
  await p.click('#nw-list-monster .nw-vote'); await p.waitForTimeout(250);
  doc = await p.evaluate(() => window.__FS['mg_config/nw_vote']);
  ok(Object.keys(doc.v[id]).length === 1, '收回後可以再投，同一個人還是只算 1 票');
  await p.click('#nw-close');
  await p.fill('#in-seat', '8'); await p.fill('#in-name', '小華');
  await p.click('#btn-nw'); await goPage('vote'); await p.waitForTimeout(300);
  ok(!(await p.$('#nw-list-monster .nw-vote.done')) && !(await p.isDisabled('#nw-list-monster .nw-vote')), '換另一位同學：同一則還可以投');
  await p.click('#nw-list-monster .nw-vote'); await p.waitForTimeout(300);
  doc = await p.evaluate(() => window.__FS['mg_config/nw_vote']);
  ok(Object.keys(doc.v[id]).length === 2, '兩位同學各投一次＝2 票');

  // 5. 重複提名＝只幫忙投一票（投過就不再加），不新增
  await p.fill('.nw-in[data-cat="monster"]', '火焰雞'); await p.click('.nw-add[data-cat="monster"]'); await p.waitForTimeout(300);
  doc = await p.evaluate(() => window.__FS['mg_config/nw_vote']);
  ok(doc.noms.filter(n => n.text === '火焰雞').length === 1 && Object.keys(doc.v[id]).length === 2, '重複提名不新增，已經投過也不會多算');
  ok((await p.textContent('#nw-list-monster')).includes('舊提名') && /舊提名[\s\S]*?\b0\b/.test(await p.textContent('#nw-list-monster')), '改版前的舊票數（刷出來的 99 票）不再計算，已清空');

  // 6. 提名很多：分頁，不捲動
  await p.evaluate(() => {
    const d = window.__FS['mg_config/nw_vote']; d.noms = d.noms || [];
    for (let i = 0; i < 12; i++) d.noms.push({ id: 'seed' + i, cat: 'monster', text: '魔物' + i, cls: '五年級1班', seat: String(i + 1), name: '同學', t: 1000 + i });
  });
  await p.click('#nw-close'); await p.click('#btn-nw'); await goPage('vote'); await p.waitForTimeout(400);
  ok((await p.textContent('#nwp-vpage')).includes('共 14 則') && await noScroll(), '提名多的時候用 ◀ ▶ 翻頁，頁面不會變長');
  const first = await p.textContent('#nw-list-monster');
  await p.click('[data-vp="1"]'); await p.waitForTimeout(100);
  ok((await p.textContent('#nw-list-monster')) !== first, '按 ▶ 看下一頁');

  // 6b. 一個分類最多提名 3 個、最多投 3 票，投過的可以收回
  await p.click('[data-vp="-1"]'); await p.waitForTimeout(100);
  const nomIn = async t => { await p.fill('.nw-in[data-cat="monster"]', t); await p.press('.nw-in[data-cat="monster"]', 'Enter'); await p.waitForTimeout(150); };
  const mineN = () => p.evaluate(() => window.__FS['mg_config/nw_vote'].noms.filter(n => n.cat === 'monster' && n.cls === '五年級3班' && String(n.seat) === '8').length);
  await nomIn('甲乙怪'); await nomIn('丙丁怪'); await nomIn('戊己怪');
  ok(await mineN() === 3, '這個分類可以提名 3 個');
  await nomIn('庚辛怪');
  ok(await mineN() === 3, '第 4 個被擋下來：每個分類最多提名 3 個');
  await nomIn('怪'); await nomIn('１２３');
  ok(await p.evaluate(() => window.__FS['mg_config/nw_vote'].noms.filter(n => n.text === '怪' || n.text === '１２３').length) === 0, '只有 1 個字、或只有數字的提名會被擋下');
  await nomIn('火焰，雞！');
  ok(await p.evaluate(() => window.__FS['mg_config/nw_vote'].noms.filter(n => n.cat === 'monster' && n.text.includes('火焰')).length) === 1, '標點、空白不同的同一個名字，算重複');
  ok((await p.textContent('#nw-quota')).includes('3/3'), '畫面寫出這一類已提名幾個、已投幾票');
  const myVotes = () => p.evaluate(() => { const d = window.__FS['mg_config/nw_vote']; return d.noms.filter(n => n.cat === 'monster' && (d.v || {})[n.id] && d.v[n.id]['五年級3班_8號']).length; });
  const clickVote = async () => { await p.evaluate(() => { const b = document.querySelector('#nw-list-monster .nw-vote:not(.done)'); if (b) b.click(); }); await p.waitForTimeout(250); };
  await clickVote(); await clickVote(); await clickVote();
  ok(await myVotes() === 3, '這個分類投到 3 票');
  await clickVote();
  ok(await myVotes() === 3, '第 4 票被擋下來：每個分類最多投 3 票');
  await p.evaluate(() => document.querySelector('#nw-list-monster .nw-vote.done').click()); await p.waitForTimeout(250);
  ok(await myVotes() === 2, '點「✓ 已投票」可以收回一票');
  await clickVote();
  ok(await myVotes() === 3, '收回以後又可以投別的');

  // 7. 老師隱藏
  await p.click('.nwp-cat[data-cat="region"]'); await p.waitForTimeout(100);
  ok((await p.$$('.nw-hide')).length === 0, '一般學生看不到隱藏按鈕');
  await p.click('#nw-admin'); await p.fill('#nw-admin-pw', 'wrong'); await p.click('#nw-admin-ok');
  ok((await p.$$('.nw-hide')).length === 0, '密碼錯誤不能管理');
  await p.fill('#nw-admin-pw', 'teacher'); await p.click('#nw-admin-ok'); await p.waitForTimeout(200);
  await p.click('#nw-list-region .nw-hide'); await p.waitForTimeout(300);
  ok((await p.evaluate(() => window.__FS['mg_config/nw_vote'].hidden.length)) === 1, '老師隱藏寫進 hidden');
  await p.click('#nw-admin'); await p.waitForTimeout(200);
  ok(!(await p.textContent('#nw-list-region')).includes('糖果王國'), '隱藏後學生看不到');
  await p.click('#nw-admin'); await p.fill('#nw-admin-pw', 'teacher'); await p.click('#nw-admin-ok');
  await p.click('#nw-list-region .nw-hide'); await p.waitForTimeout(300);
  ok((await p.evaluate(() => window.__FS['mg_config/nw_vote'].hidden.length)) === 0, '恢復後 hidden 清空');

  // 7b. 老師清空所有投票
  await p.click('#nw-clear'); await p.waitForTimeout(300);
  doc = await p.evaluate(() => window.__FS['mg_config/nw_vote']);
  ok(Object.keys(doc.v || {}).length === 0 && doc.noms.length >= 14, '老師按「清空所有投票」：票數歸零，提名都還在');
  // 7c. 老師刪提名：單一則、整個分類
  await p.click('.nwp-cat[data-cat="region"]'); await p.waitForTimeout(100);
  await p.click('#nw-list-region .nw-del'); await p.waitForTimeout(300);
  doc = await p.evaluate(() => window.__FS['mg_config/nw_vote']);
  ok(!doc.noms.some(n => n.text === '糖果王國') && !Object.keys(doc.v || {}).some(id => !doc.noms.some(n => n.id === id)), '老師按「刪除」：這則提名與它的票一起刪掉');
  await p.click('.nwp-cat[data-cat="monster"]'); await p.waitForTimeout(100);
  await p.click('#nw-clearcat'); await p.waitForTimeout(300);
  doc = await p.evaluate(() => window.__FS['mg_config/nw_vote']);
  ok(doc.noms.filter(n => n.cat === 'monster').length === 0 && (await p.textContent('#nw-list-monster')).includes('還沒有人提名'), '老師按「刪除這一類全部提名」：整個分類清空');
  await p.click('#nw-admin'); await p.waitForTimeout(200);
  ok((await p.$$('.nw-del')).length === 0 && (await p.$$('#nw-clearcat')).length === 0, '一般學生看不到刪除按鈕');

  // 8. 排序切換
  await p.click('#nw-sort'); ok((await p.textContent('#nw-sort')).includes('最新'), '排序可切換');
  await p.screenshot({ path: OUT + '/nw-vote.png' });

  // 9. 手機寬度：每一頁也不捲動
  await p.setViewportSize({ width: 390, height: 780 }); await p.waitForTimeout(300);
  let mobFit = true;
  await goPage('story');
  for (let i = 0; i < total; i++) { if (!(await noScroll())) { mobFit = false; console.log('  手機第', i + 1, '頁超出'); } if (i < total - 1) await p.click('#nwp-next'); }
  ok(mobFit, '手機寬度：每一頁都在一個畫面內，沒有橫向或直向捲動');
  await p.screenshot({ path: OUT + '/nw-vote-mobile.png' });

  ok(errs.length === 0, '沒有 JS 錯誤 ' + errs.join(' | '));
  await b.close(); process.exit(fails ? 1 : 0);
})();
