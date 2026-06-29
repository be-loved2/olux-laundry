import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: 'Helvetica', color: '#0A1730' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  brand: { fontSize: 20, fontWeight: 700, color: '#0F2147' },
  tagline: { fontSize: 9, color: '#6B7280', marginTop: 2 },
  invoiceMeta: { textAlign: 'right' },
  sectionTitle: { fontSize: 9, color: '#6B7280', marginBottom: 4, textTransform: 'uppercase' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    paddingBottom: 6,
    marginTop: 16,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
    paddingVertical: 8,
  },
  colItem: { flex: 3 },
  colQty: { flex: 1, textAlign: 'right' },
  colPrice: { flex: 1, textAlign: 'right' },
  colTotal: { flex: 1, textAlign: 'right' },
  totalsBlock: { marginTop: 16, alignItems: 'flex-end' },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 220,
    paddingVertical: 3,
  },
  grandTotal: { fontSize: 13, fontWeight: 700, color: '#0F2147' },
  footer: { marginTop: 40, fontSize: 9, color: '#9CA3AF', textAlign: 'center' },
  statusBadge: {
    fontSize: 10,
    fontWeight: 700,
    color: '#047857',
    marginTop: 4,
  },
});

export interface InvoiceDocumentProps {
  invoiceNumber: string;
  issuedAt: string;
  status: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  items: { name: string; quantity: number; unitPrice: number; lineTotal: number }[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  amountPaid: number;
}

function naira(amount: number) {
  return `NGN ${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
}

export function InvoiceDocument(props: InvoiceDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>O Lux Laundry</Text>
            <Text style={styles.tagline}>Premium Laundry Pickup & Delivery Service</Text>
          </View>
          <View style={styles.invoiceMeta}>
            <Text>Invoice {props.invoiceNumber}</Text>
            <Text style={styles.tagline}>Order {props.orderNumber}</Text>
            <Text style={styles.tagline}>{props.issuedAt}</Text>
            <Text style={styles.statusBadge}>{props.status}</Text>
          </View>
        </View>

        <View>
          <Text style={styles.sectionTitle}>Billed to</Text>
          <Text>{props.customerName}</Text>
          <Text>{props.customerEmail}</Text>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.colItem, styles.sectionTitle]}>Item</Text>
          <Text style={[styles.colQty, styles.sectionTitle]}>Qty</Text>
          <Text style={[styles.colPrice, styles.sectionTitle]}>Unit price</Text>
          <Text style={[styles.colTotal, styles.sectionTitle]}>Total</Text>
        </View>
        {props.items.map((item, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={styles.colItem}>{item.name}</Text>
            <Text style={styles.colQty}>{item.quantity}</Text>
            <Text style={styles.colPrice}>{naira(item.unitPrice)}</Text>
            <Text style={styles.colTotal}>{naira(item.lineTotal)}</Text>
          </View>
        ))}

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text>Subtotal</Text>
            <Text>{naira(props.subtotal)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text>Delivery fee</Text>
            <Text>{naira(props.deliveryFee)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.grandTotal}>Total</Text>
            <Text style={styles.grandTotal}>{naira(props.total)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text>Amount paid</Text>
            <Text>{naira(props.amountPaid)}</Text>
          </View>
        </View>

        <Text style={styles.footer}>Thank you for choosing O Lux Laundry.</Text>
      </Page>
    </Document>
  );
}
