import React from 'react';
import Navbar from '../components/Landing/Navbar';
import Hero from '../components/Landing/Hero';
import Features from '../components/Landing/Features';
import HowItWorks from '../components/Landing/HowItWorks';
import Testimonials from '../components/Landing/Testimonials';
import Pricing from '../components/Landing/Pricing';
import Contact from '../components/Landing/Contact';
import Footer from '../components/Landing/Footer';

// Benefits section inline
const benefits = [
  { stat: '3x', label: 'More leads converted', desc: 'AI qualifies and nurtures leads instantly, 24/7 — no delays, no missed follow-ups.' },
  { stat: '65%', label: 'Reduction in support costs', desc: 'Handle charging, service, and FAQ queries automatically without human agents.' },
  { stat: '240%', label: 'Increase in test ride bookings', desc: 'Smart booking automation with calendar sync and instant confirmation.' },
  { stat: '< 2s', label: 'Average response time', desc: 'Customers get answers instantly — no hold music, no waiting.' },
];

function Benefits() {
  return (
    <section className="py-24 bg-ev-dark relative overflow-hidden">
      <div className="absolute right-0 top-0 w-96 h-96 bg-ev-blue/5 rounded-full blur-3xl" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="section-label">Why TataEV AI</span>
          <h2 className="font-display font-bold text-4xl sm:text-5xl text-white mt-3 mb-4">
            Results that speak for themselves
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Every metric measured from real EV dealerships using our AI agent for 90+ days.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map(({ stat, label, desc }) => (
            <div key={stat} className="card p-6 text-center hover:-translate-y-1 transition-transform duration-200 border-ev-border group">
              <div className="font-display font-extrabold text-5xl gradient-text mb-2">{stat}</div>
              <div className="font-display font-semibold text-white text-base mb-3">{label}</div>
              <div className="text-gray-500 text-sm leading-relaxed">{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <Benefits />
      <Testimonials />
      <Pricing />
      <Contact />
      <Footer />
    </div>
  );
}
