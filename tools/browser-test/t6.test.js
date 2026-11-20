/* 教師頁「⚙ 設定」的「📊 匯出打字速度（匿名）」（開 __RULES，資料全是假的）。
   重點是去識別化：下載檔的整串文字裡不能出現任何姓名、暱稱、班級名稱、docId。
   純函式（年級合併、百分位數、缺欄位）直接在 node 測，不經瀏覽器；load-real.mjs 用假匯出檔跑。 */
const { chromium } = require('playwright'); const fs = require('fs');
const path = require('path'); const { pathToFileURL } = require('url'); const { execFileSync } = require('child_process');
const M = path.join(__dirname, 'mock') + '/'; const OUT = process.argv[2] || require('os').tmpdir();
const ROOT = path.join(__dirname, '../..');
const css = require('./tw.js')(OUT);
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const NOW = Date.now();

const route = p => p.route('**/*', r => {
  const u = r.request().url();
  if (u.startsWith('http://localhost')) return r.continue();
  if (u.includes('cdn.tailwindcss.com')) return r.fulfill({ contentType: 'application/javascript', body: `const s=document.createElement('style');s.textContent=${JSON.stringify(css)};document.head.appendChild(s);` });
  const m = u.includes('firebase-app') ? 'app.js' : u.includes('firebase-auth') ? 'auth.js' : u.includes('firebase-firestore') ? 'fs.js' : null;
  if (m) return r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(M + m, 'utf8') });
  return r.abort();
});
async function teacher(browser, seed, o = {}) {
  const p = await browser.newPage({ viewport: o.mobile ? { width: 390, height: 800 } : { width: 1280, height: 900 }, acceptDownloads: true });
  const errs = []; p.errs = errs;
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|Missing or insufficient|permission/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.addInitScript(a => { window.__FS = a.s; window.__RULES = true; localStorage.clear(); window.__ADMIN_PRESIGNED = { uid: 'T1', email: 'teacher@example.test' }; }, { s: seed });
  await route(p);
  await p.goto('http://localhost:8765/teacher.html');
  await p.waitForSelector('#app:not(.hidden)', { timeout: 8000 }).catch(e => { console.log('載入失敗', errs); throw e; }); await ready(p);
  return p;
}
const ready = p => p.waitForFunction(() => { const m = document.querySelector('#main'); return m && m.textContent && !m.textContent.includes('讀取中…') && m.children.length > 0; }, null, { timeout: 8000 }).then(() => p.waitForTimeout(150));
const tab = async (p, id) => { await p.click(`#nav [data-tab="${id}"]`); await p.waitForTimeout(120); await ready(p); };
const modalOpen = p => p.evaluate(() => document.querySelectorAll('[data-modal]').length);
const clickModal = (p, id) => p.evaluate(id => { const ms = document.querySelectorAll('[data-modal]'); ms[ms.length - 1].querySelector(`[data-btn="${id}"]`).click(); }, id);
const modalText = p => p.evaluate(() => { const ms = document.querySelectorAll('[data-modal]'); return ms.length ? ms[ms.length - 1].textContent.replace(/\s+/g, ' ') : ''; });
const noErr = (p, m = '沒有 JS 錯誤') => ok(p.errs.length === 0, m + ' ' + p.errs.join(' | '));
const T = (p, sel) => p.textContent(sel).then(t => t.replace(/\s+/g, ' ').trim());
const logs = p => p.evaluate(() => Object.entries(window.__FS).filter(e => e[0].startsWith('mg_admin_log/')).map(e => e[1]));
/* 按下載 → 確認視窗 → 按「下載」，回 { name, text(原始位元組), bytes } */
async function download(p, kind) {
  const dl = p.waitForEvent('download', { timeout: 5000 });
  await p.click(`[data-sx="${kind}"]`); await p.waitForSelector('[data-modal]');
  await clickModal(p, 'ok');
  const d = await dl, chunks = [];
  for await (const c of await d.createReadStream()) chunks.push(c);
  const bytes = Buffer.concat(chunks);
  return { name: d.suggestedFilename(), bytes, text: bytes.toString('utf8') };
}

