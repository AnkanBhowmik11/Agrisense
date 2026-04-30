import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApp } from '../../state/AppContext';
import { Leaf, Lock, Mail, ShieldCheck } from 'lucide-react';

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────
const COLORS = {
  primary: '#10B981', // Emerald Green
  primaryDark: '#059669',
  background: 'linear-gradient(160deg, #064E3B 0%, #022C22 100%)', // Natural agricultural gradient
  cardBg: 'rgba(255, 255, 255, 0.03)',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  inputBg: 'rgba(255, 255, 255, 0.05)',
  textMain: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.5)',
};

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useApp();
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (login(email, password)) {
      navigate('/dashboard');
    } else {
      alert('Access Denied. Please check your credentials.');
    }
  };

  return (
    <div style={{ 
      minHeight: '100dvh', 
      width: '100vw', 
      background: COLORS.background,
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '2rem',
      fontFamily: "'Outfit', sans-serif",
      position: 'relative',
      overflow: 'hidden'
    }}>
      
      {/* BRANDING SECTION */}
      <motion.div 
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{ textAlign: 'center', marginBottom: '3rem' }}
      >
        <div style={{ 
          width: '84px', 
          height: '84px', 
          borderRadius: '22px', 
          background: 'rgba(255, 255, 255, 0.04)', 
          border: `1px solid ${COLORS.cardBorder}`,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          boxShadow: '0 12px 30px rgba(0,0,0,0.2)'
        }}>
          <Leaf size={42} color={COLORS.primary} strokeWidth={1.5} />
        </div>
        
        <h1 style={{ 
          color: COLORS.textMain, 
          fontSize: '2.6rem', 
          fontWeight: 600, 
          margin: 0, 
          letterSpacing: '-0.02em' 
        }}>
          AgriSense
        </h1>
        <p style={{ 
          color: COLORS.textMuted, 
          fontSize: '1rem', 
          fontWeight: 400, 
          marginTop: '0.5rem' 
        }}>
          Smart farming insights
        </p>
      </motion.div>

      {/* LOGIN CARD */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        style={{ 
          width: '100%', 
          maxWidth: '410px', 
          background: COLORS.cardBg, 
          backdropFilter: 'blur(20px)', 
          borderRadius: '36px', 
          border: `1px solid ${COLORS.cardBorder}`,
          padding: '2.5rem',
          boxShadow: '0 30px 60px -12px rgba(0,0,0,0.5)'
        }}
      >
        <form onSubmit={handleLogin}>
          
          {/* EMAIL FIELD */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
              display: 'block', 
              color: COLORS.textMain, 
              fontSize: '0.9rem', 
              fontWeight: 500, 
              marginBottom: '0.8rem',
              opacity: 0.85
            }}>
              Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail 
                size={18} 
                color={COLORS.textMuted} 
                style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)' }} 
              />
              <input 
                type="email" 
                placeholder="Enter email" 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                style={{ 
                  width: '100%', 
                  height: '58px', 
                  background: COLORS.inputBg, 
                  border: `1px solid ${COLORS.cardBorder}`, 
                  borderRadius: '18px', 
                  paddingLeft: '52px', 
                  color: COLORS.textMain, 
                  fontSize: '1rem', 
                  outline: 'none',
                  transition: '0.2s border-color'
                }} 
              />
            </div>
          </div>

          {/* PASSWORD FIELD */}
          <div style={{ marginBottom: '2.2rem' }}>
            <label style={{ 
              display: 'block', 
              color: COLORS.textMain, 
              fontSize: '0.9rem', 
              fontWeight: 500, 
              marginBottom: '0.8rem',
              opacity: 0.85
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock 
                size={18} 
                color={COLORS.textMuted} 
                style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)' }} 
              />
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                style={{ 
                  width: '100%', 
                  height: '58px', 
                  background: COLORS.inputBg, 
                  border: `1px solid ${COLORS.cardBorder}`, 
                  borderRadius: '18px', 
                  paddingLeft: '52px', 
                  color: COLORS.textMain, 
                  fontSize: '1rem', 
                  outline: 'none' 
                }} 
              />
            </div>
          </div>

          {/* SIGN IN BUTTON */}
          <motion.button 
            whileTap={{ scale: 0.98 }}
            type="submit"
            style={{ 
              width: '100%', 
              height: '60px', 
              borderRadius: '18px', 
              background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`, 
              border: 'none', 
              color: '#FFFFFF', 
              fontWeight: 600, 
              fontSize: '1.1rem', 
              cursor: 'pointer', 
              marginBottom: '1.2rem',
              boxShadow: '0 12px 24px -6px rgba(16, 185, 129, 0.3)' 
            }}
          >
            Sign in
          </motion.button>

          {/* SECONDARY ACTION */}
          <button 
            type="button" 
            onClick={() => { if (login('guest', 'guest')) navigate('/dashboard'); }}
            style={{ 
              width: '100%', 
              height: '44px', 
              background: 'transparent', 
              border: 'none', 
              color: COLORS.textMuted, 
              fontSize: '0.95rem', 
              fontWeight: 500, 
              cursor: 'pointer',
              transition: '0.2s color'
            }}
            onMouseOver={e => e.currentTarget.style.color = COLORS.textMain}
            onMouseOut={e => e.currentTarget.style.color = COLORS.textMuted}
          >
            Continue as guest
          </button>

        </form>

        {/* SECURE HELPER TEXT */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: '8px', 
          marginTop: '2.5rem', 
          color: COLORS.textMuted, 
          fontSize: '0.8rem',
          opacity: 0.7
        }}>
          <ShieldCheck size={16} />
          <span>Secure connection</span>
        </div>

      </motion.div>

      {/* VERSION INFO */}
      <div style={{ marginTop: '2rem', color: 'rgba(255,255,255,0.2)', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.1em' }}>
        AGRISENSE PRO • v17.1.0
      </div>

    </div>
  );
};

export default Login;

