/**
 * Bharat Advisor Pro v17.1.0 Master State Manager
 * Organized Industrial State Engine for AgriSense Ecosystem.
 */

import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';

// API & Infrastructure
import mqttService from '../api/mqttService';
import { processDeviceState, calculateSystemOverview } from '../api/deviceService';
import { MASTER_CONFIG } from '../setup';

// Types & Data Models
import { 
  INITIAL_SENSOR_DATA, 
  INITIAL_API_WEATHER, 
  INITIAL_SYSTEM_HEALTH 
} from '../types/sensorModel';

// Business Logic Engines
import { 
  getAIv2Recommendations,
  calculateNodeHealth, 
  calculateOverallHealth,
  ACTUATORS 
} from '../logic/healthEngine';
import { processMqttMessage } from '../engines/sensorController';
import { TRANSLATIONS } from './translations';

import { auth, signOut, onAuthStateChanged, db, doc, setDoc, getDoc, updateDoc, deleteDoc, collection, getDocs } from '../firebase';

const AppContext = createContext();

const extractFieldTimestamp = (field) => {
  if (typeof field?.createdAt === 'number') return field.createdAt;
  const idMatch = String(field?.id || '').match(/^f_(\d+)$/);
  return idMatch ? Number(idMatch[1]) : Number.MAX_SAFE_INTEGER;
};

const sortFieldsByCreation = (list = []) => (
  [...list].sort((a, b) => extractFieldTimestamp(a) - extractFieldTimestamp(b))
);

