import { useState, useMemo, useEffect, Fragment } from 'react';
import LOGO from '../assets/logo.png';
import OWNER_SIGN from '../assets/Owner Signature.jpeg';
import { fmt, inr, dt, amountInWords, DEFAULT_UOMS_LIST, formatCustomerName, getMaterialDisplayName, inferTamilName } from '../utils';
import Ic from '../components/Icon';
import { IssueMaterialCombobox } from '../components/MaterialCombobox';
import CustomerAutofillInput from '../components/CustomerCombobox';
import SoftwareVersionAlert from '../components/SoftwareVersionAlert';

import { useLanguage } from '../context/LanguageContext';

const GST_SLAB_OPTIONS = [
  { val: 18, label: '18% (9+9)', half: 9 },
  { val: 12, label: '12% (6+6)', half: 6 },
  { val: 5,  label: '5% (2.5+2.5)', half: 2.5 },
  { val: 28, label: '28% (14+14)', half: 14 },
  { val: 0,  label: '0%', half: 0 }
];

export default function IssueBill({ items, bills, setBills, setItems, preset, toast, user, settings = {}, go, uoms, editingBill, setEditingBill }) {
  const { t, lang } = useLanguage();
  const ISSUE_DRAFT_KEY = 'svs_issue_bill_draft_v1';

  // Load cached draft helper from localStorage
  const getInitialDraft = () => {
    if (editingBill) return null;
    try {
      const raw = localStorage.getItem(ISSUE_DRAFT_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { }
    return null;
  };

  const [initialDraft] = useState(getInitialDraft);
  const [draftRestored, setDraftRestored] = useState(() => {
    if (editingBill) return false;
    return !!(
      initialDraft &&
      (
        (initialDraft.h && (initialDraft.h.cust || initialDraft.h.phone || initialDraft.h.address || initialDraft.h.veh)) ||
        (initialDraft.ls && initialDraft.ls.some(l => l.id || +l.qty > 1 || +l.weight > 0 || +l.rate > 0))
      )
    );
  });

  const nextNo = 'SVS-ISSUE-' + String(bills.length + 1001);
  const [issueNo, setIssueNo] = useState(() => editingBill ? editingBill.no : nextNo);
  const [issueDate, setIssueDate] = useState(() => {
    if (editingBill && editingBill.date) {
      try {
        return new Date(editingBill.date).toISOString().slice(0, 10);
      } catch (e) { }
    }
    if (initialDraft?.issueDate) {
      return initialDraft.issueDate;
    }
    return new Date().toISOString().slice(0, 10);
  });

  const availableUoms = useMemo(() => (uoms && uoms.length ? uoms : DEFAULT_UOMS_LIST), [uoms]);

  const blank = {
    cust: '',
    address: '',
    phone: '',
    gst: '',
    veh: '',
    project: '',
    pay: 'Cash'
  };

  const [h, setH] = useState(() => {
    if (editingBill) {
      return {
        cust: formatCustomerName(editingBill.cust || ''),
        address: editingBill.address || '',
        phone: editingBill.phone || '',
        gst: editingBill.gst || '',
        veh: editingBill.veh || '',
        project: editingBill.project || '',
        pay: editingBill.pay || 'Cash'
      };
    }
    if (initialDraft?.h) {
      return {
        cust: initialDraft.h.cust || '',
        address: initialDraft.h.address || '',
        phone: initialDraft.h.phone || '',
        gst: initialDraft.h.gst || '',
        veh: initialDraft.h.veh || '',
        project: initialDraft.h.project || '',
        pay: initialDraft.h.pay || 'Cash'
      };
    }
    return blank;
  });

  const [ls, setLs] = useState(() => {
    if (editingBill && editingBill.rows && editingBill.rows.length > 0) {
      return editingBill.rows.map(r => ({
        id: r.id || '',
        qty: r.qty !== undefined && r.qty !== null ? r.qty : 1,
        weight: r.weight !== undefined && r.weight !== null ? r.weight : '',
        weightUnit: r.weightUnit || 'KGS',
        uom: r.uom || 'KGS',
        rate: r.rate !== undefined && r.rate !== null ? r.rate : 0,
        gst: r.gst !== undefined && r.gst !== null ? r.gst : 18,
        size: r.size || ''
      }));
    }
    if (initialDraft?.ls && initialDraft.ls.length > 0) {
      return initialDraft.ls;
    }
    if (preset) {
      const it = items.find(i => i.id === preset) || {};
      const unit = it.uom || 'KGS';
      const baseRate = Number(it.rateWithoutGst ?? it.rate ?? 0);
      const effectiveRate = Number(it.rateWithGst ?? +(baseRate * 1.18).toFixed(2));
      return [{ id: preset, qty: 1, weight: '', weightUnit: unit === 'GMS' ? 'GMS' : 'KGS', uom: unit, rate: effectiveRate || baseRate || 0, gst: 18 }];
    }
    return [{ id: '', qty: 1, weight: '', weightUnit: 'KGS', uom: 'KGS', rate: 0, gst: 18 }];
  });

  // GST Tax Toggle State: Default is OFF (No GST). Manually toggle ON for specific customer
  const [enableGst, setEnableGst] = useState(() => {
    if (editingBill) {
      return editingBill.enableGst !== undefined
        ? Boolean(editingBill.enableGst)
        : (Number(editingBill.tax || 0) > 0);
    }
    if (initialDraft?.enableGst !== undefined) {
      return Boolean(initialDraft.enableGst);
    }
    return false; // Default: No GST toggle enable (OFF by default)
  });

  const [view, setView] = useState(null);
  const [countdown, setCountdown] = useState(10);
  const [isAutoClosePaused, setIsAutoClosePaused] = useState(false);

  // 10-second auto-close countdown when bill is issued
  useEffect(() => {
    if (!view || !view.autoClose || isAutoClosePaused) return;

    if (countdown <= 0) {
      handleCloseModal();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [view, countdown, isAutoClosePaused]);

  // Auto-cache draft to localStorage whenever user modifies form fields (only when creating new bills)
  useEffect(() => {
    if (editingBill) return;

    const hasContent =
      (h.cust && h.cust.trim()) ||
      (h.phone && h.phone.trim()) ||
      (h.address && h.address.trim()) ||
      (h.veh && h.veh.trim()) ||
      (h.project && h.project.trim()) ||
      ls.some(l => l.id || +l.qty > 1 || +l.weight > 0 || +l.rate > 0);

    if (hasContent) {
      try {
        const draft = {
          h,
          ls,
          issueDate,
          enableGst,
          updatedAt: Date.now()
        };
        localStorage.setItem(ISSUE_DRAFT_KEY, JSON.stringify(draft));
      } catch (e) { }
    } else {
      try {
        localStorage.removeItem(ISSUE_DRAFT_KEY);
        setDraftRestored(false);
      } catch (e) { }
    }
  }, [h, ls, issueDate, enableGst, editingBill]);

  const handleClearDraft = () => {
    try {
      localStorage.removeItem(ISSUE_DRAFT_KEY);
    } catch (e) { }
    setH(blank);
    setLs([{ id: '', qty: 1, weight: '', weightUnit: 'KGS', uom: 'KGS', rate: 0, gst: 18 }]);
    setEnableGst(false);
    setDraftRestored(false);
    toast(lang === 'ta' ? 'வரைவு அழிக்கப்பட்டது. புதிய படிவம் தயார்.' : 'Draft cleared. Form reset.');
  };

  const handleCloseModal = () => {
    setView(null);
    setCountdown(10);
    setIsAutoClosePaused(false);
    if (editingBill && setEditingBill) {
      setEditingBill(null);
      setH(blank);
      setLs([{ id: '', qty: 1, weight: '', weightUnit: 'KGS', uom: 'KGS', rate: 0, gst: 18 }]);
      setIssueNo(nextNo);
    }
    // Stay on Issue Bill screen for next entry; do not redirect to delivery history
  };

  const by = useMemo(() => Object.fromEntries(items.map(i => [i.id, i])), [items]);

  // Customer Directory extracted strictly from active delivery bills
  const customerDirectory = useMemo(() => {
    const dir = [];
    const seen = new Set();

    (bills || []).forEach(b => {
      if (!b) return;
      const phoneRaw = (b.phone || '').trim();
      const phoneDigits = phoneRaw.replace(/[^0-9]/g, '');
      const custName = (b.cust || '').trim();
      if (!phoneDigits && !custName) return;

      const key = phoneDigits ? `p_${phoneDigits}` : `c_${custName.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        dir.push({
          cust: formatCustomerName(custName),
          phone: phoneRaw,
          address: (b.address || '').trim(),
          veh: (b.veh || '').trim(),
          pay: b.pay || 'Cash'
        });
      }
    });

    return dir;
  }, [bills]);

  // Autofill customer details and immediately jump focus to Material To Issue input
  const handleSelectCustomer = (selectedCust) => {
    setView(null);
    setH(prev => ({
      ...prev,
      cust: formatCustomerName(selectedCust.cust || prev.cust),
      phone: selectedCust.phone || prev.phone,
      address: selectedCust.address || prev.address,
      veh: selectedCust.veh || prev.veh,
      pay: selectedCust.pay || prev.pay || 'Cash'
    }));
    toast(`✓ Customer "${selectedCust.cust || selectedCust.phone}" details autofilled!`);

    // Immediately move cursor to "Material To Issue" input box
    setTimeout(() => {
      const el = document.getElementById('material-issue-input-0') || document.querySelector('.combobox-input-wrap input');
      if (el) {
        el.focus();
        if (el.select) el.select();
      }
    }, 60);
  };

  // Determine active GST split display for header and toggle
  const activeGstRates = useMemo(() => {
    const list = [...new Set(ls.map(l => (l.gst !== undefined && !isNaN(l.gst)) ? Number(l.gst) : 18))].filter(g => g > 0);
    return list.length ? list : [18];
  }, [ls]);

  const activeGstTitle = activeGstRates.length === 1
    ? `${activeGstRates[0]}% (${activeGstRates[0] / 2}+${activeGstRates[0] / 2})`
    : 'Multi-Rate (CGST+SGST)';

  const setL = (k, patch) => {
    setLs(ls.map((l, j) => j === k ? { ...l, ...patch } : l));
  };

  // Toggle GST On/Off: immediately switches product rates between without-GST and with-GST
  const handleToggleGst = () => {
    setView(null);
    const nextEnable = !enableGst;
    setEnableGst(nextEnable);

    setLs(prevLines =>
      prevLines.map(l => {
        if (!l.id) return l;
        const it = by[l.id];

        // Maintain 18% default across all items; preserve manual user selections (12%, 5%) if chosen
        const lineGst = (l.gst !== undefined && l.gst !== null && !isNaN(l.gst)) ? Number(l.gst) : 18;

        if (it) {
          const baseRate = Number(it.rateWithoutGst ?? it.rate ?? 0);
          const withGstRate = Number(
            it.rateWithGst !== undefined && it.rateWithGst !== null
              ? it.rateWithGst
              : +(baseRate * (1 + lineGst / 100)).toFixed(2)
          );

          if (nextEnable) {
            // Switching to GST ON: set rate to without-GST base rate (e.g. 461)
            const isStandardWithGst = Math.abs(Number(l.rate) - withGstRate) < 0.05;
            const newRate = isStandardWithGst ? baseRate : +(Number(l.rate || 0) / (1 + lineGst / 100)).toFixed(2);
            return { ...l, rate: newRate, gst: lineGst };
          } else {
            // Switching to GST OFF: set rate to with-GST rate (e.g. 543.98)
            const isStandardBase = Math.abs(Number(l.rate) - baseRate) < 0.05;
            const newRate = isStandardBase ? withGstRate : +(Number(l.rate || 0) * (1 + lineGst / 100)).toFixed(2);
            return { ...l, rate: newRate, gst: lineGst };
          }
        }

        if (l.rate) {
          const newRate = nextEnable
            ? +(Number(l.rate) / (1 + lineGst / 100)).toFixed(2)
            : +(Number(l.rate) * (1 + lineGst / 100)).toFixed(2);
          return { ...l, rate: newRate, gst: lineGst };
        }

        return l;
      })
    );
  };

  // Helper to compute billable / deducted quantity for a single line
  const getLineDeductQty = (line, item) => {
    if (!line || !item) return 0;
    const curUom = line.uom || item.uom || 'KGS';
    const isG = line.weightUnit === 'GMS' || curUom === 'GMS';
    const hasW = line.weight !== undefined && line.weight !== '' && !isNaN(line.weight) && +line.weight > 0;
    const rawW = hasW ? +line.weight : 0;
    const wKg = hasW ? (isG ? +(rawW / 1000).toFixed(4) : rawW) : 0;
    const itIsWeight = item.uom === 'KGS' || item.uom === 'MT';
    return itIsWeight && wKg > 0 ? wKg : (+line.qty || 0);
  };

  // Helper to compute total base stock for an item (including editing restitution)
  const getItemBaseStock = (item) => {
    if (!item) return 0;
    let base = Number(item.stock || 0);
    if (editingBill && editingBill.rows) {
      editingBill.rows.filter(r => r.id === item.id).forEach(origRow => {
        const origDeduct = origRow.stockDeductQty !== undefined ? origRow.stockDeductQty : (origRow.qty || 0);
        base += Number(origDeduct || 0);
      });
    }
    return +base.toFixed(3);
  };

  const calc = lines => {
    let totalWeight = 0;
    const itemAllocated = {};

    const rows = lines
      .filter(l => l.id && (+l.qty > 0 || +l.weight > 0))
      .map(l => {
        const it = by[l.id] || {};
        const uom = l.uom || it.uom || 'KGS';
        const q = +l.qty || 0;
        const hasWeight = l.weight !== undefined && l.weight !== '' && !isNaN(l.weight) && +l.weight > 0;
        const rawW = hasWeight ? +l.weight : 0;
        const isGrams = l.weightUnit === 'GMS' || uom === 'GMS';
        const weightInKg = hasWeight ? (isGrams ? +(rawW / 1000).toFixed(4) : rawW) : 0;

        if (weightInKg > 0) {
          totalWeight += weightInKg;
        }

        // Deduct from live stock: if item is tracked in KGS/MT and weight is entered, deduct in KGS
        const itIsWeight = it.uom === 'KGS' || it.uom === 'MT';
        const checkQty = itIsWeight && weightInKg > 0 ? weightInKg : q;

        // Cumulative stock limit checking across multiple rows for the same material
        const baseStock = getItemBaseStock(it);
        const prevAlloc = itemAllocated[l.id] || 0;
        const remainingForThisRow = Math.max(0, +(baseStock - prevAlloc).toFixed(3));
        const isOverStock = it && it.stock !== undefined && (checkQty > remainingForThisRow);
        itemAllocated[l.id] = +(prevAlloc + checkQty).toFixed(3);

        let stockDeductQty = checkQty;
        if (it && it.stock !== undefined && stockDeductQty > remainingForThisRow) {
          stockDeductQty = remainingForThisRow;
        }

        // Pricing calculation:
        // When weight is entered, calculate Line Amount = Weight (in KG) * Rate.
        // Quantity (e.g. 2 boxes) is recorded as count, NOT multiplied by rate.
        // When weight is not entered, calculate Line Amount = Qty * Rate.
        const billableQty = (hasWeight && weightInKg > 0) ? weightInKg : q;
        const amt = +(billableQty * (+l.rate || 0)).toFixed(2);
        const rawEnName = (it.name || l.rawName || l.name || '').trim();
        const rawTaName = (it.nameTa || it.tamilName || inferTamilName(rawEnName) || l.nameTa || '').trim();
        const displayNameEn = l.size ? `${rawEnName} (Size: ${l.size})` : rawEnName;
        const displayNameTa = l.size ? `${rawTaName} (Size: ${l.size})` : rawTaName;
        const currentDisplayName = lang === 'ta' ? displayNameTa : displayNameEn;

        return {
          ...l,
          qty: q,
          weight: hasWeight ? (isGrams ? rawW : +rawW.toFixed(3)) : null,
          weightInKg: hasWeight ? weightInKg : null,
          weightUnit: isGrams ? 'GMS' : 'KGS',
          stockDeductQty,
          name: displayNameEn || currentDisplayName,
          nameEn: displayNameEn,
          nameTa: displayNameTa || rawTaName,
          rawName: rawEnName,
          uom,
          hsn: it.hsn || '',
          cat: it.cat || '',
          amt,
          availableStock: remainingForThisRow,
          baseStock,
          prevAlloc,
          checkQty,
          isOverStock
        };
      });

    const sub = rows.reduce((s, r) => s + r.amt, 0);
    let tax = 0;
    let cgst = 0;
    let sgst = 0;
    const taxBreakdown = [];

    if (enableGst) {
      // Group tax amounts by selected GST slab (e.g., 18%, 12%, 5%, 28%)
      const slabMap = {};
      rows.forEach(r => {
        const slab = (r.gst !== undefined && r.gst !== null && !isNaN(r.gst)) ? Number(r.gst) : 18;
        if (slab > 0) {
          if (!slabMap[slab]) {
            slabMap[slab] = { slab, halfRate: slab / 2, cgst: 0, sgst: 0, amt: 0 };
          }
          const halfTax = +((Number(r.amt || 0) * (slab / 2)) / 100).toFixed(2);
          slabMap[slab].cgst = +(slabMap[slab].cgst + halfTax).toFixed(2);
          slabMap[slab].sgst = +(slabMap[slab].sgst + halfTax).toFixed(2);
          slabMap[slab].amt = +(slabMap[slab].amt + Number(r.amt || 0)).toFixed(2);
        }
      });

      // If no rows have positive amount yet (e.g. before materials are chosen or rate is 0),
      // reflect the currently chosen GST slab from active lines so preview updates instantly
      if (Object.keys(slabMap).length === 0) {
        const activeSlab = (lines && lines[0] && lines[0].gst !== undefined && !isNaN(lines[0].gst)) ? Number(lines[0].gst) : 18;
        if (activeSlab > 0) {
          slabMap[activeSlab] = { slab: activeSlab, halfRate: activeSlab / 2, cgst: 0, sgst: 0, amt: 0 };
        }
      }

      Object.values(slabMap).forEach(s => {
        taxBreakdown.push(s);
        cgst += s.cgst;
        sgst += s.sgst;
      });

      cgst = +cgst.toFixed(2);
      sgst = +sgst.toFixed(2);
      tax = +(cgst + sgst).toFixed(2);
    }

    return {
      rows,
      sub,
      enableGst,
      cgst,
      sgst,
      tax,
      taxBreakdown,
      total: Math.round(sub + tax),
      totalWeight: +totalWeight.toFixed(2)
    };
  };

  const c = view
    ? {
      rows: view.rows,
      sub: view.sub,
      enableGst: view.enableGst !== undefined ? Boolean(view.enableGst) : (Number(view.tax || 0) > 0),
      cgst: view.cgst !== undefined ? view.cgst : +((Number(view.tax || 0) / 2).toFixed(2)),
      sgst: view.sgst !== undefined ? view.sgst : +((Number(view.tax || 0) / 2).toFixed(2)),
      tax: view.tax,
      taxBreakdown: view.taxBreakdown || (() => {
        const sm = {};
        (view.rows || []).forEach(r => {
          const slab = (r.gst !== undefined && r.gst !== null) ? Number(r.gst) : 18;
          if (slab > 0) {
            if (!sm[slab]) sm[slab] = { slab, halfRate: slab / 2, cgst: 0, sgst: 0 };
            const halfTax = +((Number(r.amt || 0) * (slab / 2)) / 100).toFixed(2);
            sm[slab].cgst += halfTax;
            sm[slab].sgst += halfTax;
          }
        });
        const arr = Object.values(sm);
        if (!arr.length && Number(view.tax || 0) > 0) {
          arr.push({ slab: 18, halfRate: 9, cgst: view.cgst || (view.tax / 2), sgst: view.sgst || (view.tax / 2) });
        }
        return arr;
      })(),
      total: view.total,
      totalWeight: view.totalWeight || (view.rows || []).reduce((s, r) => s + (Number(r.weightInKg || r.weight) || 0), 0)
    }
    : calc(ls);

  const currentNo = view ? view.no : (issueNo.trim() || nextNo);
  const currentDate = view ? view.date : issueDate;

  // Check if any item's cumulative requested quantity in the bill exceeds total available stock
  const overRow = ls.find(l => {
    if (!l.id || !by[l.id]) return false;
    const it = by[l.id];
    const baseStock = getItemBaseStock(it);
    const totalItemBillQty = ls
      .filter(other => other.id === l.id)
      .reduce((sum, other) => sum + getLineDeductQty(other, by[other.id]), 0);
    return totalItemBillQty > baseStock;
  });

  const handleSave = () => {
    const k = calc(ls);
    if (!h.cust.trim()) {
      toast('Please enter customer / contractor or site name');
      return;
    }
    if (!k.rows.length) {
      toast('Please select at least one material with quantity or weight');
      return;
    }
    if (overRow) {
      const it = by[overRow.id];
      const baseStock = getItemBaseStock(it);
      toast(`Cannot issue: ${getMaterialDisplayName(it, lang)} has only ${fmt(baseStock)} ${it.uom} available in stock`);
      return;
    }

    const now = new Date();
    let issueDateTime = now.toISOString();
    try {
      if (issueDate) {
        const [y, m, d] = issueDate.split('-').map(Number);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          // If editing an existing bill with same date, preserve its previous creation time if valid
          if (editingBill && editingBill.date) {
            const orig = new Date(editingBill.date);
            const origYmd = `${orig.getFullYear()}-${String(orig.getMonth() + 1).padStart(2, '0')}-${String(orig.getDate()).padStart(2, '0')}`;
            if (origYmd === issueDate && (orig.getHours() !== 0 || orig.getMinutes() !== 0)) {
              issueDateTime = editingBill.date;
            } else {
              const dtObj = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());
              issueDateTime = dtObj.toISOString();
            }
          } else {
            const dtObj = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());
            issueDateTime = dtObj.toISOString();
          }
        }
      }
    } catch (e) {
      issueDateTime = now.toISOString();
    }

    const b = {
      ...h,
      cust: formatCustomerName(h.cust.trim()),
      ...k,
      enableGst,
      cgst: k.cgst,
      sgst: k.sgst,
      taxBreakdown: k.taxBreakdown,
      no: currentNo,
      date: issueDateTime,
      time: new Date(issueDateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      by: user || 'Store Incharge',
      totalWeight: k.totalWeight
    };

    if (editingBill) {
      // 1. Update bills list
      const updatedBills = bills.map(item => item.no === editingBill.no ? b : item);
      setBills(updatedBills);

      // 2. Adjust item stock deductions using cumulative sum for each product
      const oldRows = editingBill.rows || [];
      const updatedItems = items.map(item => {
        const oldDeduct = oldRows
          .filter(r => r.id === item.id)
          .reduce((sum, r) => sum + Number(r.stockDeductQty !== undefined ? r.stockDeductQty : (r.qty || 0)), 0);
        const newDeduct = k.rows
          .filter(r => r.id === item.id)
          .reduce((sum, r) => sum + Number(r.stockDeductQty !== undefined ? r.stockDeductQty : (r.qty || 0)), 0);
        const delta = newDeduct - oldDeduct;
        return {
          ...item,
          stock: Math.max(0, +(Number(item.stock || 0) - delta).toFixed(3)),
          issued: +(Number(item.issued || 0) + delta).toFixed(2)
        };
      });
      setItems(updatedItems);

      setCountdown(10);
      setIsAutoClosePaused(false);
      setView({ ...b, isPreview: false, autoClose: true });
      toast(`Delivery Bill #${currentNo} updated successfully!`);
    } else {
      // 1. Update bills list
      setBills([b, ...bills]);

      // 2. Minimize / deduct stock on items using cumulative sum for each product
      const updatedItems = items.map(item => {
        const itemRows = k.rows.filter(r => r.id === item.id);
        if (itemRows.length > 0) {
          const totalDeduct = itemRows.reduce((sum, r) => sum + Number(r.stockDeductQty !== undefined ? r.stockDeductQty : (r.qty || 0)), 0);
          return {
            ...item,
            stock: Math.max(0, +(Number(item.stock || 0) - totalDeduct).toFixed(3)),
            issued: +(Number(item.issued || 0) + totalDeduct).toFixed(2)
          };
        }
        return item;
      });
      setItems(updatedItems);

      // 3. Clear draft and reset form
      try {
        localStorage.removeItem(ISSUE_DRAFT_KEY);
      } catch (e) { }
      setDraftRestored(false);
      setLs([{ id: '', qty: 1, weight: '', weightUnit: 'KGS', uom: 'KGS', rate: 0, gst: 18 }]);
      setH(blank);
      setIssueNo('SVS-ISSUE-' + String(bills.length + 1002));
      setCountdown(10);
      setIsAutoClosePaused(false);
      setView({ ...b, isPreview: false, autoClose: true });
      toast(`Bill #${currentNo} issued! Stock quantity minimized.`);
    }
  };

  const handlePreviewVoucher = () => {
    if (!h.cust || !h.cust.trim()) {
      toast('Please enter customer / contractor name to preview');
      return;
    }
    const previewBill = {
      ...h,
      cust: formatCustomerName(h.cust.trim()),
      ...c,
      enableGst,
      no: currentNo,
      date: new Date(issueDate).toISOString(),
      by: user || 'Store Incharge',
      totalWeight: c.totalWeight,
      isPreview: true,
      autoClose: false
    };
    setCountdown(10);
    setIsAutoClosePaused(true);
    setView(previewBill);
  };

  return (
    <div className="flexible-page-container">
      {/* Screen content (hidden during print so voucher prints clean) */}
      <div className="issue-bill-screen-content no-print">
        {/* ── Top Header Row: Language Switcher & Software Version Alert System on Top Right Corner ── */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 10,
          marginBottom: 10
        }}>
          <SoftwareVersionAlert settings={settings} toast={toast} />
        </div>

      <div className="bill" style={{ display: 'block', maxWidth: 1160, margin: '0 auto 24px' }}>
        {/* Issue Bill Creation Form */}
        <div className="pn no-print">
          {/* ── Auto-Saved Draft Restored Banner ── */}
          {draftRestored && !editingBill && (
            <div style={{
              marginBottom: 16,
              padding: '12px 16px',
              background: '#F0FDF4',
              border: '1.5px solid #86EFAC',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
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
                    {t('draftRestoredTitle')}
                  </div>
                  <div style={{ fontSize: 12, color: '#15803D' }}>
                    {t('draftRestoredDesc')}
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
                <Ic n="trash" s={13} /> {t('clearDraftBtn')}
              </button>
            </div>
          )}
          {editingBill && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: '#FEF3C7',
              border: '1.5px solid #F59E0B',
              borderRadius: 10,
              marginBottom: 16
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#92400E' }}>
                <Ic n="edit" s={16} />
                <span>Editing Delivery Bill: <b>{editingBill.no}</b></span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn sm"
                  style={{ background: '#fff', borderColor: '#F59E0B', color: '#92400E', fontWeight: 700 }}
                  onClick={() => {
                    if (setEditingBill) setEditingBill(null);
                    setH(blank);
                    setLs([{ id: '', qty: 1, weight: '', weightUnit: 'KGS', uom: 'KGS', rate: 0, gst: 18 }]);
                    setIssueNo(nextNo);
                    setView(null);
                  }}
                >
                  Cancel Edit / New Bill
                </button>
                <button
                  type="button"
                  className="btn sm"
                  style={{ background: '#fff', borderColor: '#CBD5E1', color: 'var(--navy)' }}
                  onClick={() => {
                    if (setEditingBill) setEditingBill(null);
                    if (go) go('bills-history');
                  }}
                >
                  Back to History
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <h3>{editingBill ? `Update Delivery Bill #${currentNo}` : t('issueBillTitle')}</h3>
              <div className="hint">
                {editingBill ? 'Modify material quantities, rates, customer or vehicle and save updates.' : t('issueBillSubtitle')}
              </div>
            </div>
            {view && (
              <button
                className="btn sm gold"
                onClick={() => {
                  if (setEditingBill) setEditingBill(null);
                  setView(null);
                  setIssueNo('SVS-ISSUE-' + String(bills.length + 1001));
                }}
              >
                <Ic n="plus" s={14} /> {t('createAnotherBill')}
              </button>
            )}
          </div>

          {/* Issue No & Date */}
          <div className="two" style={{ background: 'var(--steelbg)', padding: 12, borderRadius: 12, marginBottom: 16 }}>
            <label className="fl" style={{ marginBottom: 0 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                <Ic n="lock" s={13} /> {t('issueBillNo')}
              </span>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  className="in"
                  readOnly
                  style={{
                    width: '100%',
                    fontWeight: 800,
                    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                    color: 'var(--navy)',
                    background: '#F1F5F9',
                    borderColor: '#CBD5E1',
                    cursor: 'default',
                    paddingRight: 110
                  }}
                  value={currentNo}
                  title="Bill number is automatically sequenced by the system"
                />
                <span style={{
                  position: 'absolute',
                  right: 10,
                  fontSize: 10.5,
                  fontWeight: 800,
                  color: 'var(--mut)',
                  background: '#E2E8F0',
                  padding: '2px 8px',
                  borderRadius: 6,
                  letterSpacing: '.03em',
                  textTransform: 'uppercase'
                }}>
                  {t('autoLocked')}
                </span>
              </div>
            </label>
            <label className="fl" style={{ marginBottom: 0 }}>
              <span>{t('issueDate')} *</span>
              <input
                className="in"
                type="date"
                value={issueDate}
                onChange={e => {
                  setView(null);
                  setIssueDate(e.target.value);
                }}
              />
            </label>
          </div>

          {/* Customer & Dispatch Destination Information */}
          <div style={{ background: '#fff', border: '1.5px solid var(--line)', borderRadius: 14, padding: '16px 18px', marginBottom: 18, boxShadow: '0 2px 8px rgba(0,0,0,.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 7 }}>
                <Ic n="user" s={16} /> {t('customerInfo')}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '3px 10px', borderRadius: 20 }}>
                ⚡ {t('autoFetchPrompt')}
              </div>
            </div>

            {/* 1 Row, 5 Columns: Phone, Customer Name, Address (Little Big!), Vehicle No, Payment */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(155px, 1.05fr) minmax(190px, 1.35fr) minmax(280px, 2.5fr) minmax(145px, 1.05fr) minmax(135px, 0.9fr)',
              gap: 12,
              alignItems: 'end',
              width: '100%'
            }}>
              <CustomerAutofillInput
                field="phone"
                label={t('phoneNo')}
                value={h.phone}
                placeholder={t('phonePlaceholder')}
                customers={customerDirectory}
                onChange={val => {
                  setView(null);
                  setH({ ...h, phone: val });
                }}
                onSelectCustomer={handleSelectCustomer}
              />

              <CustomerAutofillInput
                field="cust"
                label={t('customerName')}
                required
                value={h.cust}
                placeholder={t('customerNamePlaceholder')}
                customers={customerDirectory}
                onChange={val => {
                  setView(null);
                  setH({ ...h, cust: formatCustomerName(val) });
                }}
                onSelectCustomer={handleSelectCustomer}
              />

              <label className="fl" style={{ marginBottom: 0 }}>
                <span style={{ fontWeight: 700, fontSize: 11.5, color: 'var(--mut)', marginBottom: 4, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {t('toAddress')}
                </span>
                <input
                  className="in"
                  placeholder={t('toAddressPlaceholder')}
                  value={h.address || ''}
                  onChange={e => {
                    setView(null);
                    setH({ ...h, address: e.target.value });
                  }}
                  style={{ height: 44, padding: '10px 12px', fontSize: 14, fontWeight: 500 }}
                />
              </label>

              <label className="fl" style={{ marginBottom: 0 }}>
                <span style={{ fontWeight: 700, fontSize: 11.5, color: 'var(--mut)', marginBottom: 4, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {t('vehicleNumber')}
                </span>
                <input
                  className="in"
                  placeholder={t('vehiclePlaceholder')}
                  style={{ textTransform: 'uppercase', fontWeight: 700, height: 38, padding: '8px 10px', fontSize: 13 }}
                  value={h.veh || ''}
                  onChange={e => {
                    setView(null);
                    setH({ ...h, veh: e.target.value.toUpperCase() });
                  }}
                />
              </label>

              <label className="fl" style={{ marginBottom: 0 }}>
                <span style={{ fontWeight: 700, fontSize: 11.5, color: 'var(--mut)', marginBottom: 4, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {t('billingPayment')}
                </span>
                <select
                  className="in"
                  value={h.pay}
                  onChange={e => {
                    setView(null);
                    setH({ ...h, pay: e.target.value });
                  }}
                  style={{ height: 38, fontWeight: 700, padding: '8px 8px', fontSize: 13 }}
                >
                  <option value="Cash">{lang === 'ta' ? 'ரொக்கம் (Cash)' : 'Cash'}</option>
                  <option value="UPI">{lang === 'ta' ? 'யுபிஐ (UPI / GPay)' : 'UPI'}</option>
                  <option value="Card">{lang === 'ta' ? 'கார்டு (Card / Bank)' : 'Card'}</option>
                </select>
              </label>
            </div>
          </div>

          {/* GST Tax Toggle Switch (Right Side with Enable Animation) */}
          <div style={{
            margin: '14px 0 10px',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            width: '100%'
          }}>
            <div
              role="button"
              tabIndex={0}
              onClick={handleToggleGst}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                background: enableGst
                  ? 'linear-gradient(135deg, #1E40AF 0%, #2563EB 55%, #3B82F6 100%)'
                  : '#FFFFFF',
                border: `1.5px solid ${enableGst ? '#1D4ED8' : '#CBD5E1'}`,
                padding: '5px 12px 5px 12px',
                borderRadius: 28,
                cursor: 'pointer',
                userSelect: 'none',
                boxShadow: enableGst
                  ? '0 4px 14px rgba(37, 99, 235, 0.35)'
                  : '0 1px 4px rgba(0,0,0,0.06)',
                animation: enableGst ? 'gstGlowPulse 2.5s infinite ease-in-out' : 'none',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              title="Toggle GST Tax ON or OFF for this customer"
            >
              <span style={{
                fontSize: 12,
                fontWeight: 800,
                color: enableGst ? '#FFFFFF' : '#475569',
                letterSpacing: '.02em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5
              }}>
                <Ic n="percent" s={13} /> {t('gstOption')}
              </span>

              {/* Animated Switch Track */}
              <div
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  background: enableGst ? '#172554' : '#E2E8F0',
                  padding: 2,
                  display: 'flex',
                  alignItems: 'center',
                  position: 'relative',
                  transition: 'background 0.3s ease',
                  boxSizing: 'border-box',
                  boxShadow: enableGst
                    ? 'inset 0 2px 4px rgba(0,0,0,0.3)'
                    : 'inset 0 1px 3px rgba(0,0,0,0.12)'
                }}
              >
                {/* Animated Sliding Thumb with Checkmark */}
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    transform: enableGst ? 'translateX(20px)' : 'translateX(0)',
                    transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#2563EB'
                  }}
                >
                  {enableGst && (
                    <span style={{
                      display: 'inline-flex',
                      animation: 'gstCheckBounce 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
                    }}>
                      <Ic n="check" s={12} />
                    </span>
                  )}
                </div>
              </div>

              {/* Status Badge with Live Pulsing Dot */}
              <span style={{
                fontSize: 11.5,
                fontWeight: 900,
                color: enableGst ? '#FEF08A' : '#64748B',
                background: enableGst ? 'rgba(255, 255, 255, 0.18)' : '#F1F5F9',
                border: `1px solid ${enableGst ? 'rgba(254, 240, 138, 0.35)' : '#E2E8F0'}`,
                padding: '2px 8px',
                borderRadius: 12,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                letterSpacing: '.02em',
                transition: 'all 0.25s ease'
              }}>
                {enableGst ? (
                  <>
                    <span style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#22C55E',
                      boxShadow: '0 0 6px #22C55E',
                      display: 'inline-block',
                      animation: 'gstDotPing 1.8s infinite'
                    }} />
                    {`ON (${activeGstTitle || '18%'})`}
                  </>
                ) : (
                  t('offNoGst')
                )}
              </span>
            </div>
          </div>

          {ls.map((l, k) => {
            const it = by[l.id];
            const curUom = l.uom || (it && it.uom) || 'KGS';
            const isG = l.weightUnit === 'GMS' || curUom === 'GMS';
            const hasW = l.weight !== undefined && l.weight !== '' && !isNaN(l.weight) && +l.weight > 0;
            const rawW = hasW ? +l.weight : 0;
            const wKg = hasW ? (isG ? +(rawW / 1000).toFixed(4) : rawW) : 0;
            const itIsWeight = it && (it.uom === 'KGS' || it.uom === 'MT');
            const checkQty = itIsWeight && wKg > 0 ? wKg : (+l.qty || 0);

            // Base total stock available in inventory (including restitution if editing existing bill)
            const baseStock = getItemBaseStock(it);

            // Quantity consumed by other rows of the same material in this bill
            const otherLinesQty = ls
              .filter((other, idx) => idx !== k && other.id === l.id && other.id)
              .reduce((sum, other) => sum + getLineDeductQty(other, by[other.id]), 0);

            // Available remaining stock specifically for THIS line
            const availableStock = Math.max(0, +(baseStock - otherLinesQty).toFixed(3));

            // Cumulative check: does this line exceed its available stock OR does total bill exceed warehouse stock?
            const totalItemBillQty = +(otherLinesQty + checkQty).toFixed(3);
            const isOver = Boolean(
              it && (
                (checkQty > 0 && (checkQty > availableStock || totalItemBillQty > baseStock)) ||
                (availableStock <= 0 && checkQty > 0)
              )
            );

            // When weight is entered, calculate Line Amount = Weight (in KG) * Rate!
            // Quantity (e.g. 2 boxes) is recorded as count, NOT multiplied by rate.
            // When weight is not entered, calculate Line Amount = Qty * Rate.
            const billableQ = (hasW && wKg > 0) ? wKg : (+l.qty || 0);
            const lineAmt = +(billableQ * (l.rate || 0)).toFixed(2);

            return (
              <div
                key={k}
                style={{
                  background: isOver ? 'var(--redbg)' : '#fff',
                  border: isOver ? '1.5px solid #F3C6C1' : '1.5px solid var(--line)',
                  borderRadius: 14,
                  padding: '14px 16px',
                  marginBottom: 12,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  boxSizing: 'border-box',
                  width: '100%'
                }}
              >
                {/* 1 Unified Row: Material (Little Big!), Qty, Weight, Unit, Rate, GST, Remove */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(260px, 2.9fr) minmax(80px, 0.75fr) minmax(140px, 1.25fr) minmax(85px, 0.8fr) minmax(100px, 0.95fr) minmax(95px, 0.85fr) 36px',
                  gap: 10,
                  alignItems: 'end',
                  width: '100%',
                  boxSizing: 'border-box'
                }}>
                  {/* Col 1: Material Description (Little Big!) */}
                  <div style={{ minWidth: 0 }}>
                    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, fontWeight: 700, color: 'var(--mut)', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                      <span>{t('materialToIssueLabel')} *</span>
                    </label>
                    <IssueMaterialCombobox
                      id={`material-issue-input-${k}`}
                      items={items.map(item => {
                        const base = getItemBaseStock(item);
                        const usedByOtherLines = ls
                          .filter((other, idx) => idx !== k && other.id === item.id)
                          .reduce((sum, other) => sum + getLineDeductQty(other, by[other.id]), 0);
                        const rem = Math.max(0, +(base - usedByOtherLines).toFixed(3));
                        return {
                          ...item,
                          stock: rem
                        };
                      })}
                      enableGst={enableGst}
                      selectedId={l.id}
                      toast={toast}
                      placeholder="Search material description or HSN no..."
                      onSelect={selected => {
                        setView(null);
                        if (!selected) {
                          setL(k, { id: '', qty: 1, weight: '', weightUnit: 'KGS', uom: 'KGS', rate: 0, gst: 18 });
                          return;
                        }
                        const maxStock = selected.stock !== undefined ? selected.stock : 1;
                        const currentQty = parseFloat(l.qty) || 1;
                        const safeQty = Math.max(0.001, Math.min(currentQty, maxStock));
                        const unit = selected.uom || 'KGS';
                        const baseRate = Number(selected.rateWithoutGst ?? selected.rate ?? 0);
                        // Always default to common 18% GST (do NOT pull stock's stored 12% or 5%)
                        const defaultGst = 18;
                        const rateWithGst = Number(
                          selected.rateWithGst !== undefined && selected.rateWithGst !== null
                            ? selected.rateWithGst
                            : +(baseRate * (1 + defaultGst / 100)).toFixed(2)
                        );
                        const effectiveRate = enableGst ? baseRate : (rateWithGst || baseRate);
                        setL(k, {
                          id: selected.id,
                          uom: unit,
                          rate: effectiveRate || 0,
                          gst: defaultGst, // Common default 18% GST
                          qty: safeQty > 0 ? safeQty : (maxStock > 0 ? 1 : 0),
                          weight: l.weight || '',
                          weightUnit: (unit === 'GMS' || l.weightUnit === 'GMS') ? 'GMS' : 'KGS'
                        });
                      }}
                    />
                  </div>

                  {/* Col 2: Quantity */}
                  <div style={{ minWidth: 0 }}>
                    <label
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: 11,
                        fontWeight: 700,
                        color: isOver && (!itIsWeight || !hasW) ? '#DC2626' : 'var(--mut)',
                        marginBottom: 4,
                        whiteSpace: 'nowrap'
                      }}
                      title="Quantity (Count / Boxes / Packets)"
                    >
                      <span>{t('quantity')}</span>
                      {isOver && (!itIsWeight || !hasW) && (
                        <span style={{ color: '#DC2626', fontWeight: 800, fontSize: 10 }}>● Exceeds</span>
                      )}
                    </label>
                    <input
                      className={`in r ${isOver && (!itIsWeight || !hasW) ? 'in-error' : ''}`}
                      type="number"
                      min="0.001"
                      step="any"
                      placeholder="Qty"
                      value={l.qty === '' ? '' : l.qty}
                      aria-label="Quantity"
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        height: 38,
                        padding: '8px 8px',
                        fontSize: 13,
                        fontWeight: 600,
                        borderColor: isOver && (!itIsWeight || !hasW) ? '#DC2626' : undefined,
                        background: isOver && (!itIsWeight || !hasW) ? '#FEF2F2' : undefined,
                        color: isOver && (!itIsWeight || !hasW) ? '#DC2626' : undefined
                      }}
                      onChange={e => {
                        setView(null);
                        const raw = e.target.value;
                        if (raw === '') {
                          setL(k, { qty: '' });
                          return;
                        }
                        let val = parseFloat(raw);
                        if (isNaN(val) || val < 0) val = 0;
                        setL(k, { qty: val });
                      }}
                    />
                  </div>

                  {/* Col 3: Weight (with KG / GMS mode) */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 4,
                      gap: 2
                    }}>
                      <label
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: isOver && (itIsWeight || hasW) ? '#DC2626' : 'var(--mut)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                        title={`Weight (${isG ? 'Grams' : 'KGS'})`}
                      >
                        {t('weight')} {isOver && (itIsWeight || hasW) && <span style={{ color: '#DC2626', fontWeight: 800 }}>● (Max: {fmt(availableStock)})</span>}
                      </label>
                      <div style={{
                        display: 'inline-flex',
                        background: '#e2e8f0',
                        borderRadius: 6,
                        padding: 1.5,
                        flexShrink: 0
                      }}>
                        <button
                          type="button"
                          style={{
                            border: 'none',
                            background: !isG ? 'var(--navy)' : 'transparent',
                            color: !isG ? '#fff' : '#475569',
                            fontSize: 9.5,
                            fontWeight: 800,
                            padding: '1px 5px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            lineHeight: 1.2
                          }}
                          title="Enter weight in Kilograms (KGS)"
                          onClick={() => {
                            setView(null);
                            if (isG && l.weight && !isNaN(l.weight)) {
                              const inKg = +(+l.weight / 1000).toFixed(4);
                              setL(k, { weightUnit: 'KGS', weight: inKg });
                            } else {
                              setL(k, { weightUnit: 'KGS' });
                            }
                          }}
                        >
                          KG
                        </button>
                        <button
                          type="button"
                          style={{
                            border: 'none',
                            background: isG ? 'var(--navy)' : 'transparent',
                            color: isG ? '#fff' : '#475569',
                            fontSize: 9.5,
                            fontWeight: 800,
                            padding: '1px 5px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            lineHeight: 1.2
                          }}
                          title="Enter weight in Grams (GMS)"
                          onClick={() => {
                            setView(null);
                            if (!isG && l.weight && !isNaN(l.weight)) {
                              const inG = Math.round(+l.weight * 1000);
                              setL(k, { weightUnit: 'GMS', weight: inG });
                            } else {
                              setL(k, { weightUnit: 'GMS' });
                            }
                          }}
                        >
                          GMS
                        </button>
                      </div>
                    </div>
                    <input
                      className={`in r ${isOver && (itIsWeight || hasW) ? 'in-error' : ''}`}
                      type="text"
                      inputMode="decimal"
                      placeholder={isG ? 'e.g. 500' : 'e.g. 0.5'}
                      value={l.weight === '' || l.weight === undefined ? '' : l.weight}
                      aria-label="Weight"
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        height: 38,
                        padding: '8px 8px',
                        fontSize: 13,
                        fontWeight: 600,
                        borderColor: isOver && (itIsWeight || hasW) ? '#DC2626' : undefined,
                        background: isOver && (itIsWeight || hasW) ? '#FEF2F2' : undefined,
                        color: isOver && (itIsWeight || hasW) ? '#DC2626' : undefined
                      }}
                      onChange={e => {
                        setView(null);
                        const raw = e.target.value;
                        if (raw === '') {
                          setL(k, { weight: '' });
                          return;
                        }
                        if (/[a-z]/i.test(raw)) {
                          const isTypingG = /g/i.test(raw);
                          const isTypingK = /k/i.test(raw);
                          const numOnly = parseFloat(raw.replace(/[^0-9.]/g, ''));
                          if (!isNaN(numOnly)) {
                            if (isTypingG && !isTypingK) {
                              setL(k, { weightUnit: 'GMS', weight: numOnly });
                              return;
                            } else if (isTypingK) {
                              setL(k, { weightUnit: 'KGS', weight: numOnly });
                              return;
                            }
                          }
                        }
                        const cleanParts = raw.replace(/[^0-9.]/g, '').split('.');
                        const clean = cleanParts[0] + (cleanParts.length > 1 ? '.' + cleanParts.slice(1).join('') : '');
                        setL(k, { weight: clean });
                      }}
                    />
                  </div>

                  {/* Col 4: Unit Selection */}
                  <div style={{ minWidth: 0 }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--mut)',
                        marginBottom: 4,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                      title="Unit"
                    >
                      {t('unit')}
                    </label>
                    <select
                      className="in"
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        height: 38,
                        padding: '8px 4px',
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      value={l.uom || (it ? it.uom : 'KGS')}
                      aria-label="Unit"
                      onChange={e => {
                        setView(null);
                        const newUom = e.target.value;
                        const patch = { uom: newUom };
                        if (newUom === 'GMS') patch.weightUnit = 'GMS';
                        setL(k, patch);
                      }}
                    >
                      {availableUoms.map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>

                  {/* Col 5: Rate per Unit */}
                  <div style={{ minWidth: 0 }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--mut)',
                        marginBottom: 4,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                      title={`Rate (₹/${l.uom || (it ? it.uom : 'Unit')})`}
                    >
                      {t('rate')} (₹/{l.uom || (it ? it.uom : 'Unit')})
                    </label>
                    <input
                      className="in r"
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Rate"
                      value={l.rate}
                      aria-label="Rate"
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        height: 38,
                        padding: '8px 8px',
                        fontSize: 13,
                        fontWeight: 600
                      }}
                      onChange={e => {
                        setView(null);
                        setL(k, { rate: e.target.value === '' ? '' : +e.target.value });
                      }}
                    />
                  </div>

                  {/* Col 6: GST */}
                  <div style={{ minWidth: 0 }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--mut)',
                        marginBottom: 4,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                      title="GST %"
                    >
                      {t('gstPercent')}
                    </label>
                    <select
                      className="in gs"
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        height: 38,
                        padding: '8px 4px',
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: enableGst ? 'pointer' : 'not-allowed',
                        textAlign: 'center',
                        background: enableGst ? '#fff' : '#f1f5f9',
                        color: enableGst ? 'var(--navy)' : 'var(--mut)',
                        opacity: enableGst ? 1 : 0.65
                      }}
                      disabled={!enableGst}
                      value={enableGst ? (l.gst ?? 18) : 0}
                      aria-label="GST"
                      onChange={e => {
                        setView(null);
                        setL(k, { gst: +e.target.value });
                      }}
                      title={enableGst ? 'Select GST slab' : 'Enable GST toggle above to apply tax'}
                    >
                      {!enableGst ? (
                        <option value="0">0% (GST Off)</option>
                      ) : (
                        GST_SLAB_OPTIONS.map(opt => (
                          <option key={opt.val} value={opt.val}>{opt.label}</option>
                        ))
                      )}
                    </select>
                  </div>


                  {/* Col 7: Remove line */}
                  <div style={{ minWidth: 0, display: 'flex', justifyContent: 'center' }}>
                    <button
                      className="ib rm"
                      style={{
                        width: 36,
                        height: 38,
                        color: 'var(--red)',
                        borderColor: '#FECACA',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                        boxSizing: 'border-box',
                        flexShrink: 0
                      }}
                      aria-label="Remove line"
                      onClick={() => setLs(ls.length > 1 ? ls.filter((_, j) => j !== k) : [{ id: '', qty: 1, weight: '', weightUnit: 'KGS', uom: 'KGS', rate: 0, gst: 18 }])}
                    >
                      <Ic n="x" s={15} />
                    </button>
                  </div>
                </div>

                {/* Immediate Red Mark Stock Warning Directly Below Input Row */}
                {isOver && (
                  <div style={{
                    marginTop: 8,
                    marginBottom: 8,
                    padding: '8px 12px',
                    background: '#FEF2F2',
                    border: '1.5px solid #DC2626',
                    borderRadius: 8,
                    color: '#991B1B',
                    fontSize: 12,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    boxShadow: '0 2px 6px rgba(220, 38, 38, 0.12)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: '#DC2626',
                        color: '#FFFFFF',
                        fontSize: 12,
                        fontWeight: 900,
                        flexShrink: 0
                      }}>
                        !
                      </span>
                      <span>
                        Cannot issue <b style={{ color: '#DC2626' }}>{checkQty} {it.uom}</b>. {otherLinesQty > 0 ? (
                          <>Total stock is <b style={{ color: 'var(--navy)' }}>{fmt(baseStock)} {it.uom}</b> (<b style={{ color: '#B45309' }}>{fmt(otherLinesQty)} {it.uom}</b> used in another line). Only <b style={{ color: '#166534' }}>{fmt(availableStock)} {it.uom}</b> remaining for this line!</>
                        ) : (
                          <>Only <b style={{ color: '#166534' }}>{fmt(availableStock)} {it.uom}</b> available in stock!</>
                        )}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn sm"
                      style={{
                        background: '#DC2626',
                        color: '#FFFFFF',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: 11,
                        padding: '3px 10px',
                        height: 24,
                        borderRadius: 5,
                        cursor: 'pointer',
                        flexShrink: 0,
                        whiteSpace: 'nowrap'
                      }}
                      onClick={() => {
                        if (itIsWeight && hasW) {
                          setL(k, { weight: availableStock, weightUnit: 'KGS' });
                        } else {
                          setL(k, { qty: availableStock });
                        }
                      }}
                    >
                      Limit to Available ({fmt(availableStock)})
                    </button>
                  </div>
                )}

                {/* Stock feedback & Line Total */}
                {it && (
                  <div style={{
                    marginTop: 10,
                    paddingTop: 8,
                    borderTop: '1px dashed var(--line)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 8,
                    fontSize: 12
                  }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className="tag-hsn">HSN {it.hsn || '-'}</span>
                      <span className="tag-subcat">{it.cat}</span>
                      <span style={{ color: 'var(--ink)' }}>
                        In Stock: <b style={{ color: baseStock > 0 ? '#15803D' : '#DC2626' }}>{fmt(baseStock)} {it.uom}</b>
                        {otherLinesQty > 0 && (
                          <span style={{ fontSize: 11, color: availableStock > 0 ? '#0284C7' : '#DC2626', fontWeight: 700, marginLeft: 4 }}>
                            ({fmt(availableStock)} {it.uom} remaining for this line)
                          </span>
                        )}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {hasW && (
                        <span style={{ fontSize: 11.5, color: 'var(--mut)', fontWeight: 600 }}>
                          Weight: <b style={{ color: 'var(--navy)' }}>
                            {isG
                              ? `${fmt(rawW)} GMS (${fmt(wKg)} KGS)`
                              : `${fmt(wKg)} KGS (${fmt(wKg * 1000)} GMS)`}
                          </b> ·
                        </span>
                      )}
                      <span style={{ fontWeight: 800, color: 'var(--navy)', fontSize: 13.5 }}>
                        Line: {inr(lineAmt)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Helpful helper if large value entered in KG mode */}
                {hasW && !isG && rawW >= 50 && (
                  <div style={{ marginTop: 6, fontSize: 11, color: '#0369a1', background: '#e0f2fe', padding: '4px 10px', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <span>💡 Entered {rawW} KGS ({inr(lineAmt)}). Did you mean {rawW} Grams ({rawW / 1000} KG = {inr((rawW / 1000) * (l.rate || 0))})?</span>
                    <button
                      type="button"
                      className="btn sm"
                      style={{ padding: '2px 8px', fontSize: 10.5, fontWeight: 700, height: 22 }}
                      onClick={() => setL(k, { weightUnit: 'GMS' })}
                    >
                      Switch to {rawW} GMS
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Live Order Financial Summary Bar before submission */}
          <div style={{
            marginTop: 18,
            padding: '14px 18px',
            background: 'var(--steelbg)',
            border: '1.5px solid var(--line)',
            borderRadius: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16
          }}>
            <div>
              <div style={{ fontSize: 11.5, color: 'var(--mut)', fontWeight: 600 }}>
                {t('amountInWords')}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginTop: 2 }}>
                {amountInWords(c.total)}
              </div>
              {c.totalWeight > 0 && (
                <div style={{ fontSize: 11.5, color: 'var(--mut)', marginTop: 4 }}>
                  {t('totalWeight')}: <b style={{ color: 'var(--navy)' }}>{fmt(c.totalWeight)} KGS</b>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11.5, color: 'var(--mut)' }}>{t('subtotal')}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{inr(c.sub)}</div>
              </div>
              {c.enableGst && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11.5, color: '#0369a1' }}>{t('taxGst')}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0369a1' }}>{inr(c.tax)}</div>
                </div>
              )}
              <div style={{
                textAlign: 'right',
                background: '#fff',
                padding: '6px 14px',
                borderRadius: 10,
                border: '1.5px solid var(--gold)',
                boxShadow: '0 2px 6px rgba(217, 119, 6, 0.1)'
              }}>
                <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  {t('totalPayable')}
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy)', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
                  {inr(c.total)}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              className="btn"
              onClick={() => setLs([...ls, { id: '', qty: 1, weight: '', weightUnit: 'KGS', uom: 'KGS', rate: 0, gst: 18 }])}
            >
              <Ic n="plus" s={15} /> {t('addAnotherMaterial')}
            </button>
            <span className="grow" />
            <button
              type="button"
              className="btn"
              onClick={handlePreviewVoucher}
              style={{ padding: '11px 18px', fontSize: 13 }}
              title="Preview how this invoice will look before issuing"
            >
              <Ic n="eye" s={15} /> {t('previewVoucherBtn')}
            </button>
            {editingBill && (
              <button
                type="button"
                className="btn"
                style={{ padding: '11px 18px', fontSize: 13 }}
                onClick={() => {
                  if (setEditingBill) setEditingBill(null);
                  setH(blank);
                  setLs([{ id: '', qty: 1, weight: '', weightUnit: 'KGS', uom: 'KGS', rate: 0, gst: 18 }]);
                  setIssueNo(nextNo);
                }}
              >
                {t('cancelAndBack')}
              </button>
            )}
            <button
              className="btn gold"
              style={{
                padding: '11px 24px',
                fontSize: 14,
                background: overRow ? '#94A3B8' : undefined,
                borderColor: overRow ? '#94A3B8' : undefined,
                cursor: overRow ? 'not-allowed' : 'pointer'
              }}
              disabled={!!overRow}
              onClick={handleSave}
            >
              <Ic n="check" s={16} /> {overRow ? t('cannotIssueExceeds') : (editingBill ? `Update Delivery Bill #${currentNo}` : t('issueBillDeductStockBtn'))}
            </button>
          </div>

          {overRow && (
            <div style={{
              marginTop: 14,
              padding: '10px 14px',
              background: '#FEF2F2',
              border: '1.5px solid #DC2626',
              borderRadius: 10,
              color: '#991B1B',
              fontSize: 12.5,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 2px 6px rgba(220, 38, 38, 0.1)'
            }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: '#DC2626',
                color: '#fff',
                fontSize: 13,
                fontWeight: 900,
                flexShrink: 0
              }}>!</span>
              <span>
                Cannot issue bill: One or more materials exceed available live stock. Please reduce quantities to available stock before saving.
              </span>
            </div>
          )}

          {/* Delivery History Shortcut Card (inside pn.no-print so it CANNOT print) */}
          <div className="no-print" style={{
            marginTop: 20,
            background: 'var(--steelbg)',
            border: '1.5px solid var(--line)',
            borderRadius: 12,
            padding: '14px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                background: '#fff',
                color: 'var(--navy)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--line)'
              }}>
                <Ic n="fileText" s={18} />
              </span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--navy)' }}>
                  {t('pastDeliveriesTitle')}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--mut)', marginTop: 1 }}>
                  {t('pastDeliveriesSub')}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn sm"
              onClick={() => go ? go('bills-history') : null}
              style={{ fontWeight: 700, fontSize: 12, gap: 5, color: 'var(--navy)', background: '#fff' }}
            >
              {t('deliveryHistoryBtn')} ({bills.length}) <Ic n="chevronRight" s={13} />
            </button>
          </div>
        </div>
      </div>
      </div> {/* end issue-bill-screen-content no-print */}

      {/* ── VIEW & PRINTABLE TAX INVOICE MODAL (RIGHT-SIDE POSITIONED) ── */}
      {view && (
        <div
          className="lightbox bill-history-lightbox"
          role="dialog"
          aria-modal="true"
          style={{
            background: 'rgba(15, 23, 42, 0.62)',
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'flex-end',
            alignItems: 'flex-start',
            padding: '16px 20px',
            overflowY: 'auto',
            zIndex: 90
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseModal();
            }
          }}
        >
          <div
            className="modal-print-container"
            style={{
              background: '#fff',
              borderRadius: 16,
              maxWidth: 780,
              width: '100%',
              maxHeight: 'calc(var(--app-vh, 100vh) - 32px)',
              overflowY: 'auto',
              padding: '20px 24px',
              boxShadow: '-14px 0 45px rgba(0,0,0,.35)',
              position: 'relative',
              marginLeft: 'auto',
              marginRight: 0,
              animation: 'slideInRightSmooth 0.32s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* 10-Second Auto-Close Progress Bar (hidden on print) */}
            {view.autoClose && (
              <div
                className="no-print"
                style={{
                  height: 4,
                  width: '100%',
                  background: '#E2E8F0',
                  borderRadius: 2,
                  marginBottom: 12,
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${Math.max(0, (countdown / 10) * 100)}%`,
                    background: isAutoClosePaused ? '#94A3B8' : 'var(--gold)',
                    transition: 'width 1s linear'
                  }}
                />
              </div>
            )}

            {/* Modal Header Actions (hidden during print) */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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
                  OFFICIAL ISSUE VOUCHER &amp; TAX INVOICE
                </span>
                {view.autoClose && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 11,
                      fontWeight: 700,
                      color: isAutoClosePaused ? '#64748B' : '#B45309',
                      background: isAutoClosePaused ? '#F1F5F9' : '#FEF3C7',
                      border: `1px solid ${isAutoClosePaused ? '#CBD5E1' : '#FDE68A'}`,
                      padding: '1px 7px',
                      borderRadius: 10
                    }}
                  >
                    ⏱ {isAutoClosePaused ? (lang === 'ta' ? 'நிறுத்தப்பட்டது' : 'Paused') : `${countdown}s`}
                    <button
                      type="button"
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: isAutoClosePaused ? '#0284C7' : '#92400E',
                        fontSize: 10,
                        fontWeight: 800,
                        cursor: 'pointer',
                        padding: 0,
                        marginLeft: 2,
                        textDecoration: 'underline'
                      }}
                      onClick={() => setIsAutoClosePaused(!isAutoClosePaused)}
                      title={isAutoClosePaused ? 'Resume countdown' : 'Pause countdown'}
                    >
                      {isAutoClosePaused ? (lang === 'ta' ? 'தொடர்க' : 'Resume') : (lang === 'ta' ? 'நிறுத்து' : 'Pause')}
                    </button>
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => window.print()}
                  style={{ gap: 5, background: 'var(--navy)', color: '#fff', borderColor: 'var(--navy)' }}
                >
                  <Ic n="print" s={14} /> Print Slip
                </button>
                <button
                  type="button"
                  className="ib"
                  onClick={handleCloseModal}
                  style={{ width: 32, height: 32 }}
                  title={t('close')}
                >
                  <Ic n="x" s={16} />
                </button>
              </div>
            </div>

            {/* Exact Replica of Issue Bill Voucher Layout with class "inv" */}
            <div className={`inv history-inv-voucher ${(c.rows && c.rows.length > 7) ? 'multi-page' : 'single-page'}`}>
              <div className="inv-body">
                <header>
                  <div>
                    <h4>{settings.storeName || 'Sri Venkateswara Steels'}</h4>
                    {settings.address && (
                      <div style={{ fontSize: 11, color: 'var(--mut)', marginTop: 2, whiteSpace: 'pre-line', lineHeight: 1.35 }}>
                        {settings.address}
                      </div>
                    )}
                    {settings.gstin && (
                      <div style={{ fontSize: 11.5, color: 'var(--navy)', marginTop: 3 }}>
                        GSTIN: <b className="bill-head-gst" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", letterSpacing: '.02em', fontVariantNumeric: 'lining-nums tabular-nums' }}>{settings.gstin}</b> · State: <b className="bill-head-gst" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>{settings.state || 'Tamil Nadu (33)'}</b>
                      </div>
                    )}
                    <div style={{ marginTop: 8, fontSize: 13 }}>
                      <b className="bill-head-no" style={{ color: 'var(--navy)', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontSize: 14, fontVariantNumeric: 'lining-nums tabular-nums', letterSpacing: '.02em' }}>
                        {currentNo}
                      </b>
                      <br />
                      <span className="mut bill-head-date" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontVariantNumeric: 'lining-nums tabular-nums' }}>{dt(currentDate)}</span>
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
                  {settings.invoiceTitle || 'TAX INVOICE / BILL OF SUPPLY'}
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
                        Issued To / Consignee:
                      </span>
                      <div style={{ color: 'var(--navy)', fontSize: 13.5, fontWeight: 800 }}>
                        {formatCustomerName(view.cust || h.cust) || 'Customer / Contractor / Site'}
                      </div>
                      {(view.address || h.address) && (
                        <div style={{ color: 'var(--ink)', marginTop: 4, fontSize: 11.5, lineHeight: 1.35 }}>
                          <b style={{ color: 'var(--mut)' }}>To Address: </b>
                          {view.address || h.address}
                        </div>
                      )}
                      {(view.phone || h.phone) && (
                        <div style={{ color: 'var(--mut)', marginTop: 3, fontSize: 11.5 }}>
                          <b>Phone:</b> {view.phone || h.phone}
                        </div>
                      )}
                    </div>

                    <div style={{ borderLeft: '1px solid var(--line)', paddingLeft: 12 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--mut)', letterSpacing: '.05em', display: 'block', marginBottom: 2 }}>
                        Dispatch Details:
                      </span>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--mut)', fontWeight: 600 }}>Vehicle No:</span>
                        {(view.veh || h.veh) ? (
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
                            {(view.veh || h.veh).toUpperCase()}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--mut)', fontStyle: 'italic', fontWeight: 500 }}>
                            Not Specified
                          </span>
                        )}
                      </div>
                      <div style={{ color: 'var(--mut)', marginTop: 5, fontSize: 11.5 }}>
                        <b>Payment:</b> {view.pay || h.pay || 'Cash'}
                      </div>
                      {(view.project || h.project) && (
                        <div style={{ color: 'var(--mut)', marginTop: 2, fontSize: 11.5 }}>
                          <b>Site:</b> {view.project || h.project}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <table>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>HSN</th>
                      <th className="r">Qty</th>
                      <th className="r">Weight</th>
                      <th style={{ textAlign: 'center' }}>Unit</th>
                      <th className="r">Rate</th>
                      <th className="r">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.rows.length ? (
                      c.rows.map((r, k) => (
                        <tr key={k}>
                          <td style={{ whiteSpace: 'normal', fontWeight: 600 }}>
                            <div>{getMaterialDisplayName(r, lang, items)}</div>
                            {r.size && !getMaterialDisplayName(r, lang, items).includes(r.size) && (
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
                      ))
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
                  {c.totalWeight > 0 && (
                    <div style={{ color: 'var(--navy)', borderBottom: '1px solid var(--line)', paddingBottom: 4, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700 }}>Total Weight</span>
                      <b>{fmt(c.totalWeight)} KGS</b>
                    </div>
                  )}
                  <div>
                    <span>Subtotal</span>
                    <b>{inr(c.sub)}</b>
                  </div>
                  {Number(c.tax || 0) > 0 && (() => {
                    if (c.taxBreakdown && c.taxBreakdown.length > 0) {
                      return c.taxBreakdown.map(tb => (
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
                    (c.rows || []).forEach(r => {
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
                        cgst: c.cgst !== undefined ? c.cgst : +((Number(c.tax) / 2).toFixed(2)),
                        sgst: c.sgst !== undefined ? c.sgst : +((Number(c.tax) / 2).toFixed(2))
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
                    <span>Total Payable</span>
                    <span>{inr(c.total)}</span>
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
                    Amount in Words:
                  </span>
                  <b style={{ color: 'var(--navy)', fontSize: 12.5, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
                    {amountInWords(c.total)}
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
                      <b style={{ color: 'var(--navy)', display: 'block', marginBottom: 2, fontSize: 10.5 }}>Terms &amp; Conditions:</b>
                      <div style={{ whiteSpace: 'pre-line' }}>{settings.terms}</div>
                    </div>
                  ) : (
                    <div style={{ maxWidth: '58%', fontSize: 10, color: 'var(--mut)', lineHeight: 1.4 }}>
                      <b style={{ color: 'var(--navy)', display: 'block', marginBottom: 2, fontSize: 10.5 }}>Terms &amp; Conditions:</b>
                      <div>1. Goods once dispatched will not be taken back.</div>
                      <div>2. Interest @ 18% p.a. will be levied on delayed payments.</div>
                      <div>3. Weight verified at yard weighbridge is final.</div>
                      <div>4. Subject to Theni jurisdiction only.</div>
                    </div>
                  )}

                  {/* Right Column: Owner Signature for Sri Venkateswara Steels */}
                  <div style={{ textAlign: 'right', minWidth: 200, flexShrink: 0 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--navy)', letterSpacing: '.02em' }}>
                      For {settings.storeName || 'SRI VENKATESWARA STEELS'}
                    </div>
                    <div style={{ minHeight: 42, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', margin: '3px 0' }}>
                      <img
                        className="inv-owner-sign-img"
                        src={OWNER_SIGN}
                        alt="Owner Signature"
                        style={{
                          height: 42,
                          maxHeight: 46,
                          maxWidth: 150,
                          objectFit: 'contain'
                        }}
                      />
                    </div>
                    <div style={{
                      borderTop: '1.5px dashed var(--line)',
                      paddingTop: 4,
                      fontSize: 11,
                      fontWeight: 800,
                      color: 'var(--navy)'
                    }}>
                      Owner / Authorized Signatory
                    </div>
                    <div style={{ fontSize: 9.5, color: 'var(--mut)', marginTop: 1 }}>
                      Authorized Seal &amp; Signature
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions (hidden on print) */}
            <div className="no-print" style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn gold"
                style={{ fontWeight: 700 }}
                onClick={() => window.print()}
              >
                <Ic n="print" s={15} /> {t('printIssueSlip')}
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleCloseModal}
              >
                {view.isPreview ? t('close') : t('closeAndNewBill')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
