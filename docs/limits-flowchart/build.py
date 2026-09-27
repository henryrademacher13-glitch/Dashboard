import math

W, H = 3840, 2160

# ---------- math-typesetting helpers ----------
def F(n, d):
    return f'<span class="fr"><span class="n">{n}</span><span class="d">{d}</span></span>'

def LIM(sub):
    return f'<span class="lim">lim<span class="ls">{sub}</span></span>'

def SQ(x):
    return f'√<span class="rad">{x}</span>'

# ---------- tiny SVG plotter ----------
def graph(w, h, xr, yr, curves=(), dots=(), vlines=(), hlines=(), labels=(),
          xstep=1, ystep=1, grid=True, bands=()):
    x0, x1 = xr; y0, y1 = yr
    pad = 6
    X = lambda x: pad + (x - x0) / (x1 - x0) * (w - 2 * pad)
    Y = lambda y: h - pad - (y - y0) / (y1 - y0) * (h - 2 * pad)
    s = [f'<svg width="{w}" height="{h}" viewBox="0 0 {w} {h}" class="g">',
         f'<rect x="0" y="0" width="{w}" height="{h}" rx="10" fill="#fbfdff" stroke="#dbe3ee"/>']
    if grid:
        k = math.ceil(x0 / xstep)
        while k * xstep <= x1:
            s.append(f'<line x1="{X(k*xstep):.1f}" y1="{pad}" x2="{X(k*xstep):.1f}" y2="{h-pad}" stroke="#e8edf4"/>')
            k += 1
        k = math.ceil(y0 / ystep)
        while k * ystep <= y1:
            s.append(f'<line x1="{pad}" y1="{Y(k*ystep):.1f}" x2="{w-pad}" y2="{Y(k*ystep):.1f}" stroke="#e8edf4"/>')
            k += 1
    if y0 <= 0 <= y1:
        s.append(f'<line x1="{pad}" y1="{Y(0):.1f}" x2="{w-pad}" y2="{Y(0):.1f}" stroke="#64748b" stroke-width="2"/>')
    if x0 <= 0 <= x1:
        s.append(f'<line x1="{X(0):.1f}" y1="{pad}" x2="{X(0):.1f}" y2="{h-pad}" stroke="#64748b" stroke-width="2"/>')
    for (xa, xb, col) in bands:
        s.append(f'<rect x="{X(xa):.1f}" y="{pad}" width="{X(xb)-X(xa):.1f}" height="{h-2*pad}" fill="{col}"/>')
    for v, col in vlines:
        s.append(f'<line x1="{X(v):.1f}" y1="{pad}" x2="{X(v):.1f}" y2="{h-pad}" stroke="{col}" stroke-width="2.5" stroke-dasharray="9 7"/>')
    for v, col in hlines:
        s.append(f'<line x1="{pad}" y1="{Y(v):.1f}" x2="{w-pad}" y2="{Y(v):.1f}" stroke="{col}" stroke-width="2.5" stroke-dasharray="9 7"/>')
    for c in curves:
        f, a, b, col = c[:4]
        wd = c[4] if len(c) > 4 else 4
        n = c[5] if len(c) > 5 else 500
        pts, segs = [], []
        span = (y1 - y0)
        for i in range(n + 1):
            x = a + (b - a) * i / n
            try:
                y = f(x)
            except (ZeroDivisionError, ValueError):
                y = None
            if y is None or y < y0 - span or y > y1 + span:
                if len(pts) > 1: segs.append(pts)
                pts = []; continue
            pts.append((X(x), Y(y)))
        if len(pts) > 1: segs.append(pts)
        for p in segs:
            d = 'M' + ' L'.join(f'{px:.1f},{py:.1f}' for px, py in p)
            s.append(f'<path d="{d}" fill="none" stroke="{col}" stroke-width="{wd}" stroke-linejoin="round" stroke-linecap="round"/>')
    s.append(f'<rect x="0" y="0" width="{w}" height="{h}" rx="10" fill="none" stroke="#dbe3ee" stroke-width="2"/>')
    for (x, y, col, op) in dots:
        fill = '#ffffff' if op else col
        s.append(f'<circle cx="{X(x):.1f}" cy="{Y(y):.1f}" r="8" fill="{fill}" stroke="{col}" stroke-width="3.5"/>')
    for lb in labels:
        x, y, txt, col = lb[:4]
        anc = lb[4] if len(lb) > 4 else 'start'
        size = lb[5] if len(lb) > 5 else 21
        s.append(f'<text x="{X(x):.1f}" y="{Y(y):.1f}" fill="{col}" font-size="{size}" font-weight="700" text-anchor="{anc}" paint-order="stroke" stroke="#fbfdff" stroke-width="5">{txt}</text>')
    s.append('</svg>')
    # clip curves to the box
    return ''.join(s).replace('class="g">', f'class="g"><defs><clipPath id="c{id(s)}"><rect x="0" y="0" width="{w}" height="{h}" rx="10"/></clipPath></defs><g clip-path="url(#c{id(s)})">', 1).replace('</svg>', '</g></svg>')

