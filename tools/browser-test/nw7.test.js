/* 第 3 步：信箱（SPEC §3）與暱稱（§8）、班級短碼。全程開 window.__RULES：學生只能讀 mg_mail、不能寫。 */
const { chromium } = require('playwright'); const fs = require('fs');
const path = require('path'); const M = path.join(__dirname, 'mock') + '/'; const OUT = process.argv[2] || require('os').tmpdir();
const css = require('./tw.js')(OUT);
/* 最新一則改版公告的 id：發新公告時不用回來改測試（「已讀」的種子資料要等於它，不然會跳公告、冒「！」） */
const NOTICE_ID = /export const NOTICES = \[\s*\{ id: '([^']+)'/.exec(fs.readFileSync(path.join(__dirname, '../../nw-data.js'), 'utf8'))[1];
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const ID = '五年級3班_5號';

async function open(browser, o = {}) {
  const p = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const errs = []; p.on('dialog', d => d.accept());
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  const { sha256Hex } = await import('../../nw-access.js');
  const hash = await sha256Hex('Test-Pass_9!x');
  const seed = Object.assign({
    ['mg_scores/' + ID]: { className: '五年級3班', seat: 5, name: '小明', bestLevel: 10, bestScore: 20, scoreVer: 2, plays: 9, tutorialDone: true, talentIntroDone: true, tier: 'B', balanceVer: 3,
      nw: Object.assign({ v: 1, savedAt: 5, look: { style: 1, hair: 2, skin: 1 }, starter: 'dagger', quest: { done: ['1-0', '1-0a'] }, items: { potion: 3 }, intro: { hub: 1 }, seenNotice: NOTICE_ID, name0: '小明' }, o.nw || {}) }
  }, o.seed || {});
  await p.addInitScript(a => {
    window.__FS = a.s; window.__RULES = true; localStorage.clear(); localStorage.setItem('mg_nw_fast', '1');
    window.__NW_CODE_HASH__ = a.hash; localStorage.setItem('mg_nw_code', a.hash); window.__NW_NOGIFT__ = true;
    if (!a.intro) window.__NW_NOINTRO__ = true;
    if (a.nickprompt) window.__NW_NICKPROMPT__ = true;
    if (a.skew) window.__SERVER_SKEW_MS = a.skew;
    window.confetti = () => {}; window.html2canvas = async () => document.createElement('canvas');
  }, { s: seed, hash, skew: o.skew || 0, intro: !!o.intro, nickprompt: !!o.nickprompt });
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
  if (o.name) await p.fill('#in-name', o.name);
  await p.click('#btn-enter'); await p.waitForTimeout(1000);
  p.errs = errs;
  await p.click('#nw-door'); await p.waitForTimeout(1800);
  return p;
}
const FS = (p, k) => p.evaluate(k => window.__FS[k], k);
const nwLocal = p => p.evaluate(() => JSON.parse(JSON.stringify(window.__NWG.nw)));
const noErr = (p, m = '沒有 JS 錯誤') => ok(p.errs.length === 0, m + ' ' + p.errs.join(' | '));
const mailIds = p => p.$$eval('#nw-mail [data-mail]', els => els.map(e => e.dataset.mail));
const openMail = async p => { if (await p.$('#nw-mail')) { await p.click('#nw-mail [data-close]'); await p.waitForTimeout(150); } await p.click('.vb[data-bld="mail"]'); await p.waitForSelector('#nw-mail', { timeout: 4000 }); await p.waitForFunction(() => !document.querySelector('#nw-mail [data-msg]') || document.querySelector('#nw-mail [data-msg]').textContent !== '讀信中…', null, { timeout: 4000 }); await p.waitForTimeout(150); };
const dismissGifts = async p => { for (let i = 0; i < 12; i++) { if (!(await p.$('#nw-gift'))) break; await p.click('#nw-gift [data-ok]'); await p.waitForTimeout(150); } };
const now = Date.now();
const mail = (aud, o = {}) => Object.assign({ aud, title: '信 ' + aud.join(','), body: '內容', items: [{ type: 'coins', n: 10 }], from: '老師', sendAt: now - 1000, expireAt: 0, t: now - 1000, src: 'manual' }, o);

