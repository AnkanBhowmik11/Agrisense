const fs = require('fs');

const data = fs.readFileSync('public/Crop_recommendation.csv', 'utf8');
const lines = data.split(/\r?\n/).filter(l => l.trim().length > 0);
const headers = lines[0].split(',');

const crops = {};

for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const labelIdx = headers.indexOf('label');
    if (labelIdx === -1 || !values[labelIdx]) continue;
    
    const label = values[labelIdx].trim();
    
    if (!crops[label]) {
        crops[label] = {
            N: [], P: [], K: [], 
            temp: [], humidity: [], 
            ph: [], rainfall: []
        };
    }
    
    crops[label].N.push(parseFloat(values[0]));
    crops[label].P.push(parseFloat(values[1]));
    crops[label].K.push(parseFloat(values[2]));
    crops[label].temp.push(parseFloat(values[3]));
    crops[label].humidity.push(parseFloat(values[4]));
    crops[label].ph.push(parseFloat(values[5]));
    crops[label].rainfall.push(parseFloat(values[6]));
}

const result = Object.keys(crops).map(name => {
    const c = crops[name];
    const getRange = (arr) => {
        const min = Math.min(...arr);
        const max = Math.max(...arr);
        return [Math.floor(min), Math.ceil(max)];
    };
    
    return {
        name: name.charAt(0).toUpperCase() + name.slice(1),
        ideal: {
            N: getRange(c.N),
            P: getRange(c.P),
            K: getRange(c.K),
            ph: [parseFloat(Math.min(...c.ph).toFixed(1)), parseFloat(Math.max(...c.ph).toFixed(1))],
            moisture: name === 'rice' || name === 'jute' ? [70, 95] : [40, 70],
            temp: getRange(c.temp),
            humidity: getRange(c.humidity),
            rainfall: getRange(c.rainfall)
        },
        season: name === 'wheat' || name === 'chickpea' ? ["Rabi"] : ["Kharif"],
        region: ["India"],
        fertilizer: { N: "Urea", P: "DAP", K: "MOP" },
        description: `Precision-analyzed ${name} model from Kaggle dataset.`
    };
});

console.log(JSON.stringify(result, null, 2));