def table(xs, ys, hl=None, cls=''):
    head = '<tr><th>x</th>' + ''.join(f'<td>{x}</td>' for x in xs) + '</tr>'
    body = '<tr><th>f(x)</th>' + ''.join(
        f'<td class="{"hl" if (hl is not None and i == hl) else ""}">{y}</td>' for i, y in enumerate(ys)) + '</tr>'
    return f'<table class="tb {cls}">{head}{body}</table>'

# colors
BLUE, GREEN, PURPLE, RED, ORANGE, TEAL, PINK, SLATE = '#2563eb', '#059669', '#7c3aed', '#dc2626', '#ea580c', '#0891b2', '#db2777', '#334155'

cards = []
def card(x, y, w, h, color, tag, title, body, cls=''):
    cards.append(f'''<div class="card {cls}" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;--c:{color}">
<div class="ch"><span class="tag">{tag}</span><span class="ct">{title}</span></div>
<div class="cb">{body}</div></div>''')

# ============ GRAPH COLUMN ============
def pw(x):
    if x < 2: return x + 1
    if x <= 4: return 5 - x
    return x - 1
g_main = graph(680, 360, (-1, 6.3), (-0.6, 5.6),
    curves=[(lambda x: x + 1, -1, 2, BLUE), (lambda x: 5 - x, 2, 4, BLUE), (lambda x: x - 1, 4, 6.3, BLUE)],
    dots=[(2, 3, BLUE, True), (2, 1, BLUE, False), (4, 1, BLUE, False), (4, 3, BLUE, True)],
    labels=[(2, 3.35, 'hole (2, 3)', SLATE, 'middle'), (2.15, 0.55, 'f(2) = 1', SLATE), (4.15, 0.55, 'f(4) = 1', SLATE), (4.25, 3.3, 'jump!', RED)])
card(40, 420, 740, 880, BLUE, 'GRAPH', 'Reading a limit from a graph', f'''
<ol class="steps">
<li>Put a finger on the curve to the <b>left</b> of x = c and slide toward c. Note the <b>y-value</b> you approach.</li>
<li>Do the same from the <b>right</b>.</li>
<li>Same y from both sides → that's the limit. Different → <b class="red">DNE</b>.</li>
</ol>
{g_main}
<div class="cap">My graph: y = x + 1 (x &lt; 2), 5 − x (2 &lt; x ≤ 4), x − 1 (x &gt; 4), with f(2) = 1</div>
<div class="ex">
<div>{LIM('x→2⁻')} f(x) = 3 &nbsp; {LIM('x→2⁺')} f(x) = 3 &nbsp;⇒&nbsp; <b>{LIM('x→2')} f(x) = 3</b></div>
<div>{LIM('x→4⁻')} f(x) = 1 &nbsp; {LIM('x→4⁺')} f(x) = 3 &nbsp;⇒&nbsp; <b class="red">{LIM('x→4')} f(x) DNE</b></div>
</div>
<div class="note"><b>Key idea:</b> the limit is where the graph is <i>heading</i>, not where the dot is. f(2) = 1, but the limit is still 3!</div>
''')

