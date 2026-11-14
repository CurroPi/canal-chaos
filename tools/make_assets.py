"""Makes the source images for @capacitor/assets from the 1024px app icon (pixel art, flat colours):
  icon-only.png        the icon itself
  icon-background.png  solid background colour (Android adaptive icon, back layer)
  icon-foreground.png  the face on a TRANSPARENT background, shrunk to sit inside Android's safe zone
  splash.png / splash-dark.png  the face centred on the same blue, 2732x2732
Nearest-neighbour only, so the pixels stay crisp. Usage: python3 -I make_assets.py <icon.png> <out_dir>"""
import os
import shutil
import struct
import sys
import zlib


def read_png_rgb(path):
    data = open(path, 'rb').read()
    pos, idat = 8, b''
    while pos < len(data):
        length, kind = struct.unpack('>I4s', data[pos:pos + 8])
        body = data[pos + 8:pos + 8 + length]
        if kind == b'IHDR':
            width, height, depth, ctype, _, _, interlace = struct.unpack('>IIBBBBB', body)
            assert (depth, ctype, interlace) == (8, 2, 0), 'expected 8-bit RGB, not interlaced'
        elif kind == b'IDAT':
            idat += body
        pos += 12 + length
    raw = zlib.decompress(idat)
    stride = width * 3
    rows, prev = [], bytearray(stride)
    for y in range(height):
        f = raw[y * (stride + 1)]
        line = bytearray(raw[y * (stride + 1) + 1:(y + 1) * (stride + 1)])
        for i in range(stride):
            a = line[i - 3] if i >= 3 else 0
            b = prev[i]
            c = prev[i - 3] if i >= 3 else 0
            if f == 1:
                line[i] = (line[i] + a) & 255
            elif f == 2:
                line[i] = (line[i] + b) & 255
            elif f == 3:
                line[i] = (line[i] + (a + b) // 2) & 255
            elif f == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                line[i] = (line[i] + (a if pa <= pb and pa <= pc else (b if pb <= pc else c))) & 255
        rows.append(line)
        prev = line
    return width, height, rows


def chunk(kind, body):
    return struct.pack('>I', len(body)) + kind + body + struct.pack('>I', zlib.crc32(kind + body) & 0xffffffff)


def write_png(path, width, height, rows, channels):
    raw = b''.join(b'\x00' + bytes(r) for r in rows)
    ctype = 2 if channels == 3 else 6
    open(path, 'wb').write(
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, ctype, 0, 0, 0))
        + chunk(b'IDAT', zlib.compress(raw, 9))
        + chunk(b'IEND', b''))


src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
W, H, rows = read_png_rgb(src)
bg = bytes(rows[0][0:3])
print('background colour: #%02x%02x%02x' % tuple(bg))

# icon-only: the icon as it is
shutil.copy(src, os.path.join(out, 'icon-only.png'))

# icon-background: one flat colour
write_png(os.path.join(out, 'icon-background.png'), W, H, [bg * W for _ in range(H)], 3)

# icon-foreground: face on transparent, scaled to 85% and centred (the tool then fits it inside Android's 66% safe zone)
n = round(W * 0.85)
off = (W - n) // 2
fg = [bytearray(W * 4) for _ in range(H)]
for y in range(n):
    srow = rows[int(y * H / n)]
    for x in range(n):
        sx = int(x * W / n) * 3
        px = bytes(srow[sx:sx + 3])
        if px != bg:
            i = (off + x) * 4
            fg[off + y][i:i + 4] = px + b'\xff'
write_png(os.path.join(out, 'icon-foreground.png'), W, H, fg, 4)

# splash: the icon centred on a 2732x2732 field of the same blue
S = 2732
o = (S - W) // 2
splash = []
for y in range(S):
    if o <= y < o + H:
        r = rows[y - o]
        splash.append(bytearray(bg * o) + bytearray(r) + bytearray(bg * (S - o - W)))
    else:
        splash.append(bytearray(bg * S))
for name in ('splash.png', 'splash-dark.png'):
    write_png(os.path.join(out, name), S, S, splash, 3)
print('wrote', sorted(os.listdir(out)))
