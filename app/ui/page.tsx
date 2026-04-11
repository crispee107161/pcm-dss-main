'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const SECTIONS = [
  { id: 'button',       label: 'Button' },
  { id: 'badge',        label: 'Badge' },
  { id: 'card',         label: 'Card' },
  { id: 'input',        label: 'Input' },
  { id: 'alert',        label: 'Alert' },
  { id: 'table',        label: 'Table' },
  { id: 'dialog',       label: 'Dialog' },
  { id: 'dropdown',     label: 'Dropdown Menu' },
  { id: 'select',       label: 'Select' },
  { id: 'separator',    label: 'Separator' },
  { id: 'skeleton',     label: 'Skeleton' },
]

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-6">
      {children}
    </h2>
  )
}

function Row({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      {label && <p className="text-xs text-muted-foreground">{label}</p>}
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  )
}

export default function UIShowcase() {
  const [active, setActive] = useState('button')
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id)
          }
        }
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
    )
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observerRef.current?.observe(el)
    })
    return () => observerRef.current?.disconnect()
  }, [])

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-screen bg-background flex">

      {/* Sidebar */}
      <aside className="fixed top-0 left-0 h-screen w-52 border-r bg-card flex flex-col z-10">
        <div className="px-5 py-5 border-b">
          <div className="flex items-center gap-2.5">
            <img src="/pcm-logo.png" alt="PCM" className="w-6 h-6 object-contain" />
            <div>
              <p className="text-sm font-bold leading-none">Components</p>
              <p className="text-xs text-muted-foreground mt-0.5">PCM DSS UI</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-2 mb-2">Library</p>
          <ul className="space-y-0.5">
            {SECTIONS.map(({ id, label }) => (
              <li key={id}>
                <button
                  onClick={() => scrollTo(id)}
                  className={`w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors ${
                    active === id
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main content */}
      <main className="ml-52 flex-1 px-12 py-10 max-w-4xl space-y-20">

        {/* ── BUTTON ── */}
        <section id="button" className="scroll-mt-10">
          <SectionTitle>Button</SectionTitle>
          <div className="space-y-6">
            <Row label="Variants">
              <Button variant="default">Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="link">Link</Button>
            </Row>
            <Separator />
            <Row label="Sizes">
              <Button size="xs">Extra Small</Button>
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
            </Row>
            <Separator />
            <Row label="Icon sizes">
              <Button size="icon-xs" variant="outline">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 4v16m8-8H4" /></svg>
              </Button>
              <Button size="icon-sm" variant="outline">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 4v16m8-8H4" /></svg>
              </Button>
              <Button size="icon" variant="outline">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 4v16m8-8H4" /></svg>
              </Button>
              <Button size="icon-lg" variant="outline">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 4v16m8-8H4" /></svg>
              </Button>
            </Row>
            <Separator />
            <Row label="Disabled">
              <Button disabled>Default</Button>
              <Button variant="secondary" disabled>Secondary</Button>
              <Button variant="outline" disabled>Outline</Button>
            </Row>
          </div>
        </section>

        {/* ── BADGE ── */}
        <section id="badge" className="scroll-mt-10">
          <SectionTitle>Badge</SectionTitle>
          <div className="space-y-6">
            <Row label="Variants">
              <Badge variant="default">Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
            </Row>
            <Separator />
            <Row label="Real usage examples">
              <Badge variant="default">Marketing Manager</Badge>
              <Badge variant="secondary">Sales Director</Badge>
              <Badge variant="outline">Business Owner</Badge>
              <Badge variant="destructive">Error</Badge>
            </Row>
          </div>
        </section>

        {/* ── CARD ── */}
        <section id="card" className="scroll-mt-10">
          <SectionTitle>Card</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Card Title</CardTitle>
                <CardDescription>Card description goes here</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Card body content. Use CardContent for the main area.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>With Footer</CardTitle>
                <CardDescription>Card with a footer action</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Main content area.</p>
              </CardContent>
              <CardFooter className="gap-2">
                <Button size="sm">Save</Button>
                <Button size="sm" variant="outline">Cancel</Button>
              </CardFooter>
            </Card>
            <Card size="sm">
              <CardHeader>
                <CardTitle>KPI Card (size sm)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">₱128,400</p>
                <p className="text-xs text-muted-foreground mt-1">Total ad spend</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>With Badge</CardTitle>
                <CardDescription>Cards can contain any content</CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Badge>Active</Badge>
                <Badge variant="secondary">Draft</Badge>
                <Badge variant="outline">Archived</Badge>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ── INPUT ── */}
        <section id="input" className="scroll-mt-10">
          <SectionTitle>Input</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input id="email" type="email" placeholder="you@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="search">Search</Label>
                <Input id="search" placeholder="Search campaigns..." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="disabled">Disabled</Label>
                <Input id="disabled" placeholder="Cannot edit" disabled />
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="amount">Amount (PHP)</Label>
                <Input id="amount" type="number" placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="file">File upload</Label>
                <Input id="file" type="file" />
              </div>
            </div>
          </div>
        </section>

        {/* ── ALERT ── */}
        <section id="alert" className="scroll-mt-10">
          <SectionTitle>Alert</SectionTitle>
          <div className="space-y-3">
            <Alert>
              <AlertTitle>Default</AlertTitle>
              <AlertDescription>Your data was last synced 2 minutes ago.</AlertDescription>
            </Alert>
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>Failed to upload file. Please check the format and try again.</AlertDescription>
            </Alert>
          </div>
        </section>

        {/* ── TABLE ── */}
        <section id="table" className="scroll-mt-10">
          <SectionTitle>Table</SectionTitle>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ad Name</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Spend (PHP)</TableHead>
                    <TableHead className="text-right">Purchases</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { name: 'Summer Sale Campaign', period: 'Sep 2025', spend: '₱12,400', purchases: 42, status: 'Active' },
                    { name: 'New Arrivals — Laptops', period: 'Dec 2025', spend: '₱8,200', purchases: 28, status: 'Ended' },
                    { name: 'Promo: Year-End Deals', period: 'Jan 2026', spend: '₱15,000', purchases: 63, status: 'Active' },
                  ].map((row) => (
                    <TableRow key={row.name}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="text-muted-foreground">{row.period}</TableCell>
                      <TableCell className="text-right">{row.spend}</TableCell>
                      <TableCell className="text-right text-primary font-semibold">{row.purchases}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={row.status === 'Active' ? 'default' : 'secondary'}>
                          {row.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        {/* ── DIALOG ── */}
        <section id="dialog" className="scroll-mt-10">
          <SectionTitle>Dialog</SectionTitle>
          <div className="flex flex-wrap gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button>Open Dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Action</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to proceed? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline">Cancel</Button>
                  <Button>Confirm</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive">Delete Item</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Campaign</DialogTitle>
                  <DialogDescription>
                    This will permanently delete the campaign and all associated data. This cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline">Cancel</Button>
                  <Button variant="destructive">Delete</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </section>

        {/* ── DROPDOWN MENU ── */}
        <section id="dropdown" className="scroll-mt-10">
          <SectionTitle>Dropdown Menu</SectionTitle>
          <div className="flex flex-wrap gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Open Menu</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>View details</DropdownMenuItem>
                <DropdownMenuItem>Edit campaign</DropdownMenuItem>
                <DropdownMenuItem>Duplicate</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Change Password</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">Sign Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </section>

        {/* ── SELECT ── */}
        <section id="select" className="scroll-mt-10">
          <SectionTitle>Select</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <Label>Time Period</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select period..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sep-2025">September 2025</SelectItem>
                  <SelectItem value="dec-2025">December 2025</SelectItem>
                  <SelectItem value="jan-2026">January 2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select role..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="marketing">Marketing Manager</SelectItem>
                  <SelectItem value="sales">Sales Director</SelectItem>
                  <SelectItem value="owner">Business Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* ── SEPARATOR ── */}
        <section id="separator" className="scroll-mt-10">
          <SectionTitle>Separator</SectionTitle>
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-sm">Section above</p>
              <Separator />
              <p className="text-sm">Section below</p>
            </div>
            <div className="flex items-center h-8 gap-4">
              <span className="text-sm">Left</span>
              <Separator orientation="vertical" />
              <span className="text-sm">Center</span>
              <Separator orientation="vertical" />
              <span className="text-sm">Right</span>
            </div>
          </div>
        </section>

        {/* ── SKELETON ── */}
        <section id="skeleton" className="scroll-mt-10">
          <SectionTitle>Skeleton</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48 mt-1" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-3 w-4/6" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Footer */}
        <div className="pb-4">
          <Separator className="mb-6" />
          <p className="text-center text-xs text-muted-foreground">
            PC Merchandise DSS · UI Component Library · <code className="bg-muted px-1.5 py-0.5 rounded">@/components/ui</code>
          </p>
        </div>

      </main>
    </div>
  )
}
