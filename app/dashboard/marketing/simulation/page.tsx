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

export default async function SimulationPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MARKETING_MANAGER') {
    redirect('/login')
  }

  const simHistory = await prisma.simulationResult.findMany({
    orderBy: { simulated_at: 'desc' },
    take: 20,
    include: { user: { select: { email: true } } },
  })

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader title="What-If Simulation" description="Estimate purchases from a hypothetical ad budget" />

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
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 bg-slate-50">Date</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 bg-slate-50">User</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 bg-slate-50">Amount Spent</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 bg-slate-50">Projected Purchases</th>
                </tr>
              </thead>
              <tbody>
                {simHistory.map((sim) => (
                  <tr key={sim.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500 border-t border-slate-100 text-xs whitespace-nowrap">{formatDate(sim.simulated_at)}</td>
                    <td className="px-4 py-3 text-slate-600 border-t border-slate-100 text-xs">{sim.user.email}</td>
                    <td className="px-4 py-3 text-slate-700 border-t border-slate-100">{formatPhp(sim.amount_spent_input)}</td>
                    <td className="px-4 py-3 border-t border-slate-100">
                      <span className="font-semibold text-red-700">{Math.max(0, Math.round(sim.projected_purchases))}</span>
                      <span className="text-slate-400 text-xs ml-1">(exact: {sim.projected_purchases.toFixed(2)})</span>
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
