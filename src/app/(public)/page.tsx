import Link from 'next/link';

export default function HomePage() {
  return (
    <section className="container flex flex-col items-center gap-6 py-28 text-center">
      <span className="rounded-full bg-oxblue-50 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-oxblue-700">
        Premium Laundry Pickup &amp; Delivery
      </span>
      <h1 className="max-w-3xl font-display text-4xl font-bold tracking-tight text-oxblue-900 sm:text-6xl">
        Laundry day, handled.
      </h1>
      <p className="max-w-xl text-lg text-muted-foreground">
        Schedule a pickup in under a minute. We wash, dry clean, or iron — and bring it back,
        tracked every step of the way.
      </p>
      <Link
        href="/book-pickup"
        className="rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-soft-lg transition hover:bg-oxblue-700"
      >
        Book a Pickup
      </Link>
      <p className="text-xs text-muted-foreground">
        This is a placeholder hero — the full homepage (testimonials, price calculator, live stats)
        is built in the Public Website module, next in the build order.
      </p>
    </section>
  );
}
