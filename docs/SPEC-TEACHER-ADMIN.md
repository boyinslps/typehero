# 規格：教師管理頁、信箱、活動、佈告欄、抓蟲榜、村莊延伸

> 版本：**v3（2026-11-16）**　狀態：第 1、2 輪專家審查已併入，**等老師確認 §14 後交給實作**
> 基準程式：`origin/main` 的 **v3.13.0**（新世界打完標點挑戰就開放、已有 📢 佈告欄按鈕與 `NOTICES`、已有職業除錯師頒發）。
> 變更紀錄見文末 §13。

---

## 0. 目的、範圍、不做的事

老師要：
1. **獨立的教師管理頁**（老師 email 登入）。
2. **學生狀況**檢視，把裝備、字元、道具**寄到學生信箱**。
3. **活動**：限時加倍、限時討伐、班級競賽、排行挑戰，可以**排程**。
4. **更新公告**跟著版本紀錄跳（現有 `NOTICES` 已做到），不做遠端版本控制。
5. **抓蟲榜**：常駐活動，貼在佈告欄，顯示「班級座號＋暱稱」。
6. **佈告欄**做成村莊裡的建築；**村莊地圖變大、跟著角色捲動**。
7. **回饋**留在自己的系統裡，不跟抓蟲榜混在一起。

不做：
- 伺服器端程式（純前端＋Firestore）。排程＝學生端比對「伺服器時間」（§1.6）。
- 遠端強制更新、遠端切換 `OPEN_STAGE`。
- 改舊世界的教師控制台版面（只讓它的寫入改用老師身分，§1.4）。

---

## 1. 權限與安全（老師選 B：email 帳號）

### 1.1 現在就有、這次會被放大的兩個洞

| 洞 | 現況 | 這次為什麼變嚴重 | 對策 |
|---|---|---|---|
| **冒名**：`doLogin()`（index.html）只要班級＋座號＋任意姓名 | 換姓名也能進同一份存檔 | 有了信箱，可以用同學座號登入領走他的信；可以改同學暱稱掛上全校榜 | §1.5 |
| **誰都能寫任何 `mg_scores`** | 匿名登入的 uid 對不上「班級_座號」 | 暱稱、活動進度、已領紀錄都在存檔裡 | 重要的資料改放「只有老師能寫」的地方（信件、抓蟲分、隱藏暱稱）；學生存檔裡的東西只當顯示用 |

**誠實告知老師**：B 方案擋得住「自己寄信給自己、自己開活動、自己批准回報、改題庫、刪全校存檔」，**擋不住懂技術的學生改自己的字元和裝備**。純前端網站做不到更多。

### 1.2 老師身分
- Firebase Authentication 開「電子郵件／密碼」，建一個老師帳號。
- Firestore 手動建 `mg_admins/{老師 UID}`（`{ ok: true }`）。規則：
  ```
  function isTeacher() { return request.auth != null
    && exists(/databases/$(database)/documents/mg_admins/$(request.auth.uid)); }
  ```
  repo 裡不會出現 UID 或 email。
- `mg_admins`：`allow get: if request.auth.uid == uid`；不能寫（只能從主控台建）。

### 1.3 各集合規則

| 集合 | 讀 | 學生 | 老師 | 細節 |
|---|---|---|---|---|
| `competition`、`scores`（舊站） | 登入者 | 讀寫 | 讀寫 | 不動 |
| `mg_config/settings`、`gift_codes`、其他 | 登入者 | ✗ | 寫 | |
| `mg_config/nw_vote` | 登入者 | update | 寫 | 學生只能動 `v`、`noms`：`request.resource.data.diff(resource.data).affectedKeys().hasOnly(['v','noms'])`（現在學生端可以整份覆寫、清空投票） |
| `mg_round`、`mg_bank` | 登入者 | ✗ | 寫 | |
| `mg_scores/{id}` | 登入者 | create、update | 全部 | **delete 只有老師**（現在任何人都能刪全校存檔） |
| `mg_rooms/**` | 登入者 | 讀寫 | 讀寫 | 組隊房間搬來這裡（§1.7） |
| `mg_nw_runs` | 登入者 | create | 全部 | |
| `mg_nw_flags` | **只有老師** | create（限制內容） | 全部 | 見下 |
| `mg_gift_used/{雜湊}_{班級_座號}` | 登入者 | create | 全部 | 一人一份，用 count 查詢算次數（§1.7）；`hasOnly(['h','id','t'])`，`h` 必填 |
| `mg_clock/{班級_座號}` | 登入者 | 讀寫 | 讀寫 | 只放一個 `t: serverTimestamp()`，算時差用（§1.6） |
| `mg_mail`、`mg_events`、`mg_news` | 登入者 | ✗ | 寫 | |
| `mg_bugboard/{班級_座號}` | 登入者 | ✗ | 寫 | 抓蟲分、隱藏暱稱、回報結果（§7） |
| `mg_admin_log` | 只有老師 | ✗ | create | 老師操作紀錄（§2.4） |
| `mg_admins/{uid}` | 本人 | ✗ | ✗ | |

**`mg_nw_flags` 學生 create 的條件**（不然學生能自己新增一筆「已確認、嚴重 3 分」的回報）：
```
allow create: if request.auth != null
  && request.resource.data.type in ['bug', 'feedback', 'namechg']
  && request.resource.data.get('status', 'pending') == 'pending'
  && request.resource.data.keys().hasOnly(['type','status','docId','cat','text','did','what','view',
       'mk','mon','star','rate','cls','seat','name','oldName','t'])
  && request.resource.data.get('text', '').size() <= 400
  && request.resource.data.get('did', '').size() <= 200
  && request.resource.data.get('what', '').size() <= 200;
// 回饋送出會用同一個 ID 重試：第一次其實寫進去了只是逾時，第二次變成 update。內容完全一樣就放行。
allow update: if isTeacher() || request.resource.data == resource.data;
allow read, delete: if isTeacher();
```
- flags 裡有學生真名，所以**只有老師能讀**。學生端不再讀 flags（§6、§7 改走 `mg_bugboard` 與信箱）。
- **A 版送回報時要拿掉 `claimed: false`**（main 的 `openBugReport()` 現在會帶這個欄位，不在清單裡就會被擋）。

