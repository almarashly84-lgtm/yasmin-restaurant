"""Generates the Yasmin identity: emblem logo + dish illustrations (SVG).
Run: python3 tools/art.py  → writes into public/art and public/logo.svg
"""
import math, os, random

OUT = os.path.join(os.path.dirname(__file__), "..", "public")
G = "#C9A24A"      # brass gold
G2 = "#E3C77E"     # light gold
IV = "#F4EFE3"     # jasmine ivory
GR = "#12302B"     # cypress green
GR2 = "#1B443C"
RED = "#A3343F"    # pomegranate
OL = "#6E7F3A"     # olive
BR = "#8A5A2B"     # roasted brown
BREAD = "#D9A75E"
RICE = "#EBDDB0"


def star_points(cx, cy, R, rot=0.0):
    """8-point Damascene star (two interlaced squares) as 16 vertices."""
    r = R * math.cos(math.pi / 4) / math.cos(math.pi / 8)
    pts = []
    for i in range(16):
        rad = R if i % 2 == 0 else r
        a = rot + i * math.pi / 8 - math.pi / 2
        pts.append(f"{cx + rad * math.cos(a):.2f},{cy + rad * math.sin(a):.2f}")
    return " ".join(pts)


def jasmine(cx, cy, s, rot=0, petal=IV, center=G, stroke="none"):
    """Five-petal jasmine blossom."""
    out = [f'<g transform="translate({cx} {cy}) rotate({rot}) scale({s})">']
    for i in range(5):
        out.append(
            f'<path transform="rotate({i * 72})" d="M0 -2 C 9 -10 10 -30 0 -38 C -10 -30 -9 -10 0 -2Z" '
            f'fill="{petal}" stroke="{stroke}" stroke-width="1.2"/>')
    out.append(f'<circle r="5" fill="{center}"/>')
    out.append('</g>')
    return "".join(out)


def leaf(x, y, s, rot, col=OL):
    return (f'<path transform="translate({x} {y}) rotate({rot}) scale({s})" '
            f'd="M0 0 C 10 -8 26 -8 36 0 C 26 8 10 8 0 0Z" fill="{col}"/>')


def emblem(size=200):
    c = size / 2
    star_outer = star_points(c, c, 84)
    star_inner = star_points(c, c, 70, math.pi / 8)
    dots = "".join(
        f'<circle cx="{c + 91 * math.cos(i * math.pi / 16):.2f}" cy="{c + 91 * math.sin(i * math.pi / 16):.2f}" r="1.6" fill="{G}"/>'
        for i in range(32))
    leaves = "".join(leaf(c, c, 1.05, a, OL) for a in (-58, 122, 32, 212))
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" role="img" aria-label="Yasmin">
<defs><radialGradient id="eg" cx="50%" cy="42%" r="60%"><stop offset="0" stop-color="{GR2}"/><stop offset="1" stop-color="{GR}"/></radialGradient></defs>
<circle cx="{c}" cy="{c}" r="98" fill="url(#eg)"/>
<circle cx="{c}" cy="{c}" r="96" fill="none" stroke="{G}" stroke-width="2"/>
{dots}
<polygon points="{star_outer}" fill="none" stroke="{G}" stroke-width="3" stroke-linejoin="round"/>
<polygon points="{star_inner}" fill="none" stroke="{G2}" stroke-width="1.2" stroke-linejoin="round" opacity=".75"/>
<circle cx="{c}" cy="{c}" r="46" fill="none" stroke="{G}" stroke-width="1.2" stroke-dasharray="2 4"/>
{leaves}
{jasmine(c, c, 1.0, 0)}
{jasmine(c, c, .45, 36, IV, G2)}
</svg>'''


def tile(body, title, w=400, h=400, seed=1):
    """Shared background: deep green tile with a faint star lattice and gold frame."""
    random.seed(seed)
    lattice = "".join(
        f'<polygon points="{star_points(x, y, 22)}" fill="none" stroke="{G}" stroke-width=".8" opacity=".09"/>'
        for x in range(0, w + 60, 60) for y in range(0, h + 60, 60))
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" aria-label="{title}">
<defs><radialGradient id="bg" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#21524A"/><stop offset="1" stop-color="{GR}"/></radialGradient>
<filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="8" stdDeviation="9" flood-color="#04110E" flood-opacity=".55"/></filter></defs>
<rect width="{w}" height="{h}" fill="url(#bg)"/>{lattice}
<g filter="url(#sh)">{body}</g>
</svg>'''


