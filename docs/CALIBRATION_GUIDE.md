# Sensor Calibration Guide

This manual provides technical procedures for calibrating the AgriSense industrial sensor suite to ensure 100% diagnostic accuracy in the field.

## 🌱 Soil Sensors

### Capacitive Moisture (SoilNode)
- **Dry Point:** Note the raw analog value in open air (e.g., 3200).
- **Wet Point:** Note the raw analog value in a glass of water (e.g., 1200).
- **Mapping:** Use the `map()` function in the ESP32 firmware to normalize these values to 0-100%.

### pH Sensor (SoilNode)
- **Reference:** Use a pH 7.0 buffer solution.
- **Slope:** Use a pH 4.0 buffer solution to calculate the voltage-per-pH-unit slope.
- **Verification:** Ensure the dashboard gauge reflects the physical acidity within ±0.1 pH.

---

## 🌦️ Weather Sensors

### Rainfall Gauge (WeatherNode)
- **Bucket Calibration:** Measure the volume of water required to trigger a single "tip" event.
- **Conversion:** Map tip events to mm/hr based on the gauge's physical surface area.

---

## 📦 Storage Sensors

### MQ135 Gas Sensor (StorageNode)
- **Pre-Heat:** The sensor requires a 24-hour initial "burn-in" period.
- **Baseline:** Perform the R0 calibration in clean, outdoor air (approx 400ppm CO2).
- **Hardening:** Regularly reset the baseline to account for sensor drift over time.

---

## ⚡ Energy Sensors

### Solar Voltage (SolarNode)
- **Multimeter Check:** Compare the dashboard voltage with a physical multimeter reading at the panel terminals.
- **Divider Calibration:** Adjust the `VOLTAGE_DIVIDER_RATIO` in the firmware if a discrepancy >0.2V is detected.
