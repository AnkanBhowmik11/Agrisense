/**
 * Farm Advisor v17.1.0 - Industrial Agronomy Decision Suite
 * Comprehensive Overhaul: Integrating Match, Fertilizer, Compost, and Pest Engines.
 * 
 * Aesthetics: Industrial Premium, Consistent Padding/Margins, Framer Motion.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import {
  MapPin, Zap, Calculator, RefreshCw, Activity, Target, Plus, Minus,
  Bug, ShieldCheck, Leaf, Sprout, Globe, AlertCircle, CheckCircle2,
  XCircle, Waves, Clock, FlaskConical, BarChart3, CloudRain, Thermometer,
  ChevronDown, TrendingUp, Droplets, Search, X, ChevronRight, Scale, Microscope,
  Sparkles, Info, TrendingDown, Apple, Flower, Wheat, Citrus, Grape, Carrot, Nut, Banana, AlertTriangle,
  Coffee, Brain, Cloud, Trees, TreePine, TreeDeciduous, Shrub, Clover, Shell, Milk, Sun, Cherry, Bean,
  Lightbulb, CalendarDays, Layers
} from 'lucide-react';
import { useApp } from '../../state/AppContext';

// ─── ASSET IMPORTS ──────────────────────────────────────────────────────────
import cropCsv from '../../data/geo/CropSuitabilityData_Final.csv?url';
import { CROP_SPECS, METADATA, ALIASES } from '../../data/core/CropDatabase';
import { 
  MONTHS, isAvailable, isAvailableLoc, getCropIcon, getDemandIcon, 
  getDemandColor, formatCropName, parseCSV, aggregateCropProfiles,
  detectSoilType, getPHLabel, getMoistureLabel, getFertilityLabel,
  getLocationClimate, isClimateCompatible
} from '../../data/core/AgronomyUtils';

// ─── DESIGN TOKENS ─────────────────────────────────────────────────────────
const COLORS = {
  primary: '#10B981',
  primaryDark: '#059669',
  secondary: '#0EA5E9',
  danger: '#EF4444',
  warning: '#F59E0B',
  background: '#F8FAFC',
  cardBg: '#FFFFFF',
  textMain: '#0F172A',
  textMuted: '#64748B',
  border: 'rgba(0, 0, 0, 0.04)',
};

const RAD = {
  card: '24px',
  inner: '18px',
  btn: '14px'
};

const getCropSpec = (name) => {
  if (!name || typeof name !== 'string') return { label: 'unknown' };
  const normalized = name.toLowerCase().trim();
  const target = ALIASES[normalized] || normalized;
  return { ...(CROP_SPECS[target] || {}), label: target };
};

// ─── BOTTOM SHEET COMPONENT ─────────────────────────────────────────────────

const CropBottomSheet = ({ isOpen, onClose, crops, onSelect, selectedCrop }) => {
  const [search, setSearch] = useState('');
  const filtered = (crops || []).filter(c => c.toLowerCase().includes(search.toLowerCase())).sort();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, backdropFilter: 'blur(4px)' }}
          />
          <motion.div 
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{ 
              position: 'fixed', bottom: 0, left: 0, right: 0, 
              background: '#FFFFFF', borderTopLeftRadius: '32px', borderTopRightRadius: '32px',
              zIndex: 1001, maxHeight: '85vh', display: 'flex', flexDirection: 'column',
              padding: '1.5rem', boxShadow: '0 -10px 40px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{ width: '40px', height: '4px', background: '#E2E8F0', borderRadius: '2px', alignSelf: 'center', marginBottom: '1.5rem' }} />
            
            <div style={{ position: 'sticky', top: 0, background: 'white', zIndex: 2, paddingBottom: '1rem' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={18} color="#94A3B8" style={{ position: 'absolute', left: '16px' }} />
                <input 
                  autoFocus
                  placeholder="Search 86 Industrial Crops..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ 
                    width: '100%', padding: '14px 14px 14px 48px', borderRadius: '16px',
                    border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none',
                    fontSize: '1rem', fontWeight: 600, color: '#0F172A'
                  }}
                />
                {search && <X size={18} color="#94A3B8" style={{ position: 'absolute', right: '16px' }} onClick={() => setSearch('')} />}
              </div>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, paddingBottom: '2rem' }} className="no-scrollbar">
              {filtered.map(c => {
                const isSel = c === selectedCrop;
                const spec = getCropSpec(c);
                const { icon: CropIcon, color: cropColor } = getCropIcon(spec.type, c);
                
                return (
                  <motion.div 
                    key={c}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { onSelect(c); onClose(); }}
                    style={{ 
                      padding: '16px', borderRadius: '16px', marginBottom: '8px',
                      background: isSel ? `${cropColor}10` : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      border: isSel ? `1px solid ${cropColor}30` : '1px solid transparent'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ 
                        width: '48px', height: '48px', borderRadius: '12px', 
                        background: isSel ? '#FFFFFF' : `${cropColor}15`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <CropIcon size={24} color={cropColor} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '1rem', fontWeight: isSel ? 800 : 600, color: isSel ? '#0F172A' : '#1E293B' }}>{formatCropName(spec.label || c)}</span>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{spec.type || 'Crop'}</span>
                      </div>
                    </div>
                    {isSel && <CheckCircle2 size={20} color={cropColor} />}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

const FarmAdvisor = () => {
  const { sensorData, user } = useApp();
  const [selectedCrop, setSelectedCrop] = useState('rice');
  const [db, setDb] = useState({ crops: null, loading: true, error: false });
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('sensor'); // 'sensor' or 'suitability'

  // Guard against missing context or sensors
  if (!sensorData) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: COLORS.background }}><RefreshCw className="animate-spin" color={COLORS.primary} /></div>;


  const allCropsList = useMemo(() => {
    // Source of truth: CROP_SPECS (Industrial database)
    // We only show crops that we have verified data for.
    const specLabels = Object.keys(CROP_SPECS);
    
    // Also include crops from CSV IF they are in CROP_SPECS or are ALIASES of something in CROP_SPECS
    const csvLabels = Object.keys(db?.crops || {});
    const combined = [...new Set([...specLabels, ...csvLabels])];

    const finalUnique = new Set();
    combined.forEach(raw => {
      const label = raw.toLowerCase().trim();
      const target = ALIASES[label] || label;
      
      // ONLY add if it exists in our industrial database
      if (CROP_SPECS[target]) {
        finalUnique.add(target);
      }
    });

    return [...finalUnique].sort();
  }, [db.crops]);

  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 80], [1, 0.98]);

  useEffect(() => {
    fetch(cropCsv)
      .then(r => r.text())
      .then(cropTxt => {
        try {
          const crops = aggregateCropProfiles(parseCSV(cropTxt));
          setDb({ crops, loading: false, error: false });
        } catch (e) {
          console.error("DB Parse Error", e);
          setDb({ crops: {}, loading: false, error: true });
        }
      })
      .catch(err => {
        console.error("Fetch Error", err);
        setDb({ crops: {}, loading: false, error: true });
      });
  }, []);

  const brain = useMemo(() => {
    if (db.loading || !db?.crops || !sensorData) return null;
    const spec = getCropSpec(selectedCrop);
    const p = db?.crops?.[selectedCrop] || {};
    
    // Deep fallback logic: Use CSV data if available, otherwise inherit from Spec standards
    const profile = {
      n: p.n || { mid: ((spec.n?.[0] || 0) + (spec.n?.[1] || 100)) / 2, min: spec.n?.[0] || 0, max: spec.n?.[1] || 100, range: (spec.n?.[1] || 100) - (spec.n?.[0] || 0) || 1 },
      p: p.p || { mid: ((spec.p?.[0] || 0) + (spec.p?.[1] || 100)) / 2, min: spec.p?.[0] || 0, max: spec.p?.[1] || 100, range: (spec.p?.[1] || 100) - (spec.p?.[0] || 0) || 1 },
      k: p.k || { mid: ((spec.k?.[0] || 0) + (spec.k?.[1] || 100)) / 2, min: spec.k?.[0] || 0, max: spec.k?.[1] || 100, range: (spec.k?.[1] || 100) - (spec.k?.[0] || 0) || 1 },
      ph: p.ph || { mid: ((spec.ph?.[0] || 5.5) + (spec.ph?.[1] || 7.5)) / 2, min: spec.ph?.[0] || 5.5, max: spec.ph?.[1] || 7.5, range: (spec.ph?.[1] || 7.5) - (spec.ph?.[0] || 5.5) || 1 },
      temperature: p.temperature || { mid: ((spec.temp?.[0] || 15) + (spec.temp?.[1] || 35)) / 2, min: spec.temp?.[0] || 15, max: spec.temp?.[1] || 35, range: (spec.temp?.[1] || 35) - (spec.temp?.[0] || 15) || 1 },
      humidity: p.humidity || { mid: ((spec.hum?.[0] || 40) + (spec.hum?.[1] || 80)) / 2, min: spec.hum?.[0] || 40, max: spec.hum?.[1] || 80, range: (spec.hum?.[1] || 80) - (spec.hum?.[0] || 40) || 1 },
      rainfall: p.rainfall || { mid: ((spec.rain?.[0] || 500) + (spec.rain?.[1] || 1500)) / 2, min: spec.rain?.[0] || 500, max: spec.rain?.[1] || 1500, range: (spec.rain?.[1] || 1500) - (spec.rain?.[0] || 500) || 1 },
      moisture: p.moisture || { mid: 40, min: 10, max: 70, range: 60 },
      season: p.season, soil: p.soil, loc: p.loc, sow: p.sow,
      fert: p.fert, comp: p.comp, pest: p.pest
    };
    
    const metaSource = METADATA[spec.label || selectedCrop] || {};

    const meta = {
      type: spec.type || '---',
      season: metaSource.season || profile.season || '---',
      seasonInsight: metaSource.seasonInsight || '---',
      soil: metaSource.soil || profile.soil || '---',
      soilInsight: metaSource.soilInsight || '---',
      weather: profile.weather || '---',
      sow: metaSource.sow || profile.sow || '---',
      sowInsight: metaSource.sowInsight || '---',
      harvest: metaSource.harvest || '---',
      harvestInsight: metaSource.harvestInsight || '---',
      loc: metaSource.loc || profile.loc || '---',
      locInsight: metaSource.locInsight || '---',
      habitat: metaSource.habitat || '---',
      habitatInsight: metaSource.habitatInsight || '---',
      climate: metaSource.climate || '---',
      climateInsight: metaSource.climateInsight || '---',
      behavior: metaSource.behavior || '---',
      behaviorInsight: metaSource.behaviorInsight || '---',
      adaptability: metaSource.adaptability || '---',
      adaptabilityInsight: metaSource.adaptabilityInsight || '---',
      insight: metaSource.insight || '---',
      insightDetail: metaSource.insightDetail || '---',
      fert: metaSource.fert || profile.fert || '---',
      comp: metaSource.comp || profile.comp || '---',
      pest: metaSource.pest || profile.pest || '---',
      // Dynamic Dose Calculation based on NPK requirements
      bU: spec.n ? (spec.n[1] / 0.46) : 0, 
      bS: spec.p ? (spec.p[1] / 0.16) : 0, 
      bM: spec.k ? (spec.k[1] / 0.60) : 0, 
      bC: 0
    };

    const month = MONTHS[new Date().getMonth()] || "Jan";
    const season = ['Jun','Jul','Aug','Sep','Oct'].includes(month) ? 'Kharif' : (['Nov','Dec','Jan','Feb'].includes(month) ? 'Rabi' : 'Zaid');

    const cur = {
      npk: sensorData?.soil?.npk,
      ph: sensorData?.soil?.ph, moisture: sensorData?.soil?.moisture,
      temp: sensorData?.weather?.temp, hum: sensorData?.weather?.humidity, rain: sensorData?.weather?.rainLevel,
      season, 
      soil: detectSoilType(sensorData?.soil?.ph, sensorData?.soil?.moisture, sensorData?.soil?.npk?.n, sensorData?.soil?.npk?.p, sensorData?.soil?.npk?.k), 
      weather: sensorData?.weather?.condition || 'Clear', 
      month
    };

    // ─── 📊 SMART MATCH ENGINE ───
    const sensors = [
      { id: 'Nitrogen', val: cur.npk?.n, range: spec.n, unit: 'kg/ha', rec: 'Fertilize', icon: Zap, color: '#F59E0B', desc: getFertilityLabel(cur.npk?.n, cur.npk?.p, cur.npk?.k) },
      { id: 'Phosphorus', val: cur.npk?.p, range: spec.p, unit: 'kg/ha', rec: 'Fertilize', icon: Target, color: '#3B82F6', desc: getFertilityLabel(cur.npk?.n, cur.npk?.p, cur.npk?.k) },
      { id: 'Potassium', val: cur.npk?.k, range: spec.k, unit: 'kg/ha', rec: 'Fertilize', icon: Activity, color: '#8B5CF6', desc: getFertilityLabel(cur.npk?.n, cur.npk?.p, cur.npk?.k) },
      { id: 'Soil pH', val: cur.ph, range: spec.ph, unit: 'pH', rec: 'Treat Soil', icon: FlaskConical, color: '#EC4899', desc: getPHLabel(cur.ph) },
      { id: 'Moisture', val: cur.moisture, range: db?.crops?.[selectedCrop] ? profile.moisture : { min: spec.moisture?.[0] || 10, max: spec.moisture?.[1] || 80 }, unit: '%', rec: 'Irrigate', icon: Droplets, color: '#0EA5E9', desc: getMoistureLabel(cur.moisture) },
      { id: 'Temperature', val: cur.temp, range: spec.temp, unit: '°C', rec: 'Cooling', icon: Thermometer, color: '#F43F5E', desc: isAvailableLoc(cur.temp) ? (cur.temp > 30 ? 'Hot' : 'Cool') : '---' },
      { id: 'Rainfall', val: cur.rain, range: db?.crops?.[selectedCrop] ? profile.rainfall : { min: spec.rain?.[0] || 0, max: spec.rain?.[1] || 2000 }, unit: 'mm', rec: 'Weather', icon: CloudRain, color: '#6366F1', desc: isAvailableLoc(cur.rain) ? (cur.rain > 50 ? 'Heavy' : 'Light') : '---' }
    ].map(s => {
      const active = isAvailable(s.val);
      let status = 'Missing', type = 'missing', action = '---', isHigh = false;
      
      // Range can be [min, max] or { min, max }
      const rMin = Array.isArray(s.range) ? s.range[0] : s.range?.min;
      const rMax = Array.isArray(s.range) ? s.range[1] : s.range?.max;

      if (active && typeof rMin !== 'undefined' && rMin !== null) {
        const val = parseFloat(s.val);
        if (isNaN(val)) {
          status = 'Missing'; type = 'missing';
        } else if (val < rMin) { 
          status = '🔻 Below Range'; type = 'bad'; action = s.rec; 
        } else if (val > rMax) { 
          status = '🔺 Above Range'; type = 'bad'; action = 'Drain'; isHigh = true;
        } else { 
          status = '✅ Optimal'; type = 'good'; action = 'None'; 
        }
      }
      return { ...s, status, type, action, rMin, rMax, isHigh };
    });

    const matchTable = [
      { f: 'Season', ideal: meta.season, cur: cur.season, isMatch: String(meta.season).toLowerCase().includes(String(cur.season).toLowerCase()), icon: Clock, color: '#F59E0B' },
      { f: 'Soil Type', ideal: meta.soil, cur: cur.soil, isMatch: cur.soil !== 'Missing' && String(meta.soil).toLowerCase().includes(String(cur.soil).toLowerCase()), icon: Globe, color: '#10B981' },
      { 
        f: 'Location', 
        ideal: meta.loc, 
        cur: getLocationClimate(user?.location || 'WB, IN'), 
        isMatch: isClimateCompatible(meta.loc, getLocationClimate(user?.location || 'WB, IN')),
        icon: MapPin, color: '#0EA5E9' 
      },
      { f: 'Sowing Time', ideal: meta.sow, cur: cur.month, icon: Activity, color: '#EF4444' }
    ].map(row => {
      let status = '❌ Not Suitable', type = 'bad';
      if (row.f === 'Soil Type' && row.cur === 'Missing') { status = '⚠ Missing'; type = 'warning'; }
      else if (row.f === 'Sowing Time') {
        const [sS, sE] = (String(row.ideal || 'Jan-Dec')).split('-');
        const sIdx = MONTHS.indexOf(sS), eIdx = MONTHS.indexOf(sE), cIdx = MONTHS.indexOf(cur.month);
        if (row.ideal === 'Year-round' || row.ideal === 'Any' || (cIdx >= sIdx && cIdx <= eIdx)) { status = '✅ Suitable'; type = 'good'; }
        else if (sIdx !== -1 && eIdx !== -1 && Math.min(Math.abs(cIdx - sIdx), Math.abs(cIdx - eIdx)) <= 1) { status = '⚠ Adjustment'; type = 'warning'; }
      } else if (row.isMatch) { status = '✅ Suitable'; type = 'good'; }
      return { ...row, status, type, cur: isAvailableLoc(row.cur) && row.cur !== 'Missing' ? row.cur : '---' };
    });

    const suitabilityTable = [
      { id: 'Season Type', icon: Clock, color: '#F59E0B', ideal: meta.season || '---', decision: meta.seasonInsight || '---', match: matchTable.find(m => m.f === 'Season') },
      { id: 'Sowing Window', icon: CalendarDays, color: '#10B981', ideal: meta.sow || '---', decision: meta.sowInsight || '---', match: matchTable.find(m => m.f === 'Sowing Time') },
      { id: 'Harvest Window', icon: Wheat, color: '#FCD34D', ideal: meta.harvest || '---', decision: meta.harvestInsight || '---' },
      { id: 'Primary Regions', icon: Globe, color: '#3B82F6', ideal: meta.loc || '---', decision: meta.locInsight || '---', match: matchTable.find(m => m.f === 'Location') },
      { id: 'Habitat Type', icon: Trees, color: '#059669', ideal: meta.habitat || '---', decision: meta.habitatInsight || '---' },
      { id: 'Climate Profile', icon: CloudRain, color: '#0EA5E9', ideal: meta.climate || '---', decision: meta.climateInsight || '---' },
      { id: 'Soil Type', icon: Layers, color: '#8B5CF6', ideal: meta.soil || '---', decision: meta.soilInsight || '---', match: matchTable.find(m => m.f === 'Soil Type') },
      { id: 'Crop Behavior', label: 'Crop Behave', icon: Activity, color: '#EC4899', ideal: meta.behavior || '---', decision: meta.behaviorInsight || '---' },
      { id: 'Adaptability', label: 'Adapt', icon: BarChart3, color: '#6366F1', ideal: meta.adaptability || '---', decision: meta.adaptabilityInsight || '---' },
      { id: 'Key Insight', icon: Lightbulb, color: '#F59E0B', ideal: meta.insight || '---', decision: meta.insightDetail || '---' }
    ].map(row => ({
      ...row,
      status: row.match?.status || '✅ Industrial Info',
      type: row.match?.type || 'good'
    }));

    // ─── 🧪 FERTILIZER ENGINE ───────────────────────────────────────────────
    const canFertilize = isAvailableLoc(cur.npk?.n) && isAvailableLoc(cur.npk?.p) && isAvailableLoc(cur.npk?.k);
    const defN = canFertilize ? Math.max(0, (profile.n?.mid || 0) - parseFloat(cur.npk?.n || 0)) : 0;
    const defP = canFertilize ? Math.max(0, (profile.p?.mid || 0) - parseFloat(cur.npk?.p || 0)) : 0;
    const defK = canFertilize ? Math.max(0, (profile.k?.mid || 0) - parseFloat(cur.npk?.k || 0)) : 0;
    
    const fertEntry = profile.fert && typeof profile.fert === 'object' ? profile.fert : null;
    let urea = canFertilize ? (defN / 0.46) + (meta.bU * 0.3) : 0;
    let ssp = canFertilize ? (defP / 0.16) + (meta.bS * 0.3) : 0;
    let mop = canFertilize ? (defK / 0.60) + (meta.bM * 0.3) : 0;
    
    const fertReasons = [];
    if (canFertilize) {
      if (parseFloat(cur.temp) > (profile.temperature?.max || 35)) { urea *= 0.9; fertReasons.push("High heat reduction"); }
      if (parseFloat(cur.moisture) < (profile.moisture?.min || 20)) { urea *= 1.1; fertReasons.push("Low moisture adjustment"); }
    }
    const fertReason = canFertilize ? (fertReasons.length > 0 ? fertReasons.join(" • ") : (fertEntry?.weather || "Standard biological dose")) : "OFFLINE - CONNECT NPK SENSORS";

    // ─── 🍃 COMPOST ENGINE ──────────────────────────────────────────────────
    const canCompost = isAvailableLoc(cur.moisture) && isAvailableLoc(cur.ph);
    let compost = canCompost ? meta.bC : 0;
    const cReasons = [];
    if (canCompost) {
      if (parseFloat(cur.moisture) < (profile.moisture?.min || 20)) { compost += 2; cReasons.push("Low moisture"); }
      if (String(meta.soil).includes("Sandy")) { compost += 2; cReasons.push("Sandy soil"); }
      if (isAvailableLoc(cur.npk?.n) && parseFloat(cur.npk?.n) < (profile.n?.min || 50)) { compost += 1; cReasons.push("N-Deficiency"); }
    }
    const compostReason = canCompost ? (cReasons.length > 0 ? cReasons.join(" + ") : (fertEntry?.soil || "Ideal field balance")) : "OFFLINE - CONNECT SOIL SENSORS";

    // ─── 🛡️ PEST ENGINE (OFFLINE AWARE) ──────────────────────────────────────
    const canAnalyzePest = isAvailableLoc(cur.temp) || isAvailableLoc(cur.hum) || isAvailableLoc(cur.moisture);
    const checkActiveTrigger = (trigger, val, type) => {
      if (!trigger || trigger === '---') return false;
      const t = trigger.toLowerCase();
      const v = parseFloat(val);
      if (isNaN(v)) return false;
      if (type === 'temp') {
        if (t.includes('warm') && v > 26) return true;
        if (t.includes('hot') && v > 32) return true;
        if (t.includes('cool') && v < 22) return true;
      }
      if (type === 'hum') {
        if (t.includes('humid') && v > 75) return true;
        if (t.includes('dry') && v < 40) return true;
      }
      if (type === 'moist') {
        if ((t.includes('wet') || t.includes('high')) && v > 70) return true;
        if (t.includes('dry') && v < 30) return true;
      }
      return false;
    };

    const pestEntry = meta.pest && typeof meta.pest === 'object' ? meta.pest : (profile.pest && typeof profile.pest === 'object' ? profile.pest : null);
    const isThreatActive = canAnalyzePest && pestEntry && (
      checkActiveTrigger(pestEntry.weather, cur.temp, 'temp') || 
      checkActiveTrigger(pestEntry.weather, cur.hum, 'hum') || 
      checkActiveTrigger(pestEntry.water, cur.moisture, 'moist')
    );

    const detectedPests = !canAnalyzePest ? [{ 
      n: 'Sensor Offline', 
      s: 'OFFLINE', 
      isActive: false, 
      intel: 'Connect sensors for threat analysis', 
      action: 'OFFLINE' 
    }] : (pestEntry ? [{
      n: pestEntry.most || (pestEntry.all && typeof pestEntry.all === 'string' ? pestEntry.all.split(',')[0] : 'Standard Pest'),
      s: isThreatActive ? 'ACTIVE THREAT' : 'POTENTIAL',
      isActive: isThreatActive,
      intel: `${pestEntry.weather || 'Warm weather'} + ${pestEntry.water || 'High water'} → Risk (${pestEntry.trigger || 'All Stages'})`,
      action: isThreatActive ? "Take action within 24–48 hrs" : "Monitor field for early signs"
    }] : [{ 
      n: 'Standard Control', 
      s: 'PREVENTATIVE', 
      isActive: false, 
      intel: 'Industrial schedule preventative care', 
      action: 'Routine Schedule' 
    }]);

    // ─── 🎯 REAL-WORLD CONFIDENCE ALGORITHM ───
    // Confidence is calculated based on how close the live field data is to the EXACT mathematical center of the crop's ideal range.
    const calcMeanDistPct = (s) => {
      if (s.type === 'missing' || !isAvailableLoc(s.val)) return 0;
      const val = parseFloat(s.val);
      const range = Math.max(1, s.rMax - s.rMin);
      const mid = (s.rMin + s.rMax) / 2;
      // Distance from exact optimal center (0 is perfect)
      const distFromCenter = Math.abs(val - mid);
      const maxAllowedDist = range / 2;
      // 100% means exactly in the middle of the ideal range.
      return Math.max(0, 100 - ((distFromCenter / maxAllowedDist) * 100));
    };
    
    const activeSensorsCount = sensors.filter(s => s.type !== 'missing' && isAvailableLoc(s.val)).length;
    const completenessFactor = sensors.length > 0 ? (activeSensorsCount / sensors.length) : 0;
    
    const rawConfidence = activeSensorsCount > 0 
      ? sensors.reduce((acc, s) => acc + calcMeanDistPct(s), 0) / activeSensorsCount 
      : 0;
    
    // Final Confidence: 70% based on exact precision of data, 30% based on how many sensors are online.
    const confidence = Math.round((rawConfidence * 0.7) + ((completenessFactor * 100) * 0.3));

    // ─── 📊 WEIGHTED INTELLIGENCE & EXPLAINABILITY ENGINE ───
    const calcMatchPct = (s) => {
      if (s.type === 'missing' || !isAvailableLoc(s.val)) return 0;
      const val = parseFloat(s.val);
      const { rMin, rMax } = s;
      const mid = (rMin + rMax) / 2;
      const maxAllowedDist = Math.max(1, (rMax - rMin) / 2);
      const distFromCenter = Math.abs(val - mid);
      
      if (val < rMin || val > rMax) {
        // Outside optimal boundary: Heavy decay based on severity of variance
        const outDist = val < rMin ? (rMin - val) : (val - rMax);
        return Math.max(15, Math.round(50 - ((outDist / maxAllowedDist) * 40)));
      }
      
      // Inside boundary: Precision scale (70% at the edge, 100% at absolute perfect center)
      const pctInside = 100 - ((distFromCenter / maxAllowedDist) * 30);
      return Math.round(pctInside);
    };

    const categories = [
      {
        id: 'soil',
        name: 'Soil Health',
        icon: Leaf,
        params: [
          { n: 'Nitrogen (N)', s: sensors[0], weight: 0.25, impact: 'Critical', why: (p) => p < 50 ? 'Low N inhibits vegetative growth.' : 'Optimal N for chlorophyll production.' },
          { n: 'Phosphorus (P)', s: sensors[1], weight: 0.20, impact: 'Critical', why: (p) => p < 50 ? 'Weak roots due to low Phosphorus.' : 'Healthy root development support.' },
          { n: 'Potassium (K)', s: sensors[2], weight: 0.15, impact: 'Important', why: (p) => p < 50 ? 'Reduced disease resistance.' : 'Excellent water regulation & immunity.' },
          { n: 'Soil pH', s: sensors[3], weight: 0.20, impact: 'Critical', why: (p) => p < 70 ? 'Acidity/Alkalinity limits nutrient uptake.' : 'Ideal pH for maximum nutrient availability.' },
          { n: 'Moisture', s: sensors[4], weight: 0.20, impact: 'Important', why: (p) => p < 50 ? 'Hydration stress detected.' : 'Balanced soil-water ratio.' }
        ]
      },
      {
        id: 'climate',
        name: 'Climate & Weather',
        icon: Thermometer,
        params: [
          { n: 'Temperature', s: sensors[5], weight: 0.40, impact: 'Important', why: (p) => p < 60 ? 'Thermal stress affecting metabolism.' : 'Optimal metabolic temperature.' },
          { n: 'Rainfall', s: sensors[6], weight: 0.40, impact: 'Important', why: (p) => p < 50 ? 'Water deficit for crop lifecycle.' : 'Adequate precipitation support.' },
          { n: 'Humidity', s: { pct: 75, type: 'good' }, weight: 0.20, impact: 'Supporting', why: () => 'Optimal transpiration levels.' }
        ]
      },
      {
        id: 'external',
        name: 'External Factors',
        icon: Globe,
        params: [
          { n: 'Season', s: { pct: matchTable[0].type === 'good' ? 100 : 40, type: matchTable[0].type }, weight: 0.35, impact: 'Supporting', why: (p) => p > 80 ? 'Ideal physiological window.' : 'Seasonal mismatch detected.' },
          { n: 'Growing Time', s: { pct: matchTable[3].type === 'good' ? 100 : 50, type: matchTable[3].type }, weight: 0.35, impact: 'Supporting', why: (p) => p > 80 ? 'Perfect sowing timeline.' : 'Sowing delay impact expected.' },
          { n: 'Location', s: { pct: matchTable[2].type === 'good' ? 100 : 70, type: matchTable[2].type }, weight: 0.30, impact: 'Supporting', why: () => 'Geographically viable zone.' }
        ]
      }
    ];

    // Process all parameters with data logic
    const processedGroups = categories.map(cat => {
      let catScore = 0;
      const items = cat.params.map(p => {
        const pct = p.s.pct !== undefined ? p.s.pct : calcMatchPct(p.s);
        const status = pct > 80 ? 'Good' : (pct > 50 ? 'Moderate' : 'Poor');
        const color = pct > 80 ? COLORS.primary : (pct > 50 ? COLORS.warning : COLORS.danger);
        catScore += pct * p.weight;
        return { ...p, pct, status, color, explain: p.why(pct) };
      });
      return { ...cat, score: Math.round(catScore), items };
    });

    const weights = { soil: 0.50, climate: 0.35, external: 0.15 };
    // Calculate actual connectivity to handle "No Data" states
    const activeSensors = sensors.filter(s => s.type !== 'missing').length;
    const isOffline = activeSensors === 0;

    const matchScore = isOffline ? 0 : Math.round(
      processedGroups.reduce((acc, g) => acc + (g.score * weights[g.id]), 0)
    );
    
    // ─── 🌍 REAL-WORLD SUITABILITY ENGINE ───
    // Suitability focuses on long-term viability (Environment/Season heavily weighted)
    // Even if NPK is perfect today (Match Score high), if it's the wrong season/location, Suitability drops.
    const suitWeights = { soil: 0.15, climate: 0.35, external: 0.50 };
    const suitabilityScore = isOffline ? 0 : Math.round(
      processedGroups.reduce((acc, g) => acc + (g.score * suitWeights[g.id]), 0)
    );

    let recStatus = 'MODERATE', recColor = '#F59E0B', recIcon = AlertCircle;
    if (matchScore > 80) { recStatus = 'RECOMMENDED'; recColor = '#10B981'; recIcon = CheckCircle2; }
    else if (matchScore < 50) { recStatus = 'NOT RECOMMENDED'; recColor = '#EF4444'; recIcon = XCircle; }

    const suitLabel = suitabilityScore > 80 ? 'High Suitability' : (suitabilityScore > 50 ? 'Moderate' : 'Low Suitability');
    const suitColor = suitabilityScore > 80 ? COLORS.primary : (suitabilityScore > 50 ? COLORS.warning : COLORS.danger);

    const criticalFailures = processedGroups.flatMap(g => g.items).filter(p => p.impact === 'Critical' && p.pct < 60);
    const detailedInsight = criticalFailures.length > 0 
      ? `CRITICAL ALERT: Your field shows significant deficits in ${criticalFailures.map(f => f.n).join(', ')}. These factors are essential for ${selectedCrop} and must be corrected before proceeding.`
      : `SUITABILITY ANALYSIS: Field conditions are ${matchScore > 80 ? 'ideal' : 'stable'}. Focus on maintaining ${processedGroups[0].items.filter(p => p.pct < 85).map(p => p.n).join(', ') || 'current levels'} for maximum yield efficiency.`;

    return {
      sensors, suitabilityTable, confidence, matchScore, suitabilityScore, recStatus, recColor, recIcon, isOffline, demand: metaSource.demand || (['Cash Crop', 'Fruit', 'Seed'].includes(spec.type) ? 'High' : (['Fiber', 'Grain', 'Vegetable', 'Pulse'].includes(spec.type) ? 'Stable' : 'Moderate')),
      summary: {
        groups: processedGroups,
        overall: suitabilityScore,
        status: suitLabel,
        color: suitColor,
        insight: detailedInsight
      },
      fertilizer: {
        isValid: canFertilize,
        urea: urea * 1, ssp: ssp * 1, mop: mop * 1,
        product: meta.fert?.common || 'NPK Mix',
        reason: canFertilize ? (meta.fert?.logic || fertReason) : "OFFLINE - CONNECT NPK SENSORS",
        stage: meta.fert?.stage || 'Vegetative',
        products: meta.fert?.products || ['Urea', 'DAP', 'MOP']
      },
      compost: {
        isValid: canCompost,
        perAcre: meta.compost?.qty || `${compost} tons/acre`,
        product: meta.compost?.type || 'Organic Manure',
        reason: canCompost ? (meta.compost?.logic || compostReason) : "OFFLINE - CONNECT SOIL SENSORS",
        stage: meta.compost?.stage || 'Basal'
      },
      pests: {
        detected: detectedPests
      },
      meta
    };
  }, [db, selectedCrop, sensorData]);

  if (db.loading || !brain) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: COLORS.background }}><RefreshCw className="animate-spin" color={COLORS.primary} /></div>;

  if (db.error) return <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: COLORS.background, padding: '20px', textAlign: 'center' }}>
    <AlertTriangle size={48} color={COLORS.danger} style={{ marginBottom: '1rem' }} />
    <h2 style={{ fontWeight: 900 }}>Database Sync Error</h2>
    <p style={{ color: COLORS.textMuted }}>Unable to load industrial crop specifications.</p>
  </div>;

  const cardStyle = {
    background: COLORS.cardBg,
    borderRadius: RAD.card,
    padding: '1.5rem',
    marginBottom: '1.25rem',
    border: `1px solid ${COLORS.border}`,
    boxShadow: '0 4px 16px rgba(0,0,0,0.02)'
  };

  const sectionHeader = { margin: '0 0 1.25rem 0', fontSize: '1.1rem', fontWeight: 950, color: COLORS.textMain, display: 'flex', alignItems: 'center', gap: '10px' };

  return (
    <div className="no-scrollbar" style={{ background: COLORS.background, minHeight: '100dvh', paddingBottom: '2rem', fontFamily: "'Outfit', sans-serif", overflowX: 'hidden' }}>

      {/* 🚀 INDUSTRIAL CROP HERO CARD - PREMIUM REDESIGN */}
      <div style={{ padding: '1rem' }}>
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          style={{ 
            background: '#FFFFFF', borderRadius: '24px', padding: '1rem',
            boxShadow: '0 12px 40px rgba(0,0,0,0.04)', border: `1px solid rgba(0,0,0,0.02)`,
            opacity: heroOpacity
          }}
        >
          {/* 1. HEADER SECTION: CROP SELECTOR */}
          <div 
            onClick={() => setIsSheetOpen(true)}
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
              background: '#F8FAFC', padding: '10px 14px', borderRadius: '14px',
              cursor: 'pointer', marginBottom: '1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: getCropIcon(brain.meta.type, selectedCrop).color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {React.createElement(getCropIcon(brain.meta.type, selectedCrop).icon, { size: 16, color: 'white' })}
              </div>
              <h1 style={{ fontSize: '1rem', fontWeight: 950, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.02em', margin: 0 }}>
                {formatCropName(selectedCrop)}
              </h1>
            </div>
            <ChevronDown size={18} color="#94A3B8" />
          </div>

          {/* 2. FIELD PROFILE CONTEXT: UNIFORM 3x2 GRID */}
          <div style={{ 
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', 
            marginBottom: '1.25rem' 
          }}>
            {[
              { label: 'Soil Type', val: 'Loamy', icon: Layers, color: COLORS.primary },
              { label: 'Climate', val: 'Sub-Tropical', icon: Cloud, color: COLORS.secondary },
              { label: 'Region', val: 'Nadia, WB', icon: MapPin, color: '#6366F1' },
              { label: 'Market Demand', val: brain.demand, icon: TrendingUp, color: getDemandColor(brain.demand) },
              { label: 'Crop Category', val: brain.meta.type, icon: Leaf, color: COLORS.primary },
              { label: 'Geo-Location', val: 'Kalyani', icon: MapPin, color: COLORS.secondary }
            ].map((p, i) => (
              <div key={i} style={{ 
                background: `${p.color}08`, padding: '10px', borderRadius: '14px', 
                display: 'flex', flexDirection: 'column', gap: '4px', border: `1px solid ${p.color}15`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {React.createElement(p.icon, { size: 12, color: p.color })}
                  <p style={{ margin: 0, fontSize: '0.55rem', fontWeight: 900, color: p.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{p.label}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: COLORS.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.val}</p>
                </div>
              </div>
            ))}
          </div>

          {/* 3. CORE ADVISORY DECISION */}
          <div style={{ 
            background: `${brain.recColor}08`, borderRadius: '18px', padding: '1rem',
            border: `1px solid ${brain.recColor}15`, marginBottom: '1.25rem',
            display: 'flex', alignItems: 'center', gap: '14px'
          }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: brain.recColor, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${brain.recColor}30` }}>
              {React.createElement(brain.recIcon, { size: 22, color: "white" })}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 950, color: brain.recColor }}>{brain.recStatus}</span>
                <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase' }}>
                  {brain.isOffline ? 'OFFLINE' : `${brain.matchScore}% Match`}
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.7rem', fontWeight: 700, color: '#64748B', lineHeight: 1.3 }}>{brain.isOffline ? 'Sensors disconnected. Real-time suitability pending.' : brain.recReason}</p>
            </div>
          </div>

          {/* 4. INDUSTRIAL METRICS ROW: REAL DATA LOGIC */}
          <div style={{ 
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' 
          }}>
            {[
              { 
                id: 'Confidence', 
                val: brain.isOffline ? 0 : brain.confidence, 
                label: brain.isOffline ? 'Offline' : (brain.confidence > 85 ? 'High' : 'Moderate'),
                color: '#6366F1'
              },
              { 
                id: 'Match Score', 
                val: brain.isOffline ? 0 : brain.matchScore, 
                label: brain.isOffline ? 'Offline' : (brain.matchScore > 80 ? 'Ideal' : (brain.matchScore > 50 ? 'Fair' : 'Low')),
                color: COLORS.secondary 
              },
              { 
                id: 'Suitability', 
                val: brain.isOffline ? 0 : brain.suitabilityScore, 
                label: brain.isOffline ? 'Offline' : (brain.suitabilityScore > 65 ? 'Optimal' : 'Risky'),
                color: brain.summary.color 
              }
            ].map((m, i) => (
              <div key={i} style={{ 
                background: '#F8FAFC', borderRadius: '16px', padding: '12px',
                border: `1px solid rgba(0,0,0,0.02)`, display: 'flex', flexDirection: 'column', gap: '6px'
              }}>
                <span style={{ fontSize: '0.55rem', fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{m.id}</span>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 950, color: '#1E293B' }}>{m.val > 0 ? `${m.val}%` : '--'}</span>
                  <span style={{ fontSize: '0.6rem', fontWeight: 850, color: m.val > 0 ? m.color : '#94A3B8' }}>{m.label}</span>
                </div>
                <div style={{ width: '100%', height: '4px', background: '#E2E8F0', borderRadius: '10px', overflow: 'hidden' }}>
                  <motion.div 
                    initial={{ width: 0 }} animate={{ width: `${m.val}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    style={{ height: '100%', background: m.val > 0 ? m.color : '#CBD5E1' }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>


      <CropBottomSheet 
        isOpen={isSheetOpen} 
        onClose={() => setIsSheetOpen(false)} 
        crops={allCropsList} 
        onSelect={setSelectedCrop} 
        selectedCrop={selectedCrop}
      />

      {/* 🎛️ INDUSTRIAL TAB SWITCHER */}
      <div style={{ padding: '0.5rem 1.25rem 1.25rem', display: 'flex', gap: '10px' }}>
        {[
          { id: 'sensor', label: 'Sensor Data', icon: Activity },
          { id: 'suitability', label: 'Crop Suitability', icon: Leaf }
        ].map(t => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                flex: 1, padding: '14px', borderRadius: '18px',
                background: isActive ? '#FFFFFF' : 'rgba(0,0,0,0.02)',
                border: isActive ? `1px solid rgba(0,0,0,0.05)` : '1px solid transparent',
                boxShadow: isActive ? '0 8px 20px rgba(0,0,0,0.04)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                cursor: 'pointer', transition: 'none', outline: 'none'
              }}
            >
              <t.icon size={16} color={isActive ? COLORS.primary : COLORS.textMuted} />
              <span style={{ fontSize: '0.85rem', fontWeight: isActive ? 900 : 700, color: isActive ? COLORS.textMain : COLORS.textMuted }}>{t.label}</span>
            </button>
          );
        })}
      </div>

      <div style={{ padding: '0 1.25rem' }}>
        {activeTab === 'sensor' ? (
          <>
            {/* 📋 SMART MATCH TABLE ENGINE */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ padding: '0 8px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: COLORS.textMain, display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left' }}>
                    <Activity size={20} color={COLORS.primary} />
                    Field Data Compare Table
                  </h3>
                </div>
              </div>

              <div style={{ 
                display: 'grid', gridTemplateColumns: '1.6fr 0.8fr 0.8fr 1fr', gap: '12px', 
                padding: '0 4px 10px 4px', borderBottom: `2px solid ${COLORS.background}`, marginBottom: '8px' 
              }}>
                 {['Factor', 'Field', 'Optimal', 'Status'].map((h, i) => (
                   <span key={i} style={{ 
                     fontSize: '0.75rem', fontWeight: 900, color: COLORS.textMuted, textTransform: 'uppercase',
                     textAlign: 'left',
                     paddingLeft: i === 0 ? '36px' : 0
                   }}>{h}</span>
                 ))}
              </div>

              {brain.sensors.map((s, idx) => (
                <div 
                  key={s.id}
                  style={{ 
                    display: 'grid', gridTemplateColumns: '1.6fr 0.8fr 0.8fr 1fr', gap: '12px', 
                    padding: '12px 4px', minHeight: '52px', borderBottom: `1px solid ${COLORS.background}`, 
                    alignItems: 'center' 
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    <div style={{ minWidth: '28px', height: '28px', borderRadius: '8px', background: `${s.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {React.createElement(s.icon, { size: 14, color: s.color })}
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 850, color: COLORS.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.id}</span>
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: s.type === 'missing' ? COLORS.textMuted : COLORS.textMain, textAlign: 'left' }}>
                    {s.type === 'missing' ? '---' : `${Math.round(parseFloat(s.val) || 0)}${s.unit}`}
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: COLORS.textMuted, textAlign: 'left' }}>
                    {(typeof s.rMin !== 'undefined' && s.rMin !== null) ? `${Math.round(s.rMin)}-${Math.round(s.rMax)}` : '---'}
                  </span>
                  <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                    <div style={{ 
                      padding: '4px 8px', borderRadius: '6px', 
                      background: s.type === 'good' ? `${COLORS.primary}15` : (s.type === 'missing' ? '#F1F5F9' : (s.isHigh ? `${COLORS.warning}15` : `${COLORS.danger}15`)),
                      color: s.type === 'good' ? COLORS.primary : (s.type === 'missing' ? COLORS.textMuted : (s.isHigh ? COLORS.warning : COLORS.danger)),
                      fontSize: '0.55rem', fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px',
                      whiteSpace: 'nowrap'
                    }}>
                      {s.type === 'good' ? <CheckCircle2 size={10} /> : (s.type === 'missing' ? <RefreshCw size={10} /> : <AlertCircle size={10} />)}
                      {s.type === 'good' ? 'Opt' : (s.type === 'missing' ? 'Off' : (s.isHigh ? 'High' : 'Low'))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 🧪 FERTILIZER ENGINE */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${COLORS.secondary}10`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calculator size={20} color={COLORS.secondary} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 950, color: COLORS.textMain }}>Fertilizer Engine</h3>
                </div>
              </div>

              {!brain.fertilizer.isValid ? (
                <div style={{ padding: '30px 20px', textAlign: 'center', background: '#F8FAFC', borderRadius: '20px', border: `1px dashed ${COLORS.border}` }}>
                  <RefreshCw size={24} color={COLORS.textMuted} style={{ marginBottom: '10px', opacity: 0.5 }} />
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: COLORS.textMuted }}>NPK SENSORS OFFLINE</div>
                </div>
              ) : (
                <>
                  {/* HERO VALUE CARDS */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '1.25rem' }}>
                    {[
                      { label: 'Urea', val: brain.fertilizer.urea },
                      { label: 'SSP', val: brain.fertilizer.ssp },
                      { label: 'MOP', val: brain.fertilizer.mop }
                    ].map((f, i) => (
                      <div key={i} style={{ 
                        background: '#F8FAFC', borderRadius: '16px', padding: '12px 8px', 
                        border: '1px solid rgba(0,0,0,0.02)', textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '0.62rem', fontWeight: 900, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{f.label}</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 950, color: COLORS.textMain, marginTop: '2px' }}>{Math.round(f.val)}<span style={{ fontSize: '0.7rem', marginLeft: '2px', opacity: 0.5 }}>kg</span></div>
                      </div>
                    ))}
                  </div>

                  {/* ACTIONABLE ADVISORY */}
                  <div style={{ padding: '0 4px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'start', gap: '10px' }}>
                       <Scale size={13} color={COLORS.primary} style={{ marginTop: '2px' }} />
                       <div>
                         <div style={{ fontSize: '0.6rem', fontWeight: 900, color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: '2px' }}>Apply:</div>
                         <span style={{ fontSize: '0.8rem', fontWeight: 850, color: COLORS.textMain, lineHeight: 1.3 }}>
                           DAP + SSP (Basal), Urea split, MOP as Potash source
                         </span>
                       </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'start', gap: '10px', opacity: 0.7 }}>
                       <Clock size={13} color={COLORS.primary} style={{ marginTop: '2px' }} />
                       <div>
                         <div style={{ fontSize: '0.6rem', fontWeight: 900, color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: '2px' }}>Schedule:</div>
                         <span style={{ fontSize: '0.75rem', fontWeight: 750, color: COLORS.textMuted, lineHeight: 1.3 }}>
                           Basal → Tillering → Panicle (split N application)
                         </span>
                       </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 🌿 COMPOST ENGINE */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${COLORS.primary}10`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Leaf size={20} color={COLORS.primary} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 950, color: COLORS.textMain }}>Compost Engine</h3>
                </div>
              </div>

              {!brain.compost.isValid ? (
                <div style={{ padding: '30px 20px', textAlign: 'center', background: '#F8FAFC', borderRadius: '20px', border: `1px dashed ${COLORS.border}` }}>
                  <RefreshCw size={24} color={COLORS.textMuted} style={{ marginBottom: '10px', opacity: 0.5 }} />
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: COLORS.textMuted }}>SOIL SENSORS OFFLINE</div>
                </div>
              ) : (
                <>
                  {/* BALANCE STATUS CARD */}
                  <div style={{ background: '#F8FAFC', padding: '16px 20px', borderRadius: '24px', textAlign: 'center', marginBottom: '0.75rem', border: '1px solid rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.6rem', fontWeight: 950, color: COLORS.textMain, lineHeight: 1 }}>{brain.compost.perAcre}</span>
                      <span style={{ fontSize: '1.6rem', fontWeight: 950, color: '#E2E8F0' }}>•</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 900, color: brain.compost.perAcre.startsWith('0') ? COLORS.primary : COLORS.warning }}>
                        {brain.compost.perAcre.startsWith('0') ? 'Balanced Soil' : 'Adjustment Needed'}
                      </span>
                    </div>
                  </div>

                  {/* COMPACT FOOTER */}
                  <div style={{ padding: '4px', display: 'flex', alignItems: 'center', gap: '16px', opacity: 0.5 }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                       <Sprout size={11} color={COLORS.primary} />
                       <span style={{ fontSize: '0.62rem', fontWeight: 800, color: COLORS.textMain }}>{brain.compost.product}</span>
                     </div>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                       <Clock size={11} color={COLORS.primary} />
                       <span style={{ fontSize: '0.62rem', fontWeight: 800, color: COLORS.textMain }}>{brain.compost.stage}</span>
                     </div>
                  </div>
                </>
              )}
            </div>

            {/* 🛡️ PEST ENGINE */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${COLORS.danger}10`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bug size={20} color={COLORS.danger} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 950, color: COLORS.textMain }}>Pest Analysis</h3>
                </div>
              </div>

              {brain.pests.detected.map((p, i) => (
                <div key={i} style={{ 
                  padding: '20px', borderRadius: '24px', 
                  background: p.isActive ? `${COLORS.danger}05` : '#F8FAFC', 
                  border: p.isActive ? `1px solid ${COLORS.danger}20` : '1px solid rgba(0,0,0,0.02)'
                }}>
                  {/* TOP LINE: ICON + PEST | STATUS */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Bug size={20} color={p.isActive ? COLORS.danger : COLORS.textMuted} />
                      <span style={{ fontSize: '1rem', fontWeight: 950, color: COLORS.textMain }}>{p.n}</span>
                    </div>
                    <span style={{ 
                      fontSize: '0.65rem', fontWeight: 950, padding: '6px 12px', borderRadius: '100px', 
                      background: p.isActive ? COLORS.danger : '#E2E8F0', 
                      color: p.isActive ? 'white' : COLORS.textMuted,
                      letterSpacing: '0.05em'
                    }}>
                      {p.s}
                    </span>
                  </div>
                  
                  {/* SINGLE-LINE INTELLIGENCE SENTENCE */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.textMuted, fontSize: '0.72rem', fontWeight: 750, marginBottom: '16px' }}>
                    <span style={{ color: p.isActive ? COLORS.textMain : COLORS.textMuted }}>{p.intel}</span>
                  </div>

                  {/* ACTIONABLE LINE */}
                  <div style={{ padding: '12px', borderRadius: '16px', background: p.isActive ? `${COLORS.danger}12` : '#F1F5F9', display: 'flex', alignItems: 'center', gap: '8px' }}>
                     <AlertCircle size={14} color={p.isActive ? COLORS.danger : COLORS.primary} />
                     <span style={{ fontSize: '0.75rem', fontWeight: 900, color: p.isActive ? COLORS.danger : COLORS.textMain }}>
                       {p.action}
                     </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          /* 🌾 CROP SUITABILITY CHECK TABLE - INDUSTRIAL REDESIGN */
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', padding: '0 8px' }}>
              <h3 style={{ ...sectionHeader, gap: '10px', marginBottom: 0 }}>
                {getCropIcon(CROP_SPECS[selectedCrop]?.type, selectedCrop) && React.createElement(getCropIcon(CROP_SPECS[selectedCrop]?.type, selectedCrop).icon, { size: 20, color: COLORS.secondary })}
                Crop Suitability Analysis Table
              </h3>
            </div>
            
            <div style={{ 
              display: 'grid', gridTemplateColumns: '1.6fr 1fr 1.8fr', gap: '24px', 
              padding: '0 4px 10px 4px', borderBottom: `1.5px solid #F1F5F9`, marginBottom: '2px' 
            }}>
              {['Factor', 'Ideal', 'Industrial Insights'].map((h, i) => (
                <span key={i} style={{ 
                  fontSize: '0.75rem', fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  textAlign: 'left',
                  paddingLeft: i === 0 ? '36px' : 0
                }}>{h}</span>
              ))}
            </div>

            {brain.suitabilityTable.map((row, idx) => (
              <div key={row.id} style={{ 
                display: 'grid', gridTemplateColumns: '1.6fr 1fr 1.8fr', gap: '24px', 
                padding: '14px 4px', 
                minHeight: '60px',
                borderBottom: idx === brain.suitabilityTable.length - 1 ? 'none' : `1px solid rgba(241, 245, 249, 0.8)`, 
                alignItems: 'start'
              }}>
                {/* Column 1: Factor */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ minWidth: '28px', height: '28px', borderRadius: '8px', background: `${row.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {React.createElement(row.icon, { size: 14, color: row.color })}
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: COLORS.textMain, lineHeight: 1.5 }}>{row.label || row.id}</span>
                </div>

                {/* Column 2: Target Spec */}
                <div style={{ textAlign: 'left' }}>
                  <span style={{ 
                    fontSize: '0.85rem', fontWeight: 700, color: COLORS.textMain, 
                    lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: '4', WebkitBoxOrient: 'vertical', 
                    overflow: 'hidden'
                  }}>
                    {row.ideal}
                  </span>
                </div>

                {/* Column 3: Insights */}
                <div style={{ textAlign: 'left' }}>
                  <span style={{ 
                    fontSize: '0.85rem', color: COLORS.textMain, fontWeight: 600, lineHeight: 1.5,
                    display: '-webkit-box', WebkitLineClamp: '4', WebkitBoxOrient: 'vertical', 
                    overflow: 'hidden'
                  }}>
                    {row.decision}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default FarmAdvisor;
