/**
 * 🛰️ AgriSense Pro v21.0.0 - PRODUCTION MASTER FIRMWARE
 * ---------------------------------------------------
 * This code is designed for ESP32 and connects directly to the AgriSense App.
 * It uses real sensor data (no mocks) and dynamic pairing topics.
 * 
 * SENSORS INCLUDED:
 * 1. pH Sensor (Analog)
 * 2. Soil Moisture (Analog)
 * 3. Air Temp/Humidity (DHT11/22)
 * 4. LDR Light Sensor (Analog)
 * 5. Rain Fall Sensor (Analog)
 * 6. OLED Display (SSD1306)
 * 7. Status LEDs (RGB or Individual)
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>

// ─── 📶 NETWORK & APP PAIRING ───────────────────────────────────────────────
// Match these with the Project Name and Farm Name in your App Settings
const char* primaryId   = "innovatex";  
const char* secondaryId = "semicolon"; 

// WiFi Credentials
const char* ssid     = "YOUR_WIFI_SSID";         
const char* password = "YOUR_WIFI_PASSWORD"; 

// MQTT Broker (HiveMQ Public)
const char* mqtt_broker = "broker.hivemq.com";
const int mqtt_port     = 1883;

// ─── 📍 PIN MAPPING (NODE-WISE) ─────────────────────────────────────────────

// 1. 🌱 SOIL NODE (Root Zone Analysis)
#define MOISTURE_PIN 34    // Soil Moisture (Analog)
#define PH_PIN       35    // pH Sensor (Analog)
#define DHT_SOIL_PIN 13    // Soil/Root Temperature
#define NPK_RX       16    // RS485 Modbus RX
#define NPK_TX       17    // RS485 Modbus TX
#define RS485_EN     5     // RS485 DE/RE Control

// 2. ☁️ WEATHER NODE (Atmospheric Monitoring)
#define DHT_AIR_PIN  4     // Air Temp & Humidity
#define LDR_PIN      32    // Light Intensity (Analog)
#define RAIN_PIN     33    // Rain Sensor (Analog)

// 3. 💦 WATER NODE (Irrigation & Level)
#define WATER_LVL_PIN 14   // Water Tank Level (Analog)
#define RELAY_PUMP    26   // Pump Actuator

// 4. 🛠️ SYSTEM & INTERFACE
#define OLED_SDA     21    // I2C Data
#define OLED_SCL     22    // I2C Clock
#define LED_WIFI     2     // WiFi Status LED
#define LED_MQTT     18    // MQTT Status LED (Moved from 4 to avoid DHT conflict)

// ─── 🧬 SYSTEM OBJECTS ──────────────────────────────────────────────────────

// Sensors
DHT dhtAir(DHT_AIR_PIN, DHT11);
DHT dhtSoil(DHT_SOIL_PIN, DHT11);
HardwareSerial npkSerial(2);

// Interface
Adafruit_SSD1306 display(128, 64, &Wire, -1);

// Communication
WiFiClient espClient;
PubSubClient mqttClient(espClient);

// Global State
byte npkRequest[] = {0x01, 0x03, 0x00, 0x1E, 0x00, 0x03, 0x65, 0xCD};
unsigned long lastTelemetryMillis = 0;
unsigned long lastConnectivityCheck = 0;
const long telemetryInterval = 5000; 

// ─── 🛠️ HELPER FUNCTIONS ────────────────────────────────────────────────────

void setup_wifi() {
  delay(10);
  Serial.println("\n[WIFI] Connecting to " + String(ssid));
  WiFi.begin(ssid, password);

  display.clearDisplay();
  display.setCursor(0,0);
  display.println("WIFI CONNECTING...");
  display.display();

  int timeout = 0;
  while (WiFi.status() != WL_CONNECTED && timeout < 20) {
    digitalWrite(LED_WIFI, !digitalRead(LED_WIFI)); 
    delay(500);
    Serial.print(".");
    timeout++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    digitalWrite(LED_WIFI, HIGH); 
    Serial.println("\n[WIFI] Connected! IP: " + WiFi.localIP().toString());
  } else {
    Serial.println("\n[WIFI] Connection Timeout. Will retry in loop.");
  }
}

void reconnectMqtt() {
  // WiFi Watchdog: If WiFi is lost for more than 5 mins, restart the system
  if (WiFi.status() != WL_CONNECTED) {
    if (millis() - lastConnectivityCheck > 300000) { // 5 Minutes
      Serial.println("[CRITICAL] WiFi Lost. Restarting...");
      ESP.restart();
    }
    return; 
  }
  lastConnectivityCheck = millis(); // Reset watchdog when WiFi is OK

  while (!mqttClient.connected() && WiFi.status() == WL_CONNECTED) {
    digitalWrite(LED_MQTT, LOW); 
    String clientId = "AgriSense-Master-" + String(random(0xffff), HEX);
    String commandTopic = "agrisense/" + String(primaryId) + "/" + String(secondaryId) + "/commands";
    
    if (mqttClient.connect(clientId.c_str())) {
      Serial.println("[MQTT] Connected to Broker");
      mqttClient.subscribe(commandTopic.c_str());
      digitalWrite(LED_MQTT, HIGH); 
    } else {
      Serial.print("[MQTT] Failed, rc="); Serial.println(mqttClient.state());
      delay(5000);
    }
  }
}


void mqttCallback(char* topic, byte* payload, unsigned int length) {
  StaticJsonDocument<256> doc;
  deserializeJson(doc, payload, length);
  
  String action = doc["action"] | "";
  Serial.println("[MQTT] Command Received: " + action);
  
  // Actuator Control
  if (action == "PUMP_ON") {
    digitalWrite(RELAY_PUMP, HIGH);
  } else if (action == "PUMP_OFF") {
    digitalWrite(RELAY_PUMP, LOW);
  }
}

// ─── 🚀 MAIN SETUP ──────────────────────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  npkSerial.begin(9600, SERIAL_8N1, NPK_RX, NPK_TX);
  
  // Pin Modes
  pinMode(RELAY_PUMP, OUTPUT);
  pinMode(RS485_EN, OUTPUT);
  pinMode(LED_WIFI, OUTPUT);
  pinMode(LED_MQTT, OUTPUT);
  
  // Defaults
  digitalWrite(RELAY_PUMP, LOW);
  digitalWrite(RS485_EN, LOW);

  // Initialize Sensors
  dhtAir.begin();
  dhtSoil.begin();
  
  // Initialize Display
  Wire.begin(OLED_SDA, OLED_SCL);
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  
  display.clearDisplay();
  display.setTextColor(WHITE);
  display.setCursor(0,10);
  display.println("AGRISENSE MASTER v21");
  display.println("BOOTING NODES...");
  display.display();
  
  setup_wifi();
  mqttClient.setServer(mqtt_broker, mqtt_port);
  mqttClient.setCallback(mqttCallback);
}

// ─── 🔄 MAIN LOOP ───────────────────────────────────────────────────────────

void loop() {
  if (!mqttClient.connected()) reconnectMqtt();
  mqttClient.loop();

  unsigned long now = millis();
  if (now - lastTelemetryMillis > telemetryInterval) {
    lastTelemetryMillis = now;

    // ─── 1. 🌱 SOIL NODE DATA ───
    float soilTemp = dhtSoil.readTemperature();
    int moisture = map(analogRead(MOISTURE_PIN), 4095, 2000, 0, 100);
    moisture = constrain(moisture, 0, 100);
    float phValue = (analogRead(PH_PIN) * 3.3 / 4095.0) * 3.5;
    
    // NPK RS485 Polling (With Timeout Protection)
    int n=0, p=0, k=0;
    digitalWrite(RS485_EN, HIGH);
    npkSerial.write(npkRequest, sizeof(npkRequest));
    npkSerial.flush();
    digitalWrite(RS485_EN, LOW);
    
    unsigned long npkStart = millis();
    while (npkSerial.available() < 11 && millis() - npkStart < 500) { delay(1); } // 500ms timeout
    
    if(npkSerial.available() >= 11) {
       byte res[11]; npkSerial.readBytes(res, 11);
       n = res[3]; p = res[5]; k = res[7];
    } else {
       Serial.println("[WARN] NPK Sensor Timeout/Disconnected");
    }

    // ─── 2. ☁️ WEATHER NODE DATA ───
    float airTemp = dhtAir.readTemperature();
    float airHum  = dhtAir.readHumidity();
    int ldrValue = map(analogRead(LDR_PIN), 0, 4095, 0, 1000);
    int rainValue = map(analogRead(RAIN_PIN), 4095, 0, 0, 100);

    // ─── 3. 💦 WATER NODE DATA ───
    int waterLvl = map(analogRead(WATER_LVL_PIN), 4095, 0, 0, 100);
    bool pumpState = digitalRead(RELAY_PUMP);

    // ─── 4. 🛰️ TELEMETRY TRANSMISSION ───
    StaticJsonDocument<1536> doc;
    
    JsonObject soilNode = doc.createNestedObject("soil");
    soilNode["moisture"] = moisture;
    soilNode["ph"] = phValue;
    soilNode["temp"] = isnan(soilTemp) ? 0 : soilTemp;
    JsonObject npkDoc = soilNode.createNestedObject("npk");
    npkDoc["n"] = n; npkDoc["p"] = p; npkDoc["k"] = k;

    JsonObject weatherNode = doc.createNestedObject("weather");
    weatherNode["temp"] = isnan(airTemp) ? 0 : airTemp;
    weatherNode["humidity"] = isnan(airHum) ? 0 : airHum;
    weatherNode["lightIntensity"] = ldrValue;
    weatherNode["rainLevel"] = constrain(rainValue, 0, 100);

    JsonObject waterNode = doc.createNestedObject("water");
    waterNode["level"] = constrain(waterLvl, 0, 100);
    waterNode["pumpActive"] = pumpState;

    String payload;
    serializeJson(doc, payload);
    String topic = "agrisense/" + String(primaryId) + "/" + String(secondaryId) + "/sensors";
    mqttClient.publish(topic.c_str(), payload.c_str());

    // ─── 🚀 INDUSTRIAL SERIAL LOGGING ───
    Serial.println("\n--- [AGRISENSE TELEMETRY PACKET] ---");
    Serial.printf(" [SOIL]    Moist:%d%% | Temp:%.1fC | pH:%.1f | NPK:%d,%d,%d\n", moisture, soilTemp, phValue, n, p, k);
    Serial.printf(" [WEATHER] Temp:%.1fC | Hum:%.0f%% | Light:%d | Rain:%d%%\n", airTemp, airHum, ldrValue, rainValue);
    Serial.printf(" [WATER]   Level:%d%% | Pump:%s\n", waterLvl, pumpState ? "ACTIVE" : "IDLE");
    Serial.println(" [CLOUD]   Topic: " + topic);
    Serial.println("------------------------------------\n");

    // ─── 5. 🛠️ SYSTEM OUTPUTS (OLED ENHANCED) ───
    if (mqttClient.connected()) {
      digitalWrite(LED_MQTT, LOW);
      delay(50);
      digitalWrite(LED_MQTT, HIGH);
    }

    display.clearDisplay();
    display.setTextSize(1);
    display.setCursor(0, 0);
    display.print("AGRISENSE MASTER v21");
    display.drawLine(0, 9, 128, 9, WHITE);

    display.setCursor(0, 13);
    display.printf("S: M:%d%% T:%.1f pH:%.1f", moisture, isnan(soilTemp) ? 0 : soilTemp, phValue);
    display.setCursor(0, 23);
    display.printf("N:%d P:%d K:%d", n, p, k);
    display.setCursor(0, 33);
    display.printf("W: T:%.1f H:%.0f%% R:%d%%", airTemp, airHum, rainValue);
    display.setCursor(0, 43);
    display.printf("I: L:%d%% P:%s", waterLvl, pumpState ? "ON" : "OFF");
    display.drawLine(0, 53, 128, 53, WHITE);
    display.setCursor(0, 56);
    display.printf("WiFi:OK | MQTT:%s", mqttClient.connected() ? "LINK" : "DISC");
    display.display();
  }
}


