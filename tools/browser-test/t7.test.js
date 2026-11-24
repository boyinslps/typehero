/* 教師頁「🐛 回報與抓蟲榜」的「🤖 請 Claude 檢查待審回報」（開 __RULES，資料全是假的）。
   重點：① 匯出整串文字裡不能出現姓名、座號、班級名稱、docId、flag 文件 ID（它含 docId）、暱稱；
        ② 學生自己寫的姓名／班級座號要遮蔽；③ 對照表只在 sessionStorage；
        ④ 匯入建議不寫資料庫，老師按確認才寫入；⑤ 不合法的建議有清楚的訊息，不會壞。
   純函式（遮蔽、相似度、分組、驗證、全部採用的試算）直接在 node 測。 */
const { chromium } = require('playwright'); const fs = require('fs');
const path = require('path'); const { pathToFileURL } = require('url');
const M = path.join(__dirname, 'mock') + '/'; const OUT = process.argv[2] || require('os').tmpdir();
const ROOT = path.join(__dirname, '../..');
const css = require('./tw.js')(OUT);
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const NOW = Date.now(), H = 3600e3, D = 24 * H;

const route = p => p.route('**/*', r => {
  const u = r.request().url();
  if (u.startsWith('http://localhost')) return r.continue();
  if (u.includes('cdn.tailwindcss.com')) return r.fulfill({ contentType: 'application/javascript', body: `const s=document.createElement('style');s.textContent=${JSON.stringify(css)};document.head.appendChild(s);` });
  const m = u.includes('firebase-app') ? 'app.js' : u.includes('firebase-auth') ? 'auth.js' : u.includes('firebase-firestore') ? 'fs.js' : null;
  if (m) return r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(M + m, 'utf8') });
  return r.abort();
});
async function teacher(browser, seed, o = {}) {
  const ctx = await browser.newContext({ viewport: o.mobile ? { width: 390, height: 800 } : { width: 1280, height: 900 }, acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] }).catch(() => null);
  const p = ctx ? await ctx.newPage() : await browser.newPage({ viewport: o.mobile ? { width: 390, height: 800 } : { width: 1280, height: 900 }, acceptDownloads: true });
  const errs = [], cons = []; p.errs = errs; p.cons = cons;
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { cons.push(m.text()); if (m.type() === 'error' && !/Failed to load resource|Missing or insufficient|permission/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.addInitScript(a => { window.__FS = a.s; window.__RULES = true; localStorage.clear(); window.__ADMIN_PRESIGNED = { uid: 'T1', email: 'teacher@example.test' }; }, { s: seed });
  await route(p);
  await p.goto('http://localhost:8765/teacher.html');
  await p.waitForSelector('#app:not(.hidden)', { timeout: 8000 }).catch(e => { console.log('載入失敗', errs); throw e; }); await ready(p);
  return p;
}
const ready = p => p.waitForFunction(() => { const m = document.querySelector('#main'); return m && m.textContent && !m.textContent.includes('讀取中…') && m.children.length > 0; }, null, { timeout: 8000 }).then(() => p.waitForTimeout(150));
const tab = async (p, id) => { await p.click(`#nav [data-tab="${id}"]`); await p.waitForTimeout(120); await ready(p); await p.waitForTimeout(150); };
const modalOpen = p => p.evaluate(() => document.querySelectorAll('[data-modal]').length);
const clickModal = (p, id) => p.evaluate(id => { const ms = document.querySelectorAll('[data-modal]'); ms[ms.length - 1].querySelector(`[data-btn="${id}"]`).click(); }, id);
const modalText = p => p.evaluate(() => { const ms = document.querySelectorAll('[data-modal]'); return ms.length ? ms[ms.length - 1].textContent.replace(/\s+/g, ' ') : ''; });
const noErr = (p, m = '沒有 JS 錯誤') => ok(p.errs.length === 0, m + ' ' + p.errs.join(' | '));
const T = (p, sel) => p.textContent(sel).then(t => t.replace(/\s+/g, ' ').trim());
const logs = p => p.evaluate(() => Object.entries(window.__FS).filter(e => e[0].startsWith('mg_admin_log/')).map(e => e[1]));
const FSV = (p, k) => p.evaluate(k => window.__FS[k], k);
const flagWrites = p => p.evaluate(() => window.__WRITES.filter(w => /^mg_(nw_flags|bugboard|mail)\//.test(w.path)).length);

/* ── 假資料。姓名一眼看得出是假的，才能逐一搜尋 ── */
const C53 = '五年級3班', C42 = '四年級2班', C61 = '六年級1班';
const PEOPLE = [['測試甲', C53, 1], ['測試乙', C53, 2], ['測試丙', C42, 3], ['測試丁', C61, 4], ['測試戊', C53, 5]];
const IDS = PEOPLE.map(([, c, s]) => `${c}_${s}號`);
const [A, B, Cc, Dd, E] = IDS;
const fid = (docId, n) => `bug_${docId}_${1763000000000 + n}`;
const F = { f1: fid(A, 1), f2: fid(B, 2), f3: fid(Cc, 3), f4: fid(Dd, 4), f5: fid(E, 5), f6: fid(A, 6), f7: 'bug_noid_7', f8: fid(Dd, 8) };
const flag = (id, docId, o) => [`mg_nw_flags/${id}`, Object.assign({ type: 'bug', status: 'pending', docId, cls: docId ? docId.split('_')[0] : '', seat: 1, name: docId ? PEOPLE[IDS.indexOf(docId)][0] : '', cat: '畫面', t: NOW - H }, o)];
const seed = (o = {}) => Object.fromEntries([
  ['mg_admins/T1', { ok: true }],
  ...PEOPLE.map(([n, c, s]) => [`mg_scores/${c}_${s}號`, { className: c, seat: s, name: n, nwNick: '勇敢的' + n + '蛙', bestWpm: 20, lastPlayedAt: { __ts: NOW } }]),
  ...(o.empty ? [] : [
    flag(F.f1, A, { cat: '畫面', did: '我在背包裡很快連點三次裝備背包', what: '背包整個黑掉，按什麼都沒有反應', view: 'bag', t: NOW - 5 * H }),
    flag(F.f2, B, { cat: '畫面', did: '我在背包裡很快點裝備背包', what: '背包黑掉了，按什麼都沒有反應', view: 'bag', t: NOW - 4 * H }),
    flag(F.f3, Cc, { cat: '題目', did: '我是測試丙，五年4班5號，打字時', what: '題目的字太小看不清楚', t: NOW - 3 * H }),
    flag(F.f4, Dd, { cat: '魔物', did: '打魔物的時候按Enter', what: '畫面卡住不動了', view: 'battle', t: NOW - 2 * H }),
    flag(F.f5, E, { cat: '其他', did: '測試甲跟我說這裡有問題 3班12號', what: '好像怪怪的', t: NOW - H }),
    flag(F.f7, '', { did: '沒有代號的回報內容', what: '不能處理的那種' }),
    flag(F.f8, Dd, { cat: '', text: '【我做了什麼】按下商店按鈕\n【錯誤狀況】商店打不開', t: NOW - 30 * 60e3 })   // 舊格式：只有 text
  ]),
  flag(F.f6, A, { status: 'approved', sev: 2, cat: '畫面', did: '在村莊走到郵筒旁邊', what: '角色穿過牆壁', t: NOW - 3 * D }),
  ['mg_bugboard/' + A, { className: C53, seat: 1, score: 2, n: 1, firstAt: NOW - 3 * D, reports: [{ id: F.f6, st: 'approved', sev: 2, reply: '', t: NOW - 3 * D }] }],
  ['mg_bugboard/' + Dd, { className: C61, seat: 4, score: 9, n: 5, firstAt: NOW - 9 * D, reports: [] }]
]);
const FLAGIDS = Object.values(F);
const leakStrings = () => [...PEOPLE.map(p => p[0]), ...PEOPLE.map(p => '勇敢的' + p[0] + '蛙'), C53, C42, C61, '3班', '4班', '2班', '1班', ...IDS, ...FLAGIDS, 'bug_', 'mg_', 'docId', 'nwNick', 'className', 'seat', 'cls', 'name'];
/* 「_5號」是 docId 的長相；單獨的「號」不能擋，因為說明文字有「編號」 */
const leaks = text => leakStrings().filter(s => text.includes(s)).concat(/_\d+號/.test(text) ? ['docId 樣式'] : []);

/* 畫面上匯出的內容（<pre>）→ 物件；rid 對照 */
const exportObj = async p => JSON.parse(await p.$eval('[data-bx-pre]', e => e.textContent));
const ridBy = (obj, part) => { const r = obj.rows.find(x => (x.did || '').includes(part)); return r && r.rid; };
const build = async (p, confirmIfAsked = true) => {
  await p.click('[data-bx="build"]'); await p.waitForTimeout(120);
  if (await modalOpen(p)) { if (!confirmIfAsked) return false; await clickModal(p, 'ok'); await p.waitForTimeout(150); }
  await p.waitForSelector('[data-bx-pre]', { state: 'attached' }); return true;
};
const doImport = async (p, obj) => { await p.fill('[data-bx-in]', typeof obj === 'string' ? obj : JSON.stringify(obj)); await p.click('[data-bx="import"]'); await p.waitForTimeout(150); };
const sg = (rid, verdict, extra) => Object.assign({ rid, verdict }, extra || {});

(async () => {
  /* ═══ 純函式（node 直接 import）═══ */
  const X = await import(pathToFileURL(path.join(ROOT, 'teacher/export-bugs.js')).href);
  const BC = await import(pathToFileURL(path.join(ROOT, 'teacher/bug-calc.js')).href);
  {
    const mk = s => X.maskText(s, []);
    let r = mk('五年4班5號');
    ok(r.text === '（已遮蔽）' && r.n === 1, '「五年4班5號」整串一次遮掉：' + JSON.stringify(r));
    ok(mk('五年級3班').text === '（已遮蔽）' && mk('我是503班的').text.includes('（已遮蔽）') && mk('3班12號').n === 1 && mk('3班12號').text === '（已遮蔽）', '「五年級3班」「3班12號」');
    ok(mk('我坐在5號的位子').text === '我坐在（已遮蔽）的位子' && mk('十二號').text === '（已遮蔽）' && mk('座號 12 的電腦').text.replace(/\s/g, '') === '（已遮蔽）的電腦', '「5號」「十二號」「座號 12」');
    r = mk('我是王小明，打字的時候壞掉');
    ok(r.text === '（已遮蔽），打字的時候壞掉' && r.n === 1, '「我是王小明」遮掉（到標點為止）：' + r.text);
    ok(mk('我是在背包裡點三次').n === 0 && mk('我是想看看').n === 0 && mk('我是用鍵盤按').n === 0, '「我是在…／我是想…／我是用…」是描述，不遮');
    ok(mk('我叫陳大文').text === '（已遮蔽）' && mk('我叫出背包').n === 0, '「我叫○○」遮，「我叫出背包」不遮');
    ok(mk('我是五年4班5號的王小明').n >= 1 && !mk('我是五年4班5號的王小明').text.includes('五年4班'), '混在一起也會遮班級座號');
    r = X.maskText('測試甲跟測試乙說有問題，測試乙也看到', ['測試甲', '測試乙', '甲', '']);
    ok(r.text === '（已遮蔽）跟（已遮蔽）說有問題，（已遮蔽）也看到' && r.n === 3, '已知的學生姓名（1 字以下的名字不用）：' + r.text);
    ok(X.maskText('', []).n === 0 && X.maskText(undefined, null).text === '' && X.maskText('背包黑掉', ['背包']).text === '（已遮蔽）黑掉', '空字串／undefined 不壞');
    ok(X.maskText('5個魔物 3次 第2關', []).n === 0, '沒有「班／號」的數字不遮');
  }
  {
    const g = s => { const t = Array.from(s.replace(/\s/g, '')), o = new Set(); for (let i = 0; i < t.length - 1; i++) o.add(t[i] + t[i + 1]); return o; };
    ok(X.jaccard(g('我在背包裡很快連點三次裝備背包背包整個黑掉'), g('我在背包裡很快點裝備背包背包黑掉了')) >= X.DUP_THRESHOLD && X.jaccard(g('打魔物的時候按Enter畫面卡住'), g('我在背包裡很快連點三次裝備背包')) < X.DUP_THRESHOLD, '相近的回報超過門檻，不相干的沒有（門檻 ' + X.DUP_THRESHOLD + '）');
    ok(X.jaccard(new Set(), g('背包')) === 0 && X.jaccard(g('黑'), g('黑')) === 0 && X.jaccard(g('背包黑'), g('背包黑')) === 1, '太短（不到兩個字）不分組、完全一樣是 1');
  }
  const boardIn = { [A]: { n: 3, score: 7 }, [Dd]: { n: 5, score: 9 } };
  const flagsIn = Object.entries(seed()).filter(e => e[0].startsWith('mg_nw_flags/')).map(([k, v]) => Object.assign({ id: k.slice(12) }, v));
  const namesIn = PEOPLE.map(p => p[0]);
  {
    const e = X.buildBugExport(flagsIn, boardIn, { names: namesIn, date: new Date(2026, 10, 20), appVersion: '9.9.9' });
    const rows = e.data.rows, byDid = s => rows.find(r => r.did.includes(s));
    ok(rows.length === 6 && e.data.meta.count === 6 && e.data.meta.pending === 6 && e.skippedNoId === 1, `只匯出待審的 6 則（已確認的、沒學生代號的不匯出，沒代號的記 1 則）：${rows.length}`);
    ok(e.data.meta.exportedAt === '2026-11-20' && e.data.meta.appVersion === '9.9.9' && e.data.meta.note.includes('已去識別化') && e.data.meta.note.includes('只對這一次匯出有效') && e.data.meta.fields.rid && e.data.meta.fields.dupGroup && e.data.meta.task.includes('suggestions') && e.data.meta.dupThreshold === 0.3, 'meta：日期、版本、去識別化說明、欄位說明、給 Claude 的任務說明、門檻');
    ok(e.data.meta.maskedCount === 4 && e.masked === 4, '遮蔽數：f3 兩處（我是…、五年4班5號）＋f5 兩處（姓名、3班12號）＝4：' + e.data.meta.maskedCount);
    const r3 = byDid('（已遮蔽），（已遮蔽）'), r5 = rows.find(r => r.did.includes('跟我說'));
    ok(r3 && r3.did === '（已遮蔽），（已遮蔽），打字時' && r5 && r5.did === '（已遮蔽）跟我說這裡有問題 （已遮蔽）', '遮蔽後的內容：' + JSON.stringify([r3 && r3.did, r5 && r5.did]));
    ok(rows.every(r => /^[A-Z2-9]{8}$/.test(r.rid)) && new Set(rows.map(r => r.rid)).size === 6, 'rid 8 碼、不重複');
    ok(Object.keys(e.map).length === 6 && Object.entries(e.map).every(([k, v]) => rows.some(r => r.rid === k) && FLAGIDS.includes(v)), '對照表 rid → flag 文件 ID（這份在匯出檔之外）');
    ok(leaks(JSON.stringify(e.data)).length === 0 && leaks(X.toText(e.data)).length === 0, '整份匯出（JSON 與文字）沒有姓名／班級／docId／flag ID／暱稱：' + leaks(JSON.stringify(e.data)));
    ok(rows.every(r => Object.keys(r).every(k => ['rid', 'grade', 'n', 'score', 'status', 'sev', 'cat', 'did', 'what', 'view', 't', 'dupGroup', 'earliest'].includes(k))), '每一列只有白名單欄位');
    const rA = byDid('裝備背包'), rD = byDid('Enter');
    ok(rA.n === 3 && rA.score === 7 && rA.grade === '五' && rD.n === 5 && rD.score === 9 && rD.grade === '六', '回報者的確認件數與分數、年級（沒有 ID）：' + JSON.stringify([rA, rD]));
    ok(byDid('背包整個') === undefined && rows.filter(r => r.dupGroup).length === 2, '兩則背包的回報同一組（共 2 則有組號）');
    const gr = rows.filter(r => r.dupGroup);
    ok(gr[0].dupGroup === gr[1].dupGroup && /^G[A-Z2-9]{3}$/.test(gr[0].dupGroup) && gr.filter(r => r.earliest).length === 1 && gr.find(r => r.earliest).did === '我在背包裡很快連點三次裝備背包' && rows.filter(r => !r.dupGroup).every(r => r.dupGroup === null && !('earliest' in r)), '同組標出送出最早的一則；沒有相近的 dupGroup 是 null');
    ok(rows.every(r => !r.t || /^\d{4}-\d\d-\d\d \d\d:\d\d$/.test(r.t)) && rows.every(r => r.t), 't 只到分鐘');
    ok(!('sev' in rA) && rows.every(r => r.status === 'pending') && !rows.some(r => 'text' in r), '待審的沒有 sev；新舊格式都拆成 did／what（舊格式 text 也拆開了）');
    const old = rows.find(r => r.did === '按下商店按鈕');
    ok(old && old.what === '商店打不開' && !('cat' in old), '舊格式（只有 text）也讀得出 did／what；分類是空的就不輸出');
    ok(rA.cat === '畫面' && rA.view === 'bag', 'cat、view 有輸出');
    const e2 = X.buildBugExport(flagsIn, boardIn, { names: namesIn });
    ok(e2.data.rows.filter(r => e.data.rows.some(q => q.rid === r.rid)).length === 0 && Object.keys(e2.map).every(k => !(k in e.map)), '再匯出一次：rid 全部換新');
    ok(!X.toText(e.data).includes('\r') && JSON.parse(X.toText(e.data)).rows.length === 6, 'toText 是合法 JSON');
    /* 連已審過的也匯出 */
    const e3 = X.buildBugExport(flagsIn, boardIn, { names: namesIn, includeReviewed: true });
    const rv = e3.data.rows.find(r => r.did === '在村莊走到郵筒旁邊');
    ok(e3.data.rows.length === 7 && e3.data.meta.pending === 6 && rv && rv.status === 'approved' && rv.sev === 2 && leaks(JSON.stringify(e3.data)).length === 0, '勾「連已審過的」：多一則 approved（帶 sev），仍然乾淨');
    /* 壞資料 */
    const odd = X.buildBugExport([null, undefined, { type: 'bug', docId: A, id: 'x', did: 123, what: { a: 1 }, view: '測試甲<script>', cat: '測試甲' }, { type: 'bug', docId: A, id: 'y', status: 'weird', did: '壞掉的', what: '壞了', t: 'abc' }, { type: 'feedback', docId: A, id: 'z' }], null, { names: namesIn });
    ok(odd.data.rows.length === 2 && odd.data.rows.every(r => !('view' in r) && !('cat' in r)) && !JSON.stringify(odd.data).includes('測試甲'), '壞資料：view／cat 不符格式就丟掉；不認得的 status 算待審；不丟錯');
    ok(X.buildBugExport([], {}, {}).data.rows.length === 0 && X.buildBugExport(undefined, undefined).data.meta.count === 0, '空的不壞');
    ok(X.fileName(new Date(2026, 10, 20)) === 'typehero-bugs-20261120.json', '檔名');
  }
  {
    /* 驗證 */
    const e = X.buildBugExport(flagsIn, boardIn, { names: namesIn, includeReviewed: true }), R = k => Object.entries(e.map).find(([, v]) => v === F[k])[0];
    const statusOf = id => { const f = flagsIn.find(x => x.id === id); return f ? (f.status || 'pending') : null; };
    const P = (j, o = {}) => X.parseSuggestions(typeof j === 'string' ? j : JSON.stringify(j), Object.assign({ map: e.map, statusOf, mask: s => X.maskText(s, namesIn) }, o));
    let r = P({ suggestions: [sg(R('f1'), 'approve', { sev: 2, note: '真的問題', reply: '謝謝你' }), sg(R('f2'), 'dup', { dupOf: R('f1'), note: '一樣' }), sg(R('f4'), 'reject', { note: '看不出來' })] });
    ok(r.accepted.length === 3 && r.skipped.length === 0 && r.accepted[0].flagId === F.f1 && r.accepted[0].sev === 2 && r.accepted[1].dupOf === F.f1 && r.accepted[1].dupOfRid === R('f1') && r.accepted[2].verdict === 'reject', '合法的三列：對回 flag 文件 ID');
    r = P('```json\n' + JSON.stringify({ suggestions: [sg(R('f1'), 'approve', { sev: 1 })] }) + '\n```');
    ok(r.accepted.length === 1, '外面包 ```json 也讀得進來');
    r = P('好的，這是我的建議：\n' + JSON.stringify({ suggestions: [sg(R('f1'), 'approve', { sev: 1 })] }) + '\n希望有幫助');
    ok(r.accepted.length === 1, '前後有說明文字也讀得進來');
    r = P([sg(R('f1'), 'approve', { sev: 3 })]);
    ok(r.accepted.length === 1, '最外層直接是陣列也可以');
    r = P({ suggestions: [sg('ZZZZZZZZ', 'approve', { sev: 1 })] });
    ok(r.accepted.length === 0 && r.skipped.length === 1 && r.skipped[0].reason.includes('不在目前的對照表') && r.skipped[0].row === 1, '錯的 rid：略過並說明');
    r = P({ suggestions: [sg(R('f1'), 'approve', { sev: 4 }), sg(R('f2'), 'approve', { sev: 0 }), sg(R('f3'), 'approve'), sg(R('f4'), 'approve', { sev: 2.5 }), sg(R('f5'), 'approve', { sev: '2' })] });
    ok(r.accepted.length === 0 && r.skipped.length === 5 && r.skipped.every(s => s.reason.includes('sev 要是 1、2、3')), 'sev 超界／0／缺／小數／字串：全部略過');
    r = P({ suggestions: [sg(R('f1'), 'dup', { dupOf: 'NOPE1234' }), sg(R('f2'), 'dup', { dupOf: R('f2') }), sg(R('f3'), 'dup'), sg(R('f4'), 'maybe'), sg(R('f5'), 'reject', { note: 5 })] });
    ok(r.skipped.length === 5 && r.skipped[0].reason.includes('不在這批匯出裡') && r.skipped[1].reason.includes('不能跟自己') && r.skipped[2].reason.includes('dupOf') && r.skipped[3].reason.includes('verdict') && r.skipped[4].reason.includes('note'), 'dupOf 不在批次內／自己／缺／verdict 不合／型別錯：各有原因：' + JSON.stringify(r.skipped.map(s => s.reason)));
    r = P({ suggestions: [sg(R('f1'), 'approve', { sev: 2 }), sg(R('f1'), 'reject'), 5, null, [], { verdict: 'approve' }, sg('', 'reject')] });
    ok(r.accepted.length === 1 && r.skipped.length === 6 && r.skipped[0].reason.includes('第二次') && r.skipped.filter(s => s.reason.includes('不是物件')).length === 3 && r.skipped.filter(s => s.reason.includes('缺少 rid')).length === 2, '同一個 rid 兩次、不是物件、缺 rid：合法的那列還是收進來');
    r = P({ suggestions: [sg(R('f6'), 'approve', { sev: 1 })] });
    ok(r.accepted.length === 0 && r.skipped[0].reason.includes('已經審核過'), '已審過的回報不接受建議');
    r = P({ suggestions: [sg(R('f1'), 'dup', { dupOf: R('f6') })] });
    ok(r.accepted.length === 1 && r.accepted[0].dupOf === F.f6, '但可以說「跟已審過的那則一樣」');
    r = P({ suggestions: [sg(R('f1'), 'reject', { reply: '測試丙你好，' + '很長'.repeat(50), note: '跟測試乙一樣' })] });
    ok(r.accepted.length === 1 && !r.accepted[0].reply.includes('測試丙') && !r.accepted[0].note.includes('測試乙') && [...r.accepted[0].reply].length <= 60 && r.accepted[0].warn.length >= 1, 'reply／note 裡的姓名也遮蔽、reply 截到 60 字、有警告：' + JSON.stringify(r.accepted[0]));
    r = P({ suggestions: [sg(R('f1'), 'dup', { dupOf: R('f2'), reply: '不會被收進來' })] });
    ok(r.accepted[0].reply === '', 'dup 沒有回覆（固定感謝信）');
    r = P('{"suggestions": [');
    ok(r.fatal && r.fatal.includes('不是正確的 JSON') && r.accepted.length === 0, '不是 JSON：整份失敗並說明');
    ok(P('').fatal.includes('還沒貼上') && P({ foo: 1 }).fatal.includes('suggestions') && P({ suggestions: [] }).fatal.includes('空的') && P('123').fatal.includes('suggestions'), '空白／沒有 suggestions／空陣列／亂格式');
    ok(P({ suggestions: [sg(R('f1'), 'approve', { sev: 1 })] }, { map: null }).fatal.includes('找不到編號對照表') && P({ suggestions: [] }, { map: {} }).fatal.includes('重新按「匯出待審回報」'), '沒有對照表：清楚的錯誤與重新匯出的指引');
    r = P({ suggestions: [sg(R('f1').toLowerCase(), 'approve', { sev: 2 })] });
    ok(r.accepted.length === 1, 'rid 大小寫不拘（Claude 有時會改成小寫）');
    r = P({ suggestions: [sg(R('f1'), 'approve', { sev: 2 })] }, { statusOf: () => null });
    ok(r.skipped[0].reason.includes('找不到這則回報'), '回報已被刪掉：略過');
  }
  {
    /* 全部採用的試算（純函式） */
    const board = { [A]: { reports: [{ id: F.f6, st: 'approved', sev: 2, t: 1 }], bonus: 0, notes: [] }, [Dd]: { reports: [1, 2, 3, 4, 5].map(i => ({ id: 'old' + i, st: 'approved', sev: 1, t: i })), bonus: 0 } };
    const fl = [...flagsIn, ...[]];
    const items = [{ flagId: F.f1, verdict: 'approve', sev: 2, reply: '好' }, { flagId: F.f2, verdict: 'dup', dupOf: F.f1 }, { flagId: F.f3, verdict: 'approve', sev: 3 }, { flagId: F.f4, verdict: 'approve', sev: 1 }, { flagId: F.f8, verdict: 'reject', reply: '設計如此' },
      { flagId: F.f5, verdict: 'dup', dupOf: F.f8 }, { flagId: F.f6, verdict: 'approve', sev: 1 }, { flagId: 'nope', verdict: 'reject' }];
    const pl = BC.planBulk(items, fl, board, 5);
    ok(pl.counts.approve === 3 && pl.counts.dup === 1 && pl.counts.reject === 1 && pl.items.length === 5, '試算：確認 3、重複 1、不採用 1：' + JSON.stringify(pl.counts));
    ok(pl.skips.length === 3 && pl.skips.some(s => s.flagId === F.f5 && s.reason.includes('不採用或重複')) && pl.skips.some(s => s.flagId === F.f6 && s.reason.includes('已經審核過')) && pl.skips.some(s => s.flagId === 'nope'), '略過：對象是不採用的重複、已審過、找不到');
    ok(pl.delta === 2 + 3 + 1 && pl.students.find(s => s.docId === A).from === 2 && pl.students.find(s => s.docId === A).to === 4 && pl.students.find(s => s.docId === Cc).to === 3, '總分變化 +6（甲 2→4、丙 0→3、丁 5→6）：' + JSON.stringify(pl.students));
    ok(pl.coinMails === 2 && pl.thanksMails === 2 && pl.replyMails === 1, '信：有字元 2 封（甲、丙）、只感謝 2 封（丁已有 5 個確認、重複 1 封）、不採用附回覆 1 封：' + [pl.coinMails, pl.thanksMails, pl.replyMails]);
    ok(BC.planBulk(items, fl, board, 5, s => 15 * s).coinTotal === 30 + 45 && BC.planBulk(items, fl, board, 5).coinTotal === 0, '試算：字元總數照嚴重度（中 30＋大 45；丁超過 5 個只感謝不算）');
    ok(BC.planBulk([], [], {}, 5).items.length === 0 && BC.planBulk(undefined, undefined, undefined, 5).delta === 0, '空的不壞');
  }

  const browser = await chromium.launch();
  const stampNow = () => { const d = new Date(), p2 = n => String(n).padStart(2, '0'); return `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}`; };

  /* ═══ 介面：匯出 ═══ */
  let R1;
  {
    const p = await teacher(browser, seed());
    await tab(p, 'bugs');
    ok((await p.$$eval('h3', hs => hs.map(h => h.textContent))).includes('🤖 請 Claude 檢查待審回報'), '區塊標題');
    ok((await T(p, '[data-bx-count]')).includes('現在有 6 則待審核') && (await T(p, '[data-bugexp]')).includes('Claude 的建議只會顯示在每則回報旁邊，不會自己寫進去'), '現在有 6 則待審；說明建議不會自動寫入');
    ok(await p.$('[data-bx-out]').then(e => e.innerHTML()) === '' && await p.$('[data-bx-pre]') === null, '按之前不產生匯出內容');
    ok(await p.evaluate(() => sessionStorage.getItem('typehero.bugExportMap')) === null, '按之前 sessionStorage 沒有對照表');
    await p.click('[data-bx="build"]'); await p.waitForSelector('[data-bx-pre]', { state: 'attached' });
    ok(await modalOpen(p) === 0, '第一次匯出不用確認');
    const sum = await T(p, '[data-bx-sum]');
    ok(sum.includes('6 則') && (await T(p, '[data-bx-masked]')).includes('共遮蔽 4 處') && sum.includes('遮蔽不是百分之百') && sum.includes('有 1 組文字相近') && sum.includes('1 則沒有學生代號'), '預覽：則數、共遮蔽 4 處、遮蔽不完美的提醒、1 組相近、沒代號的 1 則：' + sum);
    ok((await T(p, '[data-bx-keep]')).includes('請不要關掉這個分頁、不要重新整理'), '提醒匯入建議之前不要關掉分頁、不要重新整理');
    ok(await p.$eval('[data-bx="build"]', b => b.textContent) === '重新匯出（換一組編號）', '匯出之後按鈕變成「重新匯出（換一組編號）」');
    const text = await p.$eval('[data-bx-pre]', e => e.textContent), obj = JSON.parse(text);
    ok(obj.rows.length === 6 && obj.meta.maskedCount === 4 && typeof obj.meta.appVersion === 'string', '畫面上的內容是合法 JSON，6 列');
    ok(leaks(text).length === 0, '預覽（畫面上的匯出內容）沒有姓名／班級／docId／flag ID：' + leaks(text));
    ok(leaks(await p.$eval('[data-bugexp]', e => e.textContent)).length === 0, '整個區塊的畫面文字沒有姓名／班級／docId／flag ID');
    R1 = obj;
    ok(await p.$$eval('[data-bx="dl"],[data-bx="copy"]', bs => bs.map(b => b.textContent)).then(a => a[0] === '下載 JSON' && a[1].startsWith('複製成文字')), '兩顆按鈕：下載 JSON、複製成文字');
    ok((await logs(p)).filter(l => l.act === 'export').length === 0, '只是產生內容，還沒寫操作紀錄');

    /* 對照表只在 sessionStorage */
    const ssv = await p.evaluate(() => sessionStorage.getItem('typehero.bugExportMap')), mp = JSON.parse(ssv).map;
    ok(Object.keys(mp).length === 6 && Object.keys(mp).every(k => obj.rows.some(r => r.rid === k)) && Object.values(mp).every(v => FLAGIDS.includes(v)), 'sessionStorage 有對照表：6 筆 rid → flag 文件 ID');
    const ls = await p.evaluate(() => JSON.stringify(Object.entries(localStorage)));
    ok(!obj.rows.some(r => ls.includes(r.rid)) && !ls.includes('bugExportMap'), 'localStorage 沒有對照表');
    const fsDump = await p.evaluate(() => JSON.stringify(window.__FS));
    ok(!obj.rows.some(r => fsDump.includes(r.rid)), '資料庫（Firestore）裡找不到任何 rid：對照表沒有寫進去');
    ok(!obj.rows.some(r => p.cons.join('\n').includes(r.rid)) && !p.cons.join('\n').includes('bugExportMap'), 'console 沒有印出 rid 或對照表');

    /* 下載 */
    const dl = p.waitForEvent('download', { timeout: 5000 });
    await p.click('[data-bx="dl"]');
    const d = await dl, chunks = []; for await (const c of await d.createReadStream()) chunks.push(c);
    const dtext = Buffer.concat(chunks).toString('utf8');
    ok(d.suggestedFilename() === `typehero-bugs-${stampNow()}.json`, '檔名 typehero-bugs-YYYYMMDD.json：' + d.suggestedFilename());
    ok(dtext === text && leaks(dtext).length === 0 && JSON.parse(dtext).rows.length === 6, '下載的檔案跟畫面上一致，全文沒有姓名／班級／docId／flag ID');
    await p.waitForTimeout(250);
    let L = (await logs(p)).filter(l => l.act === 'export');
    ok(L.length === 1 && L[0].target === 'bugs' && L[0].summary === '匯出待審回報 6 則' && leaks(JSON.stringify(L[0])).length === 0, '操作紀錄 export／bugs／則數，沒有內容：' + JSON.stringify(L));
    /* 複製 */
    await p.click('[data-bx="copy"]'); await p.waitForTimeout(300);
    const clip = await p.evaluate(() => navigator.clipboard.readText()).catch(() => null);
    ok(clip === text && leaks(clip).length === 0, '複製成文字：剪貼簿的內容跟畫面一致，沒有身分字串');
    L = (await logs(p)).filter(l => l.act === 'export');
    ok(L.length === 2 && L.every(l => l.summary === '匯出待審回報 6 則'), '複製也寫一筆紀錄（只有則數）');

    /* 重新匯出：要確認、換一組 rid */
    await p.click('[data-bx="build"]'); await p.waitForSelector('[data-modal]');
    ok((await modalText(p)).includes('之前那份內容的編號就不能用了'), '重新匯出前提醒舊編號會失效');
    await clickModal(p, 'no'); await p.waitForTimeout(150);
    ok(JSON.stringify(await exportObj(p)) === JSON.stringify(obj) && await p.evaluate(() => Object.keys(JSON.parse(sessionStorage.getItem('typehero.bugExportMap')).map).every(k => k)), '按「先不要」：內容與對照表都沒變');
    await p.click('[data-bx="build"]'); await p.waitForSelector('[data-modal]'); await clickModal(p, 'ok'); await p.waitForTimeout(200);
    const obj2 = await exportObj(p), same = obj2.rows.filter(r => obj.rows.some(q => q.rid === r.rid)).length;
    ok(same === 0 && obj2.rows.length === 6, `重新匯出：rid 全部換新（重複 ${same}）`);
    const mp2 = await p.evaluate(() => JSON.parse(sessionStorage.getItem('typehero.bugExportMap')).map);
    ok(obj.rows.every(r => !(r.rid in mp2)) && obj2.rows.every(r => r.rid in mp2), '對照表換成新的一組，舊的不在了');

    /* 舊 rid 的建議被拒絕並說明 */
    await doImport(p, { suggestions: obj.rows.slice(0, 2).map(r => sg(r.rid, 'approve', { sev: 2 })) });
    const sk = await T(p, '[data-bx-skip]');
    ok(sk.includes('略過 2 列') && sk.includes('不在目前的對照表') && sk.includes('重新匯出過') && await p.$('[data-bx-ok]') === null && await p.$('[data-sugg]') === null, '用舊那份的 rid 匯入：全部略過並說明可能重新匯出過，沒有任何建議出現：' + sk);
    ok(await flagWrites(p) === 0, '匯入失敗也沒有寫任何東西');
    noErr(p); await p.close();
  }

  /* ═══ 介面：匯入建議、預填、確認才寫入 ═══ */
  {
    const p = await teacher(browser, seed());
    await tab(p, 'bugs');
    await build(p); const ex = await exportObj(p);
    const r = k => ridBy(ex, k);
    const w0 = await flagWrites(p), w00 = await p.evaluate(() => window.__WRITES.length);
    await doImport(p, { suggestions: [
      sg(r('連點三次'), 'approve', { sev: 2, note: '可以重現，背包黑掉', reply: '謝謝你，我修好了' }),
      sg(r('很快點裝備'), 'dup', { dupOf: r('連點三次'), note: '跟上一則是同一個問題' }),
      sg(r('打魔物'), 'reject', { note: '按 Enter 本來就會暫停', reply: '這是設計成這樣的' }),
      sg(r('（已遮蔽），（已遮蔽）'), 'approve', { sev: 3, note: '很嚴重', reply: '測試丙你好' }),
      sg('BADBADXX', 'approve', { sev: 1 }), sg(r('跟我說'), 'approve', { sev: 9 })
    ] });
    const okT = await T(p, '[data-bx-ok]'), skT = await T(p, '[data-bx-skip]');
    ok(okT.includes('已匯入 4 則建議') && okT.includes('確認 2・重複 1・不採用 1') && okT.includes('還沒有寫進資料庫'), '匯入結果：4 則（確認 2・重複 1・不採用 1），說明還沒寫進資料庫：' + okT);
    ok(skT.includes('略過 2 列') && skT.includes('第 5 列') && skT.includes('第 6 列') && skT.includes('sev'), '兩列不合法列出行號與原因：' + skT);
    ok(await p.$eval('[data-bx-warn]', e => e.textContent).then(t => t.includes('已遮蔽')).catch(() => false), '回覆裡有名字：顯示已遮蔽的警告');
    ok(await p.evaluate(() => window.__WRITES.length) === w00 && await flagWrites(p) === w0, '匯入不寫資料庫（沒有任何新的寫入）');
    ok((await FSV(p, 'mg_nw_flags/' + F.f1)).status === 'pending', 'flag 還是待審');
    const sugT = f => T(p, `[data-flag="${f}"] [data-sugg]`);
    const s1 = await sugT(F.f1), s2 = await sugT(F.f2), s4 = await sugT(F.f4), s3 = await sugT(F.f3);
    ok(s1.includes('🤖 建議：確認・中（2 分）') && s1.includes('可以重現，背包黑掉') && s1.includes('建議回覆：謝謝你，我修好了') && s1.includes('回覆所有同學都可能看到'), '回報卡：確認・中（2 分）＋理由＋建議回覆＋提醒：' + s1);
    ok(s2.includes('重複（跟「') && s2.includes('我在背包裡很快連點三次裝備背包') && s2.includes('同一個問題'), '重複（跟哪一則一樣）：' + s2);
    ok(s4.includes('🤖 建議：不採用') && s4.includes('按 Enter 本來就會暫停'), '不採用：' + s4);
    ok(s3.includes('確認・大（3 分）') && !s3.includes('測試丙') && s3.includes('（已遮蔽）'), '建議回覆裡的名字被遮蔽：' + s3);
    ok(await p.$(`[data-flag="${F.f5}"] [data-sugg]`) === null && await p.$(`[data-flag="${F.f8}"] [data-sugg]`) === null, '沒有建議的回報沒有建議框');
    ok((await T(p, '[data-bx-allbox]')).includes('有 4 則待審回報帶著 Claude 的建議'), '「全部採用」區塊顯示有 4 則');
    /* 建議存在 sessionStorage，切到別的分頁再回來還在 */
    ok(await p.evaluate(() => Object.keys(JSON.parse(sessionStorage.getItem('typehero.bugSuggest'))).length) === 4, 'sessionStorage 有 4 則建議');
    await tab(p, 'overview'); await tab(p, 'bugs');
    ok(await p.$$eval('[data-sugg]', e => e.length) === 4, '離開再回審核頁，建議還在');

    /* 採用 → 預填視窗，取消 → 不寫 */
    await p.click(`[data-usesugg="${F.f1}"]`); await p.waitForSelector('[data-modal]');
    const mt = await modalText(p);
    ok(await p.$eval('[data-modal] [data-prefilled]', e => e.textContent).then(t => t.includes('照 Claude 的建議填好了')) && await p.$eval('input[name="sev"]:checked', e => e.value) === '2' && await p.$eval('[data-modal] [data-reply]', e => e.value) === '謝謝你，我修好了' && mt.includes('回覆所有同學都可能看到，不要寫名字'), '確認視窗已預填：嚴重度「中」、回覆；仍有「所有同學都看到，不要寫名字」的提醒');
    await clickModal(p, 'no'); await p.waitForTimeout(200);
    ok(await modalOpen(p) === 0 && await flagWrites(p) === w0 && (await FSV(p, 'mg_nw_flags/' + F.f1)).status === 'pending' && await p.$(`[data-sugg="${F.f1}"]`) !== null, '取消：沒寫入，建議還在');
    /* 老師改掉建議，再確認 */
    await p.click(`[data-usesugg="${F.f1}"]`); await p.waitForSelector('[data-modal]');
    await p.click('input[name="sev"][value="3"]'); await p.fill('[data-modal] [data-reply]', '老師改過的回覆');
    ok(await flagWrites(p) === w0, '預填、改完還沒按確認：沒寫入');
    await clickModal(p, 'ok'); await p.waitForTimeout(500);
    const f1 = await FSV(p, 'mg_nw_flags/' + F.f1), bb = await FSV(p, 'mg_bugboard/' + A), ml = await FSV(p, 'mg_mail/bug_' + F.f1);
    ok(f1.status === 'approved' && f1.sev === 3 && f1.reply === '老師改過的回覆', '按確認才寫入，用老師改過的值（不是建議的）：' + JSON.stringify([f1.status, f1.sev, f1.reply]));
    ok(bb.score === 5 && bb.n === 2 && ml && ml.body.includes('老師改過的回覆') && ml.items[0].n === 45 && ml.body.includes('你回報的：'), '抓蟲榜 2→5 分、n=2、獎勵信（大＝45 字元，照嚴重度；引用回報內容）');
    ok(await p.$(`[data-sugg="${F.f1}"]`) === null && await p.$$eval('[data-sugg]', e => e.length) === 3, '寫入後那則的建議消失，其他 3 則還在');
    ok((await FSV(p, 'mg_nw_flags/' + F.f2)).status === 'pending' && (await FSV(p, 'mg_nw_flags/' + F.f4)).status === 'pending' && (await FSV(p, 'mg_nw_flags/' + F.f5)).status === 'pending', '其他回報沒被動到');
    /* 重複：下拉預選 */
    await p.click(`[data-usesugg="${F.f2}"]`); await p.waitForSelector('[data-modal]');
    ok(await p.$eval('[data-dupof]', s => s.value) === F.f1 && await p.$eval('[data-modal] [data-prefilled]', e => !!e), '重複視窗：「跟哪一則一樣」預選那一則');
    await clickModal(p, 'ok'); await p.waitForTimeout(500);
    const f2 = await FSV(p, 'mg_nw_flags/' + F.f2);
    ok(f2.status === 'dup' && f2.dupOf === F.f1 && (await FSV(p, 'mg_mail/bug_' + F.f2)).items.length === 0, '重複寫入：status dup、dupOf、感謝信沒有字元');
    /* 不採用：回覆預填 */
    await p.click(`[data-usesugg="${F.f4}"]`); await p.waitForSelector('[data-modal]');
    ok(await p.$eval('[data-modal] [data-reply]', e => e.value) === '這是設計成這樣的', '不採用視窗：回覆預填');
    await clickModal(p, 'ok'); await p.waitForTimeout(500);
    ok((await FSV(p, 'mg_nw_flags/' + F.f4)).status === 'rejected' && (await FSV(p, 'mg_nw_flags/' + F.f4)).reply === '這是設計成這樣的' && (await FSV(p, 'mg_mail/bugr_' + F.f4)), '不採用寫入，有回覆就寄信');
    /* 「不管這個建議」只清掉建議，不動回報 */
    const w1 = await flagWrites(p);
    await p.click(`[data-dropsugg="${F.f3}"]`); await p.waitForTimeout(150);
    ok(await p.$(`[data-sugg="${F.f3}"]`) === null && await flagWrites(p) === w1 && (await FSV(p, 'mg_nw_flags/' + F.f3)).status === 'pending', '「不管這個建議」：建議消失、回報還是待審、沒寫入');
    ok(await p.$('[data-bx-allbox]') === null, '沒有待審帶建議的了：「全部採用」區塊消失');
    noErr(p); await p.close();
  }

  /* ═══ 全部採用 ═══ */
  {
    const p = await teacher(browser, seed());
    await tab(p, 'bugs'); await build(p); const ex = await exportObj(p), r = k => ridBy(ex, k);
    await doImport(p, { suggestions: [
      sg(r('連點三次'), 'approve', { sev: 2, note: 'a', reply: '謝謝你' }), sg(r('很快點裝備'), 'dup', { dupOf: r('連點三次') }),
      sg(r('（已遮蔽），（已遮蔽）'), 'approve', { sev: 3 }), sg(r('打魔物'), 'reject', { reply: '這是設計成這樣的' }),
      sg(r('跟我說'), 'dup', { dupOf: r('打魔物') })   // 對象被建議不採用 → 這則要略過
    ] });
    const w0 = await flagWrites(p);
    await p.click('[data-bx="all"]'); await p.waitForSelector('[data-modal]');
    const mt = await modalText(p);
    ok(mt.includes('會一次處理 4 則') && mt.includes('確認 2、重複 1、不採用 1') && mt.includes('抓蟲分總共 +5 分') && mt.includes('共 75 字元') && mt.includes('涉及 4 位同學') && mt.includes('2 → 4 分') && mt.includes('0 → 3 分'), '再確認視窗：處理 4 則、總分 +5、涉及 4 位（甲、乙、丙、丁）、有變的同學的分數變化：' + mt);
    ok(mt.includes('略過 1 則') && mt.includes('不採用或重複') && mt.includes('要寫給學生的回覆') && mt.includes('不能收回') && mt.includes('沒有名字'), '略過 1 則（對象是不採用）、列出回覆、提醒寄出的信不能收回');
    await clickModal(p, 'no'); await p.waitForTimeout(250);
    ok(await flagWrites(p) === w0 && await p.$$eval('[data-sugg]', e => e.length) === 5, '取消：沒寫入，建議都還在');
    await p.click('[data-bx="all"]'); await p.waitForSelector('[data-modal]'); await clickModal(p, 'ok'); await p.waitForTimeout(1200);
    const st = async f => (await FSV(p, 'mg_nw_flags/' + f)).status;
    ok(await st(F.f1) === 'approved' && await st(F.f2) === 'dup' && await st(F.f3) === 'approved' && await st(F.f4) === 'rejected', '採用後：確認 2、重複 1、不採用 1 都寫進去了');
    ok(await st(F.f5) === 'pending' && await st(F.f8) === 'pending', '略過的與沒有建議的維持待審');
    const bA = await FSV(p, 'mg_bugboard/' + A), bC = await FSV(p, 'mg_bugboard/' + Cc);
    ok(bA.score === 4 && bA.n === 2 && bC.score === 3 && bC.n === 1, '抓蟲榜分數：甲 2→4、丙 0→3');
    ok((await FSV(p, 'mg_mail/bug_' + F.f1)) && (await FSV(p, 'mg_mail/bug_' + F.f1)).items[0].n === 30 && (await FSV(p, 'mg_mail/bug_' + F.f3)).items[0].n === 45 && (await FSV(p, 'mg_mail/bug_' + F.f2)).items.length === 0 && (await FSV(p, 'mg_mail/bug_' + F.f2)).body.includes('老師已經收到其他同學的回報') && (await FSV(p, 'mg_mail/bugr_' + F.f4)), '各自的信：獎勵信（中 30、大 45 字元）、重複的感謝信、不採用回覆信');
    const L = await logs(p);
    ok(L.filter(l => l.act === '確認回報').length === 2 && L.filter(l => l.act === '回報標成重複').length === 1 && L.filter(l => l.act === '不採用回報').length === 1 && L.some(l => l.act === '採用建議' && l.summary.includes('4 則')), '每一則寫一筆紀錄，另有一筆「採用建議」總結');
    ok(await p.$$eval('[data-sugg]', e => e.length) === 1 && (await T(p, '[data-bx-allbox]')).includes('有 1 則'), '還剩略過那 1 則的建議（沒有消失，老師可以個別處理）');
    /* 再按一次全部採用：剩下的是要略過的，不會重複寫 */
    const w1 = await flagWrites(p);
    await p.click('[data-bx="all"]'); await p.waitForTimeout(500);
    ok(await modalOpen(p) === 0 && await flagWrites(p) === w1, '剩下的建議對象有問題：不跳確認也不寫入，只提醒');
    noErr(p); await p.close();
  }

  /* ═══ 勾選「連已審過的」＋ 不合法的建議（畫面）═══ */
  {
    const p = await teacher(browser, seed());
    await tab(p, 'bugs');
    await p.check('[data-bx-rev]'); await build(p); const ex = await exportObj(p), r = k => ridBy(ex, k);
    ok(ex.rows.length === 7 && ex.rows.some(x => x.status === 'approved' && x.sev === 2), '勾選後匯出多一則已審過的（approved、sev 2）');
    ok(leaks(JSON.stringify(ex)).length === 0, '含已審過的也沒有身分字串');
    await doImport(p, { suggestions: [
      sg(r('郵筒'), 'approve', { sev: 1 }), sg(r('連點三次'), 'dup', { dupOf: r('郵筒'), note: '跟已審過的一樣' }), sg(r('商店'), 'approve', { sev: 5 }), sg(r('Enter'), 'dup', { dupOf: 'NOTINBATCH' })
    ] });
    const sk = await T(p, '[data-bx-skip]');
    ok(await T(p, '[data-bx-ok]').then(t => t.includes('已匯入 1 則')) && sk.includes('略過 3 列') && sk.includes('已經審核過了') && sk.includes('sev 要是 1、2、3') && sk.includes('不在這批匯出裡'), '混合：1 則收進來、3 則略過各有原因：' + sk);
    ok(await modalOpen(p) === 0 && await p.$$eval('[data-sugg]', e => e.length) === 1, '頁面沒壞，只有合法那則出現建議');
    /* 對象是已審過的 → 預填的下拉選到那一則 */
    await p.click(`[data-usesugg="${F.f1}"]`); await p.waitForSelector('[data-modal]');
    ok(await p.$eval('[data-dupof]', s => s.value) === F.f6, '「跟已審過的那則一樣」：下拉預選那一則');
    await clickModal(p, 'no');
    /* 非 JSON、空白 */
    await doImport(p, '這不是 JSON');
    ok((await T(p, '[data-bx-err]')).includes('不是正確的 JSON'), '貼非 JSON：清楚的錯誤');
    await doImport(p, '');
    ok((await T(p, '[data-bx-err]')).includes('還沒貼上內容'), '空白：提示貼上內容');
    await doImport(p, '{"suggestions": 5}');
    ok((await T(p, '[data-bx-err]')).includes('格式不對'), 'suggestions 不是陣列：格式不對');
    /* 選擇檔案 */
    const dir = fs.mkdtempSync(path.join(OUT, 't7-')), fp = path.join(dir, 'sugg.json');
    fs.writeFileSync(fp, JSON.stringify({ suggestions: [sg(r('商店'), 'reject', { note: '檔案匯入' })] }));
    await p.setInputFiles('[data-bx-file]', fp); await p.waitForTimeout(400);
    ok((await T(p, '[data-bx-ok]')).includes('已匯入 1 則') && (await T(p, `[data-flag="${F.f8}"] [data-sugg]`)).includes('檔案匯入') && (await p.$eval('[data-bx-in]', e => e.value)).includes('檔案匯入'), '選擇檔案匯入：內容進輸入框、建議出現');
    fs.rmSync(dir, { recursive: true, force: true });
    /* 清除 */
    await p.click('[data-bx="clear"]'); await p.waitForSelector('[data-modal]'); await clickModal(p, 'ok'); await p.waitForTimeout(250);
    ok(await p.$$eval('[data-sugg]', e => e.length) === 0 && await p.evaluate(() => JSON.parse(sessionStorage.getItem('typehero.bugSuggest') || '{}')).then(o => Object.keys(o).length === 0) && await flagWrites(p) === 0, '清除全部建議：畫面與 sessionStorage 都清掉，回報沒動');
    ok((await logs(p)).length === 0, '整段匯入／預填／清除，沒有寫操作紀錄（只有匯出下載／複製才寫）');
    noErr(p); await p.close();
  }

  /* ═══ 沒有對照表（分頁關過）═══ */
  {
    const p = await teacher(browser, seed());
    await tab(p, 'bugs');
    await doImport(p, { suggestions: [sg('ABCD2345', 'approve', { sev: 1 })] });
    const e1 = await T(p, '[data-bx-err]');
    ok(e1.includes('找不到編號對照表') && e1.includes('關掉分頁') && e1.includes('重新按「匯出待審回報」') && await p.$('[data-sugg]') === null, '從沒匯出過就匯入：清楚的錯誤與重新匯出的指引：' + e1);
    await build(p); const ex = await exportObj(p);
    /* 模擬關掉分頁再開：sessionStorage 清掉＋整頁重載（記憶體那份也沒了） */
    await p.evaluate(() => sessionStorage.clear()); await p.reload(); await p.waitForSelector('#app:not(.hidden)'); await ready(p); await tab(p, 'bugs');
    await doImport(p, { suggestions: ex.rows.map(r => sg(r.rid, 'reject', {})) });
    const e2 = await T(p, '[data-bx-err]');
    ok(e2.includes('找不到編號對照表') && e2.includes('重新按「匯出待審回報」') && await p.$('[data-sugg]') === null && await flagWrites(p) === 0, '分頁關過（sessionStorage 沒了）：整份拒絕並教怎麼重來，沒有任何建議、沒寫入');
    await build(p); const ex2 = await exportObj(p);
    ok(ex2.rows.every(r => !ex.rows.some(q => q.rid === r.rid)), '重新匯出：換一組新的 rid');
    /* 重新整理（分頁還在）：對照表還在 sessionStorage，可以匯入 */
    await p.reload(); await p.waitForSelector('#app:not(.hidden)'); await ready(p); await tab(p, 'bugs');
    await doImport(p, { suggestions: [sg(ex2.rows[0].rid, 'reject', { note: '重新整理後還能匯入' })] });
    ok((await T(p, '[data-bx-ok]')).includes('已匯入 1 則'), '只是重新整理（分頁沒關）：對照表還在，可以匯入');
    noErr(p); await p.close();
  }

  /* ═══ 空狀態 ═══ */
  {
    const p = await teacher(browser, seed({ empty: true }));
    await tab(p, 'bugs');
    ok((await T(p, '[data-bx-empty]')).includes('目前沒有待審核的回報，所以沒有東西可以匯出') && await p.$eval('[data-bx="build"]', b => b.disabled), '沒有待審：友善提示、匯出鈕停用');
    ok((await T(p, '[data-reports]')).includes('沒有待審核的回報') && await p.$('[data-bx-pre]') === null, '回報清單也是空狀態；沒有匯出內容');
    await p.check('[data-bx-rev]'); await p.waitForTimeout(100);
    ok(await p.$eval('[data-bx="build"]', b => !b.disabled) && (await T(p, '[data-bx-count]')).includes('0 則待審核') && (await T(p, '[data-bx-count]')).includes('1 則已經審過'), '勾「連已審過的」：有一則已審過，可以匯出');
    await build(p); const ex = await exportObj(p);
    ok(ex.rows.length === 1 && ex.meta.pending === 0 && ex.rows[0].status === 'approved', '只匯出已審過的 1 則（待審 0）');
    await p.uncheck('[data-bx-rev]'); await p.waitForTimeout(100);
    ok((await T(p, '[data-bx-empty]')).includes('沒有待審核') , '取消勾選：又回到空狀態');
    noErr(p); await p.close();
    const p2 = await teacher(browser, { 'mg_admins/T1': { ok: true } }); await tab(p2, 'bugs');
    ok(await p2.$eval('[data-bx="build"]', b => b.disabled) && (await T(p2, '[data-bx-empty]')).includes('沒有待審核'), '完全沒有資料也不壞');
    noErr(p2); await p2.close();
  }

  /* ═══ 手機 390 ═══ */
  {
    const p = await teacher(browser, seed(), { mobile: true }); await tab(p, 'bugs');
    const m0 = () => p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, bw: document.body.scrollWidth }));
    let m = await m0();
    ok(m.sw <= m.iw && m.bw <= m.iw, `手機 390：區塊未匯出時不橫向捲動（${JSON.stringify(m)}）`);
    await build(p); const ex = await exportObj(p), r = k => ridBy(ex, k);
    await p.evaluate(() => document.querySelector('[data-bx-view]').open = true); await p.waitForTimeout(100);
    m = await m0();
    const box = await p.evaluate(() => { const o = document.querySelector('[data-bugexp]').getBoundingClientRect(), bs = [...document.querySelectorAll('[data-bx]')].map(b => b.getBoundingClientRect().right); return { r: o.right, b: Math.max(...bs), iw: innerWidth }; });
    ok(m.sw <= m.iw && m.bw <= m.iw && box.r <= box.iw + 1 && box.b <= box.iw, `手機：匯出預覽（展開內容）與按鈕在畫面內（${JSON.stringify([m, box])}）`);
    await doImport(p, { suggestions: [sg(r('連點三次'), 'approve', { sev: 2, note: '很長的理由'.repeat(20), reply: '回覆' }), sg(r('很快點裝備'), 'dup', { dupOf: r('連點三次') }), sg('BADBADXX', 'reject')] });
    m = await m0();
    const card = await p.evaluate(f => { const c = document.querySelector(`[data-flag="${f}"]`).getBoundingClientRect(), s = document.querySelector(`[data-flag="${f}"] [data-sugg]`).getBoundingClientRect(); return { cr: c.right, sr: s.right, iw: innerWidth }; }, F.f1);
    ok(m.sw <= m.iw && m.bw <= m.iw && card.cr <= card.iw + 1 && card.sr <= card.iw, `手機：匯入結果與回報卡上的建議不橫向捲動（${JSON.stringify([m, card])}）`);
    await p.click(`[data-usesugg="${F.f1}"]`); await p.waitForSelector('[data-modal]');
    ok(await p.evaluate(() => { const r = document.querySelector('.mdl>.px-panel').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && document.documentElement.scrollWidth <= innerWidth; }), '手機：預填的確認視窗放得下');
    await clickModal(p, 'no'); await p.waitForTimeout(150);
    await p.click('[data-bx="all"]'); await p.waitForSelector('[data-modal]');
    ok(await p.evaluate(() => { const r = document.querySelector('.mdl>.px-panel').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && document.documentElement.scrollWidth <= innerWidth; }), '手機：「全部採用」確認視窗放得下');
    await clickModal(p, 'no'); noErr(p); await p.close();
  }
  await browser.close();
  console.log(fails ? `\n${fails} FAIL` : '\n全部通過');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
