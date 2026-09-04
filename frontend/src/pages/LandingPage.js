import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useTransform,
  AnimatePresence,
} from 'framer-motion';
import { EVExplorer, EVComparator } from '../components/Landing/EvFeatures';
// ============================================================
// CONSTANTS
// ============================================================
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// ============================================================
// REUSABLE ANIMATION VARIANTS
// ============================================================
const fadeUp = {
  hidden: { opacity: 0, y: 58, scale: 0.98, filter: 'blur(10px)' },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] },
  },
};

const fadeLeft = {
  hidden: { opacity: 0, x: -72, rotateY: -5, filter: 'blur(10px)' },
  visible: { opacity: 1, x: 0, rotateY: 0, filter: 'blur(0px)', transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] } },
};

const fadeRight = {
  hidden: { opacity: 0, x: 72, rotateY: 5, filter: 'blur(10px)' },
  visible: { opacity: 1, x: 0, rotateY: 0, filter: 'blur(0px)', transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] } },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6, ease: 'easeOut' } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9, filter: 'blur(8px)' },
  visible: { opacity: 1, scale: 1, filter: 'blur(0px)', transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 42, scale: 0.96, filter: 'blur(7px)' },
  visible: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

const featureCardVariants = {
  hidden: { opacity: 0, y: 56, scale: 0.94, rotateX: 8 },
  visible: (index) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    rotateX: 0,
    transition: {
      delay: index * 0.075,
      duration: 0.65,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

const heroCopyVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.085, delayChildren: 0.08 } },
  exit: { transition: { staggerChildren: 0.035, staggerDirection: -1 } },
};

const heroItemVariants = {
  hidden: { opacity: 0, y: 30, filter: 'blur(9px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.72, ease: [0.22, 1, 0.36, 1] },
  },
  exit: { opacity: 0, y: -18, filter: 'blur(6px)', transition: { duration: 0.28 } },
};

const processCardVariants = {
  hidden: { opacity: 0, y: 76, scale: 0.9, rotateX: 12, filter: 'blur(10px)' },
  visible: (index) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    rotateX: 0,
    filter: 'blur(0px)',
    transition: {
      delay: index * 0.16,
      duration: 0.82,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

// ============================================================
// REUSABLE ANIMATED SECTION WRAPPER
// ============================================================
function AnimatedSection({ children, variants = fadeUp, className, style, once = false }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once, margin: '-10% 0px -10% 0px' });
  return (
    <motion.div
      ref={ref}
      variants={variants}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      className={className}
      style={{ willChange: 'transform, opacity, filter', ...style }}
    >
      {children}
    </motion.div>
  );
}

// Stagger wrapper — animates children with stagger
function StaggerSection({ children, style, className }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: false, margin: '-8% 0px -8% 0px' });
  return (
    <motion.div
      ref={ref}
      variants={staggerContainer}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      style={style}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================================
// NAVBAR
// ============================================================
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);
  const scrollTo = (id) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); setMenuOpen(false); };

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{
        position: 'fixed', top: 0, width: '100%', zIndex: 100,
        background: scrolled ? 'rgba(8,12,20,0.97)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid #1A2540' : 'none',
        transition: 'background 0.3s, border 0.3s',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, background: '#0066FF', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⚡</div>
          <span style={{ fontWeight: 800, fontSize: 18, color: 'white' }}>Tata<span style={{ color: '#00D4FF' }}>EV</span></span>
        </div>
        <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
          {['features', 'voice-agent', 'calculator', 'pricing', 'contact'].map(id => (
            <button key={id} onClick={() => scrollTo(id)} style={{
              background: 'none', border: 'none', color: '#9CA3AF', fontSize: 13,
              fontWeight: 500, cursor: 'pointer', textTransform: 'capitalize'
            }}>{id.replace('-', ' ')}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/login" style={{
            background: '#0066FF', color: 'white', border: 'none',
            borderRadius: 8, padding: '8px 18px', fontSize: 13,
            fontWeight: 700, cursor: 'pointer', textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center'
          }}>Get Started</Link>
        </div>
      </div>
    </motion.nav>
  );
}

