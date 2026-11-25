# 規格：商店（先做好、仍關著）＋委託板刷新改版

> 2026-11-25。給 Sonnet 照做。只動本文件列出的檔案；**不改 `OPEN_STAGES`、不寫任何對外公告**（`VERSION_LOG`／`NOTICES`／`TYPEHERO_UPDATES` 等商店真的開放那一版再寫）。
> 數字來源：`node tools/nw-sim/bal2b-term.mjs --rules v2 --budget 15 --floor 1 --flow pick --stars-per-day 2 --reward v23 [--exchange C,0,L]`（真實學生手速、每組約 284 人×3、一學期 14 節）。`--exchange C,0,L`＝「每節下課前用 C 字元買 1 個綠材料、一天最多 L 次、先留 150 字元給強化」，就是本文件的商店買綠材料。

**B 部分的假設（老師原話「打完全部自動補滿」＋2026-11-25 補充「手動刷新也補滿整板」）**：打贏的單子**留在板上蓋「完成」章，不單張補**；板上每張都蓋章才整批換新；手動「刷新」把**還沒完成、不是目標單**的單子一次全換。刷新和「打完全部」走同一個 `refillAll`，**不再有「單張換一張」**。
若老師其實要「打贏就補單張」：只改 `afterRun` 打贏那段（§B3），換回舊寫法 `b.slots[key] = emptySlot(); return repair(nw, b, now, events, tlim, 1, [key]);`，蓋章與「全部完成」判斷拿掉，刷新不用動。

---

## A. 商店

### A0. 一般學生的字元（模擬，中位）

| 組 | 一學期收入 | 打造＋強化花掉 | 期末剩（＝結餘） | 每節收入／每節結餘 |
|---|---|---|---|---|
| 極慢 | 917 | 880 | 16 | 66／1 |
| 慢 | 2,416 | 2,350 | 46 | 173／3 |
| 中 | 4,034 | 3,580 | 441 | 288／32 |
| 快 | 5,788 | 4,000 | 1,931 | 413／138 |

慢組沒有多的字元，商店不會影響他們；要吸的是中、快組的結餘。

### A1. 定價與每日上限（定案建議）

| 品項 | 價格 | 每天（`twDay`）上限 | 誰買得到 |
|---|---|---|---|
| 綠材料（打倒過的魔物的綠材料，自己選哪一種） | **200** | **全部綠材料合計 1 個** | 那隻魔物 `nw.dex[mk] > 0` |
| 灰材料（同上，灰色） | **40** | **合計 3 個** | 同上 |
| 改名卡 | 300（已定） | 1 張 | 所有人 |
| 藍材料（炎牙） | **不賣**（`SHOP.blue = false`） | — | — |
| 回復藥 | **不賣**（戰鬥用法還沒做） | — | — |

模擬（綠材料，每天 1 個）：

| 設定 | 期末剩 中／快 | 吸走結餘 中／快 | 戰力中位 中／快 | 進森林 |
|---|---|---|---|---|
| 不開商店 | 441／1,931 | — | 152／156 | 極慢 63%、其他 100% |
| 150 字元、1 個/天 | 211／1,135 | 52%／41% | 150／156 | 不變 |
| **200 字元、1 個/天** | **238／982** | **46%／49%** | **150／156** | **不變** |
| 150 字元、2 個/天 | 194／561 | 56%／71% | 150／156 | 不變 |
| 200 字元、2 個/天 | 190／342 | 57%／82% | 150／156 | 不變 |

為什麼：
- **200×1**：中、快組都落在目標 30～50%；2 個/天會超過（快組 82%），150 會讓中組超過 50%。極慢、慢組期末剩 16／44，跟沒開一樣。
- **不會繞過進度**：戰力中位不變（150～156，上限受圖紙、+5、裝備顏色管），進森林比例、第幾節進森林都不變。綠材料只能買「打倒過的魔物」的，藍材料不賣（藍是炎牙刀、炎狼皮甲的門檻，模擬期末只剩 0～3 個，是最緊的資源）。圖紙、等級、一天 2 個新星級都照舊。
- **不會取代打怪**：中組一場約 107 字元＋1～2 個綠材料；200 字元≈2 場的字元只換 1 個，打怪永遠比較划算。
- **灰 40**：模擬灰材料期末都有剩（4～66），買灰幾乎只是「想做某件灰裝備差 1、2 個」時用；40＝灰裝備強化 +0→+1 的 2 倍，對慢組（每節結餘 1～3）買不起也不需要。模擬沒有算買灰（灰不缺，影響極小）。
- **藍「視情況」**：之後藍材料若期末堆積（>10 個中位），才考慮開，建議 500、一週 1 個；現在不開。
- 商店**不賣**：經驗、星星、會讓別人看起來更強的東西（稱號、外觀特效）、任何紫色以上的東西。

