import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import DashboardPage from './DashboardPage';

let mockUser;
const mockLogout = jest.fn();
const mockNavigate = jest.fn();
jest.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: mockUser, logout: mockLogout }) }));
jest.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/dashboard/leads' }),
  Routes: ({ children }) => <>{children}</>,
  Route: ({ element }) => element,
}));
jest.mock('../components/Dashboard/Sidebar', () => () => <div>Staff navigation</div>);
jest.mock('../components/Dashboard/Overview', () => () => <div>Staff overview</div>);
jest.mock('../components/Dashboard/Leads', () => () => <div>Staff leads</div>);
jest.mock('../components/Dashboard/Bookings', () => () => <div>Staff bookings</div>);
jest.mock('../components/Dashboard/Conversations', () => () => <div>Staff conversations</div>);
jest.mock('../components/Dashboard/Analytics', () => () => <div>Staff analytics</div>);

test('customer dashboard works on nested URLs without mounting staff views or fetching CRM data', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  mockUser = { role: 'user', name: 'Test Customer', email: 'customer@example.com' };
  const originalFetch = global.fetch;
  global.fetch = jest.fn();
  const container = document.createElement('div');
  const root = createRoot(container);
  try {
    await act(async () => root.render(<DashboardPage />));
    expect(container.textContent).toContain('Your dashboard');
    expect(container.textContent).toContain('customer@example.com');
    expect(container.textContent).not.toContain('Staff');
    expect(container.querySelector('a[href="/#ev-explorer"]')).not.toBeNull();
    expect(container.querySelector('a[href="/#calculator"]')).not.toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
    await act(async () => container.querySelector('button').click());
    expect(mockLogout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    for (const role of ['admin', 'agent', 'viewer']) {
      mockUser = { ...mockUser, role };
      await act(async () => root.render(<DashboardPage />));
      expect(container.textContent).toContain('Staff overview');
      expect(container.textContent).toContain('Staff leads');
      expect(container.textContent).not.toContain('Your dashboard');
    }
  } finally {
    await act(async () => root.unmount());
    global.fetch = originalFetch;
  }
});
