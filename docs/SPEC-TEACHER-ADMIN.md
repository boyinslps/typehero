# 規格：教師管理頁、信箱、活動、佈告欄、抓蟲榜、村莊延伸

> 版本：草稿 v1（2026-11-16）　狀態：**設計中，尚未實作**
> 範圍內的功能全部屬於新世界，**不推 main、不寫進對外訊息**，直到老師同意（見 `CLAUDE.md`）。

---

## 0. 目的與範圍

老師要一個**獨立的管理頁**，能：
1. 看學生狀況、直接把裝備／字元／道具**寄到學生信箱**。
2. 開活動（限時加倍、限時討伐、班級競賽、排行挑戰），可以**排程**（設定開始／結束時間）。
3. 發公告；版本更新跟著 `VERSION_LOG` 自動跳更新公告（不做遠端版本控制，老師直接改程式）。
4. 看回饋、審核問題回報；問題回報算進**抓蟲榜**（常駐活動，掛在村莊的佈告欄）。

另外：
5. 村莊新增**佈告欄**建築，並把地圖改成**比螢幕大、跟著角色捲動的無縫地圖**。
6. 學生可以取**暱稱**（抓蟲榜顯示「班級・座號・暱稱」）。

**不做的事**：
- 不做伺服器端排程或驗證（純前端網站）。排程＝學生打開遊戲時，程式自己比對時間。
- 不做遠端強制更新／遠端切換 `OPEN_STAGE`。
- 不搬移舊世界教師控制台（`index.html` 的 `#teacher-modal`）的功能；管理頁只放新世界的東西，另放一顆按鈕連過去。

---

## 1. 權限（老師選 B：老師用 email 帳號登入）

### 1.1 老師怎麼被認出來
- Firebase Authentication 開「電子郵件／密碼」，老師建一個帳號。
- Firestore 手動建一份 `mg_admins/{老師的 UID}`（內容隨意，例如 `{ ok: true }`）。
- 規則用 `exists(/databases/$(database)/documents/mg_admins/$(request.auth.uid))` 判斷是不是老師。
  **這樣 repo 裡不會出現 UID 或 email**（`CLAUDE.md`：個資不進 repo）。
- `mg_admins` 本身：任何人都不能寫（只能從 Firebase 主控台建）、登入者可讀自己那份（`allow get: if request.auth.uid == uid`）。

### 1.2 各集合的權限

| 集合／文件 | 讀 | 學生寫 | 老師寫 | 備註 |
|---|---|---|---|---|
| `competition`、`scores`（舊站） | 登入者 | ✓ | ✓ | 不動 |
| `mg_config/settings` | 登入者 | ✗ | ✓ | 原本就只有老師在改 |
| `mg_config/gift_codes` | 登入者 | ✗ | ✓ | 使用次數搬到 `mg_gift_used`（§1.3） |
| `mg_config/nw_vote` | 登入者 | ✓ | ✓ | 學生要提名、投票，**例外開放**這一份 |
| `mg_config/{其他}` | 登入者 | ✗ | ✓ | `nwroom_*` 搬走（§1.3） |
| `mg_round`、`mg_bank` | 登入者 | ✗ | ✓ | 開戰、題庫 |
| `mg_scores/{班級_座號}` | 登入者 | ✓ | ✓ | 學生存檔，**擋不住改自己的數字**（§1.4） |
| `mg_rooms/**` | 登入者 | ✓ | ✓ | 組隊房間搬到這裡 |
| `mg_nw_runs` | 登入者 | 只能新增 | ✓ | |
| `mg_nw_flags` | 登入者 | 只能新增 | ✓ | 回饋、問題回報；**學生不能改 status**（改了就能自己批准自己的回報） |
| `mg_gift_used/{序號雜湊}` | 登入者 | 只能 `count` 加 1 | ✓ | 序號用掉幾次 |
| `mg_mail/{自動 ID}` | 登入者 | ✗ | ✓ | 信箱（§3） |
| `mg_events/{自動 ID}` | 登入者 | ✗ | ✓ | 活動（§4） |
| `mg_news/{自動 ID}` | 登入者 | ✗ | ✓ | 公告（§5） |
| `mg_bugboard/{班級_座號}` | 登入者 | ✗ | ✓ | 抓蟲榜加分（§7） |
| `mg_admins/{uid}` | 本人 | ✗ | ✗ | 只能從主控台建 |

