import React, { useEffect } from 'react';
import './PopupModal.css';

export const PopupModal = ({ isOpen, onClose, children }) => {
  
  // Prevent background page body from scrolling when modal is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <div className={`modal-overlay ${isOpen ? 'is-open' : ''}`} onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        
        <div className="modal-header">
          <button onClick={onClose} className="modal-close-btn" aria-label="Close modal">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {children}
        </div>

      </div>
    </div>
  );
};

export default PopupModal;