### 1.4 老師登入不能影響學生機
- `teacher.html` 用**具名 app**：`initializeApp(cfg, 'admin')`、`getAuth(adminApp)`、`setPersistence(browserSessionPersistence)`（關分頁就登出）。
  遊戲本體的匿名登入（index.html 的 `signInAnonymously`）**完全不用改**，兩邊的登入狀態分開存。
- 登入畫面有「☐ 記住這台電腦（只在老師自己的電腦勾）」：勾了改用 `browserLocalPersistence`，不然老師每節課開戰前都要重打 email。
- 舊控制台（`#teacher-modal`）的寫入（開戰、題庫、設定、序號、清空成績）改用 admin app 的 `db`：
  打開舊控制台時若 admin app 沒登入，跳出 email／密碼小視窗登入（同樣有「記住這台電腦」）。密碼 `teacher` 那道門保留（只是擋手滑）。
- 舊控制台的**「新世界測試回饋」整塊**（回報審核、抓蟲排行、頒發職業除錯師，main 的 `openNwFeedback()`）換成一顆「到管理頁看回饋與審核」的連結。只改寫入身分是不夠的：它不會寫 `mg_bugboard`、不會寄信，會漏發。

### 1.5 冒名對策
- **這道鎖只擋得住「隨手亂打名字」**：同學都知道彼此的姓名，打對名字就過了。要真的防冒名得有學生帳號，超出這次範圍。
- 比對前先去掉空白、全形轉半形。
- 登入時若雲端存檔的 `name` 跟這次輸入的姓名**不一樣**：
  - 照舊讓他玩（現行行為不變，避免老師改名單時大家進不去）；
  - 但**鎖住信箱、改暱稱**，畫面寫「名字跟上次不一樣，信箱先鎖起來；請找老師」；
  - 寫一筆 `mg_nw_flags/namechg_{班級_座號}`（**固定 ID**，不會每次登入多一筆；`type:'namechg'`、`name`、`oldName`），教師頁「學生」分頁標 ⚠「換過名字」，老師按「沒問題」＝`mg_bugboard/{id}.nameOk = 新名字` 解鎖；
  - 名字改回原本的就自動解鎖。
- 暱稱不開放自由輸入（§8），從源頭消掉「把同學暱稱改成罵人的話」。
- 老師可立刻隱藏任何人的暱稱：`mg_bugboard/{id}.hideNick = true`（只有老師能寫，所有榜單讀這個）。

### 1.6 時間
- 學生可以改電腦時間提早拿到排程的信和活動。進村時寫一次 `mg_clock/{班級_座號}`（`serverTimestamp()`）再讀回來（**不放 `mg_rooms`**：`loadRooms()` 每次打開委託板都讀整個集合），算出 `clockSkew`，之後所有排程判斷用 `Date.now() + clockSkew`。讀不到就用本機時間。
- 活動結束判斷給 **5 分鐘緩衝**：在 `endAt` 前開打、`endAt + 5 分` 前打完的場次照樣算。

### 1.7 因為規則收緊要一起改的程式

| 現在（v3.13.0） | 改成 |
|---|---|
| `openBugReport()` 送回報帶 `claimed: false` | 拿掉（新規則的欄位清單沒有它） |
| 房間存 `mg_config/nwroom_*`（newworld.js `roomId()`／`loadRooms()`） | `mg_rooms/{班級_座號}`，`loadRooms()` 改讀這個集合 |
| 序號兌換對 `gift_codes` 做 `used: increment(1)` | 新增一份 `mg_gift_used/{雜湊}_{班級_座號}`（`{ h, id, t }`，只能 create，同一人第二次 create 會被擋＝不能重複領）；次數上限用 `getCountFromServer(where('h','==',雜湊))` 判斷；教師頁顯示誰領過 |
| `claimBugs()`／`claimAwards()` 讀 flags 再把 flag 標 `claimed` | 刪掉。老師確認回報／頒發時**直接寄信**（§6），學生只領信 |
| 學生端讀自己的回報清單（測試員手冊「我的回報」） | 改讀 `mg_bugboard/{我}.reports`（老師確認時寫入：flag ID、狀態、嚴重度、老師回覆） |
| `mg_scores` 學生可 delete | 舊控制台「清空成績」改用 admin app |
| 舊控制台 `openNwFeedback()`（審核、抓蟲排行、頒發） | 換成連到管理頁的按鈕（§1.4） |
| `NW.bugs` 由 `claimBugs()` 累加 | 從 `mg_bugboard` 同步，**取 `max(本機, 雲端 n)`**，舊玩家件數不會變少、`BUG_REWARD_MAX` 不會算錯 |
| 存檔只有 `nw` 物件 | 最外層多兩個欄位給查詢用：`nwCls`（班級，有進過新世界才寫）、`nwEvDone`（陣列，§4.2） |

### 1.8 上線順序（**很重要**：規則是全站共用的，main 已經上線）