常數放 `nw-data.js`（取代現在的 `SHOP_ITEMS`，舊 `SHOP_ITEMS` 刪掉、引用處改用 `SHOP`）：
```js
/* 商店（docs/SPEC-SHOP-BOARD2.md A1）：價格與上限是模擬定的，要調先重跑 bal2b-term.mjs --exchange */
export const SHOP = { gray: { price: 40, day: 3 }, green: { price: 200, day: 1 }, blue: false, renameCard: { price: 300, day: 1 } };
```

### A2. 開關：獨立階段 `'3s'`

- `VILLAGE.buildings` 的 `shop`：`wip: '3b'` → **`wip: '3s'`**，加 `act: 'shop'`；`text` 改成「用字元買材料和改名卡。」（舊字寫「回復藥、賣材料」，兩樣都沒有）。
- `newworld.js` 的 `enterBuilding` 對應表加 `shop: () => openShop(ctx)`。`buildingOpen` 已經會看 `wip`：`OPEN_STAGES` 沒有 `'3s'` 時照舊灰著、寫施工中。**`OPEN_STAGES` 不動**。
- 測試用 `window.__NW_STAGES__ = ['1','2b','3s']` 打開。
- 為什麼不用 3b：3b 還綁防具店、珊瑚海岸、熔岩火山，都還沒做；商店只靠鐵匠鋪的材料，2b 開了就能開。建議 2b 開放後再開 3s（材料沒地方用，買了沒意義）。
- `docs/RELEASE-STAGES.md` 要改：「一眼看」表在 3a 與 3b 之間加一列 `| **3s** | 商店（買灰、綠材料、改名卡） | 🔶 做好、沒開放 | 2b 先開；老師決定日期後把 '3s' 加進 OPEN_STAGES |`；3b 那列拿掉「商店」；營運功能表「改名卡」那格的「第 3b 段」改「第 3s 段」；加一段「第 3s 段開放前檢查」：nw26 全過、手機走一遍、老師在真 Firebase 買一次看 `mg_scores.nw.shop`。
- 同步：`docs/GDD-NEWWORLD.md` §16.2 表格上方加一行「第一版商店只賣灰／綠材料與改名卡，價格見 SPEC-SHOP-BOARD2.md A1；本表其餘品項是之後的規劃」；`docs/SPEC-STAGE2.md` 第 51 行「賣材料」那條加註「改成只買不賣（2026-11-25 老師決定）」。

### A3. 畫面與流程（新檔 `nw-shop.js`，照 `nw-forge.js` 的寫法；UI 用 `px-panel`／`px-btn`，規範見 `docs/UI-ART-SPEC.md`）

```
┌ px-panel ─ 🏪 商店 ──────────── 🪙 1,234 字元 ┐
│ [材料] [道具]                    （px-btn 分頁）│
│ ┌ px-panel in ┐ ┌──────┐ ┌──────┐            │
│ │ 圖示(PX)    │ │ ...  │ │ ...  │  一格一種   │
│ │ 柔軟絨毛 🟩 │                              │
│ │ 有 3 個      │                              │
│ │ 🪙 200       │                              │
│ │ [買 1 個]    │                              │
│ └─────────────┘                              │
│ 今天還能買：綠 1 個、灰 3 個                    │
└────────────────────────────────────────────────┘
```
- 「材料」分頁：依 `MONSTERS` 的 `drops` 產生；只列 `dex > 0` 的魔物；沒打倒過的魔物整格不列（不要出現「打倒 xx 才能買」的灰格，避免孩子以為要花錢解鎖）。藍色不列。
- 「道具」分頁：改名卡一格（有幾張、價格）。
- 每格下面一行：「用在：咕咕帽、羽毛護手」（用 `nw-forge.js` 的 `matSources`／配方反查，沒地方用的寫「現在還用不到」）。
- 按鈕狀態與文字：可以買「買 1 個」；字元不夠「還差 X 字元」（灰掉）；今天買滿「今天買完了，明天再來」（灰掉）。
- 一次只買 1 個；**不用確認框**（最多 200 字元、每天 1 次，買錯傷害小），買完 toast「買到了 柔軟絨毛 ×1！」，頂端字元數字跳動。
- 圖示用 `PX`（`pixel.js`），不放圖檔。手機 390 寬：格子一排 2 個，按鈕整個看得到。

