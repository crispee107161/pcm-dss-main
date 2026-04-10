import { Button } from '@/components/ui/Button'
import { Card, CardDivider } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge, StatusDot } from '@/components/ui/Badge'
import { Alert } from '@/components/ui/Alert'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">{title}</h2>
      {children}
    </section>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-slate-400">{label}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  )
}

export default function UIShowcase() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <img src="/pcm-logo.png" alt="PCM" className="w-7 h-7 object-contain" />
            <div>
              <h1 className="text-lg font-bold text-slate-900">UI Component Library</h1>
              <p className="text-xs text-slate-400">PC Merchandise DSS — design primitives</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-10 space-y-12">

        {/* ── BUTTON ── */}
        <Section title="Button">
          <Card padding="md" className="space-y-6">
            <Row label="Variants">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
            </Row>
            <CardDivider />
            <Row label="Sizes — primary">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </Row>
            <CardDivider />
            <Row label="Disabled">
              <Button variant="primary" disabled>Primary</Button>
              <Button variant="secondary" disabled>Secondary</Button>
              <Button variant="ghost" disabled>Ghost</Button>
            </Row>
            <CardDivider />
            <Row label="With icon">
              <Button variant="primary" size="md">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Item
              </Button>
              <Button variant="secondary" size="md">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload
              </Button>
              <Button variant="destructive" size="md">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </Button>
            </Row>
          </Card>
        </Section>

        {/* ── CARD ── */}
        <Section title="Card">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card variant="default" title="Default Card">
              <p className="text-sm text-slate-500">White background with a subtle border and shadow. Used throughout all dashboard pages.</p>
            </Card>
            <Card variant="dark" title="Dark Card">
              <p className="text-sm text-zinc-400">Dark zinc-950 background. Used for ROI summaries and high-contrast data panels.</p>
            </Card>
            <Card variant="default" padding="sm">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">KPI-style (padding sm)</p>
              <p className="text-2xl font-bold text-slate-900">₱128,400</p>
              <p className="text-xs text-slate-400 mt-1">total ad spend</p>
            </Card>
            <Card variant="default" padding="none">
              <div className="px-6 py-4 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-800">No padding (manual)</p>
              </div>
              <div className="px-6 py-4">
                <p className="text-sm text-slate-500">Useful for tables and lists that need edge-to-edge content.</p>
              </div>
            </Card>
          </div>
        </Section>

        {/* ── INPUT ── */}
        <Section title="Input">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title="Light variant" padding="md">
              <div className="space-y-4">
                <Input variant="light" label="Email address" placeholder="you@example.com" type="email" />
                <Input variant="light" label="Password" placeholder="••••••••" type="password" hint="At least 8 characters" />
                <Input variant="light" label="With error" placeholder="Enter value" error="This field is required" />
                <Input variant="light" placeholder="No label" />
              </div>
            </Card>
            <Card variant="dark" title="Dark variant" padding="md">
              <div className="space-y-4">
                <Input variant="dark" label="Email address" placeholder="you@example.com" type="email" />
                <Input variant="dark" label="Password" placeholder="••••••••" type="password" hint="At least 8 characters" />
                <Input variant="dark" label="With error" placeholder="Enter value" error="Current password is incorrect" />
                <Input variant="dark" placeholder="No label" />
              </div>
            </Card>
          </div>
        </Section>

        {/* ── BADGE ── */}
        <Section title="Badge">
          <Card padding="md" className="space-y-6">
            <Row label="Colors — size sm (default)">
              <Badge color="red">Red</Badge>
              <Badge color="green">Green</Badge>
              <Badge color="amber">Amber</Badge>
              <Badge color="slate">Slate</Badge>
              <Badge color="blue">Blue</Badge>
              <Badge color="purple">Purple</Badge>
              <Badge color="zinc">Zinc</Badge>
            </Row>
            <CardDivider />
            <Row label="Size md">
              <Badge color="red" size="md">Red</Badge>
              <Badge color="green" size="md">Green</Badge>
              <Badge color="amber" size="md">Amber</Badge>
              <Badge color="slate" size="md">Slate</Badge>
            </Row>
            <CardDivider />
            <Row label="Role badges (real usage)">
              <Badge color="purple">Business Owner</Badge>
              <Badge color="blue">Sales Director</Badge>
              <Badge color="green">Marketing Manager</Badge>
            </Row>
            <CardDivider />
            <Row label="With StatusDot">
              <Badge color="green"><StatusDot color="green" />Active</Badge>
              <Badge color="red"><StatusDot color="red" />Offline</Badge>
              <Badge color="amber"><StatusDot color="amber" />Pending</Badge>
              <Badge color="slate"><StatusDot color="slate" />Unknown</Badge>
            </Row>
          </Card>
        </Section>

        {/* ── ALERT ── */}
        <Section title="Alert">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card title="Light surface" padding="md">
              <div className="space-y-3">
                <Alert variant="info"    message="Your data was last synced 2 minutes ago." />
                <Alert variant="success" message="Campaign rankings updated successfully." />
                <Alert variant="warning" message="No purchases data found for this period." />
                <Alert variant="error"   message="Failed to upload file. Please try again." />
              </div>
            </Card>
            <Card variant="dark" title="Dark surface" padding="md">
              <div className="space-y-3">
                <Alert variant="info"    dark message="Your data was last synced 2 minutes ago." />
                <Alert variant="success" dark message="Password updated successfully." />
                <Alert variant="warning" dark message="No purchases data found for this period." />
                <Alert variant="error"   dark message="Current password is incorrect." />
              </div>
            </Card>
          </div>
        </Section>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 pb-4">
          PC Merchandise DSS · UI Component Library · import from <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">@/components/ui</code>
        </p>

      </div>
    </div>
  )
}
