import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface PaymentConfirmedEmailProps {
  name: string;
  orderNumber: string;
  amount: string;
  paymentMethod: string;
  paidAt: string;
}

export function PaymentConfirmedEmail({
  name,
  orderNumber,
  amount,
  paymentMethod,
  paidAt,
}: PaymentConfirmedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Payment of {amount} confirmed for order {orderNumber}.</Preview>
      <Body
        style={{ backgroundColor: '#EEF3FB', fontFamily: 'Arial, sans-serif', padding: '32px 0' }}
      >
        <Container
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '40px',
            maxWidth: '480px',
          }}
        >
          <Heading style={{ color: '#0F2147', fontSize: '22px', marginBottom: '8px' }}>
            O Lux Laundry
          </Heading>
          <Text style={{ color: '#0A1730', fontSize: '16px', marginTop: 0 }}>Hi {name},</Text>
          <Text style={{ color: '#4B5563', fontSize: '15px', lineHeight: '22px' }}>
            We&apos;ve successfully received your payment. Your order is now confirmed and we
            can&apos;t wait to take care of your laundry!
          </Text>

          <Section
            style={{
              backgroundColor: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  ['Order number', orderNumber],
                  ['Amount paid', amount],
                  ['Payment method', paymentMethod],
                  ['Date', paidAt],
                ].map(([label, value]) => (
                  <tr key={label}>
                    <td
                      style={{
                        color: '#6B7280',
                        fontSize: '13px',
                        paddingBottom: '8px',
                        width: '45%',
                      }}
                    >
                      {label}
                    </td>
                    <td
                      style={{
                        color: '#15803D',
                        fontSize: '13px',
                        fontWeight: 600,
                        paddingBottom: '8px',
                      }}
                    >
                      {value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Text style={{ color: '#4B5563', fontSize: '14px', lineHeight: '22px' }}>
            You&apos;ll receive further updates as your order moves through our process. Thank you
            for choosing O Lux Laundry!
          </Text>

          <Text style={{ color: '#9CA3AF', fontSize: '12px', marginTop: '32px' }}>
            O Lux Laundry · Premium Laundry Pickup &amp; Delivery
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default PaymentConfirmedEmail;
