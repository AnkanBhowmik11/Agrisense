# Troubleshooting Guide

This guide provides forensic procedures for resolving common connectivity and diagnostic issues within the AgriSense ecosystem.

## 📡 Connectivity Issues

### Node showing OFFLINE (Red)
**Symptom:** The node card in the Device Management dashboard is red and shows "OFFLINE".
- **Check WiFi:** Ensure the ESP32 node is within range of the farm router.
- **Check MQTT Broker:** Verify that the broker (WSS Port 8084) is reachable from the node.
- **Power Cycle:** Use the "Restart" command from the dashboard (if partially active) or manually reset the hardware.
- **Heartbeat Timeout:** The app marks a node offline if no packet is received for >60 seconds.

### Node showing PARTIAL (Yellow)
**Symptom:** The node is sending some data, but not all sensors are active.
- **Sensor Wiring:** Check the physical I2C/Analog connections for the inactive sensors (e.g., pH or NPK).
- **Packet Logic:** Verify that the ESP32 is including all sensor keys in its JSON payload.
- **Stale Data:** If a sensor hasn't updated for >30s, its status dot will turn yellow.

---

## 📊 Analytics & Data Issues

### "Zero Value" or "---" on Charts
- **Sensor Calibration:** If the sensor is connected but reading 0, it may require calibration (see `CALIBRATION_GUIDE.md`).
- **Data Initialization:** The charts are strictly event-driven. They will remain empty until the first valid hardware packet is received.
- **MQTT Handshake:** Ensure the topic structure matches `agrisense/v1/node/[type]/telemetry`.

---

## 🔐 Authentication Issues

### Stuck on Splash Screen
- **Auth Persistence:** Clear the app cache or `localStorage` to reset the session.
- **Network Required:** The initial login sequence requires a connection to the configuration server.

### Bypassing Login Screen
- **Guest Mode:** If a guest session was previously active, the app will auto-restore it. Use "Logout" in the Profile tab to return to the Login screen.
