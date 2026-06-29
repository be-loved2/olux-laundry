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

interface OrderStatusEmailProps {
  name: string;
  orderNumber: string;
  statusLabel: string;
  statusMessage: string;
  note?: string;
}

export function OrderStatusEmail({
  name,
  orderNumber,
  statusLabel,
  statusMessage,
  note,
}: OrderStatusEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        Order {orderNumber} update: {statusLabel}
      </Preview>
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

          <Section
            style={{
              backgroundColor: '#1D3E80',
              borderRadius: '12px',
              padding: '20px 24px',
              marginBottom: '24px',
            }}
          >
            <Text
              style={{ color: '#D7E3F5', fontSize: '12px', margin: '0 0 4px', fontWeight: 600 }}
            >
              ORDER {orderNumber}
            </Text>
            <Text style={{ color: '#FFFFFF', fontSize: '20px', fontWeight: 700, margin: 0 }}>
              {statusLabel}
            </Text>
          </Section>

          <Text style={{ color: '#4B5563', fontSize: '15px', lineHeight: '22px' }}>
            {statusMessage}
          </Text>

          {note && (
            <Section
              style={{
                borderLeft: '3px solid #7FA3DC',
                paddingLeft: '16px',
                marginTop: '16px',
              }}
            >
              <Text style={{ color: '#6B7280', fontSize: '14px', margin: 0, fontStyle: 'italic' }}>
                Note: {note}
              </Text>
            </Section>
          )}

          <Text
            style={{
              color: '#9CA3AF',
              fontSize: '12px',
              marginTop: '32px',
              borderTop: '1px solid #E5E7EB',
              paddingTop: '16px',
            }}
          >
            O Lux Laundry · Premium Laundry Pickup &amp; Delivery
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default OrderStatusEmail;
