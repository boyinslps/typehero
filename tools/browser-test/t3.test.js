/* 教師管理頁審查後的修正（docs/research/TEACHER-ADMIN-REVIEW.md 的必改 M1～M6、建議 S1～S5）。
   M1 老師的字與真名不進學生讀得到的 mg_bugboard、M2 注音輸入、M3 信箱防呆、M4 視窗不誤關、M5 重新排名、M6 待發獎提醒；
   S1 班級快覽、S2 多人加分與搜尋、S3 活動表單、S4 手機、S5 白話與空狀態。
   全程開 window.__RULES，測試資料一律用假名。 */
const { chromium } = require('playwright'); const fs = require('fs');
const path = require('path'); const M = path.join(__dirname, 'mock') + '/'; const OUT = process.argv[2] || require('os').tmpdir();
const css = require('./tw.js')(OUT);
/* 最新一則改版公告的 id：發新公告時不用回來改測試（「已讀」的種子資料要等於它，不然會跳公告、冒「！」） */
const NOTICE_ID = /export const NOTICES = \[\s*\{ id: '([^']+)'/.exec(fs.readFileSync(path.join(__dirname, '../../nw-data.js'), 'utf8'))[1];
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const NOW = Date.now(), H = 3600000, D = 24 * H;
const C3 = '五年級3班', C4 = '五年級4班', ID5 = C3 + '_5號', ID6 = C3 + '_6號', ID7 = C3 + '_7號', ID11 = C4 + '_11號', ID12 = C4 + '_12號', ID13 = C4 + '_13號', ID14 = C4 + '_14號';
const p2 = n => String(n).padStart(2, '0');
const inp = ms => { const d = new Date(ms); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}`; };

const route = p => p.route('**/*', r => {
  const u = r.request().url();
  if (u.startsWith('http://localhost')) return r.continue();
  if (u.includes('cdn.tailwindcss.com')) return r.fulfill({ contentType: 'application/javascript', body: `const s=document.createElement('style');s.textContent=${JSON.stringify(css)};document.head.appendChild(s);` });
  const m = u.includes('firebase-app') ? 'app.js' : u.includes('firebase-auth') ? 'auth.js' : u.includes('firebase-firestore') ? 'fs.js' : null;
  if (m) return r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(M + m, 'utf8') });
  return r.abort();
});
async function teacher(browser, seed, o = {}) {
  const p = await browser.newPage({ viewport: o.mobile ? { width: 390, height: 800 } : { width: 1280, height: 900 } });
  const errs = []; p.errs = errs;
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|Missing or insufficient|permission/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.addInitScript(a => { window.__FS = a.s; window.__RULES = true; localStorage.clear(); window.__ADMIN_PRESIGNED = { uid: 'T1', email: 'teacher@example.test' }; }, { s: seed });
  await route(p);
  await p.goto('http://localhost:8765/teacher.html');
  await p.waitForSelector('#app:not(.hidden)', { timeout: 8000 }); await ready(p);
  return p;
}
const ready = p => p.waitForFunction(() => { const m = document.querySelector('#main'); return m && m.textContent && !m.textContent.includes('讀取中…') && m.children.length > 0; }, null, { timeout: 8000 }).then(() => p.waitForTimeout(150));
const tab = async (p, id) => { await p.click(`#nav [data-tab="${id}"]`); await p.waitForTimeout(120); await ready(p); };
const FS = (p, k) => p.evaluate(k => window.__FS[k], k);
const allFS = p => p.evaluate(() => JSON.parse(JSON.stringify(window.__FS)));
const keys = (p, pre) => p.evaluate(pre => Object.keys(window.__FS).filter(k => k.startsWith(pre)), pre);
const docsOf = (p, pre) => p.evaluate(pre => Object.entries(window.__FS).filter(([k]) => k.startsWith(pre)).map(([k, v]) => Object.assign({ _id: k.slice(pre.length) }, v)), pre);
const clickModal = (p, id) => p.evaluate(id => { const ms = document.querySelectorAll('[data-modal]'); ms[ms.length - 1].querySelector(`[data-btn="${id}"]`).click(); }, id);
const modalText = p => p.evaluate(() => { const ms = document.querySelectorAll('[data-modal]'); return ms.length ? ms[ms.length - 1].textContent.replace(/\s+/g, ' ') : ''; });
const modalOpen = p => p.evaluate(() => document.querySelectorAll('[data-modal]').length);
const waitModal = p => p.waitForSelector('[data-modal]', { timeout: 4000 });
const noErr = (p, m = '沒有 JS 錯誤') => ok(p.errs.length === 0, m + ' ' + p.errs.join(' | '));
const mainText = p => p.textContent('#main').then(t => t.replace(/\s+/g, ' '));
const evMails = async (p, pre) => (await docsOf(p, 'mg_mail/')).filter(m => m._id.startsWith(pre));
const logsOf = async p => (await docsOf(p, 'mg_admin_log/')).sort((a, b) => a.t - b.t);
const num = (p, k) => p.textContent(`[data-card="${k}"] b`).then(t => t.replace(/\s+/g, ' ').trim());

