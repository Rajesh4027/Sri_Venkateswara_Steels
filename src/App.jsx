import { useState, useMemo, useEffect } from 'react';
import LOGO from './assets/logo.png';
import { KEY, AUTH_KEY, load, seed, DEFAULT_CATEGORIES_LIST, DEFAULT_UOMS_LIST, DEFAULT_SETTINGS } from './utils';
import Ic, { RingSpinner } from './components/Icon';
import BillLightbox from './components/BillLightbox';
import InwardEntryModal from './components/InwardEntryModal';

import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import Stock from './pages/Stock';
import InwardEntryPage from './pages/InwardEntryPage';
import ItemDrawer from './pages/ItemDrawer';
import IssueBill from './pages/IssueBill';
import InwardRegister from './pages/InwardRegister';
import ReportsGST from './pages/ReportsGST';
import Users from './pages/Users';
import SettingsPage from './pages/SettingsPage';
import IssuedBillsHistory from './pages/IssuedBillsHistory';
import { useLanguage } from './context/LanguageContext';
import LanguageToggle from './components/LanguageToggle';
import SoftwareVersionAlert from './components/SoftwareVersionAlert';
import ZoomController from './components/ZoomController';

export default function App() {
  const { t, lang } = useLanguage();
  const init = useMemo(() => load() || seed(), []);
  const [items, setItems] = useState(init.items);
  const [bills, setBills] = useState(init.bills);
  const [users, setUsers] = useState(init.users);
  const [inwardInvoices, setInwardInvoices] = useState(init.inwardInvoices || []);
  const [categories, setCategories] = useState(init.categories || DEFAULT_CATEGORIES_LIST);
  const [uoms, setUoms] = useState(init.uoms || DEFAULT_UOMS_LIST);
  const [settings, setSettings] = useState(init.settings || DEFAULT_SETTINGS);

  // Authentication State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem(AUTH_KEY) || sessionStorage.getItem(AUTH_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) { }
    return null;
  });

  const [page, setPage] = useState('dash');
  const [filter, setFilter] = useState('all');
  const [sel, setSel] = useState(null);
  const [preset, setPreset] = useState(null);
  const [nav, setNav] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [msg, setMsg] = useState('');
  const [inwardModalOpen, setInwardModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [consumptionOpen, setConsumptionOpen] = useState(true);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [editingBill, setEditingBill] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleConfirmLogout = () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setTimeout(() => {
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
      handleLogout();
    }, 2000);
  };

  // Sync state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        items,
        bills,
        users,
        inwardInvoices,
        categories,
        uoms,
        settings
      }));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }, [items, bills, users, inwardInvoices, categories, uoms, settings]);

  const toast = t => {
    setMsg(t);
    setTimeout(() => setMsg(''), 2600);
  };

  const handleLogin = (user, remember) => {
    setCurrentUser(user);
    setPage('dash');
    try {
      if (remember) {
        localStorage.setItem(AUTH_KEY, JSON.stringify(user));
      } else {
        sessionStorage.setItem(AUTH_KEY, JSON.stringify(user));
      }
    } catch (e) { }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(AUTH_KEY);
      sessionStorage.removeItem(AUTH_KEY);
    } catch (e) { }
    toast('Logged out successfully.');
  };

  // Calculate live stock dynamically: recv - current bills total
  const billed = useMemo(() => {
    const m = {};
    bills.forEach(b => (b.rows || []).forEach(r => {
      const deduct = r.stockDeductQty !== undefined
        ? Number(r.stockDeductQty || 0)
        : (r.weightInKg !== undefined && r.weightInKg !== null && Number(r.weightInKg) > 0 ? Number(r.weightInKg) : (Number(r.qty) || 0));
      m[r.id] = +((m[r.id] || 0) + deduct).toFixed(3);
    }));
    return m;
  }, [bills]);

  const E = useMemo(() => items.map(i => {
    const totalIssued = (billed[i.id] || 0);
    const s = +(Number(i.recv || 0) - totalIssued).toFixed(2);

    // Look for the rate and tax rate recorded in the latest inward invoice for this item
    let inwardGst = null;
    let latestInwardRate = null;
    for (const inv of inwardInvoices) {
      const found = (inv.items || []).find(it =>
        (it.id && i.id && it.id === i.id) ||
        (it.name || '').trim().toUpperCase() === (i.name || '').trim().toUpperCase()
      );
      if (found) {
        if (latestInwardRate === null && found.rate !== undefined && found.rate !== null && found.rate !== '' && !isNaN(found.rate) && Number(found.rate) > 0) {
          latestInwardRate = Number(found.rate);
        }
        const val = (found.taxPct !== undefined && found.taxPct !== null && found.taxPct !== '' && !isNaN(found.taxPct))
          ? Number(found.taxPct)
          : ((found.gst !== undefined && found.gst !== null && found.gst !== '' && !isNaN(found.gst)) ? Number(found.gst) : null);
        if (val !== null && inwardGst === null) {
          inwardGst = val;
        }
        if (latestInwardRate !== null && inwardGst !== null) {
          break;
        }
      }
    }

    // Determine accurate purchase rate (without GST):
    // If inward invoices exist for this item, the latest remaining inward invoice rate is the ground truth
    const rateWithoutGst = (latestInwardRate !== null && latestInwardRate > 0)
      ? latestInwardRate
      : (Number(i.rate) || 0);

    // Determine accurate GST rate (including 0%)
    let gstPct = 18;
    if (i.gst !== undefined && i.gst !== null && i.gst !== '' && !isNaN(i.gst) && Number(i.gst) !== 18) {
      gstPct = Number(i.gst);
    } else if (inwardGst !== null) {
      gstPct = inwardGst;
    } else if (i.gst !== undefined && i.gst !== null && i.gst !== '' && !isNaN(i.gst)) {
      gstPct = Number(i.gst);
    }

    const rateWithGst = +(rateWithoutGst * (1 + gstPct / 100)).toFixed(2);
    return {
      ...i,
      rate: rateWithoutGst,
      gst: gstPct,
      rateWithoutGst,
      rateWithGst,
      issued: totalIssued,
      stock: s,
      status: s <= 0 ? 'out' : s <= i.min ? 'low' : 'ok'
    };
  }), [items, billed, inwardInvoices]);

  // Automatically reconcile item purchase rates and GST with inward invoices
  // (e.g. when an inward bill is deleted, items revert back to the previous bill's rate)
  useEffect(() => {
    let changed = false;
    const reconciled = items.map(item => {
      let latestRate = null;
      let latestGst = null;
      let latestDate = null;
      for (const inv of inwardInvoices) {
        const found = (inv.items || []).find(it =>
          (it.id && item.id && it.id === item.id) ||
          (it.name || '').trim().toUpperCase() === (item.name || '').trim().toUpperCase()
        );
        if (found) {
          if (latestRate === null && found.rate !== undefined && found.rate !== null && !isNaN(found.rate) && Number(found.rate) > 0) {
            latestRate = Number(found.rate);
            latestDate = inv.date;
          }
          const val = (found.taxPct !== undefined && found.taxPct !== null && found.taxPct !== '' && !isNaN(found.taxPct))
            ? Number(found.taxPct)
            : ((found.gst !== undefined && found.gst !== null && found.gst !== '' && !isNaN(found.gst)) ? Number(found.gst) : null);
          if (val !== null && latestGst === null) {
            latestGst = val;
          }
          if (latestRate !== null && latestGst !== null) break;
        }
      }

      if (latestRate !== null && Number(item.rate) !== latestRate) {
        changed = true;
        return {
          ...item,
          rate: latestRate,
          ...(latestGst !== null ? { gst: latestGst } : {}),
          ...(latestDate ? { last: latestDate } : {})
        };
      }
      return item;
    });

    if (changed) {
      setItems(reconciled);
    }
  }, [inwardInvoices]);

  const lowN = E.filter(i => i.status !== 'ok').length;

  const go = (p, f) => {
    setPage(p);
    if (f) setFilter(f);
    setNav(false);
    setSel(null);
    window.scrollTo(0, 0);
  };

  const handleEditInvoice = (inv) => {
    setEditingInvoice(inv);
    go('inward-entry');
  };

  const handleEditBill = (bill) => {
    setEditingBill(bill);
    go('bill');
  };

  const it = sel && E.find(i => i.id === sel);
  const saveItems = arr => setItems(arr.map(({ stock, status, ...r }) => r));

  const reset = () => {
    const s = seed();
    setItems(s.items);
    setBills(s.bills);
    setUsers(s.users);
    setInwardInvoices(s.inwardInvoices);
    setCategories(s.categories);
    setUoms(s.uoms);
    setSettings(s.settings || DEFAULT_SETTINGS);
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch (e) { }
    toast('All data cleared. System ready for fresh manual entry.');
  };

  // If user is not authenticated, display the professional LoginPage
  if (!currentUser) {
    return (
      <>
        <LoginPage
          users={users}
          onLogin={handleLogin}
          settings={settings}
        />
        {msg && <div className="toast">{msg}</div>}
      </>
    );
  }

  const NAV = [
    ['dash', t('navDashboard'), 'dash'],
    ['stock', t('navStock'), 'box'],
    ['inward-entry', t('navInward'), 'truck'],
    ['bill', t('navConsumption'), 'bill'],
    ['inward', t('navSuppliers'), 'inw'],
    ['reports', t('navReports'), 'shield'],
    ['users', t('navUsers'), 'users'],
    ['settings', t('navSettings'), 'gear']
  ];

  return (
    <div className={`app ${collapsed ? 'sidebar-collapsed' : ''} lang-${lang}`}>
      {/* Sidebar Navigation */}
      <aside className={`side ${collapsed ? 'collapsed' : ''} ${nav ? 'open' : ''}`}>

        {/* ── Brand / Company Header ── */}
        <div
          className="brand"
          onClick={() => {
            if (collapsed) {
              setCollapsed(false);
            } else {
              go('dash');
            }
          }}
          title={collapsed ? t('expandSidebar') : `${settings.storeName || (lang === 'ta' ? t('storeName') : 'Sri Venkateswara Steels')} Dashboard`}
        >
          {/* Logo & Expand Toggle Box */}
          <div className="brand-logo-wrap" title={collapsed ? t('expandSidebar') : ''}>
            <img className="brand-logo" src={LOGO} alt="SVS" />
            <div className="brand-expand-overlay" title={t('expandSidebar')}>
              <Ic n="chevronRight" s={18} />
            </div>
          </div>

          {/* Company Information (smoothly transitions) */}
          <div className="brand-info">
            <b>{settings.storeName || (lang === 'ta' ? t('storeName') : 'Sri Venkateswara Steels')}</b>
            <div className="brand-sub">
              <span className="brand-dot" />
              <span>{t('activeItemsCount', { n: E.length })}</span>
            </div>
          </div>

          {/* Collapse Button (smoothly transitions) */}
          <button
            type="button"
            className="brand-collapse"
            onClick={e => {
              e.stopPropagation();
              setCollapsed(true);
            }}
            title={t('collapseSidebar')}
            aria-label={t('collapseSidebar')}
          >
            <Ic n="chevronLeft" s={14} />
          </button>
        </div>

        {/* ── Section label ── */}
        <div className="nav-section-label">{t('operationsLedger')}</div>

        {/* ── Navigation items ── */}
        <nav className="nav">
          {NAV.map(([k, l, ic]) => {
            if (k === 'bill') {
              const isConsumptionActive = page === 'bill' || page === 'bills-history';
              return (
                <div key={k} className="nav-group">
                  <button
                    className={isConsumptionActive ? 'on' : ''}
                    onClick={() => {
                      if (collapsed) {
                        setCollapsed(false);
                        setConsumptionOpen(true);
                      } else {
                        setConsumptionOpen(prev => !prev);
                      }
                      go('bill');
                    }}
                    title={collapsed ? l : ''}
                    aria-label={l}
                  >
                    <Ic n={ic} s={18} />
                    <span className="nav-text">{l}</span>
                    {!collapsed && (
                      <span
                        onClick={e => {
                          e.stopPropagation();
                          setConsumptionOpen(prev => !prev);
                        }}
                        style={{
                          marginLeft: 'auto',
                          display: 'inline-flex',
                          alignItems: 'center',
                          color: isConsumptionActive ? 'var(--gold2)' : 'var(--mut)',
                          transform: consumptionOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform .2s'
                        }}
                        title={consumptionOpen ? 'Collapse sub-menu' : 'Expand sub-menu'}
                      >
                        <Ic n="chevronDown" s={14} />
                      </span>
                    )}
                  </button>

                  {/* Sub-categories */}
                  {consumptionOpen && !collapsed && (
                    <div className="nav-sub">
                      <button
                        type="button"
                        className={`nav-sub-btn ${page === 'bill' ? 'on' : ''}`}
                        onClick={() => {
                          setEditingBill(null);
                          setPreset(null);
                          go('bill');
                        }}
                        title={t('navNewIssueBill')}
                      >
                        <Ic n="plus" s={13} />
                        <span>{t('navNewIssueBill')}</span>
                      </button>

                      <button
                        type="button"
                        className={`nav-sub-btn ${page === 'bills-history' ? 'on' : ''}`}
                        onClick={() => go('bills-history')}
                        title={t('navDeliveryHistory')}
                      >
                        <Ic n="fileText" s={13} />
                        <span>{t('navDeliveryHistory')}</span>
                        {bills.length > 0 && (
                          <span className="sub-bd">
                            {bills.length}
                          </span>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <button
                key={k}
                className={page === k ? 'on' : ''}
                onClick={() => go(k, k === 'stock' ? 'all' : null)}
                title={collapsed ? l : ''}
                aria-label={l}
              >
                <Ic n={ic} s={18} />
                <span className="nav-text">{l}</span>
                {k === 'stock' && lowN > 0 && <span className="bd">{lowN}</span>}
                {k === 'inward' && inwardInvoices.length > 0 && (
                  <span className="bd" style={{ background: 'var(--navy2)' }}>
                    {inwardInvoices.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* ── Quick action button ── */}
        <div className="side-quick-btn">
          <button
            className="btn gold"
            style={{ width: '100%', justifyContent: 'center', fontSize: 13 }}
            onClick={() => { setNav(false); go('inward-entry'); }}
          >
            <Ic n="plus" s={15} /> {t('inwardBillEntryBtn')}
          </button>
        </div>

        {/* ── Language Switcher, Zoom Controller & Software Version in Sidebar ── */}
        {!collapsed ? (
          <div style={{ padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 7, width: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap', width: '100%' }}>
              <LanguageToggle />
              <SoftwareVersionAlert settings={settings} toast={toast} style={{ padding: '5px 12px', fontSize: 12 }} />
            </div>
            <ZoomController toast={toast} style={{ width: '100%', justifyContent: 'space-between', boxSizing: 'border-box', padding: '3px 8px' }} />
          </div>
        ) : (
          <div style={{ padding: '0 6px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: '100%', boxSizing: 'border-box' }}>
            <LanguageToggle compact />
            <SoftwareVersionAlert compact settings={settings} toast={toast} />
            <ZoomController compact toast={toast} />
          </div>
        )}

        {/* ── Footer / User Profile & Sign Out ── */}
        {!collapsed ? (
          <div className="foot" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              className="av"
              style={{
                width: 34,
                height: 34,
                fontSize: 13,
                flexShrink: 0,
                background: currentUser.role === 'Admin' ? 'var(--gold)' : 'var(--navy)',
                color: '#fff',
                fontWeight: 800
              }}
            >
              {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
            </div>
            <div className="t" style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
              <b style={{ display: 'block', fontSize: 13, color: 'var(--navy)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {currentUser.name}
              </b>
              <div className="sub" style={{ fontSize: 11, color: 'var(--mut)', whiteSpace: 'nowrap' }}>
                {currentUser.role} &middot; @{currentUser.username}
              </div>
            </div>
            <button
              type="button"
              className="ib"
              onClick={() => setShowLogoutConfirm(true)}
              title={t('signOutTitle')}
              style={{ color: 'var(--red)', width: 30, height: 30, flexShrink: 0 }}
              aria-label={t('signOut')}
            >
              <Ic n="logout" s={15} />
            </button>
          </div>
        ) : (
          <div className="foot collapsed-foot" style={{ padding: '8px 4px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, borderTop: '1px solid var(--line)', width: '100%', boxSizing: 'border-box' }}>
            <div
              className="av"
              style={{
                width: 34,
                height: 34,
                fontSize: 13,
                flexShrink: 0,
                background: currentUser.role === 'Admin' ? 'var(--gold)' : 'var(--navy)',
                color: '#fff',
                fontWeight: 800
              }}
              title={`${currentUser.name} (${currentUser.role})`}
            >
              {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
            </div>
            <button
              type="button"
              className="ib"
              onClick={() => setShowLogoutConfirm(true)}
              title={t('signOutTitle')}
              style={{
                color: 'var(--red)',
                width: 34,
                height: 34,
                borderRadius: 9,
                background: '#FEF2F2',
                borderColor: '#FEE2E2',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              aria-label={t('signOut')}
            >
              <Ic n="logout" s={16} />
            </button>
          </div>
        )}
      </aside>

      {/* Main App Content Area */}
      <div className="main">
        {/* Mobile Header Bar - Only visible on small screens <= 860px */}
        <div className="mobile-bar">
          <button className="ib" aria-label="Menu" onClick={() => setNav(!nav)}>
            <Ic n="menu" />
          </button>
          <span style={{ fontWeight: 800, color: 'var(--navy)', fontSize: 15 }}>
            Sri Venkateswara Steels
          </span>
          <span className="grow" />
          <ZoomController compact toast={toast} style={{ padding: '2px 4px', fontSize: 11 }} />
          <LanguageToggle style={{ padding: '2px 4px', fontSize: 11 }} />
          <button
            className="ib"
            aria-label="Low stock alerts"
            onClick={() => go('stock', 'low')}
            title={`${lowN} items need reorder`}
          >
            <Ic n="bell" />
            {lowN > 0 && <span className="n">{lowN}</span>}
          </button>
          <button
            className="ib"
            aria-label="Sign out"
            onClick={() => setShowLogoutConfirm(true)}
            title="Sign out"
            style={{ color: 'var(--red)' }}
          >
            <Ic n="logout" s={15} />
          </button>
        </div>

        {/* Page Content */}
        <main className="pg">
          {page === 'dash' && (
            <Dashboard
              items={E}
              bills={bills}
              inwardInvoices={inwardInvoices}
              categories={categories}
              go={go}
              open={setSel}
              openInwardModal={() => go('inward-entry')}
            />
          )}

          {page === 'stock' && (
            <Stock
              items={E}
              setItems={saveItems}
              filter={filter}
              setFilter={setFilter}
              open={setSel}
              toast={toast}
              categories={categories}
              setCategories={setCategories}
              uoms={uoms}
              setUoms={setUoms}
              openInwardModal={() => go('inward-entry')}
            />
          )}

          {page === 'inward-entry' && (
            <InwardEntryPage
              items={E}
              setItems={saveItems}
              inwardInvoices={inwardInvoices}
              setInwardInvoices={setInwardInvoices}
              categories={categories}
              uoms={uoms}
              go={go}
              toast={toast}
              editingInvoice={editingInvoice}
              setEditingInvoice={setEditingInvoice}
              onPreviewImage={(src, title, supplier) => setPreviewImage({ src, title, supplier })}
            />
          )}

          {page === 'bill' && (
            <IssueBill
              key={editingBill ? editingBill.no : (preset || 'b')}
              items={E}
              bills={bills}
              setBills={setBills}
              setItems={saveItems}
              preset={preset}
              toast={toast}
              user={currentUser.name}
              settings={settings}
              go={go}
              uoms={uoms}
              editingBill={editingBill}
              setEditingBill={setEditingBill}
            />
          )}

          {page === 'bills-history' && (
            <IssuedBillsHistory
              bills={bills}
              setBills={setBills}
              items={E}
              setItems={saveItems}
              settings={settings}
              go={go}
              toast={toast}
              onEditBill={handleEditBill}
            />
          )}

          {page === 'inward' && (
            <InwardRegister
              items={E}
              setItems={saveItems}
              inwardInvoices={inwardInvoices}
              setInwardInvoices={setInwardInvoices}
              categories={categories}
              openInwardModal={() => {
                setEditingInvoice(null);
                go('inward-entry');
              }}
              onEditInvoice={handleEditInvoice}
              go={go}
              toast={toast}
            />
          )}

          {page === 'reports' && (
            <ReportsGST
              items={E}
              bills={bills}
              inwardInvoices={inwardInvoices}
              reset={reset}
              toast={toast}
            />
          )}

          {page === 'users' && (
            <Users
              users={users}
              setUsers={setUsers}
              currentUser={currentUser}
              toast={toast}
            />
          )}

          {page === 'settings' && (
            <SettingsPage
              settings={settings}
              setSettings={setSettings}
              items={E}
              setItems={saveItems}
              bills={bills}
              setBills={setBills}
              inwardInvoices={inwardInvoices}
              setInwardInvoices={setInwardInvoices}
              categories={categories}
              setCategories={setCategories}
              uoms={uoms}
              setUoms={setUoms}
              users={users}
              setUsers={setUsers}
              toast={toast}
            />
          )}
        </main>
      </div>

      {/* Item Detail Drawer */}
      {it && (
        <ItemDrawer
          it={it}
          items={E}
          setItems={saveItems}
          inwardInvoices={inwardInvoices}
          categories={categories}
          uoms={uoms}
          onClose={() => setSel(null)}
          goBill={id => {
            setPreset(id);
            go('bill');
          }}
          toast={toast}
        />
      )}

      {/* Global Inward Stock Update Modal (if triggered directly) */}
      {inwardModalOpen && (
        <InwardEntryModal
          items={E}
          setItems={saveItems}
          inwardInvoices={inwardInvoices}
          setInwardInvoices={setInwardInvoices}
          categories={categories}
          uoms={uoms}
          onClose={() => setInwardModalOpen(false)}
          toast={toast}
          onPreviewImage={(src, title, supplier) => setPreviewImage({ src, title, supplier })}
        />
      )}

      {/* Global Bill Image Lightbox Viewer */}
      {previewImage && (
        <BillLightbox
          src={previewImage.src}
          title={previewImage.title}
          supplier={previewImage.supplier}
          onClose={() => setPreviewImage(null)}
        />
      )}

      {/* ── Animated Logout Confirmation Modal (100% Viewport Centered) ── */}
      {showLogoutConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
        >
          {/* Backdrop with soft blur */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(11, 27, 51, 0.45)',
              backdropFilter: 'blur(5px)',
              animation: 'fadeIn .18s ease-out'
            }}
            onClick={() => {
              if (!isLoggingOut) setShowLogoutConfirm(false);
            }}
          />

          {/* Centered Modal Dialog */}
          <div
            className="logout-confirm-modal-box"
            style={{
              position: 'relative',
              zIndex: 10000,
              background: '#ffffff',
              borderRadius: 24,
              padding: '36px 32px 30px',
              width: '100%',
              maxWidth: 440,
              boxShadow: '0 25px 70px -10px rgba(11, 27, 51, 0.38), 0 0 0 1px rgba(0,0,0,0.06)',
              textAlign: 'center',
              margin: 'auto'
            }}
          >
            {/* Warning / Logout Icon */}
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: '#FDECEA',
              color: 'var(--red)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              boxShadow: isLoggingOut ? '0 0 0 10px rgba(220, 38, 38, 0.16)' : '0 0 0 8px rgba(200, 55, 45, 0.12)',
              animation: isLoggingOut ? 'logoutIconPulse 1s ease-in-out infinite alternate' : 'none'
            }}>
              <Ic n="logout" s={28} />
            </div>

            <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: 'var(--navy)', letterSpacing: '-0.02em' }}>
              {isLoggingOut ? t('loggingOut') : t('logoutConfirmTitle')}
            </h3>

            <p style={{ margin: '0 0 24px', fontSize: 13.5, color: 'var(--mut)', lineHeight: 1.55 }}>
              {t('logoutConfirmDesc')}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 12 }}>
              <button
                type="button"
                className="btn"
                style={{
                  height: 48,
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 14,
                  borderRadius: 12,
                  cursor: isLoggingOut ? 'not-allowed' : 'pointer'
                }}
                disabled={isLoggingOut}
                onClick={() => setShowLogoutConfirm(false)}
              >
                {t('logoutCancelBtn')}
              </button>

              <button
                type="button"
                className={`btn-portal-action ${isLoggingOut ? 'is-loading' : ''}`}
                style={{
                  height: 48,
                  borderRadius: 12,
                  fontSize: 14,
                  margin: 0
                }}
                disabled={isLoggingOut}
                onClick={handleConfirmLogout}
              >
                {isLoggingOut ? (
                  <>
                    <RingSpinner s={18} />
                    <span>{t('loggingOut')}</span>
                  </>
                ) : (
                  <>
                    <Ic n="logout" s={16} />
                    <span>{t('logoutConfirmBtn')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {msg && <div className="toast" role="status">{msg}</div>}
    </div>
  );
}

