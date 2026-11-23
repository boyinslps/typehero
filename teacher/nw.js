/* 從遊戲本體的資料檔拿東西的唯一入口。教師頁各分頁都從這裡 import，
   不要在教師頁重寫一份（班級短碼、暱稱、活動範本、獎勵種類都要跟學生端一模一樣）。 */
export {
  clsShort, displayName, normName, twDay, TW_OFFSET_MS, NICK_EMPTY,
  EVENT_TEMPLATES, EVENT_DEFAULTS, FASTEST_FLOOR, IMPROVE_SANE_MAX,
  GIFT_WEAPONS, ITEM_DEFS, WORDS, WORD_GROUPS, wordById, MONSTERS, REGIONS, STARTERS,
  MAIN_QUESTS, currentQuest, normalizeNw, curWeapon, weaponInfo,
  BUG_COINS, bugCoins, BUG_REWARD_MAX, NOTICES
} from '../nw-data.js';
export { gearPower, gearDef, GEAR_DEFS, GEAR_SLOTS, GEAR_MAX_P, itemName, itemText, gearItem, defColors } from '../nw-data.js';
export { toMs, normalizeEvent, phaseOf, GRACE_MS, timeText, scoreText, sortDir, saneScore, saneFloor, clsMatch, pctOf, classReached, awardTierOf, ruleLines, finalRows, awardList, dateText, METRIC_NAME, METRIC_UNIT, runsNeed } from '../nw-events.js';
export { rankBoardHtml } from '../nw-rankboard.js';
export { normalizeNews, sortNews, bugCmp } from '../nw-notice.js';
/* 名字鎖的雜湊：mg_bugboard 學生讀得到，所以只存正規化後名字的雜湊，不存真名（跟學生端 checkName() 同一個算法） */
export { sha256Hex } from '../nw-access.js';
/* 人物卡（teacher/pc.js）：畫法與學生背包共用同一套，見 nw-card.js */
export { PX } from '../pixel.js';
export { heroLook, HR_MAX } from '../nw-data.js';
export { EQUIP_LEFT, EQUIP_RIGHT, heroOf, ownedWeapons, hrProgress, titleBadgeHtml, equipSlotHtml, mountSprites, CARD_CSS } from '../nw-card.js';