(async () => {
  const D = await import('../../nw-data.js');

  /* ── 純函式：班級短碼、暱稱詞庫 ── */
  const { clsShort, nickText, NICK_A, NICK_B } = D;
  ok(clsShort('五年級4班') === '504' && clsShort('六年級12班') === '612' && clsShort('三年級1班') === '301' && clsShort('５年級４班') === '504', 'clsShort：五年級4班→504、六年級12班→612、一位數補 0、全形數字也行');
  ok(clsShort('資優班') === '資優班' && clsShort('') === '' && clsShort('五年級甲班') === '五年級甲班', 'clsShort：解析不了就回原字串');
  ok(NICK_A.length >= 30 && NICK_A.length <= 40 && NICK_B.length >= 30 && NICK_B.length <= 40, `詞庫各 30～40 個（前 ${NICK_A.length}、後 ${NICK_B.length}）`);
  const ids = NICK_A.map(x => x.id).concat(NICK_B.map(x => x.id));
  ok(new Set(ids).size === ids.length && NICK_A.every(x => /^a_/.test(x.id) && x.w) && NICK_B.every(x => /^b_/.test(x.id) && x.w), '詞的 ID 不重複、前綴 a_／b_、都有字');
  ok(![...NICK_A, ...NICK_B].some(x => /笨|臭|迷糊|胖|醜|傻|呆|懶|死|蠢|弱/.test(x.w)), '詞庫沒有負面或能取笑人的詞');
  ok(nickText({ nick: ['a_flash', 'b_coo'] }) === '閃電咕咕鳥' && nickText({}) === '神秘獵人' && nickText({ nick: ['a_flash', 'b_gone'] }) === '神秘獵人' && nickText({ nick: ['a_flash'] }) === '神秘獵人', 'nickText：組出「閃電咕咕鳥」；沒取、詞庫找不到、長度不對都回「神秘獵人」');
  const norm = D.normalizeNw({ mail: ['x'], nick: ['a_flash'], nickAt: 'abc' });
  ok(!Array.isArray(norm.mail) && Object.keys(norm.mail).length === 0 && norm.nick === null && norm.nickAt === 0, 'normalizeNw：mail 一定是物件、壞掉的 nick 變 null');

  const b = await chromium.launch();

  /* ── 三種收件人、別班、時間 ── */
  {
    const seed = {
      'mg_mail/all': mail(['all'], { title: '全校信' }),
      'mg_mail/cls': mail(['cls:五年級3班'], { title: '全班信', items: [{ type: 'exp', n: 50 }] }),
      'mg_mail/cls2': mail(['cls:五年級4班', 'cls:五年級3班'], { title: '多班信', items: [{ type: 'mat', key: 'coo_feather', n: 3 }] }),
      'mg_mail/id': mail(['id:' + ID], { title: '個人信', items: [{ type: 'word', key: 'bugking' }], src: 'award' }),
      'mg_mail/other_cls': mail(['cls:五年級4班'], { title: '別班信' }),
      'mg_mail/other_id': mail(['id:五年級3班_6號'], { title: '別人信' }),
      'mg_mail/future': mail(['all'], { title: '還沒到', sendAt: now + 3600000 }),
      'mg_mail/expired': mail(['all'], { title: '過期了', expireAt: now - 3600000 }),
      'mg_mail/notexpired': mail(['all'], { title: '還沒過期', expireAt: now + 3600000 }),
      'mg_mail/unknown': mail(['all'], { title: '新東西', items: [{ type: 'coins', n: 5 }, { type: 'zzz', n: 1 }] })
    };
    const p = await open(b, { seed });
    ok(await p.$('.vb[data-bld="mail"]') !== null, '村莊有郵筒（可點的熱區）');
    const badge = (await p.textContent('.vb[data-bld="mail"]')) || '';
    ok(/✉ 6/.test(badge), '郵筒上方冒出 ✉＋沒領的數字：全校、全班、多班、個人、還沒過期、新東西 = 6 封 → ' + badge.replace(/\s+/g, ' '));
    ok(await p.$eval('[data-act="bagopen"] [data-bagdot]', e => getComputedStyle(e).display !== 'none'), '上面的背包按鈕有小紅點');
    await openMail(p);
    const got = await mailIds(p);
    ok(['all', 'cls', 'cls2', 'id', 'notexpired', 'unknown'].every(x => got.includes(x)), '三種收件人（全部、我的班、我）都收得到：' + got.join(','));
    ok(!got.includes('other_cls') && !got.includes('other_id'), '別班、別人的信收不到');
    ok(!got.includes('future'), 'sendAt 還沒到的信看不到');
    ok(!got.includes('expired') && got.includes('notexpired'), '過期的看不到、還沒過期的看得到');
    ok(await p.$('#nw-mail [data-mail="unknown"]:not(:has([data-claim]))') !== null && (await p.textContent('#nw-mail [data-mail="unknown"]')).includes('請按 F5 重新整理再來領'), '含不認得東西的信：沒有「領取」鈕，寫「請按 F5 重新整理再來領」');
    ok(!(await p.evaluate(() => window.__WRITES.some(w => w.path.startsWith('mg_mail')))), '學生端沒有寫過 mg_mail');

    /* 全部領取 */
    const n0 = await nwLocal(p);
    await p.click('#nw-mail [data-all]'); await p.waitForSelector('#nw-gift', { timeout: 4000 });
    const cloud = (await FS(p, 'mg_scores/' + ID)).nw;
    ok(['all', 'cls', 'cls2', 'id', 'notexpired'].every(x => cloud.mail && cloud.mail[x]) && !cloud.mail.unknown, '領完立刻存到雲端（還沒關禮物視窗、不等延遲）：五封都有已領時間，不認得的那封沒有');
    let titles = []; for (let i = 0; i < 12 && await p.$('#nw-gift'); i++) { titles.push((await p.textContent('#nw-gift')).replace(/\s+/g, ' ')); await p.click('#nw-gift [data-ok]'); await p.waitForTimeout(150); }
    ok(titles.length >= 5, `禮物依序一個個秀（${titles.length} 個）`);
    const n1 = await nwLocal(p);
    ok(n1.coins === n0.coins + 20, `字元：全校、還沒過期各 +10（不認得的那封整封不領，連它的 5 字元也沒給）：${n0.coins} → ${n1.coins}`);
    ok(n1.hr === 2 && n1.hrExp === 30, `獵人經驗 +50：Lv1 → Lv2（hr ${n1.hr}、exp ${n1.hrExp}）`);
    ok(n1.mats.coo_feather === 3, '材料 mat 加進背包');
    ok(n1.awards.bugking === 1 && n1.words.includes('bugking'), 'word bugking：awards.bugking＝1、稱號詞條「職業除錯師」解鎖');
    ok(!n1.mail.unknown, '不認得的信沒有標已領');
    ok((await p.$eval('.vb[data-bld="mail"]', e => e.textContent)).includes('✉ 1'), '領完後郵筒只剩 1（不認得的那封）');
    await openMail(p);
    ok((await p.$$('#nw-mail [data-claim]')).length === 0, '重開信箱：已領的沒有「領取」鈕');
    ok((await p.textContent('#nw-mail')).includes('已領'), '已領的信留著可以重看（寫「已領」）');
    noErr(p); await p.close();
  }

  /* ── 重複領不到：另一個分頁已領 ── */
  {
    const p = await open(b, { seed: { 'mg_mail/a': mail(['all'], { title: 'A', items: [{ type: 'coins', n: 100 }] }), 'mg_mail/b': mail(['all'], { title: 'B', items: [{ type: 'coins', n: 7 }] }) } });
    const c0 = (await nwLocal(p)).coins;
    await openMail(p);
    /* 開著信箱的這段時間，另一個分頁把 A 領走了、寫進雲端 */
    await p.evaluate(id => { window.__FS['mg_scores/' + id].nw.mail = { a: 123456 }; }, ID);
    await p.click('#nw-mail [data-claim="a"]'); await p.waitForTimeout(500);
    ok(!(await p.$('#nw-gift')) && (await nwLocal(p)).coins === c0, '另一個分頁已領的信：領取前重讀雲端、發現領過了，字元沒有加、也沒有跳禮物');
    ok((await nwLocal(p)).mail.a === 123456, '雲端的已領紀錄併回本機（保留另一個分頁的領取時間）');
    await p.click('#nw-mail [data-claim="b"]'); await p.waitForSelector('#nw-gift'); await dismissGifts(p);
    const cloud = (await FS(p, 'mg_scores/' + ID)).nw;
    ok((await nwLocal(p)).coins === c0 + 7 && cloud.mail.a === 123456 && cloud.mail.b, '領 B 正常；存回雲端時 A 的紀錄還在（物件合併，沒被整個蓋掉）');
    noErr(p); await p.close();
  }
  {
    const p = await open(b, { seed: { 'mg_mail/a': mail(['all'], { title: 'A', items: [{ type: 'coins', n: 100 }] }) } });
    const c0 = (await nwLocal(p)).coins;
    await openMail(p);
    await p.evaluate(() => { const bt = document.querySelector('#nw-mail [data-claim="a"]'); bt.click(); bt.click(); bt.click(); });
    await p.waitForSelector('#nw-gift'); await dismissGifts(p); await p.waitForTimeout(300);
    ok((await nwLocal(p)).coins === c0 + 100, '同一封連按 3 次「領取」：只領一次');
    await p.close();
  }

  /* ── 沒有 items 的感謝信、郵筒 Enter、離線、已領 30 天後收起來 ── */
  {
    const old = now - 40 * 86400000, recent = now - 5 * 86400000;
    const p = await open(b, { intro: true, nw: { nick: ['a_brave', 'b_slime'], mail: { oldgot: old, newgot: recent, oldid: old } }, seed: {
      'mg_mail/thanks': mail(['all'], { title: '謝謝你', body: '謝謝你幫忙抓蟲！', items: [] }),
      'mg_mail/oldgot': mail(['all'], { title: '很久以前', sendAt: old - 1000, t: old - 1000 }),
      'mg_mail/newgot': mail(['all'], { title: '最近領的' })
    } });
    /* 第一次打開信箱：先有介紹 */
    await p.click('.vb[data-bld="mail"]'); await p.waitForSelector('#nw-intro', { timeout: 4000 });
    ok((await p.textContent('#nw-intro')).includes('郵筒'), '第一次打開信箱有郵筒／信箱的介紹');
    await p.click('#nw-intro [data-next]'); await p.waitForSelector('#nw-mail', { timeout: 3000 }); await p.waitForTimeout(300);
    const got = await mailIds(p);
    ok(got.includes('thanks') && got.includes('newgot') && !got.includes('oldgot'), '已領超過 30 天的收起來、30 天內的還在：' + got.join(','));
    ok(got.indexOf('thanks') < got.indexOf('newgot'), '沒領的排在已領的前面');
    await p.click('#nw-mail [data-claim="thanks"]'); await p.waitForSelector('#nw-gift');
    ok((await p.textContent('#nw-gift')).includes('謝謝你幫忙抓蟲'), '沒有東西的感謝信：禮物視窗秀信的內容');
    await dismissGifts(p);
    /* 關掉再用 Enter 開：玩家還站在郵筒旁 */
    await p.click('#nw-mail [data-close]'); await p.waitForTimeout(300);
    ok(!(await p.$('#nw-mail')), '關閉信箱');
    await p.keyboard.press('Enter'); await p.waitForSelector('#nw-mail', { timeout: 3000 });
    ok(true, '站在郵筒旁按 Enter 也能打開信箱');
    await p.click('#nw-mail [data-close]'); await p.waitForTimeout(200);
    /* 背包分頁打開同一個視窗 */
    await p.keyboard.press('b'); await p.waitForSelector('#nw-bag'); await p.waitForSelector('#nw-intro'); await p.click('#nw-intro [data-next]');
    ok((await p.textContent('#nw-bag [data-bag-tab="mail"]')).includes('信箱'), '背包有「✉ 信箱」分頁');
    await p.click('#nw-bag [data-bag-tab="mail"]'); await p.waitForSelector('#nw-mail', { timeout: 3000 });
    ok((await p.$$('#nw-mail')).length === 1, '背包的信箱分頁打開的是同一個視窗（只有一個 #nw-mail）');
    await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    ok(!(await p.$('#nw-mail')) && !!(await p.$('#nw-bag')), 'Esc 先關信箱');
    await p.keyboard.press('Escape');
    /* 離線 */
    await p.evaluate(() => window.__SNAP_ERROR()); await p.waitForTimeout(300);
    await p.click('.vb[data-bld="mail"]'); await p.waitForSelector('#nw-mail', { timeout: 3000 }); await p.waitForTimeout(300);
    ok((await p.textContent('#nw-mail')).includes('現在連不上網路，信箱打不開'), '離線：寫「現在連不上網路，信箱打不開」');
    ok((await p.$$('#nw-mail [data-claim]')).length === 0, '離線沒有領取鈕');
    ok(p.errs.every(e => /unavailable/.test(e)), '沒有 JS 錯誤（只有測試故意丟的 unavailable）' + p.errs.join(' | ')); await p.close();
  }

  /* ── 伺服器時間：電腦時間不準領不到還沒到的信 ── */
  {
    /* 學生把電腦時間調快 2 小時：伺服器時間 = 本機 − 2 小時。信 1 小時前就寄（伺服器時間還沒到） */
    const p = await open(b, { skew: -2 * 3600000, seed: {
      'mg_mail/early': mail(['all'], { title: '還沒到', sendAt: Date.now() - 3600000 }),
      'mg_mail/ok': mail(['all'], { title: '到了', sendAt: Date.now() - 3 * 3600000 })
    } });
    await openMail(p);
    const got = await mailIds(p);
    ok(got.includes('ok') && !got.includes('early'), '電腦時間調快 2 小時：用伺服器時間過濾 sendAt，還沒到的信照樣看不到：' + got.join(','));
    await p.close();
  }

  /* ── 名字被鎖：信箱打不開 ── */
  {
    const p = await open(b, { name: '小華', seed: { 'mg_mail/a': mail(['all'], { title: 'A' }) } });
    ok(await p.evaluate(() => window.__NWG.nameLocked()), '（前置）換了名字：已被鎖');
    ok(!(await p.$eval('.vb[data-bld="mail"] span:last-child', e => getComputedStyle(e).display !== 'none')), '被鎖：郵筒不冒數字、登入時也沒另外提示');
    await p.click('.vb[data-bld="mail"]'); await p.waitForSelector('#nw-mail', { timeout: 3000 }); await p.waitForTimeout(300);
    const t = await p.textContent('#nw-mail');
    ok(t.includes('名字跟上次不一樣，信箱先鎖起來了；請找老師') && (await p.$$('#nw-mail [data-claim]')).length === 0, '被鎖：信箱打不開，寫「名字跟上次不一樣，信箱先鎖起來了；請找老師」');
    ok(!(await p.evaluate(() => window.__READS.some(r => r.path.startsWith('mg_mail')))), '被鎖的人連信都沒去讀');
    await p.close();
  }

  /* ── 暱稱：取了就固定，要換用改名卡 ── */
  {
    const p = await open(b, {});
    await p.keyboard.press('b'); await p.waitForSelector('#nw-bag');
    ok((await p.textContent('#nw-bag [data-nick-edit]')).includes('取暱稱'), '背包人物卡名字下方有「✏ 取暱稱」');
    await p.click('#nw-bag [data-nick-edit]'); await p.waitForSelector('#nw-nick');
    ok((await p.textContent('#nw-nick')).includes('取了就固定') && !!(await p.$('#nw-nick [data-skip]')), '第一次取：寫「取了就固定」、有「先用隨機的」');
    ok(await p.$eval('#nw-nick [data-ok]', e => e.disabled), '兩邊都沒選：「確定」按不了');
    await p.click('#nw-nick [data-n="a"][data-id="a_flash"]');
    await p.click('#nw-nick [data-n="b"][data-id="b_coo"]');
    ok((await p.textContent('#nw-nick [data-prev]')).includes('閃電咕咕鳥'), '預覽顯示「閃電咕咕鳥」');
    await p.click('#nw-nick [data-ok]'); await p.waitForTimeout(300);
    const n = await nwLocal(p);
    ok(n.nick && n.nick[0] === 'a_flash' && n.nick[1] === 'b_coo', '存的是詞的 ID：' + JSON.stringify(n.nick));
    await p.waitForTimeout(1000);
    const doc = await FS(p, 'mg_scores/' + ID);
    ok(doc.nwNick === '閃電咕咕鳥' && doc.nw.nick[1] === 'b_coo', '存檔最外層有 nwNick＝「閃電咕咕鳥」');
    const btn = await p.textContent('#nw-bag [data-nick-edit]');
    ok(btn.includes('閃電咕咕鳥') && !btn.includes('改名卡'), '人物卡顯示新暱稱；沒卡時不寫「用改名卡換」');
    ok((await p.textContent('#nw-bag [data-card]')).includes('要有改名卡才能換喔（之後商店會賣，也可能是老師的禮物）'), '沒有卡：寫「要有改名卡才能換喔…」（灰色）');
    await p.click('#nw-bag [data-nick-edit]'); await p.waitForTimeout(300);
    ok(!(await p.$('#nw-nick')) && (await p.textContent('#toast-body')).includes('要有改名卡'), '取了就固定：沒有改名卡按下去不會開選擇器，提示要有改名卡');
    noErr(p); await p.close();
  }
  {
    const p = await open(b, { nw: { nick: ['a_brave', 'b_slime'], items: { potion: 3, renameCard: 2 } } });
    await p.keyboard.press('b'); await p.waitForSelector('#nw-bag');
    ok((await p.textContent('#nw-bag [data-nick-edit]')).includes('用 1 張改名卡換暱稱'), '有改名卡：按鈕寫「用 1 張改名卡換暱稱」');
    await p.click('#nw-bag [data-nick-edit]'); await p.waitForSelector('#nw-nick');
    ok((await p.textContent('#nw-nick')).includes('用掉 1 張改名卡') && !(await p.$('#nw-nick [data-skip]')), '換暱稱：寫「會用掉 1 張改名卡」、沒有「先用隨機的」');
    await p.click('#nw-nick [data-cancel]'); await p.waitForTimeout(200);
    ok((await nwLocal(p)).items.renameCard === 2, '取消：不扣卡');
    await p.click('#nw-bag [data-nick-edit]'); await p.waitForSelector('#nw-nick');
    await p.click('#nw-nick [data-n="a"][data-id="a_calm"]'); await p.click('#nw-nick [data-ok]'); await p.waitForTimeout(1200);
    const n2 = await nwLocal(p);
    ok(n2.items.renameCard === 1 && n2.nick[0] === 'a_calm' && (await FS(p, 'mg_scores/' + ID)).nwNick === '安靜的史萊姆', '確定後扣 1 張（2 → 1），nwNick 跟著更新');
    await p.click('#nw-bag [data-tab-items], #nw-bag [data-bag-tab="items"]'); await p.waitForTimeout(200);
    ok((await p.textContent('#nw-bag [data-body]')).includes('改名卡') && (await p.$('#nw-bag [data-body] canvas')) !== null, '道具分頁看得到「改名卡」與像素圖示');
    noErr(p); await p.close();
  }
  /* 進村先取名 */
  {
    const p = await open(b, { nickprompt: true });
    ok(!!(await p.$('#nw-nick')), '第一次進村（還沒暱稱）：自動跳出取暱稱選擇器');
    ok(!!(await p.$('#nw-nick [data-skip]')) && !(await p.$('#nw-nick [data-cancel]')), '有「先用隨機的」，沒有一般的「取消」');
    await p.click('#nw-nick [data-rand]');
    await p.click('#nw-nick [data-skip]'); await p.waitForTimeout(1200);
    const n = await nwLocal(p);
    ok(!(await p.$('#nw-nick')) && n.nick && n.nick.length === 2 && ((await FS(p, 'mg_scores/' + ID)).nwNick || '').length >= 3, '按「先用隨機的」：關掉並存下一個隨機暱稱：' + JSON.stringify(n.nick));
    await p.close();
  }
  {
    const p = await open(b, { nickprompt: true });
    await p.click('#nw-nick', { position: { x: 4, y: 4 } }); await p.waitForTimeout(1200);
    const n = await nwLocal(p);
    ok(!(await p.$('#nw-nick')) && n.nick && n.nick.length === 2, '點旁邊把視窗關掉：也會幫他存隨機的（不能完全跳過）');
    await p.close();
  }
  {
    const p = await open(b, { nickprompt: true, nw: { nick: ['a_brave', 'b_slime'] } });
    ok(!(await p.$('#nw-nick')), '已經有暱稱：進村不再跳');
    await p.close();
  }
  {
    const p = await open(b, { nickprompt: true, name: '小華' });
    ok(!(await p.$('#nw-nick')) && !(await nwLocal(p)).nick, '名字被冒名鎖鎖住：不跳取名、也沒有幫他存暱稱');
    await p.close();
  }
  {
    const p = await open(b, { intro: true, nickprompt: true, nw: { intro: {}, seenNotice: '' } });
    ok(!(await p.$('#nw-nick')) && !!(await p.$('#nw-intro, .nw-sheet')), '有第一次介紹時：先看介紹，取名排在介紹之後');
    await p.close();
  }
  /* 信箱寄改名卡 */
  {
    const seed = {
      'mg_mail/rc': mail(['all'], { title: '改名卡', items: [{ type: 'item', key: 'renameCard', n: 2 }] }),
      'mg_mail/rc_bad': mail(['all'], { title: '不認得', items: [{ type: 'item', key: 'zzzCard', n: 1 }] })
    };
    const p = await open(b, { seed });
    await openMail(p);
    ok(await p.$('#nw-mail [data-mail="rc_bad"]:not(:has([data-claim]))') !== null, '不認得的道具 key：整封不能領');
    await p.click('#nw-mail [data-claim="rc"]'); await p.waitForSelector('#nw-gift'); await dismissGifts(p);
    ok((await nwLocal(p)).items.renameCard === 2, '信件 {type:item, key:renameCard, n:2}：領到 2 張改名卡');
    noErr(p); await p.close();
  }
  {
    const p = await open(b, { name: '小華' });
    await p.keyboard.press('b'); await p.waitForSelector('#nw-bag');
    await p.click('#nw-bag [data-nick-edit]'); await p.waitForTimeout(300);
    ok(!(await p.$('#nw-nick')), '名字被鎖：不能改暱稱');
    ok(/請找老師/.test(await p.textContent('body')), '被鎖時畫面說「請找老師」');
    ok(((await FS(p, 'mg_scores/' + ID)).nwNick || '') === '', '被鎖時沒有寫 nwNick');
    await p.close();
  }
  {
    const p = await open(b, { nw: { nick: ['a_brave', 'b_slime'], nickAt: 1 }, seed: { ['mg_bugboard/' + ID]: { hideNick: true, n: 0, score: 0 } } });
    await p.keyboard.press('b'); await p.waitForSelector('#nw-bag'); await p.click('#nw-bag [data-title-edit]'); await p.click('#nw-title [data-ok]'); await p.waitForTimeout(1200);
    ok((await FS(p, 'mg_scores/' + ID)).nwNick === '勇敢的史萊姆', '被老師隱藏暱稱的人照樣存 nwNick（隱藏由顯示端負責）');
    await p.close();
  }

  await b.close(); process.exit(fails ? 1 : 0);
})();
