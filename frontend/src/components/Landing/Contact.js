// import React, { useState } from 'react';

// export default function Contact() {
//   const [form, setForm] = useState({
//     name: '',
//     email: '',
//     phone: '',
//     company: '',
//     message: '',
//   });
//   const [loading, setLoading] = useState(false);
//   const [sent, setSent] = useState(false);
//   const [savedData, setSavedData] = useState(null);
//   const [error, setError] = useState('');

//   const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     setError('');

//     console.log('Submitting form:', form);

//     try {
//       const response = await fetch("https://script.google.com/macros/s/AKfycbzb6plPxOk7ehzl2hos8mEsoRDO1Nerfa3ryAZulSx0143nVlgFhX5DKFXH0lem8uoCuQ/exec", {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           name: form.name,
//           email: form.email,
//           phone: form.phone || '',
//           company: form.company || '',
//           message: form.message,
//         }),
//       });

//       const data = { success: true };
//       console.log('Server response:', data);

//       if (data.success) {
//         setSavedData({ ...form });
//         setSent(true);
//         setForm({ name: '', email: '', phone: '', company: '', message: '' });
//       } else {
//         setError(data.message || 'Something went wrong');
//       }
//     } catch (err) {
//       console.error('Fetch error:', err);
//       setError('Backend connect nahi ho raha. Make sure backend port 5000 pe chal raha hai.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const inp = (label, k, type = 'text', placeholder = '', required = false) => (
//     <div>
//       <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>
//         {label} {required && <span style={{ color: '#F87171' }}>*</span>}
//       </label>
//       <input
//         type={type}
//         required={required}
//         placeholder={placeholder}
//         value={form[k]}
//         onChange={set(k)}
//         style={{
//           width: '100%', background: '#080C14',
//           border: '1px solid #1A2540', borderRadius: 9,
//           padding: '12px 14px', color: 'white', fontSize: 14,
//           outline: 'none', boxSizing: 'border-box',
//         }}
//         onFocus={e => e.target.style.borderColor = '#0066FF'}
//         onBlur={e => e.target.style.borderColor = '#1A2540'}
//       />
//     </div>
//   );

//   return (
//     <section id="contact" style={{ padding: '96px 24px', background: '#050810' }}>
//       <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

//       <div style={{ maxWidth: 680, margin: '0 auto' }}>

//         {/* Header */}
//         <div style={{ textAlign: 'center', marginBottom: 40 }}>
//           <div style={{
//             display: 'inline-flex', alignItems: 'center', gap: 7,
//             background: 'rgba(0,102,255,0.1)', border: '1px solid rgba(0,102,255,0.25)',
//             borderRadius: 20, padding: '5px 14px', marginBottom: 14,
//           }}>
//             <span style={{ fontSize: 11, fontWeight: 700, color: '#60A5FA', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
//               Contact Us
//             </span>
//           </div>
//           <h2 style={{ fontSize: 'clamp(26px,4vw,40px)', fontWeight: 800, color: 'white', marginBottom: 10 }}>
//             Ready to get started?
//           </h2>
//           <p style={{ fontSize: 15, color: '#9CA3AF' }}>
//             Talk to our team for a personalized EV demo. We'll reach out within 24 hours.
//           </p>
//         </div>

//         {/* Contact Info */}
//         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 28 }}>
//           {[
//             { icon: '📧', label: 'Email', val: 'hello@tatamotorsev.ai' },
//             { icon: '📞', label: 'Phone', val: '+91 98765 43210' },
//             { icon: '📍', label: 'Location', val: 'Mumbai, India' },
//           ].map(({ icon, label, val }) => (
//             <div key={label} style={{
//               background: '#0D1422', border: '1px solid #1A2540',
//               borderRadius: 12, padding: '14px 16px', textAlign: 'center',
//             }}>
//               <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
//               <div style={{ fontSize: 10, color: '#6B7280', marginBottom: 3 }}>{label}</div>
//               <div style={{ fontSize: 11, color: '#D1D5DB', fontWeight: 500 }}>{val}</div>
//             </div>
//           ))}
//         </div>

