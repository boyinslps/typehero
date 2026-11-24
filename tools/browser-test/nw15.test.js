/* 2b-9 每場紀錄 mg_nw_runs 與可疑偵測（docs/SPEC-STAGE2.md §2.5、§2.6、§5 的 2b-9；編號 nw15）。
   開 window.__RULES：學生端寫入走簡化版規則（欄位白名單、ts 要是伺服器時間、ID＝文件ID_毫秒、不能讀不能改）。
   純函式（susCheck、qBand）直接在 node 測；真的打一場 ↔ 用 NWG.finishHunt 餵假結果；離線用 window.__FAIL_WRITES。 */
const { chromium } = require('playwright'); const fs = require('fs');
const path = require('path'); const M = path.join(__dirname, 'mock') + '/'; const OUT = process.argv[2] || require('os').tmpdir();
const css = require('./tw.js')(OUT);
const NOTICE_ID = /export const NOTICES = \[\s*\{ id: '([^']+)'/.exec(fs.readFileSync(path.join(__dirname, '../../nw-data.js'), 'utf8'))[1];
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const ID = '五年級3班_5號', CLS = '五年級3班';

async function open(browser, o = {}) {
  const p = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const errs = []; p.on('dialog', d => d.accept());
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  const { sha256Hex } = await import('../../nw-access.js');
  const hash = await sha256Hex('Test-Pass_9!x');
  const seed = { ['mg_scores/' + ID]: { className: CLS, seat: 5, name: '小明', bestLevel: 10, bestScore: 20, scoreVer: 2, plays: 9, tutorialDone: true, talentIntroDone: true, tier: 'B', balanceVer: 3, punctDone: true,
    nw: Object.assign({ v: 1, savedAt: 5, look: { style: 1, hair: 2, skin: 1 }, starter: 'dagger', hunts: 5, quest: { done: ['1-0', '1-0a'] }, tm: { m_dodge: 1, m_defend: 1, m_attack: 1 }, intro: { hub: 1, notice: 1 }, seenNotice: NOTICE_ID, nameSet: 1 }, o.nw || {}) } };
  await p.addInitScript(a => {
    window.__FS = a.s; window.__RULES = true; localStorage.clear(); localStorage.setItem('mg_nw_fast', '1');
    window.__NW_CODE_HASH__ = a.hash; localStorage.setItem('mg_nw_code', a.hash); window.__NW_NOGIFT__ = true; window.__NW_NOINTRO__ = true;
    window.confetti = () => {}; window.html2canvas = async () => document.createElement('canvas');
    if (a.stages) window.__NW_STAGES__ = a.stages;
  }, { s: seed, hash, stages: o.stages === undefined ? ['1', '2b'] : o.stages });
  await p.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('http://localhost')) return r.continue();
    if (u.includes('cdn.tailwindcss.com')) return r.fulfill({ contentType: 'application/javascript', body: `const s=document.createElement('style');s.textContent=${JSON.stringify(css)};document.head.appendChild(s);` });
    const m = u.includes('firebase-app') ? 'app.js' : u.includes('firebase-auth') ? 'auth.js' : u.includes('firebase-firestore') ? 'fs.js' : null;
    if (m) return r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(M + m, 'utf8') });
    return r.abort();
  });
  await p.goto('http://localhost:8765/index.html'); await p.waitForFunction(() => window.__NWG, null, { timeout: 15000 }); await p.waitForTimeout(500);
  await p.selectOption('#in-grade', '五年級'); await p.selectOption('#in-class', '3班'); await p.fill('#in-seat', '5'); await p.waitForTimeout(900);
  await p.click('#btn-enter'); await p.waitForTimeout(1000);
  p.errs = errs;
  await p.click('#nw-door'); await p.waitForFunction(() => window.__NWV, null, { timeout: 12000 }); await p.waitForTimeout(500);
  return p;
}
/* 假的一場：q 的每題都是 [字數, 按鍵, 毫秒, 打對幾字] */
const fakeRes = (o = {}) => {
  const q = o.q || Array.from({ length: 12 }, () => [2, 5, 2400, 2]);
  const cor = q.reduce((a, x) => a + x[3], 0), act = Math.round(q.reduce((a, x) => a + x[2], 0)) / 1000;
  return Object.assign({ rk: 'grass', mk: 'coo', star: 3, lv: 6, qb: '6:0', result: 'win', secs: 80, accuracy: 0.96, answered: q.length, ans: q.length, cor, typ: cor + 1, keys: q.reduce((a, x) => a + x[1], 0), nokey: 0, act, cpm: Math.round(cor / act * 600) / 10,
    dodgeOk: 0, dodgeAll: 0, defOk: 0, defAll: 0, maxCombo: 5, flags: { fast: 0, paste: 0, wrong: 1 }, tier: 'B', weapon: 'dagger', wk: 'dagger', atk: 105, pw: 40, valid: true, lvAcc: true, q }, o.over || {});
};
const runsOf = p => p.evaluate(() => Object.entries(window.__FS).filter(([k]) => k.startsWith('mg_nw_runs/')).map(([k, v]) => ({ k, v })));
const flagsOf = p => p.evaluate(() => Object.entries(window.__FS).filter(([k]) => k.startsWith('mg_nw_flags/run_')).map(([k, v]) => ({ k, v })));
const hunt = (p, res) => p.evaluate(r => { r.t0 = Date.now(); return window.__NWG.finishHunt(r) && true; }, res);

