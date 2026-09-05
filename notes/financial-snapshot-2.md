---
created: 2026-09-05T12:50:00Z
updated: 2026-09-05T13:54:38Z
---

# Financial Snapshot (GEM)

**What this file is for.** The chains in `leading-indicators.md` forecast revenue.
They never say what the business is worth, or what it can survive. This file does that. It is built once, rebuilt yearly, and refreshed at each half-year for net
debt, leverage and cover, because those three move and those three are the ones
that kill you.

**How a briefing uses it.** A briefing does not read the tables. It reads
**the threshold lines at the end** — the level at which the answer changes. Every
occupancy reading gets tested against a line instead of read as a mood.

**Currency:** A$ million. **Fiscal year ends 31 December.** H1 CY26 = half year to
30 June 2026.

**The definition of invested capital, fixed here and never to be switched:**

> **NOPAT** = G8's own Operating EBIT (adjusted for leases) x (1 - 30%).
> **Invested capital** = shareholders' equity + net debt excluding lease liabilities.
> **Goodwill is included.**

Goodwill is included because excluding it makes the denominator negative. G8's
goodwill has exceeded its whole equity in every year in this file, so tangible
invested capital is below zero and a ratio built on it means nothing. Include it,
and read the FY25 jump in the ROIC row as the write-down that it is.

---

# A. Core block

## Cash

| FY | Operating cash flow | Capex | Free cash flow | D&A | Cash conversion |
|---|---:|---:|---:|---:|---:|
| 2021 | 84.27 | 41.38 | 42.88 | 88.53 | 43% |
| 2022 | 136.76 | 58.48 | 78.28 | 94.87 | 69% |
| 2023 | 201.51 | 43.66 | 157.85 | 102.13 | 91% |
| 2024 | 167.06 | 31.90 | 135.16 | 103.30 | 64% |
| 2025 | 168.04 | 50.96 | 117.08 | 105.74 | 70% |
| H1 CY26 | 49.40 | 24.40 | 25.00 | n/d | n/d |

Source: stockanalysis.com, five-year statements, read 5 September 2026. H1 CY26
from the [H1 CY26 earnings call](https://au.investing.com/news/transcripts/earnings-call-transcript-g8-education-posts-weak-h1-2026-as-occupancy-falls-93CH-4614469),
25 August 2026: operating cash flow $49.4m, down 42.2%; capex invested $24.4m
including SaaS.

Cash conversion here is operating cash flow divided by (EBIT + total D&A). Note
that stockanalysis.com's own EBITDA line adds back only about $31m of D&A, not the
$106m in the table, because it leaves right-of-use depreciation out. Do not mix the
two.

**Capex is not split between maintenance and growth. G8 does not disclose one.**
The nearest thing to a split is H1 CY26, where $19.9m of the $22.1m spent
(excluding SaaS) went to "centre improvements that support safety and quality
standards" ([H1 CY26 slides](https://au.investing.com/news/company-news/g8-education-h1-2026-slides-occupancy-drop-hits-earnings-93CH-4614484),
25 August 2026). On that one reading, about 90% of capex is maintenance. Management
guides "circa $50 million" for CY26.

**Two cash flow numbers exist and they differ by $64m.** The FY25 investor call says
operating cash flow of $168m "after interest and tax". The FY25 Annual Report
highlights page says $103.8m, and free cash flow of $12.3m. The definitions differ,
almost certainly by lease principal payments, and **the bridge is not verified.**
This file uses the conventional basis in the table above. A later session should pin
the bridge.

## Leverage

| FY | Drawn bank debt | Cash | Net debt (ex leases) | Lease liabilities | Net debt / EBITDA | Bank interest cover | All-in interest cover | Debt service cover |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 2021 | 96.05 | 74.13 | 21.92 | 632.86 | 0.11x | n/d | n/d | n/d |
| 2022 | 128.86 | 37.83 | 91.03 | 584.70 | 0.46x | 7.5x | 1.99x | 1.03x |
| 2023 | 100.31 | 40.25 | 60.06 | 677.83 | 0.27x | 10.4x | 2.30x | 1.51x |
| 2024 | 114.60 | 47.68 | 66.93 | 669.39 | 0.26x | 14.0x | 2.88x | 1.32x |
| 2025 | 155.00 | 38.09 | 116.91 | 664.08 | 0.49x | 15.7x | 2.73x | 1.40x |
| H1 CY26 | **160.00** | **36.39** | **123.61** | n/d | n/d | **6.3x** | **1.34x** | n/d |

