/**
 * AgriSense Pro v17.1.0 Sensor Controller
 * Processes incoming MQTT messages and routes them to the correct node state.
 */

import { calculateNodeHealth } from '../logic/healthEngine';

/**
 * Utility to extract numerical values from various sources with fallbacks
 */
export const getVal = (src, keys, fallback) => {
  if (src === undefined || src === null) return fallback;
  
  // If it's a direct number and no specific keys were requested, return it
  if (typeof src !== 'object' && !isNaN(src) && (!keys || keys.length === 0)) return Number(src);
  
  // If it's an object, search for the keys
  if (typeof src === 'object') {
    for (const k of keys) {
      const v = src[k];
      if (v !== undefined && v !== null && v !== "" && !isNaN(v)) return Number(v);
    }
  }
  
  return fallback;
};

/**
 * Main Data Processor for MQTT Messages
 */
export const processMqttMessage = (topic, data, prev) => {
  const parts = topic.split('/');
  if (parts.length < 2) return prev;

  const newState = {
    ...prev,
    soil: { ...prev.soil, npk: { ...prev.soil.npk } },
    weather: { ...prev.weather },
    water: { ...prev.water },
    storage: { ...prev.storage },
    vision: { ...prev.vision }
  };
  
  // 🛰️ NODE DETECTION (Robust Keyword Matching)
  let nodeType = 'unknown';
  const topicLower = topic.toLowerCase();
  
  if (topicLower.includes('sensors')) nodeType = 'sensors';
  else if (topicLower.includes('soil')) nodeType = 'soil';
  else if (topicLower.includes('weather')) nodeType = 'weather';
  else if (topicLower.includes('water') || topicLower.includes('irrigation')) nodeType = 'water';
  else if (topicLower.includes('storage')) nodeType = 'storage';
  else if (topicLower.includes('vision') || topicLower.includes('camera') || topicLower.includes('cam')) nodeType = 'vision';

  // 🛰️ UNIFIED DATA ACCEPTANCE (Accept any valid telemetry)
  if (nodeType === 'sensors' || data.soil || data.weather || data.water || data.storage) {
    if (data.soil) {
      const sData = data.soil;
      newState.soil.moisture = getVal(sData, ['moisture', 'm'], prev.soil.moisture);
      newState.soil.ph = getVal(sData, ['ph'], prev.soil.ph);
      newState.soil.temp = getVal(sData, ['temp', 'st'], prev.soil.temp);
      if (sData.npk) {
        newState.soil.npk.n = getVal(sData.npk, ['n', 'N'], prev.soil.npk.n);
        newState.soil.npk.p = getVal(sData.npk, ['p', 'P'], prev.soil.npk.p);
        newState.soil.npk.k = getVal(sData.npk, ['k', 'K'], prev.soil.npk.k);
      }
      newState.soil.oledActive = getVal(sData, ['oled', 'display'], prev.soil.oledActive);
      newState.soil.healthIndex = calculateNodeHealth('soil', newState.soil);

    }
    if (data.weather) {
      const wData = data.weather;
      newState.weather.temp = getVal(wData, ['temp', 't'], prev.weather.temp);
      newState.weather.humidity = getVal(wData, ['humidity', 'h'], prev.weather.humidity);
      newState.weather.lightIntensity = getVal(wData, ['lightIntensity', 'ldr', 'light'], prev.weather.lightIntensity);
      newState.weather.rainLevel = getVal(wData, ['rainLevel', 'rain', 'level'], prev.weather.rainLevel);
      newState.weather.healthIndex = calculateNodeHealth('weather', newState.weather);
    }
    if (data.water) {
      const waData = data.water;
      newState.water.level = getVal(waData, ['level', 'l'], prev.water.level);
      newState.water.pumpActive = (waData.pumpActive === 1 || waData.pump === 1 || waData.pumpActive === true);
    }
    if (data.storage) {
      const stData = data.storage;
      newState.storage.temp = getVal(stData, ['temp', 't'], prev.storage.temp);
      newState.storage.humidity = getVal(stData, ['humidity', 'h'], prev.storage.humidity);
      newState.storage.mq135 = getVal(stData, ['mq135', 'gas'], prev.storage.mq135);
      newState.storage.healthIndex = calculateNodeHealth('storage', newState.storage);
    }
    if (data.vision) {
      const vData = data.vision;
      newState.vision.active = !!vData.active;
      newState.vision.type = vData.type || '---';
      newState.vision.level = vData.level || 'Normal';
      newState.vision.zone = vData.zone || prev.vision.zone || '---';
      newState.vision.timestamp = Date.now();
    }
  }
  // Discrete Node Topics
  else if (nodeType === 'soil') {
    if (typeof data === 'object') {
      newState.soil.moisture = getVal(data, ['moisture', 'm'], prev.soil.moisture);
      newState.soil.temp = getVal(data, ['temp', 't'], prev.soil.temp);
      newState.soil.ph = getVal(data, ['ph'], prev.soil.ph);
      if (data.npk) {
        newState.soil.npk.n = getVal(data.npk, ['n'], prev.soil.npk.n);
        newState.soil.npk.p = getVal(data.npk, ['p'], prev.soil.npk.p);
        newState.soil.npk.k = getVal(data.npk, ['k'], prev.soil.npk.k);
      }
      newState.soil.oledActive = getVal(data, ['oled', 'display'], prev.soil.oledActive);
    } else {
      // If it's a raw number on the /soil topic, we only update moisture as a safe default
      newState.soil.moisture = getVal(data, [], prev.soil.moisture);
    }
    newState.soil.healthIndex = calculateNodeHealth('soil', newState.soil);
  } 
  else if (nodeType === 'weather') {
    if (typeof data === 'object') {
      newState.weather.temp = getVal(data, ['temp', 't', 'temperature'], prev.weather.temp);
      newState.weather.humidity = getVal(data, ['humidity', 'h'], prev.weather.humidity);
      newState.weather.lightIntensity = getVal(data, ['lightIntensity', 'ldr', 'light', 'lux'], prev.weather.lightIntensity);
      newState.weather.rainLevel = getVal(data, ['rainLevel', 'rain', 'rainfall'], prev.weather.rainLevel);
    } else {
      newState.weather.temp = getVal(data, [], prev.weather.temp);
    }
    newState.weather.healthIndex = calculateNodeHealth('weather', newState.weather);
  }
  else if (nodeType === 'storage') {
    if (typeof data === 'object') {
      newState.storage.temp = getVal(data, ['temp', 't'], prev.storage.temp);
      newState.storage.humidity = getVal(data, ['humidity', 'h'], prev.storage.humidity);
      newState.storage.mq135 = getVal(data, ['mq135', 'aqi', 'gas'], prev.storage.mq135);
    } else {
      newState.storage.temp = getVal(data, [], prev.storage.temp);
    }
    newState.storage.healthIndex = calculateNodeHealth('storage', newState.storage);
  }
  else if (nodeType === 'vision') {
    newState.vision.active = !!data.active;
    newState.vision.type = data.type || '---';
    newState.vision.level = data.level || 'Normal';
    newState.vision.zone = data.zone || prev.vision.zone || '---';
    newState.vision.timestamp = Date.now();
  }

  return newState;
};
