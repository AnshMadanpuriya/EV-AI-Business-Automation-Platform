import React, { useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Menu, X, Bell, Search } from 'lucide-react';
import Sidebar from '../components/Dashboard/Sidebar';
import Overview from '../components/Dashboard/Overview';
import LeadsTable from '../components/Dashboard/LeadsTable';
import BookingsTable from '../components/Dashboard/BookingsTable';
import Conversations from '../components/Dashboard/Conversations';
import Analytics from '../components/Dashboard/Analytics';
import { useAuth } from '../context/AuthContext';

const PAGE_TITLES = {
  '/dashboard': 'Overview',
  '/dashboard/leads': 'Leads',
  '/dashboard/bookings': 'Bookings',
  '/dashboard/conversations': 'Conversations',
  '/dashboard/analytics': 'Analytics',
};

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] || 'Dashboard';

  return (
    <div className="min-h-screen bg-ev-darker flex">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-10 flex-shrink-0 animate-slide-up">
            <Sidebar mobile onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-ev-card border-b border-ev-border px-4 sm:px-6 py-3.5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-400 hover:text-white transition-colors">
              <Menu size={20} />
            </button>
            <div>
              <h2 className="font-display font-semibold text-white text-sm sm:text-base">{title}</h2>
              <div className="text-xs text-gray-500 hidden sm:block">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search - hidden on mobile */}
            <div className="hidden sm:flex items-center gap-2 bg-ev-darker border border-ev-border rounded-lg px-3 py-1.5">
              <Search size={13} className="text-gray-500" />
              <input placeholder="Search..." className="bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none w-36" />
            </div>

            {/* Notification bell */}
            <button className="relative w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-ev-border rounded-lg transition-colors">
              <Bell size={16} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-ev-accent rounded-full" />
            </button>

            {/* User avatar */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-ev-blue to-ev-cyan rounded-full flex items-center justify-center text-white font-bold text-xs">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:block text-sm text-white font-medium">{user?.name?.split(' ')[0]}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Routes>
            <Route index element={<Overview />} />
            <Route path="leads" element={<LeadsTable />} />
            <Route path="bookings" element={<BookingsTable />} />
            <Route path="conversations" element={<Conversations />} />
            <Route path="analytics" element={<Analytics />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
