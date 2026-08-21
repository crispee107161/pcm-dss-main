# pcm-dss

**PC Merchandise Decision Support System** — a role-gated Next.js dashboard that analyzes Facebook ad and page performance data to support marketing decisions for a PC merchandise business.

## Stack
- Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4
- Prisma ORM → Neon PostgreSQL (prod) / PostgreSQL (dev)
- NextAuth.js v5 (JWT sessions) · Recharts · Groq AI API

## Getting Started

```bash
npm install
npx prisma generate
npm run dev
```

See `CLAUDE.md` for the full command reference (build, migrations, seeding, tests).
