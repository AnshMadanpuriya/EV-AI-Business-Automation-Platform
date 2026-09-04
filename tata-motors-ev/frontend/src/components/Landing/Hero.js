import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Play, Mic, MessageSquare, TrendingUp, Zap } from 'lucide-react';
import BookingModal from './BookingModal';

const StatBadge = ({ value, label }) => (
  <div className="flex flex-col items-center">
    <span className="font-display font-bold text-2xl text-white">{value}</span>
    <span className="text-xs text-gray-500">{label}</span>
  </div>
);

export default function Hero() {
  const [showBooking, setShowBooking] = useState(false);

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-ev-darker">
      {/* Grid background */}
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-100" />
      {/* Glow */}
      <div className="absolute inset-0 bg-hero-glow" />
      {/* Scan line */}
      <div className="scan-line" />

      {/* Floating orbs */}
      <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-ev-blue/10 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-1/4 left-1/3 w-48 h-48 bg-ev-cyan/8 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-ev-blue/10 border border-ev-blue/30 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 bg-ev-green rounded-full animate-pulse" />
              <span className="section-label text-ev-blue">AI Agent Live</span>
            </div>

            <h1 className="font-display font-extrabold text-5xl sm:text-6xl lg:text-7xl leading-[1.05] text-white mb-6">
              24/7 AI Voice Agent{' '}
              <span className="gradient-text">for EV</span>{' '}
              Businesses
            </h1>

            <p className="text-gray-400 text-lg leading-relaxed mb-8 max-w-lg font-body">
              Automate every customer interaction — from sales inquiries and test ride bookings to charging support and service queries. Never miss a lead again.
            </p>

            <div className="flex flex-wrap gap-4 mb-10">
              <Link to="/login" className="btn-primary flex items-center gap-2 text-base">
                Get Started Free <ArrowRight size={18} />
              </Link>
              <button onClick={() => setShowBooking(true)} className="btn-secondary flex items-center gap-2 text-base">
                <Play size={16} className="fill-ev-cyan" /> Book a Demo
              </button>
            </div>

            {/* Stats */}
            <div className="flex gap-8 pt-6 border-t border-ev-border">
              <StatBadge value="98%" label="Resolution Rate" />
              <StatBadge value="3x" label="More Conversions" />
              <StatBadge value="24/7" label="Availability" />
              <StatBadge value="< 2s" label="Response Time" />
            </div>
          </div>

          {/* Right — Feature Cards */}
          <div className="relative hidden lg:block">
            <div className="relative w-full h-[520px]">
              {/* Main card */}
              <div className="absolute top-0 right-0 w-72 card p-5 bg-card-glow animate-float" style={{ animationDelay: '0s' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-ev-blue/20 rounded-lg flex items-center justify-center">
                    <Mic size={20} className="text-ev-blue" />
                  </div>
                  <div>
                    <div className="text-sm font-display font-semibold text-white">Voice Agent</div>
                    <div className="text-xs text-ev-green flex items-center gap-1"><span className="w-1.5 h-1.5 bg-ev-green rounded-full" />Active Call</div>
                  </div>
                </div>
                <div className="space-y-2">
                  {['Test ride booked for Nexon EV', 'Lead qualified: High intent', 'Follow-up scheduled'].map((t, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
                      <div className="w-1 h-1 bg-ev-cyan rounded-full" />{t}
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat preview */}
              <div className="absolute bottom-16 left-0 w-64 card p-4 animate-float" style={{ animationDelay: '1.5s' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 bg-ev-cyan/20 rounded-lg flex items-center justify-center">
                    <MessageSquare size={14} className="text-ev-cyan" />
                  </div>
                  <span className="text-xs font-display font-semibold text-white">Live Chat</span>
                  <span className="ml-auto text-xs text-gray-500">just now</span>
                </div>
                <div className="bg-ev-blue/15 rounded-lg p-2.5 mb-2 text-xs text-gray-300">What's the range of Nexon EV Max?</div>
                <div className="bg-ev-darker rounded-lg p-2.5 text-xs text-ev-cyan">Nexon EV Max offers up to 437 km range on a single charge with IP67 battery protection 🔋</div>
              </div>

              {/* Stats card */}
              <div className="absolute top-44 left-8 w-52 card p-4 animate-float" style={{ animationDelay: '3s' }}>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={14} className="text-ev-green" />
                  <span className="text-xs font-display font-semibold text-white">This Month</span>
                </div>
                <div className="text-2xl font-display font-bold text-white mb-1">+342</div>
                <div className="text-xs text-gray-500 mb-3">Qualified Leads</div>
                <div className="w-full bg-ev-border rounded-full h-1.5">
                  <div className="bg-gradient-to-r from-ev-blue to-ev-cyan h-1.5 rounded-full" style={{ width: '72%' }} />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Conversion</span><span className="text-ev-green">72%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showBooking && <BookingModal onClose={() => setShowBooking(false)} />}
    </section>
  );
}
