import React, { useState, useEffect, useCallback } from 'react';
import { Users, Search, Filter, Plus, Edit2, Trash2, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import API from '../../utils/api';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  new: 'bg-ev-blue/15 text-ev-blue border-ev-blue/20',
  contacted: 'bg-yellow-400/15 text-yellow-400 border-yellow-400/20',
  qualified: 'bg-purple-400/15 text-purple-400 border-purple-400/20',
  converted: 'bg-ev-green/15 text-ev-green border-ev-green/20',
  lost: 'bg-red-400/15 text-red-400 border-red-400/20',
};

const SOURCE_ICONS = { chatbot: '💬', voice: '📞', form: '📝', 'demo-booking': '📅' };

// Demo data
const demoLeads = Array.from({ length: 18 }, (_, i) => ({
  _id: `lead_${i}`,
  name: ['Rahul Sharma', 'Priya Mehta', 'Amit Kumar', 'Divya Nair', 'Suresh Patel', 'Anjali Singh'][i % 6],
  email: `user${i + 1}@example.com`,
  phone: `+91 ${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
  source: ['chatbot', 'voice', 'form', 'demo-booking'][i % 4],
  status: ['new', 'contacted', 'qualified', 'converted', 'lost'][i % 5],
  interest: ['test-ride', 'purchase', 'service', 'charging', 'general'][i % 5],
  vehicle: ['Nexon EV', 'Tiago EV', 'Punch EV', 'Nexon EV Max', ''][i % 5],
  createdAt: new Date(Date.now() - i * 86400000 * 2).toISOString(),
}));

export default function LeadsTable() {
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [editStatus, setEditStatus] = useState('');
  const limit = 10;

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit, ...(search && { search }), ...(statusFilter && { status: statusFilter }) });
      const { data } = await API.get(`/leads?${params}`);
      setLeads(data.leads);
      setTotal(data.total);
    } catch {
      // Use demo data
      let filtered = demoLeads;
      if (search) filtered = filtered.filter(l => l.name.toLowerCase().includes(search.toLowerCase()) || l.email.includes(search));
      if (statusFilter) filtered = filtered.filter(l => l.status === statusFilter);
      setLeads(filtered.slice((page - 1) * limit, page * limit));
      setTotal(filtered.length);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handleStatusUpdate = async (id, status) => {
    try {
      await API.put(`/leads/${id}`, { status });
      toast.success('Lead updated');
      setEditId(null);
      fetchLeads();
    } catch {
      // Demo mode update
      setLeads(prev => prev.map(l => l._id === id ? { ...l, status } : l));
      setEditId(null);
      toast.success('Lead updated (demo)');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this lead?')) return;
    try {
      await API.delete(`/leads/${id}`);
      toast.success('Lead deleted');
      fetchLeads();
    } catch {
      setLeads(prev => prev.filter(l => l._id !== id));
      toast.success('Deleted (demo)');
    }
  };

  const pages = Math.ceil(total / limit);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Leads</h1>
          <p className="text-gray-500 text-sm">{total} total leads captured</p>
        </div>
        <button className="btn-primary flex items-center gap-2 text-sm self-start sm:self-auto">
          <Plus size={15} /> Add Lead
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, email, phone..." className="input-field pl-9 text-sm" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="input-field text-sm w-full sm:w-44">
          <option value="">All Statuses</option>
          {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ev-border">
                {['Name', 'Contact', 'Source', 'Interest', 'Vehicle', 'Status', 'Date', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-mono text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-ev-border/50">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-ev-border rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : leads.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-500">No leads found</td></tr>
              ) : leads.map(lead => (
                <tr key={lead._id} className="border-b border-ev-border/50 hover:bg-ev-border/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-gradient-to-br from-ev-blue to-ev-cyan rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {lead.name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-white text-sm font-medium whitespace-nowrap">{lead.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-300">{lead.email}</div>
                    <div className="text-xs text-gray-500">{lead.phone}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm">{SOURCE_ICONS[lead.source]} <span className="text-gray-400 capitalize">{lead.source}</span></span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-400 capitalize">{lead.interest}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-400">{lead.vehicle || '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    {editId === lead._id ? (
                      <select autoFocus defaultValue={lead.status}
                        onChange={e => handleStatusUpdate(lead._id, e.target.value)}
                        onBlur={() => setEditId(null)}
                        className="text-xs bg-ev-darker border border-ev-blue rounded px-2 py-1 text-white">
                        {Object.keys(STATUS_COLORS).map(s => <option key={s}>{s}</option>)}
                      </select>
                    ) : (
                      <span onClick={() => setEditId(lead._id)} className={`text-xs px-2.5 py-1 rounded-full border capitalize cursor-pointer ${STATUS_COLORS[lead.status]}`}>
                        {lead.status}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-500">{new Date(lead.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditId(lead._id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-ev-blue hover:bg-ev-blue/10 transition-colors">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => handleDelete(lead._id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-ev-border">
            <span className="text-xs text-gray-500">Page {page} of {pages}</span>
            <div className="flex gap-1">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="w-7 h-7 flex items-center justify-center rounded-lg border border-ev-border text-gray-400 hover:text-white hover:border-ev-blue disabled:opacity-40 transition-colors">
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)} className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs transition-colors ${page === p ? 'bg-ev-blue text-white' : 'border border-ev-border text-gray-400 hover:border-ev-blue hover:text-white'}`}>{p}</button>
              ))}
              <button disabled={page === pages} onClick={() => setPage(p => p + 1)} className="w-7 h-7 flex items-center justify-center rounded-lg border border-ev-border text-gray-400 hover:text-white hover:border-ev-blue disabled:opacity-40 transition-colors">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
