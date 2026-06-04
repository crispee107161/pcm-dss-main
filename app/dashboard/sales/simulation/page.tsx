import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/nav/PageHeader'
import WhatIfSimulator from '@/components/analytics/WhatIfSimulator'

function formatPhp(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency', currency: 'PHP',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date))
}

export default async function SalesSimulationPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'SALES_DIRECTOR') redirect('/login')

  const simHistory = await prisma.simulationResult.findMany({
    orderBy: { simulated_at: 'desc' },
    take: 20,
    include: { user: { select: { email: true } } },
  })

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="What-If Simulation"
        description="Predict purchases from hypothetical engagement inputs with 80% prediction interval (FR-20, FR-21)"
      />

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
        <WhatIfSimulator />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Recent Simulations (All Users)</h2>
        {simHistory.length === 0 ? (
          <p className="text-slate-500 text-sm">No simulations run yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {['Date', 'User', 'Reach', 'Messaging', 'Amount Spent', 'Predicted', '80% Interval'].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-3 py-3 bg-slate-50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {simHistory.map((sim) => (
                  <tr key={sim.id} className="hover:bg-slate-50">
                    <td className="px-3 py-3 text-slate-500 border-t border-slate-100 text-xs whitespace-nowrap">{formatDate(sim.simulated_at)}</td>
                    <td className="px-3 py-3 text-slate-600 border-t border-slate-100 text-xs">{sim.user.email}</td>
                    <td className="px-3 py-3 text-slate-600 border-t border-slate-100">{sim.reach_input != null ? sim.reach_input.toLocaleString() : '—'}</td>
                    <td className="px-3 py-3 text-slate-600 border-t border-slate-100">{sim.messaging_input != null ? sim.messaging_input.toLocaleString() : '—'}</td>
                    <td className="px-3 py-3 text-slate-700 border-t border-slate-100">{formatPhp(sim.amount_spent_input)}</td>
                    <td className="px-3 py-3 border-t border-slate-100">
                      <span className="font-semibold text-red-700">{Math.max(0, Math.round(sim.projected_purchases))}</span>
                    </td>
                    <td className="px-3 py-3 border-t border-slate-100 text-xs text-amber-700">
                      {sim.interval_lower != null && sim.interval_upper != null
                        ? `${Math.max(0, Math.round(sim.interval_lower))} – ${Math.max(0, Math.round(sim.interval_upper))}`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
