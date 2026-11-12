# 交接：目前進度與下一步

> 更新：2026-11-09　開發分支：`claude/youthful-cerf-a6t41t`
> **分段開放表在 [`RELEASE-STAGES.md`](RELEASE-STAGES.md)**：現在只開討伐看板、武器背包、稱號（榮譽碑等到防作弊做完才開）。
> `main` 在 `9df6109`（委託板、房間、國字判定、姿態條都已合併）；之後的「稱號＋榮譽碑排行」在分支上，**還沒合併到 main，要老師點頭**。

## 現在在哪裡

> 想加入的內容（寵物、轉蛋、造型衣服等）見 [`IDEAS-FUTURE.md`](IDEAS-FUTURE.md)；那只是點子池，沒有一項是承諾。

| 項目 | 狀態 | 在哪 |
|---|---|---|
| 新世界企畫書 v2.2 | 完成，老師已審過四輪 | [`GDD-NEWWORLD.md`](GDD-NEWWORLD.md) |
| 專家審查紀錄（13 輪） | 完成 | [`GDD-REVIEW.md`](GDD-REVIEW.md) |
| 第 0 段：戰績分防亂打、天賦發亮 | **完成，v3.3.0** | `index.html`，見 [`../CHANGELOG.md`](../CHANGELOG.md) |
| 新世界預告＋提名投票頁 | **完成，v3.6.0（11 個關鍵字、16 頁、不捲動；投票有三步驟說明）** | `nw-preview.js`（頁面資料、投票）、`index.html` 的 `#nw-modal` 與 `.nwp-*` 樣式，見 [`../CHANGELOG.md`](../CHANGELOG.md) |
| 第 1 段：獵人村開幕 | **大部分完成（搶先體驗中，用通關密語進）**：獵人村、造型、4 把初心武器、委託板、房間（只能開、不能加入）、戰鬥、HR、稱號、榮譽碑排行 | `newworld.js`、`nw-*.js`、`pixel.js` |

## 下一步（照順序）

1. ~~預告＋提名投票頁~~ ✅ v3.4.0 已完成（資料在 `mg_config/nw_vote`，免改規則）。
   - 上線後可以看投票結果再決定魔物名字、區域、武器；老師在投票頁按「老師管理」可隱藏不適當的提名。
   - 預告頁的文字在 `nw-preview.js` 的 `WEAPONS`／`REGIONS`／`MONSTERS`／`PLAY`／`pageHTML()`；
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

### 抓蟲王與導覽退回（v3.12.1）
- 老師在控制台頒發 → `mg_nw_flags/award_bugking_<docId>`（`type:'award'`）→ 學生 `claimBugs()` 順便呼叫 `claimAwards()` 領取，詞條 `bugking`。要加別的特別稱號就沿用 `type:'award'` + `award` 欄位。
- `tour()` 的步驟可以寫 `back: () => bool`（回 true 就退回上一步），`text` 可以是函式。新導覽請都考慮「學生太快或做了別的事」。

### 新手導覽與標點挑戰（v3.12.0）
- 介紹：`newworld.js` 的 `INTROS` + `introOnce(key)`，看過記在 `NW.intro[key]`；本機測試可用 `window.__NW_NOINTRO__` 跳過。新增建築或功能就在 `INTROS` 加一筆。
- 第一個任務 `1-0a`（`soft`）在 `nw-data.js`；`goalOf()` 回傳 `{text, building, match}`，村莊地板箭頭 `guideBuilding` 用 `building`。
- 畫面蓋著時村莊不吃按鍵：`nw-village.js` 的 `overlayOpen()`，新做的全螢幕畫面要加進它的選擇器（或帶 `nw-sheet` class）。
- 標點挑戰在 `index.html`：`PUNCT_LESSONS`（Shift／Ctrl 兩組）、`PUNCT_STAGES`、`PUNCT_SENTENCES`、`PT_MON_HITS`。老師勾選發放時才給號碼，沒有改。

### 教學大樓與導覽（v3.11.0）
- 教學課在 `nw-academy.js`：`LESSONS`（選單）、`STEPS`（每步 `demo` 示範或 `task` 讓學生做；`task` 回 true 過關、false 重來）、`makeScene()`（小場景，不會受傷）。新增教學＝加一組 `STEPS` 與 `LESSONS` 一列，`newworld.js` 的 `lessonDone()` 負責獎勵。
- 導覽 `tour(steps)`：每步 `{text, target(), done()}`。用在換裝備教學（`weaponTour()`）。
- 回報問題流程：學生送出（`status:'pending'`）→ 老師在控制台確認（`approved`）→ 學生進村或開手冊時 `claimBugs()` 領獎、標 `claimed`。只有被老師確認的才算進 `NW.bugs`（除蟲員、蟲蟲剋星）。測試回饋（`type:'feedback'`）則是寫了就送字元（每隻魔物一次）。
- 測試員手冊 `TESTER_MISSIONS`／`checkMissions()`；回報問題 `openBugReport()`；兩者都在 `newworld.js`，資料欄位 `NW.tm`、`NW.bugs`、`NW.tut`。
- 之後的點子在 `docs/IDEAS-FUTURE.md`。

