/*
 * ╔══════════════════════════════════════════════════════════════╗
 * ║         AgriSense Pro — Relay Control Node                   ║
 * ║         Board: ESP32 DevKit v1                               ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  Controls: Pump, Valve, Buzzer, Light, Display               ║
 * ║  Subscribes: MQTT command topic and triggers relays          ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 *  Libraries: PubSubClient, ArduinoJson
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ── STEP 1: WiFi credentials ───────────────────────────────────
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";

// ── STEP 2: Pairing Identity ───────────────────────────────────
const char* primary_id   = "innovatex";
const char* secondary_id = "semicolon";

// ── STEP 3: Relay/Output Pin Assignments ──────────────────────
#define PUMP_PIN    26   // Irrigation pump relay
#define VALVE_PIN   27   // Water valve relay
#define BUZZER_PIN  14   // Buzzer output
#define LIGHT_PIN   12   // LED grow light relay
#define SPRAYER_PIN 13   // Mist sprayer relay

const char* MQTT_HOST = "broker.hivemq.com";
const int   MQTT_PORT = 1883;

String TOPIC_COMMANDS;
String TOPIC_STATUS;

WiFiClient   espClient;
PubSubClient mqtt(espClient);

void connectWifi() {
  Serial.printf("Connecting to %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.printf("\nWiFi OK — IP: %s\n", WiFi.localIP().toString().c_str());
}

void onCommand(char* topic, byte* payload, unsigned int length) {
  StaticJsonDocument<256> doc;
  if (deserializeJson(doc, payload, length)) return;

  const char* action = doc["action"];
  if (!action) return;

  String cmd = String(action);
  Serial.printf("[CMD] Received: %s\n", cmd.c_str());

  // Pump
  if      (cmd == "PUMP_ON")     { digitalWrite(PUMP_PIN,    HIGH); Serial.println("Pump ON"); }
  else if (cmd == "PUMP_OFF")    { digitalWrite(PUMP_PIN,    LOW);  Serial.println("Pump OFF"); }

  // Valve
  else if (cmd == "VALVE_OPEN")  { digitalWrite(VALVE_PIN,   HIGH); Serial.println("Valve OPEN"); }
  else if (cmd == "VALVE_CLOSE") { digitalWrite(VALVE_PIN,   LOW);  Serial.println("Valve CLOSED"); }

  // Buzzer
  else if (cmd == "BUZZER_ON")   { digitalWrite(BUZZER_PIN,  HIGH); Serial.println("Buzzer ON"); }
  else if (cmd == "BUZZER_OFF")  { digitalWrite(BUZZER_PIN,  LOW);  Serial.println("Buzzer OFF"); }

  // Light
  else if (cmd == "LIGHT_ON")    { digitalWrite(LIGHT_PIN,   HIGH); Serial.println("Light ON"); }
  else if (cmd == "LIGHT_OFF")   { digitalWrite(LIGHT_PIN,   LOW);  Serial.println("Light OFF"); }

  // Sprayer
  else if (cmd == "SPRAY_ON")    { digitalWrite(SPRAYER_PIN, HIGH); Serial.println("Sprayer ON"); }
  else if (cmd == "SPRAY_OFF")   { digitalWrite(SPRAYER_PIN, LOW);  Serial.println("Sprayer OFF"); }

  else { Serial.printf("[CMD] Unknown: %s\n", cmd.c_str()); }
}

void connectMqtt() {
  while (!mqtt.connected()) {
    String id = "agrisense_relay_" + String(random(0xffff), HEX);
    if (mqtt.connect(id.c_str())) {
      Serial.println("MQTT connected.");
      mqtt.subscribe(TOPIC_COMMANDS.c_str());
      Serial.printf("Subscribed to: %s\n", TOPIC_COMMANDS.c_str());
    } else {
      Serial.printf("MQTT failed (rc=%d), retry...\n", mqtt.state());
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);

  // Init output pins
  pinMode(PUMP_PIN,    OUTPUT); digitalWrite(PUMP_PIN,    LOW);
  pinMode(VALVE_PIN,   OUTPUT); digitalWrite(VALVE_PIN,   LOW);
  pinMode(BUZZER_PIN,  OUTPUT); digitalWrite(BUZZER_PIN,  LOW);
  pinMode(LIGHT_PIN,   OUTPUT); digitalWrite(LIGHT_PIN,   LOW);
  pinMode(SPRAYER_PIN, OUTPUT); digitalWrite(SPRAYER_PIN, LOW);

  TOPIC_COMMANDS = String("agrisense/") + primary_id + "/" + secondary_id + "/commands";
  TOPIC_STATUS   = String("agrisense/") + primary_id + "/" + secondary_id + "/relay_status";

  connectWifi();
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onCommand);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWifi();
  if (!mqtt.connected()) connectMqtt();
  mqtt.loop();
}
