import { useState, useMemo } from 'react';
import { fmt, inr, dt, pct, getMaterialDisplayName, inferTamilName } from '../utils';
import Ic from '../components/Icon';
import Pill from '../components/Pill';
import Modal from '../components/Modal';
import { useLanguage } from '../context/LanguageContext';

export default function ItemDrawer({
  it,
  setItems,
  items,
  inwardInvoices = [],
  categories = [],
  uoms = [],
  onClose,
  goBill,
  toast
}) {
  const { lang } = useLanguage();
  const [qty, setQty] = useState('');
  const [editingMeta, setEditingMeta] = useState(false);
  const [name, setName] = useState(it.name || '');
  const [nameTa, setNameTa] = useState(it.nameTa || inferTamilName(it.name || ''));
  const [cat, setCat] = useState(it.cat || 'Steel');
  const [hsn, setHsn] = useState(it.hsn || '');
  const [uom, setUom] = useState(it.uom || 'NOS');
  const [rate, setRate] = useState(it.rate || '');
  const [gst, setGst] = useState((it.gst !== undefined && it.gst !== null && !isNaN(it.gst)) ? Number(it.gst) : 18);
  const [min, setMin] = useState(it.min || 0);

  // 6-digit code Delete state in Drawer
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteCode, setDeleteCode] = useState('');
  const [typedCode, setTypedCode] = useState('');

  // Receipts from manual inward invoices
  const combinedHist = useMemo(() => {
    const hits = [];
    inwardInvoices.forEach(inv => {
      (inv.items || []).forEach(row => {
        if (row.id === it.id || row.name.toUpperCase() === it.name.toUpperCase()) {
          hits.push({
            d: inv.date,
            v: inv.supplier,
            q: row.qty,
            u: row.uom,
            inv: inv.inv,
            billImage: inv.billImage
          });
        }
      });
    });
    return hits.slice(0, 8);
  }, [inwardInvoices, it]);

  const upd = p => setItems(items.map(x => x.id === it.id ? { ...x, ...p } : x));

  const saveMeta = () => {
    if (!name.trim()) {
      toast('Material name cannot be empty');
      return;
    }
    const normName = name.trim().toUpperCase();
    upd({
      name: normName,
      nameTa: nameTa.trim() || inferTamilName(normName),
      cat,
      hsn: hsn.trim(),
      uom,
      rate: +rate || 0,
      gst: (gst !== undefined && gst !== '' && !isNaN(gst)) ? Number(gst) : 18,
      min: +min || 0
    });
    setEditingMeta(false);
    toast('Material details and pricing updated!');
  };

  const handleStartDelete = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setDeleteCode(code);
    setTypedCode('');
    setConfirmDelete(true);
  };

  const handleConfirmDelete = () => {
    if (typedCode.trim() !== deleteCode) {
      toast('Verification code does not match!');
      return;
    }
    const delName = it.name;
    setItems(items.filter(x => x.id !== it.id));
    setConfirmDelete(false);
    onClose();
    toast(`Material ${delName} deleted successfully.`);
  };

  return (
    <div>
      <div className="shade" onClick={onClose} />
      <aside className="dr" aria-label="Item details">
        {/* Header */}
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
              <span className="mut" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontWeight: 700 }}>{it.id}</span>
              <span className="tag-subcat">{it.cat}</span>
              {it.hsn && <span className="tag-hsn">HSN {it.hsn}</span>}
            </div>
            <h2 style={{ wordBreak: 'break-word', margin: '4px 0 4px' }}>{getMaterialDisplayName(it, lang)}</h2>
            {lang === 'ta' && it.name && it.nameTa && (
              <div style={{ fontSize: 12, color: 'var(--mut)', marginBottom: 4 }}>• EN: {it.name}</div>
            )}
            {lang === 'en' && it.nameTa && (
              <div style={{ fontSize: 12, color: '#B45309', marginBottom: 4 }}>• தமிழ்: {it.nameTa}</div>
            )}
            <Pill s={it.status} />
          </div>
          <button className="ib" aria-label="Close" onClick={onClose}>
            <Ic n="x" />
          </button>
        </div>

        {/* Stock Level Display */}
        <div style={{ margin: '20px 0 6px' }}>
          <span className="big">{fmt(it.stock)}</span>{' '}
          <span className="mut" style={{ fontWeight: 700, fontSize: 16 }}>{it.uom} available</span>
        </div>
        <div className={'bar ' + it.status}>
          <i style={{ width: pct(it) + '%' }} />
        </div>

        {it.status !== 'ok' && (
          <p className="warn" style={{ marginTop: 10 }}>
            {it.status === 'out' ? 'Out of stock.' : 'Below the minimum level of ' + fmt(it.min) + '.'} Reorder soon.
          </p>
        )}

        {/* Metrics Grid */}
        <div className="st" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          <div>
            <small>Total Received</small>
            <b>{fmt(it.recv)} {it.uom}</b>
          </div>
          <div>
            <small>Total Issued</small>
            <b>{fmt(it.recv - it.stock)} {it.uom}</b>
          </div>
          <div>
            <small>In Stock Balance</small>
            <b style={{ color: it.status === 'out' ? 'var(--red)' : 'var(--navy)' }}>{fmt(it.stock)} {it.uom}</b>
          </div>
          <div>
            <small>Without GST Rate</small>
            <b style={{ color: 'var(--ink)' }}>{inr(it.rate || 0)}</b>
          </div>
          <div>
            <small>GST Tax %</small>
            <b>{(it.gst !== undefined && it.gst !== null && !isNaN(it.gst)) ? it.gst : 18}%</b>
          </div>
          <div>
            <small>With GST Rate</small>
            <b style={{ color: 'var(--navy)' }}>
              {inr(+((Number(it.rate) || 0) * (1 + ((it.gst !== undefined && it.gst !== null && !isNaN(it.gst)) ? Number(it.gst) : 18) / 100)).toFixed(2))}
            </b>
          </div>
        </div>

        {/* Full Material Edit & Rate Configuration */}
        <div style={{ background: 'var(--steelbg)', padding: 14, borderRadius: 12, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>
              Edit Material Details &amp; Pricing
            </span>
            <button
              className="btn sm"
              style={{ fontSize: 11, padding: '3px 9px' }}
              onClick={() => {
                setName(it.name || '');
                setNameTa(it.nameTa || inferTamilName(it.name || ''));
                setCat(it.cat || 'Steel');
                setHsn(it.hsn || '');
                setUom(it.uom || 'NOS');
                setRate(it.rate || '');
                setGst((it.gst !== undefined && it.gst !== null && !isNaN(it.gst)) ? Number(it.gst) : 18);
                setMin(it.min || 0);
                setEditingMeta(!editingMeta);
              }}
            >
              {editingMeta ? 'Cancel' : 'Edit Details'}
            </button>
          </div>

          {editingMeta ? (
            <div style={{ marginTop: 12 }}>
              <div className="two" style={{ marginBottom: 8, gap: 10 }}>
                <label className="fl" style={{ marginBottom: 0 }}>
                  <span>Material Name (EN) *</span>
                  <input
                    className="in"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Material Description"
                  />
                </label>
                <label className="fl" style={{ marginBottom: 0 }}>
                  <span>Tamil Name (தமிழ்)</span>
                  <input
                    className="in"
                    style={{ fontFamily: "'Mukta Malar', 'Plus Jakarta Sans', sans-serif" }}
                    value={nameTa}
                    onChange={e => setNameTa(e.target.value)}
                    placeholder="தமிழில் பெயர்"
                  />
                </label>
              </div>

              <div className="two" style={{ marginBottom: 8, gap: 10 }}>
                <label className="fl" style={{ marginBottom: 0 }}>
                  <span>Category</span>
                  <select
                    className="in"
                    value={cat}
                    onChange={e => setCat(e.target.value)}
                  >
                    {(categories.length > 0 ? categories : ['Steel', 'Aggregates', 'Shuttering', 'Tools & Hardware']).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label className="fl" style={{ marginBottom: 0 }}>
                  <span>HSN Code</span>
                  <input
                    className="in"
                    value={hsn}
                    onChange={e => setHsn(e.target.value)}
                    placeholder="e.g. 7214"
                  />
                </label>
              </div>

              <div className="two" style={{ marginBottom: 8, gap: 10 }}>
                <label className="fl" style={{ marginBottom: 0 }}>
                  <span>Unit (UoM)</span>
                  <select
                    className="in"
                    value={uom}
                    onChange={e => setUom(e.target.value)}
                  >
                    {(uoms.length > 0 ? uoms : ['KGS', 'NOS', 'MT', 'PCS']).map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </label>
                <label className="fl" style={{ marginBottom: 0 }}>
                  <span>Min Stock Alert ({uom})</span>
                  <input
                    className="in"
                    type="number"
                    min="0"
                    step="any"
                    value={min}
                    onChange={e => setMin(e.target.value)}
                  />
                </label>
              </div>

              <div className="two" style={{ marginBottom: 8, gap: 10 }}>
                <label className="fl" style={{ marginBottom: 0 }}>
                  <span>Without GST Rate (₹)</span>
                  <input
                    className="in"
                    type="number"
                    min="0"
                    step="any"
                    value={rate}
                    onChange={e => setRate(e.target.value)}
                    placeholder="0"
                  />
                </label>
                <label className="fl" style={{ marginBottom: 0 }}>
                  <span>GST Rate %</span>
                  <select
                    className="in"
                    value={gst}
                    onChange={e => setGst(+e.target.value)}
                  >
                    {[0, 5, 12, 18, 28].map(g => (
                      <option key={g} value={g}>{g}%</option>
                    ))}
                  </select>
                </label>
              </div>

              <div style={{ background: '#fff', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <small className="mut" style={{ fontSize: 12 }}>Rate With GST ({gst}%):</small>
                <b style={{ color: 'var(--navy)', fontSize: 16 }}>
                  {inr(+((+rate || 0) * (1 + ((gst !== undefined && gst !== '' && !isNaN(gst)) ? Number(gst) : 18) / 100)).toFixed(2))}
                </b>
              </div>

              <button className="btn sm gold" style={{ width: '100%', justifyContent: 'center' }} onClick={saveMeta}>
                <Ic n="check" s={15} /> Save &amp; Update Material
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10, fontSize: 12.5 }}>
              <div>HSN: <b>{it.hsn || 'Not set'}</b></div>
              <div>Category: <b>{it.cat || 'Steel'}</b></div>
              <div>Without GST: <b>{inr(it.rate || 0)}</b></div>
              <div>With GST: <b style={{ color: 'var(--navy)' }}>{inr(+((Number(it.rate) || 0) * (1 + ((it.gst !== undefined && it.gst !== null && !isNaN(it.gst)) ? Number(it.gst) : 18) / 100)).toFixed(2))}</b></div>
            </div>
          )}
        </div>

        {/* Quick Add Stock */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input
            className="in"
            style={{ flex: 1 }}
            type="number"
            placeholder={`Add inward quantity (${it.uom})`}
            value={qty}
            onChange={e => setQty(e.target.value)}
          />
          <button
            className="btn pri"
            onClick={() => {
              if (+qty > 0) {
                upd({
                  recv: it.recv + +qty,
                  last: new Date().toISOString().slice(0, 10)
                });
                setQty('');
                toast(`Added ${qty} ${it.uom} to stock`);
              }
            }}
          >
            + Add Stock
          </button>
        </div>

        {/* Issue Material Button */}
        <button
          className="btn gold"
          style={{ width: '100%', justifyContent: 'center', marginBottom: 10 }}
          disabled={it.stock <= 0}
          onClick={() => goBill(it.id)}
        >
          <Ic n="bill" s={16} /> Issue This Material
        </button>

        {/* Delete Material Action */}
        <button
          className="btn red sm"
          style={{ width: '100%', justifyContent: 'center', marginBottom: 16 }}
          onClick={handleStartDelete}
        >
          <Ic n="trash" s={14} /> Delete Material from Stock
        </button>

        {/* Inward History */}
        <h3 style={{ margin: '18px 0 10px', fontSize: 15 }}>Recent Inward Receipts</h3>
        {combinedHist.length === 0 ? (
          <div className="mut">No recorded gate entries or invoices for this item.</div>
        ) : (
          <table>
            <tbody>
              {combinedHist.map((x, k) => (
                <tr key={k}>
                  <td style={{ padding: '8px 0' }}>
                    <b>{dt(x.d)}</b>
                    {x.inv && <span className="tag-hsn" style={{ marginLeft: 6, fontSize: 10 }}>INV: {x.inv}</span>}
                    <br />
                    <small className="mut">{x.v}</small>
                  </td>
                  <td className="r">
                    <b>{fmt(x.q)}</b> {x.u || it.uom}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </aside>

      {/* 6-DIGIT CODE DELETE CONFIRMATION MODAL */}
      {confirmDelete && (
        <Modal
          title="Delete Stock Material"
          subtitle={`${it.name} (${it.id})`}
          onClose={() => setConfirmDelete(false)}
        >
          <div style={{ padding: '6px 0' }}>
            <div style={{
              background: '#FEF2F2',
              border: '1.5px solid #F87171',
              borderRadius: 12,
              padding: '16px',
              marginBottom: 18
            }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ color: '#DC2626', marginTop: 2 }}>
                  <Ic n="alert" s={22} />
                </div>
                <div>
                  <b style={{ color: '#991B1B', fontSize: 15 }}>
                    Are you sure you want to delete this material?
                  </b>
                  <div style={{ fontSize: 13, color: '#7F1D1D', marginTop: 4 }}>
                    Material <b>{it.name}</b> ({it.id} &middot; {it.cat}) will be permanently deleted from inventory.
                  </div>
                </div>
              </div>
            </div>

            {/* 6-Digit Code Authorization Box */}
            <div style={{
              background: '#F9FAFB',
              border: '1.5px solid #E5E7EB',
              borderRadius: 12,
              padding: '18px',
              textAlign: 'center',
              marginBottom: 20
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--mut)', marginBottom: 8 }}>
                To authorize deletion, please type the 6-digit confirmation code below:
              </div>

              <div style={{
                display: 'inline-block',
                background: '#1E293B',
                color: '#F8FAFC',
                fontFamily: 'monospace',
                fontSize: 26,
                fontWeight: 900,
                letterSpacing: 6,
                padding: '10px 24px',
                borderRadius: 8,
                marginBottom: 14,
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
              }}>
                {deleteCode}
              </div>

              <div>
                <input
                  className="in"
                  placeholder="Enter 6 digits"
                  maxLength={6}
                  value={typedCode}
                  onChange={e => setTypedCode(e.target.value.replace(/\D/g, ''))}
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    letterSpacing: 6,
                    textAlign: 'center',
                    width: 180,
                    border: typedCode === deleteCode ? '2px solid #16A34A' : '1.5px solid var(--line)',
                    background: typedCode === deleteCode ? '#F0FDF4' : '#fff'
                  }}
                  autoFocus
                />
              </div>

              {typedCode && typedCode !== deleteCode && (
                <div style={{ fontSize: 12, color: '#DC2626', marginTop: 6 }}>
                  Code does not match. Enter <b>{deleteCode}</b>.
                </div>
              )}
              {typedCode === deleteCode && (
                <div style={{ fontSize: 12, color: '#16A34A', marginTop: 6, fontWeight: 700 }}>
                  ✓ Code verified. You can now delete this material.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                className="btn"
                type="button"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </button>
              <button
                className="btn red"
                type="button"
                disabled={typedCode.trim() !== deleteCode}
                onClick={handleConfirmDelete}
                style={{
                  opacity: typedCode.trim() === deleteCode ? 1 : 0.5,
                  cursor: typedCode.trim() === deleteCode ? 'pointer' : 'not-allowed'
                }}
              >
                <Ic n="trash" s={15} /> Yes, Delete Material
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
