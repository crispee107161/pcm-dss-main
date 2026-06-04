export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-8 pl-4 border-l-[3px] border-red-600">
      <h1 className="text-[1.4rem] font-extrabold text-slate-900 tracking-tight leading-snug">{title}</h1>
      {description && <p className="text-slate-500 text-sm mt-1 leading-relaxed">{description}</p>}
    </div>
  )
}
