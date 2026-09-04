import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Play, Mic } from 'lucide-react';

import BookingModal from './BookingModal';
import EVCarScene from '../ThreeD/EVCarScene';

const StatBadge = ({ value, label }) => (
  <div>
    <div className="font-display font-bold text-xl sm:text-2xl text-white">
      {value}
    </div>

    <div className="text-xs text-gray-500 mt-1">
      {label}
    </div>
  </div>
);

export default function Hero() {
  const [showBooking, setShowBooking] = useState(false);

  const openVoiceAgent = () => {
    const voiceButton = document.getElementById('voice-agent-fab');

    if (voiceButton) {
      voiceButton.click();
    }
  };

  return (
    <section className="relative min-h-screen overflow-hidden bg-ev-darker">
      {/* Grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,102,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,102,255,0.06) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage:
            'linear-gradient(to bottom, rgba(0,0,0,1), transparent 90%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, rgba(0,0,0,1), transparent 90%)',
        }}
      />

      {/* Main glow */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-ev-blue/10 rounded-full blur-[130px] pointer-events-none" />

      {/* Scan line */}
      <div className="absolute top-24 left-0 right-0 h-px bg-gradient-to-r from-transparent via-ev-cyan/40 to-transparent pointer-events-none" />

      {/* Floating glow orbs */}
      <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-ev-blue/10 rounded-full blur-3xl animate-pulse-slow pointer-events-none" />

      <div
        className="absolute bottom-1/4 left-1/3 w-48 h-48 bg-ev-cyan/10 rounded-full blur-3xl animate-pulse-slow pointer-events-none"
        style={{ animationDelay: '2s' }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div className="animate-fade-in">
            {/* Live badge */}
            <div className="inline-flex items-center gap-2 bg-ev-blue/10 border border-ev-blue/30 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 bg-ev-green rounded-full animate-pulse" />

              <span className="section-label text-ev-blue">
                AI Agent Live
              </span>
            </div>

            {/* Main heading */}
            <h1 className="font-display font-extrabold text-5xl sm:text-6xl lg:text-7xl leading-[1.05] text-white mb-6">
              24/7 AI Voice Agent{' '}
              <span className="gradient-text">for EV</span>{' '}
              Businesses
            </h1>

            {/* Description */}
            <p className="text-gray-400 text-lg leading-relaxed mb-8 max-w-lg font-body">
              Automate every customer interaction — from sales inquiries
              and test ride bookings to charging support and service
              queries. Never miss a lead again.
            </p>

            {/* Buttons */}
            <div className="flex flex-wrap gap-4 mb-10">
              <Link
                to="/login"
                className="btn-primary flex items-center gap-2 text-base"
              >
                Get Started Free
                <ArrowRight size={18} />
              </Link>

              <button
                type="button"
                onClick={() => setShowBooking(true)}
                className="btn-secondary flex items-center gap-2 text-base"
              >
                <Play size={16} className="fill-ev-cyan" />
                Book a Demo
              </button>

              <button
                type="button"
                onClick={openVoiceAgent}
                className="flex items-center gap-2 text-base font-display font-semibold px-6 py-3 rounded-lg transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(255,107,0,0.15), rgba(255,107,0,0.05))',
                  border: '1px solid rgba(255,107,0,0.4)',
                  color: '#FF8C40',
                  boxShadow: '0 0 20px rgba(255,107,0,0.15)',
                }}
              >
                <Mic size={18} className="text-orange-400" />
                Talk to AI Agent
              </button>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 pt-6 border-t border-ev-border">
              <StatBadge
                value="98%"
                label="Resolution Rate"
              />

              <StatBadge
                value="3x"
                label="More Conversions"
              />

              <StatBadge
                value="24/7"
                label="Availability"
              />

              <StatBadge
                value="< 2s"
                label="Response Time"
              />
            </div>
          </div>

          {/* Right-side 3D EV */}
          <div className="relative w-full">
            <div className="absolute -inset-6 bg-ev-blue/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative">
              <EVCarScene />
            </div>
          </div>
        </div>
      </div>

      {/* Booking modal */}
      {showBooking && (
        <BookingModal
          onClose={() => setShowBooking(false)}
        />
      )}
    </section>
  );
}
