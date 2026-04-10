import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/react'
import './globals.css'

export const metadata: Metadata = {
  title: 'PC Merchandise DSS',
  description: 'Decision Support System for PC Merchandise Facebook Ads Analytics',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-slate-50 antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
