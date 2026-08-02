import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// All data fetching (including the Groq API calls in actions/chat.ts,
// ai-insights.ts, keywords.ts) happens server-side in Server Actions, so the
// browser never needs to reach an external host directly — connect-src can
// stay 'self'. 'unsafe-eval' is only needed for the dev server's HMR/webpack
// runtime and is dropped in production builds.
// Vercel Web Analytics (app/layout.tsx <Analytics />) loads a script from
// va.vercel-scripts.com and beacons to vitals.vercel-insights.com.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://va.vercel-scripts.com https://vitals.vercel-insights.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  // Required in Next.js 16 — returning null uses the default nanoid build ID
  generateBuildId: async () => null,
  // Headless-Chromium PDF export (app/api/reports/[role]/pdf) — keep these as real
  // runtime requires instead of letting webpack/nft trace and bundle them (and their
  // large binaries) into the serverless function output.
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium", "puppeteer"],
  // serverExternalPackages alone keeps the package un-bundled, but Next's build-time
  // file tracing still decides what actually gets copied into the deployed function —
  // and it doesn't reliably pick up @sparticuz/chromium's compressed binary under
  // node_modules/@sparticuz/chromium/bin, since that file is loaded via a runtime fs
  // path rather than a statically-analyzable import. Force it in explicitly.
  outputFileTracingIncludes: {
    "/api/reports/[role]/pdf": ["./node_modules/@sparticuz/chromium/bin/**/*"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
