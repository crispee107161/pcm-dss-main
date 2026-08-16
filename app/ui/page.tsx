'use client'

import { useState } from 'react'
import { LineChart, Line, CartesianGrid, XAxis, YAxis } from 'recharts'
import { toast } from 'sonner'
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import DateRangeFilter from '@/components/ui/DateRangeFilter'
import {
  Attachment, AttachmentMedia, AttachmentContent, AttachmentTitle,
  AttachmentDescription, AttachmentActions, AttachmentAction, AttachmentGroup,
} from '@/components/ui/attachment'
import { Spinner } from '@/components/ui/spinner'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Toaster } from '@/components/ui/sonner'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Slider } from '@/components/ui/slider'
import StatStrip from '@/components/ui/StatStrip'
import {
  Field, FieldLabel, FieldDescription, FieldGroup, FieldSet, FieldLegend,
} from '@/components/ui/field'

const COMPONENTS = [
  { id: 'button',    label: 'Button' },
  { id: 'badge',     label: 'Badge' },
  { id: 'card',      label: 'Card' },
  { id: 'input',     label: 'Input' },
  { id: 'textarea',  label: 'Textarea' },
  { id: 'field',     label: 'Field' },
  { id: 'checkbox',  label: 'Checkbox' },
  { id: 'switch',    label: 'Switch' },
  { id: 'slider',    label: 'Slider' },
  { id: 'alert',     label: 'Alert' },
  { id: 'table',     label: 'Table' },
  { id: 'dialog',    label: 'Dialog' },
  { id: 'dropdown',  label: 'Dropdown Menu' },
  { id: 'select',    label: 'Select' },
  { id: 'tabs',      label: 'Tabs' },
  { id: 'separator', label: 'Separator' },
  { id: 'skeleton',  label: 'Skeleton' },
  { id: 'spinner',   label: 'Spinner' },
  { id: 'progress',  label: 'Progress' },
  { id: 'tooltip',   label: 'Tooltip' },
  { id: 'avatar',    label: 'Avatar' },
  { id: 'attachment', label: 'Attachment' },
  { id: 'collapsible', label: 'Collapsible' },
  { id: 'scroll-area', label: 'Scroll Area' },
  { id: 'date-range', label: 'Date Range Filter' },
  { id: 'stat-strip', label: 'Stat Strip' },
  { id: 'chart',     label: 'Chart' },
  { id: 'sonner',    label: 'Sonner (Toast)' },
]

/* Bordered group card with title + description */
function DemoCard({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-muted/30">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="px-5 py-5 flex flex-wrap items-center gap-3">
        {children}
      </div>
    </div>
  )
}

function PanelHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </div>
  )
}

/* ────────────────────────────────────────────────────────── */
/* PANELS                                                     */
/* ────────────────────────────────────────────────────────── */

function ButtonPanel() {
  return (
    <>
      <PanelHeader title="Button" description="Interactive button components for actions and navigation." />
      <div className="space-y-4">
        <DemoCard title="Variants" description="Different visual styles for different purposes.">
          <Button variant="default">Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
        </DemoCard>
        <DemoCard title="Sizes" description="Available size options.">
          <Button size="xs">Extra Small</Button>
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
        </DemoCard>
        <DemoCard title="Icon Buttons" description="Square buttons for icon-only actions.">
          <Button size="icon-xs" variant="outline" aria-label="Add item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 4v16m8-8H4" /></svg>
          </Button>
          <Button size="icon-sm" variant="outline" aria-label="Add item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 4v16m8-8H4" /></svg>
          </Button>
          <Button size="icon" variant="outline" aria-label="Add item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 4v16m8-8H4" /></svg>
          </Button>
          <Button size="icon-lg" variant="outline" aria-label="Add item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 4v16m8-8H4" /></svg>
          </Button>
          <Button size="icon" variant="default" aria-label="Add item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 4v16m8-8H4" /></svg>
          </Button>
          <Button size="icon" variant="destructive" aria-label="Delete item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
          </Button>
        </DemoCard>
        <DemoCard title="Disabled State" description="Buttons that cannot be interacted with.">
          <Button disabled>Default</Button>
          <Button variant="secondary" disabled>Secondary</Button>
          <Button variant="outline" disabled>Outline</Button>
          <Button variant="destructive" disabled>Destructive</Button>
        </DemoCard>
      </div>
    </>
  )
}

