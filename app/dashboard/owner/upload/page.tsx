import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/nav/PageHeader'
import UploadForm from '@/components/upload/UploadForm'
import UploadHistory from '@/components/upload/UploadHistory'
import UploadCoverageStatus from '@/components/upload/UploadCoverageStatus'

// FR-04/FR-05: Owner has full Upload Data rights alongside the Marketing
// Manager — see docs/raven/Response_Forecast_Upload_Sidebar.md §2.1.
export default async function OwnerUploadPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'BUSINESS_OWNER') {
    redirect('/login')
  }

  const uploadLogs = await prisma.uploadLog.findMany({
    orderBy: { uploaded_at: 'desc' },
    take: 30,
    include: { user: { select: { email: true } } },
  })

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader title="Upload Data" description="Import Facebook Insights and Ads Manager CSV files" />

      <div className="bg-card rounded-2xl card-shadow overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Coverage Status</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            The Marketing Manager can also upload — check here before starting so you don&apos;t re-do work already covered.
          </p>
        </div>
        <UploadCoverageStatus />
      </div>

      <div className="bg-card rounded-2xl card-shadow p-6 mb-8">
        <UploadForm />
      </div>

      <div className="bg-card rounded-2xl card-shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Upload History</h2>
        <UploadHistory logs={uploadLogs} />
      </div>
    </div>
  )
}
