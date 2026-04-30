import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../state/AppContext';
import { 
  User, Shield, CheckCircle2, 
  Edit3, Bell, Cpu, Brain, Sun, Moon, 
  Settings2, Heart, AlertCircle, Phone,
  Terminal, ChevronRight, Zap, Power,
  RefreshCw, Droplets, Network, Activity,
  Camera, MapPin
} from 'lucide-react';

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────
const COLORS = {
  primary: '#10B981',   // Green (Healthy/Online)
  secondary: '#3B82F6', // Blue (Process)
  warning: '#F59E0B',   // Yellow (Warning)
  danger: '#EF4444',    // Red (Critical)
  offline: '#94A3B8',   // Grey (Offline)
  text: '#0F172A',
  subtext: '#64748B',
  bg: '#F8FAFC',
  border: 'rgba(0,0,0,0.06)'
};

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────

const SectionHeader = ({ title, icon: Icon, color = COLORS.primary }) => (
  <h3 style={{ 
    fontSize: '0.65rem', fontWeight: 800, color: COLORS.subtext, 
    marginBottom: '8px', display: 'flex', alignItems: 'center', 
    gap: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' 
  }}>
    <Icon size={12} color={color} /> {title}
  </h3>
);

const ControlCard = ({ children, padding = '12px' }) => (
  <div style={{ 
    background: 'white', borderRadius: '14px', padding,
    border: `1px solid ${COLORS.border}`, marginBottom: '16px'
  }}>
    {children}
  </div>
);

const ActionButton = ({ icon: Icon, label, onClick, color = COLORS.secondary, active = false }) => (
  <motion.button
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
      padding: '12px 8px', borderRadius: '12px', background: active ? `${color}15` : 'white',
      border: `1px solid ${active ? color : COLORS.border}`, cursor: 'pointer',
      transition: '0.2s'
    }}
  >
    <Icon size={18} color={active ? color : COLORS.subtext} />
    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: active ? color : COLORS.text }}>{label}</span>
  </motion.button>
);

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────

const Profile = () => {
  const { 
    user, updateUser, logout,
    isDarkMode, toggleTheme, farmHealthScore,
    profileMeta, updateProfileMeta, farmInfo
  } = useApp();
  
  const [formData, setFormData] = useState({ 
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    location: user?.location || '',
    photo: user?.photo || 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=200'
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const handleSave = () => {
    updateUser(formData);
    alert("Profile Saved Successfully!");
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 400;
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          setFormData(prev => ({ ...prev, photo: compressedBase64 }));
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGPSDetect = async () => {
    setIsLocating(true);
    try {
      let latitude, longitude;

      try {
        const { Geolocation } = await import('@capacitor/geolocation');
        const permissions = await Geolocation.checkPermissions();
        if (permissions.location !== 'granted') {
          const req = await Geolocation.requestPermissions();
          if (req.location !== 'granted') throw new Error("Permission Denied");
        }
        const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      } catch (capErr) {
        // Fallback to standard web navigator
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
        });
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      }
      
      // Perform Reverse Geocoding to get actual city/village name
      let placeName = "Unknown Area";
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'AgriSense/17.1.0 (Contact: admin@agrisense.tech)'
          }
        });
        if (response.ok) {
          const data = await response.json();
          // Fallback cascade to find the most accurate locality name
          if (data.address) {
            placeName = data.address.neighbourhood || data.address.suburb || data.address.village || data.address.town || data.address.city || data.address.county || data.address.state || "Local Field";
          } else if (data.display_name) {
            placeName = data.display_name.split(',')[0];
          }
        }
      } catch (err) {
        console.error("Reverse geocoding failed", err);
      }

      setFormData(prev => ({ 
        ...prev, 
        location: `${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E • ${placeName}` 
      }));
    } catch (err) {
      console.error(err);
      alert("Unable to retrieve location from device GPS. Please check location settings.");
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <div style={{ background: COLORS.bg, minHeight: '100%', paddingBottom: '0' }}>
      
      {/* 1. COMPACT IDENTITY HEADER */}
      <div style={{ 
        padding: '32px 20px 24px', background: 'white', 
        borderBottom: `1px solid ${COLORS.border}`,
        textAlign: 'center'
      }}>
        <div style={{ position: 'relative', width: '90px', height: '90px', margin: '0 auto 16px' }}>
          <img 
            src={formData.photo} 
            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: `3px solid ${COLORS.primary}20` }} 
          />
          <label style={{ position: 'absolute', bottom: 0, right: 0, width: '28px', height: '28px', borderRadius: '50%', background: COLORS.primary, border: '3px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Camera size={14} color="white" />
            <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
          </label>
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: COLORS.text, margin: '0 0 4px' }}>
          {formData.name || 'Guest Farmer'}
        </h2>
        <p style={{ fontSize: '0.75rem', color: COLORS.subtext, fontWeight: 600, margin: 0 }}>
          {formData.email || 'Set your email address'}
        </p>
      </div>

      <div style={{ padding: '16px' }}>
        
        {/* 2. EDITABLE IDENTITY FIELDS */}
        <SectionHeader title="User Identity" icon={User} />
        <ControlCard>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { label: 'Full Name', value: formData.name, key: 'name', icon: User },
              { label: 'Email Address', value: formData.email, key: 'email', icon: Bell },
              { label: 'Phone Number', value: formData.phone, key: 'phone', icon: Phone }
            ].map((field, i) => (
              <div key={i}>
                <label style={{ fontSize: '0.6rem', fontWeight: 800, color: COLORS.subtext, textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>{field.label}</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text" 
                    value={field.value}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    style={{ 
                      width: '100%', padding: '10px 12px', borderRadius: '10px', 
                      background: '#F8FAFC', border: `1px solid ${COLORS.border}`,
                      fontSize: '0.85rem', fontWeight: 600, color: COLORS.text, outline: 'none'
                    }}
                  />
                </div>
              </div>
            ))}
            
            <div>
              <label style={{ fontSize: '0.6rem', fontWeight: 800, color: COLORS.subtext, textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Farm Location</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  style={{ 
                    flex: 1, padding: '10px 12px', borderRadius: '10px', 
                    background: '#F8FAFC', border: `1px solid ${COLORS.border}`,
                    fontSize: '0.85rem', fontWeight: 600, color: COLORS.text, outline: 'none'
                  }}
                  placeholder="Set your farm location"
                />
                <button 
                  onClick={handleGPSDetect}
                  disabled={isLocating}
                  style={{ padding: '0 12px', borderRadius: '10px', background: `${COLORS.secondary}10`, border: `1px solid ${COLORS.secondary}30`, color: COLORS.secondary, cursor: 'pointer', opacity: isLocating ? 0.5 : 1 }}
                >
                  <motion.div animate={isLocating ? { rotate: 360 } : {}} transition={isLocating ? { repeat: Infinity, duration: 1 } : {}}>
                    <MapPin size={18} />
                  </motion.div>
                </button>
              </div>
            </div>

            <button 
              onClick={handleSave}
              style={{ width: '100%', padding: '14px', borderRadius: '12px', background: COLORS.primary, color: 'white', border: 'none', fontWeight: 800, fontSize: '0.9rem', marginTop: '8px', cursor: 'pointer', boxShadow: `0 4px 12px ${COLORS.primary}30` }}
            >
              SAVE CHANGES
            </button>
          </div>
        </ControlCard>

        {/* VERSION */}
        <div style={{ textAlign: 'center', opacity: 0.2, marginTop: '20px' }}>
          <p style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.1em' }}>AGRISENSE v{farmInfo?.version || "2.8.0"}</p>
        </div>

      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default Profile;
