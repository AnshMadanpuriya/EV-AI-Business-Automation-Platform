import React, { useEffect, useState } from 'react';
import { AlertTriangle, Bot, Clock, MessageSquare, User } from 'lucide-react';
import API from '../../utils/api';

export default function Conversations() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter] = useState('');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError('');
    const query = new URLSearchParams({ limit: '100' });
    if (filter) query.set('status', filter);
    API.get(`/chat/sessions?${query.toString()}`)
      .then(({ data }) => {
        setSessions(data.sessions);
        setTotal(data.total);
        setSelectedId(data.sessions[0]?._id || null);
      })
      .catch((requestError) => {
        setSessions([]);
        setTotal(0);
        setSelectedId(null);
        setError(requestError.response?.data?.message || 'Cannot load live conversation history.');
      })
      .finally(() => setLoading(false));
  }, [filter]);

  const selected = sessions.find((session) => session._id === selectedId);

  return (
    <div className="space-y-5">
      <div><h1 className="font-display font-bold text-2xl text-white">Conversations</h1><p className="text-gray-500 text-sm">{total} stored AI chat sessions</p></div>
      {error && <div className="card border-yellow-400/30 bg-yellow-400/5 p-3 flex items-center gap-2 text-xs text-yellow-200"><AlertTriangle size={15} />{error}</div>}
      <div className="flex gap-2">{['', 'active', 'closed', 'escalated'].map((status) => <button key={status} onClick={() => setFilter(status)} className={`text-xs px-3 py-1.5 rounded-full border capitalize ${filter === status ? 'bg-ev-blue border-ev-blue text-white' : 'border-ev-border text-gray-400 hover:text-white'}`}>{status || 'All'}</button>)}</div>
      <div className="grid lg:grid-cols-5 gap-4" style={{ height: 'calc(100vh - 280px)', minHeight: 400 }}>
        <div className="lg:col-span-2 card overflow-y-auto">
          {loading ? [...Array(4)].map((_, index) => <div key={index} className="p-4 border-b border-ev-border animate-pulse"><div className="h-4 bg-ev-border rounded mb-2 w-3/4" /><div className="h-3 bg-ev-border rounded w-1/2" /></div>) : sessions.map((session) => (
            <button key={session._id} onClick={() => setSelectedId(session._id)} className={`w-full text-left p-4 border-b border-ev-border hover:bg-ev-border/30 ${selectedId === session._id ? 'bg-ev-blue/10 border-l-2 border-l-ev-blue' : ''}`}>
              <div className="flex items-start justify-between mb-1"><div className="flex items-center gap-2"><div className="w-7 h-7 bg-gradient-to-br from-ev-blue to-ev-cyan rounded-full flex items-center justify-center text-white text-xs font-bold">{(session.visitorName || 'V').charAt(0).toUpperCase()}</div><div><div className="text-sm font-medium text-white">{session.visitorName || 'Visitor'}</div><div className="text-xs text-gray-500">{session.visitorEmail || 'Anonymous'}</div></div></div><span className={`text-[10px] px-2 py-0.5 rounded-full ${session.status === 'active' ? 'text-ev-green bg-ev-green/10' : 'text-gray-500 bg-ev-border/50'}`}>{session.status}</span></div>
              <div className="text-xs text-gray-500 pl-9 truncate">{session.messages?.at(-1)?.content || 'No messages'}</div>
              <div className="text-xs text-gray-600 pl-9 mt-1 flex items-center gap-1"><MessageSquare size={10} />{session.messages?.length || 0} messages · <Clock size={10} />{new Date(session.updatedAt || session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </button>
          ))}
          {!loading && sessions.length === 0 && <div className="p-10 text-center text-gray-500 text-sm">No stored conversations yet.</div>}
        </div>
        <div className="lg:col-span-3 card flex flex-col overflow-hidden">
          {selected ? <>
            <div className="p-4 border-b border-ev-border flex items-center gap-3"><div className="w-8 h-8 bg-gradient-to-br from-ev-blue to-ev-cyan rounded-full flex items-center justify-center text-white text-sm font-bold">{(selected.visitorName || 'V').charAt(0)}</div><div><div className="font-medium text-white text-sm">{selected.visitorName || 'Visitor'}</div><div className="text-xs text-gray-500">Intent: <span className="text-ev-cyan capitalize">{selected.intent || 'general'}</span> · <span className="font-mono">{selected.sessionId?.slice(-8)}</span></div></div></div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">{selected.messages?.map((message, index) => <div key={`${message.timestamp}-${index}`} className={`flex items-start gap-2 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}><div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${message.role === 'user' ? 'bg-ev-blue' : 'bg-ev-border'}`}>{message.role === 'user' ? <User size={12} className="text-white" /> : <Bot size={12} className="text-ev-cyan" />}</div><div className={`max-w-md rounded-xl px-3 py-2 text-sm ${message.role === 'user' ? 'bg-ev-blue/20 text-white rounded-tr-none' : 'bg-ev-border/50 text-gray-200 rounded-tl-none'}`}>{message.content}<div className="text-[10px] text-gray-600 mt-1">{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div></div></div>)}</div>
          </> : <div className="flex-1 flex items-center justify-center text-gray-500"><div className="text-center"><MessageSquare size={40} className="mx-auto mb-3 opacity-30" /><div className="text-sm">Select a conversation</div></div></div>}
        </div>
      </div>
    </div>
  );
}
