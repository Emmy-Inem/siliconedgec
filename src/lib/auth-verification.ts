import type { User } from '@supabase/supabase-js';

/** Auth-server identities, not editable user metadata, determine signup method. */
export function needsEmailVerification(user: Pick<User, 'email_confirmed_at' | 'identities'> | null): boolean {
  if (!user || user.email_confirmed_at) return false;
  if (user.identities?.some(identity => identity.provider === 'google' || identity.provider === 'apple')) return false;
  return true;
}