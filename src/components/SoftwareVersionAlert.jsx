import { useState, useEffect } from 'react';
import LOGO from '../assets/logo.png';
import { useLanguage } from '../context/LanguageContext';

/**
 * SoftwareVersionAlert Component
 * 
 * Requirements:
 * 1. Outside button shows the latest version (e.g. ✨ v2.0.0 or ✨ v2.1.0).
 * 2. If any update is pending, button shows the update alert (● v2.1.0 UPDATE READY).
 * 3. On click, updates with a circular shrink ring animation from 0% to 100%.
 * 4. Automatically installs & restarts the application at 100%.
 * 5. On restart, shows celebration toast and displays the updated latest version.
 */
export default function SoftwareVersionAlert({ settings = {}, toast, style = {} }) {
  const { t } = useLanguage();
  const TARGET_VERSION = 'v2.1.0';

  const [currentVersion, setCurrentVersion] = useState(() => {
    try {
      return localStorage.getItem('svs_app_version') || 'v2.0.0';
    } catch (e) {
      return 'v2.0.0';
    }
  });

  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [hasAlerted, setHasAlerted] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isRestarting, setIsRestarting] = useState(false);

  // Check on initial load if an update was just completed
  useEffect(() => {
    try {
      const justUpdated = localStorage.getItem('svs_just_installed_update');
      if (justUpdated) {
        localStorage.removeItem('svs_just_installed_update');
        if (toast) {
          toast(`🎉 Sri Venkateswara Steels ERP updated to ${justUpdated} successfully! All systems restarted.`);
        }
      }
    } catch (e) { }
  }, [toast]);

  // Periodic 10-second reload / update check engine
  useEffect(() => {
    const runCheck = () => {
      const activeVer = localStorage.getItem('svs_app_version') || 'v2.0.0';
      if (activeVer !== TARGET_VERSION) {
        setUpdateAvailable(true);
        if (!hasAlerted) {
          setHasAlerted(true);
          if (toast) {
            toast(`🔔 Software Update Alert: ${TARGET_VERSION} is available! Click to update.`);
          }
        }
      } else {
        setUpdateAvailable(false);
      }
    };

    // Initial check after 800ms
    const initialTimer = setTimeout(runCheck, 800);

    // Automated 10-second recurring background check interval
    const intervalTimer = setInterval(runCheck, 10000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }, [hasAlerted, toast]);

  // Optional keyboard shortcut to reset demo for testing if needed (Ctrl + Alt + U)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'u') {
        localStorage.setItem('svs_app_version', 'v2.0.0');
        setCurrentVersion('v2.0.0');
        setUpdateAvailable(true);
        setHasAlerted(false);
        setIsUpdating(false);
        setIsRestarting(false);
        setDownloadProgress(0);
        if (toast) {
          toast('Reset to v2.0.0 for testing! Update button is now active.');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toast]);

  // Handle clicking the update button: shrink ring progress animation from 0% to 100%
  const handleStartUpdate = () => {
    if (isUpdating || isRestarting) return;

    if (!updateAvailable) {
      if (toast) {
        toast(`✓ Up-to-date! Sri Venkateswara Steels ERP is running ${currentVersion} (Latest).`);
      }
      return;
    }

    setIsUpdating(true);
    setDownloadProgress(0);

    // Smooth progress steps from 0% to 100% with the circular shrink ring
    const steps = [
      { progress: 14, time: 200 },
      { progress: 28, time: 450 },
      { progress: 46, time: 750 },
      { progress: 65, time: 1050 },
      { progress: 84, time: 1350 },
      { progress: 95, time: 1650 },
      { progress: 100, time: 1950 }
    ];

    steps.forEach(({ progress, time }) => {
      setTimeout(() => {
        setDownloadProgress(progress);
        if (progress === 100) {
          // Transition to Restarting / Installing Overlay
          setTimeout(() => {
            setIsUpdating(false);
            setIsRestarting(true);

            // Persist the updated version
            try {
              localStorage.setItem('svs_app_version', TARGET_VERSION);
              localStorage.setItem('svs_just_installed_update', TARGET_VERSION);
            } catch (e) { }

            // Automatic reload / restart
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          }, 350);
        }
      }, time);
    });
  };

  // Circular progress calculations for the shrink ring (Radius = 9, Circumference = 56.55)
  const ringRadius = 9;
  const ringCircumference = 2 * Math.PI * ringRadius; // ~56.55
  const strokeOffset = ringCircumference - (ringCircumference * downloadProgress) / 100;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* ── Outside Version & Update Button ── */}
      <button
        type="button"
        onClick={handleStartUpdate}
        disabled={isUpdating || isRestarting}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: isUpdating
            ? '6px 16px 6px 12px'
            : (updateAvailable ? '6px 14px 6px 11px' : '6px 14px'),
          background: updateAvailable
            ? (isUpdating ? '#FEF3C7' : '#FFFBEB')
            : '#FFFDF5',
          border: updateAvailable ? '1.5px solid #F59E0B' : '1.5px solid #FDE68A',
          borderRadius: 9999,
          color: '#B45309',
          fontSize: 13,
          fontWeight: 800,
          cursor: isUpdating ? 'wait' : 'pointer',
          boxShadow: updateAvailable
            ? '0 2px 8px rgba(245, 158, 11, 0.24)'
            : '0 1px 3px rgba(245, 158, 11, 0.12)',
          transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
          outline: 'none',
          animation: updateAvailable && !isUpdating ? 'svsGlow 2.4s infinite' : 'none',
          transform: isUpdating ? 'scale(0.97)' : 'scale(1)',
          ...style
        }}
        title={
          updateAvailable
            ? `Click to download & install update ${TARGET_VERSION}`
            : `Sri Venkateswara Steels ERP ${currentVersion} (Latest Release)`
        }
        aria-label="Software update button"
      >
        {isUpdating ? (
          /* ── Shrink Ring Progress Animation (0% to 100%) ── */
          <>
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}
            >
              {/* Background Ring Track */}
              <circle
                cx="12"
                cy="12"
                r={ringRadius}
                stroke="rgba(245, 158, 11, 0.3)"
                strokeWidth="2.8"
                fill="none"
              />
              {/* Filling Progress Stroke Ring */}
              <circle
                cx="12"
                cy="12"
                r={ringRadius}
                stroke="#D97706"
                strokeWidth="2.8"
                fill="none"
                strokeDasharray={ringCircumference}
                strokeDashoffset={strokeOffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.18s ease-out' }}
              />
            </svg>

            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                letterSpacing: '.01em',
                color: '#B45309',
                fontWeight: 800,
                fontSize: 12.5
              }}
            >
              {t('updatingProgress', { p: downloadProgress })}
            </span>
          </>
        ) : updateAvailable ? (
          /* ── Update Available State: Shows Pending Version & Alert Badge ── */
          <>
            {/* Pulsing Alert Indicator Dot */}
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#D97706',
                flexShrink: 0,
                animation: 'svsPulse 1.6s infinite'
              }}
            />

            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                letterSpacing: '.01em'
              }}
            >
              {TARGET_VERSION}
            </span>

            {/* Update Ready Pill */}
            <span
              style={{
                background: '#F59E0B',
                color: '#FFFFFF',
                fontSize: 10,
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: 99,
                letterSpacing: '0.03em',
                textTransform: 'uppercase'
              }}
            >
              {t('updateReadyBadge')}
            </span>
          </>
        ) : (
          /* ── Up-to-Date State: Shows Latest Installed Version ── */
          <>
            {/* Golden Sparkle Star Icon */}
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#D97706"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0 }}
            >
              <path d="M12 2l2.4 7.2 7.6 2.8-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
            </svg>

            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                letterSpacing: '.01em'
              }}
            >
              {currentVersion}
            </span>
          </>
        )}
      </button>

      {/* ── AUTOMATIC INSTALL & RESTART OVERLAY ── */}
      {isRestarting && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(11, 27, 51, 0.94)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999999,
            color: '#FFFFFF',
            textAlign: 'center',
            padding: 24,
            animation: 'fadeIn 0.25s ease-out'
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 24,
              padding: '36px 32px',
              maxWidth: 420,
              width: '100%',
              boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
              color: '#0B1B33',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            {/* Logo */}
            <img
              src={LOGO}
              alt="Sri Venkateswara Steels"
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                objectFit: 'contain',
                background: '#FFF6DC',
                padding: 6,
                border: '1.5px solid #FDE68A',
                marginBottom: 18,
                boxShadow: '0 4px 14px rgba(217, 162, 27, 0.25)'
              }}
            />

            <h3 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: '#0B1B33' }}>
              {t('installingUpdate', { v: TARGET_VERSION })}
            </h3>

            <p style={{ margin: '0 0 20px', fontSize: 13.5, color: '#5F6B7A', lineHeight: 1.5, textAlign: 'center' }}>
              {t('appRestartingDesc')}
            </p>

            {/* Spinner */}
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                border: '3.5px solid #E2E8F0',
                borderTopColor: '#D9A21B',
                animation: 'spin 0.75s linear infinite',
                marginBottom: 16
              }}
            />

            <div
              style={{
                fontSize: 12.5,
                fontWeight: 800,
                color: '#B45309',
                background: '#FEF3C7',
                padding: '6px 16px',
                borderRadius: 99,
                letterSpacing: '.02em'
              }}
            >
              {t('restartingApp')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
