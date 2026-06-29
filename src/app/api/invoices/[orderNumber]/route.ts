import { renderToBuffer } from '@react-pdf/renderer';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

import { InvoiceDocument } from '@/components/invoice/invoice-document';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderNumber: string }> },
) {
  const { orderNumber } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const customer = await prisma.customer.findUnique({ where: { userId: session.user.id } });
  const order = customer
    ? await prisma.order.findFirst({
        where: { orderNumber, customerId: customer.id },
        include: { items: true, invoice: true, customer: { include: { user: true } } },
      })
    : null;

  if (!order || !order.invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  const buffer = await renderToBuffer(
    InvoiceDocument({
      invoiceNumber: order.invoice.invoiceNumber,
      issuedAt: order.invoice.issuedAt.toDateString(),
      status: order.invoice.status,
      orderNumber: order.orderNumber,
      customerName: order.customer.user.name,
      customerEmail: order.customer.user.email,
      items: order.items.map((item) => ({
        name: item.itemName,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.lineTotal),
      })),
      subtotal: Number(order.subtotal),
      deliveryFee: Number(order.deliveryFee),
      total: Number(order.total),
      amountPaid: Number(order.invoice.amountPaid),
    }),
  );

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${order.orderNumber}.pdf"`,
    },
  });
}
