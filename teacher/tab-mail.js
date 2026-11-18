/* ✉ 信箱（SPEC §3.3）：寄信（三種收件人、禮物列、預約、有效期限、預覽摘要）、寄出紀錄、收回、領取狀況。
   信的格式是 mg_mail/{ID}，學生端 fetchMail() 用 aud 陣列查。系統產生的信（活動、回報、頒獎）要用固定 ID，
   手動寄的用自動 ID（uid('m')）。 */
import { db, doc, setDoc, deleteDoc } from './fb.js';
import { loadScores, loadMails, invalidate, audRecipients, audText } from './data.js';
import { clsShort, toMs } from './nw.js';
import { GIFT_TYPES, giftType, newItem, itemLabel, itemError } from './gifts.js';
import { $, $$, esc, uid, fmtT, fromInput, log, modal, ask, toast, errText, confirmBig, previewMail, mailCardHtml, mailSummary, matchStudent, helpBox } from './util.js';

const SRC = [['', '全部來源'], ['manual', '手動寄的'], ['event', '活動獎勵'], ['bug', '回報獎勵'], ['award', '頒獎']];
const srcName = s => s === 'manual' ? '手動' : (s || '').startsWith('event') ? '活動' : s === 'bug' ? '回報' : s === 'award' ? '頒獎' : (s || '—');
const srcKey = s => (s || '').startsWith('event') ? 'event' : (s || 'manual');

