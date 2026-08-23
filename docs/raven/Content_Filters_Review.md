# Content screen, part two: the All, Categorised, and Unassigned filters

**Date:** 23 August 2026
**Re:** the three non-queue filters on the merged Content screen
**Status:** two bugs, one provenance finding that needs answering today, one structural question about whether Categorised should exist

---

## 0. Short version

The Needs Review filter is doing real work. The other three are not, and two of them are actively misleading:

1. **All and Categorised return the same rows.** Same posts, same order, same blanks. One of them is not filtering.
2. **Most rows show a category with no provenance.** A post cannot have a final category and no record of who set it. Something is writing `category_final` without stamping source, or the dropdown is displaying a suggestion as though it were an assignment.
3. **The Unassigned tab says "No organic posts uploaded yet."** There are 730 uploaded. Wrong empty state.
4. **Both All and Categorised carry a live Save on every row**, which means the second write path the merge was supposed to remove is still there. It moved from a second screen to a second tab.

Details and fixes below.

---

## 1. ⚠ All and Categorised are returning identical result sets

Compare the two screenshots row by row. PC Merchandise's Video, AMD RYZEN 5 3400G, Premium gaming PC, Budget Gaming PC, Another Gaming PC, A solid upgrade, Custom Gaming PC, 58K AM5 GRR, the emoji post. Same nine rows, same order, same categories, same provenance blanks.

That cannot be right. Their stated definitions are different:

| Filter | Subtitle | Should be |
|---|---|---|
| All | "Every organic post and its assigned category." | everything, 730 rows |
| Categorised | "Posts with a final category (excluding Unassigned), and who set it." | `category_final IS NOT NULL` |

And the Needs Review tab reports 130 posts with no final category. So All and Categorised must differ by at least 130 rows. They do not appear to differ at all.

Most likely one of:

- the `WHERE` clause is not being applied on the Categorised branch
- both filters resolve to the same query and only the subtitle changes
- `category_final` is in fact populated for every post, in which case the Needs Review queue of 130 is measuring something else entirely

**The third possibility is the one that worries me**, because it would mean the queue and the corpus disagree about what has been categorised, and Chapter 4's provenance counts depend on that number being unambiguous.

- [ ] Send the SQL or Prisma query behind each of the four filters
- [ ] Send `COUNT(*)` for each: all posts, `category_final IS NOT NULL`, `category_final IS NULL`, `review_status = 'unresolvable'`, `category_final_source = 'MANUAL_GROUND_TRUTH'`

---

## 2. ⚠ Rows show a category with an empty provenance column

On both All and Categorised, most rows display a category in the dropdown (Product Showcase on six of the nine visible) and a dash in the Provenance column. Only three rows carry "Manual selection, Marketing Manager, <timestamp>."

A row on the Categorised filter is defined by that tab's own subtitle as a post with a final category **and who set it**. A row with a dash fails the second half of its own definition and should not be in the list.

There are only two explanations and they need different fixes.

**Explanation A: the dropdown is displaying a suggestion, not an assignment.** If the control falls back to `category_keyword` or `category_llm` when `category_final` is null, then the All view is showing the manager a screen full of categories that nobody assigned, styled identically to ones that were. He then sees "Product Showcase" against six posts and has no way to tell that five of them are machine guesses. That is a serious misrepresentation and it is also a route to accidental confirmation, since pressing Save on an unchanged dropdown would write the suggestion as a manual label.

**Explanation B: `category_final` is being written without stamping `category_final_source`.** Then we have finalised labels of unknown origin in the dataset, which is the provenance problem from the last two memos reappearing in a third place.

- [ ] Which is it?
- [ ] If A, the dropdown must render empty when `category_final` is null, with suggestions shown separately and visibly labelled as suggestions
- [ ] If B, every write path to `category_final` must stamp source, user, and timestamp, with no exceptions
- [ ] Either way, list every enum value `category_final_source` can take, and which code path writes each

---

## 3. ⚠ The three visible timestamps are 2:54 AM, 3:43 AM, and 3:51 AM

All three attributed to "Marketing Manager."

I need to ask directly, and I would rather ask than assume: **is Sir Dan actually logged in and categorising posts at 3:43 in the morning, or is a group member using the Marketing Manager account?**

If it is the latter, the audit trail does not record who assigned what. It records which account was open. Chapter 3 will state that final assignment is retained by the marketing manager, and Chapter 4's category analysis rests on those labels being his. If they are ours, the manuscript has to say so, and I need to know now rather than in October.

