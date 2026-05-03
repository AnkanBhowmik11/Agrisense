/**
 * AgriSense Pro v17.1.0 Dashboard
 * High-level overview of farm health, core metrics, and active controls.
 */

// ─── IMPORTS ────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Sprout, Droplets, CloudRain, Archive,
  MapPin, Activity, Power, ChevronRight,
  ShieldCheck, RefreshCw, Camera, WifiOff,
  BellRing, Lightbulb, ChevronDown, Plus, Settings2, Calendar, Server, Leaf, FileSearch
} from 'lucide-react';

// Context & Utils
import { useApp } from '../../state/AppContext';
import { getHealthColor } from '../../logic/healthEngine';

// ─── DESIGN TOKENS ─────────────────────────────────────────────────────────
const COLORS = {
  primary: '#10B981',
  primaryDark: '#059669',
  secondary: '#0EA5E9',
  background: '#F8FAFC',
  cardBg: '#FFFFFF',
  textMain: '#0F172A',
  textMuted: '#64748B',
  border: 'rgba(0, 0, 0, 0.04)',
};

const FIELD_MARKER_ICON = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const MapPinSelector = ({ onPick }) => {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
};

// ─── SUB-COMPONENTS ────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const isActive = status && status !== 'OFFLINE';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      background: isActive ? '#ECFDF5' : '#FEF2F2',
      padding: '6px 12px', borderRadius: '12px',
      border: `1px solid ${isActive ? '#10B98130' : '#EF444430'}`,
      transition: '0.3s'
    }}>
      <motion.div
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{ width: '6px', height: '6px', borderRadius: '50%', background: isActive ? '#10B981' : '#EF4444' }}
      />
      <span style={{ fontSize: '0.65rem', fontWeight: 900, color: isActive ? '#059669' : '#B91C1C', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
        System {isActive ? 'Active' : 'Offline'}
      </span>
    </div>
  );
};

/**
 * HealthOverview: Circular progress and system status dots
 */
