import { useState, useMemo } from 'react';
import Modal from './Modal';
import Ic from './Icon';
import { InwardMaterialCombobox, InwardTamilMaterialInput } from './MaterialCombobox';
import { fmt, inr, dt, getSupplierMaterials, DEFAULT_CATEGORIES_LIST, DEFAULT_UOMS_LIST, inferTamilName, getMaterialDisplayName, formatTitleCase } from '../utils';
import { COMMON_HSN_CODES, COMMON_UOMS } from '../data/categories';
import { useLanguage } from '../context/LanguageContext';

export default function InwardEntryModal({
  items,
  setItems,
  inwardInvoices,
  setInwardInvoices,
  categories = DEFAULT_CATEGORIES_LIST,
  uoms = DEFAULT_UOMS_LIST,
  onClose,
  toast,
  onPreviewImage
}) {
  const { t, lang } = useLanguage();
  const [invNo, setInvNo] = useState('');
  const [invDate, setInvDate] = useState(new Date().toISOString().slice(0, 10));
  const [supplier, setSupplier] = useState('');
  const [supplierGst, setSupplierGst] = useState('');
  const [orderNo, setOrderNo] = useState('');
  const [notes, setNotes] = useState('');
  const [billImage, setBillImage] = useState(null);
  const [filterToSupplierOnly, setFilterToSupplierOnly] = useState(true);

  // Supplier materials
  const supplierMaterials = useMemo(() => {
    return getSupplierMaterials(supplier, items, inwardInvoices);
  }, [supplier, items, inwardInvoices]);

  // Supplier suggestions from real inward invoices
  const pastSuppliers = useMemo(() => {
    const s = new Set();
    inwardInvoices.forEach(i => { if (i.supplier) s.add(i.supplier); });
    return Array.from(s);
  }, [inwardInvoices]);

  const [rows, setRows] = useState([
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
  ]);

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
        nameTa: it.nameTa || inferTamilName(it.name),
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
      if (window.electronAPI?.saveSingleImage) {
        try {
          await window.electronAPI.saveSingleImage({
            dataUrl,
            invoiceNo: invNo.trim() || 'Draft',
            invoiceDate: invDate || ''
          });
          toast('✓ Bill photo saved to local disk & attached');
        } catch (err) {
          toast('Bill image uploaded');
        }
      } else {
        toast('Bill image uploaded');
      }
    };
    reader.readAsDataURL(file);
  };

  // Calculate totals
  const calc = useMemo(() => {
    let taxable = 0;
    let tax = 0;
    const calculatedRows = rows.map(r => {
      const q = Math.max(0, +r.qty || 0);
      const rt = Math.max(0, +r.rate || 0);
      const taxAmt = q * rt;
      const g = (taxAmt * (+r.gst || 0)) / 100;
      taxable += taxAmt;
      tax += g;
      return {
        ...r,
        taxableAmt: taxAmt,
        taxAmt: g,
        totalAmt: taxAmt + g
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
      toast('Please enter Invoice Number');
      return;
    }
    if (!supplier.trim()) {
      toast('Please enter Supplier Name');
      return;
    }
    if (!calc.rows.some(r => r.name.trim() && r.qty > 0)) {
      toast('Please enter at least one material with quantity');
      return;
    }

    // 1. Update Stock Inventory
    let updatedItems = [...items];
    let nextCodeNum = items.length + 1;

    calc.rows.forEach(row => {
      if (!row.name.trim() || row.qty <= 0) return;

      const normName = row.name.trim().toUpperCase();
      const normNameTa = row.nameTa?.trim() || inferTamilName(normName);
      let matchIdx = -1;

      if (row.id) {
        matchIdx = updatedItems.findIndex(i => i.id === row.id);
      }
      if (matchIdx === -1) {
        matchIdx = updatedItems.findIndex(i => i.name.toUpperCase() === normName);
      }
      if (matchIdx === -1 && normNameTa) {
        matchIdx = updatedItems.findIndex(i => i.nameTa && i.nameTa.trim() === normNameTa);
      }

      if (matchIdx >= 0) {
        // Existing material -> increase received stock, update rate, hsn, gst, and sync BOTH names to SAME stock record
        const target = updatedItems[matchIdx];
        const rowGst = (row.gst !== undefined && row.gst !== '' && !isNaN(row.gst))
          ? Number(row.gst)
          : (target.gst !== undefined ? Number(target.gst) : 18);
        updatedItems[matchIdx] = {
          ...target,
          name: normName || target.name,
          nameTa: normNameTa || target.nameTa,
          recv: +(target.recv + row.qty).toFixed(2),
          rate: row.rate > 0 ? row.rate : target.rate,
          last: invDate,
          hsn: row.hsn || target.hsn,
          cat: row.cat || target.cat,
          gst: rowGst
        };
      } else {
        // New material -> create new stock item with unified id, English name, and Tamil name
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

    // 2. Save Inward Invoice Entry
    const newInvoice = {
      id: 'INV-' + Date.now(),
      inv: invNo.trim(),
      date: invDate,
      supplier: supplier.trim(),
      supplierGst: supplierGst.trim(),
      orderNo: orderNo.trim(),
      billImage: billImage,
      taxType: 'GST',
      items: calc.rows.map(r => {
        const rowGst = (r.gst !== undefined && r.gst !== '' && !isNaN(r.gst)) ? Number(r.gst) : 0;
        return {
          id: r.id || 'NEW',
          name: r.name.trim().toUpperCase(),
          nameTa: r.nameTa?.trim() || inferTamilName(r.name.trim().toUpperCase()),
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
      cgst: calc.tax / 2,
      sgst: calc.tax / 2,
      igst: 0,
      totalTax: calc.tax,
      total: calc.total,
      notes: notes.trim(),
      createdAt: new Date().toISOString()
    };

    setInwardInvoices([newInvoice, ...inwardInvoices]);

    // Ensure final bill image is saved to local disk with final invoiceNo and invoiceDate
    if (billImage && window.electronAPI?.saveSingleImage) {
      window.electronAPI.saveSingleImage({
        dataUrl: billImage,
        invoiceNo: invNo.trim(),
        invoiceDate: invDate || ''
      }).catch(() => {});
    }

    toast(`Stock updated! Invoice #${invNo} recorded.`);
    onClose();
  };

  return (
    <Modal
      title="Inward Stock Update & Bill Entry"
      subtitle="Enter invoice details, attach bill image, and update material stock automatically"
      size="xl"
      onClose={onClose}
    >
      <div>

        {/* Invoice Header Details */}
        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: 18, marginBottom: 18 }}>
          <div style={{ fontWeight: 800, fontSize: 14.5, color: 'var(--navy)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Ic n="bill" s={18} /> Invoice & Supplier Details
          </div>
          <div className="four">
            <label className="fl">
              <span>Invoice No. *</span>
              <input
                className="in"
                placeholder="e.g. 1316/25-26 or STT/147"
                value={invNo}
                onChange={e => setInvNo(e.target.value)}
              />
            </label>
            <label className="fl">
              <span>Invoice Date *</span>{' '}
              <span style={{ fontSize: 11, color: 'var(--mut)', fontWeight: 600 }}>
                (DD-MM-YYYY: {dt(invDate)})
              </span>
              <input
                className="in"
                type="date"
                value={invDate}
                onChange={e => setInvDate(e.target.value)}
              />
            </label>
            <label className="fl">
              <span>Supplier Name *</span>
              <input
                className="in"
                list="supplier-suggestions"
                placeholder="Type or select supplier"
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
              />
              <datalist id="supplier-suggestions">
                {pastSuppliers.map(s => <option key={s} value={s} />)}
              </datalist>
            </label>
            <label className="fl">
              <span>Supplier GSTIN</span>
              <input
                className="in"
                placeholder="e.g. 33ARCPR4653B1Z3"
                value={supplierGst}
                onChange={e => setSupplierGst(e.target.value)}
              />
            </label>
          </div>
          <div className="two" style={{ marginTop: 4 }}>
            <label className="fl">
              <span>PO / Order No / LR No (optional)</span>
              <input
                className="in"
                placeholder="e.g. ID/PO/1683/22-23"
                value={orderNo}
                onChange={e => setOrderNo(e.target.value)}
              />
            </label>
            <label className="fl">
              <span>Remarks / Delivery Note</span>
              <input
                className="in"
                placeholder="e.g. Site gate delivery, inspected by store"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </label>
          </div>
        </div>

        {/* Bill Image Upload Area */}
        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: 18, marginBottom: 18 }}>
          <div style={{ fontWeight: 800, fontSize: 14.5, color: 'var(--navy)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Ic n="image" s={18} /> Upload Physical Bill / Invoice Photo
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: billImage ? '220px 1fr' : '1fr', gap: 16, alignItems: 'center' }}>
            {billImage && (
              <div className="bill-thumb-wrap">
                <img src={billImage} alt="Uploaded Bill" />
                <div className="bill-thumb-overlay">
                  <button
                    className="btn sm gold"
                    type="button"
                    onClick={() => onPreviewImage && onPreviewImage(billImage, `Invoice ${invNo || ''}`, supplier)}
                  >
                    <Ic n="eye" s={14} /> View
                  </button>
                  <button
                    className="btn sm red"
                    type="button"
                    onClick={() => setBillImage(null)}
                  >
                    <Ic n="trash" s={14} /> Remove
                  </button>
                </div>
              </div>
            )}
            <div>
              <label className="bill-dropzone">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: 'none' }}
                  onChange={handleImageFile}
                />
                <Ic n="upload" s={28} />
                <div>
                  <b style={{ color: 'var(--navy)' }}>Click to take photo or choose bill image</b>
                  <div style={{ fontSize: 12, color: 'var(--mut)' }}>
                    Supports camera photos, JPG, PNG receipts (saved to record)
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Products / Material Table */}
        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: 18, marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14.5, color: 'var(--navy)' }}>
                Materials & Products in Invoice
              </div>
              <div style={{ fontSize: 12, color: 'var(--mut)' }}>
                Select from existing stock or add new materials. HSN and stock update automatically.
              </div>
            </div>
            <button
              className="btn sm gold"
              onClick={() => setRows([...rows, {
                id: '',
                name: '',
                isNew: items.length === 0,
                cat: (categories && categories[0]) || 'Steel',
                hsn: '',
                uom: (uoms && uoms[0]) || 'NOS',
                qty: 1,
                rate: 0,
                gst: 18
              }])}
            >
              <Ic n="plus" s={15} /> Add Another Product
            </button>
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: 12 }}>
            <table className="inward-table" style={{ minWidth: 1160 }}>
              <thead>
                <tr>
                  <th style={{ width: 360 }}>{t('colMaterialDescription')} (English &amp; தமிழ்)</th>
                  <th style={{ width: 130 }}>{t('colHsnSac')}</th>
                  <th style={{ width: 140 }}>Category</th>
                  <th style={{ width: 100 }}>Unit</th>
                  <th style={{ width: 85 }} className="r">Qty</th>
                  <th style={{ width: 105 }} className="r">Rate (₹)</th>
                  <th style={{ width: 130 }} className="r">Without GST (₹)</th>
                  <th style={{ width: 100 }}>GST %</th>
                  <th style={{ width: 130 }} className="r">With GST (₹)</th>
                  <th style={{ width: 44 }} />
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
                      <td style={{ minWidth: 340 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {/* Box 1: English Product Name Combobox */}
                          <div style={{ position: 'relative' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                              <span style={{ fontSize: 9.5, fontWeight: 800, background: '#E0E7FF', color: '#3730A3', padding: '1px 5px', borderRadius: 3, letterSpacing: '0.04em' }}>EN</span>
                              <span style={{ fontSize: 10.5, color: 'var(--mut)', fontWeight: 600 }}>{t('englishMaterialName')}</span>
                            </div>
                            <InwardMaterialCombobox
                              row={row}
                              items={displayItems}
                              placeholder={t('englishNamePlaceholder')}
                              onSelectExisting={it => {
                                setRow(idx, {
                                  id: it.id,
                                  name: it.name,
                                  nameTa: it.nameTa || row.nameTa || inferTamilName(it.name),
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
                                const norm = newName.trim();
                                const autoTa = (!row.nameTa || row.nameTa === inferTamilName(row.name)) ? inferTamilName(norm) : row.nameTa;
                                setRow(idx, {
                                  id: '',
                                  name: newName,
                                  nameTa: autoTa,
                                  isNew: true,
                                  cat: row.cat || (categories && categories[0]) || 'Steel',
                                  hsn: row.id ? '' : (row.hsn || ''),
                                  uom: row.uom || (uoms && uoms[0]) || 'NOS',
                                  qty: row.qty || 1,
                                  rate: row.id ? '' : (row.rate !== undefined ? row.rate : ''),
                                  gst: (row.gst !== undefined && row.gst !== '') ? Number(row.gst) : 18
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
                            />
                          </div>

                          {/* Box 2: Tamil Product Name Input */}
                          <div style={{ position: 'relative' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                              <span style={{ fontSize: 9.5, fontWeight: 800, background: '#FEF3C7', color: '#92400E', padding: '1px 5px', borderRadius: 3, letterSpacing: '0.04em' }}>தமிழ்</span>
                              <span style={{ fontSize: 10.5, color: 'var(--mut)', fontWeight: 600 }}>{t('tamilMaterialName')}</span>
                            </div>
                            <InwardTamilMaterialInput
                              row={row}
                              items={displayItems}
                              placeholder={t('tamilNamePlaceholder')}
                              onChangeTamilName={text => {
                                setRow(idx, { nameTa: text });
                              }}
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
                            />
                          </div>
                        </div>
                      </td>
                      <td>
                        <input
                          className="table-input"
                          placeholder="e.g. 7214"
                          list={`hsn-list-${idx}`}
                          value={row.hsn}
                          onChange={e => setRow(idx, { hsn: e.target.value })}
                        />
                        <datalist id={`hsn-list-${idx}`}>
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

        {/* Invoice Summary & Action */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', gap: 20 }}>
            <div>
              <small className="mut" style={{ display: 'block' }}>Items</small>
              <b>{calc.rows.filter(r => r.name.trim()).length} Products</b>
            </div>
            <div>
              <small className="mut" style={{ display: 'block' }}>Without GST (Taxable)</small>
              <b>{inr(calc.taxable)}</b>
            </div>
            <div>
              <small className="mut" style={{ display: 'block' }}>GST Tax Amount</small>
              <b>{inr(calc.tax)}</b>
            </div>
            <div>
              <small className="mut" style={{ display: 'block' }}>With GST (Grand Total)</small>
              <b style={{ fontSize: 18, color: 'var(--navy)' }}>{inr(calc.total)}</b>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn" onClick={onClose}>
              Cancel
            </button>
            <button className="btn gold" style={{ padding: '10px 22px' }} onClick={handleSave}>
              <Ic n="check" s={16} /> Save & Update Stock Now
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
