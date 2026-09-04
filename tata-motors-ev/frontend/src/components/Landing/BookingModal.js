import React, { useState } from 'react';
import { X, Calendar, CheckCircle } from 'lucide-react';
import API from '../../utils/api';
import toast from 'react-hot-toast';

const vehicles = ['Nexon EV', 'Nexon EV Max', 'Tiago EV', 'Punch EV', 'Tigor EV', 'Not sure yet'];
const timeSlots = ['10:00 AM', '11:00 AM', '12:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'];

export default function BookingModal({ onClose }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', vehicle: '', date: '', timeSlot: '', type: 'test-ride', notes: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.post('/bookings', form);
      setDone(true);
      toast.success('Booking confirmed!');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg card animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-ev-border">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-ev-blue" />
            <span className="font-display font-semibold text-white">Book a Demo / Test Ride</span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X size={18} /></button>
        </div>

        {done ? (
          <div className="p-8 text-center">
            <CheckCircle size={52} className="text-ev-green mx-auto mb-4" />
            <div className="font-display font-bold text-white text-xl mb-2">Booking Confirmed!</div>
            <div className="text-gray-400 text-sm mb-6">We'll contact you within 2 hours to confirm your appointment.</div>
            <button onClick={onClose} className="btn-primary px-8">Done</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Full Name*</label>
                <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Your name" className="input-field text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Phone*</label>
                <input required value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+91 XXXXX XXXXX" className="input-field text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Email*</label>
              <input required type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="you@company.com" className="input-field text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Booking Type</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="input-field text-sm">
                  <option value="test-ride">Test Ride</option>
                  <option value="demo">Product Demo</option>
                  <option value="consultation">Consultation</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Vehicle Interest</label>
                <select value={form.vehicle} onChange={e => setForm(p => ({ ...p, vehicle: e.target.value }))} className="input-field text-sm">
                  <option value="">Select model</option>
                  {vehicles.map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Preferred Date*</label>
                <input required type="date" min={new Date().toISOString().split('T')[0]} value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="input-field text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Time Slot*</label>
                <select required value={form.timeSlot} onChange={e => setForm(p => ({ ...p, timeSlot: e.target.value }))} className="input-field text-sm">
                  <option value="">Select time</option>
                  {timeSlots.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Notes</label>
              <textarea rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any special requirements..." className="input-field text-sm resize-none" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Confirm Booking'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