/* ── 學生頁（用老師頁寫完的資料） ── */
async function student(browser, sd) {
  const p = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const errs = []; p.errs = errs; p.on('dialog', d => d.accept());
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|Missing or insufficient|permission/.test(m.text())) errs.push('console: ' + m.text()); });
  const { sha256Hex } = await import('../../nw-access.js');
  const hash = await sha256Hex('Test-Pass_9!x');
  await p.addInitScript(a => {
    window.__FS = a.s; window.__RULES = true; localStorage.clear(); localStorage.setItem('mg_nw_fast', '1');
    window.__NW_CODE_HASH__ = a.hash; localStorage.setItem('mg_nw_code', a.hash); window.__NW_NOGIFT__ = true; window.__NW_NOINTRO__ = true;
    window.confetti = () => {}; window.html2canvas = async () => document.createElement('canvas');
  }, { s: sd, hash });
  await route(p);
  await p.goto('http://localhost:8765/index.html'); await p.waitForFunction(() => window.__NWG, null, { timeout: 15000 }); await p.waitForTimeout(500);
  await p.selectOption('#in-grade', '五年級'); await p.selectOption('#in-class', '3班'); await p.fill('#in-seat', '5'); await p.waitForTimeout(900);
  await p.click('#btn-enter'); await p.waitForTimeout(1000);
  await p.click('#nw-door'); await p.waitForTimeout(1800);
  await dismissGifts(p);
  return p;
}
const nwLocal = p => p.evaluate(() => JSON.parse(JSON.stringify(window.__NWG.nw)));
const openMail = async p => { await p.click('.vb[data-bld="mail"]'); await p.waitForSelector('#nw-mail', { timeout: 4000 }); await p.waitForFunction(() => !document.querySelector('#nw-mail [data-msg]') || document.querySelector('#nw-mail [data-msg]').textContent !== '讀信中…', null, { timeout: 4000 }); await p.waitForTimeout(200); };
const mailIds = p => p.$$eval('#nw-mail [data-mail]', els => els.map(e => e.dataset.mail));
const dismissGifts = async p => { for (let i = 0; i < 14; i++) { if (!(await p.$('#nw-gift'))) break; await p.click('#nw-gift [data-ok]'); await p.waitForTimeout(150); } };
const openNotice = async (p, t) => { await p.click('[data-act="notice"]'); await p.waitForSelector('#nw-notice'); await p.click(`#nw-notice [data-ntab="${t}"]`); await p.waitForTimeout(900); };


/* ── 這支檔案專屬的資料與小工具 ── */
const MIN = 60000;
const ev = (o = {}) => Object.assign({ type: 'boost', mul: 2, what: 'exp', title: '加倍', desc: '', startAt: NOW - H, endAt: NOW + 3 * D, cls: [] }, o);
const stu3 = (cls, seat, name, o = {}) => [`mg_scores/${cls}_${seat}號`, Object.assign({ className: cls, seat, name, nwCls: cls, bestLevel: 10, bestScore: 20, scoreVer: 2, plays: 9, tutorialDone: true, talentIntroDone: true, tier: 'B', balanceVer: 3, punctDone: true, lastPlayedAt: { __ts: o.last === undefined ? NOW : o.last } },
  o.nw === null ? {} : { nw: Object.assign({ v: 1, savedAt: o.last === undefined ? NOW : o.last, look: { style: 1, hair: 2, skin: 1 }, starter: 'dagger', quest: { done: ['1-0', '1-0a'] }, items: { potion: 3 }, intro: { hub: 1, mail: 1, notice: 1 }, seenNotice: NOTICE_ID, name0: name, nick: ['a_flash', 'b_coo'] }, o.nw || {}) }, o.top || {})];
const flag3 = (id, o) => [`mg_nw_flags/${id}`, Object.assign({ type: 'bug', status: 'pending', docId: ID5, cls: C3, seat: 5, name: '小明', cat: '畫面', did: '做了事', what: '壞了', t: NOW - H }, o)];
const ID45 = C4 + '_5號';
const rkEv = (title, o) => ev(Object.assign({ type: 'ranking', metric: 'improve', mk: 'frog', title, startAt: NOW - 10 * D, endAt: NOW - D }, o || {}));
const snapOf = () => ({ at: NOW - H, metric: 'improve', rows: [
  { id: ID5, nick: '', s: 40, n: 4, warn: false, pick: true, rank: 1, pos: 1 }, { id: ID6, nick: '', s: 30, n: 3, warn: false, pick: true, rank: 2, pos: 2 }],
  parts: [], prizes: { t1: [{ type: 'coins', n: 100 }], t23: [{ type: 'coins', n: 50 }], t410: [] }, part: [] });
const evMail = (id, src) => [`mg_mail/${id}`, { aud: ['id:' + ID5], title: '第 1 名：獎', body: '', items: [{ type: 'coins', n: 100 }], from: '老師', sendAt: NOW - H, expireAt: 0, t: NOW - H, src }];

function seed3() {
  return Object.fromEntries([
    ['mg_admins/T1', { ok: true }],
    stu3(C3, 5, '小明', { last: NOW - 2 * MIN, nw: { hr: 7, coins: 120, hunts: 10, stat: { wins: 8, fails: 2 }, ev: { hu1: { n: 2, e: NOW + D } } } }),
    stu3(C3, 6, '小華', { last: NOW - 3 * D, nw: { hr: 3, stat: { wins: 1, fails: 5 }, hunts: 6, ev: { hu1: { n: 1, e: NOW + D } } } }),
    stu3(C3, 7, '阿強', { last: NOW - 2 * D, nw: null }),
    stu3(C4, 5, '小莉', { last: NOW - 3 * MIN, nw: { hr: 4, stat: { wins: 4, fails: 1 } } }),
    ['mg_config/class_sizes', { sizes: { [C3]: 4 }, t: NOW }],
    ['mg_mail/old1', { aud: ['all'], title: '舊標題', body: '', items: [], from: '老師', sendAt: NOW - 2 * D, expireAt: 0, t: NOW - 2 * D, src: 'manual' }],
    ['mg_events/hu1', ev({ type: 'hunt', mk: 'coo', minStar: 1, goal: 5, items: [{ type: 'coins', n: 100 }], title: '咕咕鳥大量出沒', desc: '打 5 隻', endAt: NOW + 5 * D })],
    ['mg_events/bo1', ev({ title: '本週經驗加倍', endAt: NOW + 5 * D })],
    ['mg_events/RKX', rkEv('進步獎一', { result: snapOf() })],
    ['mg_events/RKY', rkEv('進步獎二', { result: snapOf() })],
    ['mg_events/RKZ', rkEv('進步獎三', { awarded: true })],
    evMail('ev_RKX_1', 'event:RKX'),
    flag3('cf1', { t: NOW - 3 * H }), flag3('cf2', { docId: ID6, cls: C3, seat: 6, name: '小華', t: NOW - 2 * H }), flag3('cf3', { docId: ID7, cls: C3, seat: 7, name: '阿強', t: NOW - H })
  ]);
}

