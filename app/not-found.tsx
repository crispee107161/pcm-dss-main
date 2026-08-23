import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center gap-6 bg-background text-foreground p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex items-center gap-2 self-center font-medium text-foreground">
          <img src="/pcm-logo.png" alt="" className="size-6 object-contain" />
          PCM <span className="text-muted-foreground font-normal">Decision Support</span>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-border-lg text-center">
          <p className="text-sm font-semibold text-primary">404</p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">Page not found</h1>
          <p className="mt-2 text-sm text-muted-foreground text-balance">
            The page you&apos;re looking for doesn&apos;t exist or may have moved.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
