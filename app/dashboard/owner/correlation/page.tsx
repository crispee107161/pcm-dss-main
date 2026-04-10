import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { computeSpearmanMatrix } from '@/lib/stats/spearman'
import { PageHeader } from '@/components/nav/PageHeader'
import CorrelationTable from '@/components/analytics/CorrelationTable'

export default async function OwnerCorrelationPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'BUSINESS_OWNER') {
    redirect('/login')
  }

  const spearmanRows = await computeSpearmanMatrix()

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader title="Spearman Correlation Analysis" description="Rank-order correlation between ad metrics and purchase outcomes" />

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
        <CorrelationTable rows={spearmanRows} />
      </div>

      <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-2">How to read this</h2>
        <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
          <li>Values close to <strong>+1</strong> mean a strong positive relationship — as one metric rises, the other tends to rise too.</li>
          <li>Values close to <strong>-1</strong> mean a strong negative relationship — as one rises, the other tends to fall.</li>
          <li>Values close to <strong>0</strong> mean little or no relationship between the metrics.</li>
          <li>Spearman correlation is based on rank order, so it handles non-normal distributions well.</li>
        </ul>
      </div>
    </div>
  )
}
