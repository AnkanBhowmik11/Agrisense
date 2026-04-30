/**
 * 🛰️ AgriSense Minimalist Test - MOISTURE & TEMP ONLY
 * Topic: agrisense/field_a/sensors
 * Function: Rapid testing for Moisture (Pin 34) and Soil Temp (DHT11 Pin 4).
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// Network Configuration
const char* ssid = "Redmi Note 11 Pro+ 5G";         
const char* password = "@polu1411P"; 
const char* mqtt_server = "broker.hivemq.com";

// Hardware Pinout
#define MOISTURE_PIN 34
#define DHT_SOIL_PIN 4

DHT dhtSoil(DHT_SOIL_PIN, DHT11);
WiFiClient espClient;
PubSubClient client(espClient);
unsigned long lastMsg = 0;

void setup() {
  Serial.begin(115200);
  Serial.println("--- AgriSense Minimalist Sensor Audit Initialized ---");
  
  dhtSoil.begin();
  
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected.");
  
  client.setServer(mqtt_server, 1883);
}

void reconnect() {
  while (!client.connected()) {
    String clientId = "SoilNode-Minimal-" + String(random(0xffff), HEX);
    if (client.connect(clientId.c_str())) {
      Serial.println("MQTT Connected as " + clientId);
    } else {
      Serial.print("MQTT Failed, rc=");
      Serial.print(client.state());
      Serial.println(" retrying in 5 seconds...");
      delay(5000);
    }
  }
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  // Read every 1 second (High-Speed Calibration Mode)
  if (millis() - lastMsg > 1000) {
    lastMsg = millis();

    // 1. Read Soil Moisture (Analog)
    int rawMoisture = analogRead(MOISTURE_PIN);
    // Calibration: 4095 (Air/Dry) to 1200 (Water/Wet) -> 0-100%
    int moisture = map(rawMoisture, 4095, 1200, 0, 100);
    moisture = constrain(moisture, 0, 100);

    // 2. Read Soil Temperature (DHT11)
    float soilTemp = dhtSoil.readTemperature();
    
    // Safety check for DHT sensor
    if (isnan(soilTemp)) {
      Serial.println("Failed to read from DHT sensor!");
      soilTemp = 0.0;
    }

    // --- JSON PACKAGING ---
    StaticJsonDocument<256> doc;
    JsonObject soil = doc.createNestedObject("soil");
    soil["moisture"] = moisture;
    soil["temp"] = soilTemp;

    char buffer[256];
    serializeJson(doc, buffer);
    
    Serial.print("Publishing: ");
    Serial.println(buffer);
    client.publish("agrisense/field_a/sensors", buffer);
  }
}