def plate(cx, cy, r, rim=IV):
    return (f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{rim}"/>'
            f'<circle cx="{cx}" cy="{cy}" r="{r - 8}" fill="none" stroke="{G}" stroke-width="2"/>'
            f'<circle cx="{cx}" cy="{cy}" r="{r - 14}" fill="#EDE5D3"/>')


def hummus():
    swirl = "".join(f'<circle cx="200" cy="200" r="{r}" fill="none" stroke="#D8C08F" stroke-width="5" opacity=".7"/>' for r in (30, 52, 74))
    peas = "".join(f'<circle cx="{200 + 22 * math.cos(a)}" cy="{200 + 22 * math.sin(a)}" r="6" fill="#E2C17D" stroke="#B88E45"/>' for a in [i * 1.1 for i in range(6)])
    paprika = "".join(f'<circle cx="{200 + random.uniform(-60, 60):.1f}" cy="{200 + random.uniform(-60, 60):.1f}" r="2" fill="{RED}"/>' for _ in range(30))
    leaves = "".join(leaf(200 + 70 * math.cos(a), 200 + 70 * math.sin(a), .6, math.degrees(a) + 90, "#4F7A3A") for a in (0.4, 2.5, 4.4))
    return tile(plate(200, 200, 140) +
                f'<circle cx="200" cy="200" r="100" fill="#EBD7A6"/>{swirl}'
                f'<path d="M150 180 C 170 150 230 150 252 182 C 238 214 168 222 150 180Z" fill="#C9A23A" opacity=".55"/>'
                f'{peas}{paprika}{leaves}', "Hummus", seed=2)


def manakish():
    dots = "".join(f'<circle cx="{200 + random.uniform(-95, 95):.1f}" cy="{200 + random.uniform(-95, 95):.1f}" r="{random.uniform(1.5, 3.5):.1f}" fill="#3F5326"/>' for _ in range(260))
    clip = '<clipPath id="mk"><circle cx="200" cy="200" r="112"/></clipPath>'
    cuts = "".join(f'<line x1="200" y1="200" x2="{200 + 130 * math.cos(a)}" y2="{200 + 130 * math.sin(a)}" stroke="#B9813E" stroke-width="3"/>' for a in [i * math.pi / 3 for i in range(6)])
    return tile(f'<defs>{clip}</defs><circle cx="200" cy="200" r="138" fill="{BREAD}"/>'
                f'<circle cx="200" cy="200" r="138" fill="none" stroke="#B9813E" stroke-width="6"/>'
                f'<circle cx="200" cy="200" r="112" fill="#7B8C3E"/><g clip-path="url(#mk)">{dots}{cuts}</g>', "Manakish", seed=3)


def shawarma():
    body = (f'<g transform="rotate(-18 200 210)">'
            f'<rect x="110" y="150" width="190" height="110" rx="55" fill="#E9D3A4"/>'
            f'<path d="M110 205 a55 55 0 0 1 55 -55 h20 v110 h-20 a55 55 0 0 1 -55 -55Z" fill="#DBBE83"/>'
            f'<ellipse cx="300" cy="205" rx="30" ry="55" fill="#F2E3BD"/>'
            f'<ellipse cx="300" cy="205" rx="22" ry="45" fill="{BR}"/>'
            f'<circle cx="294" cy="190" r="7" fill="{RED}"/><circle cx="306" cy="215" r="6" fill="#5E8A3A"/>'
            f'<circle cx="296" cy="226" r="5" fill="{IV}"/>'
            + "".join(f'<path d="M{150 + i * 28} 152 q 6 54 0 106" stroke="#C8A66A" stroke-width="3" fill="none"/>' for i in range(5)) +
            '</g>'
            f'<g transform="rotate(14 210 300)"><rect x="150" y="285" width="120" height="16" rx="8" fill="{IV}"/>'
            f'<rect x="168" y="288" width="40" height="10" rx="5" fill="{RED}" opacity=".85"/></g>')
    return tile(body, "Shawarma", seed=4)


