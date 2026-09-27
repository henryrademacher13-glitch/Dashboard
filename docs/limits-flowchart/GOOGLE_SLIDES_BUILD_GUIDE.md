# Build Your Limits Flowchart in Google Slides

**File name:** `1.RademacherHenry.LimitsFlowchart`
**Due:** Mon 9/28, 3:15 PM
**Time needed:** about 2–3 hours (about 1 hour for the boxes and text, 1–1.5 hours for the Desmos graphs)

This guide uses the same layout as Example 3, a single big square slide, but with your own examples and your own Desmos graphs. Build the boxes in order and paste in the text below each heading. Every answer has been checked.

---

## 0. The layout you're building

```
┌──────────────────────────────────────────────────────────────────┐
│                     EVALUATING LIMITS                            │
│               Henry Rademacher · Set 1                           │
│                  [ STEP 1: Direct Substitution ]                 │
│          ┌───────────────────┼────────────────────┐              │
│  [real number → done]   [0/0 → indeterminate]   [k/0 → asymptote] │
│   (example A)                  │                  (example B+graph)│
│   ┌──────────┬──────────┬──────┴─────┬───────────┬──────────┐    │
│  [Factoring][Expansion][Conjugates][Complex Fr.][Trig Lim/Id]    │
│   ex+graph   ex+table   ex+table    ex+table     ex+graph+table  │
│                                                                  │
│            ═══ OTHER LIMIT REPRESENTATIONS ═══                   │
│  [ Graphs ]          [ Tables ]          [ Squeeze Theorem ]     │
│  [ Piecewise / one-sided ]  [ Continuity & DNE ]  [ Limits at ∞ ] │
│  Credits: graphs & tables made by me in Desmos                   │
└──────────────────────────────────────────────────────────────────┘
```

Color code (same idea as Example 3):
- **Green** titles: "limit found" outcomes
- **Purple** titles: the 0/0 algebra methods
- **Red** titles: the other representations (graphs, tables, piecewise)
- **Teal** titles: theorems (squeeze, continuity)

---

## 1. Set up the slide (5 min)

1. Go to **slides.google.com** and open a **Blank** presentation.
2. Rename it `1.RademacherHenry.LimitsFlowchart` (click "Untitled presentation" at the top left).
3. **File → Page setup → Custom → 20 × 20 inches → Apply.** This makes it square like Example 3, with room for everything.
4. **Slide → Apply layout → Blank.**
5. Set the font: **Merriweather** for titles (Example 3 uses a font like this) and **Arial** or **Lato** for the math. To find Merriweather, open the font menu, choose **More fonts**, and search for it.
6. Zoom out (**View → Zoom → Fit**) so you can see the whole slide.

### Building blocks you'll reuse

