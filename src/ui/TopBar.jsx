import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../state/AppContext';
import { 
  Bell, Menu, User, X, AlertTriangle 
} from 'lucide-react';

const AgriSenseLogo = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#059669" fillOpacity="0.2" />
      <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 7v6" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 10l3 3 3-3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <span style={{ fontSize: '1.25rem', fontWeight: 950, color: '#1e293b', letterSpacing: '-0.04em', background: 'linear-gradient(135deg, #059669, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Agri Sense</span>
  </div>
);

const TopBar = ({ title }) => {
  const { 
    setIsSidebarOpen, sensorData
  } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const [aiNotifications, setAiNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('agrisense_ai_notifications');
      if (saved) return JSON.parse(saved).filter(n => Date.now() - n.timestamp < 24 * 60 * 60 * 1000);
    } catch(e){ console.warn(e); }
    return [];
  });
  const sensorDataRef = useRef(sensorData);

  useEffect(() => { sensorDataRef.current = sensorData; }, [sensorData]);
  useEffect(() => { localStorage.setItem('agrisense_ai_notifications', JSON.stringify(aiNotifications)); }, [aiNotifications]);

  useEffect(() => {
    const checkNotifications = async () => {
      const key = import.meta.env.VITE_GROQ_API_KEY;
      if (!key) return;
  
      let globalWeather = '';
      try {
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=22.57&longitude=88.36&current_weather=true&daily=weathercode,temperature_2m_max,precipitation_sum&timezone=auto');
        const data = await res.json();
        globalWeather = `Global Weather: ${data.current_weather.temperature}°C, Wind ${data.current_weather.windspeed}km/h. Precipitation: ${data.daily.precipitation_sum[0]}mm.`;
      } catch(e) { console.warn('Weather fetch failed', e); }
  
      const curSensor = sensorDataRef.current;
      const prompt = `You are AgriSense Notification Engine.
Field Data: Soil N:${curSensor?.soil?.npk?.n} P:${curSensor?.soil?.npk?.p} K:${curSensor?.soil?.npk?.k} pH:${curSensor?.soil?.ph} Moist:${curSensor?.soil?.moisture}%
Weather Node: Temp:${curSensor?.weather?.temp}C Hum:${curSensor?.weather?.humidity}% Rain:${curSensor?.weather?.rainLevel}
${globalWeather}

Analyze the hardware components and global weather data. If hardware data is missing, note that components might be disconnected.
Generate EXACTLY ONE notification for the farmer based on this exact moment. 
Format your entire response strictly as:
TYPE|HEADLINE|DESCRIPTION

Rules:
1. TYPE must be exactly "CRITICAL" or "NORMAL". Use CRITICAL for extreme weather (storms/floods) or completely disconnected hardware.
2. HEADLINE must be 5-6 words max.
3. DESCRIPTION must be 2-3 lines of concise action-oriented text.
Do NOT output anything else. No headers, no markdown.`;
  
      try {
        const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
          }),
        });
        const json = await resp.json();
        const content = json?.choices?.[0]?.message?.content?.trim();
        if (content && content.includes('|')) {
          const [type, headline, desc] = content.split('|');
          if (headline && desc) {
            const newNotif = {
              id: Date.now(),
              type: type.trim().toUpperCase() === 'CRITICAL' ? 'CRITICAL' : 'NORMAL',
              headline: headline.trim(),
              desc: desc.trim(),
              timestamp: Date.now()
            };
            setAiNotifications(prev => [newNotif, ...prev].slice(0, 20));
          }
        }
      } catch(e) { console.warn('AI fetch failed', e); }
    };
  
    const lastCheck = localStorage.getItem('agrisense_last_notif_check');
    const now = Date.now();
    if (!lastCheck || now - parseInt(lastCheck) > 3600000) {
      checkNotifications();
      localStorage.setItem('agrisense_last_notif_check', now.toString());
    }
  
    const interval = setInterval(() => {
      checkNotifications();
      localStorage.setItem('agrisense_last_notif_check', Date.now().toString());
    }, 3600000);
  
    return () => clearInterval(interval);
  }, []);

  const hasCritical = aiNotifications.some(n => n.type === 'CRITICAL');
  const hasNormal = aiNotifications.some(n => n.type === 'NORMAL');

  return (
    <header style={{ 
      position: 'relative', zIndex: 1000, 
      background: 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid #F1F5F9',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 1rem',
      paddingTop: 'env(safe-area-inset-top, 0px)',
      height: 'calc(60px + env(safe-area-inset-top, 0px))',
      flexShrink: 0
    }}>

      {/* LEFT: MENU & TITLE */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {location.pathname === '/dashboard' ? (
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsSidebarOpen(prev => !prev)}
            style={{ background: '#F8FAFC', border: '1px solid #F1F5F9', color: '#1E293B', cursor: 'pointer', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <Menu size={19} strokeWidth={2.5} />
          </motion.button>
        ) : (
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsSidebarOpen(prev => !prev)}
            style={{ background: '#F8FAFC', border: '1px solid #F1F5F9', color: '#1E293B', cursor: 'pointer', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <Menu size={19} strokeWidth={2.5} />
          </motion.button>
        )}
        
        {location.pathname === '/dashboard' ? (
          <AgriSenseLogo />
        ) : (
          <motion.h1 
            key={title}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}
          >
            {title}
          </motion.h1>
        )}
      </div>

      {/* 🔔 RIGHT SIDE: ACTIONS & PROFILE */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <motion.div 
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/alerts')}
          style={{ cursor: 'pointer', padding: '8px', background: '#f8fafc', borderRadius: '12px', position: 'relative' }}
        >
          <Bell size={20} color="#64748b" strokeWidth={2} />
          {hasCritical ? (
            <div className="animate-pulse-red" style={{ 
              position: 'absolute', top: '6px', right: '8px', 
              width: '10px', height: '10px', background: '#ef4444', 
              borderRadius: '50%', border: '2px solid white'
            }}></div>
          ) : hasNormal ? (
            <div style={{ 
              position: 'absolute', top: '6px', right: '8px', 
              width: '8px', height: '8px', background: '#F59E0B', 
              borderRadius: '50%', border: '2px solid white'
            }}></div>
          ) : null}
        </motion.div>
        
        <motion.div 
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/profile')}
          style={{ cursor: 'pointer', padding: '8px', background: '#f8fafc', borderRadius: '12px' }}
        >
          <User size={20} color="#64748b" strokeWidth={2} />
        </motion.div>
      </div>

      <style>{`
        @keyframes pulse-red {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        .animate-pulse-red { animation: pulse-red 2s infinite; }
      `}</style>
    </header>
  );
};

export default TopBar;
