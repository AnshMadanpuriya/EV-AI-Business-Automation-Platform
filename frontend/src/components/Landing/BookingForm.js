import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import API from '../../utils/api';

const VEHICLES = ['Nexon EV Max', 'Nexon EV', 'Punch EV', 'Tiago EV', 'Tigor EV', 'Curvv EV'];
const TIME_SLOTS = ['10:00 AM', '11:00 AM', '12:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'];

function emptyForm(vehicle = '') {
  return {
    name: '', email: '', phone: '', vehicle, date: '', timeSlot: '', type: 'test-ride',
    testDriveMode: 'showroom', city: '', pincode: '', address: '', location: '', notes: '',
    privacyAccepted: false,
  };
}

function validateForm(form) {
  const errors = {};
  const phone = form.phone.replace(/\D/g, '').replace(/^91(?=[6-9]\d{9}$)/, '');

  if (form.name.trim().length < 3) errors.name = 'Enter your full name';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Enter a valid email address';
  if (!/^[6-9]\d{9}$/.test(phone)) errors.phone = 'Enter a valid 10-digit Indian phone number';
  if (!form.vehicle.trim()) errors.vehicle = 'Select an EV model';
  if (!form.date) errors.date = 'Select a preferred date';
  if (!form.timeSlot) errors.timeSlot = 'Select a time slot';
  if (form.city.trim().length < 2) errors.city = 'Enter your city';
  if (!/^\d{6}$/.test(form.pincode.trim())) errors.pincode = 'Enter a valid 6-digit PIN code';
  if (form.testDriveMode === 'home' && form.address.trim().length < 10) errors.address = 'Enter your complete home address';
  if (!form.privacyAccepted) errors.privacyAccepted = 'Please accept this to submit your request';
  return errors;
}