「只能新增」的寫法：`allow create: if request.auth != null; allow update, delete: if isTeacher();`

### 1.3 因為權限收緊要一起改的地方

| 現在 | 問題 | 改成 |
|---|---|---|
| 組隊房間存 `mg_config/nwroom_班級_座號` | 學生寫不進 `mg_config` | 存 `mg_rooms/{班級_座號}`（規則早就開好），`loadRooms()` 改讀這個集合 |
| 學生兌換序號時對 `gift_codes` 做 `used: increment(1)` | 學生不能寫 `gift_codes` | 寫 `mg_gift_used/{雜湊}` 的 `count`；教師頁顯示時兩邊合起來。規則限制只能 `count == 舊值 + 1` |
| 學生領問題回報獎勵時把 flag 標 `claimed: true` | 學生不能改 flag | 已領的 flag ID 記在學生自己的 `NW.bugClaimed`（陣列）；教師頁的「學生已領」改看學生存檔 |
| `index.html` 一載入就 `signInAnonymously` | 老師在同一台電腦登入 email 後，回到遊戲會被換回匿名 | `onAuthStateChanged` 先等第一次回報；已經有非匿名使用者就**不要**再匿名登入 |
| 舊控制台用密碼 `teacher` 進入後直接寫 `mg_config`、`mg_round`、`mg_bank` | 匿名身分寫不進去 | 舊控制台照舊，但寫入前若不是老師帳號，提示「請先到教師管理頁登入」並附連結。**不改舊控制台的版面** |

### 1.4 一定要讓老師知道的限制
- 學生存檔（`mg_scores`）還是誰都能寫：懂技術的學生仍能用主控台改**自己**的字元、裝備。
  B 方案擋住的是：自己發信件給自己、自己開活動、自己批准自己的回報、改題庫、開戰。
- 信件、活動獎勵都是「學生端讀到之後自己加進存檔」，所以已領紀錄存在學生存檔裡。這是純前端網站做得到的上限。

### 1.5 老師要做的事（實作完成後，照順序）
1. Firebase 主控台 → Authentication → 登入方式 → 開啟「電子郵件／密碼」。
2. Authentication → 使用者 → 新增使用者（老師 email＋密碼）→ 複製 UID。
3. Firestore → 新增集合 `mg_admins` → 文件 ID 貼 UID → 欄位 `ok`（布林）`true`。
4. Firestore → 規則 → **先複製舊規則存檔** → 貼上新的 `firestore-rules.txt` → 發布。
5. 打開 `teacher.html` 用老師帳號登入，看「總覽」有沒有出現資料。

順序很重要：**第 3 步要在第 4 步之前**，不然發布規則後老師自己也寫不進去。

---

## 2. 教師管理頁 `teacher.html`

### 2.1 基本
- 獨立檔案 `teacher.html`＋`teacher.js`（ES module），跟 `index.html` 同一個 Firebase 設定。
- 進入：遊戲內舊控制台加一顆「🛠 新世界管理頁」按鈕；也可以直接開網址。
- 登入畫面：email、密碼、登入鈕。登入後檢查 `mg_admins/{uid}` 存不存在；不存在就顯示「這個帳號不是老師帳號」並登出。
- 樣式：沿用 `nw-ui.js` 的 `px-panel`／`px-btn`（`CLAUDE.md` 規定新世界畫面都用這套），但管理頁以**資訊密度**為主：表格、字 15px、不放大圖。
- 版面：上方標題列（登入身分、登出、回遊戲）＋左側分頁列（手機改上方橫排）＋右側內容。

### 2.2 分頁

