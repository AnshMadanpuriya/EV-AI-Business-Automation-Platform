import React, { useEffect, useState } from 'react';
import { AlertTriangle, Calendar, MessageSquare, TrendingUp, Users } from 'lucide-react';
import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import API from '../../utils/api';

const COLORS = ['#0066FF', '#00D4FF', '#00FF88', '#FF6B00', '#A78BFA'];
const EMPTY = {
  totalLeads: 0, newLeads: 0, convertedLeads: 0, conversionRate: 0,
  totalBookings: 0, pendingBookings: 0, totalChats: 0, recentChats: 0,
  leadsByStatus: [], leadsBySource: [], dailyLeads: []
};
const ChartTooltip = ({ active, payload, label }) => active && payload?.length ? (
  <div className="bg-ev-card border border-ev-border rounded-lg px-3 py-2 text-xs"><div className="text-gray-400 mb-1">{label}</div>{payload.map((item, index) => <div key={index} style={{ color: item.color }}>{item.name}: <span className="font-medium text-white">{item.value}</span></div>)}</div>
) : null;

export default function Analytics() {
  const [stats, setStats] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    API.get('/analytics/owner')
      .then(({ data }) => setStats({ ...EMPTY, ...data.stats }))
      .catch((requestError) => setError(requestError.response?.data?.message || 'Live analytics are unavailable.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-ev-blue border-t-transparent rounded-full animate-spin" /></div>;

  const daily = stats.dailyLeads.map((item) => ({ date: item._id?.slice(5) || item._id, leads: item.count }));
  return (
    <div className="space-y-6">
      <div><h1 className="font-display font-bold text-2xl text-white">Live Analytics</h1><p className="text-gray-500 text-sm">Measured outcomes from MongoDB—no demo metrics.</p></div>
      {error && <div className="card border-yellow-400/30 bg-yellow-400/5 p-3 flex items-center gap-2 text-xs text-yellow-200"><AlertTriangle size={15} />{error}</div>}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { title: 'Total Leads', value: stats.totalLeads, sub: `${stats.newLeads} in the last 7 days`, color: 'bg-ev-blue', Icon: Users },
          { title: 'Conversion Rate', value: `${stats.conversionRate}%`, sub: `${stats.convertedLeads} converted`, color: 'bg-green-600', Icon: TrendingUp },
          { title: 'Bookings', value: stats.totalBookings, sub: `${stats.pendingBookings} pending`, color: 'bg-purple-500', Icon: Calendar },
          { title: 'Captured Conversations', value: stats.totalChats, sub: `${stats.recentChats} new enquiries`, color: 'bg-orange-500', Icon: MessageSquare }
        ].map(({ title, value, sub, color, Icon }) => (
          <div key={title} className="card p-5"><div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color} mb-3`}><Icon size={17} className="text-white" /></div><div className="font-display font-bold text-2xl text-white">{value}</div><div className="text-sm text-gray-400">{title}</div><div className="text-xs text-gray-600">{sub}</div></div>
        ))}
      </div>

      <div className="card p-5">
        <div className="font-display font-semibold text-white mb-1">Lead intake</div><div className="text-xs text-gray-500 mb-4">Last 7 days</div>
        {daily.length ? <ResponsiveContainer width="100%" height={230}><AreaChart data={daily}><defs><linearGradient id="leadGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0066FF" stopOpacity={0.35} /><stop offset="95%" stopColor="#0066FF" stopOpacity={0} /></linearGradient></defs><XAxis dataKey="date" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip content={<ChartTooltip />} /><Area type="monotone" dataKey="leads" name="Leads" stroke="#0066FF" fill="url(#leadGradient)" strokeWidth={2} /></AreaChart></ResponsiveContainer> : <div className="h-[230px] flex items-center justify-center text-sm text-gray-600">No lead activity yet</div>}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5"><div className="font-display font-semibold text-white mb-4">Lead pipeline</div><div className="space-y-3">{stats.leadsByStatus.length ? stats.leadsByStatus.map(({ _id, count }, index) => { const percent = stats.totalLeads ? Math.round((count / stats.totalLeads) * 100) : 0; return <div key={_id}><div className="flex justify-between text-xs mb-1"><span className="text-gray-400 capitalize">{_id}</span><span className="text-white">{count} ({percent}%)</span></div><div className="w-full bg-ev-border rounded-full h-2"><div className="h-2 rounded-full" style={{ width: `${percent}%`, background: COLORS[index % COLORS.length] }} /></div></div>; }) : <div className="text-sm text-gray-600 py-8 text-center">No pipeline data</div>}</div></div>
        <div className="card p-5"><div className="font-display font-semibold text-white mb-4">Lead sources</div>{stats.leadsBySource.length ? <div className="flex items-center gap-4"><ResponsiveContainer width={150} height={150}><PieChart><Pie data={stats.leadsBySource} cx="50%" cy="50%" innerRadius={38} outerRadius={68} paddingAngle={4} dataKey="count" nameKey="_id">{stats.leadsBySource.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip content={<ChartTooltip />} /></PieChart></ResponsiveContainer><div className="flex-1 space-y-2">{stats.leadsBySource.map(({ _id, count }, index) => <div key={_id} className="flex justify-between items-center"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ background: COLORS[index % COLORS.length] }} /><span className="text-sm text-gray-300 capitalize">{_id}</span></div><span className="text-sm text-white">{count}</span></div>)}</div></div> : <div className="text-sm text-gray-600 py-8 text-center">No source data</div>}</div>
      </div>
    </div>
  );
}
