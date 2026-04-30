/**
 * 🛰️ AgriSense Modular Test - SOIL NODE ONLY
 * Topic: agrisense/field_a/sensors
 * Function: Reads Soil Moisture, pH, and NPK only.
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

const char* ssid = "Redmi Note 11 Pro+ 5G";         
const char* password = "@polu1411P"; 
const char* mqtt_server = "broker.hivemq.com";

#define MOISTURE_PIN 34
#define PH_PIN 33
#define DHT_SOIL_PIN 4
#define NPK_RX2 16
#define NPK_TX2 17
#define MAX485_DE_RE 18

DHT dhtSoil(DHT_SOIL_PIN, DHT11);
HardwareSerial npkSerial(2);
WiFiClient espClient;
PubSubClient client(espClient);
unsigned long lastMsg = 0;
byte request[] = {0x01,0x03,0x00,0x1E,0x00,0x03,0x65,0xCD};

void setup() {
  Serial.begin(115200);
  pinMode(MAX485_DE_RE, OUTPUT);
  dhtSoil.begin();
  npkSerial.begin(9600, SERIAL_8N1, NPK_RX2, NPK_TX2);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); }
  client.setServer(mqtt_server, 1883);
}

void loop() {
  if (!client.connected()) {
    String clientId = "SoilNode-" + String(random(0xffff), HEX);
    if (client.connect(clientId.c_str())) { Serial.println("Connected: " + clientId); }
    else delay(5000);
  }
  client.loop();

  if (millis() - lastMsg > 3000) {
    lastMsg = millis();
    int moisture = map(analogRead(MOISTURE_PIN), 4095, 1200, 0, 100);
    float phVal = (analogRead(PH_PIN) * 3.3 / 4095.0) * 3.5;
    float soilT = dhtSoil.readTemperature();

    int n=0, p=0, k=0;
    digitalWrite(MAX485_DE_RE, 1);
    npkSerial.write(request, sizeof(request));
    npkSerial.flush();
    digitalWrite(MAX485_DE_RE, 0);
    delay(500);
    if(npkSerial.available()) {
      byte res[11]; npkSerial.readBytes(res, 11);
      n = res[3]; p = res[5]; k = res[7];
    }

    StaticJsonDocument<512> doc;
    JsonObject soil = doc.createNestedObject("soil");
    soil["moisture"] = constrain(moisture, 0, 100);
    soil["temp"] = soilT;
    soil["ph"] = phVal;
    JsonObject npkDoc = soil.createNestedObject("npk");
    npkDoc["n"] = n; npkDoc["p"] = p; npkDoc["k"] = k;

    char buffer[512];
    serializeJson(doc, buffer);
    client.publish("agrisense/field_a/sensors", buffer);
  }
}
