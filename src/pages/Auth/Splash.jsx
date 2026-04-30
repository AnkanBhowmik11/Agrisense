import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Leaf } from 'lucide-react';

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────
const COLORS = {
  primary: '#10B981', // Professional Emerald Green
  background: 'linear-gradient(160deg, #064E3B 0%, #022C22 100%)', // Deep forest teal/green
  containerBg: 'rgba(255, 255, 255, 0.03)',
  containerBorder: 'rgba(255, 255, 255, 0.1)',
  textMain: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.5)',
};

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────

const Splash = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Artificial delay to allow user to experience the splash screen
    const timer = setTimeout(() => {
      navigate('/login');
    }, 4000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div style={{ 
      height: '100dvh', 
      width: '100vw', 
      background: COLORS.background,
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      position: 'relative', 
      overflow: 'hidden',
      fontFamily: "'Outfit', sans-serif"
    }}>
      
      {/* CENTRAL LOGO SECTION */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        transform: 'translateY(-2rem)' // Slight upward shift for visual balance
      }}>
        
        {/* LOGO CONTAINER - Soft rounded square with subtle depth */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          style={{ 
            width: '110px', 
            height: '110px', 
            borderRadius: '28px', 
            background: COLORS.containerBg, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backdropFilter: 'blur(12px)', 
            border: `1px solid ${COLORS.containerBorder}`,
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)', 
            marginBottom: '2.5rem'
          }}
        >
          <Leaf size={52} color={COLORS.primary} strokeWidth={1.5} />
        </motion.div>

        {/* BRANDING - Clean and professional typography */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 1 }}
          style={{ textAlign: 'center' }}
        >
          <h1 style={{ 
            color: COLORS.textMain, 
            fontSize: '2.8rem', 
            fontWeight: 600, 
            margin: 0, 
            letterSpacing: '-0.02em' 
          }}>
            AgriSense
          </h1>
          <p style={{ 
            color: COLORS.textMuted, 
            marginTop: '0.6rem', 
            fontWeight: 400, 
            fontSize: '1rem', 
            letterSpacing: '0.01em' 
          }}>
            Precision Farming Platform
          </p>
        </motion.div>
      </div>

      {/* LOADING INDICATOR - Minimal and low contrast */}
      <div style={{ 
        position: 'absolute', 
        bottom: '80px', 
        width: '100%', 
        maxWidth: '200px', 
        textAlign: 'center' 
      }}>
         <div style={{ 
           marginBottom: '16px',
           color: COLORS.textMuted,
           fontSize: '0.8rem', 
           fontWeight: 400,
           letterSpacing: '0.02em'
         }}>
           Initializing system
         </div>
         
         <div style={{ 
           width: '100%', 
           height: '2px', 
           background: 'rgba(255,255,255,0.06)', 
           borderRadius: '10px', 
           overflow: 'hidden' 
         }}>
            <motion.div 
              initial={{ width: 0 }} 
              animate={{ width: '100%' }} 
              transition={{ duration: 3.5, ease: 'easeInOut' }}
              style={{ 
                height: '100%', 
                background: COLORS.primary,
                opacity: 0.8
              }} 
            />
         </div>
      </div>
      
      {/* FOOTER - Versioning */}
      <div style={{ position: 'absolute', bottom: '30px', color: 'rgba(255,255,255,0.2)', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.1em' }}>
        AGRISENSE PRO • v17.1.0
      </div>

    </div>
  );
};

export default Splash;

