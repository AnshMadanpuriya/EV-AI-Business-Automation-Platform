import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, ArrowUp } from 'lucide-react';
import { AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import API from '../../utils/api';

const COLORS = ['#0066FF', '#00D4FF', '#00FF88', '#FF6B00', '#A78BFA'];

const monthlyData = [
  { month: 'Jan', leads: 180, bookings: 45, conversations: 620, revenue: 4.2 },
  { month: 'Feb', leads: 210, bookings: 52, conversations: 780, revenue: 5.1 },
  { month: 'Mar', leads: 195, bookings: 61, conversations: 840, revenue: 5.8 },
  { month: 'Apr', leads: 280, bookings: 78, conversations: 960, revenue: 7.2 },
  { month: 'May', leads: 310, bookings: 89, conversations: 1100, revenue: 8.6 },
  { month: 'Jun', leads: 342, bookings: 128, conversations: 1204, revenue: 10.2 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) return (
    <div className="bg-ev-card border border-ev-border rounded-lg px-3 py-2 text-xs shadow-lg">
      <div className="text-gray-400 mb-1.5 font-medium">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mb-0.5" style={{ color: p.color }}>
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="capitalize">{p.name}:</span>
          <span className="text-white font-medium">{p.value}{p.name === 'revenue' ? 'L' : ''}</span>
        </div>
      ))}
    </div>
  );
  return null;
};

const MetricCard = ({ title, value, change, prefix = '', suffix = '' }) => (
  <div className="card p-5">
    <div className="text-xs text-gray-500 mb-2">{title}</div>
    <div className="font-display font-bold text-2xl text-white mb-1">{prefix}{value}{suffix}</div>
    <div className={`flex items-center gap-1 text-xs ${change >= 0 ? 'text-ev-green' : 'text-red-400'}`}>
      <ArrowUp size={11} className={change < 0 ? 'rotate-180' : ''} />
      <span>{Math.abs(change)}% vs last month</span>
    </div>
  </div>
);

export default function Analytics() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-white">Analytics</h1>
        <p className="text-gray-500 text-sm">Performance trends over the last 6 months</p>
      </div>

      {/* KPI cards */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard title="Total Revenue (Lakhs)" value="10.2" change={18.6} prefix="₹" />
        <MetricCard title="Avg. Conversations/Day" value="40" change={12} />
        <MetricCard title="Lead-to-Booking Rate" value="37.4" change={5.2} suffix="%" />
        <MetricCard title="Avg. Response Time" value="1.8" change={-22} suffix="s" />
      </div>

      {/* Main area chart */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="font-display font-semibold text-white">Growth Overview</div>
            <div className="text-xs text-gray-500 mt-0.5">Leads, Bookings & Conversations — Jan to Jun</div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={monthlyData}>
            <defs>
              <linearGradient id="leadsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0066FF" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#0066FF" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="bookingsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00FF88" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00FF88" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1A2540" />
            <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
            <Area type="monotone" dataKey="leads" stroke="#0066FF" strokeWidth={2} fill="url(#leadsGrad)" dot={{ fill: '#0066FF', r: 3 }} />
            <Area type="monotone" dataKey="bookings" stroke="#00FF88" strokeWidth={2} fill="url(#bookingsGrad)" dot={{ fill: '#00FF88', r: 3 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom row */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="font-display font-semibold text-white mb-1">Monthly Revenue (₹ Lakhs)</div>
          <div className="text-xs text-gray-500 mb-4">Attributed to AI agent conversions</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A2540" />
              <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                {monthlyData.map((_, i) => <Cell key={i} fill={i === monthlyData.length - 1 ? '#00D4FF' : '#0066FF'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <div className="font-display font-semibold text-white mb-1">AI Conversations Volume</div>
          <div className="text-xs text-gray-500 mb-4">Monthly chat and voice interactions</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A2540" />
              <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="conversations" stroke="#A78BFA" strokeWidth={2.5} dot={{ fill: '#A78BFA', r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
