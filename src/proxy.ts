import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

const STAFF_ROLES = new Set([
  'SUPER_ADMIN',
  'MANAGER',
  'RECEPTIONIST',
  'LAUNDRY_STAFF',
  'DELIVERY_RIDER',
]);

export default withAuth(
  function proxy(req) {
    const { pathname } = req.nextUrl;
    const role = req.nextauth.token?.role as string | undefined;

    // Customers have no business in the staff/admin area. This is a fast,
    // optimistic check at the network boundary — each admin/dashboard page
    // also independently verifies the session server-side as the
    // authoritative check (see getServerSession() in those pages).
    if (pathname.startsWith('/admin') && role && !STAFF_ROLES.has(role)) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => Boolean(token),
    },
    pages: { signIn: '/login' },
  },
);

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