def kabsa():
    grains = ""
    for _ in range(220):
        a, d = random.uniform(0, 6.283), random.uniform(0, 1) ** .5
        x, y = 200 + 118 * d * math.cos(a), 215 + 66 * d * math.sin(a)
        grains += f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="4" ry="1.6" fill="#D9B85E" transform="rotate({random.randint(0, 180)} {x:.1f} {y:.1f})"/>'
    nuts = "".join(f'<ellipse cx="{150 + i * 24}" cy="{168 + (i % 2) * 10}" rx="6" ry="3.5" fill="#F2E2B8" stroke="#BFA06A"/>' for i in range(5))
    return tile(f'<ellipse cx="200" cy="230" rx="160" ry="110" fill="{IV}"/>'
                f'<ellipse cx="200" cy="230" rx="148" ry="98" fill="none" stroke="{G}" stroke-width="2"/>'
                f'<ellipse cx="200" cy="215" rx="125" ry="72" fill="#E6C36A"/>{grains}'
                f'<path d="M150 200 C 140 150 210 120 250 150 C 290 175 270 215 230 222 C 200 228 160 228 150 200Z" fill="#9A5A2A"/>'
                f'<path d="M168 196 C 165 165 214 146 238 166" stroke="#C17A3A" stroke-width="6" fill="none" stroke-linecap="round"/>'
                f'{nuts}<circle cx="262" cy="232" r="6" fill="{RED}"/><circle cx="148" cy="236" r="5" fill="#5E8A3A"/>', "Kabsa", seed=5)


def kunafa():
    strands = "".join(f'<path d="M{80 + i * 6} {200 + 100 * math.sin(i / 8)} q 20 -10 40 0" stroke="#D07A26" stroke-width="2" fill="none" opacity=".7"/>' for i in range(40))
    pist = "".join(f'<circle cx="{200 + random.uniform(-50, 50):.1f}" cy="{200 + random.uniform(-50, 50):.1f}" r="{random.uniform(2, 4):.1f}" fill="#7FA34A"/>' for _ in range(70))
    clip = '<clipPath id="kn"><circle cx="200" cy="200" r="126"/></clipPath>'
    return tile(f'<defs>{clip}</defs><circle cx="200" cy="200" r="146" fill="#B88A3E"/><circle cx="200" cy="200" r="138" fill="#8C6526"/>'
                f'<circle cx="200" cy="200" r="126" fill="#E08A2E"/><g clip-path="url(#kn)">{strands}</g>'
                f'<circle cx="200" cy="200" r="58" fill="#E7D5A8"/>{pist}'
                + "".join(f'<line x1="200" y1="200" x2="{200 + 126 * math.cos(a)}" y2="{200 + 126 * math.sin(a)}" stroke="#A85E1C" stroke-width="2"/>' for a in [i * math.pi / 4 + .2 for i in range(8)]),
                "Kunafa", seed=6)


def grill():
    def skewer(y, rot):
        chunks = "".join(
            f'<rect x="{110 + i * 42}" y="{y - 18}" width="36" height="36" rx="12" fill="{["#8B4A22", "#A8602C", "#7A3E1C"][i % 3]}"/>'
            + (f'<rect x="{146 + i * 42}" y="{y - 14}" width="6" height="28" fill="{RED}"/>' if i % 2 else f'<rect x="{146 + i * 42}" y="{y - 14}" width="6" height="28" fill="#5E8A3A"/>')
            for i in range(5))
        return (f'<g transform="rotate({rot} 200 {y})"><line x1="80" y1="{y}" x2="350" y2="{y}" stroke="#CFCFC8" stroke-width="5" stroke-linecap="round"/>'
                f'<circle cx="80" cy="{y}" r="8" fill="{G}"/>{chunks}</g>')
    return tile(f'<rect x="60" y="120" width="280" height="190" rx="20" fill="#2A2522"/>'
                + "".join(f'<line x1="70" y1="{140 + i * 22}" x2="330" y2="{140 + i * 22}" stroke="#4A423D" stroke-width="3"/>' for i in range(8))
                + skewer(175, -6) + skewer(245, 4), "Grill", seed=7)


