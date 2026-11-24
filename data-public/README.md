# data-public：可以公開的真實資料

只放**已去識別化**的匯出檔（教師頁「匯出打字速度（匿名）」產生）。老師 2026-11-24 決定可以放上 GitHub。

- `typehero-speed-20261120.json`：315 列，每列只有隨機編號（每次匯出重新產生、沒有對照表）、年級（不足 5 人合併成 `?`）、打字速度、正確率、層級、武器、新世界的場次與勝敗／閃避防禦次數。**沒有姓名、座號、班級名稱、docId、暱稱**。欄位說明在檔案的 `meta.fields`。
- 用途：`tools/nw-sim/` 模擬器校正（`node tools/nw-sim/load-real.mjs data-public/typehero-speed-20261120.json --out data-private/profiles.json`；`personas.mjs`、`calib.mjs` 找不到 `data-private/` 時會直接讀這裡）。
- **規則不變**：姓名、座號、通關密語、金鑰、任何能對回個別學生的檔案，**絕對不進 repo**（仍放 `data-private/`，已在 `.gitignore`）。新的匯出檔要放這裡之前，先確認沒有姓名類欄位。
