import { DEFAULT_CATEGORIES } from './data/categories';
import { LOGO_BASE64 } from './assets/logoBase64';

export const fmt = n => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
export const inr = n => '₹' + fmt(n);
export const dt = s => {
  if (!s) return '';
  try {
    const d = typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
      ? new Date(s + 'T00:00:00')
      : new Date(s);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (e) {
    return '';
  }
};
export const formatDateDMY = dt;
export const KEY = 'svs-steels-clean-v2';

export const formatTitleCase = str => {
  if (!str) return '';
  return String(str).replace(/\b([a-zA-Z])([a-zA-Z]*)/g, (_, first, rest) => {
    return first.toUpperCase() + rest.toLowerCase();
  });
};
export const formatCustomerName = formatTitleCase;

export const DEFAULT_CATEGORIES_LIST = [
  'Steel',
  'Aggregates',
  'Shuttering',
  'Safety & PPE',
  'Tools & Hardware',
  'Plumbing & Consumables'
];

export const DEFAULT_UOMS_LIST = [
  'MT',
  'KGS',
  'GMS',
  'NOS',
  'PCS',
  'PAIRS',
  'CFT',
  'M3',
  'RMT',
  'FEET',
  'EA',
  'BOX',
  'BAGS',
  'PKT',
  'RL',
  'LTR',
  'BUNDLE'
];

/**
 * Returns current application zoom factor (e.g. 0.9 for 90%)
 * Used to properly position portal dropdowns across all zoom levels without offsets.
 */
export function getAppZoomFactor() {
  try {
    const raw = document.documentElement.style.zoom;
    if (raw) {
      const num = parseFloat(raw);
      if (!isNaN(num) && num > 0) {
        return raw.includes('%') ? num / 100 : num;
      }
    }
    const cssVar = getComputedStyle(document.documentElement).getPropertyValue('--app-zoom-factor');
    if (cssVar) {
      const num = parseFloat(cssVar);
      if (!isNaN(num) && num > 0) return num;
    }
  } catch (e) { }
  return 1;
}

export function inferTamilName(nameEn) {
  if (!nameEn) return '';
  const n = String(nameEn).toUpperCase();
  if (/TMT.*12\s*MM/i.test(n)) return 'டிஎம்டி 12மிமீ Fe550D கம்பிகள்';
  if (/TMT.*10\s*MM/i.test(n)) return 'டிஎம்டி 10மிமீ Fe550D கம்பிகள்';
  if (/TMT.*16\s*MM/i.test(n)) return 'டிஎம்டி 16மிமீ Fe550D கம்பிகள்';
  if (/TMT.*8\s*MM/i.test(n)) return 'டிஎம்டி 8மிமீ Fe550D கம்பிகள்';
  if (/TMT.*20\s*MM/i.test(n)) return 'டிஎம்டி 20மிமீ கம்பிகள்';
  if (/TMT.*25\s*MM/i.test(n)) return 'டிஎம்டி 25மிமீ கம்பிகள்';
  if (/TMT|REBAR|ROD/i.test(n)) return 'டிஎம்டி ஸ்டீல் கம்பிகள்';
  if (/BINDING WIRE/i.test(n)) return 'கட்டு கம்பி (Binding Wire)';
  if (/MATTAKOL/i.test(n)) return 'அலுமினியம் மட்டக்கோல்';
  if (/STRAIGHT EDGE/i.test(n)) return 'அலுமினியம் ஸ்ட்ரைட் எட்ஜ் மட்டப்பலகை';
  if (/SPADE/i.test(n)) return 'மண்வெட்டி கைப்பிடியுடன்';
  if (/SAFETY SHOE/i.test(n)) return 'பாதுகாப்பு காலணி (Safety Shoe)';
  if (/COVER BLOCK/i.test(n)) return 'கவர் பிளாக் (Cover Block)';
  if (/NAILS.*1.*1\/2|NAILS.*11\/2/i.test(n)) return 'ஆணி 11/2';
  if (/NAILS.*2.*1\/2|NAILS.*21\/2/i.test(n)) return 'ஆணி 21/2';
  if (/NAILS.*2\s*X\s*2/i.test(n)) return 'ஆணி 2X2 வயர் ஆணி';
  if (/NAILS/i.test(n)) return 'ஆணி';
  if (/SCREW/i.test(n)) return 'குத்து ஊசி';
  if (/CEMENT/i.test(n)) return 'சிமெண்ட் மூட்டை (Cement)';
  if (/SAND/i.test(n)) return 'மணல் (Sand)';
  if (/HAMMER/i.test(n)) return 'சுத்தியல் (Hammer)';
  if (/PIPE|UPVC/i.test(n)) return 'குழாய் (Pipe)';
  if (/GLOVES/i.test(n)) return 'பாதுகாப்பு கையுறைகள் (Gloves)';
  if (/HELMET/i.test(n)) return 'பாதுகாப்பு ஹெல்மெட் (Helmet)';
  return '';
}

export function inferEnglishName(nameTa) {
  if (!nameTa) return '';
  const s = String(nameTa).trim();
  if (/டிஎம்டி.*12\s*மிமீ/i.test(s)) return 'TMT 12MM Fe550D Rebars';
  if (/டிஎம்டி.*10\s*மிமீ/i.test(s)) return 'TMT 10MM Fe550D Rebars';
  if (/டிஎம்டி.*16\s*மிமீ/i.test(s)) return 'TMT 16MM Fe550D Rebars';
  if (/டிஎம்டி.*8\s*மிமீ/i.test(s)) return 'TMT 8MM Fe550D Rebars';
  if (/டிஎம்டி.*20\s*மிமீ/i.test(s)) return 'TMT 20MM Rebars';
  if (/டிஎம்டி.*25\s*மிமீ/i.test(s)) return 'TMT 25MM Rebars';
  if (/டிஎம்டி|ஸ்டீல்\s*கம்பி/i.test(s)) return 'TMT Steel Rebars';
  if (/கட்டு\s*கம்பி/i.test(s)) return 'Binding Wire';
  if (/மட்டக்கோல்/i.test(s)) return 'Aluminum Mattakol';
  if (/ஸ்ட்ரைட்\s*எட்ஜ்/i.test(s)) return 'Aluminum Straight Edge';
  if (/மண்வெட்டி/i.test(s)) return 'Spade with Handle';
  if (/காலணி|ஷூ/i.test(s)) return 'Safety Shoes';
  if (/கவர்\s*பிளாக்/i.test(s)) return 'Cover Block';
  if (/ஆணி.*1.*1\/2|ஆணி.*11\/2/i.test(s)) return 'Nails 11/2';
  if (/ஆணி.*2.*1\/2|ஆணி.*21\/2/i.test(s)) return 'Nails 21/2';
  if (/ஆணி.*2\s*X\s*2/i.test(s)) return 'Nails 2X2';
  if (/ஆணி/i.test(s)) return 'Nails';
  if (/குத்து\s*ஊசி|திருகாணி/i.test(s)) return 'Screw';
  if (/சிமெண்ட்/i.test(s)) return 'Cement Bag';
  if (/மணல்/i.test(s)) return 'Sand';
  if (/சுத்தியல்/i.test(s)) return 'Hammer';
  if (/குழாய்/i.test(s)) return 'UPVC Pipe';
  if (/கையுறை/i.test(s)) return 'Safety Gloves';
  if (/ஹெல்மெட்/i.test(s)) return 'Safety Helmet';
  return '';
}

/**
 * Returns localized material name:
 * - When lang === 'ta': returns Tamil name (nameTa / tamilName) if available, inferTamilName, or fallback.
 * - When lang === 'en': returns English name (name / rawName / nameEn), inferEnglishName, or fallback.
 * Supports passing `items` inventory array for authoritative cross-language lookup by item.id or name.
 */
export function getMaterialDisplayName(item, lang = 'en', items = []) {
  if (!item) return '';
  if (typeof item === 'string') {
    const isTa = /[\u0B80-\u0BFF]/.test(item);
    if (lang === 'ta') {
      return isTa ? item : (inferTamilName(item) || item);
    } else {
      return !isTa ? item : (inferEnglishName(item) || item);
    }
  }

  // 1. Authoritative lookup in live items master inventory
  let master = null;
  if (item.id && Array.isArray(items) && items.length > 0) {
    master = items.find(i => i.id === item.id);
  }
  if (!master && Array.isArray(items) && items.length > 0) {
    const cEn = (item.rawName || item.nameEn || (!/[\u0B80-\u0BFF]/.test(item.name) ? item.name : '') || '').trim().toLowerCase();
    const cTa = (item.nameTa || (item.name && /[\u0B80-\u0BFF]/.test(item.name) ? item.name : '') || '').trim().toLowerCase();
    master = items.find(i => {
      if (cEn && (i.name || '').trim().toLowerCase() === cEn) return true;
      if (cTa && (i.nameTa || i.tamilName || '').trim().toLowerCase() === cTa) return true;
      return false;
    });
  }

  const sizeSuffix = item.size ? ` (Size: ${item.size})` : '';

  if (lang === 'ta') {
    // ── TAMIL REQUESTED ──
    // 1. Master item Tamil name
    if (master) {
      const mTa = (master.nameTa && master.nameTa.trim()) ||
                  (master.tamilName && master.tamilName.trim()) ||
                  inferTamilName(master.name);
      if (mTa) {
        return item.size && !mTa.includes(item.size) ? `${mTa}${sizeSuffix}` : mTa;
      }
    }

    // 2. Explicit Tamil name in row
    if (item.nameTa && item.nameTa.trim()) {
      return item.size && !item.nameTa.includes(item.size) ? `${item.nameTa.trim()}${sizeSuffix}` : item.nameTa.trim();
    }

    // 3. Row name contains Tamil script
    if (item.name && /[\u0B80-\u0BFF]/.test(item.name)) {
      return item.name;
    }

    // 4. Infer Tamil from rawName, nameEn or name
    const enSource = item.rawName || item.nameEn || item.name || '';
    const inferred = inferTamilName(enSource);
    if (inferred) {
      return item.size && !inferred.includes(item.size) ? `${inferred}${sizeSuffix}` : inferred;
    }

    return item.name || 'பொருள்';
  } else {
    // ── ENGLISH REQUESTED ──
    // 1. Master item English name
    if (master && master.name && !/[\u0B80-\u0BFF]/.test(master.name)) {
      const mEn = master.name.trim();
      return item.size && !mEn.includes(item.size) ? `${mEn}${sizeSuffix}` : mEn;
    }

    // 2. Explicit English rawName in row
    if (item.rawName && !/[\u0B80-\u0BFF]/.test(item.rawName)) {
      const rawEn = item.rawName.trim();
      return item.size && !rawEn.includes(item.size) ? `${rawEn}${sizeSuffix}` : rawEn;
    }

    // 3. Explicit English nameEn in row
    if (item.nameEn && !/[\u0B80-\u0BFF]/.test(item.nameEn)) {
      return item.nameEn.trim();
    }

    // 4. Row name does NOT contain Tamil characters
    if (item.name && !/[\u0B80-\u0BFF]/.test(item.name)) {
      return item.name;
    }

    // 5. Master item name fallback
    if (master && master.name) {
      return item.size && !master.name.includes(item.size) ? `${master.name}${sizeSuffix}` : master.name;
    }

    // 6. Infer English from Tamil script in name or nameTa
    const taSource = (item.name && /[\u0B80-\u0BFF]/.test(item.name) ? item.name : '') || item.nameTa || '';
    const inferredEn = inferEnglishName(taSource);
    if (inferredEn) {
      return item.size && !inferredEn.includes(item.size) ? `${inferredEn}${sizeSuffix}` : inferredEn;
    }

    return item.name || item.nameTa || 'Material';
  }
}

export function enrichItem(i) {
  const n = (i.name || '').toUpperCase();
  let cat = i.cat || 'Steel';
  let hsn = i.hsn;

  // Infer HSN Code if missing
  if (!hsn) {
    if (/TMT|BARS/.test(n)) hsn = '7214';
    else if (/BINDING WIRE/.test(n)) hsn = '7217';
    else if (/NAILS|SCREW/.test(n)) hsn = '7317';
    else if (/SHOE|SAFETY SHOE/.test(n)) hsn = '64023090';
    else if (/LINTEL|BRACKET|TIE ROD|C CLAMP/.test(n)) hsn = '73089090';
    else if (/ALUMIN|MATTAKOL|STRAIGHT EDGE/.test(n)) hsn = '7606';
    else if (/SPADE|TROWEL/.test(n)) hsn = '8201';
    else if (/HAMMER|PLUMBOB/.test(n)) hsn = '8205';
    else if (/RIGHT ANGLE|TAPE/.test(n)) hsn = '9017';
    else if (/PIPE|UPVC|HOSE/.test(n)) hsn = '3917';
    else if (/BOND|ADHESIVE|PASTE/.test(n)) hsn = '3506';
    else if (/PLYWOOD|RUNNER|WOOD/.test(n)) hsn = '4412';
    else if (/COVER BLOCK/.test(n)) hsn = '6810';
    else if (/GRAVEL|CRUSHED/.test(n)) hsn = '2517';
    else if (/SAND|M\.SAND/.test(n)) hsn = '2505';
    else if (/CONCRETE|CEMENT/.test(n)) hsn = '3824';
    else if (/HELMET/.test(n)) hsn = '6506';
    else if (/GLOVES/.test(n)) hsn = '6116';
    else if (/BLADE|CUTTING|DRILL/.test(n)) hsn = '8202';
    else hsn = '7326';
  }

  const nameTa = (i.nameTa && i.nameTa.trim()) || (i.tamilName && i.tamilName.trim()) || inferTamilName(i.name) || '';
  const gst = (i.gst !== undefined && i.gst !== null && i.gst !== '' && !isNaN(i.gst)) ? Number(i.gst) : undefined;
  return { ...i, cat, hsn, nameTa, ...(gst !== undefined ? { gst } : {}) };
}

export function normalizeMaterialName(str) {
  if (!str) return '';
  return String(str)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/\bNAILS\b/g, 'NAIL')
    .replace(/\bSCREWS\b/g, 'SCREW')
    .replace(/\bPIPES\b/g, 'PIPE')
    .replace(/\bPLATES\b/g, 'PLATE')
    .replace(/\bRODS\b/g, 'ROD')
    .replace(/\bSHEETS\b/g, 'SHEET');
}

