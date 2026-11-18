/* 📢 公告（SPEC §5.2）：老師公告 mg_news 的新增、編輯、置頂、刪除，有預覽；
   下面唯讀列出最近 3 則改版公告 NOTICES（程式裡寫，學生會看到什麼老師也看得到）。
   mg_news/{ID} = { title(60 字內), body(1000 字內), pin, t }。學生端「有沒有新公告」看 t：
   所以編輯錯字預設不動 t（不會讓全校再跳一次），要重新通知才勾「當成新公告」。 */
import { db, doc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, orderBy, limit } from './fb.js';
import { NOTICES, toMs } from './nw.js';
import { $, esc, uid, fmtT, log, ask, toast, errText, previewConfirm, helpBox } from './util.js';

const nl = s => esc(s).replace(/\n/g, '<br>');

export default async function mount(el) {
  const load = async () => {
    const snap = await getDocs(query(collection(db, 'mg_news'), orderBy('t', 'desc'), limit(100))), list = [];
    snap.forEach(d => { const x = d.data() || {}; list.push({ id: d.id, title: x.title || '', body: x.body || '', pin: !!x.pin, t: toMs(x.t) }); });
    /* 跟學生端同樣的順序：置頂在前，同一組裡新的在前 */
    return list.sort((a, b) => (b.pin ? 1 : 0) - (a.pin ? 1 : 0) || b.t - a.t);
  };
  let list = await load();
  const f = { id: '', title: '', body: '', pin: false, renotify: false };

  const card = n => `<div class="px-panel in" data-pv-card style="padding:10px 12px;${n.pin ? 'border-color:#e8b64c' : ''}">
    <div style="color:#ffd98a;font-weight:900;font-size:1.1em">${n.pin ? '<span class="chip" style="color:#e8b64c">📌 置頂</span> ' : ''}${esc(n.title || '（還沒有標題）')}　<span class="dim" style="font-weight:400;font-size:.8em">${new Date(n.t || Date.now()).toLocaleDateString('zh-TW')}</span></div>
    ${n.body ? `<div style="margin-top:4px;line-height:1.65;overflow-wrap:anywhere">${nl(n.body)}</div>` : ''}</div>`;

  el.innerHTML = `<h2>📢 公告</h2>
    ${helpBox(['寫好標題和內容，按「預覽並貼出」，確認學生看到的樣子再貼出。貼出後學生下次進新世界會看到「新」。', '改錯字：按列上的「編輯」。預設不會再跳一次通知；真的要讓大家再看一次，才勾「當成新公告」。', '重要的公告可以「置頂」。不要在公告裡寫學生的名字。'])}
    <div class="grid2"><div class="px-panel in" data-form></div><div class="px-panel in"><b>學生會看到的樣子</b><div data-pv style="margin-top:6px"></div></div></div>
    <h3>已經貼出的公告</h3><div class="tscroll" data-list></div>
    <h3>最近 3 則改版公告（程式裡寫的，唯讀）</h3>
    <p class="dim" style="margin:0 0 6px">要改這裡，得改 <code>nw-data.js</code> 的 <code>NOTICES</code>，跟著新版本一起上線。</p>
    <div data-notices>${NOTICES.slice(0, 3).map(n => `<div class="px-panel in" style="margin-bottom:8px"><b style="color:#ffd98a">${esc(n.title)}</b> <span class="dim">${esc(n.date)}</span>
      <ul style="margin:4px 0 0;padding-left:1.2em">${n.items.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>`).join('')}</div>`;

  function paintForm() {
    $('[data-form]', el).innerHTML = `<b>${f.id ? '編輯公告' : '新增公告'}</b>
      <div style="margin-top:6px"><input class="inp" data-title maxlength="60" placeholder="標題（60 字內）" value="${esc(f.title)}" style="width:100%"></div>
      <div style="margin-top:6px"><textarea class="inp" data-body maxlength="1000" rows="5" placeholder="內容（1000 字內，用學生看得懂的話）">${esc(f.body)}</textarea></div>
      <div class="row" style="margin-top:6px"><label class="chk"><input type="checkbox" data-pin ${f.pin ? 'checked' : ''}> 📌 置頂</label>
        ${f.id ? `<label class="chk"><input type="checkbox" data-renotify ${f.renotify ? 'checked' : ''}> 當成新公告（學生會再跳一次通知）</label>` : ''}</div>
      <div class="row" style="margin-top:10px"><button class="px-btn gold" data-save>${f.id ? '預覽並儲存' : '預覽並貼出'}</button>${f.id ? '<button class="px-btn" data-cancel>取消編輯</button>' : ''}</div>
      <div class="warn" data-err style="min-height:1.3em;margin-top:4px"></div>`;
  }
  const paintPv = () => { $('[data-pv]', el).innerHTML = card({ title: f.title, body: f.body, pin: f.pin, t: f.id ? (list.find(x => x.id === f.id) || {}).t : 0 }); };
  function paintList() {
    $('[data-list]', el).innerHTML = `<table class="tbl" data-newstable><thead><tr><th>時間</th><th>標題</th><th></th></tr></thead><tbody>${list.map(n => `<tr data-nid="${esc(n.id)}">
      <td>${esc(fmtT(n.t))}</td><td class="wrap">${n.pin ? '📌 ' : ''}${esc(n.title)}</td>
      <td><button class="px-btn sm" data-edit="${esc(n.id)}">編輯</button> <button class="px-btn sm" data-pinbtn="${esc(n.id)}">${n.pin ? '取消置頂' : '置頂'}</button> <button class="px-btn sm danger" data-del="${esc(n.id)}">刪除</button></td></tr>`).join('')
      || '<tr><td colspan="3" class="dim">還沒有公告。在上面寫一則貼出去，學生就看得到。</td></tr>'}</tbody></table>`;
  }

  el.addEventListener('input', e => {
    const t = e.target;
    if (t.matches('[data-title]')) f.title = t.value; else if (t.matches('[data-body]')) f.body = t.value; else return;
    paintPv();
  });
  el.addEventListener('change', e => {
    const t = e.target;
    if (t.matches('[data-pin]')) f.pin = t.checked; else if (t.matches('[data-renotify]')) f.renotify = t.checked; else return;
    paintPv();
  });
  el.addEventListener('click', async e => {
    const t = e.target;
    if (t.closest('[data-save]')) return save();
    if (t.closest('[data-cancel]')) { Object.assign(f, { id: '', title: '', body: '', pin: false, renotify: false }); paintForm(); paintPv(); return; }
    const ed = t.closest('[data-edit]');
    if (ed) { const n = list.find(x => x.id === ed.dataset.edit); Object.assign(f, { id: n.id, title: n.title, body: n.body, pin: n.pin, renotify: false }); paintForm(); paintPv(); window.scrollTo(0, 0); return; }
    const pn = t.closest('[data-pinbtn]');
    if (pn) {
      const n = list.find(x => x.id === pn.dataset.pinbtn);
      try { await updateDoc(doc(db, 'mg_news', n.id), { pin: !n.pin }); } catch (er) { toast('失敗：' + errText(er), true); return; }
      await log(n.pin ? '取消置頂公告' : '置頂公告', n.id, n.title);
      list = await load(); paintList(); return;
    }
    const dl = t.closest('[data-del]');
    if (dl) {
      const n = list.find(x => x.id === dl.dataset.del);
      if (!await ask('刪除公告？', `<p>「<b>${esc(n.title)}</b>」刪掉後學生就看不到了。</p>`, '刪除', '先不要', true)) return;
      try { await deleteDoc(doc(db, 'mg_news', n.id)); } catch (er) { toast('失敗：' + errText(er), true); return; }
      await log('刪除公告', n.id, n.title);
      if (f.id === n.id) { Object.assign(f, { id: '', title: '', body: '', pin: false, renotify: false }); paintForm(); paintPv(); }
      list = await load(); paintList(); toast('已刪除');
    }
  });

  let saving = false;
  async function save() {
    if (saving) return;
    const err = $('[data-err]', el), title = f.title.trim(), body = f.body.trim();
    if (!title) { err.textContent = '請寫標題'; return; }
    err.textContent = '';
    const old = f.id ? list.find(x => x.id === f.id) : null;
    const t = old && !f.renotify ? old.t : Date.now();
    const n = { title, body, pin: f.pin, t };
    if (!await previewConfirm(card(n), `${old ? '修改' : '貼出'}公告：${title}${f.pin ? '（置頂）' : ''}${old && !f.renotify ? '。不會再跳通知' : '。學生會看到「新」並跳出通知'}`, old ? '確認儲存' : '確認貼出')) return;
    saving = true;
    const id = old ? old.id : uid('n');
    try { await setDoc(doc(db, 'mg_news', id), n); } catch (er) { err.textContent = '失敗：' + errText(er); saving = false; return; }
    await log(old ? '修改公告' : '新增公告', id, title + (f.pin ? '（置頂）' : ''));
    Object.assign(f, { id: '', title: '', body: '', pin: false, renotify: false });
    list = await load(); saving = false; paintForm(); paintPv(); paintList(); toast(old ? '已儲存' : '已貼出，學生下次進新世界就看得到');
  }

  paintForm(); paintPv(); paintList();
}
