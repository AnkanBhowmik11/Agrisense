
import csv

# Metadata Mapping for existing crops + some new ones
METADATA = {
    'rice': {'season': 'Kharif', 'soil': 'Clayey', 'weather': 'Hot & Humid', 'sow': 'Jun-Jul', 'pests': 'Stem Borer, Blast', 'fert': 'Urea, DAP', 'comp': 'Farmyard Manure'},
    'maize': {'season': 'Kharif/Rabi', 'soil': 'Loamy', 'weather': 'Sunny', 'sow': 'Jun-Jul/Oct-Nov', 'pests': 'Fall Armyworm', 'fert': 'Nitrogenous', 'comp': 'Vermicompost'},
    'chickpea': {'season': 'Rabi', 'soil': 'Deep Leached', 'weather': 'Cool & Dry', 'sow': 'Oct-Nov', 'pests': 'Pod Borer', 'fert': 'Phosphatic', 'comp': 'Leaf Mold'},
    'kidneybeans': {'season': 'Rabi', 'soil': 'Loamy', 'weather': 'Mild', 'sow': 'Oct-Nov', 'pests': 'Aphids', 'fert': 'Potash', 'comp': 'Compost Tea'},
    'pigeonpeas': {'season': 'Kharif', 'soil': 'Alluvial', 'weather': 'Warm', 'sow': 'Jun-Jul', 'pests': 'Pod Fly', 'fert': 'NPK 12-32-16', 'comp': 'Organic Mulch'},
    'mothbeans': {'season': 'Kharif', 'soil': 'Sandy', 'weather': 'Hot & Arid', 'sow': 'Jul-Aug', 'pests': 'Whitefly', 'fert': 'Minimal N', 'comp': 'Dry Manure'},
    'mungbean': {'season': 'Summer/Kharif', 'soil': 'Loamy', 'weather': 'Warm', 'sow': 'Mar-Apr/Jun-Jul', 'pests': 'Thrips', 'fert': 'Bio-fertilizer', 'comp': 'Green Manure'},
    'blackgram': {'season': 'Summer/Kharif', 'soil': 'Heavier Soil', 'weather': 'Hot', 'sow': 'Mar-Apr/Jun-Jul', 'pests': 'Hairy Caterpillar', 'fert': 'Sulphur based', 'comp': 'Bokashi'},
    'lentil': {'season': 'Rabi', 'soil': 'Alluvial', 'weather': 'Cold', 'sow': 'Oct-Nov', 'pests': 'Wilt', 'fert': 'DAP', 'comp': 'Compost'},
    'pomegranate': {'season': 'Perennial', 'soil': 'Sandy Loam', 'weather': 'Dry & Hot', 'sow': 'Feb-Mar', 'pests': 'Fruit Borer', 'fert': 'Micronutrients', 'comp': 'Poultry Manure'},
    'banana': {'season': 'Perennial', 'soil': 'Well-drained Loam', 'weather': 'Tropical', 'sow': 'Jun-Jul', 'pests': 'Banana Weevil', 'fert': 'High Potassium', 'comp': 'Kitchen Waste'},
    'mango': {'season': 'Perennial', 'soil': 'Laterite', 'weather': 'Hot & Humid', 'sow': 'Jul-Aug', 'pests': 'Mango Hopper', 'fert': 'Ammonium Sulphate', 'comp': 'Bone Meal'},
    'grapes': {'season': 'Perennial', 'soil': 'Chalky', 'weather': 'Mediterranean', 'sow': 'Jan-Feb', 'pests': 'Mealybugs', 'fert': 'Calcium Nitrate', 'comp': 'Vineyard Waste'},
    'watermelon': {'season': 'Summer', 'soil': 'Sandy', 'weather': 'Very Hot', 'sow': 'Feb-Mar', 'pests': 'Fruit Fly', 'fert': 'Balanced NPK', 'comp': 'Horse Manure'},
    'muskmelon': {'season': 'Summer', 'soil': 'Sandy Loam', 'weather': 'Hot', 'sow': 'Feb-Mar', 'pests': 'Red Beetle', 'fert': 'Liquid Fert', 'comp': 'Seaweed Extract'},
    'apple': {'season': 'Perennial', 'soil': 'Mountain Soil', 'weather': 'Cool/Temperate', 'sow': 'Jan-Feb', 'pests': 'San Jose Scale', 'fert': 'Slow Release', 'comp': 'Peat Moss'},
    'orange': {'season': 'Perennial', 'soil': 'Red Soil', 'weather': 'Subtropical', 'sow': 'Jun-Aug', 'pests': 'Citrus Canker', 'fert': 'Chelated Iron', 'comp': 'Cow Dung'},
    'papaya': {'season': 'Perennial', 'soil': 'Alluvial', 'weather': 'Tropical', 'sow': 'Feb-Mar', 'pests': 'Spider Mites', 'fert': 'Super Phosphate', 'comp': 'Organic Humus'},
    'coconut': {'season': 'Perennial', 'soil': 'Coastal Sandy', 'weather': 'Coastal', 'sow': 'Jun-Sep', 'pests': 'Rhinoceros Beetle', 'fert': 'Rock Phosphate', 'comp': 'Coir Pith'},
    'cotton': {'season': 'Kharif', 'soil': 'Black Soil', 'weather': 'Sunny', 'sow': 'May-Jun', 'pests': 'Bollworm', 'fert': 'Nitrogen', 'comp': 'Cotton Seed Meal'},
    'jute': {'season': 'Kharif', 'soil': 'New Alluvial', 'weather': 'Hot & Wet', 'sow': 'Mar-May', 'pests': 'Yellow Mite', 'fert': 'Potash', 'comp': 'Jute Stick Compost'},
    'coffee': {'season': 'Perennial', 'soil': 'Forest Soil', 'weather': 'Humid/Shady', 'sow': 'Jun-Jul', 'pests': 'Coffee Berry Borer', 'fert': 'Specialized NPK', 'comp': 'Coffee Pulp'},
    # Additional Garden Crops
    'tomato': {'season': 'Year-round', 'soil': 'Loamy', 'weather': 'Sunny', 'sow': 'Jan-Feb/Jun-Jul', 'pests': 'Tomato Hornworm', 'fert': 'Calcium-rich', 'comp': 'Worm Castings'},
    'rose': {'season': 'Perennial', 'soil': 'Clay Loam', 'weather': 'Mild', 'sow': 'Dec-Feb', 'pests': 'Aphids, Black Spot', 'fert': 'Rose Food', 'comp': 'Mulched Leaves'},
    'sunflower': {'season': 'Summer', 'soil': 'Deep Loam', 'weather': 'Bright Sun', 'sow': 'Mar-Apr', 'pests': 'Cutworms', 'fert': 'Phosphorous', 'comp': 'Straw'},
    'carrot': {'season': 'Winter', 'soil': 'Loose Sandy', 'weather': 'Cool', 'sow': 'Oct-Nov', 'pests': 'Carrot Rust Fly', 'fert': 'Low Nitrogen', 'comp': 'Compost'},
    'spinach': {'season': 'Winter', 'soil': 'Nitrogen Rich', 'weather': 'Cold', 'sow': 'Sep-Oct', 'pests': 'Leaf Miner', 'fert': 'Liquid Seaweed', 'comp': 'Blood Meal'},
    'marigold': {'season': 'Year-round', 'soil': 'Any', 'weather': 'Sunny', 'sow': 'Feb-Mar/Jun-Jul', 'pests': 'Slugs', 'fert': 'General NPK', 'comp': 'Potting Mix'}
}