function BadgePanel() {
  return (
    <>
      <PanelHeader title="Badge" description="Small status indicators and labels." />
      <div className="space-y-4">
        <DemoCard title="Variants" description="Visual styles for different contexts.">
          <Badge variant="default">Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </DemoCard>
        <DemoCard title="In Context" description="How badges appear in real use cases.">
          <Badge variant="default">Marketing Manager</Badge>
          <Badge variant="secondary">Marketing Team Member</Badge>
          <Badge variant="outline">Business Owner</Badge>
          <Badge variant="destructive">Error</Badge>
        </DemoCard>
        <DemoCard title="Alongside other elements" description="Badges used with text and cards.">
          <div className="flex items-center gap-2 w-full">
            <span className="text-sm font-medium">Summer Promo Campaign</span>
            <Badge>Active</Badge>
          </div>
          <div className="flex items-center gap-2 w-full">
            <span className="text-sm font-medium">New Arrivals — Laptops</span>
            <Badge variant="secondary">Ended</Badge>
          </div>
          <div className="flex items-center gap-2 w-full">
            <span className="text-sm font-medium">Draft: Q2 Promo</span>
            <Badge variant="outline">Draft</Badge>
          </div>
        </DemoCard>
      </div>
    </>
  )
}

function CardPanel() {
  return (
    <>
      <PanelHeader title="Card" description="Surface containers for grouped content and information." />
      <div className="space-y-4">
        <DemoCard title="Basic Card" description="Standard card with header and content.">
          <Card className="w-72">
            <CardHeader>
              <CardTitle>Campaign Summary</CardTitle>
              <CardDescription>September 2025 performance</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Use CardContent for the main body area of your card.</p>
            </CardContent>
          </Card>
        </DemoCard>
        <DemoCard title="Card with Footer" description="Card variant with action buttons in the footer.">
          <Card className="w-72">
            <CardHeader>
              <CardTitle>Edit Campaign</CardTitle>
              <CardDescription>Make changes and save below</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Main content area.</p>
            </CardContent>
            <CardFooter className="gap-2">
              <Button size="sm">Save</Button>
              <Button size="sm" variant="outline">Cancel</Button>
            </CardFooter>
          </Card>
        </DemoCard>
        <DemoCard title="KPI Card (size sm)" description="Compact card for dashboard metrics.">
          <Card size="sm" className="w-56">
            <CardHeader>
              <CardTitle>Total Ad Spend</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">₱128,400</p>
              <p className="text-xs text-muted-foreground mt-1">September 2025</p>
            </CardContent>
          </Card>
          <Card size="sm" className="w-56">
            <CardHeader>
              <CardTitle>Total Messaging Conversations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">168</p>
              <p className="text-xs text-muted-foreground mt-1">Across all campaigns</p>
            </CardContent>
          </Card>
        </DemoCard>
      </div>
    </>
  )
}

function InputPanel() {
  return (
    <>
      <PanelHeader title="Input" description="Text inputs, selects, and form controls." />
      <div className="space-y-4">
        <DemoCard title="Text Inputs" description="Standard text field variants.">
          <div className="w-full grid grid-cols-2 gap-4">
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
              <Label htmlFor="amount">Amount (PHP)</Label>
              <Input id="amount" type="number" placeholder="0.00" />
            </div>
          </div>
        </DemoCard>
        <DemoCard title="Specialised Inputs" description="Date, file, and disabled states.">
          <div className="w-full grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="file">File upload</Label>
              <Input id="file" type="file" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="disabled">Disabled</Label>
              <Input id="disabled" placeholder="Cannot edit" disabled />
            </div>
          </div>
        </DemoCard>
      </div>
    </>
  )
}

