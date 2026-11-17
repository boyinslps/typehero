/* 🐛 回報與抓蟲榜（SPEC §6.2、§7.4）。
   回報（mg_nw_flags 裡 type == 'bug'）：待審核／已確認／不採用／重複，四區。status 存 'pending'|'approved'|'rejected'|'dup'。
   每次審核都用「同一個 batch」寫：flag 的結果、mg_bugboard 的分數與 reports、獎勵信 bug_{flagID}。三樣一起成功或一起失敗。
   分數永遠從 reports＋bonus 重算（bug-calc.js），不累加，所以重按、撤銷都不會算歪；
   信是固定 ID：已經存在的不會重寄、也不會被覆蓋。 */
import { db, doc, getDoc, writeBatch, deleteField } from './fb.js';
import { loadScores, loadBoard, loadFlags, invalidate } from './data.js';
import { clsShort, toMs, bugCmp, BUG_COINS, BUG_REWARD_MAX } from './nw.js';
import { boardCalc, approvedCount, bugText, putReport, dropReport, SEV_NAME, clampSev } from './bug-calc.js';
import { MAIL_BUG_TITLE, MAIL_AWARD_TITLE } from './migrate.js';
import { idParts } from './ids.js';
import { $, esc, fmtT, log, ask, modal, toast, errText, previewMail } from './util.js';

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
    <h3>問題回報</h3><div class="row" data-zones></div><div data-reports style="margin-top:8px"></div>
    <h3>抓蟲榜</h3><div data-board></div>`;

  /* ── 回報清單 ── */
  function reportCard(f) {
    const z = zoneOf(f), t = bugText(f), canAct = !!f.docId;
    const orig = z === 'dup' && f.dupOf ? flags.find(x => x.id === f.dupOf) : null;
    return `<div class="px-panel in" data-flag="${esc(f.id)}" style="margin-bottom:8px">
      <div class="row"><b>${esc(flagWho(f))}</b><span class="dim">${esc(fmtT(f.t))}${f.cat ? '・' + esc(f.cat) : ''}</span>
        ${z === 'approved' ? `<span class="chip ok">嚴重度 ${esc(SEV_NAME[clampSev(f.sev)])}（${clampSev(f.sev)} 分）</span>` : ''}${z === 'rejected' ? '<span class="chip warn">不採用</span>' : ''}${z === 'dup' ? '<span class="chip" style="color:var(--blue)">重複</span>' : ''}</div>
      <div class="kv" style="margin-top:6px"><b>做了什麼</b><span style="overflow-wrap:anywhere" data-did>${nl(t.did) || '<span class="dim">（沒寫）</span>'}</span>
        <b>錯誤狀況</b><span style="overflow-wrap:anywhere" data-what>${nl(t.what) || '<span class="dim">（沒寫）</span>'}</span>
        ${f.reply ? `<b>你的回覆</b><span>${nl(f.reply)}</span>` : ''}${orig ? `<b>跟哪一則一樣</b><span>${esc(flagWho(orig))}：${esc(clipS(bugText(orig).did, 30))}</span>` : ''}</div>
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
      + (L.slice(0, 60).map(reportCard).join('') || `<p class="dim" data-empty>這一區沒有回報</p>`) + (L.length > 60 ? `<p class="dim">只列最近 60 則，共 ${L.length} 則</p>` : '');
  }

  /* ── 寫入：flag＋bugboard＋信，同一個 batch ── */
  let busy = false;
  const guard = fn => async (...a) => { if (busy) return; busy = true; try { await fn(...a); } catch (e) { toast('失敗：' + errText(e), true); console.error(e); } finally { busy = false; } };
  const freshBoard = async id => { const s = await getDoc(doc(db, 'mg_bugboard', id)); return s.exists() ? (s.data() || {}) : {}; };
  const mailExists = async id => (await getDoc(doc(db, 'mg_mail', id))).exists();
  const boardPatch = (id, f0, cur, reports, extra) => {
    const p = idParts(id), c = boardCalc(reports, cur.bonus, cur.notes);
    return Object.assign({ className: cur.className || (f0 && f0.cls) || p.className, seat: cur.seat !== undefined && cur.seat !== '' ? cur.seat : (f0 && f0.seat !== undefined && f0.seat !== '' ? +f0.seat : p.seat),
      score: c.score, n: c.n, firstAt: c.firstAt, reports }, extra || {});
  };
  const flagWrite = (b, f, data) => b.set(doc(db, 'mg_nw_flags', f.id), data, { merge: true });
  const mailDoc = (f, title, body, items) => { const now = Date.now(); return { aud: ['id:' + f.docId], title, body: clipS(body, 200), items, from: '老師', sendAt: now, expireAt: 0, t: now, src: 'bug' }; };
  const replyLine = r => r ? `\n老師說：${r}` : '';

  const doConfirm = guard(async id => {
    const f = flags.find(x => x.id === id); if (!f) return;
    const cur = await freshBoard(f.docId), rs0 = Array.isArray(cur.reports) ? cur.reports : [];
    const already = rs0.find(r => r && r.id === f.id && r.st === 'approved');
    const before = approvedCount(rs0.filter(r => r.id !== f.id)), coins = before < BUG_REWARD_MAX;
    let box;
    const r = await modal({ title: `確認這則回報（${flagWho(f)}）`, buttons: [{ id: 'no', label: '取消' }, { id: 'ok', label: '確認並寄獎勵', cls: 'gold' }], onOpen: b => { box = b; },
      html: `<div class="kv"><b>做了什麼</b><span>${nl(bugText(f).did)}</span><b>錯誤狀況</b><span>${nl(bugText(f).what)}</span></div>
        ${already ? '<div class="note bad">這則已經確認過、分數算過了。按確認只會補寫回報狀態，分數和信都不會動。</div>' : ''}
        <div style="margin-top:8px"><b>嚴重度</b><div class="row" data-sev>${[1, 2, 3].map(v => `<label class="chk"><input type="radio" name="sev" value="${v}" ${v === clampSev(already ? already.sev : 1) ? 'checked' : ''}> ${SEV_NAME[v]}（${v} 分）</label>`).join('')}</div></div>
        <div style="margin-top:8px"><b>回覆（可以不寫）</b><input class="inp" data-reply maxlength="60" style="width:100%" placeholder="一句話，例如：謝謝你，這個問題我修好了"></div>
        <div class="note" data-mailinfo>${already ? '' : coins ? `會寄信：🪙 字元 ×${BUG_COINS}（這位學生的第 ${before + 1} 個，前 ${BUG_REWARD_MAX} 個有字元）` : `會寄感謝信，沒有字元（這位學生已經有 ${before} 個被確認，超過 ${BUG_REWARD_MAX} 個只寄感謝）`}</div>` });
    if (r !== 'ok') return;
    /* 已經算過的回報（兩個分頁同時按、畫面沒更新）：只補寫 flag 的狀態，分數、信都不動，所以重按不會重複加分 */
    const sev = already ? clampSev(already.sev) : clampSev($('input[name="sev"]:checked', box).value), reply = already ? String(already.reply || '') : $('[data-reply]', box).value.trim();
    const b = writeBatch(db);
    flagWrite(b, f, { status: 'approved', sev, reply, dupOf: deleteField() });
    if (!already) {
      b.set(doc(db, 'mg_bugboard', f.docId), boardPatch(f.docId, f, cur, putReport(rs0, { id: f.id, st: 'approved', sev, reply, t: f.t || 0 })), { merge: true });
      if (!(await mailExists('bug_' + f.id))) b.set(doc(db, 'mg_mail', 'bug_' + f.id), mailDoc(f, MAIL_BUG_TITLE,
        (coins ? `老師確認了你回報的問題，幫了大忙！送你 ${BUG_COINS} 字元。` : '老師確認了你回報的問題，幫了大忙，謝謝你！') + replyLine(reply),
        coins ? [{ type: 'coins', n: BUG_COINS }] : []));
    }
    await log('確認回報', f.id, `${flagWho(f)}：嚴重度${SEV_NAME[sev]}${already ? '（補寫，沒有重複加分）' : coins ? `，寄 ${BUG_COINS} 字元` : '，只寄感謝'}`, b);
    await b.commit();
    await refresh(); paintAll(); toast(already ? '已補寫（沒有重複加分）' : `已確認，加 ${sev} 分，獎勵信寄出了`);
  });

  const doDup = guard(async id => {
    const f = flags.find(x => x.id === id); if (!f) return;
    const others = bugs().filter(x => x.id !== f.id).sort((a, b) => (zoneOf(a) === 'approved' ? 0 : 1) - (zoneOf(b) === 'approved' ? 0 : 1) || (a.t || 0) - (b.t || 0));
    if (!others.length) { toast('沒有其他回報可以比對', true); return; }
    let box;
    const r = await modal({ title: `標成重複（${flagWho(f)}）`, buttons: [{ id: 'no', label: '取消' }, { id: 'ok', label: '標成重複', cls: 'gold' }], onOpen: b => { box = b; },
      html: `<div class="kv"><b>這則</b><span>${esc(clipS(bugText(f).did, 40))}／${esc(clipS(bugText(f).what, 40))}</span></div>
        <div style="margin-top:8px"><b>跟哪一則一樣？</b><select class="inp" data-dupof style="width:100%">${others.map(o => `<option value="${esc(o.id)}">${zoneOf(o) === 'approved' ? '✓ ' : ''}${esc(flagWho(o))}：${esc(clipS(bugText(o).did, 24))}</option>`).join('')}</select></div>
        <div class="note">不加分，但會寄一封<b>感謝信</b>（沒有字元）。第一個回報的人才算分。</div>` });
    if (r !== 'ok') return;
    const dupOf = $('[data-dupof]', box).value, cur = await freshBoard(f.docId), rs0 = Array.isArray(cur.reports) ? cur.reports : [];
    const entry = { id: f.id, st: 'dup', sev: 0, reply: '', t: f.t || 0, dupOf };
    const b = writeBatch(db);
    flagWrite(b, f, { status: 'dup', dupOf, sev: deleteField() });
    b.set(doc(db, 'mg_bugboard', f.docId), boardPatch(f.docId, f, cur, putReport(rs0, entry)), { merge: true });
    if (!(await mailExists('bug_' + f.id))) b.set(doc(db, 'mg_mail', 'bug_' + f.id), mailDoc(f, MAIL_BUG_TITLE, '你發現的問題，已經有同學先回報了。謝謝你也發現它！', []));
    await log('回報標成重複', f.id, `${flagWho(f)}：跟 ${dupOf} 一樣，不加分，寄感謝信`, b);
    await b.commit();
    await refresh(); paintAll(); toast('已標成重複，寄了感謝信');
  });

  const doReject = guard(async id => {
    const f = flags.find(x => x.id === id); if (!f) return;
    let box;
    const r = await modal({ title: `不採用這則回報（${flagWho(f)}）`, buttons: [{ id: 'no', label: '取消' }, { id: 'ok', label: '不採用', cls: 'danger' }], onOpen: b => { box = b; },
      html: `<div class="kv"><b>做了什麼</b><span>${nl(bugText(f).did)}</span><b>錯誤狀況</b><span>${nl(bugText(f).what)}</span></div>
        <div style="margin-top:8px"><b>回覆（學生在「我的回報」會看到）</b><input class="inp" data-reply maxlength="60" style="width:100%" placeholder="一句話，例如：這是設計成這樣的"></div>` });
    if (r !== 'ok') return;
    const reply = $('[data-reply]', box).value.trim(), cur = await freshBoard(f.docId), rs0 = Array.isArray(cur.reports) ? cur.reports : [];
    const b = writeBatch(db);
    flagWrite(b, f, { status: 'rejected', reply, sev: deleteField(), dupOf: deleteField() });
    b.set(doc(db, 'mg_bugboard', f.docId), boardPatch(f.docId, f, cur, putReport(rs0, { id: f.id, st: 'rejected', sev: 0, reply, t: f.t || 0 })), { merge: true });
    await log('不採用回報', f.id, `${flagWho(f)}${reply ? '：' + reply : ''}`, b);
    await b.commit();
    await refresh(); paintAll(); toast('已標成不採用');
  });

  const doUndo = guard(async id => {
    const f = flags.find(x => x.id === id); if (!f) return;
    const z = zoneOf(f);
    if (!await ask(z === 'approved' ? '撤銷確認？' : '退回待審核？', `<p>${esc(flagWho(f))} 的這則回報會回到「待審核」，${z === 'approved' ? `分數會重算（扣回 ${clampSev(f.sev)} 分）` : '不影響分數'}。</p>
      ${z === 'approved' || z === 'dup' ? '<p class="warn"><b>已經寄出的信不收回</b>，學生領了的字元也不會扣。之後再確認，不會重寄同一封。</p>' : ''}`, z === 'approved' ? '撤銷確認' : '退回', '先不要', true)) return;
    const cur = await freshBoard(f.docId), rs0 = Array.isArray(cur.reports) ? cur.reports : [];
    const b = writeBatch(db);
    flagWrite(b, f, { status: 'pending', sev: deleteField(), reply: deleteField(), dupOf: deleteField() });
    b.set(doc(db, 'mg_bugboard', f.docId), boardPatch(f.docId, f, cur, dropReport(rs0, f.id)), { merge: true });
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
      <div class="tscroll"><table class="tbl" data-boardtable><thead><tr><th>名次</th><th>學生</th><th>暱稱</th><th>分數</th><th>確認件數</th><th>加分</th><th></th></tr></thead><tbody>${rows.map(r => {
        const i = pos.indexOf(r), hide = !!r.d.hideNick;
        return `<tr data-bid="${esc(r.id)}" class="${i >= 10 || i < 0 ? 'off' : ''}"><td>${i >= 0 ? (i < 10 ? i + 1 : `<span class="dim">${i + 1}（榜外）</span>`) : '<span class="dim">—</span>'}</td>
          <td>${esc(label(r.id))}</td><td>${esc(nick(r.id))}${hide ? ' <span class="chip warn">已隱藏</span>' : ''}</td><td data-score><b>${r.score}</b></td><td>${r.n}</td><td>${+r.d.bonus ? esc(r.d.bonus > 0 ? '+' + r.d.bonus : r.d.bonus) : '—'}</td>
          <td><button class="px-btn sm" data-detail="${esc(r.id)}">${openId === r.id ? '收起' : '明細'}</button> <button class="px-btn sm" data-bonus-for="${esc(r.id)}">加分</button> <button class="px-btn sm" data-hide="${esc(r.id)}">${hide ? '恢復暱稱' : '隱藏暱稱'}</button> <button class="px-btn sm" data-king="${esc(r.id)}">頒發職業除錯師</button></td></tr>
          ${openId === r.id ? `<tr data-detailrow="${esc(r.id)}"><td colspan="7" class="wrap" style="background:#1b1710">${detailHtml(r)}</td></tr>` : ''}`;
      }).join('') || '<tr><td colspan="7" class="dim">還沒有人上榜</td></tr>'}</tbody></table></div>`;
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

  const doBonus = guard(async pre => {
    let box, chosen = pre || '';
    const matches = q => scores.filter(s => !q || `${s.name} ${s.nick} ${s.seat} ${clsShort(s.className)}`.toLowerCase().includes(q.toLowerCase())).slice(0, 40);
    const optHtml = q => matches(q).map(s => `<option value="${esc(s.id)}" ${s.id === chosen ? 'selected' : ''}>${esc(clsShort(s.className))}・${s.seat}號 ${esc(s.name)}</option>`).join('');
    const r = await modal({ title: '手動加分', buttons: [{ id: 'no', label: '取消' }, { id: 'ok', label: '加分', cls: 'gold' }],
      onOpen: b => {
        box = b;
        $('[data-q]', b).addEventListener('input', e => { $('[data-stu]', b).innerHTML = optHtml(e.target.value); });
        $('[data-stu]', b).addEventListener('change', e => { chosen = e.target.value; });
        b.closest('[data-modal]').addEventListener('click', e => {
          if (!e.target.closest('[data-btn="ok"]')) return;
          const msg = errOf(); if (msg) { e.stopPropagation(); e.preventDefault(); $('[data-berr]', b).textContent = msg; }
        }, true);
      },
      html: `<p class="dim" style="margin:0 0 6px">給「已經在遊戲外抓過蟲」的學生補分，或扣回加錯的分。分數可以是負數，一定要寫理由。</p>
        <input class="inp" data-q placeholder="搜尋姓名／暱稱／座號" style="width:100%"><select class="inp" data-stu size="6" style="width:100%;margin-top:4px">${optHtml('')}</select>
        <div class="row" style="margin-top:8px"><label>分數 <input class="inp" type="number" step="1" min="-20" max="20" data-pts style="width:80px" placeholder="例 2 或 -1"></label>
          <label style="flex:1">理由 <input class="inp" data-why maxlength="60" style="width:100%"></label></div><div class="warn" data-berr style="min-height:1.3em"></div>` });
    function errOf() {
      const sid = $('[data-stu]', box).value, pts = Number($('[data-pts]', box).value), why = $('[data-why]', box).value.trim();
      if (!sid) return '請選一位學生';
      if (!Number.isInteger(pts) || pts === 0 || $('[data-pts]', box).value.trim() === '') return '分數要是不為 0 的整數（可以是負數）';
      if (Math.abs(pts) > 20) return '一次最多加減 20 分';
      if (!why) return '請寫理由';
      return '';
    }
    if (r !== 'ok') return;
    const id = $('[data-stu]', box).value, pts = Number($('[data-pts]', box).value), why = $('[data-why]', box).value.trim();
    const cur = await freshBoard(id), s = sOf(id), rs0 = Array.isArray(cur.reports) ? cur.reports : [];
    const next = Object.assign({}, cur, { bonus: (+cur.bonus || 0) + pts, notes: (Array.isArray(cur.notes) ? cur.notes : []).concat([{ pts, why, t: Date.now() }]) });
    const b = writeBatch(db);
    b.set(doc(db, 'mg_bugboard', id), boardPatch(id, { cls: s && s.className, seat: s && s.seat }, next, rs0, { bonus: next.bonus, notes: next.notes }), { merge: true });
    await log('抓蟲手動加分', id, `${label(id)}：${pts > 0 ? '+' : ''}${pts} 分（${why}）`, b);
    await b.commit(); await refresh(); paintAll(); toast(`已加 ${pts} 分`);
  });

  /* ── 事件 ── */
  el.addEventListener('click', e => {
    const q = s => e.target.closest(s); let b;
    if ((b = q('[data-zone]'))) { zone = b.dataset.zone; paintReports(); return; }
    if ((b = q('[data-confirm]'))) return doConfirm(b.dataset.confirm);
    if ((b = q('[data-dup]'))) return doDup(b.dataset.dup);
    if ((b = q('[data-reject]'))) return doReject(b.dataset.reject);
    if ((b = q('[data-undo]'))) return doUndo(b.dataset.undo);
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
  const paintAll = () => { paintReports(); paintBoard(); };
  paintAll();
}
