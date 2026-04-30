const fs = require('fs');

const data = fs.readFileSync('src/assets/Nutrient (2).csv', 'utf8');
const lines = data.split(/\r?\n/).filter(l => l.trim().length > 0);
const headers = lines[2].split(','); // Line 3 is the header

const stateStats = {};

for (let i = 3; i < lines.length; i++) {
    const values = lines[i].split(',');
    const state = values[0].trim().toUpperCase();
    
    if (!state) continue;

    stateStats[state] = {
        N: { high: parseInt(values[3]), med: parseInt(values[4]), low: parseInt(values[5]) },
        P: { high: parseInt(values[6]), med: parseInt(values[7]), low: parseInt(values[8]) },
        K: { high: parseInt(values[9]), med: parseInt(values[10]), low: parseInt(values[11]) },
        OC: { high: parseInt(values[12]), med: parseInt(values[13]), low: parseInt(values[14]) },
        ph: { alkaline: parseInt(values[15]), acidic: parseInt(values[16]), neutral: parseInt(values[17]) },
        zincDeficient: parseInt(values[25]),
        boronDeficient: parseInt(values[29])
    };
}

console.log(JSON.stringify(stateStats, null, 2));
