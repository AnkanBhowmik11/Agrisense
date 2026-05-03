/**
 * AgriSense Vision Node v2.0
 * - Streams from YOLO Python backend (not direct ESP-CAM)
 * - WebSocket receives per-frame detections with animal name + cam ID
 * - Alert tab logs "Animal detected on Camera X"
 * - Auto-fires buzzer + LED via backend on detection
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EyeOff, Bell, Lightbulb, Camera as CaptureIcon, Wifi, WifiOff, AlertTriangle, ShieldAlert, CheckCircle, List, Video, Settings } from 'lucide-react';
import { useApp } from '../../state/AppContext';

const BACKEND_PORT = '5050';   // agrisense_vision_backend.py runs on 5050
const CAM_IDS = ['cam1'];          // add 'cam2' etc for more cameras

const C = {
  primary: '#10B981', danger: '#EF4444', warning: '#F59E0B',
  secondary: '#3B82F6', text: '#0F172A', muted: '#64748B',
  border: 'rgba(0,0,0,0.05)', bg: '#F8FAFC', card: '#FFFFFF',
};

// ── Dot badge ───────────────────────────────────────────────────────────────
const Dot = ({ color, pulse }) => (
  <motion.div
    animate={pulse ? { opacity: [1, 0.3, 1] } : {}}
    transition={{ duration: 1.5, repeat: Infinity }}
    style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }}
  />
);

// ── Tab button ───────────────────────────────────────────────────────────────
const Tab = ({ label, icon: Icon, active, badge, onClick }) => (
  <motion.button
    whileTap={{ scale: 0.95 }} onClick={onClick}
    style={{
      flex: 1, padding: '10px 4px', border: 'none', cursor: 'pointer',
      background: active ? C.card : 'transparent',
      borderRadius: 14, display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: 4,
      boxShadow: active ? '0 2px 10px rgba(0,0,0,0.06)' : 'none',
      position: 'relative',
    }}
  >
    <Icon size={16} color={active ? C.secondary : C.muted} strokeWidth={2.5} />
    <span style={{ fontSize: '0.55rem', fontWeight: 900, color: active ? C.secondary : C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
    {badge > 0 && (
      <div style={{ position: 'absolute', top: 6, right: 10, background: C.danger, color: 'white', fontSize: '0.5rem', fontWeight: 900, padding: '1px 5px', borderRadius: 8 }}>
        {badge > 9 ? '9+' : badge}
      </div>
    )}
  </motion.button>
);

// ── Main component ───────────────────────────────────────────────────────────
const VisualMonitor = () => {
  const { toggleActuator, ACTUATORS } = useApp();

  const defaultIP = '192.168.29.35';
  const [backendIp, setBackendIp] = useState(defaultIP);
  const backendBase = `http://${backendIp}:${BACKEND_PORT}`;
  const backendWs = `ws://${backendIp}:${BACKEND_PORT}/ws`;

  const [activeCam, setActiveCam] = useState(CAM_IDS[0]);
  const [streamOnline, setStreamOnline] = useState(true);
  const [streamKey, setStreamKey] = useState(Date.now());
  const [tab, setTab] = useState('stream');  // 'stream' | 'alerts' | 'config'
  const [buzzerOn, setBuzzerOn] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [alerts, setAlerts] = useState([]);        // alert log
  const [liveDetect, setLiveDetect] = useState(null);      // { label, cam_id, confidence }
  const [unread, setUnread] = useState(0);
  const [backendOk, setBackendOk] = useState(false);
  const [capturedImg, setCapturedImg] = useState(null);
  const [captureObjUrl, setCaptureObjUrl] = useState(null);
  const [captureSaved, setCaptureSaved] = useState(false);
  const [captureError, setCaptureError] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const wsRef = useRef(null);
  const autoOffTimer = useRef(null);
  const alertsEndRef = useRef(null);
  const destroyedRef = useRef(false);

  const tabRef = useRef(tab);
  useEffect(() => { tabRef.current = tab; }, [tab]);

  // ── WebSocket to YOLO backend ──────────────────────────────────────────────
  const connectWS = useCallback(() => {
    if (destroyedRef.current) return;
    if (wsRef.current) { try { wsRef.current.close(); } catch (_) { } }
    let ws;
    try { ws = new WebSocket(backendWs); } catch (_) { return; }

    ws.onopen = () => {
      if (destroyedRef.current) { ws.close(); return; }
      setBackendOk(true);
    };

    ws.onmessage = (e) => {
      if (destroyedRef.current) return;
      try {
        const data = JSON.parse(e.data);
        const { cam_id, detections, timestamp } = data;

        if (detections && detections.length > 0) {
          const top = detections[0];
          setLiveDetect({ label: top.label, confidence: top.confidence, cam_id });
          const entry = {
            id: timestamp,
            animal: top.label,
            cam: cam_id,
            confidence: top.confidence,
            time: new Date(timestamp).toLocaleTimeString(),
            allDetections: detections.map(d => d.label).join(', '),
          };
          setAlerts(prev => [entry, ...prev].slice(0, 50));
          setUnread(prev => tabRef.current !== 'alerts' ? prev + 1 : 0);
          setBuzzerOn(true);
          setFlashOn(true);
          clearTimeout(autoOffTimer.current);
          autoOffTimer.current = setTimeout(() => {
            setBuzzerOn(false);
            setFlashOn(false);
            setLiveDetect(null);
          }, 5000);
        } else {
          setLiveDetect(null);
        }
      } catch (_) { }
    };

    ws.onerror = () => { if (!destroyedRef.current) setBackendOk(false); };
    ws.onclose = () => {
      if (destroyedRef.current) return;
      setBackendOk(false);
      setTimeout(connectWS, 5000);
    };

    wsRef.current = ws;
  }, [backendWs]);

  useEffect(() => {
    destroyedRef.current = false;
    connectWS();
    return () => {
      destroyedRef.current = true;
      try { wsRef.current?.close(); } catch (_) { }
      clearTimeout(autoOffTimer.current);
    };
  }, [backendWs]);

  useEffect(() => {
    let timer;
    const fetchDetections = async () => {
      try {
        const res = await fetch(`${backendBase}/detections`);
        if (res.ok) {
          const data = await res.json();
          const detections = data[activeCam];
          if (detections && detections.length > 0) {
            const top = detections[0];
            setLiveDetect({ label: top.label, confidence: top.confidence, cam_id: activeCam });
            const entry = {
              id: Date.now(),
              animal: top.label,
              cam: activeCam,
              confidence: top.confidence,
              time: new Date().toLocaleTimeString(),
              allDetections: detections.map(d => d.label).join(', '),
            };
            setAlerts(prev => {
              if (prev.length > 0 && prev[0].animal === entry.animal && prev[0].id > Date.now() - 3000) {
                return prev;
              }
              return [entry, ...prev].slice(0, 50);
            });
            setUnread(prev => tabRef.current !== 'alerts' ? prev + 1 : 0);
            setBuzzerOn(true);
            setFlashOn(true);
            clearTimeout(autoOffTimer.current);
            autoOffTimer.current = setTimeout(() => {
              setBuzzerOn(false);
              setFlashOn(false);
              setLiveDetect(null);
            }, 5000);
          } else {
            setLiveDetect(null);
          }
        }
      } catch (_) { }
      timer = setTimeout(fetchDetections, 2000);
    };
    fetchDetections();
    return () => clearTimeout(timer);
  }, [backendBase, activeCam]);

  const [sensorAlert, setSensorAlert] = useState(null);
  useEffect(() => {
    let active = true;
    const pollAlerts = async () => {
      try {
        const res = await fetch('http://192.168.29.200/status');
        if (!res.ok) return;
        const data = await res.json();
        if (data.alert && active) {
          setSensorAlert(data.alert);
        } else if (active) {
          setSensorAlert(null);
        }
      } catch (_) {
        if (active) setSensorAlert(null);
      }
    };
    pollAlerts();
    const interval = setInterval(pollAlerts, 4000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // ── Stream URL ─────────────────────────────────────────────────────────────
  const streamUrl = backendOk
    ? `${backendBase}/stream/${activeCam}?_t=${streamKey}`
    : `http://192.168.29.201:81/stream?_t=${streamKey}`;

  // ── Manual buzzer toggle (sends to backend → ESP) ──────────────────────────
  const handleBuzzer = useCallback(async () => {
    const next = !buzzerOn;
    setBuzzerOn(next);
    try { await fetch(`${backendBase}/trigger`, { method: next ? 'POST' : 'OPTIONS' }); } catch (_) { }
  }, [buzzerOn]);

  const handleFlash = useCallback(async () => {
    const next = !flashOn;
    setFlashOn(next);
    try { await fetch(`http://192.168.29.200/light?state=${next ? 'on' : 'off'}`); } catch (_) { }
  }, [flashOn]);

  // ── Capture snapshot from backend stream ───────────────────────────────────
  const captureImage = useCallback(async () => {
    setIsCapturing(true);
    setCaptureSaved(false);
    setCaptureError(false);
    try {
      const res = await fetch(`http://192.168.29.201/capture?_cb=${Date.now()}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const fileName = `AgriSense_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.jpg`;

      if (captureObjUrl) URL.revokeObjectURL(captureObjUrl);
      const objUrl = URL.createObjectURL(blob);
      setCaptureObjUrl(objUrl);
      setCapturedImg(objUrl);

      if (window.Capacitor?.isNativePlatform()) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const { Filesystem, Directory } = await import('@capacitor/filesystem');
            const { Media } = await import('@capacitor-community/media');
            const fsRes = await Filesystem.writeFile({
              path: fileName,
              data: reader.result.split(',')[1],
              directory: Directory.Data
            });
            try {
              await Media.savePhoto({ path: fsRes.uri });
            } catch (mediaErr) {
              await Filesystem.writeFile({
                path: `AgriSense/${fileName}`,
                data: reader.result.split(',')[1],
                directory: Directory.Documents,
                recursive: true
              });
            }
            setCaptureSaved(true);
          } catch (fsErr) {
            setCaptureSaved(true);
          }
        };
        reader.readAsDataURL(blob);
      } else {
        const a = document.createElement('a');
        a.href = objUrl; a.download = fileName;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setCaptureSaved(true);
      }
    } catch (_) {
      setCaptureError(true);
    } finally {
      setTimeout(() => setIsCapturing(false), 1200);
    }
  }, [captureObjUrl]);

  const handleStreamLoad = useCallback(() => setStreamOnline(true), []);
  const handleStreamError = useCallback(() => {
    setStreamOnline(false);
    setTimeout(() => setStreamKey(Date.now()), 5000);
  }, []);

  const switchTab = (t) => {
    setTab(t);
    if (t === 'alerts') setUnread(0);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: C.bg, minHeight: '100%', fontFamily: "'Outfit', sans-serif", display: 'flex', flexDirection: 'column' }}>

      {/* ── Floating alert toast ── */}
      <AnimatePresence>
        {liveDetect && (
          <motion.div
            key={liveDetect.id}
            initial={{ y: -70, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -70, opacity: 0 }}
            style={{
              position: 'fixed', top: 16, left: 16, right: 16, zIndex: 2000,
              background: C.danger, borderRadius: 18, padding: '14px 18px',
              display: 'flex', alignItems: 'center', gap: 12,
              boxShadow: '0 10px 40px rgba(239,68,68,0.45)',
            }}
          >
            <AlertTriangle size={22} color="white" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 900, color: 'white', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                🐾 {liveDetect.label} detected!
              </div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
                Camera: {liveDetect.cam_id}  •  {liveDetect.confidence}% confidence  •  Buzzer + LED activated
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setLiveDetect(null)}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: 10, padding: '5px 10px', fontSize: '0.65rem', fontWeight: 900, cursor: 'pointer' }}
            >
              DISMISS
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Camera feed ── */}
      <div style={{ position: 'relative', background: '#0F172A', flexShrink: 0 }}>
        <div style={{ height: 230, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
          <img
            key={streamKey}
            src={streamUrl}
            onLoad={handleStreamLoad}
            onError={handleStreamError}
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: streamOnline ? 1 : 0, position: 'absolute', inset: 0, transition: 'opacity 0.3s' }}
            alt="YOLO Stream"
          />

          {!streamOnline && (
            <div style={{ textAlign: 'center', color: '#475569', zIndex: 1 }}>
              <EyeOff size={44} strokeWidth={1.5} />
              <div style={{ fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 10 }}>
                Waiting for stream…
              </div>
            </div>
          )}

          {/* Detection bounding box overlay */}
          {liveDetect && streamOnline && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ position: 'absolute', left: '28%', top: '30%', width: 130, height: 110, border: `2.5px solid ${C.danger}`, borderRadius: 8, zIndex: 5, boxShadow: `0 0 20px ${C.danger}50` }}
            >
              <div style={{ position: 'absolute', top: -22, left: 0, background: C.danger, color: 'white', fontSize: '0.5rem', fontWeight: 950, padding: '2px 7px', borderRadius: 5 }}>
                {liveDetect.label.toUpperCase()} — {liveDetect.confidence}%
              </div>
            </motion.div>
          )}

          {/* LIVE / OFFLINE badge + backend status */}
          <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', gap: 8 }}>
            <div style={{ background: streamOnline ? `${C.danger}CC` : '#475569CC', borderRadius: 10, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Dot color="white" pulse={streamOnline} />
              <span style={{ fontSize: '0.55rem', fontWeight: 900, color: 'white', letterSpacing: '0.1em' }}>
                {streamOnline ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>
            <div style={{ background: backendOk ? '#10B98188' : '#EF444488', borderRadius: 10, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
              {backendOk ? <Wifi size={10} color="white" /> : <WifiOff size={10} color="white" />}
              <span style={{ fontSize: '0.55rem', fontWeight: 900, color: 'white', letterSpacing: '0.08em' }}>
                {backendOk ? 'AI OK' : 'NO AI'}
              </span>
            </div>
          </div>

          {/* Camera selector (if multiple cams) */}
          {CAM_IDS.length > 1 && (
            <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', gap: 6 }}>
              {CAM_IDS.map(id => (
                <motion.button
                  key={id} whileTap={{ scale: 0.9 }}
                  onClick={() => { setActiveCam(id); setStreamKey(Date.now()); setStreamOnline(false); }}
                  style={{ background: activeCam === id ? 'white' : 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: '0.55rem', fontWeight: 900, color: activeCam === id ? C.text : 'white', cursor: 'pointer' }}
                >
                  {id.toUpperCase()}
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* Control buttons row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, padding: '10px 14px 14px' }}>
          {[
            { icon: Bell, label: 'Buzzer', active: buzzerOn, color: C.danger, onClick: handleBuzzer },
            { icon: Lightbulb, label: 'LED Flash', active: flashOn, color: C.primary, onClick: handleFlash },
            { icon: CaptureIcon, label: 'Capture', active: isCapturing, color: C.secondary, onClick: captureImage },
          ].map(({ icon: Icon, label, active, color, onClick }) => (
            <motion.button
              key={label} whileTap={{ scale: 0.95 }} onClick={onClick}
              style={{
                background: active ? color : 'rgba(255,255,255,0.1)',
                border: `1px solid ${active ? color : 'rgba(255,255,255,0.15)'}`,
                borderRadius: 14, padding: '10px 4px', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 5, cursor: 'pointer',
                boxShadow: active ? `0 4px 16px ${color}40` : 'none',
              }}
            >
              <div style={{ width: 30, height: 30, borderRadius: 10, background: active ? 'rgba(255,255,255,0.2)' : `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={14} color={active ? 'white' : color} strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: '0.55rem', fontWeight: 900, color: active ? 'white' : 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ background: '#F1F5F9', margin: '0 14px 2px', borderRadius: 18, padding: 4, display: 'flex', gap: 2 }}>
        <Tab label="Stream" icon={Video} active={tab === 'stream'} onClick={() => switchTab('stream')} />
        <Tab label="Alerts" icon={List} active={tab === 'alerts'} badge={unread} onClick={() => switchTab('alerts')} />
        <Tab label="Config" icon={Settings} active={tab === 'config'} onClick={() => switchTab('config')} />
      </div>

      {/* ── Tab content ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px 90px' }}>

        <AnimatePresence>
          {liveDetect || sensorAlert ? (
            <motion.div
              key="detect" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              style={{ background: '#FEF2F2', borderRadius: 20, padding: '1rem', marginBottom: '1rem', border: `1px solid ${C.danger}20` }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: C.danger, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldAlert size={20} color="white" />
                </div>
                <div>
                  <div style={{ fontSize: '0.6rem', fontWeight: 800, color: C.danger, textTransform: 'uppercase' }}>Object Detected</div>
                  <div style={{ fontSize: '1rem', fontWeight: 950, color: C.text }}>{liveDetect ? `${liveDetect.label} Detected` : sensorAlert}</div>
                  <div style={{ fontSize: '0.65rem', color: C.muted, fontWeight: 700 }}>{liveDetect ? `Camera: ${liveDetect.cam_id}  •  ${liveDetect.confidence}% conf` : 'Detected by Ultrasonic Sensor'}  •  Buzzer + LED active</div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="clear" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ background: '#ECFDF5', borderRadius: 20, padding: '1rem', marginBottom: '1rem', border: `1px solid ${C.primary}20`, display: 'flex', alignItems: 'center', gap: 10 }}
            >
              <CheckCircle size={22} color={C.primary} />
              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 900, color: C.primary, textTransform: 'uppercase' }}>Field Clear</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: C.muted }}>{backendOk ? 'AI monitoring active' : 'Normal stream active. Refresh if Feed is not visible'}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stream tab content */}
        {tab === 'stream' && (
          <div>
          </div>
        )}

        {/* Alerts tab */}
        {tab === 'alerts' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 900, color: C.text }}>Detection Log</span>
              {alerts.length > 0 && (
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setAlerts([])}
                  style={{ background: '#F1F5F9', border: 'none', borderRadius: 10, padding: '4px 12px', fontSize: '0.6rem', fontWeight: 900, color: C.muted, cursor: 'pointer' }}>
                  CLEAR
                </motion.button>
              )}
            </div>

            {alerts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: C.muted }}>
                <List size={36} strokeWidth={1.5} style={{ marginBottom: 12, opacity: 0.4 }} />
                <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>No detections yet</div>
                <div style={{ fontSize: '0.65rem', marginTop: 4, opacity: 0.7 }}>Alerts will appear here when YOLO detects animals</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {alerts.map((a, i) => (
                  <motion.div
                    key={a.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    style={{ background: C.card, borderRadius: 16, padding: '12px 14px', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12 }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${C.danger}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <AlertTriangle size={16} color={C.danger} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 900, color: C.text }}>
                        🐾 {a.animal} detected
                      </div>
                      <div style={{ fontSize: '0.62rem', color: C.muted, fontWeight: 700, marginTop: 2 }}>
                        Camera: {a.cam}  •  {a.confidence}% conf
                      </div>
                      {a.allDetections !== a.animal && (
                        <div style={{ fontSize: '0.58rem', color: C.muted, marginTop: 1, opacity: 0.7 }}>Also: {a.allDetections}</div>
                      )}
                    </div>
                    <div style={{ fontSize: '0.6rem', fontWeight: 700, color: C.muted, flexShrink: 0 }}>{a.time}</div>
                  </motion.div>
                ))}
                <div ref={alertsEndRef} />
              </div>
            )}
          </div>
        )}

        {/* Config tab */}
        {tab === 'config' && (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 900, color: C.text }}>Backend IP Address</span>
              <input
                type="text" value={backendIp}
                onChange={(e) => {
                  setBackendIp(e.target.value);
                  localStorage.setItem('agrisense_backend_ip', e.target.value);
                }}
                placeholder="192.168.29.X"
                style={{ background: C.card, padding: '12px 14px', borderRadius: 16, border: `1px solid ${C.border}`, color: C.text, fontSize: '0.85rem', fontWeight: 700, outline: 'none' }}
              />
              <div style={{ fontSize: '0.62rem', color: C.muted, fontWeight: 700, opacity: 0.8 }}>
                The IP address of the computer running <code>agrisense_vision_backend.py</code>.
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Captured image modal */}
      <AnimatePresence>
        {capturedImg && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => { setCapturedImg(null); setCaptureSaved(false); setCaptureError(false); }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.95)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          >
            <motion.img initial={{ scale: 0.9 }} animate={{ scale: 1 }} src={capturedImg} style={{ width: '100%', maxWidth: 500, borderRadius: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} alt="Capture" />
            {captureSaved && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                style={{
                  marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px',
                  background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)',
                  padding: '8px 18px', borderRadius: '20px', color: '#10B981',
                  fontSize: '0.72rem', fontWeight: 900
                }}
              >
                <CheckCircle size={14} />
                {window.Capacitor?.isNativePlatform() ? 'Saved to Device Photos' : 'Downloaded to device'}
              </motion.div>
            )}
            <div style={{ marginTop: 16, fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em' }}>TAP TO CLOSE</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CAPTURE ERROR TOAST */}
      <AnimatePresence>
        {captureError && (
          <motion.div
            initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
            style={{
              position: 'fixed', bottom: '80px', left: '20px', right: '20px',
              background: '#1E293B', border: '1px solid #EF444440',
              borderRadius: '16px', padding: '14px 18px', zIndex: 9999,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              boxShadow: '0 8px 30px rgba(0,0,0,0.3)'
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#EF4444' }}>
              ✕ Capture failed — is ESP32-CAM online?
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setCaptureError(false)}
              style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '1rem', cursor: 'pointer' }}
            >✕</motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`.no-scrollbar::-webkit-scrollbar{display:none}`}</style>
    </div>
  );
};

export default VisualMonitor;
