import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Ic from './Icon';
import { fmt, getMaterialDisplayName, inferTamilName, inferEnglishName, formatTitleCase, getAppZoomFactor } from '../utils';
import { useTranslation } from '../context/LanguageContext';

/**
 * Common filter helper for inward material searches (English and Tamil)
 */
function filterInwardMatches(query, items = []) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return [];
  const inferredEn = inferEnglishName(q).toLowerCase();
  return items.filter(it => {
    const explicitTa = (it.nameTa || it.tamilName || '').toLowerCase();
    const inferredTa = inferTamilName(it.name || '').toLowerCase();
    const nTa = `${explicitTa} ${inferredTa}`.trim();
    const n = (it.name || '').toLowerCase();
    const code = (it.id || '').toLowerCase();
    const hsn = (it.hsn || '').toLowerCase();
    return (
      n.includes(q) ||
      nTa.includes(q) ||
      code.includes(q) ||
      hsn.includes(q) ||
      (inferredEn && n.includes(inferredEn))
    );
  });
}

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
 * - Clean 3-part layout: Left=Stock Name (EN/TA), Center=Stock Quantity, Right=Amount/Rate (No SVS/HSN)
 * - Always positioned directly below/above the input box using portal with zoom compensation
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
  const [coords, setCoords] = useState({ top: -9999, left: -9999, width: 340, maxHeight: 260 });

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
    return filterInwardMatches(query, items);
  }, [query, items]);

  // Reposition floating dropdown dynamically with viewport collision detection
  const updatePosition = () => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    // Prefer opening downward directly under input; only open upward if space below is very small (< 100px)
    const openUpward = spaceBelow < 100 && spaceAbove > spaceBelow;
    const availableSpace = openUpward ? spaceAbove - 12 : spaceBelow - 12;
    const maxHeight = Math.max(120, Math.min(260, availableSpace));
    const width = Math.max(rect.width, 420);
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 12));

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

  const processQueryInput = (val, isComposing = false) => {
    const formattedVal = isComposing ? val : formatTitleCase(val);
    setQuery(formattedVal);
    const trimmed = formattedVal.trim();

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

    // If already chosen from stock and text matches, do not show dropdown
    if (row.id && trimmed.toLowerCase() === (row.name || '').trim().toLowerCase()) {
      setIsOpen(false);
      return;
    }

    // Filter matching existing items
    if (trimmed.length > 0) {
      const matches = filterInwardMatches(trimmed, items);
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

  const handleInputChange = e => {
    processQueryInput(e.target.value, !!e.nativeEvent?.isComposing);
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

  const handleClear = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setQuery('');
    setIsOpen(false);
    onClear();
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
          onFocus={() => {
            // If already chosen from stock and matches, do not show dropdown
            if (row.id && query.trim().toLowerCase() === (row.name || '').trim().toLowerCase()) {
              setIsOpen(false);
              return;
            }
            if (query.trim()) {
              const matches = filterInwardMatches(query.trim(), items);
              if (matches.length > 0) {
                setIsOpen(true);
                updatePosition();
              }
            }
          }}
          onCompositionEnd={e => {
            processQueryInput(e.target.value, false);
          }}
          onBlur={() => {
            if (query.trim()) {
              const formatted = formatTitleCase(query.trim());
              if (formatted !== query) {
                setQuery(formatted);
                if (!row.id) onAddNew(formatted);
              }
            }
            setTimeout(() => setIsOpen(false), 200);
          }}
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
              onMouseDown={e => {
                e.preventDefault();
                e.stopPropagation();
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
              title="Clear / Type different material"
            >
              <Ic n="x" s={14} />
            </button>
          )}
        </div>
      </div>

      {/* Dropdown portaled to body with zoom compensation: never clipped by tables */}
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
            border: '1.5px solid rgba(15, 23, 42, 0.18)',
            borderRadius: 12,
            boxShadow: '0 16px 38px -6px rgba(0, 31, 63, 0.28), 0 6px 16px rgba(0,0,0,0.1)',
            zIndex: 9999999
          }}
        >
          {/* Header: Left=Product, Center=Stock, Right=Rate */}
          <div style={{
            padding: '7px 14px',
            background: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            fontSize: 11,
            fontWeight: 700,
            color: '#64748B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ flex: '1 1 auto' }}>📦 MATERIAL / பொருள்</span>
            <span style={{ flex: '0 0 auto', textAlign: 'center', width: 120 }}>STOCK / இருப்பு</span>
            <span style={{ flex: '0 0 auto', textAlign: 'right', width: 80 }}>RATE / விலை</span>
          </div>

          {/* Matching Existing Stock Items */}
          {matchingItems.map((item, idx) => {
            const isActive = activeIndex === idx;
            const tamilText = item.nameTa || item.tamilName || inferTamilName(item.name) || '';

            return (
              <div
                key={item.id || idx}
                ref={el => (itemRefs.current[idx] = el)}
                className={`combobox-item ${isActive ? 'active' : ''}`}
                style={{
                  padding: '9px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  borderBottom: '1px solid #F1F5F9',
                  background: isActive ? '#EFF6FF' : '#fff',
                  borderLeft: isActive ? '3.5px solid #2563EB' : '3.5px solid transparent',
                  transition: 'background 0.1s ease'
                }}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => handlePickItem(item)}
              >
                {/* 1. Left: Product Name (English & Tamil) - NO SVS/HSN */}
                <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {highlightMatch(item.name, query)}
                  </div>
                  {tamilText && (
                    <div style={{
                      fontSize: 11.5,
                      color: '#B45309',
                      fontWeight: 600,
                      marginTop: 2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontFamily: "'Mukta Malar', sans-serif"
                    }}>
                      <span style={{ fontSize: 9.5, background: '#FEF3C7', color: '#92400E', padding: '1px 4px', borderRadius: 3, fontWeight: 800 }}>தமிழ்</span>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {highlightMatch(tamilText, query)}
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. Center: Stock in Hand */}
                <div style={{ flex: '0 0 auto', textAlign: 'center', width: 120 }}>
                  <span style={{
                    display: 'inline-block',
                    fontSize: 11.5,
                    fontWeight: 700,
                    background: (item.stock || 0) > 0 ? '#ECFDF5' : '#F1F5F9',
                    color: (item.stock || 0) > 0 ? '#065F46' : '#64748B',
                    border: (item.stock || 0) > 0 ? '1px solid #A7F3D0' : '1px solid #E2E8F0',
                    padding: '2px 8px',
                    borderRadius: 6,
                    whiteSpace: 'nowrap'
                  }}>
                    Stock: {fmt(item.stock || 0)} {item.uom || 'NOS'}
                  </span>
                </div>

                {/* 3. Right: Amount / Rate */}
                <div style={{ flex: '0 0 auto', textAlign: 'right', width: 80 }}>
                  {item.rate > 0 ? (
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#1E3A8A' }}>
                      ₹{item.rate}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>
                      —
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
  onClear,
  placeholder = "தமிழில் பொருள் பெயர்..."
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(row.nameTa || '');
  const [activeIndex, setActiveIndex] = useState(0);
  const [coords, setCoords] = useState({ top: -9999, left: -9999, width: 340, maxHeight: 260 });

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
    return filterInwardMatches(query, items);
  }, [query, items]);

  const updatePosition = () => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    // Prefer opening downward directly under input; only open upward if space below is very small (< 100px)
    const openUpward = spaceBelow < 100 && spaceAbove > spaceBelow;
    const availableSpace = openUpward ? spaceAbove - 12 : spaceBelow - 12;
    const maxHeight = Math.max(120, Math.min(260, availableSpace));
    const width = Math.max(rect.width, 420);
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 12));

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

  const processTamilInput = val => {
    setQuery(val);
    onChangeTamilName(val);
    const trimmed = val.trim();

    // If already chosen from stock and text matches, do not show dropdown
    if (row.id && trimmed.toLowerCase() === (row.nameTa || '').trim().toLowerCase()) {
      setIsOpen(false);
      return;
    }

    if (trimmed) {
      const matches = filterInwardMatches(trimmed, items);
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

  const handleInputChange = e => {
    processTamilInput(e.target.value);
  };

  const handlePickItem = item => {
    const pickTa = item.nameTa || item.tamilName || inferTamilName(item.name) || '';
    setQuery(pickTa);
    setIsOpen(false);
    if (onSelectExisting) {
      onSelectExisting({
        ...item,
        nameTa: pickTa
      });
    }
  };

  const handleClear = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setQuery('');
    setIsOpen(false);
    if (onClear) {
      onClear();
    } else {
      onChangeTamilName('');
    }
  };

  const handleKeyDown = e => {
    if (e.key === 'ArrowDown') {
      if (!isOpen && matchingItems.length > 0) {
        setIsOpen(true);
        setActiveIndex(0);
        updatePosition();
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
          paddingRight: (query || row.nameTa) ? 26 : 8,
          borderColor: row.nameTa ? '#FCD34D' : 'var(--line)',
          background: row.nameTa ? '#FFFDF5' : '#fff'
        }}
        placeholder={placeholder}
        value={query}
        onChange={handleInputChange}
        onFocus={() => {
          // If already chosen from stock, do not show dropdown
          if (row.id && query.trim().toLowerCase() === (row.nameTa || '').trim().toLowerCase()) {
            setIsOpen(false);
            return;
          }
          if (query.trim()) {
            const matches = filterInwardMatches(query.trim(), items);
            if (matches.length > 0) {
              setIsOpen(true);
              updatePosition();
            }
          }
        }}
        onBlur={() => {
          setTimeout(() => setIsOpen(false), 200);
        }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      {(query || row.nameTa) && (
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={e => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={handleClear}
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
          title="Clear / Remove material"
        >
          <Ic n="x" s={12} />
        </button>
      )}

      {/* Portal to document.body: NEVER gets clipped or hidden by table scroll container */}
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
            border: '1.5px solid rgba(15, 23, 42, 0.18)',
            borderRadius: 12,
            boxShadow: '0 16px 38px -6px rgba(0, 31, 63, 0.28), 0 6px 16px rgba(0,0,0,0.1)',
            zIndex: 9999999
          }}
        >
          {/* Header: Left=Tamil Material, Center=Stock, Right=Rate */}
          <div style={{
            padding: '7px 14px',
            background: '#FFFBEB',
            borderBottom: '1px solid #FDE68A',
            fontSize: 11,
            fontWeight: 700,
            color: '#92400E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ flex: '1 1 auto' }}>🇮🇳 தமிழ் பொருள் பரிந்துரை</span>
            <span style={{ flex: '0 0 auto', textAlign: 'center', width: 120 }}>இருப்பு (STOCK)</span>
            <span style={{ flex: '0 0 auto', textAlign: 'right', width: 80 }}>விலை (RATE)</span>
          </div>

          {/* Items: Left=Name, Center=Stock, Right=Rate (NO SVS/HSN) */}
          {matchingItems.map((item, idx) => {
            const isActive = activeIndex === idx;
            const tamilText = item.nameTa || item.tamilName || inferTamilName(item.name) || '';

            return (
              <div
                key={item.id || idx}
                ref={el => (itemRefs.current[idx] = el)}
                className={`combobox-item ${isActive ? 'active' : ''}`}
                style={{
                  padding: '9px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  borderBottom: '1px solid #F1F5F9',
                  background: isActive ? '#FEF3C7' : '#fff',
                  borderLeft: isActive ? '3.5px solid #D97706' : '3.5px solid transparent',
                  transition: 'background 0.1s ease'
                }}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => handlePickItem(item)}
              >
                {/* 1. Left: Tamil name (highlighted) and English name below - NO SVS code, NO HSN */}
                <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                  <div style={{
                    fontWeight: 700,
                    fontSize: 13,
                    color: '#92400E',
                    fontFamily: "'Mukta Malar', 'Plus Jakarta Sans', sans-serif",
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {highlightMatch(tamilText || item.name, query)}
                  </div>
                  {item.name && (
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      EN: {item.name}
                    </div>
                  )}
                </div>

                {/* 2. Center: Stock in Hand */}
                <div style={{ flex: '0 0 auto', textAlign: 'center', width: 120 }}>
                  <span style={{
                    display: 'inline-block',
                    fontSize: 11.5,
                    fontWeight: 700,
                    background: (item.stock || 0) > 0 ? '#ECFDF5' : '#F1F5F9',
                    color: (item.stock || 0) > 0 ? '#065F46' : '#64748B',
                    border: (item.stock || 0) > 0 ? '1px solid #A7F3D0' : '1px solid #E2E8F0',
                    padding: '2px 8px',
                    borderRadius: 6,
                    whiteSpace: 'nowrap'
                  }}>
                    Stock: {fmt(item.stock || 0)} {item.uom || 'NOS'}
                  </span>
                </div>

                {/* 3. Right: Amount / Rate */}
                <div style={{ flex: '0 0 auto', textAlign: 'right', width: 80 }}>
                  {item.rate > 0 ? (
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#1E3A8A' }}>
                      ₹{item.rate}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>
                      —
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
  const [coords, setCoords] = useState({ top: -9999, left: -9999, width: 440 });
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
    const inferredEn = inferEnglishName(q).toLowerCase();
    return items.filter(it => {
      const explicitTa = (it.nameTa || it.tamilName || '').toLowerCase();
      const inferredTa = inferTamilName(it.name || '').toLowerCase();
      const nTa = `${explicitTa} ${inferredTa}`.trim();
      const n = (it.name || '').toLowerCase();
      const code = (it.id || '').toLowerCase();
      const hsn = String(it.hsn || '').toLowerCase();
      const cleanHsn = hsn.replace(/[^a-z0-9]/gi, '');

      return (
        n.includes(q) ||
        nTa.includes(q) ||
        code.includes(q) ||
        hsn.includes(q) ||
        (cleanQ && cleanHsn && cleanHsn.includes(cleanQ)) ||
        (inferredEn && n.includes(inferredEn))
      );
    });
  }, [query, items]);

  // Dynamically position dropdown with viewport boundary & collision detection
  const updatePosition = () => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpward = spaceBelow < 120 && spaceAbove > spaceBelow;
    const availableSpace = openUpward ? spaceAbove - 12 : spaceBelow - 12;
    const maxHeight = Math.max(120, Math.min(280, availableSpace));
    const width = Math.max(rect.width, 460);
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 12));

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

  const processQueryInput = val => {
    setQuery(val);
    const trimmed = val.trim();

    // When user backspaces / deletes all text to remove product:
    if (!trimmed) {
      onSelect(null);
      setIsOpen(false);
      return;
    }

    // If already chosen from stock and text matches, do not show dropdown
    if (selectedId && trimmed.toLowerCase() === (itemDisplayName || '').trim().toLowerCase()) {
      setIsOpen(false);
      return;
    }

    setIsOpen(true);
    setActiveIndex(0);
    updatePosition();
  };

  const handleInputChange = e => {
    processQueryInput(e.target.value);
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
          onFocus={() => {
            // If already chosen from stock, do not show dropdown
            if (selectedId && query.trim().toLowerCase() === (itemDisplayName || '').trim().toLowerCase()) {
              setIsOpen(false);
              return;
            }
            if (query.trim().length > 0) {
              setIsOpen(true);
              updatePosition();
            }
          }}
          onBlur={() => {
            setTimeout(() => setIsOpen(false), 200);
          }}
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

      {/* Floating Suggestions Dropdown directly beneath the input */}
      {isOpen && query.trim().length > 0 && (
        <div
          ref={listRef}
          className="combobox-dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            width: '100%',
            minWidth: 460,
            maxWidth: 'min(580px, 95vw)',
            maxHeight: 280,
            overflowY: 'auto',
            background: '#FFFFFF',
            border: '1.5px solid rgba(15, 23, 42, 0.18)',
            borderRadius: 12,
            boxShadow: '0 16px 38px -6px rgba(0, 31, 63, 0.28), 0 6px 16px rgba(0,0,0,0.1)',
            zIndex: 999999,
            boxSizing: 'border-box'
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
                  {/* Column 1: Product Name & Tamil Name (NO SVS/HSN) */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: isOutOfStock ? '#991B1B' : 'var(--ink)' }}>
                      {highlightMatch(lang === 'ta' ? (item.nameTa || item.tamilName || inferTamilName(item.name) || item.name) : item.name, query)}
                    </div>
                    {lang === 'ta' && (item.nameTa || item.tamilName || inferTamilName(item.name)) && (
                      <div style={{ fontSize: 11, color: 'var(--mut)', marginTop: 1 }}>
                        EN: {item.name}
                      </div>
                    )}
                    {lang !== 'ta' && (item.nameTa || item.tamilName || inferTamilName(item.name)) && (
                      <div style={{ fontSize: 11, color: '#B45309', marginTop: 1 }}>
                        தமிழ்: {item.nameTa || item.tamilName || inferTamilName(item.name)}
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
        </div>
      )}
    </div>
  );
}
