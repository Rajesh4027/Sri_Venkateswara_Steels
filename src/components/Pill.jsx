import { useLanguage } from '../context/LanguageContext';

export default function Pill({ s }) {
  const { t } = useLanguage();
  const label = s === 'ok'
    ? t('pillInStock')
    : s === 'low'
      ? t('pillLowStock')
      : t('pillOutOfStock');

  return <span className={'pill ' + s}>{label}</span>;
}
