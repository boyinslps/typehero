# 交接：目前進度與下一步

> 更新：2026-11-20　開發分支：`claude/gracious-pasteur-773n2t`（v3.14.2：活動詳情頁、常駐抓蟲大作戰、排行榜模板、老師頁頒稱號與匯出，見 CHANGELOG；v3.14.0、v3.14.1 已上線）
> **分段開放表在 [`RELEASE-STAGES.md`](RELEASE-STAGES.md)**：現在只開討伐看板、武器背包、稱號（榮譽碑等到防作弊做完才開）。
> `main` 在 `9df6109`（委託板、房間、國字判定、姿態條都已合併）；之後的「稱號＋榮譽碑排行」在分支上，**還沒合併到 main，要老師點頭**。

## 現在在哪裡

> **2026-11-17：v3.14.0（教師管理頁、信箱、暱稱與改名卡、活動、佈告欄與抓蟲榜、村莊延伸、正式 Firestore 規則）程式與測試都做好了，在分支 `claude/gracious-pasteur-773n2t`，等老師照 [`LAUNCH-TEACHER.md`](LAUNCH-TEACHER.md) 一次上線**。規格 [`SPEC-TEACHER-ADMIN.md`](SPEC-TEACHER-ADMIN.md)（已實作，§13 記了跟規格不同的地方）、完整紀錄 [`../CHANGELOG.md`](../CHANGELOG.md)。下面「v3.14.0 各系統怎麼接」是接手必讀。

> **2026-11-20：v3.14.2 在分支上準備好了（等老師推上 main）**：活動詳情頁、常駐「🐛 抓蟲大作戰」、通用排行榜模板、信箱禮物改 `REWARD` 表、老師頁「頒稱號」「給東西」「匯出打字速度（匿名）」。**第 2 段（榮譽碑、鐵匠鋪＋倉庫）的規格已寫好（[`SPEC-STAGE2.md`](SPEC-STAGE2.md) v2），還沒實作**，等老師決定 §8 的 6 個問題。下面「v3.14.2 各系統怎麼接」是接手必讀。

> 想加入的內容（寵物、轉蛋、造型衣服等）見 [`IDEAS-FUTURE.md`](IDEAS-FUTURE.md)；那只是點子池，沒有一項是承諾。

| 項目 | 狀態 | 在哪 |
|---|---|---|
| 新世界企畫書 v2.2 | 完成，老師已審過四輪 | [`GDD-NEWWORLD.md`](GDD-NEWWORLD.md) |
| 專家審查紀錄（13 輪） | 完成 | [`GDD-REVIEW.md`](GDD-REVIEW.md) |
| 第 0 段：戰績分防亂打、天賦發亮 | **完成，v3.3.0** | `index.html`，見 [`../CHANGELOG.md`](../CHANGELOG.md) |
| 新世界預告＋提名投票頁 | **完成，v3.6.0（11 個關鍵字、16 頁、不捲動；投票有三步驟說明）** | `nw-preview.js`（頁面資料、投票）、`index.html` 的 `#nw-modal` 與 `.nwp-*` 樣式，見 [`../CHANGELOG.md`](../CHANGELOG.md) |
| 第 1 段：獵人村開幕 | **大部分完成（搶先體驗中，用通關密語進）**：獵人村、造型、4 把初心武器、委託板、房間（只能開、不能加入）、戰鬥、HR、稱號、榮譽碑排行 | `newworld.js`、`nw-*.js`、`pixel.js` |

## 第 2 段 2b 鐵匠鋪＋倉庫：怎麼接（2026-11-23，程式做好、沒開放）

> 規格 [`SPEC-STAGE2.md`](SPEC-STAGE2.md)（§3 裝備、§5 實作順序）。**`OPEN_STAGES` 預設仍是 `['1']`，學生看不到。** 老師要做的事見 [`RELEASE-STAGES.md`](RELEASE-STAGES.md)「第 2 段 2b」：先貼 Firestore 規則、決定哪天把 `'2b'` 加進 `OPEN_STAGES`。2a 榮譽碑（`teacher/rank-calc.js`、`tab-rank.js`、`nw-rank.js` 重寫、F3）是**下一輪**，要等 2b 開放 4 週以上。

