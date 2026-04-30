/*
 * ╔══════════════════════════════════════════════════════════════╗
 * ║         AgriSense Pro — Soil & Weather Sensor Node           ║
 * ║         Board: ESP32 DevKit v1 / NodeMCU-32S                 ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  Sensors: DHT22, Capacitive Moisture, NPK RS485, LDR         ║
 * ║  Publishes: Soil + Weather + Water unified payload via MQTT   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 *  Libraries (install via Arduino Library Manager):
 *    - PubSubClient   by Nick O'Leary
 *    - ArduinoJson    by Benoit Blanchon
 *    - DHT sensor     by Adafruit
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ── STEP 1: Set your WiFi credentials ─────────────────────────
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";

// ── STEP 2: Pairing Identity (must match AgriSense app Settings)
// App "Project Codename" → primary_id
// App "Client Identifier" → secondary_id
const char* primary_id   = "innovatex";
const char* secondary_id = "semicolon";

// ── STEP 3: Pin Assignments ────────────────────────────────────
#define DHT_PIN       4       // DHT22 data pin
#define DHT_TYPE      DHT22
#define MOISTURE_PIN  34      // Capacitive moisture sensor (ADC)
#define LDR_PIN       35      // Light sensor (ADC)
#define RAIN_PIN      32      // Rain sensor (ADC)

// ── MQTT Config (no changes needed) ───────────────────────────
const char* MQTT_HOST = "broker.hivemq.com";
const int   MQTT_PORT = 1883;

// ── Topic construction (auto) ─────────────────────────────────
String TOPIC_SENSORS;
String TOPIC_COMMANDS;

DHT dht(DHT_PIN, DHT_TYPE);
WiFiClient   espClient;
PubSubClient mqtt(espClient);

unsigned long lastPublish = 0;
const long    PUBLISH_INTERVAL = 5000; // 5 seconds

// ── Helpers ───────────────────────────────────────────────────
float adcToMoisturePct(int raw) {
  // Calibrate: 4095 = dry (0%), 1200 = wet (100%)
  raw = constrain(raw, 1200, 4095);
  return map(raw, 4095, 1200, 0, 100);
}

void connectWifi() {
  Serial.printf("Connecting to %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.printf("\nWiFi OK — IP: %s\n", WiFi.localIP().toString().c_str());
}

void connectMqtt() {
  while (!mqtt.connected()) {
    Serial.print("MQTT connecting...");
    String clientId = "agrisense_soil_" + String(random(0xffff), HEX);
    if (mqtt.connect(clientId.c_str())) {
      Serial.println("connected.");
      mqtt.subscribe(TOPIC_COMMANDS.c_str());
    } else {
      Serial.printf("failed (rc=%d), retry in 5s\n", mqtt.state());
      delay(5000);
    }
  }
}

void onCommand(char* topic, byte* payload, unsigned int length) {
  StaticJsonDocument<256> doc;
  deserializeJson(doc, payload, length);
  const char* action = doc["action"];
  if (!action) return;
  Serial.printf("[CMD] %s\n", action);
  // Add actuator logic here if this node controls a relay/pump
}

void setup() {
  Serial.begin(115200);
  dht.begin();

  TOPIC_SENSORS  = String("agrisense/") + primary_id + "/" + secondary_id + "/sensors";
  TOPIC_COMMANDS = String("agrisense/") + primary_id + "/" + secondary_id + "/commands";

  connectWifi();
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onCommand);
  mqtt.setBufferSize(1024);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWifi();
  if (!mqtt.connected()) connectMqtt();
  mqtt.loop();

  if (millis() - lastPublish >= PUBLISH_INTERVAL) {
    lastPublish = millis();

    // ── Read sensors ─────────────────────────────────────────
    float airTemp  = dht.readTemperature();
    float humidity = dht.readHumidity();
    int   rawMoist = analogRead(MOISTURE_PIN);
    int   rawLdr   = analogRead(LDR_PIN);
    int   rawRain  = analogRead(RAIN_PIN);

    float moisture = adcToMoisturePct(rawMoist);
    float lux      = map(rawLdr, 0, 4095, 1000, 0); // Invert LDR
    float rainLvl  = map(rawRain, 0, 4095, 100, 0);

    // ── Build JSON payload ────────────────────────────────────
    StaticJsonDocument<512> doc;

    JsonObject soil    = doc.createNestedObject("soil");
    soil["moisture"]   = isnan(moisture) ? 0 : moisture;
    soil["temp"]       = isnan(airTemp)  ? 0 : airTemp; // Use air temp as proxy
    soil["ph"]         = 6.8;    // Replace with NPK sensor value if available
    JsonObject npk     = soil.createNestedObject("npk");
    npk["n"] = 82; npk["p"] = 44; npk["k"] = 195; // Replace with RS485 sensor

    JsonObject weather    = doc.createNestedObject("weather");
    weather["temp"]       = isnan(airTemp)  ? 0 : airTemp;
    weather["humidity"]   = isnan(humidity) ? 0 : humidity;
    weather["lightIntensity"] = lux;
    weather["rainLevel"]  = rainLvl;

    JsonObject water     = doc.createNestedObject("water");
    water["level"]       = 85;    // Replace with ultrasonic sensor value
    water["pumpActive"]  = false; // Replace with relay status pin

    // ── Publish ───────────────────────────────────────────────
    char buf[512];
    serializeJson(doc, buf);
    mqtt.publish(TOPIC_SENSORS.c_str(), buf);

    Serial.println("[PUB] Payload sent:");
    serializeJsonPretty(doc, Serial);
    Serial.println();
  }
}
