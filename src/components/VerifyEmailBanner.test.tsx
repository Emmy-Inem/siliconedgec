import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { VerifyEmailBanner } from './VerifyEmailBanner';

const mocks = vi.hoisted(() => ({ user: null as any, resend: vi.fn(), toast: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { resend: mocks.resend } } }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
beforeEach(() => { vi.clearAllMocks(); mocks.user = { email: 'learner@example.test', email_confirmed_at: null, identities: [] }; });
afterEach(cleanup);
it.each(['google', 'apple'])('never prompts a %s identity to verify email again', provider => {
  mocks.user.identities = [{ provider }]; render(<VerifyEmailBanner />);
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(mocks.resend).not.toHaveBeenCalled();
});
it('requires confirmation for a manual signup', () => {
  mocks.user.identities = [{ provider: 'email' }]; render(<VerifyEmailBanner />);
  expect(screen.getByRole('status')).toBeInTheDocument();
});
it('does not trust an editable Google provider claim', () => {
  mocks.user.user_metadata = { provider: 'google' }; render(<VerifyEmailBanner />);
  expect(screen.getByRole('status')).toBeInTheDocument();
});
it('hides the prompt after manual confirmation', () => {
  mocks.user.email_confirmed_at = '2026-11-13T00:00:00Z'; render(<VerifyEmailBanner />);
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
it('allows retry when resend fails to connect', async () => {
  mocks.resend.mockRejectedValue(new Error('Offline')); render(<VerifyEmailBanner />);
  fireEvent.click(screen.getByRole('button', { name: 'Resend' }));
  await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' })));
  expect(screen.getByRole('button', { name: 'Resend' })).toBeEnabled();
});