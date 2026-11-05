import Ic from '../components/Icon';

const Modal = ({ title, subtitle, size, onClose, children, actions }) => (
  <div>
    <div className="shade" onClick={onClose} />
    <div className={`mod ${size ? size : ''}`} role="dialog" aria-label={title}>
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 16, gap: 12 }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--navy)' }}>{title}</h2>
          {subtitle && <div style={{ fontSize: 12.5, color: 'var(--mut)', marginTop: 2 }}>{subtitle}</div>}
        </div>
        {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{actions}</div>}
        <button className="ib" aria-label="Close" onClick={onClose}>
          <Ic n="x" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

export default Modal;
