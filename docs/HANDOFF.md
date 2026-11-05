# 交接：目前進度與下一步

> 更新：2026-11-05　開發分支：`claude/youthful-cerf-a6t41t`
> `main` 在 `9df6109`（委託板、房間、國字判定、姿態條都已合併）；之後的「稱號＋榮譽碑排行」在分支上，**還沒合併到 main，要老師點頭**。

## 現在在哪裡

| 項目 | 狀態 | 在哪 |
|---|---|---|
| 新世界企畫書 v2.2 | 完成，老師已審過四輪 | [`GDD-NEWWORLD.md`](GDD-NEWWORLD.md) |
| 專家審查紀錄（13 輪） | 完成 | [`GDD-REVIEW.md`](GDD-REVIEW.md) |
| 第 0 段：戰績分防亂打、天賦發亮 | **完成，v3.3.0** | `index.html`，見 [`../CHANGELOG.md`](../CHANGELOG.md) |
| 新世界預告＋提名投票頁 | **完成，v3.5.0（像素風、戰鬥畫面 mockup、造型）** | `index.html` 的 `#nw-modal`／`NW_*`／`nw*()`，見 [`../CHANGELOG.md`](../CHANGELOG.md) |
| 第 1 段：獵人村開幕 | **大部分完成（搶先體驗中，用通關密語進）**：獵人村、造型、4 把初心武器、委託板、房間（只能開、不能加入）、戰鬥、HR、稱號、榮譽碑排行 | `newworld.js`、`nw-*.js`、`pixel.js` |

## 下一步（照順序）

1. ~~預告＋提名投票頁~~ ✅ v3.4.0 已完成（資料在 `mg_config/nw_vote`，免改規則）。
   - 上線後可以看投票結果再決定魔物名字、區域、武器；老師在投票頁按「老師管理」可隱藏不適當的提名。
   - 預告頁的文字在 `index.html` 的 `NW_WEAPONS`／`NW_REGIONS`／`NW_MONSTERS`／`NW_SYSTEMS`／`nwPreviewHTML()`；
     故事文字是草稿，老師可改。企畫有改（武器、區域、魔物改名）要一起改。
   - 預告頁已經有**戰鬥畫面 mockup**（`PX.canvas('battle')`＋`nwMountBattle()`，GDD §7.2）與**造型示範**（`PX.hero(造型, 倍率)`，GDD §15.5）。
     第 1 段的真實戰鬥畫面照這張做：斜上方 2.5D、固定站位、自己有金圈與箭頭、地上紅色區域＝魔物要攻擊的地方。
   - 美術在 `PX`（程式畫的像素圖：12 魔物、9 武器、7 區域、傳送門、獵人），第 1 段的戰鬥畫面直接用 `PX.canvas('monster', 'coo', 6, angry)`。
2. **第 1 段**（GDD §21.3）：新世界入口（歷史最高 LV8＝解鎖史詩）、獵人村全部介面（未開放的掛「🔗 施工中」）、
   初心武器四選一（法杖、長弓、雙刀、連弩）、世界地圖（草原、森林）、咕咕鳥／泡泡蛙／跳跳菇／炎牙狼、
   讀條＋打「閃避」「防禦」、生命／倒下／生氣、魔物攻擊帶的狀態、HR、新排行、防作弊、主線第 1 章、素材字元先存著。
   - 新世界資料放 `mg_scores` 的 `nw` 欄位（GDD §23.1），排行與可疑紀錄也可以先放這裡，**第 1 段就不用改規則**。

### 稱號（詞條拚裝）怎麼接
- 加詞條：`nw-data.js` 的 `WORDS` 加一列（`id`、`w`、`g` 組別、`how` 條件文字、`test(nw)`）；武器詞條用 `wword()`。解鎖在 `checkWords()`（進村與每場結束時跑），存在 `NW.words`；學生拚的存在 `NW.titleParts`／`NW.title`。
- 武器進度靠 `NW.used`、`NW.wwin`（`finishHunt` 累加）。之後新增武器要在 `WORDS` 補 3 個詞條。
- 舊世界顯示：`index.html` 的 `nwTitleChip`／`paintWho`，資料來自 `mg_scores.nwTitle`／`nwTitleN`。

### 第 1 段還沒做完的（給下一位）
1. **防作弊第 2、3 道**（GDD §20.3～20.4）：正確率 90% 才進排行、可疑紀錄（按鍵太少、節奏太平均…）送「待審核」。現在 `res.valid`/`lvAcc` 只做了第 1 道。需要新 Firestore 集合 `mg_nw_runs` 與規則（要請老師重貼 `firestore-rules.txt`）。
2. 榮譽碑缺「比上週進步幾名」；現在讀整個 `mg_scores` 集合（學生少沒問題，人多要改成另存排行摘要）。
3. 主線 1-5、1-6、1-7 與第 1 章收尾沒實測；`MAIN_QUESTS` 只有 1-0～1-4、1-7。
4. 新世界的遊戲內更新紀錄（`index.html` 的 `VERSION_LOG`）還沒寫，**要等老師決定對外開放時一起發版**，同時更新 pcclass 的 `TYPEHERO_UPDATES`（見 `CLAUDE.md`）。
5. 全部只用假 Firebase 測過；請老師用真資料庫試一次：開房間、稱號寫入 `mg_scores.nwTitle`、排行榜讀取。
6. 組隊（第 4 段）：房間目前只是「列表」，加入按鈕是灰的。
7. 可能的下一步：更多 NPC、手機版村莊縮放、像素字型、更多稱號。

## 老師已經決定的

