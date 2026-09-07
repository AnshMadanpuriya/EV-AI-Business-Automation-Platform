import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import LoginPage from './LoginPage';
import { AuthProvider } from '../context/AuthContext';
import { accountDestination } from '../utils/accountAccess';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams('next=/subscribe/growth_monthly')],
}));

test('signup submits the phone, saves the session and continues to the selected subscription', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  const originalFetch = global.fetch;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  global.fetch = jest.fn(async (url, options) => {
    expect(url).toMatch(/\/auth\/register$/);
    const body = JSON.parse(options.body);
    expect(body.phone).toBe('+12025550123');
    expect(body.company).toBe('Test EV');
    expect(body.role).toBeUndefined();
    return { json: async () => ({ success: true, token: 'fixture-token', user: { name: body.name, role: 'user' } }) };
  });
  try {
    await act(async () => root.render(<AuthProvider><LoginPage /></AuthProvider>));
    await act(async () => [...container.querySelectorAll('button')].find(b => b.textContent.includes('Sign Up')).click());
    expect(container.textContent).not.toContain('14-day free trial');
    const values = ['Test Customer', '+12025550123', 'Test EV', 'customer@example.com', 'test-password-123'];
    await act(async () => container.querySelectorAll('input').forEach((input, index) => Simulate.change(input, { target: { value: values[index] } })));
    await act(async () => Simulate.submit(container.querySelector('form')));
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('ev_token')).toBe('fixture-token');
    expect(mockNavigate).toHaveBeenCalledWith('/subscribe/growth_monthly', { replace: true });
  } finally {
    await act(async () => root.unmount());
    container.remove();
    global.fetch = originalFetch;
    localStorage.clear();
  }
});

test('customer redirects cannot enter staff dashboard or external targets', () => {
  expect(accountDestination({ role: 'user' }, '/dashboard')).toBe('/subscribe/starter_monthly');
  expect(accountDestination({ role: 'user' }, '//example.com')).toBe('/subscribe/starter_monthly');
  expect(accountDestination({ role: 'admin' })).toBe('/dashboard');
});
