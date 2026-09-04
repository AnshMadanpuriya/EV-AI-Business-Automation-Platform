import React from 'react';
import { Star } from 'lucide-react';

const testimonials = [
  { name: 'Priya Sharma', title: 'Sales Head, EV Nation', avatar: 'PS', rating: 5, text: 'Within 3 months of deploying the AI agent, our test ride bookings went up by 240%. The AI handles objections better than some of our junior sales reps!', metric: '+240% test rides' },
  { name: 'Rajan Mehta', title: 'CEO, GreenDrive Motors', avatar: 'RM', rating: 5, text: 'We were losing leads after 9 PM. Now the AI captures and qualifies them overnight. We woke up to 47 new qualified leads on the first Monday after launch.', metric: '47 overnight leads' },
  { name: 'Anita Patel', title: 'Customer Experience, Volt Auto', avatar: 'AP', rating: 5, text: 'Charging support tickets dropped by 65% because the AI resolves most issues instantly. Our human team now focuses only on complex cases.', metric: '-65% support tickets' },
  { name: 'Suresh Kumar', title: 'Marketing Director, ElectraFleet', avatar: 'SK', rating: 5, text: 'The n8n integration with our HubSpot CRM was seamless. Every chat lead auto-populates with intent scores. Our sales team loves it.', metric: '100% CRM sync' },
  { name: 'Divya Nair', title: 'Operations Manager, ZapCars', avatar: 'DN', rating: 5, text: 'Setup took less than a day. The AI was trained on our specific vehicle catalog and FAQs. It answers technical questions accurately — even range calculations.', metric: '1-day setup' },
  { name: 'Amit Verma', title: 'Founder, ChargePoint India', avatar: 'AV', rating: 5, text: 'ROI was visible in week 2. The voice agent handles 300+ calls daily that would have required a team of 15. This is the future of EV sales.', metric: '300+ daily calls' },
];

export default function Testimonials() {
  return (
    <section className="py-24 bg-ev-darker overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="section-label">Testimonials</span>
          <h2 className="font-display font-bold text-4xl sm:text-5xl text-white mt-3 mb-4">Trusted by EV industry leaders</h2>
          <p className="text-gray-400 text-lg">Real results from real dealerships across India.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {testimonials.map(({ name, title, avatar, rating, text, metric }, i) => (
            <div key={i} className="card p-6 hover:-translate-y-1 transition-transform duration-200 flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-ev-blue to-ev-cyan rounded-full flex items-center justify-center text-white font-display font-bold text-sm flex-shrink-0">
                    {avatar}
                  </div>
                  <div>
                    <div className="font-display font-semibold text-white text-sm">{name}</div>
                    <div className="text-xs text-gray-500">{title}</div>
                  </div>
                </div>
                <div className="bg-ev-green/10 border border-ev-green/20 rounded-full px-2.5 py-1 text-xs font-mono text-ev-green whitespace-nowrap">{metric}</div>
              </div>

              <div className="flex gap-0.5 mb-3">
                {[...Array(rating)].map((_, i) => <Star key={i} size={12} className="fill-yellow-400 text-yellow-400" />)}
              </div>

              <p className="text-gray-400 text-sm leading-relaxed flex-1">"{text}"</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
