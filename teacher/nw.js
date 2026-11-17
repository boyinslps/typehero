/* 從遊戲本體的資料檔拿東西的唯一入口。教師頁各分頁都從這裡 import，
   不要在教師頁重寫一份（班級短碼、暱稱、活動範本、獎勵種類都要跟學生端一模一樣）。 */
export {
  clsShort, nickText, normName, twDay, TW_OFFSET_MS, NICK_EMPTY,
  EVENT_TEMPLATES, EVENT_DEFAULTS, FASTEST_FLOOR, IMPROVE_SANE_MAX,
  GIFT_WEAPONS, ITEM_DEFS, WORDS, WORD_GROUPS, wordById, MONSTERS, REGIONS, STARTERS,
  MAIN_QUESTS, currentQuest, normalizeNw, curWeapon, weaponInfo,
  BUG_COINS, BUG_REWARD_MAX, NOTICES
} from '../nw-data.js';
export { toMs, normalizeEvent, phaseOf, GRACE_MS, timeText, scoreText, sortDir, saneScore, saneFloor, clsMatch, pctOf, classReached } from '../nw-events.js';
export { normalizeNews, sortNews, bugCmp } from '../nw-notice.js';