| 要改什麼 | 在哪 |
|---|---|
| 裝備種類、配方、數字（灰 100／綠 105／藍 110、每 +1 加 2…） | `nw-data.js` 的 `GEAR_DEFS`、`GEAR_TB`、`UP_COINS`／`UP_MATS`；改完跑 `node tools/nw-sim/gear.mjs --n 1000` 看 G1～G8（結果 [`BALANCE-GEAR-2B.md`](BALANCE-GEAR-2B.md)） |
| 加一件新裝備 | ① `GEAR_DEFS` 一列（配方、外觀 `look`）；② 圖紙放進某隻魔物的 `rare`（沒有魔物掉的像布裝，放 `CLOTH_BPS` 由鐵匠送）；③ `pixel.js` 的 `GR.xxx` 16×16 圖示（頭盔還要畫 `hero`／`chibi`）；④ 教師頁清單、信箱標籤自動從表長出來，不用改 |
| 存檔欄位 | `gearV`（1＝已搬成裝備格式，只搬一次）、`gear:[{id,k,c,p,t,s?}]`、`eq:{weapon,helm,armor,gloves,boots}`（指向 gear 的 id）、`forge:{made,ups,top,gift}`、`bpDry`、`cpmHist`、`runQ`。舊欄位 `starter`／`equip`／`gw` 照寫（`syncLegacy`）。`curWeapon(nw)` 回武器**種類**（`'staff'`、`'testblade'`、`'flame_dagger'`），11 個呼叫點不用改 |
| 戰鬥怎麼吃裝備 | `nw-battle.js` 開頭 `GS = gearStats(NW)`；測試可用 `window.__NW_GEAR__` 直接指定 |
| 角色外觀 | `nw-card.js` 的 `heroOf`／`chibiOf`／`equipSlotHtml` ＋ `gearLook(nw)`；`pixel.js` 的 `hero()`／`chibiGrid()` |
| 鐵匠鋪、背包的裝備／材料／圖紙分頁 | `nw-forge.js`（`openForge`、`gearTab`、`matsTab`、`bpTab`）；`newworld.js` 負責傳 `ctx`（存檔、`sync`＝雙分頁先讀雲端、`after`＝算任務與詞條） |
| 每場紀錄、可疑偵測 | `nw-battle.js` 結束時算每題摘要、按鍵數；`nw-data.js` 的 `susCheck`／`SUS`／`qBand`；`newworld.js` 的 `queueRun`／`flushRuns`；規則 `firestore-rules.txt` |
| 開放／退回 | `OPEN_STAGES`；`stageOpen('2b')`。沒開放時：鐵匠鋪、倉庫是施工中、1-5／1-6 與新詞條不出現、材料／圖紙／裝備分頁維持原樣、**不寫** `mg_nw_runs` |

**已知、刻意先不處理**
- 護腳（預警 +0.1～0.3 秒）在現行攻擊下幾乎看不到效果；護手對重壓有幫助。模擬器假設反應時間 1.0 秒，真實的閃避成功率比假設低很多（見 `BALANCE-GEAR-2B.md`、`tools/nw-sim/calib.mjs`），等 `mg_nw_runs` 與 `dodgeOk` 有資料再校正。
- 重壓沒擋住時，遊戲目前是三條線各打一次（三倍傷害），因為 `resolveStrike` 對每條線都 `hurt`；盔甲減傷會乘三次。不是這次改的，模擬器照遊戲算。
- 規則測試（`tools/rules-test/`）的新案例**沒有實際跑過**（那台電腦沒有 Java）；貼規則前請先跑。
- 測試編號：規格寫的 nw11～nw14 與現有檔衝突（nw11 是榜單），所以 2b 是 nw12（鐵匠鋪）、nw13（舊存檔）、nw14（戰鬥）、nw15（每場紀錄）；2a 之後用 nw16。

## v3.14.2 各系統怎麼接（2026-11-20）

### 通用排行榜模板 `nw-rankboard.js`
以後有「排名」的畫面（榮譽碑、活動、抓蟲榜…）一律用它畫，不要自己拼榜單的 HTML。`rankBoardHtml(spec)` 是純畫面；`mountRankBoard(容器, { load, toSpec, shell })` 接雲端（載入中、讀取失敗、重新整理）。**新增一種榜單要做的四件事**（檔頭有完整欄位說明）：
1. **資料層**：寫 `load(force)`，回傳排好、已濾掉不合理分數、不含真名的列；`force` 要能略過快取。
2. **`toSpec(data)`**：把資料對到 spec 欄位。`label` 用「班級短碼・座號」，`nick` 用榜上的名字；自己不在榜上就給 `outText`（「再快 3 秒就上榜」），**不要給名次**。
3. **放容器**：畫面上放一個容器，呼叫 `mountRankBoard(...)` 再 `run(false)`。
4. **測試**：有資料、空、載入中、讀取失敗四種畫面，榜外沒有名次文字，手機 390 寬不橫向捲動（照 `nw11.test.js` 的「模板」那幾段抄）。

