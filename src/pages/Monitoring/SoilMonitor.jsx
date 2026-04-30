import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Waves, Activity, Thermometer, Zap, 
  ArrowUp, ArrowDown, Minus,
  Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../state/AppContext';
import useTrendEngine from '../../hooks/useTrendEngine';

// ─── DESIGN SYSTEM ─────────────────────────────────────────────────────────

const COLORS = {
  primary: '#059669',
  warning: '#D97706',
  critical: '#DC2626',
  offline: '#94A3B8',
  bg: '#F8FAFC',
  text: '#1E293B',
  subtext: '#64748B',
  white: '#FFFFFF',
  border: '#E2E8F0'
};

const GRADIENTS = {
  optimal: 'linear-gradient(135deg, #66BB6A 0%, #388E3C 100%)',
  moderate: 'linear-gradient(135deg, #FFD54F 0%, #FBC02D 100%)',
  low: 'linear-gradient(135deg, #EF5350 0%, #D32F2F 100%)',
  critical: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
  offline: 'linear-gradient(135deg, #94A3B8 0%, #64748B 100%)'
};

// ─── SUB-COMPONENTS ────────────────────────────────────────────────────────

const DiagnosticCard = ({ label, value, min, max, icon: Icon, color, statusText = '', range, trendInfo }) => {
  const isOffline = value === null || value === undefined;
  const safeStatus = (statusText || '').toLowerCase();
  
  const isOptimal = safeStatus.includes('optimal') || safeStatus.includes('sufficient') || safeStatus.includes('healthy') || safeStatus.includes('safe') || safeStatus.includes('stable');
  const isModerate = safeStatus.includes('moderate');
  const isHighLow = safeStatus.includes('high') || safeStatus.includes('low') || safeStatus.includes('acidic') || safeStatus.includes('alkaline') || safeStatus.includes('hot') || safeStatus.includes('cold');
  
  const stateColor = isOffline ? COLORS.offline : (isOptimal ? COLORS.primary : (isModerate ? COLORS.warning : (isHighLow ? COLORS.critical : COLORS.offline)));
  const cardBg = isOffline ? '#F1F5F9' : (isOptimal ? '#F0FDF4' : (isModerate ? '#FFFBEB' : '#FEF2F2'));

  const renderTrendIcon = () => {
    if (isOffline) return <Minus size={18} color="#CBD5E1" strokeWidth={3} />;
    const valNum = parseFloat(value);
    const trend = trendInfo?.trend || 'neutral';
    if (isNaN(valNum)) return <Minus size={18} color="#CBD5E1" strokeWidth={3} />;

    if (valNum > max) {
      if (trend === 'rising') return <ArrowUp size={20} color={COLORS.critical} strokeWidth={4} />;
      if (trend === 'falling') return <ArrowDown size={20} color={COLORS.primary} strokeWidth={4} />;
      return <ArrowUp size={20} color="#CBD5E1" strokeWidth={4} />;
    }
    if (valNum < min) {
      if (trend === 'rising') return <ArrowUp size={20} color={COLORS.primary} strokeWidth={4} />;
      if (trend === 'falling') return <ArrowDown size={20} color={COLORS.critical} strokeWidth={4} />;
      return <ArrowDown size={20} color="#CBD5E1" strokeWidth={4} />;
    }
    return trend === 'rising' ? <ArrowUp size={18} color="#94A3B8" strokeWidth={3} /> : (trend === 'falling' ? <ArrowDown size={18} color="#94A3B8" strokeWidth={3} /> : <Minus size={18} color="#CBD5E1" strokeWidth={3} />);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
      style={{
        background: cardBg, borderRadius: '28px', padding: '1.25rem 1rem',
        border: `1.5px solid ${isOffline ? '#E2E8F0' : COLORS.border}`,
        boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
        position: 'relative', minHeight: '185px',
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
          fontSize: isOffline ? '1.5rem' : '2.8rem', 
          fontWeight: 800, 
          color: isOffline ? '#CBD5E1' : COLORS.text, 
          letterSpacing: isOffline ? '0.05em' : '-0.04em', 
          lineHeight: 1 
        }}>
          {isOffline ? 'OFFLINE' : value}
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
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {renderTrendIcon()}
        </div>
      </div>
    </motion.div>
  );
};