0. **過渡規則**：老師先發布一份「現在的規則＋新集合（`mg_gift_used`、`mg_clock`、`mg_mail`、`mg_events`、`mg_news`、`mg_bugboard`、`mg_admin_log`、`mg_admins`）開放給登入者」。現在的規則本來就全開，這樣不會更不安全；沒有這一步，A 版在等待期間序號兌換和管理頁都會壞（Firestore 沒寫到的集合預設全擋）。
1. **A 版程式**推上 main（要老師同意）：§1.7 全部改完、讀寫都改走新位置；`teacher.html` 上線。
2. 等一天（舊分頁都關掉、學生都載到 A 版）。
3. 老師照 §1.9 建帳號、建 `mg_admins`、**發布正式規則**。
4. 舊資料搬移：教師頁「⚙ 設定 → 一次搬移」：
   - 用**全部已確認的**回報（包括學生已經領過的）和已頒發的 `bugking` 建 `mg_bugboard` 的分數與 `reports`（舊資料沒有 `sev` 算 1 分）；
   - 只有「已確認但還沒領」的轉成獎勵信（固定 ID `bug_{flagID}`／`award_{flagID}`，重按不會多寄）。

### 1.9 老師要做的事（照順序）
1. Firebase 主控台 → Authentication → 登入方式 → 開「電子郵件／密碼」。
2. 使用者 → 新增使用者 → 複製 UID。
3. Firestore → 新增集合 `mg_admins` → 文件 ID＝UID → 欄位 `ok`＝`true`。
4. Firestore → 規則 → **先複製舊規則存檔** → 貼正式的 `firestore-rules.txt` → 發布。（第 3 步一定要在第 4 步前面；過渡規則 `firestore-rules-transition.txt` 在 §1.8 第 0 步就要先貼）
5. 打開 `teacher.html` 登入，看「總覽」有資料。

### 1.10 規則怎麼驗證
- 假 Firebase（`tools/browser-test/mock/fs.js`）**不跑規則**，`where` 也只支援最外層欄位的 `==`。
- 實作時用 Firebase 模擬器＋`@firebase/rules-unit-testing` 寫規則測試（`tools/rules-test/`）。如果雲端環境下載不到模擬器，就改成一份 **Rules Playground 檢查清單**（`docs/RULES-CHECKLIST.md`：每一條「誰、對哪份文件、做什麼、應該過／不過」），老師發布前在主控台的 Playground 逐條按。

---

## 2. 教師管理頁 `teacher.html`

### 2.1 基本
- 新檔 `teacher.html`＋`teacher.js`（ES module）。舊控制台加一顆「🛠 新世界管理頁」連過去。
- 登入：email、密碼。登入後檢查 `mg_admins/{uid}`；不是老師就顯示「這個帳號不是老師帳號」並登出。
- 樣式：`nw-ui.js` 的 `px-panel`／`px-btn`，但以**資訊密度**為主（表格、15px 字）。
- 版面：上方標題列（登入身分、登出、回遊戲）＋左側分頁（手機改上方）＋內容。

### 2.2 分頁

| 分頁 | 內容 |
|---|---|
| 📊 總覽 | 今天上線人數、新世界玩家數、進行中／排程中的活動、待審核回報數、未讀回饋數、⚠ 換過名字的人數；**3 個捷徑**：寄信、開活動、審回報 |
| 👥 學生 | §2.3 |
| ✉ 信箱 | §3.3 |
| 🎪 活動 | §4.4 |
| 📢 公告 | §5.2 |
| 💬 回饋 | §6.1（只有回饋） |
| 🐛 回報與抓蟲榜 | §6.2＋§7.4 |
| ⚙ 設定 | 一次搬移（§1.8）、班級人數覆寫、操作紀錄。（新世界開放方式、通關密語、序號禮物**第一版留在舊控制台**，避免同一個設定兩個地方能改） |

### 2.3 學生
- 讀整個 `mg_scores`（**只在教師頁讀**，學生端不讀，§4.3）。
- 篩選：年級、班級、玩過新世界、關鍵字（姓名／暱稱／座號）、⚠ 換過名字。
- 表格：班級、座號、姓名、暱稱、HR、字元、武器、狩獵場次、勝／敗、最後上線、回報（已確認／送出）。可排序。
- 學生卡：上面那些＋稱號、區域進度、圖鑑、道具、材料、教學、任務、已領的信。
  動作：「寄信給他」「隱藏／恢復暱稱」「名字沒問題（解鎖）」。
- **不直接改存檔**：給東西一律寄信（學生看得到、有領取的感覺、留紀錄）。
- 勾選多人 →「寄信給勾選的人」。

### 2.4 操作紀錄 `mg_admin_log`
- 老師每個寫入動作（寄信、收回、開／改／刪活動、發獎、審回報、加分、隱藏暱稱、改設定）寫一筆 `{ act, target, summary, t }`。
- 設定分頁可以看最近 100 筆。用途：「我上週到底有沒有寄獎給 504？」。

### 2.5 送出前的防呆
- 信件、活動、公告送出前都顯示**學生會看到的樣子**＋一行摘要（例「寄給 504 全班 27 人：🗡 測試者之刃 ×1、🪙 300」）。
- 數量超過平常值（字元 > 1000、回復藥 > 20）要再按一次確認，避免手滑打成 10000。

---

## 3. 信箱

### 3.1 資料：`mg_mail/{ID}`

