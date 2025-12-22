import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { useCanvas } from './contexts/CanvasProvider';

const panelBaseStyle = {
  borderLeft: '1px solid #e5e7eb',
  background: '#f8fafc',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  position: 'relative',
};

const headerStyle = {
  padding: '12px 16px',
  borderBottom: '1px solid #e5e7eb',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  background: '#fff',
};

const scrollAreaStyle = {
  flex: 1,
  overflowY: 'auto',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const bubbleBase = {
  borderRadius: 12,
  padding: '10px 14px',
  fontSize: 14,
  lineHeight: 1.6,
  boxShadow: '0 8px 18px rgba(15,23,42,0.08)'
};

function MessageBubble({ role, children }) {
  const isUser = role === 'user';
  const style = {
    ...bubbleBase,
    alignSelf: isUser ? 'flex-end' : 'flex-start',
    color: isUser ? '#0f172a' : '#0b1120',
    background: isUser ? '#e0f2fe' : '#ffffff',
    maxWidth: '88%',
    borderTopRightRadius: isUser ? 4 : 12,
    borderTopLeftRadius: isUser ? 12 : 4,
  };
  return (
    <div style={style}>
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  );
}

export default function LinearConversation() {
  const { canvases, currentCanvasId, focusNode, getConversationChain, addNodeAfter, setFocusNode, updateCanvas } = useCanvas();
  const [width, setWidth] = useState(() => {
    try {
      if (currentCanvasId) {
        const fromState = canvases?.[currentCanvasId]?.linearWidth;
        if (typeof fromState === 'number') return fromState;
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('chatflow-canvases');
          if (stored) {
            const parsed = JSON.parse(stored || '{}');
            const lw = parsed?.[currentCanvasId]?.linearWidth;
            if (typeof lw === 'number') return lw;
          }
        }
      }
    } catch (e) {
      // ignore
    }
    return 380;
  });
  const [conversation, setConversation] = useState([]);
  const [draft, setDraft] = useState('');
  const draggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartWRef = useRef(0);
  const widthRef = useRef(width);

  const flowVersion = useMemo(() => {
    if (!currentCanvasId) return 0;
    return canvases?.[currentCanvasId]?.lastUpdated || 0;
  }, [canvases, currentCanvasId]);

  useEffect(() => {
    if (!focusNode) {
      setConversation([]);
      return;
    }
    setConversation(getConversationChain(focusNode));
  }, [focusNode, getConversationChain, flowVersion]);

  // restore persisted width for current canvas (if any)
  useEffect(() => {
    if (!currentCanvasId) return;
    const lw = canvases?.[currentCanvasId]?.linearWidth;
    if (typeof lw === 'number') setWidth(lw);
  }, [currentCanvasId, canvases]);

  useEffect(() => { widthRef.current = width; }, [width]);

  const startDrag = useCallback((e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    draggingRef.current = true;
    dragStartXRef.current = clientX;
    dragStartWRef.current = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (ev) => {
      if (!draggingRef.current) return;
      const moveX = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const delta = dragStartXRef.current - moveX;
      const newW = Math.max(220, Math.min(window.innerWidth - 120, Math.round(dragStartWRef.current + delta)));
      setWidth(newW);
      widthRef.current = newW;
    };

    const endDrag = () => {
      draggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', endDrag);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', endDrag);
      // persist width to canvas metadata so it survives reloads / switching
      try {
        const finalW = widthRef.current || width;
        if (currentCanvasId && typeof updateCanvas === 'function') {
          updateCanvas(currentCanvasId, { linearWidth: finalW });
        }
      } catch (err) {
        // ignore
      }
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('touchend', endDrag);
  }, [width, updateCanvas, currentCanvasId]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !focusNode) return;
    const newNodeId = addNodeAfter(focusNode, content, { randomizeY: true });
    setDraft('');
    if (newNodeId) {
      setFocusNode(newNodeId);
    }
    if (newNodeId && typeof window !== 'undefined') {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('linearConversationSend', { detail: { nodeId: newNodeId } }));
      }, 20);
    }
  };

  const activeCanvasName = currentCanvasId ? canvases?.[currentCanvasId]?.name : '';
  const hasFocus = Boolean(focusNode);

  if (!currentCanvasId) return null;

  return (
    <aside style={{ ...panelBaseStyle, width }}>
      <div style={headerStyle}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15, color: '#0f172a' }}>Linear Conversation</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>{activeCanvasName || 'Untitled canvas'}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }} />
      </div>

      {/* resizer bar on left edge of panel */}
      <div
        onMouseDown={startDrag}
        onTouchStart={startDrag}
        role="separator"
        aria-orientation="vertical"
        style={{ position: 'absolute', left: -6, top: 0, bottom: 0, width: 12, cursor: 'col-resize', zIndex: 40 }}
      />

      <div style={scrollAreaStyle}>
        {!hasFocus && (
          <div style={{ color: '#475569', fontSize: 14 }}>
            Hold <strong>Ctrl+Alt</strong> and click a node on the canvas to generate a Linear Conversation.
          </div>
        )}
        {hasFocus && conversation.length === 0 && (
          <div style={{ color: '#475569', fontSize: 14 }}>
            Failed to generate a conversation chain. Try reselecting the node or ensure it has upstream connections.
          </div>
        )}
        {conversation.map((node) => (
          <div key={node.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {node?.data?.question && (
              <MessageBubble role="user">{node.data.question}</MessageBubble>
            )}
            {node?.data?.answer && (
              <MessageBubble role="assistant">{node.data.answer}</MessageBubble>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ padding: '12px 16px', borderTop: '1px solid #e2e8f0', background: '#fff', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder={hasFocus ? 'Type your next question...' : 'Select a node to continue the conversation'}
          disabled={!hasFocus}
          style={{ resize: 'none', minHeight: 90, borderRadius: 10, border: '1px solid #cbd5f5', padding: 10, fontSize: 14, lineHeight: 1.5, background: hasFocus ? '#fff' : '#f1f5f9' }}
        />
        <button
          type="submit"
          disabled={!hasFocus || !draft.trim()}
          style={{
            border: 'none',
            borderRadius: 10,
            padding: '10px 16px',
            background: (!hasFocus || !draft.trim()) ? '#cbd5f5' : '#2563eb',
            color: '#fff',
            fontWeight: 600,
            letterSpacing: 0.2,
            cursor: (!hasFocus || !draft.trim()) ? 'not-allowed' : 'pointer'
          }}>
          Send
        </button>
      </form>
    </aside>
  );
}