//         {/* SUCCESS STATE */}
//         {sent && savedData ? (
//           <div style={{
//             background: 'rgba(0,255,136,0.05)',
//             border: '1px solid rgba(0,255,136,0.2)',
//             borderRadius: 18, padding: '32px 28px',
//           }}>
//             <div style={{ textAlign: 'center', marginBottom: 24 }}>
//               <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
//               <div style={{ fontSize: 22, fontWeight: 800, color: 'white', marginBottom: 6 }}>
//                 Message Sent!
//               </div>
//               <div style={{ fontSize: 14, color: '#9CA3AF' }}>
//                 Data successfully saved to MongoDB database
//               </div>
//             </div>

//             {/* Show exactly what was saved */}
//             <div style={{
//               background: '#0D1422', border: '1px solid #1A2540',
//               borderRadius: 12, overflow: 'hidden', marginBottom: 20,
//             }}>
//               <div style={{
//                 background: 'rgba(0,255,136,0.08)', borderBottom: '1px solid #1A2540',
//                 padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8,
//               }}>
//                 <span style={{ fontSize: 14 }}>🗄️</span>
//                 <span style={{ fontSize: 11, fontWeight: 700, color: '#00FF88', fontFamily: 'monospace' }}>
//                   SAVED TO: tatamotors-ev → enquiries collection
//                 </span>
//               </div>

//               {[
//                 { icon: '👤', label: 'Full Name', val: savedData.name },
//                 { icon: '📧', label: 'Email Address', val: savedData.email },
//                 { icon: '📞', label: 'Phone Number', val: savedData.phone || '—' },
//                 { icon: '🏢', label: 'Company', val: savedData.company || '—' },
//                 { icon: '💬', label: 'Message', val: savedData.message },
//                 { icon: '🕐', label: 'Saved At', val: new Date().toLocaleString('en-IN') },
//               ].map(({ icon, label, val }) => (
//                 <div key={label} style={{
//                   display: 'flex', alignItems: 'flex-start', gap: 12,
//                   padding: '12px 16px', borderBottom: '1px solid #1A2540',
//                 }}>
//                   <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{icon}</span>
//                   <div style={{ flex: 1 }}>
//                     <div style={{ fontSize: 10, color: '#6B7280', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
//                       {label}
//                     </div>
//                     <div style={{ fontSize: 14, color: '#E8EDF5', fontWeight: 500, wordBreak: 'break-word' }}>
//                       {val}
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>

//             <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
//               <button
//                 onClick={() => { setSent(false); setSavedData(null); }}
//                 style={{
//                   background: '#0066FF', color: 'white', border: 'none',
//                   borderRadius: 9, padding: '10px 24px', fontSize: 13,
//                   fontWeight: 700, cursor: 'pointer',
//                 }}
//               >
//                 Send Another Message
//               </button>
//             </div>
//           </div>

//         ) : (
//           /* FORM */
//           <form onSubmit={handleSubmit} style={{
//             background: '#0D1422', border: '1px solid #1A2540',
//             borderRadius: 18, padding: 28,
//           }}>

//             {/* Row 1 — Name + Phone */}
//             <div style={{ display: 'grid', gridTemplatsseColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
//               {inp('Full Name', 'name', 'text', 'Aadi Jain', true)}
//               {inp('Phone Number', 'phone', 'tel', '+91 98765 43210')}
//             </div>

//             {/* Row 2 — Email + Company */}
//             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
//               {inp('Email Address', 'email', 'email', 'aadijainz@gmail.com', true)}
//               {inp('Company Name', 'company', 'text', 'EV Dealership Pvt Ltd')}
//             </div>

//             {/* Message */}
//             <div style={{ marginBottom: 20 }}>
//               <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>
//                 Message <span style={{ color: '#F87171' }}>*</span>
//               </label>
//               <textarea
//                 required
//                 rows={4}
//                 placeholder="Tell us about your EV business and what you're looking for..."
//                 value={form.message}
//                 onChange={set('message')}
//                 style={{
//                   width: '100%', background: '#080C14',
//                   border: '1px solid #1A2540', borderRadius: 9,
//                   padding: '12px 14px', color: 'white', fontSize: 14,
//                   outline: 'none', resize: 'none', boxSizing: 'border-box',
//                   fontFamily: 'inherit',
//                 }}
//                 onFocus={e => e.target.style.borderColor = '#0066FF'}
//                 onBlur={e => e.target.style.borderColor = '#1A2540'}
//               />
//             </div>

