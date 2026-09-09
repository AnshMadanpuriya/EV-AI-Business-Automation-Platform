import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import LoginPage from './LoginPage';
import { AuthProvider } from '../context/AuthContext';
import { accountDestination } from '../utils/accountAccess';

const mockNavigate = jest.fn();
let mockSearch = '';
beforeEach(() => { mockSearch = ''; mockNavigate.mockClear(); });
jest.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams(mockSearch)],
}));

test.each(['', 'next=/subscribe/growth_monthly'])('signup saves the session and respects explicit checkout intent: %s', async search => {
  mockSearch = search;
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
    expect(mockNavigate).toHaveBeenCalledWith(search ? '/subscribe/growth_monthly' : '/dashboard', { replace: true });
  } finally {
    await act(async () => root.unmount());
    container.remove();
    global.fetch = originalFetch;
    localStorage.clear();
  }
});

test('default destination is dashboard; external targets cannot redirect the customer', () => {
  expect(accountDestination({ role: 'user' }, '/dashboard')).toBe('/dashboard');
  expect(accountDestination({ role: 'user' }, '//example.com')).toBe('/dashboard');
  expect(accountDestination({ role: 'admin' })).toBe('/dashboard');
});

test('sign in from Get Started opens dashboard without selecting a plan', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  const originalFetch = global.fetch;
  const container = document.createElement('div');
  const root = createRoot(container);
  global.fetch = jest.fn(async url => {
    expect(url).toMatch(/\/auth\/login$/);
    return { json: async () => ({ success: true, token: 'fixture-token', user: { name: 'Customer', role: 'user' } }) };
  });
  try {
    await act(async () => root.render(<AuthProvider><LoginPage /></AuthProvider>));
    await act(async () => container.querySelectorAll('input').forEach((input, index) => Simulate.change(input, { target: { value: ['customer@example.com', 'test-password-123'][index] } })));
    await act(async () => Simulate.submit(container.querySelector('form')));
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  } finally {
    await act(async () => root.unmount());
    global.fetch = originalFetch;
    localStorage.clear();
  }
});
