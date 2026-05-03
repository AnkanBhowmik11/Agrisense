import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../state/AppContext';
import { 
  FileText, Download, RefreshCw, FileCheck, Loader2,
  CheckCircle2, ChevronDown, FileSearch, Sprout, Archive, Calendar
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { fetchGroqChat } from '../Advisory/TalkMode';

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

const Reports = () => {
  const { dailyAnalyticsReports, setDailyAnalyticsReports, activeField, user, analyticsSnapshotsByField } = useApp();
  
  const fieldReports = dailyAnalyticsReports?.[activeField?.id] || {};
  const availableDates = Object.keys(fieldReports).sort((a, b) => new Date(b) - new Date(a));
  
  const [selectedDate, setSelectedDate] = useState(availableDates[0] || null);
  const [genStep, setGenStep] = useState(0); 
  const [isForceGenerating, setIsForceGenerating] = useState(false);

  useEffect(() => {
    setSelectedDate(availableDates[0] || null);
    setGenStep(0);
  }, [activeField?.id, availableDates.length]);

  const activeReport = selectedDate ? fieldReports[selectedDate] : null;

  const steps = [
    { label: 'Idle', detail: 'Ready for Synthesis' },
    { label: 'Accessing Archive', detail: 'Retrieving 24-Hour Telemetry...' },
    { label: 'Neural Reconstruction', detail: 'Processing Groq Summary...' },
    { label: 'Audit Formatting', detail: 'Structuring Master Document...' },
    { label: 'Archive Complete', detail: 'Historical Document Ready.' }
  ];

  const handleGenerate = () => {
    if (!activeReport) {
      alert("No archive selected.");
      return;
    }
    setGenStep(1);
    setTimeout(() => {
      setGenStep(2);
      setTimeout(() => {
        setGenStep(3);
        setTimeout(() => setGenStep(4), 1000);
      }, 1000);
    }, 1000);
  };

  const handleForceGenerate = async () => {
    if (!activeField) return;
    setIsForceGenerating(true);
    
    try {
      const snapshots = analyticsSnapshotsByField?.[activeField.id] || [];
      const prompt = `Please provide a 5-line summary of the daily agricultural telemetry for a field growing ${activeField.crop || 'crops'}. Based on ${snapshots.length} snapshots collected today. Keep it extremely brief and use bullet points.`;
      
      const aiResponse = await fetchGroqChat([{ role: 'user', content: prompt }]);
      const lines = aiResponse.split('\n').map(l => l.replace(/^- /, '').trim()).filter(Boolean);

      const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
      const newReport = {
        date: todayStr,
        generatedAt: new Date().toISOString(),
        snapshotCount: snapshots.length,
        lines,
        entries: snapshots
      };

      setDailyAnalyticsReports(prev => ({
        ...prev,
        [activeField.id]: {
          ...(prev[activeField.id] || {}),
          [todayStr]: newReport
        }
      }));
      setSelectedDate(todayStr);
    } catch (e) {
      console.error(e);
      alert('Failed to generate test report.');
    } finally {
      setIsForceGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!activeReport) return;
    const doc = new jsPDF();
    const dateStr = new Date(activeReport.generatedAt).toLocaleString();
    
    doc.setFontSize(22); 
    doc.setTextColor(16, 185, 129); 
    doc.text('AGRI SENSE DAILY ARCHIVE REPORT', 14, 22);
    
    doc.setFontSize(10); 
    doc.setTextColor(100); 
    doc.text(`FIELD: ${activeField?.name || 'Unknown'} | CROP: ${activeField?.crop || 'N/A'}`, 14, 30);
    doc.text(`AUTHORITY: ${user?.name?.toUpperCase() || 'FARMER'}`, 14, 35);
    doc.text(`ARCHIVE DATE: ${activeReport.date} | TIMESTAMP: ${dateStr}`, 14, 40);
    
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text('AI NEURAL SUMMARY (GROQ)', 14, 52);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    const splitText = doc.splitTextToSize((activeReport.lines || []).join(' '), 180);
    doc.text(splitText, 14, 60);

    const avg = (arr) => {
      const vals = arr.filter((v) => typeof v === 'number');
      if (!vals.length) return '--';
      return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
    };

    const entries = activeReport.entries || [];
    const moistureAvg = avg(entries.map(e => e.soil?.moisture));
    const tempAvg = avg(entries.map(e => e.weather?.temp));
    const rainMax = entries.length ? Math.max(...entries.map(e => e.weather?.rainLevel || 0)) : '--';

    doc.autoTable({
      startY: 65 + (splitText.length * 5),
      head: [['Metric', '24H Valuation', 'Status Indicator']],
      body: [
        ['Avg Soil Moisture', `${moistureAvg}%`, 'Archived'], 
        ['Avg Ambient Temp', `${tempAvg} °C`, 'Archived'], 
        ['Max Rain Level', `${rainMax} mm`, 'Archived'],
        ['Total Snapshots', `${activeReport.snapshotCount || entries.length}`, 'Complete']
      ],
      theme: 'grid', headStyles: { fillStyle: [16, 185, 129] }
    });

    doc.save(`AgriSense_${activeField?.name?.replace(/\s+/g, '_')}_Archive_${activeReport.date}.pdf`);
  };

  return (
    <div style={{ padding: '1.25rem', background: COLORS.bg, minHeight: '100vh', paddingBottom: '100px', fontFamily: "'Outfit', sans-serif" }}>
      
      <header style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 950, color: COLORS.text, margin: 0 }}>Farm Archives & Audits</h2>
        <p style={{ color: COLORS.subtext, fontSize: '0.8rem', fontWeight: 700, marginTop: '2px' }}>Access and generate historical PDF reports.</p>
      </header>

      {/* ⏱️ ARCHIVES FOR FIELD */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'white', borderRadius: '12px', border: `1px solid ${COLORS.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <Sprout size={16} color={COLORS.primary} />
          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: COLORS.text }}>{activeField?.name || 'No Field Active'}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        
        {/* ARCHIVE LIST SIDEBAR */}
        <div style={{ flex: '1 1 250px', background: 'white', borderRadius: '24px', padding: '1.25rem', border: `1px solid ${COLORS.border}` }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 900, color: COLORS.subtext, textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Archive size={16} /> Past 24H Archives
          </h3>
          
          {availableDates.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: COLORS.subtext, fontSize: '0.8rem', fontWeight: 600 }}>
              No daily reports generated yet. Reports run automatically at midnight.
              <div style={{ marginTop: '1rem' }}>
                <button 
                  onClick={handleForceGenerate} 
                  disabled={isForceGenerating || !activeField}
                  style={{ padding: '10px 16px', borderRadius: '12px', background: COLORS.primary, color: 'white', border: 'none', fontWeight: 800, cursor: isForceGenerating ? 'wait' : 'pointer', fontSize: '0.8rem' }}
                >
                  {isForceGenerating ? <Loader2 size={14} className="animate-spin" /> : 'Force Run Daily Synthesis'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {availableDates.map(date => (
                <div 
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  style={{
                    padding: '12px', borderRadius: '14px', cursor: 'pointer',
                    background: selectedDate === date ? `${COLORS.primary}10` : '#F8FAFC',
                    border: `1px solid ${selectedDate === date ? COLORS.primary : COLORS.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={16} color={selectedDate === date ? COLORS.primary : COLORS.subtext} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: selectedDate === date ? COLORS.primary : COLORS.text }}>{date}</span>
                  </div>
                  {selectedDate === date && <CheckCircle2 size={16} color={COLORS.primary} />}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MAIN ENGINE & PREVIEW */}
        <div style={{ flex: '2 1 500px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* GENERATION ENGINE HUD */}
          <motion.div
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
            style={{ 
              background: 'white', borderRadius: '32px', padding: '2rem', textAlign: 'center', 
              border: `1px solid ${COLORS.border}`, boxShadow: '0 10px 30px rgba(0,0,0,0.02)'
            }}
          >
             <div style={{ width: '70px', height: '70px', borderRadius: '24px', background: `${COLORS.primary}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                {genStep === 0 || genStep === 4 ? (
                  <FileCheck size={32} color={COLORS.primary} />
                ) : (
                  <Loader2 size={32} color={COLORS.primary} className="animate-spin" />
                )}
             </div>

             <h4 style={{ fontSize: '1.2rem', fontWeight: 950, color: COLORS.text, marginBottom: '6px' }}>
               {activeReport ? steps[genStep].label : 'No Archive Selected'}
             </h4>
             <p style={{ fontSize: '0.8rem', fontWeight: 700, color: COLORS.subtext, marginBottom: '2rem' }}>
               {activeReport ? steps[genStep].detail : 'Select a date to generate a report.'}
             </p>

             {genStep === 0 && activeReport && (
                <motion.button whileTap={{ scale: 0.96 }} onClick={handleGenerate} style={{ width: '100%', height: '58px', borderRadius: '20px', background: COLORS.primary, border: 'none', color: 'white', fontWeight: 950, fontSize: '1rem', boxShadow: `0 12px 30px ${COLORS.primary}30`, cursor: 'pointer' }}>
                   OPEN ARCHIVE DOCUMENT
                </motion.button>
             )}

             {genStep > 0 && genStep < 4 && (
                <div style={{ width: '100%', height: '8px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                   <motion.div initial={{ width: 0 }} animate={{ width: `${(genStep / 4) * 100}%` }} style={{ height: '100%', background: COLORS.primary }} />
                </div>
             )}

             {genStep === 4 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                   <motion.button whileTap={{ scale: 0.95 }} onClick={handleDownload} style={{ cursor: 'pointer', height: '54px', borderRadius: '16px', background: COLORS.primary, color: 'white', border: 'none', fontWeight: 950, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><Download size={18} /> DOWNLOAD PDF</motion.button>
                   <motion.button whileTap={{ scale: 0.95 }} onClick={() => setGenStep(0)} style={{ cursor: 'pointer', height: '54px', borderRadius: '16px', background: 'white', border: `1px solid ${COLORS.border}`, color: COLORS.subtext, fontWeight: 950, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><RefreshCw size={18} /> CLOSE DOCUMENT</motion.button>
                </div>
             )}
          </motion.div>

          {/* REPORT PREVIEW */}
          <div style={{ 
            background: 'white', borderRadius: '32px', minHeight: '300px', 
            border: `1px solid ${COLORS.border}`, boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
            position: 'relative', overflow: 'hidden'
          }}>
             <div style={{ padding: '2.5rem', filter: genStep === 4 ? 'none' : 'blur(5px)', opacity: genStep === 4 ? 1 : 0.3, transition: '0.5s' }}>
                <div style={{ borderBottom: `2px solid ${COLORS.border}`, paddingBottom: '1.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                   <div>
                     <h2 style={{ fontSize: '1rem', fontWeight: 950, color: COLORS.text, margin: 0 }}>DAILY ARCHIVE: {activeReport?.date}</h2>
                     <p style={{ fontSize: '0.65rem', fontWeight: 800, color: COLORS.subtext, margin: 0, marginTop: '4px' }}>FIELD: {activeField?.name?.toUpperCase()}</p>
                   </div>
                   <div style={{ textAlign: 'right' }}>
                     <p style={{ fontSize: '0.7rem', fontWeight: 950, margin: 0 }}>{activeReport ? new Date(activeReport.generatedAt).toLocaleTimeString() : '--:--'}</p>
                     <p style={{ fontSize: '0.6rem', fontWeight: 800, color: COLORS.subtext, margin: 0 }}>UID: {user?.uid?.substring(0,6) || 'SYS'}</p>
                   </div>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                   <h5 style={{ fontSize: '0.7rem', fontWeight: 950, color: COLORS.primary, marginBottom: '1rem', textTransform: 'uppercase' }}>24-Hour Telemetry Synopsis</h5>
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div style={{ padding: '1rem', background: '#F8FAFC', borderRadius: '12px' }}>
                        <p style={{ fontSize: '0.6rem', fontWeight: 800, color: COLORS.subtext, margin: 0 }}>TOTAL DATA POINTS</p>
                        <p style={{ fontSize: '1.2rem', fontWeight: 950, margin: '4px 0 0 0' }}>{activeReport?.snapshotCount || 0}</p>
                      </div>
                      <div style={{ padding: '1rem', background: '#F8FAFC', borderRadius: '12px' }}>
                        <p style={{ fontSize: '0.6rem', fontWeight: 800, color: COLORS.subtext, margin: 0 }}>ARCHIVE STATUS</p>
                        <p style={{ fontSize: '1.2rem', fontWeight: 950, color: COLORS.primary, margin: '4px 0 0 0' }}>LOCKED</p>
                      </div>
                   </div>
                </div>

                <div>
                   <h5 style={{ fontSize: '0.7rem', fontWeight: 950, color: COLORS.primary, marginBottom: '1rem', textTransform: 'uppercase' }}>AI Neural Summary (Groq)</h5>
                   <div style={{ fontSize: '0.8rem', lineHeight: 1.6, fontWeight: 700, color: COLORS.text }}>
                      {activeReport ? (
                        <ul style={{ paddingLeft: '20px', margin: 0 }}>
                          {(activeReport.lines || []).map((line, idx) => (
                            <li key={idx} style={{ marginBottom: '6px' }}>{line}</li>
                          ))}
                        </ul>
                      ) : (
                        'No archive data to display.'
                      )}
                   </div>
                </div>

                <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <div style={{ width: '40px', height: '40px', background: '#0F172A', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <FileText size={20} color="white" />
                   </div>
                   <p style={{ fontSize: '0.6rem', fontWeight: 950, color: COLORS.subtext }}>AUTHORIZED SYSTEM DOCUMENT</p>
                </div>
             </div>

             {genStep < 4 && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(2px)' }}>
                   <div style={{ background: 'white', padding: '14px 24px', borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Loader2 size={20} color={COLORS.primary} className="animate-spin" />
                      <span style={{ fontSize: '0.85rem', fontWeight: 950, color: COLORS.text }}>
                        {genStep === 0 ? 'AWAITING USER' : 'DECRYPTING ARCHIVE...'}
                      </span>
                   </div>
                </div>
             )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
};

export default Reports;
