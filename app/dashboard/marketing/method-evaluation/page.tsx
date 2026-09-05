import { requireSession } from '@/lib/auth-guard'
import { redirect } from 'next/navigation'
import { loadMethodEvaluation, loadGroundTruthMethodEvaluation, getInterCoderReliabilityRows, getSuggestionAcceptanceRate } from '@/lib/data/method-evaluation'
import { kappaMagnitude } from '@/lib/stats/agreement'
import { PageHeader } from '@/components/nav/PageHeader'
import MethodologyNote from '@/components/analytics/MethodologyNote'
import MethodAgreementCard from '@/components/analytics/MethodAgreementCard'

// mvp.md §3 S8: Owner View, Marketing Manager Full, Marketing Team hidden.
export default async function MarketingMethodEvaluationPage() {
  const session = await requireSession()
  if (session.user.role !== 'MARKETING_MANAGER') {
    redirect('/login')
  }

  const [data, groundTruth, interCoderRows, acceptanceRate] = await Promise.all([
    loadMethodEvaluation(),
    loadGroundTruthMethodEvaluation(),
    getInterCoderReliabilityRows(),
    getSuggestionAcceptanceRate(),
  ])

  // Each section's ceiling banner is matched to its own n — a ceiling
  // figure from a different blind-coding session is not interchangeable
  // and must never be shown as if it were (FR08_707_Figures_to_Reconcile.md §3).
  const referenceInterCoder = interCoderRows.find((r) => r.n === groundTruth.referenceOnly.n) ?? null
  const combinedInterCoder = interCoderRows.find((r) => r.n === groundTruth.combined.n) ?? null

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Method Evaluation"
        description="Keyword vs. LLM category suggestions compared against your final category decisions"
      />

      <div className="bg-card rounded-2xl card-shadow p-4 mb-4 border-l-4 border-status-warning">
        <p className="text-xs text-gray-600">
          <span className="font-semibold">Sample caveat:</span> this compares each method against whatever posts
          currently have a final category assigned (n={data.sampleSize}, including any Ground Truth rows already
          finalised) — this is the S4 finalisation queue&apos;s output to date, not a random or complete sample.
          {groundTruth.referenceOnly.n > 0 ? (
            <> mvp.md&apos;s recommended purpose-built random sample of 150–200 posts is the separate Ground
            Truth study below, which has been run — treat that comparison, not this one, as the authoritative
            FR-15 figure.</>
          ) : (
            <> mvp.md recommends a purpose-built random sample of 150–200 posts for that authoritative FR-15
            comparison — see the Ground Truth section below, which is still waiting on that dedicated
            labelling pass.</>
          )} Run &quot;Classify with AI (LLM)&quot; on the Categorisation Review screen to populate more LLM
          suggestions here.
        </p>
      </div>

      {data.keywordFinalMatchShare > 0.8 && (
        <div className="bg-card rounded-2xl card-shadow p-4 mb-6 border-l-4 border-status-negative">
          <p className="text-xs text-gray-600">
            <span className="font-semibold text-status-negative">Circularity warning:</span> {(data.keywordFinalMatchShare * 100).toFixed(1)}%
            of these final categories are byte-identical to the keyword method&apos;s own suggestion — most were
            almost certainly set by bulk-accepting keyword suggestions (Auto-Categorize + Accept all pending),
            not independent judgment. Comparing the keyword method against a reference largely derived from
            itself inflates its agreement figures and is not the honest, independent comparison FR-15 requires.
            Treat the kappa values below as unreliable and use the Ground Truth comparison further down
            instead{groundTruth.referenceOnly.n === 0 && ' — which is still waiting on that independent manual sample'}.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MethodAgreementCard title={`Keyword Method (n=${data.keywordCoverage})`} methodName="Keyword" agreement={data.keywordAgreement} />
        <MethodAgreementCard title={`LLM Method (n=${data.llmCoverage})`} methodName="LLM" agreement={data.llmAgreement} />
      </div>

      <div className="mt-8 mb-2">
        <h2 className="text-sm font-semibold text-gray-800">Ground truth (independent human review)</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Two coders labelled posts by hand, blind to the system&apos;s suggestions, following the project codebook.
          This is the authoritative comparison, restricted to posts confirmed through that independent manual
          review, so it can&apos;t be contaminated by the circularity above.
        </p>
        <MethodologyNote label="Where this data comes from" className="mt-1">
          Coders&apos; labels follow <span className="font-medium">CODEBOOK_content_categories.md</span> and are
          imported via <span className="font-mono">scripts/import-ground-truth.ts</span> (sets{' '}
          <span className="font-mono">category_final_source = MANUAL_GROUND_TRUTH</span>) and{' '}
          <span className="font-mono">scripts/import-codebook-assignment.ts</span> (sets{' '}
          <span className="font-mono">category_final_source = MANUAL_CODEBOOK_ASSIGNMENT</span>). Both sets were
          produced by the same two coders under the same blind, caption-only, suggestion-blind procedure — see
          Backlog_Coding_Complete_v2.md §2/§3 — so the two figures below can be read side by side rather than as
          competing measurements.
        </MethodologyNote>
      </div>

      {groundTruth.combined.n === 0 ? (
        <div className="bg-card rounded-2xl card-shadow p-4 border-l-4 border-status-warning">
          <p className="text-xs text-gray-600">
            No ground-truth sample has been imported yet — waiting on the two-coder codebook process. Once the
            resolved CSV is ready, a developer runs the import script against it (see
            Developer_Note_Ground_Truth_Labelling.md).
          </p>
        </div>
      ) : (
        <>
          <h3 className="text-xs font-semibold text-gray-700 mb-1">
            Pre-specified reference sample (n={groundTruth.referenceOnly.n})
          </h3>
          {/* Scoped to the reference section only, and only rendered when its
              n matches the reference sample exactly — a ceiling figure from a
              different blind-coding session (e.g. the backlog session in
              Backlog_Coding_Complete_v2.md §2, n=507) is not interchangeable
              with this one and must never be shown as if it were. */}
          {referenceInterCoder && (
            <div className="bg-card rounded-2xl card-shadow p-4 mb-4 border-l-4 border-primary">
              <p className="text-xs text-gray-600">
                <span className="font-semibold">Human inter-coder kappa (ceiling), n={referenceInterCoder.n}:</span> {referenceInterCoder.kappa.toFixed(3)}{' '}
                ({kappaMagnitude(referenceInterCoder.kappa)}), {(referenceInterCoder.percentAgreement * 100).toFixed(1)}% agreement. This
                is the agreement two trained human coders reached on this specific sample — the methods below can&apos;t
                reasonably be expected to exceed it.
                {referenceInterCoder.notes && <span className="block mt-1 text-gray-500">{referenceInterCoder.notes}</span>}
              </p>
            </div>
          )}
          <p className="text-xs text-gray-500 mb-3">
            The 150–200 post sample committed to before any result was seen — each method compared against the
            resolved human label.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <MethodAgreementCard
              title={`Keyword Method — Reference Sample (n=${groundTruth.referenceOnly.keywordAgreement.n})`}
              methodName="Keyword"
              agreement={groundTruth.referenceOnly.keywordAgreement}
              recall={groundTruth.referenceOnly.keywordRecall}
            />
            <MethodAgreementCard
              title={`LLM Method — Reference Sample (n=${groundTruth.referenceOnly.llmAgreement.n})`}
              methodName="LLM"
              agreement={groundTruth.referenceOnly.llmAgreement}
              recall={groundTruth.referenceOnly.llmRecall}
            />
          </div>

          <h3 className="text-xs font-semibold text-gray-700 mb-1">
            Full corpus, reference + backlog combined (n={groundTruth.combined.n})
          </h3>
          {/* Only renders once a pooled inter-coder figure whose n matches
              this section exactly has been imported (FR08_707_Figures_to_
              Reconcile.md §3) — a row from either single session alone
              (n=200 or n=507) does not cover this combined set and must
              never be shown here. */}
          {combinedInterCoder && (
            <div className="bg-card rounded-2xl card-shadow p-4 mb-4 border-l-4 border-primary">
              <p className="text-xs text-gray-600">
                <span className="font-semibold">Human inter-coder kappa (ceiling), n={combinedInterCoder.n}:</span> {combinedInterCoder.kappa.toFixed(3)}{' '}
                ({kappaMagnitude(combinedInterCoder.kappa)}), {(combinedInterCoder.percentAgreement * 100).toFixed(1)}% agreement.
                Pooled across both blind-coding sessions — the methods below can&apos;t reasonably be expected to
                exceed it.
                {combinedInterCoder.notes && <span className="block mt-1 text-gray-500">{combinedInterCoder.notes}</span>}
              </p>
            </div>
          )}
          <p className="text-xs text-gray-500 mb-3">
            Every post the two coders have labelled under the same blind procedure — effectively the whole
            in-period corpus less the posts held back for the demonstration. This set contains the reference sample
            above plus the backlog session, not a separate independent sample; the two are not mutually exclusive.
            {!combinedInterCoder && (
              <> No single inter-coder ceiling applies here yet since it would span two separate blind-coding
              sessions with different inter-coder kappas (Backlog_Coding_Complete_v2.md §2) — a pooled figure across
              both sessions is pending.</>
            )} Stronger, but reported alongside the reference figure above, not instead of it.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MethodAgreementCard
              title={`Keyword Method — Full Corpus (n=${groundTruth.combined.keywordAgreement.n})`}
              methodName="Keyword"
              agreement={groundTruth.combined.keywordAgreement}
              recall={groundTruth.combined.keywordRecall}
            />
            <MethodAgreementCard
              title={`LLM Method — Full Corpus (n=${groundTruth.combined.llmAgreement.n})`}
              methodName="LLM"
              agreement={groundTruth.combined.llmAgreement}
              recall={groundTruth.combined.llmRecall}
            />
          </div>
        </>
      )}

      {/* docs/raven/Provenance_Followup_and_Revised_Order.md §3.2 — a
          separate, differently-labelled figure from the accuracy cards
          above: no kappa, never called accuracy. This is a live drift
          signal ("how much are you changing the suggestion"), not a
          correctness claim against a blind reference standard. */}
      <div className="mt-8 mb-2">
        <h2 className="text-sm font-semibold text-gray-800">Suggestion acceptance rate (live monitoring)</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          How often your final category differs from each method&apos;s suggestion, across the posts you&apos;ve
          actually reviewed and finalised. This is not an accuracy figure and carries no kappa — a high alteration
          rate means you&apos;re disagreeing with the suggestion often, which is useful for noticing a method
          drifting on newer content, but says nothing about which of you is right.
        </p>
      </div>
      <div className="bg-card rounded-2xl card-shadow p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
          <div>
            <p className="text-xs text-gray-500">Keyword suggestions altered</p>
            <p className="text-lg font-semibold text-foreground">
              {acceptanceRate.keywordAlteredRate === null ? 'n/a' : `${(acceptanceRate.keywordAlteredRate * 100).toFixed(1)}%`}
              <span className="text-xs font-normal text-gray-500 ml-1">(n={acceptanceRate.keywordTotal})</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">LLM suggestions altered</p>
            <p className="text-lg font-semibold text-foreground">
              {acceptanceRate.llmAlteredRate === null ? 'n/a' : `${(acceptanceRate.llmAlteredRate * 100).toFixed(1)}%`}
              <span className="text-xs font-normal text-gray-500 ml-1">(n={acceptanceRate.llmTotal})</span>
            </p>
          </div>
        </div>
        {acceptanceRate.periods.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 border-b border-border">
                  <th className="py-1.5 pr-4 font-medium">Period</th>
                  <th className="py-1.5 pr-4 font-medium text-right">Keyword altered</th>
                  <th className="py-1.5 font-medium text-right">LLM altered</th>
                </tr>
              </thead>
              <tbody>
                {acceptanceRate.periods.map((p) => (
                  <tr key={p.period} className="border-b border-border last:border-0">
                    <td className="py-1.5 pr-4 text-gray-600">{p.period === 'unknown' ? '—' : p.period}</td>
                    <td className="py-1.5 pr-4 text-right text-gray-600">
                      {p.keywordTotal > 0 ? `${((p.keywordAltered / p.keywordTotal) * 100).toFixed(1)}% (${p.keywordAltered}/${p.keywordTotal})` : '—'}
                    </td>
                    <td className="py-1.5 text-right text-gray-600">
                      {p.llmTotal > 0 ? `${((p.llmAltered / p.llmTotal) * 100).toFixed(1)}% (${p.llmAltered}/${p.llmTotal})` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-4">
        <MethodologyNote>
          Cohen&apos;s kappa (unweighted) measures agreement beyond what chance would predict given each label&apos;s
          marginal frequency — 0 means no better than chance, 1 means perfect agreement. Bands follow Landis &amp;
          Koch (1977): &lt;0 poor, 0–0.2 slight, 0.2–0.4 fair, 0.4–0.6 moderate, 0.6–0.8 substantial, 0.8–1 almost
          perfect. UNCLASSIFIED is treated as a genuine fifth label in the confusion matrix, not dropped or merged
          into another category — a method that returns UNCLASSIFIED against a post you categorised is a real
          disagreement, not missing data. The acceptance rate above is a different, unrelated figure — see its own
          description above for why it carries no kappa.
        </MethodologyNote>
      </div>
    </div>
  )
}