const getDateKey = (ts = Date.now()) => {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const AGRISENSE_LS_KEYS = [
  'agrisense_fields',
  'agrisense_active_field',
  'agrisense_selected_analytics_field',
  'agrisense_analytics_snapshots',
  'agrisense_analytics_reports',
  'agrisense_history',
  'agrisense_branding',
  'agrisense_ai_notifications',
];

const lsKey = (uid, key) => uid ? `${key}_${uid}` : key;

const clearAllUserData = () => {
  AGRISENSE_LS_KEYS.forEach(k => {
    // Remove both plain keys and any UID-scoped keys
    Object.keys(localStorage)
      .filter(lk => lk === k || lk.startsWith(k + '_'))
      .forEach(lk => localStorage.removeItem(lk));
  });
};

export const AppProvider = ({ children }) => {
  // ─── STATE DEFINITIONS ────────────────────────────────────────────────────
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('agrisense_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Auth Persistence Failure:", e);
      return null;
    }
  });

  // Wipe stale localStorage when a different user logs in
  const prevUidRef = useRef(null);
  useEffect(() => {
    const currentUid = user?.uid || null;
    if (prevUidRef.current && prevUidRef.current !== currentUid) {
      // Different user — wipe device-level non-scoped keys
      clearAllUserData();
    }
    prevUidRef.current = currentUid;
  }, [user?.uid]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Reload so displayName set by updateProfile is available (avoids race with signup)
        try { await firebaseUser.reload(); } catch(_) {}
        const freshUser = auth.currentUser || firebaseUser;

        // If displayName is still null after reload, wait briefly and try once more
        let displayName = freshUser.displayName;
        if (!displayName) {
          await new Promise(r => setTimeout(r, 800));
          try { await (auth.currentUser || firebaseUser).reload(); } catch(_) {}
          displayName = auth.currentUser?.displayName || null;
        }

        let userData = {
          email: freshUser.email,
          name: displayName || freshUser.email?.split('@')[0] || 'Farmer',
          uid: freshUser.uid,
          location: 'Field Zone A',
          phone: freshUser.phoneNumber || '',
          photo: freshUser.photoURL || 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=200',
          isGuest: false
        };

        try {
          const userDocRef = doc(db, 'users', freshUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            // Merge Firestore data — but preserve displayName if Firestore has stale 'Farmer'
            const firestoreData = userDoc.data();
            if (firestoreData.name === 'Farmer' && displayName) firestoreData.name = displayName;
            userData = { ...userData, ...firestoreData };
          } else {
            // Brand new user — save with correct name
            await setDoc(userDocRef, userData);
          }
        } catch (error) {
          console.error("Firestore error:", error);
        }

        setUser(userData);
        localStorage.setItem('agrisense_user', JSON.stringify(userData));
      }
    });
    return () => unsubscribe();
  }, []);

  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('agrisense_language') || 'en';
  });

  const changeLanguage = (lang) => {
    setLanguage(lang);
    localStorage.setItem('agrisense_language', lang);
  };

  const t = (key) => TRANSLATIONS[language]?.[key] || TRANSLATIONS['en']?.[key] || key;

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [sensorData, setSensorData] = useState(INITIAL_SENSOR_DATA);
  
  const [devices, setDevices] = useState({
    'soil_node': processDeviceState('soil_node', 'soil', null),
    'weather_node': processDeviceState('weather_node', 'weather', null),
    'storage_node': processDeviceState('storage_node', 'storage', null),
    'water_node': processDeviceState('water_node', 'water', null),
    'vision_node': processDeviceState('vision_node', 'vision', null)
  });

  const [systemOverview, setSystemOverview] = useState({
    total_nodes: 5, active_nodes: 0, partial_nodes: 0, offline_nodes: 5,
    overall_status: 'OFFLINE', health_percent: 0, nodes: []
  });

  const [apiWeather, setApiWeather] = useState(INITIAL_API_WEATHER);
  const [apiForecast, setApiForecast] = useState([]);
  const [globalWeatherAlert, setGlobalWeatherAlert] = useState(null);
  const [mqttStatus, setMqttStatus] = useState('disconnected');
  const [connectivityStatus, setConnectivityStatus] = useState('Online');
  const [cloudSyncStatus, setCloudSyncStatus] = useState('Active');
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [lastGlobalUpdate, setLastGlobalUpdate] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [actuators, setActuators] = useState({
    [ACTUATORS.PUMP]:    false,
    [ACTUATORS.VALVE]:   false,
    [ACTUATORS.SPRAYER]: false,
    [ACTUATORS.BUZZER]:  false,
    [ACTUATORS.DISPLAY]: false,
    [ACTUATORS.LIGHT]:   false,
  });

  // ─── FIELDS MANAGEMENT ───
  const [fields, setFields] = useState(() => {
    try {
      const uid = (() => { try { return JSON.parse(localStorage.getItem('agrisense_user'))?.uid; } catch { return null; } })();
      const saved = localStorage.getItem(lsKey(uid, 'agrisense_fields'));
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  
  const [activeFieldId, setActiveFieldId] = useState(() => {
    const uid = (() => { try { return JSON.parse(localStorage.getItem('agrisense_user'))?.uid; } catch { return null; } })();
    return localStorage.getItem(lsKey(uid, 'agrisense_active_field')) || null;
  });
  const [selectedAnalyticsFieldId, setSelectedAnalyticsFieldId] = useState(() => (
    (() => { const uid = (() => { try { return JSON.parse(localStorage.getItem('agrisense_user'))?.uid; } catch { return null; } })(); return localStorage.getItem(lsKey(uid, 'agrisense_selected_analytics_field')) || null; })()
  ));
  const [analyticsSnapshotsByField, setAnalyticsSnapshotsByField] = useState(() => {
    try {
      const uid = (() => { try { return JSON.parse(localStorage.getItem('agrisense_user'))?.uid; } catch { return null; } })();
      const raw = localStorage.getItem(lsKey(uid, 'agrisense_analytics_snapshots'));
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });
  const [dailyAnalyticsReports, setDailyAnalyticsReports] = useState(() => {
    try {
      const uid = (() => { try { return JSON.parse(localStorage.getItem('agrisense_user'))?.uid; } catch { return null; } })();
      const raw = localStorage.getItem(lsKey(uid, 'agrisense_analytics_reports'));
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });
  const lastSnapshotSlotRef = useRef(null);
  const lastMidnightRunRef = useRef(null);

  const activeField = useMemo(() => fields.find(f => f.id === activeFieldId), [fields, activeFieldId]);

  useEffect(() => {
    if (fields.length === 0) return;
    const hasActive = fields.some(f => f.id === activeFieldId);
    if (!hasActive) {
      const firstFieldId = sortFieldsByCreation(fields)[0]?.id;
      if (firstFieldId) {
        setActiveFieldId(firstFieldId);
        localStorage.setItem(lsKey(user?.uid, 'agrisense_active_field'), firstFieldId);
      }
    }
  }, [fields, activeFieldId, user?.uid]);

  useEffect(() => {
    if (selectedAnalyticsFieldId) return;
    if (!fields.length) return;
    const firstFieldId = sortFieldsByCreation(fields)[0]?.id || null;
    if (firstFieldId) {
      setSelectedAnalyticsFieldId(firstFieldId);
      localStorage.setItem(lsKey(user?.uid, 'agrisense_selected_analytics_field'), firstFieldId);
    }
  }, [fields, selectedAnalyticsFieldId, user?.uid]);

  useEffect(() => {
    const loadFieldsFromFirestore = async () => {
      if (!user?.uid || user.isGuest) return;
      try {
        const snapshot = await getDocs(collection(db, 'users', user.uid, 'fields'));
        const remoteFields = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        if (remoteFields.length === 0) return;

        const sortedFields = sortFieldsByCreation(remoteFields);
        setFields(sortedFields);
        localStorage.setItem(lsKey(user.uid, 'agrisense_fields'), JSON.stringify(sortedFields));

        const savedFieldId = localStorage.getItem(lsKey(user.uid, 'agrisense_active_field'));
        const preferredId = sortedFields.some(f => f.id === savedFieldId)
          ? savedFieldId
          : sortedFields[0]?.id;
        if (preferredId) {
          setActiveFieldId(preferredId);
          localStorage.setItem(lsKey(user.uid, 'agrisense_active_field'), preferredId);
        }
      } catch (e) {
        console.error("Failed to load fields from Firestore", e);
      }
    };

    loadFieldsFromFirestore();
  }, [user?.uid, user?.isGuest]);

  useEffect(() => {
    localStorage.setItem(lsKey(user?.uid, 'agrisense_analytics_snapshots'), JSON.stringify(analyticsSnapshotsByField));
  }, [analyticsSnapshotsByField, user?.uid]);

  useEffect(() => {
    localStorage.setItem(lsKey(user?.uid, 'agrisense_analytics_reports'), JSON.stringify(dailyAnalyticsReports));
  }, [dailyAnalyticsReports, user?.uid]);

  useEffect(() => {
    if (!selectedAnalyticsFieldId) return;
    localStorage.setItem(lsKey(user?.uid, 'agrisense_selected_analytics_field'), selectedAnalyticsFieldId);
  }, [selectedAnalyticsFieldId, user?.uid]);

  const addField = async (fieldData) => {
    const newField = { ...fieldData, id: 'f_' + Date.now(), createdAt: Date.now() };
    const newFields = [...fields, newField];
    setFields(newFields);
    setActiveFieldId(newField.id);
    localStorage.setItem(lsKey(user?.uid, 'agrisense_fields'), JSON.stringify(newFields));
    localStorage.setItem(lsKey(user?.uid, 'agrisense_active_field'), newField.id);

    // Save to firestore if logged in
    if (user?.uid && !user.isGuest) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'fields', newField.id), newField);
      } catch (e) { console.error("Failed to save field to Firestore", e); }
    }
  };

  const updateField = async (id, updatedData) => {
    const newFields = fields.map(f => f.id === id ? { ...f, ...updatedData } : f);
    setFields(newFields);
    localStorage.setItem(lsKey(user?.uid, 'agrisense_fields'), JSON.stringify(newFields));
    if (user?.uid && !user.isGuest) {
      try {
        await updateDoc(doc(db, 'users', user.uid, 'fields', id), updatedData);
      } catch (e) { console.error(e); }
    }
  };

  const deleteField = async (id) => {
    const newFields = fields.filter(f => f.id !== id);
    setFields(newFields);
    localStorage.setItem(lsKey(user?.uid, 'agrisense_fields'), JSON.stringify(newFields));
    if (activeFieldId === id) {
      const fallbackId = sortFieldsByCreation(newFields)[0]?.id || null;
      setActiveFieldId(fallbackId);
      if (fallbackId) localStorage.setItem(lsKey(user?.uid, 'agrisense_active_field'), fallbackId);
      else localStorage.removeItem(lsKey(user?.uid, 'agrisense_active_field'));
    }
    if (user?.uid && !user.isGuest) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'fields', id));
      } catch (e) { console.error(e); }
    }
  };

  const switchField = (id) => {
    setActiveFieldId(id);
    if (id) localStorage.setItem(lsKey(user?.uid, 'agrisense_active_field'), id);
    else localStorage.removeItem(lsKey(user?.uid, 'agrisense_active_field'));
  };

  useEffect(() => {
    const loadAnalyticsFromFirestore = async () => {
      if (!user?.uid || user.isGuest) return;
      try {
        const [snapshotsSnap, reportsSnap] = await Promise.all([
          getDocs(collection(db, 'users', user.uid, 'analyticsSnapshots')),
          getDocs(collection(db, 'users', user.uid, 'analyticsReports')),
        ]);

        const snapshotMap = {};
        snapshotsSnap.forEach((d) => {
          const data = d.data() || {};
          const { fieldId, date, entries = [] } = data;
          if (!fieldId || !date) return;
          if (!snapshotMap[fieldId]) snapshotMap[fieldId] = {};
          snapshotMap[fieldId][date] = entries;
        });
        if (Object.keys(snapshotMap).length) setAnalyticsSnapshotsByField(snapshotMap);

        const reportMap = {};
        reportsSnap.forEach((d) => {
          const data = d.data() || {};
          const { fieldId, date, report } = data;
          if (!fieldId || !date || !report) return;
          if (!reportMap[fieldId]) reportMap[fieldId] = {};
          reportMap[fieldId][date] = report;
        });
        if (Object.keys(reportMap).length) setDailyAnalyticsReports(reportMap);
      } catch (e) {
        console.error('Failed to load analytics from Firestore', e);
      }
    };

    loadAnalyticsFromFirestore();
  }, [user?.uid, user?.isGuest]);

  useEffect(() => {
    const captureSnapshot = async () => {
      if (!activeFieldId || !activeField) return;
      const now = Date.now();
      const slot = Math.floor(now / (10 * 60 * 1000));
      if (lastSnapshotSlotRef.current === slot) return;
      lastSnapshotSlotRef.current = slot;

      const dateKey = getDateKey(now);
      const entry = {
        timestamp: now,
        soil: {
          moisture: sensorData?.soil?.moisture ?? null,
          ph: sensorData?.soil?.ph ?? null,
          temp: sensorData?.soil?.temp ?? null,
          n: sensorData?.soil?.npk?.n ?? null,
          p: sensorData?.soil?.npk?.p ?? null,
          k: sensorData?.soil?.npk?.k ?? null,
        },
        weather: {
          temp: sensorData?.weather?.temp ?? null,
          humidity: sensorData?.weather?.humidity ?? null,
          lightIntensity: sensorData?.weather?.lightIntensity ?? null,
          rainLevel: sensorData?.weather?.rainLevel ?? null,
        },
        storage: {
          temp: sensorData?.storage?.temp ?? null,
          humidity: sensorData?.storage?.humidity ?? null,
          mq135: sensorData?.storage?.mq135 ?? null,
        },
      };

      let updatedForFieldDate = [];
      setAnalyticsSnapshotsByField((prev) => {
        const byField = prev[activeFieldId] || {};
        const dayEntries = byField[dateKey] || [];
        const alreadyThisSlot = dayEntries.some((e) => Math.floor((e.timestamp || 0) / (10 * 60 * 1000)) === slot);
        updatedForFieldDate = alreadyThisSlot ? dayEntries : [...dayEntries, entry];
        return {
          ...prev,
          [activeFieldId]: {
            ...byField,
            [dateKey]: updatedForFieldDate,
          },
        };
      });

      if (user?.uid && !user.isGuest) {
        try {
          await setDoc(
            doc(db, 'users', user.uid, 'analyticsSnapshots', `${activeFieldId}_${dateKey}`),
            {
              fieldId: activeFieldId,
              fieldName: activeField?.name || '',
              crop: activeField?.crop || '',
              date: dateKey,
              entries: updatedForFieldDate,
              updatedAt: now,
            },
            { merge: true }
          );
        } catch (e) {
          console.error('Failed to sync analytics snapshot', e);
        }
      }
    };

    captureSnapshot();
    const timer = setInterval(captureSnapshot, 60 * 1000);
    return () => clearInterval(timer);
  }, [activeFieldId, activeField, sensorData, user?.uid, user?.isGuest]);

  useEffect(() => {
    const generateFiveLineReport = async (fieldId, fieldName, crop, dateKey, entries) => {
      const avg = (arr) => {
        const vals = arr.filter((v) => typeof v === 'number');
        if (!vals.length) return null;
        return vals.reduce((a, b) => a + b, 0) / vals.length;
      };
      const latest = entries[entries.length - 1] || {};
      const stats = {
        soilMoistureAvg: avg(entries.map((e) => e.soil?.moisture)),
        soilPhAvg: avg(entries.map((e) => e.soil?.ph)),
        weatherTempAvg: avg(entries.map((e) => e.weather?.temp)),
        weatherHumidityAvg: avg(entries.map((e) => e.weather?.humidity)),
        storageTempAvg: avg(entries.map((e) => e.storage?.temp)),
      };

      const key = MASTER_CONFIG.GROQ_API_KEY;
      if (!key || key === 'YOUR_GROQ_API_KEY' || key.includes('VITE_')) {
        return [
          `Field ${fieldName} (${crop}) had ${entries.length} analytics snapshots on ${dateKey}.`,
          `Avg soil moisture ${stats.soilMoistureAvg?.toFixed(1) ?? '--'}% and pH ${stats.soilPhAvg?.toFixed(2) ?? '--'}.`,
          `Avg weather temp ${stats.weatherTempAvg?.toFixed(1) ?? '--'} C with humidity ${stats.weatherHumidityAvg?.toFixed(1) ?? '--'}%.`,
          `Avg storage temp ${stats.storageTempAvg?.toFixed(1) ?? '--'} C; latest rain level ${latest.weather?.rainLevel ?? '--'}.`,
          'Recommendation: review irrigation/storage settings if moisture and humidity drift from crop targets.',
        ];
      }

      try {
        const langInstruction = language === 'bn' ? "IMPORTANT: Provide the entire response in Bengali language. Ensure it reads naturally." : "";
        const prompt = `You are an agriculture analytics assistant. Return exactly 5 concise lines, no numbering. ${langInstruction}
Field: ${fieldName}
Crop: ${crop}
Date: ${dateKey}
Snapshots: ${entries.length}
Stats: ${JSON.stringify(stats)}
Latest: ${JSON.stringify(latest)}`;
        const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
          }),
        });
        if (!resp.ok) throw new Error(`Groq error ${resp.status}`);
        const json = await resp.json();
        const text = json?.choices?.[0]?.message?.content || '';
        const lines = text.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 5);
        if (lines.length === 5) return lines;
      } catch (err) {
        console.error('Groq analytics report failed', err);
      }

      return [
        `Field ${fieldName} (${crop}) had ${entries.length} analytics snapshots on ${dateKey}.`,
        `Average soil and weather trends stayed within expected operational range.`,
        `Storage and climate metrics should be watched for abrupt late-night shifts.`,
        `No major critical anomaly was detected in the sampled 10-minute windows.`,
        'Action: continue monitoring and adjust irrigation/fan cycles if drift persists.',
      ];
    };

    const runMidnightReports = async () => {
      const now = new Date();
      if (!(now.getHours() === 0 && now.getMinutes() < 5)) return;
      const runKey = getDateKey(now.getTime());
      if (lastMidnightRunRef.current === runKey) return;
      lastMidnightRunRef.current = runKey;

      const targetDate = getDateKey(now.getTime() - 24 * 60 * 60 * 1000);
      const fieldsToProcess = sortFieldsByCreation(fields);
      for (const field of fieldsToProcess) {
        const entries = analyticsSnapshotsByField?.[field.id]?.[targetDate] || [];
        if (!entries.length) continue;
        if (dailyAnalyticsReports?.[field.id]?.[targetDate]) continue;

        const lines = await generateFiveLineReport(field.id, field.name, field.crop, targetDate, entries);
        const report = {
          fieldId: field.id,
          fieldName: field.name,
          crop: field.crop || '',
          date: targetDate,
          lines,
          entries: entries, // Archive full 24h data
          generatedAt: Date.now(),
          snapshotCount: entries.length,
        };

        setDailyAnalyticsReports((prev) => ({
          ...prev,
          [field.id]: {
            ...(prev[field.id] || {}),
            [targetDate]: report,
          },
        }));

        // Delete old day's snapshots so the new day starts fresh
        setAnalyticsSnapshotsByField((prev) => {
          const newFieldData = { ...(prev[field.id] || {}) };
          delete newFieldData[targetDate];
          return { ...prev, [field.id]: newFieldData };
        });

        if (user?.uid && !user.isGuest) {
          try {
            await setDoc(
              doc(db, 'users', user.uid, 'analyticsReports', `${field.id}_${targetDate}`),
              {
                fieldId: field.id,
                fieldName: field.name,
                crop: field.crop || '',
                date: targetDate,
                report,
                updatedAt: Date.now(),
              },
              { merge: true }
            );
          } catch (e) {
            console.error('Failed to store analytics report', e);
          }
        }
      }
    };

    runMidnightReports();
    const timer = setInterval(runMidnightReports, 60 * 1000);
    return () => clearInterval(timer);
  }, [fields, analyticsSnapshotsByField, dailyAnalyticsReports, user?.uid, user?.isGuest]);

  const [farmInfo, setFarmInfo] = useState(() => {
    try {
      const saved = localStorage.getItem('agrisense_branding');
      const parsed = saved ? JSON.parse(saved) : null;
      // Migrate stale defaults from old installs
      if (parsed?.projectName === 'Agri Sense' || parsed?.name === 'MAKAUT, WB') {
        localStorage.removeItem('agrisense_branding');
      }
      const data = (parsed?.projectName && parsed.projectName !== 'Agri Sense')
        ? parsed
        : {
            name: MASTER_CONFIG.FARM_NAME,
            projectName: MASTER_CONFIG.PROJECT_NAME,
            tagline: MASTER_CONFIG.TAGLINE,
          };
      data.version = "17.1.0"; 
      return data;
    } catch (e) {
      return {
        name: MASTER_CONFIG.FARM_NAME,
        projectName: MASTER_CONFIG.PROJECT_NAME,
        tagline: MASTER_CONFIG.TAGLINE,
        version: "17.1.0" 
      };
    }
  });

  const [profileMeta, setProfileMeta] = useState({
    role: 'Industrial Controller',
    accessLevel: 'Admin (L5)',
    nodesManaged: 4,
    lastLogin: 'Today',
    commandsIssued: 0,
    alertsResolved: 0,
    notifications: { push: true, email: false },
    aiSensitivity: 'Balanced'
  });

  const lastSensorUpdate = useRef(null);

  const updateBranding = (newInfo) => {
    const updated = { ...farmInfo, ...newInfo };
    setFarmInfo(updated);
    localStorage.setItem('agrisense_branding', JSON.stringify(updated));
  };

  const updateProfileMeta = (newData) => setProfileMeta(prev => ({ ...prev, ...newData }));
  const updateUser = async (newUserData) => {
    const updated = { ...user, ...newUserData, isGuest: false };
    setUser(updated);
    localStorage.setItem('agrisense_user', JSON.stringify(updated));

    if (updated.uid && !updated.isGuest) {
      try {
        await setDoc(doc(db, 'users', updated.uid), newUserData, { merge: true });
      } catch (error) {
        console.error("Failed to save profile to Firestore:", error);
      }
    }
  };

  const login = (id, pass) => {
    // Only used for mock guest login now. Real auth is handled in Login.jsx
    if (id === 'guest') {
      const userData = { email: 'guest@agrisense.io', name: 'Guest Farmer', location: 'Field Zone A', isGuest: true };
      setUser(userData);
      localStorage.setItem('agrisense_user', JSON.stringify(userData));
      return true;
    }
    return false;
  };

  const logout = () => { 
    const uid = user?.uid;
    signOut(auth).catch(console.error);
    setUser(null); 
    localStorage.removeItem('agrisense_user');
    // Clear all user-scoped data so the next user starts fresh
    clearAllUserData();
    setFields([]);
    setActiveFieldId(null);
    setSelectedAnalyticsFieldId(null);
    setAnalyticsSnapshotsByField({});
    setDailyAnalyticsReports({});
    setSensorHistory([]);
    void uid; // suppress lint
  };

  const toggleActuator = (key) => {
    const newState = !actuators[key];
    setActuators(prev => ({ ...prev, [key]: newState }));
    
    // Global ESP Nodes HTTP toggles (Static IP bindings)
    const SENSOR_IP = 'http://192.168.29.200';
    if (key === ACTUATORS.LIGHT) {
      fetch(`${SENSOR_IP}/light?state=${newState ? 'on' : 'off'}`).catch(() => {});
    } else if (key === ACTUATORS.BUZZER) {
      fetch(`${SENSOR_IP}/buzzer?state=${newState ? 'on' : 'off'}`).catch(() => {});
    }

    if (!MASTER_CONFIG.USE_MOCK_DATA) {
      const commands = MASTER_CONFIG.ACTUATOR_COMMANDS[key];
      if (commands) mqttService.publishCommand({ action: newState ? commands.ON : commands.OFF, actuator: key.toLowerCase().replace(' ', '_'), status: newState ? "ON" : "OFF" });
    }
  };

  const toggleTheme = () => setIsDarkMode(!isDarkMode);
  const syncData = () => {
    setConnectivityStatus('Syncing...');
    mqttService.refresh();
    setTimeout(() => setConnectivityStatus('Online'), 2000);
  };

  const syncDeviceId = (codename, clientIdentifier) => {
    const toId = (raw) => raw?.trim() ? raw.trim().toLowerCase().replace(/\s+/g, '_') : null;
    const primary   = toId(codename)   || 'innovatex';
    const secondary = toId(clientIdentifier) || 'semicolon';
    console.log(`🔐 [PAIRING] Auth: ${primary} / ${secondary}`);
    setConnectivityStatus('Pairing...');
    mqttService.connect(
      primary, secondary,
      (topic, data) => {
        if (!data) return;
        setSensorData(prev => processMqttMessage(topic, data, prev));
        setIsDataLoading(false);
        setLastGlobalUpdate(new Date().toLocaleTimeString());
        setConnectivityStatus('Online');
      },
      (status) => setMqttStatus(status)
    );
  };

  // 1. Derived Health Logic (Pure Derivation)
  const systemHealth = React.useMemo(() => {
    if (!sensorData) return INITIAL_SYSTEM_HEALTH;
    return {
      soil: calculateNodeHealth('soil', sensorData.soil),
      weather: calculateNodeHealth('weather', sensorData.weather),
      storage: calculateNodeHealth('storage', sensorData.storage),
      water: calculateNodeHealth('irrigation', sensorData.water)
    };
  }, [sensorData]);

  const farmHealthScore = React.useMemo(() => {
    return calculateOverallHealth(systemHealth, devices);
  }, [systemHealth, devices]);

  // 2. AI Recommendation Logic
  const recommendations = React.useMemo(() => {
    if (sensorData?.soil?.moisture === null) return [];
    return getAIv2Recommendations(sensorData);
  }, [sensorData]);


  // 3. Sensor History Logger (Stateful Sync with Multi-Tab Persistence)
  const [sensorHistory, setSensorHistory] = useState(() => {
    try {
      const uid = (() => { try { return JSON.parse(localStorage.getItem('agrisense_user'))?.uid; } catch { return null; } })();
      const saved = localStorage.getItem(lsKey(uid, 'agrisense_history'));
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0 && (!parsed[0].timestamp || parsed[0].timestamp < 1000000)) {
        localStorage.removeItem(lsKey(uid, 'agrisense_history'));
        return [];
      }
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  });

  // 🏥 SYNC HISTORY ACROSS TABS
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'agrisense_history' && e.newValue) {
        try {
          const remoteHistory = JSON.parse(e.newValue);
          setSensorHistory(prev => {
            if (remoteHistory.length > prev.length) {
              // Mark as saved so we don't trigger a circular save loop
              lastSavedLen.current = remoteHistory.length;
              return remoteHistory;
            }
            return prev;
          });
        } catch (err) { /* silent fail */ }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 🏥 STATE RECOVERY: Restore last known data on boot
  useEffect(() => {
    if (sensorHistory.length > 0) {
      const last = sensorHistory[sensorHistory.length - 1];
      if (last && !last.isInitial) {
        setSensorData(prev => ({
          ...prev,
          soil: last.soil || prev.soil,
          weather: last.weather || prev.weather,
          water: last.water || prev.water,
          storage: last.storage || prev.storage,
          vision: last.vision || prev.vision
        }));
        setIsDataLoading(false);
      }
    }
  }, []); // Run once on mount

  // Throttled persistence with multi-tab safety
  const lastSavedLen = useRef(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (sensorHistory.length > lastSavedLen.current) {
        try {
          localStorage.setItem(lsKey(user?.uid, 'agrisense_history'), JSON.stringify(sensorHistory));
          lastSavedLen.current = sensorHistory.length;
        } catch (e) {
          console.warn("Storage Full - pruning history");
          setSensorHistory(prev => prev.slice(-500));
        }
      }
    }, 3000); 
    return () => clearTimeout(timer);
  }, [sensorHistory]);

  const lastHistoryUpdate = useRef(0);
  const [, setTick] = useState(0);

  // 🚀 HEARTBEAT: Force re-render every 5 seconds to keep Live charts moving
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(interval);
  }, []);

  // 🐕 WATCHDOG ENGINE: Monitor device timeouts and clear data when offline
  useEffect(() => {
    const watchdog = setInterval(() => {
      const now = Date.now();
      
      setDevices(prevDevs => {
        let changed = false;
        const nextDevs = { ...prevDevs };
        const offlineNodes = [];

        Object.keys(nextDevs).forEach(id => {
          if (nextDevs[id].status !== 'OFFLINE') {
             // 5 seconds offline threshold
             if (!nextDevs[id].lastUpdate || (now - nextDevs[id].lastUpdate > 5000)) {
               nextDevs[id] = { ...nextDevs[id], status: 'OFFLINE' };
               offlineNodes.push(nextDevs[id].node_type);
               changed = true;
             }
          }
        });

        if (changed) {
          const overview = calculateSystemOverview(nextDevs);
          setSystemOverview(overview);
          
          if (overview.overall_status === 'OFFLINE') {
            setConnectivityStatus('Offline');
          }
          
          // Clear the actual sensor data so dashboard shows --- and chart gets a gap
          setSensorData(prevData => {
             const newData = { ...prevData };
             if (offlineNodes.includes('soil')) newData.soil = INITIAL_SENSOR_DATA.soil;
             if (offlineNodes.includes('weather')) newData.weather = INITIAL_SENSOR_DATA.weather;
             if (offlineNodes.includes('storage')) newData.storage = INITIAL_SENSOR_DATA.storage;
             if (offlineNodes.includes('water') || offlineNodes.includes('irrigation')) newData.water = INITIAL_SENSOR_DATA.water;
             if (offlineNodes.includes('vision')) newData.vision = INITIAL_SENSOR_DATA.vision;
             return newData;
          });
        }
        
        return changed ? nextDevs : prevDevs;
      });
    }, 2000); // Check every 2 seconds

    return () => clearInterval(watchdog);
  }, []);

  const sensorDataRef = useRef(sensorData);
  useEffect(() => { sensorDataRef.current = sensorData; }, [sensorData]);

  // 🚀 PULSE ENGINE: Dedicated 5-second heartbeat for history logging
  useEffect(() => {
    const loggerInterval = setInterval(() => {
      const currentData = sensorDataRef.current;
      if (!currentData || (!currentData.soil && !currentData.weather)) return;

      setSensorHistory(prev => {
        const now = Date.now();
        lastHistoryUpdate.current = now;
        const newEntry = { ...currentData, timestamp: now };
        return [...prev, newEntry].slice(-5000); 
      });
    }, 5000); 
    
    return () => clearInterval(loggerInterval);
  }, []); // Run once, uses ref for stable data access

  // 🛰️ DYNAMIC VISION ZONE SYNC: Inherit from profile/location
  useEffect(() => {
    if (sensorData.vision.zone === '---' || sensorData.vision.zone === 'Sector A') {
      const loc = farmInfo?.location || user?.location || 'Field A';
      setSensorData(prev => ({
        ...prev,
        vision: { ...prev.vision, zone: loc }
      }));
    }
  }, [user, farmInfo, sensorData.vision.zone]);

  // 4. MQTT Linkage
  useEffect(() => {
    const bootTimer = setTimeout(() => {
      const toId = (raw) => raw?.trim() ? raw.trim().toLowerCase().replace(/\s+/g, '_') : null;
      const primary   = toId(farmInfo?.projectName) || 'innovatex';
      const secondary = toId(farmInfo?.name)        || 'semicolon';

      mqttService.connect(
        primary, secondary,
        (topic, data) => {
          if (!data) return;
          console.log("📥 [MQTT] Received:", topic, data);
          
          lastSensorUpdate.current = Date.now();
          setSensorData(prev => {
            const updated = processMqttMessage(topic, data, prev);
            
            // 🛰️ DEVICE STATUS SYNC (Unified Node Wake-Up)
            setDevices(prevDevs => {
              const parts = topic.split('/');
              const topicType = parts[parts.length - 1];
              const nextDevs = { ...prevDevs };
              const timestamp = Date.now();

              // If it's a unified sensors payload, wake up ALL nodes
              if (topicType === 'sensors' || data.soil || data.weather) {
                ['soil_node', 'weather_node', 'storage_node', 'water_node'].forEach(id => {
                  if (nextDevs[id]) nextDevs[id] = { ...nextDevs[id], status: 'ACTIVE', lastUpdate: timestamp };
                });
              } else {
                // Handle discrete node topics (camera/vision/cam -> vision_node)
                let id = `${topicType}_node`;
                if (['camera', 'vision', 'cam'].includes(topicType)) id = 'vision_node';
                if (nextDevs[id]) nextDevs[id] = { ...nextDevs[id], status: 'ACTIVE', lastUpdate: timestamp };
              }

              setSystemOverview(calculateSystemOverview(nextDevs));
              return nextDevs;
            });

            return updated;
          });

          setIsDataLoading(false);
          setLastGlobalUpdate(new Date().toLocaleTimeString());
          setConnectivityStatus('Online');
        },
        (status) => setMqttStatus(status)
      );
    }, 1500);
    return () => clearTimeout(bootTimer);
  }, []);

  // ⚡ INSTANT CONNECTIVITY SYNC
  useEffect(() => {
    if (mqttStatus === 'disconnected' || mqttStatus === 'error') {
      setConnectivityStatus('Offline');
    } else if (mqttStatus === 'connected') {
      setConnectivityStatus('Online');
    }
  }, [mqttStatus]);

  // 5. Weather Satellite & Forecast Link (Open-Meteo)
  useEffect(() => {
    const getWeatherDetails = (code) => {
      if (code === 0) return { condition: 'Clear', icon: '01d' };
      if (code === 1 || code === 2) return { condition: 'Partly Cloudy', icon: '02d' };
      if (code === 3) return { condition: 'Overcast', icon: '04d' };
      if (code === 45 || code === 48) return { condition: 'Fog', icon: '50d' };
      if (code >= 51 && code <= 55) return { condition: 'Drizzle', icon: '09d' };
      if (code >= 61 && code <= 65) return { condition: 'Rain', icon: '10d' };
      if (code >= 71 && code <= 77) return { condition: 'Snow', icon: '13d' };
      if (code >= 80 && code <= 82) return { condition: 'Showers', icon: '09d' };
      if (code >= 95 && code <= 99) return { condition: 'Thunderstorm', icon: '11d' };
      return { condition: 'Unknown', icon: '01d' };
    };

    const fetchWeather = async () => {
      try {
        let lat = 22.57, lon = 88.36;
        if (activeField?.location) {
          const coords = activeField.location.split(',');
          if (coords.length === 2) {
            lat = parseFloat(coords[0].trim());
            lon = parseFloat(coords[1].trim());
          }
        } else if (user?.location && user.location.includes('•')) {
          const coords = user.location.split('•')[0].split(',');
          if (coords.length === 2) {
            lat = parseFloat(coords[0].replace(/[^\d.-]/g, ''));
            lon = parseFloat(coords[1].replace(/[^\d.-]/g, ''));
          }
        }

        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,surface_pressure,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max&timezone=auto`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Weather fetch failed");
        const data = await res.json();

        const current = data.current;
        const details = getWeatherDetails(current.weather_code);

        setApiWeather({
          temp: Math.round(current.temperature_2m),
          feelsLike: Math.round(current.apparent_temperature),
          humidity: current.relative_humidity_2m,
          pressure: current.surface_pressure,
          windSpeed: `${Math.round(current.wind_speed_10m)} km/h`,
          clouds: current.cloud_cover,
          visibility: '---', 
          condition: details.condition,
          icon: details.icon,
          city: activeField?.name || 'Field',
          aqi: '---', 
          uv: '---',
          sunrise: data.daily?.sunrise?.[0] ? new Date(data.daily.sunrise[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--',
          sunset: data.daily?.sunset?.[0] ? new Date(data.daily.sunset[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--',
          lastUpdate: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });

        if (data.daily && data.daily.time) {
          const forecast = data.daily.time.slice(0, 5).map((timeStr, idx) => {
            const code = data.daily.weather_code[idx];
            const detail = getWeatherDetails(code);
            return {
              date: new Date(timeStr).toLocaleDateString([], { weekday: 'short' }),
              temp: Math.round((data.daily.temperature_2m_max[idx] + data.daily.temperature_2m_min[idx]) / 2),
              condition: detail.condition,
              rainProb: `${data.daily.precipitation_probability_max[idx]}%`
            };
          });
          setApiForecast(forecast);
        }

        const cCode = current.weather_code;
        if (cCode >= 95) setGlobalWeatherAlert("High Storm Warning: Thunderstorms detected in regional area.");
        else if (cCode === 65 || cCode === 82) setGlobalWeatherAlert("Heavy Rain / Flood Alert: Heavy precipitation detected.");
        else setGlobalWeatherAlert(null);

      } catch (err) {
        console.error("Open-Meteo Sync Failed:", err);
        setGlobalWeatherAlert("Unable to fetch regional weather data. Sensor data will be used if available.");
      }
    };

    fetchWeather();
    const weatherTimer = setInterval(fetchWeather, 600000); // 10 mins
    return () => clearInterval(weatherTimer);
  }, [activeField?.location, user?.location]);

  return (
    <AppContext.Provider value={{
      user, login, logout, updateUser, farmInfo, updateBranding,
      fields, activeField, activeFieldId, addField, updateField, deleteField, switchField,
      selectedAnalyticsFieldId, setSelectedAnalyticsFieldId, analyticsSnapshotsByField, dailyAnalyticsReports, setDailyAnalyticsReports,
      isDarkMode, toggleTheme, sensorData, apiWeather, apiForecast, globalWeatherAlert, recommendations, sensorHistory,
      actuators, toggleActuator, isSidebarOpen, setIsSidebarOpen, ACTUATORS,
      farmHealthScore, systemHealth, connectivityStatus, cloudSyncStatus, profileMeta, updateProfileMeta,
      isDataLoading, lastGlobalUpdate, mqttStatus, syncData, syncDeviceId,
      devices, systemOverview, language, changeLanguage, t
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
export default AppContext;
