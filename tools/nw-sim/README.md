# 戰鬥數值模擬器（`tools/nw-sim/`）

純 node，不開瀏覽器。數字依真實學生手速模擬，**不要憑感覺調數值**。

| 檔 | 做什麼 |
|---|---|
| `sim.mjs` | 一場戰鬥的模擬（2b-1 起是**三線戰鬥**：打字、武器特技照 `nw-battle.js`，魔物出招與學生反應在 `lanes.mjs`，裝備 `{ atk, elem, hp, cut, shield, warn }`，題目長度讀 `assets/banks`） |
| `lanes.mjs` | 魔物出招（單線、夾擊、橫掃、假動作、重壓）與學生反應（換線、舉盾）。反應假設：新手 1.0 → 練熟 0.7 秒、夾擊選對 80% → 95%、太早舉盾會再按 50% → 90%（SPEC-STAGE2 §3.4）；`attend` 旋鈕＝有沒有注意到紅線（預設每次都注意），`attendDodge`／`attendDef` 可以分開設，`slamOnce` 只作對照 |
| `personas.mjs` | 學生樣本：`SPEC6`（規格原本 6 個）、`realPersonas()`（用 `data-private/profiles.json` 的 P25／P50／P90＋極快 45） |
| `gear.mjs` | **裝備驗收 G1～G8**：`node tools/nw-sim/gear.mjs --n 1000`（加 `--md` 輸出 Markdown，結果存在 `docs/BALANCE-GEAR-2B.md`；`--attend 0.5` 看「很多人沒注意到紅線」） |
| `calib.mjs` | 用真實匯出的閃避／防禦成功率校正 `attend` |
| `persona.mjs`、`run.mjs`、`tiers.mjs` | 舊的快速看勝率、依真實名單跑、換層級血量倍率試算 |
| `events.mjs` | 活動預設值（班級挑戰勝率、`FASTEST_FLOOR`）；含裝備的下限用 `gear.mjs` 的 G7 |
| `curves.mjs` | 平衡曲線的解析模型（`docs/BALANCE-CURVES.md`），全部重算約 80 秒 |
| `load-real.mjs` | 把教師頁「匯出打字速度（匿名）」的檔轉成模擬器的學生列表（匯出檔放 `data-private/`，不進 repo） |
| `bal2b-data.mjs` | 2b 分析：只讀匯出檔的統計（速度分位數、σ、閃避／防禦與信賴區間、層級缺口、裝備上限指標）。報告 `docs/research/BALANCE-2B-ANALYSIS.md` |
| `bal2b.mjs` | 2b 分析：閃避／防禦假設反推（`fit`）、防具價值、重壓三倍 vs 只打一次、284 個真實學生逐人、層級影響、敏感度。`node tools/nw-sim/bal2b.mjs <fit\|gear\|def\|slam\|real\|quant\|tier\|armor\|sens\|g8\|thr>` |
| `bal2b-term.mjs` | 2b 分析：一學期（14 節×2 場）逐人逐場的進度預測，用 `nw-data.js` 真正的打造／強化函式。V2 選項見下 |
| `rules-v2.mjs` | **平衡 V2 規則包**（`SPEC-BALANCE-V2`）：`NW_V2`、`FLOWS`、`ATTACK_FROM`、`ATTACK_DMG`、`ATTACKS_V2`。`nw-data.js` 有就讀、沒有用同名同值的後備值；`v2Rules({ flow })` 產生給 `sim.mjs` 的 `A.rules` |
| `v2-validate.mjs` | 逐場模擬 vs 解析模型（`curves.mjs v2`）的勝率與秒數對照；`--ablate` 拆解差異從哪來 |
| `v2-afk.mjs` | 掛機策略的獎勵比例（防掛機 §3.4，新舊規則對照） |
| `v2-real.mjs` | 真實名單逐人跑 V2 規則：各組、各魔物、各星級的勝率（一般／守護／藤蔓／最好） |

裝備數值：`gear.mjs` 的 `statsOf()` 直接用 `nw-data.js` 的 `slotValue()`，改了裝備數字重跑 `gear.mjs` 就會跟著變，不用兩邊同步。

## 平衡 V2 的模擬（`docs/SPEC-BALANCE-V2.md` §7 第 1 步；結果在 `docs/research/BALANCE-V2-SIM.md`）

**不加任何新選項時，所有舊指令的輸出逐字不變**（`gear.mjs --n 1000`、`curves.mjs --preset v2 v2`、`bal2b.mjs`、`bal2b-term.mjs`，已跟 `git archive` 出來的舊版對照）。

