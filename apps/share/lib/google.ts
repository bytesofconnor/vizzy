import { OAuth2Client } from 'google-auth-library';

export function googleClientId(): string | undefined {
  const id = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  return id || undefined;
}

export async function verifyGoogleCredential(
  credential: string,
): Promise<{ sub: string; email: string } | null> {
  const clientId = googleClientId();
  if (!clientId) {
    return null;
  }
  const client = new OAuth2Client(clientId);
  const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email || payload.email_verified !== true) {
    return null;
  }
  return { sub: payload.sub, email: payload.email };
}
