# 雲端資料結構（`mg_scores`）與局外成長的前置

這份文件回答兩件事：**Firestore 規則要不要改**、**要做局外成長還缺什麼資料**。
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

## 2. Firestore 規則要不要改？**不用。**

`firestore-rules.txt` 裡 `mg_scores` 寫的是

```
allow read, create, update, delete: if request.auth != null;
```

**完全不看欄位名稱**，所以遊戲這邊每次新增欄位（`bestLevel`、`bestAcc`、
`last*`…）都不用回頭改規則、也不用重新發布。

要注意的只有一種情況：如果之後改用那份「加強版」規則（規則檔尾巴的
註解區），那份是**逐欄檢查**的，遊戲加欄位就得跟著維護。那份註解裡原本
寫的 `request.resource.data.damage is number` 有個坑——練習的那筆根本沒有
`damage` 欄位，這條會把**全部練習存檔擋掉**，已經在註解裡改成「有才檢查」。

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
2. **現在的規則擋不住作弊**。匿名登入的 uid 跟「班級_座號」對不起來，
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
