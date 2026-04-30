/*
 * ╔══════════════════════════════════════════════════════════════╗
 * ║         AgriSense Pro — Storage Environment Node             ║
 * ║         Board: ESP32 DevKit v1                               ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  Sensors: DHT22 (Temp/Humidity), MQ135 (Air Quality/Gas)    ║
 * ║  Publishes: Storage vault telemetry via MQTT                 ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 *  Libraries: PubSubClient, ArduinoJson, DHT sensor (Adafruit)
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ── STEP 1: WiFi credentials ───────────────────────────────────
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";

// ── STEP 2: Pairing Identity ───────────────────────────────────
const char* primary_id   = "innovatex";
const char* secondary_id = "semicolon";

// ── STEP 3: Pin Assignments ────────────────────────────────────
#define DHT_PIN   21
#define DHT_TYPE  DHT22
#define MQ135_PIN 34   // Analog gas sensor

const char* MQTT_HOST = "broker.hivemq.com";
const int   MQTT_PORT = 1883;

String TOPIC_SENSORS;
String TOPIC_COMMANDS;

DHT          dht(DHT_PIN, DHT_TYPE);
WiFiClient   espClient;
PubSubClient mqtt(espClient);
unsigned long lastPublish = 0;

void connectWifi() {
  Serial.printf("Connecting to %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.printf("\nWiFi OK — IP: %s\n", WiFi.localIP().toString().c_str());
}

void connectMqtt() {
  while (!mqtt.connected()) {
    String id = "agrisense_storage_" + String(random(0xffff), HEX);
    if (mqtt.connect(id.c_str())) {
      Serial.println("MQTT connected.");
      mqtt.subscribe(TOPIC_COMMANDS.c_str());
    } else {
      Serial.printf("MQTT failed (rc=%d), retry...\n", mqtt.state());
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  dht.begin();
  TOPIC_SENSORS  = String("agrisense/") + primary_id + "/" + secondary_id + "/sensors";
  TOPIC_COMMANDS = String("agrisense/") + primary_id + "/" + secondary_id + "/commands";
  connectWifi();
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setBufferSize(512);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWifi();
  if (!mqtt.connected()) connectMqtt();
  mqtt.loop();

  if (millis() - lastPublish >= 5000) {
    lastPublish = millis();

    float temp     = dht.readTemperature();
    float humidity = dht.readHumidity();
    int   mq135Raw = analogRead(MQ135_PIN);
    // Convert raw ADC to approximate PPM (calibrate for your sensor)
    float mq135Ppm = map(mq135Raw, 0, 4095, 0, 1000);

    StaticJsonDocument<256> doc;
    JsonObject storage    = doc.createNestedObject("storage");
    storage["temp"]       = isnan(temp)     ? 0 : temp;
    storage["humidity"]   = isnan(humidity) ? 0 : humidity;
    storage["mq135"]      = mq135Ppm;

    char buf[256];
    serializeJson(doc, buf);
    mqtt.publish(TOPIC_SENSORS.c_str(), buf);

    Serial.println("[StorageNode] Published:");
    serializeJsonPretty(doc, Serial);
    Serial.println();
  }
}
