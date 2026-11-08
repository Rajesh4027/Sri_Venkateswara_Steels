import { useState, useMemo, useEffect, useRef, Fragment } from 'react';
import LOGO from '../assets/logo.png';
import OWNER_SIGN from '../assets/Owner Signature.jpeg';
import { fmt, inr, dt, amountInWords, DEFAULT_UOMS_LIST, formatCustomerName, getMaterialDisplayName, inferTamilName, getLocalTodayYmd } from '../utils';
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

function SteelTubesGraphic() {
  return (
    <svg width="190" height="66" viewBox="0 0 190 66" fill="none" xmlns="http://www.w3.org/2000/svg" className="pointer-events-none select-none">
      <defs>
        <linearGradient id="metalOuter1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F8FAFC" />
          <stop offset="40%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#94A3B8" />
        </linearGradient>
        <linearGradient id="metalTop1" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#FFFFFF" />
        </linearGradient>
        <linearGradient id="metalSide1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#64748B" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <linearGradient id="hollowSquare" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
        <linearGradient id="pipeMetal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F1F5F9" />
          <stop offset="50%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#64748B" />
        </linearGradient>
      </defs>
      {/* Soft ground shadow */}
      <ellipse cx="95" cy="58" rx="85" ry="6" fill="#000000" fillOpacity="0.06" />

      {/* Tube 1 (Square Hollow Section, left) */}
      <polygon points="12,26 26,14 80,14 66,26" fill="url(#metalTop1)" stroke="#CBD5E1" strokeWidth="0.8" />
      <polygon points="66,26 80,14 80,48 66,60" fill="url(#metalSide1)" />
      <polygon points="12,26 66,26 66,60 12,60" fill="url(#metalOuter1)" stroke="#CBD5E1" strokeWidth="0.8" />
      <polygon points="19,31 59,31 59,54 19,54" fill="url(#hollowSquare)" stroke="#64748B" strokeWidth="1.5" />

      {/* Tube 2 (Square Hollow Section, center stacked) */}
      <polygon points="50,18 64,6 118,6 104,18" fill="url(#metalTop1)" stroke="#E2E8F0" strokeWidth="0.8" />
      <polygon points="104,18 118,6 118,40 104,52" fill="url(#metalSide1)" />
      <polygon points="50,18 104,18 104,52 50,52" fill="url(#metalOuter1)" stroke="#CBD5E1" strokeWidth="0.8" />
      <polygon points="57,23 97,23 97,46 57,46" fill="url(#hollowSquare)" stroke="#64748B" strokeWidth="1.5" />

      {/* Round Steel Tube 1 */}
      <circle cx="134" cy="40" r="14" fill="url(#pipeMetal)" stroke="#94A3B8" strokeWidth="1" />
      <circle cx="134" cy="40" r="7.5" fill="url(#hollowSquare)" stroke="#64748B" strokeWidth="1" />

      {/* Round Steel Tube 2 */}
      <circle cx="158" cy="42" r="12" fill="url(#pipeMetal)" stroke="#94A3B8" strokeWidth="1" />
      <circle cx="158" cy="42" r="6" fill="url(#hollowSquare)" stroke="#64748B" strokeWidth="1" />

      {/* Round Steel Rebar Bar 3 */}
      <circle cx="146" cy="22" r="10" fill="url(#pipeMetal)" stroke="#94A3B8" strokeWidth="1" />
      <circle cx="146" cy="22" r="5" fill="url(#hollowSquare)" stroke="#64748B" strokeWidth="1" />
    </svg>
  );
}

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
        return getLocalTodayYmd(editingBill.date);
      } catch (e) { }
    }
    if (initialDraft?.issueDate) {
      return initialDraft.issueDate;
    }
    return getLocalTodayYmd();
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

  const SAVED_DRAFTS_KEY = 'svs_issue_saved_drafts_v2';
  const [deliveryType, setDeliveryType] = useState(() => editingBill?.deliveryType || 'Delivery Voucher');
  const [activeLine, setActiveLine] = useState({
    id: '',
    qty: 1,
    weight: '',
    weightUnit: 'KGS',
    uom: 'KGS',
    rate: 0,
    gst: 18
  });
  const [editingIndex, setEditingIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [allDrafts, setAllDrafts] = useState(() => {
    try {
      const raw = localStorage.getItem('svs_issue_saved_drafts_v2');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  });

  const isVehicleComposing = useRef(false);
  const isAddressComposing = useRef(false);
  const isSearchComposing = useRef(false);

  // Global Ctrl + K search shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('issue-global-search-input');
        if (searchInput) searchInput.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  // Live stock and HSN lookup for actively selected material in the quick-add row
  const activeItemStock = useMemo(() => {
    if (!activeLine.id || !by[activeLine.id]) return null;
    const it = by[activeLine.id];
    const base = getItemBaseStock(it);
    const usedByLines = ls
      .filter((_, idx) => idx !== editingIndex && _.id === it.id)
      .reduce((sum, other) => sum + getLineDeductQty(other, by[other.id]), 0);
    const rem = Math.max(0, +(base - usedByLines).toFixed(3));
    return {
      ...it,
      availableStock: rem,
      hsn: it.hsn || '',
      uom: it.uom || activeLine.uom || 'KGS'
    };
  }, [activeLine.id, activeLine.uom, by, ls, editingIndex, editingBill]);

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
        const displayNameTa = l.size ? `${rawTaName} (Size: ${l.size})` : (rawTaName || inferTamilName(rawEnName));
        const currentDisplayName = lang === 'ta' ? (displayNameTa || rawTaName || displayNameEn) : displayNameEn;

        return {
          ...l,
          qty: q,
          weight: hasWeight ? (isGrams ? rawW : +rawW.toFixed(3)) : null,
          weightInKg: hasWeight ? weightInKg : null,
          weightUnit: isGrams ? 'GMS' : 'KGS',
          stockDeductQty,
          name: currentDisplayName || displayNameEn,
          nameEn: displayNameEn,
          nameTa: displayNameTa || rawTaName || inferTamilName(rawEnName),
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
      veh: (h.veh || '').trim().toUpperCase(),
      ...k,
      enableGst,
      cgst: k.cgst,
      sgst: k.sgst,
      taxBreakdown: k.taxBreakdown,
      no: currentNo,
      date: issueDateTime,
      createdAt: editingBill?.createdAt || now.toISOString(),
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

  // Quick-Add Line Item to Table
  const handleAddActiveLine = () => {
    if (!activeLine.id) {
      if (toast) toast('⚠️ Please search and select a material to issue.');
      const inp = document.getElementById('quick-add-material-input');
      if (inp) inp.focus();
      return;
    }
    const it = by[activeLine.id];
    const q = parseFloat(activeLine.qty) || 0;
    const hasW = activeLine.weight !== '' && !isNaN(activeLine.weight) && +activeLine.weight > 0;
    if (q <= 0 && !hasW) {
      if (toast) toast('⚠️ Please enter a valid quantity or weight.');
      return;
    }

    if (editingIndex !== null) {
      const next = [...ls];
      next[editingIndex] = { ...activeLine };
      setLs(next);
      setEditingIndex(null);
      if (toast) toast(`✓ Updated ${it ? it.name : 'item'} in bill.`);
    } else {
      if (ls.length === 1 && !ls[0].id) {
        setLs([{ ...activeLine }]);
      } else {
        setLs([...ls, { ...activeLine }]);
      }
      if (toast) toast(`✓ Added ${it ? it.name : 'item'} to bill.`);
    }

    // Reset active line to ready state
    setActiveLine({ id: '', qty: 1, weight: '', weightUnit: 'KGS', uom: 'KGS', rate: 0, gst: 18 });
  };

  // Edit item from table
  const handleEditLine = (k) => {
    setEditingIndex(k);
    setActiveLine({ ...ls[k] });
    if (toast) toast(`Editing row #${k + 1}. Adjust fields above and click Update Item.`);
  };

  // Cancel editing item from table
  const handleCancelEdit = () => {
    setEditingIndex(null);
    setActiveLine({ id: '', qty: 1, weight: '', weightUnit: 'KGS', uom: 'KGS', rate: 0, gst: 18 });
    if (toast) toast(lang === 'ta' ? 'பொருள் திருத்துதல் ரத்து செய்யப்பட்டது.' : 'Item update cancelled.');
  };

  // Clear all customer and dispatch inputs
  const handleClearCustomerData = () => {
    setView(null);
    setH(prev => ({
      ...prev,
      phone: '',
      cust: '',
      address: '',
      veh: ''
    }));
    if (toast) toast(lang === 'ta' ? 'வாடிக்கையாளர் விவரங்கள் அழிக்கப்பட்டது.' : 'Customer details cleared.');
  };

  // Delete item from table
  const handleDeleteLine = (k) => {
    const next = ls.filter((_, idx) => idx !== k);
    setLs(next.length ? next : [{ id: '', qty: 1, weight: '', weightUnit: 'KGS', uom: 'KGS', rate: 0, gst: 18 }]);
    if (editingIndex === k) {
      setEditingIndex(null);
      setActiveLine({ id: '', qty: 1, weight: '', weightUnit: 'KGS', uom: 'KGS', rate: 0, gst: 18 });
    } else if (editingIndex !== null && editingIndex > k) {
      setEditingIndex(editingIndex - 1);
    }
    if (toast) toast('Item removed from bill.');
  };

  // Clear All
  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all form fields and added items?')) {
      setH(blank);
      setLs([{ id: '', qty: 1, weight: '', weightUnit: 'KGS', uom: 'KGS', rate: 0, gst: 18 }]);
      setActiveLine({ id: '', qty: 1, weight: '', weightUnit: 'KGS', uom: 'KGS', rate: 0, gst: 18 });
      setEditingIndex(null);
      setDraftRestored(false);
      try {
        localStorage.removeItem(ISSUE_DRAFT_KEY);
      } catch (e) {}
      if (toast) toast('✓ Bill form cleared.');
    }
  };

  // Save as Draft
  const handleSaveAsDraft = () => {
    const validLines = ls.filter(l => l.id);
    if (!h.cust && !h.phone && validLines.length === 0) {
      if (toast) toast('⚠️ Enter customer details or items before saving draft.');
      return;
    }
    const newDraft = {
      id: 'DRAFT-' + Date.now(),
      h,
      ls: validLines.length ? validLines : ls,
      issueDate,
      enableGst,
      deliveryType,
      total: c.total,
      savedAt: new Date().toISOString()
    };
    try {
      const existing = JSON.parse(localStorage.getItem(SAVED_DRAFTS_KEY) || '[]');
      const updated = [newDraft, ...existing.filter(d => d.id !== newDraft.id)].slice(0, 10);
      localStorage.setItem(SAVED_DRAFTS_KEY, JSON.stringify(updated));
      setAllDrafts(updated);
      if (toast) toast(`✓ Saved as Draft (#${updated.length} drafts stored)`);
    } catch (e) {
      if (toast) toast('✓ Draft saved locally.');
    }
  };

  // New Bill
  const handleNewBill = () => {
    if (setEditingBill) setEditingBill(null);
    setH(blank);
    setLs([{ id: '', qty: 1, weight: '', weightUnit: 'KGS', uom: 'KGS', rate: 0, gst: 18 }]);
    setActiveLine({ id: '', qty: 1, weight: '', weightUnit: 'KGS', uom: 'KGS', rate: 0, gst: 18 });
    setEditingIndex(null);
    setIssueNo('SVS-ISSUE-' + String(bills.length + 1001));
    setView(null);
    if (toast) toast('✓ Started new bill.');
  };

  // Direct print
  const handleDirectPrint = () => {
    handlePreviewVoucher();
    setTimeout(() => {
      window.print();
    }, 400);
  };

  const handlePreviewVoucher = () => {
    if (!h.cust || !h.cust.trim()) {
      toast('Please enter customer / contractor name to preview');
      return;
    }
    const previewBill = {
      ...h,
      cust: formatCustomerName(h.cust.trim()),
      veh: (h.veh || '').trim().toUpperCase(),
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
    <div className="flexible-page-container" style={{ width: '100%', maxWidth: '100%', paddingBottom: 60, boxSizing: 'border-box' }}>
      {/* Screen content (hidden during print so voucher prints clean) */}
      <div className="issue-bill-screen-content no-print" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
        
        {/* ── 1. Top Bar: Search Bar with Ctrl+K shortcut, Alerts, Help & User Profile Pill ── */}
        <div className="issue-top-bar">
          <div className="issue-search-box">
            <Ic n="search" s={16} />
            <input
              id="issue-global-search-input"
              type="text"
              placeholder="Search customers, materials, bills..."
              value={searchQuery}
              onCompositionStart={() => {
                isSearchComposing.current = true;
              }}
              onCompositionUpdate={() => {
                isSearchComposing.current = true;
              }}
              onCompositionEnd={e => {
                isSearchComposing.current = false;
                setSearchQuery(e.target.value);
              }}
              onChange={e => {
                if (isSearchComposing.current || e.nativeEvent?.isComposing) return;
                setSearchQuery(e.target.value);
              }}
              onBlur={e => {
                isSearchComposing.current = false;
                setSearchQuery(e.target.value);
              }}
              onKeyDown={e => {
                if (isSearchComposing.current || e.nativeEvent?.isComposing || e.keyCode === 229 || e.key === 'Process') return;
              }}
            />
            <span className="kbd-shortcut">Ctrl + K</span>
          </div>

          <div className="issue-top-actions">
            <button
              type="button"
              className="top-icon-btn"
              title="Low Stock Reorder Notifications"
              onClick={() => go && go('stock', 'low')}
            >
              <Ic n="bell" s={17} />
              <span className="dot-badge" />
            </button>

            <button
              type="button"
              className="top-icon-btn"
              title="Help & Shortcuts"
              onClick={() => toast && toast('💡 Tip: Press Ctrl + K to search. Pick items & click "+ Add Item" to build your voucher.')}
            >
              <Ic n="helpCircle" s={17} />
            </button>

            <div className="user-profile-pill" title={`${user || 'Rajesh Devaraj'} (Admin)`}>
              <div className="user-avatar-gold">
                {user ? user.slice(0, 2).toUpperCase() : 'RD'}
              </div>
              <div className="user-name-col">
                <span className="user-full-name">{user || 'Rajesh Devaraj'}</span>
                <span className="user-role-label">Admin</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. Page Hero Banner: Icon, Title, 3D Steel Pipes SVG Art & Header Action Buttons ── */}
        <div className="issue-hero-banner">
          <div className="hero-left">
            <div className="hero-icon-box">
              <Ic n="fileText" s={24} />
            </div>
            <div>
              <h1 className="hero-title">
                {editingBill ? (lang === 'ta' ? 'டெலிவரி வவுச்சரை திருத்து' : 'Edit Delivery Voucher') : (lang === 'ta' ? 'புதிய பில் / டெலிவரி வவுச்சர்' : 'New Issue Bill / Delivery Voucher')}
              </h1>
              <p className="hero-sub">
                {editingBill ? (lang === 'ta' ? 'பொருள் அளவு, விலை, வாடிக்கையாளர் அல்லது வாகன விவரங்களை திருத்தி சேமிக்கவும்.' : 'Modify material quantities, rates, customer or vehicle and save updates.') : (lang === 'ta' ? 'இருப்பில் உள்ள பொருட்களிலிருந்து பில் அல்லது டெலிவரி வவுச்சரை உருவாக்கவும்.' : 'Create a material issue bill or delivery voucher from live stock.')}
              </p>
            </div>
          </div>

          {/* 3D Metallic Steel Tubes Decorative Graphic */}
          <div className="hero-steel-art">
            <SteelTubesGraphic />
          </div>

          <div className="hero-right-actions">
            <button
              type="button"
              className="hero-draft-btn"
              onClick={() => setShowDraftsModal(true)}
              title={lang === 'ta' ? 'சேமிக்கப்பட்ட வரைவுகளைக் காண்க' : 'View saved drafts'}
            >
              <Ic n="fileText" s={15} /> {lang === 'ta' ? 'வரைவுகள்' : 'Drafts'} ({Math.max(draftRestored ? 1 : 0, allDrafts.length || 0)})
            </button>
          </div>
        </div>

        {/* ── Auto-Saved Draft Restored Banner (if active) ── */}
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
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: '#22C55E',
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Ic n="check" s={15} />
              </span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>
                  {t('draftRestoredTitle')}
                </div>
                <div style={{ fontSize: 11.5, color: '#15803D' }}>
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
            >
              <Ic n="trash" s={13} /> {t('clearDraftBtn')}
            </button>
          </div>
        )}

        {/* ── 3. Top Controls Row: Bill No, Issue Date ── */}
        <div className="issue-top-controls-card">
          {/* Col 1: Issue Bill No. (Auto-Generated) */}
          <div className="control-group">
            <label>{lang === 'ta' ? 'பில் எண் (தானியங்கி)' : 'Issue Bill No. (Auto-Generated)'}</label>
            <div className="input-icon-wrap">
              <input
                className="in"
                readOnly
                value={currentNo}
                style={{
                  fontWeight: 800,
                  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                  color: 'var(--navy)',
                  background: '#F8FAFC',
                  borderColor: '#E2E8F0',
                  cursor: 'default',
                  paddingRight: 115,
                  height: 38
                }}
              />
              <span className="auto-locked-badge">
                <Ic n="lock" s={11} /> {lang === 'ta' ? 'பூட்டப்பட்டது' : 'AUTO-LOCKED'}
              </span>
            </div>
          </div>

          {/* Col 2: Issue Date * */}
          <div className="control-group">
            <label>{lang === 'ta' ? 'பில் தேதி *' : 'Issue Date *'}</label>
            <div className="input-icon-wrap">
              <span className="input-prefix-icon"><Ic n="calendar" s={15} /></span>
              <input
                className="in with-prefix"
                type="date"
                value={issueDate}
                onChange={e => {
                  setView(null);
                  setIssueDate(e.target.value);
                }}
                style={{ height: 38, fontWeight: 700, fontSize: 13 }}
              />
            </div>
          </div>
        </div>

        {/* ── 4. Customer & Dispatch Destination Information ── */}
        <div className="issue-card-section">
          <div className="issue-card-header">
            <div className="issue-card-title">
              <Ic n="user" s={16} /> Customer &amp; Dispatch Information
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {(h.phone || h.cust || h.address || h.veh) && (
                <button
                  type="button"
                  onClick={handleClearCustomerData}
                  style={{
                    background: '#FEF2F2',
                    border: '1.5px solid #FCA5A5',
                    borderRadius: 8,
                    padding: '4px 10px',
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: '#DC2626',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    transition: 'all 0.15s ease'
                  }}
                  title={lang === 'ta' ? 'அனைத்து வாடிக்கையாளர் விவரங்களையும் அழிக்கவும்' : 'Clear all customer dispatch fields'}
                >
                  <Ic n="x" s={13} /> {lang === 'ta' ? 'விவரங்களை அழி' : 'Clear Details'}
                </button>
              )}
              <button
                type="button"
                className="auto-fetch-pill-btn"
                onClick={() => {
                  const el = document.querySelector('input[type="tel"]');
                  if (el) el.focus();
                  toast && toast('⚡ Type phone or customer name to autofill details');
                }}
              >
                <Ic n="zap" s={13} /> Auto-Fetch Details
              </button>
            </div>
          </div>

          <div className="issue-customer-grid">
            {/* Phone Number */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', margin: 0 }}>
                  {t('phoneNo')}
                </label>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#B45309', background: '#FEF3C7', border: '1px solid #FDE68A', padding: '1px 6px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <Ic n="zap" s={9} /> Auto-Fetch
                </span>
              </div>
              <CustomerAutofillInput
                field="phone"
                hideLabel
                prefixIcon="phone"
                value={h.phone}
                placeholder={t('phonePlaceholder')}
                customers={customerDirectory}
                onChange={val => {
                  setView(null);
                  setH({ ...h, phone: val });
                }}
                onSelectCustomer={handleSelectCustomer}
                onClearAll={handleClearCustomerData}
              />
            </div>

            {/* Customer / Contractor Name */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--navy)', marginBottom: 5 }}>
                {t('customerName')} *
              </label>
              <CustomerAutofillInput
                field="cust"
                required
                hideLabel
                prefixIcon="user"
                value={h.cust}
                placeholder={t('customerNamePlaceholder')}
                customers={customerDirectory}
                onChange={val => {
                  setView(null);
                  setH({ ...h, cust: val });
                }}
                onSelectCustomer={handleSelectCustomer}
                onClearAll={handleClearCustomerData}
              />
            </div>

            {/* To Address */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--navy)', marginBottom: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {t('toAddress')}
              </label>
              <div className="input-icon-wrap" style={{ position: 'relative' }}>
                <span className="input-prefix-icon"><Ic n="mapPin" s={14} /></span>
                <input
                  className="in with-prefix"
                  placeholder={t('toAddressPlaceholder')}
                  value={h.address || ''}
                  onCompositionStart={() => {
                    isAddressComposing.current = true;
                  }}
                  onCompositionUpdate={() => {
                    isAddressComposing.current = true;
                  }}
                  onCompositionEnd={e => {
                    isAddressComposing.current = false;
                    setView(null);
                    setH(prev => ({ ...prev, address: e.target.value }));
                  }}
                  onChange={e => {
                    if (isAddressComposing.current || e.nativeEvent?.isComposing) {
                      return;
                    }
                    setView(null);
                    setH(prev => ({ ...prev, address: e.target.value }));
                  }}
                  onBlur={e => {
                    isAddressComposing.current = false;
                    const val = e.target.value || '';
                    if (val !== (h.address || '')) {
                      setH(prev => ({ ...prev, address: val }));
                    }
                  }}
                  onKeyDown={e => {
                    if (isAddressComposing.current || e.nativeEvent?.isComposing || e.keyCode === 229 || e.key === 'Process') {
                      return;
                    }
                  }}
                  style={{ height: 38, fontSize: 13, fontWeight: 500, width: '100%', boxSizing: 'border-box', paddingRight: h.address ? 28 : 12 }}
                />
                {h.address && (
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => {
                      setView(null);
                      setH({ ...h, address: '' });
                    }}
                    style={{
                      position: 'absolute',
                      right: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--mut)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 2
                    }}
                    title="Clear address"
                  >
                    <Ic n="x" s={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Vehicle Number */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--navy)', marginBottom: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {t('vehicleNumber')}
              </label>
              <div className="input-icon-wrap" style={{ position: 'relative' }}>
                <span className="input-prefix-icon"><Ic n="truck" s={14} /></span>
                <input
                  className="in with-prefix"
                  placeholder={t('vehiclePlaceholder')}
                  style={{ textTransform: 'uppercase', fontWeight: 700, height: 38, fontSize: 13, width: '100%', boxSizing: 'border-box', paddingRight: h.veh ? 28 : 12 }}
                  value={h.veh || ''}
                  onCompositionStart={() => {
                    isVehicleComposing.current = true;
                  }}
                  onCompositionUpdate={() => {
                    isVehicleComposing.current = true;
                  }}
                  onCompositionEnd={e => {
                    isVehicleComposing.current = false;
                    setView(null);
                    setH(prev => ({ ...prev, veh: e.target.value }));
                  }}
                  onChange={e => {
                    if (isVehicleComposing.current || e.nativeEvent?.isComposing) {
                      return;
                    }
                    setView(null);
                    setH(prev => ({ ...prev, veh: e.target.value }));
                  }}
                  onBlur={e => {
                    isVehicleComposing.current = false;
                    const val = (e.target.value || '').trim().toUpperCase();
                    setH(prev => ({ ...prev, veh: val }));
                  }}
                  onKeyDown={e => {
                    if (isVehicleComposing.current || e.nativeEvent?.isComposing || e.keyCode === 229 || e.key === 'Process') {
                      return;
                    }
                  }}
                />
                {h.veh && (
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => {
                      setView(null);
                      setH({ ...h, veh: '' });
                    }}
                    style={{
                      position: 'absolute',
                      right: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--mut)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 2
                    }}
                    title="Clear vehicle number"
                  >
                    <Ic n="x" s={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Billing / Payment */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--navy)', marginBottom: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {t('billingPayment')}
              </label>
              <div className="input-icon-wrap">
                <span className="input-prefix-icon"><Ic n="creditCard" s={14} /></span>
                <select
                  className="in with-prefix"
                  value={h.pay}
                  onChange={e => {
                    setView(null);
                    setH({ ...h, pay: e.target.value });
                  }}
                  style={{ height: 38, fontWeight: 700, fontSize: 13, width: '100%', boxSizing: 'border-box' }}
                >
                  <option value="Cash">{lang === 'ta' ? 'ரொக்கம் (Cash)' : 'Cash'}</option>
                  <option value="UPI">{lang === 'ta' ? 'யுபிஐ (UPI)' : 'UPI'}</option>
                  <option value="Card">{lang === 'ta' ? 'கார்டு (Card)' : 'Card'}</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── 5. Materials To Issue Card ── */}
        <div className="issue-card-section">
          <div className="issue-card-header">
            <div className="issue-card-title">
              <Ic n="layers" s={16} /> Materials To Issue
            </div>

            {/* GST Tax Toggle Switch */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--navy)' }}>GST Option</span>
              <div
                role="button"
                tabIndex={0}
                onClick={handleToggleGst}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                <div style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  background: enableGst ? '#1E3A8A' : '#E2E8F0',
                  padding: 2,
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'background 0.25s ease'
                }}>
                  <div style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    transform: enableGst ? 'translateX(20px)' : 'translateX(0)',
                    transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {enableGst && <Ic n="check" s={11} className="text-blue-600" />}
                  </div>
                </div>
                <span style={{
                  fontSize: 11.5,
                  fontWeight: 800,
                  color: enableGst ? '#2563EB' : '#64748B'
                }}>
                  {enableGst ? `ON (${activeGstTitle || '18%'})` : 'OFF (No GST)'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick-Add Row */}
          <div className="issue-quick-add-grid">
            {/* Col 1: Material Combobox */}
            <div style={{ minWidth: 0 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--navy)', marginBottom: 4 }}>
                {t('materialToIssueLabel')} *
              </label>
              <IssueMaterialCombobox
                id="quick-add-material-input"
                items={items.map(item => {
                  const base = getItemBaseStock(item);
                  const usedByLines = ls
                    .filter((_, idx) => idx !== editingIndex && _.id === item.id)
                    .reduce((sum, other) => sum + getLineDeductQty(other, by[other.id]), 0);
                  const rem = Math.max(0, +(base - usedByLines).toFixed(3));
                  return { ...item, stock: rem };
                })}
                enableGst={enableGst}
                selectedId={activeLine.id}
                toast={toast}
                placeholder={lang === 'ta' ? 'பொருள் பெயர் அல்லது HSN குறியீடு தேடவும்...' : 'Search material description or HSN no...'}
                onSelect={selected => {
                  setView(null);
                  if (!selected) {
                    setActiveLine({ ...activeLine, id: '', rate: 0 });
                    return;
                  }
                  const unit = selected.uom || 'KGS';
                  const baseRate = Number(selected.rateWithoutGst ?? selected.rate ?? 0);
                  const defaultGst = 18;
                  const rateWithGst = Number(
                    selected.rateWithGst !== undefined && selected.rateWithGst !== null
                      ? selected.rateWithGst
                      : +(baseRate * (1 + defaultGst / 100)).toFixed(2)
                  );
                  const effectiveRate = enableGst ? baseRate : (rateWithGst || baseRate);
                  setActiveLine({
                    ...activeLine,
                    id: selected.id,
                    uom: unit,
                    rate: effectiveRate || 0,
                    gst: defaultGst,
                    weightUnit: unit === 'GMS' ? 'GMS' : 'KGS'
                  });
                }}
              />

              {/* Live Selected Material Stock & HSN Badge below input box */}
              {activeItemStock && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 6,
                  padding: '4px 10px',
                  background: activeItemStock.availableStock > 0 ? '#F0FDF4' : '#FEF2F2',
                  border: `1.5px solid ${activeItemStock.availableStock > 0 ? '#86EFAC' : '#FCA5A5'}`,
                  borderRadius: 8,
                  fontSize: 11.5,
                  lineHeight: 1.25,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  flexWrap: 'wrap'
                }}>
                  {/* HSN Number */}
                  <span style={{
                    color: '#334155',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    <span style={{ fontWeight: 800, color: 'var(--navy)' }}>HSN:</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, background: '#F1F5F9', padding: '1px 6px', borderRadius: 4, border: '1px solid #E2E8F0', color: '#1E293B' }}>
                      {activeItemStock.hsn || '-'}
                    </span>
                  </span>

                  <span style={{ color: '#CBD5E1' }}>•</span>

                  {/* Available Stock */}
                  <span style={{
                    color: activeItemStock.availableStock > 0 ? '#15803D' : '#DC2626',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5
                  }}>
                    <span style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: activeItemStock.availableStock > 0 ? '#22C55E' : '#EF4444',
                      boxShadow: activeItemStock.availableStock > 0 ? '0 0 0 2px rgba(34, 197, 94, 0.25)' : '0 0 0 2px rgba(239, 68, 68, 0.25)',
                      display: 'inline-block'
                    }} />
                    <span>
                      {lang === 'ta' ? 'கிடைக்கும் கையிருப்பு:' : 'Available Stock:'}{' '}
                      <b style={{ color: activeItemStock.availableStock > 0 ? '#166534' : '#991B1B' }}>
                        {fmt(activeItemStock.availableStock)} {activeItemStock.uom}
                      </b>
                    </span>
                  </span>
                </div>
              )}
            </div>

            {/* Col 2: Quantity */}
            <div style={{ minWidth: 0 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--navy)', marginBottom: 4 }}>
                {t('quantity')}
              </label>
              <input
                className="in r"
                type="number"
                min="0.001"
                step="any"
                placeholder="1"
                value={activeLine.qty === '' ? '' : activeLine.qty}
                style={{ width: '100%', height: 38, fontSize: 13, fontWeight: 600, boxSizing: 'border-box' }}
                onChange={e => {
                  setView(null);
                  const raw = e.target.value;
                  setActiveLine({ ...activeLine, qty: raw === '' ? '' : parseFloat(raw) || 0 });
                }}
              />
            </div>

            {/* Col 3: Weight with KG / GMS pills */}
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)', margin: 0 }}>
                  {t('weight')}
                </label>
                <div style={{ display: 'inline-flex', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 6, padding: 1.5 }}>
                  <button
                    type="button"
                    style={{
                      border: 'none',
                      background: activeLine.weightUnit !== 'GMS' ? '#D97706' : 'transparent',
                      color: activeLine.weightUnit !== 'GMS' ? '#fff' : '#64748B',
                      fontSize: 9.5,
                      fontWeight: 800,
                      padding: '1px 5px',
                      borderRadius: 4,
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      if (activeLine.weightUnit === 'GMS' && activeLine.weight) {
                        setActiveLine({ ...activeLine, weightUnit: 'KGS', weight: +(+activeLine.weight / 1000).toFixed(4) });
                      } else {
                        setActiveLine({ ...activeLine, weightUnit: 'KGS' });
                      }
                    }}
                  >
                    KG
                  </button>
                  <button
                    type="button"
                    style={{
                      border: 'none',
                      background: activeLine.weightUnit === 'GMS' ? '#D97706' : 'transparent',
                      color: activeLine.weightUnit === 'GMS' ? '#fff' : '#64748B',
                      fontSize: 9.5,
                      fontWeight: 800,
                      padding: '1px 5px',
                      borderRadius: 4,
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      if (activeLine.weightUnit !== 'GMS' && activeLine.weight) {
                        setActiveLine({ ...activeLine, weightUnit: 'GMS', weight: Math.round(+activeLine.weight * 1000) });
                      } else {
                        setActiveLine({ ...activeLine, weightUnit: 'GMS' });
                      }
                    }}
                  >
                    GMS
                  </button>
                </div>
              </div>
              <input
                className="in r"
                type="text"
                inputMode="decimal"
                placeholder="e.g. 0.5"
                value={activeLine.weight}
                style={{ width: '100%', height: 38, fontSize: 13, fontWeight: 600, boxSizing: 'border-box' }}
                onKeyDown={e => {
                  if (e.isComposing || e.nativeEvent?.isComposing || e.keyCode === 229 || e.key === 'Process') {
                    return;
                  }
                  // Allow navigation, editing, shortcuts (Ctrl+A, Ctrl+C, Ctrl+V, etc.)
                  if (
                    ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key) ||
                    (e.ctrlKey || e.metaKey)
                  ) {
                    return;
                  }
                  // Allow numbers 0-9
                  if (/^[0-9]$/.test(e.key)) {
                    return;
                  }
                  // Allow decimal point only if not already present in the value
                  if (e.key === '.' && !String(activeLine.weight || '').includes('.')) {
                    return;
                  }
                  // Block all other keys (letters, symbols, spaces, second dot)
                  e.preventDefault();
                }}
                onChange={e => {
                  setView(null);
                  let val = e.target.value.replace(/[^0-9.]/g, '');
                  const parts = val.split('.');
                  if (parts.length > 2) {
                    val = parts[0] + '.' + parts.slice(1).join('');
                  }
                  setActiveLine({ ...activeLine, weight: val });
                }}
                onPaste={e => {
                  e.preventDefault();
                  const pasteData = (e.clipboardData || window.clipboardData)?.getData('text') || '';
                  let clean = pasteData.replace(/[^0-9.]/g, '');
                  const parts = clean.split('.');
                  if (parts.length > 2) clean = parts[0] + '.' + parts.slice(1).join('');
                  setActiveLine({ ...activeLine, weight: clean });
                }}
              />
            </div>

            {/* Col 4: Unit */}
            <div style={{ minWidth: 0 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--navy)', marginBottom: 4 }}>
                {t('unit')}
              </label>
              <select
                className="in"
                value={activeLine.uom}
                style={{ width: '100%', height: 38, fontSize: 12.5, fontWeight: 700, boxSizing: 'border-box' }}
                onChange={e => setActiveLine({ ...activeLine, uom: e.target.value })}
              >
                {availableUoms.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            {/* Col 5: Rate */}
            <div style={{ minWidth: 0 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--navy)', marginBottom: 4 }}>
                {t('rate')} (₹/{activeLine.uom})
              </label>
              <input
                className="in r"
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                value={activeLine.rate === '' ? '' : activeLine.rate}
                style={{ width: '100%', height: 38, fontSize: 13, fontWeight: 600, boxSizing: 'border-box' }}
                onChange={e => setActiveLine({ ...activeLine, rate: e.target.value === '' ? '' : +e.target.value })}
              />
            </div>

            {/* Col 6: GST % */}
            <div style={{ minWidth: 0 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--navy)', marginBottom: 4 }}>
                {t('gstPercent')}
              </label>
              <select
                className="in gs"
                disabled={!enableGst}
                value={enableGst ? (activeLine.gst ?? 18) : 0}
                style={{
                  width: '100%',
                  height: 38,
                  fontSize: 12.5,
                  fontWeight: 700,
                  boxSizing: 'border-box',
                  background: enableGst ? '#fff' : '#F1F5F9'
                }}
                onChange={e => setActiveLine({ ...activeLine, gst: +e.target.value })}
              >
                {!enableGst ? (
                  <option value="0">0% (GST Off)</option>
                ) : (
                  GST_SLAB_OPTIONS.map(opt => <option key={opt.val} value={opt.val}>{opt.label}</option>)
                )}
              </select>
            </div>

            {/* Col 7: + Add Item / Update Button & Cancel Edit Button */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'transparent', marginBottom: 4, userSelect: 'none' }}>
                &nbsp;
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  className="btn-add-item"
                  style={{ flex: 1, padding: editingIndex !== null ? '0 10px' : '0 14px' }}
                  onClick={handleAddActiveLine}
                >
                  <Ic n={editingIndex !== null ? 'check' : 'plus'} s={15} />
                  {editingIndex !== null ? (lang === 'ta' ? 'பொருளை புதுப்பி' : 'Update Item') : (lang === 'ta' ? '+ பொருளைச் சேர்' : '+ Add Item')}
                </button>

                {editingIndex !== null && (
                  <button
                    type="button"
                    className="btn-cancel-edit"
                    onClick={handleCancelEdit}
                    title={lang === 'ta' ? 'திருத்துவதை ரத்து செய்' : 'Cancel update'}
                    style={{
                      height: 38,
                      width: 38,
                      minWidth: 38,
                      borderRadius: 10,
                      border: '1.5px solid #CBD5E1',
                      background: '#ffffff',
                      color: '#64748B',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxSizing: 'border-box',
                      flexShrink: 0
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = '#FEE2E2';
                      e.currentTarget.style.borderColor = '#FCA5A5';
                      e.currentTarget.style.color = '#DC2626';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = '#ffffff';
                      e.currentTarget.style.borderColor = '#CBD5E1';
                      e.currentTarget.style.color = '#64748B';
                    }}
                  >
                    <Ic n="x" s={16} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Materials Table of Added Items */}
          <div className="issue-table-wrap">
            <table className="issue-table">
              <thead>
                <tr>
                  <th style={{ width: 44, textAlign: 'center' }}>#</th>
                  <th>{lang === 'ta' ? 'பொருள் விவரம்' : 'Material Description'}</th>
                  <th style={{ width: 85, textAlign: 'center' }}>HSN</th>
                  <th style={{ width: 75, textAlign: 'center' }}>{lang === 'ta' ? 'அளவு' : 'Qty'}</th>
                  <th style={{ width: 95, textAlign: 'center' }}>{lang === 'ta' ? 'எடை' : 'Weight'}</th>
                  <th style={{ width: 75, textAlign: 'center' }}>{lang === 'ta' ? 'அலகு' : 'Unit'}</th>
                  <th style={{ width: 100, textAlign: 'right' }}>{lang === 'ta' ? 'விலை (₹)' : 'Rate (₹)'}</th>
                  <th style={{ width: 80, textAlign: 'center' }}>{lang === 'ta' ? 'ஜிஎஸ்டி %' : 'GST %'}</th>
                  <th style={{ width: 115, textAlign: 'right' }}>{lang === 'ta' ? 'தொகை (₹)' : 'Amount (₹)'}</th>
                  <th style={{ width: 85, textAlign: 'center' }}>{lang === 'ta' ? 'செயல்' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {c.rows.filter(r => r.id).length === 0 ? (
                  <tr>
                    <td colSpan="10" style={{ textAlign: 'center', padding: '36px 20px', color: '#94A3B8' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <Ic n="box" s={28} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#64748B' }}>
                          {lang === 'ta' ? 'பொருட்கள் எதுவும் சேர்க்கப்படவில்லை' : 'No materials added yet'}
                        </span>
                        <span style={{ fontSize: 11.5 }}>
                          {lang === 'ta' ? 'மேலே உள்ள பெட்டியில் பொருளைத் தேர்ந்தெடுத்து, + பொருளைச் சேர் என்பதைக் கிளிக் செய்யவும்.' : 'Search and select a material above, then click + Add Item.'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  c.rows.filter(r => r.id).map((r, idx) => {
                    const isOver = r.isOverStock;
                    const isCurrentEditing = editingIndex === idx;
                    const itemDesc = getMaterialDisplayName(r, lang, items) || (lang === 'ta' ? (r.nameTa || inferTamilName(r.name) || r.name) : (r.nameEn || r.name));
                    return (
                      <tr
                        key={idx}
                        style={{
                          background: isCurrentEditing ? '#EFF6FF' : (isOver ? '#FEF2F2' : undefined)
                        }}
                      >
                        <td style={{ textAlign: 'center', fontWeight: 800, color: '#64748B' }}>{idx + 1}</td>
                        <td>
                          <div style={{ fontWeight: 800, color: isOver ? '#DC2626' : 'var(--navy)' }}>
                            {itemDesc}
                          </div>
                          {isOver && (
                            <div style={{ fontSize: 10.5, color: '#DC2626', fontWeight: 700, marginTop: 2 }}>
                              ● {lang === 'ta' ? `கையிருப்பை விட அதிகம் (கையிருப்பு: ${fmt(r.availableStock)} ${r.uom})` : `Exceeds stock (Only ${fmt(r.availableStock)} ${r.uom} available)`}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', color: '#64748B' }}>{r.hsn || '-'}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{r.qty}</td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{r.weight ? fmt(r.weight) : '-'}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: '#475569' }}>{r.uom}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{r.rate ? (+r.rate).toFixed(2) : '0.00'}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: '#475569' }}>{enableGst ? `${r.gst || 0}%` : '0%'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 900, color: 'var(--navy)' }}>
                          {inr(r.amt).replace('₹', '')}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <button
                              type="button"
                              className="action-btn-circle edit"
                              title={lang === 'ta' ? 'பொருளை திருத்து' : 'Edit item'}
                              onClick={() => handleEditLine(idx)}
                            >
                              <Ic n="edit" s={13} />
                            </button>
                            <button
                              type="button"
                              className="action-btn-circle delete"
                              title={lang === 'ta' ? 'பொருளை நீக்கு' : 'Remove item'}
                              onClick={() => handleDeleteLine(idx)}
                            >
                              <Ic n="trash" s={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 6. Order Financial Summary Row (Three Distinct Cards matching Image 2) ── */}
        <div className="issue-summary-row">
          {/* Card 1: Amount in Words */}
          <div className="summary-words-card">
            <div className="words-icon-wrap">
              <svg width="26" height="32" viewBox="0 0 28 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 2H18L26 10V30C26 31.1 25.1 32 24 32H4C2.9 32 2 31.1 2 30V4C2 2.9 2.9 2 4 2Z" stroke="#B45309" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M18 2V10H26" stroke="#B45309" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <text x="14" y="24" textAnchor="middle" fill="#B45309" fontSize="13" fontWeight="900" fontFamily="system-ui, sans-serif">A</text>
              </svg>
            </div>
            <div className="words-content">
              <div className="words-label">
                {lang === 'ta' ? 'தொகை எழுத்துக்களில்:' : 'Amount in Words'}
              </div>
              <div className="words-text">
                {amountInWords(c.total, lang)}
              </div>
            </div>
          </div>

          {/* Card 2: Subtotal & GST */}
          <div className="summary-subtotal-card">
            <div className="subtotal-line">
              <span className="line-label">{lang === 'ta' ? 'கூடுதல் தொகை' : 'Subtotal'}</span>
              <span className="line-val">{inr(c.sub)}</span>
            </div>
            <div className="subtotal-line">
              <span className="line-label">GST ({enableGst ? `${activeGstTitle || '18%'}` : '0%'})</span>
              <span className="line-val tax">{inr(c.tax)}</span>
            </div>
          </div>

          {/* Card 3: Total Payable */}
          <div className="summary-total-card">
            <div className="total-icon">
              <Ic n="wallet" s={30} />
            </div>
            <div>
              <div className="total-label">
                {lang === 'ta' ? 'செலுத்த வேண்டிய மொத்த தொகை' : 'Total Payable'}
              </div>
              <div className="total-val">
                {inr(c.total)}
              </div>
            </div>
          </div>
        </div>

        {/* ── 7. Bottom Action Footer Bar ── */}
        <div className="issue-footer-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              className="btn-footer-outline danger"
              onClick={handleClearAll}
              title={lang === 'ta' ? 'அனைத்து விவரங்களையும் அழித்து புதிதாக தொடங்கவும்' : 'Clear all inputs and start clean'}
            >
              <Ic n="trash" s={14} /> {lang === 'ta' ? 'அனைத்தையும் அழி' : 'Clear All'}
            </button>
            <button
              type="button"
              className="btn-footer-outline"
              onClick={handleSaveAsDraft}
              title={lang === 'ta' ? 'தற்போதைய பில்லை வரைவாக சேமிக்கவும்' : 'Save current progress as a draft'}
            >
              <Ic n="fileText" s={14} /> {lang === 'ta' ? 'வரைவாக சேமி' : 'Save as Draft'}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              className="btn-footer-outline"
              onClick={handlePreviewVoucher}
              title={lang === 'ta' ? 'டெலிவரி வவுச்சர் அச்சு முன்னோட்டம்' : 'Preview printable delivery voucher'}
            >
              <Ic n="eye" s={15} /> {lang === 'ta' ? 'முன்னோட்டம்' : 'Preview'}
            </button>
            <button
              type="button"
              className="btn-footer-gold"
              disabled={!!overRow}
              style={{
                opacity: overRow ? 0.6 : 1,
                cursor: overRow ? 'not-allowed' : 'pointer'
              }}
              onClick={handleSave}
              title={overRow ? (lang === 'ta' ? 'வழங்க முடியாது: கிடங்கு கையிருப்பை விட அதிகம்' : 'Cannot issue: Exceeds warehouse stock') : (lang === 'ta' ? 'பில் பதிவு செய்து கையிருப்பை குறைக்கவும்' : 'Save bill & deduct live stock')}
            >
              <Ic n="check" s={16} /> {lang === 'ta' ? 'பில் பதிவு செய் & வழங்கிடு' : 'Save & Issue Bill'}
            </button>
          </div>
        </div>

        {/* Stock warning banner if any item exceeds */}
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

        {/* ── 8. Saved Drafts Modal Drawer ── */}
        {showDraftsModal && (
          <div
            className="lightbox"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15,23,42,0.6)',
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16
            }}
            onClick={() => setShowDraftsModal(false)}
          >
            <div
              style={{
                background: '#fff',
                borderRadius: 16,
                padding: '20px 24px',
                maxWidth: 520,
                width: '100%',
                boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                border: '1.5px solid var(--line)'
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Ic n="fileText" s={18} /> Saved Drafts ({allDrafts.length})
                </div>
                <button
                  type="button"
                  className="ib"
                  style={{ width: 28, height: 28, borderRadius: '50%' }}
                  onClick={() => setShowDraftsModal(false)}
                >
                  <Ic n="x" s={14} />
                </button>
              </div>

              {allDrafts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 20px', color: '#94A3B8' }}>
                  No saved drafts found. Click "Save as Draft" on any bill to keep a copy here.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 360, overflowY: 'auto' }}>
                  {allDrafts.map((d, i) => (
                    <div
                      key={d.id || i}
                      style={{
                        padding: '12px 14px',
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--navy)' }}>
                          {d.h?.cust || 'Unnamed Customer'}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                          {d.ls?.length || 0} materials · {inr(d.total || 0)} · {new Date(d.savedAt || Date.now()).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          className="btn sm gold"
                          style={{ fontSize: 11, padding: '4px 10px', height: 28 }}
                          onClick={() => {
                            setH(d.h || blank);
                            setLs(d.ls && d.ls.length ? d.ls : [{ id: '', qty: 1, weight: '', weightUnit: 'KGS', uom: 'KGS', rate: 0, gst: 18 }]);
                            if (d.issueDate) setIssueDate(d.issueDate);
                            if (d.enableGst !== undefined) setEnableGst(d.enableGst);
                            if (d.deliveryType) setDeliveryType(d.deliveryType);
                            setShowDraftsModal(false);
                            if (toast) toast('✓ Restored draft successfully.');
                          }}
                        >
                          Restore
                        </button>
                        <button
                          type="button"
                          className="ib"
                          style={{ width: 28, height: 28, color: '#DC2626', borderColor: '#FECACA' }}
                          onClick={() => {
                            const updated = allDrafts.filter((_, idx) => idx !== i);
                            setAllDrafts(updated);
                            localStorage.setItem(SAVED_DRAFTS_KEY, JSON.stringify(updated));
                          }}
                          title="Delete draft"
                        >
                          <Ic n="trash" s={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 9. Past Deliveries History Shortcut ── */}
        <div style={{
          marginTop: 18,
          background: '#F8FAFC',
          border: '1.5px solid var(--line)',
          borderRadius: 12,
          padding: '12px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: '#fff',
              color: 'var(--navy)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--line)'
            }}>
              <Ic n="fileText" s={16} />
            </span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--navy)' }}>
                Looking for Past Deliveries?
              </div>
              <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 1 }}>
                View complete ledger of issued delivery vouchers, dates and stock movement.
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
                      <span style={{ fontWeight: 700 }}>{lang === 'ta' ? 'மொத்த எடை' : 'Total Weight'}</span>
                      <b>{fmt(c.totalWeight)} {lang === 'ta' ? 'கிலோ' : 'KGS'}</b>
                    </div>
                  )}
                  <div>
                    <span>{lang === 'ta' ? 'கூடுதல் தொகை' : 'Subtotal'}</span>
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
                    <span>{lang === 'ta' ? 'செலுத்த வேண்டிய மொத்த தொகை' : 'Total Payable'}</span>
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
                    {lang === 'ta' ? 'தொகை எழுத்துக்களில்:' : 'Amount in Words:'}
                  </span>
                  <b style={{ color: 'var(--navy)', fontSize: 12.5, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
                    {amountInWords(c.total, lang)}
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