### A4. 存檔與購買邏輯

新欄位 `NW.shop`（`defaultNw` 加 `shop: { day: 0, buy: {}, spent: 0, n: 0 }`；`normalizeNw` 加 `o.shop = normalizeShop(d.shop)`）：
```js
shop: { day: 20782,               // 上次買東西的 twDay
        buy: { coo_down: 1, frog_slime: 2, renameCard: 0 },   // 這天每種買了幾個（物件，值是整數）
        spent: 1240,              // 總共花掉的字元（教師頁看）
        n: 9 }                    // 總共買了幾次
```
- `normalizeShop`：不是物件→預設；`day`、`spent`、`n` 整數 ≥0；`buy` 只留 `MAT_INFO` 有的 id 或 `renameCard`，值整數 0～99。沒有 `undefined`、沒有陣列。
- **換日不刪鍵**：`pushCloud` 是 `setDoc(merge:true)`，本機刪掉的鍵雲端刪不掉。換日時把 `buy` 裡**每個鍵設成 0**、`day` 改今天，不要寫 `buy = {}`。
- 今天買了幾個：`shop.day === twDay(now) ? buy[id] : 0`；某顏色合計＝`buy` 裡同顏色（`MAT_INFO[id][1]`）加總。
- 純函式（`nw-shop.js`，node 可測）：
  - `shopList(nw, now)` → `[{ id, kind: 'mat'|'item', color, price, have, left, ok, why }]`，`why` ∈ `''|'coins'|'limit'`。
  - `shopBuy(nw, id, now)` → `{ ok: true, nw: 新物件 }` 或 `{ ok: false, why: 'coins'|'limit'|'locked'|'blue' }`。只改 `coins`、`mats`/`items`、`shop`，不碰別的欄位。
- 防重複點擊：按下就把所有購買按鈕 `disabled`，等 `saveNwNow()` 結束才重畫。
- 兩個分頁互蓋：購買前比照 `syncGear`：先讀雲端，雲端 `savedAt` 比較新就先換成雲端的 `NW`，再用 `shopBuy` 判斷上限與字元，然後 `saveNwNow()`。最壞情況（兩邊同時按）是多買 1 個，字元也照扣，不會無中生有。
- `firestoreOk(NW.shop)` 在測試裡每步檢查。

### A5. Firestore 規則
**不用改**。`mg_scores` 是整份存（`firestore-rules.txt` 第 78～81 行 `allow create, update: if signedIn()`，`nw` 沒有欄位白名單），`NW.shop` 跟 `NW.board` 一樣放在 `nw` 底下；不新增集合。`tools/rules-test/` 不用加測試。

### A6. 教師端（不新增大功能）
- `teacher/tab-students.js` 的學生存檔摘要加一行：「🏪 商店：總共花 X 字元、買 N 次；今天買了：柔軟絨毛 1」（讀 `nw.shop`，沒有就不顯示）。
- 補發／退款：用現有信箱禮物（`teacher/gifts.js` 的材料、字元、改名卡），不加新種類。

### A7. 測試：新增 `tools/browser-test/nw26.test.js`（假 Firebase）
1. 預設 `OPEN_STAGES`：商店灰著、點了進不去（跟現在一樣）。
2. `__NW_STAGES__ = ['1','2b','3s']`：進得去；只列 `dex>0` 魔物的灰／綠材料；沒有藍、沒有回復藥；改名卡 300。
3. 買綠：字元 −200、那個材料 +1、`shop.buy[id]===1`、`spent`、`n` 增加；別的綠也灰掉，寫「今天買完了，明天再來」。
4. 灰買 3 個後第 4 個灰掉；字元不夠時寫「還差 X 字元」，按了不扣。
5. 連點 5 下「買 1 個」只成交 1 次。
6. 重整後上限還在；把時間推到隔天（`twDay`+1）上限回來，`buy` 的鍵還在、值是 0。
7. 兩個分頁：A 買了綠，B（舊資料）再買 → B 先同步、被拒絕（`limit`）。
8. 每步 `firestoreOk(NW)`；`normalizeNw` 吃壞資料（`shop: []`、`buy` 有陣列、負數、未知 id）都正常。
9. 純函式（node）：`shopBuy` 不改傳入的 `nw`；鎖住的魔物、藍材料回 `locked`／`blue`。
10. 手機 390：格子、按鈕完整看得到。
既有 `nw1`～`nw25`、`t1`～`t7`、`seg0` 全過（商店關著時畫面不變）。