# ============ TABLE COLUMN ============
card(810, 420, 560, 880, GREEN, 'TABLE', 'Estimating a limit from a table', f'''
<ol class="steps">
<li>Pick x-values that get closer to c from <b>both sides</b>.</li>
<li>Watch where f(x) is heading.</li>
<li>Both sides agree → limit. Disagree or blow up → <b class="red">DNE</b>.</li>
</ol>
<div class="ex">Ex 1: &nbsp;{LIM('x→3')} {F('x² − 9', 'x − 3')}</div>
<table class="tb"><tr><th>x</th><td>2.99</td><td>2.999</td><td class="u">3</td><td>3.001</td><td>3.01</td></tr>
<tr><th>f(x)</th><td>5.99</td><td>5.999</td><td class="u">undef.</td><td>6.001</td><td>6.01</td></tr></table>
<div class="ans">Both sides → 6, so the limit = <b>6</b></div>
<div class="ex">Ex 2: &nbsp;{LIM('x→0')} {F('|x|', 'x')}</div>
{table(['−0.1', '−0.01', '0.01', '0.1'], ['−1', '−1', '1', '1'])}
<div class="ans">Left → −1, right → 1, so <b class="red">DNE</b></div>
<div class="note">Tip: Desmos or a TI table (TblSet ΔTbl = 0.01) makes these fast. A table only <i>estimates</i>; algebra proves it.</div>
''')

# ============ LIMITS AT INFINITY ============
g_inf = graph(540, 190, (-12, 12), (-1, 4.5),
    curves=[(lambda x: (4*x*x - x) / (2*x*x + 5), -12, 12, TEAL)],
    hlines=[(2, RED)], labels=[(-11.5, 2.35, 'HA: y = 2', RED)], xstep=2, ystep=1)
card(3220, 420, 580, 880, TEAL, 'x → ±∞', 'Limits at infinity (end behavior)', f'''
<div class="sub">Compare the degree of the top (N) and bottom (D):</div>
<table class="rules">
<tr><td>N &lt; D</td><td>limit = <b>0</b></td><td>{LIM('x→∞')} {F('3x + 1', 'x² − 4')} = 0</td></tr>
<tr><td>N = D</td><td><b>ratio of leading coefficients</b></td><td>{LIM('x→∞')} {F('4x² − x', '2x² + 5')} = {F('4', '2')} = 2</td></tr>
<tr><td>N &gt; D</td><td><b>±∞</b> (no HA)</td><td>{LIM('x→∞')} {F('x³', 'x + 1')} = ∞</td></tr>
</table>
<div class="sub">Why? Divide every term by the highest power of x in the denominator: terms like {F('5', 'x²')} → 0.</div>
{g_inf}
{table(['10', '100', '1000'], ['1.9024', '1.9945', '1.9995'], cls='sm')}
<div class="note"><b>Trap:</b> {SQ('x²')} = |x|. For x → −∞, |x| = −x:<br>{LIM('x→−∞')} {F(SQ('x² + 1'), '2x')} = <b>−½</b> &nbsp;(not +½!)</div>
''')

# ============ OUTCOMES ============
g_ds = graph(390, 170, (-1, 3), (-4, 18),
    curves=[(lambda x: x*x + 3*x - 1, -1, 3, PURPLE)], dots=[(2, 9, PURPLE, False)],
    labels=[(1.9, 10.5, '(2, 9)', SLATE, 'end')], ystep=4)
card(1400, 680, 430, 620, PURPLE, 'A', 'You get a real number', f'''
<div class="big">✓ That's the answer!</div>
<div class="ex">{LIM('x→2')} (x² + 3x − 1)<br>= 2² + 3(2) − 1 = <b>9</b></div>
{g_ds}
<div class="ex">{LIM('x→π')} cos x = cos π = <b>−1</b></div>
<div class="note">Works when f is <b>continuous</b> at c: polynomials, roots, trig, and rational functions where the bottom ≠ 0.</div>
''')

g_va = graph(390, 190, (-2, 8), (-12, 14),
    curves=[(lambda x: (x + 1) / (x - 3), -2, 8, RED, 4, 800)],
    vlines=[(3, RED)], hlines=[(1, '#94a3b8')], labels=[(3.25, 11, 'x = 3', RED)], ystep=4)