const ActionItem = ({ label, message, priority, icon: Icon }) => {
  const color = priority === 'high' ? COLORS.critical : (priority === 'medium' ? COLORS.warning : COLORS.primary);
  return (
    <div style={{ 
      padding: '1.25rem', borderRadius: '24px', background: 'white', 
      border: `1px solid ${COLORS.border}`, marginBottom: '12px',
      display: 'flex', gap: '16px', alignItems: 'center',
      boxShadow: '0 4px 10px rgba(0,0,0,0.02)'
    }}>
      <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: `${color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={20} color={color} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: COLORS.text }}>{label}</h4>
          <span style={{ fontSize: '0.6rem', fontWeight: 900, color: color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{priority}</span>
        </div>
        <p style={{ margin: 0, fontSize: '0.75rem', color: COLORS.subtext, fontWeight: 700, lineHeight: 1.4 }}>{message}</p>
      </div>
    </div>
  );
};

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────

const SoilMonitoring = () => {
  const navigate = useNavigate();
  const { sensorData, sensorHistory, systemHealth, lastGlobalUpdate } = useApp();
  const trend = useTrendEngine(sensorHistory); 

  const soil = sensorData?.soil || {};
  const healthScore = systemHealth.soil || 0;
  
  const stats = useMemo(() => {
    const n = soil.npk || {};
    const safeNum = (val, dec = 1) => (val !== null && val !== undefined && !isNaN(val)) ? Number(val).toFixed(dec) : null;
    return { moisture: safeNum(soil.moisture), temp: safeNum(soil.temp), ph: safeNum(soil.ph), n: safeNum(n.n, 0), p: safeNum(n.p, 0), k: safeNum(n.k, 0) };
  }, [soil]);

  const isOnline = stats.moisture !== null || stats.temp !== null || stats.ph !== null;
  const isDataIncomplete = isOnline && (stats.moisture === null && stats.ph === null);

  const heroConfig = useMemo(() => {
    if (!isOnline) return { label: 'DEVICE OFFLINE', status: 'Offline', gradient: GRADIENTS.offline, iconColor: COLORS.offline, message: 'Check node power and connectivity.', bg: '#F1F5F9', border: '#E2E8F0' };
    if (isDataIncomplete) return { label: 'WAITING FOR DATA', status: 'Calibrating', gradient: GRADIENTS.offline, iconColor: COLORS.offline, message: 'Establishing sensor handshake...', bg: '#F1F5F9', border: '#E2E8F0' };
    
    if (healthScore >= 75) return { label: 'OVERALL SOIL HEALTH', status: 'Optimal', gradient: GRADIENTS.optimal, iconColor: COLORS.primary, message: 'Conditions are stable for high growth.', bg: '#F0FDF4', border: 'rgba(5, 150, 105, 0.1)' };
    if (healthScore >= 45) return { label: 'OVERALL SOIL HEALTH', status: 'Moderate', gradient: GRADIENTS.moderate, iconColor: COLORS.warning, message: 'Some parameters require field adjustment.', bg: '#FFFBEB', border: 'rgba(217, 119, 6, 0.1)' };
    if (healthScore >= 25) return { label: 'OVERALL SOIL HEALTH', status: 'Low', gradient: GRADIENTS.low, iconColor: COLORS.critical, message: 'Soil health is below the safe threshold.', bg: '#FEF2F2', border: 'rgba(220, 38, 38, 0.1)' };
    return { label: 'OVERALL SOIL HEALTH', status: 'Critical', gradient: GRADIENTS.critical, iconColor: COLORS.critical, message: 'Immediate soil intervention required.', bg: '#FEF2F2', border: 'rgba(220, 38, 38, 0.2)' };
  }, [isOnline, isDataIncomplete, healthScore]);

  const recommendations = useMemo(() => {
    if (!isOnline) return [];
    const actions = [];
    if (stats.moisture !== null) {
      if (stats.moisture < 30) {
        actions.push({ label: 'Irrigation Required', message: `Soil moisture is critically low at ${stats.moisture}%. Initiate immediate watering to prevent permanent crop wilting.`, priority: 'high', icon: Waves });
      } else if (stats.moisture > 65) {
        actions.push({ label: 'Saturated Soil', message: `Moisture level (${stats.moisture}%) exceeds the safe threshold. Halt all irrigation to prevent root hypoxia.`, priority: 'medium', icon: Waves });
      }
    }
    if (stats.ph !== null) {
      if (stats.ph < 6.0) {
        actions.push({ label: 'Soil Acidification', message: `Current pH (${stats.ph}) is below the optimal 6.0-7.5 window. Apply buffering agents (Lime) to stabilize acidity.`, priority: 'high', icon: Activity });
      } else if (stats.ph > 7.8) {
        actions.push({ label: 'High Alkalinity', message: `Alkaline drift detected at ${stats.ph} pH. Nutrient lockout risk is high; apply acidifying agents (Sulphur).`, priority: 'medium', icon: Activity });
      }
    }
    if (stats.n !== null && stats.n < 45) {
      actions.push({ label: 'Nitrogen Depletion', message: `Nitrogen concentration (${stats.n} mg/kg) is insufficient for high-yield growth. Apply nitrogen-rich booster.`, priority: 'medium', icon: Zap });
    }
    return actions.sort((a, b) => (a.priority === 'high' ? -1 : 1));
  }, [isOnline, stats]);

  return (
    <div style={{ padding: '1.25rem', paddingBottom: '10px', background: COLORS.bg, minHeight: 'auto', fontFamily: "'Outfit', sans-serif" }}>
      
      {/* ─── TINTED HERO CARD ─── */}
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
        {/* TOP ROW */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: `${heroConfig.iconColor}10`, padding: '6px 14px', borderRadius: '100px', border: `1px solid ${heroConfig.iconColor}20` }}>
            <motion.div 
              animate={isOnline ? { opacity: [0.4, 1, 0.4] } : { opacity: 0.5 }} transition={{ duration: 2, repeat: Infinity }}
              style={{ width: '8px', height: '8px', borderRadius: '50%', background: heroConfig.iconColor }} 
            />
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: heroConfig.iconColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {isOnline ? 'Soil Node Active' : 'Device Offline'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.5 }}>
            <Clock size={12} color={COLORS.subtext} />
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: COLORS.subtext, textTransform: 'uppercase' }}>
              SYNC: {lastGlobalUpdate || 'JUST NOW'}
            </span>
          </div>
        </div>

        {/* CENTER SECTION */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 800, color: COLORS.subtext, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.6 }}>
            {heroConfig.label}
          </p>
          
          <motion.h1 
            key={healthScore} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            style={{ 
              margin: 0, fontSize: '5.5rem', fontWeight: 800, color: COLORS.text, 
              letterSpacing: '-0.04em', lineHeight: 1,
              textShadow: isOnline && !isDataIncomplete ? `0 10px 40px ${heroConfig.iconColor}20` : 'none'
            }}
          >
            {(!isOnline || isDataIncomplete) ? '--' : healthScore}<span style={{ fontSize: '1.5rem', opacity: 0.3, marginLeft: '4px' }}>%</span>
          </motion.h1>

          <motion.div 
            animate={heroConfig.status === 'Critical' ? { scale: [1, 1.05, 1], boxShadow: [`0 4px 15px ${COLORS.critical}30`, `0 4px 25px ${COLORS.critical}50`, `0 4px 15px ${COLORS.critical}30`] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ 
              padding: '8px 24px', borderRadius: '100px', 
              background: heroConfig.gradient, color: 'white', 
              fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em',
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
            }}
          >
            {heroConfig.status}
          </motion.div>
        </div>

        {/* BOTTOM INSIGHT */}
        <div style={{ textAlign: 'center', paddingTop: '8px', borderTop: `1px solid ${COLORS.border}`, opacity: 0.8 }}>
          <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: COLORS.subtext, letterSpacing: '-0.01em' }}>
            {heroConfig.message}
          </p>
        </div>
      </motion.div>

      {/* ─── GRID ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <DiagnosticCard label="Moisture" value={stats.moisture} min={30} max={60} icon={Waves} color="#0EA5E9" statusText={stats.moisture === null ? 'Offline' : (stats.moisture > 65 ? 'High' : (stats.moisture < 30 ? 'Low' : (stats.moisture >= 60 || stats.moisture < 40 ? 'Moderate' : 'Optimal')))} range="30-60 %" trendInfo={trend.moisture} />
        <DiagnosticCard label="Soil pH" value={stats.ph} min={6.0} max={7.5} icon={Activity} color="#8B5CF6" statusText={stats.ph === null ? 'Offline' : (stats.ph > 7.8 ? 'High' : (stats.ph < 5.8 ? 'Low' : (stats.ph >= 7.3 || stats.ph < 6.2 ? 'Moderate' : 'Optimal')))} range="6.0-7.5" trendInfo={trend.ph} />
        <DiagnosticCard label="Nitrogen" value={stats.n} min={40} max={60} icon={Zap} color="#10B981" statusText={stats.n === null ? 'Offline' : (stats.n > 65 ? 'High' : (stats.n < 35 ? 'Low' : (stats.n >= 55 || stats.n < 45 ? 'Moderate' : 'Healthy')))} range="40-60 mg" trendInfo={trend.npk} />
        <DiagnosticCard label="Phosphorus" value={stats.p} min={20} max={40} icon={Zap} color="#F59E0B" statusText={stats.p === null ? 'Offline' : (stats.p > 45 ? 'High' : (stats.p < 15 ? 'Low' : (stats.p >= 35 || stats.p < 25 ? 'Moderate' : 'Optimal')))} range="20-40 mg" trendInfo={trend.npk} />
        <DiagnosticCard label="Potassium" value={stats.k} min={35} max={55} icon={Zap} color="#3B82F6" statusText={stats.k === null ? 'Offline' : (stats.k > 60 ? 'High' : (stats.k < 30 ? 'Low' : (stats.k >= 50 || stats.k < 40 ? 'Moderate' : 'Stable')))} range="35-55 mg" trendInfo={trend.npk} />
        <DiagnosticCard label="Root Temp" value={stats.temp} min={18} max={32} icon={Thermometer} color="#F43F5E" statusText={stats.temp === null ? 'Offline' : (stats.temp > 35 ? 'High' : (stats.temp < 15 ? 'Low' : (stats.temp >= 30 || stats.temp < 22 ? 'Moderate' : 'Optimal')))} range="18-32 °C" trendInfo={trend.temperature} />
      </div>

      {/* ─── RECOMMENDATIONS ─── */}
      <section style={{ marginBottom: '1.5rem' }}>
        <AnimatePresence>
          {recommendations.length > 0 ? (
            recommendations.map((action, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
                <ActionItem {...action} />
              </motion.div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '1.5rem', background: 'white', borderRadius: '32px', border: `1.25px dashed #E2E8F0` }}>
              <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: COLORS.subtext }}>All field parameters are within healthy limits.</p>
            </div>
          )}
        </AnimatePresence>
      </section>

      <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate('/analytics', { state: { tab: 'soil' } })} style={{ width: '100%', height: '52px', borderRadius: '100px', background: '#0F172A', border: 'none', color: 'white', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>View Detailed Analytics</motion.button>

    </div>
  );
};

export default SoilMonitoring;
