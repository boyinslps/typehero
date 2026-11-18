/* 💬 回饋（SPEC §6.1）：測試魔物的回饋（mg_nw_flags 裡 type == 'feedback'）。
   跟回報（bug）完全分開：回報要審核、有分數，回饋只是看、標已讀。
   欄位：t 時間、cls／seat／name 學生、mk／mon 魔物、rate 評價（好玩／普通／太難）、text 內容；已讀存在 read: true。 */
import { db, doc, writeBatch } from './fb.js';
import { loadFlags, invalidate } from './data.js';
import { clsShort } from './nw.js';
import { $, esc, fmtT, log, toast, errText, helpBox } from './util.js';

const RATES = ['好玩', '普通', '太難'];
const RATE_ICON = { 好玩: '😀', 普通: '😐', 太難: '😣' };

export default async function mount(el, ctx, params) {
  let all = (await loadFlags(true)).filter(f => f.type === 'feedback').sort((a, b) => (b.t || 0) - (a.t || 0));
  const fl = { mk: '', rate: '', unread: !!(params && params.unread) };
  const monName = f => f.mon || f.mk || '（沒寫）';
  const monKey = f => f.mk || f.mon || '';
  const mons = [...new Map(all.map(f => [monKey(f), monName(f)])).entries()].filter(x => x[0]);

  el.innerHTML = `<h2>💬 回饋</h2>${helpBox(['上面的表格告訴你每隻魔物好不好玩、會不會太難（笑臉、普通、太難各幾個）。', '下面是學生寫的內容。看過就按「標已讀」，也可以一次把列出來的全部標已讀。', '想只看沒讀過的：勾「只看未讀」。這裡不用審核，也不會加分。'])}<p class="dim" style="margin:0 0 8px">學生打完測試魔物寫的感想。跟「回報問題」分開，這裡不用審核，看過就標已讀。</p>
    <h3>每隻魔物的評價</h3><div class="tscroll" data-stats></div>
    <h3>全部回饋</h3>
    <div class="row" style="margin-bottom:6px"><select class="inp" data-fmk><option value="">全部魔物</option>${mons.map(([k, n]) => `<option value="${esc(k)}">${esc(n)}</option>`).join('')}</select>
      <select class="inp" data-frate><option value="">全部評價</option>${RATES.map(r => `<option value="${r}">${RATE_ICON[r]} ${r}</option>`).join('')}<option value="none">沒選評價</option></select>
      <label class="chk"><input type="checkbox" data-funread ${fl.unread ? 'checked' : ''}> 只看未讀</label>
      <button class="px-btn sm" data-readall>目前列出的全部標已讀</button><span class="dim" data-count></span></div>
    <div class="tscroll" style="max-height:65vh" data-list></div>`;

  const shown = () => all.filter(f => (!fl.mk || monKey(f) === fl.mk) && (!fl.rate || (fl.rate === 'none' ? !RATES.includes(f.rate) : f.rate === fl.rate)) && (!fl.unread || !f.read));
  function paintStats() {
    $('[data-stats]', el).innerHTML = `<table class="tbl" data-stattable><thead><tr><th>魔物</th>${RATES.map(r => `<th>${RATE_ICON[r]} ${r}</th>`).join('')}<th>沒選</th><th>合計</th><th>未讀</th></tr></thead><tbody>${mons.map(([k, n]) => {
      const L = all.filter(f => monKey(f) === k);
      return `<tr data-mon="${esc(k)}"><td>${esc(n)}</td>${RATES.map(r => `<td data-r="${r}">${L.filter(f => f.rate === r).length}</td>`).join('')}<td>${L.filter(f => !RATES.includes(f.rate)).length}</td><td>${L.length}</td><td>${L.filter(f => !f.read).length}</td></tr>`;
    }).join('') || '<tr><td colspan="7" class="dim">還沒有回饋。學生打完測試魔物、寫下感想後，會出現在這裡。</td></tr>'}</tbody></table>`;
  }
  function paintList() {
    const list = shown();
    $('[data-count]', el).textContent = `${list.length} 則`;
    $('[data-list]', el).innerHTML = `<table class="tbl" data-fbtable><thead><tr><th>時間</th><th>學生</th><th>魔物</th><th>評價</th><th>內容</th><th></th></tr></thead><tbody>${list.map(f => `<tr data-fid="${esc(f.id)}" class="${f.read ? '' : 'unread'}">
      <td>${esc(fmtT(f.t))}</td><td>${esc(clsShort(f.cls || ''))}・${esc(f.seat)}號 ${esc(f.name || '')}</td><td>${esc(monName(f))}${f.star ? ` ★${esc(f.star)}` : ''}</td>
      <td>${RATES.includes(f.rate) ? `${RATE_ICON[f.rate]} ${f.rate}` : '<span class="dim">—</span>'}</td><td class="wrap" style="min-width:260px;overflow-wrap:anywhere">${esc(f.text || '') || '<span class="dim">（只選了評價）</span>'}</td>
      <td>${f.read ? '<span class="chip dim">已讀</span>' : `<button class="px-btn sm" data-read="${esc(f.id)}">標已讀</button>`}</td></tr>`).join('') || '<tr><td colspan="6" class="dim">沒有符合的回饋。放寬上面的篩選，或把「只看未讀」取消看看。</td></tr>'}</tbody></table>`;
  }
  const paint = () => { paintStats(); paintList(); };

  el.addEventListener('change', e => {
    const t = e.target;
    if (t.matches('[data-fmk]')) fl.mk = t.value; else if (t.matches('[data-frate]')) fl.rate = t.value; else if (t.matches('[data-funread]')) fl.unread = t.checked; else return;
    paintList();
  });
  async function markRead(ids) {
    const list = all.filter(f => ids.includes(f.id) && !f.read);
    if (!list.length) return;
    try {
      const b = writeBatch(db);
      list.forEach(f => b.set(doc(db, 'mg_nw_flags', f.id), { read: true }, { merge: true }));
      await b.commit();
    } catch (e) { toast('失敗：' + errText(e), true); return; }
    list.forEach(f => { f.read = true; });
    invalidate('flags'); paint();
    await log('回饋標已讀', list.length === 1 ? list[0].id : `${list.length} 則`, `${list.length} 則回饋`);
  }
  el.addEventListener('click', e => {
    const r = e.target.closest('[data-read]'); if (r) { markRead([r.dataset.read]); return; }
    if (e.target.closest('[data-readall]')) markRead(shown().map(f => f.id));
  });
  paint();
}
