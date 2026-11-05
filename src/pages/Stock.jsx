import { useState, useMemo, useEffect } from 'react';
import { fmt, inr, exportToExcel, getMaterialDisplayName, inferTamilName } from '../utils';
import Ic from '../components/Icon';
import Pill from '../components/Pill';
import Modal from '../components/Modal';
import CategoryUomModal from '../components/CategoryUomModal';
import { COMMON_HSN_CODES } from '../data/categories';
import { useLanguage } from '../context/LanguageContext';

export default function Stock({
  items,
  setItems,
  filter,
  setFilter,
  open,
  toast,
  categories = [],
  setCategories,
  uoms = [],
  setUoms,
  openInwardModal
}) {
  const { t, lang } = useLanguage();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [statusFilter, setStatusFilter] = useState(() => (filter === 'low' || filter === 'out' || filter === 'in') ? filter : 'all');
  const [add, setAdd] = useState(false);
  const [manageCatUom, setManageCatUom] = useState(false);

  // Sync with incoming filter prop (e.g. from Dashboard or Bell alerts)
  useEffect(() => {
    if (filter) {
      setStatusFilter(filter);
    }
  }, [filter]);

  // Compute stock status counts
  const statusCounts = useMemo(() => {
    let inCount = 0;
    let lowCount = 0;
    let outCount = 0;
    items.forEach(i => {
      if (i.status === 'out') outCount++;
      else if (i.status === 'low') lowCount++;
      else inCount++;
    });
    return {
      all: items.length,
      in: inCount,
      low: lowCount,
      out: outCount
    };
  }, [items]);

  // Pagination State (Supports 25, 50, 80, 100, 150, 200, All)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // CRUD: Edit State
  const [editItem, setEditItem] = useState(null);

  // CRUD: Delete Confirmation State with 6-Digit Code
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleteCode, setDeleteCode] = useState('');
  const [typedCode, setTypedCode] = useState('');

  // Form for new item
  const [f, setF] = useState({
    name: '',
    nameTa: '',
    cat: categories[0] || 'Steel',
    hsn: '7214',
    uom: uoms[0] || 'NOS',
    qty: '',
    min: '',
    rate: '',
    gst: 18
  });

  const rows = useMemo(() => {
    return items.filter(i => {
      // Category filter
      if (cat !== 'All' && i.cat !== cat) return false;

      // Status filter (All, In Stock, Low Stock, Out of Stock)
      if (statusFilter === 'in' && i.status !== 'ok') return false;
      if (statusFilter === 'low' && i.status !== 'low') return false;
      if (statusFilter === 'out' && i.status !== 'out') return false;

      // Query (Name English/Tamil, Inferred Tamil, ID, HSN, Category)
      if (q.trim()) {
        const query = q.toLowerCase();
        const str = `${i.name || ''} ${i.nameTa || ''} ${inferTamilName(i.name) || ''} ${i.id || ''} ${i.hsn || ''} ${i.cat || ''}`.toLowerCase();
        if (!str.includes(query)) return false;
      }

      return true;
    });
  }, [items, cat, statusFilter, q]);

  // Reset to page 1 whenever search query, category filter, or status filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [q, cat, statusFilter]);

  // Pagination Calculations
  const totalItems = rows.length;
  const isAll = pageSize === 'All';
  const limit = isAll ? totalItems : Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(totalItems / (limit || 1)));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = isAll ? 0 : (validPage - 1) * limit;
  const endIndex = isAll ? totalItems : Math.min(startIndex + limit, totalItems);

  const displayedRows = useMemo(() => {
    if (isAll) return rows;
    return rows.slice(startIndex, endIndex);
  }, [rows, isAll, startIndex, endIndex]);

  const goToPage = (p) => {
    const target = Math.min(Math.max(1, p), totalPages);
    setCurrentPage(target);
  };

  // Smart page numbers array for pagination bar
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (validPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (validPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', validPage - 1, validPage, validPage + 1, '...', totalPages];
  }, [validPage, totalPages]);

  // CRUD: Create (Add Item)
  const handleSaveItem = () => {
    if (!f.name.trim()) {
      toast('Please enter material name');
      return;
    }

    const id = 'SVS-' + String(items.length + 1).padStart(3, '0');
    const normName = f.name.trim().toUpperCase();
    const newItem = {
      id,
      name: normName,
      nameTa: f.nameTa?.trim() || inferTamilName(normName),
      cat: f.cat || categories[0] || 'Steel',
      hsn: f.hsn.trim() || '7214',
      uom: (f.uom || uoms[0] || 'NOS').toUpperCase(),
      recv: +f.qty || 0,
      issued: 0,
      min: +f.min || 0,
      rate: +f.rate || 0,
      gst: (f.gst !== undefined && f.gst !== '' && !isNaN(f.gst)) ? Number(f.gst) : 18,
      last: new Date().toISOString().slice(0, 10)
    };

    setItems([...items, newItem]);
    setAdd(false);
    setF({
      name: '',
      nameTa: '',
      cat: categories[0] || 'Steel',
      hsn: '7214',
      uom: uoms[0] || 'NOS',
      qty: '',
      min: '',
      rate: '',
      gst: 18
    });
    toast(`Material ${newItem.name} added to stock inventory`);
  };

  // CRUD: Start Edit
  const handleStartEdit = (item) => {
    setEditItem({
      id: item.id,
      name: item.name || '',
      nameTa: item.nameTa || inferTamilName(item.name || ''),
      cat: item.cat || (categories[0] || 'Steel'),
      hsn: item.hsn || '7214',
      uom: item.uom || (uoms[0] || 'NOS'),
      recv: item.recv || 0,
      min: item.min || 0,
      rate: item.rate || 0,
      gst: (item.gst !== undefined && item.gst !== null && !isNaN(item.gst)) ? Number(item.gst) : 18
    });
  };

  // CRUD: Save Edit (Update)
  const handleSaveEdit = () => {
    if (!editItem || !editItem.name.trim()) {
      toast('Material name cannot be empty');
      return;
    }

    const normName = editItem.name.trim().toUpperCase();
    setItems(items.map(item => {
      if (item.id === editItem.id) {
        return {
          ...item,
          name: normName,
          nameTa: editItem.nameTa?.trim() || item.nameTa || inferTamilName(normName),
          cat: editItem.cat,
          hsn: editItem.hsn.trim(),
          uom: editItem.uom,
          recv: +editItem.recv || 0,
          min: +editItem.min || 0,
          rate: +editItem.rate || 0,
          gst: (editItem.gst !== undefined && editItem.gst !== '' && !isNaN(editItem.gst)) ? Number(editItem.gst) : 18,
          last: new Date().toISOString().slice(0, 10)
        };
      }
      return item;
    }));

    const updatedName = editItem.name;
    setEditItem(null);
    toast(`Material ${updatedName} updated successfully!`);
  };

  // CRUD: Start Delete with 6-digit verification code
  const handleStartDelete = (item) => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setDeleteItem(item);
    setDeleteCode(code);
    setTypedCode('');
  };

  // CRUD: Cancel Delete
  const handleCancelDelete = () => {
    setDeleteItem(null);
    setDeleteCode('');
    setTypedCode('');
  };

  // CRUD: Confirm Delete
  const handleConfirmDelete = () => {
    if (!deleteItem) return;
    if (typedCode.trim() !== deleteCode) {
      toast('Verification code does not match!');
      return;
    }

    const delName = deleteItem.name;
    setItems(items.filter(i => i.id !== deleteItem.id));
    handleCancelDelete();
    toast(`Material ${delName} permanently deleted from stock.`);
  };

  // Export Current Filtered Stock to Microsoft Excel (.csv)
  const handleExportStockExcel = () => {
    if (!rows.length) {
      toast('No stock inventory data to export');
      return;
    }
    const exportData = rows.map((i, idx) => {
      const rateNoGst = Number(i.rateWithoutGst ?? i.rate ?? 0);
      const gstVal = (i.gst !== undefined && i.gst !== null && !isNaN(i.gst)) ? Number(i.gst) : 18;
      const rateWithGst = Number(i.rateWithGst ?? (rateNoGst * (1 + gstVal / 100)));
      const inStock = Number(i.stock ?? 0);
      const totalVal = +(inStock * rateWithGst).toFixed(2);
      return {
        'S.No': idx + 1,
        'SVS Product Code': i.id,
        'Material Description': i.name,
        'Material Description (Tamil)': i.nameTa || '',
        'Category': i.cat,
        'HSN Code': i.hsn || '',
        'Unit': i.uom,
        'Rate Excl. GST (₹)': rateNoGst,
        'GST %': `${gstVal}%`,
        'Rate Incl. GST (₹)': rateWithGst,
        'Total Received': i.recv,
        'Total Issued': +(i.recv - inStock).toFixed(2),
        'Current In Stock': inStock,
        'Stock Status': i.status === 'out' ? 'Out of Stock' : i.status === 'low' ? 'Low Stock' : 'In Stock',
        'Stock Valuation (₹)': totalVal
      };
    });
    const success = exportToExcel(`SVS_Stock_Inventory_${new Date().toISOString().slice(0, 10)}`, exportData);
    if (success) toast('Stock inventory exported to Excel successfully!');
  };

  return (
    <div className="stock-page-container">
      {/* Search & Filter Controls Toolbar - FULL SINGLE ROW */}
      <div className="tb" style={{ marginBottom: 12, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: 2 }}>
        {/* Search Input */}
        <div style={{ position: 'relative', width: 230, minWidth: 180, flexShrink: 0 }}>
          <span style={{ position: 'absolute', left: 11, top: 11, color: 'var(--mut)' }}>
            <Ic n="search" s={15} />
          </span>
          <input
            className="in"
            style={{ width: '100%', paddingLeft: 34 }}
            placeholder={t('searchStockPlaceholder')}
            value={q}
            onChange={e => setQ(e.target.value)}
            aria-label="Search stock"
          />
        </div>

        {/* Category Filter Dropdown */}
        <select
          className="in"
          value={cat}
          onChange={e => setCat(e.target.value)}
          aria-label="Filter by Category"
          style={{ width: 175, flexShrink: 0 }}
        >
          <option value="All">{t('allCategoriesCount', { n: categories.length })}</option>
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Stock Status Filter Dropdown */}
        <select
          className="in"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          aria-label="Filter by Stock Status"
          style={{
            width: 165,
            flexShrink: 0,
            fontWeight: 700,
            color: statusFilter === 'out' ? 'var(--red)' : statusFilter === 'low' ? 'var(--amb)' : 'var(--navy)',
            borderColor: statusFilter === 'out' ? '#FCA5A5' : statusFilter === 'low' ? '#FDE68A' : 'var(--line)'
          }}
        >
          <option value="all">{t('allStatusCount', { n: statusCounts.all })}</option>
          <option value="in">{t('inStockCount', { n: statusCounts.in })}</option>
          <option value="low">{t('lowStockCount', { n: statusCounts.low })}</option>
          <option value="out">{t('outOfStockCountFilter', { n: statusCounts.out })}</option>
        </select>

        <span className="grow" />

        {/* Action Buttons: Categories, Export Excel, Inward Update, Add Item */}
        <button
          className="btn"
          style={{ fontSize: 13, gap: 6, flexShrink: 0 }}
          onClick={() => setManageCatUom(true)}
          title="Create, edit, or delete Categories & Units of Measure"
        >
          <Ic n="tag" s={15} /> {t('categoriesAndUnits')}
        </button>

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
          onClick={handleExportStockExcel}
          title="Download all filtered stock inventory as Excel file (.csv)"
        >
          <Ic n="fileText" s={15} /> {t('exportExcel')}
        </button>

        <button
          className="btn"
          style={{ background: 'var(--navy)', color: '#fff', borderColor: 'var(--navy)', fontSize: 13, flexShrink: 0 }}
          onClick={openInwardModal}
          title="Inward bill entry & automatic stock update"
        >
          <Ic n="inw" s={15} /> {t('inwardStockUpdate')}
        </button>

        <button className="btn gold" style={{ flexShrink: 0 }} onClick={() => setAdd(true)}>
          <Ic n="plus" s={16} /> {t('addItemBtn')}
        </button>
      </div>

      {/* Stock Items Table Card with Pinned Bottom Pagination */}
      <div className="stock-table-card">
        <div className="stock-table-scroll">
          <table>
            <thead>
              <tr>
                <th>{t('colHsnCode')}</th>
                <th>{t('colMaterialDesc')}</th>
                <th>{t('colCategory')}</th>
                <th>{t('colUnit')}</th>
                <th className="r">{t('colWithoutGst')}</th>
                <th className="r">{t('colWithGst')}</th>
                <th className="r">{t('colReceived')}</th>
                <th className="r">{t('colIssued')}</th>
                <th className="r">{t('colInStock')}</th>
                <th>{t('colStatus')}</th>
                <th style={{ textAlign: 'center', width: 140 }}>{t('colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {displayedRows.map(i => {
                const rateNoGst = Number(i.rateWithoutGst ?? i.rate ?? 0);
                const gstVal = (i.gst !== undefined && i.gst !== null && !isNaN(i.gst)) ? Number(i.gst) : 18;
                const rateWithGst = Number(i.rateWithGst ?? (rateNoGst * (1 + gstVal / 100)));

                return (
                  <tr
                    key={i.id}
                    className={'cl ' + (i.status === 'ok' ? '' : i.status + 'row')}
                    onClick={() => open(i.id)}
                  >
                    <td>
                      <span className="tag-hsn" style={{ fontSize: 12.5, fontWeight: 800 }}>
                        {i.hsn || '—'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, whiteSpace: 'normal', minWidth: 220 }}>
                      <div style={{ fontSize: 13.5, color: 'var(--ink)' }}>
                        {getMaterialDisplayName(i, lang)}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--mut)', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontWeight: 700, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span>{i.id}</span>
                        {lang === 'ta' && i.name && (i.nameTa || inferTamilName(i.name)) && (
                          <span style={{ color: 'var(--mut)', fontWeight: 500, opacity: 0.85 }}>• {i.name}</span>
                        )}
                        {lang === 'en' && (i.nameTa || inferTamilName(i.name)) && (
                          <span style={{ color: 'var(--mut)', fontWeight: 500, opacity: 0.85 }}>• {i.nameTa || inferTamilName(i.name)}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{i.cat}</span>
                    </td>
                    <td className="mut">{i.uom}</td>
                    <td className="r">
                      <b>{inr(rateNoGst)}</b>
                    </td>
                    <td className="r">
                      <b style={{ color: 'var(--navy)' }}>{inr(rateWithGst)}</b>
                      <div style={{ fontSize: 10.5, color: 'var(--mut)' }}>({gstVal}% GST)</div>
                    </td>
                    <td className="r">{fmt(i.recv)}</td>
                    <td className="r">{fmt(i.recv - i.stock)}</td>
                    <td className="r">
                      <b style={{ fontSize: 14.5, color: i.status === 'out' ? 'var(--red)' : i.status === 'low' ? 'var(--amb)' : 'var(--navy)' }}>
                        {fmt(i.stock)}
                      </b>
                    </td>
                    <td>
                      <Pill s={i.status} />
                    </td>

                    {/* CRUD Row Actions: View, Edit, Delete */}
                    <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>
                        <button
                          className="btn sm"
                          style={{ padding: '4px 7px', fontSize: 11 }}
                          onClick={() => open(i.id)}
                          title="View Details"
                        >
                          <Ic n="eye" s={13} />
                        </button>
                        <button
                          className="btn sm"
                          style={{ padding: '4px 7px', fontSize: 11, background: '#EFF6FF', color: '#1E40AF', borderColor: '#BFDBFE' }}
                          onClick={() => handleStartEdit(i)}
                          title="Edit Material"
                        >
                          <Ic n="edit" s={13} />
                        </button>
                        <button
                          className="btn sm red"
                          style={{ padding: '4px 7px', fontSize: 11 }}
                          onClick={() => handleStartDelete(i)}
                          title="Delete Material (Requires 6-digit code)"
                        >
                          <Ic n="trash" s={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {rows.length === 0 && (
            <div className="empty" style={{ padding: '48px 20px' }}>
              <Ic n="box" s={36} />
              <h3 style={{ margin: '14px 0 6px', color: 'var(--navy)' }}>
                {items.length === 0 ? 'No stock materials in inventory yet' : 'No items match your filter criteria'}
              </h3>
              <div style={{ fontSize: 13, color: 'var(--mut)', maxWidth: 460, margin: '0 auto 18px' }}>
                {items.length === 0
                  ? 'You can add stock materials manually using "+ Add Item" or record an incoming supplier invoice using "Inward Stock Update".'
                  : 'Try resetting your category or search filter to view all materials.'}
              </div>
              {items.length === 0 ? (
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  <button className="btn gold" onClick={() => setAdd(true)}>
                    <Ic n="plus" s={16} /> + Add Item Manually
                  </button>
                  <button className="btn" style={{ background: 'var(--navy)', color: '#fff', borderColor: 'var(--navy)' }} onClick={openInwardModal}>
                    <Ic n="truck" s={16} /> Enter Inward Bill
                  </button>
                </div>
              ) : (
                <button className="btn sm" onClick={() => { setCat('All'); setQ(''); }}>
                  Reset Filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Bottom Pagination Toolbar (Next/Previous & Rows List 25, 50, 80, 100, 150, 200, All) ── */}
        {totalItems > 0 && (
          <div className="stock-pagination-bar">
            {/* Left: Range Summary */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--mut)', fontWeight: 600 }}>
              <span style={{ color: 'var(--navy)', fontWeight: 800 }}>
                {t('showingMaterialsCount', {
                  from: isAll ? 1 : Math.min(startIndex + 1, totalItems),
                  to: endIndex,
                  total: totalItems
                })}
              </span>
              {rows.length !== items.length && (
                <span style={{ fontSize: 11.5, background: 'var(--steelbg2)', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                  ({items.length} total)
                </span>
              )}
            </div>

            {/* Right: Rows per page selector + Next/Previous controls */}
            <div className="stock-pagination-controls">
              {/* Rows Per Page Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--mut)' }}>{t('rowsPerPage')}</span>
                <select
                  className="stock-page-select"
                  value={pageSize}
                  onChange={e => {
                    const val = e.target.value === 'All' ? 'All' : Number(e.target.value);
                    setPageSize(val);
                    setCurrentPage(1);
                  }}
                  title="Select number of items displayed per page"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={80}>80</option>
                  <option value={100}>100</option>
                  <option value={150}>150</option>
                  <option value={200}>200</option>
                  <option value="All">All ({totalItems})</option>
                </select>
              </div>

              {/* Next & Previous Buttons & Number Pills */}
              {!isAll && totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {/* First Page */}
                  <button
                    type="button"
                    className="stock-page-btn"
                    disabled={validPage <= 1}
                    onClick={() => goToPage(1)}
                    title="First Page"
                  >
                    «
                  </button>

                  {/* Previous Button */}
                  <button
                    type="button"
                    className="stock-page-btn"
                    disabled={validPage <= 1}
                    onClick={() => goToPage(validPage - 1)}
                    title="Previous Page"
                  >
                    ‹ Previous
                  </button>

                  {/* Numbered Page Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, margin: '0 2px' }}>
                    {pageNumbers.map((p, idx) => {
                      if (p === '...') {
                        return (
                          <span key={'ellipsis-' + idx} style={{ padding: '0 4px', color: 'var(--mut)', fontWeight: 800 }}>
                            &hellip;
                          </span>
                        );
                      }
                      const isCurrent = p === validPage;
                      return (
                        <button
                          key={'page-' + p}
                          type="button"
                          className={`stock-page-btn ${isCurrent ? 'active' : ''}`}
                          onClick={() => goToPage(p)}
                          title={`Page ${p}`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>

                  {/* Next Button */}
                  <button
                    type="button"
                    className="stock-page-btn"
                    disabled={validPage >= totalPages}
                    onClick={() => goToPage(validPage + 1)}
                    title="Next Page"
                  >
                    Next ›
                  </button>

                  {/* Last Page */}
                  <button
                    type="button"
                    className="stock-page-btn"
                    disabled={validPage >= totalPages}
                    onClick={() => goToPage(totalPages)}
                    title="Last Page"
                  >
                    »
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CRUD: Add Material Modal */}
      {add && (
        <Modal title="Add New Stock Material" onClose={() => setAdd(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <label className="fl">
                <span>Material / Product Name (English) *</span>
                <input
                  className="in"
                  value={f.name}
                  onChange={e => {
                    const newName = e.target.value;
                    const autoTa = (!f.nameTa || f.nameTa === inferTamilName(f.name)) ? inferTamilName(newName) : f.nameTa;
                    setF({ ...f, name: newName, nameTa: autoTa });
                  }}
                  placeholder="e.g. TMT BARS 32MM or NAILS 2/8"
                  autoFocus
                />
              </label>

              <label className="fl">
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>Tamil Name (தமிழில் பொருள் பெயர்)</span>
                  <span style={{ fontSize: 9.5, background: '#FEF3C7', color: '#92400E', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>தமிழ்</span>
                </span>
                <input
                  className="in"
                  style={{ fontFamily: "'Mukta Malar', 'Plus Jakarta Sans', sans-serif" }}
                  value={f.nameTa}
                  onChange={e => setF({ ...f, nameTa: e.target.value })}
                  placeholder="e.g. டிஎம்டி கம்பிகள் 32மிமீ"
                />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <label className="fl">
                <span>Category *</span>
                <select
                  className="in"
                  value={f.cat}
                  onChange={e => setF({ ...f, cat: e.target.value })}
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>

              <label className="fl">
                <span>HSN / SAC Code</span>
                <input
                  className="in"
                  list="stock-hsn-list"
                  placeholder="e.g. 7214"
                  value={f.hsn}
                  onChange={e => setF({ ...f, hsn: e.target.value })}
                />
                <datalist id="stock-hsn-list">
                  {COMMON_HSN_CODES.map(h => (
                    <option key={h.code} value={h.code}>{h.code} - {h.desc}</option>
                  ))}
                </datalist>
              </label>
            </div>

            <div className="form-grid-2" style={{ marginTop: 6 }}>
              <label className="fl">
                <span>Unit of Measure (UoM)</span>
                <select
                  className="in"
                  value={f.uom}
                  onChange={e => setF({ ...f, uom: e.target.value })}
                >
                  {uoms.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </label>

              <label className="fl">
                <span>Opening Quantity</span>
                <input
                  className="in"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={f.qty}
                  onChange={e => setF({ ...f, qty: e.target.value })}
                />
              </label>

              <label className="fl">
                <span>Minimum Alert Level</span>
                <input
                  className="in"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={f.min}
                  onChange={e => setF({ ...f, min: e.target.value })}
                />
              </label>

              <label className="fl">
                <span>Without GST Rate (₹)</span>
                <input
                  className="in"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={f.rate}
                  onChange={e => setF({ ...f, rate: e.target.value })}
                />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <label className="fl">
                <span>GST Tax %</span>
                <select
                  className="in"
                  value={f.gst}
                  onChange={e => setF({ ...f, gst: +e.target.value })}
                >
                  {[0, 5, 12, 18, 28].map(g => (
                    <option key={g} value={g}>{g}%</option>
                  ))}
                </select>
              </label>

              <div>
                <small className="mut" style={{ display: 'block', fontSize: 11, marginBottom: 4 }}>
                  Computed With GST Rate
                </small>
                <div style={{ padding: '8px 12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid var(--line)', fontWeight: 800, color: 'var(--navy)', fontSize: 16 }}>
                  {inr(+((+f.rate || 0) * (1 + ((f.gst !== undefined && f.gst !== '' && !isNaN(f.gst)) ? Number(f.gst) : 18) / 100)).toFixed(2))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button className="btn" onClick={() => setAdd(false)}>
                Cancel
              </button>
              <button className="btn pri" onClick={handleSaveItem}>
                Save Material to Stock
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* CRUD: Edit Material Modal */}
      {editItem && (
        <Modal title={`Edit Material: ${editItem.name}`} subtitle={`Item Code: ${editItem.id}`} onClose={() => setEditItem(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <label className="fl">
                <span>Material / Product Name (English) *</span>
                <input
                  className="in"
                  value={editItem.name}
                  onChange={e => setEditItem({ ...editItem, name: e.target.value })}
                  placeholder="Material Name"
                  autoFocus
                />
              </label>

              <label className="fl">
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>Tamil Name (தமிழில் பொருள் பெயர்)</span>
                  <span style={{ fontSize: 9.5, background: '#FEF3C7', color: '#92400E', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>தமிழ்</span>
                </span>
                <input
                  className="in"
                  style={{ fontFamily: "'Mukta Malar', 'Plus Jakarta Sans', sans-serif" }}
                  value={editItem.nameTa || ''}
                  onChange={e => setEditItem({ ...editItem, nameTa: e.target.value })}
                  placeholder="e.g. டிஎம்டி கம்பிகள் 12மிமீ"
                />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <label className="fl">
                <span>Category *</span>
                <select
                  className="in"
                  value={editItem.cat}
                  onChange={e => setEditItem({ ...editItem, cat: e.target.value })}
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>

              <label className="fl">
                <span>HSN / SAC Code</span>
                <input
                  className="in"
                  list="edit-stock-hsn-list"
                  placeholder="e.g. 7214"
                  value={editItem.hsn}
                  onChange={e => setEditItem({ ...editItem, hsn: e.target.value })}
                />
                <datalist id="edit-stock-hsn-list">
                  {COMMON_HSN_CODES.map(h => (
                    <option key={h.code} value={h.code}>{h.code} - {h.desc}</option>
                  ))}
                </datalist>
              </label>
            </div>

            <div className="form-grid-2" style={{ marginTop: 6 }}>
              <label className="fl">
                <span>Unit of Measure (UoM)</span>
                <select
                  className="in"
                  value={editItem.uom}
                  onChange={e => setEditItem({ ...editItem, uom: e.target.value })}
                >
                  {uoms.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </label>

              <label className="fl">
                <span>Total Received Qty ({editItem.uom})</span>
                <input
                  className="in"
                  type="number"
                  min="0"
                  step="any"
                  value={editItem.recv}
                  onChange={e => setEditItem({ ...editItem, recv: e.target.value })}
                />
              </label>

              <label className="fl">
                <span>Minimum Alert Level</span>
                <input
                  className="in"
                  type="number"
                  min="0"
                  step="any"
                  value={editItem.min}
                  onChange={e => setEditItem({ ...editItem, min: e.target.value })}
                />
              </label>

              <label className="fl">
                <span>Without GST Rate (₹)</span>
                <input
                  className="in"
                  type="number"
                  min="0"
                  step="any"
                  value={editItem.rate}
                  onChange={e => setEditItem({ ...editItem, rate: e.target.value })}
                />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <label className="fl">
                <span>GST Tax %</span>
                <select
                  className="in"
                  value={editItem.gst}
                  onChange={e => setEditItem({ ...editItem, gst: +e.target.value })}
                >
                  {[0, 5, 12, 18, 28].map(g => (
                    <option key={g} value={g}>{g}%</option>
                  ))}
                </select>
              </label>

              <div>
                <small className="mut" style={{ display: 'block', fontSize: 11, marginBottom: 4 }}>
                  Computed With GST Rate
                </small>
                <div style={{ padding: '8px 12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid var(--line)', fontWeight: 800, color: 'var(--navy)', fontSize: 16 }}>
                  {inr(+((+editItem.rate || 0) * (1 + ((editItem.gst !== undefined && editItem.gst !== '' && !isNaN(editItem.gst)) ? Number(editItem.gst) : 18) / 100)).toFixed(2))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button className="btn" onClick={() => setEditItem(null)}>
                Cancel
              </button>
              <button className="btn gold" onClick={handleSaveEdit}>
                <Ic n="check" s={16} /> Update Material
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* CRUD: Delete Confirmation Modal with 6-Digit Code */}
      {deleteItem && (
        <Modal
          title="Delete Stock Material"
          subtitle={`${deleteItem.name} (${deleteItem.id})`}
          onClose={handleCancelDelete}
        >
          <div style={{ padding: '6px 0' }}>
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
                    Are you sure you want to delete this material?
                  </b>
                  <div style={{ fontSize: 13, color: '#7F1D1D', marginTop: 4 }}>
                    Material <b>{deleteItem.name}</b> ({deleteItem.id} &middot; {deleteItem.cat}) will be permanently removed from inventory.
                  </div>
                </div>
              </div>
            </div>

            {/* 6-Digit Code Authorization Box */}
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
                  ✓ Code verified. You can now delete this material.
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
                <Ic n="trash" s={15} /> Yes, Delete Material
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Category & Unit of Measure (UoM) CRUD Manager Modal */}
      {manageCatUom && (
        <CategoryUomModal
          categories={categories}
          setCategories={setCategories}
          uoms={uoms}
          setUoms={setUoms}
          items={items}
          setItems={setItems}
          onClose={() => setManageCatUom(false)}
          toast={toast}
        />
      )}
    </div>
  );
}
