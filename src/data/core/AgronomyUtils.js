import { 
  Wheat, Sprout, Sun, Shrub, Clover, Bean, Leaf, Nut, Apple, Citrus, 
  Flower, Carrot, Droplets, Zap, FlaskConical, Activity, Minus, Banana, 
  Grape, TreePine, Cherry, Shell, Brain, Trees, Milk, Cloud, Waves, 
  TrendingUp, TrendingDown, Coffee, MapPin, Calculator, RefreshCw,
  ShieldCheck, AlertCircle, CheckCircle2, XCircle, Clock, BarChart3,
  Search, X, ChevronRight, Scale, Microscope, Sparkles, Info,
  AlertTriangle, Trees as TreesIcon, CloudRain, Thermometer, ChevronDown
} from 'lucide-react';

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const isAvailable = (val) => val !== undefined && val !== null && val !== '' && val !== '---';
export const isAvailableLoc = (v) => v !== null && v !== undefined && v !== '' && v !== '---';

export const detectSoilType = (ph, moist, n, p, k) => {
  if (!isAvailableLoc(ph) || !isAvailableLoc(moist)) return 'Missing';
  
  const vPh = parseFloat(ph);
  const vMoist = parseFloat(moist);
  const vN = parseFloat(n || 0);
  const vP = parseFloat(p || 0);
  const vK = parseFloat(k || 0);

  // 1. Loamy: pH 6-7 && moisture medium && good NPK
  if (vPh >= 6 && vPh <= 7.2 && vMoist >= 35 && vMoist <= 65 && vN > 30 && vP > 30 && vK > 30) {
    return 'Loamy';
  }

  // 2. Sandy: low moisture
  if (vMoist < 35) {
    return 'Sandy';
  }

  // 3. Clay: high moisture
  if (vMoist > 65) {
    return 'Clay';
  }

  return 'Loamy'; // Default fallback for stable fields
};

export const getPHLabel = (ph) => {
  if (!isAvailableLoc(ph)) return '---';
  const v = parseFloat(ph);
  if (v < 6.0) return 'Acidic';
  if (v <= 7.5) return 'Neutral';
  return 'Alkaline';
};

export const getMoistureLabel = (moist) => {
  if (!isAvailableLoc(moist)) return '---';
  const v = parseFloat(moist);
  if (v < 35) return 'Dry';
  if (v <= 65) return 'Medium';
  return 'Wet';
};

export const getFertilityLabel = (n, p, k) => {
  if (!isAvailableLoc(n) || !isAvailableLoc(p) || !isAvailableLoc(k)) return '---';
  const avg = (parseFloat(n) + parseFloat(p) + parseFloat(k)) / 3;
  if (avg > 60) return 'High Fertility';
  if (avg > 30) return 'Medium Fertility';
  return 'Low Fertility';
};

const CLIMATE_ZONES = {
  'wb': 'Subtropical',
  'rajasthan': 'Arid',
  'punjab': 'Semi-Arid',
  'haryana': 'Semi-Arid',
  'karnataka': 'Tropical',
  'maharashtra': 'Tropical',
  'himachal': 'Temperate',
  'uttarakhand': 'Temperate',
  'kerala': 'Tropical Humid',
  'tamil nadu': 'Tropical Coastal',
  'india': 'Subtropical'
};

export const getLocationClimate = (loc) => {
  if (!loc) return 'Unknown';
  const l = loc.toLowerCase();
  for (const [key, zone] of Object.entries(CLIMATE_ZONES)) {
    if (l.includes(key)) return zone;
  }
  return 'Subtropical'; // Default Indian climate
};

/**
 * Advanced Climate Matching Logic
 * Detects compatibility between crop required climate and user local climate.
 */
export const isClimateCompatible = (cropLoc, userLoc) => {
  if (!cropLoc || !userLoc) return false;
  const idl = cropLoc.toLowerCase();
  const cur = userLoc.toLowerCase();
  
  if (idl === 'all' || idl.includes('india') || idl.includes('any')) return true;

  // 1. Tokenized Matching (Space, Slash, Comma)
  const idlWords = idl.split(/[\/\s,]+/).filter(w => w.length > 2);
  const curWords = cur.split(/[\/\s,]+/).filter(w => w.length > 2);
  
  const hasDirectOverlap = curWords.some(cw => idlWords.some(iw => iw.includes(cw) || cw.includes(iw)));
  if (hasDirectOverlap) return true;

  // 2. High-Fidelity Agronomic Overlaps
  const isTropicalUser = cur.includes('tropical');
  const isSubtropicalUser = cur.includes('subtropical');
  const isTropicalCrop = idl.includes('tropical');
  const isSubtropicalCrop = idl.includes('subtropical');

  // Tropical/Subtropical are generally interchangeable for modern cultivars
  if ((isTropicalUser && isSubtropicalCrop) || (isSubtropicalUser && isTropicalCrop)) return true;
  
  // Specific coastal/wetland mappings
  if (idl.includes('wetland') && isTropicalUser) return true;
  if (idl.includes('coastal') && (cur.includes('humid') || cur.includes('tropical'))) return true;

  return false;
};

