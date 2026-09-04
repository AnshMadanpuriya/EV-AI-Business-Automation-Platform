import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Flame, Plus, Search, Send, Trash2, UserCheck, X } from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../../utils/api';

const STATUS_COLORS = {
  new: 'bg-ev-blue/15 text-ev-blue border-ev-blue/20',
  contacted: 'bg-yellow-400/15 text-yellow-400 border-yellow-400/20',
  qualified: 'bg-purple-400/15 text-purple-400 border-purple-400/20',
  converted: 'bg-ev-green/15 text-ev-green border-ev-green/20',
  lost: 'bg-red-400/15 text-red-400 border-red-400/20'
};
const TEMPERATURE = {
  hot: 'bg-red-400/10 text-red-300 border-red-400/20',
  warm: 'bg-yellow-400/10 text-yellow-300 border-yellow-400/20',
  cold: 'bg-blue-400/10 text-blue-300 border-blue-400/20'
};
const EMPTY_FORM = {
  name: '', email: '', phone: '', city: '', vehicle: '', budget: '',
  purchaseTimeline: '', interest: 'purchase', source: 'manual',
  consent: { whatsapp: false, marketing: false }
};

function LeadModal({ onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const set = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const { data } = await API.post('/leads/qualify', form);
      onCreated(data.lead);
      toast.success(`Lead scored ${data.lead.score}/100`);
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lead could not be saved');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-4 flex items-center justify-center" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form onSubmit={submit} className="card w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-ev-card border-b border-ev-border p-5 flex items-center justify-between z-10">
          <div><div className="font-display font-semibold text-white">Qualify a new EV lead</div><div className="text-xs text-gray-500">The score is calculated automatically from purchase intent.</div></div>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5 grid sm:grid-cols-2 gap-4">
          <label className="text-xs text-gray-400">Name *<input required minLength={3} value={form.name} onChange={set('name')} className="input-field mt-1 text-sm" placeholder="Customer name" /></label>
          <label className="text-xs text-gray-400">Phone<input value={form.phone} onChange={set('phone')} className="input-field mt-1 text-sm" placeholder="9876543210" /></label>
          <label className="text-xs text-gray-400">Email<input type="email" value={form.email} onChange={set('email')} className="input-field mt-1 text-sm" placeholder="name@example.com" /></label>
          <label className="text-xs text-gray-400">City<input value={form.city} onChange={set('city')} className="input-field mt-1 text-sm" placeholder="Pune" /></label>
          <label className="text-xs text-gray-400">Vehicle interest<input value={form.vehicle} onChange={set('vehicle')} className="input-field mt-1 text-sm" placeholder="Nexon EV" /></label>
          <label className="text-xs text-gray-400">Intent<select value={form.interest} onChange={set('interest')} className="input-field mt-1 text-sm"><option value="purchase">Purchase</option><option value="test-ride">Test drive</option><option value="charging">Charging</option><option value="service">Service</option><option value="general">General</option></select></label>
          <label className="text-xs text-gray-400">Budget<select value={form.budget} onChange={set('budget')} className="input-field mt-1 text-sm"><option value="">Not captured</option><option value="under-10">Under ₹10 lakh</option><option value="10-15">₹10–15 lakh</option><option value="15-20">₹15–20 lakh</option><option value="20-plus">₹20 lakh+</option></select></label>
          <label className="text-xs text-gray-400">Purchase timeline<select value={form.purchaseTimeline} onChange={set('purchaseTimeline')} className="input-field mt-1 text-sm"><option value="">Not captured</option><option value="0-30-days">0–30 days</option><option value="31-90-days">31–90 days</option><option value="3-6-months">3–6 months</option><option value="researching">Researching</option></select></label>
          <div className="sm:col-span-2 border border-ev-border rounded-xl p-3 space-y-2">
            <label className="flex items-start gap-2 text-xs text-gray-300"><input type="checkbox" checked={form.consent.whatsapp} onChange={(event) => setForm((current) => ({ ...current, consent: { ...current.consent, whatsapp: event.target.checked } }))} className="mt-0.5" /><span>Customer has explicitly consented to WhatsApp follow-ups.</span></label>
            <label className="flex items-start gap-2 text-xs text-gray-300"><input type="checkbox" checked={form.consent.marketing} onChange={(event) => setForm((current) => ({ ...current, consent: { ...current.consent, marketing: event.target.checked } }))} className="mt-0.5" /><span>Customer has consented to marketing communication.</span></label>
          </div>
        </div>
        <div className="border-t border-ev-border p-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-400">Cancel</button>
          <button disabled={saving} className="btn-primary px-5 py-2 text-sm">{saving ? 'Scoring…' : 'Score & save lead'}</button>
        </div>
      </form>
    </div>
  );
}

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [temperatureFilter, setTemperatureFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (temperatureFilter) params.append('temperature', temperatureFilter);
      const { data } = await API.get(`/leads?${params.toString()}`);
      setLeads(data.leads);
      setTotal(data.total);
    } catch (requestError) {
      setLeads([]);
      setTotal(0);
      setError(requestError.response?.data?.message || 'Cannot load live leads.');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, temperatureFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchLeads, search ? 350 : 0);
    return () => clearTimeout(timer);
  }, [fetchLeads, search]);

  const updateStatus = async (id, status) => {
    try {
      const { data } = await API.put(`/leads/${id}`, { status });
      setLeads((current) => current.map((lead) => lead._id === id ? data.lead : lead));
      toast.success('Lead status updated');
    } catch (requestError) { toast.error(requestError.response?.data?.message || 'Update failed'); }
  };

  const followUp = async (lead) => {
    const channel = lead.consent?.whatsapp ? 'whatsapp' : lead.email ? 'email' : 'call';
    try {
      const { data } = await API.post(`/leads/${lead._id}/follow-up`, { channel });
      setLeads((current) => current.map((item) => item._id === lead._id ? data.lead : item));
      if (data.automation?.status === 'delivered') toast.success(`${channel} follow-up sent to automation`);
      else toast(`Lead saved, but automation is ${data.automation?.status || 'unavailable'}`, { icon: '⚠️' });
    } catch (requestError) { toast.error(requestError.response?.data?.message || 'Follow-up failed'); }
  };

  const handoff = async (lead) => {
    if (!window.confirm(`Assign ${lead.name} to a human agent and pause automation?`)) return;
    try {
      const { data } = await API.post(`/leads/${lead._id}/handoff`, { reason: 'Owner requested manual sales follow-up' });
      setLeads((current) => current.map((item) => item._id === lead._id ? data.lead : item));
      toast.success('Human handoff requested');
    } catch (requestError) { toast.error(requestError.response?.data?.message || 'Handoff failed'); }
  };

  const archiveLead = async (lead) => {
    if (!window.confirm(`Archive ${lead.name}? This stops active automation.`)) return;
    try {
      await API.delete(`/leads/${lead._id}`);
      setLeads((current) => current.filter((item) => item._id !== lead._id));
      setTotal((count) => Math.max(0, count - 1));
      toast.success('Lead archived');
    } catch { toast.error('Archive failed'); }
  };

  return (
    <div className="space-y-5">
      {showModal && <LeadModal onClose={() => setShowModal(false)} onCreated={(lead) => { setLeads((current) => [lead, ...current]); setTotal((count) => count + 1); }} />}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-display font-bold text-2xl text-white">Lead Priority Queue</h1><p className="text-gray-500 text-sm">{total} active leads · ranked by purchase intent</p></div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 text-sm px-4 py-2"><Plus size={15} /> Qualify lead</button>
      </div>

      {error && <div className="card border-yellow-400/30 bg-yellow-400/5 p-3 flex items-center gap-2 text-xs text-yellow-200"><AlertTriangle size={15} />{error}</div>}

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Name, contact or vehicle…" className="input-field pl-9 text-sm py-2.5" /></div>
        <select value={temperatureFilter} onChange={(event) => { setTemperatureFilter(event.target.value); setPage(1); }} className="input-field text-sm py-2.5 w-40"><option value="">All priority</option><option value="hot">Hot</option><option value="warm">Warm</option><option value="cold">Cold</option></select>
        <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} className="input-field text-sm py-2.5 w-40"><option value="">All status</option>{['new', 'contacted', 'qualified', 'converted', 'lost'].map((status) => <option key={status}>{status}</option>)}</select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-ev-border">{['Customer', 'Contact', 'Intent', 'Score', 'Next best action', 'Status', 'Actions'].map((heading) => <th key={heading} className="text-left px-4 py-3 text-xs font-mono text-gray-500 uppercase tracking-wide whitespace-nowrap">{heading}</th>)}</tr></thead>
            <tbody>
              {loading ? [...Array(5)].map((_, row) => <tr key={row} className="border-b border-ev-border/50">{[...Array(7)].map((__, column) => <td key={column} className="px-4 py-4"><div className="h-4 bg-ev-border rounded animate-pulse" /></td>)}</tr>) : leads.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-14 text-gray-500">No matching leads. Capture the first customer to start the pipeline.</td></tr>
              ) : leads.map((lead) => (
                <tr key={lead._id} className="border-b border-ev-border/50 hover:bg-ev-border/20 align-top">
                  <td className="px-4 py-3"><div className="text-sm font-medium text-white whitespace-nowrap">{lead.name}</div><div className="text-xs text-gray-500 mt-1">{lead.city || lead.source}</div></td>
                  <td className="px-4 py-3"><div className="text-xs text-gray-400">{lead.email || '—'}</div><div className="text-xs text-gray-500">{lead.phone || '—'}</div></td>
                  <td className="px-4 py-3"><div className="text-xs text-white capitalize">{lead.interest?.replace('-', ' ')}</div><div className="text-xs text-gray-500 mt-1">{lead.vehicle || 'Model not selected'}</div></td>
                  <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 text-xs uppercase border rounded-full px-2.5 py-1 ${TEMPERATURE[lead.temperature] || TEMPERATURE.cold}`}>{lead.temperature === 'hot' && <Flame size={11} />}{lead.temperature} · {lead.score || 0}</span></td>
                  <td className="px-4 py-3 max-w-xs"><div className="text-xs text-gray-300 leading-relaxed">{lead.nextBestAction || 'Capture more qualification details'}</div>{lead.handoff?.status === 'requested' && <div className="text-[10px] text-ev-cyan mt-1">Human handoff requested</div>}{lead.followUp?.status === 'failed' && <div className="text-[10px] text-red-300 mt-1">Follow-up needs attention</div>}</td>
                  <td className="px-4 py-3"><select value={lead.status} onChange={(event) => updateStatus(lead._id, event.target.value)} className={`text-xs border rounded-full px-2.5 py-1 cursor-pointer focus:outline-none capitalize ${STATUS_COLORS[lead.status]} bg-transparent`}>{['new', 'contacted', 'qualified', 'converted', 'lost'].map((status) => <option key={status} value={status} className="bg-ev-card">{status}</option>)}</select></td>
                  <td className="px-4 py-3"><div className="flex gap-1.5">
                    <button title="Trigger follow-up" onClick={() => followUp(lead)} disabled={lead.automationPaused} className="w-8 h-8 rounded-lg border border-ev-border flex items-center justify-center text-gray-400 hover:text-ev-green disabled:opacity-30"><Send size={13} /></button>
                    <button title="Human handoff" onClick={() => handoff(lead)} className="w-8 h-8 rounded-lg border border-ev-border flex items-center justify-center text-gray-400 hover:text-ev-cyan"><UserCheck size={13} /></button>
                    <button title="Archive lead" onClick={() => archiveLead(lead)} className="w-8 h-8 rounded-lg border border-ev-border flex items-center justify-center text-gray-400 hover:text-red-400"><Trash2 size={13} /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total > 15 && <div className="px-4 py-3 border-t border-ev-border flex items-center justify-between"><span className="text-xs text-gray-500">Showing {((page - 1) * 15) + 1}–{Math.min(page * 15, total)} of {total}</span><div className="flex gap-2"><button disabled={page === 1} onClick={() => setPage((current) => current - 1)} className="text-xs px-3 py-1.5 border border-ev-border rounded-lg text-gray-400 disabled:opacity-40">Prev</button><button disabled={page * 15 >= total} onClick={() => setPage((current) => current + 1)} className="text-xs px-3 py-1.5 border border-ev-border rounded-lg text-gray-400 disabled:opacity-40">Next</button></div></div>}
      </div>
    </div>
  );
}
