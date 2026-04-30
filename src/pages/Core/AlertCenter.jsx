import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../state/AppContext';
import { 
  AlertTriangle, Bell, Info, 
  CheckCircle2, Clock, Filter, 
  Trash2, ChevronRight, X
} from 'lucide-react';

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────
const COLORS = {
  critical: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  success: '#10B981',
  text: '#1E293B',
  subtext: '#64748B',
  bg: '#F8FAFC',
  border: '#F1F5F9'
};

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────

const AlertCard = ({ alert, onDismiss }) => {
  const config = {
    critical: { icon: AlertTriangle, color: COLORS.critical, bg: '#FEF2F2' },
    warning: { icon: AlertTriangle, color: COLORS.warning, bg: '#FFFBEB' },
    info: { icon: Info, color: COLORS.info, bg: '#EFF6FF' },
    success: { icon: CheckCircle2, color: COLORS.success, bg: '#F0FDF4' }
  }[alert.type] || { icon: Bell, color: COLORS.text, bg: 'white' };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{
        background: 'white', borderRadius: '24px', padding: '1.25rem',
        marginBottom: '1rem', border: `1px solid ${COLORS.border}`,
        boxShadow: '0 4px 12px rgba(0,0,0,0.02)', position: 'relative', overflow: 'hidden'
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: config.color }} />
      
      <div style={{ display: 'flex', gap: '12px' }}>
        <div style={{ 
          width: '40px', height: '40px', borderRadius: '12px', background: config.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          {React.createElement(config.icon, { size: 20, color: config.color })}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 900, color: COLORS.text }}>{alert.title}</h4>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: COLORS.subtext, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={10} /> {alert.time}
            </span>
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '0.8rem', color: COLORS.subtext, lineHeight: 1.5, fontWeight: 600 }}>
            {alert.message}
          </p>
          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
             <button style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: config.bg, color: config.color, fontSize: '0.7rem', fontWeight: 900 }}>ACTION</button>
             <button onClick={onDismiss} style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, background: 'transparent', color: COLORS.subtext, fontSize: '0.7rem', fontWeight: 900 }}>DISMISS</button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────

