import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Zap, Calculator, RefreshCw, Activity, Target,
  Bug, Leaf, Globe, AlertCircle, CheckCircle2,
  XCircle, Clock, FlaskConical, BarChart3, CloudRain, Thermometer,
  ChevronDown, TrendingUp, Droplets, Search, X, Scale,
  Sparkles, Info, Trees, CalendarDays, Layers, Send, Brain
} from 'lucide-react';
import { useApp } from '../../state/AppContext';
import { MASTER_CONFIG } from '../../setup';

import cropCsv from '../../data/geo/CropSuitabilityData_Final.csv?url';
import { CROP_SPECS, METADATA, ALIASES } from '../../data/core/CropDatabase';
import {
  MONTHS, isAvailable, isAvailableLoc, getCropIcon, getDemandIcon,
  getDemandColor, formatCropName, parseCSV, aggregateCropProfiles,
  detectSoilType, getPHLabel, getMoistureLabel, getFertilityLabel,
  getLocationClimate, isClimateCompatible
} from '../../data/core/AgronomyUtils';

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

const sleep = ms => new Promise(r => setTimeout(r, ms));

const getCropSpec = (name) => {
  if (!name || typeof name !== 'string') return { label: 'unknown' };
  const normalized = name.toLowerCase().trim();
  const target = ALIASES[normalized] || normalized;
  return { ...(CROP_SPECS[target] || {}), label: target };
};

export async function fetchGroqChat(messagesHistory, language = 'en') {
  const key = import.meta.env.VITE_GROQ_API_KEY;
  if (!key) return "Please configure your VITE_GROQ_API_KEY in the .env file to receive AI insights.";

  try {
    const langInstruction = language === 'bn' ? "IMPORTANT: Provide the entire response in Bengali language. Do not use English unless strictly necessary for technical terms." : "";
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: `You are AgriSense AI, an expert Agronomist AI. You provide clear, concise, actionable advice based on real-time field data. Format your response heavily using markdown. Use **bold** for key metrics, products, and actions. Use bullet points (- ) for lists. Do NOT use markdown headers like # or ## or ###. Keep responses extremely structured and easy to read. Keep responses under 4-6 sentences when possible. Speak directly and professionally. ${langInstruction}` },
          ...messagesHistory
        ],
        temperature: 0.4,
      }),
    });
    if (!resp.ok) throw new Error(`Groq error ${resp.status}`);
    const json = await resp.json();
    return json?.choices?.[0]?.message?.content || 'No response generated.';
  } catch (err) {
    console.error(err);
    return 'Error generating AI response.';
  }
}

