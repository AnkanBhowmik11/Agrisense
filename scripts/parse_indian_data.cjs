const fs = require('fs');

const data = fs.readFileSync('src/assets/Crop-Profile_-State-wise-Area,-Production-&-Yield-of-All-Crops,-(2021-22-to-2025-26).csv', 'utf8');
const lines = data.split(/\r?\n/).filter(l => l.trim().length > 0);
const headers = lines[0].split(',');

const cropProfile = {};

for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const crop = values[0].trim().toUpperCase();
    const state = values[1].trim().toUpperCase();
    const yield2425 = parseFloat(values[headers.indexOf('Yield (kg/hectare) (2024-25)')]);

    if (!cropProfile[crop]) {
        cropProfile[crop] = { states: {} };
    }
    if (!isNaN(yield2425)) {
        cropProfile[crop].states[state] = yield2425;
    }
}

// Parse Sown Progress (Summer 2026)
const sownData = fs.readFileSync('src/assets/All-India_-Progressive-Crop-Area-Sown-Report---Summer-Weekly-area-coverage-as-on-2026-04-10.csv', 'utf8');
const sownLines = sownData.split(/\r?\n/).filter(l => l.trim().length > 0);
const trendingCrops = sownLines.slice(1).map(l => l.split(',')[0].trim().toUpperCase());

console.log(JSON.stringify({ profile: cropProfile, trending: trendingCrops }, null, 2));
