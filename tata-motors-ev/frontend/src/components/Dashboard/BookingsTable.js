import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Search, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import API from '../../utils/api';
import toast from 'react-hot-toast';

const STATUS_STYLES = {
  pending: 'bg-yellow-400/15 text-yellow-400 border-yellow-400/20',
  confirmed: 'bg-ev-blue/15 text-ev-blue border-ev-blue/20',
  completed: 'bg-ev-green/15 text-ev-green border-ev-green/20',
  cancelled: 'bg-red-400/15 text-red-400 border-red-400/20',
};

const TYPE_ICONS = { 'test-ride': '🚗', demo: '📊', service: '🔧', consultation: '💬' };

const demoBookings = Array.from({ length: 14 }, (_, i) => ({
  _id: `booking_${i}`,
  name: ['Sanjay Gupta', 'Meena Patel', 'Rajesh Kumar', 'Pooja Sharma', 'Vikram Nair'][i % 5],
  email: `customer${i + 1}@gmail.com`,
  phone: `+91 9${Math.floor(Math.random() * 900000000 + 100000000)}`,
  type: ['test-ride', 'demo', 'service', 'consultation'][i % 4],
  vehicle: ['Nexon EV', 'Tiago EV', 'Punch EV', ''][i % 4],
  date: new Date(Date.now() + (i - 3) * 86400000 * 2).toISOString(),
  timeSlot: ['10:00 AM', '11:00 AM', '2:00 PM', '4:00 PM'][i % 4],
  status: ['pending', 'confirmed', 'completed', 'cancelled'][i % 4],
  createdAt: new Date(Date.now() - i * 86400000).toISOString(),
}));

export default function BookingsTable() {
  const [bookings, setBookings] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const limit = 10;

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit, ...(statusFilter && { status: statusFilter }) });
      const { data } = await API.get(`/bookings?${params}`);
      setBookings(data.bookings);
      setTotal(data.total);
    } catch {
      let filtered = demoBookings;
      if (statusFilter) filtered = filtered.filter(b => b.status === statusFilter);
      setBookings(filtered.slice((page - 1) * limit, page * limit));
      setTotal(filtered.length);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const updateStatus = async (id, status) => {
    try {
      await API.put(`/bookings/${id}`, { status });
      toast.success('Booking updated');
      fetchBookings();
    } catch {
      setBookings(prev => prev.map(b => b._id === id ? { ...b, status } : b));
      toast.success('Updated (demo)');
    }
  };

  const pages = Math.ceil(total / limit);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Bookings</h1>
          <p className="text-gray-500 text-sm">{total} total bookings</p>
        </div>
        <div className="flex gap-2">
          {['pending', 'confirmed', 'completed', 'cancelled'].map(s => (
            <button key={s} onClick={() => { setStatusFilter(statusFilter === s ? '' : s); setPage(1); }}
              className={`text-xs px-3 py-1.5 rounded-full border capitalize transition-colors ${statusFilter === s ? STATUS_STYLES[s] : 'border-ev-border text-gray-500 hover:border-ev-blue hover:text-white'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ev-border">
                {['Customer', 'Type', 'Vehicle', 'Date & Time', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-mono text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-ev-border/50">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-ev-border rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : bookings.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-500">No bookings found</td></tr>
              ) : bookings.map(booking => (
                <tr key={booking._id} className="border-b border-ev-border/50 hover:bg-ev-border/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-white">{booking.name}</div>
                    <div className="text-xs text-gray-500">{booking.phone}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm">{TYPE_ICONS[booking.type]} <span className="text-gray-300 capitalize">{booking.type.replace('-', ' ')}</span></span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-400">{booking.vehicle || '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-white">{new Date(booking.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1"><Clock size={10} />{booking.timeSlot}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full border capitalize ${STATUS_STYLES[booking.status]}`}>{booking.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {booking.status === 'pending' && (
                        <>
                          <button onClick={() => updateStatus(booking._id, 'confirmed')} title="Confirm" className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-ev-green hover:bg-ev-green/10 transition-colors">
                            <CheckCircle size={14} />
                          </button>
                          <button onClick={() => updateStatus(booking._id, 'cancelled')} title="Cancel" className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                            <XCircle size={14} />
                          </button>
                        </>
                      )}
                      {booking.status === 'confirmed' && (
                        <button onClick={() => updateStatus(booking._id, 'completed')} title="Mark Complete" className="text-xs text-ev-blue hover:text-white border border-ev-blue/30 rounded px-2 py-1 hover:bg-ev-blue transition-colors">
                          Complete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-ev-border">
            <span className="text-xs text-gray-500">Page {page} of {pages}</span>
            <div className="flex gap-1">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="w-7 h-7 flex items-center justify-center rounded-lg border border-ev-border text-gray-400 hover:text-white disabled:opacity-40 transition-colors"><ChevronLeft size={14} /></button>
              <button disabled={page === pages} onClick={() => setPage(p => p + 1)} className="w-7 h-7 flex items-center justify-center rounded-lg border border-ev-border text-gray-400 hover:text-white disabled:opacity-40 transition-colors"><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
