/**
 * 🛰️ AgriSense Modular Test - WEATHER NODE ONLY
 * Topic: agrisense/field_a/sensors
 * Function: Reads Air Temp, Humidity, Rain, and Light only.
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

const char* ssid = "Redmi Note 11 Pro+ 5G";         
const char* password = "@polu1411P"; 
const char* mqtt_server = "broker.hivemq.com";

#define DHT_WEATHER_PIN 13
#define RAIN_PIN 32
#define LDR_PIN 25

DHT dhtWeather(DHT_WEATHER_PIN, DHT11);
WiFiClient espClient;
PubSubClient client(espClient);
unsigned long lastMsg = 0;

void setup() {
  Serial.begin(115200);
  dhtWeather.begin();
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); }
  client.setServer(mqtt_server, 1883);
}

void loop() {
  if (!client.connected()) {
    String clientId = "WeatherNode-" + String(random(0xffff), HEX);
    if (client.connect(clientId.c_str())) { /* Connected */ }
    else delay(5000);
  }
  client.loop();

  if (millis() - lastMsg > 3000) {
    lastMsg = millis();
    float airT = dhtWeather.readTemperature();
    float airH = dhtWeather.readHumidity();
    int rain = map(analogRead(RAIN_PIN), 4095, 0, 0, 100);
    int light = analogRead(LDR_PIN);

    StaticJsonDocument<512> doc;
    JsonObject weather = doc.createNestedObject("weather");
    weather["temp"] = airT;
    weather["humidity"] = airH;
    weather["rainLevel"] = constrain(rain, 0, 100);
    weather["lightIntensity"] = light;

    char buffer[512];
    serializeJson(doc, buffer);
    client.publish("agrisense/field_a/sensors", buffer);
  }
}
