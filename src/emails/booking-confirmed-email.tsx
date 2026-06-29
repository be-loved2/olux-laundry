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

interface BookingConfirmedEmailProps {
  name: string;
  orderNumber: string;
  pickupDate: string;
  pickupTimeSlot: string;
  serviceName: string;
  total: string;
}

export function BookingConfirmedEmail({
  name,
  orderNumber,
  pickupDate,
  pickupTimeSlot,
  serviceName,
  total,
}: BookingConfirmedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your O Lux Laundry order {orderNumber} has been received.</Preview>
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
            We&apos;ve received your laundry booking and it&apos;s pending confirmation from our
            team. Here&apos;s a summary:
          </Text>

          <Section
            style={{
              backgroundColor: '#EEF3FB',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  ['Order number', orderNumber],
                  ['Service', serviceName],
                  ['Pickup date', pickupDate],
                  ['Pickup time', pickupTimeSlot],
                  ['Order total', total],
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
            We&apos;ll send you another update once your order is confirmed and a pickup time is
            locked in. If you have any questions, reply to this email or contact us on WhatsApp.
          </Text>

          <Text style={{ color: '#9CA3AF', fontSize: '12px', marginTop: '32px' }}>
            O Lux Laundry · Premium Laundry Pickup &amp; Delivery
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default BookingConfirmedEmail;
