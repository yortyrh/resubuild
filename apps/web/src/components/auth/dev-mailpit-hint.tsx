'use client';

import { DEV_MAILPIT_URL, isDevMailpitHintVisible } from '@/lib/dev-mailpit';

export interface DevMailpitHintProps {
  /** Short label for what to look for, e.g. "sign-in code" or "confirmation link". */
  emailKind?: string;
}

export function DevMailpitHint({ emailKind }: DevMailpitHintProps) {
  if (!isDevMailpitHintVisible()) {
    return null;
  }

  const kind = emailKind ? ` the ${emailKind}` : ' the message';

  return (
    <p
      className="bg-muted/60 text-muted-foreground border-border rounded-md border px-3 py-2 text-left text-xs"
      data-testid="dev-mailpit-hint"
    >
      <span className="text-foreground font-medium">Development:</span> auth emails are not sent to
      real inboxes. Open{' '}
      <a
        href={DEV_MAILPIT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary font-medium underline underline-offset-2"
      >
        Mailpit
      </a>{' '}
      to read{kind}.
    </p>
  );
}
