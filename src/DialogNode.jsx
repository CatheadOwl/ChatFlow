import React, { useState, useEffect, useRef } from 'react';
import { Handle, Position } from 'reactflow';
import { sendChatRequest } from './llmApi';
import { useCanvas } from './contexts/CanvasProvider';
import { useLLM } from './contexts/LLMProvider';

export default function DialogNode({ id, data, selected }) {
  const [question, setQuestion] = useState(data?.question || '');
  const [answer, setAnswer] = useState(data?.answer || '');
  const [answerCollapsed, setAnswerCollapsed] = useState(true);
  const [llmConfigId, setLlmConfigId] = useState(data?.llmConfigId || null);
  const { configs, selectConfig } = useLLM();
  const [showConfigDropdown, setShowConfigDropdown] = useState(false);
  const dropdownRef = React.useRef(null);
  const [error, setError] = useState('');

  const questionRef = useRef(null);
  const answerRef = useRef(null);

  // move hook to top-level
  const { currentCanvasId, registerPending, updateCanvas, canvases, focusNode } = useCanvas();

  useEffect(() => {
    if (!llmConfigId) {
      if (configs && configs.length) {
        const preferred = configs.find(c => c.id === (localStorage.getItem('llm-selected') || '')) || configs[0];
        if (preferred) {
          setLlmConfigId(preferred.id);
          persistNode(answer, preferred.id);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configs]);

  useEffect(() => { adjustHeight(questionRef.current); }, [question]);
  useEffect(() => { adjustHeight(answerRef.current); }, [answer, answerCollapsed]);

  const adjustHeight = (el) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(40, el.scrollHeight) + 2}px`;
  };

  const persistNode = (ans, overrideLlmConfigId) => {
    try {
      const configToPersist = typeof overrideLlmConfigId !== 'undefined' ? overrideLlmConfigId : llmConfigId;
      const payload = { question, answer: ans || answer, llmConfigId: configToPersist };
      if (typeof window !== 'undefined' && window.__updateNode) {
        window.__updateNode(id, payload);
      } else {
        try {
          const flow = JSON.parse(localStorage.getItem('chatflow-diagram') || '{}');
          flow.nodes = flow.nodes || [];
          const idx = flow.nodes.findIndex(n => n.id === id);
          if (idx >= 0) {
            flow.nodes[idx].data = { ...(flow.nodes[idx].data || {}), ...payload };
          } else {
            flow.nodes.push({ id, type: 'dialogNode', position: { x: 0, y: 0 }, data: payload });
          }
          localStorage.setItem('chatflow-diagram', JSON.stringify(flow));
        } catch (e) { /* ignore */ }
      }
    } catch (e) {
      console.warn('persistNode error', e);
    }
  };

  const handleSelectConfig = (selectedId) => {
    setLlmConfigId(selectedId);
    setShowConfigDropdown(false);
    setError('');
    persistNode(answer, selectedId);
    try {
      selectConfig(selectedId);
    } catch (e) {
      try { localStorage.setItem('llm-selected', selectedId); } catch (err) {}
    }
  };

  const sendToLLM = async () => {
    const selectedConfig = configs.find(cfg => cfg.id === llmConfigId);
    if (!selectedConfig) {
      setError('Please select an LLM configuration first.');
      return;
    }

    setError('');
    setAnswer('⏳ Processing...');

    try {
      const messages = collectContextMessages(id, question);
      const promise = sendChatRequest(selectedConfig, messages).then((text) => {
        setAnswer(text);
        persistNode(text);
        if (currentCanvasId) {
          updateCanvas(currentCanvasId, {
            messages: [...(canvases?.[currentCanvasId]?.messages || []), { role: 'assistant', content: text }],
            waiting: false,
          });
        }
        return { message: { role: 'assistant', content: text } };
      });

      if (currentCanvasId) registerPending(currentCanvasId, { promise });
      await promise;
    } catch (e) {
      setError(e.message || 'Request error');
      setAnswer('');
      persistNode('');
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onLinearConversationSend = (event) => {
      if (!event?.detail || event.detail.nodeId !== id) return;
      sendToLLM();
    };
    window.addEventListener('linearConversationSend', onLinearConversationSend);
    return () => window.removeEventListener('linearConversationSend', onLinearConversationSend);
  }, [id, sendToLLM]);

  const collectContextMessages = (nodeId, currentQuestion) => {
    try {
      const flow = (typeof window !== 'undefined' && window.__getFlow) ? window.__getFlow() : JSON.parse(localStorage.getItem('chatflow-diagram') || '{}');
      const nodesArr = flow.nodes || [];
      const edges = flow.edges || [];
      
      const nodesMap = {};
      nodesArr.forEach(n => { nodesMap[n.id] = n; });

      const chain = [];
      let cur = nodeId;
      const visited = new Set();
      while (true) {
        if (visited.has(cur)) break;
        visited.add(cur);
        const incoming = edges.find(e => e.target === cur);
        
        if (!incoming) break;
        const src = incoming.source;
        const node = nodesMap[src];
        if (!node) break;
        chain.push(node);
        cur = src;
      }

      chain.reverse();

      const messages = [];
      chain.forEach(n => {
        const q = (n.data && n.data.question) || '';
        const a = (n.data && n.data.answer) || '';
        if (q) messages.push({ role: 'user', content: q });
        if (a) messages.push({ role: 'assistant', content: a });
      });

      messages.push({ role: 'user', content: currentQuestion });
      
      return messages;
    } catch (err) {
      console.warn('collectContextMessages error', err);
      return [{ role: 'user', content: currentQuestion }];
    }
  };

  const openConfigDropdown = (e) => {
    e.stopPropagation();
    setShowConfigDropdown(v => !v);
  };

  useEffect(() => {
    if (!showConfigDropdown) return;
    const onDoc = (ev) => {
      if (dropdownRef.current && !dropdownRef.current.contains(ev.target)) setShowConfigDropdown(false);
    };
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, [showConfigDropdown]);

  const isFocusNode = focusNode === id;

  return (
    <div style={{
      padding: 12,
      border: isFocusNode ? '2px solid #0f172a' : (selected ? '2px solid #0ea5e9' : '1px solid #e5e7eb'),
      borderRadius: 12,
      background: '#fff',
      width: 320,
      boxShadow: isFocusNode
        ? '0 10px 24px rgba(15, 23, 42, 0.18)'
        : selected
          ? '0 6px 18px rgba(14,165,233,0.12)'
          : 'none',
    }}>
      <style>{`
        .dialog-textarea {
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          min-height: 40px;
          margin: 0;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid #e6eef6;
          background: linear-gradient(180deg,#fbfdff,#ffffff);
          resize: none;
          outline: none;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji";
          font-size: 13px;
          line-height: 1.45;
          color: #0f172a;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.6);
          transition: box-shadow .15s ease, border-color .15s ease;
        }
        .dialog-textarea:focus {
          border-color: #7dd3fc;
          box-shadow: 0 0 0 4px rgba(14,165,233,0.08);
        }
        .dialog-textarea::placeholder {
          color: #94a3b8;
        }
        .field-label {
          font-size: 12px;
          color: #374151;
          margin-bottom: 6px;
          display:block;
        }
        .char-count {
          font-size: 11px;
          color: #6b7280;
          margin-top: 6px;
          text-align: right;
        }
      `}</style>

      <Handle type="target" position={Position.Left} style={{ background: '#6b7280' }} />
      <div style={{ fontWeight: 700, marginBottom: 8 }}>💬 Dialog Node</div>

      <div style={{ marginBottom: 8 }}>
        <label className="field-label">Question</label>
        <div>
          <textarea
            ref={questionRef}
            className="dialog-textarea"
            value={question}
            onPointerDownCapture={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('nodeInteractionStart')); }}
            onPointerUpCapture={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('nodeInteractionEnd')); }}
            onPointerMoveCapture={(e) => e.stopPropagation()}
            onChange={(e) => setQuestion(e.target.value)}
            onInput={(e) => adjustHeight(e.target)}
            onBlur={() => { persistNode(answer); window.dispatchEvent(new CustomEvent('nodeInteractionEnd')); }}
            placeholder="Enter a question..."
            rows={2}
          />
        </div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <label className="field-label">Answer</label>
        <div>
          <button
            onPointerDownCapture={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('nodeInteractionStart')); }}
            onPointerUpCapture={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('nodeInteractionEnd')); }}
            onClick={() => setAnswerCollapsed(v => !v)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f8fafc', cursor: 'pointer', textAlign: 'left', width: '100%' }}
          >
            {answer ? (answerCollapsed ? (answer.length > 120 ? `${answer.slice(0,120)}...` : answer) : 'Hide answer') : 'No answer'}
          </button>
          {!answerCollapsed && (
            <textarea
              ref={answerRef}
              className="dialog-textarea"
              value={answer}
              onPointerDownCapture={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('nodeInteractionStart')); }}
              onPointerUpCapture={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('nodeInteractionEnd')); }}
              onPointerMoveCapture={(e) => e.stopPropagation()}
              onChange={(e) => setAnswer(e.target.value)}
              onInput={(e) => adjustHeight(e.target)}
              onBlur={() => { persistNode(answer); window.dispatchEvent(new CustomEvent('nodeInteractionEnd')); }}
              placeholder="Model response will appear here... (editable)"
              rows={3}
              style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}
            />
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button onPointerDownCapture={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('nodeInteractionStart')); }} onPointerUpCapture={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('nodeInteractionEnd')); }} onClick={openConfigDropdown} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f8fafc', cursor: 'pointer' }}>
            {configs.find(c => c.id === llmConfigId)?.name || 'Not selected'}
          </button>
          {showConfigDropdown && (
            <div style={{ position: 'absolute', left: 0, top: '110%', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: 8, zIndex: 50, minWidth: 180 }} onPointerDownCapture={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('nodeInteractionStart')); }} onPointerUpCapture={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('nodeInteractionEnd')); }}>
              {configs.length === 0 && <div style={{ color: '#666' }}>No configs</div>}
              {configs.map(c => (
                <div key={c.id} style={{ padding: 6, borderRadius: 4, cursor: 'pointer' }} onClick={() => handleSelectConfig(c.id)}>
                  {c.name}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <button onPointerDown={e => e.stopPropagation()} onClick={sendToLLM} style={{ padding: '6px 10px', borderRadius: 8, background: '#06b6d4', color: '#fff', border: 'none', cursor: 'pointer' }}>🚀 Send</button>
        </div>
      </div>

      {error ? (
        <div style={{ marginTop: 8, padding: 8, borderRadius: 6, background: '#fff1f2', color: '#b91c1c', fontSize: 12 }}>{error}</div>
      ) : null}

      <div style={{ clear: 'both' }}></div>
      <Handle type="source" position={Position.Right} style={{ background: '#6b7280' }} />

    </div>
  );
}