import React, { useState } from 'react';
import { Check, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const plans = [
  {
    name: 'Starter',
    price: { monthly: 4999, annual: 3999 },
    desc: 'Perfect for single-location EV dealers',
    features: ['500 AI conversations/mo', 'Chat agent only', 'Lead capture & CRM', 'Email notifications', 'Basic analytics', '5 team members', 'Email support'],
    cta: 'Start Free Trial',
    highlight: false,
  },
  {
    name: 'Growth',
    price: { monthly: 14999, annual: 11999 },
    desc: 'For growing EV dealerships & OEMs',
    features: ['5,000 AI conversations/mo', 'Voice + Chat agent', 'Advanced lead scoring', 'n8n workflow builder', 'Full analytics dashboard', 'Unlimited team members', 'CRM integrations', 'Priority support', 'Custom AI training'],
    cta: 'Get Started',
    highlight: true,
    badge: 'Most Popular',
  },
  {
    name: 'Enterprise',
    price: { monthly: null, annual: null },
    desc: 'For large EV companies & fleets',
    features: ['Unlimited conversations', 'Multi-location support', 'Custom voice persona', 'White-label solution', 'Dedicated AI model', 'SLA guarantee', 'On-premise option', 'Dedicated account manager', 'Custom integrations'],
    cta: 'Contact Sales',
    highlight: false,
  },
];

export default function Pricing() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="py-24 bg-ev-dark relative">
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-30" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="section-label">Pricing</span>
          <h2 className="font-display font-bold text-4xl sm:text-5xl text-white mt-3 mb-4">Simple, transparent pricing</h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto mb-6">No hidden fees. Cancel anytime.</p>

          {/* Toggle */}
          <div className="inline-flex items-center gap-3 bg-ev-card border border-ev-border rounded-full p-1">
            <button onClick={() => setAnnual(false)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${!annual ? 'bg-ev-blue text-white' : 'text-gray-400'}`}>Monthly</button>
            <button onClick={() => setAnnual(true)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${annual ? 'bg-ev-blue text-white' : 'text-gray-400'}`}>
              Annual <span className="text-ev-green text-xs ml-1">-20%</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map(({ name, price, desc, features, cta, highlight, badge }) => (
            <div key={name} className={`card p-7 relative flex flex-col ${highlight ? 'border-ev-blue shadow-blue-glow scale-[1.02]' : 'border-ev-border'} hover:-translate-y-1 transition-transform duration-200`}>
              {badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-ev-blue text-white text-xs font-display font-bold px-4 py-1 rounded-full flex items-center gap-1">
                  <Zap size={10} className="fill-white" /> {badge}
                </div>
              )}
              <div className="mb-6">
                <div className="font-display font-bold text-white text-xl mb-1">{name}</div>
                <div className="text-gray-500 text-sm mb-4">{desc}</div>
                {price.monthly ? (
                  <div className="flex items-baseline gap-1">
                    <span className="font-display font-extrabold text-4xl text-white">₹{(annual ? price.annual : price.monthly).toLocaleString()}</span>
                    <span className="text-gray-500 text-sm">/mo</span>
                  </div>
                ) : (
                  <div className="font-display font-extrabold text-4xl text-white">Custom</div>
                )}
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-300">
                    <Check size={14} className="text-ev-green mt-0.5 flex-shrink-0" /> {f}
                  </li>
                ))}
              </ul>

              <Link to="/login" className={`text-center py-3 rounded-lg font-display font-semibold text-sm transition-all ${highlight ? 'btn-primary' : 'btn-secondary'}`}>
                {cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
