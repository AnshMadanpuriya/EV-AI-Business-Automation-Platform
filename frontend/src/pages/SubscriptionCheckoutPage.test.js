import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { useParams } from 'react-router-dom';
import SubscriptionCheckoutPage from './SubscriptionCheckoutPage';
import API from '../utils/api';

jest.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
  useParams: jest.fn(),
}));
jest.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { email: 'preview@example.test' } }) }));
jest.mock('../utils/api', () => ({ get: jest.fn(), post: jest.fn() }));

const plans = [
  { code: 'growth_monthly', name: 'Growth', billingCycle: 'monthly', amountPaise: 100000, features: [], totalCount: 12 },
  { code: 'growth_annual', name: 'Growth', billingCycle: 'annual', amountPaise: 960000, features: [], totalCount: 3 },
  { code: 'enterprise_monthly', name: 'Enterprise', billingCycle: 'monthly', amountPaise: 249900, features: [], totalCount: 12 },
];
let container;
let root;

beforeEach(() => {
  window.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  useParams.mockReturnValue({ planCode: 'growth_monthly' });
  jest.clearAllMocks();
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  delete window.Razorpay;
});

async function renderCheckout(configured) {
  API.get.mockImplementation(path => Promise.resolve({ data: path === '/payments/plans'
    ? { mode: 'test', checkoutConfigured: configured, plans: plans.map(plan => ({ ...plan, configured })), support: { phone: '+12025550123' } }
    : { subscription: null } }));
  await act(async () => root.render(<SubscriptionCheckoutPage />));
}

const button = text => [...container.querySelectorAll('button')].find(element => element.textContent.includes(text));

test('payment-method controls work while unconfigured checkout stays disabled', async () => {
  await renderCheckout(false);
  const bank = container.querySelector('input[value="card_bank"]');
  await act(async () => bank.click());
  expect(bank.checked).toBe(true);
  expect(container.querySelector('input[value="upi"]').checked).toBe(false);
  expect(button('Payments opening soon').disabled).toBe(true);
  expect(container.querySelector('a[href="tel:+12025550123"]')).not.toBeNull();
  expect(API.post).not.toHaveBeenCalled();
});

test.each([
  ['upi', 'UPI AutoPay', ['upi']],
  ['card_bank', 'card / bank', ['card', 'netbanking']],
])('Continue passes the %s preference to hosted checkout', async (method, label, instruments) => {
  const open = jest.fn();
  window.Razorpay = jest.fn().mockImplementation(() => ({ on: jest.fn(), open }));
  API.post.mockResolvedValue({ data: {
    mode: 'test', plan: plans[0],
    checkout: { keyId: 'rzp_test_fixture', subscriptionId: 'sub_fixture', customer: { name: 'Preview' } },
  } });
  await renderCheckout(true);
  await act(async () => container.querySelector(`input[value="${method}"]`).click());
  await act(async () => button(`Continue with ${label}`).click());
  expect(API.post).toHaveBeenCalledWith('/payments/subscriptions', { planCode: 'growth_monthly' });
  const options = window.Razorpay.mock.calls[0][0];
  expect(options.config.display.blocks.preferred.instruments.map(item => item.method)).toEqual(instruments);
  expect(options.config.display.preferences.show_default_blocks).toBe(true);
  expect(options.subscription_id).toBe('sub_fixture');
  expect(options.prefill.contact).toBe('');
  expect(open).toHaveBeenCalledTimes(1);
});

test('annual total changes and Enterprise uses its own plan', async () => {
  await renderCheckout(true);
  expect(container.textContent).toContain('₹1,000');
  await act(async () => button('annual').click());
  expect(container.textContent).toContain('₹9,600');
  expect(container.textContent).toContain('Full year billed together');
  useParams.mockReturnValue({ planCode: 'enterprise_monthly' });
  await act(async () => root.render(<SubscriptionCheckoutPage />));
  expect(container.textContent).toContain('Enterprise');
  expect(container.textContent).toContain('₹2,499');
});