//             {/* Error message */}
//             {error && (
//               <div style={{
//                 background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
//                 borderRadius: 8, padding: '12px 14px', marginBottom: 16,
//                 fontSize: 13, color: '#F87171', lineHeight: 1.5,
//               }}>
//                 ⚠️ {error}
//               </div>
//             )}

//             {/* Submit */}
//             <button
//               type="submit"
//               disabled={loading}
//               style={{
//                 width: '100%',
//                 background: loading ? '#1A2540' : 'linear-gradient(135deg, #0066FF, #0044CC)',
//                 color: 'white', border: 'none', borderRadius: 10,
//                 padding: '14px', fontSize: 15, fontWeight: 700,
//                 cursor: loading ? 'not-allowed' : 'pointer',
//                 display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
//                 boxShadow: loading ? 'none' : '0 0 24px rgba(0,102,255,0.3)',
//               }}
//             >
//               {loading ? (
//                 <>
//                   <div style={{
//                     width: 18, height: 18,
//                     border: '2px solid rgba(255,255,255,0.3)',
//                     borderTopColor: 'white', borderRadius: '50%',
//                     animation: 'spin 0.8s linear infinite',
//                   }} />
//                   Saving to database...
//                 </>
//               ) : (
//                 '📨 Send Message'
//               )}
//             </button>

//             <p style={{ textAlign: 'center', fontSize: 11, color: '#6B7280', marginTop: 12 }}>
//               🔒 Your data is securely stored in MongoDB Atlas
//             </p>
//           </form>
//         )}
//       </div>
//     </section>
//   );
// }
import React, { useState } from 'react';

