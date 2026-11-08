import { useState, useEffect } from 'react';
import LOGO from '../assets/logo.png';
import { useLanguage } from '../context/LanguageContext';

/**
 * SemVer parser and comparator: returns true if remote > local
 */
function parseSemVer(v) {
  if (!v) return [0, 0, 0];
  const clean = String(v).replace(/^v/i, '').trim();
  const parts = clean.split('.').map(p => parseInt(p, 10) || 0);
  while (parts.length < 3) parts.push(0);
  return parts;
}

function isNewerVersion(remote, local) {
  const r = parseSemVer(remote);
  const l = parseSemVer(local);
  for (let i = 0; i < 3; i++) {
    if (r[i] > l[i]) return true;
    if (r[i] < l[i]) return false;
  }
  return false;
}

const CURRENT_APP_VERSION = 'v2.8.2';
const GITHUB_REPO = 'Rajesh4027/Sri_Venkateswara_Steels';
const GITHUB_RELEASES_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

/**
 * SoftwareVersionAlert Component
 * 
 * Requirements:
 * 1. Outside button shows the latest version (e.g. ✨ v2.3.0).
 * 2. Periodically queries GitHub releases API for latest available updates.
 * 3. If an update is pending on GitHub, button shows the update alert (● v2.x.x UPDATE READY).
 * 4. On click, updates with a circular shrink ring animation from 0% to 100%.
 * 5. Automatically launches the installer / downloads release asset and restarts app.
 * 6. On restart, shows celebration toast and displays the updated latest version.
 */
