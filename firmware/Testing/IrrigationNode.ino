/**
 * 🛰️ AgriSense Modular Test - IRRIGATION NODE ONLY
 * Topic: agrisense/field_a/sensors
 * Function: Reads Water Level and handles Pump Relay only.
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

const char* ssid = "Redmi Note 11 Pro+ 5G";         
const char* password = "@polu1411P"; 
const char* mqtt_server = "broker.hivemq.com";

#define WATER_LVL_PIN 14
#define RELAY_PUMP 26
#define BUZZER_PIN 27

WiFiClient espClient;
PubSubClient client(espClient);
unsigned long lastMsg = 0;

void callback(char* topic, byte* payload, unsigned int length) {
  StaticJsonDocument<200> doc;
  deserializeJson(doc, payload, length);
  if (String(doc["action"]) == "PUMP_ON") {
    digitalWrite(RELAY_PUMP, HIGH);
    tone(BUZZER_PIN, 1000, 200);
  } else if (String(doc["action"]) == "PUMP_OFF") {
    digitalWrite(RELAY_PUMP, LOW);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PUMP, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(RELAY_PUMP, LOW);
  
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); }
  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) {
    String clientId = "WaterNode-" + String(random(0xffff), HEX);
    if (client.connect(clientId.c_str())) {
      client.subscribe("agrisense/field_a/water/commands");
    } else delay(5000);
  }
  client.loop();

  if (millis() - lastMsg > 3000) {
    lastMsg = millis();
    int waterLvl = map(analogRead(WATER_LVL_PIN), 4095, 0, 0, 100);

    StaticJsonDocument<512> doc;
    JsonObject water = doc.createNestedObject("water");
    water["level"] = constrain(waterLvl, 0, 100);
    water["pumpActive"] = digitalRead(RELAY_PUMP);

    char buffer[512];
    serializeJson(doc, buffer);
    client.publish("agrisense/field_a/sensors", buffer);
  }
}
