/*
 * ParkAssist — Split Ultrasonic Test  (Sensor ESP32)
 * -----------------------------------------------------
 * Flash this to the PLAIN ESP32 (38-pin, NOT the ESP32-CAM).
 *
 * HOW TO USE:
 *   1. Power on this ESP32 first  (creates the "ParkAssist" WiFi AP)
 *   2. Power on ESP32-CAM         (joins "ParkAssist", gets 192.168.4.2)
 *   3. Phone WiFi  →  "ParkAssist"   (password: parkassist)
 *   4. Browser     →  http://192.168.4.1
 *   Done — both sensors + camera appear automatically.
 *
 * Sensor wiring (safe pins — no conflict with ESP32-CAM):
 *   HC-SR04 LEFT   TRIG → GPIO 12  |  ECHO → GPIO 13 *
 *   HC-SR04 RIGHT  TRIG → GPIO 14  |  ECHO → GPIO 15 *
 *   Both sensors   VCC  → 5V (or VIN)  |  GND → GND
 *
 *   * ECHO is 5V output from HC-SR04 but ESP32 GPIO is 3.3V.
 *     Use a voltage divider on each ECHO line:
 *     ECHO pin → [1kΩ] → GPIO → [2kΩ] → GND
 *
 * Libraries (Arduino Library Manager):
 *   - WebSockets  by Markus Sattler
 *   - ArduinoJson by Benoit Blanchon
 */

#include <WiFi.h>
#include <WebServer.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>
#include "index_html.h"
#include "styles_css.h"
#include "script_js.h"

// ─── AP — phone and ESP32-CAM connect here ───────────────────────────────────
#define AP_SSID  "AgriSense_IoT"
#define AP_PASS  "admin1234"
// Sensor ESP32 softAP is always 192.168.4.1 — no config needed.

// ─── Sensor pins ──────────────────────────────────────────────────────────────
#define SENSOR_L_TRIG   12
#define SENSOR_L_ECHO   13
#define SENSOR_R_TRIG   14
#define SENSOR_R_ECHO   15

// ─── Unsafe alerts (buzzer + LED) ────────────────────────────────────────────
// Unsafe behavior thresholds match the UI logic:
// - Warning zone: dist <= 80cm  (includes stop zone)
// - Stop zone:    dist <= 30cm
// Note: dist comes from fused ultrasonic sensors and is only meaningful when `valid` is true.
#define WARN_CM  80
#define STOP_CM  30

// Passive buzzer + LED (controlled by distance logic AND app HTTP commands)
#define LED_PIN     5
#define BUZZER_PIN  25

// Manual override flags — set by app HTTP commands
bool manualBuzzer = false;  // true = app turned buzzer ON, suppresses auto logic
bool manualLight  = false;  // true = app turned LED ON

// ─── Config ───────────────────────────────────────────────────────────────────
#define MAX_CM              250
#define SENSOR_SPACING_CM   8.0f   // physical gap between sensors (cm)
#define WS_INTERVAL_MS      80     // push interval — ~12 Hz

WebServer        httpServer(80);
WebSocketsServer wsServer(81);

// ─── Ultrasonic read ──────────────────────────────────────────────────────────
float readHCSR04(int trig, int echo) {
  digitalWrite(trig, LOW);  delayMicroseconds(2);
  digitalWrite(trig, HIGH); delayMicroseconds(10);
  digitalWrite(trig, LOW);
  long t = pulseIn(echo, HIGH, 30000);  // 30 ms timeout
  if (t <= 0) return -1.0f;
  return t * 0.0343f / 2.0f;
}

// ─── Fuse L + R readings → distance + angle ───────────────────────────────────
void fuseSensors(float dL, float dR,
                 float &dist, float &angle, bool &valid) {
  bool okL = (dL >= 2.0f && dL <= MAX_CM);
  bool okR = (dR >= 2.0f && dR <= MAX_CM);

  if (!okL && !okR) { dist = -1; angle = 0;     valid = false; return; }
  if (!okL)         { dist = dR; angle =  25.0f; valid = true;  return; }
  if (!okR)         { dist = dL; angle = -25.0f; valid = true;  return; }

  dist  = (dL + dR) / 2.0f;
  angle = ((dL - dR) / SENSOR_SPACING_CM) * 15.0f;
  angle = constrain(angle, -45.0f, 45.0f);
  valid = true;
}

// ─── WebSocket events ─────────────────────────────────────────────────────────
void onWsEvent(uint8_t num, WStype_t type, uint8_t *payload, size_t len) {
  if (type == WStype_CONNECTED)
    Serial.printf("[WS] Client #%u connected\n", num);
  else if (type == WStype_DISCONNECTED)
    Serial.printf("[WS] Client #%u disconnected\n", num);
}

// ─── Non-blocking buzzer/LED state ────────────────────────────────────────────
// Declared here so `broadcastSensors()` can reference them.
static unsigned long lastBeepMs  = 0;
static unsigned long beepUntilMs = 0;

