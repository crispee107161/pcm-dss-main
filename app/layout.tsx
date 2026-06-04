import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/react'
import './globals.css'
import { Inter, Sora } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});
const sora = Sora({subsets:['latin'],variable:'--font-display',weight:['600','700','800']});

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
    <html lang="en" className={cn("h-full", "font-sans", inter.variable, sora.variable)}>
      <body className="min-h-full bg-slate-50 antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
