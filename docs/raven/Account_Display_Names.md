# Account display names

**Date:** 3 September 2026
**Re:** replaces item B7 of `Executive_Dashboard_Review.md`
**Status:** one schema question, then a small change

---

## 1. What prompted this

The Executive Dashboard greeting currently reads **"Good afternoon, owner"** in lowercase, which appears to be the email local part rendered directly. It reads as an unformatted placeholder rather than a deliberate choice, and it is the first thing anyone sees on signing in.

---

## 2. The question

- [ ] **Does the `User` model carry a display name field?**
- [ ] If not, how large a change is adding one?
- [ ] If a field is added, does User Management collect it when creating an account, and can a user edit their own from the profile screen?

The rest of this memo assumes a field exists or can be added cheaply. If it cannot, see §6.

---

## 3. Store the full name in a single field

A single nullable `name` field holding the complete name, rather than separate given name and surname fields.

**Why one field.** Nothing in the system sorts by surname or addresses users formally, so splitting buys nothing. Filipino naming conventions include middle names and compound surnames that a two-field structure handles badly, and a single field loses no information.

**Why the full name rather than a first name.** FR-20 requires the audit trail to record the user. An entry reading "Dan assigned a category" is worse than the email address it replaces if a second Dan is ever added. The full name is unambiguous.

**Shorten at the point of display, not at the point of storage.** The greeting can take the first token so it reads "Good afternoon, John," while User Management and the audit log show the stored value in full. Storing the full name and truncating for display is recoverable in either direction. Storing only a first name is not.

Nullable, so existing accounts continue to work while the field is unpopulated.

---

## 4. The three values

| Account | Display name |
|---|---|
| `owner@pcmerchandise.com` | **John Bernard Olermo** |
| `marketing@pcmerchandise.com` | **Dan Mintong Carullo** |
| `team@pcmerchandise.com` | **Marketing Team** |

The two individual accounts carry the name of the person who holds them. The team account carries its role, since it is used by more than one person and there is no individual to name.

That asymmetry is deliberate rather than an oversight, and it describes the accounts accurately. Naming a shared account after one of its users would be worse.

- [ ] **Confirm the team account is genuinely shared** rather than held by one person. Chapter 3 needs to describe the account structure accurately, and a shared account is a different arrangement from an individual one. If it is held by one person, that person's name should replace the role label and this table changes.

---

## 5. Where the name should appear

Beyond the greeting, three places benefit:

**The audit log.** FR-20 requires the user to be recorded for every upload and every manual category assignment. "Dan Mintong Carullo assigned a category" is considerably more readable than "marketing@pcmerchandise.com assigned a category," and the audit log is a screen the panel may well ask to see.

**User Management.** An account row showing only an email and a role is thin. A name is the natural first field for someone creating an account.

**The security event log.** Same reasoning as the audit log, since both now render through the same screen.

Keep the email address visible alongside the name in both logs. The name is for reading, the address identifies the account, and an audit trail should carry both.

---

## 6. If a name field is not worth adding

Capitalise what is currently displayed, so the greeting reads **"Good afternoon, Owner"** rather than appearing to be a bug.

That is a worse outcome, since it leaves the audit log identifying users by email address, but it is a single-line change and it removes the impression of a formatting defect.

---

## 7. Note on why role labels were considered and rejected

For the record, in case the question comes back.

Using role labels for all three accounts would have avoided naming anyone in an academic document. That mattered less here than it might have: Mr Olermo's name already appears on four signed agreements in the appendix, and Mr Carullo's appears in the client correspondence that forms part of the requirements evidence. Neither name is newly disclosed by the interface.

The team account keeps its role label because it has no individual holder, not because of any privacy consideration.