```js
{
  aud: ['all'] | ['cls:五年級4班', 'cls:五年級5班'] | ['id:五年級4班_5號', ...],   // 一個陣列，一次 array-contains-any 查完
  title: '謝謝你幫忙抓蟲',     // 20 字內
  body: '……',                  // 200 字內
  items: [ { type: 'weapon', key: 'tester' }, { type: 'coins', n: 300 }, { type: 'word', key: 'bugking' }, { type: 'exp', n: 50 } ],
  from: '老師',
  sendAt, expireAt,            // expireAt 0 = 不過期
  t, src: 'manual' | 'event:{活動ID}' | 'bug' | 'award'
}
```
- ID：手動寄的用自動 ID；**系統產生的一律固定 ID**（`ev_{活動ID}_{名次或班級}`、`bug_{flagID}`、`award_{flagID}`），重寄只會覆蓋同一封，不會變兩封。
- 查詢：`where('aud', 'array-contains-any', ['all', 'cls:'+班級, 'id:'+docId])`，再過濾 `sendAt <= 伺服器時間`、未過期。（`array-contains-any` 最多 30 個值，這裡只有 3 個）
- `items.type`：`weapon`（`GIFT_WEAPONS`）、`coins`、`potion`、`exp`（獵人經驗）、`mat`、`word`（`WORDS` 裡老師可頒的詞條，例如 `bugking`）。未知 type 跳過不壞，信上寫「**請按 F5 重新整理再來領**」，這封不標已領。
- **第一版的範本獎勵用武器、稱號、獵人經驗**：`OPEN_STAGE = 1` 時商店沒開，字元和回復藥領了暫時用不到（`applyReward()` 的說明文字也這樣寫）。字元可以給，但範本不主推。

### 3.2 學生端
- 入口：佈告欄旁的**郵筒**（可點、站旁邊按 Enter）＋背包的「✉ 信箱」分頁（UI-ART-SPEC §4：個人資料加分頁）。兩個打開同一個視窗。有沒領的信：郵筒冒 ✉ 與數字、上方按鈕列的背包按鈕加小紅點。
- 已領紀錄 `NW.mail = { [信件ID]: 領取時間 }`（**物件**，合併存檔時不會被整個蓋掉）。
- 領取流程：
  1. 先重讀一次自己的雲端存檔（另一個分頁可能已經領過）。
  2. 已在 `NW.mail` 裡的跳過。
  3. 每個 item 跑 `applyReward()`，`showGift()` 依序秀。
  4. 寫 `NW.mail[ID]`，立刻存檔（不等 800ms 的延遲）。
- 「全部領取」。已領的留著可以重看，30 天後收起來。
- 離線：「現在連不上網路，信箱打不開」。名字不一樣被鎖時：§1.5 的提示。

### 3.3 教師頁「信箱」
- 收件人：全部／班級（多選）／學生（搜尋或從學生分頁帶來）。
- 禮物：一列一個（類型＋數量；武器、詞條用下拉）。
- 預約寄送、有效期限（預設不過期）。
- 預覽與摘要（§2.5）。
- 寄出紀錄：可篩來源；「收回」＝刪掉那封，**已經領的人不會被扣回**，畫面寫清楚。
- 領取狀況：點一封 → 收件人「已領／未領」（從 `mg_scores` 的 `nw.mail` 判斷）。

---

## 4. 活動

### 4.1 類型（第一版做 3 種，第二版 1 種）

| type | 給學生看的名字 | 規則 | 獎勵 | 版本 |
|---|---|---|---|---|
| `boost` | 限時加倍 | 期間打贏魔物：獵人經驗或字元 × `mul`（1.5／2） | 當場多給 | 第一版 |
| `hunt` | 限時討伐 | 期間打倒指定魔物（`mk`、`minStar`）`goal` 隻 | 達標自己領（一人一次） | 第一版 |
| `classwar` | 班級挑戰 | 見 §4.2 | 全班達標自動領 | 第一版 |
| `ranking` | 排行挑戰 | 期間的個人「打倒數」或「進步最多」（跟自己活動前的最佳比） | 結束後老師按發獎 | **第二版**（榮譽碑已有最快／精準排行，先觀察需求） |
| `bugboard` | 抓蟲大作戰 | §7 | §7 | 常駐，內建 |

### 4.2 班級挑戰（老師要的「班級競賽、比班級討伐數」＋公平處理）

研究與審查都指出：兩邊比名次時，輸的那一班信心、表現都會下降；用「平均每人」比，會讓人想排擠打得慢的同學；新世界也不是每個人都進得去。所以班級挑戰是**「全班目標＋同年級排名」**：

- **全班目標（主角）**：每班自己的進度條＝「達標人數 ÷ 全班人數」，達標＝期間打倒 `per` 隻（預設 3）。全班達標率到 `goalPct`（預設 60%）→ **全班每個有參加的人都自動領獎**（學生端判斷，固定鍵 `ev:{ID}`）。不用老師按發獎。
- **同年級排名（配角）**：同年級各班比「達標率」，佈告欄只列**前 3 名**；自己的班不在前 3 就只顯示自己的進度條、**不顯示第幾名**；不列最後一名、不列個人貢獻。第一版沒有「加碼獎」。
- 計算方式（**學生端不讀整個 `mg_scores`，也不需要老師建索引**）：
  - 每位學生自己的進度在 `nw.ev.{ID}.n`。
  - 達標時在自己存檔最外層的陣列 `nwEvDone` 加一筆 `'{活動ID}|{班級}'`。
  - 分子：`getCountFromServer(where('nwEvDone','array-contains', ID+'|'+班))`。
  - 分母：`getCountFromServer(where('nwCls','==',班))`＝**進過新世界的人**（不是全部舊存檔；教師頁可手動覆寫班級人數）。
  - 都是單一欄位條件，Firestore 自動有索引；每開一個活動不用到主控台建索引。
  - 同年級排名：對同年級每班各查一次（一個年級 3～8 班），快取 60 秒。
- **預設值要先模擬**：一週只有一節電腦課、學生中位數一節打 2 場，「每人 3 隻、60% 達標」可能太難。實作前用 `tools/nw-sim/` 跑一次，再定活動期間（建議 2 週）與預設值。

