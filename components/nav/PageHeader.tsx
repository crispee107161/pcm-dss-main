export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-ink tracking-tight">{title}</h1>
      {description && <p className="text-ink-muted text-sm mt-1.5 leading-relaxed max-w-prose">{description}</p>}
    </div>
  )
}
