# 雲端資料結構（`mg_scores`）與局外成長的前置

這份文件回答兩件事：**存檔與 Firestore 規則怎麼設（v3.14.0 起是正式規則）**、**要做局外成長還缺什麼資料**。
數值曲線請看 [`BALANCE.md`](BALANCE.md)。

---

## 1. `mg_scores`：一個學生一筆

文件 ID＝`班級_座號`（例：`五年級3班_12號`），由 `seatDocId()` 產生。
換電腦、換瀏覽器都接得回同一筆，代價是**換班或換座號＝變成另一個人**。

寫入只有一個出口：`saveScore()`（結算時呼叫一次）。它分兩段：

### 1.1 一定會寫（練習、正式比賽都寫）

| 欄位 | 意思 |
|---|---|
| `className` / `seat` / `name` | 身分 |
| `bestDamage` / `bestWpm` / `bestKills` / `bestAcc` / `bestLevel` / `bestCombo` | 歷史最佳 |
| `bestScore` | 戰績分（每分鐘正確字數 × 品質 × 正確率），跨版本可比 |
| ~~`dda`~~ | **v3 起不再使用**（動態難度已取消，見 BALANCE.md §7）。欄位保留不刪 |
| `tier` | 難度層級 `'A'`／`'B'`／`'C'`，新手教學量出來就固定（v3 新增） |
| `tutorialDone` | 新手教學做過沒 |
| `plays` | 總場次 |
| `balanceVer` | 當時的平衡版本（舊版傷害數字不能跟新版比） |
| `lastPlayedAt` | 伺服器時間 |
| `lastWpm` / `lastAcc` / `lastKills` / `lastLevel` / `lastCombo` / `lastDamage` | **最近一場**的當場數字 |
| `lastWeapon` / `lastQuality` / `lastPractice` | 最近一場用什麼打、是不是練習 |

### 1.2 只有正式比賽才寫

`damage`、`words`、`accuracy`、`wpm`、`maxCombo`、`perfect`、`attacks`、
`weapon`、`quality`、`kills`、`byWeapon`、`roundId`、`mode`、`timestamp`。

這一段是班內排行與全班總傷害的來源，練習不寫，所以練習分數不會混進排行。

### 1.3 為什麼會有 `last*` 這一組

改版前「當場成績」只有 1.2 那一段，也就是**只有正式比賽才留**。
但學生九成時間是自己練習，結果 142 筆紀錄裡只有 1 筆有 `accuracy`——
老師想看「全班正確率分布」根本沒有資料可畫。
`last*` 是練習也會寫的那一份，兩邊都有了之後：

- 教師控制台的「班級數據圖」可以畫 **歷史最佳** 與 **最近一場** 兩種切面
- 局外成長要判斷「這孩子最近狀況如何」也有東西可以看

舊紀錄沒有 `last*`（那時還沒這個欄位），圖表會回退去讀 `wpm`／`accuracy`／
`kills`，讀不到就當那個人沒資料，不會算成 0 把分布拉歪。

---

### 1.4 新世界相關欄位（v3.14.0 起）

新世界的存檔整包放 `nw`（`nw-data.js` 的 `normalizeNw()` 是欄位清單，缺的補預設值）。
因為「不讀整份 `nw` 也要查得到」，有幾個值**另外抄一份放最外層**：

| 欄位 | 位置 | 意思 | 誰用 |
|---|---|---|---|
| `nwTitle`／`nwTitleN` | 最外層 | 稱號字串、詞條數 | 舊世界大廳與排行榜 |
| `nwCls` | 最外層 | 班級（`className` 的複本） | 班級挑戰的分母（`where('nwCls','==',班)` 的 count） |
| `nwEvDone` | 最外層 | 已達標活動，字串陣列 `"活動ID\|班級"` | 班級挑戰達標人數（`array-contains` 的 count） |
| `nwNick` | 最外層 | 組好的暱稱字串（例：`勇敢的史萊姆`） | 活動排行榜、抓蟲榜的顯示 |
| `nw.nick` | `nw` 裡 | 暱稱的兩個詞 ID `[A, B]`；取了就固定 | 暱稱顯示；換要用改名卡 |
| `nw.nickAt` | `nw` 裡 | 取名／換名時間 | |
| `nw.name0` | `nw` 裡 | **只寫一次**的基準姓名（冒名鎖用）。`name` 每次登入都會被覆蓋，不能當基準 | 冒名鎖 |
| `nw.nameFlagged` | `nw` 裡 | 已經送出過換名紀錄的雜湊 `{8碼: 1}` | 避免重複寫 `namechg` |
| `nw.mail` | `nw` 裡 | 信箱已領紀錄 `{信件ID: 領取時間}` | 信箱；領前重讀雲端合併 |
| `nw.ev` | `nw` 裡 | 每個活動的個人進度 `{ID: {e, t, n, done, cw, s, base, best, runs, accSum, gone}}`，結束超過 30 天自動刪 | 活動、教師頁排行榜 |
| `nw.evDone` | `nw` 裡 | 同 `nwEvDone` | |
| `nw.fastMk` | `nw` 裡 | `{魔物:星級: 自己最快秒數}`，進步獎的活動前紀錄 | 進步獎 |
| `nw.bugs`／`nw.bugScore` | `nw` 裡 | 老師確認的回報數、抓蟲分（從 `mg_bugboard` 同步，取 max） | 手冊、詞條 |
| `nw.seenNotice`／`seenNews`／`seenEv`／`seenBug` | `nw` 裡 | 佈告欄各分頁看到哪裡 | 「！」與自動跳出 |
| `nw.pos`／`nw.posV` | `nw` 裡 | 村莊座標；`posV` 不是 2（32×22 地圖）的舊座標一律回出生點 | 村莊 |

