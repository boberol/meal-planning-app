/**
 * Turns technical errors from Supabase into sentences a person can act on.
 */

type ErrorLike = { message?: string; code?: string } | null | undefined;

const KNOWN: { match: RegExp; message: string }[] = [
  { match: /invalid login credentials/i, message: 'That email and password don’t match. Check them and try again.' },
  { match: /user already registered/i, message: 'There’s already an account with this email. Try signing in instead.' },
  { match: /email not confirmed/i, message: 'Confirm your email first. We sent you a link when you signed up.' },
  { match: /password should be at least/i, message: 'Use a password with at least 6 characters.' },
  { match: /unable to validate email|invalid email/i, message: 'That doesn’t look like an email address.' },
  { match: /rate limit/i, message: 'Too many tries in a short time. Wait a minute and try again.' },
  { match: /network request failed|fetch failed/i, message: 'No connection. Check your internet and try again.' },
  // Messages raised by our own database functions (see the migration).
  { match: /invite code not found/i, message: 'That code doesn’t work. It may be mistyped or more than 7 days old.' },
  { match: /already in a household/i, message: 'You’re already in a household. Leave it first to join another.' },
  { match: /only the owner/i, message: 'Only the household owner can do that.' },
];

export function friendlyError(error: ErrorLike | unknown): string {
  const message = (error as ErrorLike)?.message ?? String(error ?? '');
  for (const known of KNOWN) {
    if (known.match.test(message)) return known.message;
  }
  return message || 'Something went wrong. Try again.';
}
