import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import ReactFlow, { MiniMap, Controls, Background, addEdge, useEdgesState, useNodesState } from 'reactflow';
import 'reactflow/dist/style.css';
import DialogNode from '../DialogNode';
import usePersistence from './usePersistence';
import DEFAULT_EDGE_OPTIONS from './edgeStyle';
import useKeyboardShortcuts from './useKeyboardShortcuts';

import { useCanvas } from '../contexts/CanvasProvider';

export default function FlowCore() {
  let savedNodes = [];
  let savedEdges = [];
  try {
    savedNodes = JSON.parse(localStorage.getItem('chatflow-nodes')) || [];
    savedEdges = JSON.parse(localStorage.getItem('chatflow-edges')) || [];
  } catch (e) {
    console.warn('restore from storage failed', e);
  }

  const [nodes, setNodes, onNodesChange] = useNodesState(savedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(savedEdges);
  const { saveFlow, onConnect, onInit, interactionLock } = usePersistence(nodes, edges, setNodes, setEdges);

  const { currentCanvasId, canvases, updateCanvas, setFocusNode, focusNode } = useCanvas();

  // Load nodes/edges when switching canvas
  React.useEffect(() => {
    if (!currentCanvasId) return;
    try {
      const stored = localStorage.getItem(`chatflow-canvas-${currentCanvasId}`);
      if (stored) {
        const data = JSON.parse(stored);
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
      } else {
        setNodes([]);
        setEdges([]);
      }
    } catch (e) {
      console.warn('load canvas failed', e);
    }
  }, [currentCanvasId]);

  // Persist on change
  React.useEffect(() => {
    if (!currentCanvasId) return;
    const data = { nodes, edges };
    localStorage.setItem(`chatflow-canvas-${currentCanvasId}`, JSON.stringify(data));
    updateCanvas(currentCanvasId, { flow: data });
  }, [nodes, edges, currentCanvasId]);

  // Register keyboard shortcuts logic
  // history for undo/redo
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  const applyingHistoryRef = useRef(false);

  const pushHistory = useCallback((label) => {
    if (applyingHistoryRef.current) return;
    try {
      const snapshot = {
        nodes: JSON.parse(JSON.stringify(nodes)),
        edges: JSON.parse(JSON.stringify(edges)),
        label: label || ''
      };
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
      historyRef.current.push(snapshot);
      // cap history to last 100 entries
      if (historyRef.current.length > 100) historyRef.current.shift();
      historyIndexRef.current = historyRef.current.length - 1;
    } catch (e) {
      console.warn('pushHistory failed', e);
    }
  }, [nodes, edges]);

  const applySnapshot = useCallback((snap) => {
    if (!snap) return;
    applyingHistoryRef.current = true;
    setNodes(snap.nodes || []);
    setEdges(snap.edges || []);
    // allow state updates to propagate before re-enabling pushes
    setTimeout(() => { applyingHistoryRef.current = false; }, 0);
  }, [setNodes, setEdges]);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    const snap = historyRef.current[historyIndexRef.current];
    applySnapshot(snap);
  }, [applySnapshot]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    const snap = historyRef.current[historyIndexRef.current];
    applySnapshot(snap);
  }, [applySnapshot]);

  // Push an initial history snapshot on init (or when switching canvases)
  useEffect(() => {
    // set initial snapshot after nodes/edges loaded
    pushHistory('init');
    // reset history pointers when switching canvas
    // (pushHistory already slices previous history)
  }, [currentCanvasId, pushHistory]);

  // Wrap onConnect to push history after creating an edge
  const handleConnect = useCallback((params) => {
    onConnect(params);
    // push a history entry after the edge is added
    setTimeout(() => pushHistory('connect'), 0);
  }, [onConnect, pushHistory]);

  useKeyboardShortcuts(nodes, setNodes, setEdges, saveFlow, { undo, redo, pushHistory });

  // Listen for addNode event
  React.useEffect(() => {
    const handler = (e) => {
      const { type, data, center } = e.detail || {};
      const id = `${Date.now()}`;
      let position = { x: Math.random() * 400, y: Math.random() * 400 };
      if (center) {
        try {
          const inst = window.__reactFlowInstance;
          if (inst && typeof inst.project === 'function') {
            const wrapper = document.querySelector('.reactflow-wrapper, .react-flow, .reactflow');
            const centerPx = wrapper
              ? { x: wrapper.clientWidth / 2, y: wrapper.clientHeight / 2 }
              : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
            const projected = inst.project({ x: centerPx.x, y: centerPx.y });
            position = { x: projected.x + (Math.random() * 40 - 20), y: projected.y + (Math.random() * 40 - 20) };
          }
        } catch (err) {
          // ignore and use fallback
        }
      }

      const newNode = {
        id,
        type: type || 'dialogNode',
        data: data || {},
        position,
      };
      setNodes((nds) => [...nds, newNode]);
      setTimeout(() => pushHistory('addNode'), 0);
    };
    window.addEventListener('addNode', handler);
    return () => window.removeEventListener('addNode', handler);
  }, [pushHistory]);

  // Expose helpers for DialogNode persistence
  React.useEffect(() => {
    window.__getFlow = () => ({ nodes, edges });
    window.__updateNode = (id, payload) => {
      setNodes((prev) => {
        const next = prev.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...payload } } : n));
        setTimeout(() => pushHistory('updateNode'), 0);
        return next;
      });
    };
    window.__addNodeAfter = (sourceId, nodeData = {}, options = {}) => {
      const newId = nodeData.id || `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
      setNodes((prev) => {
        const parent = prev.find((n) => n.id === sourceId);
        const randomYOffset = options?.randomizeY ? (Math.random() * 200 - 100) : 140;
        const position = parent
          ? { x: parent.position.x + 320, y: parent.position.y + randomYOffset }
          : { x: 120, y: 120 + (options?.randomizeY ? (Math.random() * 240 - 120) : 0) };
        // only inherit the parent's model/config selector (llmConfigId)
        const inheritedModel = (parent && parent.data && parent.data.llmConfigId) ? { llmConfigId: parent.data.llmConfigId } : {};
        const nextNode = {
          id: newId,
          type: 'dialogNode',
          data: { question: '', answer: '', ...inheritedModel, ...nodeData },
          position,
        };
        return [...prev, nextNode];
      });
      if (sourceId) {
        setEdges((prev) => [
          ...prev,
          {
            id: `e-${sourceId}-${newId}`,
            source: sourceId,
            target: newId,
            ...DEFAULT_EDGE_OPTIONS,
            data: { direction: 'forward' },
          },
        ]);
        setTimeout(() => pushHistory('addNodeWithEdge'), 0);
      }
      return newId;
    };
    return () => {
      delete window.__getFlow;
      delete window.__updateNode;
      delete window.__addNodeAfter;
    };
  }, [nodes, edges, setNodes, setEdges, pushHistory]);

  

  const nodeTypes = useMemo(() => ({ dialogNode: DialogNode }), []);
  const defaultEdgeOptions = useMemo(() => DEFAULT_EDGE_OPTIONS, []);

  const handleNodeClick = useCallback((event, node) => {
    if (event.ctrlKey && event.altKey) {
      event.preventDefault();
      event.stopPropagation();
      setFocusNode(node.id);
    }
  }, [setFocusNode]);

  const handleNodesDelete = useCallback((deleted) => {
    if (!deleted?.length || !focusNode) return;
    const deletedIds = new Set(deleted.map((node) => node.id));
    if (!deletedIds.has(focusNode)) return;

    const incoming = edges.find((edge) => edge.target === focusNode);
    if (incoming && !deletedIds.has(incoming.source)) {
      setFocusNode(incoming.source);
    } else {
      setFocusNode(null);
    }
  }, [edges, focusNode, setFocusNode]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={handleConnect}
      onInit={onInit}
      onNodeClick={handleNodeClick}
      onNodesDelete={handleNodesDelete}
      nodeTypes={nodeTypes}
      defaultEdgeOptions={defaultEdgeOptions}
      connectionRadius={32}
      nodesDraggable={!interactionLock}
      panOnDrag={!interactionLock}
      fitView>
      <MiniMap position="bottom-left" pannable={true} />
      <Controls />
      <Background variant="dots" gap={12} size={1} />
    </ReactFlow>
  );
}
