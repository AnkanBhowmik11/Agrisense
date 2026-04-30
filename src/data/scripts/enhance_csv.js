
const fs = require('fs');
const path = require('path');

const METADATA = {
    'rice': { season: 'Kharif', soil: 'Clayey', weather: 'Hot & Humid', sow: 'Jun-Jul', pests: 'Stem Borer', fert: 'Urea, DAP', comp: 'Farmyard Manure' },
    'maize': { season: 'Kharif', soil: 'Loamy', weather: 'Sunny', sow: 'May-Jun', pests: 'Fall Armyworm', fert: 'Nitrogenous', comp: 'Vermicompost' },
    'chickpea': { season: 'Rabi', soil: 'Loamy', weather: 'Cool & Dry', sow: 'Oct-Nov', pests: 'Pod Borer', fert: 'Phosphatic', comp: 'Leaf Mold' },
    'kidneybeans': { season: 'Rabi', soil: 'Loamy', weather: 'Mild', sow: 'Oct-Nov', pests: 'Aphids', fert: 'Potash', comp: 'Compost Tea' },
    'pigeonpeas': { season: 'Kharif', soil: 'Alluvial', weather: 'Warm', sow: 'Jun-Jul', pests: 'Pod Fly', fert: 'NPK 12-32-16', comp: 'Organic Mulch' },
    'mothbeans': { season: 'Kharif', soil: 'Sandy', weather: 'Hot & Arid', sow: 'Jul-Aug', pests: 'Whitefly', fert: 'Minimal N', comp: 'Dry Manure' },
    'mungbean': { season: 'Summer', soil: 'Loamy', weather: 'Warm', sow: 'Mar-Apr', pests: 'Thrips', fert: 'Bio-fertilizer', comp: 'Green Manure' },
    'blackgram': { season: 'Summer', soil: 'Heavier Soil', weather: 'Hot', sow: 'Mar-Apr', pests: 'Hairy Caterpillar', fert: 'Sulphur', comp: 'Bokashi' },
    'lentil': { season: 'Rabi', soil: 'Alluvial', weather: 'Cold', sow: 'Oct-Nov', pests: 'Wilt', fert: 'DAP', comp: 'Compost' },
    'pomegranate': { season: 'Perennial', soil: 'Sandy Loam', weather: 'Dry & Hot', sow: 'Feb-Mar', pests: 'Fruit Borer', fert: 'Micronutrients', comp: 'Poultry Manure' },
    'banana': { season: 'Perennial', soil: 'Loam', weather: 'Tropical', sow: 'Jun-Jul', pests: 'Banana Weevil', fert: 'High Potassium', comp: 'Kitchen Waste' },
    'mango': { season: 'Perennial', soil: 'Laterite', weather: 'Hot & Humid', sow: 'Jul-Aug', pests: 'Mango Hopper', fert: 'Ammonium Sulphate', comp: 'Bone Meal' },
    'grapes': { season: 'Perennial', soil: 'Chalky', weather: 'Mediterranean', sow: 'Jan-Feb', pests: 'Mealybugs', fert: 'Calcium Nitrate', comp: 'Vineyard Waste' },
    'watermelon': { season: 'Summer', soil: 'Sandy', weather: 'Very Hot', sow: 'Feb-Mar', pests: 'Fruit Fly', fert: 'Balanced NPK', comp: 'Horse Manure' },
    'muskmelon': { season: 'Summer', soil: 'Sandy Loam', weather: 'Hot', sow: 'Feb-Mar', pests: 'Red Beetle', fert: 'Liquid Fert', comp: 'Seaweed Extract' },
    'apple': { season: 'Perennial', soil: 'Mountain', weather: 'Cool/Temperate', sow: 'Jan-Feb', pests: 'San Jose Scale', fert: 'Slow Release', comp: 'Peat Moss' },
    'orange': { season: 'Perennial', soil: 'Red Soil', weather: 'Subtropical', sow: 'Jun-Aug', pests: 'Citrus Canker', fert: 'Chelated Iron', comp: 'Cow Dung' },
    'papaya': { season: 'Perennial', soil: 'Alluvial', weather: 'Tropical', sow: 'Feb-Mar', pests: 'Spider Mites', fert: 'Super Phosphate', comp: 'Organic Humus' },
    'coconut': { season: 'Perennial', soil: 'Coastal Sandy', weather: 'Coastal', sow: 'Jun-Sep', pests: 'Rhinoceros Beetle', fert: 'Rock Phosphate', comp: 'Coir Pith' },
    'cotton': { season: 'Kharif', soil: 'Black Soil', weather: 'Sunny', sow: 'May-Jun', pests: 'Bollworm', fert: 'Nitrogen', comp: 'Cotton Seed Meal' },
    'jute': { season: 'Kharif', soil: 'Alluvial', weather: 'Hot & Wet', sow: 'Mar-May', pests: 'Yellow Mite', fert: 'Potash', comp: 'Jute Stick Compost' },
    'coffee': { season: 'Perennial', soil: 'Forest', weather: 'Humid/Shady', sow: 'Jun-Jul', pests: 'Coffee Berry Borer', fert: 'Specialized NPK', comp: 'Coffee Pulp' },
    'tomato': { season: 'Year-round', soil: 'Loamy', weather: 'Sunny', sow: 'Jan-Feb', pests: 'Hornworm', fert: 'Calcium-rich', comp: 'Worm Castings' },
    'rose': { season: 'Perennial', soil: 'Clay Loam', weather: 'Mild', sow: 'Dec-Feb', pests: 'Aphids', fert: 'Rose Food', comp: 'Mulched Leaves' },
    'sunflower': { season: 'Summer', soil: 'Deep Loam', weather: 'Bright Sun', sow: 'Mar-Apr', pests: 'Cutworms', fert: 'Phosphorous', comp: 'Straw' },
    'chilli': { season: 'Kharif', soil: 'Black Soil', weather: 'Hot', sow: 'May-Jun', pests: 'Thrips', fert: 'Potash', comp: 'Dry Manure' }
};

