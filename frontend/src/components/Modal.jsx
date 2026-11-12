import { useEffect } from 'react'

export default function Modal({ open, onClose, title, icon, size, footer, children }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.classList.add('modal-open')
    return () => { document.removeEventListener('keydown', onKey); document.body.classList.remove('modal-open') }
  }, [open, onClose])
  if (!open) return null
  return (
    <>
      <div className="modal fade show d-block" tabIndex={-1} onMouseDown={(e) => e.target === e.currentTarget && onClose()}
           style={{ overflowY: 'auto' }}>
        <div className={`modal-dialog modal-dialog-centered ${size === 'lg' ? 'modal-lg' : ''}`}>
          <div className="modal-content bg-card text-white rounded-xl">
            <div className="modal-header border-0">
              <h1 className="font-display fs-2 mb-0">{icon && <i className={`bi ${icon} me-2 text-green`} />}{title}</h1>
              <button type="button" className="btn-close btn-close-white" onClick={onClose} />
            </div>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-footer border-0">{footer}</div>}
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" />
    </>
  )
}
