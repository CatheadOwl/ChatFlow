import React, { useEffect, useState } from 'react';
import FlowCanvas from './FlowCanvas';
import Chats from './Chats';
import CanvasProvider from './contexts/CanvasProvider';
import './App.css';

function App() {
  const [showChats, setShowChats] = useState(() => {
    try {
      const v = localStorage.getItem('chatflow.showChats');
      return v === null ? true : v === '1';
    } catch (e) {
      return true;
    }
  });
  const [showLinear, setShowLinear] = useState(() => {
    try {
      const v = localStorage.getItem('chatflow.showLinear');
      return v === null ? true : v === '1';
    } catch (e) {
      return true;
    }
  });

  useEffect(() => {
    const toggleChats = () => {
      setShowChats((s) => {
        const ns = !s;
        try { localStorage.setItem('chatflow.showChats', ns ? '1' : '0'); } catch (e) {}
        return ns;
      });
    };
    const toggleLinear = () => {
      setShowLinear((s) => {
        const ns = !s;
        try { localStorage.setItem('chatflow.showLinear', ns ? '1' : '0'); } catch (e) {}
        return ns;
      });
    };

    const onToggleChats = () => toggleChats();
    const onToggleLinear = () => toggleLinear();

    window.addEventListener('toggleChats', onToggleChats);
    window.addEventListener('toggleLinear', onToggleLinear);

    return () => {
      window.removeEventListener('toggleChats', onToggleChats);
      window.removeEventListener('toggleLinear', onToggleLinear);
    };
  }, []);

  return (
    <CanvasProvider>
      <div className="app-shell">
        {showChats && <Chats />}
        <FlowCanvas showLinear={showLinear} />
      </div>
    </CanvasProvider>
  );
}

export default App;
