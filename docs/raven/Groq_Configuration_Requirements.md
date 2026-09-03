# Groq: configuration, restrictions, and what has to be true before the client signs

**Date:** 3 September 2026
**Re:** everything required of the external language model provider
**Status:** one item blocking a client signature, four configuration items, three for the appendix

---

## 0. Why this memo exists

Two functions transmit data to Groq: the caption categorisation call and the assistant. Both are covered by FR-07, FR-08, and FR-21, and by NFR-14, which states that where a component transmits data to an external service, the categories of data it may transmit shall be stated and not exceeded.

Separately, the **Second Supplementary Agreement and Disclosure** now awaiting the client's signature makes specific factual claims about how that provider handles the data. Those claims have to be true on the day he signs.

This memo collects everything Groq-related in one place.

---

## 1. ⚠ Enable Zero Data Retention before the client signs

This is the only blocking item.

Groq's current position, verified against their documentation today:

- Inference inputs and outputs are **not retained by default**
- Groq is **not permitted to use inputs or outputs to train or fine-tune any model** unless the customer explicitly grants permission
- Inputs and outputs **may be temporarily logged** for up to 30 days, only when troubleshooting platform reliability failures or investigating suspected abuse
- **Zero Data Retention is self-serve for all customers** and disables that logging entirely

The agreement drafted for Mr Olermo states that the Developers **have enabled** Zero Data Retention. That sentence is currently false.

- [ ] **Enable ZDR in the Groq Console, under Data Controls settings**
- [ ] **Screenshot the setting after enabling**, showing it active, for the appendix
- [ ] Confirm whether it applies organisation-wide or per feature, and enable it wherever it applies to the inference endpoints in use

Once enabled, the agreement is accurate and can be signed. Until then it should not go to the client.

### 1.1 Two features that would break ZDR

Certain Groq features require retention to function and would undermine the claim:

- **Batch processing** retains input and output files for 30 days
- **Fine-tuning** retains models and datasets until deleted

- [ ] **Confirm neither is in use.** My understanding is that classification runs as ordinary synchronous inference calls, but the batch endpoint is a plausible thing to have reached for on a 731-post job.

If batch processing is in use anywhere, it needs replacing with synchronous calls, or the agreement wording changes.

---

## 2. Model pinning and deprecation

`llama-3.1-8b-instant` was fully decommissioned by Groq mid-project, which invalidated a kappa figure and forced a re-run. That must not happen again between now and October.

- [ ] **Confirm `openai/gpt-oss-20b` is a stable pinned identifier**, not an alias that can move to a different model underneath
- [ ] **Confirm the model name is a named constant** rather than a literal repeated across call sites
- [ ] **Check Groq's deprecation notices now, and again in the week before the defence.** A model retiring the day before would take out both the assistant and any classification run.

The fail-loudly behaviour you added, so that a decommissioned model raises an error rather than silently corrupting `category_llm`, is the right protection and should stay.

- [ ] Confirm the temperature is pinned at 0 and is also a constant

---

## 3. API key handling

- [ ] **Confirm the key lives in an environment variable** and appears nowhere in source, in committed configuration, or in any file that could reach the appendix
- [ ] **Confirm it is not present in the repository history**, since a key committed once and removed later is still in the history
- [ ] Confirm the key is scoped to this project rather than shared with anything else

If the source code listing goes into the appendix, as many capstone programmes require, a committed key would be published in a document submitted to a university. Worth checking before that happens rather than after.

---

## 4. Rate limiting and failure behaviour

Already partly handled, but worth confirming as a set.

- [ ] **What are the current rate limits on the account**, and could a full classification run over 731 posts exceed them?
- [ ] **Confirm the cooldown behaviour** after a rate-limit response, which you built for the combined Generate action
- [ ] **Confirm a Groq failure degrades gracefully** rather than blocking the interface, on both the classification path and the assistant

The last one matters for the demonstration. If Groq is unreachable when the panel is watching, the assistant should say so plainly rather than hanging or showing an error dialogue.

- [ ] What does the assistant currently do if the API is unreachable?

---

## 5. What may be transmitted, and what may not

Recording this as the specification rather than as a question, since it is now written into both FR-21 and the client agreement.

**Permitted, categorisation call:**
- The caption text of an organic post

**Permitted, assistant:**
- Advertisement names
- Aggregate expenditure, inquiry counts, reach, and cost per inquiry
- Aggregate organic engagement figures
- Recent page-level metrics

**Not permitted, by any component:**
- Customer names, contact details, or any personally identifying information
- The contents of any message, conversation, or customer inquiry
- Sales, transaction, order, inventory, or pricing records
- Account credentials
- Record-level data of any kind beyond advertisement names

- [ ] **Confirm no component transmits anything outside that list**
- [ ] **Confirm the Predictive Model section is out of the assistant**, since regression coefficients from the cut model are not on the permitted list and were the subject of an earlier request

Any future component that would transmit a new category of data requires a written notice to the client before it ships. That obligation is in the agreement.

---

## 6. Three things for the appendix

These become evidence behind NFR-14 and the client agreement.

- [ ] **A screenshot of the Data Controls settings** showing Zero Data Retention active, with the date visible if possible
- [ ] **The categorisation prompt**, as a committed snapshot file. Already requested and confirmed to exist, but not yet sent to us.
- [ ] **A short note stating the model, the temperature, and the date each was pinned**, so Chapter 3 can state the configuration rather than describe it

---

## 7. What Chapter 3 will say, so you can check it against reality

Drafting this now so any inaccuracy surfaces before it is printed.

> The system transmits data to GroqCloud, an external language model inference provider, in two circumstances: to generate a suggested content category from a post's caption text, and to answer questions posed to the assistant from aggregate performance figures. No customer-identifying information, message content, or transactional record is transmitted by any component. Under the provider's terms, inference inputs and outputs are not retained by default and may not be used to train or fine-tune any model. The researchers enabled the provider's Zero Data Retention setting, which disables the temporary logging otherwise permitted for reliability and abuse investigation. The model and temperature are pinned to fixed values recorded in version control. The client was informed of these arrangements in writing and acknowledged them.

- [ ] **Read that paragraph against the system and tell me anything that is not true**

The last sentence depends on §1 landing first.

---

## 8. Priority

1. **§1**, enable ZDR and screenshot it. Blocks the client signature.
2. **§1.1**, confirm batch processing is not in use.
3. **§3**, the API key check. Quick, and the consequence of getting it wrong is publishing a credential in a university submission.
4. **§5**, confirm the transmitted categories and the Predictive Model removal.
5. **§2**, the model pinning confirmations.
6. **§4**, failure behaviour.
7. **§6**, the appendix items.

§1 first. Everything else can follow this week.
