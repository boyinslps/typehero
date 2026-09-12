# v2.0.0 施工清單（roguelike 改版）

> ⚠ **這份是 v2 當時的施工清單，已經完工。**
> 其中「動態難度 DDA」那一段**在 v3 已經被取消**，改成三個難度層級
> （見 [`BALANCE.md`](BALANCE.md) §7 與 [`META-GROWTH.md`](META-GROWTH.md)）。
> 這份文件保留當作施工紀錄，不要再照裡面的 DDA 段落實作。


交付對象：實作者（Sonnet）。數值規格一律以 [`docs/BALANCE.md`](BALANCE.md) 為準，
**本文件不重複數字**，只講「改哪個檔、改哪一段、做完長什麼樣」。

改的檔案只有四個：`index.html`、`assets/manifest.json`、`assets/README.txt`、
`README.md`，外加兩個新檔 `CHANGELOG.md`、`tools/balance-sim.mjs`。

> 全部行號以 commit `ee5668f` 的 `index.html`（4427 行）為基準。

---

## 施工順序

先做 W1（把數字集中），再做 W2→W8（玩法），最後 W9→W14（收尾與文件）。
W2 之後每一項都可以單獨 commit、單獨驗。

---

## W1. 建立 `BALANCE` 單一數值來源

**位置**：`index.html` 約 2630 行（現在 `STAFF_MULT` 那一串常數的地方）。

1. 新增 `const BALANCE = { ... }`，內容照 `docs/BALANCE.md` 的每一個參數，
   分組為 `dmgScale / weapon / weaponRef / quality / combo / atkPerLv / exp /
   hp / dda / zones / elite / lord / boss / rank / grade`。
   **必須附上每個欄位的中文註解**（這份檔案的風格就是這樣）。
2. 舊常數 `STAFF_MULT`…`FLURRY_SLOPE`（2630–2639）、`QUALITY_NEED_KILLS`（1634）、
   `GAUGE_PER_HIT`/`SHARP_SHOTS`（2840–2841）、`SPECIAL_EVERY`（2824）
   全部移進 `BALANCE`，原處刪掉（不要留別名，避免兩份真相）。
3. `QUALITIES`（1614）每一階補 `chars` 與 `expW` 兩個欄位。
4. `PERSONAL_MONSTERS`（1009）的 `hp` 欄位**保留但不再讀取**，
   改加 `lvFrom` / `lvTo`（見 W4），並在註解寫明 hp 已失效。

**驗收**：全檔搜不到任何裸數值倍率；`grep -n "BALANCE\." index.html` 看得到
傷害、血量、經驗三處都從它取值。

---

## W2. 傷害公式改寫 + 連擊追加傷害

**位置**：`computeDamage()`（2642–2677）、`submitAttack()`（3497–3542）、
`popDamage()`（2715–2728）、`updateStats()`（3666–3676）。

1. `computeDamage()` 改簽名為 `computeDamage(weaponKey, qualityKey, res, combo, opts)`，
   內部一律走 `perCharDmg × atk(G.lv) × comboMult`，
   回傳多兩個欄位：`base`（無連擊）與 `bonus`（= dmg − base）。
2. 法杖標點加成改用 `BALANCE.staffPunct`（已含 dmgScale）。
3. `popDamage(amount, kind, note, bonus)`：`bonus > 0` 時在主數字下方多跳一個
   較小的金色 `追加 +N`，用另一個 class（例 `dmg-pop-bonus`）做 CSS，
   延遲 80ms 出現，看起來像「追打上去」的。
4. 連擊標籤（`#combo-tag`，3669–3673）改成 `7 連擊　+36%`；
   連擊中斷時加 0.3s 閃紅動畫再清空。
5. 匕首的連環斬速度倍率**與連擊加成相乘**（兩者都是速度獎勵，這是刻意疊加）。

**驗收**：普通品質 LV1 第一下 53 點；連到 10 連擊時主數字約 +54%，
下面跳 `追加 +29`。

