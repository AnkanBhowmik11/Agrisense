import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../state/AppContext';
import { 
  FileText, Download, ShieldCheck, 
  RefreshCw, FileCheck, Loader2,
  Database, Activity, CheckCircle2,
  Lock, Terminal, Clock, FileSearch
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────
const COLORS = {
  primary: '#10B981',
  secondary: '#3B82F6',
  warning: '#F59E0B',
  danger: '#EF4444',
  text: '#1E293B',
  subtext: '#64748B',
  bg: '#F8FAFC',
  border: '#F1F5F9'
};

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────

const Reports = () => {
  const { sensorData, recommendations } = useApp();
  const [genStep, setGenStep] = useState(0); // 0: Idle, 1: Reading, 2: Neural, 3: formatting, 4: Ready
  
  const steps = [
    { label: 'Idle', detail: 'Ready for Synthesis' },
    { label: 'Synchronizing Nodes', detail: 'Reading Regional Telemetry...' },
    { label: 'Neural Processing', detail: 'Extracting Forensic Insights...' },
    { label: 'Audit Formatting', detail: 'Structuring Master Document...' },
    { label: 'Audit Complete', detail: 'Authorized Document Ready.' }
  ];

  const handleGenerate = () => {
    setGenStep(1);
    setTimeout(() => {
      setGenStep(2);
      setTimeout(() => {
        setGenStep(3);
        setTimeout(() => setGenStep(4), 1000);
      }, 1000);
    }, 1000);
  };

  const handleDownload = () => {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleString();
    doc.setFontSize(22); doc.setTextColor(16, 185, 129); doc.text('AGRI SENSE MASTER SYSTEM REPORT', 14, 22);
    doc.setFontSize(10); doc.setTextColor(100); doc.text(`FIELD AG-SYSTEM-Z | LEAD: PROLAYJIT BISWAS`, 14, 30);
    doc.text(`TIMESTAMP: ${dateStr}`, 14, 35);
    doc.autoTable({
      startY: 50,
      head: [['Metric', 'Valuation', 'System Status']],
      body: [['Moisture', `${sensorData?.soil?.moisture || 0}%`, 'Optimal'], ['Nitrogen', `${sensorData?.soil?.npk?.n || 0} ppm`, 'Balanced'], ['Thermal Stress', `${sensorData?.soil?.temp || 0} °C`, 'Normal']],
      theme: 'grid', headStyles: { fillStyle: [16, 185, 129] }
    });
    doc.save(`Agri_Sense_Audit_${new Date().getTime()}.pdf`);
  };

  return (
    <div style={{ padding: '1.25rem', background: COLORS.bg, minHeight: '100vh', paddingBottom: '100px' }}>
      
      <header style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 950, color: COLORS.text, margin: 0 }}>System Reports</h2>
        <p style={{ color: COLORS.subtext, fontSize: '0.8rem', fontWeight: 700, marginTop: '2px' }}>Forensic Audit & Synthesis</p>
      </header>

      {/* 1. GENERATION ENGINE HUD */}
      <motion.div
        initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
        style={{ 
          background: 'white', borderRadius: '32px', padding: '2rem', textAlign: 'center', 
          marginBottom: '2.5rem', border: `1px solid ${COLORS.border}`, boxShadow: '0 10px 30px rgba(0,0,0,0.02)'
        }}
      >
         <div style={{ width: '70px', height: '70px', borderRadius: '24px', background: `${COLORS.primary}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            {genStep === 0 || genStep === 4 ? (
              <FileCheck size={32} color={COLORS.primary} />
            ) : (
              <Loader2 size={32} color={COLORS.primary} className="animate-spin" />
            )}
         </div>

         <h4 style={{ fontSize: '1.2rem', fontWeight: 950, color: COLORS.text, marginBottom: '6px' }}>{steps[genStep].label}</h4>
         <p style={{ fontSize: '0.8rem', fontWeight: 700, color: COLORS.subtext, marginBottom: '2rem' }}>{steps[genStep].detail}</p>

         {genStep === 0 && (
            <motion.button whileTap={{ scale: 0.96 }} onClick={handleGenerate} style={{ width: '100%', height: '58px', borderRadius: '20px', background: COLORS.primary, border: 'none', color: 'white', fontWeight: 950, fontSize: '1rem', boxShadow: `0 12px 30px ${COLORS.primary}30` }}>
               GENERATE MASTER AUDIT
            </motion.button>
         )}

         {genStep > 0 && genStep < 4 && (
            <div style={{ width: '100%', height: '8px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
               <motion.div initial={{ width: 0 }} animate={{ width: `${(genStep / 4) * 100}%` }} style={{ height: '100%', background: COLORS.primary }} />
            </div>
         )}

         {genStep === 4 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
               <motion.button whileTap={{ scale: 0.95 }} onClick={handleDownload} style={{ height: '54px', borderRadius: '16px', background: COLORS.primary, color: 'white', border: 'none', fontWeight: 950, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><Download size={18} /> DOWNLOAD</motion.button>
               <motion.button whileTap={{ scale: 0.95 }} onClick={() => setGenStep(0)} style={{ height: '54px', borderRadius: '16px', background: 'white', border: `1px solid ${COLORS.border}`, color: COLORS.subtext, fontWeight: 950, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><RefreshCw size={18} /> NEW AUDIT</motion.button>
            </div>
         )}
      </motion.div>

      {/* 2. REPORT PREVIEW */}
      <h3 style={{ fontSize: '0.8rem', fontWeight: 950, color: COLORS.text, marginBottom: '1.25rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <FileSearch size={18} color={COLORS.secondary} /> Document Preview
      </h3>
      <div style={{ 
        background: 'white', borderRadius: '32px', minHeight: '400px', 
        border: `1px solid ${COLORS.border}`, boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
        position: 'relative', overflow: 'hidden'
      }}>
         <div style={{ padding: '2.5rem', filter: genStep === 4 ? 'none' : 'blur(5px)', opacity: genStep === 4 ? 1 : 0.3, transition: '0.5s' }}>
            <div style={{ borderBottom: `2px solid ${COLORS.border}`, paddingBottom: '1.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between' }}>
               <div><h2 style={{ fontSize: '1rem', fontWeight: 950, color: COLORS.text, margin: 0 }}>AGRI SENSE MASTER AUDIT</h2><p style={{ fontSize: '0.65rem', fontWeight: 800, color: COLORS.subtext, margin: 0 }}>AUTHORITY: PROLAYJIT BISWAS • NODE-Z</p></div>
               <div style={{ textAlign: 'right' }}><p style={{ fontSize: '0.7rem', fontWeight: 950, margin: 0 }}>{new Date().toLocaleDateString()}</p><p style={{ fontSize: '0.6rem', fontWeight: 800, color: COLORS.subtext, margin: 0 }}>UID: 882-SYS-Z</p></div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
               <h5 style={{ fontSize: '0.7rem', fontWeight: 950, color: COLORS.primary, marginBottom: '1rem', textTransform: 'uppercase' }}>Telemetry Data</h5>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ padding: '1rem', background: '#F8FAFC', borderRadius: '12px' }}><p style={{ fontSize: '0.6rem', fontWeight: 800, color: COLORS.subtext, margin: 0 }}>MOISTURE AVG</p><p style={{ fontSize: '1.2rem', fontWeight: 950, margin: '4px 0 0 0' }}>{sensorData?.soil?.moisture || 45}%</p></div>
                  <div style={{ padding: '1rem', background: '#F8FAFC', borderRadius: '12px' }}><p style={{ fontSize: '0.6rem', fontWeight: 800, color: COLORS.subtext, margin: 0 }}>HEALTH RATING</p><p style={{ fontSize: '1.2rem', fontWeight: 950, color: COLORS.primary, margin: '4px 0 0 0' }}>88/100</p></div>
               </div>
            </div>

            <div>
               <h5 style={{ fontSize: '0.7rem', fontWeight: 950, color: COLORS.primary, marginBottom: '1rem', textTransform: 'uppercase' }}>Neural Summary</h5>
               <p style={{ fontSize: '0.8rem', lineHeight: 1.6, fontWeight: 700, color: COLORS.text }}>
                  All biospheric nodes report stable operational parameters. Moisture levels are within the optimal growth band for Basmati variant. No critical threats detected.
               </p>
            </div>

            <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div style={{ width: '40px', height: '40px', background: COLORS.terminal, borderRadius: '8px' }} />
               <p style={{ fontSize: '0.6rem', fontWeight: 950, color: COLORS.subtext }}>AUTHORIZED SYSTEM DOCUMENT</p>
            </div>
         </div>

         {genStep < 4 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(2px)' }}>
               <div style={{ background: 'white', padding: '14px 24px', borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Loader2 size={20} color={COLORS.primary} className="animate-spin" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 950, color: COLORS.text }}>{genStep === 0 ? 'WAITING' : 'SYNTHESIZING...'}</span>
               </div>
            </div>
         )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
};

export default Reports;
