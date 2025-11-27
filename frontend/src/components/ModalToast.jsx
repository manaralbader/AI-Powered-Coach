import React, { useState } from 'react';
import { useToast } from '../context/ToastContext';

const ModalToast = ({ toast }) => {
  const { removeToast } = useToast();
  const [isExiting, setIsExiting] = useState(false);

  const handleConfirm = () => {
    if (toast.onConfirm) {
      toast.onConfirm();
    }
    handleClose();
  };

  const handleCancel = () => {
    if (toast.onCancel) {
      toast.onCancel();
    }
    handleClose();
  };

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      removeToast(toast.id);
    }, 200); // Match animation duration
  };

  return (
    <>
      {/* Add keyframe animations for modal */}
      <style>
        {`
          @keyframes modalFadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          @keyframes modalFadeOut {
            from {
              opacity: 1;
            }
            to {
              opacity: 0;
            }
          }

          @keyframes modalSlideIn {
            from {
              opacity: 0;
              transform: translate(-50%, -45%);
            }
            to {
              opacity: 1;
              transform: translate(-50%, -50%);
            }
          }

          @keyframes modalSlideOut {
            from {
              opacity: 1;
              transform: translate(-50%, -50%);
            }
            to {
              opacity: 0;
              transform: translate(-50%, -45%);
            }
          }
        `}
      </style>

      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9998,
          animation: isExiting ? 'modalFadeOut 0.2s ease-out' : 'modalFadeIn 0.2s ease-out',
          opacity: isExiting ? 0 : 1,
          transition: 'opacity 0.2s ease-out'
        }}
        onClick={(e) => {
          // Prevent closing on backdrop click - user must choose an action
          e.stopPropagation();
        }}
      />

      {/* Modal Dialog */}
      <div
        role="alertdialog"
        aria-live="assertive"
        aria-modal="true"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: '#2A7337',
          color: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          minWidth: '320px',
          maxWidth: '500px',
          zIndex: 9999,
          animation: isExiting ? 'modalSlideOut 0.2s ease-out' : 'modalSlideIn 0.2s ease-out',
          opacity: isExiting ? 0 : 1,
          transition: 'opacity 0.2s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Message */}
        <div style={{ 
          marginBottom: '1.5rem',
          fontSize: '1rem',
          lineHeight: '1.5',
          textAlign: 'center'
        }}>
          {toast.message}
        </div>

        {/* Action Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: '0.75rem',
          justifyContent: 'center'
        }}>
          <button
            onClick={handleCancel}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '6px',
              padding: '0.625rem 1.5rem',
              fontSize: '0.9375rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              minWidth: '100px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            autoFocus
            style={{
              backgroundColor: 'white',
              color: '#2A7337',
              border: 'none',
              borderRadius: '6px',
              padding: '0.625rem 1.5rem',
              fontSize: '0.9375rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              minWidth: '100px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            Confirm
          </button>
        </div>
      </div>
    </>
  );
};

export default ModalToast;

