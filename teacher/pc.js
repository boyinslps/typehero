/* 人物卡：老師在學生清單點名字跳出的視覺化卡片（像遊戲裡點好友）。
   畫法跟學生背包左邊的人物卡共用（nw-card.js），老師看到的角色、武器、稱號徽章跟學生自己看到的一樣。
   這支只負責畫與切換；寄信、隱藏暱稱、名字沒問題這些會寫資料的動作由 tab-students.js 傳進來（act），
   這裡不直接碰資料庫。 */
import { gearPower, clsShort, curWeapon, weaponInfo, PX, heroLook, EQUIP_LEFT, EQUIP_RIGHT, heroOf, ownedWeapons, hrProgress, titleBadgeHtml, equipSlotHtml, mountSprites, CARD_CSS } from './nw.js';
import { $, esc, relT, modal } from './util.js';
import { nameChanged } from './data.js';
import { ownedSummary } from './gifts.js';

/* 倍率一律整數（UI-ART-SPEC §1）：角色桌機 8、手機 5；手機窄到放不下兩排裝備格＋角色時才會用到 5 */
const heroScale = () => (window.innerWidth <= 480 ? 5 : 8);

const CSS = `${CARD_CSS}
#modal-root .mdl.pc-mdl>.px-panel{max-width:520px;padding:10px}
.pc-nav{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.pc-nav .px-btn{padding:3px 12px;font-size:15px}
.pc-nick{font-size:1.9em;line-height:1.15;overflow-wrap:anywhere}
.pc-nick.none{color:#8a86b0;font-size:1.3em}
.pc-real{color:#aab0d8;font-size:.95em;margin-top:2px;overflow-wrap:anywhere}
.pc-titleline{margin-top:8px;padding:5px 8px;background:#0a0714;border:3px solid #6a5ab0;font-weight:900;color:#fff}
.pc-titleline.none{color:#8a86b0;font-weight:700}
.pc-hr{display:flex;align-items:center;gap:8px;margin-top:8px}
.pc-hr .px-bar{flex:1;min-width:60px}
.pc-stage{margin-top:10px;display:flex;align-items:flex-start;justify-content:space-between;gap:4px;padding:12px 8px 26px}
.pc-col{display:flex;flex-direction:column;gap:26px;flex:none}
.pc-mid{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center}
.pc-fig{position:relative;background:#0e0b16;padding:6px;border:3px solid #0a0714;line-height:0}
.pc-breath{animation:pcBreath .8s steps(1,end) infinite}
.pc-breath canvas{display:block;image-rendering:pixelated;image-rendering:crisp-edges}
@keyframes pcBreath{0%{transform:translateY(0)}50%{transform:translateY(calc(var(--s) * -1px))}}
.pc-fig.empty canvas{filter:brightness(0) opacity(.5)}
.pc-fig .pc-none{position:absolute;left:0;right:0;bottom:8px;text-align:center;font-weight:900;color:#fff;line-height:1.3;font-size:.95em;text-shadow:1px 1px 0 #000,-1px 1px 0 #000,1px -1px 0 #000,-1px -1px 0 #000;animation:none}
.pc-wname{margin-top:6px;font-size:.9em;font-weight:900;color:#ffd98a;text-align:center;overflow-wrap:anywhere}
.pc .bp-slot canvas{max-width:none;max-height:none}
.pc-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.pc-chips .px-chip{font-size:.9em;padding:1px 8px}
.pc-later{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
.pc-later .px-panel{padding:8px 10px;text-align:center;filter:grayscale(1);opacity:.7}
.pc-later b{display:block;color:#aab0d8}
.pc-later span{font-size:.9em;color:#8a86b0}
.pc-own{margin-top:10px;padding:8px 10px;display:grid;grid-template-columns:auto 1fr;gap:3px 8px;font-size:.9em;line-height:1.5}
.pc-own b{color:#ffd98a;white-space:nowrap}
.pc-own span{overflow-wrap:anywhere}
.pc-own .none{color:#8a86b0}
.pc-acts{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
@media (prefers-reduced-motion:reduce){.pc-breath,.pc .dkp{animation:none}}
@media (max-width:480px){.pc-nick{font-size:1.6em}.pc-stage{padding-left:4px;padding-right:4px}}`;
function injectCss() {
  if (document.getElementById('pc-css')) return;
  const st = document.createElement('style'); st.id = 'pc-css'; st.textContent = CSS; document.head.appendChild(st);
}