def falafel():
    balls = ""
    for (x, y) in [(160, 180), (230, 170), (195, 230), (265, 230), (140, 245), (215, 290)]:
        balls += f'<circle cx="{x}" cy="{y}" r="32" fill="#8A5524"/><circle cx="{x - 8}" cy="{y - 9}" r="18" fill="#A86A30"/>'
        balls += "".join(f'<circle cx="{x + random.uniform(-20, 20):.1f}" cy="{y + random.uniform(-20, 20):.1f}" r="1.6" fill="#E9C27A"/>' for _ in range(8))
    return tile(plate(200, 220, 150) + balls +
                f'<path d="M290 120 c 30 0 50 30 40 60 c -20 -10 -40 -10 -50 -30Z" fill="#5E8A3A"/>'
                f'<circle cx="110" cy="150" r="22" fill="#F1EBDA" stroke="#D8C9A8" stroke-width="3"/><circle cx="110" cy="150" r="14" fill="#F4E9C8"/>', "Falafel", seed=8)


def burger():
    return tile('<ellipse cx="200" cy="320" rx="150" ry="22" fill="#0A1D19" opacity=".5"/>'
                f'<path d="M110 205 C 110 130 290 130 290 205Z" fill="{BREAD}"/>'
                + "".join(f'<ellipse cx="{150 + i * 25}" cy="{165 + (i % 2) * 12}" rx="5" ry="2.6" fill="{IV}"/>' for i in range(5)) +
                f'<path d="M100 212 q 25 18 50 0 q 25 18 50 0 q 25 18 50 0 q 25 18 50 0 v8 h-200Z" fill="#6FA03C"/>'
                f'<rect x="104" y="218" width="192" height="12" rx="4" fill="{RED}"/>'
                f'<path d="M106 232 h188 l-10 14 h-168Z" fill="#F0B83A"/>'
                f'<rect x="102" y="242" width="196" height="34" rx="16" fill="#6A3A1C"/>'
                f'<path d="M110 280 h180 a12 12 0 0 1 -12 22 h-156 a12 12 0 0 1 -12 -22Z" fill="#C88E46"/>'
                f'<g transform="translate(300 180)"><path d="M0 0 h56 l-8 110 h-40Z" fill="{RED}"/>'
                + "".join(f'<rect x="{6 + i * 9}" y="{-30 + (i % 3) * 8}" width="7" height="44" rx="2" fill="#F2C24E"/>' for i in range(5)) +
                f'<path d="M0 0 h56 l-3 26 h-50Z" fill="#8E2732"/></g>', "Burger", seed=9)


def fattoush():
    pieces = ""
    cols = ["#6FA03C", "#4F7F2E", RED, "#E85C3F", IV, "#D9A75E", "#8BBF52"]
    for _ in range(70):
        x, y = 200 + random.uniform(-95, 95), 200 + random.uniform(-80, 80)
        if (x - 200) ** 2 + (y - 200) ** 2 < 100 ** 2:
            c = random.choice(cols)
            pieces += f'<rect x="{x:.1f}" y="{y:.1f}" width="{random.uniform(10, 22):.1f}" height="{random.uniform(8, 16):.1f}" rx="4" fill="{c}" transform="rotate({random.randint(0, 90)} {x:.1f} {y:.1f})"/>'
    return tile(f'<circle cx="200" cy="200" r="140" fill="#F7F1E4"/><circle cx="200" cy="200" r="130" fill="none" stroke="{G}" stroke-width="2"/>'
                f'<circle cx="200" cy="200" r="116" fill="#5E8A3A"/>{pieces}', "Fattoush", seed=10)


def fatayer():
    tri = ""
    for (x, y, r) in [(150, 190, -10), (250, 185, 15), (200, 270, 5), (110, 280, 25), (290, 275, -20)]:
        tri += (f'<g transform="translate({x} {y}) rotate({r})"><path d="M0 -55 L 52 38 L -52 38Z" fill="{BREAD}" stroke="#B9813E" stroke-width="4" stroke-linejoin="round"/>'
                f'<path d="M0 -55 L 0 10 M 52 38 L 0 10 M -52 38 L 0 10" stroke="#B9813E" stroke-width="3"/>'
                f'<circle cx="0" cy="10" r="6" fill="#4F7F2E"/></g>')
    return tile(f'<rect x="60" y="110" width="280" height="230" rx="30" fill="{IV}"/><rect x="72" y="122" width="256" height="206" rx="22" fill="none" stroke="{G}" stroke-width="2"/>' + tri, "Fatayer", seed=11)


