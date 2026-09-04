import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Minimize2, Zap, Bot } from 'lucide-react';
import API from '../../utils/api';

const QUICK_REPLIES = [
  '🚗 Book a test ride',
  '💰 View pricing',
  '🔋 Charging info',
  '🔧 Service support',
];

const TypingIndicator = () => (
  <div className="flex items-end gap-2 mb-3 animate-fade-in">
    <div className="w-7 h-7 bg-ev-blue/20 rounded-full flex items-center justify-center flex-shrink-0">
      <Bot size={14} className="text-ev-blue" />
    </div>
    <div className="bg-ev-card border border-ev-border rounded-2xl rounded-bl-none px-4 py-3">
      <div className="flex gap-1 items-center h-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="typing-dot w-1.5 h-1.5 rounded-full bg-gray-400" />
        ))}
      </div>
    </div>
  </div>
);

const Message = ({ msg }) => {
  const isBot = msg.role === 'assistant';
  return (
    <div className={`flex items-end gap-2 mb-3 animate-fade-in ${isBot ? '' : 'flex-row-reverse'}`}>
      {isBot && (
        <div className="w-7 h-7 bg-ev-blue/20 border border-ev-blue/30 rounded-full flex items-center justify-center flex-shrink-0">
          <Bot size={14} className="text-ev-blue" />
        </div>
      )}
      <div className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
        isBot
          ? 'bg-ev-card border border-ev-border text-gray-200 rounded-bl-none'
          : 'bg-ev-blue text-white rounded-br-none'
      }`}>
        {msg.content}
        <div className={`text-xs mt-1 ${isBot ? 'text-gray-600' : 'text-blue-200'}`}>
          {new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '👋 Hi! I\'m TataEV AI, your intelligent EV assistant. I can help with test rides, pricing, charging info, and service. How can I help you today?', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [unread, setUnread] = useState(0);
  const [showNotif, setShowNotif] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        if (!open) {
          setShowNotif(true);
          setUnread(1);
        }
      }, 5000);
      return () => clearTimeout(t);
    } else {
      setUnread(0);
      setShowNotif(false);
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg = { role: 'user', content: msg, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const { data } = await API.post('/chat', { message: msg, sessionId });
      if (!sessionId) setSessionId(data.sessionId);
      setMessages(prev => [...prev, { role: 'assistant', content: data.response, timestamp: new Date() }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I\'m having connectivity issues. Please try again in a moment.', timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <>
      {/* Notification bubble */}
      {showNotif && !open && (
        <div className="fixed bottom-24 right-5 z-50 max-w-xs bg-ev-card border border-ev-blue/30 rounded-xl p-3 shadow-blue-glow animate-slide-up cursor-pointer" onClick={() => { setOpen(true); setShowNotif(false); }}>
          <div className="flex items-start gap-2">
            <Bot size={16} className="text-ev-blue mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs font-medium text-white mb-0.5">TataEV AI Agent</div>
              <div className="text-xs text-gray-400">👋 Need help choosing your EV? I'm here!</div>
            </div>
            <button onClick={e => { e.stopPropagation(); setShowNotif(false); }} className="text-gray-600 hover:text-white ml-1 flex-shrink-0"><X size={12} /></button>
          </div>
        </div>
      )}

      {/* Chat window */}
      {open && !minimized && (
        <div className="fixed bottom-20 right-5 z-50 w-[360px] sm:w-[380px] flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-ev-border animate-slide-up" style={{ height: '520px' }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-ev-darker to-ev-card border-b border-ev-border px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 bg-ev-blue rounded-full flex items-center justify-center shadow-blue-glow">
                  <Zap size={16} className="text-white" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-ev-green rounded-full border-2 border-ev-darker" />
              </div>
              <div>
                <div className="font-display font-semibold text-white text-sm">TataEV AI Agent</div>
                <div className="text-xs text-ev-green">Online · Typically replies instantly</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setMinimized(true)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-ev-border transition-colors">
                <Minimize2 size={14} />
              </button>
              <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-ev-border transition-colors">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto bg-ev-darker p-4 space-y-0.5">
            {messages.map((msg, i) => <Message key={i} msg={msg} />)}
            {loading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick replies */}
          {messages.length <= 2 && !loading && (
            <div className="bg-ev-darker px-4 pb-2 flex gap-2 flex-wrap flex-shrink-0">
              {QUICK_REPLIES.map(r => (
                <button key={r} onClick={() => sendMessage(r)} className="text-xs bg-ev-card border border-ev-border text-gray-300 hover:border-ev-blue hover:text-white px-3 py-1.5 rounded-full transition-colors whitespace-nowrap">
                  {r}
                </button>
              ))}
            </div>
          )}

          {/* Input area */}
          <div className="bg-ev-card border-t border-ev-border px-3 py-3 flex items-end gap-2 flex-shrink-0">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about EVs, test rides, charging..."
              rows={1}
              className="flex-1 bg-ev-darker border border-ev-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-ev-blue resize-none transition-colors max-h-24 overflow-y-auto"
              style={{ lineHeight: '1.4' }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="w-9 h-9 bg-ev-blue hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-all hover:shadow-blue-glow flex-shrink-0"
            >
              <Send size={15} className="text-white" />
            </button>
          </div>
          <div className="bg-ev-card px-4 py-1.5 flex items-center justify-center">
            <span className="text-xs text-gray-600 font-mono">Powered by TataEV AI · n8n</span>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => { setOpen(!open); setMinimized(false); }}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 bg-ev-blue hover:bg-blue-500 rounded-full shadow-blue-glow flex items-center justify-center transition-all hover:scale-110 active:scale-95"
      >
        {open ? <X size={22} className="text-white" /> : <MessageSquare size={22} className="text-white" />}
        {unread > 0 && !open && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-ev-accent rounded-full flex items-center justify-center text-white text-xs font-bold">{unread}</span>
        )}
      </button>
    </>
  );
}