This is the same question as §2.3 of the provenance memo, and these timestamps are why I am asking again rather than waiting.

- [ ] Confirm who has credentials to the Marketing Manager account
- [ ] Send the audit-trail breakdown: every post with `category_final` set, grouped by the account that set it, with timestamps

If group members have been assigning, we are not in trouble, but we have to choose deliberately between handing the queue back to Sir Dan and documenting the arrangement explicitly in Chapter 3. What we cannot do is discover it later.

---

## 4. The Unassigned empty state is factually wrong

The tab reads:

> "Posts explicitly marked as unable to be categorized."
> **"No organic posts uploaded yet."**

730 organic posts are uploaded. The empty state is a shared component that has not been parameterised per filter, and it is asserting something false about the state of the database. Anyone opening that tab, including a panelist at the defence, would reasonably conclude the ingestion failed.

Correct copy: "No posts have been marked unassigned."

The same check applies to the other three filters. Each needs its own empty state:

| Filter | Empty state copy |
|---|---|
| Needs Review | "Nothing awaiting review. All posts have a category." |
| All | "No organic posts uploaded yet." (correct only here) |
| Categorised | "No posts have been categorised yet." |
| Unassigned | "No posts have been marked unassigned." |

---

## 5. Zero unassigned posts across 730 is itself worth a look

Not a bug, but it needs checking against what Chapter 1 already commits to.

The Limitations section says posts whose captions consist of a placeholder title, a bare emoji, or a link alone provide no text from which a category can be determined, and that a post remains unassigned where its content still cannot be determined. That paragraph is in the manuscript.

The Unassigned bucket is empty, and the ninth row on the All filter is a post whose entire caption is a single emoji, assigned **Entertainment** by manual selection.

So either the escape hatch is not reachable in the UI, or it is reachable and reviewers are not using it and are guessing instead. Either way, if the corpus ends with zero unassigned posts, Chapter 3's stated procedure and Chapter 4's results contradict each other, and the emoji post is the counterexample a panelist will find.

- [ ] Confirm Unassigned is selectable on the Needs Review row (it appears in the option list, so probably yes)
- [ ] Confirm whether any post has ever been set to it
- [ ] Whoever is reviewing needs telling that Unassigned is the correct answer for a caption with no determinable content, not a failure

---

## 6. The merge did not remove the second write path

This is the structural point, and it answers the question of why the screen feels redundant.

§3.1 of the consolidation memo identified the real cost of two screens as **two write paths to `category_final`, one bypassing the triage design entirely.** That was the reason for merging.

What shipped puts both screens under one sidebar entry, which is good, and then preserves both write paths as tabs. Every row on All and on Categorised has a live dropdown and an armed red Save. A reviewer can work straight down the All tab assigning categories and never see a flag, a suggestion, a review reason, or the two-candidate prompt. The labels produced that way are indistinguishable afterwards from ones that went through triage.

The merge was meant to make triage unavoidable. Right now it is optional and the option is one tab away.

### 6.1 What to change

Editing a finalised category from All is intended behaviour, per the consolidation memo. What is not intended is an always-armed write on every row of the full corpus.

- [ ] **On All and Categorised, the dropdown and Save start disabled.** An explicit "Change" action on the row arms them. One extra click, and it makes the write deliberate.
- [ ] **Changes made from these tabs stamp a distinct source value**, for example `MANUAL_CHANGE_AFTER_FINALISATION`, so Chapter 4 can separate first assignment from later revision.
- [ ] **Posts with no final category are not editable from All at all.** They route to Needs Review, where the suggestions and flags are. A link on the row is enough: "Categorise in review."

That last one is the important one. It makes triage the only door into first assignment, which is what the merge was for.

---

## 7. Does Categorised need to exist?

Direct answer to Raven's question: **probably not, and I would drop it.**

Categorised is `All` minus the uncategorised, which is a filter on a column, not a distinct view of the corpus. Its only stated advantage is showing who set the category, and the Provenance column is already on All. So it currently offers nothing All does not, which is exactly why the two screens look identical and why the tab feels pointless.

### 7.1 Proposed structure

Three tabs instead of four:

| Tab | Contents | Editing |
|---|---|---|
| **Needs Review** (default) | `category_final IS NULL`, excluding ground truth | full triage, suggestions, flags, batch confirm |
| **All posts** | everything, excluding ground truth | change on explicit action only, provenance shown |
| **Unassigned** | `review_status = 'unresolvable'` | change on explicit action only |