### 1.4b 裝備與每場紀錄欄位（第 2 段 2b，`nw` 裡）

| 欄位 | 意思 | 誰用 |
|---|---|---|
| `gearV` | 裝備格式版本；1＝已搬成裝備格式（`normalizeNw` 只搬一次，本機舊存檔比雲端新也不會重搬） | 搬移 |
| `gear` | 所有裝備 `[{ id, k, c, p, t, s? }]`：`k`＝`GEAR_DEFS` 的 key（老師送的武器用 `GIFT_WEAPONS` 的 key，例 `testblade`）、`c`＝顏色 gray／green／blue、`p`＝強化 0～5、`s:1`＝初心武器那一件。最多 60 件 | 背包、鐵匠鋪、戰鬥 |
| `eq` | 五格穿著 `{ weapon, helm, armor, gloves, boots }`，值是 `gear` 的 id 或 null | 戰鬥、人物卡 |
| `forge` | `{ made, ups, top, gift }`：做過幾件、強化幾次、最高 +幾、布裝圖紙送過了嗎 | 主線 1-5／1-6、詞條 |
| `bpDry` | `{ 魔物: 連續幾場贏了沒掉圖紙 }`，到 5 第 6 場一定掉 | 圖紙保底 |
| `cpmHist` | `{ 題目等級: 最近 5 場打字速度 }` | 「進步太跳」偵測 |
| `runQ` | 還沒寫進雲端的場次紀錄 `[{ rid, run, flag }]`，最多 5 筆 | 離線補寫 |
| `equip`／`gw`／`starter` | **舊欄位照寫**（`syncLegacy`）：穿著的老師送的武器、擁有的老師送的武器、初心武器種類 | 舊分頁、教師頁舊程式 |

### 1.5 新集合（v3.14.0 起）

| 集合／文件 | 誰寫 | 內容 |
|---|---|---|
| `mg_admins/{UID}` | 老師從主控台手動建 | `{ ok: true }`。有這份文件的帳號就是老師；程式不能寫、不能列出 |
| `mg_mail/{ID}` | 老師 | 信：`aud`（`['all']`／`['cls:班級']`／`['id:班級_座號']`）、`title`、`body`、`items[]`、`from`、`sendAt`、`expireAt`、`t`、`src`。固定 ID 的信（`bug_…`、`ev_…`、`award_…`）重寄是覆蓋 |
| `mg_events/{ID}` | 老師 | 活動，欄位見 `nw-events.js` 檔頭；ranking 發獎後多 `result`（名次快照，不放真名）、`awarded` |
| `mg_news/{ID}` | 老師 | 公告 `{ title, body, pin, t }` |
| `mg_bugboard/{班級_座號}` | 老師 | 抓蟲榜：`score`、`n`、`firstAt`、`hideNick`、`bonus`、`nameOk`、`reports[]`（`{id, st, sev, reply, t}`，`st`＝approved／rejected／dup）。不放真名 |
| `mg_nw_flags/{ID}` | 學生 create、老師全部 | 回報（`bug_…`）、回饋（`fb_…`）、換名紀錄（`namechg_…`，有真名）。學生不能讀 |
| `mg_gift_used/{雜湊_班級_座號}` | 學生 create | `{ h, id, t }`，序號一人一份；次數用 count 查詢 |
| `mg_rooms/{班級_座號}` | 學生 | 組隊房間（取代 `mg_config/nwroom_*`） |
| `mg_clock/{班級_座號}` | 學生 | 只有 `t`（伺服器時間），算學生電腦的時差 |
| `mg_nw_runs/{班級_座號}_{毫秒}` | 學生 create（2b 開放後才寫） | 每場狩獵一筆：`id`（文件 ID）、`cls`、`seat`、`uid`、`t`、`ts`（伺服器時間，分週用）、`v`、`app`、`mk`、`rk`、`star`、`lv`、`qb`（題目等級）、`res`、`secs`、`acc`、`ans`、`cor`、`typ`、`keys`、`nokey`、`act`、`cpm`、`fl`、`sus`（可疑代碼）、`w`、`atk`、`pw`、`tier`、`q`（每題摘要，**平的數字陣列、每 4 個一題** `[字數, 按鍵, 毫秒, 打對]`，最多 120 題＝480 個數字；Firestore 不能存陣列裡的陣列，規格原本寫的巢狀陣列行不通）。學生不能讀、不能改；2a 榮譽碑用 |
| `mg_nw_flags/run_{runId}` | 學生 create | 被標記的場次（`type:'run'`、`why`＝可疑代碼 keys／fast／sum／jump），老師在 2a 的教師頁審核 |
| `mg_nw_board/{年級}`、`mg_nw_board_private/{年級}` | 老師（2a） | 榮譽碑榜單（學生讀）與累積狀態（只有老師） |
| `mg_admin_log/{ID}` | 老師 | 操作紀錄 `{ act, target, summary, t }` |
| `mg_config/class_sizes` | 老師 | `{ sizes: {班級: 人數}, t }`，班級挑戰分母（活動自己的 `clsSize` 優先） |