const chip = (text, color = '#ffd98a') => `<span class="px-chip" style="color:${color}">${esc(text)}</span>`;

/* 「他有什麼」：老師要給東西前看一眼，避免重複給。沒有的顯示「—」 */
function ownHtml(nw) {
  const o = ownedSummary(nw); if (!o) return '';
  const line = (k, label, text) => `<b>${label}</b><span data-pc-own="${k}" class="${text ? '' : 'none'}">${text ? esc(text) : '—'}</span>`;
  const words = o.words.filter(g => g.names.length).map(g => `${g.g}：${g.names.join('、')}`).join('　');
  return `<div class="px-panel in pc-own" data-pc-ownbox>${line('words', `🏅 稱號詞條 ${o.wordN}`, words)}${line('mats', '📦 材料', o.mats.join('、'))}${line('bps', '📜 圖紙', o.bps.join('、'))}${line('items', '🎴 道具', o.items.join('、'))}${line('weapons', '🗡 武器', o.weapons.join('、'))}${line('gears', '🛡 裝備', o.gears.join('、'))}</div>`;
}

/* 單張卡的 HTML 與要掛上去的圖。s 是 loadScores 整理過的學生列，b 是他在 mg_bugboard 的資料 */
function cardHtml(s, b, pos, total) {
  const nw = s.nw, hasLook = !!(nw && nw.look && typeof nw.look === 'object'), warn = nameChanged(s, b);
  const w = nw && curWeapon(nw), wi = w ? weaponInfo(w) : null;
  const nick = s.name || '';
  const hp = nw ? hrProgress(nw) : null;
  const slot = ([k, n]) => nw ? equipSlotHtml(nw, k, n, 2) : `<div class="bp-slot" data-slot="${k}"><span>＋</span><i>${n}</i></div>`;
  const chips = [];
  if (nw) {
    chips.push(chip(`🪙 字元 ${nw.coins}`), chip(`狩獵 ${nw.hunts} 場・勝 ${nw.stat.wins}／敗 ${nw.stat.fails}`));
  }
  chips.push(chip(`最後上線 ${s.last ? relT(s.last) : '—'}`, '#aab0d8'), chip(`🐛 抓蟲 ${b.score || 0} 分`, '#6aa84f'));
  if (nw) chips.push(chip(`⚔ 武器 ${ownedWeapons(nw).length} 把`, '#3f9be0'));
  if (nw) chips.push(chip(`⚒ 戰力 ${gearPower(nw)}｜做過 ${(nw.forge || {}).made || 0} 件｜最高 +${Math.max(0, ...(nw.gear || []).map(g => g.p || 0))}`, '#e8b64c').replace('<span ', '<span data-pc-power '));
  return `<div class="pc" data-pc-card data-id="${esc(s.id)}">
    <div class="pc-nav"><button class="px-btn" data-pc-nav="-1" aria-label="上一位" ${pos <= 0 ? 'disabled' : ''}>◀</button>
      <span class="dim mono" data-pc-pos>${pos + 1} / ${total}</span>
      <button class="px-btn" data-pc-nav="1" aria-label="下一位" ${pos >= total - 1 ? 'disabled' : ''}>▶</button>
      <button class="px-btn" data-pc-close style="margin-left:auto">✕ 關閉</button></div>
    <div class="pc-nick px-title ${nick ? '' : 'none'}" data-pc-nick>${nick ? esc(nick) : '（沒有名字）'}${b.hideNick ? ' ' + chip('已隱藏', '#e5705f') : ''}</div>
    <div class="pc-real" data-pc-real>${esc(clsShort(s.className))}・${s.seat}號${warn ? ' ' + chip('⚠ 換過名字', '#e5705f') : ''}</div>
    ${nw && nw.title ? `<div class="pc-titleline" data-pc-title>${titleBadgeHtml(PX, nw, esc, 2)}</div>` : `<div class="pc-titleline none" data-pc-title>${PX.badge(1, 2)} ${nw ? '還沒有稱號' : '—'}</div>`}
    ${nw ? `<div class="pc-hr" data-pc-hr><b class="px-text" style="color:#ffd98a;white-space:nowrap">獵人 HR ${nw.hr}</b><div class="px-bar xp"><i style="width:${hp.pct}%"></i></div><span class="mono" style="font-size:.85em;white-space:nowrap">${hp.text}</span></div>` : ''}
    <div class="px-panel in pc-stage" data-pc-stage>
      <div class="pc-col">${EQUIP_LEFT.map(slot).join('')}</div>
      <div class="pc-mid"><div class="pc-fig ${hasLook ? '' : 'empty'}" data-pc-fig><div class="pc-breath" data-pc-hero></div>${hasLook ? '' : '<div class="pc-none" data-pc-nonw>還沒進過<br>新世界</div>'}</div>
        <div class="pc-wname" data-pc-wname>${wi ? esc(wi.name) : ''}</div></div>
      <div class="pc-col">${EQUIP_RIGHT.map(slot).join('')}</div>
    </div>
    <div class="pc-chips" data-pc-chips>${chips.join('')}</div>
    ${ownHtml(nw)}
    <div class="pc-later"><div class="px-panel in" data-pc-later="skill"><b>技能</b><span>之後開放</span></div><div class="px-panel in" data-pc-later="item"><b>道具</b><span>之後開放</span></div></div>
    <div class="pc-acts"><button class="px-btn gold" data-pc-act="mail">✉ 寄信給他</button>
      <button class="px-btn gold" data-pc-act="gift">🎁 給東西</button>
      <button class="px-btn" data-pc-act="title">🏷 頒稱號</button>
      <button class="px-btn" data-pc-act="hide">${b.hideNick ? '恢復暱稱' : '隱藏暱稱'}</button>
      ${warn ? '<button class="px-btn" data-pc-act="nameok">名字沒問題（解鎖）</button>' : ''}
      <button class="px-btn" data-pc-act="detail">看詳細資料</button></div>
  </div>`;
}

