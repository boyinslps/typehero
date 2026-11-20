/* 🐛 回報與抓蟲榜（SPEC §6.2、§7.4）。
   回報（mg_nw_flags 裡 type == 'bug'）：待審核／已確認／不採用／重複，四區。status 存 'pending'|'approved'|'rejected'|'dup'。
   每次審核都用「同一個 batch」寫：flag 的結果、mg_bugboard 的分數與 reports、獎勵信 bug_{flagID}。三樣一起成功或一起失敗。
   分數永遠從 reports＋bonus 重算（bug-calc.js），不累加，所以重按、撤銷都不會算歪；
   信是固定 ID：已經存在的不會重寄、也不會被覆蓋。

   資料放哪裡（學生讀得到 mg_bugboard，所以老師打的字與真名不能放那裡）：
   - mg_bugboard/{id}：分數、確認件數、firstAt、隱藏暱稱、bonus（只有數字）、reports（id、狀態、嚴重度、送出時間、老師回覆）。
   - mg_bugboard_private/{id}（只有老師讀得到）：手動加分的理由 notes、老師核可的真名 nameOk。
   老師回覆 reply 還是放在 reports（學生要在「我的回報」看到），但同時寄一封信給本人當主要管道；輸入處提醒不要寫姓名。

   Claude 的建議（export-bugs.js 匯入）只放在這個分頁的記憶體／sessionStorage，在回報卡旁邊顯示。
   「採用」只是把確認／重複／不採用的視窗預填好，老師按視窗裡的按鈕才寫入；一則一則寫與「全部採用」走同一組 commit 函式，規則不會分岔。 */
import { db, doc, getDoc, writeBatch, deleteField } from './fb.js';
import { loadScores, loadBoard, loadFlags, invalidate } from './data.js';
import { clsShort, toMs, bugCmp, BUG_COINS, BUG_REWARD_MAX } from './nw.js';
import { boardCalc, approvedCount, bugText, putReport, dropReport, publicBoard, SEV_NAME, clampSev, planBulk } from './bug-calc.js';
import { mountBugExport, loadSugg, saveSugg, dropSugg, clearSugg, VERDICT_NAME } from './export-bugs.js';
import { MAIL_BUG_TITLE, MAIL_AWARD_TITLE } from './migrate.js';
import { idParts } from './ids.js';
import { $, esc, fmtT, log, ask, modal, toast, errText, previewMail, matchStudent, helpBox } from './util.js';

const ZONES = [['pending', '待審核'], ['approved', '已確認'], ['rejected', '不採用'], ['dup', '重複']];
const zoneOf = f => ZONES.some(z => z[0] === (f.status || 'pending')) ? (f.status || 'pending') : 'pending';
const nl = s => esc(s).replace(/\n/g, '<br>');
const clipS = (s, n) => [...String(s || '')].slice(0, n).join('');

