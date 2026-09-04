import React, { useState, useRef, memo } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import BookingForm from './BookingForm';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const POPULAR_MAKES = [
  { name: 'Tata', emoji: '🇮🇳', color: '#0066FF' },
  { name: 'Mahindra', emoji: '🔴', color: '#DC143C' },
  { name: 'Tesla', emoji: '⚡', color: '#E82127' },
  { name: 'Hyundai', emoji: '🔵', color: '#002C5F' },
  { name: 'MG', emoji: '⚪', color: '#FF6600' },
  { name: 'Ola', emoji: '🛵', color: '#00FF88' },
  { name: 'BMW', emoji: '🏎️', color: '#1C69D4' },
  { name: 'Ather', emoji: '🟢', color: '#00D084' },
];

// ── Spec Row ────────────────────────────────────────────
function SpecRow({ label, val1, val2, icon, highlight = false }) {
  const isBetter1 = () => {
    if (!val1 || !val2) return null;
    const n1 = parseFloat(val1);
    const n2 = parseFloat(val2);
    if (isNaN(n1) || isNaN(n2)) return null;
    if (label.includes('Consumption') || label.includes('Time') || label.includes('CO2')) {
      return n1 < n2 ? 1 : n1 > n2 ? 2 : null;
    }
    return n1 > n2 ? 1 : n1 < n2 ? 2 : null;
  };
  const better = isBetter1();

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr auto 1fr',
      gap: 8, padding: '10px 14px', alignItems: 'center',
      background: highlight ? 'rgba(0,102,255,0.04)' : 'transparent',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
    }}>
      <div style={{
        textAlign: 'right', fontSize: 13, fontWeight: 600,
        color: better === 1 ? '#00FF88' : 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5
      }}>
        {better === 1 && <span style={{ fontSize: 10, color: '#00FF88' }}>✓</span>}
        {val1 || '—'}
      </div>
      <div style={{ textAlign: 'center', fontSize: 10, color: '#6B7280', whiteSpace: 'nowrap', padding: '0 8px' }}>
        <div>{icon}</div>
        <div>{label}</div>
      </div>
      <div style={{
        textAlign: 'left', fontSize: 13, fontWeight: 600,
        color: better === 2 ? '#00FF88' : 'white',
        display: 'flex', alignItems: 'center', gap: 5
      }}>
        {val2 || '—'}
        {better === 2 && <span style={{ fontSize: 10, color: '#00FF88' }}>✓</span>}
      </div>
    </div>
  );
}

// ── EV Card ─────────────────────────────────────────────
function EVCard({ vehicle, onBookTestDrive }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      whileHover={{ y: -4 }}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14, padding: 18,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'white' }}>{vehicle.make}</div>
          <div style={{ fontSize: 13, color: '#00D4FF' }}>{vehicle.model}</div>
          <div style={{ fontSize: 11, color: '#6B7280' }}>Year: {vehicle.year_start || 'N/A'}</div>
        </div>
        <div style={{ fontSize: 32 }}>🚗</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
        {[
          { icon: '🔋', label: 'Range', val: vehicle.electric_range },
          { icon: '⚡', label: 'Power', val: vehicle.total_power?.split('(')?.[0] },
          { icon: '⏱️', label: '0-100', val: vehicle.acceleration_0_100_kmh },
          { icon: '🔌', label: 'Charge', val: vehicle.charge_power },
          { icon: '🏎️', label: 'Top Speed', val: vehicle.top_speed },
          { icon: '💺', label: 'Seats', val: vehicle.seats },
        ].map(({ icon, label, val }) => (
          <div key={label} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '8px 6px', textAlign: 'center' }}>
            <div style={{ fontSize: 14 }}>{icon}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'white', marginTop: 2 }}>{val || 'N/A'}</div>
            <div style={{ fontSize: 9, color: '#6B7280' }}>{label}</div>
          </div>
        ))}
      </div>
      {vehicle.battery_capacity && (
        <div style={{ marginTop: 12, background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#00D4FF' }}>
          🔋 Battery: {vehicle.battery_capacity} · {vehicle.battery_type || 'Li-ion'}
        </div>
      )}
      <motion.button
        type="button"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onBookTestDrive?.(`${vehicle.make || ''} ${vehicle.model || ''}`.trim())}
        style={{
          width: '100%', marginTop: 14, padding: '11px 14px', border: 0, borderRadius: 9,
          background: 'linear-gradient(135deg,#0066FF,#00A7E7)', color: 'white',
          fontSize: 13, fontWeight: 800, cursor: 'pointer',
        }}
      >
        Book Test Drive
      </motion.button>
    </motion.div>
  );
}