/* 用 Chrome 的 IME 事件模擬注音輸入：先送「還沒選字」的注音（isComposing），再送選好的字 */
async function imeType(p, sel, bopomofo, committed) {
  await p.click(sel);
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Input.imeSetComposition', { text: bopomofo, selectionStart: bopomofo.length, selectionEnd: bopomofo.length });
  await p.waitForTimeout(120);
  const mid = await p.$eval(sel, e => ({ v: e.value, same: e.__mark === 1 }));
  await cdp.send('Input.insertText', { text: committed });
  await p.waitForTimeout(150);
  const end = await p.$eval(sel, e => ({ v: e.value, same: e.__mark === 1 }));
  await cdp.detach();
  return { mid, end };
}
const markInput = (p, sel) => p.$eval(sel, e => { e.__mark = 1; });
const rowCount = (p, tbody = '[data-tbody] tr[data-id]') => p.$$eval(tbody, r => r.length);
const backdrop = p => p.click('[data-modal]:last-of-type', { position: { x: 4, y: 4 } });
const wideWords = ['快照', 'SPEC', '一次搬移', '活動 ID', '欄位名稱', '§'];

(async () => {
  const browser = await chromium.launch();

  /* ═══ M6：已結束沒發獎的排行榜，總覽與活動頁都要提醒 ═══ */
  {
    const T = await teacher(browser, seed3());
    ok(await num(T, 'award') === '2', 'M6 總覽「待發獎」卡：RKX、RKY 結束了還沒發獎＝2（RKZ 已發獎、進行中的不算）');
    const todo = (await T.textContent('[data-todolist]')).replace(/\s+/g, ' ');
    ok(todo.includes('進步獎一') && todo.includes('進步獎二') && !todo.includes('進步獎三') && todo.includes('還沒發獎'), 'M6 「今天要做的事」列出每個待發獎的排行榜：' + todo);
    ok(todo.includes('3 則回報等你審核'), '總覽「今天要做的事」也列出待審回報');
    await T.click('[data-todo-k="award"]'); await ready(T); await T.waitForTimeout(200);
    ok(await T.$('[data-evinfo]') !== null && (await T.textContent('#main h2')).includes('進步獎一'), 'M6 點待辦直接開那個活動的詳細頁（可以直接按發獎）');
    await tab(T, 'events');
    const pa = (await T.textContent('[data-pendaward]')).replace(/\s+/g, ' ');
    ok(pa.includes('有 2 個排行榜活動結束了，還沒發獎') && (await T.$$('[data-pendaward] [data-open]')).length === 2, 'M6 活動分頁頂端提醒「有 2 個排行榜活動結束了，還沒發獎」，每個都有「去發獎」：' + pa);
    const chips = await T.$$eval('[data-evtable="ended"] tr[data-eid]', r => r.map(x => [x.dataset.eid, !!x.querySelector('[data-chip-pend]')]));
    ok(chips.filter(c => c[1]).length === 2 && chips.slice(0, 2).every(c => c[1]) && chips[2][0] === 'RKZ' && !chips[2][1], 'M6 已結束的列表：待發獎的有黃色 chip 並排最前面，已發獎的沒有：' + JSON.stringify(chips));
    await T.click('[data-pendaward] [data-open="RKY"]'); await T.waitForTimeout(150);
    ok((await T.textContent('#main h2')).includes('進步獎二'), 'M6 提醒上的按鈕直接開那個活動');
    noErr(T); await T.close();
  }

  /* ═══ M5：重新排名不能蓋掉已經寄出的信 ═══ */
  {
    const T = await teacher(browser, seed3());
    await tab(T, 'events'); await T.click('[data-evtable="ended"] [data-open="RKX"]'); await T.waitForSelector('[data-sent-n]');
    const sn = (await T.textContent('[data-snapnote]')).replace(/\s+/g, ' ');
    ok((await T.textContent('[data-sent-n]')) === '1' && sn.includes('存檔裡共 2 封') && sn.includes('還差 1 封'), 'M5 名次存檔做好但沒寄完：畫面寫「已經寄出 1 封（存檔裡共 2 封）」：' + sn);
    await T.click('[data-snapnote] summary'); ok((await T.textContent('[data-snapnote]')).includes('第 1 名'), 'M5 可以展開看寄給誰了');
    const txt0 = await mainText(T);
    ok(!wideWords.some(w => txt0.includes(w)) && (await T.textContent('[data-resnap]')) === '重新排名' && (await T.textContent('[data-award-btn]')) === '照名次存檔繼續寄', 'M5 按鈕與說明改成白話（重新排名、照名次存檔繼續寄），沒有「快照」');
    await T.click('[data-resnap]'); await waitModal(T);
    const mt = await modalText(T);
    ok(mt.includes('不能重新排名') && mt.includes('1 封獎品信寄出去了') && !mt.includes('還沒寄出任何信'), 'M5 已經有信寄出：拒絕重新排名，說明原因：' + mt);
    await clickModal(T, 'ok'); await T.waitForTimeout(200);
    ok(await modalOpen(T) === 0 && !!(await FS(T, 'mg_events/RKX')).result && (await FS(T, 'mg_mail/ev_RKX_1')).title === '第 1 名：獎', 'M5 名次存檔和已寄出的信都沒被動');
    /* 照存檔繼續寄：已經寄出的不變、補寄剩下的 */
    const m1 = JSON.stringify(await FS(T, 'mg_mail/ev_RKX_1'));
    await T.click('[data-award-btn]'); await waitModal(T); await clickModal(T, 'ok'); await waitModal(T); await T.waitForTimeout(100); await clickModal(T, 'ok'); await T.waitForTimeout(700);
    const evm = await evMail(T, 'ev_RKX_'), evm1 = (await docsOf(T, 'mg_mail/')).filter(m => m._id.startsWith('ev_RKX_'));
    ok(evm1.length === 2 && (await FS(T, 'mg_events/RKX')).awarded === true, 'M5 照名次存檔繼續寄：補齊 2 封、awarded 寫好');
    /* 還沒有任何信寄出的：可以重新排名 */
    await T.click('[data-back]').catch(() => {}); await tab(T, 'events'); await T.click('[data-evtable="ended"] [data-open="RKY"]'); await T.waitForSelector('[data-sentinfo]'); await T.waitForTimeout(200);
    ok((await T.textContent('[data-sentinfo]')).includes('還沒有任何獎品信寄出'), 'M5 沒有信寄出的存檔：畫面寫「還沒有任何獎品信寄出」');
    await T.click('[data-resnap]'); await waitModal(T);
    ok((await modalText(T)).includes('目前沒有任何獎品信寄出，可以安全重做') && !(await modalText(T)).includes('快照'), 'M5 沒信寄出時的確認文字：說明目前沒有信寄出、白話');
    await clickModal(T, 'ok'); await T.waitForTimeout(500);
    ok(!(await FS(T, 'mg_events/RKY')).result, 'M5 沒信寄出：重新排名成功，存檔刪掉');
    ok((await logsOf(T)).some(l => l.act.includes('重新排名')), 'M5 重新排名寫了操作紀錄');
    noErr(T); await T.close();
  }

  /* ═══ M1：老師打的字與真名不進學生讀得到的 mg_bugboard ═══ */
  {
    const T = await teacher(browser, seed3());
    await tab(T, 'bugs');
    /* 確認：回覆提醒、回覆寄成信 */
    await T.click('[data-confirm="cf1"]'); await waitModal(T);
    ok((await modalText(T)).includes('回覆所有同學都可能看到，不要寫名字') && await T.$('[data-modal][data-sticky]') !== null, 'M1 確認視窗的回覆欄寫明「所有同學都可能看到，不要寫名字」，而且是 sticky（M4）');
    await T.fill('[data-reply]', '謝謝你，已經修好了'); await clickModal(T, 'ok'); await T.waitForTimeout(700);
    const bb1 = await FS(T, 'mg_bugboard/' + ID5), bm1 = await FS(T, 'mg_mail/bug_cf1');
    ok(bb1.reports[0].reply === '謝謝你，已經修好了' && bm1 && bm1.body.includes('老師說：謝謝你，已經修好了') && bm1.aud[0] === 'id:' + ID5, 'M1 回覆留在 reports（學生看得到），同時寄信給本人（bug_cf1 的 body 有「老師說：…」）');
    /* 不採用：有回覆才寄信，用 bugr_ */
    await T.click('[data-reject="cf2"]'); await waitModal(T);
    ok((await modalText(T)).includes('不要寫名字'), 'M1 不採用視窗也有同一行提醒');
    await T.fill('[data-reply]', '這是設計成這樣的'); await clickModal(T, 'ok'); await T.waitForTimeout(700);
    await T.click('[data-reject="cf3"]'); await waitModal(T); await clickModal(T, 'ok'); await T.waitForTimeout(700);
    const rj = await FS(T, 'mg_mail/bugr_cf2');
    ok(rj && rj.body.includes('老師說：這是設計成這樣的') && await FS(T, 'mg_mail/bugr_cf3') === undefined && await FS(T, 'mg_mail/bug_cf2') === undefined, 'M1 不採用：有寫回覆才寄信（bugr_cf2，不佔 bug_ 的信件代號）；沒寫回覆不寄信');
    const snapStu = await allFS(T);   // 學生端要看的是「剛確認完、回覆寄出去」的狀態
    /* 多人手動加分 */
    await T.click('[data-bonus]'); await waitModal(T);
    await T.fill('[data-q]', '503 5'); await T.waitForTimeout(150);
    ok((await T.$$('[data-cands] [data-pick]')).length === 1, 'S2 加分視窗搜尋「503 5」只找到 503 班 5 號一位');
    await T.check(`[data-pick="${ID5}"]`);
    await T.fill('[data-q]', '503 6'); await T.waitForTimeout(150); await T.check(`[data-pick="${ID6}"]`);
    ok((await T.$$('[data-chips] .chip')).length === 2 && (await T.textContent('[data-nchosen]')) === '2', 'S2 可以多選：已選 2 人，晶片列出');
    const bw = await T.$eval('[data-pts]', e => e.getBoundingClientRect().width);
    ok(bw >= 120 && (await T.getAttribute('[data-pts]', 'placeholder')) === '例 2 或 -1', 'S2 分數欄夠寬，提示「例 2 或 -1」不會被截斷（寬 ' + Math.round(bw) + '）');
    await T.fill('[data-pts]', '2'); await clickModal(T, 'ok'); await T.waitForTimeout(100);
    ok((await T.textContent('[data-berr]')).includes('請寫理由') && await modalOpen(T) === 1, '沒寫理由：擋下');
    await T.fill('[data-why]', '下課口頭回報給老師'); await clickModal(T, 'ok'); await T.waitForTimeout(900);
    const pb5 = await FS(T, 'mg_bugboard/' + ID5), pb6 = await FS(T, 'mg_bugboard/' + ID6), pv5 = await FS(T, 'mg_bugboard_private/' + ID5), pv6 = await FS(T, 'mg_bugboard_private/' + ID6);
    ok(pb5.bonus === 2 && pb6.bonus === 2 && pb5.score === 3 && pb6.score === 2 && !('notes' in pb5) && !('notes' in pb6), 'S2 一次加 2 位：bonus、分數都重算（小明 1 分＋2＝3，小華 2）；mg_bugboard 沒有 notes');
    ok(pv5.notes.length === 1 && pv5.notes[0].why === '下課口頭回報給老師' && pv5.notes[0].pts === 2 && pv6.notes[0].why === '下課口頭回報給老師', 'M1 理由只寫進 mg_bugboard_private/{id}.notes');
    const allBoard = JSON.stringify(await docsOf(T, 'mg_bugboard/'));
    ok(!allBoard.includes('口頭回報') && !allBoard.includes('小明') && !allBoard.includes('小華') && !allBoard.includes('阿強') && !/nameOk"/.test(allBoard), 'M1 整個 mg_bugboard 找不到理由、真名、nameOk：' + allBoard.slice(0, 200));
    const bm = (await docsOf(T, 'mg_mail/')).filter(m => m._id.startsWith('bonus_'));
    ok(bm.length === 2 && bm.every(m => m.src === 'bug' && !m.body.includes('口頭') && m.body.includes('+2')) && bm.some(m => m.aud[0] === 'id:' + ID5), 'S2 同時寄感謝信（bonus_{id}_{t}），信裡沒有理由');
    const lg = (await logsOf(T)).filter(l => l.act === '抓蟲手動加分');
    ok(lg.length === 2 && lg.every(l => l.summary.includes('下課口頭回報給老師') && l.summary.includes('共 2 人')), 'M1 理由寫進操作紀錄（老師專用），每位同學一筆');
    const bt = await T.textContent('[data-boardtable]');
    await T.click(`[data-detail="${ID5}"]`); await T.waitForTimeout(100);
    ok((await T.textContent(`[data-detailrow="${ID5}"]`)).includes('下課口頭回報給老師'), 'M1 老師在抓蟲榜明細還是看得到理由（從專用資料讀）');
    /* 不寄感謝信、扣分不寄 */
    await T.click(`[data-bonus-for="${ID5}"]`); await waitModal(T);
    ok(await T.isChecked(`[data-pick="${ID5}"]`), '列上的「加分」預選那位學生');
    await T.fill('[data-pts]', '-1'); await T.fill('[data-why]', '加多了'); await clickModal(T, 'ok'); await T.waitForTimeout(800);
    ok((await docsOf(T, 'mg_mail/')).filter(m => m._id.startsWith('bonus_')).length === 2 && (await FS(T, 'mg_bugboard/' + ID5)).bonus === 1 && (await FS(T, 'mg_bugboard_private/' + ID5)).notes.length === 2, 'S2 扣分不寄感謝信；bonus 2＋(-1)＝1、notes 兩筆');
    /* 回報重算分數時（確認、撤銷）不會把 notes／真名寫進 mg_bugboard */
    await T.click('[data-zone="approved"]'); await T.click('[data-undo="cf1"]'); await waitModal(T); await clickModal(T, 'ok'); await T.waitForTimeout(800);
    ok(!('notes' in (await FS(T, 'mg_bugboard/' + ID5))) && (await FS(T, 'mg_bugboard/' + ID5)).score === 1 && (await FS(T, 'mg_bugboard_private/' + ID5)).notes.length === 2, 'M1 撤銷確認後重算分數：mg_bugboard 還是沒有 notes，專用資料不動');
    /* 學生端：看得到回覆（信）、讀得到的抓蟲榜沒有理由 */
    const S = await student(browser, snapStu);
    await S.click('[data-act="book"]'); await S.waitForTimeout(1500); await dismissGifts(S);
    if (!(await S.$('[data-reports]'))) { await S.click('[data-act="book"]'); await S.waitForTimeout(1200); }
    await S.waitForSelector('[data-reports]', { timeout: 6000 });
    const sr = await S.textContent('[data-reports]');
    ok(sr.includes('老師說：謝謝你，已經修好了'), 'M1 學生端「我的回報」看得到老師的回覆（從寄給本人的信讀）：' + sr.replace(/\s+/g, ' '));
    noErr(S); await S.close();
    noErr(T); await T.close();
  }

  /* ═══ M2：注音輸入（CDP IME）搜尋框不被打斷 ═══ */
  {
    const T = await teacher(browser, seed3());
    await tab(T, 'students');
    await markInput(T, '[data-f="kw"]');
    const n0 = await rowCount(T), r = await imeType(T, '[data-f="kw"]', 'ㄒㄇ', '小明');
    ok(r.mid.same && r.mid.v === 'ㄒㄇ' && await rowCount(T) === 1, 'M2 學生頁：打注音的過程中輸入框沒被換掉、內容是「ㄒㄇ」；選好字後輸入框還是同一個、內容「小明」、列表 1 筆（原本 ' + n0 + '）：' + JSON.stringify(r));
    ok(r.end.same && r.end.v === '小明', 'M2 學生頁：最後輸入框內容剛好是「小明」，沒有殘留注音');
    /* 中途（還沒選字）列表不會被注音洗成 0 筆 */
    await T.fill('[data-f="kw"]', ''); await T.waitForTimeout(100); await markInput(T, '[data-f="kw"]');
    await T.click('[data-f="kw"]'); const cdp = await T.context().newCDPSession(T);
    await cdp.send('Input.imeSetComposition', { text: 'ㄒ', selectionStart: 1, selectionEnd: 1 }); await T.waitForTimeout(120);
    ok(await rowCount(T) === n0, 'M2 打到一半（還沒選字）列表沒有被清成 0 筆，仍是全部 ' + n0 + ' 筆'); await cdp.detach();
    /* 信箱 */
    await tab(T, 'mail'); await T.check('input[name="mode"][value="stu"]'); await markInput(T, '[data-q]');
    const m = await imeType(T, '[data-q]', 'ㄏㄨㄚˊ', '小華');
    ok(m.mid.same && m.end.same && m.end.v === '小華' && (await T.$$('[data-found] [data-add]')).length === 1, 'M2 信箱頁：打注音不換輸入框、選好字「小華」後候選 1 位：' + JSON.stringify(m));
    await T.click(`[data-add="${ID6}"]`); await T.waitForTimeout(100);
    ok((await T.$$('[data-chosen] .chip')).length === 1 && await T.$eval('[data-q]', e => e === document.activeElement), 'M2 信箱頁：加入收件人後游標回到搜尋框');
    /* 抓蟲榜加分視窗 */
    await tab(T, 'bugs'); await T.click('[data-bonus]'); await waitModal(T); await markInput(T, '[data-modal] [data-q]');
    const b = await imeType(T, '[data-modal] [data-q]', 'ㄒㄇ', '小明');
    ok(b.mid.same && b.end.same && b.end.v === '小明' && (await T.$$('[data-cands] [data-pick]')).length === 1, 'M2 手動加分的學生搜尋：同樣不被打斷、找到小明：' + JSON.stringify(b));
    await clickModal(T, 'no');
    noErr(T); await T.close();
  }

  /* ═══ M3：信箱預設不選收件人；全校＋禮物多一道確認；24 小時內重複要提醒 ═══ */
  {
    const T = await teacher(browser, seed3());
    await tab(T, 'mail'); const mail0 = (await keys(T, 'mg_mail/')).length;
    ok(await T.$('input[name="mode"]:checked') === null, 'M3 信箱收件人預設一個都不選');
    await T.fill('[data-title]', '測試信'); await T.click('[data-submit]'); await T.waitForTimeout(150);
    ok((await T.textContent('[data-err]')).includes('請先選收件人') && await modalOpen(T) === 0 && (await keys(T, 'mg_mail/')).length === mail0, 'M3 沒選收件人直接按寄出：擋下、不寄');
    ok((await T.textContent('[data-pv]')).includes('還沒選收件人'), 'M3 預覽也寫「還沒選收件人」');
    /* 全校＋禮物 */
    await T.check('input[name="mode"][value="all"]'); await T.selectOption('[data-addgift]', 'coins'); await T.fill('[data-title]', '全校禮物');
    await T.click('[data-submit]'); await waitModal(T);
    ok(!(await modalText(T)).includes('24 小時內'), 'M3 第一次寄：沒有「重複」提醒');
    await clickModal(T, 'ok'); await T.waitForTimeout(150);
    const wt = await modalText(T);
    ok(wt.includes('全校 4 人') && wt.includes('寄出後無法收回已領的東西') && await T.isDisabled('[data-modal]:last-of-type [data-btn="ok"]'), 'M3 全校＋禮物：多一道確認，顯示人數「全校 4 人」，沒勾之前「確認寄出」按不下去：' + wt);
    ok((await keys(T, 'mg_mail/')).length === mail0, 'M3 還沒勾確認：沒有寄出');
    await T.check('[data-wide-ok]'); ok(!(await T.isDisabled('[data-modal]:last-of-type [data-btn="ok"]')), 'M3 勾了才亮');
    await clickModal(T, 'ok'); await T.waitForTimeout(700);
    const sent = (await docsOf(T, 'mg_mail/')).filter(x => x.title === '全校禮物');
    ok(sent.length === 1 && sent[0].aud[0] === 'all' && sent[0].src === 'manual', 'M3 勾了確認後寄出（全校 1 封）');
    /* 24 小時內同標題 */
    await T.check('input[name="mode"][value="all"]'); await T.selectOption('[data-addgift]', 'coins'); await T.fill('[data-title]', '全校禮物');
    await T.click('[data-submit]'); await waitModal(T);
    const rt = await modalText(T);
    ok(rt.includes('24 小時內你已經寄過同標題的信給其中 4 人'), 'M3 24 小時內寄過同標題給重疊對象：預覽上方提醒「已經寄過…其中 4 人」：' + rt.slice(0, 100));
    await clickModal(T, 'no'); await T.waitForTimeout(100);
    /* 兩天前的同標題不提醒；只有文字、全校：不用多一道確認 */
    await T.fill('[data-title]', '舊標題'); await T.click('[data-submit]'); await waitModal(T);
    ok(!(await modalText(T)).includes('24 小時內'), 'M3 兩天前寄過的同標題不提醒');
    await clickModal(T, 'no'); await T.waitForTimeout(100);
    await T.fill('[data-title]', '只有文字');
    /* 先把禮物拿掉 */
    await T.click('[data-del="0"]'); await T.click('[data-submit]'); await waitModal(T); await clickModal(T, 'ok'); await T.waitForTimeout(600);
    ok(await modalOpen(T) === 0 && (await docsOf(T, 'mg_mail/')).some(x => x.title === '只有文字'), 'M3 全校但只有文字：不用多一道確認，直接寄出');
    noErr(T); await T.close();
  }

  /* ═══ M4：有填寫內容的視窗，點背景或按 Esc 先問要不要放棄 ═══ */
  {
    const T = await teacher(browser, seed3());
    await tab(T, 'bugs'); await T.click('[data-bonus]'); await waitModal(T);
    await T.fill('[data-why]', '寫了一半'); await T.fill('[data-pts]', '3');
    await T.mouse.click(5, 5); await T.waitForTimeout(150);
    ok(await modalOpen(T) === 2 && (await modalText(T)).includes('要放棄填的內容嗎？'), 'M4 手動加分：點背景→跳出「要放棄填的內容嗎？」，加分視窗還在底下');
    await clickModal(T, 'no'); await T.waitForTimeout(100);
    ok(await modalOpen(T) === 1 && await T.inputValue('[data-why]') === '寫了一半' && await T.inputValue('[data-pts]') === '3', 'M4 按「繼續填」：回到加分視窗，填的字都還在');
    await T.keyboard.press('Escape'); await T.waitForTimeout(150);
    ok(await modalOpen(T) === 2 && (await modalText(T)).includes('要放棄填的內容嗎？'), 'M4 按 Esc：同樣先問（只問一次）');
    await T.keyboard.press('Escape'); await T.waitForTimeout(150);
    ok(await modalOpen(T) === 1 && await T.inputValue('[data-why]') === '寫了一半', 'M4 在「要放棄嗎？」上按 Esc＝繼續填，不會把底下的視窗一起關掉');
    await T.mouse.click(5, 5); await T.waitForTimeout(100); await clickModal(T, 'ok'); await T.waitForTimeout(150);
    ok(await modalOpen(T) === 0, 'M4 按「放棄」：視窗關掉');
    /* 一般的「確定嗎？」視窗：點背景直接關，不多問 */
    await tab(T, 'events'); await T.click('[data-evtable="active"] [data-del="bo1"]'); await waitModal(T);
    await T.mouse.click(5, 5); await T.waitForTimeout(150);
    ok(await modalOpen(T) === 0, 'M4 一般確認視窗（刪除）：點背景直接取消，不多問');
    /* 發獎視窗 */
    await T.click('[data-evtable="ended"] [data-open="RKY"]'); await T.click('[data-resnap]'); await waitModal(T); await clickModal(T, 'ok'); await T.waitForTimeout(500);
    await T.click('[data-award-btn]'); await waitModal(T);
    ok(await T.$('[data-modal][data-sticky]') !== null, 'M4 發獎視窗是 sticky');
    await T.mouse.click(5, 5); await T.waitForTimeout(150);
    ok(await modalOpen(T) === 2 && (await modalText(T)).includes('要放棄填的內容嗎？'), 'M4 發獎視窗點背景：先問');
    await clickModal(T, 'no'); await T.keyboard.press('Escape'); await T.waitForTimeout(100); await clickModal(T, 'ok'); await T.waitForTimeout(150);
    ok(await modalOpen(T) === 0, 'M4 發獎視窗按 Esc→放棄：關閉');
    noErr(T); await T.close();
  }

  /* ═══ S1／S2：學生頁（班級快覽、相對時間、篩選、搜尋認得「503 5」） ═══ */
  {
    const T = await teacher(browser, seed3());
    await T.click('[data-card="online"]'); await ready(T);
    ok(await T.inputValue('[data-f="quick"]') === 'today' && await rowCount(T) === 2, 'S1 總覽「今天上線」卡片：帶著篩選「今天有上線」進學生頁，只列 2 人（不是全部 4 人）');
    await T.selectOption('[data-f="quick"]', ''); await T.selectOption('[data-f="cls"]', C3); await T.waitForTimeout(100);
    const cv = (await T.textContent('[data-classview]')).replace(/\s+/g, ' ');
    ok(cv.includes('在線 1／4 人') && cv.includes('今天沒上線 2 人') && cv.includes('還沒進新世界 1 人') && cv.includes('勝率偏低 1 人'), 'S1 選一個班：出現班級快覽（在線 1／4、今天沒上線 2、還沒進新世界 1、勝率偏低 1）：' + cv);
    await T.click('[data-quick="notToday"]'); ok(await rowCount(T) === 2, 'S1 快覽的「今天沒上線」點下去變成篩選（2 人）');
    await T.click('[data-quick="lowwin"]'); ok(await rowCount(T) === 1 && (await T.textContent('[data-tbody]')).includes('小華') && (await T.textContent('[data-tbody]')).includes('卡關？'), 'S1 「勝率偏低」篩出小華，列上標「卡關？」');
    await T.click('[data-quick="lowwin"]'); await T.selectOption('[data-f="cls"]', ''); await T.waitForTimeout(100);
    const row = id => T.textContent(`tr[data-id="${id}"]`).then(t => t.replace(/\s+/g, ' '));
    ok(/剛剛|分鐘前/.test(await row(ID5)) && (await row(ID6)).includes('3 天前') && await T.getAttribute(`tr[data-id="${ID5}"] td[title]`, 'title') !== '', 'S1 「最後上線」改成相對時間（剛剛／3 天前），滑過去才是日期');
    ok((await T.textContent('[data-table] thead')).includes('目前任務') && (await row(ID5)).length > 20, 'S1 表格多一欄「目前任務」');
    /* 搜尋 */
    const q = async s => { await T.fill('[data-f="kw"]', s); await T.waitForTimeout(100); return rowCount(T); };
    const res = { a: await q('503 5'), b: await q('504 5'), c: await q('5'), d: await q('5號'), e: await q('小明'), f: await q('503'), g: await q('503 5號'), h: await q('小 明') };   // 空白隔開的詞各自比對，「小 明」也找得到小明
    ok(res.a === 1 && res.b === 1 && res.c === 2 && res.d === 2 && res.e === 1 && res.f === 3 && res.g === 1 && res.h === 1, 'S2 學生頁搜尋：「503 5」1、「504 5」1、「5」只當座號 2、「5號」2、「小明」1、「503」3、「503 5號」1、「小 明」1：' + JSON.stringify(res));
    await tab(T, 'mail'); await T.check('input[name="mode"][value="stu"]');
    await T.fill('[data-q]', '503 5'); await T.waitForTimeout(100);
    ok((await T.$$('[data-found] [data-add]')).length === 1 && (await T.textContent('[data-found]')).includes('小明'), 'S2 信箱頁搜尋也認得「503 5」');
    await T.fill('[data-q]', '找不到的人'); await T.waitForTimeout(100);
    ok((await T.textContent('[data-found]')).includes('找不到'), 'S2 找不到時寫提示');
    noErr(T); await T.close();
  }

  /* ═══ S3：活動表單 ═══ */
  {
    const T = await teacher(browser, seed3());
    await tab(T, 'events');
    ok((await T.$$('[data-tplbar] [data-newtpl]')).length === 6 && await T.$('[data-tplbar] [data-new]') !== null, 'S3 活動頁頂端列出 6 個範本按鈕＋自訂');
    ok((await T.textContent('[data-evtable="active"]')).includes('—'), 'S12a 加倍活動的「參加」欄寫「—」（不記人數），不是 0 人');
    ok(!(await T.textContent('[data-evtable="active"]')).includes('hu1'), 'S3 列表不再顯示活動代號');
    /* 自訂：空白 */
    await T.click('[data-tplbar] [data-new]'); await T.waitForSelector('[data-form]');
    ok(await T.inputValue('[data-f="title"]') === '' && await T.inputValue('[data-f="desc"]') === '', 'S3 自訂活動：標題與說明是空白（不預填範本）');
    ok(await T.$eval('[data-advanced]', d => !d.open) && !(await T.isVisible('[data-f="id"]')), 'S3 活動代號收在「進階」裡，預設收起來');
    await T.click('[data-cancel]');
    /* 範本 → 切類型 */
    await T.click('[data-newtpl="hunt_coo"]'); await T.waitForSelector('[data-form]');
    ok(await T.isChecked('input[name="etype"][value="hunt"]') && await T.inputValue('[data-f="title"]') === '咕咕鳥大量出沒', 'S3 點範本：直接開出類型對的表單、標題先填好');
    await T.check('input[name="etype"][value="ranking"]'); await T.waitForTimeout(100);
    ok(await T.inputValue('[data-f="title"]') === '' && await T.inputValue('[data-f="desc"]') === '', 'S3 切類型：範本自動填的標題與說明清掉（不會殘留「咕咕鳥大量出沒」）');
    ok((await T.inputValue('[data-f="id"]')).startsWith('ranking_'), 'S3 自動產生的活動代號跟著類型換');
    await T.fill('[data-f="title"]', '我自己寫的標題'); await T.check('input[name="etype"][value="classwar"]'); await T.waitForTimeout(100);
    ok(await T.inputValue('[data-f="title"]') === '我自己寫的標題', 'S3 老師自己改過的標題，切類型時保留');
    await T.click('[data-cancel]');
    /* 重複開 */
    await T.click('[data-newtpl="hunt_coo"]'); await T.waitForSelector('[data-form]'); await T.click('[data-submit]'); await waitModal(T);
    const dw = (await modalText(T));
    ok(dw.includes('已經有「咕咕鳥大量出沒」正在進行') && dw.includes('確定還要再開一個'), 'S3 已經有同類型同魔物同對象的進行中活動：預覽上方提醒：' + dw.slice(0, 120));
    await clickModal(T, 'no'); await T.click('[data-cancel]');
    await T.click('[data-newtpl="classwar"]'); await T.waitForSelector('[data-form]'); await T.click('[data-submit]'); await waitModal(T);
    ok(!(await modalText(T)).includes('確定還要再開一個'), 'S3 沒有重複的活動：不提醒');
    await clickModal(T, 'no'); await T.click('[data-cancel]');
    /* 再開一次 */
    await T.click('[data-evtable="active"] [data-again="hu1"]'); await T.waitForSelector('[data-form]');
    ok((await T.textContent('[data-againnote]')).includes('已經達標領過獎的同學，這次達標會再領一次'), 'S3 「再開一次」提示：已經達標領過的人會再領一次');
    await T.click('[data-cancel]');
    /* 刪除顯示參加人數 */
    await T.click('[data-evtable="active"] [data-del="hu1"]'); await waitModal(T);
    ok((await modalText(T)).includes('已經有 2 人參加了'), 'S12b 刪除進行中的活動：視窗寫「已經有 2 人參加了」');
    await clickModal(T, 'no');
    noErr(T); await T.close();
  }

  /* ═══ S4：手機（390 寬） ═══ */
  {
    const T = await teacher(browser, seed3(), { mobile: true });
    const fit = async (sel) => (await T.$$eval(sel, els => els.filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1); }).length));
    await tab(T, 'events');
    ok((await T.$$('[data-evtable="active"] [data-open]')).length >= 1 && await fit('[data-evtable] .px-btn') === 0, 'S4 手機：活動列表的「管理／再開一次／刪除」都在畫面內');
    ok(await T.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'S4 手機：活動頁沒有橫向捲動');
    await tab(T, 'bugs');
    ok(await fit('[data-boardtable] .px-btn') === 0 && await T.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'S4 手機：抓蟲榜的「明細／加分／隱藏暱稱」在畫面內');
    await tab(T, 'mail');
    ok(await fit('[data-mailtable] .px-btn') === 0, 'S4 手機：寄出紀錄的「領取狀況／收回」在畫面內');
    const nav = await T.$eval('#nav', e => getComputedStyle(e).backgroundImage), top = await T.$eval('#top', e => e.getBoundingClientRect().height);
    ok(nav.includes('linear-gradient') && top < 60, 'S4 手機：分頁列有可以滑動的漸層提示；頂端列壓成一行（高 ' + Math.round(top) + '）');
    ok(await T.isVisible('#logout') && await T.$eval('#logout', e => e.getBoundingClientRect().bottom < 60), 'S4 手機：登出鈕在第一行');
    noErr(T); await T.close();
  }

  /* ═══ S5：白話、說明、空狀態 ═══ */
  {
    const T = await teacher(browser, seed3());
    const bad = [];
    for (const id of ['overview', 'students', 'mail', 'events', 'news', 'feedback', 'bugs', 'settings']) {
      await tab(T, id);
      const t = await mainText(T);
      if (wideWords.some(w => t.includes(w))) bad.push(id + ':' + wideWords.filter(w => t.includes(w)).join('／'));
      if (!(await T.$('[data-help]'))) bad.push(id + ':沒有說明');
    }
    ok(bad.length === 0, 'S5 八個分頁：沒有「快照／SPEC／一次搬移／活動 ID」這類工程師用語，每頁都有「？這頁怎麼用」：' + bad.join(' | '));
    await tab(T, 'events'); await T.click('[data-help] summary');
    ok((await T.textContent('[data-help]')).includes('範本'), 'S5 點「？這頁怎麼用」展開說明');
    await T.click('[data-tplbar] [data-new]'); const ft = await mainText(T);
    ok(!wideWords.some(w => ft.includes(w)) && !ft.includes('欄位名稱'), 'S5 活動表單也沒有工程師用語');
    await tab(T, 'settings'); ok((await T.textContent('[data-mig]')).includes('匯入舊回報') || (await mainText(T)).includes('匯入舊回報'), 'S5 設定頁「一次搬移」改叫「匯入舊回報（上線時只做一次）」');
    await T.close();
    /* 空狀態：什麼資料都沒有 */
    const E = await teacher(browser, Object.fromEntries([['mg_admins/T1', { ok: true }], stu3(C3, 5, '小明')]));
    ok((await mainText(E)).includes('今天沒有要處理的事'), 'S5 總覽：沒有待辦時寫「今天沒有要處理的事」');
    await tab(E, 'events'); const et = await mainText(E);
    ok(et.includes('現在沒有進行中的活動。用上面的範本開一個') && et.includes('還沒有排程中的活動。') && et.includes('還沒有結束的活動。'), 'S5 活動空狀態：每一區都說下一步');
    await tab(E, 'mail'); ok((await mainText(E)).includes('這裡還沒有信。在上面寫一封寄出去'), 'S5 寄出紀錄空狀態');
    await tab(E, 'bugs'); const bt = await mainText(E);
    ok(bt.includes('沒有待審核的回報。學生在遊戲裡按「回報問題」') && bt.includes('還沒有人上榜。學生的回報被你「確認」後'), 'S5 回報、抓蟲榜空狀態');
    await tab(E, 'news'); ok((await mainText(E)).includes('還沒有公告。在上面寫一則'), 'S5 公告空狀態');
    await tab(E, 'feedback'); ok((await mainText(E)).includes('還沒有回饋。學生打完測試魔物'), 'S5 回饋空狀態');
    await tab(E, 'students'); await E.fill('[data-f="kw"]', '不存在'); await E.waitForTimeout(100);
    ok((await mainText(E)).includes('沒有符合的學生。把篩選放寬一點'), 'S5 學生頁找不到時的說明');
    noErr(E); await E.close();
  }

  await browser.close();
  console.log(fails ? `\n${fails} FAIL` : '\n全部通過');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