const FormattedText = ({ text, color = '#14532D', strongColor = '#064E3B', iconColor = COLORS.primary }) => {
  if (!text) return null;
  // Strip out any markdown headers completely just in case the AI ignores instructions
  const cleanedText = text.replace(/^#+\s.*$/gm, '').trim();
  const lines = cleanedText.split('\n');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
      {lines.map((line, i) => {
        if (!line.trim()) return null;

        const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
        const content = isBullet ? line.trim().substring(2) : line;

        const parts = content.split(/(\*\*.*?\*\*)/g);

        return (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: isBullet ? 'rgba(255,255,255,0.4)' : 'transparent', padding: isBullet ? '8px 12px' : '0', borderRadius: '12px', border: isBullet ? '1px solid rgba(0,0,0,0.03)' : 'none' }}>
            {isBullet && <div style={{ color: iconColor, marginTop: '4px', flexShrink: 0 }}><Target size={14} /></div>}
            <span style={{ fontSize: '0.95rem', color: color, lineHeight: 1.6, wordBreak: 'break-word' }}>
              {parts.map((p, j) => {
                if (p.startsWith('**') && p.endsWith('**')) {
                  return <strong key={j} style={{ color: strongColor, fontWeight: 900, background: `${iconColor}15`, padding: '2px 6px', borderRadius: '6px' }}>{p.slice(2, -2)}</strong>;
                }
                return p;
              })}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const calculateBrain = (db, selectedCrop, sensorData, user) => {
  if (!db || !db.crops || !sensorData || !selectedCrop) return null;
  const spec = getCropSpec(selectedCrop);
  const p = db?.crops?.[selectedCrop] || {};

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
    bU: spec.n ? (spec.n[1] / 0.46) : 0,
    bS: spec.p ? (spec.p[1] / 0.16) : 0,
    bM: spec.k ? (spec.k[1] / 0.60) : 0,
    bC: 0
  };

  const month = MONTHS[new Date().getMonth()] || "Jan";
  const season = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct'].includes(month) ? 'Kharif' : (['Nov', 'Dec', 'Jan', 'Feb'].includes(month) ? 'Rabi' : 'Zaid');

  const cur = {
    npk: sensorData?.soil?.npk,
    ph: sensorData?.soil?.ph, moisture: sensorData?.soil?.moisture,
    temp: sensorData?.weather?.temp, hum: sensorData?.weather?.humidity, rain: sensorData?.weather?.rainLevel,
    season,
    soil: detectSoilType(sensorData?.soil?.ph, sensorData?.soil?.moisture, sensorData?.soil?.npk?.n, sensorData?.soil?.npk?.p, sensorData?.soil?.npk?.k),
    weather: sensorData?.weather?.condition || 'Clear',
    month
  };

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

  const calcMeanDistPct = (s) => {
    if (s.type === 'missing' || !isAvailableLoc(s.val)) return 0;
    const val = parseFloat(s.val);
    const range = Math.max(1, s.rMax - s.rMin);
    const mid = (s.rMin + s.rMax) / 2;
    const distFromCenter = Math.abs(val - mid);
    const maxAllowedDist = range / 2;
    return Math.max(0, 100 - ((distFromCenter / maxAllowedDist) * 100));
  };

  const activeSensorsCount = sensors.filter(s => s.type !== 'missing' && isAvailableLoc(s.val)).length;
  const completenessFactor = sensors.length > 0 ? (activeSensorsCount / sensors.length) : 0;

  const rawConfidence = activeSensorsCount > 0
    ? sensors.reduce((acc, s) => acc + calcMeanDistPct(s), 0) / activeSensorsCount
    : 0;
  const confidence = Math.round((rawConfidence * 0.7) + ((completenessFactor * 100) * 0.3));

  const calcMatchPct = (s) => {
    if (s.type === 'missing' || !isAvailableLoc(s.val)) return 0;
    const val = parseFloat(s.val);
    const { rMin, rMax } = s;
    const mid = (rMin + rMax) / 2;
    const maxAllowedDist = Math.max(1, (rMax - rMin) / 2);
    const distFromCenter = Math.abs(val - mid);

    if (val < rMin || val > rMax) {
      const outDist = val < rMin ? (rMin - val) : (val - rMax);
      return Math.max(15, Math.round(50 - ((outDist / maxAllowedDist) * 40)));
    }
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
  const activeSensors = sensors.filter(s => s.type !== 'missing').length;
  const isOffline = activeSensors === 0;

  const matchScore = isOffline ? 0 : Math.round(
    processedGroups.reduce((acc, g) => acc + (g.score * weights[g.id]), 0)
  );

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
    sensors, confidence, matchScore, suitabilityScore, recStatus, recColor, recIcon, isOffline, demand: metaSource.demand || 'Stable',
    summary: {
      groups: processedGroups,
      overall: suitabilityScore,
      status: suitLabel,
      color: suitColor,
      insight: detailedInsight
    },
    meta
  };
};

const FieldReportBlock = ({ field, db, sensorData, user }) => {
  const { apiWeather, apiForecast, globalWeatherAlert, actuators, language, t } = useApp();
  const brain = useMemo(() => calculateBrain(db, field.crop || 'rice', sensorData, user), [db, field.crop, sensorData, user]);
  const [advice, setAdvice] = useState('');
  const [loading, setLoading] = useState(true);

  const cropAgeMs = Date.now() - new Date(field.startDate || Date.now()).getTime();
  const cropAgeMonths = Math.floor(cropAgeMs / (1000 * 60 * 60 * 24 * 30));

  useEffect(() => {
    if (!brain) return;
    const lang = language || localStorage.getItem('agrisense_language') || 'en';
    const prompt = `Field: ${field.name}, Crop: ${field.crop || 'rice'}, Crop Age: ${cropAgeMonths} months.
Status: Match ${brain.matchScore}%, Suitability ${brain.suitabilityScore}%.
Sensors -> Soil NPK (kg/ha): N:${sensorData?.soil?.npk?.n} P:${sensorData?.soil?.npk?.p} K:${sensorData?.soil?.npk?.k}, pH:${sensorData?.soil?.ph}, Moisture:${sensorData?.soil?.moisture}%.
Sensors -> Local Temp:${sensorData?.weather?.temp}C, Local Hum:${sensorData?.weather?.humidity}%.
Sensors -> Storage Temp:${sensorData?.storage?.temp}C, Storage Hum:${sensorData?.storage?.humidity}%, Gas:${sensorData?.storage?.gasLevel}.
Sensors -> Irrigation Water Level:${sensorData?.water?.level}%. Pump is currently ${actuators?.PUMP ? 'ON' : 'OFF'}.
Regional Weather -> Temp: ${apiWeather?.temp}C, Condition: ${apiWeather?.condition}, Rain Chance: ${apiForecast?.[0]?.rainChance || 0}%, Wind: ${apiWeather?.windSpeed}.
Alerts -> ${globalWeatherAlert || 'None'}.

INSTRUCTIONS:
Provide a highly intelligent, proactive, and structured agronomy recommendation. however you donot ned to mention them everytime you generate a response. You consider every points and only if you find it necessary, mention in your response.
1. If there's a chance of rain today or flood alert, strongly advise on whether to keep the irrigation pump OFF, and list necessary measures (including local helpline 1070/112 or emergency tips if flood alert).
2. If it is sunny and moisture/water level is low, advise exactly how long to keep the pump ON (e.g. 'keep pump on for X hours').
3. Look at soil NPK and pH. If deficient or imbalanced, recommend specific real-world fertilizers, pesticides, or organic remedies (e.g., 'spray X', 'add Y').
4. If the storage facility temp/humidity/gas is high, advise specific actions (e.g., 'turn on exhaust fan for X hours').
5. Look at the Crop Age (${cropAgeMonths} months). If it's near typical harvest time, guide them on when and how to harvest, mentioning any required machinery.
6. Use 4-5 bullet points. Use **bold** for exact amounts, durations, and products. Do NOT use markdown headers (like ###). Be direct and act as a top-tier expert.`;

    Promise.all([
      fetchGroqChat([{ role: 'user', content: prompt }], lang),
      sleep(2500)
    ]).then(([res]) => {
      setAdvice(res);
      setLoading(false);
    });
  }, [field.id, brain?.isOffline]);

  if (!brain) return <div style={{ padding: '20px', textAlign: 'center' }}><RefreshCw className="animate-spin" color={COLORS.primary} /></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: '16px 0', alignSelf: 'stretch' }}>
      {/* 1. Summary Block */}
      <div style={{ background: 'white', borderRadius: '24px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 8px 30px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: getCropIcon(brain.meta.type, field.crop || 'rice').color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {React.createElement(getCropIcon(brain.meta.type, field.crop || 'rice').icon, { size: 24, color: 'white' })}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0F172A' }}>{field.name} <span style={{ opacity: 0.5 }}>• {formatCropName(field.crop || 'rice')}</span></h3>
            <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>Real-time Analysis based on Sensors</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Match Score', val: `${brain.matchScore}%`, color: COLORS.secondary },
            { label: 'Suitability', val: `${brain.suitabilityScore}%`, color: brain.summary.color },
            { label: 'Confidence', val: `${brain.confidence}%`, color: '#6366F1' }
          ].map((m, i) => (
            <div key={i} style={{ background: '#F8FAFC', padding: '12px', borderRadius: '16px', border: '1px solid #F1F5F9', textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{m.label}</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 950, color: m.color, marginTop: '2px' }}>{brain.isOffline ? 'OFF' : m.val}</div>
            </div>
          ))}
        </div>

        <div style={{ background: `${brain.recColor}10`, padding: '16px', borderRadius: '16px', border: `1px solid ${brain.recColor}20`, display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <brain.recIcon size={20} color={brain.recColor} style={{ marginTop: '2px', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 900, color: brain.recColor }}>{brain.recStatus}</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginTop: '6px', lineHeight: 1.5 }}>
              {brain.summary.insight}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Compare Table */}
      <div style={{ background: 'white', borderRadius: '24px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 8px 30px rgba(0,0,0,0.04)' }}>
        <h4 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 900, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={18} color={COLORS.primary} /> Sensor Data vs Optimal Range
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr', gap: '8px', paddingBottom: '10px', borderBottom: '2px solid #F8FAFC', marginBottom: '10px' }}>
          {['Factor', 'Cur', 'Opt', 'Status'].map((h, i) => <span key={i} style={{ fontSize: '0.7rem', fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase' }}>{h}</span>)}
        </div>
        {brain.sensors.map((s, idx) => (
          <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr', gap: '8px', padding: '10px 0', borderBottom: '1px solid #F8FAFC', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {React.createElement(s.icon, { size: 12, color: s.color })}
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.id}</span>
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: s.type === 'missing' ? '#94A3B8' : '#0F172A' }}>
              {s.type === 'missing' ? '---' : `${Math.round(parseFloat(s.val) || 0)}${s.unit}`}
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>
              {(typeof s.rMin !== 'undefined' && s.rMin !== null) ? `${Math.round(s.rMin)}-${Math.round(s.rMax)}` : '---'}
            </span>
            <div style={{ fontSize: '0.65rem', fontWeight: 900, color: s.type === 'good' ? COLORS.primary : (s.type === 'missing' ? '#94A3B8' : COLORS.danger), textTransform: 'uppercase' }}>
              {s.type === 'good' ? 'OK' : (s.type === 'missing' ? 'OFF' : 'BAD')}
            </div>
          </div>
        ))}
      </div>

      {/* 3. AI Speaks */}
      <div style={{ background: '#F0FDF4', borderRadius: '24px', padding: '20px', border: '1px solid #BBF7D0', boxShadow: '0 8px 30px rgba(0,0,0,0.02)' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 900, color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} /> AI Agronomist Advice
        </h4>
        {loading ? (
          <div style={{ color: '#10B981', fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="pulsating-advisor" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Brain size={20} />
            </div>
            <span style={{ opacity: 0.8, letterSpacing: '0.02em' }}>Synthesizing field intelligence...</span>
          </div>
        ) : (
          <FormattedText text={advice} color="#14532D" strongColor="#064E3B" iconColor="#10B981" />
        )}
      </div>
    </motion.div>
  );
};

const TalkMode = () => {
  const { sensorData, user, fields, language, apiWeather, apiForecast, globalWeatherAlert, actuators } = useApp();
  const [db, setDb] = useState({ crops: null, loading: true, error: false });
  const [messages, setMessages] = useState([{ id: 'init', type: 'selector' }]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetch(cropCsv)
      .then(r => r.text())
      .then(cropTxt => {
        try {
          const crops = aggregateCropProfiles(parseCSV(cropTxt));
          setDb({ crops, loading: false, error: false });
        } catch (e) {
          setDb({ crops: {}, loading: false, error: true });
        }
      })
      .catch(err => {
        setDb({ crops: {}, loading: false, error: true });
      });
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFieldSelect = (field) => {
    setMessages(prev => [
      ...prev,
      { id: Date.now(), type: 'user', text: `Analyze field: ${field.name}` },
      { id: Date.now() + 1, type: 'field_report', field }
    ]);
  };

  const handleSend = async () => {
    if (!inputText.trim() || isProcessing) return;

    const text = inputText.trim();
    setInputText('');
    const newMsgId = Date.now();

    setMessages(prev => [
      ...prev,
      { id: newMsgId, type: 'user', text }
    ]);

    setIsProcessing(true);
    const placeholderId = newMsgId + 1;
    setMessages(prev => [...prev, { id: placeholderId, type: 'ai_text', text: '' }]);

    try {
      // Build history — exclude auto-generated "Analyze field:" triggers (they have no AI reply in the array)
      const historyForAI = messages
        .filter(m =>
          (m.type === 'user' || m.type === 'ai_text') &&
          m.text && m.text.trim() &&
          !String(m.text).startsWith('Analyze field:')
        )
        .map(m => ({
          role: m.type === 'user' ? 'user' : 'assistant',
          content: m.text
        }))
        .concat([{ role: 'user', content: text }]);

      const [response] = await Promise.all([
        fetchGroqChat(historyForAI, language || localStorage.getItem('agrisense_language') || 'en'),
        sleep(2500)
      ]);

      setMessages(prev => prev.map(m => m.id === placeholderId ? { ...m, text: response } : m));
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => prev.map(m => m.id === placeholderId ? { ...m, text: 'Sorry, I encountered an error. Please try again.' } : m));
    } finally {
      setIsProcessing(false);
    }
  };

  if (db.loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: COLORS.background }}><RefreshCw className="animate-spin" color={COLORS.primary} /></div>;

  return (
    <div style={{ background: COLORS.background, height: '100dvh', display: 'flex', flexDirection: 'column', fontFamily: "'Outfit', sans-serif" }}>
      {/* Header handled by Parent */}

      {/* Chat Feed */}
      <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {messages.map(msg => {
          if (msg.type === 'selector') {
            return (
              <div key={msg.id} style={{ alignSelf: 'flex-start', width: '100%' }}>
                <div style={{ background: 'white', borderRadius: '24px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 900, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Leaf size={20} color={COLORS.primary} /> Hello! Select a field to analyze
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                    {fields.map(f => (
                      <button
                        key={f.id}
                        onClick={() => handleFieldSelect(f)}
                        style={{ padding: '12px 20px', borderRadius: '14px', background: '#F8FAFC', border: '1px solid #E2E8F0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: '0.2s' }}
                      >
                        <MapPin size={16} color={COLORS.secondary} />
                        <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1E293B' }}>{f.name} <span style={{ opacity: 0.5 }}>({f.crop || 'rice'})</span></span>
                      </button>
                    ))}
                    {fields.length === 0 && <span style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: 600 }}>No fields configured yet. Please add a field in Accounts.</span>}
                  </div>
                </div>
              </div>
            );
          }

          if (msg.type === 'user') {
            return (
              <div key={msg.id} style={{ alignSelf: 'flex-end', background: COLORS.primary, color: 'white', padding: '14px 20px', borderRadius: '24px', borderBottomRightRadius: '6px', maxWidth: '85%', boxShadow: '0 4px 15px rgba(16,185,129,0.2)' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.5 }}>{msg.text}</span>
              </div>
            );
          }

          if (msg.type === 'ai_text') {
            return (
              <div key={msg.id} style={{ alignSelf: 'flex-start', background: 'white', color: '#0F172A', padding: '16px 20px', borderRadius: '24px', borderBottomLeftRadius: '6px', border: '1px solid #E2E8F0', maxWidth: '90%', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                {msg.text ? (
                  <FormattedText text={msg.text} color="#0F172A" strongColor="#000000" iconColor={COLORS.primary} />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#10B981', fontWeight: 700 }}>
                    <div className="pulsating-advisor"><Brain size={18} /></div><span style={{ opacity: 0.8 }}>Thinking...</span>
                  </div>
                )}
              </div>
            );
          }

          if (msg.type === 'field_report') {
            return <FieldReportBlock key={msg.id} field={msg.field} db={db} sensorData={sensorData} user={user} />;
          }

          return null;
        })}
        <div ref={messagesEndRef} style={{ height: '20px' }} />
      </div>

      {/* Input */}
      <div style={{ padding: '16px 20px', background: 'linear-gradient(160deg, #064E3B 0%, #022C22 100%)', borderTop: '1px solid rgba(16,185,129,0.2)', flexShrink: 0, position: 'sticky', bottom: 0, zIndex: 10 }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', borderRadius: '20px' }}>
          <input
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask your AI Agronomist..."
            style={{ width: '100%', padding: '16px 56px 16px 20px', borderRadius: '20px', background: '#F8FAFC', border: '1px solid #E2E8F0', outline: 'none', fontSize: '1rem', fontWeight: 600, color: '#0F172A', transition: 'border 0.2s' }}
            onFocus={e => e.target.style.borderColor = COLORS.primary}
            onBlur={e => e.target.style.borderColor = '#E2E8F0'}
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isProcessing}
            style={{ position: 'absolute', right: '8px', width: '42px', height: '42px', borderRadius: '14px', background: inputText.trim() && !isProcessing ? COLORS.primary : '#E2E8F0', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: inputText.trim() && !isProcessing ? 'pointer' : 'not-allowed', transition: '0.2s', boxShadow: inputText.trim() && !isProcessing ? '0 4px 12px rgba(16,185,129,0.3)' : 'none' }}
          >
            <Send size={18} color="white" />
          </button>
        </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
        @keyframes pulse-green {
          0% { opacity: 0.4; transform: scale(0.95); }
          50% { opacity: 1; transform: scale(1.1); filter: drop-shadow(0 0 8px rgba(16,185,129,0.6)); }
          100% { opacity: 0.4; transform: scale(0.95); }
        }
        .pulsating-advisor { animation: pulse-green 1.5s ease-in-out infinite; color: #10B981; }
      `}</style>
    </div>
  );
};

export default TalkMode;
