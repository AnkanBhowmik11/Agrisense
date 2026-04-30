# API Reference & MQTT Topics

The application communicates exclusively via **MQTT** using **WebSockets (WSS)** for real-time bidirectional telemetry.

### Connection Parameters
- **Protocol**: `wss`
- **Port**: `8084` (Default WSS port, varies by config)
- **Path**: `/mqtt`
- **Reconnection strategy**: Every 5 seconds

---

## 📡 Subscribe Topics (Hardware → App)

All nodes must publish to their specific topic structure: `agrisense/v1/node/[type]/telemetry`

### 🏗️ Topic Matrix:
- **Soil**: `agrisense/v1/node/soil/telemetry`
- **Weather**: `agrisense/v1/node/weather/telemetry`
- **Storage**: `agrisense/v1/node/storage/telemetry`
- **Water**: `agrisense/v1/node/water/telemetry`
- **Solar**: `agrisense/v1/node/solar/telemetry`

### 📦 Clinical Payload Schema (JSON):
Every telemetry packet must include the following forensic header:
```json
{
  "device_id": "string (unique)",
  "timestamp": "number (epoch ms)",
  "rssi": "number (dBm)",
  "latency": "number (ms)",
  "packet_loss": "number (%)"
}
```

**Node-Specific Metrics:**
- **Soil**: `moisture`, `ph`, `npk: { n, p, k }`, `temperature`
- **Weather**: `temperature`, `humidity`, `ldr`, `rain`
- **Storage**: `temperature`, `humidity`, `mq135`
- **Water**: `flow`, `level`, `pressure`
- **Solar**: `voltage`, `battery`, `current`, `load`

---

## 🛰️ Publish Topics (App → Hardware)

### `agrisense/v1/commands`
Used by the frontend to trigger physical actuators (Pumps, Valves, Sprayers).
**Payload Example:**
```json
{
  "device_id": "target_node_id",
  "action": "PUMP_ON | PUMP_OFF | VALVE_OPEN | VALVE_CLOSE",
  "timestamp": 1718224523
}
```

