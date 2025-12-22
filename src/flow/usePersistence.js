import { useCallback, useEffect, useState } from 'react';
import { addEdge } from 'reactflow';
import DEFAULT_EDGE_OPTIONS from './edgeStyle';

export default function usePersistence(nodes, edges, setNodes, setEdges) {
  const [interactionLock, setInteractionLock] = useState(false);

  // Initialization, connection, and save logic
  const onInit = useCallback((instance) => {
    window.__reactFlowInstance = instance;
  }, []);

  const onConnect = useCallback(
    (params) => {
      setEdges((eds) => {
        // Enforce single upstream: remove any existing edge(s) that target the same node,
        // then add the new connection. This replaces the previous blocking behavior
        // (which showed an alert) so reconnections silently replace the upstream.
        const filtered = eds.filter((e) => e.target !== params.target);
        return addEdge(
          {
            ...params,
            ...DEFAULT_EDGE_OPTIONS,
            data: { direction: 'forward' },
          },
          filtered
        );
      });
    },
    [setEdges]
  );

  const saveFlow = useCallback(() => {
    try {
      localStorage.setItem('chatflow-nodes', JSON.stringify(nodes));
      localStorage.setItem('chatflow-edges', JSON.stringify(edges));
      if (window.__showSaveToast) window.__showSaveToast();
      console.log('Flow saved to localStorage');
    } catch (e) {
      console.warn('saveFlow error', e);
    }
  }, [nodes, edges]);

  // Lock event hooks
  useEffect(() => {
    const onStart = () => setInteractionLock(true);
    const onEnd = () => setInteractionLock(false);
    window.addEventListener('nodeInteractionStart', onStart);
    window.addEventListener('nodeInteractionEnd', onEnd);
    return () => {
      window.removeEventListener('nodeInteractionStart', onStart);
      window.removeEventListener('nodeInteractionEnd', onEnd);
    };
  }, []);

  // Auto save changes
  useEffect(() => {
    try { localStorage.setItem('chatflow-nodes', JSON.stringify(nodes)); } catch (e) {}
  }, [nodes]);

  useEffect(() => {
    try { localStorage.setItem('chatflow-edges', JSON.stringify(edges)); } catch (e) {}
  }, [edges]);

  return { saveFlow, onConnect, onInit, interactionLock };
}
