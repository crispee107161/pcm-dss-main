# Content Category Codebook — PC Merchandise

**Version:** 1.0
**Date:** 12 August 2026
**Purpose:** Ground-truth labelling for FR-15 / Objective 2.2
**Applies to:** the 200 posts in `coding_sheet_CODER_*.csv`

---

## 1. What you are doing

You are assigning **one** category to each post, based **only** on its caption.

Your labels become the ground truth against which two automated methods (keyword matching and LLM suggestion) are measured. If your labels are inconsistent, that comparison means nothing — so consistency matters more than being "right" in any absolute sense.

## 2. Rules — read before starting

1. **Work alone.** Do not discuss any post with the other coder while coding. Disagreements are the point; they are what we measure.
2. **Do not open the system.** Do not look at any auto-generated category suggestion. Seeing one anchors your judgement and invalidates the whole exercise.
3. **Code from the caption only.** Do not open Facebook to view the image or video. The automated methods only see the caption, so you must judge on the same information.
4. **One category per post.** Use the tie-break rules in §4 when a post fits more than one.
5. **Fill only the `category` column.** Use `coder_note` for anything you want to flag. Change nothing else.
6. **Do not skip rows.** Every row gets a label. If you truly cannot decide, use `unclear` (§5).
7. **Do not go back and "fix" earlier rows** after your understanding shifts mid-way. If your interpretation changes, note it and raise it after coding is finished.

## 3. The four categories

Type the value in the left column **exactly** as written.

---

### `product_showcase`

**Definition.** The post presents a product, build, package, or specification. Its purpose is to show *what is sold*. Prices, component lists, model names, and package configurations are typical. There is no time-limited incentive and no customer story.

**Signals:** component names (Ryzen, Intel, RTX, GTX), package or set descriptions, "pricelist", "specs", diskless/comshop configurations, build showcases, "made for reliability", capability claims.

**Examples from the data:**
> "From setup to daily use 💻 Ryzen 5 5600G 10+1 Diskless package made for reliability. Chat us for full details."

> "Swabe sa gaming, solid sa multitasking 💻 Ryzen 7 5700G Gaming PC set ready. Message us anytime."

> "Thinking of starting a Computer Shop or Internet Cafe this year? Our new package pricing makes it easier."

---

### `promotional_offer`

**Definition.** The post offers a **time-limited or conditional incentive to buy**. The distinguishing feature is an inducement — a discount, a sale window, a freebie, a payment scheme, or scarcity — not merely the presence of a price.

**Signals:** promo, sale, discount, "% off", "limited", "while supplies last", installment, 0% interest, freebie, bundle deal, "ends [date]", "open for installment".

**Examples from the data:**
> "Check out our limited line of Laptops — built for productivity and multitasking! 💻⏳ 🔥Open for installment…"

**Boundary note.** A post that merely *states a price* is `product_showcase`. A post that offers a *reduction, a scheme, or a deadline* is `promotional_offer`. Ask: is there an inducement to act now, or just information about what is sold?

---

### `testimonial`

**Definition.** The post centres on a **completed customer experience** — a delivery, an installation, a transaction, a thank-you, or customer feedback. The subject is the customer or the transaction, not the product catalogue.

**Signals:** salamat, thank you, "delivered", "COD", "transaction done", client/customer references, "verified on the spot", installation-completed narratives, "malaking step para kay owner".

**Examples from the data:**
> "Tahimik lang ang transaction, pero malaking step para kay owner 🎮 Chat us if you want the same package."

> "Walang arte, diretso proseso 💻 COD Gaming PC transactions done right. Message us anytime."

> "Kapag maayos ang install, ramdam mo agad sa takbo 💻 Ryzen 5 Gaming 6PCs setup finished smoothly."

**Boundary note.** This is the hardest boundary in this dataset. Many posts describe a completed transaction *and* name the product. **Decide by what the caption is centred on:** if the narrative subject is the customer's experience or the completed transaction, it is `testimonial`, even when a product is named. If the product or package is the subject and the transaction is incidental, it is `product_showcase`.

---

### `entertainment`

**Definition.** The post exists to **be watched or enjoyed**, not to sell. The client described this category as content produced specifically so that audiences watch *without being sold to*. Humour, skits, relatable observations, questions to the audience, memes, trends.

**Signals:** jokes, skits, "relate?", "tag a friend", "comment down below", polls, challenges, gaming-culture humour, content with no product or transaction at its centre.

**Boundary note.** A humorous *tone* does not make a post `entertainment`. Many PC Merchandise captions are playful while still selling a package — those remain `product_showcase`. Ask: **remove the humour — is there still a product, offer, or transaction being presented?** If yes, it is not `entertainment`.

**Expect this category to be rare.** Preliminary scanning found very few clear cases. Do not stretch other posts to fill it. If a post is genuinely not entertainment, do not label it entertainment just because the category looks empty.

---

## 4. Tie-break rules

Apply **in order** and stop at the first that resolves the post.

1. **Explicit incentive wins.** If a time-limited or conditional offer is present (discount, installment, freebie, deadline), label `promotional_offer` — even if a product is also described.
2. **Completed transaction wins over product description.** If the caption is centred on a delivery, install, or completed sale, label `testimonial` — even if a product is named.
3. **Otherwise, if a product, package, or spec is presented,** label `product_showcase`.
4. **Only if none of the above applies** — no product, no offer, no transaction — consider `entertainment`.
5. If still unresolved, use `unclear` (§5).

## 5. `unclear`

Use this when the caption genuinely does not permit a decision. Examples: caption is a bare URL, a single emoji, a greeting with no content, or text so ambiguous that two readings are equally defensible.

**`unclear` is a legitimate label, not a failure.** It is far better than a forced guess, because a forced guess adds noise to the ground truth. But it is not an escape from thinking — if the tie-break rules resolve it, use them.

When you use `unclear`, write a short reason in `coder_note`.

## 6. After coding

1. Save your sheet **without renaming it** and send it to the study lead unaltered.
2. Both sheets are kept as-is, permanently. They are appendix evidence.
3. Inter-coder Cohen's kappa is computed **before** any discussion.
4. Disagreements are then resolved by discussion (or by a third coder) to produce the final ground truth. The resolution is logged; the original sheets are never overwritten.

## 7. Note on interpreting the result

Kappa is depressed when one category dominates the sample, which is expected here — `product_showcase` is likely the large majority. A kappa in the 0.60–0.70 range under this distribution can represent the same coding quality as 0.75 under a balanced one. Percentage agreement and the confusion matrix are reported alongside kappa for this reason.

---

## Quick reference

| Label | One-line test |
|---|---|
| `product_showcase` | Shows what is sold. Product, package, or specs. |
| `promotional_offer` | Offers an incentive to buy now. Discount, scheme, deadline. |
| `testimonial` | Centres on a completed customer transaction or experience. |
| `entertainment` | Exists to be watched, not to sell. Remove humour → nothing sold. |
| `unclear` | Caption does not permit a decision. Note why. |

**Tie-break order:** offer → transaction → product → entertainment → unclear
