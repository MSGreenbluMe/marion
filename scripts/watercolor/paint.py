"""
Procedural watercolour painter for Studio Marion.

Every shape is a polygon that is recursively deformed (midpoint displacement) into many
slightly different translucent glazes, the way real washes pile up. Pigments mix
subtractively (Beer–Lambert absorbance), dried edges darken, granulation and paper
grain are added, so the output reads as paint on paper.

Output: RGB images on white. On the site they are drawn with `mix-blend-mode: multiply`,
so the white disappears into the paper background exactly like real paint.

Run:  python3 scripts/watercolor/paint.py          (writes public/art/*.webp)
"""
from __future__ import annotations

import math
import os
import sys

import cv2
import numpy as np

OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'art')

# ---------------------------------------------------------------- pigments
# Colour of a fully saturated single layer on white (sRGB 0..1). Absorbance K = -ln(c).
PIGMENTS = {
    'forest': (0.20, 0.33, 0.25),
    'deep': (0.12, 0.22, 0.17),
    'sage': (0.55, 0.66, 0.52),
    'olive': (0.52, 0.56, 0.32),
    'ochre': (0.86, 0.66, 0.30),
    'gold': (0.90, 0.74, 0.40),
    'honey': (0.93, 0.70, 0.34),
    'rose': (0.88, 0.62, 0.60),
    'blush': (0.95, 0.80, 0.76),
    'umber': (0.55, 0.45, 0.38),
    'stone': (0.66, 0.63, 0.58),
    'indigo': (0.42, 0.47, 0.60),
}


def absorb(name: str) -> np.ndarray:
    c = np.clip(np.array(PIGMENTS[name], dtype=np.float32), 0.02, 0.999)
    return -np.log(c)