| 分頁 | 內容 |
|---|---|
| 📊 總覽 | 今天上線人數、新世界玩家數、進行中／排程中的活動、待審核的問題回報數、未讀回饋數；每一格點了跳到對應分頁 |
| 👥 學生 | §2.3 |
| ✉ 寄信 | §3.3 |
| 🎪 活動 | §4.4 |
| 📢 公告 | §5.2 |
| 🐛 回饋與回報 | §6 |
| 🏆 抓蟲榜 | §7.4 |
| ⚙ 設定 | 新世界模式、通關密語、標點挑戰發密語、序號禮物（把舊控制台這幾項搬過來；舊控制台那幾項保留但改成唯讀並提示到這裡改） |

### 2.3 學生分頁
- 資料：讀整個 `mg_scores`（現在榮譽碑已經這樣做；人數多了再改）。
- 篩選：年級、班級、有沒有玩新世界、關鍵字（姓名／暱稱／座號）。
- 表格欄位：班級、座號、姓名、暱稱、HR、字元、武器（初心＋禮物）、狩獵場次、勝／敗、最後上線、回報數（已確認／送出）。可以依欄位排序。
- 點一列開**學生卡**：
  - 基本：上面那些＋稱號、區域進度（`zone`）、圖鑑（`dex`）、道具、材料、教學進度（`tut`）、任務（`quest.done`）。
  - 最近 10 場（讀 `mg_nw_runs` 的這位學生）。
  - 動作：「寄信給他」（開 §3.3，收件人預先填好）、「重設暱稱」（把 `nw.nick` 清空並在 `nw.nickBan` 記一筆，見 §8）。
  - **不提供直接改存檔**：所有給東西都走信箱，學生才看得到、才有領取的感覺，也留下紀錄。
- 勾選多位學生 → 「寄信給勾選的人」。

---

## 3. 信箱

### 3.1 資料：`mg_mail/{自動 ID}`

```js
{
  to: { kind: 'all' } | { kind: 'class', cls: ['五年級4班'] } | { kind: 'ids', ids: ['五年級4班_5號', ...] },
  toIds: ['五年級4班_5號', ...],     // 只有 kind:'ids' 時有，給 array-contains 查詢用
  toCls: ['五年級4班'],               // 只有 kind:'class' 時有
  title: '謝謝你幫忙抓蟲',            // 20 字內
  body: '……',                         // 200 字內
  items: [ { type: 'coins', n: 100 }, { type: 'potion', n: 3 }, { type: 'weapon', key: 'tester' }, { type: 'mat', key: 'slimeGel', n: 5 } ],
  from: '老師',                        // 顯示用
  sendAt: 1731700000000,               // 排程：這個時間以後才看得到
  expireAt: 0 | 1732300000000,         // 0 = 不會過期
  t: 1731690000000,                    // 建立時間
  src: 'manual' | 'event:{活動ID}' | 'bug'   // 從哪來的，教師頁篩選用
}
```

- `items.type` 沿用並擴充 `applyReward()`：`coins`、`potion`、`weapon`（`GIFT_WEAPONS` 的 key）、`mat`（材料）、`word`（稱號詞條 ID，只能是 `WORDS` 裡 `g:'活動'` 的詞條）。未知的 type 學生端**跳過不壞**，並在信件上顯示「這個禮物要更新遊戲才能領」。

### 3.2 學生端
- **郵筒**：放在佈告欄旁（§9 地圖），點了或按 Enter 打開信箱；有未領信件時郵筒上方冒 ✉ 與數字。
  背包也加「信箱」分頁（UI-ART-SPEC §4：新的個人資料加分頁，不另開頁面）。兩者打開同一個視窗。
- 進村時讀三個查詢並合併：`toIds array-contains 我`、`toCls array-contains 我的班`、`to.kind == 'all'`；過濾 `sendAt <= 現在`、未過期。
- 已領：`NW.mail = { [信件ID]: 領取時間 }`。領取時把每個 item 跑 `applyReward()`，`showGift()` 依序秀出來，再 `saveNw()`。
- 「全部領取」按鈕。已領的信留著可以重看，30 天後在列表裡收起來。
- 離線：顯示「現在連不上網路，信箱打不開」。