const Alerts = () => {
  const { sensorData, systemOverview } = useApp();
  const [filter, setFilter] = useState('all');
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set());

  const generatedAlerts = useMemo(() => {
    if (!sensorData) return [];
    const alerts = [];

    const addAlert = (id, title, message, type) => {
      if (!dismissedAlerts.has(id)) {
        alerts.push({ id, title, message, type, time: 'Live Stream' });
      }
    };

    // 1. Soil Node
    if (sensorData.soil?.moisture !== null) {
      if (sensorData.soil.moisture < 20) addAlert('soil_dry', 'Critical Soil Dryness', `Field moisture dropped to ${sensorData.soil.moisture}%. Immediate irrigation recommended.`, 'critical');
      else if (sensorData.soil.moisture > 80) addAlert('soil_wet', 'Waterlogging Risk', `Field moisture is critically high at ${sensorData.soil.moisture}%. Check drainage.`, 'warning');
    }
    if (sensorData.soil?.ph !== null) {
      if (sensorData.soil.ph < 5.5) addAlert('soil_acidic', 'High Soil Acidity', `Soil pH dropped to ${sensorData.soil.ph}. Acidic conditions detected.`, 'warning');
      else if (sensorData.soil.ph > 7.5) addAlert('soil_alkaline', 'High Soil Alkalinity', `Soil pH spiked to ${sensorData.soil.ph}. Alkaline conditions detected.`, 'warning');
    }
    if (sensorData.soil?.npk?.n !== null && sensorData.soil.npk.n < 40) addAlert('soil_n_low', 'Nitrogen Deficiency', `Soil Nitrogen level is low (${sensorData.soil.npk.n} mg/kg). Fertilization required.`, 'warning');

    // 2. Weather Node
    if (sensorData.weather?.temp !== null) {
      if (sensorData.weather.temp > 35) addAlert('temp_high', 'Heat Stress Alert', `Extreme temperature detected (${sensorData.weather.temp}°C). Thermal stress on crops likely.`, 'critical');
      else if (sensorData.weather.temp < 10) addAlert('temp_low', 'Cold Stress Alert', `Low temperature detected (${sensorData.weather.temp}°C). Frost risk possible.`, 'warning');
    }
    if (sensorData.weather?.rainLevel !== null && sensorData.weather.rainLevel > 100) addAlert('rain_heavy', 'Heavy Rainfall Warning', `Precipitation volume high (${sensorData.weather.rainLevel}mm). Monitor for flooding.`, 'critical');

    // 3. Storage Node
    if (sensorData.storage?.temp !== null && sensorData.storage.temp > 25) addAlert('storage_hot', 'Storage Overheating', `Warehouse temp reached ${sensorData.storage.temp}°C. Risk of rapid spoilage.`, 'critical');
    if (sensorData.storage?.ethylene !== null && sensorData.storage.ethylene > 50) addAlert('ethylene_high', 'Ethylene Accumulation', `Ethylene gas level high (${sensorData.storage.ethylene} ppm). Accelerated ripening detected.`, 'critical');

    // 4. Water Node
    if (sensorData.water?.tankLevel !== null && sensorData.water.tankLevel < 20) addAlert('tank_low', 'Low Reservoir', `Water tank capacity critically low (${sensorData.water.tankLevel}%). Refill needed.`, 'critical');

    // 5. System Health
    if (systemOverview?.offline_nodes > 0) addAlert('nodes_offline', 'Node Disconnection', `${systemOverview.offline_nodes} hardware nodes are currently offline. Check power and network.`, 'critical');
    else if (systemOverview?.active_nodes === 4 && sensorData.soil?.moisture !== null) addAlert('system_ok', 'System Update', 'All Industrial Nodes operating optimally.', 'success');

    if (alerts.length === 0 && systemOverview?.offline_nodes === 4) addAlert('blackout', 'Total Blackout', 'System is completely disconnected from field hardware.', 'critical');

    return alerts;
  }, [sensorData, systemOverview, dismissedAlerts]);

  const filteredAlerts = useMemo(() => {
    if (filter === 'all') return generatedAlerts;
    return generatedAlerts.filter(a => a.type === filter);
  }, [generatedAlerts, filter]);

  const dismissAlert = (id) => setDismissedAlerts(prev => new Set(prev).add(id));
  const clearAll = () => setDismissedAlerts(new Set(generatedAlerts.map(a => a.id)));

  return (
    <div style={{ padding: '1.25rem', paddingBottom: '100px', background: COLORS.bg }}>
      
      {/* 1. HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 950, color: COLORS.text, margin: 0 }}>Alerts</h2>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: COLORS.subtext, marginTop: '2px' }}>System notifications & warnings</p>
        </div>
        <button onClick={clearAll} style={{ padding: '10px', borderRadius: '14px', background: 'white', border: `1px solid ${COLORS.border}`, color: COLORS.critical }}>
          <Trash2 size={20} />
        </button>
      </div>

      {/* 2. FILTERS */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '1.5rem', paddingBottom: '4px' }} className="no-scrollbar">
        {[
          { id: 'all', label: 'All', icon: Bell },
          { id: 'critical', label: 'Critical', icon: AlertTriangle },
          { id: 'warning', label: 'Warning', icon: AlertTriangle },
          { id: 'success', label: 'Insights', icon: CheckCircle2 }
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              padding: '10px 16px', borderRadius: '14px', border: 'none',
              background: filter === f.id ? COLORS.text : 'white',
              color: filter === f.id ? 'white' : COLORS.subtext,
              fontSize: '0.75rem', fontWeight: 800, whiteSpace: 'nowrap',
              display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: filter === f.id ? '0 8px 20px rgba(0,0,0,0.1)' : 'none',
              transition: '0.3s'
            }}
          >
            {React.createElement(f.icon, { size: 14 })} {f.label}
          </button>
        ))}
      </div>

      {/* 3. ALERTS LIST */}
      <div style={{ minHeight: '400px' }}>
        <AnimatePresence mode="popLayout">
          {filteredAlerts.length > 0 ? (
            filteredAlerts.map(alert => (
              <AlertCard key={alert.id} alert={alert} onDismiss={() => dismissAlert(alert.id)} />
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: COLORS.subtext }}
            >
              <CheckCircle2 size={48} strokeWidth={1} style={{ marginBottom: '1rem', opacity: 0.3 }} />
              <p style={{ fontWeight: 800, fontSize: '0.9rem' }}>All systems stable</p>
              <p style={{ fontSize: '0.75rem', fontWeight: 600 }}>No active alerts found for this filter</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default Alerts;