---

## B. 委託板刷新改版（`BOARD_ROT` 旗標之下）

### B1. 新規則
1. 板上一般 4 張（主線＋活動兩張目標時 5 張，`roleList` 不變）。
2. **打贏**：那張蓋「✅ 完成」章，留在原位，不能再打、不能刷新。輸、撤退、逃走、不算數照舊（`m`、`lose` 規則不變）。
3. **全部完成**（板上 🔥 挑戰單以外、每張有單子的格子都蓋章；挑戰單沒蓋也算，2026-11-25 老師決定）→ 自動 `refillAll(…, 'all')`：章全部撕掉、照現在的進度排一整批新的。
4. **刷新**（手動）：把「沒蓋章、不是目標單（`goal0`／`goal1`）」的單子**全部**換新（`refillAll(…, 'swap')`）。蓋章的、目標單留著。
   - 每天第 1 次免費，第 2 次 40 字元，第 3 次 80 字元，**一天最多 3 次**（`BOARD.swapCost = [0, 40, 80]`）。
   - 沒有可以換的（全是蓋章或目標單）→ 按鈕灰掉、不扣次數、不扣錢。
5. 角色與上限照舊：補的時候用 `repair` 的角色規則；🔥 挑戰最多 1 張、最多高 1 星、預估勝率 ≥ 55%（`BOARD.hardP`）；連輸 2 次換最好打的（`loseSoft`）。
6. **主線不卡住**：打贏後若主線的新目標不在「沒蓋章」的單子裡，而且有空格（`a`～`e` 裡 `id` 空的），把新目標單直接貼進那一格（`k: 'goal0'`），不算刷新。沒空格就等全部完成（最多再打 3 張）。

為什麼刷新不會變成逃避難關：🔥 那一格刷新後**還是 🔥**（同一顆新星，只是換一隻魔物），目標單不能換；換掉的單子記在 `out`，當天不會又出現。價格：慢組每節結餘只有 1～3 字元，實際上一天只用免費那次（跟現在一樣）；快組每節結餘 138，可以多刷 1～2 次，但 40＋80＝120 約等於一場的字元，不會無限換。一天最多 3 次，擋「一直換到出現想要的」。

### B2. 資料欄位（`NW.board`，`v` 維持 1，不重排）
| 欄位 | 現在 | 改成 |
|---|---|---|
| `swap` | 上次換一張的 `twDay` | **意思不變**：上次刷新的 `twDay` |
| `swapN` | 沒有 | 今天刷新了幾次（0～3）；換日歸 0 |
| `swapCoin` | 沒有 | 刷新總共花的字元（教師頁看） |
| `out` | 字串（今天換掉的那張） | **平的字串陣列**（今天刷新換掉的，最多 8 個）；換日清成 `[]` |
| `slots.x.ok` | 沒有 | 0／1：蓋章了沒；空格是 0 |

`normalizeBoard`（`nw-data.js`）：
- `swapN: 'swapN' in d ? Math.min(3, int(d.swapN)) : (int(d.swap) > 0 && int(d.swap) === int(d.day) ? 1 : 0)`（舊存檔今天換過＝已用 1 次）。
- `swapCoin: int(d.swapCoin)`。
- `out`：字串且合法 → `[d.out]`；陣列 → 只留合法、不重複的前 8 個；其他 → `[]`。
- slot：`ok: int(s.ok) ? 1 : 0`；`empty()` 加 `ok: 0`。舊存檔沒有 `ok` → 全部 0（沒蓋章），不會突然整批換。

### B3. `nw-board-rot.js` 要改的函式（參考實作 `tools/nw-sim/board.mjs` 同步改，nw24 逐字比對要繼續成立）
- `BOARD`（`nw-data.js`）加 `swapCost: [0, 40, 80], outN: 8`；`swapMax` 用 `swapCost.length`。
- `emptySlot()` → `{ id: '', k: '', at: 0, m: 0, ok: 0 }`。
- `pickBoard`：初始 `swap: 0, swapN: 0, swapCoin: 0, out: []`。
- `fillOne`：`q.id !== ctx.board.out` 改成 `!(ctx.board.out || []).includes(q.id)`。
- `repair(nw, board0, now, events, tlim, max, force = [])`：**蓋章的格子先認領自己存的角色 `slots[k].k`**（從 `roles` 拿掉一個同名角色），不算 misfit、步驟④不撕；其餘不變。
- `afterRun(nw, board, run, now, events, tlim)`（簽名不變）打贏那段改成：
  `done++、last、recent、(wasHard → lose=0)`，`b.slots[key].ok = 1`；
  `if (allDone(b)) return refillAll(nw, b, now, events, tlim, 'all');`
  否則 `postGoal(nw, b, now, events, tlim)`（B1 第 6 條），回 `{ board, changed }`（沒貼新單時 `changed: []`）。
  打的單子已蓋章（兩個分頁）→ 什麼都不變。
