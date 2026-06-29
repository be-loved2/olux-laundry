import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-oxblue-50 via-white to-oxblue-50">
      <header className="container py-6">
        <Link href="/" className="font-display text-lg font-bold tracking-tight text-oxblue-900">
          O Lux <span className="text-primary">Laundry</span>
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