---

## W3. 局內等級與經驗條

**位置**：`freshGame()`（2846–2861）、`submitAttack()`、新增 `gainExp()`、
HTML `#topbar`（約 494–509）。

1. `freshGame()` 加欄位：`lv: 1, exp: 0, expNeed: BALANCE.exp.need(1), maxLv: 1,
   dda: <登入時算好的>, rescued: false`。
2. 新增 `gainExp(n)`：累加、跨級時 `while` 迴圈升級（一次可能連升兩級）、
   呼叫 `paintExpBar()` 與 `showLevelUp(lv)`。
3. 經驗來源照 `BALANCE.exp`，在 `submitAttack()`（正確字、全對、連擊里程碑）
   與 `hitMonster()`（擊倒）兩處發放。
4. **UI**：在 `#topbar` 與 `#stage` 之間插一條 `#lvbar`：
   左邊金色方章 `LV 7`、中間細經驗條（`#exp-fill`，寬度 %，0.25s 過渡）、
   右邊小字 `135 / 153`。高度控制在 26px 以內，**不能讓 `#stage` 被擠到捲動**
   （現在的版面是滿版不捲動，這是硬規則）。
5. `showLevelUp(lv)`：沿用 `#unlock-banner` 的樣式另做一個 `#levelup-banner`，
   文字「LV 7！攻擊力 +4%」，1.6 秒自動收，小 confetti（30 顆）。
   **升級橫幅與解鎖橫幅不可同時顯示**，後者優先、前者排隊 1.8 秒後再跳。

**驗收**：中位速度打完 2 分鐘大約停在 LV 7，經驗條看得出來一直在動。

---

## W4. 怪物改成等級區域生成

**位置**：`PERSONAL_MONSTERS`（1009）、`makeRun`/`makePersonalRun`（2680–2688）、
`drawMonster()`（3554–3580）、`hitMonster()`（3594–3619）、`renderMonList()`（3650–3664）。

1. 刪掉 `makePersonalRun`（固定 10 隻那套）。新增：
   * `ZONES`（照 BALANCE §6 表），每區 `{ name, lvFrom, lvTo, monsters:[...] }`
   * `spawnMonster(lv, quality, dda)` → `{ name, art, color, tag, lv, max, hp,
     kind:'normal'|'elite'|'lord' }`，血量照 BALANCE §3 算，
     王級／菁英套前綴與倍率，LV26+ 走「深淵」無盡區。
2. `G.mon` 存當前一隻（取代 `G.run` + `G.monIdx`）；`G.kills` 照舊累加。
   **溢出傷害**要能連續擊倒下一隻（現在 `hitMonster` 的 while 迴圈邏輯照搬，
   只是每次死掉就 `G.mon = spawnMonster(G.lv, ...)`）。
   連續擊倒兩隻以上時跳 `連鎖擊倒 ×2` 的 banner。
3. `#mon-lv`（511 行）從「第 1 隻」改成 `LV 7`；
   菁英／王級時在名字前加金色 chip（`菁英` / `王級`）並讓血條換成金色漸層。
4. `#mon-track`（488 行）從「10 顆固定點」改成**本區進度**：
   5 顆點代表本區 5 級、已過的填滿，右邊接 `擊倒 4`。
   區域切換時整條 0.4s 淡入換色（每區一個主色）。
5. `allCleared()` 整個概念刪除（等級無上限，不會清光）。
   `drawMonster()` 裡那段「全部怪獸都被清光了」的 ASCII 一併刪。

**驗收**：LV1–5 一定是史萊姆或大蝙蝠；LV5、LV10 遇到的是王級；
打到 LV11 時背景區域標籤換成「墓地」。

---

## W5. 動態難度 DDA

**位置**：`lookupHistory()`（3047–3076）、`saveScore()`（3719–3771）、
`freshGame()`、新增 `seedDda()` / `updateDda()`。