| You need | How to do it in Slides |
|---|---|
| A box | **Insert → Shape → Shapes → Rectangle.** Border: black, 2 px. Fill: white, or light gray (#EFEFEF) for header boxes. |
| An arrow that sticks to boxes | **Insert → Line → Elbow connector.** Drag from one box's blue dot to the other box's blue dot. Set **Line end → Arrow**, weight 3 px. Connectors stay attached when you move boxes. |
| A table | **Insert → Table → 2 × 5** (or 7 × 2 for vertical). Format with **Format → Borders & lines**. |
| Exponents like x² | Type `x2`, highlight the 2, press **Ctrl + .** (superscript). |
| Symbols → ∞ √ θ π ≠ ≤ | **Insert → Special characters** and search "arrow", "infinity" and so on. You can also copy them from this file. |
| Fractions | Type them on one line with parentheses: `(x² − 9)/(x − 3)`. To get real stacked fractions, type the expression into Desmos and screenshot the expression line, or use the free **Hypatia Create** add-on (**Extensions → Add-ons**). |
| Limit notation | Type `lim` then press Enter. On the second line, type `x→3` at a smaller size (10 pt). Or write it inline as `lim x→3`. |
| Align boxes | Select several boxes, then **Arrange → Distribute → Horizontally** and **Arrange → Align → Top**. |

### Making Desmos graphs (do this for every graph below)
1. Go to **desmos.com/calculator** and type the lines given in each box's **Desmos** instructions.
2. **Hole (open circle):** type the point, e.g. `(2,3)`. Long-press or click the colored circle next to it, then choose the **open circle** style.
3. **Dashed asymptote:** type e.g. `x=3`, open the color menu and choose the **dashed** line style.
4. **Table:** click **+ → table**. Type the x-values in the `x₁` column. If you've already defined `f(x)=...` on its own line, change the second column's header to `f(x₁)` and Desmos fills in the values.
5. **Export:** click the **Share icon (↗) → Export Image → PNG**. Then in Slides use **Insert → Image → Upload**.

---

## 2. The top of the flowchart

### Title (text box, top center)
**Evaluating Limits** (Merriweather, bold, 72 pt)
Under it: `Henry Rademacher · Set 1 · Limits Flowchart` (24 pt, gray)

### Box: STEP 1: Direct Substitution (gray header box, centered)
> **Direct Substitution:** plug x = c into f(x). What do you get?

Draw 3 elbow connectors from this box down to the three outcome boxes below it.

### Outcome box A (left, green title)
> **real number → limit found!**
> lim x→2 (x² + 3x − 1) = 2² + 3(2) − 1 = **9**
> Works when f is continuous at c: polynomials, roots, trig, and rational functions where the bottom ≠ 0.

### Outcome box B (right, green title)
> **non-zero / 0 → asymptote (∞, −∞, or DNE)**
> lim x→3 (x + 1)/(x − 3) → 4/0
> Left: x = 2.99 → −399, so lim x→3⁻ = **−∞**
> Right: x = 3.01 → 401, so lim x→3⁺ = **+∞**
> The sides disagree, so lim x→3 **DNE**.

**Desmos:** `y=(x+1)/(x-3)` and `x=3` (dashed). Window: x from −2 to 8, y from −12 to 14.

### Outcome box C (center, purple title)
> **0/0 → indeterminate form: NOT the answer!**
> Rewrite the function with one of the methods below, then plug in again.

Draw 5 elbow connectors from this box down to the five method boxes.

---

## 3. The five 0/0 method boxes (purple titles, one row)

### ① Factoring
> lim x→−2 (x² + 5x + 6)/(x² − 4)
> = lim x→−2 (x + 2)(x + 3) / [(x + 2)(x − 2)]
> = lim x→−2 (x + 3)/(x − 2) = 1/(−4) = **−1/4**

**Desmos:** `y=(x^2+5x+6)/(x^2-4)` plus the point `(-2,-0.25)` set to **open circle** (Desmos doesn't draw holes by itself). Window: x from −5 to 2, y from −3 to 2.

To cross out the cancelled (x + 2), use **Insert → Line** and draw a slash over it (Example 3 does this).

### ② Expansion
> lim x→0 [(x + 3)² − 9] / x
> = lim x→0 (x² + 6x + 9 − 9)/x
> = lim x→0 x(x + 6)/x = lim x→0 (x + 6) = **6**

**Table (Insert → Table, 2 rows × 5 columns):**

| x | −0.1 | −0.01 | 0.01 | 0.1 |
|---|---|---|---|---|
| f(x) | 5.9 | 5.99 | 6.01 | 6.1 |

### ③ Conjugates (rationalize)
> lim x→4 (√x − 2)/(x − 4) · (√x + 2)/(√x + 2)
> = lim x→4 (x − 4) / [(x − 4)(√x + 2)]
> = lim x→4 1/(√x + 2) = 1/(2 + 2) = **1/4**

| x | 3.9 | 3.99 | 4.01 | 4.1 |
|---|---|---|---|---|
| f(x) | 0.25158 | 0.25016 | 0.24984 | 0.24846 |

### ④ Complex Fractions (common denominator)
> lim x→0 [1/(x + 2) − 1/2] / x
> = lim x→0 [(2 − (x + 2)) / (2(x + 2))] / x
> = lim x→0 −x / [2x(x + 2)]
> = lim x→0 −1 / [2(x + 2)] = −1/(2·2) = **−1/4**

| x | −0.1 | −0.01 | 0.01 | 0.1 |
|---|---|---|---|---|
| f(x) | −0.2632 | −0.2513 | −0.2488 | −0.2381 |

### ⑤ Trig Limits & Identities
> **Memorize:** lim x→0 (sin x)/x = 1  lim x→0 (1 − cos x)/x = 0
> **Special limit:** lim x→0 sin(5x)/(3x) = (5/3) · lim x→0 sin(5x)/(5x) = (5/3)(1) = **5/3**
> **Identity** (sin²θ = 1 − cos²θ):
> lim θ→0 (1 − cos θ)/sin²θ = lim θ→0 (1 − cos θ)/[(1 − cos θ)(1 + cos θ)]
> = lim θ→0 1/(1 + cos θ) = 1/(1 + 1) = **1/2**

**Desmos:** `y=sin(x)/x` plus the point `(0,1)` as an **open circle**. Window: x from −10 to 10.

| x | ±0.1 | ±0.01 |
|---|---|---|
| sin x / x | 0.99833 | 0.99998 |

---

## 4. Bottom half: "Other Limit Representations"

Add a big gray header box in the middle (red text, 60 pt, like Example 3): **Other Limit Representations**

### Graphs (red title)
> **How to read it:** slide along the curve from the left, then from the right. If both sides approach the same y-value, that's the limit. The dot doesn't matter!
> lim x→2 f(x) = **3** (even though f(2) = 1)
> lim x→4⁻ f(x) = 1, lim x→4⁺ f(x) = 3, so lim x→4 f(x) **DNE**

**Desmos** (type exactly):
- `y={x<2: x+1, 2<x<=4: 5-x, x>4: x-1}`
- `(2,3)` as an **open circle**
- `(2,1)` as a **filled** point
- `(4,1)` as a **filled** point
- `(4,3)` as an **open circle**

Window: x from −1 to 6, y from −1 to 6.

### Tables (red title)
> lim x→3 (x² − 9)/(x − 3)

| x | 2.9 | 2.99 | 2.999 | 3 | 3.001 | 3.01 | 3.1 |
|---|---|---|---|---|---|---|---|
| f(x) | 5.9 | 5.99 | 5.999 | undef. | 6.001 | 6.01 | 6.1 |

> Both sides → 6, so the limit = **6**
> A table only *estimates*; algebra proves it.

### Piecewise Functions (left & right limits) (red title)
> f(x) = x² if x < 1; 2x + 1 if x ≥ 1
> lim x→1⁻ f(x) = 1² = 1
> lim x→1⁺ f(x) = 2(1) + 1 = 3
> 1 ≠ 3, so lim x→1 f(x) **DNE**
> **Rule:** the limit exists only if left limit = right limit.

**Desmos:** `y={x<1: x^2, x>=1: 2x+1}`, plus `(1,1)` as an open circle and `(1,3)` as a filled point.

### Squeeze Theorem (teal title)
> If g(x) ≤ f(x) ≤ h(x) near c, and lim x→c g(x) = lim x→c h(x) = L, then lim x→c f(x) = L.
> **Example:** lim x→0 x² sin(1/x)
> −1 ≤ sin(1/x) ≤ 1 → −x² ≤ x² sin(1/x) ≤ x²
> Both ±x² → 0, so the limit = **0**

**Desmos:** `y=x^2`, `y=-x^2`, `y=x^2 sin(1/x)`. Window: x from −0.5 to 0.5, y from −0.25 to 0.25.

### Continuity & DNE (teal title; include this if you learned it)
> f is **continuous** at x = c if:
> ① f(c) exists ② lim x→c f(x) exists ③ lim x→c f(x) = f(c)
> A limit **DNE** when there's a **jump** (left ≠ right), it's **unbounded** (±∞), or it **oscillates** (e.g. sin(1/x) near 0).

### Limits at Infinity (teal title; include only if your class covered it)
> Compare the degrees of the top (N) and bottom (D):
> N < D → 0  N = D → ratio of leading coefficients  N > D → ±∞
> lim x→∞ (4x² − x)/(2x² + 5) = 4/2 = **2** (horizontal asymptote y = 2)

### Credits (small text box, bottom right, 14 pt italic)
> *All graphs and tables were made by me in Desmos (desmos.com). Examples were worked by me.*

If you do copy a picture from a site (like Example 3 did with CalcWorkshop and Khan Academy), put the site name in small italic text in that box's bottom-right corner.

---

## 5. Finish and submit

**Proofread checklist**
- [ ] Every 0/0 method has an **expression** worked all the way to the answer
- [ ] At least one **graph** and one **table** in every section (the "trinity")
- [ ] Every arrow connects to a box
- [ ] Exponents are superscripts, and the minus signs are clear
- [ ] Your name and set are on it, and the credits line is included
- [ ] Every method from Examples 1 and 3 is covered: direct substitution, asymptote, 0/0, factoring, expansion, conjugates, complex fractions, trig identities, tables, graphs, piecewise, squeeze

**Export**
1. **File → Download → PNG image (.png).** You get one image of your slide.
2. Open the downloaded image and zoom in to check that the text is readable. If it's blurry, use **File → Download → PDF** instead, then screenshot the PDF zoomed to fit your screen.
3. Make sure the file is named `1.RademacherHenry.LimitsFlowchart.png`.
4. Upload it to the class folder **before 3:15 PM on Monday 9/28**.

**Peer comments (9/29–10/1):** comment on two classmates' flowcharts. Cover the design, the graph, table and algebra examples, something you like, and any math errors you find.
