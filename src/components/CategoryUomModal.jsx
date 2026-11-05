import { useState } from 'react';
import Modal from './Modal';
import Ic from './Icon';

export default function CategoryUomModal({
  categories = [],
  setCategories,
  uoms = [],
  setUoms,
  items = [],
  setItems,
  onClose,
  toast
}) {
  const [tab, setTab] = useState('categories'); // 'categories' | 'uoms'

  // Category state
  const [newCat, setNewCat] = useState('');
  const [editingCat, setEditingCat] = useState(null); // oldName
  const [editCatVal, setEditCatVal] = useState('');

  // UoM state
  const [newUom, setNewUom] = useState('');
  const [editingUom, setEditingUom] = useState(null); // oldUnit
  const [editUomVal, setEditUomVal] = useState('');

  /* ── CATEGORY CRUD OPERATIONS ───────────────────────── */
  const handleAddCategory = (e) => {
    e?.preventDefault();
    const val = newCat.trim();
    if (!val) return;
    if (categories.some(c => c.toLowerCase() === val.toLowerCase())) {
      toast(`Category "${val}" already exists`);
      return;
    }
    const updated = [...categories, val];
    setCategories(updated);
    setNewCat('');
    toast(`Added category "${val}"`);
  };

  const handleStartEditCat = (catName) => {
    setEditingCat(catName);
    setEditCatVal(catName);
  };

  const handleSaveEditCat = (oldName) => {
    const val = editCatVal.trim();
    if (!val || val === oldName) {
      setEditingCat(null);
      return;
    }
    if (categories.some(c => c.toLowerCase() === val.toLowerCase() && c.toLowerCase() !== oldName.toLowerCase())) {
      toast(`Category "${val}" already exists`);
      return;
    }

    // 1. Update categories list
    const updatedCats = categories.map(c => c === oldName ? val : c);
    setCategories(updatedCats);

    // 2. Cascade rename across all existing items
    if (setItems && items.length > 0) {
      const updatedItems = items.map(item => item.cat === oldName ? { ...item, cat: val } : item);
      setItems(updatedItems);
    }

    setEditingCat(null);
    toast(`Renamed category to "${val}"`);
  };

  const handleDeleteCategory = (catName) => {
    const count = items.filter(i => i.cat === catName).length;
    const msg = count > 0
      ? `"${catName}" is assigned to ${count} stock items. Are you sure you want to delete this category?`
      : `Delete category "${catName}"?`;

    if (!confirm(msg)) return;

    const updated = categories.filter(c => c !== catName);
    setCategories(updated);
    toast(`Deleted category "${catName}"`);
  };

  /* ── UNIT OF MEASURE (UoM) CRUD OPERATIONS ─────────── */
  const handleAddUom = (e) => {
    e?.preventDefault();
    const val = newUom.trim().toUpperCase();
    if (!val) return;
    if (uoms.some(u => u.toUpperCase() === val)) {
      toast(`Unit "${val}" already exists`);
      return;
    }
    const updated = [...uoms, val];
    setUoms(updated);
    setNewUom('');
    toast(`Added unit of measure "${val}"`);
  };

  const handleStartEditUom = (uomVal) => {
    setEditingUom(uomVal);
    setEditUomVal(uomVal);
  };

  const handleSaveEditUom = (oldUnit) => {
    const val = editUomVal.trim().toUpperCase();
    if (!val || val === oldUnit) {
      setEditingUom(null);
      return;
    }
    if (uoms.some(u => u.toUpperCase() === val && u.toUpperCase() !== oldUnit.toUpperCase())) {
      toast(`Unit "${val}" already exists`);
      return;
    }

    // 1. Update UoMs list
    const updatedUoms = uoms.map(u => u === oldUnit ? val : u);
    setUoms(updatedUoms);

    // 2. Cascade rename across existing items
    if (setItems && items.length > 0) {
      const updatedItems = items.map(item => item.uom === oldUnit ? { ...item, uom: val } : item);
      setItems(updatedItems);
    }

    setEditingUom(null);
    toast(`Renamed unit to "${val}"`);
  };

  const handleDeleteUom = (uomVal) => {
    const count = items.filter(i => (i.uom || '').toUpperCase() === uomVal.toUpperCase()).length;
    const msg = count > 0
      ? `"${uomVal}" is used by ${count} stock items. Delete this unit?`
      : `Delete unit "${uomVal}"?`;

    if (!confirm(msg)) return;

    const updated = uoms.filter(u => u.toUpperCase() !== uomVal.toUpperCase());
    setUoms(updated);
    toast(`Deleted unit "${uomVal}"`);
  };

  return (
    <Modal
      title="Manage Categories &amp; Units of Measure"
      subtitle="Create, edit, and organize material categories and standard inventory units"
      size="wide"
      onClose={onClose}
    >
      <div>
        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: 6, borderBottom: '2px solid var(--line)', marginBottom: 20 }}>
          <button
            onClick={() => setTab('categories')}
            style={{
              border: 0,
              background: 'none',
              padding: '10px 18px',
              fontWeight: 800,
              fontSize: 13.5,
              cursor: 'pointer',
              color: tab === 'categories' ? 'var(--navy)' : 'var(--mut)',
              borderBottom: tab === 'categories' ? '3px solid var(--navy)' : '3px solid transparent',
              marginBottom: -2,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all .14s'
            }}
          >
            <Ic n="tag" s={16} />
            <span>Material Categories</span>
            <span style={{
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 12,
              background: tab === 'categories' ? 'var(--navy)' : 'var(--steelbg)',
              color: tab === 'categories' ? '#fff' : 'var(--ink)'
            }}>
              {categories.length}
            </span>
          </button>

          <button
            onClick={() => setTab('uoms')}
            style={{
              border: 0,
              background: 'none',
              padding: '10px 18px',
              fontWeight: 800,
              fontSize: 13.5,
              cursor: 'pointer',
              color: tab === 'uoms' ? 'var(--navy)' : 'var(--mut)',
              borderBottom: tab === 'uoms' ? '3px solid var(--navy)' : '3px solid transparent',
              marginBottom: -2,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all .14s'
            }}
          >
            <Ic n="box" s={16} />
            <span>Units of Measure (UoM)</span>
            <span style={{
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 12,
              background: tab === 'uoms' ? 'var(--navy)' : 'var(--steelbg)',
              color: tab === 'uoms' ? '#fff' : 'var(--ink)'
            }}>
              {uoms.length}
            </span>
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════
            TAB 1: CATEGORIES CRUD
            ══════════════════════════════════════════════════════════ */}
        {tab === 'categories' && (
          <div>
            {/* Create Form */}
            <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <input
                className="in"
                placeholder="Enter new category name (e.g. Structural Steel, Cement, Electrical)..."
                value={newCat}
                onChange={e => setNewCat(e.target.value)}
                style={{ flex: 1, fontSize: 13.5 }}
                autoFocus
              />
              <button
                type="submit"
                className="btn gold"
                style={{ whiteSpace: 'nowrap', gap: 6, fontWeight: 700 }}
              >
                <Ic n="plus" s={15} /> Add Category
              </button>
            </form>

            {/* Categories List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto', paddingRight: 4 }}>
              {categories.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--mut)', background: 'var(--steelbg)', borderRadius: 12 }}>
                  No categories added yet. Create one above.
                </div>
              ) : (
                categories.map(c => {
                  const itemCount = items.filter(i => i.cat === c).length;
                  const isEditing = editingCat === c;

                  return (
                    <div
                      key={c}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: '#fff',
                        border: '1px solid var(--line)',
                        borderRadius: 10,
                        gap: 12,
                        transition: 'border-color .15s'
                      }}
                    >
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: 8, flex: 1 }}>
                          <input
                            className="in"
                            value={editCatVal}
                            onChange={e => setEditCatVal(e.target.value)}
                            style={{ flex: 1, padding: '5px 10px', fontSize: 13 }}
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSaveEditCat(c);
                              if (e.key === 'Escape') setEditingCat(null);
                            }}
                          />
                          <button
                            className="btn sm gold"
                            onClick={() => handleSaveEditCat(c)}
                            style={{ padding: '4px 10px' }}
                          >
                            Save
                          </button>
                          <button
                            className="btn sm"
                            onClick={() => setEditingCat(null)}
                            style={{ padding: '4px 10px' }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy)' }}>
                              {c}
                            </span>
                            <span style={{
                              fontSize: 11,
                              padding: '2px 8px',
                              borderRadius: 12,
                              background: 'var(--steelbg)',
                              color: 'var(--mut)',
                              fontWeight: 600
                            }}>
                              {itemCount} {itemCount === 1 ? 'item' : 'items'}
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="btn sm"
                              onClick={() => handleStartEditCat(c)}
                              title="Edit Category"
                              style={{ padding: '5px 9px', fontSize: 12 }}
                            >
                              Edit
                            </button>
                            <button
                              className="btn sm"
                              onClick={() => handleDeleteCategory(c)}
                              title="Delete Category"
                              style={{ padding: '5px 8px', color: 'var(--red)', borderColor: '#fecdd3' }}
                            >
                              <Ic n="trash" s={14} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB 2: UNITS OF MEASURE (UoM) CRUD
            ══════════════════════════════════════════════════════════ */}
        {tab === 'uoms' && (
          <div>
            {/* Create Form */}
            <form onSubmit={handleAddUom} style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <input
                className="in"
                placeholder="Enter new unit symbol (e.g. MT, KGS, NOS, BDL, SQM, BAGS, PKT)..."
                value={newUom}
                onChange={e => setNewUom(e.target.value.toUpperCase())}
                style={{ flex: 1, fontSize: 13.5, textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontWeight: 700 }}
                autoFocus
              />
              <button
                type="submit"
                className="btn gold"
                style={{ whiteSpace: 'nowrap', gap: 6, fontWeight: 700 }}
              >
                <Ic n="plus" s={15} /> Add Unit
              </button>
            </form>

            {/* Units Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 10,
              maxHeight: 360,
              overflowY: 'auto',
              paddingRight: 4
            }}>
              {uoms.map(u => {
                const count = items.filter(i => (i.uom || '').toUpperCase() === u.toUpperCase()).length;
                const isEditing = editingUom === u;

                return (
                  <div
                    key={u}
                    style={{
                      background: '#fff',
                      border: '1px solid var(--line)',
                      borderRadius: 10,
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8
                    }}
                  >
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: 4, width: '100%' }}>
                        <input
                          className="in"
                          value={editUomVal}
                          onChange={e => setEditUomVal(e.target.value.toUpperCase())}
                          style={{ flex: 1, padding: '3px 6px', fontSize: 12, textTransform: 'uppercase' }}
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveEditUom(u);
                            if (e.key === 'Escape') setEditingUom(null);
                          }}
                        />
                        <button className="btn sm gold" onClick={() => handleSaveEditUom(u)} style={{ padding: '3px 7px', fontSize: 11 }}>
                          OK
                        </button>
                      </div>
                    ) : (
                      <>
                        <div>
                          <span style={{
                            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                            fontWeight: 800,
                            fontSize: 13.5,
                            color: 'var(--navy)',
                            background: 'var(--steelbg)',
                            padding: '2px 7px',
                            borderRadius: 6
                          }}>
                            {u}
                          </span>
                          {count > 0 && (
                            <span style={{ fontSize: 10.5, color: 'var(--mut)', marginLeft: 6 }}>
                              {count} items
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            className="btn sm"
                            onClick={() => handleStartEditUom(u)}
                            title="Edit Unit"
                            style={{ padding: '3px 6px', fontSize: 11 }}
                          >
                            Edit
                          </button>
                          <button
                            className="btn sm"
                            onClick={() => handleDeleteUom(u)}
                            title="Delete Unit"
                            style={{ padding: '3px 6px', color: 'var(--red)', borderColor: '#fecdd3' }}
                          >
                            <Ic n="trash" s={13} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
