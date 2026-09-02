# -*- coding: utf-8 -*-
"""小怪與武器的剪影（第二版）
   跟 BOSS 一樣走「剪影轉 ASCII」，但多加了灰階內部細節，
   轉出來會有大量符號堆疊出質感，而不是一坨實心。
     黑 FG   → 實心 #
     灰 MID  → 中間調，轉出來變成 = : 之類的符號
     白 BG   → 空白
"""
import os, math
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), 'mob_img')
os.makedirs(OUT, exist_ok=True)
FG, MID, BG = 0, 128, 255


def cv(w, h):
    im = Image.new('L', (w, h), BG)
    return im, ImageDraw.Draw(im), w, h


def scales(d, box, step=34, fill=MID):
    """在區域內畫一排排鱗片弧線，製造質感"""
    x0, y0, x1, y1 = box
    y = y0
    row = 0
    while y < y1:
        x = x0 + (step // 2 if row % 2 else 0)
        while x < x1:
            d.arc([x, y, x + step, y + step], 200, 340, fill=fill, width=5)
            x += step
        y += step // 2
        row += 1


def stripes(d, box, n=6, fill=MID, horiz=True):
    x0, y0, x1, y1 = box
    for i in range(n):
        if horiz:
            y = y0 + (y1 - y0) * (i + .5) / n
            d.line([(x0, y), (x1, y)], fill=fill, width=6)
        else:
            x = x0 + (x1 - x0) * (i + .5) / n
            d.line([(x, y0), (x, y1)], fill=fill, width=6)


def sym(d, fn, W):
    fn(d, 1, W); fn(d, -1, W)


def poly(d, pts, s, W, fill=FG):
    d.polygon([(W // 2 + s * x, y) for x, y in pts], fill=fill)


# ══════════════ 十隻個人小怪 ══════════════
def slime():
    im, d, W, H = cv(880, 560)
    d.ellipse([120, 60, 760, 500], fill=FG)
    d.ellipse([200, 380, 680, 545], fill=FG)
    d.ellipse([200, 130, 680, 430], fill=MID)          # 內部果凍感
    d.ellipse([260, 190, 420, 330], fill=BG)           # 眼
    d.ellipse([460, 190, 620, 330], fill=BG)
    d.ellipse([305, 235, 375, 300], fill=FG)           # 瞳
    d.ellipse([505, 235, 575, 300], fill=FG)
    d.arc([330, 330, 550, 440], 20, 160, fill=FG, width=18)
    d.ellipse([220, 110, 330, 190], fill=BG)           # 高光
    return im


def bat():
    im, d, W, H = cv(1000, 500)
    sym(d, lambda dd, s, W: poly(dd, [(70, 130), (450, 30), (430, 280), (300, 220),
                                      (330, 360), (100, 330)], s, W), W)
    for s in (1, -1):
        for i in range(3):
            x = W // 2 + s * (140 + i * 90)
            d.line([(W // 2 + s * 80, 150), (x, 300 + i * 20)], fill=MID, width=6)
    d.ellipse([390, 120, 610, 340], fill=FG)
    sym(d, lambda dd, s, W: poly(dd, [(20, 125), (65, 10), (105, 130)], s, W), W)
    d.ellipse([420, 180, 475, 240], fill=BG)
    d.ellipse([525, 180, 580, 240], fill=BG)
    d.polygon([(455, 270), (545, 270), (500, 320)], fill=BG)
    d.polygon([(465, 300), (485, 340), (500, 300)], fill=FG)   # 尖牙
    d.polygon([(500, 300), (515, 340), (535, 300)], fill=FG)
    return im


def goblin():
    im, d, W, H = cv(880, 700)
    d.ellipse([260, 40, 620, 330], fill=FG)
    sym(d, lambda dd, s, W: poly(dd, [(130, 120), (300, 20), (150, 230)], s, W), W)
    d.ellipse([310, 130, 385, 205], fill=BG)
    d.ellipse([495, 130, 570, 205], fill=BG)
    d.ellipse([335, 155, 370, 190], fill=FG)
    d.ellipse([520, 155, 555, 190], fill=FG)
    d.polygon([(370, 250), (510, 250), (440, 305)], fill=BG)
    for i in range(4):
        x = 385 + i * 34
        d.polygon([(x, 250), (x + 14, 285), (x + 28, 250)], fill=FG)
    d.polygon([(300, 320), (580, 320), (630, 560), (250, 560)], fill=FG)
    stripes(d, (300, 360, 580, 540), 5)
    d.rectangle([320, 540, 400, 690], fill=FG)
    d.rectangle([480, 540, 560, 690], fill=FG)
    d.rectangle([650, 100, 700, 580], fill=FG)                 # 刀
    d.polygon([(635, 100), (715, 100), (675, 20)], fill=FG)
    d.rectangle([620, 560, 730, 600], fill=FG)
    return im


def skeleton():
    im, d, W, H = cv(940, 720)
    d.ellipse([310, 30, 630, 330], fill=FG)
    d.ellipse([355, 130, 435, 215], fill=BG)
    d.ellipse([505, 130, 585, 215], fill=BG)
    d.polygon([(450, 225), (490, 225), (470, 265)], fill=BG)
    for i in range(5):
        d.rectangle([365 + i * 45, 270, 395 + i * 45, 315], fill=BG)
    d.polygon([(350, 330), (590, 330), (630, 590), (310, 590)], fill=FG)
    for i in range(5):                                          # 肋骨
        y = 380 + i * 45
        d.line([(340, y), (600, y)], fill=BG, width=14)
    d.line([(470, 340), (470, 590)], fill=MID, width=16)        # 脊椎
    d.rectangle([350, 570, 430, 710], fill=FG)
    d.rectangle([510, 570, 590, 710], fill=FG)
    d.polygon([(720, 20), (770, 20), (770, 520), (745, 570), (720, 520)], fill=FG)
    d.line([(745, 40), (745, 510)], fill=MID, width=8)
    d.rectangle([665, 500, 825, 540], fill=FG)
    return im


def treant():
    im, d, W, H = cv(920, 740)
    for i in range(11):
        a = math.pi * (0.06 + 0.88 * i / 10)
        x, y = 460 - math.cos(a) * 300, 230 - math.sin(a) * 190
        d.ellipse([x - 68, y - 48, x + 68, y + 48], fill=FG)
        d.ellipse([x - 40, y - 26, x + 40, y + 26], fill=MID)
    d.polygon([(340, 230), (580, 230), (630, 590), (290, 590)], fill=FG)
    stripes(d, (330, 280, 590, 570), 7, horiz=False)            # 樹皮紋
    d.ellipse([355, 290, 425, 365], fill=BG)
    d.ellipse([495, 290, 565, 365], fill=BG)
    d.polygon([(370, 430), (550, 430), (460, 500)], fill=BG)
    for x, sgn in ((290, -1), (630, 1)):
        d.polygon([(x, 330), (x + sgn * 130, 260), (x + sgn * 70, 450)], fill=FG)
    d.rectangle([330, 570, 410, 730], fill=FG)
    d.rectangle([510, 570, 590, 730], fill=FG)
    return im


def wolf():
    im, d, W, H = cv(1060, 560)
    d.ellipse([110, 210, 760, 460], fill=FG)
    scales(d, (180, 250, 700, 420), 46)                          # 毛
    d.ellipse([620, 90, 900, 350], fill=FG)
    d.polygon([(645, 125), (690, 10), (745, 130)], fill=FG)
    d.polygon([(780, 130), (835, 10), (870, 125)], fill=FG)
    d.polygon([(898, 190), (1010, 235), (898, 280)], fill=FG)
    d.ellipse([700, 165, 760, 225], fill=BG)
    d.ellipse([805, 165, 865, 225], fill=BG)
    d.ellipse([975, 240, 1010, 265], fill=BG)
    for i in range(4):
        d.polygon([(880 + i * 22, 285), (890 + i * 22, 325), (900 + i * 22, 285)], fill=BG)
    for x in (180, 330, 480, 630):
        d.rectangle([x, 420, x + 62, 545], fill=FG)
    d.polygon([(110, 290), (10, 180), (55, 340)], fill=FG)
    return im


def beetle():
    im, d, W, H = cv(900, 620)
    d.ellipse([170, 90, 730, 520], fill=FG)
    d.line([(450, 100), (450, 510)], fill=BG, width=16)
    for i in range(4):
        d.arc([215 + i * 28, 145 + i * 34, 685 - i * 28, 465 - i * 34], 200, 340, fill=MID, width=10)
    scales(d, (230, 200, 670, 460), 52)
    d.ellipse([340, 20, 560, 160], fill=FG)
    d.ellipse([372, 55, 425, 110], fill=BG)
    d.ellipse([475, 55, 528, 110], fill=BG)
    sym(d, lambda dd, s, W: poly(dd, [(55, 10), (150, -70), (160, 40)], s, W), W)
    for y in (180, 290, 400):
        d.polygon([(170, y), (30, y - 46), (55, y + 46)], fill=FG)
        d.polygon([(730, y), (870, y - 46), (845, y + 46)], fill=FG)
    return im


def scorpion():
    im, d, W, H = cv(1080, 620)
    d.ellipse([250, 270, 720, 490], fill=FG)
    stripes(d, (280, 300, 690, 460), 6, horiz=False)
    d.ellipse([660, 250, 880, 430], fill=FG)
    for i, (x, y, r) in enumerate([(620, 190, 52), (710, 110, 48), (815, 75, 44), (910, 125, 40)]):
        d.ellipse([x - r, y - r, x + r, y + r], fill=FG)
        d.ellipse([x - r + 14, y - r + 14, x + r - 14, y + r - 14], fill=MID)
    d.polygon([(950, 145), (1050, 40), (1000, 180)], fill=FG)
    d.ellipse([705, 300, 760, 355], fill=BG)
    d.ellipse([790, 300, 845, 355], fill=BG)
    for dy in (0, 70):
        d.polygon([(250, 340 + dy), (60, 240 + dy), (25, 330 + dy), (165, 395 + dy)], fill=FG)
        d.polygon([(120, 270 + dy), (30, 285 + dy), (95, 330 + dy)], fill=BG)
    for x in (320, 430, 540):
        d.polygon([(x, 480), (x - 46, 600), (x + 18, 600)], fill=FG)
    return im


def hawk():
    im, d, W, H = cv(1160, 580)
    sym(d, lambda dd, s, W: poly(dd, [(80, 230), (560, 20), (540, 190),
                                      (380, 160), (400, 330), (110, 350)], s, W), W)
    for s in (1, -1):
        for i in range(5):
            d.line([(W // 2 + s * 110, 220), (W // 2 + s * (240 + i * 66), 60 + i * 44)],
                   fill=MID, width=7)
    d.ellipse([460, 140, 700, 380], fill=FG)
    d.polygon([(700, 230), (830, 262), (700, 295)], fill=FG)
    d.ellipse([505, 195, 565, 255], fill=BG)
    d.ellipse([600, 195, 660, 255], fill=BG)
    d.polygon([(490, 370), (670, 370), (710, 560), (450, 560)], fill=FG)
    scales(d, (490, 390, 670, 540), 40)
    for x in (505, 620):
        d.rectangle([x, 540, x + 36, 578], fill=FG)
    return im


def lava():
    im, d, W, H = cv(1160, 700)
    d.ellipse([140, 160, 1020, 560], fill=FG)
    d.polygon([(200, 530), (960, 530), (1030, 695), (130, 695)], fill=FG)
    for i in range(6):
        x = 230 + i * 145
        d.polygon([(x, 180), (x + 46, 30), (x + 92, 185)], fill=FG)
        d.polygon([(x + 20, 175), (x + 46, 90), (x + 72, 178)], fill=MID)
    scales(d, (230, 250, 940, 520), 58)
    for cx in (380, 580, 780):
        d.ellipse([cx - 62, 260, cx + 62, 380], fill=BG)
        d.ellipse([cx - 26, 300, cx + 26, 350], fill=FG)
    d.polygon([(320, 430), (840, 430), (580, 520)], fill=BG)
    for i in range(8):
        x = 340 + i * 62
        d.polygon([(x, 430), (x + 28, 480), (x + 56, 430)], fill=FG)
    return im


# ══════════════ 三把直式武器（更多細節）══════════════
def w_staff():
    im, d, W, H = cv(460, 1000)
    cx = W // 2
    d.rectangle([cx - 44, 330, cx + 44, 1000], fill=FG)
    for y in range(370, 1000, 96):
        d.rectangle([cx - 56, y, cx + 56, y + 26], fill=MID)
        d.rectangle([cx - 50, y + 6, cx + 50, y + 20], fill=FG)
    d.polygon([(cx - 92, 330), (cx + 92, 330), (cx + 58, 258), (cx - 58, 258)], fill=FG)
    d.ellipse([cx - 140, 30, cx + 140, 285], fill=FG)
    d.ellipse([cx - 100, 72, cx + 100, 246], fill=BG)
    for i in range(8):                                    # 環上的雕飾
        a = i * math.pi / 4
        x, y = cx + math.cos(a) * 120, 158 + math.sin(a) * 108
        d.ellipse([x - 16, y - 16, x + 16, y + 16], fill=FG)
    d.ellipse([cx - 58, 100, cx + 58, 216], fill=FG)      # 寶珠
    d.ellipse([cx - 40, 118, cx + 40, 198], fill=MID)
    d.ellipse([cx - 28, 126, cx - 2, 158], fill=BG)
    return im


def w_bow():
    im, d, W, H = cv(520, 1000)
    cx = W // 2
    d.arc([cx - 300, 50, cx + 230, 950], 250, 110, fill=FG, width=52)
    d.arc([cx - 285, 70, cx + 215, 930], 250, 110, fill=MID, width=18)
    d.line([(cx + 118, 118), (cx + 118, 882)], fill=FG, width=14)
    d.rectangle([cx - 40, 430, cx + 40, 600], fill=FG)
    for y in range(455, 590, 34):
        d.rectangle([cx - 48, y, cx + 48, y + 12], fill=MID)
    d.line([(cx - 50, 505), (cx + 380, 505)], fill=FG, width=26)
    d.line([(cx - 40, 505), (cx + 360, 505)], fill=MID, width=8)
    d.polygon([(cx + 380, 468), (cx + 480, 505), (cx + 380, 542)], fill=FG)
    for dy in (-40, 0, 40):
        d.polygon([(cx - 52, 505 + dy // 2), (cx + 30, 505), (cx - 52, 505 - dy // 2)], fill=FG)
    return im


def w_dagger():
    im, d, W, H = cv(460, 1000)
    cx = W // 2
    d.polygon([(cx, 20), (cx + 76, 210), (cx + 76, 610), (cx - 76, 610), (cx - 76, 210)], fill=FG)
    d.polygon([(cx, 70), (cx + 44, 230), (cx + 44, 580), (cx - 44, 580), (cx - 44, 230)], fill=MID)
    d.line([(cx, 60), (cx, 585)], fill=BG, width=14)
    d.rectangle([cx - 160, 610, cx + 160, 682], fill=FG)
    d.ellipse([cx - 190, 618, cx - 130, 674], fill=FG)
    d.ellipse([cx + 130, 618, cx + 190, 674], fill=FG)
    d.rectangle([cx - 48, 682, cx + 48, 900], fill=FG)
    for y in range(706, 890, 40):
        d.rectangle([cx - 60, y, cx + 60, y + 16], fill=MID)
    d.ellipse([cx - 76, 878, cx + 76, 1000], fill=FG)
    d.ellipse([cx - 40, 908, cx + 40, 972], fill=MID)
    return im


MOBS = [('1-slime', slime), ('2-bat', bat), ('3-goblin', goblin), ('4-skeleton', skeleton),
        ('5-treant', treant), ('6-frostwolf', wolf), ('7-beetle', beetle),
        ('8-scorpion', scorpion), ('9-thunderhawk', hawk), ('10-lavabeast', lava)]
WEAPONS = [('w-staff', w_staff), ('w-bow', w_bow), ('w-dagger', w_dagger)]

if __name__ == '__main__':
    for name, fn in MOBS + WEAPONS:
        fn().save(os.path.join(OUT, name + '.png'))
    print('已畫出', len(MOBS), '隻小怪 ＋', len(WEAPONS), '把武器（含灰階細節）')
