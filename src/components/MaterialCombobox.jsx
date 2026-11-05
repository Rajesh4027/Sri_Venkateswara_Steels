import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Ic from './Icon';
import { fmt, getMaterialDisplayName } from '../utils';
import { useTranslation } from '../context/LanguageContext';

/**
 * Highlight query match substring inside text
 */
function highlightMatch(text, query) {
  if (!query || !text) return text;
  const q = query.trim();
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: '#FEF08A', color: '#854D0E', padding: '0 2px', borderRadius: 3, fontWeight: 800 }}>
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

/**
 * InwardMaterialCombobox
 * Used in InwardEntryPage and InwardEntryModal.
 * - Dropdown opens ONLY when typing AND only if matching existing items exist
 * - NO "add new product" dropdown banner! When user types a new product, they simply Tab/click to the next cell to fill HSN, etc.
 * - Always positioned directly below the input box
 * - ArrowDown / ArrowUp to navigate existing items, Enter to select
 */
export function InwardMaterialCombobox({
  row,
  items = [],
  onSelectExisting,
  onAddNew,
  onClear,
  placeholder = "Search or type new material name..."
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(row.name || '');
  const [activeIndex, setActiveIndex] = useState(0);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 340 });

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const itemRefs = useRef([]);

  // Sync external name changes into query when not actively editing
  useEffect(() => {
    if (!isOpen) {
      setQuery(row.name || '');
    }
  }, [row.name, row.id, row.isNew, isOpen]);

  // Compute matching existing items based on query (searches both English & Tamil names)
  const matchingItems = useMemo(() => {
    const q = (query || '').trim().toLowerCase();
    if (!q) {
      return [];
    }
    return items.filter(it => {
      const n = (it.name || '').toLowerCase();
      const nTa = (it.nameTa || it.tamilName || '').toLowerCase();
      const code = (it.id || '').toLowerCase();
      const cat = (it.cat || '').toLowerCase();
      const hsn = (it.hsn || '').toLowerCase();
      return n.includes(q) || nTa.includes(q) || code.includes(q) || cat.includes(q) || hsn.includes(q);
    });
  }, [query, items]);

  // Reposition floating dropdown dynamically with viewport collision detection
  const updatePosition = () => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpward = spaceBelow < 240 && spaceAbove > spaceBelow;
    const availableSpace = openUpward ? spaceAbove - 16 : spaceBelow - 16;
    const maxHeight = Math.max(160, Math.min(320, availableSpace));
    const width = Math.max(rect.width, 380);
    const left = Math.max(10, Math.min(rect.left, window.innerWidth - width - 16));

    setCoords({
      top: openUpward ? 'auto' : rect.bottom + 4,
      bottom: openUpward ? (window.innerHeight - rect.top + 4) : 'auto',
      left,
      width,
      maxHeight,
      openUpward
    });
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScroll = () => updatePosition();
      const handleResize = () => updatePosition();
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isOpen, matchingItems.length]);

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && itemRefs.current[activeIndex]) {
      itemRefs.current[activeIndex].scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, isOpen]);

  // Handle document click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleDocClick = e => {
      if (
        (inputRef.current && inputRef.current.contains(e.target)) ||
        (listRef.current && listRef.current.contains(e.target))
      ) {
        return;
      }
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, [isOpen]);

  const handleInputChange = e => {
    const val = e.target.value;
    setQuery(val);
    const trimmed = val.trim();

    // If input is emptied/cleared by user, call onClear to empty HSN, rate, etc.
    if (!trimmed) {
      onClear();
      setIsOpen(false);
      return;
    }

    // Check if what user typed matches an existing product
    const exactMatch = items.find(it => (it.name || '').trim().toLowerCase() === trimmed.toLowerCase());
    if (exactMatch) {
      onSelectExisting(exactMatch);
    } else {
      // It's a new product name or custom typed text!
      onAddNew(trimmed);
    }

    // Filter matching existing items
    if (trimmed.length > 0) {
      const q = trimmed.toLowerCase();
      const matches = items.filter(it => {
        const n = (it.name || '').toLowerCase();
        const code = (it.id || '').toLowerCase();
        const cat = (it.cat || '').toLowerCase();
        const hsn = (it.hsn || '').toLowerCase();
        return n.includes(q) || code.includes(q) || cat.includes(q) || hsn.includes(q);
      });

      // ONLY open dropdown if there are matching existing items!
      if (matches.length > 0) {
        setIsOpen(true);
        setActiveIndex(0);
        updatePosition();
      } else {
        setIsOpen(false);
      }
    } else {
      setIsOpen(false);
    }
  };

  // Keyboard navigation
  const handleKeyDown = e => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        if (matchingItems.length > 0) {
          setIsOpen(true);
          setActiveIndex(0);
          updatePosition();
        }
        return;
      }
      if (matchingItems.length > 0) {
        setActiveIndex(prev => (prev + 1) % matchingItems.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        if (matchingItems.length > 0) {
          setIsOpen(true);
          setActiveIndex(matchingItems.length - 1);
          updatePosition();
        }
        return;
      }
      if (matchingItems.length > 0) {
        setActiveIndex(prev => (prev - 1 + matchingItems.length) % matchingItems.length);
      }
    } else if (e.key === 'Enter') {
      if (isOpen && matchingItems.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        const targetItem = matchingItems[activeIndex];
        if (targetItem) {
          onSelectExisting(targetItem);
          setQuery(targetItem.name);
          setIsOpen(false);
        }
      }
    } else if (e.key === 'Tab') {
      // Natural tab to next field: close dropdown and keep whatever was typed as new product
      setIsOpen(false);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handlePickItem = item => {
    onSelectExisting(item);
    setQuery(item.name);
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    onClear();
    setIsOpen(false);
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div className="combobox-container" style={{ position: 'relative', width: '100%' }}>
      <div className="combobox-input-wrap" style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
        <input
          ref={inputRef}
          type="text"
          className="table-input"
          style={{
            width: '100%',
            fontWeight: 700,
            fontSize: 13,
            paddingRight: row.name || query ? 54 : 10,
            background: row.isNew ? '#F0FDF4' : '#fff',
            borderColor: row.isNew ? '#86EFAC' : 'var(--line)'
          }}
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />

        {/* Badges / Clear button */}
        <div style={{ position: 'absolute', right: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
          {row.isNew && query.trim() && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                background: '#DCFCE7',
                color: '#15803D',
                padding: '2px 5px',
                borderRadius: 4,
                border: '1px solid #86EFAC'
              }}
              title="New Product will be created in inventory upon saving"
            >
              NEW
            </span>
          )}
          {(query || row.name) && (
            <button
              type="button"
              tabIndex={-1}
              onClick={handleClear}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--mut)',
                display: 'flex',
                alignItems: 'center',
                padding: 2
              }}
              title="Clear / Type different material"
            >
              <Ic n="x" s={14} />
            </button>
          )}
        </div>
      </div>

      {/* Floating Dropdown: ONLY shown when there are matching existing items */}
      {isOpen && matchingItems.length > 0 && createPortal(
        <div
          ref={listRef}
          className="combobox-dropdown"
          style={{
            position: 'fixed',
            top: coords.top,
            bottom: coords.bottom,
            left: coords.left,
            width: coords.width,
            maxHeight: coords.maxHeight || 280,
            overflowY: 'auto',
            background: '#FFFFFF',
            border: '1.5px solid rgba(15, 23, 42, 0.16)',
            borderRadius: 12,
            boxShadow: '0 16px 38px -6px rgba(0, 31, 63, 0.25), 0 6px 16px rgba(0,0,0,0.08)',
            zIndex: 9999999
          }}
        >
          {/* Header helper */}
          <div style={{
            padding: '6px 12px',
            background: '#F8FAFC',
            borderBottom: '1px solid var(--line)',
            fontSize: 11,
            color: 'var(--mut)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>📦 Existing Stock Materials (↑↓ to cycle · Enter ↵ to pick)</span>
            <span style={{ fontWeight: 700 }}>{matchingItems.length} found</span>
          </div>

          {/* Matching Existing Stock Items */}
          {matchingItems.map((item, idx) => {
            const isActive = activeIndex === idx;

            return (
              <div
                key={item.id}
                ref={el => (itemRefs.current[idx] = el)}
                className={`combobox-item ${isActive ? 'active' : ''}`}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  borderBottom: '1px solid #F1F5F9',
                  background: isActive ? '#EFF6FF' : '#fff',
                  borderLeft: isActive ? '3.5px solid var(--navy)' : '3.5px solid transparent',
                  transition: 'all .12s ease'
                }}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => handlePickItem(item)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>
                    {highlightMatch(item.name, query)}
                  </div>
                  {(item.nameTa || item.tamilName) && (
                    <div style={{ fontSize: 11.5, color: '#B45309', fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 9.5, background: '#FEF3C7', padding: '1px 4px', borderRadius: 3 }}>தமிழ்</span>
                      <span>{highlightMatch(item.nameTa || item.tamilName, query)}</span>
                    </div>
                  )}
                  <div style={{ fontSize: 10.5, color: 'var(--mut)', marginTop: 2 }}>
                    {item.id} · {item.cat} · HSN {item.hsn || '—'}
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    background: (item.stock || 0) > 0 ? '#ECFDF5' : '#F1F5F9',
                    color: (item.stock || 0) > 0 ? '#065F46' : 'var(--mut)',
                    border: (item.stock || 0) > 0 ? '1px solid #A7F3D0' : '1px solid var(--line)',
                    padding: '2px 7px',
                    borderRadius: 6,
                    whiteSpace: 'nowrap'
                  }}>
                    Stock: {fmt(item.stock || 0)} {item.uom || 'NOS'}
                  </span>
                  {item.rate > 0 && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)', marginTop: 2 }}>
                      ₹{item.rate}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}

/**
 * InwardTamilMaterialInput
 * Dedicated Tamil description input box for inward product row.
 * - Shows autocomplete suggestions if typed Tamil text matches any stock items.
 * - Selecting an item triggers onSelectExisting(item) to sync both English and Tamil names and stock attributes.
 * - Typing updates onChangeTamilName(text).
 */
export function InwardTamilMaterialInput({
  row,
  items = [],
  onSelectExisting,
  onChangeTamilName,
  placeholder = "தமிழில் பொருள் பெயர்..."
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(row.nameTa || '');
  const [activeIndex, setActiveIndex] = useState(0);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 340 });

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const itemRefs = useRef([]);

  // Sync external nameTa changes into query
  useEffect(() => {
    if (!isOpen) {
      setQuery(row.nameTa || '');
    }
  }, [row.nameTa, isOpen]);

  // Compute matching items based on Tamil query or English name
  const matchingItems = useMemo(() => {
    const q = (query || '').trim().toLowerCase();
    if (!q) return [];
    return items.filter(it => {
      const nTa = (it.nameTa || it.tamilName || '').toLowerCase();
      const n = (it.name || '').toLowerCase();
      const code = (it.id || '').toLowerCase();
      return nTa.includes(q) || n.includes(q) || code.includes(q);
    });
  }, [query, items]);

  const updatePosition = () => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpward = spaceBelow < 240 && spaceAbove > spaceBelow;
    const availableSpace = openUpward ? spaceAbove - 16 : spaceBelow - 16;
    const maxHeight = Math.max(160, Math.min(320, availableSpace));
    const width = Math.max(rect.width, 380);
    const left = Math.max(10, Math.min(rect.left, window.innerWidth - width - 16));

    setCoords({
      top: openUpward ? 'auto' : rect.bottom + 4,
      bottom: openUpward ? (window.innerHeight - rect.top + 4) : 'auto',
      left,
      width,
      maxHeight,
      openUpward
    });
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScroll = () => updatePosition();
      const handleResize = () => updatePosition();
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isOpen, matchingItems.length]);

  useEffect(() => {
    if (isOpen && itemRefs.current[activeIndex]) {
      itemRefs.current[activeIndex].scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleDocClick = e => {
      if (
        (inputRef.current && inputRef.current.contains(e.target)) ||
        (listRef.current && listRef.current.contains(e.target))
      ) {
        return;
      }
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, [isOpen]);

  const handleInputChange = e => {
    const val = e.target.value;
    setQuery(val);
    onChangeTamilName(val);
    if (val.trim()) {
      setIsOpen(true);
      setActiveIndex(0);
    } else {
      setIsOpen(false);
    }
  };

  const handlePickItem = item => {
    const pickTa = item.nameTa || item.tamilName || '';
    setQuery(pickTa);
    setIsOpen(false);
    if (onSelectExisting) {
      onSelectExisting(item);
    }
  };

  const handleKeyDown = e => {
    if (e.key === 'ArrowDown') {
      if (!isOpen && matchingItems.length > 0) {
        setIsOpen(true);
        setActiveIndex(0);
        e.preventDefault();
        return;
      }
      if (isOpen) {
        e.preventDefault();
        setActiveIndex(prev => (prev + 1) % matchingItems.length);
      }
    } else if (e.key === 'ArrowUp') {
      if (isOpen) {
        e.preventDefault();
        setActiveIndex(prev => (prev - 1 + matchingItems.length) % matchingItems.length);
      }
    } else if (e.key === 'Enter') {
      if (isOpen && matchingItems[activeIndex]) {
        e.preventDefault();
        handlePickItem(matchingItems[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        ref={inputRef}
        className="table-input"
        style={{
          width: '100%',
          fontSize: 12.5,
          fontFamily: "'Mukta Malar', 'Plus Jakarta Sans', system-ui, sans-serif",
          padding: '6px 8px',
          paddingRight: query ? 24 : 8,
          borderColor: row.nameTa ? '#FCD34D' : 'var(--line)',
          background: row.nameTa ? '#FFFDF5' : '#fff'
        }}
        placeholder={placeholder}
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      {query && (
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            setQuery('');
            onChangeTamilName('');
            setIsOpen(false);
          }}
          style={{
            position: 'absolute',
            right: 4,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--mut)',
            padding: 2
          }}
          title="Clear Tamil Name"
        >
          <Ic n="x" s={12} />
        </button>
      )}

      {isOpen && matchingItems.length > 0 && createPortal(
        <div
          ref={listRef}
          className="combobox-dropdown"
          style={{
            position: 'fixed',
            top: coords.top,
            bottom: coords.bottom,
            left: coords.left,
            width: coords.width,
            maxHeight: coords.maxHeight || 260,
            overflowY: 'auto',
            background: '#FFFFFF',
            border: '1.5px solid rgba(15, 23, 42, 0.16)',
            borderRadius: 12,
            boxShadow: '0 16px 38px -6px rgba(0, 31, 63, 0.25)',
            zIndex: 9999999
          }}
        >
          <div style={{
            padding: '6px 12px',
            background: '#FFFBEB',
            borderBottom: '1px solid #FDE68A',
            fontSize: 11,
            color: '#92400E',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>🇮🇳 தமிழ் பொருட்கள் பரிந்துரை (Enter ↵ அழுத்தவும்)</span>
            <span style={{ fontWeight: 700 }}>{matchingItems.length} பொருட்கள்</span>
          </div>

          {matchingItems.map((item, idx) => {
            const isActive = activeIndex === idx;
            const tamilText = item.nameTa || item.tamilName || '';

            return (
              <div
                key={item.id}
                ref={el => (itemRefs.current[idx] = el)}
                className={`combobox-item ${isActive ? 'active' : ''}`}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  borderBottom: '1px solid #F1F5F9',
                  background: isActive ? '#FEF3C7' : '#fff',
                  borderLeft: isActive ? '3.5px solid #D97706' : '3.5px solid transparent'
                }}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => handlePickItem(item)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#92400E', fontFamily: "'Mukta Malar', 'Plus Jakarta Sans', sans-serif" }}>
                    {highlightMatch(tamilText || item.name, query)}
                  </div>
                  {tamilText && (
                    <div style={{ fontSize: 11, color: 'var(--mut)', marginTop: 1 }}>
                      EN: {item.name} · {item.id}
                    </div>
                  )}
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    background: (item.stock || 0) > 0 ? '#ECFDF5' : '#F1F5F9',
                    color: (item.stock || 0) > 0 ? '#065F46' : 'var(--mut)',
                    padding: '2px 6px',
                    borderRadius: 4
                  }}>
                    {fmt(item.stock || 0)} {item.uom || 'NOS'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}

/**
 * IssueMaterialCombobox
 * Used in IssueBill.jsx.
 * - Dropdown opens ONLY when typing
 * - One row, three columns:
 *   Column 1: Product Name & Code (NO Category)
 *   Column 2: In Stock (Center)
 *   Column 3: Rate (Right / Last)
 * - ArrowDown / ArrowUp to navigate
 * - Enter to select highlighted stock material
 * - STRICT: Newly typed materials that don't exist in stock are NOT allowed!
 */
export function IssueMaterialCombobox({
  id,
  items = [],
  selectedId,
  onSelect,
  toast,
  enableGst = false,
  placeholder = "Type to search stock materials or HSN..."
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 440 });
  const [activeIndex, setActiveIndex] = useState(0);
  const { lang } = useTranslation();
  const selectedItem = useMemo(() => items.find(i => i.id === selectedId), [items, selectedId]);
  const itemDisplayName = useMemo(() => {
    if (!selectedItem) return '';
    return getMaterialDisplayName(selectedItem, lang);
  }, [selectedItem, lang]);
  const [query, setQuery] = useState(itemDisplayName);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const itemRefs = useRef([]);

  // Sync external selectedId and language into query
  useEffect(() => {
    if (!isOpen) {
      setQuery(itemDisplayName);
    }
  }, [itemDisplayName, isOpen]);

  // Matching items based on query across all materials (including out of stock, matching English and Tamil)
  const matchingItems = useMemo(() => {
    const q = (query || '').trim().toLowerCase();
    if (!q) {
      return [];
    }
    const cleanQ = q.replace(/[^a-z0-9]/gi, '');
    return items.filter(it => {
      const n = (it.name || '').toLowerCase();
      const nTa = (it.nameTa || it.tamilName || '').toLowerCase();
      const code = (it.id || '').toLowerCase();
      const hsn = String(it.hsn || '').toLowerCase();
      const cleanHsn = hsn.replace(/[^a-z0-9]/gi, '');

      return (
        n.includes(q) ||
        nTa.includes(q) ||
        code.includes(q) ||
        hsn.includes(q) ||
        (cleanQ && cleanHsn && cleanHsn.includes(cleanQ))
      );
    });
  }, [query, items]);

  // Dynamically position dropdown with viewport boundary & collision detection
  const updatePosition = () => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpward = spaceBelow < 240 && spaceAbove > spaceBelow;
    const availableSpace = openUpward ? spaceAbove - 16 : spaceBelow - 16;
    const maxHeight = Math.max(160, Math.min(320, availableSpace));
    const width = Math.max(rect.width, 420);
    const left = Math.max(10, Math.min(rect.left, window.innerWidth - width - 16));

    setCoords({
      top: openUpward ? 'auto' : rect.bottom + 4,
      bottom: openUpward ? (window.innerHeight - rect.top + 4) : 'auto',
      left,
      width,
      maxHeight,
      openUpward
    });
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScroll = () => updatePosition();
      const handleResize = () => updatePosition();
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isOpen, matchingItems.length]);

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && itemRefs.current[activeIndex]) {
      itemRefs.current[activeIndex].scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, isOpen]);

  // Close on outside click & revert invalid typed text if not picked
  useEffect(() => {
    if (!isOpen) return;
    const handleDocClick = e => {
      if (
        (containerRef.current && containerRef.current.contains(e.target)) ||
        (listRef.current && listRef.current.contains(e.target))
      ) {
        return;
      }
      setIsOpen(false);
      // Revert to selected item if typed text wasn't picked from stock
      if (selectedItem) {
        setQuery(selectedItem.name);
      } else {
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, [isOpen, selectedItem]);

  const handleInputChange = e => {
    const val = e.target.value;
    setQuery(val);
    const trimmed = val.trim();

    // When user backspaces / deletes all text to remove product:
    if (!trimmed) {
      onSelect(null);
      setIsOpen(false);
      return;
    }

    setIsOpen(true);
    setActiveIndex(0);
    updatePosition();
  };

  const handleKeyDown = e => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        if (query.trim().length > 0 && matchingItems.length > 0) {
          setIsOpen(true);
          setActiveIndex(0);
          updatePosition();
        }
        return;
      }
      if (matchingItems.length > 0) {
        setActiveIndex(prev => (prev + 1) % matchingItems.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        if (query.trim().length > 0 && matchingItems.length > 0) {
          setIsOpen(true);
          setActiveIndex(matchingItems.length - 1);
          updatePosition();
        }
        return;
      }
      if (matchingItems.length > 0) {
        setActiveIndex(prev => (prev - 1 + matchingItems.length) % matchingItems.length);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();

      if (!query.trim()) return;

      if (matchingItems.length > 0) {
        const item = matchingItems[activeIndex] || matchingItems[0];
        if (item) {
          if (Number(item.stock || 0) <= 0) {
            if (toast) {
              toast(`⚠️ Cannot pick: "${getMaterialDisplayName(item, lang)}" is currently Out of Stock (0 ${item.uom || 'units'} available).`);
            }
            return;
          }
          onSelect(item);
          setQuery(getMaterialDisplayName(item, lang));
          setIsOpen(false);
          return;
        }
      }

      // STRICT CHECK: User typed something new that does NOT match stock!
      if (toast) {
        toast("❌ Only existing stock materials can be issued. New products cannot be added here.");
      }
      if (selectedItem) {
        setQuery(getMaterialDisplayName(selectedItem, lang));
      } else {
        setQuery('');
      }
      setIsOpen(false);
    } else if (e.key === 'Tab') {
      setIsOpen(false);
      if (selectedItem) {
        setQuery(getMaterialDisplayName(selectedItem, lang));
      } else {
        setQuery('');
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      if (selectedItem) setQuery(getMaterialDisplayName(selectedItem, lang));
      else setQuery('');
    }
  };

  const handlePick = item => {
    if (Number(item.stock || 0) <= 0) {
      if (toast) {
        toast(`⚠️ Cannot pick: "${getMaterialDisplayName(item, lang)}" is currently Out of Stock (0 ${item.uom || 'units'} available).`);
      }
      return;
    }
    onSelect(item);
    setQuery(getMaterialDisplayName(item, lang));
    setIsOpen(false);
  };

  const handleClear = e => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setQuery('');
    onSelect(null);
    setIsOpen(false);
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div ref={containerRef} className="combobox-container" style={{ position: 'relative', width: '100%' }}>
      <div className="combobox-input-wrap" style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
        <input
          id={id}
          ref={inputRef}
          type="text"
          className="in"
          style={{
            width: '100%',
            fontWeight: 700,
            fontSize: 13.5,
            paddingLeft: 34,
            paddingRight: selectedItem || query ? 36 : 14,
            borderColor: selectedItem ? '#3B82F6' : 'var(--line)',
            background: '#fff'
          }}
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />

        <div style={{ position: 'absolute', left: 10, pointerEvents: 'none', color: 'var(--mut)', display: 'flex' }}>
          <Ic n="search" s={16} />
        </div>

        <div style={{ position: 'absolute', right: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          {(query || selectedItem) && (
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={e => {
                e.preventDefault();
                e.stopPropagation();
                handleClear(e);
              }}
              onClick={handleClear}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--mut)',
                display: 'flex',
                alignItems: 'center',
                padding: 2
              }}
              title="Clear / Remove selection"
            >
              <Ic n="x" s={15} />
            </button>
          )}
        </div>
      </div>

      {/* Floating Dropdown directly below the input box */}
      {isOpen && query.trim().length > 0 && createPortal(
        <div
          ref={listRef}
          className="combobox-dropdown"
          style={{
            position: 'fixed',
            top: coords.top,
            bottom: coords.bottom,
            left: coords.left,
            width: coords.width,
            maxHeight: coords.maxHeight || 280,
            overflowY: 'auto',
            background: '#FFFFFF',
            border: '1.5px solid rgba(15, 23, 42, 0.16)',
            borderRadius: 12,
            boxShadow: '0 16px 38px -6px rgba(0, 31, 63, 0.25), 0 6px 16px rgba(0,0,0,0.08)',
            zIndex: 9999999
          }}
        >
          {/* Header: ONE ROW, THREE COLUMNS */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1.2fr 1fr',
            alignItems: 'center',
            gap: 12,
            padding: '8px 14px',
            background: '#F8FAFC',
            borderBottom: '1.5px solid var(--line)',
            fontSize: 11,
            fontWeight: 800,
            color: 'var(--mut)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em'
          }}>
            <span>Product</span>
            <span style={{ textAlign: 'center' }}>In Stock</span>
            <span style={{ textAlign: 'right' }}>Rate</span>
          </div>

          {/* Items */}
          {matchingItems.length === 0 ? (
            <div style={{ padding: '16px 14px', textAlign: 'center', color: '#DC2626', background: '#FEF2F2', fontSize: 12.5 }}>
              <div style={{ fontWeight: 800, marginBottom: 4 }}>⚠️ No matching stock materials found</div>
              <div style={{ color: '#991B1B', fontSize: 11.5 }}>
                Only existing materials with available stock can be issued.
              </div>
            </div>
          ) : (
            matchingItems.map((item, idx) => {
              const isActive = activeIndex === idx;
              const q = (query || '').trim().toLowerCase();
              const cleanQ = q.replace(/[^a-z0-9]/gi, '');
              const itemHsn = String(item.hsn || '').toLowerCase();
              const isHsnMatch = Boolean(
                q &&
                item.hsn &&
                (itemHsn.includes(q) || (cleanQ && itemHsn.replace(/[^a-z0-9]/gi, '').includes(cleanQ)))
              );

              const isOutOfStock = Number(item.stock || 0) <= 0;

              return (
                <div
                  key={item.id}
                  ref={el => (itemRefs.current[idx] = el)}
                  className={`combobox-item ${isActive ? 'active' : ''}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1.2fr 1fr',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                    borderBottom: '1px solid #F1F5F9',
                    background: isActive ? (isOutOfStock ? '#FEF2F2' : '#EFF6FF') : (isOutOfStock ? '#FAFAFA' : '#fff'),
                    opacity: isOutOfStock ? 0.72 : 1,
                    borderLeft: isActive ? (isOutOfStock ? '3.5px solid #DC2626' : '3.5px solid var(--navy)') : '3.5px solid transparent',
                    transition: 'all .12s ease'
                  }}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => handlePick(item)}
                >
                  {/* Column 1: Localized Product Name & matched HSN */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: isOutOfStock ? '#991B1B' : 'var(--ink)' }}>
                      {highlightMatch(lang === 'ta' && (item.nameTa || item.tamilName) ? (item.nameTa || item.tamilName) : item.name, query)}
                    </div>
                    {lang === 'ta' && item.name && (item.nameTa || item.tamilName) && (
                      <div style={{ fontSize: 11, color: 'var(--mut)', marginTop: 1 }}>
                        EN: {item.name} · {item.id}
                      </div>
                    )}
                    {lang !== 'ta' && (item.nameTa || item.tamilName) && (
                      <div style={{ fontSize: 11, color: '#B45309', marginTop: 1 }}>
                        தமிழ்: {item.nameTa || item.tamilName}
                      </div>
                    )}
                    {isHsnMatch && (
                      <div style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{
                          fontSize: 10.5,
                          fontWeight: 800,
                          background: '#FEF9C3',
                          color: '#854D0E',
                          border: '1px solid #FDE047',
                          padding: '1px 6px',
                          borderRadius: 4,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3
                        }}>
                          <span>HSN</span>
                          {highlightMatch(String(item.hsn), query)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Column 2: In Stock (Center) */}
                  <div style={{ textAlign: 'center' }}>
                    {isOutOfStock ? (
                      <span style={{
                        display: 'inline-block',
                        fontSize: 11,
                        fontWeight: 800,
                        background: '#FEF2F2',
                        color: '#DC2626',
                        border: '1.5px solid #FECACA',
                        padding: '3px 10px',
                        borderRadius: 6,
                        whiteSpace: 'nowrap'
                      }}>
                        Out of Stock (0)
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-block',
                        fontSize: 11.5,
                        fontWeight: 800,
                        background: '#ECFDF5',
                        color: '#065F46',
                        border: '1px solid #A7F3D0',
                        padding: '3px 10px',
                        borderRadius: 6,
                        whiteSpace: 'nowrap'
                      }}>
                        In Stock: {fmt(item.stock || 0)} {item.uom || 'NOS'}
                      </span>
                    )}
                  </div>

                  {/* Column 3: Rate in last column (Right) */}
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--navy)' }}>
                      {enableGst
                        ? ((item.rateWithoutGst ?? item.rate) > 0 ? `₹${item.rateWithoutGst ?? item.rate} / ${item.uom || 'Unit'}` : '-')
                        : ((item.rateWithGst || item.rate) > 0 ? `₹${item.rateWithGst || item.rate} / ${item.uom || 'Unit'}` : '-')
                      }
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
