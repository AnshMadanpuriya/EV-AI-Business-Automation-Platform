import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, Github, Twitter, Linkedin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-ev-darker border-t border-ev-border py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-ev-blue rounded-lg flex items-center justify-center"><Zap size={16} className="text-white" /></div>
              <span className="font-display font-bold text-white">Tata<span className="text-ev-cyan">EV</span></span>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed">AI-powered voice and chat agent for the future of electric mobility.</p>
            <div className="flex gap-3 mt-4">
              {[Twitter, Github, Linkedin].map((Icon, i) => (
                <button key={i} className="w-8 h-8 border border-ev-border rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:border-ev-blue transition-colors">
                  <Icon size={14} />
                </button>
              ))}
            </div>
          </div>
          {[
            { title: 'Product', links: ['Features', 'How It Works', 'Pricing', 'Integrations', 'API Docs'] },
            { title: 'Company', links: ['About', 'Blog', 'Careers', 'Press', 'Contact'] },
            { title: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Security', 'GDPR'] },
          ].map(({ title, links }) => (
            <div key={title}>
              <div className="font-display font-semibold text-white text-sm mb-4">{title}</div>
              <ul className="space-y-2">
                {links.map(link => <li key={link}><a href="#" className="text-gray-500 hover:text-white text-sm transition-colors">{link}</a></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-ev-border pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-gray-600 text-xs">© 2025 Tata Motors EV Agent. All rights reserved.</div>
          <div className="text-gray-600 text-xs font-mono">Built with React · Node.js · MongoDB · n8n</div>
        </div>
      </div>
    </footer>
  );
}