### 3.3 教師頁「寄信」
- 收件人：全部／選班級（多選）／選學生（從學生分頁帶過來或在這裡搜尋）。
- 禮物：一列一個，選類型＋數量（武器用下拉選 `GIFT_WEAPONS`）。
- 預約寄送（`sendAt`）、有效期限（預設不過期）。
- 預覽：照學生看到的樣子顯示信件。
- 寄出紀錄：列出 `mg_mail`，可篩來源；可以「收回」＝刪除那封信（已經領的人不會被扣回，畫面上說清楚）。
- 領取狀況：點一封信 → 列出收件人與「已領／未領」（從 `mg_scores` 的 `nw.mail` 判斷）。

---

## 4. 活動

### 4.1 類型

| type | 名稱（給學生看） | 怎麼算 | 獎勵怎麼發 |
|---|---|---|---|
| `boost` | 限時加倍 | 活動期間打贏魔物：字元或獵人經驗 × 倍率（`mul` 1.5／2／3） | 打完當場就多給，不用領 |
| `hunt` | 限時討伐 | 活動期間打倒指定魔物（`mk`，可指定星級下限 `minStar`）`goal` 隻 | 達標時學生端自己發（同信件的 items），一人一次 |
| `classwar` | 班級對抗 | 活動期間各班「打倒魔物數」（或指定魔物）加總，比總數或**平均每人**（`by: 'sum'|'avg'`，預設平均，人少的班不吃虧） | 結束後老師在教師頁按「發獎」→ 對名次班級寄信 |
| `ranking` | 排行挑戰 | 活動期間的個人指標：打倒數、最快討伐秒數（指定魔物）、正確率最高（至少打 N 場） | 結束後老師按「發獎」→ 前 N 名寄信 |
| `bugboard` | 抓蟲大作戰 | 常駐，見 §7 | 老師另外決定，可用寄信 |

`bugboard` 是內建的常駐活動，不存 `mg_events`，固定出現在佈告欄。

### 4.2 資料：`mg_events/{自動 ID}`

```js
{
  type: 'hunt', title: '咕咕鳥大量出沒！', desc: '……（60 字內）',
  startAt, endAt,                // 排程；學生端比對現在時間
  cls: [] | ['五年級4班', ...],  // 空＝全校
  // 依 type：
  mul: 2, what: 'coins' | 'exp',                 // boost
  mk: 'coo', minStar: 1, goal: 10,               // hunt
  metric: 'kills', mk: '', by: 'avg',            // classwar
  metric: 'kills'|'fastest'|'acc', mk, minRuns,  // ranking
  items: [ ... ],                // hunt 的達標獎勵；classwar／ranking 的預設獎勵（發獎時可改）
  topN: 3,                       // classwar／ranking 發獎名次
  awarded: false, t
}
```

### 4.3 學生端怎麼算
- 進村時讀「`endAt` 在 7 天內或之後」的活動，在記憶體裡分「進行中」「快開始」「剛結束」。
- 每場結束（`finishHunt`）：對每個進行中、班級符合的活動，更新 `NW.ev[活動ID]`：
  - `hunt`：`n`（符合的擊倒數）、`done`（領過沒）。達標就 `applyReward` 並秀禮物。
  - `classwar`／`ranking`：`kills`、`fastest`、`accSum`/`runs`，只累計活動期間、而且**這場有效**（`res.valid`）的。
  - `boost`：直接乘到 `finishHunt` 算出來的字元／經驗上；結果畫面寫「活動加倍 ×2」。
- 班級總數、排名：**不另外存計數器**（學生可以灌）。佈告欄和教師頁都讀 `mg_scores` 的 `nw.ev[活動ID]` 自己加總。學生端讀全部 `mg_scores` 現在榮譽碑已經這樣做，沿用同一份快取，60 秒內不重讀。
- 時間以**學生電腦時間**比對，畫面上寫「活動時間以學校電腦為準」。教師頁顯示活動狀態時用老師電腦時間。

