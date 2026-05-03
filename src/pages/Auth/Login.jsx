import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApp } from '../../state/AppContext';
import { Leaf, Lock, Mail, ShieldCheck, User as UserIcon } from 'lucide-react';
import { auth, googleProvider, signInWithPopup, signInWithCredential, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from '../../firebase';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

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
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const { setUser, language, changeLanguage, t } = useApp();
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (isSignUp) {
        const trimmedName = name.trim();
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: trimmedName });
        // Immediately update context with the real name (don't wait for onAuthStateChanged)
        setUser(prev => ({ ...(prev || {}), name: trimmedName, email, uid: userCredential.user.uid, isGuest: false }));
        navigate('/dashboard');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        navigate('/dashboard');
      }
    } catch (error) {
      console.error(error);
      const code = error.code || '';
      if (code === 'auth/email-already-in-use') {
        setErrorMsg('An account with this email already exists. Please sign in instead.');
      } else if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setErrorMsg('Incorrect email or password. Please try again.');
      } else if (code === 'auth/weak-password') {
        setErrorMsg('Password must be at least 6 characters long.');
      } else if (code === 'auth/invalid-email') {
        setErrorMsg('Please enter a valid email address.');
      } else {
        setErrorMsg(error.message.replace('Firebase: ', '').replace(/\(auth\/.*\)\.?/, '').trim());
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      if (window.Capacitor?.isNativePlatform()) {
        const result = await FirebaseAuthentication.signInWithGoogle();
        const credential = GoogleAuthProvider.credential(result.credential?.idToken);
        await signInWithCredential(auth, credential);
        navigate('/dashboard');
      } else {
        await signInWithPopup(auth, googleProvider);
        navigate('/dashboard');
      }
    } catch (error) {
      console.error(error);
      setErrorMsg(error.message ? error.message.replace('Firebase: ', '') : 'Google Sign-In failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    setUser({ email: 'guest@agrisense.io', name: 'Guest Farmer', location: 'Field Zone A', isGuest: true });
    navigate('/dashboard');
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
      
      {/* LANGUAGE SELECTOR */}
      <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', gap: '8px', zIndex: 10 }}>
        <button 
          onClick={() => changeLanguage('en')} 
          style={{ background: language === 'en' ? COLORS.primary : 'rgba(255,255,255,0.1)', color: 'white', border: `1px solid ${COLORS.primary}`, padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, transition: '0.2s' }}
        >
          English
        </button>
        <button 
          onClick={() => changeLanguage('bn')} 
          style={{ background: language === 'bn' ? COLORS.primary : 'rgba(255,255,255,0.1)', color: 'white', border: `1px solid ${COLORS.primary}`, padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, transition: '0.2s' }}
        >
          বাংলা
        </button>
      </div>

      {/* BRANDING SECTION */}
      <motion.div 
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{ textAlign: 'center', marginBottom: '2rem' }}
      >
        <div style={{ 
          width: '70px', 
          height: '70px', 
          borderRadius: '20px', 
          background: 'rgba(255, 255, 255, 0.04)', 
          border: `1px solid ${COLORS.cardBorder}`,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          margin: '0 auto 1rem',
          boxShadow: '0 12px 30px rgba(0,0,0,0.2)'
        }}>
          <Leaf size={36} color={COLORS.primary} strokeWidth={1.5} />
        </div>
        
        <h1 style={{ color: COLORS.textMain, fontSize: '2.2rem', fontWeight: 600, margin: 0, letterSpacing: '-0.02em' }}>
          AgriSense
        </h1>
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
        <div style={{ textAlign: 'center', marginBottom: '1.5rem', color: COLORS.textMain, fontSize: '1.2rem', fontWeight: 600 }}>
          {isSignUp ? t('create_account') : t('welcome_back')}
        </div>

        {errorMsg && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#FCA5A5', padding: '12px', borderRadius: '12px', fontSize: '0.8rem', marginBottom: '1.5rem', textAlign: 'center' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleAuth}>
          
          {/* NAME FIELD (Only for Sign Up) */}
          {isSignUp && (
            <div style={{ marginBottom: '1.2rem' }}>
              <div style={{ position: 'relative' }}>
                <UserIcon size={18} color={COLORS.textMuted} style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="text" 
                  placeholder={t('full_name')} 
                  value={name} 
                  required
                  onChange={e => setName(e.target.value)}
                  style={{ width: '100%', height: '54px', background: COLORS.inputBg, border: `1px solid ${COLORS.cardBorder}`, borderRadius: '18px', paddingLeft: '52px', color: COLORS.textMain, fontSize: '0.95rem', outline: 'none' }} 
                />
              </div>
            </div>
          )}

          {/* EMAIL FIELD */}
          <div style={{ marginBottom: '1.2rem' }}>
            <div style={{ position: 'relative' }}>
              <Mail size={18} color={COLORS.textMuted} style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="email" 
                placeholder={t('email_address')} 
                value={email} 
                required
                onChange={e => setEmail(e.target.value)}
                style={{ width: '100%', height: '54px', background: COLORS.inputBg, border: `1px solid ${COLORS.cardBorder}`, borderRadius: '18px', paddingLeft: '52px', color: COLORS.textMain, fontSize: '0.95rem', outline: 'none' }} 
              />
            </div>
          </div>

          {/* PASSWORD FIELD */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color={COLORS.textMuted} style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="password" 
                placeholder={t('password')} 
                value={password} 
                required
                onChange={e => setPassword(e.target.value)}
                style={{ width: '100%', height: '54px', background: COLORS.inputBg, border: `1px solid ${COLORS.cardBorder}`, borderRadius: '18px', paddingLeft: '52px', color: COLORS.textMain, fontSize: '0.95rem', outline: 'none' }} 
              />
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <motion.button 
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            style={{ 
              width: '100%', height: '54px', borderRadius: '18px', 
              background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`, 
              border: 'none', color: '#FFFFFF', fontWeight: 600, fontSize: '1rem', 
              cursor: loading ? 'not-allowed' : 'pointer', marginBottom: '1rem', opacity: loading ? 0.7 : 1,
              boxShadow: '0 8px 20px -6px rgba(16, 185, 129, 0.3)' 
            }}
          >
            {loading ? t('processing') : (isSignUp ? t('create_account_btn') : t('sign_in'))}
          </motion.button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '1rem 0' }}>
          <div style={{ flex: 1, height: '1px', background: COLORS.cardBorder }} />
          <span style={{ padding: '0 10px', color: COLORS.textMuted, fontSize: '0.8rem', fontWeight: 600 }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: COLORS.cardBorder }} />
        </div>

        {/* GOOGLE LOGIN */}
        <motion.button 
          whileTap={{ scale: 0.98 }}
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{ 
            width: '100%', height: '54px', borderRadius: '18px', 
            background: '#FFFFFF', border: 'none', color: '#333333', 
            fontWeight: 600, fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            marginBottom: '1.5rem', opacity: loading ? 0.7 : 1
          }}
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '20px' }} />
          {t('continue_google')}
        </motion.button>

        {/* TOGGLE SIGN UP / SIGN IN */}
        <div style={{ textAlign: 'center', fontSize: '0.9rem', color: COLORS.textMuted }}>
          {isSignUp ? t('already_have_account') : t('dont_have_account')}{' '}
          <span 
            onClick={() => { setIsSignUp(!isSignUp); setErrorMsg(''); }}
            style={{ color: COLORS.primary, fontWeight: 700, cursor: 'pointer' }}
          >
            {isSignUp ? t('sign_in') : t('sign_up')}
          </span>
        </div>

        {/* SECONDARY ACTION */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button 
            type="button" 
            onClick={handleGuestLogin}
            style={{ 
              background: 'transparent', border: 'none', color: COLORS.textMuted, 
              fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', transition: '0.2s color'
            }}
            onMouseOver={e => e.currentTarget.style.color = COLORS.textMain}
            onMouseOut={e => e.currentTarget.style.color = COLORS.textMuted}
          >
            {t('skip_guest')}
          </button>
        </div>

      </motion.div>

      {/* SECURE HELPER TEXT */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2rem', color: COLORS.textMuted, fontSize: '0.8rem', opacity: 0.7 }}>
        <ShieldCheck size={16} />
        <span>Firebase Secured Auth</span>
      </div>

    </div>
  );
};

export default Login;

