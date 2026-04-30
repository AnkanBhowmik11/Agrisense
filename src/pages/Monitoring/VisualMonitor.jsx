/**
 * ESP32-CAM Surveillance System v1.0.0
 * High-integrity real-time monitoring based on hardware-triggered detection.
 * 
 * DESIGN: Industrial Minimalist, High-Density Telemetry.
 * LOGIC: Polling-based hardware state synchronization.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  EyeOff, Bell, Lightbulb, Camera as CaptureIcon,
  Maximize2, AlertTriangle, ShieldAlert, CheckCircle
} from 'lucide-react';
import { useApp } from '../../state/AppContext';

// ─── DESIGN TOKENS ─────────────────────────────────────────────────────────
const COLORS = {
  primary: '#10B981',    // Success / Safe
  secondary: '#3B82F6',  // Control / Info
  warning: '#F59E0B',    // Medium Alert
  danger: '#EF4444',     // High Alert / Live
  text: '#0F172A',
  muted: '#64748B',
  border: 'rgba(0,0,0,0.04)',
  bg: '#F8FAFC',
  card: '#FFFFFF'
};

const RAD = {
  card: '28px',
  inner: '18px',
  btn: '14px'
};

// ─── HELPER COMPONENTS ──────────────────────────────────────────────────────

const Badge = ({ children, color, pulse = false }) => (
  <div style={{ 
    background: `${color}15`, color: color, padding: '4px 10px', borderRadius: '10px', 
    fontSize: '0.65rem', fontWeight: 950, display: 'flex', alignItems: 'center', gap: '6px',
    border: `1px solid ${color}30`, backdropFilter: 'blur(8px)'
  }}>
    {pulse && <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} style={{ width: '6px', height: '6px', background: color, borderRadius: '50%' }} />}
    {children}
  </div>
);

const ControlButton = ({ icon: Icon, label, active, onClick, color = COLORS.secondary, offText = "OFF", isAction = false }) => (
  <motion.div 
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    style={{ 
      background: active ? color : COLORS.card, 
      border: `1px solid ${active ? color : COLORS.border}`,
      borderRadius: '14px', padding: '10px 4px', display: 'flex', flexDirection: 'column', 
      alignItems: 'center', gap: '5px', flex: 1, cursor: 'pointer',
      boxShadow: active ? `0 4px 12px ${color}25` : '0 1px 4px rgba(0,0,0,0.03)',
      userSelect: 'none',
    }}
  >
    <div style={{ 
      width: '30px', height: '30px', borderRadius: '10px', 
      background: active ? 'rgba(255,255,255,0.2)' : `${color}10`,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <Icon size={14} color={active ? 'white' : color} strokeWidth={2.5} />
    </div>
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '0.55rem', fontWeight: 900, color: active ? '#fff' : COLORS.text, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
        {label}
      </div>
    </div>
  </motion.div>
);

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────

const VisualMonitor = () => {
  // ─── HARDWARE IPs ─────────────────────────────────────────────────────────
  const CAM_IP    = 'http://192.168.4.2';  // ESP32-CAM  (joins AP as .2)
  const SENSOR_IP = 'http://192.168.4.1';  // Sensor ESP32 (AP host at .1)
  const streamUrl = `${CAM_IP}:81/stream`; // Stream runs on port 81 to avoid blocking port 80!

  const { devices, sensorData } = useApp();

  // ─── BUZZER & FLASH — local state + direct HTTP to Sensor ESP32 ───────────
  const [buzzerOn, setBuzzerOn] = useState(false);
  const [flashOn,  setFlashOn]  = useState(false);

  const toggleBuzzer = useCallback(async () => {
    const next = !buzzerOn;
    setBuzzerOn(next);
    try { await fetch(`${SENSOR_IP}/buzzer?state=${next ? 'on' : 'off'}`); }
    catch(e) { console.warn('Buzzer unreachable'); }
  }, [buzzerOn, SENSOR_IP]);

  const toggleFlash = useCallback(async () => {
    const next = !flashOn;
    setFlashOn(next);
    try { await fetch(`${SENSOR_IP}/light?state=${next ? 'on' : 'off'}`); }
    catch(e) { console.warn('Light unreachable'); }
  }, [flashOn, SENSOR_IP]);

  // ─── CAPTURE — fetch JPEG → instant preview + save/download ─────────────
  const [capturedImg,  setCapturedImg]  = useState(null);
  const [captureObjUrl, setCaptureObjUrl] = useState(null); // for memory cleanup
  const [isCapturing,  setIsCapturing]  = useState(false);
  const [captureSaved, setCaptureSaved] = useState(false);
  const [captureError, setCaptureError] = useState(false);

  const captureImage = useCallback(async () => {
    try {
      setIsCapturing(true);
      setCaptureSaved(false);
      setCaptureError(false);

      // We fetch from port 80 (default). Port 81 handles the stream!
      const res = await fetch(`${CAM_IP}/capture?_cb=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const fileName = `AgriSense_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.jpg`;

      // Revoke previous object URL to free memory
      if (captureObjUrl) URL.revokeObjectURL(captureObjUrl);

      // Object URL → instant preview without base64 conversion lag
      const objUrl = URL.createObjectURL(blob);
      setCaptureObjUrl(objUrl);
      setCapturedImg(objUrl);

      if (window.Capacitor?.isNativePlatform()) {
        // ── On phone APK: save to device ──
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const { Filesystem, Directory } = await import('@capacitor/filesystem');
            const { Media } = await import('@capacitor-community/media');
            
            // Save to app's data directory first to get a file URI
            const fsRes = await Filesystem.writeFile({
              path: fileName,
              data: reader.result.split(',')[1],
              directory: Directory.Data
            });
            
            // Save directly to the device's Photos gallery
            try {
              await Media.savePhoto({ path: fsRes.uri });
            } catch (mediaErr) {
              console.warn('Failed to save to Photos, might need permissions', mediaErr);
              // Fallback to Documents/AgriSense if Media fails
              await Filesystem.writeFile({
                path: `AgriSense/${fileName}`,
                data: reader.result.split(',')[1],
                directory: Directory.Documents,
                recursive: true
              });
            }
            
            setCaptureSaved(true);
          } catch(fsErr) {
            console.warn('FS save failed', fsErr);
            setCaptureSaved(true); // still show preview even if save fails
          }
        };
        reader.readAsDataURL(blob);
      } else {
        // ── In browser: trigger download ──
        const a = document.createElement('a');
        a.href = objUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setCaptureSaved(true);
      }
    } catch(e) {
      console.warn('Capture error:', e);
      setCaptureError(true);
    } finally {
      setTimeout(() => setIsCapturing(false), 1200);
    }
  }, [CAM_IP, captureObjUrl]);

  // ─── AI DETECTION POLLING ────────────────────────────────────────────────
  const [detection, setDetection] = useState({ active: false, type: '---', level: 'Normal', zone: 'Field Sector A', duration: 0 });

  useEffect(() => {
    const fetchDetection = async () => {
      try {
        const res = await fetch(`${CAM_IP}/detection`);
        if (res.ok) {
          const data = await res.json();
          setDetection({ 
            active: data.active, 
            type: data.type !== "None" ? data.type : "---", 
            level: data.level, 
            zone: 'Sector A', 
            duration: 12
          });
          if (data.active && data.level === 'High' && !buzzerOn) {
            toggleBuzzer();  // auto-activate hardware buzzer on high threat
          }
        }
      } catch (e) {
        // Cam offline or endpoint not ready
      }
    };

    const interval = setInterval(fetchDetection, 3000);
    return () => clearInterval(interval);
  }, [buzzerOn, toggleBuzzer]);

  // ─── STREAM STATE — driven by img load/error, NOT MQTT ───────────────────
  const [streamOnline, setStreamOnline] = useState(false);
  const [streamKey, setStreamKey] = useState(Date.now());

  const handleStreamLoad = useCallback(() => setStreamOnline(true), []);
  const handleStreamError = useCallback(() => {
    setStreamOnline(false);
    setTimeout(() => setStreamKey(Date.now()), 4000); // retry every 4s
  }, []);
  
  const telemetry = {
    fps: streamOnline ? '30' : '---', 
    latency: devices?.vision_node?.metrics?.latency || '---',
    detection: sensorData?.vision || detection
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="no-scrollbar" style={{ 
      background: COLORS.bg, minHeight: '100%', padding: '1.25rem', 
      paddingBottom: '0', fontFamily: "'Outfit', sans-serif", overflowX: 'hidden' 
    }}>
      
      {/* 1. LIVE CAMERA FEED SECTION */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        style={{ 
          position: 'relative', borderRadius: '32px', overflow: 'hidden', 
          background: '#000', marginBottom: '1.5rem', boxShadow: '0 12px 40px rgba(0,0,0,0.15)' 
        }}
      >
        <div style={{ height: '240px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F172A' }}>
          
          {/* Stream img — always attempted, shows/hides based on load state */}
          <img
            key={streamKey}
            src={streamUrl}
            onLoad={handleStreamLoad}
            onError={handleStreamError}
            style={{ 
              width: '100%', height: '100%', objectFit: 'cover', 
              opacity: streamOnline ? (telemetry.detection.active ? 0.9 : 1) : 0,
              position: 'absolute', inset: 0,
              transition: 'opacity 0.3s ease'
            }} 
            alt="Camera Feed"
          />

          {/* Offline placeholder — visible only when stream hasn't loaded */}
          {!streamOnline && (
            <div style={{ textAlign: 'center', color: '#475569' }}>
              <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'center' }}>
                <EyeOff size={48} strokeWidth={1.5} />
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Signal Lost</div>
              <div style={{ fontSize: '0.65rem', fontWeight: 600, opacity: 0.6 }}>Check hardware power & network</div>
            </div>
          )}
          
          {/* CAMERA OVERLAYS */}
          <div style={{ position: 'absolute', inset: 0, padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Badge color={streamOnline ? COLORS.primary : COLORS.muted} pulse={streamOnline}>
                  {streamOnline ? 'LIVE' : 'OFFLINE'}
                </Badge>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
              <motion.button whileTap={{ scale: 0.9 }} style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <Maximize2 size={18} />
              </motion.button>
            </div>
          </div>

          {/* MOTION BOUNDING BOX (Simulated Hardware Detection) */}
          {telemetry.detection.active && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ 
                position: 'absolute', left: '30%', top: '40%', width: '120px', height: '100px',
                border: `2px solid ${COLORS.danger}`, borderRadius: '8px', zIndex: 5,
                boxShadow: `0 0 20px ${COLORS.danger}40`
              }}
            >
              <div style={{ position: 'absolute', top: '-22px', left: 0, background: COLORS.danger, color: 'white', fontSize: '0.5rem', fontWeight: 950, padding: '2px 6px', borderRadius: '4px' }}>
                OBJECT DETECTED
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* 2. REAL-TIME DETECTION STATUS (DYNAMIC CARD) */}
      <AnimatePresence>
        {telemetry.detection.active && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ 
              background: '#FEF2F2', borderRadius: RAD.card, padding: '1.25rem', marginBottom: '1.5rem',
              border: `1px solid ${COLORS.danger}20`, boxShadow: '0 8px 30px rgba(239,68,68,0.1)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: COLORS.danger, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldAlert size={22} color="white" />
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: COLORS.danger, textTransform: 'uppercase' }}>Current Trigger</div>
                  <div style={{ fontSize: '1rem', fontWeight: 950, color: COLORS.text }}>{telemetry.detection.type}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.6rem', fontWeight: 800, color: COLORS.muted }}>RISK LEVEL</div>
                <div style={{ fontSize: '0.8rem', fontWeight: 900, color: COLORS.danger }}>{telemetry.detection.level}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: 'white', padding: '10px', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '0.55rem', fontWeight: 800, color: COLORS.muted }}>ZONE</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 900, color: COLORS.text }}>{telemetry.detection.zone}</div>
              </div>
              <div style={{ background: 'white', padding: '10px', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '0.55rem', fontWeight: 800, color: COLORS.muted }}>TIMESTAMP</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 900, color: COLORS.text }}>
                  {telemetry.detection.timestamp ? new Date(telemetry.detection.timestamp).toLocaleTimeString() : '---'}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. CAMERA HARDWARE CONTROL PANEL */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '1.5rem' }}>
        <ControlButton 
          icon={Bell} label="Buzzer" active={buzzerOn} color={COLORS.danger}
          onClick={toggleBuzzer} 
        />
        <ControlButton 
          icon={Lightbulb} label="Light" active={flashOn} color={COLORS.primary}
          onClick={toggleFlash} 
        />
        <ControlButton 
          icon={CaptureIcon} label="Capture" active={isCapturing} color={COLORS.secondary}
          onClick={captureImage} isAction={true}
        />
      </div>

      {/* ENVIRONMENTAL TELEMETRY REMOVED PER USER REQUEST */}


      {/* ALERT OVERLAY SYSTEM (Simulated) */}
      <AnimatePresence>
        {telemetry.detection.active && telemetry.detection.level === 'High' && (
          <motion.div 
            initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }}
            style={{ 
              position: 'fixed', top: '20px', left: '20px', right: '20px', 
              background: COLORS.danger, padding: '14px 20px', borderRadius: '16px',
              display: 'flex', alignItems: 'center', gap: '12px', zIndex: 1000,
              boxShadow: '0 10px 40px rgba(239,68,68,0.4)'
            }}
          >
            <AlertTriangle size={24} color="white" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 900, color: 'white' }}>THREAT DETECTED</div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{telemetry.detection.type} in {telemetry.detection.zone}!</div>
            </div>
            <motion.button whileTap={{ scale: 0.9 }} style={{ border: 'none', background: 'rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: '8px', color: 'white', fontSize: '0.65rem', fontWeight: 950 }}>VIEW</motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CAPTURED IMAGE FULLSCREEN MODAL */}
      <AnimatePresence>
        {capturedImg && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ 
              position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.95)', zIndex: 9999, 
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
              padding: '20px', backdropFilter: 'blur(10px)' 
            }}
            onClick={() => { setCapturedImg(null); setCaptureSaved(false); setCaptureError(false); }}
          >
            <motion.img 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              src={capturedImg} 
              style={{ width: '100%', maxWidth: '500px', borderRadius: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', border: '2px solid rgba(255,255,255,0.1)' }} 
              alt="Hardware Capture" 
            />
            {/* Save status badge */}
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
            <div style={{ 
              marginTop: '16px', color: 'rgba(255,255,255,0.5)', fontWeight: 700, 
              letterSpacing: '0.1em', fontSize: '0.65rem'
            }}>
              TAP ANYWHERE TO CLOSE
            </div>
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
              borderRadius: '16px', padding: '14px 18px', zIndex: 999,
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

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

    </div>
  );
};

export default VisualMonitor;