// ============================================================
// HERO — Fade + Slide Up
// ============================================================
function Hero() {
  const slides = [
    {
      image: '/images/ev-city-drive.webp',
      navLabel: 'Intelligence',
      eyebrow: 'Built for the EV revolution',
      title: 'Intelligence that moves with you.',
      description: 'Compare electric vehicles, understand real-world range and turn every customer question into a confident next step.',
      metric: '24/7', metricLabel: 'AI EV guidance', accent: '#27D8FF',
    },
    {
      image: '/images/ev-mountain-drive.webp',
      navLabel: 'Freedom',
      eyebrow: 'Range without the guesswork',
      title: 'Go farther. Choose smarter.',
      description: 'Personalised range, charging and ownership insights help every driver find an EV that fits their life.',
      metric: '< 2 sec', metricLabel: 'Instant answers', accent: '#74F0C2',
    },
    {
      image: '/images/ev-tunnel-drive.webp',
      navLabel: 'Automation',
      eyebrow: 'One connected experience',
      title: 'Turn interest into a booked drive.',
      description: 'EVA, WhatsApp, and n8n coordinate every lead—from the first question to a confirmed test drive and timely team follow-up.',
      metric: '3x', metricLabel: 'Faster follow-up', accent: '#A78BFA',
    },
  ];
  const [activeSlide, setActiveSlide] = useState(0);
  const heroRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const visualY = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : 105]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : -72]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.72, 1], [1, 0.92, 0.12]);

  useEffect(() => {
    const timer = window.setInterval(
      () => setActiveSlide((current) => (current + 1) % slides.length),
      6500,
    );
    return () => window.clearInterval(timer);
  }, [slides.length]);

  const scrollTo = (id) => {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: 'smooth' });
  };

  const slide = slides[activeSlide];
  return (
    <section ref={heroRef} className="premium-hero" aria-label="Electric vehicle showcase">
      <motion.div className="premium-hero__visual" style={{ y: visualY }}>
        <AnimatePresence mode="sync">
          <motion.div
            key={slide.image}
            className="premium-hero__image"
            style={{ backgroundImage: `url(${slide.image})` }}
            initial={{
              opacity: 0,
              scale: reduceMotion ? 1 : 1.12,
              x: reduceMotion ? 0 : activeSlide % 2 === 0 ? '1.5%' : '-1.5%',
            }}
            animate={{ opacity: 1, scale: 1.025, x: 0 }}
            exit={{ opacity: 0, scale: 1.045 }}
            transition={{
              opacity: { duration: reduceMotion ? 0.15 : 1.05 },
              scale: { duration: reduceMotion ? 0.15 : 7.2, ease: 'linear' },
              x: { duration: reduceMotion ? 0.15 : 7.2, ease: 'linear' },
            }}
          />
        </AnimatePresence>
      </motion.div>
      <div className="premium-hero__shade" />
      <div className="premium-hero__road-glow" style={{ '--slide-accent': slide.accent }} />

      <motion.div className="premium-hero__content" style={{ y: contentY, opacity: contentOpacity }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSlide}
            className="premium-hero__copy"
            variants={heroCopyVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <motion.div variants={heroItemVariants} className="premium-hero__eyebrow"><span />{slide.eyebrow}</motion.div>
            <motion.h1 variants={heroItemVariants}>{slide.title}</motion.h1>
            <motion.p variants={heroItemVariants}>{slide.description}</motion.p>
            <motion.div variants={heroItemVariants} className="premium-hero__actions">
              <button type="button" onClick={() => scrollTo('ev-explorer')} className="premium-hero__primary">Explore EVs <span>↗</span></button>
              <button type="button" onClick={() => scrollTo('voice-agent')} className="premium-hero__secondary">Talk to EVA <span className="premium-hero__pulse" /></button>
            </motion.div>
          </motion.div>
        </AnimatePresence>

        <div className="premium-hero__footer">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${slide.metric}-${slide.metricLabel}`}
              className="premium-hero__metric"
              initial={{ opacity: 0, x: -18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <strong>{slide.metric}</strong><span>{slide.metricLabel}</span>
            </motion.div>
          </AnimatePresence>
          <div className="premium-hero__nav" aria-label="Hero slides">
            {slides.map((item, index) => (
              <button key={item.image} type="button" onClick={() => setActiveSlide(index)} className={index === activeSlide ? 'is-active' : ''} aria-label={`Show slide ${index + 1}`}>
                <span>{String(index + 1).padStart(2, '0')} <b>{item.navLabel}</b></span><i />
              </button>
            ))}
          </div>
          <div className="premium-hero__scroll">Scroll to discover <span>↓</span></div>
        </div>
      </motion.div>
    </section>
  );
}

// ============================================================
// FEATURES — Staggered cards from bottom
// ============================================================
function Features() {
  const items = [
    { icon: '🎙️', title: 'AI Voice Calling', desc: 'Natural inbound and outbound conversations that sound helpful—not scripted.', color: '#3B82F6' },
    { icon: '💬', title: 'Omni-Channel Chat', desc: 'One consistent assistant across your website, WhatsApp, and SMS.', color: '#22D3EE' },
    { icon: '📅', title: 'Smart Booking', desc: 'Turn customer intent into confirmed test rides and service appointments.', color: '#34D399' },
    { icon: '⚡', title: 'Lead Qualification', desc: 'Detect high-intent conversations and route the right leads instantly.', color: '#FBBF24' },
    { icon: '🔋', title: 'Charging Support', desc: 'Resolve everyday battery, charging, and station questions around the clock.', color: '#A78BFA' },
    { icon: '📊', title: 'Live Analytics', desc: 'Track response time, conversion performance, and campaign outcomes.', color: '#F472B6' },
    { icon: '🔗', title: 'CRM Integration', desc: 'Send enriched lead data to your CRM automatically through n8n.', color: '#FB923C' },
    { icon: '🕐', title: 'Always On', desc: 'Fast, consistent assistance with no missed follow-up—even after hours.', color: '#2DD4BF' },
  ];

  const ref = useRef(null);
  const inView = useInView(ref, { once: false, margin: '-80px' });

  return (
    <section id="features" className="feature-showcase">
      <motion.div className="feature-showcase__orb feature-showcase__orb--one" animate={{ x: [0, 70, 0], y: [0, -35, 0] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="feature-showcase__orb feature-showcase__orb--two" animate={{ x: [0, -60, 0], y: [0, 45, 0] }} transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }} />
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Header */}
        <AnimatedSection className="feature-showcase__header">
          <div className="feature-showcase__label"><span />Platform capabilities<span /></div>
          <h2>Every EV conversation.<br /><em>One intelligent system.</em></h2>
          <p>Connect voice, chat, bookings, automation, and analytics in a customer journey that never loses momentum.</p>
        </AnimatedSection>

        {/* Staggered grid */}
        <motion.div
          ref={ref}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="feature-showcase__grid"
        >
          {items.map(({ icon, title, desc, color }, index) => (
            <motion.div
              key={title}
              custom={index}
              variants={featureCardVariants}
              whileHover={{ y: -10, scale: 1.015, transition: { duration: 0.25 } }}
              className="feature-showcase__card"
              style={{ '--feature-color': color }}
            >
              <div className="feature-showcase__number">{String(index + 1).padStart(2, '0')}</div>
              <motion.div className="feature-showcase__icon" whileHover={{ rotate: [0, -7, 7, 0], scale: 1.08 }}>{icon}</motion.div>
              <h3>{title}</h3>
              <p>{desc}</p>
              <div className="feature-showcase__line" />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================
// HOW IT WORKS — Cards slide up with stagger
// ============================================================
function HowItWorks() {
  const steps = [
    { num: '01', icon: '💬', title: 'Customer Reaches Out', desc: 'Chat, voice, or WhatsApp activates the AI instantly—without queues or missed intent.', color: '#32B7FF' },
    { num: '02', icon: '🧠', title: 'AI Processes via n8n', desc: 'Intent, context, and lead signals move through the right automation in seconds.', color: '#A78BFA' },
    { num: '03', icon: '✅', title: 'Lead Captured & Converted', desc: 'Bookings are confirmed, lead data is saved, and hot prospects reach your team.', color: '#35E6A7' },
  ];

  const ref = useRef(null);
  const inView = useInView(ref, { once: false, margin: '-12% 0px -12% 0px' });

  return (
    <section id="how-it-works" className="how-showcase">
      <motion.div
        className="how-showcase__orb how-showcase__orb--one"
        animate={{ x: [0, 70, 0], y: [0, -34, 0], scale: [1, 1.12, 1] }}
        transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="how-showcase__orb how-showcase__orb--two"
        animate={{ x: [0, -55, 0], y: [0, 42, 0], scale: [1.08, 0.92, 1.08] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div ref={ref} className="how-showcase__inner">

        <AnimatedSection className="how-showcase__header">
          <div className="how-showcase__label"><span />How It Works<span /></div>
          <h2>
            From inquiry to conversion in{' '}
            <span>3 steps</span>
          </h2>
          <p>Every interaction moves through one connected, visible customer journey.</p>
        </AnimatedSection>

        <motion.div
          className="how-showcase__grid"
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
        >
          <motion.div
            className="how-showcase__connector"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={inView ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }}
            transition={{ duration: 1.15, delay: 0.38, ease: [0.22, 1, 0.36, 1] }}
          />
          {steps.map(({ num, icon, title, desc, color }, index) => (
            <motion.div
              key={num}
              custom={index}
              variants={processCardVariants}
              whileHover={{ y: -12, scale: 1.018, rotateX: -1.5, transition: { duration: 0.28 } }}
              className="how-showcase__card"
              style={{ '--step-color': color }}
            >
              <div className="how-showcase__topline"><span>STEP</span><strong>{num}</strong></div>
              <motion.div
                className="how-showcase__icon"
                animate={inView ? { y: [0, -7, 0], rotate: [0, -3, 3, 0] } : {}}
                transition={{ duration: 3.6 + index * 0.35, repeat: Infinity, ease: 'easeInOut', delay: index * 0.4 }}
              >
                {icon}
              </motion.div>
              <h3>{title}</h3>
              <p>{desc}</p>
              <div className="how-showcase__signal"><i /><i /><i /></div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================
// VOICE AGENT SECTION — Left slides in, right slides in
// ============================================================
function VoiceAgentSection() {
  const capabilities = [
    'Book test rides by just speaking',
    'Get real-time EV range & pricing',
    'Resolve charging issues instantly',
    'Schedule service appointments',
    'Qualify and capture your details',
    'Escalate to human agent if needed',
  ];

  const ref = useRef(null);
  const inView = useInView(ref, { once: false, margin: '-12% 0px -12% 0px' });

  return (
    <section id="voice-agent" className="voice-showcase">
      <motion.div
        className="voice-showcase__halo"
        style={{ x: '-50%', y: '-50%' }}
        animate={{ scale: [0.94, 1.08, 0.94], opacity: [0.34, 0.58, 0.34], rotate: [0, 8, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="voice-showcase__rings"><i /><i /><i /></div>

      <div className="voice-showcase__inner" ref={ref}>

        {/* Header */}
        <AnimatedSection className="voice-showcase__header">
          <div className="voice-showcase__badge">
            <span />
            ElevenLabs Voice AI · Live
          </div>
          <h2>
            Talk to our AI Agent —{' '}
            <span>Right Now</span>
          </h2>
          <p>
            Powered by ElevenLabs ConvAI. Have a real voice conversation — no typing needed.
          </p>
        </AnimatedSection>

        <div className="voice-showcase__layout">

          {/* Widget — slides from left */}
          <motion.div
            variants={fadeLeft}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            whileHover={{ y: -7, rotateY: 1.2, transition: { duration: 0.3 } }}
            className="voice-showcase__widget"
          >
            <div style={{ padding: '16px 20px', background: 'rgba(255,107,0,0.04)', borderBottom: '1px solid rgba(255,107,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, background: 'rgba(255,107,0,0.15)', border: '1px solid rgba(255,107,0,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🎙️</div>
                <div>
                  <div style={{ fontWeight: 700, color: 'white', fontSize: 14 }}>TataEV Voice Agent</div>
                  <div style={{ fontSize: 10, color: '#FF8C40' }}>Powered by ElevenLabs ConvAI</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 7, height: 7, background: '#00FF88', borderRadius: '50%', animation: 'pulse 2s infinite', display: 'inline-block' }} />
                <span style={{ fontSize: 10, color: '#00FF88' }}>Live</span>
              </div>
            </div>
            <div style={{ padding: 20, background: '#080C14', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 48 }}>
                {[30,55,80,60,90,45,70,85,40,65,50,75,35,90,60].map((h, i) => (
                  <div key={i} style={{ width: 3, borderRadius: 2, background: `rgba(255,107,0,${0.35 + (h/100)*0.65})`, height: h * 0.48, animation: `barwave ${0.9+(i%3)*0.2}s ease-in-out infinite`, animationDelay: `${i*0.08}s`, transformOrigin: 'center' }} />
                ))}
              </div>
              <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>Use “Start a call” in the bottom-right corner</p>
            </div>
          </motion.div>

          {/* Capabilities — slides from right */}
          <motion.div
            variants={fadeRight}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            className="voice-showcase__copy"
          >
            <h3 style={{ fontSize: 'clamp(22px,3vw,32px)', fontWeight: 800, color: 'white', marginBottom: 24 }}>
              Just speak naturally —<br /><span style={{ color: '#9CA3AF' }}>the AI handles the rest</span>
            </h3>
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate={inView ? 'visible' : 'hidden'}
              style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}
            >
              {capabilities.map((cap, i) => (
                <motion.div key={i} variants={staggerItem} whileHover={{ x: 7 }} className="voice-showcase__capability">
                  <span>✓</span>
                  <span style={{ fontSize: 14, color: '#D1D5DB' }}>{cap}</span>
                </motion.div>
              ))}
            </motion.div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {[['<1s','Voice response'],['40+','Languages'],['99.9%','Uptime']].map(([v,l]) => (
                <div key={l} style={{ background: '#0D1422', border: '1px solid #1A2540', borderRadius: 12, padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#FF8C40' }}>{v}</div>
                  <div style={{ fontSize: 10, color: '#6B7280', marginTop: 3 }}>{l}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// EV LOAN EMI CALCULATOR — Scale + Fade
// ============================================================
function CostCalculator() {
  const defaults = { vehiclePrice: 1499000, downPayment: 299800, interestRate: 9.25, tenureYears: 5 };

  const calculateEmi = (values) => {
    const vehiclePrice = Math.max(Number(values.vehiclePrice) || 0, 0);
    const downPayment = Math.min(Math.max(Number(values.downPayment) || 0, 0), vehiclePrice);
    const annualRate = Math.max(Number(values.interestRate) || 0, 0);
    const months = Math.max(Math.round((Number(values.tenureYears) || 1) * 12), 1);
    const loanAmount = Math.max(vehiclePrice - downPayment, 0);
    const monthlyRate = annualRate / 1200;
    const growth = Math.pow(1 + monthlyRate, months);
    const monthlyEmi = loanAmount === 0
      ? 0
      : monthlyRate === 0
        ? loanAmount / months
        : (loanAmount * monthlyRate * growth) / (growth - 1);
    const totalLoanPayment = monthlyEmi * months;
    const totalInterest = Math.max(totalLoanPayment - loanAmount, 0);

    return {
      vehiclePrice,
      downPayment,
      downPaymentPercent: vehiclePrice ? (downPayment / vehiclePrice) * 100 : 0,
      loanAmount,
      annualRate,
      months,
      monthlyEmi,
      totalInterest,
      totalLoanPayment,
      totalOutflow: downPayment + totalLoanPayment,
      suggestedIncome: monthlyEmi / 0.4,
    };
  };

  const [form, setForm] = useState(defaults);
  const [result, setResult] = useState(() => calculateEmi(defaults));
  const [calculationKey, setCalculationKey] = useState(0);
  const set = key => event => setForm(previous => ({ ...previous, [key]: event.target.value }));
  const fmt = value => Math.round(Number(value) || 0).toLocaleString('en-IN');

  const calculate = () => {
    setResult(calculateEmi(form));
    setCalculationKey(key => key + 1);
  };

  const setDownPaymentPercent = (percent) => {
    const vehiclePrice = Math.max(Number(form.vehiclePrice) || 0, 0);
    setForm(previous => ({ ...previous, downPayment: Math.round(vehiclePrice * percent / 100) }));
  };

  const inputStyle = {
    width: '100%', background: '#080C14', border: '1px solid #24324D', borderRadius: 10,
    padding: '12px 42px 12px 34px', color: 'white', fontSize: 14, outline: 'none', boxSizing: 'border-box',
  };

  const numberInput = (label, key, prefix, suffix, step = 1) => (
    <div style={{ marginBottom: 17 }}>
      <label htmlFor={`emi-${key}`} style={{ display: 'block', fontSize: 12, color: '#CBD5E1', marginBottom: 7, fontWeight: 600 }}>{label}</label>
      <div style={{ position: 'relative' }}>
        {prefix && <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#00D4FF', fontSize: 14, fontWeight: 800 }}>{prefix}</span>}
        <input id={`emi-${key}`} type="number" value={form[key]} onChange={set(key)} min={0} step={step} style={inputStyle} />
        {suffix && <span style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', color: '#7C8AA5', fontSize: 11 }}>{suffix}</span>}
      </div>
    </div>
  );

  return (
    <section id="calculator" style={{ padding: '96px 24px', background: '#050810' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        <AnimatedSection style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(0,102,255,0.1)', border: '1px solid rgba(0,102,255,0.25)', borderRadius: 20, padding: '5px 14px', marginBottom: 14 }}>
            <span>🧮</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#60A5FA', letterSpacing: '0.1em', textTransform: 'uppercase' }}>EV EMI Calculator</span>
          </div>
          <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, color: 'white', marginBottom: 12 }}>
            Plan your EV with a{' '}
            <span style={{ background: 'linear-gradient(135deg,#0066FF,#00D4FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>clear monthly EMI</span>
          </h2>
          <p style={{ fontSize: 15, color: '#9CA3AF' }}>Enter your dealer quotation and loan details to get an instant, transparent estimate.</p>
        </AnimatedSection>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 22, alignItems: 'stretch' }}>
          <AnimatedSection variants={fadeLeft} style={{ background: '#0D1422', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 18, padding: 'clamp(20px,3vw,30px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <span style={{ fontSize: 24 }}>🚙</span>
              <div><div style={{ fontWeight: 700, color: 'white', fontSize: 15 }}>Loan details</div><div style={{ fontSize: 11, color: '#7C8AA5' }}>Use the latest on-road quotation from your dealer</div></div>
            </div>
            {numberInput('EV on-road price', 'vehiclePrice', '₹', null, 1000)}
            {numberInput('Down payment', 'downPayment', '₹', null, 1000)}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '-7px 0 18px' }}>
              {[10, 20, 30].map(percent => (
                <button key={percent} type="button" onClick={() => setDownPaymentPercent(percent)} style={{
                  background: 'rgba(0,102,255,0.1)', border: '1px solid rgba(96,165,250,0.25)', color: '#93C5FD',
                  padding: '6px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                }}>{percent}% down</button>
              ))}
            </div>
            {numberInput('Annual interest rate', 'interestRate', null, '% p.a.', 0.05)}
            <div style={{ marginBottom: 20 }}>
              <label htmlFor="emi-tenure" style={{ display: 'block', fontSize: 12, color: '#CBD5E1', marginBottom: 7, fontWeight: 600 }}>Loan tenure</label>
              <select id="emi-tenure" value={form.tenureYears} onChange={set('tenureYears')} style={{ ...inputStyle, paddingLeft: 13, cursor: 'pointer' }}>
                {[1, 2, 3, 4, 5, 6, 7].map(year => <option key={year} value={year}>{year} year{year > 1 ? 's' : ''} ({year * 12} months)</option>)}
              </select>
            </div>
            <motion.button
              type="button" onClick={calculate}
              whileHover={{ scale: 1.02, boxShadow: '0 0 38px rgba(0,102,255,0.5)' }} whileTap={{ scale: 0.98 }}
              style={{ width: '100%', background: 'linear-gradient(135deg,#0066FF,#0044CC)', color: 'white', border: 'none', borderRadius: 11, padding: '14px 20px', fontSize: 15, fontWeight: 800, cursor: 'pointer', boxShadow: '0 0 24px rgba(0,102,255,0.3)' }}
            >Calculate my EMI</motion.button>
          </AnimatedSection>

          <AnimatedSection variants={fadeRight} style={{ background: 'linear-gradient(145deg,#0E1829,#0A101C)', border: '1px solid rgba(0,102,255,0.28)', borderRadius: 18, padding: 'clamp(20px,3vw,30px)', boxShadow: '0 24px 70px rgba(0,0,0,0.28)' }}>
            <motion.div key={calculationKey} initial={{ opacity: 0.55, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
              <div style={{ color: '#7C8AA5', fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', marginBottom: 8 }}>ESTIMATED MONTHLY EMI</div>
              <div style={{ fontSize: 'clamp(34px,5vw,54px)', fontWeight: 900, color: 'white', lineHeight: 1.1 }}>₹{fmt(result.monthlyEmi)}</div>
              <div style={{ color: '#8EA0BE', fontSize: 12, marginTop: 8 }}>for {result.months} months at {result.annualRate}% p.a.</div>

              <div style={{ height: 10, display: 'flex', borderRadius: 999, overflow: 'hidden', background: '#1A2540', margin: '26px 0 10px' }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(result.downPaymentPercent, 100)}%` }} transition={{ duration: 0.7 }} style={{ background: '#00D4FF' }} />
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(100 - result.downPaymentPercent, 0)}%` }} transition={{ duration: 0.7 }} style={{ background: '#0066FF' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#7C8AA5', fontSize: 10, marginBottom: 24 }}>
                <span><b style={{ color: '#00D4FF' }}>●</b> Down payment {result.downPaymentPercent.toFixed(0)}%</span>
                <span><b style={{ color: '#0066FF' }}>●</b> Financed {(100 - result.downPaymentPercent).toFixed(0)}%</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
                {[
                  ['Loan amount', `₹${fmt(result.loanAmount)}`],
                  ['Total interest', `₹${fmt(result.totalInterest)}`],
                  ['Loan repayment', `₹${fmt(result.totalLoanPayment)}`],
                  ['Total outflow', `₹${fmt(result.totalOutflow)}`],
                ].map(([label, value]) => (
                  <div key={label} style={{ background: 'rgba(5,8,16,0.62)', border: '1px solid #1A2943', borderRadius: 11, padding: '13px 14px' }}>
                    <div style={{ color: '#75839C', fontSize: 10, marginBottom: 5 }}>{label}</div>
                    <div style={{ color: 'white', fontSize: 15, fontWeight: 800 }}>{value}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 18, background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.17)', borderRadius: 11, padding: 14 }}>
                <div style={{ color: '#00E38C', fontSize: 12, fontWeight: 800, marginBottom: 4 }}>Comfortable income guideline</div>
                <div style={{ color: '#B8C6DA', fontSize: 12, lineHeight: 1.6 }}>A monthly income near <strong style={{ color: 'white' }}>₹{fmt(result.suggestedIncome)}+</strong> keeps this EMI around 40% of income.</div>
              </div>
              <p style={{ color: '#5F6D84', fontSize: 10, lineHeight: 1.6, margin: '16px 0 0' }}>Indicative estimate only. Final EMI, fees and eligibility depend on the lender, credit profile and dealer quotation.</p>
            </motion.div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// TESTIMONIALS — Cards slide up with stagger
// ============================================================
function Testimonials() {
  const data = [
    { name: 'Priya Sharma', title: 'Sales Head, EV Nation', init: 'PS', text: 'Test ride bookings up 240% in 3 months. The AI handles objections better than junior reps!', metric: '+240% rides' },
    { name: 'Rajan Mehta', title: 'CEO, GreenDrive Motors', init: 'RM', text: 'We were losing leads after 9 PM. Now AI captures them overnight. 47 qualified leads on day one!', metric: '47 overnight' },
    { name: 'Anita Patel', title: 'CX Head, Volt Auto', init: 'AP', text: 'Support tickets dropped 65%. AI resolves most issues instantly. Team loves it.', metric: '-65% tickets' },
  ];

  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section style={{ padding: '96px 24px', background: '#050810' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <AnimatedSection style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#00D4FF', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>Testimonials</div>
          <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, color: 'white' }}>Trusted by EV industry leaders</h2>
        </AnimatedSection>

        <motion.div
          ref={ref}
          variants={staggerContainer}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 20 }}
        >
          {data.map(({ name, title, init, text, metric }) => (
            <motion.div
              key={name}
              variants={staggerItem}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              style={{ background: '#0D1422', border: '1px solid #1A2540', borderRadius: 16, padding: 24 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg,#0066FF,#00D4FF)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'white', fontSize: 13 }}>{init}</div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'white', fontSize: 13 }}>{name}</div>
                    <div style={{ fontSize: 11, color: '#6B7280' }}>{title}</div>
                  </div>
                </div>
                <div style={{ background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 20, padding: '3px 10px', fontSize: 10, color: '#00FF88', alignSelf: 'flex-start', whiteSpace: 'nowrap' }}>{metric}</div>
              </div>
              <div style={{ fontSize: 12, color: '#9CA3AF' }}>⭐⭐⭐⭐⭐</div>
              <p style={{ fontSize: 13, color: '#D1D5DB', lineHeight: 1.7, marginTop: 8 }}>"{text}"</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================
// PRICING — Scale + Fade with stagger
// ============================================================
function Pricing() {
  const plans = [
    { name: 'Starter', price: '₹4,999', period: '/mo', desc: 'Single-location EV dealers', features: ['500 AI conversations', 'Chat agent', 'Lead capture', 'Basic analytics', 'Email support'], cta: 'Get Started', featured: false },
    { name: 'Growth', price: '₹14,999', period: '/mo', desc: 'Growing EV dealerships & OEMs', features: ['5,000 conversations', 'Voice + Chat', 'n8n workflows', 'CRM integrations', 'Priority support', 'Custom AI training'], cta: 'Get Started', featured: true, badge: '⚡ Most Popular' },
    { name: 'Enterprise', price: 'Custom', period: '', desc: 'Large EV companies & fleets', features: ['Unlimited conversations', 'Custom voice persona', 'White-label solution', 'Dedicated AI model', 'Account manager'], cta: 'Contact Sales', featured: false },
  ];

  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="pricing" style={{ padding: '96px 24px', background: '#080C14' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <AnimatedSection style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#00D4FF', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>Pricing</div>
          <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, color: 'white', marginBottom: 12 }}>Simple, transparent pricing</h2>
          <p style={{ fontSize: 15, color: '#9CA3AF' }}>No hidden fees. Cancel anytime.</p>
        </AnimatedSection>

        <motion.div
          ref={ref}
          variants={staggerContainer}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20 }}
        >
          {plans.map(({ name, price, period, desc, features, cta, featured, badge }) => (
            <motion.div
              key={name}
              variants={featured ? scaleIn : staggerItem}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              style={{
                background: '#0D1422', border: `1px solid ${featured ? '#0066FF' : '#1A2540'}`,
                borderRadius: 16, padding: 28, position: 'relative',
                transform: featured ? 'scale(1.03)' : 'scale(1)',
                boxShadow: featured ? '0 0 30px rgba(0,102,255,0.2)' : 'none',
              }}
            >
              {badge && <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: '#0066FF', color: 'white', fontSize: 10, fontWeight: 700, padding: '3px 12px', borderRadius: 10, whiteSpace: 'nowrap' }}>{badge}</div>}
              <div style={{ fontWeight: 800, color: 'white', fontSize: 18, marginBottom: 5 }}>{name}</div>
              <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 14 }}>{desc}</div>
              <div style={{ marginBottom: 20 }}>
                <span style={{ fontSize: 32, fontWeight: 900, color: 'white' }}>{price}</span>
                <span style={{ fontSize: 13, color: '#6B7280' }}>{period}</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 9 }}>
                {features.map(f => <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#D1D5DB' }}><span style={{ color: '#00FF88', fontWeight: 700 }}>✓</span>{f}</li>)}
              </ul>
              <Link to="/login" style={{
                display: 'block', textAlign: 'center', padding: '11px', borderRadius: 9,
                fontWeight: 700, fontSize: 13, textDecoration: 'none',
                background: featured ? '#0066FF' : 'transparent',
                color: featured ? 'white' : '#00D4FF',
                border: featured ? 'none' : '1px solid #1A2540',
              }}>{cta}</Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================
// CONTACT — Fade Up
// ============================================================
function Contact() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [savedData, setSavedData] = useState(null);
  const [error, setError] = useState('');

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError('');

  try {
    await fetch(
      'https://script.google.com/macros/s/AKfycbwp4eHb1lF8HS6m7pVzEP7dm37eneyufbjTbSm-JZcbFVFUErM3wzBOy7hVLBA0mWBlhg/exec',
      {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify(form),
      }
    );

    setSavedData({ ...form });
    setSent(true);
    setForm({
      name: '',
      email: '',
      phone: '',
      company: '',
      message: '',
    });
  } catch (err) {
    console.error(err);
    setError('Google Sheet me data save nahi hua.');
  } finally {
    setLoading(false);
  }
};

  const iStyle = {
    width: '100%', background: '#080C14', border: '1px solid #1A2540',
    borderRadius: 8, padding: '11px 13px', color: 'white', fontSize: 13,
    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  };

  return (
    <section id="contact" style={{ padding: '96px 24px', background: '#050810' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <AnimatedSection style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#00D4FF', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>Contact</div>
          <h2 style={{ fontSize: 'clamp(26px,4vw,40px)', fontWeight: 800, color: 'white', marginBottom: 10 }}>Ready to get started?</h2>
          <p style={{ fontSize: 15, color: '#9CA3AF' }}>Talk to our team for a personalized EV demo.</p>
        </AnimatedSection>

        <AnimatePresence mode="wait">
          {sent && savedData ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              style={{ background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 16, padding: 32, textAlign: 'center' }}
            >
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.1 }} style={{ fontSize: 52, marginBottom: 12 }}>✅</motion.div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'white', marginBottom: 8 }}>Message Sent Successfully!</div>
              <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 20 }}>Thank you for contacting TataEV. Our team will reach out to you soon.</div>
              <button onClick={() => { setSent(false); setSavedData(null); }} style={{
                background: '#0066FF', color: 'white', border: 'none', borderRadius: 8,
                padding: '10px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}>Send Another Message</button>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              onSubmit={handleSubmit}
              style={{ background: '#0D1422', border: '1px solid #1A2540', borderRadius: 16, padding: 28 }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 5 }}>Full Name *</label>
                  <input required placeholder="Arjun Rathi" value={form.name} onChange={set('name')} style={iStyle}
                    onFocus={e => e.target.style.borderColor='#0066FF'} onBlur={e => e.target.style.borderColor='#1A2540'} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 5 }}>Phone Number</label>
                  <input type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={set('phone')} style={iStyle}
                    onFocus={e => e.target.style.borderColor='#0066FF'} onBlur={e => e.target.style.borderColor='#1A2540'} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 5 }}>Email Address *</label>
                  <input required type="email" placeholder="arjun@gmail.com" value={form.email} onChange={set('email')} style={iStyle}
                    onFocus={e => e.target.style.borderColor='#0066FF'} onBlur={e => e.target.style.borderColor='#1A2540'} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 5 }}>Company Name</label>
                  <input placeholder="EV Dealership Pvt Ltd" value={form.company} onChange={set('company')} style={iStyle}
                    onFocus={e => e.target.style.borderColor='#0066FF'} onBlur={e => e.target.style.borderColor='#1A2540'} />
                </div>
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 5 }}>Message *</label>
                <textarea required rows={4} placeholder="Tell us about your EV business and what you need..."
                  value={form.message} onChange={set('message')}
                  style={{ ...iStyle, resize: 'none' }}
                  onFocus={e => e.target.style.borderColor='#0066FF'}
                  onBlur={e => e.target.style.borderColor='#1A2540'} />
              </div>
              {error && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#F87171' }}>
                  ⚠️ {error}
                </motion.div>
              )}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={!loading ? { scale: 1.02, boxShadow: '0 0 32px rgba(0,102,255,0.5)' } : {}}
                whileTap={!loading ? { scale: 0.98 } : {}}
                style={{
                  width: '100%', background: loading ? '#1A2540' : '#0066FF',
                  color: 'white', border: 'none', borderRadius: 10, padding: '13px',
                  fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: loading ? 'none' : '0 0 24px rgba(0,102,255,0.3)',
                }}
              >
                {loading
                  ? <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Saving...</>
                  : '📨 Send Message'
                }
              </motion.button>
              <p style={{ textAlign: 'center', fontSize: 11, color: '#374151', marginTop: 10 }}>
                 🔒 Securely stored in Google Sheets
              </p>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

// ============================================================
// FOOTER — Fade Up
// ============================================================
function Footer() {
  return (
    <AnimatedSection>
      <footer style={{ background: '#050810', borderTop: '1px solid #1A2540', padding: '40px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>⚡</span>
            <span style={{ fontWeight: 800, color: 'white' }}>Tata<span style={{ color: '#00D4FF' }}>EV</span></span>
            <span style={{ color: '#374151', marginLeft: 8, fontSize: 12 }}>AI-Powered EV Agent Platform</span>
          </div>
          <div style={{ fontSize: 11, color: '#374151', fontFamily: 'monospace' }}>
            © 2025 TataEV · React + Node.js + MongoDB + n8n + ElevenLabs
          </div>
        </div>
      </footer>
    </AnimatedSection>
  );
}

// ============================================================
// MAIN EXPORT
// ============================================================
export default function LandingPage() {
  return (
    <div style={{ background: '#080C14', minHeight: '100vh' }}>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes barwave { 0%,100%{transform:scaleY(0.3)} 50%{transform:scaleY(1)} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080C14; color: #E8EDF5; }
        input:focus, textarea:focus { outline: none; border-color: #0066FF !important; }
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        @media (max-width: 768px) {
          .voice-layout, .calc-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <VoiceAgentSection />
      <CostCalculator />
      <Testimonials />
      <Pricing />
      <EVExplorer />
      <EVComparator />
      <Contact />
      <Footer />
    </div>
  );
}