### 4.4 教師頁「活動」
- 列表：排程中／進行中／已結束，各自一區。
- 新增：先選類型，再填欄位（只顯示該類型需要的欄位），日期時間用 `datetime-local`。
- 範本：「週末雙倍字元」「咕咕鳥大量出沒（打 10 隻）」「班級對抗：一週打倒數（平均）」「最快討伐：泡泡蛙」，點了填好預設值再改。
- 進行中的活動：即時名次（讀 `mg_scores` 加總）、參加人數。
- 已結束：「發獎」→ 預覽名次與要寄的信 → 確認 → 寄信（`src: 'event:{ID}'`）並把 `awarded: true`。重複按會提示已經發過。
- 可以提早結束（把 `endAt` 改成現在）或刪除。

---

## 5. 公告與更新公告

### 5.1 兩種公告
1. **老師公告**：`mg_news/{自動 ID}` `{ title, body, pin: bool, publishAt, expireAt, t }`。
2. **更新公告**：程式內建，來源是 `VERSION_LOG`。每筆加一個選填欄位 `nw: '給新世界玩家看的一句話'`；
   只有寫了 `nw` 的版本會在新世界跳出。學生進村時，若 `NW.seenVer` 比最新一筆有 `nw` 的版本舊，
   跳出「村子有新東西了！」視窗，列出 `seenVer` 之後所有有 `nw` 的條目，按「知道了」寫回 `seenVer`。
   - `nw` 的文字照 `CLAUDE.md`：國小四～六年級看得懂、只寫已經能玩到的。

### 5.2 教師頁「公告」
- 新增／編輯／刪除老師公告；置頂；預約發布；到期自動收起。
- 下方唯讀列出最近 5 筆 `VERSION_LOG` 有 `nw` 的條目，提醒老師學生會看到什麼。

---

## 6. 回饋系統（教師頁「回饋與回報」）

**回饋（`type:'feedback'`）和問題回報（`type:'bug'`）分兩個子分頁**，跟抓蟲榜分開管理（老師要求：回饋獨立在回饋系統內）。

- 回饋：表格（時間、學生、魔物、評價 😀😐😣、內容）。篩選魔物、評價；可標「已讀」（`read: true`，老師寫）。上方小統計：每隻魔物三種評價各幾個。
- 問題回報：待審核／已確認／不採用三區。確認時選**嚴重程度**：小（1 分）／中（2 分）／大（3 分），寫入 `status:'approved', sev: 1|2|3`；可寫一句回覆給學生（`reply`，學生在手冊的「我的回報」看得到）。
- 學生端 `claimBugs()` 改成：已確認且不在 `NW.bugClaimed` 的 → 領字元（照現在的 `BUG_COINS`、`BUG_REWARD_MAX`）→ 把 ID 推進 `NW.bugClaimed`。

---

## 7. 抓蟲榜（常駐活動）

### 7.1 分數
- 每位學生的抓蟲分＝已確認回報的 `sev` 加總（舊資料沒有 `sev` 的算 1）＋老師手動加分 `mg_bugboard/{班級_座號}.bonus`。
- 同分比「最早達到這個分數的時間」（先抓到的排前面）。
- 只算 `status:'approved'`；不採用的不算。

### 7.2 老師手動加分（給已經在遊戲外回報過的學生）
- `mg_bugboard/{班級_座號}`：`{ bonus: 3, notes: [{ n: 1, why: '回報委託板卡住', t }] }`。
- 這是老師說的「504 的 5、12、1 號已經幫忙抓過 bug」的入口：**老師在教師頁自己加**，座號不寫進 repo。

### 7.3 顯示（佈告欄的「抓蟲榜」分頁）
- 標題：「🐛 抓蟲大作戰」，副標「發現遊戲怪怪的地方，到測試員手冊回報；老師確認後就會上榜！」
- 列前 10 名＋自己的名次（不在前 10 也顯示）。
- 每列：名次徽章（1～3 名金銀銅，用 `PX.badge` 風格的像素圖）、`504・5號`、暱稱（沒取暱稱顯示「神秘獵人」）、分數、已確認件數。
  - 班級顯示成短碼：「五年級4班」→「504」（規則：年級數字＋兩位數班級）。
  - **不顯示真實姓名**。