function createIdempotencyKey() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `booking-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function BookingForm({ initialVehicle = '', onClose }) {
  const [form, setForm] = useState(() => emptyForm(initialVehicle));
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(null);
  const idempotencyKey = useRef(createIdempotencyKey());

  useEffect(() => {
    setForm((current) => ({ ...current, vehicle: initialVehicle || current.vehicle }));
  }, [initialVehicle]);

  useEffect(() => {
    const onKeyDown = (event) => event.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const update = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setSubmitError('');
    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        consent: { privacyAccepted: form.privacyAccepted, emailUpdates: true, capturedAt: new Date().toISOString() },
      };
      delete payload.privacyAccepted;
      const { data } = await API.post('/bookings', payload, {
        headers: { 'Idempotency-Key': idempotencyKey.current },
        timeout: 15000,
      });
      setSuccess(data);
      setForm(emptyForm(initialVehicle));
    } catch (error) {
      setSubmitError(error.response?.data?.message
        || (error.request ? 'Booking server is unavailable. Please try again shortly.' : 'Could not submit your request.'));
    } finally {
      setLoading(false);
    }
  };

  const fieldStyle = (invalid) => ({
    width: '100%', background: 'rgba(0,0,0,0.35)',
    border: `1px solid ${invalid ? '#F87171' : 'rgba(255,255,255,0.11)'}`,
    borderRadius: 10, padding: '11px 13px', color: 'white', fontSize: 13,
    outline: 'none', boxSizing: 'border-box',
  });
  const FieldError = ({ name }) => errors[name]
    ? <div style={{ color: '#F87171', fontSize: 11, marginTop: 4 }}>{errors[name]}</div>
    : null;

  return (
    <div role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()} style={{
      position: 'fixed', inset: 0, zIndex: 9999, padding: 18, display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'rgba(2,6,14,0.82)', backdropFilter: 'blur(10px)',
    }}>
      <motion.div role="dialog" aria-modal="true" aria-labelledby="test-drive-title"
        initial={{ opacity: 0, scale: 0.96, y: 22 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 16 }} transition={{ duration: 0.24 }} style={{
          width: '100%', maxWidth: 650, maxHeight: '92vh', overflowY: 'auto',
          background: 'linear-gradient(160deg,#10192A,#0A101C)', border: '1px solid rgba(55,199,255,0.22)',
          borderRadius: 22, boxShadow: '0 28px 90px rgba(0,0,0,0.55)',
        }}>
        <div style={{
          position: 'sticky', top: 0, zIndex: 2, padding: '18px 22px', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center', gap: 12,
          background: 'rgba(13,20,34,0.97)', borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div>
            <div id="test-drive-title" style={{ color: 'white', fontWeight: 800, fontSize: 18 }}>🚗 Book your EV test drive</div>
            <div style={{ color: '#8090A8', fontSize: 11, marginTop: 3 }}>Submit a request now. The dealership confirms the final slot.</div>
          </div>
          <button type="button" aria-label="Close booking form" onClick={onClose} style={{
            width: 34, height: 34, borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.04)', color: '#B7C0CE', cursor: 'pointer', fontSize: 20,
          }}>×</button>
        </div>

        <AnimatePresence mode="wait">
          {success ? (
            <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '42px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 58, marginBottom: 14 }}>✅</div>
              <h3 style={{ color: 'white', fontSize: 22, marginBottom: 8 }}>Test-drive request received</h3>
              <p style={{ color: '#9CA3AF', fontSize: 13, lineHeight: 1.65, maxWidth: 460, margin: '0 auto 20px' }}>
                We saved your request and sent it to the dealership workflow. You will receive an acknowledgement email, followed by a separate confirmation after the team verifies the slot.
              </p>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 14px', marginBottom: 22,
                borderRadius: 10, background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.18)',
                color: '#8FEAFF', fontSize: 12,
              }}>
                Booking code <strong style={{ fontFamily: 'monospace', color: 'white' }}>{success.booking?.bookingCode}</strong>
              </div>
              <div style={{ color: success.automation?.status === 'failed' ? '#FBBF24' : '#7DD3FC', fontSize: 11, marginBottom: 24 }}>
                {success.automation?.status === 'delivered'
                  ? 'Notification workflow accepted the request.'
                  : success.automation?.status === 'failed'
                    ? 'Booking is safe, but the notification workflow needs staff attention.'
                    : 'Booking is safe. Notifications will work after n8n is connected.'}
              </div>
              <button type="button" onClick={onClose} style={{
                border: 0, borderRadius: 10, padding: '12px 34px', background: '#0066FF',
                color: 'white', fontWeight: 700, cursor: 'pointer',
              }}>Done</button>
            </motion.div>
          ) : (
            <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={submit} style={{ padding: 22 }}>
              <div className="booking-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <label style={{ color: '#9CA3AF', fontSize: 12 }}>Full name *
                  <input value={form.name} onChange={update('name')} autoComplete="name" placeholder="Your full name" style={{ ...fieldStyle(errors.name), marginTop: 6 }} />
                  <FieldError name="name" />
                </label>
                <label style={{ color: '#9CA3AF', fontSize: 12 }}>Phone number *
                  <input value={form.phone} onChange={update('phone')} inputMode="tel" autoComplete="tel" placeholder="9876543210" style={{ ...fieldStyle(errors.phone), marginTop: 6 }} />
                  <FieldError name="phone" />
                </label>
                <label style={{ color: '#9CA3AF', fontSize: 12, gridColumn: '1 / -1' }}>Email address *
                  <input type="email" value={form.email} onChange={update('email')} autoComplete="email" placeholder="you@gmail.com" style={{ ...fieldStyle(errors.email), marginTop: 6 }} />
                  <FieldError name="email" />
                </label>
                <label style={{ color: '#9CA3AF', fontSize: 12 }}>Selected EV *
                  <input list="booking-vehicles" value={form.vehicle} onChange={update('vehicle')} placeholder="Select or enter EV model" style={{ ...fieldStyle(errors.vehicle), marginTop: 6 }} />
                  <datalist id="booking-vehicles">{VEHICLES.map((vehicle) => <option key={vehicle} value={vehicle} />)}</datalist>
                  <FieldError name="vehicle" />
                </label>
                <label style={{ color: '#9CA3AF', fontSize: 12 }}>Test-drive preference *
                  <select value={form.testDriveMode} onChange={update('testDriveMode')} style={{ ...fieldStyle(false), marginTop: 6 }}>
                    <option value="showroom">Visit showroom</option>
                    <option value="home">Home test drive</option>
                  </select>
                </label>
                <label style={{ color: '#9CA3AF', fontSize: 12 }}>Preferred date *
                  <input type="date" min={new Date().toISOString().slice(0, 10)} value={form.date} onChange={update('date')} style={{ ...fieldStyle(errors.date), marginTop: 6 }} />
                  <FieldError name="date" />
                </label>
                <label style={{ color: '#9CA3AF', fontSize: 12 }}>Preferred time *
                  <select value={form.timeSlot} onChange={update('timeSlot')} style={{ ...fieldStyle(errors.timeSlot), marginTop: 6 }}>
                    <option value="">Select time</option>
                    {TIME_SLOTS.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
                  </select>
                  <FieldError name="timeSlot" />
                </label>
                <label style={{ color: '#9CA3AF', fontSize: 12 }}>City *
                  <input value={form.city} onChange={update('city')} autoComplete="address-level2" placeholder="Indore" style={{ ...fieldStyle(errors.city), marginTop: 6 }} />
                  <FieldError name="city" />
                </label>
                <label style={{ color: '#9CA3AF', fontSize: 12 }}>PIN code *
                  <input value={form.pincode} onChange={update('pincode')} inputMode="numeric" autoComplete="postal-code" maxLength={6} placeholder="452001" style={{ ...fieldStyle(errors.pincode), marginTop: 6 }} />
                  <FieldError name="pincode" />
                </label>
                {form.testDriveMode === 'home' ? (
                  <label style={{ color: '#9CA3AF', fontSize: 12, gridColumn: '1 / -1' }}>Complete home address *
                    <textarea rows={3} value={form.address} onChange={update('address')} autoComplete="street-address" placeholder="House/flat, street, landmark and locality" style={{ ...fieldStyle(errors.address), marginTop: 6, resize: 'vertical' }} />
                    <FieldError name="address" />
                  </label>
                ) : (
                  <label style={{ color: '#9CA3AF', fontSize: 12, gridColumn: '1 / -1' }}>Preferred showroom/location
                    <input value={form.location} onChange={update('location')} placeholder="Nearest Tata EV showroom or area" style={{ ...fieldStyle(false), marginTop: 6 }} />
                  </label>
                )}
                <label style={{ color: '#9CA3AF', fontSize: 12, gridColumn: '1 / -1' }}>Additional notes
                  <textarea rows={2} value={form.notes} onChange={update('notes')} placeholder="Accessibility, preferred contact time, or other request" style={{ ...fieldStyle(false), marginTop: 6, resize: 'vertical' }} />
                </label>
              </div>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 9, color: '#9CA3AF', fontSize: 11, lineHeight: 1.5, marginTop: 16 }}>
                <input type="checkbox" checked={form.privacyAccepted} onChange={update('privacyAccepted')} style={{ marginTop: 2 }} />
                <span>I agree that my details may be stored and used by the dealership to process this test-drive request and send transactional updates.</span>
              </label>
              <FieldError name="privacyAccepted" />

              {submitError && <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: 9, color: '#FCA5A5', background: 'rgba(239,68,68,0.1)', fontSize: 12 }}>⚠️ {submitError}</div>}

              <button type="submit" disabled={loading} style={{
                width: '100%', marginTop: 18, padding: 14, border: 0, borderRadius: 11,
                background: loading ? '#1A2540' : 'linear-gradient(135deg,#0066FF,#00A7E7)',
                color: 'white', fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
              }}>
                {loading ? 'Submitting request…' : 'Submit test-drive request'}
              </button>
              <p style={{ color: '#637086', fontSize: 10, textAlign: 'center', marginTop: 10 }}>
                A request acknowledgement is not the final slot confirmation.
              </p>
            </motion.form>
          )}
        </AnimatePresence>
        <style>{`@media(max-width:640px){.booking-form-grid{grid-template-columns:1fr!important}}`}</style>
      </motion.div>
    </div>
  );
}
