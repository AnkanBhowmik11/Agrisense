/**
 * AgriSense Pro v17.1.0 – Device Network Dashboard
 * Real-time IoT hardware control interface.
 * Status dots driven by live sensor data — no mock randomization.
 *
 * SENSOR TRUTH TABLE (hardware spec):
 *  Soil Node      → Moisture, pH, Temp, NPK
 *  Weather Node   → Temp, Humidity, Rain, Light
 *  Irrigation Node→ Water Level only
 *  Storage Node   → Temp, Humidity, Gas (MQ135)
 *  Vision Node    → Motion, Birds, Animals, Insects, Humans
 *
 * CONTROL PANEL (real wiring):
 *  Buzzer → ESP-CAM HTTP (/buzzer)  [mirrors VisualMonitor]
 *  Light  → ESP-CAM HTTP (/light)   [mirrors VisualMonitor]
 *  Display→ ON when MQTT connected
 *  Pump   → ACTUATORS.PUMP toggle   [mirrors IrrigationSystem]
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Sprout, CloudRain, Droplets, HardDrive,
  Camera, Wifi, WifiOff, BellRing, Lightbulb,
  Monitor, Zap, Signal, FlameKindling
} from 'lucide-react';
import { useApp } from '../../state/AppContext';
import { ACTUATORS } from '../../logic/healthEngine';

// ─── HARDWARE CONSTANTS ──────────────────────────────────────────────────────
const CAM_IP = 'http://192.168.4.2';

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const T = {
  green:   '#10B981',
  greenBg: '#D1FAE5',
  amber:   '#F59E0B',
  grey:    '#94A3B8',
  greyBg:  '#F1F5F9',
  blue:    '#3B82F6',
  purple:  '#8B5CF6',
  pink:    '#EC4899',
  teal:    '#14B8A6',
  sky:     '#0EA5E9',
  orange:  '#F97316',
  bg:      '#F0F4F8',
  card:    '#FFFFFF',
  text:    '#0F172A',
  sub:     '#64748B',
  border:  'rgba(15,23,42,0.06)',
};

// ─── PULSE DOT ─────────────────────────────────────────────────────────────────
const PulseDot = ({ active, size = 7 }) => (
  <motion.span
    animate={active ? { opacity: [1, 0.35, 1], scale: [1, 1.2, 1] } : {}}
    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    style={{
      display: 'inline-block',
      width: size,
      height: size,
      borderRadius: '50%',
      background: active ? T.green : T.grey,
      boxShadow: active ? `0 0 0 2px ${T.greenBg}` : 'none',
      flexShrink: 0,
    }}
  />
);

// ─── SIGNAL BARS ──────────────────────────────────────────────────────────────
const SignalBars = ({ active }) => (
  <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: '2px', height: '14px' }}>
    {[0.45, 0.7, 1].map((h, i) => (
      <span
        key={i}
        style={{
          width: '3px',
          height: `${h * 14}px`,
          borderRadius: '2px',
          background: active ? T.green : T.grey,
          opacity: active ? 1 : (i === 0 ? 0.5 : 0.2),
          transition: 'background 0.3s',
        }}
      />
    ))}
  </span>
);

// ─── SENSOR DOT ROW ───────────────────────────────────────────────────────────
const SensorDotRow = ({ sensors }) => (
  <div style={{
    display: 'flex', flexWrap: 'wrap', gap: '4px 8px',
    alignItems: 'center', marginTop: '6px',

  }}>
    {sensors.map(({ label, active }) => (
      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <PulseDot active={active} size={6} />
        <span style={{
          fontSize: '0.6rem', fontWeight: 700,
          color: active ? T.text : T.grey,
          letterSpacing: '0.02em', whiteSpace: 'nowrap',
        }}>
          {label}
        </span>
      </div>
    ))}
  </div>
);

// ─── NODE CARD ────────────────────────────────────────────────────────────────
const NodeCard = ({ icon: Icon, label, color, isOnline, sensors, children }) => (
  <motion.div
    whileTap={{ scale: 0.97 }}
    style={{
      background: T.card,
      borderRadius: '18px',
      padding: '10px 12px',
      border: `1.5px solid ${isOnline ? `${color}22` : T.border}`,

      boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
      display: 'flex', flexDirection: 'column',
      cursor: 'default',
    }}
  >
    {/* Header Row */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '34px', height: '34px', borderRadius: '10px',
          background: isOnline ? `${color}18` : T.greyBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={16} color={isOnline ? color : T.grey} strokeWidth={2} />
        </div>
        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: T.text, letterSpacing: '-0.01em' }}>
          {label}
        </span>
      </div>
        <SignalBars active={isOnline} />
      </div>

    {sensors && <SensorDotRow sensors={sensors} />}
    {children}
  </motion.div>
);