- 前 3 名每月 1 日由老師決定要不要寄獎（教師頁提醒，不自動發）。

### 7.4 教師頁「抓蟲榜」
- 跟學生看到的一樣的榜，但多顯示姓名、每個人的回報明細（可連到回饋與回報分頁）。
- 「手動加分」：選學生、分數（可負）、理由。
- 「寄獎給前 N 名」：開寄信畫面，收件人預填。

---

## 8. 暱稱

- 存在 `NW.nick`（字串）。背包人物卡的名字下方加「✏ 取暱稱」。
- 規則：2～8 個字；只能中文、英文、數字；不能全是數字；擋一份簡單的不雅字清單（`nw-data.js` 的 `NICK_BAN`，用 `normText` 比對包含）。
- 一天最多改 1 次（`NW.nickAt`）。
- 老師在學生卡按「重設暱稱」：寄一封系統信 `{ items: [{ type: 'nickReset' }] }`，學生端領到時清空 `NW.nick` 並提示「老師請你換一個暱稱」。（老師不能直接寫學生存檔也做得到，而且學生知道發生什麼事。）
- 暱稱出現的地方：抓蟲榜、活動排名、榮譽碑（之後）。**舊世界不顯示**。

---

## 9. 佈告欄與村莊延伸

### 9.1 佈告欄建築
- `kind: 'notice'`，名稱「佈告欄」，3×3 格；像素造型：兩根木柱撐一塊大木板，上面釘 3～4 張彩色紙（紅＝活動、金＝公告、綠＝抓蟲榜），頂上一小片屋簷。用 `PX.wood`／`PX.paper`／`PX.pin` 的畫法。
- 有新東西（沒看過的公告、進行中活動有進度、抓蟲榜名次變動）時，木板上方冒一個彈跳的「！」。
- 放在**中央廣場正北**，一進村就看得到。旁邊放郵筒（`decor` 的 `k: 'mailbox'`，可點）。
- 打開後是一個 `px-panel` 視窗，三個分頁：
  - **📢 公告**：置頂的在最上面；老師公告＋更新公告歷史。
  - **🎪 活動**：進行中（大卡片：標題、說明、剩幾天幾小時、我的進度條、班級對抗的長條圖）、快開始（灰卡片，寫開始時間）、剛結束（顯示名次，提示「老師會寄獎品到信箱」）。
  - **🐛 抓蟲榜**：§7.3。
- 村長的話加一句：「廣場上的佈告欄會貼活動和公告，記得常常去看！」

### 9.2 無縫延伸地圖
現在的村莊是 22×15 格塞進一個畫面，加建築就塞不下。改成：

- **地圖變大**：44×30 格（邏輯 704×480 像素），分成幾個區，用小路與橋連起來，**沒有切換畫面**，角色走過去鏡頭就跟過去。
- **分區**（由南到北）：

| 區 | 位置 | 放什麼 |
|---|---|---|
| 傳送門廣場 | 正南 | 傳送門（回舊世界）、出生點 |
| 中央廣場 | 中央 | 噴泉、**佈告欄**、郵筒、村長 |
| 學習區 | 西 | 教學大樓、委託板（出發狩獵的地方）、練習用稻草人裝飾 |
| 市集 | 東 | 商店、防具店、鐵匠鋪、倉庫（都還沒開，照舊轉灰＋施工中） |
| 高台 | 北 | 星圖台、榮譽碑、組隊酒館 |
| 池塘與樹林 | 東南、西北 | 純裝飾，讓地圖不像棋盤 |

- **鏡頭**：
  - 畫面大小＝視窗大小；倍率照 UI-ART-SPEC §1 取整數（桌機 3～4、手機 2），**整張地圖不用一次塞進畫面**。
  - 鏡頭以角色為中心，碰到地圖邊緣就停（clamp），平滑跟隨（每格 lerp 0.18），位置取整數像素避免模糊。
  - 尊重「減少動態效果」：直接跳到角色位置，不做平滑。
