/** Map Supabase auth callback query errors to actionable copy. */
export function oauthCallbackErrorMessage(
  errorCode: string | null,
  errorDescription: string | null,
): string {
  const description = decodeURIComponent((errorDescription ?? '').replace(/\+/g, ' ')).trim();

  if (description.includes('PKCE code verifier not found in storage')) {
    return (
      'Sign-in could not be completed because the secure auth handshake expired. ' +
      'Return to sign in and try again in the same browser tab without clearing site data.'
    );
  }

  if (description) {
    return description;
  }

  if (errorCode) {
    return `Sign-in failed (${errorCode}).`;
  }

  return 'Sign-in failed.';
}
