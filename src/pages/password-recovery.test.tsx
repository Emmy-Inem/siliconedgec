import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ResetPassword from './ResetPassword';
import ForgotPassword from './ForgotPassword';
const mocks = vi.hoisted(() => ({ update: vi.fn(), reset: vi.fn(), toast: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { updateUser: mocks.update, resetPasswordForEmail: mocks.reset, onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }) } } }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/components/Header', () => ({ Header: () => null }));
vi.mock('@/components/Footer', () => ({ Footer: () => null }));
beforeEach(() => { vi.clearAllMocks(); window.location.hash = ''; });
afterEach(cleanup);
it('does not accept an ordinary sign-in token as a password recovery link', () => {
  window.location.hash = '#access_token=not-a-recovery-token';
  render(<MemoryRouter><ResetPassword /></MemoryRouter>);
  expect(screen.getByRole('button', { name: /Update password/ })).toBeDisabled();
});
it('handles a recovery update connection failure without sending current_password', async () => {
  window.location.hash = '#type=recovery'; mocks.update.mockRejectedValue(new Error('Offline'));
  render(<MemoryRouter><ResetPassword /></MemoryRouter>);
  fireEvent.change(screen.getByPlaceholderText('At least 8 characters'), { target: { value: 'Testing123' } });
  fireEvent.change(screen.getByPlaceholderText('Re-enter password'), { target: { value: 'Testing123' } });
  fireEvent.click(screen.getByRole('button', { name: /Update password/ }));
  await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' })));
  expect(mocks.update).toHaveBeenCalledWith({ password: 'Testing123' });
  expect(screen.getByRole('button', { name: /Update password/ })).toBeEnabled();
});
it('allows password reset email retry after a connection failure', async () => {
  mocks.reset.mockRejectedValue(new Error('Offline'));
  render(<MemoryRouter><ForgotPassword /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'learner@example.test' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
  await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' })));
  expect(screen.getByRole('button', { name: 'Send reset link' })).toBeEnabled();
});