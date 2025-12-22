import React, { useState, useEffect } from 'react';
import { useLLM } from './contexts/LLMProvider';

export default function ProviderModal({ visible, onClose }) {
  const { configs, addConfig, updateConfig, deleteConfig, selectConfig } = useLLM();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', baseUrl: '', apiKey: '', model: '' });
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    try {
      window.__modalOpen = !!visible;
    } catch (err) {
      // ignore
    }
    return () => {
      try {
        window.__modalOpen = false;
      } catch (err) {
        // ignore
      }
    };
  }, [visible]);

  const resetForm = () => {
    setEditingId(null);
    setForm({ name: '', baseUrl: '', apiKey: '', model: '' });
  };

  const saveConfig = () => {
    if (!form.name || !form.baseUrl || !form.apiKey) {
      alert('Please fill in Name, Base URL and API Key');
      return;
    }
    if (editingId) {
      updateConfig(editingId, { ...form, provider: 'openai' });
    } else {
      addConfig({ ...form, provider: 'openai' });
    }
    setShowForm(false);
    resetForm();
  };

  const startEdit = (cfg) => {
    try {
      setEditingId(cfg.id);
      setForm({ name: cfg.name || '', baseUrl: cfg.baseUrl || cfg.endpoint || '', apiKey: cfg.apiKey || '', model: cfg.model || '' });
      setShowForm(true);
    } catch (err) {
      console.error('startEdit error', err);
    }
  };

  if (!visible) return null;
  const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999 };
  const modalStyle = { background: '#fff', padding: 20, borderRadius: 10, width: 640, maxWidth: '95%', boxShadow: '0 8px 30px rgba(0,0,0,0.2)' };
  const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 };
  const listStyle = { display: 'grid', gridTemplateColumns: '1fr', gap: 10, maxHeight: 320, overflow: 'auto' };
  const cardStyle = { padding: 12, border: '1px solid #eee', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa' };
  const formStyle = { display: 'grid', gridTemplateColumns: '1fr', gap: 8 };
  const inputStyle = { padding: 8, borderRadius: 6, border: '1px solid #ddd' };
  const btnPrimary = { background: '#2563eb', color: '#fff', padding: '8px 12px', borderRadius: 6, border: 'none', cursor: 'pointer' };
  const btnSecondary = { background: '#f3f4f6', padding: '8px 10px', borderRadius: 6, border: 'none', cursor: 'pointer' };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h2 style={{ margin: 0 }}>⚙️ Provider (OpenAI Compatible)</h2>
          <div>
            <button onClick={() => { resetForm(); setShowForm(true); }} style={{ ...btnPrimary, marginRight: 8 }}>➕ New</button>
            <button onClick={onClose} style={btnSecondary}>Close</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 250px', gap: 12 }}>
          <div>
            <h4 style={{ marginTop: 0 }}>Saved Providers</h4>
            <div style={listStyle}>
              {configs.length === 0 && <div style={{ color: '#666' }}>No providers yet. Click "New" to add.</div>}
              {configs.map(cfg => (
                <div key={cfg.id} style={cardStyle}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{cfg.name}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>{cfg.provider} · {cfg.model || ''}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onPointerDown={e => e.stopPropagation()} onClick={() => startEdit(cfg)} style={btnSecondary}>Edit</button>
                    <button onPointerDown={e => e.stopPropagation()} onClick={() => deleteConfig(cfg.id)} style={{ ...btnSecondary, background: '#fee2e2', color: '#b91c1c' }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 style={{ marginTop: 0 }}>{editingId ? 'Edit Provider' : 'Provider Form'}</h4>
            {showForm ? (
              <div style={formStyle}>
                <input style={inputStyle} placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                <input style={inputStyle} placeholder="Base URL (e.g. https://api.openai.com)" value={form.baseUrl} onChange={e => setForm({ ...form, baseUrl: e.target.value })} />
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    style={{ ...inputStyle, paddingRight: 40 }}
                    type={showApiKey ? 'text' : 'password'}
                    placeholder="API Key"
                    value={form.apiKey}
                    onChange={e => setForm({ ...form, apiKey: e.target.value })}
                  />

                  <button
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => setShowApiKey(s => !s)}
                    aria-label={showApiKey ? 'Hide API Key' : 'Show API Key'}
                    title={showApiKey ? 'Hide API Key' : 'Show API Key'}
                    style={{
                      position: 'absolute',
                      right: 8,
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {showApiKey ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 3L21 21" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M10.58 10.58A3 3 0 0113.42 13.42" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2.85 12.53C4.66 8.99 8.06 6.5 12 6.5c1.5 0 2.93.34 4.2.94" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M21.15 11.47C19.34 15.01 15.94 17.5 12 17.5c-1.5 0-2.93-.34-4.2-.94" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6S2.5 12 2.5 12z" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="12" cy="12" r="2.5" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                </div>
                <input style={inputStyle} placeholder="Model (e.g. gpt5)" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} />
                <div style={{ fontSize: 12, color: '#92400e', marginTop: 6 }}>
                  Note: Avoid exposing real API keys in the frontend. Prefer a backend proxy and store the real key on the server to reduce leakage risk.
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                  <button onClick={() => { resetForm(); setShowForm(false); }} style={btnSecondary}>Cancel</button>
                  <button onClick={saveConfig} style={btnPrimary}>{editingId ? 'Save Changes' : 'Save Provider'}</button>
                </div>
              </div>
            ) : (
              <div style={{ color: '#666' }}>Select a provider on the left to edit, or click "New" to add.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
