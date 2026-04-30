import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Droplets, Power, Activity, 
  Waves, ChevronRight, Clock, Minus, Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../state/AppContext';

// ─── DESIGN TOKENS (UNIFIED) ───────────────────────────────────────────────

const COLORS = {
  primary: '#0EA5E9',
  secondary: '#10B981',
  warning: '#F59E0B',
  critical: '#EF4444',
  offline: '#94A3B8',
  bg: '#F8FAFC',
  text: '#1E293B',
  subtext: '#64748B',
  white: '#FFFFFF',
  border: '#E2E8F0'
};

const GRADIENTS = {
  optimal: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
  moderate: 'linear-gradient(135deg, #FFD54F 0%, #FBC02D 100%)',
  low: 'linear-gradient(135deg, #EF5350 0%, #D32F2F 100%)',
  critical: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)',
  offline: 'linear-gradient(135deg, #94A3B8 0%, #64748B 100%)'
};

const TANK_CAPACITY = 6000;

// ─── SUB-COMPONENTS (UNIFIED SYSTEM) ───────────────────────────────────────

const DiagnosticCard = ({ label, value, icon: Icon, color, statusText = '', range, unit }) => {
  const isOffline = value === null || value === undefined || value === '---';
  const safeStatus = (statusText || '').toLowerCase();
  
  const isOptimal = safeStatus.includes('optimal') || safeStatus.includes('stable') || safeStatus.includes('active') || safeStatus.includes('efficient');
  const isModerate = safeStatus.includes('moderate') || safeStatus.includes('variable');
  const isCritical = safeStatus.includes('critical') || safeStatus.includes('low') || safeStatus.includes('offline');
  
  const stateColor = isOffline ? COLORS.offline : (isOptimal ? COLORS.primary : (isModerate ? COLORS.warning : COLORS.critical));
  const cardBg = isOffline ? '#F1F5F9' : (isOptimal ? '#F0F9FF' : (isModerate ? '#FFFBEB' : '#FEF2F2'));

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
          <p style={{ margin: 0, fontSize: '0.55rem', fontWeight: 800, color: COLORS.subtext, opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>SYSTEM STATUS</p>
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

const IrrigationControl = () => {
  const navigate = useNavigate();
  const { sensorData, actuators, ACTUATORS, toggleActuator, systemHealth, lastGlobalUpdate } = useApp();

  const water = sensorData?.water || {};
  const isPumpActive = actuators ? actuators[ACTUATORS?.PUMP] : false;
  const healthScore = systemHealth.water || 0;

  const stats = useMemo(() => {
    const level = water.level !== null ? parseFloat(water.level) : null;
    const liters = level !== null ? Math.round((level / 100) * TANK_CAPACITY) : null;
    return { level, liters };
  }, [water]);

  const isOnline = stats.level !== null;

  const heroConfig = useMemo(() => {
    if (!isOnline) return { label: 'TANK OFFLINE', status: 'Offline', gradient: GRADIENTS.offline, iconColor: COLORS.offline, message: 'Check water level sensor connectivity.', bg: '#F1F5F9', border: '#E2E8F0' };
    
    if (healthScore >= 75) return { label: 'WATER RESERVE', status: 'Optimal', gradient: GRADIENTS.optimal, iconColor: COLORS.primary, message: 'Adequate supply for scheduled irrigation.', bg: '#F0F9FF', border: 'rgba(14, 165, 233, 0.1)' };
    if (healthScore >= 35) return { label: 'WATER RESERVE', status: 'Moderate', gradient: GRADIENTS.moderate, iconColor: COLORS.warning, message: 'Reserves are decreasing. Monitor consumption.', bg: '#FFFBEB', border: 'rgba(245, 158, 11, 0.1)' };
    return { label: 'WATER RESERVE', status: 'Low', gradient: GRADIENTS.low, iconColor: COLORS.critical, message: 'Water reserves below safe threshold!', bg: '#FEF2F2', border: 'rgba(239, 68, 68, 0.1)' };
  }, [isOnline, healthScore]);

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
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: heroConfig.iconColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{isOnline ? 'Tank Active' : 'Tank Offline'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.5 }}>
            <Clock size={12} color={COLORS.subtext} />
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: COLORS.subtext }}>SYNC: {lastGlobalUpdate || 'JUST NOW'}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 800, color: COLORS.subtext, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.6 }}>{heroConfig.label}</p>
          <motion.h1 key={healthScore} style={{ margin: 0, fontSize: '5.5rem', fontWeight: 800, color: COLORS.text, letterSpacing: '-0.04em', lineHeight: 1 }}>
            {isOnline ? healthScore : '--'}<span style={{ fontSize: '1.5rem', opacity: 0.3, marginLeft: '4px' }}>%</span>
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

      {/* ─── PUMP CONTROL ─── */}
      <section style={{ background: 'white', borderRadius: '28px', padding: '1.5rem', border: `1.5px solid ${COLORS.border}`, marginBottom: '1.5rem', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: isPumpActive ? '#ECFDF5' : '#F0F9FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Power size={20} color={isPumpActive ? COLORS.secondary : COLORS.primary} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: COLORS.text }}>Master Pump Control</p>
              <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 800, color: isPumpActive ? COLORS.secondary : COLORS.subtext }}>{isPumpActive ? 'Currently Active' : 'Standby Mode'}</p>
            </div>
          </div>
          <div onClick={() => toggleActuator(ACTUATORS.PUMP)} style={{ width: '54px', height: '28px', background: isPumpActive ? COLORS.secondary : '#E2E8F0', borderRadius: '20px', padding: '2px', cursor: 'pointer', transition: '0.3s' }}>
            <motion.div animate={{ x: isPumpActive ? 26 : 0 }} style={{ width: '24px', height: '24px', background: 'white', borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
          </div>
        </div>
      </section>

      {/* ─── UNIFIED SENSOR GRID ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <DiagnosticCard label="Volume" value={stats.liters} unit="L" icon={Droplets} color={COLORS.primary} statusText={stats.level === null ? 'Offline' : (stats.level > 30 ? 'Stable' : 'Low')} range="2k-6k L" />
        <DiagnosticCard label="Efficiency" value={isOnline ? healthScore : null} unit="%" icon={Zap} color={COLORS.secondary} statusText={isOnline ? (healthScore > 80 ? 'Optimal' : 'Variable') : 'Offline'} range="90-100 %" />
      </div>

    </div>
  );
};

export default IrrigationControl;