class Sheet:
    """A sheet of paper that accumulates pigment absorbance."""

    def __init__(self, w: int, h: int, seed: int):
        self.w, self.h = w, h
        self.A = np.zeros((h, w, 3), np.float32)
        self.rng = np.random.default_rng(seed)
        self._noise_cache: dict[int, np.ndarray] = {}

    # --- noise helpers
    def noise(self, scale: int) -> np.ndarray:
        """Smooth value noise in 0..1 with feature size ~scale px."""
        gw, gh = max(2, self.w // scale + 2), max(2, self.h // scale + 2)
        g = self.rng.random((gh, gw)).astype(np.float32)
        n = cv2.resize(g, (self.w + scale * 2, self.h + scale * 2), interpolation=cv2.INTER_CUBIC)
        ox, oy = self.rng.integers(0, scale), self.rng.integers(0, scale)
        n = n[oy:oy + self.h, ox:ox + self.w]
        n = (n - n.min()) / (np.ptp(n) + 1e-6)
        return n

    def grain(self) -> np.ndarray:
        g = self.rng.random((self.h, self.w)).astype(np.float32)
        g = cv2.GaussianBlur(g, (0, 0), 0.8)
        return (g - g.mean()) / (g.std() + 1e-6)

    # --- shape deformation (Tyler Hobbs style)
    def deform(self, pts: np.ndarray, var: np.ndarray, depth: int, amount: float) -> tuple[np.ndarray, np.ndarray]:
        for level in range(depth):
            n = len(pts)
            amt = amount * (0.5 ** level)  # finer detail moves less: soft, organic rims
            new_p, new_v = [], []
            for i in range(n):
                a, b = pts[i], pts[(i + 1) % n]
                va, vb = var[i], var[(i + 1) % n]
                length = float(np.linalg.norm(b - a))
                v = (va + vb) / 2
                off = np.clip(self.rng.normal(0, length * amt * v, 2), -length * 0.45, length * 0.45)
                mid = (a + b) / 2 + off
                new_p += [a, mid]
                new_v += [va, v * self.rng.uniform(0.75, 1.15)]
            pts, var = np.array(new_p), np.array(new_v)
        return pts, var

    @staticmethod
    def densify(pts: np.ndarray, max_len: float = 70.0) -> np.ndarray:
        """Split long edges so displacement stays proportional to local detail."""
        out = []
        for i in range(len(pts)):
            a, b = pts[i], pts[(i + 1) % len(pts)]
            k = max(1, int(np.ceil(np.linalg.norm(b - a) / max_len)))
            for j in range(k):
                out.append(a + (b - a) * j / k)
        return np.array(out, np.float32)

    def wash(self, poly, pigment: str, strength: float = 1.0, layers: int = 36,
             spread: float = 0.55, edge: float = 0.9, texture: float = 0.55,
             bloom: float = 0.0, var=None, soft: float = 1.2):
        """Paint one watercolour shape from a polygon (list of (x, y))."""
        pts = self.densify(np.array(poly, np.float32))
        if var is None:
            var = self.rng.uniform(0.6, 1.4, len(pts))
        var = np.asarray(var, np.float32)
        if len(var) != len(pts):
            var = np.interp(np.linspace(0, 1, len(pts)), np.linspace(0, 1, len(var)), var).astype(np.float32)
        base, bvar = self.deform(pts, var, 2, spread * 0.7)
        S = np.zeros((self.h, self.w), np.float32)
        tex = [self.noise(int(self.rng.integers(28, 90))) for _ in range(4)]
        per = 1.0 / layers
        for i in range(layers):
            p, _ = self.deform(base, bvar, 3, spread * 0.5)
            m = np.zeros((self.h, self.w), np.uint8)
            cv2.fillPoly(m, [np.round(p).astype(np.int32)], 255, lineType=cv2.LINE_AA)
            m = cv2.GaussianBlur(m, (0, 0), 1.6).astype(np.float32) / 255
            t = tex[i % 4]
            # random coverage per glaze: thresholded blotches
            cover = np.clip((t - self.rng.uniform(0.15, 0.45)) * 3.0, 0, 1)
            S += m * (1 - texture + texture * cover) * per
        if soft:
            S = cv2.GaussianBlur(S, (0, 0), soft)
        # dried edge: pigment migrates to the rim of the wet area
        if edge:
            rim = np.clip(S - cv2.GaussianBlur(S, (0, 0), 4.0), 0, None)
            S = S + rim * edge * 2.2
        if bloom:
            b = self.noise(int(self.rng.integers(40, 120)))
            S = S * (1 - bloom * np.clip((b - 0.6) * 4, 0, 1))
        # granulation
        S = S * (1 + 0.18 * self.grain()) * (0.85 + 0.3 * self.noise(14))
        self.A += np.clip(S, 0, None)[..., None] * absorb(pigment)[None, None, :] * strength

    def stroke(self, path, pigment: str, width: float = 3.0, strength: float = 1.0, taper: bool = True):
        """A brush line along a polyline, slightly wobbly and tapered."""
        path = np.array(path, np.float32)
        S = np.zeros((self.h, self.w), np.float32)
        for k in range(4):
            jitter = self.rng.normal(0, width * 0.15, path.shape)
            p = path + jitter
            n = len(p)
            for i in range(n - 1):
                t = i / max(1, n - 2)
                wdt = width * (math.sin(math.pi * t) * 0.7 + 0.3 if taper else 1.0)
                m = np.zeros((self.h, self.w), np.uint8)
                cv2.line(m, tuple(np.round(p[i]).astype(int)), tuple(np.round(p[i + 1]).astype(int)), 255,
                         max(1, int(round(wdt))), lineType=cv2.LINE_AA)
                S = np.maximum(S, m.astype(np.float32) / 255 * (0.55 + 0.1 * k))
        S = cv2.GaussianBlur(S, (0, 0), 0.7)
        S = S * (1 + 0.15 * self.grain())
        self.A += np.clip(S, 0, None)[..., None] * absorb(pigment)[None, None, :] * strength

    def splatter(self, cx, cy, radius, pigment, count=40, size=(1.0, 4.0), strength=0.6):
        S = np.zeros((self.h, self.w), np.float32)
        for _ in range(count):
            r = abs(self.rng.normal(0, radius))
            a = self.rng.uniform(0, 2 * math.pi)
            x, y = cx + r * math.cos(a), cy + r * math.sin(a)
            s = self.rng.uniform(*size)
            cv2.circle(S, (int(x), int(y)), max(1, int(s)), 1.0, -1, lineType=cv2.LINE_AA)
        S = cv2.GaussianBlur(S, (0, 0), 0.8)
        self.A += S[..., None] * absorb(pigment)[None, None, :] * strength

    def render(self, paper_tooth: float = 0.035) -> np.ndarray:
        T = np.exp(-self.A)
        tooth = self.noise(3) * 0.5 + self.noise(9) * 0.5
        T = T * (1 - paper_tooth * tooth[..., None] * (self.A.sum(-1, keepdims=True) > 0.02))
        img = np.clip(T * 255, 0, 255).astype(np.uint8)
        return cv2.cvtColor(img, cv2.COLOR_RGB2BGR)


# ---------------------------------------------------------------- shape helpers
def ellipse(cx, cy, rx, ry, n=14, rot=0.0, rng=None, wob=0.06):
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n
        r = 1 + (rng.normal(0, wob) if rng is not None else 0)
        x, y = rx * math.cos(a) * r, ry * math.sin(a) * r
        pts.append((cx + x * math.cos(rot) - y * math.sin(rot), cy + x * math.sin(rot) + y * math.cos(rot)))
    return pts


def leaf(cx, cy, length, width, angle, n=12):
    """Pointed leaf, base at (cx, cy), pointing along angle (radians)."""
    pts = []
    for i in range(n + 1):
        t = i / n
        pts.append((t * length, math.sin(math.pi * t) ** 0.85 * width))
    for i in range(n - 1, 0, -1):
        t = i / n
        pts.append((t * length, -math.sin(math.pi * t) ** 0.85 * width))
    ca, sa = math.cos(angle), math.sin(angle)
    return [(cx + x * ca - y * sa, cy + x * sa + y * ca) for x, y in pts]


def arch(x0, y0, w, h, n_arc=18):
    r = w / 2
    pts = [(x0, y0 + h), (x0, y0 + r)]
    for i in range(n_arc + 1):
        a = math.pi + math.pi * i / n_arc
        pts.append((x0 + r + r * math.cos(a), y0 + r + r * math.sin(a)))
    pts += [(x0 + w, y0 + h)]
    pts += [(x0 + w * (1 - t), y0 + h + math.sin(t * math.pi) * 6) for t in (0.25, 0.5, 0.75)]
    return pts


def bezier(p0, p1, p2, p3, n=40):
    out = []
    for i in range(n + 1):
        t = i / n
        u = 1 - t
        out.append((u**3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0],
                    u**3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1]))
    return out


