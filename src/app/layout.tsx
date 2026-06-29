import type { Metadata } from 'next';
import { Inter, Manrope } from 'next/font/google';

import './globals.css';
import { Providers } from '@/components/shared/providers';

const manrope = Manrope({ subsets: ['latin'], variable: '--font-display' });
const inter = Inter({ subsets: ['latin'], variable: '--font-body' });

export const metadata: Metadata = {
  title: {
    default: 'O Lux Laundry — Premium Laundry Pickup & Delivery Service',
    template: '%s | O Lux Laundry',
  },
  description:
    'Book premium laundry pickup and delivery in minutes. Wash & fold, dry cleaning, and ironing — tracked from pickup to your door.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${inter.variable}`}>
      <body className="font-body antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
