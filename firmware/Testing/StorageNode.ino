/**
 * 🛰️ AgriSense Modular Test - STORAGE NODE ONLY
 * Topic: agrisense/field_a/sensors
 * Function: Reads Silo Temp, Humidity, and Gas/AQI only.
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

const char* ssid = "Redmi Note 11 Pro+ 5G";         
const char* password = "@polu1411P"; 
const char* mqtt_server = "broker.hivemq.com";

#define DHT_STORAGE_PIN 15
#define MQ135_PIN 36

DHT dhtStorage(DHT_STORAGE_PIN, DHT11);
WiFiClient espClient;
PubSubClient client(espClient);
unsigned long lastMsg = 0;

void setup() {
  Serial.begin(115200);
  dhtStorage.begin();
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); }
  client.setServer(mqtt_server, 1883);
}

void loop() {
  if (!client.connected()) {
    String clientId = "StorageNode-" + String(random(0xffff), HEX);
    if (client.connect(clientId.c_str())) { /* Connected */ }
    else delay(5000);
  }
  client.loop();

  if (millis() - lastMsg > 3000) {
    lastMsg = millis();
    float sTemp = dhtStorage.readTemperature();
    float sHum = dhtStorage.readHumidity();
    int aqi = map(analogRead(MQ135_PIN), 0, 4095, 0, 1000);

    StaticJsonDocument<512> doc;
    JsonObject storage = doc.createNestedObject("storage");
    storage["temp"] = sTemp;
    storage["humidity"] = sHum;
    storage["aqi"] = aqi;

    char buffer[512];
    serializeJson(doc, buffer);
    client.publish("agrisense/field_a/sensors", buffer);
  }
}
