import Link from 'next/link'

export function PrintButton({ href }: { href: string }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener"
      className="bg-zinc-800 hover:bg-zinc-900 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors inline-flex items-center gap-2"
    >
      Print / Export PDF
    </Link>
  )
}