export function isMaterialMatch(item, queryName, queryTa, queryId) {
  if (!item) return false;

  const itemNormEn = normalizeMaterialName(item.name);
  const qNormEn = normalizeMaterialName(queryName);

  // 1. Direct normalized name match (e.g. "NAIL 21/2" === "NAIL 21/2")
  if (itemNormEn && qNormEn && itemNormEn === qNormEn) return true;

  // 2. Compare compact alphanumeric string (handling fractions e.g. "21/2" vs "2 1/2" or "NAILS" vs "NAIL")
  const itemCompact = itemNormEn.replace(/[\s\-_/]/g, '');
  const qCompact = qNormEn.replace(/[\s\-_/]/g, '');
  if (itemCompact && qCompact && itemCompact === qCompact) return true;

  // 3. Compare Tamil name
  const itemNormTa = (item.nameTa || item.tamilName || '').trim().toLowerCase();
  const qNormTa = (queryTa || '').trim().toLowerCase();
  if (itemNormTa && qNormTa && itemNormTa === qNormTa) return true;

  // 4. If queryId is provided and matches item.id
  if (queryId && item.id && item.id === queryId) {
    // If both have names and they are completely different materials, this was a legacy ID collision
    if (qNormEn && itemNormEn && itemCompact !== qCompact) {
      return false;
    }
    return true;
  }

  return false;
}