### 活動詳情頁與常駐抓蟲大作戰
- 活動卡片點進詳情：規則（`ruleLines`）、獎勵（`awardList`）、我的進度、目前排名（前 10＋自己）；剛結束的顯示 `finalRows` 的最後榜單。純函式在 `nw-events.js`，教師頁預覽也用（`teacher/nw.js` 轉出）。
- 「🐛 抓蟲大作戰」不是 `mg_events` 的文件，是程式固定放在活動分頁最上面；內容與「🐛 抓蟲榜」分頁同一份。徽章門檻 `BUG_MILESTONES` 在 `nw-notice.js`，要跟 `WORDS` 的 `bug1／3／5／10` 一起改。

### 禮物清單怎麼擴充
學生端 `newworld.js` 的 `REWARD` 表是唯一來源（`itemKnown`／`applyReward`／`itemLabel`）。新增禮物種類：
1. `REWARD` 加一列（怎麼檢查欄位、怎麼領、標籤）。
2. `teacher/gifts.js` 的 `GIFT_TYPES` 加一列（label 要跟學生端一樣；可帶 `big`／`bigNorm` 當「要再確認」的門檻）。
3. 清單內容（稱號、武器、道具、材料、圖紙…）由資料表（`WORDS`、`GIFT_WEAPONS`、`ITEM_DEFS`、`MAT_INFO`…）自動產生，加資料就會出現，不用另外登記。
4. 補測試：`t5.test.js` 會動態塞假資料進資料表，確認清單自動長出來。
刻意不做的項目與原因見 [`research/TEACHER-GIVE-AUDIT.md`](research/TEACHER-GIVE-AUDIT.md)。

### 匯出打字速度（匿名）與 `data-private/`
- 教師頁 ⚙ 設定 →「📊 匯出打字速度（匿名）」（`teacher/export-speed.js`）：預覽 → 確認 → 下載 JSON／CSV。去識別化用**白名單**，不讀姓名、座號、班級名稱、docId、暱稱；改這支時不要改成黑名單。操作紀錄只寫人數。
- 下載的檔案放 **`/data-private/`**（已在 `.gitignore`，**真實資料絕對不進 repo**）。轉成模擬器格式：`node tools/nw-sim/load-real.mjs data-private/typehero-speed-YYYYMMDD.json --out data-private/profiles.json`，再 `node tools/nw-sim/run.mjs data-private/profiles.json`（年級不明的人可加 `--unknown-as 五年級`）。測試只用假資料。

### 平衡曲線與第 2 段規格（都還沒實作）
| 文件 | 狀態 |
|---|---|
| [`BALANCE-CURVES.md`](BALANCE-CURVES.md) | **設計提案，數字沒改（老師說平衡先不調；2b 用升級後的模擬器驗過裝備數值）**。曲線來源 `tools/nw-sim/curves.mjs`（`--real` 可換真實速度）。真實速度分布還沒拿到，匯出後重算；它的勝率不能和 SPEC-STAGE2 §3.4 的粗跑表直接比 |
| [`SPEC-STAGE2.md`](SPEC-STAGE2.md) | §8 的 6 個問題老師照預設。**2b 已實作（2026-11-23，沒開放）**，見上面「第 2 段 2b」；2a 榮譽碑還沒做，要等 2b 上線至少 4 週 |
| [`BALANCE-GEAR-2B.md`](BALANCE-GEAR-2B.md) | 2b-1 的 G1～G8 驗收結果（模擬器 `tools/nw-sim/gear.mjs` 產生，不要手改） |
| [`research/BALANCE-REFS.md`](research/BALANCE-REFS.md) | 參考資料；來源只讀得到搜尋摘要，文中逐條標示 |

開工第 2 段前，先把 BALANCE-CURVES §7 的對 SPEC-STAGE2 的修改建議與老師的決定合併回 SPEC-STAGE2。

## v3.14.0 各系統怎麼接（2026-11-17）

