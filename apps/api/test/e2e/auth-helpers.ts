import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

export const WEB_ORIGIN = 'http://localhost:3000';

/** Signs in through Better Auth and returns the bearer token (`set-auth-token`). */
export async function signIn(
  app: INestApplication,
  credentials: { email: string; password: string },
): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/api/auth/sign-in/email')
    .set('Origin', WEB_ORIGIN)
    .send(credentials)
    .expect(200);
  const token = response.headers['set-auth-token'];
  if (!token) {
    throw new Error(`sign-in returned no set-auth-token header: ${JSON.stringify(response.body)}`);
  }
  return token;
}

interface MailpitMessage {
  ID: string;
  Subject: string;
  To: Array<{ Address: string }>;
}

function mailpitUrl(): string {
  const url = process.env.E2E_MAILPIT_URL;
  if (!url) throw new Error('E2E_MAILPIT_URL is not set (global-setup did not run?)');
  return url;
}

/**
 * Waits for the newest email to `to` whose subject matches, and returns its
 * plain-text body. Mail is sent asynchronously after the HTTP response.
 */
export async function waitForEmail(
  to: string,
  subject: RegExp,
  { timeoutMs = 10_000 } = {},
): Promise<{ subject: string; text: string }> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const search = await fetch(
      `${mailpitUrl()}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`,
    );
    const { messages = [] } = (await search.json()) as { messages?: MailpitMessage[] };
    const match = messages.find((m) => subject.test(m.Subject));
    if (match) {
      const message = (await (
        await fetch(`${mailpitUrl()}/api/v1/message/${match.ID}`)
      ).json()) as {
        Text: string;
      };
      return { subject: match.Subject, text: message.Text };
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`No email matching ${subject} for ${to} within ${timeoutMs}ms`);
}

/** Extracts `token` from the first web link in an email body. */
export function tokenFromEmail(text: string, path: string): string {
  const match = text.match(new RegExp(`${path.replace(/\//g, '\\/')}\\?token=([^\\s\\])]+)`));
  if (!match) throw new Error(`No ${path}?token= link in email:\n${text}`);
  return decodeURIComponent(match[1]);
}
