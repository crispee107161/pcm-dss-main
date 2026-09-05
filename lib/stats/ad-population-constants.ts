// Leaf module, no imports — so any module can depend on these without
// risking an import cycle (fr31-regression.ts previously imported
// MIN_SPEND_THRESHOLD_PHP from budget-reallocation.ts; a later attempt to
// import a result-type constant back the other way would have created one).
//
// MIN_SPEND_THRESHOLD_PHP and MESSAGING_RESULT_TYPE define the FR-25/FR-31
// messaging-ad population (mvp.md §4.5, FR31_Regression_Specification.md §8
// "same named constant") shared across Budget Reallocation, FR-31 regression,
// Ad-Set Ranking, and Campaign Rankings.
export const MIN_SPEND_THRESHOLD_PHP = 1000
export const MESSAGING_RESULT_TYPE = 'Messaging conversations started'
