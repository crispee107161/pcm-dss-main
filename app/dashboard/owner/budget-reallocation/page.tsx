import { requireSession } from '@/lib/auth-guard'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/nav/PageHeader'
import MethodologyNote from '@/components/analytics/MethodologyNote'
import InsightHeader from '@/components/analytics/InsightHeader'
import { computeBudgetReallocation, MIN_SPEND_THRESHOLD_PHP } from '@/lib/stats/budget-reallocation'
import { budgetReallocationFindingSentence } from '@/lib/stats/analysis-narrative'
import { MinSpendSelect, BudgetReallocationView } from '@/components/analytics/BudgetReallocation'
import { STUDY_PERIOD_AD_WHERE } from '@/lib/data/study-period'

export default async function BudgetReallocationPage({
  searchParams,
}: {
  searchParams: Promise<{ minSpend?: string }>
}) {
  const session = await requireSession()
  if (session.user.role !== 'BUSINESS_OWNER') {
    redirect('/login')
  }

  const { minSpend } = await searchParams
  const parsed = minSpend ? Number(minSpend) : NaN
  const minSpendThreshold = Number.isFinite(parsed) && parsed >= 0 ? parsed : MIN_SPEND_THRESHOLD_PHP

  const ads = await prisma.ad.findMany({
    where: STUDY_PERIOD_AD_WHERE,
    select: { ad_id: true, ad_name: true, ad_set_name: true, amount_spent: true, total_messaging_contacts: true, result_type: true },
  })

  const result = computeBudgetReallocation(ads, minSpendThreshold)
  const finding = budgetReallocationFindingSentence(result)

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Budget Reallocation"
        description="Messaging ads ranked by cost per inquiry and split into four groups, filtered by minimum spend to avoid comparing low-volume ads against high-volume ones"
      />

      <div className="flex items-center gap-3 mb-6">
        <span className="text-xs font-medium text-gray-500">Minimum spend per ad</span>
        <MinSpendSelect value={minSpendThreshold} />
        <span className="text-xs text-gray-400">{result.n} advertisements</span>
      </div>

      <div className="bg-card rounded-2xl card-shadow p-6 mb-6">
        <InsightHeader
          headline={finding ?? 'Not enough data at this threshold to compare the most and least efficient groups.'}
          disclosure="always"
          // mathLabel="" suppresses InsightHeader's default "See the numbers
          // behind this" label in disclosure="always" mode — the quartile
          // cards below are the finding itself, not supplementary detail.
          mathLabel=""
        >
          <BudgetReallocationView result={result} />
        </InsightHeader>
      </div>

      <div className="mt-4">
        <MethodologyNote>
          <p>
            Messaging conversations are summed per advertisement across every month it ran; spend is summed
            only from the months where &quot;Result type&quot; is &quot;Messaging conversations started&quot;.
            For an advertisement that also ran non-messaging months, that month&apos;s spend does not count
            toward its cost per messaging conversation.
          </p>
          <p className="mt-2">
            Ads with total messaging spend at or above the selected threshold are ranked by that figure and
            split into four groups of as equal a size as the count allows (differing by at most one
            advertisement when the total doesn&apos;t divide evenly by four; ties in cost per inquiry at a
            group boundary are broken by advertisement ID). The minimum-spend filter exists because an
            unfiltered split is confounded by regression to the mean: the worst group would mostly be
            low-volume ads with noisy cost per inquiry, not genuinely inefficient ones.
          </p>
          <p className="mt-2">
            The reallocation comparison above shows what a portion of the least efficient group&apos;s spend
            would have generated at the most efficient group&apos;s rate, based on recorded results: a
            retrospective comparison, not a forecast or simulation of future performance. Advertisements that
            perform worst also tend to improve on their own over time, so acting on this comparison would
            likely recover less than the full difference shown.
          </p>
        </MethodologyNote>
      </div>
    </div>
  )
}
