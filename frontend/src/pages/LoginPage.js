import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', company: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form.name, form.email, form.password, form.company);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Check if backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', background: '#080C14',
    border: '1px solid #1A2540', borderRadius: 9,
    padding: '11px 14px', color: 'white', fontSize: 13,
    outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#050810',
      position: 'relative', padding: 20,
    }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Grid bg */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.3,
        backgroundImage: 'linear-gradient(rgba(0,102,255,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(0,102,255,0.07) 1px,transparent 1px)',
        backgroundSize: '40px 40px',
      }} />
      {/* Glow */}
      <div style={{
        position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)',
        width: '70%', height: 500, borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(ellipse, rgba(0,102,255,0.1) 0%, transparent 70%)',
      }} />

      <div style={{ width: '100%', maxWidth: 440, position: 'relative' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, background: '#0066FF', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, boxShadow: '0 0 20px rgba(0,102,255,0.4)' }}>⚡</div>
            <span style={{ fontWeight: 800, fontSize: 20, color: 'white' }}>Tata<span style={{ color: '#00D4FF' }}>EV</span></span>
          </Link>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'white', marginBottom: 6 }}>
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h1>
          <p style={{ fontSize: 13, color: '#9CA3AF' }}>
            {mode === 'login' ? 'Sign in to your dashboard' : 'Start your 14-day free trial'}
          </p>
        </div>

        {/* Card */}
        <div style={{ background: '#0D1422', border: '1px solid #1A2540', borderRadius: 18, padding: 28 }}>

          {/* Toggle */}
          <div style={{
            display: 'flex', background: '#080C14',
            borderRadius: 10, padding: 4, marginBottom: 24,
          }}>
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); }}
                style={{
                  flex: 1, padding: '9px', borderRadius: 7, border: 'none',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  background: mode === m ? '#0066FF' : 'transparent',
                  color: mode === m ? 'white' : '#9CA3AF',
                  transition: 'all 0.2s',
                  boxShadow: mode === m ? '0 0 16px rgba(0,102,255,0.3)' : 'none',
                }}>
                {m === 'login' ? '🔑 Sign In' : '✨ Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Register-only fields */}
            {mode === 'register' && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Full Name *</label>
                  <input required value={form.name} onChange={set('name')} placeholder="Rahul Kumar" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#0066FF'} onBlur={e => e.target.style.borderColor = '#1A2540'} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Phone</label>
                    <input value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" style={inputStyle}
                      onFocus={e => e.target.style.borderColor = '#0066FF'} onBlur={e => e.target.style.borderColor = '#1A2540'} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Company</label>
                    <input value={form.company} onChange={set('company')} placeholder="EV Motors Pvt Ltd" style={inputStyle}
                      onFocus={e => e.target.style.borderColor = '#0066FF'} onBlur={e => e.target.style.borderColor = '#1A2540'} />
                  </div>
                </div>
              </>
            )}

            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Email Address *</label>
              <input required type="email" value={form.email} onChange={set('email')} placeholder="you@company.com" style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#0066FF'} onBlur={e => e.target.style.borderColor = '#1A2540'} />
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Password *</label>
              <div style={{ position: 'relative' }}>
                <input
                  required type={showPass ? 'text' : 'password'}
                  value={form.password} onChange={set('password')}
                  placeholder="Min 8 characters" minLength={8}
                  style={{ ...inputStyle, paddingRight: 44 }}
                  onFocus={e => e.target.style.borderColor = '#0066FF'}
                  onBlur={e => e.target.style.borderColor = '#1A2540'}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: 16,
                }}>
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#F87171',
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading} style={{
              background: loading ? '#1A2540' : '#0066FF', color: 'white',
              border: 'none', borderRadius: 10, padding: '13px',
              fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: loading ? 'none' : '0 0 24px rgba(0,102,255,0.4)',
              marginTop: 4,
            }}>
              {loading ? (
                <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  {mode === 'login' ? 'Signing in...' : 'Creating account...'}</>
              ) : (
                mode === 'login' ? '🔑 Sign In' : '✨ Create Account'
              )}
            </button>
          </form>

        </div>

        {/* DB info */}
        <div style={{
          marginTop: 16, textAlign: 'center',
          fontSize: 11, color: '#374151', fontFamily: 'monospace',
        }}>
          🔒 MongoDB persistence · JWT-protected dashboard
        </div>

        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <Link to="/" style={{ fontSize: 12, color: '#6B7280', textDecoration: 'none' }}>
            ← Back to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
