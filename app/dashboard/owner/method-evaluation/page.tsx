import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { loadMethodEvaluation, loadGroundTruthMethodEvaluation, getInterCoderReliability } from '@/lib/data/method-evaluation'
import { kappaMagnitude } from '@/lib/stats/agreement'
import { PageHeader } from '@/components/nav/PageHeader'
import MethodologyNote from '@/components/analytics/MethodologyNote'
import MethodAgreementCard from '@/components/analytics/MethodAgreementCard'

export default async function OwnerMethodEvaluationPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'BUSINESS_OWNER') {
    redirect('/login')
  }

  const [data, groundTruth, interCoder] = await Promise.all([
    loadMethodEvaluation(),
    loadGroundTruthMethodEvaluation(),
    getInterCoderReliability(),
  ])

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Method Evaluation"
        description="Keyword vs. LLM category suggestions compared against the marketing manager's final decision"
      />

      <div className="bg-card rounded-2xl card-shadow p-4 mb-4 border-l-4 border-status-warning">
        <p className="text-xs text-gray-600">
          <span className="font-semibold">Sample caveat:</span> this compares each method against whatever posts
          currently have a final category assigned (n={data.sampleSize}) — mvp.md recommends a purpose-built
          random sample of 150–200 posts for this study; that dedicated labelling pass has not been run, so this
          reflects the S4 finalisation queue&apos;s output to date, not necessarily a random or complete sample.
        </p>
      </div>

      {data.keywordFinalMatchShare > 0.8 && (
        <div className="bg-card rounded-2xl card-shadow p-4 mb-6 border-l-4 border-status-negative">
          <p className="text-xs text-gray-600">
            <span className="font-semibold text-status-negative">Circularity warning:</span> {(data.keywordFinalMatchShare * 100).toFixed(1)}%
            of these final categories are byte-identical to the keyword method&apos;s own suggestion — most were
            almost certainly set by bulk-accepting keyword suggestions (Auto-Categorize + Accept all pending),
            not independent human judgment. Comparing the keyword method against a reference largely derived
            from itself inflates its agreement figures and is not the honest, independent comparison FR-15
            requires. Treat the kappa values below as unreliable until a genuinely independent manual sample
            (mvp.md&apos;s recommended 150–200 posts) is labelled.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MethodAgreementCard title={`Keyword Method (n=${data.keywordCoverage})`} methodName="Keyword" agreement={data.keywordAgreement} />
        <MethodAgreementCard title={`LLM Method (n=${data.llmCoverage})`} methodName="LLM" agreement={data.llmAgreement} />
      </div>

      <div className="mt-8 mb-2">
        <h2 className="text-sm font-semibold text-gray-800">Ground truth (external codebook, mvp.md §9 item 3)</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Two coders labelled a seeded random sample by hand, blind to the system&apos;s suggestions, following the
          project codebook. This is the authoritative FR-15 comparison, restricted to posts where
          category_final_source = MANUAL_GROUND_TRUTH — it can&apos;t be contaminated by the circularity above.
        </p>
      </div>

      {groundTruth.n === 0 ? (
        <div className="bg-card rounded-2xl card-shadow p-4 border-l-4 border-status-warning">
          <p className="text-xs text-gray-600">
            No ground-truth sample has been imported yet — waiting on the two-coder codebook process.
          </p>
        </div>
      ) : (
        <>
          {interCoder && (
            <div className="bg-card rounded-2xl card-shadow p-4 mb-4 border-l-4 border-primary">
              <p className="text-xs text-gray-600">
                <span className="font-semibold">Human inter-coder kappa (ceiling):</span> {interCoder.kappa.toFixed(3)}{' '}
                ({kappaMagnitude(interCoder.kappa)}), {(interCoder.percentAgreement * 100).toFixed(1)}% agreement, n=
                {interCoder.n}. This is the agreement two trained human coders reached on the same task — the
                methods below can&apos;t reasonably be expected to exceed it.
              </p>
            </div>
          )}
          <p className="text-xs text-gray-500 mb-3">
            n={groundTruth.n} ground-truth-labelled posts — each method compared against the resolved human label.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MethodAgreementCard
              title={`Keyword Method — Ground Truth (n=${groundTruth.keywordAgreement.n})`}
              methodName="Keyword"
              agreement={groundTruth.keywordAgreement}
            />
            <MethodAgreementCard
              title={`LLM Method — Ground Truth (n=${groundTruth.llmAgreement.n})`}
              methodName="LLM"
              agreement={groundTruth.llmAgreement}
            />
          </div>
        </>
      )}

      <div className="mt-4">
        <MethodologyNote>
          Cohen&apos;s kappa (unweighted) measures agreement beyond what chance would predict given each label&apos;s
          marginal frequency — 0 means no better than chance, 1 means perfect agreement. Bands follow Landis &amp;
          Koch (1977): &lt;0 poor, 0–0.2 slight, 0.2–0.4 fair, 0.4–0.6 moderate, 0.6–0.8 substantial, 0.8–1 almost
          perfect. UNCLASSIFIED is treated as a genuine fifth label in the confusion matrix, not dropped or merged
          into another category — a method that returns UNCLASSIFIED against a post the manager did categorise is
          a real disagreement, not missing data.
        </MethodologyNote>
      </div>
    </div>
  )
}
