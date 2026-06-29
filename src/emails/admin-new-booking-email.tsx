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

interface AdminNewBookingEmailProps {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  serviceName: string;
  pickupDate: string;
  pickupTimeSlot: string;
  total: string;
  itemCount: number;
}

export function AdminNewBookingEmail({
  orderNumber,
  customerName,
  customerEmail,
  serviceName,
  pickupDate,
  pickupTimeSlot,
  total,
  itemCount,
}: AdminNewBookingEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>New booking {orderNumber} from {customerName}</Preview>
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
          <Heading style={{ color: '#0F2147', fontSize: '22px', marginBottom: '4px' }}>
            O Lux Laundry · Admin
          </Heading>
          <Text style={{ color: '#1D3E80', fontSize: '16px', fontWeight: 700, marginTop: 0 }}>
            New booking received
          </Text>

          <Section
            style={{
              backgroundColor: '#EEF3FB',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '16px',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  ['Order number', orderNumber],
                  ['Customer', customerName],
                  ['Email', customerEmail],
                  ['Service', serviceName],
                  ['Items', `${itemCount} item${itemCount !== 1 ? 's' : ''}`],
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

          <Text style={{ color: '#4B5563', fontSize: '14px' }}>
            Log in to the admin dashboard to confirm this order and assign a pickup rider.
          </Text>

          <Text style={{ color: '#9CA3AF', fontSize: '12px', marginTop: '24px' }}>
            O Lux Laundry Admin Notifications
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default AdminNewBookingEmail;
