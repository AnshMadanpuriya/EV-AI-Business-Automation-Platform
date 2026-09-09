import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Car, Calculator, LogOut, User, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function CustomerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-ev-darker text-white">
      <header className="border-b border-ev-border bg-ev-card">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-5 flex items-center justify-between gap-4">
          <Link to="/" className="font-display text-xl font-bold flex items-center gap-2"><Zap className="text-ev-cyan" size={24} /> TataEV</Link>
          <button type="button" onClick={() => { logout(); navigate('/login', { replace: true }); }} className="flex items-center gap-2 text-sm text-gray-300 hover:text-white"><LogOut size={16} /> Sign out</button>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
        <p className="text-ev-cyan text-xs uppercase tracking-widest mb-4">Your dashboard</p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold">Welcome, {user?.name?.split(' ')[0] || 'there'}.</h1>
        <p className="text-gray-400 mt-4 max-w-xl leading-relaxed">Find an EV that fits your life. Compare your options, plan the cost and request a test drive from one place.</p>
        <div className="grid md:grid-cols-2 gap-5 mt-9">
          <a href="/#ev-explorer" className="rounded-2xl border border-ev-blue/50 bg-gradient-to-br from-ev-blue/20 to-ev-card p-7 hover:border-ev-cyan transition-colors">
            <Car size={30} className="text-ev-cyan mb-6" />
            <h2 className="text-xl font-semibold">Explore EVs & book a test drive</h2>
            <p className="text-gray-400 text-sm leading-relaxed mt-3">Browse models and send your preferred date and location. The dealership confirms the final slot.</p>
            <span className="inline-flex items-center gap-2 mt-6 text-ev-cyan text-sm font-semibold">Explore vehicles <ArrowUpRight size={17} /></span>
          </a>
          <a href="/#calculator" className="rounded-2xl border border-ev-border bg-ev-card p-7 hover:border-ev-cyan transition-colors">
            <Calculator size={30} className="text-ev-cyan mb-6" />
            <h2 className="text-xl font-semibold">Plan your EV budget</h2>
            <p className="text-gray-400 text-sm leading-relaxed mt-3">Estimate EMI, down payment and total interest before you decide.</p>
            <span className="inline-flex items-center gap-2 mt-6 text-ev-cyan text-sm font-semibold">Open EMI calculator <ArrowUpRight size={17} /></span>
          </a>
        </div>
        <div className="grid md:grid-cols-2 gap-5 mt-5">
          <section className="rounded-2xl border border-ev-border p-7">
            <h2 className="font-semibold flex items-center gap-2"><User size={18} className="text-gray-400" /> Your account</h2>
            <dl className="mt-5 space-y-3 text-sm">
              <div><dt className="text-gray-500">Name</dt><dd className="mt-1 break-words">{user?.name || '—'}</dd></div>
              <div><dt className="text-gray-500">Email</dt><dd className="mt-1 break-words">{user?.email || '—'}</dd></div>
              {user?.company && <div><dt className="text-gray-500">Company</dt><dd className="mt-1 break-words">{user.company}</dd></div>}
            </dl>
          </section>
          <section className="rounded-2xl border border-ev-border p-7">
            <h2 className="font-semibold">Running an EV business?</h2>
            <p className="text-gray-400 text-sm leading-relaxed mt-3">Explore chat agents, booking workflows and dealership tools when you are ready.</p>
            <a href="/#pricing" className="inline-flex items-center gap-2 text-sm text-ev-cyan mt-5">View optional business plans <ArrowUpRight size={16} /></a>
          </section>
        </div>
      </main>
    </div>
  );
}
