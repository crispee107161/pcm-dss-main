import 'dotenv/config'
import { prisma } from '../lib/prisma'

// Developer_Note_Ground_Truth_Labelling.md §6 — records the one-time
// inter-coder kappa produced by compute_kappa.py (run externally, before any
// discussion between the two coders) so S8 can display it as the human
// "ceiling" alongside the system's own method kappas. Read the numbers
// straight off compute_kappa.py's printed report / reliability_report.txt —
// this script does not recompute anything.
//
// USAGE
//   npx tsx scripts/import-inter-coder-reliability.ts <n> <percentAgreement> <kappa> [notes]
//   npx tsx scripts/import-inter-coder-reliability.ts 200 0.81 0.65 "pilot + main round, 2026-08-xx"

async function main() {
  const [nRaw, agreementRaw, kappaRaw, notes] = process.argv.slice(2)
  if (!nRaw || !agreementRaw || !kappaRaw) {
    throw new Error('Usage: npx tsx scripts/import-inter-coder-reliability.ts <n> <percentAgreement> <kappa> [notes]')
  }

  const n = parseInt(nRaw, 10)
  const percent_agreement = parseFloat(agreementRaw)
  const kappa = parseFloat(kappaRaw)

  if (!Number.isInteger(n) || n <= 0) throw new Error(`Invalid n: ${nRaw}`)
  if (Number.isNaN(percent_agreement) || percent_agreement < 0 || percent_agreement > 1) {
    throw new Error(`percentAgreement must be a fraction between 0 and 1, got: ${agreementRaw}`)
  }
  if (Number.isNaN(kappa)) throw new Error(`Invalid kappa: ${kappaRaw}`)

  const row = await prisma.interCoderReliability.create({
    data: { n, percent_agreement, kappa, notes: notes ?? null },
  })

  console.log(`Recorded inter-coder reliability #${row.id}: n=${n}, agreement=${(percent_agreement * 100).toFixed(1)}%, kappa=${kappa.toFixed(3)}`)
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