Then add, on the All tab, the filtering that makes Categorised unnecessary:

- **Category filter** (Product Showcase, Promotional Offer, Testimonial, Entertainment, Unassigned, Not yet categorised)
- **Post type filter**, which exists on Needs Review and is missing here
- **Provenance filter** (manual, batch confirmed, unset), which is the one thing genuinely worth being able to isolate

That gives the manager everything Categorised gave him, plus the ability to answer questions Categorised could not, such as "show me everything that was batch confirmed" or "show me every Testimonial." And it removes a tab from a screen the panel has already flagged for feature sprawl.

If you would rather keep four tabs, then Categorised has to earn the slot: make it provenance-mandatory, show source and user and timestamp as sortable columns, and make it the audit view rather than a second editing surface.

---

## 8. Smaller points on these three tabs

- **No row count and no pagination.** Needs Review says "130 in queue." All and Categorised say nothing. With 730 rows the manager needs a count and paging, or at minimum a count and virtualised scroll.
- **"Search by title" again.** Same issue as the queue screen. Confirm whether this searches the caption text the methods classify on, and relabel accordingly.
- **Post type filter is missing** on All and Categorised. It exists on Needs Review. §3.2 of the consolidation memo asked for search and post-type filters to carry across all views.
- **No sorting.** Views and Engagement are numeric columns sitting right there. Sortable headers cost little and make the screen genuinely useful for the manager when he is deciding what to promote.
- **Truncated titles with no tooltip.** "AMD RYZEN 5 3400G 4PCs COMPSHOP PAC..." cuts off. If the manager is judging a category from the caption, he needs the full text on hover or expand, not a truncation and a link that leaves the app.
- **Spelling.** "Unable to be categorized" on the Unassigned subtitle, "Categorised" on the tab. Pick British throughout, since the manuscript uses it and these screenshots go in the appendix.
- **Provenance formatting.** "Aug 20, 2026, 2:54 AM" over three stacked lines per row is heavy for a column that is empty on most rows. A single line, or an icon with the detail on hover, would read better.

---

## 9. Questions, consolidated

1. What query backs each of the four filters, and why do All and Categorised return the same rows?
2. Does the category dropdown display `category_final` only, or does it fall back to a suggestion when final is null?
3. What are the possible values of `category_final_source`, and which code path writes each?
4. Who holds the Marketing Manager credentials, and who was logged in at 2:54 AM, 3:43 AM, and 3:51 AM?
5. Has any post ever been set to Unassigned, and is that option reachable from every editing surface?
6. Are the 200 ground-truth posts excluded from All and Categorised as well as from the queue? They should be invisible and uneditable everywhere.

Question 6 matters as much as the rest. If the ground-truth 200 are editable from the All tab, the benchmark set can be changed after the fact and the FR-08 numbers stop being reproducible.

---

## 10. Checklist

**Bugs**

- [ ] All and Categorised return correctly distinct result sets, or Categorised is removed
- [ ] Unassigned empty state reads "No posts have been marked unassigned"
- [ ] Per-filter empty states for all four tabs
- [ ] "No title" and "View post" spacing (carried over from the previous memo)

**Provenance**

- [ ] Every write to `category_final` stamps source, user, and timestamp, with no path exempt
- [ ] Dropdown renders empty when `category_final` is null, rather than falling back to a suggestion
- [ ] Distinct source value for changes made after finalisation
- [ ] Audit-trail breakdown sent: posts by assigning account, with timestamps
- [ ] Ground-truth 200 excluded from every filter and uneditable everywhere

**Write paths**

- [ ] Dropdown and Save disabled by default on All and Categorised, armed by an explicit Change action
- [ ] Uncategorised posts are not first-assignable from All, they link to Needs Review

**Structure**

- [ ] Decision on dropping Categorised, or on making it the audit view
- [ ] Category, post type, and provenance filters on the All tab
- [ ] Row count and pagination on all tabs
- [ ] Sortable Views and Engagement columns
- [ ] Full caption available on hover or expand
- [ ] British spelling throughout

---

## 11. If you only do three things

**§1** (the identical query), **§2** (category with no provenance), and **§3** (who is logged in at 3 AM). The first is a bug, the second and third determine whether the labels we already have can be described accurately in the manuscript.

Everything in §6 and §7 is design work and can follow.
