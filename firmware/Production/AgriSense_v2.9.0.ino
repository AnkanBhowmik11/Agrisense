/**
 * 🛰️ AgriSense v6.8.0 - INDUSTRIAL MASTER FIRMWARE
 * Organized by Node-Specific Pin Mapping
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>

// 📶 NETWORK CONFIGURATION
const char* ssid = "Redmi Note 11 Pro+ 5G";         
const char* password = "@polu1411P"; 
const char* mqtt_server = "broker.hivemq.com";

// ==========================================
// 📍 NODE-WISE PIN MAPPING (INDUSTRIAL)
// ==========================================

// 1. 🌱 SOIL NODE
#define DHT_SOIL_PIN 4       // Root Zone Temperature
#define MOISTURE_PIN 34      // Soil Moisture (Analog)
#define PH_PIN 33            // Soil pH Sensor (Analog)
#define NPK_RX2 16           // RS485 Modbus
#define NPK_TX2 17
#define MAX485_DE_RE 18

// 2. ☁️ WEATHER NODE
#define DHT_WEATHER_PIN 13   // Ambient Temperature/Humidity
#define RAIN_PIN 32          // Rain Detection
#define LDR_PIN 25           // Light Intensity

// 3. 📦 STORAGE NODE
#define DHT_STORAGE_PIN 15   // Silo/Storage Temperature
#define MQ135_PIN 36         // Air Quality/Gas Sensor

// 4. 💦 IRRIGATION NODE
#define WATER_LVL_PIN 14     // Tank Level Sensor
#define RELAY_PUMP 26        // Pump Relay Actuator

// 5. 🛠️ SYSTEM & INTERFACE
#define BUZZER_PIN 27        // Alarm Buzzer
#define OLED_SDA 21          // I2C Display
#define OLED_SCL 22
#define LED_WIFI 2           // Blue LED
#define LED_MQTT 4           // Green LED
#define LED_PUMP 5           // Amber LED
#define LED_ALERT 19         // Red LED

// ==========================================
// 🧬 SYSTEM OBJECTS
// ==========================================

DHT dhtWeather(DHT_WEATHER_PIN, DHT11);
DHT dhtStorage(DHT_STORAGE_PIN, DHT11);
DHT dhtSoil(DHT_SOIL_PIN, DHT11);

Adafruit_SSD1306 display(128, 64, &Wire, -1);
HardwareSerial npkSerial(2); 
byte request[] = {0x01,0x03,0x00,0x1E,0x00,0x03,0x65,0xCD};

WiFiClient espClient;
PubSubClient client(espClient);
unsigned long lastMsg = 0;

// 📥 COMMAND CALLBACK
void callback(char* topic, byte* payload, unsigned int length) {
  StaticJsonDocument<200> doc;
  deserializeJson(doc, payload, length);
  if (String(doc["action"]) == "PUMP_ON") {
    digitalWrite(RELAY_PUMP, HIGH);
    digitalWrite(LED_PUMP, HIGH);
    tone(BUZZER_PIN, 1000, 200); 
  } else if (String(doc["action"]) == "PUMP_OFF") {
    digitalWrite(RELAY_PUMP, LOW);
    digitalWrite(LED_PUMP, LOW);
  }
}

void setup() {
  Serial.begin(115200);
  
  // Pin Mode Setup
  pinMode(RELAY_PUMP, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(MAX485_DE_RE, OUTPUT);
  pinMode(LED_WIFI, OUTPUT);
  pinMode(LED_MQTT, OUTPUT);
  pinMode(LED_PUMP, OUTPUT);
  pinMode(LED_ALERT, OUTPUT);

  // Startup Test
  digitalWrite(LED_ALERT, HIGH); delay(500); digitalWrite(LED_ALERT, LOW);

  dhtWeather.begin();
  dhtStorage.begin();
  dhtSoil.begin();
  
  npkSerial.begin(9600, SERIAL_8N1, NPK_RX2, NPK_TX2);
  Wire.begin(OLED_SDA, OLED_SCL);
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  
  setup_wifi();
  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);
}

void setup_wifi() {
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { 
    digitalWrite(LED_WIFI, !digitalRead(LED_WIFI)); 
    delay(500); 
  }
  digitalWrite(LED_WIFI, HIGH);
}

void reconnect() {
  while (!client.connected()) {
    digitalWrite(LED_MQTT, LOW);
    // 🆔 UNIQUE CLIENT ID GENERATION (Avoids HiveMQ Collisions)
    String clientId = "AgriSense-" + String(random(0xffff), HEX);
    if (client.connect(clientId.c_str())) {
      client.subscribe("agrisense/field_a/water/commands");
      digitalWrite(LED_MQTT, HIGH);
      Serial.println("MQTT: Connected with ID: " + clientId);
    } else { 
      Serial.print("MQTT: Failed, rc="); Serial.print(client.state());
      delay(5000); 
    }
  }
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  // ⏱️ 3-SECOND HEARTBEAT (Industrial Standard)
  if (millis() - lastMsg > 3000) { 
    lastMsg = millis();

    // 1. DATA ACQUISITION
    float wTemp = dhtWeather.readTemperature();
    float wHum = dhtWeather.readHumidity();
    float sTemp = dhtStorage.readTemperature();
    float sHum = dhtStorage.readHumidity();
    float soilT = dhtSoil.readTemperature();
    int moisture = map(analogRead(MOISTURE_PIN), 4095, 1200, 0, 100);
    float phVal = (analogRead(PH_PIN) * 3.3 / 4095.0) * 3.5; 
    int waterLvl = map(analogRead(WATER_LVL_PIN), 4095, 0, 0, 100);
    int rain = map(analogRead(RAIN_PIN), 4095, 0, 0, 100);
    int aqi = map(analogRead(MQ135_PIN), 0, 4095, 0, 1000);

    // 2. RS485 NPK POLLING
    int n=0, p=0, k=0;
    digitalWrite(MAX485_DE_RE, 1);
    npkSerial.write(request, sizeof(request));
    npkSerial.flush();
    digitalWrite(MAX485_DE_RE, 0);
    delay(200); // Optimized delay
    if(npkSerial.available()) {
       byte res[11]; npkSerial.readBytes(res, 11);
       n = res[3]; p = res[5]; k = res[7];
    }

    // 3. UNIFIED JSON PAYLOAD (EXPANDED BUFFER)
    StaticJsonDocument<1536> doc;
    
    JsonObject soilNode = doc.createNestedObject("soil");
    soilNode["moisture"] = constrain(moisture, 0, 100);
    soilNode["temp"] = soilT;
    soilNode["ph"] = phVal;
    JsonObject npkDoc = soilNode.createNestedObject("npk");
    npkDoc["n"] = n; npkDoc["p"] = p; npkDoc["k"] = k;

    JsonObject weatherNode = doc.createNestedObject("weather");
    weatherNode["temp"] = wTemp;
    weatherNode["humidity"] = wHum;
    weatherNode["rainLevel"] = constrain(rain, 0, 100);

    JsonObject storageNode = doc.createNestedObject("storage");
    storageNode["temp"] = sTemp;
    storageNode["humidity"] = sHum;
    storageNode["aqi"] = aqi;

    JsonObject waterNode = doc.createNestedObject("water");
    waterNode["level"] = constrain(waterLvl, 0, 100);
    waterNode["pumpActive"] = digitalRead(RELAY_PUMP);

    char buffer[1536];
    serializeJson(doc, buffer);
    client.publish("agrisense/field_a/sensors", buffer);

    // 4. OLED REFRESH
    display.clearDisplay();
    display.setCursor(0,0);
    display.printf("SOIL: M:%d%% PH:%.1f", moisture, phVal);
    display.setCursor(0,15);
    display.printf("WEAT: T:%.1f H:%.1f", wTemp, wHum);
    display.setCursor(0,30);
    display.printf("STOR: T:%.1f A:%d", sTemp, aqi);
    display.setCursor(0,45);
    display.printf("WATR: L:%d%% P:%s", waterLvl, digitalRead(RELAY_PUMP) ? "ON" : "OFF");
    display.display();

    // 5. LOCAL ALERTS
    if (moisture < 25 || waterLvl < 15) digitalWrite(BUZZER_PIN, HIGH);
    else digitalWrite(BUZZER_PIN, LOW);
  }
}
