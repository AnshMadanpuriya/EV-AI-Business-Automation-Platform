import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, Calendar, Car, CheckCircle, Clock, RefreshCw, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../../utils/api';

const STATUS_CONFIG = {
  pending: { color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20', icon: AlertCircle },
  confirmed: { color: 'text-ev-blue', bg: 'bg-ev-blue/10 border-ev-blue/20', icon: CheckCircle },
  completed: { color: 'text-ev-green', bg: 'bg-ev-green/10 border-ev-green/20', icon: CheckCircle },
  cancelled: { color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20', icon: XCircle },
  'no-show': { color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/20', icon: AlertTriangle }
};
const TIME_SLOTS = ['10:00 AM', '11:00 AM', '12:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'];

function RescheduleModal({ booking, onClose, onSaved }) {
  const [date, setDate] = useState(new Date(booking.date).toISOString().slice(0, 10));
  const [timeSlot, setTimeSlot] = useState(booking.timeSlot);
  const [saving, setSaving] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const { data } = await API.post(`/bookings/${booking._id}/reschedule`, { date, timeSlot });
      onSaved(data.booking);
      toast.success('Booking rescheduled');
      onClose();
    } catch (error) { toast.error(error.response?.data?.message || 'Reschedule failed'); }
    finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form onSubmit={submit} className="card p-5 w-full max-w-md space-y-4">
        <div><div className="font-display font-semibold text-white">Reschedule {booking.bookingCode}</div><div className="text-xs text-gray-500">The customer notification will be sent through the configured n8n workflow.</div></div>
        <label className="text-xs text-gray-400 block">New date<input required type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={(event) => setDate(event.target.value)} className="input-field mt-1 text-sm" /></label>
        <label className="text-xs text-gray-400 block">New time<select required value={timeSlot} onChange={(event) => setTimeSlot(event.target.value)} className="input-field mt-1 text-sm">{TIME_SLOTS.map((slot) => <option key={slot}>{slot}</option>)}</select></label>
        <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="text-sm text-gray-400 px-4 py-2">Cancel</button><button disabled={saving} className="btn-primary text-sm px-4 py-2">{saving ? 'Saving…' : 'Reschedule'}</button></div>
      </form>
    </div>
  );
}

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [rescheduling, setRescheduling] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams({ limit: '100' });
      if (filter) query.set('status', filter);
      const { data } = await API.get(`/bookings?${query.toString()}`);
      setBookings(data.bookings);
    } catch (requestError) {
      setBookings([]);
      setError(requestError.response?.data?.message || 'Cannot load live bookings.');
    } finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const replace = (booking) => setBookings((current) => current.map((item) => item._id === booking._id ? booking : item));

  const updateStatus = async (booking, status) => {
    try {
      const { data } = await API.put(`/bookings/${booking._id}`, { status });
      replace(data.booking);
      if (data.automation?.status === 'failed' || data.automation?.status === 'not-configured') toast('Status saved; customer automation needs attention.', { icon: '⚠️' });
      else toast.success(`Booking marked ${status}`);
    } catch (requestError) { toast.error(requestError.response?.data?.message || 'Update failed'); }
  };

  const cancel = async (booking) => {
    const reason = window.prompt('Cancellation reason (visible to the operations team):');
    if (reason === null) return;
    try {
      const { data } = await API.post(`/bookings/${booking._id}/cancel`, { reason });
      replace(data.booking);
      toast.success('Booking cancelled');
    } catch (requestError) { toast.error(requestError.response?.data?.message || 'Cancellation failed'); }
  };

  const upcoming = bookings.filter((booking) => new Date(booking.date) >= new Date() && !['cancelled', 'no-show'].includes(booking.status));
  const closed = bookings.filter((booking) => !upcoming.some((item) => item._id === booking._id));

  const BookingCard = ({ booking }) => {
    const config = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
    const Icon = config.icon;
    return (
      <div className="card p-4 hover:border-ev-blue/30 transition-colors">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div><div className="text-[10px] text-ev-cyan font-mono mb-1">{booking.bookingCode || booking._id?.slice(-8)}</div><div className="font-medium text-white text-sm">{booking.name}</div><div className="text-xs text-gray-500">{booking.phone}</div></div>
          <div className={`flex items-center gap-1.5 text-xs font-medium border rounded-full px-2.5 py-1 ${config.bg} ${config.color}`}><Icon size={11} /> {booking.status}</div>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-400"><Calendar size={12} className="text-ev-blue" />{new Date(booking.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400"><Clock size={12} className="text-ev-cyan" />{booking.timeSlot}</div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400"><Car size={12} className="text-purple-400" />{booking.vehicle || 'TBD'}</div>
          <div className="text-xs text-gray-500 capitalize">{booking.type?.replace('-', ' ')}</div>
        </div>
        <div className="flex items-center justify-between border-t border-ev-border pt-2 mb-2">
          <span className="text-[10px] text-gray-600 uppercase tracking-wider">Automation</span>
          <span className={`text-[10px] ${booking.automation?.status === 'failed' ? 'text-red-300' : booking.automation?.status === 'delivered' ? 'text-ev-green' : 'text-gray-500'}`}>{booking.automation?.status || 'not configured'}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {booking.status === 'pending' && <button onClick={() => updateStatus(booking, 'confirmed')} className="text-xs px-3 py-1.5 rounded-lg bg-ev-blue/15 text-ev-blue border border-ev-blue/20">Confirm</button>}
          {booking.status === 'confirmed' && <><button onClick={() => updateStatus(booking, 'completed')} className="text-xs px-3 py-1.5 rounded-lg bg-ev-green/10 text-ev-green border border-ev-green/20">Complete</button><button onClick={() => updateStatus(booking, 'no-show')} className="text-xs px-3 py-1.5 rounded-lg border border-orange-400/20 text-orange-300">No-show</button></>}
          {booking.status === 'no-show' && <button onClick={() => updateStatus(booking, 'confirmed')} className="text-xs px-3 py-1.5 rounded-lg border border-ev-blue/20 text-ev-blue">Re-open</button>}
          {!['completed', 'cancelled'].includes(booking.status) && <button onClick={() => setRescheduling(booking)} className="text-xs px-3 py-1.5 rounded-lg border border-ev-border text-gray-300">Reschedule</button>}
          {!['completed', 'cancelled'].includes(booking.status) && <button onClick={() => cancel(booking)} className="text-xs px-3 py-1.5 rounded-lg border border-red-400/20 text-red-300">Cancel</button>}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {rescheduling && <RescheduleModal booking={rescheduling} onClose={() => setRescheduling(null)} onSaved={replace} />}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-display font-bold text-2xl text-white">Test-drive Operations</h1><p className="text-gray-500 text-sm">Confirm, reschedule and close the dealership booking lifecycle.</p></div>
        <button onClick={load} className="flex items-center gap-2 text-xs px-3 py-2 border border-ev-border rounded-lg text-gray-400 hover:text-white"><RefreshCw size={13} />Refresh</button>
      </div>
      {error && <div className="card border-yellow-400/30 bg-yellow-400/5 p-3 flex items-center gap-2 text-xs text-yellow-200"><AlertTriangle size={15} />{error}</div>}
      <div className="flex gap-2 flex-wrap">{['', 'pending', 'confirmed', 'completed', 'no-show', 'cancelled'].map((status) => <button key={status} onClick={() => setFilter(status)} className={`text-xs px-3 py-1.5 rounded-full border capitalize ${filter === status ? 'bg-ev-blue border-ev-blue text-white' : 'border-ev-border text-gray-400 hover:text-white'}`}>{status || 'All'}</button>)}</div>
      {loading ? <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{[...Array(6)].map((_, index) => <div key={index} className="card h-48 animate-pulse" />)}</div> : bookings.length === 0 ? <div className="card p-14 text-center text-gray-500">No bookings found.</div> : <>
        {upcoming.length > 0 && <section><div className="text-xs font-mono text-ev-cyan uppercase tracking-widest mb-3">Upcoming ({upcoming.length})</div><div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{upcoming.map((booking) => <BookingCard key={booking._id} booking={booking} />)}</div></section>}
        {closed.length > 0 && <section><div className="text-xs font-mono text-gray-600 uppercase tracking-widest my-3">Past / closed ({closed.length})</div><div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{closed.map((booking) => <BookingCard key={booking._id} booking={booking} />)}</div></section>}
      </>}
    </div>
  );
}
