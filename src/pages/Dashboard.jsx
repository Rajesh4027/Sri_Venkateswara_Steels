import { useMemo } from 'react';
import { fmt, inr, dt, pct, getMaterialDisplayName } from '../utils';
import Ic from '../components/Icon';
import { useLanguage } from '../context/LanguageContext';

export default function Dashboard({ items, bills, inwardInvoices = [], categories = [], go, open, openInwardModal }) {
  const { t, lang } = useLanguage();
  const low = items.filter(i => i.status !== 'ok').sort((a, b) => (a.stock / (a.min || 1)) - (b.stock / (b.min || 1)));
  const value = items.reduce((s, i) => s + Math.max(0, i.stock) * i.rate, 0);
  const totalStockKgs = items.reduce((sum, i) => {
    const s = Math.max(0, Number(i.stock || 0));
    const u = (i.uom || '').trim().toUpperCase();
    if (u === 'KGS' || u === 'KG' || u === 'KILOGRAM' || u === 'KILOGRAMS') return sum + s;
    if (u === 'MT' || u === 'TON' || u === 'TONNE' || u === 'TONNES') return sum + (s * 1000);
    if (u === 'GMS' || u === 'GM' || u === 'GRAM' || u === 'GRAMS') return sum + (s / 1000);
    return sum;
  }, 0);

  const catNames = Array.isArray(categories) && categories.length > 0
    ? categories
    : Array.from(new Set(items.map(i => i.cat).filter(Boolean)));
  const cats = catNames.map(c => {
    const a = items.filter(i => i.cat === c);
    return {
      c,
      n: a.length,
      l: a.filter(i => i.status !== 'ok').length
    };
  }).filter(c => c.n > 0);

  // Activity from manual inward invoices and issued bills
  const days = useMemo(() => {
    const m = {};
    inwardInvoices.forEach(x => { if (x.date) m[x.date] = (m[x.date] || 0) + 1; });
    bills.forEach(x => { if (x.date) { const d = x.date.slice(0, 10); m[d] = (m[d] || 0) + 1; } });
    return Object.entries(m).sort();
  }, [inwardInvoices, bills]);

  const mx = Math.max(1, ...days.map(d => d[1]));
  const out = items.filter(i => i.status === 'out').length;
  const invoicesWithImages = inwardInvoices.filter(i => !!i.billImage).length;

  return (
    <div>
      {/* Alert Banner if any items low/out */}
      {low.length > 0 && (
        <div className="alert">
          <span className="dot" />
          <div style={{ flex: 1 }}>
            <b>{t('materialsNeedReordering', { n: low.length })}</b> {t('outOfStockCount', { out, low: low.length - out })}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn sm gold" onClick={openInwardModal}>
              <Ic n="truck" s={14} /> {t('inwardStockUpdate')}
            </button>
            <button className="btn sm red" onClick={() => go('stock', 'low')}>
              {t('reviewNow')}
            </button>
          </div>
        </div>
      )}

      {/* Top KPIs */}
      <div className="kpis">
        <div className="kpi gd">
          <small>{t('stockInHandKgs')}</small>
          <strong>{fmt(totalStockKgs)} KGS</strong>
          <em>
            {totalStockKgs >= 1000
              ? t('availableWeightMt', { w: fmt(+(totalStockKgs / 1000).toFixed(2)) })
              : t('totalAvailableWeight')}
          </em>
        </div>
        <div className="kpi">
          <small>{t('productsInStock')}</small>
          <strong>{items.length}</strong>
          <em>{t('trackedMaterials')}</em>
        </div>
        <div className={'kpi ' + (low.length ? 'warn' : '')}>
          <small>{t('needsReorder')}</small>
          <strong>{low.length}</strong>
          <em>{t('belowMinAlert')}</em>
        </div>
        <div className="kpi">
          <small>{t('totalStockValue')}</small>
          <strong>{inr(Math.round(value))}</strong>
          <em>{t('currentInventoryVal')}</em>
        </div>
        <div className="kpi">
          <small>{t('inwardInvoicesBills')}</small>
          <strong>{inwardInvoices.length} / {bills.length}</strong>
          <em>{t('withAttachedBillPhoto', { n: invoicesWithImages })}</em>
        </div>
      </div>

      {/* Quick Launchpad Buttons */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <button className="btn gold" style={{ padding: '11px 20px', fontSize: 14 }} onClick={() => go('inward-entry')}>
          <Ic n="truck" s={18} /> {t('newInwardStockEntry')}
        </button>
        <button className="btn" style={{ padding: '11px 20px', fontSize: 14, background: 'var(--navy)', color: '#fff', borderColor: 'var(--navy)' }} onClick={() => go('bill')}>
          <Ic n="bill" s={18} /> {t('issueBillDeductStock')}
        </button>
        <button className="btn" style={{ padding: '11px 20px', fontSize: 14 }} onClick={() => go('stock')}>
          <Ic n="box" s={18} /> {t('stockInventoryBtn')}
        </button>
        <button className="btn" style={{ padding: '11px 20px', fontSize: 14 }} onClick={() => go('inward')}>
          <Ic n="inw" s={18} /> {t('inwardRegisterBtn')}
        </button>
      </div>

      {/* Grid: Low Stock Alerts & Stock Health */}
      <div className="grid">
        {/* Left: Low Stock Alerts */}
        <div className="pn">
          <h3>{t('lowStockReorderAlerts')}</h3>
          <div className="hint">{t('lowStockHint')}</div>
          {low.length === 0 ? (
            <div className="empty">
              {items.length === 0
                ? t('noItemsInStock')
                : t('allItemsAboveMin')}
            </div>
          ) : (
            low.slice(0, 9).map(i => {
              const displayName = getMaterialDisplayName(i, lang);
              return (
                <div className="lr" key={i.id}>
                  <div>
                    <b style={{ color: 'var(--navy)' }}>{displayName}</b>
                    <small style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                      <span style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontWeight: 700 }}>{i.id}</span>
                      {lang === 'ta' && i.name && (displayName !== i.name) && (
                        <span style={{ color: 'var(--mut)', fontWeight: 500, opacity: 0.85 }}>• {i.name}</span>
                      )}
                      {lang === 'en' && i.nameTa && (
                        <span style={{ color: 'var(--mut)', fontWeight: 500, opacity: 0.85 }}>• {i.nameTa}</span>
                      )}
                      <span>· {i.cat}</span>
                      {i.hsn ? <span>· HSN {i.hsn}</span> : ''}
                    </small>
                  </div>
                  <div>
                    <div className={'bar ' + i.status}>
                      <i style={{ width: pct(i) + '%' }} />
                    </div>
                    <small>
                      {t('ofMinStock', { s: fmt(i.stock), m: fmt(i.min), u: i.uom })}
                    </small>
                  </div>
                  <button className="btn sm" onClick={() => open(i.id)}>
                    {t('view')}
                  </button>
                </div>
              );
            })
          )}
          {low.length > 9 && (
            <button className="btn sm" style={{ marginTop: 10 }} onClick={() => go('stock', 'low')}>
              {t('seeAllItems', { n: low.length })}
            </button>
          )}
        </div>

        {/* Right: Health by Category & Day Activity */}
        <div className="pn">
          <h3>{t('stockHealthByCategory')}</h3>
          <div className="hint">{t('stockHealthHint')}</div>
          {cats.length === 0 ? (
            <div className="empty" style={{ padding: '24px 0' }}>
              {t('categoriesEmptyHint')}
            </div>
          ) : (
            cats.map(c => (
              <div className="cat" key={c.c}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.c}</span>
                <div className={'bar ' + (c.l ? 'low' : '')}>
                  <i style={{ width: Math.max(8, 100 - (c.l / c.n) * 100) + '%' }} />
                </div>
                <span>{c.l}/{c.n}</span>
              </div>
            ))
          )}

          <h3 style={{ marginTop: 22 }}>{t('materialMovementActivity')}</h3>
          <div className="hint">{t('materialMovementHint')}</div>
          {days.length === 0 ? (
            <div className="mut" style={{ padding: '20px 0', fontSize: 13, textAlign: 'center' }}>
              {t('noTransactionsRecorded')}
            </div>
          ) : (
            <div className="days">
              {days.slice(-30).map(([d, n]) => (
                <div key={d} data-t={dt(d) + ': ' + n} style={{ height: (n / mx) * 100 + '%' }} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Dual Panels: Recent Inward Invoices and Recent Issued Bills */}
      <div className="grid">
        {/* Recent Inward Invoices */}
        <div className="pn">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <h3 style={{ margin: 0 }}>{t('recentInwardInvoices')}</h3>
            <button className="btn sm" onClick={() => go('inward')}>{t('viewAll')}</button>
          </div>
          <div className="hint">{t('recentInwardHint')}</div>
          {inwardInvoices.length === 0 ? (
            <div className="empty">
              {t('noInwardInvoicesYet')}{' '}
              <button className="btn gold sm" onClick={() => go('inward-entry')}>
                {t('enterFirstInwardBill')}
              </button>
            </div>
          ) : (
            inwardInvoices.slice(0, 5).map(inv => (
              <div className="lr" key={inv.id} style={{ gridTemplateColumns: '1fr auto auto' }}>
                <div>
                  <b>{inv.supplier}</b>
                  <small>
                    <span className="tag-hsn" style={{ fontSize: 10.5 }}>INV: {inv.inv}</span> · {dt(inv.date)}
                  </small>
                </div>
                <b>{inr(inv.total)}</b>
                {inv.billImage ? (
                  <span className="pill ok" style={{ fontSize: 11 }}>
                    <Ic n="image" s={11} /> {t('billPhotoBadge')}
                  </span>
                ) : (
                  <span className="pill low" style={{ fontSize: 11 }}>{t('recordedBadge')}</span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Recent Issued Bills */}
        <div className="pn">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <h3 style={{ margin: 0 }}>{t('recentIssuedBills')}</h3>
            <div style={{ display: 'flex', gap: 6 }}>
              {bills.length > 0 && (
                <button className="btn sm" onClick={() => go('bills-history')}>
                  {t('allHistoryCount', { n: bills.length })}
                </button>
              )}
              <button className="btn sm gold" onClick={() => go('bill')}>{t('issueBillBtn')}</button>
            </div>
          </div>
          <div className="hint">{t('recentIssuedBillsHint')}</div>
          {bills.length === 0 ? (
            <div className="empty">
              {t('noBillsIssuedYet')}{' '}
              <button className="btn gold sm" onClick={() => go('bill')}>
                {t('issueFirstBill')}
              </button>
            </div>
          ) : (
            bills.slice(0, 5).map(b => (
              <div
                className="lr cl"
                key={b.no}
                style={{ gridTemplateColumns: '1fr auto auto', cursor: 'pointer' }}
                onClick={() => go('bills-history')}
                title={t('clickToViewInHistory')}
              >
                <div>
                  <b style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>{b.no}</b>
                  <small>{b.cust} · {dt(b.date)}</small>
                </div>
                <b>{inr(b.total)}</b>
                <span className="pill ok">
                  {b.pay === 'Cash' ? t('cashPayment') : (b.pay === 'Credit' ? t('creditPayment') : b.pay)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