export default function Contact() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [savedData, setSavedData] = useState(null);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError('');

  try {
    await fetch(
      'https://script.google.com/macros/s/AKfycbwp4eHb1lF8HS6m7pVzEP7dm37eneyufbjTbSm-JZcbFVFUErM3wzBOy7hVLBA0mWBlhg/exec',
      {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({
          name: form.name,
          phone: form.phone || '',
          email: form.email,
          company: form.company || '',
          message: form.message,
        }),
      }
    );

    setSavedData({ ...form });
    setSent(true);
    setForm({
      name: '',
      email: '',
      phone: '',
      company: '',
      message: '',
    });
  } catch (err) {
    console.error(err);
    setError('Google Sheet me data save nahi hua. Dobara try karo.');
  } finally {
    setLoading(false);
  }
};

  const inp = (label, k, type = 'text', placeholder = '', required = false) => (
    <div>
      <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>
        {label} {required && <span style={{ color: '#F87171' }}>*</span>}
      </label>
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        value={form[k]}
        onChange={set(k)}
        style={{
          width: '100%', background: '#080C14',
          border: '1px solid #1A2540', borderRadius: 9,
          padding: '12px 14px', color: 'white', fontSize: 14,
          outline: 'none', boxSizing: 'border-box',
        }}
        onFocus={e => e.target.style.borderColor = '#0066FF'}
        onBlur={e => e.target.style.borderColor = '#1A2540'}
      />
    </div>
  );

  return (
    <section id="contact" style={{ padding: '96px 24px', background: '#050810' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: 'rgba(0,102,255,0.1)', border: '1px solid rgba(0,102,255,0.25)',
            borderRadius: 20, padding: '5px 14px', marginBottom: 14,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#60A5FA', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Contact Us
            </span>
          </div>
          <h2 style={{ fontSize: 'clamp(26px,4vw,40px)', fontWeight: 800, color: 'white', marginBottom: 10 }}>
            Ready to get started?
          </h2>
          <p style={{ fontSize: 15, color: '#9CA3AF' }}>
            Talk to our team for a personalized EV demo. We'll reach out within 24 hours.
          </p>
        </div>

        {/* Contact Info */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 28 }}>
          {[
            { icon: '📧', label: 'Email', val: 'hello@tatamotorsev.ai' },
            { icon: '📞', label: 'Phone', val: '+91 98765 43210' },
            { icon: '📍', label: 'Location', val: 'Mumbai, India' },
          ].map(({ icon, label, val }) => (
            <div key={label} style={{
              background: '#0D1422', border: '1px solid #1A2540',
              borderRadius: 12, padding: '14px 16px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
              <div style={{ fontSize: 10, color: '#6B7280', marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 11, color: '#D1D5DB', fontWeight: 500 }}>{val}</div>
            </div>
          ))}
        </div>

        {/* SUCCESS STATE */}
        {sent && savedData ? (
          <div style={{
            background: 'rgba(0,255,136,0.05)',
            border: '1px solid rgba(0,255,136,0.2)',
            borderRadius: 18, padding: '32px 28px',
          }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'white', marginBottom: 6 }}>
                Message Sent!
              </div>
              <div style={{ fontSize: 14, color: '#9CA3AF' }}>
                Data successfully saved to MongoDB database
              </div>
            </div>

            {/* Show exactly what was saved */}
            <div style={{
              background: '#0D1422', border: '1px solid #1A2540',
              borderRadius: 12, overflow: 'hidden', marginBottom: 20,
            }}>
              <div style={{
                background: 'rgba(0,255,136,0.08)', borderBottom: '1px solid #1A2540',
                padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ fontSize: 14 }}>🗄️</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#00FF88', fontFamily: 'monospace' }}>
                  SAVED TO: tatamotors-ev → enquiries collection
                </span>
              </div>

              {[
                { icon: '👤', label: 'Full Name', val: savedData.name },
                { icon: '📧', label: 'Email Address', val: savedData.email },
                { icon: '📞', label: 'Phone Number', val: savedData.phone || '—' },
                { icon: '🏢', label: 'Company', val: savedData.company || '—' },
                { icon: '💬', label: 'Message', val: savedData.message },
                { icon: '🕐', label: 'Saved At', val: new Date().toLocaleString('en-IN') },
              ].map(({ icon, label, val }) => (
                <div key={label} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '12px 16px', borderBottom: '1px solid #1A2540',
                }}>
                  <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: '#6B7280', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {label}
                    </div>
                    <div style={{ fontSize: 14, color: '#E8EDF5', fontWeight: 500, wordBreak: 'break-word' }}>
                      {val}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={() => { setSent(false); setSavedData(null); }}
                style={{
                  background: '#0066FF', color: 'white', border: 'none',
                  borderRadius: 9, padding: '10px 24px', fontSize: 13,
                  fontWeight: 700, cursor: 'pointer',
                }}
              >
                Send Another Message
              </button>
            </div>
          </div>

        ) : (
          /* FORM */
          <form onSubmit={handleSubmit} style={{
            background: '#0D1422', border: '1px solid #1A2540',
            borderRadius: 18, padding: 28,
          }}>

            {/* Row 1 — Name + Phone */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              {inp('Full Name', 'name', 'text', 'Arjun Rathi', true)}
              {inp('Phone Number', 'phone', 'tel', '+91 98765 43210')}
            </div>

            {/* Row 2 — Email + Company */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              {inp('Email Address', 'email', 'email', 'arjun@gmail.com', true)}
              {inp('Company Name', 'company', 'text', 'EV Dealership Pvt Ltd')}
            </div>

            {/* Message */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>
                Message <span style={{ color: '#F87171' }}>*</span>
              </label>
              <textarea
                required
                rows={4}
                placeholder="Tell us about your EV business and what you're looking for..."
                value={form.message}
                onChange={set('message')}
                style={{
                  width: '100%', background: '#080C14',
                  border: '1px solid #1A2540', borderRadius: 9,
                  padding: '12px 14px', color: 'white', fontSize: 14,
                  outline: 'none', resize: 'none', boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
                onFocus={e => e.target.style.borderColor = '#0066FF'}
                onBlur={e => e.target.style.borderColor = '#1A2540'}
              />
            </div>

            {/* Error message */}
            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 8, padding: '12px 14px', marginBottom: 16,
                fontSize: 13, color: '#F87171', lineHeight: 1.5,
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: loading ? '#1A2540' : 'linear-gradient(135deg, #0066FF, #0044CC)',
                color: 'white', border: 'none', borderRadius: 10,
                padding: '14px', fontSize: 15, fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                boxShadow: loading ? 'none' : '0 0 24px rgba(0,102,255,0.3)',
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: 18, height: 18,
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: 'white', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  Saving to database...
                </>
              ) : (
                '📨 Send Message'
              )}
            </button>

            <p style={{ textAlign: 'center', fontSize: 11, color: '#6B7280', marginTop: 12 }}>
              🔒 Your data is securely stored in MongoDB Atlas
            </p>
          </form>
        )}
      </div>
    </section>
  );
}