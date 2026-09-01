# -*- coding: utf-8 -*-
"""畫結算畫面的裝飾：六個階級徽章 ＋ 分隔飾條。
   一樣是程式畫的原創圖形，之後交給 ascii-art skill 轉成 ASCII。"""
import os, math
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), 'deco_img')
os.makedirs(OUT, exist_ok=True)
FG, BG = 0, 255


def canvas(w, h):
    im = Image.new('L', (w, h), BG)
    return im, ImageDraw.Draw(im)


def star(d, cx, cy, r, pts=5, inner=0.44, fill=FG):
    v = []
    for i in range(pts * 2):
        a = -math.pi / 2 + i * math.pi / pts
        rr = r if i % 2 == 0 else r * inner
        v.append((cx + math.cos(a) * rr, cy + math.sin(a) * rr))
    d.polygon(v, fill=fill)


def wreath(d, cx, cy, r, leaves, fill=FG):
    """左右各一排葉子，像桂冠"""
    for side in (-1, 1):
        for i in range(leaves):
            t = 0.18 + 0.64 * i / max(1, leaves - 1)
            a = math.pi * t
            x = cx - side * math.cos(a) * r
            y = cy + math.sin(a) * r
            d.ellipse([x - 13, y - 7, x + 13, y + 7], fill=fill)


# ── 六個階級徽章，越後面越華麗 ──
def rank_badge(level):
    W, H = 420, 300
    im, d = canvas(W, H)
    cx, cy = W // 2, H // 2 + 6

    if level >= 2:                                    # 銅級起有桂冠
        wreath(d, cx, cy, 108 + level * 4, 3 + level)
    if level >= 4:                                    # 金級起加外圈
        d.ellipse([cx - 96, cy - 96, cx + 96, cy + 96], fill=FG)
        d.ellipse([cx - 84, cy - 84, cx + 84, cy + 84], fill=BG)

    d.ellipse([cx - 74, cy - 74, cx + 74, cy + 74], fill=FG)      # 主體圓盤
    d.ellipse([cx - 60, cy - 60, cx + 60, cy + 60], fill=BG)

    if level == 0:                                    # 見習生：一個小點
        d.ellipse([cx - 14, cy - 14, cx + 14, cy + 14], fill=FG)
    elif level == 1:                                  # 冒險者：三角
        d.polygon([(cx, cy - 34), (cx + 30, cy + 24), (cx - 30, cy + 24)], fill=FG)
    elif level == 2:                                  # 銅：方塊
        d.rectangle([cx - 26, cy - 26, cx + 26, cy + 26], fill=FG)
    elif level == 3:                                  # 銀：五角星
        star(d, cx, cy, 40)
    elif level == 4:                                  # 金：星＋光芒
        star(d, cx, cy, 42)
        for i in range(8):
            a = i * math.pi / 4
            d.line([(cx + math.cos(a) * 46, cy + math.sin(a) * 46),
                    (cx + math.cos(a) * 58, cy + math.sin(a) * 58)], fill=FG, width=7)
    else:                                             # 傳說：雙星＋翅
        star(d, cx, cy - 4, 44)
        for side in (-1, 1):
            d.polygon([(cx + side * 78, cy - 34), (cx + side * 168, cy - 76),
                       (cx + side * 150, cy + 6), (cx + side * 84, cy + 16)], fill=FG)
        star(d, cx, cy - 84, 20)

    if level >= 1:                                    # 綬帶
        d.polygon([(cx - 40, cy + 62), (cx - 12, cy + 62), (cx - 20, cy + 128),
                   (cx - 52, cy + 106)], fill=FG)
        d.polygon([(cx + 40, cy + 62), (cx + 12, cy + 62), (cx + 20, cy + 128),
                   (cx + 52, cy + 106)], fill=FG)
    return im


# ── 分隔飾條 ──
def divider():
    W, H = 900, 90
    im, d = canvas(W, H)
    cy = H // 2
    d.rectangle([60, cy - 5, W - 60, cy + 5], fill=FG)
    star(d, W // 2, cy, 34)
    for x in (W // 2 - 150, W // 2 + 150):
        d.polygon([(x, cy - 22), (x + 26, cy), (x, cy + 22), (x - 26, cy)], fill=FG)
    for x in (110, W - 110):
        d.ellipse([x - 16, cy - 16, x + 16, cy + 16], fill=FG)
    return im


if __name__ == '__main__':
    for i in range(6):
        rank_badge(i).save(os.path.join(OUT, f'rank{i}.png'))
    divider().save(os.path.join(OUT, 'divider.png'))
    print('已畫出 6 個徽章 + 1 條飾線')
