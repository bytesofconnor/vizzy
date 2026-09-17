import { Resend } from 'resend';
import { signClaim } from './claim';

export async function sendClaimLink(email: string, origin: string): Promise<{ sent: boolean; claimUrl?: string }> {
  const token = signClaim(email);
  const claimUrl = `${origin}/pay/claim?t=${encodeURIComponent(token)}`;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return { sent: false, claimUrl: process.env.NODE_ENV === 'production' ? undefined : claimUrl };
  }

  const resend = new Resend(key);
  const from = process.env.RESEND_FROM || 'vizzy <onboarding@resend.dev>';
  const { error } = await resend.emails.send(
    {
      from,
      to: [email],
      subject: 'Your vizzy charts',
      text: `This link puts your paid charts on this browser. It lasts 20 minutes.\n\n${claimUrl}\n`,
    },
    { idempotencyKey: `vizzy-claim/${email}/${Math.floor(Date.now() / 60000)}` }
  );
  if (error) {
    console.error('claim email failed', error.message);
    return { sent: false };
  }
  return { sent: true };
}
