import { useState, useRef, useEffect } from 'react';
import Ic from '../components/Icon';
import LOGO from '../assets/logo.png';
import { inr, fmt, KEY, getLocalTodayYmd } from '../utils';
import { useLanguage } from '../context/LanguageContext';

const CURRENT_APP_VERSION = 'v2.8.6';
const GITHUB_REPO = 'Rajesh4027/Sri_Venkateswara_Steels';

function parseSemVer(v) {
  if (!v) return [0, 0, 0];
  const clean = String(v).replace(/^v/i, '').trim();
  const parts = clean.split('.').map(p => parseInt(p, 10) || 0);
  while (parts.length < 3) parts.push(0);
  return parts;
}

function isNewerVersion(remote, local) {
  const r = parseSemVer(remote);
  const l = parseSemVer(local);
  for (let i = 0; i < 3; i++) {
    if (r[i] > l[i]) return true;
    if (r[i] < l[i]) return false;
  }
  return false;
}

export default function SettingsPage({
  settings,
  setSettings,
  items = [],
  setItems,
  bills = [],
  setBills,
  inwardInvoices = [],
  setInwardInvoices,
  categories = [],
  setCategories,
  uoms = [],
  setUoms,
  users = [],
  setUsers,
  toast
}) {
  const { t, lang } = useLanguage();
  const [form, setForm] = useState(() => ({
    ...settings,
    invoiceTitle: (settings && settings.invoiceTitle) || 'TAX INVOICE / BILL OF SUPPLY'
  }));
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null);

  const [storageInfo, setStorageInfo] = useState({
    imagesDir: '%AppData%\\Sri Venkateswara Steels\\Bill_Images',
    filesCount: 0,
    totalSizeMb: '0.00'
  });
  const [syncingImages, setSyncingImages] = useState(false);

  // Load storage info on mount
  useEffect(() => {
    if (window.electronAPI?.getStorageInfo) {
      window.electronAPI.getStorageInfo().then(info => {
        if (info) setStorageInfo(info);
      }).catch(() => {});
    }
  }, []);

  const handleOpenImagesFolder = async () => {
    if (window.electronAPI?.openImagesFolder) {
      await window.electronAPI.openImagesFolder();
      if (toast) toast('📂 Opened Bill Images folder in Windows Explorer');
    } else {
      if (toast) toast(`Folder location: ${storageInfo.imagesDir}`);
    }
  };

  const handleSyncImagesToDisk = async () => {
    if (syncingImages) return;
    setSyncingImages(true);
    if (window.electronAPI?.syncAllImages) {
      try {
        const res = await window.electronAPI.syncAllImages(inwardInvoices);
        setSyncingImages(false);
        if (res && res.success) {
          if (toast) toast(`✓ Successfully saved ${res.savedCount} bill photos to local disk folder!`);
          if (window.electronAPI?.getStorageInfo) {
            const updated = await window.electronAPI.getStorageInfo();
            if (updated) setStorageInfo(updated);
          }
        }
      } catch (e) {
        setSyncingImages(false);
        if (toast) toast('Failed to sync images to disk');
      }
    } else {
      setSyncingImages(false);
      if (toast) toast('Local disk folder is active in Desktop software');
    }
  };
  const jsonInputRef = useRef(null);
  const csvInputRef = useRef(null);

  useEffect(() => {
    if (settings) {
      setForm(prev => ({
        ...settings,
        invoiceTitle: (settings && settings.invoiceTitle) || prev.invoiceTitle || 'TAX INVOICE / BILL OF SUPPLY'
      }));
    }
  }, [settings]);

  const handleChange = (field, val) => {
    setForm(prev => ({ ...prev, [field]: val }));
  };

  const handleSave = e => {
    if (e) e.preventDefault();
    const cleanTitle = (form.invoiceTitle && form.invoiceTitle.trim()) ? form.invoiceTitle.trim() : 'TAX INVOICE / BILL OF SUPPLY';
    const updatedForm = { ...form, invoiceTitle: cleanTitle };
    setForm(updatedForm);
    setSettings(updatedForm);
    try {
      localStorage.setItem('svs_custom_settings', JSON.stringify(updatedForm));
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.settings = updatedForm;
        localStorage.setItem(KEY, JSON.stringify(parsed));
      }
    } catch (err) {}
    toast('Settings saved successfully!');
  };

  // ── JSON Full ERP Backup Export ──
  const handleExportJsonBackup = async () => {
    const backupData = {
      app: 'Sri Venkateswara Steels ERP',
      version: form.appVersion || 'v2.8.6',
      exportedAt: new Date().toISOString(),
      summary: {
        totalStockItems: items.length,
        totalIssueBills: bills.length,
        totalSupplierInvoices: inwardInvoices.length,
        totalCategories: categories.length,
        totalUnits: uoms.length
      },
      settings: form,
      // 1. All Stock & Inventory Data (stocks data)
      items: items.map(i => ({
        id: i.id,
        name: i.name,
        cat: i.cat,
        hsn: i.hsn,
        uom: i.uom,
        stock: i.stock !== undefined ? i.stock : (i.recv ?? 0),
        recv: i.recv ?? i.stock ?? 0,
        issued: i.issued ?? 0,
        min: i.min ?? 0,
        rate: i.rate ?? 0,
        rateWithoutGst: i.rateWithoutGst ?? i.rate ?? 0,
        rateWithGst: i.rateWithGst ?? i.rate ?? 0,
        gst: i.gst ?? 18,
        status: i.status || 'ok',
        last: i.last || getLocalTodayYmd()
      })),
      // 2. All Issue Bills & Delivery History Data (issue data)
      bills: bills.map(b => ({
        ...b,
        date: b.date || new Date().toISOString(),
        rows: (b.rows || []).map(r => ({ ...r }))
      })),
      // 3. All Suppliers & P.O. Inward Invoices and Materials Data (suppliers materials data)
      inwardInvoices: inwardInvoices.map(inv => ({
        ...inv,
        date: inv.date || new Date().toISOString(),
        items: (inv.items || []).map(it => ({ ...it }))
      })),
      // 4. Auxiliary System Data
      categories,
      uoms,
      users
    };

    const jsonStr = JSON.stringify(backupData, null, 2);
    const dateStr = getLocalTodayYmd();
    const safeFilename = `SVS_ERP_Complete_Backup_${dateStr}.json`;
    const imgCount = inwardInvoices.filter(i => !!i.billImage).length;

    // 1. Native Electron Save Dialog (if available)
    if (window.electronAPI && typeof window.electronAPI.saveFile === 'function') {
      try {
        const res = await window.electronAPI.saveFile({
          filename: safeFilename,
          content: jsonStr
        });
        if (res && (res.success || res.filePath)) {
          toast(`✓ Complete ERP Backup exported! (${items.length} stocks, ${bills.length} issue bills, ${inwardInvoices.length} invoices with ${imgCount} bill photos)`);
        }
        return;
      } catch (e) {
        // Fallback to web download below
      }
    }

    // 2. Web browser download fallback
    const blob = new Blob([jsonStr], { type: 'application/json' });
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
    toast(`✓ Complete ERP Backup exported! (${items.length} stocks, ${bills.length} issue bills, ${inwardInvoices.length} invoices with ${imgCount} bill photos)`);
  };

  // ── JSON Full ERP Backup Restore ──
  const handleImportJsonBackup = e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const data = JSON.parse(evt.target.result);
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid JSON format');
        }

        const payload = data.data || data;
        const importedItems = payload.items || [];
        const importedBills = payload.bills || [];
        const importedInvoices = payload.inwardInvoices || [];
        const importedCategories = payload.categories || [];
        const importedUoms = payload.uoms || [];
        const importedUsers = payload.users || [];
        const importedSettings = payload.settings || null;

        // Calculate total issued per item from imported bills
        const billDeductMap = {};
        if (Array.isArray(importedBills)) {
          importedBills.forEach(b => (b.rows || []).forEach(r => {
            const deduct = r.stockDeductQty !== undefined
              ? Number(r.stockDeductQty || 0)
              : (r.weightInKg !== undefined && r.weightInKg !== null && Number(r.weightInKg) > 0 ? Number(r.weightInKg) : (Number(r.qty) || 0));
            billDeductMap[r.id] = +((billDeductMap[r.id] || 0) + deduct).toFixed(3);
          }));
        }

        // Clean & ensure complete item properties (recv, stock, rate, etc.)
        const sanitizedItems = Array.isArray(importedItems)
          ? importedItems.map(it => {
              const totalIssued = billDeductMap[it.id] || Number(it.issued || 0);
              const stockVal = it.stock !== undefined ? Number(it.stock) : 0;
              const recvVal = (it.recv !== undefined && Number(it.recv) > 0)
                ? Number(it.recv)
                : +(stockVal + totalIssued).toFixed(2);
              return {
                ...it,
                recv: recvVal,
                stock: stockVal,
                issued: totalIssued,
                min: it.min !== undefined ? Number(it.min) : 0,
                rate: it.rate !== undefined ? Number(it.rate) : 0,
                gst: it.gst !== undefined ? Number(it.gst) : 18
              };
            })
          : [];

        if (sanitizedItems.length > 0) setItems(sanitizedItems);
        if (Array.isArray(importedBills)) setBills(importedBills);
        if (Array.isArray(importedInvoices)) setInwardInvoices(importedInvoices);
        if (Array.isArray(importedCategories) && importedCategories.length > 0) setCategories(importedCategories);
        if (Array.isArray(importedUoms) && importedUoms.length > 0) setUoms(importedUoms);
        if (Array.isArray(importedUsers) && importedUsers.length > 0 && setUsers) setUsers(importedUsers);
        if (importedSettings) {
          setForm(importedSettings);
          setSettings(importedSettings);
        }

        // Auto-sync all restored bill images to local disk folder
        if (window.electronAPI?.syncAllImages && Array.isArray(importedInvoices)) {
          window.electronAPI.syncAllImages(importedInvoices).then(res => {
            if (res && res.savedCount > 0) {
              if (window.electronAPI?.getStorageInfo) {
                window.electronAPI.getStorageInfo().then(info => { if (info) setStorageInfo(info); });
              }
            }
          }).catch(() => {});
        }

        // Direct write to localStorage for immediate persistence
        try {
          localStorage.setItem(KEY, JSON.stringify({
            items: sanitizedItems.length > 0 ? sanitizedItems.map(({ stock, status, ...r }) => r) : items,
            bills: Array.isArray(importedBills) ? importedBills : bills,
            inwardInvoices: Array.isArray(importedInvoices) ? importedInvoices : inwardInvoices,
            categories: Array.isArray(importedCategories) && importedCategories.length > 0 ? importedCategories : categories,
            uoms: Array.isArray(importedUoms) && importedUoms.length > 0 ? importedUoms : uoms,
            users: Array.isArray(importedUsers) && importedUsers.length > 0 ? importedUsers : users,
            settings: importedSettings || form
          }));
        } catch (lsErr) {
          console.warn('Direct localStorage save warning:', lsErr);
        }

        const counts = [
          sanitizedItems.length ? `${sanitizedItems.length} Stock items` : '',
          Array.isArray(importedBills) ? `${importedBills.length} Issue bills` : '',
          Array.isArray(importedInvoices) ? `${importedInvoices.length} Supplier invoices` : ''
        ].filter(Boolean).join(', ');

        toast(`✓ All Data Synced! Restored: ${counts}`);
      } catch (err) {
        console.error('Import backup error:', err);
        toast('Failed to restore backup: Invalid or corrupted JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // ── Stock CSV Export ──
  const handleExportStockCsv = async () => {
    if (!items.length) {
      toast('No items in inventory to export');
      return;
    }
    const headers = ['Item Code', 'Material Name', 'Category', 'HSN Code', 'Unit', 'Stock Qty', 'Min Level', 'Unit Rate (INR)'];
    const rows = items.map(i => [
      i.id || '',
      `"${(i.name || '').replace(/"/g, '""')}"`,
      `"${(i.cat || '').replace(/"/g, '""')}"`,
      i.hsn || '',
      i.uom || '',
      i.stock ?? 0,
      i.min ?? 0,
      i.rate ?? 0
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const safeFilename = `SVS_Stock_Inventory_${getLocalTodayYmd()}.csv`;

    if (window.electronAPI && typeof window.electronAPI.saveFile === 'function') {
      try {
        const res = await window.electronAPI.saveFile({
          filename: safeFilename,
          content: csvContent
        });
        if (res && (res.success || res.filePath)) {
          toast('Stock inventory CSV exported!');
        }
        return;
      } catch (e) {
        // Fallback to web download below
      }
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
    toast('Stock inventory CSV exported!');
  };

  // ── Stock CSV Import ──
  const handleImportStockCsv = e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const text = evt.target.result;
        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lines.length < 2) {
          toast('CSV file is empty or missing headers');
          return;
        }

        const newItems = [...items];
        let importedCount = 0;

        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',').map(s => s.replace(/^"|"$/g, '').trim());
          if (parts.length >= 2 && parts[1]) {
            const code = parts[0] || `SVS-IMP-${Date.now()}-${i}`;
            const name = parts[1].toUpperCase();
            const cat = parts[2] || 'Steel';
            const hsn = parts[3] || '7214';
            const uom = parts[4] || 'NOS';
            const stock = parseFloat(parts[5]) || 0;
            const min = parseFloat(parts[6]) || 0;
            const rate = parseFloat(parts[7]) || 0;

            const existingIdx = newItems.findIndex(it => it.id === code || it.name.toUpperCase() === name);
            if (existingIdx >= 0) {
              newItems[existingIdx] = {
                ...newItems[existingIdx],
                stock,
                min,
                rate,
                cat,
                hsn,
                uom
              };
            } else {
              newItems.push({
                id: code,
                name,
                cat,
                hsn,
                uom,
                recv: stock,
                issued: 0,
                stock,
                min,
                rate,
                status: stock <= 0 ? 'out' : stock <= min ? 'low' : 'ok',
                last: new Date().toISOString().slice(0, 10)
              });
            }
            importedCount++;
          }
        }

        setItems(newItems);
        toast(`Imported ${importedCount} items from CSV into stock inventory!`);
      } catch (err) {
        toast('Error parsing CSV file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // ── Software Update Check from GitHub Releases API ──
  const [downloadingUpdate, setDownloadingUpdate] = useState(false);
  const [downloadPercent, setDownloadPercent] = useState(0);

  const handleCheckUpdates = async () => {
    setCheckingUpdate(true);
    setUpdateStatus(null);

    try {
      let releaseData = null;

      // 1. Try Fastly CDN (raw version.json) FIRST! - Zero GitHub API rate limits!
      try {
        const rawVerRes = await fetch(`https://raw.githubusercontent.com/${GITHUB_REPO}/main/version.json?t=${Date.now()}`);
        if (rawVerRes.ok) {
          const rawVer = await rawVerRes.json();
          if (rawVer && rawVer.tag_name) {
            releaseData = rawVer;
          }
        }
      } catch (e) { }

      // 2. Try raw package.json fallback - Zero GitHub API rate limits!
      if (!releaseData) {
        try {
          const rawRes = await fetch(`https://raw.githubusercontent.com/${GITHUB_REPO}/main/package.json?t=${Date.now()}`);
          if (rawRes.ok) {
            const rawPkg = await rawRes.json();
            if (rawPkg.version) {
              releaseData = {
                tag_name: `v${rawPkg.version}`,
                name: `Sri Venkateswara Steels - ERP v${rawPkg.version}`,
                body: `Release v${rawPkg.version}`,
                assets: [
                  {
                    name: `Sri.Venkateswara.Steels.Setup.${rawPkg.version}.exe`,
                    browser_download_url: `https://github.com/${GITHUB_REPO}/releases/download/v${rawPkg.version}/Sri.Venkateswara.Steels.Setup.${rawPkg.version}.exe`
                  }
                ]
              };
            }
          }
        } catch (e) { }
      }

      // 3. Try via Electron API (which also checks Fastly CDN first)
      if (!releaseData && window.electronAPI?.checkGitHubRelease) {
        try {
          const elRes = await window.electronAPI.checkGitHubRelease();
          if (elRes && elRes.success && elRes.release && elRes.release.tag_name) {
            releaseData = elRes.release;
          }
        } catch (e) { }
      }

      // 4. Try direct fetch to GitHub releases API (only if status is 200 and has tag_name)
      if (!releaseData) {
        try {
          const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
            headers: { Accept: 'application/vnd.github.v3+json' }
          });
          if (res.ok) {
            const json = await res.json();
            if (json && json.tag_name) {
              releaseData = json;
            }
          }
        } catch (e) { }
      }

      setCheckingUpdate(false);

      if (releaseData && releaseData.tag_name) {
        const remoteTag = releaseData.tag_name;
        const activeVer = localStorage.getItem('svs_app_version') || CURRENT_APP_VERSION;
        const isNew = isNewerVersion(remoteTag, activeVer);

        let setupUrl = '';
        if (Array.isArray(releaseData.assets) && releaseData.assets.length > 0) {
          const asset = releaseData.assets.find(a =>
            a.name && a.name.includes('Setup') && a.name.endsWith('.exe')
          ) || releaseData.assets.find(a => a.name && a.name.endsWith('.exe'));
          if (asset && asset.browser_download_url) setupUrl = asset.browser_download_url;
        }
        if (!setupUrl && releaseData.setupUrl) {
          setupUrl = releaseData.setupUrl;
        }
        if (!setupUrl) {
          setupUrl = `https://github.com/${GITHUB_REPO}/releases/download/${remoteTag}/Sri.Venkateswara.Steels.Setup.${remoteTag.replace(/^v/, '')}.exe`;
        }

        setUpdateStatus({
          upToDate: !isNew,
          isNew,
          version: remoteTag,
          setupUrl,
          checkedAt: new Date().toLocaleTimeString(),
          notes: isNew
            ? `New release ${remoteTag} is available! Click 'Update & Restart Now' to download and install automatically.`
            : `You are on the latest release (${CURRENT_APP_VERSION}). All steel GST Chapter 72 & 73 compliance tax rules are up to date.`
        });

        if (isNew) {
          toast(`🚀 New update ${remoteTag} is available!`);
        } else {
          toast(`✓ Sri Venkateswara Steels ERP is up to date (${CURRENT_APP_VERSION})!`);
        }
      } else {
        setUpdateStatus({
          upToDate: false,
          error: true,
          version: CURRENT_APP_VERSION,
          checkedAt: new Date().toLocaleTimeString(),
          notes: `Unable to verify update server right now. Please check your internet connection or install latest release directly.`
        });
        toast('Unable to check for updates at this moment');
      }
    } catch (err) {
      setCheckingUpdate(false);
      setUpdateStatus({
        upToDate: false,
        error: true,
        version: CURRENT_APP_VERSION,
        checkedAt: new Date().toLocaleTimeString(),
        notes: `Unable to reach update servers. Please check your internet connection.`
      });
      toast('Network error checking updates');
    }
  };

  const handleInstallFromSettings = async (url) => {
    if (!url || downloadingUpdate) return;
    setDownloadingUpdate(true);
    setDownloadPercent(0);

    if (window.electronAPI?.downloadAndInstallUpdate) {
      const unsub = window.electronAPI.onDownloadProgress((p) => {
        setDownloadPercent(p);
      });
      const res = await window.electronAPI.downloadAndInstallUpdate(url);
      if (unsub) unsub();
      if (!res?.success) {
        setDownloadingUpdate(false);
        window.open(url, '_blank');
      }
    } else {
      window.open(url, '_blank');
      setDownloadingUpdate(false);
    }
  };

  const handleTestPrint = () => {
    window.print();
  };

  return (
    <div className="flexible-page-container" style={{ width: '100%', maxWidth: '100%', paddingBottom: 60, boxSizing: 'border-box' }}>
      {/* ── Page Header Banner ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 24
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--navy)', letterSpacing: '-.02em' }}>
            {t('settingsTitle')}
          </h2>
          <div style={{ fontSize: 13, color: 'var(--mut)', marginTop: 2 }}>
            {t('settingsDesc')}
          </div>
        </div>

        {/* Save Settings Button */}
        <button
          type="button"
          onClick={handleSave}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'linear-gradient(135deg, var(--navy), #1C3358)',
            color: 'var(--gold2)',
            border: '1.5px solid var(--gold)',
            borderRadius: 10,
            padding: '11px 22px',
            fontSize: 14,
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(11,27,51,.25)',
            transition: 'all .15s'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--gold)';
            e.currentTarget.style.color = 'var(--navy)';
            e.currentTarget.style.borderColor = 'var(--gold)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'linear-gradient(135deg, var(--navy), #1C3358)';
            e.currentTarget.style.color = 'var(--gold2)';
            e.currentTarget.style.borderColor = 'var(--gold)';
          }}
        >
          <Ic n="save" s={16} /> {t('saveSettingsBtn')}
        </button>
      </div>

      {/* ── Two Column Layout: Left Config Cards, Right Live Preview ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(360px, 1fr)', gap: 24, alignItems: 'start' }}>
        
        {/* ── LEFT COLUMN: Configuration Sections ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Section 1: Store Header & Address Details */}
          <div style={{
            background: '#fff',
            border: '1.5px solid #f1f5f9',
            borderRadius: 16,
            padding: '20px 22px',
            boxShadow: '0 2px 8px rgba(0,0,0,.03)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 14.5,
              fontWeight: 800,
              color: '#0f172a',
              marginBottom: 16
            }}>
              <span style={{ color: 'var(--navy)' }}><Ic n="store" s={18} /></span>
              {t('storeHeaderAddressTitle')}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>
                  {t('storeNameField')}
                </label>
                <input
                  className="in"
                  style={{ width: '100%', background: '#fff', borderColor: 'var(--line)', fontWeight: 700, fontSize: 13.5 }}
                  value={form.storeName}
                  onChange={e => handleChange('storeName', e.target.value)}
                  placeholder="e.g. Sri Venkateswara Steels"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>
                  {t('storeAddressField')}
                </label>
                <textarea
                  className="in"
                  rows={3}
                  style={{ width: '100%', background: '#fff', borderColor: 'var(--line)', fontSize: 13, lineHeight: 1.5 }}
                  value={form.address}
                  onChange={e => handleChange('address', e.target.value)}
                  placeholder="Enter store/yard street address, city, district and PIN code"
                />
                <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 4 }}>
                  Each line break will be printed on a separate line on the invoice bill.
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>
                    <span style={{ color: 'var(--gold)' }}>📞</span> {t('contactPhoneField')}
                  </label>
                  <input
                    className="in"
                    style={{ width: '100%', background: '#fff', borderColor: 'var(--line)', fontSize: 13 }}
                    value={form.phone}
                    onChange={e => handleChange('phone', e.target.value)}
                    placeholder="e.g. 7358912312"
                  />
                </div>

                {/* Extra GST Number added as requested */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>
                    <span style={{ color: 'var(--gold)' }}>🏛️</span> {t('gstNumberField')}
                  </label>
                  <input
                    className="in"
                    style={{ width: '100%', background: '#fff', borderColor: 'var(--line)', fontWeight: 800, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontSize: 13, letterSpacing: '.03em' }}
                    value={form.gstin}
                    onChange={e => handleChange('gstin', e.target.value.toUpperCase())}
                    placeholder="e.g. 33AABCS1234F1Z5"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>
                    {t('stateCodeField')}
                  </label>
                  <input
                    className="in"
                    style={{ width: '100%', fontSize: 13 }}
                    value={form.state}
                    onChange={e => handleChange('state', e.target.value)}
                    placeholder="e.g. Tamil Nadu (33)"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>
                    {t('officialEmailField')}
                  </label>
                  <input
                    className="in"
                    style={{ width: '100%', fontSize: 13 }}
                    value={form.email}
                    onChange={e => handleChange('email', e.target.value)}
                    placeholder="e.g. sales@svsteels.in"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Bill Header & Currency Config */}
          <div style={{
            background: '#fff',
            border: '1.5px solid #f1f5f9',
            borderRadius: 16,
            padding: '20px 22px',
            boxShadow: '0 2px 8px rgba(0,0,0,.03)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 14.5,
              fontWeight: 800,
              color: '#0f172a',
              marginBottom: 16
            }}>
              <span style={{ color: 'var(--navy)' }}><Ic n="bill" s={18} /></span>
              {t('billHeaderCurrencyTitle')}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>
                    <Ic n="fileText" s={13} /> {t('invoiceTitleField')}
                  </label>
                  <input
                    className="in"
                    style={{ width: '100%', background: '#fff', borderColor: 'var(--line)', fontWeight: 700, fontSize: 13 }}
                    value={form.invoiceTitle || ''}
                    onChange={e => handleChange('invoiceTitle', e.target.value)}
                    placeholder="e.g. TAX INVOICE / BILL OF SUPPLY"
                  />
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                    Prominently printed on all issue bills &amp; vouchers (default: TAX INVOICE / BILL OF SUPPLY).
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>
                    {t('currencyField')}
                  </label>
                  <input
                    className="in"
                    style={{ width: '100%', background: '#fff', borderColor: 'var(--line)', fontWeight: 800, textAlign: 'center', fontSize: 14 }}
                    value={form.currencySymbol}
                    onChange={e => handleChange('currencySymbol', e.target.value)}
                    placeholder="₹"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>
                    {t('invoicePrefixField')}
                  </label>
                  <input
                    className="in"
                    style={{ width: '100%', background: '#fff', borderColor: 'var(--line)', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontWeight: 700, fontSize: 13 }}
                    value={form.invoicePrefix}
                    onChange={e => handleChange('invoicePrefix', e.target.value)}
                    placeholder="SVS-INV-"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>
                  {t('termsConditionsField')}
                </label>
                <textarea
                  className="in"
                  rows={3}
                  style={{ width: '100%', fontSize: 12.5, lineHeight: 1.5 }}
                  value={form.terms}
                  onChange={e => handleChange('terms', e.target.value)}
                  placeholder="Enter business terms, interest on overdue, weighbridge conditions, jurisdiction"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Selected POS Printer Config */}
          <div style={{
            background: '#fff',
            border: '1.5px solid #f1f5f9',
            borderRadius: 16,
            padding: '20px 22px',
            boxShadow: '0 2px 8px rgba(0,0,0,.03)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 14.5,
              fontWeight: 800,
              color: '#0f172a',
              marginBottom: 14
            }}>
              <span style={{ color: 'var(--navy)' }}><Ic n="print" s={18} /></span>
              Selected POS &amp; Invoice Printer
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>
                  SELECTED POS PRINTER
                </label>
                <select
                  className="in"
                  style={{ width: '100%', fontWeight: 600, fontSize: 13 }}
                  value={form.selectedPrinter}
                  onChange={e => handleChange('selectedPrinter', e.target.value)}
                >
                  <option value="POS80">Auto-Detect Thermal Printer (POS80 / Default 80mm Receipt)</option>
                  <option value="A4">A4 Full Sheet Laser / DeskJet (Official GST Tax Invoice)</option>
                  <option value="A5">A5 Half-Sheet Yard Delivery Voucher</option>
                </select>
                <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 4 }}>
                  Leave on "Auto-Detect" to automatically route bills to your default thermal receipt or desktop printer.
                </div>
              </div>

              {/* Direct silent print enabled badge */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 12
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#166534', fontWeight: 600 }}>
                  <span style={{ color: '#16a34a', fontSize: 16 }}>✓</span>
                  <span>
                    <b>Direct Silent Print Enabled:</b> Clicking "Print" on any bill prints directly without asking for Windows dialog.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleTestPrint}
                  style={{
                    padding: '6px 14px',
                    fontSize: 12,
                    fontWeight: 700,
                    background: '#047857',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer'
                  }}
                >
                  Test Print
                </button>
              </div>
            </div>
          </div>

          {/* Section 4: Data Storage & Backup Manager (Import / Export) */}
          <div style={{
            background: '#fff',
            border: '1.5px solid #f1f5f9',
            borderRadius: 16,
            padding: '20px 22px',
            boxShadow: '0 2px 8px rgba(0,0,0,.03)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 14.5,
              fontWeight: 800,
              color: '#0f172a',
              marginBottom: 14
            }}>
              <span style={{ color: 'var(--navy)' }}><Ic n="database" s={18} /></span>
              Data Storage &amp; Backup Manager
            </div>

            {/* Windows Safe Storage & Images Folder Banner */}
            <div style={{
              background: '#fffdf5',
              border: '1.5px solid #fef08a',
              borderRadius: 14,
              padding: '16px 18px',
              marginBottom: 16
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 800, color: '#854d0e', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  <span>📁</span> Windows Data &amp; Images Storage Folder:
                </div>
                <span style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  padding: '3px 9px',
                  borderRadius: 99,
                  background: '#dcfce7',
                  color: '#166534',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} /> Local Disk Active
                </span>
              </div>

              <div style={{
                fontFamily: "'Plus Jakarta Sans', monospace, sans-serif",
                fontSize: 12,
                fontWeight: 700,
                color: '#0f172a',
                padding: '8px 12px',
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                marginTop: 6,
                wordBreak: 'break-all'
              }}>
                {storageInfo.imagesDir || '%AppData%\\Sri Venkateswara Steels\\Bill_Images'}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontSize: 12, color: '#713f12', fontWeight: 600 }}>
                  🖼️ <b>{storageInfo.filesCount}</b> Bill image proofs saved ({storageInfo.totalSizeMb} MB on disk)
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={handleOpenImagesFolder}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 14px',
                      background: 'linear-gradient(135deg, var(--navy), #1C3358)',
                      color: 'var(--gold2)',
                      border: '1.5px solid var(--gold)',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    title="Open the physical images folder directly in Windows File Explorer"
                  >
                    <span>📂</span> Open Images Folder
                  </button>
                </div>
              </div>

              <div style={{ fontSize: 11, color: '#854d0e', marginTop: 10, lineHeight: 1.4, borderTop: '1px dashed #fef08a', paddingTop: 8 }}>
                💡 <b>Multi-Computer Migration:</b> When you install on another PC, simply click <b>Restore Backup (.json)</b> below. All invoices and bill image proofs are automatically extracted and saved into the new computer's local disk folder!
              </div>
            </div>

            {/* Hidden File Inputs for Import */}
            <input
              type="file"
              ref={jsonInputRef}
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleImportJsonBackup}
            />
            <input
              type="file"
              ref={csvInputRef}
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleImportStockCsv}
            />

            {/* Action Buttons: Full JSON Backup & Restore */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <button
                type="button"
                onClick={handleExportJsonBackup}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '11px 16px',
                  background: 'var(--navy)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                <Ic n="download" s={16} /> Export Backup (.json)
              </button>

              <button
                type="button"
                onClick={() => jsonInputRef.current && jsonInputRef.current.click()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '11px 16px',
                  background: '#fff',
                  color: '#1e293b',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                <Ic n="upload" s={16} /> Restore Backup (.json)
              </button>
            </div>

            {/* Backup Content Summary Information */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 12,
              fontSize: 12,
              color: 'var(--navy)'
            }}>
              <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>📦 Single-Click Complete ERP Backup (.json) includes:</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, color: 'var(--mut)', fontSize: 11.5 }}>
                <span>• <b>{items.length}</b> Stock Materials Data</span>
                <span>• <b>{bills.length}</b> Issued Bills &amp; Delivery History</span>
                <span>• <b>{inwardInvoices.length}</b> Suppliers &amp; Inward Invoices</span>
                <span>• Settings &amp; Users</span>
              </div>
            </div>

            {/* Action Buttons: CSV Stock Import & Export */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <button
                type="button"
                onClick={handleExportStockCsv}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '9px 14px',
                  background: '#f8fafc',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: 10,
                  fontWeight: 600,
                  fontSize: 12.5,
                  cursor: 'pointer'
                }}
              >
                <Ic n="fileText" s={15} /> Export Stock (.csv)
              </button>

              <button
                type="button"
                onClick={() => csvInputRef.current && csvInputRef.current.click()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '9px 14px',
                  background: '#f8fafc',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: 10,
                  fontWeight: 600,
                  fontSize: 12.5,
                  cursor: 'pointer'
                }}
              >
                <Ic n="upload" s={15} /> Import Stock (.csv)
              </button>
            </div>
          </div>

          {/* Section 5: Software Version & Auto-Update */}
          <div style={{
            background: '#fff',
            border: '1.5px solid #f1f5f9',
            borderRadius: 16,
            padding: '20px 22px',
            boxShadow: '0 2px 8px rgba(0,0,0,.03)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 14.5,
              fontWeight: 800,
              color: '#0f172a',
              marginBottom: 14
            }}>
              <span style={{ color: 'var(--gold)' }}>✨</span>
              Software Version &amp; Auto-Update
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              marginBottom: 14
            }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  Installed Software Version
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                  {form.storeName || 'Sri Venkateswara Steels'} ERP {CURRENT_APP_VERSION} (Windows x64)
                </div>
              </div>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px',
                background: '#dcfce7',
                color: '#166534',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 800
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} /> Active
              </span>
            </div>

            {updateStatus && (
              <div style={{
                background: updateStatus.isNew ? '#fffbeb' : '#f0fdf4',
                border: updateStatus.isNew ? '1.5px solid #f59e0b' : '1px solid #bbf7d0',
                borderRadius: 12,
                padding: '14px 16px',
                fontSize: 12.5,
                color: updateStatus.isNew ? '#92400e' : '#166534',
                marginBottom: 12
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 13, marginBottom: 4 }}>
                  <span>{updateStatus.isNew ? '🚀 Update Ready:' : '✓ Up-to-Date:'}</span>
                  <span>{updateStatus.version}</span>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500, marginLeft: 'auto' }}>Checked at {updateStatus.checkedAt}</span>
                </div>
                <div style={{ lineHeight: 1.5, marginBottom: updateStatus.isNew ? 10 : 0 }}>
                  {updateStatus.notes}
                </div>
                {updateStatus.isNew && updateStatus.setupUrl && (
                  <button
                    type="button"
                    disabled={downloadingUpdate}
                    onClick={() => handleInstallFromSettings(updateStatus.setupUrl)}
                    style={{
                      marginTop: 8,
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '10px 14px',
                      background: 'linear-gradient(135deg, #d97706, #b45309)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: downloadingUpdate ? 'wait' : 'pointer',
                      boxShadow: '0 2px 8px rgba(217,119,6,.3)'
                    }}
                  >
                    <Ic n="download" s={15} />
                    {downloadingUpdate ? `Downloading Installer (${downloadPercent}%)...` : `Download & Install Update (${updateStatus.version})`}
                  </button>
                )}
              </div>
            )}

            {/* Check for Software Updates Button */}
            <button
              type="button"
              disabled={checkingUpdate}
              onClick={handleCheckUpdates}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '12px 18px',
                background: 'linear-gradient(135deg, var(--navy), #1C3358)',
                color: 'var(--gold2)',
                border: '1.5px solid var(--gold)',
                borderRadius: 10,
                fontSize: 13.5,
                fontWeight: 800,
                cursor: checkingUpdate ? 'wait' : 'pointer',
                boxShadow: '0 4px 14px rgba(11,27,51,.2)',
                transition: 'all .15s'
              }}
              onMouseEnter={e => {
                if (!checkingUpdate) {
                  e.currentTarget.style.background = 'var(--gold)';
                  e.currentTarget.style.color = 'var(--navy)';
                }
              }}
              onMouseLeave={e => {
                if (!checkingUpdate) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, var(--navy), #1C3358)';
                  e.currentTarget.style.color = 'var(--gold2)';
                }
              }}
            >
              <Ic n="refresh" s={16} className={checkingUpdate ? 'rotate-anim' : ''} />
              {checkingUpdate ? 'Checking Cloud Update Servers...' : 'Check for Software Updates'}
            </button>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Live Invoice Bill Preview ── */}
        <div style={{ position: 'sticky', top: 20 }}>
          {/* Header indicator */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
              <span style={{ color: 'var(--gold)', display: 'inline-flex' }}><Ic n="eye" s={15} /></span> {t('liveInvoicePreviewTitle')}
            </div>
            <span style={{
              fontSize: 10.5,
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: 20,
              background: 'var(--goldbg)',
              color: 'var(--amb)',
              border: '1px solid #fde68a'
            }}>
              {t('realTimeSyncBadge')}
            </span>
          </div>

          {/* Professional SVS Tax Invoice Preview Slip */}
          <div style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 14,
            padding: '24px 22px',
            boxShadow: '0 8px 24px rgba(0,0,0,.06)',
            fontSize: 12,
            color: '#1e293b',
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
          }}>
            {/* Store Branding Header */}
            <div style={{ textAlign: 'center', paddingBottom: 12, borderBottom: '1px dashed #cbd5e1' }}>
              <img
                src={LOGO}
                alt="Store Logo"
                style={{ width: 44, height: 44, borderRadius: 10, margin: '0 auto 6px', display: 'block', background: '#fef3c7', padding: 3, border: '1px solid #fed7aa' }}
              />
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', letterSpacing: '-.02em', textTransform: 'uppercase' }}>
                {form.storeName || 'Sri Venkateswara Steels'}
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 3, whiteSpace: 'pre-line', lineHeight: 1.4 }}>
                {form.address || 'Steel Trunk Road, Theni - 625 531, Tamil Nadu'}
              </div>
              <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>
                <b>{lang === 'ta' ? 'தொலைபேசி: ' : 'Phone: '}</b>
                <b style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: '#0f172a' }}>{form.phone || '7358912312 / 04546-252233'}</b>
              </div>
              {form.gstin && (
                <div style={{ fontSize: 11.5, color: '#0f172a', marginTop: 4 }}>
                  GSTIN: <b style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", letterSpacing: '.02em' }}>{form.gstin}</b> · State: <b>{form.state || 'Tamil Nadu (33)'}</b>
                </div>
              )}
            </div>

            {/* Bill Meta */}
            <div style={{ padding: '10px 0', borderBottom: '1px dashed #cbd5e1' }}>
              <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', marginBottom: 6 }}>
                {form.invoiceTitle || 'TAX INVOICE / BILL OF SUPPLY'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b' }}>
                <span>Mode: <b style={{ color: '#0f172a' }}>Cash / Site Slip</b></span>
                <span>Date: <b style={{ color: '#0f172a' }}>{new Date().toLocaleDateString('en-GB')}</b></span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginTop: 3 }}>
                <span>Invoice No: <b style={{ color: '#0f172a', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>{(form.invoicePrefix || 'SVS-INV-') + '1001'}</b></span>
                <span>Time: <b style={{ color: '#0f172a' }}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</b></span>
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
                Customer: <b style={{ color: '#0f172a' }}>Infinium Shelters LLP (Site Tower B)</b>
              </div>
            </div>

            {/* Items Table */}
            <div style={{ padding: '10px 0', borderBottom: '1px dashed #cbd5e1' }}>
              <table style={{ width: '100%', fontSize: 11.5, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                    <th style={{ padding: '4px 0', fontWeight: 700 }}>Item</th>
                    <th style={{ padding: '4px 0', textAlign: 'center', fontWeight: 700 }}>Qty</th>
                    <th style={{ padding: '4px 0', textAlign: 'right', fontWeight: 700 }}>Price</th>
                    <th style={{ padding: '4px 0', textAlign: 'right', fontWeight: 700 }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '6px 0', fontWeight: 600 }}>
                      Fe 550D TMT 12mm <span style={{ fontSize: 10, color: '#64748b' }}>(7214)</span>
                    </td>
                    <td style={{ textAlign: 'center', padding: '6px 0' }}>1 MT</td>
                    <td style={{ textAlign: 'right', padding: '6px 0' }}>64,500.00</td>
                    <td style={{ textAlign: 'right', padding: '6px 0', fontWeight: 700 }}>64,500.00</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '6px 0', fontWeight: 600 }}>
                      MS Angles 50x50x6 <span style={{ fontSize: 10, color: '#64748b' }}>(7216)</span>
                    </td>
                    <td style={{ textAlign: 'center', padding: '6px 0' }}>1 MT</td>
                    <td style={{ textAlign: 'right', padding: '6px 0' }}>58,000.00</td>
                    <td style={{ textAlign: 'right', padding: '6px 0', fontWeight: 700 }}>58,000.00</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '6px 0', fontWeight: 600 }}>
                      MS Binding Wire 18G <span style={{ fontSize: 10, color: '#64748b' }}>(7217)</span>
                    </td>
                    <td style={{ textAlign: 'center', padding: '6px 0' }}>50 KG</td>
                    <td style={{ textAlign: 'right', padding: '6px 0' }}>72.00</td>
                    <td style={{ textAlign: 'right', padding: '6px 0', fontWeight: 700 }}>3,600.00</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Totals Breakdown */}
            <div style={{ padding: '10px 0', fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', marginBottom: 4 }}>
                <span>Subtotal Taxable</span>
                <span>{form.currencySymbol || '₹'}1,26,100.00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', marginBottom: 4 }}>
                <span>CGST (9%)</span>
                <span>{form.currencySymbol || '₹'}11,349.00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', marginBottom: 6 }}>
                <span>SGST (9%)</span>
                <span>{form.currencySymbol || '₹'}11,349.00</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 14.5,
                fontWeight: 900,
                color: 'var(--navy)',
                paddingTop: 8,
                borderTop: '2px solid var(--navy)'
              }}>
                <span>Total Amount</span>
                <span>{form.currencySymbol || '₹'}1,48,798.00</span>
              </div>
            </div>

            {/* Terms and Conditions */}
            {form.terms && (
              <div style={{
                paddingTop: 10,
                marginTop: 6,
                borderTop: '1px dashed #cbd5e1',
                fontSize: 10.5,
                color: '#64748b',
                lineHeight: 1.4,
                textAlign: 'center'
              }}>
                <b style={{ color: '#0f172a', display: 'block', marginBottom: 2 }}>Terms &amp; Conditions</b>
                <div style={{ whiteSpace: 'pre-line' }}>{form.terms}</div>
                <div style={{ marginTop: 8, fontStyle: 'italic' }}>
                  Thank you for visiting {form.storeName || 'Sri Venkateswara Steels'}! Come back soon!
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
