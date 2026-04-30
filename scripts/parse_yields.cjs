const fs = require('fs');

const data = fs.readFileSync('public/crop_yield.csv', 'utf8');
const lines = data.split(/\r?\n/).filter(l => l.trim().length > 0);
const headers = lines[0].split(',');

const yieldStats = {};

for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const crop = values[0].trim().toLowerCase();
    const yieldVal = parseFloat(values[9]);
    const state = values[3].trim();
    const season = values[2].trim();

    if (!yieldStats[crop]) {
        yieldStats[crop] = {
            totalYield: 0,
            count: 0,
            states: {},
            seasons: new Set()
        };
    }

    if (!isNaN(yieldVal)) {
        yieldStats[crop].totalYield += yieldVal;
        yieldStats[crop].count++;
    }
    yieldStats[crop].states[state] = (yieldStats[crop].states[state] || 0) + 1;
    yieldStats[crop].seasons.add(season);
}

const finalYields = {};
Object.keys(yieldStats).forEach(crop => {
    const s = yieldStats[crop];
    finalYields[crop] = {
        avgYield: parseFloat((s.totalYield / s.count).toFixed(2)),
        topState: Object.keys(s.states).sort((a,b) => s.states[b] - s.states[a])[0],
        seasons: Array.from(s.seasons)
    };
});

console.log(JSON.stringify(finalYields, null, 2));