card(1853, 680, 430, 620, RED, 'B', 'You get k / 0 (k ≠ 0)', f'''
<div class="big red">Vertical asymptote → ±∞</div>
<div class="ex">{LIM('x→3')} {F('x + 1', 'x − 3')} → {F('4', '0')}</div>
{g_va}
{table(['2.99', '3.01'], ['−399', '401'], cls='sm')}
<div class="ex">{LIM('x→3⁻')} = <b>−∞</b>, &nbsp;{LIM('x→3⁺')} = <b>+∞</b></div>
<div class="note">Test the <b>sign</b> on each side. Same sign → write ∞ or −∞. Different → <b class="red">DNE</b>.</div>
''')

card(2306, 680, 430, 620, ORANGE, 'C', 'You get 0 / 0', f'''
<div class="big orange">Indeterminate: NOT the answer!</div>
<div class="ex">{LIM('x→−2')} {F('x² + 5x + 6', 'x² − 4')} → {F('0', '0')}</div>
<div class="note">0/0 usually means a <b>hole</b> (a shared factor). Rewrite, then plug in again.</div>
<div class="toolhint">
<div>Polynomials? → <b>Factor</b></div>
<div>Square roots? → <b>Conjugate</b></div>
<div>Fractions in fractions? → <b>Common denominator</b></div>
<div>sin, cos, tan? → <b>Special trig limits</b></div>
<div>Trapped by bounds? → <b>Squeeze</b></div>
</div>
<div class="down">Go to the 0/0 Toolbox ↓</div>
''')

def pc(x): return x*x if x < 1 else 2*x + 1
g_pc = graph(390, 185, (-1.5, 3), (-1, 7.5),
    curves=[(lambda x: x*x, -1.5, 1, PINK), (lambda x: 2*x + 1, 1, 3, PINK)],
    dots=[(1, 1, PINK, True), (1, 3, PINK, False)], labels=[(1.2, 0.3, '→ 1', SLATE), (1.2, 3.6, '→ 3', SLATE)], ystep=2)
card(2760, 680, 430, 620, PINK, 'D', 'Piecewise, |x|, or a split point', f'''
<div class="big pink">Check one-sided limits</div>
<div class="ex">f(x) = x² if x &lt; 1; &nbsp; 2x + 1 if x ≥ 1</div>
{g_pc}
<div class="ex">{LIM('x→1⁻')} x² = 1, &nbsp;{LIM('x→1⁺')} (2x+1) = 3</div>
<div class="ans">1 ≠ 3, so <b class="red">{LIM('x→1')} f(x) DNE</b></div>
<div class="note">Rule: {LIM('x→c')} f(x) = L <b>only if</b> left limit = right limit = L. For |x − c|, split it into two pieces.</div>
''')

# ============ TOOLBOX ============
TY = 1435; TH = 625
g_fac = graph(420, 140, (-5, 1.8), (-3, 2),
    curves=[(lambda x: (x + 3) / (x - 2), -5, 1.8, ORANGE)], dots=[(-2, -0.25, ORANGE, True)],
    labels=[(-2, 0.35, 'hole (−2, −¼)', SLATE, 'middle')], ystep=1)
card(1400, TY, 464, TH, ORANGE, '1', 'Factor & cancel', f'''
<div class="ex">{LIM('x→−2')} {F('x² + 5x + 6', 'x² − 4')}</div>
<div class="ex">= {LIM('x→−2')} {F('(x + 2)(x + 3)', '(x + 2)(x − 2)')}</div>
<div class="ex">= {LIM('x→−2')} {F('x + 3', 'x − 2')} = {F('1', '−4')} = <b>−¼</b></div>
{g_fac}
{table(['−2.01', '−1.99'], ['−0.2469', '−0.2531'], cls='sm')}
<div class="note">Know your patterns: a² − b², trinomials, a³ ± b³ = (a ± b)(a² ∓ ab + b²).</div>
''')

g_con = graph(420, 130, (-0.2, 9), (0, 0.55),
    curves=[(lambda x: 1 / (math.sqrt(x) + 2), 0, 9, ORANGE)], dots=[(4, 0.25, ORANGE, True)],
    labels=[(4, 0.33, '(4, ¼)', SLATE, 'middle')], ystep=0.25)