1. 登入撈到歷史後：`G.dda` 的來源是 `MY_HIST.dda`；
   沒有的話用 `seedDda(MY_HIST.bestWpm)`；完全沒紀錄用 `BALANCE.dda.seedNew`。
2. `saveScore()` 算 `nextDda = updateDda(G.dda, G.kills)`，
   寫進 payload 與 `writeLocalHist`（**練習模式也要寫**，DDA 不是排名，
   練習也該校準）。
3. 救援機制：`tick()` 裡判斷「已過 `rescueAtPct` 的時間且 `G.kills === 0`
   且 `!G.rescued`」→ 當前怪 `hp` 與 `max` 同時乘 `(1 - rescueCut)`，
   `G.rescued = true`，**不出任何提示**（學生不需要知道被放水）。
4. 老師控制台的難度滑桿保留，說明文字改成
   「全班統一再乘一次；個人難度已經會自動調整，通常放 1.0 就好」。

**驗收**：同一位學生連續玩三場，`mg_scores` 的 `dda` 欄位會往目標帶收；
第一次登入的新生打完第一場擊倒數落在 2～8。

---

## W3.5. 新手教學（史上第一次登入才會出現）

> **這節已實作，且中途依實測回饋改過一版**：原始規劃是「6 題暖身、不出
> 特殊攻擊」，實際上線前的校對發現這樣學生完全沒摸到三把武器的絕招，
> 改成現在這個 caption／battle 交錯的分段腳本（`TUTORIAL_SCRIPT`），
> 每把武器都會真的觸發一次詠唱／神射手／連環斬。**這裡保留原始規劃文字
> 供對照，實際規格與理由以 `docs/BALANCE.md` §7.0 為準。**

數值理由見 `docs/BALANCE.md` §7.0。**目的是用真實打字速度取代 `seedNew:0.85` 的盲猜**。

**位置**：`gotoLobby()`（約 3216 行）、新增 `#screen-tutorial`（HTML，放在
`#screen-lobby` 與 `#screen-game` 之間）、新增 `startTutorial()` / `tutorialStep()`
/ `endTutorial()`、`LOADOUT` 附近加 `TUT = { active:false, ... }`。

1. **觸發條件**：`doLogin()` 撈完歷史後，若 `!MY_HIST || !MY_HIST.plays`
   （史上第一次，完全沒打過任何一場——包含練習），進 `gotoLobby()` 前先跳
   `startTutorial()`，而不是直接給老師/學生控制的營地。
2. **介面簡介**（3～4 張卡，每張一個「繼續」鍵或 Enter 前進）：
   指向怪物血條／輸入框／傷害數字／武器與品質 chip，文字要短
   （例：「這是你要打的字，看注音打中文就好」）。
3. **自動戰鬥 6 題**：依序法杖 2 題、弓箭 2 題、匕首 2 題
   （`TUT.weapons = ['staff','staff','bow','bow','dagger','dagger']`），
   每題前把 `G.weapon = TUT.weapons[TUT.i]` 再呼叫現有的 `nextQuestion()`，
   畫面照常顯示武器、怪物會正常掉血甚至死掉（用 `BALANCE.dda.seedNew` 開場），
   **但不觸發 `checkUnlock`／不寫入 `damage`／不算進任何排行**，
   純粹借現有戰鬥流程的手感。
4. **背後量測**：累計這 6 題的 `correctChars` 與花費時間算出 `measuredWpm`，
   以及 `correctChars/typedChars` 算 `measuredAcc`。
   **畫面上不顯示這兩個數字**（不是考試，是暖身）。
5. **結束**：`endTutorial()` 把 `MY_HIST.dda = seedDda(measuredWpm)`、
   `MY_HIST.tutorialDone = true`、`MY_HIST.bestWpm = Math.max(MY_HIST.bestWpm||0,
   measuredWpm)` 寫進本機歷史**與雲端**（一筆 `setDoc merge`），
   跳一句鼓勵的話（不給分數，例如「準備好了，營地在等你」），再進 `gotoLobby()`。
