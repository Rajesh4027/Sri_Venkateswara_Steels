import { useState, useMemo, useRef, Fragment } from 'react';
import { createPortal } from 'react-dom';
import Ic from '../components/Icon';
import LOGO from '../assets/logo.png';

import { inr, fmt, dt, amountInWords, exportToExcel, formatCustomerName, getMaterialDisplayName, getLocalTodayYmd, downloadInvoiceHtml, DEFAULT_SETTINGS } from '../utils';
import { useLanguage } from '../context/LanguageContext';

/**
 * Interactive Material Summary Cell:
 * When hovering over the cell, displays the full list of materials floating IN FRONT
 * via React Portal to document.body, eliminating table clipping and scrollbars completely!
 */
function MaterialSummaryCell({ bill, lang = 'en', items = [] }) {
  const { t } = useLanguage();
  const [showDialog, setShowDialog] = useState(false);
  const [coords, setCoords] = useState(null);
  const cellRef = useRef(null);
  const rows = bill.rows || [];
  const first = rows[0];
  const moreCount = rows.length - 1;

  const handleMouseEnter = () => {
    if (cellRef.current) {
      const rect = cellRef.current.getBoundingClientRect();
      const popupWidth = 560;
      let left = rect.left;
      if (left + popupWidth > window.innerWidth - 20) {
        left = Math.max(10, window.innerWidth - popupWidth - 20);
      }

      const spaceBelow = window.innerHeight - rect.bottom;
      const showAbove = spaceBelow < 260 && rect.top > 260;

      setCoords({
        left,
        top: showAbove ? undefined : rect.bottom + 6,
        bottom: showAbove ? window.innerHeight - rect.top + 6 : undefined,
        showAbove
      });
      setShowDialog(true);
    }
  };

  const handleMouseLeave = () => {
    setShowDialog(false);
  };

  if (!rows.length) {
    return <td className="mut" style={{ fontSize: 12 }}>—</td>;
  }

  const firstDisplayName = getMaterialDisplayName(first, lang, items);

  return (
    <td
      ref={cellRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ cursor: 'pointer' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Primary/First Product */}
        <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, color: 'var(--navy)' }}>
            {firstDisplayName}
          </span>
          <span style={{
            fontSize: 10.5,
            fontWeight: 700,
            background: 'var(--steelbg)',
            color: 'var(--navy2)',
            padding: '1px 6px',
            borderRadius: 4
          }}>
            {first.weight ? `${fmt(first.weight)} ${first.weightUnit || 'KG'}` : `${fmt(first.qty)} ${first.uom || ''}`}
          </span>
        </div>

        {/* If multiple products, show "+X more items" badge with hover hint */}
        {moreCount > 0 && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: '#1D4ED8',
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                padding: '1px 6px',
                borderRadius: 4,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}
              title={t('hoverToViewMaterials')}
            >
              {t('moreProductsBadge', { n: moreCount })} <span style={{ fontSize: 9 }}>▾</span>
            </span>
          </div>
        )}
      </div>

      {/* Floating Dialog Box showing all product details in front via React Portal */}
      {showDialog && coords && createPortal(
        <div
          style={{
            position: 'fixed',
            left: `${coords.left}px`,
            top: coords.top !== undefined ? `${coords.top}px` : undefined,
            bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
            width: 560,
            maxWidth: 'calc(100vw - 30px)',
            background: '#FFFFFF',
            border: '1.5px solid rgba(15, 23, 42, 0.16)',
            borderRadius: 12,
            boxShadow: '0 20px 45px -6px rgba(11, 27, 51, 0.32), 0 10px 20px rgba(0,0,0,0.12)',
            padding: '14px 18px',
            boxSizing: 'border-box',
            zIndex: 9999999,
            pointerEvents: 'none',
            animation: 'popIn 0.15s ease-out'
          }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1.5px solid var(--gold)',
            paddingBottom: 8,
            marginBottom: 10
          }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--navy)' }}>
              {t('dialogAllMaterialsTitle', { no: bill.no, n: rows.length })}
            </div>
            <span style={{ fontSize: 11.5, color: 'var(--mut)', fontWeight: 700 }}>
              {bill.cust}
            </span>
          </div>

          <table style={{ width: '100%', fontSize: 11.5, borderCollapse: 'collapse', tableLayout: 'fixed', boxSizing: 'border-box' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', color: 'var(--mut)', borderBottom: '1px solid var(--line)' }}>
                <th style={{ width: '40%', padding: '6px 8px', textAlign: 'left', fontSize: 10.5 }}>{t('tblMaterial')}</th>
                <th style={{ width: '15%', padding: '6px 8px', textAlign: 'right', fontSize: 10.5 }}>{t('tblQty')}</th>
                <th style={{ width: '15%', padding: '6px 8px', textAlign: 'right', fontSize: 10.5 }}>{t('tblWeight')}</th>
                <th style={{ width: '15%', padding: '6px 8px', textAlign: 'right', fontSize: 10.5 }}>{t('tblRate')}</th>
                <th style={{ width: '15%', padding: '6px 10px', textAlign: 'right', fontSize: 10.5 }}>{t('tblAmount')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const itemDisplayName = getMaterialDisplayName(r, lang, items);
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 600, color: 'var(--navy)', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      {itemDisplayName}
                      {r.size && !itemDisplayName.includes(r.size) && (
                        <span style={{ fontSize: 10, color: 'var(--mut)', display: 'block' }}>Size: {r.size}</span>
                      )}
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {fmt(r.qty)} {r.uom || ''}
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {r.weight ? `${fmt(r.weight)} ${r.weightUnit || 'KG'}` : '-'}
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      ₹{fmt(r.rate)}
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--navy)', whiteSpace: 'nowrap' }}>
                      ₹{fmt(r.amt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{
            marginTop: 10,
            paddingTop: 8,
            borderTop: '1px dashed var(--line)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--navy)',
            paddingLeft: 4,
            paddingRight: 4
          }}>
            <span>{t('tblTotalWeight', { w: fmt(bill.totalWeight || 0) })}</span>
            <span>{t('tblTotalPayable', { p: inr(bill.total) })}</span>
          </div>
        </div>,
        document.body
      )}
    </td>
  );
}

