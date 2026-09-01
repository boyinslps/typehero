# -*- coding: utf-8 -*-
"""畫出十隻 BOSS 的剪影圖，之後交給 ascii-art skill 轉成 ASCII。
   全部是程式畫的原創圖形，沒有版權問題。"""
import os, math
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), 'boss_img')
os.makedirs(OUT, exist_ok=True)
W, H = 900, 700
FG, BG = 0, 255


def new():
    im = Image.new('L', (W, H), BG)
    return im, ImageDraw.Draw(im)


def sym(d, fn):
    """左右對稱：畫一次右半，鏡射到左半"""
    fn(d, 1)
    fn(d, -1)


def poly(d, pts, s=1, fill=FG):
    d.polygon([(W // 2 + s * x, y) for x, y in pts], fill=fill)


def ell(d, box, s=1, fill=FG):
    x0, y0, x1, y1 = box
    a, b = W // 2 + s * x0, W // 2 + s * x1
    d.ellipse([min(a, b), y0, max(a, b), y1], fill=fill)


def eye(d, x, y, r, s=1):
    ell(d, (x - r, y - r, x + r, y + r), s, fill=BG)


# ── 1 巨魔守衛：粗壯、圓肩、獨眼 ──
def troll():
    im, d = new()
    d.ellipse([300, 120, 600, 360], fill=FG)                 # 頭
    d.polygon([(250, 340), (650, 340), (700, 620), (200, 620)], fill=FG)  # 身
    d.ellipse([150, 330, 320, 520], fill=FG)                 # 左肩
    d.ellipse([580, 330, 750, 520], fill=FG)                 # 右肩
    d.rectangle([300, 600, 400, 690], fill=FG)               # 腿
    d.rectangle([500, 600, 600, 690], fill=FG)
    d.ellipse([405, 200, 495, 280], fill=BG)                 # 獨眼
    d.polygon([(360, 300), (540, 300), (450, 340)], fill=BG)  # 嘴
    return im


# ── 2 雙頭獄犬：兩顆頭 ──
def cerberus():
    im, d = new()
    d.polygon([(180, 620), (720, 620), (660, 380), (240, 380)], fill=FG)
    for cx in (330, 570):
        d.ellipse([cx - 110, 150, cx + 110, 400], fill=FG)
        d.polygon([(cx - 100, 180), (cx - 60, 60), (cx - 20, 175)], fill=FG)   # 耳
        d.polygon([(cx + 20, 175), (cx + 60, 60), (cx + 100, 180)], fill=FG)
        d.ellipse([cx - 70, 230, cx - 25, 280], fill=BG)
        d.ellipse([cx + 25, 230, cx + 70, 280], fill=BG)
        d.polygon([(cx - 55, 330), (cx + 55, 330), (cx, 380)], fill=BG)
    d.rectangle([250, 600, 340, 690], fill=FG)
    d.rectangle([560, 600, 650, 690], fill=FG)
    return im


# ── 3 蛇髮妖女：頭髮是很多條蛇 ──
def medusa():
    im, d = new()
    for i in range(11):
        a = math.pi * (0.06 + 0.88 * i / 10)
        x = W // 2 - math.cos(a) * 250
        y = 300 - math.sin(a) * 250
        d.line([(W // 2, 300), (x, y)], fill=FG, width=16)
        d.ellipse([x - 22, y - 22, x + 22, y + 22], fill=FG)
    d.ellipse([340, 190, 560, 430], fill=FG)                  # 臉
    d.polygon([(360, 420), (540, 420), (600, 660), (300, 660)], fill=FG)
    d.ellipse([380, 260, 430, 310], fill=BG)
    d.ellipse([470, 260, 520, 310], fill=BG)
    d.polygon([(410, 360), (490, 360), (450, 395)], fill=BG)
    return im


# ── 4 深淵騎士：頭盔＋鎧甲＋長劍 ──
def knight():
    im, d = new()
    d.polygon([(360, 130), (540, 130), (560, 300), (450, 380), (340, 300)], fill=FG)
    d.rectangle([380, 190, 520, 235], fill=BG)                # 面罩開口
    d.polygon([(300, 340), (600, 340), (650, 640), (250, 640)], fill=FG)
    d.polygon([(230, 330), (330, 300), (350, 430), (240, 450)], fill=FG)
    d.polygon([(670, 330), (570, 300), (550, 430), (660, 450)], fill=FG)
    d.polygon([(700, 90), (740, 90), (740, 520), (720, 560), (700, 520)], fill=FG)  # 劍
    d.rectangle([650, 500, 790, 530], fill=FG)
    d.rectangle([320, 620, 410, 690], fill=FG)
    d.rectangle([490, 620, 580, 690], fill=FG)
    return im


# ── 5 冰霜巨龍：長頸、大翅、尖角 ──
def frostdragon():
    im, d = new()
    sym(d, lambda dd, s: poly(dd, [(60, 330), (430, 130), (400, 400), (110, 470)], s))
    d.ellipse([370, 250, 530, 400], fill=FG)                  # 頭
    d.polygon([(370, 320), (250, 380), (380, 380)], fill=FG)  # 吻
    d.polygon([(400, 250), (370, 130), (450, 235)], fill=FG)  # 角
    d.polygon([(470, 245), (540, 135), (500, 255)], fill=FG)
    d.ellipse([405, 295, 445, 330], fill=BG)
    d.ellipse([465, 295, 505, 330], fill=BG)
    d.polygon([(400, 390), (500, 390), (540, 640), (360, 640)], fill=FG)
    d.polygon([(360, 620), (540, 620), (620, 690), (280, 690)], fill=FG)
    return im


# ── 6 火焰惡龍：翅膀更張、有尾 ──
def firedragon():
    im, d = new()
    sym(d, lambda dd, s: poly(dd, [(40, 300), (450, 90), (430, 300), (330, 260),
                                   (360, 430), (90, 460)], s))
    d.ellipse([355, 240, 545, 410], fill=FG)
    d.polygon([(360, 320), (215, 375), (370, 390)], fill=FG)
    for dx, sgn in ((-70, -1), (70, 1)):
        d.polygon([(450 + dx, 250), (450 + dx + sgn * 30, 120), (450 + dx + sgn * 60, 250)], fill=FG)
    d.ellipse([395, 290, 440, 330], fill=BG)
    d.ellipse([470, 290, 515, 330], fill=BG)
    d.polygon([(385, 400), (515, 400), (560, 620), (340, 620)], fill=FG)
    d.polygon([(340, 600), (560, 600), (700, 690), (200, 690)], fill=FG)
    return im


# ── 7 雷霆巨人：高大、方肩、雙拳 ──
def giant():
    im, d = new()
    d.rectangle([330, 110, 570, 330], fill=FG)
    d.rectangle([255, 330, 645, 620], fill=FG)
    d.rectangle([120, 340, 250, 560], fill=FG)
    d.rectangle([650, 340, 780, 560], fill=FG)
    d.ellipse([100, 540, 270, 690], fill=FG)                  # 拳
    d.ellipse([630, 540, 800, 690], fill=FG)
    d.rectangle([370, 190, 430, 240], fill=BG)
    d.rectangle([470, 190, 530, 240], fill=BG)
    d.rectangle([360, 280, 540, 305], fill=BG)
    for i in range(5):
        x = 340 + i * 60
        d.polygon([(x, 60), (x + 25, 110), (x - 10, 110)], fill=FG)  # 頭頂的雷角
    return im


# ── 8 混沌魔王：巨角、披風、王座感 ──
def demonlord():
    im, d = new()
    sym(d, lambda dd, s: poly(dd, [(40, 210), (110, 60), (175, 120), (150, 260)], s))  # 角
    d.ellipse([340, 160, 560, 400], fill=FG)
    d.polygon([(300, 370), (600, 370), (700, 690), (200, 690)], fill=FG)   # 披風
    d.polygon([(150, 400), (300, 360), (280, 690), (110, 690)], fill=FG)
    d.polygon([(750, 400), (600, 360), (620, 690), (790, 690)], fill=FG)
    d.polygon([(375, 250), (445, 250), (410, 310)], fill=BG)
    d.polygon([(455, 250), (525, 250), (490, 310)], fill=BG)
    for i in range(6):
        x = 370 + i * 34
        d.polygon([(x, 340), (x + 17, 380), (x + 34, 340)], fill=BG)       # 牙
    return im


# ── 9 天災之獸：多眼、多角、龐大 ──
def calamity():
    im, d = new()
    d.ellipse([230, 180, 670, 560], fill=FG)
    sym(d, lambda dd, s: poly(dd, [(90, 240), (200, 40), (250, 230)], s))
    sym(d, lambda dd, s: poly(dd, [(255, 200), (330, 60), (355, 210)], s))
    for cx, cy, r in ((360, 300, 32), (450, 265, 40), (540, 300, 32),
                      (395, 380, 24), (505, 380, 24)):
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=BG)
    d.polygon([(340, 450), (560, 450), (450, 540)], fill=BG)
    d.polygon([(260, 520), (640, 520), (720, 690), (180, 690)], fill=FG)
    sym(d, lambda dd, s: poly(dd, [(200, 380), (330, 330), (350, 480), (215, 520)], s))
    return im


# ── 10 虛空之影：破碎、不對稱、最龐大 ──
def voidshade():
    im, d = new()
    sym(d, lambda dd, s: poly(dd, [(60, 120), (300, 40), (340, 300), (120, 380)], s))
    d.ellipse([300, 200, 600, 500], fill=FG)
    d.polygon([(240, 460), (660, 460), (780, 690), (120, 690)], fill=FG)
    for cx, cy, r in ((385, 320, 46), (515, 320, 46)):
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=BG)
    d.polygon([(360, 400), (540, 400), (450, 470)], fill=BG)
    # 破碎缺口
    for x, y, w2, h2 in ((300, 230, 60, 26), (560, 250, 55, 24),
                         (320, 540, 90, 30), (520, 570, 80, 26)):
        d.rectangle([x, y, x + w2, y + h2], fill=BG)
    sym(d, lambda dd, s: poly(dd, [(150, 520), (300, 470), (320, 660), (170, 690)], s))
    return im


BOSSES = [
    ('1-troll', troll), ('2-cerberus', cerberus), ('3-medusa', medusa),
    ('4-abyssknight', knight), ('5-frostdragon', frostdragon),
    ('6-firedragon', firedragon), ('7-thundergiant', giant),
    ('8-demonlord', demonlord), ('9-calamity', calamity),
    ('10-voidshade', voidshade),
]

if __name__ == '__main__':
    for name, fn in BOSSES:
        p = os.path.join(OUT, name + '.png')
        fn().save(p)
        print('  ', p)
    print('共', len(BOSSES), '張')
