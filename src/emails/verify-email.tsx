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

interface VerifyEmailProps {
  name: string;
  verifyUrl: string;
}

export function VerifyEmail({ name, verifyUrl }: VerifyEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Verify your email to finish setting up your O Lux Laundry account.</Preview>
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
            Thanks for signing up. Please confirm your email address to activate your account.
          </Text>
          <Button
            href={verifyUrl}
            style={{
              backgroundColor: '#1D3E80',
              color: '#FFFFFF',
              borderRadius: '999px',
              padding: '12px 28px',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            Verify email address
          </Button>
          <Text style={{ color: '#9CA3AF', fontSize: '12px', marginTop: '24px' }}>
            This link expires in 24 hours. If you didn&apos;t create this account, you can ignore
            this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default VerifyEmail;
