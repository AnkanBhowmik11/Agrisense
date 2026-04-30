
const fs = require('fs');
const path = require('path');

// ─── INDUSTRIAL CROP AGRONOMY DATA ──────────────────────────────────────────
// Sourced from standard agricultural research and aligned with IndiaCropAreaProfile.csv.
// Labels are updated to match the user's structured classification.

const CROP_SPECS = {
    // Major Field Crops
    'rice': { n: [80, 100], p: [40, 60], k: [40, 60], ph: [5.5, 6.5], rain: [1200, 2500], hum: [80, 85], temp: [20, 27] },
    'wheat': { n: [100, 120], p: [40, 60], k: [40, 60], ph: [6.0, 7.5], rain: [600, 800], hum: [50, 70], temp: [15, 25] },
    'maize (corn)': { n: [100, 120], p: [50, 70], k: [40, 60], ph: [5.5, 7.0], rain: [500, 800], hum: [60, 80], temp: [18, 27] },
    'barley': { n: [60, 90], p: [30, 40], k: [30, 40], ph: [6.0, 8.0], rain: [400, 600], hum: [40, 60], temp: [12, 22] },
    'bajra': { n: [40, 60], p: [20, 30], k: [10, 20], ph: [6.5, 8.5], rain: [400, 600], hum: [40, 60], temp: [25, 35] },
    'jowar': { n: [80, 100], p: [40, 50], k: [20, 30], ph: [6.0, 8.0], rain: [450, 750], hum: [40, 60], temp: [25, 32] },
    'ragi': { n: [40, 60], p: [30, 40], k: [20, 30], ph: [4.5, 7.5], rain: [500, 1000], hum: [50, 80], temp: [20, 30] },
    'arhar/tur': { n: [20, 40], p: [40, 60], k: [20, 30], ph: [6.5, 7.5], rain: [600, 1000], hum: [60, 70], temp: [20, 30] },
    'gram/chana': { n: [20, 30], p: [40, 60], k: [20, 30], ph: [6.0, 7.5], rain: [400, 600], hum: [50, 60], temp: [15, 25] },
    'moong': { n: [20, 30], p: [40, 50], k: [20, 30], ph: [6.5, 7.5], rain: [600, 800], hum: [60, 75], temp: [25, 35] },
    'urad': { n: [20, 30], p: [40, 50], k: [20, 30], ph: [6.5, 7.5], rain: [600, 1000], hum: [60, 80], temp: [25, 35] },
    'masoor': { n: [20, 30], p: [40, 50], k: [20, 30], ph: [6.0, 7.5], rain: [300, 500], hum: [50, 60], temp: [15, 25] },
    'sugarcane': { n: [200, 250], p: [80, 100], k: [120, 150], ph: [6.5, 7.5], rain: [1500, 2500], hum: [70, 85], temp: [25, 35] },
    'cotton': { n: [100, 120], p: [50, 60], k: [40, 50], ph: [6.0, 7.5], rain: [500, 1000], hum: [50, 70], temp: [25, 35] },
    'jute': { n: [60, 80], p: [40, 50], k: [60, 80], ph: [6.0, 7.5], rain: [1500, 2000], hum: [70, 90], temp: [25, 35] },
    'groundnut (peanut)': { n: [20, 40], p: [40, 60], k: [30, 50], ph: [6.0, 7.5], rain: [500, 1000], hum: [50, 70], temp: [25, 35] },
    'mustard': { n: [80, 100], p: [40, 60], k: [40, 60], ph: [6.0, 7.5], rain: [400, 600], hum: [40, 60], temp: [15, 25] },
    'soybean': { n: [20, 40], p: [60, 80], k: [40, 60], ph: [6.0, 7.5], rain: [600, 1000], hum: [60, 80], temp: [20, 30] },
    'sunflower': { n: [60, 80], p: [40, 60], k: [30, 40], ph: [6.0, 7.5], rain: [500, 800], hum: [40, 60], temp: [20, 30] },

    // Vegetables
    'potato': { n: [120, 150], p: [80, 100], k: [150, 200], ph: [5.5, 6.5], rain: [500, 700], hum: [70, 90], temp: [15, 25] },
    'tomato': { n: [100, 120], p: [60, 80], k: [80, 100], ph: [6.0, 7.0], rain: [600, 800], hum: [60, 80], temp: [20, 30] },
    'onion': { n: [100, 120], p: [50, 60], k: [80, 100], ph: [6.0, 7.0], rain: [600, 800], hum: [60, 75], temp: [15, 30] },
    'brinjal (eggplant)': { n: [100, 120], p: [60, 80], k: [40, 60], ph: [5.5, 6.5], rain: [600, 1000], hum: [60, 70], temp: [20, 30] },
    'cabbage': { n: [120, 150], p: [60, 100], k: [100, 120], ph: [6.0, 6.8], rain: [500, 600], hum: [60, 90], temp: [15, 21] },
    'cauliflower': { n: [100, 120], p: [60, 80], k: [80, 100], ph: [6.0, 7.0], rain: [500, 700], hum: [60, 75], temp: [15, 25] },
    'spinach': { n: [80, 100], p: [40, 50], k: [60, 80], ph: [6.0, 7.0], rain: [400, 600], hum: [60, 70], temp: [15, 25] },
    'okra (ladyfinger)': { n: [80, 100], p: [50, 70], k: [50, 70], ph: [6.0, 6.8], rain: [800, 1200], hum: [60, 75], temp: [20, 35] },
    'carrot': { n: [60, 80], p: [40, 60], k: [100, 120], ph: [6.0, 7.0], rain: [400, 600], hum: [60, 70], temp: [15, 20] },
    'radish': { n: [50, 70], p: [30, 50], k: [50, 70], ph: [6.0, 7.0], rain: [300, 500], hum: [60, 70], temp: [10, 25] },
    'peas': { n: [20, 40], p: [50, 70], k: [40, 60], ph: [6.0, 7.5], rain: [400, 600], hum: [60, 70], temp: [10, 20] },
    'capsicum (bell pepper)': { n: [100, 120], p: [60, 80], k: [60, 80], ph: [6.0, 7.0], rain: [600, 1000], hum: [60, 75], temp: [20, 30] },
    'chili': { n: [100, 120], p: [60, 80], k: [60, 80], ph: [6.0, 7.0], rain: [800, 1200], hum: [60, 70], temp: [20, 30] },
    'pumpkin': { n: [60, 80], p: [40, 60], k: [80, 100], ph: [5.5, 6.5], rain: [500, 800], hum: [60, 75], temp: [25, 35] },
    'bottle gourd (lauki)': { n: [40, 60], p: [30, 40], k: [30, 40], ph: [6.0, 7.0], rain: [500, 800], hum: [60, 70], temp: [25, 35] },
    'bitter gourd (karela)': { n: [40, 60], p: [30, 40], k: [30, 40], ph: [6.0, 7.0], rain: [500, 800], hum: [60, 70], temp: [25, 35] },
    'cucumber': { n: [60, 80], p: [40, 60], k: [80, 100], ph: [5.5, 6.5], rain: [500, 800], hum: [60, 80], temp: [25, 35] },
    'beans': { n: [20, 40], p: [60, 80], k: [40, 60], ph: [6.0, 7.5], rain: [600, 800], hum: [60, 75], temp: [20, 30] },

    // Fruits
    'mango': { n: [60, 80], p: [30, 40], k: [60, 80], ph: [5.5, 7.5], rain: [1000, 2000], hum: [50, 70], temp: [25, 35] },
    'banana': { n: [150, 200], p: [50, 60], k: [200, 300], ph: [6.5, 7.5], rain: [1500, 2500], hum: [70, 85], temp: [25, 32] },
    'apple': { n: [60, 80], p: [30, 40], k: [80, 100], ph: [5.5, 6.5], rain: [1000, 1500], hum: [60, 80], temp: [15, 25] },
    'guava': { n: [50, 70], p: [50, 70], k: [50, 70], ph: [4.5, 8.2], rain: [1000, 2000], hum: [60, 80], temp: [20, 30] },
    'orange': { n: [100, 120], p: [50, 70], k: [50, 70], ph: [5.5, 6.5], rain: [600, 1200], hum: [60, 80], temp: [20, 30] },
    'papaya': { n: [200, 250], p: [200, 250], k: [250, 300], ph: [6.0, 7.0], rain: [1500, 2000], hum: [60, 80], temp: [25, 35] },
    'pomegranate': { n: [60, 80], p: [30, 40], k: [30, 40], ph: [6.5, 7.5], rain: [500, 800], hum: [40, 60], temp: [25, 35] },
    'grapes': { n: [60, 80], p: [40, 50], k: [100, 120], ph: [6.5, 7.5], rain: [500, 800], hum: [60, 70], temp: [15, 30] },
    'pineapple': { n: [100, 120], p: [40, 50], k: [100, 120], ph: [4.5, 5.5], rain: [1500, 2500], hum: [70, 90], temp: [22, 32] },
    'watermelon': { n: [80, 100], p: [40, 60], k: [40, 60], ph: [6.0, 7.0], rain: [400, 600], hum: [60, 75], temp: [25, 35] },
    'muskmelon': { n: [80, 100], p: [40, 60], k: [40, 60], ph: [6.0, 7.0], rain: [400, 600], hum: [60, 75], temp: [25, 35] },
    'litchi': { n: [60, 80], p: [40, 50], k: [40, 50], ph: [5.5, 6.5], rain: [1200, 1600], hum: [70, 80], temp: [25, 35] },
    'coconut': { n: [500, 600], p: [300, 400], k: [800, 1000], ph: [5.5, 8.0], rain: [1500, 2500], hum: [70, 90], temp: [25, 30] },

    // Flowers
    'rose': { n: [60, 80], p: [40, 50], k: [40, 50], ph: [6.0, 6.5], rain: [700, 1000], hum: [50, 70], temp: [15, 28] },
    'marigold': { n: [50, 60], p: [30, 40], k: [30, 40], ph: [6.5, 7.5], rain: [500, 800], hum: [40, 60], temp: [18, 30] },
    'jasmine': { n: [60, 80], p: [60, 80], k: [60, 80], ph: [6.0, 7.5], rain: [800, 1000], hum: [60, 80], temp: [25, 35] },
    'lotus': { n: [40, 50], p: [40, 50], k: [40, 50], ph: [6.0, 8.0], rain: [1000, 2000], hum: [80, 95], temp: [20, 35] },
    'hibiscus': { n: [40, 60], p: [40, 60], k: [40, 60], ph: [6.0, 7.0], rain: [1000, 1500], hum: [60, 80], temp: [20, 35] },
    'chrysanthemum': { n: [100, 120], p: [60, 80], k: [60, 80], ph: [6.5, 7.0], rain: [500, 700], hum: [60, 70], temp: [15, 25] },
    'tuberose (rajnigandha)': { n: [100, 120], p: [80, 100], k: [60, 80], ph: [6.5, 7.5], rain: [800, 1200], hum: [70, 80], temp: [20, 30] },
    'lily': { n: [50, 70], p: [50, 70], k: [100, 120], ph: [6.0, 7.0], rain: [800, 1200], hum: [60, 80], temp: [15, 25] },
    'orchid': { n: [20, 30], p: [20, 30], k: [20, 30], ph: [5.5, 6.5], rain: [1500, 2500], hum: [70, 90], temp: [18, 28] },

    // Seeds
    'paddy seeds': { n: [100, 120], p: [50, 60], k: [50, 60], ph: [6.0, 6.5], rain: [1500, 2500], hum: [85, 95], temp: [25, 32] },
    'wheat seeds': { n: [120, 140], p: [60, 80], k: [60, 80], ph: [6.5, 7.5], rain: [600, 800], hum: [60, 70], temp: [15, 25] },
    'tomato seeds': { n: [120, 140], p: [80, 100], k: [100, 120], ph: [6.5, 7.0], rain: [600, 800], hum: [70, 85], temp: [22, 28] },
    'chili seeds': { n: [120, 140], p: [80, 100], k: [80, 100], ph: [6.5, 7.0], rain: [800, 1200], hum: [70, 80], temp: [25, 30] },
    'brinjal seeds': { n: [120, 140], p: [80, 100], k: [60, 80], ph: [6.0, 7.0], rain: [600, 1000], hum: [70, 80], temp: [25, 30] },
    'mustard seeds': { n: [100, 120], p: [60, 80], k: [60, 80], ph: [6.5, 7.5], rain: [400, 600], hum: [50, 60], temp: [18, 25] },
    'sesame seeds': { n: [40, 60], p: [40, 60], k: [20, 40], ph: [6.0, 7.0], rain: [400, 600], hum: [50, 60], temp: [25, 35] },
    'coriander seeds': { n: [60, 80], p: [40, 60], k: [20, 40], ph: [6.0, 7.5], rain: [300, 500], hum: [50, 60], temp: [15, 25] },
    'fenugreek seeds': { n: [30, 50], p: [40, 60], k: [20, 40], ph: [6.0, 7.0], rain: [400, 600], hum: [50, 60], temp: [15, 25] },
    'fennel seeds': { n: [60, 90], p: [40, 60], k: [30, 50], ph: [6.5, 8.0], rain: [400, 600], hum: [50, 60], temp: [15, 25] }
};

