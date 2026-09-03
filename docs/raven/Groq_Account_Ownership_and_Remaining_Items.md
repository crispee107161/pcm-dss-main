# Groq: the account is personally held, and that has consequences

**Date:** 4 September 2026
**Re:** `Groq_Configuration_Status_2026-09-04.md`
**Status:** answer to your question, three account-side items, two manuscript consequences

---

## 0. What you closed from code

§1.1, §3, §5, §4's failure handling, plus the two fixes you landed rather than deferring. All accepted.

Three worth naming.

**Searching the git history for a committed key**, rather than confirming the current state and stopping there, is the check that actually answers the question. A key removed later is still in the history, and a source code listing in the appendix would publish it.

**Extracting `PROMPT_TEMPLATE` and committing a snapshot with `{{DATA}}` marking the substitution point**, with the code and snapshot pointing at each other, is better than the snapshot I asked for. A snapshot that can drift silently is worth little.

**Confirming the assistant returns a plain string on a network failure** rather than throwing. That is the behaviour that matters on demonstration day.

---

## 1. Your question: the account is yours

You signed in with your own email, so the Groq account is personally held rather than owned by the group or the client.

That answers §1's blocker: **you enable Zero Data Retention.**

- [ ] **Enable ZDR in the Groq Console under Data Controls settings**
- [ ] **Screenshot it showing active**, with the date visible if possible
- [ ] Confirm whether it applies organisation-wide or per feature, and enable it wherever it reaches the inference endpoints in use

Nothing goes to the client until that screenshot exists, since the agreement states it has been done.

### 1.1 One thing to confirm about the agreement

The agreement binds "the Developers", defined as the five named student developers on the Non-Disclosure Agreement.

- [ ] **Confirm you are among those five signatories**

If you are, the sentence is accurate once the setting is on and there is nothing further to do. If you are not, the wording needs changing before it goes to the client, because it would be asserting something about a party the agreement does not cover.

I expect the former. Checking because the agreement is the only document in this project that a third party signs.

### 1.2 What happens to the account after the defence

Not urgent, but it needs an answer before the manuscript is finished rather than after.

The system runs on your personal Groq credential. If the client continues using the system after the defence, which the Non-Disclosure Agreement explicitly contemplates under a separate written agreement, it continues running on your account.

- [ ] **What is the intended arrangement?** Does the account transfer, does the client create their own, or does the system stop being used?

Chapter 3 will describe the access arrangement accurately either way. It is better to state that the service is accessed under a researcher-held account than to leave a reader assuming otherwise.

Also worth knowing: is the account on a free tier or a paid one, and if paid, whose billing? Same reason.

---

## 2. Two account-side checks still open

- [ ] **Key scoping.** Is the key scoped to this project, or shared with anything else you run on the same account?
- [ ] **Current rate limits**, and whether a full 731-post classification run would approach them

On the second: at 15 posts per batch that is roughly 49 calls in quick succession. This matters for the demonstration rather than only for the appendix. If a classification run is shown live and hits a cooldown mid-way, the cooldown behaviour you built is correct but it is not what you want a panel watching.

Worth knowing the number, and worth deciding in advance whether to demonstrate a full run or a small one.

---

## 3. Confirm there is exactly one prompt snapshot

You asked whether another copy exists elsewhere. You mentioned committed snapshot files in an earlier memo, before creating `docs/raven/classification-prompt-snapshot.txt`.

- [ ] **Confirm there is exactly one**, and delete or clearly supersede any older copy

Two files with the same content will drift, and the appendix should carry one file that is demonstrably the one in use.

---

## 4. Two manuscript consequences from your §2

Both are ours to write. Recording them so you can correct me if I have the picture wrong.

### 4.1 The two paths use different models, and Chapter 3 must say so

Classification is pinned to `openai/gpt-oss-20b` as a fixed constant, deliberately outside `resolveGroqModel()`, for reproducibility.

The assistant and keyword paths use `resolveGroqModel()` against a preference-ordered allowlist, so they stay up if a model retires.

**That is the right trade-off and it is well reasoned.** Reproducibility matters for a figure reported in Chapter 4. Uptime matters for a feature the client uses. Different requirements, different answers.

But it means Chapter 3 cannot say "the system uses `openai/gpt-oss-20b`" without qualification. It will say the classification path is pinned to a fixed model for reproducibility while the assistant selects from a fixed allowlist for availability, and explain why.

- [ ] Confirm that describes it correctly

### 4.2 The assistant is non-deterministic, and that needs stating

`CHAT_TEMPERATURE = 0.4` rather than 0. Correct for a conversational assistant, and I would not change it.

But it means the same question asked twice returns differently worded answers. Chapter 3 should say so, because the manuscript claims reproducibility for the analytical outputs and should not appear to claim it for a component that does not have it.

FR-21 already covers this ground by requiring the assistant to state that its figures are to be confirmed against the reports. The non-determinism is a further reason that clause is right.

Worth knowing for the demonstration too. If the same question is asked twice in front of the panel, the answers will not match word for word.

---

## 5. The Chapter 3 paragraph, corrected

You were right that the tense was wrong. Revised, and it now also carries §4.1:

> The system transmits data to GroqCloud, an external language model inference provider, in two circumstances: to generate a suggested content category from a post's caption text, and to answer questions posed to the assistant from aggregate performance figures. No customer-identifying information, message content, or transactional record is transmitted by any component. Under the provider's terms, inference inputs and outputs are not retained by default and may not be used to train or fine-tune any model, and the provider's Zero Data Retention setting was enabled to disable the temporary logging otherwise permitted for reliability and abuse investigation. The model used for content categorisation is pinned to a fixed identifier at temperature zero so that its results are reproducible, while the assistant selects from a fixed list of permitted models so that the feature remains available if one is withdrawn. The client was informed of these arrangements in writing and acknowledged them.

- [ ] **Read it against the system again and tell me anything still inaccurate**

The third sentence becomes true when §1 lands.

---

## 6. Priority

1. **§1**, enable ZDR and screenshot it. Still the only blocking item.
2. **§1.1**, confirm the signatory question. One line.
3. **§2**, both account-side checks. The rate limit affects demonstration planning.
4. **§3**, the single snapshot.
5. **§1.2**, the post-defence arrangement. Needed before the manuscript is finished, not this week.
6. **§4.1** and **§5**, read and correct.

Everything except §1.2 should close quickly.
