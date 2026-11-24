# Firestore 規則測試

用 Firebase 模擬器（要 Java 11 以上）跑 `firestore-rules.txt`（正式版，沒有過渡版）。每一條都是「誰（匿名學生／老師／不是老師的登入帳號／未登入）、
哪份文件、做什麼、該過還是不過」。

```bash
cd tools/rules-test
npm install      # 第一次
npm test         # 起模擬器、跑完自動關
```

- 第一次會下載模擬器的 jar（約 60MB），之後有快取。
- 埠號 8089（`firebase.json`）。
- `placeholder.rules` 只是讓模擬器能啟動；真正測的規則是 `rules.test.mjs` 讀 repo 根目錄的檔案後載入，
  所以改完規則直接重跑就好。
- 發布到主控台前一定要先跑過。

## 涵蓋的重點
- 老師身分靠 `mg_admins/{uid}`；不是老師的登入帳號不能寫。
- `mg_config`／`mg_round`／`mg_bank` 學生只能讀；`nw_vote` 學生只能動 `v`、`noms`。
- `mg_nw_flags`：學生只能 create、欄位白名單、不能讀、不能帶 `claimed`（舊版送回報會被擋，所以 A 版要先上線）。
- `mg_gift_used`：同一人第二次領會被擋，count 查詢可用。
- `mg_scores` 刪除只有老師。
- `mg_bugboard_private`（老師專用：手動加分理由、真名）：學生讀、寫、列出都不過；用教師頁的 `publicBoard()` 寫出來的 `mg_bugboard`，學生讀得到但沒有真名與理由。老師的批次寫入（20 人手動加分）也過。

## 2b 新增的案例（`mg_nw_runs`、`mg_nw_flags` 的 `run`、`mg_nw_board`／`_private`）

學生只能 create `mg_nw_runs`（欄位白名單、`uid` 是自己、`ts` 是伺服器時間、ID＝`文件ID_毫秒`、`secs`／`acc`／`star`／`q`／`sus` 範圍），不能 update／delete／讀；老師讀寫都行；`mg_nw_flags` 學生可以 create `type:'run'`（`why` 最多 4 個、只能 `pending`）；`mg_nw_board` 學生只讀、`mg_nw_board_private` 學生讀寫都不行。
⚠ **這些案例 2026-11-23 寫的時候那台電腦沒有 Java，沒有實際跑過。貼規則前請先在有 Java 11+ 的電腦跑 `npm test`**。

## 已知限制
- 學生仍可改自己的 `mg_scores`（字元、裝備）；匿名 uid 對不上「班級_座號」，規則做不到。
- 學生可以清掉 `nw_vote.v`（投票本來就要能寫），只能保護 `hidden`、`noms` 以外欄位。
- `mg_gift_used` 學生可以亂造 `{h, id}` 灌高某個序號的使用次數（影響上限）；老師可在管理頁刪除。

## main（v3.13.0）每一個 Firestore 讀寫，在正式規則下的結果

「過」＝學生（匿名登入）原樣照寫也過；「改走新路」＝A 版已經換位置或換身分，舊寫法在正式規則下會被擋。

