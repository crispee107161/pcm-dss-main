// docs/raven/Lexicon_Drift_Rerun_Spec.md §5 — this screen used to let the
// manager add/delete keywords and pull AI suggestions (actions/keywords.ts
// now refuses all of those server-side). It's view-only: inspectability is
// the argument for a rule-based baseline, so the term list should stay
// reachable, just not editable. See docs/raven/FR08_Seed_Lexicon_Rerun_Results.md.

interface Keyword { id: number; word: string }
interface Category { id: number; name: string; keywords: Keyword[] }
interface Props { categories: Category[] }

export default function KeywordsClient({ categories }: Props) {
  return (
    <div className="space-y-6">
      <div className="bg-card rounded-2xl card-shadow p-6"
        style={{ boxShadow: 'var(--card-elevate-shadow-ring)' }}>
        <h2 className="text-sm font-bold text-foreground mb-5">Keywords by Category</h2>
        {categories.length === 0 ? (
          <p className="text-muted-foreground text-sm">No categories found.</p>
        ) : (
          <div className="space-y-6">
            {categories.map(cat => (
              <div key={cat.id}>
                <div className="flex items-center gap-3 mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.1em]">{cat.name}</p>
                  <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                    {cat.keywords.length} keyword{cat.keywords.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {cat.keywords.length === 0 ? (
                  <p className="text-muted-foreground text-xs italic">No keywords.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {cat.keywords.map(kw => (
                      <span
                        key={kw.id}
                        className="inline-flex items-center bg-muted border border-border text-foreground rounded-full px-3 py-1 text-xs font-medium"
                      >
                        {kw.word}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
