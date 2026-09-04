import React, { useEffect, useRef, useState } from 'react';
import { Mic, Zap, CheckCircle, ArrowRight, Phone } from 'lucide-react';

const AGENT_ID = 'agent_6701knpzdtj4fjy85jkrc0kbqye9';
// ✅ Correct script URL from ElevenLabs docs
const ELEVENLABS_SCRIPT = 'https://unpkg.com/@elevenlabs/convai-widget-embed';

const capabilities = [
  'Book test rides by just speaking',
  'Get real-time EV range & pricing info',
  'Resolve charging issues instantly',
  'Schedule service appointments',
  'Qualify and capture your details',
  'Escalate to human agent if needed',
];

function loadScript(cb) {
  if (document.querySelector('script[data-el-loaded]')) {
    if (cb) cb(); return;
  }
  const s = document.createElement('script');
  s.src = ELEVENLABS_SCRIPT;
  s.async = true;
  s.type = 'text/javascript';
  s.setAttribute('data-el-loaded', 'true');
  s.onload = () => { if (cb) cb(); };
  s.onerror = () => console.error('ElevenLabs failed to load');
  document.head.appendChild(s);
}

// Mounts the web component safely via DOM API
function ElevenLabsEmbed({ agentId }) {
  const containerRef = useRef(null);
  const widgetRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadScript(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready || !containerRef.current || widgetRef.current) return;

    const widget = document.createElement('elevenlabs-convai');
    widget.setAttribute('agent-id', agentId);
    widget.style.width = '100%';

    containerRef.current.appendChild(widget);
    widgetRef.current = widget;

    return () => {
      if (widgetRef.current && containerRef.current?.contains(widgetRef.current)) {
        containerRef.current.removeChild(widgetRef.current);
      }
      widgetRef.current = null;
    };
  }, [ready, agentId]);

  return (
    <div ref={containerRef} style={{ width: '100%', minHeight: 90 }}>
      {!ready && (
        <div style={{ display:'flex', justifyContent:'center', padding: 20 }}>
          <div style={{
            width: 28,
            height: 28,
            border: '2px solid #FF6B00',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'el-spin 0.8s linear infinite'
          }} />
        </div>
      )}
    </div>
  );
}

