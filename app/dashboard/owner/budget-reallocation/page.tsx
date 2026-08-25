import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/nav/PageHeader'
import MethodologyNote from '@/components/analytics/MethodologyNote'
import { computeBudgetReallocation, MIN_SPEND_THRESHOLD_PHP } from '@/lib/stats/budget-reallocation'
import { MinSpendSelect, BudgetReallocationView } from '@/components/analytics/BudgetReallocation'
import { withStudyPeriodAd } from '@/lib/data/study-period'

export default async function BudgetReallocationPage({
  searchParams,
}: {
  searchParams: Promise<{ minSpend?: string }>
}) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'BUSINESS_OWNER') {
    redirect('/login')
  }

  const { minSpend } = await searchParams
  const parsed = minSpend ? Number(minSpend) : NaN
  const minSpendThreshold = Number.isFinite(parsed) && parsed >= 0 ? parsed : MIN_SPEND_THRESHOLD_PHP

  const ads = await prisma.ad.findMany({
    where: withStudyPeriodAd({ total_messaging_contacts: { not: null } }),
    select: { ad_id: true, ad_name: true, ad_set_name: true, amount_spent: true, total_messaging_contacts: true },
  })

  const result = computeBudgetReallocation(ads, minSpendThreshold)

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Budget Reallocation"
        description="Messaging ads ranked into CPI quartiles, filtered by minimum spend to avoid comparing low-volume ads against high-volume ones"
      />

      <div className="flex items-center gap-3 mb-6">
        <span className="text-xs font-medium text-gray-500">Minimum spend per ad</span>
        <MinSpendSelect value={minSpendThreshold} />
        <span className="text-xs text-gray-400">n = {result.n} ads</span>
      </div>

      <BudgetReallocationView result={result} />

      <div className="mt-4">
        <MethodologyNote>
          Messaging-optimised ads (Result type = &quot;Messaging conversations started&quot;) with spend at or
          above the selected threshold are ranked by cost per messaging conversation (spend ÷ inquiries, summed
          per Ad ID across all uploaded months before dividing) and split into four equal-size groups. The
          minimum-spend filter exists because an unfiltered split is confounded by regression to the mean — the
          worst quartile would mostly be low-volume ads with noisy CPI, not genuinely inefficient ones. The
          reallocation comparison above shows what a portion of Q4&apos;s (worst) spend would have generated at
          Q1&apos;s (best) rate, based on recorded results — a retrospective comparison, not a forecast or
          simulation of future performance.
        </MethodologyNote>
      </div>
    </div>
  )
}