/* 開人物卡。ids 是目前清單的學生順序（◀ ▶ 與左右鍵照這個順序切）；
   act(動作名, 學生) 回 Promise：'close' 代表動作已經接手（換頁或開別的視窗），這張卡要關掉；其他就重畫這張卡 */
export function openPersonCard({ ids, start, find, board, act }) {
  injectCss();
  let i = Math.max(0, ids.indexOf(start)), busy = false;
  return modal({ title: '', html: '', wide: false, buttons: [], onOpen: (box, el, close) => {
    el.classList.add('pc-mdl');
    const draw = () => {
      const s = find(ids[i]); if (!s) { close(null); return; }
      box.innerHTML = cardHtml(s, board(s), i, ids.length);
      const sc = heroScale(), nw = s.nw, hasLook = !!(nw && nw.look && typeof nw.look === 'object');
      mountSprites(PX, box);
      /* 沒有造型就畫預設角色的剪影（不拿武器），讓版面跟有造型的學生一樣 */
      const hero = PX.hero(hasLook ? heroOf(nw) : heroLook(null, 'none'), sc);
      const host = $('[data-pc-hero]', box); host.style.setProperty('--s', sc); host.appendChild(hero);
    };
    const go = d => { const j = i + d; if (j < 0 || j >= ids.length) return; i = j; draw(); };
    /* 只有這張卡在最上層才吃鍵盤：按了「隱藏暱稱」跳出確認視窗時，左右鍵不能偷偷換人 */
    const onKey = e => {
      const all = document.querySelectorAll('[data-modal]');
      if (all[all.length - 1] !== el || busy || /INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '')) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); } else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    };
    document.addEventListener('keydown', onKey);
    new MutationObserver((_, ob) => { if (!el.isConnected) { document.removeEventListener('keydown', onKey); ob.disconnect(); } }).observe($('#modal-root'), { childList: true });
    box.addEventListener('click', async e => {
      const n = e.target.closest('[data-pc-nav]'); if (n) { go(+n.dataset.pcNav); return; }
      if (e.target.closest('[data-pc-close]')) { close(null); return; }
      const a = e.target.closest('[data-pc-act]'); if (!a || busy) return;
      busy = true; a.disabled = true;
      try { const r = await act(a.dataset.pcAct, find(ids[i])); if (r === 'close') { close(null); return; } }
      finally { busy = false; }
      if (el.isConnected) draw();
    });
    draw();
  } });
}
