/* 教師頁共用小工具：跳出視窗、提示、操作紀錄、數量防呆、信件預覽。
   各分頁直接 import 這支，不用透過 ctx。 */
import { db, doc, setDoc } from './fb.js';
import { itemLabel } from './gifts.js';
import { clsShort } from './nw.js';

export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const esc = s => String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const uid = p => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/* 時間：一律用瀏覽器本機時區顯示（老師電腦就是台灣時間） */
const p2 = n => String(n).padStart(2, '0');
export const fmtT = ms => { if (!ms) return '—'; const d = new Date(ms); return `${p2(d.getMonth() + 1)}/${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`; };
export const fmtD = ms => { if (!ms) return '—'; const d = new Date(ms); return `${d.getFullYear()}/${p2(d.getMonth() + 1)}/${p2(d.getDate())}`; };
/* <input type="datetime-local"> 的值 ↔ 毫秒（空字串＝0） */
export const toInput = ms => { if (!ms) return ''; const d = new Date(ms); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}`; };
export const fromInput = v => { if (!v) return 0; const t = new Date(v).getTime(); return Number.isFinite(t) ? t : 0; };

export function toast(msg, bad) {
  const box = $('#toast'), el = document.createElement('div');
  el.textContent = msg; if (bad) el.className = 'bad';
  box.appendChild(el); setTimeout(() => el.remove(), bad ? 6000 : 3200);
}
/* 權限錯誤要講白話，不然老師只看到「失敗」 */
export function errText(e) {
  if (e && e.code === 'permission-denied') return '沒有權限（請確認是用老師帳號登入、而且已經發布正式規則）';
  return (e && (e.code || e.message)) || '不明原因';
}

/* ── 小視窗 ──
   buttons: [{ id, label, cls }]，回傳按下的 id；點旁邊或按 Esc 回 null。
   視窗裡的元素要自己接事件的話，用 onOpen(box) 拿到內容容器。 */
export function modal({ title, html, buttons = [{ id: 'ok', label: '確定', cls: 'gold' }], wide, onOpen }) {
  return new Promise(res => {
    const root = $('#modal-root'), el = document.createElement('div');
    el.className = 'mdl' + (wide ? ' wide' : ''); el.setAttribute('data-modal', '');
    el.innerHTML = `<div class="px-panel" role="dialog" aria-modal="true">${title ? `<h2 style="margin-bottom:8px">${esc(title)}</h2>` : ''}<div data-body>${html || ''}</div>
      <div class="row" style="justify-content:flex-end;margin-top:12px">${buttons.map(b => `<button class="px-btn ${b.cls || ''}" data-btn="${esc(b.id)}">${esc(b.label)}</button>`).join('')}</div></div>`;
    const done = v => { document.removeEventListener('keydown', onKey); el.remove(); res(v); };
    const onKey = e => { if (e.key === 'Escape') done(null); };
    el.addEventListener('click', e => {
      if (e.target === el) return done(null);
      const b = e.target.closest('[data-btn]'); if (b && !b.disabled) done(b.dataset.btn);
    });
    document.addEventListener('keydown', onKey);
    root.appendChild(el);
    if (onOpen) onOpen($('[data-body]', el), el);
  });
}
export const ask = (title, html, okLabel = '確定', cancelLabel = '取消', danger) =>
  modal({ title, html, buttons: [{ id: 'no', label: cancelLabel }, { id: 'ok', label: okLabel, cls: danger ? 'danger' : 'gold' }] }).then(v => v === 'ok');

/* ── 操作紀錄（SPEC §2.4）：老師每個寫入動作都寫一筆 { act, target, summary, t } ──
   傳入 batch 就跟著那個 batch 一起寫（一起成功或一起失敗）；沒傳就單獨寫，寫失敗只提醒不擋住老師。 */
export function log(act, target, summary, batch) {
  const ref = doc(db, 'mg_admin_log', uid('l')), data = { act, target: String(target || ''), summary: String(summary || '').slice(0, 300), t: Date.now() };
  if (batch) { batch.set(ref, data); return Promise.resolve(); }
  return setDoc(ref, data).catch(e => { console.warn('操作紀錄寫入失敗', e); toast('動作完成了，但操作紀錄沒寫進去：' + errText(e), true); });
}

/* ── 數量防呆（SPEC §2.5）：超過平常值就再按一次確認，避免手滑打成 10000 ── */
export const BIG = { coins: 1000, potion: 20, renameCard: 5 };
export function bigItems(items) {
  return (items || []).filter(it => it && ((it.type === 'coins' && it.n > BIG.coins) || (it.type === 'potion' && it.n > BIG.potion)
    || (it.type === 'item' && it.key === 'renameCard' && it.n > BIG.renameCard)));
}
export async function confirmBig(items) {
  const big = bigItems(items);
  if (!big.length) return true;
  const lines = big.map(it => `<li><b>${esc(itemLabel(it))}</b>　（平常 ${it.type === 'coins' ? BIG.coins : it.type === 'potion' ? BIG.potion : BIG.renameCard} 以內）</li>`).join('');
  return ask('數量比平常多很多', `<p>這封信的數量很大：</p><ul>${lines}</ul><p class="warn">寄出就不能扣回。是不是多打了一個 0？</p>`, '沒錯，照這個數量寄', '回去改', true);
}

/* ── 信件預覽：照學生信箱的樣子（newworld.js paintMail()）畫，用學生看得懂的字 ── */
export function mailCardHtml(m) {
  const items = Array.isArray(m.items) ? m.items : [];
  return `<div class="px-panel in" data-preview-card style="padding:10px 12px">
    <div class="row" style="flex-wrap:nowrap;align-items:flex-start"><span style="font-size:26px">✉</span>
      <div style="flex:1;min-width:0"><b style="color:#ffd98a;font-size:1.05em;overflow-wrap:anywhere">${esc(m.title || '（沒有標題）')}</b>
        <div class="dim" style="font-size:.85em">${esc(m.from || '老師')}・${new Date(m.sendAt || Date.now()).toLocaleDateString('zh-TW')}</div></div>
      <span class="px-btn sm" style="pointer-events:none">領取</span></div>
    ${m.body ? `<p style="white-space:pre-wrap;line-height:1.6;margin:6px 0 0;overflow-wrap:anywhere">${esc(m.body)}</p>` : ''}
    ${items.length ? `<div class="row" style="margin-top:6px">${items.map(it => `<span class="chip">${esc(itemLabel(it))}</span>`).join('')}</div>` : ''}</div>`;
}
/* 摘要一行，例「寄給 504 全班 27 人：🗡 測試者之刃 ×1、🪙 字元 ×300」 */
export function mailSummary(audText, count, items) {
  const what = (items || []).length ? (items || []).map(itemLabel).join('、') : '只有文字，沒有禮物';
  return `寄給 ${audText}${count !== null && count !== undefined ? ` ${count} 人` : ''}：${what}`;
}
/* 回 Promise<boolean>：老師按了「確認寄出」才是 true */
export async function previewMail(m, summary, okLabel = '確認寄出') {
  const when = m.sendAt && m.sendAt > Date.now() + 60000 ? `<p class="note">預約寄送：${esc(fmtT(m.sendAt))} 以後學生才看得到。</p>` : '';
  const exp = m.expireAt ? `<p class="dim" style="margin:4px 0">有效到 ${esc(fmtT(m.expireAt))}，過了就看不到也領不到。</p>` : '';
  return ask('學生會看到這封信', `<div class="note" data-summary>${esc(summary)}</div>${mailCardHtml(m)}${when}${exp}`, okLabel, '回去改');
}

/* 通用版：給任何「送出前要讓老師看學生會看到什麼」的地方（公告、之後的活動）。html 是學生看到的樣子 */
export const previewConfirm = (html, summary, okLabel = '確認送出') =>
  ask('學生會看到這個', `<div class="note" data-summary>${esc(summary)}</div>${html}`, okLabel, '回去改');

/* 還沒做的分頁用的占位（後半的分頁檔做好後，把這行換掉） */
export function placeholder(el, title, spec, note) {
  el.innerHTML = `<h2>${esc(title)}</h2><div class="px-panel in" data-placeholder><p>這一頁會在下一步做（規格 ${esc(spec)}）。</p>${note ? `<p class="dim">${note}</p>` : ''}</div>`;
}

export const classLabel = c => `${clsShort(c)}（${esc(c)}）`;