// ─── NETWORK HEALTH CARD ──────────────────────────────────────────────────────
const NetworkHealthCard = ({ activeCount, totalCount, mqttStatus }) => {
  const pct = totalCount > 0 ? (activeCount / totalCount) * 100 : 0;
  const offlineCount = totalCount - activeCount;
  const barColor = pct === 100 ? T.green : pct >= 50 ? T.amber : '#EF4444';
  const isConnected = mqttStatus === 'connected';

  return (
    <div style={{
      background: T.card, borderRadius: '20px', padding: '16px 18px',
      border: `1.5px solid ${T.border}`, boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ margin: 0, fontSize: '0.55rem', fontWeight: 900, color: T.sub, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Network Health
          </p>
          <h2 style={{ margin: '3px 0 0', fontSize: '1.25rem', fontWeight: 950, color: T.text, letterSpacing: '-0.02em' }}>
            <span style={{ color: barColor }}>{activeCount}</span>
            <span style={{ color: T.sub, fontWeight: 700 }}> / {totalCount}</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: T.sub, marginLeft: '6px' }}>Devices Active</span>
          </h2>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          padding: '4px 10px', borderRadius: '20px',
          background: isConnected ? `${T.green}12` : `${T.amber}12`,
          border: `1px solid ${isConnected ? `${T.green}22` : `${T.amber}22`}`,
        }}>
          {isConnected
            ? <Wifi size={11} color={T.green} strokeWidth={2.5} />
            : <Signal size={11} color={T.amber} strokeWidth={2.5} />
          }
          <span style={{ fontSize: '0.5rem', fontWeight: 900, color: isConnected ? T.green : T.amber, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {mqttStatus === 'connected' ? 'MQTT ON' : mqttStatus === 'connecting' ? 'LINKING' : mqttStatus === 'reconnecting' ? 'RETRY' : 'NO MQTT'}
          </span>
        </div>
      </div>

      <div style={{ marginTop: '14px' }}>
        <div style={{ height: '7px', borderRadius: '10px', background: T.greyBg, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            style={{ height: '100%', borderRadius: '10px', background: barColor }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 900, color: T.green }}>{activeCount} Active</span>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: T.grey }}>{offlineCount} Offline</span>
        </div>
      </div>
    </div>
  );
};

// ─── VISION NODE (SPECIAL) ────────────────────────────────────────────────────
const VisionCard = ({ isOnline, detection }) => {
  /**
   * Detection types come from ESP-CAM /detection endpoint (polled in VisualMonitor).
   * We reflect the last detection type here as status dots.
   * Each dot = true only when that specific class was the last detected type AND cam is active.
   */
  const type = (detection?.type || '---').toLowerCase();

  const sensorDots = [
    { label: 'Motion',  active: isOnline && detection?.active === true },
    { label: 'Birds',   active: isOnline && type.includes('bird') },
    { label: 'Animals', active: isOnline && (type.includes('boar') || type.includes('animal') || type.includes('cattle')) },
    { label: 'Insects', active: isOnline && type.includes('insect') },
    { label: 'Humans',  active: isOnline && type.includes('human') },
  ];

  return (
    <NodeCard icon={Camera} label="Vision Node" color={T.pink} isOnline={isOnline}>
      {/* Camera Preview Box */}
      <div style={{
        marginTop: '10px',
        background: '#0F172A',
        borderRadius: '12px',
        height: '62px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '8px', overflow: 'hidden', position: 'relative',
      }}>
        {isOnline ? (
          <>
            <motion.div
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                position: 'absolute', top: '7px', right: '9px',
                width: '6px', height: '6px', borderRadius: '50%', background: T.pink,
              }}
            />
            <Camera size={14} color={T.pink} strokeWidth={2} />
            <span style={{ fontSize: '0.6rem', fontWeight: 900, color: T.pink, letterSpacing: '0.08em' }}>
              CAM FEED
            </span>
          </>
        ) : (
          <>
            <WifiOff size={14} color={T.grey} />
            <span style={{ fontSize: '0.6rem', fontWeight: 700, color: T.grey }}>NO SIGNAL</span>
          </>
        )}
      </div>
      {/* Detection Status Dots */}
      <SensorDotRow sensors={sensorDots} />
    </NodeCard>
  );
};