export default async function mount(el, ctx, params) {
  const scores = await loadScores(true);
  let mails = await loadMails(true);
  const classes = [...new Set(scores.map(s => s.className).filter(Boolean))].sort((a, b) => clsShort(a) < clsShort(b) ? -1 : 1);

  /* 表單狀態（畫面重畫時不能掉） */
  const pa = Array.isArray(params.aud) ? params.aud : [];
  const st = {
    /* 沒有從別的分頁帶收件人來，就一個都不選：預設「全校」太容易手滑寄給所有人 */
    mode: pa.includes('all') ? 'all' : pa.some(x => x.startsWith('id:')) ? 'stu' : pa.some(x => x.startsWith('cls:')) ? 'cls' : '',
    cls: new Set(pa.filter(x => x.startsWith('cls:')).map(x => x.slice(4))),
    ids: new Set(pa.filter(x => x.startsWith('id:')).map(x => x.slice(3))),
    q: '', title: params.title || '', body: params.body || '', sendAt: '', expireAt: '',
    items: Array.isArray(params.items) ? params.items.map(x => Object.assign({}, x)) : []
  };
  let srcFilter = '';

  const aud = () => st.mode === 'all' ? ['all'] : st.mode === 'cls' ? [...st.cls].map(c => 'cls:' + c) : st.mode === 'stu' ? [...st.ids].map(i => 'id:' + i) : [];
  const curMail = () => ({ aud: aud(), title: st.title.trim(), body: st.body.trim(), items: st.items.map(x => Object.assign({}, x)), from: '老師',
    sendAt: fromInput(st.sendAt) || Date.now(), expireAt: fromInput(st.expireAt) || 0 });
  const summaryOf = m => { const r = audRecipients(m.aud, scores); return mailSummary(audText(m.aud, scores), r.list.length, m.items); };

  /* ── 畫面：只有表單區塊重畫，不整頁重畫，才不會打到一半被洗掉 ── */
  el.innerHTML = `<h2>✉ 信箱</h2>
    ${helpBox(['先選收件人（全校、整班，或幾位學生），寫標題和內容，需要的話放禮物，按「預覽並寄出」。', '預覽會顯示學生看到的樣子和寄給幾個人，確認了才會真的寄出。', '寄出的信學生下次進新世界就收得到；已經領走的東西，收回也扣不回來。', '要寄給幾位學生：到「學生」分頁勾選，再按「寄信給勾選的 N 人」比較快。'])}
    <div class="grid2"><div data-form class="px-panel in"></div><div><div class="px-panel in" data-pv></div></div></div>
    <h3>寄出紀錄</h3><div class="row" style="margin-bottom:6px"><select class="inp" data-src>${SRC.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select>
      <span class="dim" data-mcount></span></div><div class="tscroll" style="max-height:60vh" data-sent></div>`;

  function paintForm() {
    const form = $('[data-form]', el);
    form.innerHTML = `
      <div class="row" data-mode>${[['all', '全校'], ['cls', '班級'], ['stu', '學生']].map(([v, t]) => `<label class="chk"><input type="radio" name="mode" value="${v}" ${st.mode === v ? 'checked' : ''}> ${t}</label>`).join('')}</div>
      ${st.mode === 'cls' ? `<div class="row" style="margin-top:6px">${classes.map(c => `<label class="chk"><input type="checkbox" data-cls="${esc(c)}" ${st.cls.has(c) ? 'checked' : ''}> ${esc(clsShort(c))}</label>`).join('') || '<span class="dim">還沒有學生存檔</span>'}</div>` : ''}
      ${st.mode === 'stu' ? `<div style="margin-top:6px"><input class="inp" data-q placeholder="搜尋：姓名、暱稱，或「503 5」（班級 座號）" value="${esc(st.q)}" style="width:100%">
          <div data-found></div>
          <div class="row" style="margin-top:4px" data-chosen>${[...st.ids].map(i => { const s = scores.find(x => x.id === i); return `<span class="chip">${s ? `${esc(clsShort(s.className))}・${s.seat}號 ${esc(s.name)}` : esc(i)} <a href="#" data-rm="${esc(i)}" style="text-decoration:none">✕</a></span>`; }).join('') || '<span class="dim">還沒選人</span>'}</div></div>` : ''}
      <div style="margin-top:10px"><b>標題</b> <span class="dim" data-tc></span><input class="inp" data-title maxlength="20" value="${esc(st.title)}" style="width:100%" placeholder="20 字內，例如：謝謝你幫忙抓蟲"></div>
      <div style="margin-top:8px"><b>內容</b> <span class="dim" data-bc></span><textarea class="inp" data-body maxlength="200" rows="3" placeholder="200 字內，用學生看得懂的話">${esc(st.body)}</textarea></div>
      <div style="margin-top:8px"><b>禮物</b> <span class="dim">（可以不放，只寄文字）</span><div data-gifts>${st.items.map(giftRow).join('')}</div>
        <select class="inp" data-addgift><option value="">＋ 加一個禮物…</option>${GIFT_TYPES.map(g => `<option value="${g.type}">${g.label}</option>`).join('')}</select></div>
      <div class="row gap" style="margin-top:10px">
        <label>預約寄送 <input class="inp" type="datetime-local" data-send value="${esc(st.sendAt)}"> <span class="dim">空白＝現在</span></label>
        <label>有效期限 <input class="inp" type="datetime-local" data-exp value="${esc(st.expireAt)}"> <span class="dim">空白＝不過期</span></label></div>
      <div class="row" style="margin-top:12px"><button class="px-btn gold" data-submit>預覽並寄出</button></div>
      <div class="warn" data-err style="min-height:1.3em;margin-top:6px"></div>`;
    counters(); paintFound();
  }
  /* 搜尋結果只換這一塊，輸入框不重畫（重畫會打斷注音輸入法） */
  function paintFound() {
    const box = $('[data-found]', el); if (!box) return;
    const found = st.q.trim() ? scores.filter(s => !st.ids.has(s.id) && matchStudent(s, st.q)).slice(0, 8) : [];
    box.innerHTML = found.length ? `<div class="row" style="margin-top:4px">${found.map(s => `<button class="px-btn sm" data-add="${esc(s.id)}">＋ ${esc(clsShort(s.className))}・${s.seat}號 ${esc(s.name)}</button>`).join('')}</div>`
      : st.q.trim() ? '<div class="dim" style="margin-top:4px">找不到。可以用姓名，或「503 5」（班級 座號）來找。</div>' : '';
  }
  function giftRow(it, i) {
    const g = giftType(it.type);
    const opts = g.pick ? g.pick() : null;
    let sel = '';
    if (opts) {
      const groups = g.groups;
      sel = `<select class="inp" data-key="${i}">${groups ? groups.map(gr => `<optgroup label="${gr}">${opts.filter(o => o.group === gr).map(o => `<option value="${esc(o.value)}" ${it.key === o.value ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</optgroup>`).join('')
        : opts.map(o => `<option value="${esc(o.value)}" ${it.key === o.value ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`;
    }
    return `<div class="gift-row" data-grow="${i}"><select class="inp" data-type="${i}">${GIFT_TYPES.map(x => `<option value="${x.type}" ${x.type === it.type ? 'selected' : ''}>${x.label}</option>`).join('')}</select>${sel}
      ${g.qty ? `<input class="inp" type="number" min="1" step="1" data-n="${i}" value="${it.n === undefined ? '' : it.n}" style="width:90px" aria-label="數量">` : ''}
      <button class="px-btn sm danger" data-del="${i}" aria-label="拿掉這個禮物">✕</button></div>`;
  }
  const counters = () => { const t = $('[data-tc]', el), b = $('[data-bc]', el); if (t) t.textContent = `${st.title.length}/20`; if (b) b.textContent = `${st.body.length}/200`; };
  function paintPreview() {
    const m = curMail(), r = audRecipients(m.aud, scores);
    $('[data-pv]', el).innerHTML = `<b>學生會看到的樣子</b>${mailCardHtml(m)}
      <div class="note ${m.aud.length ? '' : 'bad'}" data-summary style="margin-top:8px">${m.aud.length ? esc(summaryOf(m)) : '還沒選收件人（全校、班級或學生），要先選才寄得出去'}</div>
      ${r.unknown.length ? `<div class="note bad">有 ${r.unknown.length} 個收件人不在學生存檔裡</div>` : ''}
      ${m.sendAt > Date.now() + 60000 ? `<div class="dim">預約：${esc(fmtT(m.sendAt))} 才會送到</div>` : ''}${m.expireAt ? `<div class="dim">有效到 ${esc(fmtT(m.expireAt))}</div>` : ''}`;
  }

  /* ── 表單事件（掛在 el 上，重畫表單不用重新掛） ── */
  el.addEventListener('input', e => {
    const t = e.target;
    if (t.matches('[data-title]')) st.title = t.value;
    else if (t.matches('[data-body]')) st.body = t.value;
    else if (t.matches('[data-n]')) { const v = t.value.trim(); st.items[+t.dataset.n].n = v === '' ? NaN : Number(v); }
    else if (t.matches('[data-q]')) { if (e.isComposing) return; st.q = t.value; paintFound(); return; }
    else if (t.matches('[data-send]')) st.sendAt = t.value;
    else if (t.matches('[data-exp]')) st.expireAt = t.value;
    else return;
    counters(); paintPreview();
  });
  el.addEventListener('compositionend', e => { if (e.target.matches && e.target.matches('[data-q]')) { st.q = e.target.value; paintFound(); } });
  el.addEventListener('change', e => {
    const t = e.target;
    if (t.name === 'mode') { st.mode = t.value; paintForm(); }
    else if (t.matches('[data-cls]')) { t.checked ? st.cls.add(t.dataset.cls) : st.cls.delete(t.dataset.cls); }
    else if (t.matches('[data-addgift]')) { if (t.value) { st.items.push(newItem(t.value)); paintForm(); } }
    else if (t.matches('[data-type]')) { st.items[+t.dataset.type] = newItem(t.value); paintForm(); }
    else if (t.matches('[data-key]')) st.items[+t.dataset.key].key = t.value;
    else if (t.matches('[data-src]')) { srcFilter = t.value; paintSent(); return; }
    else return;
    paintPreview();
  });
  el.addEventListener('click', e => {
    const t = e.target;
    const add = t.closest('[data-add]'); if (add) { st.ids.add(add.dataset.add); st.q = ''; paintForm(); paintPreview(); const qi = $('[data-q]', el); if (qi) qi.focus(); return; }
    const rm = t.closest('[data-rm]'); if (rm) { e.preventDefault(); st.ids.delete(rm.dataset.rm); paintForm(); paintPreview(); return; }
    const del = t.closest('[data-del]'); if (del) { st.items.splice(+del.dataset.del, 1); paintForm(); paintPreview(); return; }
    if (t.closest('[data-submit]')) { send(); return; }
    const rc = t.closest('[data-receipt]'); if (rc) { receipt(rc.dataset.receipt); return; }
    const rb = t.closest('[data-recall]'); if (rb) recall(rb.dataset.recall);
  });

  /* ── 寄出 ── */
  const BIG_AUDIENCE = 60;   // 超過這個人數、又有禮物，要多確認一次
  const DAY = 24 * 3600 * 1000;
  /* 24 小時內有沒有寄過「同標題、收件人有重疊」的信：回重疊的人數（0＝沒有） */
  function repeatCount(m) {
    const mine = new Set(audRecipients(m.aud, scores).list.map(s => s.id)), now = Date.now(), seen = new Set();
    mails.filter(x => (x.title || '').trim() === m.title && now - toMs(x.t || x.sendAt) < DAY).forEach(x => audRecipients(x.aud, scores).list.forEach(s => { if (mine.has(s.id)) seen.add(s.id); }));
    return seen.size;
  }
  /* 全校（或很多人）＋禮物：寄出就收不回來，多一道要勾選的確認，並寫出人數 */
  async function confirmWide(m, count) {
    if (!m.items.length || !(m.aud.includes('all') || count > BIG_AUDIENCE)) return true;
    const who = m.aud.includes('all') ? `全校 ${count} 人` : `${count} 人`;
    return (await modal({ title: '寄給這麼多人，再確認一次', buttons: [{ id: 'no', label: '先不要' }, { id: 'ok', label: '確認寄出', cls: 'danger' }],
      html: `<p>這封信有禮物（${esc(m.items.map(itemLabel).join('、'))}），要寄給 <b data-wide-n>${who}</b>。</p>
        <label class="chk"><input type="checkbox" data-wide-ok> 我確認要寄給${esc(who)}，寄出後無法收回已領的東西</label>`,
      onOpen: (box, wrap) => { const ok = $('[data-btn="ok"]', wrap); ok.disabled = true; $('[data-wide-ok]', box).addEventListener('change', e => { ok.disabled = !e.target.checked; }); } })) === 'ok';
  }
  let sending = false;
  async function send() {
    if (sending) return;
    const err = $('[data-err]', el), m = curMail(), r = audRecipients(m.aud, scores);
    const bad = !m.aud.length ? '請先選收件人（全校、班級或學生）' : !r.list.length ? '找不到這些收件人（班級沒有學生存檔？）' : !m.title ? '請寫標題'
      : m.items.map(itemError).find(Boolean) || (m.expireAt && m.expireAt <= m.sendAt ? '有效期限要比寄送時間晚' : '');
    if (bad) { err.textContent = bad; return; }
    err.textContent = '';
    if (!await confirmBig(m.items)) return;
    try { mails = await loadMails(true); } catch (e) { console.warn('讀寄出紀錄失敗', e); }
    const dup = repeatCount(m);
    const warn = dup ? `<div class="note bad" data-repeat-warn>24 小時內你已經寄過同標題的信給其中 <b>${dup}</b> 人。再寄一次，他們會收到兩封（禮物領兩次）。</div>` : '';
    if (!await previewMail(m, summaryOf(m), '確認寄出', warn)) return;
    if (!await confirmWide(m, r.list.length)) return;
    sending = true;
    const btn = $('[data-submit]', el); btn.disabled = true;
    const id = uid('m'), doc1 = Object.assign({}, m, { t: Date.now(), src: 'manual' });
    try {
      await setDoc(doc(db, 'mg_mail', id), doc1);
    } catch (e) { err.textContent = '寄出失敗：' + errText(e); btn.disabled = false; sending = false; return; }
    await log('寄信', id, summaryOf(m) + `（「${m.title}」）`);
    invalidate('mails'); mails = await loadMails(true);
    st.title = ''; st.body = ''; st.items = []; st.sendAt = ''; st.expireAt = '';
    sending = false; paintForm(); paintPreview(); paintSent();
    toast(m.sendAt > Date.now() + 60000 ? '已排程，時間到學生就收得到' : '寄出了，學生下次進新世界（或重新整理信箱）就收得到');
  }

  /* ── 寄出紀錄 ── */
  function paintSent() {
    const now = Date.now(), list = mails.filter(m => !srcFilter || srcKey(m.src) === srcFilter);
    $('[data-mcount]', el).textContent = `${list.length} 封`;
    $('[data-sent]', el).innerHTML = `<table class="tbl cardy" data-mailtable><thead><tr><th>寄出時間</th><th>標題</th><th>收件人</th><th>禮物</th><th>來源</th><th>狀態</th><th></th></tr></thead><tbody>${list.map(m => {
      const sendAt = toMs(m.sendAt), exp = toMs(m.expireAt);
      const status = sendAt > now ? '<span class="chip" style="color:var(--blue)">排程中</span>' : exp && exp <= now ? '<span class="chip dim">已過期</span>' : '<span class="chip ok">已寄出</span>';
      return `<tr data-mid="${esc(m.id)}"><td data-l="寄出時間">${esc(fmtT(sendAt || m.t))}</td><td class="wrap" data-l="標題">${esc(m.title)}</td><td class="wrap" data-l="收件人">${esc(audText(m.aud, scores))}</td>
        <td class="wrap" data-l="禮物">${(m.items || []).map(it => esc(itemLabel(it))).join('、') || '—'}</td><td data-l="來源">${esc(srcName(m.src))}</td><td data-l="狀態">${status}</td>
        <td class="acts"><button class="px-btn sm" data-receipt="${esc(m.id)}">領取狀況</button> <button class="px-btn sm danger" data-recall="${esc(m.id)}">收回</button></td></tr>`;
    }).join('') || '<tr><td colspan="7" class="dim">這裡還沒有信。在上面寫一封寄出去，就會留下紀錄。</td></tr>'}</tbody></table>`;
  }

  /* 領取狀況：從每個學生存檔的 nw.mail 判斷（學生領了才會寫進去） */
  async function receipt(id) {
    const m = mails.find(x => x.id === id); if (!m) return;
    const fresh = await loadScores(true), r = audRecipients(m.aud, fresh);
    const got = r.list.filter(s => s.nw && s.nw.mail && s.nw.mail[id]), no = r.list.filter(s => !(s.nw && s.nw.mail && s.nw.mail[id]));
    const row = (s, ok) => `<tr data-r="${ok ? 'got' : 'no'}"><td>${esc(clsShort(s.className))}</td><td>${s.seat}</td><td>${esc(s.name)}</td><td>${ok ? `<span class="ok">已領</span>　${esc(fmtT(toMs(s.nw.mail[id])))}` : s.played ? '<span class="warn">未領</span>' : '<span class="dim">未領（還沒進過新世界）</span>'}</td></tr>`;
    await modal({ title: `領取狀況：${m.title}`, wide: true, buttons: [{ id: 'close', label: '關閉' }],
      html: `<div class="note" data-receipt-sum>已領 <b>${got.length}</b> 人・未領 <b>${no.length}</b> 人${r.unknown.length ? `・${r.unknown.length} 個收件人不在學生存檔` : ''}</div>
        <div class="tscroll" style="max-height:55vh"><table class="tbl"><thead><tr><th>班級</th><th>座號</th><th>姓名</th><th>狀況</th></tr></thead><tbody>${r.list.map(s => row(s, got.includes(s))).join('')}</tbody></table></div>` });
  }

  /* 收回＝刪掉那封信：沒領的人看不到也領不到了；已經領過的人不會被扣回東西 */
  async function recall(id) {
    const m = mails.find(x => x.id === id); if (!m) return;
    const ok = await ask('收回這封信？', `<p>「<b>${esc(m.title)}</b>」收件人：${esc(audText(m.aud, scores))}</p>
      <p>收回後，還沒領的人就看不到、也領不到。</p><p class="warn"><b>已經領過的人不會被扣回</b>已拿到的東西。</p>`, '收回', '先不要', true);
    if (!ok) return;
    try { await deleteDoc(doc(db, 'mg_mail', id)); } catch (e) { toast('收回失敗：' + errText(e), true); return; }
    await log('收回信件', id, `「${m.title}」（${audText(m.aud, scores)}；${(m.items || []).map(itemLabel).join('、') || '沒有禮物'}）`);
    invalidate('mails'); mails = await loadMails(true); paintSent(); toast('已收回');
  }

  paintForm(); paintPreview(); paintSent();
}
