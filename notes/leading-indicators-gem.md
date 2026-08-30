---
created: 2026-08-24T13:11:58Z
updated: 2026-08-30T01:39:37Z
---

# Leading Indicators (GEM)

**The rule of this file:** every node is a number you can read on a public page. Tap the link, see the figure. If something has no page and no number, it is not in a chain.

**How to read:** `→` means "this number moves before that number". The last node in each chain is the one closest to GEM's revenue. Under each chain: **What** defines the indicators, **How it predicts** gives the mechanics, and **Lead** says how far ahead the warning comes.

---

# Market level

**M1 — The cash squeeze**
[Monthly CPI](https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/monthly-consumer-price-index-indicator/latest-release) → [RBA cash rate](https://www.rba.gov.au/statistics/cash-rate/) → [Variable mortgage rates](https://www.rba.gov.au/statistics/interest-rates/) → [Mortgage stress %](https://www.roymorgan.com/findings) → [Household saving ratio](https://www.abs.gov.au/statistics/economy/national-accounts/australian-national-accounts-national-income-expenditure-and-product/latest-release) → [Monthly household spending](https://www.abs.gov.au/statistics/economy/finance/monthly-household-spending-indicator/latest-release)

| Factor | Frequency | When |
|---|---|---|
| [Monthly CPI](https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/monthly-consumer-price-index-indicator/latest-release) | Monthly | Late each month, usually the last Wednesday, for the month before |
| [RBA cash rate](https://www.rba.gov.au/statistics/cash-rate/) | 8 times a year | Eight board meetings a year, about every six weeks, February to December |
| [Variable mortgage rates](https://www.rba.gov.au/statistics/interest-rates/) | Monthly | Each month, a few weeks after the month it covers |
| [Mortgage stress %](https://www.roymorgan.com/findings) | Monthly | Around the middle of each month |
| [Household saving ratio](https://www.abs.gov.au/statistics/economy/national-accounts/australian-national-accounts-national-income-expenditure-and-product/latest-release) | Quarterly | First week of March, June, September and December |
| [Monthly household spending](https://www.abs.gov.au/statistics/economy/finance/monthly-household-spending-indicator/latest-release) | Monthly | Last week of each month, for the month before |

**What:** CPI is the official measure of price rises. The cash rate is the base interest rate the RBA sets. Variable mortgage rates are what banks charge home borrowers. Mortgage stress is the share of borrowers whose repayments eat too much of their income (search "mortgage stress" on the Roy Morgan page; it is a monthly release). The saving ratio is the share of income households keep. Household spending is what they spend each month.
**How it predicts:** If CPI rises, then the RBA lifts the cash rate. Banks pass the rise to variable loans within weeks, because almost no Australian mortgage is fixed. Repayments rise, stress rises, savings drain, and spending falls. The childcare gap fee comes out of that same shrinking wallet.
**Lead:** the chain runs from CPI to spending in one to three months, and reaches booked childcare days two to four quarters later.

**M2 — The job chain**
[RBA cash rate](https://www.rba.gov.au/statistics/cash-rate/) → [Job vacancies](https://www.abs.gov.au/statistics/labour/jobs/job-vacancies-australia/latest-release) → [Unemployment and underemployment](https://www.abs.gov.au/statistics/labour/employment-and-unemployment/labour-force-australia/latest-release) → [Participation rate](https://www.abs.gov.au/statistics/labour/employment-and-unemployment/labour-force-australia/latest-release)

| Factor | Frequency | When |
|---|---|---|
| [RBA cash rate](https://www.rba.gov.au/statistics/cash-rate/) | 8 times a year | Eight board meetings a year, about every six weeks, February to December |
| [Job vacancies](https://www.abs.gov.au/statistics/labour/jobs/job-vacancies-australia/latest-release) | Quarterly | Roughly mid-January, late March, late June and early October |
| [Unemployment and underemployment](https://www.abs.gov.au/statistics/labour/employment-and-unemployment/labour-force-australia/latest-release) | Monthly | A Thursday in the second half of each month, for the month before |
| [Participation rate](https://www.abs.gov.au/statistics/labour/employment-and-unemployment/labour-force-australia/latest-release) | Monthly | A Thursday in the second half of each month, for the month before |

**What:** Job vacancies count advertised unfilled jobs. Unemployment is the share of people who want work and have none. Underemployment is people who want more hours. Participation is the share of adults working or looking.
**How it predicts:** A family buys childcare so the parents can work. If vacancies fall, then hiring slows, and some parents lose work or hours. A parent who loses hours cuts care days first and the place second.
**Lead:** vacancies turn about two quarters before employment, and employment turns one to two quarters before booked days. Total warning: roughly a year.

**M3 — Is the second income worth it**
[Wage Price Index](https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/wage-price-index-australia/latest-release) minus [CPI](https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/monthly-consumer-price-index-indicator/latest-release) = real wage growth → [Average weekly hours per child in care](https://www.education.gov.au/early-childhood/about/data-and-reports/quarterly-reports)

| Factor | Frequency | When |
|---|---|---|
| [Wage Price Index](https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/wage-price-index-australia/latest-release) | Quarterly | Mid-February, mid-May, mid-August and mid-November |
| [CPI](https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/monthly-consumer-price-index-indicator/latest-release) | Monthly | Late each month, usually the last Wednesday, for the month before |
| [Average weekly hours per child in care](https://www.education.gov.au/early-childhood/about/data-and-reports/quarterly-reports) | Quarterly | Roughly January, April, July and October |

**What:** The Wage Price Index measures how fast pay rises. CPI measures how fast prices rise. Their difference is real wage growth — whether pay beats prices. Hours per child is the average weekly care a child uses. You compute the first node yourself from the two releases.
**How it predicts:** The family's gain from a second job is that pay minus the gap fee. If real wages are negative, then the gain shrinks, and the family drops a care day. Fewer days per child cuts revenue before any child actually leaves.
**Lead:** both series are quarterly; the effect shows in hours per child within one to two quarters.

**M4 — Wealth, rent and mood**
[Daily home value index](https://www.cotality.com/au/our-data/indices) → [Consumer sentiment index](https://melbourneinstitute.unimelb.edu.au/research/macroeconomics/latest-news/index-of-consumer-sentiment)
In parallel, the same wallet also pays rent: [Rental vacancy rate](https://sqmresearch.com.au/graph_vacancy.php) → [Weekly asking rents](https://sqmresearch.com.au/property)

| Factor | Frequency | When |
|---|---|---|
| [Daily home value index](https://www.cotality.com/au/our-data/indices) | Daily | Every business day |
| [Consumer sentiment index](https://melbourneinstitute.unimelb.edu.au/research/macroeconomics/latest-news/index-of-consumer-sentiment) | Monthly | Early each month, usually the second Tuesday |
| [Rental vacancy rate](https://sqmresearch.com.au/graph_vacancy.php) | Monthly | Around the middle of each month |
| [Weekly asking rents](https://sqmresearch.com.au/property) | Weekly | Every week |

**What:** The home value index tracks house prices daily. Consumer sentiment is a monthly survey of how households feel about money. Rental vacancy is the share of empty rentals. Asking rents are what landlords advertise.
**How it predicts:** If house prices fall, then owners feel poorer, mood falls, and families hesitate before signing up for a new repeat cost. If vacancy is low, then rents rise, and renters have less left for the gap fee. Both hit new enrolments before existing ones.
**Lead:** prices update daily and rents weekly; the enrolment effect follows one to two quarters later.

**M5 — Future children from migration**
[Permanent Migration Program stats](https://www.homeaffairs.gov.au/research-and-statistics/statistics/visa-statistics/live/migration-program) → [Net overseas migration](https://www.abs.gov.au/statistics/people/population/overseas-migration/latest-release) → [0–4 population](https://www.abs.gov.au/statistics/people/population/national-state-and-territory-population/latest-release)

| Factor | Frequency | When |
|---|---|---|
| [Permanent Migration Program stats](https://www.homeaffairs.gov.au/research-and-statistics/statistics/visa-statistics/live/migration-program) | Monthly | Once a month |
| [Net overseas migration](https://www.abs.gov.au/statistics/people/population/overseas-migration/latest-release) | Quarterly | March, June, September and December |
| [0–4 population](https://www.abs.gov.au/statistics/people/population/national-state-and-territory-population/latest-release) | Quarterly | March, June, September and December |

**What:** Planning levels are the permanent visa places the government sets each year. Net overseas migration is arrivals minus departures. The 0–4 population is the official count of children under five.
**How it predicts:** Family and partner visas bring people who form families here. If those lines shrink, then there are fewer future babies and toddlers, so fewer future enrolments. Read the family lines, not the headline — students do not fill childcare rooms.
**Lead:** two to five years. This is a slow, structural chain.

**M6 — Where the work happens**
[Share of people working from home](https://www.abs.gov.au/statistics/labour/earnings-and-working-conditions/working-arrangements/latest-release) → [Average weekly hours per child in care](https://www.education.gov.au/early-childhood/about/data-and-reports/quarterly-reports)

| Factor | Frequency | When |
|---|---|---|
| [Share of people working from home](https://www.abs.gov.au/statistics/labour/earnings-and-working-conditions/working-arrangements/latest-release) | Yearly | Once a year, in December |
| [Average weekly hours per child in care](https://www.education.gov.au/early-childhood/about/data-and-reports/quarterly-reports) | Quarterly | Roughly January, April, July and October |

**What:** The working-from-home share is the official count of who works from home. Hours per child is as in M3.
**How it predicts:** If employers demand more office days, then the child needs more care days. The link is direct: booked days rise with office days. This is the one demand chain that currently helps GEM.
**Lead:** the official series is yearly, so treat it as a slow trend; hours respond within a quarter or two of mandate changes.

**Standalone (market)**
- [Federal budget papers](https://budget.gov.au/) — the yearly document that sets subsidy money. **How it predicts:** if the budget grows or cuts the subsidy, the parent's out-of-pocket price moves the following financial year. **Lead:** about a year.
- [Small Ordinaries index](https://www.marketindex.com.au/asx/xso) and [RBA chart pack](https://www.rba.gov.au/chart-pack/) — the small-cap index and credit conditions. These price GEM's shares and debt. They do **not** predict revenue. Listed only so you never mistake them for demand signals.

---

# Sector level

**S1 — The feedstock**
[Births and fertility rate](https://www.abs.gov.au/statistics/people/population/births-australia/latest-release) → [0–4 population](https://www.abs.gov.au/statistics/people/population/national-state-and-territory-population/latest-release) → [Children in approved care](https://www.education.gov.au/early-childhood/about/data-and-reports/quarterly-reports)

| Factor | Frequency | When |
|---|---|---|
| [Births and fertility rate](https://www.abs.gov.au/statistics/people/population/births-australia/latest-release) | Yearly | Once a year, in October |
| [0–4 population](https://www.abs.gov.au/statistics/people/population/national-state-and-territory-population/latest-release) | Quarterly | March, June, September and December |
| [Children in approved care](https://www.education.gov.au/early-childhood/about/data-and-reports/quarterly-reports) | Quarterly | Roughly January, April, July and October |

**What:** Births count babies born each year. The fertility rate is babies per woman. Children in approved care is the official quarterly count of kids using subsidised care.
**How it predicts:** A baby born today enters a baby room in about a year and a preschool room in three to four. If births fall now, then rooms empty later, with near certainty. No marketing fixes a missing cohort.
**Lead:** one to two years for baby rooms, three to four for preschool rooms. The longest and most reliable warning in the file.

**S2 — Who is free to work**
[Female participation rate](https://www.abs.gov.au/statistics/labour/employment-and-unemployment/labour-force-australia/latest-release) → [Children in approved care](https://www.education.gov.au/early-childhood/about/data-and-reports/quarterly-reports)

| Factor | Frequency | When |
|---|---|---|
| [Female participation rate](https://www.abs.gov.au/statistics/labour/employment-and-unemployment/labour-force-australia/latest-release) | Monthly | A Thursday in the second half of each month, for the month before |
| [Children in approved care](https://www.education.gov.au/early-childhood/about/data-and-reports/quarterly-reports) | Quarterly | Roughly January, April, July and October |

**What:** Female participation is the share of women working or looking for work.
**How it predicts:** More working parents means more demand for care. The rate sits near its ceiling, so the chain now mostly warns on the downside: if participation falls, enrolments follow. Do not model more upside.
**Lead:** one to two quarters.

**S3 — The affordability scissor**
[CCS hourly rate cap](https://www.servicesaustralia.gov.au/type-child-care-you-use-can-affect-child-care-subsidy?context=41186) vs [Average hourly fee charged](https://www.education.gov.au/early-childhood/about/data-and-reports/quarterly-reports) → [Childcare line in quarterly CPI](https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/consumer-price-index-australia/latest-release) → [Children in care and hours per child](https://www.education.gov.au/early-childhood/about/data-and-reports/quarterly-reports)

| Factor | Frequency | When |
|---|---|---|
| [CCS hourly rate cap](https://www.servicesaustralia.gov.au/type-child-care-you-use-can-affect-child-care-subsidy?context=41186) | Yearly (each July) | Each July, at the start of the financial year |
| [Average hourly fee charged](https://www.education.gov.au/early-childhood/about/data-and-reports/quarterly-reports) | Quarterly | Roughly January, April, July and October |
| [Childcare line in quarterly CPI](https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/consumer-price-index-australia/latest-release) | Quarterly | Late January, late April, late July and late October |
| [Children in care and hours per child](https://www.education.gov.au/early-childhood/about/data-and-reports/quarterly-reports) | Quarterly | Roughly January, April, July and October |

**What:** The rate cap is the highest hourly fee the subsidy covers; it resets each July. The average fee is what providers actually charge, from the quarterly report. The childcare CPI line is the price parents pay after subsidy. [Income thresholds](https://www.servicesaustralia.gov.au/your-income-can-affect-child-care-subsidy?context=41186) decide each family's subsidy rate and sit on the same chain.
**How it predicts:** The cap grows with general inflation; fees grow with provider costs. If fees outgrow the cap, then every extra dollar lands fully on the parent. When the parent price runs about twice general inflation, families cut days, then places. This is the best price signal there is.
**Lead:** you can see the fee-vs-cap gap each quarter; enrolments respond over the following two to four quarters.

**S4 — The cost push behind the fee**
[Award pay guide, current rates](https://portal.fairwork.gov.au/ArticleDocuments/872/childrens-services-award-ma000120-pay-guide.pdf.aspx) → [Minimum rates under the wage grant](https://www.education.gov.au/early-childhood/providers/workforce/wages/minimum-rates) → [Average hourly fee charged](https://www.education.gov.au/early-childhood/about/data-and-reports/quarterly-reports) → feeds S3

| Factor | Frequency | When |
|---|---|---|
| [Award pay guide, current rates](https://portal.fairwork.gov.au/ArticleDocuments/872/childrens-services-award-ma000120-pay-guide.pdf.aspx) | Yearly (each July) | Each July, when the new award rates start |
| [Minimum rates under the wage grant](https://www.education.gov.au/early-childhood/providers/workforce/wages/minimum-rates) | As policy changes | Only when the policy changes. Program runs to 30 June 2028 |
| [Average hourly fee charged](https://www.education.gov.au/early-childhood/about/data-and-reports/quarterly-reports) | Quarterly | Roughly January, April, July and October |

**What:** The pay guide is the legal minimum wage table for childcare workers. The grant minimum rates are the higher wages a provider must pay to keep the government wage grant. The [fee growth cap in the grant conditions](https://www.education.gov.au/early-childhood/providers/workforce/worker-retention-payment/eligibility-and-conditions) is the brake on the last step.
**How it predicts:** Wages are a centre's biggest cost. If mandated wages step up, then fees must follow, which feeds the parent-price squeeze in S3. The wage steps are published long before they apply, so you can see the fee pressure coming. The brake only binds while a provider takes the grant, and the program runs to 30 June 2028. The live cap is 5.8%, covering 8 August 2026 to 7 August 2027, against an award rise of 4.75% from 1 July 2026. Costs are allowed to climb a little faster than fees, and that narrow spread is where the margin dies.
**Lead:** wage steps are known a year or more ahead; fees follow within about two quarters of each step.

**S5 — Competitor supply pipeline**
[RBA cash rate](https://www.rba.gov.au/statistics/cash-rate/) → [Building approvals](https://www.abs.gov.au/statistics/industry/building-and-construction/building-approvals-australia/latest-release) → [Number of approved services](https://snapshots.acecqa.gov.au/Snapshot/index.html)

| Factor | Frequency | When |
|---|---|---|
| [RBA cash rate](https://www.rba.gov.au/statistics/cash-rate/) | 8 times a year | Eight board meetings a year, about every six weeks, February to December |
| [Building approvals](https://www.abs.gov.au/statistics/industry/building-and-construction/building-approvals-australia/latest-release) | Monthly | Early each month |
| [Number of approved services](https://snapshots.acecqa.gov.au/Snapshot/index.html) | Quarterly | Roughly February, May, August and November |

**What:** Building approvals count buildings cleared for construction each month. The approved services count is the regulator's tally of licensed centres.
**How it predicts:** Cheap money makes new centres worth building. A centre approved today opens years from now and takes occupancy then. If the cash rate stays high, then the pipeline dries up, and future competition eases.
**Lead:** two to four years from approval to open doors.

**S6 — The scissor and its self-correction**
[Service count growth](https://snapshots.acecqa.gov.au/Snapshot/index.html) minus [children-in-care growth](https://www.education.gov.au/early-childhood/about/data-and-reports/quarterly-reports) = the occupancy drag → [Insolvencies, Education & Training industry](https://www.asic.gov.au/about-asic/corporate-publications/statistics/insolvency-statistics) → service count falls → occupancy recovers for survivors

| Factor | Frequency | When |
|---|---|---|
| [Service count growth](https://snapshots.acecqa.gov.au/Snapshot/index.html) | Quarterly | Roughly February, May, August and November |
| [children-in-care growth](https://www.education.gov.au/early-childhood/about/data-and-reports/quarterly-reports) | Quarterly | Roughly January, April, July and October |
| [Insolvencies, Education & Training industry](https://www.asic.gov.au/about-asic/corporate-publications/statistics/insolvency-statistics) | Monthly | Each month, for the month before |

**What:** Service count growth is new supply. Children-in-care growth is demand. Their difference is the occupancy drag every centre feels on average. The insolvency statistics count failing companies, split by industry.
**How it predicts:** If supply grows while demand shrinks, then average occupancy falls sector-wide, no matter how well anyone operates. Falling occupancy sends weak centres broke; closures remove supply; survivors' occupancy recovers. Watch the sign of the difference first, then watch closures. This is the best occupancy chain in the file.
**Lead:** the drag is visible every quarter, about half a year before the occupancy it causes; the self-correction takes a year or more.

**S7 — Trust**
[Search interest in childcare safety](https://trends.google.com/trends/explore?geo=AU&q=childcare%20abuse) → [Children in approved care](https://www.education.gov.au/early-childhood/about/data-and-reports/quarterly-reports)

| Factor | Frequency | When |
|---|---|---|
| [Search interest in childcare safety](https://trends.google.com/trends/explore?geo=AU&q=childcare%20abuse) | Daily | Every day |
| [Children in approved care](https://www.education.gov.au/early-childhood/about/data-and-reports/quarterly-reports) | Quarterly | Roughly January, April, July and October |

**What:** Google Trends counts how often people search a term, updated daily.
**How it predicts:** A safety scandal spikes searches within days. Scared parents stop enquiring, and enrolments follow. One bad case resets trust for the whole country, not just one operator. Search interest is the earliest visible trace of a trust shock.
**Lead:** days to weeks ahead of enquiries; one to two quarters ahead of the enrolment numbers.

**S8 — Regulatory tightening**
[Compliance actions and staffing waivers](https://snapshots.acecqa.gov.au/Snapshot/index.html) → [Quality rating conditions on grant money](https://www.education.gov.au/early-childhood/providers/workforce/worker-retention-payment/eligibility-and-conditions) → weak services lose funding and exit → feeds S6

| Factor | Frequency | When |
|---|---|---|
| [Compliance actions and staffing waivers](https://snapshots.acecqa.gov.au/Snapshot/index.html) | Quarterly | Roughly February, May, August and November |
| [Quality rating conditions on grant money](https://www.education.gov.au/early-childhood/providers/workforce/worker-retention-payment/eligibility-and-conditions) | As policy changes | Only when the policy changes. Quality Area 2 becomes mandatory July 2027 |

**What:** Compliance actions are regulator penalties and orders. Staffing waivers are permissions to run below required staffing. The quality condition ties the wage grant to a service's safety rating: from July 2027, meeting Quality Area 2 (child health and safety) is a mandatory condition of the Worker Retention Payment, and a service that falls short has its funding reduced or suspended.
**How it predicts:** If enforcement counts rise, then the regulator is pushing weak services out. That removes supply, which helps survivors, but it also feeds the news cycle, which hurts trust. The quality condition turns a bad rating straight into lost cash, on a fixed date. For GEM that is a company risk, not only a sector one, so read it with C2.
**Lead:** enforcement counts are quarterly; the funding and exit effects land within a year.

**S9 — The age-mix trap**
[Paid parental leave settings](https://www.servicesaustralia.gov.au/parental-leave-pay) and free state preschool hours → [Age mix of children in care](https://www.education.gov.au/early-childhood/about/data-and-reports/quarterly-reports)

| Factor | Frequency | When |
|---|---|---|
| [Paid parental leave settings](https://www.servicesaustralia.gov.au/parental-leave-pay) | Yearly (each July) | Each July, at the start of the financial year |
| [Age mix of children in care](https://www.education.gov.au/early-childhood/about/data-and-reports/quarterly-reports) | Quarterly | Roughly January, April, July and October |

**What:** The paid leave settings are the weeks of government-paid leave for new parents. The age mix is the share of children in care by age band, from the quarterly report.
**How it predicts:** Longer paid leave keeps babies home longer, which empties the baby rooms. Free preschool hours pull demand into the 3–5 rooms. A baby room needs one carer for four children; a preschool room needs one for eleven. So the mix can push profit down even when total headcount holds. Watch the age split, not the "free kindy" headlines.
**Lead:** the policy settings are known a year or more ahead; the mix shifts over one to two years.

**S10 — The first unpaid bill**
[Arena REIT announcements](https://www.asx.com.au/markets/company/arf) and [Charter Hall Social Infrastructure announcements](https://www.asx.com.au/markets/company/cqe) → [Insolvencies, Education & Training industry](https://www.asic.gov.au/about-asic/corporate-publications/statistics/insolvency-statistics) → [Number of approved services](https://snapshots.acecqa.gov.au/Snapshot/index.html) → feeds S6

| Factor | Frequency | When |
|---|---|---|
| [Arena REIT announcements](https://www.asx.com.au/markets/company/arf) | Half-yearly results | February and August, with each half-year result |
| [Charter Hall Social Infrastructure announcements](https://www.asx.com.au/markets/company/cqe) | Half-yearly results | February and August, with each half-year result |
| [Insolvencies, Education & Training industry](https://www.asic.gov.au/about-asic/corporate-publications/statistics/insolvency-statistics) | Monthly | Each month, for the month before |
| [Number of approved services](https://snapshots.acecqa.gov.au/Snapshot/index.html) | Quarterly | Roughly February, May, August and November |

**What:** These two trusts own childcare buildings and rent them to the operators. Their results give the rent collection rate, the rent-to-revenue ratio, and the name of any tenant in default. Rent-to-revenue is the share of a centre's takings that goes to the landlord.
**How it predicts:** Rent is a fixed cost, so a centre stops paying rent before it stops trading. If a trust names a tenant in default, then that operator is broke in all but name, and its centres will leave the register. If rent-to-revenue climbs across the portfolio, then more defaults follow. Most rivals are private and publish nothing, so this is the only public read on them.
**Lead:** a default notice lands months before the insolvency statistics count it, and a year or more before the closures reach the service count.

---

# Company level

**C1 — The master chain**
[Enquiry volume and conversion](https://www.asx.com.au/markets/company/gem) → [Spot occupancy](https://www.asx.com.au/markets/company/gem) → EBIT

| Factor | Frequency | When |
|---|---|---|
| [Enquiry volume and conversion](https://www.asx.com.au/markets/company/gem) | Half-yearly results and AGM | February and August results, plus the AGM |
| [Spot occupancy](https://www.asx.com.au/markets/company/gem) | Half-yearly results and AGM | February and August results, plus the AGM |

**What:** Enquiry volume is how many families contact G8. Conversion is the share of them that enrol. Spot occupancy is the share of licensed places filled on a given day. All three appear only in GEM's results and AGM presentations on that announcements page.
**How it predicts:** Every enrolment starts as an enquiry. If enquiries hold but conversion falls, then G8 has a price problem. If enquiries themselves fall, then G8 has a trust problem. Occupancy follows enquiries, and revenue follows occupancy — apply management's per-point EBIT sensitivity to the spot number, never the annual average.
**Lead:** enquiries lead occupancy by about a quarter. The February spot is the January intake, and it locks in the revenue base close to a year ahead.

**C2 — Legal news cycles**
[County Court lists](https://www.countycourt.vic.gov.au/court-schedule) and [Federal Court lists](https://www.fedcourt.gov.au/court-calendar/daily-court-lists) → [Search interest in G8](https://trends.google.com/trends/explore?geo=AU&q=g8%20education) → [Enquiry volume](https://www.asx.com.au/markets/company/gem)

| Factor | Frequency | When |
|---|---|---|
| [County Court lists](https://www.countycourt.vic.gov.au/court-schedule) | Daily | Every business day |
| [Federal Court lists](https://www.fedcourt.gov.au/court-calendar/daily-court-lists) | Daily | Every business day |
| [Search interest in G8](https://trends.google.com/trends/explore?geo=AU&q=g8%20education) | Daily | Every day |
| [Enquiry volume](https://www.asx.com.au/markets/company/gem) | Half-yearly results and AGM | February and August results, plus the AGM |

**What:** Court lists show upcoming hearing dates — the abuse case sits in the County list, the workplace case in the Federal list. Search interest shows public attention. The [state regulator's charges against G8 itself](https://www.vecra.vic.gov.au/criminal-charges-against-g8-education-limited-allegedly-putting-childs-safety-risk) and [Fair Work Ombudsman media releases](https://www.fairwork.gov.au/newsroom/media-releases) run in parallel.
**How it predicts:** Each hearing produces headlines, headlines scare parents, and scared parents do not enquire. The court calendar is public, so you know the dates of the next news cycle before the news exists.
**Lead:** hearing dates appear days to months ahead; the enrolment dent shows about a quarter after each cycle.

**C3 — Network shrinkage**
[Live centre count and enforcement tally on the public register](https://startingblocks.gov.au/large-providers/g8-education) → [G8's own network update page](https://g8education.edu.au/update-on-centre-network-operations) → [Revenue in results](https://www.asx.com.au/markets/company/gem)

| Factor | Frequency | When |
|---|---|---|
| [Live centre count and enforcement tally on the public register](https://startingblocks.gov.au/large-providers/g8-education) | Live | Any time, because the page is live |
| [G8's own network update page](https://g8education.edu.au/update-on-centre-network-operations) | As needed | Only when G8 posts an update |
| [Revenue in results](https://www.asx.com.au/markets/company/gem) | Half-yearly results | February and August, with each half-year result |

**What:** The register lists every licensed G8 centre, live. The network update page is G8's own list of suspended sites. Net debt and leverage in the results show how long loss-making centres can be carried.
**How it predicts:** A centre that leaves the register stops earning. The register moves before any ASX announcement, so you watch capacity shrink in real time. If debt headroom tightens, then more closures follow.
**Lead:** days to weeks ahead of announcements; each closure cuts revenue immediately. The earliest company-specific read there is.

**C4 — Price, which is a choice**
[Fee growth cap in the grant conditions](https://www.education.gov.au/early-childhood/providers/workforce/worker-retention-payment/eligibility-and-conditions) → [G8's fee announcement](https://www.asx.com.au/markets/company/gem)

| Factor | Frequency | When |
|---|---|---|
| [Fee growth cap in the grant conditions](https://www.education.gov.au/early-childhood/providers/workforce/worker-retention-payment/eligibility-and-conditions) | As policy changes | Only when the policy changes. Current cap 5.8%, to 7 August 2027 |
| [G8's fee announcement](https://www.asx.com.au/markets/company/gem) | Yearly | Once a year, late in the year |

**What:** The cap is the fee-rise limit G8 accepted to keep the wage grant, currently 5.8% for the year from 8 August 2026 to 7 August 2027. The fee announcement is G8's yearly rise notice.
**How it predicts:** The cap tells you the ceiling; the announcement tells you the rise chosen. Together they fix the price side of revenue for the year ahead. G8 can break the cap and hand back the grant, and that move itself would be a loud signal. The cap disappears when the program ends on 30 June 2028. Until then, price is the one lever on the revenue formula that management controls outright and still cannot pull freely.
**Lead:** the cap is known about a year ahead; the chosen rise is known weeks before it applies and then runs all year.

**C5 — Staffing, which reads backwards**
[Live G8 job ads on Seek](https://www.seek.com.au/G8-Education-jobs) → is G8 staffing for recovery or for shrinkage

| Factor | Frequency | When |
|---|---|---|
| [Live G8 job ads on Seek](https://www.seek.com.au/G8-Education-jobs) | Daily | Every day |

**What:** The Seek count is the number of live G8 job ads, filterable by state, updated daily.
**How it predicts:** A company hires ahead of the demand it expects. If ads rise in a state, then G8 expects to fill rooms there; if ads dry up, it does not. Read it as management's real bet, placed with money. The annual-report staffing metrics (retention, engagement) improved while occupancy fell, so they warn you of nothing — they only show the loss is not a quality problem.
**Lead:** one to two quarters ahead of staffing and occupancy moves.

**C6 — Separating GEM from the sector**
[GEM spot occupancy](https://www.asx.com.au/markets/company/gem) minus the sector read from [children in care](https://www.education.gov.au/early-childhood/about/data-and-reports/quarterly-reports) ÷ [approved places](https://snapshots.acecqa.gov.au/Snapshot/index.html) = the GEM gap

| Factor | Frequency | When |
|---|---|---|
| [GEM spot occupancy](https://www.asx.com.au/markets/company/gem) | Half-yearly results and AGM | February and August results, plus the AGM |
| [children in care](https://www.education.gov.au/early-childhood/about/data-and-reports/quarterly-reports) | Quarterly | Roughly January, April, July and October |
| [approved places](https://snapshots.acecqa.gov.au/Snapshot/index.html) | Quarterly | Roughly February, May, August and November |

**What:** GEM's own occupancy against the sector's implied occupancy, which you compute as children in care divided by approved places.
**How it predicts:** If the gap widens, then the damage is G8's own — trust and brand. If it narrows, then the problem is the industry's. This is a diagnostic, not a warning: it tells you which of the chains above to weight most.
**Lead:** none by itself; update it each quarter to steer your reading of everything else.

**Standalone (company)**
- [Substantial holder notices and board changes](https://www.asx.com.au/markets/company/gem) — a notice shows a big investor's stake change. Near the takeover line, it turns the stock into a control story. That changes the price of the shares, not the revenue, but it can end the whole forecasting exercise overnight.
- [G8's quality ratings and licence conditions](https://startingblocks.gov.au/large-providers/g8-education) — ratings now gate grant money, so a downgrade cuts cash within about a year. Watch the state concentration, not the national total.

---

# Traps

- A February spot occupancy and an annual average are different animals. February is the seasonal trough. Never compare them.
- Sector "centre counts" differ by source. The [quarterly subsidy report](https://www.education.gov.au/early-childhood/about/data-and-reports/quarterly-reports) and the [regulator snapshot](https://snapshots.acecqa.gov.au/Snapshot/index.html) count different populations. Pick one and stay with it.
- The share price, the small-cap index, credit spreads and the goodwill write-down are not revenue indicators. They move the multiple, not the top line.
- GEM does not disclose its average daily fee, its government-vs-parent revenue split, or the places lost to suspensions. Any such figure is your own derivation.

# If you only check five pages

1. [GEM announcements](https://www.asx.com.au/markets/company/gem) — spot occupancy, enquiries, conversion.
2. [The public register's G8 page](https://startingblocks.gov.au/large-providers/g8-education) — live centre count.
3. [The quarterly subsidy report](https://www.education.gov.au/early-childhood/about/data-and-reports/quarterly-reports) — demand, hours, fees, age mix.
4. [The regulator snapshot](https://snapshots.acecqa.gov.au/Snapshot/index.html) — supply, waivers, compliance.
5. [The quarterly CPI childcare line](https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/consumer-price-index-australia/latest-release) — the out-of-pocket squeeze.

#fundamental_analysis  
#gem 
