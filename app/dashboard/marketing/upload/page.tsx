import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/nav/PageHeader'
import UploadForm from '@/components/upload/UploadForm'
import UploadHistory from '@/components/upload/UploadHistory'

export default async function UploadPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MARKETING_MANAGER') {
    redirect('/login')
  }

  const uploadLogs = await prisma.uploadLog.findMany({
    orderBy: { uploaded_at: 'desc' },
    take: 30,
    include: { user: { select: { email: true } } },
  })

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader title="Upload Data" description="Import Facebook Insights and Ads Manager CSV files" />

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
        <UploadForm />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Upload History</h2>
        <UploadHistory logs={uploadLogs} />
      </div>
    </div>
  )
}
