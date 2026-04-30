/**
 * Agri Sense v2.0.0 ELITE UI RELEASE 🛰️💎
 * 
 * --- HOW TO EDIT ---
 * 1. WiFi & HW: Only edit lines 25-27.
 * 2. Branding: Edit lines 10-14.
 * 3. Mode: Set USE_MOCK_DATA (line 20) to 'false' for Real-Time hardware.
 */

export const MASTER_CONFIG = {
  // 🎨 BRANDING & IDENTITY
  PROJECT_NAME: "innovatex",
  FARM_NAME: "semicolon",
  TAGLINE: "For Better Farming",
  FOOTER_CREDIT: "by Prolayjit Biswas",
  VERSION: "2.9.0",
  
  // 🔐 AUTHORIZED INVESTIGATORS
  AUTHORIZED_USERS: [
    { email: "farmer@test.com", password: "PASSWORD_HERE", name: "Lead Farmer" },
    { email: "prolayjitbiswas14112004@gmail.com", password: "PASSWORD_HERE", name: "Prolayjit Biswas" },
    { email: "ankaanbhowmik11@gmail.com", password: "PASSWORD_HERE", name: "Ankan Bhowmik" },
    { email: "bubun15072006@gmail.com", password: "PASSWORD_HERE", name: "Arghya Roy" }
  ],
  LOGIN_EMAIL: "farmer@test.com", // Fallback for Login UI
  LOGIN_PASSWORD: "PASSWORD_HERE",     // Fallback for Login UI
  
  // 📡 OPERATION MODE
  // 📡 OPERATION MODE
  USE_MOCK_DATA: false, // Set to true for demo, false for ESP32 hardware
  
  // 🛰️ API & INFRASTRUCTURE
  MQTT_BROKER: "broker.hivemq.com", // HiveMQ Public WSS Broker
  MQTT_WSS_PORT: 8884,
  FIELD_TOPIC_SENSORS: "agrisense/field_a/sensors",
  FIELD_TOPIC_COMMANDS: "agrisense/field_a/commands",
  
  // 🖼️ ASSETS
  DEFAULT_PROFILE_PHOTO: "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=100",
  
  // 🗺️ MAP & WEATHER (Optional External APIs)
  OPENWEATHER_API_KEY: import.meta.env.VITE_WEATHER_API_KEY || "YOUR_OPENWEATHER_API_KEY", 
  WEATHER_CITY: "Kalyani",
  
  MAP_LAT: 22.975,
  MAP_LNG: 88.434,
  MAP_ZOOM: 15,
  
  // 📍 HARDWARE PIN SUGGESTIONS (For SoilNode.ino)
  HARDWARE: {
    SSID: import.meta.env.VITE_WIFI_SSID || "YOUR_WIFI_SSID",
    PASS: import.meta.env.VITE_WIFI_PASS || "YOUR_WIFI_PASSWORD",
    MOISTURE_PIN: 34,
    DHT_PIN: 4,
    PUMP_PIN: 26
  },

  // 🕹️ ACTUATOR COMMANDS (For toggleActuator logic)
  ACTUATOR_COMMANDS: {
    'PUMP':    { ON: 'PUMP_ON',    OFF: 'PUMP_OFF' },
    'VALVE':   { ON: 'VALVE_OPEN', OFF: 'VALVE_CLOSE' },
    'BUZZER':  { ON: 'BUZZER_ON',  OFF: 'BUZZER_OFF' },
    'SPRAYER': { ON: 'SPRAY_ON',   OFF: 'SPRAY_OFF' },
    'DISPLAY': { ON: 'DISPLAY_ON', OFF: 'DISPLAY_OFF' },
    'LIGHT':   { ON: 'LIGHT_ON',   OFF: 'LIGHT_OFF' }
  }
};
