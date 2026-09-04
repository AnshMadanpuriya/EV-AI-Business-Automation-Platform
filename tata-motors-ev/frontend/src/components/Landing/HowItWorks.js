import React from 'react';
import { MessageSquare, Cpu, CheckCircle } from 'lucide-react';

const steps = [
  {
    num: '01', icon: MessageSquare, color: 'text-ev-blue', glow: 'shadow-blue-glow',
    title: 'Customer Reaches Out',
    desc: 'A visitor arrives on your website, calls your number, or messages on WhatsApp. The AI agent activates instantly — no wait time, no hold music.',
    detail: 'Supports voice, chat, SMS, WhatsApp'
  },
  {
    num: '02', icon: Cpu, color: 'text-ev-cyan', glow: 'shadow-cyan-glow',
    title: 'AI Processes & Responds',
    desc: 'The message flows through n8n to our AI engine. Intent is detected, context is understood, and a personalized response is crafted in under 2 seconds.',
    detail: 'Powered by LLM + custom EV knowledge base'
  },
  {
    num: '03', icon: CheckCircle, color: 'text-ev-green', glow: '',
    title: 'Lead Captured & Action Taken',
    desc: 'Bookings are confirmed, leads are scored and saved to your CRM, and hot prospects are escalated to human agents with full conversation context.',
    detail: 'Auto-sync to MongoDB, CRM, calendar'
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-ev-darker relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-gradient-to-b from-transparent via-ev-border to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="section-label">How It Works</span>
          <h2 className="font-display font-bold text-4xl sm:text-5xl text-white mt-3 mb-4">
            From inquiry to conversion in{' '}
            <span className="gradient-text">3 steps</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">Powered by n8n workflows + AI — fully automated, fully auditable.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-16 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-px bg-gradient-to-r from-ev-blue via-ev-cyan to-ev-green" />

          {steps.map(({ num, icon: Icon, color, glow, title, desc, detail }, i) => (
            <div key={i} className="relative">
              <div className={`w-14 h-14 card ${glow} border flex items-center justify-center mx-auto mb-6 relative z-10`}>
                <Icon size={24} className={color} />
              </div>
              <div className="card p-6 text-center hover:-translate-y-1 transition-transform duration-200">
                <div className="font-mono text-xs text-gray-600 mb-3">{num}</div>
                <h3 className="font-display font-semibold text-white text-lg mb-3">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-4">{desc}</p>
                <div className="inline-block bg-ev-border/50 rounded-full px-3 py-1 text-xs text-gray-400 font-mono">{detail}</div>
              </div>
            </div>
          ))}
        </div>

        {/* n8n flow diagram */}
        <div className="mt-16 card p-6 border border-ev-blue/20">
          <div className="section-label text-center mb-6">n8n Workflow Preview</div>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {['Webhook Trigger', '→', 'AI Agent Node', '→', 'Intent Parser', '→', 'MongoDB Save', '→', 'Response Builder', '→', 'Send Reply'].map((item, i) => (
              item === '→' ? (
                <span key={i} className="text-ev-blue text-lg font-bold">→</span>
              ) : (
                <div key={i} className="bg-ev-darker border border-ev-border rounded-lg px-3 py-2 text-xs font-mono text-ev-cyan whitespace-nowrap">
                  {item}
                </div>
              )
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