# ---------------------------------------------------------------- paintings
def hero_arch():
    s = Sheet(900, 1220, 11)
    a = arch(110, 60, 680, 1080)
    s.wash(a, 'forest', 1.2, layers=44, spread=0.22, edge=0.9, texture=0.4, bloom=0.2)
    s.wash(arch(160, 120, 580, 980), 'deep', 0.75, layers=30, spread=0.3, edge=0.5, texture=0.65, bloom=0.45)
    s.wash(ellipse(450, 560, 240, 280, rng=s.rng), 'olive', 0.3, layers=24, spread=0.35, texture=0.7)
    # ground wash under the arch
    s.wash(ellipse(450, 1150, 430, 46, rng=s.rng), 'sage', 0.7, layers=24, spread=0.8)
    return s


def arch_soft():
    s = Sheet(900, 1220, 13)
    s.wash(arch(110, 60, 680, 1080), 'sage', 0.5, layers=36, spread=0.25, edge=1.0, texture=0.55, bloom=0.45)
    s.wash(ellipse(450, 900, 300, 220, rng=s.rng), 'blush', 0.45, layers=24, spread=0.35, texture=0.7, bloom=0.4)
    s.wash(ellipse(450, 380, 220, 200, rng=s.rng), 'gold', 0.18, layers=18, spread=0.4, texture=0.75)
    s.wash(ellipse(450, 1150, 430, 46, rng=s.rng), 'sage', 0.5, layers=20, spread=0.6)
    return s


