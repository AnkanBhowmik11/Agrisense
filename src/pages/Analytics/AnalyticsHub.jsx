/**
 * AgriSense Pro v17.1.0 High-Density Analytical Intelligence Hub
 * 8-Chart Diagnostic Matrix per module for Deep Insight.
 * Fixed: Synchronized with global sensor history for immediate graph rendering.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ComposedChart
} from 'recharts';
import {
  Sprout, CloudRain, Warehouse, Download, ChevronDown, CheckCircle2, FileText
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useApp } from '../../state/AppContext';
import { useLocation } from 'react-router-dom';

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────
const COLORS = {
  good: '#10B981', warning: '#F59E0B', critical: '#EF4444', neutral: '#94A3B8',
  bg: '#F8FAFC', card: '#FFFFFF', border: '#E2E8F0', text: '#0F172A', subtext: '#64748B',
  soil: ['#10B981', '#3B82F6', '#A855F7', '#EC4899', '#F59E0B', '#14B8A6', '#6366F1', '#8B5CF6'],
  weather: ['#0EA5E9', '#F59E0B', '#6366F1', '#10B981', '#F43F5E', '#8B5CF6', '#14B8A6', '#A855F7'],
  storage: ['#8B5CF6', '#F43F5E', '#10B981', '#3B82F6', '#0EA5E9', '#F59E0B', '#6366F1', '#14B8A6']
};

// ─── COMPONENTS ───────────────────────────────────────────────────────────
const AnalyticsCard = ({ title, isOffline, children, height = '340px', currentVal, avgVal, minVal, maxVal, unit = '', isHistorical, color }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: COLORS.card,
        borderRadius: '28px',
        padding: '1.5rem',
        border: '1px solid rgba(0,0,0,0.04)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        height,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* 🚀 Diagnostic Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <div style={{ width: '4px', height: '14px', borderRadius: '4px', background: color }} />
            <h3 style={{ fontSize: '0.65rem', fontWeight: 900, margin: 0, color: COLORS.subtext, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{title}</h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '2.2rem', fontWeight: 950, color: COLORS.text, letterSpacing: '-0.03em', lineHeight: 1 }}>
              {(isHistorical ? avgVal : currentVal)?.toFixed(1) || '--'}
            </span>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: COLORS.subtext, opacity: 0.8 }}>
              {unit}
            </span>
          </div>

          {/* Live indicator removed per request */}
        </div>

        {isHistorical && !isOffline && (
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px',
            background: 'rgba(0,0,0,0.05)', padding: '1px', borderRadius: '12px',
            overflow: 'hidden'
          }}>
            <div style={{ background: COLORS.card, padding: '8px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '0.5rem', fontWeight: 900, color: COLORS.subtext, textTransform: 'uppercase', marginBottom: '2px' }}>MIN</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 950, color: COLORS.text }}>{minVal?.toFixed(1) || '--'}</span>
            </div>
            <div style={{ background: COLORS.card, padding: '8px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '0.5rem', fontWeight: 900, color: COLORS.subtext, textTransform: 'uppercase', marginBottom: '2px' }}>MAX</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 950, color: COLORS.text }}>{maxVal?.toFixed(1) || '--'}</span>
            </div>
          </div>
        )}
      </div>

      {/* 🚀 Chart Container */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div style={{ width: '100%', height: '100%', opacity: isOffline ? 0.05 : 1 }}>
          {children}
        </div>
        {isOffline && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 950, color: COLORS.neutral, letterSpacing: '0.2em' }}>NODE OFFLINE</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const TIME_RANGES = [
  { id: 'realtime', label: 'Live', duration: 5 * 60 * 1000 },
  { id: '1h', label: '1 Hr', duration: 60 * 60 * 1000 },
  { id: '6h', label: '6 Hr', duration: 6 * 60 * 60 * 1000 },
  { id: '1d', label: '1 Day', duration: 24 * 60 * 60 * 1000 }
];

const CustomTooltip = ({ active, payload, unit, isRealtime, color }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const timeStr = isRealtime
      ? new Date(data.name).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      : new Date(data.name).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

    const dataSeries = payload.filter(p => p.dataKey !== '_envelope');

    return (
      <div style={{
        background: 'rgba(15, 23, 42, 0.98)',
        backdropFilter: 'blur(20px)',
        padding: '5px 9px',
        borderRadius: '10px',
        boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.15)',
        color: 'white',
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '1px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '0px' }}>
          <div style={{ fontSize: '0.48rem', fontWeight: 800, opacity: 0.5, letterSpacing: '0.05em' }}>{timeStr}</div>
        </div>

        {dataSeries.map((entry, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '1px 0' }}>
            <div style={{ width: '2px', height: '10px', borderRadius: '1px', background: entry.color || color || COLORS.good }} />
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
              {dataSeries.length > 1 && <span style={{ fontSize: '0.5rem', fontWeight: 900, opacity: 0.4, width: '10px' }}>{entry.dataKey.toUpperCase()[0]}</span>}
              <span style={{ fontSize: '1rem', fontWeight: 950, letterSpacing: '-0.02em', lineHeight: 1 }}>{entry.value?.toFixed(1)}</span>
              <span style={{ fontSize: '0.55rem', fontWeight: 800, opacity: 0.5 }}>{unit}</span>
            </div>
          </div>
        ))}

        {dataSeries.length === 1 && (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '2px' }}>
            {(() => {
              const dk = dataSeries[0].dataKey;
              const min = data[`${dk}_min`] ?? data.min;
              const max = data[`${dk}_max`] ?? data.max;
              const delta = (min != null && max != null) ? (max - min) : null;
              if (min == null && max == null) return null;
              return (
                <>
                  <div style={{ display: 'flex', gap: '2px', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '0.35rem', fontWeight: 900, opacity: 0.4 }}>MN</span>
                    <span style={{ fontSize: '0.55rem', fontWeight: 800 }}>{min?.toFixed(1)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '2px', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '0.35rem', fontWeight: 900, opacity: 0.4 }}>MX</span>
                    <span style={{ fontSize: '0.55rem', fontWeight: 800 }}>{max?.toFixed(1)}</span>
                  </div>
                  {delta !== null && delta > 0 && (
                    <div style={{ display: 'flex', gap: '2px', alignItems: 'baseline', marginLeft: 'auto' }}>
                      <span style={{ fontSize: '0.35rem', fontWeight: 900, opacity: 0.4 }}>Δ</span>
                      <span style={{ fontSize: '0.55rem', fontWeight: 800, color: COLORS.good }}>{delta.toFixed(1)}</span>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>
    );
  }
  return null;
};

const Pinpoint = (props) => {
  const { cx, cy, stroke } = props;
  if (!cx || !cy) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={8} fill={stroke} fillOpacity={0.15} stroke="none" />
      <circle cx={cx} cy={cy} r={5.5} fill="#0F172A" stroke="white" strokeWidth={2.5} style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />
    </g>
  );
};

const getDateKey = (ts = Date.now()) => {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const AnalyticsHub = () => {
  const { sensorData, devices, activeField, analyticsSnapshotsByField } = useApp();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'soil');
  const [timeRange, setTimeRange] = useState(TIME_RANGES[0]);

  // 🧠 TIME METRICS: Calculate bounds for filtering today's data
  const timeMetrics = useMemo(() => {
    const rawNow = Date.now();
    return { now: rawNow, startTime: rawNow - timeRange.duration };
  }, [timeRange.duration]);

  // ─── PROCESS GLOBAL HISTORY INTO CATEGORIZED TRENDS ───
  const processedData = useMemo(() => {
    const today = getDateKey(Date.now());
    const rawData = analyticsSnapshotsByField?.[activeField?.id]?.[today] || [];

    // Filter data based on timeRange
    const filteredData = timeRange.id === '1d' ? rawData : rawData.filter(entry => entry.timestamp >= timeMetrics.startTime);

    const mapData = (raw, type) => {
      if (raw.length === 0) return [];
      return raw.map(entry => {
        const ts = Number(entry.timestamp || 0);
        const base = { name: ts, plotTime: ts };
        if (type === 'soil') {
          return {
            ...base,
            moisture: entry.soil?.moisture, ph: entry.soil?.ph, temp: entry.soil?.temp,
            n: entry.soil?.npk?.n, p: entry.soil?.npk?.p, k: entry.soil?.npk?.k,
            health: entry.soil?.healthIndex
          };
        }
        if (type === 'weather') {
          return {
            ...base,
            temp: entry.weather?.temp, humidity: entry.weather?.humidity,
            lightIntensity: entry.weather?.lightIntensity, rainLevel: entry.weather?.rainLevel,
            health: entry.weather?.healthIndex
          };
        }
        if (type === 'storage') {
          return {
            ...base,
            temp: entry.storage?.temp, humidity: entry.storage?.humidity,
            mq135: entry.storage?.mq135,
            health: entry.storage?.healthIndex
          };
        }
        return base;
      });
    };

    return {
      soil: mapData(rawData, 'soil'),
      weather: mapData(rawData, 'weather'),
      storage: mapData(rawData, 'storage')
    };
  }, [analyticsSnapshotsByField, activeField?.id, timeMetrics.startTime, timeRange.id]);

  const getIsOffline = (type) => {
    const node = devices[`${type}_node`];
    return (!node || node.status === 'OFFLINE') && (processedData[type]?.length === 0);
  };

  const isRealtime = false;

  const startOfDay = new Date().setHours(0, 0, 0, 0);
  const endOfDay = new Date().setHours(24, 0, 0, 0);
  const xDomain = [startOfDay, endOfDay];

  // 🕒 DYNAMIC TICK GENERATOR: Ensures clear daily/hourly markings
  const xTicks = useMemo(() => {
    const ticks = [];
    for (let t = startOfDay; t <= endOfDay; t += 4 * 3600000) {
      ticks.push(t);
    }
    return ticks;
  }, [startOfDay, endOfDay]);

  const getFormatXLabel = () => (v) => {
    const d = new Date(v);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

    const renderGrid = (tabId) => {
      const charts = {
        soil: [
          { title: "Soil Moisture", type: "line", key: "moisture", color: COLORS.soil[1], unit: "%", min: 0, max: 100 },
          { title: "Soil pH", type: "line", key: "ph", color: COLORS.soil[4], unit: "pH", min: 0, max: 14, tickCount: 8 },
          { title: "Soil Temp", type: "line", key: "temp", color: COLORS.soil[3], unit: "°C", min: 0, max: 60 },
          { title: "Nitrogen (N)", type: "line", key: "n", color: COLORS.soil[0], unit: "mg/kg", min: 0, max: 300 },
          { title: "Phosphorus (P)", type: "line", key: "p", color: COLORS.soil[1], unit: "mg/kg", min: 0, max: 300 },
          { title: "Potassium (K)", type: "line", key: "k", color: COLORS.soil[2], unit: "mg/kg", min: 0, max: 300 },
          { title: "NPK Balance", type: "line_multi", keys: ['n', 'p', 'k'], colors: [COLORS.soil[0], COLORS.soil[1], COLORS.soil[2]], unit: "mg/kg", min: 0, max: 300 }
        ],
        weather: [
          { title: "Ambient Temp", type: "line", key: "temp", color: COLORS.weather[0], unit: "°C", min: 0, max: 60 },
          { title: "Humidity", type: "line", key: "humidity", color: COLORS.weather[1], unit: "%", min: 0, max: 100 },
          { title: "Light (LDR)", type: "line", key: "lightIntensity", color: COLORS.weather[2], unit: "LUX", min: 0, max: 1000 },
          { title: "Rain Level", type: "line", key: "rainLevel", color: COLORS.weather[3], unit: "mm", min: 0, max: 50 }
        ],
        storage: [
          { title: "Storage Temp", type: "line", key: "temp", color: COLORS.storage[0], unit: "°C", min: 0, max: 60 },
          { title: "Storage Humidity", type: "line", key: "humidity", color: COLORS.storage[1], unit: "%", min: 0, max: 100 },
          { title: "MQ135 (Gas)", type: "line", key: "mq135", color: COLORS.storage[2], unit: "ppm", min: 0, max: 500 }
        ]
      }[tabId] || [];

      const isOffline = getIsOffline(tabId);
      const tabData = processedData[tabId] || [];
      const formatXLabel = getFormatXLabel();

      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {charts.map((c, i) => {
            // 🚀 ROBUST STATS ENGINE: Handles single-key and multi-key (NPK) summary logic
            const targetKeys = c.keys || (c.key ? [c.key] : []);

            // 🛠️ PRE-PROCESS DATA: Create a dedicated envelope property for the Range Area
            const chartData = tabData.map(d => {
              const mns = targetKeys.map(k => d[`${k}_min`] ?? d[k]).filter(v => typeof v === 'number');
              const mxs = targetKeys.map(k => d[`${k}_max`] ?? d[k]).filter(v => typeof v === 'number');
              return {
                ...d,
                _envelope: mns.length && mxs.length ? [Math.min(...mns), Math.max(...mxs)] : null
              };
            });

            const getValsForKey = (k) => tabData.map(d => d[k]).filter(v => typeof v === 'number');
            const getMinForKey = (k) => tabData.map(d => d[`${k}_min`] ?? d[k]).filter(v => typeof v === 'number');
            const getMaxForKey = (k) => tabData.map(d => d[`${k}_max`] ?? d[k]).filter(v => typeof v === 'number');

            const primaryVals = getValsForKey(targetKeys[0] || '');
            const currentVal = primaryVals.length > 0 ? primaryVals[primaryVals.length - 1] : null;
            const avgVal = primaryVals.length > 0 ? primaryVals.reduce((a, b) => a + b, 0) / primaryVals.length : null;

            const allMins = targetKeys.flatMap(getMinForKey);
            const allMaxs = targetKeys.flatMap(getMaxForKey);
            const minVal = allMins.length > 0 ? Math.min(...allMins) : null;
            const maxVal = allMaxs.length > 0 ? Math.max(...allMaxs) : null;

            return (
              <AnalyticsCard
                key={i}
                title={c.title}
                isOffline={isOffline}
                currentVal={currentVal}
                avgVal={avgVal}
                minVal={minVal}
                maxVal={maxVal}
                unit={c.unit}
                isHistorical={!isRealtime}
                color={c.color || c.colors?.[0]}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 20, right: 35, left: 10, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
                    <XAxis
                      dataKey={isRealtime ? "plotTime" : "name"}
                      type="number"
                      domain={xDomain}
                      ticks={xTicks}
                      tickFormatter={formatXLabel}
                      axisLine={{ stroke: 'rgba(0,0,0,0.1)', strokeWidth: 1 }}
                      tickLine={{ stroke: 'rgba(0,0,0,0.1)' }}
                      tick={{ fontSize: 9, fontWeight: 800, fill: COLORS.subtext, dy: 10 }}
                      interval={0}
                    />
                    <YAxis
                      axisLine={{ stroke: 'rgba(0,0,0,0.1)', strokeWidth: 1 }}
                      tickLine={{ stroke: 'rgba(0,0,0,0.1)' }}
                      tick={{ fontSize: 9, fontWeight: 900, fill: COLORS.subtext, dx: -5 }}
                      tickFormatter={(v) => v % 1 === 0 ? v : v.toFixed(1)}
                      domain={[c.min ?? 0, c.max ?? 'auto']}
                      allowDataOverflow={true}
                      width={40}
                      tickCount={c.tickCount || 6}
                      interval={0}
                    />
                    <Tooltip
                      content={<CustomTooltip isRealtime={isRealtime} unit={c.unit} color={c.color || c.colors?.[0]} />}
                      cursor={false}
                      isAnimationActive={false}
                      transitionDuration={200}
                    />
                    {/* 🚀 DIAGNOSTIC ENVELOPE: Pre-calculated range for stability */}
                    {!isRealtime && (
                      <Area
                        type="monotone"
                        dataKey="_envelope"
                        stroke="none"
                        fill={c.color || c.colors?.[0] || COLORS.neutral}
                        fillOpacity={0.08}
                        activeDot={false}
                        isAnimationActive={false}
                      />
                    )}

                    {c.type === 'line_multi' ? (
                      c.keys.map((k, idx) => (
                        <Line
                          key={k}
                          type="monotone"
                          dataKey={k}
                          stroke={c.colors[idx]}
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={<Pinpoint />}
                          isAnimationActive={false}
                        />
                      ))
                    ) : (
                      <Line
                        type="monotone"
                        dataKey={c.key}
                        stroke={c.color}
                        strokeWidth={3.5}
                        dot={false}
                        activeDot={<Pinpoint />}
                        isAnimationActive={false}
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </AnalyticsCard>
            );
          })}
        </div>
      );
    };

    return (
      <div style={{ background: COLORS.bg, minHeight: '100vh', padding: '0.75rem', fontFamily: "'Outfit', sans-serif", display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }} className="no-scrollbar">
            {[
              { id: 'soil', label: 'Soil', icon: Sprout },
              { id: 'weather', label: 'Weather', icon: CloudRain },
              { id: 'storage', label: 'Storage', icon: Warehouse }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                padding: '8px 16px', borderRadius: '12px', border: 'none',
                background: activeTab === tab.id ? COLORS.good : 'white',
                color: activeTab === tab.id ? 'white' : COLORS.text,
                display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)', transition: '0.3s',
                whiteSpace: 'nowrap'
              }}>
                <tab.icon size={14} /><span style={{ fontSize: '0.75rem', fontWeight: 800 }}>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* 🚀 EXPORT & PDF ACTIONS */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                const tabData = processedData[activeTab] || [];
                if (!tabData.length) {
                  alert(`No ${activeTab} data collected for this duration.`);
                  return;
                }
                const doc = new jsPDF();
                const dateStr = new Date().toLocaleString();
                doc.setFontSize(22); doc.setTextColor(16, 185, 129); doc.text(`AGRI SENSE DURATION REPORT`, 14, 22);
                doc.setFontSize(10); doc.setTextColor(100);
                doc.text(`FIELD: ${activeField?.name || 'Unknown'} | DURATION: ${timeRange.label}`, 14, 30);
                doc.text(`TIMESTAMP: ${dateStr}`, 14, 35);

                const avg = (key) => {
                  const vals = tabData.map(d => d[key]).filter(v => typeof v === 'number');
                  return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '--';
                };

                let bodyData = [];
                if (activeTab === 'soil') {
                  bodyData = [
                    ['Avg Moisture', `${avg('moisture')}%`], ['Avg Temp', `${avg('temp')}°C`],
                    ['Avg pH', `${avg('ph')}`], ['Avg N', `${avg('n')} mg/kg`],
                    ['Avg P', `${avg('p')} mg/kg`], ['Avg K', `${avg('k')} mg/kg`]
                  ];
                } else if (activeTab === 'weather') {
                  bodyData = [
                    ['Avg Ambient Temp', `${avg('temp')}°C`], ['Avg Humidity', `${avg('humidity')}%`],
                    ['Avg Light', `${avg('lightIntensity')} LUX`], ['Max Rain', `${Math.max(...tabData.map(d => d.rainLevel || 0))} mm`]
                  ];
                } else if (activeTab === 'storage') {
                  bodyData = [
                    ['Avg Storage Temp', `${avg('temp')}°C`], ['Avg Storage Humidity', `${avg('humidity')}%`],
                    ['Avg Gas (MQ135)', `${avg('mq135')} ppm`]
                  ];
                }

                doc.autoTable({
                  startY: 45,
                  head: [['Metric', `Average (${timeRange.label})`]],
                  body: bodyData,
                  theme: 'grid', headStyles: { fillStyle: [16, 185, 129] }
                });
                doc.save(`AgriSense_${activeField?.name}_${timeRange.label}_Report.pdf`);
              }}
              title="Generate PDF Report"
              style={{
                height: '34px', padding: '0 12px', borderRadius: '12px',
                background: COLORS.warning, border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                cursor: 'pointer', boxShadow: `0 4px 12px ${COLORS.warning}33`,
                color: 'white', transition: '0.2s', flexShrink: 0,
                fontSize: '0.75rem', fontWeight: 800
              }}
            >
              <FileText size={15} color="white" strokeWidth={2.5} /> PDF
            </button>

            <button
              onClick={() => {
                const today = getDateKey(Date.now());
                const rawData = analyticsSnapshotsByField?.[activeField?.id]?.[today] || [];
                if (!rawData.length) {
                  alert("No data collected for today yet.");
                  return;
                }
                const flattened = rawData.map(entry => ({
                  Timestamp: new Date(entry.timestamp).toLocaleString(),
                  Unix_ms: entry.timestamp,
                  Farm: activeField?.name || 'AgriSense',
                  Crop: activeField?.crop || 'Industrial',
                  Soil_Moisture_Pct: entry.soil?.moisture ?? '',
                  Soil_PH: entry.soil?.ph ?? '',
                  Soil_Temp_C: entry.soil?.temp ?? '',
                  Nitrogen_mg_kg: entry.soil?.npk?.n ?? '',
                  Phosphorus_mg_kg: entry.soil?.npk?.p ?? '',
                  Potassium_mg_kg: entry.soil?.npk?.k ?? '',
                  Ambient_Temp_C: entry.weather?.temp ?? '',
                  Humidity_Pct: entry.weather?.humidity ?? '',
                  Light_LUX: entry.weather?.lightIntensity ?? '',
                  Rain_Level_mm: entry.weather?.rainLevel ?? '',
                  Storage_Temp_C: entry.storage?.temp ?? '',
                  Storage_Humidity_Pct: entry.storage?.humidity ?? '',
                  Gas_MQ135_ppm: entry.storage?.mq135 ?? ''
                }));

                const headers = Object.keys(flattened[0] || {});
                const csvContent = [
                  headers.join(','),
                  ...flattened.map(row => headers.map(h => `"${row[h]}"`).join(','))
                ].join('\n');

                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `AgriSense_${activeField?.name}_Export_${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              title="Export CSV (Excel)"
              style={{
                width: '34px', height: '34px', borderRadius: '12px',
                background: COLORS.good, border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', boxShadow: `0 4px 12px ${COLORS.good}33`,
                color: 'white', transition: '0.2s', flexShrink: 0
              }}
            >
              <Download size={15} color="white" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* ⏱️ TIME RANGE SELECTOR */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', marginBottom: '1.25rem' }} className="no-scrollbar">
          {TIME_RANGES.map(range => {
            const isSelected = timeRange.id === range.id;
            return (
              <button
                key={range.id}
                onClick={() => setTimeRange(range)}
                style={{
                  whiteSpace: 'nowrap', padding: '6px 14px', borderRadius: '100px',
                  border: `1.5px solid ${isSelected ? COLORS.good : '#E2E8F0'}`,
                  background: isSelected ? `${COLORS.good}10` : 'transparent',
                  color: isSelected ? COLORS.good : COLORS.subtext,
                  fontSize: '0.65rem', fontWeight: 900, cursor: 'pointer',
                  transition: '0.2s', outline: 'none'
                }}
              >
                {range.label}
              </button>
            );
          })}
        </div>

        {/* ⏱️ METRICS OVERVIEW */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ padding: '8px 14px', borderRadius: '100px', background: `${COLORS.good}10`, color: COLORS.good, fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Data points in view: {processedData?.[activeTab]?.length || 0} Snaps
          </div>
        </div>

        <div style={{ flex: 1, paddingBottom: '1rem' }}>
          {renderGrid(activeTab)}
        </div>

        <style>{`
        .recharts-tooltip-wrapper {
          transform: none !important;
          top: -95px !important;
          right: 0px !important;
          left: auto !important;
          transition: opacity 0.2s ease-in-out !important;
          pointer-events: none !important;
        }
        .analytics-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      </div>
    );
};

export default AnalyticsHub;