### 4.3 學生端怎麼算
- 進村時讀 `mg_events`：`where('endAt', '>=', 伺服器時間 - 7 天)`，分「進行中」「快開始」「剛結束」，班級不符合的不顯示。
- 每場結束（`finishHunt`）且 `res.valid`：對每個進行中、班級符合的活動更新 `NW.ev[ID]`：
  - `hunt`／`classwar`：`n` 加 1（符合魔物與星級時）；`hunt` 達標 → 領獎、記 `NW.ev[ID].done = 1`。
  - `boost`：直接乘到這場的獵人經驗／字元；結果畫面寫「🎪 活動加倍 ×2」。
- `classwar` 的全班獎：進村、開佈告欄時檢查；達標且自己 `n >= 1` 且沒領過 → 領。
- `NW.ev` 裡結束超過 30 天的刪掉，存檔才不會一直變大。
- 活動被刪掉：學生端找不到就顯示「這個活動取消了」（僅限 `NW.ev` 有紀錄的那個人看到一次）。

### 4.4 教師頁「活動」
- 列表：排程中／進行中／已結束。
- 新增：選類型 → 只顯示該類型的欄位 → 預覽 → 送出。日期用 `datetime-local`。
- **範本**：「本週電腦課經驗加倍」「咕咕鳥大量出沒（打 10 隻）」「班級挑戰（兩週，預設值照 §4.2 模擬結果）」。**不做「週末加倍」**：學生在學校上課才玩，週末加倍只對家裡能玩的人有利。
- **開始後鎖住** `type`、`mk`、`minStar`、`goal`、`per`、`goalPct`；只能改標題、說明、延長 `endAt`、提早結束。
- 進行中：參加人數、各班達標率。
- 已結束：（第二版）`ranking` 的「發獎」流程：
  1. 先把名次快照寫進 `mg_events/{ID}.result`；
  2. 依快照寄信（固定 ID `ev_{ID}_{名次}`）；
  3. 寫 `awarded: true`。中途關掉再按一次，會照同一份快照、同樣的信件 ID 重寄，不會變兩封。
- 「再開一次」：複製成新活動（錯過的人還有機會）。

### 4.5 給孩子的時間壓力要低
- 剩餘時間寫「還有 3 天」「今天結束」，**不倒數秒、最後幾小時不閃紅**。
- 不做「只有這次拿得到」的獎勵；活動獎勵之後可以用「再開一次」或寄信補。

---

## 5. 公告

### 5.1 兩種
1. **改版公告**：現有的 `newworld.js` `NOTICES`（程式裡寫，`NW.seenNotice`，跳一次）。**照舊**，寫法照 `docs/ANNOUNCEMENT-GUIDE.md`。
2. **老師公告**：`mg_news/{ID}` `{ title, body, pin, t }`。第一版只有「置頂」和「刪除」，預約發布與到期放第二版。
   - 新的老師公告也跳一次（`NW.seenNews` 記最新一則的 `t`）；第一次來的人直接記成已讀。

### 5.2 教師頁「公告」
- 新增、編輯、置頂、刪除；預覽。
- 下面唯讀列出最近 3 則 `NOTICES`，讓老師知道學生看到什麼。

---

## 6. 回饋與回報

### 6.1 回饋（獨立，老師要求）
- 表格：時間、學生、魔物、評價、內容；篩選魔物、評價；標「已讀」。上方：每隻魔物三種評價的數量。
- 不跟抓蟲榜、回報混在一起。

### 6.2 問題回報（審核）
- 三區：待審核／已確認／不採用。另有「重複」：
  - **確認**：選嚴重度 小（1 分）／中（2 分）／大（3 分），可寫一句回覆。
  - **重複**：選「跟哪一則一樣」；第一個回報的人算分，後面的人標「也發現了」、**不加分但會收到感謝信**（固定 ID `bug_{flagID}`，0 字元＋一句謝謝）。
  - **不採用**：可寫回覆。
- 按確認時，教師頁一次做三件事（同一個 batch）：
  1. `mg_nw_flags/{ID}`：`status`、`sev`、`reply`、`dupOf`；
  2. `mg_bugboard/{學生}`：`score`、`n`、`firstAt`（達到這個分數時，**這則回報的送出時間**）、`reports[]`（flag ID、狀態、嚴重度、回覆、送出時間）；
  3. `mg_mail/bug_{flagID}`：給學生的獎勵信（照現在的 `BUG_COINS`、`BUG_REWARD_MAX`；超過上限只寄感謝）。
- 學生的「我的回報」改讀 `mg_bugboard/{我}.reports`；`NW.bugs` 從 `mg_bugboard` 的 `n` 同步，**取 `max(本機, 雲端)`**（詞條、測試員任務照舊用 `NW.bugs`）。

---

## 7. 抓蟲榜（常駐活動）

### 7.1 分數
- 抓蟲分＝已確認回報的嚴重度加總＋老師手動加分。只存在 `mg_bugboard`（只有老師能寫），學生改自己存檔改不到。
- 同分比 `firstAt`（**回報送出的時間**，不是老師確認的時間，因為老師常一次批完）。
- 手動加分：`mg_bugboard/{id}.bonus`＋`notes[]`（分數可負、要寫理由）。**老師說的「504 的 5、12、1 號已經抓過 bug」由老師在教師頁自己加**，座號不進 repo。

### 7.2 抓蟲徽章（讓沒上前 10 的人也有目標）
- 抓蟲分到 1／3／5／10 分各得一個稱號詞條（`WORDS` 新增 `bug1`、`bug3`、`bug5`、`bug10`，條件看 `NW.bugScore`，從 `mg_bugboard` 同步）。
- 現有「職業除錯師」（`bugking`）照舊由老師頒發，改成寄信（`type:'word', key:'bugking'`）。