6. `#tutorial-skip`（小字，角落）：給老師示範用，跳過時 `MY_HIST.dda =
   BALANCE.dda.seedNew`、一樣寫 `tutorialDone:true`（不會每次示範都重新跳出來）。
7. **回頭相容**：既有 139 筆舊紀錄 `plays` 欄位都 > 0，天然不會被叫出教學，
   不用額外補 `tutorialDone` 欄位。

**驗收**：清 localStorage＋用全新座號登入 → 自動進教學而不是直接到營地；
教完的第一場擊倒數應該已經反映真實手速，跟用該生真實 wpm 算出的 §7 模擬表一致
（容許 ±1 隻的量測誤差）。

---

## W6. 難度鎖改看 `bestLevel`

**位置**：1628–1658（`QUALITY_NEED_KILLS` / `myBestKills` / `qualityUnlocked`
/ `qualityLockHint`）、`checkUnlock()`（3621–3633）、`paintLoginHistory()`（3078–3097）。

1. `QUALITY_NEED_KILLS` → `BALANCE.unlockLevel`（照 BALANCE §10）。
2. `myBestKills()` → `myBestLevel()`，讀 `MY_HIST.bestLevel`
   （舊紀錄沒有這個欄位 → 回退用 `bestKills × 2` 粗估，讓老學生不會一夕被鎖回普通）。
3. `checkUnlock()` 的觸發點從「擊倒時」改成「升級時」（在 `gainExp` 裡呼叫）。
4. 鎖定提示文字改成「到達 LV 8 才會解鎖（你目前最高 LV 6）」。

**驗收**：第一次玩的學生打完一場（LV≥4）回營地就能選精良。

---

## W7. 階級改用戰績分 + 單場評價

**位置**：`RANKS`（1774–1788）、`rankOf`/`nextRankOf`（1790–1798）、
`showResult()`（3907–）、`paintLoginHistory()`、`saveScore()`。

1. 新增 `battleScore({ wpm, acc, quality })`（BALANCE §8.1），
   `rankOf(score)` / `nextRankOf(score)` 改吃分數不吃傷害。
   `RANKS[].min` 換成 BALANCE §8.1 的門檻，六句 `quote` 重寫
   （現在的文案提到「推倒第幾隻怪」，已經不成立）。
2. `saveScore()` 多存 `bestScore`、`bestLevel`、`bestCombo`、
   `lastKills`、`lastLevel`、`balanceVer: 2`。
3. 結算畫面：
   * `#r-stats` 由 6 格改 7 格，加「到達等級」；
   * 新增 `#r-grade`：大字母 S/A/B/C/D + 一句針對弱項的話（BALANCE §8.2）；
   * 傷害卡下面加一行小字「這一版的傷害數字跟 9 月舊紀錄不能比」
     （只在 `before.balanceVer` 不存在時顯示，之後自動消失）。
4. 登入畫面的 `#lh-kills` 改成「最高等級」，並把徽章換成 `bestScore` 算的。

**驗收**：用實測資料的中位學生（wpm 10、acc 90%、普通）→ 銀級勇者、評價 B。

---

## W8. BOSS 血量跟著場次長度縮放

**位置**：`BOSSES`（1197）的 hp 換成 BALANCE §9 的表；
`makeBossRun()`（2689）改成 `makeBossRun(difficulty, durationSec)`，
乘上 `durationSec / BALANCE.boss.baseSec`；`fetchClassData()`（3773–3793）
兩處 `makeBossRun(CFG.difficulty)` 補上 `ROUND.duration || CFG.duration`。

**注意**：`fetchClassData` 現在呼叫了 `makeBossRun` 兩次（3789–3790），
其中一次的結果被丟掉，順手修成一次。

**驗收**：120 秒場次、全班 35,000 傷害 → 推倒 4 隻。

---

## W9. 設定遷移（**會炸，務必做**）

