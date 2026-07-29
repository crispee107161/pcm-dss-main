import type { Browser } from 'puppeteer-core'

// Local dev: full `puppeteer` package (bundles its own Chromium) — @sparticuz/chromium's
// binary is built specifically for the AWS Lambda/Vercel serverless runtime and does not
// run on a regular Windows/macOS/Linux dev machine.
// Production (Vercel serverless): `puppeteer-core` + `@sparticuz/chromium`, a Chromium
// build slimmed and brotli-compressed to fit within serverless function size limits.
export async function launchBrowser(): Promise<Browser> {
  if (process.env.NODE_ENV !== 'production') {
    const puppeteer = await import('puppeteer')
    return puppeteer.launch({ headless: true }) as unknown as Promise<Browser>
  }

  const chromium = (await import('@sparticuz/chromium')).default
  const puppeteerCore = await import('puppeteer-core')

  return puppeteerCore.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  })
}
