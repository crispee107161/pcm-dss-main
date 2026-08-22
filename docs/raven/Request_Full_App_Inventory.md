# Request: full application inventory

**Date:** 22 August 2026
**What I need:** every route in the app, what it shows, and who can reach it.
**Why now:** I've been reviewing the navigation one role at a time from partial descriptions, and that's how the Holt-Winters section sat live on Page Metrics for weeks without anyone catching it. I'd rather look at the whole thing once than keep finding things sideways.

No rush on this — it's a documentation pass, not a code change. But it blocks a few decisions I'd otherwise be guessing at.

---

## 1. What to send

One entry per route. Your Owner sidebar breakdown was close to the right format — same idea, but covering everything.

For each route:

| Field | What I need |
|---|---|
| **Route** | e.g. `/dashboard/owner/budget-reallocation` |
| **Sidebar label** | The exact text the user sees, or "not in sidebar" |
| **Section** | Which sidebar group it sits under (Overview / Content / Analytics / Reports / Administration), or "n/a" |
| **Roles** | Which of the three can reach it, and whether each is full access or view-only |
| **What it displays** | Two or three sentences. The actual content — charts, tables, numbers, controls. Not the intent, the content. |
| **FR** | Which functional requirement it implements, if you know. "Unsure" is a fine answer. |
| **Status** | Complete / partial / placeholder / experimental |

A markdown table or a plain list is fine. Don't spend time formatting it.

---

## 2. ⚠ Include routes that aren't in any sidebar

This is the important part.

The forecast section wasn't hidden — it was on a screen nobody happened to be reviewing. Anything reachable by URL, linked from inside another page, left over from an earlier iteration, or built and then set aside needs to be in this list.

Specifically please include:

- Routes reachable by typing the URL but not linked from a sidebar
- Pages linked only from *inside* another page (drill-downs, detail views, modals with their own route)
- Anything half-built or abandoned that still resolves
- Any dev/debug/test routes
- API routes that return user-facing data, if any are directly reachable

**If something is unfinished, say so.** I'd rather know a screen is a placeholder than review it as a deliberate design choice and give you notes on something you were going to rewrite anyway.

---

## 3. Also useful, if it's quick

**Shared components that render analytical output.** If several screens use the same chart or table component, one line naming it and where it's used saves me from reviewing the same thing three times.

**Anything you think is redundant.** You've been in the codebase daily and I haven't seen it at all. If two screens overlap, or something exists that nobody asked for, flag it — I'll take your read on that seriously.

**Anything in the spec that isn't built yet.** A short "not built" list is as useful to me as the built list. I need to know what to write around.

---

## 4. What I'll do with it

Three things, and they're currently blocked:

**Review the navigation as a whole.** I've been going role by role, which means I keep making calls without seeing how a screen sits relative to the others. Whether Method Evaluation should be its own sidebar entry or grouped with Categorization Review is a question I genuinely can't answer from descriptions of one role at a time.

**Check for anything else like the forecast.** Something that contradicts a documented scope decision, uses banned wording, or claims a capability we don't have.

**Write Chapter 3's system design section.** It has to describe the system as built. Right now I'd be describing it from memos, which is how the old draft ended up saying Laravel and Flask.

---

## 5. One open question this unblocks

Related to FR-08 (Method Evaluation), so you know what I'm weighing.

The screen currently opens with kappa figures and confusion matrices. That's right for the panel and wrong for the Marketing Manager — he can't read a confusion matrix and doesn't need to. The plan is to invert it: lead with a plain-language summary of what the agreement level means for his review behaviour, and put the full statistics behind an expander.

What I can't decide without the full picture is **where the screen belongs**. Options are: keep it as its own secondary sidebar entry, or group it with Categorization Review as a two-tab screen, since they're the same subject matter viewed differently.

I'll call it once I can see how the rest of the navigation is laid out.

---

## 6. Format

Whatever's fastest for you. A markdown file, a plain text list, even a spreadsheet export. Structure matters less than completeness — the thing I actually need is that nothing is missing from the list.

If it's easier to generate part of it from the file tree and fill in the descriptions by hand, do that.