function AlertPanel() {
  return (
    <>
      <PanelHeader title="Alert" description="Feedback banners for status messages and errors." />
      <div className="space-y-4">
        <DemoCard title="Default" description="Informational alert for general messages.">
          <div className="w-full">
            <Alert>
              <AlertTitle>Data synced</AlertTitle>
              <AlertDescription>Your data was last synced 2 minutes ago.</AlertDescription>
            </Alert>
          </div>
        </DemoCard>
        <DemoCard title="Destructive" description="Error or warning alert.">
          <div className="w-full">
            <Alert variant="destructive">
              <AlertTitle>Upload failed</AlertTitle>
              <AlertDescription>Failed to upload file. Please check the format and try again.</AlertDescription>
            </Alert>
          </div>
        </DemoCard>
      </div>
    </>
  )
}

function TablePanel() {
  return (
    <>
      <PanelHeader title="Table" description="Structured data display for lists and reports." />
      <div className="space-y-4">
        <DemoCard title="Campaign Table" description="Standard data table with badges and formatted values.">
          <div className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ad Name</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Spend (PHP)</TableHead>
                  <TableHead className="text-right">Messaging Conversations</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { name: 'Summer Promo Campaign',  period: 'Sep 2025', spend: '₱12,400', messagingConversations: 42, status: 'Active' },
                  { name: 'New Arrivals — Laptops', period: 'Dec 2025', spend: '₱8,200',  messagingConversations: 28, status: 'Ended'  },
                  { name: 'Promo: Year-End Deals',  period: 'Jan 2026', spend: '₱15,000', messagingConversations: 63, status: 'Active' },
                  { name: 'Back-to-School Bundle',  period: 'Aug 2025', spend: '₱9,750',  messagingConversations: 35, status: 'Ended'  },
                ].map((row) => (
                  <TableRow key={row.name}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-muted-foreground">{row.period}</TableCell>
                    <TableCell className="text-right">{row.spend}</TableCell>
                    <TableCell className="text-right text-primary font-semibold">{row.messagingConversations}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={row.status === 'Active' ? 'default' : 'secondary'}>
                        {row.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DemoCard>
      </div>
    </>
  )
}

function DialogPanel() {
  return (
    <>
      <PanelHeader title="Dialog" description="Modal overlays for confirmations and form interactions." />
      <div className="space-y-4">
        <DemoCard title="Confirmation Dialog" description="Simple confirm / cancel pattern.">
          <Dialog>
            <DialogTrigger render={<Button />}>Open Dialog</DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Action</DialogTitle>
                <DialogDescription>Are you sure you want to proceed? This action cannot be undone.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline">Cancel</Button>
                <Button>Confirm</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </DemoCard>
        <DemoCard title="Destructive Dialog" description="For irreversible destructive actions.">
          <Dialog>
            <DialogTrigger render={<Button variant="destructive" />}>Delete Item</DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Campaign</DialogTitle>
                <DialogDescription>This will permanently delete the campaign and all associated data.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline">Cancel</Button>
                <Button variant="destructive">Delete</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </DemoCard>
        <DemoCard title="Form Dialog" description="Dialog containing input fields.">
          <Dialog>
            <DialogTrigger render={<Button variant="outline" />}>Edit Campaign</DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Campaign</DialogTitle>
                <DialogDescription>Make changes to your campaign below.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="d-name">Campaign Name</Label>
                  <Input id="d-name" placeholder="Summer Promo..." />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="d-budget">Budget (PHP)</Label>
                  <Input id="d-budget" type="number" placeholder="0.00" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline">Cancel</Button>
                <Button>Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </DemoCard>
      </div>
    </>
  )
}

function DropdownPanel() {
  return (
    <>
      <PanelHeader title="Dropdown Menu" description="Context menus and action lists triggered from a button." />
      <div className="space-y-4">
        <DemoCard title="Standard Menu" description="Basic dropdown with grouped actions.">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" />}>Open Menu</DropdownMenuTrigger>
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
        </DemoCard>
        <DemoCard title="User Account Menu" description="Account management dropdown pattern.">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="default" />}>My Account</DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>crispee107161</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">Sign Out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </DemoCard>
        <DemoCard title="Icon Trigger" description="Kebab-menu (⋮) pattern for row actions.">
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
        </DemoCard>
      </div>
    </>
  )
}

function SelectPanel() {
  return (
    <>
      <PanelHeader title="Select" description="Dropdown selects for choosing from a list of options." />
      <div className="space-y-4">
        <DemoCard title="Select Inputs" description="Various select use cases.">
          <div className="w-full grid grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label>Time Period</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select period..." /></SelectTrigger>
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
                <SelectTrigger><SelectValue placeholder="Select role..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="marketing">Marketing Manager</SelectItem>
                  <SelectItem value="team">Marketing Team Member</SelectItem>
                  <SelectItem value="owner">Business Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status filter</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="ended">Ended</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DemoCard>
      </div>
    </>
  )
}

function SeparatorPanel() {
  return (
    <>
      <PanelHeader title="Separator" description="Visual dividers for grouping related content." />
      <div className="space-y-4">
        <DemoCard title="Horizontal" description="Default orientation — divides sections top to bottom.">
          <div className="w-full space-y-3">
            <p className="text-sm font-medium">Section above</p>
            <Separator />
            <p className="text-sm text-muted-foreground">Section below</p>
          </div>
        </DemoCard>
        <DemoCard title="Vertical" description="Divides content side by side.">
          <div className="flex items-center h-8 gap-4">
            <span className="text-sm">Left</span>
            <Separator orientation="vertical" />
            <span className="text-sm">Center</span>
            <Separator orientation="vertical" />
            <span className="text-sm">Right</span>
          </div>
        </DemoCard>
      </div>
    </>
  )
}

function SkeletonPanel() {
  return (
    <>
      <PanelHeader title="Skeleton" description="Loading placeholders while content is being fetched." />
      <div className="space-y-4">
        <DemoCard title="Card Skeleton" description="Mimics a card with title, description, and body text.">
          <Card className="w-72">
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
        </DemoCard>
        <DemoCard title="Avatar + Text" description="Profile or user row loading state.">
          <div className="flex items-center gap-4">
            <Skeleton className="w-12 h-12 rounded-full shrink-0" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        </DemoCard>
        <DemoCard title="KPI Card" description="Dashboard metric loading state.">
          <Card className="w-56">
            <CardHeader><Skeleton className="h-4 w-20" /></CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-1" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        </DemoCard>
      </div>
    </>
  )
}

function TextareaPanel() {
  return (
    <>
      <PanelHeader title="Textarea" description="Multi-line text input for longer form content." />
      <div className="space-y-4">
        <DemoCard title="Default" description="Auto-sizes to its content.">
          <div className="w-full space-y-1.5">
            <Label htmlFor="notes">Campaign notes</Label>
            <Textarea id="notes" placeholder="Add any notes about this campaign..." />
          </div>
        </DemoCard>
        <DemoCard title="Disabled" description="Non-editable state.">
          <div className="w-full space-y-1.5">
            <Label htmlFor="notes-disabled">Notes</Label>
            <Textarea id="notes-disabled" defaultValue="Locked after campaign approval." disabled />
          </div>
        </DemoCard>
      </div>
    </>
  )
}

function FieldPanel() {
  return (
    <>
      <PanelHeader title="Field" description="Structured wrapper for label, control, and description in forms." />
      <div className="space-y-4">
        <DemoCard title="Vertical Field" description="Default stacked orientation.">
          <FieldGroup className="w-full">
            <Field>
              <FieldLabel htmlFor="f-name">Campaign name</FieldLabel>
              <Input id="f-name" placeholder="Summer Promo Campaign" />
              <FieldDescription>Shown to teammates in the campaign list.</FieldDescription>
            </Field>
          </FieldGroup>
        </DemoCard>
        <DemoCard title="Field Set" description="Groups related fields under a legend.">
          <FieldSet className="w-full">
            <FieldLegend>Budget settings</FieldLegend>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="f-budget">Monthly budget (PHP)</FieldLabel>
                <Input id="f-budget" type="number" placeholder="0.00" />
              </Field>
            </FieldGroup>
          </FieldSet>
        </DemoCard>
      </div>
    </>
  )
}

function CheckboxPanel() {
  return (
    <>
      <PanelHeader title="Checkbox" description="Binary selection control for lists and forms." />
      <div className="space-y-4">
        <DemoCard title="States" description="Unchecked, checked, and disabled.">
          <div className="flex items-center gap-2">
            <Checkbox id="c-1" />
            <Label htmlFor="c-1">Include archived ads</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="c-2" defaultChecked />
            <Label htmlFor="c-2">Send weekly summary</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="c-3" disabled />
            <Label htmlFor="c-3">Locked setting</Label>
          </div>
        </DemoCard>
      </div>
    </>
  )
}

function SwitchPanel() {
  return (
    <>
      <PanelHeader title="Switch" description="Toggle control for on/off settings." />
      <div className="space-y-4">
        <DemoCard title="States" description="Default and small sizes, checked and unchecked.">
          <div className="flex items-center gap-2">
            <Switch id="s-1" />
            <Label htmlFor="s-1">Email notifications</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="s-2" defaultChecked />
            <Label htmlFor="s-2">Auto-categorize uploads</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="s-3" size="sm" defaultChecked />
            <Label htmlFor="s-3">Compact mode</Label>
          </div>
        </DemoCard>
      </div>
    </>
  )
}

function SliderPanel() {
  return (
    <>
      <PanelHeader title="Slider" description="Drag control for selecting a value within a range." />
      <div className="space-y-4">
        <DemoCard title="Default" description="Continuous range with a formatted value pill.">
          <div className="w-full max-w-xs">
            <Slider defaultValue={40} aria-label="Budget allocation" formatValue={v => `${v}%`} />
          </div>
        </DemoCard>
        <DemoCard title="With Stops" description="Tick marks at fixed increments.">
          <div className="w-full max-w-xs">
            <Slider defaultValue={60} stops={[0, 25, 50, 75, 100]} aria-label="Reallocation quartile" formatValue={v => `${v}%`} />
          </div>
        </DemoCard>
      </div>
    </>
  )
}

function TabsPanel() {
  return (
    <>
      <PanelHeader title="Tabs" description="Switches between related views within the same context." />
      <div className="space-y-4">
        <DemoCard title="Default" description="Used to switch between ranking breakdowns (see Ad Set Ranking).">
          <Tabs defaultValue="volume" className="w-full">
            <TabsList>
              <TabsTrigger value="volume">By Volume</TabsTrigger>
              <TabsTrigger value="efficiency">By Efficiency</TabsTrigger>
            </TabsList>
            <TabsContent value="volume" className="pt-3 text-sm text-muted-foreground">
              Top ad sets ranked by spend, messaging conversations, and reach.
            </TabsContent>
            <TabsContent value="efficiency" className="pt-3 text-sm text-muted-foreground">
              Top ad sets ranked by cost per click, CTR, and cost per conversation.
            </TabsContent>
          </Tabs>
        </DemoCard>
      </div>
    </>
  )
}

function SpinnerPanel() {
  return (
    <>
      <PanelHeader title="Spinner" description="Indeterminate loading indicator." />
      <div className="space-y-4">
        <DemoCard title="Sizes" description="Scales via className like any other icon.">
          <Spinner className="size-4" />
          <Spinner className="size-6" />
          <Spinner className="size-8 text-primary" />
        </DemoCard>
        <DemoCard title="Inline with Button" description="Loading state for an in-flight action.">
          <Button disabled>
            <Spinner className="size-4" />
            Saving...
          </Button>
        </DemoCard>
      </div>
    </>
  )
}

function ProgressPanel() {
  return (
    <>
      <PanelHeader title="Progress" description="Determinate progress indicator for tracked operations." />
      <div className="space-y-4">
        <DemoCard title="With Label" description="CSV upload progress pattern.">
          <div className="w-full max-w-xs">
            <Progress value={64}>
              <div className="flex justify-between">
                <ProgressLabel>Uploading Ads.csv</ProgressLabel>
                <ProgressValue />
              </div>
            </Progress>
          </div>
        </DemoCard>
        <DemoCard title="Bare Track" description="No label, for tight spaces.">
          <div className="w-full max-w-xs">
            <Progress value={30} />
          </div>
        </DemoCard>
      </div>
    </>
  )
}

function TooltipPanel() {
  return (
    <>
      <PanelHeader title="Tooltip" description="Contextual hint shown on hover or focus." />
      <div className="space-y-4">
        <DemoCard title="Default" description="Wrap a trigger in TooltipProvider for delay grouping.">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger render={<Button variant="outline" />}>Hover me</TooltipTrigger>
              <TooltipContent>Cost per messaging conversation, averaged</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </DemoCard>
      </div>
    </>
  )
}

function AvatarPanel() {
  return (
    <>
      <PanelHeader title="Avatar" description="Compact visual identity for a user or account." />
      <div className="space-y-4">
        <DemoCard title="Sizes" description="Falls back to initials when no image is set.">
          <Avatar size="sm"><AvatarFallback>JD</AvatarFallback></Avatar>
          <Avatar><AvatarFallback>JD</AvatarFallback></Avatar>
          <Avatar size="lg"><AvatarFallback>JD</AvatarFallback></Avatar>
        </DemoCard>
        <DemoCard title="Group" description="Overlapping stack with an overflow count.">
          <AvatarGroup>
            <Avatar><AvatarFallback>MM</AvatarFallback></Avatar>
            <Avatar><AvatarFallback>MT</AvatarFallback></Avatar>
            <Avatar><AvatarFallback>BO</AvatarFallback></Avatar>
            <AvatarGroupCount>+3</AvatarGroupCount>
          </AvatarGroup>
        </DemoCard>
      </div>
    </>
  )
}

function AttachmentPanel() {
  return (
    <>
      <PanelHeader title="Attachment" description="File chip used in CSV upload flows." />
      <div className="space-y-4">
        <DemoCard title="States" description="Idle, uploading, and error states.">
          <AttachmentGroup className="w-full">
            <Attachment state="done">
              <AttachmentMedia>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M9 12h6m-6 4h6M9 8h1m5 12H6a2 2 0 01-2-2V6a2 2 0 012-2h5l5 5v9a2 2 0 01-2 2z" /></svg>
              </AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle>Ads_September.csv</AttachmentTitle>
                <AttachmentDescription>1.2 MB</AttachmentDescription>
              </AttachmentContent>
              <AttachmentActions>
                <AttachmentAction aria-label="Remove Ads_September.csv">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" /></svg>
                </AttachmentAction>
              </AttachmentActions>
            </Attachment>
            <Attachment state="error">
              <AttachmentMedia>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M12 9v3.75m0 3.75h.008M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle>Posts_Malformed.csv</AttachmentTitle>
                <AttachmentDescription>Missing required column</AttachmentDescription>
              </AttachmentContent>
              <AttachmentActions>
                <AttachmentAction aria-label="Retry uploading Posts_Malformed.csv">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M4 4v5h.582M20 20v-5h-.581M5.5 8.5A7 7 0 0119 12M18.5 15.5A7 7 0 015 12" /></svg>
                </AttachmentAction>
              </AttachmentActions>
            </Attachment>
          </AttachmentGroup>
        </DemoCard>
      </div>
    </>
  )
}

function CollapsiblePanel() {
  return (
    <>
      <PanelHeader title="Collapsible" description="Expand / collapse disclosure, used by MethodologyNote." />
      <div className="space-y-4">
        <DemoCard title="Default" description="Owns its own open state.">
          <Collapsible className="w-full">
            <CollapsibleTrigger className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1.5 cursor-pointer select-none">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              See the numbers behind this
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <p className="text-[11px] text-muted-foreground">Amount spent ÷ messaging conversations, per ad. Lower is better.</p>
            </CollapsibleContent>
          </Collapsible>
        </DemoCard>
      </div>
    </>
  )
}

function ScrollAreaPanel() {
  return (
    <>
      <PanelHeader title="Scroll Area" description="Custom-styled scrollable region." />
      <div className="space-y-4">
        <DemoCard title="Vertical List" description="Fixed-height panel with a themed scrollbar.">
          <ScrollArea className="h-40 w-64 rounded-lg border border-border">
            <div className="p-3 space-y-2">
              {Array.from({ length: 12 }, (_, i) => (
                <p key={i} className="text-sm text-muted-foreground">Ad Set {i + 1} — Summer Promo</p>
              ))}
            </div>
          </ScrollArea>
        </DemoCard>
      </div>
    </>
  )
}

function DateRangePanel() {
  return (
    <>
      <PanelHeader title="Date Range Filter" description="Preset + custom date range picker used across analytics pages." />
      <div className="space-y-4">
        <DemoCard title="Default" description="Reads and writes ?from=&to= on the current URL.">
          <DateRangeFilter />
        </DemoCard>
      </div>
    </>
  )
}

function StatStripPanel() {
  return (
    <>
      <PanelHeader title="Stat Strip" description="Divided row of secondary metrics, lighter weight than a KPI card." />
      <div className="space-y-4">
        <DemoCard title="Default" description="Three metrics with a vertical divider on desktop.">
          <div className="w-full bg-card rounded-2xl card-shadow px-6">
            <StatStrip items={[
              { label: 'Avg. CTR', value: '2.4%', sub: 'vs 2.1% prior period' },
              { label: 'Avg. Cost / Click', value: '₱4.80' },
              { label: 'Total Reach', value: '182,400' },
            ]} />
          </div>
        </DemoCard>
      </div>
    </>
  )
}

const CHART_DEMO_CONFIG = {
  spend: { label: 'Spend', color: 'var(--chart-1)' },
} satisfies ChartConfig

const CHART_DEMO_DATA = [
  { day: 'Mon', spend: 4200 },
  { day: 'Tue', spend: 3100 },
  { day: 'Wed', spend: 5400 },
  { day: 'Thu', spend: 4800 },
  { day: 'Fri', spend: 6200 },
]

function ChartPanel() {
  return (
    <>
      <PanelHeader title="Chart" description="Recharts wrapper with theming, tooltips, and loading/empty/error states." />
      <div className="space-y-4">
        <DemoCard title="Default" description="Line chart with themed tooltip.">
          <ChartContainer config={CHART_DEMO_CONFIG} className="aspect-auto h-[220px] w-full" srSummary="Daily ad spend rose from ₱4,200 on Monday to a weekly high of ₱6,200 on Friday.">
            <LineChart data={CHART_DEMO_DATA} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Line dataKey="spend" type="monotone" stroke="var(--color-spend)" dot={false} strokeWidth={2} />
            </LineChart>
          </ChartContainer>
        </DemoCard>
        <DemoCard title="Loading State" description="state=&quot;loading&quot; renders a shimmer placeholder in place of the chart.">
          <ChartContainer config={CHART_DEMO_CONFIG} state="loading" className="aspect-auto h-[160px] w-full" />
        </DemoCard>
        <DemoCard title="Empty State" description="state=&quot;empty&quot; for a data source with nothing uploaded yet.">
          <ChartContainer config={CHART_DEMO_CONFIG} state="empty" className="aspect-auto h-[160px] w-full" />
        </DemoCard>
        <DemoCard title="Error State" description="state=&quot;error&quot; for a failed fetch.">
          <ChartContainer config={CHART_DEMO_CONFIG} state="error" className="aspect-auto h-[160px] w-full" />
        </DemoCard>
      </div>
    </>
  )
}

function SonnerPanel() {
  return (
    <>
      <PanelHeader title="Sonner (Toast)" description="Transient notification for background action results." />
      <div className="space-y-4">
        <DemoCard title="Variants" description="Triggers a toast in the corner of the screen.">
          <Button variant="outline" onClick={() => toast.success('Ads.csv uploaded successfully')}>Success</Button>
          <Button variant="outline" onClick={() => toast.error('Upload failed — check the file format')}>Error</Button>
          <Button variant="outline" onClick={() => toast.info('12 rows were skipped as duplicates')}>Info</Button>
          <Button variant="outline" onClick={() => toast.warning('This range has partial data')}>Warning</Button>
        </DemoCard>
      </div>
      <Toaster />
    </>
  )
}

/* ────────────────────────────────────────────────────────── */
/* MAIN PAGE                                                  */
/* ────────────────────────────────────────────────────────── */

const PANELS: Record<string, React.FC> = {
  button:      ButtonPanel,
  badge:       BadgePanel,
  card:        CardPanel,
  input:       InputPanel,
  textarea:    TextareaPanel,
  field:       FieldPanel,
  checkbox:    CheckboxPanel,
  switch:      SwitchPanel,
  slider:      SliderPanel,
  alert:       AlertPanel,
  table:       TablePanel,
  dialog:      DialogPanel,
  dropdown:    DropdownPanel,
  select:      SelectPanel,
  tabs:        TabsPanel,
  separator:   SeparatorPanel,
  skeleton:    SkeletonPanel,
  spinner:     SpinnerPanel,
  progress:    ProgressPanel,
  tooltip:     TooltipPanel,
  avatar:      AvatarPanel,
  attachment:  AttachmentPanel,
  collapsible: CollapsiblePanel,
  'scroll-area': ScrollAreaPanel,
  'date-range':  DateRangePanel,
  'stat-strip':  StatStripPanel,
  chart:       ChartPanel,
  sonner:      SonnerPanel,
}

export default function UIShowcase() {
  const [active, setActive] = useState('button')
  const ActivePanel = PANELS[active]

  return (
    <div className="min-h-screen bg-background flex">

      {/* Left Sidebar */}
      <aside className="fixed top-0 left-0 h-screen w-56 bg-card border-r border-border flex flex-col z-10">
        {/* Branding */}
        <div className="px-5 py-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <img src="/pcm-logo.png" alt="PCM" className="w-6 h-6 object-contain" />
            <div>
              <p className="text-sm font-bold leading-tight">UI Components</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-widest font-medium">PCM DSS</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] px-5 py-2">
            Component Library
          </p>
          <ul>
            {COMPONENTS.map(({ id, label }) => (
              <li key={id}>
                <button
                  onClick={() => setActive(id)}
                  className={`w-full text-left px-5 py-2 text-sm font-medium transition-colors ${
                    active === id
                      ? 'bg-primary text-primary-foreground'
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
        <div className="px-5 py-4 border-t border-border">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
            {COMPONENTS.length} components
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-56 flex-1 min-h-screen px-10 py-10">
        <div className="max-w-4xl">
          {ActivePanel && <ActivePanel />}
        </div>
      </main>

    </div>
  )
}
