import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  CloudRain, Sun, Wind, Thermometer, Droplet,
  Navigation, Activity, Gauge, Eye,
  Sunrise, Sunset, LineChart, Umbrella, CloudSun, Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../state/AppContext';

// ─── DESIGN TOKENS (UNIFIED) ───────────────────────────────────────────────

const COLORS = {
  primary: '#14B8A6',
  secondary: '#3B82F6',
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
  optimal: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
  moderate: 'linear-gradient(135deg, #FFD54F 0%, #FBC02D 100%)',
  low: 'linear-gradient(135deg, #EF5350 0%, #D32F2F 100%)',
  critical: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)',
  offline: 'linear-gradient(135deg, #94A3B8 0%, #64748B 100%)'
};

// ─── SUB-COMPONENTS (UNIFIED SYSTEM) ───────────────────────────────────────

const DiagnosticCard = ({ label, value, min, max, icon: Icon, color, statusText = '', range, unit }) => {
  const isOffline = value === null || value === undefined;
  const safeStatus = (statusText || '').toLowerCase();
  
  const isOptimal = safeStatus.includes('optimal') || safeStatus.includes('safe') || safeStatus.includes('stable') || safeStatus.includes('no rain') || safeStatus.includes('light') || safeStatus.includes('normal');
  const isModerate = safeStatus.includes('moderate') || safeStatus.includes('high') || safeStatus.includes('low');
  const isCritical = safeStatus.includes('critical') || safeStatus.includes('warning') || safeStatus.includes('heavy') || safeStatus.includes('storm');
  
  const stateColor = isOffline ? COLORS.offline : (isOptimal ? COLORS.primary : (isModerate ? COLORS.warning : (isCritical ? COLORS.critical : COLORS.offline)));
  const cardBg = isOffline ? '#F1F5F9' : (isOptimal ? '#F0FDF4' : (isModerate ? '#FFFBEB' : '#FEF2F2'));

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

const RegionalMetric = ({ label, value, icon: Icon, color }) => (
  <div style={{ background: '#FFFFFF', padding: '12px 8px', borderRadius: '16px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
     <Icon size={16} color={color} />
     <div style={{ textAlign: 'center' }}>
       <p style={{ margin: 0, fontSize: '0.5rem', fontWeight: 800, color: COLORS.subtext, textTransform: 'uppercase' }}>{label}</p>
       <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 800, color: COLORS.text }}>{value}</p>
     </div>
  </div>
);

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────

const WeatherMonitoring = () => {
  const navigate = useNavigate();
  const { sensorData, apiWeather, apiForecast, systemHealth, lastGlobalUpdate, devices } = useApp();

  const weather = sensorData?.weather || {};
  const weatherScore = systemHealth.weather || 0;
  
  const stats = useMemo(() => {
    const safeNum = (val, dec = 1) => (val !== null && val !== undefined && !isNaN(val)) ? Number(val).toFixed(dec) : null;
    return { 
      temp: safeNum(weather.temp), 
      humidity: safeNum(weather.humidity, 0), 
      light: safeNum(weather.lightIntensity, 0), 
      rain: safeNum(weather.rainLevel, 1) 
    };
  }, [weather]);

  const isOnline = devices?.['weather_node']?.status === 'ACTIVE' || stats.temp !== null;

  const heroConfig = useMemo(() => {
    if (!isOnline) return { label: 'DEVICE OFFLINE', status: 'Offline', gradient: GRADIENTS.offline, iconColor: COLORS.offline, message: 'Check node power and connectivity.', bg: '#F1F5F9', border: '#E2E8F0' };
    
    if (weatherScore >= 75) return { label: 'CLIMATE STABILITY', status: 'Optimal', gradient: GRADIENTS.optimal, iconColor: COLORS.primary, message: 'Current conditions support peak crop respiration.', bg: '#F0FDF4', border: 'rgba(20, 184, 166, 0.1)' };
    if (weatherScore >= 45) return { label: 'CLIMATE STABILITY', status: 'Moderate', gradient: GRADIENTS.moderate, iconColor: COLORS.warning, message: 'Sub-optimal climate detected. Monitor heat stress.', bg: '#FFFBEB', border: 'rgba(245, 158, 11, 0.1)' };
    return { label: 'CLIMATE STABILITY', status: 'Critical', gradient: GRADIENTS.critical, iconColor: COLORS.critical, message: 'Extreme weather threshold breached.', bg: '#FEF2F2', border: 'rgba(239, 68, 68, 0.1)' };
  }, [isOnline, weatherScore]);

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
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: heroConfig.iconColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{isOnline ? 'Climate Node Active' : 'Device Offline'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.5 }}>
            <Clock size={12} color={COLORS.subtext} />
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: COLORS.subtext }}>SYNC: {lastGlobalUpdate || 'JUST NOW'}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 800, color: COLORS.subtext, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.6 }}>{heroConfig.label}</p>
          <motion.h1 key={weatherScore} style={{ margin: 0, fontSize: '5.5rem', fontWeight: 800, color: COLORS.text, letterSpacing: '-0.04em', lineHeight: 1 }}>
            {isOnline && weatherScore !== null ? Math.round(weatherScore) : '--'}<span style={{ fontSize: '1.5rem', opacity: 0.3, marginLeft: '4px' }}>%</span>
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
        <DiagnosticCard label="Temp" value={stats.temp} unit="°C" min={15} max={35} icon={Thermometer} color={COLORS.primary} statusText={stats.temp === null ? 'Offline' : (stats.temp > 32 ? 'High' : (stats.temp < 18 ? 'Low' : 'Optimal'))} range="18-32 °C" />
        <DiagnosticCard label="Humidity" value={stats.humidity} unit="%" min={40} max={80} icon={Droplet} color={COLORS.secondary} statusText={stats.humidity === null ? 'Offline' : (stats.humidity > 75 ? 'High' : (stats.humidity < 45 ? 'Low' : 'Optimal'))} range="40-70 %" />
        <DiagnosticCard label="Sunlight" value={stats.light} unit="lx" min={200} max={10000} icon={Sun} color={COLORS.warning} statusText={stats.light === null ? 'Offline' : (stats.light > 8000 ? 'Extreme' : (stats.light < 500 ? 'Low' : 'Optimal'))} range="1k-8k lx" />
        <DiagnosticCard 
          label="Rain" 
          value={stats.rain} 
          unit="mm" 
          min={0} 
          max={50} 
          icon={CloudRain} 
          color="#0EA5E9" 
          statusText={
            stats.rain === null ? 'Offline' : 
            (Number(stats.rain) === 0 ? 'No Rain' : 
            (Number(stats.rain) <= 5 ? 'Light' : 
            (Number(stats.rain) <= 20 ? 'Moderate' : 'Heavy')))
          } 
          range="0-10 mm" 
        />
      </div>

      {/* ─── REGIONAL & FORECAST ─── */}
      <section style={{ background: 'white', borderRadius: '28px', padding: '1.5rem', border: `1px solid ${COLORS.border}`, marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: COLORS.text, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Navigation size={18} color={COLORS.primary} /> Regional Data
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
           <RegionalMetric label="AQI" value={apiWeather?.aqi || '--'} icon={Activity} color="#10B981" />
           <RegionalMetric label="Clouds" value={apiWeather?.clouds ? `${apiWeather.clouds}%` : '--'} icon={CloudSun} color="#3B82F6" />
           <RegionalMetric label="Wind" value={apiWeather?.windSpeed || '--'} icon={Wind} color="#F59E0B" />
           <RegionalMetric label="Feels" value={`${apiWeather?.feelsLike || '--'}°`} icon={Thermometer} color="#EF4444" />
           <RegionalMetric label="Press" value={apiWeather?.pressure || '--'} icon={Gauge} color="#8B5CF6" />
           <RegionalMetric label="Visib" value={apiWeather?.visibility || '--'} icon={Eye} color="#10B981" />
           <RegionalMetric label="Rise" value={apiWeather?.sunrise || '--'} icon={Sunrise} color={COLORS.primary} />
           <RegionalMetric label="Set" value={apiWeather?.sunset || '--'} icon={Sunset} color={COLORS.secondary} />
        </div>
      </section>

      <section style={{ background: 'white', borderRadius: '32px', padding: '1.5rem', border: `1px solid ${COLORS.border}`, marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.75rem', fontWeight: 800, color: COLORS.text, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <LineChart size={18} color={COLORS.primary} /> 5-Day Forecast
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(apiForecast || []).map((day, idx) => {
            const getIcon = (cond) => {
              const c = (cond || '').toLowerCase();
              if (c.includes('rain')) return <CloudRain size={16} color={COLORS.secondary} />;
              if (c.includes('cloud')) return <CloudSun size={16} color={COLORS.subtext} />;
              return <Sun size={16} color={COLORS.warning} />;
            };
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', background: '#F8FAFC', borderRadius: '20px', border: '1px solid #F1F5F9' }}>
                <div style={{ width: '60px' }}><p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 800, color: COLORS.text }}>{day.date}</p></div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #E2E8F0' }}>
                    {getIcon(day.condition)}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 800, color: COLORS.text }}>{day.condition}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Umbrella size={10} color={COLORS.secondary} />
                      <span style={{ fontSize: '0.6rem', fontWeight: 800, color: COLORS.secondary }}>{day.rainProb || '0%'}</span>
                    </div>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: COLORS.text }}>{day.temp}°</p>
              </div>
            );
          })}
        </div>
      </section>

      <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate('/analytics', { state: { tab: 'weather' } })} style={{ width: '100%', height: '52px', borderRadius: '100px', background: '#0F172A', border: 'none', color: 'white', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>View Weather Analytics</motion.button>

    </div>
  );
};

export default WeatherMonitoring;