card(1884, TY, 464, TH, ORANGE, '2', 'Rationalize (conjugate)', f'''
<div class="ex">{LIM('x→4')} {F(SQ('x') + ' − 2', 'x − 4')} · {F(SQ('x') + ' + 2', SQ('x') + ' + 2')}</div>
<div class="ex">= {LIM('x→4')} {F('x − 4', '(x − 4)(' + SQ('x') + ' + 2)')}</div>
<div class="ex">= {LIM('x→4')} {F('1', SQ('x') + ' + 2')} = <b>¼</b></div>
{g_con}
{table(['3.99', '4.01'], ['0.25016', '0.24984'], cls='sm')}
<div class="note">Multiply top &amp; bottom by the conjugate (a − b → a + b). <b>Don't</b> multiply out the side you want to cancel.</div>
''')

card(2368, TY, 464, TH, ORANGE, '3', 'Common denominator', f'''
<div class="ex">{LIM('x→0')} {F(F('1', 'x + 2') + ' − ' + F('1', '2'), 'x')}</div>
<div class="ex">= {LIM('x→0')} {F(F('2 − (x + 2)', '2(x + 2)'), 'x')}</div>
<div class="ex">= {LIM('x→0')} {F('−x', '2x(x + 2)')} = {LIM('x→0')} {F('−1', '2(x + 2)')}</div><div class="ex">= {F('−1', '2(0 + 2)')} = <b>−¼</b></div>
{table(['−0.1', '−0.01', '0.01', '0.1'], ['−0.2632', '−0.2513', '−0.2488', '−0.2381'], cls='sm xs')}
<div class="note">Use this for a <b>complex fraction</b>: combine the little fractions into one, then cancel the x.</div>
''')

g_trig = graph(420, 130, (-10, 10), (-0.4, 1.3),
    curves=[(lambda x: math.sin(x) / x if x != 0 else None, -10, 10, ORANGE, 4, 700)], dots=[(0, 1, ORANGE, True)],
    labels=[(0.6, 1.08, '(0, 1)', SLATE)], xstep=2, ystep=0.5)
card(2852, TY, 464, TH, ORANGE, '4', 'Special trig limits', f'''
<div class="keybox">{LIM('x→0')} {F('sin x', 'x')} = 1 &nbsp;&nbsp; {LIM('x→0')} {F('1 − cos x', 'x')} = 0</div>
{g_trig}
{table(['±0.1', '±0.01'], ['0.99833', '0.99998'], cls='sm')}
<div class="ex">{LIM('x→0')} {F('sin 5x', '3x')} = {F('5', '3')} · {LIM('x→0')} {F('sin 5x', '5x')} = {F('5', '3')} · 1 = <b>{F('5', '3')}</b></div>
<div class="note">Match the angle and the denominator. Also: tan x = {F('sin x', 'cos x')}, so {LIM('x→0')} {F('tan x', 'x')} = 1.</div>
''')

g_sq = graph(420, 130, (-0.5, 0.5), (-0.27, 0.27),
    curves=[(lambda x: x*x, -0.5, 0.5, '#94a3b8', 3), (lambda x: -x*x, -0.5, 0.5, '#94a3b8', 3),
            (lambda x: x*x*math.sin(1/x) if x != 0 else 0, -0.5, 0.5, ORANGE, 3, 3000)],
    labels=[(0.3, 0.14, 'y = x²', SLATE, 'end'), (0.3, -0.17, 'y = −x²', SLATE, 'end')], xstep=0.25, ystep=0.1)
card(3336, TY, 464, TH, ORANGE, '5', 'Squeeze theorem', f'''
<div class="sub">If g(x) ≤ f(x) ≤ h(x) near c and {LIM('x→c')} g = {LIM('x→c')} h = L, then {LIM('x→c')} f = L.</div>
<div class="ex">{LIM('x→0')} x² sin({F('1', 'x')}):</div>
<div class="ex">−1 ≤ sin({F('1', 'x')}) ≤ 1 &nbsp;⇒&nbsp; <span style="white-space:nowrap">−x² ≤ x² sin({F('1', 'x')}) ≤ x²</span></div>
{g_sq}
<div class="ex">Both ±x² → 0, so the limit = <b>0</b></div>
<div class="note">Use it when something wiggles (sin, cos) but is trapped between two things that go to the same value.</div>
''')

