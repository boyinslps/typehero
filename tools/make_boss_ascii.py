# -*- coding: utf-8 -*-
"""用 ascii-art skill 把 BOSS 剪影轉成 ASCII，再收斂成乾淨的遊戲風格。

skill 的輸出是給照片用的，字元階數很多、看起來雜。
我們的來源是純黑白剪影，所以把字元依「密度」壓成三階：
  實心 #  ／ 邊緣 =  ／ 背景空白
再把邊緣依上下左右關係換成 / \ | _ 之類的線條，讓輪廓有手繪感。
"""
import os, re, subprocess, sys, glob, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = r'C:/Users/Public/工作/自動化/.agents/skills/ascii-art/scripts/convert.py'
IMG = os.path.join(HERE, 'boss_img')
TMP = os.path.join(HERE, 'ascii')
OUT = os.path.join(HERE, 'boss_ascii')

# classic 風格的字元由淡到濃
RAMP = " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$"
DENS = {c: i / (len(RAMP) - 1) for i, c in enumerate(RAMP)}


def density(ch):
    return DENS.get(ch, 1.0 if not ch.isspace() else 0.0)


def convert(png, cols):
    for f in glob.glob(os.path.join(TMP, '*.txt')):
        os.remove(f)
    subprocess.run([sys.executable, SKILL, '--input', png,
                    '-s', 'classic', '-c', str(cols), '-e', 'txt'],
                   capture_output=True, check=True)
    txt = sorted(glob.glob(os.path.join(TMP, '*.txt')),
                 key=os.path.getmtime)[-1]
    return open(txt, encoding='utf-8').read().split('\n')


def clean(rows, solid=0.55, edge=0.18):
    """三階化：實心 / 邊緣 / 空白"""
    grid = [[' '] * max(len(r) for r in rows) for _ in rows]
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            d = density(ch)
            grid[y][x] = '#' if d >= solid else ('=' if d >= edge else ' ')
    return grid


def outline(grid):
    """把實心區塊的外緣換成線條，內部保留 #，看起來像手繪輪廓"""
    H, W = len(grid), len(grid[0])
    get = lambda y, x: grid[y][x] if 0 <= y < H and 0 <= x < W else ' '
    out = [row[:] for row in grid]
    for y in range(H):
        for x in range(W):
            if grid[y][x] != '#':
                continue
            up, dn = get(y - 1, x) == '#', get(y + 1, x) == '#'
            lf, rt = get(y, x - 1) == '#', get(y, x + 1) == '#'
            if up and dn and lf and rt:
                continue                        # 內部，保持實心
            if not up and not dn:
                out[y][x] = '_'
            elif not lf and not rt:
                out[y][x] = '|'
            elif not up:
                out[y][x] = '_' if (lf and rt) else ('/' if rt else '\\')
            elif not dn:
                out[y][x] = '_' if (lf and rt) else ('\\' if rt else '/')
            elif not lf:
                out[y][x] = '|'
            elif not rt:
                out[y][x] = '|'
    return out


def trim(grid):
    rows = [''.join(r).rstrip() for r in grid]
    while rows and not rows[0].strip():
        rows.pop(0)
    while rows and not rows[-1].strip():
        rows.pop()
    if not rows:
        return ''
    pad = min(len(r) - len(r.lstrip()) for r in rows if r.strip())
    return '\n'.join(r[pad:] for r in rows)


BOSSES = ['1-troll', '2-cerberus', '3-medusa', '4-abyssknight', '5-frostdragon',
          '6-firedragon', '7-thundergiant', '8-demonlord', '9-calamity', '10-voidshade']
# 越後面的 BOSS 畫得越大
COLS = [42, 44, 46, 48, 52, 54, 56, 58, 60, 62]

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for name, cols in zip(BOSSES, COLS):
        png = os.path.join(IMG, name + '.png')
        art = trim(outline(clean(convert(png, cols))))
        open(os.path.join(OUT, name + '.txt'), 'w', encoding='utf-8').write(art)
        w = max(len(l) for l in art.split('\n'))
        print(f'  {name:16s} {len(art.splitlines()):2d} 行 / {w:2d} 寬')
    shutil.rmtree(TMP, ignore_errors=True)
