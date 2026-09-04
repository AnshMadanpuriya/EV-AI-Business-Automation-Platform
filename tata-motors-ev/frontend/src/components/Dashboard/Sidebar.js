import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, MessageSquare, BarChart3, Settings, LogOut, Zap, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const nav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Overview', end: true },
  { to: '/dashboard/leads', icon: Users, label: 'Leads' },
  { to: '/dashboard/bookings', icon: Calendar, label: 'Bookings' },
  { to: '/dashboard/conversations', icon: MessageSquare, label: 'Conversations' },
  { to: '/dashboard/analytics', icon: BarChart3, label: 'Analytics' },
];

export default function Sidebar({ mobile, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/'); if (onClose) onClose(); };

  return (
    <div className="flex flex-col h-full bg-ev-card border-r border-ev-border w-64">
      {/* Logo */}
      <div className="p-5 border-b border-ev-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-ev-blue rounded-lg flex items-center justify-center shadow-blue-glow"><Zap size={16} className="text-white" /></div>
          <div>
            <div className="font-display font-bold text-white">Tata<span className="text-ev-cyan">EV</span></div>
            <div className="text-xs text-gray-500 font-mono">Dashboard</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {nav.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end} onClick={onClose}
            className={({ isActive }) => `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive ? 'bg-ev-blue/15 text-white border border-ev-blue/20' : 'text-gray-400 hover:text-white hover:bg-ev-border/50'}`}>
            <div className="flex items-center gap-3">
              <Icon size={16} />
              {label}
            </div>
            <ChevronRight size={12} className="opacity-40" />
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-ev-border">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1">
          <div className="w-8 h-8 bg-gradient-to-br from-ev-blue to-ev-cyan rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">{user?.name}</div>
            <div className="text-xs text-gray-500 truncate">{user?.role}</div>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors">
          <LogOut size={15} /> Sign Out
        </button>
      </div>
    </div>
  );
}
