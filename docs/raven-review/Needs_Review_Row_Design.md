# Needs Review row: the category chips do not read as controls

**Date:** 24 August 2026
**Re:** the selection and Save interaction on the Needs Review row
**Status:** design, not correctness. Nothing here is a bug.

---

## 0. The problem, stated plainly

Two people on our side have now opened the Needs Review screen, looked at the greyed **Save category** button, and concluded the feature was broken. Neither realised a category chip had to be clicked first.

The behaviour is correct and it is what we specified: nothing pre-selected, action disabled until a selection exists. The problem is entirely in how it presents. If the people who wrote the specification cannot tell the screen is waiting for input, the marketing manager will not either, and this is the screen the panel will watch being used live.

---

## 1. Root cause: the chips look like the badges

On the same row, at the same time, there are two sets of small rounded pills:

- **Photos** and **Videos**, top right, which are static type labels
- **Testimonial**, **Product Showcase**, **Promotional Offer**, **Entertainment**, **Unassigned**, which are the controls

Same pill shape, same thin border, same muted fill, same text weight. One set cannot be clicked and the other set is the entire purpose of the screen, and nothing visually separates them.

Once a reader has categorised the first pill they see as a label, the rest inherit that reading. That is why the button looks broken rather than pending: there is apparently nothing on the row to interact with, so a disabled button must mean a dead feature.

---

## 2. Five changes

### 2.1 Give the chips an unselected affordance

Add a radio circle or an empty checkbox to the left of each category label. An empty circle is unambiguous: it is a slot waiting to be filled, and no static badge on the screen has one.

This single change probably resolves most of the confusion on its own, because it makes the chips visibly a different kind of object from the Photos and Videos badges.

### 2.2 Give the chips a real selected state

A border colour shift is too subtle on a dark background. Selected should be a filled background, the radio dot filled in, and the label in a stronger weight. The manager should be able to tell what he picked from across the desk.

### 2.3 Change the button label with its state

Rather than adding helper text next to a disabled button, let the button say what it needs:

| State | Label |
|---|---|
| Nothing selected | **Select a category** (disabled) |
| Selection made | **Save category** (enabled) |

A button that names its own precondition is better than a static label plus an explanatory sentence. It also removes an element from an already busy row.

### 2.4 Make the disabled state actually look disabled

The button is currently dark red at reduced opacity. On this dark background that is close to the enabled red, so it reads as an unresponsive button rather than a waiting one. Use a neutral grey fill for disabled and reserve red for enabled. The colour change then does part of the signalling work by itself.

### 2.5 Move the button beside the chips, not below them

Right now the eye travels down from the chips to a button that appears unrelated to them. Placing it at the right end of the chip row, or immediately after the last chip, makes the connection between selecting and saving spatial rather than inferred.

---

## 3. Two structural points still outstanding from earlier memos

Both belong on this screen and both affect whether the row makes sense.

**Show both candidates when the methods disagree.** The row announces that the post sits between two categories and displays one chip under "Suggested for this post." The second candidate is somewhere in "Other categories," indistinguishable from the two neither method proposed. A single chip under a "Suggested" heading reads as a recommendation, which is precisely the nudge the two-candidate design was meant to avoid.

**Render flag reasons inline.** "+1 more" and "+2 more" hide the reasons behind a click. There are at most four possible reasons and each is a short phrase.

---

## 4. One more, from the empty Unassigned bucket

**Separate Unassigned from the four categories.** It currently sits in the same chip row as Product Showcase and Promotional Offer, which frames "I cannot determine this" as a fifth content type rather than an escape hatch.

Two facts suggest that framing is having an effect. The Unassigned bucket is empty across the whole corpus, and at least 5 posts have no caption text at all from which any category could be determined. The option is not being reached for, and the grouping is part of why.

Put it on its own line beneath the four categories, with a fuller label such as **"Cannot be determined from this post."**

---

## 5. Checklist

- [ ] Radio circle or empty checkbox on each category chip
- [ ] Filled selected state, not just a border change
- [ ] Button label switches between "Select a category" (disabled) and "Save category" (enabled)
- [ ] Grey fill for the disabled state, red reserved for enabled
- [ ] Button positioned beside the chip row rather than below it
- [ ] Both candidates shown under Suggested when the methods disagree
- [ ] Flag reasons rendered inline
- [ ] Unassigned on its own line with a fuller label

---

## 6. Priority

These are small and they compound, so they are worth doing together in one pass rather than piecemeal. None of them block writing, so they sit behind the count and provenance items in the other memo.

That said, this is the screen the panel will watch someone use during the demonstration. If a viewer's first reaction is that the button is broken, that impression is hard to recover from in the minute that follows.
