/**
 * The login page is a bespoke, art-directed dark hero (custom red glows,
 * hardcoded hex) that isn't designed to be re-themed. Pin it to dark
 * regardless of the user's stored theme preference.
 */
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <div className="dark bg-background min-h-dvh">{children}</div>
}
