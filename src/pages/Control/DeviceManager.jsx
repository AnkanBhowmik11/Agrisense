import React, { useEffect, useMemo, useState } from 'react';
import { motion, Reorder, useDragControls } from 'framer-motion';
import {
  BellRing, Camera, CloudRain, Droplets, Fan, Gauge, GripVertical, HardDrive, Lightbulb, Power, Siren, Snowflake, Sprout, Timer, Thermometer, Wind
} from 'lucide-react';
import { useApp } from '../../state/AppContext';
import { ACTUATORS } from '../../logic/healthEngine';

const CAM_IP = 'http://192.168.4.2';
const ORDER_KEY = 'agrisense_control_order_v2';

const C = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  border: 'rgba(15,23,42,0.06)',
  text: '#0F172A',
  sub: '#64748B',
  green: '#10B981',
  greenDark: '#059669',
  greenGradient: 'linear-gradient(135deg, #10B981, #059669)',
  pageGradient: 'linear-gradient(160deg, #064E3B 0%, #022C22 100%)',
  red: '#EF4444',
  amber: '#F59E0B',
  teal: '#14B8A6',
  pink: '#EC4899',
  purple: '#8B5CF6',
};

const RectBtn = ({ icon: Icon, label, active, onClick, danger = false, disabled = false }) => (
  <motion.button
    whileTap={disabled ? {} : { scale: 0.97 }}
    onClick={disabled ? undefined : onClick}
    style={{
      border: `1px solid ${active ? (danger ? `${C.red}66` : `${C.green}66`) : C.border}`,
      borderRadius: '14px',
      height: '50px',
      padding: '0 12px',
      background: active ? (danger ? 'linear-gradient(135deg, #EF4444, #DC2626)' : C.greenGradient) : '#F8FAFC',
      color: active ? 'white' : C.text,
      fontWeight: 800,
      fontSize: '0.78rem',
      cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '7px',
      boxShadow: active ? `0 8px 20px ${danger ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'}` : 'none',
      transition: '0.25s',
      opacity: disabled ? 0.5 : 1,
    }}
  >
    {Icon ? <Icon size={15} /> : null}
    {label}
  </motion.button>
);

const TogglePill = ({ label, on, onToggle }) => (
  <button
    onClick={onToggle}
    style={{
      width: '100%',
      border: 'none',
      borderRadius: '16px',
      height: '52px',
      background: on ? C.greenGradient : '#E2E8F0',
      color: on ? 'white' : C.text,
      fontWeight: 900,
      fontSize: '0.86rem',
      letterSpacing: '0.01em',
      cursor: 'pointer',
      boxShadow: on ? '0 10px 25px rgba(16,185,129,0.28)' : 'none',
      transition: '0.25s',
    }}
  >
    {label}: {on ? 'ON' : 'OFF'}
  </button>
);

const formatVal = (v, unit = '') => (v == null ? '--' : `${v}${unit}`);