def dallah():
    return tile(f'<path d="M170 300 C 140 300 130 270 140 240 C 150 205 170 200 175 175 L 165 150 L 235 150 L 225 175 C 230 200 250 205 260 240 C 270 270 260 300 230 300Z" fill="{G}"/>'
                f'<path d="M175 175 h50" stroke="#8C6E2A" stroke-width="4"/><path d="M168 158 h64" stroke="#8C6E2A" stroke-width="3"/>'
                f'<path d="M200 150 C 200 120 210 110 220 108 L 222 100 L 200 92 L 178 100 L 180 108 C 190 110 200 120 200 150Z" fill="{G2}"/>'
                f'<path d="M140 245 C 100 230 90 200 70 180 C 60 172 66 162 76 168 C 100 182 112 214 146 222Z" fill="{G}"/>'
                f'<path d="M258 230 C 300 220 300 280 262 282" stroke="{G}" stroke-width="10" fill="none" stroke-linecap="round"/>'
                + "".join(f'<g transform="translate({x} 300)"><path d="M-22 0 h44 l-6 30 h-32Z" fill="{IV}"/><path d="M-22 6 h44" stroke="{G}" stroke-width="3"/></g>' for x in (300, 330))
                + f'<circle cx="95" cy="310" r="20" fill="#7A3E1C"/><circle cx="120" cy="318" r="14" fill="#8B4A22"/>', "Arabic coffee", seed=12)


def catering():
    trays = ""
    for i, x in enumerate((90, 200, 310)):
        fill = ["#E6C36A", "#5E8A3A", "#9A5A2A"][i]
        trays += (f'<rect x="{x - 48}" y="230" width="96" height="40" rx="6" fill="#C9C6BC"/>'
                  f'<ellipse cx="{x}" cy="230" rx="48" ry="14" fill="{fill}"/>'
                  f'<path d="M{x - 52} 228 a52 52 0 0 1 104 0" fill="#DAD7CE" opacity=".95"/>'
                  f'<path d="M{x - 52} 228 a52 52 0 0 1 104 0" fill="none" stroke="#A9A69C" stroke-width="2"/>'
                  f'<circle cx="{x}" cy="174" r="6" fill="{G}"/>'
                  f'<rect x="{x - 40}" y="270" width="6" height="30" fill="#A9A69C"/><rect x="{x + 34}" y="270" width="6" height="30" fill="#A9A69C"/>')
    return tile(f'<rect x="20" y="296" width="360" height="70" rx="6" fill="{IV}"/><path d="M20 316 h360" stroke="{G}" stroke-width="2"/>'
                + trays + jasmine(60, 120, .5, 10) + jasmine(340, 110, .45, 40) + jasmine(200, 92, .6, 0), "Catering", seed=13)