### 7.3 學生看到的榜（佈告欄「🐛 抓蟲榜」分頁）
- 標題「🐛 抓蟲大作戰」，副標「發現遊戲怪怪的地方，到「回報問題」寫下來；老師確認後就會上榜！」
- 讀 `mg_bugboard`：`orderBy('score','desc').limit(10)`（單欄位，自動有索引）＋自己那份。
- 每列：名次徽章（前 3 名金銀銅像素徽章）、`504・5號`、暱稱（沒取或被隱藏顯示「神秘獵人」）、分數、確認件數。
  - 班級短碼：「五年級4班」→「504」（年級數字＋兩位數班號），`nw-data.js` 的 `clsShort()`。
  - **不顯示真名**（`mg_bugboard` 也不存真名，只存班級、座號；暱稱從 `mg_scores` 的 `nw.nick` 讀，被 `hideNick` 的不讀）。
- 自己不在前 10：只寫「再拿 N 分就上榜！」，**不顯示第幾名**。
- 0 分的人：寫「還沒有回報被確認，去找找看吧！」。

### 7.4 教師頁
- 同一個榜＋姓名＋每人的回報明細。
- 手動加分、隱藏暱稱、頒發職業除錯師（寄信）、「寄獎給前 N 名」（開信箱畫面、收件人預填）。

---

## 8. 暱稱

- **從詞庫組合，不開放自由輸入**（跟稱號 `WORDS` 一樣的做法）：前半（形容詞，例：勇敢的、閃電、安靜的、星光…）＋後半（名詞，例：史萊姆、獵人、咕咕鳥、小樹精…），各 30～40 個，放 `nw-data.js` 的 `NICK_A`、`NICK_B`。組出來像「閃電咕咕鳥」。
  - 好處：不會有罵人的話，不用做不雅字過濾；被別人冒名改了也只是換成另一個正常的名字。
  - 詞庫用 GDD §2.3 的白話，不用負面詞，**也不放能拿來取笑人的詞**（例如「笨」「臭」「迷糊的」「胖胖」）。
- 存 `NW.nick = ['a_flash', 'b_coo']`（**詞的 ID**，不存索引：詞庫改順序時大家的暱稱才不會變）；一天最多改 1 次（`NW.nickAt`）。
- 入口：背包人物卡名字下方「✏ 取暱稱」。
- 出現在：抓蟲榜、班級挑戰（不顯示個人，所以實際上只有抓蟲榜）、之後的排行。**舊世界不顯示。**
- 老師隱藏：§1.5。

---

## 9. 佈告欄建築與村莊延伸

### 9.1 佈告欄
- 現在的「📢 佈告欄」按鈕保留（上方按鈕列），**同時**在村莊廣場蓋一座佈告欄建築；兩者打開同一個視窗。
- 建築 `kind: 'notice'`，3×3 格：兩根木柱撐大木板，釘紅（活動）、金（公告）、綠（抓蟲榜）三張紙，頂上小屋簷。用 `PX.wood`／`PX.paper`／`PX.pin` 的畫法。
- 有新東西（沒看過的公告、進行中的活動、抓蟲榜有變動）：木板上方彈跳「！」，上方按鈕也加小紅點。
- 旁邊放郵筒（`decor` `k:'mailbox'`，可點）。
- 視窗（`nw-sheet`，加進 `overlayOpen()` 的範圍）四個分頁：
  - **📢 公告**：老師公告（置頂在前）＋改版公告 `NOTICES`。
  - **🎪 活動**：進行中（大卡片：標題、說明、「還有 3 天」、我的進度條；班級挑戰顯示自己班的達標進度條＋同年級前 3）、快開始（灰卡片）、剛結束（「老師可能會寄獎品到信箱喔」）。
  - **🐛 抓蟲榜**：§7.3。
  - 沒有活動時：「現在沒有活動，先去委託板打怪吧！」。
- 村長台詞加一句：「廣場上的佈告欄會貼活動和公告，記得常常去看！」
- `INTROS` 加一筆佈告欄的第一次介紹。

### 9.2 村莊延伸（**要改 UI-ART-SPEC §4「一個畫面看完」這條，老師已同意延伸**）
- 地圖 **32×22 格**（現在 22×15 的約 2 倍）。不做 4 倍大：學生一節課中位數只打 2 場（GDD §3.1），走路不能吃掉上課時間。
- 分區：

| 區 | 位置 | 放什麼 |
|---|---|---|
| 中央廣場（出生點） | 中央偏南 | 噴泉、**佈告欄**、郵筒、**委託板**、村長——出生點走 3 步內就到委託板與佈告欄 |
| 傳送門 | 正南 | 回舊世界 |
| 學習區 | 西 | 教學大樓、練習稻草人裝飾 |
| 市集 | 東 | 商店、防具店、鐵匠鋪、倉庫（還沒開，轉灰） |
| 高台 | 北 | 星圖台、榮譽碑、組隊酒館 |
| 池塘、樹林 | 角落 | 裝飾 |

- **鏡頭**：
  - 倍率照 UI-ART-SPEC §1 取整數（桌機 3～4、手機 2）；整張地圖不用塞進一個畫面。
  - **沿用現有做法**：main 的 `nw-village.js` 已經用捲動（`scrollLeft`／`scrollTop`，lerp 0.12、`fast` 時直接跳）跟著角色，點擊換算用 `getBoundingClientRect`，捲動下本來就正確。地圖變大後只要讓地圖容器在兩個方向都能捲動、鏡頭兩個方向都跟。**不另寫一套 transform。**
  - 碰到地圖邊緣停住（捲動本來就會停）；「減少動態效果」時直接跳（現有 `fast`）。
  - **第二版**：角色、村民、建築依腳的 y 座標排前後。現在建築是畫死在底圖裡的，要做得先把建築從底圖拆出來，是額外的工，第一版不做。