# ============ CONTINUITY / DNE ============
mw, mh = 290, 150
g_rem = graph(mw, mh, (-1, 4), (-1, 4.5), curves=[(lambda x: 0.8*x + 0.6, -1, 4, PURPLE)], dots=[(2, 2.2, PURPLE, True), (2, 3.8, PURPLE, False)])
g_jmp = graph(mw, mh, (-1, 4), (-1, 4.5), curves=[(lambda x: 1, -1, 2, PURPLE), (lambda x: 3, 2, 4, PURPLE)], dots=[(2, 1, PURPLE, False), (2, 3, PURPLE, True)])
g_inf2 = graph(mw, mh, (-1, 4), (-4, 4), curves=[(lambda x: 1 / (x - 1.5), -1, 4, PURPLE, 3.5, 600)], vlines=[(1.5, RED)])
g_osc = graph(mw, mh, (-1, 1), (-1.4, 1.4), curves=[(lambda x: math.sin(1 / x) if x != 0 else None, -1, 1, PURPLE, 2.5, 6000)], xstep=0.5, ystep=0.5)
card(40, 1360, 1330, 700, PURPLE, 'CHECK', 'Continuity & when a limit does not exist', f'''
<div class="cols2">
<div>
<div class="sub"><b>f is continuous at x = c</b> if all 3 are true:</div>
<ol class="steps tight">
<li>f(c) is defined (there's a closed dot)</li>
<li>{LIM('x→c')} f(x) exists (left = right)</li>
<li>{LIM('x→c')} f(x) = f(c)</li>
</ol>
</div>
<div>
<div class="sub"><b>A limit DNE when:</b></div>
<ul class="steps tight">
<li><b>Jump:</b> left limit ≠ right limit</li>
<li><b>Unbounded:</b> goes to ±∞ (writing ∞ tells <i>how</i> it fails)</li>
<li><b>Oscillates:</b> never settles, like sin(1/x) near 0</li>
</ul>
</div>
</div>
<div class="types">
<div><div class="tt">Removable (hole)</div>{g_rem}<div class="tc">limit <b>exists</b>, but ≠ f(c).<br>Fix it by redefining one point.</div></div>
<div><div class="tt">Jump</div>{g_jmp}<div class="tc">one-sided limits exist but differ → <b class="red">DNE</b></div></div>
<div><div class="tt">Infinite (asymptote)</div>{g_inf2}<div class="tc">unbounded → <b class="red">DNE</b> (±∞)</div></div>
<div><div class="tt">Oscillating</div>{g_osc}<div class="tc">y = sin(1/x) near 0 → <b class="red">DNE</b></div></div>
</div>
<div class="note"><b>Intermediate Value Theorem:</b> if f is continuous on [a, b] and k is between f(a) and f(b), then f(c) = k for some c in (a, b). Example: f(x) = x³ + x − 1 has f(0) = −1 and f(1) = 1, so it has a root between 0 and 1.</div>
''')

# ============ FLOW NODES ============
nodes = f'''
<div class="node start" style="left:1540px;top:165px;width:760px;height:84px">START: find {LIM('x→c')} f(x)</div>
<div class="node dec" style="left:1600px;top:290px;width:640px;height:70px">How is the function given?</div>
<div class="node dec" style="left:1860px;top:420px;width:860px;height:72px">Given an EXPRESSION: is x → ±∞?</div>
<div class="node step" style="left:1400px;top:548px;width:1790px;height:86px"><span class="stepn">STEP 1</span> Direct substitution: plug x = c into f(x). What do you get?</div>
<div class="band" style="left:1400px;top:1362px;width:2400px;height:60px">0/0 TOOLBOX: rewrite the function, then plug in again. Still 0/0? Try another tool.</div>
'''

