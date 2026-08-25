# FR-16 accepted with a caveat, FR-18 decided, and one new gap your pass surfaced

**Date:** 25 August 2026
**Re:** `FR16_Frequency_and_FR18_N_Pass_2026-08-25.md`
**Status:** two decisions, one new question, one pass still outstanding

---

## 1. FR-16 is built. The method is fine. The population needs a caveat.

**On the method:** always Spearman, no normality gate, is correct and I would not change it.

FR-16 asks the system to *report* the correlation. FR-10 explicitly requires *selection* between Pearson and Spearman. Those are different requirements and they justify different implementations. A fixed method chosen in advance is the stronger position anyway, since there is no selection step to cherry-pick. If a panelist asks why one correlation gets a normality test and the other does not, the answer is that one requirement asks for method selection and the other does not. I will state that in Chapter 3.

**On the population, there is a real issue.**

n = 482 ad-month rows drawn from roughly 187 advertisements. Each advertisement contributes about 2.6 observations, and those observations are not independent of each other. A Spearman p-value computed on repeated measures of the same units is anti-conservative, so the reported significance will look stronger than the data supports.

**I am not asking you to change the unit.** Ad-month is the right one for this question. Frequency accumulates over an advertisement's life, so collapsing to one row per advertisement would destroy exactly the within-ad variation the diagnostic exists to detect. Changing it would make the analysis worse.

What I need is for the non-independence to be visible rather than silent:

- [ ] **Display the unit on the card.** "n = 482 ad-months across 187 advertisements" rather than "n = 482." One string, and it is the whole fix on your side.
- [ ] Confirm the advertisement count so I can state it precisely

Chapter 3 will say that observations are ad-months rather than advertisements, that the same advertisement contributes multiple rows, and that the significance is therefore indicative rather than a formal test. That is defensible. Reporting a p-value on non-independent data without saying so is not.

---

## 2. ⚠ New gap: the demographic charts have no requirement and no ingestion path

Your §4 table lists Page Metrics rendering **Gender, Territory, Age/Gender, and Top Cities** charts. Those come from `Audience.csv`, `Gender.csv`, and `FollowerTopTerritories.csv`.

**FR-03** states that the system shall accept page-level, organic post, and advertising exports, and **shall reject files matching none of the three expected types.** A demographics file matches none of them. `Audience.csv` in particular is not even one table, it stacks an age-by-gender matrix, top cities, top countries, top pages, and a duplicate of the Follows daily series into a single UTF-16 file.

So either there is a fourth ingestion path that no requirement authorises, or the data was seeded outside the upload flow entirely. And Page Metrics has no requirement covering demographic reporting in either numbering scheme.

This is now the one remaining place where the system does something the manuscript does not describe. It is not your oversight, it surfaced because your pass was thorough enough to list the charts by name.

- [ ] **How does demographic data get into the system?** Upload path, seed script, or something else?
- [ ] **What happens if someone uploads `Audience.csv` through the upload form today?** Clean rejection per FR-03, a crash, or silent partial ingestion?
- [ ] **Which requirement is Page Metrics implementing** for those four charts, in either scheme?

The third question is the one that decides the matter. My inclination is to **write the requirements rather than remove the charts**, because the audience composition finding is genuinely valuable for Chapter 4 (roughly 40 per cent of the audience is outside the Philippines, and it explains part of why view count fails as a promotion criterion), and documenting a screen that already works costs less than deleting it. But I want your answers before drafting anything.

There is also a scale trap worth knowing about if we do bring demographics into scope: `FollowerTopTerritories.csv` reports Philippines as `0.601` while `Audience.csv` reports the same figure as `60.1`, and `Gender.csv` uses percentages. Same quantities, two scales, no header distinguishing them. If ingestion does not normalise, one path silently produces numbers off by a factor of 100.

---

## 3. The Dashboard adjacency: separate the rows

You flagged it without proposing a change. **Make the change.**

There are four documented places asserting that content category to advertising efficiency is permanently blocked by the absence of a join key, and that documentation is going into Chapter 3 as a methodological control. Placing a "Performance by Content Category" chart directly beside a "Cost-per-Inquiry Distribution" chart is a visual claim of precisely the relationship we spent that effort establishing does not exist.

Both captions are correct. Nobody reads captions during a demo. Layout asserts adjacency whether the text does or not.

- [ ] Move them onto separate rows, or put a non-category chart between them

---

## 4. FR-18: fix four, document two, leave one

Your pass is exactly what I asked for and the result is better than I expected. Decisions on the five partials:

**Fix these four:**

| Item | Why |
|---|---|
| FR-20 category distribution, highest/lowest callout | This is the categorisation payoff screen. 731 posts were labelled to make this comparison possible, and it currently renders as numbers with no statement of what they show. |
| Post Type Performance, per-row interpretation | Reels carry the highest median engagement rate and the lowest median views. That contrast is a finding and it deserves a sentence, not just two columns a reader has to compare themselves. |
| Top Ads, eligible-pool count per panel | Mechanical, as you say. The CTR panel stating its floor without stating how many advertisements cleared it is the exact gap FR-18 names. |
| Dashboard, narrative on the two median cards | Median CPI and median engagement are sample statistics and they carry `n` already. A one-line statement each closes the weakest screen on this requirement. |

**Leave alone:** the Dashboard's Spend, Inquiries, and Posts Published cards. Your reasoning is right. Those are totals, not sample statistics, and FR-18 speaks to analytical results. I will make that distinction explicit in Chapter 3 so the matrix can record it as a scope boundary rather than a gap.

**Document rather than fix:** Page Metrics' demographic record counts. That resolves with §2 above, since if demographics come into scope the requirement will specify what to display, and if they go out of scope the charts go with them.

**Your call, and low value either way:** FR-27's cohort curves. Owner-only, and the frequency diagnostic sub-section already carries full interpretation. If the other four land and there is time, do it. If not, the matrix records it as partial with a reason.

---

## 5. Still outstanding: Content, Upload Data, and account management

Your §5 folds most of the sidebar pass into the §4 table, which is fair for the analytical screens. Three are still unwalked: **Content, Upload Data, and the account-management pair.**

Those cover **FR-01, FR-02, FR-03, FR-04, FR-05, FR-07, and FR-20** in the manuscript numbering. Seven of twenty requirements, and the largest single block still unverified.

Upload Data matters most, because it is where §2's demographics question lives and because FR-03, FR-04, and FR-05 all describe behaviour on that one screen: type detection from column composition, rejection of unmatched files, validation reporting, and the post-upload record counts.

- [ ] Walk Content, Upload Data, and account management the same way you walked §4
- [ ] For Upload Data specifically, confirm the FR-05 ingestion summary displays records read, stored, updated, rejected, and identified as duplicates, since that is five named figures in the requirement

---

## 6. What is closed with this memo

FR-16 exists and the method is right. FR-18 is audited with decisions made on every partial. The CPI-by-category question is closed in code, in the UI, and in the manuscript. No leftover labels.

Once §5 comes back and §2 is answered, the matrix is complete and I write Chapter 3.

---

## 7. Order

1. **§2**, the three demographics questions. Only item that could still add or remove a requirement.
2. **§5**, the Content and Upload Data pass.
3. **§1**, the ad-month label. One string.
4. **§3**, the Dashboard row split.
5. **§4**, the four FR-18 fixes.

Items 1 and 2 are lookups, 3 and 4 are minutes, and 5 is the only real build.