export const getCropIcon = (type, name = '') => {
  const t = type?.toLowerCase() || '';
  const n = name?.toLowerCase() || '';

  // 🌾 GRAINS & CEREALS
  if (n.includes('rice') || n.includes('paddy')) return { icon: Wheat, color: '#10B981' }; 
  if (n.includes('wheat')) return { icon: Wheat, color: '#EAB308' }; 
  if (n.includes('maize') || n.includes('corn')) return { icon: Sun, color: '#FACC15' }; 
  if (n.includes('barley')) return { icon: Wheat, color: '#D97706' }; 
  if (n.includes('bajra')) return { icon: Sprout, color: '#84CC16' }; 
  if (n.includes('jowar')) return { icon: Shrub, color: '#65A30D' }; 
  if (n.includes('ragi')) return { icon: Clover, color: '#4D7C0F' }; 

  // 🫘 PULSES (LEGUMES)
  if (n.includes('arhar') || n.includes('tur')) return { icon: Bean, color: '#A855F7' }; 
  if (n.includes('gram') || n.includes('chana')) return { icon: Bean, color: '#92400E' }; 
  if (n.includes('moong')) return { icon: Bean, color: '#22C55E' }; 
  if (n.includes('urad')) return { icon: Bean, color: '#1E293B' }; 
  if (n.includes('masoor')) return { icon: Bean, color: '#F97316' }; 
  if (n.includes('kidney') || n.includes('rajma')) return { icon: Bean, color: '#B91C1C' }; 
  if (n.includes('moth')) return { icon: Bean, color: '#78350F' }; 

  // 🥗 VEGETABLES & GREENS
  if (n.includes('potato')) return { icon: Nut, color: '#D97706' };
  if (n.includes('tomato')) return { icon: Apple, color: '#EF4444' };
  if (n.includes('onion')) return { icon: Citrus, color: '#D946EF' }; 
  if (n.includes('brinjal')) return { icon: Apple, color: '#7C3AED' }; 
  if (n.includes('cabbage')) return { icon: Shrub, color: '#22C55E' };
  if (n.includes('cauliflower')) return { icon: Flower, color: '#CBD5E1' }; 
  if (n.includes('spinach')) return { icon: Leaf, color: '#15803D' };
  if (n.includes('okra')) return { icon: Leaf, color: '#16A34A' }; 
  if (n.includes('carrot')) return { icon: Carrot, color: '#F97316' };
  if (n.includes('radish')) return { icon: Carrot, color: '#F1F5F9' }; 
  if (n.includes('peas')) return { icon: Droplets, color: '#16A34A' }; 
  if (n.includes('capsicum')) return { icon: Citrus, color: '#10B981' }; 
  if (n.includes('chili')) return { icon: Zap, color: '#EF4444' }; 
  if (n.includes('pumpkin')) return { icon: Citrus, color: '#F97316' };
  if (n.includes('bottle gourd')) return { icon: FlaskConical, color: '#4ADE80' }; 
  if (n.includes('bitter gourd')) return { icon: Activity, color: '#166534' }; 
  if (n.includes('cucumber')) return { icon: Minus, color: '#22C55E' };
  if (n.includes('beans')) return { icon: Leaf, color: '#10B981' };
  if (n.includes('garlic')) return { icon: Nut, color: '#E2E8F0' };
  if (n.includes('fenugreek')) return { icon: Clover, color: '#16A34A' };
  if (n.includes('coriander')) return { icon: Shrub, color: '#22C55E' };
  if (n.includes('mint')) return { icon: Leaf, color: '#4ADE80' };

  // 🍎 FRUITS & NUTS
  if (n.includes('mango')) return { icon: Citrus, color: '#FBBF24' };
  if (n.includes('banana')) return { icon: Banana, color: '#EAB308' };
  if (n.includes('apple')) return { icon: Apple, color: '#EF4444' };
  if (n.includes('guava')) return { icon: Citrus, color: '#4ADE80' };
  if (n.includes('orange')) return { icon: Citrus, color: '#F97316' };
  if (n.includes('papaya')) return { icon: Citrus, color: '#F59E0B' };
  if (n.includes('pomegranate')) return { icon: Apple, color: '#B91C1C' };
  if (n.includes('grapes')) return { icon: Grape, color: '#8B5CF6' };
  if (n.includes('pineapple')) return { icon: TreePine, color: '#EAB308' };
  if (n.includes('watermelon')) return { icon: Citrus, color: '#15803D' };
  if (n.includes('muskmelon')) return { icon: Citrus, color: '#FBBF24' };
  if (n.includes('litchi')) return { icon: Cherry, color: '#EF4444' };
  if (n.includes('coconut')) return { icon: Nut, color: '#78350F' };
  if (n.includes('cashew')) return { icon: Shell, color: '#D97706' };
  if (n.includes('almond')) return { icon: Nut, color: '#92400E' };
  if (n.includes('walnut')) return { icon: Brain, color: '#78350F' };

  // 💰 CASH & PLANTATION
  if (n.includes('sugarcane')) return { icon: Trees, color: '#22C55E' };
  if (n.includes('coffee')) return { icon: Coffee, color: '#78350F' };
  if (n.includes('tea')) return { icon: Leaf, color: '#15803D' };
  if (n.includes('rubber')) return { icon: Milk, color: '#F8FAFC' };
  if (n.includes('ginger') || n.includes('turmeric')) return { icon: Nut, color: '#D97706' };
  if (n.includes('cumin')) return { icon: Wheat, color: '#92400E' };
  if (n.includes('pepper')) return { icon: Nut, color: '#1E293B' };
  if (n.includes('cardamom')) return { icon: Sprout, color: '#16A34A' };

  // 🧵 FIBER & OILSEEDS
  if (n.includes('cotton')) return { icon: Cloud, color: '#F1F5F9' };
  if (n.includes('jute')) return { icon: Waves, color: '#94A3B8' };
  if (n.includes('groundnut')) return { icon: Nut, color: '#D97706' };
  if (n.includes('mustard')) return { icon: Flower, color: '#FACC15' };
  if (n.includes('soybean')) return { icon: Sprout, color: '#F1F5F9' };
  if (n.includes('sunflower')) return { icon: Sun, color: '#FBBF24' };

  // 🌸 FLOWERS
  if (n.includes('rose')) return { icon: Flower, color: '#EF4444' };
  if (n.includes('marigold')) return { icon: Flower, color: '#F97316' };
  if (n.includes('jasmine') || n.includes('lily')) return { icon: Flower, color: '#F1F5F9' };
  if (n.includes('lotus')) return { icon: Flower, color: '#F472B6' };
  if (n.includes('hibiscus')) return { icon: Flower, color: '#EC4899' };
  if (n.includes('chrysanthemum')) return { icon: Flower, color: '#FBBF24' };
  if (n.includes('tuberose')) return { icon: Flower, color: '#E2E8F0' };
  if (n.includes('orchid')) return { icon: Flower, color: '#8B5CF6' };

  // Category Fallbacks
  if (t.includes('seed')) return { icon: Sprout, color: '#6366F1' };
  if (t.includes('grain')) return { icon: Wheat, color: '#EAB308' };
  if (t.includes('veg')) return { icon: Carrot, color: '#22C55E' };
  if (t.includes('fruit')) return { icon: Apple, color: '#F97316' };
  if (t.includes('flower')) return { icon: Flower, color: '#EC4899' };
  
  return { icon: Sprout, color: '#10B981' };
};

