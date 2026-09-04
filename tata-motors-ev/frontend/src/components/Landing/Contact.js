import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', company: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    setSent(true);
    toast.success('Message sent! We\'ll reach out within 24 hours.');
    setForm({ name: '', email: '', company: '', message: '' });
  };

  return (
    <section id="contact" className="py-24 bg-ev-dark relative">
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-30" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="section-label">Contact Us</span>
            <h2 className="font-display font-bold text-4xl sm:text-5xl text-white mt-3 mb-4">
              Ready to transform your{' '}
              <span className="gradient-text">EV business?</span>
            </h2>
            <p className="text-gray-400 text-lg mb-8">Talk to our team and get a personalized demo tailored to your dealership or EV company.</p>

            <div className="space-y-5">
              {[
                { icon: Mail, label: 'Email', value: 'hello@tatamotorsev.ai' },
                { icon: Phone, label: 'Phone', value: '+91 98765 43210' },
                { icon: MapPin, label: 'Address', value: 'Mumbai, Maharashtra, India' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-ev-blue/10 border border-ev-blue/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon size={18} className="text-ev-blue" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">{label}</div>
                    <div className="text-white text-sm font-medium">{value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-7">
            {sent ? (
              <div className="text-center py-8">
                <CheckCircle size={48} className="text-ev-green mx-auto mb-4" />
                <div className="font-display font-bold text-white text-xl mb-2">Message Sent!</div>
                <div className="text-gray-400 text-sm">Our team will contact you within 24 hours.</div>
                <button onClick={() => setSent(false)} className="btn-secondary mt-6 text-sm px-6 py-2">Send Another</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Full Name</label>
                    <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Rahul Kumar" className="input-field text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Email</label>
                    <input required type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="rahul@company.com" className="input-field text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Company Name</label>
                  <input value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} placeholder="EV Dealership Name" className="input-field text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Message</label>
                  <textarea required rows={4} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} placeholder="Tell us about your EV business and what you're looking for..." className="input-field text-sm resize-none" />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                  {loading ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <><Send size={16} /> Send Message</>}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
