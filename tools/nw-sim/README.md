# 戰鬥數值模擬器（`tools/nw-sim/`）

純 node，不開瀏覽器。數字依真實學生手速模擬，**不要憑感覺調數值**。

| 檔 | 做什麼 |
|---|---|
| `sim.mjs` | 一場戰鬥的模擬（2b-1 起是**三線戰鬥**：打字、武器特技照 `nw-battle.js`，魔物出招與學生反應在 `lanes.mjs`，裝備 `{ atk, elem, hp, cut, shield, warn }`，題目長度讀 `assets/banks`） |
| `lanes.mjs` | 魔物出招（單線、夾擊、橫掃、假動作、重壓）與學生反應（換線、舉盾）。反應假設：新手 1.0 → 練熟 0.7 秒、夾擊選對 80% → 95%、太早舉盾會再按 50% → 90%（SPEC-STAGE2 §3.4）；`attend` 旋鈕＝有沒有注意到紅線（預設每次都注意） |
| `personas.mjs` | 學生樣本：`SPEC6`（規格原本 6 個）、`realPersonas()`（用 `data-private/profiles.json` 的 P25／P50／P90＋極快 45） |
| `gear.mjs` | **裝備驗收 G1～G8**：`node tools/nw-sim/gear.mjs --n 1000`（加 `--md` 輸出 Markdown，結果存在 `docs/BALANCE-GEAR-2B.md`；`--attend 0.5` 看「很多人沒注意到紅線」） |
| `calib.mjs` | 用真實匯出的閃避／防禦成功率校正 `attend` |
| `persona.mjs`、`run.mjs`、`tiers.mjs` | 舊的快速看勝率、依真實名單跑、換層級血量倍率試算 |
| `events.mjs` | 活動預設值（班級挑戰勝率、`FASTEST_FLOOR`）；含裝備的下限用 `gear.mjs` 的 G7 |
| `curves.mjs` | 平衡曲線的解析模型（`docs/BALANCE-CURVES.md`），全部重算約 80 秒 |
| `load-real.mjs` | 把教師頁「匯出打字速度（匿名）」的檔轉成模擬器的學生列表（匯出檔放 `data-private/`，不進 repo） |

裝備數值：`gear.mjs` 的 `statsOf()` 直接用 `nw-data.js` 的 `slotValue()`，改了裝備數字重跑 `gear.mjs` 就會跟著變，不用兩邊同步。
