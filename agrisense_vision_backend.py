"""
AgriSense Vision Backend  (Project-integrated version)
=======================================================
Place this file in:  Agri-Sense-main/agrisense_vision_backend.py

What it does
------------
- Pulls MJPEG frames from one or more ESP32-CAMs
- Runs YOLOv8n inference on every frame
- Serves annotated MJPEG at   GET  /stream/<cam_id>
  (shortcut: /stream  →  cam1)
- Broadcasts detection JSON   WS   /ws
  payload: { cam_id, detections:[{label,confidence,x,y,width,height}], timestamp }
- Auto-triggers buzzer + LED  POST /trigger
  (also fires automatically on every animal detection for AUTO_TRIGGER_SECONDS)
- Snapshot of latest results  GET  /detections
- Health-check                GET  /health

How to run on your PC
---------------------
1.  Connect PC to the "AgriSense_IoT" Wi-Fi AP (192.168.4.x subnet).
2.  Install deps once:
        pip install flask flask-sock ultralytics opencv-python requests
3.  Copy yolov8n.pt into this same folder (or set YOLO_MODEL to the full path).
4.  Run:
        python agrisense_vision_backend.py
5.  Note the PC's IP on the AP (run `ipconfig`, look for 192.168.4.x).
6.  In VisualMonitor.jsx line 14, set:
        const BACKEND_IP = '192.168.4.xxx';   // your PC's IP
7.  Rebuild APK  OR  for browser testing run:
        npm run dev -- --host
    Open the URL shown (e.g. http://192.168.4.100:5173) on any device on the AP.

CORS is fully open so Vite dev-server and the Android WebView both work.
"""

import cv2
import json
import numpy as np
import os
import requests
import threading
import time

from flask import Flask, Response, jsonify, request
from flask_sock import Sock
from ultralytics import YOLO

# ═══════════════════════════════════════════════════════════════════════════════
#  CONFIG  — edit these as needed
# ═══════════════════════════════════════════════════════════════════════════════

# Cameras: { "cam_id": "stream_url" }
# Add more ESP-CAMs here (e.g. cam2 at 192.168.4.3:81/stream)
CAMERAS = {
    "cam1": "http://192.168.29.201:81/stream",
    # "cam2": "http://192.168.4.3:81/stream",
}

SENSOR_ESP_IP       = "http://192.168.29.200"   # Sensor ESP32 — controls buzzer & LED
YOLO_MODEL          = "yolov8n.pt"            # path to model weights
CONF_THRESHOLD      = 0.30                    # detection confidence cutoff
AUTO_TRIGGER_SEC    = 5                       # seconds buzzer+LED stay on after detection
BACKEND_PORT        = int(os.environ.get("PORT", 5050))

# COCO classes for agriculture: person, bird, cat, dog, horse, sheep, cow, elephant, bear, zebra, giraffe
TARGET_CLASSES = [0, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]

# ═══════════════════════════════════════════════════════════════════════════════

app  = Flask(__name__)
sock = Sock(app)


# ── CORS (allow Vite dev server + Android WebView) ───────────────────────────
@app.after_request
def _cors(resp):
    resp.headers["Access-Control-Allow-Origin"]  = "*"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
    resp.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    return resp


# ── Shared state ──────────────────────────────────────────────────────────────
_latest_frames     = {k: None for k in CAMERAS}
_latest_detections = {k: []   for k in CAMERAS}
_frame_locks       = {k: threading.Lock() for k in CAMERAS}
_ws_clients        = set()
_ws_lock           = threading.Lock()

_trigger_active    = False
_trigger_lock      = threading.Lock()
_trigger_timer_ref = [None]   # list so inner func can mutate


# ── Auto-trigger: buzzer + LED ────────────────────────────────────────────────
def _fire_trigger():
    """Non-blocking: fire buzzer+LED, auto-off after AUTO_TRIGGER_SEC."""
    with _trigger_lock:
        if _trigger_active:
            # Already on — just reset the timer
            if _trigger_timer_ref[0]:
                _trigger_timer_ref[0].cancel()
        else:
            # Turn on
            _trigger_active_setter(True)
            try:
                requests.get(f"{SENSOR_ESP_IP}/buzzer?state=on", timeout=2)
                requests.get(f"{SENSOR_ESP_IP}/light?state=on",  timeout=2)
                print("[trigger] 🔔 Buzzer + LED ON")
            except Exception as e:
                print(f"[trigger] Sensor ESP unreachable: {e}")

        def _auto_off():
            _trigger_active_setter(False)
            try:
                requests.get(f"{SENSOR_ESP_IP}/buzzer?state=off", timeout=2)
                requests.get(f"{SENSOR_ESP_IP}/light?state=off",  timeout=2)
                print("[trigger] 🔕 Buzzer + LED OFF")
            except Exception:
                pass

        t = threading.Timer(AUTO_TRIGGER_SEC, _auto_off)
        t.daemon = True
        t.start()
        _trigger_timer_ref[0] = t


def _trigger_active_setter(val):
    global _trigger_active
    _trigger_active = val


