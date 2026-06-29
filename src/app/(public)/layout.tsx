import Link from 'next/link';

const NAV_LINKS = [
  { href: '/services', label: 'Services' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/track-order', label: 'Track Order' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-border bg-white/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="font-display text-lg font-bold tracking-tight text-oxblue-900">
            O Lux <span className="text-primary">Laundry</span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-primary"
            >
              Sign in
            </Link>
            <Link
              href="/book-pickup"
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition hover:bg-oxblue-700"
            >
              Book Pickup
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-oxblue-950 text-white">
        <div className="container grid gap-10 py-16 md:grid-cols-4">
          <div>
            <p className="font-display text-lg font-bold">O Lux Laundry</p>
            <p className="mt-2 text-sm text-white/60">
              Premium Laundry Pickup &amp; Delivery Service
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-white/80">Company</p>
            <ul className="mt-3 space-y-2 text-sm text-white/60">
              <li>
                <Link href="/about">About</Link>
              </li>
              <li>
                <Link href="/faq">FAQ</Link>
              </li>
              <li>
                <Link href="/contact">Contact</Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-white/80">Legal</p>
            <ul className="mt-3 space-y-2 text-sm text-white/60">
              <li>
                <Link href="/privacy-policy">Privacy Policy</Link>
              </li>
              <li>
                <Link href="/terms-of-service">Terms of Service</Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-white/80">Get the app</p>
            <p className="mt-3 text-sm text-white/60">Track every order in real time, anywhere.</p>
          </div>
        </div>
        <div className="border-t border-white/10 py-6 text-center text-xs text-white/40">
          © {new Date().getFullYear()} O Lux Laundry. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
