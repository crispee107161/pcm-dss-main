# NFR-04 production timing and Neon auto-suspend — measured

**Date:** 3 September 2026
**Re:** `Two_Engagement_Rates_and_Owner_Deadlock.md` §5/§6, restated in every open-decisions memo since

Both of the "still on your side" items that only needed a console check or a re-measurement against the real production URL are done. Methodology below so the numbers are reproducible.

---

## Neon auto-suspend delay

Confirmed directly from the Neon console (Postgres database → Compute settings, `production` branch, Primary compute endpoint):

**Autosuspend delay: 5 minutes (default).** Compute is 0.25 CU min (~1GB RAM) to 2 CU max (~8GB RAM), Postgres 17.

This matches what `Statistical_Validation_and_NFR_Answers_2026-09-02.md` assumed from Neon's documented free-tier default — now verified from the actual project settings rather than assumed.

## NFR-04 — re-measured against the deployed production URL

Measured against `https://pcm-dss.vercel.app/dashboard/owner/analysis` (signed in as `owner@pcmerchandise.com`) — the heaviest analytical screen, per `FR16_Rewording_and_NFR_Questions.md` §'s "rough measured figures for the heaviest analytical screen." Chrome DevTools, Network tab, cache disabled, reading the **Load** event time (not Finish, which includes trailing/background requests unrelated to perceived page-load — an early reading mistake here gave a misleading ~10s "Finish" figure before this was caught and corrected to Load).

- **Cold** (reloaded after 6-7 minutes idle, enough for the 5-minute auto-suspend to trigger): **3.88s**
- **Warm** (three immediate consecutive reloads): **3.59s, 2.63s, 2.67s**

This reproduces the original pre-deployment measurement (3.94s cold, 1.33-2.77s warm) closely — the numbers didn't change materially on the real production URL. Per your own framing in §5: **the requirement does not hold as drafted at three seconds** (cold fails outright, and one of three warm reloads also edges over 3s). It does hold at your proposed fallback of **four seconds on a warm connection** — all three warm figures clear that with room, and the mitigation you already named (open the site several minutes before the demonstration so the auto-suspend window has passed) directly addresses the cold case, which is the one that fails hardest.

Recommend: NFR-04 reads as **"analytical screens render within four seconds on a warm connection; a cold connection following a period of inactivity may take longer, mitigated by warming the connection before use"** — matching the framing you proposed, now backed by a real deployed measurement rather than a pre-deployment one.

---

Both items from your "still on your side" list are now closed. Remaining: your independent validation spot-check and the manuscript changes.
