import React, { useEffect } from 'react';

export default function SaveToast() {
  useEffect(() => {
    window.__showSaveToast = function() {
      const toast = document.getElementById('save-toast');
      if (!toast) return;
      toast.style.transition = 'opacity 0.3s';
      toast.style.opacity = '1';
      clearTimeout(window.__toastTimer);
      window.__toastTimer = setTimeout(() => toast.style.opacity = '0', 1000);
    };
  }, []);

  return (
    <div
      id="save-toast"
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '8px 14px',
        background: 'rgba(0,0,0,0.7)',
        color: 'white',
        borderRadius: '6px',
        transition: 'opacity 0.5s',
        opacity: 0,
        pointerEvents: 'none',
        zIndex: 9999
      }}>
      saved
    </div>
  );
}