def eucalyptus(seed=5, flip=False):
    s = Sheet(620, 1100, seed)
    stem = bezier((300, 1080), (250, 800), (380, 450), (320, 40), 60)
    if flip:
        stem = [(620 - x, y) for x, y in stem]
    for i in range(16):
        t = 0.06 + i / 16 * 0.9
        j = int(t * (len(stem) - 1))
        x, y = stem[j]
        side = -1 if i % 2 else 1
        r = 64 * (1 - t * 0.5) + s.rng.normal(0, 5)
        ox = side * r * 0.95
        pig = 'sage' if i % 3 else 'olive'
        s.wash(ellipse(x + ox, y + s.rng.normal(0, 8), r, r * 0.88, 16, rng=s.rng, wob=0.03), pig, 0.95,
               layers=24, spread=0.16, edge=1.4, texture=0.5, bloom=0.35)
        if i % 4 == 0:
            s.wash(ellipse(x + ox * 0.9, y, r * 0.55, r * 0.5, rng=s.rng), 'indigo', 0.22, layers=14, spread=0.25)
    s.stroke(stem, 'umber', width=5, strength=1.0)
    return s


def stones():
    s = Sheet(760, 760, 21)
    specs = [(380, 610, 290, 92, 'stone'), (380, 465, 215, 74, 'umber'), (385, 345, 150, 58, 'stone'), (378, 255, 92, 40, 'umber')]
    for cx, cy, rx, ry, pig in specs:
        s.wash(ellipse(cx, cy, rx, ry, 22, rng=s.rng, wob=0.02), pig, 0.9, layers=32, spread=0.12, edge=1.5, texture=0.5, bloom=0.4)
        s.wash(ellipse(cx - rx * 0.25, cy - ry * 0.35, rx * 0.45, ry * 0.3, rng=s.rng), 'blush', 0.45, layers=14, spread=0.25)
    s.wash(ellipse(380, 700, 360, 34, rng=s.rng), 'sage', 0.55, layers=20, spread=0.35)
    return s


def lotus():
    s = Sheet(900, 700, 31)
    cx, by = 450, 520
    petals = [(-2.55, 270, 92, 'blush'), (-0.59, 270, 92, 'blush'),
              (-2.15, 330, 100, 'blush'), (-0.99, 330, 100, 'blush'),
              (-1.83, 370, 96, 'rose'), (-1.31, 370, 96, 'rose'), (-1.5708, 400, 100, 'rose')]
    for ang, ln, wd, pig in petals:
        s.wash(leaf(cx, by, ln, wd, ang, 16), pig, 0.55, layers=26, spread=0.22, edge=1.6, texture=0.45, bloom=0.35)
        tipx, tipy = cx + math.cos(ang) * ln * 0.78, by + math.sin(ang) * ln * 0.78
        s.wash(ellipse(tipx, tipy, wd * 0.32, wd * 0.28, rng=s.rng), 'rose', 0.3, layers=12, spread=0.4)
    s.wash(ellipse(cx, by - 30, 44, 26, rng=s.rng), 'honey', 0.8, layers=16, spread=0.3)
    # pads + water
    s.wash(ellipse(cx - 200, by + 90, 210, 46, 18, rng=s.rng, wob=0.03), 'sage', 0.85, layers=24, spread=0.18)
    s.wash(ellipse(cx + 230, by + 105, 180, 38, 18, rng=s.rng, wob=0.03), 'olive', 0.65, layers=24, spread=0.18)
    s.wash(ellipse(cx, by + 140, 400, 30, rng=s.rng), 'indigo', 0.25, layers=16, spread=0.9)
    return s


