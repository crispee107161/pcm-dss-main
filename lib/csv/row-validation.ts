// FR-04/FR-07 — a row that fails validation must be reported and the rest
// of the file must still be processed (manuscript: "report rows that fail
// validation without discarding the remainder of the file"). Before
// 2026-08-25 every row-level `throw` in validate-ads.ts/validate-posts.ts
// propagated out of the whole parse and discarded the entire upload — see
// docs/raven/Three_Decisions_and_FR_Table_Writable.md §1.
export interface RowRejection {
  row: number // 1-indexed, matches the CSV's data-row position (1 = first row after the header)
  reason: string
}

export interface RowValidationResult<T> {
  valid: T[]
  rejected: RowRejection[]
}
