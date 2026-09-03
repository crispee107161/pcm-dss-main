# Top Ads: the rankings are counting months, not advertisements

**Date:** 3 September 2026
**Re:** Owner account, Top Ads
**Status:** one correctness issue affecting every panel, one naming collision, two smaller items

**Send this ahead of the Rankings and Budget Reallocation memos if you are working through them in order.** Those are presentation. This one is wrong figures.

---

## 0. ⚠ Standing rules

### 0.1 No em dashes in interface copy

Use commas, full stops, or parentheses.

### 0.2 Plain language over statistical notation

No shorthand an account holder has to decode.

### 0.3 Never reference the study or the research in interface copy

New, and added because I have twice suggested wording that broke it. The client has no study, he has a system.

Where a design decision is methodological, the screen states the operational consequence or says nothing. The study period boundary, the read-only lexicon, the fixed reference sample, and the two engagement rate conventions are all decisions he benefits from without needing to know exist.

This corrects an earlier suggestion of mine on the dashboard caption, which pointed the owner at "the study-wide analysis," something he cannot see.

---

## 1. ⚠ Every ranking on this screen ranks ad-months rather than advertisements

This is a correctness issue, not a presentation one, and it affects all six panels plus two of the three KPI cards.

### 1.1 The KPI cards count rows

| Card | Displays | Correct value |
|---|---|---|
| Total ads tracked | **746** | **309 advertisements** (746 is the monthly row count) |
| Ads with messaging conversations | **486** | **187 advertisements** (486 is the messaging row count) |
| Total ad spend | ₱901,197 | Correct |

An advertisement running four months contributes four rows. The cards are counting those rows and labelling them advertisements.

### 1.2 The same advertisement appears repeatedly in a single top ten

Visible on screen:

- **Top by Spend:** "Jun 28, 2025 - 6 trad san mateo" occupies positions 3 and 4, with different periods
- **Best Cost per Messaging Conversation:** "R5 5600G 8 MID PARANAQUE" appears **five times** in the ten, and "6 trad san mateo (winning) OK G" twice
- **Best Cost per Click:** "LAPTOP DEC 2025 - FEB 2026" appears three times
- **Best Click-Through Rate:** "R7 5700X 4060 Y68" appears twice

So a top ten is showing roughly four distinct advertisements.

### 1.3 The rankings change substantially when computed correctly

Computed from the client's exports:

| Rank | Screen shows (per ad-month) | Correct (per advertisement) |
|---|---|---|
| 1 | JB 6 TRAD SAN MATEO RIZAL G, ₱19,278 | **JB R7 5700G PINK VIRAL G, ₱34,648** |
| 2 | JB R7 5700G PINK VIRAL G, ₱14,741 | **RYZEN 5 PINK OK G, ₱33,100** |
| 3 | Jun 28, 2025 - 6 trad san mateo, ₱13,317 | **JB 6 TRAD SAN MATEO RIZAL G, ₱32,012** |
| 4 | Jun 28, 2025 - 6 trad san mateo, ₱13,247 | **Jun 28, 2025 - 6 trad san mateo, ₱31,078** |

The highest-spending advertisement in the account does not appear in the top two on screen.

### 1.4 This breaks FR-15a and contradicts every other screen

FR-15a requires the system to **rank individual advertisements** by expenditure, inquiries generated, reach, cost per inquiry, click-through rate, and cost per click.

It also breaks the summation convention used everywhere else. Rankings sums per advertisement across months before dividing, and says so in its methodology note. Budget Reallocation does the same. The regression does the same. Top Ads does not, and the figures it produces therefore disagree with the rest of the system.

- [ ] **Group by advertisement identifier, summing across months, before ranking**
- [ ] **Correct both KPI cards** to count distinct advertisements
- [ ] For the efficiency panels, sum spend and sum results per advertisement first, then divide, matching the convention stated in the Rankings methodology note

Grouping by identifier rather than name matters here for the same reason it does on Rankings: ten advertisement names recur across multiple identifiers in this account.

---

## 2. ⚠ The page has three names, and the title belongs to a different screen

The sidebar says **Top Ads**. The breadcrumb says **Top Ads**. The page title says **Campaign Rankings**.

The title is not only inconsistent, it describes the wrong thing. This screen ranks individual advertisements. The screen actually called **Rankings** is the one that groups by ad set and campaign. The two titles are the wrong way round, and a user moving between them would reasonably expect the opposite of what each contains.

- [ ] **Change the page title to "Top Ads"** and align the subtitle, which currently reads correctly and describes individual advertisements

---

## 3. The Period column

Two problems, and the second resolves the first.

The column truncates to "Jun 1, 202" with the year cut off.

More to the point, once §1 lands the column becomes meaningless. An advertisement summed across its whole life has no single period.

- [ ] **Replace it with the number of months the advertisement ran**

That is more useful than a date anyway. It tells the owner whether a figure rests on one month or four, which is the same low-confidence signal the other screens provide through advertisement counts.

---

## 4. Show the resolved dates beside the period selector

"All time" is correct and should stay. From the owner's side it means everything the system holds, which is exactly right, and the out-of-period exclusion is a decision he benefits from without needing to know about.

But his data ends in July 2026 rather than today, and a reader assuming otherwise will misread every figure on the screen.

- [ ] **Show the resolved range beneath the label**, the same treatment the dashboard selector now has: "All time" with "Aug 1, 2025 to Jul 31, 2026" beneath it

---

## 5. No plain-language finding

Consistent with the other screens and required by FR-18. Six panels with no statement of what they show.

Add beneath each section heading, generated from the same figures the panel displays:

> **By volume.** The three advertisements that spent the most account for ₱99,760 between them, roughly 11 per cent of all advertising spend over the period.

> **By efficiency.** The most efficient advertisement generated inquiries at ₱8.05 each. The least efficient of those shown cost ₱18.48, more than twice as much.

Per the rule established on the Rankings screen, any sentence stating a fact about the data must be generated from the same computation that produced the figures beside it, not written once.

---

## 6. Working well

**The volume and efficiency split is the right structure.** Volume answers where the money went, efficiency answers what it returned, and separating them stops the two being conflated. That distinction is the whole argument of Chapter 1's second condition, and this screen makes it structurally.

**Six panels each with its own disclosure** rather than one methodology block at the bottom, which is the pattern the Analysis screen should adopt.

**Total ad spend of ₱901,197** is correct and matches the client's exports to the peso.

---

## 7. Priority

1. **§1**, the ranking unit. Every figure on this screen is currently wrong, and the top advertisement by spend does not appear where it should.
2. **§2**, the title. One string, and it currently names another screen.
3. **§3** and **§4**, both small.
4. **§5**, the plain-language findings.
5. **§0.1**, alongside the same pass elsewhere.

§1 is the only substantial item, but it touches all six panels and both counts.
