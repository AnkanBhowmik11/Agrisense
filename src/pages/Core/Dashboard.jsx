/**
 * AgriSense Pro v17.1.0 Dashboard
 * High-level overview of farm health, core metrics, and active controls.
 */

// ─── IMPORTS ────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Sprout, Droplets, CloudRain, Archive,
  MapPin, Activity, Power, ChevronRight,
  ShieldCheck, RefreshCw, Camera, WifiOff,
  BellRing, Lightbulb
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
const HealthOverview = ({ score, systemHealth }) => {
  const { devices, sensorData } = useApp();
  const isOffline = score === null || score === 0;
  const healthColor = getHealthColor(score);

  const visionOnline = devices?.vision_node?.status === 'ACTIVE' || devices?.vision_node?.status === 'PARTIAL';
  const activeNodesCount = Object.values(devices || {})
    .filter(d => d?.device_id?.endsWith('_node') && d?.status === 'ACTIVE').length
    + (visionOnline ? 1 : 0);
  const totalNodesCount = 5; // Soil, Weather, Irrigation, Storage, Vision

  const systems = [
    { label: 'Soil',       color: '#10B981', active: systemHealth?.soil      != null },
    { label: 'Weather',    color: '#14B8A6', active: systemHealth?.weather   != null },
    { label: 'Irrigation', color: '#0EA5E9', active: systemHealth?.water     != null },
    { label: 'Storage',    color: '#8B5CF6', active: systemHealth?.storage   != null },
    { label: 'Vision',     color: '#EC4899', active: visionOnline },
  ];

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
                animate={{ strokeDashoffset: 283 - (283 * (score || 0) / 100) }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 950, color: COLORS.textMain }}>{isOffline ? '--' : Math.round(score || 0)}<small style={{ fontSize: '0.8rem', opacity: 0.5 }}>%</small></div>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: healthColor }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 900, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>System Integrity</span>
            </div>
            <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 950, color: COLORS.textMain, letterSpacing: '-0.02em' }}>
              {isOffline ? 'OFFLINE' : (score >= 80 ? 'OPTIMAL' : score >= 50 ? 'STABLE' : 'CRITICAL')}
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

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────
const Dashboard = () => {
  const navigate = useNavigate();
  const {
    sensorData, farmHealthScore, systemHealth,
    toggleActuator, actuators, ACTUATORS,
    user, devices, farmInfo, syncData
  } = useApp();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSyncing, setIsSyncing] = useState(false);

  const visionOnline = devices?.vision_node?.status === 'ACTIVE' || devices?.vision_node?.status === 'PARTIAL';

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSync = () => {
    setIsSyncing(true);
    window.location.reload();
  };

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

      <section style={{ marginBottom: '1.8rem', padding: '0 4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '0.9rem', fontWeight: 600, color: COLORS.textMuted, margin: 0 }}>
              {getGreeting()}
            </h1>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: COLORS.textMain, margin: '1px 0 0 0', letterSpacing: '-0.02em' }}>
              {user?.name || 'Guest Farmer'}
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSync}
              style={{ 
                cursor: 'pointer', padding: '10px 18px', borderRadius: '18px', 
                background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)',
                border: '1px solid rgba(0,0,0,0.05)',
                boxShadow: '0 8px 25px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '10px'
              }}
            >
              <motion.div animate={{ rotate: isSyncing ? 360 : 0 }} transition={{ duration: 1, repeat: isSyncing ? Infinity : 0, ease: "linear" }}>
                <RefreshCw size={18} color={isSyncing ? COLORS.primary : COLORS.textMuted} />
              </motion.div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: COLORS.textMuted, letterSpacing: '0.05em' }}>SYNC</span>
            </motion.button>
          </div>
        </div>

        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px', color: COLORS.textMuted, fontSize: '0.85rem', fontWeight: 600 }}>
          <MapPin size={15} color={COLORS.primary} />
          <span>{user?.location?.includes('•') ? user.location.split('•')[1].trim() : (user?.location || 'Set farm location')}</span>
        </div>
      </section>

      <HealthOverview score={farmHealthScore} systemHealth={systemHealth} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.1rem', marginBottom: '1.8rem' }}>
        <SensorCard
          title="Soil Health" nodeType="soil"
          value={systemHealth?.soil != null ? `${Math.round(systemHealth.soil || 0)} %` : '---'}
          icon={Sprout} color="#10B981"
          status={devices?.['soil_node']?.status || (sensorData?.soil?.moisture ? 'ACTIVE' : 'OFFLINE')}
          score={systemHealth?.soil}
          onClick={() => navigate('/soil-monitoring')}
        />
        <SensorCard
          title="Irrigation Health" nodeType="irrigation"
          value={systemHealth?.water != null ? `${Math.round(systemHealth.water || 0)} %` : '---'}
          icon={Droplets} color="#0EA5E9"
          status={devices?.['water_node']?.status || (sensorData?.water?.level ? 'ACTIVE' : 'OFFLINE')}
          score={systemHealth?.water}
          onClick={() => navigate('/irrigation')}
        />
        <SensorCard
          title="Weather Health" nodeType="weather"
          value={systemHealth?.weather != null ? `${Math.round(systemHealth.weather || 0)} %` : '---'}
          icon={CloudRain} color="#14B8A6"
          status={devices?.['weather_node']?.status || (sensorData?.weather?.temp ? 'ACTIVE' : 'OFFLINE')}
          score={systemHealth?.weather}
          onClick={() => navigate('/weather')}
        />
        <SensorCard
          title="Storage Health" nodeType="storage"
          value={systemHealth?.storage != null ? `${Math.round(systemHealth.storage || 0)} %` : '---'}
          icon={Archive} color="#8B5CF6"
          status={devices?.['storage_node']?.status || (sensorData?.storage?.temp ? 'ACTIVE' : 'OFFLINE')}
          score={systemHealth?.storage}
          onClick={() => navigate('/storage-hub')}
        />
      </div>

      {/* Vision Node Mini Card */}
      <CamMiniCard
        isOnline={visionOnline}
        onClick={() => navigate('/camera')}
      />

      <section style={{ background: COLORS.cardBg, borderRadius: '28px', padding: '1.25rem 1.25rem 1.4rem', border: `1px solid ${COLORS.border}`, boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: COLORS.textMain, margin: 0 }}>Active Controls</h3>
          <Activity size={18} color={isPumpActive ? COLORS.primary : COLORS.textMuted} />
        </div>

        {/* 3-column control grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {[
            { key: ACTUATORS?.PUMP,   icon: Power,     label: 'Pump',   color: '#3B82F6', bg: '#EFF6FF' },
            { key: ACTUATORS?.BUZZER, icon: BellRing,  label: 'Buzzer', color: '#EF4444', bg: '#FEF2F2' },
            { key: ACTUATORS?.LIGHT,  icon: Lightbulb, label: 'Light',  color: '#10B981', bg: '#ECFDF5' },
          ].map(({ key, icon: Icon, label, color, bg }) => {
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
          AgriSense Pro • v{farmInfo?.version || '2.8.0'}
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
