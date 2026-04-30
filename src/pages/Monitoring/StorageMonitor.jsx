import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Thermometer, Droplet, Wind, ShieldCheck, 
  ChevronRight, Server, Clock, Activity, Minus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../state/AppContext';

// ─── DESIGN TOKENS (UNIFIED) ───────────────────────────────────────────────

const COLORS = {
  primary: '#8B5CF6',
  secondary: '#0EA5E9',
  warning: '#F59E0B',
  critical: '#F43F5E',
  offline: '#94A3B8',
  bg: '#F8FAFC',
  text: '#0F172A',
  subtext: '#64748B',
  white: '#FFFFFF',
  border: '#E2E8F0'
};

const GRADIENTS = {
  optimal: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
  moderate: 'linear-gradient(135deg, #FFD54F 0%, #FBC02D 100%)',
  low: 'linear-gradient(135deg, #EF5350 0%, #D32F2F 100%)',
  critical: 'linear-gradient(135deg, #F43F5E 0%, #BE123C 100%)',
  offline: 'linear-gradient(135deg, #94A3B8 0%, #64748B 100%)'
};

// ─── SUB-COMPONENTS (UNIFIED SYSTEM) ───────────────────────────────────────

const DiagnosticCard = ({ label, value, icon: Icon, color, statusText = '', range, unit }) => {
  const isOffline = value === null || value === undefined || value === '---';
  const safeStatus = (statusText || '').toLowerCase();
  
  const isOptimal = safeStatus.includes('optimal') || safeStatus.includes('normal') || safeStatus.includes('safe') || safeStatus.includes('protected');
  const isModerate = safeStatus.includes('moderate') || safeStatus.includes('warning');
  const isCritical = safeStatus.includes('critical') || safeStatus.includes('high') || safeStatus.includes('low');
  
  const stateColor = isOffline ? COLORS.offline : (isOptimal ? COLORS.primary : (isModerate ? COLORS.warning : COLORS.critical));
  const cardBg = isOffline ? '#F1F5F9' : (isOptimal ? '#F5F3FF' : (isModerate ? '#FFFBEB' : '#FEF2F2'));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
      style={{
        background: cardBg, borderRadius: '28px', padding: '1.25rem 1rem',
        border: `1.5px solid ${isOffline ? '#E2E8F0' : COLORS.border}`,
        boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
        position: 'relative', height: '185px',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', overflow: 'hidden'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: COLORS.subtext, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8 }}>{label}</span>
        <Icon size={18} color={isOffline ? COLORS.offline : color} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <h2 style={{ 
          margin: 0, 
          fontSize: isOffline ? '1.5rem' : '2.5rem', 
          fontWeight: 800, 
          color: isOffline ? '#CBD5E1' : COLORS.text, 
          letterSpacing: isOffline ? '0.05em' : '-0.04em', 
          lineHeight: 1 
        }}>
          {isOffline ? 'OFFLINE' : value}<span style={{ fontSize: '1rem', opacity: 0.3, marginLeft: '2px' }}>{isOffline ? '' : unit}</span>
        </h2>
        {!isOffline && (
          <div style={{ 
            marginTop: '10px', padding: '6px 22px', borderRadius: '100px', 
            background: stateColor, color: 'white', fontSize: '0.65rem', fontWeight: 800,
            textTransform: 'uppercase', letterSpacing: '0.12em'
          }}>
            {statusText}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '12px' }}>
        <div style={{ textAlign: 'left' }}>
          <p style={{ margin: 0, fontSize: '0.55rem', fontWeight: 800, color: COLORS.subtext, opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>IDEAL RANGE</p>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', fontWeight: 800, color: COLORS.subtext }}>{range}</p>
        </div>
        <div style={{ opacity: 0.3 }}>
          <Activity size={16} color={COLORS.subtext} />
        </div>
      </div>
    </motion.div>
  );
};

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────

const StorageMonitoring = () => {
  const navigate = useNavigate();
  const { sensorData, systemHealth, lastGlobalUpdate } = useApp();

  const storage = sensorData?.storage || {};
  const storageScore = systemHealth.storage || 0;
  
  const stats = useMemo(() => ({
    temp: storage.temp !== null ? Number(storage.temp).toFixed(1) : null,
    hum: storage.humidity !== null ? Number(storage.humidity).toFixed(0) : null,
    gas: storage.mq135 !== null ? Number(storage.mq135).toFixed(0) : null,
  }), [storage]);

  const isOnline = stats.temp !== null || stats.hum !== null;

  const heroConfig = useMemo(() => {
    if (!isOnline) return { label: 'FACILITY OFFLINE', status: 'Offline', gradient: GRADIENTS.offline, iconColor: COLORS.offline, message: 'Verify gateway connectivity for storage node.', bg: '#F1F5F9', border: '#E2E8F0' };
    
    if (storageScore >= 75) return { label: 'FACILITY STABILITY', status: 'Optimal', gradient: GRADIENTS.optimal, iconColor: COLORS.primary, message: 'Stable conditions for perishable storage.', bg: '#F5F3FF', border: 'rgba(139, 92, 246, 0.1)' };
    if (storageScore >= 45) return { label: 'FACILITY STABILITY', status: 'Moderate', gradient: GRADIENTS.moderate, iconColor: COLORS.warning, message: 'Variable stability detected. Check ventilation.', bg: '#FFFBEB', border: 'rgba(245, 158, 11, 0.1)' };
    return { label: 'FACILITY STABILITY', status: 'Critical', gradient: GRADIENTS.critical, iconColor: COLORS.critical, message: 'Storage safety threshold breached!', bg: '#FEF2F2', border: 'rgba(244, 63, 94, 0.1)' };
  }, [isOnline, storageScore]);

  return (
    <div style={{ padding: '1.25rem', paddingBottom: '10px', background: COLORS.bg, minHeight: 'auto', fontFamily: "'Outfit', sans-serif" }}>
      
      {/* ─── UNIFIED HERO CARD ─── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
        style={{
          background: heroConfig.bg, borderRadius: '24px', padding: '1.75rem',
          boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
          marginBottom: '1.5rem', position: 'relative', overflow: 'hidden',
          border: `1.5px solid ${heroConfig.border}`,
          display: 'flex', flexDirection: 'column', gap: '1.5rem',
          transition: 'background 0.5s ease, border 0.5s ease'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: `${heroConfig.iconColor}10`, padding: '6px 14px', borderRadius: '100px', border: `1px solid ${heroConfig.iconColor}20` }}>
            <motion.div animate={isOnline ? { opacity: [0.4, 1, 0.4] } : { opacity: 0.5 }} transition={{ duration: 2, repeat: Infinity }} style={{ width: '8px', height: '8px', borderRadius: '50%', background: heroConfig.iconColor }} />
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: heroConfig.iconColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{isOnline ? 'Facility Active' : 'Facility Offline'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.5 }}>
            <Clock size={12} color={COLORS.subtext} />
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: COLORS.subtext }}>SYNC: {lastGlobalUpdate || 'JUST NOW'}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 800, color: COLORS.subtext, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.6 }}>{heroConfig.label}</p>
          <motion.h1 key={storageScore} style={{ margin: 0, fontSize: '5.5rem', fontWeight: 800, color: COLORS.text, letterSpacing: '-0.04em', lineHeight: 1 }}>
            {isOnline ? storageScore : '--'}<span style={{ fontSize: '1.5rem', opacity: 0.3, marginLeft: '4px' }}>%</span>
          </motion.h1>
          <motion.div 
            animate={heroConfig.status === 'Critical' ? { scale: [1, 1.05, 1], boxShadow: [`0 4px 15px ${COLORS.critical}30`, `0 4px 25px ${COLORS.critical}50`, `0 4px 15px ${COLORS.critical}30`] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ padding: '8px 24px', borderRadius: '100px', background: heroConfig.gradient, color: 'white', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}
          >
            {heroConfig.status}
          </motion.div>
        </div>

        <div style={{ textAlign: 'center', paddingTop: '8px', borderTop: `1px solid ${COLORS.border}`, opacity: 0.8 }}>
          <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: COLORS.subtext }}>{heroConfig.message}</p>
        </div>
      </motion.div>

      {/* ─── UNIFIED SENSOR GRID ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <DiagnosticCard label="Temp" value={stats.temp} unit="°C" icon={Thermometer} color={COLORS.critical} statusText={stats.temp === null ? 'Offline' : (stats.temp > 12 ? 'High' : 'Safe')} range="0-12 °C" />
        <DiagnosticCard label="Humidity" value={stats.hum} unit="%" icon={Droplet} color={COLORS.secondary} statusText={stats.hum === null ? 'Offline' : (stats.hum > 95 ? 'High' : 'Optimal')} range="85-95 %" />
        <DiagnosticCard label="Air Quality" value={isOnline ? storageScore : null} unit="%" icon={ShieldCheck} color="#10B981" statusText={isOnline ? (storageScore > 80 ? 'Protected' : 'Warning') : 'Offline'} range="90-100 %" />
        <DiagnosticCard label="Gas Level" value={stats.gas} unit="ppm" icon={Wind} color={COLORS.warning} statusText={stats.gas === null ? 'Offline' : (stats.gas > 400 ? 'Warning' : 'Normal')} range="0-300 ppm" />
      </div>

      {/* ─── FACILITY SUMMARY ─── */}
      <section style={{ background: 'white', borderRadius: '28px', padding: '1.5rem', border: `1px solid ${COLORS.border}`, marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
          <Server size={18} color={COLORS.primary} />
          <h3 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 800, color: COLORS.text, textTransform: 'uppercase' }}>Facility Analysis</h3>
        </div>
        <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: COLORS.subtext, lineHeight: 1.6 }}>
          {isOnline ? (
            `Facility at ${stats.temp}°C is currently ${storageScore > 80 ? 'exhibiting optimal' : 'showing variable'} stability. Air exchange system is ${stats.gas < 300 ? 'efficient' : 'working at capacity'}.`
          ) : (
            "Telemetry stream suspended. Please verify gateway connectivity for storage node."
          )}
        </p>
      </section>

      <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate('/analytics', { state: { tab: 'storage' } })} style={{ width: '100%', height: '52px', borderRadius: '100px', background: '#0F172A', border: 'none', color: 'white', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>View Storage Logs</motion.button>

    </div>
  );
};

export default StorageMonitoring;