- 新增 `allDone(nw, board, tlim)`：有單子的格子 ≥1，而且 🔥 挑戰單（`band` 現算，不看存的 `k`）以外全部 `ok === 1`。板上只剩挑戰單時，要它也蓋章才算（不然補新批又只有挑戰單，會一直補）。
- 新增 `refillAll(nw, board, now, events, tlim, why)` → `{ board, changed, refused?, cost }`，`why` ∈ `'all'|'swap'`：
  - `'all'`：所有格子清成 `emptySlot()`，`repair(nw, b, now, events, tlim, Infinity, BOARD.keys)`，`cost: 0`。
  - `'swap'`：`today = dayOf(now)`；`n = b.swap === today ? b.swapN : 0`；`n >= swapCost.length` → `refused: 'used'`；
    `force = keys.filter(k => slot.id && !slot.ok && !/^goal/.test(slot.k))`，空 → `refused: 'none'`；
    `b.out = [...b.out, ...force 的 id].slice(-BOARD.outN)`，`repair(…, 0, force)`；結果跟原本一模一樣 → `refused: 'none'`（不扣）；
    成功：`b.swap = today; b.swapN = n + 1; b.swapCoin += cost`，`cost = BOARD.swapCost[n]`。
  - **不碰 `nw.coins`**：扣字元在 `newworld.js`（純函式好測）。
- 新增 `swapState(nw, board, now)` → `{ ok, cost, left, why: ''|'used'|'none' }`（按鈕用；`'coins'` 由 `newworld.js` 比 `nw.coins` 判斷）。
- 刪掉 `swapCard`（`newworld.js`、`nw-board.js`、`board.mjs`、測試的 import 一起改）。
- `ensureBoard`：換日那段多做 `swapN: 0, out: []`；蓋章的格子保留（`repair` 已不撕）；同一天若 `allDone` → `refillAll('all')`（兩分頁互蓋時會發生），`why: 'refill'`。
- `boardView`：每張卡多帶 `done: !!s.ok`；另外回 `progress: { ok, total }`。

`newworld.js`：`env.onSwap()`（不帶 key）→ 先比雲端 `savedAt`（同 `viewBoard`）→ `swapState` → 要錢的先跳確認 → `nw.coins >= cost` 才 `refillAll('swap')` → `NW.coins -= cost` → `saveNwNow()`；按鈕在存好前 `disabled`（防連點）。打完一場的 `afterRun` 呼叫點不變。

### B4. 畫面文字（`nw-board.js`）
- 「換一張」按鈕從單子詳細區移到**看板上方**，`data-swap` 屬性保留：
  - 免費：「🔄 刷新（今天免費 1 次）」
  - 要錢：「🔄 刷新（🪙 40）」，按了跳 `px-panel` 小視窗：「花 40 字元，把還沒完成的單子全部換新？📌 任務單會留著。」［換新］［不要］
  - 字元不夠：「🔄 刷新要 40 字元」（灰）
  - 用完：「🔄 今天刷新完了，明天再來」（灰）
  - 沒得換：「🔄 沒有可以換的單子」（灰）
- 看板上方進度：「完成 2／3，🔥 挑戰單不用打也行，其他都完成就送來新的一批！」（分母與完成數都不含挑戰單）
- 蓋章的卡：卡片上蓋紅色像素「✅ 完成」章（`PX` 畫，斜 10°），卡片變暗；點了右邊寫「完成了！把其他單子打完，就會送來新的一批」，「狩獵」按鈕灰掉。
- 全部完成：toast「🎉 全部完成！新的委託單送來了」，新的一批用現有「貼上去」動畫（`changed` 全部格子）。
- 刷新後：被換的格子播「貼上去」動畫；toast「換好了！」。
- 舊字「換一張」「今天還能換 1 次」「明天才能再換」「任務要用，不能換」全部拿掉（目標單在新畫面本來就不會被刷）。
- `docs/SPEC-BOARD-ROTATION.md`：§2.2 表「打贏」列、§2.3 整節、§5.1 的 `swap`／`out`／slot 改成指向本文件 B；§9 公告草稿的「換一張」字樣同步（只改草稿，不發）。

