import { useState } from 'react';
import Modal from './Modal';
import Ic from './Icon';

export default function SubCategoryModal({ subCategories, setSubCategories, onClose, toast }) {
  const [selectedCat, setSelectedCat] = useState('Steel');
  const [newSubCat, setNewSubCat] = useState('');

  const currentList = subCategories[selectedCat] || [];

  const handleAdd = () => {
    const val = newSubCat.trim();
    if (!val) return;
    if (currentList.some(s => s.toLowerCase() === val.toLowerCase())) {
      toast('Sub-category already exists in ' + selectedCat);
      return;
    }

    const updated = {
      ...subCategories,
      [selectedCat]: [...currentList, val]
    };
    setSubCategories(updated);
    setNewSubCat('');
    toast(`Added "${val}" to ${selectedCat}`);
  };

  const handleRemove = (subToRemove) => {
    const updated = {
      ...subCategories,
      [selectedCat]: currentList.filter(s => s !== subToRemove)
    };
    setSubCategories(updated);
    toast(`Removed "${subToRemove}"`);
  };

  return (
    <Modal
      title="Stock Sub-Categories Management"
      subtitle="Organize your inventory with customized sub-categories for faster filtering & reporting"
      size="wide"
      onClose={onClose}
    >
      <div>
        {/* Category Tabs */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {Object.keys(subCategories).map(cat => (
            <button
              key={cat}
              className={`chip ${selectedCat === cat ? 'on' : ''}`}
              onClick={() => setSelectedCat(cat)}
            >
              {cat} ({subCategories[cat]?.length || 0})
            </button>
          ))}
        </div>

        {/* Add Sub-category Input */}
        <div style={{ display: 'flex', gap: 10, background: 'var(--steelbg)', padding: 14, borderRadius: 12, marginBottom: 16 }}>
          <input
            className="in"
            style={{ flex: 1 }}
            placeholder={`Type new sub-category for ${selectedCat} (e.g. Binding Wire, Structural Steel...)`}
            value={newSubCat}
            onChange={e => setNewSubCat(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button className="btn gold" onClick={handleAdd}>
            <Ic n="plus" s={16} /> Add Sub-Category
          </button>
        </div>

        {/* Current Sub-Categories List */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 10 }}>
            Active Sub-Categories in {selectedCat}:
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {currentList.map(sc => (
              <div
                key={sc}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--line)',
                  background: '#fff',
                  fontWeight: 600,
                  fontSize: 13
                }}
              >
                <span>{sc}</span>
                <button
                  style={{ border: 0, background: 'none', color: 'var(--mut)', padding: 0, display: 'flex' }}
                  onClick={() => handleRemove(sc)}
                  title="Remove sub-category"
                >
                  <Ic n="x" s={14} />
                </button>
              </div>
            ))}
            {currentList.length === 0 && (
              <div className="mut">No sub-categories yet for {selectedCat}. Add one above!</div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
          <button className="btn pri" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}
