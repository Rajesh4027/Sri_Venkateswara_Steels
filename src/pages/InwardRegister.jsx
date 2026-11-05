import { useState, useMemo } from 'react';
import { fmt, inr, dt, exportToExcel, getMaterialDisplayName } from '../utils';
import Ic from '../components/Icon';
import BillLightbox from '../components/BillLightbox';
import Modal from '../components/Modal';
import { useLanguage } from '../context/LanguageContext';

export default function InwardRegister({
  items,
  setItems,
  inwardInvoices,
  setInwardInvoices,
  categories,
  openInwardModal,
  onEditInvoice,
  go,
  toast
}) {
  const { t, lang } = useLanguage();
  const [tab, setTab] = useState('invoices'); // 'invoices' | 'items'
  const [q, setQ] = useState('');
  const [hsnFilter, setHsnFilter] = useState('All');
  const [supplierFilter, setSupplierFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'today' | 'this_month' | 'custom'
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [onlyWithImage, setOnlyWithImage] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [visibleCount, setVisibleCount] = useState(60);

  // Delete Confirmation State with 6-Digit Random Code
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteCode, setDeleteCode] = useState('');
  const [typedCode, setTypedCode] = useState('');

  // Collect unique HSN codes present in recorded inward invoices
  const allHsns = useMemo(() => {
    const s = new Set();
    inwardInvoices.forEach(inv => {
      (inv.items || []).forEach(it => { if (it.hsn) s.add(it.hsn); });
    });
    items.forEach(it => { if (it.hsn) s.add(it.hsn); });
    return Array.from(s).sort();
  }, [inwardInvoices, items]);

  // Collect unique suppliers from recorded invoices
  const allSuppliers = useMemo(() => {
    const s = new Set();
    inwardInvoices.forEach(inv => { if (inv.supplier) s.add(inv.supplier); });
    return Array.from(s).sort();
  }, [inwardInvoices]);

  // Date filtering logic
  const checkDateMatch = (dateStr) => {
    if (!dateStr) return true;
    if (dateFilter === 'all') return true;

    const todayStr = new Date().toISOString().slice(0, 10);
    const thisMonthStr = todayStr.slice(0, 7);

    if (dateFilter === 'today') {
      return dateStr.startsWith(todayStr);
    }
    if (dateFilter === 'this_month') {
      return dateStr.startsWith(thisMonthStr);
    }
    if (dateFilter === 'custom') {
      if (fromDate && dateStr < fromDate) return false;
      if (toDate && dateStr > toDate) return false;
      return true;
    }
    return true;
  };

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return inwardInvoices.filter(inv => {
      if (!checkDateMatch(inv.date)) return false;
      if (supplierFilter !== 'All' && inv.supplier !== supplierFilter) return false;
      if (onlyWithImage && !inv.billImage) return false;

      if (hsnFilter !== 'All') {
        const hasHsn = (inv.items || []).some(it => it.hsn === hsnFilter);
        if (!hasHsn) return false;
      }

      if (q.trim()) {
        const query = q.toLowerCase();
        const matchesInv = (inv.inv || '').toLowerCase().includes(query);
        const matchesSup = (inv.supplier || '').toLowerCase().includes(query);
        const matchesPO = (inv.orderNo || '').toLowerCase().includes(query);
        const matchesItem = (inv.items || []).some(it =>
          (it.name || '').toLowerCase().includes(query) ||
          (it.nameTa || '').toLowerCase().includes(query) ||
          (it.hsn || '').toLowerCase().includes(query)
        );
        if (!matchesInv && !matchesSup && !matchesPO && !matchesItem) return false;
      }

      return true;
    });
  }, [inwardInvoices, q, hsnFilter, supplierFilter, dateFilter, fromDate, toDate, onlyWithImage]);

  // Flatten items for Tab 2
  const filteredItemRows = useMemo(() => {
    const rows = [];
    filteredInvoices.forEach(inv => {
      (inv.items || []).forEach((it, idx) => {
        if (hsnFilter !== 'All' && it.hsn !== hsnFilter) return;
        if (q.trim()) {
          const query = q.toLowerCase();
          const match =
            (it.name || '').toLowerCase().includes(query) ||
            (it.nameTa || '').toLowerCase().includes(query) ||
            (it.hsn || '').toLowerCase().includes(query) ||
            (inv.supplier || '').toLowerCase().includes(query) ||
            (inv.inv || '').toLowerCase().includes(query);
          if (!match) return;
        }

        const qty = Number(it.qty) || 0;
        const rate = Number(it.rate) || 0;
        const taxable = it.taxableAmt || (qty * rate);
        const total = it.totalAmt || taxable;

        rows.push({
          rowKey: `${inv.id}-${idx}`,
          invId: inv.id,
          invNo: inv.inv,
          date: inv.date,
          supplier: inv.supplier,
          billImage: inv.billImage,
          name: it.name,
          nameTa: it.nameTa,
          cat: it.cat,
          hsn: it.hsn,
          qty: it.qty,
          uom: it.uom,
          rate: it.rate,
          taxPct: (it.taxPct !== undefined && it.taxPct !== null && it.taxPct !== '') ? Number(it.taxPct) : ((it.gst !== undefined && it.gst !== null && it.gst !== '') ? Number(it.gst) : 18),
          taxableAmt: taxable,
          totalAmt: total,
          invoiceRef: inv
        });
      });
    });
    return rows;
  }, [filteredInvoices, q, hsnFilter]);

  // Aggregate statistics
  const stats = useMemo(() => {
    let grandTotal = 0;
    let totalTax = 0;
    let totalTaxable = 0;
    let uniqueSuppliers = new Set();
    let totalItemsCount = 0;

    filteredInvoices.forEach(inv => {
      grandTotal += Number(inv.total) || 0;
      totalTax += Number(inv.totalTax) || 0;
      totalTaxable += Number(inv.taxable) || 0;
      if (inv.supplier) uniqueSuppliers.add(inv.supplier);
      totalItemsCount += (inv.items || []).length;
    });

    return {
      grandTotal,
      totalTax,
      totalTaxable,
      invoiceCount: filteredInvoices.length,
      supplierCount: uniqueSuppliers.size,
      totalItemsCount
    };
  }, [filteredInvoices]);

  const resetFilters = () => {
    setQ('');
    setHsnFilter('All');
    setSupplierFilter('All');
    setDateFilter('all');
    setFromDate('');
    setToDate('');
    setOnlyWithImage(false);
  };

  const isFiltered = q || hsnFilter !== 'All' || supplierFilter !== 'All' || dateFilter !== 'all' || onlyWithImage;

  // CRUD: Edit Handler
  const handleEdit = (inv) => {
    if (onEditInvoice) {
      onEditInvoice(inv);
    } else if (go) {
      go('inward-entry');
    }
  };

  // CRUD: Start Delete with 6-digit random code
  const handleStartDelete = (inv) => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setDeleteTarget(inv);
    setDeleteCode(code);
    setTypedCode('');
  };

  // CRUD: Cancel Delete
  const handleCancelDelete = () => {
    setDeleteTarget(null);
    setDeleteCode('');
    setTypedCode('');
  };

  // CRUD: Confirm Delete with Stock Deduction
  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    if (typedCode.trim() !== deleteCode) {
      toast('Invalid verification code! Please enter the exact 6-digit code shown.');
      return;
    }

    // Remaining invoices after this deletion
    const remainingInvoices = inwardInvoices.filter(i => i.id !== deleteTarget.id);

    // Reconcile and deduct received stock, and revert rate/gst/last date to the previous remaining inward invoice
    let updatedItems = [...items];
    (deleteTarget.items || []).forEach(it => {
      const oldQty = Number(it.qty) || 0;
      const idx = updatedItems.findIndex(i =>
        (it.id && i.id === it.id) ||
        i.name.toUpperCase() === (it.name || '').trim().toUpperCase()
      );
      if (idx >= 0) {
        const cur = updatedItems[idx];
        const newRecv = Math.max(0, +(Number(cur.recv || 0) - oldQty).toFixed(2));

        // Find the most recent remaining inward invoice that contains this item
        let prevInwardItem = null;
        let prevInvoiceDate = '';
        for (const inv of remainingInvoices) {
          const match = (inv.items || []).find(r =>
            (r.id && cur.id && r.id === cur.id) ||
            (r.name || '').trim().toUpperCase() === (cur.name || '').trim().toUpperCase()
          );
          if (match) {
            prevInwardItem = match;
            prevInvoiceDate = inv.date;
            break;
          }
        }

        let newRate = cur.rate;
        let newGst = cur.gst;
        let newLast = cur.last;

        if (prevInwardItem) {
          if (prevInwardItem.rate !== undefined && prevInwardItem.rate !== null && !isNaN(prevInwardItem.rate) && Number(prevInwardItem.rate) > 0) {
            newRate = Number(prevInwardItem.rate);
          }
          const prevTax = prevInwardItem.taxPct !== undefined ? prevInwardItem.taxPct : prevInwardItem.gst;
          if (prevTax !== undefined && prevTax !== null && !isNaN(prevTax)) {
            newGst = Number(prevTax);
          }
          if (prevInvoiceDate) {
            newLast = prevInvoiceDate;
          }
        }

        updatedItems[idx] = {
          ...cur,
          recv: newRecv,
          rate: newRate,
          gst: newGst,
          last: newLast
        };
      }
    });

    setItems(updatedItems);
    setInwardInvoices(remainingInvoices);

    const deletedInvNum = deleteTarget.inv;
    if (selectedInvoice && selectedInvoice.id === deleteTarget.id) {
      setSelectedInvoice(null);
    }
    handleCancelDelete();
    toast(`Invoice #${deletedInvNum} deleted, stock deducted & previous rate restored.`);
  };

  // Export Suppliers & Inward Register to Microsoft Excel (.csv)
  const handleExportSuppliersExcel = () => {
    if (!filteredInvoices.length) {
      toast('No supplier invoices available to export');
      return;
    }
    const exportRows = [];
    filteredInvoices.forEach((inv, idx) => {
      const itemsSummary = (inv.items || [])
        .map(it => `${it.name} (${fmt(it.qty)} ${it.uom || ''} @ ₹${fmt(it.rate)})`)
        .join('; ');
      exportRows.push({
        'S.No': idx + 1,
        'Invoice Number': inv.inv,
        'Invoice Date': inv.date ? dt(inv.date) : '',
        'Supplier Name': inv.supplier,
        'Order / PO Number': inv.orderNo || '',
        'Total Items Count': (inv.items || []).length,
        'Materials Summary': itemsSummary,
        'Taxable Purchase (₹)': Number(inv.taxable || 0),
        'Total Tax (₹)': Number(inv.totalTax || 0),
        'Grand Total (₹)': Number(inv.total || 0),
        'Photo Proof': inv.billImage ? 'Yes' : 'No'
      });
    });
    const success = exportToExcel(`SVS_Suppliers_Inward_Invoices_${new Date().toISOString().slice(0, 10)}`, exportRows);
    if (success) toast('Suppliers procurement register exported to Excel successfully!');
  };

  return (
    <div className="flexible-page-container" style={{ width: '100%', maxWidth: '100%', paddingBottom: 60, boxSizing: 'border-box' }}>
      {/* Top Modern KPI Stats Strip (Best Stats Layout) */}
      <div className="kpis kpis-4" style={{ marginBottom: 16 }}>
        <div className="kpi">
          <small>{t('totalInwardPurchase')}</small>
          <strong style={{ color: 'var(--navy)' }}>{inr(stats.grandTotal)}</strong>
          <em>{t('invoicesRecordedCount', { n: stats.invoiceCount })}</em>
        </div>
        <div className="kpi">
          <small>{t('taxableWithoutGst')}</small>
          <strong style={{ color: 'var(--ink)' }}>{inr(stats.totalTaxable)}</strong>
          <em>{t('baseProcurementVal')}</em>
        </div>
        <div className="kpi gd">
          <small>{t('totalInputTaxCredit')}</small>
          <strong style={{ color: '#166534' }}>{inr(stats.totalTax)}</strong>
          <em>{t('eligibleGstInputTax')}</em>
        </div>
        <div className="kpi">
          <small>{t('activeSuppliers')}</small>
          <strong style={{ color: 'var(--navy)' }}>{stats.supplierCount}</strong>
          <em>{t('materialEntriesCount', { n: stats.totalItemsCount })}</em>
        </div>
      </div>

      {/* Filters Toolbar & Tab Navigation - FULL SINGLE ROW */}
      <div className="pn" style={{ padding: '12px 16px', marginBottom: 16 }}>
        <div style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          flexWrap: 'nowrap',
          overflowX: 'auto',
          paddingBottom: 2
        }}>
          {/* Tabs for Invoices vs Line Receipts */}
          <div style={{ display: 'inline-flex', background: 'var(--steelbg)', borderRadius: 8, padding: 3, flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setTab('invoices')}
              style={{
                border: 'none',
                background: tab === 'invoices' ? '#fff' : 'transparent',
                color: tab === 'invoices' ? 'var(--navy)' : 'var(--mut)',
                fontWeight: 700,
                fontSize: 12.5,
                padding: '6px 12px',
                borderRadius: 6,
                cursor: 'pointer',
                boxShadow: tab === 'invoices' ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5
              }}
            >
              <Ic n="fileText" s={14} /> {t('billsCountTab', { n: filteredInvoices.length })}
            </button>
            <button
              type="button"
              onClick={() => setTab('items')}
              style={{
                border: 'none',
                background: tab === 'items' ? '#fff' : 'transparent',
                color: tab === 'items' ? 'var(--navy)' : 'var(--mut)',
                fontWeight: 700,
                fontSize: 12.5,
                padding: '6px 12px',
                borderRadius: 6,
                cursor: 'pointer',
                boxShadow: tab === 'items' ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5
              }}
            >
              <Ic n="box" s={14} /> {t('itemsCountTab', { n: filteredItemRows.length })}
            </button>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: 220, minWidth: 170, flexShrink: 0 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--mut)', pointerEvents: 'none' }}>
              <Ic n="search" s={15} />
            </span>
            <input
              className="in"
              style={{ width: '100%', paddingLeft: 32, fontSize: 12.5 }}
              placeholder={t('searchInvoiceSupplier')}
              value={q}
              onChange={e => setQ(e.target.value)}
            />
            {q && (
              <button
                className="ib"
                style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', width: 20, height: 20 }}
                onClick={() => setQ('')}
              >
                <Ic n="x" s={11} />
              </button>
            )}
          </div>

          {/* HSN Filter Dropdown */}
          <select
            className="in"
            style={{ width: 140, flexShrink: 0, fontSize: 12.5 }}
            value={hsnFilter}
            onChange={e => setHsnFilter(e.target.value)}
          >
            <option value="All">{t('allHsnCount', { n: allHsns.length })}</option>
            {allHsns.map(h => (
              <option key={h} value={h}>HSN {h}</option>
            ))}
          </select>

          {/* Supplier Filter Dropdown */}
          <select
            className="in"
            style={{ width: 160, flexShrink: 0, fontSize: 12.5 }}
            value={supplierFilter}
            onChange={e => setSupplierFilter(e.target.value)}
          >
            <option value="All">{t('allSuppliersCount', { n: allSuppliers.length })}</option>
            {allSuppliers.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Date Filter Dropdown */}
          <select
            className="in"
            style={{ width: 135, flexShrink: 0, fontSize: 12.5, fontWeight: 600 }}
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
          >
            <option value="all">{t('allDates')}</option>
            <option value="today">Today</option>
            <option value="this_month">This Month</option>
            <option value="custom">Custom Range</option>
          </select>

          {dateFilter === 'custom' && (
            <div style={{ display: 'inline-flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
              <input
                className="in"
                type="date"
                style={{ padding: '4px 6px', fontSize: 11.5 }}
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
              />
              <span className="mut" style={{ fontSize: 11 }}>to</span>
              <input
                className="in"
                type="date"
                style={{ padding: '4px 6px', fontSize: 11.5 }}
                value={toDate}
                onChange={e => setToDate(e.target.value)}
              />
            </div>
          )}

          {/* Bill Photo Toggle */}
          <button
            type="button"
            className={`btn sm ${onlyWithImage ? 'pri' : ''}`}
            style={{ fontSize: 12, flexShrink: 0, gap: 5 }}
            onClick={() => setOnlyWithImage(!onlyWithImage)}
            title="Filter invoices with physical bill photos"
          >
            <Ic n="image" s={14} /> Photo {onlyWithImage && '✓'}
          </button>

          <span className="grow" />

          {/* Action: Export Excel Button */}
          <button
            type="button"
            className="btn"
            style={{
              background: '#ECFDF5',
              color: '#065F46',
              borderColor: '#A7F3D0',
              fontWeight: 700,
              fontSize: 13,
              gap: 6,
              flexShrink: 0
            }}
            onClick={handleExportSuppliersExcel}
            title="Download all supplier inward invoices into Excel file (.csv)"
          >
            <Ic n="fileText" s={15} /> {t('exportExcel')}
          </button>

          {/* Action: Enter Inward Bill Button */}
          <button
            className="btn gold"
            style={{ flexShrink: 0, fontSize: 13, gap: 6 }}
            onClick={openInwardModal}
            title="Record new incoming material bill"
          >
            <Ic n="plus" s={15} /> {t('enterInwardBill')}
          </button>
        </div>
      </div>

      {/* VIEW 1: Invoices Grid View */}
      {tab === 'invoices' && (
        <div>
          {filteredInvoices.length === 0 ? (
            <div className="empty" style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--line)', padding: '48px 20px' }}>
              <Ic n="inw" s={36} />
              <h3 style={{ margin: '14px 0 6px', color: 'var(--navy)' }}>
                {inwardInvoices.length === 0 ? 'No inward invoices recorded yet' : 'No invoices match your search filters'}
              </h3>
              <div style={{ fontSize: 13, color: 'var(--mut)', maxWidth: 440, margin: '0 auto 18px' }}>
                {inwardInvoices.length === 0
                  ? 'Start by entering supplier tax invoices. Stock levels, Rate, and GST amounts update automatically.'
                  : 'Try clearing your search query or selecting "All Dates" to see recorded invoices.'}
              </div>
              {inwardInvoices.length === 0 ? (
                <button className="btn gold" onClick={openInwardModal}>
                  <Ic n="plus" s={16} /> Enter First Inward Bill Now
                </button>
              ) : (
                <button className="btn sm" onClick={resetFilters}>Reset filters</button>
              )}
            </div>
          ) : (
            <div className="inv-grid">
              {filteredInvoices.map(inv => {
                const hsns = Array.from(new Set((inv.items || []).map(it => it.hsn).filter(Boolean)));
                return (
                  <div
                    key={inv.id}
                    className="inv-card"
                    style={{ display: 'flex', flexDirection: 'column' }}
                  >
                    <div className="inv-card-head" onClick={() => setSelectedInvoice(inv)} style={{ cursor: 'pointer' }}>
                      <div>
                        <span className="inv-no">INV: {inv.inv}</span>
                        <h4 style={{ marginTop: 6 }}>{inv.supplier}</h4>
                        <div style={{ fontSize: 12, color: 'var(--mut)' }}>
                          Date: <b>{dt(inv.date)}</b> {inv.orderNo ? `· PO: ${inv.orderNo}` : ''}
                        </div>
                      </div>
                      {inv.billImage ? (
                        <div
                          style={{ width: 56, height: 56, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--line)', flexShrink: 0, position: 'relative' }}
                          onClick={e => {
                            e.stopPropagation();
                            setPreviewImage({ src: inv.billImage, title: `Invoice #${inv.inv}`, supplier: inv.supplier });
                          }}
                          title="Click to view bill image"
                        >
                          <img src={inv.billImage} alt="Receipt thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div style={{ position: 'absolute', bottom: 2, right: 2, background: 'rgba(0,0,0,.6)', color: '#fff', borderRadius: 4, padding: '1px 3px', fontSize: 9 }}>
                            <Ic n="eye" s={10} />
                          </div>
                        </div>
                      ) : (
                        <span className="mut" style={{ fontSize: 11, background: 'var(--steelbg)', padding: '4px 6px', borderRadius: 6 }}>
                          No bill photo
                        </span>
                      )}
                    </div>

                    <div className="inv-card-body" onClick={() => setSelectedInvoice(inv)} style={{ cursor: 'pointer', flex: 1 }}>
                      <div style={{ fontSize: 12.5, marginBottom: 8 }}>
                        <b>{t('productsCount', { n: (inv.items || []).length })}</b>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 100, overflow: 'hidden' }}>
                        {(inv.items || []).slice(0, 3).map((it, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                            <span style={{ color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                              • {getMaterialDisplayName(it, lang)}
                            </span>
                            <span className="mut">{fmt(it.qty)} {it.uom}</span>
                          </div>
                        ))}
                        {(inv.items || []).length > 3 && (
                          <div style={{ fontSize: 11, color: 'var(--mut)', fontStyle: 'italic' }}>
                            + {(inv.items || []).length - 3} more items...
                          </div>
                        )}
                      </div>

                      {/* HSN Badges */}
                      {hsns.length > 0 && (
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 10 }}>
                          {hsns.map(h => (
                            <span key={h} className="tag-hsn">
                              HSN {h}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Card Footer with CRUD Actions: View, Edit, Delete */}
                    <div className="inv-card-foot" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--mut)' }}>{t('totalInvoiceValue')}</div>
                        <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--navy)' }}>
                          {inr(inv.total)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button
                          className="btn sm"
                          style={{ padding: '6px 10px', fontSize: 12 }}
                          onClick={() => setSelectedInvoice(inv)}
                          title="View Invoice Details"
                        >
                          <Ic n="eye" s={13} /> {t('viewAction')}
                        </button>
                        <button
                          className="btn sm"
                          style={{ padding: '6px 10px', fontSize: 12, background: '#EFF6FF', color: '#1E40AF', borderColor: '#BFDBFE' }}
                          onClick={() => handleEdit(inv)}
                          title="Edit Invoice & Inward Stock"
                        >
                          <Ic n="edit" s={13} /> {t('editAction')}
                        </button>
                        <button
                          className="btn sm red"
                          style={{ padding: '6px 10px', fontSize: 12 }}
                          onClick={() => handleStartDelete(inv)}
                          title="Delete Invoice (Requires 6-Digit Code)"
                        >
                          <Ic n="trash" s={13} /> {t('deleteAction')}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: Item Line Receipts View */}
      {tab === 'items' && (
        <div>
          {filteredItemRows.length === 0 ? (
            <div className="empty" style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--line)' }}>
              No material line receipts recorded yet.
            </div>
          ) : (
            <div className="tw">
              <table>
                <thead>
                  <tr>
                    <th>Ref</th>
                    <th>Date</th>
                    <th>Invoice No</th>
                    <th>Supplier</th>
                    <th>Material Description</th>
                    <th>HSN Code</th>
                    <th className="r">Quantity</th>
                    <th className="r">Rate (₹)</th>
                    <th className="r">Without GST (₹)</th>
                    <th className="r">GST %</th>
                    <th className="r">With GST (₹)</th>
                    <th>Photo</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItemRows.slice(0, visibleCount).map((row, idx) => (
                    <tr key={row.rowKey}>
                      <td className="mut" style={{ fontSize: 12 }}>#{idx + 1}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{dt(row.date)}</td>
                      <td>
                        <span
                          className="inv-no"
                          style={{ cursor: 'pointer' }}
                          onClick={() => setSelectedInvoice(row.invoiceRef)}
                        >
                          {row.invNo}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{row.supplier}</td>
                      <td style={{ fontWeight: 700, color: 'var(--navy)' }}>{getMaterialDisplayName(row, lang)}</td>
                      <td><span className="tag-hsn">{row.hsn || '-'}</span></td>
                      <td className="r"><b>{fmt(row.qty)}</b> {row.uom}</td>
                      <td className="r">{fmt(row.rate)}</td>
                      <td className="r"><b>{fmt(row.taxableAmt)}</b></td>
                      <td className="r">{(row.taxPct !== undefined && row.taxPct !== null && row.taxPct !== '') ? row.taxPct : 18}%</td>
                      <td className="r"><b style={{ color: 'var(--navy)' }}>{fmt(row.totalAmt)}</b></td>
                      <td>
                        {row.billImage ? (
                          <button
                            className="btn sm"
                            style={{ padding: '3px 7px', fontSize: 11 }}
                            onClick={() => {
                              setPreviewImage({
                                src: row.billImage,
                                title: `Invoice #${row.invNo}`,
                                supplier: row.supplier
                              });
                            }}
                          >
                            <Ic n="image" s={13} /> View
                          </button>
                        ) : (
                          <span className="mut" style={{ fontSize: 11 }}>-</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: 4 }}>
                          <button
                            className="btn sm"
                            style={{ padding: '4px 8px', fontSize: 11 }}
                            onClick={() => handleEdit(row.invoiceRef)}
                            title="Edit Inward Invoice"
                          >
                            <Ic n="edit" s={12} />
                          </button>
                          <button
                            className="btn sm red"
                            style={{ padding: '4px 8px', fontSize: 11 }}
                            onClick={() => handleStartDelete(row.invoiceRef)}
                            title="Delete Inward Invoice"
                          >
                            <Ic n="trash" s={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredItemRows.length > visibleCount && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button
                className="btn"
                onClick={() => setVisibleCount(visibleCount + 100)}
              >
                Load More ({filteredItemRows.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>
      )}

      {/* Invoice Detail Inspection Modal */}
      {selectedInvoice && (
        <Modal
          title={`Invoice: ${selectedInvoice.inv}`}
          subtitle={`${selectedInvoice.supplier} · Date: ${dt(selectedInvoice.date)}`}
          size="wide"
          onClose={() => setSelectedInvoice(null)}
          actions={
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                className="btn sm"
                style={{ background: '#EFF6FF', color: '#1E40AF', borderColor: '#BFDBFE' }}
                onClick={() => {
                  const invToEdit = selectedInvoice;
                  setSelectedInvoice(null);
                  handleEdit(invToEdit);
                }}
              >
                <Ic n="edit" s={14} /> Edit Invoice
              </button>
              <button
                className="btn sm red"
                onClick={() => {
                  const invToDelete = selectedInvoice;
                  handleStartDelete(invToDelete);
                }}
              >
                <Ic n="trash" s={14} /> Delete
              </button>
              {selectedInvoice.billImage && (
                <button
                  className="btn sm gold"
                  onClick={() => setPreviewImage({
                    src: selectedInvoice.billImage,
                    title: `Invoice #${selectedInvoice.inv}`,
                    supplier: selectedInvoice.supplier
                  })}
                >
                  <Ic n="image" s={14} /> Physical Bill
                </button>
              )}
            </div>
          }
        >
          <div>
            {/* Header info */}
            <div className="three" style={{ background: 'var(--steelbg)', padding: 14, borderRadius: 12, marginBottom: 16 }}>
              <div>
                <small className="mut">Supplier</small>
                <b style={{ display: 'block', fontSize: 14 }}>{selectedInvoice.supplier}</b>
                {selectedInvoice.supplierGst && (
                  <div style={{ fontSize: 12, color: 'var(--mut)' }}>GSTIN: {selectedInvoice.supplierGst}</div>
                )}
              </div>
              <div>
                <small className="mut">Invoice No &amp; Date</small>
                <b style={{ display: 'block', fontSize: 14 }}>{selectedInvoice.inv}</b>
                <div style={{ fontSize: 12, color: 'var(--mut)' }}>{dt(selectedInvoice.date)}</div>
              </div>
              <div>
                <small className="mut">Total Inward Value</small>
                <b style={{ display: 'block', fontSize: 18, color: 'var(--navy)' }}>{inr(selectedInvoice.total)}</b>
                <div style={{ fontSize: 12, color: 'var(--grn)' }}>Stock inventory reconciled</div>
              </div>
            </div>

            {/* Bill Image Thumbnail Strip if present */}
            {selectedInvoice.billImage && (
              <div style={{ marginBottom: 16, display: 'flex', gap: 14, alignItems: 'center', background: '#F8FAFD', border: '1px solid var(--line)', borderRadius: 12, padding: 12 }}>
                <img
                  src={selectedInvoice.billImage}
                  alt="Bill preview"
                  style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', border: '1px solid var(--line)' }}
                  onClick={() => setPreviewImage({
                    src: selectedInvoice.billImage,
                    title: `Invoice #${selectedInvoice.inv}`,
                    supplier: selectedInvoice.supplier
                  })}
                />
                <div style={{ flex: 1 }}>
                  <b style={{ color: 'var(--navy)' }}>Original Bill / Invoice Attached</b>
                  <div style={{ fontSize: 12, color: 'var(--mut)', marginTop: 2 }}>
                    Click the thumbnail to inspect full invoice photo, check tax seal, signature, and HSN codes.
                  </div>
                </div>
                <button
                  className="btn sm"
                  onClick={() => setPreviewImage({
                    src: selectedInvoice.billImage,
                    title: `Invoice #${selectedInvoice.inv}`,
                    supplier: selectedInvoice.supplier
                  })}
                >
                  <Ic n="eye" s={14} /> Full View
                </button>
              </div>
            )}

            {/* Items Table */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Materials Received ({selectedInvoice.items?.length || 0}):</div>
              <div className="tw" style={{ maxHeight: 300 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Material Description</th>
                      <th>Category</th>
                      <th>HSN</th>
                      <th className="r">Quantity</th>
                      <th className="r">Rate (₹)</th>
                      <th className="r">Without GST (₹)</th>
                      <th className="r">GST %</th>
                      <th className="r">With GST (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedInvoice.items || []).map((it, idx) => {
                      const qty = Number(it.qty) || 0;
                      const rate = Number(it.rate) || 0;
                      const taxable = it.taxableAmt || (qty * rate);
                      const total = it.totalAmt || taxable;

                      return (
                        <tr key={idx}>
                          <td style={{ fontWeight: 700, whiteSpace: 'normal' }}>{getMaterialDisplayName(it, lang)}</td>
                          <td>{it.cat || 'Steel'}</td>
                          <td><span className="tag-hsn">{it.hsn || '-'}</span></td>
                          <td className="r"><b>{fmt(it.qty)}</b> {it.uom}</td>
                          <td className="r">{fmt(it.rate)}</td>
                          <td className="r"><b>{fmt(taxable)}</b></td>
                          <td className="r">{(it.taxPct !== undefined && it.taxPct !== null && it.taxPct !== '') ? it.taxPct : ((it.gst !== undefined && it.gst !== null && it.gst !== '') ? it.gst : 18)}%</td>
                          <td className="r"><b style={{ color: 'var(--navy)' }}>{fmt(total)}</b></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tax & Total Summary */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--line)', paddingTop: 12 }}>
              <div style={{ width: 280 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                  <span className="mut">Without GST (Taxable)</span>
                  <b>{inr(selectedInvoice.taxable || 0)}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                  <span className="mut">GST Tax Total</span>
                  <b>{inr(selectedInvoice.totalTax || 0)}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid var(--navy)', paddingTop: 6, marginTop: 4, fontSize: 16 }}>
                  <b>With GST (Grand Total)</b>
                  <b style={{ color: 'var(--navy)' }}>{inr(selectedInvoice.total)}</b>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* 6-DIGIT RANDOM CODE DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <Modal
          title="Delete Inward Invoice"
          subtitle={`Invoice #${deleteTarget.inv} from ${deleteTarget.supplier}`}
          onClose={handleCancelDelete}
        >
          <div style={{ padding: '8px 0' }}>
            <div style={{
              background: '#FEF2F2',
              border: '1.5px solid #F87171',
              borderRadius: 12,
              padding: '16px',
              marginBottom: 18
            }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ color: '#DC2626', marginTop: 2 }}>
                  <Ic n="alert" s={22} />
                </div>
                <div>
                  <b style={{ color: '#991B1B', fontSize: 15 }}>
                    Are you sure you want to delete this inward invoice?
                  </b>
                  <div style={{ fontSize: 13, color: '#7F1D1D', marginTop: 4 }}>
                    Invoice <b>#{deleteTarget.inv}</b> from <b>{deleteTarget.supplier}</b> ({inr(deleteTarget.total)}) will be permanently deleted.
                  </div>
                  <div style={{ fontSize: 12.5, color: '#B91C1C', marginTop: 6, fontWeight: 600 }}>
                    ⚠️ All received material quantities recorded in this bill will be automatically deducted and rolled back from your stock inventory.
                  </div>
                </div>
              </div>
            </div>

            {/* 6-Digit Random Code Authorization Box */}
            <div style={{
              background: '#F9FAFB',
              border: '1.5px solid #E5E7EB',
              borderRadius: 12,
              padding: '18px',
              textAlign: 'center',
              marginBottom: 20
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--mut)', marginBottom: 8 }}>
                To authorize deletion, please type the 6-digit confirmation code below:
              </div>

              {/* Display Generated 6-Digit Code */}
              <div style={{
                display: 'inline-block',
                background: '#1E293B',
                color: '#F8FAFC',
                fontFamily: 'monospace',
                fontSize: 26,
                fontWeight: 900,
                letterSpacing: 6,
                padding: '10px 24px',
                borderRadius: 8,
                marginBottom: 14,
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
              }}>
                {deleteCode}
              </div>

              {/* Input for user to type the 6-digit code */}
              <div>
                <input
                  className="in"
                  placeholder="Enter 6 digits"
                  maxLength={6}
                  value={typedCode}
                  onChange={e => setTypedCode(e.target.value.replace(/\D/g, ''))}
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    letterSpacing: 6,
                    textAlign: 'center',
                    width: 180,
                    border: typedCode === deleteCode ? '2px solid #16A34A' : '1.5px solid var(--line)',
                    background: typedCode === deleteCode ? '#F0FDF4' : '#fff'
                  }}
                  autoFocus
                />
              </div>

              {typedCode && typedCode !== deleteCode && (
                <div style={{ fontSize: 12, color: '#DC2626', marginTop: 6 }}>
                  Code does not match. Enter <b>{deleteCode}</b>.
                </div>
              )}
              {typedCode === deleteCode && (
                <div style={{ fontSize: 12, color: '#16A34A', marginTop: 6, fontWeight: 700 }}>
                  ✓ Code verified. You can now permanently delete.
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                className="btn"
                type="button"
                onClick={handleCancelDelete}
              >
                Cancel
              </button>
              <button
                className="btn red"
                type="button"
                disabled={typedCode.trim() !== deleteCode}
                onClick={handleConfirmDelete}
                style={{
                  opacity: typedCode.trim() === deleteCode ? 1 : 0.5,
                  cursor: typedCode.trim() === deleteCode ? 'pointer' : 'not-allowed'
                }}
              >
                <Ic n="trash" s={15} /> Yes, Delete Invoice &amp; Revert Stock
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Full Screen Bill Image Lightbox */}
      {previewImage && (
        <BillLightbox
          src={previewImage.src}
          title={previewImage.title}
          supplier={previewImage.supplier}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  );
}
