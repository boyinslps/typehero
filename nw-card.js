/* 人物卡的共用零件：學生背包左邊的人物卡（newworld.js）與教師頁的學生人物卡（teacher/pc.js）畫法必須一致，
   所以裝備格、稱號徽章、經驗條算法都放在這裡，不要兩邊各抄一份（一邊改了另一邊會悄悄走樣）。
   這支只放「純函式＋CSS 字串」，不碰 DOM 狀態，教師頁 import 它不會把學生端的流程帶進來。 */
import { heroLook, curWeapon, GIFT_WEAPONS, hrNeed, HR_MAX } from './nw-data.js';

/* 稱號徽章的等級：詞條 1 個＝銅、2 個＝銀、3 個以上＝金 */
export const tierOf = n => Math.min(3, Math.max(1, n));

/* 左右兩排裝備格；鐵匠鋪還沒開張，頭盔／盔甲／護手／護腳先空著（顯示暗色＋） */
export const EQUIP_LEFT = [['helm', '頭盔'], ['armor', '盔甲'], ['boots', '護腳']];
export const EQUIP_RIGHT = [['weapon', '武器'], ['gloves', '護手']];

export const heroOf = (nw, weapon, gear) => heroLook(nw.look, weapon || curWeapon(nw) || 'staff', gear);
export const ownedWeapons = nw => (nw.starter ? [nw.starter] : []).concat(nw.gw || []);

/* 經驗條百分比與文字；滿級時條是滿的、文字寫「滿級」 */
export function hrProgress(nw) {
  const need = hrNeed(nw.hr), full = nw.hr >= HR_MAX;
  return { need, full, pct: full ? 100 : Math.max(0, Math.min(100, (nw.hrExp || 0) / need * 100)), text: full ? '滿級' : `${nw.hrExp || 0}/${need}` };
}

/* 稱號（有稱號時）：徽章＋稱號字。字要先 escape 才能放進 HTML，所以由呼叫端傳 esc */
export const titleBadgeHtml = (PX, nw, esc, px = 2) => `${PX.badge(tierOf((nw.titleParts || []).length), px)} <b>${esc(nw.title)}</b>`;

/* 黑暗武器（測試者之刃）周圍飄的黑色粒子 */
export const darkDots = () => Array.from({ length: 7 }, (_, i) => `<i class="dkp" style="left:${8 + i * 7}px;bottom:${6 + (i * 5) % 18}px;animation-delay:${(i * .23).toFixed(2)}s;--dx:${(i % 2 ? 6 : -6)}px"></i>`).join('');

/* 一個裝備格。目前只有武器格有東西；spriteScale 預設 3 是背包原本的倍率 */
export function equipSlotHtml(nw, k, name, spriteScale = 3) {
  const w = k === 'weapon' && curWeapon(nw);
  return `<div class="bp-slot ${w ? 'on' : ''} ${w && GIFT_WEAPONS[w] ? 'dark' : ''}" data-slot="${k}">${w ? `<div data-sprite="weapon:${w}:${spriteScale}"></div>${GIFT_WEAPONS[w] ? darkDots() : ''}` : '<span>＋</span>'}<i>${name}</i></div>`;
}

/* 把 [data-sprite="種類:名字:倍率"] 換成像素圖 */
export function mountSprites(PX, scope) {
  scope.querySelectorAll('[data-sprite]').forEach(el => {
    const [kind, key, sc, ang] = el.dataset.sprite.split(':');
    el.replaceChildren(PX.canvas(kind, key, +sc || 3, ang === '1'));
  });
}

export const CARD_CSS = `
      .bp-slot{width:64px;height:64px;display:grid;place-items:center;position:relative;background:#0e0b16;border:3px solid #3a3070;box-shadow:inset 0 0 0 2px #1a1530}
      .bp-slot.on{border-color:#e8b64c}
      .bp-slot canvas{max-width:52px;max-height:52px;width:auto!important;height:auto!important}
      .bp-slot span{color:#4a4570;font-size:22px;font-weight:900}
      .bp-slot i{position:absolute;left:0;right:0;bottom:-18px;text-align:center;font-style:normal;font-size:11px;font-weight:900;color:#aab0d8}
      .bp-slot.dark{overflow:visible}
      .dkp{position:absolute;width:3px;height:3px;background:#12081e;box-shadow:0 0 0 1px #9a5ae8;opacity:0;animation:dkp 1.6s infinite;pointer-events:none}
      @keyframes dkp{0%{opacity:0;transform:translateY(0)}20%{opacity:1}100%{opacity:0;transform:translateY(-30px) translateX(var(--dx,0))}}`;
