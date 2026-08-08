import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/nav/PageHeader'
import WhatIfSimulator from '@/components/analytics/WhatIfSimulator'
import BudgetAllocator from '@/components/analytics/BudgetAllocator'
import CostCuttingScenario from '@/components/analytics/CostCuttingScenario'

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

export default async function SimulationView() {
  const simHistory = await prisma.simulationResult.findMany({
    orderBy: { simulated_at: 'desc' },
    take: 20,
    include: { user: { select: { email: true } } },
  })

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="What-If Simulation"
        description="Predict messaging conversations from hypothetical engagement inputs, with a realistic range instead of a single number"
      />

      <div className="bg-card rounded-2xl card-shadow p-6 mb-8">
        <WhatIfSimulator />
      </div>

      <div className="bg-card rounded-2xl card-shadow p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-1">Budget Allocation Recommender</h2>
        <p className="text-sm text-gray-400 mb-5">Distribute a total budget across your best-performing ad sets based on historical messaging-conversation efficiency.</p>
        <BudgetAllocator />
      </div>

      <div className="bg-card rounded-2xl card-shadow p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-1">Cost-Cutting Scenario</h2>
        <p className="text-sm text-gray-400 mb-5">See which ad sets to cut to hit a budget reduction target, and what it costs you in messaging conversations.</p>
        <CostCuttingScenario />
      </div>

      <div className="bg-card rounded-2xl card-shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Simulations (All Users)</h2>
        {simHistory.length === 0 ? (
          <p className="text-gray-500 text-sm">No simulations run yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {['Date', 'User', 'Reach', 'Amount Spent', 'Predicted', '80% Interval'].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-3 bg-gray-50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {simHistory.map((sim) => (
                  <tr key={sim.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 text-gray-500 border-t border-gray-100 text-xs whitespace-nowrap">{formatDate(sim.simulated_at)}</td>
                    <td className="px-3 py-3 text-gray-600 border-t border-gray-100 text-xs">{sim.user.email}</td>
                    <td className="px-3 py-3 text-gray-600 border-t border-gray-100">{sim.reach_input != null ? sim.reach_input.toLocaleString() : '—'}</td>
                    <td className="px-3 py-3 text-gray-700 border-t border-gray-100">{formatPhp(sim.amount_spent_input)}</td>
                    <td className="px-3 py-3 border-t border-gray-100">
                      <span className="font-semibold text-red-400">{Math.max(0, Math.round(sim.projected_inquiries))}</span>
                    </td>
                    <td className="px-3 py-3 border-t border-gray-100 text-xs text-yellow-400">
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