export const getDemandIcon = (demand) => {
  const d = demand?.toLowerCase() || '';
  if (d.includes('high')) return TrendingUp;
  if (d.includes('low')) return TrendingDown;
  return Activity;
};

export const getDemandColor = (demand) => {
  const d = demand?.toLowerCase() || '';
  if (d.includes('high')) return '#10B981';
  if (d.includes('medium')) return '#F59E0B';
  return '#94A3B8';
};

export const formatCropName = (name) => {
  if (!name) return '';
  return name.split('(')[0].trim().replace(/\b\w/g, l => l.toUpperCase());
};

export const parseCSV = (t) => {
  if (!t || t.trim().length === 0) return [];
  const lines = t.trim().split('\n');
  if (lines.length < 1) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
  
  return lines.slice(1).map(line => {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) {
        values.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^"|"$/g, ''));
    return headers.reduce((obj, header, i) => { obj[header] = values[i]; return obj; }, {});
  });
};

export const aggregateCropProfiles = (data) => {
  if (!Array.isArray(data) || data.length === 0) return {};
  const crops = {};
  data.forEach(row => {
    if (!row || typeof row !== 'object') return;
    const label = row.label?.toLowerCase().trim();
    if (!label) return;
    if (!crops[label]) {
      crops[label] = { 
        n: [], p: [], k: [], temperature: [], humidity: [], ph: [], rainfall: [],
        season: row.season || 'Kharif', 
        soil: row.soil_type || 'Loamy', 
        loc: row.location || 'India', 
        sow: row.sowing_time || 'Jan-Dec',
        fert: row.fertilizer || 'Balanced NPK', 
        comp: row.compost || 'Organic Manure', 
        pest: row.pest_control || 'Standard Control'
      };
    }
    ['n', 'p', 'k', 'temperature', 'humidity', 'ph', 'rainfall'].forEach(key => {
      const val = parseFloat(row[key]); 
      if (!isNaN(val)) crops[label][key].push(val);
    });
  });
  
  const final = {};
  Object.keys(crops).forEach(label => {
    const r = crops[label];
    const getMid = (arr) => {
      if (arr.length === 0) return 0;
      const min = Math.min(...arr);
      const max = Math.max(...arr);
      return { min, max, mid: (min + max) / 2 };
    };
    final[label] = { 
      ...r,
      n: getMid(r.n), p: getMid(r.p), k: getMid(r.k), 
      temperature: getMid(r.temperature), 
      humidity: getMid(r.humidity), 
      ph: getMid(r.ph), 
      rainfall: getMid(r.rainfall)
    };
  });
  return final;
};