def moon():
    s = Sheet(760, 760, 41)
    s.wash(ellipse(380, 380, 300, 300, 24, rng=s.rng, wob=0.02), 'indigo', 0.28, layers=26, spread=0.7, texture=0.75, bloom=0.4)
    # crescent: big disc minus offset disc, as polygon
    outer = [(380 + 210 * math.cos(a), 380 + 210 * math.sin(a)) for a in np.linspace(math.pi * 0.42, math.pi * 1.58, 30)]
    inner = [(470 + 175 * math.cos(a), 360 + 175 * math.sin(a)) for a in np.linspace(math.pi * 1.5, math.pi * 0.5, 30)]
    s.wash(outer + inner, 'gold', 1.2, layers=34, spread=0.25, edge=1.3, texture=0.45, bloom=0.3)
    s.wash(outer + inner, 'ochre', 0.4, layers=16, spread=0.3)
    s.splatter(560, 230, 90, 'ochre', count=26, size=(1.0, 3.5), strength=0.8)
    return s


def sun():
    s = Sheet(600, 600, 51)
    s.wash(ellipse(300, 300, 250, 250, 22, rng=s.rng), 'gold', 0.3, layers=20, spread=0.3, texture=0.75, bloom=0.5)
    s.wash(ellipse(300, 300, 150, 150, 22, rng=s.rng, wob=0.02), 'gold', 0.6, layers=30, spread=0.14, edge=1.4, bloom=0.4)
    s.wash(ellipse(300, 300, 80, 80, 18, rng=s.rng, wob=0.02), 'honey', 0.35, layers=16, spread=0.2)
    return s


def wash_band(seed, pig='sage', w=1600, h=360):
    s = Sheet(w, h, seed)
    pts = [(0, h * 0.55)] + [(x, h * 0.42 + s.rng.normal(0, 18)) for x in np.linspace(80, w - 80, 14)] + [(w, h * 0.5), (w, h), (0, h)]
    s.wash(pts, pig, 0.55, layers=30, spread=0.5, texture=0.7, bloom=0.45)
    return s


def blob(seed, pig, w=900, h=700, strength=0.5):
    s = Sheet(w, h, seed)
    s.wash(ellipse(w / 2, h / 2, w * 0.36, h * 0.34, 16, rng=s.rng, wob=0.12), pig, strength, layers=30, spread=0.7, texture=0.75, bloom=0.5)
    return s


def sprig_small(seed=61):
    s = Sheet(520, 300, seed)
    stem = bezier((20, 230), (150, 150), (300, 210), (500, 70), 40)
    for i in range(9):
        j = int((0.1 + i / 9 * 0.85) * (len(stem) - 1))
        x, y = stem[j]
        side = -1 if i % 2 else 1
        ang = math.atan2(stem[min(j + 1, len(stem) - 1)][1] - y, stem[min(j + 1, len(stem) - 1)][0] - x) + side * 0.9
        s.wash(leaf(x, y, 70 - i * 3, 22, ang, 12), 'sage' if i % 2 else 'olive', 0.95, layers=18, spread=0.18, edge=1.4)
    s.stroke(stem, 'umber', width=3)
    return s


PAINTINGS = {
    'arch': hero_arch,
    'arch-soft': arch_soft,
    'eucalyptus': eucalyptus,
    'eucalyptus-2': lambda: eucalyptus(9, flip=True),
    'stones': stones,
    'lotus': lotus,
    'moon': moon,
    'sun': sun,
    'sprig': sprig_small,
    'band-sage': lambda: wash_band(71, 'sage'),
    'blob-gold': lambda: blob(81, 'gold', strength=0.45),
    'blob-sage': lambda: blob(82, 'sage', strength=0.45),
    'blob-blush': lambda: blob(83, 'blush', strength=0.6),
}


def main(names):
    os.makedirs(OUT, exist_ok=True)
    for name in names or PAINTINGS:
        img = PAINTINGS[name]().render()
        path = os.path.join(OUT, f'{name}.webp')
        cv2.imwrite(path, img, [cv2.IMWRITE_WEBP_QUALITY, 82])
        print(f'{path}  {img.shape[1]}x{img.shape[0]}  {os.path.getsize(path) // 1024} kB')


if __name__ == '__main__':
    main(sys.argv[1:])
