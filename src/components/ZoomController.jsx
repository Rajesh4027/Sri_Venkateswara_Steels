import { useState, useEffect, useCallback } from 'react';
import Ic from './Icon';
import { useLanguage } from '../context/LanguageContext';

const ZOOM_LEVELS = [75, 80, 85, 90, 95, 100, 105, 110, 115, 125, 135, 150];
const STORAGE_KEY = 'svs_app_zoom_pct';

export default function ZoomController({ toast, style = {}, compact = false }) {
  const { t, lang } = useLanguage();

  const [zoom, setZoomState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && !isNaN(Number(saved))) {
        const val = Number(saved);
        if (val >= 60 && val <= 180) return val;
      }
    } catch (e) { }
    return 100;
  });

  const applyZoom = useCallback((pct) => {
    try {
      const factor = pct / 100;

      // 1. Apply zoom strictly to root html element
      document.documentElement.style.zoom = `${pct}%`;

      // 2. Clear any body-level zoom to avoid compounding or viewport gaps
      if (document.body) {
        document.body.style.zoom = '';
      }

      // 3. Set dynamic CSS variables for flexible 100% viewport height compensation
      // When zoomed out (e.g. 90%), (100 / 0.9)vh = 111.1111vh.
      // In 90% coordinates, 111.1111vh * 0.9 = 100vh physical screen height!
      // This guarantees ZERO bottom gap under sidebar and content at any zoom level.
      const compensatedVh = `${(100 / factor).toFixed(4)}vh`;
      document.documentElement.style.setProperty('--app-zoom-factor', String(factor));
      document.documentElement.style.setProperty('--app-vh', compensatedVh);

      localStorage.setItem(STORAGE_KEY, String(pct));
    } catch (e) { }
  }, []);

  // Initialize zoom on component mount
  useEffect(() => {
    applyZoom(zoom);
  }, [applyZoom, zoom]);

  const handleZoomChange = (newPct) => {
    const clamped = Math.min(150, Math.max(70, newPct));
    setZoomState(clamped);
    applyZoom(clamped);
    if (toast && (clamped === 100 || clamped === 75 || clamped === 125 || clamped === 150)) {
      toast(`Zoom: ${clamped}%`);
    }
  };

  const handleZoomIn = () => {
    const next = ZOOM_LEVELS.find(lvl => lvl > zoom) || Math.min(150, zoom + 10);
    handleZoomChange(next);
  };

  const handleZoomOut = () => {
    const prev = [...ZOOM_LEVELS].reverse().find(lvl => lvl < zoom) || Math.max(70, zoom - 10);
    handleZoomChange(prev);
  };

  const handleReset = () => {
    handleZoomChange(100);
  };

  // Keyboard shortcuts: Ctrl + '=', Ctrl + '-', Ctrl + '0'
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.ctrlKey && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        handleZoomIn();
      } else if (e.ctrlKey && e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.ctrlKey && e.key === '0') {
        e.preventDefault();
        handleReset();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [zoom]);

  const isDefault = zoom === 100;

  return (
    <div
      className="zoom-controller-widget no-print"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: '#ffffff',
        border: isDefault ? '1.5px solid var(--line)' : '1.5px solid #F59E0B',
        borderRadius: 9999,
        padding: compact ? '2px' : '3px 4px',
        boxShadow: isDefault
          ? '0 1px 3px rgba(11, 27, 51, 0.06)'
          : '0 2px 8px rgba(245, 158, 11, 0.22)',
        gap: compact ? 1 : 2,
        userSelect: 'none',
        transition: 'all 0.2s ease',
        ...style
      }}
      title="Zoom controls: Click [-] / [+] or use Ctrl + / Ctrl - / Ctrl 0 to reset"
      aria-label="Screen Zoom In and Zoom Out controls"
    >
      {/* Zoom Out Button */}
      <button
        type="button"
        onClick={handleZoomOut}
        disabled={zoom <= 70}
        style={{
          width: compact ? 18 : 26,
          height: compact ? 22 : 26,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'none',
          borderRadius: '50%',
          color: zoom <= 70 ? '#CBD5E1' : 'var(--navy)',
          cursor: zoom <= 70 ? 'not-allowed' : 'pointer',
          padding: 0,
          transition: 'background 0.15s, color 0.15s',
          outline: 'none'
        }}
        onMouseEnter={e => { if (zoom > 70) e.currentTarget.style.background = '#F1F5F9'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        title="Zoom Out (Ctrl -)"
        aria-label="Zoom Out"
      >
        <Ic n="zoomOut" s={compact ? 12 : 14} />
      </button>

      {/* Current Zoom Percentage Pill / Reset Button */}
      <button
        type="button"
        onClick={handleReset}
        style={{
          background: isDefault ? '#F8FAFC' : '#FEF3C7',
          color: isDefault ? 'var(--navy)' : '#B45309',
          border: 'none',
          borderRadius: 99,
          padding: compact ? '2px 5px' : '2px 8px',
          fontSize: compact ? 10.5 : 11.5,
          fontWeight: 800,
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          cursor: 'pointer',
          letterSpacing: '0.01em',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 2,
          minWidth: compact ? 34 : 44,
          justifyContent: 'center',
          transition: 'all 0.15s ease',
          outline: 'none'
        }}
        title={isDefault ? 'Default 100% Zoom (Ctrl 0)' : 'Click to reset zoom back to 100% (Ctrl 0)'}
        aria-label={`Current Zoom: ${zoom}%. Click to reset.`}
      >
        <span>{zoom}%</span>
        {!isDefault && (
          <span style={{ fontSize: compact ? 8 : 9, opacity: 0.8 }}>↺</span>
        )}
      </button>

      {/* Zoom In Button */}
      <button
        type="button"
        onClick={handleZoomIn}
        disabled={zoom >= 150}
        style={{
          width: compact ? 18 : 26,
          height: compact ? 22 : 26,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'none',
          borderRadius: '50%',
          color: zoom >= 150 ? '#CBD5E1' : 'var(--navy)',
          cursor: zoom >= 150 ? 'not-allowed' : 'pointer',
          padding: 0,
          transition: 'background 0.15s, color 0.15s',
          outline: 'none'
        }}
        onMouseEnter={e => { if (zoom < 150) e.currentTarget.style.background = '#F1F5F9'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        title="Zoom In (Ctrl +)"
        aria-label="Zoom In"
      >
        <Ic n="zoomIn" s={compact ? 12 : 14} />
      </button>
    </div>
  );
}