/* ── 假資料。姓名／暱稱都是一眼看得出是假的，才能逐一確認不在檔案裡 ── */
const NAMES = [];
const stu = (cls, seat, name, raw = {}, nw) => {
  NAMES.push(name);
  return [`mg_scores/${cls}_${seat}號`, Object.assign({ className: cls, seat, name, nwNick: '勇敢的' + name + '蛙', lastPlayedAt: { __ts: NOW } }, raw,
    nw ? { nw: Object.assign({ v: 1, savedAt: NOW, starter: 'dagger', name0: name, nick: ['a_x', 'b_y'], nameSet: 1 }, nw) } : {})];
};
const C53 = '五年級3班', C54 = '五年級4班', C42 = '四年級2班', C61 = '六年級1班', CX = '特教班';
/* 五年級 10 人：bestWpm 10,12,…,28（甲～癸），其中「己」沒有 bestAcc；acc 80+序號 */
const W5 = [10, 12, 14, 16, 18, 20, 22, 24, 26, 28];
const NM5 = ['測試甲', '測試乙', '測試丙', '測試丁', '測試戊', '測試己', '測試庚', '測試辛', '測試壬', '測試癸'];
const ACC5 = W5.map((w, i) => i === 5 ? undefined : 80 + i);
const grade5 = () => W5.map((w, i) => {
  const cls = i < 6 ? C53 : C54, seat = i < 6 ? i + 1 : i - 5;
  const raw = { bestWpm: w, lastWpm: w - 2, tier: 'B', plays: 5 + i, bestLevel: 3, bestScore: 20 + i, lastWeapon: i % 2 ? 'bow' : 'staff', byWeapon: { staff: 100 + i, bow: 0 } };
  if (ACC5[i] !== undefined) { raw.bestAcc = ACC5[i]; raw.lastAcc = ACC5[i] - 1; }
  const nw = i < 4 ? { hr: 3 + i, hunts: 10 + i, stat: { wins: 8, fails: 2, accN: 4, accSum: 380, dodgeOk: 9, dodgeAll: 12, defOk: 3, defAll: 5 }, dex: { frog: 3, coo: 0, wolf: 1 }, fastest: { 'grass:1': 23.4 + i }, fastMk: { 'frog:1': 20.1 }, used: { staff: 1, bow: 1 }, wwin: { staff: 5 } } : undefined;
  return stu(cls, seat, NM5[i], raw, nw);
});
const grade4 = () => [5, 6, 7, 8, 9].map((w, i) => stu(C42, i + 1, '測試四' + i, { bestWpm: w, lastWpm: w, bestAcc: 90 + i, tier: 'A' }));
const grade6 = () => [stu(C61, 1, '測試六甲', { bestWpm: 30, bestAcc: 95 }), stu(C61, 2, '測試六乙', { bestWpm: 40, bestAcc: 96 })];
const seed = () => Object.fromEntries([
  ['mg_admins/T1', { ok: true }],
  ...grade5(), ...grade4(), ...grade6(),
  stu(CX, 1, '測試特', { bestWpm: 50, bestAcc: 99 }),
  stu(C53, 20, '測試空', {})   // 什麼成績都沒有：不算人數
]);
const leakStrings = () => [...NAMES, ...NAMES.map(n => '勇敢的' + n + '蛙'), C53, C54, C42, C61, CX, '3班', '4班', '503', 'mg_scores', 'docId', 'nwNick', 'className', 'seat', 'name0', 'nick'];
/* 「_5號」是 docId 的長相；單獨的「號」不能擋，因為說明文字有「編號」 */
const leaks = text => leakStrings().filter(s => text.includes(s)).concat(/_\d+號/.test(text) ? ['docId 樣式'] : []);

