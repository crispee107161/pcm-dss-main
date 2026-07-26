export function ComingSoon({ feature, reason }: { feature: string; reason: string }) {
  return (
    <div className="bg-card rounded-2xl card-shadow p-12 text-center">
      <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{feature}</h3>
      <p className="text-gray-500 text-sm max-w-md mx-auto">{reason}</p>
    </div>
  )
}
