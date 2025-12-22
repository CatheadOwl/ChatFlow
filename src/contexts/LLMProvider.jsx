import React, { createContext, useContext, useEffect, useState } from 'react';

const LLMContext = createContext(null);

export function useLLM() {
  const ctx = useContext(LLMContext);
  if (!ctx) throw new Error('useLLM must be used within LLMProvider');
  return ctx;
}

export function LLMProvider({ children }) {
  // perform migration of old `llm-configs` shape to the new provider shape
  const initialState = (() => {
    try {
      const raw = localStorage.getItem('llm-configs');
      if (!raw) return { configs: [], selected: null };
      const parsedRaw = JSON.parse(raw || 'null');

      // Support two shapes in localStorage:
      // - legacy: an array of config objects
      // - new: an object { configs: [...], selected: '<id>' }
      const parsed = Array.isArray(parsedRaw) ? parsedRaw : (parsedRaw && Array.isArray(parsedRaw.configs) ? parsedRaw.configs : null);
      const persistedSelected = parsedRaw && parsedRaw.selected ? parsedRaw.selected : null;
      if (!parsed) return { configs: [], selected: persistedSelected || null };

      const migrated = parsed.map((cfg) => {
        // If already in new shape, keep
        if (cfg && (cfg.baseUrl || cfg.provider) && (cfg.apiKey || cfg.key || cfg.api_key)) {
          return { ...cfg, provider: cfg.provider || 'openai' };
        }

        // Legacy shape: { id, name, type, settings: { endpoint, deployment, apiKey, apiVersion, temperature, maxTokens } }
        const s = (cfg && cfg.settings) || {};
        const id = cfg?.id || `cfg-${Date.now()}-${Math.random().toString(16).slice(2,6)}`;
        const baseUrl = s.endpoint || s.baseUrl || cfg.endpoint || '';
        const apiKey = s.apiKey || s.key || cfg.apiKey || cfg.key || '';
        const model = s.model || s.deployment || cfg.model || '';
        const deployment = s.deployment || cfg.deployment || '';
        const apiVersion = s.apiVersion || cfg.apiVersion || '';
        // remove temperature and maxTokens — we rely on OpenAI defaults
        const name = cfg.name || s.name || id;
        // Normalize provider to OpenAI only
        const provider = 'openai';

        return {
          id,
          name,
          provider,
          baseUrl,
          apiKey,
          model,
          deployment,
          apiVersion,
          
        };
      });

      // preserve selection if possible
      const selectedRaw = persistedSelected || localStorage.getItem('llm-selected');
      const selected = selectedRaw && migrated.find(c => c.id === selectedRaw) ? selectedRaw : (migrated[0]?.id || null);
      return { configs: migrated, selected };
    } catch (e) {
      console.warn('failed to read/migrate llm-configs', e);
      return { configs: [], selected: null };
    }
  })();

  const [configs, setConfigs] = useState(initialState.configs);
  const [selectedId, setSelectedId] = useState(initialState.selected);

  useEffect(() => {
    try {
      // persist both configs and selected together to avoid mismatch
      const payload = { configs, selected: selectedId };
      localStorage.setItem('llm-configs', JSON.stringify(payload));
    } catch (e) {}
  }, [configs]);

  useEffect(() => {
    try {
      if (selectedId) localStorage.setItem('llm-selected', selectedId);
      else localStorage.removeItem('llm-selected');
    } catch (e) {}
  }, [selectedId]);

  const addConfig = (cfg) => {
    const id = `cfg-${Date.now()}-${Math.random().toString(16).slice(2,6)}`;
    const entry = { id, provider: 'openai', ...cfg };
    setConfigs(prev => [...prev, entry]);
    // If no provider is selected yet, select the newly added one to ensure a selection persists.
    setSelectedId(prev => prev || id);
    return id;
  };

  const updateConfig = (id, updates) => {
    setConfigs(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteConfig = (id) => {
    setConfigs(prev => prev.filter(c => c.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const selectConfig = (id) => {
    const found = configs.find(c => c.id === id);
    if (!found) return;
    setSelectedId(id);
  };

  const getSelected = () => configs.find(c => c.id === selectedId) || null;

  const value = {
    configs,
    selectedId,
    selected: getSelected(),
    addConfig,
    updateConfig,
    deleteConfig,
    selectConfig,
  };

  return (
    <LLMContext.Provider value={value}>
      {children}
    </LLMContext.Provider>
  );
}

export default LLMProvider;
