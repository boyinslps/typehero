/* 🏷 頒稱號：學生卡、人物卡上的捷徑。選一個稱號詞條 → 寫一封信寄給他（學生到信箱領，領了就解鎖）。
   信件用固定 ID `title_{詞條id}_{學生docId}`：同一個稱號對同一個學生只會有一封，重按、兩位老師同時按都不會寄兩次。
   不直接改學生存檔（老師頁一律用寄信給東西，學生端領取時才寫進存檔，雙分頁、離線都不會壞）。 */
import { db, doc, getDoc, writeBatch } from './fb.js';
import { loadMails, invalidate } from './data.js';
import { WORDS, WORD_GROUPS, clsShort } from './nw.js';
import { modal, esc, log, toast, errText, mailCardHtml, $ } from './util.js';
import { filterOpts } from './gifts.js';

export const titleMailId = (wordId, docId) => `title_${wordId}_${docId}`;
const who = s => `${clsShort(s.className)}・${s.seat}號${s.name ? ' ' + s.name : ''}`;

/* 這個詞條對這個學生的狀態：'own' 已擁有、'sent' 已寄出還沒領、'' 還可以頒 */
export function titleState(s, wordId, mails) {
  if (s.nw && (s.nw.words || []).includes(wordId)) return 'own';
  return mails.some(m => m.id === titleMailId(wordId, s.id)) ? 'sent' : '';
}
export function titleMail(s, wordId, body) {
  const w = WORDS.find(x => x.id === wordId), now = Date.now();
  return { aud: ['id:' + s.id], title: `新的稱號詞條：${w.w}`.slice(0, 20),
    body: (body || '').trim() || `老師送你一個稱號詞條「${w.w}」！領取以後，到背包點名字下面的稱號，就能把它戴上。`,
    items: [{ type: 'word', key: wordId }], from: '老師', sendAt: now, expireAt: 0, t: now, src: 'award' };
}

/* 回 Promise<boolean>：true＝已經寄出 */
export async function awardTitle(s) {
  let mails = [];
  try { mails = await loadMails(true); } catch (e) { console.warn('讀寄出紀錄失敗', e); }
  let pick = '', q = '';
  const opts = WORDS.map(w => ({ value: w.id, label: w.w, hint: w.how, group: w.g }));
  const tag = st => st === 'own' ? '<span class="chip ok" data-tag="own">已擁有</span>' : st === 'sent' ? '<span class="chip" data-tag="sent" style="color:var(--blue)">已寄出，還沒領</span>' : '';
  const listHtml = () => {
    const shown = filterOpts(opts, q);
    return WORD_GROUPS.map(gr => {
      const rows = shown.filter(o => o.group === gr);
      return rows.length ? `<div class="dim" style="margin:8px 0 2px">${esc(gr)}詞條</div>${rows.map(o => {
        const st = titleState(s, o.value, mails);
        return `<button type="button" class="px-btn sm ${pick === o.value ? 'gold' : ''}" data-tpick="${esc(o.value)}" ${st ? 'disabled' : ''} style="display:flex;width:100%;gap:8px;align-items:center;text-align:left;margin:2px 0">
          <b>${esc(o.label)}</b><span class="dim" style="flex:1;font-weight:400">${esc(o.hint)}</span>${tag(st)}</button>`;
      }).join('')}` : '';
    }).join('') || '<div class="dim">找不到。可以用稱號的字，或解鎖條件的字來找。</div>';
  };
  const owned = s.nw ? (s.nw.words || []).length : 0;
  const r = await modal({ title: `🏷 頒稱號：${who(s)}`, wide: true, sticky: true,
    buttons: [{ id: 'no', label: '取消' }, { id: 'ok', label: '寄出稱號', cls: 'gold' }],
    html: `<p class="dim" style="margin:0 0 6px">${s.nw ? `目前稱號：${esc(s.nw.title || '（沒有）')}・已有 ${owned} 個詞條` : '他還沒進過新世界，稱號會放在信箱，進去就領得到'}。選一個稱號詞條，寄一封信給他，他領了就解鎖。</p>
      <input class="inp" type="search" data-tq placeholder="搜尋稱號，例如：王、抓蟲、獵人等級" style="width:100%" aria-label="搜尋稱號">
      <div class="tscroll" style="max-height:38vh;margin-top:6px" data-tlist></div>
      <div data-tpv style="margin-top:8px"></div>`,
    onOpen: (box, wrap) => {
      const ok = $('[data-btn="ok"]', wrap), list = $('[data-tlist]', box), pv = $('[data-tpv]', box);
      const paintList = () => { list.innerHTML = listHtml(); };
      const paintPv = () => {
        ok.disabled = !pick;
        pv.innerHTML = pick ? `<b>學生會看到的信</b>${mailCardHtml(titleMail(s, pick))}` : '<span class="dim">還沒選稱號</span>';
      };
      paintList(); paintPv();
      box.addEventListener('click', e => { const b = e.target.closest('[data-tpick]'); if (b && !b.disabled) { pick = b.dataset.tpick; paintList(); paintPv(); } });
      const onQ = e => { if (e.isComposing) return; q = e.target.value; paintList(); };
      $('[data-tq]', box).addEventListener('input', onQ);
      $('[data-tq]', box).addEventListener('compositionend', e => { q = e.target.value; paintList(); });
    } });
  if (r !== 'ok' || !pick) return false;
  const id = titleMailId(pick, s.id), w = WORDS.find(x => x.id === pick);
  try {
    /* 送出前再讀一次：另一位老師可能剛頒過；已經有就不寫，不蓋掉原本的信 */
    mails = await loadMails(true);
    /* 寄出紀錄只讀最近 300 封，所以直接問這個固定 ID 的信在不在 */
    const exists = (await getDoc(doc(db, 'mg_mail', id))).exists();
    if (exists || titleState(s, pick, mails) !== '') { toast('這個稱號已經頒過了（他已經有或信已經寄出）', true); return false; }
    const b = writeBatch(db);
    b.set(doc(db, 'mg_mail', id), titleMail(s, pick));
    await log('頒稱號', id, `${who(s)}：稱號詞條「${w.w}」`, b);
    await b.commit();
  } catch (e) { toast('寄出失敗：' + errText(e), true); return false; }
  invalidate('mails');
  toast(`已寄出稱號詞條「${w.w}」，${s.name || '他'}到信箱領取就解鎖`);
  return true;
}
