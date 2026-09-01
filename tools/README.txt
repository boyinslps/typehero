BOSS 圖形產生器
================================================================

BOSS 的 ASCII 不是手打的，是「先用程式畫剪影 → 再轉成 ASCII」。
想改造型的話，改剪影比一格一格打字容易很多。

  draw_bosses.py      用 PIL 畫出十隻 BOSS 的黑白剪影（900x700 PNG）
  make_boss_ascii.py  把剪影轉成 ASCII，再收斂成乾淨的遊戲風格
  draw_deco.py        畫結算畫面的裝飾（階級徽章、分隔飾條）

  註：階級徽章最後是手工設計的，不是轉換來的。
      小圖示在 20~30 字元寬的尺寸下，轉換會糊掉，手工排反而清楚。
      轉換流程適合怪物這種有機的大形體。

── 怎麼重新產生 ────────────────────────────────────────────────

需要先裝好 ascii-art skill 與 Python 套件：

    npx skills add https://github.com/neethanwu/ascii-art --skill ascii-art
    python -m pip install pillow numpy scipy pyfiglet

然後在這個資料夾執行：

    python draw_bosses.py        # 產生 boss_img/*.png
    python make_boss_ascii.py    # 產生 boss_ascii/*.txt

把 boss_ascii/ 裡的 txt 複製到 ../assets/bosses/ 覆蓋掉舊的即可。

── 想改造型 ────────────────────────────────────────────────────

改 draw_bosses.py 裡對應的函式。每隻 BOSS 就是一個函式，
用 d.ellipse / d.polygon / d.rectangle 畫形狀：

    fill=FG  畫上去（黑，會變成 ASCII 的實心）
    fill=BG  挖掉（白，會變成空白，用來做眼睛和嘴巴）

畫布是 900x700，中心線在 x=450。
sym() 可以左右對稱地畫一次就好（翅膀、角這類）。

── ASCII 的濃淡怎麼調 ──────────────────────────────────────────

make_boss_ascii.py 的 clean() 有兩個門檻：

    solid=0.55   多濃才算實心 #
    edge=0.18    多濃才算邊緣 =

COLS 那個陣列是每隻 BOSS 的輸出寬度（字元數），
越後面的 BOSS 給越大的值，看起來才會越強。
