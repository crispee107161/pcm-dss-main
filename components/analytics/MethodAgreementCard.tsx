import type { AgreementResult } from '@/lib/stats/agreement'
import { AGREEMENT_LABELS, kappaMagnitude } from '@/lib/stats/agreement'
import { CATEGORY_LABEL_DISPLAY } from '@/lib/category-label'

const SHORT_LABEL: Record<string, string> = {
  PRODUCT_SHOWCASE: 'Showcase',
  PROMOTIONAL_OFFER: 'Promo',
  TESTIMONIAL: 'Testim.',
  ENTERTAINMENT: 'Entert.',
  UNCLASSIFIED: 'Unclass.',
  UNCLEAR: 'Unclear',
}

export default function MethodAgreementCard({ title, methodName, agreement }: {
  title: string
  methodName: string
  agreement: AgreementResult
}) {
  const magnitude = kappaMagnitude(agreement.kappa)

  return (
    <div className="bg-card rounded-2xl card-shadow overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.12em]">{title}</p>
      </div>

      <div className="p-5">
        {agreement.n === 0 ? (
          <p className="text-sm text-muted-foreground">
            No posts currently have both a {methodName} suggestion and a final category — nothing to compare yet.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 mb-5">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">n</p>
                <p className="text-xl font-bold text-foreground mt-1">{agreement.n}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Percentage Agreement</p>
                <p className="text-xl font-bold text-foreground mt-1">{(agreement.percentAgreement * 100).toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Cohen&apos;s Kappa</p>
                <p className="text-xl font-bold text-foreground mt-1">
                  {agreement.kappa.toFixed(3)} <span className="text-xs font-normal text-muted-foreground">({magnitude})</span>
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="px-2 py-1.5 text-left text-gray-500 font-medium" />
                    <th colSpan={AGREEMENT_LABELS.length} className="px-2 py-1 text-center text-gray-500 font-medium uppercase tracking-wider text-[10px]">
                      Final category (actual)
                    </th>
                  </tr>
                  <tr>
                    <th className="px-2 py-1.5 text-left text-gray-500 font-medium">{methodName} ↓</th>
                    {AGREEMENT_LABELS.map((label) => (
                      <th key={label} className="px-2 py-1.5 text-right text-gray-500 font-medium" title={CATEGORY_LABEL_DISPLAY[label as keyof typeof CATEGORY_LABEL_DISPLAY]}>
                        {SHORT_LABEL[label]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {AGREEMENT_LABELS.map((predicted) => (
                    <tr key={predicted} className="border-t border-gray-100">
                      <td className="px-2 py-1.5 font-medium text-gray-700 whitespace-nowrap" title={CATEGORY_LABEL_DISPLAY[predicted as keyof typeof CATEGORY_LABEL_DISPLAY]}>
                        {SHORT_LABEL[predicted]}
                      </td>
                      {AGREEMENT_LABELS.map((actual) => {
                        const cell = agreement.confusionMatrix.find((c) => c.predicted === predicted && c.actual === actual)
                        const isDiagonal = predicted === actual
                        return (
                          <td
                            key={actual}
                            className={`px-2 py-1.5 text-right ${isDiagonal && (cell?.count ?? 0) > 0 ? 'bg-primary/10 font-semibold text-primary' : 'text-gray-600'}`}
                          >
                            {cell?.count ?? 0}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
