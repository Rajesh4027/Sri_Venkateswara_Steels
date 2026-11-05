import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Ic from './Icon';
import { formatCustomerName } from '../utils';

function highlightMatch(text, query) {
  if (!query || !text) return text;
  const q = String(query).trim();
  if (!q) return text;
  const idx = String(text).toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {String(text).slice(0, idx)}
      <mark style={{ background: '#FEF08A', color: '#854D0E', padding: '0 2px', borderRadius: 3, fontWeight: 800 }}>
        {String(text).slice(idx, idx + q.length)}
      </mark>
      {String(text).slice(idx + q.length)}
    </>
  );
}

/**
 * CustomerAutofillInput
 * Provides intelligent customer autofill for both Phone Number and Customer Name.
 * - Phone number is first preference search
 * - Shows dropdown of existing customer records
 * - On select, autofills all details (name, phone, address, vehicle, payment)
 * - Automatically moves focus to Material To Issue input box
 */
export default function CustomerAutofillInput({
  field = 'phone', // 'phone' | 'cust'
  label,
  value = '',
  placeholder = '',
  required = false,
  customers = [],
  onChange,
  onSelectCustomer,
  inputStyle = {},
  containerStyle = {}
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 340, maxHeight: 280, openUpward: false });

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const itemRefs = useRef([]);

  // Compute matching customers
  const matchingCustomers = useMemo(() => {
    const q = (value || '').trim().toLowerCase();
    if (!q || q.length < 1) return [];

    const cleanQ = q.replace(/[^0-9a-z]/gi, '');

    // Score and filter customers
    const scored = [];
    customers.forEach(c => {
      if (!c) return;
      const phone = (c.phone || '').trim();
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const cust = (c.cust || '').trim();
      const address = (c.address || '').trim();
      const veh = (c.veh || '').trim();

      const phoneMatches = phone.toLowerCase().includes(q) || (cleanQ && cleanPhone.includes(cleanQ));
      const nameMatches = cust.toLowerCase().includes(q);
      const vehMatches = veh.toLowerCase().includes(q);
      const addressMatches = address.toLowerCase().includes(q);

      if (phoneMatches || nameMatches || vehMatches || addressMatches) {
        // Priority scoring:
        // If field is 'phone', phone match gets highest priority!
        // If field is 'cust', name match gets highest priority!
        let score = 0;
        if (field === 'phone') {
          if (cleanPhone.startsWith(cleanQ)) score += 100;
          else if (phoneMatches) score += 80;
          else if (nameMatches) score += 50;
          else score += 20;
        } else {
          if (cust.toLowerCase().startsWith(q)) score += 100;
          else if (nameMatches) score += 80;
          else if (phoneMatches) score += 60;
          else score += 20;
        }
        scored.push({ customer: c, score });
      }
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.map(s => s.customer).slice(0, 8); // Top 8 matches
  }, [value, customers, field]);

  const updatePosition = () => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpward = spaceBelow < 220 && spaceAbove > spaceBelow;
    const availableSpace = openUpward ? spaceAbove - 16 : spaceBelow - 16;
    const maxHeight = Math.max(140, Math.min(280, availableSpace));
    const width = Math.max(rect.width, 360);
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
  }, [isOpen, matchingCustomers.length]);

  useEffect(() => {
    if (isOpen && itemRefs.current[activeIndex]) {
      itemRefs.current[activeIndex].scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, isOpen]);

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
    };
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, [isOpen]);

  const handleInputChange = e => {
    const input = e.target;
    let val = input.value;
    if (field === 'cust') {
      const selStart = input.selectionStart;
      const selEnd = input.selectionEnd;
      val = formatCustomerName(val);
      onChange(val);
      requestAnimationFrame(() => {
        if (input && input.setSelectionRange) {
          input.setSelectionRange(selStart, selEnd);
        }
      });
    } else {
      onChange(val);
    }
    if (val.trim().length > 0) {
      setIsOpen(true);
      setActiveIndex(0);
      updatePosition();
    } else {
      setIsOpen(false);
    }
  };

  const handleSelect = cust => {
    setIsOpen(false);
    onSelectCustomer({
      ...cust,
      cust: formatCustomerName(cust.cust || '')
    });
  };

  const handleKeyDown = e => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        if (matchingCustomers.length > 0) {
          setIsOpen(true);
          setActiveIndex(0);
          updatePosition();
        }
        return;
      }
      if (matchingCustomers.length > 0) {
        setActiveIndex(prev => (prev + 1) % matchingCustomers.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        if (matchingCustomers.length > 0) {
          setIsOpen(true);
          setActiveIndex(matchingCustomers.length - 1);
          updatePosition();
        }
        return;
      }
      if (matchingCustomers.length > 0) {
        setActiveIndex(prev => (prev - 1 + matchingCustomers.length) % matchingCustomers.length);
      }
    } else if (e.key === 'Enter') {
      if (isOpen && matchingCustomers.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        const chosen = matchingCustomers[activeIndex] || matchingCustomers[0];
        if (chosen) {
          handleSelect(chosen);
        }
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', ...containerStyle }}>
      {label && (
        <label className="fl" style={{ marginBottom: 4 }}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{label} {required ? '*' : ''}</span>
            {field === 'phone' && (
              <span style={{ fontSize: 10.5, fontWeight: 700, color: '#2563EB', background: '#EFF6FF', padding: '1px 6px', borderRadius: 4 }}>
                ⚡ Auto-Fetch
              </span>
            )}
          </span>
        </label>
      )}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          ref={inputRef}
          className="in"
          type={field === 'phone' ? 'tel' : 'text'}
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onFocus={() => {
            if ((value || '').trim().length > 0 && matchingCustomers.length > 0) {
              setIsOpen(true);
              updatePosition();
            }
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          style={{
            width: '100%',
            fontWeight: 700,
            ...inputStyle
          }}
        />

        {value && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              onChange('');
              setIsOpen(false);
              if (inputRef.current) inputRef.current.focus();
            }}
            style={{
              position: 'absolute',
              right: 8,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--mut)',
              display: 'flex',
              alignItems: 'center',
              padding: 2
            }}
            title="Clear field"
          >
            <Ic n="x" s={14} />
          </button>
        )}
      </div>

      {/* Floating Suggestions Dropdown */}
      {isOpen && matchingCustomers.length > 0 && createPortal(
        <div
          ref={listRef}
          style={{
            position: 'fixed',
            top: coords.top,
            bottom: coords.bottom,
            left: coords.left,
            width: coords.width,
            maxHeight: coords.maxHeight,
            overflowY: 'auto',
            background: '#FFFFFF',
            border: '1.5px solid #3B82F6',
            borderRadius: 10,
            boxShadow: '0 10px 25px -3px rgba(15, 23, 42, 0.2), 0 4px 6px -2px rgba(15, 23, 42, 0.05)',
            zIndex: 9999999,
            boxSizing: 'border-box'
          }}
        >
          {/* Header */}
          <div style={{
            padding: '7px 12px',
            background: '#F1F5F9',
            borderBottom: '1px solid #E2E8F0',
            fontSize: 11,
            fontWeight: 800,
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            letterSpacing: '.02em'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Ic n="user" s={13} /> Matching Customers ({matchingCustomers.length})
            </span>
            <span style={{ fontSize: 10, color: '#64748B', fontWeight: 600 }}>
              ↑↓ Enter or Click to Autofill
            </span>
          </div>

          {/* Customer list items */}
          {matchingCustomers.map((c, idx) => {
            const isActive = idx === activeIndex;
            return (
              <div
                key={idx}
                ref={el => (itemRefs.current[idx] = el)}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => handleSelect(c)}
                style={{
                  padding: '10px 14px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #F1F5F9',
                  background: isActive ? '#EFF6FF' : '#FFFFFF',
                  borderLeft: isActive ? '3.5px solid #2563EB' : '3.5px solid transparent',
                  transition: 'background 0.12s ease'
                }}
              >
                {/* Row 1: Phone & Customer Name */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      fontWeight: 900,
                      fontSize: 13,
                      color: field === 'phone' ? '#1D4ED8' : 'var(--navy)',
                      letterSpacing: '.02em'
                    }}>
                      {c.phone ? highlightMatch(c.phone, value) : 'No Phone'}
                    </span>
                    <span style={{ color: '#94A3B8', fontSize: 11 }}>•</span>
                    <span style={{
                      fontWeight: 800,
                      fontSize: 13,
                      color: field === 'cust' ? '#1D4ED8' : 'var(--ink)'
                    }}>
                      {highlightMatch(c.cust || 'Unnamed Customer', value)}
                    </span>
                  </div>

                  {c.pay && (
                    <span style={{
                      fontSize: 10,
                      fontWeight: 800,
                      background: '#F1F5F9',
                      color: '#475569',
                      padding: '1px 6px',
                      borderRadius: 4,
                      border: '1px solid #CBD5E1'
                    }}>
                      {c.pay}
                    </span>
                  )}
                </div>

                {/* Row 2: Address & Vehicle Details */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: 'var(--mut)', flexWrap: 'wrap' }}>
                  {c.address && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.address}>
                      📍 {highlightMatch(c.address, value)}
                    </span>
                  )}
                  {c.veh && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      fontWeight: 700,
                      background: '#FEF3C7',
                      color: '#92400E',
                      padding: '1px 6px',
                      borderRadius: 4,
                      border: '1px solid #FDE68A',
                      fontSize: 10.5
                    }}>
                      🚗 {highlightMatch(c.veh, value)}
                    </span>
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