### 上線前老師要做的事（`LAUNCH-TEACHER.md` 的摘要）
1. Firebase 開「電子郵件／密碼」登入，建老師帳號，複製 UID。
2. Firestore 手動建 `mg_admins/{UID}`，`ok: true`（**一定要在貼規則之前**）。
3. **先備份舊規則**，再貼 `firestore-rules.txt` 發布。
4. **老師同意後**新程式推上 main（第 3、4 步中間舊程式的序號、房間、回報、舊控制台會被擋，愈短愈好）。
5. 開 `teacher.html` 登入 → ⚙ 設定 →「一次搬移」。
6. 用「手動加分」補遊戲外抓過 bug 的同學。
7. 提醒學生按 F5。
上線後 pcclass 的 `TYPEHERO_UPDATES` 要改（CLAUDE.md 發版清單第 3 點）。退回方式：貼回舊規則＋main revert。

### 時間：`C.now()`
`newworld.js` 把 `C.now = now` 設成「本機時間＋`mg_clock/{我}` 算出的時差」。**凡是活動開始／結束、信件 `sendAt`／`expireAt` 的判斷都用它，不要直接用 `Date.now()`**（學生電腦時間不準會提早或延後看到活動）。取不到伺服器時間就用本機時間。測試用 `window.__SERVER_SKEW_MS` 模擬時差。

### 信箱 `mg_mail`
- 學生端在 `newworld.js`（`openMail`、`claimMail`、`mailVisible`）。一次查詢 `aud array-contains-any ['all','cls:班級','id:班級_座號']`，時間在前端用 `C.now()` 過濾。
- 已領 `NW.mail[信件ID] = 時間`。領前重讀雲端的 `nw.mail` 合併（雙分頁不會領兩次）。`newworld.js` 的 `REWARD` 表（`itemKnown`／`applyReward`／`itemLabel` 都從它來）認的 `type`：weapon、coins、potion、exp、item、mat、word、bp、hr、zone、dex、tut；**不認得的（含 key 不在資料表、數量不合理）整封不領**（舊版程式遇到新禮物種類不會亂收）。要加新禮物種類：`REWARD` 加一列、教師頁 `teacher/gifts.js` 的 `GIFT_TYPES` 加一列（兩邊的 label 要一樣）；清單內容由資料表自動產生。盤點與刻意不做的項目見 `docs/research/TEACHER-GIVE-AUDIT.md`。教師頁「🏷 頒稱號」（`teacher/title-ui.js`，信件固定 ID `title_{詞條id}_{學生docId}`）。
- 郵筒是 `VILLAGE.decor` 裡 `k:'mailbox'`；村莊程式用 `k` 找它，換位置只改 `nw-data.js`。
- 系統自動寄的信一律**固定 ID**（`bug_{flagID}`、`award_{flagID}`、`ev_{活動}_{位置}`、`ev_{活動}_p_{學生}`），重寄是覆蓋。

### 暱稱與改名卡
- 詞庫 `nw-data.js` 的 `NICK_A`／`NICK_B`（存詞 ID `NW.nick=[a,b]`）、`nickText()`；`NW.nickAt`。取了就固定，換要消耗道具 `renameCard`（`ITEM_DEFS`）。商店開張後在 `SHOP_ITEMS` 賣 300 字元，**目前商店沒開，改名卡只能靠老師寄信**。
- 存檔最外層 `nwNick`（組好的字串）給榜單用。老師可在抓蟲榜隱藏某人暱稱（`mg_bugboard.hideNick`），隱藏由顯示端負責。
- 冒名鎖：`NW.name0`／`mg_bugboard.nameOkH`（老師核可名字的雜湊；真名放老師專用的 `mg_bugboard_private.nameOk`）當基準；不同就寫 `mg_nw_flags/namechg_{ID}_{雜湊8碼}` 並鎖信箱。

### 活動 `nw-events.js`（`mg_events`）
- 欄位寫在檔頭註解。學生進度 `NW.ev[ID]`；每場結算在 `finishHunt()` → `EV.onRun(res, prevBest, t0, now)`。**進步獎要在更新 `NW.fastMk` 之前算**（拿活動前的紀錄當 base）。
- 班級挑戰：最外層 `nwEvDone`（`"活動ID|班級"` 字串陣列）＋ `array-contains` 的 count；分母 `nwCls` 的 count，教師頁可在活動或 `mg_config/class_sizes` 手動覆寫。
- 活動榜單用 `orderBy('nw.ev.{ID}.s')`（單一欄位），並在查詢裡就濾掉超出合理範圍的分數（`IMPROVE_SANE_MAX`、`FASTEST_FLOOR`）。
- 預設值 `EVENT_DEFAULTS`、範本 `EVENT_TEMPLATES`（`nw-data.js`）；數字來自 `node tools/nw-sim/events.mjs`，改之前先重跑模擬。
- 加新活動類型：`nw-events.js` 的 `EV_TYPES` 與結算、教師頁 `tab-events.js` 的 `FIELDS`／`TYPE_NAME`／`buildDoc`／`LOCKED`。

