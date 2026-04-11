'use client'

import { useState } from 'react'
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

const COMPONENTS = [
  { id: 'button',    label: 'Button' },
  { id: 'badge',     label: 'Badge' },
  { id: 'card',      label: 'Card' },
  { id: 'input',     label: 'Input' },
  { id: 'alert',     label: 'Alert' },
  { id: 'table',     label: 'Table' },
  { id: 'dialog',    label: 'Dialog' },
  { id: 'dropdown',  label: 'Dropdown Menu' },
  { id: 'select',    label: 'Select' },
  { id: 'separator', label: 'Separator' },
  { id: 'skeleton',  label: 'Skeleton' },
]

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{label}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  )
}

function ComponentTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="text-2xl font-bold tracking-tight">{children}</h2>
      <div className="mt-1.5 h-0.5 w-10 bg-primary rounded-full" />
    </div>
  )
}

/* ────────────────────────────────────────────────────────── */
/* COMPONENT PANELS                                           */
/* ────────────────────────────────────────────────────────── */

function ButtonPanel() {
  return (
    <>
      <ComponentTitle>Button</ComponentTitle>
      <div className="space-y-8">
        <Group label="Variants">
          <Button variant="default">Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
        </Group>
        <Separator />
        <Group label="Sizes">
          <Button size="xs">Extra Small</Button>
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
        </Group>
        <Separator />
        <Group label="Icon buttons">
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
        </Group>
        <Separator />
        <Group label="Disabled state">
          <Button disabled>Default</Button>
          <Button variant="secondary" disabled>Secondary</Button>
          <Button variant="outline" disabled>Outline</Button>
        </Group>
      </div>
    </>
  )
}

function BadgePanel() {
  return (
    <>
      <ComponentTitle>Badge</ComponentTitle>
      <div className="space-y-8">
        <Group label="Variants">
          <Badge variant="default">Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </Group>
        <Separator />
        <Group label="Usage examples">
          <Badge variant="default">Marketing Manager</Badge>
          <Badge variant="secondary">Sales Director</Badge>
          <Badge variant="outline">Business Owner</Badge>
          <Badge variant="destructive">Error</Badge>
        </Group>
      </div>
    </>
  )
}

