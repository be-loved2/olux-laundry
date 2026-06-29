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

interface RefundProcessedEmailProps {
  name: string;
  orderNumber: string;
  amount: string;
  reason: string;
  processedAt: string;
}

export function RefundProcessedEmail({
  name,
  orderNumber,
  amount,
  reason,
  processedAt,
}: RefundProcessedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your refund of {amount} for order {orderNumber} has been processed.</Preview>
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
            Your refund has been processed. Please allow 2–5 business days for the amount to
            reflect in your original payment method.
          </Text>

          <Section
            style={{
              backgroundColor: '#FEF9C3',
              border: '1px solid #FDE047',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  ['Order number', orderNumber],
                  ['Refund amount', amount],
                  ['Reason', reason],
                  ['Processed on', processedAt],
                ].map(([label, value]) => (
                  <tr key={label}>
                    <td
                      style={{
                        color: '#6B7280',
                        fontSize: '13px',
                        paddingBottom: '8px',
                        width: '40%',
                        verticalAlign: 'top',
                      }}
                    >
                      {label}
                    </td>
                    <td
                      style={{
                        color: '#0A1730',
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
            If you have any questions about your refund, please don&apos;t hesitate to reach out.
            We&apos;re always happy to help.
          </Text>

          <Text style={{ color: '#9CA3AF', fontSize: '12px', marginTop: '32px' }}>
            O Lux Laundry · Premium Laundry Pickup &amp; Delivery
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default RefundProcessedEmail;
