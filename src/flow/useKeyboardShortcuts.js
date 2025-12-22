import { useEffect } from 'react';

export default function useKeyboardShortcuts(nodes, setNodes, setEdges, saveFlow, historyHandlers = {}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (typeof window !== 'undefined' && window.__modalOpen) {
        // Let browser/default handlers run when a modal is open
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.code === 'KeyS')) {
        e.preventDefault();
        e.stopPropagation();
        saveFlow();
        if (window.__showSaveToast) window.__showSaveToast();
        return false;
      }

      const active = document.activeElement;
      const activeIsEditable = Boolean(active && (
        active.tagName === 'INPUT' ||
        active.tagName === 'TEXTAREA' ||
        active.isContentEditable ||
        (active.closest && active.closest('input,textarea,[contenteditable="true"]'))
      ));

      // Delete key removes selected nodes
      if (e.key === 'Delete' && !activeIsEditable) {
        const selectedIds = nodes.filter(n => n.selected).map(n => n.id);
        if (selectedIds.length > 0) {
          if (historyHandlers.pushHistory) historyHandlers.pushHistory('delete');
          setNodes(nds => nds.filter(n => !selectedIds.includes(n.id)));
          setEdges(eds => eds.filter(e => !selectedIds.includes(e.source) && !selectedIds.includes(e.target)));
        }
      }

      // Ctrl+C copies selected nodes
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.code === 'KeyC')) {
        // If there's text selected on the page (e.g., user selected text), let the browser handle copy
        const selectionText = (typeof window !== 'undefined' && window.getSelection) ? window.getSelection().toString() : '';
        if (selectionText && selectionText.trim().length > 0) {
          return; // let the default copy behavior copy the selected text
        }

        const selectedNodes = nodes.filter(n => n.selected);
        if (selectedNodes.length > 0) {
          try {
            const serialized = JSON.stringify(selectedNodes, null, 2);
            // prevent default so the browser doesn't also copy other things
            e.preventDefault();
            e.stopPropagation();
            navigator.clipboard.writeText(serialized).then(() => {
              console.log('Copied node data to clipboard:', serialized);
            }).catch(err => {
              console.warn('Failed to copy to clipboard', err);
              alert('Copy failed: browser does not support or permission denied for clipboard');
            });
          } catch (err) {
            console.warn('Error serializing selected nodes', err);
          }
        }
      }

      // Ctrl+V paste nodes (allow default paste when focused on editable elements)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.code === 'KeyV')) {
        if (activeIsEditable) return; // allow normal paste into inputs/textareas
        e.preventDefault();
        navigator.clipboard.readText().then(text => {
          try {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) {
              const offsetX = 30 + Math.random() * 50;
              const offsetY = 30 + Math.random() * 50;
              const newNodes = parsed.map(n => ({
                ...n,
                id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                position: {
                  x: (n.position?.x || 0) + offsetX,
                  y: (n.position?.y || 0) + offsetY
                },
                selected: false
              }));
              setNodes(nds => [...nds, ...newNodes]);
              if (historyHandlers.pushHistory) historyHandlers.pushHistory('paste');
              console.log('Pasted nodes from clipboard', newNodes);
            } else {
              console.warn('Clipboard content is not valid node data');
            }
          } catch (err) {
            console.warn('Error parsing clipboard content', err);
          }
        }).catch(err => {
          console.warn('Failed to read clipboard', err);
        });
      }

      // Ctrl+Z / Ctrl+Y undo redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.code === 'KeyZ')) {
        e.preventDefault();
        if (historyHandlers.undo) historyHandlers.undo();
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.code === 'KeyY')) {
        e.preventDefault();
        if (historyHandlers.redo) historyHandlers.redo();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [nodes, saveFlow, setNodes, setEdges]);
}
