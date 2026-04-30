/**
 * AgriSense v3.95 Industrial Hardware Test Suite
 * Components: Soil (Moist, pH, NPK), Weather (Temp, Hum, Rain, LDR), OLED, Pump/Relay
 * Targets: ESP32-WROOM / ESP32-S3
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ─── PIN DEFINITIONS ────────────────────────────────────────────────────────
#define PIN_MOISTURE    34
#define PIN_PH          35
#define PIN_LDR         33
#define PIN_RAIN        32
#define PIN_DHT         4
#define PIN_PUMP_BTN    12
#define PIN_LED_STATUS  2
#define PIN_RELAY_PUMP  27

// OLED I2C Configuration
#define SDA_PIN 21
#define SCL_PIN 22

// NPK RS485 (Modbus) Configuration
#define RXD2 16
#define TXD2 17
const byte npk_query[] = {0x01, 0x03, 0x00, 0x1e, 0x00, 0x03, 0x65, 0xcd};
byte npk_response[11];



// ─── SENSOR CONFIG ──────────────────────────────────────────────────────────
#define DHTTYPE DHT11
DHT dht(PIN_DHT, DHTTYPE);

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// ─── NETWORK CONFIG ─────────────────────────────────────────────────────────
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* mqtt_server = "broker.hivemq.com"; 
const char* node_id = "agrisense_main_node";

const char* topic_soil = "agrisense/v1/node/soil/telemetry";
const char* topic_weather = "agrisense/v1/node/weather/telemetry";

WiFiClient espClient;
PubSubClient client(espClient);


// ─── GLOBAL STATE ───────────────────────────────────────────────────────────
bool pumpState = false;
unsigned long lastMsg = 0;

void setup() {
  Serial.begin(115200);
  
  // Pin Modes
  pinMode(PIN_LED_STATUS, OUTPUT);
  pinMode(PIN_RELAY_PUMP, OUTPUT);
  pinMode(PIN_PUMP_BTN, INPUT_PULLUP);
  
  // Initialize Sensors
  dht.begin();
  Wire.begin(SDA_PIN, SCL_PIN);
  
  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("SSD1306 allocation failed"));
  }
  
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(WHITE);
  display.setCursor(0,0);
  display.println("AGRISENSE v4.03");
  display.println("Initializing...");
  display.display();


  setup_wifi();
  client.setServer(mqtt_server, 1883);

  // Initialize NPK Serial
  Serial2.begin(9600, SERIAL_8N1, RXD2, TXD2);
}

void readNPK(int &n, int &p, int &k) {
  Serial2.write(npk_query, sizeof(npk_query));
  uint32_t startTime = millis();
  int i = 0;
  while ((millis() - startTime < 500) && i < 11) {
    if (Serial2.available()) npk_response[i++] = Serial2.read();
  }
  if (i == 11) {
    n = (npk_response[3] << 8) | npk_response[4];
    p = (npk_response[5] << 8) | npk_response[6];
    k = (npk_response[7] << 8) | npk_response[8];
  }
}

void setup_wifi() {

  delay(10);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    digitalWrite(PIN_LED_STATUS, !digitalRead(PIN_LED_STATUS));
  }
  digitalWrite(PIN_LED_STATUS, HIGH);
}

void reconnect() {
  while (!client.connected()) {
    if (client.connect(node_id)) {
      client.subscribe("agrisense/v1/commands");
    } else {
      delay(5000);
    }
  }
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  // Local Pump Button Control
  if (digitalRead(PIN_PUMP_BTN) == LOW) {
    delay(50); // Debounce
    pumpState = !pumpState;
    digitalWrite(PIN_RELAY_PUMP, pumpState);
    while(digitalRead(PIN_PUMP_BTN) == LOW); // Wait for release
  }

  unsigned long now = millis();
  if (now - lastMsg > 10000) { // Publish every 10s
    lastMsg = now;

    // ─── READ SENSORS ───────────────────────────────────────────────────────
    float hum = dht.readHumidity();
    float temp = dht.readTemperature();
    int moist = map(analogRead(PIN_MOISTURE), 4095, 1200, 0, 100);
    float ph = (analogRead(PIN_PH) / 4095.0) * 14.0;
    int ldr = map(analogRead(PIN_LDR), 0, 4095, 100, 0);
    bool isRaining = digitalRead(PIN_RAIN) == LOW;

    // Read Physical NPK via RS485/Modbus
    int n = 0, p = 0, k = 0;
    readNPK(n, p, k);

    // ─── UPDATE OLED ────────────────────────────────────────────────────────
    display.clearDisplay();
    display.setCursor(0,0);
    display.println("--- DIAGNOSTICS ---");
    display.printf("Moist: %d%% | pH: %.1f\n", moist, ph);
    display.printf("N:%d P:%d K:%d\n", n, p, k);
    display.printf("Temp: %.1fC | Hum: %.0f%%\n", temp, hum);
    display.printf("Rain: %s | LDR: %d\n", isRaining ? "YES" : "NO", ldr);
    display.printf("PUMP: %s\n", pumpState ? "ACTIVE" : "OFF");
    display.display();


    // ─── MEASURE REAL-TIME LATENCY ──────────────────────────────────────────
    uint32_t startPing = millis();
    bool pingSuccess = client.publish("agrisense/v1/node/ping", "ping");
    uint32_t nodeLatency = pingSuccess ? (millis() - startPing) : 0;

    // ─── 1. PUBLISH SOIL TELEMETRY ──────────────────────────────────────────
    StaticJsonDocument<512> soilDoc;
    soilDoc["device_id"] = "soil_node_alpha";
    soilDoc["timestamp"] = millis();
    soilDoc["rssi"] = WiFi.RSSI();
    soilDoc["latency"] = nodeLatency;
    
    soilDoc["moisture"] = moist;
    soilDoc["ph"] = ph;
    soilDoc["pump_status"] = digitalRead(PIN_RELAY_PUMP) == HIGH ? "ACTIVE" : "OFF";
    JsonObject npk = soilDoc.createNestedObject("npk");

    npk["n"] = n; npk["p"] = p; npk["k"] = k;
    
    char soilBuffer[512];
    serializeJson(soilDoc, soilBuffer);
    client.publish(topic_soil, soilBuffer);

    // ─── 2. PUBLISH WEATHER TELEMETRY ───────────────────────────────────────
    StaticJsonDocument<512> weatherDoc;
    weatherDoc["device_id"] = "weather_node_alpha";
    weatherDoc["timestamp"] = millis();
    weatherDoc["rssi"] = WiFi.RSSI();
    weatherDoc["latency"] = nodeLatency;
    
    // Physical Validation for DHT
    if (!isnan(temp)) weatherDoc["temperature"] = temp;
    if (!isnan(hum)) weatherDoc["humidity"] = hum;
    
    weatherDoc["rain"] = isRaining ? 1.0 : 0.0;
    weatherDoc["ldr"] = ldr;

    char weatherBuffer[512];
    serializeJson(weatherDoc, weatherBuffer);
    client.publish(topic_weather, weatherBuffer);
  }
}



