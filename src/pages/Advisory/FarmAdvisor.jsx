import React, { useState } from 'react';
import { motion } from 'framer-motion';
import TalkMode from './TalkMode';
import AdvisorMode from './AdvisorMode';

const COLORS = {
  primary: '#10B981',
  primaryDark: '#059669',
  background: '#F8FAFC',
};

const FarmAdvisorWrapper = () => {
  const [mode, setMode] = useState('talk'); // 'talk' or 'advisor'

  return (
    <div style={{ background: COLORS.background, minHeight: '100dvh', display: 'flex', flexDirection: 'column', fontFamily: "'Outfit', sans-serif" }}>
      {/* 🌟 MINIMALIST HEADER WITH IOS-STYLE TOGGLE */}
      <div style={{ 
        padding: '20px', background: 'white', borderBottom: '1px solid #E2E8F0', 
        display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0,
        position: 'sticky', top: 0, zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span 
            style={{ 
              fontSize: '1.2rem', 
              fontWeight: mode === 'talk' ? 600 : 400, 
              color: mode === 'talk' ? '#0F172A' : '#94A3B8', 
              cursor: 'pointer', 
              transition: 'color 0.2s' 
            }} 
            onClick={() => setMode('talk')}
          >
            Talk
          </span>
          
          <div 
            onClick={() => setMode(mode === 'talk' ? 'advisor' : 'talk')}
            style={{ 
              width: '64px', height: '34px', borderRadius: '17px', 
              border: `2.5px solid ${COLORS.primary}`, 
              background: 'white',
              position: 'relative', cursor: 'pointer',
              display: 'flex', alignItems: 'center', padding: '2px',
              boxSizing: 'border-box'
            }}
          >
            <motion.div 
              animate={{ x: mode === 'advisor' ? 30 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              style={{
                width: '25px', height: '25px', borderRadius: '50%',
                background: COLORS.primaryDark,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            />
          </div>

          <span 
            style={{ 
              fontSize: '1.2rem', 
              fontWeight: mode === 'advisor' ? 600 : 400, 
              color: mode === 'advisor' ? '#0F172A' : '#94A3B8', 
              cursor: 'pointer', 
              transition: 'color 0.2s' 
            }} 
            onClick={() => setMode('advisor')}
          >
            Advisor
          </span>
        </div>
      </div>

      {/* 🚀 MODE CONTENT */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {mode === 'talk' ? <TalkMode /> : <AdvisorMode />}
      </div>
    </div>
  );
};

export default FarmAdvisorWrapper;