### 佈告欄 `nw-notice.js`、抓蟲榜 `mg_bugboard`
- 建築 `VILLAGE.buildings` 的 `notice`（`act:'notice'`），與上方按鈕開同一個視窗（`newworld.js` 的 `openNotice`），三分頁公告｜活動｜抓蟲榜，「看過了」各自記（`NW.seenNews`／`seenNotice`／`seenEv`／`seenBug`）。
- 老師公告 `mg_news`（置頂在前）；改版公告 `NOTICES`（`nw-data.js`，最新一則進村自動跳一次）。
- 抓蟲榜：`mg_bugboard/{班級_座號}` 只有老師寫。排序 `bugCmp`（分數高在前，同分比 `firstAt` 早的）；第 10 名同分的另外查。學生端 `NW.bugs` 取 max，分數與詞條 `bug1／3／5／10` 由 `mg_bugboard` 同步。榜單不含真名。
- 回報流程：學生送 `mg_nw_flags`（`type:'bug'`，`status:'pending'`）→ 老師在教師頁確認／重複／不採用 → 同一個 batch 寫 flag 狀態、`mg_bugboard`（含 `reports[]`）、獎勵信 → 學生看「我的回報」（測試員手冊）。**`claimBugs()`／`claimAwards()` 已刪**，職業除錯師與回報獎勵都走信箱。
- **抓蟲榜的隱私**（教師頁審查 M1，2026-11-18）：`mg_bugboard` 所有登入的人都讀得到，所以老師打的理由與真名放 `mg_bugboard_private`（只有老師讀寫）；寫 `mg_bugboard` 一律過 `teacher/bug-calc.js` 的 `publicBoard()`。老師回覆 `reply` 仍在 `reports[]`，另外寄信給本人（`bug_`／`bugr_` 加回報代號），學生「我的回報」優先用信裡那句。

### 村莊地圖（32×22 格）
`nw-data.js` 的 `VILLAGE`（格 16px）：高台（北，y 0～6，石牆 y=7，樓梯 x 15～17）放組隊酒館 (5,2)、星圖台 (15,2)、榮譽碑 (25,2)；學習區（西）教學大樓 (3,12)；中央廣場出生點 (15,16)，委託板 (11,13)、佈告欄 (17,13)、郵筒 (12,11)、村長 (16,10)；市集（東，隔小溪 x 22～23，小橋 y 13～14）商店 (24,9)、防具店 (28,10)、鐵匠鋪 (24,15)、倉庫 (28,16)；傳送門正南 (15,22)。`NW.pos` 搭配 `NW.posV = 2`，舊座標回出生點；**以後地圖再重排，把 `POS_V` 加 1**。新增建築要自己確認 3×3 不壓到溪、牆、別的建築，門口走得到、名牌不疊——`nw10.test.js` 會檢查。鏡頭在 `nw-village.js`（捲動容器；走路 6 格／秒；只在走動與停下後 0.9 秒跟著），小地圖點建築傳送到門口。

### 教師管理頁 `teacher.html`＋`teacher/`
- 登入：`teacher/fb.js` 建**具名 app `'admin'`**（跟學生用的匿名 app 分開，老師登入不會影響同一台電腦上的學生遊戲）；`main.js` 登入後讀 `mg_admins/{uid}`，不是老師就登出。舊控制台（`index.html`）的老師登入同樣用 `adminApp`，寫入走它。
- 分頁：`teacher/tabs.js` 的 `TABS`（`load` 用動態 import，一個分頁壞了不會讓整頁打不開）。**加分頁的方法**：新增 `teacher/tab-xxx.js`，`export default async function mount(el, ctx, params)`（`ctx = { user, go(id, params), tab }`；回傳一個函式，離開時會呼叫它來清計時器），再到 `tabs.js` 加一列。
- 共用：`util.js`（`log` 寫操作紀錄、`confirmBig`、`previewMail`／`previewConfirm`、`modal`）、`data.js`（有快取的讀取，寫完呼叫 `invalidate`）、`gifts.js`／`gift-ui.js`（禮物列）。純函式（`ev-calc.js`、`bug-calc.js`、`migrate.js`）不碰畫面與 Firebase，node 可以直接 import 測。
- **老師寫的每個動作都要 `log()`**（`mg_admin_log`）。給學生東西一律寄信，不直接改存檔。
- 測試：`t1`（前半）、`t2`（活動、回饋、回報）。

