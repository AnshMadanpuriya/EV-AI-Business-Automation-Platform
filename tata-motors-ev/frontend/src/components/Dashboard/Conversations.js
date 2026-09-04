import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Bot, ChevronDown, ChevronRight } from 'lucide-react';
import API from '../../utils/api';

const demoSessions = Array.from({ length: 12 }, (_, i) => ({
  _id: `sess_${i}`,
  sessionId: `session_${Date.now()}_${i}`,
  visitorName: ['Anonymous', 'Rahul', 'Priya', 'Amit', 'Meena'][i % 5],
  intent: ['test-ride', 'charging', 'pricing', 'service', 'general'][i % 5],
  status: ['active', 'closed'][i % 2],
  messages: Array.from({ length: Math.floor(Math.random() * 6 + 2) }, (_, j) => ({
    role: j % 2 === 0 ? 'user' : 'assistant',
    content: j % 2 === 0 ? 'I want to know about Nexon EV pricing and range.' : 'The Nexon EV starts from ₹14.74 Lakhs and offers up to 437 km range on a single charge.',
    timestamp: new Date(Date.now() - (12 - i) * 3600000 - j * 60000),
  })),
  createdAt: new Date(Date.now() - i * 3600000 * 4).toISOString(),
}));

const INTENT_COLORS = {
  'test-ride': 'text-ev-blue', charging: 'text-yellow-400', pricing: 'text-ev-green',
  service: 'text-purple-400', general: 'text-gray-400',
};

export default function Conversations() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/chat/sessions?limit=30');
      setSessions(data.sessions);
    } catch {
      setSessions(demoSessions);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display font-bold text-2xl text-white">Conversations</h1>
        <p className="text-gray-500 text-sm">{sessions.length} chat sessions</p>
      </div>

      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-ev-border rounded w-1/3 mb-2" />
              <div className="h-3 bg-ev-border rounded w-1/2" />
            </div>
          ))
        ) : sessions.map(session => (
          <div key={session._id} className="card overflow-hidden">
            <button onClick={() => setExpanded(expanded === session._id ? null : session._id)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-ev-border/20 transition-colors text-left">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-ev-blue/15 border border-ev-blue/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot size={14} className="text-ev-blue" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{session.visitorName}</div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className={INTENT_COLORS[session.intent] || 'text-gray-400'}>#{session.intent || 'general'}</span>
                    <span>{session.messages?.length || 0} messages</span>
                    <span>{new Date(session.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full border ${session.status === 'active' ? 'text-ev-green border-ev-green/20 bg-ev-green/10' : 'text-gray-500 border-ev-border bg-ev-border/30'}`}>
                  {session.status}
                </span>
                {expanded === session._id ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
              </div>
            </button>

            {expanded === session._id && (
              <div className="border-t border-ev-border bg-ev-darker px-4 py-4 max-h-64 overflow-y-auto space-y-2">
                {session.messages?.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-3 py-2 rounded-xl text-xs leading-relaxed ${msg.role === 'user' ? 'bg-ev-blue text-white' : 'bg-ev-card border border-ev-border text-gray-300'}`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