# ============ ARROWS ============
def A(d, label=None, lx=0, ly=0, col=SLATE):
    out = f'<path d="{d}" fill="none" stroke="{col}" stroke-width="5" marker-end="url(#ah)" stroke-linejoin="round"/>'
    if label:
        out += f'<g><rect x="{lx-4}" y="{ly-30}" width="{len(label)*17+18}" height="40" rx="20" fill="{col}"/><text x="{lx+5}" y="{ly-2}" fill="#fff" font-size="24" font-weight="800">{label}</text></g>'
    return out

arrows = ''.join([
    A('M1920,249 L1920,284'),
    A('M1920,360 L1920,388 L410,388 L410,412', 'GRAPH', 560, 380, BLUE),
    A('M1090,388 L1090,412', 'TABLE', 950, 412, GREEN),
    A('M1920,388 L2290,388 L2290,413', 'EXPRESSION', 2000, 380, PURPLE),
    A('M2720,456 L3212,456', 'YES', 2900, 446, TEAL),
    A('M2290,492 L2290,541', 'NO', 2310, 528, PURPLE),
    A('M2295,634 L2295,656 L1615,656 L1615,673'),
    A('M2068,656 L2068,673'),
    A('M2295,656 L2521,656 L2521,673'),
    A('M2521,656 L2975,656 L2975,673'),
    A('M2521,1300 L2521,1355', None, 0, 0, ORANGE),
])

svg_arrows = f'''<svg class="arrows" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<defs><marker id="ah" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="context-stroke"/></marker></defs>
{arrows}</svg>'''

