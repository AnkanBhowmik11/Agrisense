/**
 * Farm Advisor Pro v17.1.0 Main Application Entry
 * Handles routing, global layout, and organized page imports.
 */

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { App as CapApp } from '@capacitor/app';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutGrid, LineChart, Cpu,
  Camera, Bell, User,
  Settings as SettingsIcon, FlaskConical, Sparkles
} from 'lucide-react';

// Context & State
import { AppProvider, useApp } from './state/AppContext';

// Reusable Components
import TopBar from './ui/TopBar';
import Sidebar from './ui/Sidebar';

// Pages - Organized Structure
import Login from './pages/Auth/Login';
import Splash from './pages/Auth/Splash';
import Profile from './pages/Auth/Profile';
import Settings from './pages/Auth/Settings';

import Dashboard from './pages/Core/Dashboard';
import AlertCenter from './pages/Core/AlertCenter';


import SoilMonitor from './pages/Monitoring/SoilMonitor';
import WeatherMonitor from './pages/Monitoring/WeatherMonitor';
import StorageMonitor from './pages/Monitoring/StorageMonitor';
import VisualMonitor from './pages/Monitoring/VisualMonitor';

import IrrigationSystem from './pages/Control/IrrigationSystem';
import DeviceManager from './pages/Control/DeviceManager';

import AnalyticsHub from './pages/Analytics/AnalyticsHub';
import Reports from './pages/Analytics/Reports';

import SoilForensics from './pages/Advisory/SoilForensics';
import FarmAdvisor from './pages/Advisory/FarmAdvisor';


const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { id: 'Home', path: '/dashboard', icon: LayoutGrid },
    { id: 'Soil Test', path: '/precision-soil-testing', icon: FlaskConical },
    { id: 'Advisor', path: '/crop-advisor', icon: Sparkles },
    { id: 'Analytics', path: '/analytics', icon: LineChart },
    { id: 'Devices', path: '/device-area', icon: Cpu },
  ];

  return (
    <nav style={{
      position: 'relative', background: '#FFFFFF', borderTop: '1px solid #F1F5F9',
      height: '65px', display: 'flex', justifyContent: 'space-around',
      alignItems: 'center', padding: '0 10px', zIndex: 1000,
      boxShadow: '0 -4px 20px rgba(0,0,0,0.03)', flexShrink: 0
    }}>
      {tabs.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        return (
          <motion.button
            key={item.path} whileTap={{ scale: 0.9 }}
            onClick={() => navigate(item.path)}
            style={{
              background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '2px', color: isActive ? '#10B981' : '#94A3B8',
              padding: '4px 0', flex: 1, cursor: 'pointer', transition: '0.3s'
            }}
          >
            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            <span style={{ fontSize: '0.55rem', fontWeight: isActive ? 950 : 700, textTransform: 'uppercase' }}>{item.id}</span>
          </motion.button>
        );
      })}
    </nav>
  );
};

const MainLayout = ({ children }) => {
  const location = useLocation();
  const mainRef = React.useRef(null);

  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [location.pathname]);

  const titles = {
    '/dashboard': 'Dashboard',
    '/analytics': 'Analytics Hub',
    '/irrigation':             'Irrigation System',
    '/weather':                'Weather Station',
    '/soil-monitoring':        'Soil Monitor',
    '/storage-hub':            'Storage Hub',
    '/device-area':            'Device Network',
    '/camera':                 'Field Vision',
    '/alerts':                 'Alert Center',
    '/profile':                'My Profile',
    '/settings':               'System Settings',
    '/reports':                'Farm Reports',
    '/precision-soil-testing': 'Soil Forensics',
    '/crop-advisor':           'AI Field Advisor',
    '/analytics':              'Analytics Hub',
  };

  return (
    <div style={{ height: '100dvh', width: '100vw', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#F8FAFC' }}>
      <TopBar title={titles[location.pathname] || 'AgriSense'} />
      <main ref={mainRef} style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ maxWidth: '500px', margin: '0 auto', width: '100%', paddingBottom: '10px' }}>
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <BottomNav />
      <Sidebar />
    </div>
  );
};

const AppRoutes = () => {
  const { user, isDarkMode } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [isDarkMode]);

  useEffect(() => {
    let listener;
    const initListener = async () => {
      try {
        if (CapApp && typeof CapApp.addListener === 'function') {
          listener = await CapApp.addListener('backButton', () => {
            if (['/dashboard', '/login', '/'].includes(location.pathname)) {
              CapApp.exitApp();
            } else {
              navigate(-1);
            }
          });
        }
      } catch (e) {
        console.warn("Capacitor listener failed:", e);
      }
    };
    initListener();
    return () => listener?.remove();
  }, [location.pathname, navigate]);

  return (
    <Routes>
      <Route path="/" element={<Splash />} />
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
      <Route path="/dashboard" element={<MainLayout><Dashboard /></MainLayout>} />
      <Route path="/analytics" element={<MainLayout><AnalyticsHub /></MainLayout>} />
      <Route path="/soil-monitoring" element={<MainLayout><SoilMonitor /></MainLayout>} />
      <Route path="/irrigation" element={<MainLayout><IrrigationSystem /></MainLayout>} />
      <Route path="/storage-hub" element={<MainLayout><StorageMonitor /></MainLayout>} />
      <Route path="/camera" element={<MainLayout><VisualMonitor /></MainLayout>} />
      <Route path="/device-area" element={<MainLayout><DeviceManager /></MainLayout>} />
      <Route path="/alerts" element={<MainLayout><AlertCenter /></MainLayout>} />
      <Route path="/reports" element={<MainLayout><Reports /></MainLayout>} />
      <Route path="/profile" element={<MainLayout><Profile /></MainLayout>} />
      <Route path="/settings" element={<MainLayout><Settings /></MainLayout>} />
      <Route path="/weather" element={<MainLayout><WeatherMonitor /></MainLayout>} />
      <Route path="/precision-soil-testing" element={<MainLayout><SoilForensics /></MainLayout>} />
      <Route path="/crop-advisor" element={<MainLayout><FarmAdvisor /></MainLayout>} />
      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
    </Routes>
  );
};

export default function App() {
  return (
    <AppProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AppProvider>
  );
}
