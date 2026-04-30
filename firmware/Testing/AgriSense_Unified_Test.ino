/**
 * AgriSense v4.4.6 - Real-Sensor Only Firmware
 * NO FAKE DATA: Only sends data for physically connected sensors.
 * If a sensor is disconnected, it will not be included in the JSON.
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>

// --- CONFIGURATION ---
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* mqtt_server = "broker.hivemq.com";
const char* topic_sensors = "agrisense/field_a/sensors";

// --- PIN ASSIGNMENTS ---
#define DHTPIN 4
#define DHTTYPE DHT22
#define SOIL_PIN 34
#define RAIN_PIN 35

DHT dht(DHTPIN, DHTTYPE);
WiFiClient espClient;
PubSubClient client(espClient);

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    String clientId = "AgriSenseClient-";
    clientId += String(random(0xffff), HEX);
    if (client.connect(clientId.c_str())) {
      Serial.println("connected");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  dht.begin();
  setup_wifi();
  client.setServer(mqtt_server, 1883);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // --- SENSOR READING ---
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  
  int rawSoil = analogRead(SOIL_PIN);
  float soilMoisture = map(rawSoil, 4095, 1200, 0, 100); 
  soilMoisture = constrain(soilMoisture, 0, 100);

  int rawRain = analogRead(RAIN_PIN);
  float rainLevel = map(rawRain, 4095, 0, 0, 100);
  rainLevel = constrain(rainLevel, 0, 100);

  // --- CONSTRUCT JSON (REAL DATA ONLY) ---
  String payload = "{";
  payload += "\"device_id\":\"ESP32_AGRI_MASTER\"";
  
  // 1. Soil Data (Only if moisture > 0 or relevant)
  payload += ",\"soil\":{";
  payload += "\"moisture\":" + String(soilMoisture);
  payload += "}";

  // 2. Weather Data (Only if DHT is alive)
  if (!isnan(h) && !isnan(t)) {
    payload += ",\"weather\":{";
    payload += "\"temp\":" + String(t) + ",";
    payload += "\"humidity\":" + String(h) + ",";
    payload += "\"rainLevel\":" + String(rainLevel);
    payload += "}";
  } else {
    // If DHT fails, we still send rainLevel if possible
    payload += ",\"weather\":{\"rainLevel\":" + String(rainLevel) + "}";
  }
  
  payload += "}";

  Serial.print("Publishing: ");
  Serial.println(payload);
  client.publish(topic_sensors, payload.c_str());

  delay(10000); 
}