### 規則
`firestore-rules.txt` 是正式版；`tools/rules-test/`（`npm test`，需要 Java）。新增集合先改規則、補測試、再通知老師重貼（先備份）。逐集合權限見 [`DATA.md`](DATA.md) §2。

### 老師決定、要記得的
- 活動排行榜第一版就做（進步獎主推）；不做過渡規則，沒課時一次上線。
- ranking 發獎：被 ⚠ 擋下的人不拿名次獎但保留參加獎。
- 活動開始後鎖欄位（含倍數、至少打幾場、對象班級）；獎品仍可加碼。
- 學生「我的回報」重複顯示「別人先回報了，謝謝你也發現了！」。

### 還沒做（第二版候選）
- 角色、村民、建築依腳的 y 座標排前後；區名淡入、畫面邊緣目標箭頭。
- 公告預約／到期；小地圖尋路。
- 商店開張後改名卡可購買（`SHOP_ITEMS` 已備好）。
- 真 Firebase 驗證：全部只用假 Firebase 與規則模擬器測過，上線後請照 `LAUNCH-TEACHER.md` 的檢查清單走一遍。

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

### 改版公告（v3.13.0）
- **寫法規範在 [`ANNOUNCEMENT-GUIDE.md`](ANNOUNCEMENT-GUIDE.md)**（學生看得懂的語氣、用詞對照、檢查表）。公告、版本紀錄、入口頁小訊息都照它寫。
- `nw-data.js` 的 `NOTICES`（最新的放最前面，`id` 當版本）：進新世界跳一次（`NW.seenNotice`），之後在上面的「📢 佈告欄」看全部。第一次來的新人直接記成已讀。要發新公告＝在 `NOTICES` 最前面加一筆，別改舊的。
- 標點教學的「學會了」不再 disabled：太早按會提醒「先看完動畫」（`ptlReady()`）。

### 職業除錯師與導覽退回（v3.12.1）
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

## 新世界搶先體驗

- 打完標點符號挑戰就開放（v3.13.0）。其他人營地只有「🔑 搶先體驗」小按鈕，輸入通關密語才會出現「新世界」，不受 LV8 限制。
- **通關密語是一個全班共用的字串**（分大小寫）。網站裡只放它的 SHA-256 雜湊（`nw-access.js` 的 `DEFAULT_CODE_HASH`），原始碼看不到密語本身。
- **投票規則（v3.10.1）**：每類每人最多提名 3、最多投 3 票（`NOM_MAX`／`VOTE_MAX`），可收回；老師管理模式可刪除單則提名、刪除整類、清空所有投票。
- **提名投票資料**（`nw-preview.js`）：`mg_config/nw_vote` 的 `noms`（提名）、`hidden`、`v`（`{提案ID: {班級_座號: 1}}`，一人一票）。舊欄位 `votes`（數字計數）已不使用。老師管理模式可「清空所有投票」。
- **標點符號挑戰（v3.10.0）**：三關＋打怪。關卡在 `PUNCT_STAGES`、短句在 `PUNCT_SENTENCES`、符號向量圖在 `PUNCT_SVG`；教學視窗與練習時的小動畫視窗共用 `makeDemo()`。
- **標點符號挑戰教學動畫（舊記錄）**：`index.html` 的 `ptlKeyboard()`／`runPtDemo()`／`openPtLesson()`。遇到沒學過的標點（`mg_pl_{座號}` 沒記錄）會先跳教學，動畫用 `#ptl-kb[data-step]` 的 CSS 切換鍵帽。新增標點只要在 `PUNCT_LESSONS` 加一列，教學自動有。
- **標點符號挑戰獎勵（v3.13.0 起）**：打完就開放，沒有開關。`finishPunctDrill()` 第一次打完會存 `punctDone`（本機＋雲端 `mg_scores`；`histFromDoc`／`mergeHist` 都要帶這欄，不然重新登入就忘了），並呼叫 `NWG.ticket()` 跳出「新世界門票」。`newworld.js` 的 `gate()` 看 `C.punctDone()`，算「搶先體驗」（會收到測試者之刃）。舊的 `mg_config/settings.nwRewardCode` 和教師控制台勾選已拿掉；通關密語、`nwMode` 還是可以另外開放。
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