# ── Per-camera background reader thread ───────────────────────────────────────
def _cam_reader(cam_id, stream_url, model):
    if ":81/stream" in stream_url:
        capture_url = stream_url.replace(":81/stream", "/capture")
    else:
        capture_url = stream_url

    print(f"[{cam_id}] Snapshot Mode: polling {capture_url} every 3 seconds …")
    while True:
        try:
            resp = requests.get(capture_url, timeout=5)
            if resp.status_code == 200:
                img_bytes = resp.content
                frame = cv2.imdecode(np.frombuffer(img_bytes, np.uint8), cv2.IMREAD_COLOR)
                if frame is not None:
                    # YOLOv8 inference
                    res = model.predict(frame, classes=TARGET_CLASSES, conf=CONF_THRESHOLD, verbose=False)
                    annotated = res[0].plot()

                    detections = []
                    for box in res[0].boxes:
                        x1, y1, x2, y2 = box.xyxy[0].tolist()
                        detections.append({
                            "label":      model.names[int(box.cls)],
                            "confidence": round(float(box.conf) * 100, 1),
                            "x": int(x1), "y": int(y1),
                            "width": int(x2 - x1), "height": int(y2 - y1),
                        })

                    _, jpeg = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 75])

                    with _frame_locks[cam_id]:
                        _latest_frames[cam_id]     = jpeg.tobytes()
                        _latest_detections[cam_id] = detections

                    # Auto-trigger hardware on any detection
                    if detections:
                        threading.Thread(target=_fire_trigger, daemon=True).start()

                    # Push to WebSocket clients
                    msg = json.dumps({
                        "cam_id":     cam_id,
                        "detections": detections,
                        "timestamp":  int(time.time() * 1000),
                    })
                    with _ws_lock:
                        dead = set()
                        for ws in _ws_clients:
                            try:    ws.send(msg)
                            except: dead.add(ws)
                        _ws_clients.difference_update(dead)

            time.sleep(3)
        except Exception as exc:
            print(f"[{cam_id}] Error: {exc} — retry in 3 s")
            time.sleep(3)


# ── MJPEG generator ───────────────────────────────────────────────────────────
def _mjpeg_gen(cam_id):
    lock = _frame_locks.get(cam_id, threading.Lock())
    while True:
        with lock:
            frame = _latest_frames.get(cam_id)
        if frame:
            yield b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + frame + b"\r\n"
        time.sleep(0.033)


# ── Routes ────────────────────────────────────────────────────────────────────
@app.route("/stream/<cam_id>")
def stream(cam_id):
    if cam_id not in CAMERAS:
        return jsonify(error="unknown camera"), 404
    r = Response(_mjpeg_gen(cam_id), mimetype="multipart/x-mixed-replace; boundary=frame")
    r.headers["Cache-Control"] = "no-cache"
    return r

@app.route("/stream")
def stream_default():
    return stream("cam1")

@app.route("/detections")
def detections():
    return jsonify({k: _latest_detections.get(k, []) for k in CAMERAS})

@app.route("/health")
def health():
    return jsonify(status="ok", cameras=list(CAMERAS.keys()), trigger_active=_trigger_active)

@app.route("/trigger", methods=["POST", "OPTIONS"])
def trigger():
    if request.method == "OPTIONS":
        return "", 204
    threading.Thread(target=_fire_trigger, daemon=True).start()
    return jsonify(status="triggered")

@sock.route("/ws")
def websocket(ws):
    with _ws_lock:
        _ws_clients.add(ws)
    try:
        while True:
            ws.receive(timeout=60)
    except Exception:
        pass
    finally:
        with _ws_lock:
            _ws_clients.discard(ws)


# ── Startup ───────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("\n[backend] Loading YOLO model …")
    model = YOLO(YOLO_MODEL)
    print("[backend] Model ready.\n")

    for cam_id, url in CAMERAS.items():
        t = threading.Thread(target=_cam_reader, args=(cam_id, url, model), daemon=True)
        t.start()

    w = 60
    print("=" * w)
    print("  AgriSense Vision Backend  (project-integrated)")
    print("=" * w)
    print(f"  Port          :  {BACKEND_PORT}")
    for cam_id in CAMERAS:
        print(f"  Stream [{cam_id}]  :  http://<PC-IP>:{BACKEND_PORT}/stream/{cam_id}")
    print(f"  WebSocket     :  ws://<PC-IP>:{BACKEND_PORT}/ws")
    print(f"  Detections    :  http://<PC-IP>:{BACKEND_PORT}/detections")
    print(f"  Health-check  :  http://<PC-IP>:{BACKEND_PORT}/health")
    print(f"  Manual trigger:  POST http://<PC-IP>:{BACKEND_PORT}/trigger")
    print(f"  Sensor ESP    :  {SENSOR_ESP_IP}  (buzzer + LED)")
    print("=" * w)
    print(f"\n  ⚡ Auto-trigger fires for {AUTO_TRIGGER_SEC}s on every detection")
    print(f"  📡 Connect PC to AgriSense_IoT AP, note your 192.168.4.x IP")
    print(f"  🖥️  Set BACKEND_IP in VisualMonitor.jsx to that IP")
    print(f"  🌐  For browser test: npm run dev -- --host  (in project root)\n")

    app.run(host="0.0.0.0", port=BACKEND_PORT, threaded=True)
