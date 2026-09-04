import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', company: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
        toast.success('Welcome back!');
      } else {
        await register(form.name, form.email, form.password, form.company);
        toast.success('Account created!');
      }
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setForm({ name: 'Demo Admin', email: 'admin@tatamotorsev.ai', password: 'demo1234', company: 'Tata Motors EV' });
    setMode('login');
  };

  return (
    <div className="min-h-screen bg-ev-darker flex items-center justify-center p-4 relative">
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-40" />
      <div className="absolute inset-0 bg-hero-glow" />

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-ev-blue rounded-xl flex items-center justify-center shadow-blue-glow">
              <Zap size={20} className="text-white" />
            </div>
            <span className="font-display font-bold text-white text-2xl">Tata<span className="text-ev-cyan">EV</span></span>
          </Link>
          <div className="font-display font-bold text-2xl text-white mb-1">
            {mode === 'login' ? 'Welcome back' : 'Get started free'}
          </div>
          <div className="text-gray-400 text-sm">
            {mode === 'login' ? 'Sign in to your dashboard' : 'Create your AI agent account'}
          </div>
        </div>

        {/* Toggle */}
        <div className="flex bg-ev-card border border-ev-border rounded-xl p-1 mb-6">
          {['login', 'register'].map(m => (
            <button key={m} onClick={() => setMode(m)} className={`flex-1 py-2 rounded-lg text-sm font-display font-medium capitalize transition-all ${mode === m ? 'bg-ev-blue text-white shadow-blue-glow' : 'text-gray-400 hover:text-white'}`}>
              {m === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        <div className="card p-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Full Name</label>
                  <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Your full name" className="input-field text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Company</label>
                  <input value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} placeholder="EV Company / Dealership Name" className="input-field text-sm" />
                </div>
              </>
            )}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Email Address</label>
              <input required type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="you@company.com" className="input-field text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Password</label>
              <div className="relative">
                <input required type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder={mode === 'register' ? 'Min. 6 characters' : 'Your password'} className="input-field text-sm pr-10" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <>{mode === 'login' ? 'Sign In' : 'Create Account'} <ArrowRight size={16} /></>}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-ev-border" /></div>
            <div className="relative flex justify-center text-xs text-gray-500 bg-ev-card px-2">or</div>
          </div>

          <button onClick={fillDemo} className="w-full py-2.5 border border-ev-cyan/30 rounded-lg text-ev-cyan text-sm hover:bg-ev-cyan/10 transition-colors font-medium">
            ⚡ Use Demo Credentials
          </button>
        </div>

        <div className="text-center mt-6">
          <Link to="/" className="text-xs text-gray-500 hover:text-white transition-colors">← Back to homepage</Link>
        </div>
      </div>
    </div>
  );
}