- **小地圖**：右下角，各區色塊、建築點、自己（閃爍金點）；**點建築直接傳送到門口**（省走路時間）。
- **存檔位置**：`NW.pos` 加 `NW.posV = 2`；`posV` 不是 2 的舊座標一律回出生點。
- **資料**：`VILLAGE` 改新的格數與座標；`doorTile()`、`gate`、`blocked`、`overlayOpen()` 的用法不變。
- **第二版**：區名淡入、畫面邊緣的目標箭頭（現在的地板箭頭先沿用）。

---

## 10. 其他一起處理的

- **多分頁**：用 `BroadcastChannel('typehero')`，第二個分頁打開新世界時提示「遊戲在別的視窗開著，請關掉一個」。（不另做唯讀模式；已領紀錄是物件、領前重讀，已經擋住重複領）
- **新學年／換班**：身分是「班級_座號」，升年級後信件、抓蟲分會斷。GDD 已承諾「一鍵搬移」，**列為第二版**（教師頁「⚙ 設定 → 學年搬移」：對照表，把 `mg_scores`、`mg_bugboard` 的文件搬到新 ID，信件 `aud` 換新 ID）。
- **先補回這個分支的三個修正**（main 還沒有）：標點挑戰擋貼上、頓號鍵位改成 `'`、測試魔物回饋送出重試與錯誤代碼。main 的標點挑戰在 v3.12.0 改版過，要對照新程式重做，不是直接搬。

---

## 11. 實作分工（Sonnet 子代理，照順序，每步跑 `tools/browser-test/`）

| 步 | 內容 | 主要檔案 | 驗收 |
|---|---|---|---|
| 0 | 分支換到 `origin/main` 最新；補回三個修正（§10） | `index.html`、`newworld.js` | nw3、nw4 全過 |
| 1 | 過渡規則＋正式規則＋規則測試（或 Playground 檢查清單） | `firestore-rules-transition.txt`、`firestore-rules.txt`、`tools/rules-test/` 或 `docs/RULES-CHECKLIST.md` | 每條規則有過／不過的案例；main 現在每一個讀寫在正式規則下都列出來是過還是改走新路 |
| 2 | **A 版程式**：§1.7 全部（房間、序號、回報不帶 `claimed`、flags 不再被學生讀、`mg_bugboard`、`NW.bugs` 取 max、`nwCls`／`nwEvDone`、`mg_clock` 時差、admin app、舊控制台寫入改 admin、`openNwFeedback()` 換連結、冒名鎖） | `newworld.js`、`index.html`、`nw-preview.js` | 假 Firebase 下房間、序號、回報、投票照舊能跑 |
| 3 | 信箱＋暱稱 | `newworld.js`、`nw-data.js`、`pixel.js`（郵筒） | 三種收件人、排程、過期、全部領取、未知 type、重複領不到、雙分頁、名字不同被鎖 |
| 4 | 活動（boost、hunt、classwar） | `newworld.js`、`nw-data.js` | 時間外不算、5 分鐘緩衝、班級限制、只算有效場、開始後欄位鎖住、全班獎只領一次 |
| 5 | 佈告欄建築＋視窗四分頁＋抓蟲榜＋徽章 | 新檔 `nw-notice.js`、`pixel.js`、`newworld.js` | 名次、同分、班級短碼、不顯示真名、榜外文字 |
| 6 | 村莊延伸地圖 | `nw-village.js`、`nw-data.js`、`pixel.js` | 每棟建築走得到、鏡頭不出界、點擊座標正確、小地圖傳送、手機寬度、舊座標回出生點 |
| 7 | 教師管理頁 | 新檔 `teacher.html`、`teacher.js` | 非老師帳號被擋、各分頁讀寫、發獎重按不重複、操作紀錄 |
| 8 | 文件 | `HANDOFF.md`、`GDD-NEWWORLD.md`、`UI-ART-SPEC.md`（§4 改寫）、`RELEASE-STAGES.md`、`CHANGELOG.md`、`VERSION_LOG`、`NOTICES`（照 `ANNOUNCEMENT-GUIDE.md`）、`DATA.md` | — |

- 假 Firebase 要擴充：`array-contains-any`、巢狀欄位的 `where`／`orderBy`、`getCountFromServer`、`writeBatch`、具名 app。
- **推送**：都推到 `claude/gracious-pasteur-773n2t`；上 main 要老師同意；規則發布照 §1.8 的順序。

---

## 12. 參考做法（2026-11-16 查的資料）