### B5. 測試
**`nw24.test.js`（純 node）要改的斷言**：
- 第 43 行「打贏補單」：改成 `a.changed.length === 0`、那一格 `ok === 1` 且 `id` 不變、`done === 1`、`last`、`recent[0]` 照舊。
- 第 84～90 行逐字比對：`swapCard` 換成 `refillAll(…,'swap')`；另外加「把板上全部打贏 → `refillAll('all')`」兩邊相同（`board.mjs` 先同步改）。
- 第 119～123 行「換一張」：改成——第 1 次 `cost 0`、`swapN 1`、未蓋章非目標的全部換、目標單與蓋章的不動、`out` 含被換的 id；第 2 次 `cost 40`、第 3 次 `80`、第 4 次 `refused: 'used'`；隔天 `swapN` 歸 0。
- `import` 行把 `swapCard` 換成 `refillAll, swapState, allDone`。

**`nw25.test.js`（畫面）要改的**：
- 第 139～143 行「打贏挑戰單：撕掉、補一張」→ 板上還是 4 張、`hard.id` 還在且有「✅ 完成」章、「狩獵」灰掉。
- 第 173～192 行「換一張」整段改成刷新：免費那次寫「今天免費 1 次」、按了未完成非目標的都換掉、目標單還在；第 2 次跳確認、扣 40 字元；字元設 10 時按鈕灰、寫「刷新要 40 字元」；第 3 次後「今天刷新完了」，離開再進來還是灰。
- 第 326～327 行手機：「換一張」字樣改「刷新」，按鈕在看板上方也要完整看得到。
- 第 76 行（旗標關沒有 `[data-swap]`）不變。

**新增 `nw27.test.js`**（B 的新行為）：
1. 4 張全部打贏（假結果）→ 第 4 張打完自動換一整批，章都不見，`changed` 是全部格子，`done === 4`。
2. 舊存檔（`swap === 今天`、`out` 是字串、slot 沒 `ok`）讀進來：`swapN 1`、`out` 變陣列、下一次刷新要 40。
3. 主線目標打贏後，新目標貼進空格（B1-6），刷新不會動到它。
4. 刷新 100 個隨機進度：板上 🔥 永遠 ≤1、最多高 1 星、勝率 ≥55%（同 nw24 §6.2 的檢查），🔥 那格刷新後還是 🔥。
5. 連點刷新 5 下只成交 1 次、字元只扣一次。
6. 兩個分頁：A 打完最後一張已補新批，B 舊資料打開 → 同步後 `ensureBoard` 不再重補。
7. 每步 `firestoreOk(NW.board)`；`out` 是平的字串陣列。

旗標關（`__BOARD_ROT__ = false`）：既有測試全過、畫面跟現在一樣。

---

## 實作順序（給 Sonnet）
1. `nw-data.js`：`SHOP`、`BOARD` 新常數、`normalizeBoard`／`normalizeShop`、`defaultNw.shop`、`shop` 建築 `wip:'3s'` 與 `act`。
2. `nw-board-rot.js`＋`tools/nw-sim/board.mjs`（B3）→ 改 nw24、跑 `node tools/nw-sim/board.mjs` 確認輸出只差刷新相關。
3. `nw-board.js`、`newworld.js`（B3 尾、B4）→ 改 nw25、新增 nw27。
4. `nw-shop.js`、`newworld.js` 的 `enterBuilding`、`teacher/tab-students.js`（A3～A6）→ 新增 nw26。
5. 文件：`RELEASE-STAGES.md`、`GDD-NEWWORLD.md` §16.2、`SPEC-STAGE2.md`、`SPEC-BOARD-ROTATION.md`、`HANDOFF.md`。
6. `tools/browser-test/` 全部跑過。**不推 main、不改 `OPEN_STAGES`、不寫公告。**

## 待老師決定
1. ~~「全部完成」要不要包含 🔥 挑戰單？~~ **已決定（2026-11-25）：不包含**。挑戰單以外都蓋章就整批換新；挑戰單沒打也一起換掉。
2. 商店綠材料 200 字元、一天 1 個（中、快組吸走約 46%／49%）可以嗎？想吸多一點可改一天 2 個（快組吸 82%）。
3. 刷新價格 免費／40／80、一天 3 次可以嗎？