雲端 `mg_config.settings` 現在是 `difficulty: 0.3`、`duration: 120`。
新平衡是以 1.0 校準的，沿用 0.3 會讓所有怪剩三成血、一下就死。

**位置**：`applyConfig()`（2982–2995）。

```
如果 d.balanceVer 不存在或 < 2：
  CFG.difficulty = 1.0        // 忽略舊的 0.3
  老師控制台開啟時顯示一條黃色提示：
    「難度係數已因改版重設為 1.0，個人難度現在會自動調整」
  老師按「同步設定給全班」時一併寫入 balanceVer: 2
```

`duration: 120` **保留不動**（那是老師的教學選擇，新平衡就是照 2 分鐘校準的）。

**驗收**：用現有雲端設定開遊戲，第一隻怪是 96 血而不是 29 血。

---

## W10. 首頁右下角版本 log

**位置**：HTML 在 `#screen-login`（385）之後加一顆固定定位按鈕；
JS 在 `BALANCE` 附近加 `const VERSION_LOG = [...]`。

1. `const APP_VERSION = '2.0.0'`、`VERSION_LOG = [{ v, date, title, items:[] }, ...]`
   （內容抄 `CHANGELOG.md`，**兩邊都要更新**，這點寫進 README）。
2. 按鈕 `#btn-verlog`：固定在視窗右下角（`position:fixed; right:16px; bottom:16px`），
   樣式用 `btn-ghost`、小字、顯示 `v2.0.0`，滑過才亮。
   **只在登入與營地畫面出現**（`#screen-game` 要乾淨），
   進遊戲時和 `#app-header` 一起隱藏。
3. 點開 `#verlog-modal`：最新版展開、舊版收起，每版「更新」與「新增」分兩欄列，
   高度超過就內捲（沿用 `.scrolly`）。手機寬度要能看（現有版面已經是 responsive）。

**驗收**：點右下角 `v2.0.0` 看得到這次改版的條列；行動裝置寬度不破版。

---

## W11. `tools/balance-sim.mjs`（平衡驗算器）

**不要複製一份數字**。做法：讀 `index.html`，用 regex 切出
`const BALANCE = {...};` 那一段，`new Function('return ' + src)()` 取回物件，
然後印出 `docs/BALANCE.md` §3 §7 §11 的三張表（血量表、DDA 收斂、wpm 對照表）。

用法寫在檔頭：`node tools/balance-sim.mjs`。
模擬器要吃得進實測 wpm 分布（p10=3 / 中位 10 / p90=19 那一組，
直接寫死在檔案裡當基準人群）。

**驗收**：跑完輸出的三張表跟 `docs/BALANCE.md` 對得上（允許 ±5% 蒙地卡羅誤差）。

---

## W12. `assets/` 同步

1. `assets/manifest.json`：`personal[]` 的 `hp` 改成 `lvFrom` / `lvTo`，
   並補 `zone` 名稱；`bosses[].hp` 換成 BALANCE §9 的新表。
2. `assets/README.txt`：說明「小怪血量不再由 manifest 決定，改由等級算出來；
   要調血量請改 `docs/BALANCE.md` 對應的 `BALANCE.hp`」。
3. **順手修一個既有 bug**：`loadAssets()`（2322–2377）讀的是 `mf.monsters`，
   但 manifest 裡的鍵是 `personal` / `bosses`，而且它寫入的 `MONSTERS`
   這個變數**根本不存在**（1009 行叫 `PERSONAL_MONSTERS`）。
   所以外部小怪美術從來沒生效過，只是被 try/catch 吞掉。
   改成正確讀 `mf.personal` → `PERSONAL_MONSTERS`、`mf.bosses` → `BOSSES`。

**驗收**：用 http 開啟時主控台出現「已套用 assets/ 的外部素材」而不是警告。

---

## W13. `CHANGELOG.md`

