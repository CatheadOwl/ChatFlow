import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const CanvasContext = createContext(null);

export function useCanvas() {
  const ctx = useContext(CanvasContext);
  if (!ctx) throw new Error('useCanvas must be used within CanvasProvider');
  return ctx;
}

export function CanvasProvider({ children }) {
  const [canvases, setCanvases] = useState(() => {
    try {
      const stored = localStorage.getItem('chatflow-canvases');
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      console.warn('failed to read canvases', e);
      return {};
    }
  });

  const [focusNodes, setFocusNodes] = useState(() => {
    try {
      const stored = localStorage.getItem('chatflow-canvases');
      if (!stored) return {};
      const parsed = JSON.parse(stored || '{}');
      const map = {};
      Object.keys(parsed).forEach((cid) => {
        if (parsed[cid] && parsed[cid].focusNode) map[cid] = parsed[cid].focusNode;
      });
      return map;
    } catch (e) {
      return {};
    }
  });

  const [currentCanvasId, setCurrentCanvasId] = useState(() => {
    try {
      const stored = localStorage.getItem('chatflow-current');
      return stored || null;
    } catch (e) {
      return null;
    }
  });

  // pendingRequests: ref so updates don't force rerenders frequently
  const pendingRef = useRef({});

  useEffect(() => {
    try {
      localStorage.setItem('chatflow-canvases', JSON.stringify(canvases));
    } catch (e) {
      console.warn('failed to persist canvases', e);
    }
  }, [canvases]);

  useEffect(() => {
    try {
      if (currentCanvasId) localStorage.setItem('chatflow-current', currentCanvasId);
      else localStorage.removeItem('chatflow-current');
    } catch (e) {
      // ignore
    }
  }, [currentCanvasId]);

  const saveCanvas = (id) => {
    // noop - canvases are already persisted on change
    return canvases[id];
  };

  const getActiveFlow = useCallback(() => {
    if (typeof window !== 'undefined' && typeof window.__getFlow === 'function') {
      const liveFlow = window.__getFlow();
      if (liveFlow && Array.isArray(liveFlow.nodes)) return liveFlow;
    }
    if (!currentCanvasId) return { nodes: [], edges: [] };
    const flowFromState = canvases?.[currentCanvasId]?.flow;
    if (flowFromState) return flowFromState;
    try {
      const stored = localStorage.getItem(`chatflow-canvas-${currentCanvasId}`);
      return stored ? JSON.parse(stored) : { nodes: [], edges: [] };
    } catch (e) {
      console.warn('read active flow failed', e);
      return { nodes: [], edges: [] };
    }
  }, [canvases, currentCanvasId]);

  const getConversationChain = useCallback((nodeId) => {
    if (!nodeId) return [];
    const { nodes = [], edges = [] } = getActiveFlow();
    if (!nodes.length) return [];
    const map = nodes.reduce((acc, node) => {
      acc[node.id] = node;
      return acc;
    }, {});

    const node = map[nodeId];
    if (!node) return [];

    const chain = [];
    let current = node;
    const guard = new Set();
    while (current && !guard.has(current.id)) {
      guard.add(current.id);
      chain.unshift(current);
      const incoming = edges.find((edge) => edge.target === current.id);
      if (!incoming) break;
      current = map[incoming.source];
    }
    return chain;
  }, [getActiveFlow]);

  const setFocusNode = useCallback((nodeId, opts = {}) => {
    const targetCanvas = opts.canvasId || currentCanvasId;
    if (!targetCanvas) return;
    setFocusNodes(prev => ({ ...prev, [targetCanvas]: nodeId || null }));
    // persist focusNode into canvases state so it survives reloads
    setCanvases(prev => ({ ...prev, [targetCanvas]: { ...prev[targetCanvas], focusNode: nodeId || null, lastUpdated: Date.now() } }));
  }, [currentCanvasId]);

  const focusNode = currentCanvasId ? focusNodes[currentCanvasId] || null : null;

  const addNodeAfter = useCallback((nodeId, message, options = {}) => {
    if (!nodeId || !currentCanvasId) return null;
    const creator = typeof window !== 'undefined' ? window.__addNodeAfter : null;
    if (typeof creator !== 'function') {
      console.warn('addNodeAfter helper missing');
      return null;
    }
    const payload = { question: message, answer: '' };
    const newId = creator(nodeId, payload, options);
    if (newId) {
      setFocusNodes(prev => ({ ...prev, [currentCanvasId]: newId }));
      setCanvases(prev => ({ ...prev, [currentCanvasId]: { ...prev[currentCanvasId], focusNode: newId, lastUpdated: Date.now() } }));
    }
    return newId;
  }, [currentCanvasId]);

  const refreshConversation = useCallback(() => {
    if (!focusNode) return [];
    return getConversationChain(focusNode);
  }, [focusNode, getConversationChain]);

  const createCanvas = ({ name } = {}) => {
    const id = Date.now().toString();
    const newCanvas = {
      id,
      name: name || `Chat ${new Date().toLocaleString()}`,
      messages: [],
      waiting: false,
      config: {},
      lastUpdated: Date.now(),
      focusNode: null,
    };
    setCanvases(prev => ({ ...prev, [id]: newCanvas }));
    setCurrentCanvasId(id);
    return newCanvas;
  };

  const renameCanvas = (id, name) => {
    setCanvases(prev => ({ ...prev, [id]: { ...prev[id], name, lastUpdated: Date.now() } }));
  };

  const removeCanvas = (id) => {
    setCanvases(prev => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
    if (currentCanvasId === id) setCurrentCanvasId(null);
    // keep pending requests running; they will update canvases when complete
  };

  const switchCanvas = (id) => {
    if (id === currentCanvasId) return;
    // no explicit save needed - state is persisted on change
    setCurrentCanvasId(id);
  };

  const updateCanvas = (id, data) => {
    setCanvases(prev => ({ ...prev, [id]: { ...prev[id], ...data, lastUpdated: Date.now() } }));
  };

  const registerPending = (id, { promise, controller } = {}) => {
    pendingRef.current[id] = { promise, controller, startedAt: Date.now() };
    // mark waiting
    setCanvases(prev => ({ ...prev, [id]: { ...prev[id], waiting: true } }));
    // when promise resolves (or rejects), clear and update
    if (promise && promise.then) {
      promise.then((result) => {
        // append result to messages if provided
        setCanvases(prev => {
          const existing = prev[id];
          if (!existing) return prev;
          const msgs = Array.isArray(existing.messages) ? [...existing.messages] : [];
          if (result && result.message) msgs.push(result.message);
          const updated = { ...existing, messages: msgs, waiting: false, lastUpdated: Date.now() };
          return { ...prev, [id]: updated };
        });
        delete pendingRef.current[id];
      }).catch((err) => {
        console.warn('pending promise error for canvas', id, err);
        setCanvases(prev => ({ ...prev, [id]: { ...prev[id], waiting: false, lastUpdated: Date.now() } }));
        delete pendingRef.current[id];
      });
    }
  };

  const getPending = () => pendingRef.current;

  useEffect(() => {
    if (!currentCanvasId) return;
    const focusId = focusNodes[currentCanvasId];
    if (!focusId) return;
    const exists = getConversationChain(focusId).length > 0;
    if (!exists) {
      setFocusNodes(prev => ({ ...prev, [currentCanvasId]: null }));
    }
  }, [currentCanvasId, canvases, focusNodes, getConversationChain]);

  // Restore persisted focusNode when switching canvases (or when canvases data loads)
  useEffect(() => {
    if (!currentCanvasId) return;
    // Prefer the in-memory canvases entry (kept in sync with localStorage). If absent, try localStorage fallback.
    const persistedFocus = canvases?.[currentCanvasId]?.focusNode;
    if (persistedFocus !== undefined) {
      setFocusNodes(prev => ({ ...prev, [currentCanvasId]: persistedFocus || null }));
      return;
    }

    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('chatflow-canvases');
        if (!stored) return;
        const parsed = JSON.parse(stored || '{}');
        const f = parsed?.[currentCanvasId]?.focusNode;
        if (f !== undefined) setFocusNodes(prev => ({ ...prev, [currentCanvasId]: f || null }));
      } catch (e) {
        // ignore parse errors
      }
    }
  }, [currentCanvasId, canvases]);

  const value = {
    canvases,
    currentCanvasId,
    focusNode,
    createCanvas,
    renameCanvas,
    removeCanvas,
    switchCanvas,
    updateCanvas,
    saveCanvas,
    registerPending,
    getPending,
    setFocusNode,
    getConversationChain,
    addNodeAfter,
    refreshConversation,
  };

  return (
    <CanvasContext.Provider value={value}>
      {children}
    </CanvasContext.Provider>
  );
}

export default CanvasProvider;