const METADATA = {
    // Corrected Seasons per IndiaCropAreaProfile.csv
    'rice': { season: 'Kharif/Rabi', soil: 'Clayey/Alluvial', loc: 'Tropical/Wetlands', sow: 'Jun-Jul', pest: 'Stem Borer', fert: 'Urea, DAP', comp: 'Farmyard Manure' },
    'wheat': { season: 'Rabi', soil: 'Loamy', loc: 'North Plains', sow: 'Oct-Nov', pest: 'Rust', fert: 'Urea, Zinc', comp: 'Green Manure' },
    'maize (corn)': { season: 'Kharif/Rabi/Summer', soil: 'Loamy', loc: 'Plains', sow: 'May-Jun', pest: 'Fall Armyworm', fert: 'Nitrogenous', comp: 'Vermicompost' },
    'barley': { season: 'Rabi', soil: 'Sandy Loam', loc: 'North India', sow: 'Oct-Nov', pest: 'Aphids', fert: 'Urea', comp: 'Manure' },
    'bajra': { season: 'Kharif/Summer', soil: 'Sandy', loc: 'Arid Zones', sow: 'Jul-Aug', pest: 'Blister Beetle', fert: 'Minimal NPK', comp: 'Dry Manure' },
    'jowar': { season: 'Kharif/Rabi/Summer', soil: 'Black Soil', loc: 'Semi-arid', sow: 'Jun-Jul', pest: 'Stem Borer', fert: 'Nitrogenous', comp: 'Compost' },
    'ragi': { season: 'Kharif', soil: 'Red/Loamy', loc: 'Hilly Regions', sow: 'Jun-Jul', pest: 'Blast', fert: 'Bio-fertilizers', comp: 'Green Manure' },
    'arhar/tur': { season: 'Kharif', soil: 'Well-drained Loam', loc: 'Semi-arid', sow: 'Jun-Jul', pest: 'Pod Borer', fert: 'DAP, SSP', comp: 'Organic Mulch' },
    'gram/chana': { season: 'Rabi', soil: 'Loamy/Clayey', loc: 'North/Central India', sow: 'Oct-Nov', pest: 'Pod Borer', fert: 'NPK 18-18-10', comp: 'Leaf Mold' },
    'moong': { season: 'Summer/Kharif/Rabi', soil: 'Loamy', loc: 'Plains', sow: 'Mar-Apr', pest: 'Whitefly', fert: 'Bio-NPK', comp: 'Green Manure' },
    'urad': { season: 'Summer/Kharif/Rabi', soil: 'Heavy Loam', loc: 'Central India', sow: 'Jun-Jul', pest: 'Hairy Caterpillar', fert: 'Sulphur-rich', comp: 'Vermicompost' },
    'masoor': { season: 'Rabi', soil: 'Alluvial', loc: 'Cool Plains', sow: 'Oct-Nov', pest: 'Rust', fert: 'DAP', comp: 'Compost' },
    'sugarcane': { season: 'Annual', soil: 'Deep Loam', loc: 'Tropical Plains', sow: 'Feb-Mar', pest: 'Early Shoot Borer', fert: 'Urea, MOP', comp: 'Pressmud' },
    'cotton': { season: 'Kharif', soil: 'Black Soil', loc: 'Semi-arid/Sunny', sow: 'May-Jun', pest: 'Bollworm', fert: 'Nitrogen', comp: 'Cotton Seed Meal' },
    'jute': { season: 'Kharif', soil: 'Alluvial', loc: 'Wetlands', sow: 'Mar-May', pest: 'Yellow Mite', fert: 'Potash', comp: 'Jute Stick Compost' },
    'groundnut (peanut)': { season: 'Kharif/Rabi/Summer', soil: 'Sandy Loam', loc: 'Arid/Semi-arid', sow: 'Jun-Jul', pest: 'White Grub', fert: 'Gypsum', comp: 'Farmyard Manure' },
    'mustard': { season: 'Rabi', soil: 'Sandy Loam', loc: 'North India', sow: 'Oct-Nov', pest: 'Aphids', fert: 'Urea, SSP', comp: 'Green Manure' },
    'soybean': { season: 'Kharif', soil: 'Black Soil', loc: 'Plains', sow: 'Jun-Jul', pest: 'Girdle Beetle', fert: 'DAP', comp: 'Rhizobium' },
    'sunflower': { season: 'Kharif/Rabi/Summer', soil: 'Deep Loam', loc: 'Open Sunny Fields', sow: 'Mar-Apr', pest: 'Cutworms', fert: 'Phosphorous', comp: 'Straw' },

    'potato': { season: 'Rabi', soil: 'Loose Loam', loc: 'Plains/Hilly', sow: 'Oct-Nov', pest: 'Late Blight', fert: 'Potassium Nitrate', comp: 'Peat Compost' },
    'tomato': { season: 'Year-round', soil: 'Loamy', loc: 'Garden/Plains', sow: 'Jan-Feb', pest: 'Hornworm', fert: 'Calcium-rich', comp: 'Worm Castings' },
    'onion': { season: 'Rabi/Kharif', soil: 'Sandy Loam', loc: 'Plains', sow: 'Oct-Nov', pest: 'Thrips', fert: 'NPK 15-15-15', comp: 'Poultry Manure' },
    'brinjal (eggplant)': { season: 'Year-round', soil: 'Rich Loam', loc: 'Tropical Plains', sow: 'Jun-Jul', pest: 'Shoot Borer', fert: 'Urea, DAP', comp: 'Farmyard Manure' },
    'cabbage': { season: 'Winter', soil: 'Sandy Loam', loc: 'Plains', sow: 'Sep-Oct', pest: 'Cabbage Looper', fert: 'Ammonium Sulphate', comp: 'Farmyard Manure' },
    'cauliflower': { season: 'Winter', soil: 'Rich Loam', loc: 'Plains', sow: 'Sep-Oct', pest: 'Diamondback Moth', fert: 'Urea, SSP', comp: 'Vermicompost' },
    'spinach': { season: 'Year-round', soil: 'Sandy Loam', loc: 'Plains', sow: 'Sep-Oct', pest: 'Leaf Miner', fert: 'Nitrogenous', comp: 'Compost Tea' },
    'okra (ladyfinger)': { season: 'Summer/Kharif', soil: 'Sandy Loam', loc: 'Warm Regions', sow: 'Feb-Mar', pest: 'Fruit Borer', fert: 'DAP, MOP', comp: 'Kitchen Waste' },
    'carrot': { season: 'Winter', soil: 'Deep Sandy Loam', loc: 'Plains/Hilly', sow: 'Oct-Nov', pest: 'Rust Fly', fert: 'NPK 10-20-20', comp: 'Well-rotted Manure' },
    'radish': { season: 'Winter', soil: 'Sandy Loam', loc: 'Plains', sow: 'Sep-Oct', pest: 'Aphids', fert: 'Urea, MOP', comp: 'Farmyard Manure' },
    'peas': { season: 'Winter', soil: 'Loamy', loc: 'North India', sow: 'Oct-Nov', pest: 'Pod Borer', fert: 'DAP', comp: 'Green Manure' },
    'capsicum (bell pepper)': { season: 'Summer/Kharif', soil: 'Rich Loam', loc: 'Plains', sow: 'Feb-Mar', pest: 'Thrips', fert: 'NPK 19-19-19', comp: 'Vermicompost' },
    'chili': { season: 'Kharif/Rabi', soil: 'Well-drained Loam', loc: 'Plains/Tropical', sow: 'Jun-Jul', pest: 'Thrips/Mites', fert: 'Nitrogenous', comp: 'Vermicompost' },
    'pumpkin': { season: 'Summer', soil: 'Sandy Loam', loc: 'Plains', sow: 'Feb-Mar', pest: 'Fruit Fly', fert: 'Balanced NPK', comp: 'Cow Dung' },
    'bottle gourd (lauki)': { season: 'Summer/Kharif', soil: 'Sandy Loam', loc: 'Plains', sow: 'Feb-Mar', pest: 'Red Beetle', fert: 'Urea, DAP', comp: 'Farmyard Manure' },
    'bitter gourd (karela)': { season: 'Summer/Kharif', soil: 'Sandy Loam', loc: 'Plains', sow: 'Feb-Mar', pest: 'Fruit Fly', fert: 'DAP, MOP', comp: 'Kitchen Waste' },
    'cucumber': { season: 'Summer', soil: 'Sandy Loam', loc: 'Plains', sow: 'Feb-Mar', pest: 'Aphids', fert: 'NPK 15-15-15', comp: 'Organic Humus' },
    'beans': { season: 'Rabi/Kharif', soil: 'Loamy', loc: 'Hilly/Plains', sow: 'Oct-Nov', pest: 'Aphids', fert: 'NPK 12-32-16', comp: 'Compost' },

    'guava': { season: 'Perennial', soil: 'Alluvial/Red', loc: 'Tropical', sow: 'Jun-Jul', pest: 'Fruit Fly', fert: 'Zinc Sulphate', comp: 'Cow Dung' },
    'pineapple': { season: 'Perennial', soil: 'Acidic Loam', loc: 'Humid Tropical', sow: 'Aug-Oct', pest: 'Mealybugs', fert: 'Urea, Potash', comp: 'Pineapple Waste' },
    'litchi': { season: 'Perennial', soil: 'Deep Loam', loc: 'Subtropical', sow: 'Aug-Sep', pest: 'Mite', fert: 'Zinc, Boron', comp: 'Farmyard Manure' },

    'rose': { season: 'Perennial', soil: 'Clay Loam', loc: 'Garden', sow: 'Dec-Feb', pest: 'Aphids', fert: 'Rose Food', comp: 'Mulched Leaves' },
    'marigold': { season: 'Year-round', soil: 'Any', loc: 'Garden/Farms', sow: 'Feb-Mar', pest: 'Slugs', fert: 'General NPK', comp: 'Potting Mix' },
    'jasmine': { season: 'Perennial', soil: 'Sandy Loam', loc: 'Tropical Gardens', sow: 'Jun-Aug', pest: 'Bud Worm', fert: 'NPK 17-17-17', comp: 'Organic Humus' },
    'lotus': { season: 'Perennial', soil: 'Pond Mud', loc: 'Water Bodies', sow: 'Mar-May', pest: 'Leaf Beetle', fert: 'Aquatic NPK', comp: 'Silt' },
    'hibiscus': { season: 'Perennial', soil: 'Well-drained', loc: 'Tropical', sow: 'Mar-May', pest: 'Mealybugs', fert: 'Potassium-rich', comp: 'Leaf Mold' },
    'chrysanthemum': { season: 'Winter', soil: 'Sandy Loam', loc: 'Plains', sow: 'Aug-Sep', pest: 'Aphids', fert: 'Liquid Fertilizer', comp: 'Compost Tea' },
    'tuberose (rajnigandha)': { season: 'Summer', soil: 'Sandy Loam', loc: 'Plains', sow: 'Mar-Apr', pest: 'Thrips', fert: 'NPK 10-26-26', comp: 'Farmyard Manure' },
    'lily': { season: 'Winter', soil: 'Sandy Loam', loc: 'Cool Regions', sow: 'Sep-Oct', pest: 'Aphids', fert: 'Slow Release NPK', comp: 'Peat' },
    'orchid': { season: 'Perennial', soil: 'Bark/Moss', loc: 'Hilly Regions', sow: 'Year-round', pest: 'Scale', fert: 'Orchid Special', comp: 'Sphagnum' },

    'paddy seeds': { season: 'Kharif', soil: 'Nursery Soil', loc: 'Tropical', sow: 'May-Jun', pest: 'Blast', fert: 'Zinc Sulphate', comp: 'Seed Bed Mix' },
    'wheat seeds': { season: 'Rabi', soil: 'Loamy', loc: 'North India', sow: 'Oct-Nov', pest: 'Rust', fert: 'Nitrogenous', comp: 'Vermicompost' },
    'tomato seeds': { season: 'Year-round', soil: 'Pro-tray Mix', loc: 'Greenhouse', sow: 'Year-round', pest: 'Damping Off', fert: 'Starter Soln', comp: 'Coco Pith' },
    'chili seeds': { season: 'Year-round', soil: 'Pro-tray Mix', loc: 'Greenhouse', sow: 'Year-round', pest: 'Thrips', fert: 'Micronutrients', comp: 'Coco Pith' },
    'brinjal seeds': { season: 'Year-round', soil: 'Pro-tray Mix', loc: 'Greenhouse', sow: 'Year-round', pest: 'Damping Off', fert: 'Liquid NPK', comp: 'Coco Pith' },
    'mustard seeds': { season: 'Rabi', soil: 'Sandy Loam', loc: 'North India', sow: 'Oct-Nov', pest: 'Aphids', fert: 'Urea', comp: 'Farmyard Manure' },
    'sesame seeds': { season: 'Summer', soil: 'Sandy Loam', loc: 'Central India', sow: 'Mar-Apr', pest: 'Gall Fly', fert: 'DAP', comp: 'Compost' },
    'coriander seeds': { season: 'Rabi/Winter', soil: 'Loamy', loc: 'Rajasthan/MP', sow: 'Oct-Nov', pest: 'Aphids', fert: 'Urea', comp: 'Farmyard Manure' },
    'fenugreek seeds': { season: 'Rabi/Winter', soil: 'Loamy', loc: 'North India', sow: 'Oct-Nov', pest: 'Powdery Mildew', fert: 'DAP', comp: 'Manure' },
    'fennel seeds': { season: 'Rabi/Winter', soil: 'Sandy Loam', loc: 'Gujarat/Rajasthan', sow: 'Oct-Nov', pest: 'Aphids', fert: 'Urea, SSP', comp: 'Compost' }
};

