import React from 'react';
import { useCanvas } from './contexts/CanvasProvider';

export default function CanvasTabs() {
  const { canvases, currentCanvasId, createCanvas, removeCanvas, switchCanvas } = useCanvas();

  const handleNew = () => {
    createCanvas();
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      background: '#f9fafb',
      borderBottom: '1px solid #ddd',
      padding: '6px 10px',
      overflowX: 'auto',
      whiteSpace: 'nowrap'
    }}>
      {Object.values(canvases).map(c => (
        <div key={c.id}
          onClick={() => switchCanvas(c.id)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            marginRight: 6,
            borderRadius: 6,
            cursor: 'pointer',
            background: currentCanvasId === c.id ? '#e0f2fe' : '#fff',
            border: '1px solid #ccc',
            position: 'relative'
          }}>
          <span>{c.name}</span>
          {c.waiting && <span style={{ color: 'orange' }}>⏳</span>}
          <button
            onClick={(e) => { e.stopPropagation(); removeCanvas(c.id); }}
            style={{ border: 'none', background: 'none', color: '#888', cursor: 'pointer', marginLeft: 4 }}>✕</button>
        </div>
      ))}
      <button onClick={handleNew} style={{ border: '1px solid #ccc', borderRadius: 6, padding: '6px 10px', background: '#fff', cursor: 'pointer' }}>＋ New</button>
    </div>
  );
}