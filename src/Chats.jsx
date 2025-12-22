import React, { useState } from 'react';
import { useCanvas } from './contexts/CanvasProvider';

export default function Chats() {
  const { canvases, currentCanvasId, createCanvas, renameCanvas, removeCanvas, switchCanvas } = useCanvas();
  const [newName, setNewName] = useState('');

  return (
    <div style={{
      width: '250px',
      height: '100vh',
      background: '#f7f7f7',
      borderRight: '1px solid #ccc',
      padding: '10px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
      <h3>🎨 Chats</h3>
      <a
        tabIndex="0"
        onClick={() => createCanvas()}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 10px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          background: '#fff',
          cursor: 'pointer',
          textDecoration: 'none',
          color: '#333'
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" aria-hidden="true" fill="currentColor">
          <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span>New Chat</span>
      </a>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {Object.keys(canvases).length === 0 ? (
          <p style={{ color: '#777', textAlign: 'center' }}>No canvases</p>
        ) : (
          Object.values(canvases).map(canvas => (
            <div key={canvas.id}
              onClick={() => switchCanvas(canvas.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: currentCanvasId === canvas.id ? '#e0f7ff' : '#fff',
                border: '1px solid #ddd',
                padding: '6px 8px',
                borderRadius: '6px',
                marginBottom: '6px',
                cursor: 'pointer',
                transition: 'background 0.2s',
                position: 'relative'
              }}
              onMouseEnter={(e) => e.currentTarget.querySelector('.delete-btn').style.opacity = 1}
              onMouseLeave={(e) => e.currentTarget.querySelector('.delete-btn').style.opacity = 0}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 500 }}>{canvas.name}</span>
                {canvas.waiting && <span style={{ color: 'orange', fontSize: 14 }}>⏳</span>}
              </div>
              <div style={{ position: 'relative' }}>
                <button
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    const menu = document.createElement('div');
                    const rect = e.currentTarget.getBoundingClientRect();
                    menu.style.position = 'fixed';
                    menu.style.top = `${rect.bottom + 4}px`;
                    menu.style.left = `${rect.left - 60}px`;
                    menu.style.background = '#fff';
                    menu.style.border = '1px solid #ccc';
                    menu.style.borderRadius = '4px';
                    menu.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
                    menu.style.zIndex = '1000';

                    const renameBtn = document.createElement('div');
                    renameBtn.textContent = 'Rename';
                    renameBtn.style.padding = '6px 10px';
                    renameBtn.style.cursor = 'pointer';
                    renameBtn.onmouseenter = () => renameBtn.style.background = '#f0f0f0';
                    renameBtn.onmouseleave = () => renameBtn.style.background = 'white';
                    renameBtn.onclick = () => {
                      const nn = prompt('Rename canvas', canvas.name);
                      if (nn) renameCanvas(canvas.id, nn);
                      document.body.removeChild(menu);
                    };

                    const delBtn = document.createElement('div');
                    delBtn.textContent = 'Delete';
                    delBtn.style.padding = '6px 10px';
                    delBtn.style.cursor = 'pointer';
                    delBtn.style.color = 'red';
                    delBtn.onmouseenter = () => delBtn.style.background = '#fbeaea';
                    delBtn.onmouseleave = () => delBtn.style.background = 'white';
                    delBtn.onclick = () => {
                      removeCanvas(canvas.id);
                      document.body.removeChild(menu);
                    };

                    menu.appendChild(renameBtn);
                    menu.appendChild(delBtn);
                    document.body.appendChild(menu);

                    const closeMenu = (ev) => {
                      if (!menu.contains(ev.target) && menu.parentNode) {
                        try {
                          menu.parentNode.removeChild(menu);
                        } catch (err) {
                          console.warn('menu already removed');
                        }
                        document.removeEventListener('click', closeMenu);
                      }
                    };
                    setTimeout(() => document.addEventListener('click', closeMenu), 0);
                  }}
                  style={{
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    border: 'none',
                    background: 'none',
                    color: '#555',
                    cursor: 'pointer',
                    fontSize: 16,
                    fontWeight: 'bold'
                  }}>⋯</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