(async () => {
  const D = await import('../../nw-data.js');

  /* ── 純函式：4 種標記 ── */
  const base = () => fakeRes();
  ok(D.susCheck(base(), []).length === 0, '正常的一場：沒有標記');
  ok(D.susCheck({ ...base(), keys: 20 }, []).includes('keys') && !D.susCheck({ ...base(), keys: 0 }, []).includes('keys'), 'keys：打對的字比按鍵數÷1.5 還多 → 按鍵太少；整場 0 個按鍵不判斷');
  ok(!D.susCheck({ ...base(), cor: 10, keys: 8, q: [[2, 4, 2400, 5], [2, 4, 2400, 5]], ans: 2 }, []).includes('keys'), 'keys：整場打對不到 20 字不判斷');
  const fastQ = [[4, 8, 600, 4]]; // 4 字 0.6 秒 ＝ 6.7 字/秒
  ok(D.susCheck({ ...fakeRes({ q: fastQ }), keys: 8 }, []).includes('fast'), 'fast：一題 ≥3 字每秒超過 5 字 → 太快');
  ok(D.susCheck({ ...base(), cpm: 131 }, []).includes('fast') && !D.susCheck({ ...base(), cpm: 130 }, []).includes('fast'), 'fast：整場每分鐘超過 130 字 → 太快');
  ok(!D.susCheck({ ...fakeRes({ q: [[2, 4, 300, 2]] }), cpm: 60 }, []).includes('fast'), 'fast：2 字的題目不判斷（短題一下子就打完）');
  ok(D.susCheck({ ...base(), cor: base().cor + 3 }, []).includes('sum') && D.susCheck({ ...base(), ans: 20 }, []).includes('sum') && D.susCheck({ ...base(), secs: 20 }, []).includes('sum'), 'sum：對的字加總不符／題數不符／各題時間超過整場 → 數字對不起來');
  ok(!D.susCheck({ ...fakeRes({ q: Array.from({ length: 120 }, () => [2, 5, 100, 2]) }), ans: 130, secs: 80 }, []).includes('sum'), 'sum：超過 120 題（摘要只存前 120 題）不比題數與對的字');
  ok(D.susCheck({ ...base(), cpm: 70 }, [20, 22, 19, 21, 20]).includes('jump') && !D.susCheck({ ...base(), cpm: 70 }, [20, 22, 19, 21]).includes('jump') && !D.susCheck({ ...base(), cpm: 55 }, [20, 22, 19, 21, 20]).includes('jump'), 'jump：比自己前 5 場中位數的 3 倍還快才標記；不到 5 場不判斷');
  ok(D.qBand(1, 1) === '4:0' && D.qBand(2, 12) === '4:1' && D.qBand(3, 6) === '6:0' && D.qBand(5, 22) === '8:2' && D.qBand(5, 12) === '8:1', 'qBand：題目字數上限 × 詞庫難度（★1～2 是 4 字、★3～4 是 6 字、★5 是 8 字）');
  ok(D.RANK_MIN_ACC === 0.9 && D.SUS.cpmSane === 130, '常數：合格正確率 0.9、速度上限 130 字/分');

  const b = await chromium.launch();
  /* 2b 沒開放時不寫紀錄（規則要先貼好；開放 2b 才開始寫） */
  {
    const c = await open(b, { stages: null });
    await hunt(c, fakeRes()); await c.waitForTimeout(500);
    ok((await runsOf(c)).length === 0 && (await c.evaluate(() => window.__NWG.nw.runQ.length)) === 0 && Object.keys(await c.evaluate(() => window.__NWG.nw.cpmHist)).length === 0, '2b 沒開放（預設）：不寫 mg_nw_runs、不排佇列、不記 cpmHist');
    await c.close();
  }
  const p = await open(b);

  /* ── 一場結束寫一筆 ── */
  ok((await runsOf(p)).length === 0, '還沒打：沒有任何紀錄');
  await hunt(p, fakeRes());
  await p.waitForTimeout(500);
  let runs = await runsOf(p);
  ok(runs.length === 1 && /^五年級3班_5號_\d+$/.test(runs[0].k.split('/')[1]), `打完一場寫一筆，ID 是「文件ID_毫秒」（${runs[0] && runs[0].k}）`);
  const r0 = runs[0] && runs[0].v;
  ok(r0 && r0.id === ID && r0.cls === CLS && r0.seat === 5 && r0.uid === 'u1' && r0.v === 1 && r0.t > 0 && r0.ts && typeof r0.ts.__ts === 'number', 'id 是真正的文件 ID、班級座號、uid、ts 是伺服器時間 ' + JSON.stringify(r0 && { id: r0.id, cls: r0.cls, seat: r0.seat, uid: r0.uid, v: r0.v, t: r0.t, ts: r0.ts }));
  ok(r0 && r0.mk === 'coo' && r0.rk === 'grass' && r0.star === 3 && r0.lv === 6 && r0.qb === '6:0' && r0.res === 'win' && r0.secs === 80 && r0.acc === 0.96 && r0.ans === 12 && r0.cor === 24 && r0.w === 'dagger' && r0.atk === 105 && r0.pw === 40 && r0.tier === 'B', '紀錄內容：魔物、星級、等級、題目等級、輸贏、秒數、正確率、題數、武器、攻擊力、戰力');
  ok(r0 && Array.isArray(r0.q) && r0.q.length === 48 && r0.q.every(x => typeof x === 'number') && Array.isArray(r0.sus) && r0.sus.length === 0 && r0.fl.wrong === 1 && typeof r0.cpm === 'number' && r0.keys === 60, '每題摘要、sus 空、fl、cpm、按鍵數都有');
  ok((await flagsOf(p)).length === 0, '沒被標記：不寫 mg_nw_flags');
  ok((await p.evaluate(() => window.__NWG.nw.runQ.length)) === 0, '寫成功：佇列清空');
  ok((await p.evaluate(() => window.__NWG.nw.cpmHist['6:0'])).length === 1, 'cpmHist：記下這個題目等級的速度');
  const reads = await p.evaluate(() => (window.__READS || []).filter(r => r.path.startsWith('mg_nw_runs')).length);
  ok(reads === 0, '學生端不讀 mg_nw_runs');
  /* 輸的場也寫；沒打完（invalid）不寫 */
  await hunt(p, fakeRes({ over: { result: 'fail', secs: 150 } }));
  await hunt(p, fakeRes({ over: { valid: false } }));
  await p.waitForTimeout(500);
  runs = await runsOf(p);
  ok(runs.length === 2 && runs.some(r => r.v.res === 'fail') === true, '輸掉的場也寫；整場不算數（valid=false）的不寫');

  /* ── 被標記：寫 flag，不扣獎勵 ── */
  const coins0 = await p.evaluate(() => window.__NWG.nw.coins);
  const sus = fakeRes({ q: [[4, 8, 600, 4], ...Array.from({ length: 11 }, () => [2, 5, 2400, 2])] });
  await hunt(p, sus);
  await p.waitForTimeout(500);
  const fl = await flagsOf(p);
  ok(fl.length === 1 && fl[0].v.type === 'run' && fl[0].v.status === 'pending' && fl[0].v.docId === ID && fl[0].v.name === '小明' && fl[0].v.why.includes('fast') && fl[0].v.runId.startsWith(ID + '_') && fl[0].k === 'mg_nw_flags/run_' + fl[0].v.runId, `被標記：寫 mg_nw_flags/run_…（原因 ${fl[0] && fl[0].v.why}）`);
  ok((await p.evaluate(() => window.__NWG.nw.coins)) > coins0, '被標記的場照樣拿字元（不扣、不罰）');
  const hist = await p.evaluate(() => window.__NWG.nw.cpmHist['6:0'].length);
  ok(hist === 2, `被標記的場不記進 cpmHist，免得污染「自己的速度」（現在 ${hist} 筆：前兩場正常的）`);

  /* ── 離線：排進佇列，之後補寫；補寫的 ts 是補寫當下 ── */
  await p.evaluate(() => { window.__FAIL_WRITES = '^mg_nw_(runs|flags)/'; });
  const n0 = (await runsOf(p)).length;
  await hunt(p, fakeRes()); await hunt(p, fakeRes({ over: { result: 'fail' } }));
  await p.waitForTimeout(600);
  ok((await runsOf(p)).length === n0 && (await p.evaluate(() => window.__NWG.nw.runQ.length)) === 2, '寫不進去（離線）：留在佇列（2 筆），不丟');
  for (let i = 0; i < 6; i++) await hunt(p, fakeRes());
  ok((await p.evaluate(() => window.__NWG.nw.runQ.length)) === 5, '佇列最多 5 筆，多的丟最舊的');
  const saved = await p.evaluate(id => JSON.parse(localStorage.getItem('mg_nw_' + id)).runQ.length, ID);
  ok(saved === 5, '佇列跟著存檔（本機存檔也有）');
  await p.evaluate(() => { window.__FAIL_WRITES = ''; });
  await hunt(p, fakeRes());
  await p.waitForTimeout(900);
  ok((await p.evaluate(() => window.__NWG.nw.runQ.length)) === 0 && (await runsOf(p)).length === n0 + 5, '網路回來：下一場結束時一起補寫（佇列清空，多 5 筆）');

  /* ── 重送遇到 permission-denied 當成已經寫進去 ── */
  const rid = (await runsOf(p))[0].k.split('/')[1];
  await p.evaluate(({ rid, run }) => { window.__NWG.nw.runQ.push({ rid, run }); }, { rid, run: (await runsOf(p))[0].v });
  await hunt(p, fakeRes());
  await p.waitForTimeout(700);
  ok((await p.evaluate(() => window.__NWG.nw.runQ.length)) === 0, '同一個 ID 再寫：規則擋（不能 update），程式當成已經寫進去，從佇列拿掉');

  /* 規則本身的驗證在 tools/rules-test（需要 Java 的 Firebase 模擬器）；這裡的假資料庫只有簡化版規則，確認寫進去的資料是對的 */
  ok(runs.every(r => r.v.uid === 'u1' && r.v.id === ID), '每筆都帶自己的 uid 與文件 ID');

  /* ── 結算畫面不出現「作弊」「可疑」：打一場被標記的，看結算文字 ── */
  await p.evaluate(r => { r.t0 = Date.now(); window.__NWG.afterHunt(r); }, sus);
  await p.waitForSelector('#nw-result');
  const rt = await p.textContent('#nw-result');
  ok(!/作弊|可疑|異常|標記/.test(rt), '結算畫面沒有「作弊」「可疑」這類字');
  ok(p.errs.length === 0, '沒有 JS 錯誤 ' + p.errs.join(' | '));
  await p.close();
  await b.close();
  console.log(fails ? `\n${fails} 個失敗` : '\n全部通過');
  process.exit(fails ? 1 : 0);
})();
