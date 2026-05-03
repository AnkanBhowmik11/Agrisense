import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Settings as SettingsIcon,
  CloudRain, Archive, FlaskConical, Camera,
  Sparkles, BarChart2, Network, BellRing,
  Sprout, Droplets, FileText, LogOut
} from 'lucide-react';
import { useApp } from '../state/AppContext';
import { auth, signOut } from '../firebase';

const Sidebar = () => {
  const { user, isSidebarOpen, setIsSidebarOpen, farmInfo, mqttStatus, t } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const close = () => setIsSidebarOpen(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      close();
      navigate('/login');
    } catch (e) {
      console.error(e);
    }
  };

  const farmName     = farmInfo?.projectName || 'InnovateX';
  const clientName   = farmInfo?.name        || 'SemiColon';
  const isLive       = mqttStatus === 'connected';

  const sidebarGroups = [
    {
      title: t('field_monitoring'),
      links: [
        { name: t('soil_monitor'),     path: '/soil-monitoring',        icon: Sprout,    desc: 'NPK · pH · Moisture' },
        { name: t('irrigation'),       path: '/irrigation',             icon: Droplets,  desc: 'Pump · Flow · Level' },
        { name: t('weather_station'),  path: '/weather',                icon: CloudRain, desc: 'Temp · Rain · Light' },
        { name: t('storage_hub'),      path: '/storage-hub',            icon: Archive,   desc: 'Gas · Humidity · Temp' },
      ]
    },
    {
      title: t('intelligence'),
      links: [
        { name: t('ai_advisor'),       path: '/crop-advisor',           icon: Sparkles,  desc: 'Crop recommendations' },
        { name: t('soil_forensics'),   path: '/precision-soil-testing', icon: FlaskConical, desc: 'Deep soil analysis' },
        { name: t('analytics'),        path: '/analytics',              icon: BarChart2, desc: 'Trend charts & data' },
        { name: t('farm_reports'),     path: '/reports',                icon: FileText,  desc: 'Summary reports' },
      ]
    },
    {
      title: t('operations'),
      links: [
        { name: t('field_vision'),     path: '/camera',                 icon: Camera,        desc: 'Live camera feed' },
        { name: t('device_manager'),   path: '/device-area',            icon: Network,       desc: 'Node status & controls' },
        { name: t('alert_center'),     path: '/alerts',                 icon: BellRing,      desc: 'Notifications' },
        { name: t('settings'),         path: '/settings',               icon: SettingsIcon,  desc: 'Config & pairing' },
      ]
    }
  ];

  return (
    <>
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
            onClick={close}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: isSidebarOpen ? 0 : '-100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, width: '280px', zIndex: 10002,
          background: 'linear-gradient(170deg, #042f1e 0%, #021a10 100%)',
          display: 'flex', flexDirection: 'column',
          boxShadow: isSidebarOpen ? '24px 0 60px rgba(0,0,0,0.5)' : 'none',
          borderRight: '1px solid rgba(255,255,255,0.04)'
        }}
      >
        {/* ── HEADER: FARM IDENTITY ── */}
        <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <motion.button whileTap={{ scale: 0.9 }} onClick={close}
            style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '10px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={16} color="rgba(255,255,255,0.4)" />
          </motion.button>

          {/* Avatar + Name */}
          <div 
            style={{ display: 'flex', gap: '12px', alignItems: 'center', cursor: 'pointer', padding: '4px', borderRadius: '16px', transition: 'background 0.2s' }} 
            onClick={() => { close(); navigate('/profile'); }}
          >
            <div style={{ position: 'relative' }}>
              <img
                src={user?.photo || 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=200'}
                style={{ width: '48px', height: '48px', borderRadius: '14px', objectFit: 'cover', border: '2px solid rgba(16,185,129,0.3)' }}
              />
              <div style={{
                position: 'absolute', bottom: 2, right: 2,
                width: '10px', height: '10px', borderRadius: '50%',
                background: isLive ? '#10B981' : '#94A3B8',
                border: '2px solid #021a10'
              }} />
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.01em' }}>{user?.name || 'Farmer'}</div>
              <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginTop: '1px' }}>{user?.location || user?.email || 'Field Operator'}</div>
            </div>
          </div>

          {/* Farm Identity Tag */}
          <div style={{
            marginTop: '14px', background: 'rgba(16,185,129,0.1)',
            border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px',
            padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#10B981', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{farmName}</div>
              <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', fontWeight: 600, marginTop: '1px' }}>Client · {clientName}</div>
            </div>
            <div style={{
              padding: '3px 8px', borderRadius: '8px', fontSize: '0.5rem', fontWeight: 900,
              background: isLive ? 'rgba(16,185,129,0.2)' : 'rgba(148,163,184,0.15)',
              color: isLive ? '#10B981' : '#94A3B8',
              textTransform: 'uppercase', letterSpacing: '0.06em'
            }}>
              {isLive ? '● LIVE' : '○ OFFLINE'}
            </div>
          </div>
        </div>

        {/* ── NAV LINKS ── */}
        <div style={{ padding: '12px 10px', overflowY: 'auto', flex: 1 }} className="no-scrollbar">
          {sidebarGroups.map((group, gi) => (
            <div key={gi} style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '0.58rem', fontWeight: 800, color: '#10B981', padding: '0 10px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.12em', opacity: 0.7 }}>
                {group.title}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {group.links.map((link, li) => {
                  const NavIcon = link.icon;
                  const isActive = location.pathname === link.path;
                  return (
                    <NavLink key={li} to={link.path} onClick={close}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '9px 10px', borderRadius: '12px',
                        background: isActive ? 'rgba(16,185,129,0.15)' : 'transparent',
                        border: isActive ? '1px solid rgba(16,185,129,0.2)' : '1px solid transparent',
                        textDecoration: 'none', transition: 'all 0.2s'
                      }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: isActive ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <NavIcon size={16} color={isActive ? '#10B981' : 'rgba(255,255,255,0.5)'} />
                      </div>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: isActive ? 800 : 600, color: isActive ? '#fff' : 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {link.name}
                        </div>
                        <div style={{ fontSize: '0.57rem', color: 'rgba(255,255,255,0.28)', fontWeight: 500, marginTop: '1px' }}>
                          {link.desc}
                        </div>
                      </div>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* ── FOOTER ── */}
        <div style={{ padding: '16px 18px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          <div style={{ 
            background: 'linear-gradient(to right, rgba(16,185,129,0.1), rgba(16,185,129,0.05))', 
            border: '1px solid rgba(16,185,129,0.2)', 
            borderRadius: '12px', padding: '10px 14px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>{t('current_plan')}</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#10B981' }}>AgriSense (Pro)</span>
          </div>

          <button 
            onClick={handleLogout}
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              width: '100%', padding: '10px', borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#EF4444', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer',
              transition: 'background 0.2s'
            }}
          >
            <LogOut size={16} /> {t('logout')}
          </button>

          <div style={{ textAlign: 'center', margin: '8px 0 0' }}>
            <div style={{ fontSize: '0.65rem', color: '#10B981', fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.5 }}>AgriSense Pro · v17.1.0</div>
            <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.2)', fontWeight: 600, marginTop: '2px' }}>Created by Team Semicolon</div>
          </div>
        </div>
      </motion.div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
  );
};

export default Sidebar;