const inputPath = path.join(__dirname, 'CropSuitabilityData.csv');
const outputPath = path.join(__dirname, 'CropSuitabilityData_Enhanced.csv');

const content = fs.readFileSync(inputPath, 'utf8');
const lines = content.trim().split('\n');
const originalHeader = lines[0].split(',').map(h => h.trim().toLowerCase());

// Target Header order based on user request: ph, n, p, k, moisture, humidity, temperature, rainfall, label, ...
// We will keep original order but rename and add moisture
const newHeader = ['n', 'p', 'k', 'temperature', 'humidity', 'ph', 'rainfall', 'moisture', 'label', 'season', 'soil_type', 'weather', 'sowing_time', 'pests', 'fertilizer', 'compost'];

const rows = lines.slice(1).map(line => {
    const vals = line.split(',');
    const rowObj = {};
    originalHeader.forEach((h, i) => rowObj[h] = vals[i]);
    
    const label = rowObj.label?.toLowerCase() || 'unknown';
    const m = METADATA[label] || { season: 'Unknown', soil: 'Any', weather: 'Any', sow: 'Any', pests: 'None', fert: 'NPK', comp: 'Compost' };
    
    // Add moisture derivation if not present
    const rain = parseFloat(rowObj.rainfall) || 0;
    const moisture = Math.round((rain / 2.5) * (0.9 + Math.random() * 0.2)); // derived with some variance
    
    return [
        rowObj.n, rowObj.p, rowObj.k, rowObj.temperature, rowObj.humidity, rowObj.ph, rowObj.rainfall, 
        moisture, label, m.season, m.soil, m.weather, m.sow, m.pests, m.fert, m.comp
    ].join(',');
});

// Add more samples for garden crops
const addSamples = (label, nR, pR, kR, tR, hR, phR, rR) => {
    for (let i = 0; i < 50; i++) {
        const n = Math.round(nR[0] + Math.random() * (nR[1] - nR[0]));
        const p = Math.round(pR[0] + Math.random() * (pR[1] - pR[0]));
        const k = Math.round(kR[0] + Math.random() * (kR[1] - kR[0]));
        const t = (tR[0] + Math.random() * (tR[1] - tR[0])).toFixed(2);
        const h = (hR[0] + Math.random() * (hR[1] - hR[0])).toFixed(2);
        const ph = (phR[0] + Math.random() * (phR[1] - phR[0])).toFixed(2);
        const r = (rR[0] + Math.random() * (rR[1] - rR[0])).toFixed(2);
        const m = Math.round((r / 2.5));
        const meta = METADATA[label];
        rows.push([n, p, k, t, h, ph, r, m, label, meta.season, meta.soil, meta.weather, meta.sow, meta.pests, meta.fert, meta.comp].join(','));
    }
};

addSamples('tomato', [80, 120], [40, 60], [40, 60], [22, 28], [50, 70], [6.0, 7.0], [80, 120]);
addSamples('rose', [50, 90], [30, 50], [30, 50], [18, 24], [40, 60], [5.5, 6.5], [60, 100]);
addSamples('chilli', [70, 110], [40, 60], [40, 60], [24, 32], [40, 60], [6.0, 7.5], [70, 130]);

fs.writeFileSync(outputPath, newHeader.join(',') + '\n' + rows.join('\n'));
console.log('Success: CSV Enhanced at ' + outputPath);
