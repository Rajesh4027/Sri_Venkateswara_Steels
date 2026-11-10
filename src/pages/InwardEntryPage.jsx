import { useState, useMemo, useEffect } from 'react';
import Ic from '../components/Icon';
import { InwardMaterialCombobox, InwardTamilMaterialInput } from '../components/MaterialCombobox';
import { fmt, inr, dt, getSupplierMaterials, getMaterialDisplayName, inferTamilName, formatTitleCase, DEFAULT_CATEGORIES_LIST, DEFAULT_UOMS_LIST } from '../utils';
import { COMMON_HSN_CODES, COMMON_UOMS } from '../data/categories';
import { useTranslation } from '../context/LanguageContext';

export default function InwardEntryPage({
  items,
  setItems,
  inwardInvoices,
  setInwardInvoices,
  categories = DEFAULT_CATEGORIES_LIST,
  uoms = DEFAULT_UOMS_LIST,
  go,
  toast,
  editingInvoice = null,
  setEditingInvoice,
  onPreviewImage
}) {
  const { t, lang } = useTranslation();
  const INWARD_DRAFT_KEY = 'svs_inward_supply_draft_v1';

  // Load cached draft helper
  const getInitialDraft = () => {
    if (editingInvoice) return null;
    try {
      const raw = localStorage.getItem(INWARD_DRAFT_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { }
    return null;
  };

  const [initialDraft] = useState(getInitialDraft);
  const [draftRestored, setDraftRestored] = useState(() => !!initialDraft);

  const [invNo, setInvNo] = useState(() => initialDraft?.invNo || '');
  const [invDate, setInvDate] = useState(() => initialDraft?.invDate || new Date().toISOString().slice(0, 10));
  const [supplier, setSupplier] = useState(() => initialDraft?.supplier || '');
  const [supplierGst, setSupplierGst] = useState(() => initialDraft?.supplierGst || '');
  const [orderNo, setOrderNo] = useState(() => initialDraft?.orderNo || '');
  const [notes, setNotes] = useState(() => initialDraft?.notes || '');
  const [billImage, setBillImage] = useState(() => initialDraft?.billImage || null);
  const [filterToSupplierOnly, setFilterToSupplierOnly] = useState(() => initialDraft?.filterToSupplierOnly ?? true);

  const [rows, setRows] = useState(() => {
    if (initialDraft?.rows && initialDraft.rows.length > 0) {
      return initialDraft.rows.map(r => ({
        ...r,
        nameTa: r.nameTa || ''
      }));
    }
    return [
      {
        id: '',
        name: '',
        nameTa: '',
        isNew: items.length === 0,
        cat: (categories && categories[0]) || 'Steel',
        hsn: '',
        uom: (uoms && uoms[0]) || 'NOS',
        qty: 1,
        rate: '',
        gst: 18
      }
    ];
  });

  // Load editingInvoice if provided
  useEffect(() => {
    if (editingInvoice) {
      setInvNo(editingInvoice.inv || '');
      setInvDate(editingInvoice.date || new Date().toISOString().slice(0, 10));
      setSupplier(editingInvoice.supplier || '');
      setSupplierGst(editingInvoice.supplierGst || '');
      setOrderNo(editingInvoice.orderNo || '');
      setNotes(editingInvoice.notes || '');
      setBillImage(editingInvoice.billImage || null);

      if (editingInvoice.items && editingInvoice.items.length > 0) {
        setRows(editingInvoice.items.map(it => {
          const matchItem = items.find(i => (it.id && i.id === it.id) || (i.name && i.name.toUpperCase() === (it.name || '').toUpperCase()));
          return {
            id: matchItem ? matchItem.id : (it.id && it.id !== 'NEW' ? it.id : ''),
            name: it.name || (matchItem && matchItem.name) || '',
            nameTa: it.nameTa || (matchItem && (matchItem.nameTa || matchItem.tamilName)) || '',
            isNew: !matchItem,
            cat: it.cat || (categories && categories[0]) || 'Steel',
            hsn: it.hsn || '',
            uom: it.uom || (uoms && uoms[0]) || 'NOS',
            qty: it.qty || 1,
            rate: it.rate || 0,
            gst: (it.taxPct !== undefined && it.taxPct !== null && it.taxPct !== '' && !isNaN(it.taxPct))
              ? Number(it.taxPct)
              : ((it.gst !== undefined && it.gst !== null && it.gst !== '' && !isNaN(it.gst))
                ? Number(it.gst)
                : (matchItem && matchItem.gst !== undefined ? Number(matchItem.gst) : 18))
          };
        }));
      }
    }
  }, [editingInvoice]);

  // Auto-cache draft whenever any field changes (only when creating a new invoice, not editing existing)
  useEffect(() => {
    if (editingInvoice) return;

    const hasAnyContent =
      invNo.trim() ||
      supplier.trim() ||
      supplierGst.trim() ||
      orderNo.trim() ||
      notes.trim() ||
      billImage ||
      rows.some(r => r.name.trim() || r.id || (r.rate !== '' && Number(r.rate) > 0) || Number(r.qty) > 1);

    if (hasAnyContent) {
      try {
        const draftData = {
          invNo,
          invDate,
          supplier,
          supplierGst,
          orderNo,
          notes,
          billImage,
          filterToSupplierOnly,
          rows,
          updatedAt: Date.now()
        };
        localStorage.setItem(INWARD_DRAFT_KEY, JSON.stringify(draftData));
      } catch (err) {
        // If image exceeded quota, save draft without image
        try {
          const draftData = {
            invNo,
            invDate,
            supplier,
            supplierGst,
            orderNo,
            notes,
            filterToSupplierOnly,
            rows,
            updatedAt: Date.now()
          };
          localStorage.setItem(INWARD_DRAFT_KEY, JSON.stringify(draftData));
        } catch (e) { }
      }
    } else {
      try {
        localStorage.removeItem(INWARD_DRAFT_KEY);
        setDraftRestored(false);
      } catch (e) { }
    }
  }, [invNo, invDate, supplier, supplierGst, orderNo, notes, billImage, filterToSupplierOnly, rows, editingInvoice]);

  // Supplier list for autocomplete (from user's real inward invoices)
  const pastSuppliers = useMemo(() => {
    const s = new Set();
    inwardInvoices.forEach(i => { if (i.supplier) s.add(i.supplier); });
    return Array.from(s);
  }, [inwardInvoices]);

  // Materials supplied by this supplier in the past
  const supplierMaterials = useMemo(() => {
    return getSupplierMaterials(supplier, items, inwardInvoices);
  }, [supplier, items, inwardInvoices]);

  const byId = useMemo(() => Object.fromEntries(items.map(i => [i.id, i])), [items]);

  const setRow = (idx, patch) => {
    setRows(rows.map((r, i) => i === idx ? { ...r, ...patch } : r));
  };

  const handleSelectMaterial = (idx, val) => {
    if (val === '__NEW__') {
      setRow(idx, {
        id: '',
        name: '',
        isNew: true,
        cat: (categories && categories[0]) || 'Steel',
        hsn: '',
        uom: (uoms && uoms[0]) || 'NOS',
        qty: 1,
        rate: 0,
        gst: 18
      });
      return;
    }

    const it = byId[val];
    if (it) {
      setRow(idx, {
        id: it.id,
        name: it.name,
        isNew: false,
        cat: it.cat || (categories && categories[0]) || 'Steel',
        hsn: it.hsn || '',
        uom: it.uom || 'NOS',
        rate: it.rate || 0,
        qty: 1,
        gst: (it.gst !== undefined && it.gst !== null && !isNaN(it.gst)) ? Number(it.gst) : 18
      });
    }
  };

  // Image file handler
  const handleImageFile = e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async evt => {
      const dataUrl = evt.target.result;
      setBillImage(dataUrl);
      toast('✓ Bill photo attached');
    };
    reader.readAsDataURL(file);
  };

  // Live calculation of totals
  const calc = useMemo(() => {
    let taxable = 0;
    let tax = 0;
    const calculatedRows = rows.map(r => {
      const q = Math.max(0, +r.qty || 0);
      const rt = Math.max(0, +r.rate || 0);
      const rowTaxable = +(q * rt).toFixed(2);
      const g = +((rowTaxable * (+r.gst || 0)) / 100).toFixed(2);
      taxable += rowTaxable;
      tax += g;
      return {
        ...r,
        taxableAmt: rowTaxable,
        taxAmt: g,
        totalAmt: +(rowTaxable + g).toFixed(2)
      };
    });
    return {
      rows: calculatedRows,
      taxable,
      tax,
      total: Math.round(taxable + tax)
    };
  }, [rows]);

  const handleSave = () => {
    if (!invNo.trim()) {
      toast(lang === 'ta' ? 'தயவுசெய்து ரசீது எண்ணை உள்ளிடவும்' : 'Please enter Invoice Number');
      return;
    }
    if (!supplier.trim()) {
      toast(lang === 'ta' ? 'தயவுசெய்து சப்ளையர் பெயரை உள்ளிடவும்' : 'Please enter Supplier Name');
      return;
    }
    if (!calc.rows.some(r => ((r.name && r.name.trim()) || (r.nameTa && r.nameTa.trim())) && r.qty > 0)) {
      toast(lang === 'ta' ? 'குறைந்தது ஒரு பொருளையாவது அளவோடு உள்ளிடவும்' : 'Please enter at least one material with quantity');
      return;
    }

    let updatedItems = [...items];
    let nextCodeNum = items.length + 1;

    // If editing existing invoice, first roll back the old received quantities from this invoice
    if (editingInvoice && editingInvoice.items) {
      editingInvoice.items.forEach(oldIt => {
        const oldQty = Number(oldIt.qty) || 0;
        const matchIdx = updatedItems.findIndex(i =>
          (oldIt.id && i.id === oldIt.id) ||
          (i.name && i.name.toUpperCase() === (oldIt.name || '').trim().toUpperCase())
        );
        if (matchIdx >= 0) {
          const target = updatedItems[matchIdx];
          updatedItems[matchIdx] = {
            ...target,
            recv: Math.max(0, +(Number(target.recv || 0) - oldQty).toFixed(2))
          };
        }
      });
    }

    // Now add new incoming quantities and update rates
    calc.rows.forEach(row => {
      const hasEn = Boolean(row.name && row.name.trim());
      const hasTa = Boolean(row.nameTa && row.nameTa.trim());
      if ((!hasEn && !hasTa) || row.qty <= 0) return;

      const normName = hasEn ? row.name.trim().toUpperCase() : row.nameTa.trim();
      const normNameTa = hasTa ? row.nameTa.trim() : '';
      let matchIdx = -1;

      if (row.id) {
        matchIdx = updatedItems.findIndex(i => i.id === row.id);
      }
      if (matchIdx === -1 && normName) {
        matchIdx = updatedItems.findIndex(i => (i.name || '').toUpperCase() === normName);
      }
      if (matchIdx === -1 && normNameTa) {
        matchIdx = updatedItems.findIndex(i => (i.nameTa || '').trim().toLowerCase() === normNameTa.toLowerCase());
      }

      if (matchIdx >= 0) {
        // Existing material -> increase received stock, update rate, hsn, gst, and update both names!
        const target = updatedItems[matchIdx];
        const rowGst = (row.gst !== undefined && row.gst !== '' && !isNaN(row.gst))
          ? Number(row.gst)
          : (target.gst !== undefined ? Number(target.gst) : 18);
        updatedItems[matchIdx] = {
          ...target,
          name: normName || target.name,
          nameTa: normNameTa || target.nameTa || '',
          recv: +(Number(target.recv || 0) + Number(row.qty)).toFixed(2),
          rate: Number(row.rate) > 0 ? Number(row.rate) : target.rate,
          last: invDate,
          hsn: row.hsn || target.hsn,
          cat: row.cat || target.cat,
          gst: rowGst
        };
      } else {
        // New material -> create unified stock item with BOTH English & Tamil names!
        const newId = 'SVS-' + String(nextCodeNum++).padStart(3, '0');
        const rowGst = (row.gst !== undefined && row.gst !== '' && !isNaN(row.gst))
          ? Number(row.gst)
          : 18;
        updatedItems.push({
          id: newId,
          name: normName,
          nameTa: normNameTa,
          cat: row.cat || (categories && categories[0]) || 'Steel',
          hsn: row.hsn || '',
          uom: row.uom || 'NOS',
          recv: +row.qty,
          issued: 0,
          min: Math.ceil(row.qty * 0.2),
          rate: +row.rate || 0,
          gst: rowGst,
          last: invDate
        });
      }
    });

    setItems(updatedItems);

    const invoicePayload = {
      id: editingInvoice ? editingInvoice.id : ('INV-' + Date.now()),
      inv: invNo.trim(),
      date: invDate,
      supplier: supplier.trim(),
      supplierGst: supplierGst.trim(),
      orderNo: orderNo.trim(),
      billImage: billImage,
      taxType: 'GST',
      items: calc.rows.map(r => {
        const rowGst = (r.gst !== undefined && r.gst !== '' && !isNaN(r.gst)) ? Number(r.gst) : 0;
        const rName = (r.name || '').trim().toUpperCase() || (r.nameTa || '').trim();
        return {
          id: r.id || 'NEW',
          name: rName,
          nameTa: (r.nameTa || '').trim(),
          cat: r.cat,
          hsn: r.hsn,
          qty: +r.qty,
          uom: r.uom,
          rate: +r.rate,
          gst: rowGst,
          taxPct: rowGst,
          taxableAmt: r.taxableAmt,
          taxAmt: r.taxAmt,
          totalAmt: r.totalAmt
        };
      }),
      taxable: calc.taxable,
      cgst: +(calc.tax / 2).toFixed(2),
      sgst: +(calc.tax / 2).toFixed(2),
      igst: 0,
      totalTax: +calc.tax.toFixed(2),
      total: calc.total,
      notes: notes.trim(),
      createdAt: editingInvoice ? (editingInvoice.createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (!editingInvoice) {
      try {
        localStorage.removeItem(INWARD_DRAFT_KEY);
      } catch (e) { }
    }

    if (billImage && window.electronAPI?.saveSingleImage) {
      window.electronAPI.saveSingleImage({
        dataUrl: billImage,
        invoiceNo: invNo.trim(),
        invoiceDate: invDate || ''
      }).catch(() => {});
    }

    if (editingInvoice) {
      setInwardInvoices(inwardInvoices.map(inv => inv.id === editingInvoice.id ? invoicePayload : inv));
      if (setEditingInvoice) setEditingInvoice(null);
      toast(`Invoice #${invNo} updated and stock reconciled successfully!`);
    } else {
      setInwardInvoices([invoicePayload, ...inwardInvoices]);
      toast(`Stock updated! Invoice #${invNo} successfully recorded.`);
    }

    go('inward');
  };

  const handleReset = () => {
    if (editingInvoice && setEditingInvoice) {
      setEditingInvoice(null);
    }
    try {
      localStorage.removeItem(INWARD_DRAFT_KEY);
    } catch (e) { }
    setDraftRestored(false);
    setInvNo('');
    setInvDate(new Date().toISOString().slice(0, 10));
    setSupplier('');
    setSupplierGst('');
    setOrderNo('');
    setNotes('');
    setBillImage(null);
    setRows([
      {
        id: '',
        name: '',
        isNew: items.length === 0,
        cat: (categories && categories[0]) || 'Steel',
        hsn: '',
        uom: (uoms && uoms[0]) || 'NOS',
        qty: 1,
        rate: '',
        gst: 18
      }
    ]);
  };

  const handleClearDraft = () => {
    try {
      localStorage.removeItem(INWARD_DRAFT_KEY);
    } catch (e) { }
    setDraftRestored(false);
    setInvNo('');
    setInvDate(new Date().toISOString().slice(0, 10));
    setSupplier('');
    setSupplierGst('');
    setOrderNo('');
    setNotes('');
    setBillImage(null);
    setRows([
      {
        id: '',
        name: '',
        isNew: items.length === 0,
        cat: (categories && categories[0]) || 'Steel',
        hsn: '',
        uom: (uoms && uoms[0]) || 'NOS',
        qty: 1,
        rate: '',
        gst: 18
      }
    ]);
    toast('Draft cleared. Form is ready for new inward entry.');
  };

  return (
    <div>
      {/* Editing State Banner */}
      {editingInvoice && (
        <div style={{
          background: 'linear-gradient(90deg, #EFF6FF, #DBEAFE)',
          border: '1.5px solid #3B82F6',
          borderRadius: 14,
          padding: '14px 20px',
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: '#2563EB', color: '#fff', borderRadius: 8, padding: 8, display: 'flex' }}>
              <Ic n="edit" s={20} />
            </div>
            <div>
              <b style={{ color: '#1E40AF', fontSize: 16 }}>
                Editing Inward Invoice #{editingInvoice.inv} &middot; {editingInvoice.supplier}
              </b>
              <div style={{ color: '#1E3A8A', fontSize: 13, marginTop: 2 }}>
                Modifying materials or quantities will automatically reconcile and update current stock levels.
              </div>
            </div>
          </div>
          <button
            className="btn sm"
            style={{ background: '#fff', color: '#1E3A8A', borderColor: '#BFDBFE' }}
            onClick={() => {
              if (setEditingInvoice) setEditingInvoice(null);
              handleReset();
              go('inward');
            }}
          >
            <Ic n="x" s={14} /> Cancel Editing
          </button>
        </div>
      )}

      {/* Restored Draft Auto-Save Notification */}
      {!editingInvoice && draftRestored && (
        <div style={{
          background: 'linear-gradient(90deg, #F0FDF4, #DCFCE7)',
          border: '1px solid #86EFAC',
          borderRadius: 14,
          padding: '12px 18px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          boxShadow: '0 2px 8px rgba(34, 197, 94, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: '#22C55E',
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Ic n="check" s={16} />
            </span>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#166534' }}>
                Draft Restored from Cache (Auto-Saved)
              </div>
              <div style={{ fontSize: 12, color: '#15803D' }}>
                Your previously entered inward supply details and products have been restored.
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn sm"
            style={{
              background: '#fff',
              color: '#DC2626',
              border: '1px solid #FCA5A5',
              fontWeight: 700,
              fontSize: 12,
              borderRadius: 8,
              cursor: 'pointer'
            }}
            onClick={handleClearDraft}
            title="Discard this draft and start fresh"
          >
            <Ic n="trash" s={13} /> Clear Draft
          </button>
        </div>
      )}

      {/* Page Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--navy)', letterSpacing: '-.02em' }}>
            {editingInvoice ? t('editInwardEntryPageTitle') : t('inwardEntryPageTitle')}
          </h2>
          <div style={{ fontSize: 13.5, color: 'var(--mut)', marginTop: 3 }}>
            {t('inwardEntryPageSubtitle')}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn" onClick={() => {
            if (editingInvoice && setEditingInvoice) setEditingInvoice(null);
            go('inward');
          }}>
            <Ic n="inw" s={15} /> {t('viewSuppliersRegisterBtn')}
          </button>
        </div>
      </div>

      {/* SECTION 1: Supplier & Bill Metadata */}
      <div className="pn" style={{ marginBottom: 22 }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--navy)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Ic n="fileText" s={18} /> {t('invoiceSupplierDetailsTitle')}
        </div>

        <div className="form-grid-4">
          <div className="field-group">
            <label className="field-label">{t('invoiceNoLabel')}</label>
            <input
              className="in"
              placeholder="e.g. 832 or TI-2024-09"
              value={invNo}
              onChange={e => setInvNo(e.target.value)}
              style={{ fontWeight: 700 }}
            />
          </div>

          <div className="field-group">
            <label className="field-label">
              {t('invoiceDateLabel')}{' '}
              <span style={{ fontSize: 11, color: 'var(--mut)', fontWeight: 600 }}>
                (DD-MM-YYYY: {dt(invDate)})
              </span>
            </label>
            <input
              className="in"
              type="date"
              value={invDate}
              onChange={e => setInvDate(e.target.value)}
            />
          </div>

          <div className="field-group">
            <label className="field-label">{t('supplierNameLabel')}</label>
            <input
              className="in"
              list="inward-page-suppliers"
              placeholder="e.g. Palaniappa Thirupathi, Surya"
              value={supplier}
              onChange={e => {
                const val = e.nativeEvent?.isComposing ? e.target.value : formatTitleCase(e.target.value);
                setSupplier(val);
              }}
              onCompositionEnd={e => {
                setSupplier(formatTitleCase(e.target.value));
              }}
              onBlur={e => {
                setSupplier(formatTitleCase(e.target.value.trim()));
              }}
              style={{ fontWeight: 700 }}
            />
            <datalist id="inward-page-suppliers">
              {pastSuppliers.map(s => <option key={s} value={s} />)}
            </datalist>
          </div>

          <div className="field-group">
            <label className="field-label">{t('supplierGstinLabel')}</label>
            <input
              className="in"
              placeholder="e.g. 33AAYFP6556B1ZX"
              value={supplierGst}
              onChange={e => setSupplierGst(e.target.value.toUpperCase())}
            />
          </div>
        </div>

        <div className="form-grid-2" style={{ marginTop: 16 }}>
          <div className="field-group">
            <label className="field-label">{t('poOrderNoOptional')}</label>
            <input
              className="in"
              placeholder="e.g. SVS-PO-2024-001"
              value={orderNo}
              onChange={e => setOrderNo(e.target.value)}
            />
          </div>
          <div className="field-group">
            <label className="field-label">{t('deliveryNotesRemarks')}</label>
            <input
              className="in"
              placeholder="e.g. Lorry freight paid, received in good condition"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: Physical Bill Photo Capture / Upload */}
      <div className="pn" style={{ marginBottom: 22 }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--navy)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Ic n="image" s={18} /> {t('physicalBillPhotoTitle')}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: billImage ? '240px 1fr' : '1fr', gap: 20, alignItems: 'center' }}>
          {billImage && (
            <div className="bill-thumb-wrap" style={{ height: 160 }}>
              <img src={billImage} alt="Uploaded Bill" />
              <div className="bill-thumb-overlay">
                <button
                  className="btn sm gold"
                  type="button"
                  onClick={() => onPreviewImage && onPreviewImage(billImage, `Invoice ${invNo || ''}`, supplier)}
                >
                  <Ic n="eye" s={14} /> {t('fullViewBtn')}
                </button>
                <button
                  className="btn sm red"
                  type="button"
                  onClick={() => setBillImage(null)}
                >
                  <Ic n="trash" s={14} /> {t('removeBtn')}
                </button>
              </div>
            </div>
          )}
          <div>
            <label className="bill-dropzone" style={{ padding: '28px 20px' }}>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={handleImageFile}
              />
              <Ic n="upload" s={34} />
              <div>
                <b style={{ color: 'var(--navy)', fontSize: 15 }}>{t('clickToUploadPhoto')}</b>
                <div style={{ fontSize: 12.5, color: 'var(--mut)', marginTop: 2 }}>
                  {t('captureUploadDesc')}
                </div>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* SECTION 3: Materials & Products in Invoice */}
      <div className="pn" style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--navy)' }}>
              {t('materialsInInvoiceTitle')}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--mut)' }}>
              {supplier.trim() && supplierMaterials.length > 0 && filterToSupplierOnly
                ? t('showingMaterialsSuppliedBy', { s: supplier, n: supplierMaterials.length })
                : t('materialsInInvoiceSubtitle')}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {supplier.trim() && supplierMaterials.length > 0 && (
              <button
                type="button"
                className="btn sm"
                style={{ fontSize: 12 }}
                onClick={() => setFilterToSupplierOnly(!filterToSupplierOnly)}
              >
                {filterToSupplierOnly ? t('showAllMaterialsBtn', { n: items.length }) : t('filterToSupplierBtn', { s: supplier, n: supplierMaterials.length })}
              </button>
            )}
            <button
              className="btn sm gold"
              onClick={() => setRows([...rows, {
                id: '',
                name: '',
                nameTa: '',
                isNew: items.length === 0,
                cat: (categories && categories[0]) || 'Steel',
                hsn: '',
                uom: (uoms && uoms[0]) || 'NOS',
                qty: 1,
                rate: 0,
                gst: 18
              }])}
            >
              <Ic n="plus" s={15} /> {t('addAnotherProductBtn')}
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: 12 }}>
          <table className="inward-table">
            <thead>
              <tr>
                <th style={{ width: 360 }}>{t('colMaterialDescription')}</th>
                <th style={{ width: 135 }}>{t('colHsnSac')}</th>
                <th style={{ width: 140 }}>{t('colInwardCategory')}</th>
                <th style={{ width: 100 }}>{t('colInwardUnit')}</th>
                <th style={{ width: 85 }} className="r">{t('colQty')}</th>
                <th style={{ width: 105 }} className="r">{t('colRateRupees')}</th>
                <th style={{ width: 130 }} className="r">{t('colWithoutGstRupees')}</th>
                <th style={{ width: 105 }}>{t('colGstPercent')}</th>
                <th style={{ width: 130 }} className="r">{t('colWithGstRupees')}</th>
                <th style={{ width: 45 }} />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const isCalculated = calc.rows[idx] || {};
                const displayItems = (supplier.trim() && supplierMaterials.length > 0 && filterToSupplierOnly)
                  ? supplierMaterials
                  : items;

                return (
                  <tr key={idx}>
                    <td style={{ minWidth: 340, padding: '10px 10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                        {/* Box 1: English Material Name */}
                        <div style={{ position: 'relative' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                            <span style={{
                              fontSize: 9.5,
                              fontWeight: 800,
                              background: '#EEF2FF',
                              color: '#3730A3',
                              border: '1px solid #C7D2FE',
                              padding: '1px 6px',
                              borderRadius: 4,
                              letterSpacing: '.03em',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}>
                              <span style={{ fontWeight: 900 }}>EN</span> {t('englishMaterialName')}
                            </span>
                            {row.id && (
                              <span style={{ fontSize: 9.5, color: 'var(--mut)', fontWeight: 800, background: '#F1F5F9', padding: '1px 5px', borderRadius: 4 }}>
                                {row.id}
                              </span>
                            )}
                          </div>
                          <InwardMaterialCombobox
                            row={row}
                            items={displayItems}
                            onSelectExisting={it => {
                              const autoTa = it.nameTa || it.tamilName || inferTamilName(it.name) || '';
                              setRow(idx, {
                                id: it.id,
                                name: it.name,
                                nameTa: autoTa,
                                isNew: false,
                                cat: it.cat || (categories && categories[0]) || 'Steel',
                                hsn: it.hsn || '',
                                uom: it.uom || 'NOS',
                                rate: it.rate || 0,
                                qty: row.qty || 1,
                                gst: (it.gst !== undefined && it.gst !== null && !isNaN(it.gst)) ? Number(it.gst) : 18
                              });
                            }}
                            onAddNew={newName => {
                              setRow(idx, {
                                name: newName,
                                isNew: !row.id
                              });
                            }}
                            onClear={() => {
                              setRow(idx, {
                                id: '',
                                name: '',
                                nameTa: '',
                                isNew: false,
                                hsn: '',
                                rate: '',
                                qty: 1,
                                gst: 18
                              });
                            }}
                            placeholder={t('englishNamePlaceholder')}
                          />
                        </div>

                        {/* Box 2: Tamil Material Name */}
                        <div style={{ position: 'relative' }}>
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 2 }}>
                            <span style={{
                              fontSize: 9.5,
                              fontWeight: 800,
                              background: '#FEF3C7',
                              color: '#92400E',
                              border: '1px solid #FDE68A',
                              padding: '1px 6px',
                              borderRadius: 4,
                              letterSpacing: '.03em',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}>
                              <span style={{ fontWeight: 900 }}>தமிழ்</span> {t('tamilMaterialName')}
                            </span>
                          </div>
                          <InwardTamilMaterialInput
                            row={row}
                            items={displayItems}
                            onSelectExisting={it => {
                              const autoTa = it.nameTa || it.tamilName || inferTamilName(it.name) || '';
                              setRow(idx, {
                                id: it.id,
                                name: it.name,
                                nameTa: autoTa,
                                isNew: false,
                                cat: it.cat || (categories && categories[0]) || 'Steel',
                                hsn: it.hsn || '',
                                uom: it.uom || 'NOS',
                                rate: it.rate || 0,
                                qty: row.qty || 1,
                                gst: (it.gst !== undefined && it.gst !== null && !isNaN(it.gst)) ? Number(it.gst) : 18
                              });
                            }}
                            onChangeTamilName={newTaName => {
                              setRow(idx, { nameTa: newTaName });
                            }}
                            onClear={() => {
                              setRow(idx, {
                                id: '',
                                name: '',
                                nameTa: '',
                                isNew: false,
                                hsn: '',
                                rate: '',
                                qty: 1,
                                gst: 18
                              });
                            }}
                            placeholder={t('tamilNamePlaceholder')}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <input
                        className="table-input"
                        placeholder="e.g. 7214"
                        list={`page-hsn-list-${idx}`}
                        value={row.hsn}
                        onChange={e => setRow(idx, { hsn: e.target.value })}
                      />
                      <datalist id={`page-hsn-list-${idx}`}>
                        {COMMON_HSN_CODES.map(h => (
                          <option key={h.code} value={h.code}>{h.code} - {h.desc}</option>
                        ))}
                      </datalist>
                    </td>
                    <td>
                      <select
                        className="table-input"
                        value={row.cat}
                        onChange={e => setRow(idx, { cat: e.target.value })}
                      >
                        {(categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES_LIST).map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className="table-input"
                        value={row.uom}
                        onChange={e => setRow(idx, { uom: e.target.value })}
                      >
                        {(uoms && uoms.length > 0 ? uoms : COMMON_UOMS).map(u => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        className="table-input r"
                        type="number"
                        min="0"
                        step="any"
                        value={row.qty}
                        onChange={e => setRow(idx, { qty: +e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="table-input r"
                        type="number"
                        min="0"
                        step="any"
                        value={row.rate}
                        onChange={e => setRow(idx, { rate: +e.target.value })}
                      />
                    </td>
                    <td className="r">
                      <span className="val-display" style={{ color: 'var(--ink)' }}>
                        {fmt(isCalculated.taxableAmt || 0)}
                      </span>
                    </td>
                    <td>
                      <select
                        className="table-input"
                        value={row.gst}
                        onChange={e => setRow(idx, { gst: +e.target.value })}
                      >
                        {[0, 5, 12, 18, 28].map(g => (
                          <option key={g} value={g}>{g}%</option>
                        ))}
                      </select>
                    </td>
                    <td className="r">
                      <span className="val-display" style={{ color: 'var(--navy)', fontWeight: 800 }}>
                        {fmt(isCalculated.totalAmt || 0)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="ib"
                        style={{ width: 32, height: 32, border: '1px solid var(--line)', borderRadius: 8, color: 'var(--red)', display: 'inline-grid', placeItems: 'center' }}
                        onClick={() => {
                          const updated = rows.filter((_, j) => j !== idx);
                          setRows(updated.length > 0 ? updated : [{
                            id: '',
                            name: '',
                            nameTa: '',
                            isNew: false,
                            cat: (categories && categories[0]) || 'Steel',
                            hsn: '',
                            uom: (uoms && uoms[0]) || 'NOS',
                            qty: 1,
                            rate: '',
                            gst: 18
                          }]);
                        }}
                        title="Delete row"
                      >
                        <Ic n="trash" s={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: Live Invoice Summary & Action Buttons */}
      <div className="pn" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <small className="mut" style={{ display: 'block', fontSize: 12 }}>{t('itemsCountLabel')}</small>
            <b style={{ fontSize: 16 }}>{t('productsCountUnit', { n: calc.rows.filter(r => (r.name && r.name.trim()) || (r.nameTa && r.nameTa.trim())).length })}</b>
          </div>
          <div>
            <small className="mut" style={{ display: 'block', fontSize: 12 }}>{t('totalQuantityLabel')}</small>
            <b style={{ fontSize: 16 }}>{fmt(calc.rows.reduce((s, r) => s + (Number(r.qty) || 0), 0))}</b>
          </div>
          <div>
            <small className="mut" style={{ display: 'block', fontSize: 12 }}>{t('withoutGstTaxableLabel')}</small>
            <b style={{ fontSize: 16 }}>{inr(calc.taxable)}</b>
          </div>
          <div>
            <small className="mut" style={{ display: 'block', fontSize: 12 }}>{t('gstTaxTotalLabel')}</small>
            <b style={{ fontSize: 16 }}>{inr(calc.tax)}</b>
          </div>
          <div>
            <small className="mut" style={{ display: 'block', fontSize: 12 }}>{t('withGstGrandTotalLabel')}</small>
            <b style={{ fontSize: 22, color: 'var(--navy)' }}>{inr(calc.total)}</b>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button className="btn" onClick={handleReset}>
            {editingInvoice ? t('cancelResetBtn') : t('resetFormBtn')}
          </button>
          <button className="btn gold" style={{ padding: '12px 28px', fontSize: 15 }} onClick={handleSave}>
            <Ic n="check" s={18} /> {editingInvoice ? t('updateInvoiceStockBtn') : t('saveInvoiceStockBtn')}
          </button>
        </div>
      </div>
    </div>
  );
}