// ─── STATUS TILE ─────────────────────────────────────────────────────────────
const StatusTile = ({ icon: Icon, label, isOn, color, offText = 'OFF', hideStatus = false }) => (
  <div
    style={{
      background: isOn ? color : T.card,
      border: `1px solid ${isOn ? color : T.border}`,
      borderRadius: '14px',
      padding: '8px 4px',
      display: 'flex', flexDirection: 'column',

      alignItems: 'center', gap: '5px',
      flex: 1,
      boxShadow: isOn ? `0 4px 12px ${color}25` : '0 1px 4px rgba(0,0,0,0.03)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      minWidth: 0,
      userSelect: 'none',
      pointerEvents: 'none',
    }}
  >
    <div style={{
      width: '30px', height: '30px', borderRadius: '10px',
      background: isOn ? 'rgba(255,255,255,0.2)' : `${color}10`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon size={14} color={isOn ? '#fff' : color} strokeWidth={2.5} />
    </div>
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '0.55rem', fontWeight: 900, color: isOn ? '#fff' : T.text, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
        {label}
      </div>
      {!hideStatus && (
        <div style={{
          fontSize: '0.45rem', fontWeight: 900,
          color: isOn ? 'rgba(255,255,255,0.8)' : T.grey,
          textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '1px',
        }}>
          {isOn ? 'ON' : offText}
        </div>
      )}
    </div>
  </div>
);

// ─── CONTROL PANEL ───────────────────────────────────────────────────────────
/**
 * Interactive status panel — shows live ON/OFF state and toggles global actuators.
 */
const ControlPanel = ({ actuators, mqttStatus, sensorData }) => {
  const isBuzzerOn  = actuators?.[ACTUATORS.BUZZER]  ?? false;
  const isLightOn   = actuators?.[ACTUATORS.LIGHT]   ?? false;
  const isPumpOn    = actuators?.[ACTUATORS.PUMP]     ?? false;
  const isDisplayOn = sensorData?.soil?.oledActive === 1 || sensorData?.soil?.oledActive === true;


  return (
    <div style={{
      background: T.card, borderRadius: '20px', padding: '16px',
      border: `1.5px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
    }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '9px',
          background: `${T.blue}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Zap size={14} color={T.blue} strokeWidth={2.5} />
        </div>
        <span style={{ fontSize: '0.78rem', fontWeight: 900, color: T.text }}>Control Panel</span>
      </div>

      {/* 4-Column Status Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
        <StatusTile icon={BellRing}  label="Buzzer"  isOn={isBuzzerOn}  color="#EF4444" hideStatus />
        <StatusTile icon={Lightbulb} label="Light"   isOn={isLightOn}   color={T.green} hideStatus />
        <StatusTile icon={Zap}       label="Pump"    isOn={isPumpOn}    color={T.blue}  hideStatus />
        <StatusTile icon={Monitor}   label="OLED"    isOn={isDisplayOn} color={T.amber} offText="OFFLINE" hideStatus />

      </div>
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const DeviceManager = () => {
  const {
    devices, sensorData, actuators, toggleActuator, mqttStatus,
  } = useApp();

  // ── Logic-based online states (no random) ─────────────────────────────────
  const soilOnline    = devices?.soil_node?.status    === 'ACTIVE' || devices?.soil_node?.status    === 'PARTIAL';
  const weatherOnline = devices?.weather_node?.status === 'ACTIVE' || devices?.weather_node?.status === 'PARTIAL';
  const waterOnline   = devices?.water_node?.status   === 'ACTIVE' || devices?.water_node?.status   === 'PARTIAL';
  const storageOnline = devices?.storage_node?.status === 'ACTIVE' || devices?.storage_node?.status === 'PARTIAL';
  // Vision = active when cam data or MQTT sensor stream received
  const visionOnline  = devices?.vision_node?.status === 'ACTIVE' || devices?.vision_node?.status === 'PARTIAL';

  const sd = sensorData?.soil    || {};
  const wd = sensorData?.weather || {};
  const id = sensorData?.water   || {};
  const st = sensorData?.storage || {};

  // ── Soil: Moisture, pH, Temp, NPK ─────────────────────────────────────────
  const soilSensors = useMemo(() => [
    { label: 'Moisture', active: soilOnline && sd.moisture != null },
    { label: 'pH',       active: soilOnline && sd.ph       != null },
    { label: 'Temp',     active: soilOnline && sd.temp     != null },
    { label: 'NPK',      active: soilOnline && sd.npk?.n   != null },
  ], [soilOnline, sd]);

  // ── Weather: Temp, Humidity, Rain, Light ──────────────────────────────────
  const weatherSensors = useMemo(() => [
    { label: 'Temp',     active: weatherOnline && wd.temp           != null },
    { label: 'Humidity', active: weatherOnline && wd.humidity       != null },
    { label: 'Rain',     active: weatherOnline && wd.rainLevel      != null },
    { label: 'Light',    active: weatherOnline && wd.lightIntensity != null },
  ], [weatherOnline, wd]);

  // ── Irrigation: Water Level only ──────────────────────────────────────────
  const irrigSensors = useMemo(() => [
    { label: 'Water Level', active: waterOnline && id.level != null },
  ], [waterOnline, id]);

  // ── Storage: Temp, Humidity, Gas (MQ135) — NO level sensor ───────────────
  const storageSensors = useMemo(() => [
    { label: 'Temp',     active: storageOnline && st.temp    != null },
    { label: 'Humidity', active: storageOnline && st.humidity!= null },
    { label: 'Gas',      active: storageOnline && st.mq135   != null },
  ], [storageOnline, st]);

  // ── Network count (logic-based) ───────────────────────────────────────────
  const activeCount = useMemo(() =>
    [soilOnline, weatherOnline, waterOnline, storageOnline, visionOnline].filter(Boolean).length
  , [soilOnline, weatherOnline, waterOnline, storageOnline, visionOnline]);

  const totalCount = 5; // Soil, Weather, Irrigation, Storage, Vision

  return (
    <div style={{
      padding: '12px 14px',
      background: T.bg,
      minHeight: '100%',
      display: 'flex', flexDirection: 'column', gap: '10px',
      paddingBottom: '16px',
    }}>
      {/* ── NETWORK HEALTH ── */}
      <NetworkHealthCard
        activeCount={activeCount}
        totalCount={totalCount}
        mqttStatus={mqttStatus}
      />

      {/* ── PRIMARY NODE GRID ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>


        {/* Soil Node */}
        <NodeCard
          icon={Sprout} label="Soil Node" color={T.green}
          isOnline={soilOnline} sensors={soilSensors}
        />

        {/* Weather Node */}
        <NodeCard
          icon={CloudRain} label="Weather Node" color={T.teal}
          isOnline={weatherOnline} sensors={weatherSensors}
        />

        {/* Irrigation Node — Water Level only */}
        <NodeCard
          icon={Droplets} label="Irrigation" color={T.sky}
          isOnline={waterOnline} sensors={irrigSensors}
        />

        {/* Storage Node — Temp, Humidity, Gas */}
        <NodeCard
          icon={HardDrive} label="Storage Node" color={T.purple}
          isOnline={storageOnline} sensors={storageSensors}
        />

        {/* Vision Node — full width */}
        <div style={{ gridColumn: '1 / -1' }}>
          <VisionCard isOnline={visionOnline} detection={null} />
        </div>
      </div>

      {/* ── CONTROL PANEL ── */}
      <ControlPanel
        actuators={actuators}
        mqttStatus={mqttStatus}
        sensorData={sensorData}
      />
    </div>
  );
};

export default DeviceManager;