// ============================================================
// ✅ FIX: EVInput is now a MODULE-LEVEL component (not nested
// inside EVComparator). This means React treats it as the SAME
// component type across every re-render, so it never unmounts
// and the <input> never loses focus while typing.
//
// It's also wrapped in React.memo so it only re-renders when
// its own props actually change — not when unrelated state in
// the parent (like `comparing` or `error`) changes.
// ============================================================
const EVInput = memo(function EVInput({ slot, make, onMakeChange, model, onModelChange, data }) {
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 24, marginBottom: 4 }}>🚗</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>Vehicle {slot}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
        <input
          type="text"
          placeholder={`Brand (e.g. ${slot === 1 ? 'Tata' : 'Tesla'})`}
          value={make}
          onChange={onMakeChange}
          autoComplete="off"
          style={{
            width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '10px 12px', color: 'white', fontSize: 13, outline: 'none', boxSizing: 'border-box',
          }}
          onFocus={e => e.target.style.borderColor = '#0066FF'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
        />
        <input
          type="text"
          placeholder={`Model (e.g. ${slot === 1 ? 'Nexon' : 'Model 3'})`}
          value={model}
          onChange={onModelChange}
          autoComplete="off"
          style={{
            width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '10px 12px', color: 'white', fontSize: 13, outline: 'none', boxSizing: 'border-box',
          }}
          onFocus={e => e.target.style.borderColor = '#0066FF'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
        />
      </div>
      {data && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{
          background: 'rgba(0,102,255,0.08)', border: '1px solid rgba(0,102,255,0.2)',
          borderRadius: 10, padding: '10px 12px', fontSize: 12,
        }}>
          <div style={{ fontWeight: 700, color: 'white' }}>{data.make} {data.model}</div>
          <div style={{ color: '#00D4FF', marginTop: 3 }}>{data.electric_range} · {data.total_power?.split('(')?.[0]}</div>
        </motion.div>
      )}
    </div>
  );
});