function CardPanel() {
  return (
    <>
      <ComponentTitle>Card</ComponentTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Basic Card</CardTitle>
            <CardDescription>Card description goes here</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Card body content. Use CardContent for the main area.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>With Footer</CardTitle>
            <CardDescription>Card with footer actions</CardDescription>
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
            <CardTitle>With Badges</CardTitle>
            <CardDescription>Cards can contain any content</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Badge>Active</Badge>
            <Badge variant="secondary">Draft</Badge>
            <Badge variant="outline">Archived</Badge>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function InputPanel() {
  return (
    <>
      <ComponentTitle>Input</ComponentTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
    </>
  )
}

function AlertPanel() {
  return (
    <>
      <ComponentTitle>Alert</ComponentTitle>
      <div className="space-y-4 max-w-2xl">
        <Alert>
          <AlertTitle>Default</AlertTitle>
          <AlertDescription>Your data was last synced 2 minutes ago.</AlertDescription>
        </Alert>
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to upload file. Please check the format and try again.</AlertDescription>
        </Alert>
      </div>
    </>
  )
}

function TablePanel() {
  return (
    <>
      <ComponentTitle>Table</ComponentTitle>
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
                { name: 'Summer Sale Campaign',    period: 'Sep 2025', spend: '₱12,400', purchases: 42, status: 'Active' },
                { name: 'New Arrivals — Laptops',  period: 'Dec 2025', spend: '₱8,200',  purchases: 28, status: 'Ended'  },
                { name: 'Promo: Year-End Deals',   period: 'Jan 2026', spend: '₱15,000', purchases: 63, status: 'Active' },
                { name: 'Back-to-School Bundle',   period: 'Aug 2025', spend: '₱9,750',  purchases: 35, status: 'Ended'  },
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
    </>
  )
}

function DialogPanel() {
  return (
    <>
      <ComponentTitle>Dialog</ComponentTitle>
      <div className="flex flex-wrap gap-3">
        <Dialog>
          <DialogTrigger render={<Button />}>
            Open Dialog
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
          <DialogTrigger render={<Button variant="destructive" />}>
            Delete Item
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

        <Dialog>
          <DialogTrigger render={<Button variant="outline" />}>
            Form Dialog
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Campaign</DialogTitle>
              <DialogDescription>Make changes to your campaign below.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="campaign-name">Campaign Name</Label>
                <Input id="campaign-name" placeholder="Summer Sale..." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="campaign-budget">Budget (PHP)</Label>
                <Input id="campaign-budget" type="number" placeholder="0.00" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline">Cancel</Button>
              <Button>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}

function DropdownPanel() {
  return (
    <>
      <ComponentTitle>Dropdown Menu</ComponentTitle>
      <div className="flex flex-wrap gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" />}>
            Open Menu
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
          <DropdownMenuTrigger render={<Button variant="default" />}>
            With Label
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">Sign Out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button size="icon" variant="ghost" />}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
            </svg>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Change Password</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">Sign Out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  )
}

function SelectPanel() {
  return (
    <>
      <ComponentTitle>Select</ComponentTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
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
        <div className="space-y-1.5">
          <Label>Status filter</Label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="ended">Ended</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  )
}

function SeparatorPanel() {
  return (
    <>
      <ComponentTitle>Separator</ComponentTitle>
      <div className="space-y-8 max-w-lg">
        <div className="space-y-3">
          <p className="text-sm font-medium">Section above</p>
          <Separator />
          <p className="text-sm text-muted-foreground">Section below — horizontal separator</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Vertical</p>
          <div className="flex items-center h-8 gap-4">
            <span className="text-sm">Left</span>
            <Separator orientation="vertical" />
            <span className="text-sm">Center</span>
            <Separator orientation="vertical" />
            <span className="text-sm">Right</span>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">In a card footer</p>
          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground">Main content</p>
            </CardContent>
            <div className="px-4 pb-4 space-y-3">
              <Separator />
              <p className="text-xs text-muted-foreground">Footer text below separator</p>
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}

function SkeletonPanel() {
  return (
    <>
      <ComponentTitle>Skeleton</ComponentTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
            <Skeleton className="w-12 h-12 rounded-full shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-40" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-24 w-full rounded-lg" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20 rounded-md" />
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-20" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-32 mb-1" />
            <Skeleton className="h-3 w-24" />
          </CardContent>
        </Card>
      </div>
    </>
  )
}

/* ────────────────────────────────────────────────────────── */
/* MAIN PAGE                                                  */
/* ────────────────────────────────────────────────────────── */

const PANELS: Record<string, React.FC> = {
  button:    ButtonPanel,
  badge:     BadgePanel,
  card:      CardPanel,
  input:     InputPanel,
  alert:     AlertPanel,
  table:     TablePanel,
  dialog:    DialogPanel,
  dropdown:  DropdownPanel,
  select:    SelectPanel,
  separator: SeparatorPanel,
  skeleton:  SkeletonPanel,
}

export default function UIShowcase() {
  const [active, setActive] = useState('button')
  const ActivePanel = PANELS[active]

  return (
    <div className="min-h-screen bg-background">

      {/* Main content — full width */}
      <main className="min-h-screen px-14 py-14 pr-60">
        {/* Page header */}
        <div className="mb-14">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">UI Components</h1>
          <p className="mt-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            PCM DSS Component Library
          </p>
          <Separator className="mt-6" />
        </div>

        {/* Active component panel */}
        {ActivePanel && <ActivePanel />}
      </main>

      {/* Floating right sidebar */}
      <aside className="fixed right-5 top-1/2 -translate-y-1/2 w-48 z-50 flex flex-col rounded-2xl border bg-card/90 backdrop-blur-md shadow-xl overflow-hidden">
        {/* Sidebar header */}
        <div className="px-4 py-4 border-b bg-card">
          <div className="flex items-center gap-2.5 mb-0.5">
            <img src="/pcm-logo.png" alt="PCM" className="w-5 h-5 object-contain shrink-0" />
            <p className="text-xs font-bold leading-none text-foreground">UI Components</p>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 uppercase tracking-widest font-medium pl-0.5">
            PCM DSS
          </p>
        </div>

        {/* Nav items */}
        <nav className="py-2 px-2 overflow-y-auto">
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.15em] px-2 pt-1 pb-2">
            Library
          </p>
          <ul className="space-y-0.5">
            {COMPONENTS.map(({ id, label }) => (
              <li key={id}>
                <button
                  onClick={() => setActive(id)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    active === id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t bg-muted/30">
          <p className="text-[9px] text-muted-foreground text-center uppercase tracking-widest">
            {COMPONENTS.length} components
          </p>
        </div>
      </aside>

    </div>
  )
}
