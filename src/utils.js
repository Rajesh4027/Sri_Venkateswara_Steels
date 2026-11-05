import { DEFAULT_CATEGORIES } from './data/categories';

export const fmt = n => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
export const inr = n => '₹' + fmt(n);
export const dt = s => s ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
export const KEY = 'svs-steels-clean-v2';

export const formatCustomerName = str => {
  if (!str) return '';
  return String(str).replace(/\b([a-zA-Z])([a-zA-Z]*)/g, (_, first, rest) => {
    return first.toUpperCase() + rest.toLowerCase();
  });
};

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
  if (/NAILS.*1.*1\/2/i.test(n)) return 'ஆணி 1 1/2 அங்குலம்';
  if (/NAILS.*2.*1\/2/i.test(n)) return 'ஆணி 2 1/2 அங்குலம்';
  if (/NAILS.*2\s*X\s*2/i.test(n)) return 'ஆணி 2X2 வயர் ஆணி';
  if (/NAILS|SCREW/i.test(n)) return 'இரும்பு ஆணி (Nails)';
  if (/CEMENT/i.test(n)) return 'சிமெண்ட் மூட்டை (Cement)';
  if (/SAND/i.test(n)) return 'மணல் (Sand)';
  if (/HAMMER/i.test(n)) return 'சுத்தியல் (Hammer)';
  if (/PIPE|UPVC/i.test(n)) return 'குழாய் (Pipe)';
  if (/GLOVES/i.test(n)) return 'பாதுகாப்பு கையுறைகள் (Gloves)';
  if (/HELMET/i.test(n)) return 'பாதுகாப்பு ஹெல்மெட் (Helmet)';
  return '';
}

/**
 * Returns localized material name:
 * - When lang === 'ta': returns Tamil name (nameTa / tamilName) if available, fallback to English name.
 * - When lang === 'en': returns English name (name).
 */
export function getMaterialDisplayName(item, lang = 'en') {
  if (!item) return '';
  if (typeof item === 'string') return item;
  if (lang === 'ta') {
    return (item.nameTa && item.nameTa.trim()) || (item.tamilName && item.tamilName.trim()) || inferTamilName(item.name) || item.name || '';
  }
  return item.name || (item.nameTa && item.nameTa.trim()) || (item.tamilName && item.tamilName.trim()) || '';
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
      items: (data.items || []).map(enrichItem),
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

export function amountInWords(num) {
  const n = Math.round(Number(num) || 0);
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
 * Export structured data array to Microsoft Excel CSV file with UTF-8 BOM
 */
export function exportToExcel(filename, rows) {
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
  const blob = new Blob(['\uFEFF' + csvLines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}