- **小地圖**：右下角 88×60 的像素小地圖（固定 1 倍），畫各區色塊、建築點、自己（閃爍金點）；點小地圖上的建築＝走過去。
- **效能**：底圖（地形＋建築）先畫到一張離屏 canvas 一次，之後每格只 `drawImage` 鏡頭範圍＋畫角色、村民、動畫。熱區按鈕放在一層跟著鏡頭 `translate` 的 div 裡（不要每格重建 DOM）。
- **操作**不變：WASD／方向鍵、點地面走過去（BFS 尋路沿用）、點建築走過去再開、Enter 開門。點的時候要把螢幕座標加上鏡頭位移換成地圖座標。
- **資料**：`VILLAGE` 改成新的格數與座標；保留 `doorTile()`、`gate`、`blocked` 的用法，讓其他程式不用改。新增 `VILLAGE.zones`（每區名稱與範圍，走進新區時畫面上方淡入區名 1.2 秒，例如「🏛 學習區」）。
- **引導箭頭**（`guide`）：目標在鏡頭外時，在畫面邊緣顯示指向它的箭頭。

---

## 10. 實作分工（給 Sonnet 子代理）

照順序，每一步都要跑 `tools/browser-test/`，新功能要補測試。

| 步 | 內容 | 主要檔案 | 測試 |
|---|---|---|---|
| 1 | 規則與權限：`firestore-rules.txt` 新版；房間搬 `mg_rooms`；序號次數搬 `mg_gift_used`；`bugClaimed`；`index.html` 不覆蓋老師登入；舊控制台寫入前檢查老師身分 | `firestore-rules.txt`、`newworld.js`、`index.html` | 假 Firebase 加 `auth.currentUser.isAnonymous`；房間、序號、領回報獎勵照舊能跑 |
| 2 | 信箱＋暱稱：資料、`applyReward` 擴充、郵筒與背包分頁 | `newworld.js`、`nw-data.js`、`pixel.js` | 三種收件人都收得到、排程與過期、全部領取、未知 type 不壞、暱稱規則 |
| 3 | 活動：學生端計算、`boost` 加倍、`hunt` 達標發獎 | `newworld.js`、`nw-data.js` | 時間外不算、班級限制、只算有效場、重複領不到 |
| 4 | 佈告欄＋抓蟲榜（學生端）＋更新公告 | 新檔 `nw-notice.js`、`pixel.js`、`index.html`（`VERSION_LOG` 加 `nw`） | 三分頁內容、名次與同分、班級短碼、不顯示姓名、更新公告只跳一次 |
| 5 | 村莊延伸地圖 | `nw-village.js`、`nw-data.js`、`pixel.js` | 每個建築都走得到、鏡頭不出界、點擊座標正確、小地圖、手機寬度 |
| 6 | 教師管理頁 | 新檔 `teacher.html`、`teacher.js` | 非老師帳號被擋、各分頁讀寫、發獎不重複 |
| 7 | 文件 | `HANDOFF.md`、`GDD-NEWWORLD.md`、`UI-ART-SPEC.md`、`RELEASE-STAGES.md`、`CHANGELOG.md`、`VERSION_LOG` | — |

另外修好 `nw4.test.js` 既有的失敗（點擊被村莊 canvas 擋住），步驟 5 改地圖時一起處理。

---

## 11. 待老師決定（有預設值，沒回覆就照預設）

1. 抓蟲分數：小 1／中 2／大 3？（預設是）
2. 班級對抗預設比「平均每人」？（預設是）
3. 暱稱一天改 1 次？（預設是）
4. 信件預設不過期？（預設是）

---

## 12. 參考做法（2026-11-16 查的資料，與它對規格的影響）