// ALIAS MAPPING for Original CSV labels
const ALIASES = {
    'pigeonpeas': 'arhar/tur',
    'chickpea': 'gram/chana',
    'mungbean': 'moong',
    'blackgram': 'urad',
    'lentil': 'masoor',
    'maize': 'maize (corn)'
};

const inputPath = path.join(__dirname, 'CropSuitabilityData.csv');
const outputPath = path.join(__dirname, 'CropSuitabilityData_Final.csv');

const content = fs.readFileSync(inputPath, 'utf8');
const lines = content.trim().split('\n');
const originalHeader = lines[0].split(',').map(h => h.trim().toLowerCase());

const finalHeader = ['N', 'P', 'K', 'pH', 'Moisture', 'Rainfall', 'Humidity', 'Temperature', 'Label', 'Season', 'Soil_Type', 'Location', 'Sowing_Time', 'Fertilizer', 'Compost', 'Pest_Control'];

const finalRows = [];
const cropsInCsv = new Set();

lines.slice(1).forEach(line => {
    const vals = line.split(',');
    if (vals.length < originalHeader.length) return;
    
    const rowObj = {};
    originalHeader.forEach((h, i) => rowObj[h] = vals[i]);
    
    let label = rowObj.label?.toLowerCase().trim() || 'unknown';
    if (ALIASES[label]) label = ALIASES[label];
    
    cropsInCsv.add(label);
    
    const m = METADATA[label] || { season: 'Unknown', soil: 'Any', loc: 'Any', sow: 'Any', pest: 'None', fert: 'NPK', comp: 'Compost' };
    const rain = parseFloat(rowObj.rainfall) || 0;
    const moisture = Math.round(rain / 2.5); 
    
    finalRows.push([
        rowObj.n, rowObj.p, rowObj.k, rowObj.ph, moisture, rowObj.rainfall, rowObj.humidity, rowObj.temperature, 
        label, m.season, m.soil, m.loc, m.sow, m.fert, m.comp, m.pest
    ].join(','));
});

Object.keys(CROP_SPECS).forEach(label => {
    if (cropsInCsv.has(label)) return;

    const s = CROP_SPECS[label];
    const m = METADATA[label];
    if (!s || !m) return;

    finalRows.push([
        s.n[0], s.p[0], s.k[0], s.ph[0], Math.round(s.rain[0] / 10), s.rain[0], s.hum[0], s.temp[0],
        label, m.season, m.soil, m.loc, m.sow, m.fert, m.comp, m.pest
    ].join(','));

    finalRows.push([
        s.n[1], s.p[1], s.k[1], s.ph[1], Math.round(s.rain[1] / 10), s.rain[1], s.hum[1], s.temp[1],
        label, m.season, m.soil, m.loc, m.sow, m.fert, m.comp, m.pest
    ].join(','));
});

fs.writeFileSync(outputPath, finalHeader.join(',') + '\n' + finalRows.join('\n'));
console.log('Deterministic Dataset Created with Aligned Real Metadata: ' + outputPath);