---

## 2. Firestore 規則（v3.14.0 起是**正式版**，逐集合權限）

以前這裡寫「規則不用改」，因為 `mg_scores` 是 `allow read, write: if request.auth != null`，
所有登入（含匿名）的人什麼都能寫，連**全校存檔都能刪**。v3.14.0 改成正式版
（`firestore-rules.txt`，規格 `SPEC-TEACHER-ADMIN.md` §1），重點：

- **老師身分 = `mg_admins/{UID}` 存在**。老師用 email／密碼登入（舊遊戲用具名 admin app，不影響學生機）。
- **學生（匿名登入）**：
  - 讀：幾乎全部可讀，**除了** `mg_nw_flags`（有真名）與 `mg_admin_log`。
  - 寫：`mg_scores`（create、update）、`mg_rooms`、`mg_nw_runs`（create）、`mg_clock`（只能寫 `t`）、`mg_gift_used`（只能 create）、`nw_vote`（只能動 `v`、`noms`）、`mg_nw_flags`（只能 create 回報／回饋／換名，欄位白名單、不能自己帶已確認狀態）。
- **只有老師能寫**：`mg_config`、`mg_round`、`mg_bank`、`mg_mail`、`mg_events`、`mg_news`、`mg_bugboard`、`mg_admin_log`；`mg_scores` 與 `mg_nw_runs` 的刪除。
- 舊站（`competition`、`scores`）維持原樣。
- **規則本身不看 `mg_scores` 的欄位**，所以遊戲新增存檔欄位不用回來改規則。
- **還是擋不住的**：匿名登入的 uid 對不上「班級_座號」，學生仍然能改**自己的**字元與裝備。規則擋的是「學生自己寄信、開活動、批准回報、改題庫、刪全校存檔」。要真正防作弊得有伺服器端驗證，超出單檔網頁的範圍。
- 改規則後一定要跑 `tools/rules-test/`（`npm test`）；發布步驟給老師的版本在 [`LAUNCH-TEACHER.md`](LAUNCH-TEACHER.md)。

---

## 3. 要做局外成長（meta progression）的話

**完整草案在 [`META-GROWTH.md`](META-GROWTH.md)**，這裡只講資料面。

**容器已經有了**：`mg_scores` 本來就是一人一筆，加欄位就好，
不需要另開 collection、也不需要學生帳號系統。要加的欄位見
[`META-GROWTH.md`](META-GROWTH.md) §7（`tier` / `growthPts` / `growthTotal` /
`talents` / `talentCount` / `bestZone`）。

三個先講清楚再動工的問題：

1. **身分綁在「班級_座號」上**。換班、換座號、老師改座號表，局外進度就
   跟著不見了。單場成績丟了還好，**局外成長丟了學生會很在意**。
   要嘛接受（每學期重來一次也算一種設計），要嘛改成有真正的帳號。
2. **規則擋不住學生改自己的存檔**（v3.14.0 的正式規則只擋「改別人的、改全校的、老師才能做的事」）。匿名登入的 uid 跟「班級_座號」對不起來，
   規則沒辦法判斷「這筆是不是他本人寫的」，所以學生開主控台就能改自己的
   數字。單場成績被改影響有限，但**貨幣／永久解鎖被改是會擴散的**
   （改一次爽整學期，而且同學看得到）。真要防要嘛老師帳號才有寫入權、
   要嘛伺服器端驗證，都超出單檔網頁的範圍。
3. **累積量現在沒有在存**。`bestKills` 是「單場最多」不是「總共」，
   要用擊倒數當貨幣的話，得先在 `saveScore()` 加 `totalKills += G.kills`。

細節見 [`META-GROWTH.md`](META-GROWTH.md)。

---

## 4. 教師控制台「班級數據圖」讀什麼

`index.html` 的 `renderViz()`：

| 指標 | 歷史最佳 | 最近一場 |
|---|---|---|
| 打字速度 | `bestWpm` | `lastWpm` → 舊資料回退 `wpm` |
| 正確率 | `bestAcc` | `lastAcc` → 舊資料回退 `accuracy` |
| 擊倒數量 | `bestKills` | `lastKills` → 舊資料回退 `kills` |

資料是整包讀回來在前端切的，**不能用 `orderBy('damage')`**——Firestore
排序會直接跳過沒有那個欄位的文件，而 `damage` 只有正式比賽才寫，
142 筆裡只有 1 筆撈得到（成績管理那張表本來就是因為這個幾乎是空的）。