| 來源怎麼說 | 對這份規格的影響 |
|---|---|
| 營運工具要一開始就規劃；給非工程師用的內容管理層（[Practical Game Design](https://subscription.packtpub.com/book/game-development/9781803245157/14/ch14lvl1sec90/tools-and-setup)）；上線前先比對設定差異（[Metaplay LiveOps Dashboard](https://docs.metaplay.io/liveops-dashboard/introduction-to-the-liveops-dashboard)） | 活動、公告、信件送出前都要有「學生會看到的樣子」預覽與欄位摘要 |
| GM 動作要留紀錄、定期回顧；常用動作做捷徑、不常用的別堆滿畫面（[Roblox 開發者論壇](https://devforum.roblox.com/t/redefining-the-admin-suite-what-do-we-actually-need-in-2026/4242695)） | 新增**操作紀錄** `mg_admin_log`（誰、何時、做了什麼）；總覽頁放最常用的 3 個捷徑 |
| 獎勵先放信箱，不直接發；每一筆發放有唯一鍵，領取是「未領→已領」一次性狀態（[bugnet：信箱](https://bugnet.io/blog/how-to-build-a-mailbox-system-for-player-rewards)、[bugnet：防重複](https://bugnet.io/blog/how-to-prevent-duplicate-reward-grants-from-retries)、[Heroic Labs Mailbox](https://heroiclabs.com/docs/hiro/concepts/mailbox/)）；原神、Warframe 都出過重複發獎的事故（[ClutchPoints](https://clutchpoints.com/gaming/genshin-impact-accidentally-gave-out-double-rewards)、[Warframe](https://devtrackers.gg/warframe/p/3ffc01e8-psa-duplicate-twitch-drops-script)） | 活動發獎的信件 ID 固定成 `ev_{活動ID}_{名次或班級}`，重按「發獎」只會覆蓋同一封，不會多一封；學生端已領紀錄以信件 ID 為鍵 |
| 活動分「限時比排名」與「先達標就拿」兩種（[Heroic Labs Event Leaderboards](https://heroiclabs.com/docs/hiro/concepts/event-leaderboards/llm.md)） | `ranking`／`classwar` 屬前者，`hunt` 屬後者；欄位照這個分 |
| 兒童遊戲要評估限時活動帶來的「怕錯過」壓力，避免催促；鼓勵休息（[英國 ICO 給遊戲開發者的兒童規範](https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/2023/02/new-guidance-to-industry-issued-for-game-developers-on-protecting-children)） | 剩餘時間用平靜的寫法（「還有 3 天」），**最後幾小時不閃紅、不倒數秒**；錯過的活動之後可以重開（教師頁「再開一次」） |
| 排行榜對成績較弱的學生可能造成挫折；兩隊對抗時輸的那隊表現、信心都下降（[GaLA 2020](https://trepo.tuni.fi/bitstream/10024/130150/1/GaLA_Conf_2020_paper_leaderboard.pdf)、[ECGBL](https://papers.academic-conferences.org/index.php/ecgbl/article/download/1593/1652/6517)、[INFORMS](https://pubsonline.informs.org/stoken/default+domain/IAC-EDU/full/10.1287/ited.2019.0227)） | 班級對抗加一條**全校合作目標**（大家一起打到 N 隻，人人有獎）；名次只列前 3 和自己的班，不列最後一名；個人排行只列前 10 和自己，另提供「進步最多」指標 |
| 抓蟲計分看品質不看數量；同一個問題只算第一個回報的人；有里程碑獎勵（[HackerOne](https://docs.hackerone.com/en/articles/9145220-reputation-milestone-swag)、[HackenProof](https://docs.hackenproof.com/bug-bounty/reports-basics/points-guide)、[QuillAudits](https://academy.quillaudits.com/bug-bounty/grading-system)、[arXiv 2009.10158](https://arxiv.org/pdf/2009.10158)） | 審核多一個「重複」狀態：不加分但會收到感謝；分數依嚴重程度；加**抓蟲徽章**（1／3／5／10 分各一個稱號詞條），讓沒上前 10 的人也有目標 |
| 俯視地圖：鏡頭跟著角色、碰到地圖邊緣就停；用 y 座標決定前後圖層（[Godot 論壇](https://godotengine.org/qa/5544/organization-of-the-world-in-a-zelda-like-game)、[gemini-fantasy 教學](https://jorge-d-robles.github.io/gemini-fantasy/08-part-ii-review.html)） | §9.2 鏡頭照這個做；村民、角色、建築依腳的 y 座標排序畫 |

以上會在下一版（審查後）併進各章節正文。