### `sim.mjs`：`A.rules`＝V2 規則包
```js
import { simulate, DEFAULT_ASSUME } from './sim.mjs';
import { v2Rules } from './rules-v2.mjs';
simulate(p, 'wolf', 'forest', 5, 0.5, seed, { ...DEFAULT_ASSUME, attendDodge: 0.11, attendDef: 0.73, rules: v2Rules({ flow: 'guard' }) }, { gear });
```
`v2Rules({ flow: 'none'|'guard'|'vine', afk: false, over: {…} })` 一次打開下面全部；也可以自己組一個物件只開一部分（欄位見 `rules-v2.mjs` 檔頭）：

| 規則 | 內容 |
|---|---|
| `tierless` | 血量 `(440+20Lv)·hpMul·k`、預警 3.0 秒、出招節奏用 B |
| `cap` | 8 分鐘逃走，結果 `'escape'`（不是輸）；倒下 3 次才輸（`'fail'`，舊就有） |
| `attacks`／`attackFrom`／`atkMul` | V2 攻擊表、跳跳菇 ★2 起、狼 ×0.7（乘在 `atk.mul`，`monDmg` 最低 4 點之前） |
| `elem`／`gCap` | 屬性 ×1.05／×0.95、武器×屬性封頂 1.37 |
| `armorCeil`／`slam15` | 盔甲無條件進位、重壓沒擋住只扣一次 ×1.5（與 `nw-data.js` 的 `strikeDamage` 一致） |
| `flow` | `guard`：重壓舉盾擋下、線上攻擊舉盾（擋一半）或真的躲開 → 自動反擊 5%×g、打字 ×0.85、盾 +0.5 秒（`lanes.mjs respondGuard`）；`vine`：全對題種藤蔓（最多 4 根），每根每 10 秒 0.5%×g、打字 ×0.85 |
| `afk` | §3.4：最近 40 秒內打對過字，流派才有效；流派傷害 ≤ 打字傷害；逃走時流派傷害算一半；保底 0.3 按有在打字的時間 `a` |
| 結果欄位 | `reward`（贏 1；輸／逃走 `0.3a+0.7f`；答不到 3 題 0）、`a`、`f`、`valid`、`guards`、`vines`、`dType`、`dFlow`、`flowShare` |

其他 `A` 欄位（沒給＝舊行為）：`sigmaB`（每場手感差）、`afkPlay: { nQ, alt }`（答 nQ 題後不再打字；`alt`＝只按住 Alt，不然站著不動）、`guardShield`、`qSd`／`fixCombo`（只用來拆解誤差）。
`A.rules` 與 `NW_PATCH=v2,gear,slam` 是兩套做同一件事的辦法，**不要同時用**（狼 ×0.7 會乘兩次）；兩者在同一組亂數下結果相同（已對照）。

### 指令
```
node tools/nw-sim/v2-validate.mjs --n 1000 [--persona p10,p50,p90] [--flow none,guard,vine] [--gear 綠全身+5] [--real profiles.json] [--ablate]
node tools/nw-sim/v2-afk.mjs --n 1000
node tools/nw-sim/v2-real.mjs --n 20 [--floor 4|1] [--group 0..3]
node tools/nw-sim/bal2b-term.mjs --rules v2 --flow none|guard|vine|pick --budget 15 [--over 3 --pad 60] [--sigma-b 0.2] [--floor 1] [--progress]
```
`bal2b-term.mjs` 的時間預算：`--budget` 是**一節課裡新世界的分鐘數**（規格 §4.1：一節課 40 分鐘，新世界約 15 分鐘，每場外加 3 分鐘、剩餘時間 < 預計時長＋60 秒就不開新的一場；預計時長＝這個學生最近 3 場實際花的）。想看「整節 40 分鐘都打」的上限用 `--budget 40`。不給 `--budget` 就是原本的 `--per` 固定場數。`--flow pick`＝一開始不用流派，連續 2 場沒贏就試還沒試過的（守護→藤蔓），之後挑近期獎勵最高的。`--rules v2` 的獎勵用 `NW_V2`（輸／逃走 0.3a＋0.7f、一天前 4 場完整材料、⚡用 `nw-data.js` 的 `stdSecs`、🔨每 10 分鐘有在打字的時間 +1 綠材料）。

### `curves.mjs`
`--preset v2` 的 `P.v2` 現在讀 `rules-v2.mjs` 的 `NW_V2`／`FLOWS`／`ATTACK_FROM`／`ATTACK_DMG`／`ATTACKS_V2`（遊戲端有就用遊戲端的）。值相同，所以輸出跟以前逐字相同。

### 已知落差（要讀報告）
逐場模擬比解析模型**慢約 30～40%、勝率低很多**（原因拆解在 `v2-validate.mjs --ablate` 與報告 §2）：解析模型是連續期望值，逐場有「整題才打完」「連擊要先爬升」「詞庫實際題長比解析假設長」。**沒有調任何模型參數去對齊**。
