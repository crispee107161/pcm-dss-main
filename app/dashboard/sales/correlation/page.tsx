import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { computeSpearmanMatrix } from '@/lib/stats/spearman'
import { computeLaggedCorrelations } from '@/lib/stats/laggedCorrelation'
import { PageHeader } from '@/components/nav/PageHeader'
import CorrelationTable from '@/components/analytics/CorrelationTable'
import LaggedCorrelationPanel from '@/components/analytics/LaggedCorrelationPanel'

export default async function SalesCorrelationPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'SALES_DIRECTOR') redirect('/login')

  const [spearmanRows, lagData] = await Promise.all([
    computeSpearmanMatrix(),
    computeLaggedCorrelations(),
  ])

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Correlation Analysis"
        description="Spearman rank correlation between ad metrics and purchase outcomes"
      />

      <div className="bg-card rounded-2xl card-shadow p-6 mb-8">
        <h2 className="text-base font-semibold text-gray-800 mb-4">
          Time-Lagged Pearson Correlation
          <span className="ml-2 text-xs font-normal text-gray-500">(FR-19)</span>
        </h2>
        <LaggedCorrelationPanel data={lagData} />
      </div>

      <div className="bg-card rounded-2xl card-shadow p-6 mb-8">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Spearman Rank Correlation (Overall)</h2>
        <CorrelationTable rows={spearmanRows} />
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-2">How to read this</h2>
        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
          <li>Values close to <strong>+1</strong> mean a strong positive relationship — as one metric rises, purchases tend to rise too.</li>
          <li>Values close to <strong>-1</strong> mean a strong negative relationship.</li>
          <li>Values close to <strong>0</strong> mean little or no relationship.</li>
          <li>The lag analysis distributes each ad&rsquo;s metrics across its campaign period and checks whether today&rsquo;s metrics predict future purchases.</li>
        </ul>
      </div>
    </div>
  )
}