(async () => {
  /* ── 純函式（node 直接 import，不經瀏覽器）── */
  const X = await import(pathToFileURL(path.join(ROOT, 'teacher/export-speed.js')).href);
  const rowsOf = list => list.map(([id, d]) => ({ id, className: d.className, seat: d.seat, name: d.name, played: !!d.nw, raw: d, nw: d.nw ? Object.assign({ stat: {} }, d.nw) : null }));
  const S = rowsOf(Object.entries(seed()).filter(e => e[0].startsWith('mg_scores/')).map(([k, v]) => [k.slice(10), v]));
  {
    ok(X.gradeOf('五年級3班') === '五' && X.gradeOf('四年級2班') === '四' && X.gradeOf('六年級1班') === '六' && X.gradeOf('特教班') === '?' && X.gradeOf('') === '?' && X.gradeOf(undefined) === '?' && X.gradeOf('5年級2班') === '五', '年級取自班級名稱，取不到是 ?');
    const e = X.buildSpeedExport(S, { date: new Date(2026, 10, 19), appVersion: '9.9.9' });
    ok(e.rows.length === 18, `匯出 18 人（19 筆裡有 1 筆完全沒成績略過）：${e.rows.length}`);
    const cnt = {}; e.rows.forEach(r => { cnt[r.grade] = (cnt[r.grade] || 0) + 1; });
    ok(cnt['五'] === 10 && cnt['四'] === 5 && cnt['?'] === 3 && !cnt['六'], '六年級只有 2 人 → 合併成 ?，加上特教班 1 人共 3 人：' + JSON.stringify(cnt));
    ok(e.meta.exportedAt === '2026-11-19' && e.meta.appVersion === '9.9.9' && e.meta.note.includes('已去識別化') && e.meta.fields.bestWpm && e.meta.fields.byWeapon.includes('傷害'), 'meta：日期、版本、欄位說明、去識別化提醒');
    const g5 = e.summary.grades['五'];
    ok(g5.n === 10 && g5.bestWpm.n === 10 && g5.bestWpm.mean === 19 && g5.bestWpm.median === 19 && g5.bestWpm.p10 === 11.8 && g5.bestWpm.p25 === 14.5 && g5.bestWpm.p75 === 23.5 && g5.bestWpm.p90 === 26.2, '五年級 bestWpm 平均／中位／P10／P25／P75／P90 = 19／19／11.8／14.5／23.5／26.2：' + JSON.stringify(g5.bestWpm));
    /* bestAcc：缺一人 → n=9，值 80,81,82,83,84,86,87,88,89 */
    ok(g5.bestAcc.n === 9 && g5.bestAcc.mean === 84.44 && g5.bestAcc.median === 84 && g5.bestAcc.p10 === 80.8 && g5.bestAcc.p90 === 88.2, '缺 bestAcc 的人不算進正確率（n=9，不是當 0）：' + JSON.stringify(g5.bestAcc));
    ok(e.summary.grades['?'].n === 3 && e.summary.grades['?'].bestWpm.median === 40, '? 組 3 人有列（≥3）：中位 40');
    ok(!e.summary.grades['六'] && e.summary.all.n === 18, '摘要沒有單獨列六年級；全體 18 人');
    const allW = [...W5, 5, 6, 7, 8, 9, 30, 40, 50].sort((a, b) => a - b);
    ok(e.summary.all.bestWpm.n === 18 && e.summary.all.bestWpm.median === (allW[8] + allW[9]) / 2 && e.summary.all.bestWpm.p90 === Math.round((allW[15] + (allW[16] - allW[15]) * .3) * 100) / 100, '全體中位數與 P90 對得上獨立算的值');
    ok(X.stats([]).n === 0 && X.stats([7]).median === 7 && X.stats([7]).p10 === 7 && X.stats([1, 'x', NaN, undefined, 3]).mean === 2, 'stats：空、單一值、非數字忽略');
    /* 人少的年級 + ? 少於 3 人：? 不單獨列，但個別列還在 */
    const small = X.buildSpeedExport(S.filter(s => s.raw.className === C42 || s.raw.className === C61), {});
    ok(small.rows.filter(r => r.grade === '?').length === 2 && !small.summary.grades['?'] && small.summary.grades['四'].n === 5, '? 只有 2 人：摘要不列，個別列照常匯出');
    /* 每個年級都不足 5 人 → 全部變 ? */
    const tiny = X.buildSpeedExport(S.filter(s => s.raw.className === C61 || s.raw.className === CX), {});
    ok(tiny.rows.every(r => r.grade === '?') && tiny.rows.length === 3, '全部年級都不足 5 人 → 全部 ?');
    /* 欄位缺漏 */
    const odd = X.buildSpeedExport([
      { id: 'x1', className: C53, raw: { bestWpm: 'abc', lastWpm: null, bestAcc: NaN, tier: 'Z', lastWeapon: '王小明@gmail.com', byWeapon: { 王小明: 5, staff: 'x', bow: 3 }, plays: 4 } },
      { id: 'x2', className: C53, raw: undefined }, { id: 'x3', className: C53 }, null, undefined, { id: 'x4', raw: {} },
      { id: 'x5', className: C53, raw: { bestWpm: 22 }, played: true, nw: { hr: 2, stat: undefined, dex: { frog: 0 }, fastest: { '怪:1': 5, 'grass:1': 'x' }, used: null } }
    ], {});
    const r1 = odd.rows.find(r => r.plays === 4), r5 = odd.rows.find(r => r.bestWpm === 22);
    ok(odd.rows.length === 2 && r1 && !('bestWpm' in r1) && !('tier' in r1) && !('lastWeapon' in r1) && JSON.stringify(r1.byWeapon) === '{"bow":3}', '壞掉／缺漏欄位：亂字串、非數字、非白名單的鍵全部省略，不會丟錯：' + JSON.stringify(r1));
    ok(r5.nw && r5.nw.hr === 2 && !r5.nw.dex && !r5.nw.fastest && !r5.nw.used, 'nw 欄位缺漏、dex 只有 0 次、非法鍵全部省略');
    ok(!JSON.stringify(odd).includes('王小明'), '武器／byWeapon 的字串不是白名單格式就不輸出，不會從這裡漏名字');
    const empty = X.buildSpeedExport([], {});
    ok(empty.rows.length === 0 && empty.summary.all.n === 0 && empty.summary.all.bestWpm.n === 0, '空陣列不壞');
    /* 隨機編號與順序 */
    const e2 = X.buildSpeedExport(S, {}), ids1 = e.rows.map(r => r.id), ids2 = e2.rows.map(r => r.id);
    ok(new Set(ids1).size === 18 && ids1.every(i => /^[A-Z2-9]{8}$/.test(i)) && ids1.filter(i => ids2.includes(i)).length === 0, '編號 8 碼、彼此不重複、兩次匯出沒有重疊');
    const fiveOrder = e.rows.filter(r => r.grade === '五').map(r => r.bestWpm), fiveOrder2 = e2.rows.filter(r => r.grade === '五').map(r => r.bestWpm);
    ok(JSON.stringify(fiveOrder) !== JSON.stringify(W5) || JSON.stringify(fiveOrder2) !== JSON.stringify(W5), '同年級的列順序被洗過，不是照座號排');
    ok(e.rows.every(r => typeof r.id === 'string' && r.id.length === 8), '每一列都有 id');
    ok(leaks(JSON.stringify(e)).length === 0, '整份匯出的字串裡沒有任何姓名／班級／docId／暱稱：' + leaks(JSON.stringify(e)));
    /* CSV 跳脫 */
    ok(X.csvCell('a,b') === '"a,b"' && X.csvCell('say "hi"') === '"say ""hi"""' && X.csvCell('l1\nl2') === '"l1\nl2"' && X.csvCell(undefined) === '' && X.csvCell(0) === '0' && X.csvCell('四') === '四', 'csvCell：逗號、引號、換行跳脫，0 不被吃掉');
    const csvE = { rows: [{ id: 'A', grade: '五', bestWpm: 1, lastWeapon: 'a,b"c' }, { id: 'B', grade: '?', byWeapon: { staff: 5 } }] };
    const lines = X.toCsv(csvE).split('\r\n');
    ok(lines[1].includes('"a,b""c"') && lines[0].includes('byWeapon.staff') && lines[2].endsWith('5') && lines[1].split(',').length > 3, 'toCsv：值含逗號與引號時整格加引號、動態欄位（byWeapon.staff）進表頭');
  }

  const browser = await chromium.launch();
  /* ── 介面：預覽、確認、下載、紀錄 ── */
  {
    const p = await teacher(browser, seed());
    await tab(p, 'settings');
    ok((await T(p, '[data-speedexp]')).includes('給遊戲平衡用。檔案裡沒有姓名、座號和班級，只有年級和隨機編號。'), '區塊說明文字');
    ok((await p.$$eval('h3', hs => hs.map(h => h.textContent))).includes('📊 匯出打字速度（匿名）'), '區塊標題');
    const btn = await p.$$eval('[data-sx]', bs => bs.map(b => b.textContent));
    ok(btn.length === 2 && btn[0] === '下載 JSON' && btn[1].startsWith('下載 CSV（Excel 看得懂，含 BOM）'), '兩顆按鈕：' + btn);
    ok((await T(p, '[data-sx-total]')).includes('18 人') && (await T(p, '[data-sx-total]')).includes('1 人完全沒有成績'), '預覽：人數 18、略過 1 人');
    const gr = await T(p, '[data-sx-grades]');
    ok(gr.includes('四年級 5 人') && gr.includes('五年級 10 人') && gr.includes('年級不明／人數少 3 人') && !gr.includes('六年級 '), '預覽：各年級人數（六年級已併入不明）：' + gr);
    const cols = await T(p, '[data-sx-cols]');
    ok(['id', 'grade', 'bestWpm', 'lastWpm', 'bestAcc', 'tier', 'lastWeapon', 'byWeapon', 'nw'].every(c => cols.includes(c)), '預覽：欄位清單 ' + cols);
    const sample = await p.$eval('[data-sx-sample]', e => e.textContent.trim().split('\n'));
    ok(sample.length === 3 && sample.every(l => /"id":"[A-Z2-9]{8}"/.test(l)), '預覽：前 3 列範例，帶隨機編號');
    const pageLeak = leaks(await p.$eval('[data-speedexp]', e => e.textContent));
    ok(pageLeak.length === 0, '預覽區塊裡沒有姓名／班級：' + pageLeak);

    /* 取消 → 不下載、不寫紀錄 */
    let got = 0; p.on('download', () => got++);
    await p.click('[data-sx="json"]'); await p.waitForSelector('[data-modal]');
    const mt = await modalText(p);
    ok(mt.includes('只傳給你信任的人') && mt.includes('不要放進公開的地方'), '確認視窗提醒只傳給信任的人：' + mt);
    await clickModal(p, 'no'); await p.waitForTimeout(400);
    ok(got === 0 && (await logs(p)).filter(l => l.act === 'export').length === 0 && await modalOpen(p) === 0, '按取消：沒下載、沒寫紀錄');
    p.removeAllListeners('download');

    /* JSON */
    const j1 = await download(p, 'json');
    ok(/^typehero-speed-\d{8}\.json$/.test(j1.name), '檔名 typehero-speed-YYYYMMDD.json：' + j1.name);
    const stamp = (d => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`)(new Date());
    ok(j1.name === `typehero-speed-${stamp}.json`, '日期是今天');
    const J1 = JSON.parse(j1.text);
    ok(J1.rows.length === 18 && J1.meta.rows === 18 && /^\d{4}-\d{2}-\d{2}$/.test(J1.meta.exportedAt) && J1.meta.appVersion && J1.meta.appVersion !== '?', 'JSON 結構與版本號（從 index.html 讀到）：' + J1.meta.appVersion);
    const lk = leaks(j1.text);
    ok(lk.length === 0, '下載的 JSON 全文沒有任何姓名／暱稱／班級名稱／docId／座號欄位：' + lk);
    ok(J1.rows.every(r => Object.keys(r).every(k => ['id', 'grade', 'bestWpm', 'lastWpm', 'bestAcc', 'lastAcc', 'tier', 'plays', 'bestLevel', 'bestScore', 'lastWeapon', 'byWeapon', 'nw'].includes(k))), '每一列只有白名單欄位');
    const nwRow = J1.rows.find(r => r.nw && r.nw.hr === 3);
    ok(nwRow && nwRow.nw.hunts === 10 && nwRow.nw.wins === 8 && nwRow.nw.fails === 2 && nwRow.nw.accN === 4 && nwRow.nw.accSum === 380 && nwRow.nw.dodgeOk === 9 && nwRow.nw.dodgeAll === 12 && nwRow.nw.defOk === 3 && nwRow.nw.defAll === 5
      && nwRow.nw.fastest['grass:1'] === 23.4 && nwRow.nw.fastMk['frog:1'] === 20.1 && nwRow.nw.dex.frog === 3 && nwRow.nw.dex.wolf === 1 && !('coo' in nwRow.nw.dex) && nwRow.nw.used.staff === 1 && nwRow.nw.wwin.staff === 5, '新世界欄位完整（dex 只留打倒過的）：' + JSON.stringify(nwRow));
    ok(J1.rows.filter(r => r.nw).length === 4 && J1.rows.filter(r => !r.nw).length === 14, '沒玩過新世界的人沒有 nw 欄位');
    ok(J1.summary.grades['五'].bestWpm.median === 19, '下載檔的摘要與純函式一致');
    /* 操作紀錄 */
    await p.waitForTimeout(300);
    const L = (await logs(p)).filter(l => l.act === 'export');
    ok(L.length === 1 && L[0].target === 'speed' && L[0].summary === '匯出打字速度（匿名）18 人' && leaks(JSON.stringify(L[0])).length === 0, '操作紀錄：export／speed／人數，沒有內容：' + JSON.stringify(L));
    ok((await T(p, '[data-logtable]')).includes('匯出打字速度（匿名）18 人'), '設定頁的操作紀錄表立刻看得到');

    /* 第二次匯出：編號不同 */
    const j2 = await download(p, 'json'), J2 = JSON.parse(j2.text);
    const s1 = new Set(J1.rows.map(r => r.id)), same = J2.rows.filter(r => s1.has(r.id)).length;
    ok(same === 0 && J2.rows.length === 18, `第二次匯出隨機編號全部不同（重複 ${same}）`);
    ok(leaks(j2.text).length === 0, '第二次一樣乾淨');

    /* CSV */
    const c = await download(p, 'csv');
    ok(/^typehero-speed-\d{8}\.csv$/.test(c.name), 'CSV 檔名：' + c.name);
    ok(c.bytes[0] === 0xEF && c.bytes[1] === 0xBB && c.bytes[2] === 0xBF, 'CSV 開頭有 UTF-8 BOM（EF BB BF）');
    const cl = c.text.replace(/^﻿/, '').split('\r\n').filter(Boolean), head = cl[0].split(',');
    ok(cl.length === 19 && head[0] === 'id' && head[1] === 'grade' && head.includes('bestWpm') && head.includes('nw.hr') && head.includes('nw.dex.frog') && head.includes('nw.fastest.grass:1') && head.includes('byWeapon.staff'), 'CSV：19 行（表頭＋18 人），欄位名稱：' + head.slice(0, 12));
    ok(cl.slice(1).every(l => l.split(',').length === head.length), '每一行欄數一致');
    const grades = cl.slice(1).map(l => l.split(',')[1]);
    ok(grades.filter(g => g === '五').length === 10 && grades.filter(g => g === '四').length === 5 && grades.filter(g => g === '?').length === 3, 'CSV 的中文年級沒有亂碼（用 UTF-8 讀回來是「五」「四」）');
    ok(leaks(c.text).length === 0, 'CSV 全文沒有姓名／班級／docId：' + leaks(c.text));
    ok((await logs(p)).filter(l => l.act === 'export').length === 3, '三次匯出三筆紀錄');
    noErr(p); await p.close();
  }
  /* ── 沒有資料：友善提示、按鈕停用 ── */
  for (const [label, sd] of [['完全沒有學生', { 'mg_admins/T1': { ok: true } }], ['學生都沒有成績', { 'mg_admins/T1': { ok: true }, ...Object.fromEntries([stu(C53, 1, '測試空一', {}), stu(C53, 2, '測試空二', {})]) }]]) {
    const p = await teacher(browser, sd); await tab(p, 'settings');
    const t = await T(p, '[data-sx-empty]').catch(() => '');
    ok(t.includes('還沒有學生的打字成績') && await p.$('[data-sx]') === null && await p.$$eval('[data-speedexp] button', bs => bs.length === 2 && bs.every(b => b.disabled)), `${label}：友善提示，按鈕停用`);
    noErr(p); await p.close();
  }
  /* ── 手機 390 ── */
  {
    const p = await teacher(browser, seed(), { mobile: true }); await tab(p, 'settings');
    const m = await p.evaluate(() => {
      const box = document.querySelector('[data-speedexp]').getBoundingClientRect();
      return { sw: document.documentElement.scrollWidth, iw: innerWidth, bw: document.body.scrollWidth, r: box.right, btnR: Math.max(...[...document.querySelectorAll('[data-sx]')].map(b => b.getBoundingClientRect().right)) };
    });
    ok(m.sw <= m.iw && m.bw <= m.iw && m.r <= m.iw + 1 && m.btnR <= m.iw, `手機 390：不橫向捲動、按鈕在畫面內（${JSON.stringify(m)}）`);
    await p.click('[data-sx="csv"]'); await p.waitForSelector('[data-modal]');
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth) && await p.evaluate(() => { const r = document.querySelector('.mdl>.px-panel').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; }), '手機：確認視窗放得下');
    await clickModal(p, 'no'); noErr(p); await p.close();
  }
  await browser.close();

  /* ── load-real.mjs：用假匯出檔跑，再丟給 run.mjs 確認格式吃得進 ── */
  {
    const X2 = await import(pathToFileURL(path.join(ROOT, 'teacher/export-speed.js')).href);
    const dir = fs.mkdtempSync(path.join(OUT, 't6-real-')), fx = path.join(dir, 'speed.json'), outp = path.join(dir, 'profiles.json');
    const exp = X2.buildSpeedExport(S, {});
    exp.rows.push({ id: 'ZZZZZZZZ', grade: '五', lastWpm: 15 }, { id: 'YYYYYYYY', grade: '五', plays: 3 });   // 只有 lastWpm、完全沒速度
    fs.writeFileSync(fx, JSON.stringify(exp));
    const node = process.execPath, tool = path.join(ROOT, 'tools/nw-sim/load-real.mjs');
    const o1 = execFileSync(node, [tool, fx, '--out', outp], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const P = JSON.parse(fs.readFileSync(outp, 'utf8'));
    ok(Array.isArray(P) && P.length === 18 + 1, `load-real：轉出 ${P.length} 人（18 人＋只有 lastWpm 的 1 人；年級不明的 3 人預設保留、年級寫 '?'；沒速度的略過）`);
    ok(P.filter(x => x.grade === '?').length === 3 && P.every(x => ['四年級', '五年級', '?'].includes(x.grade)), "年級不明的 3 人保留，年級是 '?'");
    const MUST = ['grade', 'wpm', 'acc', 'tier', 'weapon'], MAY = ['tierKnown', 'accLast', 'lastWpm', 'plays', 'nw'];
    const NW_MAY = ['hr', 'hunts', 'wins', 'fails', 'fastest', 'fastMk', 'dex', 'wwin', 'dodgeOk', 'dodgeAll', 'defOk', 'defAll'];
    const IDENT = /^(id|rid|docId|name|nick|nickname|seat|className|class|uid|email)$/i;
    const hasIdKey = v => v && typeof v === 'object' && Object.entries(v).some(([k, x]) => IDENT.test(k) || hasIdKey(x));
    ok(P.every(x => ['四年級', '五年級', '?'].includes(x.grade) && x.wpm > 0 && x.acc >= 0 && ['A', 'B', 'C', 'D'].includes(x.tier) && ['staff', 'bow', 'dagger', 'crossbow'].includes(x.weapon)
      && MUST.every(k => k in x) && Object.keys(x).every(k => MUST.includes(k) || MAY.includes(k)) && !hasIdKey(x)
      && (!x.nw || Object.keys(x.nw).every(k => NW_MAY.includes(k)))), '每筆必有 grade／wpm／acc／tier／weapon，只可多 tierKnown／accLast／lastWpm／plays／nw；沒有 id、姓名、座號、班級、docId、暱稱、rid（nw 內也沒有）');
    ok(hasIdKey({ nw: { id: 1 } }) && !hasIdKey({ nw: { hr: 1, fastest: { 'grass:1': 50 } } }), '身分欄位檢查自己抓得到 id、放得過 nw 的正常欄位');
    ok(P.every(x => typeof x.tierKnown === 'boolean'), 'tierKnown 一定有，分得出「真的 B」與「補的 B」');
    ok(P.filter(x => x.grade === '五年級').some(x => x.wpm === 15 && x.acc === 97), '只有 lastWpm 的人用 lastWpm，沒有正確率用 97');
    ok(leaks(JSON.stringify(P)).length === 0, 'profiles.json 也沒有任何身分字串');
    const o2 = execFileSync(node, [tool, fx, '--unknown-as', '五年級'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    ok(JSON.parse(o2).length === 19 && JSON.parse(o2).filter(x => x.grade === '五年級').length === 14, '--unknown-as 五年級：年級不明的 3 人併進五年級');
    const o3 = JSON.parse(execFileSync(node, [tool, fx, '--drop-unknown'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
    ok(o3.length === 16 && o3.every(x => x.grade !== '?'), '--drop-unknown：回到舊行為，年級不明的 3 人丟掉（16 人）');
    const run = execFileSync(node, [path.join(ROOT, 'tools/nw-sim/run.mjs'), outp], { encoding: 'utf8', timeout: 120000 });
    ok(/四年級（5 人）/.test(run) && /五年級（\d+ 人）/.test(run) && /贏\s+\d+%/.test(run), 'run.mjs 吃得進轉出的檔、跑得出結果');
    let code = 0; try { execFileSync(node, [tool, path.join(dir, 'nope.json')], { stdio: 'pipe' }); } catch (e) { code = e.status; }
    ok(code !== 0, '檔案不存在時回非 0，不假裝成功');
    fs.rmSync(dir, { recursive: true, force: true });
  }
  /* 真實資料不進版控 */
  ok(/^\/data-private\/$/m.test(fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8')), '.gitignore 有 /data-private/');
  console.log(fails ? `\n${fails} FAIL` : '\n全部通過');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
