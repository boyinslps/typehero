# -*- coding: utf-8 -*-
"""畫十隻個人小怪 ＋ 三把直式武器的剪影，交給 ascii-art skill 轉 ASCII。
   武器參考 Minecraft 的第一人稱手持感：直立、粗壯、下方延伸出畫面。"""
import os, math
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), 'mob_img')
os.makedirs(OUT, exist_ok=True)
FG, BG = 0, 255


def cv(w=800, h=620):
    im = Image.new('L', (w, h), BG)
    return im, ImageDraw.Draw(im), w, h


def sym(d, fn, W):
    fn(d, 1, W); fn(d, -1, W)


def poly(d, pts, s, W, fill=FG):
    d.polygon([(W // 2 + s * x, y) for x, y in pts], fill=fill)


# ══════════ 個人小怪（越後面越大隻）══════════
def slime():
    im, d, W, H = cv(760, 520)
    d.ellipse([150, 90, 610, 470], fill=FG)
    d.ellipse([230, 380, 530, 500], fill=FG)
    d.ellipse([255, 210, 335, 300], fill=BG)
    d.ellipse([425, 210, 505, 300], fill=BG)
    d.arc([300, 300, 460, 400], 20, 160, fill=BG, width=16)
    return im


def bat():
    im, d, W, H = cv(900, 460)
    sym(d, lambda dd, s, W: poly(dd, [(60, 120), (400, 40), (380, 260), (240, 200),
                                      (270, 330), (90, 300)], s, W), W)
    d.ellipse([350, 130, 550, 330], fill=FG)
    sym(d, lambda dd, s, W: poly(dd, [(20, 130), (60, 20), (95, 135)], s, W), W)
    d.ellipse([385, 190, 425, 235], fill=BG)
    d.ellipse([475, 190, 515, 235], fill=BG)
    d.polygon([(425, 265), (475, 265), (450, 305)], fill=BG)
    return im


def goblin():
    im, d, W, H = cv(760, 620)
    d.ellipse([250, 60, 510, 300], fill=FG)
    sym(d, lambda dd, s, W: poly(dd, [(120, 130), (250, 40), (135, 210)], s, W), W)
    d.ellipse([290, 140, 340, 195], fill=BG)
    d.ellipse([420, 140, 470, 195], fill=BG)
    d.polygon([(330, 230), (430, 230), (380, 275)], fill=BG)
    d.polygon([(280, 290), (480, 290), (520, 500), (240, 500)], fill=FG)
    d.rectangle([300, 480, 360, 610], fill=FG)
    d.rectangle([400, 480, 460, 610], fill=FG)
    d.rectangle([540, 120, 580, 520], fill=FG)          # 手上的刀
    d.polygon([(530, 120), (590, 120), (560, 50)], fill=FG)
    return im


def skeleton():
    im, d, W, H = cv(820, 640)
    d.ellipse([290, 50, 530, 290], fill=FG)
    d.ellipse([330, 130, 385, 195], fill=BG)
    d.ellipse([435, 130, 490, 195], fill=BG)
    for i in range(4):
        d.rectangle([345 + i * 35, 225, 365 + i * 35, 265], fill=BG)
    d.polygon([(320, 290), (500, 290), (540, 520), (280, 520)], fill=FG)
    for i in range(4):
        d.rectangle([300, 330 + i * 45, 520, 348 + i * 45], fill=BG)   # 肋骨
    d.rectangle([320, 500, 380, 630], fill=FG)
    d.rectangle([440, 500, 500, 630], fill=FG)
    d.polygon([(620, 40), (660, 40), (660, 470), (640, 510), (620, 470)], fill=FG)
    d.rectangle([575, 450, 705, 480], fill=FG)
    return im


def treant():
    im, d, W, H = cv(800, 660)
    for i in range(9):
        a = math.pi * (0.1 + 0.8 * i / 8)
        x, y = 400 - math.cos(a) * 250, 210 - math.sin(a) * 160
        d.ellipse([x - 55, y - 40, x + 55, y + 40], fill=FG)
    d.polygon([(300, 210), (500, 210), (540, 520), (260, 520)], fill=FG)
    d.ellipse([320, 270, 380, 335], fill=BG)
    d.ellipse([420, 270, 480, 335], fill=BG)
    d.polygon([(330, 390), (470, 390), (400, 450)], fill=BG)
    for x in (250, 550):
        d.polygon([(x, 300), (x + (60 if x < 400 else -60), 250),
                   (x + (30 if x < 400 else -30), 400)], fill=FG)
    d.rectangle([300, 500, 360, 650], fill=FG)
    d.rectangle([440, 500, 500, 650], fill=FG)
    return im


def wolf():
    im, d, W, H = cv(920, 520)
    d.ellipse([120, 220, 700, 430], fill=FG)
    d.ellipse([580, 120, 830, 340], fill=FG)
    d.polygon([(600, 150), (640, 40), (690, 155)], fill=FG)
    d.polygon([(720, 155), (770, 40), (800, 150)], fill=FG)
    d.polygon([(830, 210), (900, 250), (830, 285)], fill=FG)
    d.ellipse([650, 190, 700, 240], fill=BG)
    d.ellipse([745, 190, 795, 240], fill=BG)
    for x in (190, 330, 470, 600):
        d.rectangle([x, 390, x + 55, 505], fill=FG)
    d.polygon([(120, 300), (20, 210), (60, 340)], fill=FG)               # 尾
    return im


def beetle():
    im, d, W, H = cv(800, 560)
    d.ellipse([160, 90, 640, 470], fill=FG)
    d.line([(400, 100), (400, 460)], fill=BG, width=14)
    for i in range(3):
        d.arc([200 + i * 25, 140 + i * 30, 600 - i * 25, 420 - i * 30], 200, 340, fill=BG, width=9)
    d.ellipse([300, 30, 500, 150], fill=FG)
    d.ellipse([330, 60, 375, 105], fill=BG)
    d.ellipse([425, 60, 470, 105], fill=BG)
    sym(d, lambda dd, s, W: poly(dd, [(60, 20), (140, -50), (150, 40)], s, W), W)
    for y in (170, 260, 350):
        d.polygon([(160, y), (40, y - 40), (60, y + 40)], fill=FG)
        d.polygon([(640, y), (760, y - 40), (740, y + 40)], fill=FG)
    return im


def scorpion():
    im, d, W, H = cv(940, 560)
    d.ellipse([230, 250, 660, 450], fill=FG)
    d.ellipse([600, 240, 800, 400], fill=FG)
    for i, (x, y) in enumerate([(560, 180), (640, 110), (740, 80), (830, 130)]):
        d.ellipse([x - 45, y - 45, x + 45, y + 45], fill=FG)
    d.polygon([(870, 150), (930, 60), (900, 180)], fill=FG)              # 毒針
    d.ellipse([650, 280, 695, 325], fill=BG)
    d.ellipse([720, 280, 765, 325], fill=BG)
    for side, x0 in ((1, 230), (1, 180)):
        d.polygon([(x0, 320), (60, 220), (30, 300), (150, 360)], fill=FG)   # 螯
        d.polygon([(x0, 380), (70, 400), (40, 470), (170, 430)], fill=FG)
    for x in (300, 400, 500):
        d.polygon([(x, 440), (x - 40, 540), (x + 15, 540)], fill=FG)
    return im


def hawk():
    im, d, W, H = cv(1000, 520)
    sym(d, lambda dd, s, W: poly(dd, [(70, 210), (490, 30), (470, 180),
                                      (330, 150), (350, 300), (100, 320)], s, W), W)
    d.ellipse([400, 150, 600, 350], fill=FG)
    d.polygon([(600, 230), (700, 255), (600, 285)], fill=FG)             # 喙
    d.ellipse([440, 200, 490, 250], fill=BG)
    d.ellipse([515, 200, 565, 250], fill=BG)
    d.polygon([(430, 340), (570, 340), (600, 500), (400, 500)], fill=FG)
    for x in (440, 530):
        d.rectangle([x, 480, x + 30, 515], fill=FG)
    return im


def lava():
    im, d, W, H = cv(1000, 620)
    d.ellipse([120, 150, 880, 500], fill=FG)
    d.polygon([(180, 480), (820, 480), (880, 615), (120, 615)], fill=FG)
    for i in range(5):
        x = 200 + i * 150
        d.polygon([(x, 170), (x + 40, 40), (x + 80, 175)], fill=FG)      # 背刺
    for cx in (330, 500, 670):
        d.ellipse([cx - 55, 240, cx + 55, 350], fill=BG)
    d.polygon([(280, 400), (720, 400), (500, 480)], fill=BG)
    for i in range(7):
        x = 300 + i * 60
        d.polygon([(x, 400), (x + 25, 445), (x + 50, 400)], fill=FG)     # 牙
    return im


# ══════════ 三把武器：直立、下緣延伸出畫面（Minecraft 感）══════════
def w_staff():
    im, d, W, H = cv(360, 900)
    cx = W // 2
    d.rectangle([cx - 34, 300, cx + 34, 900], fill=FG)                   # 杖身
    for y in range(340, 900, 90):                                        # 纏繩
        d.rectangle([cx - 42, y, cx + 42, y + 22], fill=BG)
        d.rectangle([cx - 38, y + 4, cx + 38, y + 18], fill=FG)
    d.polygon([(cx - 70, 300), (cx + 70, 300), (cx + 46, 240), (cx - 46, 240)], fill=FG)
    d.ellipse([cx - 105, 40, cx + 105, 260], fill=FG)                    # 杖頭
    d.ellipse([cx - 72, 75, cx + 72, 228], fill=BG)
    d.ellipse([cx - 44, 110, cx + 44, 196], fill=FG)                     # 寶珠
    d.ellipse([cx - 20, 128, cx + 6, 158], fill=BG)                      # 高光
    return im


def w_bow():
    im, d, W, H = cv(420, 900)
    cx = W // 2
    d.arc([cx - 250, 60, cx + 190, 860], 250, 110, fill=FG, width=40)    # 弓臂
    d.line([(cx + 96, 120), (cx + 96, 800)], fill=FG, width=12)          # 弓弦
    d.rectangle([cx - 30, 400, cx + 30, 540], fill=FG)                   # 握把
    d.line([(cx - 40, 460), (cx + 300, 460)], fill=FG, width=22)         # 箭
    d.polygon([(cx + 300, 430), (cx + 380, 460), (cx + 300, 490)], fill=FG)
    d.polygon([(cx - 40, 425), (cx + 20, 460), (cx - 40, 495)], fill=FG)
    return im


def w_dagger():
    im, d, W, H = cv(360, 900)
    cx = W // 2
    d.polygon([(cx, 30), (cx + 58, 190), (cx + 58, 560), (cx - 58, 560), (cx - 58, 190)], fill=FG)
    d.line([(cx, 60), (cx, 540)], fill=BG, width=10)                     # 血槽
    d.rectangle([cx - 120, 560, cx + 120, 620], fill=FG)                 # 護手
    d.rectangle([cx - 38, 620, cx + 38, 830], fill=FG)                   # 握把
    for y in range(650, 820, 46):
        d.rectangle([cx - 46, y, cx + 46, y + 14], fill=BG)
    d.ellipse([cx - 58, 810, cx + 58, 900], fill=FG)                     # 柄頭
    return im


MOBS = [('1-slime', slime), ('2-bat', bat), ('3-goblin', goblin), ('4-skeleton', skeleton),
        ('5-treant', treant), ('6-frostwolf', wolf), ('7-beetle', beetle),
        ('8-scorpion', scorpion), ('9-thunderhawk', hawk), ('10-lavabeast', lava)]
WEAPONS = [('w-staff', w_staff), ('w-bow', w_bow), ('w-dagger', w_dagger)]

if __name__ == '__main__':
    for name, fn in MOBS + WEAPONS:
        fn().save(os.path.join(OUT, name + '.png'))
    print('已畫出', len(MOBS), '隻小怪 ＋', len(WEAPONS), '把武器')
