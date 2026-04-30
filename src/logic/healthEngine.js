/**
 * AgriSense Pro v17.1.0 Agricultural Health & Logic Engine
 * Clinical parameters for soil, weather, irrigation, and storage stability.
 */

// ─── THRESHOLDS & SCORING LOGIC ─────────────────────────────────────────────

export const ACTUATORS = {
  PUMP:    'PUMP',
  VALVE:   'VALVE',
  SPRAYER: 'SPRAYER',
  BUZZER:  'BUZZER',
  DISPLAY: 'DISPLAY',
  LIGHT:   'LIGHT'
};

/**
 * Calculates a score (0-100) based on a value and its optimal range.
 * @param {number} val - Current sensor value
 * @param {number} min - Optimal range minimum
 * @param {number} max - Optimal range maximum
 * @param {number} buffer - Grace zone before critical drop
 */
const getParamScore = (val, min, max, buffer = 10) => {
  if (val === null || val === undefined || isNaN(val)) return null;
  
  // Within Optimal Range
  if (val >= min && val <= max) return 100;
  
  // Outside but within buffer (Linear degradation)
  if (val < min) {
    const diff = min - val;
    return Math.max(0, 100 - (diff / buffer) * 100);
  }
  if (val > max) {
    const diff = val - max;
    return Math.max(0, 100 - (diff / buffer) * 100);
  }
  
  return 0;
};

// ─── AI RECOMMENDATION ENGINE v2 ───────────────────────────────────────────

export const getAIv2Recommendations = (data) => {
  const recs = [];
  const { soil, weather, water, storage } = data;

  // Soil Intelligence
  if (soil.moisture < 30) {
    recs.push({
      id: 'irr_01', category: 'Irrigation', priority: 'High',
      title: 'Moisture Deficiency',
      message: `Soil moisture at ${soil.moisture}% is below critical threshold. Active root stress detected.`,
      action: 'Activate Pump'
    });
  }

  if (soil.ph < 6.0) {
    recs.push({
      id: 'soil_01', category: 'Soil', priority: 'Med',
      title: 'Acidity Warning',
      message: `pH levels (${soil.ph}) are trending acidic. Consider lime application.`,
      action: 'Soil Treat'
    });
  }

  // NPK Deficiencies
  if (soil.npk?.n < 50) {
    recs.push({
      id: 'npk_n', category: 'Fertilizer', priority: 'High',
      title: 'Nitrogen Depletion',
      message: `Nitrogen at ${soil.npk.n} kg/ha. Growth stagnation risk detected.`,
      action: 'Apply Urea'
    });
  }
  if (soil.npk?.p < 30) {
    recs.push({
      id: 'npk_p', category: 'Fertilizer', priority: 'Med',
      title: 'Phosphorus Warning',
      message: `Low Phosphorus (${soil.npk.p}) may impact root development.`,
      action: 'Apply DAP'
    });
  }

  // Weather Intelligence
  if (weather.temp > 35) {
    recs.push({
      id: 'wx_01', category: 'Weather', priority: 'High',
      title: 'Extreme Heat Stress',
      message: `Ambient temp ${weather.temp}°C. Evapotranspiration rates increased.`,
      action: 'Mist System'
    });
  }

  // Storage Intelligence
  if (storage.mq135 > 350) {
    recs.push({
      id: 'st_01', category: 'Storage', priority: 'High',
      title: 'Ethylene Incursion',
      message: `MQ135 gas levels at ${storage.mq135}ppm. Spoilage risk in Vault A.`,
      action: 'Ventilate'
    });
  }

  return recs.length > 0 ? recs : [{
    id: 'gen_01', category: 'General', priority: 'Low',
    title: 'System Stable',
    message: 'All parameters within optimal industrial range.',
    action: 'Monitor'
  }];
};

// ─── HEALTH CALCULATION ENGINE ──────────────────────────────────────────────

/**
 * Calculates the overall farm health score.
 */
