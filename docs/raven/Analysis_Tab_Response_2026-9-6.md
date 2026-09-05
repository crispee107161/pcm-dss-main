Both of you are right, and the disagreement is itself an instance of Finding A. His scan filtered on result_type = 'Messaging conversations started'. All 28 rows I found have a blank result type, so they are not in the 486 he queried. They belong to advertisements that have messaging rows elsewhere, but the rows themselves sit outside that set. In the raw exports: 28 rows, blank result type, 24 advertisements, ₱1,174.32 spend, zero results, all marked not delivering.

His four rows are real too, and they are exactly the four zero-reach rows the frequency panel already drops under Finding E. Same four rows, two panels, two different descriptions of why they go.

He also corrected me on something I got wrong. I attributed the fourth-decimal gaps (screen −0.6510 against my −0.6511, −0.2083 against −0.2084, −9.6283 against −9.6285) to a rounding path. They are not rounding. Applying his per-row filter before aggregating reproduces the displayed values exactly, to every digit. His description of the code is right and my "trivial rounding" note was wrong.

That actually sharpens Finding A rather than dissolving it. There is one filter, spend > 0 AND results > 0, applied per row before aggregation. It drops 32 rows: the 28 blank-result rows fail the results test, his 4 zero-spend rows fail the spend test. The regression applies it. Rankings and month-of-life do not, keeping all 514.

The discriminator is the ₱21.50 in our own verified figures list. Recomputed:

Rule	Middle cost, 187 ads
All messaging rows	₱21.39
Per-row filter (matches the regression)	₱21.39
Including the 28 blank-result rows	₱21.50

So something in the system reaches ₱21.50, and it can only do so by keeping rows the regression drops. The question for him is not "do 28 zero-result messaging rows exist" (they do not, he is right) but what the ingestion does with the 28 blank-result rows, and which panel produces ₱21.50.

On his judgment call: I agree with him about his four rows. Under 0.2 per cent, already documented and accepted, and regenerating pinned fixtures five weeks out is not worth it. The 28 rows are a separate question that his check did not reach, so that call should wait until he has looked at them.

One thing his Finding H answer escalates. He confirms the cross-validated figure is on the peso scale. The in-sample 0.548 in the same row is on the log scale. So that row reads 0.548 against 0.380 as if it shows shrinkage from fitting to held-out, when about half the drop is just the change of scale. On the peso scale the in-sample figure is 0.460, so the honest comparison is 0.460 against 0.380. My Finding J called this a labeling issue. It is worse than that, because the two cells sitting side by side invite a comparison that is not valid.

His open questions. For the frequency count, use both: "across 482 monthly records from 187 advertisements." FR-18 wants what the correlation actually rests on, which is 482, and the panel's own caveat about non-independent observations only makes sense once the reader can see both numbers. On the scale clause, yes, add it, since the category table shows 0.85 per cent while the regression coefficient is on a bare ratio.

One question back on his Finding F fix. Which p-value column drives the significance half of the stable check? Under robust errors, engagement rate is not significant in either specification (0.0571 and 0.1318), and frequency is not significant in the first (0.0672). Under ordinary errors, all four are significant everywhere. The panel tells the reader robust errors are the ones that count, so if the badge logic reads the ordinary column, the badges and the stated inference disagree. His new third case may also never fire in live data, since the one predictor that is never significant under HC3 is also the one that flips sign, so it hits the sign branch first.