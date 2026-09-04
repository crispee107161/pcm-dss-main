import { requireSession } from '@/lib/auth-guard'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/nav/PageHeader'
import MethodologyNote from '@/components/analytics/MethodologyNote'
import { rankByAdSet, rankByCampaign, checkCampaignAdSetMapping, MIN_ADS_FOR_CONFIDENCE } from '@/lib/stats/ad-set-ranking'
import { FR31_RESULT_TYPE } from '@/lib/stats/fr31-regression'
import { sameGroupingsSentence, rankingsFindingSentence } from '@/lib/stats/analysis-narrative'
import AdSetRankingTable from '@/components/analytics/AdSetRankingTable'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { STUDY_PERIOD_AD_WHERE } from '@/lib/data/study-period'

// docs/raven/Rankings_Review.md §4 — a statement about observational
// comparison, true of the method regardless of what is uploaded, so unlike
// the sentences above it stays a constant rather than being generated.
const CONFOUNDING_CAVEAT =
  'These groups ran at different times of the year and reached different audiences, so a group near the top may have benefited from its timing as much as from its content. Use this to see where money went and what it returned, rather than as a ranking of which ad sets are best.'

export default async function AdSetRankingPage() {
  const session = await requireSession()
  if (session.user.role !== 'BUSINESS_OWNER') {
    redirect('/login')
  }

  const ads = await prisma.ad.findMany({
    where: STUDY_PERIOD_AD_WHERE,
    select: {
      ad_id: true, ad_set_id: true, ad_set_name: true, campaign_id: true, campaign_name: true,
      amount_spent: true, total_messaging_contacts: true, result_type: true,
    },
  })

  const adSetRows = rankByAdSet(ads)
  const campaignRows = rankByCampaign(ads)
  // Same messaging-filtered rows that feed the two tables above, so this
  // sentence can never disagree with what's actually on screen.
  const messagingAds = ads.filter(a => a.result_type === FR31_RESULT_TYPE)
  const mapping = checkCampaignAdSetMapping(messagingAds)
  const sameGroupings = sameGroupingsSentence(mapping)
  const adSetFinding = rankingsFindingSentence(adSetRows, 'ad set')
  const campaignFinding = rankingsFindingSentence(campaignRows, 'campaign')

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Rankings"
        description="Messaging ads grouped by ad set and campaign, ranked most efficient first by spend, inquiries, and cost per messaging conversation"
      />

      <Tabs defaultValue="ad-set">
        <TabsList>
          <TabsTrigger value="ad-set">By Ad Set</TabsTrigger>
          <TabsTrigger value="campaign">By Campaign</TabsTrigger>
        </TabsList>

        <div className="mt-3 mb-5 space-y-1.5">
          <p className="text-xs text-muted-foreground">{sameGroupings}</p>
          <p className="text-xs text-muted-foreground">{CONFOUNDING_CAVEAT}</p>
        </div>

        <TabsContent value="ad-set" className="mt-4">
          {adSetFinding && <p className="text-sm text-foreground mb-3">{adSetFinding}</p>}
          <div className="bg-card rounded-2xl card-shadow overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.12em]">{adSetRows.length} ad sets</p>
            </div>
            <AdSetRankingTable rows={adSetRows} idLabel="Ad Set" />
          </div>
        </TabsContent>

        <TabsContent value="campaign" className="mt-4">
          {campaignFinding && <p className="text-sm text-foreground mb-3">{campaignFinding}</p>}
          <div className="bg-card rounded-2xl card-shadow overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.12em]">{campaignRows.length} campaigns</p>
            </div>
            <AdSetRankingTable rows={campaignRows} idLabel="Campaign" />
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-4">
        <MethodologyNote>
          Messaging-optimised ads (Result type = &quot;Messaging conversations started&quot;) are grouped by
          Ad set ID or Campaign ID, never by name (ad set and campaign names are reused across distinct IDs
          in this account&apos;s data). Spend and inquiries are summed per Ad ID across all uploaded months
          first, then summed again across the ads in each group, before dividing (CPI = spend ÷ inquiries).
          Groups with fewer than {MIN_ADS_FOR_CONFIDENCE} ads are flagged &quot;low confidence&quot; rather than
          hidden: their CPI is based on too little data to trust at face value. Groups with zero recorded
          messaging conversations show a CPI of &quot;—&quot; and sort last, since there is no ratio to rank.
        </MethodologyNote>
      </div>
    </div>
  )
}