**Lease liabilities are shown on their own line and are excluded from net debt,
because that is how G8 reports it.** G8's stated net debt was $117m at 31 December
2025 and **$123.6m at 30 June 2026** (both from the investor calls). The drawn bank
debt column is derived as total debt less lease liabilities, and it reconciles: the
$155.0m implied at 31 December 2025 leaves $45m undrawn on the $200m revolver, which
is exactly what the CFO said on the FY25 call.

Interest cover is given three ways because one number would mislead. **Bank interest
cover** uses bank interest only, which is the interest a lender tests. **All-in cover**
adds the lease interest, which runs about $41m a year — two routes give $40.9m and
$41.7m for FY25 and the full-year figure is not printed anywhere. **Debt service cover**
is operating cash flow divided by bank interest plus lease cash payments, and it says
that in FY22 the business covered its rent and interest 1.03 times.

**Both periods are now printed**, from Note 5 of the 2025 Annual Report and Note 3(c)
of the half-year accounts ($'000):

| | FY25 | FY24 | H1 CY26 |
|---|---:|---:|---:|
| Interest expense (bank) | 8,340 | 9,907 | 5,621 |
| Borrowing costs expense | 253 | 1,451 | 128 |
| Interest on lease liabilities and make good | **42,037** | 45,112 | **20,650** |
| **Total finance costs** | **50,630** | **56,470** | **26,399** |

Against earnings before all finance costs of $135.3m in FY25 and $35.4m in H1 CY26 —
G8's operating EBIT plus the lease interest it deducts before striking it — **bank
interest cover was 15.8x in FY25 and fell to 6.3x**, and **all-in cover was 2.67x in
FY25 and fell to 1.34x**. All-in cover is the closest public proxy for the fixed charge
cover ratio, which is the covenant the bank agreed to reduce. **It halved in one half.**

Facilities, from Note 9 of the half-year accounts: a club debt facility with total
limits of **$240.0m** including a $40.0m bank guarantee facility, of which **$200.0m is
revolving** in two $100m tranches. The first tranche was extended during H1 CY26 from
December 2027 to **January 2029**; the second runs to December 2029. **$160.0m drawn and
$40.0m unused at 30 June 2026**, against $155.0m drawn and $45m unused at 31 December
2025.

**The borrowings are secured, and they always have been in this file's window** —
$114.0m secured at 31 December 2024, $140.0m at 30 June 2025, $155.0m at 31 December
2025 and $160.0m at 30 June 2026, with unsecured borrowings nil at every date except a
small insurance line. Do not report a move to secured lending as a new credit signal;
there was none.

**The $4.6m that made the sources disagree is explained.** Total borrowings at 30 June
2026 were $164.604m, being **$160.0m of secured revolver plus $4.604m of current
unsecured "annual insurance premium funding"**. G8's stated net debt of $123.6m is
$160.0m less $36.389m of cash. simplywall.st's $128.21m is $164.604m less the same
cash. Both are right; they differ only by the insurance line.

Cost of debt, derived: FY25 bank interest of $8.59m on average drawn debt of $134.8m
implies about **6.4%**. G8 publishes no rate or margin.

## Liquidity

| FY | Current assets | Current liabilities | Current ratio |
|---|---:|---:|---:|
| 2021 | 123.62 | 253.91 | 0.49 |
| 2022 | 84.36 | 252.58 | 0.33 |
| 2023 | 78.41 | 285.33 | 0.28 |
| 2024 | 90.86 | 262.46 | 0.35 |
| 2025 | 72.54 | 250.36 | 0.29 |
| H1 CY26 | 82.005 | 257.278 | 0.32 |

**The ratio near 0.3 is structural, but not for the reason you would guess.** It is
not fees in advance. At 30 June 2025 contract liabilities — fees paid ahead — were
only **$9.2m, or 3.7%** of current liabilities. The current portion of lease
liabilities ($71.4m) plus employee provisions ($72.5m) was **$143.9m, or 59%**
(CY25 Interim Report, note 15). AASB 16 parks a year of rent in current liabilities
and 8,800 staff carry a year of accrued leave. Both are structural. Neither is
distress.

**At 30 June 2026 the same picture is printed:** total current assets $82.005m, total
current liabilities $257.278m, and **contract liabilities of $7.701m** — still about 3%
of current liabilities. The cause has not changed.

One real caution sits underneath it. The CY25 interim report carries a
working-capital deficiency note: current liabilities exceeded current assets by
**$174.1m** at 30 June 2025, and management points to undrawn facilities to support
the going concern. The gap at 30 June 2026 is **$175.3m**. That is normal for this business model and it is also the reason
the undrawn balance matters more than the ratio.

## Returns

| FY | Operating EBIT | NOPAT | Invested capital | ROIC | ROE |
|---|---:|---:|---:|---:|---:|
| 2021 | n/d | n/d | 936.63 | n/d | 5.12% |
| 2022 | 80.30 | 56.21 | 974.39 | 5.8% | 4.07% |
| 2023 | 100.60 | 70.42 | 965.56 | 7.3% | 6.27% |
| 2024 | 115.00 | 80.50 | 983.24 | 8.2% | 7.43% |
| 2025 | 93.30 | 65.31 | 642.59 | **10.2%** | −42.07% |
| H1 CY26 x2 | 29.40 | 20.58 | ~611 | **3.4%** | n/d |

**Read the FY25 ROIC of 10.2% with care. It rose because the denominator was written
off, not because the business improved.** Goodwill fell from about $1,046m to about
$697m on a $349.1m impairment, equity fell from $916m to $526m, and invested capital
fell by $341m. The same operating EBIT over a smaller book is a better ratio and an
unchanged business. The FY25 ROE of −42% is that write-down too, not trading.

**G8 publishes its own WACC, and it is 11% pre-tax.** Note 17 of the 2025 Annual Report
gives the goodwill impairment model a **pre-tax discount rate of 11% (2024: 11%)**, a
five-year forecast and a **2% terminal growth rate**, and says: *"The discount rate is
based on the Group's WACC... The cost of debt is based on the interest-bearing
borrowings of the Group and the lease portfolio of the Group."*

**That corroborates the independent estimate below almost exactly.** A post-tax WACC of
7.6% grosses up at 30% to **10.9% pre-tax**, against G8's own 11%. Two methods, one
answer. **Use 8% post-tax, 11% pre-tax, and stop debating it.**

**The independent derivation, kept for its inputs: about 8%, range 7% to 9%.** Built from the market values
at 4 September 2026: equity $100.3m, net debt $123.6m, so 45% equity and 55% debt;
after-tax cost of debt 4.5% on the derived 6.4%; asset beta 0.70 re-levered to 1.30
at that gearing; risk-free 4.25% and an equity risk premium of 5.6%. **The two
published WACC estimates are useless and should not be quoted** — valueinvesting.io
says 4.6% and alphaspread says 11.13%, a factor of 2.4 apart, because they weight
lease liabilities into debt differently. The betas agree at about 0.70, and that is
the only input worth taking from either.

## Ownership

| FY | Shares on issue | Change |
|---|---:|---|
| 2021 | ~847m | |
| 2022 | ~810m | buyback $34.8m |
| 2023 | ~809m | buyback $7.2m |
| 2024 | ~797m | buyback $18.4m |
| 2025 | ~762m | buyback $42.6m, 38.4m shares |
| 6 Aug 2026 | **771,558,755** | verified, Appendix 3H |

Only the August 2026 count is a verified figure. The yearly counts are derived from
equity divided by book value per share and are approximate to about a million. The
derivation is corroborated where it can be: the FY24-to-FY25 fall of about 38m
matches the 38.4m shares G8 says it bought.

**The direction has turned.** The buyback concluded at H1 CY26 after spending $0.6m,
and the count has risen by about 10m shares since December 2025. Nothing now offsets
employee issuance. Any recovery is shared across a slowly growing count.

## Covenants

**The three covenants are now named and their test dates are known. The thresholds are
still not published — and one of the three was reduced in 2026.**

Read from **Note 9 of the CY26 Half Year Report and Accounts**, 25 August 2026:

> "Under the terms of the club debt facility the Group is required to comply with three
> financial ratios at the end of each annual and interim reporting period."

> "As part of extending the maturity of the first $100.0 million tranche of the
> revolving facility, **the Group's fixed charge cover ratio financial covenant was
> reduced up to and including the 31 December 2027 testing point.**"

| | |
|---|---|
| The three covenants | **Net leverage ratio · fixed charge cover ratio · gearing ratio** |
| Tested | **At the end of each annual and interim reporting period** — so 30 June and 31 December, every year |
| Thresholds | **Not disclosed** |
| Compliance | Complied with all financial and operational covenants during the period |
| Changed in 2026 | **Yes. The fixed charge cover ratio was reduced, through the 31 December 2027 test** |

**On the "no waivers" answer, which needs care.** Asked on the H1 CY26 call whether G8
was seeking a covenant holiday, the CEO said "There were no waivers or anything
involved." That is accurate: this was not a waiver. It was a **covenant reduction
negotiated into the facility extension**. Both statements stand together, and a reader
who had only the transcript would not know the covenant had moved. **Read the accounts,
not the call.**

**Why it matters.** The fixed charge cover ratio measures whether earnings cover rent
and interest. That is the ratio under pressure: all-in interest cover fell from 2.73x
in FY25 to **1.34x in H1 CY26**. The bank gave relief on exactly the ratio that G8's
occupancy collapse attacks, and the relief expires after the **31 December 2027** test.
**That date is now the hard edge of the wait.**

Gearing was "circa 23%" at December 2025 and "circa 25%" at June 2026. Leverage was
**1.18x** at December 2025. **The denominator of that 1.18x is still not defined in any
public document**, and it is not necessarily the covenant's own definition.

**The FY25 wording is now read, and it dates the relief.** Note 20 of the 2025 Annual
Report, printed page 96, carries the same three ratios and **no mention of any
reduction**, and adds: *"The Group's forecasts indicate it will continue to satisfy the
financial covenants for a period of at least 12 months from the date of issuing the
financial statements."* That was signed in February 2026. **By July 2026 G8 needed the
fixed charge cover ratio reduced.** So the reduction is the **first** change, not the
second, and the deterioration between those two dates took about five months.

Two more things from the same note. The facility was **$245.0m at 31 December 2025**
($200.0m revolving, plus a **$45.0m** bank guarantee facility with $36.1m in use, plus a
$15.0m standby letter of credit), against $240.0m and $40.0m six months later — **the
bank guarantee facility was cut by $5m.** And the pricing is now known:

> "The facility incurs interest at a rate of **BBSY plus a margin based on the Group's
> leverage ratio**."

**That is a feedback loop worth stating plainly.** If leverage rises, the margin rises,
interest rises, and the fixed charge cover ratio falls further — and that is the
covenant already relaxed.

**Still not found: the numerical thresholds for any of the three ratios, and what the
fixed charge cover ratio was reduced from and to.** G8 has never published a number for
any of them, in either year.

## Valuation

| FY | Market cap | Enterprise value | EV/EBIT | EV/EBITDA | P/B |
|---|---:|---:|---:|---:|---:|
| 2021 | 941 | 1,594 | 14.98 | 12.52 | 1.03 |
| 2022 | 900 | 1,589 | 15.39 | 12.32 | 1.02 |
| 2023 | 955 | 1,703 | 14.23 | 11.36 | 1.06 |
| 2024 | 1,039 | 1,782 | 11.22 | 9.39 | 1.13 |
| 2025 | 523 | 1,299 | 9.62 | 7.80 | 1.00 |
| Sep 2026 | **100.3** | ~840 | 7.97 | 4.97 | 0.20 |

Enterprise value includes lease liabilities. Market cap at 4 September 2026 is
771,558,755 shares x $0.13 = **$100.3m**. Always compute it that way; stockanalysis
market cap does not match its own share count.

---

# B. Industry block — a lease-heavy, licence-dependent operator

The core block was designed for service businesses. G8 is one, but three things about
it are not in the core block and drive the outcome.

**1. The lease book is the real balance sheet.**

| | Amount |
|---|---:|
| Lease liabilities at 31 Dec 2025 | 664.08 |
| Net debt excluding leases | 116.91 |
| Market capitalisation, Sep 2026 | 100.30 |

The lease book is **6.6 times the market value of the company**. G8 signs 10 to
15-year leases on buildings that cannot be repurposed. Rent does not fall when
children leave, which is the whole reason a 7.5-point occupancy fall took 64% off
operating EBIT. Annual lease cash is about **$111m** — roughly $70m of principal and
$41m of interest — against operating cash flow of $168m in FY25. **Track the lease
liability at every half. A falling lease book is the only proof that the suspended
centres are actually leaving.**

**2. Government funding is a revenue concentration.**

Childcare Subsidy is paid to the centre, not the parent. G8 does not disclose the
split between government and parent revenue, so any such figure is a derivation.
Government funding liabilities were $13.0m at 30 June 2025 — money received ahead of
being earned, a second "in advance" line separate from fees.

**3. The licence is a condition, not a right.**

The Worker Retention Payment caps fee growth at 5.8% from 8 August 2026 to 7 August
2027, as a condition of a grant. Quality Area 2 conditions bite from July 2027. Two
regulatory matters are live: a Fair Work Ombudsman action over 1,400+ workers and
$2m+, and five VECRA charges carrying a maximum aggregate penalty of $197,300.
Neither is large in dollars. Both bear on trust, which is the demand cause that
matters.

---

# C. How the company looks

G8 is a solvent company with a broken income statement and an unbroken balance
sheet, and the two facts are less reassuring together than they sound apart.

The balance sheet is genuinely not the near-term problem. Bank debt of $123.6m
against a $200m revolver that now runs to 2029, $40m still undrawn, no covenant
breach and no waiver sought. Gearing of 25%. On bank interest alone the business
covers its interest more than ten times over.

The income statement is the problem, and it is a problem of arithmetic rather than
of management. Operating EBIT fell 64% in the half on a 12% revenue fall, because
$210m of fixed cost and $111m of annual lease cash do not move when occupancy does.
The business earned about **3.4% on its capital in the last half against a cost of
capital near 8%.** That is not a company having a bad year. That is a company
currently destroying value on every dollar it employs, and it will keep doing so
until occupancy rises by roughly ten points.

The thing that should worry a buyer most is the shape of the recovery required. G8
needs occupancy of about 70% to earn its cost of capital. It has not seen 70% since
2024, and it has never in five years exceeded 71.0%. So the case for buying is not
"the business recovers"; it is "the business recovers all the way back to its best
year and then holds there", against a sector that is still adding capacity and a
family budget that gets tighter if the Reserve Bank raises rates on 29 September.

The second thing is the covenant blindness. A company at 25% gearing with occupancy
down 7.5 points that will not publish its covenant thresholds is asking to be taken
on trust. The trust may well be warranted — the CEO denied waivers plainly, and
lenders extended the facility in July 2026, which lenders do not do for a borrower
they fear. But it means the single question that decides whether this is a cheap
recovery or a zero cannot be answered from public documents.

The honest summary: **the equity is a $100m option on a return to 70% occupancy,
written over $124m of net debt and $664m of leases, with the strike price unknown
because the covenants are unpublished.**

---

# D. Threshold lines

These are what briefings quote. Each names the level at which the answer changes.

**1. ROIC against WACC — the permanent veto.**
G8's cost of capital is about **8%**. On the last half's run rate it earned about
**3.4%**. To earn 8% on roughly $611m of invested capital, operating EBIT must reach
about **$70m a year**, against $29m annualised now. At a contribution margin of 32%
to 46%, that needs $88m to $126m more revenue, which at about $12.4m of revenue per
occupancy point is **7 to 10 points of occupancy**.

> **The line: about 70% occupancy.** Below it, a volume recovery creates revenue and
> destroys value. Spot occupancy was 61.9% on 21 August 2026 and the half averaged
> 57.0%. **Until a reading approaches 70%, ROIC vetoes BUY whatever the chains say.**

**And G8's own model does not get there this decade.** Note 17 of the 2025 Annual Report
states the assumption behind the goodwill impairment test:

> "Occupancy levels over the longer term assume **a return to 2025 occupancy levels by
> 2030**. These projections are below Management's strategic targets, but given sector
> conditions remain challenging and the Group currently has limited certainty around
> long-term occupancy levels, these levels were considered appropriate."

**2025 occupancy was 65.8%.** So the company's own audited base case is a return to
**65.8% by 2030** — roughly four points below the level at which G8 earns its cost of
capital, and five years away. **On G8's own numbers, discounted at G8's own 11%, this
business does not clear its cost of capital before 2030.** That is not a bear case. It
is the base case in the accounts, and it is the single most important sentence in this
file.

**2. Covenant headroom — the thresholds are unpublished, so watch the ratio that moved.**
The numerical thresholds are still not disclosed, so **the occupancy that breaks the
covenant cannot be computed and must not be estimated.** But the covenant under
pressure is now known by name: the **fixed charge cover ratio**, which the bank reduced
through the **31 December 2027** testing point. Its closest public proxy is the all-in
interest cover line in the Leverage table, which fell from 2.73x in FY25 to **1.34x in
H1 CY26**. The second observable is the undrawn balance on the $200m revolver.

> **The lines: all-in interest cover below 1.2x at any 30 June or 31 December, or
> undrawn facility below $20m.** Cover was 1.34x at June 2026 and undrawn was $40m.
> **And the date: 31 December 2027, when the relief expires.** If occupancy has not
> recovered by the December 2027 test, G8 must either negotiate again or comply with
> the original ratio. That is the hard edge of this wait, and it is sooner than the
> January 2029 facility maturity.

**3. The cash clock — how long the wait can last.**
Net debt rose **$6.6m** in the half to 30 June 2026, and it rose with the dividend
stopped and the buyback concluded, so there is nothing left to cut. At that observed
rate the $40m of undrawn facility lasts about **six halves, to roughly the end of
2028**, and the first facility tranche matures in January 2029.

> **The line: a half in which net debt rises by more than $20m.** That triples the
> observed rate and cuts the runway to about two years, which is shorter than the
> recovery the price assumes.

**4. Dilution — what a recovery is worth to Joe.**
The buyback is over and the count has grown about 10m shares since December 2025.

> **The line: an equity raising.** At $100m of market value against $124m of net debt,
> any raise is large relative to the register. A raise at 13c would issue shares at
> 0.2 times book. Watch for a trading halt, a placement, or a rights issue. **A raise
> resets this file completely.**

**5. The reverse read — what the price already assumes.**
Enterprise value is about $840m. For the equity to be worth today's $100m on a 10
times EV/EBIT multiple, operating EBIT must reach about **$84m**, which is roughly
the FY25 level and about **three times** the current run rate.

> **The market assumes operating EBIT returns to about $84m.** The chains show
> occupancy still falling, long day care capacity still growing, and a rate rise more
> likely than not on 29 September. **BUY needs the chains to say something the price
> does not already assume.**

**6. Impairment headroom — there is none, and the next reading is nearly certain.**
Note 17 states it plainly:

> "Given the Group has recognised goodwill impairment of expense of $349.1 million in
> 2025 there is **no headroom above the recoverable amount** as at 31 December 2025. As
> a result, any adverse changes to the key assumptions applied in the determination of
> the recoverable amount, such as occupancy levels and others, would result in a
> **further impairment expense**."

Occupancy has since fallen from 65.8% to 57.0% for the half, and $47.1m was already
impaired at H1 CY26.

> **The line: any further impairment at the CY26 full-year result in late February
> 2027.** It is close to certain, and it is cosmetic to cash but not to the equity: it
> cuts book value again, and book value is the denominator of the gearing covenant.
> **A goodwill write-down cannot breach the leverage or fixed charge covenants, but it
> can move the gearing one.** Watch that specific link.

**7. The Worker Retention Payment — a dated cliff worth $55m a year.**
Note 5 shows the grant credited **$55,343k against employment costs in FY25** (FY24:
$6,282k), and its footnote dates the funding "from 2 December 2024 **until 30 November
2026**". Note 17 says the impairment model **assumes the grant continues**, and that if
it does not, the model would instead assume "increases in childcare fees or decreases in
centre wages or a combination of both to achieve the same net outcome".

> **The line: 30 November 2026.** If the grant period is not extended, management's own
> stated fallback is to **raise fees** — into the second-worst demand problem this
> business has, at a moment when the subsidy cap is rising 3.83% against fee growth of
> 7.3%. **$55m is 59% of FY25 operating EBIT.** This is three months away and it is not
> in any briefing yet.

---

# E. Two standing cautions

**1. Rebuild yearly. Refresh net debt, leverage and cover at each half-year.** Those
three move, and they are the ones that kill you. The next refresh is the CY26
full-year result in late February 2027. The tables above carry FY21 to FY25 plus H1
CY26, and the next full rebuild is due after the February 2027 result.

**2. The definition of invested capital is fixed at the top of this file and must not
be switched.** NOPAT is G8's own operating EBIT after tax at 30%. Invested capital is
equity plus net debt excluding leases, with goodwill included. Goodwill is included
because excluding it makes the denominator negative in every year. A ROIC that moves
because the method moved is worse than no ROIC.

---

# F. What is not verified

**Resolved this session, from the 2025 Annual Report read in the browser:**

- ~~Goodwill carrying values either side of the impairment.~~ Intangible assets were
  **$699,518k at 31 December 2025 and $1,048,685k at 31 December 2024**. Note 7 splits
  the FY25 net impairment of $364.6m into **goodwill $349.1m, right-of-use assets
  $11.9m and property, plant and equipment $3.5m**.
- ~~Impairment testing assumptions.~~ Pre-tax discount rate **11%**, terminal growth
  **2%**, five-year forecast, value-in-use, tested at operating segment level.
- ~~FY25 finance costs as printed.~~ Now in the Leverage table.
- ~~A published interest rate or margin on the facilities.~~ **BBSY plus a margin based
  on the Group's leverage ratio.** The margin itself is not published; the derived
  all-in cost was about 6.4%.
- ~~Contract liabilities.~~ Now sourced at four dates: **$6,933k** at 31 Dec 2024,
  **$9,172k** at 30 Jun 2025, **$6,654k** at 31 Dec 2025, **$7,701k** at 30 Jun 2026.
- ~~Net debt at 30 June 2026 disagreeing between sources.~~ The $4.604m is current
  unsecured annual insurance premium funding. G8's $123.6m excludes it; simplywall.st's
  $128.21m includes it. Both are right. This file uses G8's.
- ~~Whether the covenant reduction was the first change.~~ It was. The FY25 note carries
  no reduction and forecasts twelve months of compliance.

**Still open:**

- **The numerical covenant thresholds**, and what the fixed charge cover ratio was
  reduced from and to. Never published, in either year.
- **The composition of the H1 CY26 $47.1m impairment** between goodwill, right-of-use
  assets and property. Note 7 shows how FY25 was split, so the half-year accounts
  should split the same way — it was not read.
- **The denominator of G8's stated 1.18x leverage.** Note also that the **accounts'
  own gearing ratio is 18% at 31 December 2025** — net debt excluding leases divided by
  total capital of $642,594k — against the CFO's "circa 23%" on the call. Net debt over
  equity gives 22.2%, which is probably what he meant. **Three gearing definitions are
  in circulation. Say which one you are using.**
- **The bridge between operating cash flow of $168.0m and G8's own $103.8m**, and
  between free cash flow of $117.1m and G8's own $12.3m.
- **The capex split between maintenance and growth.** Not disclosed on any basis.
- **FY21 to FY23 finance costs and FY21 operating EBIT.** FY24 and FY25 are printed.
- **The FY21 dividend.** The FY21 Annual Report says 3.0c declared for the full year;
  G8's dividend page shows a single $0.06 payment on 1 April 2022. A factor of two
  apart, unresolved.

#gem
#fundamental_analysis