export default function VoiceAgentSection() {
  const handleLaunchFloating = () => {
    const fab = document.getElementById('voice-agent-fab');
    if (fab) fab.click();
  };

  return (
    <section id="voice-agent" className="py-24 relative overflow-hidden" style={{ background: '#080C14' }}>
      <style>{`
        @keyframes el-spin { to { transform: rotate(360deg); } }
        @keyframes el-bar {
          0%,100% { transform: scaleY(0.3); opacity: 0.5; }
          50%      { transform: scaleY(1);   opacity: 1;   }
        }
      `}</style>

      {/* Grid background */}
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-20" />

      {/* Glow */}
      <div style={{
        position:'absolute', top:'50%', left:'50%',
        transform:'translate(-50%,-50%)',
        width:700, height:400, borderRadius:'50%', pointerEvents:'none',
        background:'radial-gradient(ellipse, rgba(255,107,0,0.07) 0%, transparent 70%)'
      }} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Section header ── */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-5" style={{
            background:'rgba(255,107,0,0.1)', border:'1px solid rgba(255,107,0,0.28)'
          }}>
            <span className="w-2 h-2 rounded-full" style={{ background:'#FF6B00', animation:'el-pulse 2s infinite' }} />
            <span style={{ fontSize:10, fontFamily:'monospace', fontWeight:700, letterSpacing:'0.1em', color:'#FF8C40', textTransform:'uppercase' }}>
              ElevenLabs Voice AI · Live
            </span>
          </div>

          <h2 className="font-display font-extrabold text-4xl sm:text-5xl text-white mt-3 mb-4 leading-tight">
            Talk to our AI Agent —{' '}
            <span style={{
              background:'linear-gradient(135deg,#FF6B00,#FFB347)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent'
            }}>
              Right Now
            </span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Powered by ElevenLabs ConvAI. Have a real voice conversation with our EV expert AI — no typing needed.
          </p>
        </div>

        {/* ── Main grid ── */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* LEFT — Widget card */}
          <div className="flex justify-center">
            <div style={{
              width:'100%', maxWidth:420,
              background:'#0D1422',
              border:'1px solid rgba(255,107,0,0.22)',
              borderRadius:20, overflow:'hidden',
              boxShadow:'0 0 50px rgba(255,107,0,0.12), 0 24px 64px rgba(0,0,0,0.45)'
            }}>

              {/* Card header */}
              <div style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'14px 20px',
                borderBottom:'1px solid rgba(255,107,0,0.1)',
                background:'rgba(255,107,0,0.04)'
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{
                    width:40, height:40, borderRadius:'50%',
                    background:'rgba(255,107,0,0.15)', border:'1px solid rgba(255,107,0,0.3)',
                    display:'flex', alignItems:'center', justifyContent:'center'
                  }}>
                    <Mic size={18} color="#FF6B00" />
                  </div>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:'white', fontFamily:'Syne,sans-serif' }}>
                      TataEV Voice Agent
                    </div>
                    <div style={{ fontSize:10, color:'#FF8C40' }}>Powered by ElevenLabs ConvAI</div>
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <span style={{ width:7, height:7, borderRadius:'50%', background:'#00FF88', animation:'el-pulse 2s infinite', display:'inline-block' }} />
                  <span style={{ fontSize:10, color:'#00FF88' }}>Live</span>
                </div>
              </div>

              {/* Waveform visualiser */}
              <div style={{ padding:'20px', background:'#080C14', display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
                <div style={{ display:'flex', alignItems:'center', gap:3, height:48 }}>
                  {[30,55,80,60,90,45,70,85,40,65,50,75,35,90,60].map((h, i) => (
                    <div key={i} style={{
                      width:3, borderRadius:2,
                      background:`rgba(255,107,0,${0.35 + (h/100)*0.6})`,
                      height: h * 0.48,
                      animation:`el-bar ${0.9 + (i%3)*0.2}s ease-in-out infinite`,
                      animationDelay: `${i*0.08}s`,
                      transformOrigin:'center'
                    }} />
                  ))}
                </div>
                <p style={{ fontSize:12, color:'#6B7280', textAlign:'center', margin:0 }}>
                  Press the mic button below → speak naturally
                </p>
              </div>

              {/* ✅ ElevenLabs widget — DOM injected */}
              <div style={{ padding:'16px 20px', background:'#0D1422' }}>
                <ElevenLabsEmbed agentId={AGENT_ID} />
                <p style={{ fontSize:10, color:'#374151', textAlign:'center', marginTop:8, fontFamily:'monospace' }}>
                  Allow microphone access when browser asks
                </p>
              </div>

              {/* Floating panel CTA */}
              <div style={{
                padding:'12px 20px', borderTop:'1px solid rgba(255,107,0,0.1)', textAlign:'center'
              }}>
                <button onClick={handleLaunchFloating} style={{
                  display:'inline-flex', alignItems:'center', gap:6,
                  background:'none', border:'none', cursor:'pointer',
                  color:'#FF8C40', fontSize:12, fontWeight:600
                }}>
                  <Phone size={13} />
                  Or use the floating voice button (bottom-left)
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT — Capabilities */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 mb-6" style={{
              background:'rgba(255,107,0,0.08)', border:'1px solid rgba(255,107,0,0.15)'
            }}>
              <Zap size={13} color="#FF6B00" />
              <span style={{ fontSize:11, fontFamily:'monospace', color:'#FF8C40' }}>
                What the voice agent can do
              </span>
            </div>

            <h3 className="font-display font-bold text-3xl text-white mb-6">
              Just speak naturally —<br/>
              <span className="text-gray-400">the AI handles the rest</span>
            </h3>

            <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:28 }}>
              {capabilities.map((cap, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <CheckCircle size={16} color="#FF6B00" style={{ flexShrink:0 }} />
                  <span style={{ fontSize:14, color:'#D1D5DB' }}>{cap}</span>
                </div>
              ))}
            </div>

            {/* Tech stack */}
            <div style={{
              borderRadius:14, padding:16,
              background:'rgba(255,107,0,0.04)', border:'1px solid rgba(255,107,0,0.1)',
              marginBottom:20
            }}>
              <div style={{ fontSize:10, fontFamily:'monospace', color:'#6B7280', marginBottom:10 }}>POWERED BY</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                {[
                  { label:'ElevenLabs ConvAI', color:'#FF6B00' },
                  { label:'GPT-4o Voice',      color:'#0066FF' },
                  { label:'Real-time STT',     color:'#00D4FF' },
                  { label:'Neural TTS',        color:'#00FF88' },
                  { label:'n8n Automation',    color:'#A78BFA' },
                ].map(({ label, color }) => (
                  <span key={label} style={{
                    fontSize:10, padding:'5px 11px', borderRadius:20,
                    background:`${color}14`, border:`1px solid ${color}28`, color,
                    fontFamily:'monospace'
                  }}>{label}</span>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
              {[
                { val:'< 1s', label:'Voice response' },
                { val:'40+',  label:'Languages' },
                { val:'99.9%',label:'Uptime' },
              ].map(({ val, label }) => (
                <div key={label} style={{
                  background:'#0D1422', border:'1px solid #1A2540',
                  borderRadius:12, padding:14, textAlign:'center'
                }}>
                  <div style={{ fontSize:20, fontWeight:800, color:'#FF8C40', fontFamily:'Syne,sans-serif' }}>{val}</div>
                  <div style={{ fontSize:10, color:'#6B7280', marginTop:3 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}