新檔，倒序列出版本。v1.x 的條目可以直接從 `git log --oneline` 翻譯成人話
（已整理好放在這次 commit 的 `CHANGELOG.md` 初稿裡），v2.0.0 照本清單實際完成的項目寫。
格式要能被 W10 的 `VERSION_LOG` 一眼對照。

---

## W14. `README.md` 更新（最後做）

要改的段落（現在全部過時）：

| 段落 | 現在寫什麼 | 要改成 |
|---|---|---|
| 「難度怎麼調」 | 固定 10 隻、每隻 +30% 血、一堂課 10 分鐘 | 等級區域制、血量由 CTK 算、DDA 自動調 |
| 班級程度模擬表 | 以 10 分鐘 / 平均 20 wpm 模擬 | 換成 `docs/BALANCE.md` §11 的實測校準表 |
| 「勇者階級」 | 門檻看總傷害 | 改成戰績分，附新門檻表 |
| 「四階武器品質」解鎖條件 | 單場打倒 N 隻 | 到達 LV N |
| 「一堂課怎麼跑」 | 預設 600 秒 | 實際在用的是 120 秒，並說明長度會自動縮放 BOSS |
| 新增段落 | — | 「局內等級與經驗」「動態難度」「版本紀錄在哪看」 |

README 裡凡是提到具體數字的地方，一律改成「詳見 `docs/BALANCE.md`」＋一句結論，
避免以後兩份文件對不起來。

---

## 不要做的事

* **不要做道具、配件、升級三選一祝福**（使用者明確說這次不做，已列在 BALANCE §12）。
* 不要動題庫內容與注音資料（`BANK_*`、`assets/banks/`）。
* 不要動 Firestore 規則（新欄位不需要改規則）。
* 不要改 `mg_scores` 的文件 ID 規則（`班級_座號`）。
* 不要讓任何畫面變成需要捲動（滿版不捲是既有的硬約束）。
* 不要刪 `bestDamage` / `bestKills` 舊欄位，老師的歷史 Excel 還要用。

---

## 測試清單（交付前自己跑一遍）

用 http 開（`python -m http.server` 或 VS Code Live Server），**不要用 file://**。

1. **新手教學**：清 localStorage、用沒用過的座號登入 → 應自動進教學
   （不是直接到營地），介面簡介卡可以按過去，6 題內依序看到法杖／弓箭／匕首，
   教完進營地；用同一座號再登入一次，**不會**再跳教學。
1b. **新生第一場**：教學結束後練習 2 分鐘，
   確認擊倒 2～8 隻、LV 到 4 以上、經驗條有動、沒有卡在第一隻。
2. **弱者**：故意慢慢打（約 10 秒一題）→ 確認觸發救援（第一隻會比平常早死），
   整場至少推倒 1～2 隻。
3. **強者**：連續全對快打 → 確認連擊追加傷害出現、到 16 連擊封頂、
   等級衝到 10 以上、區域換到「洞穴」「墓地」。
4. **DDA 收斂**：同一座號連玩三場，每場結束看 `mg_scores` 的 `dda` 有變，
   且擊倒數往 4～8 靠。
5. **四種品質**各玩一場，確認擊倒數都在合理範圍、傳奇不會一題清三隻。
6. **三把武器**各玩一場，確認詠唱／連環斬／神射手都還在、傷害數字沒爆。
7. **王級與菁英**：打到 LV5 看見王級（金框、血較多、經驗跳一大格）。
8. **結算**：評價字母、到達等級、戰績分徽章、BOSS 擊倒數都正常；
   練習模式不顯示班內排行。
9. **舊紀錄相容**：用實測資料裡已存在的座號（例如五年級3班 某號）登入，
   確認登入卡片不會因為缺 `bestLevel` / `bestScore` 而壞掉或顯示 NaN。
10. **老師控制台**：設定同步寫得進去、`balanceVer` 變 2、難度提示出現一次。
11. **版本 log**：右下角按鈕只在登入／營地出現，內容正確。
12. 主控台（Console）全程**不能有紅字**。
