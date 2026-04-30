/*
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   AgriSense — Camera Gateway Node (Plain ESP32)             ║
 * ║   Board: ESP32 Dev Module (38-pin, NOT the ESP32-CAM)       ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  YOUR PART of the AgriSense system:                         ║
 * ║  • Creates WiFi AP "AgriSense_IoT" at 192.168.4.1           ║
 * ║  • ESP32-CAM joins this AP → streams at 192.168.4.2         ║
 * ║  • App controls Buzzer + LED via HTTP endpoints             ║
 * ║                                                             ║
 * ║  Teammates' code (soil, relay, storage) runs separately     ║
 * ║  on their own ESP32 nodes — nothing is touched here.        ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  HTTP Endpoints (all CORS-enabled):                         ║
 * ║    GET /buzzer?state=on|off  → control buzzer (GPIO 25)     ║
 * ║    GET /light?state=on|off   → control LED   (GPIO 5)       ║
 * ║    GET /status               → JSON node status             ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  Wiring:                                                    ║
 * ║    Passive Buzzer  +  → GPIO 25  |  - → GND                 ║
 * ║    LED             +  → GPIO 5   |  - → GND (330Ω series)   ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  Libraries needed (Arduino Library Manager):                ║
 * ║    • None beyond built-in WiFi.h / WebServer.h              ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

#include <WiFi.h>
#include <WebServer.h>

// ── WiFi Access Point ─────────────────────────────────────────────
// ESP32-CAM and phone/app both connect to this AP.
// IP is always 192.168.4.1 automatically.
#define AP_SSID  "AgriSense_IoT"
#define AP_PASS  "admin1234"

// ── Output pins ───────────────────────────────────────────────────
#define BUZZER_PIN  25   // Passive buzzer: + → GPIO25, - → GND
#define LED_PIN      5   // Status LED:    + → GPIO5 → 330Ω → GND

// ── HTTP server on port 80 ────────────────────────────────────────
WebServer server(80);

// ── State ─────────────────────────────────────────────────────────
bool buzzerOn = false;
bool ledOn    = false;

// ─────────────────────────────────────────────────────────────────
//  Helper: add CORS header to every response
// ─────────────────────────────────────────────────────────────────
void addCors() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
}

// ─────────────────────────────────────────────────────────────────
//  GET /buzzer?state=on|off
//  Called by the AgriSense app Buzzer button
// ─────────────────────────────────────────────────────────────────
void handleBuzzer() {
  addCors();
  String s = server.arg("state");

  if (s == "on") {
    buzzerOn = true;
    tone(BUZZER_PIN, 1000);   // 1 kHz alarm tone
    Serial.println("[BUZZ] ON  — app command");
  } else {
    buzzerOn = false;
    noTone(BUZZER_PIN);
    Serial.println("[BUZZ] OFF — app command");
  }

  server.send(200, "text/plain", "OK");
}

// ─────────────────────────────────────────────────────────────────
//  GET /light?state=on|off
//  Called by the AgriSense app Light button
// ─────────────────────────────────────────────────────────────────
void handleLight() {
  addCors();
  String s = server.arg("state");

  ledOn = (s == "on");
  digitalWrite(LED_PIN, ledOn ? HIGH : LOW);
  Serial.printf("[LED]  %s — app command\n", ledOn ? "ON" : "OFF");

  server.send(200, "text/plain", "OK");
}

// ─────────────────────────────────────────────────────────────────
//  GET /status
//  App can poll this to confirm node is alive
// ─────────────────────────────────────────────────────────────────
void handleStatus() {
  addCors();
  unsigned long uptime = millis() / 1000;
  uint8_t clients = WiFi.softAPgetStationNum();

  String json = "{";
  json += "\"node\":\"camera_gateway\",";
  json += "\"ip\":\"192.168.4.1\",";
  json += "\"ap\":\"" + String(AP_SSID) + "\",";
  json += "\"clients_connected\":" + String(clients) + ",";
  json += "\"buzzer\":" + String(buzzerOn ? "true" : "false") + ",";
  json += "\"light\":"  + String(ledOn    ? "true" : "false") + ",";
  json += "\"uptime_s\":" + String(uptime);
  json += "}";

  server.send(200, "application/json", json);
}

// ─────────────────────────────────────────────────────────────────
//  OPTIONS preflight (needed for browser CORS)
// ─────────────────────────────────────────────────────────────────
void handleOptions() {
  addCors();
  server.send(204);
}

// ─────────────────────────────────────────────────────────────────
//  SETUP
// ─────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\n╔══════════════════════════════════╗");
  Serial.println("║  AgriSense Camera Gateway Node  ║");
  Serial.println("╚══════════════════════════════════╝");

  // Output pins
  pinMode(BUZZER_PIN, OUTPUT);
  noTone(BUZZER_PIN);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  // Create WiFi AP — ESP32-CAM and app phone connect here
  WiFi.mode(WIFI_AP);
  WiFi.softAP(AP_SSID, AP_PASS);
  delay(100);  // brief settle time for AP to be ready

  Serial.printf("[AP]  SSID: %s\n", AP_SSID);
  Serial.printf("[AP]  IP:   %s\n", WiFi.softAPIP().toString().c_str());

  // Register HTTP routes
  server.on("/buzzer",  HTTP_GET,     handleBuzzer);
  server.on("/light",   HTTP_GET,     handleLight);
  server.on("/status",  HTTP_GET,     handleStatus);
  server.on("/buzzer",  HTTP_OPTIONS, handleOptions);
  server.on("/light",   HTTP_OPTIONS, handleOptions);
  server.begin();

  Serial.println("[HTTP] Server started on port 80");
  Serial.println("\n── Endpoints ────────────────────────");
  Serial.println("  http://192.168.4.1/buzzer?state=on");
  Serial.println("  http://192.168.4.1/buzzer?state=off");
  Serial.println("  http://192.168.4.1/light?state=on");
  Serial.println("  http://192.168.4.1/light?state=off");
  Serial.println("  http://192.168.4.1/status");
  Serial.println("─────────────────────────────────────");
  Serial.println("Waiting for ESP32-CAM and app...\n");

  // Quick LED blink = boot OK
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_PIN, HIGH); delay(100);
    digitalWrite(LED_PIN, LOW);  delay(100);
  }
}

// ─────────────────────────────────────────────────────────────────
//  LOOP — just handle HTTP requests + periodic status log
// ─────────────────────────────────────────────────────────────────
unsigned long lastLog = 0;

void loop() {
  server.handleClient();

  // Print connected client count every 10s for monitoring
  if (millis() - lastLog > 10000) {
    lastLog = millis();
    uint8_t n = WiFi.softAPgetStationNum();
    Serial.printf("[AP] %d device(s) connected | Buzzer:%s | LED:%s\n",
                  n,
                  buzzerOn ? "ON" : "off",
                  ledOn    ? "ON" : "off");
  }
}
