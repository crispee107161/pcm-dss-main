export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-8 pl-4 border-l-2 border-red-500">
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
      {description && <p className="text-slate-500 text-sm mt-1.5 leading-relaxed max-w-prose">{description}</p>}
    </div>
  )
}