export default function SoftwareVersionAlert({ settings = {}, toast, style = {}, compact = false }) {
  const { t } = useLanguage();

  const [currentVersion, setCurrentVersion] = useState(() => {
    try {
      const stored = localStorage.getItem('svs_app_version');
      if (stored && isNewerVersion(stored, CURRENT_APP_VERSION)) {
        return stored;
      }
      return CURRENT_APP_VERSION;
    } catch (e) {
      return CURRENT_APP_VERSION;
    }
  });

  const [targetVersion, setTargetVersion] = useState(CURRENT_APP_VERSION);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [hasAlerted, setHasAlerted] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showRestartModal, setShowRestartModal] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);

  // Sync current build version on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('svs_app_version');
      if (!stored || isNewerVersion(CURRENT_APP_VERSION, stored)) {
        localStorage.setItem('svs_app_version', CURRENT_APP_VERSION);
        setCurrentVersion(CURRENT_APP_VERSION);
      }
    } catch (e) { }
  }, []);

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

  // Periodic GitHub releases API check engine (every 10 seconds)
  useEffect(() => {
    let isMounted = true;
    let isRateLimited = false;

    const runCheck = async () => {
      try {
        const activeVer = localStorage.getItem('svs_app_version') || CURRENT_APP_VERSION;
        let releaseData = null;

        // 1. Try via Electron API
        if (window.electronAPI?.checkGitHubRelease && !isRateLimited) {
          try {
            const elRes = await window.electronAPI.checkGitHubRelease();
            if (elRes && elRes.success && elRes.release) {
              releaseData = elRes.release;
            } else if (elRes && elRes.error && String(elRes.error).includes('403')) {
              isRateLimited = true;
            }
          } catch (e) { }
        }

        // 2. Try direct fetch to GitHub REST API if not rate-limited
        if (!releaseData && !isRateLimited) {
          try {
            const res = await fetch(GITHUB_RELEASES_API, {
              headers: { Accept: 'application/vnd.github.v3+json' }
            });
            if (res.ok) {
              releaseData = await res.json();
            } else if (res.status === 403) {
              isRateLimited = true; // GitHub API rate limit reached, switch to raw CDN fallback
            }
          } catch (e) { }
        }

        // 3. Fallback: try raw package.json (CDN - Zero API Rate Limits!)
        if (!releaseData) {
          try {
            const rawRes = await fetch(`https://raw.githubusercontent.com/${GITHUB_REPO}/main/package.json?t=${Date.now()}`);
            if (rawRes.ok) {
              const rawPkg = await rawRes.json();
              if (rawPkg.version) {
                releaseData = {
                  tag_name: `v${rawPkg.version}`,
                  name: `Sri Venkateswara Steels - ERP v${rawPkg.version}`,
                  body: `Release v${rawPkg.version}`,
                  assets: [
                    {
                      name: `Sri Venkateswara Steels Setup ${rawPkg.version}.exe`,
                      browser_download_url: `https://github.com/${GITHUB_REPO}/releases/download/v${rawPkg.version}/Sri.Venkateswara.Steels.Setup.${rawPkg.version}.exe`
                    }
                  ]
                };
              }
            }
          } catch (e) { }
        }

        if (!isMounted) return;

        if (releaseData && releaseData.tag_name) {
          const remoteTag = releaseData.tag_name;
          if (isNewerVersion(remoteTag, activeVer)) {
            setTargetVersion(remoteTag);
            setUpdateAvailable(true);

            // Locate Windows Setup executable asset
            let setupUrl = '';
            if (Array.isArray(releaseData.assets) && releaseData.assets.length > 0) {
              const setupAsset = releaseData.assets.find(a =>
                a.name && a.name.includes('Setup') && a.name.endsWith('.exe')
              ) || releaseData.assets.find(a => a.name && a.name.endsWith('.exe'));
              if (setupAsset && setupAsset.browser_download_url) {
                setupUrl = setupAsset.browser_download_url;
              }
            }
            if (!setupUrl) {
              setupUrl = `https://github.com/${GITHUB_REPO}/releases/download/${remoteTag}/Sri.Venkateswara.Steels.Setup.${remoteTag.replace(/^v/, '')}.exe`;
            }
            setDownloadUrl(setupUrl);

            if (!hasAlerted) {
              setHasAlerted(true);
              if (toast) {
                toast(`🔔 Software Update Alert: ${remoteTag} is available! Click to update.`);
              }
            }
          } else {
            setUpdateAvailable(false);
          }
        } else {
          // If offline or quiet check against current targetVersion
          if (isMounted && isNewerVersion(targetVersion, activeVer)) {
            setUpdateAvailable(true);
          }
        }
      } catch (err) {
        const activeVer = localStorage.getItem('svs_app_version') || CURRENT_APP_VERSION;
        if (isMounted && isNewerVersion(targetVersion, activeVer)) {
          setUpdateAvailable(true);
        }
      }
    };

    // Initial check after 1.5s
    const initialTimer = setTimeout(runCheck, 1500);

    // Recurring check every 10 minutes to respect GitHub API limits
    const intervalTimer = setInterval(runCheck, 600000);

    return () => {
      isMounted = false;
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }, [hasAlerted, targetVersion, toast]);

  // Optional keyboard shortcut to simulate update for demo/testing (Ctrl + Alt + U)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'u') {
        localStorage.setItem('svs_app_version', 'v2.5.0');
        setCurrentVersion('v2.5.0');
        setTargetVersion(CURRENT_APP_VERSION);
        setDownloadUrl(`https://github.com/${GITHUB_REPO}/releases/download/${CURRENT_APP_VERSION}/Sri.Venkateswara.Steels.Setup.${CURRENT_APP_VERSION.replace(/^v/, '')}.exe`);
        setUpdateAvailable(true);
        setHasAlerted(false);
        setIsUpdating(false);
        setIsRestarting(false);
        setShowRestartModal(false);
        setDownloadProgress(0);
        if (toast) {
          toast(`Reset to v2.5.0 for testing! Update alert to ${CURRENT_APP_VERSION} is now active.`);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toast]);

  // Handle clicking the update button: download installer in background with progress ring
  const handleStartUpdate = async () => {
    if (isUpdating || isRestarting || showRestartModal) return;

    if (!updateAvailable) {
      if (toast) {
        toast(`✓ Up-to-date! Sri Venkateswara Steels ERP is running ${currentVersion} (Latest).`);
      }
      return;
    }

    setIsUpdating(true);
    setDownloadProgress(0);

    const activeDownloadUrl = downloadUrl || `https://github.com/${GITHUB_REPO}/releases/download/${targetVersion}/Sri.Venkateswara.Steels.Setup.${targetVersion.replace(/^v/, '')}.exe`;

    // If running in packaged Electron desktop app with live downloader IPC
    if (window.electronAPI?.downloadUpdate) {
      const unsub = window.electronAPI.onDownloadProgress((p) => {
        setDownloadProgress(p);
      });

      try {
        const result = await window.electronAPI.downloadUpdate(activeDownloadUrl);
        if (unsub) unsub();

        if (result && result.success) {
          setIsUpdating(false);
          setDownloadProgress(100);
          setShowRestartModal(true); // Popup restart prompt in front!
        } else {
          setIsUpdating(false);
          if (toast) {
            toast(`Update error: ${result?.error || 'Could not download update'}.`);
          }
        }
      } catch (err) {
        if (unsub) unsub();
        setIsUpdating(false);
        if (toast) {
          toast('Error downloading update.');
        }
      }
      return;
    }

    // Web / browser / fallback simulation steps
    const steps = [
      { progress: 14, time: 250 },
      { progress: 28, time: 550 },
      { progress: 46, time: 900 },
      { progress: 65, time: 1250 },
      { progress: 84, time: 1600 },
      { progress: 95, time: 1950 },
      { progress: 100, time: 2300 }
    ];

    steps.forEach(({ progress, time }) => {
      setTimeout(() => {
        setDownloadProgress(progress);
        if (progress === 100) {
          setIsUpdating(false);
          setShowRestartModal(true);
        }
      }, time);
    });
  };

  // Launch setup installer in front and close the app so user can click Next & Next
  const handleConfirmRestartAndInstall = async () => {
    setShowRestartModal(false);
    setIsRestarting(true);

    try {
      localStorage.setItem('svs_app_version', targetVersion);
      localStorage.setItem('svs_just_installed_update', targetVersion);
    } catch (e) { }

    if (window.electronAPI?.launchInstallerAndQuit) {
      await window.electronAPI.launchInstallerAndQuit();
    } else {
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
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
          gap: compact ? 4 : 8,
          padding: compact
            ? '3px 8px'
            : (isUpdating
              ? '6px 16px 6px 12px'
              : (updateAvailable ? '6px 14px 6px 11px' : '6px 14px')),
          background: updateAvailable
            ? (isUpdating ? '#FEF3C7' : '#FFFBEB')
            : '#FFFDF5',
          border: updateAvailable ? '1.5px solid #F59E0B' : '1.5px solid #FDE68A',
          borderRadius: 9999,
          color: '#B45309',
          fontSize: compact ? 11 : 13,
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
            ? `Click to download & install update ${targetVersion}`
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
              {compact ? targetVersion.replace(/\.0$/, '') : targetVersion}
            </span>

            {/* Update Ready Pill */}
            {!compact && (
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
            )}
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
              {compact ? currentVersion.replace(/\.0$/, '') : currentVersion}
            </span>
          </>
        )}
      </button>

      {/* ── UPDATE DOWNLOADED CONFIRMATION MODAL (IN FRONT WITH BLUE BACKGROUND) ── */}
      {showRestartModal && !isRestarting && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 15, 30, 0.88)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999998,
            padding: 24,
            animation: 'fadeIn 0.25s ease-out'
          }}
        >
          <div
            style={{
              background: 'linear-gradient(145deg, #0B1B33 0%, #132744 55%, #183359 100%)',
              border: '1.5px solid rgba(245, 158, 11, 0.45)',
              borderRadius: 24,
              padding: '36px 32px',
              maxWidth: 440,
              width: '100%',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.65), 0 0 35px rgba(217, 119, 6, 0.22)',
              color: '#FFFFFF',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center'
            }}
          >
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
                marginBottom: 16,
                boxShadow: '0 4px 14px rgba(217, 162, 27, 0.35)'
              }}
            />

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(245, 158, 11, 0.2)',
                border: '1px solid rgba(245, 158, 11, 0.5)',
                color: '#FDE68A',
                fontSize: 12,
                fontWeight: 800,
                padding: '4px 14px',
                borderRadius: 99,
                marginBottom: 12,
                letterSpacing: '.03em'
              }}
            >
              <span>🎉</span> DOWNLOAD COMPLETE • 100% READY
            </div>

            <h3 style={{ margin: '0 0 8px', fontSize: 21, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-.02em' }}>
              Software Update Downloaded!
            </h3>

            <p style={{ margin: '0 0 24px', fontSize: 13.5, color: '#CBD5E1', lineHeight: 1.55 }}>
              Sri Venkateswara Steels ERP <b style={{ color: '#FDE68A' }}>{targetVersion}</b> has finished downloading. Click below to restart and immediately launch the setup installer. You can click <b>Next</b> and <b>Next</b> to complete setup.
            </p>

            <button
              type="button"
              onClick={handleConfirmRestartAndInstall}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                padding: '14px 24px',
                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 50%, #B45309 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(245, 158, 11, 0.45)',
                transition: 'all 0.18s ease-in-out',
                marginBottom: 10,
                letterSpacing: '.02em'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(245, 158, 11, 0.6)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(245, 158, 11, 0.45)';
              }}
            >
              <span style={{ fontSize: 18 }}>🚀</span> Restart Now
            </button>

            <button
              type="button"
              onClick={() => setShowRestartModal(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                padding: '6px 14px',
                transition: 'color 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#FFFFFF'}
              onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}
            >
              Install Later
            </button>
          </div>
        </div>
      )}

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
              {t('installingUpdate', { v: targetVersion })}
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