- 進入門檻：解鎖史詩（LV8）。護甲＝頭盔。
- 元素書統一用方向鍵（← 火、↑ 水、→ 木）；注音輸入法下上排 1、2、3 是ㄅㄉˇ，不能用。
- 召喚鈴寵物要有血條（GDD §10.3）。
- 英文魔物的閃避／防禦接受 jump／stop，要提醒。
- 讀條與有效時間：先寬，看資料再收；狀態數字：先這樣，看資料再調。
- 戰鬥畫面改 **2.5D 像素、看得到同學和自己**；可以調整造型、改裝備外觀，裝備要反映在角色身上（GDD §7.2、§15.5）。不需要自己架伺服器，組隊用量見 GDD §23.3。
- 魔物、武器、區域美術一律**像素風**（11/03 改，取代 ASCII）；介面可用 emoji。第 1 段要補：武器第一人稱圖、寵物（史萊姆、小樹精、小黑龍）、攻擊特效、粒子，沿用 `PX` 的畫法。
- 陷阱、戰鎚刪除；武器不分系；每種武器要有獨特操作，不能只是「打對 X 次觸發 X」。

## 還沒決定的

見 GDD §25「還要請老師決定」（狩獵時限、組隊範圍、重新打磨次數、題庫誰寫、跨學期、擴增武器）。

## 第 0 段改了哪些程式（v3.3.0）

| 位置（`index.html`） | 內容 |
|---|---|
| `BALANCE.rank.minAcc`、`scoreVer` | 85% 門檻、新公式版本 2 |
| `battleScore()` | 改乘正確率² |
| `histFromDoc()`、`mergeHist()` | 新欄位 `bestScoreWpm`／`bestScoreAcc`／`scoreVer`；合併時新公式優先 |
| `saveScore()` | 正確率不足不更新；舊公式紀錄直接被新公式覆蓋 |
| `paintLoginHistory()` | 顯示戰績分最高那一場 |
| `renderRankBoard()`、`#rank-old` | 預設只列新公式，可勾選含舊版 |
| `paintTalentDot()`、`#btn-talent.can-buy` | 天賦可點時發亮 |
| `showResult()`、`#r-lowacc` | 正確率不足提醒 |

## 新世界搶先體驗（尚未對外開放）

- 新世界預設關閉。營地只有「🔑 搶先體驗」小按鈕，輸入通關密語才會出現「新世界」，不受 LV8 限制。
- **通關密語是一個全班共用的字串**（分大小寫）。網站裡只放它的 SHA-256 雜湊（`nw-access.js` 的 `DEFAULT_CODE_HASH`），原始碼看不到密語本身。
- 換密語：教師控制台「新世界」下面的欄位輸入新密語並儲存（存的也是雜湊，在 `mg_config/settings.nwCodeHash`）；換了以後，所有人手上的舊密語立刻失效。
- 開放程度：教師控制台「新世界」選單（關閉／LV8 開放／全部開放），存在 `mg_config/settings.nwMode`。
- 這是前端檢查，懂技術的學生仍可能繞過；它擋的是「不知道密語就看不到入口」，不是防駭客。
- **畫面**：營地有一扇「新世界之門」（`index.html` 的 `#nw-door`，鎖著＝灰色鎖鏈石門、開放＝紫色漩渦）；進去是一個畫面看完的小鎮（`nw-village.js`；WASD 或點選走路、走進門口開功能、灰色建築＝施工中、村民可以點），個人東西都在背包（B 鍵）；建築只能點或按 Enter 進入（不會碰到就觸發）；「委託板」（`nw-board.js`）是木看板＋不規則舊紙委託單＋右側大地圖定位，按「狩獵」才開房間（`newworld.js` 的 `openRoom/viewRoom/loadRooms`，存 `mg_config/nwroom_*`，房間列表有分頁，加入要第 4 段才開）；戰鬥滿版（`nw-battle.js`）。規範見 `docs/UI-ART-SPEC.md`。
- 試玩模擬器在 `tools/nw-sim/`（依真實手速、正確率模擬四五年級）；血量依難度層級縮放（`HP_TIER`），動作詞是單字「閃」「防」，讀條 ×1.5。題目全部國字判定（不打注音符號）；輸入框上有「閃避／防禦姿態」條（`#nwb-stance`）。
- 還沒做：排行榜與防作弊第 2～3 層、主線 1-7 實測、新世界的遊戲內更新紀錄（`VERSION_LOG`）、真 Firebase 驗證（目前只用假 Firebase 測）。

## 開發環境注意

- 版面要看真的樣子：雲端連不到 Tailwind CDN，可以 `npm i tailwindcss@3` 後用
  `npx tailwindcss -i in.css -o tw.css`（content 指向 `index.html`）產生 CSS，再讓 Playwright 把 `cdn.tailwindcss.com` 攔截成注入這份 CSS 的腳本。
- 外網素材站（OpenGameArt、Kenney、itch.io）在雲端環境被擋；像素圖全部自己用程式畫（`PX`），也避免授權與風格不一。

- 雲端環境連不到 CDN（Firebase、Tailwind、jsdelivr 都被擋），瀏覽器實測用 [`../tools/browser-test/`](../tools/browser-test/README.md) 的假 Firebase。
- 主程式是 `index.html` 裡的單一 `<script type="module">`，改完可以抽出來用 `node --check` 檢查語法。
- 改版要同步：`APP_VERSION`、`VERSION_LOG`（遊戲內）、`CHANGELOG.md`，以及 **pcclass 入口頁的更新訊息**（`boyinslps/pcclass` 的 `games/index.html` → `TYPEHERO_UPDATES`）。完整清單見根目錄 `CLAUDE.md`。
- 學生真實資料可以用遊戲本身的匿名登入（Firebase REST `accounts:signUp` → Firestore REST）唯讀撈 `mg_scores`；只做統計，不要把姓名座號寫進文件。
