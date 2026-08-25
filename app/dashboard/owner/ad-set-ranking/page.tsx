import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/nav/PageHeader'
import MethodologyNote from '@/components/analytics/MethodologyNote'
import { rankByAdSet, rankByCampaign, MIN_ADS_FOR_CONFIDENCE } from '@/lib/stats/ad-set-ranking'
import AdSetRankingTable from '@/components/analytics/AdSetRankingTable'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { STUDY_PERIOD_AD_WHERE } from '@/lib/data/study-period'

export default async function AdSetRankingPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'BUSINESS_OWNER') {
    redirect('/login')
  }

  const ads = await prisma.ad.findMany({
    where: STUDY_PERIOD_AD_WHERE,
    select: {
      ad_id: true, ad_set_id: true, ad_set_name: true, campaign_id: true, campaign_name: true,
      amount_spent: true, total_messaging_contacts: true,
    },
  })

  const adSetRows = rankByAdSet(ads)
  const campaignRows = rankByCampaign(ads)

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Rankings"
        description="Messaging ads grouped by ad set and campaign — spend, inquiries, and cost per messaging conversation, ranked most efficient first"
      />

      <div className="bg-card rounded-2xl card-shadow p-4 mb-6 border-l-4 border-status-warning">
        <p className="text-xs text-gray-600">
          <span className="font-semibold">Confounding caveat:</span> ad sets and campaigns ran in different
          periods with different targeting, so this compares what happened, not a controlled test — a
          well-performing group may reflect the season as much as the content.
        </p>
      </div>

      <Tabs defaultValue="ad-set">
        <TabsList>
          <TabsTrigger value="ad-set">By Ad Set</TabsTrigger>
          <TabsTrigger value="campaign">By Campaign</TabsTrigger>
        </TabsList>

        <TabsContent value="ad-set" className="mt-4">
          <div className="bg-card rounded-2xl card-shadow overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.12em]">Ad Sets (n={adSetRows.length})</p>
            </div>
            <AdSetRankingTable rows={adSetRows} idLabel="Ad Set" />
          </div>
        </TabsContent>

        <TabsContent value="campaign" className="mt-4">
          <div className="bg-card rounded-2xl card-shadow overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.12em]">Campaigns (n={campaignRows.length})</p>
            </div>
            <AdSetRankingTable rows={campaignRows} idLabel="Campaign" />
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-4">
        <MethodologyNote>
          Messaging-optimised ads (Result type = &quot;Messaging conversations started&quot;) are grouped by
          Ad set ID or Campaign ID — never by name, since ad set and campaign names are reused across
          distinct IDs in this account&apos;s data. Spend and inquiries are summed per Ad ID across all
          uploaded months first, then summed again across the ads in each group, before dividing (CPI = spend
          ÷ inquiries). Groups with fewer than {MIN_ADS_FOR_CONFIDENCE} ads are flagged &quot;low confidence&quot; rather than
          hidden — their CPI is based on too little data to trust at face value. Groups with zero recorded
          messaging conversations show a CPI of &quot;—&quot; and sort last, since there is no ratio to rank.
        </MethodologyNote>
      </div>
    </div>
  )
}
