# Bharat Advisor Pro — Technical Architecture
## v17.1.0 Industrial Specification

This repository follows a **Domain-Driven Design (DDD)** architecture optimized for ESP32-linked Android field deployment. It is designed for high-integrity agronomic decision-making and real-time environmental monitoring.

### 🏗️ Project Structure (GitHub Industrial Style)

- **`/src`**: Core application source.
  - **`/api`**: Communication layer (MQTT drivers, Device state services).
  - **`/engines`**: Telemetric processing and rule-based decision engines.
  - **`/state`**: Centralized application state and hardware registry.
  - **`/logic`**: Pure agronomic functions (Health scoring, Fertilizer deficit models).
  - **`/pages`**: Domain-grouped UI modules (Advisory, Monitoring, Control).
  - **`/ui`**: Reusable component library (Atomic Design).
  - **`/setup`**: Master configuration and hardware constants.
  - **`/data`**: Regional agricultural datasets (CSV) and static assets.
- **`/firmware`**: Production and testing C++ code for ESP32 nodes.
- **`/scripts`**: Python/Node.js utilities for dataset normalization and parsing.
- **`/docs`**: Technical manuals, API specifications, and field guides.

### 🛡️ Decision Engines

1.  **Strict Match Engine**: Validates environmental telemetry against crop biological truth-sets.
2.  **Precision Fertilizer Engine**: Calculates nutrient requirements with environmental heat/moisture bias.
3.  **Biological Compost Engine**: Dynamic tonnage scaling based on substrate composition.
4.  **Pest Sentinel**: Real-time risk detection based on thermal and hygrometric thresholds.

### 📡 Telemetry Bridge
The system utilizes a low-latency MQTT bridge (`api/mqttService`) to synchronize field sensor data with the React state engine. Missing hardware telemetry is explicitly flagged as `OFFLINE` to ensure data honesty in critical field operations.

---
© 2026 Bharat Advisor Pro | Industrial Agronomy Suite