| 位置（v3.13.0） | 做什麼 | 身分 | 正式規則 | A 版 |
|---|---|---|---|---|
| `index.html` 啟動：`mg_config/settings`、`mg_round/current` onSnapshot | 讀 | 學生 | 過 | 不變 |
| `lookupHistory`、`saveScore`、`pushCloud` 等：`mg_scores/{id}` getDoc／setDoc merge | 讀、create、update | 學生 | 過 | 不變（`pushCloud` 多寫 `nwCls`、`nwEvDone`，規則不看欄位） |
| 排行榜、`nw-rank.js`、班級數據圖：`getDocs(mg_scores)` | 讀 | 學生／老師 | 過 | 不變 |
| 結算 `getDocs(query(mg_scores, where roundId))` | 讀 | 學生 | 過 | 不變 |
| `startRound`／`stopRound`／`resetRound`：`mg_round/current` setDoc | 寫 | 舊：學生身分 | **擋** | 改走 admin app（老師帳號） |
| `saveConfig`：`mg_config/settings` setDoc | 寫 | 舊：學生身分 | **擋** | 改走 admin app |
| `tgAdd`／`tgDel`：`mg_config/gift_codes` 寫 | 寫 | 舊：學生身分 | **擋** | 改走 admin app；不再寫 `used` |
| `tgLoad`：`mg_config/gift_codes` 讀 | 讀 | 老師 | 過 | 「已領幾次」改用 `mg_gift_used` 的 count |
| `clearScores`：`deleteDoc(mg_scores/*)` | 刪 | 舊：學生身分 | **擋**（delete 只有老師） | 改走 admin app |
| `openNwFeedback`：`mg_nw_flags` 查詢、改狀態、頒獎、刪除 | 讀、寫、刪 | 舊：學生身分 | **擋**（只有老師） | 整塊移除，換成連到 `teacher.html` 的按鈕（管理頁下一步做） |
| `newworld.js` `claimBugs`／`claimAwards`：`mg_nw_flags` 查詢、`claimed:true` | 讀、update | 學生 | **擋** | 刪掉；改讀 `mg_bugboard/{我}`（過）。字元獎勵與 `bugking` 等信箱做好再接 |
| `openBugReport`：`mg_nw_flags/bug_*` create | 寫 | 學生 | 帶 `claimed:false` 會**擋** | 拿掉 `claimed`，過 |
| `askFeedback`：`mg_nw_flags/fb_*` create（逾時重送同內容） | 寫 | 學生 | 過（重送內容相同放行） | 不變 |
| 序號兌換：讀 `mg_config/gift_codes` | 讀 | 學生 | 過 | 不變 |
| 序號兌換：`gift_codes.used = increment(1)` | 寫 | 學生 | **擋** | 改走 `mg_gift_used/{雜湊}_{我}` create（過）＋ count 查詢（過） |
| 組隊房間：`mg_config/nwroom_*` getDocs／setDoc／deleteDoc | 讀、寫、刪 | 學生 | 寫、刪**擋** | 改走 `mg_rooms/{我}`（讀寫都過） |
| `nw-preview.js` 提名：`nw_vote` `noms: arrayUnion` | 寫 | 學生 | 過（只動 `noms`） | 不變 |
| 投票、收回投票：`nw_vote` `v.{id}.{我}` | 寫 | 學生 | 過（只動 `v`） | 不變 |
| 老師隱藏、刪提名、搬分類、清空投票：`nw_vote` 整份覆寫、`hidden` | 寫 | 舊：學生身分 | **擋** | 改走 admin app |
| 提名頁 onSnapshot `nw_vote` | 讀 | 學生 | 過 | 不變 |
| 新增：`mg_clock/{我}` 寫 `t`、讀 | 讀、寫 | 學生 | 過 | A 版新增 |
| 新增：`mg_bugboard/{我}` 讀 | 讀 | 學生 | 過 | A 版新增 |
| 新增：`mg_nw_flags/namechg_*` create | 寫 | 學生 | 過 | A 版新增（冒名鎖） |

學生端沒有任何地方還在讀 `mg_nw_flags`、`mg_admin_log`、`mg_admins`（`mg_admins` 只有老師登入時讀自己那份）。
`tools/browser-test/nw5.test.js`、`nw6.test.js` 開著假 Firebase 的簡化規則（`window.__RULES`）跑過整個 A 版流程，確認沒有走到被擋的路。

## 上線步驟
老師在沒有上課的時段一次做完，三步隔越短越好：① 建老師帳號與 `mg_admins/{UID}` → ② 發布 `firestore-rules.txt` → ③ 同一時間新程式上 main。
②到③之間舊程式的序號、房間、回報、老師控制台會被擋；這段時間開著舊分頁的學生要按 F5 重新整理。