// ─── Broadcast sensor JSON ────────────────────────────────────────────────────
void broadcastSensors() {
  float dL = readHCSR04(SENSOR_L_TRIG, SENSOR_L_ECHO);
  delay(10);  // brief gap to prevent echo cross-talk between sensors
  float dR = readHCSR04(SENSOR_R_TRIG, SENSOR_R_ECHO);

  float dist, angle;
  bool  valid;
  fuseSensors(dL, dR, dist, angle, valid);

  // ── Unsafe alerts: non-blocking buzzer beeps + LED flashes ───────────────
  // Beep schedule:
  // - Warning zone:  dist in (STOP_CM, WARN_CM]  => every 350ms, 1200Hz for 80ms
  // - Stop zone:     dist in [0, STOP_CM]        => every 180ms, 2000Hz for 120ms
  //
  // Implementation uses `tone()` to drive the passive buzzer without blocking the main loop.
  unsigned long now = millis();

  // End current beep pulse if its duration has elapsed.
  if (beepUntilMs && now >= beepUntilMs) {
    noTone(BUZZER_PIN);
    digitalWrite(LED_PIN, LOW);
    beepUntilMs = 0;
  }

  // If not unsafe, ensure outputs are off (so beeps stop immediately once safe).
  bool unsafe = valid && (dist > 0) && (dist <= WARN_CM);
  if (!manualBuzzer) {  // only auto-beep if app hasn't taken manual control
    if (!unsafe) {
      if (beepUntilMs) {
        noTone(BUZZER_PIN);
        beepUntilMs = 0;
      }
    } else {
    // Select pattern based on zone.
    unsigned long periodMs;
    unsigned long durationMs;
    int toneHz;

    if (dist <= STOP_CM) {
      periodMs   = 180;
      durationMs = 120;
      toneHz     = 2000;
    } else {
      periodMs   = 350;
      durationMs = 80;
      toneHz     = 1200;
    }

    // Start a new beep only when idle (not in the middle of a pulse).
      if (beepUntilMs == 0 && (now - lastBeepMs) >= periodMs) {
        lastBeepMs = now;
        tone(BUZZER_PIN, toneHz);
        if (!manualLight) digitalWrite(LED_PIN, HIGH);
        beepUntilMs = now + durationMs;
      }
    }
  } // end !manualBuzzer

  StaticJsonDocument<128> doc;
  doc["dL"]    = (dL < 2 || dL > MAX_CM) ? 0.0f : dL;
  doc["dR"]    = (dR < 2 || dR > MAX_CM) ? 0.0f : dR;
  doc["dist"]  = dist < 0 ? 0.0f : dist;
  doc["angle"] = angle;
  doc["valid"] = valid;

  String json;
  serializeJson(doc, json);
  wsServer.broadcastTXT(json);

  if (valid)
    Serial.printf("L:%.1f  R:%.1f  fused:%.1f cm  angle:%.1f°\n",
                  dL, dR, dist, angle);
}

// ─── Setup ────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\n=== ParkAssist Ultrasonic Sensor ESP32 ===");

  pinMode(SENSOR_L_TRIG, OUTPUT); pinMode(SENSOR_L_ECHO, INPUT);
  pinMode(SENSOR_R_TRIG, OUTPUT); pinMode(SENSOR_R_ECHO, INPUT);

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  pinMode(BUZZER_PIN, OUTPUT);
  noTone(BUZZER_PIN);

  // Create WiFi AP — always 192.168.4.1
  WiFi.mode(WIFI_AP);
  WiFi.softAP(AP_SSID, AP_PASS);
  Serial.printf("AP → SSID: %s  |  IP: %s\n",
                AP_SSID, WiFi.softAPIP().toString().c_str());

  // HTTP — serve dashboard + assets
  httpServer.on("/", HTTP_GET, []() {
    httpServer.send_P(200, "text/html", index_html);
  });
  httpServer.on("/styles.css", HTTP_GET, []() {
    httpServer.send_P(200, "text/css", styles_css);
  });
  httpServer.on("/script.js", HTTP_GET, []() {
    httpServer.send_P(200, "application/javascript", script_js);
  });
  httpServer.begin();

  // ─── App control endpoints (called from AgriSense React app) ───────────────
  // Buzzer: GET /buzzer?state=on|off
  httpServer.on("/buzzer", HTTP_GET, []() {
    httpServer.sendHeader("Access-Control-Allow-Origin", "*");
    String s = httpServer.arg("state");
    if (s == "on") {
      manualBuzzer = true;
      tone(BUZZER_PIN, 1000);          // 1kHz alarm tone
    } else {
      manualBuzzer = false;
      noTone(BUZZER_PIN);
    }
    httpServer.send(200, "text/plain", "OK");
  });

  // Light / LED: GET /light?state=on|off
  httpServer.on("/light", HTTP_GET, []() {
    httpServer.sendHeader("Access-Control-Allow-Origin", "*");
    String s = httpServer.arg("state");
    manualLight = (s == "on");
    digitalWrite(LED_PIN, manualLight ? HIGH : LOW);
    httpServer.send(200, "text/plain", "OK");
  });

  // Status: GET /status  — for app health check
  httpServer.on("/status", HTTP_GET, []() {
    httpServer.sendHeader("Access-Control-Allow-Origin", "*");
    String json = "{\"node\":\"sensor\",\"ip\":\"192.168.4.1\",\"buzzer\":" +
                  String(manualBuzzer ? "true" : "false") + ",\"light\":" +
                  String(manualLight  ? "true" : "false") + "}";
    httpServer.send(200, "application/json", json);
  });

  // WebSocket — stream sensor data
  wsServer.begin();
  wsServer.onEvent(onWsEvent);
  Serial.println("Ready  —  http://192.168.4.1");
}

// ─── Loop ─────────────────────────────────────────────────────────────────────
static unsigned long lastBroadcast = 0;

void loop() {
  httpServer.handleClient();
  wsServer.loop();

  if (millis() - lastBroadcast >= WS_INTERVAL_MS) {
    lastBroadcast = millis();
    broadcastSensors();
  }
}