### 測試魔物、序號禮物、測試者之刃（v3.11.0）
- 三隻測試魔物與各自的攻擊在 `nw-data.js` 的 `TEST_TAGS`／`ATTACKS_OPEN`；回饋視窗 `askFeedback()`、禮物 `showGift()`／`applyReward()`／`openGiftInput()`、提前送刀 `earlyGift()` 都在 `newworld.js`。
- 序號資料 `mg_config/gift_codes.codes[雜湊]`（`reward`、`max`、`used`、`label`）；教師控制台管理（`index.html` 的 `tgLoad`／`tgAdd`／`tgDel`）。回饋在 `mg_nw_flags`（`type:'feedback'`），控制台 `openNwFeedback()` 查看。以上都不需要改 Firestore 規則。
- 新增武器：在 `GIFT_WEAPONS` 加一列（`base` 指向用哪種機制），`pixel.js` 的 `W.xxx` 與手上的武器圖，戰鬥用 `wmod.dmgMul`／`chantEvery`。
- 魔物血量依人數：`hpPlayersMul()`；組隊時把人數放進 `cfg.players`。

### 魔物攻擊「慢慢加入」（2026-11-11）
目前所有魔物都**不攻擊**。開放方式：改 `nw-data.js` 的 `ATTACKS_OPEN`（見 CHANGELOG v3.9.2）。開放前建議用 `tools/nw-sim/` 重算血量與勝率，並先在一隻魔物上試；開放後同步更新預告頁的說明、CHANGELOG、`VERSION_LOG`、pcclass 的 `TYPEHERO_UPDATES`。

### 學生回饋待決（2026-11-09）
題目太長導致閃避／防禦太難；**三線戰鬥已在 v3.9.0 做成正式版，v3.9.1 起舊版（打字閃／防）已刪除**（`nw-battle.js` 的 `buildStrikes`／`laneResolve`／`laneStance`）；原本的想法：三線戰鬥（方向鍵換線、長按 ▼ 防禦）與武器專屬詞庫。分析、風險（注音輸入法會吃方向鍵）、分步做法見 [`PROPOSAL-LANES.md`](PROPOSAL-LANES.md)，可玩 mockup 在 `tools/mockups/lanes.html`，**等老師試玩後決定**。題目字數上限與詠唱 6 字已做（v3.8.3）；還沒重跑 `tools/nw-sim/`。

### 第 1 段還沒做完的（給下一位）
1. **防作弊第 2、3 道**（GDD §20.3～20.4）：正確率 90% 才進排行、可疑紀錄（按鍵太少、節奏太平均…）送「待審核」。現在 `res.valid`/`lvAcc` 只做了第 1 道。新紀錄存 `mg_nw_runs`／`mg_nw_flags`（規則已在 `firestore-rules.txt` 裡，老師貼最新版即可）。
2. 榮譽碑缺「比上週進步幾名」；現在讀整個 `mg_scores` 集合（學生少沒問題，人多要改成另存排行摘要）。
3. 主線 1-5、1-6、1-7 與第 1 章收尾沒實測；`MAIN_QUESTS` 只有 1-0～1-4、1-7。
4. 新世界的遊戲內更新紀錄（`index.html` 的 `VERSION_LOG`）還沒寫，**要等老師決定對外開放時一起發版**，同時更新 pcclass 的 `TYPEHERO_UPDATES`（見 `CLAUDE.md`）。
5. 全部只用假 Firebase 測過；請老師用真資料庫試一次：開房間、稱號寫入 `mg_scores.nwTitle`、排行榜讀取。
6. 組隊酒館（**第 3a 段**，老師指定要在商店之前開）：房間目前只是「列表」，加入按鈕是灰的。
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
- **投票規則（v3.10.1）**：每類每人最多提名 3、最多投 3 票（`NOM_MAX`／`VOTE_MAX`），可收回；老師管理模式可刪除單則提名、刪除整類、清空所有投票。
- **提名投票資料**（`nw-preview.js`）：`mg_config/nw_vote` 的 `noms`（提名）、`hidden`、`v`（`{提案ID: {班級_座號: 1}}`，一人一票）。舊欄位 `votes`（數字計數）已不使用。老師管理模式可「清空所有投票」。
- **標點符號挑戰（v3.10.0）**：三關＋打怪。關卡在 `PUNCT_STAGES`、短句在 `PUNCT_SENTENCES`、符號向量圖在 `PUNCT_SVG`；教學視窗與練習時的小動畫視窗共用 `makeDemo()`。
- **標點符號挑戰教學動畫（舊記錄）**：`index.html` 的 `ptlKeyboard()`／`runPtDemo()`／`openPtLesson()`。遇到沒學過的標點（`mg_pl_{座號}` 沒記錄）會先跳教學，動畫用 `#ptl-kb[data-step]` 的 CSS 切換鍵帽。新增標點只要在 `PUNCT_LESSONS` 加一列，教學自動有。
- **標點符號挑戰獎勵**：教師控制台「新世界」下方的勾選（`tc-nwreward`）。勾選並輸入密語儲存後，`mg_config/settings.nwRewardCode` 會存明文密語，學生打完標點符號挑戰時 `index.html` 的 `finishPunctDrill()` 呼叫 `NWG.reward()`：密語對（雜湊吻合）就自動開通並跳出「搶先體驗券」。取消勾選會清空。要換密語記得同時輸入新密語並保持勾選，否則發出去的是舊的（雜湊不吻合時不會發）。
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
