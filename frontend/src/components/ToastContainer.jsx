import React from 'react';
import { useToast } from '../context/ToastContext';
import Toast from './Toast';
import ModalToast from './ModalToast';

const ToastContainer = () => {
  const { toasts } = useToast();

  // Separate toasts by type
  const regularToasts = toasts.filter(toast => toast.type !== 'confirm');
  const confirmToasts = toasts.filter(toast => toast.type === 'confirm');

  return (
    <>
      {/* Add keyframe animations */}
      <style>
        {`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateX(-100%);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          @keyframes slideOut {
            from {
              opacity: 1;
              transform: translateX(0);
            }
            to {
              opacity: 0;
              transform: translateX(-100%);
            }
          }
        `}
      </style>

      {/* Regular toast container positioned at bottom-left */}
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column-reverse', // Stack from bottom to top
          pointerEvents: 'none'
        }}
      >
        {regularToasts.map((toast) => (
          <div key={toast.id} style={{ pointerEvents: 'auto' }}>
            <Toast toast={toast} />
          </div>
        ))}
      </div>

      {/* Confirm toasts rendered as centered modals */}
      {confirmToasts.map((toast) => (
        <ModalToast key={toast.id} toast={toast} />
      ))}
    </>
  );
};

export default ToastContainer;

