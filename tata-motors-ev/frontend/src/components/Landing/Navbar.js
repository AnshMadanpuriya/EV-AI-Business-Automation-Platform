import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); setOpen(false); };

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-ev-dark/95 backdrop-blur-xl border-b border-ev-border' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-ev-blue rounded-lg flex items-center justify-center group-hover:shadow-blue-glow transition-shadow">
              <Zap size={18} className="text-white" />
            </div>
            <span className="font-display font-bold text-white text-lg">Tata<span className="text-ev-cyan">EV</span></span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {['features', 'how-it-works', 'pricing', 'contact'].map(id => (
              <button key={id} onClick={() => scrollTo(id)}
                className="text-gray-400 hover:text-white text-sm font-medium transition-colors capitalize">
                {id.replace('-', ' ')}
              </button>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Link to="/dashboard" className="text-ev-cyan text-sm font-medium hover:text-white transition-colors">Dashboard</Link>
                <button onClick={() => { logout(); navigate('/'); }} className="btn-secondary text-sm px-4 py-2">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-400 hover:text-white text-sm transition-colors">Sign in</Link>
                <Link to="/login" className="btn-primary text-sm px-4 py-2">Get Started</Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button onClick={() => setOpen(!open)} className="md:hidden text-gray-400 hover:text-white">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-ev-card border-t border-ev-border px-4 py-4 flex flex-col gap-4 animate-slide-up">
          {['features', 'how-it-works', 'pricing', 'contact'].map(id => (
            <button key={id} onClick={() => scrollTo(id)} className="text-gray-400 hover:text-white text-sm font-medium text-left capitalize">{id.replace('-', ' ')}</button>
          ))}
          <Link to="/login" className="btn-primary text-sm text-center" onClick={() => setOpen(false)}>Get Started</Link>
        </div>
      )}
    </nav>
  );
}
