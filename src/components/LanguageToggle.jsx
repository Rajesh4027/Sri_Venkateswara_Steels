import { useLanguage } from '../context/LanguageContext';

/**
 * LanguageToggle Component
 * Placed beside the Software Version Alert button on the top-right corner.
 * Allows instant switching between English and Tamil with localStorage persistence.
 */
export default function LanguageToggle({ style = {}, compact = false }) {
  const { lang, setLang } = useLanguage();

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => setLang(lang === 'en' ? 'ta' : 'en')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          background: '#FFFDF5',
          border: '1.5px solid #FDE68A',
          borderRadius: 9999,
          padding: '3px 8px',
          color: '#92400E',
          fontSize: 11,
          fontWeight: 800,
          cursor: 'pointer',
          boxShadow: '0 1px 3px rgba(245, 158, 11, 0.12)',
          outline: 'none',
          transition: 'all 0.18s ease',
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          ...style
        }}
        title={`Current: ${lang === 'en' ? 'English' : 'தமிழ்'}. Click to switch language.`}
        aria-label="Toggle English / Tamil"
      >
        <span style={{ color: lang === 'en' ? '#0B1B33' : '#B45309', fontWeight: lang === 'en' ? 900 : 600 }}>EN</span>
        <span style={{ opacity: 0.4, fontSize: 10 }}>/</span>
        <span style={{ color: lang === 'ta' ? '#0B1B33' : '#B45309', fontWeight: lang === 'ta' ? 900 : 600 }}>த</span>
      </button>
    );
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: '#FFFDF5',
        border: '1.5px solid #FDE68A',
        borderRadius: 9999,
        padding: '3px 4px',
        gap: 3,
        boxShadow: '0 1px 3px rgba(245, 158, 11, 0.12)',
        ...style
      }}
      title="Switch Language / மொழியை மாற்றுக (English / தமிழ்)"
      aria-label="Language Switcher"
    >
      {/* Globe Icon */}
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 2px 0 6px',
          color: '#D97706',
          fontSize: 13
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      </span>

      {/* English Option */}
      <button
        type="button"
        onClick={() => setLang('en')}
        style={{
          border: 'none',
          borderRadius: 9999,
          padding: '4px 10px',
          fontSize: 12,
          fontWeight: 800,
          cursor: 'pointer',
          background: lang === 'en' ? '#0B1B33' : 'transparent',
          color: lang === 'en' ? '#FFFFFF' : '#92400E',
          boxShadow: lang === 'en' ? '0 2px 6px rgba(11, 27, 51, 0.25)' : 'none',
          transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
          outline: 'none',
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
        }}
        aria-pressed={lang === 'en'}
      >
        English
      </button>

      {/* Tamil Option */}
      <button
        type="button"
        onClick={() => setLang('ta')}
        style={{
          border: 'none',
          borderRadius: 9999,
          padding: '4px 10px',
          fontSize: 12,
          fontWeight: 800,
          cursor: 'pointer',
          background: lang === 'ta' ? '#0B1B33' : 'transparent',
          color: lang === 'ta' ? '#FFFFFF' : '#92400E',
          boxShadow: lang === 'ta' ? '0 2px 6px rgba(11, 27, 51, 0.25)' : 'none',
          transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
          outline: 'none',
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
        }}
        aria-pressed={lang === 'ta'}
      >
        தமிழ்
      </button>
    </div>
  );
}
