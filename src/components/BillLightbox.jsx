import { useState, useRef, useEffect, useCallback } from 'react';
import Ic from './Icon';

export default function BillLightbox({ src, title, inv, supplier, onClose }) {
  if (!src) return null;

  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const dragStartRef = useRef({ x: 0, y: 0 });
  const posRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);
  const containerRef = useRef(null);

  posRef.current = pos;

  // Reset zoom & position
  const handleReset = useCallback((e) => {
    if (e) e.stopPropagation();
    setScale(1);
    setRotation(0);
    setPos({ x: 0, y: 0 });
  }, []);

  // Zoom In (+25%, max 4x)
  const handleZoomIn = useCallback((e) => {
    if (e) e.stopPropagation();
    setScale(prev => Math.min(4, +(prev + 0.25).toFixed(2)));
  }, []);

  // Zoom Out (-25%, min 0.5x)
  const handleZoomOut = useCallback((e) => {
    if (e) e.stopPropagation();
    setScale(prev => {
      const next = Math.max(0.5, +(prev - 0.25).toFixed(2));
      if (next <= 1) setPos({ x: 0, y: 0 });
      return next;
    });
  }, []);

  // Rotate 90 degrees clockwise
  const handleRotate = useCallback((e) => {
    if (e) e.stopPropagation();
    setRotation(prev => (prev + 90) % 360);
  }, []);

  // Mouse wheel zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY < 0 ? 0.2 : -0.2;
    setScale(prev => {
      const next = Math.min(4, Math.max(0.5, +(prev + delta).toFixed(2)));
      if (next <= 1) setPos({ x: 0, y: 0 });
      return next;
    });
  }, []);

  // Click on image to toggle zoom
  const handleImageClick = (e) => {
    e.stopPropagation();
    if (hasMovedRef.current) {
      hasMovedRef.current = false;
      return;
    }
    if (scale <= 1) {
      setScale(1.75);
    } else {
      handleReset();
    }
  };

  // Drag to pan when zoomed
  const handleMouseDown = (e) => {
    if (scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    hasMovedRef.current = false;
    dragStartRef.current = {
      x: e.clientX - posRef.current.x,
      y: e.clientY - posRef.current.y
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    hasMovedRef.current = true;
    setPos({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      } else if (e.key === '0') {
        handleReset();
      } else if (e.key === 'r' || e.key === 'R') {
        handleRotate();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handleZoomIn, handleZoomOut, handleReset, handleRotate]);

  // Attach non-passive wheel listener
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Bill Preview"
      style={{
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'rgba(11, 27, 51, 0.92)',
        backdropFilter: 'blur(8px)'
      }}
    >
      {/* Lightbox Header */}
      <div
        className="lightbox-head"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: '#fff',
          padding: '14px 20px',
          background: 'rgba(0, 0, 0, 0.4)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
          zIndex: 10
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: 'var(--gold2, #F59E0B)', fontWeight: 800, letterSpacing: '.04em' }}>
            TAX INVOICE ATTACHMENT · {inv || 'ORIGINAL RECEIPT'}
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>
            {supplier || title || 'Attached Bill Image'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <a
            href={src}
            download={`Invoice-${inv || 'Receipt'}.jpg`}
            className="btn sm"
            style={{
              background: 'rgba(255,255,255,0.15)',
              color: '#fff',
              borderColor: 'rgba(255,255,255,0.3)',
              fontWeight: 700,
              gap: 6
            }}
            target="_blank"
            rel="noreferrer"
            onClick={e => e.stopPropagation()}
          >
            <Ic n="download" s={14} /> Download Image
          </a>
          <button
            type="button"
            className="ib"
            style={{
              background: 'rgba(255,255,255,0.18)',
              color: '#fff',
              borderColor: 'rgba(255,255,255,0.3)',
              width: 36,
              height: 36,
              cursor: 'pointer'
            }}
            onClick={onClose}
            aria-label="Close"
          >
            <Ic n="x" s={18} />
          </button>
        </div>
      </div>

      {/* Lightbox Body with Drag and Wheel Zoom */}
      <div
        ref={containerRef}
        className="lightbox-body"
        onClick={onClose}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
          cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
        }}
      >
        <img
          src={src}
          alt={title || 'Invoice preview'}
          onClick={handleImageClick}
          draggable={false}
          style={{
            maxWidth: '90%',
            maxHeight: '80vh',
            objectFit: 'contain',
            borderRadius: 8,
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.65)',
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale}) rotate(${rotation}deg)`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.16s ease-out',
            cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
            pointerEvents: 'auto'
          }}
          title={scale > 1 ? 'Click to zoom out or drag to pan' : 'Click to zoom in'}
        />
      </div>

      {/* Floating Modern Zoom & View Controls Toolbar */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(12px)',
          padding: '6px 14px',
          borderRadius: 30,
          border: '1.5px solid rgba(255, 255, 255, 0.22)',
          boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Zoom Out Button */}
        <button
          type="button"
          onClick={handleZoomOut}
          disabled={scale <= 0.5}
          style={{
            background: 'transparent',
            border: 'none',
            color: scale <= 0.5 ? 'rgba(255,255,255,0.3)' : '#fff',
            cursor: scale <= 0.5 ? 'not-allowed' : 'pointer',
            padding: '6px 8px',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            transition: 'all 0.15s ease'
          }}
          title="Zoom Out (-)"
        >
          <Ic n="zoomOut" s={18} />
        </button>

        {/* Current Zoom Percentage Badge (Click to Reset) */}
        <button
          type="button"
          onClick={handleReset}
          style={{
            background: 'rgba(255, 255, 255, 0.14)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            color: '#fff',
            borderRadius: 16,
            padding: '3px 10px',
            fontSize: 12,
            fontWeight: 800,
            cursor: 'pointer',
            minWidth: 54,
            textAlign: 'center',
            letterSpacing: '.02em'
          }}
          title="Click to reset zoom (100%)"
        >
          {Math.round(scale * 100)}%
        </button>

        {/* Zoom In Button */}
        <button
          type="button"
          onClick={handleZoomIn}
          disabled={scale >= 4}
          style={{
            background: 'transparent',
            border: 'none',
            color: scale >= 4 ? 'rgba(255,255,255,0.3)' : '#fff',
            cursor: scale >= 4 ? 'not-allowed' : 'pointer',
            padding: '6px 8px',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            transition: 'all 0.15s ease'
          }}
          title="Zoom In (+)"
        >
          <Ic n="zoomIn" s={18} />
        </button>

        <div style={{ width: 1, height: 18, background: 'rgba(255, 255, 255, 0.25)', margin: '0 4px' }} />

        {/* Reset / Fit View Button */}
        <button
          type="button"
          onClick={handleReset}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            padding: '6px 8px',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 12,
            fontWeight: 700
          }}
          title="Reset to original fit (0)"
        >
          <Ic n="maximize" s={16} /> Fit
        </button>

        {/* Rotate Button */}
        <button
          type="button"
          onClick={handleRotate}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            padding: '6px 8px',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 12,
            fontWeight: 700
          }}
          title="Rotate 90° clockwise (R)"
        >
          <Ic n="rotateCw" s={16} /> Rotate
        </button>

        <div style={{ width: 1, height: 18, background: 'rgba(255, 255, 255, 0.25)', margin: '0 4px' }} />

        {/* User Tip */}
        <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.7)', padding: '0 6px', fontWeight: 500 }}>
          💡 Click / Scroll to zoom · Drag to pan
        </span>
      </div>
    </div>
  );
}
