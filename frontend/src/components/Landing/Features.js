import React from 'react';
import { MessageSquare, Calendar, Zap, Shield, BarChart3, Phone, Clock } from 'lucide-react';

const features = [
  { icon: Mic, title: 'AI Voice Calling', desc: 'Autonomous outbound and inbound calling with natural conversation flow, intent detection, and real-time escalation.', color: 'text-ev-blue', bg: 'bg-ev-blue/10 border-ev-blue/20' },
  { icon: MessageSquare, title: 'Omni-Channel Chat', desc: 'Website chatbot, WhatsApp, and SMS — unified AI agent handles all channels simultaneously.', color: 'text-ev-cyan', bg: 'bg-ev-cyan/10 border-ev-cyan/20' },
  { icon: Calendar, title: 'Smart Booking', desc: 'Automated test ride scheduling, service appointments, and demo bookings synced to your calendar.', color: 'text-ev-green', bg: 'bg-ev-green/10 border-ev-green/20' },
  { icon: Zap, title: 'Lead Qualification', desc: 'AI scores and prioritizes leads based on intent, budget signals, and engagement — hot leads escalated instantly.', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20' },
  { icon: Shield, title: 'Charging Support', desc: 'Handle charging troubleshooting, station locator queries, and home charger installation scheduling 24/7.', color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/20' },
  { icon: BarChart3, title: 'Live Analytics', desc: 'Real-time dashboard with conversion tracking, response metrics, and ROI reports across all touchpoints.', color: 'text-pink-400', bg: 'bg-pink-400/10 border-pink-400/20' },
  { icon: Phone, title: 'CRM Integration', desc: 'Push leads, notes, and call recordings to Salesforce, HubSpot, or your custom CRM via n8n automation.', color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/20' },
  { icon: Clock, title: 'Always On', desc: 'Never miss a midnight inquiry. AI handles peak hours and off-hours with zero fatigue, zero delays.', color: 'text-teal-400', bg: 'bg-teal-400/10 border-teal-400/20' },
];

export default function Features() {
  return (
    <section id="features" className="py-24 bg-ev-dark relative">
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-40" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="section-label">Features</span>
          <h2 className="font-display font-bold text-4xl sm:text-5xl text-white mt-3 mb-4">
            Everything your EV business needs
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            One AI platform to handle every customer touchpoint — from first inquiry to post-purchase support.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map(({ icon: Icon, title, desc, color, bg }, i) => (
            <div key={i} className={`card p-6 border ${bg} hover:scale-[1.02] transition-transform duration-200 group cursor-default`}>
              <div className={`w-10 h-10 rounded-lg ${bg} border flex items-center justify-center mb-4`}>
                <Icon size={20} className={color} />
              </div>
              <h3 className="font-display font-semibold text-white text-base mb-2">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