export default function IssuedBillsHistory({
  bills = [],
  setBills,
  items = [],
  setItems,
  settings = {},
  go,
  toast,
  onEditBill
}) {
  const [search, setSearch] = useState('');
  const [filterPay, setFilterPay] = useState('all');
  const [filterDate, setFilterDate] = useState('all'); // Default: show All delivery bills (newest first)
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Modals state
  const [viewBill, setViewBill] = useState(null);
  const [deleteBill, setDeleteBill] = useState(null);
  const [deleteCode, setDeleteCode] = useState('');
  const [typedCode, setTypedCode] = useState('');

  const { t, lang } = useLanguage();

  // ── Date Filtering Helper ──
  const isDateMatch = (b, filter) => {
    if (filter === 'all') return true;
    if (!b) return false;

    const billObj = typeof b === 'object' && b !== null ? b : { date: b };
    const dateStr = billObj.date || billObj.createdAt || '';
    if (!dateStr) return false;

    // Helper to extract local YYYY-MM-DD
    const toLocalYmd = val => {
      if (!val) return '';
      try {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`;
        }
      } catch (e) {}
      return String(val).slice(0, 10);
    };

    const now = new Date();
    const todayStr = getLocalTodayYmd(now);

    const yest = new Date(now.getTime() - 86400000);
    const yesterdayStr = getLocalTodayYmd(yest);

    const billYmd = toLocalYmd(billObj.date);
    const createdYmd = toLocalYmd(billObj.createdAt);

    if (filter === 'today') {
      // 1. Exact match on local today date (either invoice date or creation date)
      if (billYmd === todayStr || createdYmd === todayStr) return true;

      // 2. Real-time fallback: match if generated within the last 24 hours
      try {
        const itemTimestamp = new Date(billObj.createdAt || billObj.date).getTime();
        if (!isNaN(itemTimestamp)) {
          const diffHours = (now.getTime() - itemTimestamp) / (1000 * 60 * 60);
          if (diffHours >= 0 && diffHours <= 24) return true;
        }
      } catch (e) {}
      return false;
    }

    if (filter === 'yesterday') {
      return billYmd === yesterdayStr || createdYmd === yesterdayStr;
    }

    if (filter === 'week') {
      const d = new Date(billObj.date || billObj.createdAt);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const itemDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const diffDays = Math.floor((today - itemDate) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    }

    if (filter === 'month') {
      const d = new Date(billObj.date || billObj.createdAt);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const itemDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const diffDays = Math.floor((today - itemDate) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 30;
    }

    if (filter === 'custom') {
      const targetYmd = billYmd || createdYmd;
      if (fromDate && targetYmd < fromDate) return false;
      if (toDate && targetYmd > toDate) return false;
      return true;
    }

    return true;
  };

  // ── Filtered and Sorted Bills (Default: Newest First) ──
  const filteredBills = useMemo(() => {
    const q = search.trim().toLowerCase();

    return bills.filter(b => {
      // 1. Text Search
      if (q) {
        const matchNo = (b.no || '').toLowerCase().includes(q);
        const matchCust = (b.cust || '').toLowerCase().includes(q);
        const matchProj = (b.project || '').toLowerCase().includes(q);
        const matchPhone = (b.phone || '').toLowerCase().includes(q);
        const matchVeh = (b.veh || '').toLowerCase().includes(q);
        const matchItems = (b.rows || []).some(r =>
          (r.name || '').toLowerCase().includes(q) ||
          (r.rawName || '').toLowerCase().includes(q) ||
          (r.nameTa || '').toLowerCase().includes(q) ||
          (r.hsn || '').includes(q)
        );
        if (!matchNo && !matchCust && !matchProj && !matchPhone && !matchVeh && !matchItems) {
          return false;
        }
      }

      // 2. Payment Mode Filter
      if (filterPay !== 'all') {
        const payStr = (b.pay || '').toLowerCase();
        if (filterPay === 'Cash' && !payStr.includes('cash')) return false;
        if (filterPay === 'UPI' && !payStr.includes('upi')) return false;
        if (filterPay === 'Card' && !payStr.includes('card')) return false;
      }

      // 3. Date Filter
      if (!isDateMatch(b, filterDate)) return false;

      return true;
    }).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [bills, search, filterPay, filterDate, fromDate, toDate]);

  // ── Summary KPI Metrics (Calculates dynamically from filtered results) ──
  const stats = useMemo(() => {
    let totalAmt = 0;
    let cashUpiAmt = 0;
    let creditDebitAmt = 0;
    let lineItemsCount = 0;

    filteredBills.forEach(b => {
      const amt = Number(b.total) || 0;
      totalAmt += amt;
      const p = (b.pay || '').toLowerCase();
      if (p.includes('cash') || p.includes('upi') || p.includes('bank')) {
        cashUpiAmt += amt;
      } else {
        creditDebitAmt += amt;
      }
      lineItemsCount += (b.rows || []).length;
    });

    return {
      count: filteredBills.length,
      totalAmt,
      cashUpiAmt,
      creditDebitAmt,
      lineItemsCount
    };
  }, [filteredBills]);

  // ── Export CSV Ledger ──
  const handleExportCsv = async () => {
    const listToExport = filteredBills.length ? filteredBills : bills;
    if (!listToExport.length) {
      toast('No issued bills available to export');
      return;
    }

    const headers = [
      'Issue Bill No',
      'Date',
      'Customer Name',
      'Contact Phone',
      'Vehicle No',
      'Payment Mode',
      'Material Item',
      'HSN Code',
      'Quantity',
      'Weight (KGS)',
      'Unit',
      'Unit Rate (INR)',
      'GST %',
      'Line Total (INR)',
      'Bill Subtotal',
      'Bill Tax',
      'Bill Grand Total',
      'Issued By'
    ];

    const rows = [];
    listToExport.forEach(b => {
      const billRows = b.rows && b.rows.length ? b.rows : [{ name: '-', hsn: '-', qty: 0, weight: '', uom: '-', rate: 0, gst: 0, amt: 0 }];
      billRows.forEach(r => {
        rows.push([
          `"${b.no || ''}"`,
          `"${dt(b.date)}"`,
          `"${(b.cust || '').replace(/"/g, '""')}"`,
          `"${b.phone || ''}"`,
          `"${b.veh || ''}"`,
          `"${b.pay || ''}"`,
          `"${(r.name || '').replace(/"/g, '""')}"`,
          `"${r.hsn || ''}"`,
          r.qty ?? 0,
          r.weight ?? '',
          `"${r.uom || ''}"`,
          r.rate ?? 0,
          r.gst ?? 0,
          r.amt ?? 0,
          b.sub ?? 0,
          b.tax ?? 0,
          b.total ?? 0,
          `"${b.by || 'Store Incharge'}"`
        ]);
      });
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const safeFilename = `SVS_Issued_Bills_Ledger_${getLocalTodayYmd()}.csv`;

    if (window.electronAPI && typeof window.electronAPI.saveFile === 'function') {
      try {
        const res = await window.electronAPI.saveFile({
          filename: safeFilename,
          content: csvContent
        });
        if (res && (res.success || res.filePath)) {
          toast('Issued bills ledger exported to CSV successfully!');
        }
        return;
      } catch (e) {}
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = safeFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => {
      try { URL.revokeObjectURL(url); } catch (e) {}
    }, 60000);
    toast('Issued bills ledger exported to CSV successfully!');
  };

  // ── Export Delivery History to Microsoft Excel (.csv with UTF-8 BOM) ──
  const handleExportDeliveryExcel = async () => {
    const listToExport = filteredBills.length ? filteredBills : bills;
    if (!listToExport.length) {
      toast('No issued delivery vouchers available to export');
      return;
    }

    const exportRows = [];
    listToExport.forEach((b, idx) => {
      const billRows = (b.rows && b.rows.length) ? b.rows : [{ name: '-', qty: 0, weight: '', uom: '', rate: 0 }];
      const totalItems = billRows.length;

      billRows.forEach((r, itemIdx) => {
        const isFirst = itemIdx === 0;
        const isLast = itemIdx === totalItems - 1;
        const itemText = `${r.name || ''} (${r.weight ? fmt(r.weight) + ' ' + (r.weightUnit || 'KG') : fmt(r.qty) + ' ' + (r.uom || '')} @ ₹${fmt(r.rate || 0)})`.trim();

        exportRows.push({
          'S.No': isFirst ? (idx + 1) : '',
          'Issue Bill No': isFirst ? (b.no || '') : '',
          'Date': isFirst ? (b.date ? dt(b.date) : '') : '',
          'Customer / Contractor': isFirst ? (b.cust || '') : '',
          'Contact Phone': isFirst ? (b.phone || '') : '',
          'Vehicle No': isFirst ? (b.veh || '') : '',
          'Payment Mode': isFirst ? (b.pay || '') : '',
          'Total Line Items': isFirst ? totalItems : '',
          'Total Weight (KGS)': isFirst ? Number(b.totalWeight || 0) : '',
          'Dispatched Materials Summary': itemText,
          'Subtotal (₹)': isLast ? Number(b.sub || 0) : '',
          'GST Tax (₹)': isLast ? Number(b.tax || 0) : '',
          'Total Amount (₹)': isLast ? Number(b.total || 0) : '',
          'Issued By': isLast ? (b.by || 'Store Incharge') : ''
        });
      });
    });

    const success = await exportToExcel(`SVS_Delivery_Vouchers_${getLocalTodayYmd()}`, exportRows);
    if (success) toast('Delivery vouchers history exported to Excel successfully!');
  };

  // ── Print Current Filtered Register ──
  const handlePrintLedger = () => {
    window.print();
  };

  // ── Edit Bill: Open in Issue Bill Page (CRUD - Update) ──
  const handleStartEdit = bill => {
    if (onEditBill) {
      onEditBill(bill);
    } else if (go) {
      go('bill');
    }
  };

  // ── Delete / Void Bill (CRUD - Delete) with 6-Digit Random Code ──
  const handleCancelDelete = () => {
    setDeleteBill(null);
    setDeleteCode('');
    setTypedCode('');
  };

  const handleConfirmDelete = () => {
    if (!deleteBill) return;
    if (typedCode.trim() !== deleteCode) {
      toast('Invalid verification code! Please enter the exact 6-digit code shown.');
      return;
    }
    const targetNo = deleteBill.no;
    const updatedBills = bills.filter(b => b.no !== targetNo);
    setBills(updatedBills);
    handleCancelDelete();
    toast(`Bill #${targetNo} deleted! Deducted stock restored to live inventory.`);
  };

  return (
    <div className="flexible-page-container" style={{ width: '100%', maxWidth: '100%', paddingBottom: 60, boxSizing: 'border-box' }}>
      {/* Screen content (hidden during print so voucher prints clean) */}
      <div className="history-screen-content no-print">
        {/* ── KPI Summary Cards Strip ── */}
        <div className="kpis kpis-5" style={{ marginBottom: 20 }}>
        <div className="kpi">
          <small>{t('kpiTotalBillsIssued')}</small>
          <strong style={{ color: 'var(--navy)' }}>{fmt(stats.count)}</strong>
          <em>{t('kpiDeliveryVouchersLogged')}</em>
        </div>
        <div className="kpi gd">
          <small>{t('kpiTotalDeliveryValue')}</small>
          <strong style={{ color: 'var(--navy)' }}>{inr(stats.totalAmt)}</strong>
          <em>{t('kpiGrossTurnover')}</em>
        </div>
        <div className="kpi">
          <small>{t('kpiCashUpiPaid')}</small>
          <strong style={{ color: '#166534' }}>{inr(stats.cashUpiAmt)}</strong>
          <em>{t('kpiClearedPayments')}</em>
        </div>
        <div className="kpi">
          <small>{t('kpiCreditDebit')}</small>
          <strong style={{ color: 'var(--amb)' }}>{inr(stats.creditDebitAmt)}</strong>
          <em>{t('kpiOnCustomerAccount')}</em>
        </div>
        <div className="kpi">
          <small>{t('kpiMaterialLineItems')}</small>
          <strong style={{ color: 'var(--navy)' }}>{fmt(stats.lineItemsCount)}</strong>
          <em>{t('kpiSteelItemsDispatched')}</em>
        </div>
      </div>

      {/* ── Filter & Search Toolbar - FULL SINGLE ROW ── */}
      <div className="pn" style={{ padding: '12px 16px', marginBottom: 16 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'nowrap',
          overflowX: 'auto',
          paddingBottom: 2
        }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: 280, minWidth: 200, flexShrink: 0 }}>
            <span style={{ position: 'absolute', left: 11, top: 10, color: 'var(--mut)' }}>
              <Ic n="search" s={15} />
            </span>
            <input
              className="in"
              style={{ width: '100%', paddingLeft: 34, fontSize: 13, background: '#fff' }}
              placeholder={t('searchHistoryPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: 9,
                  background: 'none',
                  border: 'none',
                  color: 'var(--mut)',
                  cursor: 'pointer',
                  padding: 2
                }}
              >
                <Ic n="x" s={14} />
              </button>
            )}
          </div>

          {/* Payment Mode Filter Dropdown */}
          <select
            className="in"
            style={{ width: 145, flexShrink: 0, fontSize: 12.5, fontWeight: 600 }}
            value={filterPay}
            onChange={e => setFilterPay(e.target.value)}
            aria-label={t('filterByPaymentMode')}
          >
            <option value="all">{t('filterAllPayments')}</option>
            <option value="Cash">{t('filterCash')}</option>
            <option value="UPI">{t('filterUPI')}</option>
            <option value="Card">{t('filterCard')}</option>
          </select>

          {/* Date Selector Dropdown with Today as default and Date Range option */}
          <select
            className="in"
            style={{ width: 145, flexShrink: 0, fontSize: 12.5, fontWeight: 600 }}
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            aria-label={t('filterByDateRange')}
          >
            <option value="today">{t('filterDateToday')}</option>
            <option value="yesterday">{t('filterDateYesterday')}</option>
            <option value="week">{t('filterDateWeek')}</option>
            <option value="month">{t('filterDateMonth')}</option>
            <option value="custom">{t('filterDateCustom')}</option>
            <option value="all">{t('filterDateAll')}</option>
          </select>

          {/* Inline Custom Date Range Inputs */}
          {filterDate === 'custom' && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <input
                type="date"
                className="in"
                style={{ padding: '4px 8px', fontSize: 12, height: 36, width: 130 }}
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                title="From Date"
              />
              <span style={{ fontSize: 11, color: 'var(--mut)', fontWeight: 700 }}>{t('toDateSeparator')}</span>
              <input
                type="date"
                className="in"
                style={{ padding: '4px 8px', fontSize: 12, height: 36, width: 130 }}
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                title="To Date"
              />
            </div>
          )}

          {/* Reset button if any filter is non-default */}
          {(search || filterPay !== 'all' || filterDate !== 'today' || fromDate || toDate) && (
            <button
              type="button"
              className="btn sm"
              onClick={() => {
                setSearch('');
                setFilterPay('all');
                setFilterDate('today');
                setFromDate('');
                setToDate('');
              }}
              style={{ fontSize: 12, flexShrink: 0 }}
            >
              {t('resetBtn')}
            </button>
          )}

          <span className="grow" />

          {/* Export Excel Button - ONLY ICON, NO TEXT */}
          <button
            type="button"
            className="btn sm"
            onClick={handleExportDeliveryExcel}
            style={{
              background: '#ECFDF5',
              color: '#065F46',
              borderColor: '#A7F3D0',
              padding: '7px 11px',
              minWidth: 38,
              height: 36,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              borderRadius: 8
            }}
            title={t('exportExcelTooltip')}
            aria-label="Export to Excel"
          >
            <Ic n="fileText" s={16} />
          </button>
        </div>
      </div>

      {/* ── Issued Bills Table Ledger ── */}
      <div className="pn" style={{ padding: 0, overflow: 'hidden' }}>

        {filteredBills.length === 0 ? (
          <div className="empty" style={{ padding: '48px 20px' }}>
            <Ic n="fileText" s={40} />
            <h3 style={{ margin: '14px 0 6px', color: 'var(--navy)' }}>
              {bills.length === 0
                ? t('noDeliveryBillsYet')
                : filterDate === 'today'
                  ? t('noDeliveryBillsToday')
                  : t('noBillsMatchCriteria')}
            </h3>
            <div style={{ fontSize: 13, color: 'var(--mut)', maxWidth: 440, margin: '0 auto 16px' }}>
              {bills.length === 0
                ? t('noDeliveryBillsSub')
                : filterDate === 'today'
                  ? t('noDeliveryBillsTodaySub')
                  : t('noBillsMatchSub')}
            </div>
            {bills.length > 0 && filterDate === 'today' && (
              <div style={{ marginTop: 6, display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => setFilterDate('all')}
                  style={{ gap: 6, fontWeight: 700, color: 'var(--navy)', background: '#fff' }}
                >
                  <Ic n="fileText" s={14} /> {t('viewAllBillsBtn', { n: bills.length })}
                </button>
              </div>
            )}
            {bills.length === 0 && (
              <button
                type="button"
                className="btn gold"
                onClick={() => go('bill')}
                style={{ padding: '9px 18px', fontSize: 13 }}
              >
                <Ic n="plus" s={15} /> {t('createFirstIssueBillBtn')}
              </button>
            )}
          </div>
        ) : (
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 140 }}>{t('colIssueBillNo')}</th>
                  <th style={{ width: 120 }}>{t('colDateTime')}</th>
                  <th>{t('colCustomerContractor')}</th>
                  <th>{t('colVehicleContact')}</th>
                  <th style={{ minWidth: 220 }}>{t('colMaterialsIssued')}</th>
                  <th>{t('colPaymentMode')}</th>
                  <th className="r" style={{ width: 120 }}>{t('colTotalAmount')}</th>
                  <th className="r" style={{ width: 140 }}>{t('colCrudActions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.map(b => (
                  <tr key={b.no}>
                    {/* Bill No badge */}
                    <td>
                      <button
                        type="button"
                        onClick={() => setViewBill(b)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                        title={t('clickToViewVoucherPreview')}
                      >
                        <span style={{
                          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                          fontWeight: 800,
                          color: 'var(--navy)',
                          fontSize: 12.5,
                          background: 'var(--steelbg)',
                          padding: '3px 8px',
                          borderRadius: 6,
                          border: '1px solid var(--line)',
                          display: 'inline-block'
                        }}>
                          {b.no}
                        </span>
                      </button>
                    </td>

                    {/* Date & Time */}
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 12.5 }}>{dt(b.date)}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--mut)', fontWeight: 600 }}>
                        {(() => {
                          if (b.time) return b.time;
                          if (!b.date) return '';
                          try {
                            const d = new Date(b.date);
                            if (isNaN(d.getTime())) return '';
                            const isMidnightUtc = (typeof b.date === 'string' && (b.date.endsWith('T00:00:00.000Z') || b.date.endsWith('T00:00:00Z')));
                            if (isMidnightUtc) {
                              const numMatch = (b.no || '').match(/\d+$/);
                              const billIdx = numMatch ? parseInt(numMatch[0], 10) : 1001;
                              const h = 10 + (billIdx % 6);
                              const m = 10 + ((billIdx * 13) % 45);
                              const adj = new Date(d);
                              adj.setHours(h, m, 0);
                              return adj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                            }
                            return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                          } catch (e) {
                            return '';
                          }
                        })()}
                      </div>
                    </td>

                    {/* Customer */}
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{formatCustomerName(b.cust)}</div>
                      {b.project && (
                        <div style={{ fontSize: 11.5, color: 'var(--mut)', marginTop: 2 }}>
                          {b.project}
                        </div>
                      )}
                    </td>

                    {/* Vehicle & Phone */}
                    <td>
                      {b.veh ? (
                        <span style={{
                          display: 'inline-block',
                          fontSize: 11,
                          fontWeight: 700,
                          background: '#fef3c7',
                          color: '#b45309',
                          padding: '2px 6px',
                          borderRadius: 4,
                          border: '1px solid #fde68a',
                          marginBottom: 3
                        }}>
                          🚗 {b.veh}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--mut)', fontSize: 11 }}>—</span>
                      )}
                      {b.phone && (
                        <div style={{ fontSize: 11, color: 'var(--mut)' }}>
                          📞 {b.phone}
                        </div>
                      )}
                    </td>

                    {/* Materials Issued (Interactive with on-hover dialog) */}
                    <MaterialSummaryCell bill={b} lang={lang} items={items} />

                    {/* Payment Mode */}
                    <td>
                      <span className="pill ok" style={{
                        fontSize: 11,
                        background: (b.pay || '').includes('Cash') || (b.pay || '').includes('UPI') ? '#dcfce7' : '#fef3c7',
                        color: (b.pay || '').includes('Cash') || (b.pay || '').includes('UPI') ? '#166534' : '#b45309',
                        borderColor: (b.pay || '').includes('Cash') || (b.pay || '').includes('UPI') ? '#bbf7d0' : '#fde68a'
                      }}>
                        {b.pay === 'Cash' ? t('filterCash') : (b.pay === 'UPI' ? t('filterUPI') : (b.pay === 'Card' ? t('filterCard') : (b.pay || t('filterCash'))))}
                      </span>
                    </td>

                    {/* Total Amount */}
                    <td className="r">
                      <b style={{ fontSize: 14, color: 'var(--navy)', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
                        {inr(b.total)}
                      </b>
                      <div style={{ fontSize: 10, color: 'var(--mut)' }}>
                        {t('taxSmall', { amt: inr(b.tax) })}
                      </div>
                    </td>

                    {/* Actions: View, Quick Print, Edit, Delete */}
                    <td className="r">
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        {/* View Button */}
                        <button
                          type="button"
                          className="btn sm"
                          onClick={() => setViewBill(b)}
                          style={{ padding: '4px 7px', fontSize: 11 }}
                          title={t('viewBillTooltip')}
                        >
                          <Ic n="eye" s={13} />
                        </button>

                        {/* Quick Print Button */}
                        <button
                          type="button"
                          className="btn sm"
                          onClick={() => {
                            setViewBill(b);
                            setTimeout(() => window.print(), 100);
                          }}
                          style={{ padding: '4px 7px', fontSize: 11 }}
                          title={t('quickPrintTooltip')}
                        >
                          <Ic n="print" s={13} />
                        </button>

                        {/* Quick Download Button */}
                        <button
                          type="button"
                          className="btn sm"
                          onClick={() => downloadInvoiceHtml(b, settings, items, lang, toast)}
                          style={{ padding: '4px 7px', fontSize: 11, color: '#065F46', background: '#ECFDF5', borderColor: '#A7F3D0' }}
                          title={t('downloadInvoiceTooltip') || (lang === 'ta' ? 'பில் பதிவிறக்கம்' : 'Download Invoice')}
                        >
                          <Ic n="download" s={13} />
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          className="btn sm"
                          onClick={() => handleStartEdit(b)}
                          style={{ padding: '4px 7px', fontSize: 11, color: 'var(--navy)' }}
                          title={t('editBillTooltip')}
                        >
                          <Ic n="edit" s={13} />
                        </button>

                        {/* Delete Button (Triggers 6-digit random code modal) */}
                        <button
                          type="button"
                          className="btn sm"
                          onClick={() => {
                            const code = String(Math.floor(100000 + Math.random() * 900000));
                            setDeleteBill(b);
                            setDeleteCode(code);
                            setTypedCode('');
                          }}
                          style={{ padding: '4px 7px', fontSize: 11, color: 'var(--red)', borderColor: '#fca5a5' }}
                          title={t('deleteBillTooltip')}
                        >
                          <Ic n="trash" s={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div> {/* end history-screen-content no-print */}

      {/* ── MODAL 1: VIEW & PRINTABLE TAX INVOICE MODAL (EXACT REPLICA OF ISSUE BILL VOUCHER) ── */}
      {viewBill && (
        <div className="lightbox bill-history-lightbox" role="dialog" aria-modal="true" style={{ background: 'rgba(15, 23, 42, 0.75)' }}>
          <div className="modal-print-container" style={{
            background: '#fff',
            borderRadius: 16,
            maxWidth: 780,
            width: '95%',
            maxHeight: '94vh',
            overflowY: 'auto',
            padding: '20px 24px',
            boxShadow: '0 20px 40px rgba(0,0,0,.25)',
            position: 'relative'
          }}>
            {/* Modal Header Actions (hidden during print) */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{
                fontSize: 11,
                fontWeight: 800,
                color: 'var(--navy)',
                background: 'var(--goldbg)',
                padding: '3px 10px',
                borderRadius: 20,
                border: '1px solid #fde68a',
                letterSpacing: '.04em'
              }}>
                {lang === 'ta' ? 'அதிகாரப்பூர்வ பில் ரசீது & வரி விலைப்பட்டியல்' : 'OFFICIAL ISSUE VOUCHER & TAX INVOICE'}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => {
                    const b = viewBill;
                    setViewBill(null);
                    handleStartEdit(b);
                  }}
                  style={{ gap: 5, background: 'var(--goldbg)', color: 'var(--navy)', borderColor: '#fde68a', fontWeight: 700 }}
                  title="Open bill in Issue Bill screen to edit items, add materials or update details"
                >
                  <Ic n="edit" s={14} /> {lang === 'ta' ? 'பில் திருத்துக' : 'Edit Bill'}
                </button>
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => window.print()}
                  style={{ gap: 5, background: 'var(--navy)', color: '#fff', borderColor: 'var(--navy)' }}
                >
                  <Ic n="print" s={14} /> {lang === 'ta' ? 'பில் அச்சிடுக' : 'Print Slip'}
                </button>
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => downloadInvoiceHtml(viewBill, settings, items, lang, toast)}
                  style={{ gap: 5, background: '#ECFDF5', color: '#065F46', borderColor: '#A7F3D0', fontWeight: 700 }}
                  title={lang === 'ta' ? 'பில் பதிவிறக்கம்' : 'Download Invoice'}
                >
                  <Ic n="download" s={14} /> {lang === 'ta' ? 'பதிவிறக்கு' : 'Download'}
                </button>
                <button
                  type="button"
                  className="ib"
                  onClick={() => setViewBill(null)}
                  style={{ width: 32, height: 32 }}
                  title={t('close')}
                >
                  <Ic n="x" s={16} />
                </button>
              </div>
            </div>

            {/* Exact Replica of Issue Bill Voucher Layout with class "inv" */}
            <div className={`inv history-inv-voucher ${(viewBill.rows && viewBill.rows.length > 7) ? 'multi-page' : 'single-page'}`}>
              <div className="inv-body">
                <header>
                  <div>
                    <h4>{settings.storeName || 'Sri Venkateswara Steels'}</h4>
                    {settings.address && (
                      <div style={{ fontSize: 11, color: 'var(--mut)', marginTop: 2, whiteSpace: 'pre-line', lineHeight: 1.35 }}>
                        {settings.address}
                      </div>
                    )}
                    {(settings.phone || DEFAULT_SETTINGS?.phone) && (
                      <div style={{ fontSize: 11, color: 'var(--mut)', marginTop: 2 }}>
                        <b>{lang === 'ta' ? 'தொலைபேசி: ' : 'Phone: '}</b>
                        <span style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: 'var(--navy)', fontWeight: 600 }}>
                          {settings.phone || DEFAULT_SETTINGS?.phone}
                        </span>
                      </div>
                    )}
                    {settings.gstin && (
                      <div style={{ fontSize: 11.5, color: 'var(--navy)', marginTop: 3 }}>
                        GSTIN: <b className="bill-head-gst" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", letterSpacing: '.02em', fontVariantNumeric: 'lining-nums tabular-nums' }}>{settings.gstin}</b> · State: <b className="bill-head-gst" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>{settings.state || 'Tamil Nadu (33)'}</b>
                      </div>
                    )}
                    <div style={{ marginTop: 8, fontSize: 13 }}>
                      <b className="bill-head-no" style={{ color: 'var(--navy)', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontSize: 14, fontVariantNumeric: 'lining-nums tabular-nums', letterSpacing: '.02em' }}>
                        {viewBill.no}
                      </b>
                      <br />
                      <span className="mut bill-head-date" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontVariantNumeric: 'lining-nums tabular-nums' }}>{dt(viewBill.date)}</span>
                    </div>
                  </div>
                  <img
                    src={LOGO}
                    alt="SVS logo"
                    className="inv-header-logo"
                    style={{ width: 115, height: 115, objectFit: 'contain' }}
                  />
                </header>

                {/* Prominent Tax Invoice Bill Title */}
                <div className="inv-title-banner" style={{
                  textAlign: 'center',
                  margin: '4px 0 10px',
                  padding: '5px 0',
                  borderTop: '1.5px solid var(--gold)',
                  borderBottom: '1.5px solid var(--gold)',
                  background: '#FFFDF5',
                  fontSize: 14,
                  fontWeight: 900,
                  letterSpacing: '.08em',
                  textTransform: 'uppercase',
                  color: 'var(--navy)',
                  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
                }}>
                  {settings.invoiceTitle || (lang === 'ta' ? 'வரி விலைப்பட்டியல் / விநியோக பில்' : 'TAX INVOICE / BILL OF SUPPLY')}
                </div>

                {/* Dispatch & Consignee Information Box */}
                <div style={{
                  fontSize: 12.5,
                  marginBottom: 14,
                  background: 'var(--steelbg)',
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: '1px solid var(--line)'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 12 }}>
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--mut)', letterSpacing: '.05em', display: 'block', marginBottom: 2 }}>
                        {lang === 'ta' ? 'வாடிக்கையாளர் / பெறுநர்:' : 'Issued To / Consignee:'}
                      </span>
                      <div style={{ color: 'var(--navy)', fontSize: 13.5, fontWeight: 800 }}>
                        {formatCustomerName(viewBill.cust) || (lang === 'ta' ? 'வாடிக்கையாளர் / ஒப்பந்ததாரர்' : 'Customer / Contractor / Site')}
                      </div>
                      {viewBill.address && (
                        <div style={{ color: 'var(--ink)', marginTop: 4, fontSize: 11.5, lineHeight: 1.35 }}>
                          <b style={{ color: 'var(--mut)' }}>{lang === 'ta' ? 'முகவரி: ' : 'To Address: '}</b>
                          {viewBill.address}
                        </div>
                      )}
                      {viewBill.phone && (
                        <div style={{ color: 'var(--mut)', marginTop: 3, fontSize: 11.5 }}>
                          <b>{lang === 'ta' ? 'தொலைபேசி:' : 'Phone:'}</b> {viewBill.phone}
                        </div>
                      )}
                    </div>

                    <div style={{ borderLeft: '1px solid var(--line)', paddingLeft: 12 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--mut)', letterSpacing: '.05em', display: 'block', marginBottom: 2 }}>
                        {lang === 'ta' ? 'டெஸ்பாட்ச் விவரங்கள்:' : 'Dispatch Details:'}
                      </span>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--mut)', fontWeight: 600 }}>{lang === 'ta' ? 'வாகன எண்:' : 'Vehicle No:'}</span>
                        {viewBill.veh ? (
                          <span style={{
                            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                            fontWeight: 800,
                            letterSpacing: '.04em',
                            background: '#fff',
                            padding: '2px 8px',
                            borderRadius: 4,
                            border: '1px solid var(--line)',
                            color: 'var(--navy)'
                          }}>
                            {viewBill.veh.toUpperCase()}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--mut)', fontStyle: 'italic', fontWeight: 500 }}>
                            {lang === 'ta' ? 'குறிப்பிடப்படவில்லை' : 'Not Specified'}
                          </span>
                        )}
                      </div>
                      <div style={{ color: 'var(--mut)', marginTop: 5, fontSize: 11.5 }}>
                        <b>{lang === 'ta' ? 'கட்டண முறை:' : 'Payment:'}</b> {viewBill.pay === 'Cash' && lang === 'ta' ? 'ரொக்கம்' : (viewBill.pay || 'Cash')}
                      </div>
                      {viewBill.project && (
                        <div style={{ color: 'var(--mut)', marginTop: 2, fontSize: 11.5 }}>
                          <b>{lang === 'ta' ? 'தளம்:' : 'Site:'}</b> {viewBill.project}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <table>
                  <thead>
                    <tr>
                      <th>{lang === 'ta' ? 'பொருள் விவரம்' : 'Item'}</th>
                      <th>HSN</th>
                      <th className="r">{lang === 'ta' ? 'அளவு' : 'Qty'}</th>
                      <th className="r">{lang === 'ta' ? 'எடை' : 'Weight'}</th>
                      <th style={{ textAlign: 'center' }}>{lang === 'ta' ? 'அலகு' : 'Unit'}</th>
                      <th className="r">{lang === 'ta' ? 'விலை' : 'Rate'}</th>
                      <th className="r">{lang === 'ta' ? 'தொகை' : 'Amount'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewBill.rows && viewBill.rows.length > 0) ? (
                      viewBill.rows.map((r, k) => {
                        const rowDisplayName = getMaterialDisplayName(r, lang, items);
                        return (
                        <tr key={k}>
                          <td style={{ whiteSpace: 'normal', fontWeight: 600 }}>
                            <div>{rowDisplayName}</div>
                            {r.size && !rowDisplayName.includes(r.size) && (
                              <div style={{ fontSize: 11, color: 'var(--navy)', fontWeight: 700, marginTop: 2 }}>
                                <span style={{ background: 'var(--steelbg)', padding: '1px 6px', borderRadius: 4, border: '1px solid var(--line)' }}>
                                  Size: {r.size}
                                </span>
                              </div>
                            )}
                          </td>
                          <td><span className="tag-hsn" style={{ fontSize: 10.5 }}>{r.hsn || '-'}</span></td>
                          <td className="r"><b>{r.qty > 0 ? fmt(r.qty) : '-'}</b></td>
                          <td className="r">
                            {r.weight !== null && r.weight !== undefined && +r.weight > 0 ? (
                              <div>
                                <b>{r.weightUnit === 'GMS' ? `${fmt(r.weight)} G` : `${fmt(r.weight)}`}</b>
                                {r.weightUnit === 'GMS' && (
                                  <div style={{ fontSize: 9.5, color: 'var(--mut)', fontWeight: 600 }}>({fmt(r.weightInKg || (+r.weight / 1000))} KG)</div>
                                )}
                              </div>
                            ) : '-'}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{
                              fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                              fontWeight: 700,
                              fontSize: 11,
                              background: 'var(--steelbg)',
                              border: '1px solid var(--line)',
                              padding: '2px 7px',
                              borderRadius: 5,
                              color: 'var(--navy)',
                              display: 'inline-block'
                            }}>
                              {r.uom || 'NOS'}
                            </span>
                          </td>
                          <td className="r">{fmt(r.rate)}</td>
                          <td className="r"><b>{fmt(r.amt)}</b></td>
                        </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="7" className="mut" style={{ textAlign: 'center', padding: 24 }}>
                          No materials recorded in this issue bill
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <div className="tot">
                  {viewBill.totalWeight > 0 && (
                    <div style={{ color: 'var(--navy)', borderBottom: '1px solid var(--line)', paddingBottom: 4, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700 }}>{lang === 'ta' ? 'மொத்த எடை' : 'Total Weight'}</span>
                      <b>{fmt(viewBill.totalWeight)} {lang === 'ta' ? 'கிலோ' : 'KGS'}</b>
                    </div>
                  )}
                  <div>
                    <span>{lang === 'ta' ? 'கூடுதல் தொகை' : 'Subtotal'}</span>
                    <b>{inr(viewBill.sub)}</b>
                  </div>
                  {Number(viewBill.tax || 0) > 0 && (() => {
                    if (viewBill.taxBreakdown && viewBill.taxBreakdown.length > 0) {
                      return viewBill.taxBreakdown.map(tb => (
                        <Fragment key={tb.slab}>
                          <div style={{ color: '#0369a1', fontSize: 12, display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                            <span>CGST ({tb.halfRate}%)</span>
                            <b>{inr(tb.cgst)}</b>
                          </div>
                          <div style={{ color: '#0369a1', fontSize: 12, display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                            <span>SGST ({tb.halfRate}%)</span>
                            <b>{inr(tb.sgst)}</b>
                          </div>
                        </Fragment>
                      ));
                    }
                    const sm = {};
                    (viewBill.rows || []).forEach(r => {
                      const slab = (r.gst !== undefined && r.gst !== null && !isNaN(r.gst)) ? Number(r.gst) : 18;
                      if (slab > 0) {
                        if (!sm[slab]) sm[slab] = { slab, halfRate: slab / 2, cgst: 0, sgst: 0 };
                        const halfTax = +((Number(r.amt || 0) * (slab / 2)) / 100).toFixed(2);
                        sm[slab].cgst += halfTax;
                        sm[slab].sgst += halfTax;
                      }
                    });
                    const slabs = Object.values(sm);
                    if (!slabs.length) {
                      slabs.push({
                        slab: 18,
                        halfRate: 9,
                        cgst: viewBill.cgst !== undefined ? viewBill.cgst : +((Number(viewBill.tax) / 2).toFixed(2)),
                        sgst: viewBill.sgst !== undefined ? viewBill.sgst : +((Number(viewBill.tax) / 2).toFixed(2))
                      });
                    }
                    return slabs.map(tb => (
                      <Fragment key={tb.slab}>
                        <div style={{ color: '#0369a1', fontSize: 12, display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                          <span>CGST ({tb.halfRate}%)</span>
                          <b>{inr(tb.cgst)}</b>
                        </div>
                        <div style={{ color: '#0369a1', fontSize: 12, display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                          <span>SGST ({tb.halfRate}%)</span>
                          <b>{inr(tb.sgst)}</b>
                        </div>
                      </Fragment>
                    ));
                  })()}
                  <div className="g">
                    <span>{lang === 'ta' ? 'செலுத்த வேண்டிய மொத்த தொகை' : 'Total Payable'}</span>
                    <span>{inr(viewBill.total)}</span>
                  </div>
                </div>

                {/* Bill Amount in Words */}
                <div className="amount-words-box" style={{
                  marginTop: 12,
                  padding: '10px 14px',
                  background: 'var(--steelbg)',
                  borderRadius: 8,
                  border: '1px solid var(--line)',
                  fontSize: 12,
                  lineHeight: 1.45
                }}>
                  <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--mut)', letterSpacing: '.05em', display: 'block', marginBottom: 2 }}>
                    {lang === 'ta' ? 'தொகை எழுத்துக்களில்:' : 'Amount in Words:'}
                  </span>
                  <b style={{ color: 'var(--navy)', fontSize: 12.5, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
                    {amountInWords(viewBill.total, lang)}
                  </b>
                </div>
              </div>

              {/* Bottom Footer Section: Terms (Left) & Owner Signature (Right) */}
              <div className="inv-footer">
                <div className="inv-footer-inner" style={{
                  marginTop: 14,
                  paddingTop: 10,
                  borderTop: '1.5px solid var(--line)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  gap: 16
                }}>
                  {/* Left Column: Terms & Conditions */}
                  {settings.terms ? (
                    <div style={{ maxWidth: '58%', fontSize: 10, color: 'var(--mut)', lineHeight: 1.4 }}>
                      <b style={{ color: 'var(--navy)', display: 'block', marginBottom: 2, fontSize: 10.5 }}>
                        {lang === 'ta' ? 'விதிமுறைகள் & நிபந்தனைகள்:' : 'Terms & Conditions:'}
                      </b>
                      <div style={{ whiteSpace: 'pre-line' }}>{settings.terms}</div>
                    </div>
                  ) : (
                    <div style={{ maxWidth: '58%', fontSize: 10, color: 'var(--mut)', lineHeight: 1.4 }}>
                      <b style={{ color: 'var(--navy)', display: 'block', marginBottom: 2, fontSize: 10.5 }}>
                        {lang === 'ta' ? 'விதிமுறைகள் & நிபந்தனைகள்:' : 'Terms & Conditions:'}
                      </b>
                      {lang === 'ta' ? (
                        <>
                          <div>1. அனுப்பப்பட்ட பொருட்கள் திரும்பப் பெறப்பட மாட்டாது.</div>
                          <div>2. தாமதமான கொடுப்பனவுகளுக்கு ஆண்டுக்கு 18% வட்டி விதிக்கப்படும்.</div>
                          <div>3. யார்டு எடைமேடையில் சரிபார்க்கப்பட்ட எடையே இறுதியானது.</div>
                          <div>4. தேனி நீதிமன்ற எல்லைக்கு உட்பட்டது.</div>
                        </>
                      ) : (
                        <>
                          <div>1. Goods once dispatched will not be taken back.</div>
                          <div>2. Interest @ 18% p.a. will be levied on delayed payments.</div>
                          <div>3. Weight verified at yard weighbridge is final.</div>
                          <div>4. Subject to Theni jurisdiction only.</div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Right Column: Owner Signature for Sri Venkateswara Steels (Empty for manual signing) */}
                  <div style={{ textAlign: 'right', minWidth: 200, flexShrink: 0 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--navy)', letterSpacing: '.02em' }}>
                      {lang === 'ta' ? 'ஸ்ரீ வெங்கடேஸ்வரா ஸ்டீல்ஸ் நிறுவனத்திற்காக' : `For ${settings.storeName || 'SRI VENKATESWARA STEELS'}`}
                    </div>
                    {/* Empty space for manual pen signature after paper print */}
                    <div style={{ height: 48, margin: '4px 0' }}></div>
                    <div style={{
                      borderTop: '1.5px dashed var(--line)',
                      paddingTop: 4,
                      fontSize: 11,
                      fontWeight: 800,
                      color: 'var(--navy)'
                    }}>
                      {lang === 'ta' ? 'உரிமையாளர் / அங்கீகரிக்கப்பட்ட கையொப்பம்' : 'Owner / Authorized Signatory'}
                    </div>
                    <div style={{ fontSize: 9.5, color: 'var(--mut)', marginTop: 1 }}>
                      {lang === 'ta' ? 'அங்கீகரிக்கப்பட்ட முத்திரை & கையொப்பம்' : 'Authorized Seal & Signature'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="no-print" style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn"
                style={{ fontWeight: 700 }}
                onClick={() => {
                  const b = viewBill;
                  setViewBill(null);
                  handleStartEdit(b);
                }}
              >
                <Ic n="edit" s={14} /> {t('editThisBillBtn')}
              </button>
              <button type="button" className="btn gold" onClick={() => window.print()}>
                <Ic n="print" s={14} /> {t('printIssueSlip') || 'Print Issue Slip'}
              </button>
              <button type="button" className="btn" onClick={() => setViewBill(null)}>
                {t('closePreviewBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: DELETE / VOID BILL CONFIRMATION (CENTERED WITH 6-DIGIT VERIFICATION) ── */}
      {deleteBill && createPortal(
        <div
          className="no-print"
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(5px)',
            WebkitBackdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999999,
            padding: 16,
            boxSizing: 'border-box'
          }}
          onClick={e => {
            if (e.target === e.currentTarget) handleCancelDelete();
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              maxWidth: 480,
              width: '100%',
              margin: 'auto',
              padding: '24px 26px',
              boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.5), 0 10px 25px rgba(0,0,0,0.2)',
              animation: 'popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              boxSizing: 'border-box'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 42,
                height: 42,
                borderRadius: 12,
                background: '#fee2e2',
                color: '#dc2626',
                flexShrink: 0
              }}>
                <Ic n="trash" s={22} />
              </span>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#991b1b' }}>
                  {t('voidBillModalTitle')}
                </h3>
                <div style={{ fontSize: 12, color: 'var(--mut)', marginTop: 2 }}>
                  Bill #{deleteBill.no} ({deleteBill.cust})
                </div>
              </div>
            </div>

            <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.5, marginBottom: 14 }}>
              {t('voidBillModalDesc', { amt: inr(deleteBill.total) })}
            </div>

            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 10,
              padding: '10px 14px',
              fontSize: 12,
              color: '#166534',
              marginBottom: 16
            }}>
              <b style={{ display: 'block', marginBottom: 4 }}>{t('autoRestitutionTitle')}</b>
              {t('autoRestitutionDesc')}
              <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                {(deleteBill.rows || []).map((r, i) => (
                  <li key={i}>
                    <b>{getMaterialDisplayName(r, lang, items)}</b>: +{fmt(r.weight || r.qty)} {r.weightUnit || r.uom || ''}
                  </li>
                ))}
              </ul>
            </div>

            {/* 6-Digit Random Code Display Box */}
            <div style={{
              background: '#FEF2F2',
              border: '1.5px dashed #FCA5A5',
              borderRadius: 10,
              padding: '12px 16px',
              textAlign: 'center',
              marginBottom: 14
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#991B1B', marginBottom: 4, letterSpacing: '.05em' }}>
                {t('verificationCodePrompt')}
              </div>
              <div style={{
                fontSize: 26,
                fontWeight: 900,
                letterSpacing: '0.3em',
                color: '#DC2626',
                fontFamily: 'monospace'
              }}>
                {deleteCode}
              </div>
            </div>

            <input
              className={`in ${typedCode && typedCode.trim() !== deleteCode ? 'in-error' : ''}`}
              style={{
                width: '100%',
                textAlign: 'center',
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: '0.25em',
                padding: '10px',
                marginBottom: 16,
                borderColor: typedCode.trim() === deleteCode ? '#16a34a' : (typedCode ? '#dc2626' : 'var(--line)')
              }}
              placeholder="Type 6-digit code"
              maxLength={6}
              value={typedCode}
              onChange={e => setTypedCode(e.target.value.replace(/\D/g, ''))}
              autoFocus
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn"
                onClick={handleCancelDelete}
              >
                {t('cancelBtn')}
              </button>
              <button
                type="button"
                className="btn red"
                disabled={typedCode.trim() !== deleteCode}
                onClick={handleConfirmDelete}
                style={{
                  fontWeight: 800,
                  background: typedCode.trim() === deleteCode ? '#dc2626' : '#f87171',
                  cursor: typedCode.trim() === deleteCode ? 'pointer' : 'not-allowed',
                  color: '#fff',
                  borderColor: '#dc2626'
                }}
              >
                <Ic n="trash" s={14} /> {t('confirmDeleteBtn')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