export function getNextMaterialId(items = []) {
  let maxNum = 0;
  (items || []).forEach(it => {
    if (it && it.id && typeof it.id === 'string') {
      const m = it.id.match(/SVS-(\d+)/i);
      if (m) {
        const num = parseInt(m[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  });
  return 'SVS-' + String(maxNum + 1).padStart(3, '0');
}

export function deduplicateItems(items = []) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const result = [];
  const seenIds = new Set();

  for (const item of items) {
    if (!item) continue;
    const matchIdx = result.findIndex(existing =>
      isMaterialMatch(existing, item.name, item.nameTa || item.tamilName, item.id)
    );

    if (matchIdx >= 0) {
      const existing = result[matchIdx];
      // Merge duplicate item into existing: prefer non-NOS UOM (e.g. KGS over default NOS)
      const preferredUom = (item.uom && item.uom.toUpperCase() !== 'NOS')
        ? item.uom.toUpperCase()
        : (existing.uom && existing.uom.toUpperCase() !== 'NOS' ? existing.uom : (item.uom || 'NOS'));

      const latestRate = Number(item.rate) > 0 ? Number(item.rate) : Number(existing.rate || 0);
      const latestLast = (item.last && (!existing.last || item.last >= existing.last)) ? item.last : existing.last;
      const combinedRecv = +(Number(existing.recv || 0) + Number(item.recv || 0)).toFixed(2);
      const combinedIssued = +(Number(existing.issued || 0) + Number(item.issued || 0)).toFixed(2);
      const maxMin = Math.max(Number(existing.min || 0), Number(item.min || 0)) || Math.ceil((combinedRecv || 0) * 0.15);

      result[matchIdx] = {
        ...existing,
        name: existing.name || item.name,
        nameTa: existing.nameTa || item.nameTa || item.tamilName || '',
        cat: existing.cat || item.cat || 'Steel',
        hsn: (item.hsn && item.hsn !== '7214' ? item.hsn : (existing.hsn || item.hsn || '7413')),
        uom: preferredUom,
        recv: combinedRecv,
        issued: combinedIssued,
        min: maxMin,
        rate: latestRate,
        gst: item.gst !== undefined ? item.gst : existing.gst,
        last: latestLast
      };
    } else {
      let safeId = item.id;
      if (!safeId || seenIds.has(safeId)) {
        safeId = getNextMaterialId(result);
      }
      seenIds.add(safeId);
      result.push({ ...item, id: safeId });
    }
  }

  return result;
}

export const DEFAULT_SETTINGS = {
  storeName: 'Sri Venkateswara Steels',
  address: 'No. 42, Steel Trunk Road, Near New Bypass Bridge,\nTheni – 625 531, Theni (Dt), Tamil Nadu',
  phone: '7358912312 / 04546-252233',
  gstin: '33AABCS1234F1Z5',
  state: 'Tamil Nadu (33)',
  email: 'sales@svsteels.in',
  invoiceTitle: 'TAX INVOICE / BILL OF SUPPLY',
  currencySymbol: '₹',
  invoicePrefix: 'SVS-INV-',
  terms: '1. Goods once dispatched will not be taken back.\n2. Interest @ 18% p.a. will be levied on delayed payments.\n3. Weight verified at yard weighbridge is final.\n4. Subject to Theni jurisdiction only.',
  selectedPrinter: 'POS80',
  directSilentPrint: true,
  appVersion: 'v2.4.0 (Windows x64)',
  windowsStoragePath: '%AppData%\\Sri Venkateswara Steels\\Data'
};

export const DEFAULT_VARIANTS = [
  { id: 'v-1', itemId: '', itemName: 'NAILS 2X2', sizeName: '2/8', ratePerKg: 140, minGrams: 50, active: true, notes: '2/8 Fine Steel Wire Nails' },
  { id: 'v-2', itemId: '', itemName: 'NAILS 2X2', sizeName: '4/9', ratePerKg: 135, minGrams: 50, active: true, notes: '4/9 Standard Carpentry Nails' },
  { id: 'v-3', itemId: '', itemName: 'NAILS 2X2', sizeName: '4/5', ratePerKg: 130, minGrams: 50, active: true, notes: '4/5 Medium Heavy Timber Nails' },
  { id: 'v-4', itemId: '', itemName: 'NAILS 2X2', sizeName: '6/7', ratePerKg: 125, minGrams: 50, active: true, notes: '6/7 Heavy Construction Nails' },
  { id: 'v-5', itemId: '', itemName: 'NAILS 2X2', sizeName: '1/2', ratePerKg: 145, minGrams: 50, active: true, notes: '1/2 Wire Nails' }
];

export const calcGramsPrice = (grams, ratePerKg) => {
  const g = Number(grams) || 0;
  const r = Number(ratePerKg) || 0;
  return +((g * r) / 1000).toFixed(2);
};

export const AUTH_KEY = 'svs-auth-session-v1';

export const seed = () => {
  return {
    items: [],
    bills: [],
    inwardInvoices: [],
    categories: DEFAULT_CATEGORIES_LIST,
    uoms: DEFAULT_UOMS_LIST,
    settings: DEFAULT_SETTINGS,
    variants: DEFAULT_VARIANTS,
    users: [
      {
        id: 1,
        name: 'Rajesh D',
        username: 'admin',
        password: '123',
        email: 'admin@svsteels.in',
        phone: '9842101234',
        role: 'Admin',
        active: true,
        createdAt: '2024-01-01'
      },
      {
        id: 2,
        name: 'Store Incharge',
        username: 'store',
        password: '123',
        email: 'store@svsteels.in',
        phone: '9842105678',
        role: 'Store Manager',
        active: true,
        createdAt: '2024-02-15'
      },
      {
        id: 3,
        name: 'Billing Desk',
        username: 'billing',
        password: '123',
        email: 'billing@svsteels.in',
        phone: '9842109999',
        role: 'Billing Staff',
        active: true,
        createdAt: '2024-03-10'
      }
    ]
  };
};

export const load = () => {
  try {
    // Purge legacy storage keys from previous runs
    ['svs-steels-v1', 'svs-steels-v2', 'svs-steels-live-v1', 'svs-steels-empty-v1'].forEach(k => {
      try { localStorage.removeItem(k); } catch (e) { }
    });

    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);

    const defaultSeedUsers = seed().users;

    return {
      items: deduplicateItems((data.items || []).map(enrichItem)),
      bills: data.bills || [],
      inwardInvoices: data.inwardInvoices || [],
      categories: Array.isArray(data.categories) && data.categories.length > 0
        ? data.categories
        : (data.subCategories ? Object.keys(data.subCategories) : DEFAULT_CATEGORIES_LIST),
      uoms: Array.isArray(data.uoms) && data.uoms.length > 0 ? data.uoms : DEFAULT_UOMS_LIST,
      settings: (() => {
        let s = data.settings ? { ...DEFAULT_SETTINGS, ...data.settings } : { ...DEFAULT_SETTINGS };
        try {
          const customRaw = localStorage.getItem('svs_custom_settings');
          if (customRaw) {
            const customObj = JSON.parse(customRaw);
            if (customObj && typeof customObj === 'object') {
              s = { ...s, ...customObj };
            }
          }
        } catch (e) {}
        if (!s.invoiceTitle || !s.invoiceTitle.trim()) {
          s.invoiceTitle = DEFAULT_SETTINGS.invoiceTitle;
        }
        return s;
      })(),
      variants: Array.isArray(data.variants) && data.variants.length > 0 ? data.variants : DEFAULT_VARIANTS,
      users: (data.users && Array.isArray(data.users) && data.users.length > 0)
        ? data.users.map((u, idx) => ({
          id: u.id || (idx + 1),
          name: u.name || `User ${idx + 1}`,
          username: u.username || (u.email ? u.email.split('@')[0] : (idx === 0 ? 'admin' : `user${idx}`)),
          password: u.password || '123',
          email: u.email || `${u.username || 'user'}@svsteels.in`,
          phone: u.phone || '9842101234',
          role: u.role || (idx === 0 ? 'Admin' : 'Store Manager'),
          active: u.active !== false,
          createdAt: u.createdAt || new Date().toISOString().slice(0, 10)
        }))
        : defaultSeedUsers
    };
  } catch (e) {
    return null;
  }
};

export const pct = i => Math.max(3, Math.min(100, i.min ? (i.stock / (i.min * 3)) * 100 : 100));

export function getSupplierMaterials(supplierName, items = [], inwardInvoices = []) {
  if (!supplierName || !supplierName.trim()) return [];
  const sNorm = supplierName.trim().toLowerCase();

  const materialNames = new Set();

  // Find all materials from recorded inward invoices for this supplier
  inwardInvoices.forEach(inv => {
    const invSupp = (inv.supplier || '').toLowerCase();
    if (invSupp.includes(sNorm) || sNorm.includes(invSupp)) {
      (inv.items || []).forEach(it => {
        if (it.name) materialNames.add(it.name.toUpperCase().trim());
      });
    }
  });

  if (materialNames.size === 0) return [];

  return items.filter(i => {
    const iName = (i.name || '').toUpperCase().trim();
    if (materialNames.has(iName)) return true;
    for (const name of materialNames) {
      if (name.includes(iName) || iName.includes(name)) return true;
    }
    return false;
  });
}

export function numberToTamilWords(num) {
  const n = Math.round(Number(num) || 0);
  if (n <= 0) return 'பூஜ்ஜியம்';

  const ones = [
    '', 'ஒன்று', 'இரண்டு', 'மூன்று', 'நான்கு', 'ஐந்து', 'ஆறு', 'ஏழு', 'எட்டு', 'ஒன்பது',
    'பத்து', 'பதினொன்று', 'பன்னிரண்டு', 'பதிமூன்று', 'பதினான்கு', 'பதினைந்து', 'பதினாறு',
    'பதினேழு', 'பதினெட்டு', 'பத்தொன்பது'
  ];

  const tensAlone = [
    '', '', 'இருபது', 'முப்பது', 'நாற்பது', 'ஐம்பது', 'அறுபது', 'எழுபது', 'எண்பது', 'தொண்ணூறு'
  ];

  const tensPrefix = [
    '', '', 'இருபத்தி ', 'முப்பத்தி ', 'நாற்பத்தி ', 'ஐம்பத்தி ', 'அறுபத்தி ', 'எழுபத்தி ', 'எண்பத்தி ', 'தொண்ணூற்றி '
  ];

  const hundredsAlone = [
    '', 'நூறு', 'இருநூறு', 'முந்நூறு', 'நானூறு', 'ஐந்நூறு', 'அறுநூறு', 'எழுநூறு', 'எண்ணூறு', 'தொள்ளாயிரம்'
  ];

  const hundredsPrefix = [
    '', 'நூற்று ', 'இருநூற்று ', 'முந்நூற்று ', 'நானூற்று ', 'ஐந்நூற்று ', 'அறுநூற்று ', 'எழுநூற்று ', 'எண்ணூற்று ', 'தொள்ளாயிரத்து '
  ];

  function convertUnder1000(val) {
    let str = '';
    const h = Math.floor(val / 100);
    const rem = val % 100;
    if (h > 0) {
      if (rem === 0) str += hundredsAlone[h];
      else str += hundredsPrefix[h];
    }
    if (rem > 0) {
      if (rem < 20) str += ones[rem];
      else {
        const t = Math.floor(rem / 10);
        const u = rem % 10;
        if (u === 0) str += tensAlone[t];
        else str += tensPrefix[t] + ones[u];
      }
    }
    return str.trim();
  }

  let words = '';
  let rem = n;

  if (rem >= 10000000) {
    const cr = Math.floor(rem / 10000000);
    rem %= 10000000;
    const crWords = convertUnder1000(cr);
    words += (crWords === 'ஒன்று' ? 'ஒரு கோடி ' : crWords + ' கோடி ') + (rem > 0 ? 'யே ' : '');
  }

  if (rem >= 100000) {
    const lk = Math.floor(rem / 100000);
    rem %= 100000;
    const lkWords = convertUnder1000(lk);
    if (rem === 0) words += (lkWords === 'ஒன்று' ? 'ஒரு லட்சம் ' : lkWords + ' லட்சம் ');
    else words += (lkWords === 'ஒன்று' ? 'ஒரு லட்சத்து ' : lkWords + ' லட்சத்து ');
  }

  if (rem >= 1000) {
    const th = Math.floor(rem / 1000);
    rem %= 1000;
    if (th === 1) words += rem > 0 ? 'ஆயிரத்து ' : 'ஆயிரம் ';
    else if (th === 2) words += rem > 0 ? 'இரண்டாயிரத்து ' : 'இரண்டாயிரம் ';
    else if (th === 3) words += rem > 0 ? 'மூவாயிரத்து ' : 'மூவாயிரம் ';
    else if (th === 4) words += rem > 0 ? 'நான்காயிரத்து ' : 'நான்காயிரம் ';
    else if (th === 5) words += rem > 0 ? 'ஐந்தாயிரத்து ' : 'ஐந்தாயிரம் ';
    else if (th === 6) words += rem > 0 ? 'ஆறாயிரத்து ' : 'ஆறாயிரம் ';
    else if (th === 7) words += rem > 0 ? 'ஏழாயிரத்து ' : 'ஏழாயிரம் ';
    else if (th === 8) words += rem > 0 ? 'எட்டாயிரத்து ' : 'எட்டாயிரம் ';
    else if (th === 9) words += rem > 0 ? 'ஒன்பதாயிரத்து ' : 'ஒன்பதாயிரம் ';
    else {
      const thWords = convertUnder1000(th);
      words += thWords + (rem > 0 ? ' ஆயிரத்து ' : ' ஆயிரம் ');
    }
  }

  if (rem > 0) {
    words += convertUnder1000(rem);
  }

  return words.replace(/\s+/g, ' ').trim();
}

export function amountInWords(num, lang = 'en') {
  const n = Math.round(Number(num) || 0);

  if (lang === 'ta') {
    if (n <= 0) return 'ரூபாய் பூஜ்ஜியம் மட்டும்';
    const taWords = numberToTamilWords(n);
    return `ரூபாய் ${taWords} மட்டும்`;
  }

  if (n <= 0) return 'Rupees Zero Only';

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  function convertGroup(val) {
    let str = '';
    if (val >= 100) {
      str += ones[Math.floor(val / 100)] + ' Hundred ';
      val %= 100;
      if (val > 0) str += 'and ';
    }
    if (val >= 20) {
      str += tens[Math.floor(val / 10)] + (val % 10 > 0 ? ' ' + ones[val % 10] : '') + ' ';
    } else if (val > 0) {
      str += ones[val] + ' ';
    }
    return str;
  }

  let words = '';
  let remaining = n;

  if (remaining >= 10000000) {
    const cr = Math.floor(remaining / 10000000);
    words += convertGroup(cr).trim() + ' Crore ';
    remaining %= 10000000;
  }

  if (remaining >= 100000) {
    const lk = Math.floor(remaining / 100000);
    words += convertGroup(lk).trim() + ' Lakh ';
    remaining %= 100000;
  }

  if (remaining >= 1000) {
    const th = Math.floor(remaining / 1000);
    words += convertGroup(th).trim() + ' Thousand ';
    remaining %= 1000;
  }

  if (remaining > 0) {
    words += convertGroup(remaining);
  }

  return `Rupees ${words.replace(/\s+/g, ' ').trim()} Only`;
}

/**
 * Return local YYYY-MM-DD string according to local computer timezone (e.g. IST)
 */
export function getLocalTodayYmd(d = new Date()) {
  try {
    const dateObj = typeof d === 'string' ? new Date(d) : d;
    if (!isNaN(dateObj.getTime())) {
      const y = dateObj.getFullYear();
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  } catch (e) {}
  return new Date().toLocaleDateString('en-CA'); // en-CA gives YYYY-MM-DD in local time
}

/**
 * Export structured data array to Microsoft Excel CSV file with UTF-8 BOM
 */
export async function exportToExcel(filename, rows) {
  if (!rows || !rows.length) return false;
  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','),
    ...rows.map(row =>
      headers.map(field => {
        const val = row[field];
        return `"${String(val ?? '').replace(/"/g, '""')}"`;
      }).join(',')
    )
  ];
  const csvContent = '\uFEFF' + csvLines.join('\r\n');
  const safeFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;

  // 1. If running inside Electron desktop app, use native file save dialog
  if (window.electronAPI && typeof window.electronAPI.saveFile === 'function') {
    try {
      const res = await window.electronAPI.saveFile({
        filename: safeFilename,
        content: csvContent
      });
      return res && (res.success || res.filePath);
    } catch (e) {
      // Fall through to browser download fallback
    }
  }

  // 2. Web browser download fallback with delayed revoke
  try {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = safeFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => {
      try { URL.revokeObjectURL(url); } catch (e) {}
    }, 60000);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Download individual official Tax Invoice / Bill of Supply as a standalone, printable, offline PDF replica.
 * Supported across both Desktop Electron (native vector PDF in Downloads) and web browsers (native Save as PDF dialog).
 */
export async function downloadInvoiceHtml(bill, settings = {}, items = [], lang = 'en', toast) {
  if (!bill) return false;
  const no = bill.no || 'Invoice';
  const safeNo = no.replace(/[^a-zA-Z0-9-_]/g, '_');
  const filename = `Invoice_${safeNo}.pdf`;

  const rows = bill.rows || [];
  const totalWeight = bill.totalWeight || rows.reduce((s, r) => s + (Number(r.weightInKg) || (Number(r.weight) > 0 ? (r.weightUnit === 'GMS' ? Number(r.weight) / 1000 : Number(r.weight)) : 0)), 0);
  const sub = Number(bill.sub || 0);
  const tax = Number(bill.tax || 0);
  const total = Number(bill.total || 0);

  const isTa = lang === 'ta';

  const rowsHtml = rows.length ? rows.map(r => {
    const displayName = getMaterialDisplayName(r, lang, items);
    const weightStr = r.weight !== null && r.weight !== undefined && +r.weight > 0
      ? (r.weightUnit === 'GMS' ? `${fmt(r.weight)} G (${fmt(r.weightInKg || (+r.weight / 1000))} KG)` : `${fmt(r.weight)}`)
      : '-';
    return `
      <tr style="border-bottom:1px solid #F1F5F9;">
        <td style="padding:7px 8px;font-size:12.5px;color:#0E1F3A;font-weight:600;text-align:left;vertical-align:middle;">
          <div>${displayName}</div>
          ${r.size && !displayName.includes(r.size) ? `
            <div style="font-size:11px;color:#0E1F3A;font-weight:700;margin-top:2px;">
              <span style="background:#F8FAFC;padding:1px 6px;border-radius:4px;border:1px solid #E2E8F0;">Size: ${r.size}</span>
            </div>
          ` : ''}
        </td>
        <td style="padding:7px 8px;text-align:center;vertical-align:middle;">
          <span style="font-size:10.5px;background:#F1F5F9;border-radius:4px;padding:2px 7px;font-weight:700;color:#334155;display:inline-block;">${r.hsn || '-'}</span>
        </td>
        <td style="padding:7px 8px;text-align:right;font-weight:800;color:#0E1F3A;vertical-align:middle;">${r.qty > 0 ? fmt(r.qty) : '-'}</td>
        <td style="padding:7px 8px;text-align:right;font-weight:700;color:#0E1F3A;vertical-align:middle;">${weightStr}</td>
        <td style="padding:7px 8px;text-align:center;vertical-align:middle;">
          <span style="font-family:'Plus Jakarta Sans', system-ui, sans-serif;font-weight:700;font-size:11px;background:#F8FAFC;border:1px solid #E2E8F0;padding:2px 7px;border-radius:5px;color:#0E1F3A;display:inline-block;">${r.uom || 'NOS'}</span>
        </td>
        <td style="padding:7px 8px;text-align:right;color:#0E1F3A;vertical-align:middle;">${fmt(r.rate)}</td>
        <td style="padding:7px 8px;text-align:right;font-weight:800;color:#0E1F3A;vertical-align:middle;">${fmt(r.amt)}</td>
      </tr>
    `;
  }).join('') : `
    <tr>
      <td colspan="7" style="text-align:center;padding:24px;color:#64748B;">No materials recorded in this issue bill</td>
    </tr>
  `;

  let taxRowsHtml = '';
  if (tax > 0) {
    const sm = {};
    rows.forEach(r => {
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
      slabs.push({ slab: 18, halfRate: 9, cgst: +(tax / 2).toFixed(2), sgst: +(tax / 2).toFixed(2) });
    }
    taxRowsHtml = slabs.map(tb => `
      <div style="display:flex;justify-content:space-between;color:#0284C7;font-size:12px;margin-bottom:2px;">
        <span>CGST (${tb.halfRate}%)</span>
        <b>${inr(tb.cgst)}</b>
      </div>
      <div style="display:flex;justify-content:space-between;color:#0284C7;font-size:12px;margin-bottom:4px;">
        <span>SGST (${tb.halfRate}%)</span>
        <b>${inr(tb.sgst)}</b>
      </div>
    `).join('');
  }

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8"/>
<title>Tax Invoice - ${no}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&family=Mukta+Malar:wght@400;600;700;800&display=swap');
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

  /* On-screen presentation: Beautiful centered A4 sheet on neutral document backdrop */
  html {
    background: #525659;
    min-height: 100%;
  }
  body {
    margin: 0;
    padding: 24px 16px;
    background: #525659;
    font-family: 'Plus Jakarta Sans', 'Mukta Malar', system-ui, -apple-system, sans-serif;
    color: #0E1F3A;
    font-size: 13px;
    line-height: 1.4;
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 100vh;
  }
  .on-screen-bar {
    position: fixed;
    top: 14px;
    right: 20px;
    z-index: 9999;
    display: flex;
    gap: 8px;
  }
  .on-screen-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: #0E1F3A;
    color: #FFFFFF;
    border: 1px solid #1C3358;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(0,0,0,0.3);
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  }
  .on-screen-btn:hover {
    background: #1C3358;
  }
  .inv-page-layout {
    width: 210mm;
    max-width: 820px;
    min-height: 297mm;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background: #FFFFFF;
    padding: 8mm 10mm;
    box-shadow: 0 10px 35px rgba(0, 0, 0, 0.35);
    border-radius: 4px;
    margin: 0 auto;
  }
  .inv-top-body {
    flex: 1 1 auto;
    width: 100%;
  }
  .inv-bottom-footer {
    flex-shrink: 0;
    margin-top: auto;
    width: 100%;
    padding-top: 14px;
    border-top: 1.5px solid #E2E8F0;
  }

  /* Print and PDF output: Clean proportional A4 layout with minimal margins */
  @media print {
    @page {
      size: A4 portrait;
      margin: 5mm 6mm;
    }
    html, body {
      background: #FFFFFF !important;
      padding: 0 !important;
      margin: 0 !important;
      width: 100% !important;
      height: auto !important;
      min-height: 0 !important;
      display: block !important;
    }
    .inv-page-layout {
      width: 100% !important;
      max-width: 100% !important;
      min-height: 280mm !important;
      height: 280mm !important;
      box-sizing: border-box !important;
      padding: 2mm 3mm !important;
      margin: 0 !important;
      box-shadow: none !important;
      border: none !important;
      border-radius: 0 !important;
      background: #FFFFFF !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: space-between !important;
    }
    .inv-top-body {
      flex: 1 1 auto !important;
      width: 100% !important;
    }
    .inv-bottom-footer {
      flex-shrink: 0 !important;
      margin-top: auto !important;
      width: 100% !important;
      padding-top: 14px !important;
      border-top: 1.5px solid #E2E8F0 !important;
    }
    .no-print {
      display: none !important;
    }
  }
</style>
</head>
<body>
<div class="on-screen-bar no-print">
  <button class="on-screen-btn" onclick="window.print()">🖨 ${isTa ? 'அச்சிடுக / PDF சேமிக்க' : 'Print / Save as PDF'}</button>
</div>
<div class="inv-page-layout">
  <div class="inv-top-body">
    <!-- 1. Header with Store Details (Left) and Official Logo (Right) -->
    <header style="display:flex;justify-content:space-between;align-items:flex-start;gap:14px;border-bottom:2px solid #D97706;padding-bottom:12px;margin-bottom:10px;">
      <div>
        <h4 style="margin:0;font-size:18px;font-weight:800;color:#0E1F3A;letter-spacing:.01em;">${settings.storeName || 'Sri Venkateswara Steels'}</h4>
        <div style="font-size:11px;color:#64748B;margin-top:2px;white-space:pre-line;line-height:1.35;">
          ${(settings.address || 'No. 42, Steel Trunk Road, Near New Bypass Bridge,\nTheni - 625 531, Theni (Dt), Tamil Nadu')}
        </div>
        ${(settings.phone || DEFAULT_SETTINGS?.phone) ? `
          <div style="font-size:11px;color:#64748B;margin-top:2px;">
            <b>${isTa ? 'தொலைபேசி: ' : 'Phone: '}</b><span style="font-family:'Plus Jakarta Sans', system-ui, sans-serif;color:#0E1F3A;font-weight:600;">${settings.phone || DEFAULT_SETTINGS?.phone}</span>
          </div>
        ` : ''}
        <div style="font-size:11.5px;color:#0E1F3A;margin-top:3px;">
          GSTIN: <b style="font-family:'Plus Jakarta Sans', system-ui, sans-serif;letter-spacing:.02em;">${settings.gstin || '33AABCS1234F1Z5'}</b> · State: <b style="font-family:'Plus Jakarta Sans', system-ui, sans-serif;">${settings.state || 'Tamil Nadu (33)'}</b>
        </div>
        <div style="margin-top:8px;font-size:13px;">
          <b style="color:#0E1F3A;font-family:'Plus Jakarta Sans', system-ui, sans-serif;font-size:14px;letter-spacing:.02em;">${no}</b>
          <br/>
          <span style="color:#64748B;font-family:'Plus Jakarta Sans', system-ui, sans-serif;font-size:12px;">${dt(bill.date)}</span>
        </div>
      </div>
      <img src="${LOGO_BASE64}" alt="SVS logo" style="width:115px;height:115px;max-width:125px;max-height:125px;object-fit:contain;flex-shrink:0;" />
    </header>

    <!-- 2. Prominent Tax Invoice Bill Title Banner -->
    <div style="text-align:center;margin:4px 0 10px;padding:5px 0;border-top:1.5px solid #D97706;border-bottom:1.5px solid #D97706;background:#FFFDF5;font-size:13.5px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#0E1F3A;font-family:'Plus Jakarta Sans', system-ui, sans-serif;">
      ${settings.invoiceTitle || (isTa ? 'வரி விலைப்பட்டியல் / விநியோக பில்' : 'TAX INVOICE / BILL OF SUPPLY')}
    </div>

    <!-- 3. Dispatch & Consignee Information Box -->
    <div style="font-size:12.5px;margin-bottom:14px;background:#F8FAFC;padding:12px 14px;border-radius:10px;border:1px solid #E2E8F0;font-family:'Plus Jakarta Sans', system-ui, sans-serif;">
      <div style="display:grid;grid-template-columns:1.2fr 0.8fr;gap:12px;">
        <div>
          <span style="font-size:10px;font-weight:800;text-transform:uppercase;color:#64748B;letter-spacing:.05em;display:block;margin-bottom:2px;">
            ${isTa ? 'வாடிக்கையாளர் / பெறுநர்:' : 'ISSUED TO / CONSIGNEE:'}
          </span>
          <div style="color:#0E1F3A;font-size:13.5px;font-weight:800;">
            ${formatCustomerName(bill.cust) || (isTa ? 'வாடிக்கையாளர் / ஒப்பந்ததாரர்' : 'Customer / Contractor / Site')}
          </div>
          ${bill.address ? `
            <div style="color:#1E293B;margin-top:4px;font-size:11.5px;line-height:1.35;">
              <b style="color:#64748B;">${isTa ? 'முகவரி: ' : 'To Address: '}</b>${bill.address}
            </div>
          ` : ''}
          ${bill.phone ? `
            <div style="color:#64748B;margin-top:3px;font-size:11.5px;">
              <b>${isTa ? 'தொலைபேசி:' : 'Phone:'}</b> ${bill.phone}
            </div>
          ` : ''}
        </div>

        <div style="border-left:1px solid #E2E8F0;padding-left:12px;">
          <span style="font-size:10px;font-weight:800;text-transform:uppercase;color:#64748B;letter-spacing:.05em;display:block;margin-bottom:2px;">
            ${isTa ? 'டெஸ்பாட்ச் விவரங்கள்:' : 'DISPATCH DETAILS:'}
          </span>
          <div style="font-size:12px;font-weight:700;color:#0E1F3A;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            <span style="color:#64748B;font-weight:600;">${isTa ? 'வாகன எண்:' : 'Vehicle No:'}</span>
            ${bill.veh ? `
              <span style="font-family:'Plus Jakarta Sans', system-ui, sans-serif;font-weight:800;letter-spacing:.04em;background:#fff;padding:2px 8px;border-radius:4px;border:1px solid #E2E8F0;color:#0E1F3A;">
                ${bill.veh.toUpperCase()}
              </span>
            ` : `
              <span style="color:#64748B;font-style:italic;font-weight:500;">${isTa ? 'குறிப்பிடப்படவில்லை' : 'Not Specified'}</span>
            `}
          </div>
          <div style="color:#64748B;margin-top:5px;font-size:11.5px;">
            <b>${isTa ? 'கட்டண முறை:' : 'Payment:'}</b> ${bill.pay === 'Cash' && isTa ? 'ரொக்கம்' : (bill.pay || 'Cash')}
          </div>
          ${bill.project ? `
            <div style="color:#64748B;margin-top:2px;font-size:11.5px;">
              <b>${isTa ? 'தளம்:' : 'Site:'}</b> ${bill.project}
            </div>
          ` : ''}
        </div>
      </div>
    </div>

    <!-- 4. Items Table (Exact 7-column layout without # column) -->
    <table style="width:100%;border-collapse:collapse;font-family:'Plus Jakarta Sans', system-ui, sans-serif;">
      <thead>
        <tr style="border-bottom:1.5px solid #CBD5E1;">
          <th style="text-align:left;padding:7px 8px;font-size:12px;font-weight:700;color:#475569;">${isTa ? 'பொருள் விவரம்' : 'Item'}</th>
          <th style="text-align:center;padding:7px 8px;font-size:12px;font-weight:700;color:#475569;">HSN</th>
          <th style="text-align:right;padding:7px 8px;font-size:12px;font-weight:700;color:#475569;">${isTa ? 'அளவு' : 'Qty'}</th>
          <th style="text-align:right;padding:7px 8px;font-size:12px;font-weight:700;color:#475569;">${isTa ? 'எடை' : 'Weight'}</th>
          <th style="text-align:center;padding:7px 8px;font-size:12px;font-weight:700;color:#475569;">${isTa ? 'அலகு' : 'Unit'}</th>
          <th style="text-align:right;padding:7px 8px;font-size:12px;font-weight:700;color:#475569;">${isTa ? 'விலை' : 'Rate'}</th>
          <th style="text-align:right;padding:7px 8px;font-size:12px;font-weight:700;color:#475569;">${isTa ? 'தொகை' : 'Amount'}</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <!-- 5. Totals Section (Right-aligned aligned with Rate & Amount) -->
    <div style="margin-left:auto;width:250px;margin-top:14px;border-top:1px dashed #CBD5E1;padding-top:8px;font-family:'Plus Jakarta Sans', system-ui, sans-serif;">
      ${totalWeight > 0 ? `
        <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12.5px;color:#0E1F3A;border-bottom:1px solid #E2E8F0;padding-bottom:4px;margin-bottom:4px;">
          <span style="font-weight:700;">${isTa ? 'மொத்த எடை' : 'Total Weight'}</span>
          <b>${fmt(totalWeight)} ${isTa ? 'கிலோ' : 'KGS'}</b>
        </div>
      ` : ''}
      <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12.5px;color:#0E1F3A;">
        <span>${isTa ? 'கூடுதல் தொகை' : 'Subtotal'}</span>
        <b>${inr(sub)}</b>
      </div>
      ${taxRowsHtml}
      <div style="display:flex;justify-content:space-between;border-top:2px solid #0E1F3A;font-weight:800;font-size:17px;margin-top:5px;padding-top:7px;color:#0E1F3A;">
        <span>${isTa ? 'செலுத்த வேண்டிய மொத்த தொகை' : 'Total Payable'}</span>
        <span>${inr(total)}</span>
      </div>
    </div>

    <!-- 6. Amount in Words Card -->
    <div style="margin-top:12px;padding:10px 14px;background:#F8FAFC;border-radius:8px;border:1px solid #E2E8F0;font-size:12px;line-height:1.45;font-family:'Plus Jakarta Sans', system-ui, sans-serif;">
      <span style="font-size:10px;font-weight:800;text-transform:uppercase;color:#64748B;letter-spacing:.05em;display:block;margin-bottom:2px;">
        ${isTa ? 'தொகை எழுத்துக்களில்:' : 'AMOUNT IN WORDS:'}
      </span>
      <b style="color:#0E1F3A;font-size:12.5px;font-family:'Plus Jakarta Sans', system-ui, sans-serif;">
        ${amountInWords(total, lang)}
      </b>
    </div>
  </div>

  <!-- 7. Footer Positioned at Very Bottom: Terms & Conditions (Left) & Owner / Authorized Signatory (Right) -->
  <div class="inv-bottom-footer" style="display:flex;justify-content:space-between;align-items:flex-end;gap:16px;font-family:'Plus Jakarta Sans', system-ui, sans-serif;">
    <div style="max-width:58%;font-size:10px;color:#64748B;line-height:1.4;">
      <b style="color:#0E1F3A;display:block;margin-bottom:2px;font-size:10.5px;">
        ${isTa ? 'விதிமுறைகள் & நிபந்தனைகள்:' : 'Terms & Conditions:'}
      </b>
      ${isTa ? `
        <div>1. அனுப்பப்பட்ட பொருட்கள் திரும்பப் பெறப்பட மாட்டாது.</div>
        <div>2. தாமதமான கொடுப்பனவுகளுக்கு ஆண்டுக்கு 18% வட்டி விதிக்கப்படும்.</div>
        <div>3. யார்டு எடைமேடையில் சரிபார்க்கப்பட்ட எடையே இறுதியானது.</div>
        <div>4. தேனி நீதிமன்ற எல்லைக்கு உட்பட்டது.</div>
      ` : `
        <div>1. Goods once dispatched will not be taken back.</div>
        <div>2. Interest @ 18% p.a. will be levied on delayed payments.</div>
        <div>3. Weight verified at yard weighbridge is final.</div>
        <div>4. Subject to Theni jurisdiction only.</div>
      `}
    </div>

    <!-- Right: Owner Signatory with blank empty space for manual physical pen signature -->
    <div style="text-align:right;min-width:200px;flex-shrink:0;">
      <div style="font-size:11.5px;font-weight:800;color:#0E1F3A;letter-spacing:.02em;">
        ${isTa ? 'ஸ்ரீ வெங்கடேஸ்வரா ஸ்டீல்ஸ் நிறுவனத்திற்காக' : `For ${settings.storeName || 'SRI VENKATESWARA STEELS'}`}
      </div>
      <div style="height:48px;margin:4px 0;"></div>
      <div style="border-top:1.5px dashed #CBD5E1;padding-top:4px;font-size:11px;font-weight:800;color:#0E1F3A;">
        ${isTa ? 'உரிமையாளர் / அங்கீகரிக்கப்பட்ட கையொப்பம்' : 'Owner / Authorized Signatory'}
      </div>
      <div style="font-size:9.5px;color:#64748B;margin-top:1px;">
        ${isTa ? 'அங்கீகரிக்கப்பட்ட முத்திரை & கையொப்பம்' : 'Authorized Seal & Signature'}
      </div>
    </div>
  </div>
</div>
</body>
</html>`;

  // 1. Native Electron PDF generator directly to Downloads folder (completely automatic, does NOT ask for printout)
  if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.generateInvoicePdf === 'function') {
    try {
      const pdfFilename = `Invoice_${safeNo}.pdf`;
      const res = await window.electronAPI.generateInvoicePdf({
        html,
        filename: pdfFilename
      });
      if (res && res.success) {
        if (toast) toast(isTa ? `பில் PDF பதிவிறக்கப்பட்டது: ${res.filename || pdfFilename}` : `Invoice PDF saved to Downloads: ${res.filename || pdfFilename}`);
        return true;
      }
    } catch (e) {
      console.error('generateInvoicePdf failed:', e);
    }
  }

  // 2. Web browser automatic download fallback (downloads file directly without opening printout dialog)
  try {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Invoice_${safeNo}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => {
      try { URL.revokeObjectURL(url); } catch (e) {}
    }, 60000);
    if (toast) toast(isTa ? `பில் வெற்றிகரமாக பதிவிறக்கப்பட்டது!` : `Invoice downloaded successfully!`);
    return true;
  } catch (err) {
    if (toast) toast('Download failed: ' + err.message);
    return false;
  }
}

export const downloadInvoicePdf = downloadInvoiceHtml;