const HealthOverview = ({ score, systemHealth, enabledFeatures = [] }) => {
  const { devices, sensorData } = useApp();
  const [visionOk, setVisionOk] = useState(false);

  useEffect(() => {
    let timer;
    let active = true;
    const checkVision = async () => {
      try {
        const res = await fetch('http://192.168.29.35:5050/health');
        if (res.ok && active) {
          setVisionOk(true);
          return;
        }
      } catch (_) {}
      try {
        await fetch('http://192.168.29.201/capture', { mode: 'no-cors' });
        if (active) setVisionOk(true);
      } catch (_) {}
      if (active) timer = setTimeout(checkVision, 5000);
    };
    checkVision();
    return () => { active = false; clearTimeout(timer); };
  }, []);

  const healthColor = getHealthColor(score);
  const visionOnline = devices?.vision_node?.status === 'ACTIVE' || devices?.vision_node?.status === 'PARTIAL' || visionOk;

  const systemsAll = [
    { id: 'soil', label: 'Soil', color: '#10B981', active: systemHealth?.soil != null },
    { id: 'weather', label: 'Weather', color: '#14B8A6', active: systemHealth?.weather != null },
    { id: 'irrigation', label: 'Irrigation', color: '#0EA5E9', active: systemHealth?.water != null },
    { id: 'storage', label: 'Storage', color: '#8B5CF6', active: systemHealth?.storage != null },
    { id: 'vision', label: 'Vision', color: '#EC4899', active: visionOnline },
  ];

  const systems = systemsAll.filter(s => enabledFeatures.length === 0 || enabledFeatures.includes(s.id));
  const totalNodesCount = systems.length;
  const activeNodesCount = systems.filter(s => s.active).length;
  const calcScore = totalNodesCount > 0 ? Math.round((activeNodesCount / totalNodesCount) * 100) : 0;
  const isOffline = calcScore === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'white', borderRadius: '32px', padding: '2rem',
        border: `1px solid ${COLORS.border}`, boxShadow: '0 20px 40px rgba(0,0,0,0.04)',
        marginBottom: '2rem', position: 'relative', overflow: 'hidden'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2, marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '100px', height: '100px' }}>
            <svg width="100" height="100" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#F1F5F9" strokeWidth="8" />
              <motion.circle
                cx="50" cy="50" r="45" fill="none"
                stroke={healthColor}
                strokeWidth="8" strokeLinecap="round"
                strokeDasharray="283"
                initial={{ strokeDashoffset: 283 }}
                animate={{ strokeDashoffset: 283 - (283 * calcScore / 100) }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 950, color: COLORS.textMain }}>{isOffline ? '--' : calcScore}<small style={{ fontSize: '0.8rem', opacity: 0.5 }}>%</small></div>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: healthColor }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 900, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>System Integrity</span>
            </div>
            <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 950, color: COLORS.textMain, letterSpacing: '-0.02em' }}>
              {isOffline ? 'OFFLINE' : (calcScore >= 80 ? 'OPTIMAL' : calcScore >= 50 ? 'STABLE' : 'CRITICAL')}
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', fontWeight: 600, color: COLORS.textMuted }}>
              {activeNodesCount} of {totalNodesCount} nodes broadcasting.
            </p>
          </div>
        </div>
      </div>

      {/* ── 5-Node Status Row ── */}
      <div style={{
        display: 'flex', gap: '8px', alignItems: 'stretch',
      }}>
        {systems.map((s) => (
          <div
            key={s.label}
            style={{
              flex: 1,
              background: s.active ? `${s.color}10` : '#F8FAFC',
              border: `1px solid ${s.active ? `${s.color}25` : 'rgba(0,0,0,0.04)'}`,
              borderRadius: '14px',
              padding: '8px 4px',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '5px',
              transition: 'all 0.3s ease',
            }}
          >
            <motion.div
              animate={s.active ? { opacity: [1, 0.4, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                width: '7px', height: '7px', borderRadius: '50%',
                background: s.active ? s.color : '#CBD5E1',
                boxShadow: s.active ? `0 0 0 3px ${s.color}20` : 'none',
              }}
            />
            <span style={{
              fontSize: '0.55rem', fontWeight: 800,
              color: s.active ? s.color : COLORS.textMuted,
              textTransform: 'uppercase', letterSpacing: '0.04em',
              textAlign: 'center', lineHeight: 1.2,
            }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

/**
 * SensorCard: Navigational card for major monitoring nodes
 */
const SensorCard = ({ title, value, icon: Icon, color, status, score, onClick, nodeType }) => {
  const isConnected = status === 'CONNECTED' || status === 'ACTIVE' || status === 'PARTIAL';
  const hColor = getHealthColor(score);

  const themeColor = isConnected ? ({
    soil: '#10B981',
    irrigation: '#0EA5E9',
    water: '#0EA5E9',
    weather: '#14B8A6',
    storage: '#8B5CF6',
  }[nodeType] || color) : '#CBD5E1';

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.97 }} onClick={onClick}
      style={{
        background: COLORS.cardBg, borderRadius: '28px', padding: '1.25rem',
        border: `1px solid ${COLORS.border}`, boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
        cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{
          width: '46px', height: '46px', borderRadius: '14px',
          background: isConnected ? `${themeColor}25` : '#F1F5F9',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Icon size={22} color={themeColor} strokeWidth={2.5} />
        </div>
      </div>
      <div>
        <div style={{ fontSize: '0.65rem', color: COLORS.textMuted, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>{title}</div>
        <div style={{
          fontSize: '1.65rem', fontWeight: 950,
          color: value === '---' ? '#CBD5E1' : hColor,
          letterSpacing: '-0.02em', whiteSpace: 'nowrap',
          lineHeight: 1
        }}>
          {value}
        </div>
      </div>
    </motion.div>
  );
};

// ─── CAM MINI CARD ──────────────────────────────────────────────────────────
const CamMiniCard = ({ isOnline, onClick }) => (
  <motion.div
    whileTap={{ scale: 0.97 }}
    onClick={onClick}
    style={{
      background: COLORS.cardBg, borderRadius: '28px',
      padding: '1.1rem 1.25rem',
      border: `1px solid ${isOnline ? 'rgba(236,72,153,0.15)' : COLORS.border}`,
      boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
      cursor: 'pointer', marginBottom: '1.8rem',
      display: 'flex', alignItems: 'center', gap: '14px',
    }}
  >
    {/* Dark cam preview box */}
    <div style={{
      width: '72px', height: '52px', borderRadius: '14px',
      background: '#0F172A', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {isOnline ? (
        <>
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              position: 'absolute', top: '6px', right: '6px',
              width: '5px', height: '5px', borderRadius: '50%', background: '#EC4899',
            }}
          />
          <Camera size={18} color="#EC4899" strokeWidth={2} />
        </>
      ) : (
        <WifiOff size={16} color="#475569" strokeWidth={2} />
      )}
    </div>

    {/* Label + status */}
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: '0.65rem', fontWeight: 900, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px' }}>
        Vision Node
      </div>
      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: COLORS.textMain }}>Field Camera</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px' }}>
        <motion.div
          animate={isOnline ? { opacity: [1, 0.4, 1] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ width: '5px', height: '5px', borderRadius: '50%', background: isOnline ? '#EC4899' : '#94A3B8' }}
        />
        <span style={{ fontSize: '0.62rem', fontWeight: 800, color: isOnline ? '#EC4899' : '#94A3B8' }}>
          {isOnline ? 'CAM LIVE — Tap to view' : 'No Signal'}
        </span>
      </div>
    </div>

    <ChevronRight size={18} color={COLORS.textMuted} strokeWidth={2} />
  </motion.div>
);

// ─── FIELD SETUP WIZARD ──────────────────────────────────────────────────
const FieldSetupWizard = ({ onComplete, user, onCancel, showCancel = false }) => {
  const INDIA_CENTER = { lat: 20.5937, lng: 78.9629 };
  const [formData, setFormData] = useState({
    name: '', location: '', crop: '',
    startDate: new Date().toISOString().split('T')[0],
    durationYears: 0, durationMonths: 0,
    serverId: '192.168.4.100', features: []
  });
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [mapCenter, setMapCenter] = useState(INDIA_CENTER);
  const [selectedPoint, setSelectedPoint] = useState(null);

  const handleGetLocation = async () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const picked = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setMapCenter(picked);
          setSelectedPoint(picked);
          setIsMapOpen(true);
          setIsLocating(false);
        },
        () => {
          setIsMapOpen(true);
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setIsMapOpen(true);
      setIsLocating(false);
    }
  };

  const handleSavePickedLocation = () => {
    if (!selectedPoint) {
      alert('Please select a location pin on the map.');
      return;
    }
    setFormData(prev => ({
      ...prev,
      location: `${selectedPoint.lat.toFixed(6)}, ${selectedPoint.lng.toFixed(6)}`
    }));
    setIsMapOpen(false);
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning,';
    if (h < 17) return 'Good Afternoon,';
    if (h < 21) return 'Good Evening,';
    return 'Good Night,';
  };

  const crops = ['Wheat', 'Corn', 'Rice', 'Soybeans', 'Potatoes', 'Tomatoes', 'Cotton'];
  const allFeatures = [
    { id: 'soil', label: 'Soil Monitor', icon: Sprout },
    { id: 'weather', label: 'Weather Monitor', icon: CloudRain },
    { id: 'irrigation', label: 'Irrigation System', icon: Droplets },
    { id: 'storage', label: 'Crop Storage', icon: Archive },
    { id: 'vision', label: 'Vision Camera', icon: Camera }
  ];

  const toggleFeature = (id) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(id)
        ? prev.features.filter(f => f !== id)
        : [...prev.features, id]
    }));
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.crop || formData.features.length === 0) {
      alert("Please provide a Field Name, Crop, and select at least one Feature.");
      return;
    }
    onComplete(formData);
  };

  return (
    <div style={{ padding: '1.5rem', background: COLORS.background, minHeight: '100vh', fontFamily: "'Outfit', sans-serif" }}>

      {/* Greetings */}
      <section style={{ marginBottom: '1.8rem', padding: '0 4px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '0.9rem', fontWeight: 600, color: COLORS.textMuted, margin: 0 }}>
          {getGreeting()}
        </h1>
        <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: COLORS.textMain, margin: '1px 0 0 0', letterSpacing: '-0.02em' }}>
          {user?.name || 'Guest Farmer'}
        </h2>
      </section>

      <div style={{ textAlign: 'center', marginBottom: '2rem', marginTop: '1rem' }}>
        <div style={{ display: 'inline-flex', padding: '12px', background: `${COLORS.primary}15`, borderRadius: '20px', marginBottom: '12px' }}>
          <Leaf size={32} color={COLORS.primary} />
        </div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: COLORS.textMain, margin: '0' }}>Setup Your Field</h1>
        <p style={{ fontSize: '0.9rem', color: COLORS.textMuted, margin: '6px 0 0 0' }}>Configure your field and select hardware nodes.</p>
      </div>

      <div style={{ background: 'white', borderRadius: '24px', padding: '1.5rem', border: `1px solid ${COLORS.border}`, boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>

        {/* Basic Info */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 800, color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Field Details</label>
          <input type="text" placeholder="Field Name (e.g. North Zone)" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} style={inputStyle} />

          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <input type="text" placeholder="Location via GPS" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleGetLocation} style={{ background: COLORS.primary, border: 'none', borderRadius: '12px', width: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: isLocating ? 0.7 : 1 }} disabled={isLocating}>
              <MapPin size={18} color="white" />
            </motion.button>
          </div>
          <select value={formData.crop} onChange={e => setFormData({ ...formData, crop: e.target.value })} style={{ ...inputStyle, marginTop: '10px' }}>
            <option value="" disabled>Select Crop</option>
            {crops.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Duration */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 800, color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={14} /> Schedule & Duration
          </label>

          {/* Start Date */}
          <div style={{ marginBottom: '10px' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: COLORS.textMuted }}>Start Date:</span>
            <input
              type="date"
              value={formData.startDate}
              max={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
              onChange={e => setFormData({ ...formData, startDate: e.target.value })}
              style={{ ...inputStyle, marginTop: '4px' }}
            />
          </div>

          {/* Duration Scrollers */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: COLORS.textMuted }}>Years:</span>
              <select value={formData.durationYears} onChange={e => setFormData({ ...formData, durationYears: Number(e.target.value) })} style={{ ...inputStyle, marginTop: '4px' }}>
                {[...Array(11)].map((_, i) => <option key={i} value={i}>{i} Years</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: COLORS.textMuted }}>Months:</span>
              <select value={formData.durationMonths} onChange={e => setFormData({ ...formData, durationMonths: Number(e.target.value) })} style={{ ...inputStyle, marginTop: '4px' }}>
                {[...Array(12)].map((_, i) => <option key={i} value={i}>{i} Months</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Server */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 800, color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Server size={14} /> Server ID
          </label>
          <input type="text" placeholder="Server ID (IP)" value={formData.serverId} onChange={e => setFormData({ ...formData, serverId: e.target.value })} style={inputStyle} />
        </div>

        {/* Features */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 800, color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: '10px', display: 'block' }}>Enable Features</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {allFeatures.map(f => {
              const isActive = formData.features.includes(f.id);
              return (
                <div key={f.id} onClick={() => toggleFeature(f.id)} style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                  borderRadius: '14px', border: `1.5px solid ${isActive ? COLORS.primary : COLORS.border}`,
                  background: isActive ? `${COLORS.primary}08` : '#F8FAFC', cursor: 'pointer'
                }}>
                  <f.icon size={20} color={isActive ? COLORS.primary : COLORS.textMuted} />
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: isActive ? COLORS.primaryDark : COLORS.textMain }}>{f.label}</span>
                  <div style={{ marginLeft: 'auto', width: '20px', height: '20px', borderRadius: '6px', border: `2px solid ${isActive ? COLORS.primary : COLORS.border}`, background: isActive ? COLORS.primary : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isActive && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ width: '10px', height: '10px', background: 'white', borderRadius: '3px' }} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {showCancel && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onCancel}
              style={{ width: '40%', padding: '16px', borderRadius: '16px', background: '#E2E8F0', color: COLORS.textMain, border: 'none', fontSize: '0.95rem', fontWeight: 800, cursor: 'pointer' }}
            >
              CANCEL
            </motion.button>
          )}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleSubmit}
            style={{ width: showCancel ? '60%' : '100%', padding: '16px', borderRadius: '16px', background: COLORS.primary, color: 'white', border: 'none', fontSize: '1rem', fontWeight: 800, cursor: 'pointer', boxShadow: `0 8px 25px ${COLORS.primary}40` }}
          >
            COMPLETE SETUP
          </motion.button>
        </div>
      </div>

      {isMapOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '560px', background: 'white', borderRadius: '20px', border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 800, color: COLORS.textMain }}>Pick Field Location</div>
              <button onClick={() => setIsMapOpen(false)} style={{ border: 'none', background: 'transparent', color: COLORS.textMuted, cursor: 'pointer', fontWeight: 700 }}>Close</button>
            </div>

            <div style={{ height: '340px' }}>
              <MapContainer center={[mapCenter.lat, mapCenter.lng]} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
                <MapPinSelector onPick={setSelectedPoint} />
                {selectedPoint && <Marker position={[selectedPoint.lat, selectedPoint.lng]} icon={FIELD_MARKER_ICON} />}
              </MapContainer>
            </div>

            <div style={{ padding: '12px 14px', borderTop: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
              <div style={{ fontSize: '0.78rem', color: COLORS.textMuted }}>
                {selectedPoint ? `${selectedPoint.lat.toFixed(6)}, ${selectedPoint.lng.toFixed(6)}` : 'Tap map to place pin'}
              </div>
              <button onClick={handleSavePickedLocation} style={{ border: 'none', background: COLORS.primary, color: 'white', borderRadius: '10px', padding: '8px 12px', fontWeight: 800, cursor: 'pointer' }}>
                Save Pin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const inputStyle = {
  width: '100%', padding: '12px 14px', borderRadius: '12px', border: `1px solid ${COLORS.border}`,
  background: '#F8FAFC', fontSize: '0.9rem', fontWeight: 600, color: COLORS.textMain, outline: 'none'
};

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────
const Dashboard = () => {
  const navigate = useNavigate();
  const {
    sensorData, farmHealthScore, systemHealth,
    toggleActuator, actuators, ACTUATORS,
    user, devices, farmInfo, syncData,
    fields, activeField, activeFieldId, addField, switchField, apiWeather, t
  } = useApp();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSyncing, setIsSyncing] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isAddingField, setIsAddingField] = useState(false);
  const [sensorAlert, setSensorAlert] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    const pollAlerts = async () => {
      try {
        const res = await fetch('http://192.168.29.200/status');
        if (!res.ok) return;
        const data = await res.json();
        if (data.alert && active) {
          setSensorAlert(data.alert);
        } else if (active) {
          setSensorAlert(null);
        }
      } catch (_) {
        if (active) setSensorAlert(null);
      }
    };
    pollAlerts();
    const interval = setInterval(pollAlerts, 4000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const handleSync = () => {
    setIsSyncing(true);
    window.location.reload();
  };

  if (!activeField || isAddingField) {
    return (
      <FieldSetupWizard
        onComplete={async (data) => {
          await addField(data);
          setIsAddingField(false);
        }}
        onCancel={() => setIsAddingField(false)}
        showCancel={fields.length > 0}
        user={user}
      />
    );
  }

  const [visionOkLocal, setVisionOkLocal] = useState(false);
  useEffect(() => {
    let active = true;
    let timer;
    const checkLocalVision = async () => {
      try {
        const res = await fetch('http://192.168.29.35:5050/health');
        if (res.ok && active) {
          setVisionOkLocal(true);
          return;
        }
      } catch (_) {}
      try {
        await fetch('http://192.168.29.201/capture', { mode: 'no-cors' });
        if (active) setVisionOkLocal(true);
      } catch (_) {}
      if (active) timer = setTimeout(checkLocalVision, 5000);
    };
    checkLocalVision();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  const enabled = activeField.features || [];
  const visionOnline = devices?.vision_node?.status === 'ACTIVE' || devices?.vision_node?.status === 'PARTIAL' || visionOkLocal;
  const isPumpActive = actuators ? actuators[ACTUATORS?.PUMP] : false;

  const getGreeting = () => {
    const h = currentTime.getHours();
    if (h < 12) return 'Good Morning,';
    if (h < 17) return 'Good Afternoon,';
    if (h < 21) return 'Good Evening,';
    return 'Good Night,';
  };

  return (
    <div style={{ padding: '1.25rem', paddingBottom: '10px', background: COLORS.background, fontFamily: "'Outfit', sans-serif" }}>

      {sensorAlert && (
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', padding: '12px 16px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.08)' }}
        >
          <BellRing size={20} color="#EF4444" style={{ flexShrink: 0 }} />
          <div>
            <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 850, color: '#991B1B' }}>Live Field Alert</h4>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', fontWeight: 650, color: '#B91C1C' }}>{sensorAlert}</p>
          </div>
        </motion.div>
      )}

      {/* ── TOP HEADER & GREETING ── */}
      <section style={{ marginBottom: '1.8rem', padding: '0 4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '0.9rem', fontWeight: 600, color: COLORS.textMuted, margin: 0 }}>
              {getGreeting()}
            </h1>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: COLORS.textMain, margin: '1px 0 0 0', letterSpacing: '-0.02em' }}>
              {user?.name || 'Guest Farmer'} 👋
            </h2>

            {/* Field Dropdown */}
            <div style={{ position: 'relative', marginTop: '10px' }}>
              <div
                onClick={() => setShowDropdown(!showDropdown)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'white', borderRadius: '12px', border: `1px solid ${COLORS.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.02)', cursor: 'pointer' }}
              >
                <Sprout size={14} color={COLORS.primary} />
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: COLORS.textMain }}>{activeField.name}</span>
                <ChevronDown size={14} color={COLORS.textMuted} />
              </div>

              {showDropdown && (
                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', background: 'white', borderRadius: '14px', border: `1px solid ${COLORS.border}`, boxShadow: '0 10px 30px rgba(0,0,0,0.08)', zIndex: 100, minWidth: '200px', overflow: 'hidden' }}>
                  {fields.map(f => (
                    <div
                      key={f.id}
                      onClick={() => { switchField(f.id); setShowDropdown(false); }}
                      style={{ padding: '10px 14px', fontSize: '0.8rem', fontWeight: 700, color: f.id === activeFieldId ? COLORS.primary : COLORS.textMain, background: f.id === activeFieldId ? `${COLORS.primary}10` : 'transparent', cursor: 'pointer', borderBottom: `1px solid ${COLORS.border}` }}
                    >
                      {f.name}
                    </div>
                  ))}
                  <div
                    onClick={() => { setIsAddingField(true); setShowDropdown(false); }}
                    style={{ padding: '10px 14px', fontSize: '0.8rem', fontWeight: 800, color: COLORS.secondary, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                  >
                    <Plus size={14} /> Add New Field
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSync}
              style={{
                cursor: 'pointer', padding: '10px', borderRadius: '14px',
                background: 'white', border: `1px solid ${COLORS.border}`,
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <motion.div animate={{ rotate: isSyncing ? 360 : 0 }} transition={{ duration: 1, repeat: isSyncing ? Infinity : 0, ease: "linear" }}>
                <RefreshCw size={18} color={isSyncing ? COLORS.primary : COLORS.textMuted} />
              </motion.div>
            </motion.button>
          </div>
        </div>

        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: COLORS.textMuted, fontSize: '0.75rem', fontWeight: 600 }}>
          <MapPin size={14} color={COLORS.primary} />
          <span>{activeField.location} • {activeField.crop}</span>
          {apiWeather && apiWeather.temp && (
            <span style={{ marginLeft: '4px', paddingLeft: '8px', borderLeft: '1px solid #CBD5E1', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <CloudRain size={14} color={COLORS.secondary} />
              <span>{apiWeather.temp}°C, {apiWeather.condition}</span>
            </span>
          )}
        </div>
      </section>

      <HealthOverview score={farmHealthScore} systemHealth={systemHealth} enabledFeatures={enabled} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.1rem', marginBottom: '1.8rem' }}>
        {enabled.includes('soil') && (
          <SensorCard
            title={t('soil_health')} nodeType="soil"
            value={systemHealth?.soil != null ? `${Math.round(systemHealth.soil || 0)} %` : '---'}
            icon={Sprout} color="#10B981"
            status={devices?.['soil_node']?.status || (sensorData?.soil?.moisture ? 'ACTIVE' : 'OFFLINE')}
            score={systemHealth?.soil}
            onClick={() => navigate('/soil-monitoring')}
          />
        )}
        {enabled.includes('irrigation') && (
          <SensorCard
            title={t('irrigation_health')} nodeType="irrigation"
            value={systemHealth?.water != null ? `${Math.round(systemHealth.water || 0)} %` : '---'}
            icon={Droplets} color="#0EA5E9"
            status={devices?.['water_node']?.status || (sensorData?.water?.level ? 'ACTIVE' : 'OFFLINE')}
            score={systemHealth?.water}
            onClick={() => navigate('/irrigation')}
          />
        )}
        {enabled.includes('weather') && (
          <SensorCard
            title={t('weather_health')} nodeType="weather"
            value={systemHealth?.weather != null ? `${Math.round(systemHealth.weather || 0)} %` : '---'}
            icon={CloudRain} color="#14B8A6"
            status={devices?.['weather_node']?.status || (sensorData?.weather?.temp ? 'ACTIVE' : 'OFFLINE')}
            score={systemHealth?.weather}
            onClick={() => navigate('/weather')}
          />
        )}
        {enabled.includes('storage') && (
          <SensorCard
            title={t('storage_health')} nodeType="storage"
            value={systemHealth?.storage != null ? `${Math.round(systemHealth.storage || 0)} %` : '---'}
            icon={Archive} color="#8B5CF6"
            status={devices?.['storage_node']?.status || (sensorData?.storage?.temp ? 'ACTIVE' : 'OFFLINE')}
            score={systemHealth?.storage}
            onClick={() => navigate('/storage-hub')}
          />
        )}
      </div>

      {enabled.includes('vision') && (
        <CamMiniCard
          isOnline={visionOnline}
          onClick={() => navigate('/camera')}
        />
      )}

      {/* ── GET FARM REPORT ── */}
      <motion.div
        whileTap={{ scale: 0.98 }}
        onClick={() => navigate('/reports')}
        style={{
          background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
          borderRadius: '24px', padding: '1rem 1.25rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', boxShadow: '0 8px 25px rgba(16, 185, 129, 0.25)',
          marginBottom: '1.5rem', color: 'white'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Archive size={22} color="white" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Daily Archives</h3>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.9, margin: '2px 0 0 0' }}>Past AI audits & telemetry</p>
          </div>
        </div>
        <ChevronRight size={20} color="white" />
      </motion.div>

      {/* Only show active controls if corresponding features are enabled */}
      <section style={{ background: COLORS.cardBg, borderRadius: '28px', padding: '1.25rem 1.25rem 1.4rem', border: `1px solid ${COLORS.border}`, boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: COLORS.textMain, margin: 0 }}>Active Controls</h3>
          <Activity size={18} color={isPumpActive ? COLORS.primary : COLORS.textMuted} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {[
            { key: ACTUATORS?.PUMP, icon: Power, label: 'Pump', color: '#3B82F6', bg: '#EFF6FF', req: 'irrigation' },
            { key: ACTUATORS?.BUZZER, icon: BellRing, label: 'Buzzer', color: '#EF4444', bg: '#FEF2F2', req: 'vision' },
            { key: ACTUATORS?.LIGHT, icon: Lightbulb, label: 'Light', color: '#10B981', bg: '#ECFDF5', req: 'vision' },
          ].map(({ key, icon: Icon, label, color, bg, req }) => {
            if (!enabled.includes(req) && req !== 'all') return null;
            const isOn = actuators?.[key] ?? false;
            return (
              <motion.div
                key={label}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleActuator(key)}
                style={{
                  background: isOn ? color : '#F8FAFC',
                  border: `1.5px solid ${isOn ? color : 'rgba(0,0,0,0.05)'}`,
                  borderRadius: '20px', padding: '14px 8px',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: '8px',
                  cursor: 'pointer',
                  boxShadow: isOn ? `0 4px 16px ${color}30` : 'none',
                  transition: 'all 0.25s ease',
                }}
              >
                <div style={{
                  width: '38px', height: '38px', borderRadius: '12px',
                  background: isOn ? 'rgba(255,255,255,0.22)' : bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={18} color={isOn ? '#fff' : color} strokeWidth={2} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: isOn ? '#fff' : COLORS.textMain }}>{label}</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      <footer style={{ textAlign: 'center', marginTop: '1.5rem', paddingBottom: '5px' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#CBD5E1', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          AgriSense Pro • Server: {activeField.serverId}
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