const Block = ({ id, icon: Icon, title, online, accent, children, onStartDrag, dragControls }) => (
  <Reorder.Item
    value={id}
    dragListener={false}
    dragControls={dragControls}
    style={{
      listStyle: 'none',
      background: C.card,
      border: `1px solid ${online ? `${accent}33` : C.border}`,
      borderRadius: '22px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
      overflow: 'hidden',
    }}
  >
    <div style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${C.border}`, background: online ? `${accent}10` : '#F8FAFC' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: online ? `${accent}22` : '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={15} color={online ? accent : '#94A3B8'} />
        </div>
        <div>
          <div style={{ fontWeight: 900, color: C.text, fontSize: '0.84rem' }}>{title}</div>
          <div style={{ fontSize: '0.62rem', fontWeight: 800, color: online ? accent : C.sub }}>{online ? 'ACTIVE' : 'INACTIVE'}</div>
        </div>
      </div>
      <button
        onPointerDown={onStartDrag}
        style={{ width: '28px', height: '28px', borderRadius: '8px', border: `1px solid ${C.border}`, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'grab' }}
        title="Hold and drag"
      >
        <GripVertical size={14} color={C.sub} />
      </button>
    </div>
    <div style={{ padding: '12px', display: 'grid', gap: '8px' }}>
      {children}
    </div>
  </Reorder.Item>
);

const DeviceManager = () => {
  const { fields, activeFieldId, switchField, devices, sensorData, actuators, toggleActuator } = useApp();

  const [selectedFieldId, setSelectedFieldId] = useState(activeFieldId || fields?.[0]?.id || '');
  const [order, setOrder] = useState(() => {
    try {
      const raw = localStorage.getItem(ORDER_KEY);
      return raw ? JSON.parse(raw) : ['vision', 'irrigation', 'soil', 'weather', 'storage'];
    } catch {
      return ['vision', 'irrigation', 'soil', 'weather', 'storage'];
    }
  });

  const [timerMinutes, setTimerMinutes] = useState(15);
  const [soilPower, setSoilPower] = useState(false);
  const [weatherPower, setWeatherPower] = useState(false);
  const [fanOn, setFanOn] = useState(false);
  const [fanMode, setFanMode] = useState('Low');
  const [acOn, setAcOn] = useState(false);
  const [acTemp, setAcTemp] = useState(22);
  const [acSpeed, setAcSpeed] = useState('Auto');
  const [acTimer, setAcTimer] = useState(0);
  const [alarmOn, setAlarmOn] = useState(false);
  const [soilInstant, setSoilInstant] = useState(null);
  const [weatherInstant, setWeatherInstant] = useState(null);
  const [storageWeather, setStorageWeather] = useState(null);

  useEffect(() => {
    if (!selectedFieldId && fields.length) setSelectedFieldId(fields[0].id);
  }, [fields, selectedFieldId]);

  useEffect(() => {
    if (selectedFieldId) switchField(selectedFieldId);
  }, [selectedFieldId, switchField]);

  useEffect(() => localStorage.setItem(ORDER_KEY, JSON.stringify(order)), [order]);

  const selectedField = useMemo(() => fields.find((f) => f.id === selectedFieldId) || fields[0] || null, [fields, selectedFieldId]);
  const enabled = selectedField?.features || [];
  const show = {
    vision: enabled.includes('vision'),
    irrigation: enabled.includes('irrigation'),
    soil: enabled.includes('soil'),
    weather: enabled.includes('weather'),
    storage: enabled.includes('storage'),
  };

  const online = {
    vision: devices?.vision_node?.status === 'ACTIVE' || devices?.vision_node?.status === 'PARTIAL',
    irrigation: devices?.water_node?.status === 'ACTIVE' || devices?.water_node?.status === 'PARTIAL',
    soil: devices?.soil_node?.status === 'ACTIVE' || devices?.soil_node?.status === 'PARTIAL',
    weather: devices?.weather_node?.status === 'ACTIVE' || devices?.weather_node?.status === 'PARTIAL',
    storage: devices?.storage_node?.status === 'ACTIVE' || devices?.storage_node?.status === 'PARTIAL',
  };

  const backendIp = localStorage.getItem('agrisense_backend_ip') || (window.location.hostname === 'localhost' ? '192.168.4.100' : window.location.hostname);
  const streamUrl = `http://${backendIp}:5050/stream/cam1`;

  const runSoilScan = () => {
    const s = sensorData?.soil || {};
    setSoilInstant({
      moisture: formatVal(s.moisture, '%'),
      ph: formatVal(s.ph),
      temp: formatVal(s.temp, 'C'),
      n: formatVal(s?.npk?.n),
      p: formatVal(s?.npk?.p),
      k: formatVal(s?.npk?.k),
    });
  };

  const runWeatherScan = () => {
    const w = sensorData?.weather || {};
    const storm = (w.rainLevel != null && w.rainLevel > 20) || (w.humidity != null && w.humidity > 90);
    setWeatherInstant({
      temp: formatVal(w.temp, 'C'),
      humidity: formatVal(w.humidity, '%'),
      rain: formatVal(w.rainLevel),
      light: formatVal(w.lightIntensity),
      stormAlert: storm ? 'Storm Alert' : 'No Storm Warning',
    });
  };

  const readStorageWeather = () => {
    const st = sensorData?.storage || {};
    setStorageWeather({
      temp: formatVal(st.temp, 'C'),
      humidity: formatVal(st.humidity, '%'),
    });
  };

  const startIrrigationTimer = () => {
    if (!actuators?.[ACTUATORS.PUMP]) toggleActuator(ACTUATORS.PUMP);
    setTimeout(() => {
      if (actuators?.[ACTUATORS.PUMP]) toggleActuator(ACTUATORS.PUMP);
    }, timerMinutes * 60 * 1000);
  };

  const blocks = {
    vision: (dragControls) => (
      <Block id="vision" icon={Camera} title="Vision Camera" online={online.vision} accent={C.pink} dragControls={dragControls} onStartDrag={(e) => dragControls.start(e)}>
        <div style={{ background: '#0F172A', borderRadius: '14px', height: '120px', overflow: 'hidden', position: 'relative' }}>
          {online.vision ? <img src={streamUrl} alt="Vision Stream" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} /> : null}
          <div style={{ position: 'absolute', left: '10px', bottom: '8px', color: 'white', fontSize: '0.62rem', fontWeight: 900, letterSpacing: '0.06em' }}>
            {online.vision ? 'CAM LIVE' : 'NO SIGNAL'}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '8px' }}>
          <RectBtn icon={BellRing} label="Buzzer" active={actuators?.[ACTUATORS.BUZZER]} onClick={() => toggleActuator(ACTUATORS.BUZZER)} danger />
          <RectBtn icon={Lightbulb} label="LED" active={actuators?.[ACTUATORS.LIGHT]} onClick={() => toggleActuator(ACTUATORS.LIGHT)} />
          <RectBtn icon={Camera} label="Capture" active={false} onClick={() => fetch(`${CAM_IP}/capture`).catch(() => alert('Capture endpoint unavailable'))} />
        </div>
      </Block>
    ),
    irrigation: (dragControls) => (
      <Block id="irrigation" icon={Droplets} title="Irrigation Control" online={online.irrigation} accent={C.teal} dragControls={dragControls} onStartDrag={(e) => dragControls.start(e)}>
        <TogglePill label="Pump" on={!!actuators?.[ACTUATORS.PUMP]} onToggle={() => toggleActuator(ACTUATORS.PUMP)} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <select value={timerMinutes} onChange={(e) => setTimerMinutes(Number(e.target.value))} style={{ borderRadius: '12px', border: `1px solid ${C.border}`, height: '46px', padding: '0 10px', fontWeight: 800 }}>
            {[15, 30, 45, 60, 75, 90].map((m) => <option key={m} value={m}>{m} minutes</option>)}
          </select>
          <RectBtn icon={Timer} label="Set Timer" active={false} onClick={startIrrigationTimer} />
        </div>
      </Block>
    ),
    soil: (dragControls) => (
      <Block id="soil" icon={Sprout} title="Soil Health" online={online.soil} accent={C.green} dragControls={dragControls} onStartDrag={(e) => dragControls.start(e)}>
        <TogglePill label="Power" on={soilPower} onToggle={() => setSoilPower((p) => !p)} />
        <RectBtn icon={Gauge} label="Get Data" active={false} disabled={!soilPower} onClick={runSoilScan} />
        {soilInstant ? (
          <div style={{ borderRadius: '14px', border: `1px solid ${C.border}`, background: '#F8FAFC', padding: '10px', display: 'grid', gap: '4px', fontSize: '0.74rem', fontWeight: 800, color: C.text }}>
            <div>Nitrogen: {soilInstant.n} | Phosphorus: {soilInstant.p}</div>
            <div>Potassium: {soilInstant.k} | Moisture: {soilInstant.moisture}</div>
            <div>pH: {soilInstant.ph} | Temp: {soilInstant.temp}</div>
          </div>
        ) : null}
      </Block>
    ),
    weather: (dragControls) => (
      <Block id="weather" icon={CloudRain} title="Weather Control" online={online.weather} accent={C.teal} dragControls={dragControls} onStartDrag={(e) => dragControls.start(e)}>
        <TogglePill label="Power" on={weatherPower} onToggle={() => setWeatherPower((p) => !p)} />
        <RectBtn icon={Wind} label="Get Data" active={false} disabled={!weatherPower} onClick={runWeatherScan} />
        {weatherInstant ? (
          <div style={{ borderRadius: '14px', border: `1px solid ${C.border}`, background: '#F8FAFC', padding: '10px', display: 'grid', gap: '4px', fontSize: '0.74rem', fontWeight: 800, color: C.text }}>
            <div>Temp: {weatherInstant.temp} | Humidity: {weatherInstant.humidity}</div>
            <div>Rain: {weatherInstant.rain} | Light: {weatherInstant.light}</div>
            <div style={{ color: weatherInstant.stormAlert === 'Storm Alert' ? C.red : C.green }}>{weatherInstant.stormAlert}</div>
          </div>
        ) : null}
      </Block>
    ),
    storage: (dragControls) => (
      <Block id="storage" icon={HardDrive} title="Storage Control" online={online.storage} accent={C.purple} dragControls={dragControls} onStartDrag={(e) => dragControls.start(e)}>
        <RectBtn icon={Thermometer} label="Weather Option" active={false} onClick={readStorageWeather} />
        {storageWeather ? (
          <div style={{ borderRadius: '12px', border: `1px solid ${C.border}`, padding: '8px 10px', background: '#F8FAFC', fontSize: '0.74rem', fontWeight: 800 }}>
            Temp: {storageWeather.temp} | Humidity: {storageWeather.humidity}
          </div>
        ) : null}

        <div style={{ borderRadius: '14px', border: `1px solid ${C.border}`, padding: '10px', display: 'grid', gap: '8px' }}>
          <TogglePill label="Fan" on={fanOn} onToggle={() => setFanOn((p) => !p)} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '6px' }}>
            {['Low', 'Mid', 'High'].map((m) => <RectBtn key={m} icon={Fan} label={m} active={fanMode === m} disabled={!fanOn} onClick={() => setFanMode(m)} />)}
          </div>
        </div>

        <div style={{ borderRadius: '14px', border: `1px solid ${C.border}`, padding: '10px', display: 'grid', gap: '8px' }}>
          <TogglePill label="AC" on={acOn} onToggle={() => setAcOn((p) => !p)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <select value={acTemp} disabled={!acOn} onChange={(e) => setAcTemp(Number(e.target.value))} style={{ borderRadius: '12px', border: `1px solid ${C.border}`, height: '44px', padding: '0 10px', fontWeight: 800, opacity: !acOn ? 0.5 : 1 }}>
              {Array.from({ length: 21 }).map((_, i) => 10 + i).map((t) => <option key={t} value={t}>{t} C</option>)}
            </select>
            <select value={acSpeed} disabled={!acOn} onChange={(e) => setAcSpeed(e.target.value)} style={{ borderRadius: '12px', border: `1px solid ${C.border}`, height: '44px', padding: '0 10px', fontWeight: 800, opacity: !acOn ? 0.5 : 1 }}>
              {['Low', 'Mid', 'High', 'Auto'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <select value={acTimer} disabled={!acOn} onChange={(e) => setAcTimer(Number(e.target.value))} style={{ borderRadius: '12px', border: `1px solid ${C.border}`, height: '44px', padding: '0 10px', fontWeight: 800, opacity: !acOn ? 0.5 : 1 }}>
              {[0, 15, 30, 45, 60, 90, 120].map((t) => <option key={t} value={t}>{t === 0 ? 'No Timer' : `${t} min`}</option>)}
            </select>
            <RectBtn icon={Snowflake} label="Apply AC" active={false} disabled={!acOn} onClick={() => alert(`AC set: ${acTemp}C | ${acSpeed} | Timer ${acTimer || 0} min`)} />
          </div>
        </div>

        <RectBtn icon={Siren} label="Alarm" active={alarmOn} onClick={() => setAlarmOn((p) => !p)} danger={alarmOn} />
      </Block>
    ),
  };

  const visibleIds = order.filter((id) => show[id]);

  const dragControlsMap = {
    vision: useDragControls(),
    irrigation: useDragControls(),
    soil: useDragControls(),
    weather: useDragControls(),
    storage: useDragControls(),
  };

  return (
    <div style={{ background: C.bg, minHeight: '100%', padding: '12px', display: 'grid', gap: '12px' }}>
      <div style={{ background: C.pageGradient, borderRadius: '26px', padding: '14px', color: 'white', boxShadow: '0 14px 35px rgba(2,44,34,0.35)' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase', opacity: 0.9 }}>Control Tab</div>
        <div style={{ marginTop: '4px', fontSize: '1.15rem', fontWeight: 900 }}>Field Device Controls</div>
        <select
          value={selectedFieldId}
          onChange={(e) => setSelectedFieldId(e.target.value)}
          style={{ marginTop: '10px', width: '100%', borderRadius: '14px', border: 'none', height: '48px', padding: '0 12px', fontWeight: 800, color: C.text, background: '#F8FAFC' }}
        >
          {fields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>

      <div style={{ fontSize: '0.74rem', fontWeight: 800, color: C.sub, display: 'flex', alignItems: 'center', gap: '6px' }}>
        <GripVertical size={14} /> Hold the corner grip and drag to reorder blocks.
      </div>

      <Reorder.Group axis="y" values={visibleIds} onReorder={setOrder} style={{ display: 'grid', gap: '10px', paddingBottom: '10px', margin: 0, paddingInlineStart: 0 }}>
        {visibleIds.map((id) => blocks[id](dragControlsMap[id]))}
      </Reorder.Group>
    </div>
  );
};

export default DeviceManager;
