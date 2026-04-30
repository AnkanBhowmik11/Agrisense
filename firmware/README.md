# AgriSense Pro — Hardware Firmware Directory

> **Pairing IDs:** `primary_id = "innovatex"` · `secondary_id = "semicolon"`
> Both must match the **Project Codename** and **Client Identifier** in the app's System Settings screen.

---

## Folder Structure

| Folder | Board | Purpose |
|--------|-------|---------|
| `Production/` | ESP32 DevKit v1 | **MASTER NODE (v21):** Reads pH, Moisture, Air T/H, LDR, Rain. Unified real-time telemetry. |
| `01_SoilWeatherNode/` | ESP32 DevKit v1 | Reads Moisture, DHT22, LDR, Rain — publishes unified sensor payload |
| `02_CameraNode/` | ESP32-CAM (AI-Thinker) | Serves MJPEG stream, handles light & buzzer via HTTP |
| `03_RelayControlNode/` | ESP32 DevKit v1 | Receives MQTT commands → triggers Pump, Valve, Buzzer, Light, Sprayer relays |
| `04_StorageNode/` | ESP32 DevKit v1 | Reads DHT22 + MQ135 for vault temperature, humidity, and gas levels |
| `05_Simulator/` | Any ESP32 | Simulates all sensor data — use for testing without physical hardware |

---

## MQTT Topic Format

All firmware uses this **2-factor authentication topic structure**:

```
agrisense/{primary_id}/{secondary_id}/sensors    ← sensor data published here
agrisense/{primary_id}/{secondary_id}/commands   ← app commands received here
```

**Example with default IDs:**
```
agrisense/innovatex/semicolon/sensors
agrisense/innovatex/semicolon/commands
```

---

## Flashing Instructions

1. Install [Arduino IDE 2.x](https://www.arduino.cc/en/software)
2. Add ESP32 board package: `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
3. Install libraries via Library Manager:
   - `PubSubClient` by Nick O'Leary
   - `ArduinoJson` by Benoit Blanchon
   - `DHT sensor library` by Adafruit
4. Open the `.ino` file for the board you want to flash
5. Edit `WIFI_SSID` and `WIFI_PASS` at the top
6. Select the correct board and COM port → Upload

---

## Sensor Payload Schema

```json
{
  "soil": {
    "moisture": 52.4,
    "temp": 26.1,
    "ph": 6.8,
    "npk": { "n": 82, "p": 44, "k": 195 }
  },
  "weather": {
    "temp": 29.3,
    "humidity": 64.0,
    "lightIntensity": 820,
    "rainLevel": 2.1
  },
  "water": {
    "level": 85,
    "pumpActive": false
  },
  "storage": {
    "temp": 18.5,
    "humidity": 58.0,
    "mq135": 142
  }
}
```

---

*AgriSense Pro v17.1.0 · by Prolayjit Biswas*