html = f'''<!doctype html><html><head><meta charset="utf-8"><title>Limits Flowchart</title>
<style>
*{{box-sizing:border-box;margin:0;padding:0}}
body{{width:{W}px;height:{H}px;background:#eef2f7;font-family:"DejaVu Sans","Liberation Sans",Arial,sans-serif;color:#0f172a;position:relative;overflow:hidden}}
.hdr{{position:absolute;left:0;top:0;width:{W}px;height:140px;background:linear-gradient(90deg,#1e1b4b,#312e81 45%,#0e7490);color:#fff;padding:22px 44px;display:flex;justify-content:space-between;align-items:center}}
.hdr h1{{font-size:64px;letter-spacing:1px;font-weight:900}}
.hdr .s{{font-size:25px;opacity:.9;margin-top:6px}}
.hdr .who{{text-align:right;font-size:30px;font-weight:700;line-height:1.35}}
.hdr .who span{{font-size:22px;font-weight:400;opacity:.85}}
.pills{{display:flex;gap:10px;justify-content:flex-end;margin-top:6px}}
.pill{{font-size:18px;font-weight:800;padding:3px 12px;border-radius:14px;background:#fff;color:#1e1b4b}}
.card{{position:absolute;background:#fff;border-radius:22px;border:3px solid var(--c);box-shadow:0 6px 16px rgba(15,23,42,.10);overflow:hidden}}
.ch{{background:var(--c);color:#fff;display:flex;align-items:center;gap:14px;padding:10px 18px}}
.tag{{background:#fff;color:var(--c);font-weight:900;font-size:20px;padding:3px 12px;border-radius:12px;white-space:nowrap}}
.ct{{font-size:28px;font-weight:800}}
.cb{{padding:12px 18px;font-size:22px;line-height:1.35;display:flex;flex-direction:column;gap:9px}}
.cb .g{{display:block;align-self:center}}
.steps{{padding-left:28px}} .steps li{{margin:2px 0}} .tight li{{margin:0}}
.ex{{font-size:23px}}
.sub{{font-size:22px}}
.note{{background:#f1f5f9;border-left:6px solid var(--c);padding:7px 12px;border-radius:8px;font-size:20px}}
.ans{{font-size:23px}}
.cap{{font-size:18px;color:#475569;text-align:center;margin-top:-4px}}
.big{{font-size:26px;font-weight:900;color:{PURPLE}}}
.red{{color:{RED}}} .orange{{color:{ORANGE}}} .pink{{color:{PINK}}}
.big.red{{color:{RED}}} .big.orange{{color:{ORANGE}}} .big.pink{{color:{PINK}}}
.fr{{display:inline-flex;flex-direction:column;vertical-align:middle;text-align:center;margin:0 3px;font-size:.92em;line-height:1.15}}
.fr .d{{border-top:2px solid currentColor;padding-top:1px}}
.fr .n{{padding:0 3px 1px}}
.lim{{display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;line-height:1;margin-right:4px;font-style:normal}}
.lim .ls{{font-size:.62em;margin-top:2px;white-space:nowrap}}
.rad{{border-top:2px solid currentColor;padding:0 2px}}
.tb{{border-collapse:collapse;align-self:center;font-size:20px;text-align:center}}
.tb th,.tb td{{border:2px solid #cbd5e1;padding:3px 12px}}
.tb th{{background:#ecfdf5;color:{GREEN}}}
.tb td.u{{background:#fef2f2;color:{RED};font-weight:700}}
.tb.xs td,.tb.xs th{{padding:2px 6px!important}} .tb.sm{{font-size:19px}} .tb.sm td,.tb.sm th{{padding:2px 12px}}
.rules{{border-collapse:collapse;font-size:20px}}
.rules td{{border-bottom:1px solid #e2e8f0;padding:5px 6px;vertical-align:middle}}
.rules td:first-child{{font-weight:900;color:{TEAL};white-space:nowrap}}
.toolhint{{display:flex;flex-direction:column;gap:4px;font-size:21px;background:#fff7ed;border-radius:10px;padding:8px 12px}}
.down{{margin-top:auto;font-size:26px;font-weight:900;color:#fff;background:{ORANGE};border-radius:12px;text-align:center;padding:6px}}
.keybox{{background:#fff7ed;border:2px dashed {ORANGE};border-radius:10px;padding:6px 10px;text-align:center;font-size:22px}}
.cols2{{display:grid;grid-template-columns:1fr 1fr;gap:24px}}
.types{{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:4px}}
.types > div{{display:flex;flex-direction:column;align-items:center;gap:4px}}
.tt{{font-weight:900;font-size:22px;color:{PURPLE}}}
.tc{{font-size:18px;text-align:center;line-height:1.25}}
.node{{position:absolute;display:flex;align-items:center;justify-content:center;font-weight:800;text-align:center;box-shadow:0 5px 12px rgba(15,23,42,.14)}}
.start{{background:#0f172a;color:#fff;border-radius:44px;font-size:36px}}
.dec{{background:#fef9c3;border:4px solid #ca8a04;border-radius:16px;font-size:30px;color:#713f12}}
.step{{background:{PURPLE};color:#fff;border-radius:18px;font-size:32px;gap:18px}}
.stepn{{background:#fff;color:{PURPLE};padding:4px 14px;border-radius:12px;font-size:26px}}
.band{{position:absolute;background:{ORANGE};color:#fff;border-radius:16px;font-size:28px;font-weight:800;display:flex;align-items:center;justify-content:center}}
.arrows{{position:absolute;left:0;top:0;pointer-events:none}}
.foot{{position:absolute;left:40px;top:2080px;width:{W-80}px;height:60px;display:flex;justify-content:space-between;align-items:center;font-size:21px;color:#475569}}
</style></head><body>
<div class="hdr"><div><h1>LIMITS ROADMAP: How to Evaluate Any Limit</h1>
<div class="s">Start at the top and follow the arrows. Every method is shown with an expression, a graph, and a table (the trinity of function representation).</div></div>
<div class="who">Henry Rademacher<br><span>Set 1 · Limits Flowchart</span>
<div class="pills"><span class="pill" style="color:{BLUE}">GRAPH</span><span class="pill" style="color:{GREEN}">TABLE</span><span class="pill" style="color:{PURPLE}">ALGEBRA</span></div></div></div>
{svg_arrows}
{nodes}
{''.join(cards)}
<div class="foot"><div><b>Credits:</b> all graphs and tables are my own, plotted from the functions shown (values checked on a calculator). No outside images were used.</div>
<div>Notation: c⁻ = from the left, c⁺ = from the right, DNE = does not exist, HA = horizontal asymptote</div></div>
</body></html>'''

open('limits.html', 'w').write(html)
print('ok')
