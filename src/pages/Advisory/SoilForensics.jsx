/**
 * AgriSense Pro v17.1.0 Forensic Diagnostic Engine
 * Native Share Bridge, High-Res Canvas Capture, and Consolidated NPK Ledger.
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, Activity, Droplets, FlaskConical, CheckCircle2, 
  RefreshCw, Undo, Calendar, Clock, Navigation, MapPin, Zap, Download, Atom, Sparkles
} from 'lucide-react';

// Native Bridges
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Geolocation } from '@capacitor/geolocation';

// Context & Utils
import { useApp } from '../../state/AppContext';
import { MASTER_CONFIG } from '../../setup';

// ─── DESIGN TOKENS ─────────────────────────────────────────────────────────
const COLORS = {
  primary: '#10B981',
  primaryDark: '#059669',
  secondary: '#0EA5E9',
  warning: '#F59E0B',
  danger: '#EF4444',
  background: '#F8FAFC',
  cardBg: '#FFFFFF',
  textMain: '#0F172A',
  textMuted: '#64748B',
  border: 'rgba(0, 0, 0, 0.04)',
  terminal: '#1E293B',
  nutrient: { n: '#10B981', p: '#A855F7', k: '#EC4899', ph: '#F59E0B', m: '#0EA5E9' },
  zone: { vLow: '#EF4444', low: '#F97316', mod: '#F59E0B', opt: '#10B981', high: '#064E3B' }
};

const RAD = {
  card: '32px',
  inner: '20px',
  btn: '16px'
};

// ─── MATH UTILS ───────────────────────────────────────────────────────────
const calculateShoelaceArea = (points) => {
  if (points.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    let j = (i + 1) % points.length;
    area += points[i].x * points[j].y; area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
};

const isPointInPolygon = (point, vs) => {
  let x = point.x, y = point.y; let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    let xi = vs[i].x, yi = vs[i].y; let xj = vs[j].x, yj = vs[j].y;
    let intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

const StepIndicator = ({ currentStep }) => (
  <div style={{ background: 'white', padding: '1.25rem', borderBottom: `1px solid ${COLORS.border}`, position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '500px', margin: '0 auto' }}>
      {[1, 2, 3, 4, 5].map(step => (
        <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flex: 1 }}>
          <div style={{ 
            width: '30px', height: '30px', borderRadius: '50%', 
            background: currentStep >= step ? COLORS.primary : COLORS.background, 
            color: currentStep >= step ? 'white' : COLORS.textMuted, 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            fontSize: '0.75rem', fontWeight: 900, transition: '0.3s'
          }}>
            {currentStep > step ? <CheckCircle2 size={16} /> : step}
          </div>
          <span style={{ fontSize: '0.55rem', fontWeight: 800, color: currentStep >= step ? COLORS.textMain : COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {['Map', 'Strategy', 'Collect', 'Zones', 'Report'][step-1]}
          </span>
        </div>
      ))}
    </div>
  </div>
);

const SoilForensics = () => {
  const { sensorData, devices, syncData } = useApp();
  
  const isSoilNodeActive = useMemo(() => {
    const node = devices?.['soil_node'];
    const s = sensorData?.soil;
    return (
      node?.status === 'ACTIVE' && 
      s?.moisture !== null && 
      s?.ph !== null && 
      s?.npk?.n !== null && 
      s?.npk?.p !== null && 
      s?.npk?.k !== null
    );
  }, [devices, sensorData]);


  const [currentStep, setCurrentStep] = useState(1);
  const [boundaryPoints, setBoundaryPoints] = useState([]);
  const [gpsAccuracy, setGpsAccuracy] = useState(5.0);
  const [samples, setSamples] = useState([]);
  const [selectedDensity, setSelectedDensity] = useState('max');
  const [activeSampleIndex, setActiveSampleIndex] = useState(null);
  const [isCollecting, setIsCollecting] = useState(false);
  const [collectProgress, setCollectProgress] = useState(0);
  const [currentReadings, setCurrentReadings] = useState([]);
  const [analysisLayer, setAnalysisLayer] = useState('Moisture');
  const [lockedBBox, setLockedBBox] = useState(null);
  const [zoom] = useState(19); 
  const [mapCenter, setMapCenter] = useState({ lat: MASTER_CONFIG.MAP_LAT || 22.5726, lng: MASTER_CONFIG.MAP_LNG || 88.3639 });
  const [isMapInteractive, setIsMapInteractive] = useState(true);
  const [locationName, setLocationName] = useState('Locating...');

  useEffect(() => {
    let watchId;
    const initLocation = async () => {
      try {
        const permissions = await Geolocation.checkPermissions();
        if (permissions.location !== 'granted') {
          const req = await Geolocation.requestPermissions();
          if (req.location !== 'granted') return;
        }
        
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setMapCenter({ lat, lng });
        setGpsAccuracy(pos.coords.accuracy.toFixed(1));

        // Reverse Geocoding
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
            headers: { 'Accept': 'application/json', 'User-Agent': 'AgriSense/17.1.0 (Contact: admin@agrisense.tech)' }
          });
          if (response.ok) {
            const data = await response.json();
            if (data.address) {
              setLocationName(data.address.neighbourhood || data.address.suburb || data.address.village || data.address.town || data.address.city || data.address.county || data.address.state || "Local Field");
            } else if (data.display_name) {
              setLocationName(data.display_name.split(',')[0]);
            }
          }
        } catch (e) {}

        watchId = await Geolocation.watchPosition({ enableHighAccuracy: true }, (pos, err) => {
          if (pos) {
            setMapCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            setGpsAccuracy(pos.coords.accuracy.toFixed(1));
          }
        });
      } catch (e) {
        console.error("GPS Error:", e);
      }
    };
    initLocation();
    
    return () => {
      if (watchId) Geolocation.clearWatch({ id: watchId });
    };
  }, []);

  const calculateBBox = useCallback(() => {
    if (lockedBBox) return lockedBBox;
    const offset = 0.003 / Math.pow(2, zoom - 15);
    return `${mapCenter.lng - offset},${mapCenter.lat - offset},${mapCenter.lng + offset},${mapCenter.lat + offset}`;
  }, [mapCenter, zoom, lockedBBox]);

  const handleAddPoint = (e) => {
    if (currentStep !== 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setBoundaryPoints([...boundaryPoints, { x, y }]);
  };

  const areaAcre = Math.max(0.01, (calculateShoelaceArea(boundaryPoints) * (15 / Math.pow(2, zoom - 18)) * 0.000247105)).toFixed(2);

  const sampleRequirements = useMemo(() => {
    const acre = parseFloat(areaAcre);
    return { min: Math.max(2, Math.round(acre * 3) + 1), max: Math.max(3, Math.round(acre * 8) + 2) };
  }, [areaAcre]);

  const generateStrategy = (type = 'max') => {
    if (boundaryPoints.length < 3) return;
    setLockedBBox(calculateBBox());
    setSelectedDensity(type);
    const count = type === 'max' ? sampleRequirements.max : sampleRequirements.min;
    const minX = Math.min(...boundaryPoints.map(p => p.x)) + 10; const maxX = Math.max(...boundaryPoints.map(p => p.x)) - 10;
    const minY = Math.min(...boundaryPoints.map(p => p.y)) + 10; const maxY = Math.max(...boundaryPoints.map(p => p.y)) - 10;
    const newSamples = []; let attempts = 0;
    while (newSamples.length < count && attempts < 500) {
      const c = { x: minX + Math.random() * (maxX - minX), y: minY + Math.random() * (maxY - minY) };
      if (isPointInPolygon(c, boundaryPoints)) newSamples.push({ id: newSamples.length + 1, ...c, status: 'pending', readings: null });
      attempts++;
    }
    setSamples(newSamples); if (currentStep === 1) setCurrentStep(2);
  };

  const startCollection = (index) => { setCurrentReadings([]); setCollectProgress(0); setActiveSampleIndex(index); setIsCollecting(true); };

  useEffect(() => {
    let timer;
    if (isCollecting && activeSampleIndex !== null && collectProgress < 100) {
      timer = setTimeout(() => {
        if (!sensorData.soil || sensorData.soil.moisture === null) return;
        const now = new Date();
        const newVal = {
          moisture: sensorData.soil.moisture !== null ? parseFloat(sensorData.soil.moisture).toFixed(1) : null,
          ph: sensorData.soil.ph !== null ? parseFloat(sensorData.soil.ph).toFixed(1) : null,
          n: sensorData.soil.npk?.n !== null ? parseInt(sensorData.soil.npk.n) : null,
          p: sensorData.soil.npk?.p !== null ? parseInt(sensorData.soil.npk.p) : null,
          k: sensorData.soil.npk?.k !== null ? parseInt(sensorData.soil.npk.k) : null,
          date: now.toLocaleDateString(), 
          time: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
          gps: `${mapCenter.lat.toFixed(6)}, ${mapCenter.lng.toFixed(6)}`
        };
        if (newVal.moisture === null || newVal.ph === null || newVal.n === null) return;
        setCurrentReadings(prev => [...prev, newVal]); setCollectProgress(prev => prev + 33.4);

      }, 1500);
    } else if (isCollecting && collectProgress >= 100) {
      const validReadings = currentReadings.filter(r => r.moisture !== null && r.ph !== null && r.n !== null);
      if (validReadings.length === 0) {
        setIsCollecting(false); setActiveSampleIndex(null); setCurrentReadings([]);
        return;
      }
      const finalMean = {
        moisture: (validReadings.reduce((a, b) => a + parseFloat(b.moisture), 0) / validReadings.length).toFixed(1),
        ph: (validReadings.reduce((a, b) => a + parseFloat(b.ph), 0) / validReadings.length).toFixed(1),
        npk: { 
          n: Math.round(validReadings.reduce((a, b) => a + b.n, 0) / validReadings.length), 
          p: Math.round(validReadings.reduce((a, b) => a + b.p, 0) / validReadings.length), 
          k: Math.round(validReadings.reduce((a, b) => a + b.k, 0) / validReadings.length) 
        },
        date: validReadings[0]?.date, time: validReadings[0]?.time, gps: validReadings[0]?.gps
      };

      setSamples(prev => prev.map((s, i) => i === activeSampleIndex ? { ...s, readings: finalMean, status: 'completed' } : s));
      setIsCollecting(false); setActiveSampleIndex(null); setCurrentReadings([]);
    }
    return () => clearTimeout(timer);
  }, [isCollecting, collectProgress, currentReadings, activeSampleIndex, sensorData.soil, mapCenter]);

  const calculateIDWValue = (x, y, type) => {
    if (samples.length === 0) return 0;
    let num = 0, den = 0;
    samples.forEach(s => {
      const dist = Math.sqrt(Math.pow(x - s.x, 2) + Math.pow(y - s.y, 2));
      const w = 1 / (Math.pow(dist, 2) + 0.1);
      const val = type === 'Moisture' ? parseFloat(s.readings?.moisture || 0) : type === 'PH' ? parseFloat(s.readings?.ph || 0) : (s.readings?.npk?.n || 0);
      num += val * w; den += w;
    });
    return num / den;
  };

  const getZoneColor = (val, type) => {
    const t = type === 'Moisture' ? [15, 25, 35, 50] : type === 'PH' ? [5.5, 6.2, 7.3, 8.0] : [30, 50, 75, 100];
    if (val < t[0]) return COLORS.zone.vLow; if (val < t[1]) return COLORS.zone.low; if (val < t[2]) return COLORS.zone.mod; if (val < t[3]) return COLORS.zone.opt; return COLORS.zone.high;
  };

  const healthReport = useMemo(() => {
    if (samples.length === 0 || samples.some(s => s.status !== 'completed')) return null;
    const avg = (k, sub) => {
      const validSamples = samples.filter(s => s.readings);
      if (validSamples.length === 0) return 0;
      const sum = validSamples.reduce((a, b) => a + (sub ? (b.readings[k]?.[sub] || 0) : (parseFloat(b.readings[k]) || 0)), 0);
      return sum / validSamples.length;
    };
    const m = avg('moisture'); const ph = avg('ph'); const n = avg('npk', 'n'); const p = avg('npk', 'p'); const k = avg('npk', 'k');
    const score = Math.max(0, Math.min(100, Math.round(((m/40)*40) + ((1 - Math.abs(ph-6.8)/2)*30) + ((n/60)*30))));
    return { score, moisture: m.toFixed(1), ph: ph.toFixed(1), n: Math.round(n), p: Math.round(p), k: Math.round(k) };
  }, [samples]);

  const handleExportPDF = async () => {
    const reportElement = document.getElementById('soil-report');
    if (!reportElement) return;

    try {
      const canvas = await html2canvas(reportElement, {
        scale: 2, 
        useCORS: true, 
        logging: false,
        backgroundColor: COLORS.background 
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      const pdfBase64 = pdf.output('datauristring').split(',')[1];
      
      const fileName = `Soil_Audit_${Math.floor(Date.now()/1000)}.pdf`;
      const result = await Filesystem.writeFile({
        path: fileName,
        data: pdfBase64,
        directory: Directory.Cache
      });
      
      await Share.share({
        title: 'Forensic Soil Audit',
        text: 'AgriSense Precision Diagnostic Report',
        url: result.uri,
        dialogTitle: 'Export Soil Report'
      });
    } catch (err) {
      console.error('PDF Generation Error:', err);
      alert('PDF Generation Failed. Please ensure maps have loaded.');
    }
  };

  const PrimaryCTA = ({ onClick, children, disabled, icon: Icon }) => (
    <motion.button whileTap={{ scale: 0.97 }} onClick={onClick} disabled={disabled} style={{ width: '100%', height: '58px', borderRadius: RAD.btn, background: COLORS.primary, color: 'white', fontWeight: 950, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: `0 8px 20px ${COLORS.primary}30`, opacity: disabled ? 0.5 : 1 }}>
      {Icon && <Icon size={20} />}{children}
    </motion.button>
  );

  return (
    <div style={{ background: COLORS.background, minHeight: '100%', paddingBottom: '0', fontFamily: "'Outfit', sans-serif" }}>
      <StepIndicator currentStep={currentStep} />
      <div style={{ padding: '1.25rem' }}>
        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <motion.div key="st1" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ position: 'relative' }}>
              {!isSoilNodeActive && (
                <div style={{ 
                  position: 'absolute', inset: '-10px', zIndex: 1000, 
                  background: 'rgba(248, 250, 252, 0.92)', backdropFilter: 'blur(12px)', 
                  borderRadius: RAD.card, display: 'flex', flexDirection: 'column', 
                  alignItems: 'center', justifyContent: 'center', textAlign: 'center', 
                  padding: '2rem', border: `2px dashed ${COLORS.border}`
                }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', boxShadow: '0 10px 20px rgba(239, 68, 68, 0.1)' }}>
                    <Activity size={40} color={COLORS.danger} />
                  </div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 950, color: COLORS.textMain, marginBottom: '0.5rem' }}>No Sensor Active</h2>
                  <p style={{ fontSize: '0.85rem', color: COLORS.textMuted, fontWeight: 700, maxWidth: '280px', lineHeight: 1.6, marginBottom: '2rem' }}>
                    All Soil Node sensors (N, P, K, pH, Moisture) must be active for a forensic audit. Please connect your hardware to proceed.
                  </p>
                  <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '320px' }}>
                    <button onClick={() => window.history.back()} style={{ flex: 1, height: '54px', borderRadius: RAD.btn, border: `1px solid ${COLORS.border}`, background: 'white', color: COLORS.textMain, fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Go Back</button>
                    <button onClick={() => syncData()} style={{ flex: 1, height: '54px', borderRadius: RAD.btn, border: 'none', background: COLORS.primary, color: 'white', fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', boxShadow: `0 8px 20px ${COLORS.primary}30` }}>Retry Sync</button>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 950, color: COLORS.textMain, margin: 0 }}>Field Mapping</h2>
                  <p style={{ fontSize: '0.65rem', fontWeight: 800, color: COLORS.subtext, margin: '2px 0 0 0' }}>{locationName}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ padding: '6px 10px', background: '#ECFDF5', borderRadius: '10px', fontSize: '0.65rem', fontWeight: 900, color: COLORS.primaryDark, border: `1px solid ${COLORS.primary}20` }}>GPS: {gpsAccuracy}m</div>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => setIsMapInteractive(!isMapInteractive)} style={{ padding: '6px 12px', background: isMapInteractive ? COLORS.warning : COLORS.primary, color: 'white', borderRadius: '10px', border: 'none', fontSize: '0.65rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                    {isMapInteractive ? 'LOCK TO DRAW' : 'UNLOCK MAP'}
                  </motion.button>
                </div>
              </div>
              <div onClick={isMapInteractive ? undefined : handleAddPoint} style={{ height: '400px', background: '#E2E8F0', borderRadius: RAD.card, position: 'relative', border: `4px solid ${isMapInteractive ? COLORS.warning : 'white'}`, boxShadow: '0 10px 30px rgba(0,0,0,0.05)', overflow: 'hidden', transition: '0.3s' }}>
                 <iframe width="100%" height="100%" frameBorder="0" src={`https://www.openstreetmap.org/export/embed.html?bbox=${calculateBBox()}&layer=mapnik&marker=${mapCenter.lat},${mapCenter.lng}`} style={{ filter: 'grayscale(0.3)', pointerEvents: isMapInteractive ? 'auto' : 'none' }} />
                 {!isMapInteractive && (
                   <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                     <polygon points={boundaryPoints.map(p => `${p.x},${p.y}`).join(' ')} fill={`${COLORS.primary}15`} stroke={COLORS.primary} strokeWidth="3" strokeDasharray="6 4" />
                     {boundaryPoints.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="8" fill="white" stroke={COLORS.primary} strokeWidth="3" />)}
                   </svg>
                 )}
                 <div style={{ position: 'absolute', bottom: '15px', left: '15px', background: COLORS.terminal, color: 'white', padding: '8px 16px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800 }}>{areaAcre} Acres</div>
              </div>
              <div style={{ marginTop: '1.25rem', display: 'flex', gap: '10px' }}>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setBoundaryPoints(boundaryPoints.slice(0, -1))} style={{ flex: 1, height: '58px', borderRadius: RAD.btn, border: `1px solid ${COLORS.border}`, background: 'white' }}><Undo size={20} color={COLORS.textMain} /></motion.button>
                <div style={{ flex: 3 }}><PrimaryCTA onClick={() => generateStrategy('max')} disabled={boundaryPoints.length < 3}>LOCK BOUNDARY</PrimaryCTA></div>
              </div>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div key="st2" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div style={{ marginBottom: '1.25rem' }}><h2 style={{ fontSize: '1.1rem', fontWeight: 950, color: COLORS.textMain }}>Sampling Strategy</h2></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1.25rem' }}>
                 <motion.div whileTap={{ scale: 0.98 }} onClick={() => generateStrategy('min')} style={{ background: selectedDensity === 'min' ? `${COLORS.primary}10` : 'white', padding: '1.25rem', borderRadius: RAD.inner, border: `2px solid ${selectedDensity === 'min' ? COLORS.primary : COLORS.border}`, textAlign: 'center', transition: '0.3s' }}>
                   <p style={{ fontSize: '0.6rem', fontWeight: 900, color: COLORS.textMuted, textTransform: 'uppercase' }}>CORE MIN</p>
                   <h3 style={{ fontSize: '1.5rem', fontWeight: 950, color: COLORS.textMain, margin: '4px 0' }}>{sampleRequirements.min}</h3>
                 </motion.div>
                 <motion.div whileTap={{ scale: 0.98 }} onClick={() => generateStrategy('max')} style={{ background: selectedDensity === 'max' ? `${COLORS.primary}10` : 'white', padding: '1.25rem', borderRadius: RAD.inner, border: `2px solid ${selectedDensity === 'max' ? COLORS.primary : COLORS.border}`, textAlign: 'center', transition: '0.3s' }}>
                   <p style={{ fontSize: '0.6rem', fontWeight: 900, color: COLORS.textMuted, textTransform: 'uppercase' }}>PRECISION MAX</p>
                   <h3 style={{ fontSize: '1.5rem', fontWeight: 950, color: COLORS.textMain, margin: '4px 0' }}>{sampleRequirements.max}</h3>
                 </motion.div>
              </div>
              <div style={{ height: '320px', background: 'white', borderRadius: RAD.card, border: `1px solid ${COLORS.border}`, position: 'relative', marginBottom: '1.25rem', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
                 <iframe width="100%" height="100%" frameBorder="0" src={`https://www.openstreetmap.org/export/embed.html?bbox=${calculateBBox()}&layer=mapnik`} style={{ filter: 'grayscale(0.4)', pointerEvents: 'none' }} />
                 <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                   <polygon points={boundaryPoints.map(p => `${p.x},${p.y}`).join(' ')} fill={`${COLORS.primary}10`} stroke={COLORS.primary} strokeWidth="3" strokeDasharray="6 4" />
                   {samples.map((s, i) => (<g key={i}><circle cx={s.x} cy={s.y} r="14" fill="white" stroke={COLORS.primary} strokeWidth="2" /><text x={s.x} y={s.y + 4} textAnchor="middle" fontSize="10" fontWeight="900" fill={COLORS.primary}>{s.id}</text></g>))}
                 </svg>
              </div>
              <PrimaryCTA onClick={() => setCurrentStep(3)}>BEGIN COLLECTION</PrimaryCTA>
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div key="st3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 950, color: COLORS.textMain }}>Data Collection</h2>
                <div style={{ background: COLORS.terminal, color: 'white', padding: '6px 12px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 800 }}>{samples.filter(s => s.status === 'completed').length}/{samples.length} SAMPLES</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '1.5rem' }}>
                 {samples.map((s, i) => (
                   <motion.div key={i} whileTap={s.status === 'pending' && !isCollecting ? { scale: 0.98 } : {}} onClick={() => s.status === 'pending' && !isCollecting && startCollection(i)} style={{ background: COLORS.cardBg, padding: '1.25rem', borderRadius: RAD.inner, border: `1px solid ${activeSampleIndex === i ? COLORS.primary : COLORS.border}`, position: 'relative', overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: s.status === 'completed' ? COLORS.primary : COLORS.background, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {s.status === 'completed' ? <CheckCircle2 size={24} color="white" /> : <MapPin size={24} color={COLORS.textMuted} />}
                        </div>
                        <div style={{ flex: 1 }}>
                           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                             <div style={{ fontSize: '1rem', fontWeight: 900, color: COLORS.textMain }}>Sample #{s.id}</div>
                             <div style={{ fontSize: '0.6rem', fontWeight: 900, color: activeSampleIndex === i ? COLORS.primary : COLORS.textMuted, textTransform: 'uppercase' }}>{isCollecting && activeSampleIndex === i ? 'Collecting...' : (s.status === 'completed' ? 'Synced' : 'Pending')}</div>
                           </div>
                           {isCollecting && activeSampleIndex === i ? (
                             <div style={{ marginTop: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: COLORS.primary, fontWeight: 900, marginBottom: '6px' }}><span>LIVE STREAMING...</span><span>{currentReadings.length}/3</span></div>
                                <div style={{ height: '6px', background: COLORS.background, borderRadius: '10px', overflow: 'hidden' }}><motion.div initial={{ width: 0 }} animate={{ width: `${collectProgress}%` }} style={{ height: '100%', background: COLORS.primary }} /></div>
                             </div>
                           ) : s.status === 'completed' ? (
                             <div style={{ marginTop: '10px' }}>
                               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', background: COLORS.background, padding: '10px', borderRadius: '12px', textAlign: 'center', gap: '8px' }}>
                                  <div><p style={{ fontSize: '0.5rem', margin: '0 0 2px 0', color: COLORS.textMuted, fontWeight: 800 }}>MOISTURE</p><p style={{ fontSize: '0.85rem', fontWeight: 950, color: COLORS.textMain }}>{s.readings?.moisture}%</p></div>
                                  <div><p style={{ fontSize: '0.5rem', margin: '0 0 2px 0', color: COLORS.textMuted, fontWeight: 800 }}>pH LEVEL</p><p style={{ fontSize: '0.85rem', fontWeight: 950, color: COLORS.textMain }}>{s.readings?.ph}</p></div>
                                  <div><p style={{ fontSize: '0.5rem', margin: '0 0 2px 0', color: COLORS.textMuted, fontWeight: 800 }}>N:P:K</p><p style={{ fontSize: '0.85rem', fontWeight: 950, color: COLORS.textMain }}>{s.readings?.npk?.n}:{s.readings?.npk?.p}:{s.readings?.npk?.k}</p></div>
                               </div>
                               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.55rem', color: COLORS.textMuted, marginTop: '8px', fontWeight: 700 }}><span>{s.readings?.date} • {s.readings?.time}</span><span>{s.readings?.gps}</span></div>
                             </div>
                           ) : <div style={{ fontSize: '0.75rem', color: COLORS.textMuted, fontWeight: 700, marginTop: '4px' }}>Tap to begin precision sync...</div>}
                        </div>
                      </div>
                   </motion.div>
                 ))}
              </div>
              <PrimaryCTA onClick={() => setCurrentStep(4)} disabled={samples.some(s => s.status === 'pending')}>ANALYZE GIS ZONES</PrimaryCTA>
            </motion.div>
          )}

          {currentStep === 4 && (
            <motion.div key="st4" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 950, color: COLORS.textMain, margin: 0 }}>GIS Mapping</h2>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {['Moisture', 'PH', 'NPK'].map(l => (
                    <motion.button key={l} whileTap={{ scale: 0.95 }} onClick={() => setAnalysisLayer(l)} style={{ padding: '6px 12px', borderRadius: '10px', border: 'none', background: analysisLayer === l ? COLORS.primary : 'white', color: analysisLayer === l ? 'white' : COLORS.textMuted, fontSize: '0.6rem', fontWeight: 900, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>{l.toUpperCase()}</motion.button>
                  ))}
                </div>
              </div>
              <div style={{ height: '400px', background: 'white', borderRadius: RAD.card, border: `1px solid ${COLORS.border}`, position: 'relative', marginBottom: '1.5rem', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                <iframe width="100%" height="100%" frameBorder="0" src={`https://www.openstreetmap.org/export/embed.html?bbox=${calculateBBox()}&layer=mapnik`} style={{ filter: 'grayscale(0.6)', pointerEvents: 'none' }} />
                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                  <defs><clipPath id="fClp_final_z"><polygon points={boundaryPoints.map(p => `${p.x},${p.y}`).join(' ')} /></clipPath></defs>
                  <g clipPath="url(#fClp_final_z)">
                    {Array.from({length: 400}).map((_, i) => { 
                      const x = (i % 20) * 20, y = Math.floor(i / 20) * 22, val = calculateIDWValue(x, y, analysisLayer); 
                      return <rect key={i} x={x} y={y} width="20" height="22" fill={getZoneColor(val, analysisLayer)} fillOpacity="0.75" />; 
                    })}
                  </g>
                  <polygon points={boundaryPoints.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="white" strokeWidth="2" strokeDasharray="4 2" />
                </svg>
              </div>
              <PrimaryCTA onClick={() => setCurrentStep(5)}>GENERATE REPORT</PrimaryCTA>
            </motion.div>
          )}

          {currentStep === 5 && healthReport && (
            <motion.div key="st5" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} id="soil-report">
               <header style={{ textAlign: 'center', marginBottom: '1.5rem', paddingTop: '10px' }}>
                  <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: `${COLORS.primary}10`, margin: '0 auto 0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `4px solid ${COLORS.primary}`, boxShadow: `0 0 30px ${COLORS.primary}20` }}>
                    <h2 style={{ fontSize: '2.4rem', fontWeight: 950, color: COLORS.primaryDark, margin: 0 }}>{healthReport.score}<small style={{ fontSize: '0.4em' }}>%</small></h2>
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 950, color: COLORS.textMain, margin: '0 0 10px 0', letterSpacing: '-0.02em' }}>Soil Health Index</h3>
                  <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '12px', color: COLORS.textMuted, fontSize: '0.65rem', fontWeight: 800, padding: '0 10px' }}>
                     <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Target size={12} color={COLORS.primary} /> {areaAcre} Acres</span>
                     <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={12} color={COLORS.primary} /> {new Date().toLocaleDateString()}</span>
                     <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} color={COLORS.primary} /> {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
               </header>

               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '1.5rem' }}>
                  {[
                    { label: 'Moisture', val: `${healthReport.moisture}%`, icon: Droplets, color: COLORS.nutrient.m },
                    { label: 'Soil pH', val: healthReport.ph, icon: FlaskConical, color: COLORS.nutrient.ph },
                    { label: 'Samples', val: samples.length, icon: MapPin, color: COLORS.textMuted },
                    { label: 'Nitrogen', val: healthReport.n, icon: Zap, color: COLORS.nutrient.n },
                    { label: 'Phosphorus', val: healthReport.p, icon: Atom, color: COLORS.nutrient.p },
                    { label: 'Potassium', val: healthReport.k, icon: Sparkles, color: COLORS.nutrient.k }
                  ].map((it, i) => (
                    <div key={i} style={{ background: COLORS.cardBg, padding: '1rem', borderRadius: '22px', border: `1px solid ${COLORS.border}`, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                      <it.icon size={16} color={it.color} style={{ marginBottom: '6px' }} />
                      <p style={{ fontSize: '0.5rem', fontWeight: 900, color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: '2px' }}>{it.label}</p>
                      <h4 style={{ fontSize: '1rem', fontWeight: 950, color: COLORS.textMain, margin: 0 }}>{it.val}</h4>
                    </div>
                  ))}
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1.5rem' }}>
                  <div style={{ height: '240px', background: 'white', borderRadius: RAD.inner, border: `2px solid ${COLORS.border}`, overflow: 'hidden', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10, background: 'white', padding: '4px 10px', borderRadius: '8px', fontSize: '0.55rem', fontWeight: 950, border: `1px solid ${COLORS.border}`, boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>DEPLOYMENT</div>
                    <iframe width="100%" height="100%" frameBorder="0" src={`https://www.openstreetmap.org/export/embed.html?bbox=${calculateBBox()}&layer=mapnik`} style={{ filter: 'grayscale(1) brightness(1.05)' }} />
                    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}><polygon points={boundaryPoints.map(p => `${p.x/1.1},${p.y/1.1}`).join(' ')} fill="none" stroke="#000" strokeWidth="2" />{samples.map((s, i) => <circle key={i} cx={s.x/1.1} cy={s.y/1.1} r="4" fill="#000" />)}</svg>
                  </div>
                  <div style={{ height: '240px', background: 'white', borderRadius: RAD.inner, border: `2px solid ${COLORS.border}`, overflow: 'hidden', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10, background: 'white', padding: '4px 10px', borderRadius: '8px', fontSize: '0.55rem', fontWeight: 950, border: `1px solid ${COLORS.border}`, boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>HEATMAP</div>
                    <svg style={{ width: '100%', height: '100%' }}><clipPath id="rClp_rep_final"><polygon points={boundaryPoints.map(p => `${p.x},${p.y}`).join(' ')} /></clipPath><g clipPath="url(#rClp_rep_final)">{Array.from({length: 400}).map((_, i) => { const x = (i % 20) * 20, y = Math.floor(i / 20) * 22, val = calculateIDWValue(x*2, y*2, 'Moisture'); return <rect key={i} x={x} y={y} width="20" height="22" fill={getZoneColor(val, 'Moisture')} fillOpacity="0.85" />; })}</g><polygon points={boundaryPoints.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#000" strokeWidth="2" /></svg>
                  </div>
               </div>

               <div style={{ background: COLORS.cardBg, borderRadius: RAD.inner, border: `1px solid ${COLORS.border}`, padding: '1.25rem', marginBottom: '1.5rem', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.65rem', color: COLORS.textMain }}>
                      <thead>
                        <tr style={{ textAlign: 'left', borderBottom: `2px solid ${COLORS.background}`, color: COLORS.textMuted }}>
                          <th style={{ padding: '10px' }}>ID</th>
                          <th style={{ padding: '10px' }}>TIMESTAMP</th>
                          <th style={{ padding: '10px' }}>GPS ANCHOR</th>
                          <th style={{ padding: '10px' }}>MOIST</th>
                          <th style={{ padding: '10px' }}>pH</th>
                          <th style={{ padding: '10px' }}>N:P:K</th>
                        </tr>
                      </thead>
                      <tbody>
                        {samples.map((s, i) => (
                          <tr key={i} style={{ borderBottom: `1px solid ${COLORS.background}` }}>
                            <td style={{ padding: '10px', fontWeight: 800 }}>#{s.id}</td>
                            <td style={{ padding: '10px', fontWeight: 500 }}>{s.readings?.date}<br/>{s.readings?.time}</td>
                            <td style={{ padding: '10px', fontWeight: 500 }}>{s.readings?.gps}</td>
                            <td style={{ padding: '10px', fontWeight: 900 }}>{s.readings?.moisture}%</td>
                            <td style={{ padding: '10px', fontWeight: 900 }}>{s.readings?.ph}</td>
                            <td style={{ padding: '10px', fontWeight: 900 }}>{s.readings?.npk?.n ?? 0}:{s.readings?.npk?.p ?? 0}:{s.readings?.npk?.k ?? 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
               </div>
               <div style={{ display: 'flex', gap: '10px' }}>
                 <motion.button whileTap={{ scale: 0.95 }} onClick={() => setCurrentStep(1)} style={{ flex: 1, height: '60px', borderRadius: RAD.btn, border: `2px solid ${COLORS.border}`, background: 'white', fontWeight: 950, color: COLORS.textMain }}>NEW AUDIT</motion.button>
                 <div style={{ flex: 2 }}><PrimaryCTA onClick={handleExportPDF} icon={Download}>EXPORT PDF REPORT</PrimaryCTA></div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SoilForensics;
