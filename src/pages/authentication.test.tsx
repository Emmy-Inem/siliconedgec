import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SignUp from './SignUp';
import SignIn from './SignIn';
import { safeAuthRedirect } from '@/lib/auth-redirect';

const mocks = vi.hoisted(() => ({ signup: vi.fn(), signin: vi.fn(), oauth: vi.fn(), invoke: vi.fn(), toast: vi.fn(), resend: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { signUp: mocks.signup, signInWithPassword: mocks.signin, resend: mocks.resend }, functions: { invoke: mocks.invoke } } }));
vi.mock('@/integrations/lovable', () => ({ lovable: { auth: { signInWithOAuth: mocks.oauth } } }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/lib/journey-tracking', () => ({ trackJourney: vi.fn() }));
vi.mock('@/lib/user-activity', () => ({ logUserActivity: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/components/Header', () => ({ Header: () => null }));
vi.mock('@/components/Footer', () => ({ Footer: () => null }));
vi.mock('@/components/SEO', () => ({ SEO: () => null }));
beforeEach(() => { vi.clearAllMocks(); sessionStorage.clear(); mocks.invoke.mockResolvedValue({ data: {}, error: null }); });
afterEach(cleanup);
function setup(signup = true, destination = '/cart') {
  render(<MemoryRouter initialEntries={[`/${signup ? 'sign-up' : 'sign-in'}?redirect=${encodeURIComponent(destination)}`]}>{signup ? <SignUp /> : <SignIn />}</MemoryRouter>);
  if (signup) fireEvent.change(screen.getByPlaceholderText('John Doe'), { target: { value: ' Test Learner ' } });
  fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: ' learner@example.test ' } });
  fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'Testing123' } });
  const form = document.querySelector('form');
  if (!form) throw new Error('Missing auth form');
  return form;
}
describe('Authentication reliability', () => {
  it('normalizes signup fields and requires confirmation when no session is returned', async () => {
    mocks.signup.mockResolvedValue({ data: { user: { id: 'test' }, session: null }, error: null });
    fireEvent.submit(setup());
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ description: 'Check your email to confirm your account.' })));
    expect(mocks.signup).toHaveBeenCalledWith({ email: 'learner@example.test', password: 'Testing123', options: { data: { full_name: 'Test Learner' }, emailRedirectTo: window.location.origin } });
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it('recovers the signup button after a network failure', async () => {
    mocks.signup.mockRejectedValue(new Error('Offline'));
    fireEvent.submit(setup());
    await waitFor(() => expect(screen.getByRole('button', { name: /Create Account/ })).toBeEnabled());
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
  });
  it('does not submit invalid signup passwords', () => {
    const form = setup(); fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'short' } });
    fireEvent.submit(form); expect(mocks.signup).not.toHaveBeenCalled();
  });
  it.each(['google', 'apple'])('uses a public same-origin %s callback and remembers the destination', async provider => {
    mocks.oauth.mockResolvedValue({ error: null }); setup();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(provider, 'i') }));
    await waitFor(() => expect(mocks.oauth).toHaveBeenCalledWith(provider, { redirect_uri: window.location.origin }));
    expect(sessionStorage.getItem('sec_post_auth_redirect')).toBe('/cart');
    expect(mocks.resend).not.toHaveBeenCalled();
  });
  it('submits normalized login credentials', async () => {
    mocks.signin.mockResolvedValue({ error: null }); fireEvent.submit(setup(false));
    await waitFor(() => expect(mocks.signin).toHaveBeenCalledWith({ email: 'learner@example.test', password: 'Testing123' }));
  });
  it('recovers the sign-in button after a network failure', async () => {
    mocks.signin.mockRejectedValue(new Error('Offline')); fireEvent.submit(setup(false));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' })));
    expect(screen.getByRole('button', { name: /^Sign In/ })).toBeEnabled();
  });
  it('resends manual email confirmation without granting access', async () => {
    mocks.signin.mockResolvedValue({ error: { message: 'Email not confirmed' } }); mocks.resend.mockResolvedValue({ error: null });
    fireEvent.submit(setup(false));
    await waitFor(() => expect(mocks.resend).toHaveBeenCalledWith({ type: 'signup', email: 'learner@example.test', options: { emailRedirectTo: window.location.origin } }));
  });
  it.each(['https://evil.test', '//evil.test', '/\\evil.test', '/\n/evil.test'])('rejects unsafe redirect %s', value => {
    expect(safeAuthRedirect(value)).toBe('/');
  });
  it('preserves safe checkout destinations', () => {
    expect(safeAuthRedirect('/cart?course=123')).toBe('/cart?course=123');
  });
});