// ── EV EXPLORER ─────────────────────────────────────────
function EVExplorer() {
  const [search, setSearch] = useState({ make: '', model: '' });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [bookingVehicle, setBookingVehicle] = useState('');

  const fetchEVs = async (make, model = '') => {
    if (!make && !model) return;
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      const params = new URLSearchParams();
      if (make) params.append('make', make);
      if (model) params.append('model', model);
      const res = await fetch(`${API_URL}/ev/search?${params}`);
      const data = await res.json();
      if (data.success && data.vehicles?.length > 0) {
        setResults(data.vehicles);
      } else {
        setResults([]);
        setError(data.message || `No vehicles found for "${make}${model ? ' ' + model : ''}".`);
      }
    } catch {
      setError('Backend se connect nahi hua. Check karo port 5000 chal raha hai.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchEVs(search.make.trim(), search.model.trim());
  };

  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="ev-explorer" style={{ padding: '96px 24px', background: '#080C14' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }} ref={ref}>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          style={{ textAlign: 'center', marginBottom: 40 }}
        >
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.25)',
            borderRadius: 20, padding: '5px 14px', marginBottom: 16,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#00D4FF', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              🔌 EV Database
            </span>
          </div>
          <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, color: 'white', marginBottom: 14 }}>
            Explore{' '}
            <span style={{ background: 'linear-gradient(135deg,#0066FF,#00D4FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Electric Vehicles
            </span>
          </h2>
          <p style={{ fontSize: 16, color: '#9CA3AF', maxWidth: 560, margin: '0 auto' }}>
            Search EV specs — Indian brands (Tata, Mahindra, MG, Ola, Ather) & global brands (Tesla, BMW, Hyundai).
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 28 }}
        >
          {POPULAR_MAKES.map(({ name, emoji, color }) => (
            <motion.button
              key={name}
              type="button"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setSearch({ make: name, model: '' });
                fetchEVs(name, '');
              }}
              style={{
                background: search.make === name ? color + '20' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${search.make === name ? color + '50' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 600,
                color: search.make === name ? 'white' : '#9CA3AF', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {emoji} {name}
            </motion.button>
          ))}
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
          onSubmit={handleSearch}
          style={{
            display: 'flex', gap: 12, marginBottom: 36, flexWrap: 'wrap',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14, padding: 18,
          }}
        >
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#9CA3AF', marginBottom: 5 }}>Make / Brand</label>
            <input
              type="text"
              placeholder="e.g. Tata, Tesla, Hyundai..."
              value={search.make}
              onChange={e => setSearch(p => ({ ...p, make: e.target.value }))}
              autoComplete="off"
              style={{
                width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 9, padding: '11px 14px', color: 'white', fontSize: 13, outline: 'none', boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = '#0066FF'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#9CA3AF', marginBottom: 5 }}>Model (optional)</label>
            <input
              type="text"
              placeholder="e.g. Nexon, Model 3..."
              value={search.model}
              onChange={e => setSearch(p => ({ ...p, model: e.target.value }))}
              autoComplete="off"
              style={{
                width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 9, padding: '11px 14px', color: 'white', fontSize: 13, outline: 'none', boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = '#0066FF'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <motion.button
              type="submit"
              disabled={loading || (!search.make && !search.model)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{
                background: 'linear-gradient(135deg,#0066FF,#0044CC)', color: 'white',
                border: 'none', borderRadius: 9, padding: '11px 28px', fontSize: 14,
                fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading
                ? <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Searching...</>
                : '🔍 Search EVs'
              }
            </motion.button>
          </div>
        </motion.form>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#F87171', textAlign: 'center',
          }}>
            ⚠️ {error}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {results.length > 0 && (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 16 }}>
                Found <span style={{ color: '#00D4FF', fontWeight: 700 }}>{results.length}</span> vehicle{results.length > 1 ? 's' : ''}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                {results.map((v, i) => <EVCard key={i} vehicle={v} onBookTestDrive={setBookingVehicle} />)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {bookingVehicle && (
            <BookingForm initialVehicle={bookingVehicle} onClose={() => setBookingVehicle('')} />
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

// ── EV COMPARATOR ────────────────────────────────────────
function EVComparator() {
  const [make1, setMake1] = useState('');
  const [model1, setModel1] = useState('');
  const [make2, setMake2] = useState('');
  const [model2, setModel2] = useState('');
  const [vehicle1, setVehicle1] = useState(null);
  const [vehicle2, setVehicle2] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState('');

  const runCompare = async (m1, mo1, m2, mo2) => {
    if (!m1 || !m2) {
      setError('Please enter both vehicle brands');
      return;
    }
    setComparing(true);
    setError('');
    setVehicle1(null);
    setVehicle2(null);

    try {
      const params = new URLSearchParams({ make1: m1, make2: m2 });
      if (mo1) params.append('model1', mo1);
      if (mo2) params.append('model2', mo2);

      const res = await fetch(`${API_URL}/ev/compare?${params}`);
      const data = await res.json();

      if (data.success) {
        setVehicle1(data.vehicle1);
        setVehicle2(data.vehicle2);
      } else {
        setError(data.message || `Couldn't find one or both vehicles.`);
      }
    } catch {
      setError('Backend se connect nahi hua. Check karo port 5000 chal raha hai.');
    } finally {
      setComparing(false);
    }
  };

  const handleCompareClick = () => {
    runCompare(make1.trim(), model1.trim(), make2.trim(), model2.trim());
  };

  const handleQuickCompare = (m1, mo1, m2, mo2) => {
    setMake1(m1); setModel1(mo1); setMake2(m2); setModel2(mo2);
    runCompare(m1, mo1, m2, mo2);
  };

  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  const specs = [
    { key: 'electric_range', label: 'Range', icon: '🔋' },
    { key: 'acceleration_0_100_kmh', label: '0-100 km/h', icon: '⏱️' },
    { key: 'top_speed', label: 'Top Speed', icon: '🏎️' },
    { key: 'total_power', label: 'Power', icon: '⚡' },
    { key: 'total_torque', label: 'Torque', icon: '🔄' },
    { key: 'battery_capacity', label: 'Battery', icon: '🔌' },
    { key: 'charge_power', label: 'AC Charge', icon: '🔌' },
    { key: 'charge_power_max', label: 'DC Fast Charge', icon: '⚡' },
    { key: 'vehicle_consumption', label: 'Consumption', icon: '📊' },
    { key: 'seats', label: 'Seats', icon: '💺' },
    { key: 'length', label: 'Length', icon: '📏' },
    { key: 'cargo_volume', label: 'Cargo', icon: '📦' },
    { key: 'drive', label: 'Drive', icon: '🎯' },
    { key: 'co2_emissions', label: 'CO2', icon: '🌿' },
  ];

  return (
    <section id="ev-compare" style={{ padding: '96px 24px', background: '#050810' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }} ref={ref}>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          style={{ textAlign: 'center', marginBottom: 40 }}
        >
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.25)',
            borderRadius: 20, padding: '5px 14px', marginBottom: 16,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#00FF88', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              ⚖️ Live EV Comparison
            </span>
          </div>
          <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, color: 'white', marginBottom: 14 }}>
            Compare Any Two{' '}
            <span style={{ background: 'linear-gradient(135deg,#00FF88,#00D4FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Electric Vehicles
            </span>
          </h2>
          <p style={{ fontSize: 16, color: '#9CA3AF', maxWidth: 560, margin: '0 auto' }}>
            Real-time side-by-side spec comparison — Indian & global EV brands.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 20, alignItems: 'center',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16, padding: 24, marginBottom: 24,
          }}
        >
          {/* ✅ Using the module-level EVInput — stable identity, no remount */}
          <EVInput
            slot={1}
            make={make1}
            onMakeChange={e => setMake1(e.target.value)}
            model={model1}
            onModelChange={e => setModel1(e.target.value)}
            data={vehicle1}
          />

          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 44, height: 44, background: 'linear-gradient(135deg,#0066FF,#00D4FF)',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, color: 'white', fontSize: 14, margin: '0 auto',
              boxShadow: '0 0 20px rgba(0,102,255,0.4)',
            }}>VS</div>
          </div>

          <EVInput
            slot={2}
            make={make2}
            onMakeChange={e => setMake2(e.target.value)}
            model={model2}
            onModelChange={e => setModel2(e.target.value)}
            data={vehicle2}
          />
        </motion.div>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          {error && <div style={{ fontSize: 12, color: '#F87171', marginBottom: 12, maxWidth: 500, margin: '0 auto 12px' }}>⚠️ {error}</div>}
          <motion.button
            type="button"
            onClick={handleCompareClick}
            disabled={comparing || !make1.trim() || !make2.trim()}
            whileHover={{ scale: 1.04, boxShadow: '0 0 40px rgba(0,255,136,0.4)' }}
            whileTap={{ scale: 0.97 }}
            style={{
              background: 'linear-gradient(135deg,#00A86B,#00FF88)',
              color: '#050810', border: 'none', borderRadius: 12,
              padding: '14px 48px', fontSize: 15, fontWeight: 800,
              cursor: comparing || !make1.trim() || !make2.trim() ? 'not-allowed' : 'pointer',
              opacity: !make1.trim() || !make2.trim() ? 0.5 : 1,
              display: 'inline-flex', alignItems: 'center', gap: 8,
            }}
          >
            {comparing
              ? <><div style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#050810', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Comparing...</>
              : '⚖️ Compare Now'
            }
          </motion.button>
        </div>

        <AnimatePresence>
          {vehicle1 && vehicle2 && (
            <motion.div
              key="comparison"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}
            >
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr auto 1fr',
                background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid rgba(255,255,255,0.06)',
                padding: '16px 14px',
              }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'white' }}>{vehicle1.make}</div>
                  <div style={{ fontSize: 12, color: '#00D4FF' }}>{vehicle1.model}</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0 20px' }}>
                  <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg,#0066FF,#00D4FF)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: 'white', fontSize: 12, margin: '0 auto' }}>VS</div>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'white' }}>{vehicle2.make}</div>
                  <div style={{ fontSize: 12, color: '#00D4FF' }}>{vehicle2.model}</div>
                </div>
              </div>
              {specs.map((spec, i) => (
                <SpecRow key={spec.key} label={spec.label} icon={spec.icon} val1={vehicle1[spec.key]} val2={vehicle2[spec.key]} highlight={i % 2 === 0} />
              ))}
              <div style={{ padding: '16px 20px', background: 'rgba(0,255,136,0.05)', borderTop: '1px solid rgba(0,255,136,0.1)', textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: '#9CA3AF' }}>✓ Green = Better value</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!vehicle1 && !vehicle2 && (
          <motion.div initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 0.5 }} style={{ textAlign: 'center', marginTop: 16 }}>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 12 }}>Quick compare examples:</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              {[
                { label: 'Tata Nexon vs Mahindra XUV400', m1: 'Tata', mo1: 'Nexon', m2: 'Mahindra', mo2: 'XUV400' },
                { label: 'Tata vs Tesla', m1: 'Tata', mo1: '', m2: 'Tesla', mo2: '' },
                { label: 'Ola vs Ather', m1: 'Ola', mo1: '', m2: 'Ather', mo2: '' },
              ].map(({ label, m1, mo1, m2, mo2 }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleQuickCompare(m1, mo1, m2, mo2)}
                  style={{
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8, padding: '6px 14px', fontSize: 11, color: '#9CA3AF',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}

export { EVExplorer, EVComparator };