input_file = r'c:\Users\polu1\OneDrive\Desktop\Zyro\src\data\CropSuitabilityData.csv'
output_file = r'c:\Users\polu1\OneDrive\Desktop\Zyro\src\data\CropSuitabilityData_Enhanced.csv'

with open(input_file, mode='r') as f:
    reader = csv.reader(f)
    header = next(reader)
    # Ensure header is correct
    if header != ['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall', 'label']:
         header = ['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall', 'label']
    
    new_header = header + ['season', 'soil_type', 'weather', 'sowing_time', 'pests', 'fertilizer', 'compost']
    
    rows = list(reader)

new_rows = []
for row in rows:
    label = row[-1].lower()
    meta = METADATA.get(label, {'season': 'Unknown', 'soil': 'Any', 'weather': 'Any', 'sow': 'Any', 'pests': 'None', 'fert': 'NPK', 'comp': 'Compost'})
    new_rows.append(row + [meta['season'], meta['soil'], meta['weather'], meta['sow'], meta['pests'], meta['fert'], meta['comp']])

# Add samples for new garden crops (approximate values)
# Tomato
for _ in range(50):
    new_rows.append(['100', '50', '50', '25', '60', '6.5', '100', 'tomato', 'Year-round', 'Loamy', 'Sunny', 'Jan-Feb/Jun-Jul', 'Tomato Hornworm', 'Calcium-rich', 'Worm Castings'])
# Rose
for _ in range(30):
    new_rows.append(['80', '40', '40', '20', '50', '6.0', '80', 'rose', 'Perennial', 'Clay Loam', 'Mild', 'Dec-Feb', 'Aphids, Black Spot', 'Rose Food', 'Mulched Leaves'])
# Sunflower
for _ in range(30):
    new_rows.append(['120', '60', '60', '28', '40', '7.0', '60', 'sunflower', 'Summer', 'Deep Loam', 'Bright Sun', 'Mar-Apr', 'Cutworms', 'Phosphorous', 'Straw'])

with open(output_file, mode='w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(new_header)
    writer.writerows(new_rows)

print(f"Enhanced CSV created at {output_file}")