export const calculateOverallHealth = (systemHealth, devices = {}) => {
  // Build score list: only include nodes that are physically ACTIVE or PARTIAL
  const scores = Object.entries(systemHealth)
    .filter(([nodeType, score]) => {
      if (score === null || score === undefined) return false;
      const deviceKey = `${nodeType === 'water' ? 'water' : nodeType}_node`;
      const device = devices[deviceKey];
      return device && (device.status === 'ACTIVE' || device.status === 'PARTIAL');
    })
    .map(([, score]) => score);

  if (scores.length === 0) return null;

  const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const min = scores.length > 0 ? Math.min(...scores) : 0;

  if (scores.length === 0) return 0;
  // Safety-First: If ANY active node is critical (< 40), it dominates the overall score
  if (min < 40) return Math.round((avg * 0.2) + (min * 0.8));
  // If any active node is warning (< 65), apply moderate penalty
  if (min < 65) return Math.round((avg * 0.6) + (min * 0.4));

  return Math.round(avg);
};

/**
 * Calculates health for a specific node type.
 */
export const calculateNodeHealth = (nodeType, data) => {
  if (!data) return null;

  const scores = [];
  const weights = [];

  switch (nodeType) {
    case 'soil': {
      const s = data;
      const mScore = getParamScore(s.moisture, 30, 70, 20);
      const phScore = getParamScore(s.ph, 5.8, 7.8, 1.0);
      const nScore = getParamScore(s.npk?.n, 70, 120, 30);
      const pScore = getParamScore(s.npk?.p, 40, 70, 20);
      const kScore = getParamScore(s.npk?.k, 150, 250, 50);
      
      if (mScore !== null) { scores.push(mScore); weights.push(0.40); }
      if (phScore !== null) { scores.push(phScore); weights.push(0.20); }
      if (nScore !== null) { scores.push(nScore); weights.push(0.15); }
      if (pScore !== null) { scores.push(pScore); weights.push(0.15); }
      if (kScore !== null) { scores.push(kScore); weights.push(0.10); }
      break;
    }
    case 'weather': {
      const w = data;
      const tScore = getParamScore(w.temp, 15, 38, 10); // General ambient temp
      const hScore = getParamScore(w.humidity, 30, 80, 20); // General humidity range
      const lScore = getParamScore(w.lightIntensity, 1000, 8000, 2000); // Realistic outdoor daylight range (1k-8k lux)
      const rScore = getParamScore(w.rainLevel, 0, 30, 20); // Stable rain range

      if (tScore !== null) { scores.push(tScore); weights.push(0.30); }
      if (hScore !== null) { scores.push(hScore); weights.push(0.20); }
      if (lScore !== null) { scores.push(lScore); weights.push(0.20); }
      if (rScore !== null) { scores.push(rScore); weights.push(0.30); }
      break;
    }
    case 'storage': {
      const st = data;
      const tScore = getParamScore(st.temp, 4, 25, 10); // General storage temp
      const hScore = getParamScore(st.humidity, 60, 90, 15); // General storage humidity
      const gScore = getParamScore(st.mq135, 0, 400, 200); // Standard air quality

      if (tScore !== null) { scores.push(tScore); weights.push(0.40); }
      if (hScore !== null) { scores.push(hScore); weights.push(0.30); }
      if (gScore !== null) { scores.push(gScore); weights.push(0.30); }
      break;
    }
    case 'irrigation':
    case 'water': {
      const ir = data;
      const lScore = getParamScore(ir.level, 20, 100, 60); // Broader level range
      if (lScore === null) break; // If primary telemetry is missing, don't score

      const pScore = ir.pumpActive ? 100 : 90; 

      scores.push(lScore); weights.push(0.70);
      scores.push(pScore); weights.push(0.30);
      break;
    }
    default: return null;
  }

  if (scores.length === 0) return null;

  // Weighted average calculation
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const weightedSum = scores.reduce((sum, score, i) => sum + (score * weights[i]), 0);
  
  return Math.round(weightedSum / totalWeight);
};

/**
 * Returns color hex code based on health score.
 */
export const getHealthColor = (score) => {
  if (score === null || score === undefined) return '#94A3B8'; // Neutral
  if (score >= 80) return '#10B981'; // Healthy
  if (score >= 50) return '#F59E0B'; // Warning
  return '#EF4444'; // Critical
};