| 來源怎麼說 | 用在哪 |
|---|---|
| 營運工具要一開始就規劃；給非工程師用的內容管理層（[Practical Game Design](https://subscription.packtpub.com/book/game-development/9781803245157/14/ch14lvl1sec90/tools-and-setup)）；上線前先比對設定（[Metaplay](https://docs.metaplay.io/liveops-dashboard/introduction-to-the-liveops-dashboard)） | §2.5 送出前預覽與摘要 |
| GM 動作留紀錄、定期回顧；常用動作做捷徑，不要把畫面堆滿（[Roblox 論壇](https://devforum.roblox.com/t/redefining-the-admin-suite-what-do-we-actually-need-in-2026/4242695)） | §2.4 操作紀錄、§2.2 總覽捷徑 |
| 獎勵放信箱，每筆發放有唯一鍵，領取是一次性狀態（[bugnet](https://bugnet.io/blog/how-to-prevent-duplicate-reward-grants-from-retries)、[Heroic Labs Mailbox](https://heroiclabs.com/docs/hiro/concepts/mailbox/)）；原神、Warframe 都出過重複發獎事故（[ClutchPoints](https://clutchpoints.com/gaming/genshin-impact-accidentally-gave-out-double-rewards)、[Warframe](https://devtrackers.gg/warframe/p/3ffc01e8-psa-duplicate-twitch-drops-script)） | §3.1 固定信件 ID、§4.4 先快照再寄 |
| 活動分「限時比排名」和「先達標就拿」（[Heroic Labs Event Leaderboards](https://heroiclabs.com/docs/hiro/concepts/event-leaderboards/llm.md)） | §4.1 |
| 兒童遊戲要評估限時活動的「怕錯過」壓力（[英國 ICO](https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/2023/02/new-guidance-to-industry-issued-for-game-developers-on-protecting-children)） | §4.5 |
| 排行榜對成績弱的學生可能造成挫折；兩隊對抗時輸的那隊表現、信心都下降（[GaLA 2020](https://trepo.tuni.fi/bitstream/10024/130150/1/GaLA_Conf_2020_paper_leaderboard.pdf)、[ECGBL](https://papers.academic-conferences.org/index.php/ecgbl/article/download/1593/1652/6517)、[INFORMS](https://pubsonline.informs.org/stoken/default+domain/IAC-EDU/full/10.1287/ited.2019.0227)） | §4.2 全班目標為主、只列前 3、§7.3 榜外不顯示名次 |
| 抓蟲計分看品質不看數量、同一個問題只算第一個、有里程碑（[HackerOne](https://docs.hackerone.com/en/articles/9145220-reputation-milestone-swag)、[HackenProof](https://docs.hackenproof.com/bug-bounty/reports-basics/points-guide)、[QuillAudits](https://academy.quillaudits.com/bug-bounty/grading-system)、[arXiv 2009.10158](https://arxiv.org/pdf/2009.10158)） | §6.2 重複、§7.2 徽章 |
| 俯視地圖：鏡頭跟著角色、碰到邊緣停住；依 y 座標排前後（[Godot 論壇](https://godotengine.org/qa/5544/organization-of-the-world-in-a-zelda-like-game)、[gemini-fantasy](https://jorge-d-robles.github.io/gemini-fantasy/08-part-ii-review.html)） | §9.2 |

---

## 13. 變更紀錄

### v2 → v3（第 2 輪審查）
- flags 規則：A 版拿掉 `claimed`、加 `namechg`／`oldName`、`did`／`what` 長度上限。
- 上線多一個第 0 步「過渡規則」，A 版在舊規則下才不會壞。
- 舊控制台的回報審核／頒發整塊換成連到管理頁（只改身分會漏發）。
- 班級達標改用最外層 `nwEvDone` 陣列＋`array-contains` 計數、分母用 `nwCls`；不用每個活動建索引。預設值先用 `nw-sim` 模擬。
- 時鐘文件改放 `mg_clock`。
- 搬移用全部已確認回報建分數；`NW.bugs` 取 max。
- 冒名鎖寫清楚只擋得住亂打、固定 ID、改回原名自動解鎖。暱稱存詞 ID、拿掉可取笑人的詞。
- 範本拿掉週末加倍；自己的班不在前 3 不顯示名次；老師可「記住這台電腦」。
- 鏡頭沿用現有捲動做法；y 排序移到第二版。
- 刪：班級挑戰加碼獎、設定搬到管理頁、第二分頁唯讀模式。

### v1 → v2

- 基準改成 main v3.13.0：佈告欄按鈕、`NOTICES`、職業除錯師已存在，改成延伸它們；刪掉 v1 的「`VERSION_LOG` 加 `nw` 欄位」。
- 安全（專家審查「必改」8 項全收）：flags 學生只能新增 pending、只有老師能讀；`mg_scores` 刪除只有老師；冒名鎖；上線順序 A 版→規則；物件型已領紀錄＋領前重讀＋雙分頁偵測；學生端不讀整個 `mg_scores`；老師用具名 app＋session 登入；發獎先快照、固定信件 ID。
- 簡化：收件人合併成 `aud` 陣列；`ranking` 移到第二版；班級對抗改成「全班目標＋同年級前 3」；公告預約／到期、小地圖尋路、區名淡入、邊緣箭頭移到第二版；學生卡「最近 10 場」刪除（沒有程式寫 `mg_nw_runs`）。
- 暱稱改成詞庫組合；序號改成一人一份；伺服器時差＋5 分鐘緩衝；活動開始後鎖欄位；地圖改 32×22、出生點旁就是委託板與佈告欄、小地圖可傳送。
- 確認回報直接寄信，取代 `claimBugs()`／`claimAwards()`。

---

## 14. 待老師決定（有預設值，沒回覆就照預設）

1. **排行挑戰**（你提的「排行榜挑戰」）延到第二版，先做全班目標型的班級挑戰？（預設：是）
2. 班級挑戰的預設值：先用模擬決定（初步：兩週內每人打 3 隻算達標、全班 60% 達標就全班有獎）？（預設：是）
3. 抓蟲分：小 1／中 2／大 3、重複不加分但寄感謝？（預設：是）
4. 暱稱用詞庫組合（不能自己打字）？（預設：是）
5. 村莊 32×22（約現在 2 倍），小地圖可以點了直接傳送？（預設：是）
6. 名字跟上次不一樣時，信箱先鎖、要老師在管理頁按「沒問題」才解開（改回原名自動解開）？（預設：是）
7. 舊控制台的「新世界測試回饋」整塊改成連到管理頁（審核、抓蟲榜、頒發都到管理頁做）？（預設：是）
8. 上線要你做 3 次 Firebase 主控台操作：先貼過渡規則 → 隔天建老師帳號與 `mg_admins` → 貼正式規則。可以嗎？（預設：是）
