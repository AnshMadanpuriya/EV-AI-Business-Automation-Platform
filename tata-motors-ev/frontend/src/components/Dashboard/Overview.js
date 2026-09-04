import React, { useState, useEffect } from 'react';
import { Users, Calendar, MessageSquare, TrendingUp, ArrowUp, ArrowDown, Zap } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import API from '../../utils/api';

const COLORS = ['#0066FF', '#00D4FF', '#00FF88', '#FF6B00', '#A78BFA'];

// Demo data fallback
const demoStats = {
  totalLeads: 342, newLeads: 47, convertedLeads: 89, conversionRate: 26.0,
  totalBookings: 128, pendingBookings: 34, totalChats: 1204, recentChats: 156,
  leadsByStatus: [
    { _id: 'new', count: 120 }, { _id: 'contacted', count: 98 }, { _id: 'qualified', count: 75 },
    { _id: 'converted', count: 89 }, { _id: 'lost', count: 40 }
  ],
  leadsBySource: [
    { _id: 'chatbot', count: 180 }, { _id: 'voice', count: 95 }, { _id: 'form', count: 42 }, { _id: 'demo-booking', count: 25 }
  ],
  dailyLeads: [
    { _id: '2025-07-14', count: 8 }, { _id: '2025-07-15', count: 12 }, { _id: '2025-07-16', count: 6 },
    { _id: '2025-07-17', count: 15 }, { _id: '2025-07-18', count: 9 }, { _id: '2025-07-19', count: 11 }, { _id: '2025-07-20', count: 18 }
  ]
};

const StatCard = ({ title, value, sub, icon: Icon, color, change }) => (
  <div className="card p-5">
    <div className="flex items-start justify-between mb-3">
      <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}><Icon size={18} className="text-white" /></div>
      {change !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-medium ${change >= 0 ? 'text-ev-green' : 'text-red-400'}`}>
          {change >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}{Math.abs(change)}%
        </div>
      )}
    </div>
    <div className="font-display font-bold text-3xl text-white mb-0.5">{value}</div>
    <div className="text-sm font-medium text-white mb-0.5">{title}</div>
    <div className="text-xs text-gray-500">{sub}</div>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) return (
    <div className="bg-ev-card border border-ev-border rounded-lg px-3 py-2 text-xs">
      <div className="text-gray-400 mb-1">{label}</div>
      {payload.map((p, i) => <div key={i} style={{ color: p.color }}>{p.name}: {p.value}</div>)}
    </div>
  );
  return null;
};

export default function Overview() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/analytics/dashboard')
      .then(r => setStats(r.data.stats))
      .catch(() => setStats(demoStats))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-ev-blue border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const s = stats || demoStats;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-white mb-0.5">Dashboard Overview</h1>
        <p className="text-gray-500 text-sm">Real-time performance metrics for your AI agent.</p>
      </div>

      {/* Stat cards */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Leads" value={s.totalLeads} sub={`${s.newLeads} new this month`} icon={Users} color="bg-ev-blue" change={14} />
        <StatCard title="Conversion Rate" value={`${s.conversionRate}%`} sub={`${s.convertedLeads} converted`} icon={TrendingUp} color="bg-ev-green/80" change={3.2} />
        <StatCard title="Bookings" value={s.totalBookings} sub={`${s.pendingBookings} pending`} icon={Calendar} color="bg-purple-500" change={8} />
        <StatCard title="AI Conversations" value={s.totalChats} sub={`${s.recentChats} this week`} icon={MessageSquare} color="bg-ev-cyan/80" change={21} />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Line chart */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="font-display font-semibold text-white">Leads — Last 7 Days</div>
            <div className="text-xs text-gray-500 font-mono">Daily volume</div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={s.dailyLeads.map(d => ({ date: d._id?.slice(5) || d._id, leads: d.count }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A2540" />
              <XAxis dataKey="date" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="leads" stroke="#0066FF" strokeWidth={2.5} dot={{ fill: '#0066FF', r: 4 }} activeDot={{ r: 6, fill: '#00D4FF' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="card p-5">
          <div className="font-display font-semibold text-white mb-4">Leads by Source</div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={s.leadsBySource} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="count" nameKey="_id">
                {s.leadsBySource.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {s.leadsBySource.map(({ _id, count }, i) => (
              <div key={_id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-gray-400 capitalize">{_id}</span>
                </div>
                <span className="text-white font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bar chart — leads by status */}
      <div className="card p-5">
        <div className="font-display font-semibold text-white mb-4">Lead Pipeline Status</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={s.leadsByStatus.map(d => ({ status: d._id, count: d.count }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1A2540" />
            <XAxis dataKey="status" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {s.leadsByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
