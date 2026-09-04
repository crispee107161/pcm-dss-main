# Rankings: two tabs showing the same data, and a rule about which sentences are static

**Date:** 3 September 2026
**Re:** Owner account, Rankings
**Status:** one explanation needed, one caveat to rewrite, one rule that applies everywhere

---

## 0. ⚠ Standing rules

### 0.1 No em dashes in interface copy

Use commas, full stops, or parentheses. This screen carries them in the page subtitle, the confounding caveat, and the methodology block.

### 0.2 Plain language over statistical notation

"Ad sets (N=17)" becomes "17 ad sets". Same for the campaign tab.

---

## 1. The figures are correct

Verified against the client's raw exports.

| Displayed | Check |
|---|---|
| 17 ad sets with messaging results | 17 |
| 17 campaigns with messaging results | 17 |
| Top group: 12 ads, ₱9,389, 816 inquiries, ₱12 | ₱9,388.51 and 816, cost per inquiry ₱11.51 |
| Second: 15 ads, ₱95,045, 7,999, ₱12 | ₱95,045.09 and 7,999, ₱11.88 |
| Third: 13 ads, ₱75,590, 6,312, ₱12 | ₱75,590.40 and 6,312, ₱11.98 |

---

## 2. ⚠ Both tabs display identical figures, and the reason needs stating on screen

Every row matches across By Ad Set and By Campaign. Same advertisement counts, same spend, same inquiries, same cost per inquiry, same order. Only the names differ.

**The reason is a characteristic of the client's account.** From the raw exports:

- 26 campaigns and 26 ad sets
- 26 distinct campaign-to-ad-set pairs
- **Zero campaigns containing more than one ad set**
- **Zero ad sets belonging to more than one campaign**

A strict one-to-one mapping. So grouping by campaign and grouping by ad set are the same operation with different labels.

This is not a defect, and the toggle is not wrong. FR-15 requires reporting by ad set and by campaign, and the system does both correctly. But a user switching tabs and seeing identical numbers under different names will assume something is broken, and a panelist will ask directly.

- [ ] **State it on the screen**, beneath the toggle

Suggested wording:

> Each campaign in this account contains exactly one ad set, so these two groupings show the same advertisements under different names.

### 2.1 ⚠ This sentence must be computed, not written

Raven raised this and it is the important half.

That statement is true of the client's current data. It would stop being true the moment they create a campaign with two ad sets, and the sentence would then be confidently wrong with nothing to catch it.

- [ ] **Derive it from the data.** Check whether any campaign contains more than one ad set. Show the sentence only when none do.
- [ ] When some do, either hide it or show the alternative, for example: "3 campaigns contain more than one ad set, so the two groupings differ."

---

## 3. The rule this points at, which applies to every screen

Two kinds of sentence appear in this system and they behave differently.

**Statements about method are static.** They describe what the system does and remain true regardless of what is uploaded. "Groups with fewer than three advertisements are flagged rather than hidden" is always true. So is the confounding caveat in §4, since observational data is observational whatever the dataset contains.

**Statements about data must be computed.** "Each campaign contains exactly one ad set" is a fact about the current records. So is "half the advertisements cost between ₱19 and ₱38" from the dashboard memo, and "Entertainment has the highest median engagement rate" from the Analysis screen.

A static sentence stating a fact about the data is a sentence waiting to become false.

- [ ] **Apply this test to every caption across the system.** If a sentence would be wrong after the next upload, it must be generated from the same computation that produced the figure beside it.

This is the same requirement as the templated interpretations in the Dashboard memo, generalised. Worth doing as one pass rather than screen by screen, since the failure mode is silent.

---

## 4. The confounding caveat: keep the substance, change the register

Current text:

> "Confounding caveat: ad sets and campaigns ran in different periods with different targeting, so this compares what happened, not a controlled test, a well-performing group may reflect the season as much as the content."

**It is right to be there.** Without it, the natural reading of this table is that ALL REELS SHOP is the best ad set and money should move there. But that group ran in particular months against particular audiences, and the ber-months groups near the top may be near the top because of December rather than because of anything about the ad set. That is a real risk of a wrong decision, and it is the hazard NFR-19 and NFR-20 exist to address.

**Three problems with how it reads.**

"Confounding caveat" is a term the account holder will not know. "Not a controlled test" implies he was expecting one and did not get it. And an amber alert bar spanning the page before he has seen a single figure reads as a warning that something is wrong with the system rather than as guidance on how to read a table.

- [ ] **Rewrite:**

> These groups ran at different times of the year and reached different audiences, so a group near the top may have benefited from its timing as much as from its content. Use this to see where money went and what it returned, rather than as a ranking of which ad sets are best.

The second sentence is the part currently missing. It tells him what the table is for, not only what not to conclude from it.

- [ ] **Move it beneath the toggle** rather than above the whole page
- [ ] **Use the muted treatment** applied to methodology notes elsewhere, not an amber alert bar

This sentence is static, per §3. It describes a property of observational comparison and remains true whatever is uploaded.

---

## 5. No plain-language finding at the top

Consistent with the Dashboard, Analysis, and Budget Reallocation memos, and required by FR-18.

The screen presents 17 rows and never states in words what they show. Add above the table, generated from the figures:

> The most efficient ad set generated inquiries at ₱12 each and the least efficient at ₱26, across 17 ad sets that recorded messaging conversations.

---

## 6. Working well, recorded so it is not re-raised

**Duplicate names are handled correctly.** ALL REELS SHOP and VIDEO REELS each appear twice with different identifiers, and the screen shows the identifier beneath the name. That is the name-reuse problem in the client's data (26 ad set identifiers against 24 distinct names) solved properly, and the methodology note explains why grouping is by identifier rather than by name.

**The LOW CONFIDENCE badge** on the two-advertisement group, with the note explaining that groups under three advertisements are flagged rather than hidden because their cost per inquiry rests on too little data.

**Groups with zero conversations show a dash and sort last**, rather than appearing as infinitely expensive or being dropped silently.

**The methodology note explains summation order**, that spend and inquiries are summed per advertisement across months first, then summed again across the advertisements in each group, before dividing. That is the ALG-09 convention stated where someone checking the figures can find it.

---

## 7. One thing for the manuscript, no action needed

The one-to-one structure in §2 needs stating in Chapter 3, since FR-14 and FR-15 both require reporting at both levels and a reader comparing the two tables will find them identical. Recorded here so the screen and the manuscript say the same thing.

---

## 8. Priority

1. **§2** and **§2.1**, the explanation and its computation. The screen currently invites the conclusion that a tab is broken.
2. **§4**, the caveat rewrite. It is the most jargon-heavy copy in the system and it sits above everything else on the page.
3. **§3**, the audit of static sentences that state facts about data. Worth doing once across all screens.
4. **§5**, the plain-language finding.
5. **§0.1** and **§0.2**, alongside the same pass elsewhere.

Nothing here is large. §3 is the one with reach beyond this screen.