def courtyard():
    w, h = 600, 400
    random.seed(14)
    arches = ""
    for i, x in enumerate((60, 230, 400)):
        stripes = "".join(f'<rect x="{x}" y="{120 + j * 16}" width="140" height="8" fill="#E8E0CC"/>' for j in range(10))
        arches += (f'<g><clipPath id="a{i}"><path d="M{x} 400 V 150 a70 70 0 0 1 140 0 V 400Z"/></clipPath>'
                   f'<rect x="{x - 14}" y="70" width="168" height="330" fill="#2B2724"/>'
                   f'<g clip-path="url(#a{i})"><rect x="{x}" y="70" width="140" height="330" fill="#0E201C"/></g>'
                   f'<path d="M{x} 400 V 150 a70 70 0 0 1 140 0 V 400" fill="none" stroke="{G}" stroke-width="3"/>'
                   f'<g transform="translate({x + 70} 180)"><path d="M0 -40 v24" stroke="{G}" stroke-width="2"/><path d="M-14 -16 h28 l-6 34 h-16Z" fill="{G}"/><circle r="5" cy="2" fill="#FFE7A3"/></g></g>')
    ablaq = "".join(f'<rect x="0" y="{40 + j * 10}" width="{w}" height="5" fill="#E8E0CC" opacity=".9"/>' for j in range(3))
    vine = "".join(jasmine(random.uniform(10, 590), random.uniform(20, 75), random.uniform(.18, .32), random.randint(0, 72)) for _ in range(26))
    leaves = "".join(leaf(random.uniform(0, 600), random.uniform(15, 80), .5, random.randint(0, 360), "#3E6B34") for _ in range(30))
    fountain = (f'<ellipse cx="300" cy="372" rx="150" ry="26" fill="#1B443C" stroke="{G}" stroke-width="3"/>'
                f'<polygon points="{star_points(300, 372, 120)}" fill="none" stroke="{G}" stroke-width="1.5" transform="translate(0 0) scale(1 .22) translate(0 {372 / .22 - 372})" opacity=".8"/>'
                f'<rect x="292" y="300" width="16" height="70" fill="{IV}"/><ellipse cx="300" cy="300" rx="40" ry="8" fill="{IV}"/>'
                f'<path d="M300 296 C 290 270 270 280 262 300 M300 296 C 310 270 330 280 338 300" stroke="#9FD3E0" stroke-width="3" fill="none" opacity=".8"/>')
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" aria-label="Damascene courtyard">
<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#21524A"/><stop offset="1" stop-color="{GR}"/></linearGradient></defs>
<rect width="{w}" height="{h}" fill="url(#sky)"/>
<rect y="30" width="{w}" height="40" fill="#2B2724"/>{ablaq}{arches}
<rect y="385" width="{w}" height="15" fill="#2B2724"/>{fountain}{leaves}{vine}
</svg>'''


def vienna():
    """Vienna & Damascus skyline in gold line: Stephansdom spire, Riesenrad, Umayyad minaret."""
    w, h = 600, 400
    line = f'stroke="{G}" stroke-width="3" fill="none" stroke-linejoin="round"'
    wheel = "".join(f'<line x1="470" y1="200" x2="{470 + 70 * math.cos(a):.1f}" y2="{200 + 70 * math.sin(a):.1f}" stroke="{G}" stroke-width="1.5"/>' for a in [i * math.pi / 8 for i in range(16)])
    cabins = "".join(f'<rect x="{464 + 70 * math.cos(a):.1f}" y="{200 + 70 * math.sin(a):.1f}" width="12" height="9" rx="2" fill="{IV}"/>' for a in [i * math.pi / 4 for i in range(8)])
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" aria-label="Vienna and Damascus">
<rect width="{w}" height="{h}" fill="{GR}"/>
<circle cx="300" cy="140" r="60" fill="#21524A"/>
<path d="M0 330 H600" {line}/>
<path d="M80 330 V 210 h20 v-30 l14 -14 l14 14 v30 h20 v120" {line}/>
<path d="M114 166 V 120 l-6 -10 h12 l-6 10" {line}/><circle cx="114" cy="104" r="5" fill="{G}"/>
<path d="M200 330 V 230 L 250 160 L 300 230 V 330" {line}/>
<path d="M250 160 L 250 40" stroke="{G}" stroke-width="3"/><path d="M236 120 L 250 40 L 264 120Z" fill="{G}" opacity=".9"/>
<path d="M212 240 h76 M212 270 h76" stroke="{G}" stroke-width="1.5" stroke-dasharray="6 6"/>
<path d="M300 250 L 340 225 L 380 250 V 330" {line}/>
<circle cx="470" cy="200" r="70" {line}/>{wheel}{cabins}
<path d="M470 200 L 430 330 M470 200 L 510 330" stroke="{G}" stroke-width="3"/>
{jasmine(160, 360, .45, 10)}{jasmine(420, 365, .4, 30)}{jasmine(560, 355, .5, 0)}
</svg>'''


def write(name, svg):
    path = os.path.join(OUT, name)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(svg)


if __name__ == "__main__":
    write("logo.svg", emblem())
    for fn in (hummus, manakish, shawarma, kabsa, kunafa, grill, falafel, burger, fattoush, fatayer, dallah, catering):
        write(f"art/{fn.__name__}.svg", fn())
    write("art/courtyard.svg", courtyard())
    write("art/vienna.svg", vienna())
    print("ok")
