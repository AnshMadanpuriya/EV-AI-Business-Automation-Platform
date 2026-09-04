import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle, Calendar, CheckCircle2, Clock3, Flame, RefreshCw,
  TrendingUp, UserCheck, Users
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import API from '../../utils/api';

const EMPTY_STATS = {
  totalLeads: 0, newLeads: 0, conversionRate: 0, hotLeads: 0, warmLeads: 0,
  totalBookings: 0, upcomingBookingsCount: 0, bookingCompletionRate: 0,
  followUpsDue: 0, handoffsRequested: 0, automationFailures: 0,
  leadsByStatus: [], attentionQueue: [], upcomingBookings: []
};

const StatCard = ({ title, value, sub, icon: Icon, accent }) => (
  <div className="card p-5 relative overflow-hidden">
    <div className={`absolute inset-x-0 top-0 h-0.5 ${accent}`} />
    <div className="flex items-start justify-between mb-4">
      <div className={`w-10 h-10 rounded-xl ${accent} flex items-center justify-center`}>
        <Icon size={18} className="text-white" />
      </div>
    </div>
    <div className="font-display font-bold text-3xl text-white mb-1">{value}</div>
    <div className="text-sm font-medium text-white">{title}</div>
    <div className="text-xs text-gray-500 mt-1">{sub}</div>
  </div>
);

const badge = (temperature) => ({
  hot: 'bg-red-400/10 text-red-300 border-red-400/20',
  warm: 'bg-yellow-400/10 text-yellow-300 border-yellow-400/20',
  cold: 'bg-blue-400/10 text-blue-300 border-blue-400/20'
}[temperature] || 'bg-gray-400/10 text-gray-300 border-gray-400/20');

export default function Overview() {
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await API.get('/analytics/owner');
      setStats({ ...EMPTY_STATS, ...data.stats });
    } catch (requestError) {
      setStats(EMPTY_STATS);
      setError(requestError.response?.data?.message || 'Live operations data is unavailable. Check the backend and MongoDB connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-ev-blue border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const pipeline = (stats.leadsByStatus || []).map((item) => ({ status: item._id, leads: item.count }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs text-ev-cyan font-mono uppercase tracking-[0.2em] mb-1">Phase 1 · Sales operations</div>
          <h1 className="font-display font-bold text-2xl text-white">Owner Command Centre</h1>
          <p className="text-gray-500 text-sm">Live lead priority, test-drive funnel and automation attention.</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-xs px-3 py-2 border border-ev-border rounded-lg text-gray-400 hover:text-white hover:border-ev-blue/50 transition-colors">
          <RefreshCw size={13} /> Refresh data
        </button>
      </div>

      {error && (
        <div className="card border-yellow-400/30 bg-yellow-400/5 p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-yellow-400 mt-0.5 flex-shrink-0" />
          <div><div className="text-sm text-yellow-200 font-medium">Live data not connected</div><div className="text-xs text-yellow-100/60 mt-1">{error}</div></div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Active leads" value={stats.totalLeads} sub={`${stats.newLeads} captured in the last 7 days`} icon={Users} accent="bg-ev-blue" />
        <StatCard title="Hot leads" value={stats.hotLeads} sub={`${stats.warmLeads} more warm leads`} icon={Flame} accent="bg-red-500" />
        <StatCard title="Conversion rate" value={`${stats.conversionRate}%`} sub="Lead to converted customer" icon={TrendingUp} accent="bg-ev-green/80" />
        <StatCard title="Upcoming drives" value={stats.upcomingBookingsCount} sub={`${stats.bookingCompletionRate}% booking completion`} icon={Calendar} accent="bg-purple-500" />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <Clock3 className="text-yellow-400" size={20} />
          <div><div className="text-xl font-bold text-white">{stats.followUpsDue}</div><div className="text-xs text-gray-500">Follow-ups due now</div></div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <UserCheck className="text-ev-cyan" size={20} />
          <div><div className="text-xl font-bold text-white">{stats.handoffsRequested}</div><div className="text-xs text-gray-500">Human handoffs waiting</div></div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          {stats.automationFailures ? <AlertTriangle className="text-red-400" size={20} /> : <CheckCircle2 className="text-ev-green" size={20} />}
          <div><div className="text-xl font-bold text-white">{stats.automationFailures}</div><div className="text-xs text-gray-500">Automation failures</div></div>
        </div>
      </div>

      <div className="grid xl:grid-cols-5 gap-4">
        <div className="xl:col-span-3 card p-5">
          <div className="font-display font-semibold text-white mb-1">Lead pipeline</div>
          <div className="text-xs text-gray-500 mb-5">Only real records from MongoDB are shown.</div>
          {pipeline.length ? (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={pipeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A2540" />
                <XAxis dataKey="status" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#0D1422', border: '1px solid #1A2540', borderRadius: 8 }} />
                <Bar dataKey="leads" fill="#0066FF" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-[230px] flex items-center justify-center text-sm text-gray-600">No lead data yet</div>}
        </div>

        <div className="xl:col-span-2 card p-5">
          <div className="font-display font-semibold text-white">Needs attention</div>
          <div className="text-xs text-gray-500 mb-4">Highest-intent and escalated leads first.</div>
          <div className="space-y-3">
            {(stats.attentionQueue || []).length ? stats.attentionQueue.map((lead) => (
              <div key={lead._id} className="rounded-xl border border-ev-border bg-black/10 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div><div className="text-sm text-white font-medium">{lead.name}</div><div className="text-xs text-gray-500">{lead.vehicle || 'Vehicle not selected'}</div></div>
                  <span className={`text-[10px] uppercase tracking-wider border rounded-full px-2 py-1 ${badge(lead.temperature)}`}>{lead.temperature} · {lead.score}</span>
                </div>
                <div className="text-xs text-gray-400 mt-2 line-clamp-2">{lead.nextBestAction}</div>
              </div>
            )) : <div className="py-10 text-center text-sm text-gray-600">No urgent leads right now</div>}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="font-display font-semibold text-white">Next test drives</div>
        <div className="text-xs text-gray-500 mb-4">Pending and confirmed appointments.</div>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {(stats.upcomingBookings || []).length ? stats.upcomingBookings.map((booking) => (
            <div key={booking._id} className="border border-ev-border rounded-xl p-3 bg-black/10">
              <div className="flex justify-between gap-2"><span className="text-sm text-white font-medium">{booking.name}</span><span className="text-[10px] text-ev-cyan font-mono">{booking.bookingCode}</span></div>
              <div className="text-xs text-gray-400 mt-1">{booking.vehicle || 'Vehicle TBD'}</div>
              <div className="text-xs text-gray-500 mt-2">{new Date(booking.date).toLocaleDateString('en-IN')} · {booking.timeSlot}</div>
            </div>
          )) : <div className="text-sm text-gray-600 py-6">No upcoming bookings</div>}
        </div>
      </div>
    </div>
  );
}