export default async function mount(el, ctx) {
  let [scores, flags, board] = await Promise.all([loadScores(true), loadFlags(true), loadBoard(true)]);
  let zone = 'pending', openId = '';
  const bugs = () => flags.filter(f => f.type === 'bug');
  const sOf = id => scores.find(s => s.id === id);
  const label = id => { const s = sOf(id); const p = idParts(id); return s ? `${clsShort(s.className)}・${s.seat}號 ${s.name}` : `${clsShort(p.className)}・${p.seat}號`; };
  const flagWho = f => `${clsShort(f.cls || idParts(f.docId).className)}・${f.seat !== undefined && f.seat !== '' ? f.seat : idParts(f.docId).seat}號 ${f.name || ''}`;
  const refresh = async () => { invalidate('flags', 'board', 'scores', 'mails'); [scores, flags, board] = await Promise.all([loadScores(true), loadFlags(true), loadBoard(true)]); };

  el.innerHTML = `<h2>🐛 回報與抓蟲榜</h2>
    ${helpBox(['學生在遊戲裡回報的問題，會先放在「待審核」。看過內容後按「確認」（要選嚴重度）、「重複」或「不採用」。', '確認的話，學生會收到獎勵信，抓蟲榜的分數也會自動算好。', '沒有在遊戲裡回報、但老師知道他抓過蟲：用「手動加分」，可以一次選好幾位同學。', '回覆那一格，所有同學都可能看得到，所以不要寫名字。', '想先請 Claude 幫忙看一遍：用下面「請 Claude 檢查待審回報」匯出（姓名座號都不會帶出去），把 Claude 的建議貼回來，會顯示在每則回報旁邊，你確認了才算數。'])}
    <h3>🤖 請 Claude 檢查待審回報</h3><div data-bugexp></div>
    <h3>問題回報</h3><div class="row" data-zones></div><div data-reports style="margin-top:8px"></div>
    <h3>抓蟲榜</h3><div data-board></div>`;

  /* ── 回報清單 ── */
  let sugg = loadSugg();
  /* 建議只在待審的回報上顯示；已經審過的就算還留著也不顯示 */
  function suggHtml(f, canAct) {
    const s = sugg[f.id]; if (!s || zoneOf(f) !== 'pending') return '';
    const to = s.verdict === 'dup' ? flags.find(x => x.id === s.dupOf) : null;
    const head = s.verdict === 'approve' ? `確認・${SEV_NAME[clampSev(s.sev)]}（${clampSev(s.sev)} 分）` : s.verdict === 'dup' ? `重複（跟「${to ? esc(flagWho(to)) + '：' + esc(clipS(bugText(to).did, 16)) : '找不到的那則'}」一樣）` : '不採用';
    return `<div class="note" data-sugg="${esc(f.id)}" style="margin:8px 0 0"><b data-sugg-head>🤖 建議：${head}</b>
      ${s.note ? `<div data-sugg-note style="overflow-wrap:anywhere">${esc(s.note)}</div>` : ''}
      ${s.reply ? `<div class="dim" data-sugg-reply style="overflow-wrap:anywhere">建議回覆：${esc(s.reply)}<br>回覆所有同學都可能看到，用之前看一下有沒有名字。</div>` : ''}
      <div class="row" style="margin-top:6px"><button class="px-btn sm gold" data-usesugg="${esc(f.id)}" ${canAct && (s.verdict !== 'dup' || to) ? '' : 'disabled'}>採用這個建議</button><button class="px-btn sm" data-dropsugg="${esc(f.id)}">不管這個建議</button></div></div>`;
  }
  function reportCard(f) {
    const z = zoneOf(f), t = bugText(f), canAct = !!f.docId;
    const orig = z === 'dup' && f.dupOf ? flags.find(x => x.id === f.dupOf) : null;
    return `<div class="px-panel in" data-flag="${esc(f.id)}" style="margin-bottom:8px">
      <div class="row"><b>${esc(flagWho(f))}</b><span class="dim">${esc(fmtT(f.t))}${f.cat ? '・' + esc(f.cat) : ''}</span>
        ${z === 'approved' ? `<span class="chip ok">嚴重度 ${esc(SEV_NAME[clampSev(f.sev)])}（${clampSev(f.sev)} 分）</span>` : ''}${z === 'rejected' ? '<span class="chip warn">不採用</span>' : ''}${z === 'dup' ? '<span class="chip" style="color:var(--blue)">重複</span>' : ''}</div>
      <div class="kv" style="margin-top:6px"><b>做了什麼</b><span style="overflow-wrap:anywhere" data-did>${nl(t.did) || '<span class="dim">（沒寫）</span>'}</span>
        <b>錯誤狀況</b><span style="overflow-wrap:anywhere" data-what>${nl(t.what) || '<span class="dim">（沒寫）</span>'}</span>
        ${f.reply ? `<b>你的回覆</b><span>${nl(f.reply)}</span>` : ''}${orig ? `<b>跟哪一則一樣</b><span>${esc(flagWho(orig))}：${esc(clipS(bugText(orig).did, 30))}</span>` : ''}</div>
      ${suggHtml(f, canAct)}
      <div class="row" style="margin-top:8px">${z === 'pending'
        ? `<button class="px-btn gold sm" data-confirm="${esc(f.id)}" ${canAct ? '' : 'disabled'}>確認</button><button class="px-btn sm" data-dup="${esc(f.id)}" ${canAct ? '' : 'disabled'}>重複</button><button class="px-btn sm danger" data-reject="${esc(f.id)}" ${canAct ? '' : 'disabled'}>不採用</button>`
        : `<button class="px-btn sm" data-undo="${esc(f.id)}" ${canAct ? '' : 'disabled'}>${z === 'approved' ? '撤銷確認' : '退回待審核'}</button>`}
        ${canAct ? '' : '<span class="warn">這則沒有學生代號，不能處理</span>'}</div></div>`;
  }
  function paintReports() {
    const list = bugs();
    $('[data-zones]', el).innerHTML = ZONES.map(([k, n]) => `<button class="px-btn ${zone === k ? 'gold' : ''}" data-zone="${k}">${n}（${list.filter(f => zoneOf(f) === k).length}）</button>`).join('');
    const L = list.filter(f => zoneOf(f) === zone).sort((a, b) => zone === 'pending' ? (a.t || 0) - (b.t || 0) : (b.t || 0) - (a.t || 0));
    $('[data-reports]', el).innerHTML = (zone === 'approved' ? '<p class="dim" style="margin:0 0 6px">撤銷確認：分數會扣回來，但<b>已經寄出的獎勵信不收回</b>（學生領了的字元也不會扣）。</p>' : '')
      + (L.slice(0, 60).map(reportCard).join('') || `<p class="dim" data-empty>${zone === 'pending' ? '沒有待審核的回報。學生在遊戲裡按「回報問題」送出後，會出現在這裡。' : '這一區沒有回報。'}</p>`) + (L.length > 60 ? `<p class="dim">只列最近 60 則，共 ${L.length} 則</p>` : '');
  }

  /* ── 寫入：flag＋bugboard＋信，同一個 batch ── */
  let busy = false;
  const guard = fn => async (...a) => { if (busy) return; busy = true; try { await fn(...a); } catch (e) { toast('失敗：' + errText(e), true); console.error(e); } finally { busy = false; } };
  const freshBoard = async id => { const s = await getDoc(doc(db, 'mg_bugboard', id)); return s.exists() ? (s.data() || {}) : {}; };
  const freshPriv = async id => { const s = await getDoc(doc(db, 'mg_bugboard_private', id)); return s.exists() ? (s.data() || {}) : {}; };
  const mailExists = async id => (await getDoc(doc(db, 'mg_mail', id))).exists();
  /* 寫進 mg_bugboard 的資料一律過 publicBoard()；notes 只用來算 firstAt，不會被寫進去 */
  const boardPatch = (id, f0, cur, reports, extra, notes) => {
    const p = idParts(id), c = boardCalc(reports, cur.bonus, notes);
    return publicBoard(Object.assign({ className: cur.className || (f0 && f0.cls) || p.className, seat: cur.seat !== undefined && cur.seat !== '' ? cur.seat : (f0 && f0.seat !== undefined && f0.seat !== '' ? +f0.seat : p.seat),
      score: c.score, n: c.n, firstAt: c.firstAt, reports }, extra || {}));
  };
  const flagWrite = (b, f, data) => b.set(doc(db, 'mg_nw_flags', f.id), data, { merge: true });
  const mailDoc = (f, title, body, items) => { const now = Date.now(); return { aud: ['id:' + f.docId], title, body: clipS(body, 200), items, from: '老師', sendAt: now, expireAt: 0, t: now, src: 'bug' }; };
  const replyLine = r => r ? `\n老師說：${r}` : '';

  /* commit* 只負責寫（flag＋bugboard＋信，同一個 batch），不跳視窗、不重畫：
     單則審核（視窗按確認之後）與「全部採用建議」都呼叫它們。已經算過的回報在這裡「用剛讀到的最新資料」判斷，重按不會重複加分 */
  const commitConfirm = async (f, sevIn, replyIn) => {
    const cur = await freshBoard(f.docId), rs0 = Array.isArray(cur.reports) ? cur.reports : [], notes = (await freshPriv(f.docId)).notes;
    const already = rs0.find(r => r && r.id === f.id && r.st === 'approved');
    const before = approvedCount(rs0.filter(r => r.id !== f.id)), coins = before < BUG_REWARD_MAX;
    /* 已經算過的回報（兩個分頁同時按、畫面沒更新）：只補寫 flag 的狀態，分數、信都不動 */
    const sev = already ? clampSev(already.sev) : clampSev(sevIn), reply = already ? String(already.reply || '') : replyIn;
    const b = writeBatch(db);
    flagWrite(b, f, { status: 'approved', sev, reply, dupOf: deleteField() });
    if (!already) {
      b.set(doc(db, 'mg_bugboard', f.docId), boardPatch(f.docId, f, cur, putReport(rs0, { id: f.id, st: 'approved', sev, reply, t: f.t || 0 }), null, notes), { merge: true });
      if (!(await mailExists('bug_' + f.id))) b.set(doc(db, 'mg_mail', 'bug_' + f.id), mailDoc(f, MAIL_BUG_TITLE,
        (coins ? `老師確認了你回報的問題，幫了大忙！送你 ${BUG_COINS} 字元。` : '老師確認了你回報的問題，幫了大忙，謝謝你！') + replyLine(reply),
        coins ? [{ type: 'coins', n: BUG_COINS }] : []));
    }
    await log('確認回報', f.id, `${flagWho(f)}：嚴重度${SEV_NAME[sev]}${already ? '（補寫，沒有重複加分）' : coins ? `，寄 ${BUG_COINS} 字元` : '，只寄感謝'}`, b);
    await b.commit();
    dropSugg(f.id); sugg = loadSugg();
    return { already: !!already, sev };
  };
  const commitDup = async (f, dupOf) => {
    const cur = await freshBoard(f.docId), rs0 = Array.isArray(cur.reports) ? cur.reports : [], notes = (await freshPriv(f.docId)).notes;
    const entry = { id: f.id, st: 'dup', sev: 0, reply: '', t: f.t || 0 };
    const b = writeBatch(db);
    flagWrite(b, f, { status: 'dup', dupOf, sev: deleteField() });
    b.set(doc(db, 'mg_bugboard', f.docId), boardPatch(f.docId, f, cur, putReport(rs0, entry), null, notes), { merge: true });
    if (!(await mailExists('bug_' + f.id))) b.set(doc(db, 'mg_mail', 'bug_' + f.id), mailDoc(f, MAIL_BUG_TITLE, '你發現的問題，已經有同學先回報了。謝謝你也發現它！', []));
    await log('回報標成重複', f.id, `${flagWho(f)}：跟 ${dupOf} 一樣，不加分，寄感謝信`, b);
    await b.commit();
    dropSugg(f.id); sugg = loadSugg();
  };
  const commitReject = async (f, reply) => {
    const cur = await freshBoard(f.docId), rs0 = Array.isArray(cur.reports) ? cur.reports : [], notes = (await freshPriv(f.docId)).notes;
    const b = writeBatch(db);
    flagWrite(b, f, { status: 'rejected', reply, sev: deleteField(), dupOf: deleteField() });
    b.set(doc(db, 'mg_bugboard', f.docId), boardPatch(f.docId, f, cur, putReport(rs0, { id: f.id, st: 'rejected', sev: 0, reply, t: f.t || 0 }), null, notes), { merge: true });
    /* 有寫回覆才寄信（本人的主要管道）。用 bugr_ 而不是 bug_：之後要是改成確認，bug_ 那封獎勵信才寄得出去 */
    if (reply && !(await mailExists('bugr_' + f.id))) b.set(doc(db, 'mg_mail', 'bugr_' + f.id), mailDoc(f, MAIL_BUG_TITLE, '這次沒有採用，謝謝你回報。' + replyLine(reply), []));
    await log('不採用回報', f.id, `${flagWho(f)}${reply ? '：' + reply : ''}`, b);
    await b.commit();
    dropSugg(f.id); sugg = loadSugg();
  };
  const preNote = pre => pre ? '<div class="note" data-prefilled style="margin:0 0 8px">🤖 已經照 Claude 的建議填好了，不一定對，可以改。按下面的按鈕才會真的寫入。</div>' : '';

  /* pre＝Claude 的建議（可省略）：只預填，不寫入 */
  const doConfirm = guard(async (id, pre) => {
    const f = flags.find(x => x.id === id); if (!f) return;
    const cur = await freshBoard(f.docId), rs0 = Array.isArray(cur.reports) ? cur.reports : [];
    const already = rs0.find(r => r && r.id === f.id && r.st === 'approved');
    const before = approvedCount(rs0.filter(r => r.id !== f.id)), coins = before < BUG_REWARD_MAX;
    let box;
    const r = await modal({ title: `確認這則回報（${flagWho(f)}）`, sticky: true, buttons: [{ id: 'no', label: '取消' }, { id: 'ok', label: '確認並寄獎勵', cls: 'gold' }], onOpen: b => { box = b; },
      html: `${preNote(pre)}<div class="kv"><b>做了什麼</b><span>${nl(bugText(f).did)}</span><b>錯誤狀況</b><span>${nl(bugText(f).what)}</span></div>
        ${already ? '<div class="note bad">這則已經確認過、分數算過了。按確認只會補寫回報狀態，分數和信都不會動。</div>' : ''}
        <div style="margin-top:8px"><b>嚴重度</b><div class="row" data-sev>${[1, 2, 3].map(v => `<label class="chk"><input type="radio" name="sev" value="${v}" ${v === clampSev(already ? already.sev : pre ? pre.sev : 1) ? 'checked' : ''}> ${SEV_NAME[v]}（${v} 分）</label>`).join('')}</div></div>
        <div style="margin-top:8px"><b>回覆（可以不寫）</b><input class="inp" data-reply maxlength="60" style="width:100%" value="${esc(pre && pre.reply || '')}" placeholder="一句話，例如：謝謝你，這個問題我修好了">
          <div class="warn" data-replywarn style="font-size:.9em">回覆所有同學都可能看到，不要寫名字。（另外會寄一封信給他本人。）</div></div>
        <div class="note" data-mailinfo>${already ? '' : coins ? `會寄信：🪙 字元 ×${BUG_COINS}（這位學生的第 ${before + 1} 個，前 ${BUG_REWARD_MAX} 個有字元）` : `會寄感謝信，沒有字元（這位學生已經有 ${before} 個被確認，超過 ${BUG_REWARD_MAX} 個只寄感謝）`}</div>` });
    if (r !== 'ok') return;
    const res = await commitConfirm(f, $('input[name="sev"]:checked', box).value, $('[data-reply]', box).value.trim());
    await refresh(); paintAll(); toast(res.already ? '已補寫（沒有重複加分）' : `已確認，加 ${res.sev} 分，獎勵信寄出了`);
  });

  const doDup = guard(async (id, pre) => {
    const f = flags.find(x => x.id === id); if (!f) return;
    const others = bugs().filter(x => x.id !== f.id).sort((a, b) => (zoneOf(a) === 'approved' ? 0 : 1) - (zoneOf(b) === 'approved' ? 0 : 1) || (a.t || 0) - (b.t || 0));
    if (!others.length) { toast('沒有其他回報可以比對', true); return; }
    let box;
    const r = await modal({ title: `標成重複（${flagWho(f)}）`, sticky: true, buttons: [{ id: 'no', label: '取消' }, { id: 'ok', label: '標成重複', cls: 'gold' }], onOpen: b => { box = b; },
      html: `${preNote(pre)}<div class="kv"><b>這則</b><span>${esc(clipS(bugText(f).did, 40))}／${esc(clipS(bugText(f).what, 40))}</span></div>
        <div style="margin-top:8px"><b>跟哪一則一樣？</b><select class="inp" data-dupof style="width:100%">${others.map(o => `<option value="${esc(o.id)}" ${pre && pre.dupOf === o.id ? 'selected' : ''}>${zoneOf(o) === 'approved' ? '✓ ' : ''}${esc(flagWho(o))}：${esc(clipS(bugText(o).did, 24))}</option>`).join('')}</select></div>
        <div class="note">不加分，但會寄一封<b>感謝信</b>（沒有字元）。第一個回報的人才算分。</div>` });
    if (r !== 'ok') return;
    await commitDup(f, $('[data-dupof]', box).value);
    await refresh(); paintAll(); toast('已標成重複，寄了感謝信');
  });

  const doReject = guard(async (id, pre) => {
    const f = flags.find(x => x.id === id); if (!f) return;
    let box;
    const r = await modal({ title: `不採用這則回報（${flagWho(f)}）`, sticky: true, buttons: [{ id: 'no', label: '取消' }, { id: 'ok', label: '不採用', cls: 'danger' }], onOpen: b => { box = b; },
      html: `${preNote(pre)}<div class="kv"><b>做了什麼</b><span>${nl(bugText(f).did)}</span><b>錯誤狀況</b><span>${nl(bugText(f).what)}</span></div>
        <div style="margin-top:8px"><b>回覆（學生在「我的回報」會看到）</b><input class="inp" data-reply maxlength="60" style="width:100%" value="${esc(pre && pre.reply || '')}" placeholder="一句話，例如：這是設計成這樣的">
          <div class="warn" data-replywarn style="font-size:.9em">回覆所有同學都可能看到，不要寫名字。有寫回覆的話，也會寄一封信給他本人。</div></div>` });
    if (r !== 'ok') return;
    await commitReject(f, $('[data-reply]', box).value.trim());
    await refresh(); paintAll(); toast('已標成不採用');
  });

  /* ── Claude 的建議：採用（預填視窗）與全部採用 ── */
  const useSugg = id => {
    const s = sugg[id]; if (!s) return;
    return s.verdict === 'approve' ? doConfirm(id, s) : s.verdict === 'dup' ? doDup(id, s) : doReject(id, s);
  };
  const doApplyAll = guard(async () => {
    await refresh(); sugg = loadSugg();   // 先讀最新的狀態：別的分頁已經審過的就不要再動
    const plan = planBulk(Object.keys(sugg).map(k => Object.assign({ flagId: k }, sugg[k])), flags, board, BUG_REWARD_MAX);
    paintAll();
    if (!plan.items.length) { toast('沒有可以採用的建議（都已經審過，或對象有問題）', true); return; }
    const c = plan.counts, who = id => { const f = flags.find(x => x.id === id); return f ? flagWho(f) : id; };
    const stu = plan.students.filter(s => s.to !== s.from).sort((a, b) => (b.to - b.from) - (a.to - a.from));
    const replies = plan.items.filter(i => i.verdict !== 'dup' && i.reply);
    const ok = await ask('全部採用 Claude 的建議？', `<p>會一次處理 <b>${plan.items.length}</b> 則待審回報：確認 ${c.approve}、重複 ${c.dup}、不採用 ${c.reject}。</p>
      <div class="note" data-bulk-sum><b>抓蟲分總共 ${plan.delta >= 0 ? '+' : ''}${plan.delta} 分</b>，涉及 ${plan.students.length} 位同學。會寄信：有字元的獎勵信 ${plan.coinMails} 封、只有感謝的 ${plan.thanksMails} 封、不採用附回覆的 ${plan.replyMails} 封。</div>
      ${stu.length ? `<ul data-bulk-stu style="margin:4px 0;padding-left:1.2em">${stu.slice(0, 8).map(s => `<li>${esc(label(s.docId))}：${s.from} → ${s.to} 分（${s.to - s.from >= 0 ? '+' : ''}${s.to - s.from}）</li>`).join('')}${stu.length > 8 ? `<li class="dim">還有 ${stu.length - 8} 位…</li>` : ''}</ul>` : ''}
      ${replies.length ? `<details data-bulk-replies><summary>要寫給學生的回覆（${replies.length} 則，所有同學都可能看到）</summary><ul style="margin:4px 0;padding-left:1.2em">${replies.slice(0, 20).map(i => `<li>${esc(i.reply)}</li>`).join('')}</ul></details>` : ''}
      ${plan.skips.length ? `<p class="warn" data-bulk-skip>略過 ${plan.skips.length} 則（請個別處理）：${plan.skips.slice(0, 5).map(s => esc(who(s.flagId) + '：' + s.reason)).join('；')}</p>` : ''}
      <p class="warn">寄出的信不能收回。回覆是 Claude 建議的話，請確認裡面沒有名字。</p>`, '全部採用並寫入', '先不要', true);
    if (!ok) return;
    let done = 0;
    try {
      for (const it of plan.items) {
        const f = flags.find(x => x.id === it.flagId);
        if (it.verdict === 'approve') await commitConfirm(f, it.sev, it.reply || '');
        else if (it.verdict === 'dup') await commitDup(f, it.dupOf);
        else await commitReject(f, it.reply || '');
        done++;
      }
    } catch (e) {
      /* 中途斷掉：已經寫完的不會重複（每則是固定 ID、分數重算），重新按一次會從沒處理的接著做 */
      await refresh(); paintAll(); toast(`做到一半停了（已完成 ${done} 則，還有 ${plan.items.length - done} 則沒處理）：${errText(e)}`, true); console.error(e); return;
    }
    await log('採用建議', 'bugs', `全部採用 Claude 的建議 ${done} 則：確認 ${c.approve}、重複 ${c.dup}、不採用 ${c.reject}；抓蟲分 ${plan.delta >= 0 ? '+' : ''}${plan.delta}`);
    await refresh(); paintAll(); toast(`已處理 ${done} 則，抓蟲分 ${plan.delta >= 0 ? '+' : ''}${plan.delta}`);
  });

  const doUndo = guard(async id => {
    const f = flags.find(x => x.id === id); if (!f) return;
    const z = zoneOf(f);
    if (!await ask(z === 'approved' ? '撤銷確認？' : '退回待審核？', `<p>${esc(flagWho(f))} 的這則回報會回到「待審核」，${z === 'approved' ? `分數會重算（扣回 ${clampSev(f.sev)} 分）` : '不影響分數'}。</p>
      ${z === 'approved' || z === 'dup' ? '<p class="warn"><b>已經寄出的信不收回</b>，學生領了的字元也不會扣。之後再確認，不會重寄同一封。</p>' : ''}`, z === 'approved' ? '撤銷確認' : '退回', '先不要', true)) return;
    const cur = await freshBoard(f.docId), rs0 = Array.isArray(cur.reports) ? cur.reports : [], notes = (await freshPriv(f.docId)).notes;
    const b = writeBatch(db);
    flagWrite(b, f, { status: 'pending', sev: deleteField(), reply: deleteField(), dupOf: deleteField() });
    b.set(doc(db, 'mg_bugboard', f.docId), boardPatch(f.docId, f, cur, dropReport(rs0, f.id), null, notes), { merge: true });
    await log(z === 'approved' ? '撤銷確認回報' : '退回待審核', f.id, `${flagWho(f)}（原本：${z}）；已寄出的信沒有收回`, b);
    await b.commit();
    await refresh(); paintAll(); toast('已退回待審核');
  });

  /* ── 抓蟲榜 ── */
  const rowsOf = () => Object.entries(board).map(([id, d]) => ({ id, score: +d.score || 0, n: +d.n || 0, firstAt: toMs(d.firstAt), d }))
    .filter(r => r.score !== 0 || (r.d.reports || []).length || (r.d.notes || []).length).sort(bugCmp);
  function paintBoard() {
    const rows = rowsOf(), pos = rows.filter(r => r.score > 0);
    const nick = id => { const s = sOf(id); return s && s.played && s.nick ? s.nick : '—'; };
    $('[data-board]', el).innerHTML = `<p class="dim" style="margin:0 0 6px">跟學生佈告欄看到的同一個榜（前 10 名、0 分不上榜），這裡多顯示姓名和明細。</p>
      <div class="row" style="margin-bottom:8px"><button class="px-btn" data-bonus>＋ 手動加分</button>
        <label>寄獎給前 <input class="inp" type="number" min="1" max="30" value="3" data-topn style="width:64px"> 名</label><button class="px-btn" data-sendtop>去信箱寄獎</button></div>
      <div class="tscroll"><table class="tbl cardy" data-boardtable><thead><tr><th>名次</th><th>學生</th><th>暱稱</th><th>分數</th><th>確認件數</th><th>加分</th><th></th></tr></thead><tbody>${rows.map(r => {
        const i = pos.indexOf(r), hide = !!r.d.hideNick;
        return `<tr data-bid="${esc(r.id)}" class="${i >= 10 || i < 0 ? 'off' : ''}"><td data-l="名次">${i >= 0 ? (i < 10 ? i + 1 : `<span class="dim">${i + 1}（榜外）</span>`) : '<span class="dim">—</span>'}</td>
          <td data-l="學生">${esc(label(r.id))}</td><td data-l="暱稱">${esc(nick(r.id))}${hide ? ' <span class="chip warn">已隱藏</span>' : ''}</td><td data-score data-l="分數"><b>${r.score}</b></td><td data-l="確認件數">${r.n}</td><td data-l="加分">${+r.d.bonus ? esc(r.d.bonus > 0 ? '+' + r.d.bonus : r.d.bonus) : '—'}</td>
          <td class="acts"><button class="px-btn sm" data-detail="${esc(r.id)}">${openId === r.id ? '收起' : '明細'}</button> <button class="px-btn sm" data-bonus-for="${esc(r.id)}">加分</button> <button class="px-btn sm" data-hide="${esc(r.id)}">${hide ? '恢復暱稱' : '隱藏暱稱'}</button> <button class="px-btn sm" data-king="${esc(r.id)}">頒發職業除錯師</button></td></tr>
          ${openId === r.id ? `<tr data-detailrow="${esc(r.id)}"><td colspan="7" class="wrap" style="background:#1b1710">${detailHtml(r)}</td></tr>` : ''}`;
      }).join('') || '<tr><td colspan="7" class="dim">還沒有人上榜。學生的回報被你「確認」後，就會出現在這裡；也可以按上面的「手動加分」。</td></tr>'}</tbody></table></div>`;
  }
  function detailHtml(r) {
    const rs = (Array.isArray(r.d.reports) ? r.d.reports : []).slice().sort((a, b) => (b.t || 0) - (a.t || 0)), notes = Array.isArray(r.d.notes) ? r.d.notes : [];
    const stName = { approved: '✓ 確認', rejected: '不採用', dup: '重複' };
    return `<b>回報明細</b><ul style="margin:4px 0 8px;padding-left:1.2em">${rs.map(x => { const f = flags.find(q => q.id === x.id); return `<li>${esc(fmtT(x.t))}　${esc(stName[x.st] || x.st)}${x.st === 'approved' ? `（${clampSev(x.sev)} 分）` : ''}：${f ? esc(clipS(bugText(f).did, 30)) + '／' + esc(clipS(bugText(f).what, 30)) : '<span class="dim">（找不到原始回報）</span>'}${x.reply ? `　<span class="dim">回覆：${esc(x.reply)}</span>` : ''}</li>`; }).join('') || '<li class="dim">沒有</li>'}</ul>
      <b>手動加分</b><ul style="margin:4px 0 0;padding-left:1.2em">${notes.map(x => `<li>${esc(fmtT(x.t))}　${x.pts > 0 ? '+' : ''}${x.pts} 分：${esc(x.why)}</li>`).join('') || '<li class="dim">沒有</li>'}</ul>`;
  }

  const doHide = guard(async id => {
    const hide = !(board[id] && board[id].hideNick), s = sOf(id);
    if (hide && !await ask('隱藏暱稱', `<p>隱藏 <b>${esc(label(id))}</b> 的暱稱後，所有榜單都會顯示「神秘獵人」。要恢復隨時可以。</p>`, '隱藏')) return;
    const p = idParts(id), b = writeBatch(db);
    b.set(doc(db, 'mg_bugboard', id), { className: (s && s.className) || p.className, seat: s ? s.seat : p.seat, hideNick: hide }, { merge: true });
    await log(hide ? '隱藏暱稱' : '恢復暱稱', id, `${label(id)}（暱稱：${s ? s.nick || '—' : '—'}）`, b);
    await b.commit(); await refresh(); paintAll(); toast(hide ? '已隱藏暱稱' : '已恢復暱稱');
  });

  /* 頒發職業除錯師＝寄 word bugking 的信，固定 ID：同一個人只會有一封 */
  const doKing = guard(async id => {
    const mid = 'award_bugking_' + id;
    if (await mailExists(mid)) { toast(`${label(id)} 已經頒發過職業除錯師了（信件 ${mid}）`, true); return; }
    const now = Date.now(), m = { aud: ['id:' + id], title: MAIL_AWARD_TITLE, body: '你是抓蟲抓得最多的人，老師頒給你特別稱號「職業除錯師」！到背包的稱號裡就能戴上。', items: [{ type: 'word', key: 'bugking' }], from: '老師', sendAt: now, expireAt: 0, t: now, src: 'award' };
    if (!await previewMail(m, `寄給 ${label(id)}：🏅 稱號詞條「職業除錯師」`, '確認頒發')) return;
    const b = writeBatch(db);
    b.set(doc(db, 'mg_mail', mid), m);
    await log('頒發職業除錯師', id, label(id), b);
    await b.commit(); invalidate('mails'); toast('已寄出職業除錯師');
  });

  /* 手動加分：可以一次選好幾位同學，同一個分數與理由。理由只寫進 mg_bugboard_private（跟操作紀錄），
     學生讀得到的 mg_bugboard 只多一個 bonus 數字。加分時可以順便寄一封感謝信（信裡不放理由）。 */
  const BONUS_MAX_PEOPLE = 40;
  const doBonus = guard(async pre => {
    let box, q = '';
    const chosen = new Set(pre ? [pre] : []);
    const cands = () => scores.filter(s => matchStudent(s, q)).sort((a, b) => (chosen.has(b.id) ? 1 : 0) - (chosen.has(a.id) ? 1 : 0)).slice(0, 40);
    const candHtml = () => cands().map(s => `<label class="chk" style="display:flex;padding:2px 0"><input type="checkbox" data-pick="${esc(s.id)}" ${chosen.has(s.id) ? 'checked' : ''}> ${esc(clsShort(s.className))}・${s.seat}號 ${esc(s.name)}</label>`).join('')
      || '<span class="dim">找不到。可以用姓名，或「503 5」（班級 座號）來找。</span>';
    const chipHtml = () => [...chosen].map(id => `<span class="chip">${esc(label(id))} <a href="#" data-unpick="${esc(id)}" style="text-decoration:none" aria-label="拿掉">✕</a></span>`).join(' ') || '<span class="dim">還沒選人</span>';
    const r = await modal({ title: '手動加分', sticky: true, buttons: [{ id: 'no', label: '取消' }, { id: 'ok', label: '加分', cls: 'gold' }],
      onOpen: b => {
        box = b;
        const repaintList = () => { $('[data-cands]', b).innerHTML = candHtml(); };
        const repaintChips = () => { $('[data-chips]', b).innerHTML = chipHtml(); $('[data-nchosen]', b).textContent = chosen.size; };
        /* 注音輸入中（還沒按選字）不要搜尋，不然打到一半列表就清空 */
        const qIn = $('[data-q]', b);
        qIn.addEventListener('input', e => { if (e.isComposing) return; q = e.target.value; repaintList(); });
        qIn.addEventListener('compositionend', e => { q = e.target.value; repaintList(); });
        b.addEventListener('change', e => { const t = e.target.closest('[data-pick]'); if (!t) return; t.checked ? chosen.add(t.dataset.pick) : chosen.delete(t.dataset.pick); repaintChips(); });
        b.addEventListener('click', e => { const u = e.target.closest('[data-unpick]'); if (!u) return; e.preventDefault(); chosen.delete(u.dataset.unpick); repaintList(); repaintChips(); });
        b.closest('[data-modal]').addEventListener('click', e => {
          if (!e.target.closest('[data-btn="ok"]')) return;
          const msg = errOf(); if (msg) { e.stopPropagation(); e.preventDefault(); $('[data-berr]', b).textContent = msg; }
        }, true);
        repaintChips();
      },
      html: `<p class="dim" style="margin:0 0 6px">給「已經在遊戲外抓過蟲」的同學補分，或扣回加錯的分。可以一次選好幾位，大家加一樣的分數。分數可以是負數，一定要寫理由。</p>
        <input class="inp" data-q placeholder="搜尋：姓名、暱稱，或「503 5」（班級 座號）" style="width:100%">
        <div data-cands style="max-height:170px;overflow-y:auto;border:2px solid var(--line);padding:4px 8px;margin-top:4px">${candHtml()}</div>
        <div style="margin-top:6px"><span class="dim">已選 <b data-nchosen>0</b> 人：</span> <span data-chips></span></div>
        <div class="row" style="margin-top:8px"><label>分數 <input class="inp" type="number" step="1" min="-20" max="20" data-pts style="width:130px" placeholder="例 2 或 -1"></label>
          <label style="flex:1;min-width:200px">理由 <input class="inp" data-why maxlength="60" style="width:100%" placeholder="只有老師看得到"></label></div>
        <label class="chk" style="margin-top:6px"><input type="checkbox" data-mail checked> 同時寄一封感謝信給他們（只有加分才寄；信裡不會寫理由）</label>
        <div class="warn" data-berr style="min-height:1.3em"></div>` });
    function errOf() {
      const pts = Number($('[data-pts]', box).value), why = $('[data-why]', box).value.trim();
      if (!chosen.size) return '請選至少一位同學';
      if (chosen.size > BONUS_MAX_PEOPLE) return `一次最多 ${BONUS_MAX_PEOPLE} 位`;
      if (!Number.isInteger(pts) || pts === 0 || $('[data-pts]', box).value.trim() === '') return '分數要是不為 0 的整數（可以是負數）';
      if (Math.abs(pts) > 20) return '一次最多加減 20 分';
      if (!why) return '請寫理由';
      return '';
    }
    if (r !== 'ok') return;
    const ids = [...chosen], pts = Number($('[data-pts]', box).value), why = $('[data-why]', box).value.trim(), t = Date.now(), thanks = $('[data-mail]', box).checked && pts > 0;
    const curs = await Promise.all(ids.map(async id => [id, await freshBoard(id), await freshPriv(id)]));
    const b = writeBatch(db);
    for (const [id, cur, priv] of curs) {
      const s = sOf(id), rs0 = Array.isArray(cur.reports) ? cur.reports : [];
      const bonus = (+cur.bonus || 0) + pts, notes = (Array.isArray(priv.notes) ? priv.notes : []).concat([{ pts, why, t }]);
      b.set(doc(db, 'mg_bugboard', id), boardPatch(id, { cls: s && s.className, seat: s && s.seat }, Object.assign({}, cur, { bonus }), rs0, { bonus }, notes), { merge: true });
      b.set(doc(db, 'mg_bugboard_private', id), { notes }, { merge: true });
      if (thanks) b.set(doc(db, 'mg_mail', `bonus_${id}_${t}`), { aud: ['id:' + id], title: MAIL_BUG_TITLE, body: `老師幫你補了抓蟲分 +${pts} 分，謝謝你幫忙找問題！`, items: [], from: '老師', sendAt: t, expireAt: 0, t, src: 'bug' });
      await log('抓蟲手動加分', id, `${label(id)}：${pts > 0 ? '+' : ''}${pts} 分（${why}）${ids.length > 1 ? `；同一批共 ${ids.length} 人` : ''}${thanks ? '；寄了感謝信' : ''}`, b);
    }
    await b.commit(); await refresh(); paintAll(); toast(`已幫 ${ids.length} 位同學${pts > 0 ? '加' : '扣'} ${Math.abs(pts)} 分`);
  });

  /* ── 事件 ── */
  el.addEventListener('click', e => {
    const q = s => e.target.closest(s); let b;
    if ((b = q('[data-zone]'))) { zone = b.dataset.zone; paintReports(); return; }
    if ((b = q('[data-confirm]'))) return doConfirm(b.dataset.confirm);
    if ((b = q('[data-dup]'))) return doDup(b.dataset.dup);
    if ((b = q('[data-reject]'))) return doReject(b.dataset.reject);
    if ((b = q('[data-undo]'))) return doUndo(b.dataset.undo);
    if ((b = q('[data-usesugg]'))) return useSugg(b.dataset.usesugg);
    if ((b = q('[data-dropsugg]'))) { dropSugg(b.dataset.dropsugg); sugg = loadSugg(); paintAll(); return; }
    if ((b = q('[data-detail]'))) { openId = openId === b.dataset.detail ? '' : b.dataset.detail; paintBoard(); return; }
    if ((b = q('[data-hide]'))) return doHide(b.dataset.hide);
    if ((b = q('[data-king]'))) return doKing(b.dataset.king);
    if ((b = q('[data-bonus-for]'))) return doBonus(b.dataset.bonusFor);
    if (q('[data-bonus]')) return doBonus('');
    if (q('[data-sendtop]')) {
      const n = Math.max(1, Math.min(30, Math.round(+$('[data-topn]', el).value) || 3)), top = rowsOf().filter(r => r.score > 0).slice(0, n);
      if (!top.length) { toast('還沒有人上榜', true); return; }
      ctx.go('mail', { aud: top.map(r => 'id:' + r.id), title: '抓蟲大作戰獎勵', body: '謝謝你幫忙抓蟲，你是抓蟲榜前幾名！', items: [] });
    }
  });
  const paintAll = () => { paintReports(); paintBoard(); exp.repaint(); };
  /* 狀態一律用「現在讀到的 flags」判斷，不是匯出當時的：匯出之後別的分頁審過的，建議就不收 */
  const exp = mountBugExport($('[data-bugexp]', el), {
    esc, ask, log, toast, getFlags: () => flags, getBoard: () => board,
    getNames: () => scores.map(s => s.name).filter(Boolean),
    statusOf: id => { const f = flags.find(x => x.id === id); return f && f.type === 'bug' ? zoneOf(f) : null; },
    pendingSuggCount: () => bugs().filter(f => zoneOf(f) === 'pending' && sugg[f.id]).length,
    onImport: acc => { const cur = Object.assign({}, loadSugg()); acc.forEach(a => { cur[a.flagId] = { rid: a.rid, verdict: a.verdict, sev: a.sev, dupOf: a.dupOf, note: a.note, reply: a.reply }; }); saveSugg(cur); sugg = cur; paintReports(); },
    onClear: () => { clearSugg(); sugg = {}; paintReports(); },
    applyAll: doApplyAll,
    appVersion: () => appVersion
  });
  /* 版本號在遊戲本體 index.html，抓不到就寫「?」不擋匯出 */
  let appVersion = '?';
  fetch('index.html').then(r => r.text()).then(t => { const m = /const APP_VERSION\s*=\s*'([^']+)'/.exec(t); if (m) appVersion = m[1]; }).catch(() => {});
  paintAll();
}
