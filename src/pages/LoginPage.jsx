import { useState, useEffect } from 'react';
import LOGO from '../assets/logo.png';
import Ic, { RingSpinner } from '../components/Icon';

export default function LoginPage({ users, onLogin, settings }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (isAuthenticating) return;
    setError('');

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanUser) {
      setError('Please enter your username');
      return;
    }
    if (!cleanPass) {
      setError('Please enter your password');
      return;
    }

    // Validate credentials
    const matched = users.find(u => {
      const uName = (u.username || '').toLowerCase();
      const uEmail = (u.email || '').toLowerCase();
      return (uName === cleanUser || uEmail === cleanUser) && String(u.password) === cleanPass;
    });

    if (!matched) {
      setError('Invalid username or password. Please try again.');
      return;
    }

    if (matched.active === false) {
      setError('This operator account has been disabled. Contact admin.');
      return;
    }

    // Start signing-in button animation and enter dashboard
    setIsAuthenticating(true);

    setTimeout(() => {
      onLogin(matched, true);
    }, 1500);
  };

  const handleQuickFill = (user) => {
    if (isAuthenticating) return;
    setUsername(user.username || 'admin');
    setPassword(user.password || '123');
    setError('');
  };

  return (
    <div className="login-split-page">
      {/* ── Left Side: Branded Showcase matching user's reference ── */}
      <div className="login-left-brand">
        {/* Soft floating ambient lighting */}
        <div style={{
          position: 'absolute',
          bottom: '8%',
          right: '12%',
          width: 340,
          height: 340,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(217, 162, 27, 0.3) 0%, rgba(217, 162, 27, 0) 70%)',
          filter: 'blur(45px)',
          pointerEvents: 'none'
        }} />

        <div style={{ maxWidth: 420, textAlign: 'center', position: 'relative', zIndex: 2 }}>
          {/* Large Rounded Logo Card with Gold Glow */}
          <div style={{
            width: 160,
            height: 160,
            borderRadius: 36,
            background: '#ffffff',
            margin: '0 auto 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 20px 48px -10px rgba(217, 162, 27, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.9)',
            border: '2px solid rgba(255, 246, 220, 0.9)'
          }}>
            <img
              src={LOGO}
              alt="Sri Venkateswara Steels"
              style={{
                width: 120,
                height: 120,
                objectFit: 'contain',
                borderRadius: 20
              }}
            />
          </div>

          {/* Company Title */}
          <h1 style={{
            margin: '0 0 6px',
            fontSize: 27,
            fontWeight: 900,
            color: '#111827',
            letterSpacing: '-0.02em',
            lineHeight: 1.2
          }}>
            {settings?.storeName ? settings.storeName.toUpperCase() : 'SRI VENKATESWARA STEELS'}
          </h1>

          {/* Branch Subtitle with accent lines */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            margin: '0 0 20px'
          }}>
            <span style={{ width: 34, height: 1.5, background: 'var(--gold)' }} />
            <span style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '0.12em',
              color: 'var(--gold)',
              textTransform: 'uppercase'
            }}>
              THENI BRANCH &middot; ENTERPRISE ERP
            </span>
            <span style={{ width: 34, height: 1.5, background: 'var(--gold)' }} />
          </div>

          {/* Brand Promise Description */}
          <p style={{
            margin: 0,
            fontSize: 14,
            lineHeight: 1.6,
            color: '#5F6B7A',
            fontWeight: 500
          }}>
            Manage your billing, inward invoices &amp; inventory<br />
            — all in one place. Built for speed.
          </p>
        </div>

        {/* Bottom copyright notice */}
        <div style={{
          position: 'absolute',
          bottom: 24,
          fontSize: 11,
          color: 'rgba(95, 107, 122, 0.75)',
          fontWeight: 600,
          letterSpacing: '0.04em'
        }}>
          &copy; {new Date().getFullYear()} SRI VENKATESWARA STEELS &middot; THENI
        </div>
      </div>

      {/* ── Right Side: Clean Sign In Form ── */}
      <div className="login-right-form">
        <div style={{ width: '100%', maxWidth: 390, margin: '0 auto' }}>
          {/* Sign In Header */}
          <h2 style={{
            margin: '0 0 4px',
            fontSize: 32,
            fontWeight: 800,
            color: '#111827',
            letterSpacing: '-0.025em'
          }}>
            Sign In
          </h2>
          <div style={{
            fontSize: 14,
            color: '#8C96A3',
            marginBottom: 12,
            fontWeight: 500
          }}>
            Access your admin portal
          </div>

          {/* Red Accent Line */}
          <div style={{
            width: 26,
            height: 3,
            background: '#E11D48',
            borderRadius: 99,
            marginBottom: 28
          }} />

          {/* Error Alert Message */}
          {error && (
            <div style={{
              background: '#FDECEA',
              border: '1.5px solid #F87171',
              borderRadius: 12,
              padding: '10px 14px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: '#B91C1C',
              fontSize: 13,
              fontWeight: 600,
              animation: 'fadeIn .18s ease-out'
            }}>
              <Ic n="alertCircle" s={17} />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* USERNAME */}
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#8C96A3',
                marginBottom: 8
              }}>
                USERNAME
              </label>
              <input
                className="in"
                style={{
                  width: '100%',
                  height: 48,
                  borderRadius: 12,
                  border: '1.5px solid #E5E7EB',
                  padding: '0 16px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#111827',
                  background: isAuthenticating ? '#F9FAFB' : '#fff'
                }}
                placeholder="Enter your username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoFocus
                disabled={isAuthenticating}
              />
            </div>

            {/* PASSWORD */}
            <div style={{ marginBottom: 26 }}>
              <label style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#8C96A3',
                marginBottom: 8
              }}>
                PASSWORD
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className="in"
                  type={showPassword ? 'text' : 'password'}
                  style={{
                    width: '100%',
                    height: 48,
                    borderRadius: 12,
                    border: '1.5px solid #E5E7EB',
                    padding: '0 46px 0 16px',
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#111827',
                    background: isAuthenticating ? '#F9FAFB' : '#fff'
                  }}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={isAuthenticating}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#9CA3AF',
                    cursor: 'pointer',
                    display: 'flex',
                    padding: 4
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  disabled={isAuthenticating}
                >
                  <Ic n={showPassword ? 'eyeOff' : 'eye'} s={18} />
                </button>
              </div>
            </div>

            {/* ── LOGIN BUTTON: RED -> BLUE ON HOVER, SOFT RED WITH SPINNER ON CLICK ── */}
            <button
              type="submit"
              className={`btn-portal-action ${isAuthenticating ? 'is-loading' : ''}`}
              disabled={isAuthenticating}
            >
              {isAuthenticating ? (
                <>
                  <RingSpinner s={18} />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <Ic n="arrowRight" s={16} />
                  <span>SIGN INTO PORTAL</span>
                </>
              )}
            </button>
          </form>

          {/* Secure access label under button */}
          <div style={{
            marginTop: 24,
            textAlign: 'center',
            fontSize: 10.5,
            fontWeight: 700,
            color: '#9CA3AF',
            letterSpacing: '0.08em',
            textTransform: 'uppercase'
          }}>
            SECURE ADMIN ACCESS &middot; SRI VENKATESWARA STEELS
          </div>

          {/* Quick Demo Switcher Accounts */}
          <div style={{
            marginTop: 30,
            paddingTop: 18,
            borderTop: '1px dashed #E5E7EB'
          }}>
            <div style={{
              fontSize: 10.5,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#8C96A3',
              marginBottom: 10,
              textAlign: 'center'
            }}>
              Quick Sign In:
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
              {users.map(u => (
                <button
                  key={u.id}
                  type="button"
                  disabled={isAuthenticating}
                  onClick={() => handleQuickFill(u)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 10px',
                    borderRadius: 99,
                    border: '1px solid #E5E7EB',
                    background: '#fff',
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: '#374151',
                    cursor: 'pointer',
                    transition: 'all .14s',
                    opacity: isAuthenticating ? 0.6 : 1
                  }}
                  onMouseEnter={e => {
                    if (!isAuthenticating) {
                      e.currentTarget.style.borderColor = 'var(--gold)';
                      e.currentTarget.style.background = '#FFFDF7';
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#E5E7EB';
                    e.currentTarget.style.background = '#fff';
                  }}
                >
                  <span style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: u.role === 'Admin' ? 'var(--gold)' : 'var(--navy)'
                  }} />
                  <span>{u.name} ({u.role})</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
