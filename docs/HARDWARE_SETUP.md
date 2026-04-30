# Hardware Setup

This document covers the physical setup and wiring for the AgriSense ESP32 nodes.

## 1. SoilNode (Telemetry)
Responsible for fetching real-time environmental data.
- **Microcontroller**: ESP32
- **DTH11/22**: Pin 4 (Temperature & Humidity)
- **Soil Moisture Sensor**: Pin 34 (Analog In)
- **NPK Sensor (RS485 to TTL)**: RX=16, TX=17

## 2. RelayNode (Actuation)
Responsible for automated irrigation and logic control.
- **Relay Module (Pump)**: Pin 12
- **Relay Module (Solar Switch)**: Pin 13

## 3. CameraNode (Security & Vision)
Responsible for capturing live feeds for animal detection.
- **Microcontroller**: ESP32-CAM
- **Flash/Light Control**: Pin 4
- **Power**: Requires minimum 5V 2A stable supply to prevent brownouts during WiFi transmission.

## 4. StorageNode (Warehouse)
Monitors grain/crop storage conditions.
- **Microcontroller**: NodeMCU or ESP32
- **Gas Sensor (MQ-135)**: Pin 35 (Analog)
- **Temperature Probe (DS18B20)**: Pin 5
