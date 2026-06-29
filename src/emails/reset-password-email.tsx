import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components';

interface ResetPasswordEmailProps {
  name: string;
  resetUrl: string;
}

export function ResetPasswordEmail({ name, resetUrl }: ResetPasswordEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your O Lux Laundry password.</Preview>
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
          <Heading style={{ color: '#0F2147', fontSize: '22px' }}>O Lux Laundry</Heading>
          <Text style={{ color: '#0A1730', fontSize: '16px' }}>Hi {name},</Text>
          <Text style={{ color: '#4B5563', fontSize: '15px', lineHeight: '22px' }}>
            We received a request to reset your password. Click below to choose a new one.
          </Text>
          <Button
            href={resetUrl}
            style={{
              backgroundColor: '#1D3E80',
              color: '#FFFFFF',
              borderRadius: '999px',
              padding: '12px 28px',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            Reset password
          </Button>
          <Text style={{ color: '#9CA3AF', fontSize: '12px', marginTop: '24px' }}>
            This link expires in 1 hour. If you didn&apos;t request this, your password is still
            safe and you can ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default ResetPasswordEmail;
