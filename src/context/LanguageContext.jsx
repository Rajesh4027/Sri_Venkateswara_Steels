import { createContext, useContext, useState, useEffect } from 'react';
import { LANG_KEY, t as translateHelper } from '../i18n';

const LanguageContext = createContext({
  lang: 'en',
  setLang: () => {},
  toggleLang: () => {},
  t: (key, params) => key
});

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      return localStorage.getItem(LANG_KEY) || 'en';
    } catch (e) {
      return 'en';
    }
  });

  const setLang = (newLang) => {
    const validLang = newLang === 'ta' ? 'ta' : 'en';
    setLangState(validLang);
    try {
      localStorage.setItem(LANG_KEY, validLang);
    } catch (e) { }
  };

  const toggleLang = () => {
    setLang(lang === 'en' ? 'ta' : 'en');
  };

  useEffect(() => {
    try {
      document.documentElement.lang = lang;
      document.documentElement.setAttribute('data-lang', lang);
      if (document.body) {
        document.body.setAttribute('data-lang', lang);
        if (lang === 'ta') {
          document.body.classList.add('lang-ta');
        } else {
          document.body.classList.remove('lang-ta');
        }
      }
    } catch (e) { }
  }, [lang]);

  // Helper function bound to current language
  const t = (key, params) => translateHelper(key, lang, params);

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      lang: 'en',
      setLang: () => {},
      toggleLang: () => {},
      t: (key) => key
    };
  }
  return context;
}

export const useTranslation = useLanguage;
