# AgriSense Pro — Complete System Documentation
> Version 17.1.0 · Built by Team Semicolon

---

## Table of Contents

1. [What is AgriSense?](#1-what-is-agrisense)
2. [System Architecture](#2-system-architecture)
3. [Hardware You Need](#3-hardware-you-need)
4. [Wi-Fi & Network Setup](#4-wi-fi--network-setup)
5. [Firmware Flashing Guide](#5-firmware-flashing-guide)
6. [Python Vision Backend](#6-python-vision-backend)
7. [App Setup & First Launch](#7-app-setup--first-launch)
8. [Creating Your First Field](#8-creating-your-first-field)
9. [Dashboard Overview](#9-dashboard-overview)
10. [Monitoring Tabs](#10-monitoring-tabs)
11. [AI Advisor — Talk Mode](#11-ai-advisor--talk-mode)
12. [AI Advisor — Advisor Mode](#12-ai-advisor--advisor-mode)
13. [Soil Forensics](#13-soil-forensics)
14. [Analytics Hub](#14-analytics-hub)
15. [Farm Reports](#15-farm-reports)
16. [Alerts & Notifications](#16-alerts--notifications)
17. [Device Manager](#17-device-manager)
18. [Settings](#18-settings)
19. [Profile & Language](#19-profile--language)
20. [Running the App](#20-running-the-app)
21. [Building the Android APK](#21-building-the-android-apk)
22. [API Keys & Environment](#22-api-keys--environment)
23. [Hardcoded IPs Reference](#23-hardcoded-ips-reference)
24. [Troubleshooting](#24-troubleshooting)

---

## 1. What is AgriSense?

AgriSense Pro is a full-stack, IoT-powered precision agriculture platform built for Indian farmers. It connects physical ESP32 sensors placed in the field to a mobile/web application that provides:

- **Real-time soil, weather, irrigation, and storage monitoring**
- **AI-powered agronomic advice** using Groq (Llama 3.3 70B)
- **Live camera feed** with YOLOv8 object detection
- **Regional weather forecasts** from Open-Meteo
- **Bengali & English language support**
- **PDF reports and trend analytics**
- **Multi-field management**

The app works as a **React + Capacitor** app — it runs in a browser during development and can be compiled into a native Android APK.

---

## 2. System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        YOUR HOME Wi-Fi                           │
│              (SSID: JioFiber-4gh / 192.168.29.x)                │
│                                                                  │
│  ┌─────────────────┐        ┌──────────────────────────────┐    │
│  │  Sensor ESP32   │        │      ESP32-CAM               │    │
│  │  IP: .29.200    │        │      IP: .29.201             │    │
│  │                 │        │                              │    │
│  │  • NPK Sensor   │        │  • MJPEG stream :81/stream   │    │
│  │  • pH Sensor    │        │  • Capture endpoint :81      │    │
│  │  • DHT22 Temp   │        └──────────────┬───────────────┘    │
│  │  • Soil Moisture│                       │                    │
│  │  • Water Level  │              ┌─────────▼──────────┐        │
│  │  • LED + Buzzer │              │  Python Backend     │        │
│  │  • Relay/Pump   │◄────MQTT────►│  (your PC)         │        │
│  └────────┬────────┘              │  YOLOv8 Detection  │        │
│           │  MQTT/HTTP            │  Flask + WebSocket  │        │
│           │                       └─────────┬──────────┘        │
│  ┌────────▼────────────────────────────────▼──────────────┐     │
│  │              AgriSense React App (Vite)                 │     │
│  │              Runs in browser or Android APK             │     │
│  │     Firebase · Open-Meteo · Groq AI API                 │     │
│  └─────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────┘
```

**Data flows:**

| Source | Protocol | Data |
|---|---|---|
| Sensor ESP32 → App | MQTT (via broker) | Soil NPK, pH, temp, humidity, water level, actuator state |
| ESP32-CAM → Python Backend | HTTP MJPEG pull | Raw video frames |
| Python Backend → App | WebSocket | Annotated stream + detection JSON |
| Open-Meteo → App | HTTP REST | Regional weather, 5-day forecast |
| Groq API → App | HTTP REST | AI agronomic advice |
| Firebase → App | Firestore SDK | User auth, field data, history |

---

## 3. Hardware You Need

| Component | Qty | Notes |
|---|---|---|
| ESP32 (38-pin WROOM) | 1 | The Sensor & Actuator Node |
| ESP32-CAM (AI-Thinker) | 1 | The Camera Node |
| NPK Sensor (RS485 soil) | 1 | Connected to ESP32 via RS485 module |
| pH Sensor | 1 | Analog input to ESP32 |
| DHT22 | 1 | Temperature & Humidity |
| Capacitive Soil Moisture Sensor | 1 | Analog input |
| HC-SR04 Ultrasonic | 2 | Water level in tank (Left + Right) |
| 5V Active Buzzer | 1 | GPIO 25 on Sensor ESP32 |
| LED | 1 | GPIO 5 on Sensor ESP32 |
| Relay Module (1-channel) | 1 | Controls irrigation pump |
| 5V/3.3V Power Supply | — | Stable power for all nodes |
| USB-to-TTL programmer | 1 | For flashing ESP32-CAM |
| Resistors (1kΩ, 2kΩ) | 2 each | Voltage dividers for HC-SR04 ECHO pins |

### Sensor ESP32 Wiring

```
HC-SR04 LEFT:   TRIG → GPIO 12  |  ECHO → GPIO 13 (via voltage divider)
HC-SR04 RIGHT:  TRIG → GPIO 14  |  ECHO → GPIO 15 (via voltage divider)
LED:            GPIO 5
Buzzer:         GPIO 25

Voltage divider for ECHO (5V → 3.3V):
  HC-SR04 ECHO ──[1kΩ]──┬── ESP32 GPIO
                         │
                       [2kΩ]
                         │
                        GND
```

---

## 4. Wi-Fi & Network Setup

Both the Sensor ESP32 and the ESP32-CAM connect to **your home Wi-Fi**. The app (running on your PC or phone) must also be on the **same Wi-Fi network**.

**Credentials hardcoded in both firmware files:**
```
SSID: JioFiber-4gh
Password: bharat@9051
```

> **To change Wi-Fi:** Edit `#define WIFI_SSID` and `#define WIFI_PASS` in:
> - `firmware/sensor_esp32/sensor_esp32.ino`
> - `firmware/02_CameraNode/CameraNode_ESP32CAM.ino`

**Static IPs — configured via JioFiber DHCP binding:**

| Device | Fixed IP |
|---|---|
| Sensor ESP32 | `192.168.29.200` |
| ESP32-CAM | `192.168.29.201` |

> To assign: JioFiber router admin panel → DHCP → bind each device's MAC address to its fixed IP.

---

## 5. Firmware Flashing Guide

### 5A. Sensor & Actuator Node (plain ESP32)

**File:** `firmware/sensor_esp32/sensor_esp32.ino`

**Arduino IDE settings:**
- Board: `ESP32 Dev Module`
- Upload Speed: `115200`

**Required Libraries (Arduino Library Manager):**
- `WebSockets` by Markus Sattler
- `ArduinoJson` by Benoit Blanchon

**Steps:**
1. Open `sensor_esp32.ino` in Arduino IDE
2. Confirm SSID/password are correct
3. Connect ESP32 via USB → Click **Upload**
4. Open Serial Monitor at **115200 baud**
5. You should see: `✓ Connected to JioFiber-4gh, IP: 192.168.29.200`

**After booting it:**
- Starts HTTP server on port 80 (control commands: buzzer, LED, pump)
- Starts WebSocket server on port 81 (live sensor data stream every 80ms)
- Reads HC-SR04 water level sensors
- Auto-triggers buzzer + LED when water level is critical

---

### 5B. Camera Node (ESP32-CAM)

**File:** `firmware/02_CameraNode/CameraNode_ESP32CAM.ino`

**Arduino IDE settings:**
- Board: `AI Thinker ESP32-CAM`
- Partition Scheme: `Huge APP (3MB No OTA/1MB SPIFFS)`

**Flashing steps (ESP32-CAM has no USB chip):**
1. Connect USB-to-TTL programmer:
   - TX → RX (GPIO 3), RX → TX (GPIO 1), GND → GND, 5V → 5V
   - **GPIO 0 → GND** (boot mode)
2. Click Upload in Arduino IDE
3. After upload: **disconnect GPIO 0 from GND** → press Reset

**Serial Monitor shows:**
```
Camera OK
Connected to JioFiber-4gh
Stream: http://192.168.29.201:81/stream
```

---

## 6. Python Vision Backend

**File:** `agrisense_vision_backend.py`

Runs on your **PC**. Bridges ESP32-CAM to the app with YOLOv8 AI detection.

### Setup (one-time)
```bash
pip install flask flask-sock ultralytics opencv-python requests
```

`yolov8n.pt` is already in the project root.

### Run
```bash
python agrisense_vision_backend.py
```

Leave running whenever you need the camera/detection features. Server runs on port 5000.

**Hardcoded config (already set correctly):**
```python
CAMERAS = { "cam1": "http://192.168.29.201:81/stream" }
SENSOR_ESP_IP = "http://192.168.29.200"
```

---

## 7. App Setup & First Launch

```bash
npm install        # First time only
npm run dev -- --host
```

Open the URL shown (e.g. `http://192.168.29.X:5173`) on any device on the same Wi-Fi.

### First Launch Steps:
1. **Login screen** — choose **English** or **বাংলা** using the language toggle at top
2. **Sign in with Google** OR create an account with email/password
3. You are taken to the **Field Setup Wizard** automatically if no fields exist

---

## 8. Creating Your First Field

Fill in the setup wizard:

| Field | Example |
|---|---|
| Field Name | "North Zone" |
| Location | GPS auto-detect or type manually |
| Crop | Select from 50+ Indian crops |
| Start Date | Planting date (used for crop age AI tracking) |
| Duration | Expected grow period |
| Server ID | `192.168.29.200` |
| Enable Features | Soil / Weather / Irrigation / Storage / Vision |

Tap **COMPLETE SETUP**. Add more fields anytime from the Dashboard dropdown.

---

## 9. Dashboard Overview

| Element | Description |
|---|---|
| Greeting | Your name + current time |
| Field selector | Dropdown to switch between fields |
| Location + weather | Live temp & condition beside GPS coords |
| Farm Health Score | Circular gauge 0–100% |
| Node status row | Live dots: Soil / Weather / Irrigation / Storage / Vision |
| Health cards | One card per enabled feature |
| Field Vision card | Camera preview (if Vision enabled) |
| Daily Archives banner | Link to AI reports |
| Active Controls | Toggle Pump, Buzzer, LED directly |
| Sync button | Refresh all data |

---

## 10. Monitoring Tabs

### 10A. Soil Monitor
Live: N / P / K (kg/ha), pH, Moisture %, Soil Temp. Health score vs. crop optimal range. Trend charts.

### 10B. Irrigation
Live: Water Level %, Pump ON/OFF. Direct pump toggle. Water level history.

### 10C. Weather Station
**Local sensor:** Temp, Humidity, Light, Rain level
**Regional API (Open-Meteo):** Current conditions, Feels Like, Wind, Pressure, Humidity, Sunrise/Sunset
**5-Day Forecast** with rain chance and temperature range
**Severe Weather Warning banner** for storm/flood alerts

### 10D. Storage Hub
Storage Temp, Humidity, Gas level. Alerts when thresholds exceeded.

### 10E. Field Vision (Camera)
Live MJPEG stream from ESP32-CAM with YOLOv8 bounding boxes. Capture snapshots. Remote buzzer/LED trigger.
> **Requires:** Python backend running on PC.

---

## 11. AI Advisor — Talk Mode

**Sidebar → AI Advisor → Talk toggle**

### Step-by-step:
1. Tap **AI Advisor** in sidebar
2. Tap your **field card** in the chat
3. Wait ~2.5 seconds — app collects live sensor data + regional weather
4. An **Advisor Report** appears:
   - Crop match score, suitability %, confidence %
   - Sensor vs. optimal range comparison table
   - AI advice: fertilizers, irrigation, storage, harvest readiness, emergency alerts

5. **Ask follow-up questions** in the input bar — the AI has your live sensor data

### Example questions:
- *"Should I water today? For how long?"*
- *"What fertilizer do I need this week?"*
- *"When is it time to harvest?"*
- *"Storage is getting hot, what should I do?"*
- *"Is there a flood risk? What should I do?"*
- *"My soil pH is low, what should I add?"*

> The AI responds with **your actual sensor numbers** (e.g., "your moisture is at 18%, keep pump on for 2 hours"). It does NOT make up values.

### Bengali language:
Set language to Bengali in Profile → AI responses will be in natural Bengali automatically.

---

## 12. AI Advisor — Advisor Mode

**Sidebar → AI Advisor → Advisor toggle**

Structured report mode:
- Full crop suitability analysis across all parameters
- Detailed sensor vs. optimal range table
- Exportable recommendation blocks

---

## 13. Soil Forensics

**Sidebar → Soil Forensics**

Deep soil analysis tool:
- Compares your soil to optimal profiles for 50+ crops
- Shows which crops your field is best suited for right now
- Prioritized amendment recommendations
- Historical forensic tracking

---

## 14. Analytics Hub

**Sidebar → Analytics**

- Trend charts for all sensor parameters (day / week / month)
- Per-field data view
- **AI-generated daily summary report** using Groq
- CSV data download

---

## 15. Farm Reports

**Sidebar → Farm Reports**

- Past AI audit logs stored per field
- Filter by date range
- PDF export
- Sensor reading snapshots

---

## 16. Alerts & Notifications

**Sidebar → Alert Center**

Auto-generated alerts for:
- Flood / storm warning (regional API)
- Critical soil readings (NPK too low, pH out of range)
- Water level critical (< 20%)
- Storage temperature high (> 35°C)
- Gas leak in storage
- Device offline

Weather alerts also show as banners on the Dashboard beside the GPS coordinates.

---

## 17. Device Manager

**Sidebar → Device Manager**

| Node | Possible Status |
|---|---|
| Soil Node | ACTIVE / OFFLINE |
| Weather Node | ACTIVE / OFFLINE |
| Water Node | ACTIVE / OFFLINE |
| Storage Node | ACTIVE / OFFLINE |
| Vision Node | ACTIVE / PARTIAL / OFFLINE |

Direct control commands (buzzer, LED, pump) available here.

---

## 18. Settings

**Sidebar → Settings**

- MQTT broker configuration
- Theme (Light / Dark)
- Notification preferences
- Data sync interval

---

## 19. Profile & Language

**Tap avatar in Sidebar → Profile**

Editable fields:
- Full Name, Farm/Project Name, Location (GPS), **App Language**

### Language options:
| Value | Effect |
|---|---|
| English (default) | All UI and AI in English |
| বাংলা (Bengali) | All sidebar, dashboard, weather labels + AI responses in contextual Bengali |

Language is saved in `localStorage` and persists across sessions.

**Logout:** Bottom of Sidebar or Profile page.

---

## 20. Running the App

```bash
# Development (with hot reload and network access)
npm run dev -- --host

# Production build
npm run build
```

---

## 21. Building the Android APK

Requires: Android Studio, JDK 21 (bundled as `jdk21.zip`), Android SDK.

```bash
npm run build
npx cap sync android
npx cap open android
# In Android Studio: Build → Generate Signed APK
```

Pre-built APK available at: `AgriSense-Pro.apk` in project root.

---

## 22. API Keys & Environment

**File:** `.env` (project root)

```env
VITE_GROQ_API_KEY=your_key_here
```

- **Groq API:** Free at [console.groq.com](https://console.groq.com) — powers all AI features
- **Open-Meteo:** Free, no key needed
- **Firebase:** Config in `src/firebase.js`

> ⚠️ Never commit `.env` to a public repository.

---

## 23. Hardcoded IPs Reference

| What | File | Value |
|---|---|---|
| Sensor ESP32 IP | `sensor_esp32.ino` | `192.168.29.200` (static via DHCP binding) |
| Camera ESP32 IP | `CameraNode_ESP32CAM.ino` | `192.168.29.201` (static via DHCP binding) |
| Camera stream (backend) | `agrisense_vision_backend.py` | `http://192.168.29.201:81/stream` |
| Sensor ESP (backend) | `agrisense_vision_backend.py` | `http://192.168.29.200` |
| Camera stream (frontend) | `VisualMonitor.jsx` | `192.168.29.201` |

All IPs are fixed via JioFiber DHCP binding — no editing needed after initial setup.

---

## 24. Troubleshooting

| Problem | Solution |
|---|---|
| All sensors OFFLINE | Sensor ESP32 must be on `JioFiber-4gh`. Check Serial Monitor for IP. Ensure phone is on same network. |
| Camera feed not showing | Python backend must be running. ESP32-CAM must be powered. Check its Serial Monitor IP. |
| AI shows error / "Groq error 400" | Check `.env` for valid Groq API key. Check console for specific error. |
| AI still in English after setting Bengali | Go Profile → App Language → বাংলা → Save. Clear localStorage if needed. |
| Talk Mode errors after field select | Reload the page to reset chat state. |
| Pump / Buzzer not responding | Confirm `192.168.29.200` reachable. Test in browser: `http://192.168.29.200/`. |
| Firebase auth errors | Check internet. For APK Google Sign-In: register SHA-1 in Firebase console. |
| App can't reach sensors on phone | Phone must be on same Wi-Fi as ESP32s. Mobile data must be OFF. |

---

*AgriSense Pro — Precision Agriculture for India*
*Built by Team Semicolon · v17.1.0*
