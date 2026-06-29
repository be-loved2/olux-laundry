import { render } from '@react-email/render';
import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const fromAddress = process.env.EMAIL_FROM ?? 'O Lux Laundry <no-reply@oluxlaundry.com>';

const resend = resendApiKey ? new Resend(resendApiKey) : null;

interface SendEmailOptions {
  to: string;
  subject: string;
  react: React.ReactElement;
}

interface SendEmailResult {
  mocked: boolean;
  id?: string;
}

/**
 * Sends an email via Resend when RESEND_API_KEY is configured.
 *
 * Without a key (e.g. local development, or until the project owner supplies
 * real credentials), this logs the rendered email to the console instead of
 * failing — so registration, password reset, etc. keep working end to end
 * during development. Swap in a real key in `.env` and nothing else changes.
 */
export async function sendEmail({
  to,
  subject,
  react,
}: SendEmailOptions): Promise<SendEmailResult> {
  const html = await render(react);

  if (!resend) {
    console.log(
      `\n[mailer:dev-mock] No RESEND_API_KEY set — logging email instead of sending.\n` +
        `  To: ${to}\n  Subject: ${subject}\n  ---\n${await render(react, { plainText: true })}\n  ---\n`,
    );
    return { mocked: true };
  }

  const { data, error } = await resend.emails.send({
    from: fromAddress,
    to,
    subject,
    html,
  });

  if (error) {
    throw new Error(`Failed to send email via Resend: ${error.message}`);
  }

  return { mocked: false, id: data?.id };
}
