import React, { useState, useEffect } from 'react';
import ProviderModal from '../ProviderModal';
import './FlowToolbar.css';

export default function FlowToolbar() {
  const [showLLMModal, setShowLLMModal] = useState(false);
  const [showChatsState, setShowChatsState] = useState(() => {
    try { const v = localStorage.getItem('chatflow.showChats'); return v === null ? true : v === '1'; } catch (e) { return true; }
  });
  const [showLinearState, setShowLinearState] = useState(() => {
    try { const v = localStorage.getItem('chatflow.showLinear'); return v === null ? true : v === '1'; } catch (e) { return true; }
  });

  useEffect(() => {
    const onToggleChats = () => setShowChatsState((s) => { const ns = !s; try { localStorage.setItem('chatflow.showChats', ns ? '1' : '0'); } catch (e) {} return ns; });
    const onToggleLinear = () => setShowLinearState((s) => { const ns = !s; try { localStorage.setItem('chatflow.showLinear', ns ? '1' : '0'); } catch (e) {} return ns; });
    window.addEventListener('toggleChats', onToggleChats);
    window.addEventListener('toggleLinear', onToggleLinear);
    return () => {
      window.removeEventListener('toggleChats', onToggleChats);
      window.removeEventListener('toggleLinear', onToggleLinear);
    };
  }, []);
  const saveFlow = () => {
    try {
      const flow = window.__getFlow ? window.__getFlow() : null;
      if (!flow) {
        alert('Unable to retrieve canvas data — save failed');
        return;
      }
      localStorage.setItem('chatflow-nodes', JSON.stringify(flow.nodes || []));
      localStorage.setItem('chatflow-edges', JSON.stringify(flow.edges || []));
      if (window.__showSaveToast) window.__showSaveToast();
      console.log('Flow saved from toolbar');
    } catch (e) {
      console.warn('saveFlow error', e);
      alert('An error occurred while saving');
    }
  };
 

  const addNode = () => {
    // Instead of local state, dispatch event so FlowCore can handle node creation
    const event = new CustomEvent('addNode', {
      detail: {
        type: 'dialogNode',
        data: { question: '', answer: '', llmConfigId: null },
        // signal to FlowCore that this add originated from the toolbar
        // and should be placed near the viewport center
        center: true,
      }
    });
    window.dispatchEvent(event);
  };

  

  return (
    <>
      <header className="flow-toolbar">
        <div className="flow-toolbar__brand">
          <div className="flow-toolbar__logo">ChatFlow</div>
          <div className="flow-toolbar__subtitle">Canvas Studio</div>
        </div>
        <div className="flow-toolbar__actions">
          <button className="flow-toolbar__button flow-toolbar__button--primary" onClick={addNode}>➕ Add Node</button>
          <button className="flow-toolbar__button" onClick={saveFlow}>💾 Save</button>

          <button className="flow-toolbar__button flow-toolbar__button--ghost" onClick={() => setShowLLMModal(true)}>
            ⚙️ Provider
          </button>

          <button
            className="flow-toolbar__button flow-toolbar__button--ghost"
            title={'Toggle Chats'}
            onClick={() => window.dispatchEvent(new Event('toggleChats'))}
            aria-label="Toggle Chats"
            aria-pressed={showChatsState}
          >
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg" style={{opacity: showChatsState ? 1 : 0.3}}>
              <rect x="0.5" y="1" width="5" height="12" rx="1" fill="#475569" />
              <rect x="7" y="1" width="10" height="12" rx="1" fill="#94a3b8" />
            </svg>
          </button>
          <button
            className="flow-toolbar__button flow-toolbar__button--ghost"
            title={'Toggle Linear Conversation'}
            onClick={() => window.dispatchEvent(new Event('toggleLinear'))}
            aria-label="Toggle Linear Conversation"
            aria-pressed={showLinearState}
          >
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg" style={{opacity: showLinearState ? 1 : 0.45}}>
              <rect x="0.5" y="1" width="10" height="12" rx="1" fill="#94a3b8" />
              <rect x="12" y="1" width="5" height="12" rx="1" fill="#475569" />
            </svg>
          </button>
        </div>
      </header>
      <ProviderModal visible={showLLMModal} onClose={() => setShowLLMModal(false)} />
    </>
  );
}
